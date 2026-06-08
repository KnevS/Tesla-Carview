// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * v-reveal — Element wird unsichtbar montiert und springt erst beim
 * Eintreten in den Viewport in den sichtbaren Zustand. IntersectionObserver,
 * threshold gering, einmaliges Triggern (kein Re-Hide beim Verlassen).
 *
 *   <div v-reveal>Cooler Inhalt</div>
 *
 * Erkennt prefers-reduced-motion und macht das Element dann sofort
 * sichtbar — keine Animation, kein „leeres Loch" am Anfang.
 */

const reducedMotion = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const revealDirective = {
  mounted(el) {
    if (reducedMotion) { el.classList.add('reveal', 'is-revealed'); return; }
    el.classList.add('reveal');
    if (!('IntersectionObserver' in window)) {
      el.classList.add('is-revealed');
      return;
    }
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-revealed');
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    io.observe(el);
    el._revealIO = io;
  },
  unmounted(el) {
    el._revealIO?.disconnect();
  },
};
