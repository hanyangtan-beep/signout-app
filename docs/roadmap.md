# Sign-out App — Roadmap

Companion to "Sign-out App — Design Suggestions". Phases are sequential; each ends with a usable app so you can sign out real cases from Phase 1 onward. Effort estimates assume evening/weekend work with AI-assisted coding.

---

## Phase 0 — Foundations (1 weekend)

**Goal:** a repo, a test harness, and a frozen record of current behaviour before anything is refactored.

- Create repo `signout-app/` with `schemas/`, `generators/`, `snippets/`, `tests/fixtures/`, `src/`.
- Copy gastric-biopsy-signout-v8.html and colonic-polyp-signout.html into `legacy/`.
- Capture golden fixtures: for each app, 5–8 input states (normal, H. pylori gastritis with IM, HGD adenoma, 10-part polyp case, etc.) → exact microscopy and diagnosis text output.
- Node test runner (`node --test`) that will later assert the new engine reproduces these byte-for-byte.
- Hosting: built and published inside Perplexity to a private `pplx.app` URL (static app, no PHI in the code; all case data lives in Drive). No GitHub, no Mac mini.
- The Google Cloud OAuth client needs the final pplx.app origin, so it is created at the start of Phase 2, right after the first publish fixes the subdomain.

**Done when:** `npm test` runs the fixtures against the legacy generator functions and passes. ✅ Completed 2026-09-09 (16 fixtures, 18 tests, DOM cross-check).

---

## Phase 1 — Schema engine and parity (2–3 weeks)

**Goal:** one generic app that renders any schema and reproduces both legacy apps exactly.

- Define the schema format: `fields[]` (select / grade / checkbox / number / text), `default`, `showIf`, `group`; `generators` (microscopy, diagnosis, synoptic); `organ`, `specimenNoun`, `maxParts`.
- Write `schemas/gastric_biopsy.json` and `schemas/colonic_polyp.json` by extracting the v8 `parts[]` fields and the polyp app options.
- Port `buildMicroscopy()` / `buildDiagnosis()` into `generators/gastric.js` and `generators/colonic.js` as pure functions `(partValues, ctx) → string`.
- Generic renderer: part tabs A–J, field groups, live preview, Generate / Copy diagnosis / Copy report / Clear / Load example.
- Style layer: British spelling table, ASCII normalisation, capitalisation rules for diagnosis lines, paragraph joining.
- In-memory case state with `sessionStorage` cache when available (the in-thread preview blocks storage; the published site allows it).
- Deploy the in-thread preview for visual QA, then publish to `https://<subdomain>.pplx.app` (you pick the subdomain, e.g. `signout`). This fixes the origin needed for the OAuth client.

**Done when:** all Phase 0 fixtures pass through the new engine unchanged, and you sign out a week of gastric/polyp cases in it without falling back to the old apps. ✅ Engine, schemas, generic UI and in-thread preview completed 2026-09-09 (27 tests: 16 golden fixtures + 11 engine tests). Publishing to pplx.app happens when you choose the subdomain; the week of live use is yours to run.

---

## Phase 2 — Google Drive as the store (1–2 weeks)

**Goal:** Drive is the only persistence layer from the first real case onward, so everything is readable from Perplexity in a browser.

Code complete 2026-09-09 (33 tests; save → update → open round-trip verified against a mocked Google). Live use starts when the site is published and the OAuth client exists.

- [x] Google Identity Services token flow in the browser (`src/gauth.js`): `drive.file` + `spreadsheets` scopes, silent refresh, one 401 retry. The Docs API is not needed: the Doc is created and rewritten by uploading `text/plain` through the Drive API, which Google converts to a Doc.
- [x] Settings dialog (`src/config.js`): client id, folder id, sheet name and scope mode kept in localStorage, so the client id can be added after publishing without a rebuild.
- [x] `Sign-out cases` Sheet, created on first save: accession, updated, status, template, parts, doc_url, doc_id, `case_json`.
- [x] `saveCase` (`src/drive.js`): upsert the Sheet row by normalised accession; create or replace the Doc named by accession in "Pathology reports" with fixed headings CLINICAL HISTORY / SPECIMEN / MACROSCOPIC DESCRIPTION / BLOCK KEY / MICROSCOPIC EXAMINATION / DIAGNOSIS. If the Doc was deleted, it is recreated.
- [x] `openCase`: Open dialog lists Sheet rows (search by accession, newest first) and restores `case_json`.
- [x] Case details on every template: accession (normalised on blur), status draft / ready / signed, clinical history, macroscopic, block key. Cmd/Ctrl+S saves; the status bar shows Saved / Edited since save with a link to the Doc; closing the tab with unsaved edits prompts.
- [x] PHI guard (`src/docformat.js`): warns before saving on HKID-with-check-digit, honorific + name, phone number, or "DOB"; accession patterns and clinician names (Dr …) pass.
- [x] Published 2026-09-09 at `https://han-signout.pplx.app` (site id 50c90ba7-8e5b-49c2-8462-5db64121e8d4).
- [x] Google Cloud project `han-signout-app`: Drive + Sheets APIs, consent screen (External / Testing), test user, web client `Sign-out web` — done 2026-09-09.
- [x] Sign-in switched from the GIS pop-up to the OAuth implicit redirect flow (pplx.app's COOP header kills pop-ups); action resumes after the round trip.
- [x] First real save to Drive verified 2026-09-09 23:15 HKT (Sheet + Doc in "Pathology reports"). Troubleshooting table in docs/google-setup.md.
- [ ] One-time Google Cloud set-up following `docs/google-setup.md` (project, Drive + Sheets APIs, consent screen in Testing with you as test user, Web OAuth client with the pplx.app origin, paste the client id into Settings).
- [ ] First real save; if `drive.file` cannot place the Doc in the existing folder, switch Settings → Drive scope to `drive`.

**Done when:** the 09:00 TAT job scores an app-generated Doc as "complete" with no manual editing, a case reopened from the Sheet is identical to what was saved, and Perplexity can read both the Doc and the Sheet row when asked.

---

## Phase 3 — Case model and mixed parts (1–2 weeks)

**Goal:** a case is the unit of work, not a template.

- [x] Case object (2026-09-10): accession, clinical history, macro, block key, status, options and parts with per-part `templateId` — serialised as the `case_json` saved in Phase 2. Older rows without `templateId` fall back to the case `schemaId`. The Sheet's `template` column and the Doc footer record every template used (`gastric_biopsy+colonic_polyp`).
- [x] Per-part template picker (2026-09-10): each part panel has a template drop-down; the header template buttons start a new case while the case is untouched and switch the *active part* once it has been edited. `+ Part` inherits the active part's template; "Same as previous" copies the template too. Part tabs show the template on hover; the status line reads `Mixed: Gastric + Polyp · 3 parts`.
- [x] Case-level output assembly (2026-09-10): `engine.generateCase(registry, caseState)` runs each part through its own generator and style, keeps case order in every block, merges template options, and runs per-template hooks (`prepare`, `summary`) over that template's parts only — so a prostate SUMMARY counts prostate cores, not gastric parts. A generator's case-level `specimens` rewrite (gastric title parsing) is used only when the whole case is one template. Doc layout: accession → clinical → macro → block key → microscopy → diagnosis.
- [x] Single-part cases drop the part letters (2026-09-09): when a biopsy case has only one part, the specimen, microscopy and diagnosis lines are emitted without "(A)" (`STOMACH, antrum, biopsy - CHRONIC GASTRITIS…`). Letters appear automatically once a second part is added. Implemented in `engine.generate` (`dropPartLetters`) so every template inherits it, including gastric and polyp; the legacy golden fixtures pass `options.alwaysLetter` to keep their lettered form.
- [x] Engine extensions (2026-09-09): parts A–Z (`maxParts` per schema), `partDefaults` (per-position defaults, e.g. a 12-core prostate map or the TI → rectum series), `defaultParts`, a `number` field type, and a `generator.summary(parts, ctx)` hook appended after the diagnosis lines.
- [x] Prostate and IBD templates pulled forward from Phase 4 (see below).
- [x] "Same as previous part" copy; "Reset" returns a part to its template's normal/absent defaults, which serves as "all normal".
- [x] Case list view over the Sheet (Open dialog): status badge, template(s), part count, last update; search by accession. Filtering by status is still a wish-list item.
- [x] Keyboard model: number keys for options, Tab between fields, `Cmd+Enter` copies the full report (generation is live), `Cmd+Shift+C` copy diagnosis, `Cmd+S` save to Drive, `Alt+←/→` between parts.

**Done when:** a 3-part mixed OGD + colonoscopy case produces a single coherent report, saves to Drive, and reopens from another browser. Report assembly and round-trip through the Sheet row are covered by `tests/mixed.test.js`; a real Drive save of a mixed case is the remaining acceptance check.

---

## Phase 4 — Small-biopsy template expansion (3–4 weeks, one template per week)

**Goal:** cover the bulk of your daily GI/GU biopsy sign-out.

1. [x] **Prostate biopsy** (`schemas/prostate_biopsy.json`, `generators/prostate.js`, 2026-09-09) — up to 16 parts with a 12-core site map plus targets; per-part Benign / HGPIN / ASAP / Adenocarcinoma; Gleason patterns with automatic ISUP Grade Group, % pattern 4/5, minor pattern 5, cribriform, IDC-P, cores involved (clamped to cores in the part), linear extent, % tissue, PNI, EPE, LVI, adjacent HGPIN; case SUMMARY line (cores positive, highest grade, adverse features, ASAP / HGPIN parts) for multi-part cases. Benign microscopy uses sentence prose describing glands, fibromuscular stroma, epithelial and basal-cell layers, and absence of HGPIN or malignancy; the diagnosis is `NO EVIDENCE OF MALIGNANCY`. Snippets (ASAP repeat-biopsy comment) still to come.
2. [x] **IBD biopsy series** (`schemas/ibd_biopsy.json`, `generators/ibd.js`, 2026-09-09) — TI → rectum site defaults; villous architecture (ileal sites), crypt distortion, basal plasmacytosis, lamina propria chronic inflammation, activity (cryptitis / crypt abscesses / erosion-ulceration), granulomas (crypt-rupture vs non-crypt), Paneth / pyloric metaplasia, dysplasia; optional Nancy index per site; per-site line chosen from chronicity + activity (chronic active / chronic inactive / active without chronicity / non-specific increase / no significant abnormality, with ileitis / colitis / proctitis); SUMMARY describing extent, continuity, rectal involvement or sparing, ileal disease, granulomas, dysplasia, and whether the pattern favours UC or Crohn's. Dysplasia caveat snippet still to come.
3. **Duodenal biopsy** — Marsh–Oberhuber, IEL count, villous architecture, H. pylori, giardia, Brunner gland/peptic change.
4. **Oesophageal biopsy** — Barrett's with dysplasia grade, eosinophils/hpf, reflux, candida.
5. Port **endometrial** and **LEEP** apps into schemas (lower effort, mostly done).

Each template ships with fixtures, a "Load example", and its snippet set (H. pylori comment, IM surveillance, IBD dysplasia caveat, ASAP recommendation).

**Done when:** ≥80% of a typical week's small biopsies can be signed out in the app.

---

## Phase 4b — Generic benign templates from your case mix (3–4 weeks, two templates per week)

**Goal:** cover the formulaic benign resections that the QMH cancer templates do not touch. Priorities come from `docs/case-mix-analysis.md` (600 Docs in "Pathology reports", 2020-08 → 2026-07): two thirds of the folder are gross/block-key drafts, so these templates should carry a **macroscopic + block key** section as well as microscopy and diagnosis.

Ordered by document count × how formulaic the wording already is:

1. **Lymph node(s)** — stand-alone (25 docs) and as a part inside any case (~70 node parts); "NO EVIDENCE OF MALIGNANCY (x/y)" is the single most common diagnosis string (72 hits). Fields: site/station, number of nodes, result (negative / reactive / granulomatous / metastatic), x/y auto-count, largest deposit, extranodal extension, IHC used. Ships as a reusable *part type* so any case can add node parts.
2. **Placenta** (28 docs) — weight, trimester, singleton/twin + chorionicity, cord (length, diameter, insertion, vessels, funisitis), membranes (chorioamnionitis stage), villitis, infarcts, retroplacental haematoma, meconium, MVM/FVM; standard block key. Default dx "PLACENTA: - NO SIGNIFICANT PATHOLOGY."
3. **Breast cavity shave margins and benign excision** (~26 benign + margin parts in most of 93 breast docs) — per-margin part label, result (negative / fat necrosis / fibrocystic change / UDH / papilloma / fibroadenoma / ADH), calcification, completeness.
4. **Thyroid — benign hemithyroidectomy / nodular goitre** (19 benign of 30) and **parathyroid adenoma** (9) — nodule size, capsule, follicular pattern, lymphocytic thyroiditis, PTC negative; parathyroid weight, rim of normal gland, cellularity.
5. **Gallbladder** (20 docs) — stones, wall thickness, cholecystitis type (chronic / acute / acute-on-chronic / gangrenous / xanthogranulomatous), Rokitansky–Aschoff sinuses, cholesterolosis, adenomyomatous hyperplasia, intestinal metaplasia, dysplasia negative, cystic duct margin.
6. **Uterus for leiomyoma / adenomyosis ± adnexa** (~29 benign of 49) — leiomyoma count/location/size/degeneration, adenomyosis, endometrial phase or polyp, cervix, per-side tube and ovary findings.
7. **Ovarian cyst / cystectomy** (15 docs, 10 benign) — side, size, type (endometriotic / haemorrhagic corpus luteum / follicular / serous or mucinous cystadenoma / mature cystic teratoma / paratubal), lining, borderline features negative, torsion.
8. **Skin — epidermal / pilar cyst** (9) and **benign skin lesion or BCC excision with mm margins** (23) — site, lesion type, rupture/granulomatous reaction, per-margin distances with block refs, BCC subtype/PNI.
9. **Appendix** (11 docs, 4 stand-alone; the rest inside right hemicolectomies) — inflammation type (acute suppurative / gangrenous / periappendicitis / fibrous obliteration / none), perforation, faecolith, serositis, incidental neoplasm with mesoappendiceal margin.
10. **Lipoma / benign soft tissue** (9), **pleomorphic adenoma** (15 salivary docs, 4 PA), **tonsils** (4, fully formulaic: reactive lymphoid hyperplasia ± actinomyces).

Not in the folder in meaningful numbers (0–3 docs): hernia sac, haemorrhoids, products of conception. Add them only if they appear in the TAT list.

Each template ships with a `macro` field group and block-key builder, fixtures captured from your own verbatim wording in the analysis (anonymised), "Load example", and the "no evidence of malignancy" macro as a one-key snippet.

**Done when:** placenta, gallbladder, lymph node and thyroid cases are drafted end-to-end in the app (macro → block key → micro → dx) and saved to Drive without editing the Doc afterwards.

---

## Phase 4c — Frozen section sign-out templates (1–2 weeks)

**Goal:** report intraoperative consultations in the same app and carry the result into the final report automatically. 28 of the 600 Docs mention frozen sections; the recurring paraffin sentence is "The paraffin sections confirm the frozen section diagnosis."

- **Frozen section case mode**: parts FS1, FS2 … (separate lettering from the paraffin parts, then linked to them), each with specimen label as received, time received, time reported, reported to (surgeon / OT phone), and a frozen diagnosis line.
- **Frozen diagnosis pick-lists by scenario**, each generating a one-line intraoperative diagnosis in your style:
  - Margins (oral SCC, skin/BCC, others): negative / positive / close (mm) / atypical, defer to paraffin.
  - Sentinel and other lymph nodes: negative / positive (macro-/micrometastasis) / defer.
  - Parathyroid identification: parathyroid tissue confirmed (hypercellular / normocellular) / thyroid tissue / lymph node / adipose tissue.
  - Ovarian or adnexal mass: benign / borderline / malignant (favour type) / defer.
  - Lung, thyroid, and other nodules: benign / malignant (type if possible) / defer to paraffin.
  - Free text for anything else.
- **Block handling**: frozen block(s) converted to paraffin ("All embedded in 1 frozen block and subsequently converted to paraffin block"), with the frozen-section slides listed in the block key.
- **Frozen–paraffin correlation** written into the final report: concordant (auto sentence above), discordant (reason: sampling / interpretation / deferred), or deferred; discordance summarised for QA.
- **Output**: an INTRAOPERATIVE CONSULTATION block placed before the microscopy in the final report, plus a copy-ready frozen slip for the LIS at the time of the call.
- Save to Drive the moment the frozen result is called, so the TAT job sees the case as opened the same day.

**Done when:** a margin-frozen SCC case and a parathyroid frozen are reported live from the app, the frozen line appears unchanged in the final Doc, and the correlation sentence is generated without typing.

---

## Phase 5 — Synoptic / hybrid resections with staging (4–6 weeks)

**Goal:** replace the QMH pages for the resections you report most.

- Write `tools/import-qmh.js`: parse a QMH HTML page → draft schema (element label, options from `value`, order from `updateDescription()`, CAP PDF link). Curate by hand.
- Staging module: `deriveTNM(values, protocol)` with per-protocol rule tables and stage-group lookup; manual override with reason; edition stamped in output.
- Validation: required CAP elements, node-count consistency, margin completeness, Gleason arithmetic.
- Hybrid mode: narrative microscopy + core synoptic block + diagnosis line; synoptic-only mode for full CAP output.
- Templates in order of your volume: colon/rectum → stomach → prostate (radical) → breast → endometrium → others as needed.
- Template version pinning stored in each saved case.

**Done when:** a colectomy case produces a validated synoptic report with auto pTNM that matches the QMH page output element-for-element, plus stage group.

---

## Phase 6 — Polish and analytics (ongoing)

- Snippet library editable as Markdown; favourites and recently used.
- Case queue integrated with the TAT priority list (show due dates from the TAT Sheet).
- Analytics over the `Sign-out cases` Sheet, run either in-app or by asking Perplexity: H. pylori rate, adenoma detection, Grade Group distribution, IM prevalence.
- Perplexity workflows on top of Drive: review or rewrite a draft Doc in your style, check a synoptic against the CAP protocol, weekly summary of signed cases.
- Diff-highlight in preview; dark mode; iPad layout; shared look with PathExam.
- Optional: share the schema set (no PHI) with colleagues as a public pplx.app page.

---

## Timeline at a glance

| Phase | Scope | Cumulative |
|---|---|---|
| 0 | Repo, fixtures, tests | Week 1 |
| 1 | Schema engine, parity with legacy apps ✅ | Weeks 2–4 |
| 2 | Drive as the store: Sheet + Doc save/reopen ✅ code (publish + OAuth client pending) | Weeks 5–6 |
| 3 | Case model, mixed parts, keyboard | Weeks 7–8 |
| 4 | Prostate, IBD, duodenum, oesophagus, GYN ports | Weeks 9–12 |
| 4b | Generic benign templates from your case mix (nodes, placenta, breast margins, thyroid, gallbladder, uterus, ovarian cyst, skin, appendix) | Weeks 13–16 |
| 4c | Frozen section sign-out and paraffin correlation | Weeks 17–18 |
| 5 | QMH import, staging, hybrid/synoptic | Weeks 19–24 |
| 6 | Polish, analytics | Ongoing |

## Risks and mitigations

- **Wording drift during refactor** → golden fixtures from Phase 0, run on every change.
- **OAuth friction** → the consent screen stays in Testing mode (single test user), avoiding verification; if `drive.file` cannot write into the existing folder, widen to the `drive` scope.
- **Preview iframe limits** → sign-in and storage are exercised on the published pplx.app URL, not the in-thread preview; re-publish after each Drive-layer change.
- **PHI on personal Drive** → accession-only guard on free text; no names or HKIDs ever entered.
- **Drive/Sheets API quota or outage** → `sessionStorage` cache of the open case and a retry on save; Copy buttons always work as a manual fallback into the LIS.
- **Staging rule errors** → unit tests per pT/pN boundary from the CAP protocol tables; edition stamped on output so errors are traceable.
- **Case-mix sampling bias** → the Drive folder mostly holds drafted resections, not endoscopic biopsies signed out directly in the LIS, so Phase 4 (GI biopsies) is justified by LIS volume while Phase 4b is justified by the Drive tally; revisit the order if the TAT list says otherwise.
- **Scope creep in Phase 5** → import QMH pages only when you need them; do not convert all 60 up front.
