// Products of gestation on the endometrial form (benign batch 2). Card: docs/roadmap.md, pulled into Now
// 2026-09-24; spec docs/specs/products-of-gestation.md. Wording is deliberate; update the strings only on purpose.
// Fixtures: tests/fixtures/products_of_gestation/*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible, snippetsFor } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { POG_TYPES, isPog } from '../generators/endometrial.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.endometrial_biopsy;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'products_of_gestation');
const UPDATE = process.argv.includes('--update');
const field = (id) => schema.fields.find((f) => f.id === id);
const one = (values) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};
const run = (values) => generate(schema, t.generator, one(values));
const withTemplate = (c) => ({ ...c, parts: c.parts.map((p) => ({ ...p, templateId: schema.id })) });
const suggested = (values) => snippetsFor({ [schema.id]: t }, withTemplate(one(values))).filter((sn) => sn.suggested).map((sn) => sn.id);
const [MASS, MASS_PV, SUCTION, ERPC] = POG_TYPES;
const GESTATIONAL = 'Gestational (decidua and hypersecretory glands)';
const IMPLANT = 'Absent; implantation-site trophoblast present';
const POG_FIELDS = ['villi', 'villousAppearance', 'villitis', 'gtd', 'decidua', 'hypersecretory', 'foetalParts'];

test('the four specimen types follow the endometrial ones, and the checklist fields follow the type', () => {
  assert.deepEqual(field('specimenType').options, [
    'Endometrial aspirate', 'Endometrial curettings', 'Endometrial biopsy', 'Hysteroscopic biopsy', 'Endometrial polypectomy',
    'Tissue mass', 'Tissue mass, per vaginam', 'Uterus, suction evacuation', 'Uterus, evacuation of retained products of gestation'
  ]);
  assert.equal(field('specimenType').default, 'Endometrial aspirate', 'an aspirate by default (2026-10-05)');
  assert.deepEqual(schema.fields.slice(1, 8).map((f) => f.id), POG_FIELDS);
  assert.deepEqual(field('villi').options, ['Present', 'Absent', IMPLANT]);
  assert.equal(field('villi').default, '', 'villi start blank: the pathologist records them');
  assert.deepEqual(field('villousAppearance').options, ['Unremarkable', 'Hydropic change', 'Sclerotic']);
  assert.deepEqual(field('gtd').options, ['No evidence', 'Partial hydatidiform mole', 'Complete hydatidiform mole']);
  assert.ok(isPog({ specimenType: MASS_PV }));
  assert.ok(!isPog({ specimenType: 'Endometrial curettings' }));
});

test('a products-of-gestation type shows the checklist and hides the endometrial fields', () => {
  const vis = (id, values) => isVisible(field(id), { ...one({}).parts[0].values, ...values });
  const ENDO = ['amount', 'phase', 'polyp', 'metaplasia', 'endometritis', 'hyperplasia', 'carcinoma', 'poc', 'endocervix'];
  for (const specimenType of POG_TYPES) {
    for (const id of ['villi', 'decidua', 'hypersecretory', 'foetalParts']) assert.equal(vis(id, { specimenType }), true, `${specimenType}: ${id}`);
    for (const id of ENDO) assert.equal(vis(id, { specimenType, carcinoma: 'Endometrioid carcinoma', hyperplasia: 'Hyperplasia without atypia', phase: GESTATIONAL }), false, `${specimenType}: ${id}`);
    assert.equal(vis('additionalNotes', { specimenType }), true);
  }
  for (const id of POG_FIELDS) assert.equal(vis(id, { specimenType: 'Endometrial curettings', villi: 'Present' }), false, `curettings: ${id}`);
  for (const id of ['villousAppearance', 'villitis', 'gtd']) {
    assert.equal(vis(id, { specimenType: MASS, villi: 'Present' }), true, `${id} with villi`);
    assert.equal(vis(id, { specimenType: MASS, villi: 'Absent' }), false, `${id} without villi`);
    assert.equal(vis(id, { specimenType: MASS, villi: '' }), false, `${id} before villi are recorded`);
  }
});

test('the microscopy is the house checklist', () => {
  assert.equal(run({ specimenType: MASS_PV, villi: 'Present' }).microscopy, [
    '- Chorionic villi',
    '   - Present',
    '   - Villitis absent',
    '   - No evidence of gestational trophoblastic disease',
    '- Decidua: Present',
    '- Hypersecretory endometrium: Present',
    '- Foetal parts: Absent'
  ].join('\n'));
  assert.equal(run({ specimenType: SUCTION, villi: 'Absent', hypersecretory: 'Absent' }).microscopy, [
    '- Chorionic villi',
    '   - Absent',
    '- Decidua: Present',
    '- Hypersecretory endometrium: Absent',
    '- Foetal parts: Absent'
  ].join('\n'));
  assert.match(run({ specimenType: ERPC, villi: IMPLANT }).microscopy, /^- Chorionic villi\n {3}- Absent\n- Implantation-site intermediate trophoblast: Present\n- Decidua: Present\n/);
  assert.match(run({ specimenType: MASS }).microscopy, /^- Chorionic villi\n {3}- Not recorded\n/);
  assert.match(run({ specimenType: MASS, villi: 'Present', villousAppearance: 'Hydropic change' }).microscopy, /\n {3}- Present \(with hydropic change\)\n/);
  assert.match(run({ specimenType: MASS, villi: 'Present', villousAppearance: 'Sclerotic', villitis: 'Present' }).microscopy, /\n {3}- Present \(sclerotic\)\n {3}- Villitis present\n/);
  assert.match(run({ specimenType: MASS, villi: 'Present', gtd: 'Complete hydatidiform mole' }).microscopy, /\n {3}- Features of complete hydatidiform mole\n/);
  assert.match(run({ specimenType: MASS, villi: 'Present', foetalParts: 'Present', additionalNotes: 'Placental membranes are present.' }).microscopy,
    /- Foetal parts: Present\nPlacental membranes are present\.$/);
});

test('each finding prints its own diagnosis line under the specimen head', () => {
  const heads = [[MASS, 'TISSUE MASS'], [MASS_PV, 'TISSUE MASS, per vaginam'], [SUCTION, 'UTERUS, suction evacuation'], [ERPC, 'UTERUS, evacuation of retained products of gestation']];
  for (const [specimenType, head] of heads) {
    const r = run({ specimenType, villi: 'Present' });
    assert.equal(r.diagnosis, `${head} - PRODUCTS OF GESTATION confirmed`, specimenType);
    assert.equal(r.specimens, specimenType);
  }
  const lines = [
    [{ villi: 'Present', gtd: 'Partial hydatidiform mole' }, 'Consistent with PARTIAL HYDATIDIFORM MOLE'],
    [{ villi: 'Present', gtd: 'Complete hydatidiform mole' }, 'COMPLETE HYDATIDIFORM MOLE'],
    [{ villi: 'Absent' }, 'DECIDUA only'],
    [{ villi: 'Absent', decidua: 'Absent' }, 'HYPERSECRETORY ENDOMETRIUM only'],
    [{ villi: 'Absent', decidua: 'Absent', hypersecretory: 'Absent' }, 'NO PRODUCTS OF GESTATION IDENTIFIED'],
    [{ villi: 'Absent', foetalParts: 'Present' }, 'PRODUCTS OF GESTATION confirmed'],
    [{ villi: IMPLANT }, 'IMPLANTATION-SITE TROPHOBLAST WITHOUT CHORIONIC VILLI'],
    [{}, 'chorionic villi not recorded']
  ];
  for (const [values, want] of lines) assert.equal(run({ specimenType: MASS, ...values }).diagnosis, `TISSUE MASS - ${want}`, JSON.stringify(values));
});

test('stale endometrial values do not print on a products-of-gestation part', () => {
  const r = run({ specimenType: MASS, villi: 'Present', carcinoma: 'Endometrioid carcinoma', mmr: 'Loss of MSH6', hyperplasia: 'Atypical hyperplasia / EIN', amount: 'Scanty (limited assessment)', polyp: 'Present' });
  assert.equal(r.diagnosis, 'TISSUE MASS - PRODUCTS OF GESTATION confirmed');
  assert.doesNotMatch(r.report, /carcinoma|hyperplasia|polyp|Mismatch repair|scanty/i);
  assert.deepEqual(suggested({ specimenType: MASS, villi: 'Present', hyperplasia: 'Atypical hyperplasia / EIN', amount: 'Scanty (limited assessment)', mmr: 'Loss of MSH6' }), []);
  assert.deepEqual(suggested({ specimenType: 'Endometrial curettings', hyperplasia: 'Atypical hyperplasia / EIN' }), ['endo_ah_comment'], 'the endometrial comments still fire on an endometrial part');
});

test('Checks: villi must be recorded; no villi prompts an ectopic pregnancy; a mole prompts urgent communication', () => {
  assert.deepEqual(run({ specimenType: MASS }).issues.map((i) => [i.level, i.field]), [['error', 'villi']]);
  assert.deepEqual(run({ specimenType: MASS, villi: 'Present' }).issues, []);
  const noVilli = run({ specimenType: SUCTION, villi: 'Absent' }).issues;
  assert.deepEqual(noVilli.map((i) => [i.level, i.field]), [['warn', 'villi']]);
  assert.match(noVilli[0].message, /ectopic pregnancy should be suspected/);
  assert.deepEqual(run({ specimenType: SUCTION, villi: 'Absent', foetalParts: 'Present' }).issues, [], 'foetal parts confirm an intrauterine gestation');
  assert.deepEqual(run({ specimenType: SUCTION, villi: IMPLANT }).issues, [], 'implantation-site trophoblast confirms an intrauterine gestation');
  const mole = run({ specimenType: ERPC, villi: 'Present', gtd: 'Partial hydatidiform mole' }).issues;
  assert.deepEqual(mole.map((i) => [i.level, i.field]), [['warn', 'gtd']]);
  assert.deepEqual(run({ specimenType: 'Endometrial curettings' }).issues, [], 'an endometrial part has no checks');
});

test('the mole comments are suggested; the no-villi comment is offered, never automatic', () => {
  assert.deepEqual(suggested({ specimenType: MASS, villi: 'Present', gtd: 'Partial hydatidiform mole' }), ['pog_partial_mole']);
  assert.deepEqual(suggested({ specimenType: MASS, villi: 'Present', gtd: 'Complete hydatidiform mole' }), ['pog_complete_mole']);
  assert.deepEqual(suggested({ specimenType: MASS, villi: 'Absent', gtd: 'Complete hydatidiform mole' }), [], 'a stale mole without villi is not suggested');
  assert.deepEqual(suggested({ specimenType: MASS, villi: 'Absent' }), []);
  const sn = schema.snippets.find((s) => s.id === 'pog_no_villi');
  assert.ok(sn && !sn.auto);
  const partial = run({ specimenType: MASS, villi: 'Present', gtd: 'Partial hydatidiform mole' }).report;
  assert.match(partial, /p57KIP2 immunohistochemistry cannot distinguish a partial hydatidiform mole from a non-molar hydropic or aneuploid gestation/);
  const c = one({ specimenType: SUCTION, villi: 'Absent' });
  c.snippets = { pog_no_villi: true };
  assert.match(generate(schema, t.generator, c).report, /The possibility of an ectopic pregnancy should be considered; correlation with the serum hCG level and ultrasound findings is suggested\.$/);
});

test('endometrial curettings with villi now read PRODUCTS OF GESTATION confirmed', () => {
  const r = run({ specimenType: 'Endometrial curettings', phase: GESTATIONAL, poc: 'Chorionic villi present' });
  assert.equal(r.diagnosis, 'ENDOMETRIUM, curettings - PRODUCTS OF GESTATION confirmed; no evidence of gestational trophoblastic disease');
  assert.doesNotMatch(r.report, /CONCEPTION/);
  assert.equal(run({ specimenType: 'Endometrial curettings', phase: GESTATIONAL, poc: 'Implantation-site trophoblast without villi' }).diagnosis,
    'ENDOMETRIUM, curettings - IMPLANTATION-SITE TROPHOBLAST WITHOUT CHORIONIC VILLI; no evidence of gestational trophoblastic disease');
});

test('a multi-part case letters the checklist', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, specimenType: MASS, villi: 'Present' };
  c.parts[1].values = { ...c.parts[1].values, specimenType: MASS_PV, villi: 'Absent' };
  const r = generate(schema, t.generator, c);
  assert.equal(r.specimens, '(A) Tissue mass\n(B) Tissue mass, per vaginam');
  assert.match(r.microscopy, /^\(A\)\n- Chorionic villi\n {3}- Present\n/);
  assert.match(r.microscopy, /\n\n\(B\)\n- Chorionic villi\n {3}- Absent\n/);
  assert.equal(r.diagnosis, '(A) TISSUE MASS - PRODUCTS OF GESTATION confirmed\n(B) TISSUE MASS, per vaginam - DECIDUA only');
});

// ---------- intake ----------

const route = (line) => matchParts(parseIntake(line), '', manifest)[0];
const preset = (line) => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, '', manifest)[0]);
};

test('intake: the house request lines land on this form first', () => {
  for (const line of ['Tissue mass per vagina', 'TISSUE MASS', 'Uterus, suction evacuation', 'Uterus, suction evacuate', 'Uterus, evacuation of retained products of gestation', 'ERPC', 'Products of gestation', 'Retained product of gestation', 'Tissue mass, miscarriage']) {
    const m = route(line);
    assert.equal(m.templateId, 'endometrial_biopsy', line);
    assert.equal(m.tier, 'confident', line);
  }
});

test('intake: the specimen type and the gestational phase are pre-filled from the line', () => {
  assert.deepEqual(preset('Tissue mass per vagina'), { specimenType: MASS_PV, phase: GESTATIONAL });
  assert.deepEqual(preset('Tissue mass passed PV'), { specimenType: MASS_PV, phase: GESTATIONAL });
  assert.deepEqual(preset('Uterus, suction evacuation'), { specimenType: SUCTION, phase: GESTATIONAL });
  assert.deepEqual(preset('Uterus, evacuation of retained products'), { specimenType: ERPC, phase: GESTATIONAL });
  assert.deepEqual(preset('ERPC'), { specimenType: ERPC, phase: GESTATIONAL });
  assert.deepEqual(preset('Products of gestation'), { specimenType: MASS, phase: GESTATIONAL });
  assert.deepEqual(preset('Endometrial curettings, miscarriage'), { specimenType: 'Endometrial curettings', phase: GESTATIONAL }, 'an endometrial line keeps its endometrial type');
  assert.deepEqual(preset('Endometrial pipelle'), { specimenType: 'Endometrial aspirate' }, 'a Pipelle sample is an aspirate (2026-10-05)');
});

test('intake: other suction, evacuation and tissue-mass lines keep their own route', () => {
  assert.notEqual(route('Rectum, suction biopsy').templateId, 'endometrial_biopsy');
  assert.notEqual(route('Subdural haematoma, evacuation').templateId, 'endometrial_biopsy');
  assert.notEqual(route('Soft tissue mass, thigh').templateId, 'endometrial_biopsy');
  assert.notEqual(route('Left breast tissue mass').templateId, 'endometrial_biopsy');
  assert.equal(route('Placenta, miscarriage').templateId, 'placenta');
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-tissue-mass-per-vaginam-villi', { specimenType: MASS_PV, villi: 'Present' }],
  ['02-suction-evacuation-no-villi', { specimenType: SUCTION, villi: 'Absent' }],
  ['03-evacuation-partial-mole', { specimenType: ERPC, villi: 'Present', villousAppearance: 'Hydropic change', gtd: 'Partial hydatidiform mole' }],
  ['04-curettings-chorionic-villi', { specimenType: 'Endometrial curettings', phase: GESTATIONAL, poc: 'Chorionic villi present' }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'endometrial_biopsy', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
