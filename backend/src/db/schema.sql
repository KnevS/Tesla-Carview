PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tokens (
  id INTEGER PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY,
  tesla_id TEXT UNIQUE NOT NULL,
  vin TEXT UNIQUE NOT NULL,
  display_name TEXT,
  model TEXT,
  color TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  start_lat REAL,
  start_lon REAL,
  end_lat REAL,
  end_lon REAL,
  start_address TEXT,
  end_address TEXT,
  distance_km REAL,
  energy_used_kwh REAL,
  avg_speed_kmh REAL,
  max_speed_kmh REAL,
  start_soc INTEGER,
  end_soc INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS trip_points (
  id INTEGER PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  timestamp INTEGER NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  speed_kmh REAL,
  power_kw REAL,
  soc INTEGER,
  elevation_m REAL
);

CREATE TABLE IF NOT EXISTS charging_sessions (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  location_name TEXT,
  lat REAL,
  lon REAL,
  charger_type TEXT,
  start_soc INTEGER,
  end_soc INTEGER,
  energy_added_kwh REAL,
  max_power_kw REAL,
  cost REAL,
  currency TEXT DEFAULT 'EUR',
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS charging_points (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES charging_sessions(id) ON DELETE CASCADE,
  timestamp INTEGER NOT NULL,
  soc INTEGER,
  power_kw REAL,
  voltage REAL,
  current REAL,
  energy_added_kwh REAL
);

CREATE TABLE IF NOT EXISTS battery_snapshots (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  timestamp INTEGER NOT NULL,
  soc INTEGER,
  rated_range_km REAL,
  ideal_range_km REAL,
  battery_level INTEGER,
  usable_battery_level INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS logbook_entries (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  entry_date INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  description TEXT,
  mileage_km REAL,
  cost REAL,
  currency TEXT DEFAULT 'EUR',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON trips(vehicle_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_charging_vehicle ON charging_sessions(vehicle_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_battery_vehicle ON battery_snapshots(vehicle_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logbook_vehicle ON logbook_entries(vehicle_id, entry_date DESC);
