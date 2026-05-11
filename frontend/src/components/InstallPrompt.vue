<template>
  <!-- Banner unten am Bildschirm — nur, wenn der Browser
       beforeinstallprompt unterstuetzt UND der User es noch nicht
       weggeklickt hat. Auf iOS gibt's das Event nicht — da zeigen
       wir stattdessen einen kurzen Hinweis zum „Zum Home-Bildschirm". -->
  <transition name="slide-up">
    <div v-if="visible"
         class="fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-sm z-40
                bg-gray-800/95 backdrop-blur rounded-2xl shadow-2xl border border-tesla-red/40 p-4 space-y-2">
      <p class="font-semibold text-white flex items-center gap-2">
        <img src="/icon-192.png" alt="" class="w-7 h-7 rounded" />
        <span>Carview als App installieren</span>
      </p>
      <p v-if="isIOS" class="text-xs text-gray-300">
        Tipp: Tippe auf <strong>Teilen → „Zum Home-Bildschirm"</strong>, um Carview
        wie eine native App zu nutzen — schneller und ohne Browser-Leiste.
      </p>
      <p v-else class="text-xs text-gray-300">
        Installiere Carview als App auf deinem Gerät — funktioniert auf Smartphone,
        Tablet und im Tesla-Fahrzeug-Browser. Ein Tipp aufs Icon öffnet sie wie eine
        echte App.
      </p>
      <div class="flex gap-2 pt-1">
        <button v-if="!isIOS" @click="install"
                class="btn-primary text-sm flex-1 min-h-[44px]">Installieren</button>
        <button @click="dismiss"
                class="btn-secondary text-sm min-h-[44px]"
                :class="isIOS ? 'flex-1' : ''">
          Später
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const visible        = ref(false);
const isIOS          = ref(false);
let   deferredPrompt = null;

// Standalone-Check: wenn die App schon installiert ist, gar nichts zeigen.
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true; // iOS-Spezial
}

function onBeforeInstall(e) {
  e.preventDefault();
  deferredPrompt = e;
  if (!localStorage.getItem('pwa_install_dismissed') && !isStandalone()) {
    visible.value = true;
  }
}

function detectIOS() {
  // iPhones + iPads — Safari nutzt kein beforeinstallprompt. Wir zeigen
  // den Hinweis nur einmal, wenn nicht schon im Standalone-Modus.
  const ua = navigator.userAgent || '';
  const iOSLike = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  if (iOSLike && !isStandalone() && !localStorage.getItem('pwa_install_dismissed')) {
    isIOS.value = true;
    visible.value = true;
  }
}

async function install() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  dismiss();
}

function dismiss() {
  visible.value = false;
  localStorage.setItem('pwa_install_dismissed', '1');
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onBeforeInstall);
  // iOS-Detection mit kleinem Delay, damit der User nicht sofort beim
  // ersten Frame angesprungen wird.
  setTimeout(detectIOS, 1500);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstall);
});
</script>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s ease, opacity 0.3s ease; }
.slide-up-enter-from { transform: translateY(20px); opacity: 0; }
.slide-up-leave-to   { transform: translateY(20px); opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .slide-up-enter-active, .slide-up-leave-active { transition: opacity 0.1s ease; }
}
</style>
