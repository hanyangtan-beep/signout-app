# Sign-out App — Roadmap

Companion to "Sign-out App — Design Suggestions". Phases are sequential; each ends with a usable app so you can sign out real cases from Phase 1 onward. Effort estimates assume evening/weekend work with AI-assisted coding.

---

## Phase 0 — Foundations (1 weekend)

**Goal:** a repo, a test harness, and a frozen record of current behaviour before anything is refactored.

- Create repo `signout-app/` with `schemas/`, `generators/`, `snippets/`, `tests/fixtures/`, `src/`.
- Copy gastric-biopsy-signout-v8.html and colonic-polyp-signout.html into `legacy/`.
- Capture golden fixtures: for each app, 5–8 input states (normal, H. pylori gastritis with IM, HGD adenoma, 10-part polyp case, etc.) → exact microscopy and diagnosis text output.
- Node test runner (`node --test`) that will later assert the new engine reproduces these byte-for-byte.
- Hosting: GitHub Pages (static app, no PHI in the code; all case data lives in Drive). Reachable from any browser, no Mac mini dependency.
- Create the Google Cloud project and OAuth client now so Drive auth is not a blocker later.

**Done when:** `npm test` runs the fixtures against the legacy generator functions and passes.

---

## Phase 1 — Schema engine and parity (2–3 weeks)

**Goal:** one generic app that renders any schema and reproduces both legacy apps exactly.

- Define the schema format: `fields[]` (select / grade / checkbox / number / text), `default`, `showIf`, `group`; `generators` (microscopy, diagnosis, synoptic); `organ`, `specimenNoun`, `maxParts`.
- Write `schemas/gastric_biopsy.json` and `schemas/colonic_polyp.json` by extracting the v8 `parts[]` fields and the polyp app options.
- Port `buildMicroscopy()` / `buildDiagnosis()` into `generators/gastric.js` and `generators/colonic.js` as pure functions `(partValues, ctx) → string`.
- Generic renderer: part tabs A–J, field groups, live preview, Generate / Copy diagnosis / Copy report / Clear / Load example.
- Style layer: British spelling table, ASCII normalisation, capitalisation rules for diagnosis lines, paragraph joining.
- `sessionStorage` cache of the in-progress case (refresh safety only).

**Done when:** all Phase 0 fixtures pass through the new engine unchanged, and you sign out a week of gastric/polyp cases in it without falling back to the old apps.

---

## Phase 2 — Google Drive as the store (1–2 weeks)

**Goal:** Drive is the only persistence layer from the first real case onward, so everything is readable from Perplexity in a browser.

- Google Identity Services sign-in with `drive.file` + `spreadsheets` scopes.
- `Sign-out cases` Google Sheet: one row per case (accession, date, status, templates, mode, Doc link, `case_json`). This is the app's case list.
- `saveCase(case)`: upsert the Sheet row by normalised accession, and update-or-create the Google Doc in "Pathology reports" with headings Clinical history / Macroscopic / Block key / Microscopic / Diagnosis.
- `openCase(accession)`: load `case_json` from the Sheet, re-render the form, regenerate output.
- Accession-only guard (regex for names/HKID patterns) on free-text fields before save.
- Fallback path documented: Apps Script web app bound to the same Sheet if OAuth setup stalls.

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
- Optional: publish schemas (no PHI) to GitHub Pages for colleagues.

---

## Timeline at a glance

| Phase | Scope | Cumulative |
|---|---|---|
| 0 | Repo, fixtures, tests | Week 1 |
| 1 | Schema engine, parity with legacy apps | Weeks 2–4 |
| 2 | Drive as the store: Sheet + Doc save/reopen | Weeks 5–6 |
| 3 | Case model, mixed parts, keyboard | Weeks 7–8 |
| 4 | Prostate, IBD, duodenum, oesophagus, GYN ports | Weeks 9–12 |
| 5 | QMH import, staging, hybrid/synoptic | Weeks 13–18 |
| 6 | Polish, analytics | Ongoing |

## Risks and mitigations

- **Wording drift during refactor** → golden fixtures from Phase 0, run on every change.
- **OAuth friction** → fall back to Apps Script web app if Google Cloud setup stalls; same Doc shape.
- **PHI on personal Drive** → accession-only guard on free text; no names or HKIDs ever entered.
- **Drive/Sheets API quota or outage** → `sessionStorage` cache of the open case and a retry on save; Copy buttons always work as a manual fallback into the LIS.
- **Staging rule errors** → unit tests per pT/pN boundary from the CAP protocol tables; edition stamped on output so errors are traceable.
- **Scope creep in Phase 5** → import QMH pages only when you need them; do not convert all 60 up front.
