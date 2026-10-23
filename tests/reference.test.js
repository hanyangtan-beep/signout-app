import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
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

// Group `links` (Phase 78) lead to pages the app must not copy, such as the ExpertPath topics; each needs a
// label and an https URL, and no image may come from a linked site.
test('every gallery link has a label and an https URL, and no image is taken from a linked site', () => {
  for (const { schema } of Object.values(registry)) {
    for (const f of schema.fields) {
      for (const g of f.reference?.groups || []) {
        for (const l of g.links || []) {
          assert.ok(l.label && /^https:\/\//.test(l.url || ''), `${schema.id}.${f.id}: link ${JSON.stringify(l)} needs a label and an https URL`);
          for (const im of g.images || []) assert.notEqual(new URL(im.url).host, new URL(l.url).host, `${schema.id}.${f.id}: ${im.src} comes from a linked site`);
        }
      }
    }
  }
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

// Phase 69 (pulled by the user 2026-10-12): the Dermatoses form illustrates its pattern, blister, granuloma,
// panniculitis, vessel, immunofluorescence and GVHD fields; a group without an open image says so in the note.
test('dermatoses carry illustrated galleries on the pattern, blister, granuloma, panniculitis, vessel, DIF and GVHD fields', () => {
  const schema = registry.skin_inflammatory.schema;
  const fields = new Map(schema.fields.map((f) => [f.id, f]));
  const dir = 'assets/reference/skin_inflammatory/';
  let total = 0;
  const files = new Set();
  for (const id of ['pattern', 'blisterLevel', 'granulomaType', 'compartment', 'vessels', 'difPattern', 'nih', 'lerner']) {
    const f = fields.get(id);
    assert.ok(f && f.reference, `${id} has a reference gallery`);
    if (id !== 'nih') for (const g of f.reference.groups) assert.ok(f.options.includes(g.heading), `${id}: ${g.heading} is one of the options`);
    const withImages = f.reference.groups.filter((g) => (g.images || []).length > 0);
    assert.ok(withImages.length >= (id === 'nih' ? 1 : 2), `${id} has illustrated groups`);
    if (withImages.length < f.reference.groups.length) assert.match(f.reference.note || '', /^Room for your own photographs/, `${id} names its text-only groups in the note`);
    for (const g of f.reference.groups) {
      for (const im of g.images || []) {
        assert.ok(im.src.startsWith(dir) && existsSync(path.join(root, im.src)), `${im.src} exists under ${dir}`);
        assert.ok(im.caption && im.credit, `${im.src} has a caption and credit`);
        assert.match(im.license, /^CC(0| BY| BY-SA)/, `${im.src} is CC BY / CC BY-SA / CC0`);
        assert.ok(!/NC|ND/.test(im.license), `${im.src} is not NC/ND`);
        assert.match(im.url, /^https:\/\//, `${im.src} carries a source url`);
        total += 1;
        files.add(im.src.slice(dir.length));
      }
    }
  }
  assert.ok(total >= 60, `dermatoses galleries hold ${total} images`);
  assert.deepEqual([...files].sort(), readdirSync(path.join(root, dir)).sort(), 'every file in the folder is used and nothing else');
  for (const g of fields.get('lerner').reference.groups) {
    for (const im of g.images) assert.match(im.caption, /skin explant assay/, `${im.src} says it is from the skin explant assay`);
  }
});
