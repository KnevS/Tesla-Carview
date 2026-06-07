/**
 * /api/owntracks — Smartphone-GPS-Tracking via OwnTracks-App.
 *
 * Hintergrund: Tesla blockiert seit 2026 sowohl Owner-API-Tokens an Fleet
 * API (HTTP 401) als auch viele Vehicle-Endpoints an owner-api.teslamotors.com
 * (HTTP 412). Ohne Fleet-API-Approval gibt es keinen Weg zu GPS-Daten aus
 * dem Fahrzeug. OwnTracks (https://owntracks.org) ist eine Open-Source-App
 * für iOS+Android, die Location-Daten direkt an einen selbst-gehosteten
 * Endpoint pushed — ohne Drittanbieter, ohne Cloud, ohne Login.
 *
 * Architektur:
 *   • owntracks_devices liegt in master.db (pre-auth-Lookup per Token nötig)
 *   • Trips landen in der tenant-DB als source='owntracks'
 *   • Webhook-Auth nur über den device_token in der URL — kein JWT
 *   • Auto-Trip-State-Machine pro Device:
 *       moving (Speed > 5 km/h) + kein offener Trip  → Trip starten
 *       moving + offener Trip                        → Punkt anhängen
 *       stationär + offener Trip + >5 min            → Trip abschließen
 *
 * GET    /api/owntracks/devices         (admin) Geräte-Liste
 * POST   /api/owntracks/devices         (admin) Neues Gerät, gibt token+url zurück
 * PATCH  /api/owntracks/devices/:id     (admin) is_active/default_trip_type/label
 * DELETE /api/owntracks/devices/:id     (admin)
 * POST   /api/owntracks/webhook?token=… (kein Auth, OwnTracks-App-Format)
 */

import { Router }      from 'express';
import { randomBytes } from 'crypto';
import QRCode          from 'qrcode';
import { getMasterDb, getDb } from '../db/database.js';

const router = Router();

// Schwellen für die State-Machine — bewusst konservativ.
const MOVING_THRESHOLD_KMH = 5;
const STATIONARY_GRACE_S   = 5 * 60;

// Haversine-Distanz zwischen zwei GPS-Punkten in km.
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Virtueller Odometer: letzter end_odometer_km vom Fahrzeug, sonst der
// aktuelle Wert auf vehicles.odometer_km, sonst 0. OwnTracks kennt den
// Fahrzeug-Kilometerstand nicht — wir schätzen ihn über die GPS-Distanz.
function getVirtualOdometerKm(db, vehicleId) {
  const last = db.prepare(
    `SELECT end_odometer_km FROM trips
     WHERE vehicle_id=? AND end_odometer_km IS NOT NULL
     ORDER BY id DESC LIMIT 1`
  ).get(vehicleId);
  if (last?.end_odometer_km != null) return last.end_odometer_km;

  const v = db.prepare('SELECT odometer_km FROM vehicles WHERE id=?').get(vehicleId);
  return v?.odometer_km ?? 0;
}

// Distanz eines Trips aus den gespeicherten Track-Punkten neu berechnen.
function calcGpsDistanceKm(db, tripId) {
  const pts = db.prepare(
    'SELECT lat, lon FROM trip_points WHERE trip_id=? ORDER BY timestamp ASC'
  ).all(tripId);
  let km = 0;
  for (let i = 1; i < pts.length; i++) {
    km += haversineKm(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon);
  }
  return Math.round(km * 10) / 10;
}

// ── Webhook (kein Auth — Token in der Query) ─────────────────────────────────
//
// OwnTracks-App-Konfiguration:
//   URL: https://teslaview.example/api/owntracks/webhook?token=<device_token>
//   Method: POST
//   Auth: none (Token liegt in der URL)
//
// Antwortet immer mit `[]` — OwnTracks erwartet einen JSON-Array als
// "transitions to apply". Wir applizieren keine Transitions.
router.post('/webhook', (req, res) => {
  const token = String(req.query.token || '');
  if (!token || token.length < 16) return res.status(401).json([]);

  const master = getMasterDb();
  const device = master.prepare(
    `SELECT id, tenant_id, vehicle_id, user_id, default_trip_type,
            current_trip_id, stationary_since
     FROM owntracks_devices WHERE device_token=? AND is_active=1`
  ).get(token);
  if (!device) return res.status(401).json([]);

  const body = req.body || {};
  // last-ping immer stempeln — auch bei nicht-location-events.
  master.prepare('UPDATE owntracks_devices SET last_ping_at=unixepoch() WHERE id=?')
    .run(device.id);

  if (body._type !== 'location') return res.json([]);
  const lat = Number(body.lat), lon = Number(body.lon), vel = Number(body.vel || 0);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.json([]);
  }
  const ts = Number(body.tst) || Math.floor(Date.now() / 1000);
  const isMoving = vel > MOVING_THRESHOLD_KMH;

  let db;
  try { db = getDb(device.tenant_id); }
  catch (e) { console.error('[OwnTracks] tenant db error:', e.message); return res.json([]); }

  // ── State Machine ──────────────────────────────────────────────────────────
  if (isMoving) {
    if (!device.current_trip_id) {
      // Trip eröffnen
      const startOdo = getVirtualOdometerKm(db, device.vehicle_id);
      const info = db.prepare(
        `INSERT INTO trips
           (vehicle_id, start_time, start_lat, start_lon, start_odometer_km,
            source, trip_type, driver_id, is_manual)
         VALUES (?, ?, ?, ?, ?, 'owntracks', ?, ?, 0)`
      ).run(device.vehicle_id, ts, lat, lon, startOdo, device.default_trip_type, device.user_id);
      const tripId = info.lastInsertRowid;
      db.prepare(
        `INSERT INTO trip_points (trip_id, timestamp, lat, lon, speed_kmh)
         VALUES (?, ?, ?, ?, ?)`
      ).run(tripId, ts, lat, lon, vel);
      master.prepare(
        `UPDATE owntracks_devices
            SET current_trip_id=?, stationary_since=NULL WHERE id=?`
      ).run(tripId, device.id);
    } else {
      // Punkt anhängen + Stationär-Timer resetten
      db.prepare(
        `INSERT INTO trip_points (trip_id, timestamp, lat, lon, speed_kmh)
         VALUES (?, ?, ?, ?, ?)`
      ).run(device.current_trip_id, ts, lat, lon, vel);
      if (device.stationary_since) {
        master.prepare('UPDATE owntracks_devices SET stationary_since=NULL WHERE id=?')
          .run(device.id);
      }
    }
    return res.json([]);
  }

  // Stillstand
  if (!device.current_trip_id) return res.json([]);

  if (!device.stationary_since) {
    master.prepare('UPDATE owntracks_devices SET stationary_since=unixepoch() WHERE id=?')
      .run(device.id);
    return res.json([]);
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - device.stationary_since < STATIONARY_GRACE_S) return res.json([]);

  // Grace-Period abgelaufen → Trip schließen.
  const distKm = calcGpsDistanceKm(db, device.current_trip_id);
  const trip = db.prepare(
    'SELECT start_odometer_km FROM trips WHERE id=?'
  ).get(device.current_trip_id);
  const startOdo = trip?.start_odometer_km ?? 0;
  db.prepare(
    `UPDATE trips
        SET end_time=?, end_lat=?, end_lon=?, end_odometer_km=?, distance_km=?
      WHERE id=?`
  ).run(now, lat, lon, startOdo + distKm, distKm, device.current_trip_id);

  // Fahrzeug-Odometer-Schätzung nachziehen (best effort).
  try {
    db.prepare('UPDATE vehicles SET odometer_km=? WHERE id=?')
      .run(startOdo + distKm, device.vehicle_id);
  } catch { /* ignore */ }

  master.prepare(
    `UPDATE owntracks_devices
        SET current_trip_id=NULL, stationary_since=NULL WHERE id=?`
  ).run(device.id);

  return res.json([]);
});

// ── Self-Service-Setup: .otrc-Config + QR-Code (Token-basiert) ───────────
//
// Die OwnTracks-App (iOS+Android) kann ihre komplette Konfiguration aus
// einer JSON-Datei im "remoteconfig"-Format laden. Wir generieren die
// Datei pro Device dynamisch — der Token in der URL ist die Auth.
//
// Workflow fuer den Endnutzer:
//   1. iPhone-Kamera auf den QR-Code im Wizard halten
//   2. iOS erkennt den owntracks://config?url=… Deep-Link
//   3. Tippt auf "In OwnTracks oeffnen" → App importiert Konfiguration
//   4. Standortberechtigung auf "Immer" stellen, fertig
//
// Format-Doku: https://owntracks.org/booklet/features/remoteconfig/

function deviceFromToken(token) {
  if (!token || token.length < 16) return null;
  return getMasterDb().prepare(
    'SELECT id, label, device_token FROM owntracks_devices WHERE device_token=? AND is_active=1'
  ).get(token);
}

function publicBase(req) {
  return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
}

// Sicheres "device id" Slug-Mapping aus Label (max 16 Zeichen, ASCII).
function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'phone';
}

// GET /api/owntracks/config.otrc?token=<device_token>
// Liefert die JSON-Datei die OwnTracks ueber den Deep-Link importiert.
router.get('/config.otrc', (req, res) => {
  const device = deviceFromToken(req.query.token);
  if (!device) return res.status(401).json({ error: 'Token ungueltig oder Device deaktiviert' });

  const base = publicBase(req);
  const config = {
    _type:                'configuration',
    mode:                 3,                                       // 3 = HTTP-Mode
    url:                  `${base}/api/owntracks/webhook?token=${device.device_token}`,
    deviceId:             slugify(device.label),
    tid:                  slugify(device.label).slice(-2).toUpperCase() || 'TV',
    monitoring:           1,                                       // 1 = significant changes (akku-schonend)
    locatorInterval:      0,                                       // 0 = pure significant-changes
    locatorDisplacement:  200,                                     // alle 200 m ein Punkt
    auth:                 false,
    cmd:                  false,
    pubExtendedData:      true,                                    // erweiterte Telemetry (Speed, Heading, etc.)
    ignoreInaccurateLocations: 100,                                // GPS-Spikes >100m ignorieren
  };
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="teslaview-${slugify(device.label)}.otrc"`);
  res.json(config);
});

// GET /api/owntracks/qr.png?token=<device_token>
// QR-Code mit dem owntracks://-Deep-Link, scannbar mit der Kamera-App.
router.get('/qr.png', async (req, res) => {
  const device = deviceFromToken(req.query.token);
  if (!device) return res.status(401).end();

  const base = publicBase(req);
  const configUrl = `${base}/api/owntracks/config.otrc?token=${device.device_token}`;
  const deepLink  = `owntracks:///config?url=${encodeURIComponent(configUrl)}`;

  try {
    const png = await QRCode.toBuffer(deepLink, {
      width:           420,
      margin:          2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    });
    res.setHeader('Content-Type',  'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(png);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Devices verwalten: Self-Service fuer Fahrer + erweiterte Rechte fuer Admins ──
//
// Berechtigungsmodell:
//   Admin:      Sieht/verwaltet ALLE Geraete im Tenant. Kann fuer beliebige
//               vehicle_id + user_id anlegen (z.B. Geraet fuer einen anderen
//               Fahrer vorbereiten und ihm den QR-Code geben).
//   Fahrer:     Sieht/verwaltet NUR eigene Geraete (user_id = req.user.sub).
//               Beim Anlegen wird user_id IMMER auf req.user.sub geforcet
//               (egal was im Body steht). vehicle_id muss in vehicle_users
//               als zugewiesen markiert sein — sonst 403.

import { requireAuth } from '../middleware/auth.js';

function isAdmin(req) { return req.user?.role === 'admin'; }

router.get('/devices', requireAuth, (req, res) => {
  const master = getMasterDb();
  if (isAdmin(req)) {
    const rows = master.prepare(
      `SELECT id, vehicle_id, user_id, label, default_trip_type, is_active,
              current_trip_id, last_ping_at, created_at
       FROM owntracks_devices WHERE tenant_id=? ORDER BY created_at DESC`
    ).all(req.user.tenantId);
    return res.json(rows);
  }
  // Fahrer: nur eigene Geraete
  const rows = master.prepare(
    `SELECT id, vehicle_id, user_id, label, default_trip_type, is_active,
            current_trip_id, last_ping_at, created_at
     FROM owntracks_devices WHERE tenant_id=? AND user_id=? ORDER BY created_at DESC`
  ).all(req.user.tenantId, req.user.sub);
  res.json(rows);
});

router.post('/devices', requireAuth, (req, res) => {
  const { vehicle_id, user_id, label, default_trip_type } = req.body || {};
  const vid = Number(vehicle_id);
  // Fahrer kann nur fuer sich selbst anlegen; Admin frei.
  // Fallback: wenn Admin keine user_id mitschickt (z.B. Self-Service
  // ueber MyTracking.vue), gilt der eingeloggte User — sonst muss ein
  // Admin sich beim eigenen Device explizit selbst auswaehlen.
  const uid = isAdmin(req) && user_id ? Number(user_id) : req.user.sub;
  const lab = String(label || '').slice(0, 80).trim();
  const tt  = ['business', 'private', 'commute'].includes(default_trip_type) ? default_trip_type : 'business';
  if (!vid || !uid || !lab) return res.status(400).json({ error: 'vehicle_id, user_id, label erforderlich' });

  if (isAdmin(req)) {
    if (!req.db.prepare('SELECT 1 FROM vehicles WHERE id=?').get(vid)) {
      return res.status(400).json({ error: 'Fahrzeug nicht gefunden' });
    }
    if (!req.db.prepare('SELECT 1 FROM users WHERE id=?').get(uid)) {
      return res.status(400).json({ error: 'Benutzer nicht gefunden' });
    }
  } else {
    // Fahrer: vehicle muss in vehicle_users als zugewiesen sein.
    // Verhindert dass ein Fahrer GPS auf fremde Autos pushen kann.
    const allowed = req.db.prepare(
      'SELECT 1 FROM vehicle_users WHERE vehicle_id=? AND user_id=?'
    ).get(vid, uid);
    if (!allowed) return res.status(403).json({ error: 'Du hast keinen Zugriff auf dieses Fahrzeug' });
  }

  const token = randomBytes(32).toString('base64url');
  const master = getMasterDb();
  master.prepare(
    `INSERT INTO owntracks_devices
       (tenant_id, vehicle_id, user_id, device_token, label, default_trip_type)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(req.user.tenantId, vid, uid, token, lab, tt);

  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  res.json({
    token,
    webhook_url: `${base}/api/owntracks/webhook?token=${token}`,
  });
});

router.patch('/devices/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { is_active, default_trip_type, label } = req.body || {};
  const updates = [];
  const args    = [];
  if (typeof is_active === 'boolean') { updates.push('is_active=?');         args.push(is_active ? 1 : 0); }
  if (['business', 'private', 'commute'].includes(default_trip_type)) {
    updates.push('default_trip_type=?'); args.push(default_trip_type);
  }
  if (typeof label === 'string' && label.trim().length > 0) {
    updates.push('label=?'); args.push(label.slice(0, 80).trim());
  }
  if (!updates.length) return res.status(400).json({ error: 'Nichts zu ändern' });

  const where = isAdmin(req)
    ? 'WHERE tenant_id=? AND id=?'
    : 'WHERE tenant_id=? AND id=? AND user_id=?';
  args.push(req.user.tenantId, id);
  if (!isAdmin(req)) args.push(req.user.sub);

  const master = getMasterDb();
  const r = master.prepare(
    `UPDATE owntracks_devices SET ${updates.join(', ')} ${where}`
  ).run(...args);
  if (r.changes === 0) return res.status(404).json({ error: 'Gerät nicht gefunden oder kein Zugriff' });
  res.json({ ok: true });
});

router.delete('/devices/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const master = getMasterDb();
  const r = isAdmin(req)
    ? master.prepare('DELETE FROM owntracks_devices WHERE tenant_id=? AND id=?')
        .run(req.user.tenantId, id)
    : master.prepare('DELETE FROM owntracks_devices WHERE tenant_id=? AND id=? AND user_id=?')
        .run(req.user.tenantId, id, req.user.sub);
  if (r.changes === 0) return res.status(404).json({ error: 'Gerät nicht gefunden oder kein Zugriff' });
  res.json({ ok: true });
});

// GET /api/owntracks/devices/:id/token — Token einmalig abrufen
// Praktisch: Admin hat fuer einen Fahrer ein Device angelegt, der Token war
// nur einmal im Response sichtbar. Damit Admin (oder der Fahrer selbst) den
// QR-Code spaeter nochmal anzeigen kann, gibts diesen Endpoint mit den
// gleichen Zugriffsregeln wie GET /devices.
router.get('/devices/:id/token', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const master = getMasterDb();
  const row = isAdmin(req)
    ? master.prepare('SELECT device_token FROM owntracks_devices WHERE tenant_id=? AND id=?')
        .get(req.user.tenantId, id)
    : master.prepare('SELECT device_token FROM owntracks_devices WHERE tenant_id=? AND id=? AND user_id=?')
        .get(req.user.tenantId, id, req.user.sub);
  if (!row) return res.status(404).json({ error: 'Gerät nicht gefunden oder kein Zugriff' });
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  res.json({
    token:       row.device_token,
    webhook_url: `${base}/api/owntracks/webhook?token=${row.device_token}`,
  });
});

export default router;
