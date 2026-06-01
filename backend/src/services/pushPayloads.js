/**
 * Push-Payload-Rezepte pro Event-Typ.
 *
 * Zentralisiert, was an den Service-Worker (frontend/public/sw.js) geht:
 * Action-Buttons, Tag-Grouping, Vibrationsmuster, requireInteraction,
 * Badge-Icon — pro Event-Typ konsistent gepflegt, damit sich das
 * Notification-Verhalten überall im Backend gleich anfühlt.
 *
 * Verwendung:
 *   import { buildPayload } from './pushPayloads.js';
 *   const payload = buildPayload('charging_complete', {
 *     lang: user.lang, vehicleId, title, body, url
 *   });
 *   webpush.sendNotification(sub, JSON.stringify(payload));
 *
 * Der Service-Worker erhält ein flaches JSON-Objekt mit allen Optionen,
 * die `Notification`-API kennt — plus `actionUrls`, das pro Action-ID
 * das Klick-Ziel mitführt (`/control/start-climate?vin=…` etc.).
 */

// ── Action-Labels pro Locale ──────────────────────────────────────────────
// Bewusst klein gehalten: Notification-Actions sind auf ~20 Zeichen
// beschränkt, sonst kürzt das OS den Text in der Mitte ab.
const L = {
  open:         { de: 'Öffnen',       en: 'Open',        fr: 'Ouvrir',      es: 'Abrir',      tr: 'Aç',          el: 'Άνοιγμα' },
  details:      { de: 'Details',      en: 'Details',     fr: 'Détails',     es: 'Detalles',   tr: 'Detaylar',    el: 'Λεπτομέρειες' },
  show:         { de: 'Anzeigen',     en: 'Show',        fr: 'Afficher',    es: 'Mostrar',    tr: 'Göster',      el: 'Εμφάνιση' },
  dismiss:      { de: 'Schließen',    en: 'Dismiss',     fr: 'Fermer',      es: 'Cerrar',     tr: 'Kapat',       el: 'Κλείσιμο' },
  snooze:       { de: 'Später (1h)',  en: 'Snooze (1h)', fr: 'Plus tard 1h',es: 'Aplazar 1h', tr: 'Ertele (1s)', el: 'Αργότερα (1ώ)' },
  snooze1d:     { de: 'Morgen',       en: 'Tomorrow',    fr: 'Demain',      es: 'Mañana',     tr: 'Yarın',       el: 'Αύριο' },
  startClimate: { de: 'Klima starten',en: 'Start climate',fr: 'Démarrer clim',es: 'Climatización', tr: 'Klima', el: 'Έναρξη κλίμα' },
  stopCharge:   { de: 'Laden stoppen',en: 'Stop charging',fr: 'Stopper charge',es: 'Detener carga', tr: 'Durdur', el: 'Διακοπή φόρτισης' },
  chargers:     { de: 'Ladestation',  en: 'Find charger',fr: 'Borne',       es: 'Cargador',   tr: 'Şarj',        el: 'Φορτιστής' },
  logbook:      { de: 'Eintragen',    en: 'Log entry',   fr: 'Saisir',      es: 'Registrar',  tr: 'Kayıt',       el: 'Εισαγωγή' },
  service:      { de: 'Wartung',      en: 'Service',     fr: 'Entretien',   es: 'Servicio',   tr: 'Servis',      el: 'Σέρβις' },
  accept:       { de: 'Lesen',        en: 'Read',        fr: 'Lire',        es: 'Leer',       tr: 'Oku',         el: 'Διάβασμα' },
};

function lbl(key, lang) {
  return L[key]?.[lang] || L[key]?.de || key;
}

// ── Vibrate-Patterns (Android) ────────────────────────────────────────────
const VIB = {
  soft:    [80],                    // sanfter Hinweis (Laden fertig)
  medium:  [120, 60, 120],          // Standard-Alarm (Battery low)
  strong:  [200, 80, 200, 80, 400], // kritisch (Sentry, Akku kritisch)
};

// ── Payload-Rezepte pro Event-Typ ─────────────────────────────────────────
//
// Jedes Rezept bekommt einen Kontext-Block (title/body sind schon
// sprachformuliert vom Aufrufer) und liefert ein vollständiges Notification-
// Options-Objekt zurück. So bleiben die Aufrufer (dataSync, scheduler etc.)
// schlank — sie wissen nur „Charging fertig" und holen sich das Rezept.

function chargingComplete(ctx) {
  const lang = ctx.lang || 'de';
  return {
    title: ctx.title,
    body:  ctx.body,
    url:   ctx.url || '/control',
    icon:  '/icon-192.png',
    badge: '/badge.svg',
    tag:   `charging.${ctx.vehicleId || 'all'}`,
    vibrate: VIB.soft,
    timestamp: Date.now(),
    actions: [
      { action: 'open',         title: lbl('open',         lang) },
      { action: 'startClimate', title: lbl('startClimate', lang) },
    ],
    actionUrls: {
      open:         ctx.url || '/control',
      startClimate: ctx.vin ? `/control?vin=${ctx.vin}&action=start_climate` : '/control',
    },
  };
}

function batteryLow(ctx) {
  const lang = ctx.lang || 'de';
  return {
    title: ctx.title,
    body:  ctx.body,
    url:   ctx.url || '/control',
    icon:  '/icon-192.png',
    badge: '/badge.svg',
    tag:   `battery.${ctx.vehicleId || 'all'}`,
    vibrate: VIB.medium,
    requireInteraction: true,
    timestamp: Date.now(),
    actions: [
      { action: 'chargers', title: lbl('chargers', lang) },
      { action: 'snooze',   title: lbl('snooze',   lang) },
    ],
    actionUrls: {
      chargers: '/routes/charging',
    },
  };
}

function sentryAlert(ctx) {
  const lang = ctx.lang || 'de';
  return {
    title: ctx.title,
    body:  ctx.body,
    url:   ctx.url || '/',
    icon:  '/icon-192.png',
    badge: '/badge.svg',
    tag:   `sentry.${ctx.vehicleId || 'all'}`,
    vibrate: VIB.strong,
    requireInteraction: true,
    renotify: true,
    timestamp: Date.now(),
    actions: [
      { action: 'show',    title: lbl('show',    lang) },
      { action: 'dismiss', title: lbl('dismiss', lang) },
    ],
    actionUrls: {
      show: ctx.url || '/',
    },
  };
}

function tripStarted(ctx) {
  const lang = ctx.lang || 'de';
  return {
    title: ctx.title,
    body:  ctx.body,
    url:   ctx.url || '/fahrtenbuch',
    icon:  '/icon-192.png',
    badge: '/badge.svg',
    tag:   `trip.${ctx.vehicleId || 'all'}`,
    vibrate: VIB.soft,
    silent: true, // keine Lockscreen-Störung — nur Notification-Center
    timestamp: Date.now(),
    actions: [
      { action: 'open', title: lbl('open', lang) },
    ],
    actionUrls: { open: ctx.url || '/fahrtenbuch' },
  };
}

function serviceReminder(ctx) {
  const lang = ctx.lang || 'de';
  return {
    title: ctx.title,
    body:  ctx.body,
    url:   ctx.url || '/maintenance-log',
    icon:  '/icon-192.png',
    badge: '/badge.svg',
    tag:   `service.${ctx.vehicleId || 'all'}`,
    requireInteraction: true,
    vibrate: VIB.medium,
    timestamp: Date.now(),
    actions: [
      { action: 'service',  title: lbl('service',  lang) },
      { action: 'snooze1d', title: lbl('snooze1d', lang) },
    ],
    actionUrls: { service: '/maintenance-log' },
  };
}

function logbookReminder(ctx) {
  const lang = ctx.lang || 'de';
  return {
    title: ctx.title,
    body:  ctx.body,
    url:   ctx.url || '/fahrtenbuch',
    icon:  '/icon-192.png',
    badge: '/badge.svg',
    tag:   `logbook.${ctx.date || 'today'}`,
    timestamp: Date.now(),
    actions: [
      { action: 'logbook', title: lbl('logbook', lang) },
      { action: 'snooze',  title: lbl('snooze',  lang) },
    ],
    actionUrls: { logbook: '/fahrtenbuch' },
  };
}

function legalChanged(ctx) {
  const lang = ctx.lang || 'de';
  return {
    title: ctx.title,
    body:  ctx.body,
    url:   ctx.url || '/legal/privacy',
    icon:  '/icon-192.png',
    badge: '/badge.svg',
    tag:   'legal',
    requireInteraction: true,
    timestamp: Date.now(),
    actions: [
      { action: 'accept', title: lbl('accept', lang) },
    ],
    actionUrls: { accept: ctx.url || '/legal/privacy' },
  };
}

function generic(ctx) {
  const lang = ctx.lang || 'de';
  return {
    title: ctx.title,
    body:  ctx.body,
    url:   ctx.url || '/',
    icon:  ctx.icon || '/icon-192.png',
    badge: '/badge.svg',
    tag:   ctx.tag || undefined,
    timestamp: Date.now(),
    actions: [
      { action: 'open',    title: lbl('open',    lang) },
      { action: 'dismiss', title: lbl('dismiss', lang) },
    ],
    actionUrls: { open: ctx.url || '/' },
  };
}

const RECIPES = {
  charging_complete: chargingComplete,
  battery_low:       batteryLow,
  sentry_alert:      sentryAlert,
  trip_started:      tripStarted,
  service_reminder:  serviceReminder,
  logbook_reminder:  logbookReminder,
  legal_changed:     legalChanged,
  generic,
};

/**
 * Liefert ein flaches Notification-Options-Objekt für den Service-Worker.
 *
 * @param {string} type   Event-Schlüssel aus RECIPES
 * @param {object} ctx    { lang, title, body, url, vehicleId, vin, … }
 * @returns {object} Payload, ready to JSON.stringify()
 */
export function buildPayload(type, ctx) {
  const recipe = RECIPES[type] || generic;
  return recipe(ctx || {});
}

export const SUPPORTED_EVENT_TYPES = Object.keys(RECIPES);
