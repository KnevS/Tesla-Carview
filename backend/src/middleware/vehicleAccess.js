// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Vehicle-Access-Guard innerhalb eines Tenants.
 *
 * Bis HIGH 2 aus dem Audit hatte ein Tenant „Vertrauensgruppen"-
 * Semantik: jeder Mitglieder-User sah die Fahrzeuge / Trips /
 * Charging-Sessions aller anderen. Das ist OK fuer einen Single-User-
 * oder Familien-Tenant — aber kaputt fuer Firmen-Mandanten mit
 * mehreren unabhaengigen Fahrern (z.B. Steuerprueferin-relevante
 * Fahrtenbuch-Daten waeren cross-user lesbar/editierbar gewesen).
 *
 * Modell:
 *   - Admins eines Tenants sehen weiterhin alles (sonst koennten sie
 *     ihre Mandanten nicht verwalten — Fahrzeuge zuordnen,
 *     Stammdaten pflegen, exporte erstellen).
 *   - Normale User sehen nur Fahrzeuge, fuer die in `vehicle_users`
 *     eine (vehicle_id, user_id)-Zeile existiert.
 *
 * Die Helper werfen einen Error mit .status=403/404; Route-Handler
 * werden in try/catch gewickelt und antworten dann mit dem
 * passenden HTTP-Code (sieh Beispiele in routes/trips.js).
 */

/** Wirft 403, wenn der User keinen Zugriff auf vehicleId hat.
 *  Admins haben immer Zugriff. */
export function assertVehicleAccess(db, vehicleId, user) {
  if (!user) {
    const err = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }
  if (user.role === 'admin') return;
  const row = db.prepare(
    'SELECT 1 FROM vehicle_users WHERE vehicle_id=? AND user_id=? LIMIT 1'
  ).get(vehicleId, user.sub);
  if (!row) {
    const err = new Error('Forbidden: no access to this vehicle');
    err.status = 403;
    throw err;
  }
}

/** Wirft 404 falls Trip nicht existiert; sonst delegiert an
 *  assertVehicleAccess. Praktisch fuer PATCH/DELETE-Endpoints, die
 *  per :id auf einen Trip zeigen. */
export function assertTripAccess(db, tripId, user) {
  const row = db.prepare('SELECT vehicle_id FROM trips WHERE id=?').get(tripId);
  if (!row) {
    const err = new Error('Trip not found');
    err.status = 404;
    throw err;
  }
  assertVehicleAccess(db, row.vehicle_id, user);
  return row.vehicle_id;
}

/** Analog fuer Charging-Sessions. */
export function assertChargingAccess(db, sessionId, user) {
  const row = db.prepare('SELECT vehicle_id FROM charging_sessions WHERE id=?').get(sessionId);
  if (!row) {
    const err = new Error('Charging session not found');
    err.status = 404;
    throw err;
  }
  assertVehicleAccess(db, row.vehicle_id, user);
  return row.vehicle_id;
}

/** Convenience-Wrapper, um die assert*-Helper in Express-Handlern zu
 *  benutzen, ohne ueberall die gleiche try/catch-Tanz-Routine zu
 *  schreiben. Gibt `true` zurueck, wenn die Pruefung fehlschlaegt und
 *  die Response bereits geschrieben wurde — Handler kann dann mit
 *  `return` aussteigen.
 *
 *  Beispiel:
 *    if (guardAccess(res, () => assertTripAccess(req.db, req.params.id, req.user))) return;
 */
export function guardAccess(res, fn) {
  try { fn(); return false; }
  catch (err) {
    res.status(err.status || 500).json({ error: err.message });
    return true;
  }
}

/** Liefert ein WHERE-Fragment + Parameter-Liste, das eine
 *  Liste/Aggregations-Query auf die Fahrzeuge des aktuellen Users
 *  einschraenkt. Admins bekommen ein leeres Fragment (= alle
 *  Fahrzeuge im Tenant).
 *
 *  Aufrufer baut z.B.:
 *    const { fragment, params } = restrictToOwnVehicles(req);
 *    const sql = `SELECT * FROM trips WHERE 1=1 ${fragment}`;
 *    db.prepare(sql).all(...params);
 *
 *  fragment beginnt immer mit ' AND ' oder ist leer — laesst sich
 *  also bedingungslos hinter ein bestehendes WHERE haengen.
 *
 *  `vehicleIdColumn` ist der vollqualifizierte Spaltenname inkl.
 *  Tabellen-Alias (z.B. 't.vehicle_id' fuer trips, 'vehicle_id'
 *  fuer charging_sessions). */
export function restrictToOwnVehicles(req, vehicleIdColumn = 'vehicle_id') {
  if (req.user?.role === 'admin') return { fragment: '', params: [] };
  return {
    fragment: ` AND ${vehicleIdColumn} IN (SELECT vehicle_id FROM vehicle_users WHERE user_id = ?)`,
    params:   [req.user.sub],
  };
}
