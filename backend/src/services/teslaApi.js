import { randomBytes, createHash } from 'crypto';
import https from 'https';
import axios from 'axios';
import { getMasterDb } from '../db/database.js';
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

const SCOPES = 'openid offline_access user_data vehicle_device_data vehicle_cmds vehicle_charging_cmds vehicle_location';

export function getAuthUrl(tenantId) {
  const codeVerifier  = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  const state         = randomBytes(16).toString('hex');

  const master = getMasterDb();
  master.prepare('DELETE FROM oauth_pkce WHERE created_at < unixepoch() - 600').run();
  master.prepare(
    'INSERT OR REPLACE INTO oauth_pkce (state, tenant_id, code_verifier) VALUES (?, ?, ?)'
  ).run(state, tenantId, codeVerifier);

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             process.env.TESLA_CLIENT_ID,
    redirect_uri:          process.env.TESLA_REDIRECT_URI,
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

  const res = await axios.post(`${getAuthBase()}/token`, {
    grant_type:    'authorization_code',
    client_id:     process.env.TESLA_CLIENT_ID,
    client_secret: process.env.TESLA_CLIENT_SECRET,
    code,
    redirect_uri:  process.env.TESLA_REDIRECT_URI,
    code_verifier: row.code_verifier,
    audience:      getFleetApiUrl(),
  });
  saveTokens(db, res.data);
  return res.data;
}

export async function refreshTokens(db) {
  const row = db.prepare('SELECT refresh_token FROM tokens ORDER BY id DESC LIMIT 1').get();
  if (!row) throw new Error('Keine gespeicherten Tokens');
  // refresh_token kommt aus der DB potenziell verschluesselt — decrypt
  // toleriert sowohl v1:... als auch Legacy-Klartext (Migration laeuft
  // beim Start, kann aber zwischenzeitlich noch alte Zeilen treffen).
  const res = await axios.post(`${getAuthBase()}/token`, {
    grant_type:    'refresh_token',
    client_id:     process.env.TESLA_CLIENT_ID,
    client_secret: process.env.TESLA_CLIENT_SECRET,
    refresh_token: decrypt(row.refresh_token),
  });
  saveTokens(db, res.data);
  return res.data.access_token;
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

export async function apiGet(db, path) {
  return trackedCall(db, 'GET', path, async () => {
    const token = await getAccessToken(db);
    const res   = await axios.get(`${getFleetApiUrl()}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  });
}

export async function apiPost(db, path, body) {
  return trackedCall(db, 'POST', path, async () => {
    const token = await getAccessToken(db);
    const res   = await axios.post(`${getFleetApiUrl()}${path}`, body, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
