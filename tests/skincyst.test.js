// Phase 4b: skin cyst (epidermal / pilar / dermoid) excision template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/skincyst.js';
import { sizePhrase, sitePhrase } from '../generators/skincyst.js';

const schema = JSON.parse(readFileSync(new URL('../schemas/skin_cyst.json', import.meta.url), 'utf8'));
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  Object.assign(c.options, options);
  return c;
};

const EPIDERMAL_MICRO = 'Sections show a piece of hair-bearing skin, with the dermis containing a cyst lined by stratified squamous epithelium with a granular layer, without adnexal skin structures. Abundant lamellated keratin is seen within the cyst. The findings are those of an epidermal cyst. There is no evidence of dysplasia or malignancy.';

test('metadata: benign skin resection with search aliases and complete defaults', () => {
  assert.equal(schema.id, 'skin_cyst');
  assert.equal(schema.generator, 'skincyst');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Skin');
  assert.equal(schema.label, 'Skin cyst');
  assert.equal(schema.organ, 'SKIN');
  assert.equal(schema.rank, 29);
  assert.equal(schema.shortName, 'Skin · cyst excision');
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['sebaceous cyst', 'epidermal cyst', 'epidermoid', 'inclusion cyst', 'pilar cyst', 'trichilemmal', 'dermoid', 'ruptured cyst', 'keratin']) assert.ok(schema.aliases.includes(a), a);
  assert.equal(schema.maxParts, 3);
  assert.equal(schema.defaultParts, 1);
  for (const f of schema.fields) assert.ok('default' in f, `${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is a field`);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  assert.deepEqual(macroFields, ['ellipseSize', 'noduleSize', 'deepInked', 'cystContents', 'blocks', 'blockScheme']);
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  assert.equal(schema.fields.find((f) => f.id === 'clinicalLabel').default, 'seb cyst');
  assert.equal(schema.fields.find((f) => f.id === 'blocks').default, '2');
});

test('helpers: size and site phrases', () => {
  assert.equal(sizePhrase('3x1.5'), '3 x 1.5 cm');
  assert.equal(sizePhrase('3 X 1.5 × 0.8 cm'), '3 x 1.5 x 0.8 cm');
  assert.equal(sizePhrase(''), '');
  assert.equal(sitePhrase({ specimenName: 'right axilla', clinicalLabel: 'seb cyst' }), 'right axilla seb cyst');
  assert.equal(sitePhrase({ specimenName: '', clinicalLabel: 'seb cyst' }), 'seb cyst');
  assert.equal(sitePhrase({ specimenName: 'left back.', clinicalLabel: '' }), 'left back');
});

test('example: epidermal cyst, right axilla, 2 blocks — house diagnosis line', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Skin, right axilla seb cyst, excision');
  assert.equal(r.macro, 'Received in formalin is an ellipse of skin with an underlying nodule. The ellipse of skin measures 3 x 1.5 cm and the nodule measures 1.5 cm. The deep surface is inked. Sectioning shows a cyst containing cheesy keratinous material. All embedded in 2 blocks.');
  assert.equal(r.blockKey, '(1-2) Skin ellipse with nodule, cross-sections.');
  assert.equal(r.microscopy, EPIDERMAL_MICRO);
  assert.equal(r.diagnosis, 'SKIN, right axilla seb cyst, excision - EPIDERMAL CYST');
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('(A)'));
  assert.ok(!r.report.includes('undefined'));
});

test('macro and block key print with (1)…(2) numbering and disappear when options.macro is false', () => {
  const on = run(one({ blocks: '1', blockScheme: 'Representative sections' }));
  assert.equal(on.blockKey, '(1) Nodule, representative sections.');
  assert.ok(on.macro.endsWith('Representative sections in 1 block.'));
  const off = run(one({}, { macro: false }));
  assert.equal(off.macro, '');
  assert.equal(off.blockKey, '');
  assert.ok(!off.report.includes('Received in formalin'));
  assert.ok(!off.report.includes('(1-2)'));
  assert.ok(off.report.startsWith('Skin, seb cyst, excision\n\nSections show'));
});

test('headers option labels the macro and block key blocks', () => {
  const r = run(one({}, { includeHeader: true }));
  assert.ok(r.report.includes('MACROSCOPIC DESCRIPTION:\nReceived in formalin is an ellipse of skin'));
  assert.ok(r.report.includes('BLOCK KEY:\n(1-2) Skin ellipse with nodule, cross-sections.'));
});

test('two-part case keeps (A)/(B) prefixes on every block', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, specimenName: 'right axilla' };
  c.parts[1].values = { ...c.parts[1].values, specimenName: 'left shoulder', cystType: 'Pilar (trichilemmal) cyst', cystContents: 'Hair and sebaceous material', blocks: '1' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Skin, right axilla seb cyst, excision\n(B) Skin, left shoulder seb cyst, excision');
  assert.ok(r.macro.startsWith('(A) Received in formalin'));
  assert.ok(r.macro.includes('\n\n(B) Received in formalin'));
  assert.ok(r.macro.includes('Sectioning shows a cyst containing hair and sebaceous material.'));
  assert.equal(r.blockKey, '(A) (1-2) Skin ellipse with nodule, cross-sections.\n(B) (1) Skin ellipse with nodule, cross-sections.');
  assert.ok(r.microscopy.startsWith('(A) Sections show'));
  assert.ok(r.microscopy.includes('\n\n(B) Sections show'));
  assert.equal(r.diagnosis, '(A) SKIN, right axilla seb cyst, excision - EPIDERMAL CYST\n(B) SKIN, left shoulder seb cyst, excision - PILAR (TRICHILEMMAL) CYST');
  for (const block of [r.specimens, r.macro, r.blockKey, r.microscopy, r.diagnosis]) assert.ok(block.includes('(A)') && block.includes('(B)'));
});

test('each cyst type yields the right capitalised diagnosis', () => {
  const dx = (cystType, extra = {}) => run(one({ specimenName: 'right axilla', cystType, ...extra })).diagnosis;
  assert.equal(dx('Epidermal cyst'), 'SKIN, right axilla seb cyst, excision - EPIDERMAL CYST');
  assert.equal(dx('Pilar (trichilemmal) cyst'), 'SKIN, right axilla seb cyst, excision - PILAR (TRICHILEMMAL) CYST');
  assert.equal(dx('Dermoid cyst'), 'SKIN, right axilla seb cyst, excision - DERMOID CYST');
  assert.equal(dx('Hybrid cyst'), 'SKIN, right axilla seb cyst, excision - HYBRID CYST');
  assert.equal(dx('Steatocystoma'), 'SKIN, right axilla seb cyst, excision - STEATOCYSTOMA');
  assert.equal(dx('Ruptured cyst with no residual lining', { rupture: 'Present' }), 'SKIN, right axilla seb cyst, excision - RUPTURED CYST WITH FOREIGN BODY GRANULOMATOUS REACTION; no residual cyst lining identified; no evidence of malignancy');
  assert.equal(dx('Ruptured cyst with no residual lining', { rupture: 'Absent' }), 'SKIN, right axilla seb cyst, excision - CHRONIC INFLAMMATION (see microscopic examination); no residual cyst lining identified; no evidence of malignancy');
});

test('cyst type microscopy paragraphs', () => {
  const micro = (cystType, extra = {}) => run(one({ cystType, ...extra })).microscopy;
  assert.ok(micro('Pilar (trichilemmal) cyst').includes('abrupt trichilemmal-type keratinisation without a granular layer. The cyst contains dense compact eosinophilic keratin. The findings are those of a pilar (trichilemmal) cyst. There is no evidence of dysplasia or malignancy.'));
  assert.ok(micro('Dermoid cyst').includes('sebaceous glands and hair follicles, within the cyst wall. Lamellated keratin and hair shafts are seen within the cyst. The findings are those of a dermoid cyst.'));
  assert.ok(micro('Hybrid cyst').includes('The findings are those of a hybrid cyst.'));
  assert.ok(micro('Steatocystoma').includes('corrugated eosinophilic cuticle and sebaceous lobules within the cyst wall. The cyst is largely empty. The findings are those of a steatocystoma.'));
  // §4.8 second paragraph verbatim: ruptured cyst, no lining, no granulomas
  assert.equal(micro('Ruptured cyst with no residual lining', { rupture: 'Absent' }), 'Sections show a piece of skin with superficial subcutis. The dermis shows haemorrhage with focal refractile foreign material surrounded by patchy lymphocytic infiltrates with haemosiderin deposits. No residual lamellated keratin material or cyst epithelium is identified. Please correlate with clinical findings. There is no evidence of granulomatous inflammation or malignancy.');
  assert.equal(micro('Ruptured cyst with no residual lining', { rupture: 'Present' }), 'Sections show a piece of skin with superficial subcutis. The dermis shows a foreign body granulomatous reaction to lamellated keratin, with multinucleated giant cells, lymphocytes, haemosiderin-laden macrophages and fibrosis. No residual cyst epithelium is identified. The findings are those of a ruptured cyst with foreign body granulomatous reaction. There is no evidence of malignancy.');
});

test('rupture, giant cells, acute inflammation and excision status', () => {
  const r = run(one({ specimenName: 'right shoulder', rupture: 'Present', giantCells: 'Present', acuteInflammation: 'Abscess formation', excision: 'Incomplete', cystContents: 'Ruptured' }));
  assert.ok(r.macro.includes('Sectioning shows a ruptured cyst with keratinous debris and surrounding fibrosis.'));
  assert.equal(r.microscopy, `${EPIDERMAL_MICRO.replace(' There is no evidence of dysplasia or malignancy.', '')} The cyst is focally ruptured with a surrounding foreign body granulomatous reaction to keratin. Foreign body type multinucleated giant cells are present. There is acute inflammation with abscess formation. The cyst extends to the excision margin. There is no evidence of dysplasia or malignancy.`);
  assert.equal(r.diagnosis, 'SKIN, right shoulder seb cyst, excision - EPIDERMAL CYST; ruptured with foreign body granulomatous reaction; abscess formation; incompletely excised');
  const r2 = run(one({ acuteInflammation: 'Present', excision: 'Not assessable' }));
  assert.ok(r2.microscopy.includes('There is acute inflammation. The completeness of excision cannot be assessed.'));
  assert.equal(r2.diagnosis, 'SKIN, seb cyst, excision - EPIDERMAL CYST; acute inflammation; completeness of excision not assessable');
});

test('blank size fields and blank site produce no dangling text', () => {
  const r = run(one({ specimenName: '', clinicalLabel: '', ellipseSize: '', noduleSize: '', deepInked: 'Not inked' }));
  assert.equal(r.specimens, 'Skin, excision');
  assert.equal(r.macro, 'Received in formalin is an ellipse of skin with an underlying nodule. Sectioning shows a cyst containing cheesy keratinous material. All embedded in 2 blocks.');
  assert.equal(r.diagnosis, 'SKIN, excision - EPIDERMAL CYST');
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.report.includes('__'));
  assert.ok(!r.report.includes('measures  '));
  assert.ok(!/\bcm\b/.test(r.macro));
  const only = run(one({ ellipseSize: '2x1', noduleSize: '' }));
  assert.ok(only.macro.includes('The ellipse of skin measures 2 x 1 cm. The deep surface is inked.'));
  const nod = run(one({ ellipseSize: '', noduleSize: '1.2' }));
  assert.ok(nod.macro.includes('underlying nodule. The nodule measures 1.2 cm.'));
});

test('neoplasia options give a short diagnosis line and the QMH skin cancer template comment', () => {
  const r = run(one({ specimenName: 'scalp', clinicalLabel: 'cyst', cystType: 'Pilar (trichilemmal) cyst', neoplasia: 'Proliferating trichilemmal tumour – see comment' }));
  assert.equal(r.diagnosis, 'SKIN, scalp cyst, excision - PROLIFERATING TRICHILEMMAL TUMOUR; arising in pilar (trichilemmal) cyst; see comment');
  assert.ok(r.microscopy.includes('in keeping with a proliferating trichilemmal tumour; see comment.'));
  assert.ok(!r.microscopy.includes('no evidence of dysplasia'));
  assert.equal(r.comment, 'A neoplastic proliferation is identified in the cyst. This benign template does not grade or stage the lesion; the QMH skin cancer template should be used for the final synoptic report.');
  const m = run(one({ neoplasia: 'Malignancy – see comment' }));
  assert.equal(m.diagnosis, 'SKIN, seb cyst, excision - MALIGNANCY ARISING IN CYST; arising in epidermal cyst; see comment');
  const c = createCase(schema, 2);
  c.parts[1].values.neoplasia = 'Malignancy – see comment';
  assert.ok(run(c).comment.includes('in the cyst (part B).'));
});

test('additional notes are appended to the microscopy', () => {
  const r = run(one({ additionalNotes: 'Scattered melanophages are present in the surrounding dermis.' }));
  assert.ok(r.microscopy.endsWith('There is no evidence of dysplasia or malignancy. Scattered melanophages are present in the surrounding dermis.'));
});
