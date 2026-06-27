// NA:log auth — frontend-only password gate, paired with crypto.js for data decryption.
const NALOG_AUTH_KEY = 'nalog_auth';
const NALOG_SESSION_KEY = 'nalog_key';
const NALOG_PASSWORD_HASH = '3d3c5de68198b5e27d9ae794bba9645f1c801edd6302c95149d8b9130e7e4513';

async function nalogSha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function nalogVerifyPassword(input) {
  const hash = await nalogSha256(input);
  return hash === NALOG_PASSWORD_HASH;
}

// Stores the AES key (derived from the password at login) so other pages can
// decrypt nalog_data.json without asking for the password again this session.
async function nalogSetAuthenticated(password) {
  const key = await nalogDeriveKey(password);
  const exported = await nalogExportKey(key);
  sessionStorage.setItem(NALOG_AUTH_KEY, '1');
  sessionStorage.setItem(NALOG_SESSION_KEY, exported);
}

function nalogIsAuthenticated() {
  return sessionStorage.getItem(NALOG_AUTH_KEY) === '1';
}

// Call on protected pages: redirects to login if not authenticated.
function nalogRequireAuth() {
  if (!nalogIsAuthenticated()) {
    window.location.replace('index.html');
  }
}

// Returns the CryptoKey for decrypting nalog_data.json, or null if not logged in.
async function nalogGetKey() {
  const b64 = sessionStorage.getItem(NALOG_SESSION_KEY);
  return b64 ? nalogImportKey(b64) : null;
}

// Fetches nalog_data.json and decrypts it (falls back to plain JSON for local dev files).
async function nalogLoadData(url) {
  const res = await fetch(url);
  const payload = await res.json();
  if (!payload.encrypted) return payload;
  const key = await nalogGetKey();
  return nalogDecryptJson(key, payload);
}
