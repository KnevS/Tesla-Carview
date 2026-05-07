import axios from 'axios';
import { getDb } from '../db/database.js';

const TESLA_AUTH_URL = 'https://auth.tesla.com/oauth2/v3';
const getFleetApiUrl = () => process.env.TESLA_AUDIENCE || 'https://fleet-api.prd.eu.vn.cloud.tesla.com';

export function getAuthUrl() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TESLA_CLIENT_ID,
    redirect_uri: process.env.TESLA_REDIRECT_URI,
    scope: 'openid vehicle_device_data vehicle_cmds offline_access',
    state: crypto.randomUUID(),
  });
  return `${TESLA_AUTH_URL}/authorize?${params}`;
}

export async function exchangeCode(code) {
  const res = await axios.post(`${TESLA_AUTH_URL}/token`, {
    grant_type: 'authorization_code',
    client_id: process.env.TESLA_CLIENT_ID,
    client_secret: process.env.TESLA_CLIENT_SECRET,
    code,
    redirect_uri: process.env.TESLA_REDIRECT_URI,
    audience: getFleetApiUrl(),
  });
  saveTokens(res.data);
  return res.data;
}

export async function refreshTokens() {
  const db = getDb();
  const row = db.prepare('SELECT refresh_token FROM tokens ORDER BY id DESC LIMIT 1').get();
  if (!row) throw new Error('Keine gespeicherten Tokens');
  const res = await axios.post(`${TESLA_AUTH_URL}/token`, {
    grant_type: 'refresh_token',
    client_id: process.env.TESLA_CLIENT_ID,
    client_secret: process.env.TESLA_CLIENT_SECRET,
    refresh_token: row.refresh_token,
  });
  saveTokens(res.data);
  return res.data.access_token;
}

function saveTokens(data) {
  const db = getDb();
  db.prepare(
    'INSERT INTO tokens (access_token, refresh_token, expires_at) VALUES (?, ?, ?)'
  ).run(data.access_token, data.refresh_token, Date.now() + data.expires_in * 1000);
}

export async function getAccessToken() {
  const db = getDb();
  const row = db.prepare('SELECT access_token, expires_at FROM tokens ORDER BY id DESC LIMIT 1').get();
  if (!row) throw new Error('Nicht authentifiziert. Bitte zuerst einloggen.');
  if (Date.now() > row.expires_at - 60000) return refreshTokens();
  return row.access_token;
}

export async function apiGet(path) {
  const token = await getAccessToken();
  const res = await axios.get(`${getFleetApiUrl()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function apiPost(path, body) {
  const token = await getAccessToken();
  const res = await axios.post(`${getFleetApiUrl()}${path}`, body, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return res.data;
}

export async function getVehicles() {
  return apiGet('/api/1/vehicles');
}

export async function getVehicleData(vehicleId) {
  return apiGet(`/api/1/vehicles/${vehicleId}/vehicle_data`);
}
