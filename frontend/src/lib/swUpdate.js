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
 * Vue-Router-Hook: faengt „failed to fetch dynamically imported module"-
 * Fehler ab, die nach einem Deploy auftauchen, wenn die alte
 * index.html-Referenz auf einen Chunk zeigt, der serverseitig nicht
 * mehr existiert. Statt das stille Sterben des Routings reloaden wir
 * dann einmal — danach ist die App auf dem frischen Bundle.
 */
export function chunkLoadErrorGuard(router) {
  router.onError(err => {
    const msg = err?.message || '';
    const isChunkError =
      err?.name === 'ChunkLoadError' ||
      /Failed to fetch dynamically imported module/i.test(msg) ||
      /Importing a module script failed/i.test(msg) ||
      /Loading chunk \d+ failed/i.test(msg);
    if (isChunkError) reloadOnce();
  });
}
