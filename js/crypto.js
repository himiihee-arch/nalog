// NA:log data encryption — derives an AES-GCM key from the login password (PBKDF2),
// so nalog_data.json can sit in a public repo as ciphertext. Salt is not secret,
// only fixed so the same password always derives the same key.
// Runs unchanged in the browser (<script src>) and in Node (tools/encrypt-data.cjs),
// since both expose the same Web Crypto API globals (crypto.subtle, btoa/atob).

const NALOG_KDF_SALT_B64 = '8vPdJPOT6x26exL5jnZmnw==';
const NALOG_KDF_ITERATIONS = 100000;

function nalogBytesToB64(bytes) {
  // chunked to avoid blowing the call stack on String.fromCharCode(...bytes) for large payloads
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function nalogB64ToBytes(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function nalogDeriveKey(password) {
  const salt = nalogB64ToBytes(NALOG_KDF_SALT_B64);
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: NALOG_KDF_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

async function nalogExportKey(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return nalogBytesToB64(new Uint8Array(raw));
}

async function nalogImportKey(b64) {
  return crypto.subtle.importKey('raw', nalogB64ToBytes(b64), 'AES-GCM', true, ['encrypt', 'decrypt']);
}

async function nalogEncryptJson(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(obj));
  const ciphertextBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    encrypted: true,
    iv: nalogBytesToB64(iv),
    ciphertext: nalogBytesToB64(new Uint8Array(ciphertextBuf))
  };
}

async function nalogDecryptJson(key, payload) {
  const iv = nalogB64ToBytes(payload.iv);
  const ciphertextBytes = nalogB64ToBytes(payload.ciphertext);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertextBytes);
  return JSON.parse(new TextDecoder().decode(plainBuf));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    nalogDeriveKey, nalogExportKey, nalogImportKey,
    nalogEncryptJson, nalogDecryptJson
  };
}
