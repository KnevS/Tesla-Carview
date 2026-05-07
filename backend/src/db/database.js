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
  db.exec(`CREATE TABLE IF NOT EXISTS oauth_pkce (
    state        TEXT PRIMARY KEY,
    code_verifier TEXT NOT NULL,
    created_at   INTEGER DEFAULT (unixepoch())
  )`);
}
