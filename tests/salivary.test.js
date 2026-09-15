// Phase 4b: salivary gland benign resection template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/salivary.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('salivary_benign');
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  c.options = { ...c.options, ...options };
  return c;
};

const PA_PARAGRAPH = 'Sections show a well circumscribed, thinly encapsulated tumour composed of a mixture of epithelial elements, myoepithelial elements, and stromal elements. The epithelial cells show tubules and nests, with streaming of spindle or stellate shaped myoepithelial elements. Eosinophilic luminal secretions are seen. The stroma is chondromyxoid. The capsule is intact and the tumour is completely excised. The surrounding parotid tissue is unremarkable. There is no evidence of malignancy.';

test('metadata: benign head and neck resection with palette aliases and complete defaults', () => {
  assert.equal(schema.id, 'salivary_benign');
  assert.equal(schema.generator, 'salivary');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Head and neck');
  assert.equal(schema.rank, 42);
  assert.equal(schema.label, 'Salivary');
  assert.equal(schema.organ, 'PAROTID');
  assert.equal(schema.maxParts, 3);
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader') && schema.options.some((o) => o.id === 'macro'));
  for (const f of schema.fields) assert.ok('default' in f, `${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} exists in fields`);
  for (const id of ids) assert.ok(id in schema.example.parts[0].values, `example provides ${id}`);
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy');
  assert.ok(macroFields.length >= 8);
  assert.ok(gen.default.macro && gen.default.blockKey && gen.default.flags);
});

test('example: left superficial parotidectomy with pleomorphic adenoma and a negative intraparotid node', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Left parotid, superficial parotidectomy');
  assert.equal(r.macro, 'Received in formalin is a superficial parotidectomy specimen measuring 4.5 x 3.5 x 2 cm and weighing 18 g. Sectioning shows a well-circumscribed, glistening, grey-white nodule measuring 2.5 cm, 0.2 cm from the closest inked margin. The surrounding parotid tissue is unremarkable. Representative sections in 5 blocks.');
  assert.equal(r.blockKey, '(1-3) Nodule with closest margin. (4) Nodule with capsule. (5) Background gland.');
  assert.equal(r.microscopy, PA_PARAGRAPH + ' One intraparotid lymph node shows reactive changes only (0/1).');
  assert.equal(r.diagnosis, 'PAROTID, left, superficial parotidectomy - PLEOMORPHIC ADENOMA; completely excised; intraparotid lymph node with no evidence of malignancy (0/1)');
  assert.ok(!r.report.includes('(A)'));
  assert.equal(r.comment, '');
});

test('default case reproduces the roadmap diagnosis and the §4.12 pleomorphic adenoma paragraph verbatim', () => {
  const r = run(one({}));
  assert.equal(r.diagnosis, 'PAROTID, left, superficial parotidectomy - PLEOMORPHIC ADENOMA; completely excised');
  assert.equal(r.microscopy, PA_PARAGRAPH);
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

test('two-part case keeps (A)/(B) prefixes on every block; submandibular sialadenitis with a calculus', () => {
  const c = createCase(schema, 2);
  c.parts[1].values = {
    ...c.parts[1].values, gland: 'Submandibular gland', laterality: 'Right', procedure: 'Submandibular gland excision',
    dimensions: '3.5 x 2.5 x 2', weight: '12', noduleDescription: 'No discrete nodule', grossBackground: 'Firm, fibrotic',
    stone: true, stoneSize: '8', blocks: '4', lesion: 'Chronic sialadenitis', sialolithiasis: true
  };
  const r = run(c);
  assert.equal(r.specimens, '(A) Left parotid, superficial parotidectomy\n(B) Right submandibular gland, excision');
  assert.ok(r.macro.startsWith('(A) Received in formalin is a superficial parotidectomy specimen. Sectioning shows a well-circumscribed, glistening, grey-white nodule. The surrounding parotid tissue is unremarkable. Representative sections in 5 blocks.'));
  assert.ok(r.macro.includes('\n\n(B) Received in formalin is a submandibular gland excision specimen measuring 3.5 x 2.5 x 2 cm and weighing 12 g. Sectioning shows no discrete nodule. A calculus measuring 8 mm is present within the duct. The surrounding submandibular gland tissue is firm and fibrotic. Representative sections in 4 blocks.'));
  assert.equal(r.blockKey, '(A) (1-3) Nodule with closest margin. (4) Nodule with capsule. (5) Background gland.\n(B) (1-3) Gland, representative sections. (4) Duct with calculus.');
  assert.ok(r.microscopy.startsWith('(A) Sections show a well circumscribed, thinly encapsulated tumour') && r.microscopy.includes('\n\n(B) Sections show salivary gland tissue with acinar atrophy'));
  assert.ok(r.microscopy.includes('A calculus is present within a dilated duct, in keeping with sialolithiasis. The features are those of chronic sialadenitis. There is no evidence of malignancy.'));
  const dx = r.diagnosis.split('\n');
  assert.equal(dx[0], '(A) PAROTID, left, superficial parotidectomy - PLEOMORPHIC ADENOMA; completely excised');
  assert.equal(dx[1], '(B) SUBMANDIBULAR GLAND, right, excision - CHRONIC SIALADENITIS; sialolithiasis; no evidence of malignancy');
  assert.equal(r.comment, '');
});

test('each benign lesion option yields the house capitalised line and conclusion', () => {
  const w = run(one({ lesion: 'Warthin tumour', noduleDescription: 'Cystic with brown fluid', noduleSize: '3' }));
  assert.equal(w.diagnosis, 'PAROTID, left, superficial parotidectomy - WARTHIN TUMOUR; completely excised');
  assert.ok(w.macro.includes('Sectioning shows a cystic nodule containing brown fluid measuring 3 cm.'));
  assert.ok(w.microscopy.includes('bilayer of oncocytic epithelium, set in a lymphoid stroma with germinal centres. There is no cytological atypia. The features are those of Warthin tumour. The tumour is completely excised. The surrounding parotid tissue is unremarkable. There is no evidence of malignancy.'));
  assert.equal(run(one({ lesion: 'Basal cell adenoma', laterality: 'Right' })).diagnosis, 'PAROTID, right, superficial parotidectomy - BASAL CELL ADENOMA; completely excised');
  assert.equal(run(one({ lesion: 'Oncocytoma', procedure: 'Total parotidectomy' })).diagnosis, 'PAROTID, left, total parotidectomy - ONCOCYTOMA; completely excised');
  assert.equal(run(one({ lesion: 'Myoepithelioma' })).diagnosis, 'PAROTID, left, superficial parotidectomy - MYOEPITHELIOMA; completely excised');
  const lec = run(one({ lesion: 'Lymphoepithelial cyst', procedure: 'Excision of lesion' }));
  assert.equal(lec.diagnosis, 'PAROTID, left, excision - LYMPHOEPITHELIAL CYST; completely excised');
  assert.ok(lec.microscopy.includes('The features are those of a lymphoepithelial cyst. The lesion is completely excised.'));
  assert.ok(lec.macro.startsWith('Received in formalin is an excision specimen from the left parotid.'));
  const kut = run(one({ gland: 'Submandibular gland', procedure: 'Submandibular gland excision', lesion: 'Küttner tumour (chronic sclerosing sialadenitis)', noduleDescription: 'No discrete nodule' }));
  assert.equal(kut.diagnosis, 'SUBMANDIBULAR GLAND, left, excision - CHRONIC SCLEROSING SIALADENITIS (KUTTNER TUMOUR); no evidence of malignancy');
  assert.ok(kut.microscopy.includes('The features are those of chronic sclerosing sialadenitis (Kuttner tumour). There is no evidence of malignancy.'));
  assert.ok(!kut.microscopy.includes('surrounding submandibular gland tissue is unremarkable'));
  const node = run(one({ lesion: 'Intraparotid lymph node, reactive', procedure: 'Excision biopsy', laterality: 'Not stated' }));
  assert.equal(node.diagnosis, 'PAROTID, excision biopsy - REACTIVE LYMPHOID HYPERPLASIA, INTRAPAROTID LYMPH NODE; no evidence of malignancy');
  const muc = run(one({ gland: 'Minor salivary gland, lip', laterality: 'Not stated', procedure: 'Excision biopsy', lesion: 'Mucocoele / ranula', blocks: '1' }));
  assert.equal(muc.specimens, 'Minor salivary gland, lip, excision biopsy');
  assert.equal(muc.diagnosis, 'MINOR SALIVARY GLAND, lip, excision biopsy - MUCOCOELE (MUCUS EXTRAVASATION CYST); completely excised');
  assert.ok(muc.macro.startsWith('Received in formalin is an excision biopsy specimen from the lip.'));
  assert.ok(muc.macro.endsWith('Representative sections in 1 block.'));
  assert.equal(muc.blockKey, '(1) Nodule with closest margin.');
  assert.ok(muc.microscopy.includes('The features are those of a mucocoele (mucus extravasation cyst). The lesion is completely excised. The surrounding minor salivary gland tissue is unremarkable. There is no evidence of malignancy.'));
});

test('pleomorphic adenoma variants: stroma, capsule, satellites and margin drive the wording and the re-excision comment', () => {
  const hy = run(one({ stroma: 'Hyalinised', microCapsule: 'Focally thin' }));
  assert.ok(hy.microscopy.includes('The stroma is hyalinised. The capsule is focally thin and the tumour is completely excised.'));
  assert.equal(hy.comment, '');
  const br = run(one({ microCapsule: 'Breached', margin: 'Capsule breached at margin', grossCapsule: 'Breached' }));
  assert.ok(br.macro.includes('The capsule is focally breached.'));
  assert.ok(br.microscopy.includes('The capsule is focally breached, with tumour extending into the surrounding gland. The capsule is breached at the inked margin. The surrounding parotid tissue is unremarkable. There is no evidence of malignancy.'));
  assert.equal(br.diagnosis, 'PAROTID, left, superficial parotidectomy - PLEOMORPHIC ADENOMA; capsule breached at the inked margin');
  assert.equal(br.comment, 'Complete excision with an adequate cuff of normal tissue is advised as the risk of recurrence is increased.');
  const sat = run(one({ satellites: true, grossCapsule: 'Satellite nodule', margin: 'Tumour reaches inked margin' }));
  assert.ok(sat.macro.includes('A satellite nodule is present adjacent to the main nodule.'));
  assert.ok(sat.microscopy.includes('The capsule is intact. Satellite nodules are present in the adjacent gland. The tumour reaches the inked margin.'));
  assert.equal(sat.diagnosis, 'PAROTID, left, superficial parotidectomy - PLEOMORPHIC ADENOMA; satellite nodules present; tumour reaches the inked margin');
  assert.ok(sat.comment.includes('risk of recurrence is increased'));
  assert.equal(run(one({ lesion: 'Warthin tumour', satellites: true, microCapsule: 'Breached' })).comment, '', 'flag only applies to pleomorphic adenoma');
});

test('IgG4 pattern adds the immunostain / serum IgG4 comment; malignant option defers to the QMH salivary template', () => {
  const ig = run(one({ gland: 'Submandibular gland', procedure: 'Submandibular gland excision', lesion: 'Chronic sialadenitis', igg4: true, noduleDescription: 'No discrete nodule' }));
  assert.equal(ig.diagnosis, 'SUBMANDIBULAR GLAND, left, excision - CHRONIC SIALADENITIS; IgG4-related disease to be excluded - see comment; no evidence of malignancy');
  assert.ok(ig.microscopy.includes('raising the possibility of IgG4-related disease; see comment.'));
  assert.ok(ig.comment.includes('IgG4/IgG ratio') && ig.comment.includes('serum IgG4'));
  assert.ok(!ig.comment.includes('{parts}') && !ig.comment.includes('part A'));
  const mal = run(one({ lesion: 'Malignant - see comment', whoType: 'Mucoepidermoid carcinoma', lymphNodes: true, nodePositive: '1', nodeTotal: '2' }));
  assert.equal(mal.diagnosis, 'PAROTID, left, superficial parotidectomy - MUCOEPIDERMOID CARCINOMA; see comment; metastatic tumour in 1 of 2 intraparotid lymph nodes (1/2)');
  assert.equal(mal.microscopy, 'Sections show a malignant salivary gland neoplasm, mucoepidermoid carcinoma; see comment. Two intraparotid lymph nodes are identified, of which one shows metastatic tumour (1/2).');
  assert.ok(!mal.microscopy.includes('no evidence of malignancy'));
  assert.ok(mal.comment.includes('QMH salivary gland template') && mal.comment.includes('WHO 5th edition'));
  const malBlank = run(one({ lesion: 'Malignant - see comment' }));
  assert.equal(malBlank.diagnosis, 'PAROTID, left, superficial parotidectomy - MALIGNANT SALIVARY GLAND NEOPLASM; see comment');
  assert.equal(malBlank.microscopy, 'Sections show a malignant salivary gland neoplasm; see comment.');
});

test('lymph node and facial nerve inclusions', () => {
  const two = run(one({ lymphNodes: true, nodePositive: '0', nodeTotal: '2', facialNerve: true }));
  assert.ok(two.microscopy.includes('A segment of peripheral nerve is included and is unremarkable. There is no evidence of malignancy. Two intraparotid lymph nodes show reactive changes only (0/2).'));
  assert.equal(two.diagnosis, 'PAROTID, left, superficial parotidectomy - PLEOMORPHIC ADENOMA; completely excised; intraparotid lymph nodes with no evidence of malignancy (0/2)');
  const sm = run(one({ gland: 'Submandibular gland', procedure: 'Submandibular gland excision', lymphNodes: true, nodeTotal: '1' }));
  assert.ok(sm.microscopy.includes('One submandibular lymph node shows reactive changes only (0/1).'));
});

test('blank size, weight, nodule and margin fields produce no dangling text; sizes are normalised', () => {
  const r = run(one({ dimensions: '', weight: '', noduleSize: '', marginDistance: '', stone: true, stoneSize: '' }));
  assert.equal(r.macro, 'Received in formalin is a superficial parotidectomy specimen. Sectioning shows a well-circumscribed, glistening, grey-white nodule. A calculus is present within the duct. The surrounding parotid tissue is unremarkable. Representative sections in 5 blocks.');
  assert.ok(!r.report.includes('undefined') && !r.report.includes('__') && !r.report.includes('  ') && !r.report.includes('NaN'));
  const sized = run(one({ dimensions: '4.5X3x2', noduleSize: '1.5 x 1 cm', marginDistance: '15', noduleDescription: 'Firm, tan', grossBackground: 'Atrophic', weight: '7.5' }));
  assert.ok(sized.macro.includes('measuring 4.5 x 3 x 2 cm and weighing 7.5 g. Sectioning shows a firm, tan nodule measuring 1.5 x 1 cm, 1.5 cm from the closest inked margin. The surrounding parotid tissue is atrophic.'));
});

test('block key follows the block count', () => {
  assert.equal(run(one({ blocks: '3' })).blockKey, '(1) Nodule with closest margin. (2) Nodule with capsule. (3) Background gland.');
  assert.equal(run(one({ blocks: '2' })).blockKey, '(1) Nodule with closest margin. (2) Nodule with capsule.');
  assert.equal(run(one({ blocks: '8' })).blockKey, '(1-6) Nodule with closest margin. (7) Nodule with capsule. (8) Background gland.');
  assert.equal(run(one({ blocks: '3', noduleDescription: 'No discrete nodule' })).blockKey, '(1-3) Gland, representative sections.');
  assert.equal(run(one({ blocks: '1', noduleDescription: 'No discrete nodule', stone: true })).blockKey, '(1) Gland, representative sections.');
});
