// ESLint Flat-Config — bewusst minimal gehalten.
//
// Ziel: die wiederkehrende Fehlerklasse "undefinierter Bezeichner" abfangen
// (fehlender/auskommentierter Import, Tippfehler im Variablennamen, fehlendes
// Funktionsargument). Genau diese Bugs kompilieren sauber durch und crashen
// erst zur Laufzeit — `node --check` und der Build sehen sie nicht.
//
// Wir aktivieren NUR echte Bug-Regeln, keinen Stil — damit CI aussagekraeftig
// gruen bleibt und nicht in Formatierungs-Rauschen ertrinkt.
import globals from 'globals';

export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unreachable': 'error',
    },
  },
];
