# generators

Pure functions per template, `(part, ctx) -> string`: `specimenName`, optional `specimens(parts, ctx)`, `microscopy`, `diagnosis`, optional `prepare(caseState)` and optional `summary(parts, ctx)` (appended after the diagnosis lines), optional `macro(part, ctx)` (MACROSCOPIC DESCRIPTION block), optional `blockKey(part, ctx)` (BLOCK KEY block — Phase 4b benign resections, one `(A) (1) … (2) …` line per part) and optional `intraop(parts, ctx)` (INTRAOPERATIVE CONSULTATION block placed before the microscopy; used by `frozen.js`). Each part line begins `(${part.label}) `; the engine strips it for single-part cases.

`breast.js` appends the biomarker block from `breast_biomarkers.js`, a line-for-line port of the CancerReportingTemplate breast biomarkers page (`docs/breast-biomarkers-source.md`). Its option strings, output lines, pre-analytic thresholds, methodology sentences and comments are the source template's and are covered by `tests/breast.test.js`; the breast schema turns the britishiser off so they pass through unchanged.

`duodenal.js` derives the Marsh–Oberhuber type from villi, IELs and crypts (`marsh()`); `cervical.js` ranks squamous (`squamousRank`) and glandular (`glandularRank`) lesions per part and reads the case-level `cytology` field for the discordance comment. Both expose `summary()` for multi-part cases.
