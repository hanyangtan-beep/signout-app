// generators/oesophageal_carcinoma.js — wording-pinned tests for the oesophageal carcinoma
// resection synoptic template (QMH GI-Esophagus page, CAP Esophagus 4.2.0.1 / AJCC 8th
// edition). Like gastric, assertions are inline exact strings; any wording change is
// deliberate and edits this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generate } from '../src/engine.js';
import { parseSynoptic, synopticRows } from '../src/synoptic.js';
const schema = schemaSync('oesophageal_carcinoma');
import * as gen from '../generators/oesophageal_carcinoma.js';
import { schemaSync } from './_schema.js';

const run = (c) => generate(schema, gen, c);
const flat = (t) => t.replace(/\s+/g, ' ');
const part = (over = {}) => ({ label: 'A', templateId: 'oesophageal_carcinoma', values: { ...schema.example.parts[0].values, ...over } });
const runP = (over, options = schema.example.options) => run({ case: schema.example.case, parts: [part(over)], options });

test('schema shape: metadata key order, layout and field census', () => {
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.system, 'GI');
  assert.equal(schema.defaultParts, 1);
  assert.equal(schema.version, '2026.10');
  assert.equal(schema.source.stagingProtocol, 'oesophagus');
  assert.deepEqual(Object.keys(schema).slice(0, 11), ['id', 'version', 'name', 'shortName', 'label', 'organ', 'system', 'kind', 'layout', 'rank', 'aliases']);
  assert.deepEqual(schema.layout, { macroGroups: ['Specimen and tumour'], macroFields: ['specimenName'], pack: true });
  assert.deepEqual(schema.fields.filter((f) => f.type === 'multiselect').map((f) => f.id), ['distantMets', 'additionalFindings']);
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  assert.ok(schema.options.some((o) => o.id === 'printPTNM' && o.default === false));
  const gated = schema.fields.filter((f) => ['smDepth', 'smExtent', 'trg', 'hmMargin', 'vmMargin', 'egjRelationship'].includes(f.id));
  assert.ok(gated.filter((f) => f.id !== 'egjRelationship').every((f) => f.showIf), 'SM / TRG / ER fields are gated by showIf');
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const k of Object.keys(schema.example.parts[0].values)) assert.ok(ids.has(k), `example key ${k} is a field`);
});

test('example report: pinned wording (oesophagectomy case)', () => {
  const out = runP({});
  assert.equal(out.issues.filter((i) => i.level === 'error').length, 0);
  const r = out.report;
  assert.ok(r.startsWith('Oesophagus, middle thoracic, oesophagectomy'));
  assert.ok(r.includes('Received in formalin is an oesophagectomy specimen. The oesophagus measures 240 mm and a 35 mm cuff of stomach and cardia is attached.'));
  assert.ok(r.includes('There is a tumour in the middle thoracic oesophagus measuring 42 x 30 x 9 mm, 80 mm from the proximal margin and 60 mm from the distal margin.'));
  assert.ok(r.includes('(1) Oesophageal tumour with adventitia and radial margin.\n(2-3) Tumour, additional sections.'));
  assert.ok(r.includes('- Procedure: Oesophagectomy'));
  assert.ok(r.includes('- Tumour site: Mid oesophagus, middle thoracic oesophagus'));
  assert.ok(flat(r).includes('- Relationship of tumour to the oesophagogastric junction (EGJ): Tumour located entirely within the tubular oesophagus and does not involve the EGJ (tumour centre 150 mm proximal to the EGJ)'));
  assert.ok(r.includes('- Tumour size: 42 x 30 x 9 mm (greatest dimension 42 mm)'));
  assert.ok(r.includes('- Histologic type: Squamous cell carcinoma'));
  assert.ok(r.includes('- Histologic grade: G2, moderately differentiated'));
  assert.ok(flat(r).includes('The tumour is a moderately differentiated squamous cell carcinoma, invading the adventitia.'));
  assert.ok(r.includes('- Tumour extension: Tumour invades adventitia'));
  assert.ok(r.includes('- Lymphatic invasion (Ly): Present'));
  assert.ok(r.includes('- Perineural invasion: Present'));
  assert.ok(r.includes('- Treatment effect: No known presurgical therapy'));
  assert.ok(r.includes('- Proximal margin: Uninvolved by invasive carcinoma and uninvolved by dysplasia,\n  65 mm'));
  assert.ok(r.includes('- Radial margin: Uninvolved by tumour, 1.5 mm'));
  assert.ok(r.includes('- Regional lymph nodes: 19 examined; 2 involved'));
  assert.ok(r.includes('- Extracapsular spread: Not identified'));
  assert.ok(r.includes('- Size of largest metastatic deposit: 6 mm, Para-oesophageal, middle thoracic'));
  assert.ok(!r.includes('Distant metastasis'), 'no distant metastasis section without a recorded metastasis (Phase 67)');
  assert.ok(r.includes('- pTNM: pT3 pN1'));
  assert.ok(r.includes('- Stage group (if cM0): IIIB'));
  assert.ok(r.includes('OESOPHAGUS, middle thoracic, oesophagectomy'));
  assert.ok(flat(r).includes('- SQUAMOUS CELL CARCINOMA, moderately differentiated, 42 mm, invading the adventitia; lymphatic invasion present; perineural invasion present; other margins clear (closest 1.5 mm); see synoptic report'));
  assert.ok(r.includes('2 of 19 regional lymph nodes involved'));
  assert.ok(r.includes('pT3 pN1 (AJCC 8th edition), stage IIIB (if cM0)'));
});

test('synoptic element order follows the saved QMH GI-Esophagus page', () => {
  const tool = fileURLToPath(new URL('../tools/import-qmh.js', import.meta.url));
  const page = fileURLToPath(new URL('../docs/reference/GI-Esophagus.html', import.meta.url));
  execFileSync(process.execPath, [tool, page], { encoding: 'utf8' });
  assert.match(readFileSync(page, 'utf8'), /Esophagus/i);
  const rows = Object.keys(synopticRows(runP({}, { ...schema.example.options, printNodesMets: true }).synoptic));
  const idx = (l) => { const i = rows.indexOf(l); assert.ok(i >= 0, `${l} missing: ${rows}`); return i; };
  // Page order within Microscopic findings: histologic type, grade, extension, SM depth/extent,
  // Ly, V, PNI, treatment effect, TRG; the "- Tumour histology:" paragraph directly after the
  // grade is the one approved exception used by all synoptic templates.
  const order = ['Procedure', 'Tumour site', 'Relationship of tumour to the oesophagogastric junction (EGJ)', 'Tumour size', 'Histologic type', 'Histologic grade', 'Tumour histology', 'Tumour extension', 'Lymphatic invasion (Ly)', 'Venous invasion (V)', 'Perineural invasion', 'Treatment effect'];
  let cursor = -1;
  for (const label of order) { const i = idx(label); assert.ok(i > cursor, `${label} out of order`); cursor = i; }
  assert.ok(idx('Proximal margin') < idx('Distal margin'));
  assert.ok(idx('Distal margin') < idx('Radial margin'));
  assert.ok(idx('Radial margin') < idx('Regional lymph nodes'));
  assert.ok(idx('Regional lymph nodes') < idx('Distant metastasis'));
  assert.ok(idx('Distant metastasis') < idx('pTNM'));
  assert.deepEqual([...new Set(parseSynoptic(runP({}).synoptic).map((r) => r.section))],
    ['Specimen and tumour', 'Microscopic findings', 'Margins', 'Lymph nodes', 'Pathological stage (AJCC 8th edition)', 'Additional findings']);
});

test('endoscopic resection: mucosal / deep margins replace the oesophagectomy set', () => {
  const out = runP({
    procedure: 'Endoscopic resection',
    tumourSite: 'Distal oesophagus (low thoracic oesophagus)',
    nodesExamined: '0', nodesInvolved: '', ene: 'Not applicable', largestDepositMm: '', largestNodeMm: '', largestNodeSite: '',
    hmMargin: 'Uninvolved by invasive carcinoma and uninvolved by dysplasia (specify distance)',
    vmMargin: 'Uninvolved by tumour (specify distance)', vmMarginMm: '1'
  });
  const r = out.report;
  assert.ok(r.includes('Received in formalin is an endoscopic resection specimen of oesophageal mucosa.'));
  assert.ok(!r.includes('Proximal margin:'));
  assert.ok(!r.includes('Radial margin:'));
  assert.ok(flat(r).includes('- Mucosal margin: Uninvolved by invasive carcinoma and uninvolved by dysplasia'));
  assert.ok(r.includes('- Deep margin: Uninvolved by tumour, 1 mm'));
  assert.ok(flat(out.report).includes('other margins clear (closest 1 mm)'));
  assert.ok(!r.includes('Regional lymph nodes'), 'no lymph node section without nodes (Phase 67)');
  assert.ok(!r.includes('NaN'));
});

test('treated case: yp prefix, TRG line and the treatment-effect clause', () => {
  const out = runP({
    histType: 'Adenocarcinoma', tumourSite: 'Distal oesophagus (low thoracic oesophagus)',
    tumourExtension: 'Tumour invades muscularis propria', nodesExamined: '14', nodesInvolved: '0',
    treatmentEffect: 'Present, with residual cancer showing evident tumour regression but more than single cells or rare small groups of cancer cells (partial response, score 2)',
    trg: 'TRG 3 (fibrosis outgrowing residual cancer; 10-50% residual cancer)'
  });
  const r = flat(out.report);
  assert.ok(r.includes('- Treatment effect: Present, with residual cancer showing evident tumour regression but more than single cells or rare small groups of cancer cells (partial response, score 2)'));
  assert.ok(r.includes('- Tumour regression grade (Mandard): TRG 3 (fibrosis outgrowing residual cancer; 10-50% residual cancer)'));
  assert.ok(r.includes('- pTNM: ypT2 ypN0'));
  assert.ok(r.includes('ypT2 ypN0 (AJCC 8th edition), stage I (if cM0)'));
  assert.ok(r.includes('treatment effect: present, with residual cancer showing evident tumour regression'));
  assert.ok(r.includes('Mandard TRG 3'));
});

test('complete response: no-residual diagnosis and "not applicable" size', () => {
  const out = runP({
    tumourExtension: 'No evidence of primary tumour',
    treatmentEffect: 'Present, with no viable cancer cells (complete response, score 0)',
    trg: 'TRG 1 (no residual cancer in the oesophageal wall)',
    tumourSizeMm: '', tumourDims: '', histologyNotes: '', nodesExamined: '12', nodesInvolved: '0', ene: 'Not applicable'
  });
  assert.ok(out.report.includes('NO RESIDUAL CARCINOMA following therapy'));
  assert.ok(out.report.includes('- Tumour size: Not applicable (no residual tumour)'));
  assert.ok(out.report.includes('ypT0 ypN0 (AJCC 8th edition), stage I (if cM0)'));
});

test('carcinoma in situ: in-situ diagnosis and nodal-metastasis warning', () => {
  const out = runP({
    tumourExtension: 'High-grade dysplasia / carcinoma in situ (malignant cells confined to the epithelium)',
    nodesExamined: '5', nodesInvolved: '2', ene: 'Not applicable', pni: 'Not identified', radialMargin: 'Not applicable', ly: 'Not identified'
  });
  assert.ok(out.report.includes('HIGH-GRADE DYSPLASIA / CARCINOMA IN SITU'));
  assert.ok(out.report.includes('- pTNM: pTis pN1'));
  assert.ok(out.issues.some((i) => i.level === 'warn' && /does not metastasise/.test(i.message)));
});

test('checks: node census errors, extracapsular warning, margins and EGJ relationship', () => {
  const out = runP({ nodesExamined: '', nodesInvolved: '', proximalMarginMm: '', distalMarginMm: '', radialMarginMm: '' });
  const msgs = out.issues.map((i) => i.message);
  assert.ok(msgs.includes('Number of regional lymph nodes examined is required (enter 0 if none submitted).'));
  assert.ok(msgs.includes('Proximal margin uninvolved: record the distance.'));
  assert.ok(msgs.includes('Radial margin uninvolved: record the distance.'));
  const over = runP({ nodesExamined: '5', nodesInvolved: '12' });
  assert.ok(over.issues.some((i) => i.level === 'error' && /exceed/.test(i.message)));
  const noEne = runP({ ene: 'Not applicable' });
  assert.ok(noEne.issues.some((i) => i.level === 'warn' && /Extracapsular spread is not recorded/.test(i.message)));
  const egj = runP({ tumourSite: 'Oesophagogastric junction (EGJ)', egjRelationship: '' });
  assert.ok(egj.issues.some((i) => i.level === 'warn' && /relationship to the oesophagogastric junction/.test(i.message)));
  const t4 = runP({ tumourExtension: 'Tumour directly invades adjacent structures (specify)', extensionDetail: '' });
  assert.ok(t4.issues.some((i) => i.level === 'warn' && /specify the structures/.test(i.message)));
  const noTrg = runP({ treatmentEffect: 'Present, with rare residual cancer cells (near complete response, score 1)', nodesExamined: '12', nodesInvolved: '0' });
  assert.ok(noTrg.issues.some((i) => i.level === 'warn' && /Mandard/.test(i.message)));
});

test('distant metastasis and TNM override', () => {
  const out = runP({ distantMets: ['Non-regional lymph node(s)', 'Liver'], distantDetail: 'coeliac' });
  assert.ok(out.report.includes('- Distant metastasis: Non-regional lymph node(s) (coeliac) and Liver (coeliac)'));
  assert.ok(out.report.includes('distant metastasis: non-regional lymph node(s) and liver'));
  assert.ok(out.report.includes('pM1'));
  assert.ok(out.report.includes('pT3 pN1 pM1 (AJCC 8th edition), stage IVB'));
  const ov = runP({ tnmOverride: 'pT4b pN0', tnmOverrideReason: 'airway involvement', nodesExamined: '16', nodesInvolved: '0' });
  assert.ok(flat(ov.report).includes('- pTNM: pT4b pN0 [pathologist override; derived T3/N0 - airway involvement]'));
});
