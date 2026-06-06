PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tenants (
  id   TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  db_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  suspended_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Globaler VIN-Index für Fleet Telemetry Routing
CREATE TABLE IF NOT EXISTS vin_registry (
  vin TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- Mandantenübergreifende Refresh-Tokens (tenant_id ermöglicht DB-Lookup beim Refresh)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- PKCE-States für Tesla OAuth (tenant-übergreifend, da Callback ohne Auth)
CREATE TABLE IF NOT EXISTS oauth_pkce (
  state         TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code_verifier TEXT NOT NULL,
  mode          TEXT DEFAULT 'fleet',
  created_at    INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_master_refresh ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_master_vin     ON vin_registry(tenant_id);

-- Rechtliche Inhalte (Impressum, Datenschutz, Nutzungsbedingungen).
-- Plattformweit geteilt: ein selbst gehosteter Betreiber pflegt einen
-- Satz für die ganze Instanz. Pro (scope, locale) genau ein aktueller
-- Eintrag; History wird über `version` getrackt (Re-Akzept-Pflicht beim
-- Bump). Default-Inhalte werden in database.js eingespeisst.
CREATE TABLE IF NOT EXISTS legal_content (
  scope      TEXT NOT NULL,                         -- 'imprint' | 'privacy' | 'terms'
  locale     TEXT NOT NULL,                         -- 'de' | 'en' | 'fr' | 'es' | 'tr' | 'el'
  version    INTEGER NOT NULL DEFAULT 1,            -- monoton steigend; ++ nur bei materiellen Änderungen
  body_md    TEXT NOT NULL,                         -- Markdown-Quelle, wird im Frontend mit `marked` gerendert
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (scope, locale)
);
CREATE INDEX IF NOT EXISTS idx_legal_content_scope ON legal_content(scope);

-- Community Benchmarks: opt-in anonymisierte Verbrauchsdaten.
-- Jeder Mandant kann mit seiner Instanz-UUID opt-in Aggregate beitragen.
-- Gespeichert werden NUR anonyme Aggregate — keine Einzel-Trips, keine VINs,
-- keine Koordinaten. Das Modell (model_key) ist der einzige Identifikator.
-- Ein Mandant kann seinen Beitrag jederzeit löschen (opt-out).
CREATE TABLE IF NOT EXISTS community_benchmarks (
  id              INTEGER PRIMARY KEY,
  instance_uuid   TEXT    NOT NULL,                 -- GUID der Instanz (kein Rückschluss auf Person)
  model_key       TEXT    NOT NULL,                 -- z.B. 'model y', 'model 3', 'model s'
  avg_kwh_100km   REAL    NOT NULL,                 -- Durchschnittsverbrauch
  sample_trips    INTEGER NOT NULL,                 -- Anzahl Fahrten im Beitrag
  total_km        REAL    NOT NULL,                 -- Gesamtkilometer
  country_code    TEXT,                             -- optional: DE, AT, CH, etc.
  contributed_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(instance_uuid, model_key)
);
CREATE INDEX IF NOT EXISTS idx_benchmarks_model ON community_benchmarks(model_key);

-- Telegram Bot-Anbindung: verknüpft Telegram-Chat-IDs mit Nutzern (mandantenübergreifend).
-- Lookup geschieht über chat_id → tenant_id + user_id beim Empfang von Bot-Nachrichten.
CREATE TABLE IF NOT EXISTS telegram_links (
  id               INTEGER PRIMARY KEY,
  tenant_id        TEXT    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id          INTEGER NOT NULL,
  chat_id          TEXT    NOT NULL UNIQUE,
  telegram_username TEXT,
  linked_at        INTEGER DEFAULT (unixepoch()),
  UNIQUE(tenant_id, user_id)
);

-- Temporäre Verknüpfungs-Codes (6 Zeichen, 10 Minuten gültig).
-- Nutzer startet /start <code> im Bot, Backend verifiziert und verknüpft.
CREATE TABLE IF NOT EXISTS telegram_link_codes (
  code       TEXT    PRIMARY KEY,
  tenant_id  TEXT    NOT NULL,
  user_id    INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Nutzer-basierte Web-Push-Subscriptions (ergänzt die vehicle-basierten).
-- Ermöglicht Benachrichtigungen unabhängig vom ausgewählten Fahrzeug.
CREATE TABLE IF NOT EXISTS user_push_subscriptions (
  id                INTEGER PRIMARY KEY,
  tenant_id         TEXT    NOT NULL,
  user_id           INTEGER NOT NULL,
  subscription_json TEXT    NOT NULL,
  user_agent        TEXT,
  created_at        INTEGER DEFAULT (unixepoch()),
  UNIQUE(tenant_id, user_id, subscription_json)
);

CREATE INDEX IF NOT EXISTS idx_telegram_links_chat ON telegram_links(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_links_user ON telegram_links(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_subs ON user_push_subscriptions(tenant_id, user_id);

-- OwnTracks-Devices: ein Smartphone (eine OwnTracks-App-Installation) liegt
-- 1:1 auf einem Fahrzeug + einem Fahrer. Der device_token authentifiziert
-- eingehende Webhook-Pushes ohne JWT (Token in der URL, wie OwnTracks es
-- vorgibt). Token-Lookup ist pre-auth, deshalb liegt die Tabelle in master.db
-- (analog zu telegram_links).
--   current_trip_id / stationary_since: State-Machine der Auto-Trip-Erkennung.
--   default_trip_type: business | private | commute — Vorgabe für neu
--     erzeugte Trips dieses Device (Fahrer kann jeden Trip nachträglich
--     umklassifizieren).
CREATE TABLE IF NOT EXISTS owntracks_devices (
  id                 INTEGER PRIMARY KEY,
  tenant_id          TEXT    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicle_id         INTEGER NOT NULL,
  user_id            INTEGER NOT NULL,
  device_token       TEXT    NOT NULL UNIQUE,
  label              TEXT    NOT NULL,
  default_trip_type  TEXT    NOT NULL DEFAULT 'business',
  is_active          INTEGER NOT NULL DEFAULT 1,
  current_trip_id    INTEGER,
  stationary_since   INTEGER,
  last_ping_at       INTEGER,
  created_at         INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_owntracks_token  ON owntracks_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_owntracks_tenant ON owntracks_devices(tenant_id);

-- ─── TeslaView Mesh — Phase 1: Aggregations-Backbone ─────────────────────
--
-- Föderiertes, privacy-preserving Schwarm-Netzwerk zwischen selbsthostenden
-- TeslaView-Instanzen. Datenfluss:
--   1. Jede Instanz aggregiert OWN-DB-Daten lokal nach (topic, dimensions)
--   2. Aggregat (kein Einzeldatum, keine VIN, kein Standort) wird an einen
--      "Hub" geschickt (= eine andere TeslaView-Instanz mit Mesh-Hub-Mode)
--   3. Hub akkumuliert in dieser Tabelle, anonymisiert per
--      instance_uuid (random pro Instanz), bietet Aggregates per HTTP
--   4. Andere Instanzen lesen die Aggregates für Schwarm-Vergleich
--
-- Datenschutz-Garantien:
--   • Keine Identifikatoren auf Personen oder Fahrzeuge (kein VIN)
--   • Keine genauen Standorte (höchstens 200-m-Raster, später per Topic)
--   • Min-Group-Size beim Lesen: Aggregate werden nur ausgespielt wenn
--     ≥ 5 unterschiedliche instance_uuids zur (topic, dimensions_key)-
--     Kombination beigetragen haben (Differential-Privacy-Erweiterung in
--     Phase 3)
--   • Opt-in pro Topic, Default OFF (siehe tenant_settings 'mesh.optin.*')
--   • Beiträge können jederzeit per instance_uuid gelöscht werden
--
-- topic-Beispiele: 'range_curve', 'charging_speed', 'tco_eur_per_km'
-- dimensions_key: deterministischer Hash der Dimensionen, z.B.
--   'model=my|speed=120-140|temp=15-20' → string-key (kein JSON, damit
--   UNIQUE-Constraint funktioniert)
-- metrics_json: JSON mit den Aggregat-Werten der Instanz, z.B.
--   {"median":17.3,"p90":21.5,"sample_count":89}
CREATE TABLE IF NOT EXISTS mesh_contributions (
  id              INTEGER PRIMARY KEY,
  instance_uuid   TEXT    NOT NULL,
  topic           TEXT    NOT NULL,
  dimensions_key  TEXT    NOT NULL,
  metrics_json    TEXT    NOT NULL,
  sample_count    INTEGER NOT NULL DEFAULT 0,
  country_code    TEXT,
  contributed_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(instance_uuid, topic, dimensions_key)
);
CREATE INDEX IF NOT EXISTS idx_mesh_topic_dims  ON mesh_contributions(topic, dimensions_key);
CREATE INDEX IF NOT EXISTS idx_mesh_contributed ON mesh_contributions(contributed_at);
