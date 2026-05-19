import { defineConfig } from 'vite';
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
let gitHash = 'local';
try { gitHash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* kein git */ }

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['html2canvas'],
      output: {
        entryFileNames: `assets/[name]-${gitHash}.js`,
      },
    },
  },
  plugins: [
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
