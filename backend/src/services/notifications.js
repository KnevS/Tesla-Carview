import { getDb } from '../db/database.js';

export async function sendChargingCompleteNotification(vehicle, charge) {
  const db = getDb();
  const subscriptions = db.prepare('SELECT * FROM push_subscriptions WHERE vehicle_id=?').all(vehicle.id);
  if (!subscriptions.length) return;

  const payload = JSON.stringify({
    title: `⚡ Laden abgeschlossen – ${vehicle.display_name}`,
    body: `Batterie: ${charge?.battery_level ?? '?'}% | +${(charge?.charge_energy_added || 0).toFixed(1)} kWh geladen`,
    icon: '/favicon.ico',
  });

  // Web Push Versand (falls webpush installiert)
  try {
    const webpush = await import('web-push').catch(() => null);
    if (!webpush) return;

    webpush.setVapidDetails(
      process.env.VAPID_CONTACT || 'mailto:noreply@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );

    await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(JSON.parse(sub.subscription_json), payload)
      )
    );
  } catch (err) {
    console.error('[Notifications] Push fehlgeschlagen:', err.message);
  }
}
