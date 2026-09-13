# Header navigation — system menus and pending placeholders

Built 2026-09-12 (Phase 8). User: "the top menu is getting too unwieldy to use"; chose **grouped by system** rows and placeholders that **open Generic free text**.

## One row + a kind switch (2026-09-13, Phase 17)

The two stacked rows repeated the same system vocabulary (GI, GU, Gynae, Breast, Thoracic, H&N appeared in both) with different behaviour, and the header ran 111 px at 1920 and 164 px at 1280. The header is now **one row**: brand → **Biopsy / Resection** segmented switch (`#mode-top` / `#mode-bottom`) → system menus (`#system-row`) → Search → case identity → actions. The switch picks which row's groups the system menus show; `rowOfKind(kind)` in `src/picker.js` maps a template kind to its side, and `state.navMode` follows the open template unless the user picks the other side for that same template (`state.navModeFor`). The old "Resection & frozen ▾" browse dialog is retired — Cmd-K search covers whole-catalogue browsing.

Other changes: the system holding the open template is a filled primary pill (was a faint tint, near-invisible in dark); chips are 13 px with 6 px × 7 px padding and a 32 px hit target; placeholders carry a dot (`.pending-dot`) instead of a "PENDING BUILD" caps tag; Search is a wider field with its ⌘K hint; the case accession, status and Drive save state sit at the right of the bar (`#case-id`, click to focus the accession field); Save carries its own dot — amber unsaved, green saved; the account button is an avatar (initial when signed in).

Fit: every control in the bar is 36 px tall (chips and switch segments are 30 px inside a 3 px well), so the row is a single 36 px band and the header is 57 px. One row at ≥ 1600 px on both sides of the switch, and at ≥ 1440 px on the biopsy side; below that it sheds width in steps — ≤ 1600 px Example / New / Open collapse into a **Case ▾** menu (`#btn-case-menu`, whose items click the inline buttons so they stay the single source of truth), Search drops to its icon and the wordmark to the logo alone; ≤ 1450 px the save-state text drops to its dot. Where it must wrap the bar gives two compact lines (99 px) with the right-hand group right-aligned. The header gains a shadow once the page scrolls (`.topbar.scrolled`).

## Rows (both sides of the switch)

| Row | Label | Kinds | Buttons (system groups, `SYSTEM_ORDER`) |
| --- | --- | --- | --- |
| top | Biopsy & cytology | `biopsy`, `biomarker`, `cytology` | GI, GU, Gynae, Breast, Thoracic, H&N, Skin, Medical, Biomarkers, Cytology |
| bottom | Resection & frozen | `benign resection`, `cancer resection`, `frozen`, `generic` | GI, HPB, GU, Gynae, Breast, Thoracic, H&N, CNS, Skin / soft tissue, Lymphoid, Endocrine, Frozen, Generic |

Small systems are merged per row (`ROW_MERGE` in `src/picker.js`): top — Renal + Hepatobiliary + Cardiovascular biopsies → **Medical**; bottom — Cardiovascular → Thoracic, Soft tissue (incl. bone and paediatric sarcomas) → Skin. Endocrine has its own bottom-row button since the QMH endocrine set was planned. A button is highlighted (`aria-pressed`) when its menu holds the current template. Clicking opens a compact menu (`.sysmenu`): built templates first (pinned → kind → rank), then planned placeholders greyed with "pending build". Outside click or Escape closes it; long menus scroll (max-height `100vh − 130px`). The Cmd-K palette and the part-card selector are unchanged (built templates only). Row label "Resection & frozen ▾" still opens the palette filtered to non-biopsies.

Fit: both rows and the action buttons sit on two lines at ≥ 1360 px; below that the actions wrap under the rows. On phones (≤ 960 px) the menu is fixed and full-width.

## Placeholders — `templates/planned.json`

One entry per template still to build: `id, name, label, system, kind, roadmap` (roadmap section holding the card). `rowGroups()` appends them after the built items of their system; `standalonePlanned()` returns those outside both rows (today only **Autopsy**, kind `autopsy`, its own header button next to the top row). Clicking a placeholder calls `switchTemplate('generic')` and writes the intended template name into `specimenName`, with a toast naming the roadmap section. The card that builds a template removes its entry; `tests/picker.test.js` fails if a planned id is already in the manifest.

Coverage rule (2026-09-12, user request): **every page of the QMH cancer reporting templates site (https://awiloqmh.github.io/CancerReportingTemplate/) is either built or has a placeholder**; each such entry carries `qmh` = the page stem. Neighbouring QMH pages are folded where one template will serve them: the five GI NET pages → `gi_net`; Stomach biomarkers + Stomach HER2 → `stomach_biomarkers`; Phyllodes (both editions) → `phyllodes`; distal + perihilar bile ducts → `bile_duct_carcinoma`. Paediatric tumours sit under their organ system with "(paediatric)" in the name. Biomarker / molecular pages are kind `biomarker` under a **Biomarkers** button in the top row (Breast biomarkers is already built inside the breast templates). Skin SCC (HN page) sits under Skin.

Planned as of 2026-09-12 (72 entries) — original biopsies: Peritoneal nodule, Nasopharyngeal, Renal (medical), Liver (medical), Endomyocardial, Inflammatory dermatoses. Resections: Fallopian tube ectopic, Gastric carcinoma, Appendix carcinoma, Gallbladder carcinoma, Breast carcinoma, Radical prostatectomy, GI NET, Pancreas carcinoma, Bile duct carcinoma, Lip / oral cavity carcinoma, CNS tumour, Lymph node for lymphoma. Standalone: Autopsy report.

## Retired

`biopsyRowLayout`, `resectionStrip`, `STRIP_CAP`, `BIOPSY_ROW_*` and the pinned / recent strip. Pins now sort first inside their system menu; recents still feed the palette.
