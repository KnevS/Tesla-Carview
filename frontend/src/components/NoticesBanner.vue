<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div v-if="notices.length > 0" class="notices-banner-wrap">
    <div v-for="n in notices" :key="n.id"
         class="notices-banner"
         :class="{ 'severity-warn': n.severity === 'warn', 'severity-critical': n.severity === 'critical' }">
      <button @click="toggle(n.id)" class="notices-banner-header" type="button">
        <span class="notices-banner-title">{{ texts(n).title }}</span>
        <span class="notices-banner-toggle" aria-hidden="true">{{ expanded.has(n.id) ? '▴' : '▾' }}</span>
      </button>
      <div v-if="expanded.has(n.id)" class="notices-banner-body">
        <p class="notices-banner-text">{{ texts(n).body }}</p>
        <div class="notices-banner-actions">
          <RouterLink v-if="texts(n).cta_path && texts(n).cta_label"
                      :to="texts(n).cta_path"
                      class="notices-banner-cta">
            {{ texts(n).cta_label }} →
          </RouterLink>
          <button v-if="auth.isAdmin" @click="dismiss(n.id)" type="button"
                  class="notices-banner-dismiss">
            {{ $t('notices.dismiss') }}
          </button>
          <span v-else class="notices-banner-hint">{{ $t('notices.adminOnly') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n }       from 'vue-i18n';
import { useAuthStore }  from '../store/auth.js';
import api from '../api.js';

const { locale } = useI18n();
const auth       = useAuthStore();

const notices  = ref([]);
const expanded = ref(new Set());

function texts(n) {
  const lang = locale.value === 'en' ? 'en' : 'de';
  return n[lang] || n.de || {};
}

function toggle(id) {
  if (expanded.value.has(id)) expanded.value.delete(id);
  else expanded.value.add(id);
  expanded.value = new Set(expanded.value);  // reactivity nudge
}

async function load() {
  try {
    notices.value = (await api.get('/notices')).data || [];
    // Beim ersten Laden alle Notices als expanded markieren — User
    // soll Inhalt sofort sehen, kein zusaetzlicher Klick.
    for (const n of notices.value) expanded.value.add(n.id);
    expanded.value = new Set(expanded.value);
  } catch {
    notices.value = [];
  }
}

async function dismiss(id) {
  try {
    await api.post(`/notices/${id}/dismiss`);
    notices.value = notices.value.filter(n => n.id !== id);
  } catch { /* ignore */ }
}

onMounted(load);
</script>

<style scoped>
.notices-banner-wrap {
  display: flex;
  flex-direction: column;
  gap: .5rem;
  padding: .5rem 1rem;
  background: rgba(99, 165, 255, 0.06);
}
.notices-banner {
  border: 1px solid rgba(99, 165, 255, 0.4);
  background: rgba(99, 165, 255, 0.08);
  border-radius: .5rem;
  color: #dbeafe;
}
.notices-banner.severity-warn {
  border-color: rgba(255, 180, 30, 0.4);
  background: rgba(255, 180, 30, 0.08);
  color: #fef3c7;
}
.notices-banner.severity-critical {
  border-color: rgba(231, 76, 60, 0.5);
  background: rgba(231, 76, 60, 0.10);
  color: #fee2e2;
}
.notices-banner-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: .5rem .75rem;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: .9em;
  text-align: left;
}
.notices-banner-title {
  font-weight: 600;
  flex: 1;
}
.notices-banner-toggle {
  opacity: .6;
  margin-left: .5rem;
}
.notices-banner-body {
  padding: 0 .75rem .75rem .75rem;
  font-size: .85em;
}
.notices-banner-text {
  white-space: pre-line;
  line-height: 1.5;
  margin: 0 0 .75rem 0;
}
.notices-banner-actions {
  display: flex;
  gap: .75rem;
  align-items: center;
  flex-wrap: wrap;
}
.notices-banner-cta {
  background: rgba(255, 255, 255, 0.12);
  padding: .35rem .75rem;
  border-radius: .25rem;
  font-size: .85em;
  text-decoration: none;
  color: inherit;
}
.notices-banner-cta:hover { background: rgba(255, 255, 255, 0.2); }
.notices-banner-dismiss {
  background: none;
  border: 1px solid currentColor;
  padding: .25rem .75rem;
  border-radius: .25rem;
  font-size: .8em;
  color: inherit;
  opacity: .7;
  cursor: pointer;
}
.notices-banner-dismiss:hover { opacity: 1; }
.notices-banner-hint {
  font-size: .75em;
  opacity: .6;
}
</style>
