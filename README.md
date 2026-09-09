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
- [ ] Publish to `https://<subdomain>.pplx.app` (you pick the subdomain)
- [ ] Google Cloud OAuth client — follow `docs/google-setup.md`, then paste the client id into the app's Settings

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
