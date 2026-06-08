// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
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
 *   Key-Quellen (in dieser Reihenfolge geprueft):
 *     1. ENCRYPTION_KEY_B64 (Umgebungsvariable, base64-kodierte 32 Bytes)
 *        Empfohlen: Schluessel liegt getrennt von data/ in .env.
 *        Erzeugen: openssl rand -base64 32
 *     2. /run/secrets/encryption_key (Docker Secret, 32 Raw-Bytes)
 *        Fuer Docker-Swarm oder Compose-Secrets.
 *     3. data/.encryption-key (Datei, 0600) — Fallback und bestehende
 *        Installationen. Wird beim ersten Start automatisch erzeugt.
 *
 *   Hash-Helper:  hashToken(raw) — fuer Reset-Tokens und aehnliche Random-
 *   Strings mit hoher Entropie. SHA-256 reicht hier (kein Brute-Force-
 *   Schutz noetig), bcrypt waere zu langsam. Vergleich immer mit
 *   timingSafeCompare(), nie mit ===, gegen Timing-Attacks.
 */

import { randomBytes, createCipheriv, createDecipheriv, createHash, timingSafeEqual } from 'crypto';
import { readFileSync, writeFileSync, existsSync, chmodSync, mkdirSync } from 'fs';
import { join } from 'path';

const ALG          = 'aes-256-gcm';
const KEY_LEN      = 32;             // 256 Bit
const IV_LEN       = 12;             // GCM-Standard: 96 Bit
const VERSION      = 'v1';
const KEY_FILENAME = '.encryption-key';

let cachedKey = null;

/**
 * Laedt den Encryption-Key. Prueft drei Quellen in dieser Reihenfolge:
 *
 *  1. ENCRYPTION_KEY_B64 (Umgebungsvariable) — base64-codierte 32 Bytes.
 *     Empfohlen fuer Produktivbetrieb: Schluessel liegt getrennt von den
 *     Datenbankdateien, z. B. in .env ausserhalb des data/-Verzeichnisses.
 *     Erzeugen: openssl rand -base64 32
 *
 *  2. /run/secrets/encryption_key (Docker Secret) — 32 Raw-Bytes.
 *     Fuer Docker-Swarm oder Compose-Secrets (secrets: in compose.yml).
 *     Vorteil: Secret wird nie in env oder Logs sichtbar.
 *
 *  3. data/.encryption-key (Datei, 0600) — bestehende Installationen.
 *     Wird beim ersten Start automatisch erzeugt, wenn keine der obigen
 *     Quellen konfiguriert ist. Backward-kompatibel.
 */
function getKey() {
  if (cachedKey) return cachedKey;

  // Quelle 1: Umgebungsvariable ENCRYPTION_KEY_B64
  if (process.env.ENCRYPTION_KEY_B64) {
    const key = Buffer.from(process.env.ENCRYPTION_KEY_B64, 'base64');
    if (key.length !== KEY_LEN) {
      throw new Error(`[crypto] ENCRYPTION_KEY_B64 ergibt ${key.length} Bytes (erwartet ${KEY_LEN}). `
        + 'Bitte "openssl rand -base64 32" verwenden.');
    }
    cachedKey = key;
    return cachedKey;
  }

  // Quelle 2: Docker Secret /run/secrets/encryption_key
  const secretPath = '/run/secrets/encryption_key';
  if (existsSync(secretPath)) {
    const key = readFileSync(secretPath);
    if (key.length !== KEY_LEN) {
      throw new Error(`[crypto] Docker Secret ${secretPath} hat falsche Laenge ${key.length} (erwartet ${KEY_LEN}).`);
    }
    cachedKey = key;
    return cachedKey;
  }

  // Quelle 3: Datei data/.encryption-key (Legacy / Standard)
  const dataDir  = process.env.DATA_DIR || './data';
  mkdirSync(dataDir, { recursive: true });
  const filePath = join(dataDir, KEY_FILENAME);
  if (existsSync(filePath)) {
    cachedKey = readFileSync(filePath);
    if (cachedKey.length !== KEY_LEN) {
      throw new Error(`[crypto] ${filePath} hat falsche Laenge ${cachedKey.length} (erwartet ${KEY_LEN}). `
        + 'Falls absichtlich rotiert, alte Daten neu verschluesseln. '
        + 'Falls verloren: alle Tesla-Verbindungen + MFA + Virtual-Keys neu einrichten.');
    }
    return cachedKey;
  }

  // Kein Key vorhanden — neu erzeugen und als Datei speichern
  cachedKey = randomBytes(KEY_LEN);
  writeFileSync(filePath, cachedKey, { mode: 0o600 });
  try { chmodSync(filePath, 0o600); } catch { /* schon gesetzt */ }
  console.log(`[crypto] Neuer Encryption-Key erzeugt: ${filePath}`);
  console.log('[crypto] Tipp: Key sicherer als ENCRYPTION_KEY_B64 in .env auslagern (getrennt von data/).');
  console.log('[crypto] Verlust = alle Tesla-Tokens, MFA-Secrets, Virtual-Keys werden unbrauchbar.');
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
