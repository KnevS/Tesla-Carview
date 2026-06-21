// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
//
// Batterie-Gesundheits-Prognose — REINE STATISTIK, KEINE KI.
//
// Aus den battery_snapshots wird die auf 100 % SoC normierte Reichweite
// (rated_range_km / soc * 100) je Tag als Median gebildet (robust gegen
// Ausreisser), darauf eine lineare Regression (kleinste Quadrate) gerechnet
// und in die Zukunft fortgeschrieben. Das Konfidenzband nutzt den
// Residual-Standardfehler der Regression.
//
// Bewusst ohne externe Mathe-Bibliothek (Supply-Chain-Hygiene) — die
// Regression ist elementar und hier nachvollziehbar implementiert.

const DAY = 86400;
const MIN_SOC = 30;       // unter 30 % ist rated_range/soc zu ungenau zum Hochrechnen
const MIN_DAYS = 14;      // weniger Tage erlauben keine sinnvolle Trendaussage
const T_95 = 1.96;        // z-Wert fuer ~95 %-Band (n ist i.d.R. gross)

const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Tages-SOH: pro Kalendertag der Median der auf 100 % normierten Reichweite. */
function dailySoh(snapshots) {
  const byDay = new Map();
  for (const s of snapshots) {
    if (!s.rated_range_km || !s.soc || s.soc < MIN_SOC) continue;
    const norm = (s.rated_range_km / s.soc) * 100;
    if (!Number.isFinite(norm) || norm <= 0) continue;
    const day = new Date(s.timestamp * 1000).toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, { ts: s.timestamp, vals: [] });
    byDay.get(day).vals.push(norm);
  }
  return [...byDay.entries()]
    .map(([day, { ts, vals }]) => ({ day, ts, soh: median(vals) }))
    .sort((a, b) => a.ts - b.ts);
}

/** Lineare Regression y = slope·x + intercept (kleinste Quadrate). */
function linregress(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); }
  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = my - slope * mx;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (ys[i] - (slope * xs[i] + intercept)) ** 2;
    ssTot += (ys[i] - my) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const se = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;
  return { slope, intercept, r2, se, n, mx, sxx };
}

const round = (v, d = 1) => v == null ? null : Math.round(v * 10 ** d) / 10 ** d;

/**
 * @param {Array} snapshots  battery_snapshots (timestamp, soc, rated_range_km)
 * @param {object} opts       { horizonYears, thresholdPct }
 */
export function computeForecast(snapshots, { horizonYears = 5, thresholdPct = 80 } = {}) {
  const daily = dailySoh(snapshots || []);
  if (daily.length < MIN_DAYS) {
    return { enough_data: false, days_available: daily.length, min_days: MIN_DAYS };
  }

  const t0 = daily[0].ts;
  const xs = daily.map(d => (d.ts - t0) / DAY);  // Tage seit erster Messung
  const ys = daily.map(d => d.soh);
  const reg = linregress(xs, ys);

  // Referenz „100 %" = Regressionswert zum ersten Messtag (geglaetteter Startwert).
  const baseline = reg.intercept;
  const xNow = xs[xs.length - 1];
  const currentSoh = reg.slope * xNow + baseline;

  // Degradationsrate
  const rateKmPerYear = reg.slope * 365;
  const ratePctPerYear = baseline > 0 ? (-rateKmPerYear / baseline) * 100 : 0;

  // 7-Tage gleitender Mittelwert (Anzeige-Glaettung)
  const smoothed = daily.map((_, i) => {
    const from = Math.max(0, i - 6);
    const win = ys.slice(from, i + 1);
    return round(win.reduce((a, b) => a + b, 0) / win.length, 1);
  });

  // Band-Halbbreite an Stelle x
  const band = (x) => T_95 * reg.se * Math.sqrt(1 + 1 / reg.n + (reg.sxx > 0 ? (x - reg.mx) ** 2 / reg.sxx : 0));

  // Prognose-Stuetzstellen: ab heute monatlich bis Horizont
  const horizonDays = horizonYears * 365;
  const fxs = [];
  for (let d = Math.ceil(xNow); d <= xNow + horizonDays; d += 30) fxs.push(d);
  if (fxs[fxs.length - 1] < xNow + horizonDays) fxs.push(xNow + horizonDays);

  const dayLabel = (x) => new Date((t0 + x * DAY) * 1000).toISOString().slice(0, 10);

  // Punkt-Schaetzungen in 1/3/5 Jahren (innerhalb Horizont)
  const estAt = (years) => {
    const x = xNow + years * 365;
    const v = reg.slope * x + baseline;
    const hb = band(x);
    return { years, km: round(v, 0), lower: round(v - hb, 0), upper: round(v + hb, 0) };
  };

  // Zeit bis Schwelle (z. B. 80 % des Startwerts) — nur bei echtem Abfall
  let yearsUntilThreshold = null, dateThreshold = null;
  if (reg.slope < 0) {
    const target = (thresholdPct / 100) * baseline;
    const xThresh = (target - baseline) / reg.slope;
    if (xThresh > xNow) {
      yearsUntilThreshold = round((xThresh - xNow) / 365, 1);
      dateThreshold = dayLabel(xThresh);
    }
  }

  // Chart-Serien: Historie + Prognose in EINER Zeitachse (Frontend bleibt simpel)
  const histLabels = daily.map(d => d.day);
  const fcLabels = fxs.map(dayLabel);
  const labels = [...histLabels, ...fcLabels];
  const pad = (arr, side) => side === 'before'
    ? [...Array(histLabels.length).fill(null), ...arr]
    : [...arr, ...Array(fcLabels.length).fill(null)];

  return {
    enough_data: true,
    trend: {
      rate_km_per_year: round(rateKmPerYear, 1),
      rate_pct_per_year: round(ratePctPerYear, 2),
      r2: round(reg.r2, 3),
      current_soh_km: round(currentSoh, 0),
      baseline_km: round(baseline, 0),
      first_day: daily[0].day,
      days_observed: Math.round(xNow),
    },
    estimates: {
      in_1y: estAt(1),
      in_3y: estAt(3),
      in_5y: estAt(5),
      threshold_pct: thresholdPct,
      years_until_threshold: yearsUntilThreshold,
      date_threshold: dateThreshold,
    },
    chart: {
      labels,
      history: pad(daily.map(d => round(d.soh, 0)), 'after'),
      smoothed: pad(smoothed, 'after'),
      trend: labels.map((_, i) => {
        const x = i < histLabels.length ? xs[i] : fxs[i - histLabels.length];
        return round(reg.slope * x + baseline, 0);
      }),
      lower: pad(fxs.map(x => round(reg.slope * x + baseline - band(x), 0)), 'before'),
      upper: pad(fxs.map(x => round(reg.slope * x + baseline + band(x), 0)), 'before'),
    },
  };
}
