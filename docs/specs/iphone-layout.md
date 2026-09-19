# iPhone layout

The app is used from a phone between cases. Until now the layout only collapsed to one column at
960 px, which is a narrow desktop, not a phone: the system row and the kind switch took two bands of
a small screen, the report pane sat below a long form where it was never seen, and the controls were
36-40 px tall against Apple's 44 px minimum.

This is a responsive pass on the same page. No separate app, no framework, no user-agent sniffing,
no service worker.

## The compact layout

One breakpoint, `max-width: 700px`, called compact. Above it nothing changes: the 960 px one-column
rule, the 1400 px three-column rule and the 2000 px ultrawide rule are untouched, and the desktop
screenshots are byte-identical.

Compact does six things.

**The header loses its rows.** The kind switch (Biopsy / Resection) and the system row are hidden and
the search button becomes a full-width **Templates** button opening the palette that already exists.
The palette is the template sheet on a phone — it searches every template by name and alias, which
the two rows cannot do at this width. Case / New / Open are already behind the Case menu below
1600 px; Save, the account button, Settings and the theme toggle stay in the bar.

**The form and the report become two tabs.** `body[data-mview]` is `case` or `report`; a sticky tab
strip under the header switches it. In `case` the report pane is not rendered to the screen, in
`report` the case and histology columns are not. The tab strip is two buttons, 44 px, full width.

**A bottom action bar.** Fixed to the bottom edge with `env(safe-area-inset-bottom)` padding: Copy
diagnosis, Copy full report, Save. These three are the whole reason the app is open on a phone. They
delegate to the existing header and report buttons rather than duplicating their handlers, so the
copy path, the toast and the save state are the same code. The workspace gains bottom padding so the
bar never covers the last field.

**Touch targets.** Buttons, icon buttons, chips, the mode buttons and the tab strip go to 44 px in
compact. Inputs, selects and textareas go to 16 px, below which iOS Safari zooms the page on focus
and then leaves it zoomed.

**Full-width overlays fit.** The palette, the settings dialog, the CNS pathway chart and the photo
lightbox size against the viewport in compact. The pathway chart has a fixed 1200 px drawing box by
design, so it scroll-pans horizontally rather than shrinking to illegibility.

**Standalone mode.** `viewport-fit=cover` with safe-area insets on the header and the bottom bar,
`theme-color` for both colour schemes, an apple-touch-icon, and `manifest.webmanifest` with
`display: standalone`, so Add to Home Screen opens without browser chrome.

## What is not decided here

**Google sign-in in standalone mode.** The Drive flow uses the Google Identity Services popup. In an
iOS home-screen app a popup may open in a detached browser view and never return the token, in which
case the redirect flow is needed instead. This cannot be settled in headless Chromium. Until it is
checked on the device, the app is used from a Safari tab, where the popup flow is known to work.
Record the result here.

**Clipboard.** `navigator.clipboard.writeText` on iOS requires the write to happen inside the user
gesture. The bottom-bar buttons forward the tap synchronously to the existing button, which keeps the
gesture, but iOS is stricter than Chromium about what counts. Record the result here.

## Measurements to take on the device

| | Expected | Measured |
|---|---|---|
| iPhone 14 / 15 / 16 portrait CSS width | 390 px | |
| iPhone Pro Max portrait CSS width | 430 px | |
| Safari visual viewport height with the bar showing | ~745 px at 390 wide | |
| Sign-in in a Safari tab | popup returns | |
| Sign-in from Add to Home Screen | unknown | |
| Copy diagnosis | clipboard set | |
| Save to Drive | file written | |
| Open a saved case | list loads | |

## Verified in QA

`npm run qa` drives the compact layout at 390x844 and 430x932 on the real app: the tab strip appears,
the report is hidden on the Case tab and the form on the Report tab, the bottom bar copies the
diagnosis, no page scrolls horizontally, and every visible control is at least 44 px tall. The
desktop run at 1440 px is unchanged and runs first, so a compact regression cannot be mistaken for a
desktop one.

## iPhone Duo

Deferred — see the roadmap card in Later. The outer display is a compact viewport and is covered
here; the inner display and Split View are not, and no constant in this spec is to be reused for them
until the device is measured.
