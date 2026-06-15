// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';

const router = Router();

router.get('/snapshots', (req, res) => {
  const db = req.db;
  const { vehicle_id, days = 90 } = req.query;
  try {
    const since = Math.floor(Date.now() / 1000) - +days * 86400;
    const where = vehicle_id
      ? 'WHERE vehicle_id = ? AND timestamp >= ?'
      : 'WHERE timestamp >= ?';
    const params = vehicle_id ? [vehicle_id, since] : [since];
    const snapshots = db.prepare(
      `SELECT * FROM battery_snapshots ${where} ORDER BY timestamp ASC`
    ).all(...params);
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/degradation', (req, res) => {
  const db = req.db;
  const { vehicle_id } = req.query;
  try {
    const where = vehicle_id ? 'WHERE vehicle_id = ?' : '';
    const params = vehicle_id ? [vehicle_id] : [];
    const data = db.prepare(
      `SELECT
         date(timestamp, 'unixepoch') as day,
         MAX(rated_range_km) as max_range,
         AVG(rated_range_km) as avg_range,
         AVG(soc) as avg_soc
       FROM battery_snapshots ${where}
       GROUP BY day ORDER BY day ASC`
    ).all(...params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/snapshot', (req, res) => {
  const db = req.db;
  const { vehicle_id, soc, rated_range_km, ideal_range_km, battery_level, usable_battery_level } = req.body;
  try {
    const result = db.prepare(
      `INSERT INTO battery_snapshots
       (vehicle_id, timestamp, soc, rated_range_km, ideal_range_km, battery_level, usable_battery_level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(vehicle_id, Math.floor(Date.now() / 1000), soc, rated_range_km, ideal_range_km,
      battery_level, usable_battery_level);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Companion Phase 1: statistische Battery-Health-Endpoints =========

// Ladekurve: pro Session-Bucket {soc_start, soc_end, kWh, max_kw, avg_kw, charger_type}
router.get('/charging-curve', (req, res) => {
  const db = req.db;
  const { vehicle_id } = req.query;
  try {
    const where = vehicle_id ? 'WHERE vehicle_id = ?' : '';
    const params = vehicle_id ? [vehicle_id] : [];
    const sessions = db.prepare(
      `SELECT
         id, start_time, end_time,
         start_soc, end_soc,
         energy_added_kwh, max_power_kw,
         charger_type, location_name
       FROM charging_sessions
       ${where}
       ORDER BY start_time DESC
       LIMIT 200`
    ).all(...params);

    const points = sessions
      .filter(s => s.end_time && s.start_soc != null && s.end_soc != null
        && s.energy_added_kwh > 0)
      .map(s => {
        const duration_h = Math.max((s.end_time - s.start_time) / 3600, 0.01);
        const avg_kw = s.energy_added_kwh / duration_h;
        return {
          id: s.id,
          start_time: s.start_time,
          start_soc: s.start_soc,
          end_soc: s.end_soc,
          soc_span: s.end_soc - s.start_soc,
          duration_h: +duration_h.toFixed(2),
          energy_added_kwh: s.energy_added_kwh,
          max_power_kw: s.max_power_kw,
          avg_power_kw: +avg_kw.toFixed(2),
          charger_type: s.charger_type || 'unknown',
          location_name: s.location_name || null
        };
      });

    // Aggregat: pro Ladegerät-Typ + SOC-Band die durchschnittliche Leistung
    const bands = [
      { from: 0,  to: 20, label: '0-20%' },
      { from: 20, to: 50, label: '20-50%' },
      { from: 50, to: 80, label: '50-80%' },
      { from: 80, to: 100, label: '80-100%' }
    ];
    const aggregate = bands.map(b => {
      const matching = points.filter(p =>
        p.start_soc < b.to && p.end_soc > b.from
      );
      const avgMax = matching.length
        ? matching.reduce((s, p) => s + (p.max_power_kw || 0), 0) / matching.length
        : null;
      return {
        band: b.label,
        sessions: matching.length,
        avg_max_kw: avgMax != null ? +avgMax.toFixed(1) : null
      };
    });

    res.json({ sessions: points, aggregate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Effizienz vs Außentemperatur: kWh/100km in 5°C-Buckets
router.get('/efficiency-by-temp', (req, res) => {
  const db = req.db;
  const { vehicle_id } = req.query;
  try {
    const where = vehicle_id ? 'WHERE vehicle_id = ?' : '';
    const params = vehicle_id ? [vehicle_id] : [];
    const trips = db.prepare(
      `SELECT outside_temp_avg_c, distance_km, energy_used_kwh
       FROM trips
       ${where} ${where ? 'AND' : 'WHERE'}
         distance_km > 1
         AND energy_used_kwh > 0
         AND outside_temp_avg_c IS NOT NULL`
    ).all(...params);

    if (trips.length === 0) {
      return res.json({ buckets: [], total_trips: 0, note: 'no_data' });
    }

    const buckets = {};
    for (const t of trips) {
      const tempBucket = Math.floor(t.outside_temp_avg_c / 5) * 5;
      const key = `${tempBucket}`;
      if (!buckets[key]) buckets[key] = { temp_min: tempBucket, temp_max: tempBucket + 5, km: 0, kwh: 0, trips: 0 };
      buckets[key].km += t.distance_km;
      buckets[key].kwh += t.energy_used_kwh;
      buckets[key].trips += 1;
    }

    const result = Object.values(buckets)
      .sort((a, b) => a.temp_min - b.temp_min)
      .map(b => ({
        temp_label: `${b.temp_min}…${b.temp_max}°C`,
        temp_min: b.temp_min,
        kwh_per_100km: b.km > 0 ? +((b.kwh / b.km) * 100).toFixed(2) : null,
        km: +b.km.toFixed(1),
        trips: b.trips
      }));

    res.json({ buckets: result, total_trips: trips.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Phantom-Drain: SOC-Verlust pro Stunde im Stillstand (nicht laden, nicht fahren)
router.get('/phantom-drain', (req, res) => {
  const db = req.db;
  const { vehicle_id, days = 90 } = req.query;
  try {
    const since = Math.floor(Date.now() / 1000) - +days * 86400;
    const veh = vehicle_id ? 'AND vehicle_id = ?' : '';
    const args = vehicle_id ? [since, vehicle_id] : [since];

    const snapshots = db.prepare(
      `SELECT vehicle_id, timestamp, soc
       FROM battery_snapshots
       WHERE timestamp >= ? ${veh}
       ORDER BY vehicle_id, timestamp ASC`
    ).all(...args);

    if (snapshots.length < 2) {
      return res.json({ events: [], summary: { count: 0, median_pct_per_h: null }, note: 'insufficient_data' });
    }

    // Trip- und Charge-Intervalle holen, um Stillstand sauber zu fenstern
    const trips = db.prepare(
      `SELECT vehicle_id, start_time, end_time FROM trips
       WHERE end_time IS NOT NULL AND end_time >= ? ${veh}`
    ).all(...args);
    const charges = db.prepare(
      `SELECT vehicle_id, start_time, end_time FROM charging_sessions
       WHERE end_time IS NOT NULL AND end_time >= ? ${veh}`
    ).all(...args);
    const busy = [...trips, ...charges];

    const overlapsBusy = (vid, t0, t1) => busy.some(b =>
      b.vehicle_id === vid && b.start_time < t1 && b.end_time > t0
    );

    const events = [];
    for (let i = 1; i < snapshots.length; i++) {
      const a = snapshots[i - 1];
      const b = snapshots[i];
      if (a.vehicle_id !== b.vehicle_id) continue;
      if (a.soc == null || b.soc == null) continue;
      const dh = (b.timestamp - a.timestamp) / 3600;
      if (dh < 1 || dh > 48) continue; // sinnvolle Stillstandsfenster
      const dsoc = a.soc - b.soc; // positiver Wert = Verlust
      if (dsoc <= 0) continue; // nicht entladen
      if (overlapsBusy(a.vehicle_id, a.timestamp, b.timestamp)) continue;
      events.push({
        vehicle_id: a.vehicle_id,
        from_ts: a.timestamp,
        to_ts: b.timestamp,
        hours: +dh.toFixed(2),
        soc_loss: dsoc,
        pct_per_hour: +(dsoc / dh).toFixed(3)
      });
    }

    events.sort((a, b) => b.to_ts - a.to_ts);
    const recent = events.slice(0, 50);

    const sorted = [...events].map(e => e.pct_per_hour).sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
    const avg = sorted.length ? sorted.reduce((s, v) => s + v, 0) / sorted.length : null;

    res.json({
      events: recent,
      summary: {
        count: events.length,
        median_pct_per_h: median != null ? +median.toFixed(3) : null,
        avg_pct_per_h: avg != null ? +avg.toFixed(3) : null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Persistierte Anomalien (Companion Phase 2) — direkt aus DB statt Live-Calc
router.get('/anomalies-persisted', (req, res) => {
  const db = req.db;
  const { vehicle_id, status, limit = 50 } = req.query;
  try {
    const where = ['1=1'];
    const params = [];
    if (vehicle_id) { where.push('a.vehicle_id=?'); params.push(vehicle_id); }
    if (status)     { where.push('a.status=?');     params.push(status); }
    if (req.user?.role !== 'admin') {
      where.push('a.vehicle_id IN (SELECT vehicle_id FROM vehicle_users WHERE user_id=?)');
      params.push(req.user?.sub);
    }
    const rows = db.prepare(
      `SELECT a.id, a.vehicle_id, a.type, a.occurred_at, a.detected_at,
              a.details_json, a.status, a.notified_at, a.seen_at, a.dismissed_at,
              v.display_name
       FROM battery_anomalies a
       JOIN vehicles v ON v.id=a.vehicle_id
       WHERE ${where.join(' AND ')}
       ORDER BY a.occurred_at DESC
       LIMIT ?`
    ).all(...params, +limit);
    res.json(rows.map(r => ({ ...r, details: JSON.parse(r.details_json), details_json: undefined })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/anomalies-persisted/:id/seen', (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin' ? 1 : 0;
    const r = req.db.prepare(
      `UPDATE battery_anomalies SET status='seen', seen_at=unixepoch()
       WHERE id=? AND status!='dismissed'
         AND (? = 1 OR vehicle_id IN (
           SELECT vehicle_id FROM vehicle_users WHERE user_id=?
         ))`
    ).run(req.params.id, isAdmin, req.user?.sub);
    if (r.changes === 0) return res.status(404).json({ error: 'Anomalie nicht gefunden oder kein Zugriff' });
    res.json({ updated: r.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/anomalies-persisted/:id/dismiss', (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin' ? 1 : 0;
    const r = req.db.prepare(
      `UPDATE battery_anomalies SET status='dismissed', dismissed_at=unixepoch()
       WHERE id=?
         AND (? = 1 OR vehicle_id IN (
           SELECT vehicle_id FROM vehicle_users WHERE user_id=?
         ))`
    ).run(req.params.id, isAdmin, req.user?.sub);
    if (r.changes === 0) return res.status(404).json({ error: 'Anomalie nicht gefunden oder kein Zugriff' });
    res.json({ updated: r.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vorklim-Empfehlungen (Companion Phase 2)
router.get('/precondition-suggestions', (req, res) => {
  const db = req.db;
  const { vehicle_id, status = 'open' } = req.query;
  try {
    const where = ['s.status=?'];
    const params = [status];
    if (vehicle_id) { where.push('s.vehicle_id=?'); params.push(vehicle_id); }
    if (req.user?.role !== 'admin') {
      where.push('s.vehicle_id IN (SELECT vehicle_id FROM vehicle_users WHERE user_id=?)');
      params.push(req.user?.sub);
    }
    const rows = db.prepare(
      `SELECT s.id, s.vehicle_id, s.for_date, s.expected_temp_c,
              s.expected_departure_hhmm, s.reason_code, s.details_json,
              s.status, s.acknowledged_at, s.dismissed_at,
              v.display_name
       FROM precondition_suggestions s
       JOIN vehicles v ON v.id=s.vehicle_id
       WHERE ${where.join(' AND ')}
       ORDER BY s.for_date DESC
       LIMIT 30`
    ).all(...params);
    res.json(rows.map(r => ({ ...r, details: JSON.parse(r.details_json), details_json: undefined })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/precondition-suggestions/:id/dismiss', (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin' ? 1 : 0;
    const r = req.db.prepare(
      `UPDATE precondition_suggestions SET status='dismissed', dismissed_at=unixepoch()
       WHERE id=?
         AND (? = 1 OR vehicle_id IN (
           SELECT vehicle_id FROM vehicle_users WHERE user_id=?
         ))`
    ).run(req.params.id, isAdmin, req.user?.sub);
    if (r.changes === 0) return res.status(404).json({ error: 'Vorschlag nicht gefunden oder kein Zugriff' });
    res.json({ updated: r.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Anomalien: SOC-Sprünge, Range-Sprünge, ungewöhnliche Effizienz
router.get('/anomalies', (req, res) => {
  const db = req.db;
  const { vehicle_id, days = 90 } = req.query;
  try {
    const since = Math.floor(Date.now() / 1000) - +days * 86400;
    const veh = vehicle_id ? 'AND vehicle_id = ?' : '';
    const args = vehicle_id ? [since, vehicle_id] : [since];

    const snapshots = db.prepare(
      `SELECT vehicle_id, timestamp, soc, rated_range_km
       FROM battery_snapshots
       WHERE timestamp >= ? ${veh}
       ORDER BY vehicle_id, timestamp ASC`
    ).all(...args);

    const anomalies = [];

    // SOC-Sprünge >10% in <30min ohne Trip/Charge
    const trips = db.prepare(
      `SELECT vehicle_id, start_time, end_time FROM trips
       WHERE end_time IS NOT NULL AND end_time >= ? ${veh}`
    ).all(...args);
    const charges = db.prepare(
      `SELECT vehicle_id, start_time, end_time FROM charging_sessions
       WHERE end_time IS NOT NULL AND end_time >= ? ${veh}`
    ).all(...args);
    const busy = [...trips, ...charges];

    for (let i = 1; i < snapshots.length; i++) {
      const a = snapshots[i - 1];
      const b = snapshots[i];
      if (a.vehicle_id !== b.vehicle_id) continue;
      const dt = b.timestamp - a.timestamp;
      if (dt <= 0 || dt > 1800) continue;
      // SOC-Sprung
      if (a.soc != null && b.soc != null) {
        const dsoc = Math.abs(b.soc - a.soc);
        if (dsoc >= 10) {
          const explained = busy.some(x =>
            x.vehicle_id === a.vehicle_id && x.start_time < b.timestamp && x.end_time > a.timestamp
          );
          if (!explained) {
            anomalies.push({
              type: 'soc_jump',
              vehicle_id: a.vehicle_id,
              timestamp: b.timestamp,
              soc_from: a.soc,
              soc_to: b.soc,
              window_min: Math.round(dt / 60)
            });
          }
        }
      }
      // Range-Sprung
      if (a.rated_range_km != null && b.rated_range_km != null) {
        const drange = Math.abs(b.rated_range_km - a.rated_range_km);
        if (drange >= 30) {
          anomalies.push({
            type: 'range_jump',
            vehicle_id: a.vehicle_id,
            timestamp: b.timestamp,
            range_from: +a.rated_range_km.toFixed(1),
            range_to: +b.rated_range_km.toFixed(1),
            window_min: Math.round(dt / 60)
          });
        }
      }
    }

    // Trips mit ungewöhnlicher Effizienz (>30 oder <8 kWh/100km)
    const oddTripsRows = db.prepare(
      `SELECT id, vehicle_id, start_time, distance_km, energy_used_kwh
       FROM trips
       WHERE start_time >= ? AND distance_km > 5 AND energy_used_kwh > 0 ${veh}`
    ).all(...args);
    for (const t of oddTripsRows) {
      const eff = (t.energy_used_kwh / t.distance_km) * 100;
      if (eff > 35 || eff < 7) {
        anomalies.push({
          type: 'efficiency_outlier',
          vehicle_id: t.vehicle_id,
          timestamp: t.start_time,
          kwh_per_100km: +eff.toFixed(2),
          distance_km: +t.distance_km.toFixed(1),
          trip_id: t.id
        });
      }
    }

    anomalies.sort((a, b) => b.timestamp - a.timestamp);
    res.json({ anomalies: anomalies.slice(0, 100), total: anomalies.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gesamtüberblick: alle Companion-Phase-1-KPIs auf einen Schwung
router.get('/health-summary', (req, res) => {
  const db = req.db;
  const { vehicle_id } = req.query;
  try {
    const where = vehicle_id ? 'WHERE vehicle_id = ?' : '';
    const params = vehicle_id ? [vehicle_id] : [];

    const snapshotCount = db.prepare(
      `SELECT COUNT(*) as c FROM battery_snapshots ${where}`
    ).get(...params).c;
    const tripCount = db.prepare(
      `SELECT COUNT(*) as c FROM trips ${where}`
    ).get(...params).c;
    const chargeCount = db.prepare(
      `SELECT COUNT(*) as c FROM charging_sessions ${where}`
    ).get(...params).c;

    const ranges = db.prepare(
      `SELECT MAX(rated_range_km) as max_range,
              MIN(rated_range_km) as min_range,
              AVG(rated_range_km) as avg_range
       FROM battery_snapshots
       ${where} ${where ? 'AND' : 'WHERE'} rated_range_km IS NOT NULL`
    ).get(...params);

    const effRow = db.prepare(
      `SELECT SUM(distance_km) as km, SUM(energy_used_kwh) as kwh, COUNT(*) as n
       FROM trips
       ${where} ${where ? 'AND' : 'WHERE'} distance_km > 0 AND energy_used_kwh > 0`
    ).get(...params);
    const avg_kwh_100 = (effRow && effRow.km > 0)
      ? +((effRow.kwh / effRow.km) * 100).toFixed(2)
      : null;

    res.json({
      data_volume: {
        snapshots: snapshotCount,
        trips: tripCount,
        charging_sessions: chargeCount
      },
      range: ranges,
      avg_kwh_per_100km: avg_kwh_100,
      trips_with_energy: effRow ? effRow.n : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
