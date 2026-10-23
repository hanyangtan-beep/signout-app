// Phase 73 (user 2026-10-23): Skin cyst and Skin SCC take their Site from the specimen line with the rule
// Skin excision has used since Phase 72, and a site the line repeats is copied once. Wording is deliberate;
// update the strings only on purpose. The rule was measured on the cyst and SCC lines of both exports
// (docs/specs/specimen-intake.md, "Skin cyst and Skin SCC site").
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, createPart, generate, normalisePart, applyLinkedDefaults } from '../src/engine.js';
import * as cystGen from '../generators/skincyst.js';
import * as sccGen from '../generators/skin_scc.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { loadManifest } from '../src/registry.js';
import { schemaSync } from './_schema.js';

const manifest = await loadManifest();
const cyst = schemaSync('skin_cyst');
const scc = schemaSync('skin_scc');
const excision = schemaSync('skin_excision');

// The part as the app opens it on the form, whether the line routed there or the pathologist switched it by
// hand (src/app.js prefillFromLine): the preset from the line, then the linked defaults it moves.
function opened(schema, line) {
  const r = matchParts(parseIntake(`(A) ${line}`), '', manifest)[0];
  const match = r.templateId === schema.id ? r : { ...r, templateId: schema.id, role: null };
  const part = createPart(schema, 0);
  const preset = presetValues(schema, r, match);
  const before = { ...part.values };
  Object.assign(part.values, preset);
  for (const k of Object.keys(preset)) applyLinkedDefaults(schema, part, k, before[k], preset);
  normalisePart(schema, part);
  return part;
}
const site = (schema, line) => opened(schema, line).values.specimenName;
function printed(schema, gen, values) {
  const c = createCase(schema, 1);
  c.parts[0] = { ...c.parts[0], values };
  return generate(schema, gen, c);
}

test('cyst: Site holds the site alone, whichever way round the line is written', () => {
  // Before Phase 73 Site opened blank on every one of these.
  const cases = [
    ['Skin, Left groin sebaceous cyst', 'left groin'],
    ['left neck trichilemmal cyst', 'left neck'],
    ['sebaceous cyst left forehead', 'left forehead'],
    ['sebaceous cyst at suprapubic region', 'suprapubic region'],
    ['Skin, Lower back sebaceous cyst 6x5cm', 'lower back'],
    ['Skin, Right upper back sebaceous cysts 2cm x 2', 'right upper back'],
    ['Upper back infected seb cyst wall', 'upper back'],
    ['Skin, left cheek, excision', 'left cheek']
  ];
  for (const [line, want] of cases) assert.equal(site(cyst, line), want, line);
});

test('cyst: a site the line repeats is copied once', () => {
  assert.equal(site(cyst, 'Right back sebaceous cyst, Right back'), 'right back');
  assert.equal(site(cyst, 'seb keratosis over right parietal scalp, right parietal scalp'), 'right parietal scalp');
  assert.equal(site(cyst, 'left buttock sebaceous cyst, left buttock seb cyst'), 'left buttock');
});

test('cyst: a line that names no site leaves Site blank rather than guessing', () => {
  assert.equal(cyst.fields.find((f) => f.id === 'specimenName').default, '');
  for (const line of ['Skin', 'Skin, sebaceous cyst', 'cyst wall biopsy', 'deep resection margin on cheek']) {
    assert.equal(site(cyst, line), '', line);
  }
});

test('cyst printed: the copied site reads before the clinical label', () => {
  const r = printed(cyst, cystGen, opened(cyst, 'Skin, Left groin sebaceous cyst').values);
  assert.equal(r.specimens, 'Skin, left groin seb cyst, excision');
  assert.equal(r.diagnosis, 'SKIN, left groin seb cyst, excision - EPIDERMAL CYST');
});

test('SCC: Site holds the site alone; the stitch and the question mark are dropped', () => {
  const cases = [
    ['Left cheek SCC, stitch at 12 oc', 'left cheek'],
    ['right preauricular SCC, short long stitch at 12 oclock', 'right preauricular'],
    ['Skin, Lower lip ?SCC', 'lower lip'],
    ['Right medial malleolus SCC, stitch at 12oc, Right medial malleolus SCC, stitch at 12oc', 'right medial malleolus']
  ];
  for (const [line, want] of cases) assert.equal(site(scc, line), want, line);
});

test('SCC printed: the copied site, or the tumour site and laterality when the line names none', () => {
  const r = printed(scc, sccGen, opened(scc, 'Left cheek SCC, stitch at 12 oc').values);
  assert.equal(r.specimens, 'Skin, left cheek, excision');
  assert.equal(r.diagnosis.split('\n')[0], 'SKIN, left cheek, excision');
  const part = opened(scc, 'Skin, SCC');
  assert.equal(part.values.specimenName, '');
  const fallback = printed(scc, sccGen, { ...part.values, tumourSite: 'Cheek', laterality: 'Left' });
  assert.equal(fallback.specimens, 'Skin, left cheek, excision');
});

test('skin excision: the refined rule', () => {
  assert.equal(site(excision, 'Skin, sebaceous cyst left forehead'), 'left forehead');
  assert.equal(site(excision, 'Skin, left cheek BCC, stitch at 12 oc, short long stitch at 3 oc'), 'left cheek');
  assert.equal(site(excision, 'deep resection margin on cheek'), '');
});

test('rule: the three skin forms share one Site rule, and only they drop a repeated piece', () => {
  const rule = (s) => s.match.fill.find((r) => r.field === 'specimenName');
  const shared = rule(excision);
  assert.deepEqual([shared.from, shared.fallback, shared.dedupe, shared.lower], ['detail', 'text', true, true]);
  for (const s of [cyst, scc]) assert.deepEqual(rule(s), shared, s.id);
  assert.equal(cyst.version, '2026.10');
  assert.equal(scc.version, '2026.10');
  const deduped = manifest.filter((t) => (t.match?.fill || []).some((r) => r.dedupe)).map((t) => t.id).sort();
  assert.deepEqual(deduped, ['skin_cyst', 'skin_excision', 'skin_scc']);
});
