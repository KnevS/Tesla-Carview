// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
//
// Proaktive Wochen-Insights — REINE STATISTIK, KEINE KI.
//
// Verdichtet die letzten 7 Tage (vs. die 7 Tage davor und den 90-Tage-Schnitt)
// zu kurzen Klartext-Hinweisen: Fahrleistung + Trend, Verbrauch vs. Schnitt
// (inkl. datengetriebener Kälte-Begründung), Ladekosten und offene
// Auffälligkeiten. Alles user-gescoped über vehicle_users.
//
// Die Insights tragen nur einen i18n-Schlüssel + Parameter; den Klartext
// formuliert das Frontend (mehrsprachig). Eine optionale LLM-Veredelung
// (lokal via Ollama) lässt sich später andocken — die Datenbasis hier bleibt
// davon unberührt und funktioniert ohne jeden KI-Provider.

const DAY = 86400;
const round = (v, d = 0) => v == null ? null : Math.round(v * 10 ** d) / 10 ** d;
const pct = (cur, prev) => (prev > 0) ? round(((cur - prev) / prev) * 100, 0) : null;

const IN_USER_VEHICLES = 'vehicle_id IN (SELECT vehicle_id FROM vehicle_users WHERE user_id = ?)';

export function buildWeeklyInsights(db, userId) {
  const now = Math.floor(Date.now() / 1000);

  const tripWindow = (from, to) => db.prepare(`
    SELECT COUNT(*) AS n,
           COALESCE(SUM(distance_km), 0)     AS km,
           COALESCE(SUM(energy_used_kwh), 0) AS kwh,
           AVG(outside_temp_avg_c)           AS temp
    FROM trips
    WHERE start_time >= ? AND start_time < ? AND distance_km > 0 AND ${IN_USER_VEHICLES}
  `).get(from, to, userId);

  const cur  = tripWindow(now - 7 * DAY, now);
  const prev = tripWindow(now - 14 * DAY, now - 7 * DAY);

  const cost = db.prepare(`
    SELECT COALESCE(SUM(cost), 0) AS c
    FROM charging_sessions
    WHERE start_time >= ? AND is_free = 0 AND ${IN_USER_VEHICLES}
  `).get(now - 7 * DAY, userId);

  const base = db.prepare(`
    SELECT AVG(energy_used_kwh / distance_km * 100.0) AS kwh100,
           AVG(outside_temp_avg_c)                    AS temp,
           COUNT(*)                                   AS n
    FROM trips
    WHERE start_time >= ? AND distance_km > 2 AND energy_used_kwh > 0 AND ${IN_USER_VEHICLES}
  `).get(now - 90 * DAY, userId);

  const anom = db.prepare(`
    SELECT COUNT(*) AS n FROM battery_anomalies
    WHERE status IN ('new', 'notified') AND ${IN_USER_VEHICLES}
  `).get(userId);

  const insights = [];

  // Fahrleistung + Trend
  insights.push({
    key: 'mileage', severity: 'info',
    params: { km: round(cur.km, 0), trips: cur.n, trendPct: pct(cur.km, prev.km) },
  });

  // Verbrauch der Woche vs. 90-Tage-Schnitt — mit Kälte-Begründung
  const curKwh100 = cur.km > 0 ? (cur.kwh / cur.km) * 100 : null;
  if (curKwh100 != null && base.kwh100 && base.n >= 10) {
    const dev = ((curKwh100 - base.kwh100) / base.kwh100) * 100;
    const colder = cur.temp != null && base.temp != null && cur.temp < base.temp - 5;
    if (dev > 10) {
      insights.push({ key: 'consumptionHigh', severity: 'warn',
        params: { kwh100: round(curKwh100, 1), pct: round(dev, 0), colder, temp: round(cur.temp, 0) } });
    } else if (dev < -8) {
      insights.push({ key: 'consumptionLow', severity: 'good',
        params: { kwh100: round(curKwh100, 1), pct: round(-dev, 0) } });
    } else {
      insights.push({ key: 'consumptionNormal', severity: 'good',
        params: { kwh100: round(curKwh100, 1) } });
    }
  }

  // Ladekosten der Woche
  if (cost.c > 0) {
    insights.push({ key: 'cost', severity: 'info', params: { cost: round(cost.c, 2) } });
  }

  // Auffälligkeiten
  if (anom.n > 0) {
    insights.push({ key: 'anomalies', severity: 'warn', params: { n: anom.n } });
  } else {
    insights.push({ key: 'allGood', severity: 'good', params: {} });
  }

  return {
    period: { start: now - 7 * DAY, end: now },
    stats: {
      km: round(cur.km, 0), trips: cur.n, kwh_used: round(cur.kwh, 1),
      cost: round(cost.c, 2), kwh_per_100km: curKwh100 != null ? round(curKwh100, 1) : null,
    },
    insights,
    enough_data: (cur.n + prev.n) > 0,
  };
}
