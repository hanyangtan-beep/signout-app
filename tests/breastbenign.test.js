// Phase 4b: breast benign excision and cavity shave margins template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/breastbenign.js';
import { sizePhrase, marginName, organPhrase, secondaries } from '../generators/breastbenign.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('breast_excision');
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
// The wording tests are written on a right-sided shave; the form's own default side is Not stated
// (2026-10-10: a default side must never print as the specimen's).
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, side: 'Right', ...values };
  Object.assign(c.options, options);
  return c;
};
const rightSided = (c) => { for (const p of c.parts) p.values.side = 'Right'; return c; };
const lesion = (values, options = {}) => one({ partType: 'Breast lesion excision', site: 'L3H breast mass', ...values }, options);

const NEG_MICRO = 'Sections show hyalinised fibroadipose tissue, as well as breast ducts and lobules, without architectural distortion. They are lined by ductal epithelium and myoepithelium, without atypia. There is no evidence of atypical hyperplasia, in-situ or invasive carcinoma.';
const FA_MICRO = 'Sections show a fairly circumscribed breast lesion composed of glandular and ductal elements compressed into elongated, curvilinear spaces by a proliferation of bland spindle-shaped stromal cells, consistent with a fibroadenoma. The epithelial component shows no atypia, and no significant mitotic activity is seen in the stroma. The features are those of a benign fibroadenoma, which appears completely excised. There is no evidence of atypical hyperplasia, in-situ or invasive carcinoma.';

test('metadata: benign breast resection with search aliases and complete defaults', () => {
  assert.equal(schema.id, 'breast_excision');
  assert.equal(schema.generator, 'breastbenign');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Breast');
  assert.equal(schema.name, 'Breast excision / margins');
  assert.equal(schema.shortName, 'Breast · excision and cavity shaves');
  assert.equal(schema.label, 'Breast excision');
  assert.equal(schema.organ, 'BREAST');
  assert.equal(schema.rank, 31);
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['cavity shave', 'shave margin', 'margin', 'wide local excision', 'lumpectomy', 'fibroadenoma', 'papilloma', 'fat necrosis', 'fibrocystic', 'UDH', 'ADH', 're-excision', 'mammary']) assert.ok(schema.aliases.includes(a), `alias ${a}`);
  assert.equal(schema.maxParts, 8);
  assert.equal(schema.defaultParts, 1);
  for (const f of schema.fields) assert.ok('default' in f, `${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is a field`);
  for (const id of ids) for (const p of schema.example.parts) assert.ok(id in p.values, `example part ${p.label} has ${id}`);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  assert.deepEqual(macroFields, ['dimensions', 'orientation', 'lesion', 'lesionSize', 'blocks', 'blockKeyText']);
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  const result = schema.fields.find((f) => f.id === 'result');
  assert.equal(result.options.length, 13);
  assert.equal(result.default, 'No evidence of malignancy (benign breast tissue)');
});

test('partDefaults walk the six cavity margins so + Part defaults to the next shave', () => {
  const c = createCase(schema, 8);
  assert.deepEqual(c.parts.slice(0, 6).map((p) => p.values.margin), ['Superior', 'Inferior', 'Medial', 'Lateral', 'Anterior', 'Posterior']);
  assert.ok(c.parts.every((p) => p.values.partType === 'Cavity shave margin'));
  assert.ok(c.parts.every((p) => p.values.side === 'Not stated'), 'no part assumes a side');
  assert.equal(run(c).specimens.split('\n')[3], '(D) Breast lateral margin, resection');
});

test('helpers: size phrase, margin name, organ phrase, secondaries', () => {
  assert.equal(sizePhrase('4x3x1'), '4 x 3 x 1 cm');
  assert.equal(sizePhrase('4 X 3 × 1 cm'), '4 x 3 x 1 cm');
  assert.equal(sizePhrase(''), '');
  assert.equal(marginName({ margin: 'Superior' }), 'superior');
  assert.equal(marginName({ margin: 'Other', marginOther: 'Superolateral.' }), 'superolateral');
  assert.equal(organPhrase({ partType: 'Cavity shave margin', side: 'Left', margin: 'Posterior' }), 'LEFT BREAST, posterior margin, resection');
  assert.equal(organPhrase({ partType: 'Cavity shave margin', side: 'Not stated', margin: 'Medial' }), 'BREAST, medial margin, resection');
  assert.equal(organPhrase({ partType: 'Breast lesion excision', side: 'Left', site: 'L3H breast mass', procedure: 'Wide local excision' }), 'BREAST, L3H breast mass, wide local excision');
  assert.equal(organPhrase({ partType: 'Breast lesion excision', side: 'Left', site: '', procedure: 'Re-excision' }), 'LEFT BREAST, re-excision');
  assert.deepEqual(secondaries({ result: 'Fibrocystic change', secondary: ['None'] }), []);
  assert.deepEqual(secondaries({ result: 'Fibrocystic change', secondary: ['Fibrocystic change', 'Usual ductal hyperplasia'] }), ['Usual ductal hyperplasia']);
});

test('example: two negative / fat necrosis shaves and a completely excised fibroadenoma', () => {
  const r = run(example());
  assert.equal(r.specimens, '(A) Right breast superior margin, resection\n(B) Right breast inferior margin, resection\n(C) Breast, R2H breast mass, excision');
  assert.equal(r.macro.split('\n\n')[0], '(A) Received in formalin is a piece of fibrofatty breast tissue measuring 4 x 3 x 1 cm. A suture marks the new margin, which is inked black. No discrete lesion is seen on sectioning. Serially sliced perpendicular to the new margin and all embedded in 4 blocks.');
  assert.equal(r.macro.split('\n\n')[1], '(B) Received in formalin is a piece of fibrofatty breast tissue measuring 5 x 3 x 1.5 cm. A suture marks the new margin, which is inked black. Sectioning shows a cavity wall with haemorrhagic and fibrotic tissue. Serially sliced perpendicular to the new margin and all embedded in 5 blocks.');
  assert.equal(r.macro.split('\n\n')[2], '(C) Received in formalin is a piece of fibrofatty breast tissue measuring 3 x 2.5 x 2 cm. The margins are inked. Sectioning shows a firm, well-circumscribed nodule measuring 2 cm. Representative sections in 4 blocks.');
  assert.equal(r.blockKey, '(A) (1-4) Serial slices, all embedded, new margin inked black.\n(B) (1-5) Serial slices, all embedded, new margin inked black.\n(C) (1-3) Lesion with closest margin. (4) Background breast.');
  const micro = r.microscopy.split('\n\n');
  assert.equal(micro[0], `(A) ${NEG_MICRO}`);
  assert.equal(micro[1], '(B) Sections show fibroadipose tissue with fat necrosis, comprising lipid-laden macrophages, multinucleated giant cells, fibrosis and chronic inflammation. The included breast ducts and lobules are lined by ductal epithelium and myoepithelium, without atypia. There is no evidence of atypical hyperplasia, in-situ or invasive carcinoma.');
  assert.equal(micro[2], `(C) ${FA_MICRO}`);
  assert.equal(r.diagnosis, [
    '(A) RIGHT BREAST, superior margin, resection - NO EVIDENCE OF MALIGNANCY',
    '(B) RIGHT BREAST, inferior margin, resection - FAT NECROSIS; no evidence of malignancy',
    '(C) BREAST, R2H breast mass, excision - FIBROADENOMA; completely excised'
  ].join('\n'));
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('undefined'));
});

test('default single part is a negative superior shave, side not stated, without part letters', () => {
  const r = run(createCase(schema, 1));
  assert.equal(r.specimens, 'Breast superior margin, resection');
  assert.equal(r.macro, 'Received in formalin is a piece of fibrofatty breast tissue. A suture marks the new margin, which is inked black. No discrete lesion is seen on sectioning. Serially sliced perpendicular to the new margin and all embedded in 3 blocks.');
  assert.equal(r.blockKey, '(1-3) Serial slices, all embedded, new margin inked black.');
  assert.equal(r.microscopy, NEG_MICRO);
  assert.equal(r.diagnosis, 'BREAST, superior margin, resection - NO EVIDENCE OF MALIGNANCY');
  assert.ok(!r.report.includes('(A)'));
  assert.deepEqual(r.issues.map((i) => [i.level, i.field, i.message]), [['warn', 'side', 'Choose the side: the line otherwise reads BREAST, superior margin, resection.']]);
});

test('macro option off removes the macroscopic description and block key', () => {
  const r = run(one({ dimensions: '4 x 3 x 1' }, { macro: false }));
  assert.equal(r.macro, '');
  assert.equal(r.blockKey, '');
  assert.ok(!r.report.includes('Received in formalin'));
  assert.ok(!r.report.includes('Serial slices'));
  assert.ok(r.report.startsWith('Right breast superior margin, resection\n\nSections show hyalinised'));
});

test('headers option labels the macro and block key blocks', () => {
  const r = run(one({}, { includeHeader: true }));
  assert.ok(r.report.includes('MACROSCOPIC DESCRIPTION:\nReceived in formalin'));
  assert.ok(r.report.includes('BLOCK KEY:\n(1-3) Serial slices, all embedded, new margin inked black.'));
  assert.ok(r.report.includes('DIAGNOSIS:\nRIGHT BREAST, superior margin, resection - NO EVIDENCE OF MALIGNANCY'));
});

test('two-part case keeps (A)/(B) prefixes on every block', () => {
  const c = rightSided(createCase(schema, 2));
  c.parts[1].values.result = 'Fat necrosis';
  const r = run(c);
  assert.equal(r.specimens, '(A) Right breast superior margin, resection\n(B) Right breast inferior margin, resection');
  assert.ok(r.macro.startsWith('(A) Received in formalin'));
  assert.ok(r.macro.includes('\n\n(B) Received in formalin'));
  assert.equal(r.blockKey, '(A) (1-3) Serial slices, all embedded, new margin inked black.\n(B) (1-3) Serial slices, all embedded, new margin inked black.');
  assert.ok(r.microscopy.startsWith('(A) Sections show hyalinised'));
  assert.ok(r.microscopy.includes('\n\n(B) Sections show fibroadipose tissue with fat necrosis'));
  assert.equal(r.diagnosis, '(A) RIGHT BREAST, superior margin, resection - NO EVIDENCE OF MALIGNANCY\n(B) RIGHT BREAST, inferior margin, resection - FAT NECROSIS; no evidence of malignancy');
});

test('each benign result yields the right capitalised diagnosis on a shave', () => {
  const dx = (result) => run(one({ result })).diagnosis;
  const head = 'RIGHT BREAST, superior margin, resection - ';
  assert.equal(dx('No evidence of malignancy (benign breast tissue)'), `${head}NO EVIDENCE OF MALIGNANCY`);
  assert.equal(dx('Fat necrosis'), `${head}FAT NECROSIS; no evidence of malignancy`);
  assert.equal(dx('Fibrocystic change'), `${head}FIBROCYSTIC CHANGE; no evidence of malignancy`);
  assert.equal(dx('Usual ductal hyperplasia'), `${head}USUAL DUCTAL HYPERPLASIA; no evidence of malignancy`);
  assert.equal(dx('Columnar cell change'), `${head}COLUMNAR CELL CHANGE; no evidence of malignancy`);
  assert.equal(dx('Sclerosing adenosis'), `${head}SCLEROSING ADENOSIS; no evidence of malignancy`);
  assert.equal(dx('Intraductal papilloma'), `${head}INTRADUCTAL PAPILLOMA; no evidence of malignancy`);
  assert.equal(dx('Fibroadenoma'), `${head}FIBROADENOMA; no evidence of malignancy`);
  assert.equal(dx('Radial scar'), `${head}RADIAL SCAR; no evidence of malignancy`);
  for (const result of ['Fibrocystic change', 'Usual ductal hyperplasia', 'Columnar cell change', 'Sclerosing adenosis', 'Radial scar']) {
    const m = run(one({ result })).microscopy;
    assert.ok(m.startsWith('Sections show '), result);
    assert.ok(m.endsWith('There is no evidence of atypical hyperplasia, in-situ or invasive carcinoma.'), result);
  }
});

test('lesion excision: papilloma with UDH and the margin options follow the house form', () => {
  const r = run(lesion({ result: 'Intraductal papilloma', secondary: ['Usual ductal hyperplasia'], blocks: '4' }));
  assert.equal(r.specimens, 'Breast, L3H breast mass, excision');
  assert.equal(r.blockKey, '(1-3) Lesion with closest margin. (4) Background breast.');
  assert.equal(r.microscopy, 'Sections show an intraductal papilloma within a dilated duct, composed of arborising fibrovascular cores lined by ductal epithelium and an intact myoepithelial layer. There is no atypia. The epithelium shows usual-type ductal hyperplasia. The lesion is clear of the margins. There is no evidence of atypical hyperplasia, in-situ or invasive carcinoma.');
  assert.equal(r.diagnosis, 'BREAST, L3H breast mass, excision - INTRADUCTAL PAPILLOMA with usual-type ductal hyperplasia; margins clear');

  const inv = run(lesion({ result: 'Fibroadenoma', margins: 'Involved – which', marginInvolved: 'medial', procedure: 'Wide local excision' }));
  assert.equal(inv.diagnosis, 'BREAST, L3H breast mass, wide local excision - FIBROADENOMA; medial margin involved');
  assert.ok(inv.microscopy.includes('The features are those of a benign fibroadenoma, which extends to the medial margin.'));
  assert.ok(!inv.microscopy.includes('completely excised'));

  const close = run(lesion({ result: 'Fibrocystic change', margins: 'Close < 1 mm', procedure: 'Re-excision', calcification: 'Present, benign', biopsySite: 'Present' }));
  assert.equal(close.diagnosis, 'BREAST, L3H breast mass, re-excision - FIBROCYSTIC CHANGE; benign microcalcification; biopsy site changes; close to margin (< 1 mm)');
  assert.ok(close.microscopy.includes('Microcalcification is present within benign ducts and lobules. Biopsy site changes with granulation tissue, haemosiderin-laden macrophages and fibrosis are present. The lesion lies less than 1 mm from the closest margin.'));

  const fa = run(lesion({ result: 'Fibroadenoma', lesion: 'Firm nodule', lesionSize: '2.5', blocks: '2' }));
  assert.equal(fa.microscopy, FA_MICRO);
  assert.equal(fa.diagnosis, 'BREAST, L3H breast mass, excision - FIBROADENOMA; completely excised');
  assert.equal(fa.blockKey, '(1) Lesion with closest margin. (2) Background breast.');
  assert.ok(fa.macro.includes('Sectioning shows a firm, well-circumscribed nodule measuring 2.5 cm.'));
});

test('secondary findings are listed in lower case after the main entity', () => {
  const r = run(one({ result: 'Fat necrosis', secondary: ['Fibrocystic change', 'Apocrine metaplasia'], calcification: 'Present, benign' }));
  assert.equal(r.diagnosis, 'RIGHT BREAST, superior margin, resection - FAT NECROSIS; fibrocystic change; apocrine metaplasia; benign microcalcification; no evidence of malignancy');
  assert.ok(r.microscopy.includes('The background breast shows fibrocystic change and apocrine metaplasia.'));
});

test('typed specimen name, other margin, left side and side not stated', () => {
  assert.equal(run(one({ specimenName: 'Right breast, further superior margin, resection.' })).specimens, 'Right breast, further superior margin, resection');
  const other = run(one({ side: 'Left', margin: 'Other', marginOther: 'superolateral' }));
  assert.equal(other.specimens, 'Left breast superolateral margin, resection');
  assert.equal(other.diagnosis, 'LEFT BREAST, superolateral margin, resection - NO EVIDENCE OF MALIGNANCY');
  const ns = run(one({ side: 'Not stated', margin: 'Medial' }));
  assert.equal(ns.specimens, 'Breast medial margin, resection');
  assert.equal(ns.diagnosis, 'BREAST, medial margin, resection - NO EVIDENCE OF MALIGNANCY');
  const noSite = run(lesion({ site: '', side: 'Left' }));
  assert.equal(noSite.specimens, 'Left breast, excision');
  assert.equal(noSite.diagnosis, 'LEFT BREAST, excision - NO EVIDENCE OF MALIGNANCY; margins clear');
});

test('macro variants: orientation, blocks and block key override', () => {
  assert.ok(run(one({ orientation: 'Inked' })).macro.includes('The new margin is inked black.'));
  assert.ok(run(one({ orientation: 'None' })).macro.includes('The specimen is not orientated.'));
  assert.ok(run(lesion({ orientation: 'Suture marks new margin' })).macro.includes('Sutures mark the orientation and the margins are inked.'));
  const oneBlock = run(one({ blocks: '1' }));
  assert.ok(oneBlock.macro.endsWith('all embedded in 1 block.'));
  assert.equal(oneBlock.blockKey, '(1) Serial slices, all embedded, new margin inked black.');
  assert.equal(run(lesion({ blocks: '1' })).blockKey, '(1) Lesion with closest margin.');
  assert.equal(run(one({ blockKeyText: '(1-2) Slices, new margin inked black. (3) Suture end' })).blockKey, '(1-2) Slices, new margin inked black. (3) Suture end.');
});

test('blank size fields produce no dangling text', () => {
  const r = run(lesion({ dimensions: '', lesion: 'Firm nodule', lesionSize: '' }));
  assert.equal(r.macro, 'Received in formalin is a piece of fibrofatty breast tissue. Sutures mark the orientation and the margins are inked. Sectioning shows a firm, well-circumscribed nodule. Representative sections in 3 blocks.');
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.report.includes('__'));
  assert.ok(!r.report.includes('measuring  '));
  assert.ok(!/\bcm\b/.test(r.macro));
});

test('atypia / DCIS / invasive give a short line and the QMH breast cancer template comment', () => {
  const head = 'RIGHT BREAST, superior margin, resection - ';
  const fea = run(one({ result: 'Flat epithelial atypia – see comment' }));
  assert.equal(fea.diagnosis, `${head}FLAT EPITHELIAL ATYPIA; see comment`);
  assert.ok(fea.microscopy.includes('in keeping with flat epithelial atypia; see comment.'));
  assert.ok(!fea.microscopy.includes('no evidence of atypical hyperplasia'));
  assert.equal(fea.comment, 'Atypical epithelial proliferation / carcinoma is identified in the breast. This benign template does not grade, measure or stage the lesion; the QMH breast cancer template should be used for the final synoptic report.');

  assert.equal(run(one({ result: 'Atypical ductal hyperplasia – see comment' })).diagnosis, `${head}ATYPICAL DUCTAL HYPERPLASIA; see comment`);
  const dcis = run(lesion({ result: 'DCIS – see comment', calcification: 'Present, in DCIS' }));
  assert.equal(dcis.diagnosis, 'BREAST, L3H breast mass, excision - DUCTAL CARCINOMA IN SITU; microcalcification in DCIS; margins clear; see comment');
  assert.ok(dcis.microscopy.includes('Microcalcification is present within the ductal carcinoma in situ.'));
  assert.equal(run(one({ result: 'Invasive carcinoma – see comment' })).diagnosis, `${head}INVASIVE CARCINOMA; see comment`);

  const c = rightSided(createCase(schema, 2));
  c.parts[1].values.result = 'DCIS – see comment';
  const r = run(c);
  assert.ok(r.comment.includes('in the breast (part B).'));
  assert.equal(r.diagnosis.split('\n')[0], '(A) RIGHT BREAST, superior margin, resection - NO EVIDENCE OF MALIGNANCY');
});

test('additional notes are appended to the microscopy', () => {
  const r = run(one({ additionalNotes: 'a small intramammary lymph node is reactive' }));
  assert.ok(r.microscopy.endsWith('There is no evidence of atypical hyperplasia, in-situ or invasive carcinoma. A small intramammary lymph node is reactive.'));
});

// Phase 63 (2026-10-10, pulled by the user): the side and margin follow the specimen as received.
test('derive: typing the specimen as received sets the part type, side and margin it names', () => {
  const d = (text) => gen.derive({ specimenName: text }, 'specimenName');
  assert.deepEqual(d('Breast, left inferior margin'), { side: 'Left', partType: 'Cavity shave margin', margin: 'Inferior', marginOther: '' });
  assert.deepEqual(d('Lt breast superomedial margin'), { side: 'Left', partType: 'Cavity shave margin', margin: 'Other', marginOther: 'superomedial' });
  assert.deepEqual(d('R new posterior (deep) margin'), { side: 'Right', partType: 'Cavity shave margin', margin: 'Posterior', marginOther: '' });
  assert.deepEqual(d('Breast, superior margin'), { partType: 'Cavity shave margin', margin: 'Superior', marginOther: '' }, 'no side named, none set');
  assert.deepEqual(d('Left breast mass, wide local excision'), { side: 'Left', partType: 'Breast lesion excision' });
  assert.deepEqual(d('Left'), { side: 'Left' }, 'part-typed: only what the text names so far');
  assert.deepEqual(d(''), {});
  assert.deepEqual(gen.derive({ specimenName: 'Breast, left inferior margin' }, 'result'), {}, 'only the specimen as received drives it');
});

test('checks: a side or margin that disagrees with the specimen as received', () => {
  const warns = (values) => run(one(values)).issues.map((i) => [i.field, i.message]);
  assert.deepEqual(warns({ specimenName: 'Breast, right superior margin' }), [], 'agreeing fields: no check');
  assert.deepEqual(warns({ specimenName: 'Breast, left superior margin' }), [['side', 'The specimen as received says left: choose Left for the side.']]);
  assert.deepEqual(warns({ specimenName: 'Breast, right inferior margin' }), [['margin', 'The specimen as received names the inferior margin: choose Inferior.']]);
  assert.deepEqual(warns({ specimenName: 'Breast, right deep margin' }), [['margin', 'The specimen as received names the deep margin: choose Other and type it.']]);
  assert.deepEqual(warns({ specimenName: 'Breast, right superior margin', partType: 'Breast lesion excision', site: 'R2H mass' }), [['partType', 'The specimen as received is a margin: choose Cavity shave margin for the part type.']]);
  assert.deepEqual(warns({ side: 'Left', margin: 'Other', marginOther: '' }), [['marginOther', 'Name the margin: the line otherwise reads LEFT BREAST, resection.']]);
  assert.deepEqual(warns({ side: 'Not stated', specimenName: 'Breast, superior margin' }), [['side', 'Choose the side: the line otherwise reads BREAST, superior margin, resection.']]);
  assert.deepEqual(warns({ side: 'Not stated', partType: 'Breast lesion excision', site: 'L3H breast mass' }), [], 'a lesion names its side in the site');
  assert.deepEqual(run(example()).issues, [], 'the worked example raises no checks');
});
