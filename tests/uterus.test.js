// Phase 4b: uterus (benign hysterectomy / myomectomy +/- adnexa) template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate, isVisible } from '../src/engine.js';
import { parseIntake, presetValues } from '../src/intake.js';
import * as gen from '../generators/uterus.js';
import { sizePhrase, thicknessPhrase, weightPhrase, blockCount } from '../generators/uterus.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('uterus_benign');
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
// Phase 74 (23 October 2026), deliberate: a leiomyoma no longer opens Present (user: "they do not always
// contain leiomyomata"). These tests describe a fibroid uterus, so `one()` records it; the new default is
// covered by 'default single part ...' and the Phase 74 tests at the end.
const LM = { leiomyoma: 'Present' };
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...LM, ...values };
  c.options = { ...c.options, ...options };
  return c;
};

const TAH = 'UTERUS AND CERVIX, total hysterectomy';

test('metadata: benign gynae resection with palette aliases and complete defaults', () => {
  assert.equal(schema.id, 'uterus_benign');
  assert.equal(schema.generator, 'uterus');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Gynae');
  assert.equal(schema.label, 'Uterus');
  assert.equal(schema.organ, 'UTERUS');
  assert.equal(schema.name, 'Uterus (benign)');
  assert.equal(schema.rank, 27);
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['hysterectomy', 'fibroid', 'leiomyoma', 'adenomyosis', 'myomectomy', 'TAH', 'BSO', 'salpingo-oophorectomy', 'endometrial polyp', 'cervix', 'fallopian tube', 'ovary']) assert.ok(schema.aliases.includes(a), `alias ${a}`);
  assert.equal(schema.maxParts, 4);
  assert.equal(schema.defaultParts, 1);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  for (const f of schema.fields) assert.ok('default' in f, `${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is a field`);
  for (const p of schema.example.parts) for (const id of ids) assert.ok(id in p.values, `example part ${p.label} has ${id}`);
  assert.equal(schema.fields[0].id, 'specimenName');
  // Benign batch 2 (2026-09-24) appended the three tube-only specimens; tests/fallopian_tube.test.js covers them.
  assert.deepEqual(schema.fields[0].options, ['Uterus and cervix, total hysterectomy', 'Uterus, cervix and bilateral adnexa', 'Uterus, subtotal', 'Myomectomy', 'Left tube and ovary', 'Right tube and ovary', 'Fallopian tube(s), sterilisation', 'Left fallopian tube, salpingectomy', 'Right fallopian tube, salpingectomy', 'Paratubal cyst, excision']);
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  assert.deepEqual(macroFields, ['weight', 'dimensions', 'serosa', 'leiomyomaCount', 'leiomyomaLocation', 'leiomyomaSize', 'cutSurface', 'endometriumThickness', 'polypSize', 'myometrium', 'cervixMacro', 'tubeSize', 'ovarySize', 'cystSize', 'blocks', 'blockKeyText']);
  // Grouped fields are consecutive.
  const firstIdx = schema.fields.findIndex((f) => f.group === 'Macroscopy');
  assert.deepEqual(schema.fields.slice(firstIdx, firstIdx + macroFields.length).map((f) => f.id), macroFields);
  assert.ok(gen.default.macro && gen.default.blockKey && gen.default.specimenName && gen.default.microscopy && gen.default.diagnosis);
});

test('helpers: size, thickness, weight and block count', () => {
  assert.equal(sizePhrase('9x6x4'), '9 x 6 x 4 cm');
  assert.equal(sizePhrase('9 X 6 × 4 cm'), '9 x 6 x 4 cm');
  assert.equal(sizePhrase(''), '');
  assert.equal(thicknessPhrase('0.3 cm'), '0.3 cm');
  assert.equal(thicknessPhrase('3mm'), '3 mm');
  assert.equal(thicknessPhrase('3'), '3 mm');
  assert.equal(thicknessPhrase('0.4'), '0.4 cm');
  assert.equal(weightPhrase('180'), '180 g');
  assert.equal(weightPhrase('180g'), '180 g');
  assert.equal(weightPhrase(''), '');
  assert.equal(blockCount(createCase(schema, 1).parts[0].values), 5);
  assert.equal(blockCount({ ...createCase(schema, 1).parts[0].values, ...LM }), 8);
  assert.equal(blockCount({ specimenName: 'Left tube and ovary', adnexaFindings: [] }), 3);
  assert.equal(blockCount({ specimenName: 'Uterus and cervix, total hysterectomy', blocks: '10' }), 10);
});

test('example: two parts - uterus with leiomyomas, adenomyosis and polyp; left adnexa with paratubal cyst and cystic follicle', () => {
  const r = run(example());
  assert.equal(r.specimens, '(A) Uterus and cervix, total hysterectomy\n(B) Left fallopian tube and ovary, salpingo-oophorectomy');
  assert.equal(r.macro.split('\n\n')[0], '(A) Received in formalin is a total hysterectomy specimen weighing 180 g. The uterus measures 9 x 6 x 4 cm. The serosa is smooth. The cervix is unremarkable. The endometrium measures up to 0.3 cm in thickness. A polyp measuring 1.5 cm is present in the endometrial cavity. The myometrium is trabeculated with pinpoint haemorrhagic foci. Sectioning shows three leiomyomas at intramural and subserosal sites measuring up to 4 cm with a whorled cut surface. Representative sections in 9 blocks.');
  assert.equal(r.macro.split('\n\n')[1], '(B) Received in formalin is a left salpingo-oophorectomy specimen. The fallopian tube measures 5 x 0.6 cm. The ovary measures 3 x 2 x 1.5 cm. A thin-walled paratubal cyst measuring 1 cm is attached to the fallopian tube. Representative sections in 3 blocks.');
  assert.equal(r.blockKey, '(A) (1-2) Anterior cervix and posterior cervix. (3-4) Anterior and posterior endomyometrium. (5-7) Leiomyomas. (8) Endometrial polyp. (9) Lower uterine segment.\n(B) (1) Fallopian tube, sectioned. (2-3) Ovary.');
  assert.equal(r.microscopy.split('\n\n')[0], '(A) Sections of the uterus show adenomyosis with scattered islands of endometrial glands and stroma in the myometrium. Intramural and subserosal leiomyomata with no coagulative necrosis are seen. Mitoses are inconspicuous and there is no cytological atypia. Endometrial polyp with fibrotic stroma and thick-walled vessels is sampled. The background endometrium shows no hyperplasia. The cervix shows no evidence of squamous intraepithelial lesion, glandular dysplasia, or malignancy.');
  assert.equal(r.microscopy.split('\n\n')[1], '(B) Sections of the left fallopian tube show unremarkable plicae. A paratubal cyst is seen, with a fibrous wall lined by ciliated tubal-type epithelium. The ovary shows a cystic follicle. There is no evidence of malignancy.');
  assert.equal(r.diagnosis, `(A) ${TAH} - LEIOMYOMAS; ADENOMYOSIS; ENDOMETRIAL POLYP\n(B) LEFT OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy - PARATUBAL CYST; CYSTIC FOLLICLE, ovary`);
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('undefined'));
});

test('default single part is the house total hysterectomy report with (1)...(8) block key', () => {
  // Phase 74: the default part has no leiomyoma; recorded, the report reads as before.
  const d = run(createCase(schema, 1));
  assert.equal(d.macro, 'Received in formalin is a total hysterectomy specimen. The serosa is smooth. The cervix is unremarkable. Representative sections in 5 blocks.');
  assert.equal(d.blockKey, '(1-2) Anterior cervix and posterior cervix. (3-4) Anterior and posterior endomyometrium. (5) Lower uterine segment.');
  assert.equal(d.microscopy, 'Sections of the uterus show unremarkable myometrium. The endometrial cavity shows proliferative endometrium without hyperplasia. The cervix shows no evidence of squamous intraepithelial lesion, glandular dysplasia, or malignancy.');
  assert.equal(d.diagnosis, `${TAH} - PROLIFERATIVE ENDOMETRIUM`);
  const r = run(one({}));
  assert.equal(r.specimens, 'Uterus and cervix, total hysterectomy');
  assert.equal(r.macro, 'Received in formalin is a total hysterectomy specimen. The serosa is smooth. The cervix is unremarkable. Sectioning shows intramural leiomyomas with a whorled cut surface. Representative sections in 8 blocks.');
  assert.equal(r.blockKey, '(1-2) Anterior cervix and posterior cervix. (3-4) Anterior and posterior endomyometrium. (5-7) Leiomyomas. (8) Lower uterine segment.');
  assert.equal(r.microscopy, 'Sections of the uterus show intramural leiomyomata with no coagulative necrosis. Mitoses are inconspicuous and there is no cytological atypia. The endometrial cavity shows proliferative endometrium without hyperplasia. The cervix shows no evidence of squamous intraepithelial lesion, glandular dysplasia, or malignancy.');
  assert.equal(r.diagnosis, `${TAH} - LEIOMYOMAS; proliferative endometrium`);
  assert.ok(!r.report.includes('(A)'));
});

test('house diagnosis form: leiomyomas, adenomyosis, proliferative endometrium, unremarkable cervix', () => {
  const r = run(one({ adenomyosis: 'Present', weight: '180', dimensions: '9 x 6 x 4', leiomyomaCount: '3', leiomyomaSize: '4', endometriumThickness: '0.3 cm', myometrium: 'Trabeculated' }));
  assert.equal(r.diagnosis, `${TAH} - LEIOMYOMAS; ADENOMYOSIS; proliferative endometrium`);
  assert.equal(r.macro, 'Received in formalin is a total hysterectomy specimen weighing 180 g. The uterus measures 9 x 6 x 4 cm. The serosa is smooth. The cervix is unremarkable. The endometrium measures up to 0.3 cm in thickness. The myometrium is trabeculated. Sectioning shows three intramural leiomyomas measuring up to 4 cm with a whorled cut surface. Representative sections in 8 blocks.');
  assert.ok(r.microscopy.startsWith('Sections of the uterus show adenomyosis with scattered islands of endometrial glands and stroma in the myometrium. Intramural leiomyomata with no coagulative necrosis are seen. Mitoses are inconspicuous and there is no cytological atypia.'));
});

test('macro option off removes the macroscopic description and block key', () => {
  const r = run(one({}, { macro: false }));
  assert.equal(r.macro, '');
  assert.equal(r.blockKey, '');
  assert.ok(!r.report.includes('Received in formalin'));
  assert.ok(!r.report.includes('(1-2) Anterior cervix'));
  assert.ok(r.report.startsWith('Uterus and cervix, total hysterectomy\n\nSections of the uterus'));
});

test('headers option labels the macro and block key blocks', () => {
  const r = run(one({}, { includeHeader: true }));
  assert.ok(r.report.includes('MACROSCOPIC DESCRIPTION:\nReceived in formalin'));
  assert.ok(r.report.includes('BLOCK KEY:\n(1-2) Anterior cervix and posterior cervix.'));
});

test('two-part case keeps (A)/(B) prefixes on every block and part B defaults to the left adnexa', () => {
  const c = createCase(schema, 2);
  assert.equal(c.parts[1].values.specimenName, 'Left tube and ovary');
  assert.equal(c.parts[1].values.leiomyoma, 'Absent');
  c.parts[0].values.leiomyoma = 'Present';
  const r = run(c);
  assert.equal(r.specimens, '(A) Uterus and cervix, total hysterectomy\n(B) Left fallopian tube and ovary, salpingo-oophorectomy');
  assert.ok(r.macro.startsWith('(A) Received in formalin is a total hysterectomy specimen.'));
  assert.ok(r.macro.includes('\n\n(B) Received in formalin is a left salpingo-oophorectomy specimen. Representative sections in 3 blocks.'));
  assert.equal(r.blockKey, '(A) (1-2) Anterior cervix and posterior cervix. (3-4) Anterior and posterior endomyometrium. (5-7) Leiomyomas. (8) Lower uterine segment.\n(B) (1) Fallopian tube, sectioned. (2-3) Ovary.');
  assert.ok(r.microscopy.startsWith('(A) Sections of the uterus'));
  assert.ok(r.microscopy.includes('\n\n(B) Sections of the left fallopian tube and ovary show no significant pathology. There is no evidence of malignancy.'));
  assert.equal(r.diagnosis, `(A) ${TAH} - LEIOMYOMAS; proliferative endometrium\n(B) LEFT OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy - NO SIGNIFICANT PATHOLOGY`);
  const c3 = createCase(schema, 3);
  assert.equal(c3.parts[2].values.specimenName, 'Right tube and ovary');
  assert.ok(run(c3).diagnosis.includes('(C) RIGHT OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy - NO SIGNIFICANT PATHOLOGY'));
});

test('each endometrium option yields the right diagnosis clause', () => {
  const dx = (endometrium, extra = {}) => run(one({ endometrium, ...extra })).diagnosis;
  assert.equal(dx('Proliferative'), `${TAH} - LEIOMYOMAS; proliferative endometrium`);
  assert.equal(dx('Secretory'), `${TAH} - LEIOMYOMAS; secretory endometrium`);
  assert.equal(dx('Weakly proliferative'), `${TAH} - LEIOMYOMAS; weakly proliferative endometrium`);
  assert.equal(dx('Inactive-atrophic'), `${TAH} - LEIOMYOMAS; inactive, atrophic endometrium`);
  assert.equal(dx('Disordered proliferative'), `${TAH} - LEIOMYOMAS; disordered proliferative endometrium`);
  assert.equal(dx('Endometrial polyp'), `${TAH} - LEIOMYOMAS; ENDOMETRIAL POLYP`);
  // No leiomyoma or adenomyosis: the endometrial phase becomes the capitalised main line.
  assert.equal(dx('Secretory', { leiomyoma: 'Absent' }), `${TAH} - SECRETORY ENDOMETRIUM`);
  const r = run(one({ endometrium: 'Weakly proliferative', leiomyoma: 'Absent' }));
  assert.equal(r.microscopy, 'Sections of the uterus show unremarkable myometrium. The endometrial cavity shows weakly proliferative endometrium without hyperplasia. The cervix shows no evidence of squamous intraepithelial lesion, glandular dysplasia, or malignancy.');
  assert.equal(r.blockKey, '(1-2) Anterior cervix and posterior cervix. (3-4) Anterior and posterior endomyometrium. (5) Lower uterine segment.');
  assert.ok(r.macro.endsWith('Representative sections in 5 blocks.'));
});

test('leiomyoma count, location, degeneration and singular wording', () => {
  // Phase 74: `degeneration` became the `changes` multiselect; a case saved before keeps its sentence.
  const r = run(one({ leiomyomaCount: '1', leiomyomaLocation: 'Subserosal', leiomyomaSize: '2.5', cutSurface: 'Haemorrhagic', changes: ['Red degeneration'] }));
  assert.ok(r.macro.includes('Sectioning shows a single subserosal leiomyoma measuring 2.5 cm with a haemorrhagic cut surface.'));
  assert.ok(r.microscopy.startsWith('Sections of the uterus show a subserosal leiomyoma showing red (haemorrhagic) degeneration with no coagulative necrosis. Mitoses are inconspicuous and there is no cytological atypia.'));
  assert.ok(r.blockKey.includes('(5-7) Leiomyoma.'));
  assert.equal(r.diagnosis, `${TAH} - LEIOMYOMA; proliferative endometrium`);
  const r2 = run(one({ leiomyomaCount: '4', leiomyomaLocation: 'Submucosal', cutSurface: 'Calcified', changes: ['Hyaline degeneration'], adenomyosis: 'Present' }));
  assert.ok(r2.macro.includes('Sectioning shows four submucosal leiomyomas with a gritty, calcified cut surface.'));
  assert.ok(r2.microscopy.includes('Submucosal leiomyomata showing hyaline degeneration with no coagulative necrosis are seen.'));
  assert.ok(run(one({ changes: ['Cystic degeneration'] })).microscopy.includes('showing cystic degeneration'));
  assert.ok(run(one({ changes: ['Calcification'] })).microscopy.includes('showing calcification'));
  const saved = one({ leiomyomaCount: '1', leiomyomaLocation: 'Subserosal', degeneration: 'Red' });
  delete saved.parts[0].values.changes;
  assert.ok(run(saved).microscopy.startsWith('Sections of the uterus show a subserosal leiomyoma showing red (haemorrhagic) degeneration with no coagulative necrosis.'));
});

test('cervix options: cervicitis, nabothian cysts, LSIL and the subtotal uterus without a cervix', () => {
  const r = run(one({ cervix: 'Chronic cervicitis', cervixMacro: 'Nabothian cysts' }));
  assert.ok(r.macro.includes('The cervix shows nabothian cysts.'));
  assert.ok(r.microscopy.endsWith('The cervix shows chronic cervicitis with no evidence of squamous intraepithelial lesion, glandular dysplasia, or malignancy.'));
  assert.equal(r.diagnosis, `${TAH} - LEIOMYOMAS; proliferative endometrium; chronic cervicitis`);
  assert.equal(run(one({ cervix: 'Nabothian cysts' })).diagnosis, `${TAH} - LEIOMYOMAS; proliferative endometrium; nabothian cysts of cervix`);
  const l = run(one({ cervix: 'LSIL' }));
  assert.equal(l.diagnosis, `${TAH} - LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL), cervix; LEIOMYOMAS; proliferative endometrium`);
  assert.ok(l.microscopy.endsWith('The cervix shows a low grade squamous intraepithelial lesion (LSIL). There is no glandular dysplasia or invasive malignancy. There is no evidence of malignancy.'));
  assert.equal(l.comment, '');
  const s = run(one({ specimenName: 'Uterus, subtotal', adenomyosis: 'Present' }));
  assert.equal(s.specimens, 'Uterus, subtotal hysterectomy');
  assert.ok(s.macro.startsWith('Received in formalin is a subtotal hysterectomy specimen.'));
  assert.ok(!s.macro.includes('cervix'));
  assert.equal(s.blockKey, '(1-2) Anterior and posterior endomyometrium. (3-5) Leiomyomas. (6) Lower uterine segment.');
  assert.ok(s.microscopy.endsWith('The endometrial cavity shows proliferative endometrium without hyperplasia. There is no evidence of malignancy.'));
  assert.equal(s.diagnosis, 'UTERUS, subtotal hysterectomy - LEIOMYOMAS; ADENOMYOSIS; proliferative endometrium');
});

test('chronic endometritis and additional notes', () => {
  const r = run(one({ endometritis: 'Present', additionalNotes: 'A small focus of squamous metaplasia is present.' }));
  assert.ok(r.microscopy.includes('Plasma cells are present in the endometrial stroma, in keeping with chronic endometritis.'));
  assert.ok(r.microscopy.endsWith('glandular dysplasia, or malignancy. A small focus of squamous metaplasia is present.'));
  assert.equal(r.diagnosis, `${TAH} - LEIOMYOMAS; proliferative endometrium; chronic endometritis`);
});

test('myomectomy gives the house leiomyoma line', () => {
  const r = run(one({ specimenName: 'Myomectomy', weight: '120', dimensions: '6 x 5 x 4', leiomyomaSize: '6' }));
  assert.equal(r.specimens, 'Myomectomy');
  assert.equal(r.macro, 'Received in formalin is a well-circumscribed firm nodule weighing 120 g and measuring 6 x 5 x 4 cm in aggregate. The nodule measures 6 cm. The cut surface is whorled. Representative sections in 4 blocks.');
  assert.equal(r.blockKey, '(1-4) Leiomyoma, representative sections.');
  assert.equal(r.microscopy, 'Sections show pieces of smooth muscle tumour tissue comprising spindle cells arranged in fascicles and whorls. Thick walled vessels are seen. No epithelioid tumour cells, significant nuclear atypia, coagulative tumour necrosis, or frequent mitoses are observed. There is no evidence of malignancy. Features are those of leiomyoma.');
  assert.equal(r.diagnosis, 'MYOMECTOMY - LEIOMYOMA');
  const m = run(one({ specimenName: 'Myomectomy', leiomyomaCount: '3', changes: ['Hyaline degeneration'], cutSurface: 'Degenerate' }));
  assert.ok(m.macro.startsWith('Received in formalin are three well-circumscribed firm nodules. The cut surface is soft, degenerate.'));
  assert.ok(m.microscopy.includes('Areas of hyaline degeneration are present.'));
  assert.equal(m.diagnosis, 'MYOMECTOMY - LEIOMYOMAS');
});

test('adnexa parts: each finding gives the right capitalised clause', () => {
  const dx = (adnexaFindings, specimenName = 'Right tube and ovary') => run(one({ specimenName, adnexaFindings })).diagnosis;
  const R = 'RIGHT OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy';
  assert.equal(dx(['Unremarkable']), `${R} - NO SIGNIFICANT PATHOLOGY`);
  assert.equal(dx([]), `${R} - NO SIGNIFICANT PATHOLOGY`);
  assert.equal(dx(['Paratubal cyst']), `${R} - PARATUBAL CYST`);
  assert.equal(dx(['Cystic follicle']), `${R} - CYSTIC FOLLICLE, ovary`);
  assert.equal(dx(['Corpus luteum']), `${R} - CORPUS LUTEUM, ovary`);
  assert.equal(dx(['Corpus albicans']), `${R} - corpora albicantia, ovary`);
  assert.equal(dx(['Endometriosis']), `${R} - ENDOMETRIOSIS`);
  assert.equal(dx(['Serous cystadenoma']), `${R} - SEROUS CYSTADENOMA, ovary`);
  assert.equal(dx(['Hydrosalpinx']), `${R} - HYDROSALPINX`);
  assert.equal(dx(['Paratubal cyst', 'Cystic follicle', 'Endometriosis']), `${R} - PARATUBAL CYST; CYSTIC FOLLICLE, ovary; ENDOMETRIOSIS`);
  const r = run(one({ specimenName: 'Right tube and ovary', adnexaFindings: ['Serous cystadenoma', 'Endometriosis', 'Hydrosalpinx'], tubeSize: '6 x 1.5', ovarySize: '5 x 4 x 3', cystSize: '4' }));
  assert.equal(r.macro, 'Received in formalin is a right salpingo-oophorectomy specimen. The fallopian tube measures 6 x 1.5 cm. The ovary measures 5 x 4 x 3 cm. The fallopian tube is cystically dilated to 4 cm. Representative sections in 3 blocks.');
  assert.equal(r.microscopy, 'Sections of the right fallopian tube show unremarkable plicae. The fallopian tube is dilated with attenuated plicae, in keeping with hydrosalpinx. The ovary shows a cyst lined by benign mullerian epithelium, underneath which benign fibrous stroma composed of bland spindle cells is seen. Features are those of a serous cystadenoma. Foci of endometrial glands and stroma with haemosiderin-laden macrophages are present, in keeping with endometriosis. There is no evidence of malignancy.');
  const cl = run(one({ specimenName: 'Left tube and ovary', adnexaFindings: ['Corpus luteum', 'Corpus albicans'], ovarySize: '3 x 2 x 1', cystSize: '2' }));
  assert.ok(cl.macro.includes('The ovary measures 3 x 2 x 1 cm. The ovary contains a thin-walled cyst measuring 2 cm.'));
  assert.ok(cl.microscopy.includes('The ovary shows a corpus luteum and corpora albicantia.'));
});

test('sterilisation tubes and the combined uterus with bilateral adnexa', () => {
  const t = run(one({ specimenName: 'Fallopian tube(s), sterilisation', tubeSize: '1.5 and 1.2' }));
  assert.equal(t.specimens, 'Fallopian tubes, sterilisation');
  assert.equal(t.macro, 'Received in formalin are two segments of fallopian tube measuring 1.5 and 1.2 cm in length. All embedded in 2 blocks.');
  assert.equal(t.blockKey, '(1) Left fallopian tube. (2) Right fallopian tube.');
  assert.equal(t.microscopy, 'Sections show complete cross sections of fallopian tube from both sides with unremarkable plicae. There is no evidence of malignancy.');
  assert.equal(t.diagnosis, 'FALLOPIAN TUBES, bilateral, sterilisation - NO SIGNIFICANT PATHOLOGY');

  const b = run(one({ specimenName: 'Uterus, cervix and bilateral adnexa', weight: '210', adenomyosis: 'Present', tubeSize: '5 x 0.5', ovarySize: '2.5 x 1.5 x 1', adnexaFindings: ['Paratubal cyst'] }));
  assert.equal(b.specimens, 'Uterus, cervix and bilateral adnexa, total hysterectomy and bilateral salpingo-oophorectomy');
  assert.ok(b.macro.startsWith('Received in formalin is a total hysterectomy and bilateral salpingo-oophorectomy specimen weighing 210 g.'));
  assert.ok(b.macro.includes('The fallopian tubes measure up to 5 x 0.5 cm. The ovaries measure up to 2.5 x 1.5 x 1 cm. Representative sections in 14 blocks.'));
  assert.equal(b.blockKey, '(1-2) Anterior cervix and posterior cervix. (3-4) Anterior and posterior endomyometrium. (5-7) Leiomyomas. (8) Lower uterine segment. (9) Left fallopian tube, sectioned. (10-11) Left ovary. (12) Right fallopian tube, sectioned. (13-14) Right ovary.');
  assert.ok(b.microscopy.includes('The cervix shows no evidence of squamous intraepithelial lesion, glandular dysplasia, or malignancy. Sections of the fallopian tubes show unremarkable plicae. A paratubal cyst is seen, with a fibrous wall lined by ciliated tubal-type epithelium. The ovaries are unremarkable. There is no evidence of malignancy.'));
  assert.equal(b.diagnosis, `UTERUS, CERVIX AND BILATERAL ADNEXA, total hysterectomy and bilateral salpingo-oophorectomy - LEIOMYOMAS; ADENOMYOSIS; proliferative endometrium; paratubal cyst`);
  assert.ok(run(one({ specimenName: 'Uterus, cervix and bilateral adnexa' })).diagnosis.endsWith('proliferative endometrium; bilateral tubes and ovaries with no significant pathology'));
});

test('blank size, weight and count fields produce no dangling text', () => {
  const r = run(one({ weight: '', dimensions: '', leiomyomaCount: '', leiomyomaSize: '', endometriumThickness: '', polypSize: '' }));
  assert.equal(r.macro, 'Received in formalin is a total hysterectomy specimen. The serosa is smooth. The cervix is unremarkable. Sectioning shows intramural leiomyomas with a whorled cut surface. Representative sections in 8 blocks.');
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.report.includes('__'));
  assert.ok(!r.report.includes('  '));
  assert.ok(!/\bcm\b/.test(r.macro));
  assert.ok(!/\bg\b/.test(r.macro));
  const a = run(one({ specimenName: 'Left tube and ovary', tubeSize: '', ovarySize: '', cystSize: '', adnexaFindings: ['Paratubal cyst'] }));
  assert.equal(a.macro, 'Received in formalin is a left salpingo-oophorectomy specimen. Representative sections in 3 blocks.');
});

test('one paratubal cyst sentence on adnexa, bilateral adnexa, sterilisation and tube parts', () => {
  // Roadmap card 2026-09-24: ciliated tubal-type lining, as on the tube form; no flattened cuboidal lining.
  const SENTENCE = 'A paratubal cyst is seen, with a fibrous wall lined by ciliated tubal-type epithelium.';
  const cases = [
    one({ specimenName: 'Left tube and ovary', adnexaFindings: ['Paratubal cyst'] }),
    one({ specimenName: 'Uterus, cervix and bilateral adnexa', adnexaFindings: ['Paratubal cyst'] }),
    one({ specimenName: 'Fallopian tube(s), sterilisation', adnexaFindings: ['Paratubal cyst'] }),
    one({ specimenName: gen.LEFT_TUBE, tubeFindings: ['Paratubal cyst'] })
  ];
  for (const c of cases) {
    const m = run(c).microscopy;
    assert.equal(m.split(SENTENCE).length, 2, c.parts[0].values.specimenName);
    assert.doesNotMatch(m, /cuboidal/);
  }
  assert.ok(run(cases[2]).microscopy.startsWith(`Sections show complete cross sections of fallopian tube from both sides with unremarkable plicae. ${SENTENCE}`));
});

test('typed block count and block key override', () => {
  const r = run(one({ blocks: '10' }));
  assert.ok(r.macro.endsWith('Representative sections in 10 blocks.'));
  assert.equal(r.blockKey, '(1-2) Anterior cervix and posterior cervix. (3-4) Anterior and posterior endomyometrium. (5-7) Leiomyomas. (8-10) Lower uterine segment.');
  const o = run(one({ blockKeyText: '(1) Cervix. (2-3) Endomyometrium. (4) Leiomyoma', blocks: '4' }));
  assert.equal(o.blockKey, '(1) Cervix. (2-3) Endomyometrium. (4) Leiomyoma.');
  assert.ok(o.macro.endsWith('Representative sections in 4 blocks.'));
  assert.ok(run(one({ blocks: '1', leiomyoma: 'Absent' })).macro.endsWith('Representative sections in 1 block.'));
});

test('hyperplasia and HSIL options give a short diagnosis line and the QMH cancer template comment', () => {
  const h = run(one({ endometrium: 'Hyperplasia without atypia – see comment', adenomyosis: 'Present' }));
  assert.equal(h.diagnosis, `${TAH} - ENDOMETRIAL HYPERPLASIA WITHOUT ATYPIA; LEIOMYOMAS; ADENOMYOSIS; see comment`);
  assert.ok(h.microscopy.includes('in keeping with endometrial hyperplasia without atypia; see comment.'));
  assert.ok(!h.microscopy.includes('There is no evidence of malignancy'));
  assert.equal(h.comment, 'Endometrial hyperplasia is identified. This benign template does not classify or stage endometrial neoplasia; the QMH endometrial cancer template should be used for the final synoptic report if carcinoma is identified on further sampling.');

  const a = run(one({ endometrium: 'Atypical hyperplasia – see comment', leiomyoma: 'Absent' }));
  assert.equal(a.diagnosis, `${TAH} - ATYPICAL ENDOMETRIAL HYPERPLASIA / ENDOMETRIOID INTRAEPITHELIAL NEOPLASIA; see comment`);
  assert.ok(a.microscopy.includes('in keeping with atypical hyperplasia / endometrioid intraepithelial neoplasia; see comment.'));
  assert.ok(a.comment.startsWith('Endometrial hyperplasia is identified.'));

  const c = run(one({ cervix: 'HSIL – see comment' }));
  assert.equal(c.diagnosis, `${TAH} - HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (HSIL), cervix; LEIOMYOMAS; proliferative endometrium; see comment`);
  assert.ok(c.microscopy.endsWith('The cervix shows a high grade squamous intraepithelial lesion (HSIL); see comment.'));
  assert.equal(c.comment, 'A high grade squamous intraepithelial lesion is identified in the cervix. This benign template does not report margins or invasion; the cervix should be entirely embedded and the QMH cervix cancer template used if invasive carcinoma is identified.');

  const two = createCase(schema, 2);
  two.parts[1].values = { ...two.parts[1].values, specimenName: 'Uterus and cervix, total hysterectomy', cervix: 'HSIL – see comment' };
  assert.ok(run(two).comment.includes('in the cervix (part B).'));
});

// ---------- Phase 74 (23 October 2026): attached tubes and ovaries, leiomyoma assessment ----------

const field = (id) => schema.fields.find((f) => f.id === id);
const shown = (values) => schema.fields.filter((f) => isVisible(f, { ...createCase(schema, 1).parts[0].values, ...values })).map((f) => f.id);
const preset = (line, history = '') => presetValues(schema, parseIntake(line).parts[0], { history });

test('attached tubes and ovaries: a hysterectomy option that opens None and brings the adnexal fields', () => {
  const f = field('attachedAdnexa');
  assert.deepEqual(f.options, ['None', 'Bilateral tubes and ovaries', 'Bilateral tubes', 'Left tube and ovary', 'Right tube and ovary']);
  assert.equal(f.default, 'None');
  assert.deepEqual(schema.layout.macroFields, ['specimenName', 'attachedAdnexa', 'paratubalSide']);
  assert.ok(shown({}).includes('attachedAdnexa'));
  assert.ok(shown({ specimenName: 'Uterus, subtotal' }).includes('attachedAdnexa'));
  for (const s of ['Uterus, cervix and bilateral adnexa', 'Myomectomy', 'Left tube and ovary']) assert.ok(!shown({ specimenName: s }).includes('attachedAdnexa'), s);
  assert.ok(!shown({}).some((id) => ['tubeSize', 'ovarySize', 'adnexaFindings', 'tubeFindings'].includes(id)));
  for (const id of ['tubeSize', 'ovarySize', 'cystSize', 'adnexaFindings']) assert.ok(shown({ attachedAdnexa: 'Left tube and ovary' }).includes(id), id);
  const tubes = shown({ attachedAdnexa: 'Bilateral tubes' });
  assert.ok(tubes.includes('tubeFindings') && tubes.includes('tubeSize') && !tubes.includes('ovarySize') && !tubes.includes('adnexaFindings'));
});

test('attached left tube and ovary: name, macro, block key, microscopy and diagnosis', () => {
  const r = run(one({ attachedAdnexa: 'Left tube and ovary', tubeSize: '5 x 0.6', ovarySize: '3 x 2 x 1.5' }));
  assert.equal(r.specimens, 'Uterus, cervix, left fallopian tube and ovary, total hysterectomy and left salpingo-oophorectomy');
  assert.equal(r.macro, 'Received in formalin is a total hysterectomy and left salpingo-oophorectomy specimen. The serosa is smooth. The cervix is unremarkable. Sectioning shows intramural leiomyomas with a whorled cut surface. The left fallopian tube measures 5 x 0.6 cm. The left ovary measures 3 x 2 x 1.5 cm with an unremarkable cut surface. Representative sections in 11 blocks.');
  assert.equal(r.blockKey, '(1-2) Anterior cervix and posterior cervix. (3-4) Anterior and posterior endomyometrium. (5-7) Leiomyomas. (8) Lower uterine segment. (9) Left fallopian tube, sectioned. (10-11) Left ovary.');
  assert.ok(r.microscopy.endsWith('glandular dysplasia, or malignancy. Sections of the left fallopian tube and ovary show no significant pathology. There is no evidence of malignancy.'));
  assert.equal(r.diagnosis, 'UTERUS, CERVIX, LEFT FALLOPIAN TUBE AND OVARY, total hysterectomy and left salpingo-oophorectomy - LEIOMYOMAS; proliferative endometrium; left tube and ovary with no significant pathology');
  const p = run(one({ attachedAdnexa: 'Right tube and ovary', adnexaFindings: ['Paratubal cyst'] }));
  assert.ok(p.diagnosis.endsWith('- LEIOMYOMAS; proliferative endometrium; paratubal cyst'));
  assert.ok(p.blockKey.endsWith('(9) Right fallopian tube, sectioned. (10-11) Right ovary.'));
});

test('attached bilateral tubes and ovaries read as the combined specimen; bilateral tubes and the subtotal uterus', () => {
  const both = { weight: '210', adenomyosis: 'Present', tubeSize: '5 x 0.5', ovarySize: '2.5 x 1.5 x 1', adnexaFindings: ['Paratubal cyst'] };
  const a = run(one({ ...both, attachedAdnexa: 'Bilateral tubes and ovaries' }));
  const b = run(one({ ...both, specimenName: 'Uterus, cervix and bilateral adnexa' }));
  for (const k of ['specimens', 'macro', 'blockKey', 'microscopy', 'diagnosis', 'comment']) assert.equal(a[k], b[k], k);
  const t = run(one({ attachedAdnexa: 'Bilateral tubes', tubeSize: 'right 5 x 0.6, left 4.5 x 0.5', tubeFindings: ['Hydrosalpinx'] }));
  assert.equal(t.specimens, 'Uterus, cervix and bilateral fallopian tubes, total hysterectomy and bilateral salpingectomy');
  assert.ok(t.macro.includes('The right fallopian tube measures 5 x 0.6 cm and the left fallopian tube 4.5 x 0.5 cm.'));
  assert.ok(t.blockKey.endsWith('(8) Lower uterine segment. (9) Left fallopian tube, sectioned. (10) Right fallopian tube, sectioned.'));
  assert.ok(t.microscopy.includes('Sections show fimbrial tissue and cross sections of both fallopian tubes. The fallopian tube is dilated with attenuated plicae, in keeping with hydrosalpinx. There is no evidence of malignancy.'));
  assert.equal(t.diagnosis, 'UTERUS, CERVIX AND BILATERAL FALLOPIAN TUBES, total hysterectomy and bilateral salpingectomy - LEIOMYOMAS; proliferative endometrium; hydrosalpinx');
  assert.ok(run(one({ attachedAdnexa: 'Bilateral tubes' })).microscopy.endsWith('Sections of the fallopian tubes show no significant pathology. There is no evidence of malignancy.'));
  const s = run(one({ specimenName: 'Uterus, subtotal', attachedAdnexa: 'Bilateral tubes and ovaries', leiomyoma: 'Absent' }));
  assert.equal(s.specimens, 'Uterus and bilateral adnexa, subtotal hysterectomy and bilateral salpingo-oophorectomy');
  assert.equal(s.diagnosis, 'UTERUS AND BILATERAL ADNEXA, subtotal hysterectomy and bilateral salpingo-oophorectomy - PROLIFERATIVE ENDOMETRIUM; bilateral tubes and ovaries with no significant pathology');
  // A hidden attached value on another specimen type prints nothing.
  assert.equal(run(one({ specimenName: 'Myomectomy', attachedAdnexa: 'Left tube and ovary' })).diagnosis, 'MYOMECTOMY - LEIOMYOMA');
});

test('leiomyoma assessment: the fields open on a usual leiomyoma and print nothing new', () => {
  assert.equal(field('leiomyoma').default, 'Absent');
  assert.deepEqual(field('leiomyoma').defaultByField, { field: 'specimenName', map: { Myomectomy: 'Present' } });
  assert.ok(!schema.fields.some((f) => f.id === 'degeneration'));
  assert.deepEqual(field('changes').options, ['Hyaline degeneration', 'Hydropic change', 'Myxoid change', 'Cystic degeneration', 'Red degeneration', 'Infarct-type necrosis', 'Calcification']);
  assert.equal(field('leiomyomaType').options.length, 14);
  const ids = ['leiomyomaType', 'changes', 'atypia', 'mitoticCount', 'tumourNecrosis', 'fhIhc'];
  for (const id of ids) assert.ok(!shown({}).includes(id), id);
  for (const id of ids) assert.ok(shown(LM).includes(id) && shown({ ...LM, specimenName: 'Myomectomy' }).includes(id), id);
  assert.ok(!shown({ ...LM, specimenName: 'Left tube and ovary' }).includes('leiomyomaType'));
});

test('leiomyoma types: diagnosis line, microscopy and the house myomectomy sentence', () => {
  const dx = (values) => run(one(values)).diagnosis.replace(/^.*? - /, '');
  const myo = (values) => run(one({ specimenName: 'Myomectomy', ...values }));
  assert.equal(dx({ leiomyomaType: 'Cellular' }), 'CELLULAR LEIOMYOMAS; proliferative endometrium');
  assert.equal(dx({ leiomyomaType: 'With bizarre nuclei', leiomyomaCount: '1' }), 'LEIOMYOMA with BIZARRE NUCLEI; proliferative endometrium');
  assert.equal(dx({ leiomyomaType: 'Lipoleiomyoma', leiomyomaCount: '1' }), 'LIPOLEIOMYOMA; proliferative endometrium');
  assert.equal(dx({ leiomyomaType: 'Apoplectic' }), 'LEIOMYOMAS with APOPLECTIC CHANGE; proliferative endometrium');
  assert.equal(dx({ changes: ['Infarct-type necrosis'], leiomyomaCount: '1' }), 'LEIOMYOMA with INFARCT-TYPE NECROSIS; proliferative endometrium');
  const inf = run(one({ changes: ['Hyaline degeneration', 'Infarct-type necrosis'] }));
  assert.ok(inf.microscopy.startsWith('Sections of the uterus show intramural leiomyomata showing hyaline degeneration. Areas of infarct-type necrosis are present, with no coagulative tumour cell necrosis. Mitoses are inconspicuous and there is no cytological atypia.'));
  assert.ok(run(one({ leiomyomaType: 'Mitotically active', mitoticCount: '12' })).microscopy.includes('Mitoses number 12 per 10 HPF and there is no cytological atypia.'));
  assert.ok(run(one({ leiomyomaType: 'Mitotically active', mitoticCount: '4/mm2' })).microscopy.includes('Mitoses number 4 per mm2'));
  const c = myo({ leiomyomaType: 'Cellular' });
  assert.ok(c.microscopy.includes('While the tumour cellularity is high, no epithelioid tumour cells, significant nuclear atypia, coagulative tumour necrosis, or frequent mitoses are observed. There is no evidence of malignancy. Features are those of cellular leiomyoma.'));
  assert.equal(c.diagnosis, 'MYOMECTOMY - CELLULAR LEIOMYOMA');
  assert.ok(myo({ leiomyomaType: 'Epithelioid' }).microscopy.includes('No significant nuclear atypia, coagulative tumour necrosis, or frequent mitoses are observed.'));
  for (const t of field('leiomyomaType').options) {
    for (const r of [run(one({ leiomyomaType: t })), myo({ leiomyomaType: t })]) {
      assert.ok(!/undefined|  |\.\./.test(r.report), t);
      assert.equal(/see comment/.test(r.diagnosis), /see comment/.test(t), t);
    }
  }
});

test('STUMP: leads the diagnosis, no malignancy sentence, and a comment with the features recorded', () => {
  const r = run(one({ attachedAdnexa: 'Bilateral tubes', leiomyomaCount: '1', leiomyomaType: 'STUMP – see comment', atypia: 'Focal moderate to severe', mitoticCount: '6' }));
  assert.equal(r.diagnosis, 'UTERUS, CERVIX AND BILATERAL FALLOPIAN TUBES, total hysterectomy and bilateral salpingectomy - SMOOTH MUSCLE TUMOUR OF UNCERTAIN MALIGNANT POTENTIAL (STUMP); proliferative endometrium; bilateral fallopian tubes with no significant pathology; see comment');
  assert.ok(r.microscopy.startsWith('Sections of the uterus show an intramural smooth muscle tumour composed of intersecting fascicles of spindle cells. There is focal moderate to severe cytological atypia. Mitoses number 6 per 10 HPF. There is no coagulative tumour cell necrosis. The features are those of a smooth muscle tumour of uncertain malignant potential (STUMP); see comment.'));
  assert.ok(!r.microscopy.includes('There is no evidence of malignancy'));
  assert.equal(r.comment, 'The smooth muscle tumour shows focal moderate to severe cytological atypia and a mitotic count of 6 per 10 HPF, with no coagulative tumour cell necrosis. Clinical follow-up is suggested.');
  const m = run(one({ specimenName: 'Myomectomy', leiomyomaType: 'STUMP – see comment', tumourNecrosis: 'Present' }));
  assert.equal(m.diagnosis, 'MYOMECTOMY - SMOOTH MUSCLE TUMOUR OF UNCERTAIN MALIGNANT POTENTIAL (STUMP); see comment');
  assert.ok(m.microscopy.endsWith('Coagulative tumour cell necrosis is present. No epithelioid tumour cells, significant nuclear atypia, or frequent mitoses are observed. The features are those of a smooth muscle tumour of uncertain malignant potential (STUMP); see comment.'));
  assert.equal(m.comment, 'The smooth muscle tumour shows coagulative tumour cell necrosis, with no significant cytological atypia or increased mitotic activity. Clinical follow-up is suggested.');
  const two = createCase(schema, 2);
  two.parts[1].values = { ...two.parts[1].values, specimenName: 'Myomectomy', leiomyoma: 'Present', leiomyomaType: 'STUMP – see comment', atypia: 'Mild' };
  assert.ok(run(two).comment.startsWith('(B) The smooth muscle tumour shows mild cytological atypia'));
});

test('fumarate hydratase-deficient leiomyoma and intravenous leiomyomatosis: sentence and comment', () => {
  const f = run(one({ specimenName: 'Myomectomy', leiomyomaType: 'Fumarate hydratase-deficient – see comment', fhIhc: 'Lost' }));
  assert.equal(f.diagnosis, 'MYOMECTOMY - FUMARATE HYDRATASE-DEFICIENT LEIOMYOMA; see comment');
  assert.ok(f.microscopy.includes('or frequent mitoses are observed. Immunohistochemistry shows loss of fumarate hydratase expression in the tumour cells, with retained staining in the vessels. There is no evidence of malignancy. Features are those of fumarate hydratase-deficient leiomyoma; see comment.'));
  assert.equal(f.comment, 'The leiomyoma shows the morphological features of fumarate hydratase deficiency, with loss of fumarate hydratase expression on immunohistochemistry. Referral for genetic counselling is suggested, to assess for hereditary leiomyomatosis and renal cell carcinoma (HLRCC) syndrome.');
  const i = run(one({ leiomyomaType: 'Intravenous leiomyomatosis – see comment' }));
  assert.equal(i.diagnosis, `${TAH} - INTRAVENOUS LEIOMYOMATOSIS; proliferative endometrium; see comment`);
  assert.ok(i.microscopy.includes('Bland smooth muscle tumour is also present within vascular spaces, in keeping with intravenous leiomyomatosis; see comment.'));
  assert.equal(i.comment, 'Correlation with the operative and imaging findings is suggested, to assess for extension beyond the uterus.');
  assert.equal(run(one({})).comment, '');
});

test('leiomyoma checks: shown beside the report, never printed', () => {
  const issues = (values) => run(one(values)).issues.map((x) => x.field);
  assert.deepEqual(issues({}), []);
  assert.deepEqual(issues({ leiomyoma: 'Absent', tumourNecrosis: 'Present' }), []);
  assert.deepEqual(issues({ leiomyomaType: 'STUMP – see comment' }), ['atypia']);
  assert.deepEqual(issues({ tumourNecrosis: 'Present' }), ['tumourNecrosis']);
  assert.deepEqual(issues({ atypia: 'Diffuse moderate to severe' }), ['atypia']);
  assert.deepEqual(issues({ leiomyomaType: 'With bizarre nuclei', atypia: 'Diffuse moderate to severe' }), []);
  assert.deepEqual(issues({ leiomyomaType: 'Mitotically active' }), ['mitoticCount']);
  assert.deepEqual(issues({ leiomyomaType: 'Fumarate hydratase-deficient – see comment' }), ['fhIhc']);
  assert.deepEqual(issues({ fhIhc: 'Lost' }), ['leiomyomaType']);
  assert.ok(!run(one({ tumourNecrosis: 'Present' })).report.includes('consider'));
});

test('intake: attached tubes and ovaries and the leiomyoma are read from the specimen line and history', () => {
  const TOTAL = 'Uterus and cervix, total hysterectomy';
  assert.deepEqual(preset('Uterus, cervix, left tube and ovary'), { specimenName: TOTAL, attachedAdnexa: 'Left tube and ovary' });
  assert.deepEqual(preset('Uterus and cervix with bilateral tubes'), { attachedAdnexa: 'Bilateral tubes' });
  assert.deepEqual(preset('Uterus, subtotal hysterectomy and right salpingo-oophorectomy'), { specimenName: 'Uterus, subtotal', attachedAdnexa: 'Right tube and ovary' });
  assert.equal(preset('Uterus, both ovaries and tubes').attachedAdnexa, 'Bilateral tubes and ovaries');
  assert.equal(preset('Uterus, cervix and bilateral adnexa, TAH BSO').specimenName, 'Uterus, cervix and bilateral adnexa');
  assert.deepEqual(preset('Myomectomy'), { specimenName: 'Myomectomy', leiomyoma: 'Present' });
  assert.equal(preset('Uterus', 'Fibroids, menorrhagia').leiomyoma, 'Present');
  assert.equal(preset('Uterus, fibroids').leiomyoma, 'Present');
  assert.deepEqual(preset(TOTAL), { specimenName: TOTAL });
  assert.deepEqual(preset('Left tube and ovary'), { specimenName: 'Left tube and ovary' });
  assert.deepEqual(schema.partDefaults, [{ specimenName: TOTAL }, { specimenName: 'Left tube and ovary' }, { specimenName: 'Right tube and ovary' }]);
});

// ---------- Phase 74 (23 October 2026): tube lesions on the uterus form's tube and adnexa parts ----------

const STIC_OPT = 'STIC – see comment';
const tubePart = (values) => run(one({ leiomyoma: 'Absent', ...values })).report;

test('tube lesions: the options follow the benign findings on both lists; the stains show only with a lesion', () => {
  const opts = (id) => schema.fields.find((f) => f.id === id).options;
  assert.deepEqual(opts('tubeFindings').slice(-3), ['p53 signature', 'STIL', STIC_OPT]);
  assert.deepEqual(opts('adnexaFindings').slice(-3), ['p53 signature', 'STIL', STIC_OPT]);
  const p53 = schema.fields.find((f) => f.id === 'p53Pattern');
  const base = createCase(schema, 1).parts[0].values;
  assert.equal(isVisible(p53, base), false);
  assert.equal(isVisible(p53, { ...base, specimenName: 'Left fallopian tube, salpingectomy', tubeFindings: ['p53 signature'] }), true);
  assert.equal(isVisible(p53, { ...base, attachedAdnexa: 'Left tube and ovary', adnexaFindings: [STIC_OPT] }), true);
});

test('tube lesions: a salpingectomy part reads the lesion, the stains and the closer; the diagnosis leads with it', () => {
  const r = tubePart({ specimenName: 'Left fallopian tube, salpingectomy', tubeFindings: ['p53 signature'], p53Pattern: 'Aberrant – overexpression', ki67: 'Low' });
  assert.match(r, /The features are those of a p53 signature\./);
  assert.match(r, /There is no evidence of STIC or invasive malignancy\./);
  assert.match(r, / - p53 SIGNATURE; NO EVIDENCE OF MALIGNANCY/);
  const stic = tubePart({ specimenName: 'Left fallopian tube, salpingectomy', tubeFindings: [STIC_OPT], p53Pattern: 'Aberrant – null', ki67: 'Increased' });
  assert.match(stic, / - SEROUS TUBAL INTRAEPITHELIAL CARCINOMA \(STIC\); see comment/);
  assert.match(stic, /Discussion at the gynaecological oncology multidisciplinary team meeting is suggested\./);
  assert.doesNotMatch(stic, /There is no evidence of (STIC|malignancy)/);
  // Without a lesion the tube part reads exactly as before.
  assert.match(tubePart({ specimenName: 'Left fallopian tube, salpingectomy' }), /unremarkable plicae\. There is no evidence of malignancy\./);
});

test('tube lesions: an attached tube puts a STIC first, a STIL in the capitals and a p53 signature with the benign findings', () => {
  const total = { specimenName: 'Uterus and cervix, total hysterectomy' };
  const stic = tubePart({ ...total, attachedAdnexa: 'Left tube and ovary', adnexaFindings: [STIC_OPT] });
  assert.match(stic, /UTERUS, CERVIX, LEFT FALLOPIAN TUBE AND OVARY, total hysterectomy and left salpingo-oophorectomy - SEROUS TUBAL INTRAEPITHELIAL CARCINOMA \(STIC\), left fallopian tube; proliferative endometrium; see comment/);
  assert.match(stic, /Serous tubal intraepithelial carcinoma \(STIC\) is identified\./);
  const stil = tubePart({ ...total, attachedAdnexa: 'Bilateral tubes', tubeFindings: ['STIL'] });
  assert.match(stil, / - SEROUS TUBAL INTRAEPITHELIAL LESION \(STIL\), fallopian tube; proliferative endometrium/);
  assert.match(stil, /There is no evidence of STIC or invasive malignancy\./);
  const p53 = tubePart({ ...total, attachedAdnexa: 'Left tube and ovary', adnexaFindings: ['p53 signature'] });
  assert.match(p53, / - PROLIFERATIVE ENDOMETRIUM; p53 signature, left fallopian tube$/m);
  assert.doesNotMatch(p53, /no significant pathology/);
});

test('tube lesions: checks for the stains, shown beside the report', () => {
  const issues = (values) => run(one({ leiomyoma: 'Absent', ...values })).issues.map((x) => x.field);
  assert.deepEqual(issues({ specimenName: 'Left fallopian tube, salpingectomy', tubeFindings: ['p53 signature'] }), ['p53Pattern']);
  assert.deepEqual(issues({ specimenName: 'Left fallopian tube, salpingectomy', tubeFindings: ['p53 signature'], p53Pattern: 'Aberrant – overexpression', ki67: 'Low' }), []);
  assert.deepEqual(issues({ specimenName: 'Left fallopian tube, salpingectomy' }), []);
});
