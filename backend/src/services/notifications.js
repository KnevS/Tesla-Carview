import { getTenantSetting } from './configService.js';

async function sendPush(db, vehicleId, title, body) {
  try {
    const subscriptions = db.prepare('SELECT * FROM push_subscriptions WHERE vehicle_id=?').all(vehicleId);
    if (!subscriptions.length) return;
    const webpush = await import('web-push').catch(() => null);
    if (!webpush) return;
    const vapidPub  = getTenantSetting(db, 'vapid.public_key',  'VAPID_PUBLIC_KEY');
    const vapidPriv = getTenantSetting(db, 'vapid.private_key', 'VAPID_PRIVATE_KEY');
    const vapidCont = getTenantSetting(db, 'vapid.contact',     'VAPID_CONTACT') || 'mailto:noreply@example.com';
    if (!vapidPub || !vapidPriv) return;
    webpush.setVapidDetails(vapidCont, vapidPub, vapidPriv);
    const payload = JSON.stringify({ title, body, icon: '/favicon.ico' });
    await Promise.allSettled(subscriptions.map(sub => webpush.sendNotification(JSON.parse(sub.subscription_json), payload)));
  } catch (err) {
    console.error('[Notifications] Push fehlgeschlagen:', err.message);
  }
}

export { sendPush };

export async function sendChargingCompleteNotification(vehicle, charge, db) {
  // db optional: wenn nicht übergeben, kein Push
  if (!db) return;
  const subscriptions = db.prepare('SELECT * FROM push_subscriptions WHERE vehicle_id=?').all(vehicle.id);
  if (!subscriptions.length) return;

  const payload = JSON.stringify({
    title: `Laden abgeschlossen – ${vehicle.display_name}`,
    body:  `Batterie: ${charge?.battery_level ?? '?'}% | +${(charge?.charge_energy_added || 0).toFixed(1)} kWh geladen`,
    icon:  '/favicon.ico',
  });

  try {
    const webpush = await import('web-push').catch(() => null);
    if (!webpush) return;

    const vapidPub  = getTenantSetting(db, 'vapid.public_key',  'VAPID_PUBLIC_KEY');
    const vapidPriv = getTenantSetting(db, 'vapid.private_key', 'VAPID_PRIVATE_KEY');
    const vapidCont = getTenantSetting(db, 'vapid.contact',     'VAPID_CONTACT') || 'mailto:noreply@example.com';
    if (!vapidPub || !vapidPriv) return;
    webpush.setVapidDetails(vapidCont, vapidPub, vapidPriv);

    await Promise.allSettled(
      subscriptions.map(sub => webpush.sendNotification(JSON.parse(sub.subscription_json), payload))
    );
  } catch (err) {
    console.error('[Notifications] Push fehlgeschlagen:', err.message);
  }
}
