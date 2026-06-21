// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
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

// ── Helper: Leasing-Kosten bis "now" berechnen ───────────────────────────
// Liefert {leasingCostEur, leasingExtraKmEur, leasingPartsKnown}.
// leasingPartsKnown=false bedeutet: Stammdaten unvollstaendig — Wertverlust=null.
function computeLeasingCost(v, drivenKm, now) {
  if (!v.is_leasing) return { leasingCostEur: null, leasingExtraKmEur: null, leasingPartsKnown: false };
  // Pflichtfelder fuer eine sinnvolle Leasing-Berechnung
  const haveCore = v.purchase_date != null && v.leasing_monthly_rate_eur != null;
  if (!haveCore) return { leasingCostEur: null, leasingExtraKmEur: null, leasingPartsKnown: false };

  const monthsElapsed = Math.max(0, (now - v.purchase_date) / (30.4375 * 86400));
  const monthsForRate = (v.leasing_term_months != null)
    ? Math.min(monthsElapsed, v.leasing_term_months)
    : monthsElapsed;

  const downPayment = v.leasing_down_payment_eur ?? 0;
  const monthlyTotal = monthsForRate * v.leasing_monthly_rate_eur;

  // Rueckkauf nur dann anrechnen wenn Laufzeit beendet (oder Fahrzeug verkauft/abgeloest)
  const termEnded = v.leasing_term_months != null && monthsElapsed >= v.leasing_term_months;
  const buyback = (termEnded && v.leasing_buyback_eur != null) ? v.leasing_buyback_eur : 0;

  // Mehrkilometer: erwartete km anteilig = (monthsElapsed / term) * included_km
  let extraKmEur = null;
  if (v.leasing_included_km != null && v.leasing_term_months != null && v.leasing_extra_km_rate_eur != null) {
    const expectedKm = (monthsForRate / v.leasing_term_months) * v.leasing_included_km;
    const overKm = Math.max(0, drivenKm - expectedKm);
    extraKmEur = Math.round(overKm * v.leasing_extra_km_rate_eur * 100) / 100;
  }

  const total = Math.round((downPayment + monthlyTotal + buyback + (extraKmEur ?? 0)) * 100) / 100;
  return { leasingCostEur: total, leasingExtraKmEur: extraKmEur, leasingPartsKnown: true };
}

// ── Helper: TCO-Aggregat fuer ein Fahrzeug ───────────────────────────────
function computeTco(db, vehicleId) {
  const v = db.prepare(`
    SELECT id, display_name, vin, category,
           purchase_price_eur, purchase_date, sale_price_eur, sale_date,
           insurance_eur_year, tax_eur_year,
           initial_odometer_km, odometer_km,
           is_leasing, leasing_down_payment_eur, leasing_monthly_rate_eur,
           leasing_term_months, leasing_buyback_eur,
           leasing_included_km, leasing_extra_km_rate_eur
    FROM vehicles WHERE id=?
  `).get(vehicleId);
  if (!v) return null;

  const now = Math.floor(Date.now() / 1000);
  const endDate = v.sale_date ?? now;
  const startDate = v.purchase_date ?? null;
  const yearsOwned = (startDate != null)
    ? Math.max(0, (endDate - startDate) / (365.25 * 86400))
    : null;

  // Wertverlust-Berechnung haengt von Finanzierungsart ab.
  // Bei Leasing: Anzahlung + Raten (+ ggf. Rueckkauf) + Mehr-km;
  // bei Kauf: klassisch Anschaffung - Restwert/Verkaufspreis.
  let depreciationEur = null;
  let residualEur = null;
  let leasingExtraKmEur = null;
  if (v.is_leasing) {
    const startKmTmp = v.initial_odometer_km ?? 0;
    const currKmTmp = v.odometer_km ?? startKmTmp;
    const drivenKmTmp = Math.max(0, currKmTmp - startKmTmp);
    const lc = computeLeasingCost(v, drivenKmTmp, now);
    depreciationEur = lc.leasingCostEur;
    leasingExtraKmEur = lc.leasingExtraKmEur;
    // residualEur bleibt null bei Leasing — wir zeigen es nicht
  } else {
    residualEur = (v.sale_price_eur != null)
      ? v.sale_price_eur
      : estimateResidualEur(v.purchase_price_eur, v.purchase_date, now);
    depreciationEur = (v.purchase_price_eur != null && residualEur != null)
      ? Math.round((v.purchase_price_eur - residualEur) * 100) / 100
      : null;
  }

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
      is_leasing:                 !!v.is_leasing,
      leasing_down_payment_eur:   v.leasing_down_payment_eur,
      leasing_monthly_rate_eur:   v.leasing_monthly_rate_eur,
      leasing_term_months:        v.leasing_term_months,
      leasing_buyback_eur:        v.leasing_buyback_eur,
      leasing_included_km:        v.leasing_included_km,
      leasing_extra_km_rate_eur:  v.leasing_extra_km_rate_eur,
    },
    summary: {
      driven_km:        drivenKm,
      years_owned:      yearsOwned != null ? Math.round(yearsOwned * 100) / 100 : null,
      residual_eur:     residualEur,
      residual_is_estimate: !v.is_leasing && v.sale_price_eur == null,
      depreciation_eur: depreciationEur,
      depreciation_kind: v.is_leasing ? 'leasing' : 'purchase',
      leasing_extra_km_eur: leasingExtraKmEur,
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

// Fahrer dürfen nur auf eigene Fahrzeuge (vehicle_users) zugreifen,
// Admin sieht alles. Pattern aus routes/owntracks.js.
function assertVehicleAccess(req, vehicleId) {
  if (req.user?.role === 'admin') return null;
  const ok = req.db.prepare(
    'SELECT 1 FROM vehicle_users WHERE vehicle_id=? AND user_id=?'
  ).get(vehicleId, req.user?.sub);
  return ok ? null : { status: 403, body: { error: 'Kein Zugriff auf dieses Fahrzeug' } };
}

router.get('/vehicles/:id', (req, res) => {
  const id = Number(req.params.id);
  const denied = assertVehicleAccess(req, id);
  if (denied) return res.status(denied.status).json(denied.body);
  const result = computeTco(req.db, id);
  if (!result) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
  res.json(result);
});

// GET /api/tco/vehicles/:id/forecast — 12-Monats-Kostenausblick.
// Ehrliche Heuristik: die tatsächlichen Kosten der letzten 12 Monate sind die
// Erwartung für die nächsten 12 (Wartung + Strom), plus Versicherung/Steuer
// aus den Stammdaten (jährlich). Reine Statistik.
router.get('/vehicles/:id/forecast', (req, res) => {
  const id = Number(req.params.id);
  const denied = assertVehicleAccess(req, id);
  if (denied) return res.status(denied.status).json(denied.body);
  const v = req.db.prepare('SELECT insurance_eur_year, tax_eur_year FROM vehicles WHERE id=?').get(id);
  if (!v) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });

  const yearAgo = Math.floor(Date.now() / 1000) - 365 * 86400;
  const svc = req.db.prepare(
    'SELECT COALESCE(SUM(cost_eur), 0) AS s, COUNT(*) AS n FROM service_records WHERE vehicle_id=? AND performed_at > ?'
  ).get(id, yearAgo);
  const elec = req.db.prepare(
    'SELECT COALESCE(SUM(cost), 0) AS s FROM charging_sessions WHERE vehicle_id=? AND start_time > ? AND cost > 0'
  ).get(id, yearAgo);

  const r2 = x => Math.round(x * 100) / 100;
  const service     = r2(svc.s);
  const electricity = r2(elec.s);
  const insurance   = v.insurance_eur_year != null ? r2(v.insurance_eur_year) : null;
  const tax         = v.tax_eur_year != null ? r2(v.tax_eur_year) : null;
  const total = r2([service, electricity, insurance, tax].reduce((a, b) => a + (b || 0), 0));

  res.json({
    based_on_months: 12,
    service_records_count: svc.n,
    has_history: svc.n > 0 || elec.s > 0,
    predicted: {
      service_eur: service, electricity_eur: electricity,
      insurance_eur: insurance, tax_eur: tax, total_eur: total,
    },
  });
});

router.patch('/vehicles/:id', (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren' });
  const id = Number(req.params.id);
  const allowed = ['purchase_price_eur', 'purchase_date', 'sale_price_eur', 'sale_date',
                   'insurance_eur_year', 'tax_eur_year', 'initial_odometer_km',
                   'is_leasing', 'leasing_down_payment_eur', 'leasing_monthly_rate_eur',
                   'leasing_term_months', 'leasing_buyback_eur',
                   'leasing_included_km', 'leasing_extra_km_rate_eur'];
  const updates = []; const args = [];
  for (const k of allowed) {
    if (k in (req.body || {})) {
      const v = req.body[k];
      updates.push(`${k}=?`);
      // is_leasing wird als 0/1 gespeichert (Bool akzeptiert)
      if (k === 'is_leasing') {
        args.push(v ? 1 : 0);
      } else {
        args.push(v === null || v === '' ? null : Number(v));
      }
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
  const denied = assertVehicleAccess(req, id);
  if (denied) return res.status(denied.status).json(denied.body);
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
