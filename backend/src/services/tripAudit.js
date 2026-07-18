// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Aenderungs-Logging fuer Trips — BMF-Pflicht beim elektronischen
 * Fahrtenbuch.
 *
 * Jeder Aufruf logRecord(db, trip_id, userId, oldRow, newRow, fields)
 * vergleicht die alten und neuen Werte der genannten Felder und schreibt
 * pro Aenderung eine Zeile in trip_changes. Felder, die unveraendert
 * bleiben, werden nicht protokolliert.
 *
 * Locked Trips (locked_at != null) sind nach BMF-Export nicht mehr
 * editierbar. Routen muessen das vorher pruefen.
 */

import { recordTripChange } from './tripLedger.js';

export function isLocked(trip) {
  return !!(trip && trip.locked_at);
}

export function logChanges(db, tripId, userId, before, after, fields, action = 'update') {
  if (!before || !after) return;
  const stmt = db.prepare(
    `INSERT INTO trip_changes (trip_id, changed_by_user_id, field, old_value, new_value)
       VALUES (?, ?, ?, ?, ?)`
  );
  let changed = 0;
  for (const field of fields) {
    const o = before[field];
    const n = after[field];
    // null/undefined gleich behandeln; sonst Stringvergleich.
    const oNorm = o == null ? '' : String(o);
    const nNorm = n == null ? '' : String(n);
    if (oNorm === nNorm) continue;
    stmt.run(tripId, userId ?? null, field, oNorm || null, nNorm || null);
    changed++;
  }
  // Manipulationssicheres Fahrtenbuch (S09): tatsächliche Änderungen zusätzlich
  // in die signierte Hash-Chain schreiben.
  if (changed > 0) recordTripChange(db, tripId, action, userId);
}
