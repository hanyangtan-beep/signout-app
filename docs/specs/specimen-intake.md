# Specimen intake — paste the LIS specimen list, get the parts

Status: **built 2026-09-12** (cards (a) + (b) shipped as one batch, card (c) subsite pre-fill the same day; see "As built" and "Subsite pre-fill" at the end). Planned the same day from the user's request and six LIS samples.

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

- `caseState.meta.specimen` saved with the case (Drive record and Doc unchanged apart from the extra field; the Doc's SPECIMENS block already prints the part specimen names).
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
- Case title / specimens field retired (user: "yes") — the title is derived from the specimen list; `gastric_biopsy` no longer declares the `caseTitle` case field.
- Fallopian tubes with a fibroid uterus stay **generic** (no tube template exists; the benign uterus template has no adnexal parts). Revisit if a salpingectomy template is added.

## As built 2026-09-12

- `src/intake.js` — `parseIntake`, `matchParts`, `presetValues`, `deriveTitle`, `splitTriple`; `MAX_PARTS = 26`. The list is the text after the last `specimen` heading, else the block that holds the first `(A)` back to the previous blank line; everything before it is the history (heading lines dropped). Warnings: no lettered parts, letter gaps, more than 26.
- Scoring (per part, per template with a `match.site` hit on prefix + text): `2 × procedure hits + 2 × min(1, clinical hits in history) − 4 × not hits + bias`; −3 for a biopsy / cytology template on a resected part and vice versa; +1 to cancer-resection templates when a cancer word appears and the part is not a biopsy. Tiers: confident when the best beats the runner-up by ≥ 2 (or a role rule fired); choose otherwise (below a score of 2 the generic form is preselected but the candidates are listed); none when nothing scores ≥ 0. Ties break on manifest `rank`.
- Role rules: lymph node / LN / sentinel parts → `lymph_node` (station kept as specimen name, procedure Sentinel lymph node biopsy / Dissection / Resection / Excision); `… margin` parts of a breast case → `breast_excision` cavity shave margin with the named margin and the side of the main breast part.
- `match` blocks on all 43 schemas (`site`, `procedure`, `clinical`, optional `not`, `bias`, `fill`); `MANIFEST_KEYS` now carries `match`; `KINDS` gains `generic`; `SYSTEMS` gains `General`. Skin templates match on skin words only (not body regions); `colonic_polyp` and `colon_resection` no longer match bare `polyp` / `carcinoma`; `endometrial_biopsy` no longer matches `curettings` alone; `gist_resection` needs `wedge` / `gastrectomy`.
- Generic template: fields specimenName, macro (optional), microscopy ("Sections show "), diagnosis; validate warns on empty microscopy / diagnosis; diagnosis line `(A) OMENTUM, resection - …`.
- UI: **Specimen** textarea under Accession; strip with one row per part (letter, text, dropdown Generic / Suggested / All templates, ✓ ? — mark), footer **Build parts** / **Replace parts** (confirm once when the case already has parts or edits) and parser warnings; collapses to "N parts built · Show list" after Build; re-scores when the specimen or clinical text changes; manual picks survive clinical edits and reset on a new list. Build fills Clinical history from the pasted history only when the field is empty. `meta.specimen` is saved with the case and checked by the PHI guard.
- Tests: `tests/intake.test.js` (8 tests) over `tests/fixtures/intake/cases.json` — 18 cases, 88 parts (the six house samples + biopsy / resection / cytology lists reaching every template), all top-1 correct, zero confident-wrong. Deliberate non-golden test edits: `tests/picker.test.js` systems list gains `General`; `tests/jawcyst.test.js` key-order assertion includes `match`. Golden fixtures unchanged (619 tests).
- Serous-carcinoma debulking (sample 3): omentum, spleen, peritoneal nodules and the sigmoid parts land on generic (`choose` for sigmoid — colon resection offered); the uterus is `choose` with generic preselected because "serous carcinoma" alone does not fix the primary.

## Subsite pre-fill (card (c), built 2026-09-12)

- `match.fill` is a list of `{field, from}` rules (a single object still works). `from: "options"` picks a select option from the part text: option labels and text are folded through a spelling table (caecum → cecum, ileocaecal, oesophag → esophag, greater / lesser curvature → GC / LC, rectosigmoid junction → rectosigmoid, sigmoid colon → sigmoid, random colon(ic) → random, TI → terminal ileum, incisura angularis → incisura, mandibular / maxillary, antral → antrum), tokenised, and an option qualifies when all its words are present ("colon" is optional in multi-word options). Longest qualifying option wins; a tie or an option matching /unspecified|not specified|cannot be|other|specify/ gives nothing, so the field keeps its default. `from: "detail"` / `"text"` copy the LIS middle field or whole line into a text field (existing behaviour, now per rule).
- Rules: IBD series `site`, colonic polyp `site`, colorectal and GIST `tumourSite`, gastric `biopsySite` (needs a curvature: "antrum" alone stays Unspecified) + `specimenName` from detail, parathyroid `site`, jaw cyst `site` + region; text Site fields from the LIS detail for duodenal, oesophageal, prostate, cervical, skin ×3, lung, liver segment, soft tissue, TURBT, thyroid / salivary / lymph-node FNA, effusion and breast core; nasal polyps take the whole line.
- Vocabulary added to `match.site` for the colon templates: hepatic / splenic flexure, rectosigmoid, ileocaecal, TI, random colon; IBD `not` gains `polypectomy`.
- Tests: `matchOption` table in `tests/intake.test.js`; fixture `values` on the polyp and IBD cases plus a new "subsite pre-fill mix" case (19 cases, 96 parts); 620 tests.

## Report assembly (card (d), built 2026-09-12)

- One microscopy block. `BLOCK_ORDER` no longer has a `synoptic` entry: `out.microscopy` holds every part in case order, a synoptic part contributing its sectioned element list in place of a narrative paragraph. `out.microscopyHeading` is "MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT" when any part is synoptic, else "MICROSCOPIC EXAMINATION"; the app block title, the full report and the Drive Doc all use it, so a mixed case (polyp + colorectal resection) prints one box, not two. `out.synoptic` still exposes the synoptic text alone for the tests. Golden fixtures are unchanged (a synoptic-only case concatenates to the same text; the heading was already the combined one).
- LIS labels flow into the polyp line. `colonic_polyp` fills `customSpecimen` from the LIS detail field, so "Transverse colon, T1 transverse colon polyp, polypectomy" prints "(A) T1 transverse colon polyp" and "TRANSVERSE COLON, T1 transverse colon polyp, polypectomy - TUBULAR ADENOMA…". A fill rule may carry `unless` (a regex): a detail that is only "polyp", "biopsy", "tissue", "fragment(s)", "lesion" or "mass" is skipped and the "<Site> polyp" default stays.
- Colorectal resections also pre-fill `procedure` from the options (anterior resection, low anterior resection, hemicolectomies, Hartmann's, colectomies); APR and LAR shorthand are folded in the spelling table.
- Fixture edits: "colonic polyps" gains part (C) with the T1 label; "colon carcinoma…" declares tumourSite / procedure values; `matchOption` procedure cases added. 620 tests.

## Macro extraction (card (e), built 2026-09-12)

- Purpose. A pasted LIS Macroscopic description replaces or precedes the generated macro text, but the template's macro fields (weight, dimensions, tumour size, depth of invasion, myometrial thickness…) were still typed by hand. `src/macroparse.js` now reads the paste and pre-fills them, so the synoptic and the derived values (e.g. percentage myometrial invasion) come from the pathologist's own description.
- Chunking. `splitMacroParts` splits the paste on sequential lettered markers `(A)`, `(B)`, `(C)`… (a marker out of sequence, or a block reference such as `(A7)`, does not start a chunk); each chunk goes to the part with that label. An unlettered paste goes to part A only.
- Schema map. Each schema may carry `macroExtract: { fieldId: { concept, unit, label, min, near } }` — `concept` names a shared extractor, `unit` (`mm` / `cm` / `g` / `count`) is the field's unit and drives conversion, `label: true` appends the unit for free-text size fields ("45 x 35 x 12 mm"), `min` is the minimum number of dimensions a dimension run must have (default 2, `min: 1` for single "N cm across" nodules), `near` is a regex that limits the search to sentences mentioning that word (tube, ovar, cyst, cord, stone, endometri…). 23 schemas carry a map: endometrial carcinoma, colorectal, GIST, gallbladder, appendix, benign uterus, thyroid, ovarian cyst, placenta, breast excision, liver, salivary, soft tissue, skin excision / cyst / lesion, lymph node, stoma, jaw cyst, nasal polyps, TURP, parathyroid, tonsils.
- Concepts. `weight` (weighs / weighing / weight N g, or a bare gram figure); `specimenDims` (the first 2–3-dimension run in a sentence that is not about the tumour or adnexa, or uterine axes "N cm from cervix to fundus, N cm cornu to cornu, N cm anteroposteriorly", also breast "mediolaterally / superoinferiorly / superficial to deep"); `dims`, `size`, `lengthDiameter` (nearest run, greatest dimension, "N long and N in diameter" — scoped with `near`); `tumourDims` / `tumourSizeMax` (a run after tumour / mass / nodule / lesion / polyp / fibroid…, skipping distances to margins, "thick out of" and myometrial sentences, "spanning N cm mediolaterally and N cm from fundus…" axes, size ranges take the largest); `depthOfInvasion` ("N cm thick out of…", "depth of invasion N mm", "invades to a depth of N", "invades N mm into", "N/M mm"); `wallThickness` (myometrial thickness of N, "in a N mm thick myometrium", "N/M mm", "wall is thickened up to N", "wall N thick"); `cavityLength`; `length`; `diameter`; `blocks`.
- Write rules (`applyMacroToCase`). A field is written only if it still holds its default or the value the extractor wrote last time (`part.macroFill`); a field the pathologist edited is left alone and keeps its value across re-pastes. When the paste is cleared or the value disappears from it, auto-filled fields revert to the default. Runs on every keystroke in the Macroscopic box, on Build / Replace parts, on Add part and on a part template change. The status line under the box adds "N macro fields filled from the paste". Printing is unchanged: the LIS replace / merge toggle decides what prints.
- Tests. `tests/macroparse.test.js` over `tests/fixtures/macro/cases.json` (15 house-style texts: endometrium ×5 incl. slash notation and a no-measurement text, colorectal, GIST, gallbladder, appendix, benign uterus with lettered parts, thyroid, ovarian cyst, placenta, breast lumpectomy, skin ellipse) plus concept, chunking and write-rule unit tests; `tests/jawcyst.test.js` key order changed deliberately (`macroExtract` after `match`). Golden fixtures untouched; 627 tests.
- Known limits. Hand-written percentages ("invades 60%") are not read — the derived percentage comes from depth / thickness; a paste with no lettered markers fills part A only.

## Bilateral adnexa (card (e) follow-up, built 2026-09-12)

- Clause scoping. `near` rules now read clauses, not whole sentences: a sentence is split at ";" and at "and / while the <right|left|both|ovary|tube|uterus|cervix…>" (also ", the right…"), so "The left ovary measures 2 x 3 x 2 cm and the left fallopian tube measures 7 cm long" gives the ovary rule the first clause and the tube rule the second (previously the tube rule saw the ovary run first).
- Sides. `sideOf(clause, near)` reads right / left / both (rt., lt., bilateral, "ovaries", "tubes") from the words before the organ word. A rule with `sides: true` collects one value per side: when both sides are measured the field gets `right 2 x 1.5 x 0.8, left 2.5 x 1.5 x 1`; a single side or unlabelled runs ("measuring 2.5 x 1.5 x 1 cm and 2 x 1.5 x 1 cm respectively") give the plain value, the largest when there are several (the generator's "measure up to" semantics). `lengthDiameter` accepts a lone length ("the right tube 5 cm long" → `right 5, left 7 x 0.6`).
- Benign uterus. `tubeSize` and `ovarySize` carry `sides: true`; `generators/uterus.js` `sidedSizes()` reads the two-sided value and, for "Uterus, cervix and bilateral adnexa", prints "The right fallopian tube measures 5 x 0.6 cm and the left fallopian tube 4.5 x 0.5 cm. The right ovary measures 2 x 1.5 x 0.8 cm and the left ovary 2.5 x 1.5 x 1 cm." Plain values keep the old "measure up to" sentences, so existing cases print as before. Field labels show the two-sided form.
- Endometrial carcinoma. The free-text "Adnexa (macro)" field is filled by the new `adnexaSentence` concept from the ovary dimensions and tube length x diameter per side: "the right ovary measures 30 x 20 x 10 mm and the right fallopian tube 50 mm long; the left ovary measures …", or "the ovaries measure up to … and the fallopian tubes measure up to … long" when sides are not named. The generator capitalises and adds the full stop as before; blank still means unremarkable.
- Intake. `uterus_benign` gains a `specimenName` option fill with LIS shorthand folded in the spelling table: TAHBSO / TLHBSO / LAVH-BSO, "appendages", "bilateral tubes and ovaries", BSO → "Uterus, cervix and bilateral adnexa"; TAH / TLH → "Uterus and cervix, total hysterectomy"; "Right ovary and tube" → "Right tube and ovary"; "tubes, sterilization" → "Fallopian tube(s), sterilisation". Bare "Uterus, hysterectomy" keeps the default. Without this the adnexa sentences never printed for a pasted TAHBSO.
- Ovarian cyst. `dimensions` reads the first two-plus-dimension run near "specimen / cyst / ovary / mass" (the specimen sentence is itself a cyst sentence); `tubeLength` is scoped to the tube clause.
- Tests. Fixture cases added: bilateral benign uterus, "both ovaries … respectively", endometrial adnexa sentence, ovarian cyst with tube; unit tests for `clauses`, `sideOf`, sided rules, `sidedSizes` and the generator sentences; `matchOption` uterine shorthand cases. 628 tests; golden fixtures untouched.
- Remaining limits. One cyst field per part (a cyst on each ovary keeps the largest); adnexa attached to a uterus but described under their own lettered part are read with that part's template; hand-written percentages not read; an unlettered paste fills part A only.

## Single-part pastes (reported defect, fixed 2026-09-21)

- Defect. "Build parts" did nothing for a specimen with one part: `parseIntake('antrum')` returned zero parts, so the strip was empty and the button was disabled. Two separate causes, both traced against the 2024–2026 case export (4547 rows).
- Cause 1, parsing. The parser only cut parts at `(A)` / `(B)` markers. **Not one of the 4545 rows with specimen text carries a letter** — the house LIS letters a *list* and never a single specimen, so every one-part case fell through. Fixed: with no `specimen` heading and no marker, the list is the last block of the paste (`lastBlockStart`, so a history above a blank line still separates), and it is cut on newlines and on a comma with no space after it (`UNLETTERED_SPLIT`). That comma is the export's own part separator — 899 rows use it, and a comma *with* a space stays inside a part as "Site, detail" ("Breast, Right mastectomy" is one part; "Antrum,Angular,Body" is three). A trailing bare procedure word is re-joined, so "Antrum,biopsy" stays one part. Letters are then assigned A, B, C…; past 26 parts the overflow is numbered rather than labelled `undefined`. The old `No lettered parts "(A)", "(B)"… found.` warning is replaced by `No specimen text found.`, which now only fires on punctuation-only input.
- Cause 2, scoring. Score is `2×procedure hits + 2×clinical hits − 4×not hits`, so a bare site word scored **0 for every candidate**. Ties below score 2 preselect the generic form, so even `(A) antrum` gave "Generic free text". Of the 97 fixture parts only 19 name no procedure at all, which bounds what any rule here can change.
- The fix, and the rejected one. A blanket "prefer a biopsy template when no procedure is named" bonus regressed the ovarian debulking fixture (bare "Sigmoid", "Tumour on sigmoid" and "Proximal margin of sigmoid" became colonic polyps). Rejected. Instead each schema may declare `match.bare: true` — *this* template is what a bare site word means, because its rivals are always named. Worth +2 when the part names neither a resection nor a biopsy, which clears both the ≥2 margin for `confident` and the score-2 generic floor. It is a bonus and not a penalty on the rivals so that a cancer history still outranks it: "Gallbladder" alone is a cholecystectomy, "Gallbladder" with "CA gallbladder" is not confident.
- Who earns the flag, measured. Single-part export rows naming no procedure, classified by test code (`B*` biopsy, `S*` surgical, `Y*` cytology): **gastric_biopsy** 157/179 biopsy, **endometrial_biopsy** 107/128, **thyroid_fna** 125/137 cytology, **gallbladder** 46/46 surgical, **appendix** 18/18. Deliberately *not* flagged, against my first guess: `colonic_polyp` and `ibd_biopsy` (125/162 — a bare colon segment is as likely a resection segment), `cervical_biopsy` (a bare "Cervix" is a smear 239/306 of the time), `duodenal_biopsy` (3/14), `prostate_biopsy` (9/29 — "prostate chips" is a TURP), `lung_biopsy` (34/170), `breast_biopsy` (68/137), `cns_biopsy` (9/57). Those stay a `choose` with candidates offered, which is the honest answer. Re-check these counts when the case-mix cron reports a shift.
- Part text. `tidyPart` drops a leading `Others` (the export's null category, 959 of 6384 part-pieces) and collapses a part whose category and description are the same phrase (730 pieces, "Placenta, Placenta"), so neither is printed twice in the specimen name. Only a leading `Others` and only an all-identical repeat.
- Vocabulary the site lists were missing, each measured: `angular` / `angularis` → the incisura (20 cases write "Angular" against 57 writing "Incisura"; it reaches the subsite pick-list, so a part written "Angular" pre-fills "Incisura angularis"); `caecal` / `cecal` on colonic_polyp (36 pieces, 33 coded as biopsies); `sector` on prostate_biopsy as a procedure word (91 pieces, every one coded B3 — a systematic core, not a TURP); `hemithyroid` on thyroid_benign (a lobectomy specimen written without "-ectomy", which would otherwise have been read as an FNA).
- Effect. Over the 60 commonest specimen texts in the export (73 parts): 59 confident and 14 generic, against 52 and 21 before, and the one-part cases that produced nothing at all now produce a part. `Sputum` and `Vault` stay generic because no respiratory or vault-cytology template exists yet (Later).
- Tests. Four new intake tests (unlettered single and multi-part pastes, the null category and repeat, the `bare` flag with its deliberate non-flags, and the missing vocabulary), plus the 26-part overflow and the reworked empty-paste contract in test 570. Golden fixtures untouched; `tests/fixtures/intake/cases.json` untouched; 1145 tests.

## House subsite abbreviations

`match.siteAbbrev` holds short forms for a subsite — AC, DC, TC, HF, ICV on the three colorectal
templates. They are scored as a site hit only when the part also names something a specimen is taken
for (polyp, tumour, mass, lesion, biopsy, cancer, ESD, EMR, SMT, scar, ulcer, erosion, stricture,
colitis). Two letters are too weak to stand alone: in the 2021-2026 biopsy export AC is also the
acromioclavicular joint and an axillary clearance margin, so an ungated "AC" put an orthopaedic
specimen on a colon template.

Counted in that export, each of the five appears only in colorectal context — AC 10 rows, ICV 7,
TC 6, DC 4, HF 2. Deliberately excluded on the same evidence: **AV** is the aortic valve and an
arteriovenous fistula there as often as the anal verge, and **SC** is the squamocolumnar junction,
never sigmoid colon. Nothing is lost by omitting AV, because "Rectum, 2cm from AV" already matches on
"Rectum". The exclusion is asserted against the schema rather than against behaviour, because a rival
template outscores the colon on those phrases anyway — a behavioural test would stay green if the
exclusion were reverted.

Before this, an eleven-part screening colonoscopy written in house shorthand arrived with one
template suggested and ten parts on the generic form.

## Side and the breast clock face (reported defect, fixed 2026-09-24)

- Defect. "breast, L11H lesion, biopsy" built a **right** breast core, with the site "L11H lesion", and printed "BREAST, right L11H lesion, core biopsy". Two causes.
- Cause 1, the field. `presetValues` wrote only `values.side`, and only as "Left" / "Right". Six templates call the field `laterality` (breast_biopsy, breast_carcinoma, breast_dcis, phyllodes, lung_carcinoma, salivary_benign) and the two CNS templates spell their options "left" / "right", so in eight templates a stated side never arrived and the form's default printed instead: "Parotid, right parotid, excision" came out "PAROTID, left, superficial parotidectomy", and "Brain, left frontal tumour, biopsy" "BRAIN, right frontal lobe". Fixed: the side goes to whichever of `side` / `laterality` the template has, matched to its option without case.
- Cause 2, the shorthand. Only the words left / right were read. Counted on the 671 breast part-pieces of the 2021-2026 biopsy export: 510 name the side as a word, 119 put the letter on the clock hour ("L11H" 59, "R2H" 60), 3 write "Lt" / "Rt". `sideOf()` reads all three; a bare L or R is not a side unless it sits on a clock position, "RT" alone is not a side (radiotherapy), and a line naming both sides gives none.
- The site. `match.fill` gains `clock: true` (breast_biopsy): `clockSite()` writes the clock position and the distance the house way ("L11H lesion" → "11 o'clock", "R10-11H PA" → "10-11 o'clock, PA", "Right 2 O'clock 3cm FN" → "2 o'clock, 3 cm FN") and drops the side, "breast" and the generic target nouns. Of the released diagnosis lines giving side and hour, 94 read "BREAST, left 11 o'clock, core biopsy", against 71 carrying "L11H" through and 25 "left 11H".
- No guessing. `match.sideFromText` (breast_biopsy): a request that names no side leaves the chips blank (or on a template's own "Not stated"). The lines then print no side ("BREAST, 11 o'clock, core biopsy") and Checks asks "Choose Right or Left". A part added by hand keeps its Right default.
- Tests. `sideOf` and `clockSite` tables, the user's example end to end, the no-side lines and warning, and the stated side reaching three `laterality` templates and both CNS templates; browser check "a pasted L11H breast core builds a left part at 11 o'clock".
- Found then, fixed in the next section: the same pattern on the CNS and lung site fields.

## CNS and lung sites (reported defect, fixed 2026-09-24)

- Defect. "Brain, left temporal tumour, biopsy" printed "BRAIN, left frontal lobe" and "Lung, RLL, wedge resection" printed "LUNG, right upper lobe, lobectomy": the site, lobe and procedure the request named never arrived, so the form's defaults printed. Measured on the 2021-2026 biopsy and 2024-2026 LIS exports, the diagnosis line named a lobe the request did not on 86 of 93 pasted parts routed to the two CNS templates and on 273 of 376 routed to `lung_carcinoma`, and 45 lung wedges printed as lobectomies. After the fix: 0, 0 and 0.
- Cause, CNS. `cns_biopsy` had no site fill, and `cns_tumour`'s needed "lobe" written out. Of 208 CNS request lines, 3 write "lobe"; the adjective alone is the norm (frontal 24, temporal 26, parietal 29, occipital 21). The side is also written "R CPA", "L sphenoidal", "Rt temporal".
- Cause, lung. No lobe or procedure fill. The requests write the lobe as "RLL", "LUL", or "right upper and middle lobes", and the wedge without "resection" ("LLL wedge").
- The fix. Gated expansions in `SITE_ABBREV`, applied only onto an option the field offers: a lobe adjective becomes "<x> lobe" (not before bone, sinus, scalp, skin, artery, muscle, horn, lymph node, pleura or peritoneum, and not in "fronto-parietal"); cerebellar, vermis → cerebellum; CPA → cerebellopontine angle; pons, pontine, medulla, brain stem → brainstem; pituitary, sella → the sellar option each list has; sphenoid(al) → sphenoid wing or sphenoidal ridge (not trans-sphenoidal or the sinus); parafalcine → falx; the lung abbreviations and adjectives → "<x> lobe"; wedge → wedge resection / wedge excision (not a wedge biopsy); completion → completion lobectomy. `sideOf` reads a bare L / R or Lt / Rt on a CNS or lung site word and the side in RUL, RML, RLL, LUL and LLL. `sideFor` spells the side as the field does and gives midline or bilateral where offered. `matchOptions` fills a multiselect ("Upper lobe", "Middle lobe").
- No guessing. The rule's `noGuess` and the schema's `sideFromText` (both CNS templates, `lung_carcinoma`): a request naming no site, lobe or side leaves the field blank (lung laterality "Not specified"), nothing prints for it ("BRAIN, stereotactic biopsy", "LUNG, lobectomy"), and Checks asks "Choose the site", "Choose the side" (a paired site only; not the cerebellum, which may be vermian), "Choose Right or Left" or "Choose the lobe". Two lobes run together ("fronto-parietal") are left blank for the pathologist. A blank select shows "—", not its first option. A part added by hand keeps its defaults. Of the 93 CNS parts, 48 now take a site from the request; the 45 left blank name the organ only ("Brain", "Brain tumour", "right brain tumour"), a cyst, or a site the list does not offer.
- The procedure. `lung_carcinoma` fills the procedure from the options; the CNS procedure still comes from the form, since 206 of the 208 CNS request lines name none.
- Frozen section. The CNS and lung fills run only inside their scenario (`scenario` on the rule): site and side for CNS, side, lobe and specimen for lung. The lobe adjective alone now reads as CNS (6 of the 47 CNS frozen parts fell to "Nodule / mass"), unless the line names the scalp, skin, pleura, peritoneum or a node. The frozen CNS diagnosis line opens with the organ, as the released ones do (20 BRAIN, 7 PITUITARY, none with the lobe first, in 27): "BRAIN, left temporal lobe, biopsy x frozen section", formerly "TEMPORAL LOBE, left". `strip` on an options rule keeps the frozen list's "Brain" from tying with "Cerebellum".
- Tests. `sideOf` / `sideFor` for the CNS and lung spellings, the site expansions against each list, the user's two examples end to end with the Checks prompts, hand-added parts keeping their defaults, and the frozen fills and scenario; browser check "pasted brain and lung parts print the site the request names, or none".
- Found, not fixed here. When a CNS request is an LIS triple ("Brain, left temporal tumour, biopsy"), the "Specimen as received" field takes only the middle ("left temporal tumour"), so the specimen line loses the organ. None of the 208 CNS request lines in the exports is a triple, so it is rare. Recorded in Later.

## Frozen ovary and sentinel sides (user request, built 2026-09-24)

- Request: the frozen ovary and sentinel-node sides come from the request line, and nothing guesses one.
- Before: `ovSide` and `slnSide` had no fill. A pasted "Left SLN 1" printed "LYMPH NODE, SLN 1, excision x frozen section", with the side dropped.
- Evidence, counted on the 2021-2026 FS export (598 cases, 1291 parts):
  - Sentinel parts: 40, of which 36 name a side (15 right, 21 left) and 4 name none.
  - Ovary parts: 28, of which 11 name a side (6 right, 5 left) and 17 name none.
  - The fields read none of these sides before the fix; they now read 36 and 11.
  - The released FS sentinel lines put the side after the organ (178 heads): "LYMPH NODE, left SLN 1, ...". The app now prints the same. Before the fix, no sentinel line named a side; now 36 do.
- The fix: two `match.fill` rules in `frozen_section`, each run only inside its scenario. `slnSide` takes Right or Left from the line. `ovSide` takes Right, Left or Bilateral.
- When the line names no side:
  - the field stays blank;
  - the line prints no side;
  - Checks asks "Choose Right or Left" (sentinel) or "Choose Right, Left or Bilateral" (ovary).
- A part added by hand keeps its blank default.
- The linked synoptic ("Stage this part", "Add breast synoptic") carries the frozen side across. When the frozen part has no side, the synoptic no longer supplies one; it gets the values below, prints no side, and Checks asks for it.

| Synoptic | Field | Before, frozen part with no side | Now |
|---|---|---|---|
| `ovary_ft_peritoneum` | Procedure | the form's "Right salpingo-oophorectomy" when no specimen was picked | "Salpingo-oophorectomy, side not specified" |
| `ovary_ft_peritoneum` | Tumour site | the form's "Right ovary" | "Not specified" |
| `ovary_ft_peritoneum` | Surface involvement | "Present, right" | "Present, side not specified" |
| `breast_carcinoma` | Laterality | the form's "Left" | "Not specified" |
| `lung_carcinoma` | Laterality and lobe | the form's "Right" and "Upper lobe" | "Not specified", no lobe |

  - `ovary-pair.md` had always specified a prompt for surface involvement; the code had set "right".
- Routing is unchanged. No FS request part names "frozen", "FS" or "intraoperative" (0 of 1291), so frozen rows are picked by hand on the intake strip:
  - the 40 sentinel parts arrive on Lymph node excision through the node rule;
  - the 28 ovary parts arrive on the generic form (13), effusion cytology (14, on the word "peritoneal") or duodenal biopsy (1).
  - This is recorded in Later.
- Tests:
  - intake: sides read from the line; blank with a prompt; the rules kept inside their scenarios; hand-added defaults;
  - one no-guess link test each in `breast_carcinoma`, `ovary_ft_peritoneum` and `lung_carcinoma`;
  - browser check "a pasted frozen sentinel node prints its side, or none with a Checks prompt", which picks Frozen section on each row as the pathologist does.
- Found, not fixed here:
  - The sentinel site keeps its "Breast" default whatever the line names, so "Left groin SLN 1" reads Breast.
  - The line drops "axillary", although 25 of the 178 released FS sentinel heads name the axilla.
  - Pasted `breast_carcinoma`, `breast_dcis` and `phyllodes` parts that name no side keep the form's Left.
  - These are recorded in Later.
