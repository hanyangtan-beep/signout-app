// Lung carcinoma resection (synoptic, AJCC 9th) - generator, fixtures, QMH element order and the frozen link.
// Spec: docs/specs/lung-pair.md. Fixtures: tests/fixtures/lung/*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, generateCase, relabel } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { prefillFromFrozen, iaslcGrade, parsePatterns, gradeOf, priorOf } from '../generators/lung_carcinoma.js';
import { parseSynoptic } from '../src/synoptic.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'lung');
const UPDATE = process.argv.includes('--update');
const registry = await loadAll();
const { schema, generator } = registry.lung_carcinoma;
const EX = schema.example.parts[0].values;
const defaults = (s) => Object.fromEntries(s.fields.filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));

function run(patch = {}, options = {}, caseFields = {}) {
  const values = { ...defaults(schema), ...EX, ...patch };
  const cs = { schemaId: 'lung_carcinoma', caseTitle: '', options: { ...schema.example.options, ...options }, ...caseFields, parts: [{ label: 'A', values }] };
  return generate(schema, generator, cs);
}
const rows = (out) => Object.fromEntries(parseSynoptic(out.synoptic).filter((r) => r.label).map((r) => [r.label, r.value]));
const flatDx = (out) => out.diagnosis.replace(/\s+/g, ' ');
const info = (out) => out.issues.filter((i) => i.level === 'info').map((i) => i.message);
const warns = (out) => out.issues.filter((i) => i.level === 'warn').map((i) => i.message);
const errs = (out) => out.issues.filter((i) => i.level === 'error').map((i) => i.message);

const ADENO = 'Invasive adenocarcinoma (non-mucinous; predominant pattern from the percentages)';
const SCC_K = 'Invasive squamous cell carcinoma, keratinising';
// No nodes / no ancillary / no other letters unless a fixture says so.
const SOLO = { nodeStations: '', nodeEne: 'Not applicable', nodeDepositMm: '', ancillary: '', additionalFindings: [], otherParts: '', otherMacro: '' };

// Fixture patches (spec docs/specs/lung-pair.md, fixtures list). 01 is the linked pair (own test below).
const CASES = [
  ['02-completion-lobectomy-prior-wedge', { ...SOLO, procedure: 'Completion lobectomy', laterality: 'Left', lobes: ['Lower lobe'], specimenDims: '140 x 95 x 40', weight: '150', tumourSite: 'Peripheral', tumourSizeMm: '', tumourDims: '', pleuraGross: 'Unremarkable', bronchialMarginMm: '', residualTumour: 'Not identified', cutSurface: [], histType: ADENO, patterns: '', ihc: '', pleuralInvasion: 'Not identified', elasticStain: false, blockKeyText: '1-3 Previous staple line\n4 Bronchial margin, shave\n5 Vascular margin, shave\n6-7 Lymph nodes, station 7\n8-9 Lymph nodes, station 10L\n10-11 Lymph nodes, station 11L\n12 Background lung', nodeStations: '7: 0/3; 10L: 0/2; 11L: 0/3', nodeEne: 'Not applicable', additionalFindings: ['Biopsy site changes'], microDescription: 'The previous staple line shows organising fibrosis, foreign-body giant cell reaction and haemosiderin deposition with no residual carcinoma' },
    { printPTNM: true }, { priorAccession: 'S26-01234', priorDate: '2026-08-02', priorProcedure: 'Wedge resection', priorType: 'Invasive adenocarcinoma, acinar predominant', priorSizeMm: '8', priorPT: 'pT1a', priorPN: 'pNX' }],
  ['03-lobectomy-acinar-pl1-n2a', { ...SOLO, tumourSizeMm: '23', tumourDims: '23 x 20 x 18', nodeStations: '7: 1/2; 10R: 0/2; 11R: 0/1', nodeEne: 'Not identified', nodeDepositMm: '6', additionalFindings: ['Emphysema'], ancillary: 'PD-L1 (22C3) TPS 40 %; EGFR / ALK / ROS1 testing requested' }, { printPTNM: true }],
  ['04-scc-pneumonectomy-main-bronchus-n1', { ...SOLO, procedure: 'Pneumonectomy', laterality: 'Right', lobes: ['Whole lung'], specimenDims: '260 x 180 x 90', weight: '720', tumourSite: 'Central (involving the main bronchus)', tumourSizeMm: '45', tumourDims: '45 x 40 x 38', pleuraGross: 'Unremarkable', bronchialMarginMm: '12', cutSurface: ['Firm', 'Grey-white', 'Necrosis', 'Cavitation'], histType: SCC_K, patterns: '', grade: 'G2: Moderately differentiated', ihc: 'p40 positive, TTF-1 negative', pleuralInvasion: 'Not identified', elasticStain: false, tumourExtension: ['Main bronchus (up to but not including the carina)', 'Atelectasis or obstructive pneumonitis extending to the hilar region'], blockKeyText: '1-5 Tumour with main bronchus\n6 Bronchial margin, shave\n7 Vascular margin, shave\n8-9 Lymph nodes, station 11R\n10 Lymph node, station 10R\n11 Lymph nodes, station 4R\n12 Background lung', nodeStations: '4R: 0/2; 10R: 0/1; 11R: 2/3', nodeEne: 'Not identified', nodeDepositMm: '9', additionalFindings: ['Post-obstructive changes'], microDescription: 'The tumour arises in the right main bronchus and infiltrates the bronchial wall into the adjacent parenchyma, with distal obstructive pneumonia' }, { printPTNM: true }],
  ['05-post-neoadjuvant-solid-adeno-ypt1b', { ...SOLO, procedure: 'Lobectomy', laterality: 'Left', lobes: ['Upper lobe'], specimenDims: '160 x 120 x 50', weight: '210', tumourSizeMm: '12', tumourDims: '', invasiveSizeMm: '', pleuraGross: 'Unremarkable', bronchialMarginMm: '40', cutSurface: ['Firm', 'Grey-white', 'Ill-defined'], otherMacro: 'The ill-defined fibrotic tumour bed measures 30 x 25 x 22 mm', histType: ADENO, patterns: 'solid 80, acinar 20', ihc: 'TTF-1 positive, p40 negative', treatmentEffect: '10 % or less residual viable tumour', viablePct: '8', pleuralInvasion: 'Not identified', elasticStain: false, blockKeyText: '1-6 Tumour bed, entirely embedded\n7 Bronchial margin, shave\n8 Vascular margin, shave\n9-10 Lymph nodes, station 5\n11-12 Lymph nodes, station 11L\n13 Background lung', nodeStations: '5: 0/2; 11L: 0/4', nodeEne: 'Not applicable', microDescription: 'The tumour bed (30 mm) shows extensive fibrosis, foamy histiocytes and cholesterol clefts with residual viable carcinoma occupying about 8 % of the bed; the largest contiguous focus of viable tumour measures 12 mm', additionalNotes: 'Resection after three cycles of neoadjuvant chemo-immunotherapy' }, { printPTNM: true }],
  ['06-ais-and-mia-segmentectomy', { ...SOLO, procedure: 'Segmentectomy', laterality: 'Right', lobes: ['Upper lobe'], specimenDims: '70 x 45 x 30', weight: '35', tumourSizeMm: '18', tumourDims: '18 x 15 x 12', invasiveSizeMm: '', pleuraGross: 'Unremarkable', bronchialMarginMm: '', parenchymalMarginMm: '9', cutSurface: ['Ill-defined', 'Tan-white'], histType: 'Adenocarcinoma in situ (AIS), non-mucinous', patterns: '', ihc: 'TTF-1 positive', pleuralInvasion: 'Not identified', elasticStain: false, bronchialMargin: 'Not applicable', vascularMargin: 'Not applicable', parenchymalMargin: 'Uninvolved by adenocarcinoma in situ', blockKeyText: '1-4 Lesion, entirely embedded\n5 Parenchymal (staple line) margin\n6 Lymph node, station 12', nodeStations: '12: 0/1', additionalFindings: ['Atypical adenomatous hyperplasia'], microDescription: 'The lesion is a purely lepidic proliferation of mildly atypical pneumocytes along intact alveolar walls without stromal, vascular or pleural invasion' }, { printPTNM: true }],
  ['07-t4-different-lobe-nodule-pleural-nodules-m1a', { ...SOLO, procedure: 'Bilobectomy', laterality: 'Right', lobes: ['Middle lobe', 'Lower lobe'], specimenDims: '210 x 150 x 70', weight: '520', tumourSizeMm: '52', tumourDims: '52 x 45 x 40', pleuraGross: 'Involved grossly', bronchialMarginMm: '25', separateNodules: 'Different ipsilateral lobe', separateNodulesDetail: 'a 12 mm nodule in the middle lobe with the same morphology', cutSurface: ['Firm', 'Grey-white', 'Necrosis'], histType: ADENO, patterns: 'solid 60, acinar 40', ihc: 'TTF-1 positive, napsin A positive', pleuralInvasion: 'PL2, extends on visceral pleura surface', elasticStain: true, lvi: 'Present', blockKeyText: '1-6 Lower lobe tumour with pleura\n7-8 Middle lobe nodule\n9 Bronchial margin, shave\n10 Vascular margin, shave\n11-12 Lymph nodes, station 11R\n13 Parietal pleural nodule (part B)', nodeStations: '11R: 0/2', nodeEne: 'Not applicable', distantMets: ['Pleural nodules'], distantDetail: 'parietal pleural nodules, part B', otherParts: 'B) Pleura, parietal, biopsy - metastatic adenocarcinoma', additionalFindings: [] }, { printPTNM: true }]
];
const byName = Object.fromEntries(CASES.map(([n, p, o, c]) => [n, { patch: p, options: o || {}, caseFields: c || {} }]));

test('template metadata and registration', () => {
  assert.equal(schema.id, 'lung_carcinoma');
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.system, 'Thoracic');
  assert.match(schema.source.url, /Thorax-Lung\.html$/);
  assert.equal(schema.source.stagingProtocol, 'lung');
  assert.equal(schema.generator, 'lung_carcinoma');
  assert.ok(registry.lung_carcinoma, 'registered');
  assert.ok(registry.frozen_section.generator.PAIRED_TEMPLATE['Lung wedge / nodule'] === 'lung_carcinoma', 'paired with the frozen lung scenario');
});

test('example case: acinar-predominant adenocarcinoma, PL1, station 7 positive -> pT2a pN2a IIIA (AJCC 9th)', () => {
  const out = run({}, { printPTNM: true });
  const r = rows(out);
  assert.equal(r['Procedure'], 'Lobectomy');
  assert.equal(r['Tumour size'], '23 mm in greatest dimension (23 x 20 x 18 mm)');
  assert.equal(r['Histologic type'], 'Invasive adenocarcinoma, acinar predominant (acinar 60 %, papillary 25 %, solid 15 %)');
  assert.equal(r['Histologic grade'], 'Grade 2 (IASLC 2020; acinar predominant, 15 % high-grade patterns)');
  assert.equal(r['Visceral pleura invasion'], 'PL1, extension through elastic membrane (elastic stain performed)');
  assert.equal(r['Regional lymph nodes'], '5 examined; 1 involved');
  assert.equal(r['Stations (involved/examined)'], '7: 1/2; 10R: 0/2; 11R: 0/1');
  assert.equal(r['pTNM'], 'pT2a pN2a');
  assert.match(flatDx(out), /^LUNG, right upper lobe, lobectomy - INVASIVE ADENOCARCINOMA, acinar predominant, 23 mm, visceral pleura invaded \(PL1\); bronchial margin clear; see synoptic report - 1 of 5 regional lymph nodes involved \(station 7\) - pT2a pN2a \(AJCC 9th edition\), stage IIIA \(if cM0\)$/);
  assert.ok(info(out).includes('AJCC 9th stage group (if cM0): IIIA.'));
  assert.ok(!/FIGO/.test(out.report));
  // The house "Specimen and tumour" section sits above the QMH microscopic elements.
  assert.ok(out.synoptic.indexOf('Specimen and tumour') < out.synoptic.indexOf('Microscopic findings'));
});

test('IASLC 2020 grade: predominant pattern and high-grade percentage; not applicable outside invasive non-mucinous adenocarcinoma', () => {
  assert.deepEqual(parsePatterns('acinar 60, papillary 25, solid 15').map((p) => [p.name, p.pct]), [['acinar', 60], ['papillary', 25], ['solid', 15]]);
  const g = (patterns) => iaslcGrade({ patterns }).grade;
  assert.equal(g('lepidic 80, acinar 20'), 1);
  assert.equal(g('acinar 70, lepidic 30'), 2);
  assert.equal(g('acinar 75, solid 25'), 3, '20 % or more high-grade pattern is grade 3');
  assert.equal(g('acinar 81, micropapillary 19'), 2);
  assert.equal(g('solid 55, acinar 45'), 3, 'high-grade predominant is grade 3');
  assert.equal(g('acinar 70, cribriform 30'), 3, 'complex glandular (cribriform) counts as high grade');
  assert.equal(iaslcGrade({ patterns: '' }), null);
  assert.equal(gradeOf({ histType: ADENO, patterns: 'acinar 70, lepidic 30' }).value, 'Grade 2 (IASLC 2020; acinar predominant, no high-grade pattern)');
  assert.equal(gradeOf({ histType: SCC_K, grade: 'G2: Moderately differentiated' }).value, 'G2: Moderately differentiated');
  assert.match(gradeOf({ histType: 'Small cell carcinoma' }).value, /^Not applicable/);
  assert.match(gradeOf({ histType: 'Adenocarcinoma in situ (AIS), non-mucinous' }).value, /^Not applicable/);
  assert.ok(warns(run({ histType: SCC_K, patterns: '' })).some((m) => /pick G1-G4/.test(m)), 'non-adenocarcinoma on Derive asks for G1-G4');
  assert.ok(errs(run({ patterns: 'acinar 60, solid 30' })).some((m) => /sum to 90 %/.test(m)));
});

test('nodes: station table drives N1 / N2a / N2b / N3 and the diagnosis node line', () => {
  const n = (stations) => rows(run({ nodeStations: stations, nodeEne: 'Not identified', nodeDepositMm: '5' }, { printPTNM: true }))['pTNM'];
  assert.equal(n('10R: 0/2; 11R: 0/3'), 'pT2a pN0');
  assert.equal(n('10R: 1/2; 11R: 0/3'), 'pT2a pN1');
  assert.equal(n('7: 1/2; 10R: 0/2'), 'pT2a pN2a', 'single N2 station');
  assert.equal(n('7: 1/2; 4R: 1/1'), 'pT2a pN2b', 'multiple N2 stations');
  assert.equal(n('4L: 1/1; 10R: 0/2'), 'pT2a pN3', 'contralateral mediastinal node');
  assert.equal(n(''), 'pT2a pNX');
  assert.match(flatDx(run({ nodeStations: '7: 1/2; 4R: 1/1; 10R: 0/2' })), /2 of 5 regional lymph nodes involved \(stations 7 and 4R\)/);
  assert.ok(errs(run({ nodeStations: 'seven: one of two' })).some((m) => /not understood/.test(m)));
});

test('T boundaries and descriptors (AJCC 9th): T1mi, T1a/b/c, T2a by PL1 or main bronchus, T3 same-lobe nodule, T4 different-lobe nodule, M1a pleural nodules', () => {
  const t = (patch, cf) => rows(run({ ...SOLO, nodeStations: '10R: 0/2', nodeEne: 'Not applicable', ...patch }, { printPTNM: true }, cf))['pTNM'];
  assert.equal(t({ tumourSizeMm: '8', pleuralInvasion: 'Not identified', patterns: 'acinar 100' }), 'pT1a pN0');
  assert.equal(t({ tumourSizeMm: '18', pleuralInvasion: 'Not identified', patterns: 'acinar 100' }), 'pT1b pN0');
  assert.equal(t({ tumourSizeMm: '28', pleuralInvasion: 'Not identified', patterns: 'acinar 100' }), 'pT1c pN0');
  assert.equal(t({ tumourSizeMm: '28', pleuralInvasion: 'PL1, extension through elastic membrane' }), 'pT2a pN0', 'PL1 upstages to T2a');
  assert.equal(t({ tumourSizeMm: '28', pleuralInvasion: 'Not identified', tumourExtension: ['Main bronchus (up to but not including the carina)'] }), 'pT2a pN0');
  assert.equal(t({ tumourSizeMm: '45', pleuralInvasion: 'Not identified' }), 'pT2b pN0');
  assert.equal(t({ tumourSizeMm: '28', pleuralInvasion: 'Not identified', separateNodules: 'Same lobe' }), 'pT3 pN0');
  assert.equal(t({ tumourSizeMm: '28', pleuralInvasion: 'Not identified', separateNodules: 'Different ipsilateral lobe' }), 'pT4 pN0');
  assert.equal(t({ tumourSizeMm: '28', pleuralInvasion: 'Not identified', tumourExtension: ['Chest wall, rib(s)'] }), 'pT3 pN0');
  assert.equal(t({ tumourSizeMm: '28', pleuralInvasion: 'Not identified', tumourExtension: ['Diaphragm'] }), 'pT4 pN0', 'diaphragm is T4 since the 8th edition');
  assert.equal(t({ tumourSizeMm: '52', pleuralInvasion: 'PL2, extends on visceral pleura surface', separateNodules: 'Different ipsilateral lobe', distantMets: ['Pleural nodules'] }), 'pT4 pN0 pM1a');
  assert.equal(t({ tumourSizeMm: '28', pleuralInvasion: 'Not identified', distantMets: ['Single extrathoracic metastasis in one organ (includes a single non-regional lymph node)'] }), 'pT1c pN0 pM1b');
  assert.equal(t({ histType: 'Minimally invasive adenocarcinoma, non-mucinous', tumourSizeMm: '18', invasiveSizeMm: '4', pleuralInvasion: 'Not identified', patterns: '' }), 'pT1mi pN0');
  assert.equal(t({ histType: 'Adenocarcinoma in situ (AIS), non-mucinous', tumourSizeMm: '18', pleuralInvasion: 'Not identified', patterns: '' }), 'pTis pN0');
  assert.equal(t({ tumourSizeMm: '30', pleuralInvasion: 'Not identified', treatmentEffect: '10 % or less residual viable tumour', viablePct: '8', invasiveSizeMm: '12', patterns: 'solid 100' }), 'ypT1b ypN0', 'y prefix after neoadjuvant therapy; the viable focus sizes T');
});

test('completion resection with a typed prior specimen: combined T from the prior, N from this specimen, origin printed, auto comment', () => {
  const c = byName['02-completion-lobectomy-prior-wedge'];
  const out = run(c.patch, c.options, c.caseFields);
  const r = rows(out);
  assert.equal(r['pTNM'], 'pT1a (prior wedge resection S26-01234) pN0 (0/8, this completion lobectomy)');
  assert.equal(r['Residual tumour at the previous resection site'], 'Not identified');
  assert.match(out.report, /Staging is based on the prior wedge resection \(S26-01234\) together with the lymph nodes from this completion lobectomy\./);
  assert.match(flatDx(out), /^LUNG, left lower lobe, completion lobectomy - NO RESIDUAL CARCINOMA at the previous staple line \(prior wedge resection S26-01234: invasive adenocarcinoma, acinar predominant, 8 mm\); 0 of 8 regional lymph nodes involved; see synoptic report - pT1a \(prior wedge resection S26-01234\) pN0 \(0\/8, this completion lobectomy\) \(AJCC 9th edition\), stage IA1 \(if cM0\)$/);
  assert.ok(!warns(out).some((m) => /Tumour size not recorded/.test(m)), 'no size warning when there is no residual tumour');
  assert.ok(priorOf({ case: c.caseFields }).accession === 'S26-01234');
  // Without the prior accession the comment and the combined stage disappear and a warning asks for it.
  const bare = run(c.patch, c.options, {});
  assert.ok(!/Staging is based on/.test(bare.report));
  assert.ok(warns(bare).some((m) => /without a related prior specimen accession/.test(m)));
  assert.equal(rows(bare)['pTNM'], 'pTX pN0', 'no residual tumour and no prior: T cannot be assessed from this specimen alone');
});

test('lettering: one letter drops "(A)" everywhere; other letters typed in otherParts bring it back', () => {
  const solo = run(byName['03-lobectomy-acinar-pl1-n2a'].patch, { printPTNM: true });
  assert.ok(!/\(A\)/.test(solo.report), solo.report);
  assert.match(solo.report, /\n\(1-4\) Tumour with overlying pleura\./);
  const multi = run({ ...byName['03-lobectomy-acinar-pl1-n2a'].patch, otherParts: 'B) Lymph node, station 4R, excision - 0/1' }, { printPTNM: true });
  assert.match(multi.report, /^\(A\) Lung, right upper lobe, lobectomy\n\(B\) Lymph node, station 4R, excision/);
  assert.match(multi.report, /\n\(A1-4\) Tumour/);
  assert.match(multi.diagnosis, /\n\n\(B\) LYMPH NODE, station 4R, excision - NO EVIDENCE OF MALIGNANCY IN 1 LYMPH NODE \(0\/1\)$/);
});

test('macro option off removes the macro and block key; heading option prints the LIS headers', () => {
  const off = run({}, { macro: false });
  assert.ok(!off.report.includes('The specimen consists of'));
  assert.ok(!off.report.includes('(1-4)'));
  const hdr = run({}, { includeHeader: true });
  assert.match(hdr.report, /^SPECIMEN:\n/);
  assert.match(hdr.report, /MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:/);
});

test('synoptic element order follows the QMH Thorax-Lung page (analysis/qmh/lung.txt), house exceptions noted', () => {
  // Element headings from analysis/qmh/lung.txt in page order, mapped to our row labels.
  const QMH = ['Histologic type', 'Histologic grade', 'Spread through air spaces (STAS)', 'Visceral pleura invasion', 'Lymphatic and / or vascular invasion', 'Tumour extension', 'Treatment effect',
    'Bronchial margin', 'Vascular margin', 'Parenchymal margin', 'Regional lymph nodes', 'Distant metastasis', 'pTNM'];
  const ours = Object.keys(rows(run(byName['07-t4-different-lobe-nodule-pleural-nodules-m1a'].patch, { printPTNM: true })));
  let cursor = -1;
  for (const label of QMH) {
    const idx = ours.indexOf(label);
    assert.ok(idx > cursor, `${label} out of QMH order (index ${idx} after ${cursor}); rows: ${ours.join(' | ')}`);
    cursor = idx;
  }
  // House exceptions: the "Specimen and tumour" section (procedure, site, size, nodules) above the microscopic
  // elements; Tumour histology directly after the grade (as in the ovary and endometrium templates).
  assert.ok(ours.indexOf('Tumour size') < ours.indexOf('Histologic type'));
  assert.equal(ours.indexOf('Tumour histology'), ours.indexOf('Histologic grade') + 1);
});

test('checks: invasive > total, MIA > 5 mm, treatment-effect mismatch, override parse, viable size', () => {
  assert.ok(errs(run({ tumourSizeMm: '20', invasiveSizeMm: '25' })).some((m) => /larger than the total/.test(m)));
  assert.ok(errs(run({ histType: 'Minimally invasive adenocarcinoma, non-mucinous', tumourSizeMm: '18', invasiveSizeMm: '7', patterns: '' })).some((m) => /more than 5 mm invasion/.test(m)));
  assert.ok(errs(run({ treatmentEffect: '10 % or less residual viable tumour', viablePct: '30' })).some((m) => /more than 10 % viable/.test(m)));
  assert.ok(errs(run({ tnmOverride: 'stage 3' })).some((m) => /could not be parsed/.test(m)));
  const ov = run({ tnmOverride: 'pT3 pN2a', tnmOverrideReason: 'chest wall involvement on the radiology-pathology review' }, { printPTNM: true });
  assert.match(rows(ov)['pTNM'], /^pT3 pN2a \[pathologist override; derived T2a\/N2a - chest wall involvement on the radiology-pathology review\]$/);
  assert.ok(info(run({ pleuralInvasion: 'PL1, extension through elastic membrane', elasticStain: false })).some((m) => /without an elastic stain/.test(m)));
  assert.ok(info(run({ histType: ADENO, patterns: 'lepidic 90, acinar 10', tumourSizeMm: '20', invasiveSizeMm: '4' })).some((m) => /consider minimally invasive adenocarcinoma/.test(m)));
});

test('frozen link: prefillFromFrozen maps the lung wedge scenario onto the synoptic values', () => {
  const fv = { scenario: 'Lung wedge / nodule', luSide: 'Left', luLobe: 'Lower lobe', luSpecimen: 'Wedge excision', luSize: '6 x 3 x 2', luNoduleCount: '1', luNoduleCm: '0.8', luMarginCm: '0.5', luPleuraGross: 'Puckered', lungResult: 'Adenocarcinoma', luPattern: 'acinar predominant', lungMargin: 'Negative' };
  const p = prefillFromFrozen(fv);
  assert.equal(p.laterality, 'Left');
  assert.deepEqual(p.lobes, ['Lower lobe']);
  assert.equal(p.procedure, 'Wedge resection');
  assert.equal(p.specimenDims, '60 x 30 x 20');
  assert.equal(p.tumourSizeMm, '8');
  assert.equal(p.parenchymalMarginMm, '5');
  assert.equal(p.parenchymalMargin, 'Uninvolved by invasive carcinoma');
  assert.equal(p.bronchialMargin, 'Not applicable');
  assert.equal(p.vascularMargin, 'Not applicable');
  assert.equal(p.pleuraGross, 'Puckered');
  assert.equal(p.histType, ADENO);
  assert.equal(prefillFromFrozen({ scenario: 'Lung wedge / nodule', lungResult: 'Squamous cell carcinoma' }).histType, SCC_K);
  assert.equal(prefillFromFrozen({ scenario: 'Lung wedge / nodule', lungResult: 'Benign' }).histType, undefined, 'benign frozen results are not mapped');
  assert.equal(prefillFromFrozen({ scenario: 'Lung wedge / nodule', luSpecimen: 'Segmentectomy' }).procedure, 'Segmentectomy');
  assert.deepEqual(prefillFromFrozen({ scenario: 'Margin' }), {});
  assert.deepEqual(prefillFromFrozen(null), {});
});

test('01 frozen -> synoptic linked pair: one letter, letters dropped, the frozen line defers to the synoptic, pT1a pNX IA1', () => {
  const fs_ = registry.frozen_section;
  const frozenValues = { ...defaults(fs_.schema), specimenName: 'Left lower lobe wedge', scenario: 'Lung wedge / nodule', luSide: 'Left', luLobe: 'Lower lobe', luSpecimen: 'Wedge excision', luSize: '6 x 3 x 2', luNoduleCount: '1', luNoduleCm: '0.8', luMarginCm: '0.5', luPleuraGross: 'Puckered', lungResult: 'Adenocarcinoma', luPattern: 'acinar predominant', lungMargin: 'Negative', luBlocks: '2' };
  const patch = prefillFromFrozen(frozenValues);
  const synopticPatch = { ...SOLO, ...patch, patterns: 'acinar 70, lepidic 30', invasiveSizeMm: '8', ihc: 'TTF-1 positive, napsin A positive', pleuralInvasion: 'Not identified', elasticStain: false, tumourDims: '', bronchialMarginMm: '', cutSurface: ['Firm', 'Tan-white'], blockKeyText: '1-2 Tumour with pleura (frozen blocks)\n3 Staple-line margin\n4 Background lung' };
  const synValues = { ...defaults(schema), ...EX, ...synopticPatch };
  const cs = { caseTitle: '', options: { includeHeader: false, macro: true, printPTNM: true }, parts: relabel([
    { templateId: 'frozen_section', values: frozenValues },
    { templateId: 'lung_carcinoma', linked: true, values: synValues }
  ]) };
  assert.deepEqual(cs.parts.map((p) => p.label), ['A', 'A'], 'relabel gives the linked part the same letter');
  const out = generateCase({ frozen_section: fs_, lung_carcinoma: registry.lung_carcinoma }, cs);
  assert.ok(!/^\([A-Z]\)/m.test(out.report), 'one letter in the case: letters dropped everywhere');
  assert.match(out.report, /^Left lower lobe wedge\n\nReceived fresh, a wedge of lung tissue measuring 6 x 3 x 2 cm\./);
  assert.match(out.report, /\n\(1-2\) Tumour with pleura \(frozen blocks\)\.\n/);
  assert.match(out.report, /\nAdenocarcinoma; parenchymal margin clear \(5 mm\)\.\n/, 'intraoperative line');
  assert.match(out.report, /confirm the frozen section diagnosis[^\n]*\n\nSpecimen and tumour\n- Procedure: Wedge resection\n- Laterality: Left\n- Lobe\(s\): Lower lobe/);
  const r = rows(out);
  assert.equal(r['Tumour size'], '8 mm in greatest dimension');
  assert.equal(r['Histologic grade'], 'Grade 2 (IASLC 2020; acinar predominant, no high-grade pattern)');
  assert.equal(r['Parenchymal margin'], 'Uninvolved by invasive carcinoma (closest distance 5 mm)');
  assert.equal(r['pTNM'], 'pT1a pNX');
  assert.match(flatDx(out), /^LUNG, left lower lobe, wedge excision x frozen section - INVASIVE ADENOCARCINOMA, acinar predominant, 8 mm, visceral pleura not invaded; parenchymal margin clear; see synoptic report - pT1a pNX \(AJCC 9th edition\), stage IA1 \(if cM0\)$/);
  assert.equal((out.diagnosis.match(/wedge/gi) || []).length, 1, 'no second head line for the synoptic part');
  // A second letter (a separate node) restores the letters; both A parts sit under one "(A)".
  const two = generateCase({ frozen_section: fs_, lung_carcinoma: registry.lung_carcinoma }, { ...cs, parts: relabel([...cs.parts, { templateId: 'frozen_section', values: { ...defaults(fs_.schema), specimenName: 'Station 11L lymph node', scenario: 'Lymph node', nodeResult: 'Negative' } }]) });
  assert.match(two.report, /^\(A\) Left lower lobe wedge\n\(B\) Station 11L lymph node/);
  assert.match(two.report, /\n\(A1-2\) Tumour/);
  assert.match(two.diagnosis, /^\(A\) LUNG, left lower lobe, wedge excision x frozen section\n- INVASIVE ADENOCARCINOMA/);
  assert.match(two.diagnosis, /\n\(B\) /);
  const file = path.join(FIX, '01-wedge-frozen-linked-synoptic.json');
  const current = { templateIds: ['frozen_section', 'lung_carcinoma'], linked: true, frozenValues, synopticPatch, options: cs.options, report: out.report, checks: out.issues };
  fs.mkdirSync(FIX, { recursive: true });
  if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); return; }
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
  assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
});

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, patch, opts = {}, caseFields = {}] of CASES) {
    const out = run(patch, opts, caseFields);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'lung_carcinoma', patch, options: opts, caseFields, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});

test('fixture expectations: stage lines and key rows', () => {
  const stage = (name) => { const c = byName[name]; const out = run(c.patch, c.options, c.caseFields); return { out, tnm: rows(out)['pTNM'], stage: info(out).find((m) => /^AJCC 9th stage group/.test(m)) }; };
  assert.equal(stage('03-lobectomy-acinar-pl1-n2a').tnm, 'pT2a pN2a');
  assert.match(stage('03-lobectomy-acinar-pl1-n2a').stage, /IIIA\.$/);
  assert.equal(stage('04-scc-pneumonectomy-main-bronchus-n1').tnm, 'pT2b pN1');
  assert.match(stage('04-scc-pneumonectomy-main-bronchus-n1').stage, /IIB\.$/);
  assert.equal(rows(stage('04-scc-pneumonectomy-main-bronchus-n1').out)['Histologic grade'], 'G2: Moderately differentiated');
  const post = stage('05-post-neoadjuvant-solid-adeno-ypt1b');
  assert.equal(post.tnm, 'ypT1b ypN0');
  assert.match(post.stage, /IA2\.$/);
  assert.equal(rows(post.out)['Treatment effect'], '10 % or less residual viable tumour (8 % viable tumour)');
  const ais = stage('06-ais-and-mia-segmentectomy');
  assert.equal(ais.tnm, 'pTis pN0');
  assert.match(ais.stage, /0\.$/);
  assert.equal(rows(ais.out)['Histologic grade'], 'Not applicable');
  assert.equal(rows(ais.out)['Parenchymal margin'], 'Uninvolved by adenocarcinoma in situ (closest distance 9 mm)');
  const mia = run({ ...byName['06-ais-and-mia-segmentectomy'].patch, histType: 'Minimally invasive adenocarcinoma, non-mucinous', invasiveSizeMm: '4', parenchymalMargin: 'Uninvolved by invasive carcinoma' }, { printPTNM: true });
  assert.equal(rows(mia)['pTNM'], 'pT1mi pN0');
  assert.ok(info(mia).some((m) => /IA1\.$/.test(m)));
  const t4 = stage('07-t4-different-lobe-nodule-pleural-nodules-m1a');
  assert.equal(t4.tnm, 'pT4 pN0 pM1a');
  assert.match(t4.stage, /IVA\.$/);
  assert.match(t4.out.report, /^\(A\) Lung, right middle and lower lobes, bilobectomy\n\(B\) Pleura, parietal, biopsy/);
  assert.match(t4.out.diagnosis, /\n\(B\) PLEURA, parietal, biopsy - METASTATIC ADENOCARCINOMA/);
});
