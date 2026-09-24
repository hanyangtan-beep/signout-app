// Phase 4b: soft tissue (lipoma / benign lesion) template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/softtissue.js';
import { sizePhrase, largestDimensionCm, lesionPhrase, flags } from '../generators/softtissue.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('soft_tissue_benign');
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  Object.assign(c.options, options);
  return c;
};
const HEAD = 'SOFT TISSUE, lipoma, excision';

test('metadata: benign soft tissue resection with search aliases and complete defaults', () => {
  assert.equal(schema.id, 'soft_tissue_benign');
  assert.equal(schema.generator, 'softtissue');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Soft tissue');
  assert.equal(schema.label, 'Lipoma');
  assert.equal(schema.organ, 'SOFT TISSUE');
  assert.equal(schema.name, 'Soft tissue (benign)');
  assert.equal(schema.rank, 35);
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['lipoma', 'angiolipoma', 'schwannoma', 'ganglion', 'nodular fasciitis', 'haemangioma', 'fatty']) assert.ok(schema.aliases.includes(a), `alias ${a}`);
  assert.equal(schema.maxParts, 3);
  assert.equal(schema.defaultParts, 1);
  for (const f of schema.fields) assert.ok('default' in f, `${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is a field`);
  for (const id of ids) assert.ok(id in schema.example.parts[0].values, `example carries ${id}`);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  assert.deepEqual(macroFields, ['dimensions', 'weight', 'description', 'cutSurface', 'cutSurfaceOther', 'capsule', 'blocks']);
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  const dx = schema.fields.find((f) => f.id === 'diagnosis');
  // 16 original + 20 added 2026-09-24 (benign batch 1: docs/roadmap.md, Soft tissue — benign template upgrade).
  assert.equal(dx.options.length, 36);
  assert.equal(dx.default, 'Lipoma');
});

test('helpers: size, largest dimension and lesion phrase', () => {
  assert.equal(sizePhrase('6x4x2.5'), '6 x 4 x 2.5 cm');
  assert.equal(sizePhrase('6 X 4 × 2.5 cm'), '6 x 4 x 2.5 cm');
  assert.equal(sizePhrase(''), '');
  assert.equal(largestDimensionCm('6 x 4 x 2.5'), 6);
  assert.equal(largestDimensionCm('12x8x5 cm'), 12);
  assert.equal(largestDimensionCm('45 mm'), 4.5);
  assert.equal(largestDimensionCm(''), null);
  assert.equal(lesionPhrase({ site: 'right thigh', clinicalLabel: 'lipoma' }), 'right thigh lipoma');
  assert.equal(lesionPhrase({ site: '', clinicalLabel: 'lipoma' }), 'lipoma');
  assert.equal(lesionPhrase({ site: '', clinicalLabel: '' }), '');
});

test('example: right thigh lipoma, 6 cm, 30 g, fat necrosis, completely excised', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Right thigh lipoma, excision');
  assert.equal(r.macro, 'Received in formalin is a lobulated piece of yellow fatty tissue labelled right thigh lipoma, measuring 6 x 4 x 2.5 cm and weighing 30 g. The cut surface is homogeneous and yellow. Representative sections in 3 blocks.');
  assert.equal(r.blockKey, '(1-3) Lesion with capsule, representative sections.');
  assert.equal(r.microscopy, 'Sections show partially encapsulated fibroadipose tissue composed of lobules of mature adipocytes separated by thin fibrous septa. Fat necrosis is seen in areas. No atypical stromal cells or lipoblasts are observed. The findings are in keeping with lipoma. The lesion is completely excised. There is no evidence of malignancy.');
  assert.equal(r.diagnosis, 'SOFT TISSUE, right thigh lipoma, excision - LIPOMA; completely excised');
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('(A)'));
  assert.ok(!r.report.includes('undefined'));
});

test('default single part is a lipoma excision without site', () => {
  const r = run(createCase(schema, 1));
  assert.equal(r.specimens, 'Lipoma, excision');
  assert.equal(r.macro, 'Received in formalin is a lobulated piece of yellow fatty tissue labelled lipoma. The cut surface is homogeneous and yellow. Representative sections in 3 blocks.');
  assert.equal(r.microscopy, 'Sections show partially encapsulated fibroadipose tissue composed of lobules of mature adipocytes separated by thin fibrous septa. No atypical stromal cells or lipoblasts are observed. The findings are in keeping with lipoma. The lesion is completely excised. There is no evidence of malignancy.');
  assert.equal(r.diagnosis, `${HEAD} - LIPOMA; completely excised`);
});

test('typed specimen name overrides the built one', () => {
  const r = run(one({ specimenName: 'Lump right forearm' }));
  assert.equal(r.specimens, 'Lump right forearm');
});

test('macro option off removes the macroscopic description and block key', () => {
  const r = run(one({}, { macro: false }));
  assert.equal(r.macro, '');
  assert.equal(r.blockKey, '');
  assert.ok(!r.report.includes('Received in formalin'));
  assert.ok(!r.report.includes('Lesion with capsule'));
  assert.ok(r.report.startsWith('Lipoma, excision\n\nSections show'));
});

test('headers option labels the macro and block key blocks', () => {
  const r = run(one({}, { includeHeader: true }));
  assert.ok(r.report.includes('MACROSCOPIC DESCRIPTION:\nReceived in formalin'));
  assert.ok(r.report.includes('BLOCK KEY:\n(1-3) Lesion with capsule, representative sections.'));
});

test('two-part case keeps (A)/(B) prefixes on every block', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, site: 'right thigh', dimensions: '6 x 4 x 2.5' };
  c.parts[1].values = { ...c.parts[1].values, site: 'left forearm', clinicalLabel: 'nodule', diagnosis: 'Schwannoma', description: 'Well-circumscribed firm tan-white nodule', cutSurface: 'Whorled tan-white', blocks: '2' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Right thigh lipoma, excision\n(B) Left forearm nodule, excision');
  assert.ok(r.macro.startsWith('(A) Received in formalin is a lobulated piece of yellow fatty tissue labelled right thigh lipoma, measuring 6 x 4 x 2.5 cm.'));
  assert.ok(r.macro.includes('\n\n(B) Received in formalin is a well-circumscribed firm tan-white nodule labelled left forearm nodule. The cut surface is whorled and tan-white. Representative sections in 2 blocks.'));
  assert.equal(r.blockKey, '(A) (1-3) Lesion with capsule, representative sections.\n(B) (1-2) Lesion with capsule, representative sections.');
  assert.ok(r.microscopy.startsWith('(A) Sections show partially encapsulated fibroadipose tissue'));
  assert.ok(r.microscopy.includes('\n\n(B) Sections show a well-circumscribed, encapsulated spindle cell tumour'));
  assert.equal(r.diagnosis.split('\n')[0], '(A) SOFT TISSUE, right thigh lipoma, excision - LIPOMA; completely excised');
  assert.equal(r.diagnosis.split('\n')[1], '(B) SOFT TISSUE, left forearm nodule, excision - SCHWANNOMA; completely excised');
});

test('each diagnosis option yields the right capitalised diagnosis', () => {
  const dx = (diagnosis) => run(one({ diagnosis, margins: 'Not assessable' })).diagnosis;
  assert.equal(dx('Lipoma'), `${HEAD} - LIPOMA`);
  assert.equal(dx('Angiolipoma'), `${HEAD} - ANGIOLIPOMA`);
  assert.equal(dx('Fibrolipoma'), `${HEAD} - FIBROLIPOMA`);
  assert.equal(dx('Spindle cell lipoma'), `${HEAD} - SPINDLE CELL LIPOMA`);
  assert.equal(dx('Hibernoma'), `${HEAD} - HIBERNOMA`);
  assert.equal(dx('Schwannoma'), `${HEAD} - SCHWANNOMA`);
  assert.equal(dx('Neurofibroma'), `${HEAD} - NEUROFIBROMA`);
  assert.equal(dx('Ganglion cyst'), `${HEAD} - GANGLION CYST`);
  assert.equal(dx('Nodular fasciitis'), `${HEAD} - NODULAR FASCIITIS`);
  assert.equal(dx('Cavernous haemangioma'), `${HEAD} - CAVERNOUS HAEMANGIOMA`);
  assert.equal(dx('Leiomyoma'), `${HEAD} - LEIOMYOMA`);
  assert.equal(dx('Intramuscular myxoma'), `${HEAD} - INTRAMUSCULAR MYXOMA`);
  assert.equal(dx('Fibroma'), `${HEAD} - FIBROMA`);
  assert.equal(dx('Epidermal cyst'), `${HEAD} - EPIDERMAL CYST`);
  assert.equal(dx('Atypical lipomatous tumour – see comment'), `${HEAD} - ATYPICAL LIPOMATOUS TUMOUR; see comment`);
  assert.equal(dx('Sarcoma – see comment'), `${HEAD} - SARCOMA; see comment`);
});

test('house diagnosis lines: angiolipoma resection and skin schwannoma', () => {
  const a = run(one({ site: 'right thigh', clinicalLabel: 'lipoma', procedure: 'Resection', diagnosis: 'Angiolipoma', margins: 'Not assessable' }));
  assert.equal(a.diagnosis, 'SOFT TISSUE, right thigh lipoma, resection - ANGIOLIPOMA');
  assert.equal(a.specimens, 'Right thigh lipoma, resection');
  assert.equal(a.microscopy, 'Sections show a well-circumscribed benign adipocytic neoplasm composed predominantly of mature adipocytes admixed with numerous small thin walled capillary-sized vessels, with focal peripheral accentuation. Intraluminal fibrin thrombi are present. No significant cytologic atypia, lipoblasts, tumour necrosis, or increased mitotic activity are identified. The findings are in keeping with angiolipoma. There is no evidence of malignancy.');
  const s = run(one({ organ: 'SKIN', site: 'left breast', clinicalLabel: 'skin nodule', procedure: 'Resection', diagnosis: 'Schwannoma', margins: 'Not assessable' }));
  assert.equal(s.diagnosis, 'SKIN, left breast skin nodule, resection - SCHWANNOMA');
  assert.equal(s.microscopy, 'Sections show a well-circumscribed, encapsulated spindle cell tumour composed of compact hypercellular Antoni A areas with nuclear palisading forming Verocay bodies, alternating with loose hypocellular Antoni B areas. Thick-walled hyalinised vessels are present. There is no significant cytological atypia, necrosis or increased mitotic activity. The tumour cells are diffusely and strongly positive for S100. The findings are in keeping with schwannoma. There is no evidence of malignancy.');
});

test('margins: complete adds the clause, incomplete names the inked margin, not assessable adds nothing', () => {
  assert.equal(run(one({ margins: 'Complete' })).diagnosis, `${HEAD} - LIPOMA; completely excised`);
  const inc = run(one({ margins: 'Incomplete – reaches inked margin' }));
  assert.equal(inc.diagnosis, `${HEAD} - LIPOMA; lesion reaches the inked margin`);
  assert.ok(inc.microscopy.includes('The lesion reaches the inked margin. There is no evidence of malignancy.'));
  const na = run(one({ margins: 'Not assessable', procedure: 'Biopsy' }));
  assert.equal(na.diagnosis, 'SOFT TISSUE, lipoma, biopsy - LIPOMA');
  assert.ok(!na.microscopy.includes('excised'));
});

test('IHC text is folded into the microscopy and replaces the default schwannoma S100 sentence', () => {
  const r = run(one({ diagnosis: 'Schwannoma', ihc: 'S100 and SOX10 positive; CD34 negative', margins: 'Complete' }));
  assert.ok(!r.microscopy.includes('diffusely and strongly positive for S100'));
  assert.ok(r.microscopy.includes('The findings are in keeping with schwannoma. Immunohistochemistry: S100 and SOX10 positive; CD34 negative. The lesion is completely excised. There is no evidence of malignancy.'));
  const l = run(one({ ihc: 'MDM2 FISH recommended', margins: 'Not assessable' }));
  assert.ok(l.microscopy.endsWith('The findings are in keeping with lipoma. Immunohistochemistry: MDM2 FISH recommended. There is no evidence of malignancy.'));
});

test('encapsulation, mitoses sentence and additional notes', () => {
  const r = run(one({ encapsulation: 'Well circumscribed and encapsulated', mitosesSentence: true, additionalNotes: 'Skeletal muscle is included at one edge.' }));
  assert.equal(r.microscopy, 'Sections show well-circumscribed, encapsulated fibroadipose tissue composed of lobules of mature adipocytes separated by thin fibrous septa. No atypical stromal cells or lipoblasts are observed. No increased mitotic activity or necrosis is seen. The findings are in keeping with lipoma. The lesion is completely excised. There is no evidence of malignancy. Skeletal muscle is included at one edge.');
  assert.ok(run(one({ encapsulation: 'Unencapsulated, ill-defined' })).microscopy.startsWith('Sections show ill-defined, unencapsulated fibroadipose tissue'));
  // Paragraphs carrying their own negative sentence do not repeat it.
  const n = run(one({ diagnosis: 'Neurofibroma', mitosesSentence: true }));
  assert.ok(!n.microscopy.includes('No increased mitotic activity or necrosis is seen.'));
  assert.ok(!n.microscopy.includes('No atypical stromal cells'));
});

test('macro variants: description, cut surface, capsule, blocks and weight', () => {
  const r = run(one({ description: 'Cystic with gelatinous contents', cutSurface: 'Myxoid', capsule: 'Not identified', dimensions: '3x2x2', weight: '4.5', blocks: '1', site: 'left wrist', clinicalLabel: 'ganglion', diagnosis: 'Ganglion cyst' }));
  assert.equal(r.macro, 'Received in formalin is a cystic lesion containing gelatinous material labelled left wrist ganglion, measuring 3 x 2 x 2 cm and weighing 4.5 g. The cut surface is glistening and myxoid. No capsule is identified. Representative sections in 1 block.');
  assert.equal(r.blockKey, '(1) Lesion with capsule, representative sections.');
  const n = run(one({ description: 'Ill-defined fibrofatty tissue', cutSurface: 'Necrotic areas – describe', cutSurfaceOther: 'Yellow with a 1 cm area of necrosis', capsule: 'Partially encapsulated', blocks: '5' }));
  assert.equal(n.macro, 'Received in formalin is an ill-defined piece of fibrofatty tissue labelled lipoma. The cut surface is yellow with a 1 cm area of necrosis. The lesion is partially encapsulated. Representative sections in 5 blocks.');
  assert.ok(run(one({ cutSurface: 'Necrotic areas – describe', cutSurfaceOther: '' })).macro.includes('The cut surface shows areas of necrosis.'));
  assert.ok(run(one({ cutSurface: 'Haemorrhagic' })).macro.includes('The cut surface is haemorrhagic.'));
});

test('blank size, weight, site and label fields produce no dangling text', () => {
  const r = run(one({ dimensions: '', weight: '', site: '', clinicalLabel: '' }));
  assert.equal(r.specimens, 'Soft tissue, excision');
  assert.equal(r.macro, 'Received in formalin is a lobulated piece of yellow fatty tissue. The cut surface is homogeneous and yellow. Representative sections in 3 blocks.');
  assert.equal(r.diagnosis, 'SOFT TISSUE, excision - LIPOMA; completely excised');
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.report.includes('__'));
  assert.ok(!r.report.includes('  '));
  assert.ok(!/\bcm\b/.test(r.macro));
  assert.ok(!/\bg\b/.test(r.macro));
  const w = run(one({ dimensions: '', weight: '12' }));
  assert.ok(w.macro.includes('labelled lipoma, weighing 12 g.'));
});

test('large or deep benign adipocytic tumour pre-ticks the MDM2 comment', () => {
  const big = run(one({ dimensions: '12 x 8 x 5' }));
  assert.equal(big.comment, 'For a deep-seated or large (>10 cm) adipocytic tumour, MDM2 amplification testing may be considered to exclude atypical lipomatous tumour.');
  assert.ok(!big.diagnosis.includes('see comment'));
  const deep = run(one({ site: 'right thigh, deep intramuscular', dimensions: '5 x 4 x 3' }));
  assert.equal(deep.comment, big.comment);
  assert.equal(run(one({ dimensions: '10 x 6 x 4' })).comment, '');
  assert.equal(run(one({ dimensions: '12 x 8 x 5', diagnosis: 'Schwannoma' })).comment, '');
  assert.deepEqual(flags([{ values: { diagnosis: 'Lipoma', dimensions: '11', site: '' } }]), ['largeDeepAdipocytic']);
  assert.deepEqual(flags([{ values: { diagnosis: 'Lipoma', dimensions: '4', site: 'left forearm' } }]), []);
});

test('atypical lipomatous tumour / sarcoma / atypical cells give a short line and the sarcoma template comment', () => {
  const alt = run(one({ diagnosis: 'Atypical lipomatous tumour – see comment', dimensions: '15 x 10 x 8', margins: 'Incomplete – reaches inked margin' }));
  assert.equal(alt.diagnosis, `${HEAD} - ATYPICAL LIPOMATOUS TUMOUR; lesion reaches the inked margin; see comment`);
  assert.ok(alt.microscopy.includes('scattered enlarged, hyperchromatic atypical stromal cells within thickened fibrous septa. The features raise the possibility of an atypical lipomatous tumour; see comment. The lesion reaches the inked margin.'));
  assert.ok(!alt.microscopy.includes('no evidence of malignancy'));
  assert.equal(alt.comment, 'An atypical or malignant mesenchymal tumour is identified. This benign template does not grade or stage the lesion. MDM2 amplification testing (FISH) is recommended for an atypical adipocytic tumour, and the QMH soft tissue sarcoma template should be used for the final synoptic report.');
  assert.ok(!alt.comment.includes('may be considered'));

  const sarc = run(one({ diagnosis: 'Sarcoma – see comment', margins: 'Not assessable' }));
  assert.equal(sarc.diagnosis, `${HEAD} - SARCOMA; see comment`);
  assert.ok(sarc.microscopy.startsWith('Sections show a malignant mesenchymal tumour'));
  assert.ok(sarc.comment.includes('QMH soft tissue sarcoma template'));

  const atyp = run(one({ atypicalCells: 'Present – see comment' }));
  assert.equal(atyp.diagnosis, `${HEAD} - LIPOMA; atypical stromal cells present; completely excised; see comment`);
  assert.ok(atyp.microscopy.includes('Scattered atypical stromal cells / lipoblasts are present; see comment.'));
  assert.ok(!atyp.microscopy.includes('There is no evidence of malignancy.'));
  assert.equal(atyp.comment, 'Atypical stromal cells / lipoblasts are present. MDM2 amplification testing (FISH) is recommended to exclude atypical lipomatous tumour; if confirmed, the QMH soft tissue sarcoma template should be used for the final report.');
  assert.ok(!atyp.comment.includes('may be considered'));

  const c = createCase(schema, 2);
  c.parts[1].values.diagnosis = 'Sarcoma – see comment';
  const two = run(c);
  assert.ok(two.comment.startsWith('An atypical or malignant mesenchymal tumour is identified (part B).'));
  assert.ok(!two.comment.includes('Atypical stromal cells / lipoblasts are present'));
});
