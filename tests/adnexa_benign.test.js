// Fallopian tube and ovary (benign) — Phase 74 (23 October 2026).
// A salpingo-oophorectomy or salpingectomy on its own, opportunistic or risk-reducing, with the tube
// lesions (p53 signature, STIL, STIC) shared with the uterus form's tube parts (generators/_tube.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTemplate, loadManifest } from '../src/registry.js';
import { createCase, defaultValues, generate, isVisible, applyLinkedDefaults } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import * as gen from '../generators/adnexa_benign.js';
import { P53_OPTIONS, KI67_OPTIONS, STIC_COMMENT } from '../generators/_tube.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'adnexa_benign');
const UPDATE = process.env.UPDATE_FIXTURES === '1';
const { schema } = await loadTemplate('adnexa_benign');
const manifest = await loadManifest();
const field = (id) => schema.fields.find((f) => f.id === id);
const STIC = 'STIC – see comment';
const part = (values = {}, label = 'A') => ({ label, values: { ...defaultValues(schema), ...values } });
const run = (values = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return generate(schema, gen, c);
};
const runParts = (list) => {
  const c = createCase(schema, list.length);
  list.forEach((v, i) => { c.parts[i].values = { ...c.parts[i].values, ...v }; });
  return generate(schema, gen, c);
};
const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line, history = '') => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
};
const micro = (values) => gen.microscopy(part(values)).replace(/^\(A\) /, '');
const dx = (values) => gen.diagnosis(part(values));
const dxText = (values) => dx(values).replace(/^\(A\) /, '');

test('metadata: a benign gynae resection after Ovarian cyst, packed, with complete defaults', () => {
  assert.equal(schema.id, 'adnexa_benign');
  assert.equal(schema.generator, 'adnexa_benign');
  assert.equal(schema.system, 'Gynae');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.label, 'Tube and ovary');
  assert.equal(schema.rank, 29);
  for (const a of ['RRSO', 'SEE-FIM', 'p53 signature', 'STIC']) assert.ok(schema.aliases.includes(a), a);
  assert.deepEqual(schema.layout, { pack: true, macroGroups: ['Macroscopy'], macroFields: ['side', 'procedure', 'indication'] });
  assert.deepEqual(schema.partDefaults, [{ side: 'Right' }, { side: 'Left' }]);
  const ids = schema.fields.map((f) => f.id);
  for (const p of schema.example.parts) for (const id of ids) assert.ok(id in p.values, `example part ${p.label} has ${id}`);
  assert.equal(manifest.find((t) => t.id === 'adnexa_benign')?.label, 'Tube and ovary');
});

test('options: tube and ovary findings, the three lesions last, and the shared stain lists', () => {
  assert.deepEqual(field('side').options, ['Right', 'Left', 'Bilateral']);
  assert.deepEqual(field('procedure').options, ['Salpingo-oophorectomy', 'Salpingectomy']);
  assert.deepEqual(field('indication').options, ['Not stated', 'Risk-reducing', 'Opportunistic']);
  assert.deepEqual(field('sampling').options, ['Representative', 'Fimbria entirely submitted', 'Entirely submitted (SEE-FIM)']);
  assert.deepEqual(field('tubeFindings').options, ['Unremarkable', 'Paratubal cyst', 'Hydrosalpinx', 'Chronic salpingitis', 'Salpingitis isthmica nodosa', 'Endometriosis', 'Walthard rests', 'p53 signature', 'STIL', STIC]);
  assert.deepEqual(field('ovaryFindings').options, ['Unremarkable', 'Cystic follicles', 'Corpus luteum', 'Corpora albicantia', 'Surface inclusion cysts', 'Stromal hyperplasia', 'Endometriosis']);
  assert.deepEqual(field('p53Pattern').options, P53_OPTIONS);
  assert.deepEqual(field('ki67').options, KI67_OPTIONS);
  assert.deepEqual(field('tubeFindings').default, ['Unremarkable']);
  assert.equal(field('sampling').default, 'Representative');
});

test('visibility: a salpingectomy hides the ovary; the stains show with a lesion, a risk-reducing indication or SEE-FIM', () => {
  const v = (values) => ({ ...defaultValues(schema), ...values });
  for (const id of ['ovarySize', 'ovaryCut', 'ovaryFindings']) {
    assert.equal(isVisible(field(id), v({})), true, id);
    assert.equal(isVisible(field(id), v({ procedure: 'Salpingectomy' })), false, id);
  }
  for (const id of ['p53Pattern', 'ki67']) {
    assert.equal(isVisible(field(id), v({})), false, id);
    assert.equal(isVisible(field(id), v({ tubeFindings: ['p53 signature'] })), true, id);
    assert.equal(isVisible(field(id), v({ tubeFindings: [STIC] })), true, id);
    assert.equal(isVisible(field(id), v({ indication: 'Risk-reducing' })), true, id);
    assert.equal(isVisible(field(id), v({ sampling: 'Entirely submitted (SEE-FIM)' })), true, id);
    assert.equal(isVisible(field(id), v({ tubeFindings: ['Paratubal cyst'] })), false, id);
  }
});

test('linked default: a risk-reducing indication submits the tube by SEE-FIM', () => {
  const v = part({ indication: 'Risk-reducing' });
  applyLinkedDefaults(schema, v, 'indication', 'Not stated');
  assert.equal(v.values.sampling, 'Entirely submitted (SEE-FIM)');
  const w = part({ indication: 'Opportunistic' });
  applyLinkedDefaults(schema, w, 'indication', 'Not stated');
  assert.equal(w.values.sampling, 'Representative');
  const typed = part({ indication: 'Risk-reducing', sampling: 'Fimbria entirely submitted' });
  applyLinkedDefaults(schema, typed, 'indication', 'Not stated');
  assert.equal(typed.values.sampling, 'Fimbria entirely submitted');
});

test('specimen and head: side, procedure and indication', () => {
  assert.equal(gen.specimenName(part()), 'Right fallopian tube and ovary, salpingo-oophorectomy');
  assert.equal(gen.specimenName(part({ side: 'Left', procedure: 'Salpingectomy', indication: 'Opportunistic' })), 'Left fallopian tube, opportunistic salpingectomy');
  assert.equal(gen.specimenName(part({ side: 'Bilateral', indication: 'Risk-reducing' })), 'Bilateral fallopian tubes and ovaries, risk-reducing bilateral salpingo-oophorectomy');
  assert.match(dx({}), /^\(A\) RIGHT FALLOPIAN TUBE AND OVARY, salpingo-oophorectomy - /);
  assert.match(dx({ side: 'Left', procedure: 'Salpingectomy' }), /^\(A\) LEFT FALLOPIAN TUBE, salpingectomy - /);
  assert.match(dx({ side: 'Bilateral', procedure: 'Salpingectomy' }), /^\(A\) BILATERAL FALLOPIAN TUBES, bilateral salpingectomy - /);
  // A line that names no side leaves the field blank: the report names none and the checks say so.
  assert.equal(gen.specimenName(part({ side: '' })), 'Fallopian tube and ovary, salpingo-oophorectomy');
  assert.equal(gen.macro(part({ side: '' })), '(A) Received in formalin is a salpingo-oophorectomy specimen. The ovary has an unremarkable cut surface. Representative sections in 3 blocks.');
  assert.match(micro({ side: '' }), /^Sections show fimbrial tissue and cross sections of the fallopian tube with unremarkable plicae\./);
  assert.match(dx({ side: '' }), /^\(A\) FALLOPIAN TUBE AND OVARY, salpingo-oophorectomy - /);
  assert.match(gen.validate(part({ side: '' })).map((m) => m.message).join(' '), /side is not recorded/);
});

test('macroscopy: the opening names the specimen; sizes, fimbria, ovary and a paratubal cyst read in turn', () => {
  assert.equal(gen.macro(part()), '(A) Received in formalin is a right salpingo-oophorectomy specimen. The ovary has an unremarkable cut surface. Representative sections in 3 blocks.');
  assert.equal(gen.macro(part({ side: 'Left', procedure: 'Salpingectomy', indication: 'Opportunistic' })), '(A) Received in formalin is an opportunistic left salpingectomy specimen. Representative sections in 1 block.');
  assert.equal(gen.macro(part({ tubeSize: '5.5 x 0.6', ovarySize: '3 x 2 x 1.2', ovaryCut: 'Corpus luteum', sampling: 'Fimbria entirely submitted' })),
    '(A) Received in formalin is a right salpingo-oophorectomy specimen. The fallopian tube measures 5.5 cm in length and 0.6 cm in diameter, with a fimbriated end. The ovary measures 3 x 2 x 1.2 cm, with a corpus luteum on the cut surface. The fimbriated end is entirely submitted, with representative sections of the remainder, in 4 blocks.');
  assert.equal(gen.macro(part({ side: 'Bilateral', indication: 'Risk-reducing', sampling: 'Entirely submitted (SEE-FIM)', tubeSize: 'right 5 x 0.6, left 4.5 x 0.5', ovarySize: 'right 2.5 x 1.5 x 1, left 2 x 1.5 x 1' })),
    '(A) Received in formalin is a risk-reducing bilateral salpingo-oophorectomy specimen. The right fallopian tube measures 5 x 0.6 cm and the left fallopian tube 4.5 x 0.5 cm, both with fimbriated ends. The right ovary measures 2.5 x 1.5 x 1 cm and the left ovary 2 x 1.5 x 1 cm, with unremarkable cut surfaces. The fimbriated ends are amputated and sectioned longitudinally, and the remaining tubes and the ovaries are sectioned serially (SEE-FIM protocol). All embedded in 10 blocks.');
  assert.match(gen.macro(part({ fimbria: 'Not identified' })), /The fimbriated end is not identified\./);
  assert.match(gen.macro(part({ tubeFindings: ['Paratubal cyst'], cystSize: '1.2' })), /A thin-walled paratubal cyst measuring 1\.2 cm is attached to the fallopian tube\./);
});

test('block key: representative, fimbria and SEE-FIM; bilateral reads left first; typed blocks and overrides', () => {
  const key = (values) => gen.blockKey(part(values)).replace(/^\(A\) /, '');
  assert.equal(key({}), '(1) Fallopian tube, fimbria and cross sections. (2-3) Ovary.');
  assert.equal(key({ sampling: 'Fimbria entirely submitted' }), '(1) Fimbria, entirely submitted. (2) Fallopian tube, cross sections. (3-4) Ovary.');
  assert.equal(key({ sampling: 'Entirely submitted (SEE-FIM)' }), '(1) Fimbria, longitudinal sections. (2-3) Fallopian tube, cross sections. (4-5) Ovary.');
  assert.equal(key({ side: 'Bilateral', sampling: 'Entirely submitted (SEE-FIM)' }),
    '(1) Left fimbria, longitudinal sections. (2-3) Left fallopian tube, cross sections. (4-5) Left ovary. (6) Right fimbria, longitudinal sections. (7-8) Right fallopian tube, cross sections. (9-10) Right ovary.');
  assert.equal(key({ procedure: 'Salpingectomy', tubeFindings: ['Paratubal cyst'] }), '(1) Fallopian tube, fimbria and cross sections. (2) Paratubal cyst.');
  assert.equal(key({ blocks: '5' }), '(1) Fallopian tube, fimbria and cross sections. (2-5) Ovary.');
  assert.match(gen.blockKey(part({ blockKeyText: '1. Tube. 2. Ovary.' })), /1\. Tube\. 2\. Ovary\.$/);
});

test('microscopy: unremarkable tube and ovary with the house negative', () => {
  assert.equal(micro({}), 'Sections show fimbrial tissue and cross sections of the right fallopian tube with unremarkable plicae. The ovary is unremarkable. There is no evidence of malignancy.');
  assert.equal(micro({ procedure: 'Salpingectomy', side: 'Left' }), 'Sections show fimbrial tissue and cross sections of the left fallopian tube with unremarkable plicae. There is no evidence of malignancy.');
  // A risk-reducing specimen names the STIC it was examined for.
  assert.match(micro({ indication: 'Risk-reducing' }), /There is no evidence of malignancy or serous tubal intraepithelial carcinoma \(STIC\)\.$/);
  assert.match(micro({ sampling: 'Entirely submitted (SEE-FIM)' }), /There is no evidence of malignancy or serous tubal intraepithelial carcinoma \(STIC\)\.$/);
  assert.match(micro({ fimbria: 'Not identified' }), /^Sections show cross sections of the right fallopian tube with unremarkable plicae\./);
});

test('microscopy: p53 signature, STIL and STIC with p53 and Ki-67 in the same paragraph', () => {
  const p53 = micro({ tubeFindings: ['p53 signature'], p53Pattern: 'Aberrant – overexpression', ki67: 'Low' });
  assert.match(p53, /Immunohistochemistry shows strong nuclear p53 expression in a short stretch of tubal epithelial cells\. Only scattered cells are positive for Ki-67\. The features are those of a p53 signature\./);
  assert.match(p53, /There is no evidence of STIC or invasive malignancy\.$/);
  const stil = micro({ tubeFindings: ['STIL'], p53Pattern: 'Aberrant – overexpression', ki67: 'Increased' });
  assert.match(stil, /There is no evidence of STIC or invasive malignancy\.$/);
  const stic = micro({ tubeFindings: [STIC], p53Pattern: 'Aberrant – null', ki67: 'Increased' });
  assert.match(stic, /serous tubal intraepithelial carcinoma/i);
  assert.doesNotMatch(stic, /no evidence of (STIC|malignancy)/i);
  const wild = micro({ indication: 'Risk-reducing', p53Pattern: 'Wild-type', ki67: 'Low' });
  assert.match(wild, /wild-type/i);
  for (const t of [p53, stil, stic, wild]) assert.doesNotMatch(t, /putative|consecutive|by definition|WHO/i);
});

test('microscopy: benign findings, Walthard rests in the house wording, endometriosis once for tube and ovary', () => {
  const w = micro({ tubeFindings: ['Walthard rests', 'Paratubal cyst'] });
  assert.match(w, /Walthard rests are seen on the tubal serosa\./);
  assert.match(w, /paratubal cyst/i);
  const e = micro({ tubeFindings: ['Salpingitis isthmica nodosa', 'Endometriosis'], ovaryFindings: ['Endometriosis', 'Corpus luteum'] });
  assert.equal((e.match(/in keeping with endometriosis/g) || []).length, 1);
  assert.match(e, /are present in the tube and ovary, in keeping with endometriosis\./);
});

test('diagnosis: NO SIGNIFICANT PATHOLOGY; the lesion leads; STIC reads see comment', () => {
  assert.equal(dxText({}), 'RIGHT FALLOPIAN TUBE AND OVARY, salpingo-oophorectomy - NO SIGNIFICANT PATHOLOGY');
  assert.equal(dxText({ tubeFindings: ['p53 signature'], ovaryFindings: ['Corpora albicantia'] }), 'RIGHT FALLOPIAN TUBE AND OVARY, salpingo-oophorectomy - p53 SIGNATURE; corpora albicantia, ovary; NO EVIDENCE OF MALIGNANCY');
  assert.match(dxText({ tubeFindings: ['STIL'] }), / - SEROUS TUBAL INTRAEPITHELIAL LESION \(STIL\); NO EVIDENCE OF MALIGNANCY$/);
  assert.match(dxText({ side: 'Left', tubeFindings: [STIC, 'Paratubal cyst'] }), /^LEFT FALLOPIAN TUBE AND OVARY, salpingo-oophorectomy - SEROUS TUBAL INTRAEPITHELIAL CARCINOMA \(STIC\); PARATUBAL CYST; see comment$/);
  assert.match(dxText({ tubeFindings: ['Walthard rests'] }), /WALTHARD CELL REST/);
  assert.match(dxText({ tubeFindings: ['Salpingitis isthmica nodosa', 'Endometriosis'], ovaryFindings: ['Endometriosis'] }), / - SALPINGITIS ISTHMICA NODOSA; ENDOMETRIOSIS$/);
});

test('comment: a STIC prints the multidisciplinary meeting comment, naming the part when there are several', () => {
  assert.equal(schema.snippets.find((s) => s.id === 'adnexa_stic_mdt')?.text, STIC_COMMENT);
  const one = run({ tubeFindings: [STIC], p53Pattern: 'Aberrant – null', ki67: 'Increased' }).report;
  assert.match(one, /Serous tubal intraepithelial carcinoma \(STIC\) is identified\. Discussion at the gynaecological oncology multidisciplinary team meeting is suggested\./);
  assert.doesNotMatch(run({ tubeFindings: ['p53 signature'] }).report, /multidisciplinary/);
  const two = runParts([{ side: 'Right' }, { side: 'Left', tubeFindings: [STIC] }]).report;
  assert.match(two, /Serous tubal intraepithelial carcinoma \(STIC\) is identified \(part B\)\./);
});

test('checks: stains against the lesion, sampling of a risk-reducing specimen', () => {
  const msgs = (values) => gen.validate(part(values)).map((m) => m.message || m.text || String(m)).join(' | ');
  assert.match(msgs({ tubeFindings: ['p53 signature'] }), /p53/i);
  assert.match(msgs({ tubeFindings: ['p53 signature'], p53Pattern: 'Wild-type' }), /wild-type/i);
  assert.match(msgs({ p53Pattern: 'Aberrant – overexpression', indication: 'Risk-reducing' }), /no tubal lesion/i);
  assert.match(msgs({ indication: 'Risk-reducing' }), /SEE-FIM/);
  assert.equal(gen.validate(part({ indication: 'Risk-reducing', sampling: 'Entirely submitted (SEE-FIM)' })).length, 0);
  assert.equal(gen.validate(part({})).length, 0);
});

test('routing: tube and ovary lines open this form; cysts, masses, frozen sections, the uterus and tube-only lines keep theirs', () => {
  for (const line of ['Right tube and ovary', 'Left ovary and fallopian tube', 'Right fallopian tube and ovary', 'Left adnexa', 'Right salpingo-oophorectomy', 'Bilateral salpingo-oophorectomy', 'Bilateral tubes and ovaries, RRSO', 'left ovary & tube', 'right tube + ovary', 'L ovary and tube']) {
    const m = route(line);
    assert.equal(m.templateId, 'adnexa_benign', line);
    assert.equal(m.tier, 'confident', line);
  }
  assert.equal(route('Right ovary and tube', 'BRCA1 carrier').templateId, 'adnexa_benign');
  assert.equal(route('Right ovary and tube', 'BRCA2 carrier, previous breast carcinoma').templateId, 'adnexa_benign');
  assert.notEqual(route('Right ovary and tube', 'ovarian carcinoma').templateId, 'adnexa_benign');
  assert.equal(route('Right ovary and tube, frozen section').templateId, 'frozen_section');
  assert.equal(route('Left fallopian tube, salpingectomy').templateId, 'uterus_benign');
  assert.equal(route('Uterus, cervix and bilateral adnexa, total hysterectomy').templateId, 'uterus_benign');
  for (const line of ['Left tube and ovary, ?malignancy', 'Right adnexal mass', 'Left ovary and tube, endometrioma', 'Right ovary + tube, torsion', 'Left ovarian cyst, cystectomy']) {
    assert.notEqual(route(line).templateId, 'adnexa_benign', line);
  }
});

test('fills: side from the line, risk-reducing from the line or history, SEE-FIM from the line', () => {
  assert.deepEqual(preset('Left ovary and tube'), { side: 'Left' });
  assert.deepEqual(preset('R ovary and tube'), { side: 'Right' });
  assert.deepEqual(preset('Lt ovary & tube'), { side: 'Left' });
  assert.deepEqual(preset('Bilateral tubes and ovaries, RRSO'), { side: 'Bilateral', indication: 'Risk-reducing' });
  assert.deepEqual(preset('Bilateral tubes and ovaries, SEE-FIM'), { side: 'Bilateral', sampling: 'Entirely submitted (SEE-FIM)' });
  assert.deepEqual(preset('Right ovary and tube', 'BRCA1 carrier'), { side: 'Right', indication: 'Risk-reducing' });
  assert.deepEqual(preset('Right tube and ovary', 'Opportunistic'), { side: 'Right', indication: 'Opportunistic' });
});

// Golden reports: written on first run, compared after; edit deliberately (UPDATE_FIXTURES=1 rewrites).
const EXAMPLE = schema.example.parts[0].values;
const CASES = [
  ['01-right-so-p53-signature', 'right salpingo-oophorectomy, fimbria entirely submitted, p53 signature with overexpression and low Ki-67', [EXAMPLE]],
  ['02-bilateral-rrso-see-fim', 'risk-reducing bilateral salpingo-oophorectomy by SEE-FIM, wild-type p53, nothing found', [{
    ...EXAMPLE, side: 'Bilateral', indication: 'Risk-reducing', sampling: 'Entirely submitted (SEE-FIM)', tubeSize: 'right 5 x 0.6, left 4.5 x 0.5',
    ovarySize: 'right 2.5 x 1.5 x 1, left 2 x 1.5 x 1', tubeFindings: ['Unremarkable'], ovaryFindings: ['Unremarkable'], p53Pattern: 'Wild-type', ki67: 'Low'
  }]],
  ['03-left-so-stic-paratubal-cyst', 'left risk-reducing salpingo-oophorectomy with a STIC and a paratubal cyst', [{
    ...EXAMPLE, side: 'Left', indication: 'Risk-reducing', sampling: 'Entirely submitted (SEE-FIM)', tubeSize: '6 x 0.7', ovarySize: '2.5 x 2 x 1',
    cystSize: '1.2', tubeFindings: ['Paratubal cyst', STIC], ovaryFindings: ['Unremarkable'], p53Pattern: 'Aberrant – null', ki67: 'Increased'
  }]],
  ['04-opportunistic-salpingectomies', 'opportunistic right and left salpingectomies, Walthard rests and hydrosalpinx', [
    { ...EXAMPLE, side: 'Right', procedure: 'Salpingectomy', indication: 'Opportunistic', sampling: 'Representative', tubeSize: '5 x 0.5', ovarySize: '', tubeFindings: ['Walthard rests'], ovaryFindings: ['Unremarkable'], p53Pattern: 'Not performed', ki67: 'Not performed' },
    { ...EXAMPLE, side: 'Left', procedure: 'Salpingectomy', indication: 'Opportunistic', sampling: 'Representative', tubeSize: '6 x 1.5', ovarySize: '', tubeFindings: ['Hydrosalpinx'], ovaryFindings: ['Unremarkable'], p53Pattern: 'Not performed', ki67: 'Not performed' }
  ]]
];
for (const [name, description, parts] of CASES) {
  test(`golden: ${name}`, () => {
    const r = runParts(parts);
    const file = path.join(FIX, `${name}.json`);
    const current = { description, templateId: 'adnexa_benign', values: parts, report: r.report, checks: r.issues };
    if (UPDATE || !fs.existsSync(file)) {
      fs.mkdirSync(FIX, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
    }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(r.report, saved.report, `${file} changed; re-run with UPDATE_FIXTURES=1 only after a deliberate wording change`);
    assert.deepEqual(r.issues, saved.checks, `${file} checks changed`);
    assert.doesNotMatch(r.report, /undefined|\[object|NaN| {3,}/);
  });
}
