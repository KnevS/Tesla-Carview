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

// Cache-Version bei JEDEM Deploy bumpen, das index.html-Caching-Verhalten
// (s. unten) loest das normalerweise — aber wenn ein User noch eine alte
// SW-Version installiert hat, sorgt der Bump dafuer dass das alte Set
// von Chunk-Referenzen sicher invalidiert wird.
const CACHE = 'tcv-v2';
// Icons und Manifest sind selten geaendert + hash-los; safe vorzucachen.
// index.html ('/') BEWUSST NICHT mehr im SHELL — die wird ueber den
// network-first-Pfad unten frisch geholt, sonst zeigt das SW bei jedem
// Deploy fuer einen Reload-Cycle ein veraltetes Bundle-Manifest und das
// dynamische Import von chunk-XYZ.js scheitert (Click-Handler fehlen,
// 'Fahrer kann nicht ausgewaehlt werden' usw.).
const SHELL = [
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

// Erkennt Navigations-Requests bzw. die Einstiegs-HTML. Diese muessen
// IMMER frisch sein, damit das im index.html eingebettete Chunk-Manifest
// (mit den aktuellen Vite-Hash-Namen) zur aktuellen /assets/-Auslieferung
// passt. Wenn das auseinanderlaeuft, schlagen dynamische Imports fehl
// und Komponenten rendern halb (Click-Handler-Wirrwarr).
function isHtmlEntry(req, url) {
  if (req.mode === 'navigate') return true;
  return req.method === 'GET' && req.headers.get('accept')?.includes('text/html');
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // API + Auth + tesla — strikt online: keine veralteten Daten anzeigen.
  if (url.pathname.startsWith('/api/')) return;
  if (event.request.method !== 'GET') return;

  // HTML/Navigations-Requests: network-first, mit Cache nur als
  // Offline-Fallback. Verhindert das Deploy-vs-Cache-Race.
  if (isHtmlEntry(event.request, url)) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(event.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('/')))
    );
    return;
  }

  // Statische Assets (hashed JS/CSS, Icons): stale-while-revalidate ist
  // hier sicher, weil Vite jedem Asset einen content-hash gibt — eine
  // alte gecachte Datei ist entweder identisch zur neuen oder hat
  // einen anderen URL-Pfad.
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
