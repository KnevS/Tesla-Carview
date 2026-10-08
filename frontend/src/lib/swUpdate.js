// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Service-Worker-Update-Manager.
 *
 * Zweck: das Tesla-Carview-PWA soll ohne hartes Strg+Shift+R aktuell
 * werden — auch auf iOS, wo „Hard-Reload" praktisch nicht existiert.
 *
 * Drei Schichten:
 *
 *  1. registerSW(): registriert mit `updateViaCache: 'none'`, sodass der
 *     Browser beim SW-Update-Check NICHT durch den HTTP-Cache geht.
 *     Damit kann nginx's no-store-Header garantieren, dass jedes
 *     `reg.update()` wirklich gegen das Netz prueft.
 *
 *  2. update-polling + visibility-Trigger: wenn der Tab fokussiert ist
 *     oder die App-Aktivitaet wieder los geht (visibilitychange), wird
 *     `reg.update()` ausgeloest. Faellt der Aufruf positiv aus, springt
 *     der Browser in den `updatefound`-Lifecycle.
 *
 *  3. Listener auf `controllerchange`: wenn der neue SW das Steuer
 *     uebernimmt (skipWaiting + clients.claim machen das automatisch),
 *     loesen wir EINMAL einen sauberen reload() aus. Damit ist sofort
 *     das frische index.html mit den aktuellen Bundle-Hashes geladen,
 *     ohne dass der User irgendwas tun muss.
 *
 * Plus: chunkLoadErrorGuard() — wenn Vue Router beim Wechsel auf eine
 * neue Route einen dynamischen Import nicht finden kann (typisch nach
 * Deploy, alte chunk-Hash existiert nicht mehr), wird automatisch
 * reload() ausgeloest. Letzte Sicherung, falls die SW-Upgrade-Schicht
 * mal nicht greift.
 */

const UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 min idle-Polling

let didReloadForUpdate = false;

/** Soft-Reload, der Loop-Schutz hat. */
function reloadOnce() {
  if (didReloadForUpdate) return;
  didReloadForUpdate = true;
  // location.reload(true) ist deprecated, location.reload() reicht —
  // mit Service-Worker aktualisiert das den Bundle automatisch.
  window.location.reload();
}

export function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;

  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    .then(reg => {
      // 1) Periodisch nach Updates schauen — billig (HEAD-aehnliche Logik
      //    im Browser, nur wenn die Server-Response sich vom installierten
      //    SW unterscheidet, wird etwas getan).
      setInterval(() => reg.update().catch(() => {}), UPDATE_INTERVAL_MS);

      // 2) Wenn die App in den Vordergrund kommt: sofort pruefen.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });

      // 3) Wenn der Browser einen neuen SW gefunden hat, ihn beim Wechsel
      //    in `activated` ueberwachen und vorbereitet sein.
      reg.addEventListener('updatefound', () => {
        const incoming = reg.installing;
        if (!incoming) return;
        incoming.addEventListener('statechange', () => {
          if (incoming.state === 'activated' && navigator.serviceWorker.controller) {
            // Neuer SW ist live → reload, damit das frische index.html
            // mit den aktuellen Chunk-Hashes geladen wird.
            reloadOnce();
          }
        });
      });
    })
    .catch(() => { /* kein SW = kein Drama, App laeuft auch ohne */ });

  // 4) Browser-globaler Hook: wenn EIN ANDERER Tab das SW-Update
  //    angestossen hat und der neue SW jetzt die Kontrolle uebernimmt,
  //    auch hier reloaden.
  navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);
}

/**
 * Vue-Router-Hook: faengt fehlgeschlagene dynamische Imports ab, die nach
 * einem Deploy auftauchen. nginx liefert alte Chunk-Hashes mit 404 aus
 * (`try_files $uri =404`), ein seit dem Deploy offener Tab scheitert also
 * beim ersten Klick auf eine noch nicht geladene Ansicht.
 *
 * Bis v3.57.x lief das in zwei Faellen still ins Leere — die Ansicht liess
 * sich erst nach einem manuellen Neuladen oeffnen:
 *  - Firefox meldet „error loading dynamically imported module", das passte
 *    auf keines der Muster;
 *  - fehlt das CSS eines View-Chunks, wirft Vite „Unable to preload CSS"
 *    und meldet das ueber das `vite:preloadError`-Event.
 * Ausserdem lud der Reload die ALTE Route neu, der Klick war verloren.
 * Jetzt wird direkt die angeklickte Route frisch geladen.
 */
const CHUNK_RELOAD_KEY = 'tcv:chunk-reload';
const CHUNK_RELOAD_COOLDOWN_MS = 10_000;

export function isChunkLoadError(err) {
  const msg = err?.message || String(err || '');
  return err?.name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Unable to preload CSS/i.test(msg) ||
    /Loading (CSS )?chunk \S+ failed/i.test(msg);
}

/**
 * Laedt die Seite (optional auf `path`) neu. Loop-Schutz ueber
 * sessionStorage statt Modul-Flag, damit er den Reload selbst ueberlebt:
 * fehlt ein Chunk auch nach dem Reload, gibt es keine Endlosschleife.
 */
function reloadForChunk(path) {
  let last = 0;
  try { last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY)) || 0; } catch { /* kein Storage */ }
  if (Date.now() - last < CHUNK_RELOAD_COOLDOWN_MS) return false;
  try { sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now())); } catch { /* egal */ }
  if (path && path !== location.pathname + location.search + location.hash) {
    window.location.assign(path);
  } else {
    window.location.reload();
  }
  return true;
}

export function chunkLoadErrorGuard(router) {
  // Ziel der laufenden Navigation merken: `vite:preloadError` feuert VOR
  // router.onError und kennt die angeklickte Route nicht.
  let pendingPath = null;
  router.beforeEach((to) => { pendingPath = to.fullPath; });
  router.afterEach(() => { pendingPath = null; });

  router.onError((err, to) => {
    if (isChunkLoadError(err)) reloadForChunk(to?.fullPath ?? pendingPath);
  });
  // Vite meldet fehlgeschlagene Preloads (JS-Abhaengigkeiten + CSS eines
  // Chunks) zusaetzlich als Event — auch fuer dynamische Importe innerhalb
  // von Views (leaflet, jspdf, chart.js), die nie ueber den Router laufen.
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForChunk(pendingPath)) event.preventDefault();
  });
}
