// One-off / re-runnable: encrypts nalog_data.json in place using the NA:log login
// password, so the plaintext chat data never sits in the (public) git repo.
// Usage: node tools/encrypt-data.cjs <password> [input.json] [output.json]
const fs = require('fs');
const path = require('path');
const { nalogDeriveKey, nalogEncryptJson } = require('../js/crypto.js');

async function main() {
  const password = process.argv[2];
  const input = process.argv[3] || path.join(__dirname, '..', 'nalog_data.raw.json');
  const output = process.argv[4] || path.join(__dirname, '..', 'nalog_data.json');

  if (!password) {
    console.error('Usage: node tools/encrypt-data.cjs <password> [input.json] [output.json]');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(input, 'utf-8'));
  const key = await nalogDeriveKey(password);
  const payload = await nalogEncryptJson(key, raw);

  fs.writeFileSync(output, JSON.stringify(payload));
  console.log(`Encrypted ${input} -> ${output} (${fs.statSync(output).size} bytes)`);
}

main();
