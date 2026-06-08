// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { getTenantSetting } from './configService.js';

/**
 * xAI Grok-Service — Streaming-Chat mit Fahrzeugkontext.
 *
 * API-kompatibel zur OpenAI-Chat-Completions-API (stream: true).
 * Budget-Check: summiert xai_usage.cost_ct fuer heute, wirft 402 bei Ueberschreitung.
 * Kosten-Schaetzung: grok-3-mini $0.30/M input + $0.50/M output → ~0.034ct/1k tokens
 */

const XAI_BASE = 'https://api.x.ai/v1';
const DEFAULT_MODEL  = 'grok-3-mini';
const DEFAULT_BUDGET = 100; // ct pro Tag

// grok-3-mini Preise in USD/M tokens → Umrechnung auf ct (1 USD ≈ 0.92 EUR, 1 EUR = 100ct)
const PRICE_IN_PER_M  = 0.30; // USD/M input tokens
const PRICE_OUT_PER_M = 0.50; // USD/M output tokens
const USD_TO_CT = 92;          // 1 USD ≈ 92ct

function tokensToCt(tokensIn, tokensOut) {
  return (tokensIn / 1_000_000 * PRICE_IN_PER_M + tokensOut / 1_000_000 * PRICE_OUT_PER_M) * USD_TO_CT;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getConfig(db) {
  const rows = db.prepare("SELECT key, value FROM tenant_settings WHERE key LIKE 'grok.%'").all();
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    model:     map['grok.model']      || DEFAULT_MODEL,
    budget_ct: parseFloat(map['grok.budget_ct'] ?? DEFAULT_BUDGET),
  };
}

export function getTodayUsage(db) {
  const today = todayDate();
  const row = db.prepare(
    'SELECT COALESCE(SUM(tokens_in),0) AS ti, COALESCE(SUM(tokens_out),0) AS to_, COALESCE(SUM(cost_ct),0) AS ct FROM xai_usage WHERE date=?'
  ).get(today);
  return { tokens_in: row.ti, tokens_out: row.to_, cost_ct: row.ct };
}

export function checkBudget(db) {
  const { budget_ct } = getConfig(db);
  const { cost_ct } = getTodayUsage(db);
  if (cost_ct >= budget_ct) {
    const err = new Error(`Tagesbudget von ${budget_ct}ct erreicht (${cost_ct.toFixed(1)}ct verbraucht)`);
    err.statusCode = 402;
    throw err;
  }
}

function recordUsage(db, tokensIn, tokensOut) {
  const ct = tokensToCt(tokensIn, tokensOut);
  db.prepare(
    'INSERT INTO xai_usage (date, tokens_in, tokens_out, cost_ct) VALUES (?, ?, ?, ?)'
  ).run(todayDate(), tokensIn, tokensOut, ct);
  return ct;
}

export function buildContext(db, vehicleId) {
  const parts = [];
  if (vehicleId) {
    const v = db.prepare('SELECT * FROM vehicles WHERE id=?').get(vehicleId);
    if (v) {
      parts.push(`Fahrzeug: ${v.display_name || v.model || 'Tesla'} (VIN: ${v.vin?.slice(-6) || '?'})`);
      if (v.odometer_km) parts.push(`Kilometerstand: ${Math.round(v.odometer_km).toLocaleString('de')} km`);
    }
    const lastTrip = db.prepare(
      'SELECT * FROM trips WHERE vehicle_id=? ORDER BY start_time DESC LIMIT 1'
    ).get(vehicleId);
    if (lastTrip) {
      const km = lastTrip.distance_km ? `${lastTrip.distance_km.toFixed(1)} km` : '?';
      const d = new Date(lastTrip.start_time * 1000).toLocaleDateString('de');
      parts.push(`Letzte Fahrt: ${d}, ${km}${lastTrip.purpose ? ', Zweck: ' + lastTrip.purpose : ''}`);
    }
    const lastCharge = db.prepare(
      'SELECT * FROM charging_sessions WHERE vehicle_id=? ORDER BY start_time DESC LIMIT 1'
    ).get(vehicleId);
    if (lastCharge) {
      const kwh = lastCharge.energy_kwh ? `${lastCharge.energy_kwh.toFixed(1)} kWh` : '?';
      const d = new Date(lastCharge.start_time * 1000).toLocaleDateString('de');
      parts.push(`Letzte Ladung: ${d}, ${kwh}`);
    }
  }
  return parts.length
    ? `Du bist ein Assistent für Tesla-Fahrzeugdaten. Kontext:\n${parts.join('\n')}`
    : 'Du bist ein Assistent für Tesla-Fahrzeugdaten.';
}

/**
 * Streamt eine xAI-Antwort als SSE an `res`.
 * Schreibt nach Abschluss Token-Verbrauch in xai_usage.
 *
 * @param {object} db        - Tenant-SQLite-Verbindung
 * @param {string} chatId    - grok_chats.id
 * @param {string} msgId     - grok_messages.id der Antwort (wird gespeichert)
 * @param {Array}  messages  - [{role, content}, ...] für die API
 * @param {object} res       - Express-Response (SSE)
 * @param {Function} onDone  - Callback(fullText, tokensIn, tokensOut)
 */
export async function streamChat(db, chatId, msgId, messages, res, onDone) {
  const apiKey = getTenantSetting(db, 'xai.api_key', 'XAI_API_KEY');
  if (!apiKey) {
    res.write(`data: ${JSON.stringify({ error: 'XAI_API_KEY nicht konfiguriert' })}\n\n`);
    res.end();
    return;
  }

  const { model } = getConfig(db);

  let upstream;
  try {
    upstream = await fetch(`${XAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ model, stream: true, messages }),
    });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: 'xAI nicht erreichbar: ' + err.message })}\n\n`);
    res.end();
    return;
  }

  if (!upstream.ok) {
    const body = await upstream.text();
    let errorPayload;
    if (upstream.status === 403) {
      try {
        const parsed = JSON.parse(body);
        const msg = parsed.error || parsed.message || '';
        if (msg.includes('credits') || msg.includes('licenses')) {
          const urlMatch = msg.match(/https:\/\/console\.x\.ai\/[^\s"]+/);
          errorPayload = {
            error: 'xai_billing',
            type: 'xai_billing',
            billingUrl: urlMatch ? urlMatch[0].replace(/\.$/, '') : 'https://console.x.ai',
          };
        }
      } catch { /* ignore parse errors */ }
    }
    if (!errorPayload) {
      errorPayload = { error: `xAI Fehler ${upstream.status}: ${body}` };
    }
    res.write(`data: ${JSON.stringify(errorPayload)}\n\n`);
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let tokensIn = 0;
  let tokensOut = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // letztes, potenziell unvollständiges Stück

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const chunk = JSON.parse(payload);
          const delta = chunk.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            fullText += delta;
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
          }
          // Usage kommt im letzten Chunk (stream_options usage)
          if (chunk.usage) {
            tokensIn  = chunk.usage.prompt_tokens     || 0;
            tokensOut = chunk.usage.completion_tokens || 0;
          }
        } catch { /* ignoriere fehlerhafte JSON-Zeilen */ }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Wenn xAI keine Usage-Daten liefert: grob schätzen
  if (!tokensIn) tokensIn = Math.ceil(messages.reduce((s, m) => s + m.content.length / 4, 0));
  if (!tokensOut) tokensOut = Math.ceil(fullText.length / 4);

  const costCt = recordUsage(db, tokensIn, tokensOut);
  res.write(`data: ${JSON.stringify({ done: true, cost_ct: costCt })}\n\n`);
  res.end();

  onDone(fullText, tokensIn, tokensOut);
}
