/**
 * Crypto-Service — verschluesselt sensible Daten at-rest in den SQLite-DBs.
 *
 *   Anwendungsfaelle (alle: zweiseitig, Backend braucht den Klartext zur
 *   Laufzeit, deshalb Encryption statt Hashing):
 *     - Tesla OAuth Access/Refresh-Tokens (tokens-Tabelle)
 *     - TOTP MFA-Secret (users.mfa_secret)
 *     - Tesla Virtual-Key Private-Key PEM (virtual_key.private_key_pem)
 *
 *   Algorithmus:  AES-256-GCM (authenticated encryption — verhindert
 *   silent corruption, weil GCM-Tag bei Manipulation oder falschem Key
 *   einen Decrypt-Error wirft).
 *
 *   Format:  v1:<iv-b64>:<authtag-b64>:<ciphertext-b64>
 *   Der v1-Prefix erlaubt spaeter Key-Rotation auf v2 ohne Bruch.
 *
 *   Key-Persistenz:  data/.encryption-key (32 Bytes, 0600).
 *     - Wird beim ersten Start automatisch generiert
 *     - Gehoert ins Backup (data/-Verzeichnis komplett sichern)
 *     - Bei Verlust: alle Tesla-Verbindungen + MFA-Setups + Virtual-Keys
 *       muessen neu eingerichtet werden — Migration kann dann nichts mehr
 *       entschluesseln und der Server bricht laut beim Start ab
 *
 *   Hash-Helper:  hashToken(raw) — fuer Reset-Tokens und aehnliche Random-
 *   Strings mit hoher Entropie. SHA-256 reicht hier (kein Brute-Force-
 *   Schutz noetig), bcrypt waere zu langsam. Vergleich immer mit
 *   timingSafeCompare(), nie mit ===, gegen Timing-Attacks.
 */

import { randomBytes, createCipheriv, createDecipheriv, createHash, timingSafeEqual } from 'crypto';
import { readFileSync, writeFileSync, existsSync, chmodSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const ALG          = 'aes-256-gcm';
const KEY_LEN      = 32;             // 256 Bit
const IV_LEN       = 12;             // GCM-Standard: 96 Bit
const VERSION      = 'v1';
const KEY_FILENAME = '.encryption-key';

let cachedKey = null;

/**
 * Laedt den Encryption-Key aus data/.encryption-key oder erzeugt ihn
 * beim ersten Aufruf. Sicherheits-relevant: 0600-Permissions, sodass
 * andere Container-User den Key nicht lesen koennen.
 */
function getKey() {
  if (cachedKey) return cachedKey;
  const dataDir = process.env.DATA_DIR || './data';
  mkdirSync(dataDir, { recursive: true });
  const path = join(dataDir, KEY_FILENAME);
  if (existsSync(path)) {
    cachedKey = readFileSync(path);
    if (cachedKey.length !== KEY_LEN) {
      throw new Error(`[crypto] ${path} hat falsche Laenge ${cachedKey.length} (erwartet ${KEY_LEN}). `
        + `Falls absichtlich rotiert, alte Daten neu verschluesseln. `
        + `Falls verloren: alle Tesla-Verbindungen + MFA + Virtual-Keys neu einrichten.`);
    }
    return cachedKey;
  }
  cachedKey = randomBytes(KEY_LEN);
  writeFileSync(path, cachedKey, { mode: 0o600 });
  try { chmodSync(path, 0o600); } catch { /* schon gesetzt */ }
  console.log(`[crypto] 🔐 Neuer Encryption-Key erzeugt: ${path}`);
  console.log('[crypto] ⚠  Diesen Key UNBEDINGT ins Backup aufnehmen (Teil von data/).');
  console.log('[crypto] ⚠  Verlust = alle Tesla-Tokens, MFA-Secrets, Virtual-Keys werden unbrauchbar.');
  return cachedKey;
}

/**
 * Verschluesselt einen String. Liefert ein selbst-beschreibendes
 * Format mit Versions-Prefix, IV und GCM-Auth-Tag. NUR Strings —
 * fuer Binary erst base64-encoden.
 */
export function encrypt(plaintext) {
  if (plaintext == null) return null;
  if (typeof plaintext !== 'string') {
    throw new Error('[crypto] encrypt() erwartet String, bekam ' + typeof plaintext);
  }
  const iv     = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, getKey(), iv);
  const ct     = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

/**
 * Entschluesselt. Kompatibel zu Legacy-Klartext aus der Zeit vor diesem
 * Service — alles, was nicht mit `v1:` anfaengt, wird durchgereicht.
 * Das ermoeglicht eine schrittweise Migration: write-side encryptet
 * sofort, read-side toleriert beides, eine Hintergrund-Migration in
 * initMasterDb() upgradet die alten Reihen.
 */
export function decrypt(value) {
  if (value == null) return null;
  if (typeof value !== 'string') return value;
  if (!isEncrypted(value)) return value; // Legacy-Klartext
  const [, ivB64, tagB64, ctB64] = value.split(':');
  try {
    const iv       = Buffer.from(ivB64,  'base64');
    const tag      = Buffer.from(tagB64, 'base64');
    const ct       = Buffer.from(ctB64,  'base64');
    const decipher = createDecipheriv(ALG, getKey(), iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString('utf8');
  } catch (err) {
    throw new Error('[crypto] Decrypt fehlgeschlagen — falscher Key oder Daten manipuliert: ' + err.message);
  }
}

export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(VERSION + ':');
}

/**
 * SHA-256 fuer Random-Tokens (Reset-Tokens, ggf. zukuenftige API-Keys).
 * Liefert hex (64 Zeichen).
 */
export function hashToken(raw) {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Konstanter-Zeit-Vergleich. Beide Strings muessen gleich lang sein —
 * sonst Sofort-False (Laenge ist ohnehin kein Geheimnis). Ohne diesen
 * Wrapper crashed crypto.timingSafeEqual bei Laengen-Mismatch.
 */
export function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}
