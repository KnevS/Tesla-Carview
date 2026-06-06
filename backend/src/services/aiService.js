/**
 * AI-Service-Dispatcher — provider-agnostische Schicht oberhalb von
 * grokService und ollamaService.
 *
 * Wahl per tenant_setting `ai.provider`:
 *   • 'ollama' — lokaler LLM via Ollama (datensouveraen, kostenlos)
 *   • 'grok'   — xAI Grok (Cloud, pro Token bezahlt)
 *   • 'none'   — KI-Chat deaktiviert
 *
 * Auto-Migration fuer Bestandsinstallationen:
 *   wenn ai.provider unset und xai.api_key vorhanden → effektiv 'grok'
 *   wenn ai.provider unset und nichts konfiguriert  → 'none'
 *
 * Routen rufen weiterhin streamChat(db, chatId, msgId, messages, res, onDone);
 * der Dispatcher waehlt den richtigen Provider und delegiert. checkBudget
 * macht nur fuer Grok Sinn (Ollama ist lokal/kostenlos), wird also dort
 * geskippt.
 */

import { getTenantSetting } from './configService.js';
import * as grok            from './grokService.js';
import * as ollama          from './ollamaService.js';

export function getActiveProvider(db) {
  const explicit = getTenantSetting(db, 'ai.provider', null);
  if (explicit) return explicit;
  // Migrations-Default: hat die Instanz noch nie ai.provider gesetzt,
  // raten wir aus dem vorhandenen Setup. So bleibt der Chat fuer
  // Bestandsuser nahtlos funktional ohne neue Aktion.
  if (getTenantSetting(db, 'xai.api_key', 'XAI_API_KEY')) return 'grok';
  return 'none';
}

export function checkBudget(db) {
  if (getActiveProvider(db) === 'grok') return grok.checkBudget(db);
  // ollama / none: kein Budget-Limit
}

// buildContext ist provider-unabhaengig — gleiche Fahrzeug-Daten,
// gleiche Prompt-Vorlage. Wir leihen es einfach aus grokService.
export { buildContext } from './grokService.js';

export async function streamChat(db, chatId, msgId, messages, res, onDone) {
  const provider = getActiveProvider(db);
  if (provider === 'ollama') return ollama.streamChat(db, chatId, msgId, messages, res, onDone);
  if (provider === 'grok')   return grok.streamChat(db, chatId, msgId, messages, res, onDone);
  // 'none' oder unbekannt
  res.write(`data: ${JSON.stringify({
    error: 'Kein KI-Provider aktiv. Admin → Einrichtung → externe APIs → KI-Provider.',
    type:  'no_provider',
  })}\n\n`);
  res.end();
}

export async function healthCheck(db) {
  const provider = getActiveProvider(db);
  if (provider === 'ollama') {
    const h = await ollama.healthCheck(db);
    return { provider: 'ollama', ...h };
  }
  if (provider === 'grok') {
    const apiKey = getTenantSetting(db, 'xai.api_key', 'XAI_API_KEY');
    return { provider: 'grok', ok: !!apiKey, configured: !!apiKey };
  }
  return { provider: 'none', ok: false };
}
