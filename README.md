# signout-app

Schema-driven pathology sign-out app. Small biopsies (gastric, colonic polyp, then prostate, IBD, …) and CAP/AJCC synoptic or hybrid resection reports, with Google Drive as the single source of truth so every case is readable from Perplexity in a browser.

Built and hosted inside Perplexity: developed in the workspace, previewed in-thread, published to a private `pplx.app` URL. The browser talks to Google Drive directly via Google sign-in; there is no server and no GitHub.

Design: `docs/design.md`. Roadmap: `docs/roadmap.md`.

## Status: Phase 0 complete

- [x] Repo skeleton (`schemas/`, `generators/`, `snippets/`, `src/`, `tests/`, `tools/`, `legacy/`)
- [x] Legacy apps frozen in `legacy/` (gastric v8, colonic polyp)
- [x] Legacy report logic extracted into pure Node functions (`legacy/*-legacy.js`)
- [x] 16 golden fixtures (8 gastric, 8 colonic) captured from the **original HTML apps running in jsdom** and cross-checked against the extracted functions
- [x] `npm test` — 18 passing
- [ ] Google Cloud project + OAuth client (manual, done at start of Phase 2 once the pplx.app subdomain is fixed — see below)

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

## Manual setup (do once, at the start of Phase 2)

### Google Cloud project + OAuth client

1. [console.cloud.google.com](https://console.cloud.google.com) → New project `signout-app`.
2. APIs & Services → Library → enable **Google Drive API**, **Google Sheets API**, **Google Docs API**.
3. APIs & Services → OAuth consent screen → External, app name `Sign-out`, your Gmail as support and developer contact. Scopes: `.../auth/drive.file`, `.../auth/spreadsheets`, `.../auth/documents`. Add yourself under Test users (the app can stay in *Testing*; no verification needed for a single user).
4. Credentials → Create credentials → OAuth client ID → Web application. Authorised JavaScript origin: `https://<subdomain>.pplx.app` (the published app URL from Phase 1). No redirect URIs needed for the Google Identity Services token flow.
5. Copy the Client ID into `src/config.js` in Phase 2 (it is public by design; there is no client secret in the token flow).
6. In Drive, note the folder ID of **Pathology reports** (already known: `1IDOdz37IQJaYDX7PVFlqB7VFzyfiNXMM`) and create an empty Google Sheet **Sign-out cases**; its ID goes into the same config.

Hosting is handled from the Perplexity thread: "deploy preview" for QA, "publish" for the permanent URL. Nothing else to configure.

## Data policy

Only accession numbers and report text are ever written to Drive. No patient names or HKIDs are entered anywhere in the app; Phase 2 adds a regex guard on free-text fields.
