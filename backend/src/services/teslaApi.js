import { randomBytes, createHash } from 'crypto';
import https from 'https';
import axios from 'axios';
import { getMasterDb, getDb } from '../db/database.js';
import { getTenantSetting, setTenantSetting } from './configService.js';
import { encrypt, decrypt } from './cryptoService.js';
import {
  assertWithinBudget,
  recordCall,
  categorize,
  normalizeEndpoint,
} from './teslaUsage.js';

const proxyAgent = new https.Agent({ rejectUnauthorized: false });
const PROXY_BASE  = 'https://host.docker.internal:4443';

const getAuthBase    = () => process.env.TESLA_AUTH_BASE || 'https://auth.tesla.com/oauth2/v3';
const getFleetApiUrl = () => process.env.TESLA_AUDIENCE  || 'https://fleet-api.prd.eu.vn.cloud.tesla.com';

// Tesla hat owner-api.teslamotors.com fuer Vehicle-Endpoints abgeschaltet
// (412 "Endpoint is only available on fleetapi"). Owner-Mode-Tokens
// (client_id=ownerapi) sind weiterhin gueltig, muessen aber gegen die
// Fleet-API-URL aufgerufen werden — deshalb teilen sich Fleet- und
// Owner-Modus jetzt dieselbe API-Base. Token-Exchanges schicken
// `audience` explizit mit, damit Tesla den Token fuer Fleet API ausstellt.
const OWNER_CLIENT_ID = 'ownerapi';

const SCOPES = 'openid offline_access user_data vehicle_device_data vehicle_cmds vehicle_charging_cmds vehicle_location';

function getAuthMode(db) {
  return getTenantSetting(db, 'tesla.auth_mode', null) || 'fleet';
}

export function getAuthUrl(tenantId) {
  const codeVerifier  = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  const state         = randomBytes(16).toString('hex');

  const tdb    = getDb(tenantId);
  const master = getMasterDb();
  master.prepare('DELETE FROM oauth_pkce WHERE created_at < unixepoch() - 600').run();
  master.prepare(
    'INSERT OR REPLACE INTO oauth_pkce (state, tenant_id, code_verifier) VALUES (?, ?, ?)'
  ).run(state, tenantId, codeVerifier);

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             getTenantSetting(tdb, 'tesla.client_id', 'TESLA_CLIENT_ID'),
    redirect_uri:          getTenantSetting(tdb, 'tesla.redirect_uri', 'TESLA_REDIRECT_URI') || process.env.TESLA_REDIRECT_URI,
    scope:                 SCOPES,
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${getAuthBase()}/authorize?${params}`;
}

export async function exchangeCode(db, code, state) {
  const master = getMasterDb();
  const row = master.prepare('SELECT * FROM oauth_pkce WHERE state=?').get(state);
  if (!row) throw new Error('PKCE-State nicht gefunden oder abgelaufen');
  master.prepare('DELETE FROM oauth_pkce WHERE state=?').run(state);

  // 15s Timeout reicht reichlich fuer einen OAuth-Token-Tausch.
  // Verhindert haengen-bleibende Promises bei Tesla-Auth-Outage (Audit L11).
  const res = await axios.post(`${getAuthBase()}/token`, {
    grant_type:    'authorization_code',
    client_id:     getTenantSetting(db, 'tesla.client_id', 'TESLA_CLIENT_ID'),
    client_secret: getTenantSetting(db, 'tesla.client_secret', 'TESLA_CLIENT_SECRET'),
    code,
    redirect_uri:  getTenantSetting(db, 'tesla.redirect_uri', 'TESLA_REDIRECT_URI') || process.env.TESLA_REDIRECT_URI,
    code_verifier: row.code_verifier,
    audience:      getFleetApiUrl(),
  }, { timeout: 15_000 });
  saveTokens(db, res.data);
  return res.data;
}

export async function refreshTokens(db) {
  const row = db.prepare('SELECT refresh_token FROM tokens ORDER BY id DESC LIMIT 1').get();
  if (!row) throw new Error('Keine gespeicherten Tokens');
  const mode = getAuthMode(db);
  // Owner API: kein client_secret noetig, anderer client_id
  if (mode === 'owner') {
    const res = await axios.post(`${getAuthBase()}/token`, {
      grant_type:    'refresh_token',
      client_id:     OWNER_CLIENT_ID,
      refresh_token: decrypt(row.refresh_token),
      scope:         'openid email offline_access',
      audience:      getFleetApiUrl(),
    }, { timeout: 15_000 });
    saveTokens(db, res.data);
    return res.data.access_token;
  }
  // refresh_token kommt aus der DB potenziell verschluesselt — decrypt
  // toleriert sowohl v1:... als auch Legacy-Klartext.
  const res = await axios.post(`${getAuthBase()}/token`, {
    grant_type:    'refresh_token',
    client_id:     getTenantSetting(db, 'tesla.client_id', 'TESLA_CLIENT_ID'),
    client_secret: getTenantSetting(db, 'tesla.client_secret', 'TESLA_CLIENT_SECRET'),
    refresh_token: decrypt(row.refresh_token),
  }, { timeout: 15_000 });
  saveTokens(db, res.data);
  return res.data.access_token;
}

export async function connectOwnerToken(db, refreshToken) {
  const res = await axios.post(`${getAuthBase()}/token`, {
    grant_type:    'refresh_token',
    client_id:     OWNER_CLIENT_ID,
    refresh_token: refreshToken,
    scope:         'openid email offline_access',
    audience:      getFleetApiUrl(),
  }, { timeout: 15_000 });
  saveTokens(db, res.data);
  setTenantSetting(db, 'tesla.auth_mode', 'owner');
  return res.data.access_token;
}

export function getOwnerAuthUrl(tenantId) {
  const codeVerifier  = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  const state         = randomBytes(16).toString('hex');

  const tdb    = getDb(tenantId);
  const master = getMasterDb();
  master.prepare('DELETE FROM oauth_pkce WHERE created_at < unixepoch() - 600').run();
  try { master.prepare("ALTER TABLE oauth_pkce ADD COLUMN mode TEXT DEFAULT 'fleet'").run(); } catch {}
  master.prepare(
    'INSERT OR REPLACE INTO oauth_pkce (state, tenant_id, code_verifier, mode) VALUES (?, ?, ?, ?)'
  ).run(state, tenantId, codeVerifier, 'owner');

  const redirectUri = getTenantSetting(tdb, 'tesla.redirect_uri', 'TESLA_REDIRECT_URI') || process.env.TESLA_REDIRECT_URI;
  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             OWNER_CLIENT_ID,
    redirect_uri:          redirectUri,
    scope:                 'openid email offline_access',
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${getAuthBase()}/authorize?${params}`;
}

export async function exchangeOwnerCode(db, code, state) {
  const master = getMasterDb();
  const row = master.prepare('SELECT * FROM oauth_pkce WHERE state=?').get(state);
  if (!row) throw new Error('PKCE-State nicht gefunden oder abgelaufen');
  master.prepare('DELETE FROM oauth_pkce WHERE state=?').run(state);

  const redirectUri = getTenantSetting(db, 'tesla.redirect_uri', 'TESLA_REDIRECT_URI') || process.env.TESLA_REDIRECT_URI;
  const res = await axios.post(`${getAuthBase()}/token`, {
    grant_type:    'authorization_code',
    client_id:     OWNER_CLIENT_ID,
    code,
    redirect_uri:  redirectUri,
    code_verifier: row.code_verifier,
    audience:      getFleetApiUrl(),
  }, { timeout: 15_000 });
  saveTokens(db, res.data);
  setTenantSetting(db, 'tesla.auth_mode', 'owner');
  return res.data;
}

function saveTokens(db, data) {
  // Beide Tokens werden verschluesselt persistiert — auch wenn der
  // Access-Token nur ~15 min gilt, ist DB-Leak-Sicherheit billig zu haben.
  db.prepare(
    'INSERT INTO tokens (access_token, refresh_token, expires_at) VALUES (?, ?, ?)'
  ).run(encrypt(data.access_token), encrypt(data.refresh_token), Date.now() + data.expires_in * 1000);
}

export async function getAccessToken(db) {
  const row = db.prepare('SELECT access_token, expires_at FROM tokens ORDER BY id DESC LIMIT 1').get();
  if (!row) throw new Error('Nicht authentifiziert. Bitte zuerst Tesla verbinden.');
  if (Date.now() > row.expires_at - 60000) return refreshTokens(db);
  return decrypt(row.access_token);
}

/** Wrapper: prüft Budget vor jedem Call, zählt nach Erfolg. */
async function trackedCall(db, method, path, fn) {
  assertWithinBudget(db);
  const result = await fn();
  try {
    const cat = categorize(method, path);
    if (cat) recordCall(db, cat, normalizeEndpoint(method, path));
  } catch (err) {
    console.error('[teslaUsage] recordCall failed:', err.message);
  }
  return result;
}

// 20s default-Timeout fuer Fleet-API-Calls. Tesla's /vehicle_data kann
// gelegentlich langsam sein (Auto wacht auf), aber 20s ist die obere
// Schwelle bevor wir lieber neu versuchen. Verhindert Hang bei Outage.
const FLEET_TIMEOUT_MS = 20_000;

function getApiBase(_db) {
  // Alle Vehicle-Endpoints laufen ueber Fleet API — unabhaengig vom Auth-Mode.
  return getFleetApiUrl();
}

export async function apiGet(db, path) {
  return trackedCall(db, 'GET', path, async () => {
    const token = await getAccessToken(db);
    const res = await axios.get(`${getApiBase(db)}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: FLEET_TIMEOUT_MS,
    }).catch(err => {
      if (err.response) console.error(`[TeslaAPI] ${path} → HTTP ${err.response.status}:`, JSON.stringify(err.response.data));
      throw err;
    });
    return res.data;
  });
}

export async function apiPost(db, path, body) {
  return trackedCall(db, 'POST', path, async () => {
    const token   = await getAccessToken(db);
    const res   = await axios.post(`${getApiBase(db)}${path}`, body, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: FLEET_TIMEOUT_MS,
    });
    return res.data;
  });
}

export async function apiProxyPost(db, path, body, timeoutMs = 30000) {
  return trackedCall(db, 'POST', path, async () => {
    const token = await getAccessToken(db);
    const res   = await axios.post(`${PROXY_BASE}${path}`, body, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      httpsAgent: proxyAgent,
      timeout: timeoutMs,
    });
    return res.data;
  });
}

export async function getVehicles(db) {
  return apiGet(db, '/api/1/vehicles');
}

export async function getVehicleData(db, vehicleId) {
  return apiGet(db, `/api/1/vehicles/${vehicleId}/vehicle_data`);
}

export { getAuthMode };
