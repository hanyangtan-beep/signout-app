# LIS clipboard bridge

Moving text between the app and the LIS in both directions, across a Citrix boundary.

## What the LIS turned out to be

Window Spy over a report entry field reports:

```
ahk_class   Transparent Windows Client
ahk_exe     wfica32.exe
ClassNN     (none)
```

`wfica32.exe` is the Citrix ICA client and "Transparent Windows Client" is the class of a seamless
published-application window. There is no ClassNN because there is no control: the window is a
picture of a screen being drawn on a server. Field advance in the LIS is **Ctrl+]**, not Tab, which
is what you would expect when the report fields are multi-line free text and Tab has to insert a
tab character.

This rules out, permanently and from the client side:

- `ControlGetText` / `ControlSetText` — no controls to address.
- UI Automation — the accessibility tree lives on the server.
- Any emulator or vendor automation API — no local handle on the application.

Two channels remain, and both were measured working in both directions on 2026-09-22:

- **The clipboard.** Citrix clipboard redirection is bidirectional by default and separately
  restrictable per direction; here both directions pass and line breaks survive.
- **Simulated keystrokes**, in event mode with a real key delay. `SendInput` is near-instantaneous
  by design and is dropped or reordered crossing the network.

## The payload format

One format, both directions, defined in `src/lisbridge.js` and split again by
`tools/lis-bridge.ahk`. A marker on its own line, then the text:

```
<<<SPECIMEN>>>
Antrum

<<<HISTORY>>>
Epigastric pain. Rule out H. pylori.

<<<MACRO>>>
Received in formalin are three grey tissue fragments,
the largest measuring 3 mm.
```

Markers are plain readable text rather than a control character, because the Citrix clipboard is a
text channel of unknown fidelity and a marker you can read in Notepad is one you can debug when a
field arrives empty. Surrounding whitespace on a marker line is tolerated. Several spellings reach
the same box (`HISTORY` / `CLINICAL`, `MACRO` / `MACROSCOPIC` / `GROSS`). A repeated marker appends.
An unknown marker is reported rather than dropped silently, so a rename on one side surfaces as a
warning instead of a box that mysteriously stays empty.

**A change to the format needs the same change in both files.** `tests/lisbridge.test.js` holds a
round-trip test that splits a built payload with the same pattern the script uses, so a one-sided
change fails a test first.

Those tests also read `tools/lis-bridge.ahk` as text, because nothing here can run AutoHotkey. They
assert the script's own splitting pattern accepts every marker the app emits, that every field read
reaches a capture box, that every report block has exactly one destination, that the fill walk
anchors and confirms before it pastes, that it never overwrites a filled field, that the read helper
cannot write, that the probe is read-only, that it sends in event mode with a key delay, that field
advance is Ctrl+] and that `LIS_WIN` carries a title rather than bare `wfica32.exe`. Beyond text,
`npm run validate:ahk` runs the real AutoHotkey v2 parser over the script under Wine, and it is a
release gate. They also assert **no variable shares a name with a function**: AutoHotkey
names are case-insensitive, and the first version shipped with a `HARVEST` array above a `Harvest()`
function, which the launcher rejected outright with "This Func cannot be used as an output
variable". Every JavaScript test passed and the script was dead on arrival — the half of this
feature that runs on Windows needs its own guards.

## Out: app to LIS

`Copy for LIS` in the report column emits every block that has text, in report order, as one marked
payload. Empty blocks are skipped rather than emitted empty, so the walk never has to guess whether
a silent block means "nothing to say" or "not generated".

On the LIS side, `Ctrl+Alt+L` loads the queue and `Ctrl+Alt+V` pastes the next block wherever the
caret happens to be. One block per keypress, and **you** move between fields.

That is a deliberate choice. Automatic field advance is in the script as `AUTO_NEXT`, switched off:
one wrong advance would put every later block in the wrong field, and a diagnosis in the wrong
field of a live case is the failure mode worth spending keystrokes to avoid. It also means the
bridge never needs to know the LIS field order — the caret decides.

Each paste is one atomic clipboard handoff rather than a few thousand simulated keypresses, which
is the only reason this is trustworthy over a remote session.

## In: LIS to app

`Capture from LIS` under the Specimen box reads the clipboard and behaves two ways:

- **A marked payload** (from `Ctrl+Alt+H`) fills Specimen, Clinical history and Macroscopic at once.
- **A plain copy** of a single field has no markers, so it fills the first empty box in the order
  Specimen → Clinical history → Macroscopic → Block key. Copy a field in the LIS, click once, repeat.
  When every box holds text it says so rather than overwriting.

A captured Specimen re-runs the intake strip, and a captured Macroscopic refills the macro fields
through `applyMacroToCase`, exactly as a typed one does. Clipboard read needs permission the browser
grants only on a gesture in a secure context; a refusal falls back to a message telling you to paste
into the boxes directly.

`phiWarnings` runs at capture, not only at Drive save. This text came straight out of the clinical
system, so a name or HKID that travelled with it is worth flagging at the moment it arrives.

## First run

### Getting the harvest into the app

The script's hotkeys are registered inside `#HotIf WinActive(LIS_WIN)`, so none of them fire anywhere
but the LIS. The return leg is therefore an app-side shortcut: **Cmd/Ctrl+Shift+V** does exactly what
the **Capture from LIS** button does. It is ignored while the caret is in a text box, where that
combination is the browser's own paste-without-formatting.

So the round trip is Ctrl+Alt+H in the LIS, alt-tab, Ctrl+Shift+V in the app.

### The screen table

`FIELDS` in the script is the report entry screen, one row per field in `Ctrl+]` order. It is the
only place the layout is written down and it drives both directions — `get` is what the harvest
reads out of a field, `put` is which report blocks the fill walk writes into it. The house order:

| # | Field | reads | writes |
|---|---|---|---|
| 1 | Clinical history | HISTORY | |
| 2 | Pre-op diagnosis / operation | | |
| 3 | Specimen(s) | SPECIMEN | |
| 4 | Gross examination | MACRO | MACRO + BLOCKKEY |
| 5 | Frozen section diagnosis | | INTRAOP |
| 6 | Microscopic examination | | MICROSCOPY |
| 7 | Diagnosis | | DIAGNOSIS |
| 8 | Comments | | COMMENT |
| 9 | Others | | |

The block key has no field of its own, so it rides at the end of the gross examination. Specimen(s)
is read but never written back: that field is the clerical entry the app copied in the first place.

`Ctrl+Alt+P` walks the screen and dumps each field next to this table, so the two can be compared
after any LIS change. A row in the wrong place misfiles text in both directions.

### Why the fill walk asks before it types

`Ctrl+Alt+F` counts `Ctrl+]` presses from wherever the caret is. A caret in the wrong field puts
every block one or more fields out, and **checking the destination is empty does not catch that** —
on an unreported case the wrong fields are empty too, so the check passes and the diagnosis lands in
the wrong box. Emptiness only catches misalignment when it happens to hit a filled field, which is
the rare case rather than the normal one.

So the anchor is the starting field itself: it is read back and shown in the confirmation dialog
before anything is typed. The person reading it knows what the case says. A test asserts the order —
anchor read, then dialog, then focus returned to the LIS, then the first paste.

Separately, a destination that already holds text is left alone and reported, because a frozen
section diagnosis typed at the time of the frozen is the usual case rather than an error.

1. Set `LIS_WIN` to include the window title. `ahk_exe wfica32.exe` alone matches **every** published
   application open on the machine, so the hotkeys would fire inside all of them. Title first, then
   the criteria, one space between. `SetTitleMatchMode 2` means a fragment matches anywhere in the
   real title, so use a short stable one — the house title carries a session id
   (`anptq705---thy005`) that will not survive a reconnect, and a title that stops matching fails
   silently: the script loads, the hotkeys do nothing.
2. Double-click `tools/lis-bridge.ahk`. A syntax error shows immediately with a line number; a tray
   icon and nothing else means it loaded.
3. Run `Ctrl+Alt+H` on a training case and paste the result into Notepad before clicking Capture.
   What you are checking is whether Ctrl+A selects inside the field or selects the whole screen. If
   the payload contains patient demographics, Ctrl+A is grabbing too much and the harvest needs to
   be a mouse selection per field instead.
4. Raise `SetKeyDelay` and `CLIP_WAIT` if characters go missing or a paste arrives as the previous
   block. Those are the two timing knobs; everything else is deterministic.

## Bounds

Patient text crossing from the LIS into the app means it can reach Google Drive on save. The harvest
takes three named fields and never a whole-window grab, so demographics do not enter the clipboard
in the first place, and the capture-time identifier check is there to catch what does. Whether the
transfer is permitted at all is a local governance question, not a technical one.
