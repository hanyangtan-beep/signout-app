# Specimen intake — paste the LIS specimen list, get the parts

Status: planned 2026-09-12 (user request); two roadmap cards in Next, build as one batch. Not yet built.

## Problem

Multi-part cases ("(A) Cervix, (B) Endometrium, (C) Uterus, TAH …") are built today by adding parts one at a time and picking a template for each. The LIS already holds the specimen list and the clinical history; the app should read both and set the parts up.

## What the user does

1. Under **Accession**, a new **Specimen** box (multi-line, "Paste the LIS specimen list") sits above **Clinical history** inside the same meta panel. The existing single-line **Case title / specimens** field is folded into it: the box is the source, the case title (used by the gastric / IBD site parsers) is derived from it and stays editable.
2. Paste, and a preview strip appears under the box: one row per detected part — letter, specimen text, the suggested template as a dropdown, and a confidence mark (confident / choose / none). Clinical history typed before or after the paste re-scores the suggestions live.
3. **Build parts** creates or replaces the parts: label, `templateId`, specimen name (from the LIS text, tidied), case title. Parts already edited are not overwritten silently — the button reads **Replace parts** and asks once. A part with no matching template gets the **Generic** template.

Single-part paste follows the existing rule: one part, no "(A)".

## Parsing (`src/intake.js`, pure, tested)

- Split on part markers at line start or after a separator: `(A)`, `A)`, `A.`, `A:`, `Specimen A`, `Part A`, `1.`, `1)`, `(1)`, and one-specimen-per-line lists with no markers. Letters and numbers both normalise to A, B, C … (max 26; the app's 10-part limit for synoptic templates still applies).
- Within a part: specimen site and procedure are kept as typed, whitespace collapsed, trailing punctuation dropped, LIS codes / container counts (`x2`, `#3`, `(2 pots)`) stripped into a `note`. British spelling is not enforced on pasted text.
- Output: `[{ label, text, site, procedure, note }]`. The tidy specimen name (`"Cervix, biopsy"` → `"Cervix, biopsy"`; `"UTERUS TAH+BSO"` → `"Uterus, total hysterectomy and bilateral salpingo-oophorectomy"` only when a manifest abbreviation table says so) feeds each part's `specimenName`.

## Matching (`src/intake.js` + `templates/manifest.json`)

Deterministic scoring, no AI call in this card:

- Each schema gains a `match` block (compiled into the manifest by `scripts/build-manifest.mjs`): `site` terms, `procedure` terms, `clinical` terms and `not` terms, each with a weight. Existing `aliases` seed `site`.
- Score per part = site hits (specimen text) + procedure hits (specimen text) + clinical hits (clinical history) − `not` hits. Procedure words decide biopsy vs resection (`biopsy`, `polypectomy`, `curettings` vs `hysterectomy`, `colectomy`, `wedge`, `excision`, `mastectomy`); clinical terms decide between templates of the same organ and procedure (uterus TAH: `leiomyoma(s)` / `fibroids` / `adenomyosis` → `uterus_benign`; `endometrial carcinoma` / `EEC` / `atypical hyperplasia` → `endometrial_carcinoma`; nothing decisive → choose).
- Tiers: **confident** when the top score clears a threshold and beats the runner-up by a margin; **choose** when two templates are close (dropdown pre-opened on the top three); **none** when nothing scores (Generic). A confident wrong assignment is a test failure; an ambiguous one shown as "choose" is not.
- Clinical history applies to every part, but a clinical term only counts for a template whose site also matched that part (so "leiomyomas" cannot pull the cervix biopsy onto the uterus template).

## Generic template (`schemas/generic.json`, `generators/generic.js`)

Fields: specimen name, clinical note (optional), microscopy (free text, seeded "Sections show "), diagnosis specimen line (upper case, derived from the specimen name, editable) and diagnosis text, optional comment. Prints in the standard block order and joins multi-part reports like any other template; no synoptic, no Checks beyond "microscopy empty" / "diagnosis empty" warnings. Listed in the palette as **Generic (free text)** so it can also be chosen by hand.

## Data and Drive

- `caseState.meta.specimenText` saved with the case (Drive record and Doc unchanged apart from the extra field; the Doc's SPECIMENS block already prints the part specimen names).
- `caseTitle` becomes derived (`"(A) Cervix; (B) Endometrium; (C) Uterus"`) but remains user-editable; the gastric and IBD `parseSitesFromTitle` keep working.

## Tests

- `tests/intake.test.js`: parser table (markers, numbers, single line, per-line lists, codes stripped) and matcher table.
- `tests/fixtures/intake/cases.json`: anonymised LIS specimen lists with clinical history and the expected template per part — first set written from the user's examples (to be supplied; 30 or more, covering every template with a resection / biopsy pair), extended whenever a case mis-matches in use.
- Accept: top-1 correct for at least 90% of parts in the fixture set; zero confident-wrong assignments; every part with no match lands on Generic; existing golden fixtures unchanged.

## Out of scope (Later)

- AI suggestion when the rules return "none" or "choose" (would send specimen text and clinical history to a model; needs a decision on PHI first).
- Parsing the pasted macro into field values (sizes, counts) — separate card.
- Reading the specimen list from Navify / the LIS directly.

## Open questions for the user

1. A few real LIS specimen lists (anonymised) and their clinical histories, pasted exactly as the LIS shows them, so the parser and the first fixture set match the house format rather than a guess.
2. Whether the LIS uses letters, numbers, or both for parts, and whether container counts or specimen codes appear in the list.
3. Whether the **Case title / specimens** field can be retired in favour of the derived title (proposed yes).
