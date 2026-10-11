// Phase 4b: ovarian cyst / cystectomy / benign adnexa template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/ovary.js';
import { sizePhrase, wallPhrase, totalBlocks, diagnosisHeader } from '../generators/ovary.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('ovarian_cyst');
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  Object.assign(c.options, options);
  return c;
};

const ENDO_MICRO = 'Sections show a cyst wall lined by endometrial-type glandular epithelium with underlying endometrial-type stroma, accompanied by old haemorrhage and abundant haemosiderin-laden macrophages within the fibrotic wall. Ovarian stroma is noted in the periphery. Features are those of an endometriotic cyst. There is no evidence of malignancy.';

test('metadata: benign gynae resection with search aliases and complete defaults', () => {
  assert.equal(schema.id, 'ovarian_cyst');
  assert.equal(schema.generator, 'ovary');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Gynae');
  assert.equal(schema.label, 'Ovarian cyst');
  assert.equal(schema.organ, 'OVARY');
  assert.equal(schema.rank, 28);
  assert.equal(schema.version, '2026.09');
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['ovary', 'cystectomy', 'endometrioma', 'chocolate cyst', 'dermoid', 'teratoma', 'paratubal', 'torsion', 'fibroma']) assert.ok(schema.aliases.includes(a), `alias ${a}`);
  assert.equal(schema.maxParts, 3);
  assert.equal(schema.defaultParts, 1);
  assert.deepEqual(schema.style, { british: true });
  for (const f of schema.fields) {
    assert.ok('default' in f, `${f.id} has a default`);
    assert.ok(f.id && f.label && f.type, `${f.id} has id/label/type`);
  }
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is a field`);
  for (const id of ids) assert.ok(id in schema.example.parts[0].values, `example has ${id}`);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  assert.deepEqual(macroFields, ['receivedState', 'dimensions', 'cystSize', 'wallThickness', 'contents', 'lining', 'liningDescription', 'tube', 'tubeLength', 'blocks']);
  // grouped fields are consecutive
  const idx = schema.fields.map((f, i) => (f.group === 'Macroscopy' ? i : -1)).filter((i) => i >= 0);
  assert.equal(idx[idx.length - 1] - idx[0] + 1, idx.length);
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  const ct = schema.fields.find((f) => f.id === 'cystType');
  assert.equal(ct.options.length, 13);
  assert.equal(ct.default, 'Endometriotic cyst');
  assert.equal(schema.fields.find((f) => f.id === 'blocks').default, '4');
});

test('helpers: size, wall and block-count phrases', () => {
  assert.equal(sizePhrase('5x4.5x3'), '5 x 4.5 x 3 cm');
  assert.equal(sizePhrase('5 X 4 × 3 cm'), '5 x 4 x 3 cm');
  assert.equal(sizePhrase(''), '');
  assert.equal(wallPhrase('0.2 cm'), '0.2 cm');
  assert.equal(wallPhrase('2mm'), '2 mm');
  assert.equal(wallPhrase('3'), '3 mm');
  assert.equal(wallPhrase('0.4'), '0.4 cm');
  assert.equal(wallPhrase(''), '');
  assert.equal(totalBlocks({ blocks: '4', tube: 'Not included' }), 4);
  assert.equal(totalBlocks({ blocks: '4', tube: 'Unremarkable' }), 5);
  assert.equal(totalBlocks({ blocks: '', tube: 'Not included' }), 4);
});

test('example: right ovarian cystectomy, intact 5 cm endometriotic cyst', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Right ovarian cyst, cystectomy');
  assert.equal(r.macro, 'Received in formalin is an intact right ovarian cyst measuring 5 x 4.5 x 3 cm. The cyst measures 5 cm in maximum dimension. The cyst wall measures up to 0.2 cm in thickness. It contains chocolate-brown fluid. The inner lining is smooth. Representative sections in 4 blocks.');
  assert.equal(r.blockKey, '(1-3) Cyst wall. (4) Ovarian parenchyma.');
  assert.equal(r.microscopy, ENDO_MICRO);
  assert.equal(r.diagnosis, 'OVARY, right ovarian cyst, cystectomy - ENDOMETRIOTIC CYST');
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('(A)'));
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.diagnosis.endsWith('.'));
});

test('default single part is a right ovarian cystectomy with an endometriotic cyst', () => {
  const r = run(createCase(schema, 1));
  assert.equal(r.specimens, 'Right ovarian cyst, cystectomy');
  assert.equal(r.macro, 'Received in formalin is an intact right ovarian cyst. It contains chocolate-brown fluid. The inner lining is smooth. Representative sections in 4 blocks.');
  assert.equal(r.blockKey, '(1-3) Cyst wall. (4) Ovarian parenchyma.');
  assert.equal(r.microscopy, ENDO_MICRO);
  assert.equal(r.diagnosis, 'OVARY, right ovarian cyst, cystectomy - ENDOMETRIOTIC CYST');
});

test('macro option off removes the macroscopic description and block key', () => {
  const r = run(one({}, { macro: false }));
  assert.equal(r.macro, '');
  assert.equal(r.blockKey, '');
  assert.ok(!r.report.includes('Received in formalin'));
  assert.ok(!r.report.includes('Cyst wall.'));
  assert.ok(r.report.startsWith('Right ovarian cyst, cystectomy\n\nSections show'));
});

test('headers option labels the macro and block key blocks', () => {
  const r = run(one({}, { includeHeader: true }));
  assert.ok(r.report.includes('MACROSCOPIC DESCRIPTION:\nReceived in formalin'));
  assert.ok(r.report.includes('BLOCK KEY:\n(1-3) Cyst wall. (4) Ovarian parenchyma.'));
});

test('two-part case keeps (A)/(B) prefixes on every block; salpingo-oophorectomy adds the tube block', () => {
  const c = createCase(schema, 2);
  c.parts[1].values = {
    ...c.parts[1].values,
    side: 'Left', procedure: 'Salpingo-oophorectomy', tube: 'Unremarkable', tubeLength: '6',
    dimensions: '7x6x4', cystSize: '6', contents: 'Serous fluid', cystType: 'Serous cystadenoma'
  };
  const r = run(c);
  assert.equal(r.specimens, '(A) Right ovarian cyst, cystectomy\n(B) Left ovary and fallopian tube, salpingo-oophorectomy');
  assert.ok(r.macro.startsWith('(A) Received in formalin is an intact right ovarian cyst.'));
  assert.ok(r.macro.includes('\n\n(B) Received in formalin is a left ovary with attached fallopian tube measuring 7 x 6 x 4 cm. On sectioning, the ovary contains a cyst measuring 6 cm in maximum dimension. It contains thin serous fluid. The inner lining is smooth. The attached fallopian tube measuring 6 cm in length is unremarkable. Representative sections in 5 blocks.'));
  assert.equal(r.blockKey, '(A) (1-3) Cyst wall. (4) Ovarian parenchyma.\n(B) (1-3) Cyst wall. (4) Ovarian parenchyma. (5) Fallopian tube.');
  assert.ok(r.microscopy.startsWith('(A) Sections show a cyst wall'));
  assert.ok(r.microscopy.includes('\n\n(B) Sections of the ovary show a cyst lined by benign mullerian epithelium, underneath which benign fibrous stroma composed of bland spindle cells is seen. Ovarian stroma is noted in the periphery. Features are those of a serous cystadenoma. The fallopian tube is unremarkable. There is no evidence of borderline features or malignancy.'));
  assert.equal(r.diagnosis.split('\n')[0], '(A) OVARY, right ovarian cyst, cystectomy - ENDOMETRIOTIC CYST');
  assert.equal(r.diagnosis.split('\n')[1], '(B) LEFT OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy - SEROUS CYSTADENOMA; no evidence of borderline features or malignancy');
});

test('each cyst type yields the right capitalised diagnosis', () => {
  const dx = (cystType) => run(one({ cystType })).diagnosis;
  const H = 'OVARY, right ovarian cyst, cystectomy - ';
  assert.equal(dx('Endometriotic cyst'), `${H}ENDOMETRIOTIC CYST`);
  assert.equal(dx('Burnt-out endometriotic cyst (haemorrhagic cyst)'), `${H}BENIGN HAEMORRHAGIC CYST, in keeping with burnt-out ENDOMETRIOTIC CYST`);
  assert.equal(dx('Haemorrhagic corpus luteum cyst'), `${H}HAEMORRHAGIC CORPUS LUTEUM CYST`);
  assert.equal(dx('Follicular cyst'), `${H}FOLLICULAR CYST`);
  assert.equal(dx('Simple cyst'), `${H}BENIGN SIMPLE CYST`);
  assert.equal(dx('Serous cystadenoma'), `${H}SEROUS CYSTADENOMA; no evidence of borderline features or malignancy`);
  assert.equal(dx('Mucinous cystadenoma'), `${H}MUCINOUS CYSTADENOMA; no evidence of borderline features or malignancy`);
  assert.equal(dx('Seromucinous cystadenoma'), `${H}SEROMUCINOUS CYSTADENOMA; no evidence of borderline features or malignancy`);
  assert.equal(dx('Mature cystic teratoma'), `${H}MATURE CYSTIC TERATOMA; no immature elements`);
  assert.equal(dx('Fibroma'), `${H}FIBROMA`);
  assert.equal(dx('Paratubal cyst'), 'ADNEXA, right paratubal cyst, cystectomy - PARATUBAL CYST');
  assert.equal(dx('Borderline tumour – see comment'), `${H}BORDERLINE TUMOUR; see comment`);
  assert.equal(dx('Carcinoma – see comment'), `${H}CARCINOMA; see comment`);
});

test('diagnosis header follows side and procedure', () => {
  assert.equal(diagnosisHeader({ side: 'Left', procedure: 'Oophorectomy' }), 'LEFT OVARY, oophorectomy');
  assert.equal(diagnosisHeader({ side: 'Left', procedure: 'Oophorectomy', tube: 'Unremarkable' }), 'LEFT OVARY AND FALLOPIAN TUBE, oophorectomy');
  assert.equal(diagnosisHeader({ side: 'Not stated', procedure: 'Cystectomy' }), 'OVARY, ovarian cyst, cystectomy');
  assert.equal(diagnosisHeader({ side: 'Not stated', procedure: 'Salpingo-oophorectomy' }), 'OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy');
  assert.equal(diagnosisHeader({ side: 'Right', procedure: 'Cyst wall, excision' }), 'OVARY, right ovarian cyst wall, excision');
  const r = run(one({ side: 'Not stated' }));
  assert.equal(r.specimens, 'Ovarian cyst, cystectomy');
  assert.ok(r.macro.startsWith('Received in formalin is an intact ovarian cyst.'));
  assert.equal(run(one({ specimenName: 'Right adnexal cyst, laparoscopic cystectomy' })).specimens, 'Right adnexal cyst, laparoscopic cystectomy');
});

test('burnt-out endometriotic cyst uses the house paragraph verbatim', () => {
  const r = run(one({ cystType: 'Burnt-out endometriotic cyst (haemorrhagic cyst)' }));
  assert.equal(r.microscopy, 'Sections show a fibrocollagenous cyst wall with extensive old haemorrhage, abundant haemosiderin-laden macrophages, and focal chronic inflammation. The lining epithelium is largely absent. No definite viable endometrial glands are identified. Ovarian stroma is noted in the periphery. No epithelial atypia or malignancy is seen. These features are those of a benign haemorrhagic cyst, in keeping with a burnt-out endometriotic cyst.');
  assert.ok(!r.microscopy.includes('There is no evidence of malignancy.'));
});

test('cystadenoma closers and papillary excrescences; teratoma closer', () => {
  const m = run(one({ cystType: 'Mucinous cystadenoma', contents: 'Mucinous material', lining: 'Papillary excrescences – describe', liningDescription: 'a 0.5 cm cluster of papillary excrescences' }));
  assert.ok(m.macro.includes('It contains thick mucinous material. The inner lining shows a 0.5 cm cluster of papillary excrescences.'));
  assert.equal(m.microscopy, 'Sections show a cyst lined by a single layer of bland mucinous columnar epithelium with basally located nuclei and no significant stratification or atypia, underneath which benign fibrous stroma is seen. The papillary excrescences seen macroscopically are lined by the same single layer of bland epithelium without stratification, tufting or atypia. Ovarian stroma is noted in the periphery. Features are those of a mucinous cystadenoma. There is no evidence of borderline features or malignancy.');
  assert.ok(run(one({ lining: 'Papillary excrescences – describe' })).macro.includes('The inner lining shows papillary excrescences.'));
  assert.ok(run(one({ lining: 'Solid areas – describe', liningDescription: 'A 1 cm firm white solid area' })).macro.includes('The inner lining shows a 1 cm firm white solid area.'));

  const t = run(one({ cystType: 'Mature cystic teratoma', contents: 'Sebaceous material and hair' }));
  assert.ok(t.macro.includes('It contains yellow sebaceous material and hair.'));
  assert.equal(t.microscopy, 'Sections show a mature cystic teratoma including components from at least two lineages of differentiation, comprising keratinising squamous epithelium with underlying sebaceous glands and hair follicles, adipose tissue and smooth muscle fibres. No immature neuroepithelial tissue is seen. Ovarian stroma is noted in the periphery. There is no evidence of other germ cell tumour components, borderline component, or malignancy.');
  assert.equal(t.diagnosis, 'OVARY, right ovarian cyst, cystectomy - MATURE CYSTIC TERATOMA; no immature elements');
});

test('torsion, endometriosis elsewhere, absent stroma and tube findings', () => {
  const r = run(one({ cystType: 'Haemorrhagic corpus luteum cyst', torsion: 'Present', endometriosisElsewhere: 'Present', ovarianStroma: 'No', contents: 'Blood clot', procedure: 'Salpingo-oophorectomy', side: 'Left', tube: 'Hydrosalpinx', tubeFindings: 'Hydrosalpinx', blocks: '3' }));
  assert.ok(r.macro.includes('It contains blood clot. The inner lining is smooth. The attached fallopian tube is dilated and thin-walled, in keeping with hydrosalpinx. Representative sections in 4 blocks.'));
  assert.equal(r.blockKey, '(1-2) Cyst wall. (3) Ovarian parenchyma. (4) Fallopian tube.');
  assert.ok(r.microscopy.includes('There is extensive haemorrhagic infarction of the cyst wall and adjacent ovarian tissue, in keeping with torsion. Separate foci of endometriosis, composed of endometrial-type glands and stroma with haemosiderin-laden macrophages, are present on the ovarian surface and in the adjacent tissue. No ovarian stroma is identified in the sections examined. Features are those of a haemorrhagic corpus luteum cyst. The fallopian tube shows a dilated lumen with attenuated, flattened plicae and a thinned muscular wall, in keeping with hydrosalpinx. There is no evidence of malignancy.'));
  assert.equal(r.diagnosis, 'LEFT OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy - HAEMORRHAGIC CORPUS LUTEUM CYST; haemorrhagic infarction, in keeping with torsion; endometriosis; hydrosalpinx');
  // endometriosis elsewhere is not repeated after an endometriotic cyst diagnosis
  assert.equal(run(one({ endometriosisElsewhere: 'Present' })).diagnosis, 'OVARY, right ovarian cyst, cystectomy - ENDOMETRIOTIC CYST');
  const p = run(one({ procedure: 'Oophorectomy', tube: 'Paratubal cyst', tubeFindings: 'Paratubal cyst', cystType: 'Follicular cyst' }));
  assert.ok(p.macro.includes('The attached fallopian tube bears a thin-walled paratubal cyst containing clear fluid.'));
  assert.ok(p.microscopy.includes('Features are those of a follicular cyst. A thin-walled paratubal cyst lined by bland tubal-type epithelium is present. The fallopian tube is otherwise unremarkable. There is no evidence of malignancy.'));
  assert.equal(p.diagnosis, 'RIGHT OVARY AND FALLOPIAN TUBE, oophorectomy - FOLLICULAR CYST; paratubal cyst');
  // tube findings are ignored when no tube is included
  assert.ok(!run(one({ tubeFindings: 'Hydrosalpinx' })).microscopy.includes('fallopian tube'));
});

test('macro variants: ruptured cyst, cyst wall excision, block counts', () => {
  const r = run(one({ receivedState: 'Ruptured', dimensions: '6x4x0.3', wallThickness: '3', blocks: '2' }));
  assert.equal(r.macro, 'Received in formalin is a ruptured, collapsed right ovarian cyst measuring 6 x 4 x 0.3 cm. The cyst wall measures up to 3 mm in thickness. It contains chocolate-brown fluid. The inner lining is smooth. Representative sections in 2 blocks.');
  assert.equal(r.blockKey, '(1) Cyst wall. (2) Ovarian parenchyma.');
  const w = run(one({ procedure: 'Cyst wall, excision', receivedState: 'Ruptured', dimensions: '4 x 3 x 0.2', blocks: '3' }));
  assert.equal(w.specimens, 'Right ovarian cyst wall, excision');
  assert.ok(w.macro.startsWith('Received in formalin are fragments of a ruptured right ovarian cyst wall measuring 4 x 3 x 0.2 cm in aggregate.'));
  assert.equal(w.blockKey, '(1-3) Cyst wall.');
  assert.equal(w.diagnosis, 'OVARY, right ovarian cyst wall, excision - ENDOMETRIOTIC CYST');
  const o = run(one({ procedure: 'Oophorectomy', receivedState: 'Ruptured', dimensions: '6x5x4', cystSize: '4.5', blocks: '1' }));
  assert.ok(o.macro.includes('Received in formalin is a right ovary measuring 6 x 5 x 4 cm. On sectioning, the ovary contains a ruptured cyst measuring 4.5 cm in maximum dimension.'));
  assert.ok(o.macro.endsWith('Representative sections in 1 block.'));
  assert.equal(o.blockKey, '(1) Cyst wall.');
});

test('blank size, cyst size, wall and tube length fields produce no dangling text', () => {
  const r = run(one({ dimensions: '', cystSize: '', wallThickness: '', procedure: 'Salpingo-oophorectomy', tube: 'Unremarkable', tubeLength: '' }));
  assert.equal(r.macro, 'Received in formalin is a right ovary with attached fallopian tube. On sectioning, the ovary contains a cyst. It contains chocolate-brown fluid. The inner lining is smooth. The attached fallopian tube is unremarkable. Representative sections in 5 blocks.');
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.report.includes('__'));
  assert.ok(!r.report.includes('measuring  '));
  assert.ok(!/\bcm\b/.test(r.macro));
  const w = run(one({ procedure: 'Cyst wall, excision', receivedState: 'Ruptured', dimensions: '' }));
  assert.ok(w.macro.startsWith('Received in formalin are fragments of a ruptured right ovarian cyst wall. '));
});

test('borderline / carcinoma options give a short diagnosis line and the QMH ovarian cancer template comment', () => {
  const b = run(one({ cystType: 'Borderline tumour – see comment', procedure: 'Salpingo-oophorectomy', side: 'Left', tube: 'Unremarkable' }));
  assert.equal(b.diagnosis, 'LEFT OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy - BORDERLINE TUMOUR; see comment');
  assert.ok(b.microscopy.endsWith('Features are those of a borderline tumour; see comment. The fallopian tube is unremarkable.'));
  assert.ok(!b.microscopy.includes('no evidence'));
  assert.equal(b.comment, 'A borderline or malignant epithelial tumour is identified in the ovary. This benign template does not type, grade or stage the lesion; the QMH ovarian cancer template should be used for the final synoptic report.');
  const k = run(one({ cystType: 'Carcinoma – see comment', procedure: 'Oophorectomy' }));
  assert.equal(k.diagnosis, 'RIGHT OVARY, oophorectomy - CARCINOMA; see comment');
  assert.ok(k.microscopy.includes('Features are those of a carcinoma; see comment.'));
  assert.ok(!k.microscopy.includes('no evidence'));
  const c = createCase(schema, 2);
  c.parts[1].values.cystType = 'Carcinoma – see comment';
  assert.ok(run(c).comment.includes('in the ovary (part B).'));
  assert.equal(run(one({})).comment, '');
});

test('additional notes are appended to the microscopy', () => {
  const r = run(one({ additionalNotes: 'A small inclusion cyst is also noted.' }));
  assert.ok(r.microscopy.endsWith('There is no evidence of malignancy. A small inclusion cyst is also noted.'));
});
