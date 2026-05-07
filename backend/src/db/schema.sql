PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Tesla OAuth Tokens (fuer den Poller)
CREATE TABLE IF NOT EXISTS tokens (
  id INTEGER PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Fahrzeuge
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY,
  tesla_id TEXT UNIQUE NOT NULL,
  vin TEXT UNIQUE NOT NULL,
  display_name TEXT,
  model TEXT,
  color TEXT,
  license_plate TEXT,
  image_color   TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- App-Benutzer (getrennt von Tesla-Auth)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  mfa_enabled INTEGER NOT NULL DEFAULT 0,
  mfa_secret TEXT,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until INTEGER,
  last_login INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Refresh-Tokens (gehasht gespeichert)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- MFA Backup-Codes (bcrypt-gehasht, einmalig verwendbar)
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Audit-Log fuer alle sicherheitsrelevanten Aktionen
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Fahrtdaten
CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  start_lat REAL, start_lon REAL,
  end_lat REAL, end_lon REAL,
  start_address TEXT, end_address TEXT,
  distance_km REAL, energy_used_kwh REAL,
  avg_speed_kmh REAL, max_speed_kmh REAL,
  start_soc INTEGER, end_soc INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS trip_points (
  id INTEGER PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  timestamp INTEGER NOT NULL,
  lat REAL NOT NULL, lon REAL NOT NULL,
  speed_kmh REAL, power_kw REAL,
  soc INTEGER, elevation_m REAL
);

-- Ladevorgaenge
CREATE TABLE IF NOT EXISTS charging_sessions (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  start_time INTEGER NOT NULL, end_time INTEGER,
  location_name TEXT, lat REAL, lon REAL,
  charger_type TEXT,
  start_soc INTEGER, end_soc INTEGER,
  energy_added_kwh REAL, max_power_kw REAL,
  cost REAL, currency TEXT DEFAULT 'EUR',
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS charging_points (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES charging_sessions(id) ON DELETE CASCADE,
  timestamp INTEGER NOT NULL,
  soc INTEGER, power_kw REAL,
  voltage REAL, current REAL, energy_added_kwh REAL
);

-- Batterie-Snapshots
CREATE TABLE IF NOT EXISTS battery_snapshots (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  timestamp INTEGER NOT NULL,
  soc INTEGER, rated_range_km REAL, ideal_range_km REAL,
  battery_level INTEGER, usable_battery_level INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Betriebsbuch
CREATE TABLE IF NOT EXISTS logbook_entries (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  entry_date INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL, description TEXT,
  mileage_km REAL, cost REAL, currency TEXT DEFAULT 'EUR',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Push-Abonnements
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  subscription_json TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(vehicle_id, subscription_json)
);

-- Fahrzeugstatus-Cache (fuer Odometer-basiertes Trip-Tracking)
CREATE TABLE IF NOT EXISTS vehicle_state_cache (
  vehicle_id INTEGER PRIMARY KEY REFERENCES vehicles(id),
  is_user_present INTEGER NOT NULL DEFAULT 0,
  odometer_km REAL,
  battery_level INTEGER,
  shift_state TEXT,
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Fleet-Telemetry-Punkte (GPS + Speed von Tesla Fleet Telemetry API)
CREATE TABLE IF NOT EXISTS telemetry_points (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
  timestamp INTEGER NOT NULL,
  lat REAL,
  lon REAL,
  speed_kmh REAL,
  gear TEXT,
  power_kw REAL,
  soc INTEGER,
  odometer_km REAL
);

-- Virtual Key fuer Fleet Telemetry
CREATE TABLE IF NOT EXISTS virtual_key (
  id INTEGER PRIMARY KEY,
  private_key_pem TEXT NOT NULL,
  public_key_pem TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_trips_vehicle    ON trips(vehicle_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_charging_vehicle ON charging_sessions(vehicle_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_battery_vehicle  ON battery_snapshots(vehicle_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logbook_vehicle  ON logbook_entries(vehicle_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_trip_points      ON trip_points(trip_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_charging_points  ON charging_points(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs       ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens   ON refresh_tokens(token_hash);
