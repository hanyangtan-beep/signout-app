import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../src/registry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = await loadAll();

test('every field reference points at existing image files with captions and credits', () => {
  let count = 0;
  for (const { schema } of Object.values(registry)) {
    for (const f of schema.fields) {
      if (!f.reference) continue;
      assert.ok(Array.isArray(f.reference.groups) && f.reference.groups.length > 0, `${schema.id}.${f.id} reference has groups`);
      for (const g of f.reference.groups) {
        assert.ok(g.heading, `${schema.id}.${f.id} group heading`);
        for (const im of g.images || []) {
          count++;
          assert.ok(existsSync(path.join(root, im.src)), `${schema.id}.${f.id}: missing ${im.src}`);
          assert.ok(im.caption && im.credit && im.license && /^https?:/.test(im.url || ''), `${schema.id}.${f.id}: ${im.src} needs caption, credit, licence and url`);
        }
      }
    }
  }
  assert.ok(count >= 2, 'at least one reference gallery is defined');
});

test('gastric IM subtype carries a complete vs incomplete reference gallery', () => {
  const f = registry.gastric_biopsy.schema.fields.find((x) => x.id === 'imType');
  assert.equal(f.label, 'IM subtype');
  assert.deepEqual(f.reference.groups.map((g) => g.heading), ['Complete (type I)', 'Incomplete (type II/III)']);
  assert.ok(f.reference.groups.every((g) => g.images.length >= 2));
});
