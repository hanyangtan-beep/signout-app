// Fibroid, morcellated or excised at hysteroscopy — Phase 81 (27 October 2026).
// The fragments' macroscopy and sampling follow RCPath's tissue pathway for gynaecological pathology (2023,
// sections 7 and 8); the leiomyoma microscopy, diagnosis, comments and checks are the uterus form's myomectomy
// part (generators/uterus.js), so the two forms word a leiomyoma alike.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTemplate, loadManifest } from '../src/registry.js';
import { createCase, defaultValues, generate, isVisible, applyLinkedDefaults } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { extractMacro } from '../src/macroparse.js';
import * as gen from '../generators/uterus_morcellated.js';
import * as uterus from '../generators/uterus.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'uterus_morcellated');
const UPDATE = process.env.UPDATE_FIXTURES === '1';
const { schema } = await loadTemplate('uterus_morcellated');
const { schema: benign } = await loadTemplate('uterus_benign');
const manifest = await loadManifest();
const field = (id) => schema.fields.find((f) => f.id === id);
const { MM, SC, HY } = gen;
const STUMP = 'STUMP – see comment';
const FH = 'Fumarate hydratase-deficient – see comment';
const IVL = 'Intravenous leiomyomatosis – see comment';
const BIZARRE = 'With bizarre nuclei';
const part = (values = {}, label = 'A') => ({ label, values: { ...defaultValues(schema), ...values } });
/** A part whose procedure was picked in the form: the defaults that follow it move with it. */
const chosen = (procedure, values = {}) => {
  const p = part();
  p.values.procedure = procedure;
  applyLinkedDefaults(schema, p, 'procedure', MM);
  Object.assign(p.values, values);
  return p;
};
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
/** The values a pasted line opens the form with: its fills, then the defaults that follow them (src/app.js prefillFromLine). */
const opened = (line) => {
  const fills = preset(line);
  const p = part();
  const before = { ...p.values };
  Object.assign(p.values, fills);
  for (const k of Object.keys(fills)) applyLinkedDefaults(schema, p, k, before[k], fills);
  return p.values;
};
const strip = (s) => s.replace(/^\(A\) /, '');
const macro = (p) => strip(gen.macro(p));
const micro = (p) => strip(gen.microscopy(p));
const dx = (p) => strip(gen.diagnosis(p));
const asMyomectomy = (p) => ({ ...p.values, specimenName: uterus.MYOMECTOMY });
const msgs = (p) => gen.validate(p).map((m) => `${m.level}:${m.field || ''}:${m.message}`).join(' | ');

test('metadata: a benign gynae resection listed after the uterus form, packed, with complete defaults', () => {
  assert.equal(schema.id, 'uterus_morcellated');
  assert.equal(schema.generator, 'uterus_morcellated');
  assert.equal(schema.organ, 'UTERUS');
  assert.equal(schema.system, 'Gynae');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.label, 'Morcellated / hysteroscopic');
  assert.equal(schema.rank, 27.5);
  assert.ok(schema.rank > benign.rank);
  for (const a of ['morcellation', 'hysteroscopic myomectomy', 'TCRF', 'submucosal fibroid']) assert.ok(schema.aliases.includes(a), a);
  assert.deepEqual(schema.layout, { pack: true, macroGroups: ['Macroscopy'], macroFields: ['procedure'] });
  const ids = schema.fields.map((f) => f.id);
  for (const p of schema.example.parts) for (const id of ids) assert.ok(id in p.values, `example part ${p.label} has ${id}`);
  assert.equal(manifest.find((t) => t.id === 'uterus_morcellated')?.label, 'Morcellated / hysteroscopic');
});

test('options: three procedures; the leiomyoma fields are the uterus form\'s, option for option', () => {
  assert.deepEqual(field('procedure').options, [MM, SC, HY]);
  assert.equal(field('procedure').default, MM);
  for (const id of ['leiomyomaType', 'changes', 'atypia', 'mitoticCount', 'tumourNecrosis', 'fhIhc', 'adenomyosis']) {
    const b = benign.fields.find((f) => f.id === id);
    assert.equal(field(id).type, b.type, id);
    assert.deepEqual(field(id).options, b.options, id);
    assert.deepEqual(field(id).default, b.default, id);
  }
  assert.deepEqual(field('cutSurface').options, Object.keys(uterus.CUT_SURFACE));
  assert.deepEqual(field('unusualArea').options, ['Not identified', 'Fleshy area', 'Necrosis', 'Fleshy area and necrosis']);
  assert.deepEqual(field('sampling').options, ['Representative', 'All embedded']);
  assert.deepEqual(field('tissueTypes').options, ['Myometrium', 'Endometrium', 'Cervix', 'Serosa']);
  assert.equal(field('blocks').default, '3');
});

test('visibility: cautery at hysteroscopy, the leiomyoma fields with a leiomyoma, endometrium and adenomyosis with their tissue', () => {
  const v = (values) => ({ ...defaultValues(schema), ...values });
  assert.equal(isVisible(field('cautery'), v({})), false);
  assert.equal(isVisible(field('cautery'), v({ procedure: SC })), false);
  assert.equal(isVisible(field('cautery'), v({ procedure: HY })), true);
  for (const id of ['leiomyomaCount', 'leiomyomaType', 'changes', 'atypia', 'mitoticCount', 'tumourNecrosis', 'fhIhc']) {
    assert.equal(isVisible(field(id), v({})), true, id);
    assert.equal(isVisible(field(id), v({ leiomyoma: 'Absent' })), false, id);
  }
  assert.equal(isVisible(field('endometrium'), v({})), false);
  assert.equal(isVisible(field('endometrium'), v({ tissueTypes: ['Endometrium'] })), true);
  assert.equal(isVisible(field('adenomyosis'), v({ tissueTypes: ['Endometrium'] })), false);
  assert.equal(isVisible(field('adenomyosis'), v({ tissueTypes: ['Myometrium', 'Serosa'] })), true);
});

test('linked defaults: hysteroscopic fragments are all embedded; a morcellated hysterectomy expects myometrium, endometrium and serosa', () => {
  assert.equal(chosen(HY).values.sampling, 'All embedded');
  const sc = chosen(SC);
  assert.deepEqual(sc.values.tissueTypes, ['Myometrium', 'Endometrium', 'Serosa']);
  assert.equal(sc.values.endometrium, 'Proliferative');
  assert.equal(sc.values.sampling, 'Representative');
  sc.values.procedure = MM;
  applyLinkedDefaults(schema, sc, 'procedure', SC);
  assert.deepEqual(sc.values.tissueTypes, []);
  assert.equal(sc.values.endometrium, 'Benign');
  // A value the pathologist set is kept.
  const typed = part({ tissueTypes: ['Cervix'] });
  typed.values.procedure = SC;
  applyLinkedDefaults(schema, typed, 'procedure', MM);
  assert.deepEqual(typed.values.tissueTypes, ['Cervix']);
});

test('specimen and head: one per procedure', () => {
  assert.equal(gen.specimenName(part()), 'Uterus, fibroid, morcellated myomectomy');
  assert.equal(gen.specimenName(part({ procedure: SC })), 'Uterus, morcellated supracervical hysterectomy');
  assert.equal(gen.specimenName(part({ procedure: HY })), 'Uterus, submucosal fibroid, hysteroscopic excision');
  assert.match(dx(part()), /^UTERUS, fibroid, morcellated myomectomy - /);
  assert.match(dx(part({ procedure: SC })), /^UTERUS, morcellated supracervical hysterectomy - /);
  assert.match(dx(part({ procedure: HY })), /^UTERUS, submucosal fibroid, hysteroscopic excision - /);
  // A blank procedure reads as a morcellated myomectomy.
  assert.equal(gen.specimenName(part({ procedure: '' })), 'Uterus, fibroid, morcellated myomectomy');
});

test('macroscopy: weighed and measured in aggregate, sliced, any departure from a whorled cut surface, then the sampling', () => {
  assert.equal(macro(part()), 'Received in formalin are multiple morcellated fragments of firm whitish tissue. Sectioning shows a whorled cut surface. No fleshy area or necrosis is identified. Representative sections in 3 blocks.');
  assert.equal(macro(part({ weight: '85', dimensions: '9 x 7 x 4', fragmentSize: '0.5 to 4' })),
    'Received in formalin are multiple morcellated fragments of firm whitish tissue, weighing 85 g and measuring 9 x 7 x 4 cm in aggregate. The fragments measure from 0.5 to 4 cm across. Sectioning shows a whorled cut surface. No fleshy area or necrosis is identified. Representative sections in 3 blocks.');
  assert.equal(macro(chosen(SC, { weight: '310' })),
    'Received in formalin are multiple morcellated fragments of uterine tissue, weighing 310 g in aggregate. Sectioning shows a whorled cut surface. No fleshy area or necrosis is identified. Representative sections in 3 blocks.');
  assert.match(macro(part({ fragmentCount: '4', fragmentSize: '6' })), /^Received in formalin are four morcellated fragments of firm whitish tissue\. The fragments measure up to 6 cm across\. /);
  assert.match(macro(part({ fragmentTissue: 'rubbery grey-white tissue.' })), /^Received in formalin are multiple morcellated fragments of rubbery grey-white tissue\. /);
  assert.match(macro(part({ cutSurface: 'Degenerate', unusualArea: 'Fleshy area and necrosis' })), /Sectioning shows a soft, degenerate cut surface\. Soft, fleshy and necrotic areas are present\./);
  assert.match(macro(part({ unusualArea: 'Fleshy area' })), /A soft, fleshy area is present\./);
  assert.match(macro(part({ unusualArea: 'Necrosis' })), /An area of necrosis is present\./);
  assert.match(macro(part({ blocks: '12' })), /Representative sections in 12 blocks\.$/);
  assert.match(macro(part({ blocks: '' })), /Representative sections are submitted\.$/);
  assert.equal(gen.macro(part(), { options: { macro: false } }), '');
});

test('macroscopy: hysteroscopic fragments are tan, described whole and all embedded; one fragment reads in the singular', () => {
  assert.equal(macro(chosen(HY, { dimensions: '2 x 2 x 1', blocks: '1' })),
    'Received in formalin are multiple fragments of tan tissue, measuring 2 x 2 x 1 cm in aggregate. The fragments have a whorled appearance. No fleshy area or necrosis is identified. All embedded in 1 block.');
  assert.equal(macro(chosen(HY, { fragmentCount: '1', dimensions: '2.5 x 2 x 1.5', fragmentSize: '1 to 2', blocks: '2' })),
    'Received in formalin is a fragment of tan tissue, measuring 2.5 x 2 x 1.5 cm. The fragment has a whorled appearance. No fleshy area or necrosis is identified. All embedded in 2 blocks.');
  assert.match(macro(chosen(HY, { fragmentCount: '1', cutSurface: 'Calcified' })), /The fragment is gritty and calcified\./);
  assert.match(macro(chosen(HY, { cutSurface: 'Haemorrhagic' })), /The fragments are haemorrhagic\./);
  assert.match(macro(chosen(HY, { blocks: '' })), /No fleshy area or necrosis is identified\. All embedded\.$/);
});

test('block key: representative fragments or all embedded; blank blocks leave it out; a typed key wins', () => {
  assert.equal(strip(gen.blockKey(part())), '(1-3) Representative fragments.');
  assert.equal(strip(gen.blockKey(part({ blocks: '1' }))), '(1) Representative fragments.');
  assert.equal(strip(gen.blockKey(chosen(HY, { blocks: '2' }))), '(1-2) Fragments, all embedded.');
  assert.equal(gen.blockKey(part({ blocks: '' })), '');
  assert.equal(strip(gen.blockKey(part({ blockKeyText: '(1)-(4) Fibroid. (5) Fleshy area' }))), '(1)-(4) Fibroid. (5) Fleshy area.');
  assert.equal(gen.blockKey(part(), { options: { macro: false } }), '');
});

test('dictated macroscopy: weight, aggregate size, fragment count, blocks and the key', () => {
  assert.deepEqual(extractMacro(schema, 'Received in formalin are multiple morcellated fragments of firm whitish tissue, weighing 85 g and measuring 9 x 7 x 4 cm in aggregate. Representative sections in 3 blocks.'),
    { weight: '85', dimensions: '9 x 7 x 4', blocks: '3' });
  assert.deepEqual(extractMacro(schema, 'Received in formalin are 12 fragments of tan tissue measuring 3 x 2 x 1 cm in aggregate. All embedded in 2 blocks.'),
    { dimensions: '3 x 2 x 1', fragmentCount: '12', blocks: '2' });
  const keyed = extractMacro(schema, 'Received in formalin are four pieces of morcellated tissue weighing 140 g. Representative sections in 6 blocks. (1)-(4) Fibroid. (5)-(6) Fleshy area.');
  assert.equal(keyed.weight, '140');
  assert.equal(keyed.fragmentCount, '4');
  assert.match(keyed.blockKeyText, /Fibroid[\s\S]*Fleshy area/);
});

test('microscopy: the uterus form\'s myomectomy paragraph, type for type', () => {
  assert.equal(micro(part()), 'Sections show pieces of smooth muscle tumour tissue comprising spindle cells arranged in fascicles and whorls. Thick walled vessels are seen. No epithelioid tumour cells, significant nuclear atypia, coagulative tumour necrosis, or frequent mitoses are observed. There is no evidence of malignancy. Features are those of leiomyoma.');
  for (const t of field('leiomyomaType').options) {
    if (t === BIZARRE) continue;
    const p = part({ leiomyomaType: t, atypia: t === STUMP ? 'Focal moderate to severe' : 'None', changes: ['Hyaline degeneration'] });
    assert.equal(micro(p), uterus.myomectomyMicro(asMyomectomy(p)), t);
  }
  // Bizarre nuclei close on "see comment": the fragmentation caveat is in the comment.
  const b = part({ leiomyomaType: BIZARRE, atypia: 'Diffuse moderate to severe' });
  assert.equal(micro(b), uterus.myomectomyMicro(asMyomectomy(b)).replace('Features are those of leiomyoma with bizarre nuclei.', 'Features are those of leiomyoma with bizarre nuclei; see comment.'));
  assert.match(micro(b), /; see comment\.$/);
});

test('microscopy: cautery at hysteroscopy; endometrium in the house sentence; myometrium, endocervix and serosa among the fragments', () => {
  const LM = 'Features are those of leiomyoma.';
  assert.ok(micro(chosen(HY, { cautery: 'Present' })).endsWith(`${LM} Cautery artefact is present at the edges of the fragments.`));
  assert.ok(micro(chosen(HY, { cautery: 'Marked, limiting assessment' })).endsWith(`${LM} Marked cautery artefact limits the assessment of some fragments.`));
  assert.doesNotMatch(micro(part({ cautery: 'Present' })), /cautery/i);
  assert.ok(micro(chosen(HY, { tissueTypes: ['Endometrium'] })).endsWith(`${LM} Benign endometrium is included, without features of atypical hyperplasia or chronic endometritis.`));
  assert.ok(micro(chosen(HY, { tissueTypes: ['Endometrium'], endometrium: 'Endometrial polyp' })).endsWith(`${LM} Fragments of endometrial polyp with fibrotic stroma and thick-walled vessels are included, without atypical hyperplasia.`));
  assert.ok(micro(chosen(SC, { adenomyosis: 'Present', tissueTypes: ['Myometrium', 'Endometrium', 'Cervix', 'Serosa'] })).endsWith(
    `${LM} Proliferative endometrium is included, without features of atypical hyperplasia or chronic endometritis. Fragments of myometrium with adenomyosis and benign endocervix are also present. Unremarkable serosa is present on some fragments.`));
  assert.ok(micro(part({ additionalNotes: 'Focal dystrophic calcification' })).endsWith(`${LM} Focal dystrophic calcification.`));
});

test('microscopy: no leiomyoma among the fragments', () => {
  assert.equal(micro(part({ leiomyoma: 'Absent' })), 'Sections show pieces of unremarkable myometrium. There is no evidence of malignancy.');
  assert.equal(micro(part({ leiomyoma: 'Absent', tissueTypes: ['Myometrium'], adenomyosis: 'Present' })), 'Sections show pieces of myometrium with adenomyosis. There is no evidence of malignancy.');
  assert.equal(micro(chosen(HY, { leiomyoma: 'Absent', tissueTypes: ['Endometrium'] })), 'Benign endometrium is included, without features of atypical hyperplasia or chronic endometritis. There is no evidence of malignancy.');
  assert.equal(micro(chosen(HY, { leiomyoma: 'Absent', tissueTypes: ['Cervix'] })), 'Fragments of benign endocervix are present. There is no evidence of malignancy.');
});

test('diagnosis: the leiomyoma as the uterus form words it; adenomyosis, a polyp and a hysterectomy\'s endometrium follow', () => {
  const head = 'UTERUS, fibroid, morcellated myomectomy - ';
  assert.equal(dx(part()), `${head}LEIOMYOMA`);
  assert.equal(dx(part({ leiomyomaCount: '3' })), `${head}LEIOMYOMAS`);
  assert.equal(dx(part({ leiomyomaType: 'Cellular' })), `${head}CELLULAR LEIOMYOMA`);
  assert.equal(dx(part({ changes: ['Infarct-type necrosis'] })), `${head}LEIOMYOMA with INFARCT-TYPE NECROSIS`);
  assert.equal(dx(part({ leiomyomaType: STUMP, atypia: 'Focal moderate to severe' })), `${head}SMOOTH MUSCLE TUMOUR OF UNCERTAIN MALIGNANT POTENTIAL (STUMP); see comment`);
  assert.equal(dx(part({ leiomyomaType: BIZARRE })), `${head}LEIOMYOMA with BIZARRE NUCLEI; see comment`);
  assert.equal(dx(part({ leiomyomaType: FH })), `${head}FUMARATE HYDRATASE-DEFICIENT LEIOMYOMA; see comment`);
  for (const t of field('leiomyomaType').options) {
    const p = part({ leiomyomaType: t });
    assert.ok(dx(p).startsWith(`${head}${uterus.leiomyomaDx(asMyomectomy(p))}`), t);
  }
  assert.equal(dx(chosen(SC, { adenomyosis: 'Present', leiomyomaCount: '2' })), 'UTERUS, morcellated supracervical hysterectomy - LEIOMYOMAS; ADENOMYOSIS; proliferative endometrium');
  const hy = 'UTERUS, submucosal fibroid, hysteroscopic excision - ';
  assert.equal(dx(chosen(HY, { tissueTypes: ['Endometrium'] })), `${hy}LEIOMYOMA`);
  assert.equal(dx(chosen(HY, { tissueTypes: ['Endometrium'], endometrium: 'Endometrial polyp' })), `${hy}LEIOMYOMA; ENDOMETRIAL POLYP`);
  assert.equal(dx(chosen(HY, { leiomyoma: 'Absent', tissueTypes: ['Endometrium'] })), `${hy}BENIGN ENDOMETRIUM`);
  assert.equal(dx(part({ leiomyoma: 'Absent' })), `${head}NO SIGNIFICANT PATHOLOGY`);
});

test('comment: the uterus form\'s STUMP, FH and intravenous leiomyomatosis comments, the bizarre nuclei caveat and the fragmentation snippet', () => {
  assert.match(run({ leiomyomaType: STUMP, atypia: 'Focal moderate to severe', mitoticCount: '6' }).report,
    /The smooth muscle tumour shows focal moderate to severe cytological atypia and a mitotic count of 6 per 10 HPF, with no coagulative tumour cell necrosis\. Clinical follow-up is suggested\./);
  assert.match(run({ leiomyomaType: FH, fhIhc: 'Lost' }).report, /hereditary leiomyomatosis and renal cell carcinoma \(HLRCC\) syndrome/);
  assert.match(run({ leiomyomaType: IVL }).report, /to assess for extension beyond the uterus\./);
  assert.equal(gen.BIZARRE_CAVEAT, 'As the specimen is fragmented, the diagnosis of leiomyoma with bizarre nuclei can be made with confidence only if the lesion has been completely removed.');
  assert.ok(run({ leiomyomaType: BIZARRE }).report.includes(gen.BIZARRE_CAVEAT));
  assert.equal(gen.comment([part()]), '');
  // The fragmentation snippet prints itself for a morcellated specimen and is offered for a hysteroscopic one.
  const snip = (id) => schema.snippets.find((s) => s.id === id);
  assert.equal(snip('morcellated_fragmentation').text, 'Fragmentation of the morcellated specimen ({parts}) precludes assessment of the tumour border and the serosa.');
  assert.equal(snip('hysteroscopic_fragmentation').text, 'Fragmentation of the hysteroscopic specimen ({parts}) precludes assessment of the tumour border.');
  assert.equal(snip('hysteroscopic_fragmentation').auto, undefined);
  assert.match(run({}).report, /\n\nFragmentation of the morcellated specimen precludes assessment of the tumour border and the serosa\.$/);
  assert.match(run({ procedure: SC }).report, /Fragmentation of the morcellated specimen precludes/);
  assert.doesNotMatch(run({ procedure: HY }).report, /Fragmentation/);
  const two = runParts([{}, { leiomyomaType: BIZARRE }]).report;
  assert.match(two, /\(B\) As the specimen is fragmented, the diagnosis of leiomyoma with bizarre nuclei/);
  assert.match(two, /Fragmentation of the morcellated specimen \(parts A and B\) precludes/);
  assert.match(runParts([{ procedure: HY }, { procedure: SC }]).report, /Fragmentation of the morcellated specimen \(part B\) precludes/);
});

test('checks: the uterus form\'s leiomyoma checks, and RCPath\'s advice to sample more than three blocks when anything is unusual', () => {
  assert.equal(msgs(part()), '');
  assert.equal(msgs(chosen(HY)), '');
  assert.equal(msgs(chosen(SC)), '');
  assert.match(msgs(part({ unusualArea: 'Fleshy area' })), /^warn:blocks:A fleshy or necrotic area is recorded with three blocks or fewer/);
  assert.match(msgs(part({ unusualArea: 'Necrosis', blocks: '' })), /^warn:blocks:/);
  assert.equal(msgs(part({ unusualArea: 'Fleshy area', blocks: '8' })), '');
  assert.equal(msgs(chosen(HY, { unusualArea: 'Necrosis' })), '');
  assert.equal(msgs(part({ leiomyomaType: BIZARRE })), 'info:blocks:Atypical features with three blocks or fewer: RCPath advises sampling more of the specimen.');
  assert.equal(msgs(part({ leiomyomaType: BIZARRE, blocks: '10' })), '');
  assert.equal(msgs(part({ atypia: 'Mild' })), '');
  assert.match(msgs(part({ leiomyomaType: STUMP, blocks: '10' })), /STUMP is chosen but no atypia, mitotic count or coagulative tumour cell necrosis is recorded/);
  assert.match(msgs(part({ tumourNecrosis: 'Present', blocks: '10' })), /consider STUMP, or the leiomyosarcoma criteria/);
  assert.match(msgs(part({ fhIhc: 'Lost' })), /consider the fumarate hydratase-deficient type/);
  assert.equal(msgs(part({ procedure: SC })), 'info:tissueTypes:Morcellated hysterectomy: no endometrium is recorded among the fragments; RCPath advises sampling the endometrial, cervical and serosal surfaces.');
  assert.equal(gen.validate(part({ leiomyoma: 'Absent', tumourNecrosis: 'Present' })).length, 0);
});

test('routing: morcellated and hysteroscopic fibroid lines open this form; prostate chips, polyps and plain fibroid lines keep theirs', () => {
  for (const line of ['Uterus, morcellated fibroid', 'Morcellated myoma', 'Submucosal fibroid, hysteroscopic resection', 'Diagnostic hysteroscopy, fibroid',
    'Uterine fibroid, morcellated myomectomy', 'Uterus, laparoscopic supracervical hysterectomy, morcellated', 'Uterus, morcellated subtotal hysterectomy',
    'Fibroid, hysteroscopic myomectomy', 'Fibroid polyp, hysteroscopic resection', 'Submucous fibroid, resectoscopic excision', 'Fibroid, MyoSure', 'Fibroid, TCRM']) {
    const m = route(line);
    assert.equal(m.templateId, 'uterus_morcellated', line);
    assert.equal(m.tier, 'confident', line);
  }
  for (const line of ['Submucosal fibroid', 'Fibroid polyp', 'Fibroid', 'Myomectomy', 'Uterus, myomectomy', 'Uterus, subtotal hysterectomy']) {
    const m = route(line);
    assert.equal(m.templateId, 'uterus_benign', line);
    assert.equal(m.tier, 'confident', line);
  }
  // A history naming fibroids or bleeding counts for both forms, so the procedure decides.
  for (const [line, history] of [['Uterus, morcellated fibroid', 'Fibroid uterus'], ['Submucosal fibroid, hysteroscopic resection', 'Menorrhagia'], ['Uterus, LSH, morcellated', 'Fibroids, AUB']]) {
    const m = route(line, history);
    assert.equal(m.templateId, 'uterus_morcellated', `${line} / ${history}`);
    assert.equal(m.tier, 'confident', `${line} / ${history}`);
  }
  assert.equal(route('Submucosal fibroid', 'Menorrhagia').templateId, 'uterus_benign');
  assert.equal(route('Morcellated prostate tissue', 'BPH').templateId, 'turp');
  assert.equal(route('Endometrial polyp, hysteroscopic polypectomy').templateId, 'endometrial_biopsy');
  assert.equal(route('Endometrium, hysteroscopic biopsy').templateId, 'endometrial_biopsy');
  assert.equal(route('Prostate, HoLEP, morcellated').templateId, 'turp');
  for (const line of ['Morcellated prostate tissue', 'Left ovarian cyst, morcellated', 'Spleen, morcellated']) assert.notEqual(route(line).templateId, 'uterus_morcellated', line);
});

test('fills: the procedure from the line, and the defaults that follow it', () => {
  assert.deepEqual(preset('Uterus, morcellated fibroid'), { procedure: MM });
  assert.deepEqual(preset('Uterus, laparoscopic supracervical hysterectomy, morcellated'), { procedure: SC });
  assert.deepEqual(preset('Uterus, LSH, morcellated'), { procedure: SC });
  assert.deepEqual(preset('Submucosal fibroid, hysteroscopic resection'), { procedure: HY });
  assert.deepEqual(preset('Fibroid, MyoSure'), { procedure: HY });
  assert.equal(opened('Submucosal fibroid, hysteroscopic resection').sampling, 'All embedded');
  const sc = opened('Uterus, morcellated subtotal hysterectomy');
  assert.equal(sc.procedure, SC);
  assert.deepEqual(sc.tissueTypes, ['Myometrium', 'Endometrium', 'Serosa']);
  assert.equal(sc.endometrium, 'Proliferative');
});

// Golden reports: written on first run, compared after; edit deliberately (UPDATE_FIXTURES=1 rewrites).
const EXAMPLE = schema.example.parts[0].values;
const CASES = [
  ['01-morcellated-usual-leiomyoma', 'morcellated myomectomy, usual leiomyoma with hyaline degeneration, three representative blocks', [EXAMPLE]],
  ['02-morcellated-cellular-leiomyoma', 'morcellated myomectomy, cellular leiomyoma, mitoses counted', [{
    ...EXAMPLE, weight: '120', dimensions: '10 x 8 x 5', fragmentSize: '1 to 5', blocks: '4', leiomyomaType: 'Cellular', changes: [], mitoticCount: '2'
  }]],
  ['03-morcellated-stump', 'morcellated myomectomy with a fleshy area, sampled further: STUMP with focal moderate to severe atypia', [{
    ...EXAMPLE, weight: '160', dimensions: '12 x 9 x 5', fragmentSize: '1 to 6', cutSurface: 'Whorled', unusualArea: 'Fleshy area', blocks: '12',
    leiomyomaType: STUMP, changes: [], atypia: 'Focal moderate to severe', mitoticCount: '6', tumourNecrosis: 'Not identified', fhIhc: 'Retained'
  }]],
  ['04-hysteroscopic-submucosal-leiomyoma', 'hysteroscopic excision of a submucosal fibroid, all embedded, with cautery artefact and benign endometrium', [{
    ...EXAMPLE, procedure: HY, weight: '', dimensions: '2.5 x 2 x 1', fragmentSize: '', sampling: 'All embedded', blocks: '2', changes: [],
    cautery: 'Present', tissueTypes: ['Endometrium'], endometrium: 'Benign'
  }]]
];
for (const [name, description, parts] of CASES) {
  test(`golden: ${name}`, () => {
    const r = runParts(parts);
    const file = path.join(FIX, `${name}.json`);
    const current = { description, templateId: 'uterus_morcellated', values: parts, report: r.report, checks: r.issues };
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
