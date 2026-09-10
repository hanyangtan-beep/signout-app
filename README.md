# signout-app

Schema-driven pathology sign-out app. Small biopsies (gastric, colonic polyp, then prostate, IBD, …) and CAP/AJCC synoptic or hybrid resection reports, with Google Drive as the single source of truth so every case is readable from Perplexity in a browser.

Built and hosted inside Perplexity: developed in the workspace, previewed in-thread, published to a private `pplx.app` URL. The browser talks to Google Drive directly via Google sign-in; there is no server and no GitHub.

Design: `docs/design.md`. Roadmap: `docs/roadmap.md`.

## Status: Phase 2 code complete (publish + Google OAuth client pending)

- [x] Repo skeleton (`schemas/`, `generators/`, `snippets/`, `src/`, `tests/`, `tools/`, `legacy/`)
- [x] Legacy apps frozen in `legacy/` (gastric v8, colonic polyp)
- [x] Legacy report logic extracted into pure Node functions (`legacy/*-legacy.cjs`)
- [x] 16 golden fixtures (8 gastric, 8 colonic) captured from the **original HTML apps running in jsdom** and cross-checked against the extracted functions
- [x] `npm test` — 27 passing (16 golden fixtures through the new engine + 11 engine tests)
- [x] Phase 1: `schemas/gastric_biopsy.json`, `schemas/colonic_polyp.json`; `generators/gastric.js`, `generators/colonic.js`; `src/engine.js` (defaults, showIf, optionsByField, assemble), `src/style.js` (ASCII + opt-in British spelling), `src/registry.js`, `src/store.js` (sessionStorage cache), `src/app.js` (generic UI)
- [x] Phase 1 UI: template switcher, parts A–J (add / remove / same as previous / reset), chips with number-key selection, live Specimens / Microscopy / Diagnosis preview with per-block copy, Copy diagnosis (Cmd/Ctrl+Shift+C), Copy full report (Cmd/Ctrl+Enter), Load example, light/dark theme, mobile layout
- [x] `npm run build` → `dist/`; in-thread preview deployed via Perplexity ("Sign-out")
- [x] `docs/case-mix-analysis.md` — tally of 600 Drive drafts feeding roadmap Phase 4b (generic benign templates) and 4c (frozen sections)
- [x] Phase 2: `src/gauth.js` (Google Identity Services token flow), `src/config.js` (Settings in localStorage), `src/docformat.js` (accession normalisation, PHI guard, Doc layout, Sheet row mapping), `src/drive.js` (Sheet upsert, Doc create/replace, open); case details (accession, status, clinical history, macroscopic, block key); Save (Cmd/Ctrl+S), Open, Settings dialogs; 33 tests
- [x] Published at `https://han-signout.pplx.app`
- [x] Google Cloud OAuth client created and shipped as the default; first Drive save verified 2026-09-09 (`docs/google-setup.md` has the troubleshooting table)
- [x] Phase 3 (part 1): `schemas/prostate_biopsy.json` + `generators/prostate.js` (Gleason / Grade Group, cores, extent, cribriform, IDC-P, PNI, EPE, case summary) and `schemas/ibd_biopsy.json` + `generators/ibd.js` (chronicity / activity classification, Nancy index, distribution summary with UC vs Crohn's pattern); engine: single-part rule (no "(A)" for one-part cases), parts A–Z, `partDefaults`, `number` fields, `summary` hook; 55 tests
- [x] Phase 3 (part 2): mixed-template cases — per-part `templateId`, part template picker, `engine.generateCase` assembling parts from different templates in case order with per-template summaries; Sheet/Doc record `gastric_biopsy+colonic_polyp`; 63 tests
- [x] Phase 4 (part 1): oesophageal biopsy template — squamous (reflux pattern, eosinophil count with the 15/hpf threshold, Candida, squamous neoplasia) and columnar (intestinal metaplasia, Barrett's by endoscopic context, glandular dysplasia) findings combined into one line per level, multi-level SUMMARY; 74 tests
- [x] Phase 4c: frozen section template — lettered frozen parts with scenario pick-lists (margin, lymph node, parathyroid, ovarian mass, nodule, free text), generated macroscopic description, INTRAOPERATIVE CONSULTATION block with grouped results and the phone-report sentence, paraffin correlation (concordant / discordant / deferred) and house diagnosis lines; engine gained optional `macro` and `intraop` blocks; 92 tests
- [x] Phase 4 (part 2): breast core biopsy template — per-part side / site / cores / imaging target, WHO6 "Small diagnostic samples" B1–B5c category (derived, printed at the end of the diagnosis line, overridable), benign / B3 / suspicious / DCIS / invasive (provisional Nottingham grade) / B5c / axillary node pick-lists, calcification correlation sentence, and a biomarker block (`generators/breast_biomarkers.js`) that reproduces the CancerReportingTemplate breast biomarkers page field-for-field — ER/PR/HER2 IHC, HER2 DISH, Ki67, cold ischemia and fixation pre-analytic logic, methodology sentences and interpretive comments verbatim (schema `style.british` off so the block is not respelled); 109 tests
- [x] Phase 4 (part 3): duodenal biopsy template (`schemas/duodenal_biopsy.json`, `generators/duodenal.js`) — villous architecture, intraepithelial lymphocytes (with count), crypt hyperplasia → Marsh–Oberhuber type (derived, overridable; blunting without IELs flagged separately), lamina propria inflammation and activity, Brunner gland hyperplasia and foveolar metaplasia (peptic duodenitis), Giardia, Helicobacter, granuloma, other findings (lymphangiectasia, foamy macrophages, amyloid, viral change) and neoplasia; interpretive coeliac / Marsh 1 sentence (switchable); multi-site SUMMARY. Cervical biopsy template (`schemas/cervical_biopsy.json`, `generators/cervical.js`) — punch biopsies by clock position, endocervical curettings (incl. inadequate) and polyps; two-tier squamous scheme with CIN grade in house style (`HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (HSIL / CIN III)`), koilocytosis / HPV effect, gland involvement, early-invasion caveat, p16 / Ki-67 sentence, SCC type / depth / LVI, AIS and adenocarcinoma (HPV-associated vs gastric type), benign pick-list, referral-cytology case field driving the discordance comment; SUMMARY of highest grade lesion; 125 tests
- [x] Phase 4 (part 4): **snippets** — schema `snippets[]` (`{id, label, text, auto:{field, is|not|truthy}}`) rendered as a Comments checkbox group plus a free-text comment, printed as a COMMENT block; auto-rules pre-tick e.g. the H. pylori and IM-surveillance comments. **Endometrial biopsy** (`schemas/endometrial_biopsy.json`, `generators/endometrial.js`) — amount / adequacy, phase, disordered proliferative, hyperplasia without / with atypia (EIN), polyp, products of conception, carcinoma type with FIGO grade and the p53 / MMR / ER / PR sentence. **LEEP / cone** (`schemas/cervical_excision.json`, `generators/leep.js`) — serial radial sections and block count, HSIL / LSIL by clock position with the house label `(HSIL / CIN III)`, gland involvement, invasion, p16, per-margin status, endocervical curettings part, SUMMARY. **Lung / bronchial biopsy** (`schemas/lung_biopsy.json`, `generators/lung.js`) — tissue present, benign / inflammatory pick-list, WHO 5th carcinoma types with the IHC favour statement, PD-L1 clone / TPS line, ALK / ROS1, molecular-testing sentence, lymph node parts, small-biopsy caveat snippet. **Reference photos** — schema `field.reference` renders a "Compare photos" toggle beside a field that opens an inline comparison panel (criteria bullets, photomicrographs, caption, credit + licence link); first used on the gastric **IM subtype** field with seven CC BY 4.0 images of complete vs incomplete intestinal metaplasia (H&E, AB-PAS, HID-AB) in `assets/reference/gastric/`; 127 tests
- [x] Phase 4 (part 5, closes Phase 4): **engine** — `multiselect` field type (chip group, `exclusive` options, array-aware `showIf` with `min` / `max` counts, `toggleOption`), schema `presets[]` (one-click part sets with case title), snippet `auto: {flag}` driven by a generator `flags(parts, ctx)` export. **Lung** — mixed adenocarcinoma patterns (`with mixed lepidic and acinar patterns (acinar predominant)`, exclusive invasive mucinous adenocarcinoma, predominant-pattern field shown for two or more patterns, small-biopsy caveat auto-ticked when lepidic is present). **Gastric** — biopsy site per part (antrum GC / LC, incisura, body GC / LC, fundus, cardia) used as the specimen-name fallback, IM extent and mucin histochemistry (AB-PAS / HID-AB sentence), `(incomplete, multifocal)` qualifiers in microscopy and diagnosis, Sydney five-site and pooled three-site presets, OLGA / OLGIM stage line under the diagnosis (highest grade per compartment, Rugge / Correa table, incomplete-mapping caveat, case option to switch off) and five auto snippets (H. pylori, H. pylori with IM, incomplete IM, high-stage surveillance, mapping advice). A gastric biopsy with every finding Absent now reads `NO SIGNIFICANT ABNORMALITY, Helicobacter-negative`. Header button **Polyp** renamed **Colonic polyp**; 141 tests
- [x] Phase 4d: **template organisation** — every schema carries `system`, `kind` (biopsy / benign resection / cancer resection / frozen), `rank`, `aliases` and a header `label`, with `shortName` as "Organ · procedure"; `scripts/build-manifest.mjs` writes `templates/manifest.json` and the registry lazy-loads each schema + generator on first use (boot downloads the manifest and one template; the bundle no longer grows per template). Header: fixed **Small biopsy** row in TAT-frequency order (collapses to the top 8 plus More past 12) and a **Resections ▾** row of pinned / recent templates (≤ 8, filled from the rest by rank). `Cmd/Ctrl-K`, `/` or Resections ▾ open the template palette — grouped system × kind browse when empty, ranked search over shortName, aliases, organ and keywords when typing, ↑↓ / Enter, star to pin. Part-card selector grouped by system with Small biopsy first; 149 tests

## Commands

```bash
npm install          # jsdom (dev only; used to drive the legacy HTML for fixture capture)
npm test             # golden-output tests (node --test)
npm run fixtures     # regenerate fixtures; refuses to overwrite existing files
npm run fixtures:force   # overwrite — only after a deliberate, reviewed wording change
```

## Layout

```
legacy/       original single-file apps + extracted pure functions (frozen reference)
tests/
  fixtures/   {gastric,colonic}/NN-name.json  → { input, expected }
  legacy.test.js   runs every fixture through GENERATORS; swap in the new engine in Phase 1
tools/
  fixture-inputs.js    the input states (edit here to add a case)
  capture-fixtures.js  runs legacy fn + real DOM, asserts equal, writes fixture
schemas/      Phase 1: JSON template schemas
generators/   Phase 1: (partValues, ctx) → text
snippets/     reusable comment text (Markdown)
src/          Phase 1: the app
docs/         design + roadmap
```

## How the golden tests protect wording

`tests/legacy.test.js` has one `GENERATORS` map. In Phase 1, point `gastric` and `colonic` at the new schema engine; the fixtures do not change. If output differs by a single character the test names the fixture and shows a diff. Wording changes are allowed only by editing the fixture on purpose (`npm run fixtures:force` after updating `legacy/` is **not** the route — edit the expected text in the fixture JSON and commit it with the reason).

## Legacy behaviours captured as-is (decide in Phase 1)

These are reproduced faithfully by the fixtures. Each is a candidate for a deliberate change once the new engine passes parity:

1. **Gastric diagnosis always says "CHRONIC GASTRITIS"**, even when chronic inflammation is `Absent` and everything else is negative (`fixtures/gastric/01`). There is no "no significant abnormality" path.
2. **Gastric microscopy is a structured list**, not a narrative paragraph. The narrative style in `docs/design.md` is new behaviour, not parity.
3. **Case-title site parsing only recognises labels A–D** (`/\(([A-D])\)/`) and strips a trailing "and"/"&" and `;`/`,`.
4. **Gastric extras ordering**: with H. pylori, the first extra follows the diagnosis after a space (`… GASTRITIS with ULCER; mild INTESTINAL METAPLASIA (incomplete)`); without H. pylori all extras are `;`-joined.
5. **Colonic diagnosis line repeats the site** (`(A) ASCENDING COLON, Ascending colon polyp, polypectomy - …`) because the specimen name defaults to `<Site> polyp`.
6. **Colonic default site is Sigmoid**, default type tubular adenoma LGD.
7. **Colonic microscopy is indented with two spaces** after the label (`(A)  Sections show…`).
8. **Colonic diagnosis ends with a full stop**; gastric does not.
9. **"Colon, site not specified"** → `COLON` / `Colon`.
10. **Cecum** is spelt the American way in the site list; user-entered text is not altered.

## Manual setup (do once, after publishing)

Follow `docs/google-setup.md`: Google Cloud project, enable Drive + Sheets APIs, consent screen in Testing with you as test user, Web OAuth client whose authorised JavaScript origin is `https://<subdomain>.pplx.app`, then paste the client id into the app's Settings (gear icon). The `Sign-out cases` Sheet is created automatically on first save; the "Pathology reports" folder id is preset.

Hosting is handled from the Perplexity thread: "deploy preview" for QA, "publish" for the permanent URL. Nothing else to configure.

## Data policy

Only accession numbers and report text are ever written to Drive. No patient names or HKIDs are entered anywhere in the app; a regex guard on free-text fields warns before a save that looks like it contains an HKID, a name, a phone number or a date of birth.
