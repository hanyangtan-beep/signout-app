// Breast biomarkers block — a field-for-field port of the "Breast biomarkers" template at
// https://awiloqmh.github.io/CancerReportingTemplate/Biomarker-Breast-markers.html
// (saved copy: docs/reference/Biomarker-Breast-markers.html; field/option listing:
// docs/breast-biomarkers-source.md). Option strings, output lines, pre-analytic thresholds,
// methodology sentences and interpretive comments are reproduced verbatim — do not restyle.
// The only change is the field naming: template ids A01…A29 map to the schema ids below.
//
//   A01 er        A02 erIntensity   A03 erNuclei     A04 pr          A05 prIntensity  A06 prNuclei
//   A07 her2Ihc   A08 her2Score     A25 her2Hetero   A09 her2Dish    A10 dishCells    A11 dishHer2
//   A12 dishCep17 A13 dishRatio     A26 dishPctAmp   A14 dishAneusomy A15 dishHeteroSignals
//   A16 ki67      A28 coldIschemia  A27 fixationTime A29 testType    A19 bmNotes

export const BIOMARKER_FIELD_MAP = {
  A01: 'er', A02: 'erIntensity', A03: 'erNuclei', A04: 'pr', A05: 'prIntensity', A06: 'prNuclei',
  A07: 'her2Ihc', A08: 'her2Score', A25: 'her2Hetero', A09: 'her2Dish', A10: 'dishCells', A11: 'dishHer2',
  A12: 'dishCep17', A13: 'dishRatio', A26: 'dishPctAmp', A14: 'dishAneusomy', A15: 'dishHeteroSignals',
  A16: 'ki67', A28: 'coldIschemia', A27: 'fixationTime', A29: 'testType', A19: 'bmNotes'
};

export const ER_OPTIONS = [
  '', 'Cannot be determined', 'Negative', 'Positive (Allred score >2)',
  'Negative, Internal control cells present and stain as expected', 'Negative, Internal control cells absent',
  'Negative, other (specify):', 'Positive (>10% positive nuclei)', 'Low Positive (1-10% positive nuclei)'
];
export const PR_OPTIONS = ER_OPTIONS.filter((o) => o !== 'Low Positive (1-10% positive nuclei)');
export const INTENSITY_OPTIONS = ['', 'Negative (0)', 'Weak staining (1)', 'Moderate staining (2)', 'Strong staining (3)'];
export const NUCLEI_OPTIONS = ['', 'None (0)', '< 1% (1)', '1-10% (2)', '11-33% (3)', '34-65% (4)', '66-100% (5)'];
export const HER2_IHC_OPTIONS = [
  '', 'Cannot be determined', 'Negative for over-expression', 'Equivocal for over-expression', 'Positive for over-expression',
  'HER2-low (IHC 1+ or IHC 2+ & DISH-)',
  'HER2-ultra-low (faint/barely perceptible and incomplete staining in <10% of tumor cells without amplification on FISH)'
];
export const HER2_SCORE_OPTIONS = [
  '',
  'No membrane staining detected (0 / absent membrane staining)',
  'Membrane staining that is incomplete and is faint / barely perceptible and in less than or equal to 10% of tumor cells (0+ / with membrane staining)',
  'Incomplete membrane staining that is faint / barely perceptible and in greater than 10% of tumor cells (Score 1+)',
  'Weak to moderate complete membrane staining observed in greater than 10% of tumor cells (Score 2+)',
  'Less than or equal to 10% of the cancer has circumferential staining that is complete and intense (3+) (heterogeneous, but very limited in extent; consider results of additional samples) (Score 2+)',
  'Abundant cytoplasmic staining present, obscuring evaluation of membrane stain intensity (Score 2+)',
  'Circumferential membrane staining that is complete, intense, and in greater than 10% of tumor cells (Score 3+)'
];
export const HER2_DISH_OPTIONS = [
  '', 'Cannot be determined', 'Negative (HER2 gene is not amplified)', 'Positive (HER2 gene is amplified)',
  'Negative (not amplified, Group 5 result)', 'Negative, Group 2 ISH result (with IHC 0-2+)',
  'Negative, Group 3 ISH result (with IHC 0-1+)', 'Negative, Group 4 ISH result (with IHC 0-2+)',
  'Positive (amplified, Group 1 result in greater than 10% of cell population)', 'Positive, Group 2 ISH result (with IHC 3+)',
  'Positive, Group 3 ISH result (with IHC 2-3+)', 'Positive, Group 4 ISH result (with IHC 3+)'
];
export const TEST_TYPE_OPTIONS = [
  '', 'Laboratory-developed test (QMH, HK).', 'Food and Drug Administration (FDA) cleared (specify test / vendor):',
  'Laboratory-developed test (Non-U.S.-based health systems).',
  'Laboratory-developed test (Health Canada Approved (specify test / vendor:).', 'Other (specify):'
];

const str = (v) => String(v ?? '').trim();
// The template compares the raw input strings with <, <=, >, >= (JS coerces to numbers).
const cmp = (v) => Number(String(v ?? '').trim());

/** True when any biomarker field has been filled in (mirrors "does the template print anything"). */
export function hasBiomarkerData(v) {
  return Object.values(BIOMARKER_FIELD_MAP).some((id) => (typeof v[id] === 'boolean' ? v[id] : str(v[id]) !== ''));
}

/**
 * Verbatim port of the template's updateDescription(frm). `v` holds the part values under the
 * schema ids. Returns the report text exactly as the template's "Check your Report" box would.
 */
export function biomarkerReport(v) {
  const A01 = str(v.er), A02 = str(v.erIntensity), A03 = str(v.erNuclei);
  const A04 = str(v.pr), A05 = str(v.prIntensity), A06 = str(v.prNuclei);
  const A07 = str(v.her2Ihc), A08 = str(v.her2Score), A25 = str(v.her2Hetero);
  const A09 = str(v.her2Dish), A10 = str(v.dishCells), A11 = str(v.dishHer2), A12 = str(v.dishCep17);
  const A13 = str(v.dishRatio), A26 = str(v.dishPctAmp);
  const A14 = !!v.dishAneusomy, A15 = !!v.dishHeteroSignals;
  const A16 = str(v.ki67), A28 = str(v.coldIschemia), A27 = str(v.fixationTime), A29 = str(v.testType), A19 = str(v.bmNotes);

  let T = '';
  if (A01 !== '') T += '- Estrogen receptor: ' + A01 + '\n';
  if (A02 !== '') T += '  - Intensity: ' + A02 + '\n';
  if (A03 !== '') T += '  - Positive nuclei(%) : ' + A03 + '\n';
  if (A04 !== '') T += '- Progesterone receptor: ' + A04 + '\n';
  if (A05 !== '') T += '  - Intensity: ' + A05 + '\n';
  if (A06 !== '') T += '  - Positive nuclei(%) : ' + A06 + '\n';
  if (A07 !== '') T += '- HER2/neu oncoprotein IHC: ' + A07 + '\n';
  if (A08 !== '') T += '  - Score : ' + A08 + '\n';
  if (A25 !== '') T += '  - Clustered Heterogeneity : ' + A25 + '\n';
  if (A09 !== '') T += '- HER2 DISH : ' + A09 + '\n';
  if (A10 !== '') T += '  - Number of tumor cell counted : ' + A10 + '\n';
  if (A11 !== '') T += '  - Average number of HER2 signals (black) per cell : ' + A11 + '\n';
  if (A12 !== '') T += '  - Average number of CEP17 signals (red) per cell : ' + A12 + '\n';
  if (A13 !== '') T += '  - HER2/CEP17 ratio : ' + A13 + '\n';
  if (A26 !== '') T += '  - Percentage of Cells with Amplified HER2 Signals : ' + A26 + '\n';
  if (A14 || A15) T += '  - Other ISH abnormalities: ' + '\n';
  if (A14) T += '    - Aneusomy' + '\n';
  if (A15) T += '    - Heterogeneous signals' + '\n';
  if (A16 !== '') T += '- Proliferation index Ki67 (%) : ' + A16 + '\n';

  if (A28 !== '') T += '\n' + '- Cold ischemia time : ' + A28 + ' min';
  else T += '\n' + '- Cold ischemic time is uncertain.';
  if (cmp(A28) <= 60 && A28 !== '') T += '\n' + '  - Optimal (<= 60 min).';
  if (cmp(A28) > 60 && A28 !== '') T += '\n' + '  - Prolonged intervals (> 60 min).';

  if (A27 !== '') T += '\n' + '- Fixation time in buffered formalin : ' + A27 + ' hours';
  else T += '\n' + '- Formalin fixation time is uncertain.';
  if (cmp(A27) < 6 && A27 !== '') T += '\n' + '  - Inadequate fixation (<6 hours).';
  if (cmp(A27) >= 6 && cmp(A27) <= 72 && A27 !== '') T += '\n' + '  - Optimal fixation (6-72 hours).';
  if (cmp(A27) > 72 && A27 !== '') T += '\n' + '  - Prolonged intervals (>72 hours).';

  if (A28 !== '' && cmp(A28) <= 60 && cmp(A27) >= 6 && cmp(A27) <= 72) {
    T += '\n' + '- Meet requirements specified in the latest version of the ASCO/CAP guidelines.' + '\n';
  } else if (A28 === '' || A27 === '') {
    T += '\n' + '- Given the uncertain cold ischaemia time and/or uncertain fixation time, please interpret the above results with caution.' + '\n';
  } else if (cmp(A28) > 60 || cmp(A27) < 6 || cmp(A27) > 72) {
    T += '\n' + '- Given the suboptimal cold ischaemia time and/or suboptimal formalin fixation time, please interpret the above results with caution.' + '\n';
  }

  if (A29 !== '') T += (T.endsWith('\n') ? '' : '\n') + '- Test type : ' + A29 + '\n';
  if (A19 !== '') T += '\n' + '- Additional notes: ' + '\n' + '  - ' + A19 + '\n';

  if (A01 + A04 !== '') {
    T += '\n' + 'Formalin-fixed paraffin embedded sections were assessed by IHC technique for ER and PR, using Novocastra ER (clone: 6F11) and Dako PR (clone: PgR636) with the Bond polymer refined detection system.' + '\n';
  }
  if (A07 !== '') {
    T += '\n' + 'Formalin-fixed paraffin embedded sections were assessed by IHC technique for HER2, using Ventana monoclonal HER2/neu (4B5) with Ventana BenchMark ULTRA multimer detection system.' + '\n';
  }
  if (A09 !== '') {
    T += '\n' + 'HER2 Dual ISH was performed on formalin-fixed paraffin embedded section with the Ventana INFORM HER2 Dual ISH DNA Probe Cocktail Assay on an automated system, and was examined by a pathologist under light microscopy.' + '\n';
  }
  if (A01 === 'Negative, Internal control cells absent') {
    T += '\n' + 'No internal controls are present, but external controls are appropriately positive. If needed, testing another specimen that contains internal controls may be warranted for confirmation of ER status.' + '\n';
  }
  if (A01 === 'Low Positive (1-10% positive nuclei)') {
    T += '\n' + 'The cancer in this sample has a low level (1-10%) of ER expression by IHC. There are limited data on the overall benefit of endocrine therapies for patients with low level (1-10%) ER expression, but they currently suggest possible benefit, so patients are considered eligible for endocrine treatment. There are data that suggest invasive cancers with these results are heterogeneous in both behavior and biology and often have gene expression profiles more similar to ER negative cancers.' + '\n';
  }
  if (A07 === 'Positive for over-expression' ||
      A09 === 'Positive (HER2 gene is amplified)' ||
      A09 === 'Positive (amplified, Group 1 result in greater than 10% of cell population)' ||
      A09 === 'Positive, Group 2 ISH result (with IHC 3+)' ||
      A09 === 'Positive, Group 3 ISH result (with IHC 2-3+)' ||
      A09 === 'Positive, Group 4 ISH result (with IHC 3+)') {
    T += '\n' + 'Patients with breast cancers that are HER2 IHC 3+ or IHC 2+/ISH amplified may be eligible for several therapies that disrupt HER2 signaling pathways.' + '\n';
  }
  if (A07 === 'Negative for over-expression' ||
      A07 === 'Equivocal for over-expression' ||
      A07 === 'HER2-low (IHC 1+ or IHC 2+ & DISH-)' ||
      A07 === 'HER2-ultra-low (faint/barely perceptible and incomplete staining in <10% of tumor cells without amplification on FISH)') {
    T += '\n' + "Invasive breast cancers that test 'HER2-negative' (IHC 0, 1+ or 2+/ISH not-amplified) are more specifically considered 'HER2-negative for protein overexpression/gene amplification' since non-overexpressed levels of the HER2 protein may be present in these cases." + '\n' + '\n' + 'Patients with breast cancers that are HER2 IHC 1+ or IHC 2+/ISH not-amplified may be eligible for a treatment that targets non-amplified/non-overexpressed levels of HER2 expression for cytotoxic drug delivery (IHC 0 results do not result in eligibility currently).' + '\n';
  }
  if (A09 === 'Negative, Group 2 ISH result (with IHC 0-2+)' || A09 === 'Positive, Group 2 ISH result (with IHC 3+)') {
    T += '\n' + 'This sample has a Group 2 HER2 ISH result (ratio greater than or equal to 2.0; less than 4.0 HER2 signals / cell). Evidence is limited on the efficacy of HER2-targeted therapy in the small subset of cases with HER2 / CEP17 ratio greater than or equal to 2.0 and an average HER2 copy number less than 4.0 / cell. In the first generation of adjuvant trastuzumab trials, patients in this subgroup who were randomized to the trastuzumab arm did not appear to derive an improvement in disease free or overall survival, but there were too few such cases to draw definitive conclusions. IHC expression for HER2 should be used to complement ISH and define HER2 status. If IHC result is not 3+ positive, it is recommended that the specimen be considered HER2 negative because of the low HER2 copy number by ISH and lack of protein overexpression.' + '\n';
  }
  if (A09 === 'Negative, Group 3 ISH result (with IHC 0-1+)' || A09 === 'Positive, Group 3 ISH result (with IHC 2-3+)') {
    T += '\n' + 'This sample has a Group 3 HER2 ISH result (ratio less than 2.0; greater than or equal to 6.0 HER2 signals / cell). There are insufficient data on the efficacy of HER2-targeted therapy in cases with HER2 ratio less than 2.0 in the absence of protein overexpression because such patients were not eligible for the first generation of adjuvant trastuzumab clinical trials. When concurrent IHC results are negative (0 or 1+), it is recommended that the specimen be considered HER2 negative.' + '\n';
  }
  if (A09 === 'Negative, Group 4 ISH result (with IHC 0-2+)' || A09 === 'Positive, Group 4 ISH result (with IHC 3+)') {
    T += '\n' + 'This sample has a Group 4 result (ratio less than 2.0; greater than or equal to 4.0 and less than 6.0 HER2 signals / cell). It is uncertain whether patients with greater than or equal to 4.0 and less than 6.0 average HER2 signals / cell and HER2 / CEP17 ratio less than 2.0 benefit from HER2 targeted therapy in the absence of protein overexpression (IHC 3+). If the specimen test result is close to the ISH ratio threshold for positive, there is a high likelihood that repeat testing will result in different results by chance alone. Therefore, when IHC results are not 3+ positive, it is recommended that the sample be considered HER2 negative without additional testing on the same specimen.' + '\n';
  }
  return T;
}

/** Schema field definitions for the biomarker block (appended to the breast schema fields). */
export function biomarkerFields(showIf) {
  const f = (id, label, type, extra = {}) => ({ id, label, type, showIf, ...extra });
  return [
    f('er', 'Estrogen receptor (ER) IHC', 'select', { options: ER_OPTIONS, default: '' }),
    f('erIntensity', 'ER - Intensity', 'select', { options: INTENSITY_OPTIONS, default: '' }),
    f('erNuclei', 'ER - Positive nuclei (%)', 'select', { options: NUCLEI_OPTIONS, default: '' }),
    f('pr', 'Progesterone receptor (PR) IHC', 'select', { options: PR_OPTIONS, default: '' }),
    f('prIntensity', 'PR - Intensity', 'select', { options: INTENSITY_OPTIONS, default: '' }),
    f('prNuclei', 'PR - Positive nuclei (%)', 'select', { options: NUCLEI_OPTIONS, default: '' }),
    f('ki67', 'Ki67 Proliferation index %', 'text', { default: '', placeholder: 'e.g. 20' }),
    f('her2Ihc', 'HER2/neu oncoprotein IHC', 'select', { options: HER2_IHC_OPTIONS, default: '' }),
    f('her2Score', 'HER2 IHC - Score', 'select', { options: HER2_SCORE_OPTIONS, default: '' }),
    f('her2Hetero', 'HER2 IHC - Clustered Heterogeneity', 'text', { default: '', placeholder: 'e.g. Absent' }),
    f('her2Dish', 'HER2/neu oncoprotein DISH', 'select', { options: HER2_DISH_OPTIONS, default: '' }),
    f('dishCells', 'DISH - Number of tumor cells counted', 'text', { default: '' }),
    f('dishHer2', 'DISH - Average HER2 signals (black) per cell', 'text', { default: '' }),
    f('dishCep17', 'DISH - Average CEP17 signals (red) per cell', 'text', { default: '' }),
    f('dishRatio', 'DISH - HER2/CEP17 ratio', 'text', { default: '' }),
    f('dishPctAmp', 'DISH - Cells with Amplified Signals (%)', 'text', { default: '' }),
    f('dishAneusomy', 'Other ISH abnormalities: Aneusomy', 'checkbox', { default: false }),
    f('dishHeteroSignals', 'Other ISH abnormalities: Heterogeneous signals', 'checkbox', { default: false }),
    f('coldIschemia', 'Cold ischemia time (min)', 'text', { default: '', placeholder: 'blank = uncertain', help: 'Optimal <= 60 min; > 60 min prolonged. Leave blank if unknown.' }),
    f('fixationTime', 'Fixation time in buffered formalin (hours)', 'text', { default: '', placeholder: 'blank = uncertain', help: 'Inadequate < 6 h; optimal 6-72 h; > 72 h prolonged. Leave blank if unknown.' }),
    f('testType', 'Test type', 'select', { options: TEST_TYPE_OPTIONS, default: '' }),
    f('bmNotes', 'Biomarker additional notes', 'textarea', { default: '' })
  ];
}
