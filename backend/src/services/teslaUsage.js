// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Tesla Fleet API Usage Tracker + Budget Guard.
 *
 * Klassifiziert ausgehende Calls (vehicle_data / wake / command / streaming_signal / other),
 * zählt sie pro Mandant und Monat, errechnet die voraussichtlichen Tesla-Kosten und
 * blockiert weitere Calls, wenn die Hard-Stop-Schwelle aktiv ist.
 *
 * OAuth-Endpunkte (auth.tesla.com/oauth2/...) sind explizit ausgeschlossen — Tesla
 * rechnet sie nicht ab.
 */

export class TeslaBudgetExceededError extends Error {
  constructor(detail) {
    super(detail.message || 'Tesla API monthly budget exceeded');
    this.name = 'TeslaBudgetExceededError';
    this.statusCode = 429;
    this.detail = detail;
  }
}

const CATEGORIES = ['vehicle_data', 'wake', 'command', 'streaming_signal', 'other'];

const DEFAULTS = {
  currency:                 'USD',
  monthly_limit_usd:        50,
  free_credit_usd:          10,
  hard_stop_enabled:        false,
  hard_stop_pct:            90,
  rate_vehicle_data:        0.005,
  rate_wake:                0.005,
  rate_command:             0.005,
  rate_streaming_signal:    0.000005,
  rate_other:               0.005,
};

/* ---------- Klassifizierung ---------- */

/**
 * Klassifiziert einen ausgehenden Call.
 * - OAuth → null  (zählt NICHT)
 * - /vehicle_data, /vehicles, /service_data → vehicle_data
 * - /wake_up                                  → wake
 * - /command/*                                → command
 * - /fleet_telemetry_config*                  → vehicle_data (Konfig-Calls)
 * - alles übrige Fleet-API                    → other
 *
 * @param {string} method  HTTP-Methode (GET/POST/...)
 * @param {string} path    Pfad ohne Host, z. B. "/api/1/vehicles/123/vehicle_data"
 * @returns {string|null}
 */
export function categorize(method, path) {
  if (!path) return null;
  if (path.includes('/oauth2/') || path.includes('/oauth/'))         return null;
  if (path.includes('/wake_up'))                                      return 'wake';
  if (path.includes('/command/'))                                     return 'command';
  if (path.includes('/vehicle_data'))                                 return 'vehicle_data';
  if (path === '/api/1/vehicles' || path.match(/^\/api\/1\/vehicles\/[^/]+$/)) return 'vehicle_data';
  if (path.includes('/fleet_telemetry_config'))                       return 'vehicle_data';
  if (path.includes('/api/1/'))                                       return 'other';
  return 'other';
}

/** Normalisiert einen Pfad zum stabilen Endpoint-Key (IDs maskiert). */
export function normalizeEndpoint(method, path) {
  const m = (method || 'GET').toUpperCase();
  const p = path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[A-Z0-9]{17}\b/g, '/:vin')   // Tesla-VIN ist 17 Zeichen
    .split('?')[0];
  return `${m} ${p}`;
}

/* ---------- Config-Store (tenant_settings) ---------- */

export function getConfig(db) {
  const rows = db.prepare(
    "SELECT key, value FROM tenant_settings WHERE key LIKE 'tesla_usage.%'"
  ).all();
  const cfg = { ...DEFAULTS };
  for (const { key, value } of rows) {
    const k = key.slice('tesla_usage.'.length);
    if (k === 'currency') cfg.currency = value;
    else if (k === 'hard_stop_enabled') cfg.hard_stop_enabled = value === '1' || value === 'true';
    else cfg[k] = Number(value);
  }
  return cfg;
}

const CONFIG_KEYS = new Set([
  'currency', 'monthly_limit_usd', 'free_credit_usd',
  'hard_stop_enabled', 'hard_stop_pct',
  'rate_vehicle_data', 'rate_wake', 'rate_command',
  'rate_streaming_signal', 'rate_other',
]);

export function setConfig(db, partial) {
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO tenant_settings (key, value) VALUES (?, ?)'
  );
  const tx = db.transaction((entries) => {
    for (const [k, v] of entries) {
      if (!CONFIG_KEYS.has(k)) continue;
      let str;
      if (k === 'currency')                str = String(v).toUpperCase().slice(0, 3);
      else if (k === 'hard_stop_enabled')  str = (v && v !== '0' && v !== 'false') ? '1' : '0';
      else                                  str = String(Number(v));
      stmt.run(`tesla_usage.${k}`, str);
    }
  });
  tx(Object.entries(partial));
  return getConfig(db);
}

/* ---------- Counter ---------- */

export function periodKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function rateFor(cfg, category) {
  switch (category) {
    case 'vehicle_data':     return cfg.rate_vehicle_data;
    case 'wake':             return cfg.rate_wake;
    case 'command':          return cfg.rate_command;
    case 'streaming_signal': return cfg.rate_streaming_signal;
    default:                 return cfg.rate_other;
  }
}

/**
 * Erfasst einen Aufruf. Ist `category` null, wird nichts gezählt (z. B. OAuth).
 * `multiplier` ist die Anzahl billbarer Einheiten (z. B. Streaming-Signale je Payload).
 */
export function recordCall(db, category, endpoint, multiplier = 1) {
  if (!category) return;
  if (!CATEGORIES.includes(category)) category = 'other';
  const cfg     = getConfig(db);
  const period  = periodKey();
  const cost    = rateFor(cfg, category) * multiplier;
  const now     = Math.floor(Date.now() / 1000);

  db.prepare(`
    INSERT INTO tesla_api_usage (period, category, endpoint, count, cost_usd, last_call_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (period, category, endpoint) DO UPDATE SET
      count        = count + excluded.count,
      cost_usd     = cost_usd + excluded.cost_usd,
      last_call_at = excluded.last_call_at
  `).run(period, category, endpoint, multiplier, cost, now);
}

/* ---------- Aggregate ---------- */

export function getCurrentSpend(db, period = periodKey()) {
  const row = db.prepare(
    'SELECT COALESCE(SUM(cost_usd), 0) AS spend FROM tesla_api_usage WHERE period=?'
  ).get(period);
  return row.spend;
}

export function getSummary(db, period = periodKey()) {
  const cfg = getConfig(db);
  const rows = db.prepare(`
    SELECT category, SUM(count) AS calls, SUM(cost_usd) AS cost
    FROM tesla_api_usage WHERE period=? GROUP BY category
  `).all(period);

  const grossCost   = rows.reduce((s, r) => s + r.cost, 0);
  const billable    = Math.max(0, grossCost - cfg.free_credit_usd);
  const limit       = cfg.monthly_limit_usd;
  const pct         = limit > 0 ? Math.min(100, (billable / limit) * 100) : 0;
  const hardStopAt  = cfg.hard_stop_enabled
    ? limit * (cfg.hard_stop_pct / 100)
    : null;

  return {
    period,
    config:        cfg,
    grossCostUsd:  grossCost,
    freeCreditUsd: cfg.free_credit_usd,
    billableUsd:   billable,
    limitUsd:      limit,
    pct,
    hardStopAtUsd: hardStopAt,
    blocked:       hardStopAt !== null && billable >= hardStopAt,
    categories:    Object.fromEntries(
      CATEGORIES.map(c => [c, rows.find(r => r.category === c) || { calls: 0, cost: 0 }])
    ),
  };
}

export function getEndpointDetails(db, period = periodKey()) {
  return db.prepare(`
    SELECT category, endpoint, count, cost_usd, last_call_at
    FROM tesla_api_usage WHERE period=? ORDER BY cost_usd DESC, count DESC
  `).all(period);
}

export function getHistory(db, months = 12) {
  return db.prepare(`
    SELECT period,
           SUM(count)    AS calls,
           SUM(cost_usd) AS cost
    FROM tesla_api_usage
    GROUP BY period
    ORDER BY period DESC
    LIMIT ?
  `).all(months);
}

export function getRecentEvents(db, limit = 5) {
  return db.prepare(`
    SELECT id, received_at, subject, period, spend_usd, threshold
    FROM tesla_usage_events
    ORDER BY received_at DESC
    LIMIT ?
  `).all(limit);
}

export function recordWebhookEvent(db, { subject, body, spend_usd, threshold, period }) {
  db.prepare(`
    INSERT INTO tesla_usage_events (subject, period, spend_usd, threshold, raw_body)
    VALUES (?, ?, ?, ?, ?)
  `).run(subject || null, period || periodKey(), spend_usd ?? null, threshold ?? null, body || null);
}

export function resetCurrentMonth(db, period = periodKey()) {
  const result = db.prepare('DELETE FROM tesla_api_usage WHERE period=?').run(period);
  return { period, deletedRows: result.changes };
}

/* ---------- Budget Guard ---------- */

/**
 * Wirft TeslaBudgetExceededError, wenn Hard-Stop aktiv ist und die Schwelle erreicht.
 * Sonst kein Effekt.
 */
export function assertWithinBudget(db) {
  const summary = getSummary(db);
  if (summary.blocked) {
    throw new TeslaBudgetExceededError({
      message: `Tesla API hard-stop reached: ${summary.billableUsd.toFixed(2)} USD ≥ ${summary.hardStopAtUsd.toFixed(2)} USD`,
      period:    summary.period,
      billable:  summary.billableUsd,
      hardStopAt: summary.hardStopAtUsd,
    });
  }
}
