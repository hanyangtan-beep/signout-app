// Phase 4b: thyroid benign resection template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/thyroid.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('thyroid_benign');
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  c.options = { ...c.options, ...options };
  return c;
};

test('metadata: benign endocrine resection with palette aliases and complete defaults', () => {
  assert.equal(schema.id, 'thyroid_benign');
  assert.equal(schema.generator, 'thyroid');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Endocrine');
  assert.equal(schema.rank, 24);
  assert.equal(schema.label, 'Thyroid');
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader') && schema.options.some((o) => o.id === 'macro'));
  for (const f of schema.fields) assert.ok('default' in f, `${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} exists in fields`);
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy');
  assert.ok(macroFields.length >= 8);
  assert.ok(gen.default.macro && gen.default.blockKey);
});

test('example: right hemithyroidectomy with nodular hyperplasia and an incidental parathyroid', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Right thyroid lobe, hemithyroidectomy');
  assert.equal(r.macro, 'Received in formalin is a right hemithyroidectomy specimen weighing 32 g and measuring 5 x 3.5 x 2.5 cm. The capsule is intact. Sectioning shows a well-circumscribed colloid nodule measuring 2.8 cm in the mid lobe. The background parenchyma is nodular. Representative sections in 8 blocks.');
  assert.equal(r.blockKey, '(1) Isthmic margin. (2-6) Dominant nodule with capsule. (7-8) Background thyroid.');
  assert.equal(r.microscopy, 'Sections show the thyroid gland is composed of multiple variably sized nodules composed of colloid-filled follicles, some with Sanderson polsters present. They are lined by follicular cells having round, hyperchromatic nuclei. Nuclear features of papillary carcinoma are not observed. Areas of haemorrhage, hyalinised fibrosis and dystrophic calcification are seen. A parathyroid gland with features of nodular hyperplasia is seen in block (A4). The findings are those of nodular hyperplasia. There is no evidence of malignancy.');
  assert.equal(r.diagnosis, 'THYROID GLAND, right, hemithyroidectomy - NODULAR HYPERPLASIA; incidental parathyroid gland with nodular hyperplasia; no evidence of malignancy');
  assert.ok(!r.report.includes('(A)'));
  assert.equal(r.comment, '');
});

test('macro option off removes the macroscopic description and block key; headers name the blocks', () => {
  const ex = example();
  ex.options.macro = false;
  const r = run(ex);
  assert.equal(r.macro, '');
  assert.equal(r.blockKey, '');
  assert.ok(!r.report.includes('Received in formalin'));
  const withHeaders = example();
  withHeaders.options.includeHeader = true;
  const h = run(withHeaders).report;
  assert.ok(h.indexOf('MACROSCOPIC DESCRIPTION:') < h.indexOf('BLOCK KEY:') && h.indexOf('BLOCK KEY:') < h.indexOf('MICROSCOPIC EXAMINATION:'));
});

test('two-part case keeps (A)/(B) prefixes on every block and adds gross parathyroid / lymph node blocks', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, grossIncidental: 'Both', blocks: '6' };
  c.parts[1].values = { ...c.parts[1].values, grossIncidental: 'Lymph node', lymphNode: 'Benign' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Right thyroid lobe, hemithyroidectomy\n(B) Left thyroid lobe, hemithyroidectomy');
  assert.ok(r.macro.startsWith('(A) Received in formalin is a right hemithyroidectomy specimen.'));
  assert.ok(r.macro.includes('A possible parathyroid gland and a perithyroidal lymph node are identified and submitted. Representative sections in 8 blocks.'));
  assert.ok(r.macro.includes('\n\n(B) Received in formalin is a left hemithyroidectomy specimen.'));
  assert.equal(r.blockKey, '(A) (1) Isthmic margin. (2-4) Dominant nodule with capsule. (5-6) Background thyroid. (7) Parathyroid. (8) Lymph node.\n(B) (1) Isthmic margin. (2-6) Dominant nodule with capsule. (7-8) Background thyroid. (9) Lymph node.');
  assert.ok(r.microscopy.startsWith('(A) Sections show') && r.microscopy.includes('\n\n(B) Sections show'));
  assert.ok(r.microscopy.includes('A benign lymph node has been sampled.'));
  const dx = r.diagnosis.split('\n');
  assert.equal(dx[0], '(A) THYROID GLAND, right, hemithyroidectomy - NODULAR HYPERPLASIA; no evidence of malignancy');
  assert.equal(dx[1], '(B) THYROID GLAND, left, hemithyroidectomy - NODULAR HYPERPLASIA; benign lymph node; no evidence of malignancy');
});

test('each benign diagnosis option yields the house capitalised line and conclusion', () => {
  assert.equal(run(one({ diagnosis: 'Hyperplastic (adenomatoid) nodule' })).diagnosis, 'THYROID GLAND, right, hemithyroidectomy - HYPERPLASTIC (ADENOMATOID) NODULE; no evidence of malignancy');
  const fa = run(one({ specimenName: 'Left lobe and isthmus', diagnosis: 'Follicular adenoma', follicularPattern: 'Microfollicular', sanderson: 'Absent', noduleCapsule: 'Thick capsule - no capsular or vascular invasion' }));
  assert.equal(fa.diagnosis, 'THYROID GLAND, left lobe and isthmus, hemithyroidectomy - FOLLICULAR ADENOMA; no evidence of malignancy');
  assert.ok(fa.microscopy.startsWith('Sections show an encapsulated nodule composed of microfollicles containing scant colloid, distinct from the surrounding thyroid.'));
  assert.ok(fa.microscopy.includes('The dominant nodule has a thick fibrous capsule; the entire capsule has been examined and shows no capsular or vascular invasion. The features are those of a follicular adenoma. There is no evidence of malignancy.'));
  const graves = run(one({ specimenName: 'Total thyroid', procedure: 'Total thyroidectomy', diagnosis: 'Diffuse hyperplasia (Graves disease)', isthmicMarginBlock: false, noduleCount: '0' }));
  assert.equal(graves.diagnosis, 'THYROID GLAND, total thyroidectomy - DIFFUSE HYPERPLASIA (GRAVES DISEASE); no evidence of malignancy');
  assert.ok(graves.microscopy.includes('The features are those of diffuse hyperplasia, consistent with Graves disease. There is no evidence of malignancy.'));
  assert.equal(graves.blockKey, '(1-8) Thyroid parenchyma.');
  assert.ok(graves.macro.includes('Received in formalin is a total thyroidectomy specimen. The capsule is intact. Sectioning shows no discrete nodule.'));
  const hash = run(one({ diagnosis: 'Lymphocytic (Hashimoto) thyroiditis', thyroiditis: 'Diffuse with germinal centres', parathyroid: 'Normal' }));
  assert.equal(hash.diagnosis, 'THYROID GLAND, right, hemithyroidectomy - LYMPHOCYTIC THYROIDITIS; incidental normal parathyroid gland; no evidence of malignancy');
  assert.ok(hash.microscopy.includes('A normal parathyroid gland is seen. The features are those of lymphocytic (Hashimoto) thyroiditis.'));
  assert.ok(!hash.microscopy.includes('background thyroid shows a diffuse lymphocytic'), 'Hashimoto does not repeat the background thyroiditis sentence');
  const bgThy = run(one({ thyroiditis: 'Focal', cCell: 'Present', margin: 'Uninvolved' }));
  assert.equal(bgThy.diagnosis, 'THYROID GLAND, right, hemithyroidectomy - NODULAR HYPERPLASIA; focal lymphocytic thyroiditis; C-cell hyperplasia; no evidence of malignancy');
  assert.ok(bgThy.microscopy.includes('Focal lymphocytic infiltrates are present in the background thyroid. C-cell hyperplasia is noted in the background thyroid. The isthmic margin is uninvolved.'));
});

test('NIFTP and malignant options: short line, no negative closer, comment recommends the QMH thyroid cancer template', () => {
  const niftp = run(one({ diagnosis: 'Non-invasive follicular thyroid neoplasm with papillary-like nuclear features (NIFTP)' }));
  assert.equal(niftp.diagnosis, 'THYROID GLAND, right, hemithyroidectomy - NON-INVASIVE FOLLICULAR THYROID NEOPLASM WITH PAPILLARY-LIKE NUCLEAR FEATURES (NIFTP); no capsular or vascular invasion identified');
  assert.ok(!niftp.microscopy.includes('no evidence of malignancy'));
  assert.equal(niftp.comment, '');
  const ptc = run(one({ diagnosis: 'Papillary thyroid carcinoma - see comment', ptcNuclear: 'Present' }));
  assert.equal(ptc.diagnosis, 'THYROID GLAND, right, hemithyroidectomy - PAPILLARY THYROID CARCINOMA; see comment');
  assert.equal(ptc.microscopy, 'Sections show a papillary thyroid carcinoma; see comment.');
  assert.ok(ptc.comment.includes('QMH thyroid cancer template'));
  assert.ok(!ptc.comment.includes('{parts}') && !ptc.comment.includes('part A'));
  const fc = run(one({ specimenName: 'Isthmus', procedure: 'Isthmusectomy', diagnosis: 'Follicular carcinoma - see comment' }));
  assert.equal(fc.diagnosis, 'THYROID GLAND, isthmus, isthmusectomy - FOLLICULAR CARCINOMA; see comment');
  assert.ok(fc.comment.includes('QMH thyroid cancer template'));
  const other = run(one({ diagnosis: 'Other - see comment' }));
  assert.equal(other.diagnosis, 'THYROID GLAND, right, hemithyroidectomy - SEE COMMENT');
  assert.equal(other.comment, '');
});

test('blank weight, size and nodule fields produce no dangling text; sizes are normalised', () => {
  const r = run(one({ weight: '', dimensions: '', noduleSize: '', noduleSite: '', degenerative: ['none'] }));
  assert.equal(r.macro, 'Received in formalin is a right hemithyroidectomy specimen. The capsule is intact. Sectioning shows a well-circumscribed colloid nodule. The background parenchyma is unremarkable. Representative sections in 8 blocks.');
  assert.ok(!r.report.includes('undefined') && !r.report.includes('__') && !r.report.includes('  '));
  assert.ok(!r.microscopy.includes('Areas of'));
  const sized = run(one({ dimensions: '4.5X3x2', noduleSize: '1.5 x 1 cm', noduleCount: '3', noduleAppearance: 'Cystic-haemorrhagic', capsule: 'Focally disrupted', degenerative: ['cystic change', 'cholesterol clefts'] }));
  assert.ok(sized.macro.includes('measuring 4.5 x 3 x 2 cm. The capsule is focally disrupted. Sectioning shows 3 nodules, the largest a well-circumscribed cystic and haemorrhagic nodule measuring 1.5 x 1 cm.'));
  assert.ok(sized.microscopy.includes('Areas of cystic change and cholesterol clefts are seen.'));
});

test('block key follows the block count and the isthmic margin checkbox', () => {
  assert.equal(run(one({ blocks: '3' })).blockKey, '(1) Isthmic margin. (2) Dominant nodule with capsule. (3) Background thyroid.');
  assert.equal(run(one({ blocks: '2' })).blockKey, '(1) Isthmic margin. (2) Dominant nodule with capsule.');
  assert.equal(run(one({ blocks: '5', isthmicMarginBlock: false, grossIncidental: 'Parathyroid' })).blockKey, '(1-3) Dominant nodule with capsule. (4-5) Background thyroid. (6) Parathyroid.');
  assert.equal(run(one({ blocks: '1' })).blockKey, '(1) Isthmic margin.');
});
