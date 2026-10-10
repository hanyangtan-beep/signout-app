// HER2 dual-ISH calculator for the standalone HER2 ISH template (`breast_biomarkers`; user request
// 2026-10-08). Pure — no DOM — so the counting, the rounding and the group are tested in Node
// (tests/dish_calculator.test.js); src/app.js only draws the grid (field type `dishCounter`).
//
// Counting follows the QMH "HER2 DISH calculator" (Anatomical Pathology Division, Queen Mary Hospital,
// last updated 25-Oct-2021; https://awiloqmh.github.io/CancerReportingTemplate/Biomarker-DISH-calculator.html,
// saved as docs/reference/Biomarker-DISH-calculator.html): HER2 (black) and CEP17 (red) signals in each
// of 20 nuclei, each average to two decimal places, and the ratio of the two printed averages to two
// decimal places, so the printed ratio is always the printed HER2 average over the printed CEP17 one.
// Two departures, both outside what the QMH form can express: more than 20 nuclei may be counted
// (ASCO/CAP asks for at least 20), and rounding is exact half-up on the decimal value. The QMH form
// uses toFixed() on binary floating point, which rounds an exact tie either way (2.55 / 2.00 gives
// 1.27 there, 1.28 here and in its Excel twin, cap/her2_dish.xlsx). With 20 nuclei the averages
// are exact and the two agree everywhere else.
//
// The QMH calculator stops at the numbers. The group is the ASCO/CAP 2018 one (unchanged in the 2023
// update), read from the same rounded numbers so it can never disagree with what the report prints:
//   Group 1  ratio >= 2.0 and >= 4.0 HER2 signals per cell
//   Group 2  ratio >= 2.0 and <  4.0
//   Group 3  ratio <  2.0 and >= 6.0
//   Group 4  ratio <  2.0 and >= 4.0 and < 6.0
//   Group 5  ratio <  2.0 and <  4.0
// Groups 2-4 take their result from the concurrent IHC on the same specimen (CAP HER2 2023 algorithm,
// https://documents.cap.org/documents/her2_breast_update_algorithms_2023.pdf): Group 2 and Group 4 are
// positive only with IHC 3+; Group 3 is positive with IHC 2+ or 3+. IHC 2+ asks first for a recount of at
// least 20 nuclei, including the IHC 2+ area, by a second observer blinded to the first count; the result
// below is the one that stands when the recount keeps the group. The result strings are the QMH options.

export const MIN_NUCLEI = 20;
export const IHC_SCORES = ['0', '1+', '2+', '3+'];

const G1 = 'Positive (amplified, Group 1 result in greater than 10% of cell population)';
const G5 = 'Negative (not amplified, Group 5 result)';
const G2_NEG = 'Negative, Group 2 ISH result (with IHC 0-2+)';
const G2_POS = 'Positive, Group 2 ISH result (with IHC 3+)';
const G3_NEG = 'Negative, Group 3 ISH result (with IHC 0-1+)';
const G3_POS = 'Positive, Group 3 ISH result (with IHC 2-3+)';
const G4_NEG = 'Negative, Group 4 ISH result (with IHC 0-2+)';
const G4_POS = 'Positive, Group 4 ISH result (with IHC 3+)';

/** The eight QMH result options that name an ASCO/CAP group: the ones the calculator writes and owns. */
export const GROUPED_RESULTS = [G5, G2_NEG, G3_NEG, G4_NEG, G1, G2_POS, G3_POS, G4_POS];

/** The guideline condition for each group, as the calculator panel shows it. */
export const GROUP_RULES = {
  1: 'ratio \u2265 2.0, \u2265 4.0 HER2 signals per cell',
  2: 'ratio \u2265 2.0, < 4.0 HER2 signals per cell',
  3: 'ratio < 2.0, \u2265 6.0 HER2 signals per cell',
  4: 'ratio < 2.0, 4.0 to < 6.0 HER2 signals per cell',
  5: 'ratio < 2.0, < 4.0 HER2 signals per cell'
};

const str = (v) => String(v ?? '').trim();

/** One typed count: '' is not counted yet (null); a whole number of signals; anything else is NaN. */
export function signal(raw) {
  const s = str(raw);
  if (s === '') return null;
  return /^\d{1,3}$/.test(s) ? Number(s) : NaN;
}

// Exact half-up rounding to hundredths of num / den, both whole numbers. The division is correctly
// rounded in floating point, so an exact tie (x.5 hundredths) arrives exact and Math.round takes it up.
const hundredths = (num, den) => Math.round((num * 100) / den);
const fixed2 = (h) => (h / 100).toFixed(2);

/**
 * The counts as stored on the part (`dishCounts`: one [HER2, CEP17] pair of typed strings per nucleus,
 * blank rows allowed) reduced to what the report needs. A nucleus counts only when both its numbers are
 * whole numbers; one with a single number (`partial`) or a non-number (`invalid`) is left out and named.
 */
export function tally(counts) {
  const rows = Array.isArray(counts) ? counts : [];
  let cells = 0;
  let her2Total = 0;
  let cep17Total = 0;
  let entered = false;
  const partial = [];
  const invalid = [];
  rows.forEach((row, i) => {
    const [h, c] = Array.isArray(row) ? row : [];
    const hn = signal(h);
    const cn = signal(c);
    if (hn === null && cn === null) return;
    entered = true;
    if (Number.isNaN(hn) || Number.isNaN(cn)) { invalid.push(i); return; }
    if (hn === null || cn === null) { partial.push(i); return; }
    cells += 1;
    her2Total += hn;
    cep17Total += cn;
  });
  const out = { entered, cells, her2Total, cep17Total, partial, invalid, her2Text: '', cep17Text: '', ratioText: '' };
  if (!cells) return out;
  const her2H = hundredths(her2Total, cells);
  const cep17H = hundredths(cep17Total, cells);
  out.her2Text = fixed2(her2H);
  out.cep17Text = fixed2(cep17H);
  if (cep17H > 0) out.ratioText = fixed2(hundredths(her2H, cep17H));
  return out;
}

/** ASCO/CAP 2018 group from the ratio and the average HER2 signals per cell; null without both. */
export function ishGroup(ratio, her2) {
  if (!Number.isFinite(ratio) || !Number.isFinite(her2)) return null;
  // Each arm states its condition in full so it reads straight against the group table above.
  if (ratio >= 2 && her2 >= 4) return 1;
  if (ratio >= 2 && her2 < 4) return 2;
  if (ratio < 2 && her2 >= 6) return 3;
  if (ratio < 2 && her2 >= 4 && her2 < 6) return 4;
  return 5;
}

/** Groups 2-4 cannot be resolved by ISH alone. */
export const needsIhc = (group) => group === 2 || group === 3 || group === 4;

/** The group a QMH result option names, or null for the ungrouped ones. */
export function groupOfOption(option) {
  const m = str(option).match(/Group ([1-5])/);
  return m ? Number(m[1]) : null;
}

/**
 * The QMH result option for a group and the concurrent IHC score ('0', '1+', '2+', '3+').
 * '' when the group needs the IHC score and none is given, or there is no group.
 */
export function dishResult(group, ihc) {
  const score = IHC_SCORES.includes(str(ihc)) ? str(ihc) : '';
  switch (group) {
    case 1: return G1;
    case 5: return G5;
    case 2: return score ? (score === '3+' ? G2_POS : G2_NEG) : '';
    case 3: return score ? (score === '2+' || score === '3+' ? G3_POS : G3_NEG) : '';
    case 4: return score ? (score === '3+' ? G4_POS : G4_NEG) : '';
    default: return '';
  }
}

const num = (v) => (str(v) === '' ? NaN : Number(str(v)));

/**
 * Generator `derive` hook (src/engine.js applyDerived): the fields the calculator keeps in step after
 * an edit. Editing the counts rewrites the number of cells, both averages and the ratio, and — once at
 * least 20 nuclei are counted (and, for Groups 2-4, the IHC score is given) — the result. Fewer nuclei,
 * or a missing IHC score, clear a grouped result the counts no longer support; an ungrouped choice
 * ("Cannot be determined", the plain amplified / not amplified pair) is left alone until a group can be
 * read. Choosing the IHC score re-reads the result from the counts, or from the typed averages and ratio
 * when nothing has been counted. Nothing derives on load, so a saved case opens exactly as saved.
 */
export function deriveDish(values, changedId) {
  if (changedId !== 'dishCounts' && changedId !== 'dishIhc') return {};
  const v = values || {};
  const t = tally(v.dishCounts);
  const patch = {};
  if (changedId === 'dishCounts') {
    patch.dishCells = t.cells ? String(t.cells) : '';
    patch.dishHer2 = t.her2Text;
    patch.dishCep17 = t.cep17Text;
    patch.dishRatio = t.ratioText;
  }
  let result = '';
  if (t.entered) {
    if (t.cells >= MIN_NUCLEI && t.ratioText) result = dishResult(ishGroup(Number(t.ratioText), Number(t.her2Text)), v.dishIhc);
  } else if (changedId === 'dishIhc') {
    result = dishResult(ishGroup(num(v.dishRatio), num(v.dishHer2)), v.dishIhc);
  }
  if (result) patch.her2Dish = result;
  else if ((t.entered || changedId === 'dishCounts') && GROUPED_RESULTS.includes(str(v.her2Dish))) patch.her2Dish = '';
  return patch;
}

/**
 * What the calculator panel shows under the grid. Plain data; src/app.js lays it out.
 * `state`: 'empty' (nothing counted), 'counting' (fewer than 20 nuclei), 'no-ratio' (no CEP17 signal),
 * 'needs-ihc' (Groups 2-4 without the IHC score) or 'done'.
 */
export function calculatorView(values) {
  const v = values || {};
  const t = tally(v.dishCounts);
  const view = { ...t, min: MIN_NUCLEI, group: null, rule: '', result: '', recount: false, state: 'empty' };
  if (!t.entered) return view;
  if (!t.ratioText) { view.state = t.cells ? 'no-ratio' : 'counting'; return view; }
  view.group = ishGroup(Number(t.ratioText), Number(t.her2Text));
  view.rule = GROUP_RULES[view.group];
  if (t.cells < MIN_NUCLEI) { view.state = 'counting'; return view; }
  view.result = dishResult(view.group, v.dishIhc);
  view.recount = needsIhc(view.group) && str(v.dishIhc) === '2+';
  view.state = view.result ? 'done' : 'needs-ihc';
  return view;
}
