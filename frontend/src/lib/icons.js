/**
 * Zentrale Icon-Definitionen.
 *
 * Wird sowohl von der Vue-Komponente <AppIcon /> (components/AppIcon.vue)
 * als auch von Stellen genutzt, an denen ein SVG als Raw-HTML in einen
 * v-html-Block injiziert wird (z.B. Handbook.vue rendert Markdown nach
 * HTML und ersetzt fuehrende Emoji-Glyphen in den Section-Headers
 * durch das passende Icon — geht nur per Raw-String, nicht via Vue-
 * Komponente). Ein zentrales Set garantiert visuelle Konsistenz.
 *
 * Pfade sind selbst gezeichnet im Lucide-Stil (24×24, stroke-width 2,
 * rounded). Reine geometrische Primitive — kein Drittanbieter-Asset,
 * keine Marken-Uebernahme.
 */

export const ICONS = {
  // Navigation
  home:       '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a1 1 0 0 1-1-1v-6h-4v6a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2z"/>',
  map:        '<path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/>',
  logbook:    '<path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M8 7h8M8 11h8M8 15h5"/>',
  cash:       '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M7 12h.01M17 12h.01"/>',
  battery:    '<rect x="2" y="7" width="17" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/><line x1="6" y1="11" x2="6" y2="13"/><line x1="10" y1="11" x2="10" y2="13"/><line x1="14" y1="11" x2="14" y2="13"/>',
  bolt:       '<polygon points="13 2 4 13 11 13 9 22 20 11 13 11 13 2"/>',
  steering:   '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 14v7M5.6 8h12.8M5 17l3.5-3M19 17l-3.5-3"/>',
  gauge:      '<path d="M12 14a2 2 0 1 0-2-2"/><path d="M21 12a9 9 0 1 0-18 0"/><path d="M12 12l5-3"/>',
  export:     '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  system:     '<rect x="3" y="3" width="18" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  users:      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  database:   '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6"/>',
  legal:      '<path d="M12 2v6M8 6h8M5 21l3-7h8l3 7M5 10h14M5 14h14"/>',
  audit:      '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="17" y2="13"/><line x1="7" y1="17" x2="13" y2="17"/>',

  // Action / UI
  book:       '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  settings:   '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  'power-off':'<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>',
  plus:       '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  x:          '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check:      '<polyline points="20 6 9 17 4 12"/>',
  alert:      '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  info:       '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  pencil:     '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  trash:      '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  refresh:    '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  search:     '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  calendar:   '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  clock:      '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  flag:       '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  lock:       '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  pin:        '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  wallet:     '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
  tool:       '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  pulse:      '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',

  // Erweiterung speziell fuer Handbook-Headings
  star:       '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  heart:      '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  smartphone: '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
  download:   '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  globe:      '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',

  // Pfeile fuer Sortier-Toggle (SortToggle.vue): arrow-down = neueste
  // zuerst (Default), arrow-up = aelteste zuerst.
  'arrow-up':   '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
  'arrow-down': '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
};

/** Mapping der im Handbuch verwendeten Unicode-Emojis auf den
 *  entsprechenden Icon-Namen aus ICONS. Wird in Handbook.vue genutzt,
 *  um die fuehrende Emoji-Glyphe in Section-Headers durch ein
 *  konsistentes SVG zu ersetzen. */
export const EMOJI_TO_ICON = {
  '🌟': 'star',
  '📋': 'logbook',
  '🚀': 'bolt',
  '⚙️': 'settings',
  '⚙':  'settings',
  '🔑': 'lock',
  '⚡': 'bolt',
  '🔐': 'lock',
  '🏢': 'users',
  '💾': 'database',
  '🔌': 'bolt',
  '📝': 'pencil',
  '📍': 'pin',
  '🎮': 'steering',
  '📜': 'legal',
  '🔧': 'tool',
  '📄': 'export',
  '💸': 'wallet',
  '📒': 'logbook',
  '📱': 'smartphone',
  '🟢': 'check',
  '❤️': 'heart',
  '❤':  'heart',
  '🗓️': 'calendar',
  '🗓':  'calendar',
  '📊': 'gauge',
  '👤': 'users',
  '🏠': 'home',
  '🗺️': 'map',
  '🗺':  'map',
  '🔋': 'battery',
  '🎯': 'flag',
  '💶': 'wallet',
  '🚗': 'gauge',
  '🛡️': 'lock',
  '🛡':  'lock',
  '🏎':  'gauge',
  '🏎️': 'gauge',
  '📡': 'pulse',
  '🌐': 'globe',
  '👥': 'users',
  '🗑️': 'trash',
  '🗑':  'trash',
  '⚖️': 'legal',
  '⚖':  'legal',
  '📈': 'system',
  '🔔': 'alert',
  '🎉': 'star',
};

/** Liefert das Raw-SVG-Markup fuer einen Icon-Namen. Wird in v-html-
 *  Kontexten injiziert, etwa beim Markdown-Rendering in Handbook.vue. */
export function renderIconSvg(name, { size = 20, strokeWidth = 2 } = {}) {
  const inner = ICONS[name];
  if (!inner) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"`
       + ` stroke="currentColor" stroke-width="${strokeWidth}"`
       + ` stroke-linecap="round" stroke-linejoin="round"`
       + ` class="handbook-h-icon" aria-hidden="true">${inner}</svg>`;
}

/** Vorne stehendes Emoji aus einem String herausnehmen und in
 *  { iconName, rest } zurueckgeben. Unbekanntes Emoji oder kein Emoji:
 *  iconName=null, rest=text unveraendert. Beachtet ZWJ und
 *  Variation-Selectors (FE0F) hinter dem Glyph. */
export function extractLeadingEmoji(text) {
  const m = text.match(/^\s*(\p{Extended_Pictographic}️?)\s*(.*)$/u);
  if (!m) return { iconName: null, rest: text };
  const emoji = m[1];
  const iconName = EMOJI_TO_ICON[emoji] || EMOJI_TO_ICON[emoji.replace(/️/g, '')] || null;
  return { iconName, rest: m[2], emoji };
}
