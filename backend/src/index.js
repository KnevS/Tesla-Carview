import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db/database.js';
import { startPoller } from './services/poller.js';
import authRoutes from './routes/auth.js';
import vehicleRoutes from './routes/vehicles.js';
import tripRoutes from './routes/trips.js';
import chargingRoutes from './routes/charging.js';
import batteryRoutes from './routes/battery.js';
import logbookRoutes from './routes/logbook.js';
import notificationRoutes from './routes/notifications.js';
import exportRoutes from './routes/export.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

initDb();

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/charging', chargingRoutes);
app.use('/api/battery', batteryRoutes);
app.use('/api/logbook', logbookRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/export', exportRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0' }));

app.listen(PORT, () => {
  console.log(`Tesla Carview Backend läuft auf Port ${PORT}`);
  // Poller nur starten wenn Authentifizierung vorhanden
  if (process.env.ENABLE_POLLER !== 'false') {
    startPoller().catch(err => console.error('[Poller] Start fehlgeschlagen:', err.message));
  }
});
