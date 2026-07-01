// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import axios from 'axios';
import tls from 'tls';
import { readFileSync } from 'fs';
import { getPublicKeyPem } from '../services/virtualKey.js';
import { apiProxyPost } from '../services/teslaApi.js';
import { getAllTenants, getDb } from '../db/database.js';
import { getTenantSetting, setTenantSetting } from '../services/configService.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Ein Jahr abzüglich Puffer — Tesla lehnt exp > ~364 Tage ab
// ("expiration should be … less than …"), deshalb bewusst 360 Tage.
const TELEMETRY_EXP_SECONDS = 60 * 60 * 24 * 360;

// Wandelt ein DER-Zertifikat (Buffer) in einen PEM-Block.
function derToPem(raw) {
  const b64 = raw.toString('base64').match(/.{1,64}/g).join('\n');
  return `-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----`;
}

// Ruft die vom eigenen Host präsentierte TLS-Kette live ab: Leaf →
// Intermediate(s) → Root (Root stammt aus Nodes Trust-Store via
// issuerCertificate). Genau diese Kette braucht das Fahrzeug, um der
// TLS-Verbindung zum Telemetrie-Receiver zu vertrauen.
function fetchServerCaChain(hostname, port = 443) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host: hostname, port, servername: hostname, rejectUnauthorized: true },
      () => {
        const pems = [];
        const seen = new Set();
        let cert = socket.getPeerCertificate(true);
        while (cert && cert.raw && !seen.has(cert.fingerprint256)) {
          seen.add(cert.fingerprint256);
          pems.push(derToPem(cert.raw));
          const next = cert.issuerCertificate;
          if (!next || next === cert || seen.has(next.fingerprint256)) break;
          cert = next;
        }
        socket.end();
        pems.length
          ? resolve(pems.join('\n') + '\n')
          : reject(new Error('TLS-Handshake lieferte keine Zertifikate'));
      },
    );
    socket.once('error', reject);
    socket.setTimeout(10_000, () => socket.destroy(new Error('Timeout beim TLS-CA-Abruf')));
  });
}

// Ermittelt die CA-Kette für das `ca`-Feld der Fleet-Telemetry-Config.
// Tesla verlangt hier gültiges PEM — ein leerer String wird mit
// "ca is not a valid PEM" abgelehnt. Auflösungsreihenfolge:
//   1. TELEMETRY_CA       — komplette PEM-Kette direkt aus der Umgebung
//   2. TELEMETRY_CA_PATH  — Pfad zu einer PEM-Datei (z. B. gemountetes fullchain.pem)
//   3. Live-Abruf per TLS-Handshake gegen die eigene Domain
async function resolveTelemetryCa(hostname) {
  if (process.env.TELEMETRY_CA?.includes('BEGIN CERTIFICATE')) return process.env.TELEMETRY_CA;
  if (process.env.TELEMETRY_CA_PATH) return readFileSync(process.env.TELEMETRY_CA_PATH, 'utf8');
  return fetchServerCaChain(hostname, 443);
}

// Normalisiert FRONTEND_URL/Host-Header zu einem reinen Hostnamen
// (ohne Schema, Pfad, Port) — Tesla erwartet im config.hostname genau das.
function normalizeDomain(raw) {
  return (raw || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .toLowerCase();
}

// Tesla-Pflicht: Public-Key des ersten Mandanten (gemeinsame Domain → ein Key)
router.get('/com.tesla.3p.public-key.pem', (_req, res) => {
  try {
    const tenants = getAllTenants();
    if (!tenants.length) return res.status(503).send('Kein Mandant konfiguriert');
    const db  = getDb(tenants[0].id);
    const pem = getPublicKeyPem(db);
    res.type('text/plain').send(pem);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Status (nur für eingeloggte Nutzer, req.db verfügbar).
// Pro Fahrzeug:
//   - configured_at:    POST .../fleet_telemetry_config war einmal erfolgreich
//   - last_signal_at:   wann kam zuletzt ein Streaming-Paket vom Auto rein
//   - last_error:       Fehlertext vom letzten configure-Versuch, falls nicht ok
//   - status:           derived — green=live, yellow=registered-idle,
//                       red=not-registered, gray=approval-missing
// Frontend rendert den Status-Indikator pro VIN daraus.
// WICHTIG: Dieser Router ist in index.js an ZWEI Stellen gemountet —
// öffentlich unter /.well-known/appspecific (vor app.use(requireAuth), nötig
// damit Tesla den Public-Key abrufen kann) UND unter /api/fleet (hinter
// requireAuth). Damit die sensiblen Routen NICHT über den öffentlichen Mount
// unauthentifiziert erreichbar sind, schützen sie sich jeweils selbst per
// requireAuth/requireAdmin. Nur die Public-Key-GET-Route bleibt offen.
router.get('/telemetry/status', requireAuth, async (req, res) => {
  const db       = req.db;
  const key      = db.prepare('SELECT created_at FROM virtual_key ORDER BY id DESC LIMIT 1').get();
  const vehicles = db.prepare(
    `SELECT id, vin, display_name,
            telemetry_configured_at AS configured_at,
            telemetry_last_signal_at AS last_signal_at,
            telemetry_last_error    AS last_error
       FROM vehicles
       ORDER BY display_name`
  ).all();
  const now = Math.floor(Date.now() / 1000);
  const SIGNAL_FRESH_S = 15 * 60; // 15 min ohne Signal => idle, sonst aktiv

  for (const v of vehicles) {
    if (v.last_error && /(not approved|not enrolled|unauthorized client)/i.test(v.last_error)) {
      v.status = 'approval_missing';
    } else if (v.last_signal_at && (now - v.last_signal_at) <= SIGNAL_FRESH_S) {
      v.status = 'streaming';
    } else if (v.configured_at) {
      v.status = 'registered_idle';
    } else if (v.last_error) {
      v.status = 'error';
    } else {
      v.status = 'not_registered';
    }
  }

  res.json({
    virtual_key_exists:      !!key,
    virtual_key_created_at:  key?.created_at,
    registration_url: `https://tesla.com/_ak/${process.env.FRONTEND_URL?.replace(/^https?:\/\//, '')}`,
    vehicles,
  });
});

// Einmalige Partner-Registrierung bei Tesla (benötigt für fleet_telemetry_config)
//
// „Königsklasse": Der Admin tippt im Wizard nur Client-ID/Secret ein und
// bestätigt einmal die Domain — diesen Endpoint ruft TeslaView dann selbst
// auf und erledigt die komplette Partner-Registrierung (Client-Credentials-
// Token holen + POST /partner_accounts). Kein Terminal, kein curl.
//
// Sicherheits-Hygiene:
//   • Admin-only (requireAuth + requireAdmin), weil dieser Router auch
//     öffentlich unter /.well-known/appspecific gemountet ist (s. Hinweis bei
//     /telemetry/status). Ohne diese Guards wäre die Registrierung
//     unauthentifiziert auslösbar — mit den Operator-Credentials, die
//     getTenantSetting sonst aus der .env zieht.
//   • Die registrierte Domain wird AUSSCHLIESSLICH serverseitig bestimmt und
//     NIE aus dem Request-Body übernommen: FRONTEND_URL (die echte Betriebs-
//     Domain) gewinnt; nur falls die nicht gesetzt ist, dient der vom Server
//     beobachtete Host-Header als Fallback. Tesla verifiziert die Domain
//     ohnehin über den Public-Key unter
//     https://<domain>/.well-known/appspecific/com.tesla.3p.public-key.pem —
//     ein abweichender Wert kann so nie registriert werden.
//   • Client-Secret verlässt nie den Server: es wird serverseitig aus der
//     verschlüsselten tenant_settings gelesen und nur an Teslas Token-
//     Endpoint geschickt — niemals an das Frontend zurückgegeben.
router.post('/partner/register', requireAuth, requireAdmin, async (req, res) => {
  const clientId     = getTenantSetting(req.db, 'tesla.client_id', 'TESLA_CLIENT_ID');
  const clientSecret = getTenantSetting(req.db, 'tesla.client_secret', 'TESLA_CLIENT_SECRET');
  const audience     = getTenantSetting(req.db, 'tesla.audience', 'TESLA_AUDIENCE') || 'https://fleet-api.prd.eu.vn.cloud.tesla.com';
  const authBase     = getTenantSetting(req.db, 'tesla.auth_base', 'TESLA_AUTH_BASE') || 'https://auth.tesla.com/oauth2/v3';

  // Domain rein serverseitig: FRONTEND_URL ist autoritativ, sonst der vom
  // Server beobachtete Host-Header. Body wird bewusst NICHT gelesen.
  const domain = (process.env.FRONTEND_URL?.replace(/^https?:\/\//, '') || req.headers.host || '')
    .replace(/\/.*$/, '')        // evtl. Pfad abschneiden
    .replace(/:\d+$/, '')        // Port entfernen (Tesla erwartet reinen Hostnamen)
    .toLowerCase();

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'TESLA_CLIENT_ID / TESLA_CLIENT_SECRET nicht konfiguriert' });
  }
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return res.status(400).json({ error: `Ungültige Domain für die Registrierung: "${domain || '(leer)'}". Setze FRONTEND_URL oder gib eine gültige Domain an.` });
  }

  try {
    // 1. Partner-Token holen (client_credentials)
    const tokenRes = await axios.post(`${authBase}/token`, new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
      scope:         'openid vehicle_device_data vehicle_cmds vehicle_charging_cmds',
      audience,
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const partnerToken = tokenRes.data.access_token;

    // 2. App bei Tesla registrieren
    const regRes = await axios.post(`${audience}/api/1/partner_accounts`, {
      domain,
    }, {
      headers: { Authorization: `Bearer ${partnerToken}`, 'Content-Type': 'application/json' },
    });

    // Erfolg merken: das Wizard-/Settings-UI zeigt damit „✓ registriert für
    // <domain>" und kann eine Re-Registrierung bei Domain-Wechsel anbieten.
    setTenantSetting(req.db, 'tesla.partner_registered_domain', domain);
    setTenantSetting(req.db, 'tesla.partner_registered_at', String(Math.floor(Date.now() / 1000)));

    res.json({ ok: true, domain, response: regRes.data });
  } catch (err) {
    const status  = err.response?.status;
    const errData = err.response?.data;
    const msg = typeof errData === 'object' && errData !== null
      ? (errData.error || errData.message || JSON.stringify(errData))
      : status ? `HTTP ${status}` : err.message;
    res.status(500).json({ ok: false, error: msg });
  }
});

/** Konfiguriert das Streaming pro VIN bei Tesla. Wenn `req.params.vin`
 *  gesetzt ist, nur diese eine VIN; sonst alle Fahrzeuge des Mandanten.
 *  Ergebnis pro Fahrzeug landet im DB-Schema, damit das Frontend den
 *  Status-Indikator daraus speist. */
async function configureOne(db, v, domain, ca) {
  // WICHTIG: Anlegen/Aktualisieren ist der Fleet-Level-Endpoint
  //   POST /api/1/vehicles/fleet_telemetry_config   mit { vins:[…], config }.
  // Der per-VIN-Pfad /api/1/vehicles/{vin}/fleet_telemetry_config existiert
  // NUR für GET/DELETE; ein POST dorthin liefert einen Rails-HTML-404 (kein
  // Tesla-Fehler) — das wurde früher fälschlich als „nicht freigeschaltet"
  // interpretiert und schickte Nutzer grundlos in den Tesla-Support.
  const payload = {
    vins: [v.vin],
    config: {
      hostname: domain, port: 443, ca,
      fields: {
        Location:     { interval_seconds: 10 },
        VehicleSpeed: { interval_seconds: 5  },
        Gear:         { interval_seconds: 5  },
        Odometer:     { interval_seconds: 30 },
        Soc:          { interval_seconds: 10 },
        PackVoltage:  { interval_seconds: 10 },
        PackCurrent:  { interval_seconds: 10 },
      },
      // alert_types bewusst weggelassen: TeslaView wertet keine Alerts aus,
      // und ungültige Werte (früher 'autopilot') lässt Tesla die ganze
      // Config mit "alert_type … is invalid" ablehnen.
      exp: Math.floor(Date.now() / 1000) + TELEMETRY_EXP_SECONDS,
    },
  };
  try {
    const data = await apiProxyPost(db, `/api/1/vehicles/fleet_telemetry_config`, payload, 90000);

    // Tesla akzeptiert den Request (200), meldet aber pro VIN nicht
    // konfigurierbare Fahrzeuge in skipped_vehicles (fehlender Virtual Key,
    // nicht unterstützte HW/Firmware, Config-Limit erreicht). Das ist für
    // dieses Fahrzeug ein Fehler, kein Erfolg.
    const skipped = data?.response?.skipped_vehicles;
    const skipReasons = skipped
      ? Object.entries(skipped)
          .filter(([, vins]) => Array.isArray(vins) && vins.includes(v.vin))
          .map(([reason]) => reason)
      : [];
    if (skipReasons.length) {
      const msg = `Fahrzeug übersprungen: ${skipReasons.join(', ')}`;
      db.prepare('UPDATE vehicles SET telemetry_last_error = ? WHERE id = ?').run(msg.slice(0, 500), v.id);
      return { vin: v.vin, ok: false, error: msg };
    }

    db.prepare(
      'UPDATE vehicles SET telemetry_configured_at = ?, telemetry_last_error = NULL WHERE id = ?'
    ).run(Math.floor(Date.now() / 1000), v.id);
    return { vin: v.vin, ok: true, response: data };
  } catch (err) {
    const status  = err.response?.status;
    const errData = err.response?.data;
    // Echten Tesla-Fehler durchreichen (keine erfundene Interpretation mehr).
    const msg = typeof errData === 'object' && errData !== null
      ? (errData.error || errData.message || JSON.stringify(errData))
      : status
        ? `HTTP ${status}`
        : err.message;
    db.prepare(
      'UPDATE vehicles SET telemetry_last_error = ? WHERE id = ?'
    ).run(String(msg).slice(0, 500), v.id);
    return { vin: v.vin, ok: false, error: msg };
  }
}

router.post('/telemetry/configure', requireAuth, requireAdmin, async (req, res) => {
  const db       = req.db;
  const vehicles = db.prepare('SELECT * FROM vehicles').all();
  const domain   = normalizeDomain(process.env.FRONTEND_URL);
  let ca;
  try {
    ca = await resolveTelemetryCa(domain);
  } catch (e) {
    return res.status(500).json({ error: `CA-Kette konnte nicht ermittelt werden: ${e.message}. Alternativ TELEMETRY_CA_PATH oder TELEMETRY_CA setzen.` });
  }
  const results  = [];
  for (const v of vehicles) results.push(await configureOne(db, v, domain, ca));
  res.json({ results });
});

/** Single-VIN-Variante. Wird vom Settings-UI pro Fahrzeug aufgerufen,
 *  damit der Admin pro Auto ein- und ausschalten kann. */
router.post('/telemetry/configure/:vin', requireAuth, requireAdmin, async (req, res) => {
  const db = req.db;
  const v  = db.prepare('SELECT * FROM vehicles WHERE vin = ?').get(req.params.vin);
  if (!v) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
  const domain = normalizeDomain(process.env.FRONTEND_URL);
  let ca;
  try {
    ca = await resolveTelemetryCa(domain);
  } catch (e) {
    return res.status(500).json({ error: `CA-Kette konnte nicht ermittelt werden: ${e.message}. Alternativ TELEMETRY_CA_PATH oder TELEMETRY_CA setzen.` });
  }
  const result = await configureOne(db, v, domain, ca);
  res.status(result.ok ? 200 : 502).json(result);
});

export default router;
