import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate, generateCase } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { labelRange, frozenResult, ovSummary, lungSummary, organPhrase, stageable, PAIRED_TEMPLATE, PAIR_SEPARATE, pairTemplate, marginSummary, marginOrgan, PD, PD_SITES } from '../generators/frozen.js';

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
  assert.equal(out.macro, 'Received in a fresh state is a piece of tan coloured tissue measuring 1 x 0.4 x 0.2 cm. All embedded in 1 frozen block, and subsequently converted to paraffin block.');
  assert.equal(out.intraop, '(Prof. A Cheung / Dr. HY Tan)\nNo malignancy.\nThe frozen section result was phone reported at 1321 on 13/05/2026.');
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
  assert.equal(out.macro, 'Received in a fresh state is a lymph node measuring 2 x 1.5 x 1 cm. Serially sectioned and all embedded in 2 frozen blocks, and subsequently converted to paraffin blocks.');
  assert.equal(out.intraop, 'Metastatic carcinoma present (macrometastasis, 4 mm).');
  assert.equal(out.diagnosis, 'RIGHT SLN1, frozen section - METASTATIC CARCINOMA (macrometastasis, 4 mm) (1/1)');
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
  assert.equal(out.diagnosis, 'PERITONEAL NODULE, frozen section - FIBROUS TISSUE with CHRONIC INFLAMMATION; NO MALIGNANCY');
});

test('multiple pieces: aggregate wording and representative sampling', () => {
  const cs = part(fsCase(1), 0, { pieces: '3', size: '2.3 x 0.5 x 0.3 cm', handling: 'Representative section taken', blocks: '2' });
  assert.equal(generate(schema, generator, cs).macro, 'Received in a fresh state are three pieces of tan coloured tissue measuring 2.3 x 0.5 x 0.3 cm in aggregate. Representative section taken and embedded in 2 frozen blocks, and subsequently converted to paraffin blocks. The remainder is formalin fixed.');
});

test('mixed case: frozen parts sit alongside a paraffin biopsy template and only frozen parts feed the intraoperative block', () => {
  const cs = fsCase(2, { fsTime: '1134', fsDate: '10/09/2026', fsReportedTo: 'Dr Lee (OT 3)' });
  part(cs, 0, { specimenName: 'Tongue, medial margin' });
  const prostate = registry.prostate_biopsy.schema;
  const pcase = createCase(prostate, 1);
  cs.parts[1] = { label: 'B', templateId: 'prostate_biopsy', values: pcase.parts[0].values };
  const out = generateCase(registry, cs);
  assert.equal(out.intraop, '(A) No malignancy.\nThe frozen section result was phone reported to Dr Lee (OT 3) at 1134 on 10/09/2026.');
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
  assert.ok(text.includes('INTRAOPERATIVE CONSULTATION:\nNo malignancy.\nThe frozen section result was phone reported at 1321 on 13/05/2026.\n'));
});

// ---------- Ovarian / adnexal mass scenario, enriched fields (spec: docs/specs/ovary-pair.md, Part 1) ----------

const OVX = { scenario: 'Ovarian / adnexal mass', ovSide: 'Right', ovSpecimen: 'Salpingo-oophorectomy', ovSizeMm: '120', ovWeightG: '350', ovCut: ['Multilocular cyst', 'Mucinous contents', 'Solid areas'], ovBlocks: '2' };
const ovRun = (values, caseFields) => generate(schema, generator, part(fsCase(1, caseFields), 0, { specimenName: 'Right ovary', ...values }));

test('ovarian form macro, mucinous caveat and "x frozen section" diagnosis line', () => {
  const out = ovRun({ ...OVX, ovType: 'mucinous cystadenoma' });
  assert.equal(out.macro, 'Received in a fresh state is a right salpingo-oophorectomy specimen received intact. The ovarian mass measures 120 mm in greatest dimension and weighs 350 g. The outer surface is smooth. Cut surface shows a multilocular cyst, mucinous contents and solid areas. Representative sections of the solid and papillary areas are embedded in 2 frozen blocks, and subsequently converted to paraffin blocks.');
  assert.equal(out.intraop, 'Benign; mucinous cystadenoma. Mucinous tumours are heterogeneous; the frozen section cannot exclude a higher-grade or invasive component, or a metastasis from a gastrointestinal primary. Final classification awaits paraffin sections.');
  assert.equal(out.diagnosis, 'OVARY AND FALLOPIAN TUBE, right, salpingo-oophorectomy x frozen section - MUCINOUS CYSTADENOMA');
  assert.equal(out.microscopy, 'The paraffin section confirms the frozen section diagnosis. It shows features of mucinous cystadenoma. There is no evidence of malignancy.');
  const quiet = ovRun({ ...OVX, ovType: 'mucinous cystadenoma', ovCaveat: ['None (suppress the automatic mucinous caveat)'] });
  assert.equal(quiet.intraop, 'Benign; mucinous cystadenoma.');
  // Generic wording is untouched while the specimen pick is blank.
  const generic = ovRun({ scenario: 'Ovarian / adnexal mass', ovType: 'mucinous cystadenoma', size: '5 cm' });
  assert.equal(generic.macro, 'Received in a fresh state is a piece of tan coloured tissue measuring 5 cm. All embedded in 1 frozen block, and subsequently converted to paraffin block.');
  assert.equal(generic.diagnosis, 'RIGHT OVARY, frozen section - MUCINOUS CYSTADENOMA');
});

test('ovarian results: non-neoplastic, borderline, at least borderline, malignant, favour metastatic', () => {
  const nn = ovRun({ ...OVX, ovSpecimen: 'Ovarian cystectomy', ovaryResult: 'Non-neoplastic', ovType: 'follicular or corpus luteum cyst', ovCut: ['Unilocular cyst', 'Serous fluid'], ovBlocks: '1' });
  assert.equal(nn.intraop, 'Non-neoplastic; follicular or corpus luteum cyst.');
  assert.equal(nn.diagnosis, 'OVARY, right, cystectomy x frozen section - FOLLICULAR OR CORPUS LUTEUM CYST');
  assert.ok(nn.macro.includes('The cyst measures 120 mm in greatest dimension') && nn.macro.endsWith('Representative sections are embedded in 1 frozen block, and subsequently converted to paraffin block.'));
  const bl = ovRun({ ...OVX, ovaryResult: 'Borderline', ovType: 'serous borderline tumour' });
  assert.equal(bl.intraop, 'Borderline tumour, serous type; no stromal invasion in the sections examined.');
  assert.equal(bl.diagnosis, 'OVARY AND FALLOPIAN TUBE, right, salpingo-oophorectomy x frozen section - SEROUS BORDERLINE TUMOUR');
  assert.ok(bl.microscopy.endsWith('There is no evidence of stromal invasion.'));
  const al = ovRun({ ...OVX, ovaryResult: 'Borderline, at least (invasion cannot be excluded)', ovType: 'mucinous borderline tumour', ovReceived: 'Ruptured, capsule defect present on receipt' });
  assert.equal(al.intraop, 'At least borderline mucinous tumour; an invasive component cannot be excluded on frozen section. Mucinous tumours are heterogeneous; the frozen section cannot exclude a higher-grade or invasive component, or a metastasis from a gastrointestinal primary. Final classification awaits paraffin sections.');
  assert.equal(al.microscopy, 'The paraffin sections show features of mucinous borderline tumour. The presence or absence of stromal invasion is assessed on the paraffin sections.');
  assert.equal(al.diagnosis, 'OVARY AND FALLOPIAN TUBE, right, salpingo-oophorectomy x frozen section - AT LEAST MUCINOUS BORDERLINE TUMOUR; see microscopic examination');
  assert.ok(al.macro.includes('salpingo-oophorectomy specimen with a capsular defect present on receipt.'));
  assert.ok(al.issues.some((i) => i.level === 'info' && /IC1 \(surgical spill\) versus IC2/.test(i.message)));
  const alp = ovRun({ ...OVX, ovaryResult: 'Borderline, at least (invasion cannot be excluded)', ovType: 'mucinous borderline tumour', paraffinDx: 'Mucinous carcinoma, expansile pattern' });
  assert.equal(alp.diagnosis, 'OVARY AND FALLOPIAN TUBE, right, salpingo-oophorectomy x frozen section - MUCINOUS CARCINOMA, EXPANSILE PATTERN');
  const m = ovRun({ ...OVX, ovaryResult: 'Malignant', ovType: 'high-grade serous carcinoma', ovSurface: 'Excrescences or papillary projections' });
  assert.equal(m.intraop, 'Malignant; carcinoma, favour high-grade serous carcinoma.');
  assert.equal(m.diagnosis, 'OVARY AND FALLOPIAN TUBE, right, salpingo-oophorectomy x frozen section - HIGH-GRADE SEROUS CARCINOMA');
  assert.equal(m.microscopy, 'The paraffin section confirms the frozen section diagnosis. It shows features of high-grade serous carcinoma.');
  assert.ok(m.macro.includes('The outer surface bears papillary excrescences.'));
  const g = ovRun({ ...OVX, ovaryResult: 'Malignant', ovType: 'adult granulosa cell tumour' });
  assert.equal(g.intraop, 'Malignant; favour adult granulosa cell tumour.');
  const mb = ovRun({ ...OVX, ovaryResult: 'Malignant', ovType: 'mucinous carcinoma' });
  assert.ok(mb.issues.some((i) => /consider a metastasis/.test(i.message)));
  const met = ovRun({ ...OVX, ovaryResult: 'Malignant, favour metastatic', ovType: 'metastatic adenocarcinoma, favour gastrointestinal / appendiceal' });
  assert.equal(met.intraop, 'Malignant; adenocarcinoma, favour metastatic from a gastrointestinal primary.');
  assert.equal(met.diagnosis, 'OVARY AND FALLOPIAN TUBE, right, salpingo-oophorectomy x frozen section - METASTATIC ADENOCARCINOMA, favour a gastrointestinal or appendiceal primary');
  assert.ok(!met.microscopy.includes('no evidence of malignancy'));
  const met2 = ovRun({ ...OVX, ovaryResult: 'Malignant, favour metastatic', ovType: 'metastatic carcinoma, primary not determined' });
  assert.equal(met2.intraop, 'Malignant; carcinoma, favour metastatic; primary site not determined on frozen section.');
  assert.equal(met2.diagnosis.split(' - ')[1], 'METASTATIC CARCINOMA, primary site not determined');
  const d = ovRun({ ...OVX, ovaryResult: 'Deferred' });
  assert.equal(d.intraop, 'Deferred to paraffin sections.');
  assert.ok(d.issues.some((i) => i.level === 'warn' && /reason for deferral/.test(i.message)));
  const d2 = ovRun({ ...OVX, ovaryResult: 'Deferred', ovCaveat: ['Frozen artefact — deferred'] });
  assert.equal(d2.intraop, 'Deferred to paraffin sections. Freezing artefact precludes a definitive interpretation.');
  assert.ok(!d2.issues.some((i) => /reason for deferral/.test(i.message)));
  const many = ovRun({ ...OVX, ovBlocks: '5' });
  assert.ok(many.issues.some((i) => /5 frozen blocks/.test(i.message)));
});

test('ovSummary carries the frozen values the linked synoptic is pre-filled from', () => {
  const v = { ...OVX, ovaryResult: 'Malignant', ovType: 'high-grade serous carcinoma' };
  assert.deepEqual(ovSummary(v), { side: 'Right', specimen: 'Salpingo-oophorectomy', received: 'Intact', sizeMm: 120, weightG: 350, surface: 'Smooth', result: 'Malignant', type: 'high-grade serous carcinoma', caveats: [] });
  assert.equal(ovSummary({ scenario: 'Margin' }), null);
  assert.equal(ovSummary({ scenario: 'Ovarian / adnexal mass', ovType: 'other (specify)', tumourType: 'Sertoli-Leydig cell tumour' }).type, 'Sertoli-Leydig cell tumour');
});

// ---------- Lung wedge / nodule scenario (spec: docs/specs/lung-pair.md, Part (a)) ----------
const LUX = { scenario: 'Lung wedge / nodule', luSide: 'Left', luLobe: 'Lower lobe', luSize: '6 x 2 x 1.5', luStapleCm: '6', luNoduleCm: '0.8', luMarginCm: '0.5', luBlocks: '2', luPattern: 'acinar predominant' };
const luRun = (values, caseFields) => generate(schema, generator, part(fsCase(1, caseFields), 0, { specimenName: 'Lung, left lower lobe wedge', ...values }));

test('lung wedge: house §10 macro, intraoperative line, plural paraffin correlation and the organ phrase', () => {
  const a = luRun(LUX);
  assert.equal(a.macro, 'Received fresh, a wedge of lung tissue measuring 6 x 2 x 1.5 cm with a curvilinear staple line measuring 6 cm across. The staple line is trimmed off and submitted separately. The parenchymal margin is inked black. Sectioning reveals a firm tan-white nodule measuring 0.8 cm across, 0.5 cm from the staple-line margin. Representative sections of the nodule are embedded in 2 frozen blocks, and subsequently converted to paraffin blocks; the remaining tissue is submitted for paraffin sections only.');
  assert.equal(a.intraop, 'Adenocarcinoma; parenchymal margin clear (5 mm).');
  assert.equal(a.microscopy, 'The paraffin sections confirm the frozen section diagnosis. They show adenocarcinoma, acinar predominant.');
  assert.equal(a.diagnosis, 'LUNG, left lower lobe, wedge excision x frozen section - ADENOCARCINOMA, parenchymal margin clear (5 mm)');
  assert.ok(a.issues.some((i) => i.level === 'info' && /Stage this part/.test(i.message)), 'malignant without a linked part -> info');
  assert.ok(!a.issues.some((i) => /Close parenchymal margin/.test(i.message)));
  const node = luRun({ ...LUX, luNode: true, luNodeResult: 'Involved, with extranodal extension' });
  assert.ok(node.microscopy.endsWith('An intrapulmonary lymph node is identified, showing involvement by metastatic carcinoma with extranodal extension.'));
  const two = luRun({ ...LUX, luNoduleCount: '2', luSecondCm: '0.2', luSecondDistCm: '2', luPleuraGross: 'Puckered', luMarginCm: '0.3' });
  assert.ok(two.macro.includes('Sectioning reveals two firm tan-white nodules; the largest measures 0.8 cm across, 0.3 cm from the staple-line margin, and a second nodule measures 0.2 cm across, 2 cm from the main nodule. The overlying pleura is puckered.'), two.macro);
  assert.ok(two.issues.some((i) => i.level === 'warn' && /Close parenchymal margin \(3 mm\)/.test(i.message)));
  const close = luRun({ ...LUX, lungMargin: 'Close (< 5 mm)', luMarginCm: '0.3' });
  assert.equal(close.intraop, 'Adenocarcinoma; parenchymal margin close (3 mm).');
  assert.equal(close.diagnosis.split(' - ')[1], 'ADENOCARCINOMA, parenchymal margin close (3 mm)');
  const inv = luRun({ ...LUX, lungMargin: 'Involved', lungResult: 'Squamous cell carcinoma' });
  assert.equal(inv.intraop, 'Squamous cell carcinoma; parenchymal margin involved.');
});

test('lung wedge: every result line, benign closings and the deferred / lepidic paths', () => {
  const line = (values) => luRun({ ...LUX, ...values }).intraop;
  assert.equal(line({ lungResult: 'Adenocarcinoma, lepidic-predominant or in situ (extent deferred)' }), 'Adenocarcinoma with a lepidic pattern; the extent of invasion is deferred to paraffin sections; parenchymal margin clear (5 mm).');
  assert.ok(luRun({ ...LUX, lungResult: 'Adenocarcinoma, lepidic-predominant or in situ (extent deferred)' }).issues.some((i) => /pTis \(AIS\), pT1mi/.test(i.message)));
  assert.equal(line({ lungResult: 'Non-small cell carcinoma, not further classifiable on frozen', luFavour: 'adenocarcinoma', lungMargin: 'Not applicable' }), 'Non-small cell carcinoma, favour adenocarcinoma; subtyping on paraffin sections.');
  assert.equal(line({ lungResult: 'Small cell carcinoma', lungMargin: 'Not applicable' }), 'Small cell carcinoma.');
  assert.equal(line({ lungResult: 'Carcinoid tumour', lungMargin: 'Not applicable' }), 'Carcinoid tumour.');
  assert.equal(line({ lungResult: 'Metastatic carcinoma', tumourType: 'adenocarcinoma', luPrimary: 'colorectal', lungMargin: 'Not applicable' }), 'Metastatic adenocarcinoma, consistent with the known colorectal primary.');
  assert.equal(luRun({ ...LUX, lungResult: 'Metastatic carcinoma', tumourType: 'adenocarcinoma', luPrimary: 'colorectal' }).diagnosis.split(' - ')[1], 'METASTATIC ADENOCARCINOMA, consistent with colorectal primary');
  assert.equal(line({ lungResult: 'Necrotising granulomatous inflammation' }), 'Necrotising granulomatous inflammation; no tumour identified.');
  const gran = luRun({ ...LUX, lungResult: 'Necrotising granulomatous inflammation' });
  assert.equal(gran.microscopy, 'The paraffin sections confirm the frozen section diagnosis. They show necrotising granulomatous inflammation. There is no evidence of malignancy.');
  assert.equal(gran.diagnosis.split(' - ')[1], 'NECROTISING GRANULOMATOUS INFLAMMATION, no evidence of malignancy');
  assert.ok(!gran.issues.some((i) => /Stage this part/.test(i.message)));
  assert.equal(line({ lungResult: 'Organising pneumonia' }), 'Organising pneumonia; no tumour identified.');
  assert.equal(line({ lungResult: 'Benign, no tumour identified', luNoduleCount: '0' }), 'No tumour identified in the tissue examined.');
  assert.ok(luRun({ ...LUX, lungResult: 'Benign, no tumour identified', luNoduleCount: '0' }).macro.includes('Sectioning reveals no discrete lesion. Representative sections are embedded'));
  const d = luRun({ ...LUX, lungResult: 'Deferred', paraffinDx: 'Invasive adenocarcinoma' });
  assert.equal(d.intraop, 'Deferred to paraffin sections.');
  assert.equal(d.microscopy, 'The frozen section diagnosis was deferred. The paraffin section shows the lesion described. The features are those of invasive adenocarcinoma.');
  assert.equal(d.diagnosis.split(' - ')[1], 'INVASIVE ADENOCARCINOMA');
});

test('lung wedge: organ phrase per specimen type; lungSummary and stageable feed the linked synoptic', () => {
  const p = (values) => ({ label: 'B', values: { ...LUX, ...values } });
  assert.equal(organPhrase(p({})), 'LUNG, left lower lobe, wedge excision x frozen section');
  assert.equal(organPhrase(p({ luSpecimen: 'Segmentectomy' })), 'LUNG, left lower lobe, segmentectomy x frozen section');
  assert.equal(organPhrase(p({ luSpecimen: 'Pleural nodule, punch' })), 'PLEURA, left, punch biopsy x frozen section');
  assert.equal(organPhrase(p({ luSide: '', luLobe: '' })), 'LUNG, wedge excision x frozen section');
  assert.deepEqual(lungSummary({ ...LUX, luNode: true, luNodeResult: 'Involved' }), { side: 'Left', lobe: 'Lower lobe', specimen: 'Wedge excision', sizeCm: '6 x 2 x 1.5', nodules: '1', largestMm: 8, secondMm: null, marginMm: 5, pleura: 'Not involved grossly', node: true, nodeResult: 'Involved', result: 'Adenocarcinoma', favour: '', primary: '', pattern: 'acinar predominant', margin: 'Clear' });
  assert.equal(lungSummary({ scenario: 'Margin' }), null);
  assert.equal(stageable(p({})), true);
  assert.equal(stageable(p({ lungResult: 'Organising pneumonia' })), false);
  assert.equal(stageable({ label: 'A', values: { scenario: 'Ovarian / adnexal mass', ovaryResult: 'Malignant' } }), true);
  assert.equal(stageable({ label: 'A', values: { scenario: 'Margin', marginResult: 'Positive' } }), false);
  assert.equal(PAIRED_TEMPLATE['Lung wedge / nodule'], 'lung_carcinoma');
});

// ---- pancreatic / bile duct margin (Whipple pair, split g) -------------------------------------

test('pancreatic / bile duct margin: result line, final diagnosis and the site table', () => {
  const v = (extra) => ({ specimenName: 'Pancreatic neck margin', scenario: PD, pdSite: 'Pancreatic neck (transection)', pdOrigin: 'Pancreatic', pdResult: 'Negative', ...extra });
  const line = (extra) => frozenResult({ label: 'A', values: v(extra) });
  assert.equal(PD, 'Pancreatic / bile duct margin');
  assert.deepEqual(Object.keys(PD_SITES), ['Pancreatic neck (transection)', 'Bile duct', 'Uncinate (superior mesenteric artery)', 'Pancreatic duct', 'Proximal (gastric or duodenal)', 'Distal (duodenal or jejunal)']);
  assert.equal(line(), 'No carcinoma or dysplasia at the pancreatic neck margin.');
  assert.equal(line({ pdResult: 'Carcinoma present at margin' }), 'Carcinoma present at the pancreatic neck margin.');
  assert.equal(line({ pdResult: 'Carcinoma close to margin', pdDistanceMm: '0.6' }), 'No carcinoma at the pancreatic neck margin; carcinoma approaches to within 0.6 mm.');
  assert.equal(line({ pdSite: 'Bile duct', pdResult: 'High-grade dysplasia only' }), 'High-grade dysplasia at the bile duct margin; no invasive carcinoma.');
  assert.equal(line({ pdResult: 'Atypical, deferred' }), 'Atypical epithelium at the pancreatic neck margin; deferred to paraffin sections.');
});

test('pancreatic / bile duct margin: pairing, margin summary and checks', () => {
  const base = { specimenName: 'Bile duct margin', scenario: PD, pdSite: 'Bile duct', pdOrigin: 'Ampullary', pdResult: 'Carcinoma close to margin', pdDistanceMm: '0.6' };
  // The shaving is a separate specimen, so the synoptic takes its own letter.
  assert.equal(PAIR_SEPARATE[PD], true);
  assert.equal(pairTemplate(base), 'ampulla_carcinoma');
  assert.equal(pairTemplate({ ...base, pdOrigin: 'Pancreatic' }), 'pancreas_carcinoma');
  assert.equal(pairTemplate({ ...base, pdOrigin: 'Distal bile duct' }), 'pancreas_carcinoma');
  assert.equal(stageable({ label: 'A', values: base }), true, 'a negative margin can still add the resection');
  assert.deepEqual(marginSummary(base), { site: 'Bile duct', field: 'bileDuctMargin', mmField: 'bileDuctMarginMm', result: 'Carcinoma close to margin', distanceMm: 0.6, origin: 'Ampullary', involved: false });
  assert.equal(marginSummary({ scenario: 'Margin' }), null);
  const check = (values) => generator.validate({ label: 'A', values: { ...base, ...values } }, {}).map((i) => i.message);
  assert.ok(check({}).some((m) => /0\.6 mm/.test(m) && /R1/.test(m)), 'a clearance of 1 mm or less warns');
  assert.ok(!check({ pdDistanceMm: '4' }).some((m) => /R1/.test(m)));
  assert.ok(check({ pdResult: 'Carcinoma close to margin', pdDistanceMm: '' }).some((m) => /distance/i.test(m)));
});

// Reported 22/09/2026: a skin margin received as skin still printed the tongue phrase "squamous
// mucosa with underlying skeletal muscle". The benign margin default was one hardcoded string for
// every organ, so the microscopy contradicted a macro that said "a piece of skin".
test('benign margin microscopy follows the organ, not a fixed tongue phrase', () => {
  const shows = (values) => {
    const cs = fsCase(1);
    part(cs, 0, { scenario: 'Margin', marginResult: 'Negative', ...values });
    return (generate(schema, generator, cs).microscopy.match(/shows (.+?)\. There/) || [])[1];
  };
  assert.equal(shows({ mgOrgan: 'SKIN', tissueDesc: 'skin' }), 'skin');
  assert.equal(shows({ mgOrgan: 'TONGUE' }), 'squamous mucosa with underlying skeletal muscle');
  assert.equal(shows({ mgOrgan: 'LARYNX' }), 'squamous mucosa');
  assert.equal(shows({ mgOrgan: 'NASAL CAVITY' }), 'respiratory mucosa');
  assert.equal(shows({ mgOrgan: 'STOMACH' }), 'gastric tissue');
  assert.equal(shows({ mgOrgan: 'BREAST' }), 'fibrofatty breast tissue');
  // The typed specimen name carries the organ when the dropdown is left blank, which is the common
  // case because the dropdown only builds the head line when the name is empty.
  assert.equal(shows({ specimenName: 'Tongue, medial margin' }), 'squamous mucosa with underlying skeletal muscle');
  assert.equal(shows({ specimenName: 'Skin, lateral margin' }), 'skin');
});

test('the tissue-as-received gate only fires on a histological signal', () => {
  const shows = (values) => {
    const cs = fsCase(1);
    part(cs, 0, { scenario: 'Margin', marginResult: 'Negative', mgOrgan: 'TONGUE', ...values });
    return (generate(schema, generator, cs).microscopy.match(/shows (.+?)\. There/) || [])[1];
  };
  // Colour-only descriptors describe the container, not the section: the organ must still win.
  assert.equal(shows({ tissueDesc: 'tan coloured tissue' }), 'squamous mucosa with underlying skeletal muscle');
  assert.equal(shows({ tissueDesc: 'greyish tissue' }), 'squamous mucosa with underlying skeletal muscle');
  assert.equal(shows({ tissueDesc: 'other' }), 'squamous mucosa with underlying skeletal muscle');
  // "mucosa" is generic, so the organ refines it rather than being overridden by it.
  assert.equal(shows({ tissueDesc: 'mucosa' }), 'squamous mucosa with underlying skeletal muscle');
  // Skin and lymph node are identities, not colours, so they do win.
  assert.equal(shows({ tissueDesc: 'skin' }), 'skin');
  assert.equal(shows({ tissueDesc: 'lymph node' }), 'lymph node tissue');
});

test('a margin with no organ asks rather than inventing, and a mismatch warns', () => {
  const run = (values) => {
    const cs = fsCase(1);
    part(cs, 0, { scenario: 'Margin', marginResult: 'Negative', ...values });
    const out = generate(schema, generator, cs);
    return { shows: (out.microscopy.match(/shows (.+?)\. There/) || [])[1], issues: out.issues };
  };
  const bare = run({ specimenName: 'Left superior margin' });
  assert.equal(bare.shows, 'the tissue described');
  assert.ok(bare.issues.some((i) => i.level === 'info' && /nothing to describe/.test(i.message)));
  // Typing the tissue seen answers it, so the check goes away.
  const typed = run({ specimenName: 'Left superior margin', tissue: 'fibroadipose tissue and skeletal muscle' });
  assert.equal(typed.shows, 'fibroadipose tissue and skeletal muscle');
  assert.equal(typed.issues.length, 0);
  // Skin off a gastric margin is implausible: print what was recorded, but say so.
  const clash = run({ mgOrgan: 'STOMACH', tissueDesc: 'skin' });
  assert.equal(clash.shows, 'skin');
  assert.ok(clash.issues.some((i) => i.level === 'warn' && /Received as skin but the organ is STOMACH/.test(i.message)));
  // A skin shave off a breast or vulval excision is routine and must not warn.
  for (const organ of ['BREAST', 'VULVA', 'SKIN', 'SOFT TISSUE']) {
    assert.equal(run({ mgOrgan: organ, tissueDesc: 'skin' }).issues.length, 0, `${organ} should not warn`);
  }
});

test('the margin organ parser does not claim pancreatic or biliary duct margins', () => {
  // Those are the separate PD scenario with its own wording; a wrong call here would print liver.
  assert.equal(marginOrgan({ specimenName: 'Liver, pancreatic duct margin' }), '');
  assert.equal(marginOrgan({ specimenName: 'Distal pancreatic margin' }), '');
  // An explicit dropdown choice is always honoured over the typed name.
  assert.equal(marginOrgan({ mgOrgan: 'BONE', specimenName: 'Tongue, deep margin' }), 'BONE');
});

test('positive margins are untouched by the tissue default', () => {
  const cs = fsCase(1);
  part(cs, 0, { scenario: 'Margin', marginResult: 'Positive', mgOrgan: 'SKIN', tissueDesc: 'skin', tumourType: 'Squamous cell carcinoma' });
  assert.match(generate(schema, generator, cs).microscopy, /It shows infiltrating squamous cell carcinoma involving the margin\./);
});
