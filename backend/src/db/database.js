import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || './data/tesla-carview.db';

let db;

export function getDb() {
  if (!db) db = new Database(DB_PATH);
  return db;
}

export function initDb() {
  const db = getDb();
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  runMigrations(db);
  console.log('Datenbank initialisiert');
}

function runMigrations(db) {
  const tripCols = db.prepare('PRAGMA table_info(trips)').all().map(c => c.name);
  if (!tripCols.includes('start_odometer_km')) {
    db.exec('ALTER TABLE trips ADD COLUMN start_odometer_km REAL');
    db.exec('ALTER TABLE trips ADD COLUMN end_odometer_km REAL');
    db.exec('ALTER TABLE trips ADD COLUMN source TEXT DEFAULT \'odometer\'');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle ON telemetry_points(vehicle_id, timestamp DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_telemetry_trip ON telemetry_points(trip_id, timestamp)');
  const tripCols2 = db.prepare('PRAGMA table_info(trips)').all().map(c => c.name);
  if (!tripCols2.includes('trip_type')) {
    db.exec("ALTER TABLE trips ADD COLUMN trip_type TEXT NOT NULL DEFAULT 'private'");
    db.exec('ALTER TABLE trips ADD COLUMN purpose TEXT');
  }
  const vCols = db.prepare('PRAGMA table_info(vehicles)').all().map(c => c.name);
  if (!vCols.includes('category')) {
    db.exec("ALTER TABLE vehicles ADD COLUMN category TEXT NOT NULL DEFAULT 'private'");
    db.exec('ALTER TABLE vehicles ADD COLUMN company_name TEXT');
    db.exec('ALTER TABLE vehicles ADD COLUMN electricity_rate_kwh REAL DEFAULT 0.30');
    db.exec('ALTER TABLE vehicles ADD COLUMN monta_api_key TEXT');
    db.exec('ALTER TABLE vehicles ADD COLUMN monta_charge_point_id TEXT');
  }
  const csCols = db.prepare('PRAGMA table_info(charging_sessions)').all().map(c => c.name);
  if (!csCols.includes('location_id')) {
    db.exec('ALTER TABLE charging_sessions ADD COLUMN location_id INTEGER');
    db.exec('ALTER TABLE charging_sessions ADD COLUMN energy_kwh_mid REAL');
    db.exec('ALTER TABLE charging_sessions ADD COLUMN billing_rate_kwh REAL');
    db.exec('ALTER TABLE charging_sessions ADD COLUMN monta_session_id TEXT');
    db.exec("ALTER TABLE charging_sessions ADD COLUMN billing_status TEXT DEFAULT 'pending'");
  }
  db.exec(`CREATE TABLE IF NOT EXISTS charging_locations (
    id          INTEGER PRIMARY KEY,
    vehicle_id  INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    address     TEXT,
    type        TEXT NOT NULL DEFAULT 'home',
    rate_kwh    REAL,
    is_default  INTEGER DEFAULT 0,
    created_at  INTEGER DEFAULT (unixepoch())
  )`);
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
  db.exec(`CREATE TABLE IF NOT EXISTS oauth_pkce (
    state        TEXT PRIMARY KEY,
    code_verifier TEXT NOT NULL,
    created_at   INTEGER DEFAULT (unixepoch())
  )`);
}
