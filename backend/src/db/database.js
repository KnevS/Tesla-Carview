// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { LEGAL_DEFAULTS, LEGAL_SCOPES, LEGAL_LOCALES } from './legalDefaults.js';
import { encrypt, isEncrypted } from '../services/cryptoService.js';
import { generatePseudonym } from '../services/pseudonymService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR   = process.env.DATA_DIR   || './data';
const TENANTS_DIR = join(DATA_DIR, 'tenants');

let masterDb = null;
const tenantConnections = new Map();

function ensureDirs() {
  mkdirSync(DATA_DIR,    { recursive: true });
  mkdirSync(TENANTS_DIR, { recursive: true });
}

export function getMasterDb() {
  if (!masterDb) {
    ensureDirs();
    masterDb = new Database(join(DATA_DIR, 'master.db'));
    masterDb.pragma('journal_mode = WAL');
    masterDb.pragma('foreign_keys = ON');
  }
  return masterDb;
}

export function getDb(tenantId) {
  if (!tenantId) throw new Error('tenantId erforderlich');
  if (tenantConnections.has(tenantId)) return tenantConnections.get(tenantId);

  const tenant = getMasterDb().prepare('SELECT * FROM tenants WHERE id=?').get(tenantId);
  if (!tenant) throw new Error(`Mandant nicht gefunden: ${tenantId}`);

  const db = new Database(tenant.db_path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  tenantConnections.set(tenantId, db);
  return db;
}

export function getAllTenants() {
  return getMasterDb().prepare('SELECT * FROM tenants ORDER BY created_at').all();
}

export function getTenantBySlug(slug) {
  return getMasterDb().prepare('SELECT * FROM tenants WHERE slug=?').get(slug) ?? null;
}

/** Sucht ueber das nach aussen sichtbare Pseudonym (Login-Identifier). */
export function getTenantByPseudonym(pseudonym) {
  return getMasterDb().prepare('SELECT * FROM tenants WHERE pseudonym=?').get(pseudonym) ?? null;
}

export function getTenantById(id) {
  return getMasterDb().prepare('SELECT * FROM tenants WHERE id=?').get(id) ?? null;
}

export function getTenantByVin(vin) {
  return getMasterDb().prepare(
    'SELECT t.* FROM tenants t JOIN vin_registry v ON v.tenant_id=t.id WHERE v.vin=?'
  ).get(vin) ?? null;
}

export function registerVin(vin, tenantId) {
  getMasterDb().prepare(
    'INSERT OR REPLACE INTO vin_registry (vin, tenant_id) VALUES (?, ?)'
  ).run(vin, tenantId);
}

export function setTenantStatus(id, status) {
  const suspendedAt = status === 'suspended' ? Math.floor(Date.now() / 1000) : null;
  getMasterDb().prepare(
    'UPDATE tenants SET status=?, suspended_at=? WHERE id=?'
  ).run(status, suspendedAt, id);
}

export function renameTenant(id, name) {
  getMasterDb().prepare('UPDATE tenants SET name=? WHERE id=?').run(name, id);
}

export function closeTenantConnection(id) {
  const db = tenantConnections.get(id);
  if (db) { try { db.close(); } catch { /* ignore */ } }
  tenantConnections.delete(id);
}

export function dropTenant(id) {
  const master = getMasterDb();
  closeTenantConnection(id);
  // ON DELETE CASCADE räumt vin_registry + refresh_tokens auf
  master.prepare('DELETE FROM tenants WHERE id=?').run(id);
}

/** Stellt sicher, dass es einen Demo-Mandanten gibt — idempotent.
 *  Wird beim Backend-Start aufgerufen, wenn DEMO_ENABLED=true. */
export function ensureDemoTenant() {
  const master = getMasterDb();
  const existing = master.prepare(
    "SELECT id FROM tenants WHERE is_demo = 1 LIMIT 1"
  ).get();
  if (existing) return existing.id;
  const id = createTenant('demo', 'Demo-Sandbox');
  master.prepare('UPDATE tenants SET is_demo = 1 WHERE id = ?').run(id);
  console.log('[Demo] Demo-Mandant angelegt — slug=demo, id=', id);
  return id;
}

export function createTenant(slug, name) {
  ensureDirs();
  const id     = randomUUID();
  const dbPath = join(TENANTS_DIR, `${id}.db`);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  runTenantMigrations(db);

  // Pseudonym beim Anlegen: einmalig generieren, kollisionsfrei gegen
  // alle bestehenden Mandanten. Wird auf der Login-Seite statt des
  // Klarnamens angezeigt.
  const taken = getMasterDb().prepare(
    'SELECT pseudonym FROM tenants WHERE pseudonym IS NOT NULL'
  ).all().map(r => r.pseudonym);
  const pseudonym = generatePseudonym({ taken });

  getMasterDb().prepare(
    'INSERT INTO tenants (id, slug, name, db_path, pseudonym) VALUES (?, ?, ?, ?, ?)'
  ).run(id, slug, name, dbPath, pseudonym);

  tenantConnections.set(id, db);
  console.log(`[DB] Mandant erstellt: "${name}" (${slug}, Pseudonym: ${pseudonym}) → ${dbPath}`);
  return id;
}

/** Erzeugt ein neues Pseudonym fuer einen Mandanten, archiviert das alte
 *  in `pseudonym_history`. Aufrufer muessen Admin-Berechtigung pruefen
 *  (passiert in routes/system.js). Liefert { previous, current, history }. */
export function regenerateTenantPseudonym(tenantId) {
  const master = getMasterDb();
  const t = master.prepare('SELECT pseudonym, pseudonym_history FROM tenants WHERE id=?').get(tenantId);
  if (!t) throw new Error('Mandant nicht gefunden');
  const history = (() => { try { return JSON.parse(t.pseudonym_history || '[]'); } catch { return []; } })();
  if (t.pseudonym) history.push(t.pseudonym);
  const taken = master.prepare(
    'SELECT pseudonym FROM tenants WHERE pseudonym IS NOT NULL AND id != ?'
  ).all(tenantId).map(r => r.pseudonym);
  const next = generatePseudonym({ taken, history });
  master.prepare(
    'UPDATE tenants SET pseudonym = ?, pseudonym_history = ? WHERE id = ?'
  ).run(next, JSON.stringify(history), tenantId);
  return { previous: t.pseudonym, current: next, history };
}

function runMasterMigrations(master) {
  const cols = master.prepare('PRAGMA table_info(tenants)').all().map(c => c.name);
  if (!cols.includes('status')) {
    master.exec("ALTER TABLE tenants ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
  }
  if (!cols.includes('suspended_at')) {
    master.exec('ALTER TABLE tenants ADD COLUMN suspended_at INTEGER');
  }
  // is_demo: kennzeichnet einen Mandanten als Demo-/Sandbox-Mandant.
  // Die Demo-Routen verwenden ausschliesslich diesen Mandanten; alle
  // anderen sind unberuehrt. Wird beim Demo-Setup auf 1 gesetzt.
  if (!cols.includes('is_demo')) {
    master.exec('ALTER TABLE tenants ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0');
  }
  // Datenschutz-Layer: Pseudonyme statt Klarnamen auf der Login-Seite.
  // pseudonym ist der aktuell sichtbare Identifier (z.B. „brave-eagle"),
  // pseudonym_history sammelt frueher vergebene Namen — damit das
  // Re-Generate-Feature nicht zufaellig auf einen alten Namen zurueck-
  // springt und der Admin spaeter rekonstruieren kann, unter welchem
  // Pseudonym sein Mandant frueher gelistet war.
  if (!cols.includes('pseudonym')) {
    master.exec('ALTER TABLE tenants ADD COLUMN pseudonym TEXT');
  }
  if (!cols.includes('pseudonym_history')) {
    master.exec("ALTER TABLE tenants ADD COLUMN pseudonym_history TEXT NOT NULL DEFAULT '[]'");
  }
  // Backfill: bestehende Mandanten ohne Pseudonym bekommen einen.
  // Idempotent — laeuft nur fuer Reihen mit NULL.
  const taken = master.prepare(
    'SELECT pseudonym FROM tenants WHERE pseudonym IS NOT NULL'
  ).all().map(r => r.pseudonym);
  const missing = master.prepare('SELECT id FROM tenants WHERE pseudonym IS NULL').all();
  if (missing.length) {
    const upd = master.prepare('UPDATE tenants SET pseudonym = ? WHERE id = ?');
    for (const t of missing) {
      const p = generatePseudonym({ taken });
      taken.push(p);
      upd.run(p, t.id);
    }
    console.log(`[pseudonym] ${missing.length} bestehende(r) Mandant(en) bekamen einen Login-Pseudonym`);
  }

  // OwnTracks-Validation (v3.11.0): nur Daten aufnehmen wenn das Phone
  // wirklich im Tesla ist und es pro Trip nur EIN aktives Device gibt.
  const otCols = master.prepare('PRAGMA table_info(owntracks_devices)').all().map(c => c.name);
  if (!otCols.includes('bluetooth_pairing_name')) {
    master.exec('ALTER TABLE owntracks_devices ADD COLUMN bluetooth_pairing_name TEXT');
  }
  if (!otCols.includes('in_vehicle')) {
    master.exec('ALTER TABLE owntracks_devices ADD COLUMN in_vehicle INTEGER NOT NULL DEFAULT 0');
  }
  if (!otCols.includes('in_vehicle_since')) {
    master.exec('ALTER TABLE owntracks_devices ADD COLUMN in_vehicle_since INTEGER');
  }
  if (!otCols.includes('active_paused')) {
    master.exec('ALTER TABLE owntracks_devices ADD COLUMN active_paused INTEGER NOT NULL DEFAULT 0');
  }
  // v3.14.0: Bluetooth-Setup-Marker — wird beim allerersten in-vehicle/start
  // gesetzt und bleibt für immer. Sobald gesetzt, gilt strikte Validierung
  // (Trips nur bei in_vehicle=1). Ohne Marker = Legacy-Modus ohne Filter.
  if (!otCols.includes('bluetooth_first_seen_at')) {
    master.exec('ALTER TABLE owntracks_devices ADD COLUMN bluetooth_first_seen_at INTEGER');
  }
}

/**
 * Schreibt initiale Default-Inhalte für /legal/{imprint,privacy,terms} in
 * `legal_content`. INSERT OR IGNORE: bestehende Admin-Bearbeitungen werden
 * nie überschrieben. Beim allerersten Start sieht ein Admin Platzhalter
 * (`<<NAME>>`, `<<EMAIL>>` …); das Frontend warnt, solange welche im aktiven
 * Inhalt stehen.
 */
function seedLegalDefaults(master) {
  const stmt = master.prepare(
    'INSERT OR IGNORE INTO legal_content (scope, locale, version, body_md) VALUES (?, ?, 1, ?)'
  );
  for (const scope of LEGAL_SCOPES) {
    for (const locale of LEGAL_LOCALES) {
      const body = LEGAL_DEFAULTS[scope]?.[locale];
      if (body) stmt.run(scope, locale, body);
    }
  }
}

export function initMasterDb() {
  ensureDirs();
  const master = getMasterDb();
  master.exec(readFileSync(join(__dirname, 'master-schema.sql'), 'utf8'));
  runMasterMigrations(master);
  seedLegalDefaults(master);

  const tenantCount = master.prepare('SELECT COUNT(*) as n FROM tenants').get().n;
  const legacyPath  = process.env.DB_PATH || join(DATA_DIR, 'tesla-carview.db');

  if (tenantCount === 0 && existsSync(legacyPath)) {
    const id      = randomUUID();
    const newPath = join(TENANTS_DIR, `${id}.db`);
    copyFileSync(legacyPath, newPath);

    const tdb = new Database(newPath);
    tdb.pragma('journal_mode = WAL');
    tdb.pragma('foreign_keys = ON');
    runTenantMigrations(tdb);
    migrateLegacyTokens(master, tdb, id);

    master.prepare(
      'INSERT INTO tenants (id, slug, name, db_path) VALUES (?, ?, ?, ?)'
    ).run(id, 'default', 'Default', newPath);

    const vins = tdb.prepare('SELECT vin FROM vehicles WHERE vin IS NOT NULL').all();
    const vinStmt = master.prepare('INSERT OR IGNORE INTO vin_registry (vin, tenant_id) VALUES (?, ?)');
    for (const { vin } of vins) vinStmt.run(vin, id);

    tenantConnections.set(id, tdb);
    console.log(`[DB] Legacy-DB als Mandant "default" migriert (${id})`);
  }

  const tenants = master.prepare('SELECT * FROM tenants').all();
  for (const t of tenants) {
    if (!tenantConnections.has(t.id)) {
      const db = new Database(t.db_path);
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      runTenantMigrations(db);
      tenantConnections.set(t.id, db);
    }
  }

  // Einmalige At-Rest-Encryption-Migration: alte Klartext-Reihen in
  // tokens / users.mfa_secret / virtual_key.private_key_pem auf das
  // verschluesselte v1:-Format heben. Idempotent — Reihen die bereits
  // v1: tragen werden uebersprungen.
  encryptionMigration(tenants);

  console.log(`[DB] Master-DB initialisiert (${tenants.length} Mandant(en))`);
}

/**
 * Verschluesselt vorhandene Klartext-Reihen sensibler Felder in den
 * Tenant-DBs. Laeuft beim Backend-Start. Reihen, die bereits das v1:-
 * Prefix tragen (durch frueheren Lauf oder durch laufende Writes),
 * werden uebersprungen — die Migration ist also idempotent.
 *
 * Fehler werden geloggt, brechen den Start aber nicht ab — die Read-
 * Side ist tolerant gegenueber Klartext-Legacy, der Service laeuft
 * weiter (nur mit reduzierter At-Rest-Sicherheit fuer die nicht-
 * migrierten Reihen, die beim naechsten Write automatisch upgegradet
 * werden).
 */
function encryptionMigration(tenants) {
  const FIELDS = [
    { table: 'tokens',      cols: ['access_token', 'refresh_token'] },
    { table: 'users',       cols: ['mfa_secret'] },
    { table: 'virtual_key', cols: ['private_key_pem'] },
  ];
  let totalUpgraded = 0;
  for (const t of tenants) {
    const db = tenantConnections.get(t.id);
    if (!db) continue;
    for (const { table, cols } of FIELDS) {
      const tableExists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
      ).get(table);
      if (!tableExists) continue;
      try {
        const colList = cols.join(', ');
        const rows = db.prepare(`SELECT id, ${colList} FROM ${table}`).all();
        for (const row of rows) {
          const updates = [];
          const values  = [];
          for (const col of cols) {
            const val = row[col];
            if (val && typeof val === 'string' && !isEncrypted(val)) {
              updates.push(`${col} = ?`);
              values.push(encrypt(val));
            }
          }
          if (updates.length) {
            values.push(row.id);
            db.prepare(`UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?`).run(...values);
            totalUpgraded++;
          }
        }
      } catch (err) {
        console.error(`[crypto-migration] ${t.slug}/${table}:`, err.message);
      }
    }
  }
  if (totalUpgraded) {
    console.log(`[crypto-migration] ${totalUpgraded} Reihe(n) auf v1: verschluesselt`);
  }
}

function migrateLegacyTokens(master, tdb, tenantId) {
  try {
    const tokens = tdb.prepare('SELECT * FROM refresh_tokens WHERE expires_at > unixepoch()').all();
    const ins = master.prepare(
      `INSERT OR IGNORE INTO refresh_tokens
       (tenant_id, user_id, token_hash, expires_at, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const t of tokens) {
      ins.run(tenantId, t.user_id, t.token_hash, t.expires_at, t.ip_address, t.user_agent, t.created_at);
    }
  } catch { /* ignore if table missing */ }
}

function runTenantMigrations(db) {
  const col = (tbl) => db.prepare(`PRAGMA table_info(${tbl})`).all().map(c => c.name);

  // users: email, lang
  const uCols = col('users');
  if (!uCols.includes('email')) {
    db.exec('ALTER TABLE users ADD COLUMN email TEXT');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL');
  }
  if (!uCols.includes('lang')) {
    db.exec("ALTER TABLE users ADD COLUMN lang TEXT DEFAULT 'de'");
  }
  if (!uCols.includes('preferences')) {
    db.exec('ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT NULL');
  }

  // trips
  const tCols = col('trips');
  if (!tCols.includes('start_odometer_km')) {
    db.exec('ALTER TABLE trips ADD COLUMN start_odometer_km REAL');
    db.exec('ALTER TABLE trips ADD COLUMN end_odometer_km REAL');
    db.exec("ALTER TABLE trips ADD COLUMN source TEXT DEFAULT 'odometer'");
  }
  if (!tCols.includes('trip_type')) {
    db.exec("ALTER TABLE trips ADD COLUMN trip_type TEXT NOT NULL DEFAULT 'private'");
    db.exec('ALTER TABLE trips ADD COLUMN purpose TEXT');
  }
  if (!tCols.includes('driver_id')) {
    db.exec('ALTER TABLE trips ADD COLUMN driver_id INTEGER');
  }
  // Aussen-Temperatur pro Trip (Wert bei Trip-Ende aus
  // climate_state.outside_temp). Grundlage fuer die spaetere
  // Reichweiten-Realismus-pro-Wetter-Auswertung (Verbrauch vs.
  // Temperatur-Buckets). Aufbau-Phase: nur Daten kapturen, UI folgt
  // separat nach dem i18n-Refactor in Battery.vue.
  if (!tCols.includes('outside_temp_avg_c')) {
    db.exec('ALTER TABLE trips ADD COLUMN outside_temp_avg_c REAL');
  }
  // BMF-Pflichtangaben fuers elektronische Fahrtenbuch:
  //   business_partner: bei Dienstfahrten der aufgesuchte Geschaeftspartner
  //   locked_at:        wenn ans Finanzamt exportiert → keine Aenderung mehr
  //   exported_at:      letzter Finanzamt-PDF-Export
  //   is_manual:        1 wenn manuell eingegeben (kein Tesla-Auto-Trip)
  if (!tCols.includes('business_partner')) {
    db.exec('ALTER TABLE trips ADD COLUMN business_partner TEXT');
    db.exec('ALTER TABLE trips ADD COLUMN locked_at INTEGER');
    db.exec('ALTER TABLE trips ADD COLUMN exported_at INTEGER');
    db.exec('ALTER TABLE trips ADD COLUMN is_manual INTEGER NOT NULL DEFAULT 0');
  }
  // Aenderungshistorie pro Trip — BMF verlangt, dass nachtraegliche
  // Aenderungen dokumentiert werden („technisch ausgeschlossen oder
  // dokumentiert"). Wir loggen field/old/new + user + timestamp.
  db.exec(`CREATE TABLE IF NOT EXISTS trip_changes (
    id INTEGER PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    changed_by_user_id INTEGER,
    changed_at INTEGER DEFAULT (unixepoch()),
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT
  )`);

  // drivers
  db.exec(`CREATE TABLE IF NOT EXISTS drivers (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    color      TEXT DEFAULT '#6b7280',
    is_default INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  )`);

  // vehicles
  const vCols = col('vehicles');
  if (!vCols.includes('category')) {
    db.exec("ALTER TABLE vehicles ADD COLUMN category TEXT NOT NULL DEFAULT 'private'");
    db.exec('ALTER TABLE vehicles ADD COLUMN company_name TEXT');
    db.exec('ALTER TABLE vehicles ADD COLUMN electricity_rate_kwh REAL DEFAULT 0.30');
    db.exec('ALTER TABLE vehicles ADD COLUMN monta_api_key TEXT');
    db.exec('ALTER TABLE vehicles ADD COLUMN monta_charge_point_id TEXT');
  }
  if (!vCols.includes('monta_client_id')) {
    db.exec('ALTER TABLE vehicles ADD COLUMN monta_client_id TEXT');
  }
  // OwnTracks-Trip-Lock (v3.11.0): pro Fahrzeug nur ein Device aktiv
  if (!vCols.includes('active_trip_owntracks_device_id')) {
    db.exec('ALTER TABLE vehicles ADD COLUMN active_trip_owntracks_device_id INTEGER');
    db.exec('ALTER TABLE vehicles ADD COLUMN active_trip_locked_until INTEGER');
  }

  if (!vCols.includes('abrp_token')) {
    db.exec('ALTER TABLE vehicles ADD COLUMN abrp_token TEXT');
  }
  // state_updated_at + odometer_km direkt auf vehicles — der Poller
  // pflegt beides bei jedem Tesla-API-Call. odometer_km wird zusaetzlich
  // im JOIN von service-intervals (Faelligkeit nach km) gebraucht; ohne
  // die Spalte wirft die Route 500 „no such column: v.odometer_km".
  const vehiclesCols = col('vehicles');
  if (!vehiclesCols.includes('state_updated_at')) {
    db.exec('ALTER TABLE vehicles ADD COLUMN state_updated_at INTEGER');
  }
  if (!vehiclesCols.includes('odometer_km')) {
    db.exec('ALTER TABLE vehicles ADD COLUMN odometer_km REAL');
  }
  // option_codes: vollstaendige Liste der Tesla-Werks-Optionen
  // (Komma-getrennt, z.B. „MDLY,PPSW,W41B,IPMB,SC04,SLR1,…"). Werden
  // aus vehicle_state.option_codes vom Tesla-Endpoint gezogen und
  // an die Compositor-URL gehaengt, damit das Vorschaubild Farbe,
  // Felgen, Spoiler, Trim und Innenraum exakt deines Autos zeigt
  // statt nur Modell + Farbe wie vorher.
  // wheel_type / exterior_color / trim_badging / spoiler_type kommen
  // aus vehicle_config — als getrennte Felder fuer manuelle Edits
  // und als Fallback, falls option_codes mal nicht geliefert wird.
  if (!vehiclesCols.includes('option_codes')) {
    db.exec('ALTER TABLE vehicles ADD COLUMN option_codes TEXT');
  }
  if (!vehiclesCols.includes('wheel_type')) {
    db.exec('ALTER TABLE vehicles ADD COLUMN wheel_type TEXT');
  }
  if (!vehiclesCols.includes('exterior_color')) {
    db.exec('ALTER TABLE vehicles ADD COLUMN exterior_color TEXT');
  }
  if (!vehiclesCols.includes('trim_badging')) {
    db.exec('ALTER TABLE vehicles ADD COLUMN trim_badging TEXT');
  }
  if (!vehiclesCols.includes('spoiler_type')) {
    db.exec('ALTER TABLE vehicles ADD COLUMN spoiler_type TEXT');
  }
  // Fleet-Telemetry pro VIN: wann hat die App den configure-Call
  // erfolgreich abgesetzt? Wann kam das letzte gestreamte Signal
  // an? Beides treibt den Status-Indikator in der Settings-Karte
  // (gruen=streamt aktiv, gelb=registriert aber kein Signal, rot=
  // nicht registriert, grau=Approval-fehlt-Hinweis).
  if (!vehiclesCols.includes('telemetry_configured_at')) {
    db.exec('ALTER TABLE vehicles ADD COLUMN telemetry_configured_at INTEGER');
  }
  if (!vehiclesCols.includes('telemetry_last_signal_at')) {
    db.exec('ALTER TABLE vehicles ADD COLUMN telemetry_last_signal_at INTEGER');
  }
  if (!vehiclesCols.includes('telemetry_last_error')) {
    db.exec('ALTER TABLE vehicles ADD COLUMN telemetry_last_error TEXT');
  }

  // TCO-Stammdaten: Anschaffung, Versicherung, Steuer, Verkauf.
  // Werden vom Admin im TCO-Cockpit gepflegt — nicht vom Poller.
  // Alle in EUR; NULL = unbekannt (TCO-Berechnung blendet Posten aus).
  if (!vehiclesCols.includes('purchase_price_eur')) {
    db.exec('ALTER TABLE vehicles ADD COLUMN purchase_price_eur REAL');
    db.exec('ALTER TABLE vehicles ADD COLUMN purchase_date INTEGER');  // unix seconds
    db.exec('ALTER TABLE vehicles ADD COLUMN sale_price_eur REAL');
    db.exec('ALTER TABLE vehicles ADD COLUMN sale_date INTEGER');
    db.exec('ALTER TABLE vehicles ADD COLUMN insurance_eur_year REAL');
    db.exec('ALTER TABLE vehicles ADD COLUMN tax_eur_year REAL');
    db.exec('ALTER TABLE vehicles ADD COLUMN initial_odometer_km REAL');
  }

  // Service-/Reparatur-/Reifen-Records mit Einzelkosten.
  // Liefert die Detail-Aufschluesselung im TCO-Cockpit und kann beim
  // Anlegen optional einen `service_intervals.last_done_*`-Update triggern
  // (wird vom Frontend explizit gesetzt — kein automatisches Verknuepfen).
  db.exec(`CREATE TABLE IF NOT EXISTS service_records (
    id           INTEGER PRIMARY KEY,
    vehicle_id   INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    performed_at INTEGER NOT NULL,
    odometer_km  REAL,
    category     TEXT NOT NULL CHECK(category IN ('service','tires','repair','inspection','tuv','accessories','other')),
    label        TEXT NOT NULL,
    cost_eur     REAL NOT NULL,
    vendor       TEXT,
    notes        TEXT,
    created_at   INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_service_records_vehicle ON service_records(vehicle_id, performed_at DESC)');

  // Geofences pro Mandant: definiert Home/Work-Standorte, anhand derer
  // neue Trips automatisch als Privat / Arbeitsweg / Dienst klassifiziert
  // werden. radius_m default 200 m — kleiner Polygon-Ersatz, fuer einen
  // Self-Hosting-Use-Case mehr als ausreichend (Polygone wuerden einen
  // Map-Editor brauchen, der hier nicht den Komplexitaets-Aufwand wert ist).
  db.exec(`CREATE TABLE IF NOT EXISTS geofences (
    id          INTEGER PRIMARY KEY,
    vehicle_id  INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK(kind IN ('home','work','other')),
    name        TEXT NOT NULL,
    lat         REAL NOT NULL,
    lon         REAL NOT NULL,
    radius_m    INTEGER NOT NULL DEFAULT 200,
    created_at  INTEGER DEFAULT (unixepoch())
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_geofences_vehicle ON geofences(vehicle_id)');

  // charging_sessions
  const csCols = col('charging_sessions');
  if (!csCols.includes('location_id')) {
    db.exec('ALTER TABLE charging_sessions ADD COLUMN location_id INTEGER');
    db.exec('ALTER TABLE charging_sessions ADD COLUMN energy_kwh_mid REAL');
    db.exec('ALTER TABLE charging_sessions ADD COLUMN billing_rate_kwh REAL');
    db.exec('ALTER TABLE charging_sessions ADD COLUMN monta_session_id TEXT');
    db.exec("ALTER TABLE charging_sessions ADD COLUMN billing_status TEXT DEFAULT 'pending'");
  }
  if (!csCols.includes('is_free')) {
    db.exec('ALTER TABLE charging_sessions ADD COLUMN is_free INTEGER NOT NULL DEFAULT 0');
  }
  // is_home_charged: explizites Flag „an der Heim-Wallbox geladen".
  // Wird von der Monta-Synchronisation gesetzt, wenn der konfigurierte
  // home charge point matcht — und kann auch manuell ueber die UI
  // gesetzt werden. Vorteile gegenueber „location_id auf home zeigen":
  // bleibt erhalten, wenn der Admin den Heim-Ort spaeter umbenennt
  // oder der location_id-Link sich anders aendert.
  if (!csCols.includes('is_home_charged')) {
    db.exec('ALTER TABLE charging_sessions ADD COLUMN is_home_charged INTEGER NOT NULL DEFAULT 0');
  }

  // charging_locations (mit lat/lon/radius)
  db.exec(`CREATE TABLE IF NOT EXISTS charging_locations (
    id         INTEGER PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    address    TEXT,
    type       TEXT NOT NULL DEFAULT 'home',
    rate_kwh   REAL,
    is_default INTEGER DEFAULT 0,
    lat        REAL,
    lon        REAL,
    radius_m   INTEGER DEFAULT 200,
    created_at INTEGER DEFAULT (unixepoch())
  )`);
  const clCols = col('charging_locations');
  if (!clCols.includes('lat'))      db.exec('ALTER TABLE charging_locations ADD COLUMN lat REAL');
  if (!clCols.includes('lon'))      db.exec('ALTER TABLE charging_locations ADD COLUMN lon REAL');
  if (!clCols.includes('radius_m')) db.exec('ALTER TABLE charging_locations ADD COLUMN radius_m INTEGER DEFAULT 200');
  // Location-Aktionen (v3.12.0): Charge-Limit pro Ladeort
  if (!clCols.includes('default_charge_limit')) {
    db.exec('ALTER TABLE charging_locations ADD COLUMN default_charge_limit INTEGER');
  }

  // vehicle_users
  db.exec(`CREATE TABLE IF NOT EXISTS vehicle_users (
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    PRIMARY KEY (vehicle_id, user_id)
  )`);

  // tenant_settings
  db.exec(`CREATE TABLE IF NOT EXISTS tenant_settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  )`);

  // tesla_api_usage – Zähler je Monat × Kategorie × Endpoint
  db.exec(`CREATE TABLE IF NOT EXISTS tesla_api_usage (
    id              INTEGER PRIMARY KEY,
    period          TEXT    NOT NULL,            -- "YYYY-MM"
    category        TEXT    NOT NULL,            -- vehicle_data | wake | command | streaming_signal | other
    endpoint        TEXT    NOT NULL,            -- z. B. "GET /api/1/vehicles/:id/vehicle_data"
    count           INTEGER NOT NULL DEFAULT 0,
    cost_usd        REAL    NOT NULL DEFAULT 0,
    last_call_at    INTEGER,
    UNIQUE (period, category, endpoint)
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_tesla_usage_period ON tesla_api_usage(period)');

  // tesla_usage_events – aus Tesla-Validierungs-Mails (Webhook)
  db.exec(`CREATE TABLE IF NOT EXISTS tesla_usage_events (
    id           INTEGER PRIMARY KEY,
    received_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    subject      TEXT,
    period       TEXT,
    spend_usd    REAL,
    threshold    TEXT,
    raw_body     TEXT
  )`);

  // Default-Tarife & Limit – Tesla 2024er Preisliste (USD); Admin kann anpassen
  const seed = (k, v) => db.prepare(
    'INSERT OR IGNORE INTO tenant_settings (key, value) VALUES (?, ?)'
  ).run(k, v);
  seed('tesla_usage.currency',           'USD');
  seed('tesla_usage.monthly_limit_usd',  '50');
  seed('tesla_usage.free_credit_usd',    '10');
  seed('tesla_usage.hard_stop_enabled',  '0');
  seed('tesla_usage.hard_stop_pct',      '90');
  seed('tesla_usage.rate_vehicle_data',  '0.005');
  seed('tesla_usage.rate_wake',          '0.005');
  seed('tesla_usage.rate_command',       '0.005');
  seed('tesla_usage.rate_streaming_signal','0.000005');
  seed('tesla_usage.rate_other',         '0.005');

  // i18n – Mandanten-Standard-Sprache (User-Profil-Auswahl überschreibt sie)
  seed('i18n.default_locale',            'de');

  // billing_periods
  db.exec(`CREATE TABLE IF NOT EXISTS billing_periods (
    id           INTEGER PRIMARY KEY,
    vehicle_id   INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    period_start INTEGER NOT NULL,
    period_end   INTEGER NOT NULL,
    total_kwh    REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    rate_kwh     REAL,
    status       TEXT DEFAULT 'draft',
    notes        TEXT,
    created_at   INTEGER DEFAULT (unixepoch())
  )`);

  // oauth_pkce (lokal, wird auch in master gepflegt)
  db.exec(`CREATE TABLE IF NOT EXISTS oauth_pkce (
    state         TEXT PRIMARY KEY,
    code_verifier TEXT NOT NULL,
    created_at    INTEGER DEFAULT (unixepoch())
  )`);

  // legal_acceptance — DSGVO-Nachweis: wer hat welche Version von Privacy/Terms
  // wann akzeptiert? Wir behalten alle Versionen (UNIQUE statt PRIMARY KEY auf
  // user/scope/version), damit eine Akzept-Historie auditierbar bleibt.
  db.exec(`CREATE TABLE IF NOT EXISTS legal_acceptance (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope       TEXT    NOT NULL,
    version     INTEGER NOT NULL,
    accepted_at INTEGER NOT NULL DEFAULT (unixepoch()),
    ip_address  TEXT,
    user_agent  TEXT,
    UNIQUE (user_id, scope, version)
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_legal_acceptance_user ON legal_acceptance(user_id)');

  // Feinkoernige Permissions auf User-Ebene (zusaetzlich zur Rolle).
  // - mfa_required:       Pflicht-MFA-Setup nach erstem Login (per Default
  //                        fuer alle neu eingeladenen non-admin-User gesetzt).
  // - can_edit_vehicles:  darf Fahrzeug-Grunddaten bearbeiten (sonst nur Admin).
  // - can_add_vehicles:   darf neue Fahrzeuge hinzufuegen / per Tesla-Sync
  //                        importieren (sonst nur Admin).
  const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!userCols.includes('mfa_required')) {
    db.exec("ALTER TABLE users ADD COLUMN mfa_required INTEGER NOT NULL DEFAULT 0");
  }
  if (!userCols.includes('can_edit_vehicles')) {
    db.exec("ALTER TABLE users ADD COLUMN can_edit_vehicles INTEGER NOT NULL DEFAULT 0");
  }
  if (!userCols.includes('can_add_vehicles')) {
    db.exec("ALTER TABLE users ADD COLUMN can_add_vehicles INTEGER NOT NULL DEFAULT 0");
  }

  // user_invites — Admin laed neue User in den eigenen Mandanten ein.
  // Token-basierter Selbstregistrierungs-Link, einmalig verwendbar.
  db.exec(`CREATE TABLE IF NOT EXISTS user_invites (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    token               TEXT NOT NULL UNIQUE,
    role                TEXT NOT NULL DEFAULT 'user',
    created_by_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at          INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at          INTEGER NOT NULL,
    used_at             INTEGER,
    used_by_user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    note                TEXT,
    display_name        TEXT,
    email               TEXT,
    email_sent_at       INTEGER
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_user_invites_token ON user_invites(token)');

  // Migration: display_name + email + email_sent_at fuer bestehende user_invites
  const inviteCols = col('user_invites');
  if (!inviteCols.includes('display_name')) {
    db.exec('ALTER TABLE user_invites ADD COLUMN display_name TEXT');
  }
  if (!inviteCols.includes('email')) {
    db.exec('ALTER TABLE user_invites ADD COLUMN email TEXT');
  }
  if (!inviteCols.includes('email_sent_at')) {
    db.exec('ALTER TABLE user_invites ADD COLUMN email_sent_at INTEGER');
  }

  // users.expires_at — fuer Demo-Tester, die nach 14 Tagen rueckstandlos
  // geloescht werden. Bleibt fuer Echt-Accounts NULL.
  const usersCols = col('users');
  if (!usersCols.includes('expires_at')) {
    db.exec('ALTER TABLE users ADD COLUMN expires_at INTEGER');
  }

  // logbook_entries: created_by_user_id — wer hat den Eintrag erstellt?
  // Nullable, weil historische Eintraege keinen User kennen. Wir zeigen
  // im UI „— unbekannt —", wenn null.
  const lbCols = col('logbook_entries');
  if (!lbCols.includes('created_by_user_id')) {
    db.exec('ALTER TABLE logbook_entries ADD COLUMN created_by_user_id INTEGER');
  }

  // Wartungsintervalle — pro Fahrzeug definierte Service-/Wartungs-Pflichten
  // mit zeitlichem oder km-Intervall. Liefert dem Dashboard eine
  // „faellig in X Tagen / Y km"-Karte und speist taegliche Push-
  // Erinnerungen. UNIQUE(vehicle_id, kind) verhindert versehentliche
  // Duplikate beim Seeding.
  db.exec(`CREATE TABLE IF NOT EXISTS service_intervals (
    id INTEGER PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    label TEXT NOT NULL,
    interval_months INTEGER,
    interval_km INTEGER,
    last_done_at INTEGER,
    last_done_km REAL,
    snoozed_until INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    notified_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(vehicle_id, kind)
  )`);

  // Outbound-Webhooks pro Mandant. Admin definiert eine Ziel-URL, der
  // Dispatcher schickt einen HMAC-signierten JSON-POST bei
  // trip.completed / charging.completed / service.due. Aufruf bleibt
  // best-effort — ein fehlgeschlagener Webhook darf den auslosenden
  // Flow nicht crashen (siehe services/webhookDispatcher.js).
  db.exec(`CREATE TABLE IF NOT EXISTS webhooks (
    id            INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    url           TEXT NOT NULL,
    secret        TEXT NOT NULL,
    events        TEXT NOT NULL DEFAULT '[]',
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER DEFAULT (unixepoch()),
    last_fired_at INTEGER,
    last_status   INTEGER,
    last_error    TEXT
  )`);

  // Grok-Chat-Tabellen
  db.exec(`CREATE TABLE IF NOT EXISTS grok_chats (
    id          TEXT PRIMARY KEY,
    vehicle_id  INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title       TEXT NOT NULL DEFAULT 'Neuer Chat',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS grok_messages (
    id          TEXT PRIMARY KEY,
    chat_id     TEXT NOT NULL REFERENCES grok_chats(id) ON DELETE CASCADE,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    tokens_in   INTEGER DEFAULT 0,
    tokens_out  INTEGER DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS xai_usage (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    tokens_in   INTEGER NOT NULL DEFAULT 0,
    tokens_out  INTEGER NOT NULL DEFAULT 0,
    cost_ct     REAL NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_grok_chats_vehicle  ON grok_chats(vehicle_id, updated_at DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_grok_messages_chat  ON grok_messages(chat_id, created_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_xai_usage_date      ON xai_usage(date)');

  db.exec(`CREATE TABLE IF NOT EXISTS saved_routes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id       INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    destination_name TEXT NOT NULL,
    destination_lat  REAL NOT NULL,
    destination_lon  REAL NOT NULL,
    waypoints        TEXT NOT NULL DEFAULT '[]',
    created_at       INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at       INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_saved_routes_vehicle ON saved_routes(vehicle_id, created_at DESC)');

  // Migration: neue Spalten für Routenplanung (ALTER TABLE ist idempotent über try-catch)
  for (const sql of [
    "ALTER TABLE saved_routes ADD COLUMN scheduled_date TEXT",
    "ALTER TABLE saved_routes ADD COLUMN departure_time TEXT",
    "ALTER TABLE saved_routes ADD COLUMN auto_send      INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE saved_routes ADD COLUMN notes          TEXT",
    "ALTER TABLE saved_routes ADD COLUMN start_name     TEXT",
    "ALTER TABLE saved_routes ADD COLUMN start_lat      REAL",
    "ALTER TABLE saved_routes ADD COLUMN start_lon      REAL",
  ]) {
    try { db.exec(sql); } catch { /* Spalte existiert bereits */ }
  }

  // Migration: billing_periods.vehicle_id ON DELETE CASCADE nachrüsten.
  // SQLite unterstützt kein ALTER TABLE ADD CONSTRAINT → Tabelle neu anlegen.
  {
    const fkInfo = db.prepare("PRAGMA foreign_key_list(billing_periods)").all();
    const hasCascade = fkInfo.some(fk => fk.table === 'vehicles' && fk.on_delete === 'CASCADE');
    if (!hasCascade) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        BEGIN;
        CREATE TABLE billing_periods_new (
          id           INTEGER PRIMARY KEY,
          vehicle_id   INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
          period_start INTEGER NOT NULL,
          period_end   INTEGER NOT NULL,
          total_kwh    REAL DEFAULT 0,
          total_amount REAL DEFAULT 0,
          rate_kwh     REAL,
          status       TEXT DEFAULT 'draft',
          notes        TEXT,
          created_at   INTEGER DEFAULT (unixepoch())
        );
        INSERT INTO billing_periods_new SELECT * FROM billing_periods;
        DROP TABLE billing_periods;
        ALTER TABLE billing_periods_new RENAME TO billing_periods;
        COMMIT;
        PRAGMA foreign_keys = ON;
      `);
    }
  }

  // Notification Rules (Push-Alarme + Geo-Aktionen)
  db.exec(`CREATE TABLE IF NOT EXISTS notification_rules (
    id               INTEGER PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id       INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    rule_type        TEXT NOT NULL CHECK(rule_type IN ('soc_above','soc_below','geofence_enter','geofence_exit','charging_complete')),
    geofence_id      INTEGER REFERENCES geofences(id) ON DELETE CASCADE,
    threshold        INTEGER,
    action_type      TEXT NOT NULL CHECK(action_type IN ('push_notify','climate_on','climate_off','climate_set_temp')),
    action_param     TEXT,
    enabled          INTEGER NOT NULL DEFAULT 1,
    last_triggered_at INTEGER,
    cooldown_minutes INTEGER NOT NULL DEFAULT 30,
    created_at       INTEGER DEFAULT (unixepoch())
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_notification_rules_vehicle ON notification_rules(vehicle_id, enabled)');

  // Sleep-Monitoring
  db.exec(`CREATE TABLE IF NOT EXISTS vehicle_sleep_events (
    id             INTEGER PRIMARY KEY,
    vehicle_id     INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    sleep_at       INTEGER NOT NULL,
    wake_at        INTEGER,
    soc_at_sleep   INTEGER,
    soc_at_wake    INTEGER,
    drain_pct      INTEGER,
    duration_min   INTEGER,
    created_at     INTEGER DEFAULT (unixepoch())
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_sleep_events_vehicle ON vehicle_sleep_events(vehicle_id, sleep_at DESC)');

  // Software-Update-Tracker: erfasst jede neue Firmware-Version pro Fahrzeug
  db.exec(`CREATE TABLE IF NOT EXISTS firmware_versions (
    id             INTEGER PRIMARY KEY,
    vehicle_id     INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    version        TEXT    NOT NULL,
    detected_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(vehicle_id, version)
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_firmware_vehicle ON firmware_versions(vehicle_id, detected_at DESC)');

  // HVAC-Statistiken: aggregierte Klimaanlagen-/Sitzheizungsnutzung pro Tag
  db.exec(`CREATE TABLE IF NOT EXISTS hvac_daily_stats (
    id             INTEGER PRIMARY KEY,
    vehicle_id     INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    day            TEXT    NOT NULL,   -- YYYY-MM-DD
    climate_on_minutes  INTEGER DEFAULT 0,
    seat_heat_left_on   INTEGER DEFAULT 0,  -- Anzahl Polls mit Sitzheizung links > 0
    seat_heat_right_on  INTEGER DEFAULT 0,
    precondition_count  INTEGER DEFAULT 0,
    max_inside_temp_c   REAL,
    min_outside_temp_c  REAL,
    UNIQUE(vehicle_id, day)
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_hvac_vehicle ON hvac_daily_stats(vehicle_id, day DESC)');

  // Indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_trips_vehicle      ON trips(vehicle_id, start_time DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_charging_vehicle   ON charging_sessions(vehicle_id, start_time DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_battery_vehicle    ON battery_snapshots(vehicle_id, timestamp DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_logbook_vehicle    ON logbook_entries(vehicle_id, entry_date DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_trip_points        ON trip_points(trip_id, timestamp)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_charging_points    ON charging_points(session_id, timestamp)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs         ON audit_logs(user_id, created_at DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle  ON telemetry_points(vehicle_id, timestamp DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_telemetry_trip     ON telemetry_points(trip_id, timestamp)');

  // Companion Phase 2: Anomalien-Persistenz
  db.exec(`CREATE TABLE IF NOT EXISTS battery_anomalies (
    id INTEGER PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
    hash TEXT NOT NULL,
    type TEXT NOT NULL,
    occurred_at INTEGER NOT NULL,
    detected_at INTEGER NOT NULL DEFAULT (unixepoch()),
    details_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    notified_at INTEGER,
    seen_at INTEGER,
    dismissed_at INTEGER,
    UNIQUE(vehicle_id, hash)
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_battery_anomalies_vehicle ON battery_anomalies(vehicle_id, occurred_at DESC)');

  // Companion Phase 2: Vorklimatisierungs-Empfehlungen
  db.exec(`CREATE TABLE IF NOT EXISTS precondition_suggestions (
    id INTEGER PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
    for_date TEXT NOT NULL,
    suggested_at INTEGER NOT NULL DEFAULT (unixepoch()),
    expected_temp_c REAL,
    expected_departure_hhmm TEXT,
    reason_code TEXT NOT NULL,
    details_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    acknowledged_at INTEGER,
    dismissed_at INTEGER,
    UNIQUE(vehicle_id, for_date)
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_precondition_vehicle ON precondition_suggestions(vehicle_id, for_date DESC)');
  // Hot-Path-Indexe fuer Notify-Loop (status-Filter)
  db.exec('CREATE INDEX IF NOT EXISTS idx_battery_anomalies_status ON battery_anomalies(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_precondition_status ON precondition_suggestions(status, acknowledged_at)');

  // POI-Cache (Overpass-Lookup-Persistierung, Phase 4)
  db.exec(`CREATE TABLE IF NOT EXISTS poi_cache (
    lat_key INTEGER NOT NULL,
    lon_key INTEGER NOT NULL,
    radius_m INTEGER NOT NULL,
    types_key TEXT NOT NULL,
    pois_json TEXT NOT NULL,
    fetched_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (lat_key, lon_key, radius_m, types_key)
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_poi_cache_age ON poi_cache(fetched_at)');

  // Geocoding-Cache (Nominatim-Lookup-Persistierung)
  db.exec(`CREATE TABLE IF NOT EXISTS geocode_cache (
    lat_key INTEGER NOT NULL,
    lon_key INTEGER NOT NULL,
    address TEXT NOT NULL,
    fetched_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (lat_key, lon_key)
  )`);
}

// Alias für Abwärtskompatibilität
export function initDb() { return initMasterDb(); }
