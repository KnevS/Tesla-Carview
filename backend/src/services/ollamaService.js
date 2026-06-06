/**
 * Ollama-Service — lokales LLM-Streaming als datensouveraene Alternative
 * zu xAI Grok.
 *
 * Ollama (https://ollama.com) ist eine selbst-hostbare LLM-Runtime, die
 * Modelle wie Llama 3, Qwen 2.5, Phi-3 etc. CPU- oder GPU-beschleunigt
 * lokal ausfuehrt. Datenfluss bleibt vollstaendig in der eigenen Infra:
 * Frage + Fahrzeugkontext + Antwort verlassen niemals den Server.
 *
 * Performance-Erwartung (Q4-quantisiert):
 *   • Pi 4 (4-8 GB):  llama3.2:1b ≈ 4-6 tok/s  — simple Q&A
 *   • Pi 5 (8 GB):    qwen2.5:3b  ≈ 4-6 tok/s  — empfohlen
 *   • VPS (8 vCPU):   qwen2.5:3b  ≈ 8-12 tok/s — komfortabel
 *
 * API-Kompatibilitaet: Ollama /api/chat akzeptiert OpenAI-Style messages
 * und streamt NDJSON-Chunks. Wir adaptieren das auf das gleiche SSE-
 * Format wie grokService.streamChat — Frontend bleibt unveraendert.
 */

import { getTenantSetting } from './configService.js';

// Default-URL: Process-ENV (gesetzt im docker-compose.prod.yml auf
// http://ollama:11434) > Container-Default localhost:11434. tenant_setting
// `ai.ollama_url` hat immer Vorrang vor beidem.
const DEFAULT_URL   = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen2.5:3b';
const HEALTH_TIMEOUT_MS = 3_000;
const STREAM_TIMEOUT_MS = 120_000;  // 2 min — kleinere Modelle koennen langsam sein

export function getConfig(db) {
  return {
    url:   getTenantSetting(db, 'ai.ollama_url',   null) || DEFAULT_URL,
    model: getTenantSetting(db, 'ai.ollama_model', null) || DEFAULT_MODEL,
  };
}

/**
 * Pingt den Ollama-Server, listet verfuegbare Modelle.
 * Returnt { ok, models?, error? } — Frontend zeigt damit den Status an.
 */
export async function healthCheck(db) {
  const { url, model } = getConfig(db);
  try {
    const r = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
    if (!r.ok) return { ok: false, error: `Ollama HTTP ${r.status}`, url };
    const data = await r.json();
    const models = (data.models || []).map(m => m.name);
    return {
      ok: true,
      url,
      models,
      configured_model: model,
      configured_model_available: models.includes(model),
    };
  } catch (e) {
    return { ok: false, error: e.message, url };
  }
}

/**
 * Streamt den Pull eines Modells als SSE an `res`.
 * Ollama liefert NDJSON mit { status, digest, total, completed } pro Layer.
 * Wir aggregieren das auf einen Gesamt-Fortschritt und schicken sparsame
 * SSE-Events: { status, percent, completed_mb, total_mb }.
 */
export async function streamPull(db, model, res) {
  const { url } = getConfig(db);

  let upstream;
  try {
    upstream = await fetch(`${url}/api/pull`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: model, stream: true }),
      // Pulls koennen GBs sein und auf Pi 4 ueber DSL > 30 Min dauern
      signal: AbortSignal.timeout(60 * 60 * 1000),
    });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: `Ollama nicht erreichbar (${url}): ${err.message}` })}\n\n`);
    res.end();
    return;
  }

  if (!upstream.ok) {
    const body = await upstream.text();
    res.write(`data: ${JSON.stringify({ error: `Pull fehlgeschlagen (${upstream.status}): ${body.slice(0, 200)}` })}\n\n`);
    res.end();
    return;
  }

  const reader  = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';
  let lastStatus = '';
  let lastPercent = -1;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const s = line.trim();
        if (!s) continue;
        try {
          const c = JSON.parse(s);
          // Status-Strings: "pulling manifest", "downloading <digest>", "verifying sha", "success" …
          const status = c.status || '';
          const total      = c.total      || 0;
          const completed  = c.completed  || 0;
          const percent    = total > 0 ? Math.floor(completed / total * 100) : null;

          // Nur emittieren wenn sich Status oder %-Stand wirklich aendert
          // (sonst flutet Ollama 50 Updates/s).
          if (status !== lastStatus || percent !== lastPercent) {
            res.write(`data: ${JSON.stringify({
              status,
              percent,
              completed_mb: completed ? Math.round(completed / 1024 / 1024) : null,
              total_mb:     total     ? Math.round(total     / 1024 / 1024) : null,
            })}\n\n`);
            lastStatus  = status;
            lastPercent = percent;
          }

          if (status === 'success') {
            res.write(`data: ${JSON.stringify({ done: true, model })}\n\n`);
            res.end();
            return;
          }
          if (c.error) {
            res.write(`data: ${JSON.stringify({ error: c.error })}\n\n`);
            res.end();
            return;
          }
        } catch { /* skip mal-formed */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
  // Stream zu Ende ohne success — sicherheitshalber done emittieren.
  res.write(`data: ${JSON.stringify({ done: true, model })}\n\n`);
  res.end();
}

/**
 * Streamt eine Ollama-Antwort als SSE an `res`.
 * Signatur kompatibel zu grokService.streamChat — Routen koennen
 * blind delegieren.
 *
 * onDone wird mit (fullText, tokensIn, tokensOut) aufgerufen.
 * Ollama liefert die Token-Counts im letzten Chunk (prompt_eval_count,
 * eval_count). Da lokal keine Kosten entstehen, wird cost_ct=0 emittiert.
 */
export async function streamChat(db, _chatId, _msgId, messages, res, onDone) {
  const { url, model } = getConfig(db);

  let upstream;
  try {
    upstream = await fetch(`${url}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model, messages, stream: true }),
      signal:  AbortSignal.timeout(STREAM_TIMEOUT_MS),
    });
  } catch (err) {
    const hint = err.name === 'TimeoutError'
      ? 'Timeout — Modell zu gross fuer die Hardware oder Server ueberlastet'
      : `nicht erreichbar (${url})`;
    res.write(`data: ${JSON.stringify({ error: `Ollama ${hint}: ${err.message}` })}\n\n`);
    res.end();
    return;
  }

  if (!upstream.ok) {
    const body = await upstream.text();
    let errorPayload;
    if (upstream.status === 404 && body.includes('model')) {
      errorPayload = {
        error: `Modell "${model}" in Ollama nicht gefunden. Installation: ollama pull ${model}`,
        type:  'ollama_model_missing',
      };
    } else {
      errorPayload = { error: `Ollama Fehler ${upstream.status}: ${body.slice(0, 200)}` };
    }
    res.write(`data: ${JSON.stringify(errorPayload)}\n\n`);
    res.end();
    return;
  }

  const reader  = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';
  let fullText  = '';
  let tokensIn  = 0;
  let tokensOut = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const s = line.trim();
        if (!s) continue;
        try {
          const chunk = JSON.parse(s);
          if (chunk.message?.content) {
            const delta = chunk.message.content;
            fullText += delta;
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
          }
          if (chunk.done) {
            tokensIn  = chunk.prompt_eval_count || 0;
            tokensOut = chunk.eval_count        || 0;
          }
        } catch { /* skip mal-formed line */ }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Local LLM = keine Kosten
  res.write(`data: ${JSON.stringify({ done: true, cost_ct: 0 })}\n\n`);
  res.end();

  onDone(fullText, tokensIn, tokensOut);
}
