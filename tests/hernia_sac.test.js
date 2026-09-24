// Hernia sac (benign batch 3). Card: docs/roadmap.md "Haemorrhoid, cholesteatoma and hernia sac";
// house sentences from the 2021-2026 benign-resection profile. Wording is deliberate; update the strings only on purpose.
// Fixtures: tests/fixtures/hernia_sac/*.json (golden; --update only after a deliberate change).
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
import { MET, VAS, EPIDIDYMIS } from '../generators/hernia_sac.js';
import { ihcPanel } from '../generators/softtissue.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.hernia_sac;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'hernia_sac');
const UPDATE = process.argv.includes('--update');
const EXAMPLE = schema.example.parts[0].values;
const CLOSING = 'There is no evidence of granulomatous inflammation or malignancy.';
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
  assert.ok(t, 'registry has hernia_sac');
  assert.equal(schema.system, 'Soft tissue');
  assert.equal(schema.kind, 'benign resection');
  assert.ok(schema.label && !/^(biopsy|polyp|specimen)$/i.test(schema.label), 'label is an organ word');
  assert.ok(schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
  assert.equal(schema.style.british, true);
});

test('it sits in the Resections row under Skin / soft tissue and is no longer a pending placeholder', () => {
  const planned = JSON.parse(fs.readFileSync(path.join(here, '..', 'templates', 'planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((p) => p.id === 'hernia_sac'), 'not in planned.json');
  const group = rowGroups(manifest, planned, 'bottom').find((g) => g.items.some((i) => i.id === 'hernia_sac'));
  assert.ok(group, 'in the Resections & frozen row');
  assert.deepEqual([group.system, group.label], ['Skin', 'Skin / soft tissue'], 'the bottom row folds Soft tissue into Skin');
  assert.ok(!group.items.find((i) => i.id === 'hernia_sac').planned, 'a built template, not a pending one');
});

test('the example case renders every expected block', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, t.generator, c);
  for (const heading of [/SPECIMENS?:/, /MACROSCOPIC DESCRIPTION:/, /BLOCK KEY:/, /MICROSCOPIC EXAMINATION:/, /DIAGNOSIS:/]) assert.match(r.report, heading);
});

test('the example: a right inguinal hernia sac under the SOFT TISSUE head', () => {
  const r = run(EXAMPLE);
  assert.equal(r.specimens, 'Soft tissue, right inguinal hernia sac, excision');
  assert.equal(r.macro, 'Received in formalin is a membranous sac labelled right inguinal hernia sac, measuring 4 x 3 x 0.5 cm. Representative sections in 1 block.');
  assert.equal(r.blockKey, '(1) Hernia sac, representative sections.');
  assert.equal(r.microscopy, `Sections show peritoneal fibroadipose tissue lined by benign mesothelium. No vas deferens or epididymal tissue is identified. Features are in keeping with a hernia sac. ${CLOSING}`);
  assert.equal(r.diagnosis, 'SOFT TISSUE, right inguinal hernia sac, excision - In keeping with HERNIA SAC');
  assert.equal(r.comment, '');
  assert.deepEqual(r.issues, []);
});

test('bilateral sacs in one part print in the plural', () => {
  const r = run({ ...EXAMPLE, side: 'Bilateral' });
  assert.equal(r.specimens, 'Soft tissue, bilateral inguinal hernia sacs, excision');
  assert.equal(r.macro, 'Received in formalin are two membranous sacs labelled bilateral inguinal hernia sacs, measuring 4 x 3 x 0.5 cm in aggregate. Representative sections in 1 block.');
  assert.equal(r.blockKey, '(1) Hernia sacs, representative sections.');
  assert.match(r.microscopy, / Features are in keeping with hernia sacs\. /);
  assert.equal(r.diagnosis, 'SOFT TISSUE, bilateral inguinal hernia sacs, excision - In keeping with HERNIA SACS');
  assert.deepEqual(r.issues, []);
});

test('sac contents, endometriosis and cord structures print a sentence each and a diagnosis clause', () => {
  const r = run({ ...EXAMPLE, cordStructures: EPIDIDYMIS, contents: 'Infarcted omentum', endometriosis: 'Present' });
  assert.equal(r.microscopy, `Sections show peritoneal fibroadipose tissue lined by benign mesothelium. Adherent omental fat shows haemorrhagic infarction. Foci of endometriosis, composed of endometrial-type glands and stroma, are present in the wall of the sac. Epididymal tissue is present in the wall of the sac. Features are in keeping with a hernia sac. ${CLOSING}`);
  assert.equal(r.diagnosis, 'SOFT TISSUE, right inguinal hernia sac, excision - In keeping with HERNIA SAC with INFARCTED OMENTUM AND ENDOMETRIOSIS; EPIDIDYMAL TISSUE IDENTIFIED; see comment');
  const vas = run({ ...EXAMPLE, cordStructures: VAS });
  assert.match(vas.microscopy, /mesothelium\. A segment of vas deferens is present in the wall of the sac\. Features/);
  assert.equal(vas.diagnosis, 'SOFT TISSUE, right inguinal hernia sac, excision - In keeping with HERNIA SAC; VAS DEFERENS IDENTIFIED; see comment');
  const omentum = run({ ...EXAMPLE, contents: 'Viable omentum' });
  assert.match(omentum.microscopy, /mesothelium\. Adherent omental fat is also present, with no infarction\. No vas deferens/);
  assert.equal(omentum.diagnosis, 'SOFT TISSUE, right inguinal hernia sac, excision - In keeping with HERNIA SAC', 'viable omentum stays out of the diagnosis line');
  assert.ok(!run({ ...EXAMPLE, cordStructures: 'Not stated' }).microscopy.includes('vas deferens'), 'nothing printed when the cord structures are not stated');
});

test('metastatic carcinoma uses the shared soft tissue immunohistochemistry sentences', () => {
  const values = { ...EXAMPLE, malignancy: MET, ihcPositive: 'CK7, PAX8', ihcNegative: 'CK20, CDX2', favouredPrimary: 'ovarian' };
  const r = run(values);
  assert.ok(r.microscopy.includes(ihcPanel(values, 'tumour cells').join(' ')), 'same panel wording as the soft tissue form');
  assert.equal(r.microscopy, 'Sections show peritoneal fibroadipose tissue lined by benign mesothelium. No vas deferens or epididymal tissue is identified. Features are in keeping with a hernia sac. The wall of the sac is infiltrated by adenocarcinoma composed of irregular glands lined by cells with enlarged, pleomorphic, hyperchromatic nuclei. On immunohistochemistry, the tumour cells are positive for CK7 and PAX8. They are negative for CK20 and CDX2. The findings are consistent with metastatic adenocarcinoma of ovarian primary.');
  assert.equal(r.diagnosis, 'SOFT TISSUE, right inguinal hernia sac, excision - HERNIA SAC involved by METASTATIC ADENOCARCINOMA, consistent with OVARIAN PRIMARY; see comment');
  assert.ok(!r.microscopy.includes(CLOSING));
  const bare = run({ ...EXAMPLE, malignancy: MET });
  assert.ok(bare.microscopy.endsWith('The findings are in keeping with metastatic adenocarcinoma.'));
  assert.equal(bare.diagnosis, 'SOFT TISSUE, right inguinal hernia sac, excision - HERNIA SAC involved by METASTATIC ADENOCARCINOMA; see comment');
  assert.deepEqual(checksOf(bare), [['warn', 'malignancy']]);
  for (const id of ['metType', 'ihcPositive', 'ihcNegative', 'favouredPrimary']) {
    assert.ok(!visible({}).includes(id), `${id} hidden without malignancy`);
    assert.ok(visible({ malignancy: MET }).includes(id), `${id} shown with metastatic carcinoma`);
  }
});

test('a HERNIA SAC head drops the sac words; pieces and all-embedded blocks', () => {
  const r = run({ ...EXAMPLE, organ: 'HERNIA SAC', herniaType: 'Umbilical', side: 'Not stated', procedure: 'Herniorrhaphy', description: 'Pieces of fibrofatty tissue', blocks: '2', blockScheme: 'All embedded' });
  assert.equal(r.specimens, 'Hernia sac, umbilical, herniorrhaphy');
  assert.equal(r.macro, 'Received in formalin are pieces of fibrofatty tissue labelled umbilical hernia sac, measuring 4 x 3 x 0.5 cm in aggregate. All embedded in 2 blocks.');
  assert.equal(r.blockKey, '(1-2) Hernia sac, all embedded.');
  assert.equal(r.diagnosis, 'HERNIA SAC, umbilical, herniorrhaphy - In keeping with HERNIA SAC');
  assert.deepEqual(r.issues, [], 'an umbilical hernia has no side');
});

test('the Checks panel: a sided hernia with no side, and a finding in a bilateral part', () => {
  assert.deepEqual(checksOf(run({ ...EXAMPLE, side: 'Not stated' })), [['warn', 'side']]);
  assert.deepEqual(checksOf(run({ ...EXAMPLE, side: 'Not stated', herniaType: 'Incisional' })), []);
  const both = run({ ...EXAMPLE, side: 'Bilateral', cordStructures: VAS });
  assert.equal(both.diagnosis, 'SOFT TISSUE, bilateral inguinal hernia sacs, excision - In keeping with HERNIA SACS; VAS DEFERENS IDENTIFIED; see comment');
  assert.deepEqual(checksOf(both), [['warn', 'side']]);
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

test('intake: a hernia line lands on this form, confidently, with its side, type and procedure', () => {
  for (const line of ['Right inguinal hernia sac', 'Umbilical hernia sac', 'Hernia sac', 'Bilateral inguinal hernia sacs', 'Incisional hernia sac, excision', 'Right femoral hernia, herniorrhaphy', 'Paraumbilical hernia sac', 'SOFT TISSUE, right inguinal hernia sac, excision']) {
    const m = route(line);
    assert.deepEqual([m.templateId, m.tier], ['hernia_sac', 'confident'], line);
  }
  assert.deepEqual(preset('Right inguinal hernia sac'), { side: 'Right', herniaType: 'Inguinal' });
  assert.deepEqual(preset('Umbilical hernia sac'), { side: 'Not stated', herniaType: 'Umbilical' });
  assert.deepEqual(preset('Bilateral inguinal hernia sacs'), { side: 'Bilateral', herniaType: 'Inguinal' });
  assert.deepEqual(preset('Right femoral hernia, herniorrhaphy'), { side: 'Right', herniaType: 'Femoral', procedure: 'Herniorrhaphy' });
  assert.deepEqual(preset('Left inguinal hernia sac, herniotomy'), { side: 'Left', herniaType: 'Inguinal', procedure: 'Herniotomy' });
});

test('intake: other groin and abdominal lines keep their routes; the bone form no longer claims a femoral hernia', () => {
  assert.equal(route('Right inguinal lymph node').templateId, 'lymph_node');
  assert.equal(route('Right femoral head').templateId, 'bone_joint');
  for (const line of ['Umbilical granuloma', 'Omentum']) assert.notEqual(route(line).templateId, 'hernia_sac', line);
  assert.notEqual(route('Right femoral hernia sac').templateId, 'bone_joint');
});

test('pasted gross text fills the description, the measurements and the blocks', () => {
  assert.deepEqual(extractMacro(schema, 'Received in formalin is a membranous sac measuring 4 x 3 x 0.5 cm. Representative sections in 1 block.'),
    { dimensions: '4 x 3 x 0.5', blocks: '1', blockScheme: 'Representative sections', description: 'A membranous sac' });
  assert.deepEqual(extractMacro(schema, 'Received in formalin are pieces of fibrofatty tissue measuring 3 x 2 x 1 cm in aggregate. All embedded in 2 blocks.'),
    { dimensions: '3 x 2 x 1', blocks: '2', blockScheme: 'All embedded', description: 'Pieces of fibrofatty tissue' });
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-right-inguinal-hernia-sac-example', EXAMPLE],
  ['02-bilateral-inguinal-hernia-sacs', { ...EXAMPLE, side: 'Bilateral' }],
  ['03-umbilical-hernia-sac-with-viable-omentum', { ...EXAMPLE, side: 'Not stated', herniaType: 'Umbilical', contents: 'Viable omentum', cordStructures: 'Not stated' }],
  ['04-inguinal-hernia-sac-vas-deferens', { ...EXAMPLE, side: 'Left', cordStructures: VAS }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'hernia_sac', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
