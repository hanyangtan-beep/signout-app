#Requires AutoHotkey v2.0
#SingleInstance Force
;
; Sign-out app <-> LIS clipboard bridge.
;
; The LIS is a Citrix published application: ahk_class "Transparent Windows Client",
; ahk_exe wfica32.exe, and Window Spy shows no ClassNN for any field because the window is a
; picture of a screen drawn on a server. ControlGetText and UI Automation therefore have nothing
; to read, and the clipboard is the entire interface. Both directions were measured working.
;
; Because the session is remote, every keystroke crosses a network. SendInput is near-instantaneous
; by design and gets dropped or reordered on the way, so this script uses event mode with a real
; key delay, and moves text as ONE clipboard paste per field rather than typing thousands of
; characters. A dropped character in a diagnosis is not a cosmetic problem.
;
; Nothing here runs unattended. Each field is one keypress from you, so you see every paste land.
;
; ---------------------------------------------------------------------------------------------
; HOTKEYS                                         (all of them only inside the LIS window)
;
; Everything is driven by the FIELDS table below, which is the report entry screen written down
; once: which fields to read out, and which report block belongs in each. Caret in field 1 for
; both walks.
;
;   LIS -> app
;   Ctrl+Alt+H     Harvest: read the fields FIELDS marks with a `get` into one payload,
;                  then click "Capture from LIS" in the app once.
;
;   app -> LIS
;   Ctrl+Alt+L     Load the queue, after "Copy for LIS" in the app.
;   Ctrl+Alt+F     Fill: walk the screen and put every block in its own field. Reads the
;                  starting field back and shows it first - if that is not field 1, cancel.
;                  A field that already holds text is left alone and reported.
;   Ctrl+Alt+V     Paste the next block wherever the caret is, one field at a time. For
;                  anything irregular: an addendum, one corrected field, a screen that does
;                  not match FIELDS.
;   Ctrl+Alt+R     Reset the queue to the first block.
;   Ctrl+Alt+Q     Show what is in the queue and where you are in it.
;
;   setup
;   Ctrl+Alt+P     Probe: walk PROBE_DEPTH fields and dump each one next to the FIELDS table,
;                  so the two can be compared. Read-only. Run after any change to the LIS.
;
; The marker format is shared with src/lisbridge.js. Change one and you must change the other;
; tests/lisbridge.test.js reads this file and fails if they drift. `npm run validate:ahk` runs the
; real AutoHotkey parser over it, because a script that will not load passes every other check.
; ---------------------------------------------------------------------------------------------

SendMode "Event"          ; SendInput is dropped by Citrix
SetKeyDelay 60, 50        ; raise both if characters go missing
SetTitleMatchMode 2

; ---- settings -------------------------------------------------------------------------------
; Title first, then ahk_exe, one space between. SetTitleMatchMode 2 above means the title only has
; to appear somewhere in the real title, so use a short stable fragment — not a session or server id
; that changes on reconnect, or the hotkeys silently stop firing. wfica32 alone would match EVERY
; published app you have open.
LIS_WIN     := "Anatomical Pathology ahk_exe wfica32.exe"
FIELD_NEXT  := "^]"                    ; the LIS field-advance key
CLIP_WAIT   := 300                     ; ms for Citrix to mirror a new clipboard into the session
PASTE_WAIT  := 250                     ; ms after a paste before the next keystroke
PROBE_DEPTH := 10                      ; how many fields Ctrl+Alt+P walks from the caret

; ---- the report entry screen ------------------------------------------------------------------
; One row per field, top to bottom, in the order Ctrl+] visits them. This is the only place the
; screen layout is written down, and it drives both directions:
;
;   get  what Ctrl+Alt+H reads out of this field, "" to walk past it
;   put  which report blocks Ctrl+Alt+F writes into it, [] for none. Two blocks in one field are
;        separated by a blank line, in the order listed.
;
; Verify with Ctrl+Alt+P after any LIS change. A row in the wrong place misfiles text.
; Names: SPECIMEN HISTORY MACRO BLOCKKEY for get; SPECIMENS MACRO BLOCKKEY INTRAOP MICROSCOPY
; MOLECULAR DIAGNOSIS COMMENT for put. A test checks every block has exactly one destination, or is
; named as deliberately unwritten (SPECIMENS and MOLECULAR, below).
FIELDS := [
;     screen field                          get          put
    { name: "Clinical history"            , get: "HISTORY" , put: [] },
    { name: "Pre-op diagnosis / operation", get: ""        , put: [] },
    { name: "Specimen(s)"                 , get: "SPECIMEN", put: [] },
    { name: "Gross examination"           , get: "MACRO"   , put: ["MACRO", "BLOCKKEY"] },
    { name: "Frozen section diagnosis"    , get: ""        , put: ["INTRAOP"] },
    { name: "Microscopic examination"     , get: ""        , put: ["MICROSCOPY"] },
    { name: "Diagnosis"                   , get: ""        , put: ["DIAGNOSIS"] },
    { name: "Comments"                    , get: ""        , put: ["COMMENT"] },
    { name: "Others"                      , get: ""        , put: [] }]

; The block key has no field of its own, so it rides at the end of the gross examination, which is
; where it sits in a released report anyway.
;
; Specimen(s) is read but not written back. The app got that text from this field in the first
; place, and it is the clerical entry - overwriting it with the app's own formatting is a change to
; someone else's data for no gain. Put "SPECIMENS" in its put list if you want the lettered version
; written back, and note it will then be skipped whenever the field already has text.
;
; MOLECULAR is the Molecular findings of a biomarker report (the HER2 DISH result lines, 2026-10-08).
; This screen has no such field, and where the biomarker report screen puts its own has not been
; probed, so the fill walk lists it under "No field for" to paste by hand rather than guess a row.
; Once Ctrl+Alt+P on a biomarker case shows the field, give it a row or add "MOLECULAR" to one.
AUTO_NEXT    := false                  ; Ctrl+Alt+V only: advance a field after each paste. Off on
                                       ; purpose - use Ctrl+Alt+F, which knows where each block goes.
SKIP_FILLED   := true                  ; Ctrl+Alt+F reads each destination first and leaves it alone
                                       ; if it already holds text, reporting which it skipped. A
                                       ; frozen section diagnosis typed at the time of the frozen is
                                       ; the usual case. Setting this false replaces field contents.

Q := { items: [], at: 0 }

; ---- probe: read the field order off the screen ----------------------------------------------
; Read-only. Ctrl+A, Ctrl+C, Ctrl+] and nothing else - it never types into the LIS. Run it on a
; training case with the caret in the first field you would start a harvest from, then paste the
; result into Notepad and number the fields you want.
ArrayJoin(arr, sep) {
    out := ""
    for i, v in arr
        out .= (i = 1 ? "" : sep) v
    return out
}

Probe() {
    global PROBE_DEPTH, FIELD_NEXT, PASTE_WAIT, FIELDS
    out := "LIS field probe: " PROBE_DEPTH " fields from the caret, in Ctrl+] order.`r`n"
        . "Check this against the FIELDS table in lis-bridge.ahk - one row per field below,`r`n"
        . "same order. A row out of place misfiles text in both directions.`r`n`r`n"
        . "Current table:`r`n"
    for i, f in FIELDS
        out .= "  " i ". " f.name
            . (f.get != "" ? "   reads " f.get : "")
            . (f.put.Length ? "   writes " ArrayJoin(f.put, " + ") : "") "`r`n"
    out .= "----------------------------------------------------------------`r`n`r`n"
    Loop PROBE_DEPTH {
        got := ReadField()
        out .= "--- field " A_Index " ---`r`n" (got = "" ? "(empty)" : got) "`r`n`r`n"
        if (A_Index < PROBE_DEPTH) {
            Send FIELD_NEXT
            Sleep PASTE_WAIT
        }
    }
    A_Clipboard := out
    if !ClipWait(2) {
        Flash("Could not put the probe on the clipboard")
        return
    }
    Flash("Probed " PROBE_DEPTH " fields.`nPaste into Notepad to see what is where.")
}

; ---- harvest: LIS -> app --------------------------------------------------------------------
; Reads the field, leaving it selected but unchanged. Returns "" for an empty field or a copy the
; session did not mirror in time - the caller cannot tell those apart, which is why a run that
; comes back all-empty says to probe rather than guessing.
ReadField(timeout := 2) {
    A_Clipboard := ""
    Send "^a"
    Sleep 120
    Send "^c"
    return ClipWait(timeout) ? Trim(A_Clipboard, " `t`r`n") : ""
}

Harvest() {
    global FIELDS, FIELD_NEXT, PASTE_WAIT
    last := 0
    for i, f in FIELDS
        if (f.get != "")
            last := i                          ; stop at the last field worth reading
    if (last = 0) {
        Flash("No field in FIELDS has a get name.`nNothing to harvest.")
        return
    }
    payload := "", want := 0, blank := 0
    for i, f in FIELDS {
        if (i > last)
            break
        if (f.get != "") {
            want += 1
            got := ReadField()
            if (got = "")
                blank += 1
            payload .= "<<<" f.get ">>>`r`n" got "`r`n`r`n"
        }
        if (i < last) {
            Send FIELD_NEXT
            Sleep PASTE_WAIT
        }
    }
    A_Clipboard := payload
    if !ClipWait(2) {
        Flash("Could not put the payload on the clipboard")
        return
    }
    if (blank = want)
        Flash("All " want " fields came back empty.`nCtrl+Alt+P will show what the walk is landing on.")
    else
        Flash("Harvested " (want - blank) " of " want " fields."
            . "`nSwitch to the app and click Capture from LIS.")
}

; ---- write-back: app -> LIS -----------------------------------------------------------------
LoadQueue() {
    global Q
    if !ClipWait(1) {
        Flash("Clipboard is empty. Click Copy for LIS in the app first.")
        return
    }
    text := StrReplace(A_Clipboard, "`r`n", "`n")
    items := [], label := "", body := ""
    for line in StrSplit(text, "`n") {
        if RegExMatch(Trim(line), "^<<<\s*([A-Za-z][A-Za-z0-9 _-]*?)\s*>>>$", &m) {
            if (label != "")
                items.Push({ label: label, text: Trim(body, " `t`r`n") })
            label := m[1], body := ""
        } else if (label != "")
            body .= (body = "" ? "" : "`r`n") line
    }
    if (label != "")
        items.Push({ label: label, text: Trim(body, " `t`r`n") })

    if !items.Length {
        Flash("No marked blocks on the clipboard.`nUse Copy for LIS, not Copy full report.")
        return
    }
    Q.items := items, Q.at := 0
    Flash(items.Length " blocks loaded.`nFirst: " items[1].label
        . "`nCtrl+Alt+V pastes it into wherever the caret is.")
}

PasteNext() {
    global Q, CLIP_WAIT, PASTE_WAIT, AUTO_NEXT, FIELD_NEXT
    if !Q.items.Length {
        Flash("Nothing loaded. Ctrl+Alt+L first.")
        return
    }
    if (Q.at >= Q.items.Length) {
        Flash("All " Q.items.Length " blocks pasted.`nCtrl+Alt+R to start again.")
        return
    }
    Q.at += 1
    item := Q.items[Q.at]
    if (item.text = "") {
        Flash("Skipped " item.label " — it was empty.")
        return
    }
    A_Clipboard := item.text
    if !ClipWait(2) {
        Q.at -= 1
        Flash("Could not set the clipboard. Nothing pasted.")
        return
    }
    Sleep CLIP_WAIT           ; Citrix mirrors the clipboard into the session on demand, not instantly
    Send "^v"
    Sleep PASTE_WAIT
    if (AUTO_NEXT && Q.at < Q.items.Length) {
        Send FIELD_NEXT
        Sleep PASTE_WAIT
    }
    ahead := Q.at < Q.items.Length ? Q.items[Q.at + 1].label : "nothing — that was the last"
    Flash("Pasted " Q.at " of " Q.items.Length ": " item.label
        . "`n" (AUTO_NEXT ? "Ctrl+Alt+V for: " : "Move to the next field, then Ctrl+Alt+V for: ") ahead)
}

; ---- fill: walk the screen and place every block in its own field -----------------------------
; The one-keypress write-back. Safe only because FIELDS says where each block goes AND the starting
; field is confirmed by reading it back before anything is typed. Ctrl+Alt+V stays for anything
; irregular - an addendum, one corrected field, a screen that does not match FIELDS.
FillFields() {
    global FIELDS, Q, CLIP_WAIT, PASTE_WAIT, FIELD_NEXT, SKIP_FILLED, LIS_WIN
    if !Q.items.Length {
        Flash("Nothing loaded.`nCopy for LIS in the app, then Ctrl+Alt+L.")
        return
    }
    have := Map()
    for i, item in Q.items
        have[StrUpper(item.label)] := item.text

    byIndex := Map(), last := 0, orphan := ""
    for i, f in FIELDS {
        text := ""
        for j, label in f.put {
            key := StrUpper(label)
            if (have.Has(key) && have[key] != "") {
                text .= (text = "" ? "" : "`r`n`r`n") have[key]
                have[key] := ""                ; mark placed
            }
        }
        if (text != "") {
            byIndex[i] := { name: f.name, text: text }
            last := i
        }
    }
    for i, item in Q.items                     ; anything loaded that FIELDS has no field for
        if (item.text != "" && have.Has(StrUpper(item.label)) && have[StrUpper(item.label)] != "")
            orphan .= (orphan = "" ? "" : ", ") item.label

    if (last = 0) {
        Flash("None of the loaded blocks has a destination in FIELDS.")
        return
    }
    ; ---- anchor -------------------------------------------------------------------------------
    ; Everything below counts Ctrl+] presses from HERE, so if the caret is not where this function
    ; assumes, every block lands one or more fields out. An empty-destination check cannot catch
    ; that: on an unreported case the wrong fields are empty too, so the check passes and the
    ; diagnosis goes into the wrong box. The only reliable anchor is the content of the starting
    ; field, read back and shown to the person who knows what the case says.
    here := ReadField(1.5)
    lines := ""
    for i, f in FIELDS
        if byIndex.Has(i)
            lines .= "    " i ".  " byIndex[i].name "   (" StrLen(byIndex[i].text) " chars)`n"
    msg := "CHECK THE CARET IS IN FIELD 1, " StrUpper(FIELDS[1].name) ".`n`n"
        . "That field currently reads:`n`n    "
        . (here = "" ? "(empty - so this cannot be verified from here. Look at the screen.)"
                     : SubStr(here, 1, 200) (StrLen(here) > 200 ? " ..." : ""))
        . "`n`nIf that is not the " FIELDS[1].name ", press Cancel: the walk counts fields from"
        . " this one and would put every block in the wrong place.`n`n"
        . "Then it fills " last " fields down:`n`n" lines
    if (orphan != "")
        msg .= "`nNo field for: " orphan "  - paste these yourself.`n"
    msg .= "`nA field that already holds text is "
        . (SKIP_FILLED ? "left alone and reported." : "REPLACED.") "`n`nContinue?"
    if (MsgBox(msg, "Fill the report screen", "OKCancel Icon?") != "OK")
        return
    ; The dialog took focus. Send nothing until the LIS has it back, or the first paste lands in
    ; whatever window is in front.
    WinActivate LIS_WIN
    if !WinWaitActive(LIS_WIN, , 3) {
        MsgBox("The LIS did not come back to the front. Nothing was pasted.", "Fill", "Icon!")
        return
    }
    Sleep 300

    done := 0, skipped := ""
    i := 1
    Loop last {
        if byIndex.Has(i) {
            p := byIndex[i]
            ; Read first. Ctrl+A has selected whatever is in the field, so the paste below would
            ; replace it, and some of these fields are legitimately written before sign-out.
            existing := SKIP_FILLED ? ReadField(1.5) : ""
            if (existing != "") {
                skipped .= "`n    " i ". " p.name " - already held " StrLen(existing) " chars"
            } else {
                A_Clipboard := p.text
                if !ClipWait(2) {
                    MsgBox("Could not set the clipboard at field " i ", " p.name ".`n"
                        . done " field(s) were filled before this. Nothing was overwritten.",
                        "Fill stopped", "Icon!")
                    return
                }
                Sleep CLIP_WAIT
                Send "^v"
                Sleep PASTE_WAIT
                done += 1
            }
        }
        if (i < last) {
            Send FIELD_NEXT
            Sleep PASTE_WAIT
        }
        i += 1
    }
    if (skipped != "")
        MsgBox("Filled " done " field(s).`n`nLeft alone because they already held text:" skipped
            . "`n`nPaste those yourself with Ctrl+Alt+V if they need replacing.`n`n"
            . "Read the screen before you save.", "Fill", "Iconi")
    else
        Flash("Filled " done " field(s).`nRead the screen before you save.")
}

ResetQueue() {
    global Q
    Q.at := 0
    Flash("Back to the first block.")
}

ShowQueue() {
    global Q
    if !Q.items.Length {
        Flash("Nothing loaded.")
        return
    }
    lines := ""
    for i, item in Q.items
        lines .= (i <= Q.at ? "  done  " : "  next  ") i ". " item.label
            . " (" StrLen(item.text) " chars)`n"
    MsgBox lines, "LIS queue — " Q.at " of " Q.items.Length " pasted"
}

Flash(msg) {
    ToolTip msg
    SetTimer () => ToolTip(), -2600
}

; ---- bindings ---------------------------------------------------------------------------------
#HotIf WinActive(LIS_WIN)
^!p::Probe()
^!h::Harvest()
^!l::LoadQueue()
^!f::FillFields()
^!v::PasteNext()
^!r::ResetQueue()
^!q::ShowQueue()
#HotIf
