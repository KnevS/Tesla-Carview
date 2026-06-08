// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Community Benchmarks — opt-in anonyme Verbrauchsvergleiche.
 *
 * Datenschutz-Prinzipien:
 *  - Nur Aggregate, niemals Einzel-Fahrten oder Koordinaten
 *  - Modell-Key (z.B. "model y") ist einziger Identifikator
 *  - Instance-UUID wird aus der Tenant-ID gehasht, kann nicht auf Person zurückgeführt werden
 *  - Löschen per DELETE /community/my-contribution jederzeit möglich
 *  - opt_in muss explizit gesetzt sein (tenant_settings)
 *
 * Endpunkte:
 *   GET  /api/community/stats/:modelKey  — anonymisierte Aggregate für ein Modell
 *   POST /api/community/contribute       — eigene Daten (opt-in) beitragen / aktualisieren
 *   GET  /api/community/opt-in           — aktuellen Opt-in-Status des Mandanten lesen
 *   PUT  /api/community/opt-in           — Opt-in ein-/ausschalten
 *   DELETE /api/community/my-contribution — eigene Daten aus Benchmark entfernen
 */
import { Router } from 'express';
import { getMasterDb } from '../db/database.js';
import { createHash } from 'crypto';

const router = Router();

// Deterministische, nicht-umkehrbare UUID aus Tenant-ID
function instanceUuid(tenantId) {
  return createHash('sha256').update(`bench-${tenantId}`).digest('hex').slice(0, 36);
}

// Tenant-Settings Helpers
function getOptIn(db, tenantId) {
  const row = db.prepare("SELECT value FROM tenant_settings WHERE key='community_opt_in'").get();
  return row?.value === '1';
}
function setOptIn(db, value) {
  db.prepare(`
    INSERT INTO tenant_settings (key, value) VALUES ('community_opt_in', ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run(value ? '1' : '0');
}

/**
 * GET /api/community/stats/:modelKey
 * Gibt anonymisierte Aggregat-Statistiken für das angefragte Modell zurück.
 * Mindestens 3 Beiträge, sonst leere Antwort (k-Anonymität).
 */
router.get('/stats/:modelKey', (req, res) => {
  try {
    const { modelKey } = req.params;
    const master = getMasterDb();

    const rows = master.prepare(
      'SELECT avg_kwh_100km, sample_trips, total_km FROM community_benchmarks WHERE model_key=?'
    ).all(modelKey.toLowerCase());

    // k-Anonymität: Mindest-Teilnehmer
    const K_MIN = 3;
    if (rows.length < K_MIN) {
      return res.json({ model_key: modelKey, available: false, min_contributors: K_MIN, contributors: rows.length });
    }

    // Gewichteter Durchschnitt (nach Fahrtenanzahl)
    const totalTrips = rows.reduce((s, r) => s + r.sample_trips, 0);
    const weightedAvg = rows.reduce((s, r) => s + r.avg_kwh_100km * r.sample_trips, 0) / totalTrips;
    const totalKm     = rows.reduce((s, r) => s + r.total_km, 0);

    // Perzentile (P25, P50, P75) für Bandbreite
    const sorted = [...rows].sort((a, b) => a.avg_kwh_100km - b.avg_kwh_100km);
    const p = pct => sorted[Math.floor(sorted.length * pct)]?.avg_kwh_100km ?? null;

    res.json({
      model_key:      modelKey,
      available:      true,
      contributors:   rows.length,
      avg_kwh_100km:  +weightedAvg.toFixed(2),
      p25_kwh_100km:  p(0.25) != null ? +p(0.25).toFixed(2) : null,
      p50_kwh_100km:  p(0.50) != null ? +p(0.50).toFixed(2) : null,
      p75_kwh_100km:  p(0.75) != null ? +p(0.75).toFixed(2) : null,
      total_km:       +totalKm.toFixed(0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/community/contribute
 * Schreibt/aktualisiert den Beitrag des Mandanten in community_benchmarks.
 * Nur wenn opt_in = 1 in tenant_settings.
 */
router.post('/contribute', (req, res) => {
  try {
    const db     = req.db;
    const tenant = req.tenant;
    if (!getOptIn(db, tenant.id)) {
      return res.status(403).json({ error: 'Opt-in nicht aktiv. Bitte zuerst in den Einstellungen aktivieren.' });
    }

    // Berechne Aggregate aus den Trips des Mandanten
    const model = db.prepare('SELECT model FROM vehicles LIMIT 1').get();
    if (!model?.model) return res.status(400).json({ error: 'Kein Fahrzeug konfiguriert' });

    const modelKey = (model.model || '').toLowerCase().replace(/\s+/g, ' ').trim();

    const stats = db.prepare(`
      SELECT
        AVG(energy_used_kwh / NULLIF(distance_km, 0) * 100) AS avg_kwh,
        COUNT(*) AS trips,
        SUM(distance_km) AS total_km
      FROM trips
      WHERE end_time IS NOT NULL AND energy_used_kwh > 0 AND distance_km > 1
    `).get();

    if (!stats?.avg_kwh || stats.trips < 5) {
      return res.status(400).json({ error: 'Zu wenige Fahrten für einen Beitrag (mindestens 5 benötigt).' });
    }

    const uuid = instanceUuid(tenant.id);
    getMasterDb().prepare(`
      INSERT INTO community_benchmarks (instance_uuid, model_key, avg_kwh_100km, sample_trips, total_km)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(instance_uuid, model_key) DO UPDATE SET
        avg_kwh_100km   = excluded.avg_kwh_100km,
        sample_trips    = excluded.sample_trips,
        total_km        = excluded.total_km,
        contributed_at  = unixepoch()
    `).run(uuid, modelKey, +stats.avg_kwh.toFixed(2), stats.trips, +(stats.total_km ?? 0).toFixed(1));

    res.json({ ok: true, model_key: modelKey, avg_kwh_100km: +stats.avg_kwh.toFixed(2), sample_trips: stats.trips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/community/opt-in — Opt-in-Status lesen */
router.get('/opt-in', (req, res) => {
  try {
    const optIn = getOptIn(req.db, req.tenant?.id);
    res.json({ opt_in: optIn });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/community/opt-in — Opt-in setzen */
router.put('/opt-in', (req, res) => {
  try {
    const { opt_in } = req.body;
    setOptIn(req.db, !!opt_in);
    res.json({ ok: true, opt_in: !!opt_in });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/community/my-contribution — eigene Daten entfernen */
router.delete('/my-contribution', (req, res) => {
  try {
    const uuid = instanceUuid(req.tenant?.id);
    const r = getMasterDb().prepare('DELETE FROM community_benchmarks WHERE instance_uuid=?').run(uuid);
    res.json({ ok: true, deleted: r.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
