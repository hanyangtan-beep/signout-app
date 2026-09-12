// Invasive breast carcinoma resection (synoptic, AJCC 8th) - generator, fixtures, QMH element order and the SLN frozen pairing.
// Spec: docs/specs/breast-pair.md. Fixtures: tests/fixtures/breast_ca/*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, generateCase, relabel } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { prefillFromFrozen, gradeOf, histTypeName, shortTypeName } from '../generators/breast_carcinoma.js';
import { SLN } from '../generators/frozen.js';
import { parseSynoptic } from '../src/synoptic.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'breast_ca');
const UPDATE = process.argv.includes('--update');
const registry = await loadAll();
const { schema, generator } = registry.breast_carcinoma;
const EX = schema.example.parts[0].values;
const defaults = (s) => Object.fromEntries(s.fields.filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));

function run(patch = {}, options = {}, caseFields = {}) {
  const values = { ...defaults(schema), ...EX, ...patch };
  const cs = { schemaId: 'breast_carcinoma', caseTitle: '', options: { ...schema.example.options, ...options }, ...caseFields, parts: [{ label: 'A', values }] };
  return generate(schema, generator, cs);
}
const rows = (out) => Object.fromEntries(parseSynoptic(out.synoptic).filter((r) => r.label).map((r) => [r.label, r.value]));
const flatDx = (out) => out.diagnosis.replace(/\s+/g, ' ');
const info = (out) => out.issues.filter((i) => i.level === 'info').map((i) => i.message);
const warns = (out) => out.issues.filter((i) => i.level === 'warn').map((i) => i.message);
const errs = (out) => out.issues.filter((i) => i.level === 'error').map((i) => i.message);

const NST = 'Invasive carcinoma of no special type (ductal)';
const NST_PATTERN = 'Invasive carcinoma of no special type (ductal) with specific morphologic pattern';
const LOBULAR = 'Invasive lobular carcinoma, classic';
const WLE = 'Excision (less than total mastectomy)';
const MASTECTOMY = 'Total mastectomy (including nipple-sparing and skin-sparing mastectomy)';
const NO_SKIN = { nipple: 'Not present in specimen', skin: 'Not present in specimen', dermalLvi: 'Not applicable (no skin present)', skinEllipse: '' };
const ALL_CLEAR = 'Anterior: >10\nPosterior: >10\nSuperior: >10\nInferior: >10\nMedial: >10\nLateral: >10';

// Fixture patches (spec docs/specs/breast-pair.md, fixtures list). 01 is the SLN frozen + mastectomy pair (own test below).
const CASES = [
  ['02-wle-nst-grade1-biomarkers-performed', { procedure: WLE, laterality: 'Right', tumourSite: ['Upper outer quadrant'], sitePosition: "10 o'clock", specimenDims: '55 x 40 x 25', weight: '32', ...NO_SKIN,
    sizeMm: '9', tumourDims: '9 x 8 x 7', cutSurface: ['Firm', 'Grey-white', 'Ill-defined / stellate'], closestGrossMm: '4, superior',
    blockKeyText: '1-4 tumour with the superior margin\n5-9 anterior, posterior, inferior, medial and lateral margins\n10-11 remaining breast\n12-13 sentinel lymph nodes (3 nodes)',
    tubule: 'Score 2', nuclear: 'Score 1', mitotic: 'Score 1', dcis: 'Present, Negative for extensive intraductal component (EIC)', dcisSize: '6', dcisBlocks: '2', blocksExamined: '13', dcisGrade: 'Grade I (low)', dcisNecrosis: 'Not identified', dcisPatterns: ['Cribriform'],
    biomarkers: 'Performed', priorBiomarkerAccession: '', priorBiomarkerSummary: '', er: 'Positive', erIntensity: 'Strong (3)', erNuclei: '>2/3 (5)', pr: 'Positive', prIntensity: 'Moderate (2)', prNuclei: '1/3-2/3 (4)', ki67: '10',
    her2Ihc: 'Negative for over-expression', her2Score: 'Faint / barely perceptible incomplete membrane staining in >10% of the invasive tumour cells (Score 1+)', coldIschemia: '45', fixationTime: '24', testType: 'Laboratory-developed test (QMH, HK).',
    marginsInvasive: 'Anterior: 6\nPosterior: 5\nSuperior: 4\nInferior: >10\nMedial: >10\nLateral: >10', marginsDcis: 'Anterior: 5\nPosterior: 4\nSuperior: 1\nInferior: >10\nMedial: >10\nLateral: >10',
    nodesExamined: '3', nodesSentinel: '3' }, { printPTNM: true }],
  ['03-mastectomy-lobular-multifocal-axillary-n2a-ene', { histType: LOBULAR, focality: 'Multiple foci of invasive carcinoma', focalityDetail: 'two foci, 28 mm and 11 mm', sizeMm: '28', tumourDims: '28 x 22 x 20', closestGrossMm: '9, posterior',
    otherMacro: 'A second firm ill-defined area measuring 11 mm is present 25 mm inferior to the main tumour.', blockKeyText: '1-6 tumour with the closest posterior margin\n7 second focus\n8 nipple\n9-12 margins\n13-14 background breast\n15-20 axillary lymph nodes (14 nodes)',
    tubule: 'Score 3', nuclear: 'Score 2', mitotic: 'Score 1', lvi: 'Present', ihc: 'E-cadherin is negative in the tumour cells.', dcis: 'Not identified', dcisSize: '', dcisBlocks: '', dcisGrade: '', dcisNecrosis: '', dcisPatterns: [], additionalLesions: ['Lobular carcinoma in situ, classic'], microcalcs: ['Not identified'],
    priorBiomarkerSummary: 'ER positive (100%, strong), PR positive (90%, strong), HER2 negative (score 0), Ki-67 8%', marginsInvasive: 'Anterior: >10\nPosterior: 9\nSuperior: >10\nInferior: >10\nMedial: >10\nLateral: >10', marginsDcis: '',
    nodeSampling: 'Axillary dissection', nodesExamined: '14', nodesSentinel: '', nodesMacro: '4', depositMm: '12', depositSite: 'level I', ene: 'Present', eneExtent: '3 mm' }, { printPTNM: true }],
  ['04-wle-post-neoadjuvant-partial-response-ypt1b', { procedure: WLE, laterality: 'Right', tumourSite: ['Upper inner quadrant'], sitePosition: "1 o'clock", specimenDims: '70 x 55 x 30', weight: '60', ...NO_SKIN,
    sizeMm: '8', tumourDims: '8 x 6 x 5', cutSurface: ['Firm', 'Tan', 'Ill-defined / stellate'], closestGrossMm: '6, anterior', otherMacro: 'A clip is present within the tumour bed.',
    blockKeyText: '1-8 tumour bed with the anterior margin\n9-13 posterior, superior, inferior, medial and lateral margins\n14-15 sentinel lymph nodes (3 nodes)',
    tubule: 'Score 3', nuclear: 'Score 3', mitotic: 'Score 2', treatmentEffect: 'Probable or definite response to presurgical therapy in the invasive carcinoma', millerPayne: 'Grade 3',
    lnTreatmentEffect: 'No lymph node metastases. Fibrous scarring or histiocytic aggregates, possibly related to prior lymph node metastases with pathologic complete response',
    dcisSize: '12', dcisBlocks: '4', blocksExamined: '15', dcisGrade: 'Grade III (high)', dcisNecrosis: 'Present, central (expansive "comedo" necrosis)', dcisPatterns: ['Solid', 'Comedo'],
    priorBiomarkerAccession: 'S26-00789', priorBiomarkerSummary: 'ER negative, PR negative, HER2 positive (score 3+), Ki-67 60%',
    marginsInvasive: 'All: >10', marginsDcis: 'Anterior: 3\nPosterior: >10\nSuperior: >10\nInferior: >10\nMedial: >10\nLateral: >10', nodesExamined: '3', nodesSentinel: '3', rcbClass: 'RCB-I', rcbDetail: 'RCB index 0.9' }, { printPTNM: true }],
  ['05-mastectomy-t4b-skin-ulceration-involved-margin-n1a', { histType: NST_PATTERN, histTypeDetail: 'medullary', sizeMm: '48', tumourDims: '48 x 40 x 35', closestGrossMm: '', otherMacro: 'The tumour ulcerates the overlying skin over 15 mm and abuts the anterior margin.',
    blockKeyText: '1-6 tumour with the ulcerated skin and the anterior margin\n7 nipple\n8-11 posterior, superior, inferior and lateral margins\n12 medial margin\n13-14 background breast\n15-18 sentinel and axillary lymph nodes (12 nodes)',
    tubule: 'Score 3', nuclear: 'Score 3', mitotic: 'Score 3', skin: 'Carcinoma directly invades into the dermis or epidermis with macroscopic skin ulceration (classified as T4b)', dermalLvi: 'Present',
    dcis: 'Not identified', dcisSize: '', dcisBlocks: '', dcisGrade: '', dcisNecrosis: '', dcisPatterns: [], microcalcs: ['Not identified'], biomarkers: 'Requested; to be reported separately', priorBiomarkerAccession: '', priorBiomarkerSummary: '',
    marginsInvasive: 'Anterior: involved\nPosterior: 8\nSuperior: >10\nInferior: >10\nMedial: >10\nLateral: >10', marginsDcis: '',
    nodeSampling: 'Sentinel node biopsy and axillary dissection', nodesExamined: '12', nodesSentinel: '2', nodesMacro: '2', nodesMicro: '1', depositMm: '9', depositSite: 'SLN 1' }, { printPTNM: true }],
  ['06-mastectomy-pcr-only-dcis-remains-yptis', { sizeMode: 'No residual carcinoma', sizeMm: '', tumourDims: '', histType: 'No residual invasive carcinoma', tubule: 'Score cannot be determined', nuclear: 'Score cannot be determined', mitotic: 'Score cannot be determined', grade: 'Score cannot be determined',
    closestGrossMm: '', otherMacro: 'A fibrotic tumour bed measuring 30 x 25 x 20 mm with a clip is present in the upper outer quadrant.', blockKeyText: '1-6 tumour bed\n7 nipple\n8-11 margins\n12-14 background breast\n15-16 sentinel lymph nodes (3 nodes)',
    treatmentEffect: 'No residual invasive carcinoma is present in the breast after presurgical therapy', millerPayne: 'Grade 5', lnTreatmentEffect: 'No lymph node metastases and no fibrous scarring or histiocytic aggregates in the nodes',
    dcis: 'Present, Only DCIS is present after presurgical (neoadjuvant) therapy', dcisSize: '4', dcisBlocks: '1', blocksExamined: '14', dcisGrade: 'Grade III (high)', dcisNecrosis: 'Present, central (expansive "comedo" necrosis)', dcisPatterns: ['Solid'], microcalcs: ['Present in non-neoplastic tissue'],
    marginsInvasive: '', marginsDcis: ALL_CLEAR, nodesExamined: '3', nodesSentinel: '3', rcbClass: 'RCB-0 (pCR)', priorBiomarkerAccession: 'S26-00456', priorBiomarkerSummary: 'ER negative, PR negative, HER2 positive (score 3+)' }, { printPTNM: true }]
];
const byName = Object.fromEntries(CASES.map(([n, p, o, c]) => [n, { patch: p, options: o || {}, caseFields: c || {} }]));

test('template metadata and registration', () => {
  assert.equal(schema.id, 'breast_carcinoma');
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.system, 'Breast');
  assert.match(schema.source.url, /BREAST-Cancers\.html$/);
  assert.equal(schema.source.stagingProtocol, 'breast');
  assert.equal(schema.generator, 'breast_carcinoma');
  assert.ok(registry.breast_carcinoma, 'registered');
  assert.equal(registry.frozen_section.generator.PAIRED_TEMPLATE[SLN], 'breast_carcinoma', 'paired with the SLN frozen scenario');
  assert.ok(!JSON.parse(fs.readFileSync(path.join(here, '..', 'templates', 'planned.json'), 'utf8')).planned.some((p) => /breast_carcinoma|breast_dcis|phyllodes/.test(p.id || '')), 'built templates leave planned.json');
});

test('example case: mastectomy, NST grade 2, 23 mm, DCIS, 0/2 SLN -> pT2 pN0(sn) IIA', () => {
  const out = run({}, { printPTNM: true });
  const r = rows(out);
  assert.equal(r['Procedure'], 'Total mastectomy');
  assert.equal(r['Specimen laterality'], 'Left');
  assert.equal(r['Tumour size'], 'Greatest dimension 23 mm (23 x 20 x 18 mm)');
  assert.equal(r['Histologic type'], NST);
  assert.equal(r['Histologic grade'], 'Grade 2 (scores of 6 or 7); total score 6');
  assert.equal(r['Regional lymph nodes'], 'Sentinel node biopsy only');
  assert.equal(r['Number of lymph nodes examined'], '2 (sentinel)');
  assert.equal(r['Number of lymph nodes with tumour'], '0');
  assert.equal(r['pTNM'], 'pT2 pN0(sn)');
  assert.equal(r['Stage group (if cM0)'], 'IIA');
  assert.match(out.report, /Two lymph nodes are identified in the sentinel node specimen\./);
  assert.equal(flatDx(out), 'BREAST, left, total mastectomy - INVASIVE CARCINOMA OF NO SPECIAL TYPE, grade 2, 23 mm; DCIS present (intermediate grade, 15 mm); margins clear (closest: invasive carcinoma 5 mm, posterior; DCIS 4 mm, posterior); see synoptic report - 0 of 2 sentinel lymph nodes involved - pT2 pN0(sn) (AJCC 8th edition), stage IIA (if cM0)');
  assert.ok(info(out).includes('AJCC 8th anatomic stage group (if cM0): IIA. The prognostic stage group (grade, ER, PR, HER2) is not printed.'));
  assert.ok(!/FIGO/.test(out.report));
  assert.ok(out.synoptic.indexOf('Specimen and tumour') < out.synoptic.indexOf('Microscopic findings'));
  const noStage = run({}, { printPTNM: false });
  assert.ok(!/pTNM/.test(noStage.report), 'pTNM prints only with printPTNM');
});

test('Nottingham grade: derived from the three scores, typed grade with mismatch, not graded for microinvasion or no residual carcinoma', () => {
  assert.equal(gradeOf({ tubule: 'Score 3', nuclear: 'Score 2', mitotic: 'Score 1' }).value, 'Grade 2 (scores of 6 or 7); total score 6');
  assert.equal(gradeOf({ tubule: 'Score 1', nuclear: 'Score 1', mitotic: 'Score 1' }).short, 'grade 1');
  assert.equal(gradeOf({ tubule: 'Score 3', nuclear: 'Score 3', mitotic: 'Score 3' }).short, 'grade 3');
  assert.equal(gradeOf({ tubule: 'Score 3', nuclear: 'Score 2', mitotic: 'Score 1', grade: 'Grade 3 (scores of 8 or 9)' }).mismatch, true);
  assert.equal(gradeOf({ histType: 'No residual invasive carcinoma' }).value, 'Not applicable (no residual invasive carcinoma)');
  assert.equal(gradeOf({ tubule: 'Only microinvasion present (not graded)' }).short, 'microinvasion only');
  assert.ok(errs(run({ grade: 'Grade 3 (scores of 8 or 9)' })).some((m) => /scores total 6/.test(m) && /Grade 3 is selected/.test(m)), 'typed grade that disagrees with the scores is an error');
});

test('histologic type names: pattern detail is not doubled, lobular and mixed types, diagnosis casing', () => {
  assert.equal(histTypeName({ histType: NST_PATTERN, histTypeDetail: 'medullary' }), `${NST_PATTERN} (medullary)`);
  assert.equal(histTypeName({ histType: NST_PATTERN, histTypeDetail: 'with medullary pattern' }), `${NST_PATTERN} (medullary)`, 'a typed "with ... pattern" is unwrapped');
  assert.equal(shortTypeName({ histType: NST_PATTERN, histTypeDetail: 'with medullary pattern' }), 'Invasive carcinoma of no special type with medullary pattern');
  assert.equal(shortTypeName({ histType: LOBULAR }), 'Invasive lobular carcinoma');
  assert.equal(shortTypeName({ histType: 'Mixed histologic types (specify types and percentages)', histTypeDetail: 'NST 70%, lobular 30%' }), 'Invasive carcinoma, mixed types (NST 70%, lobular 30%)');
  assert.match(flatDx(run(byName['05-mastectomy-t4b-skin-ulceration-involved-margin-n1a'].patch)), /INVASIVE CARCINOMA OF NO SPECIAL TYPE WITH MEDULLARY PATTERN, grade 3, 48 mm; invading the skin \(with ulceration\); anterior margin involved; other margins clear \(closest 8 mm, posterior\)/);
  assert.ok(errs(run({ histType: 'Mixed histologic types (specify types and percentages)', histTypeDetail: '' })).some((m) => /specified types/.test(m)));
});

test('T and N (AJCC 8th): size bands, (m) for multifocal, T4b skin, ypT after therapy, pN0(sn) / pN1mi / pN1a / pN2a / pN3a and (i+)', () => {
  const t = (patch) => rows(run(patch, { printPTNM: true }))['pTNM'];
  assert.equal(t({ sizeMm: '9' }), 'pT1b pN0(sn)');
  assert.equal(t({ sizeMm: '18' }), 'pT1c pN0(sn)');
  assert.equal(t({ sizeMm: '52' }), 'pT3 pN0(sn)');
  assert.equal(t({ sizeMm: '28', focality: 'Multiple foci of invasive carcinoma', focalityDetail: 'two foci' }), 'pT2(m) pN0(sn)');
  assert.equal(t({ skin: 'Carcinoma directly invades into the dermis or epidermis with macroscopic skin ulceration (classified as T4b)' }), 'pT4b pN0(sn)');
  assert.equal(t({ nodesMicro: '1', depositMm: '1.5' }), 'pT2 pN1mi(sn)');
  assert.equal(t({ nodesMacro: '1', depositMm: '4' }), 'pT2 pN1a(sn)');
  assert.equal(t({ nodesItc: '1' }), 'pT2 pN0(i+)(sn)');
  assert.equal(t({ nodeSampling: 'Axillary dissection', nodesExamined: '14', nodesSentinel: '', nodesMacro: '4', depositMm: '12' }), 'pT2 pN2a');
  assert.equal(t({ nodeSampling: 'Axillary dissection', nodesExamined: '18', nodesSentinel: '', nodesMacro: '10', depositMm: '12' }), 'pT2 pN3a');
  assert.equal(t({ nodeSampling: 'No nodes submitted', nodesExamined: '', nodesSentinel: '' }), 'pT2 pNX');
  assert.equal(t({ treatmentEffect: 'Probable or definite response to presurgical therapy in the invasive carcinoma', millerPayne: 'Grade 3' }), 'ypT2 ypN0(sn)');
  assert.match(flatDx(run({ nodeSampling: 'Axillary dissection', nodesExamined: '14', nodesSentinel: '', nodesMacro: '4', depositMm: '12', ene: 'Present' })), /4 of 14 axillary lymph nodes involved \(macrometastases up to 12 mm; extranodal extension present\)/);
  assert.match(flatDx(run(byName['05-mastectomy-t4b-skin-ulceration-involved-margin-n1a'].patch)), /3 of 12 lymph nodes involved \(macrometastases in 2 and micrometastasis in 1; largest deposit 9 mm\)/);
  assert.ok(errs(run({ nodesMacro: '3' })).some((m) => /3 involved but only 2 examined/.test(m)), 'positive nodes above the examined count');
});

test('margins: walker syntax, "All: >10", closest wording, involved margin messages by procedure', () => {
  const clear = run({ marginsInvasive: 'All: >10', marginsDcis: 'All: >10' });
  assert.match(flatDx(clear), /margins clear \(closest: invasive carcinoma all greater than 10 mm; DCIS all greater than 10 mm\); see synoptic report/);
  const wle = run({ procedure: WLE, marginsInvasive: 'Anterior: involved\nPosterior: 5' });
  assert.match(flatDx(wle), /anterior margin involved; other margins clear \(closest 5 mm, posterior\)/);
  assert.ok(info(wle).some((m) => /no ink on tumour/.test(m)));
  const mast = run({ marginsInvasive: 'Anterior: involved\nPosterior: 5' });
  assert.ok(info(mast).some((m) => /mastectomy specimen/.test(m)));
  assert.ok(warns(run({ marginsDcis: 'Superior: 1\nAnterior: 8' })).some((m) => /DCIS/.test(m) && /2 mm/.test(m)), 'DCIS within 2 mm warns');
  assert.ok(errs(run({ marginsInvasive: 'Front: 5' })).some((m) => /margin/i.test(m)), 'unknown face is an error');
});

test('biomarkers: prior core summary, performed on this specimen (Allred, HER2, Ki-67, timings), requested, not performed', () => {
  const prior = rows(run({}));
  assert.equal(prior['Biomarker studies'], 'Reported on the prior core biopsy (S26-01234): ER positive (90%, strong), PR positive (60%, moderate), HER2 negative (score 1+), Ki-67 15%');
  const done = run(byName['02-wle-nst-grade1-biomarkers-performed'].patch);
  assert.match(done.synoptic, /- Estrogen receptor: Positive\n  - Intensity: Strong \(3\)\n  - Positive nuclei\(%\): >2\/3 \(5\)\n/);
  assert.match(done.synoptic, /- HER2\/neu oncoprotein IHC: Negative for over-expression\n  - Score: [\s\S]*?\(Score 1\+\)\n/);
  assert.match(done.synoptic, /- Proliferation index Ki67 \(%\): 10\n/);
  assert.match(done.synoptic, /- Cold ischemia time: 45 min\n  - Optimal \(<= 60 min\)\.\n/);
  assert.match(done.synoptic, /- Fixation time in buffered formalin: 24 hours\n  - Optimal fixation \(6-72 hours\)\.\n/);
  assert.match(done.synoptic, /guidelines\.\n- Test type: Laboratory-developed test \(QMH, HK\)\.\n/, 'Test type starts its own line');
  assert.equal(rows(run({ biomarkers: 'Requested; to be reported separately' }))['Biomarker studies'], 'Requested; to be reported separately');
  assert.equal(rows(run({ biomarkers: 'Not performed' }))['Biomarker studies'], 'Not performed on this specimen');
  assert.ok(warns(run({ biomarkers: 'Reported on the prior core biopsy', priorBiomarkerAccession: '' })).some((m) => /accession/.test(m)));
});

test('report options: macro off, header on, single part has no letters; a typed other part restores them', () => {
  const off = run({}, { macro: false });
  assert.ok(!off.report.includes('The specimen consists of'));
  assert.ok(!off.report.includes('(1-4)'));
  const hdr = run({}, { includeHeader: true });
  assert.match(hdr.report, /^SPECIMEN:\n/);
  const solo = run({});
  assert.ok(!/\(A\)/.test(solo.report), solo.report);
  const multi = run({ otherParts: 'B) Skin, left chest wall, biopsy - benign' });
  assert.match(multi.report, /^\(A\) Breast, left, total mastectomy\n\(B\) Skin, left chest wall, biopsy/);
  assert.match(multi.report, /\n\(A1-4\) tumour/);
  assert.match(multi.diagnosis, /^\(A\) BREAST, left, total mastectomy\n/);
  assert.match(multi.diagnosis, /\n\n\(B\) SKIN, left chest wall, biopsy - /);
});

test('synoptic element order follows the QMH BREAST-Cancers page (analysis/qmh/breast.txt), house exceptions noted', () => {
  const QMH = ['Procedure', 'Specimen laterality', 'Tumour site', 'Tumour size', 'Histologic type', 'Tumour focality', 'Histologic grade', 'Tubule formation', 'Nuclear pleomorphism', 'Mitotic rate',
    'Tumour extension', 'Lymphatic and/or vascular invasion', 'Dermal lymphatic and/or vascular invasion', 'Breast treatment effect', 'Ductal carcinoma in situ', 'Anterior margin', 'Regional lymph nodes', 'Extranodal extension', 'Distant metastasis', 'pTNM'];
  const ours = Object.keys(rows(run(byName['03-mastectomy-lobular-multifocal-axillary-n2a-ene'].patch, { printPTNM: true })));
  let cursor = -1;
  for (const label of QMH) {
    const idx = ours.indexOf(label);
    assert.ok(idx > cursor, `${label} out of QMH order (index ${idx} after ${cursor}); rows: ${ours.join(' | ')}`);
    cursor = idx;
  }
  // House exceptions: Tumour histology directly after the grade block (grade, then the three scores); the
  // "Specimen and tumour" section (procedure, laterality, site, size) sits above the microscopic elements.
  assert.equal(ours.indexOf('Tumour histology'), ours.indexOf('Mitotic rate') + 1);
  assert.ok(ours.indexOf('Tumour size') < ours.indexOf('Histologic type'));
});

test('checks: treatment effect without Miller-Payne, override parse and print, stage info', () => {
  assert.ok(errs(run({ tnmOverride: 'stage 2' })).some((m) => /could not be parsed/.test(m)));
  const ov = run({ tnmOverride: 'pT3 pN1a', tnmOverrideReason: 'size on the specimen radiograph' }, { printPTNM: true });
  assert.match(rows(ov)['pTNM'], /^pT3 pN1a \[pathologist override; derived T2\/N0\(sn\) - size on the specimen radiograph\]$/);
  assert.ok(info(run({ treatmentEffect: 'Probable or definite response to presurgical therapy in the invasive carcinoma', millerPayne: '' })).some((m) => /LN treatment effect/.test(m)), 'treated case with nodes needs the LN treatment effect');
  assert.ok(warns(run(byName['06-mastectomy-pcr-only-dcis-remains-yptis'].patch)).some((m) => /ypTis\(DCIS\)/.test(m)));
  assert.equal(rows(run(byName['06-mastectomy-pcr-only-dcis-remains-yptis'].patch, { printPTNM: true }))['Tumour focality'], 'Not applicable (no residual invasive carcinoma)');
  assert.equal(rows(run(byName['06-mastectomy-pcr-only-dcis-remains-yptis'].patch, { printPTNM: true }))['pTNM'], 'ypTis(DCIS) ypN0(sn)');
});

test('SLN frozen link: prefillFromFrozen maps the sentinel node scenario onto the node fields', () => {
  const fv = { scenario: SLN, slnSide: 'Left', slnLabel: 'SLN 1', slnSize: '3 x 2 x 1', slnCount: '2', slnNodeSizes: '1.2, 0.8', slnBlocks: '2', slnResult: 'Macrometastasis', slnPositive: '1', slnMetMm: '4', slnEne: 'Not identified' };
  assert.deepEqual(prefillFromFrozen(fv), { nodeSampling: 'Sentinel node biopsy only', nodesExamined: '2', nodesSentinel: '2', nodesMacro: '1', nodesMicro: '0', nodesItc: '0', laterality: 'Left', depositMm: '4', ene: 'Not identified' });
  assert.equal(prefillFromFrozen({ ...fv, slnResult: 'Micrometastasis', slnMetMm: '1.2' }).nodesMicro, '1');
  assert.equal(prefillFromFrozen({ ...fv, slnResult: 'Isolated tumour cells', slnMetMm: '0.1' }).nodesItc, '1');
  assert.equal(prefillFromFrozen({ ...fv, slnResult: 'Negative', slnPositive: '', slnMetMm: '' }).nodesMacro, '0');
  assert.deepEqual(prefillFromFrozen({ scenario: 'Margin' }), {});
  assert.deepEqual(prefillFromFrozen(null), {});
});

test('01 SLN frozen (A) + mastectomy synoptic (B): separate letters, nodes carried from part A, pT2 pN1a(sn) IIB', () => {
  const fs_ = registry.frozen_section;
  const frozenValues = { ...defaults(fs_.schema), specimenName: 'Left SLN 1', scenario: SLN, slnSide: 'Left', slnLabel: 'SLN 1', slnSize: '3 x 2 x 1', slnCount: '2', slnNodeSizes: '1.2, 0.8', slnBlocks: '2', slnResult: 'Macrometastasis', slnPositive: '1', slnMetMm: '4', slnEne: 'Not identified' };
  const patch = prefillFromFrozen(frozenValues);
  const synopticPatch = { ...patch, depositSite: 'SLN 1' };
  const synValues = { ...defaults(schema), ...EX, ...synopticPatch };
  const cs = { caseTitle: '', fsTime: '1015', fsDate: '12/09/2026', fsPathologists: 'Dr. HY Tan', options: { includeHeader: false, macro: true, printPTNM: true }, parts: relabel([
    { templateId: 'frozen_section', values: frozenValues },
    { templateId: 'breast_carcinoma', values: synValues }
  ]) };
  assert.deepEqual(cs.parts.map((p) => p.label), ['A', 'B'], 'the mastectomy is its own specimen, so it gets its own letter');
  const out = generateCase({ frozen_section: fs_, breast_carcinoma: registry.breast_carcinoma }, cs);
  assert.match(out.report, /^\(A\) Left SLN 1\n\(B\) Breast, left, total mastectomy\n/);
  assert.match(out.report, /\(A\) Received fresh, a piece of fibroadipose tissue measuring 3 x 2 x 1 cm\. Two lymph nodes are identified within/);
  assert.match(out.report, /Metastatic carcinoma, >2 mm \(1 of 2 lymph nodes\)\./, 'intraoperative line');
  assert.ok(!/Two lymph nodes are identified in the sentinel node specimen/.test(out.report), 'the mastectomy macro does not re-count the nodes from part A');
  const r = rows(out);
  assert.equal(r['Regional lymph nodes'], 'Sentinel node biopsy only (sentinel nodes from part A)');
  assert.equal(r['Number of lymph nodes examined'], '2 (sentinel)');
  assert.equal(r['Number of lymph nodes with macrometastasis (>2 mm)'], '1');
  assert.equal(r['Size of largest metastatic deposit'], '4 mm (SLN 1)');
  assert.equal(r['pTNM'], 'pT2 pN1a(sn)');
  assert.equal(r['Stage group (if cM0)'], 'IIB');
  assert.match(out.diagnosis, /^\(A\) LYMPH NODES, left SLN 1, excision x frozen section - METASTATIC CARCINOMA, macrometastasis 4 mm \(1\/2\)\n\n\(B\) BREAST, left, total mastectomy\n- INVASIVE CARCINOMA OF NO SPECIAL TYPE, grade 2, 23 mm; DCIS present/);
  assert.match(out.diagnosis, /\n- 1 of 2 sentinel lymph nodes involved \(macrometastasis up to 4 mm\)\n- pT2 pN1a\(sn\) \(AJCC 8th edition\), stage IIB \(if cM0\)$/);
  const file = path.join(FIX, '01-sln-frozen-plus-mastectomy-synoptic.json');
  const current = { templateIds: ['frozen_section', 'breast_carcinoma'], linked: false, frozenValues, synopticPatch, options: cs.options, report: out.report, checks: out.issues };
  fs.mkdirSync(FIX, { recursive: true });
  if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); return; }
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
  assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
});

test('fixture spot checks: stage lines and diagnosis heads', () => {
  const stage = (name) => rows(run(byName[name].patch, { printPTNM: true }))['pTNM'];
  assert.equal(stage('02-wle-nst-grade1-biomarkers-performed'), 'pT1b pN0(sn)');
  assert.equal(stage('03-mastectomy-lobular-multifocal-axillary-n2a-ene'), 'pT2(m) pN2a');
  assert.equal(stage('04-wle-post-neoadjuvant-partial-response-ypt1b'), 'ypT1b ypN0(sn)');
  assert.equal(stage('05-mastectomy-t4b-skin-ulceration-involved-margin-n1a'), 'pT4b pN1a');
  assert.equal(stage('06-mastectomy-pcr-only-dcis-remains-yptis'), 'ypTis(DCIS) ypN0(sn)');
  assert.match(flatDx(run(byName['03-mastectomy-lobular-multifocal-axillary-n2a-ene'].patch, { printPTNM: true })), /INVASIVE LOBULAR CARCINOMA, grade 2, 28 mm, multifocal; lymphovascular invasion present; margins clear \(closest 9 mm, posterior\); see synoptic report - 4 of 14 axillary lymph nodes involved \(macrometastases up to 12 mm; extranodal extension present\) - pT2\(m\) pN2a \(AJCC 8th edition\), stage IIIA \(if cM0\)/);
  assert.match(flatDx(run(byName['04-wle-post-neoadjuvant-partial-response-ypt1b'].patch, { printPTNM: true })), /with response to presurgical therapy \(Miller-Payne grade 3\)/);
  assert.match(flatDx(run(byName['06-mastectomy-pcr-only-dcis-remains-yptis'].patch, { printPTNM: true })), /^BREAST, left, total mastectomy - NO RESIDUAL INVASIVE CARCINOMA after presurgical therapy \(Miller-Payne grade 5\); DCIS present \(high grade, 4 mm\); DCIS margins clear \(all greater than 10 mm\)/);
});

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, patch, opts = {}, caseFields = {}] of CASES) {
    const out = run(patch, opts, caseFields);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'breast_carcinoma', patch, options: opts, caseFields, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
