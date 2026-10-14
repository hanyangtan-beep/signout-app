# Lymph node for lymphoma

Phase 71 (user request and pulled by the user 2026-10-14). Template `lymphoma_node`: "Lymph node for lymphoma (WHO-HAEM5)", short name "Lymph node · lymphoma work-up", menu label "Lymphoma" under Lymphoid in the Resection row (kind cancer resection, not staged). Schema 2026.10, 102 fields, written by `scripts/build-lymphoma-schema.mjs` (the JSON is the artefact); generator `generators/lymphoma_node.js`. It retires the "Lymphoma" placeholder in `templates/planned.json`. Morphology, immunophenotype and sources: `docs/reference/lymphoma_node-morphology.md` (WHO-HAEM5, ICC 2022, PathologyOutlines, Hans 2004 and the cut-off papers cited there). The roadmap card was an L, split into the two M cards below and built in one batch with the GVHD biopsy (`docs/specs/gvhd-biopsy.md`).

## Cards as pulled (word for word)

```text
### Lymph node for lymphoma — form, specimen and diagnosis (user request and pulled by the user 2026-10-14)   Size: M; Lymphoma pair (L → split, 1 of 2)
Why:        a lymph node sent for lymphoma opens the benign lymph node form, which has no lymphoma names, no slide-review line and no place for an immunophenotype. 107 released diagnoses in the 2021-2026 biopsy file and 35 in the 2024-2026 LIS export name lymphoma, 44 and 15 of them on a lymph node; about a third of those in the biopsy file are slides for review.
Change:     new template `lymphoma_node` (Lymphoid, cancer resection, menu label "Lymphoma"; retires the placeholder; not staged). Specimen: site, procedure (excision, excisional, incisional or core biopsy) and slides for review (hospital, reference number, H&E, immunostained and in situ hybridisation slide counts, blocks, date received), which add "for slide review (… x N slides from …)" to the specimen line and open the microscopy with the slides received. Macroscopy for tissue received in house: fresh or in formalin, the fresh tissue sent for flow cytometry, cytogenetics or molecular studies, size, cut surface, cores, blocks and block key. Morphology: architecture, growth pattern, cell size, cytology (centrocytes and centroblasts, Hodgkin and Reed-Sternberg cells, LP cells, hallmark cells, blastoid cells and others), background cells and features (necrosis, sclerosis, mitoses, starry sky, back-to-back follicles). Diagnosis: the WHO-HAEM5 entities in groups (reactive and tumour-like, mature B-cell, Hodgkin, T and NK, not further classified) with the follicular lymphoma grade and pattern and a DLBCL component, the classic Hodgkin subtype and BNLI grade, and the qualifiers (consistent with, in keeping with, suspicious for; recurrent; partial involvement). Intake: a lymph node line whose text or history names lymphoma (or PTLD, Hodgkin, DLBCL, CLL and the like) comes here; sentinel nodes and dissections do not.
Untouched:  `lymph_node` (benign and metastatic nodes) and its fixtures; the lymph node FNA form; every other template's routing.
Accept:     fixtures for a DLBCL excision, a follicular lymphoma core biopsy, a nodular sclerosis classic Hodgkin lymphoma, Kikuchi-Fujimoto disease and a slide review; the slide review prints the referral line and the received-slides opener; "Lymph node, left neck, excision" with "?lymphoma" goes here, and without it goes to `lymph_node` as today.
Verify:     tests + browser (light)
Ship:       with batch (Phase 71)
Spec:       `docs/specs/lymphoma-node.md`; grounding `docs/reference/lymphoma_node-morphology.md`
```

```text
### Lymph node for lymphoma — immunohistochemistry and ancillary studies   Size: M; Lymphoma pair (L → split, 2 of 2)
Why:        the immunophenotype decides the entity, and the report carries the cell of origin, the MYC and BCL2 percentages, Ki-67, EBER, FISH and clonality.
Change:     on `lymphoma_node`: an immunohistochemistry panel (pick the markers, then a result for each: positive, negative, subset, weak, not assessable), MYC and BCL2 percentages, the cells described (atypical lymphoid cells, Hodgkin and Reed-Sternberg cells, LP cells, or typed) and a free line for background cells and dendritic meshworks, all in the microscopy paragraph; Ki-67, the centroblast count with its field, and EBER in situ hybridisation. The synoptic block lists the panel marker by marker with the cell of origin. FISH for MYC, BCL2 and BCL6 and IG / TR clonality print in MOLECULAR FINDINGS; the flow cytometry correlation and the cell-of-origin method print in the Comment. The cell of origin follows the Hans algorithm unless chosen; snippets for MYC and BCL2 dual expression and for studies pending. Checks: a cell of origin against Hans, the follicular lymphoma grade against the centroblast count, MYC and BCL2 rearranged against the entity, classic Hodgkin lymphoma with CD30 negative or CD45 positive, cyclin D1-negative mantle cell lymphoma, Burkitt lymphoma with Ki-67 below 95%, nodal TFH-cell lymphoma without TFH markers, and a lymphoma with no immunohistochemistry.
Untouched:  card 1's specimen, macroscopy and diagnosis wording.
Accept:     the DLBCL fixture prints "non-GCB type" from CD10 negative, BCL6 positive and MUM1 positive; MYC 50% with BCL2 80% suggests the dual-expression snippet; FISH with MYC and BCL2 rearranged on a DLBCL, NOS raises a Check.
Verify:     tests + browser (light)
Ship:       with batch (Phase 71)
Depends on: Lymph node for lymphoma — form, specimen and diagnosis
Spec:       `docs/specs/lymphoma-node.md`
```

## Case mix (aggregate counts only)

- 107 released diagnoses in the 2021–2026 biopsy file and 35 in the 2024–2026 LIS export name lymphoma; 44 and 15 of them are on a lymph node. About a third of the lymph node ones in the biopsy file are slides for review.
- Fewer than 10 request lines in either export name lymphoma on the line itself, and none of them names a node. The clinical history, not the specimen line, carries the question, so the history decides the route.

## Routing and presets

- `src/intake.js` (`roleOf`): a part that takes the lymph node role goes to `lymphoma_node` when the line, the case prefix or the clinical history meets the form's `match.gate` (lymphoma, lymphoproliferative, LPD, PTLD, Hodgkin, NHL, DLBCL, CLL, SLL, MALT, PTCL, AITL, ALCL, Burkitt, lymphoid neoplasm, atypical lymphoid, Kikuchi, Castleman) and its `match.exclude` does not name a sentinel node, a dissection, lymphadenectomy or clearance, an aspirate (FNA, EBUS, TBNA) or a frozen section. Otherwise the part goes to `lymph_node` as before. Two-letter abbreviations (HL, FL, MCL) are left out of the gate: they mean other things on other request lines.
- The lymphoma form shares the node site words, so the role's "site named by another form" test skips it, as it skips `lymph_node` and `lymph_node_fna`. Without that, "Right inguinal lymph node" and a pelvic node in a debulking case lost the node role and fell to Generic (two intake tests caught it before release).
- Presets: the site from the line with the node, procedure and question words removed ("Lymph node, left neck, excision ?lymphoma", "core biopsy (query lymphoma)" and "excision r/o lymphoma" keep only the site); the procedure (excision, excisional, incisional or core biopsy); "Slides for review" from a review or consultation line.
- Routing compare against the Phase 70 build over every specimen line in both exports (13,882 lines): no line changes route. With a history, probe lines change as intended: a node with "?lymphoma", "r/o lymphoma", "Hodgkin lymphoma?", "NHL" or "known DLBCL" opens the lymphoma form (a cervical node probe with a DLBCL history had opened the cervix form); sentinel nodes, a neck dissection, a node FNA, a frozen section node and nodes with non-lymphoma histories keep their forms.

## Report

- SPECIMEN: "Lymph node, left neck, excision"; slides for review add "for slide review", and the diagnosis head adds the referral in brackets.
- MACROSCOPIC DESCRIPTION and BLOCK KEY for tissue received in house; a slide review opens the microscopy with the slides and blocks received instead.
- MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT: one paragraph (architecture, pattern, cell size, cytology, background, features, the stains on the cells described, MYC and BCL2 percentages, Ki-67, EBER, the overall features), then the lists: Immunohistochemistry marker by marker with Ki-67 and the cell of origin, and In situ hybridisation.
- MOLECULAR FINDINGS: FISH for MYC, BCL2, BCL6 and other probes, and IG / TR clonality.
- DIAGNOSIS: the specimen head and the entity line with its qualifier, grade or subtype and cell of origin ("- DIFFUSE LARGE B-CELL LYMPHOMA, NOS, non-GCB type"), wrapped at 80 characters.
- COMMENT: the flow cytometry correlation, the cell-of-origin method sentence and the snippets (MYC and BCL2 dual expression, suggested at MYC 40% or more with BCL2 50% or more; studies pending).
- The cell of origin follows the Hans algorithm (CD10, BCL6, MUM1; 30% of the lymphoma cells or more counts as positive) unless chosen.

## Checks

- Error: "Other" diagnosis not typed.
- Warning: slides for review without the referring hospital; no immunohistochemistry for a lymphoma; a cell of origin that differs from Hans; a centroblast count at odds with the follicular lymphoma grade; grade 3A with diffuse areas; MYC and BCL2 both rearranged on a DLBCL, NOS; MYC with BCL6 only; the double-hit entity without both FISH results; classic Hodgkin lymphoma with CD30 negative or CD45 positive; cyclin D1-negative mantle cell lymphoma; Burkitt lymphoma with Ki-67 below 95%; nodal TFH-cell lymphoma with no TFH marker positive; ALK and CD30 against the ALCL type; EBER against EBV-positive DLBCL.
- Info: Hans needs all three markers; MYC and BCL2 dual expression.

## Tests and fixtures

- `tests/lymphoma_node.test.js` (23 tests), with six golden fixtures in `tests/fixtures/lymphoma_node/`: a non-GCB DLBCL excision, a follicular lymphoma core biopsy, nodular sclerosis classic Hodgkin lymphoma, Kikuchi-Fujimoto disease, a slide review with partial follicular lymphoma and reactive follicular hyperplasia.
- Browser QA: "?lymphoma" opens the form with the site; GCB then non-GCB on CD10; the Hans line and method sentence; a plain node stays on the node form.

## Not built

- Reference galleries: the form has none yet.
- Extranodal lymphoma (gut, skin, spleen, tonsil) and bone marrow trephines stay on their own forms or Generic.
- The flow cytometry report itself; the form records only its correlation.
