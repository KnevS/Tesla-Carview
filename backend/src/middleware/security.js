// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/**
 * Helmet setzt alle wichtigen HTTP-Security-Header:
 * CSP, HSTS, X-Frame-Options, X-Content-Type-Options etc.
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'https://*.tile.openstreetmap.org'],
      connectSrc: ["'self'", 'https://nominatim.openstreetmap.org', 'https://router.project-osrm.org'],
      fontSrc:    ["'self'"],
      objectSrc:  ["'none'"],
      frameSrc:   ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Sperrt Browser-APIs, die die App nicht braucht. Verhindert, dass
  // injizierter Code auf Kamera, Mikrofon, Geolocation etc. zugreift.
  permissionsPolicy: {
    features: {
      camera:          [],
      microphone:      [],
      geolocation:     [],
      payment:         [],
      usb:             [],
      bluetooth:       [],
      fullscreen:      ["'self'"],
      displayCapture:  [],
    },
  },
});

/** Strenge Begrenzung fuer Login-Versuche: 10 pro 15 Minuten pro IP */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Zu viele Anmeldeversuche. Bitte 15 Minuten warten.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/** Allgemeines API-Rate-Limit: 120 Anfragen pro Minute pro IP */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  message: { error: 'Rate-Limit ueberschritten. Bitte warten.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Sensitive Endpoints, die token-/code-basierte Zustellung haben
 *  (Reset, Invite-Accept, Webhook) — token-Entropie schuetzt ohnehin,
 *  aber Defense-in-Depth gegen Brute-Force-Versuche und Spam (Audit M6).
 *  Eng genug, dass legitime User nicht stoppen (5 in 5 min). */
export const sensitiveTokenRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  message: { error: 'Zu viele Versuche. Bitte 5 Minuten warten.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Setup-Endpoint: ein einzelner Bootstrap-Aufruf reicht. 3 pro IP
 *  pro Stunde verhindern Setup-Race-Hijack (Audit H3 — zusammen mit
 *  SETUP_TOKEN-Gate). */
export const setupRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  message: { error: 'Setup-Endpoint Rate-Limit. Bitte 1 Stunde warten.' },
  standardHeaders: true,
  legacyHeaders: false,
});
