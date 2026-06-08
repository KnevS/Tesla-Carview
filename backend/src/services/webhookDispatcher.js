// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Outbound-Webhook-Dispatcher.
 *
 * Pro Mandant koennen Admins eine oder mehrere Ziel-URLs konfigurieren,
 * die bei bestimmten Lifecycle-Events einen JSON-POST mit HMAC-Signatur
 * empfangen. Aktuell unterstuetzte Events:
 *
 *   - trip.completed       (siehe services/dataSync.js)
 *   - charging.completed   (siehe services/dataSync.js)
 *   - service.due          (siehe services/serviceReminders.js)
 *   - test.ping            (manuell ueber /api/webhooks/:id/test)
 *
 * Sicherheit:
 * - Pro Webhook ein zufaelliger 32-byte-secret (hex), beim Anlegen
 *   einmalig erzeugt. Wird im X-TC-Signature-Header als
 *   `sha256=<hmac>` mitgeschickt — Empfaenger kann Authentizitaet
 *   verifizieren ohne weitere Auth.
 * - Best-effort: jeder POST in try/catch, 5s Timeout, der auslosende
 *   Flow (Sync, Reminder) wird NIE durch einen Webhook-Fehler unterbrochen.
 * - last_fired_at / last_status / last_error werden persistiert, damit
 *   Admin im UI sieht, ob die Ziel-Seite gerade nicht antwortet.
 */

import crypto from 'crypto';

const TIMEOUT_MS = 5000;

/** Zufaelliges 32-Byte Hex-Secret — kryptographisch sicher per
 *  Node-Crypto. Wird beim POST /api/webhooks vom System gesetzt. */
export function generateSecret() {
  return crypto.randomBytes(32).toString('hex');
}

/** HMAC-SHA256 Hex-Signatur. Wird im X-TC-Signature-Header als
 *  `sha256=<digest>` mitgeschickt — analog GitHub-Webhooks. */
function sign(secret, body) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function parseEvents(eventsJson) {
  try {
    const arr = JSON.parse(eventsJson || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Ein einzelner POST-Versuch mit Timeout. Aufrufer fangen Fehler ab. */
async function postOnce(url, body, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
      signal:  controller.signal,
    });
    return { ok: res.ok, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Dispatcht ein Event an alle aktiven Webhooks, die `eventName`
 * abonniert haben. Wirft nie — Fehler werden in last_error des
 * jeweiligen Webhooks geloggt.
 */
export async function dispatch(db, eventName, payload) {
  let hooks;
  try {
    hooks = db.prepare(
      'SELECT id, url, secret, events FROM webhooks WHERE is_active = 1'
    ).all();
  } catch {
    // webhooks-Tabelle fehlt — Migrations-Lag, kein Fehler nach aussen.
    return;
  }

  const body = JSON.stringify({
    event: eventName,
    timestamp: Math.floor(Date.now() / 1000),
    payload,
  });

  const update = db.prepare(
    'UPDATE webhooks SET last_fired_at=?, last_status=?, last_error=? WHERE id=?'
  );

  await Promise.allSettled(hooks.map(async hook => {
    const events = parseEvents(hook.events);
    if (!events.includes(eventName)) return;

    const headers = {
      'X-TC-Event':     eventName,
      'X-TC-Signature': `sha256=${sign(hook.secret, body)}`,
    };

    const firedAt = Math.floor(Date.now() / 1000);
    try {
      const r = await postOnce(hook.url, body, headers);
      update.run(firedAt, r.status, r.ok ? null : `HTTP ${r.status}`, hook.id);
    } catch (err) {
      // Timeouts/Network-Errors landen hier. Wir ueberschreiben
      // last_status mit 0, damit das UI „nicht erreicht" anzeigt.
      update.run(firedAt, 0, err?.message?.slice(0, 200) || 'fetch failed', hook.id);
    }
  }));
}

/** Test-Ping fuer einen einzelnen Webhook — von der Route /:id/test
 *  aufgerufen. Liefert {status, error} synchron zurueck, damit der
 *  Admin sofort sieht ob das Ziel antwortet. */
export async function testDispatch(db, hookId) {
  const hook = db.prepare(
    'SELECT id, url, secret FROM webhooks WHERE id = ?'
  ).get(hookId);
  if (!hook) return { ok: false, status: 0, error: 'webhook not found' };

  const body = JSON.stringify({
    event:     'test.ping',
    timestamp: Math.floor(Date.now() / 1000),
    payload:   { message: 'Tesla Carview webhook test ping' },
  });

  const update = db.prepare(
    'UPDATE webhooks SET last_fired_at=?, last_status=?, last_error=? WHERE id=?'
  );
  const firedAt = Math.floor(Date.now() / 1000);
  try {
    const r = await postOnce(hook.url, body, {
      'X-TC-Event':     'test.ping',
      'X-TC-Signature': `sha256=${sign(hook.secret, body)}`,
    });
    update.run(firedAt, r.status, r.ok ? null : `HTTP ${r.status}`, hook.id);
    return { ok: r.ok, status: r.status, error: r.ok ? null : `HTTP ${r.status}` };
  } catch (err) {
    const msg = err?.message?.slice(0, 200) || 'fetch failed';
    update.run(firedAt, 0, msg, hook.id);
    return { ok: false, status: 0, error: msg };
  }
}
