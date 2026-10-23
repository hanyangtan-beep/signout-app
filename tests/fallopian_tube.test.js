// Standalone fallopian tube on the benign uterus form (benign batch 2). Card: docs/roadmap.md, pulled into Now
// 2026-09-24; spec docs/specs/fallopian-tube.md. Wording is deliberate; update the strings only on purpose.
// Fixtures: tests/fixtures/fallopian_tube/*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { LEFT_TUBE, RIGHT_TUBE, PARATUBAL, TUBES, kindOf, tubeMeasure } from '../generators/uterus.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.uterus_benign;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'fallopian_tube');
const UPDATE = process.argv.includes('--update');
const field = (id) => schema.fields.find((f) => f.id === id);
const one = (values) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};
const run = (values) => generate(schema, t.generator, one(values));
const visible = (values) => schema.fields.filter((f) => isVisible(f, { ...one({}).parts[0].values, ...values })).map((f) => f.id);

test('three tube-only specimens follow the existing ones, with a side and a findings field', () => {
  assert.deepEqual(field('specimenName').options.slice(-4), [TUBES, LEFT_TUBE, RIGHT_TUBE, PARATUBAL]);
  assert.equal(field('specimenName').default, 'Uterus and cervix, total hysterectomy');
  assert.deepEqual([kindOf({ specimenName: LEFT_TUBE }), kindOf({ specimenName: RIGHT_TUBE }), kindOf({ specimenName: PARATUBAL })], ['tube', 'tube', 'paratubal']);
  assert.deepEqual(field('paratubalSide').options, ['Not stated', 'Left', 'Right']);
  assert.equal(field('paratubalSide').default, 'Not stated');
  // Phase 74 (23 October 2026), deliberate: the tube lesions (p53 signature, STIL, STIC) follow the benign findings.
  assert.deepEqual(field('tubeFindings').options, ['Unremarkable', 'Hydrosalpinx', 'Paratubal cyst', 'Chronic salpingitis', 'Endometriosis', 'p53 signature', 'STIL', 'STIC – see comment']);
  assert.deepEqual(field('tubeFindings').default, ['Unremarkable']);
  assert.deepEqual(field('tubeFindings').exclusive, ['Unremarkable']);
  // Phase 74 (23 October 2026), deliberate: the hysterectomy's attached tubes and ovaries sit under the specimen too.
  assert.deepEqual(schema.layout.macroFields, ['specimenName', 'attachedAdnexa', 'paratubalSide'], 'the side sits under the specimen in the case column');
});

test('a tube-only part shows the tube fields only', () => {
  const salp = ['specimenName', 'tubeSize', 'cystSize', 'blocks', 'blockKeyText', 'tubeFindings', 'additionalNotes'];
  assert.deepEqual(visible({ specimenName: LEFT_TUBE }), salp);
  assert.deepEqual(visible({ specimenName: RIGHT_TUBE, leiomyoma: 'Present' }), salp, 'a stale leiomyoma value does not bring its detail fields back');
  assert.deepEqual(visible({ specimenName: PARATUBAL }), ['specimenName', 'paratubalSide', 'cystSize', 'blocks', 'blockKeyText', 'additionalNotes']);
  const tah = visible({ specimenName: 'Uterus and cervix, total hysterectomy', leiomyoma: 'Present' });
  // Phase 74: `degeneration` became the leiomyoma type and changes fields.
  for (const id of ['leiomyomaCount', 'leiomyomaLocation', 'leiomyomaSize', 'cutSurface', 'leiomyomaType', 'changes']) assert.ok(tah.includes(id), `${id} still shows on a hysterectomy`);
  assert.ok(visible({ specimenName: 'Myomectomy', leiomyoma: 'Present' }).includes('leiomyomaSize'));
  assert.ok(!tah.includes('tubeFindings') && !tah.includes('paratubalSide'));
  assert.ok(!visible({ specimenName: TUBES }).includes('tubeFindings'), 'the sterilisation segments keep the adnexal findings list');
});

test('a left salpingectomy with a paratubal cyst reads as the house report', () => {
  const r = run({ specimenName: LEFT_TUBE, tubeSize: '5 x 0.6', cystSize: '2', tubeFindings: ['Paratubal cyst'] });
  assert.equal(r.specimens, 'Left fallopian tube, salpingectomy');
  assert.equal(r.macro, 'Received in formalin is a left fallopian tube measuring 5 cm in length and 0.6 cm in diameter. A thin-walled paratubal cyst measuring 2 cm is attached. All embedded in 3 blocks.');
  assert.equal(r.blockKey, '(1) Fimbria. (2) Cross sections of the fallopian tube. (3) Paratubal cyst.');
  assert.equal(r.microscopy, 'Sections show fimbrial tissue and cross sections of the left fallopian tube with unremarkable plicae. A paratubal cyst is seen, with a fibrous wall lined by ciliated tubal-type epithelium. There is no evidence of malignancy.');
  assert.equal(r.diagnosis, 'Left FALLOPIAN TUBE, salpingectomy - PARATUBAL CYST');
  assert.deepEqual(r.issues, []);
});

test('an unremarkable right salpingectomy', () => {
  const r = run({ specimenName: RIGHT_TUBE });
  assert.equal(r.macro, 'Received in formalin is a right fallopian tube. All embedded in 2 blocks.');
  assert.equal(r.blockKey, '(1) Fimbria. (2) Cross sections of the fallopian tube.');
  assert.equal(r.microscopy, 'Sections show fimbrial tissue and cross sections of the right fallopian tube with unremarkable plicae. There is no evidence of malignancy.');
  assert.equal(r.diagnosis, 'Right FALLOPIAN TUBE, salpingectomy - NO EVIDENCE OF MALIGNANCY');
});

test('each tube finding prints its own sentence and diagnosis line, with no closing clause', () => {
  const lines = [
    [['Hydrosalpinx'], 'Consistent with HYDROSALPINX'],
    [['Chronic salpingitis'], 'CHRONIC SALPINGITIS'],
    [['Endometriosis'], 'ENDOMETRIOSIS'],
    [['Hydrosalpinx', 'Chronic salpingitis'], 'Consistent with HYDROSALPINX; CHRONIC SALPINGITIS'],
    [['Endometriosis', 'Paratubal cyst'], 'PARATUBAL CYST; ENDOMETRIOSIS'],
    [['Unremarkable'], 'NO EVIDENCE OF MALIGNANCY']
  ];
  for (const [tubeFindings, want] of lines) assert.equal(run({ specimenName: LEFT_TUBE, tubeFindings }).diagnosis, `Left FALLOPIAN TUBE, salpingectomy - ${want}`, tubeFindings.join('+'));
  const hydro = run({ specimenName: LEFT_TUBE, cystSize: '3', tubeFindings: ['Hydrosalpinx', 'Chronic salpingitis'] });
  assert.equal(hydro.macro, 'Received in formalin is a left fallopian tube. The fallopian tube is cystically dilated to 3 cm. All embedded in 2 blocks.');
  assert.equal(hydro.microscopy, 'Sections of the left fallopian tube show a dilated lumen lined by benign tubal epithelium, consistent with hydrosalpinx. The plicae contain a chronic inflammatory infiltrate with plasma cells, in keeping with chronic salpingitis. There is no evidence of malignancy.');
  assert.match(run({ specimenName: RIGHT_TUBE, tubeFindings: ['Chronic salpingitis'] }).microscopy, /^Sections show fimbrial tissue and cross sections of the right fallopian tube\. The plicae contain/);
  assert.match(run({ specimenName: RIGHT_TUBE, tubeFindings: ['Endometriosis'] }).microscopy, /with unremarkable plicae\. Foci of endometrial glands and stroma with haemosiderin-laden macrophages are present, in keeping with endometriosis\./);
  assert.match(run({ specimenName: RIGHT_TUBE, cystSize: '1.5' }).macro, /A thin-walled cyst measuring 1\.5 cm is attached\./, 'a typed cyst size without a ticked finding is not called paratubal');
});

test('a paratubal cyst excision names its side when one is given', () => {
  const r = run({ specimenName: PARATUBAL, paratubalSide: 'Right', cystSize: '3' });
  assert.equal(r.specimens, 'Right paratubal cyst, excision');
  assert.equal(r.macro, 'Received in formalin is a thin-walled paratubal cyst measuring 3 cm. All embedded in 1 block.');
  assert.equal(r.blockKey, '(1) Cyst wall.');
  assert.equal(r.microscopy, 'Sections show a fibrous cyst wall lined by a single layer of ciliated tubal-type epithelium. The features are consistent with paratubal cyst. There is no evidence of malignancy.');
  assert.equal(r.diagnosis, 'FALLOPIAN TUBE, right paratubal cyst, excision - PARATUBAL CYST');
  const unsided = run({ specimenName: PARATUBAL });
  assert.equal(unsided.specimens, 'Paratubal cyst, excision');
  assert.equal(unsided.diagnosis, 'FALLOPIAN TUBE, paratubal cyst, excision - PARATUBAL CYST');
  assert.equal(unsided.macro, 'Received in formalin is a thin-walled paratubal cyst. All embedded in 1 block.');
});

test('stale uterus and adnexa values do not print on a tube-only part', () => {
  const stale = { leiomyoma: 'Present', adenomyosis: 'Present', endometrium: 'Endometrial polyp', polypSize: '1', weight: '120', adnexaFindings: ['Serous cystadenoma', 'Cystic follicle'], ovarySize: '3 x 2 x 1' };
  for (const specimenName of [LEFT_TUBE, PARATUBAL]) {
    const r = run({ specimenName, ...stale, tubeFindings: specimenName === PARATUBAL ? ['Hydrosalpinx'] : ['Unremarkable'] });
    assert.doesNotMatch(r.report, /leiomyoma|adenomyosis|polyp|endometri|serous|follicle|ovary|weighing/i, specimenName);
  }
  assert.equal(run({ specimenName: PARATUBAL, tubeFindings: ['Hydrosalpinx'] }).diagnosis, 'FALLOPIAN TUBE, paratubal cyst, excision - PARATUBAL CYST', 'tube findings belong to the salpingectomies');
});

test('two tube parts in one case keep their letters and blocks', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, specimenName: RIGHT_TUBE, tubeFindings: ['Hydrosalpinx'] };
  c.parts[1].values = { ...c.parts[1].values, specimenName: LEFT_TUBE };
  const r = generate(schema, t.generator, c);
  assert.equal(r.specimens, '(A) Right fallopian tube, salpingectomy\n(B) Left fallopian tube, salpingectomy');
  assert.equal(r.blockKey, '(A) (1) Fimbria. (2) Cross sections of the fallopian tube.\n(B) (1) Fimbria. (2) Cross sections of the fallopian tube.');
  assert.equal(r.diagnosis, '(A) Right FALLOPIAN TUBE, salpingectomy - Consistent with HYDROSALPINX\n(B) Left FALLOPIAN TUBE, salpingectomy - NO EVIDENCE OF MALIGNANCY');
});

test('helper: tube length and diameter', () => {
  assert.equal(tubeMeasure('5 x 0.6'), '5 cm in length and 0.6 cm in diameter');
  assert.equal(tubeMeasure('5x0.6 cm'), '5 cm in length and 0.6 cm in diameter');
  assert.equal(tubeMeasure('5'), '5 cm in length');
  assert.equal(tubeMeasure('5 cm'), '5 cm in length');
  assert.equal(tubeMeasure('50 x 6 mm'), '50 x 6 mm');
  assert.equal(tubeMeasure(''), '');
});

// ---------- intake ----------

const route = (line) => matchParts(parseIntake(line), '', manifest)[0];
const preset = (line) => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, '', manifest)[0]);
};

test('intake: a tube-only line lands on this form, confidently', () => {
  for (const line of ['Left fallopian tube, salpingectomy', 'RIGHT FALLOPIAN TUBE', 'FALLOPIAN TUBE, left paratubal cyst, excision', 'Right paratubal cyst, cystectomy', 'Left fimbrial cyst', 'Hydrosalpinx, left', 'Left salpingectomy', 'Bilateral tubal ligation']) {
    const m = route(line);
    assert.equal(m.templateId, 'uterus_benign', line);
    assert.equal(m.tier, 'confident', line);
  }
});

test('intake: the specimen and its side are read from the line; no side is guessed', () => {
  assert.equal(preset('Left fallopian tube, salpingectomy').specimenName, LEFT_TUBE);
  assert.equal(preset('RIGHT FALLOPIAN TUBE, lap salpingectomy').specimenName, RIGHT_TUBE);
  assert.equal(preset('Right fallopian tube').specimenName, RIGHT_TUBE);
  assert.deepEqual(preset('FALLOPIAN TUBE, left paratubal cyst, excision'), { specimenName: PARATUBAL, paratubalSide: 'Left' });
  assert.deepEqual(preset('Right fimbrial cyst'), { specimenName: PARATUBAL, paratubalSide: 'Right' });
  assert.deepEqual(preset('Paratubal cyst, excision'), { specimenName: PARATUBAL });
  assert.equal(preset('Fallopian tubes, sterilisation').specimenName, TUBES);
  assert.deepEqual(preset('Fallopian tube, salpingectomy'), {}, 'a line with no side pre-fills nothing rather than a guessed side');
});

test('intake: a line that also names the ovary, the uterus or a pregnancy keeps its route and pre-fill', () => {
  assert.notEqual(route('Left ovary and fallopian tube').templateId, 'uterus_benign');
  assert.notEqual(route('Left tube and ovary, cystectomy').templateId, 'uterus_benign');
  assert.notEqual(route('Right fallopian tube, ectopic pregnancy, salpingectomy').templateId, 'uterus_benign');
  assert.notEqual(route('Vas deferens, sterilisation').templateId, 'uterus_benign');
  const both = route('Uterus and bilateral fallopian tubes');
  assert.deepEqual([both.templateId, both.tier], ['generic', 'choose']);
  assert.equal(route('Uterus, cervix and bilateral adnexa, TAH BSO').templateId, 'uterus_benign');
  assert.deepEqual(preset('Uterus and cervix, total hysterectomy'), { specimenName: 'Uterus and cervix, total hysterectomy' });
  assert.equal(route('Right fallopian tube, biopsy').templateId, 'generic', 'a biopsy of the tube is not a resection form');
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-left-salpingectomy-paratubal-cyst', { specimenName: LEFT_TUBE, tubeSize: '5 x 0.6', cystSize: '2', tubeFindings: ['Paratubal cyst'] }],
  ['02-bilateral-sterilisation', { specimenName: TUBES, tubeSize: '2 and 2.5' }],
  ['03-right-paratubal-cyst-excision', { specimenName: PARATUBAL, paratubalSide: 'Right', cystSize: '3' }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'uterus_benign', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
