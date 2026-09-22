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

1. Double-click `tools/lis-bridge.ahk`. A syntax error shows immediately with a line number; a tray
   icon and nothing else means it loaded.
2. Set `LIS_WIN` to include the window title. `ahk_exe wfica32.exe` alone matches **every** published
   application open on the machine, so the hotkeys would fire inside all of them.
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
