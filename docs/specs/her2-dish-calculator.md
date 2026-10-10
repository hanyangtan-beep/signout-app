# HER2 DISH calculator and the Comment placement (Phase 59)

User request, 2026-10-08, on the standalone HER2 ISH template (`breast_biomarkers`, generator `generators/breast_ish.js`):

> for the HER2 DISH template, please also include the HER2 DISH calculator to automatically calculate and assign a group.
>
> also, the pre-analytic details i.e. this section '- Cold ischaemia time : 2 min … HER2 Dual ISH was performed on formalin-fixed paraffin embedded section with the Ventana INFORM HER2 Dual ISH DNA Probe Cocktail Assay on an automated system, and was examined by a pathologist under light microscopy.' can be placed in comments rather than in the microscopy section.

Shipped the same day; one batch, one publish.

## Sources

- QMH calculator, `https://awiloqmh.github.io/CancerReportingTemplate/Biomarker-DISH-calculator.html` (Anatomical Pathology Division, Queen Mary Hospital; last updated 25-Oct-2021) → `docs/reference/Biomarker-DISH-calculator.html`. Twenty nuclei, HER2 (black) and CEP17 (red) signals each; each average is the sum / 20 printed to two decimals, and the ratio is the two printed averages divided, to two decimals. The group table is the QMH workbook `https://awiloqmh.github.io/CancerReportingTemplate/cap/her2_dish.xlsx`.
- ASCO/CAP groups (2018, unchanged in 2023): Group 1 ratio ≥ 2.0 with ≥ 4.0 HER2 signals per cell; Group 2 ratio ≥ 2.0 with < 4.0; Group 3 ratio < 2.0 with ≥ 6.0; Group 4 ratio < 2.0 with ≥ 4.0 and < 6.0; Group 5 ratio < 2.0 with < 4.0.
- CAP HER2 2023 algorithms, `https://documents.cap.org/documents/her2_breast_update_algorithms_2023.pdf`, and summary of recommendations, `https://www.cap.org/wp-content/uploads/documents/her2_breast_update_sor_2023.pdf?download=true`: Groups 2 to 4 are read with the concurrent IHC — Group 2 and Group 4 positive with IHC 3+ and negative with 0 to 2+; Group 3 positive with 2+ or 3+ and negative with 0 or 1+; with IHC 2+ a second observer, blinded to the first count, recounts at least 20 cells including the IHC 2+ area, and a changed category is adjudicated.
- CAP Breast biomarker template v1.6.1.0, `https://www.cap.org/wp-content/uploads/2026/07/Breast.Bmk_1.6.1.0.-REL_CAPCP-1.pdf?download=true`, for the reporting elements.

## What changed

- Calculator (`generators/dish_calculator.js`, pure; the grid is field `dishCounts`, type `dishCounter`, above the result). One row per nucleus: HER2 and CEP17 signals as whole numbers, Enter to the next box (Shift+Enter back), "Add 10 nuclei" past 20, "Clear counts" with a confirm. A nucleus counts only with both numbers. A summary under the grid shows nuclei counted, both averages, the ratio, the group and its rule, and the result, or what is still needed. The counts and the summary are form-only and never print.
- What it fills (`derive` hook, `src/engine.js` `applyDerived`, run after an edit of the counts or of the IHC score only): number of cells, both averages and the ratio, on every edit of the counts; the result once at least 20 complete nuclei are counted — Group 1 and Group 5 directly, Groups 2 to 4 once a new field, "Concurrent HER2 IHC score (Groups 2-4)" (`dishIhc`, not printed), is chosen. Falling below 20 nuclei, or clearing the counts, clears a grouped result the calculator could have written; an ungrouped choice ("Cannot be determined", "Positive (HER2 gene is amplified)", …) is left until 20 nuclei give a group. With nothing counted, the IHC score reads the typed averages and ratio, so typing numbers by hand still works.
- Arithmetic: exact decimal hundredths, rounded half up. This agrees with the QMH page except on an exact tie in the ratio's third decimal, where the page's `toFixed` follows binary floating point: 51 and 40 signals over 20 nuclei give 2.55 / 2.00 = 1.275, which the page prints 1.27 and the calculator 1.28. (The QMH workbook divides the two unrounded averages, `D18/D19`; with 20 nuclei these are exact, so it gives the same ratio before display rounding.) Over 2,000 random 20-nucleus counts every other case agrees (`tests/dish_calculator.test.js`).
- Placement (superseded the same day by Phase 60, `docs/specs/biomarker-report-layout.md`: the result lines now print as MOLECULAR FINDINGS and DIAGNOSIS is one line naming the specimen; the cut and the COMMENT are as below): the ported block (`generators/breast_biomarkers.js`, unedited) is cut at its first blank line. DIAGNOSIS keeps the result and its sub-items (cells counted, averages, ratio, percentage amplified, other ISH abnormalities). COMMENT opens with the rest, in the QMH order: the cold ischaemia and fixation lines with their caution line, the test type, any notes, the Ventana method sentence and the Group 2 to 4 interpretive paragraphs; then any snippet, then the typed comment. DIAGNOSIS, a blank line and COMMENT read exactly as the block did, so the header-less report is unchanged.
- Checks: a nucleus with one count (not the one being typed) or a non-number, left out of the averages; nuclei counted so far; fewer than 20 nuclei under a result; no CEP17 signal; a number typed over the calculator's; a Group 2 to 4 count waiting for the IHC score; an IHC score at odds with the Group 2 to 4 option chosen; the blinded recount with IHC 2+ in Groups 2 to 4; IHC 0 or 1+ with Group 1 and IHC 3+ with Group 5. The template's older Checks are unchanged.

## Choices to revisit (reversible)

- The Group 2 to 4 interpretive paragraphs moved with the method sentence, because the block prints them after it; keeping them under the result is a change to `splitBlock`'s cut only.
- This report has no microscopy block (the released HER2 reports open on "- HER2 DISH : …"), so "rather than in the microscopy section" was read as "out of the DIAGNOSIS block", where these lines printed.
- With IHC 2+ the calculator fills the Group 2 to 4 result straight away and the recount is a Check, not a gate.

## Untouched

`generators/breast_biomarkers.js` and the biomarker block in the breast biopsy, carcinoma and DCIS forms; the gastric HER2 ISH bullet; every other template. Golden fixtures: the five HER2 fixtures now record the DIAGNOSIS and COMMENT blocks too; report text and Checks are unchanged.

## Verification

`tests/breast_ish.test.js` (18: five placement assertions changed deliberately, five new, including the user's example verbatim) and `tests/dish_calculator.test.js` (19); 1764 tests. Browser QA 54, one new: 20 nuclei typed by keyboard with focus kept in the grid, Group 5 filled at nucleus 20, a Group 3 count waiting for IHC 2+, the recount Check and Clear counts. Phone width (390 px): two columns, 16 px inputs with 44 px targets, no horizontal scroll.
