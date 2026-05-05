import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { randomBytes } from 'crypto';
import { initDb } from './db/database.js';
import { securityHeaders, apiRateLimit } from './middleware/security.js';
import { requireAuth } from './middleware/auth.js';
import { startPoller } from './services/poller.js';
import { createUser, findUserByUsername } from './services/userService.js';
import authRoutes        from './routes/auth.js';
import mfaRoutes         from './routes/mfa.js';
import userRoutes        from './routes/users.js';
import vehicleRoutes     from './routes/vehicles.js';
import tripRoutes        from './routes/trips.js';
import chargingRoutes    from './routes/charging.js';
import batteryRoutes     from './routes/battery.js';
import logbookRoutes     from './routes/logbook.js';
import notificationRoutes from './routes/notifications.js';
import exportRoutes      from './routes/export.js';

const app  = express();
const PORT = process.env.PORT || 3000;

// Vertraue dem vorgelagerten Nginx-Proxy fuer korrekte Client-IPs
app.set('trust proxy', 1);

app.use(securityHeaders);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(apiRateLimit);

initDb();

// Oeffentliche Routen (kein User-Auth noetig)
app.use('/api/auth', authRoutes);

// Alle weiteren Routen benoetigen einen gueltigen JWT
app.use(requireAuth);
app.use('/api/mfa',           mfaRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/vehicles',      vehicleRoutes);
app.use('/api/trips',         tripRoutes);
app.use('/api/charging',      chargingRoutes);
app.use('/api/battery',       batteryRoutes);
app.use('/api/logbook',       logbookRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/export',        exportRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0' }));

app.listen(PORT, async () => {
  console.log(`Tesla Carview Backend laeuft auf Port ${PORT}`);
  await bootstrapAdmin();
  if (process.env.ENABLE_POLLER !== 'false') {
    startPoller().catch(err => console.error('[Poller] Start fehlgeschlagen:', err.message));
  }
});

/**
 * Beim ersten Start: Admin-Benutzer mit Zufallspasswort anlegen.
 * Das Passwort wird einmalig in der Konsole ausgegeben.
 */
async function bootstrapAdmin() {
  if (findUserByUsername('admin')) return;
  const password = randomBytes(16).toString('hex');
  await createUser('admin', password, 'admin');
  console.log('\n' + '='.repeat(56));
  console.log('  ERSTER START - Admin-Zugangsdaten:');
  console.log(`  Benutzername : admin`);
  console.log(`  Passwort     : ${password}`);
  console.log('  Bitte sofort nach dem Login aendern!');
  console.log('='.repeat(56) + '\n');
}
