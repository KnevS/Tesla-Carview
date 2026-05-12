/**
 * Per-Mandant Circuit Breaker fuer die Tesla Fleet API.
 *
 * Hintergrund: wenn der Tesla-Developer-Account wegen
 * Billing-Sperre oder API-Limit-Ueberschreitung in den 403-Modus
 * kippt (siehe reference_tesla_403_exceeded_limit in der internen
 * Doku), pollt der Hybrid-Poller blind weiter und verbraucht
 * Budget bei Calls, die ohnehin nur 403 zurueckgeben. Schlimmer:
 * jeder Fehlversuch zaehlt potenziell selbst gegen das Konto.
 *
 * Wir tracken pro Mandant die letzten Antworten:
 *   - 403 → consecutive403s++
 *   - Erfolg → consecutive403s = 0, breaker bleibt zu/oeffnet sich
 *   - consecutive403s ≥ THRESHOLD → "circuit open": Poller
 *     ueberspringt diesen Mandanten bis pausedUntilMs.
 *
 * Manuelle Refresh-Calls aus der UI sind ABSICHTLICH nicht durch
 * den Breaker geschuetzt — der User soll den Account selbst testen
 * koennen. Wenn so ein manueller Call erfolgreich ist, ruft der
 * Caller markSuccess() auf und der Breaker schliesst sich wieder.
 */

const THRESHOLD = 3;
const PAUSE_MS  = 60 * 60 * 1000; // 1h

// tenantId → { consecutive403s, pausedUntilMs, lastFailureMs, lastSuccessMs }
const state = new Map();

function entry(tenantId) {
  let s = state.get(tenantId);
  if (!s) {
    s = { consecutive403s: 0, pausedUntilMs: 0, lastFailureMs: 0, lastSuccessMs: 0 };
    state.set(tenantId, s);
  }
  return s;
}

/** True wenn fuer den Mandanten gerade ein Pause-Fenster laeuft. */
export function isOpen(tenantId) {
  return entry(tenantId).pausedUntilMs > Date.now();
}

/** 403 (oder ein anderes "Account-disabled"-Signal) registrieren.
 *  Loest beim Ueberschreiten der Schwelle die Pause aus und logt
 *  den State-Uebergang genau einmal. */
export function record403(tenantId, tenantLabel = tenantId) {
  const s = entry(tenantId);
  const wasOpen = s.pausedUntilMs > Date.now();
  s.consecutive403s += 1;
  s.lastFailureMs = Date.now();
  if (s.consecutive403s >= THRESHOLD && !wasOpen) {
    s.pausedUntilMs = Date.now() + PAUSE_MS;
    console.warn(
      `[CircuitBreaker] OPEN fuer Mandant "${tenantLabel}" — ` +
      `${s.consecutive403s} aufeinanderfolgende 403er. ` +
      `Poller pausiert 1h (bis ${new Date(s.pausedUntilMs).toISOString()}). ` +
      `Vermutete Ursache: Tesla-Developer-Account gesperrt oder API-Budget aufgebraucht.`
    );
  }
}

/** Erfolgreichen Call registrieren — schliesst den Breaker (i.S.v.
 *  "schliesst den Stromkreis", also Calls duerfen wieder fliessen). */
export function recordSuccess(tenantId, tenantLabel = tenantId) {
  const s = entry(tenantId);
  const wasOpen = s.pausedUntilMs > Date.now();
  if (s.consecutive403s > 0 || wasOpen) {
    if (wasOpen) {
      console.info(`[CircuitBreaker] CLOSED fuer Mandant "${tenantLabel}" — Tesla-API antwortet wieder.`);
    }
    s.consecutive403s = 0;
    s.pausedUntilMs = 0;
  }
  s.lastSuccessMs = Date.now();
}

/** Andere Fehler (Timeout, 5xx, Netz) — die zaehlen NICHT gegen den
 *  Breaker. Aber sie sollen den 403-Counter auch nicht resetten:
 *  ein Timeout zwischen zwei 403ern ist kein Hinweis darauf, dass
 *  der Account wieder geht. Hier nur lastFailure setzen. */
export function recordOtherFailure(tenantId) {
  entry(tenantId).lastFailureMs = Date.now();
}

/** Status fuer alle Mandanten — fuer Health-Endpoint & Debug. */
export function getStatus() {
  const now = Date.now();
  const out = {};
  for (const [tenantId, s] of state) {
    out[tenantId] = {
      open:             s.pausedUntilMs > now,
      paused_until_ms:  s.pausedUntilMs || null,
      consecutive_403s: s.consecutive403s,
      last_failure_ms:  s.lastFailureMs || null,
      last_success_ms:  s.lastSuccessMs || null,
    };
  }
  return out;
}

export function getTenantStatus(tenantId) {
  return getStatus()[tenantId] ?? {
    open: false, paused_until_ms: null, consecutive_403s: 0,
    last_failure_ms: null, last_success_ms: null,
  };
}

/** Manuelles Reset — wird (noch) von keinem Caller verwendet, ist
 *  aber dokumentiert: ein Admin-Endpoint kann den Breaker damit
 *  zwangsoeffnen, etwa nach manuellem Neueinrichten des Accounts. */
export function reset(tenantId) {
  if (tenantId) state.delete(tenantId);
  else state.clear();
}

export const CIRCUIT_THRESHOLD = THRESHOLD;
export const CIRCUIT_PAUSE_MS  = PAUSE_MS;
