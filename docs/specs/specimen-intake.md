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
- Part roles drive the satellite templates: `lymph node` / `LN` / `sentinel` in the part text → `lymph_node` (confident, station text kept in the name); `margin` with a breast case prefix or a breast main part → `breast_excision` as a margin part with `margin` pre-set from the text (since 2026-10-10 also a margin line that says breast itself, the lab's "Breast, left superior margin": see Breast cavity shave margins); `omentum`, `nodule`, `peritoneum`, `spleen` and other satellites of a cancer debulking → `generic` until an organ synoptic covers them.
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

## Benign batch 1 routing and pre-fill (user request, built 2026-09-24)

Counts are parts in the 2021-2026 biopsy export plus the 2024-2026 LIS export (17,706 parts), aggregate only.

- Abscess, ulcer and granulation tissue (`abscess_granulation`):
  - New schema key `match.exclude` (regex source): a hard exclusion, used by this form only, so an organ word keeps the organ's own template.
  - `nasal_polyps` gains not: pilonidal.
  - I&D, incision, debrided, punch and the anal short forms expand only on this form's options.
  - 181 parts re-route: 124 from generic, 30 from skin cyst and 27 from soft tissue benign. No other part changes template or tier.
- Bone and joint (`bone_joint`):
  - `match.exclude` keeps jaws, digits, ossicles, marrow, nodes, vessels, amputations, spinal cord and fluids off the form.
  - New fill rule `from: 'map'`: ordered [regex, option] pairs, so "THR", "NOF", "curettings" and "reamings" name the specimen and the procedure.
  - `gastric_biopsy` gains not: bone.
  - 172 parts re-route: 159 from generic, 5 from gastric biopsy, 3 from soft tissue benign and 1 from nasal polyps; 2 thyroid FNA and 2 effusion cytology parts move to generic. No tier changes on unchanged routes.
- Soft tissue, benign (`soft_tissue_benign`):
  - "abdominal wall" joins the site list; 2 parts re-route from generic.
  - Browser QA found that a pasted part printed what the request did not say. Of the 317 historical parts that reach the form:
    - 245 printed the form's default label, so "Soft tissue, right thigh, excision" read "right thigh lipoma" whatever the diagnosis;
    - 47 said a word twice ("right thigh lipoma lipoma");
    - 36 two-piece requests ("Right thigh lipoma, excision", "Abdominal wall nodule, excision") lost their site;
    - 68 resections printed "excision".
  - Fixes:
    - the label now comes from the request (lipoma, ganglion, cyst, nodule, mass, lump, swelling, tumour or lesion) or stays blank, through `from: 'map'` on a text field with `noGuess`;
    - a site that already names the label is not followed by it again;
    - the new fallback `'site'` copies the first piece of a triple that parsed without a detail;
    - the procedure is read from the line.
  - Now: 0 guessed labels; 1 doubled word, which comes from the request itself; 0 lost sites. 62 resections print resection; the other 6 name both procedures and keep Excision.
  - A part added by hand keeps the form's "lipoma" default. A request whose triple does not parse (40 parts) still leaves the site blank, as before.
- Generic share, by the categories in the benign resections case mix (`tools/profile-benign-resections.py --route`):
  - soft tissue 236 to 235 of 523 (this card changed the form, not its reach);
  - abscess, ulcer and granulation tissue 183 to 62 of 262;
  - bone and joint 165 to 12 of 179.
- Found, not fixed here: 235 soft tissue parts still reach Generic. 114 name soft tissue with no procedure word, and 65 are biopsies, although the form offers Biopsy. This is recorded in Later.
- Tests: tests/softtissue_batch1.test.js, tests/abscess_granulation.test.js and tests/bone_joint.test.js, plus three browser checks (soft tissue ALT with MDM2, pilonidal sinus, revision synovium and vertebral metastasis).

## Benign batch 2 routing and pre-fill (user request, built 2026-09-24)

Counts are the 18,913 parts that the benign resections profiler splits from the 2021-2026 biopsy export and the 2024-2026 LIS export, routed with no clinical history. They are aggregate only.

- Products of gestation (`endometrial_biopsy`):
  - New site terms: tissue mass, products (or product) of gestation or conception, gestational product, retained product, ERPC, ERPOC, evacuation and miscarriage. New procedure terms: evacuation, suction, per vagina, per vaginam, ERPC and ERPOC. New clinical terms: miscarriage, missed abortion and retained product.
  - `match.exclude` keeps haematoma, subdural and extradural evacuations, abscesses, soft tissue, breast and placenta lines off the form. "Rectum, suction biopsy" keeps its own route.
  - Two `from: 'map'` fills:
    - The specimen type is read from the line: suction, vacuum or MVA gives "Uterus, suction evacuation"; evacuation, ERPC or retained products gives "Uterus, evacuation of retained products of gestation"; vagina, passed or PV gives "Tissue mass, per vaginam"; tissue mass, products of gestation or miscarriage gives "Tissue mass". A line that names the endometrium, pipelle, curettings, polypectomy, hysteroscopy, D&C or the uterine cavity keeps the endometrial types.
    - The gestational phase is set from the same words.
  - 145 parts re-route, all from generic:
    - 102 in the products-of-gestation category;
    - 13 bare "TISSUE MASS" heads that the profiler files under soft tissue, all released as decidua, blood clot or trophoblast;
    - 30 uncategorised gestational heads (tissue mass per vagina, uterine suction, miscarriage).
  - No other part changes template or tier.
- Generic share, by the categories in the benign resections case mix (`tools/profile-benign-resections.py --route`):
  - products of gestation 107 to 5 of 114 (`endometrial_biopsy` 5 to 107; `placenta` 2 unchanged);
  - soft tissue 235 to 222 of 523, because of the 13 tissue-mass heads.
- The 5 left on Generic: two "Uterus, …" lines and one "… tissue mass" line are offered as "choose", and two name no site.
- Tests: tests/products_of_gestation.test.js (intake section), and the "products of gestation (benign batch 2)" case in tests/fixtures/intake/cases.json. That case has four parts under a "Missed miscarriage" history, and its placenta part keeps `placenta`.
- Standalone fallopian tube (`uterus_benign`):
  - A new rule, `match.alone`, carries site words (fallopian tube, salpingectomy, paratubal, fimbrial cyst, hydrosalpinx, tubal ligation) and procedure words (the same, plus sterilisation, excision and cystectomy). They count only on a line that names none of its `unless` words: the ovary, oophorectomy, adnexa or appendage, the uterus, hysterectomy, cervix, myoma or fibroid, TAH or BSO, ectopic, pregnancy, gestation, villi or "products of". Fill rules marked `alone: true` use the same gate.
  - Two fills: the specimen type is read from the line (`from: 'map'`), then a paratubal cyst takes its side (`from: 'side'`). A line with no side fills nothing.
  - 99 parts re-route to `uterus_benign`, all confident: 78 from generic and 21 from `ovarian_cyst`. By category that is tube 79 (65 generic, 14 `ovarian_cyst`), uncategorised 16 (9, 7) and ectopic 4 (generic). No other part changes template or tier, and the 87 parts already on the form keep the same pre-fill.
  - Their pre-fill: paratubal cyst excision 57 (left 26, right 31), right salpingectomy 23 and left salpingectomy 19.
- Generic share, by the same categories:
  - fallopian tube, benign 69 to 4 of 83 (`uterus_benign` 0 to 79; `ovarian_cyst` 14 to 0);
  - ectopic pregnancy 7 to 3 of 8 (`uterus_benign` 4; `ovarian_cyst` 1 unchanged).
- The 4 tube parts and 4 ectopic parts that stay off the form all name the ovary, the uterus or a pregnancy.
- Fixture change (deliberate, 2026-09-24): in the "fibroids" case of tests/fixtures/intake/cases.json, parts A and B ("Right/Left fallopian tube, resection") now expect `uterus_benign`/confident, not generic/none, with their sided salpingectomy pre-filled. Part C is unchanged. A "fallopian tube only (benign batch 2)" case adds a salpingectomy, a paratubal cyst excision, a sterilisation and an ovary-and-tube part; the last keeps its generic "choose" route.
- Tests: tests/fallopian_tube.test.js (intake section); spec docs/specs/fallopian-tube.md.
- Ectopic pregnancy (`fallopian_tube_ectopic`, added 2026-09-24 with the last card of the batch):
  - Site terms: ectopic, ectopic pregnancy, tubal pregnancy and tubal ectopic. Procedure terms: salpingectomy, salpingotomy and salpingostomy. Clinical terms: ectopic, ectopic pregnancy and tubal pregnancy. A history alone never offers the form, because a candidate needs a site term.
  - `match.exclude` keeps ectopic thyroid, parathyroid, thymus, pancreas, spleen, gastric, adrenal and breast tissue, and decidua lines, off the form. `match.not` lowers it on endometrial, uterine, curettage and evacuation lines.
  - Two fills: the side from the line (`sideFromText`: a line that names no side gets "Not stated", not the form's default Left), and the procedure by `from: 'map'` (salpingotomy or salpingostomy, then partial salpingectomy, then salpingectomy, then contents or clot as "Tubal contents").
  - 3 parts re-route, all from generic and all confident. Their pre-fill: right side 3; salpingectomy 2, and the third names no procedure and keeps the default salpingectomy. No other part of the 18,913 changes template or tier.
- Generic share, by the same categories:
  - ectopic pregnancy 3 to 0 of 8 (`fallopian_tube_ectopic` 3; `uterus_benign` 4 and `ovarian_cyst` 1 unchanged);
  - all benign-resection categories 513 to 510 of 1,425.
- The 5 ectopic parts that stay off the form: 4 name only the tube and keep the tube form of `uterus_benign`, which this card left untouched even when the history names an ectopic; 1 names the ovary and keeps `ovarian_cyst`.
- No intake fixture change. Tests: tests/fallopian_tube_ectopic.test.js (intake section); spec docs/specs/fallopian-tube-ectopic.md.

## Benign batch 3 routing and pre-fill (user request, built 2026-09-25)

Counts are the same 18,913 parts, routed with no clinical history. They are aggregate only.

- 140 parts re-route, and Generic falls from 4,006 to 3,877 of the 18,913:
  - `haemorrhoid` 48 (47 from generic, 1 from `colon_resection`);
  - `testis_benign` 33 (32 from generic, 1 from `skin_cyst`);
  - `ear_cholesteatoma` 29 (27 from generic, 2 from `abscess_granulation`);
  - `nail_digit` 22 (21 from generic, 1 from `soft_tissue_benign`);
  - `hernia_sac` 8 (2 from generic, 6 from `soft_tissue_benign`).
  - 138 are confident and 2 are "choose" (1 haemorrhoid, 1 testis). No other part changes template or tier.
- Haemorrhoid (`haemorrhoid`):
  - Site terms: haemorrhoid, hemorrhoid, haemorrhoidal, haemorrhoidectomy and piles. Procedure terms: haemorrhoidectomy, excision and resection. Clinical terms: haemorrhoid and piles.
  - `match.not` lowers it on abscess, fistula, fissure, carcinoma, tumour, condyloma and warts lines.
  - Two fills: the procedure (`from: 'map'`: haemorrhoidectomy, then resection, then excision), and a subsite read from the line after the anal and haemorrhoid words and the clinical adjectives (thrombosed, prolapsed, strangulated and the like) are stripped, so a bare "Haemorrhoid" line fills no subsite.
  - Pre-fill of the 48: resection 19, excision 16, haemorrhoidectomy 13; a subsite on 2.
- Ear (`ear_cholesteatoma`):
  - Site terms: cholesteatoma, middle ear, mastoid, attic, aural polyp, tympanic membrane, the external auditory canal and the operations (atticotomy, mastoidectomy, tympanomastoidectomy). Clinical terms: cholesteatoma, otitis media and ear discharge.
  - `match.exclude` keeps parotid, salivary, nasopharyngeal, nasal, tonsil and laryngeal lines off the form. `match.not` lowers it on pinna, helix, lobule, tragus and preauricular lines, and on skin-lesion words (naevus, keratosis, wart, carcinoma, BCC, SCC, keloid, chondrodermatitis, cysts), which keep the skin templates.
  - `abscess_granulation` now also excludes auditory canal, attic, tympanic and aural lines; 2 ear parts leave it.
  - Fills: the side from the line (`sideFromText`), the procedure (tympanomastoidectomy, mastoidectomy, atticotomy, punch, curetting, excision, resection, biopsy), an aural polyp or granulation-tissue diagnosis, and the site text after the procedure words.
  - Pre-fill of the 29: right 15, left 12, not stated 2; resection 12, punch 7, curetting 5, atticotomy 2, excision 1; granulation tissue 4, aural polyp 3.
- Hernia sac (`hernia_sac`):
  - Site terms: hernia, hernia sac, herniotomy, herniorrhaphy and hernioplasty. `match.exclude` keeps bowel, appendix, hiatus hernia, intervertebral disc and lymph node lines off the form.
  - `bone_joint` now excludes hernia, herniotomy, herniorrhaphy and hernioplasty, so a disc herniation stays on bone and joint and a hernia sac never lands there.
  - Fills: the side (`sideFromText`), the hernia type (`noGuess`: inguinal or groin, femoral, paraumbilical, umbilical, incisional, epigastric, ventral and the rest) and the procedure.
  - Pre-fill of the 8: side not stated 8; paraumbilical 1, type blank 7; resection 5, excision 3.
- Nail and digit (`nail_digit`):
  - Site terms: nail, toenail, fingernail, nail plate, bed, matrix, unit and fold, subungual, periungual, paronychia, the onychoses, ingrown or ingrowing nail, and digital mucous or myxoid cyst. Clinical terms include onychomycosis, dystrophy, melanonychia, osteomyelitis and gangrene.
  - `match.alone` counts finger, thumb, toe, hallux, digit and fingertip only on a line that names no skin, soft-tissue or lesion word (ganglion, lipoma, naevus, pigmented, keratosis, wart, skin tag, BCC, SCC, carcinoma, dermatofibroma, epidermal and sebaceous cysts, abscess, ulcer, granulation tissue, skin, soft tissue), so those lines keep their own templates.
  - `match.exclude` keeps breast, forearm, wrist, palm, foot ulcer, heel, ankle, leg, knee, hip, spine, skull and lymph node lines off the form.
  - Fills: the specimen type (amputation or ray, clipping, nail-unit excision, matrix or bed biopsy, avulsion or nail plate; a lesion word or a bare digit gives lesion excision, and a bare nail line a clipping), a new procedure field (`noGuess`: wedge excision, curettage, punch, incisional biopsy, debridement, biopsy, resection, excision), the dx head (NAIL, THUMB, TOE or FINGER), a named diagnosis from the line, and the site text. A lesion excision that names no diagnosis opens on "No evidence of malignancy (descriptive)".
  - Pre-fill of the 22: lesion excision 16, matrix or bed biopsy 3, avulsion 3; head NAIL 9, THUMB 7, TOE 6; descriptive diagnosis 14, digital mucous cyst 1, subungual exostosis 1; procedure excision 7, biopsy 6, resection 2, blank 7.
- Testis, scrotum and foreskin (`testis_benign`):
  - Site terms: testis, testicle, testicular, orchidectomy, foreskin, prepuce, circumcision, phimosis, hydrocele, epididymis, spermatocele, spermatic cord, vas deferens, vasectomy and tunica vaginalis. Clinical terms: torsion, phimosis, infertility, azoospermia, balanitis, lichen sclerosus and undescended.
  - `match.exclude` keeps prostate, bladder, cystoprostatectomy, kidney and lymph node lines, and the testicular appendage (appendix testis, hydatid of Morgagni), off the form. `match.not` lowers it on tumour, mass, carcinoma, germ cell tumour, lymphoma, glans, penis and penile, condyloma, lipoma and sarcoma, lesion and nodule, orchitis, epididymitis, abscess and adenomatoid lines.
  - Fills: the side (`sideFromText`), the specimen type (prepuce, hydrocele sac, epididymal cyst or spermatocele, vas deferens, testicular biopsy, orchidectomy), the dx head (typed "foreskin" gives FORESKIN; prepuce and circumcision give PREPUCE), the procedure (`noGuess`), torsion, and lichen sclerosus.
  - Pre-fill of the 33: orchidectomy 15, testicular biopsy 8, prepuce 6, vas deferens 4; right 14, left 10, not stated 9; torsion 2.
- Generic share, by the categories in the benign resections case mix (`tools/profile-benign-resections.py --route`):
  - haemorrhoid 54 to 7 of 56 (`haemorrhoid` 48; `colon_resection` 2 to 1);
  - nail and digit 35 to 14 of 56 (`nail_digit` 22; `soft_tissue_benign` 11 to 10; `skin_cyst` 8 and `abscess_granulation` 2 unchanged);
  - testis, scrotum and foreskin 37 to 10 of 45 (`testis_benign` 28; `skin_cyst` 5 to 4; `ovarian_cyst` 2 and `soft_tissue_benign` 1 unchanged); the other 5 testis parts sit outside the category;
  - ear and temporal bone 33 to 6 of 36 (`ear_cholesteatoma` 29; `abscess_granulation` 2 to 0; `skin_cyst` 1 unchanged);
  - hernia sac 2 to 0 of 8 (`hernia_sac` 8; `soft_tissue_benign` 6 to 0);
  - all benign-resection categories 510 to 386 of 1,425.
- Organ icons: `ear` takes the nasopharynx glyph, `nail` the skin glyph and `testis` the prostate glyph until each has its own.
- No intake fixture change. Tests: the intake sections of tests/haemorrhoid.test.js, tests/ear_cholesteatoma.test.js, tests/hernia_sac.test.js, tests/nail_digit.test.js and tests/testis_benign.test.js.

## Skin SCC gate (user request, built 2026-09-25)

- `match.gate` (a regex source, read without case) is a pattern the specimen line or the clinical history must meet before a template is scored at all. A part that fails it is left to the other templates, never sent to Generic.
- `skin_scc` gates on SCC, cSCC, squamous carcinoma or squamous cell carcinoma not followed by "in situ". "?SCC" or "squamous cell carcinoma" opens it; ?BCC, Bowen's disease, SCC in situ and keratoacanthoma leave a skin excision on Skin excision, and a line with no history is scored as before. Its site terms are skin sites (scalp, face, ear, lip, trunk and limbs), so tongue and oesophagus lines naming SCC never reach it.
- Through the gate it scores on the skin excision procedure words, the four SCC clinical terms and bias 1. A skin excision with ?SCC in the clinical line puts Skin SCC first as "choose", Skin excision (which also lists SCC) next; "squamous cell carcinoma" adds the cancer-context point and makes it confident.
- Fills: the specimen name from the line's detail, the tumour site from the options (`noGuess`) and the laterality from the side.
- Routed with no clinical history, as the exports carry none: 7 of the 18,913 parts now open Skin SCC, each naming SCC in its specimen line. 6 are invasive SCC (five-year 5, from Skin cyst 3 and Skin excision 2; export 1, from Skin cyst) and 1 is a five-year part whose diagnosis refers to a comment. None of the 12 / 3 SCC in situ parts opens it. The other invasive SCC parts stay where they were: Generic 14 / 5, Skin cyst 4 / 2, Frozen section 0 / 1.
- No intake fixture change. Tests: the intake section of tests/skin_scc.test.js.

## Skin curettings (user request, built 2026-09-26)

- `match.own` names biopsy words a resection form reports itself (`own.procedure`) and the sites on which it does (`own.site`). On a line naming one of those sites the biopsy-context test is re-run without those words, so the -3 for a biopsied part on a resection-kind form is not applied. Every other rule reads the line as before.
- `skin_excision` owns curetting and curettage on a line naming skin, scalp or face. "Skin, back, curetting" scored 2 for the procedure word less 3 for biopsy context and opened Generic; it now scores 2 against Skin cyst's -3 and opens Skin excision confidently. The linked defaults then give Curettings 1 block, no clinical label and a seborrhoeic keratosis diagnosis.
- Left out on purpose: ear (ear curettings are the cholesteatoma form's), eyelid, lip and nose (chalazion, mucosal and nasal lines), and punch and shave, which keep the penalty — the request named curettings.
- Routed with no clinical history: 36 of the 18,913 parts change route, all skin curettings — 22 of 22 in the five-year file (21 from Generic with no match, 1 from a Generic choice) and 14 of 14 in the export. Diagnoses (five-year / export): seborrhoeic keratosis 20 / 13, naevus 1 / 0, fibroepithelial polyp 1 / 1. No other curettings line moves.
- On Generic: 263 to 241 of 865 skin parts in the five-year file, 76 to 62 of 239 in the export.
- No intake fixture change. Tests: the intake section of tests/skin_excision_procedures.test.js.

## Liver biopsy (medical) (user request, built 2026-09-30)

- `liver_biopsy` scores on the liver site word only; "hepatic" is left out so "Hepatic flexure" lines never reach it, and "flexure" is excluded as well.
- Its `match.gate` opens on "random", "background" or "non-lesional" in the line, or on a medical word in the line or the history (deranged LFTs, hepatitis, AIH, PBC, PSC, cholestasis, cirrhosis, fibrosis, steatosis, fatty liver, transplant or graft, transjugular, iron, drugs, HBV, HCV) or a right or left lobe, provided no tumour word appears in either (mass, lesion, nodule, SOL, HCC, tumour, metastasis, abscess, cyst, carcinoma, neoplasm, adenoma, haemangioma, FNH). `exclude` drops lines naming those words, a flexure, or a resection or hepatectomy. `bias` 1 breaks ties with the lung biopsy form, which also scores "lobe".
- Fills: the site from the line's detail, else "transjugular", "allograft", "random", "background", "non-lesional", "right lobe" or "left lobe" from the words.
- Routed with no clinical history, as the exports carry none: the liver site lines in the five-year biopsy file (135 parts) and the 2024-2026 export (37) name no medical word, so none opens the medical form confidently. Two five-year parts change route: a liver right lobe biopsy that opened the lung biopsy form confidently now opens the medical liver form as a choice, and a liver graft line that opened `liver_benign` confidently is now a choice between the two liver forms. The other right and left lobe lines stay on Generic as a choice, with the medical form offered first: 33 five-year parts, 21 of them among the 39 liver parts with a non-tumour diagnosis, and 7 export parts. The export is unchanged. In use the history of a pasted request ("deranged LFT", "?AIH") is what opens the form.
- Intake fixture change (deliberate): two cases added to `tests/fixtures/intake/cases.json` — "Liver, random, biopsy" under a deranged liver function history (medical form, site "random"), and a liver mass case whose segment 6 core stays on Generic while its background biopsy opens the medical form. Tests: the intake section of tests/liver_biopsy.test.js; tests/picker.test.js orders Liver (medical) after Brain in the Small biopsy row and first among the Medical biopsies.

## Hirschsprung disease — rectal biopsy (user request, built 2026-09-30)

- `hirschsprung_biopsy` scores on the rectum, rectal, anorectal, rectosigmoid, sigmoid and colon site words, and on suction, full-thickness, RSB and biopsy as the procedure.
- Its `match.gate` opens only on a Hirschsprung word in the line or the history: suction, full-thickness, RSB, Hirschsprung, aganglionosis, meconium, "ganglion cells" or "?HD". `exclude` drops lines naming a polyp, a tumour word (mass, lesion, ulcer, carcinoma, growth, stricture) or a pull-through or resection (pull-through, Swenson, Duhamel, Soave, TERPT, endorectal, colectomy, proctectomy), which the resection card will take. `bias` 1 breaks ties with the polyp and IBD forms.
- Fills: the site from its options (Rectum, Sigmoid colon, Colon); the procedure (suction or RSB gives "Suction biopsy", full thickness "Full-thickness biopsy"); the level from what is left of the line once it holds a number ("2 cm from AV", "3cm").
- Routed with no clinical history, as the exports carry none: no part changes route in either file (15,098 five-year parts, 6,384 export parts). The 17 site-line parts of the five-year cases whose diagnosis names ganglion cells carry no Hirschsprung word, so they stay on Generic as a choice with the polyp form first; with "?Hirschsprung" in the history all 17 open the new form confidently. In use the history of a pasted request, or "suction" in the line, is what opens the form.
- Intake fixture change (deliberate): two cases added to `tests/fixtures/intake/cases.json` — rectal suction biopsies at 2 and 3 cm from AV under a delayed-meconium, ?Hirschsprung history (site, procedure and level filled), and a plain rectal biopsy under "?HD" (site only). Tests: the intake section of tests/hirschsprung_biopsy.test.js, which also places the form after IBD in the GI row; tests/picker.test.js puts Hirschsprung last in the Small biopsy row.

## Neoplastic liver pair (user request, built 2026-10-02)

- `liver_lesion_biopsy` scores on the liver and hepatic site words and on biopsy, core, needle and tru-cut as the procedure. Its `match.gate` needs both a biopsy word and a lesion word, each in the line or the history: mass, lesion, nodule, SOL, HCC, hepatoma, tumour, metastasis, carcinoma, cholangiocarcinoma, neoplasm, malignancy, adenoma, haemangioma, FNH, EHE, PEComa, angiomyolipoma, lymphoma, abscess, cyst, hydatid, "targeted", a named segment ("segment 6", "S7"), "?HCC" or "?mets". A line without a biopsy word ("Liver, cyst", "Liver, segment 6") stays with `liver_benign`. `exclude` drops random, background and non-lesional lines (the medical form's), resection and hepatectomy lines, a flexure, and FNA, aspirate or cytology lines. `bias` 1. A medical history ("HBV, fibrosis staging") still sends "Liver, segment 6, biopsy" to the medical form.
- Fills: the site from the line's detail ("segment 7 mass"), unless it is a generic word or a clinical query, so "Liver, ?HCC, biopsy" leaves it blank and the diagnosis line reads "LIVER, biopsy".
- `hcc` scores on liver, hepatic, hepatectomy, segmentectomy, sectionectomy and segment, and on hepatectomy, segmentectomy, sectionectomy, lobectomy, resection, wedge and explant as the procedure. Its gate opens only on HCC, hepatocellular, hepatoma or fibrolamellar in the line or the history; `exclude` drops biopsy lines and a flexure; `bias` 2 puts it ahead of `liver_benign` once HCC is named. Fills: a named operation as the received name ("Liver, right hepatectomy", "Liver, left lateral sectionectomy"); the segment from its options ("segment 6"); the procedure from the line (wedge; right, left or extended hepatectomy as major; segmentectomy or sectionectomy as minor; explant or total hepatectomy). Without a received name the specimen line is built as "Liver, segment 6, resection": the house word, as no HCC resection line in the five-year biopsy file says "partial hepatectomy".
- Routed with no clinical history, as the exports carry none, against the live build: every liver line whose route changed is a biopsy with a neoplastic diagnosis (metastatic carcinoma, metastatic neuroendocrine tumour, cholangiocarcinoma), moved from Generic or `liver_benign` to the new biopsy form, in both the five-year biopsy file and the 2024-2026 export. No resection or unlabelled line changes route. None of the 22 HCC resections in the five-year file names HCC on its specimen line, so in use the history of a pasted request is what opens the HCC form; "Liver, wedge resection, ?metastasis" stays on `liver_benign`.
- Intake fixture change (deliberate): the liver mass case of the medical pair now expects its segment 6 core on `liver_lesion_biopsy` (it stayed on Generic while no mass form existed). Three cases added: targeted biopsies under a colon carcinoma history (site "segment 7 mass"; "?metastasis" leaves the site blank), a right hepatectomy under an HCC history (the received name and a major procedure), and a wedge resection for a query metastasis, which stays on `liver_benign`. Tests: the intake sections of tests/liver_lesion_biopsy.test.js and tests/hcc.test.js; tests/picker.test.js puts Liver (mass) after Liver (medical) in the Small biopsy row and second among the Medical biopsies.

## Cervical polyps and endometrial aspirates (user request, built 2026-10-05)

- `cervical_biopsy` takes polyp, polypectomy and avulsion as procedure words. A cervical polyp line used to tie the three cervical forms (biopsy, LEEP and cytology) on the site word alone and open Generic.
- `match.own` now also works on a biopsy form, the other way round: resection words that form reports itself on a line naming one of `own.site`. The cervical form declares excision and resection on a polyp line, so "Cervical polyp, excision" is not read as a resected part; `cervical_excision` excludes polyp and polypectomy, so such a line no longer opens the LEEP form.
- Fills (cervical): the specimen type "Endocervical curettings" on curett or ECC and "Cervical polyp" on polyp; the polyp type "Decidual polyp" on decidu; the site from the line's detail unless it is only a polyp or procedure word, so "Cervical polyp" leaves it blank.
- Fills (endometrial), after the products-of-gestation entries: polypectomy, or hysteroscopic with a polyp, gives "Endometrial polypectomy"; hysteroscopic "Hysteroscopic biopsy"; aspirate, aspiration, Pipelle, Vabra or EA "Endometrial aspirate"; curettings or D&C "Endometrial curettings"; biopsy "Endometrial biopsy"; a polyp "Endometrial polypectomy". A bare line keeps the aspirate default.
- Routed with no clinical history, as the exports carry none, against the live build: every part whose route changed is a cervical polyp line (polyp, polypectomy or avulsion), moved to the cervical form from Generic and, for the polyp excisions, from the LEEP form — 63 site-line parts and 83 diagnosis heads in the five-year biopsy file, 18 and 19 in the 2024-2026 export. No endometrial route changed; the endometrial lines now fill their sample type, an aspirate most often.
- No intake fixture change. Tests: the intake sections of tests/cervical_polyps_endometrial_aspirates.test.js and tests/products_of_gestation.test.js.

## Colonic polyp specimen kind (user request, built 2026-10-05)

- `colonic_polyp` fills the carcinoma specimen kind from the line: EMR, ESD, mucosal resection or submucosal dissection gives "EMR / ESD fragments"; polypectomy or snare gives "Polypectomy", as does a polyp on a line that does not say biopsy. Anything else keeps the "Biopsy of mass" default. The kind shows only once the dysplasia is set to invasive adenocarcinoma, and it decides whether the Haggitt and Kikuchi levels and the depth and width of invasion show (docs/specs/colonic-polyp-descriptions.md).
- No route change and no intake fixture change. Tests: the intake section of tests/colonic_polyp_descriptions.test.js.

## Peritoneal nodule biopsy (user request, built 2026-10-07)

- `peritoneal_nodule` scores on the peritoneal site words (peritoneum, peritoneal, mesentery, mesenteric, mesocolon, mesocolic, pouch of Douglas, cul-de-sac, paracolic, diaphragm, diaphragmatic, hemidiaphragm, serosa, serosal, loose body) and on biopsy, excision, nodule, deposit, implant, plaque, loose body and soft tissue as procedure words, with `bias` 2. `own` keeps excision a biopsy-form word on these sites.
- Omentum and omental count through `match.alone` only on a line that also names a lesion or a procedure (biopsy, excision, nodule, deposit, implant, plaque, lesion, mass, cake, tumour, serosa, peritoneum, mesentery, metastasis). A bare "Omentum" or "Infracolic omentum" is an omentectomy at staging or debulking, whatever the history says, and stays on Generic.
- `exclude` drops cysts, lipomas, omentectomies, washings, fluid, ascites, effusions, cytology, aspirates, frozen and intraoperative lines, pleura, hernia sacs, lymph nodes, organ resections and peritonectomy, and joint, bone or cartilage loose bodies (elbow, knee, hip, shoulder, ankle, wrist, joint, synovium, meniscus, patella, olecranon, bone, cartilage, osteochondral). `not` takes 4 points for colon, sigmoid, rectum or caecum, so a line naming a large-bowel segment keeps the colon forms: "Sigmoid colon, mesenteric nodule, excision" stays on Colon resection and "Sigmoid mesentery, nodule, biopsy" stays a choice.
- Fills: the site (pouch of Douglas and cul-de-sac, paracolic gutter, diaphragm, serosa of a named organ including the bladder peritoneum, mesentery including the mesocolon, omentum, pelvic peritoneum); the side from the text; the organ printed before the site (small bowel, sigmoid colon, transverse colon, caecal, rectal, colonic, appendiceal, gastric, uterine, bladder, ovarian, tubal, hepatic, splenic); the lesion word (nodule, nodules, deposit, deposits, plaque) without guessing; the procedure, where a loose body is an excision unless the line says biopsy; the SOFT TISSUE head on a soft tissue line; and the diagnosis "Peritoneal loose body" on a loose-body line.
- Routed with no clinical history, as the exports carry none, against the previous build. Five-year biopsy file: 92 of 15,098 site-line parts and 111 of 15,452 diagnosis heads change route, all but a few to the new form. They come from Generic with no candidate (52 site lines, 91 heads), from the effusion cytology form (28 site lines: tissue biopsies naming the peritoneum that used to open the fluid form) and from a Generic choice (11 site lines). Of the heads now on the form, 50 read no evidence of malignancy and 44 carry a malignant diagnosis. 2024-2026 export: 35 of 6,384 site-line parts and 17 of 5,172 heads change route, all to the new form, from Generic (16 site lines, 11 heads) and from the effusion cytology form (15 site lines). A few colon heads naming a mesenteric nodule became a choice or open the new form; no joint loose body moves.
- Intake fixture change (deliberate): the serous carcinoma debulking case now expects its mesenteric nodule (D), diaphragm nodule (F) and left pelvic peritoneum (H) on `peritoneal_nodule`, confident; the bare omentum (A) stays on Generic. Tests: the intake section of tests/peritoneal_nodule.test.js; tests/picker.test.js and tests/hirschsprung_biopsy.test.js append Peritoneum to the Small biopsy and GI rows.

## Breast cavity shave margins (reported defect, fixed 2026-10-10)

- The lab writes a cavity shave margin "Breast, left superior margin", with ", excision" in the released head. The role rule took only a margin line without the word breast ("Anterior margin" under "Breast, excision:"), so the lab's own line opened Generic as a close call, a part picked or switched onto the excision form was filled as a lesion excision or reset, and the form's right / superior defaults printed (user: "it defaults to right superior each time and can cause errors").
- Role rule now (`readBreastMargin`, `breastMarginLine`): a line with the word margin, no orientation words (stitch, suture, loop, clip, short, long, ink, marked) and no lesion or mastectomy before the margin word is a `breast_excision` margin part when it says breast or mammary itself, or when the case does (prefix, history or another part). A frozen section margin (frozen, FS, intraoperative) stays with the frozen form; before, the role took "Superior margin, FS" in a breast case. A side and a direction with no breast anywhere ("Left superior margin") stays Generic: in the exports fewer than one in ten such lines was a breast margin.
- Fills (`presetValues`, however the part reached the form): "Specimen as received" is the line as written. The side is the line's own, including Lt / Rt and a bare L / R on a margin line ("Superior margin (L … lumpectomy)"), else the case's (main breast part, prefix, history), else Not stated, never the form default. The margin is one of the six when the words before "margin" name exactly one (sup, inf, med, lat, ant and post included; "posterior (deep)" is Posterior), else Other with the name as written less side, breast, sequence and procedure words ("superomedial", "deep", "nipple"), else Other unnamed. A lesion line also fills the specimen as received and takes the case's side when it names none.
- In the form: typing the specimen as received sets the part type, side and margin it names (the generator `derive` hook, now also run from text fields, updating the controls in place); switching a part to another template pre-fills it from its pasted line, or a Generic part's typed specimen, instead of resetting it; Checks flag a side or margin that disagrees with the line, a shave margin with no side and a margin with no name. The form's default side is Not stated (schema 2026.10).
- Routed with no clinical history, as the exports carry none, against the previous build: every part whose route changed is a breast margin, now on the margin part and confident. Five-year biopsy file: 106 of 15,098 site-line parts (96 from a Generic choice, 10 from a close call on the excision form) and 90 of 15,452 diagnosis heads. 2024-2026 export: 59 of 6,384 site-line parts (54 from a Generic choice) and 20 of 5,172 heads. Frozen section file: 15 of 598 site lines, none naming a frozen section. The breast lines left off the margin part are frozen section margins, lesion excisions that name their margins, and lines without the word margin.
- No intake fixture change. Tests: the breast margin section of tests/intake.test.js and the derive and checks sections of tests/breastbenign.test.js; browser QA "breast margins".

## Skin excision site (reported defect, fixed 2026-10-23)

- The lab writes a skin part as two pieces, the site and often the lesion: "Skin, Right thigh", "Skin, left cheek BCC". Skin excision filled Site only from the detail of a three-piece line ("Skin, back, shave"), and a two-piece line has none, so Site opened blank although the site was on the specimen line (user: "the 'site' isnt automatically populated despite it being in the 'specimen' section"). On the skin lines of the two exports (609 parts counted per export: 473 in the five-year biopsy file, 136 in the 2024-2026 export), Site opened blank on every one. Most of them (541) route to Generic and are switched to the form by hand; switching re-runs the fill on the carried line (`setPartTemplate`, `prefillFromLine`), so the fix covers both paths.
- Fill now (`schemas/skin_excision.json`, schema 2026.10): `{ from: 'detail', fallback: 'text', strip, lower: true }`. With no detail the whole line is used. `strip` works on each comma piece: it removes the word skin and the procedure words (excision, shave, punch, curettings, biopsy, debrided); it cuts from the first size, question mark, lesion or diagnosis word to the end of the piece (lesion, nodule, cyst, papilloma, naevus, SK, BCC, SCC, DFSP, any word ending in -oma or -itis except stoma, ulcer, scar, rash, abscess, perilesional, the stitch and the like), so "Left anterior shin lesion, stitch at proximal" gives "left anterior shin"; and it blanks a piece that is only a margin name ("Skin margin A", "Deep margin", "further superior resection margin"), keeping an eyelid, lid, anal or costal margin, which are sites. A piece left empty is dropped.
- `lower` (new option in `applyFill`): the value prints mid-heading ("SKIN, right thigh nodule, excision"), so a first word typed with a capital opens in lower case ("Right thigh", "RIght alar"); a short form in capitals keeps its case ("L leg", "RLL", "LLL"). A line typed all in capitals stays as typed.
- Measured: 590 of 609 parts now open with a site, and every one of the 407 distinct lines was read. The other 19 name no site ("Skin", "Skin lesion", a margin alone, "debrided tissue") and stay blank; the field has no default, so no site is guessed.
- Routing unchanged: against the previous build, none of the 13,884 site lines in the two exports changes route. No intake fixture change.
- Not changed: the clinical label still defaults to "nodule" on an excision; Skin cyst and Skin SCC still fill their site from the detail only (since changed: next section).
- Tests: tests/skin_excision_site.test.js.

## Skin cyst and Skin SCC site (user request, built 2026-10-23)

- The user asked for the same fix on two more forms ("Apply the same site fix to Skin cyst and Skin SCC"). Both filled Site only from the detail of a three-piece line, so a cyst line ("Skin, Left groin sebaceous cyst", "left neck trichilemmal cyst") or an SCC line ("Left cheek SCC, stitch at 12 oc") opened with Site blank. On the cyst and SCC lines of the two exports (Skin cyst 208 parts: 164 in the five-year biopsy file, 44 in the 2024-2026 export; Skin SCC 11 parts), Site opened blank on every one. Most route to Generic and are switched to the form by hand; the fill runs on both paths.
- Fill now (`schemas/skin_cyst.json`, schema 2026.09 to 2026.10; `schemas/skin_scc.json`, schema 2026.10): the Skin excision rule, `{ from: 'detail', fallback: 'text', strip, dedupe: true, lower: true }`. The three skin forms carry one identical strip; a test keeps them the same.
- `strip` additions, measured on all three sets: a lesion word that opens a piece is dropped with a following at, over, on, of, from or in ("sebaceous cyst left forehead" gives "left forehead", "sebaceous cyst at suprapubic region" gives "suprapubic region"), but not when a wall, contents, lining, excision or biopsy word follows ("cyst wall biopsy" stays blank); a margin on a named site blanks like any other margin piece ("deep resection margin on cheek"); new cut words: sebaceous as misspelt ("sebaceosu"), trichilemmal, dermoid, cutaneous, and "short long" before a stitch.
- `dedupe` (new option in `applyFill`): a piece the same as an earlier one, in any case, is dropped, because the LIS often lists the site twice ("Right back sebaceous cyst, Right back" gives "right back"). It is set on the three skin rules only. Put in the shared strip step instead, it would also have changed 10 parts on four other forms (oral biopsy, cervical biopsy, bone and joint, oral carcinoma), which were not asked for.
- Measured: Skin cyst 205 of 208 parts now open with a site, and every one of the 142 distinct lines was read; the rest ("cyst wall biopsy", a pelvic cyst wall, a margin) stay blank. Skin SCC 11 of 11. The cyst set also takes cyst lines that route to Generic, Skin excision or Abscess, so it includes some cysts that are not skin (nasopharyngeal, thyroglossal); they get a site only if switched to Skin cyst by hand. Skin excision is unchanged: its 609 parts open with the same Site as before (590 filled).
- Against the previous build, over the 21,482 parts on the 13,884 site lines of the two exports: none changes route, and the prefill changes only on parts routed to Skin cyst (38) and Skin SCC. No intake fixture change.
- Printed: Skin cyst reads the site before the clinical label ("Skin, left groin seb cyst, excision"); Skin SCC reads "Skin, left cheek, excision", and with no site on the line it still prints the tumour site and laterality.
- Not changed: a line typed all in capitals stays as typed; two different sites on one line are both kept.
- Tests: tests/skin_cyst_scc_site.test.js.

## Uterus attached adnexa, leiomyoma assessment and benign tube and ovary (user request, built 2026-10-23)

- The user asked for attached tubes and ovaries on the benign uterus form, no leiomyoma by default, a fuller leiomyoma assessment, and a benign salpingectomy / salpingo-oophorectomy form with p53 signature and STIC.
- Uterus form (`schemas/uterus_benign.json`, schema 2026.10): `attachedAdnexa` (None, Bilateral tubes and ovaries, Bilateral tubes, Left tube and ovary, Right tube and ovary) on a total or subtotal hysterectomy part; it fills from the line ("Uterus, cervix, left tube and ovary", "Uterus, subtotal hysterectomy and right salpingo-oophorectomy"). The leiomyoma opens Absent; a myomectomy opens it Present (linked default), and fibroid, leiomyoma or myoma words in the line or history fill it Present.
- New form `adnexa_benign` (Gynae, benign resection, menu "Tube and ovary", after Ovarian cyst). Site words: tube and ovary in either order, with and, & or +, in the singular or plural; salpingo-oophorectomy; adnexa; BSO, RRSO. `exclude` keeps the uterus, cysts, masses, tumours, carcinoma, borderline and metastatic lines, ectopic pregnancy, frozen section, torsion, abscess, endometrioma, dermoid, teratoma, cystadenoma, fibroma, omentum and peritoneum on their own forms. `gate` (line and history): a cancer, tumour, mass or cyst word takes the form out unless risk-reducing, prophylactic, BRCA, Lynch or RRSO is also written.
- Fills: the side (bilateral words, both sides named, Lt / Rt, a bare L or R before the organ, an unsided RRSO as bilateral); the indication, Risk-reducing from risk-reducing, prophylactic, RRSO, BRCA or Lynch in the line or history, Opportunistic from the line or history; SEE-FIM sampling from the line. SEE-FIM also follows a risk-reducing indication. A line naming no side leaves the side blank and the report names none.
- Routed with no clinical history, as the exports carry none, against the previous build. Of the 21,482 parts on the 13,884 site lines of the two exports, 99 change route, every one a tube-and-ovary line moving from a Generic choice to the new form, confident: 79 in the five-year biopsy file and 20 in the LIS export. On unchanged routes the prefill changes only on the uterus form: 20 parts now open with the leiomyoma recorded (fibroid and myoma lines), and fewer than 10 carry the attached adnexa beside their TAH-BSO name, which prints the same.
- Not changed: tube-only lines (salpingectomy, paratubal cyst, sterilisation) keep the uterus form's tube parts, which now take the same tube lesions; uterus lines naming the tubes and ovaries with no procedure word (27 parts) still open Generic as before.
- Intake fixture change (deliberate): "fallopian tube only (benign batch 2)" now expects its left ovary and fallopian tube (D) on `adnexa_benign`, confident, with the side Left; the tube-only parts (A-C) keep the uterus form.
- Tests: tests/adnexa_benign.test.js and the Phase 74 sections of tests/uterus.test.js; browser QA "tube and ovary".

## PitNET form and CNS hand-off (user request, built 2026-10-23)

- The user found that a PitNET on the Glioma resection form printed the glioma microscopy and stains and offered no pituitary stains, and asked for the QMH Pituitary NET template, as its own form if it did not fit the CNS one.
- New form `pituitary_net` (Endocrine, cancer resection, menu "PitNET"; retires the placeholder) in the QMH Endocrine-PitNET order, with the tumour histology paragraph moved after the tumour type and carrying the reticulin, PAS and immunohistochemistry (house preference). Sources and the departures are in `docs/reference/pitnet-sources.md`; the saved page is `docs/reference/Endocrine-PitNET.html` with the text dump `docs/reference/qmh/pitnet.txt`.
- Site words: pituitary, pituitary gland, pituitary fossa, sella, sellar, intrasellar, pituitary adenoma, macroadenoma, microadenoma, PitNET; `bare` lets a site-only line ("Pituitary, Pituitary tumour") open it. `exclude` keeps frozen section and intraoperative lines, cysts, Rathke's cleft, craniopharyngioma, hypophysitis, tuberculum sellae, meningioma, smear and squash lines on their forms. "sellar" does not match inside "suprasellar", so suprasellar lines stay on the Brain biopsy form.
- Fill: the procedure from the line (transcranial, craniotomy or craniectomy gives Transcranial resection; transsphenoidal, TSS, endoscopic or endonasal gives Transsphenoidal resection, which is also the default).
- Routed with no clinical history, as the exports carry none, against the previous build. Of the 21,482 parts on the 13,884 site lines of the two exports, 10 change route, every one a pituitary line moving from Generic to the new form, confident (fewer than 10 in each export). A misspelt pituitary line and a tuberculum sellae line stay on Generic; the suprasellar lines stay on the Brain biopsy form.
- Glioma form (`cns_tumour`): PitNET stays in the sellar list so saved cases still open; it reads "Pituitary neuroendocrine tumour (PitNET): use the PitNET form" and raises a warning on the entity field. Its wording and fixtures are unchanged; the Brain biopsy form's PitNET (smear and small biopsy) is unchanged.
- Not changed: the frozen section CNS and pituitary scenarios; the Glioma form's glioblastoma defaults for other non-glioma entities, offered as a Later line.
- Deliberate test changes: the picker's QMH placeholder floor drops to 45 and the packed-form count rises to 31, each with its reason in the test. New fixtures `tests/fixtures/pituitary_net/01-04`.
- Tests: tests/pituitary_net.test.js; browser QA "PitNET".

## Sentinel node staging criteria (user request, built 2026-10-23)

- Lymph node excision gains staging criteria (Not applied / Breast carcinoma / Melanoma). A sentinel line (`sentinel`, `SLN`) always carries them: melanoma anywhere in the request gives Melanoma; a breast or axillary line gives Breast; a pelvic, groin or neck line gives Not applied; then the other lines of the request and the history (a breast operation, or a uterine, adnexal, vulval, oral or penile one); otherwise Breast. Full rules and wording: `docs/specs/sentinel-node.md`.
- Measured on both exports (aggregate): 179 sentinel lines open the Lymph node form, 150 on Breast and 29 on Not applied; no line names melanoma. Routes are unchanged across all 21,482 parts.
- Tests: tests/lymphnode_sln.test.js; tests/frozen_sln_criteria.test.js; browser QA "sentinel node".

## Vulval carcinoma resection (user request, built 2026-10-23)

- New form `vulval_carcinoma` (Gynae, cancer resection, menu "Vulva Ca"; retires the placeholder) in the QMH GYN-Vulva order, staged on AJCC version 9 at the user's choice (the QMH page prints the AJCC 8th edition). Sources and the departures are in `docs/reference/vulva-sources.md`; the saved page is `docs/reference/GYN-Vulva.html`.
- Site words: vulva, vulval, vulvar, labium majus or minus, labia majora or minora, clitoris, clitoral, Bartholin, vulvectomy, hemivulvectomy. The gate needs carcinoma in the line or the history (SCC, carcinoma, cancer, ca, malignancy), or a radical vulvectomy or radical local excision, which opens the form on its own. `not` keeps condyloma and wart lines off; `exclude` keeps cervix, uterus, hysterectomy, penile, scrotal, perianal and anal canal lines, and cysts, abscesses, skin tags, lipomas and hidradenitis, on their forms.
- So a vulval wide local excision, partial or simple vulvectomy opens the form only with carcinoma in the line or the history, and stays on Generic otherwise, as before; vulval biopsies stay on the Cervix / vagina / vulva biopsy form; a Bartholin cyst stays on Generic.
- Fill: the procedure from the line (radical vulvectomy or hemivulvectomy; total or simple vulvectomy; partial vulvectomy or hemivulvectomy; wide local excision, WLE or radical local excision gives Wide excision; else Local excision); the tumour site from the line (labium majus, labium minus, Bartholin gland, clitoris; a multiselect fill takes every match, in map order); the side from the line; the specimen line with the site and procedure words stripped.
- Groin lines: see `docs/specs/sentinel-node.md` (Vulval carcinoma criteria). Pelvic lines stay Not applied.
- Routed with no clinical history, as the exports carry none, against the previous build: no part changes route across all 21,482 parts. The exports hold no vulvectomy or vulval excision line; their vulval lines (biopsies and others) keep the biopsy form or Generic.
- Deliberate test changes: the picker's QMH placeholder floor drops to 44; the packed-form count rises to 32; the Gynae browse list gains Vulva Ca; typing "vulva" now lists Vulva Ca first and the biopsy form second ("vulval", "VIN", "dVIN" and "lichen sclerosus" still lead to the biopsy form); the Lymph node excision criteria options gain Vulva. New fixtures `tests/fixtures/vulval_carcinoma/01-03` and `tests/fixtures/lymph_node_sln/06-vulva-groin-sentinel`.
- Tests: tests/vulval_carcinoma.test.js; tests/staging_vulva.test.js; tests/lymphnode_sln.test.js; browser QA "vulval carcinoma".
