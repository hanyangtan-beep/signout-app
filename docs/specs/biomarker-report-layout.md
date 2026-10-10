# Biomarker report layout: Molecular findings and a one-line diagnosis (Phase 60)

User request, 2026-10-08, after Phase 59 (`docs/specs/her2-dish-calculator.md`):

> for the biomarker templates, there is a section 'Molecular findings' to put in the findings. Then another line called 'diagnosis', where the specimen name is incorporated

The example given, a HER2 DISH test on a breast core from an earlier accession (the accession is replaced by `26BX-012345` wherever it ships in the bundle):

```
SPECIMEN
Breast, left 8 o'clock, 2 cm FN, core biopsy, paraffin block (26BX-012345), for HER-2 DISH test.

MOLECULAR FINDINGS
- HER2 DISH : Negative (not amplified, Group 5 result)
  - Number of tumour cell counted : 20
  - Average number of HER2 signals (black) per cell : 3.25
  - Average number of CEP17 signals (red) per cell : 2.30
  - HER2/CEP17 ratio : 1.41

DIAGNOSIS
Breast, left 8 o'clock, 2 cm FN, core biopsy, paraffin block (26BX-012345), for HER-2 DISH test - NEGATIVE for HER2 amplification

COMMENTS
- Cold ischaemia time : 5 min … (the pre-analytic lines and the Ventana method sentence, as Phase 59)
```

Shipped the same day; one batch, one publish. The app now prints this report with headings `SPECIMEN:`, `MOLECULAR FINDINGS:`, `DIAGNOSIS:` and `COMMENT:` (the house heading, unchanged); "amplfication" in the request is spelt out.

## Sources

- CAP Breast biomarker template v1.6.1.0, `https://www.cap.org/wp-content/uploads/2026/07/Breast.Bmk_1.6.1.0.-REL_CAPCP-1.pdf?download=true`: Group 1 "Positive (amplified …)", Group 5 "Negative (not amplified, Group 5 result)", and Groups 2 to 4 "Positive / Negative, based on IHC and ISH results", with "Use appropriate comment when reporting ISH Groups 2-4".
- QMH stomach biomarker template (`docs/reference/qmh/stomach-biomarkers.txt`): the DISH result reads "Negative for HER2 amplification" / "Positive for HER2 amplification", the wording of the user's example.

## What changed

- Engine (`src/engine.js`): a new block, `molecular`, heading `MOLECULAR FINDINGS:`, between the microscopy and the diagnosis in `BLOCK_ORDER`. A generator fills it through an optional `molecular(part, ctx)` hook; parts print in case order, joined by a blank line, styled like the other blocks. Edits, the LIS payload (`<<<MOLECULAR>>>`), Copy and the Google Doc (`src/docformat.js`) pick it up; a template without the hook prints nothing new.
- HER2 ISH form (`breast_biomarkers`, generator `generators/breast_ish.js`; the ported QMH block `generators/breast_biomarkers.js` is unedited):
  - Specimen line: the organ (unless Other), the specimen as written, `paraffin block (…)` from a new field "Paraffin block" (`blockNo`, brackets typed with the number are not doubled), then `for HER-2 DISH test`, ending in a full stop.
  - Molecular findings: the result lines of the ported block, verbatim — the result, cells counted, averages, ratio, percentage amplified and other ISH abnormalities.
  - Diagnosis: one line, the specimen line without its full stop, " - ", then the verdict:
    - Group 1, Group 5 and the ungrouped results: `POSITIVE for HER2 amplification` / `NEGATIVE for HER2 amplification`.
    - Groups 2 to 4: `POSITIVE for HER2, based on IHC and ISH results (Group 2 ISH result with IHC 3+); see comment` (and the negative forms), the CAP wording, pointing to the interpretive paragraph the Comment prints for these groups.
    - Cannot be determined: `HER2 amplification status CANNOT BE DETERMINED; see comment`, where the HER2 FISH follow-up line prints.
  - Lettered like every other template (`(B)` heading line and `(B) ` prefix) when mixed with another template's parts; on its own the letter is dropped.
  - Comment: unchanged from Phase 59.
- Intake (`src/intake.js`, role `her2_ish`): a pasted line that names a HER2 dual ISH test (HER2 or c-erbB-2 with DISH, dual ISH, SISH, ISH or in situ hybridisation, or DISH alone; not FISH) opens this form when breast is named in the line, or in the history or prefix for a node, soft tissue, skin, chest wall or liver line. The form is filled so the specimen line prints back as pasted: an opening Breast / Lymph node / Soft tissue / Liver sets the site and the rest is the detail; any other opening keeps its words under Other; `paraffin block (…)` or `block 26BX-… A1` fills the block. A gastric HER2 request, a node in a non-breast case, a core whose history mentions an earlier DISH, FISH and the ER/PR/HER2/Ki67 panel keep their routes. Before this, the example line opened the breast core biopsy form.
- LIS bridge: the probed report screen has no Molecular findings field and the biomarker screen has not been probed, so `MOLECULAR` has no row in `tools/lis-bridge.ahk` (`FIELDS` unchanged). The fill walk lists it under "No field for", to paste by hand with Ctrl+Alt+V or the block's Copy; `tests/lisbridge.test.js` names it as deliberately unwritten. Once `Ctrl+Alt+P` on a biomarker case shows the field, give it a row.

## Choices to revisit (reversible)

- "Biomarker templates" is one template today: the HER2 ISH form, the only schema of `kind: "biomarker"`. Biomarker results reported inside other templates (the breast carcinoma and gastric biomarker panels) keep their places; the hook is there for a future biomarker form, or to move those if wanted.
- Groups 2 to 4 keep the CAP wording rather than "for HER2 amplification", because those results are read with the IHC rather than as amplification alone. A one-word change in `verdict()` if the shorter form is preferred.
- The heading stays `COMMENT:`, the house heading every template uses, not `COMMENTS`.
- The LIS destination for Molecular findings waits for a probe of the biomarker screen rather than a guessed row.
