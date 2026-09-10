import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate, generateCase } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { labelRange, frozenResult } from '../generators/frozen.js';

const registry = await loadAll();
const { schema, generator } = registry.frozen_section;

function fsCase(n, caseFields = {}) {
  const cs = createCase(schema, n);
  Object.assign(cs, caseFields);
  return cs;
}
function part(cs, i, values) { Object.assign(cs.parts[i].values, values); return cs; }

test('frozen section template is registered', () => {
  assert.equal(schema.generator, 'frozen');
  assert.equal(schema.shortName, 'Frozen section');
  assert.equal(schema.label, 'Frozen');
  assert.equal(schema.kind, 'frozen');
  assert.ok(registry.frozen_section.generator.intraop && registry.frozen_section.generator.macro);
});

test('benign tongue margin: macro, intraoperative record, paraffin confirmation and house diagnosis line', () => {
  const cs = fsCase(1, { fsPathologists: 'Prof. A Cheung / Dr. HY Tan', fsTime: '1321', fsDate: '13/05/2026' });
  part(cs, 0, { specimenName: 'Tongue, medial margin', size: '1 x 0.4 x 0.2 cm' });
  const out = generate(schema, generator, cs);
  assert.equal(out.specimens, 'Frozen section: Tongue, medial margin');
  assert.equal(out.macro, 'Received in a fresh state is a piece of tan coloured tissue measuring 1 x 0.4 x 0.2 cm. All embedded in 1 frozen block and subsequently converted to paraffin block.');
  assert.equal(out.intraop, '(Prof. A Cheung / Dr. HY Tan)\nNo malignancy.\nThe frozen section diagnosis was phone reported at 1321 on 13/05/2026.');
  assert.equal(out.microscopy, 'The paraffin section confirms the frozen section diagnosis. It shows squamous mucosa with underlying skeletal muscle. There is no evidence of dysplasia or malignancy.');
  assert.equal(out.diagnosis, 'TONGUE, medial margin, frozen section - NO EVIDENCE OF MALIGNANCY');
  assert.ok(!out.report.includes('(A)'), 'single part drops the letter');
});

test('report block order is specimens, macro, intraop, microscopy, diagnosis with headers', () => {
  const cs = fsCase(1, { fsTime: '0900' });
  cs.options.includeHeader = true;
  const heads = generate(schema, generator, cs).report.split('\n').filter((l) => /^[A-Z ]+:$/.test(l));
  assert.deepEqual(heads, ['SPECIMEN:', 'MACROSCOPIC DESCRIPTION:', 'INTRAOPERATIVE CONSULTATION:', 'MICROSCOPIC EXAMINATION:', 'DIAGNOSIS:']);
});

test('macro option off removes the macroscopic block; phone sentence omitted when no time', () => {
  const cs = fsCase(1);
  cs.options.macro = false;
  const out = generate(schema, generator, cs);
  assert.equal(out.macro, '');
  assert.equal(out.intraop, 'No malignancy.');
  assert.ok(!out.report.includes('phone reported'));
});

test('identical frozen results are grouped into a letter range, like (A)-(D) No malignancy.', () => {
  const cs = fsCase(5, { fsPathologists: 'Dr. F Loong / Dr. HY Tan' });
  ['Tongue, medial margin', 'Tongue, posterior margin', 'Tongue, deep margin', 'Tongue, anterior margin'].forEach((n, i) => part(cs, i, { specimenName: n }));
  part(cs, 4, { specimenName: 'Right SLN1', scenario: 'Lymph node', tissueDesc: 'lymph node' });
  const out = generate(schema, generator, cs);
  assert.equal(out.intraop, '(Dr. F Loong / Dr. HY Tan)\n(A)-(D) No malignancy.\n(E) Negative for malignancy.');
  assert.equal(out.specimens, 'Frozen section: (A) Tongue, medial margin, (B) Tongue, posterior margin, (C) Tongue, deep margin, (D) Tongue, anterior margin and (E) Right SLN1');
  assert.ok(out.diagnosis.includes('(E) RIGHT SLN1, frozen section - NO EVIDENCE OF MALIGNANCY'));
});

test('labelRange: pairs and non-consecutive letters are listed, not ranged', () => {
  assert.equal(labelRange(['A', 'B']), '(A) and (B)');
  assert.equal(labelRange(['A', 'C', 'D']), '(A), (C) and (D)');
  assert.equal(labelRange(['B', 'C', 'D']), '(B)-(D)');
});

test('positive margin: tumour type carried into the frozen result, microscopy and diagnosis', () => {
  const cs = fsCase(1);
  part(cs, 0, { specimenName: 'Tongue, anterior margin', marginResult: 'Positive', tumourType: 'squamous cell carcinoma' });
  const out = generate(schema, generator, cs);
  assert.equal(out.intraop, 'Squamous cell carcinoma present at the margin.');
  assert.equal(out.microscopy, 'The paraffin section confirms the frozen section diagnosis. It shows infiltrating squamous cell carcinoma involving the margin.');
  assert.equal(out.diagnosis, 'TONGUE, anterior margin, frozen section - INVOLVED BY SQUAMOUS CELL CARCINOMA');
});

test('close margin and dysplasia-only wording', () => {
  const close = part(fsCase(1), 0, { specimenName: 'Buccal mucosa, inferior margin', marginResult: 'Close', marginDistance: '1.5', tumourType: 'squamous cell carcinoma' });
  assert.equal(frozenResult(close.parts[0]), 'No malignancy at the margin; squamous cell carcinoma approaches to within 1.5 mm.');
  assert.equal(generate(schema, generator, close).diagnosis, 'BUCCAL MUCOSA, inferior margin, frozen section - NO EVIDENCE OF MALIGNANCY; squamous cell carcinoma within 1.5 mm of the margin');
  const dys = part(fsCase(1), 0, { specimenName: 'Tongue, lateral margin', marginResult: 'Dysplasia only', dysplasiaGrade: 'Severe' });
  const out = generate(schema, generator, dys);
  assert.equal(out.intraop, 'Severe dysplasia; no invasive malignancy.');
  assert.equal(out.diagnosis, 'TONGUE, lateral margin, frozen section - SEVERE DYSPLASIA; no evidence of invasive malignancy');
  assert.ok(out.microscopy.endsWith('There is no evidence of invasive malignancy.'));
});

test('sentinel node with macrometastasis', () => {
  const cs = part(fsCase(1), 0, { specimenName: 'Right SLN1', scenario: 'Lymph node', tissueDesc: 'lymph node', handling: 'Serially sectioned and all embedded', blocks: '2', size: '2 x 1.5 x 1 cm', nodeResult: 'Macrometastasis', metSize: '4', tumourType: 'carcinoma' });
  const out = generate(schema, generator, cs);
  assert.equal(out.macro, 'Received in a fresh state is a lymph node measuring 2 x 1.5 x 1 cm. Serially sectioned and all embedded in 2 frozen blocks and subsequently converted to paraffin blocks.');
  assert.equal(out.intraop, 'Metastatic carcinoma present (macrometastasis, 4 mm).');
  assert.equal(out.diagnosis, 'RIGHT SLN1, frozen section - METASTATIC CARCINOMA (macrometastasis, 4 mm)');
  assert.ok(!out.microscopy.includes('no evidence of malignancy'));
});

test('parathyroid identification has no malignancy sentence', () => {
  const cs = part(fsCase(1), 0, { specimenName: 'Right inferior parathyroid', scenario: 'Parathyroid', tissueDesc: 'other', tissueDescOther: 'brownish nodular tissue', size: '0.6 x 0.4 x 0.3' });
  const out = generate(schema, generator, cs);
  assert.ok(out.macro.includes('a piece of brownish nodular tissue measuring 0.6 x 0.4 x 0.3 cm'), 'cm appended');
  assert.equal(out.intraop, 'Parathyroid tissue, hypercellular.');
  assert.equal(out.microscopy, 'The paraffin section confirms the frozen section diagnosis. It shows hypercellular parathyroid tissue composed predominantly of chief cells with a paucity of stromal fat.');
  assert.equal(out.diagnosis, 'RIGHT INFERIOR PARATHYROID, frozen section - HYPERCELLULAR PARATHYROID TISSUE');
  const thy = part(fsCase(1), 0, { specimenName: 'Left superior parathyroid', scenario: 'Parathyroid', parathyroidResult: 'Thyroid tissue' });
  assert.equal(generate(schema, generator, thy).diagnosis, 'LEFT SUPERIOR PARATHYROID, frozen section - THYROID TISSUE; no parathyroid tissue identified');
});

test('ovarian mass: benign, borderline and malignant with favoured type', () => {
  const b = part(fsCase(1), 0, { specimenName: 'Left ovarian cyst', scenario: 'Ovarian / adnexal mass', tumourType: 'mucinous cystadenoma' });
  const ob = generate(schema, generator, b);
  assert.equal(ob.intraop, 'Benign; mucinous cystadenoma.');
  assert.equal(ob.diagnosis, 'LEFT OVARIAN CYST, frozen section - MUCINOUS CYSTADENOMA');
  const bl = part(fsCase(1), 0, { specimenName: 'Right ovary', scenario: 'Ovarian / adnexal mass', ovaryResult: 'Borderline', tumourType: 'mucinous tumour' });
  const obl = generate(schema, generator, bl);
  assert.equal(obl.intraop, 'Borderline tumour, mucinous tumour.');
  assert.ok(obl.microscopy.endsWith('There is no evidence of stromal invasion.'));
  const m = part(fsCase(1), 0, { specimenName: 'Right ovary', scenario: 'Ovarian / adnexal mass', ovaryResult: 'Malignant', tumourType: 'favour high grade serous carcinoma' });
  const om = generate(schema, generator, m);
  assert.equal(om.intraop, 'Malignant; favour high grade serous carcinoma.');
  assert.equal(om.diagnosis, 'RIGHT OVARY, frozen section - FAVOUR HIGH GRADE SEROUS CARCINOMA');
});

test('deferred at frozen: paraffin diagnosis supplies the final line', () => {
  const cs = part(fsCase(1), 0, { specimenName: 'Right lung nodule', scenario: 'Nodule / mass', noduleResult: 'Deferred', paraffinDx: 'Adenocarcinoma', tissue: 'lung parenchyma infiltrated by an acinar-predominant adenocarcinoma' });
  const out = generate(schema, generator, cs);
  assert.equal(out.intraop, 'Deferred to paraffin sections.');
  assert.equal(out.microscopy, 'The frozen section diagnosis was deferred. The paraffin section shows lung parenchyma infiltrated by an acinar-predominant adenocarcinoma. The features are those of adenocarcinoma.');
  assert.equal(out.diagnosis, 'RIGHT LUNG NODULE, frozen section - ADENOCARCINOMA');
});

test('discordant paraffin result records the reason and overrides the diagnosis', () => {
  const cs = part(fsCase(1), 0, { specimenName: 'Tongue, medial margin', correlation: 'Discordant', discordanceReason: 'Sampling', paraffinDx: 'Squamous cell carcinoma involving the margin', tissue: 'a focus of infiltrating squamous cell carcinoma at the inked margin' });
  const out = generate(schema, generator, cs);
  assert.equal(out.microscopy, 'The paraffin section shows a focus of infiltrating squamous cell carcinoma at the inked margin. The features are those of squamous cell carcinoma involving the margin. This is discordant with the frozen section diagnosis (no malignancy); the discrepancy is attributed to sampling.');
  assert.equal(out.diagnosis, 'TONGUE, medial margin, frozen section - SQUAMOUS CELL CARCINOMA INVOLVING THE MARGIN');
});

test('free-text scenario and additional microscopy', () => {
  const cs = part(fsCase(1), 0, { specimenName: 'Peritoneal nodule', scenario: 'Other', freeResult: 'Fibrous tissue with chronic inflammation; no malignancy', additionalNotes: 'A foreign body giant cell reaction is noted.' });
  const out = generate(schema, generator, cs);
  assert.equal(out.intraop, 'Fibrous tissue with chronic inflammation; no malignancy.');
  assert.ok(out.microscopy.endsWith('There is no evidence of malignancy. A foreign body giant cell reaction is noted.'));
  assert.equal(out.diagnosis, 'PERITONEAL NODULE, frozen section - FIBROUS TISSUE WITH CHRONIC INFLAMMATION; NO MALIGNANCY');
});

test('multiple pieces: aggregate wording and representative sampling', () => {
  const cs = part(fsCase(1), 0, { pieces: '3', size: '2.3 x 0.5 x 0.3 cm', handling: 'Representative section taken', blocks: '2' });
  assert.equal(generate(schema, generator, cs).macro, 'Received in a fresh state are three pieces of tan coloured tissue measuring 2.3 x 0.5 x 0.3 cm in aggregate. Representative section taken and embedded in 2 frozen blocks and subsequently converted to paraffin blocks. The remainder is formalin fixed.');
});

test('mixed case: frozen parts sit alongside a paraffin biopsy template and only frozen parts feed the intraoperative block', () => {
  const cs = fsCase(2, { fsTime: '1134', fsDate: '10/09/2026', fsReportedTo: 'Dr Lee (OT 3)' });
  part(cs, 0, { specimenName: 'Tongue, medial margin' });
  const prostate = registry.prostate_biopsy.schema;
  const pcase = createCase(prostate, 1);
  cs.parts[1] = { label: 'B', templateId: 'prostate_biopsy', values: pcase.parts[0].values };
  const out = generateCase(registry, cs);
  assert.equal(out.intraop, '(A) No malignancy.\nThe frozen section diagnosis was phone reported at 1134 on 10/09/2026 to Dr Lee (OT 3).');
  assert.ok(out.macro.startsWith('(A) Received in a fresh state'));
  assert.ok(out.diagnosis.startsWith('(A) TONGUE, medial margin, frozen section - NO EVIDENCE OF MALIGNANCY\n(B) '));
});

test('example case renders every block without a generator error', () => {
  const cs = createCase(schema, 0);
  Object.assign(cs, schema.example, { schemaId: schema.id, schemaVersion: schema.version });
  cs.parts = schema.example.parts.map((p) => ({ label: p.label, values: { ...p.values } }));
  const out = generate(schema, generator, cs);
  for (const k of ['specimens', 'macro', 'intraop', 'microscopy', 'diagnosis']) assert.ok(out[k].trim(), k);
  assert.ok(out.intraop.includes('(A)-(C) No malignancy.'));
  assert.ok(out.intraop.includes('(D) Squamous cell carcinoma present at the margin.'));
});

test('Google Doc layout gains an INTRAOPERATIVE CONSULTATION section and merges generated macro with typed macro', async () => {
  const { buildDocText } = await import('../src/docformat.js');
  const cs = fsCase(1, { fsTime: '1321', fsDate: '13/05/2026' });
  cs.meta = { accession: 'S26-0001', status: 'draft', clinical: '', macro: 'Specimen received in two containers.', blockKey: '' };
  const out = generate(schema, generator, cs);
  const text = buildDocText(cs, out);
  const heads = text.split('\n').filter((l) => /^[A-Z ]+:$/.test(l));
  assert.deepEqual(heads, ['CLINICAL HISTORY:', 'SPECIMEN:', 'MACROSCOPIC DESCRIPTION:', 'BLOCK KEY:', 'INTRAOPERATIVE CONSULTATION:', 'MICROSCOPIC EXAMINATION:', 'DIAGNOSIS:']);
  assert.ok(text.includes('converted to paraffin block.\n\nSpecimen received in two containers.\n'));
  assert.ok(text.includes('INTRAOPERATIVE CONSULTATION:\nNo malignancy.\nThe frozen section diagnosis was phone reported at 1321 on 13/05/2026.\n'));
});
