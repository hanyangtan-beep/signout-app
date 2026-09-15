// Sync schema loader for tests.
//
// Test files used to `import schema from '../schemas/x.json' with { type: 'json' }`, which
// returns the raw file — including any `{ "$use": "<id>" }` references to schemas/_shared.json.
// The app never sees that form: src/registry.js expands the references before the schema reaches
// the engine. Tests should assert against the expanded schema, so they go through here instead.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));

const shared = readJson('schemas/_shared.json').fields;

/** Replace every { "$use": id } with the shared definition; sibling keys override it. */
export function expandShared(node) {
  if (Array.isArray(node)) return node.map(expandShared);
  if (!node || typeof node !== 'object') return node;
  if (typeof node.$use === 'string') {
    const base = shared[node.$use];
    if (!base) throw new Error(`Unknown shared field "${node.$use}"`);
    const { $use: _unused, ...overrides } = node;
    return { ...base, ...overrides };
  }
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = expandShared(v);
  return out;
}

/** The schema for `id`, as the app sees it. */
export function schemaSync(id) {
  return expandShared(readJson(`schemas/${id}.json`));
}
