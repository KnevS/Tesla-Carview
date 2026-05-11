import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireCanEditVehicles } from '../middleware/auth.js';

const router = Router();

/** Default-Intervalle, die beim Seeding fuer ein Fahrzeug angelegt
 *  werden. **Hinweis fuer den Nutzer:** alle Angaben sind Naeherungen
 *  fuer typische EU-Fahrzeuge, **keine rechtsverbindliche Auskunft**.
 *
 *  Sonderfall HU/TÜV (Deutschland/EU): Neuwagen haben die ERSTABNAHME
 *  erst nach 36 Monaten, alle folgenden alle 24 Monate. Wir setzen
 *  hier 24 Monate als gaengigen Wert und weisen im Label darauf hin
 *  — der Nutzer kann beim Neuwagen den Wert einmalig auf 36 stellen
 *  und nach dem ersten TÜV wieder auf 24 zuruecksetzen. */
const DEFAULT_INTERVALS = [
  { kind: 'tuev',           label: 'Hauptuntersuchung (HU/TÜV) — Neuwagen 36 Mon., danach alle 24',
                            interval_months: 24, interval_km: null },
  { kind: 'inspection',     label: 'Service-Inspektion (Richtwert)',
                            interval_months: 12, interval_km: 20_000 },
  { kind: 'brake_fluid',    label: 'Bremsflüssigkeit (alle 2–4 Jahre, Tesla: 4)',
                            interval_months: 48, interval_km: null },
  { kind: 'tires_seasonal', label: 'Reifenwechsel saisonal (Sommer ↔ Winter)',
                            interval_months: 6,  interval_km: null },
  { kind: 'cabin_filter',   label: 'Innenraumfilter',
                            interval_months: 24, interval_km: null },
  { kind: 'wiper_blades',   label: 'Scheibenwischer',
                            interval_months: 12, interval_km: null },
  { kind: 'klimaservice',   label: 'Klimaservice',
                            interval_months: 24, interval_km: null },
];

/** Ein 'Monat' in Sekunden — wir nutzen 30 Tage als praktische Naeherung
 *  fuer „faellig in X Tagen". Praezision ist fuer Wartungs-Reminder
 *  irrelevant; der Mensch plant in groberen Wochen-Schritten. */
const MONTH_S = 30 * 24 * 3600;

function computeStatus(row, vehicle, now) {
  const out = { ...row };
  // Zeitliche Faelligkeit
  if (row.last_done_at && row.interval_months) {
    out.next_due_at = row.last_done_at + row.interval_months * MONTH_S;
    out.days_until_due = Math.floor((out.next_due_at - now) / 86400);
  }
  // Km-Faelligkeit
  if (row.last_done_km != null && row.interval_km) {
    out.next_due_km = row.last_done_km + row.interval_km;
    if (vehicle?.odometer_km != null) {
      out.km_until_due = Math.round(out.next_due_km - vehicle.odometer_km);
    }
  }

  // Snooze gewinnt, falls in Zukunft.
  if (row.snoozed_until && row.snoozed_until > now) {
    out.status = 'snoozed';
    return out;
  }

  // Pending: noch nie gemacht
  if (!row.last_done_at && row.last_done_km == null) {
    out.status = 'pending';
    return out;
  }

  // Ueberfaellig wenn negative Werte erreicht.
  const dDays = out.days_until_due ?? Infinity;
  const dKm   = out.km_until_due ?? Infinity;
  if (dDays < 0 || dKm < 0) out.status = 'overdue';
  else if (dDays <= 30 || dKm <= 1000) out.status = 'soon';
  else out.status = 'ok';

  return out;
}

const baseSchema = z.object({
  vehicle_id:      z.coerce.number().int().positive(),
  kind:            z.string().min(1).max(64),
  label:           z.string().min(1).max(120),
  interval_months: z.coerce.number().int().min(0).max(120).nullable().optional(),
  interval_km:     z.coerce.number().int().min(0).max(500_000).nullable().optional(),
  last_done_at:    z.coerce.number().int().nullable().optional(),
  last_done_km:    z.coerce.number().min(0).max(2_000_000).nullable().optional(),
  is_active:       z.boolean().optional(),
});

// GET /api/service-intervals?vehicle_id=
router.get('/', (req, res) => {
  const vehicleId = req.query.vehicle_id ? +req.query.vehicle_id : null;
  const where  = vehicleId ? 'WHERE si.vehicle_id = ?' : '';
  const params = vehicleId ? [vehicleId] : [];
  const rows = req.db.prepare(
    `SELECT si.*, v.odometer_km, v.display_name AS vehicle_name
       FROM service_intervals si
       JOIN vehicles v ON v.id = si.vehicle_id
       ${where}
       ORDER BY si.is_active DESC, si.kind`
  ).all(...params);
  const now = Math.floor(Date.now() / 1000);
  // computeStatus erwartet `vehicle` separat — hier ist v.odometer_km bereits
  // im Row-Objekt aus dem JOIN, also reicht ein Pseudo-Vehicle.
  res.json(rows.map(r => computeStatus(r, { odometer_km: r.odometer_km }, now)));
});

// POST /api/service-intervals — neues Intervall anlegen
router.post('/', requireCanEditVehicles, validate(baseSchema), (req, res) => {
  const { vehicle_id, kind, label, interval_months, interval_km,
          last_done_at, last_done_km, is_active } = req.body;
  try {
    const r = req.db.prepare(
      `INSERT INTO service_intervals
         (vehicle_id, kind, label, interval_months, interval_km,
          last_done_at, last_done_km, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(vehicle_id, kind, label,
          interval_months ?? null, interval_km ?? null,
          last_done_at ?? null, last_done_km ?? null,
          is_active === false ? 0 : 1);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Diese Wartungsart existiert für das Fahrzeug bereits' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/service-intervals/:id
router.put('/:id', requireCanEditVehicles, validate(baseSchema.partial()), (req, res) => {
  const fields = [];
  const params = [];
  for (const k of ['kind', 'label', 'interval_months', 'interval_km',
                   'last_done_at', 'last_done_km', 'is_active']) {
    if (k in req.body) {
      fields.push(`${k} = ?`);
      params.push(k === 'is_active'
        ? (req.body[k] ? 1 : 0)
        : (req.body[k] ?? null));
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'Keine Aenderung mitgegeben' });
  fields.push('updated_at = unixepoch()');
  // Beim Aktualisieren der last_done-Felder den notified_at-Marker
  // zuruecksetzen, sodass beim naechsten Faelligkeitsfenster wieder
  // eine Push-Erinnerung ausgeloest wird.
  if ('last_done_at' in req.body || 'last_done_km' in req.body) {
    fields.push('notified_at = NULL');
    fields.push('snoozed_until = NULL');
  }
  params.push(req.params.id);
  req.db.prepare(`UPDATE service_intervals SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

// DELETE /api/service-intervals/:id
router.delete('/:id', requireCanEditVehicles, (req, res) => {
  req.db.prepare('DELETE FROM service_intervals WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// POST /api/service-intervals/:id/snooze — verschiebt Erinnerung um N Tage
router.post('/:id/snooze', validate(z.object({ days: z.number().int().min(1).max(365).default(30) })), (req, res) => {
  const until = Math.floor(Date.now() / 1000) + req.body.days * 86400;
  req.db.prepare(
    'UPDATE service_intervals SET snoozed_until = ?, updated_at = unixepoch() WHERE id = ?'
  ).run(until, req.params.id);
  res.json({ ok: true, snoozed_until: until });
});

/** POST /api/service-intervals/seed-defaults
 *  Legt fuer ein Fahrzeug die Standard-Intervalle an, die noch nicht
 *  existieren. Konflikt-frei dank UNIQUE(vehicle_id, kind).
 *
 *  vehicle_id wird mit z.coerce gelesen, weil das Frontend aus dem
 *  App-Store auch String-IDs liefern kann (URLSearchParams etc.) —
 *  vorher schlug die Validation mit „expected number" leise fehl. */
router.post('/seed-defaults', requireCanEditVehicles, validate(z.object({
  vehicle_id: z.coerce.number().int().positive(),
})), (req, res) => {
  const insert = req.db.prepare(
    `INSERT OR IGNORE INTO service_intervals
       (vehicle_id, kind, label, interval_months, interval_km)
     VALUES (?, ?, ?, ?, ?)`
  );
  let added = 0;
  for (const d of DEFAULT_INTERVALS) {
    const r = insert.run(req.body.vehicle_id, d.kind, d.label, d.interval_months, d.interval_km);
    if (r.changes) added++;
  }
  res.json({ added, total_defaults: DEFAULT_INTERVALS.length });
});

export default router;
