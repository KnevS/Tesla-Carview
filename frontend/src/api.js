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
