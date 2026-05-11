import { generateKeyPairSync } from 'crypto';

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
  ).run(privateKey, publicKey);

  console.log('[VirtualKey] Neuer EC-Schluessel generiert');
  return db.prepare('SELECT * FROM virtual_key ORDER BY id DESC LIMIT 1').get();
}

export function getPublicKeyPem(db)  { return getOrCreateVirtualKey(db).public_key_pem;  }
export function getPrivateKeyPem(db) { return getOrCreateVirtualKey(db).private_key_pem; }
