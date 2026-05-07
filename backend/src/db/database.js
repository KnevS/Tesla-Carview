import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

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

  getMasterDb().prepare(
    'INSERT INTO tenants (id, slug, name, db_path) VALUES (?, ?, ?, ?)'
  ).run(id, slug, name, dbPath);

  tenantConnections.set(id, db);
  console.log(`[DB] Mandant erstellt: "${name}" (${slug}) → ${dbPath}`);
  return id;
}

export function initMasterDb() {
  ensureDirs();
  const master = getMasterDb();
  master.exec(readFileSync(join(__dirname, 'master-schema.sql'), 'utf8'));

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

  console.log(`[DB] Master-DB initialisiert (${tenants.length} Mandant(en))`);
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

  // users: email
  const uCols = col('users');
  if (!uCols.includes('email')) {
    db.exec('ALTER TABLE users ADD COLUMN email TEXT');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL');
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

  // vehicles
  const vCols = col('vehicles');
  if (!vCols.includes('category')) {
    db.exec("ALTER TABLE vehicles ADD COLUMN category TEXT NOT NULL DEFAULT 'private'");
    db.exec('ALTER TABLE vehicles ADD COLUMN company_name TEXT');
    db.exec('ALTER TABLE vehicles ADD COLUMN electricity_rate_kwh REAL DEFAULT 0.30');
    db.exec('ALTER TABLE vehicles ADD COLUMN monta_api_key TEXT');
    db.exec('ALTER TABLE vehicles ADD COLUMN monta_charge_point_id TEXT');
  }

  // charging_sessions
  const csCols = col('charging_sessions');
  if (!csCols.includes('location_id')) {
    db.exec('ALTER TABLE charging_sessions ADD COLUMN location_id INTEGER');
    db.exec('ALTER TABLE charging_sessions ADD COLUMN energy_kwh_mid REAL');
    db.exec('ALTER TABLE charging_sessions ADD COLUMN billing_rate_kwh REAL');
    db.exec('ALTER TABLE charging_sessions ADD COLUMN monta_session_id TEXT');
    db.exec("ALTER TABLE charging_sessions ADD COLUMN billing_status TEXT DEFAULT 'pending'");
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

  // billing_periods
  db.exec(`CREATE TABLE IF NOT EXISTS billing_periods (
    id           INTEGER PRIMARY KEY,
    vehicle_id   INTEGER NOT NULL REFERENCES vehicles(id),
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
}

// Alias für Abwärtskompatibilität
export function initDb() { return initMasterDb(); }
