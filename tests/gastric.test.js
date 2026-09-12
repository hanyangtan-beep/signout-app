// generators/gastric_carcinoma.js — wording-pinned tests for the gastric carcinoma resection
// synoptic template (QMH GI-Stomach page, AJCC 8th edition). Like sinonasal, assertions are
// inline exact strings; any wording change is deliberate and edits this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generate } from '../src/engine.js';
import { parseSynoptic, synopticRows } from '../src/synoptic.js';
import schema from '../schemas/gastric_carcinoma.json' with { type: 'json' };
import * as gen from '../generators/gastric_carcinoma.js';

const run = (c) => generate(schema, gen, c);
// Reports wrap at 80 columns; flatten line folds for long-value assertions.
const flat = (t) => t.replace(/\s+/g, ' ');
const part = (over = {}) => ({ label: 'A', templateId: 'gastric_carcinoma', values: { ...schema.example.parts[0].values, ...over } });
const runP = (over, options = schema.example.options) => run({ case: schema.example.case, parts: [part(over)], options });

test('schema shape: metadata key order, layout and field census', () => {
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.system, 'GI');
  assert.equal(schema.defaultParts, 1);
  assert.equal(schema.version, '2026.09');
  assert.equal(schema.source.stagingProtocol, 'gastric');
  assert.deepEqual(Object.keys(schema).slice(0, 11), ['id', 'version', 'name', 'shortName', 'label', 'organ', 'system', 'kind', 'layout', 'rank', 'aliases']);
  assert.deepEqual(schema.layout, { macroGroups: ['Specimen and tumour'], macroFields: ['specimenName'] });
  assert.deepEqual(schema.fields.filter((f) => f.type === 'multiselect').map((f) => f.id), ['tumourSite', 'distantMets', 'additionalFindings']);
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  assert.ok(schema.options.some((o) => o.id === 'printPTNM' && o.default === false));
  const gated = schema.fields.filter((f) => ['smDepth', 'smExtent', 'ulceration', 'ecuraLy', 'ecuraSm', 'hmMargin', 'vmMargin'].includes(f.id));
  assert.ok(gated.every((f) => f.showIf), 'pT1 / eCura / ER fields are gated by showIf');
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const k of Object.keys(schema.example.parts[0].values)) assert.ok(ids.has(k), `example key ${k} is a field`);
});

test('example report: pinned wording (gastrectomy case)', () => {
  const out = runP({});
  assert.equal(out.issues.filter((i) => i.level === 'error').length, 0);
  const r = out.report;
  assert.ok(r.startsWith('Stomach, antrum, lesser curvature, distal partial gastrectomy'));
  assert.ok(r.includes('Received in formalin is a distal partial gastrectomy specimen. The stomach measures 230 mm along the greater curvature, a 15 mm cuff of duodenum is attached and the specimen weighs 280 g.'));
  assert.ok(r.includes('There is a tumour in the antrum, lesser curvature measuring 35 x 30 x 8 mm, 55 mm from the proximal margin and 40 mm from the distal margin.'));
  assert.ok(r.includes('(1) Tumour with overlying mucosa and serosa.\n(2-3) Tumour, additional sections.'));
  assert.ok(r.includes('- Tumour site: Antrum, lesser curvature'));
  assert.ok(r.includes('- Tumour size: 35 x 30 x 8 mm (greatest dimension 35 mm)'));
  assert.ok(r.includes('- Histologic type: Tubular adenocarcinoma'));
  assert.ok(r.includes('- Histologic type (Lauren): Intestinal type'));
  assert.ok(r.includes('- Histologic grade: G2, moderately differentiated'));
  assert.ok(r.includes('- Histologic grade (JCGC 15e): Differentiated type'));
  assert.ok(r.includes('- Depth of submucosal invasion: More than 2 mm'));
  assert.ok(r.includes('- Ulceration (UL): Present (UL1)'));
  assert.ok(r.includes('- Perineural invasion: Present'));
  assert.ok(r.includes('- Proximal margin: Uninvolved by invasive carcinoma and uninvolved by dysplasia,\n  52 mm'));
  assert.ok(r.includes('- Omental margin: Uninvolved, 60 mm'));
  assert.ok(r.includes('- Regional lymph nodes: 24 examined; 4 involved'));
  assert.ok(r.includes('- Extranodal extension: Present'));
  assert.ok(r.includes('- Size of largest metastatic deposit: 18 mm, lesser curvature'));
  assert.ok(r.includes('- Distant metastasis: Not identified'));
  assert.ok(r.includes('- pTNM: pT1b pN2'));
  assert.ok(r.includes('- Stage group (if cM0): IIA'));
  assert.ok(r.includes('STOMACH, antrum, lesser curvature, distal partial gastrectomy'));
  assert.ok(r.includes('4 of 24 regional lymph nodes involved; extranodal extension present'));
  assert.ok(r.includes('pT1b pN2 (AJCC 8th edition), stage IIA (if cM0)'));
});

test('synoptic element order follows the saved QMH GI-Stomach page', () => {
  const tool = fileURLToPath(new URL('../tools/import-qmh.js', import.meta.url));
  const page = fileURLToPath(new URL('../docs/reference/GI-Stomach.html', import.meta.url));
  execFileSync(process.execPath, [tool, page], { encoding: 'utf8' });
  assert.match(readFileSync(page, 'utf8'), /Gastric/);
  const rows = Object.keys(synopticRows(runP({}).synoptic));
  const idx = (l) => { const i = rows.indexOf(l); assert.ok(i >= 0, `${l} missing: ${rows}`); return i; };
  // Page order inside Microscopic findings: histologic type, Lauren, grade, JCGC grade, extension,
  // SM depth/extent, ulceration, Ly, V, PNI, treatment effect; the "- Tumour histology:" paragraph
  // directly after the grade is the one approved exception (docs/specs/gastric-carcinoma.md).
  const order = ['Procedure', 'Tumour site', 'Tumour size', 'Histologic type', 'Histologic type (Lauren)', 'Histologic grade', 'Histologic grade (JCGC 15e)', 'Tumour histology', 'Tumour extension', 'Depth of submucosal invasion', 'Extent of submucosal invasion', 'Ulceration (UL)', 'Lymphatic invasion (Ly)', 'Venous invasion (V)', 'Perineural invasion', 'Treatment effect'];
  let cursor = -1;
  for (const label of order) { const i = idx(label); assert.ok(i > cursor, `${label} out of order`); cursor = i; }
  assert.ok(idx('Proximal margin') < idx('Distal margin'));
  assert.ok(idx('Distal margin') < idx('Omental margin'));
  assert.ok(idx('Regional lymph nodes') < idx('Distant metastasis'));
  assert.ok(idx('Distant metastasis') < idx('pTNM'));
  assert.deepEqual([...new Set(parseSynoptic(runP({}).synoptic).map((r) => r.section))],
    ['Specimen and tumour', 'Microscopic findings', 'Margins', 'Lymph nodes', 'Distant metastasis', 'Pathological stage (AJCC 8th edition)', 'Additional findings']);
});

test('endoscopic resection: HM / VM margins replace the gastrectomy margins; eCura section and clause print', () => {
  const out = runP({
    procedure: 'Endoscopic resection',
    tumourSite: ['Antrum'],
    nodesExamined: '', nodesInvolved: '', ene: 'Not applicable', largestDepositMm: '', largestNodeMm: '',
    hmMargin: 'Uninvolved by invasive carcinoma and uninvolved by dysplasia',
    vmMargin: 'Involved by invasive carcinoma',
    ecuraLy: 'Present', ecuraSize: 'Present', ecuraVm: 'Present', ecuraV: 'Cannot be determined', ecuraSm: 'Not identified'
  });
  const r = out.report;
  assert.ok(r.includes('Received in formalin is an endoscopic resection specimen of gastric mucosa.'));
  assert.ok(!r.includes('Proximal margin:'));
  assert.ok(r.includes('- Mucosal (horizontal) margins (HM): Uninvolved by invasive carcinoma and\n  uninvolved by dysplasia'));
  assert.ok(r.includes('- Deep (vertical) margin (VM): Involved by invasive carcinoma'));
  assert.ok(r.includes('- Regional lymph nodes: Not recorded'));
  assert.ok(r.includes('Endoscopic curability (eCura C)'));
  assert.ok(r.includes('- eCura score: 5 of 7 - High risk (5-7 points); not determined for Venous\n  invasion (V)'));
  assert.ok(flat(r).includes('deep (vertical) margin involved'));
  assert.ok(flat(r).includes('mucosal (horizontal) margins clear'));
  assert.ok(r.includes('- eCura score 5 of 7: High risk (5-7 points)'));
  assert.ok(!r.includes('NaN'));
});

test('treated case: yp prefix and the treatment clause', () => {
  const out = runP({ treatmentEffect: 'Present, with residual cancer showing evident tumour regression but more than single cells or rare small groups of cancer cells (partial response, score 2)' });
  const r = flat(out.report);
  assert.ok(r.includes('- Treatment effect: Present, with residual cancer showing evident tumour regression but more than single cells or rare small groups of cancer cells (partial response, score 2)'));
  assert.ok(r.includes('- pTNM: ypT1b ypN2'));
  assert.ok(r.includes('ypT1b ypN2 (AJCC 8th edition), stage IIA (if cM0)'));
  assert.ok(r.includes('treatment effect: present, with residual cancer showing evident tumour regression but more than single cells or rare small groups of cancer cells (partial response, score 2)'));
});

test('complete response: no-residual diagnosis and "not applicable" size', () => {
  const out = runP({
    tumourExtension: 'No evidence of primary tumour',
    treatmentEffect: 'Present, with no viable cancer cells (complete response, score 0)',
    tumourSizeMm: '', tumourDims: '', histologyNotes: '', nodesExamined: '20', nodesInvolved: '0', ene: 'Not applicable'
  });
  assert.ok(out.report.includes('NO RESIDUAL CARCINOMA following therapy'));
  assert.ok(out.report.includes('- Tumour size: Not applicable (no residual tumour)'));
  assert.ok(out.report.includes('ypT0 ypN0 (AJCC 8th edition)'));
});

test('carcinoma in situ: in-situ diagnosis and nodal-metastasis warning', () => {
  const out = runP({
    tumourExtension: 'Carcinoma in situ: intraepithelial tumour without invasion of the lamina propria (high-grade dysplasia)',
    nodesExamined: '5', nodesInvolved: '2', ene: 'Not applicable', pni: 'Not identified'
  });
  assert.ok(out.report.includes('HIGH-GRADE DYSPLASIA / CARCINOMA IN SITU'));
  assert.ok(out.report.includes('- pTNM: pTis pN1'));
  assert.ok(out.issues.some((i) => i.level === 'warn' && /does not metastasise/.test(i.message)));
});

test('checks: node census errors, ENE warning, low node count and margins', () => {
  const out = runP({ nodesExamined: '', nodesInvolved: '', proximalMarginMm: '', distalMarginMm: '' });
  const msgs = out.issues.map((i) => i.message);
  assert.ok(msgs.includes('Number of regional lymph nodes examined is required (enter 0 if none submitted).'));
  assert.ok(msgs.includes('Proximal margin uninvolved: record the distance.'));
  const low = runP({ nodesExamined: '7', nodesInvolved: '0', ene: 'Not applicable', proximalMarginMm: '52', distalMarginMm: '38' });
  assert.ok(low.issues.some((i) => /Fewer than 16 regional lymph nodes/.test(i.message)));
  const over = runP({ nodesExamined: '5', nodesInvolved: '12' });
  assert.ok(over.issues.some((i) => i.level === 'error' && /exceed/.test(i.message)));
  const noEne = runP({ ene: 'Not applicable' });
  assert.ok(noEne.issues.some((i) => i.level === 'warn' && /Extranodal extension is not recorded/.test(i.message)));
});

test('checks: eCura strata surface as warnings for endoscopic resections', () => {
  const er = (over) => runP({
    procedure: 'Endoscopic resection', nodesExamined: '0', nodesInvolved: '', ene: 'Not applicable',
    hmMargin: 'Uninvolved by invasive carcinoma and uninvolved by dysplasia', vmMargin: 'Uninvolved (specify distance)', vmMarginMm: '3', ...over
  });
  const low = er({ ecuraLy: 'Not identified', ecuraSize: 'Not identified', ecuraVm: 'Not identified', ecuraV: 'Not identified', ecuraSm: 'Not identified' });
  assert.ok(low.issues.some((i) => /eCura low-risk stratum \(0 points/.test(i.message)));
  const high = er({ ecuraLy: 'Present', ecuraSize: 'Present', ecuraVm: 'Present', ecuraV: 'Cannot be determined', ecuraSm: 'Present' });
  assert.ok(high.issues.some((i) => /eCura high-risk stratum \(6 points\)/.test(i.message)));
  assert.ok(high.issues.some((i) => /eCura elements not determined: Venous invasion \(V\)\./.test(i.message)));
});

test('distant metastasis and TNM override', () => {
  const out = runP({ distantMets: ['Non-regional lymph node(s)', 'Liver'], distantDetail: 'coeliac' });
  assert.ok(out.report.includes('- Distant metastasis: Non-regional lymph node(s) and Liver (coeliac)'));
  assert.ok(out.report.includes('distant metastasis: non-regional lymph node(s) and liver'));
  assert.ok(out.report.includes('pM1'));
  assert.ok(out.report.includes('pT1b pN2 pM1 (AJCC 8th edition), stage IV'));
  const ov = runP({ tnmOverride: 'pT3 pN2', tnmOverrideReason: 'discarded omental deposit', nodesExamined: '20', nodesInvolved: '4' });
  assert.ok(flat(ov.report).includes('- pTNM: pT3 pN2 [pathologist override; derived T1b/N2 - discarded omental deposit]'));
});
