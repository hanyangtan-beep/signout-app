// Phase 43: Skin — small benign lesion (skin_lesion) retired into Skin lesion excision (user 2026-09-26).
// A Procedure field brings the retired form's shave, punch and curettings wording across; blocks, the
// clinical label, the lesion appearance and the diagnosis follow the procedure until the pathologist
// changes them. Wording is deliberate; update the strings only on purpose. Sources for the four added
// paragraphs are in docs/reference/skin-excision-benign-sources.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, createPart, generate, isVisible, normalisePart, linkedDefault, applyLinkedDefaults } from '../src/engine.js';
import * as gen from '../generators/skinexcision.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { applyMacroToCase } from '../src/macroparse.js';
import { loadManifest } from '../src/registry.js';
import { rankTemplates } from '../src/picker.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('skin_excision');
const manifest = await loadManifest();
const run = (c) => generate(schema, gen, c);
const fieldOf = (id) => schema.fields.find((f) => f.id === id);

// The app's setValue: record the old value, set the new one, move the linked defaults, then coerce.
function set(part, id, value) {
  const before = part.values[id];
  part.values[id] = value;
  applyLinkedDefaults(schema, part, id, before);
  normalisePart(schema, part);
  return part;
}
// One part built the way the form builds it, then edited field by field in the order given.
function edited(values) {
  const c = createCase(schema, 1);
  for (const [id, v] of Object.entries(values)) set(c.parts[0], id, v);
  return c;
}
const route = (line, history = '') => matchParts(parseIntake(`(A) ${line}`), history, manifest)[0];
// Build parts, as src/app.js does it: the routed part's preset, then the linked defaults it moves.
function built(line, history = '') {
  const r = route(line, history);
  assert.equal(r.templateId, 'skin_excision', `${line} | ${history}`);
  assert.equal(r.tier, 'confident', `${line} | ${history}`);
  const part = createPart(schema, 0);
  const preset = presetValues(schema, r, r);
  const before = { ...part.values };
  Object.assign(part.values, preset);
  for (const k of Object.keys(preset)) applyLinkedDefaults(schema, part, k, before[k], preset);
  normalisePart(schema, part);
  return part.values;
}

const SK_OPEN = 'Sections show an acanthotic epidermis with elongation of rete ridges and overlying papillomatosis forming a verrucous, exophytic configuration.';

test('engine: linkedDefault reads the map and falls back to the field default', () => {
  const f = { id: 'n', default: '3', defaultByField: { field: 'p', map: { A: '1' } } };
  assert.equal(linkedDefault(f, 'A'), '1');
  assert.equal(linkedDefault(f, 'B'), '3');
  assert.equal(linkedDefault({ id: 'x', default: 'd' }, 'A'), 'd');
  const s = { fields: [{ id: 'p', default: 'B' }, f, { id: 'm', default: [], defaultByField: { field: 'p', map: { A: ['x'] } } }] };
  const part = { values: { p: 'A', n: '3', m: [] } };
  applyLinkedDefaults(s, part, 'p', 'B');
  assert.deepEqual(part.values, { p: 'A', n: '1', m: ['x'] });
  part.values.n = '5';
  part.values.p = 'B';
  applyLinkedDefaults(s, part, 'p', 'A');
  assert.equal(part.values.n, '5', 'a typed value is left alone');
  assert.deepEqual(part.values.m, [], 'a list default moves back');
  part.values.p = 'A';
  applyLinkedDefaults(s, part, 'p', 'B', { m: ['y'] });
  assert.deepEqual(part.values.m, [], 'a field named in skip is left alone');
});

test('schema: Procedure follows the site; four linked defaults; the small margin list', () => {
  const ids = schema.fields.map((f) => f.id);
  assert.equal(ids[ids.indexOf('specimenName') + 1], 'procedure');
  const proc = fieldOf('procedure');
  assert.equal(proc.type, 'select');
  assert.deepEqual(proc.options, ['Excision', 'Shave', 'Punch', 'Curettings']);
  assert.equal(proc.default, 'Excision');
  assert.deepEqual(fieldOf('blocks').defaultByField, { field: 'procedure', map: { Shave: '1', Punch: '1', Curettings: '1' } });
  assert.equal(linkedDefault(fieldOf('clinicalLabel'), 'Shave'), '');
  assert.equal(linkedDefault(fieldOf('clinicalLabel'), 'Excision'), 'nodule');
  assert.equal(linkedDefault(fieldOf('lesionAppearance'), 'Punch'), 'Papule');
  assert.equal(linkedDefault(fieldOf('diagnosis'), 'Curettings'), 'Seborrhoeic keratosis');
  assert.equal(linkedDefault(fieldOf('diagnosis'), 'Punch'), 'Nodular basal cell carcinoma');
  const small = fieldOf('smallMargin');
  assert.deepEqual(small.options, ['Not stated', 'Completely excised', 'Lesion extends to the edge of the shave', 'Lesion extends to the lateral margin', 'Involves deep margin']);
  assert.equal(small.default, 'Not stated');
  assert.ok(!small.optionsByField.map.Punch.includes('Lesion extends to the edge of the shave'));
  assert.equal(fieldOf('ellipseSize').label, 'Specimen size (cm)');
  assert.equal(schema.example.parts[0].values.procedure, 'Excision');
  assert.equal(manifest.find((t) => t.id === 'skin_lesion'), undefined, 'the retired form is gone');
});

test('visibility: a shave or punch hides the ellipse fields; curettings also hide size, appearance and margins', () => {
  const hidden = (procedure) => schema.fields.filter((f) => !isVisible(f, { ...createPart(schema, 0).values, procedure })).map((f) => f.id);
  const ELLIPSE = ['orientation', 'macroMargin', 'inking', 'blockScheme', 'marginSuperior', 'marginInferior', 'marginLateral', 'marginMedial', 'marginDeep', 'completeness'];
  for (const p of ['Shave', 'Punch']) {
    const h = hidden(p);
    for (const id of ELLIPSE) assert.ok(h.includes(id), `${p}: ${id}`);
    for (const id of ['smallMargin', 'lesionSize', 'lesionAppearance', 'ellipseSize', 'blocks']) assert.ok(!h.includes(id), `${p}: ${id} shows`);
  }
  const cur = hidden('Curettings');
  for (const id of [...ELLIPSE, 'smallMargin', 'lesionSize', 'lesionAppearance']) assert.ok(cur.includes(id), `Curettings: ${id}`);
  const exc = hidden('Excision');
  for (const id of ELLIPSE) assert.ok(!exc.includes(id), `Excision: ${id} shows`);
  assert.ok(exc.includes('smallMargin'));
});

test('shave: macro, block key, margin sentence and diagnosis in the retired form\'s wording', () => {
  const r = run(edited({ specimenName: 'back', procedure: 'Shave', ellipseSize: '0.6x0.4x0.2', lesionSize: '0.3', smallMargin: 'Lesion extends to the edge of the shave' }));
  assert.equal(r.specimens, 'Skin, back, shave');
  assert.equal(r.macro, 'Received in formalin is a shave of skin measuring 0.6 x 0.4 x 0.2 cm bearing a papule measuring 0.3 cm. All embedded in 1 block.');
  assert.equal(r.blockKey, '(1) Shave, all embedded.');
  assert.ok(r.microscopy.startsWith(SK_OPEN), 'the diagnosis followed the procedure to seborrhoeic keratosis');
  assert.ok(r.microscopy.endsWith('There is no evidence of dysplasia or malignancy. The lesion extends to the edge of the shave.'));
  assert.equal(r.diagnosis, 'SKIN, back, shave - SEBORRHOEIC KERATOSIS; lesion extends to the edge of the shave');
  assert.ok(!/ellipse|inked|orientat/i.test(r.report));
});

test('punch: two blocks give a range; completely excised prints once in each section', () => {
  const r = run(edited({ specimenName: 'right forearm', procedure: 'Punch', ellipseSize: '0.4 x 0.4 x 0.3', blocks: '2', diagnosis: 'Irritated seborrhoeic keratosis', smallMargin: 'Completely excised' }));
  assert.equal(r.macro, 'Received in formalin is a punch biopsy of skin measuring 0.4 x 0.4 x 0.3 cm bearing a papule. All embedded in 2 blocks.');
  assert.equal(r.blockKey, '(1-2) Punch, all embedded.');
  assert.ok(r.microscopy.endsWith('There is no evidence of dysplasia or malignancy. The lesion is completely excised.'));
  assert.equal(r.diagnosis, 'SKIN, right forearm, punch - IRRITATED SEBORRHOEIC KERATOSIS; completely excised');
});

test('curettings: aggregate size, no lesion noun and no margin, whatever the hidden margin field holds', () => {
  const c = edited({ specimenName: 'chest', procedure: 'Curettings', ellipseSize: '1.2x1x0.3' });
  c.parts[0].values.smallMargin = 'Completely excised';
  const r = run(c);
  assert.equal(r.specimens, 'Skin, chest, curettings');
  assert.equal(r.macro, 'Received in formalin are multiple fragments of skin (curettings) measuring 1.2 x 1 x 0.3 cm in aggregate. All embedded in 1 block.');
  assert.equal(r.blockKey, '(1) Curettings, all embedded.');
  assert.ok(r.microscopy.endsWith('There is no evidence of dysplasia or malignancy.'));
  assert.equal(r.diagnosis, 'SKIN, chest, curettings - SEBORRHOEIC KERATOSIS');
  assert.equal(gen.smallMarginSentence(c.parts[0].values), '');
  assert.equal(gen.smallMarginClause(c.parts[0].values), '');
});

test('small margins: each option prints its sentence and clause; not stated prints nothing', () => {
  for (const [opt, sentence, clause] of [
    ['Completely excised', 'The lesion is completely excised.', 'completely excised'],
    ['Lesion extends to the edge of the shave', 'The lesion extends to the edge of the shave.', 'lesion extends to the edge of the shave'],
    ['Lesion extends to the lateral margin', 'The lesion extends to the lateral margin.', 'lesion extends to the lateral margin'],
    ['Involves deep margin', 'The lesion involves the deep margin.', 'lesion involves the deep margin'],
    ['Not stated', '', '']
  ]) {
    const v = { procedure: 'Shave', smallMargin: opt };
    assert.equal(gen.smallMarginSentence(v), sentence, opt);
    assert.equal(gen.smallMarginClause(v), clause, opt);
  }
  const r = run(edited({ specimenName: 'back', procedure: 'Shave' }));
  assert.equal(r.diagnosis, 'SKIN, back, shave - SEBORRHOEIC KERATOSIS');
  assert.ok(r.microscopy.endsWith('There is no evidence of dysplasia or malignancy.'));
});

test('linked defaults: blocks, label, appearance and diagnosis follow the procedure until typed', () => {
  const part = createCase(schema, 1).parts[0];
  assert.deepEqual([part.values.blocks, part.values.clinicalLabel, part.values.lesionAppearance, part.values.diagnosis], ['3', 'nodule', 'Nodule', 'Nodular basal cell carcinoma']);
  set(part, 'procedure', 'Shave');
  assert.deepEqual([part.values.blocks, part.values.clinicalLabel, part.values.lesionAppearance, part.values.diagnosis], ['1', '', 'Papule', 'Seborrhoeic keratosis']);
  set(part, 'procedure', 'Punch');
  assert.deepEqual([part.values.blocks, part.values.diagnosis], ['1', 'Nodular basal cell carcinoma']);
  set(part, 'procedure', 'Excision');
  assert.deepEqual([part.values.blocks, part.values.clinicalLabel, part.values.lesionAppearance, part.values.diagnosis], ['3', 'nodule', 'Nodule', 'Nodular basal cell carcinoma']);
  set(part, 'blocks', '4');
  set(part, 'diagnosis', 'Dermatofibroma');
  set(part, 'clinicalLabel', 'papule');
  set(part, 'procedure', 'Shave');
  assert.deepEqual([part.values.blocks, part.values.diagnosis, part.values.clinicalLabel], ['4', 'Dermatofibroma', 'papule'], 'typed values are left alone');
});

test('a punch cannot keep the edge-of-shave margin: it falls back to not stated', () => {
  const part = createCase(schema, 1).parts[0];
  set(part, 'procedure', 'Shave');
  set(part, 'smallMargin', 'Lesion extends to the edge of the shave');
  set(part, 'procedure', 'Punch');
  assert.equal(part.values.smallMargin, 'Not stated');
});

test('a pasted macro fills blocks on a shave, and clearing it goes back to the shave default', () => {
  const c = edited({ procedure: 'Shave' });
  c.meta = { ...c.meta, macro: 'Received in formalin is a shave of skin measuring 0.6 x 0.4 x 0.2 cm. All embedded in 2 blocks.' };
  applyMacroToCase(c, () => schema);
  assert.equal(c.parts[0].values.blocks, '2');
  assert.equal(c.parts[0].values.ellipseSize, '0.6 x 0.4 x 0.2');
  c.meta.macro = '';
  applyMacroToCase(c, () => schema);
  assert.equal(c.parts[0].values.blocks, '1', 'the linked default, not the ellipse 3');
  const typed = edited({ procedure: 'Shave', blocks: '4' });
  typed.meta = { ...typed.meta, macro: 'All embedded in 2 blocks.' };
  applyMacroToCase(typed, () => schema);
  assert.equal(typed.parts[0].values.blocks, '4', 'a typed count is never overwritten');
});

test('Phase 43 diagnoses: microscopy and diagnosis lines on an excision', () => {
  const NO_MAL = 'There is no evidence of malignancy.';
  for (const [dx, main, micro] of [
    ['Irritated seborrhoeic keratosis', 'IRRITATED SEBORRHOEIC KERATOSIS', `${SK_OPEN} Squamous eddies are present within the lesion. The epidermis is composed of cytologically bland keratinocytes without significant nuclear atypia or dysplasia. The underlying dermis shows a brisk lichenoid lymphocytic infiltrate. The findings are those of an irritated seborrhoeic keratosis. There is no evidence of dysplasia or malignancy.`],
    ['Junctional naevus', 'JUNCTIONAL NAEVUS', `Sections show skin with nests of bland naevus cells confined to the dermo-epidermal junction. There is no dermal component. No atypical features are seen. The findings are those of a junctional naevus. ${NO_MAL}`],
    ['Congenital melanocytic naevus', 'CONGENITAL MELANOCYTIC NAEVUS', `Sections show skin with nests and cords of bland naevus cells within the dermis, showing maturation with descent. Naevus cells extend around adnexal structures and neurovascular bundles in the deeper dermis. No atypical features are seen. The findings are those of a congenital melanocytic naevus. ${NO_MAL}`],
    ['Hypertrophic scar', 'HYPERTROPHIC SCAR', `Sections show skin in which the dermis is replaced by nodules of fibrous tissue, with collagen bundles and fibroblasts arranged parallel to the epidermis, vertically orientated small blood vessels and loss of adnexal structures. The findings are those of a hypertrophic scar. ${NO_MAL}`]
  ]) {
    const r = run(edited({ specimenName: 'back', diagnosis: dx }));
    assert.equal(r.microscopy, `${micro} Excision is complete.`, dx);
    assert.equal(r.diagnosis, `SKIN, back nodule, excision - ${main}; completely excised`, dx);
    const AMERICAN = /\b(tumors?|nevus|nevi|hemangioma|hyalinized|color|edema|oriented)\b/i;
    const REGISTER = /\bWHO\b|by definition|exclude|favou?r|recommend|should|prognos|suggest|probabl|cannot|consistent with/i;
    assert.ok(!AMERICAN.test(r.microscopy) && !REGISTER.test(r.microscopy), dx);
  }
  const groups = fieldOf('diagnosis').optionGroups;
  const inGroup = (label) => groups.find((g) => g.label === label).options;
  assert.ok(inGroup('Keratinocytic').includes('Irritated seborrhoeic keratosis'));
  assert.ok(inGroup('Melanocytic').includes('Junctional naevus') && inGroup('Melanocytic').includes('Congenital melanocytic naevus'));
  assert.ok(inGroup('Fibrous, vascular and fatty').includes('Hypertrophic scar'));
});

test('a saved case with no procedure prints as an excision, as it did before', () => {
  const c = createCase(schema, 1);
  delete c.parts[0].values.procedure;
  delete c.parts[0].values.smallMargin;
  Object.assign(c.parts[0].values, { specimenName: 'left cheek', diagnosis: 'Seborrhoeic keratosis' });
  const r = run(c);
  assert.equal(r.specimens, 'Skin, left cheek nodule, excision');
  assert.ok(r.macro.startsWith('Received in formalin is an ellipse of skin bearing a nodule.'));
  assert.equal(r.blockKey, '(1) Tip A. (2) Lesion, cross-sections. (3) Tip B.');
  assert.equal(r.diagnosis, 'SKIN, left cheek nodule, excision - SEBORRHOEIC KERATOSIS; completely excised');
});

test('intake: a shave or punch whose history names a lesion opens Skin excision with the procedure set', () => {
  const build = built;
  const shave = build('Skin, back, shave', 'seborrhoeic keratosis');
  assert.deepEqual([shave.specimenName, shave.procedure, shave.blocks, shave.clinicalLabel, shave.diagnosis], ['back', 'Shave', '1', '', 'Seborrhoeic keratosis']);
  const punch = build('Skin, arm, punch', '?dermatofibroma');
  assert.deepEqual([punch.procedure, punch.blocks, punch.lesionAppearance], ['Punch', '1', 'Papule']);
  const cur = build('Skin, nose, curettage', 'seborrhoeic keratosis');
  assert.deepEqual([cur.procedure, cur.blocks], ['Curettings', '1']);
  const exc = build('Skin, left cheek, excision', 'BCC');
  assert.deepEqual([exc.procedure, exc.blocks, exc.clinicalLabel], ['Excision', '3', 'nodule']);
  assert.equal(route('Skin, back, excision').tier, 'choose', 'the specimen line alone still offers the choice');
});

test('intake: skin curettings open Skin excision on the specimen line alone, with Curettings preset', () => {
  // Phase 44 (pulled by the user 2026-09-26): `match.own`. Before it the resection-kind gate left the
  // form at -1 on a curettings line and every skin curettings part in both exports opened Generic.
  for (const line of ['Skin, back, curetting', 'Skin, back, curettings', 'Skin lesion, chest, curettage', 'Scalp, curettings', 'Face, curettage', 'Skin, left breast, curetting']) {
    const r = route(line);
    assert.deepEqual([r.templateId, r.tier], ['skin_excision', 'confident'], line);
  }
  const v = built('Skin, back, curetting');
  assert.deepEqual([v.specimenName, v.procedure, v.blocks, v.clinicalLabel, v.diagnosis], ['back', 'Curettings', '1', '', 'Seborrhoeic keratosis']);
  const c = createCase(schema, 1);
  c.parts[0].values = v;
  const printed = run(c);
  assert.equal(printed.diagnosis, 'SKIN, back, curettings - SEBORRHOEIC KERATOSIS');
  assert.equal(printed.blockKey, '(1) Curettings, all embedded.');
  // Curettings anywhere else keep their route, and the other small procedures still need a history.
  assert.equal(route('Endometrium, curettings').templateId, 'endometrial_biopsy');
  assert.equal(route('Products of gestation, suction curettage').templateId, 'endometrial_biopsy');
  assert.equal(route('Left ear, mastoid cavity, curetting').templateId, 'ear_cholesteatoma');
  assert.equal(route('Bone, tibia, curettage').templateId, 'bone_joint');
  for (const line of ['Left upper eyelid, chalazion, curettage', 'Lip, curettage', 'Nose, curettage', 'Skin, back, shave']) {
    assert.equal(route(line).templateId, 'generic', line);
  }
  // Phase 68 (2026-10-11): a bare skin punch opens the inflammatory skin biopsy form, as most skin punches on both
  // exports are medical biopsies (77% and 89%); a punch with a lesion history keeps Skin excision.
  assert.equal(route('Skin, back, punch').templateId, 'skin_inflammatory');
  for (const history of ['?BCC', 'pigmented lesion']) assert.equal(route('Skin, back, punch', history).templateId, 'skin_excision', history);
});

test('picker: the retired form\'s searches find Skin excision', () => {
  const first = (q) => rankTemplates(manifest, q)[0]?.id;
  for (const q of ['small benign lesion', 'small lesion', 'shave', 'punch', 'curettings', 'curettage', 'wart', 'irritated seborrhoeic keratosis', 'junctional naevus', 'congenital naevus', 'hypertrophic scar']) {
    assert.equal(first(q), 'skin_excision', q);
  }
});
