# Three-column layout — case + macroscopy | histology | report

Requested 2026-09-12: "arrange into 3 columns: accession and macroscopy on the left, histology etc in the middle, report on the right … start with breast cancer template first."

## Layout

- `main.workspace` is a CSS grid with named areas. Below 1400 px it keeps the previous two columns (`case` above `histo` on the left, sticky `report` on the right); at or above 1400 px it becomes `case | histo | report` (0.85 / 1.2 / 0.95 fr, max width 1960 px). Below 960 px everything stacks.
- Left (`section.case`): accession, status, Specimen intake, the Clinical history / LIS macroscopic / block key boxes, case-level fields, then `#macro-panel` — the active part's specimen-and-macroscopy fields, headed "Part A · specimen and macroscopy".
- Middle (`section.histo`): part tabs, the part head (template picker, Add breast synoptic / Stage this part, Reset, Remove), the remaining field groups, then report options and comment snippets.
- Right (`section.report`): unchanged. The sticky offset now follows the real header height (`--topbar-h`, set by a ResizeObserver) instead of a fixed 64 px, so the Report heading is no longer clipped under the two-row header.

## Column heads and the case card

Each column starts with a `.col-head` row of the same height (42 px, 12 px gap below): "Case", the part tabs, and "Report" with its copy buttons. The accession / status / Specimen paste / LIS-text boxes / case-level fields sit in a bordered `.case-card` styled like the part panel, so the three cards begin on the same line.

## Which fields move left

A schema opts in with

```json
"layout": { "macroGroups": ["Specimen and tumour"], "macroFields": ["specimenName"] }
```

`splitFields` in `src/app.js` renders the listed groups and ids into `#macro-panel` (only when the wide media query matches; otherwise the panel is hidden and the part panel shows every field as before). Templates without `layout` are unchanged apart from the three-column grid itself. The same collapsible `details.field-group` markup is used, so group open/closed state is shared with the middle column.

## Opted in

- 2026-09-12 (Phase 9b): `breast_carcinoma`, then the same batch extended to every large resection template — cancer resections `breast_dcis`, `phyllodes`, `lung_carcinoma` (group "Specimen and tumour"), `ovary_ft_peritoneum`, `endometrial_carcinoma`, `colon_resection`, `gist_resection` (group "Macroscopy"), and the organ-level benign resections `uterus_benign`, `placenta`, `aortic_valve_aorta`, `appendix`, `gallbladder`, `liver_benign`, `ovarian_cyst`, `salivary_benign`, `thyroid_benign`, `tonsils` (group "Macroscopy"); `specimenName` moves left in all of them.
- Not opted in (small excisions; all fields stay in the middle column): `breast_excision`, `skin_excision`, `skin_cyst`, `soft_tissue_benign`, `nasal_polyps`, `parathyroid`, `jaw_cyst`, `lymph_node`, `stoma`, `turbt`, `turp`, biopsies, cytology, frozen section. Any of these can opt in with the same `layout` line.
- The breast trio and the JSON-edited schemas carry the key after `kind`; `tests/liverbenign.test.js` asserts the key order and the layout value. `scripts/gen-endometrium-schema.py` is stale (it no longer reproduces `schemas/endometrial_carcinoma.json`), so that schema was edited directly.

## Packed forms (widescreen pilot, 2026-09-13)

Global changes (every template):

- `.workspace` max width `min(2400px, 100%)` at or above 1400 px; at or above 2000 px the columns rebalance to `0.8fr / 1.35fr / 1fr` with a wider gap, so the extra width goes to the form rather than to margins.
- Report blocks use a larger monospace clamp (`… / 46, 14.5 px`), `line-height: 1.6` and `font-variant-numeric: tabular-nums`.
- Checks is a `details` element with the count line as its `summary`, sticky at the top of the report column; the open state persists in `localStorage` key `signout.checks`. An issue that carries a `field` id renders as `li.issue.jump` and focuses that field when clicked.
- Settings gains **Form density** (comfortable / compact). Compact tightens the field and group spacing only; it is a display preference stored in `localStorage` key `signout.density`, never in the Drive config. About 10 % more form per screen.
- Alt+Down / Alt+Up jump to the next / previous visible field that still has no value, wrapping at the ends. Alt+Left / Alt+Right keep switching parts.

Per-template opt in:

```json
"layout": { "macroGroups": ["Macroscopy"], "macroFields": ["specimenName"], "pack": true }
```

`pack` applies only when the viewport is at least 1500 px (`packLayout` in `src/app.js`), below which the single-column form is still the right shape. When packing:

- each group's fields render in a `.field-grid` (`repeat(auto-fit, minmax(320px, 1fr))`), so a field that needs the width takes the row and the short ones pair up;
- `spanFull` in `src/formlayout.js` decides: textarea and multiselect always full, a select with more than 12 options full, a field with a `reference` gallery full, and an explicit `"span": "full" | "half"` on the schema field always wins;
- each group summary carries a `filled/shown` count (a tick when complete) and a finished group starts collapsed, unless the user has toggled that group before;
- a `.section-rail` of group pills sits above the form; each pill shows how many visible fields are still empty and scrolls to the group.

Rolled out on 2026-09-13 to every template that already splits its macroscopy - all 12 cancer resections (`breast_carcinoma`, `breast_dcis`, `phyllodes`, `lung_carcinoma`, `ovary_ft_peritoneum`, `endometrial_carcinoma`, `colon_resection`, `gist_resection`, `gastric_carcinoma`, `oesophageal_carcinoma`, `gallbladder_carcinoma`, `appendix_carcinoma`) and the 10 benign organ resections (`uterus_benign`, `placenta`, `aortic_valve_aorta`, `appendix`, `gallbladder`, `liver_benign`, `ovarian_cyst`, `salivary_benign`, `thyroid_benign`, `tonsils`). `tests/formlayout.test.js` asserts that the packed set and the macro-split set are the same 22 schemas, and that no other schema carries a `layout`. Biopsies, cytology, frozen section and the small excisions stay one field per row.

Templates with no field groups in the histology column (colon resection and the benign organ templates) pack as a single `.field-grid.loose` run with a slightly larger row gap, since there are no group summaries to break the form up. They get no section rail: the rail needs at least two groups.

Measured at 1920 px: the ovarian resection form went from 6713 px to 4397 px of scroll height (3940 px in compact) and the breast carcinoma resection to 4917 px, with identical report output.
