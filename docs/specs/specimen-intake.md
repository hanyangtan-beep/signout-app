# Specimen intake — paste the LIS specimen list, get the parts

Status: planned 2026-09-12 (user request); two roadmap cards in Next, build as one batch. Not yet built.

## Problem

Multi-part cases ("(A) Cervix, (B) Endometrium, (C) Uterus, TAH …") are built today by adding parts one at a time and picking a template for each. The LIS already holds the specimen list and the clinical history; the app should read both and set the parts up.

## What the user does

1. Under **Accession**, a new **Specimen** box (multi-line, "Paste the LIS specimen list") sits above **Clinical history** inside the same meta panel. The existing single-line **Case title / specimens** field is folded into it: the box is the source, the case title (used by the gastric / IBD site parsers) is derived from it and stays editable.
2. Paste, and a preview strip appears under the box: one row per detected part — letter, specimen text, the suggested template as a dropdown, and a confidence mark (confident / choose / none). Clinical history typed before or after the paste re-scores the suggestions live.
3. **Build parts** creates or replaces the parts: label, `templateId`, specimen name (from the LIS text, tidied), case title. Parts already edited are not overwritten silently — the button reads **Replace parts** and asks once. A part with no matching template gets the **Generic** template.

Single-part paste follows the existing rule: one part, no "(A)".

## House LIS format (six samples, `docs/specs/samples/lis-specimen-lists.md`)

- Two blocks: a history block headed `History` / `History:` / `history:` (free text, may run many lines, may include fixation time / date lines), then the specimen list headed `specimen` / `Specimen` / `Specimen:` — or no heading at all after a blank line. An optional case-level prefix (`Breast, excision:`) precedes the list and applies to every part.
- Parts are lettered only: `(A) … , (B) … and (C) …` inline, or one `(X) …` per line. Up to 15 parts seen (26 possible).
- Part text is either free (`Left sentinel pelvic lymph node`, `Tumour on sigmoid`) or the LIS triple `Site, detail, Procedure` (`Lung, right upper lobe, resection`; `Lymph node, Celiac LN (9), Resection`). Commas therefore occur inside a part; parenthesised station numbers `(1)`, `(8a)`, `(11p)` occur inside a part.
- Clinical history is terse: `CA corpus`, `Lung Ca`, `Gastric Ca`, `Fibroids`, `Serous carcinoma`, `?phyllodes`.

## Parsing (`src/intake.js`, pure, tested)

- The whole paste may be dropped in (history and specimen list together): the parser takes the text after the last `specimen` heading, or after the last blank line when there is none, as the list, and offers the history block to the **Clinical history** field when that field is empty. Pasting the list alone works too.
- Split on lettered markers `(A)` … `(Z)` only (the LIS uses letters; numbers in parentheses are station numbers and stay in the text). Trailing `, ` / ` and ` before the next marker is trimmed. Letters must run consecutively from A; a gap or repeat is flagged, not silently reordered. A case-level prefix before `(A)` is recorded as `casePrefix` and prepended to each part's specimen name when the part text lacks a site (`Anterior margin` → `Breast, excision — anterior margin` only in the matcher input; the printed specimen name stays as typed).
- Within a part: the LIS triple `Site, detail, Procedure` is recognised when the last comma-field is a procedure word (`resection`, `excision`, `biopsy`, `polypectomy`, `curettings`); the duplicated middle field (`Stomach, stomach`) collapses; the procedure is lower-cased. Free text is kept as typed with whitespace collapsed and trailing punctuation dropped. `LN` is left as written in the specimen name.
- Output: `[{ label, text, site, detail, procedure, casePrefix }]` plus `{ history, warnings }`. The specimen name printed in the report is the tidied part text (`Lymph node, Celiac LN (9), resection`), not a rewritten phrase; no abbreviation expansion in this card.
- Part cap: the total cap rises to 26 for mixed cases (15 seen); per-template `maxParts` remains the limit for that template's own presets only.

## Matching (`src/intake.js` + `templates/manifest.json`)

Deterministic scoring, no AI call in this card:

- Each schema gains a `match` block (compiled into the manifest by `scripts/build-manifest.mjs`): `site` terms, `procedure` terms, `clinical` terms and `not` terms, each with a weight. Existing `aliases` seed `site`.
- Score per part = site hits (specimen text) + procedure hits (specimen text) + clinical hits (clinical history) − `not` hits. Procedure words decide biopsy vs resection (`biopsy`, `polypectomy`, `curettings` vs `hysterectomy`, `colectomy`, `wedge`, `excision`, `mastectomy`); clinical terms decide between templates of the same organ and procedure (uterus TAH: `leiomyoma(s)` / `fibroids` / `adenomyosis` → `uterus_benign`; `endometrial carcinoma` / `EEC` / `atypical hyperplasia` → `endometrial_carcinoma`; nothing decisive → choose).
- Part roles drive the satellite templates: `lymph node` / `LN` / `sentinel` in the part text → `lymph_node` (confident, station text kept in the name); `margin` with a breast case prefix or a breast main part → `breast_excision` as a margin part with `margin` pre-set from the text; `omentum`, `nodule`, `peritoneum`, `spleen` and other satellites of a cancer debulking → `generic` until an organ synoptic covers them.
- Clinical shorthand table: `CA` / `Ca` / `carcinoma` → carcinoma; `CA corpus` → endometrial carcinoma; `fibroids` → leiomyoma; `?phyllodes` / `fibroepithelial` → breast excision; the table is a plain list in the manifest and grows with the fixture set.
- Tiers: **confident** when the top score clears a threshold and beats the runner-up by a margin; **choose** when two templates are close (dropdown pre-opened on the top three); **none** when nothing scores (Generic). A confident wrong assignment is a test failure; an ambiguous one shown as "choose" is not.
- Clinical history applies to every part, but a clinical term only counts for a template whose site also matched that part (so "leiomyomas" cannot pull the cervix biopsy onto the uterus template).

## Generic template (`schemas/generic.json`, `generators/generic.js`)

Fields: specimen name, clinical note (optional), microscopy (free text, seeded "Sections show "), diagnosis specimen line (upper case, derived from the specimen name, editable) and diagnosis text, optional comment. Prints in the standard block order and joins multi-part reports like any other template; no synoptic, no Checks beyond "microscopy empty" / "diagnosis empty" warnings. Listed in the palette as **Generic (free text)** so it can also be chosen by hand.

## Data and Drive

- `caseState.meta.specimenText` saved with the case (Drive record and Doc unchanged apart from the extra field; the Doc's SPECIMENS block already prints the part specimen names).
- `caseTitle` becomes derived (`"(A) Cervix; (B) Endometrium; (C) Uterus"`) but remains user-editable; the gastric and IBD `parseSitesFromTitle` keep working.

## Tests

- `tests/intake.test.js`: parser table (markers, numbers, single line, per-line lists, codes stripped) and matcher table.
- `tests/fixtures/intake/cases.json`: the six house samples in `docs/specs/samples/lis-specimen-lists.md` (44 parts) with the expected template and tier per part, plus biopsy lists added at build time so every template is reachable; extended whenever a case mis-matches in use. Expectations for lung, gastric and ovarian primaries are `generic` / none today and are updated when those synoptics ship.
- Accept: top-1 correct for at least 90% of parts in the fixture set; zero confident-wrong assignments; every part with no match lands on Generic; existing golden fixtures unchanged.

## Out of scope (Later)

- AI suggestion when the rules return "none" or "choose" (would send specimen text and clinical history to a model; needs a decision on PHI first).
- Parsing the pasted macro into field values (sizes, counts) — separate card.
- Reading the specimen list from Navify / the LIS directly.

## Resolved 2026-09-12

- Six house samples supplied; LIS uses letters only; no container counts or specimen codes, but numbered lymph node stations appear inside part text.
- Remaining question: retire the **Case title / specimens** field in favour of the derived title (proposed yes), and whether fallopian tubes with a fibroid uterus should join the benign uterus template as adnexal parts or stay generic.
