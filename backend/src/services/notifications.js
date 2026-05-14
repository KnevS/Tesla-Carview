async function sendPush(db, vehicleId, title, body) {
  try {
    const subscriptions = db.prepare('SELECT * FROM push_subscriptions WHERE vehicle_id=?').all(vehicleId);
    if (!subscriptions.length) return;
    const webpush = await import('web-push').catch(() => null);
    if (!webpush) return;
    webpush.setVapidDetails(
      process.env.VAPID_CONTACT || 'mailto:noreply@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
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

    webpush.setVapidDetails(
      process.env.VAPID_CONTACT || 'mailto:noreply@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );

    await Promise.allSettled(
      subscriptions.map(sub => webpush.sendNotification(JSON.parse(sub.subscription_json), payload))
    );
  } catch (err) {
    console.error('[Notifications] Push fehlgeschlagen:', err.message);
  }
}
