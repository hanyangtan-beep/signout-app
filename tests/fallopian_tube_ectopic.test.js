// Fallopian tube — ectopic pregnancy (benign batch 2). Card: docs/roadmap.md, pulled into Now 2026-09-24;
// spec docs/specs/fallopian-tube-ectopic.md. Wording is deliberate; update the strings only on purpose.
// Fixtures: tests/fixtures/fallopian_tube_ectopic/*.json (golden; --update only after a deliberate change).
// Fixture 01 is the contributed model report; the routing lines below are house-style lines, not case text.
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
import { MOLE } from '../generators/fallopian_tube_ectopic.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.fallopian_tube_ectopic;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'fallopian_tube_ectopic');
const UPDATE = process.argv.includes('--update');
const EXAMPLE = schema.example.parts[0].values;
const CLOSING = 'There is no evidence of gestational trophoblastic neoplasia or other malignancies.';
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
  assert.ok(t, 'registry has fallopian_tube_ectopic');
  assert.equal(schema.system, 'Gynae');
  assert.equal(schema.kind, 'benign resection');
  assert.ok(schema.label && !/^(biopsy|polyp|specimen)$/i.test(schema.label), 'label is an organ word');
  assert.ok(schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
  assert.equal(schema.style.british, true);
});

test('it sits in the Resections row under Gynae and is no longer a pending placeholder', () => {
  const planned = JSON.parse(fs.readFileSync(path.join(here, '..', 'templates', 'planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((p) => p.id === 'fallopian_tube_ectopic'), 'removed from planned.json');
  const group = rowGroups(manifest, planned, 'bottom').find((g) => g.items.some((i) => i.id === 'fallopian_tube_ectopic'));
  assert.ok(group, 'in the Resections & frozen row');
  assert.equal(group.system, 'Gynae');
  assert.ok(!group.items.find((i) => i.id === 'fallopian_tube_ectopic').planned, 'a built template, not a pending one');
});

test('the example case renders every expected block', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, t.generator, c);
  for (const heading of [/SPECIMENS?:/, /MACROSCOPIC DESCRIPTION:/, /BLOCK KEY:/, /MICROSCOPIC EXAMINATION:/, /DIAGNOSIS:/]) assert.match(r.report, heading);
});

test('the contributed model report is reproduced: macroscopy, block key, microscopy and diagnosis', () => {
  const r = run(EXAMPLE);
  assert.equal(r.specimens, 'Left fallopian tube, salpingectomy');
  assert.equal(r.macro, 'Received in formalin is a distended segment of tubal tissue measuring 4 x 2 x 2 cm. A segment of left fallopian tube is identified measuring 5 cm long, and its lumen is distended, up to 2 cm across. The cut surface of the fallopian tube tissue shows extensive blood clot within the tubal lumen, as well as spongy material. The area of haemorrhage extends to the serosal surface. No foetal parts are grossly identified. 3 representative blocks.');
  assert.equal(r.blockKey, '(1) Uninvolved fallopian tube.\n(2)&(3) Haemorrhagic tubal tissue with distension.');
  assert.equal(r.microscopy, `The sections show degenerate chorionic villi and haemorrhage within the lumen of the fallopian tube. The tubal epithelium is unremarkable. ${CLOSING}`);
  assert.equal(r.diagnosis, 'Left FALLOPIAN TUBE, salpingectomy - ECTOPIC TUBAL PREGNANCY');
  assert.equal(r.comment, '');
  assert.deepEqual(r.issues, []);
});

test('a salpingectomy shows the tube fields; a salpingotomy or tubal contents shows the fragments instead', () => {
  const tube = visible({ procedure: 'Salpingectomy' });
  for (const id of ['overallSize', 'tubeLength', 'lumenDiameter', 'distensionSite', 'serosa', 'fimbria', 'clotSize', 'wallRupture', 'epithelium', 'dxEntity']) assert.ok(tube.includes(id), id);
  assert.ok(!tube.includes('fragmentSize') && !tube.includes('ruptureSize'));
  assert.ok(visible({ serosa: 'Rupture site' }).includes('ruptureSize'));
  assert.deepEqual(visible({ procedure: 'Partial salpingectomy' }), tube);
  for (const procedure of ['Salpingotomy', 'Tubal contents']) {
    const f = visible({ procedure, serosa: 'Rupture site' });
    assert.ok(f.includes('fragmentSize'), procedure);
    for (const id of ['overallSize', 'tubeLength', 'serosa', 'ruptureSize', 'wallRupture', 'epithelium', 'dxEntity']) assert.ok(!f.includes(id), `${procedure}: ${id}`);
  }
  const noVilli = visible({ villi: 'Not identified' });
  assert.ok(!noVilli.includes('villousChange') && !noVilli.includes('dxEntity'));
  assert.deepEqual(schema.layout.macroFields, ['side', 'procedure'], 'side and procedure sit in the case column');
});

test('no villi: the microscopy says so, the diagnosis points to the comment and the hCG comment prints', () => {
  const r = run({ ...EXAMPLE, villi: 'Not identified' });
  assert.equal(r.microscopy, `The sections show haemorrhage within the lumen of the fallopian tube. No chorionic villi or trophoblast are identified. The tubal epithelium is unremarkable. ${CLOSING}`);
  assert.equal(r.diagnosis, 'Left FALLOPIAN TUBE, salpingectomy - NO CHORIONIC VILLI OR TROPHOBLAST IDENTIFIED; see comment');
  assert.equal(r.comment, 'No chorionic villi or implantation-site trophoblast are identified. Correlation with the operative findings and serial serum hCG levels is suggested.');
  assert.deepEqual(checksOf(r), [['warn', 'villi']]);
});

test('an implantation site or foetal parts confirm the gestation without villi: no hCG comment, no warning', () => {
  const r = run({ ...EXAMPLE, villi: 'Not identified', implantation: 'Present' });
  assert.equal(r.microscopy, `The sections show haemorrhage within the lumen of the fallopian tube. Implantation-site intermediate trophoblast is present in the tubal wall. No chorionic villi are identified. The tubal epithelium is unremarkable. ${CLOSING}`);
  assert.equal(r.diagnosis, 'Left FALLOPIAN TUBE, salpingectomy - HAEMORRHAGE AND IMPLANTATION-SITE TROPHOBLAST, consistent with ECTOPIC TUBAL PREGNANCY');
  assert.equal(r.comment, '');
  assert.deepEqual(r.issues, []);
  assert.equal(run({ ...EXAMPLE, villi: 'Not identified', implantation: 'Present', haemorrhage: 'Absent' }).diagnosis, 'Left FALLOPIAN TUBE, salpingectomy - IMPLANTATION-SITE TROPHOBLAST, consistent with ECTOPIC TUBAL PREGNANCY');
  const parts = run({ ...EXAMPLE, villi: 'Not identified', foetalParts: 'Identified' });
  assert.match(parts.macro, / Foetal parts are identified\. 3 representative blocks\.$/);
  assert.equal(parts.diagnosis, 'Left FALLOPIAN TUBE, salpingectomy - ECTOPIC TUBAL PREGNANCY');
  assert.equal(parts.comment, '');
});

test('a rupture qualifies the diagnosis, from the serosal rupture site or the wall disruption', () => {
  const r = run({ ...EXAMPLE, serosa: 'Rupture site', ruptureSize: '1.5' });
  assert.match(r.macro, /spongy material\. There is a rupture site measuring 1\.5 cm on the serosal surface\. No foetal parts/);
  assert.equal(r.diagnosis, 'Left FALLOPIAN TUBE, salpingectomy - ECTOPIC TUBAL PREGNANCY with RUPTURE');
  assert.match(run({ ...EXAMPLE, serosa: 'Rupture site' }).macro, /\. There is a rupture site on the serosal surface\. /);
  const wall = run({ ...EXAMPLE, serosa: 'Intact', wallRupture: 'Present' });
  assert.match(wall.macro, /\. The serosal surface is intact\. /);
  assert.match(wall.microscopy, /the fallopian tube\. There is disruption of the tubal wall, in keeping with rupture\. The tubal epithelium/);
  assert.equal(wall.diagnosis, 'Left FALLOPIAN TUBE, salpingectomy - ECTOPIC TUBAL PREGNANCY with RUPTURE');
  const lumen = run({ ...EXAMPLE, dxEntity: 'Products of gestation within the tubal lumen', serosa: 'Rupture site' });
  assert.equal(lumen.diagnosis, 'Left FALLOPIAN TUBE, salpingectomy - PRODUCTS OF GESTATION WITHIN THE TUBAL LUMEN; tubal rupture');
});

test('each macroscopy option adds its sentence; a blank side and blank measurements are left out', () => {
  const r = run({ ...EXAMPLE, distensionSite: 'Ampulla', fimbria: 'Identified', clotSize: '3x2x1', cutSurface: ['Gestational sac', 'Spongy material', 'Blood clot'] });
  assert.match(r.macro, /up to 2 cm across\. The distension is in the ampullary portion of the tube\. The cut surface of the fallopian tube tissue shows blood clot within the tubal lumen, as well as spongy material and a gestational sac\. /);
  assert.match(r.macro, /\. The fimbrial end is identified\. A separate blood clot measuring 3 x 2 x 1 cm is also received\. No foetal parts are grossly identified\. /);
  assert.match(run({ ...EXAMPLE, fimbria: 'Not identified' }).macro, /\. The fimbrial end is not identified\. /);
  const bare = run({ side: 'Not stated', tubeLength: '6' });
  assert.equal(bare.specimens, 'Fallopian tube, salpingectomy');
  assert.equal(bare.macro, 'Received in formalin is a segment of tubal tissue. A segment of fallopian tube is identified measuring 6 cm long. The cut surface of the fallopian tube tissue shows blood clot within the tubal lumen, as well as spongy material. No foetal parts are grossly identified. 3 representative blocks.');
  assert.equal(bare.diagnosis, 'FALLOPIAN TUBE, salpingectomy - ECTOPIC TUBAL PREGNANCY');
  assert.match(run({ ...EXAMPLE, blocks: '1' }).macro, / 1 representative block\.$/);
  assert.match(run({ ...EXAMPLE, blocks: '1', sampling: 'All embedded' }).macro, / All embedded in 1 block\.$/);
  const noMacro = one(EXAMPLE);
  noMacro.options = { ...noMacro.options, macro: false };
  const off = generate(schema, t.generator, noMacro);
  assert.deepEqual([off.macro, off.blockKey], ['', '']);
});

test('the block key follows the block count, keeps a separate clot last and letters each entry in a multi-letter case', () => {
  const key = (values) => run({ ...EXAMPLE, ...values }).blockKey;
  assert.equal(key({ blocks: '1' }), '(1) Fallopian tube with haemorrhagic distension.');
  assert.equal(key({ blocks: '2' }), '(1) Uninvolved fallopian tube.\n(2) Haemorrhagic tubal tissue with distension.');
  assert.equal(key({ blocks: '5' }), '(1) Uninvolved fallopian tube.\n(2)-(5) Haemorrhagic tubal tissue with distension.');
  assert.equal(key({ blocks: '4', clotSize: '3' }), '(1) Uninvolved fallopian tube.\n(2)&(3) Haemorrhagic tubal tissue with distension.\n(4) Separate blood clot.');
  assert.equal(key({ blocks: '2', clotSize: '3' }), '(1) Haemorrhagic tubal tissue with distension.\n(2) Separate blood clot.');
  assert.equal(key({ procedure: 'Tubal contents', blocks: '1' }), '(1) Haemorrhagic tissue.');
  assert.equal(key({ procedure: 'Tubal contents', blocks: '4' }), '(1)-(4) Haemorrhagic tissue.');
  assert.equal(key({ blockKeyText: '1. Isthmus\n2&3 haemorrhagic tube;\nA4 - clot' }), '(1) Isthmus.\n(2)&(3) haemorrhagic tube.\n(4) clot.');
  const two = createCase(schema, 2);
  two.parts.forEach((p) => { p.values = { ...p.values, ...EXAMPLE }; });
  two.parts[1].values.side = 'Right';
  const r = generate(schema, t.generator, two);
  assert.equal(r.blockKey, '(A1) Uninvolved fallopian tube.\n(A2)&(A3) Haemorrhagic tubal tissue with distension.\n(B1) Uninvolved fallopian tube.\n(B2)&(B3) Haemorrhagic tubal tissue with distension.');
  assert.equal(r.diagnosis, '(A) Left FALLOPIAN TUBE, salpingectomy - ECTOPIC TUBAL PREGNANCY\n(B) Right FALLOPIAN TUBE, salpingectomy - ECTOPIC TUBAL PREGNANCY');
});

test('a salpingotomy is described as fragments, keeps to what the sections show and prints the persistent-trophoblast comment', () => {
  const r = run({ side: 'Right', procedure: 'Salpingotomy', fragmentSize: '3x2x1', cutSurface: ['Blood clot', 'Villous material'], blocks: '2', sampling: 'All embedded' });
  assert.equal(r.specimens, 'Right fallopian tube, salpingotomy');
  assert.equal(r.macro, 'Received in formalin are fragments of haemorrhagic tissue measuring 3 x 2 x 1 cm in aggregate. The fragments comprise blood clot and villous material. No foetal parts are grossly identified. All embedded in 2 blocks.');
  assert.equal(r.blockKey, '(1)&(2) Haemorrhagic tissue.');
  assert.equal(r.microscopy, `The sections show chorionic villi and blood clot. ${CLOSING}`);
  assert.equal(r.diagnosis, 'Right FALLOPIAN TUBE, salpingotomy - PRODUCTS OF GESTATION, consistent with ECTOPIC TUBAL PREGNANCY');
  assert.equal(r.comment, 'Following salpingotomy, trophoblast may persist in the tube; serial serum hCG measurement until a negative result is obtained is recommended.');
  const contents = run({ procedure: 'Tubal contents' });
  assert.equal(contents.specimens, 'Left fallopian tube, tubal contents');
  assert.equal(contents.comment, '', 'the persistent-trophoblast comment is for a salpingotomy only');
});

test('suspected molar change points to the p57 comment and raises a check', () => {
  const r = run({ ...EXAMPLE, villi: 'Present', villousChange: MOLE });
  assert.match(r.microscopy, /within the lumen of the fallopian tube\. Some villi are enlarged and hydropic, with trophoblastic hyperplasia; see comment\. The tubal epithelium/);
  assert.equal(r.diagnosis, 'Left FALLOPIAN TUBE, salpingectomy - ECTOPIC TUBAL PREGNANCY; see comment');
  assert.match(r.comment, /^The villous features raise the possibility of a hydatidiform mole\. p57KIP2 immunohistochemistry and ploidy analysis or molecular genotyping/);
  assert.deepEqual(checksOf(r), [['warn', 'villousChange']]);
  const hydropic = run({ ...EXAMPLE, villousChange: 'Hydropic change' });
  assert.match(hydropic.microscopy, /the fallopian tube\. Some villi show hydropic change\. The tubal/);
  assert.equal(hydropic.comment, '');
});

test('pre-existing tubal disease prints a sentence each and a lower-case clause in the diagnosis', () => {
  const r = run({ ...EXAMPLE, epithelium: ['Endometriosis', 'Chronic salpingitis', 'Salpingitis isthmica nodosa'] });
  assert.match(r.microscopy, /the fallopian tube\. The plicae contain a chronic inflammatory infiltrate with plasma cells, in keeping with chronic salpingitis\. The tubal wall contains diverticula of tubal epithelium within hypertrophic smooth muscle, in keeping with salpingitis isthmica nodosa\. Foci of endometrial glands and stroma with haemosiderin-laden macrophages are present, in keeping with endometriosis\. There is no evidence/);
  assert.ok(!r.microscopy.includes('epithelium is unremarkable'));
  assert.equal(r.diagnosis, 'Left FALLOPIAN TUBE, salpingectomy - ECTOPIC TUBAL PREGNANCY; chronic salpingitis; salpingitis isthmica nodosa; endometriosis');
});

test('the Checks panel flags both clot options ticked together', () => {
  assert.deepEqual(checksOf(run({ ...EXAMPLE, cutSurface: ['Extensive blood clot', 'Blood clot'] })), [['warn', 'cutSurface']]);
});

test('every branch prints the house "foetal" and never "fetal"', () => {
  const variants = [];
  for (const procedure of schema.fields.find((f) => f.id === 'procedure').options) {
    for (const villi of ['Present', 'Present, degenerate', 'Not identified']) {
      for (const foetalParts of ['Not identified', 'Identified']) {
        for (const implantation of ['Not identified', 'Present']) variants.push({ ...EXAMPLE, procedure, villi, foetalParts, implantation, villousChange: MOLE, wallRupture: 'Present' });
      }
    }
  }
  for (const v of variants) {
    const c = one(v);
    c.options = { ...c.options, includeHeader: true };
    const r = generate(schema, t.generator, c);
    assert.ok(!/fetal/i.test(r.report), `${v.procedure} / ${v.villi}: "fetal" printed`);
    assert.match(r.macro, /\b[Ff]oetal parts are\b/, `${v.procedure} / ${v.villi}: the foetal parts are recorded`);
  }
  assert.ok(!/fetal/i.test(JSON.stringify(schema.fields)), 'field labels and options');
  assert.ok(!/fetal/i.test(JSON.stringify(schema.snippets)), 'comment snippets');
});

// ---------- intake ----------

const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line) => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, '', manifest)[0]);
};

test('intake: an ectopic line lands on this form, confidently, with its side and procedure', () => {
  for (const line of ['Left fallopian tube, ectopic pregnancy, salpingectomy', 'Right tubal pregnancy, salpingotomy', 'Ectopic pregnancy, left fallopian tube', 'Left tubal ectopic, laparoscopic salpingectomy', 'Ectopic pregnancy']) {
    const m = route(line);
    assert.deepEqual([m.templateId, m.tier], ['fallopian_tube_ectopic', 'confident'], line);
  }
  assert.deepEqual(preset('Left fallopian tube, ectopic pregnancy, salpingectomy'), { side: 'Left', procedure: 'Salpingectomy' });
  assert.deepEqual(preset('Right tubal pregnancy, salpingotomy'), { side: 'Right', procedure: 'Salpingotomy' });
  assert.deepEqual(preset('Left fallopian tube, partial salpingectomy, ectopic'), { side: 'Left', procedure: 'Partial salpingectomy' });
  assert.deepEqual(preset('Ectopic pregnancy, tubal contents'), { side: 'Not stated', procedure: 'Tubal contents' });
});

test('intake: other lines keep their routes', () => {
  assert.equal(route('Left fallopian tube, salpingectomy').templateId, 'uterus_benign', 'a tube-only line stays on the tube form');
  assert.equal(route('Products of gestation').templateId, 'endometrial_biopsy');
  assert.equal(route('Endometrial curettings, ?ectopic pregnancy').templateId, 'endometrial_biopsy');
  for (const line of ['Ectopic thyroid tissue', 'Ectopic pancreas', 'Uterine contents, ?ectopic', 'Left ovary, ectopic pregnancy']) assert.notEqual(route(line).templateId, 'fallopian_tube_ectopic', line);
});

test('pasted gross text fills the measurements, the block count and the sampling', () => {
  const gross = 'Consists of a distended segment of tubal tissue measuring approximately 4 x 2 x 2 cm. A segment of fallopian tube is identified measuring approximately 5 cm long, and its lumen is distended, up to 2 cm across. No foetal parts are grossly identified. 3 representative blocks.';
  assert.deepEqual(extractMacro(schema, gross), { overallSize: '4 x 2 x 2', tubeLength: '5', lumenDiameter: '2', blocks: '3', sampling: 'Representative blocks' });
  assert.equal(extractMacro(schema, 'Received in formalin is a segment of tubal tissue. All embedded in 4 blocks.').sampling, 'All embedded');
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-left-salpingectomy-contributed-example', EXAMPLE],
  ['02-left-salpingectomy-no-villi', { ...EXAMPLE, villi: 'Not identified' }],
  ['03-left-salpingectomy-ruptured', { ...EXAMPLE, villi: 'Present', serosa: 'Rupture site', ruptureSize: '1.5', wallRupture: 'Present', fimbria: 'Identified', blocks: '4', clotSize: '3 x 2 x 1' }],
  ['04-right-salpingotomy', { side: 'Right', procedure: 'Salpingotomy', fragmentSize: '3 x 2 x 1', cutSurface: ['Blood clot', 'Villous material'], blocks: '2', sampling: 'All embedded' }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'fallopian_tube_ectopic', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
