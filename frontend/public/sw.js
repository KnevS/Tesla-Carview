/**
 * Service Worker fuer Tesla Carview.
 *
 * Funktionen:
 *  1. Web-Push: zeigt Notifications vom Backend (Lade-Ende, Wartungs-Reminder).
 *  2. PWA Stale-while-revalidate Caching der statischen App-Shell, damit
 *     Tesla im Auto und Smartphones bei kurzen Netz-Unterbrechungen
 *     weiter reagieren. API-Calls (/api/*) bleiben strikt network-only,
 *     sonst zeigen wir veraltete Fahrt/Ladestaende an.
 *  3. Auto-Activate ohne langes Warten — versionierter Cache-Name; neue
 *     Service-Worker uebernehmen sofort.
 */

const CACHE = 'tcv-v1';
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // API + Auth + tesla — strikt online: keine veralteten Daten anzeigen.
  if (url.pathname.startsWith('/api/')) return;
  if (event.request.method !== 'GET') return;
  // Stale-while-revalidate fuer alles andere (App-Shell, Bundles, Icons).
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request).then(res => {
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

// Web-Push — vom Backend (sendChargingCompleteNotification + Wartungs-
// Reminder). Klick oeffnet die App auf dem im Payload uebergebenen Pfad.
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Tesla Carview', {
      body:  data.body || '',
      icon:  data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      data:  { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    (async () => {
      const cs = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of cs) {
        if (c.url.includes(self.location.origin)) {
          await c.focus();
          c.navigate(target);
          return;
        }
      }
      await clients.openWindow(target);
    })()
  );
});
