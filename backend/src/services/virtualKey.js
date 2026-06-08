// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { generateKeyPairSync } from 'crypto';
import { encrypt, decrypt } from './cryptoService.js';

/**
 * Holt den Virtual-Key (EC P-256 Keypair) aus der Tenant-DB oder erzeugt
 * ihn beim ersten Aufruf. Der Private-Key signiert echte Fahrzeug-
 * Kommandos via tesla-http-proxy (z.B. Tueren, Klima, Charge-Port) —
 * deshalb wird er **at-rest verschluesselt** mit AES-256-GCM. Decryption
 * passiert nur in den Getter-Funktionen unten.
 *
 * Public-Key bleibt Klartext: ist ja public und wird Tesla im
 * /.well-known-Endpoint serviert.
 */
export function getOrCreateVirtualKey(db) {
  const existing = db.prepare('SELECT * FROM virtual_key ORDER BY id DESC LIMIT 1').get();
  if (existing) return existing;

  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  db.prepare(
    'INSERT INTO virtual_key (private_key_pem, public_key_pem) VALUES (?, ?)'
  ).run(encrypt(privateKey), publicKey);

  console.log('[VirtualKey] Neuer EC-Schluessel generiert (Private-Key verschluesselt)');
  return db.prepare('SELECT * FROM virtual_key ORDER BY id DESC LIMIT 1').get();
}

// Public-Key wird Klartext gespeichert und Klartext zurueckgegeben.
export function getPublicKeyPem(db)  { return getOrCreateVirtualKey(db).public_key_pem; }

// Private-Key wird verschluesselt persistiert; decrypt() toleriert
// Legacy-Klartext (Migration laeuft beim Start) — so bleibt der Service
// auch waehrend der Uebergangsphase funktional.
export function getPrivateKeyPem(db) { return decrypt(getOrCreateVirtualKey(db).private_key_pem); }
