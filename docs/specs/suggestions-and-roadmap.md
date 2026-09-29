# Suggestions box and in-app roadmap (Phase 46)

Pulled by the user on 2026-09-29. Their four choices, asked before building:

| Question | Choice |
| --- | --- |
| Where suggestions are stored | A Google Form owned by the app's owner |
| How fresh the in-app roadmap is | Publish on every roadmap change |
| What the Roadmap button shows | A summary |
| Triage | Reviewed when the owner asks |

## Suggest a change

Entry points:

- Header icon (speech bubble, `#btn-suggest`): opens on **The whole app (system-wide)**. The active part's template is one pick away in **About**, and choosing it offers that part's choices.
- Each part's actions, before Reset: opens on that part's template. On phones (700 px and below) the header has room for one more icon, not two, so this is the only entry point there; **About** can still be switched to the whole app.

Dialog (`src/panels.js`, markup `#dlg-suggest` in `index.html`):

- **About**: the whole app, or any built template, grouped as the part picker groups them.
- **Type**: Error in the output · Wording change · Missing option or field · New template · Other.
- **Where** (optional, several): Form fields · Macroscopy · Microscopy · Diagnosis · Comment · Intake · Layout or navigation.
- **Suggestion**: required, 3000 characters at most.
- **Attach this part's form choices**: shown only when **About** is the part the dialog came from and that part has changed choices. It attaches one `Label [field id]: value` line per choice field (dropdown, tick box, multi-choice, grade) that is visible, differs from the template default and holds a value on the field's own option list. Free text, numbers, the specimen line and report text never reach the form, even if a choice field somehow held typed text. A preview shows exactly what goes.
- **Open the form** runs the patient-detail check, then opens the Google Form pre-filled in a new tab. The app never submits anything; the user presses Submit in Forms.

Patient-detail check (`suggestionWarnings` in `src/suggest.js`): docformat's `phiWarnings` rules (HKID with its bracketed check digit, an honorific followed by a name, a Hong Kong phone number, a date-of-birth mention) plus an accession or hospital-number shape (`S25-01234`, `HS26-012345`, `HN12345678`, an HKID without its check digit) and any run of seven or more digits. Clinicians' names after "Dr" pass, as in the frozen-section phone reports.

The form ("Sign-out app — suggestions", form id `1LFrHIihbJq12zOdsK8W7WxMJZ8CrQskwFvEJoykNZK8`) sits in the owner's Drive, and only the owner, as its editor, sees responses. Seven text questions (short answer, with Suggestion and Form choices as paragraphs; only Suggestion is required), in order, with the entry ids read from the published form on 2026-09-29:

| Question | Entry id | Pre-filled with |
| --- | --- | --- |
| Template | 674902609 | `Name (id)` or `The whole app (system-wide)` |
| Type | 1125631593 | the Type choice |
| Where | 1397005955 | the Where choices, comma-separated |
| Suggestion | 1135536539 | the text |
| Form choices | 1090571533 | the attachment, if ticked |
| Submitted by | 685570690 | the signed-in Google account, if any (editable in Forms) |
| App details | 229315778 | `Build YYYY-MM-DD (id) · template vVERSION · desktop or phone` |

All seven are text questions, so the pre-fill never depends on option lists kept in step with the app. If the form is rebuilt, read the entry ids again from its "Get pre-filled link" and update `FORM` in `src/suggest.js`; `tests/suggest.test.js` pins the URL shape.

Reviewing: the Forms API is disabled for the Google Cloud project behind the OAuth client (403 on 2026-09-29), so a review reads the responses in the owner's browser (Forms → Responses), or from a linked responses Sheet if the owner links one. Accepted items go into the roadmap like any other: errors as a fix card or into Now, ideas into Later as one line.

## Roadmap panel

- Header icon (folded map, `#btn-roadmap`), all layouts. Read-only; it never touches the case.
- `tools/build.js` parses `docs/roadmap.md` with `src/roadmap.js` and writes `dist/roadmap.json`: the summary plus `asOf`, the Hong Kong date of the roadmap's last commit (today if the file has uncommitted edits). A source checkout (no build id, as in `npm run qa`) fetches `docs/roadmap.md` and parses it in the browser with the same functions; the build id decides which, so neither path requests a file that is not there.
- Shown: the State line; **Now** in full (its note when empty, its cards open); **Next** cards; **Later** one-line items (with any indented sub-items) and cards; the ten newest **Done** lines, and how many more the full roadmap holds. Every card and long item is a `<details>` that expands. Next's build-order notes, Parked, Deployment and Risks stay in the file.
- Format it relies on (`docs/roadmap-template.md`): `## Now`, `## Next`, `## Later`, `## Done`; cards are `### Title   Size: …` followed by `Key:  text` rows; items are `- …` bullets, named by a leading bold span, else the text before the first `: `, else the first sentence; Done bullets open `- YYYY-MM-DD — `. `tests/roadmap.test.js` reads the live file, so a format change that would empty the panel fails the tests.
- Only `code` and bold spans are rendered; all text goes in through `textContent`.

Rule (in the roadmap's intro and Deployment notes): because the panel is built from the file, a roadmap change is rebuilt, deployed and published; other docs-only changes stay commit-only. The release gate is for code changes.

## Verification

- `tests/suggest.test.js` (10) and `tests/roadmap.test.js` (6).
- `tools/qa-browser.js` gains three checks: the Roadmap panel shows its four sections with ten Done lines; Suggest a change blocks an HKID and, with clean text, opens a `docs.google.com` pre-fill URL naming the template and the Where choice (window.open is intercepted, so nothing is submitted); at 390 px the header keeps Roadmap on one row and hides the header Suggest icon.
