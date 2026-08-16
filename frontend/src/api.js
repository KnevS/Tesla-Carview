// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true, // httpOnly Refresh-Cookie mitsenden
});

// Access-Token dynamisch aus dem Auth-Store lesen (lazy import vermeidet Circular-Dep)
api.interceptors.request.use(async config => {
  const { useAuthStore } = await import('./store/auth.js');
  const auth = useAuthStore();
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

// ── 429 / Drosselung ───────────────────────────────────────────────────────
// Ein Seitenwechsel feuert 15-26 API-Calls (Dashboard ~15, Charging/Battery
// je +11, Routenplaner +18), ein Karten-Zoom 50-150 Tile-Requests. Sitzt ein
// Reverse-Proxy mit knappem Burst davor (Traefik `rateLimit`, nginx
// `limit_req`), kippt der Rest der Seite in 429 — und weil die Promise nur
// rejectete, blieb die View halb leer, bis der User neu lud.
//
// Ein 429 heisst: die Anfrage wurde NICHT verarbeitet. Sie darf also auch
// fuer POST/PUT gefahrlos wiederholt werden.
//
// NICHT abgedeckt: die Kacheln selbst. Leaflet laedt sie ueber <img>
// (lib/tiles.js), die laufen nie durch axios. Fuer sie zaehlt allein die
// Ausnahme am Reverse-Proxy — siehe deploy/README.md.
const THROTTLE_MAX_RETRIES = 3;
const THROTTLE_MAX_WAIT_MS = 4000;
// Gemeinsamer Takt fuer ALLE gedrosselten Requests: sonst laufen 20 Retries
// gleichzeitig wieder in dasselbe Limit. Jeder Retry reiht sich hinter dem
// zuletzt vergebenen Zeitpunkt ein und wird um SPACING_MS versetzt.
const THROTTLE_SPACING_MS = 150;
let throttleUntil = 0;

/** Wartezeit aus den Proxy-Headern lesen, sonst exponentiell zurueckfallen.
 *  Traefik liefert `x-retry-in` (z.B. "456.5ms"), nginx/express `retry-after`
 *  in Sekunden. */
function throttleHintMs(headers, attempt) {
  const xRetryIn = headers?.['x-retry-in'];
  if (xRetryIn) {
    const m = /^([\d.]+)\s*(ms|s)?$/i.exec(String(xRetryIn).trim());
    if (m) {
      const v = parseFloat(m[1]);
      if (Number.isFinite(v)) {
        return Math.min(m[2]?.toLowerCase() === 's' ? v * 1000 : v, THROTTLE_MAX_WAIT_MS);
      }
    }
  }
  const secs = Number(headers?.['retry-after']);
  if (Number.isFinite(secs) && secs >= 0) return Math.min(secs * 1000, THROTTLE_MAX_WAIT_MS);
  return Math.min(400 * 2 ** attempt, THROTTLE_MAX_WAIT_MS);
}

/** Reiht einen Retry in den gemeinsamen Takt ein, liefert die Wartezeit. */
function scheduleThrottledRetry(baseWaitMs) {
  const now   = Date.now();
  const start = Math.max(now + baseWaitMs, throttleUntil + THROTTLE_SPACING_MS);
  throttleUntil = start;
  return start - now;
}

// Bei 401: Token-Refresh versuchen, dann Request wiederholen
let isRefreshing = false;
let waitQueue = [];

function flushQueue(error, token) {
  waitQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  waitQueue = [];
}

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config;
    const status   = error.response?.status;

    // 502/503/504 oder kompletter Network-Fail → Backend grade nicht erreichbar
    // (typisch: Deploy laeuft). Globaler 'app-down'-Event triggert das
    // MaintenanceOverlay, das auf /api/health pollt und sich von alleine
    // wieder schliesst, sobald das Backend antwortet.
    if (!error.response || [502, 503, 504].includes(status)) {
      window.dispatchEvent(new CustomEvent('app-down'));
    }

    // 429 (Drosselung durch Reverse-Proxy oder eigenes Rate-Limit):
    // begrenzt und getaktet wiederholen statt die View halb leer zu lassen.
    if (status === 429 && original) {
      const attempt = original._throttleRetries ?? 0;
      if (attempt < THROTTLE_MAX_RETRIES) {
        original._throttleRetries = attempt + 1;
        const waitMs = scheduleThrottledRetry(throttleHintMs(error.response?.headers, attempt));
        // Bewusst neutral formuliert: der Client sieht nur, DASS gedrosselt
        // wird — welche Instanz das tut (Proxy oder App), weiss er nicht.
        window.dispatchEvent(new CustomEvent('api-throttled', { detail: { waitMs } }));
        await new Promise(r => setTimeout(r, waitMs));
        return api(original);
      }
      window.dispatchEvent(new CustomEvent('api-throttled', { detail: { waitMs: 0, gaveUp: true } }));
      return Promise.reject(error);
    }

    // Kein Retry fuer Refresh-Endpoint selbst oder bereits wiederholte Requests
    if (status !== 401 || original?._retry || original?.url === '/auth/refresh') {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Weitere 401er warten auf laufenden Refresh
      return new Promise((resolve, reject) => {
        waitQueue.push({ resolve, reject });
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { useAuthStore } = await import('./store/auth.js');
      const auth  = useAuthStore();
      const token = await auth.refresh();
      flushQueue(null, token);
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch (err) {
      flushQueue(err, null);
      const { useAuthStore } = await import('./store/auth.js');
      useAuthStore().$reset();
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
