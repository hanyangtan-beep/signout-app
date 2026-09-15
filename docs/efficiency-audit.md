# Sign-out app — efficiency audit

*Measured against commit `154835a` (Phase 19) on 2026-09-15. Every number below was produced by running against the working tree; nothing is estimated unless the text says so. Checks that found nothing are recorded in section 8 so they are not repeated.*

Baseline state: 54 built templates, 64 planned placeholders, 1739 field definitions, 896 tests passing in 8.5 s, `npm run build` in 2.3 s, `dist/` 20 MB of which 17 MB is reference imagery, initial page weight 332 kB.

---

## 1. Build order does not follow measured case volume

The case-mix analysis of the Drive folder (`docs/case-mix-analysis.md`, 600 documents, 2020-08 to 2026-07) is the only volume evidence the project has, and the roadmap is not ordered by it.

| Specimen type | Docs | Share | Template state |
|---|---|---|---|
| Oral cavity / oropharynx | 30 | 5.0 % | Later (H&N placeholders) |
| Liver resection | 22 | 3.7 % | `liver_benign` only; no hepatectomy or HCC |
| Kidney | 11 | 1.8 % | none, Later |
| Gallbladder | 20 | 3.3 % | benign built; carcinoma in **Next** |
| Appendix | 11 | 1.8 % | benign built; carcinoma in **Next** |

The two cards sitting in Next cover 31 documents between them, 7 of which reached microscopy. The three highest-volume uncovered specimens cover 63 documents, 10.5 % of the corpus, and are all parked in Later. The Next ordering is defensible on engineering grounds (both pairs consume the already-built linked-part engine and retire a placeholder), but it was not chosen against volume, and no mechanism exists to notice when the case mix shifts.

**Cost.** Each synoptic template is roughly 2 000–3 500 hand-curated lines (`lung_carcinoma` 954 schema + 663 generator + ~585 test; `breast_carcinoma` 1888 + 441 + ~1139). Building 64 planned templates at that rate is the single largest remaining commitment in the project, so the order they are built in dominates how much value lands per unit of work.

## 2. The grossing path carries the most real work and the least tooling

63 % of the 600 documents (379) stop after the macroscopic description and block key — they never reach microscopy or a diagnosis line. Only 24 % contain synoptic or staging vocabulary. The app's heaviest investment is aimed at the 24 %.

`macroExtract` — the mechanism that reads a pasted LIS macroscopic description and pre-fills weight, dimensions, tumour size, depth, block count — is opted into by **32 of 54** templates. The 22 without it, by field count:

`frozen_section` (69), `breast_biopsy` (55), `aortic_valve_aorta` (34), `lung_biopsy` (32), `cervical_excision` (25), `endometrial_biopsy` (20), `colonic_polyp` (20), `turbt` (19), `thyroid_fna` (19), `salivary_fna` (19), `prostate_biopsy` (19), `oesophageal_biopsy` (19), `lymph_node_fna` (18), `duodenal_biopsy` (18), `cervical_biopsy` (18), `urine_cytology` (15), `gastric_biopsy` (15), `effusion_cytology` (15), `nasopharyngeal_biopsy` (13), `cervical_cytology` (11), `ibd_biopsy` (10), `generic` (4).

`frozen_section` and `breast_biopsy` are the two largest templates in the app by field count after the synoptics, and both make the user type every measurement by hand.

## 3. Three quarters of version-control churn is build output

`.gitignore` lists `node_modules/`, `dist/` and `analysis/`, but all three were committed before it was written, so they remain tracked. Ignoring a path does not untrack it.

| Path | Tracked files | Share of all file-changes in 152 commits |
|---|---|---|
| `node_modules/` | 1 806 | 37.5 % |
| `dist/` | 233 | 23.1 % |
| `analysis/` | 635 | 13.2 % |
| **subtotal** | **2 674** | **73.8 %** |
| all source (src, generators, schemas, tests, docs, assets) | 537 | 26.2 % |

68 of 152 commits touch `dist/`. `.git` is 49 MB. The Phase 19 archive shared in chat is 33.7 MB and 3 211 files; a source-only archive of the same commit is 18.1 MB and 537 files — 46 % smaller, 83 % fewer files. Because `git add -A` restages the whole rebuilt `dist/` every batch, the average commit touches 31.7 files, which makes `git diff` useless as a review surface and hides real changes among build noise.

## 4. Field and generator code is copy-pasted, and the copies have drifted

1 739 field definitions across 54 schemas reduce to 1 368 distinct `(id, options, label)` signatures — **371 redundant copies**, 528 definitions in total that share a signature with at least one other template. There is no shared field library; `generators/breast_shared.js` is the only shared module and it is family-specific.

Verbatim copy-paste across generators, measured as identical six-line blocks:

- the validator preamble (`const at = …; const err = …; const warn = …`) in **11** generators
- `blockKey()` — the LIS block-key parser, regex and all — in **7** generators
- 28 distinct six-line blocks appear in three or more generators

The copies have already drifted, which is the part that costs the user rather than the maintainer. The same field id renders under different labels depending on which template is open:

| Field id | Label A | Label B |
|---|---|---|
| `additionalNotes` | "Additional microscopy" (30 templates) | "Additional notes" (12) |
| `blocks` | "Blocks" (13) | "Number of blocks" (5) |
| `specimenName` | "Site" (7) | "Specimen as received" (6) |

## 5. No linter, and the defects it would catch are already present

`devDependencies` is `jsdom` alone. There is no ESLint, Prettier, Biome or JSHint configuration.

Confirmed defect, `src/config.js:25`:

```js
return { ...DEFAULTS, ...saved };    return { ...DEFAULTS, ...saved };
```

The second statement is unreachable. It is harmless at runtime, which is exactly why it survived. The stray `null` rendered under the case options and fixed in Phase 19 was the same class of defect — a two-second lint catch that instead consumed a browser QA cycle to find.

## 6. Verification is fast where it is automated and slow where it is not

`npm test` runs 896 tests in 8.5 s. `npm run build` takes 2.3 s. Neither is a bottleneck.

Browser QA is. There is no Playwright or Chromium script anywhere in the repo, and no test uses jsdom to exercise the UI — `jsdom` exists only for legacy fixture capture in `tools/capture-fixtures.cjs`. Every batch therefore re-derives the same interaction steps by hand: which selector holds the specimen paste box, that parts must be parenthesised, that grading fields stay hidden until the diagnosis is set, that a reference panel only exists once its toggle is on. That knowledge currently lives in conversation context and is lost at every compaction.

Golden fixtures exist for 9 template families (`breast_ca`, `breast_dcis`, `colonic`, `cytology`, `endometrium`, `gastric`, `lung`, `ovary`, `phyllodes`) plus intake, macro and QMH import. The other 45 templates are covered by inline assertions in their own test file, which is real coverage but does not pin the whole rendered report the way a fixture does.

## 7. Per-template build scripts are bespoke and split across two languages

`scripts/` holds `build-breast-carcinoma-schema.mjs`, `build-breast-dcis-schema.mjs`, `build-breast-schema.mjs`, `build-phyllodes-schema.mjs`, `gen-endometrium-schema.py`, `gen-cytology-schemas.py`, `gen-prostate-reference.py` — one-off builders per template family, in a mix of Node and Python. Nothing is shared between them, so each new template writes a new builder from scratch. `tools/import-qmh.js` produces only a draft by design, and the curation from draft to shipped schema is the expensive part that has no scaffold at all.

## 8. Checked and found clean

Recorded so these are not re-investigated:

- **Dead fields.** An initial pass flagged 12 fields as unreferenced. All 12 were false positives — the breast DISH/HER2 group is consumed by the shared `generators/breast_biomarkers.js`, and `multiplePrimaries` / `recurrent` are read by the staging modules. **Zero confirmed dead fields out of 1 739.**
- **Unused dependency.** `jsdom` is genuinely used by `tools/capture-fixtures.cjs`.
- **Bundle loading.** `src/registry.js` already lazy-loads each schema and generator by dynamic import from a metadata-only manifest. Initial page weight is 332 kB against a 20 MB `dist/`; adding templates does not grow first load.
- **Test and build speed.** 8.5 s and 2.3 s. Not worth optimising.

---

# Agentic workflows

Ordered by measured value, not by ease.

## A. Case-mix re-ranking cron — fixes §1

**Cadence:** monthly, first Monday, 07:00 HKT.

A scheduled task re-runs the Drive folder analysis that produced `docs/case-mix-analysis.md`, recomputes the specimen-type table over the trailing 12 months rather than the full 6-year corpus, and diffs it against the previous run. It then cross-references the counts against `templates/manifest.json` and `templates/planned.json` and emits a single ranked list: uncovered specimen types by volume, covered-but-thin types (benign template exists, cancer path does not), and templates built but never used. Output is a short notification plus a `docs/case-mix-<date>.md` commit — it proposes a Next ordering and never reorders the roadmap itself.

**Why a cron rather than a one-off:** the analysis is already six days stale by construction and the mix shifts with rotations. Re-deriving it by hand costs a full session; on a schedule it costs nothing and arrives before you plan a batch.

**First run should answer:** whether oral cavity, liver resection and kidney really are the top three gaps on recent volume, or whether the 6-year corpus is skewing them.

## B. Template factory — fixes §1's unit cost and §7

Replace the bespoke per-template builder with one scaffold plus one delegated research brief.

1. `scripts/new-template.mjs <id> --system <S> --kind <K> --qmh <page>` writes the schema skeleton, generator stub with the shared imports, a test file with the standard assertions, a fixture directory and the manifest entry, and runs `tools/import-qmh.js` into the schema draft.
2. A research subagent, briefed with the roadmap card and the QMH page, fills the histology prose and the criteria sources, and returns a report where every morphology sentence carries the URL it came from. This is already the pattern that produced the breast, lung, ovary and gallbladder morphology source docs — it just is not wired to the scaffold.
3. The main agent curates draft → house wording, runs `npm test`, and ships.

**Value:** the 64 planned templates are the dominant remaining cost. Cutting the boilerplate share of each build is worth more than any runtime optimisation in this repo.

**Guardrail:** the scaffold must refuse to overwrite an existing schema, and the subagent's prose must pass the report-register rule — no WHO citations, no exclusion logic, no prognostic commentary in printed sentences; grounding lives in code comments and the source doc.

## C. Shared field library refactor — fixes §4

A single bounded refactor, safe because the 896 tests and the golden fixtures pin the output.

1. Extract the 371 redundant definitions into `schemas/_fields.json` keyed by id, with a `$use` reference in each template schema and per-template overrides where a field genuinely differs.
2. Extract the validator preamble and `blockKey()` into `generators/_shared.js` and codemod the 11 and 7 call sites.
3. Resolve the three drifted labels to one form each — the majority form unless you prefer otherwise: "Additional microscopy", "Blocks", and `specimenName` split into two genuinely different ids since "Site" and "Specimen as received" are not the same question.

**Acceptance:** `npm test` stays at 896 pass, and `git diff tests/fixtures` is empty. If any fixture moves, the refactor changed output and must be reverted or the change deliberately justified — the standing fixture rule.

**Sequencing:** do this **before** the template factory, so the scaffold generates against the shared library instead of minting a 55th copy of `additionalNotes`.

## D. macroExtract coverage sweep and grossing mode — fixes §2

Two parts, the second larger than the first.

1. **Sweep.** One agent pass over the 22 templates without `macroExtract`, adding the map for the measurements each template actually asks for, with a test per template asserting a realistic pasted macro fills the expected fields. `frozen_section` (69 fields) and `breast_biopsy` (55) first.
2. **Grossing mode.** A macro-first case mode that matches how 63 % of the corpus is actually used: paste the specimen list, build parts, fill macro, generate the macroscopic description and block key, save the draft to Drive, and stop — without rendering the histology fields at all. The engine already supports `options.macro === false` for the inverse case, and `layout.macroGroups` already splits macro fields into their own column, so this is a mode switch over existing machinery rather than new engine work.

**Value:** this is the largest daily-time lever in the audit. It targets the two thirds of cases that never reach a diagnosis line, and it is currently unserved.

## E. Release workflow — fixes §3

One cleanup then one script.

1. `git rm -r --cached node_modules dist analysis` in a single commit. History keeps the blobs (`.git` stays 49 MB unless rewritten, which is not worth it), but every future commit is source-only and `git diff` becomes readable again.
2. `npm run release` → build, test, deploy, publish, then `git archive` a source-only zip. Archives drop from 33.7 MB / 3 211 files to 18.1 MB / 537 files, and the remaining 18 MB is the reference imagery, which is genuine source.

**Caveat:** `dist/` is currently tracked, so anything downstream that reads `dist/` straight from the repo rather than from a build must be checked before untracking. `deploy_website` reads the working tree, not git, so the deploy path is unaffected.

## F. Verification harness — fixes §5 and §6

1. **Lint.** Add ESLint with a minimal config, `npm run lint` wired into `npm run verify` alongside `npm test`. Fix `src/config.js:25` in the same commit.
2. **Committed browser QA.** A `tests/browser/smoke.mjs` Playwright script holding the interaction knowledge that currently lives in conversation context: paste a specimen list with parenthesised parts, build parts, set the diagnosis, open a reference panel, copy the report, check for console errors and for text overflow at 1300 px and 390 px. Run it per batch instead of re-deriving the steps.
3. **Fixture coverage.** Extend golden fixtures beyond the 9 families to the highest-volume templates without one, so a shared-library refactor is pinned across the whole app rather than a fifth of it.

**Value:** turns the only slow, unrepeatable part of the loop into a 30-second command, and stops the class of defect that Phase 19 spent a browser cycle finding.

---

## Suggested order

E → F → C → D → B, with A running in the background from the start.

E and F are small and make everything after them safer and quieter. C must precede B or the factory multiplies the duplication. D is the biggest user-facing win and should not wait for B. A is a cron — start it now and let the first two runs land before the next roadmap re-plan.

## Answered 2026-09-15

1. **Build order follows measured volume.** Superseded by the LIS export of 4547 cases (`docs/case-mix-2026-09.md`), which is a better basis than the Drive document folder. Next has been reordered against it. The appendix and gallbladder question fell away — both pairs had already shipped in Phase 12 and 13 and their cards were stale entries in Next; they have been removed.
2. **No macro-only grossing mode.** Section 2's second proposal is withdrawn. The `macroExtract` sweep across the 22 templates without it stands on its own and remains the recommendation.
3. **`specimenName` is one question with an inconsistent label.** Resolve to a single label in the shared field library (workflow C, step 3) rather than splitting the id. "Site" (7 templates) and "Specimen as received" (6) collapse to one definition; the 13 affected templates change label text only, so no fixture should move. If any does, the field was carrying more than a label difference and the merge needs re-examining.

---

# Implementation log

Worked in the order recommended above: E → F → C → D → B, with A last.

## E — Release workflow (done, 2026-09-15)

**Untracked the build artefacts.** `node_modules/`, `dist/` and `analysis/` were listed in `.gitignore` but had been committed before it was written, so all three stayed tracked. `git rm -r --cached` on the three of them took the repo from **3211 tracked files to 549**. The source archive is now 3.4 MB against the 33.7 MB the phase zips were carrying.

One thing had to be rescued first. The element-order tests in the synoptic suites name `analysis/qmh/*.txt` as the page they check against, and `analysis/` is ignored — so the provenance for "the QMH order is sacred" lived only on this machine and a fresh clone could not verify the claim. The five text dumps (`breast`, `dcis`, `phyllodes`, `lung`, `ovary`) moved to **`docs/reference/qmh/`** and are tracked, with a README explaining what they are. Every reference in the specs, tests and `tools/import-qmh.js` now points there. The draft JSON that `import-qmh.js` emits stays in `analysis/` — it is genuinely scratch.

**Added `npm run release`** (`tools/release.js`). Seven gates, each one runs even when an earlier one fails so a single run tells you everything that is wrong:

| Gate | Checks |
|---|---|
| lint | `eslint .`, fails on errors, passes on warnings |
| tests | `node --test tests/`, fails on any failure |
| fixtures clean | **`git diff tests/fixtures` must be empty** — an uncommitted golden-fixture change stops the release |
| browser QA | `tools/qa-browser.js`, 12 checks in real Chromium |
| build | `tools/build.js` |
| artefacts untracked | `git ls-files node_modules dist analysis` must be empty, so this cannot silently regress |
| source archive | `git archive HEAD` → `analysis/signout-app-<sha>.zip`, reports size and file count |

The archive uses `git archive`, not the working directory, so it can only ever contain tracked files. That is what made the phase zips 6× too big.

## F — Verification harness (done, 2026-09-15)

**A linter, finally.** ESLint 9 flat config (`eslint.config.js`), correctness rules only — no formatting rules at all, so a lint run never rewrites a line and never touches a diff. It covers `src/`, `generators/`, `templates/`, `tools/`, `tests/` and `legacy/`: 177 files.

First run found **29 real problems that 896 passing tests could not see**:

- **`src/config.js:25` — the duplicated `return`.** `return { ...DEFAULTS, ...saved };    return { ...DEFAULTS, ...saved };` on one line. Harmless, but it had survived every phase.
- **17 dead declarations**, all removed: `listJoin` (appendix, ovary), `fmt` (breastbenign, lymphnode), `isTis` (appendix_carcinoma, gallbladder_carcinoma), `na` and `isCisOrNone` (gastric_carcinoma), `lowGrade` (lung_morphology), `isBenign` (nasopharyngeal), `int` (ovary_ft_peritoneum), `num` (staging/gastric, staging/oesophagus), `T_DEFAULT` (staging/gastric), and `plural` / `headParts` / `parseMargins` imported but never used (breast_carcinoma, breast_dcis, phyllodes).
- **`tFromExtension` in `src/staging/gastric.js` ended `return o ? null : null;`** — a ternary returning the same value on both branches. Simplified to `return null;`. No behaviour change, but it reads as though a case was meant to go there.
- 11 `(m = s.match(/re/)) ? … : …` captures inside template literals. All read, all deliberate; the rule is a warning with that noted in the config so a genuine `if (x = 1)` typo would still show.

**Finding, not fixed — GIST molecular sentences are written but never printed.** `generators/gist_resection.js` carried an eleven-entry `MOLECULAR_PHRASE` table of full sentences ("Molecular analysis shows a KIT exon 11 mutation."). Nothing referenced it. What the template actually prints is `molecularValue()`, a bare value in the synoptic row — so a GIST report states the mutation as a row entry but the microscopy paragraph carries no molecular sentence, against the house rule that IHC and molecular belong in that paragraph. The dead table is removed; **wiring the sentence in would change released wording, so it is left for you to decide.**

**Committed browser QA** (`tools/qa-browser.js`, `npm run qa`). Headless Chromium over a local static server, 12 assertions — not screenshots to eyeball:

1. app boots with no module or runtime error
2. palette opens and lists 54 templates
3. palette search narrows to a known template
4. choosing a template renders its fields
5. the example case produces a report with all of SPECIMENS / MICROSCOPIC EXAMINATION / DIAGNOSIS
6. house wording: no "color", no "tumor", no `undefined` / `NaN` / `[object Object]` in the output
7. LIS specimen paste → intake preview → 3 rows, 3 confident matches → **Build parts** → tabs A B C
8. prose microscopy opens with "Sections show"
9. settings dialog holds all four Drive fields
10. theme toggle flips the document theme
11. **Copy full report** puts plain text on the clipboard with no HTML markup
12. no console error accumulated across the whole run

Writing it turned up two things about the app worth recording, both of which had been rediscovered by hand every QA session: **Example / New case / Open are inside the Case dropdown**, not clickable inline (the inline buttons are 0×0 at desktop width), and **multi-part specimen text does not auto-build parts** — it fills the intake preview and waits for `#btn-build-parts`. A newly written test that assumed otherwise failed correctly.

`npm run qa` needs `npx playwright install chromium --only-shell` once on a fresh checkout.
