// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Auto-Init für neue oder bestehende Mandanten.
 *
 * Ziel: alles, was keine User-Entscheidung braucht, wird ohne Wizard-Frage
 * vom System selbst erzeugt. So zeigt der Admin-Setup-Wizard später nur
 * noch die Schritte, die wirklich eine Eingabe brauchen.
 *
 * Aktuell:
 *   • VAPID-Keys: werden generiert, falls weder in tenant_settings noch in
 *     der globalen .env vorhanden. Public Push funktioniert dadurch sofort
 *     nach dem ersten Login — ohne dass jemand „Generate" klickt.
 *
 * Aufrufstellen:
 *   • src/index.js → beim Boot für alle existierenden Mandanten
 *   • src/routes/setup.js → direkt nach createTenant() für den neuen Mandanten
 *
 * Idempotent: alle Schritte prüfen erst, ob bereits etwas konfiguriert ist,
 * und tun nur dann etwas. Mehrfaches Aufrufen ist unkritisch.
 */
import { getDb } from '../db/database.js';

/**
 * Stellt sicher, dass für den Mandanten alle „kein-Entscheidung"-Defaults
 * gesetzt sind. Wirft nie nach außen — Auto-Init darf das Booten nicht
 * blockieren, falls ein Schritt scheitert.
 *
 * @param {string} tenantId
 * @returns {Promise<{vapid_generated:boolean}>}
 */
export async function ensureTenantAutoInit(tenantId) {
  const result = { vapid_generated: false };
  try {
    const db = getDb(tenantId);

    // ── VAPID ─────────────────────────────────────────────────────────
    const vapidRow = db.prepare(
      "SELECT key, value FROM tenant_settings WHERE key IN ('vapid.public_key','vapid.private_key')"
    ).all();
    const haveDbPub  = vapidRow.some(r => r.key === 'vapid.public_key'  && r.value);
    const haveDbPriv = vapidRow.some(r => r.key === 'vapid.private_key' && r.value);
    const haveEnv    = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

    if (!((haveDbPub && haveDbPriv) || haveEnv)) {
      try {
        const webPush = await import('web-push');
        const generateVAPIDKeys = webPush.generateVAPIDKeys ?? webPush.default?.generateVAPIDKeys;
        if (typeof generateVAPIDKeys !== 'function') {
          throw new Error('web-push.generateVAPIDKeys nicht verfügbar');
        }
        const keys = generateVAPIDKeys();
        const upsert = db.prepare(
          "INSERT INTO tenant_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
        );
        upsert.run('vapid.public_key',  keys.publicKey);
        upsert.run('vapid.private_key', keys.privateKey);
        result.vapid_generated = true;
        console.log(`[AutoInit] VAPID-Keys für Mandant ${tenantId.slice(0,8)}… generiert.`);
      } catch (err) {
        console.warn(`[AutoInit] VAPID-Generierung für ${tenantId.slice(0,8)}… fehlgeschlagen:`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[AutoInit] Fehler bei Mandant ${String(tenantId).slice(0,8)}…:`, err.message);
  }
  return result;
}

/**
 * Wird beim Backend-Start für alle bekannten Mandanten aufgerufen.
 * Nicht-blockierend: Fehler einzelner Mandanten kippen nicht den Boot.
 */
export async function runAutoInitForAllTenants(tenants) {
  if (!Array.isArray(tenants) || tenants.length === 0) return;
  const results = await Promise.allSettled(
    tenants.map(t => ensureTenantAutoInit(t.id))
  );
  const generated = results.filter(r => r.status === 'fulfilled' && r.value.vapid_generated).length;
  if (generated > 0) {
    console.log(`[AutoInit] ${generated} Mandant(en) automatisch initialisiert.`);
  }
}
