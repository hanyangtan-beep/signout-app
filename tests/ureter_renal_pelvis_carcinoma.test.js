// Ureter and renal pelvis urothelial carcinoma resection - Phase 83 (4 November 2026, user request).
// Its own form (GU, "Ureter / pelvis Ca"), in the QMH UG-Ureter element order, with the CAP Ureter, Renal Pelvis
// 2.4.0.0 options and the ICCR dataset (2nd edition), staged on the AJCC 8th edition (AJCC has no version 9 chapter
// for this site). Sources: docs/reference/upper-tract-sources.md. Staging: tests/staging_ureter_renal_pelvis.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTemplate, loadManifest } from '../src/registry.js';
import { createCase, generate, isVisible } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import * as gen from '../generators/ureter_renal_pelvis_carcinoma.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const FIX = path.join(here, 'fixtures', 'ureter_renal_pelvis_carcinoma');
const UPDATE = process.env.UPDATE_FIXTURES === '1';
const { schema } = await loadTemplate('ureter_renal_pelvis_carcinoma');
const manifest = await loadManifest();
const field = (id) => schema.fields.find((f) => f.id === id);
const EXAMPLE = schema.example.parts[0].values;
const OPTIONS = schema.example.options;
const runParts = (list, options = {}) => {
  const c = createCase(schema, list.length);
  c.options = { ...c.options, ...OPTIONS, includeHeader: false, ...options };
  list.forEach((v, i) => { c.parts[i].values = { ...c.parts[i].values, ...v }; });
  return generate(schema, gen, c);
};
const run = (values = {}, options = {}) => runParts([{ ...EXAMPLE, ...values }], options);
const para = (r) => (r.report.match(/- Tumour histology:\n {2}(.*)/) || [])[1] || '';
const messages = (r) => r.issues.map((i) => i.message).join(' | ');
const warnings = (r) => r.issues.filter((i) => i.level !== 'info');
// The diagnosis block, its wrapped lines joined.
const dx = (r, head) => r.report.slice(r.report.lastIndexOf(head)).replace(/\n {2}/g, ' ');
const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line, history = '') => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
};
const PAP = 'Papillary urothelial carcinoma, non-invasive';
const CIS = 'Urothelial carcinoma in situ';
const CONV = 'Urothelial carcinoma, invasive (conventional)';
const NU_C = 'Nephroureterectomy, complete';
const NU_P = 'Nephroureterectomy, partial';
const URET = 'Ureterectomy';
const EXT = {
  Ta: 'Non-invasive papillary carcinoma', Tis: 'Carcinoma in situ', T1: 'Invades subepithelial connective tissue', T2: 'Invades the muscularis',
  pelvicFat: 'Invades beyond the muscularis into peripelvic fat', parenchyma: 'Invades the renal parenchyma',
  ureterFat: 'Invades beyond the muscularis into periureteric fat', perinephric: 'Invades through the kidney into perinephric fat',
  organs: 'Invades adjacent organs (specify)'
};
// A low-grade non-invasive papillary carcinoma of the lower ureter, resected by segmental ureterectomy.
const URETER_PTA = {
  ...EXAMPLE, procedure: URET, laterality: 'Right', tumourSite: ['Ureter'], ureterLevel: ['Lower'], tumourSizeMm: '12', focality: 'Unifocal',
  kidneyDims: '', specimenWeightG: '', ureterLengthMm: '45', ureterDiameterMm: '8', bladderCuff: '', lesionAppearance: 'Papillary tumour',
  lesionDims: '12 x 10 x 6', macroMarginMm: '15', macroMarginSite: 'distal ureteric', macroOther: '', blocks: '6',
  blockKeyText: '1 Proximal ureteric margin\n2 Distal ureteric margin\n3-6 Tumour', histType: PAP, grade: 'Low grade', configuration: ['Papillary'],
  lvi: 'Not identified', extension: [EXT.Ta], cisExtent: '', proximalMargin: 'Uninvolved', proximalMarginMm: '20', distalMargin: 'Uninvolved',
  distalMarginMm: '15', softTissueMargin: 'Uninvolved', softTissueMarginMm: '5', bladderCuffMargin: '', bladderCuffMarginMm: '',
  nodesExamined: '', nodesInvolved: '', additionalFindings: [], renal: [], renalDetail: '', mmrIhc: 'Not performed'
};

// ---------- metadata and menus ----------

test('upper tract: GU cancer resection, labelled Ureter / pelvis Ca, the QMH page saved, the placeholder gone', () => {
  assert.equal(schema.id, 'ureter_renal_pelvis_carcinoma');
  assert.equal(schema.system, 'GU');
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.label, 'Ureter / pelvis Ca');
  assert.equal(schema.organ, 'URETER AND RENAL PELVIS');
  assert.equal(manifest.find((t) => t.id === 'ureter_renal_pelvis_carcinoma')?.label, 'Ureter / pelvis Ca');
  assert.equal(schema.source.url, 'https://awiloqmh.github.io/CancerReportingTemplate/UG-Ureter.html');
  assert.equal(schema.source.capProtocol, 'https://documents.cap.org/documents/New-Cancer-Protocols-March-2025/UreterRenalPelvis.Res_2.4.0.0.REL.CAPCP.pdf');
  assert.ok(fs.existsSync(path.join(root, schema.source.savedPage)));
  assert.ok(fs.existsSync(path.join(root, schema.source.grounding)));
  assert.ok(fs.existsSync(path.join(root, 'docs/reference/qmh/ureter.txt')));
  const planned = JSON.parse(fs.readFileSync(path.join(root, 'templates/planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((t) => t.id === 'ureter_renal_pelvis_carcinoma' || t.qmh === 'UG-Ureter'));
  assert.equal(schema.options.find((o) => o.id === 'printPTNM' || o.$use === 'printPTNM')?.label, 'Print the pTNM block (AJCC 8th edition)');
});

test('upper tract: the example sets every field, and every field sits in a group', () => {
  for (const f of schema.fields) {
    assert.ok(Object.hasOwn(EXAMPLE, f.id), `example sets ${f.id}`);
    assert.ok(f.group, `${f.id} has a group`);
  }
  assert.deepEqual(warnings(run()), [], 'the example raises no warnings');
});

test('upper tract: the type list follows CAP; subtypes show for invasive urothelial carcinoma only; two grading systems', () => {
  const types = field('histType').options;
  for (const t of [PAP, CIS, CONV, 'Urothelial carcinoma, micropapillary', 'Urothelial carcinoma, plasmacytoid', 'Urothelial carcinoma with squamous differentiation',
    'Squamous cell carcinoma', 'Adenocarcinoma, enteric', 'Small cell neuroendocrine carcinoma', 'Carcinoma, type cannot be determined']) assert.ok(types.includes(t), t);
  const subtypes = field('subtypes');
  assert.equal(isVisible(subtypes, { ...EXAMPLE, histType: CONV }), true);
  assert.equal(isVisible(subtypes, { ...EXAMPLE, histType: 'Urothelial carcinoma with glandular differentiation' }), true);
  for (const t of [PAP, CIS, 'Squamous cell carcinoma']) assert.equal(isVisible(subtypes, { ...EXAMPLE, histType: t }), false, t);
  const grades = field('grade').options;
  for (const g of ['Low grade', 'High grade', 'G1, well differentiated', 'G2, moderately differentiated', 'G3, poorly differentiated']) assert.ok(grades.includes(g), g);
  assert.equal(isVisible(field('highGradePct'), { ...EXAMPLE, grade: 'G2, moderately differentiated' }), false);
  assert.equal(isVisible(field('renal'), { ...EXAMPLE, procedure: URET }), false, 'no kidney in a ureterectomy');
  assert.equal(isVisible(field('ureterLevel'), { ...EXAMPLE, tumourSite: ['Renal pelvis'] }), false);
  assert.equal(isVisible(field('otherMarginName'), { ...EXAMPLE, otherMargin: '' }), false);
});

test('upper tract: the form shows the margins the report prints, for each procedure and bladder cuff', () => {
  const ids = ['proximalMargin', 'distalMargin', 'bladderCuffMargin', 'softTissueMargin'];
  for (const procedure of [NU_P, NU_C, URET, 'Other (specify)']) {
    for (const bladderCuff of ['', 'Present', 'Not identified']) {
      const v = { ...EXAMPLE, procedure, bladderCuff };
      const shown = ids.filter((id) => isVisible(field(id), v));
      assert.deepEqual(gen.margins(v).map((m) => m.id), shown, `${procedure} / cuff ${bladderCuff || 'blank'}`);
    }
  }
  assert.deepEqual(gen.margins({ ...EXAMPLE, procedure: NU_C, bladderCuff: 'Present' }).map((m) => m.id), ['bladderCuffMargin', 'softTissueMargin']);
  assert.deepEqual(gen.margins({ ...EXAMPLE, procedure: NU_P, bladderCuff: '' }).map((m) => m.id), ['distalMargin', 'softTissueMargin']);
  assert.deepEqual(gen.margins({ ...EXAMPLE, procedure: URET, bladderCuff: '' }).map((m) => m.id), ['proximalMargin', 'distalMargin', 'softTissueMargin']);
});

// ---------- synoptic ----------

test('upper tract: one Tumour histology paragraph carries the type, grade, extent, morphology and immunohistochemistry', () => {
  assert.equal(para(run()), 'The tumour is a high-grade urothelial carcinoma invading the renal parenchyma. '
    + 'Irregular nests and single cells with nuclear pleomorphism, hyperchromasia and frequent mitoses infiltrate the stroma. '
    + 'There is also focal carcinoma in situ, in which flat urothelium shows loss of polarity and nuclear crowding, with enlarged, pleomorphic nuclei and mitoses in the mid to upper layers.');
  assert.equal(para(run(URETER_PTA)), 'The tumour is a low-grade non-invasive papillary urothelial carcinoma. '
    + 'Slender papillae with fibrovascular cores and minimal fusion are lined by orderly urothelium with mild nuclear pleomorphism; mitoses are confined to the lower half. '
    + 'There is no stromal invasion.');
  assert.match(para(run({ ...URETER_PTA, grade: 'High grade' })), /^The tumour is a high-grade non-invasive papillary urothelial carcinoma\. Fused and complex papillae /);
  assert.equal(para(run({ histType: CIS, grade: '', extension: [EXT.Tis], cisExtent: 'Multifocal' })), 'There is multifocal urothelial carcinoma in situ. '
    + 'Flat urothelium shows loss of polarity and nuclear crowding, with enlarged, pleomorphic nuclei and mitoses in the mid to upper layers.');
  assert.match(para(run({ histType: 'Urothelial carcinoma, micropapillary', extension: [EXT.ureterFat], tumourSite: ['Ureter'] })),
    /^The tumour is a high-grade micropapillary urothelial carcinoma invading beyond the muscularis into the periureteric fat\. Small nests of tumour cells without fibrovascular cores lie within lacunar spaces, several nests sharing one lacuna\.$/);
  const mixed = para(run({ subtypes: ['Sarcomatoid', 'Squamous differentiation'], extension: [EXT.parenchyma] }));
  assert.match(mixed, /infiltrate the stroma\. A sarcomatoid component of high-grade spindle cells is admixed with the urothelial carcinoma\. Part of the tumour shows squamous differentiation\.$/);
  assert.match(para(run({ histType: 'Squamous cell carcinoma', grade: 'G2, moderately differentiated', extension: [EXT.parenchyma] })),
    /^The tumour is a squamous cell carcinoma invading the renal parenchyma\. Irregular infiltrating nests and sheets of malignant squamous cells show keratinisation and intercellular bridges; there is no urothelial carcinoma component\.$/);
  assert.match(para(run({ extension: [EXT.organs], extensionOther: 'psoas muscle' })), /^The tumour is a high-grade urothelial carcinoma invading the psoas muscle\./);
  assert.match(para(run({ extension: [EXT.Tis] })), /^The tumour is a high-grade invasive urothelial carcinoma\./, 'no extent: "invasive" stays in the sentence');
  assert.match(para(run({ ihcOther: 'on immunohistochemistry, the tumour cells are positive for GATA3 and p63' })), /mid to upper layers\. On immunohistochemistry, the tumour cells are positive for GATA3 and p63\.$/);
  assert.equal(para(run({ histologyNotes: 'Typed microscopy replaces the generated sentences' })), 'Typed microscopy replaces the generated sentences.');
});

test('upper tract: rows for type, subtypes, grade, configuration, invasion and extension', () => {
  const r = run({ subtypes: ['Micropapillary'], subtypePercents: 'conventional 70%, micropapillary 30%', highGradePct: '' });
  assert.match(r.report, /\n- Histologic type: Urothelial carcinoma, invasive \(conventional\)\n/);
  assert.match(r.report, /\n- Subtypes and divergent differentiation: Micropapillary \(conventional 70%,\n {2}micropapillary 30%\)\n/);
  assert.match(r.report, /\n- Histologic grade: High grade\n/);
  assert.match(run({ ...URETER_PTA, highGradePct: '3' }).report, /\n- Histologic grade: Low grade \(high-grade component 3%\)\n/);
  assert.match(r.report, /\n- Tumour configuration: Papillary and solid \/ nodule\n/);
  assert.match(r.report, /\n- Lymphovascular invasion: Present\n- Perineural invasion: Not identified\n/);
  assert.match(r.report, /\n- Tumour extension: Invades the renal parenchyma; carcinoma in situ \(focal\)\n/);
  assert.match(run({ histType: 'Carcinoma, type cannot be determined', histTypeOther: 'extensive necrosis' }).report, /\n- Histologic type: Carcinoma, type cannot be determined \(extensive necrosis\)\n/);
});

test('upper tract: specimen line, site and macroscopy', () => {
  const r = run();
  assert.match(r.report, /^Kidney and ureter, left, nephroureterectomy\n/m);
  assert.equal(gen.specimenName({ values: URETER_PTA }), 'Ureter, right, ureterectomy');
  assert.equal(gen.specimenName({ values: { ...EXAMPLE, procedure: 'Other (specify)', procedureOther: 'Endoscopic resection', tumourSite: ['Ureter'], laterality: 'Not specified' } }),
    'Ureter, endoscopic resection');
  assert.match(r.report, /\n- Tumour site: Renal pelvis\n- Tumour size: 35 mm \(greatest dimension\)\n- Tumour focality: Unifocal\n/);
  assert.equal(gen.siteValue({ tumourSite: ['Renal pelvis', 'Ureter'], ureterLevel: ['Upper', 'Middle'] }), 'Renal pelvis and upper and middle ureter');
  assert.equal(gen.siteValue({ tumourSite: ['Cannot be determined'] }), 'Cannot be determined');
  assert.equal(gen.macro({ label: 'A', values: EXAMPLE }, { case: { parts: [{ label: 'A' }] }, options: {} }),
    'Received in formalin is a nephroureterectomy specimen comprising a kidney measuring 115 x 60 x 45 mm and a ureter measuring 240 mm in length and 6 mm in diameter, with a cuff of bladder. '
    + 'The specimen weighs 290 g. There is a papillary tumour in the renal pelvis measuring 35 x 25 x 15 mm, 25 mm from the closest (renal hilar soft tissue) margin. '
    + 'The renal pelvis and calyces are dilated. Representative sections are taken in 14 blocks.');
  assert.equal(gen.macro({ label: 'A', values: URETER_PTA }, { case: { parts: [{ label: 'A' }] }, options: {} }),
    'Received in formalin is a ureterectomy specimen comprising a segment of ureter measuring 45 mm in length and 8 mm in diameter. '
    + 'There is a papillary tumour in the lower ureter measuring 12 x 10 x 6 mm, 15 mm from the closest (distal ureteric) margin. Representative sections are taken in 6 blocks.');
  const none = gen.macro({ label: 'A', values: { ...EXAMPLE, procedure: NU_P, bladderCuff: 'Not identified', lesionAppearance: 'No macroscopic tumour', macroOther: '' } },
    { case: { parts: [{ label: 'A' }] }, options: {} });
  assert.match(none, /6 mm in diameter\. No bladder cuff is identified\. The specimen weighs 290 g\. No macroscopic tumour is seen\. Representative/);
  assert.match(run({ tumourSizeMm: '', lesionAppearance: 'No macroscopic tumour' }).report, /\n- Tumour size: No macroscopically visible tumour\n/);
});

test('upper tract: margins print one row each, in the QMH order, with the distance when uninvolved', () => {
  assert.match(run().report, /\nMargins\n- Bladder cuff margin: Uninvolved \(200 mm\)\n- Soft tissue margin: Uninvolved \(25 mm\)\n/);
  assert.match(run(URETER_PTA).report, /\nMargins\n- Proximal ureteric margin: Uninvolved \(20 mm\)\n- Distal ureteric margin: Uninvolved \(15 mm\)\n- Soft tissue margin: Uninvolved \(5 mm\)\n/);
  const other = run({ otherMargin: 'Involved by invasive carcinoma', otherMarginName: 'renal vein' });
  assert.match(other.report, /\n- Renal vein margin: Involved by invasive carcinoma\n/);
  assert.match(dx(other, 'KIDNEY AND URETER'), /; invasive carcinoma involves the renal vein margin; see synoptic report\n/);
  const cis = run({ bladderCuffMargin: 'Involved by carcinoma in situ', bladderCuffMarginMm: '' });
  assert.match(cis.report, /\n- Bladder cuff margin: Involved by carcinoma in situ\n/);
  assert.match(dx(cis, 'KIDNEY AND URETER'), /; carcinoma in situ at the bladder cuff margin; see synoptic report\n/);
  const both = run({ procedure: NU_P, bladderCuff: '', distalMargin: 'Involved by invasive carcinoma', softTissueMargin: 'Involved by invasive carcinoma', softTissueMarginMm: '' });
  assert.match(dx(both, 'KIDNEY AND URETER'), /; invasive carcinoma involves the distal ureteric and soft tissue margins; see synoptic report\n/);
  const lg = run({ ...URETER_PTA, proximalMargin: 'Involved by low-grade non-invasive papillary carcinoma', proximalMarginMm: '' });
  assert.match(dx(lg, 'URETER, right'), /; low-grade non-invasive papillary carcinoma at the proximal ureteric margin; see synoptic report\n/);
  assert.match(dx(run({ softTissueMargin: 'Cannot be assessed', softTissueMarginMm: '' }), 'KIDNEY AND URETER'), /; margins cannot be assessed; see synoptic report\n/);
  const blank = run({ bladderCuffMargin: '' });
  assert.match(dx(blank, 'KIDNEY AND URETER'), /with carcinoma in situ; see synoptic report\n/, 'a margin left blank: no margin clause');
  assert.match(messages(blank), /Bladder cuff margin not recorded\./);
});

test('upper tract: nodes, metastasis and pTNM; the stage group stays in Checks', () => {
  const r = run();
  assert.match(r.report, /\nLymph nodes\n- Regional lymph nodes: 3 examined; none involved\n/);
  assert.match(r.report, /\nPathological stage \(AJCC 8th edition\)\n- pTNM: pT3 pN0\n/);
  assert.doesNotMatch(r.report, /Stage group|\bIII\b/);
  assert.ok(r.issues.some((i) => i.level === 'info' && i.message === 'Stage group, AJCC 8th edition (reference, not reported): III'));
  assert.doesNotMatch(run({}, { printPTNM: false }).report, /pT3/);
  const n2 = run({ nodesExamined: '5', nodesInvolved: '2', ene: 'Present', largestDepositMm: '12', largestDepositSite: 'para-aortic', largestNodeMm: '15', largestNodeSite: 'para-aortic' });
  assert.match(n2.report, /\n- Regional lymph nodes: 5 examined; 2 involved\n {2}- Extranodal extension: Present\n {2}- Size of largest metastatic deposit: 12 mm \(para-aortic\)\n {2}- Size of largest lymph node involved: 15 mm \(para-aortic\)\n/);
  assert.match(n2.report, /- pTNM: pT3 pN2\n/);
  assert.match(dx(n2, 'KIDNEY AND URETER'), /\n- 2 of 5 regional lymph nodes involved; extranodal extension present\n- pT3 pN2 \(AJCC 8th edition\)$/);
  assert.match(run({ nodesInvolved: '1', largestDepositMm: '25', ene: 'Not identified' }).report, /- pTNM: pT3 pN2\n/, 'one node over 20 mm');
  assert.match(run({ nodesInvolved: '1', largestDepositMm: '8', ene: 'Not identified' }).report, /- pTNM: pT3 pN1\n/);
  const m1 = run({ distantMets: ['Lung'] });
  assert.match(m1.report, /\n- Distant metastasis: Lung\n/);
  assert.match(m1.report, /- pTNM: pT3 pN0 pM1\n/);
  const noNodes = run({ nodesExamined: '', nodesInvolved: '' });
  assert.doesNotMatch(noNodes.report, /Regional lymph nodes/);
  assert.match(noNodes.report, /- pTNM: pT3\n/);
  const y = run({ postTherapy: true, treatmentEffect: 'Present' });
  assert.match(y.report, /- pTNM: ypT3 ypN0\n/);
  assert.match(y.report, /\n- Treatment effect: Present\n/);
  const over = run({ tnmOverride: 'pT2 pN0', tnmOverrideReason: 'parenchymal involvement is in situ spread' });
  assert.match(over.report, /- pTNM: pT2 pN0 \[pathologist override; derived T3\/N0 - parenchymal involvement\n {2}is in situ spread\]\n/);
});

test('upper tract: the QMH element order, with the documented departures', () => {
  // The order the QMH page prints its report in (updateDescription in the saved page).
  const html = fs.readFileSync(path.join(root, 'docs/reference/UG-Ureter.html'), 'utf8');
  const fn = html.slice(html.indexOf('function updateDescription'));
  const all = [...fn.matchAll(/"(?:\\n)?"?\s*\+?\s*"?- ([A-Za-z0-9 ,/()-]+?):? ?"/g)].map((m) => m[1].trim());
  const qmh = all.slice(0, all.indexOf('Additional notes'));
  const want = ['Procedure', 'Specimen laterality', 'Tumor site', 'Tumor size', 'Tumor histology and immunohistochemical studies', 'Histologic type (WHO 5e)',
    'Histologic grade for urothelial carcinoma', 'Histologic grade for SCC or adenoCA', 'Tumor configuration', 'Lymphatic and / or Vascular Invasion',
    'Perineural invasion', 'Tumor extension', 'Proximal mucosal margin', 'Distal mucosal margin', 'Bladder cuff', 'Soft tissue margin', 'Other margin(s) (specify)',
    'Regional lymph nodes', 'Distant metastasis', 'Pathologic stage classification (pTNM, AJCC 8th edition)', 'Additional pathologic findings',
    'Associated epithelial lesions', 'Pathologic findings in ipsilateral nonneoplastic renal tissue'];
  const seen = want.map((w) => qmh.indexOf(w));
  assert.ok(seen.every((i) => i >= 0), `QMH labels found: ${qmh.join(' / ')}`);
  assert.deepEqual([...seen].sort((a, b) => a - b), seen, 'the saved QMH page prints in this order');
  const ours = {
    Procedure: 'Procedure', 'Specimen laterality': 'Specimen laterality', 'Tumor site': 'Tumour site', 'Tumor size': 'Tumour size',
    'Tumor histology and immunohistochemical studies': 'Tumour histology', 'Histologic type (WHO 5e)': 'Histologic type',
    'Histologic grade for urothelial carcinoma': 'Histologic grade', 'Tumor configuration': 'Tumour configuration',
    'Lymphatic and / or Vascular Invasion': 'Lymphovascular invasion', 'Perineural invasion': 'Perineural invasion', 'Tumor extension': 'Tumour extension',
    'Proximal mucosal margin': 'Proximal ureteric margin', 'Bladder cuff': 'Bladder cuff margin', 'Soft tissue margin': 'Soft tissue margin',
    'Other margin(s) (specify)': 'Renal vein margin', 'Regional lymph nodes': 'Regional lymph nodes', 'Distant metastasis': 'Distant metastasis',
    'Pathologic stage classification (pTNM, AJCC 8th edition)': 'pTNM', 'Additional pathologic findings': 'Additional findings',
    'Associated epithelial lesions': 'Associated epithelial lesions', 'Pathologic findings in ipsilateral nonneoplastic renal tissue': 'Ipsilateral non-neoplastic renal tissue'
  };
  // A specimen with a proximal ureteric margin, a bladder cuff, kidney and every optional row filled.
  const r = run({ procedure: 'Other (specify)', procedureOther: 'Ureterectomy with bladder cuff and partial nephrectomy', proximalMargin: 'Uninvolved', proximalMarginMm: '30',
    subtypes: ['Micropapillary'], otherMargin: 'Uninvolved', otherMarginName: 'renal vein', otherMarginMm: '40', distantMets: ['Lung'],
    associatedLesions: ['Urothelial dysplasia'], postTherapy: true, treatmentEffect: 'Present', otherFindings: 'renal calculus' });
  const labels = r.report.split('\n').filter((l) => /^- [^:]+:/.test(l)).map((l) => l.slice(2, l.indexOf(':')));
  // Departure 1: the two QMH grade rows are one row, whose options name the system.
  // Departure 2: the distal ureteric margin and the bladder cuff margin are alternatives; a specimen with a cuff prints the cuff margin.
  const expected = want.map((w) => ours[w]).filter(Boolean);
  // Departure 3: tumour focality (ICCR) follows the size.
  expected.splice(expected.indexOf('Tumour size') + 1, 0, 'Tumour focality');
  // Departure 4: the histologic type prints as its own row before the paragraph.
  expected.splice(expected.indexOf('Histologic type'), 1);
  expected.splice(expected.indexOf('Tumour histology'), 0, 'Histologic type');
  // Departure 5: subtypes and divergent differentiation (CAP) follow the paragraph.
  expected.splice(expected.indexOf('Tumour histology') + 1, 0, 'Subtypes and divergent differentiation');
  // Departure 6: treatment effect and other findings close Additional findings; MMR prints under Molecular findings.
  expected.push('Treatment effect', 'Other findings', 'Mismatch repair (MMR) immunohistochemistry');
  assert.deepEqual(labels, expected);
});

test('upper tract: MMR immunohistochemistry prints under MOLECULAR FINDINGS', () => {
  const r = run({}, { includeHeader: true });
  assert.match(r.report, /\nMOLECULAR FINDINGS:\nAncillary studies\n- Mismatch repair \(MMR\) immunohistochemistry: Intact nuclear expression of MLH1,\n {2}PMS2, MSH2 and MSH6\n\nDIAGNOSIS:/);
  assert.match(run({ mmrIhc: 'Loss of nuclear MMR protein expression (specify)', mmrDetail: 'MSH2 and MSH6' }).report,
    /- Mismatch repair \(MMR\) immunohistochemistry: Loss of nuclear MMR protein\n {2}expression \(MSH2 and MSH6\)\n/);
  assert.doesNotMatch(run({ mmrIhc: 'Not performed' }, { includeHeader: true }).report, /MOLECULAR FINDINGS/);
  assert.match(run({ mmrIhc: 'Not performed', ancillaryOther: 'FGFR3 mutation detected by next-generation sequencing' }).report, /- Other ancillary studies: FGFR3 mutation detected/);
});

// ---------- diagnosis ----------

test('upper tract: diagnosis lines', () => {
  assert.equal(dx(run(), 'KIDNEY AND URETER, left'), 'KIDNEY AND URETER, left, nephroureterectomy\n'
    + '- INVASIVE UROTHELIAL CARCINOMA of the renal pelvis, high grade, 35 mm, invading the renal parenchyma, with carcinoma in situ; '
    + 'completely excised (closest margin 25 mm, soft tissue); see synoptic report\n'
    + '- 0 of 3 regional lymph nodes involved\n- pT3 pN0 (AJCC 8th edition)');
  assert.equal(dx(run(URETER_PTA), 'URETER, right'), 'URETER, right, ureterectomy\n'
    + '- NON-INVASIVE PAPILLARY UROTHELIAL CARCINOMA of the lower ureter, low grade, 12 mm; completely excised (closest margin 5 mm, soft tissue); see synoptic report\n'
    + '- pTa (AJCC 8th edition)');
  const cis = dx(run({ histType: CIS, grade: '', extension: [EXT.Tis], cisExtent: 'Multifocal', focality: 'Multifocal', tumourSizeMm: '', tumourSite: ['Renal pelvis', 'Ureter'], ureterLevel: ['Upper'],
    associatedLesions: ['Urothelial dysplasia'] }), 'KIDNEY AND URETER');
  assert.match(cis, /^KIDNEY AND URETER, left, nephroureterectomy\n- UROTHELIAL CARCINOMA IN SITU of the renal pelvis and upper ureter, multifocal; completely excised/);
  assert.match(cis, /\n- Background urothelial dysplasia$/);
  assert.match(dx(run({ subtypes: ['Micropapillary', 'Squamous differentiation'] }), 'KIDNEY AND URETER'),
    /invading the renal parenchyma, with a micropapillary component, squamous differentiation and carcinoma in situ;/);
  assert.match(dx(run({ subtypes: ['Micropapillary', 'Plasmacytoid'], extension: [EXT.parenchyma] }), 'KIDNEY AND URETER'),
    /invading the renal parenchyma, with micropapillary and plasmacytoid components; completely excised/);
  assert.match(dx(run({ histType: 'Urothelial carcinoma, plasmacytoid' }), 'KIDNEY AND URETER'), /^KIDNEY AND URETER, left, nephroureterectomy\n- INVASIVE UROTHELIAL CARCINOMA, PLASMACYTOID SUBTYPE of the renal pelvis, high grade,/);
  assert.match(dx(run({ histType: 'Squamous cell carcinoma', grade: 'G3, poorly differentiated', extension: [EXT.perinephric] }), 'KIDNEY AND URETER'),
    /- SQUAMOUS CELL CARCINOMA of the renal pelvis, poorly differentiated \(G3\), 35 mm, invading through the kidney into the perinephric fat;/);
  assert.doesNotMatch(run({}, { printPTNM: false }).report, /\(AJCC 8th edition\)/);
});

// ---------- checks ----------

test('upper tract: checks for type, grade and extent', () => {
  assert.ok(run({ procedure: '' }).issues.some((i) => i.level === 'error' && i.field === 'procedure'));
  assert.ok(run({ histType: '' }).issues.some((i) => i.level === 'error' && i.field === 'histType'));
  assert.match(messages(run({ extension: [] })), /Tumour extension not recorded: pT needs it\./);
  assert.match(messages(run({ grade: '' })), /Histologic grade not recorded: low or high grade/);
  assert.match(messages(run({ grade: 'G2, moderately differentiated' })), /A urothelial carcinoma is graded low or high grade, not G1 to G3\./);
  assert.match(messages(run({ histType: 'Squamous cell carcinoma', grade: 'High grade' })), /graded G1 to G3, not low or high grade/);
  assert.match(messages(run({ histType: 'Urothelial carcinoma, micropapillary', grade: 'Low grade' })), /all subtypes are high grade \(ICCR\)/);
  assert.match(messages(run({ subtypes: ['Plasmacytoid'], grade: 'Low grade' })), /all subtypes are high grade/);
  assert.doesNotMatch(messages(run({ subtypes: ['Squamous differentiation'], grade: 'Low grade' })), /all subtypes/, 'divergent differentiation is not a subtype here');
  assert.ok(run({ grade: 'Low grade' }).issues.some((i) => i.level === 'info' && /great majority are high grade/.test(i.message)));
  assert.match(messages(run({ highGradePct: '3' })), /with up to 5% the tumour is graded low grade/);
  assert.match(messages(run({ ...URETER_PTA, highGradePct: '10' })), /above the 5% cut-off the tumour is graded high grade/);
  assert.doesNotMatch(messages(run({ ...URETER_PTA, highGradePct: '5' })), /5% cut-off|up to 5%/, 'exactly 5% raises nothing');
  assert.match(messages(run({ ...URETER_PTA, extension: [EXT.T1] })), /A non-invasive type with invasion ticked/);
  assert.match(messages(run({ extension: [EXT.Ta] })), /An invasive type with no invasion ticked/);
  assert.match(messages(run({ histType: CIS, grade: '', extension: [EXT.Ta] })), /tick Carcinoma in situ under Tumour extension/);
  assert.match(messages(run({ tumourSite: ['Ureter'], ureterLevel: ['Upper'] })), /tick Renal pelvis under Tumour site/);
  assert.match(messages(run({ extension: [EXT.ureterFat] })), /tick Ureter under Tumour site/);
  assert.match(messages(run()), /in situ extension into the renal collecting ducts and tubules does not affect stage \(CAP, Note E\)/);
  assert.match(messages(run({ ...URETER_PTA, extension: [EXT.Ta, EXT.Tis], cisExtent: 'Focal' })), /Non-invasive papillary carcinoma with carcinoma in situ is staged pTa\. CAP allows the suffix 'is'/);
  assert.match(messages(run({ extension: [EXT.organs], extensionOther: '' })), /Adjacent organ invasion: name the organ\./);
  assert.match(messages(run({ tumourSizeMm: '' })), /Tumour size not recorded/);
  assert.doesNotMatch(messages(run({ histType: CIS, grade: '', extension: [EXT.Tis], tumourSizeMm: '' })), /Tumour size not recorded/);
});

test('upper tract: checks for the bladder cuff, margins, nodes, staging and MMR', () => {
  assert.match(messages(run({ bladderCuff: '' })), /Complete nephroureterectomy: record the bladder cuff/);
  assert.ok(run({ bladderCuff: 'Not identified' }).issues.some((i) => i.level === 'info' && /No bladder cuff in a complete nephroureterectomy/.test(i.message)));
  assert.match(messages(run({ softTissueMargin: '' })), /Soft tissue margin not recorded\./);
  assert.match(messages(run({ otherMargin: 'Uninvolved', otherMarginName: '' })), /Other margin: name it\./);
  assert.ok(run({ nodesExamined: '2', nodesInvolved: '3' }).issues.some((i) => i.level === 'error' && i.field === 'nodesInvolved'));
  assert.match(messages(run({ nodesInvolved: '1', ene: 'Not identified' })), /One involved node with no deposit size/);
  assert.doesNotMatch(messages(run({ nodesInvolved: '1', ene: 'Not identified', largestNodeMm: '12' })), /One involved node/, 'a node of 20 mm or less gives pN1');
  assert.match(messages(run({ nodesInvolved: '1', ene: 'Present', largestNodeMm: '12' })), /One involved node with no deposit size/, 'not with extranodal extension');
  assert.match(messages(run({ nodesInvolved: '2', largestDepositMm: '5', ene: '' })), /Extranodal extension not recorded\./);
  assert.match(messages(run({ nodesExamined: '4', nodesInvolved: '' })), /Lymph nodes involved not recorded\./);
  assert.match(messages(run({ tnmOverride: 'pT2 pN0', tnmOverrideReason: '' })), /pTNM override has no reason\./);
  assert.match(messages(run({ postTherapy: true, treatmentEffect: '' })), /record the treatment effect/);
  assert.match(messages(run({ focality: 'Multifocal' })), /CAP adds the suffix m to the T category for multiple tumours/);
  assert.doesNotMatch(messages(run({ focality: 'Multifocal', multiplePrimaries: true })), /suffix m/);
  assert.ok(run({ mmrIhc: 'Loss of nuclear MMR protein expression (specify)', mmrDetail: '' }).issues.some((i) => i.level === 'error' && i.field === 'mmrDetail'));
  assert.ok(run({ mmrIhc: 'Not performed' }).issues.some((i) => i.level === 'info' && /ICCR \(Note 18\)/.test(i.message)));
  assert.doesNotMatch(messages(run()), /ICCR \(Note 18\)/, 'the example records MMR');
});

// ---------- intake ----------

test('upper tract intake: nephroureterectomies and ureterectomies with a carcinoma cue open the form', () => {
  assert.equal(route('(A) Left nephroureterectomy').templateId, 'ureter_renal_pelvis_carcinoma');
  assert.equal(route('(A) Right kidney and ureter').templateId, 'ureter_renal_pelvis_carcinoma');
  assert.equal(route('(A) Right nephroureterectomy with bladder cuff').templateId, 'ureter_renal_pelvis_carcinoma');
  assert.equal(route('(A) Right distal ureterectomy, ureteric tumour').templateId, 'ureter_renal_pelvis_carcinoma');
  assert.equal(route('(A) Left distal ureterectomy', 'left lower ureteric urothelial carcinoma').templateId, 'ureter_renal_pelvis_carcinoma');
  assert.equal(route('(A) Left distal ureterectomy').templateId, 'generic', 'no carcinoma cue');
  assert.equal(route('(A) Left nephroureterectomy, non-functioning kidney').templateId, 'generic');
  assert.equal(route('(A) Right nephroureterectomy, xanthogranulomatous pyelonephritis').templateId, 'generic');
  assert.notEqual(route('(A) Left kidney and ureter, staghorn calculus').templateId, 'ureter_renal_pelvis_carcinoma');
});

test('upper tract intake: biopsies, washings, margins and strictures stay where they opened', () => {
  assert.equal(route('(A) Right ureteric tumour').templateId, 'turbt');
  assert.equal(route('(A) Right ureteric tumour, biopsy').templateId, 'generic');
  assert.equal(route('(A) Left ureteric washing').templateId, 'urine_cytology');
  assert.equal(route('(A) Final right ureteric margin').templateId, 'turbt');
  assert.equal(route('(A) Left ureteric stricture').templateId, 'turbt');
  assert.equal(route('(A) Right nephrectomy', 'renal mass').templateId === 'ureter_renal_pelvis_carcinoma', false);
});

test('upper tract intake: procedure, side, site and ureteric level from the line and history', () => {
  const pick = (o) => (({ procedure, laterality, tumourSite, ureterLevel }) => ({ procedure, laterality, tumourSite, ureterLevel }))(o);
  assert.deepEqual(pick(preset('(A) Right radical nephroureterectomy', 'right upper ureteric tumour')),
    { procedure: NU_C, laterality: 'Right', tumourSite: ['Ureter'], ureterLevel: ['Upper'] });
  assert.deepEqual(pick(preset('(A) Left distal ureterectomy', 'left lower ureteric urothelial carcinoma')),
    { procedure: URET, laterality: 'Left', tumourSite: ['Ureter'], ureterLevel: ['Lower'] });
  assert.deepEqual(pick(preset('(A) Right segmental ureterectomy, mid ureteric tumour')),
    { procedure: URET, laterality: 'Right', tumourSite: ['Ureter'], ureterLevel: ['Middle'] });
  const pelvis = preset('(A) Right kidney and ureter', 'renal pelvis TCC');
  assert.deepEqual(pelvis.tumourSite, ['Renal pelvis']);
  assert.equal(pelvis.laterality, 'Right');
  assert.equal(preset('(A) Right nephroureterectomy with bladder cuff').procedure, NU_C);
  assert.equal(preset('(A) Left total nephroureterectomy').procedure, NU_C);
  assert.equal(preset('(A) Left partial nephroureterectomy').procedure, NU_P);
  assert.equal(preset('(A) Left nephroureterectomy').procedure ?? '', '', 'complete or partial is not said');
});

// ---------- golden reports ----------

// Written on first run, compared after; edit deliberately (UPDATE_FIXTURES=1 rewrites).
const CASES = [
  ['01-renal-pelvis-pt3-nephroureterectomy', 'high-grade invasive urothelial carcinoma of the renal pelvis invading the renal parenchyma, focal carcinoma in situ, complete nephroureterectomy with a bladder cuff, three negative hilar nodes, intact MMR, pT3 pN0, the example', [EXAMPLE]],
  ['02-ureter-pta-low-grade-ureterectomy', 'low-grade non-invasive papillary urothelial carcinoma of the lower ureter, segmental ureterectomy, margins clear, no nodes, pTa', [URETER_PTA]],
  ['03-cis-multifocal-bladder-cuff-margin', 'multifocal urothelial carcinoma in situ of the renal pelvis and upper and middle ureter with no macroscopic tumour, carcinoma in situ at the bladder cuff margin, urothelial dysplasia, MSH2 and MSH6 loss, pTis', [{
    ...EXAMPLE, laterality: 'Right', tumourSite: ['Renal pelvis', 'Ureter'], ureterLevel: ['Upper', 'Middle'], tumourSizeMm: '', focality: 'Multifocal', kidneyDims: '110 x 55 x 40',
    specimenWeightG: '250', ureterLengthMm: '220', ureterDiameterMm: '5', lesionAppearance: 'No macroscopic tumour', lesionDims: '', macroMarginMm: '', macroMarginSite: '',
    macroOther: 'The urothelium of the renal pelvis and upper ureter is velvety and erythematous', blocks: '16',
    blockKeyText: '1-6 Renal pelvis\n7-12 Ureter, proximal to distal\n13 Bladder cuff margin\n14-16 Kidney', histType: CIS, grade: '', highGradePct: '', configuration: ['Flat'],
    lvi: 'Not identified', extension: [EXT.Tis], cisExtent: 'Multifocal', bladderCuffMargin: 'Involved by carcinoma in situ', bladderCuffMarginMm: '', softTissueMarginMm: '10',
    nodesExamined: '', nodesInvolved: '', associatedLesions: ['Urothelial dysplasia'], renal: ['No significant abnormality'], renalDetail: '',
    mmrIhc: 'Loss of nuclear MMR protein expression (specify)', mmrDetail: 'MSH2 and MSH6'
  }]],
  ['04-ureter-pt2-micropapillary-pn2', 'high-grade urothelial carcinoma of the middle ureter with a micropapillary component invading the muscularis, partial nephroureterectomy, carcinoma in situ at the distal ureteric margin, two involved paracaval nodes with extranodal extension, pT2 pN2', [{
    ...EXAMPLE, laterality: 'Right', tumourSite: ['Ureter'], ureterLevel: ['Middle'], tumourSizeMm: '28', procedure: NU_P, kidneyDims: '120 x 60 x 50', specimenWeightG: '310',
    ureterLengthMm: '180', ureterDiameterMm: '9', bladderCuff: '', lesionAppearance: 'Sessile / solid tumour', lesionDims: '28 x 20 x 12', macroMarginMm: '30',
    macroMarginSite: 'distal ureteric', macroOther: '', blocks: '15', blockKeyText: '1-5 Tumour\n6 Distal ureteric margin\n7-9 Kidney\n10-15 Paracaval lymph nodes',
    subtypes: ['Micropapillary'], subtypePercents: 'conventional 70%, micropapillary 30%', configuration: ['Solid / nodule'], pni: 'Present', extension: [EXT.T2, EXT.Tis],
    cisExtent: 'Focal', bladderCuffMargin: '', bladderCuffMarginMm: '', distalMargin: 'Involved by carcinoma in situ', distalMarginMm: '', softTissueMargin: 'Uninvolved',
    softTissueMarginMm: '4', nodesExamined: '5', nodesInvolved: '2', ene: 'Present', largestDepositMm: '12', largestDepositSite: 'paracaval', largestNodeMm: '15',
    largestNodeSite: 'paracaval', renal: ['Tubulointerstitial disease (specify)'], renalDetail: 'chronic obstructive changes'
  }]]
];
for (const [name, description, parts] of CASES) {
  test(`golden: ${name}`, () => {
    const r = runParts(parts);
    const file = path.join(FIX, `${name}.json`);
    const current = { description, templateId: 'ureter_renal_pelvis_carcinoma', options: OPTIONS, values: parts, report: r.report, checks: r.issues };
    if (UPDATE || !fs.existsSync(file)) {
      fs.mkdirSync(FIX, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
    }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(r.report, saved.report, `${file} changed; re-run with UPDATE_FIXTURES=1 only after a deliberate wording change`);
    assert.deepEqual(r.issues, saved.checks, `${file} checks changed`);
    assert.doesNotMatch(r.report, /undefined|\[object|NaN| {3,}/);
  });
}
