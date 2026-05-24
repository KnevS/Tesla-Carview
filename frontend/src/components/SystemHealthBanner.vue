<template>
  <Transition name="banner-slide">
    <div v-if="visible"
      class="rounded-xl border px-4 py-3 flex items-start gap-3 text-sm"
      :class="isError
        ? 'border-red-700/50 bg-red-900/10 text-red-200'
        : 'border-yellow-700/50 bg-yellow-900/10 text-yellow-200'"
    >
      <!-- Icon -->
      <AppIcon
        :name="isError ? 'alert' : 'info'"
        :size="18"
        class="flex-shrink-0 mt-0.5"
        :class="isError ? 'text-red-400' : 'text-yellow-400'"
      />

      <!-- Content -->
      <div class="flex-1 min-w-0 space-y-1">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-semibold" :class="isError ? 'text-red-300' : 'text-yellow-300'">
            {{ isError ? 'System-Fehler' : 'System-Warnung' }}
          </span>
          <span class="text-xs opacity-60">{{ issueChecks.length }} Problem{{ issueChecks.length === 1 ? '' : 'e' }}</span>
        </div>
        <ul class="space-y-0.5">
          <li v-for="c in issueChecks" :key="c.key"
            class="flex items-start gap-1.5 text-xs opacity-90">
            <AppIcon
              :name="c.status === 'error' ? 'x' : 'alert'"
              :size="13"
              class="flex-shrink-0 mt-0.5"
              :class="c.status === 'error' ? 'text-red-400' : 'text-yellow-400'"
            />
            <span>
              <span class="font-medium">{{ c.label }}:</span>
              {{ c.message }}
            </span>
          </li>
        </ul>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <RouterLink to="/system"
          class="text-xs px-2.5 py-1 rounded-lg border transition font-medium"
          :class="isError
            ? 'border-red-700/60 text-red-300 hover:bg-red-900/30'
            : 'border-yellow-700/60 text-yellow-300 hover:bg-yellow-900/30'"
          v-tooltip="'System-Seite öffnen für Details und Diagnose'">
          Details →
        </RouterLink>
        <button
          @click="dismissed = true"
          class="opacity-40 hover:opacity-80 transition p-1 rounded"
          v-tooltip="'Banner ausblenden (bis zur nächsten Seite)'">
          <AppIcon name="x" :size="14" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import api from '../api.js';
import { useAuthStore } from '../store/auth.js';
import AppIcon from './AppIcon.vue';

const auth      = useAuthStore();
const health    = ref(null);
const dismissed = ref(false);
let   timer     = null;

const issueChecks = computed(() =>
  (health.value?.checks ?? []).filter(c => c.status === 'error' || c.status === 'warn')
);

const isError  = computed(() => health.value?.summary === 'error');
const visible  = computed(() =>
  !dismissed.value &&
  health.value !== null &&
  health.value.summary !== 'ok' &&
  issueChecks.value.length > 0
);

async function load() {
  if (!auth.isAdmin) return;
  try {
    const { data } = await api.get('/system/health');
    health.value = data;
  } catch { /* 403 für Non-Admins oder Netzwerkfehler – stillschweigend ignorieren */ }
}

onMounted(() => {
  load();
  timer = setInterval(load, 5 * 60 * 1000);
});

onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
.banner-slide-enter-active,
.banner-slide-leave-active { transition: all 0.25s ease; }
.banner-slide-enter-from,
.banner-slide-leave-to    { opacity: 0; transform: translateY(-6px); }
</style>
