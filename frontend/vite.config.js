import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import { fileURLToPath, URL } from 'node:url';

// Vue-i18n kompiliert Übersetzungs-Templates per Default zur Laufzeit via
// `new Function(...)` — das verstößt gegen unsere CSP `script-src 'self'`
// (kein 'unsafe-eval'). Lösung: Templates zur Build-Zeit precompilen.
export default defineConfig({
  plugins: [
    vue(),
    VueI18nPlugin({
      include: [fileURLToPath(new URL('./src/locales/**', import.meta.url))],
      runtimeOnly: true,
      compositionOnly: true,
      strictMessage: false,
    }),
  ],
  define: {
    __VUE_I18N_FULL_INSTALL__: 'false',
    __VUE_I18N_LEGACY_API__: 'false',
    __INTLIFY_PROD_DEVTOOLS__: 'false',
    __INTLIFY_DROP_MESSAGE_COMPILER__: 'true',
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
