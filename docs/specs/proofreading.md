# Proofreading before sign-out

User request 2026-11-19: proofread each report automatically in Han Sign-out before it is signed out, in the house style, keeping credit spend to the build. Decisions the same day: the model is PPLX 27B through Han Slide on the Mac where the report is drafted ("yes, use PPLX27B through Han Slide"); it may read the whole report ("its fine for proofreader to read the whole report"); the proofread draft is also brought into the house style ("remember i also want the proofread draft to be in my house style"). Sign-out itself is on a PC, which has no model, so the proofreading done on the Mac is saved with the case and shown on the PC.

User request later the same day (Phase 87): "I will accept drafted rewrites of whole sections. I will also accept changes to mismatches as long as it is flagged, and I will manually accept or reject the changes. Can the changes go back into the original form for iteration?" So the model may also give the corrected text for a flag and rewrite a whole section; each is accepted by hand; and what is accepted goes into the form where a field gives the text, so the report keeps following the form.

Code: `src/proofread.js` (rules, the question, the guard on the answer, the facts a rewrite keeps, the record), `src/writeback.js` (accepted text back into the form), `src/textdiff.js` (word differences), `src/engine.js` (`applyPatches`), `src/hanslide.js` (the connection to Han Slide), `src/app.js` (Checks, triggers, Settings). Han Slide's side is Batch 2.15 in the Han Slide build plan.

## Two kinds of suggestion

Both are shown in a Proofreading box at the top of the report, after Checks, and nothing in the report changes until a suggestion is accepted.

- **Rule checks**, worked out in the page on every computer, the PC included, with no model: British spelling (the `BRITISH` map in `src/style.js`), plain text for the LIS (`toAscii`), the diagnosis connectors (`houseConnectors`, for typed or pasted diagnoses; the generated one has them already), "Sections shows", a word typed twice, a placeholder left in (`___`, `XX`, `TBC`, `??`, empty brackets, `<...>`), Markdown, an unclosed bracket, and one side in the specimen against the other side in the diagnosis.
- **Model suggestions**, from PPLX 27B through Han Slide on the Mac: spelling, typing and grammar, the house style, and facts that disagree between sections (size, count, side, site, margin, grade, stage, a biomarker result, the diagnosis against the microscopy or the macroscopy), flagged, with the corrected text where another section shows which is right; and rewrites of whole sections.

## House style given to the model

From the app's own rules (`src/style.js`, `docs/specs/diagnosis-connectors.md`, `docs/specs/trailing-negatives.md`, item 6 of `docs/specs/report-review.md`) and, for the microscopy phrases, from counts on the released biopsy reports (2021 to 2026 export, 9323 microscopy texts): "Sections show" in 6027, "There is no evidence of" in 4828 and "no evidence of malignancy" in 1495, against "no malignancy seen / identified" in 22 and "negative for malignancy" in none. The gross description opens "Specimen received in" in 8361 of 9023; it is captured from the LIS as written, so the list adds no rule for it. The list is `HOUSE_STYLE` in `src/proofread.js`:

- British spelling; "fetal" as written.
- Plain text for the LIS: no Markdown, bold or tables; "x" between dimensions, straight quotes, "-" for dashes.
- The layout kept exactly: headings, line breaks, "- Label: value" lines, part letters and capitals.
- Diagnosis: the organ in capitals, then side, site and procedure in lower case; terms in capitals; "with" (and an article after it) lower case between capitalised terms; "In keeping with / Consistent with / Compatible with" in sentence case opening a clause and lower case after a comma; WITHOUT and AND as written; a named benign diagnosis without a trailing negative.
- Microscopy opens "Sections show"; negatives read "There is no evidence of ..."; immunohistochemistry stays in the microscopy paragraph.
- Concise: a repeated word or phrase goes; a correct sentence is left as it is.

## The question

`buildPrompt(sections, history)`: the first line is `TASK: proofread` (Han Slide's task line, as for its other questions), then the clinical history as `[HISTORY]` (context only) and each printed block in report order, tagged `[SPECIMEN]`, `[MACRO]`, `[INTRAOP]`, `[MICRO]`, `[MOLECULAR]`, `[DX]`, `[COMMENT]`. The block key is left out. The system prompt (`SYSTEM_PROMPT`) asks for one JSON object, `{"edits":[{"section","find","replace","kind","why"}],"flags":[{"section","quote","replace","why"}],"rewrites":[{"section","text","why"}]}`, at most 12 edits, 8 flags and 2 rewrites. An edit may not change a number, unit, side, site, negation, grade, stage, margin status, biomarker result or one diagnosis for another: those go in flags, and a flag may give `replace` only when another section shows which is right. A rewrite gives the whole new text of the macroscopy, the intraoperative consultation, the microscopy or the comment when it reads poorly or needs three or more changes; it changes the sentence structure and flow, not one word for a similar word, and keeps every fact and the layout, with no edits in that section. A question over 40000 characters is not sent. Answers are capped at 2000 tokens, the most Han Slide allows (`ProofreadLink.maxTokensLimit`).

## The guard on the answer

`parseReply` takes the JSON object from the model's text (fences and a thinking block ignored); a cut-off answer keeps each whole item. `vetReply` then keeps an edit only when:

- its text is in the section named, or in exactly one other section (moved there);
- it is on one line, at most 200 characters, different from its replacement, and occurs once (a single word occurring more than once is replaced as a whole word everywhere in that section);
- `safeEdit` passes: the same numbers, tokens with a digit, symbols (`% < > = +`) and protected words (sides, negation and presence, grade words, benign and malignant terms, margin words, staging systems, units, number words, biomarker names), the same number of times; and every other word removed or added is either the corrected spelling of another (Damerau-Levenshtein distance at most a quarter of its length) or a function word of the house phrases ("Sections show", "There is no evidence of").

An edit that fails `safeEdit` keeps its wording as a flagged change, accepted only by its own **Accept change**. A flag is kept only when its quote is in a section (case and spacing aside); its `replace` is offered as a flagged change only where the quote is in the section exactly and once (a single word: as a whole word, each time). A rewrite is kept only when it is of a section that may be rewritten, one per section; it differs from the section's text, is between half and 1.6 times its length plus 40 characters (4000 at most), and keeps its layout (`layoutOf`: the part letters opening lines, each "- Label:" and each heading line in capitals, in order). What is set aside is counted in the record (`dropped`), not shown.

## Accepting, dismissing and the record

- **Accept** makes an edit. **Accept change** makes a flagged change; its row shows the change, why, and what it changes (`factChange`, for example "changes 0.8 to 0.9").
- A rewrite shows as tracked changes over the section's text (`rewriteChanges`, word by word). Each change ticks or unticks on a click (or Enter or Space). One that takes out a fact the whole rewrite loses, or brings in one it adds, is marked with what it changes and starts unticked; a fact only moved to another sentence is not. Facts are numbers, tokens with a digit, the protected words, symbols and the words of the form's options (`formTerms`). **Accept ticked (k of N)** makes the ticked changes. While ticking some and not others would lose a fact the rewrite moves, or bring one in twice, it is greyed out with a note saying what to tick (`checkTicked`).
- **Accept all** accepts the open spelling, grammar and house-style edits only; flagged changes and rewrites are accepted one by one. **Dismiss** hides a suggestion; a dismissed one stays dismissed when the model suggests it again.
- What is accepted goes into the form (below). A block edited by hand stays an edit, with the change made in its text.
- The record is `caseState.proofread`, saved with the case (the Sheet's `case_json` column): `{ v: 2, at, by, seconds, hashes, items, dropped, dismissed }`. `by` names the model and Han Slide's version; `hashes` are FNV-1a fingerprints of each block proofread, not the text; `items` are the model's suggestions with their status. A rewrite's text is kept only while it is open, so the case stays within one Sheet cell. Rule checks are worked out again whenever the report is shown, so only their dismissals are kept.
- Checks shows when the report was proofread and which sections have changed since. **Copy for LIS** asks before copying while suggestions are open, and says when the report has changed since it was proofread.

## Into the form

`acceptProof` takes what is accepted block by block. The block's text as accepted is reached one change at a time (`writeBack`, with the word differences of `src/textdiff.js`). For each change the form is searched for the one value that prints it (a typed box, a number, a choice, a tick, the comment or the pasted macroscopy) and the report is generated again; the value is kept when the block then reads exactly as accepted. It is set as typing or clicking it would set it, with linked defaults, derived fields and dependent lists, and a changed pasted macroscopy fills its fields again. Boxes of the part holding the same typed text as the one changed (a size typed twice, which the template compares) are also tried changed with it. Words a rewrite takes out in one place and puts back in another (a sentence moved) are taken as one change (`joinMoves`): it goes into typed text that holds all of it, and is otherwise kept as one proofreading change, made whole or not at all; a choice, number or tick is never changed for it, as that would set its facts wrong. Where no value prints just that change, one that makes it with at most four other changes the form ties to it in the block (200 characters together; a size moving the stage) is taken, and the note says what else changed.

What no value gives (the template's own wording, most of a rewrite's sentences, a moved sentence) is kept as a proofreading change over the form's text: `caseState.patches[block]`, a list of `{ find, replace }`, each found once in the block's text. The engine makes them after the form's text and the LIS text are in and before manual edits (`applyPatches`), and reports what it made and what no longer fits (`out.patched`). The block is tagged "proofread changes" and still follows the form:

- A later form change inside a patch's text is carried into the patch where its words allow (`carryPatches`). An open rewrite is carried over a form change or an accepted edit the same way (`carryRewrites`); one that cannot be is no longer offered.
- A patch that no longer fits the text the form gives is left out and listed in Checks; it fits again if the form goes back.
- **Revert** in the block takes its patches out, after a confirmation; what went into the form stays.

A block that cannot be made to read as accepted in these ways prints the accepted text as an edit, as before. After each Accept a note in the Proofreading box says what went into the form ("Into the form (Macroscopic description): Lesion size (cm): "0.8" → "0.9"."), what else the form changed, and what is kept over the form's wording. A block unchanged since it was proofread keeps counting as proofread.

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

`tests/proofread.test.js`: rule checks on made-up text (one of each), the protected-word guard (number, side, negation, grade and diagnosis changes become checks; spelling, "Sections show" and "There is no evidence of" pass), parsing a fenced, a cut-off and an untidy answer, unique and whole-word application, the record (fingerprints, changed sections, kept dismissals), the question's tags and size limit, and no rule finding in any template example or golden fixture report. `tests/hanslide.test.js`: the client against a stubbed `fetch` (off sends nothing; status; proofread; each error). `tests/writeback.test.js`: typed text, numbers, choices, ticks and the pasted macroscopy put back into the form; a knock-on change; two boxes holding the same text changed together; a moved sentence kept as one patch with the form's choice left as it is, and carried over a later change inside it; template wording kept as patches; patches carried over form changes, and left out when they no longer fit; a rewrite's text carried. `tests/proofread.test.js` also covers flags with a corrected text, the guard on rewrites, tracked changes, changes of a fact and `checkTicked`. Two checks in `tools/qa-browser.js`, against a stand-in server on 127.0.0.1:47321 answering like Han Slide. The first: off asks nothing; Test; Ready asks once; rule and model suggestions show together; Accept, Dismiss and Accept all; the record and a dismissal survive a reload and a second proofread; Copy for LIS asks once while suggestions are open. The second, on the skin excision example: a flagged size goes into its field with the block untagged; the open macroscopic rewrite follows it; ticking half of the sentence it moves is refused with a message, and the move is kept over the form's wording with the orientation left as it is; two rewrites are kept over the form's wording with the change of a fact left unticked; a size change follows; another diagnosis lists the changes that no longer fit, and going back restores them; they survive a reload and go in the LIS payload; Revert takes one block's changes out.
