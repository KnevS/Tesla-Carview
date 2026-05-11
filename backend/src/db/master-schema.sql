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
