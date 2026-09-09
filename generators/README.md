# generators

Pure functions per template, `(part, ctx) -> string`: `specimenName`, optional `specimens(parts, ctx)`, `microscopy`, `diagnosis`, optional `prepare(caseState)` and optional `summary(parts, ctx)` (appended after the diagnosis lines). Each part line begins `(${part.label}) `; the engine strips it for single-part cases.
