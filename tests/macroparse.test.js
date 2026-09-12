// Macro extraction (card (e)): pasted LIS macro → template macro fields (src/macroparse.js).
// Fixture: tests/fixtures/macro/cases.json — house macro prose per template with expected values.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractMacro, extractConcept, splitMacroParts, applyMacroToCase, findDims, CONCEPTS } from '../src/macroparse.js';
import { loadTemplate } from '../src/registry.js';
import { createPart, defaultValues } from '../src/engine.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/macro/cases.json', import.meta.url), 'utf8'));
const cache = {};
async function schemaOf(id) { cache[id] ||= (await loadTemplate(id)).schema; return cache[id]; }

test('fixtures: every expected field is extracted, blanks stay unset', async () => {
  for (const c of fx.cases) {
    const { lettered, chunks } = splitMacroParts(c.text);
    for (const [label, expect] of Object.entries(c.expect)) {
      const s = await schemaOf(c.templates[label]);
      const chunk = lettered ? chunks[label] : c.text;
      const got = extractMacro(s, chunk);
      for (const [field, want] of Object.entries(expect)) {
        assert.equal(got[field] ?? '', want, `${c.name}: ${label}.${field}`);
      }
    }
  }
});

test('findDims: trailing unit applies to unitless earlier numbers; cm converts to mm', () => {
  const d = findDims('measures 1.5 x 1 x 0.5 cm and 4 mm across');
  assert.deepEqual(d[0].mms, [15, 10, 5]);
  assert.equal(d[1].mms[0], 4);
});

test('concepts: depth / thickness phrasings', () => {
  const mm = (concept, t) => extractConcept({ concept, unit: 'mm' }, t);
  assert.equal(mm('depthOfInvasion', 'The tumour measures approximately 0.4 cm thick out of a myometrial thickness of 2.2 cm.'), '4');
  assert.equal(mm('wallThickness', 'The tumour measures approximately 0.4 cm thick out of a myometrial thickness of 2.2 cm.'), '22');
  assert.equal(mm('depthOfInvasion', 'Depth of invasion: 6 mm. Myometrial thickness 15 mm.'), '6');
  assert.equal(mm('wallThickness', 'Depth of invasion: 6 mm. Myometrial thickness 15 mm.'), '15');
  assert.equal(mm('depthOfInvasion', 'The tumour invades 9 mm into the myometrium which measures 21 mm.'), '9');
  assert.equal(mm('wallThickness', 'The tumour invades 9 mm into the myometrium which measures 21 mm.'), '21');
  assert.equal(mm('depthOfInvasion', 'Myometrial invasion 7/16 mm.'), '7');
  assert.equal(mm('wallThickness', 'Myometrial invasion 7/16 mm.'), '16');
  assert.equal(mm('depthOfInvasion', 'The tumour is confined to the endometrium.'), null);
  assert.equal(extractConcept({ concept: 'wallThickness', unit: 'mm', label: true }, 'The gallbladder wall is thickened up to 0.5 cm thick.'), '5 mm');
});

test('concepts: weight, blocks, near scoping, min dimensions', () => {
  assert.equal(extractConcept({ concept: 'weight', unit: 'g' }, 'It weighs 81 g.'), '81');
  assert.equal(extractConcept({ concept: 'weight', unit: 'g' }, 'Specimen weighing 152 g.'), '152');
  assert.equal(extractConcept({ concept: 'blocks', unit: 'count' }, 'Partially embedded in 9 blocks.'), '9');
  assert.equal(extractConcept({ concept: 'blocks', unit: 'count' }, 'All embedded in 1 block.'), '1');
  const t = 'The ovary measures 2 x 1.5 x 0.8 cm. The tube is 4.5 cm long and 1 cm in diameter.';
  assert.equal(extractConcept({ concept: 'dims', unit: 'cm', near: 'ovar' }, t), '2 x 1.5 x 0.8');
  assert.equal(extractConcept({ concept: 'lengthDiameter', unit: 'cm', near: 'tube' }, t), '4.5 x 1');
  assert.equal(extractConcept({ concept: 'dims', unit: 'cm', near: 'cyst' }, t), null, 'near with no matching sentence → null');
  assert.equal(extractConcept({ concept: 'tumourDims', unit: 'mm' }, 'A nodule measuring 2.8 cm across.'), null, 'single dimension rejected by default');
  assert.equal(extractConcept({ concept: 'tumourDims', unit: 'cm', min: 1 }, 'A nodule measuring 2.8 cm across.'), '2.8');
  assert.ok(Object.keys(CONCEPTS).length >= 12);
});

test('splitMacroParts: lettered chunks in order; block-key refs and out-of-order letters ignored', () => {
  const r = splitMacroParts("(A) 'Uterus'. Weighs 80 g (A7 tumour).\n(B) 'Ovary'. 2 x 1 cm.\n(D) stray.");
  assert.equal(r.lettered, true);
  assert.deepEqual(Object.keys(r.chunks), ['A', 'B']);
  assert.match(r.chunks.A, /^'Uterus'/);
  assert.match(r.chunks.B, /stray/, 'a marker out of sequence does not start a new chunk');
  assert.equal(splitMacroParts('Uterus weighs 80 g.').lettered, false);
});

test('applyMacroToCase: fills defaults, keeps hand edits, follows re-paste, reverts on clear', async () => {
  const s = await schemaOf('endometrial_carcinoma');
  const part = { ...createPart(s, 0), templateId: 'endometrial_carcinoma' };
  const cs = { schemaId: 'endometrial_carcinoma', parts: [part], meta: { macro: fx.cases[0].text } };
  const schemaFor = () => s;
  const n = applyMacroToCase(cs, schemaFor);
  assert.equal(part.values.macroDepthMm, '4');
  assert.equal(part.values.macroMyoMm, '22');
  assert.equal(part.values.weight, '110');
  assert.equal(n, 5);
  assert.deepEqual(Object.keys(part.macroFill).sort(), ['macroDepthMm', 'macroMyoMm', 'tumourDims', 'tumourSizeMm', 'weight']);

  part.values.macroDepthMm = '5';                       // pathologist corrects the depth
  cs.meta.macro = cs.meta.macro.replace('110 g', '118 g');
  applyMacroToCase(cs, schemaFor);
  assert.equal(part.values.macroDepthMm, '5', 'hand edit survives a re-paste');
  assert.equal(part.values.weight, '118', 'auto-filled value follows the new paste');

  cs.meta.macro = '';
  applyMacroToCase(cs, schemaFor);
  assert.equal(part.values.weight, defaultValues(s)[field('weight')], 'auto-fill reverts when the paste is cleared');
  assert.equal(part.values.macroDepthMm, '5', 'hand edit kept');
  assert.equal(part.macroFill, undefined);
  function field(id) { return id; }
});

test('applyMacroToCase: lettered paste goes to the matching part; unlettered paste goes to part A only', async () => {
  const gen = await schemaOf('generic');
  const ut = await schemaOf('uterus_benign');
  const c = fx.cases.find((x) => x.name.startsWith('benign uterus'));
  const parts = [{ ...createPart(gen, 0), templateId: 'generic' }, { ...createPart(ut, 0), label: 'B', templateId: 'uterus_benign' }];
  const cs = { schemaId: 'generic', parts, meta: { macro: c.text } };
  applyMacroToCase(cs, (p) => (p.templateId === 'generic' ? gen : ut));
  assert.equal(parts[1].values.weight, '81', 'part B takes its own chunk, not the 1137 g of part A');
  assert.equal(parts[1].values.dimensions, '9 x 4.8 x 3.5');

  const endo = await schemaOf('endometrial_carcinoma');
  const two = [{ ...createPart(endo, 0), templateId: 'endometrial_carcinoma' }, { ...createPart(endo, 1), label: 'B', templateId: 'endometrial_carcinoma' }];
  const cs2 = { schemaId: 'endometrial_carcinoma', parts: two, meta: { macro: 'Uterus 120 g, 90 x 55 x 40 mm.' } };
  applyMacroToCase(cs2, () => endo);
  assert.equal(two[0].values.weight, '120');
  assert.equal(two[1].values.weight, '', 'no letters: only part A is filled');
});
