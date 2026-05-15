<template>
  <div class="grok-layout">
    <!-- Sidebar: Chat-Liste -->
    <aside class="grok-sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <div class="sidebar-header">
        <h2 class="sidebar-title">{{ $t('grok.title') }}</h2>
        <button class="btn-primary sidebar-new" @click="createChat" :disabled="creating">
          <AppIcon name="plus" :size="16" />
          {{ $t('grok.newChat') }}
        </button>
      </div>

      <!-- Budget-Badge -->
      <div class="budget-bar" :class="budgetClass"
        v-tooltip="$t('grok.budgetTooltip')">
        <AppIcon name="sparkles" :size="14" />
        <span>{{ formatCt(usage.cost_ct) }} / {{ formatCt(usage.budget_ct) }}</span>
        <span class="budget-label">{{ $t('grok.budgetLabel') }}</span>
      </div>

      <div class="chat-list">
        <div v-if="chatsLoading" class="sidebar-empty text-gray-500">{{ $t('grok.loading') }}</div>
        <div v-else-if="!chats.length" class="sidebar-empty text-gray-500">{{ $t('grok.emptyState') }}</div>
        <button
          v-for="chat in chats"
          :key="chat.id"
          class="chat-item"
          :class="{ active: activeChatId === chat.id }"
          @click="selectChat(chat.id)"
        >
          <span class="chat-item-title">{{ chat.title }}</span>
          <button class="chat-delete icon-btn-danger" @click.stop="deleteChat(chat.id)" :title="$t('grok.deleteChat')" :aria-label="$t('grok.deleteChat')">
            <AppIcon name="trash" :size="13" />
          </button>
        </button>
      </div>
    </aside>

    <!-- Hauptbereich -->
    <main class="grok-main">
      <!-- Mobile: Sidebar-Toggle + Neuer Chat -->
      <div class="mobile-bar">
        <button class="icon-btn" @click="sidebarOpen = !sidebarOpen" :aria-label="$t('grok.title')">
          <AppIcon name="logbook" :size="18" />
        </button>
        <span class="mobile-title">{{ activeChat?.title || $t('grok.title') }}</span>
        <button class="btn-primary btn-sm" @click="createChat" :disabled="creating" :aria-label="$t('grok.newChat')">
          <AppIcon name="plus" :size="14" />
        </button>
      </div>

      <!-- Kein Chat gewählt -->
      <div v-if="!activeChatId" class="grok-welcome">
        <AppIcon name="sparkles" :size="48" class="welcome-icon" />
        <h1>{{ $t('grok.title') }}</h1>
        <p>{{ $t('grok.welcomeHint') }}</p>
        <button class="btn-primary" @click="createChat" :disabled="creating">
          {{ $t('grok.newChat') }}
        </button>
      </div>

      <!-- Chat-Bereich -->
      <template v-else>
        <!-- Nachrichten -->
        <div class="messages-container" ref="messagesEl">
          <div v-if="msgsLoading" class="msg-loading text-gray-400">{{ $t('grok.loading') }}</div>

          <div v-for="msg in messages" :key="msg.id" class="message" :class="msg.role">
            <div class="msg-bubble">
              <div class="msg-content" v-html="renderContent(msg.content)" />
              <div v-if="msg.role === 'assistant' && msg.tokens_out" class="msg-meta">
                {{ msg.tokens_in + msg.tokens_out }} tokens
              </div>
            </div>
          </div>

          <!-- Streaming-Antwort -->
          <div v-if="streaming" class="message assistant">
            <div class="msg-bubble streaming">
              <div class="msg-content" v-html="renderContent(streamingText)" />
              <span class="cursor" />
            </div>
          </div>

          <div v-if="errorMsg && errorType !== 'xai_billing'" class="msg-error">{{ errorMsg }}</div>

          <div v-if="errorType === 'xai_billing'" class="msg-billing-error">
            <div class="billing-error-icon">
              <AppIcon name="alert" :size="22" />
            </div>
            <div class="billing-error-body">
              <strong class="billing-error-title">{{ $t('grok.errorBillingTitle') }}</strong>
              <p class="billing-error-text">{{ $t('grok.errorBillingBody') }}</p>
              <a :href="errorBillingUrl" target="_blank" rel="noopener noreferrer" class="billing-error-btn">
                {{ $t('grok.errorBillingBtn') }}
              </a>
            </div>
          </div>
        </div>

        <!-- Budget-Warnung -->
        <div v-if="budgetExceeded" class="budget-exceeded">
          <AppIcon name="alert" :size="16" />
          {{ $t('grok.budgetExceeded') }}
        </div>

        <!-- Eingabezeile -->
        <div class="input-bar">
          <!-- Kontext-Toggle -->
          <button
            class="context-toggle icon-btn"
            :class="{ active: includeContext }"
            @click="includeContext = !includeContext"
            :title="$t('grok.contextToggle')"
            :aria-label="$t('grok.contextToggle')"
          >
            <AppIcon name="gauge" :size="16" />
          </button>

          <textarea
            ref="inputEl"
            v-model="inputText"
            class="chat-input"
            :placeholder="$t('grok.placeholder')"
            rows="1"
            :disabled="streaming || budgetExceeded"
            @keydown.enter.exact.prevent="send"
            @input="autoResize"
          />

          <!-- Voice-Input (Web Speech API) -->
          <button
            v-if="hasSpeech"
            class="icon-btn"
            :class="{ 'text-tesla-red': listening }"
            @click="toggleSpeech"
            :title="listening ? $t('grok.stopListening') : $t('grok.startListening')"
            :aria-label="listening ? $t('grok.stopListening') : $t('grok.startListening')"
          >
            <AppIcon name="mic" :size="18" />
          </button>

          <button class="btn-primary send-btn" @click="send"
            :disabled="!inputText.trim() || streaming || budgetExceeded"
            v-tooltip="$t('grok.sendTooltip')"
            :aria-label="$t('grok.send')">
            <AppIcon name="send" :size="16" />
          </button>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useAppStore } from '../store/index.js';
import { useAuthStore } from '../store/auth.js';
import api from '../api.js';
import AppIcon from '../components/AppIcon.vue';

const appStore = useAppStore();
const authStore = useAuthStore();

// State
const chats = ref([]);
const chatsLoading = ref(false);
const activeChatId = ref(null);
const messages = ref([]);
const msgsLoading = ref(false);
const inputText = ref('');
const streaming = ref(false);
const streamingText = ref('');
const errorMsg = ref('');
const errorType = ref('');
const errorBillingUrl = ref('');
const creating = ref(false);
const sidebarOpen = ref(false);
const includeContext = ref(true);
const messagesEl = ref(null);
const inputEl = ref(null);
const usage = ref({ cost_ct: 0, budget_ct: 100, tokens_in: 0, tokens_out: 0 });
const listening = ref(false);

const activeChat = computed(() => chats.value.find(c => c.id === activeChatId.value));
const budgetExceeded = computed(() => usage.value.cost_ct >= usage.value.budget_ct);
const budgetPct = computed(() => Math.min(100, (usage.value.cost_ct / (usage.value.budget_ct || 1)) * 100));
const budgetClass = computed(() => {
  if (budgetPct.value >= 100) return 'budget-full';
  if (budgetPct.value >= 75) return 'budget-warn';
  return '';
});

const vehicleId = computed(() => appStore.selectedVehicle?.id || null);
const hasSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

let recognition = null;

function formatCt(val) {
  return (val ?? 0).toFixed(1) + 'ct';
}

function renderContent(text) {
  if (!text) return '';
  // Einfaches Markdown: **bold**, `code`, newlines
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\n/g, '<br>');
}

async function loadChats() {
  chatsLoading.value = true;
  try {
    const params = vehicleId.value ? { vehicleId: vehicleId.value } : {};
    const { data } = await api.get('/grok/chats', { params });
    chats.value = data;
  } finally {
    chatsLoading.value = false;
  }
}

async function loadUsage() {
  try {
    const { data } = await api.get('/grok/usage');
    usage.value = data;
  } catch { /* non-fatal */ }
}

async function selectChat(id) {
  activeChatId.value = id;
  sidebarOpen.value = false;
  msgsLoading.value = true;
  errorMsg.value = '';
  errorType.value = '';
  errorBillingUrl.value = '';
  try {
    const { data } = await api.get(`/grok/chats/${id}/messages`);
    messages.value = data.messages;
    await nextTick();
    scrollToBottom();
  } finally {
    msgsLoading.value = false;
  }
}

async function createChat() {
  creating.value = true;
  try {
    const { data } = await api.post('/grok/chats', { vehicleId: vehicleId.value });
    chats.value.unshift(data);
    await selectChat(data.id);
  } finally {
    creating.value = false;
  }
}

async function deleteChat(id) {
  await api.delete(`/grok/chats/${id}`);
  chats.value = chats.value.filter(c => c.id !== id);
  if (activeChatId.value === id) {
    activeChatId.value = null;
    messages.value = [];
  }
}

async function send() {
  const text = inputText.value.trim();
  if (!text || streaming.value || budgetExceeded.value) return;

  inputText.value = '';
  autoResize();
  errorMsg.value = '';
  errorType.value = '';
  errorBillingUrl.value = '';

  // User-Nachricht optimistisch anzeigen
  const tempId = 'tmp-' + Date.now();
  messages.value.push({ id: tempId, role: 'user', content: text, created_at: Date.now() / 1000 });
  await nextTick();
  scrollToBottom();

  streaming.value = true;
  streamingText.value = '';

  try {
    const resp = await fetch(`/api/grok/chats/${activeChatId.value}/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: text, includeContext: includeContext.value }),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(body.error || `Fehler ${resp.status}`);
    }

    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        try {
          const ev = JSON.parse(payload);
          if (ev.delta) {
            streamingText.value += ev.delta;
            await nextTick();
            scrollToBottom();
          }
          if (ev.done) {
            await loadUsage();
          }
          if (ev.error) {
            if (ev.type === 'xai_billing') {
              errorType.value = 'xai_billing';
              errorBillingUrl.value = ev.billingUrl || 'https://console.x.ai';
              errorMsg.value = 'billing';
            } else {
              errorType.value = '';
              errorMsg.value = ev.error;
            }
          }
        } catch { /* ignoriere */ }
      }
    }

    // Endgültige Nachricht laden
    const { data } = await api.get(`/grok/chats/${activeChatId.value}/messages`);
    messages.value = data.messages;
    // Chat-Titel ggf. aktualisiert
    const updated = data.chat;
    const idx = chats.value.findIndex(c => c.id === updated.id);
    if (idx !== -1) chats.value[idx] = updated;

  } catch (err) {
    errorType.value = '';
    errorBillingUrl.value = '';
    errorMsg.value = err.message;
    // Temporäre User-Nachricht entfernen bei Fehler
    messages.value = messages.value.filter(m => m.id !== tempId);
  } finally {
    streaming.value = false;
    streamingText.value = '';
    await nextTick();
    scrollToBottom();
  }
}

function scrollToBottom() {
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
}

function autoResize() {
  if (!inputEl.value) return;
  inputEl.value.style.height = 'auto';
  inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 120) + 'px';
}

function toggleSpeech() {
  if (listening.value) {
    recognition?.stop();
    listening.value = false;
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = navigator.language || 'de-DE';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = e => {
    inputText.value += e.results[0][0].transcript + ' ';
  };
  recognition.onend = () => { listening.value = false; };
  recognition.onerror = () => { listening.value = false; recognition = null; };
  try {
    recognition.start();
    listening.value = true;
  } catch {
    listening.value = false;
    recognition = null;
  }
}

onMounted(async () => {
  await Promise.all([loadChats(), loadUsage()]);
});

watch(vehicleId, () => { loadChats(); });
</script>

<style scoped>
.grok-layout {
  display: flex;
  height: calc(100dvh - 5.5rem);
  gap: 0;
  overflow: hidden;
}

/* Sidebar */
.grok-sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--tesla-surface, #1a1a1a);
  border-right: 1px solid rgba(255,255,255,0.08);
  overflow: hidden;
}

.sidebar-header {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.sidebar-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--tesla-text, #e5e7eb);
  margin: 0;
}

.sidebar-new {
  width: 100%;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  padding: 0.45rem 0.75rem;
}

.budget-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  color: #9ca3af;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.budget-bar.budget-warn { color: #f59e0b; }
.budget-bar.budget-full { color: #ef4444; }

.budget-label { margin-left: auto; opacity: 0.6; }

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.sidebar-empty {
  padding: 1rem;
  font-size: 0.85rem;
  text-align: center;
}

.chat-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  border: none;
  background: transparent;
  color: var(--tesla-text, #e5e7eb);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 0.85rem;
}

.chat-item:hover { background: rgba(255,255,255,0.07); }
.chat-item.active { background: rgba(229,57,53,0.12); color: #ef5350; }

.chat-item-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-delete {
  opacity: 0;
  padding: 0.25rem;
  border-radius: 0.25rem;
  min-width: 28px;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chat-item:hover .chat-delete { opacity: 1; }

/* Touch-Geraete (Tesla-Browser, iPhone) haben kein hover → immer sichtbar */
@media (hover: none) {
  .chat-delete { opacity: 0.5; }
}

/* Main */
.grok-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.mobile-bar {
  display: none;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: var(--tesla-surface, #1a1a1a);
}

.mobile-title {
  flex: 1;
  font-weight: 600;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-sm { padding: 0.35rem 0.6rem; font-size: 0.8rem; }

/* Welcome */
.grok-welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
}

.welcome-icon { opacity: 0.3; }

.grok-welcome h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--tesla-text, #e5e7eb);
  margin: 0;
}

/* Messages */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  display: flex;
}
.message.user    { justify-content: flex-end; }
.message.assistant { justify-content: flex-start; }

.msg-bubble {
  max-width: 78%;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  font-size: 0.9rem;
  line-height: 1.5;
  position: relative;
}

.message.user .msg-bubble {
  background: rgba(229,57,53,0.18);
  border-bottom-right-radius: 0.25rem;
}

.message.assistant .msg-bubble {
  background: rgba(255,255,255,0.06);
  border-bottom-left-radius: 0.25rem;
}

.msg-bubble.streaming {
  background: rgba(255,255,255,0.06);
  border-bottom-left-radius: 0.25rem;
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: currentColor;
  margin-left: 2px;
  vertical-align: middle;
  animation: blink 0.8s step-end infinite;
}

@keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }

.msg-meta {
  font-size: 0.7rem;
  opacity: 0.4;
  margin-top: 0.35rem;
}

.msg-error {
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 0.5rem;
  padding: 0.6rem 0.9rem;
  color: #fca5a5;
  font-size: 0.85rem;
}

.msg-loading { font-size: 0.85rem; padding: 1rem; }

.msg-billing-error {
  display: flex;
  gap: 0.9rem;
  align-items: flex-start;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 0.75rem;
  padding: 1rem 1.1rem;
  color: #fde68a;
}

.billing-error-icon {
  flex-shrink: 0;
  color: #f59e0b;
  margin-top: 0.1rem;
}

.billing-error-body {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.88rem;
  line-height: 1.5;
}

.billing-error-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #fef3c7;
}

.billing-error-text {
  margin: 0;
  color: #fde68a;
  opacity: 0.9;
}

.billing-error-btn {
  display: inline-block;
  margin-top: 0.35rem;
  padding: 0.4rem 0.85rem;
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.45);
  border-radius: 0.45rem;
  color: #fde68a;
  text-decoration: none;
  font-size: 0.83rem;
  font-weight: 500;
  transition: background 0.15s;
  align-self: flex-start;
}

.billing-error-btn:hover {
  background: rgba(245, 158, 11, 0.32);
  color: #fef3c7;
}

/* Budget exceeded */
.budget-exceeded {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: rgba(239,68,68,0.1);
  color: #fca5a5;
  font-size: 0.85rem;
  border-top: 1px solid rgba(239,68,68,0.25);
}

/* Input bar */
.input-bar {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(255,255,255,0.08);
  background: var(--tesla-surface, #1a1a1a);
}

.context-toggle {
  opacity: 0.4;
  transition: opacity 0.15s, color 0.15s;
}
.context-toggle.active { opacity: 1; color: #ef5350; }

.chat-input {
  flex: 1;
  resize: none;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 0.75rem;
  padding: 0.6rem 0.9rem;
  color: var(--tesla-text, #e5e7eb);
  font-size: 0.9rem;
  line-height: 1.4;
  min-height: 38px;
  max-height: 120px;
  transition: border-color 0.15s;
  outline: none;
}
.chat-input:focus { border-color: rgba(229,57,53,0.5); }
.chat-input::placeholder { color: #6b7280; }

.send-btn { padding: 0.5rem 0.75rem; align-self: flex-end; }

:deep(.inline-code) {
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  padding: 0.1em 0.35em;
  font-family: monospace;
  font-size: 0.88em;
}

/* Mobile (<768px) — Tesla-Browser-kompatibel */
@media (max-width: 767px) {
  .grok-layout { flex-direction: column; }

  .grok-sidebar {
    display: none;
    width: 100%;
    position: absolute;
    top: 0; left: 0; right: 0;
    z-index: 50;
    height: 50%;
    border-right: none;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .grok-sidebar.sidebar-open { display: flex; }

  .mobile-bar { display: flex; }

  .msg-bubble { max-width: 90%; }
}
</style>
