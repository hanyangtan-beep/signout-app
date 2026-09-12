# Three-column layout — case + macroscopy | histology | report

Requested 2026-09-12: "arrange into 3 columns: accession and macroscopy on the left, histology etc in the middle, report on the right … start with breast cancer template first."

## Layout

- `main.workspace` is a CSS grid with named areas. Below 1400 px it keeps the previous two columns (`case` above `histo` on the left, sticky `report` on the right); at or above 1400 px it becomes `case | histo | report` (0.85 / 1.2 / 0.95 fr, max width 1960 px). Below 960 px everything stacks.
- Left (`section.case`): accession, status, Specimen intake, the Clinical history / LIS macroscopic / block key boxes, case-level fields, then `#macro-panel` — the active part's specimen-and-macroscopy fields, headed "Part A · specimen and macroscopy".
- Middle (`section.histo`): part tabs, the part head (template picker, Add breast synoptic / Stage this part, Reset, Remove), the remaining field groups, then report options and comment snippets.
- Right (`section.report`): unchanged. The sticky offset now follows the real header height (`--topbar-h`, set by a ResizeObserver) instead of a fixed 64 px, so the Report heading is no longer clipped under the two-row header.

## Which fields move left

A schema opts in with

```json
"layout": { "macroGroups": ["Specimen and tumour"], "macroFields": ["specimenName"] }
```

`splitFields` in `src/app.js` renders the listed groups and ids into `#macro-panel` (only when the wide media query matches; otherwise the panel is hidden and the part panel shows every field as before). Templates without `layout` are unchanged apart from the three-column grid itself. The same collapsible `details.field-group` markup is used, so group open/closed state is shared with the middle column.

## Done so far

- `breast_carcinoma` (this batch). Other synoptic templates can opt in with one `layout` line in their schema builder; candidates are `breast_dcis`, `phyllodes`, `lung_carcinoma`, `ovary_ft_peritoneum`, `endometrial_carcinoma`, `colon_resection`, `gist_resection` and the benign resection "Macroscopy" groups.
