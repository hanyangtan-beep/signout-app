// Phase 4b: parathyroid excision template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/parathyroid.js';

const schema = JSON.parse(readFileSync(new URL('../schemas/parathyroid.json', import.meta.url), 'utf8'));
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  c.options = { ...c.options, ...options };
  return c;
};

test('metadata: benign endocrine resection with palette aliases and complete defaults', () => {
  assert.equal(schema.id, 'parathyroid');
  assert.equal(schema.generator, 'parathyroid');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Endocrine');
  assert.equal(schema.rank, 25);
  assert.equal(schema.label, 'Parathyroid');
  assert.equal(schema.maxParts, 4);
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader') && schema.options.some((o) => o.id === 'macro'));
  for (const f of schema.fields) assert.ok('default' in f, `${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} exists in fields`);
  assert.deepEqual(createCase(schema, 4).parts.map((p) => p.values.site), ['Right superior', 'Right inferior', 'Left superior', 'Left inferior']);
});

test('example: right superior adenoma with the house microscopy and diagnosis line', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Right superior parathyroid, excision');
  assert.equal(r.macro, 'Received in formalin is a tan, smooth, encapsulated nodule labelled right superior parathyroid, weighing 450 mg and measuring 1.2 x 0.8 x 0.5 cm. All embedded in 2 blocks.');
  assert.equal(r.blockKey, '(1-2) Parathyroid, all embedded.');
  assert.equal(r.microscopy, 'Sections show hypercellular parathyroid tissue composed predominantly of chief cells arranged in solid sheets, nests and trabecular patterns. The chief cells have small central nuclei with stippled chromatin and moderate eosinophilic cytoplasm. Scattered oxyphil cells with abundant granular eosinophilic cytoplasm are also present. A thin rim of normal parathyroid tissue with abundant interspersed adipocytes is identified at the periphery. The adipose tissue content within the lesion is markedly decreased compared with the rim. There is no evidence of capsular invasion, vascular invasion or increased mitotic activity. The features are in keeping with a parathyroid adenoma.');
  assert.equal(r.diagnosis, 'PARATHYROID, right superior, excision - In keeping with ADENOMA');
  assert.ok(!r.report.includes('(A)'));
  assert.equal(r.comment, '');
});

test('macro option off removes the macroscopic description and block key', () => {
  const ex = example();
  ex.options.macro = false;
  const r = run(ex);
  assert.equal(r.macro, '');
  assert.equal(r.blockKey, '');
  assert.ok(!r.report.includes('Received in formalin') && !r.report.includes('all embedded'));
  const withHeaders = example();
  withHeaders.options.includeHeader = true;
  const h = run(withHeaders).report;
  assert.ok(h.indexOf('MACROSCOPIC DESCRIPTION:') < h.indexOf('BLOCK KEY:') && h.indexOf('BLOCK KEY:') < h.indexOf('MICROSCOPIC EXAMINATION:'));
});

test('two-part case keeps (A)/(B) prefixes on every block; frozen section correlation sentence', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, frozen: 'Yes - confirmed parathyroid', fsBlock: 'A1' };
  c.parts[1].values = { ...c.parts[1].values, diagnosis: 'Normocellular parathyroid', blocks: '1' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Right superior parathyroid, excision\n(B) Right inferior parathyroid, excision');
  assert.ok(r.macro.startsWith('(A) Received in formalin') && r.macro.includes('\n\n(B) Received in formalin is a tan, smooth, encapsulated nodule labelled right inferior parathyroid. All embedded in 1 block.'));
  assert.equal(r.blockKey, '(A) (1-2) Parathyroid, all embedded.\n(B) (1) Parathyroid, all embedded.');
  assert.ok(r.microscopy.includes('The paraffin sections confirm the intraoperative frozen section diagnosis of parathyroid tissue (block A1). The features are in keeping with a parathyroid adenoma.'));
  assert.ok(r.microscopy.includes('\n\n(B) Sections show normocellular parathyroid tissue composed of chief cells and scattered oxyphil cells with preserved interspersed stromal adipose tissue. There is no evidence of adenoma or hyperplasia.'));
  assert.equal(r.diagnosis, '(A) PARATHYROID, right superior, excision - In keeping with ADENOMA\n(B) PARATHYROID, right inferior, excision - NORMOCELLULAR PARATHYROID TISSUE');
});

test('each diagnosis option yields the right capitalised line', () => {
  const dx = (values) => run(one(values)).diagnosis;
  assert.equal(dx({ site: 'Left inferior', diagnosis: 'Hyperplasia', rim: 'Not identified', stromalFat: 'Decreased' }), 'PARATHYROID, left inferior, excision - In keeping with HYPERPLASIA');
  assert.equal(dx({ site: 'Not specified', diagnosis: 'Normocellular parathyroid' }), 'PARATHYROID, excision - NORMOCELLULAR PARATHYROID TISSUE');
  assert.equal(dx({ site: 'Ectopic - specify', siteOther: 'Intrathymic', diagnosis: 'Not parathyroid - thymic tissue' }), 'PARATHYROID, ectopic (intrathymic), excision - THYMIC TISSUE; no parathyroid tissue identified');
  assert.equal(dx({ diagnosis: 'Not parathyroid - thyroid tissue' }), 'PARATHYROID, right superior, excision - THYROID TISSUE; no parathyroid tissue identified');
  assert.equal(dx({ diagnosis: 'Not parathyroid - lymph node' }), 'PARATHYROID, right superior, excision - LYMPH NODE; no parathyroid tissue identified');
  const hyper = run(one({ diagnosis: 'Hyperplasia', rim: 'Not identified', stromalFat: 'Decreased', cellType: 'Oxyphil cells', architecture: ['nests', 'follicles'] }));
  assert.ok(hyper.microscopy.startsWith('Sections show hypercellular parathyroid tissue composed predominantly of oxyphil cells arranged in nests and follicular structures. The oxyphil cells have abundant granular eosinophilic cytoplasm and small round nuclei. No rim of normal parathyroid tissue is identified. The adipose tissue content within the lesion is decreased.'));
  assert.ok(hyper.microscopy.endsWith('The features are in keeping with parathyroid hyperplasia.'));
  const thy = run(one({ diagnosis: 'Not parathyroid - thyroid tissue', frozen: 'Yes - confirmed parathyroid' }));
  assert.equal(thy.microscopy, 'Sections show thyroid tissue composed of colloid-filled follicles lined by bland follicular cells. No parathyroid tissue is identified. The paraffin sections do not confirm the intraoperative frozen section diagnosis of parathyroid tissue.');
});

test('atypical tumour and carcinoma: short line, invasion and mitoses spelled out, comment recommends the QMH template', () => {
  const atyp = run(one({ diagnosis: 'Atypical parathyroid tumour - see comment', mitoses: 'Increased' }));
  assert.equal(atyp.diagnosis, 'PARATHYROID, right superior, excision - ATYPICAL PARATHYROID TUMOUR; see comment');
  assert.ok(atyp.microscopy.includes('There is no evidence of capsular or vascular invasion. Mitotic activity is increased. The features are those of an atypical parathyroid tumour; see comment.'));
  assert.ok(atyp.comment.includes('QMH parathyroid carcinoma template'));
  const ca = run(one({ diagnosis: 'Parathyroid carcinoma - see comment', invasion: 'Present', mitoses: 'Increased' }));
  assert.equal(ca.diagnosis, 'PARATHYROID, right superior, excision - PARATHYROID CARCINOMA; see comment');
  assert.ok(ca.microscopy.includes('Capsular and/or vascular invasion is present. Mitotic activity is increased. The features are those of parathyroid carcinoma; see comment.'));
  assert.ok(ca.comment.includes('QMH parathyroid carcinoma template') && !ca.comment.includes('{parts}'));
});

test('blank weight and size produce no dangling text; weight units are normalised', () => {
  const r = run(one({ weight: '', dimensions: '', appearance: 'Lobulated' }));
  assert.equal(r.macro, 'Received in formalin is a tan, lobulated nodule labelled right superior parathyroid. All embedded in 2 blocks.');
  assert.ok(!r.report.includes('undefined') && !r.report.includes('__') && !r.report.includes('  '));
  assert.equal(gen.weightText('450'), '450 mg');
  assert.equal(gen.weightText('1.3'), '1.3 g');
  assert.equal(gen.weightText('0.45g'), '0.45 g');
  assert.equal(gen.weightText('450MG'), '450 mg');
  assert.equal(gen.weightText(''), '');
  const sized = run(one({ weight: '0.9 g', dimensions: '1.5X1x0.6', appearance: 'Cystic' }));
  assert.ok(sized.macro.includes('a tan nodule with a cystic cut surface labelled right superior parathyroid, weighing 0.9 g and measuring 1.5 x 1 x 0.6 cm.'));
});
