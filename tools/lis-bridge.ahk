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
;   Ctrl+Alt+H     Harvest: copy Specimen, History and Macroscopic into one payload.
;                  Put the caret in the FIRST of the three fields before pressing.
;                  Then click "Capture from LIS" in the app once.
;
;   Ctrl+Alt+L     Load the queue from the clipboard, after "Copy for LIS" in the app.
;   Ctrl+Alt+V     Paste the next block. Press once per field; move fields yourself.
;   Ctrl+Alt+R     Reset the queue to the first block.
;   Ctrl+Alt+Q     Show what is in the queue and where you are in it.
;
; The marker format is shared with src/lisbridge.js. Change one and you must change the other.
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
; Not HARVEST: AutoHotkey names are case-insensitive, so that would collide with Harvest() below
; and fail on load with "This Func cannot be used as an output variable". Guarded by a test.
HARVEST_FIELDS := ["SPECIMEN", "HISTORY", "MACRO"]
AUTO_NEXT   := false                   ; true = advance a field after each paste. Off on purpose:
                                       ; one wrong advance would put every later block in the wrong
                                       ; field. Turn it on only once the order is proven.

Q := { items: [], at: 0 }

; ---- harvest: LIS -> app --------------------------------------------------------------------
Harvest() {
    global HARVEST_FIELDS, FIELD_NEXT, PASTE_WAIT
    payload := "", blank := 0
    for i, label in HARVEST_FIELDS {
        A_Clipboard := ""
        Send "^a"
        Sleep 120
        Send "^c"
        got := ClipWait(2) ? Trim(A_Clipboard, " `t`r`n") : ""
        if (got = "")
            blank += 1
        payload .= "<<<" label ">>>`r`n" got "`r`n`r`n"
        if (i < HARVEST_FIELDS.Length) {
            Send FIELD_NEXT
            Sleep PASTE_WAIT
        }
    }
    A_Clipboard := payload
    if !ClipWait(2) {
        Flash("Could not put the payload on the clipboard")
        return
    }
    if (blank = HARVEST_FIELDS.Length)
        Flash("All three fields came back empty.`nDid Ctrl+A select inside the field?")
    else
        Flash("Harvested " (HARVEST_FIELDS.Length - blank) " of " HARVEST_FIELDS.Length " fields."
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
^!h::Harvest()
^!l::LoadQueue()
^!v::PasteNext()
^!r::ResetQueue()
^!q::ShowQueue()
#HotIf
