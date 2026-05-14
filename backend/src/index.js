import 'dotenv/config';
import http from 'http';
import { readFileSync } from 'fs';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initMasterDb, getAllTenants, getDb } from './db/database.js';
import { securityHeaders, apiRateLimit } from './middleware/security.js';
import { requireAuth } from './middleware/auth.js';
import { startPoller } from './services/poller.js';
import { startServiceReminderScheduler } from './services/serviceReminders.js';
import { startDemoLifecycle } from './services/demoLifecycle.js';
import { startNightlyMaintenance } from './services/nightlyMaintenance.js';
import demoRoutes from './routes/demo.js';
import { ensureDemoTenant } from './db/database.js';
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
import geofenceRoutes         from './routes/geofences.js';
import billingRoutes          from './routes/billing.js';
import setupRoutes            from './routes/setup.js';
import passkeyRoutes          from './routes/passkey.js';
import passwordResetRoutes    from './routes/password-reset.js';
import dataManagementRoutes   from './routes/data-management.js';
import inviteRoutes            from './routes/invites.js';
import driverRoutes            from './routes/drivers.js';
import teslaUsageRoutes, { webhookRouter as teslaUsageWebhookRouter } from './routes/teslaUsage.js';
import { publicRouter as legalPublicRoutes, authedRouter as legalAuthedRoutes } from './routes/legal.js';
import userInviteRoutes from './routes/userInvites.js';
import serviceIntervalRoutes from './routes/serviceIntervals.js';
import auditRoutes from './routes/audit.js';
import tariffRoutes from './routes/tariff.js';
import webhookRoutes from './routes/webhooks.js';
import grokRoutes from './routes/grok.js';
import savedRoutesRoutes from './routes/savedRoutes.js';
import routingRoutes from './routes/routing.js';
import pairRoutes from './routes/pair.js';

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

// Version aus package.json einlesen — Single Source of Truth fuer alle
// version-anzeigenden Endpoints (Health, /api/system/version, Footer).
// Beim Start einmalig gecached: package.json aendert sich zur Laufzeit nicht.
const APP_VERSION = (() => {
  try { return JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version; }
  catch { return 'unknown'; }
})();

// Öffentliche Routen
app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: APP_VERSION }));
app.use('/api/setup',          setupRoutes);
app.use('/api/auth',           authRoutes);
app.use('/api/register',       registerRoutes);
app.use('/api/passkey',        passkeyRoutes);        // login-options + login-verify sind öffentlich
app.use('/api/password-reset', passwordResetRoutes);  // apply ist öffentlich
app.use('/api/invites/validate', inviteRoutes);        // validate/:token ist öffentlich
app.use('/api/tesla-usage', teslaUsageWebhookRouter);   // /webhook/email — header-secret
app.use('/api/legal',       legalPublicRoutes);          // GET /legal/{scope}/{locale} — Imprint/Privacy/Terms public
app.use('/api/user-invites', userInviteRoutes);            // /:token/validate (GET) + /:token/accept (POST) — public
app.use('/api/demo',        demoRoutes);                    // signup + status — public, only active when DEMO_ENABLED=true
app.use('/api/pair',       pairRoutes);                     // QR-Pair-Login: init + poll + info + confirm — public

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
app.use('/api/geofences',          geofenceRoutes);
app.use('/api/billing',            billingRoutes);
app.use('/api/data',               dataManagementRoutes);
app.use('/api/invites',            inviteRoutes);
app.use('/api/drivers',            driverRoutes);
app.use('/api/tesla-usage',        teslaUsageRoutes);
app.use('/api/legal',              legalAuthedRoutes);   // /accept, /acceptance-status, /admin/* (admin nutzt requireAdmin intern)
app.use('/api/service-intervals',  serviceIntervalRoutes);
app.use('/api/audit',              auditRoutes);
app.use('/api/tariff',             tariffRoutes);
app.use('/api/webhooks',           webhookRoutes);
app.use('/api/grok',               grokRoutes);
app.use('/api/saved-routes',       savedRoutesRoutes);
app.use('/api/routing',            routingRoutes);

// Globaler Error-Handler — fängt alle ungehandelten Throws/Rejects der Routes
app.use((err, _req, res, _next) => {
  // Errors mit eigenem statusCode (z. B. TeslaBudgetExceededError) sauber durchreichen
  if (err && err.statusCode) {
    console.warn(`[${err.name || 'AppError'}]`, err.message);
    return res.status(err.statusCode).json({
      error:  err.message,
      code:   err.name,
      detail: err.detail,
    });
  }
  console.error('[Unhandled]', err);
  res.status(500).json({ error: 'Interner Serverfehler', detail: err.message });
});

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
  startServiceReminderScheduler();
  // Naechtliche Hygiene (~03:30 Europe/Berlin) — sichere App-interne
  // Wartung. Auto-Update aus Git ist opt-in via AUTO_UPDATE_ENABLED=true.
  startNightlyMaintenance();
  // Demo-Mandant + Lifecycle nur, wenn explizit aktiviert.
  if (process.env.DEMO_ENABLED === 'true') {
    try { ensureDemoTenant(); }
    catch (err) { console.error('[Demo] Tenant-Init fehlgeschlagen:', err.message); }
    startDemoLifecycle();
  }
});
