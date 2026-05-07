import { Router } from 'express';
import { execSync } from 'child_process';
import os from 'os';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));
    return pkg.version ?? '1.0.0';
  } catch { return '1.0.0'; }
}

function getGitInfo() {
  try {
    const hash   = execSync('git rev-parse --short HEAD 2>/dev/null', { encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', { encoding: 'utf8' }).trim();
    const date   = execSync('git log -1 --format=%ci 2>/dev/null', { encoding: 'utf8' }).trim();
    return { hash, branch, date };
  } catch { return { hash: 'unknown', branch: 'unknown', date: null }; }
}

// Public version endpoint (anyone authenticated can see version)
router.get('/version', requireAuth, (_req, res) => {
  res.json({
    version: getVersion(),
    git: getGitInfo(),
    nodeVersion: process.version,
    uptime: process.uptime(),
  });
});

// Full system stats – admin only
router.get('/stats', requireAuth, (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Nur für Administratoren' });
  }

  const cpus    = os.cpus();
  const loadAvg = os.loadavg();
  const total   = os.totalmem();
  const free    = os.freemem();
  const used    = total - free;
  const cpuPct  = Math.min(100, (loadAvg[0] / cpus.length) * 100).toFixed(1);

  let dbSize = null;
  let dbStats = {};
  try {
    const db = req.db;
    const row = db.prepare("SELECT page_count * page_size AS size FROM pragma_page_count(), pragma_page_size()").get();
    dbSize = row?.size ?? null;
    dbStats = {
      trips:             db.prepare('SELECT COUNT(*) AS n FROM trips').get().n,
      charging_sessions: db.prepare('SELECT COUNT(*) AS n FROM charging_sessions').get().n,
      battery_snapshots: db.prepare('SELECT COUNT(*) AS n FROM battery_snapshots').get().n,
      logbook_entries:   db.prepare('SELECT COUNT(*) AS n FROM logbook_entries').get().n,
      audit_logs:        db.prepare('SELECT COUNT(*) AS n FROM audit_logs').get().n,
    };
  } catch { /* DB might not have all tables */ }

  res.json({
    system: {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadAvg,
      cpuCores: cpus.length,
      cpuModel: cpus[0]?.model ?? 'unknown',
      cpuUsagePct: Number(cpuPct),
      memory: {
        total, used, free,
        usedPct: ((used / total) * 100).toFixed(1),
      },
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      nodeVersion: process.version,
      memUsage: process.memoryUsage(),
    },
    database: { sizeByte: dbSize, records: dbStats },
    version: getVersion(),
    git: getGitInfo(),
  });
});

export default router;
