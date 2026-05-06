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
      connectSrc: ["'self'"],
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
});

/** Strenge Begrenzung fuer Login-Versuche: max. 10 pro 15 Minuten pro IP */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Zu viele Anmeldeversuche. Bitte 15 Minuten warten.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/** Allgemeines API-Rate-Limit: max. 120 Anfragen pro Minute pro IP */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Rate-Limit ueberschritten. Bitte warten.' },
  standardHeaders: true,
  legacyHeaders: false,
});
