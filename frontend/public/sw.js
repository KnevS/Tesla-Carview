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
const CACHE = 'tcv-v4';
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

// ─── Web-Push ───────────────────────────────────────────────────────────────
//
// Vom Backend kommen jetzt angereicherte Payloads pro Event-Typ. Felder:
//   title, body, icon, url            — Basis (kompatibel zur alten Variante)
//   badge                             — kleines monochromes Icon (Lockscreen,
//                                        Apple-Watch-Notification-Glyph)
//   tag                               — gleiche Tag-IDs ersetzen vorherige
//                                        Notification statt zu duplizieren
//   actions: [{ action, title, icon }] — Buttons in der Notification (Android,
//                                        Windows; iOS unterstützt 1-2 Actions
//                                        in macOS-Notifications der PWA)
//   vibrate: [ms, ms, …]              — Vibrationsmuster (Android)
//   requireInteraction: bool          — Notification nicht automatisch
//                                        verschwinden lassen (kritische
//                                        Alarme: Sentry, Battery-Low)
//   renotify: bool                    — Vibration/Sound erneut auslösen,
//                                        auch wenn Tag schon existiert
//   silent: bool                      — leise zustellen (Telegram-Spiegel,
//                                        keine Lockscreen-Störung)
//   image                             — großes Bild (Charging-Statusbild,
//                                        Sentry-Snapshot später)
//   timestamp                         — Sortierung im Notification-Center
//   data.actions[] — Map<action,url>  — Klick-Ziel pro Action-Button
//
// Alles Optionale wird beim Fehlen sauber durch sinnvolle Defaults ersetzt.
self.addEventListener('push', event => {
  const data = (() => { try { return event.data?.json() ?? {}; } catch { return {}; } })();

  const opts = {
    body:  data.body || '',
    icon:  data.icon  || '/icon-192.png',
    badge: data.badge || '/badge.svg',
    data:  {
      url:     data.url || '/',
      actions: data.actionUrls || {},   // server-side gepflegte action→url-Map
      tag:     data.tag || null,
      ts:      data.timestamp || Date.now(),
    },
  };
  if (data.tag)                opts.tag                = data.tag;
  if (Array.isArray(data.actions))  opts.actions       = data.actions.slice(0, 2);
  if (Array.isArray(data.vibrate))  opts.vibrate       = data.vibrate;
  if (data.requireInteraction) opts.requireInteraction = true;
  if (data.renotify)           opts.renotify           = true;
  if (data.silent)             opts.silent             = true;
  if (data.image)              opts.image              = data.image;
  if (data.timestamp)          opts.timestamp          = data.timestamp;

  event.waitUntil(
    self.registration.showNotification(data.title || 'Tesla Carview', opts)
  );
});

// Reagiert sowohl auf den allgemeinen Notification-Click (Body) als auch
// auf Klicks auf Action-Buttons. Special-cases:
//   • action === 'dismiss'  → nur schließen (keine Navigation)
//   • action === 'snooze'   → in 1h erneut zeigen (lokal, ohne Backend)
//   • action === 'snooze1d' → in 24h erneut zeigen
//   • sonst Mapping über data.actions[action] → URL
self.addEventListener('notificationclick', event => {
  const n = event.notification;
  const a = event.action;
  n.close();

  // Dismiss: nichts tun außer schließen.
  if (a === 'dismiss') return;

  // Snooze: Notification kommt nach Delay erneut, ohne dass das Backend
  // sie nochmal senden muss. Tag bleibt erhalten → ersetzt nichts anderes.
  if (a === 'snooze' || a === 'snooze1d') {
    const delayMs = a === 'snooze1d' ? 86400000 : 3600000;
    event.waitUntil((async () => {
      // self.registration.showNotification kann nach close() sofort wieder
      // den gleichen Tag öffnen, daher setTimeout. Wir verwenden showTrigger
      // wenn verfügbar (Chrome behind flag), sonst Fallback via
      // setTimeout-im-SW (überlebt nur, solange der SW lebt — beste Lösung
      // ohne Backend-Roundtrip).
      const opts = {
        body:  n.body,
        icon:  n.icon  || '/icon-192.png',
        badge: n.badge || '/badge.svg',
        tag:   n.tag   || undefined,
        data:  n.data,
      };
      if ('showTrigger' in Notification.prototype) {
        try {
          opts.showTrigger = new TimestampTrigger(Date.now() + delayMs);
          await self.registration.showNotification(n.title, opts);
          return;
        } catch { /* fällt unten in setTimeout */ }
      }
      setTimeout(() => {
        self.registration.showNotification(n.title, opts).catch(() => {});
      }, delayMs);
    })());
    return;
  }

  // Action-Klick: schau in der vom Backend mitgegebenen Map nach
  // explizitem URL-Ziel — fällt auf n.data.url zurück (Body-Klick).
  const target = (a && n.data?.actions?.[a]) || n.data?.url || '/';
  event.waitUntil((async () => {
    const cs = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of cs) {
      if (c.url.includes(self.location.origin)) {
        await c.focus();
        c.navigate(target);
        return;
      }
    }
    await clients.openWindow(target);
  })());
});
