// Phase 72 (user 2026-10-23): Skin excision takes its Site from the specimen line, and naevus lipomatosus
// cutaneous superficialis is a diagnosis option. Wording is deliberate; update the strings only on purpose.
// The site rule was measured on the skin lines of both exports (docs/specs/specimen-intake.md, "Skin
// excision site"); the NLCS sources are in docs/reference/skin-excision-benign-sources.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, createPart, generate, normalisePart, applyLinkedDefaults } from '../src/engine.js';
import * as gen from '../generators/skinexcision.js';
import { parseIntake, matchParts, presetValues, stripWords } from '../src/intake.js';
import { loadManifest } from '../src/registry.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('skin_excision');
const manifest = await loadManifest();
const run = (c) => generate(schema, gen, c);
const NLCS = 'Naevus lipomatosus cutaneous superficialis';

// The part as the app opens it on Skin excision, whether the line routed there or the pathologist switched
// it by hand (src/app.js prefillFromLine): the preset from the line, then the linked defaults it moves.
function opened(line) {
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
const site = (line) => opened(line).values.specimenName;

test('site: a two-piece skin line fills Site with the site alone', () => {
  // These lines parse without a detail, so before Phase 72 Site opened blank on every one.
  const cases = [
    ['Skin, Right thigh', 'right thigh'],
    ['Skin, L leg', 'L leg'],
    ['Skin, Rt forearm', 'rt forearm'],
    ['Skin, Left axilla skin papilloma 5mm + 4mm', 'left axilla'],
    ['Skin, Left anterior shin lesion, stitch at proximal', 'left anterior shin'],
    ['Skin, ? Right clavicle DFSP', 'right clavicle'],
    ['Skin, RIght alar lesion, stitch at superior', 'right alar'],
    ['Skin, Left cheek AK/Bowen\'s', 'left cheek'],
    ['Skin, occipital scalp angiofibroma', 'occipital scalp'],
    ['Skin, R forearm (perilesional)', 'R forearm'],
    ['Skin, right upper arm (distal)', 'right upper arm (distal)'],
    ['Skin, right occipital scalp BCC with 3mm margins, stitch at 12 oclock', 'right occipital scalp'],
    ['Skin, Right lower eyelid margin', 'right lower eyelid margin'],
    ['Skin and subcutaneous tissue, left thigh', 'left thigh'],
    ['right upper eyelid SK', 'right upper eyelid'],
    ['Skin, stoma site', 'stoma site']
  ];
  for (const [line, want] of cases) assert.equal(site(line), want, line);
});

test('site: a three-piece line still fills from its detail, now without the lesion words', () => {
  assert.equal(site('Skin, back, shave'), 'back');
  assert.equal(site('Skin, left cheek BCC, excision'), 'left cheek');
  assert.equal(site('Skin, right thigh nodule, excision'), 'right thigh');
});

test('site: a line that names no site leaves Site blank rather than guessing', () => {
  assert.equal(schema.fields.find((f) => f.id === 'specimenName').default, '');
  for (const line of ['Skin', 'Skin lesion', 'Skin margin A', 'Skin, Deep margin', 'Skin, further superior resection margin', 'Skin, debrided tissue']) {
    assert.equal(site(line), '', line);
  }
});

test('site: the fill rule and the casing option', () => {
  const rule = schema.match.fill.find((r) => r.field === 'specimenName');
  assert.deepEqual([rule.from, rule.fallback, rule.lower], ['detail', 'text', true]);
  assert.equal(schema.version, '2026.10');
  // `strip` cuts from the first lesion word to the end of each comma piece; a piece left empty is dropped.
  assert.equal(stripWords('Skin, left nasal scar, sttich at 12 OC', rule.strip), 'left nasal');
  assert.equal(stripWords('Skin, right hip haematoma', rule.strip), 'right hip');
  assert.equal(stripWords('Skin, left leg cellulitis', rule.strip), 'left leg');
});

test('printed: the copied site reads mid-heading in lower case', () => {
  const part = opened('Skin, Right thigh');
  part.values.diagnosis = NLCS;
  const c = createCase(schema, 1);
  c.parts[0] = { ...c.parts[0], values: part.values };
  const r = run(c);
  assert.equal(r.specimens, 'Skin, right thigh nodule, excision');
  assert.equal(r.diagnosis, 'SKIN, right thigh nodule, excision - NAEVUS LIPOMATOSUS CUTANEOUS SUPERFICIALIS; completely excised');
});

test('NLCS: an option in the fatty group, after lipoma, with its own paragraph', () => {
  const field = schema.fields.find((f) => f.id === 'diagnosis');
  assert.equal(field.options[field.options.indexOf('Lipoma') + 1], NLCS);
  assert.deepEqual(field.optionGroups.find((g) => g.label === 'Fibrous, vascular and fatty').options.slice(-2), ['Lipoma', NLCS]);
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, specimenName: 'left buttock', diagnosis: NLCS };
  const r = run(c);
  assert.equal(r.microscopy, 'Sections show skin with groups of mature adipocytes in the superficial and mid dermis, set between the collagen bundles and around small blood vessels. The adipocytes are not encapsulated and show no connection with the subcutaneous fat. No lipoblasts are seen. The findings are those of a naevus lipomatosus cutaneous superficialis. There is no evidence of malignancy. Excision is complete.');
  assert.equal(r.diagnosis, 'SKIN, left buttock nodule, excision - NAEVUS LIPOMATOSUS CUTANEOUS SUPERFICIALIS; completely excised');
});
