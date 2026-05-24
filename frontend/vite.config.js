import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import { fileURLToPath, URL } from 'node:url';
import { execSync } from 'node:child_process';

// Vue-i18n kompiliert Übersetzungs-Templates per Default zur Laufzeit via
// `new Function(...)` — das verstößt gegen unsere CSP `script-src 'self'`
// (kein 'unsafe-eval').
//
// Setup:
//  1. Plugin precompilet JSON-Locales zu AST-Objekten (jit hardcoded in v11).
//  2. plugins/i18n.js registriert den AST-Interpreter via
//     `registerMessageCompiler(compile)` aus @intlify/core-base manuell.
//     `compile` betritt den `new Function`-Pfad nur für Source-Strings —
//     unsere Messages sind alle AST, also bleibt CSP sauber.
//  3. Wir setzen __INTLIFY_DROP_MESSAGE_COMPILER__ NICHT, sonst wird der
//     Compiler-Code aus dem Bundle gestrippt und unser register-Call läuft
//     ins Leere → Stub gibt AST zurück → Fp.UNEXPECTED_RETURN_TYPE.
// Git-Commit-Hash als Entry-Chunk-Suffix → neuer Filename bei jedem Deploy,
// verhindert dass Browsers einen alten index-*.js aus dem immutable-Cache
// liefern obwohl der Inhalt (z.B. lazy-Route-Referenzen) sich geändert hat.
// GIT_HASH aus Docker-Build-Arg hat Vorrang (kein .git im Container-Build-Context);
// Fallback: git-Kommando fuer lokale Builds; letzter Fallback: 'local'.
let gitHash = 'local';
try {
  gitHash = (process.env.GIT_HASH || execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()).slice(0, 7);
} catch { /* kein git */ }

export default defineConfig({
  build: {
    // Budget-Grenze: Warnung wenn ein Chunk > 800 KB (unkomprimiert).
    // Der Haupt-Chunk enthält Vue + alle Stores + geteilte Komponenten und
    // ist legitim größer. vendor-pdf und vendor-charts laden nur on-demand.
    chunkSizeWarningLimit: 800,

    rollupOptions: {
      external: ['html2canvas'],
      output: {
        entryFileNames: `assets/[name]-${gitHash}.js`,

        // Schwere Vendor-Bibliotheken in eigene Chunks auslagern.
        // Browser cached diese Chunks separat — beim nächsten Deploy
        // bleibt z.B. der Leaflet-Chunk unverändert im Cache.
        manualChunks(id) {
          // Leaflet (Karten) — nur geladen wenn Karten-View besucht wird
          if (id.includes('node_modules/leaflet')) return 'vendor-leaflet';
          // Chart.js + vue-chartjs — nur geladen wenn Chart-Views besucht werden
          if (id.includes('node_modules/chart.js') ||
              id.includes('node_modules/vue-chartjs')) return 'vendor-charts';
          // jsPDF — nur geladen wenn PDF-Export ausgelöst wird
          if (id.includes('node_modules/jspdf') ||
              id.includes('node_modules/jspdf-autotable')) return 'vendor-pdf';
          // DOMPurify (Markdown-Sanitizer, Grok-Chat)
          if (id.includes('node_modules/dompurify')) return 'vendor-sanitize';
          // marked (Markdown-Parser, Handbuch)
          if (id.includes('node_modules/marked')) return 'vendor-markdown';
          // vue-i18n runtime (groß, aber selten geändert)
          if (id.includes('node_modules/vue-i18n') ||
              id.includes('node_modules/@intlify') ||
              id.includes('node_modules/@vue/devtools-api')) return 'vendor-i18n';
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    vue(),
    VueI18nPlugin({
      include: [fileURLToPath(new URL('./src/locales/**/*.json', import.meta.url))],
      runtimeOnly: true,
      compositionOnly: true,
      strictMessage: false,
    }),
  ],
  define: {
    __VUE_I18N_FULL_INSTALL__: 'false',
    __VUE_I18N_LEGACY_API__: 'false',
    __INTLIFY_PROD_DEVTOOLS__: 'false',
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
