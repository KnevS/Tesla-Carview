/**
 * Companion-Scheduler: läuft alle 6h und nur die Anomalie-Detection.
 * Vorklim-Empfehlungen brauchen nur den nightly-Pass (1× am Tag reicht).
 */
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 5 * 60 * 1000;

let timer = null;

export function startCompanionScheduler() {
  if (timer) return;
  console.log('[Companion] Scheduler aktiv — Anomalie-Run alle 6h');
  setTimeout(async () => {
    try {
      const { runCompanionCycle } = await import('./companionEngine.js');
      await runCompanionCycle({ skipPreconditions: true });
    } catch (e) {
      console.error('[Companion] Erster Run fehlgeschlagen:', e.message);
    }
    timer = setInterval(async () => {
      try {
        const { runCompanionCycle } = await import('./companionEngine.js');
        await runCompanionCycle({ skipPreconditions: true });
      } catch (e) {
        console.error('[Companion] Run fehlgeschlagen:', e.message);
      }
    }, CHECK_EVERY_MS);
  }, STARTUP_DELAY_MS);
}
