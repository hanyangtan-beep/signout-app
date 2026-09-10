# generators

Pure functions per template, `(part, ctx) -> string`: `specimenName`, optional `specimens(parts, ctx)`, `microscopy`, `diagnosis`, optional `prepare(caseState)` and optional `summary(parts, ctx)` (appended after the diagnosis lines), optional `macro(part, ctx)` (MACROSCOPIC DESCRIPTION block) and optional `intraop(parts, ctx)` (INTRAOPERATIVE CONSULTATION block placed before the microscopy; used by `frozen.js`). Each part line begins `(${part.label}) `; the engine strips it for single-part cases.
