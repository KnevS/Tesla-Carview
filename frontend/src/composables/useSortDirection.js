// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { ref, watch } from 'vue';

/**
 * Reaktive Sortier-Richtung pro View, persistiert in localStorage.
 *
 * Genutzt von <SortToggle> und den jeweiligen Views (Trips,
 * Fahrtenbuch, Logbook, Charging, Kostenabrechnung, UserManagement,
 * AuditLog, LegalAdmin). Jeder View bekommt seinen eigenen
 * storage-Key, damit Praeferenzen je nach Kontext bleiben
 * (Fahrtenbuch: meist desc, AuditLog: desc, UserManagement: evtl. asc
 * nach letztem Login etc.).
 *
 * Default ist 'desc' (Neueste zuerst) — entspricht dem bisherigen
 * Verhalten der Backend-Endpoints und der typischen Nutzererwartung
 * bei Chronologien.
 *
 * @param {string} viewKey  Eindeutiger Schluessel, etwa 'trips' oder
 *                          'audit'. Wird zu 'tcv.sort.<viewKey>'.
 * @param {'asc'|'desc'} fallback  Default-Richtung bei leerem Storage.
 * @returns {{ direction: import('vue').Ref<'asc'|'desc'>, toggle: () => void }}
 */
export function useSortDirection(viewKey, fallback = 'desc') {
  const storageKey = `tcv.sort.${viewKey}`;
  // localStorage kann in privaten Tabs / SSR / Embedded-Browsern
  // werfen oder leer sein — defensive Wrapper, damit ein defekter
  // Storage den View nicht crasht. Bei Fehler einfach fallback.
  let initial = fallback;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'asc' || stored === 'desc') initial = stored;
  } catch {
    // ignorieren — fallback bleibt
  }

  const direction = ref(initial);

  watch(direction, (next) => {
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // ignorieren — Sortierung funktioniert weiter, nur nicht persistent
    }
  });

  function toggle() {
    direction.value = direction.value === 'desc' ? 'asc' : 'desc';
  }

  return { direction, toggle };
}
