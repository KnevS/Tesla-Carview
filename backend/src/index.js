import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initMasterDb, getAllTenants, getDb } from './db/database.js';
import { securityHeaders, apiRateLimit } from './middleware/security.js';
import { requireAuth } from './middleware/auth.js';
import { startPoller } from './services/poller.js';
import { startFleetTelemetryServer } from './services/fleetTelemetry.js';
import { getOrCreateVirtualKey } from './services/virtualKey.js';
import authRoutes             from './routes/auth.js';
import registerRoutes         from './routes/register.js';
import mfaRoutes              from './routes/mfa.js';
import userRoutes             from './routes/users.js';
import vehicleRoutes          from './routes/vehicles.js';
import tripRoutes             from './routes/trips.js';
import chargingRoutes         from './routes/charging.js';
import batteryRoutes          from './routes/battery.js';
import logbookRoutes          from './routes/logbook.js';
import notificationRoutes     from './routes/notifications.js';
import exportRoutes           from './routes/export.js';
import systemRoutes           from './routes/system.js';
import telemetryRoutes        from './routes/telemetry.js';
import telemetryConfigRoutes  from './routes/telemetryConfig.js';
import commandRoutes          from './routes/commands.js';
import chargingLocationRoutes from './routes/charging-locations.js';
import billingRoutes          from './routes/billing.js';
import setupRoutes            from './routes/setup.js';
import passkeyRoutes          from './routes/passkey.js';
import passwordResetRoutes    from './routes/password-reset.js';
import dataManagementRoutes   from './routes/data-management.js';

const app    = express();
const PORT   = process.env.PORT || 3000;
const server = http.createServer(app);

app.set('trust proxy', 1);

app.use(securityHeaders);
app.use(cors({
  origin:         process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(apiRateLimit);

// Datenbank initialisieren (migriert ggf. Legacy-DB)
initMasterDb();

// Tesla-Pflicht: Public-Key-Endpoint (öffentlich)
app.use('/.well-known/appspecific', telemetryConfigRoutes);

// Öffentliche Routen
app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: '2.0.0' }));
app.use('/api/setup',          setupRoutes);
app.use('/api/auth',           authRoutes);
app.use('/api/register',       registerRoutes);
app.use('/api/passkey',        passkeyRoutes);        // login-options + login-verify sind öffentlich
app.use('/api/password-reset', passwordResetRoutes);  // apply ist öffentlich

// Alle weiteren Routen benötigen einen gültigen JWT + Mandanten-DB (req.db)
app.use(requireAuth);
app.use('/api/mfa',                mfaRoutes);
app.use('/api/users',              userRoutes);
app.use('/api/vehicles',           vehicleRoutes);
app.use('/api/trips',              tripRoutes);
app.use('/api/charging',           chargingRoutes);
app.use('/api/battery',            batteryRoutes);
app.use('/api/logbook',            logbookRoutes);
app.use('/api/notifications',      notificationRoutes);
app.use('/api/export',             exportRoutes);
app.use('/api/system',             systemRoutes);
app.use('/api/telemetry',          telemetryRoutes);
app.use('/api/fleet',              telemetryConfigRoutes);
app.use('/api/commands',           commandRoutes);
app.use('/api/charging-locations', chargingLocationRoutes);
app.use('/api/billing',            billingRoutes);
app.use('/api/data',               dataManagementRoutes);

server.listen(PORT, async () => {
  console.log(`Tesla Carview Backend läuft auf Port ${PORT}`);

  // Virtual Key für alle Mandanten initialisieren
  for (const tenant of getAllTenants()) {
    try { getOrCreateVirtualKey(getDb(tenant.id)); } catch { /* ignore */ }
  }

  const tenants = getAllTenants();
  if (tenants.length === 0) {
    const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
    console.log('\n' + '='.repeat(56));
    console.log('  ERSTER START – Setup erforderlich!');
    console.log(`  Oeffne im Browser: ${frontendUrl}/setup`);
    console.log('='.repeat(56) + '\n');
  }

  try {
    await startFleetTelemetryServer(server);
  } catch (err) {
    console.error('[FleetTelemetry] Start fehlgeschlagen:', err.message);
  }

  if (process.env.ENABLE_POLLER !== 'false') {
    startPoller().catch(err => console.error('[Poller] Start fehlgeschlagen:', err.message));
  }
});
