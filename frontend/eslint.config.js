// ESLint Flat-Config — bewusst minimal gehalten.
//
// Ziel: die wiederkehrende Fehlerklasse "undefinierter Bezeichner" abfangen
// (fehlender/auskommentierter Import, Tippfehler im Variablennamen). Genau
// diese Bugs kompilieren via `vite build` sauber durch und crashen erst zur
// Laufzeit im Browser.
//
// Wir aktivieren NUR echte Bug-Regeln, keinen Stil. vue-eslint-parser zieht
// die im <template> referenzierten Bezeichner in den Script-Scope, sodass
// no-undef auch fuer <script setup> + Template greift.
import globals from 'globals';
import vueParser from 'vue-eslint-parser';

// Vue <script setup> Compiler-Makros sind keine echten Imports.
const vueMacros = {
  defineProps: 'readonly',
  defineEmits: 'readonly',
  defineExpose: 'readonly',
  defineOptions: 'readonly',
  defineModel: 'readonly',
  defineSlots: 'readonly',
  withDefaults: 'readonly',
};

const sharedRules = {
  'no-undef': 'error',
  'no-dupe-keys': 'error',
  'no-unreachable': 'error',
};

export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: sharedRules,
  },
  {
    files: ['src/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...vueMacros },
    },
    rules: sharedRules,
  },
];
