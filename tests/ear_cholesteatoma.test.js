// Ear — cholesteatoma, aural polyp and granulation tissue (benign batch 3). Card: docs/roadmap.md
// "Haemorrhoid, cholesteatoma and hernia sac"; house sentences from the 2021-2026 benign-resection profile.
// Wording is deliberate; update the strings only on purpose.
// Fixtures: tests/fixtures/ear_cholesteatoma/*.json (golden; --update only after a deliberate change).
// The routing lines below are house-style lines, not case text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { extractMacro } from '../src/macroparse.js';
import { rowGroups } from '../src/picker.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { KERATIN, AURAL_POLYP, GRANULATION } from '../generators/ear_cholesteatoma.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.ear_cholesteatoma;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'ear_cholesteatoma');
const UPDATE = process.argv.includes('--update');
const EXAMPLE = schema.example.parts[0].values;
const one = (values) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};
const run = (values) => generate(schema, t.generator, one(values));
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const visible = (values) => schema.fields.filter((f) => isVisible(f, { ...one({}).parts[0].values, ...values })).map((f) => f.id);
const checksOf = (r) => r.issues.map((i) => [i.level, i.field]);

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has ear_cholesteatoma');
  assert.equal(schema.system, 'Head and neck');
  assert.equal(schema.kind, 'benign resection');
  assert.ok(schema.label && !/^(biopsy|polyp|specimen)$/i.test(schema.label), 'label is an organ word');
  assert.ok(schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
  assert.equal(schema.style.british, true);
});

test('it sits in the Resections row under Head and neck and is no longer a pending placeholder', () => {
  const planned = JSON.parse(fs.readFileSync(path.join(here, '..', 'templates', 'planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((p) => p.id === 'ear_cholesteatoma'), 'not in planned.json');
  const group = rowGroups(manifest, planned, 'bottom').find((g) => g.items.some((i) => i.id === 'ear_cholesteatoma'));
  assert.ok(group, 'in the Resections & frozen row');
  assert.equal(group.system, 'Head and neck');
  assert.ok(!group.items.find((i) => i.id === 'ear_cholesteatoma').planned, 'a built template, not a pending one');
});

test('the example case renders every expected block', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, t.generator, c);
  for (const heading of [/SPECIMENS?:/, /MACROSCOPIC DESCRIPTION:/, /BLOCK KEY:/, /MICROSCOPIC EXAMINATION:/, /DIAGNOSIS:/]) assert.match(r.report, heading);
});

test('the example: cholesteatoma with granulation tissue', () => {
  const r = run(EXAMPLE);
  assert.equal(r.specimens, 'Ear, left cholesteatoma, resection');
  assert.equal(r.macro, 'Received in formalin are fragments of tan-white tissue labelled left cholesteatoma, measuring 0.8 x 0.5 x 0.2 cm in aggregate. All embedded in 1 block.');
  assert.equal(r.blockKey, '(1) Tissue fragments, all embedded.');
  assert.equal(r.microscopy, 'Sections show lamellated keratinous debris and fragments of benign keratinising squamous epithelium. Inflamed granulation tissue is also present. Features are consistent with cholesteatoma. There is no evidence of dysplasia or malignancy.');
  assert.equal(r.diagnosis, 'EAR, left cholesteatoma, resection - CHOLESTEATOMA with GRANULATION TISSUE');
  assert.equal(r.comment, '');
  assert.deepEqual(r.issues, []);
});

test('keratin alone is reported as consistent with cholesteatoma', () => {
  const r = run({ ...EXAMPLE, diagnosis: KERATIN, features: [] });
  assert.equal(r.microscopy, 'Sections show lamellated keratinous debris. No intact squamous epithelium is identified. Features are consistent with cholesteatoma. There is no evidence of malignancy.');
  assert.equal(r.diagnosis, 'EAR, left cholesteatoma, resection - Consistent with CHOLESTEATOMA');
});

test('an aural polyp and granulation tissue carry their inflammation; granulation is not repeated as a finding', () => {
  const polyp = run({ ...EXAMPLE, diagnosis: AURAL_POLYP, site: 'aural polyp', inflammation: 'Acute and chronic', description: 'A polypoid piece of tissue', features: ['Granulation tissue', 'Surface ulceration'] });
  assert.equal(polyp.specimens, 'Ear, left aural polyp, resection');
  assert.equal(polyp.macro, 'Received in formalin is a polypoid piece of tissue labelled left aural polyp, measuring 0.8 x 0.5 x 0.2 cm. All embedded in 1 block.');
  assert.equal(polyp.blockKey, '(1) Polyp, all embedded.');
  assert.equal(polyp.microscopy, 'Sections show a polypoid fragment of granulation tissue with numerous small blood vessels and a mixed acute and chronic inflammatory infiltrate of lymphocytes, plasma cells and histiocytes. The surface is ulcerated. Features are those of an aural polyp. There is no evidence of malignancy.');
  assert.equal(polyp.diagnosis, 'EAR, left aural polyp, resection - AURAL POLYP');
  const gran = run({ ...EXAMPLE, diagnosis: GRANULATION, site: '', features: ['Foreign-body giant cells', 'Cholesterol clefts', 'Bone fragments'], granulomas: 'Not present' });
  assert.equal(gran.microscopy, 'Sections show granulation tissue with a chronic inflammatory infiltrate. Several foreign body type multinucleated giant cells are seen. Cholesterol clefts surrounded by foreign body type giant cells are present. Fragments of bone are also present. Granulomas are not present. There is no evidence of malignancy.');
  assert.equal(gran.diagnosis, 'EAR, left, resection - GRANULATION TISSUE with CHRONIC INFLAMMATION');
  assert.equal(run({ ...EXAMPLE, diagnosis: GRANULATION, inflammation: 'Acute and chronic' }).diagnosis, 'EAR, left cholesteatoma, resection - GRANULATION TISSUE with ACUTE AND CHRONIC INFLAMMATION');
});

test('the inflammation field shows only for a polyp or granulation tissue', () => {
  assert.ok(!visible({ diagnosis: 'Cholesteatoma' }).includes('inflammation'));
  assert.ok(!visible({ diagnosis: KERATIN }).includes('inflammation'));
  assert.ok(visible({ diagnosis: AURAL_POLYP }).includes('inflammation'));
  assert.ok(visible({ diagnosis: GRANULATION }).includes('inflammation'));
});

test('the organ head, procedure, keratinous material and representative blocks', () => {
  const r = run({ ...EXAMPLE, organ: 'MASTOID', procedure: 'Mastoidectomy', side: 'Right', blocks: '3', blockScheme: 'Representative sections', description: 'Fragments of keratinous material' });
  assert.equal(r.specimens, 'Mastoid, right cholesteatoma, mastoidectomy');
  assert.equal(r.macro, 'Received in formalin are fragments of white keratinous material labelled right cholesteatoma, measuring 0.8 x 0.5 x 0.2 cm in aggregate. Representative sections in 3 blocks.');
  assert.equal(r.blockKey, '(1-3) Keratinous material, representative sections.');
  assert.equal(r.diagnosis, 'MASTOID, right cholesteatoma, mastoidectomy - CHOLESTEATOMA with GRANULATION TISSUE');
});

test('the Checks panel flags a side that is not stated', () => {
  const r = run({});
  assert.equal(r.diagnosis, 'EAR, resection - CHOLESTEATOMA');
  assert.deepEqual(checksOf(r), [['warn', 'side']]);
});

test('a multi-part case letters its specimens', () => {
  const r = generate(schema, t.generator, createCase(schema, 2));
  assert.match(r.specimens, /\(A\)/);
  assert.match(r.specimens, /\(B\)/);
});

// ---------- intake ----------

const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line) => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, '', manifest)[0]);
};
const flow = (line) => {
  const parsed = parseIntake(line);
  return run(presetValues(schema, parsed.parts[0], matchParts(parsed, '', manifest)[0]));
};

test('intake: ear lines land on this form, confidently, with side, diagnosis and procedure', () => {
  for (const line of ['Left ear, cholesteatoma', 'Aural polyp, right ear', 'Left ear canal, granulation tissue', 'Right mastoid, cholesteatoma, mastoidectomy', 'Left middle ear, cholesteatoma', 'Cholesteatoma',
    'Right external auditory canal, granulation, punch biopsy', 'Left attic granulation, excision']) {
    const m = route(line);
    assert.deepEqual([m.templateId, m.tier], ['ear_cholesteatoma', 'confident'], line);
  }
  assert.deepEqual(preset('Aural polyp, right ear'), { side: 'Right', diagnosis: AURAL_POLYP, site: 'Aural polyp, right ear' });
  assert.deepEqual(preset('Right mastoid, cholesteatoma, mastoidectomy'), { side: 'Right', procedure: 'Mastoidectomy', site: 'Right mastoid, cholesteatoma' });
  assert.equal(flow('Aural polyp, right ear').diagnosis, 'EAR, right aural polyp, resection - AURAL POLYP');
  assert.equal(flow('Left ear canal, granulation tissue').diagnosis, 'EAR, left ear canal granulation tissue, resection - GRANULATION TISSUE with CHRONIC INFLAMMATION');
  assert.equal(flow('Right external auditory canal, granulation, punch biopsy').specimens, 'Ear, right external auditory canal granulation, punch', 'the house writes "punch"');
});

test('intake: other head and neck lines keep their routes; the abscess form no longer takes ear granulation', () => {
  assert.equal(route('Nasal polyp').templateId, 'nasal_polyps');
  assert.equal(route('Right tonsil').templateId, 'tonsils');
  for (const line of ['Left ear, skin lesion', 'Left pinna, BCC']) assert.notEqual(route(line).templateId, 'ear_cholesteatoma', line);
  for (const line of ['Right external auditory canal, granulation, punch biopsy', 'Left attic granulation, excision']) assert.notEqual(route(line).templateId, 'abscess_granulation', line);
  assert.equal(route('Left thumb, granulation tissue').templateId, 'abscess_granulation');
});

test('pasted gross text fills the measurements, the blocks and a polypoid or keratinous description', () => {
  assert.deepEqual(extractMacro(schema, 'Received in formalin are fragments of tan-white tissue measuring 0.8 x 0.5 x 0.2 cm in aggregate. All embedded in 1 block.'),
    { dimensions: '0.8 x 0.5 x 0.2', blocks: '1', blockScheme: 'All embedded' });
  assert.equal(extractMacro(schema, 'Received in formalin is a polypoid piece of tissue measuring 0.6 x 0.4 x 0.3 cm. All embedded in 1 block.').description, 'A polypoid piece of tissue');
  assert.equal(extractMacro(schema, 'Received in formalin are fragments of white cheesy material. All embedded in 1 block.').description, 'Fragments of keratinous material');
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-cholesteatoma-example', EXAMPLE],
  ['02-keratin-only', { ...EXAMPLE, diagnosis: KERATIN, features: [], description: 'Fragments of keratinous material' }],
  ['03-aural-polyp', { ...EXAMPLE, side: 'Right', site: 'aural polyp', diagnosis: AURAL_POLYP, description: 'A polypoid piece of tissue', dimensions: '0.6 x 0.4 x 0.3', features: ['Surface ulceration'] }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'ear_cholesteatoma', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
