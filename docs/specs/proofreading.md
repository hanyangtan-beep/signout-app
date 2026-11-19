# Proofreading before sign-out

User request 2026-11-19: proofread each report automatically in Han Sign-out before it is signed out, in the house style, keeping credit spend to the build. Decisions the same day: the model is PPLX 27B through Han Slide on the Mac where the report is drafted ("yes, use PPLX27B through Han Slide"); it may read the whole report ("its fine for proofreader to read the whole report"); the proofread draft is also brought into the house style ("remember i also want the proofread draft to be in my house style"). Sign-out itself is on a PC, which has no model, so the proofreading done on the Mac is saved with the case and shown on the PC.

Code: `src/proofread.js` (rules, the question, the guard on the answer, the record), `src/hanslide.js` (the connection to Han Slide), `src/app.js` (Checks, triggers, Settings). Han Slide's side is Batch 2.15 in the Han Slide build plan.

## Two kinds of suggestion

Both are shown in a Proofreading box at the top of the report, after Checks, and nothing in the report changes until a suggestion is accepted.

- **Rule checks**, worked out in the page on every computer, the PC included, with no model: British spelling (the `BRITISH` map in `src/style.js`), plain text for the LIS (`toAscii`), the diagnosis connectors (`houseConnectors`, for typed or pasted diagnoses; the generated one has them already), "Sections shows", a word typed twice, a placeholder left in (`___`, `XX`, `TBC`, `??`, empty brackets, `<...>`), Markdown, an unclosed bracket, and one side in the specimen against the other side in the diagnosis.
- **Model suggestions**, from PPLX 27B through Han Slide on the Mac: spelling, typing and grammar, the house style, and facts that disagree between sections (size, count, side, site, margin, grade, stage, a biomarker result, the diagnosis against the microscopy or the macroscopy).

## House style given to the model

From the app's own rules (`src/style.js`, `docs/specs/diagnosis-connectors.md`, `docs/specs/trailing-negatives.md`, item 6 of `docs/specs/report-review.md`) and, for the microscopy phrases, from counts on the released biopsy reports (2021 to 2026 export, 9323 microscopy texts): "Sections show" in 6027, "There is no evidence of" in 4828 and "no evidence of malignancy" in 1495, against "no malignancy seen / identified" in 22 and "negative for malignancy" in none. The gross description opens "Specimen received in" in 8361 of 9023; it is captured from the LIS as written, so the list adds no rule for it. The list is `HOUSE_STYLE` in `src/proofread.js`:

- British spelling; "fetal" as written.
- Plain text for the LIS: no Markdown, bold or tables; "x" between dimensions, straight quotes, "-" for dashes.
- The layout kept exactly: headings, line breaks, "- Label: value" lines, part letters and capitals.
- Diagnosis: the organ in capitals, then side, site and procedure in lower case; terms in capitals; "with" (and an article after it) lower case between capitalised terms; "In keeping with / Consistent with / Compatible with" in sentence case opening a clause and lower case after a comma; WITHOUT and AND as written; a named benign diagnosis without a trailing negative.
- Microscopy opens "Sections show"; negatives read "There is no evidence of ..."; immunohistochemistry stays in the microscopy paragraph.
- Concise: a repeated word or phrase goes; a correct sentence is left as it is.

## The question

`buildPrompt(sections, history)`: the first line is `TASK: proofread` (Han Slide's task line, as for its other questions), then the clinical history as `[HISTORY]` (context only) and each printed block in report order, tagged `[SPECIMEN]`, `[MACRO]`, `[INTRAOP]`, `[MICRO]`, `[MOLECULAR]`, `[DX]`, `[COMMENT]`. The block key is left out. The system prompt (`SYSTEM_PROMPT`) asks for one JSON object, `{"edits":[{"section","find","replace","kind","why"}],"flags":[{"section","quote","why"}]}`, at most 12 edits and 8 flags, and forbids changing a number, unit, side, site, negation, grade, stage, margin status, biomarker result or one diagnosis for another: those go in flags. A question over 40000 characters is not sent. Answers are capped at 1400 tokens.

## The guard on the answer

`parseReply` takes the JSON object from the model's text (fences and a thinking block ignored); a cut-off answer keeps each whole item. `vetReply` then keeps an edit only when:

- its text is in the section named, or in exactly one other section (moved there);
- it is on one line, at most 200 characters, different from its replacement, and occurs once (a single word occurring more than once is replaced as a whole word everywhere in that section);
- `safeEdit` passes: the same numbers, tokens with a digit, symbols (`% < > = +`) and protected words (sides, negation and presence, grade words, benign and malignant terms, margin words, staging systems, units, number words, biomarker names), the same number of times; and every other word removed or added is either the corrected spelling of another (Damerau-Levenshtein distance at most a quarter of its length) or a function word of the house phrases ("Sections show", "There is no evidence of").

An edit that fails `safeEdit` becomes a check, with its wording shown as a suggestion but no Accept. A flag is kept only when its quote is in a section (case and spacing aside). What is set aside is counted in the record (`dropped`), not shown.

## Accepting, dismissing and the record

- **Accept** applies the edit to the block's text. When the block was generated, the accepted text becomes an edit of that block (as typing in it would), and a toast says so. **Accept all** accepts every open edit. **Dismiss** hides a suggestion; a dismissed one stays dismissed when the model suggests it again.
- The record is `caseState.proofread`, saved with the case (the Sheet's `case_json` column): `{ v: 1, at, by, seconds, hashes, items, dropped, dismissed }`. `by` names the model and Han Slide's version; `hashes` are FNV-1a fingerprints of each block proofread, not the text; `items` are the model's suggestions with their status. Rule checks are worked out again whenever the report is shown, so only their dismissals are kept.
- Checks shows when the report was proofread and which sections have changed since. **Copy for LIS** asks before copying while suggestions are open, and says when the report has changed since it was proofread.

## When it runs

Only on a computer where proofreading is turned on in Settings (off by default, so the PC never contacts Han Slide):

- when the case's status is set to Ready in the editor;
- on Save, while the case is Ready and the report has changed since it was last proofread;
- with the Proofread button in Checks.

One question at a time; an answer for a case no longer open is discarded. When the case was saved before the answer came and nothing else changed, the record is saved quietly; otherwise the case is marked as changed.

## The connection (Han Sign-out side)

Settings › Proofreading holds the switch and the pairing code shown in Han Slide's Settings › Proofreading (kept in this browser's local storage, `signout.proofread.v1`). The page asks `http://127.0.0.1:47321/v1/status` (Test) and `POST /v1/proofread` (`{ system, prompt, maxTokens }`, answered with `{ text, seconds, outputTokens, model, version }`) with the code as a bearer token; nothing else is sent and nothing goes beyond this computer. Chrome asks once whether the site may reach devices on this computer and the local network ([Chrome, Local Network Access](https://developer.chrome.com/blog/local-network-access)); allow it. Errors say what to do: open Han Slide, turn on Proofreading there, check the code, wait for the model.

Han Slide answers only that origin (`https://han-signout.pplx.app`), only on 127.0.0.1, only with the code, and keeps no report text: its log and diagnostics hold counts and times. Its own Sign-out window loads a pinned copy of the site (`Vendor/han-signout/PIN.json`), which gets proofreading when the pin is next moved; until then, proofreading runs in Chrome or Comet on the live site.

## Tests

`tests/proofread.test.js`: rule checks on made-up text (one of each), the protected-word guard (number, side, negation, grade and diagnosis changes become checks; spelling, "Sections show" and "There is no evidence of" pass), parsing a fenced, a cut-off and an untidy answer, unique and whole-word application, the record (fingerprints, changed sections, kept dismissals), the question's tags and size limit, and no rule finding in any template example or golden fixture report. `tests/hanslide.test.js`: the client against a stubbed `fetch` (off sends nothing; status; proofread; each error). The proofreading check in `tools/qa-browser.js`, against a stand-in server on 127.0.0.1:47321 answering like Han Slide: off asks nothing; Test; Ready asks once; rule and model suggestions show together; Accept, Dismiss and Accept all; the record and a dismissal survive a reload and a second proofread; Copy for LIS asks once while suggestions are open.
