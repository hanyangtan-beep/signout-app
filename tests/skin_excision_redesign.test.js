// Skin lesion excision redesign: non-benign naming, orientation-adaptive margin schemes
// (unoriented radial/deep, clock-face 12/3/6/9/deep, anatomical superior/inferior/lateral/medial/deep),
// and Incision procedure (partial sampling).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, createPart, generate, isVisible, normalisePart, applyLinkedDefaults } from '../src/engine.js';
import * as gen from '../generators/skinexcision.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { loadManifest } from '../src/registry.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('skin_excision');
const manifest = await loadManifest();
const run = (c) => generate(schema, gen, c);

function set(part, id, value) {
  const before = part.values[id];
  part.values[id] = value;
  applyLinkedDefaults(schema, part, id, before);
  normalisePart(schema, part);
  return part;
}

function edited(values) {
  const c = createCase(schema, 1);
  for (const [id, v] of Object.entries(values)) set(c.parts[0], id, v);
  return c;
}

test('naming: benign removed from kindLabel, catch-all option and cancer snippet', () => {
  const entry = manifest.find((t) => t.id === 'skin_excision');
  assert.equal(entry.kindLabel, 'Excision / biopsy');
  assert.ok(!/benign/i.test(entry.kindLabel));
  const r = run(edited({ specimenName: 'forearm', diagnosis: 'Skin lesion, other' }));
  assert.ok(r.microscopy.startsWith('Sections show a skin lesion; see additional description.'));
  assert.ok(!/benign/i.test(r.microscopy));
  assert.equal(r.diagnosis, 'SKIN, forearm nodule, excision - SKIN LESION (see microscopic examination); completely excised');
  const scc = run(edited({ specimenName: 'cheek', diagnosis: 'Invasive SCC – see comment' }));
  assert.ok(!/benign/i.test(scc.comment));
});

test('unoriented excision: defaults to radial + deep margins and reports closest radial / deep', () => {
  const c = edited({ specimenName: 'back', marginRadial: '2', marginDeep: '3.5' });
  const p = c.parts[0];
  assert.equal(p.values.orientation, 'None');
  assert.equal(p.values.marginScheme, gen.SCHEME_UNORIENTED);
  const r = run(c);
  assert.ok(r.macro.includes('The specimen is not orientated.'));
  assert.ok(r.microscopy.includes('Excision is complete and the margins are as follows:\n- Closest radial: 2 mm\n- Deep: 3.5 mm'));
  assert.equal(r.diagnosis, 'SKIN, back nodule, excision - NODULAR BASAL CELL CARCINOMA; completely excised (closest margin 2 mm, radial)');

  const inv = run(edited({ specimenName: 'back', completeness: 'Involved – which', involvedMargins: ['Radial'], marginRadial: 'involved', marginDeep: '2' }));
  assert.ok(inv.microscopy.includes('Excision is incomplete; the lesion involves the radial margin.'));
  assert.equal(inv.diagnosis, 'SKIN, back nodule, excision - NODULAR BASAL CELL CARCINOMA; involved at the radial margin');
});

test('clock-face orientation: suture at 12 o\'clock switches marginScheme to 12/3/6/9/deep automatically', () => {
  const c = edited({
    specimenName: 'left temple',
    orientation: "Suture at 12 o'clock",
    margin12: '1.5',
    margin3: '3',
    margin6: '4',
    margin9: '2',
    marginDeep: '2.5'
  });
  const p = c.parts[0];
  assert.equal(p.values.marginScheme, gen.SCHEME_CLOCK);
  const visible = schema.fields.filter((f) => isVisible(f, p.values)).map((f) => f.id);
  for (const id of ['margin12', 'margin3', 'margin6', 'margin9', 'marginDeep']) assert.ok(visible.includes(id), id);
  for (const id of ['marginRadial', 'marginSuperior', 'marginInferior', 'marginLateral', 'marginMedial']) assert.ok(!visible.includes(id), `${id} hidden`);

  const r = run(c);
  assert.ok(r.macro.includes("A suture marks 12 o'clock."));
  assert.ok(!r.macro.includes('taken as superior'));
  assert.ok(r.microscopy.includes("- 12 o'clock: 1.5 mm\n- 3 o'clock: 3 mm\n- 6 o'clock: 4 mm\n- 9 o'clock: 2 mm\n- Deep: 2.5 mm"));
  assert.equal(r.diagnosis, "SKIN, left temple nodule, excision - NODULAR BASAL CELL CARCINOMA; completely excised (closest margin 1.5 mm, 12 o'clock)");

  const inv = run(edited({
    specimenName: 'left temple',
    orientation: "Suture at 12 o'clock",
    completeness: 'Involved – which',
    involvedMargins: ["3 o'clock", 'Deep']
  }));
  assert.equal(inv.diagnosis, "SKIN, left temple nodule, excision - NODULAR BASAL CELL CARCINOMA; involved at the 3 o'clock and deep margins");
});

test('switching marginScheme filters involvedMargins to valid options and keeps Deep', () => {
  const part = createPart(schema, 0);
  set(part, 'orientation', "Suture at 12 o'clock = superior");
  assert.equal(part.values.marginScheme, gen.SCHEME_ANATOMICAL);
  set(part, 'completeness', 'Involved – which');
  set(part, 'involvedMargins', ['Superior', 'Deep']);
  set(part, 'orientation', "Suture at 12 o'clock");
  assert.equal(part.values.marginScheme, gen.SCHEME_CLOCK);
  assert.deepEqual(part.values.involvedMargins, ['Deep']);
});

test('saved pre-redesign case without marginScheme keeps its anatomical margins', () => {
  const c = createCase(schema, 1);
  delete c.parts[0].values.marginScheme;
  Object.assign(c.parts[0].values, {
    specimenName: 'left cheek',
    orientation: "Suture at 12 o'clock = superior",
    marginSuperior: '1.5',
    marginInferior: '2.5',
    marginDeep: '3'
  });
  const r = run(c);
  assert.ok(r.microscopy.includes('- Superior: 1.5 mm\n- Inferior: 2.5 mm\n- Deep: 3 mm'));
  assert.equal(r.diagnosis, 'SKIN, left cheek nodule, excision - NODULAR BASAL CELL CARCINOMA; completely excised (closest margin 1.5 mm, superior)');
});

test('incision procedure: partial sampling defaults, macro, block key, microscopy and diagnosis', () => {
  const c = edited({
    specimenName: 'left shin',
    procedure: 'Incision',
    ellipseSize: '1.2x0.6x0.4',
    lesionSize: '0.8',
    diagnosis: 'Infiltrative BCC'
  });
  const p = c.parts[0];
  assert.equal(p.values.blocks, '1');
  assert.equal(p.values.clinicalLabel, '');
  assert.equal(p.values.smallMargin, 'Lesion extends to the margins (incisional biopsy)');

  const r = run(c);
  assert.equal(r.specimens, 'Skin, left shin, incision');
  assert.equal(r.macro, 'Received in formalin is an incisional biopsy of skin measuring 1.2 x 0.6 x 0.4 cm bearing a nodule measuring 0.8 cm. All embedded in 1 block.');
  assert.equal(r.blockKey, '(1) Incisional biopsy, all embedded.');
  assert.ok(r.microscopy.endsWith('The lesion extends to the margins of this incisional biopsy; completeness of excision cannot be assessed.'));
  assert.equal(r.diagnosis, 'SKIN, left shin, incision - INFILTRATIVE BASAL CELL CARCINOMA; lesion extends to the margins (incisional biopsy)');
  assert.ok(!/Excision is complete/i.test(r.microscopy));
});

test('intake: incisional biopsy of skin routes to skin_excision with Incision preset', () => {
  const r = matchParts(parseIntake('(A) Skin, left cheek, incisional biopsy'), '?BCC', manifest)[0];
  assert.equal(r.templateId, 'skin_excision');
  assert.equal(r.tier, 'confident');
  const part = createPart(schema, 0);
  const preset = presetValues(schema, r, r);
  const before = { ...part.values };
  Object.assign(part.values, preset);
  for (const k of Object.keys(preset)) applyLinkedDefaults(schema, part, k, before[k], preset);
  normalisePart(schema, part);
  assert.equal(part.values.specimenName, 'left cheek');
  assert.equal(part.values.procedure, 'Incision');
  assert.equal(part.values.blocks, '1');
  assert.equal(part.values.smallMargin, 'Lesion extends to the margins (incisional biopsy)');
});
