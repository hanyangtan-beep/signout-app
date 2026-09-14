import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
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

test('endometrial carcinoma carries illustrated galleries on the five grading, typing and invasion fields', () => {
  const schema = registry.endometrial_carcinoma.schema;
  const fields = new Map(schema.fields.map((f) => [f.id, f]));
  let total = 0;
  for (const id of ['solidPct', 'nuclearGrade', 'histType', 'differentiation', 'invasionPattern']) {
    const f = fields.get(id);
    assert.ok(f && f.reference, `${id} has a reference gallery`);
    const withImages = f.reference.groups.filter((g) => (g.images || []).length > 0);
    assert.ok(withImages.length >= 2, `${id} has at least two illustrated groups`);
    for (const g of f.reference.groups) {
      for (const im of g.images || []) {
        assert.match(im.license, /^CC(0| BY| BY-SA)/, `${im.src} is CC BY / CC BY-SA / CC0`);
        assert.ok(!/NC|ND/.test(im.license), `${im.src} is not NC/ND`);
        total += 1;
      }
    }
  }
  assert.ok(total >= 60, `endometrial galleries hold ${total} images`);
});

test('prostate biopsy carries illustrated Gleason galleries on the grading fields', () => {
  const schema = registry.prostate_biopsy.schema;
  const fields = new Map(schema.fields.map((f) => [f.id, f]));
  let total = 0;
  for (const id of ['primary', 'secondary', 'tertiary5', 'cribriform', 'idcp', 'category']) {
    const f = fields.get(id);
    assert.ok(f && f.reference, `${id} has a reference gallery`);
    assert.ok(f.reference.groups.length >= 3, `${id} has at least three criteria groups`);
    const withImages = f.reference.groups.filter((g) => (g.images || []).length > 0);
    assert.ok(withImages.length >= 2, `${id} has at least two illustrated groups`);
    for (const g of f.reference.groups) {
      for (const im of g.images || []) {
        assert.ok(existsSync(path.join(root, im.src)), `${im.src} exists`);
        assert.ok(im.caption && im.credit, `${im.src} has a caption and credit`);
        assert.match(im.license, /^CC(0| BY| BY-SA)/, `${im.src} is CC BY / CC BY-SA / CC0`);
        assert.ok(!/NC|ND/.test(im.license), `${im.src} is not NC/ND`);
        assert.match(im.url, /^https:\/\//, `${im.src} carries a source url`);
        total += 1;
      }
    }
  }
  assert.ok(total >= 80, `prostate galleries hold ${total} images`);
});

test('prostate primary and secondary share the same pattern criteria and images', () => {
  const fields = new Map(registry.prostate_biopsy.schema.fields.map((f) => [f.id, f]));
  const strip = (ref) => ref.groups.map((g) => [g.heading, (g.images || []).map((i) => i.caption)]);
  assert.deepEqual(strip(fields.get('secondary').reference), strip(fields.get('primary').reference));
});

test('every prostate gallery image is under 150 kB', () => {
  const schema = registry.prostate_biopsy.schema;
  for (const f of schema.fields) {
    for (const g of f.reference?.groups || []) {
      for (const im of g.images || []) {
        assert.ok(statSync(path.join(root, im.src)).size <= 150 * 1024, `${im.src} is at most 150 kB`);
      }
    }
  }
});
