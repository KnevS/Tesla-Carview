/**
 * /api/notices — System-weite Benachrichtigungen für Bestands-Installationen.
 *
 * Wozu: Wenn TeslaView via Update auf eine neue Version springt, bei der
 * sich relevant was geaendert hat (z.B. Tesla-API-Status 2026), soll der
 * Admin beim naechsten Login darueber informiert werden — ohne dass er
 * den CHANGELOG lesen muss.
 *
 * Aktuell hartkodiert: ein einziger Notice `tesla_api_2026`. Wenn weitere
 * dazukommen, NOTICES-Array erweitern.
 *
 * Persistierung: Dismissal pro Tenant via tenant_settings
 *   notices.<id>.dismissed_at = unix-seconds
 * Bei Mehrnutzer-Setups klickt EIN Admin dismiss → fuer alle weg.
 *
 * GET    /api/notices                — Liste der noch nicht dismissed Notices
 * POST   /api/notices/:id/dismiss    — Notice ausblenden (Admin)
 */

import { Router } from 'express';
import { requireAuth }  from '../middleware/auth.js';
import { getTenantSetting, setTenantSetting } from '../services/configService.js';

const router = Router();

// Hartkodierte Liste — bei jedem relevanten Tesla-Status- oder Setup-Change
// hier einen neuen Eintrag mit eindeutiger ID hinzufuegen.
const NOTICES = [
  {
    id: 'tesla_api_2026',
    severity: 'info',  // 'info' | 'warn' | 'critical'
    de: {
      title: '⚠️ Wichtig: Tesla hat 2026 die Owner API geschlossen',
      body:
        'Tesla hat im Mai/Juni 2026 den Community-Workaround für Owner-API-Tokens an Vehicle-Endpoints deaktiviert. ' +
        'Wer ohne Fleet-API-Approval lief, bekommt jetzt HTTP 401 statt Fahrzeugdaten.\n\n' +
        'TeslaView hat dafür zwei Lösungen integriert:\n' +
        '• 📱 OwnTracks-Integration für Smartphone-GPS-Tracking — sofort verfügbar, ohne Tesla-API\n' +
        '• ✍ Manuelle Fahrzeug-Anlage im Setup-Wizard — Fahrzeuge ohne Tesla-Sync\n\n' +
        'Wenn du auf Tesla Fleet API wartest: TeslaView ist vollständig vorbereitet, sobald die App-Genehmigung von Tesla kommt, läuft alles wie zuvor.\n\n' +
        'Mehr Details im Wizard → Schritt 2 (Tesla-Verbindung) und in der README.',
      cta_label: 'Setup-Wizard öffnen',
      cta_path:  '/setup',
    },
    en: {
      title: '⚠️ Important: Tesla closed the Owner API in 2026',
      body:
        'In May/June 2026 Tesla disabled the community workaround for Owner-API tokens at vehicle endpoints. ' +
        'Anyone running without Fleet API approval now gets HTTP 401 instead of vehicle data.\n\n' +
        'TeslaView ships two solutions for this:\n' +
        '• 📱 OwnTracks integration for smartphone GPS tracking — works immediately, no Tesla API needed\n' +
        '• ✍ Manual vehicle entry in the setup wizard — add vehicles without Tesla sync\n\n' +
        'If you are waiting for Tesla Fleet API: TeslaView is fully prepared, as soon as Tesla approves the app everything works as before.\n\n' +
        'More details in the wizard → Step 2 (Tesla connection) and in the README.',
      cta_label: 'Open setup wizard',
      cta_path:  '/setup',
    },
  },
];

router.get('/', requireAuth, (req, res) => {
  const active = NOTICES.filter(n =>
    !getTenantSetting(req.db, `notices.${n.id}.dismissed_at`, null)
  );
  res.json(active);
});

router.post('/:id/dismiss', requireAuth, (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren' });
  const notice = NOTICES.find(n => n.id === req.params.id);
  if (!notice) return res.status(404).json({ error: 'Notice nicht gefunden' });
  setTenantSetting(req.db, `notices.${notice.id}.dismissed_at`, String(Math.floor(Date.now() / 1000)));
  res.json({ ok: true });
});

export default router;
