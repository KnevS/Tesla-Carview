// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Manipulationssicheres Fahrtenbuch (S09) — GoBD-nahe Änderungs-Chain.
 *
 * Jede Änderung an einer Fahrt schreibt einen append-only Eintrag in
 * `trip_ledger`. Jeder Eintrag verkettet über `prev_hash` auf den HMAC des
 * Vorgängers (Hash-Chain) und wird zusätzlich mit einem serverseitigen
 * Schlüssel **HMAC-signiert** — dadurch kann auch der Betreiber die Kette
 * nicht unbemerkt neu schreiben (er müsste jeden Folge-HMAC neu berechnen,
 * ohne den Schlüssel scheitert das an der Verifikation).
 *
 * Ziel: lückenlose, nachvollziehbare und unveränderbare Änderungshistorie
 * (GoBD-Grundsätze Nachvollziehbarkeit + Unveränderbarkeit) als Argument
 * für die Anerkennung des elektronischen Fahrtenbuchs.
 *
 * Der Schlüssel liegt in `${DATA_DIR}/.ledger-key` (32 Bytes, 0600), analog
 * zum Encryption-Key. Nie ins Repo, nie in Logs — zusammen mit `data/` sichern.
 */
import crypto from 'crypto';
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'fs';
import { join } from 'path';

let cachedKey = null;
function ledgerKey() {
  if (cachedKey) return cachedKey;
  const path = join(process.env.DATA_DIR || '/app/data', '.ledger-key');
  if (existsSync(path)) {
    cachedKey = readFileSync(path);
  } else {
    cachedKey = crypto.randomBytes(32);
    writeFileSync(path, cachedKey, { mode: 0o600 });
    try { chmodSync(path, 0o600); } catch { /* Berechtigung ggf. schon gesetzt */ }
  }
  return cachedKey;
}

// GoBD-relevante Felder in stabiler Reihenfolge (kanonische Serialisierung).
const FIELDS = [
  'id', 'start_time', 'end_time', 'distance_km',
  'start_address', 'end_address', 'start_odometer_km', 'end_odometer_km',
  'trip_type', 'purpose', 'business_partner', 'driver_id',
];
function canonicalTrip(trip) {
  const o = {};
  for (const f of FIELDS) o[f] = trip?.[f] ?? null;
  return JSON.stringify(o);
}

function entryContent(e) {
  return JSON.stringify({
    seq: e.seq, trip_id: e.trip_id, action: e.action,
    created_at: e.created_at, actor_user_id: e.actor_user_id ?? null,
    snapshot: e.snapshot, prev_hash: e.prev_hash,
  });
}
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const sign   = h => crypto.createHmac('sha256', ledgerKey()).update(h).digest('hex');

export function ensureLedgerTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS trip_ledger (
    seq          INTEGER PRIMARY KEY,
    trip_id      INTEGER,
    action       TEXT    NOT NULL,
    actor_user_id INTEGER,
    created_at   INTEGER NOT NULL,
    snapshot     TEXT    NOT NULL,
    prev_hash    TEXT    NOT NULL,
    content_hash TEXT    NOT NULL,
    hmac         TEXT    NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_trip_ledger_trip ON trip_ledger(trip_id, seq)');
}

/**
 * Hängt einen signierten Eintrag für eine Fahrt-Änderung an die Kette an.
 * Fehler werden geloggt, aber nie geworfen — eine Ledger-Störung darf die
 * eigentliche Fahrt-Operation nicht abbrechen.
 */
export function recordTripChange(db, tripId, action, actorUserId = null) {
  try {
    ensureLedgerTable(db);
    // Bei 'delete' vor dem Löschen aufrufen, damit der Endzustand erfasst wird.
    const trip = db.prepare('SELECT * FROM trips WHERE id=?').get(tripId);
    const snapshot = canonicalTrip(trip || { id: tripId });
    const last = db.prepare('SELECT hmac, seq FROM trip_ledger ORDER BY seq DESC LIMIT 1').get();
    const prev_hash = last?.hmac || 'GENESIS';
    const seq = (last?.seq || 0) + 1;
    const created_at = Math.floor(Date.now() / 1000);
    const content_hash = sha256(entryContent({ seq, trip_id: tripId, action, created_at, actor_user_id: actorUserId, snapshot, prev_hash }));
    const hmac = sign(content_hash);
    db.prepare(
      `INSERT INTO trip_ledger (seq, trip_id, action, actor_user_id, created_at, snapshot, prev_hash, content_hash, hmac)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(seq, tripId, action, actorUserId, created_at, snapshot, prev_hash, content_hash, hmac);
    return true;
  } catch (e) {
    console.error('[TripLedger] Eintrag fehlgeschlagen:', e.message);
    return false;
  }
}

/**
 * Prüft die gesamte Kette: für jeden Eintrag content_hash + HMAC neu berechnen
 * und die Verkettung (prev_hash == HMAC des Vorgängers) validieren.
 * @returns {{ ok:boolean, total:number, first_break?:object, first?:number, last?:number }}
 */
export function verifyChain(db) {
  ensureLedgerTable(db);
  const rows = db.prepare('SELECT * FROM trip_ledger ORDER BY seq ASC').all();
  let prev = 'GENESIS';
  for (const r of rows) {
    const ch = sha256(entryContent(r));
    if (r.prev_hash !== prev)      return { ok: false, total: rows.length, first_break: { seq: r.seq, reason: 'prev_hash', trip_id: r.trip_id } };
    if (ch !== r.content_hash)     return { ok: false, total: rows.length, first_break: { seq: r.seq, reason: 'content_hash', trip_id: r.trip_id } };
    if (sign(ch) !== r.hmac)       return { ok: false, total: rows.length, first_break: { seq: r.seq, reason: 'hmac', trip_id: r.trip_id } };
    prev = r.hmac;
  }
  return { ok: true, total: rows.length, first: rows[0]?.created_at ?? null, last: rows.at(-1)?.created_at ?? null };
}

/** Änderungshistorie einer einzelnen Fahrt (chronologisch). */
export function tripHistory(db, tripId) {
  ensureLedgerTable(db);
  return db.prepare(
    'SELECT seq, action, actor_user_id, created_at, content_hash FROM trip_ledger WHERE trip_id=? ORDER BY seq ASC'
  ).all(tripId);
}

/**
 * Einmaliger Genesis-Backfill: legt für alle bestehenden Fahrten einen
 * Basis-Eintrag an, damit die Kette lückenlos beim aktuellen Datenstand
 * beginnt. Idempotent über den Marker `ledger.genesis_done`.
 */
export function backfillGenesis(db) {
  try {
    ensureLedgerTable(db);
    const done = db.prepare("SELECT value FROM tenant_settings WHERE key='ledger.genesis_done'").get();
    if (done?.value === '1') return;
    const trips = db.prepare('SELECT id FROM trips ORDER BY id ASC').all();
    const tx = db.transaction(() => {
      for (const t of trips) recordTripChange(db, t.id, 'genesis', null);
      db.prepare(
        "INSERT INTO tenant_settings (key,value) VALUES ('ledger.genesis_done','1') ON CONFLICT(key) DO UPDATE SET value='1'"
      ).run();
    });
    tx();
  } catch (e) {
    console.error('[TripLedger] Genesis-Backfill fehlgeschlagen:', e.message);
  }
}
