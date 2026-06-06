/**
 * /api/tco — Total Cost of Ownership Cockpit
 *
 * Aggregiert pro Fahrzeug:
 *   • Wertverlust  = purchase_price - (sale_price || aktueller Restwert)
 *   • Versicherung = insurance_eur_year * Jahre seit Kauf
 *   • Steuer       = tax_eur_year       * Jahre seit Kauf
 *   • Strom        = SUM(charging_sessions.cost) wo > 0
 *   • Wartung      = SUM(service_records.cost_eur)
 *
 * Gefahrene km   = odometer_km - initial_odometer_km
 * €/km           = Gesamtkosten / gefahrene km
 *
 * Restwert-Schaetzung wenn noch nicht verkauft:
 *   Lineare Abschreibung ueber 8 Jahre auf 25% des Anschaffungspreises.
 *   Reines Heuristik — Admin kann sale_price_eur jederzeit selber setzen.
 *
 * Alle Posten optional: fehlende Stammdaten fuehren nicht zu Fehler,
 * sondern werden im Ergebnis als `null` ausgewiesen.
 *
 * GET  /api/tco/vehicles/:id            — TCO-Aggregat + Stammdaten
 * PATCH /api/tco/vehicles/:id           — Stammdaten setzen (Anschaffung, Versicherung, …)
 * GET  /api/tco/vehicles/:id/service-records      — Liste
 * POST /api/tco/vehicles/:id/service-records      — Eintrag anlegen
 * PATCH /api/tco/vehicles/:id/service-records/:rid — Eintrag editieren
 * DELETE /api/tco/vehicles/:id/service-records/:rid
 */

import { Router } from 'express';

const router = Router();

// ── Helper: Restwert-Schaetzung (8 Jahre lineare Abschreibung auf 25%) ────
function estimateResidualEur(purchasePriceEur, purchaseDate, now = Math.floor(Date.now() / 1000)) {
  if (purchasePriceEur == null || purchaseDate == null) return null;
  const yearsOwned = Math.max(0, (now - purchaseDate) / (365.25 * 86400));
  const totalLoss  = purchasePriceEur * 0.75;            // 75% Wertverlust in 8 Jahren
  const linearLoss = Math.min(totalLoss, totalLoss * (yearsOwned / 8));
  return Math.round((purchasePriceEur - linearLoss) * 100) / 100;
}

// ── Helper: TCO-Aggregat fuer ein Fahrzeug ───────────────────────────────
function computeTco(db, vehicleId) {
  const v = db.prepare(`
    SELECT id, display_name, vin, category,
           purchase_price_eur, purchase_date, sale_price_eur, sale_date,
           insurance_eur_year, tax_eur_year,
           initial_odometer_km, odometer_km
    FROM vehicles WHERE id=?
  `).get(vehicleId);
  if (!v) return null;

  const now = Math.floor(Date.now() / 1000);
  const endDate = v.sale_date ?? now;
  const startDate = v.purchase_date ?? null;
  const yearsOwned = (startDate != null)
    ? Math.max(0, (endDate - startDate) / (365.25 * 86400))
    : null;

  const residualEur = (v.sale_price_eur != null)
    ? v.sale_price_eur
    : estimateResidualEur(v.purchase_price_eur, v.purchase_date, now);

  const depreciationEur = (v.purchase_price_eur != null && residualEur != null)
    ? Math.round((v.purchase_price_eur - residualEur) * 100) / 100
    : null;

  const insuranceTotalEur = (v.insurance_eur_year != null && yearsOwned != null)
    ? Math.round(v.insurance_eur_year * yearsOwned * 100) / 100 : null;
  const taxTotalEur = (v.tax_eur_year != null && yearsOwned != null)
    ? Math.round(v.tax_eur_year * yearsOwned * 100) / 100 : null;

  const electricityCents = db.prepare(`
    SELECT COALESCE(SUM(cost), 0) AS sum FROM charging_sessions
    WHERE vehicle_id=? AND cost IS NOT NULL AND cost > 0
  `).get(vehicleId);
  const electricityEur = Math.round(electricityCents.sum * 100) / 100;

  const serviceCents = db.prepare(`
    SELECT COALESCE(SUM(cost_eur), 0) AS sum FROM service_records WHERE vehicle_id=?
  `).get(vehicleId);
  const serviceEur = Math.round(serviceCents.sum * 100) / 100;

  // Servicekosten nach Kategorie aufschluesseln
  const serviceBreakdown = db.prepare(`
    SELECT category, COALESCE(SUM(cost_eur),0) AS sum, COUNT(*) AS n
    FROM service_records WHERE vehicle_id=?
    GROUP BY category
  `).all(vehicleId).map(r => ({ category: r.category, sum_eur: Math.round(r.sum * 100) / 100, count: r.n }));

  const startKm = v.initial_odometer_km ?? 0;
  const currentKm = v.odometer_km ?? startKm;
  const drivenKm = Math.max(0, currentKm - startKm);

  // Total: nur Posten mit bekanntem Wert addieren, sonst null sammeln
  const parts = [depreciationEur, insuranceTotalEur, taxTotalEur, electricityEur, serviceEur]
    .filter(x => x != null);
  const totalEur = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) * 100) / 100 : null;

  const costPerKm = (totalEur != null && drivenKm > 0)
    ? Math.round(totalEur / drivenKm * 1000) / 1000 : null;

  return {
    vehicle: {
      id: v.id, display_name: v.display_name, vin: v.vin, category: v.category,
      purchase_price_eur: v.purchase_price_eur,
      purchase_date:      v.purchase_date,
      sale_price_eur:     v.sale_price_eur,
      sale_date:          v.sale_date,
      insurance_eur_year: v.insurance_eur_year,
      tax_eur_year:       v.tax_eur_year,
      initial_odometer_km: v.initial_odometer_km,
      odometer_km:        v.odometer_km,
    },
    summary: {
      driven_km:        drivenKm,
      years_owned:      yearsOwned != null ? Math.round(yearsOwned * 100) / 100 : null,
      residual_eur:     residualEur,
      residual_is_estimate: v.sale_price_eur == null,
      depreciation_eur: depreciationEur,
      insurance_eur:    insuranceTotalEur,
      tax_eur:          taxTotalEur,
      electricity_eur:  electricityEur,
      service_eur:      serviceEur,
      total_eur:        totalEur,
      cost_per_km_eur:  costPerKm,
    },
    service_breakdown: serviceBreakdown,
  };
}

// ── Routen ────────────────────────────────────────────────────────────────

router.get('/vehicles/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = computeTco(req.db, id);
  if (!result) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
  res.json(result);
});

router.patch('/vehicles/:id', (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren' });
  const id = Number(req.params.id);
  const allowed = ['purchase_price_eur', 'purchase_date', 'sale_price_eur', 'sale_date',
                   'insurance_eur_year', 'tax_eur_year', 'initial_odometer_km'];
  const updates = []; const args = [];
  for (const k of allowed) {
    if (k in (req.body || {})) {
      const v = req.body[k];
      updates.push(`${k}=?`);
      args.push(v === null || v === '' ? null : Number(v));
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nichts zu ändern' });
  args.push(id);
  const r = req.db.prepare(`UPDATE vehicles SET ${updates.join(', ')} WHERE id=?`).run(...args);
  if (r.changes === 0) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
  res.json(computeTco(req.db, id));
});

router.get('/vehicles/:id/service-records', (req, res) => {
  const id = Number(req.params.id);
  const rows = req.db.prepare(`
    SELECT id, performed_at, odometer_km, category, label, cost_eur, vendor, notes
    FROM service_records WHERE vehicle_id=? ORDER BY performed_at DESC
  `).all(id);
  res.json(rows);
});

router.post('/vehicles/:id/service-records', (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren' });
  const id = Number(req.params.id);
  const { performed_at, odometer_km, category, label, cost_eur, vendor, notes } = req.body || {};
  const validCats = ['service', 'tires', 'repair', 'inspection', 'tuv', 'accessories', 'other'];
  if (!performed_at || !label || cost_eur == null || !validCats.includes(category)) {
    return res.status(400).json({ error: 'performed_at, category, label, cost_eur erforderlich' });
  }
  // Vehicle muss existieren
  const v = req.db.prepare('SELECT 1 FROM vehicles WHERE id=?').get(id);
  if (!v) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
  const info = req.db.prepare(`
    INSERT INTO service_records (vehicle_id, performed_at, odometer_km, category, label, cost_eur, vendor, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, Number(performed_at), odometer_km != null ? Number(odometer_km) : null,
         category, String(label).slice(0, 200),
         Number(cost_eur),
         vendor ? String(vendor).slice(0, 120) : null,
         notes  ? String(notes).slice(0, 500)  : null);
  res.json({ id: info.lastInsertRowid });
});

router.patch('/vehicles/:id/service-records/:rid', (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren' });
  const id = Number(req.params.id), rid = Number(req.params.rid);
  const validCats = ['service', 'tires', 'repair', 'inspection', 'tuv', 'accessories', 'other'];
  const allowed = ['performed_at', 'odometer_km', 'category', 'label', 'cost_eur', 'vendor', 'notes'];
  const updates = []; const args = [];
  for (const k of allowed) {
    if (k in (req.body || {})) {
      let v = req.body[k];
      if (k === 'category' && !validCats.includes(v)) return res.status(400).json({ error: 'Ungültige Kategorie' });
      if (['performed_at', 'odometer_km', 'cost_eur'].includes(k) && v != null && v !== '') v = Number(v);
      if (v === '' || v == null) v = null;
      updates.push(`${k}=?`); args.push(v);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nichts zu ändern' });
  args.push(rid, id);
  const r = req.db.prepare(`UPDATE service_records SET ${updates.join(', ')} WHERE id=? AND vehicle_id=?`).run(...args);
  if (r.changes === 0) return res.status(404).json({ error: 'Eintrag nicht gefunden' });
  res.json({ ok: true });
});

router.delete('/vehicles/:id/service-records/:rid', (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren' });
  const id = Number(req.params.id), rid = Number(req.params.rid);
  const r = req.db.prepare('DELETE FROM service_records WHERE id=? AND vehicle_id=?').run(rid, id);
  if (r.changes === 0) return res.status(404).json({ error: 'Eintrag nicht gefunden' });
  res.json({ ok: true });
});

export default router;
