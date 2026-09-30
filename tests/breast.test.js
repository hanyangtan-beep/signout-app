import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { bCode, nottingham } from '../generators/breast.js';
import { biomarkerReport, biomarkerFields, BIOMARKER_FIELD_MAP, HER2_SCORE_OPTIONS } from '../generators/breast_biomarkers.js';

const registry = await loadAll();
const { schema, generator } = registry.breast_biopsy;

function brCase(n = 1) { return createCase(schema, n); }
function part(cs, i, values) { Object.assign(cs.parts[i].values, values); return cs; }
const run = (cs) => generate(schema, generator, cs);

test('breast template is registered with the britishiser on', () => {
  assert.equal(schema.generator, 'breast');
  assert.equal(schema.shortName, 'Breast · core biopsy');
  assert.equal(schema.label, 'Breast');
  // Phase 4 set this false to keep the source biomarker block verbatim. Reversed on request: the
  // same block is shared with breast_carcinoma and breast_dcis, which were already British, so the
  // opt-out printed one template's biomarkers differently from the other two.
  assert.equal(schema.style.british, true);
  assert.ok(schema.fields.some((f) => f.id === 'category'));
});

test('schema biomarker fields are exactly those exported by breast_biomarkers.js (ids A01-A29 mapped)', () => {
  const expected = biomarkerFields({ field: 'biomarkers', is: 'Performed' });
  const inSchema = schema.fields.filter((f) => Object.values(BIOMARKER_FIELD_MAP).includes(f.id));
  assert.deepEqual(inSchema, expected);
  assert.equal(Object.keys(BIOMARKER_FIELD_MAP).length, 22);
  assert.equal(HER2_SCORE_OPTIONS.length, 8);
});

test('B code derives from the category, honours the override, and lymph node cores carry none', () => {
  for (const c of ['B1', 'B2', 'B3', 'B4', 'B5a', 'B5b', 'B5c']) assert.equal(bCode({ values: { category: c } }), c);
  assert.equal(bCode({ values: { category: 'B2', bOverride: 'B3' } }), 'B3');
  assert.equal(bCode({ values: { category: 'B2', bOverride: 'Auto' } }), 'B2');
  assert.equal(bCode({ values: { category: 'LN' } }), '');
});

test('Nottingham grade from the three component scores', () => {
  assert.deepEqual(nottingham('1', '1', '1'), { sum: 3, grade: 1 });
  assert.deepEqual(nottingham('2', '2', '1'), { sum: 5, grade: 1 });
  assert.deepEqual(nottingham('3', '2', '1'), { sum: 6, grade: 2 });
  assert.deepEqual(nottingham('3', '3', '1'), { sum: 7, grade: 2 });
  assert.deepEqual(nottingham('3', '3', '2'), { sum: 8, grade: 3 });
  assert.equal(nottingham('', '2', '1'), null);
});

test('single benign core: specimen, house microscopy and diagnosis with (B2), no part letter', () => {
  const cs = part(brCase(1), 0, { laterality: 'Right', specimenName: "10 o'clock, 4 cm FN", coresTotal: '1', category: 'B2', b2Lesion: 'Fibroadenoma' });
  const out = run(cs);
  assert.equal(out.specimens, "Right breast, 10 o'clock, 4 cm FN, core biopsy");
  assert.ok(out.microscopy.startsWith('Sections show a core of a fibroepithelial lesion composed of compressed, elongated ducts'));
  assert.ok(out.microscopy.endsWith('The features are those of a fibroadenoma. There is no evidence of atypical hyperplasia, in situ or invasive malignancy.'));
  assert.equal(out.diagnosis, "BREAST, right 10 o'clock, 4 cm FN, core biopsy - FIBROADENOMA (B2)");
  assert.ok(!out.report.includes('(A)'));
  assert.ok(!out.report.includes('Biomarkers'));
});

test('calcification target not represented adds the radiological correlation sentence', () => {
  const cs = part(brCase(1), 0, { category: 'B2', b2Lesion: 'Fibrocystic change', target: 'Calcification', calcification: 'Not identified', coresTotal: '5' });
  const out = run(cs);
  assert.ok(out.microscopy.startsWith('Sections show five cores of breast tissue with cyst formation'));
  assert.ok(out.microscopy.endsWith('Calcification is not identified in the sections examined; radiological correlation is recommended.'));
  assert.equal(run(part(brCase(1), 0, { category: 'B2', b2Lesion: 'Fibrocystic change', target: 'Calcification', calcification: 'In benign breast tissue' })).microscopy.split(' Calcification')[1],
    ' is present in benign breast tissue, in keeping with the imaging target.');
});

test('B3 lesions: atypia flag, recommendation sentence and diagnosis wording', () => {
  const out = run(part(brCase(1), 0, { category: 'B3', b3Lesion: 'Intraduct papilloma', b3Atypia: 'Present', b3Advice: 'Excision', specimenName: 'retroareolar' }));
  assert.ok(out.microscopy.includes('The epithelium shows focal cytological atypia. There is no evidence of invasive malignancy. Excision is recommended.'));
  // Deliberate change (Phase 50): released reports read INTRADUCTAL, never INTRADUCT.
  assert.equal(out.diagnosis, 'BREAST, right retroareolar, core biopsy - INTRADUCTAL PAPILLOMA with ATYPIA (B3)');
  const adh = run(part(brCase(1), 0, { category: 'B3', b3Lesion: 'Atypical ductal hyperplasia', b3Advice: 'Multidisciplinary discussion', specimenName: '' }));
  assert.ok(adh.microscopy.endsWith('The features are those of atypical ductal hyperplasia. There is no evidence of invasive malignancy. Multidisciplinary discussion is recommended.'));
  assert.equal(adh.diagnosis, 'BREAST, right, core biopsy - ATYPICAL DUCTAL HYPERPLASIA (B3)');
});

test('B1, B4 and B5c diagnosis lines', () => {
  assert.equal(run(part(brCase(1), 0, { category: 'B1', b1Tissue: 'Fibroadipose tissue only', specimenName: 'UOQ' })).diagnosis,
    'BREAST, right UOQ, core biopsy - FIBROADIPOSE TISSUE ONLY, NO EVIDENCE OF MALIGNANCY (B1)');
  const b4 = run(part(brCase(1), 0, { category: 'B4', b4For: 'Invasive carcinoma', b4Reason: 'Crush artefact', specimenName: 'UOQ' }));
  assert.ok(b4.microscopy.includes('suspicious for invasive carcinoma but are not diagnostic owing to crush artefact. Further sampling is recommended.'));
  assert.equal(b4.diagnosis, 'BREAST, right UOQ, core biopsy - ATYPICAL EPITHELIAL PROLIFERATION, SUSPICIOUS FOR INVASIVE CARCINOMA (B4)');
  assert.equal(run(part(brCase(1), 0, { category: 'B5c', specimenName: 'UOQ' })).diagnosis,
    'BREAST, right UOQ, core biopsy - CARCINOMA, IN SITU VERSUS INVASIVE NOT ASSESSABLE (B5c)');
});

test('DCIS: grade, pattern, necrosis, p63 and (B5a)', () => {
  const out = run(part(brCase(1), 0, { category: 'B5a', laterality: 'Left', specimenName: "2 o'clock", dcisGrade: 'High', dcisPattern: 'Solid', dcisNecrosis: 'Present', dcisP63: 'Yes', calcification: 'Within the lesion' }));
  assert.equal(out.microscopy,
    'Sections show three cores of breast tissue containing ducts expanded by high nuclear grade ductal carcinoma in situ with a solid pattern and comedo-type necrosis. A myoepithelial layer is preserved around the involved ducts, confirmed on p63 immunostaining. There is no evidence of invasive carcinoma in the material examined. Calcification is present within the lesion.');
  assert.equal(out.diagnosis, "BREAST, left 2 o'clock, core biopsy - DUCTAL CARCINOMA IN SITU, high nuclear grade (B5a)");
});

test('invasive NST: provisional grade, extent, DCIS, LVI and (B5b)', () => {
  const out = run(part(brCase(1), 0, { category: 'B5b', laterality: 'Left', specimenName: "2 o'clock, 3 cm FN", coresTotal: '4', invType: 'No special type', tubules: '3', nuclear: '3', mitoses: '2', invExtentMm: '12.5', invDcis: 'Present', lvi: 'Present', ihcText: 'The tumour cells are positive for GATA3' }));
  assert.equal(out.microscopy,
    'Sections show four cores of breast tissue infiltrated by an invasive carcinoma of no special type composed of tumour cells arranged in cords, nests and sheets. Tubule formation is inconspicuous. The tumour cells show marked nuclear pleomorphism with vesicular chromatin and prominent nucleoli. Mitoses are readily identified. Provisional Nottingham grade 3 (tubules 3, nuclear pleomorphism 3, mitoses 2; score 8/9). The invasive carcinoma measures 12.5 mm in maximum extent in the cores. An associated ductal carcinoma in situ component is present. Lymphovascular invasion is present. The tumour cells are positive for GATA3.');
  assert.equal(out.diagnosis, "BREAST, left 2 o'clock, 3 cm FN, core biopsy - INVASIVE CARCINOMA OF NO SPECIAL TYPE, provisional grade 3 (B5b)");
});

test('axillary lymph node core: organ line without a B code', () => {
  const out = run(part(brCase(1), 0, { category: 'LN', laterality: 'Left', specimenName: 'axillary lymph node', coresTotal: '2', lnResult: 'Metastatic carcinoma' }));
  assert.equal(out.specimens, 'Left axillary lymph node, core biopsy');
  assert.ok(out.microscopy.startsWith('Sections show two cores of lymphoid tissue infiltrated by metastatic carcinoma'));
  assert.equal(out.diagnosis, 'LEFT AXILLARY LYMPH NODE, core biopsy - METASTATIC CARCINOMA');
  assert.equal(run(part(brCase(1), 0, { category: 'LN', lnResult: 'Negative for malignancy' })).diagnosis, 'RIGHT AXILLARY LYMPH NODE, core biopsy - NO EVIDENCE OF MALIGNANCY');
});

// ---- Biomarker block: verbatim port of the CancerReportingTemplate breast biomarkers page ----

// biomarkerReport() is the raw block, upstream of applyStyle, so the source spelling is asserted
// here on purpose: "Estrogen", "tumor", "ischemia", "signaling". The respelling is the style layer's
// job and is asserted through generate() in the test below.
test('biomarker block prints the template lines verbatim, with optimal pre-analytics meeting ASCO/CAP', () => {
  const text = biomarkerReport({
    er: 'Positive (>10% positive nuclei)', erIntensity: 'Strong staining (3)', erNuclei: '66-100% (5)',
    pr: 'Negative, Internal control cells present and stain as expected', prIntensity: 'Negative (0)', prNuclei: 'None (0)',
    her2Ihc: 'Positive for over-expression', her2Score: 'Circumferential membrane staining that is complete, intense, and in greater than 10% of tumor cells (Score 3+)',
    her2Hetero: 'Absent', ki67: '40', coldIschemia: '45', fixationTime: '24', testType: 'Laboratory-developed test (QMH, HK).'
  });
  assert.equal(text,
    '- Estrogen receptor: Positive (>10% positive nuclei)\n' +
    '  - Intensity: Strong staining (3)\n' +
    '  - Positive nuclei(%) : 66-100% (5)\n' +
    '- Progesterone receptor: Negative, Internal control cells present and stain as expected\n' +
    '  - Intensity: Negative (0)\n' +
    '  - Positive nuclei(%) : None (0)\n' +
    '- HER2/neu oncoprotein IHC: Positive for over-expression\n' +
    '  - Score : Circumferential membrane staining that is complete, intense, and in greater than 10% of tumor cells (Score 3+)\n' +
    '  - Clustered Heterogeneity : Absent\n' +
    '- Proliferation index Ki67 (%) : 40\n' +
    '\n- Cold ischemia time : 45 min' +
    '\n  - Optimal (<= 60 min).' +
    '\n- Fixation time in buffered formalin : 24 hours' +
    '\n  - Optimal fixation (6-72 hours).' +
    '\n- Meet requirements specified in the latest version of the ASCO/CAP guidelines.\n' +
    '- Test type : Laboratory-developed test (QMH, HK).\n' +
    '\nFormalin-fixed paraffin embedded sections were assessed by IHC technique for ER and PR, using Novocastra ER (clone: 6F11) and Dako PR (clone: PgR636) with the Bond polymer refined detection system.\n' +
    '\nFormalin-fixed paraffin embedded sections were assessed by IHC technique for HER2, using Ventana monoclonal HER2/neu (4B5) with Ventana BenchMark ULTRA multimer detection system.\n' +
    '\nPatients with breast cancers that are HER2 IHC 3+ or IHC 2+/ISH amplified may be eligible for several therapies that disrupt HER2 signaling pathways.\n');
});

test('pre-analytic logic: blank times -> uncertain; prolonged / inadequate -> suboptimal caution', () => {
  const blank = biomarkerReport({ er: 'Negative' });
  assert.ok(blank.includes('\n- Cold ischemic time is uncertain.\n- Formalin fixation time is uncertain.\n- Given the uncertain cold ischaemia time and/or uncertain fixation time, please interpret the above results with caution.\n'));
  const oneBlank = biomarkerReport({ er: 'Negative', coldIschemia: '30' });
  assert.ok(oneBlank.includes('- Cold ischemia time : 30 min\n  - Optimal (<= 60 min).\n- Formalin fixation time is uncertain.\n- Given the uncertain cold ischaemia time'));
  const prolonged = biomarkerReport({ er: 'Negative', coldIschemia: '90', fixationTime: '80' });
  assert.ok(prolonged.includes('- Cold ischemia time : 90 min\n  - Prolonged intervals (> 60 min).\n- Fixation time in buffered formalin : 80 hours\n  - Prolonged intervals (>72 hours).\n- Given the suboptimal cold ischaemia time and/or suboptimal formalin fixation time, please interpret the above results with caution.\n'));
  const inadequate = biomarkerReport({ er: 'Negative', coldIschemia: '60', fixationTime: '5' });
  assert.ok(inadequate.includes('  - Optimal (<= 60 min).\n- Fixation time in buffered formalin : 5 hours\n  - Inadequate fixation (<6 hours).\n- Given the suboptimal'));
  assert.ok(!inadequate.includes('ASCO/CAP'));
  assert.ok(biomarkerReport({ coldIschemia: '60', fixationTime: '6' }).includes('ASCO/CAP'));
  assert.ok(biomarkerReport({ coldIschemia: '60', fixationTime: '72' }).includes('ASCO/CAP'));
});

test('DISH lines, checkbox abnormalities, DISH methodology and Group 2 comment', () => {
  const text = biomarkerReport({
    her2Ihc: 'Equivocal for over-expression', her2Dish: 'Negative, Group 2 ISH result (with IHC 0-2+)', dishCells: '20', dishHer2: '3.5', dishCep17: '1.5', dishRatio: '2.3', dishPctAmp: '15',
    dishAneusomy: true, dishHeteroSignals: true, coldIschemia: '30', fixationTime: '24', bmNotes: 'Repeat testing on excision is advised.'
  });
  assert.ok(text.startsWith(
    '- HER2/neu oncoprotein IHC: Equivocal for over-expression\n' +
    '- HER2 DISH : Negative, Group 2 ISH result (with IHC 0-2+)\n' +
    '  - Number of tumor cell counted : 20\n' +
    '  - Average number of HER2 signals (black) per cell : 3.5\n' +
    '  - Average number of CEP17 signals (red) per cell : 1.5\n' +
    '  - HER2/CEP17 ratio : 2.3\n' +
    '  - Percentage of Cells with Amplified HER2 Signals : 15\n' +
    '  - Other ISH abnormalities: \n' +
    '    - Aneusomy\n' +
    '    - Heterogeneous signals\n'));
  assert.ok(text.includes('\n- Additional notes: \n  - Repeat testing on excision is advised.\n'));
  assert.ok(text.includes('HER2 Dual ISH was performed on formalin-fixed paraffin embedded section with the Ventana INFORM HER2 Dual ISH DNA Probe Cocktail Assay'));
  assert.ok(!text.includes('Novocastra'), 'no ER/PR methodology when ER and PR are blank');
  assert.ok(text.includes("Invasive breast cancers that test 'HER2-negative'"));
  assert.ok(text.includes('This sample has a Group 2 HER2 ISH result (ratio greater than or equal to 2.0; less than 4.0 HER2 signals / cell).'));
});

test('ER comments: internal controls absent and low positive', () => {
  assert.ok(biomarkerReport({ er: 'Negative, Internal control cells absent' }).includes('No internal controls are present, but external controls are appropriately positive.'));
  assert.ok(biomarkerReport({ er: 'Low Positive (1-10% positive nuclei)' }).includes('The cancer in this sample has a low level (1-10%) of ER expression by IHC.'));
});

test('biomarker block is appended to the part microscopy, respelled to British', () => {
  const cs = part(brCase(1), 0, { category: 'B5b', biomarkers: 'Performed', er: 'Positive (>10% positive nuclei)', her2Ihc: 'Negative for over-expression',
    her2Score: 'Incomplete membrane staining that is faint / barely perceptible and in greater than 10% of tumor cells (Score 1+)', coldIschemia: '30', fixationTime: '24' });
  const out = run(cs);
  assert.ok(out.microscopy.includes('Lymphovascular invasion is not identified. Biomarkers results are as follows:\n- Oestrogen receptor: Positive (>10% positive nuclei)\n- HER2/neu oncoprotein IHC: Negative for over-expression\n  - Score : Incomplete membrane staining that is faint / barely perceptible and in greater than 10% of tumour cells (Score 1+)\n\n- Cold ischaemia time : 30 min'));
  assert.ok(out.microscopy.includes('tumour cells arranged in cords'), 'house prose stays British');
  assert.ok(!/\bEstrogen\b/.test(out.microscopy) && !/\btumor\b/.test(out.microscopy) && !/\bischemia\b/.test(out.microscopy));
  // The option value the case holds is untouched; only the printed line is respelled.
  assert.match(cs.parts[0].values.her2Score, /tumor cells \(Score 1\+\)/);
  assert.ok(out.microscopy.trimEnd().endsWith('(IHC 0 results do not result in eligibility currently).'));
  const off = run(part(brCase(1), 0, { category: 'B5b', biomarkers: 'Not performed', er: 'Negative' }));
  assert.ok(!off.microscopy.includes('Biomarkers'));
});

test('example case renders three parts with B codes and a lymph node line', () => {
  const cs = brCase(3);
  schema.example.parts.forEach((p, i) => Object.assign(cs.parts[i].values, p.values));
  const out = run(cs);
  assert.equal(out.diagnosis.split('\n').length, 3);
  assert.ok(out.diagnosis.includes('FIBROADENOMA (B2)'));
  assert.ok(out.diagnosis.includes('INVASIVE CARCINOMA OF NO SPECIAL TYPE, provisional grade 2 (B5b)'));
  assert.ok(out.diagnosis.endsWith('(C) LEFT AXILLARY LYMPH NODE, core biopsy - METASTATIC CARCINOMA'));
  assert.ok(out.microscopy.includes('(B) Sections show four cores'));
  assert.ok(out.microscopy.includes('- Meet requirements specified in the latest version of the ASCO/CAP guidelines.'));
});
