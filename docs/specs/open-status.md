# Status from the Open list (2026-10-27)

User request, 2026-10-27: "within the 'open' dropdown, i would like the option to change the 'status' - draft/ready/signed". Built the same day as Phase 80.

Untouched: the Doc's report text, the row's saved time and the list order, Save, Save & new, opening a case by clicking its row, the Sheet's columns, the Google scopes and every fixture.

## What the user sees

- Each row of the Open list has a status menu (Draft, Ready, Signed) where its status label was, in the colours of the status pill in the top bar.
- Choosing a status writes it to Drive without opening the case. A line under the list says "S2604301 marked Signed", or why the status was not changed; a write that fails puts the menu back.
- The row keeps its time and its place. The time is still when the report was last saved.
- A click anywhere else on the row opens the case, as before. The line under the list also carries an error from opening a case, which a toast showed behind the dialog's shade.
- If the case on screen has that accession, its Status field and the top bar show the new status at once. A case saved and unchanged stays saved; one with unsaved edits keeps them, and its next Save writes the new status with them.
- A status the app does not know (a blank cell, or a word typed into the Sheet) shows as Draft, as the top bar shows it.

## What is written

- Round 1, together: the case's row, A to H, with its accession checked (a row seen in the list but moved since is looked up again), and the Doc's text, exported as plain text ([files.export](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export)).
- Round 2: one [values.batchUpdate](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchUpdate) writes the status column (C) and the saved case (H) with the new status. The saved time (B) is not written.
- Round 3, only once the row is written: the Doc's own text, with the status word in its last line changed (`Template: … · Status: signed · Saved …`), is uploaded back as a save uploads its text. Text typed into the Doc by hand stays; formatting added by hand is lost, as it is on every Save.
- A Doc that cannot be read or written (deleted, or not shared with the app), or whose status line was removed, is left as it is. The row is still written, and the line under the list adds "its Doc was not changed". A Doc that already shows the status is not written.
- The row names the Doc. If the list showed another, the row's Doc is the one changed.
- The Docs API is not used: the Google Cloud project enables only the Drive and Sheets APIs (`docs/google-setup.md`).

## Opening a case

- A case opens with the status in its row's status column when that holds Draft, Ready or Signed, in any letter case or spacing. A status changed from the list, or typed into the Sheet by hand, is the one it opens with. A blank or other value leaves the saved case's own status.

## If the sign-in has run out

- Choosing a status goes through Google's sign-in, as a save would, and comes back to the Open list. The status is not changed; choose it again.

## Checks

- `tests/drive_status.test.js`, 12 tests: the rounds and calls; the C and H values; the saved time and the other rows unchanged; the Doc written only after the row, with only its last line changed; a Doc deleted, without its status line, already right or refused; a Sheet sorted by hand; the row's Doc over the list's; a row with no Doc or saved case; an unknown status or case refused with nothing written; a case opening with its status column. Two faults made on purpose were caught: opening without the status column (1 test failed) and the Doc written alongside the row (4 failed).
- Browser (`tools/qa-browser.js`): two cases saved through the app to a fake Google that keeps the Sheet and the Docs. Signed chosen in the list writes C and H and the Doc's last line, keeps the time and the order, does not open the case, and leaves the keyboard on the menu. The case on screen follows and stays saved. A refused write puts the menu back and says why. The row then opens as Signed. Screenshots in light, dark and at 390 px.
