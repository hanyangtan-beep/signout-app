# Phase 4b — building a benign resection template

Read this whole file, then `schemas/README.md`, `generators/README.md`, one existing pair as the pattern (`schemas/oesophageal_biopsy.json` + `generators/oesophageal.js` + `tests/oesophageal.test.js`), and `generators/frozen.js` for the `macro` export. The house wording for each organ is in `docs/case-mix-analysis.md` §4 — reuse those sentences; do not invent a different style. The template list and per-organ field requirements are in `docs/roadmap.md` (Phase 4b, items 1–20).

## Files you create (nothing else)

- `schemas/<id>.json` — e.g. `gallbladder.json`
- `generators/<generator>.js` — e.g. `gallbladder.js`; `"generator": "gallbladder"` in the schema
- `tests/<generator>.test.js`

Do **not** edit `src/`, `styles.css`, `index.html`, other schemas/generators, `templates/manifest.json`, `docs/roadmap.md`, `README.md` or `schemas/README.md` — the coordinator does that. If you find an engine bug or need a feature, note it in your final report instead of patching.

## Schema

Required top-level keys, in this order: `id`, `version` (`"2026.09"`), `name`, `shortName` ("Organ · procedure", e.g. `"Gallbladder · cholecystectomy"`), `label` (short header word, e.g. `"Gallbladder"` — never a bare procedure/lesion word), `organ` (UPPER CASE as printed in the diagnosis line, e.g. `"GALLBLADDER"`), `system` (one of GI, Hepatobiliary, GU, Gynae, Breast, Thoracic, Head and neck, Skin, Cardiovascular, Lymphoid, Soft tissue, Endocrine), `kind: "benign resection"`, `rank` (given in your brief), `aliases` (6–12 search terms: abbreviations, eponyms, key findings, US spellings), `specimenNoun`, `maxParts`, `defaultParts`, `generator`, `style: {"british": true}`, `caseFields: []`, `options` (always include the `includeHeader` checkbox exactly as in the oesophageal schema; add `macro` — "Generate the macroscopic description and block key" — default `true`), `partDefaults` (optional), `fields`, `example`, optional `snippets`.

Field types: `text`, `textarea`, `number` (`min`, `step`, `suffix`), `checkbox`, `select` (`options`, `default`, `showIf`, `optionsByField`), `multiselect` (`options`, `default: []`, `exclusive`). `showIf: { field, is | not | truthy | min | max }`. Selects with ≤ 6 options render as chips, so put the common answer first and keep option text short. Every field needs `id`, `label`, `type`, `default`.

**Field groups.** Add `"group": "Macroscopy"` to the macroscopic fields (they render inside one collapsible fieldset). Order the fields: `specimenName` (site / laterality as received) → `Macroscopy` group (dimensions, weight, wall, contents, blocks…) → microscopic fields → free-text `additionalNotes` (textarea, printed as an extra sentence when filled). Keep grouped fields consecutive.

**Options for the diagnosis result.** Model the main result as one `select` (e.g. `cholecystitis`: Chronic / Acute / Acute-on-chronic / Gangrenous / Xanthogranulomatous / None) plus independent Present/Absent selects for the secondary findings. Malignancy: include a `neoplasia` select whose default is the negative option (e.g. "No dysplasia or malignancy") and whose positive options only produce a short correct diagnosis line plus a comment recommending the QMH cancer template — do not build staging.

## Generator (`generators/<name>.js`, ES module, pure functions)

Exports, then `export default { specimenName, macro, blockKey, microscopy, diagnosis }` (add `specimens`, `summary`, `flags` only if needed):

- `specimenName(part, ctx)` → the specimen phrase used in the SPECIMENS block, e.g. `Gallbladder, cholecystectomy`; use `part.values.specimenName` when filled.
- `macro(part, ctx)` → return `''` when `ctx.options.macro === false`; otherwise one paragraph starting `(${part.label}) ` in the house style: `Received in formalin is a gallbladder measuring 8 x 3 x 2.5 cm ...`. Every measurement comes from a field; skip a clause when its field is blank (never print "undefined" or "__ cm"). End with the block count sentence (`Representative sections in 3 blocks.` / `All embedded in N blocks.`).
- `blockKey(part, ctx)` → `''` when `ctx.options.macro === false`; otherwise one line `(${part.label}) (1) Cystic duct margin. (2) Body. (3) Fundus.` built from the block fields (the engine strips the `(A) ` prefix for single-part cases, so the printed result matches the house `(1) … (2) …` form).
- `microscopy(part, ctx)` → `(${part.label}) Sections show …` sentences in British spelling, one paragraph; combine microscopy and any IHC into that paragraph; close with `There is no evidence of dysplasia or malignancy.` (or the organ-appropriate negative) unless neoplasia is selected.
- `diagnosis(part, ctx)` → `(${part.label}) ORGAN, laterality/site, procedure - MAIN DIAGNOSIS IN CAPITALS; secondary findings in lower case` — one line per part, exactly like the house examples in `docs/case-mix-analysis.md` §3–4 (e.g. `GALLBLADDER, cholecystectomy - CHRONIC CHOLECYSTITIS; no evidence of dysplasia or malignancy`).

Always prefix every returned block with `(${part.label}) ` — the engine removes the letter for single-part cases. Use `part.values`; never read DOM or globals. Helper style: copy `num`, `fmt`, `listJoin` from the oesophageal generator; sizes like `8 x 3 x 2.5` are typed into one text field and normalised with `.replace(/\s*[xX×]\s*/g, ' x ')` and given a ` cm` suffix when none is typed (see `sizePhrase` in `generators/frozen.js`).

## Example and snippets

`schema.example` must be a complete, realistic benign case (all field ids present, `options` set) that reads like a finished report — it is what "Load example" shows. Add a `snippets` entry `{ "id": "nem", "label": "No evidence of malignancy", "text": "..." }` only when the roadmap asks for a comment macro; the negative sentence itself belongs in the microscopy/diagnosis.

## Tests (`tests/<name>.test.js`, node:test + node:assert/strict)

Import the schema with `JSON.parse(readFileSync(...))` (or `import schema from '../schemas/x.json' with { type: 'json' }`) and the generator directly — do **not** rely on `loadAll()` (the manifest is rebuilt by the coordinator). Use `generate(schema, gen, { schemaId: schema.id, ...schema.example })` from `../src/engine.js`. Cover: (1) the example generates and the diagnosis line matches the expected house string exactly; (2) macro and block key are printed with `(1)…(2)…` numbering and disappear when `options.macro` is false; (3) a two-part case keeps `(A)`/`(B)` prefixes on every block; (4) each main-result option yields the right capitalised diagnosis; (5) blank size / weight fields produce no dangling text; (6) metadata: `kind === 'benign resection'`, `system`, `shortName` contains `' · '`, `aliases.length >= 6`, every field has a `default`, and every `example.parts[*].values` key exists in `fields`. Run `npm test` (all files) — all must pass. If `tests/picker.test.js` alone fails with a manifest mismatch while other builders are working, run `node scripts/build-manifest.mjs` once and re-run; if it still fails only there, report it and move on.

## Wording rules (house style, non-negotiable)

British spelling (oesophagus, haemorrhage, centre, tumour). Concise; no "Clinical correlation is advised" filler unless the roadmap specifies the sentence. Microscopy as "Sections show …" sentences. Diagnosis in CAPITALS for the main entity, lower case for qualifiers, `;` between clauses, no trailing full stop on the diagnosis line. Negative closers: `There is no evidence of dysplasia or malignancy.` (mucosal organs), `There is no evidence of malignancy.` (others). Never print patient identifiers. No emojis, no markdown in generated text.

## Final report to the coordinator

List the files created, the `id` / `generator` / `rank` / `label`, the example diagnosis line, test count added, and anything the coordinator must do (manifest rebuild is assumed).
