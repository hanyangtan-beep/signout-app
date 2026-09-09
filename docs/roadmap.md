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

- One-time Google Cloud setup (10 minutes, guided): project, enable Drive/Sheets/Docs APIs, consent screen in Testing with you as test user, Web OAuth client with the pplx.app origin. Client ID goes into `src/config.js`.
- Google Identity Services token flow in the browser with `drive.file` + `spreadsheets` + `documents` scopes.
- `Sign-out cases` Google Sheet: one row per case (accession, date, status, templates, mode, Doc link, `case_json`). This is the app's case list.
- `saveCase(case)`: upsert the Sheet row by normalised accession, and update-or-create the Google Doc in "Pathology reports" with headings Clinical history / Macroscopic / Block key / Microscopic / Diagnosis.
- `openCase(accession)`: load `case_json` from the Sheet, re-render the form, regenerate output.
- Accession-only guard (regex for names/HKID patterns) on free-text fields before save.
- Drive layer is tested against the published URL (sign-in pop-ups do not work inside the preview iframe).

**Done when:** the 09:00 TAT job scores an app-generated Doc as "complete" with no manual editing, a case reopened from the Sheet is identical to what was saved, and Perplexity can read both the Doc and the Sheet row when asked.

---

## Phase 3 — Case model and mixed parts (1–2 weeks)

**Goal:** a case is the unit of work, not a template.

- Case object: accession, clinical history, parts with per-part `templateId`, block key, report mode, status — serialised as the `case_json` saved in Phase 2.
- Per-part template picker (A gastric, B duodenum, C polyp in one case).
- Case-level output assembly: specimen title → macroscopic (free text) → block key → microscopy per part → diagnosis lines in order.
- "Same as previous part" copy; "all normal" per part.
- Case list view over the Sheet: drafts, ready, signed; search by accession.
- Keyboard model: number keys for options, Tab between fields, `Cmd+Enter` generate, `Cmd+Shift+C` copy diagnosis, `Cmd+S` save to Drive.

**Done when:** a 3-part mixed OGD + colonoscopy case produces a single coherent report, saves to Drive, and reopens from another browser.

---

## Phase 4 — Small-biopsy template expansion (3–4 weeks, one template per week)

**Goal:** cover the bulk of your daily GI/GU biopsy sign-out.

1. **Prostate biopsy** — cores A–L, per-core Gleason patterns and % / mm, auto Grade Group, cores-positive count, aggregate summary line, PNI / EPE / IDC-P / HGPIN / ASAP. Port logic from your earlier prostate draft app.
2. **IBD biopsy** — site series (TI → rectum), chronicity, activity grade, basal plasmacytosis, crypt distortion, granulomas, dysplasia, optional Nancy index; derived distribution summary.
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
| 2 | Drive as the store: Sheet + Doc save/reopen | Weeks 5–6 |
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
