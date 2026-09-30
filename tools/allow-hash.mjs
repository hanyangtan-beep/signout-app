#!/usr/bin/env node
// Print the built-in allow-list digest for each Google address given on the command line, for
// pasting into BUILT_IN_ALLOWED in src/gate.js. The digest is what ships; the address never does.
//
//   node tools/allow-hash.mjs <address> [<address> ...]
//
// Addresses are read from the arguments only, so nothing is written to disk. Run it locally and do
// not commit its output anywhere but src/gate.js.
import { emailDigest } from '../src/gate.js';

const addresses = process.argv.slice(2).filter((a) => a.includes('@'));
if (!addresses.length) {
  process.stderr.write('usage: node tools/allow-hash.mjs <address> [<address> ...]\n');
  process.exit(1);
}
for (const a of addresses) {
  const digest = await emailDigest(a);
  // No address, not even a shortened one, goes next to the digest: src/gate.js is public.
  process.stdout.write(`  '${digest}',\n`);
}
