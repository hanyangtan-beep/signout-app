// Standalone breast HER2 dual-ISH report (template id `breast_biomarkers`).
//
// Named breast_ish.js, not breast_biomarkers.js: that file is the verbatim port of the QMH
// "Breast biomarkers" template and exports named helpers with no default export, so it cannot
// also be a generator module. This file is the thin standalone wrapper around it.
//
// Why a separate template at all: reflex HER2 ISH is issued under its own accession against a
// section from an earlier specimen, with no macroscopic description and no microscopic narrative
// — 18 such requests in the 2024-2026 LIS export under the `HER2` test code, plus 2 reported as
// HER2 FISH. The biomarker block inside breast_biopsy / breast_carcinoma / breast_dcis cannot be
// reached without a host specimen, so these were typed free-hand.
//
// The block is reused EXACTLY as it stands — biomarkerReport() is called with the part values and
// its output is printed unchanged. It prints only the fields that are filled, so a schema carrying
// the ISH fields and not the ER / PR / IHC / Ki67 fields yields the ISH-only report with its DISH
// methodology sentence and the ASCO/CAP Group 2 / 3 / 4 interpretive comments, with no edit to a
// module three built templates depend on.
//
// Register: wording, option strings, sub-item indentation and pre-analytic thresholds all belong to
// the ported template; do not restyle them here. Protected by tests/breast_ish.test.js.
//
// Since 2026-10-08 (user request) the block is printed in two places, still unedited: the result and
// its sub-items in the MOLECULAR FINDINGS block; everything after the block's first blank line — the
// pre-analytic lines, the test type, any notes, the Ventana method sentence and the ASCO/CAP
// interpretive paragraphs — in the COMMENT block, before any snippet or typed comment. The QMH order
// is kept, and MOLECULAR FINDINGS + blank line + COMMENT reads exactly as the block did.
//
// The same day (second user request) DIAGNOSIS became one line: the specimen line, then the verdict
// in the house register, e.g. "Breast, left 8 o'clock, 2 cm FN, core biopsy, paraffin block
// (26BX-012345), for HER-2 DISH test - NEGATIVE for HER2 amplification". Groups 2-4 take the CAP
// wording ("Positive / Negative, based on IHC and ISH results", CAP Breast Biomarker 1.6.1.0) rather
// than "amplification", and point to the comment that explains them.
//
// The HER2 DISH calculator (generators/dish_calculator.js; the grid is field `dishCounts`) fills the
// cells counted, both averages, the ratio and the result through the `derive` hook below.

import { biomarkerReport } from './breast_biomarkers.js';
import { tally, ishGroup, needsIhc, dishResult, groupOfOption, deriveDish, GROUP_RULES, MIN_NUCLEI } from './dish_calculator.js';

const str = (v) => String(v ?? '').trim();
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');

// The specimen as the request writes it, "Breast, left 8 o'clock, 2 cm FN, core biopsy, paraffin block
// (26BX-012345), for HER-2 DISH test." (user example, 2026-10-08). Sentence case, as the SPECIMENS block
// is in every template; the paraffin block is the one the section was cut from, under its earlier
// accession, and is left out when not given. The DIAGNOSIS line repeats it without the full stop.
export function specimenLine(part) {
  const v = part.values;
  const organ = str(v.site) === 'Other' ? '' : str(v.site);
  // The detail follows the organ, so it is lowercased — except on "Other", where it leads the
  // line and keeps the capital it was typed with ("Chest wall nodule, paraffin block …").
  const detail = organ ? lc1(str(v.siteDetail)) : str(v.siteDetail);
  const block = str(v.blockNo).replace(/^\((.*)\)$/, '$1').trim();
  const head = [organ, detail].filter(Boolean).join(', ') || 'Specimen';
  return [head, block ? `paraffin block (${block})` : '', 'for HER-2 DISH test'].filter(Boolean).join(', ');
}

export function specimenName(part) { return `${specimenLine(part)}.`; }

/** No macroscopic description: the section comes from a block reported under an earlier accession. */
export function microscopy() { return ''; }

/**
 * The ported block cut at its first blank line: `result` is the HER2 DISH line and its sub-items,
 * `rest` the pre-analytic lines onwards. The pre-analytic lines always print and always open with a
 * blank line, so the cut always falls between the two.
 */
export function splitBlock(text) {
  const t = String(text ?? '').replace(/\n+$/, '');
  const at = t.indexOf('\n\n');
  if (at < 0) return { result: t, rest: '' };
  return { result: t.slice(0, at), rest: t.slice(at + 2).replace(/^\n+/, '') };
}

/**
 * MOLECULAR FINDINGS: the result lines of the ported block, verbatim. Nothing filled in yet prints
 * nothing rather than a bare heading. The "(A)" line above them is the part heading other templates'
 * blocks carry; the engine removes it when the case has one letter, which for this form is always
 * unless the report is mixed with another template's parts.
 */
export function molecular(part) {
  if (!str(part.values.her2Dish)) return '';
  return `(${part.label})\n${splitBlock(biomarkerReport(part.values)).result}`;
}

/**
 * The verdict for the DIAGNOSIS line, from the result chosen. Group 1, Group 5 and the two ungrouped
 * results are a statement about amplification; Groups 2-4 are read with the IHC and say so, in the CAP
 * words, with the group and the score that decided them.
 */
export function verdict(dish) {
  const d = str(dish);
  if (!d) return '';
  if (d === 'Cannot be determined') return 'HER2 amplification status CANNOT BE DETERMINED; see comment';
  const g = /^(Positive|Negative), (Group [234] ISH result) \(with (IHC [^)]+)\)$/.exec(d);
  if (g) return `${g[1].toUpperCase()} for HER2, based on IHC and ISH results (${g[2]} with ${g[3]}); see comment`;
  if (/^Positive\b/.test(d)) return 'POSITIVE for HER2 amplification';
  if (/^Negative\b/.test(d)) return 'NEGATIVE for HER2 amplification';
  return d;
}

/** One line: the specimen line without its full stop, then the verdict. Nothing until the result is chosen. */
export function diagnosis(part) {
  const v = verdict(part.values.her2Dish);
  return v ? `(${part.label}) ${specimenLine(part)} - ${v}` : '';
}

/** The rest of the ported block, verbatim, at the head of the COMMENT block. */
export function comment(parts) {
  return (parts || [])
    .map((p) => (str(p.values.her2Dish) ? splitBlock(biomarkerReport(p.values)).rest : ''))
    .filter((t) => t !== '')
    .join('\n\n');
}

/** Calculator: counts and the IHC score keep the numbers and the result in step (src/engine.js applyDerived). */
export function derive(values, changedId) { return deriveDish(values, changedId); }

const nuclei = (list) => (list.length === 1 ? `Nucleus ${list[0] + 1}` : `Nuclei ${list.map((i) => i + 1).join(', ')}`);

export function validate(part) {
  const v = part.values;
  const out = [];
  // The older messages carry no field, as the golden fixtures record them; the calculator's name one.
  const warn = (message, field) => out.push(field ? { level: 'warn', message, field } : { level: 'warn', message });
  const info = (message, field) => out.push(field ? { level: 'info', message, field } : { level: 'info', message });

  const dish = str(v.her2Dish);
  const ihc = str(v.dishIhc);
  const t = tally(v.dishCounts);

  // The calculator: a nucleus left out of the averages is named, so the count is never silently short.
  // The last nucleus with anything in it is the one being typed, so a single count there is not
  // flagged; if it is left that way the shortfall shows as a nucleus short of 20.
  if (t.entered) {
    const last = (Array.isArray(v.dishCounts) ? v.dishCounts : [])
      .reduce((at, row, i) => (Array.isArray(row) && (str(row[0]) || str(row[1])) ? i : at), -1);
    const partial = t.partial.filter((i) => i !== last);
    if (partial.length) warn(`${nuclei(partial)}: only one of the two counts is entered, so ${partial.length === 1 ? 'it is' : 'they are'} left out of the averages.`, 'dishCounts');
    if (t.invalid.length) warn(`${nuclei(t.invalid)}: counts must be whole numbers of signals, so ${t.invalid.length === 1 ? 'it is' : 'they are'} left out of the averages.`, 'dishCounts');
    if (t.cells && !t.ratioText) warn('No CEP17 signals are counted, so there is no ratio.', 'dishCounts');
  }

  // The group the numbers on the form read as: the calculator's once it has its 20 nuclei, otherwise
  // what is typed. Rounded numbers, as printed.
  const readGroup = t.entered
    ? (t.cells >= MIN_NUCLEI && t.ratioText ? ishGroup(Number(t.ratioText), Number(t.her2Text)) : null)
    : ishGroup(parseFloat(str(v.dishRatio)), parseFloat(str(v.dishHer2)));

  if (!dish) {
    if (t.entered && t.cells < MIN_NUCLEI) info(`${t.cells} of ${MIN_NUCLEI} nuclei counted; the result is filled in once at least ${MIN_NUCLEI} are counted.`, 'dishCounts');
    else if (readGroup && needsIhc(readGroup) && !ihc) info(`The numbers read as Group ${readGroup} (${GROUP_RULES[readGroup].replace(/\u2265/g, '>=')}): choose the concurrent HER2 IHC score and the result is filled in.`, 'dishIhc');
    else info('Choose the HER2 DISH result; nothing prints until it is set.');
    return out;
  }

  if (t.entered && t.cells < MIN_NUCLEI && dish !== 'Cannot be determined') {
    warn(`Only ${t.cells} nuclei are counted; ASCO/CAP asks for at least ${MIN_NUCLEI}.`, 'dishCounts');
  }
  // A number typed over the calculator's after counting.
  if (t.cells) {
    for (const [id, calc, label] of [['dishCells', String(t.cells), 'number of cells'], ['dishHer2', t.her2Text, 'HER2 average'],
      ['dishCep17', t.cep17Text, 'CEP17 average'], ['dishRatio', t.ratioText, 'ratio']]) {
      const typed = str(v[id]);
      if (typed !== '' && calc !== '' && Number(typed) !== Number(calc)) warn(`The ${label} typed (${typed}) differs from the calculator (${calc}).`, id);
    }
  }

  const ratio = parseFloat(str(v.dishRatio));
  const her2 = parseFloat(str(v.dishHer2));
  const determined = dish !== 'Cannot be determined';

  // The signal counts and the ratio are what the result is read from, so an unreported one is
  // an omission rather than a style choice. Counted-cell count is asked for separately because
  // the released reports state it whenever it was recorded.
  if (determined) {
    for (const [id, label] of [['dishHer2', 'average HER2 signals per cell'],
      ['dishCep17', 'average CEP17 signals per cell'], ['dishRatio', 'HER2/CEP17 ratio']]) {
      if (!str(v[id])) warn(`State the ${label}.`);
    }
  }

  // ASCO/CAP 2018 groups: the ratio and the HER2 copy number define the group, so a chosen
  // Group option that contradicts the numbers typed above it is worth stopping on.
  if (Number.isFinite(ratio) && Number.isFinite(her2)) {
    const g = groupOfOption(dish);
    if (g) {
      // One group rule for this check and the calculator (ishGroup, generators/dish_calculator.js).
      const expected = ishGroup(ratio, her2);
      if (g !== expected) {
        warn(`The numbers entered (ratio ${ratio}, ${her2} HER2 signals per cell) read as a Group ${expected} result, not Group ${g}.`);
      }
    } else if (/^Positive/.test(dish) && ratio < 2 && her2 < 4) {
      warn(`A positive result is selected with a ratio of ${ratio} and ${her2} HER2 signals per cell.`);
    } else if (/^Negative/.test(dish) && ratio >= 2 && her2 >= 4) {
      warn(`A negative result is selected with a ratio of ${ratio} and ${her2} HER2 signals per cell.`);
    }
  }

  // The concurrent IHC score (not printed; it picks the Group 2-4 result).
  const chosen = groupOfOption(dish);
  if (ihc && chosen && needsIhc(chosen)) {
    const expected = dishResult(chosen, ihc);
    if (expected !== dish) warn(`With IHC ${ihc}, a Group ${chosen} result reads "${expected}".`, 'her2Dish');
    if (ihc === '2+') info(`Group ${chosen} with IHC 2+: ASCO/CAP asks for a recount of at least ${MIN_NUCLEI} nuclei, including the IHC 2+ area, by a second observer blinded to the first count; adjudicate if the group changes.`, 'dishCounts');
  }
  if ((chosen === 1 && (ihc === '0' || ihc === '1+')) || (chosen === 5 && ihc === '3+')) {
    info(`IHC ${ihc} with a Group ${chosen} ISH result: the two tests disagree; review both before sign-out.`, 'dishIhc');
  }

  return out;
}

export default { specimenName, microscopy, molecular, diagnosis, comment, derive, validate };
