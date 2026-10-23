// Fallopian tube epithelial lesions: p53 signature, STIL and STIC (Phase 74, 23 October 2026).
//
// Shared by the benign tube and ovary form (generators/adnexa_benign.js) and the uterus form's tube and
// adnexa parts (generators/uterus.js), so a lesion reads the same in both. Sources, kept out of the printed
// text (docs/reference/fallopian-tube-lesions-sources.md):
//   - p53 signature, STIL and STIC: PathologyOutlines, serous tubal intraepithelial carcinoma
//     (https://www.pathologyoutlines.com/topic/fallopiantubesstic.html): a p53 signature is histologically
//     normal epithelium with mutant-pattern p53 and a low proliferation index; a STIL has abnormal
//     histology with preserved polarity, mutant p53 and a variable index; a STIC has significant atypia,
//     architectural change, a high index and mutant p53 (diffuse, null or cytoplasmic).
//   - SEE-FIM sampling of risk-reducing specimens: https://pmc.ncbi.nlm.nih.gov/articles/PMC3319355/ and
//     https://en.wikipedia.org/wiki/SEE-FIM_Protocol.
//   - House wording: the p53 signature report in the 2021-2026 biopsy export ("Only scattered cells are
//     positive for Ki67", printed with the app's Ki-67 spelling; "There is no evidence of STIC or invasive
//     malignancy"), without its "putative precursor" clause and its consecutive-cell count, which is
//     reference, not report prose; the STIC
//     diagnosis line "SEROUS TUBAL INTRAEPITHELIAL CARCINOMA (STIC) - see comment" with an MDT comment;
//     "There is no evidence of malignancy or serous tubal intraepithelial carcinoma (STIC)" for an
//     unremarkable risk-reducing specimen.
// Printed sentences are released-report prose only: what is seen and what the stains show.

export const P53_SIGNATURE = 'p53 signature';
export const STIL = 'STIL';
export const STIC = 'STIC – see comment';
export const LESIONS = [P53_SIGNATURE, STIL, STIC];
export const P53_OPTIONS = ['Not performed', 'Wild-type', 'Aberrant – overexpression', 'Aberrant – null'];
export const KI67_OPTIONS = ['Not performed', 'Low', 'Increased'];

/** Option strings may carry an en dash ("STIC – see comment") or a hyphen; compare on the hyphen form. */
const key = (s) => String(s || '').replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();

/** The most advanced lesion among the ticked findings, or ''. */
export function tubeLesion(findings) {
  const f = (Array.isArray(findings) ? findings : []).map(key);
  for (const l of [STIC, STIL, P53_SIGNATURE]) if (f.includes(key(l))) return l;
  return '';
}

/** The findings with the three lesions taken out (the benign sentences and lines are built from the rest). */
export const withoutLesions = (findings) => (Array.isArray(findings) ? findings : []).filter((x) => !LESIONS.map(key).includes(key(x)));

const MORPHOLOGY = {
  [P53_SIGNATURE]: 'The fallopian tube epithelium shows no cytological abnormality.',
  [STIL]: 'A focus of tubal epithelium shows nuclear enlargement, mild atypia and loss of polarity.',
  [STIC]: 'A focus of tubal epithelium is stratified and lacks ciliated cells, with loss of nuclear polarity, enlarged hyperchromatic pleomorphic nuclei and prominent nucleoli, without stromal invasion.'
};
const NAMED = {
  [P53_SIGNATURE]: 'The features are those of a p53 signature.',
  [STIL]: 'The features are those of a serous tubal intraepithelial lesion (STIL).',
  [STIC]: 'The features are those of serous tubal intraepithelial carcinoma (STIC); see comment.'
};

function p53Sentence(v, lesion) {
  const p = key(v.p53Pattern);
  if (p === 'Wild-type') {
    return lesion ? 'Immunohistochemistry for p53 shows a wild-type expression pattern.'
      : 'The fallopian tube epithelium shows a wild-type expression pattern on immunohistochemistry for p53.';
  }
  if (p === 'Aberrant - overexpression') {
    return lesion === STIL || lesion === STIC
      ? 'Immunohistochemistry shows aberrant p53 expression, with strong diffuse nuclear staining of the lesional cells.'
      : 'Immunohistochemistry shows strong nuclear p53 expression in a short stretch of tubal epithelial cells.';
  }
  if (p === 'Aberrant - null') return 'Immunohistochemistry shows aberrant p53 expression, with complete absence of nuclear staining in the lesional cells (null pattern).';
  return '';
}

function ki67Sentence(v, lesion) {
  if (v.ki67 === 'Low') return 'Only scattered cells are positive for Ki-67.';
  if (v.ki67 === 'Increased') return `The Ki-67 proliferation index is increased in the ${lesion ? 'lesional cells' : 'tubal epithelium'}.`;
  return '';
}

/** The lesion, p53 and Ki-67 sentences, in that order (none when nothing is ticked or stained). */
export function lesionMicro(v, findings) {
  const lesion = tubeLesion(findings);
  return [lesion ? MORPHOLOGY[lesion] : '', p53Sentence(v, lesion), ki67Sentence(v, lesion), lesion ? NAMED[lesion] : ''].filter(Boolean);
}

/**
 * The closing sentence of a tube or adnexa part: none after a STIC, the house negative after a p53 signature
 * or STIL, and "malignancy or STIC" when the question is STIC (risk-reducing or SEE-FIM).
 */
export function lesionCloser(findings, { sticQuestion = false } = {}) {
  const lesion = tubeLesion(findings);
  if (lesion === STIC) return '';
  if (lesion) return 'There is no evidence of STIC or invasive malignancy.';
  return sticQuestion ? 'There is no evidence of malignancy or serous tubal intraepithelial carcinoma (STIC).' : 'There is no evidence of malignancy.';
}

export const LESION_DX = {
  [P53_SIGNATURE]: 'p53 SIGNATURE',
  [STIL]: 'SEROUS TUBAL INTRAEPITHELIAL LESION (STIL)',
  [STIC]: 'SEROUS TUBAL INTRAEPITHELIAL CARCINOMA (STIC)'
};

export const STIC_COMMENT = 'Serous tubal intraepithelial carcinoma (STIC) is identified ({parts}). Discussion at the gynaecological oncology multidisciplinary team meeting is suggested.';

/** Checks shared by both forms; `at` is the collector from _house.js checks(). */
export function lesionChecks(v, findings, { warn, at }) {
  const lesion = tubeLesion(findings);
  const p = key(v.p53Pattern || 'Not performed');
  if (lesion && p === 'Not performed') at('info', `${lesion === STIC ? 'STIC' : lesion}: the p53 result is not recorded.`, 'p53Pattern');
  if (lesion === P53_SIGNATURE && p === 'Wild-type') warn('p53 signature with a wild-type p53 pattern: check the stain or the finding.', 'p53Pattern');
  if (!lesion && p.startsWith('Aberrant')) warn('Aberrant p53 is recorded with no tubal lesion ticked.', 'p53Pattern');
}
