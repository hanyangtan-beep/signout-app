// Phase 4b: uterus (benign hysterectomy / myomectomy +/- adnexa) template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/uterus.js';
import { sizePhrase, thicknessPhrase, weightPhrase, blockCount } from '../generators/uterus.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('uterus_benign');
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
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
  assert.equal(blockCount(createCase(schema, 1).parts[0].values), 8);
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
  const r = run(createCase(schema, 1));
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
  const r = run(one({ leiomyomaCount: '1', leiomyomaLocation: 'Subserosal', leiomyomaSize: '2.5', cutSurface: 'Haemorrhagic', degeneration: 'Red' }));
  assert.ok(r.macro.includes('Sectioning shows a single subserosal leiomyoma measuring 2.5 cm with a haemorrhagic cut surface.'));
  assert.ok(r.microscopy.startsWith('Sections of the uterus show a subserosal leiomyoma showing red (haemorrhagic) degeneration with no coagulative necrosis. Mitoses are inconspicuous and there is no cytological atypia.'));
  assert.ok(r.blockKey.includes('(5-7) Leiomyoma.'));
  assert.equal(r.diagnosis, `${TAH} - LEIOMYOMA; proliferative endometrium`);
  const r2 = run(one({ leiomyomaCount: '4', leiomyomaLocation: 'Submucosal', cutSurface: 'Calcified', degeneration: 'Hyaline', adenomyosis: 'Present' }));
  assert.ok(r2.macro.includes('Sectioning shows four submucosal leiomyomas with a gritty, calcified cut surface.'));
  assert.ok(r2.microscopy.includes('Submucosal leiomyomata showing hyaline degeneration with no coagulative necrosis are seen.'));
  assert.ok(run(one({ degeneration: 'Cystic' })).microscopy.includes('showing cystic degeneration'));
  assert.ok(run(one({ degeneration: 'Calcific' })).microscopy.includes('showing calcification'));
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
  const m = run(one({ specimenName: 'Myomectomy', leiomyomaCount: '3', degeneration: 'Hyaline', cutSurface: 'Degenerate' }));
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
