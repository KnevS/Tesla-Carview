<template>
  <!-- Schmaler Banner ueber der NavBar — nur im Demo-Mandanten. Zeigt
       restliche Lebenszeit und macht klar, dass alle Daten Fake sind. -->
  <div v-if="visible"
       class="bg-blue-900/40 border-b border-blue-700/50 text-blue-100 text-sm">
    <div class="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
      <span class="flex items-center gap-2">
        <span>🧪</span>
        <span>
          <strong>Demo-Modus</strong> — alle Daten sind frei erfunden.
          Konto und Daten werden <strong>am {{ fmtDate(expiresAt) }}</strong>
          automatisch gelöscht <span class="text-blue-300/80">({{ daysLeft }} Tage übrig)</span>.
        </span>
      </span>
      <RouterLink to="/legal/terms" class="text-xs underline text-blue-200 hover:text-white whitespace-nowrap">
        Tester-Bedingungen
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../store/auth.js';

const auth = useAuthStore();

const visible = computed(() => auth.tenantSlug === 'demo' && auth.user);

// Ablauf-Datum kommt aus dem JWT/me-Response in einem Demo-Account.
// Bei Tester-Konten setzt das Backend users.expires_at — beim /me-
// Aufruf ist das mit drin (siehe routes/auth.js). Wenn nicht vorhanden,
// zeigen wir den Banner trotzdem ohne Datum.
const expiresAt = computed(() => auth.user?.expires_at ?? null);

const daysLeft = computed(() => {
  if (!expiresAt.value) return '?';
  const days = Math.ceil((expiresAt.value - Date.now() / 1000) / 86400);
  return Math.max(0, days);
});

function fmtDate(ts) {
  if (!ts) return 'bald';
  return new Date(ts * 1000).toLocaleDateString('de-DE',
    { day: '2-digit', month: '2-digit', year: 'numeric' });
}
</script>
