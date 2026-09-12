# Header navigation — system menus and pending placeholders

Built 2026-09-12 (Phase 8). User: "the top menu is getting too unwieldy to use"; chose **grouped by system** rows and placeholders that **open Generic free text**.

## Rows

| Row | Label | Kinds | Buttons (system groups, `SYSTEM_ORDER`) |
| --- | --- | --- | --- |
| top | Biopsy & cytology | `biopsy`, `cytology` | GI, GU, Gynae, Breast, Thoracic, H&N, Skin, Medical, Cytology |
| bottom | Resection & frozen | `benign resection`, `cancer resection`, `frozen`, `generic` | GI, HPB, GU, Gynae, Breast, Thoracic, H&N, CNS, Skin / soft tissue, Lymphoid, Frozen, Free text |

Small systems are merged per row (`ROW_MERGE` in `src/picker.js`): top — Renal + Hepatobiliary + Cardiovascular biopsies → **Medical**; bottom — Cardiovascular → Thoracic, Soft tissue → Skin, Endocrine → H&N. A button is highlighted (`aria-pressed`) when its menu holds the current template. Clicking opens a compact menu (`.sysmenu`): built templates first (pinned → kind → rank), then planned placeholders greyed with "pending build". Outside click or Escape closes it. The Cmd-K palette and the part-card selector are unchanged (built templates only). Row label "Resection & frozen ▾" still opens the palette filtered to non-biopsies.

Fit: both rows and the action buttons sit on two lines at ≥ 1360 px; below that the actions wrap under the rows. On phones (≤ 960 px) the menu is fixed and full-width.

## Placeholders — `templates/planned.json`

One entry per template still to build: `id, name, label, system, kind, roadmap` (roadmap section holding the card). `rowGroups()` appends them after the built items of their system; `standalonePlanned()` returns those outside both rows (today only **Autopsy**, kind `autopsy`, its own header button next to the top row). Clicking a placeholder calls `switchTemplate('generic')` and writes the intended template name into `specimenName`, with a toast naming the roadmap section. The card that builds a template removes its entry; `tests/picker.test.js` fails if a planned id is already in the manifest.

Planned as of 2026-09-12 — biopsies: Peritoneal nodule, Nasopharyngeal, Renal (medical), Liver (medical), Endomyocardial, Inflammatory dermatoses. Resections: Fallopian tube ectopic, Gastric carcinoma, Appendix carcinoma, Gallbladder carcinoma, Breast carcinoma, Radical prostatectomy, GI NET, Pancreas carcinoma, Bile duct carcinoma, Lip / oral cavity carcinoma, CNS tumour, Lymph node for lymphoma. Standalone: Autopsy report.

## Retired

`biopsyRowLayout`, `resectionStrip`, `STRIP_CAP`, `BIOPSY_ROW_*` and the pinned / recent strip. Pins now sort first inside their system menu; recents still feed the palette.
