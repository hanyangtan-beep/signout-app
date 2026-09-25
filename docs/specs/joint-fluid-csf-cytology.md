# Joint fluid and CSF cytology — card

Moved from Next to Later by the user on 2026-09-25. The roadmap card said "card is the spec", so it is kept here word for word and can go back into Next unchanged when it is pulled. Counts are from the 2024–2026 LIS export of 4547 cases (`docs/case-mix-2026-09.md`).

### Joint fluid and CSF cytology                         Size: S; one card, two templates
Why:        **84 cases together, 1.8 per cent** — joint fluid 44 (knee 34, plus elbow, hip, shoulder) and CSF 40 (lumbar puncture and ventricular). Both are short, highly formulaic reports and both are typed by hand today.
Change:     two templates on the shared `generators/cytology.js`. `joint_fluid_cytology` — joint pick-list (knee, hip, elbow, shoulder, wrist, ankle) with side, volume, appearance (clear / turbid / blood-stained / purulent), total and differential cell counts as optional numbers, **crystal examination under polarised light** as a first-class field (none seen, monosodium urate — negatively birefringent needles, calcium pyrophosphate — positively birefringent rhomboids, both, not assessed) with the house sentence per result, findings (acute inflammation, histiocytes, synovial lining cells, no malignant cells), interpretation line; auto snippet for "crystals were sought under polarised light" and for a culture-correlation comment on a purulent aspirate. `csf_cytology` — specimen (lumbar puncture, ventricular, cisternal, shunt), volume, cytocentrifuge preparation line, cell count, findings (lymphocytes, neutrophils, monocytes / macrophages, no malignant cells, atypical cells, malignant cells), malignant categories (metastatic carcinoma, lymphoma / leukaemic infiltrate, primary CNS tumour) with the cell-block or flow-cytometry correlation sentence, and an explicit **low-volume sampling caveat** when volume is below the adequacy threshold. Neither carries a reporting-system category line (there is no house system in use for either).
Untouched:  the six built cytology templates.
Accept:     fixtures for a CPPD-positive knee aspirate, a negative knee aspirate, a CSF negative for malignancy, and a CSF with metastatic carcinoma; intake maps "Joint fluid, right knee" and "CSF, LP" top-1.
Verify:     tests + browser (light)
Ship:       with batch
Spec:       card is the spec
Carried over from the previous ordering, now ranked by the same case-mix measure.
