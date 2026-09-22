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
// Register: the released reports open directly on "- HER2 DISH : …" with no capitalised conclusion
// line, so the diagnosis block is the biomarker text itself. Wording, option strings, sub-item
// indentation and pre-analytic thresholds all belong to the ported template; do not restyle here.
// Protected by tests/breast_ish.test.js.

import { biomarkerReport } from './breast_biomarkers.js';

const str = (v) => String(v ?? '').trim();
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');

// "Breast, left mastectomy, HER2 dual in-situ hybridisation". Sentence case, because the SPECIMENS
// block is sentence case in every other template ("Right breast, 10 o'clock, 4 cm FN, core biopsy");
// the uppercase organ belongs to the diagnosis line, and this report has none — the released HER2
// reports open straight on "- HER2 DISH : …" with no capitalised conclusion.
export function specimenName(part) {
  const v = part.values;
  const organ = str(v.site) === 'Other' ? '' : str(v.site);
  // The detail follows the organ, so it is lowercased — except on "Other", where it leads the
  // line and keeps the capital it was typed with ("Chest wall nodule, HER2 dual …").
  const detail = organ ? lc1(str(v.siteDetail)) : str(v.siteDetail);
  const head = [organ, detail].filter(Boolean).join(', ');
  return `${head || 'Specimen'}, HER2 dual in-situ hybridisation`;
}

/** No macroscopic description: the section comes from a block reported under an earlier accession. */
export function microscopy() { return ''; }

/** The ported block, verbatim. Nothing filled in yet prints nothing rather than a bare heading. */
export function diagnosis(part) {
  const text = biomarkerReport(part.values).replace(/\n+$/, '');
  if (!str(part.values.her2Dish)) return '';
  return text;
}

export function validate(part) {
  const v = part.values;
  const out = [];
  const warn = (message) => out.push({ level: 'warn', message });
  const info = (message) => out.push({ level: 'info', message });

  const dish = str(v.her2Dish);
  if (!dish) {
    info('Choose the HER2 DISH result; nothing prints until it is set.');
    return out;
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
    const group = dish.match(/Group ([1-5])/);
    if (group) {
      const g = Number(group[1]);
      // Each arm states its guideline condition in full rather than relying on the arms above it,
      // so the chain can be read straight against the ASCO/CAP group table. Some guards are
      // therefore redundant (clause 2 is only reached when her2 < 4 already), which is deliberate.
      const expected =
        ratio >= 2 && her2 >= 4 ? 1
          : ratio >= 2 && her2 < 4 ? 2
            : ratio < 2 && her2 >= 6 ? 3
              : ratio < 2 && her2 >= 4 ? 4 : 5;
      if (g !== expected) {
        warn(`The numbers entered (ratio ${ratio}, ${her2} HER2 signals per cell) read as a Group ${expected} result, not Group ${g}.`);
      }
    } else if (/^Positive/.test(dish) && ratio < 2 && her2 < 4) {
      warn(`A positive result is selected with a ratio of ${ratio} and ${her2} HER2 signals per cell.`);
    } else if (/^Negative/.test(dish) && ratio >= 2 && her2 >= 4) {
      warn(`A negative result is selected with a ratio of ${ratio} and ${her2} HER2 signals per cell.`);
    }
  }

  return out;
}

export default { specimenName, microscopy, diagnosis, validate };
