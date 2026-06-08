// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Grok-Chat-Routen — /api/grok/*
 *
 * Alle Endpunkte erfordern gültigen JWT (requireAuth ist in index.js global gemountet).
 * SSE-Stream via POST /api/grok/chats/:id/stream
 */

import { Router } from 'express';
import { randomUUID } from 'crypto';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getTenantSetting, setTenantSetting } from '../services/configService.js';
import { getTodayUsage } from '../services/grokService.js';
// Provider-Wahl macht der Dispatcher; Routen kennen Grok/Ollama nicht direkt.
import { buildContext, checkBudget, streamChat, getActiveProvider, healthCheck } from '../services/aiService.js';
import { healthCheck as ollamaHealth, streamPull as ollamaPull } from '../services/ollamaService.js';

// Kuratierte Modell-Empfehlungen nach Hardware-Klasse — wird vom
// Wizard zur Auto-Auswahl angezeigt. Reihenfolge: kleiner -> groesser.
// disk_mb ≈ Q4-quantisierte Modellgroesse, ram_mb ≈ benoetigter Inferenz-RAM.
const RECOMMENDED_MODELS = [
  { name: 'llama3.2:1b',  disk_mb: 1300, ram_mb: 1500, for_hardware: 'Pi 4 (4 GB)',           speed: 'schnell, einfache Antworten' },
  { name: 'qwen2.5:1.5b', disk_mb: 1000, ram_mb: 1800, for_hardware: 'Pi 4 (8 GB)',           speed: 'schnell, bessere Qualitaet als llama3.2:1b' },
  { name: 'qwen2.5:3b',   disk_mb: 2000, ram_mb: 3000, for_hardware: 'Pi 5, VPS ab 4 GB',     speed: 'empfohlener Standard' },
  { name: 'phi3:3.8b',    disk_mb: 2300, ram_mb: 3500, for_hardware: 'Pi 5, VPS ab 4 GB',     speed: 'staerker bei Logik/Code' },
  { name: 'llama3:8b',    disk_mb: 4700, ram_mb: 6500, for_hardware: 'VPS ab 8 GB, GPU',       speed: 'sehr gut, langsamer' },
  { name: 'qwen2.5:7b',   disk_mb: 4400, ram_mb: 6000, for_hardware: 'VPS ab 8 GB, GPU',       speed: 'sehr gut, langsamer' },
];

const router = Router();

// GET /api/grok/chats?vehicleId=
router.get('/chats', (req, res) => {
  const { vehicleId } = req.query;
  let chats;
  if (vehicleId) {
    chats = req.db.prepare(
      'SELECT * FROM grok_chats WHERE vehicle_id=? ORDER BY updated_at DESC LIMIT 50'
    ).all(vehicleId);
  } else {
    chats = req.db.prepare(
      'SELECT * FROM grok_chats ORDER BY updated_at DESC LIMIT 50'
    ).all();
  }
  res.json(chats);
});

// POST /api/grok/chats
router.post('/chats', (req, res) => {
  const { vehicleId, title } = req.body;
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  req.db.prepare(
    'INSERT INTO grok_chats (id, vehicle_id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, vehicleId || null, req.user.sub, title || 'Neuer Chat', now, now);
  res.status(201).json(req.db.prepare('SELECT * FROM grok_chats WHERE id=?').get(id));
});

// PATCH /api/grok/chats/:id  (Titel umbenennen)
router.patch('/chats/:id', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title erforderlich' });
  const now = Math.floor(Date.now() / 1000);
  const info = req.db.prepare(
    'UPDATE grok_chats SET title=?, updated_at=? WHERE id=?'
  ).run(title, now, req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Chat nicht gefunden' });
  res.json({ ok: true });
});

// DELETE /api/grok/chats/:id
router.delete('/chats/:id', (req, res) => {
  const info = req.db.prepare('DELETE FROM grok_chats WHERE id=?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Chat nicht gefunden' });
  res.json({ ok: true });
});

// GET /api/grok/chats/:id/messages
router.get('/chats/:id/messages', (req, res) => {
  const chat = req.db.prepare('SELECT * FROM grok_chats WHERE id=?').get(req.params.id);
  if (!chat) return res.status(404).json({ error: 'Chat nicht gefunden' });
  const messages = req.db.prepare(
    'SELECT * FROM grok_messages WHERE chat_id=? ORDER BY created_at'
  ).all(req.params.id);
  res.json({ chat, messages });
});

// POST /api/grok/chats/:id/stream — SSE-Stream
router.post('/chats/:id/stream', async (req, res) => {
  const chat = req.db.prepare('SELECT * FROM grok_chats WHERE id=?').get(req.params.id);
  if (!chat) return res.status(404).json({ error: 'Chat nicht gefunden' });

  const { content, includeContext } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content erforderlich' });

  try {
    checkBudget(req.db);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }

  // SSE-Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const now = Math.floor(Date.now() / 1000);

  // User-Nachricht speichern
  const userMsgId = randomUUID();
  req.db.prepare(
    'INSERT INTO grok_messages (id, chat_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(userMsgId, chat.id, 'user', content.trim(), now);

  // Chat-Verlauf laden (max. 20 Nachrichten)
  const history = req.db.prepare(
    'SELECT role, content FROM grok_messages WHERE chat_id=? ORDER BY created_at DESC LIMIT 20'
  ).all(chat.id).reverse();

  // Systemkontext aufbauen
  const systemContent = includeContext !== false
    ? buildContext(req.db, chat.vehicle_id)
    : 'Du bist ein Assistent für Tesla-Fahrzeugdaten.';

  const messages = [
    { role: 'system', content: systemContent },
    ...history,
  ];

  const assistantMsgId = randomUUID();

  await streamChat(req.db, chat.id, assistantMsgId, messages, res,
    (fullText, tokensIn, tokensOut) => {
      if (!fullText) return;
      const ts = Math.floor(Date.now() / 1000);
      req.db.prepare(
        'INSERT INTO grok_messages (id, chat_id, role, content, tokens_in, tokens_out, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(assistantMsgId, chat.id, 'assistant', fullText, tokensIn, tokensOut, ts);

      // Titel aus erster User-Nachricht ableiten (wenn noch Standard-Titel)
      if (chat.title === 'Neuer Chat') {
        const autoTitle = content.trim().slice(0, 60);
        req.db.prepare('UPDATE grok_chats SET title=?, updated_at=? WHERE id=?').run(autoTitle, ts, chat.id);
      } else {
        req.db.prepare('UPDATE grok_chats SET updated_at=? WHERE id=?').run(ts, chat.id);
      }
    }
  );
});

// GET /api/grok/config — prüft ob XAI_API_KEY konfiguriert ist (gibt Key nie zurück)
router.get('/config', requireAuth, (req, res) => {
  const key = getTenantSetting(req.db, 'xai.api_key', 'XAI_API_KEY');
  res.json({ configured: !!key });
});

// PUT /api/grok/config — setzt XAI API Key (Admin)
router.put('/config', requireAuth, requireAdmin, (req, res) => {
  const { xai_api_key } = req.body;
  if (xai_api_key === '' || xai_api_key == null) {
    setTenantSetting(req.db, 'xai.api_key', null);
    return res.json({ configured: false });
  }
  if (typeof xai_api_key !== 'string' || xai_api_key.length < 8) {
    return res.status(400).json({ error: 'Ungültiger API-Key' });
  }
  setTenantSetting(req.db, 'xai.api_key', xai_api_key);
  res.json({ configured: true, masked: xai_api_key.slice(0, 6) + '…' + xai_api_key.slice(-4) });
});

// GET /api/grok/usage
router.get('/usage', (req, res) => {
  const usage = getTodayUsage(req.db);
  const budget = (() => {
    const row = req.db.prepare("SELECT value FROM tenant_settings WHERE key='grok.budget_ct'").get();
    return parseFloat(row?.value ?? 100);
  })();
  res.json({ ...usage, budget_ct: budget, date: new Date().toISOString().slice(0, 10) });
});

// ── KI-Provider-Wahl (Ollama lokal vs Grok cloud vs aus) ─────────────────
//
// Default-Migration laeuft transparent: hat die Instanz Grok konfiguriert
// und ai.provider noch nicht gesetzt, antwortet getActiveProvider 'grok'
// und der Chat funktioniert wie bisher. Erst wenn der Admin hier explizit
// 'ollama' waehlt, geht der Chat ueber Ollama.

// GET /api/grok/ai-config — aktuelle Wahl + Ollama-Einstellungen + Health
router.get('/ai-config', requireAuth, async (req, res) => {
  const provider = getActiveProvider(req.db);
  const xaiKey   = getTenantSetting(req.db, 'xai.api_key', 'XAI_API_KEY');
  res.json({
    provider,
    grok_configured: !!xaiKey,
    ollama_url:    getTenantSetting(req.db, 'ai.ollama_url',   null) || 'http://localhost:11434',
    ollama_model:  getTenantSetting(req.db, 'ai.ollama_model', null) || 'qwen2.5:3b',
  });
});

// PUT /api/grok/ai-config — Provider + Ollama-Settings setzen (Admin)
router.put('/ai-config', requireAuth, requireAdmin, (req, res) => {
  const { provider, ollama_url, ollama_model } = req.body || {};
  if (provider && !['ollama', 'grok', 'none'].includes(provider)) {
    return res.status(400).json({ error: 'provider muss ollama|grok|none sein' });
  }
  if (provider) setTenantSetting(req.db, 'ai.provider', provider);
  if (typeof ollama_url === 'string') {
    const u = ollama_url.trim();
    if (u && !/^https?:\/\//.test(u)) return res.status(400).json({ error: 'ollama_url muss mit http(s):// beginnen' });
    setTenantSetting(req.db, 'ai.ollama_url', u || null);
  }
  if (typeof ollama_model === 'string') {
    setTenantSetting(req.db, 'ai.ollama_model', ollama_model.trim() || null);
  }
  res.json({ ok: true });
});

// GET /api/grok/ai-health — Health-Check des aktuellen Providers
router.get('/ai-health', requireAuth, async (req, res) => {
  res.json(await healthCheck(req.db));
});

// GET /api/grok/ollama-health — explizit Ollama (auch wenn aktuell 'grok')
//   damit Admin bei Provider-Wahl im UI vorab pruefen kann ob Ollama laeuft
router.get('/ollama-health', requireAuth, async (req, res) => {
  res.json(await ollamaHealth(req.db));
});

// GET /api/grok/ollama-recommended — kuratierte Modell-Vorschlaege fuer
// die Wizard-Auswahl. Statische Liste; bewusst nicht aus Ollama-Library
// gezogen, damit wir verlaesslich nur getestete Modelle anbieten.
router.get('/ollama-recommended', requireAuth, (_req, res) => {
  res.json(RECOMMENDED_MODELS);
});

// POST /api/grok/ollama-pull — Modell installieren (Admin), SSE-Progress
router.post('/ollama-pull', requireAuth, requireAdmin, async (req, res) => {
  const model = String(req.body?.model || '').trim();
  if (!model || !/^[a-zA-Z0-9_.:-]+$/.test(model)) {
    return res.status(400).json({ error: 'Ungueltiger Modellname' });
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  await ollamaPull(req.db, model, res);
});

export default router;
