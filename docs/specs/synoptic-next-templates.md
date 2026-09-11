# Synoptic resections — next templates (stomach, prostate, breast, endometrium)

Moved verbatim from the phased roadmap on 2026-09-10.

Next templates in order of your volume: stomach → prostate (radical) → breast → endometrium → others as needed. Each one: save the QMH page, run the importer, curate the draft into a schema, write the generator against `src/staging/<protocol>.js`, add the QMH element-order test.

Also queued from the same phase: Gleason arithmetic validation (prostate) and Nottingham score validation (breast) when those templates land; "Upgrade part" (benign template → matching cancer resection, carrying macro / block key / shared fields) once the target templates exist.

## Endometrial carcinoma — FIGO reference staging (added 2026-09-11)

Source page: `GYN-Endometrium.html` (QMH). The page prints two stage groupings: the 2009 FIGO / AJCC-aligned list (I, IA, IB, II, IIIA–IIIC2, IVA, IVB) and the 2023 FIGO list (IA1–IA3, IAm POLEmut, IB, IC, IIA–IIC, IICm p53abn, IIIA1–IIIC2, IVA–IVC), plus ProMisE and TCGA molecular classification.

Decision: FIGO is not formally reported at the centre. The template reports AJCC pTNM (8th) in the SYNOPTIC REPORT block as for colon and GIST. Both FIGO stages are derived from the same entered elements and shown only as a reference line in the Checks panel:

- `FIGO 2009 (reference, not reported): IB`
- `FIGO 2023 (reference, not reported): IIC — aggressive histotype with myometrial invasion; would become IICm if p53abn confirmed`

Rules:

- Derivation inputs: histotype and grade (non-aggressive = low-grade endometrioid; aggressive = high-grade endometrioid, serous, clear cell, carcinosarcoma, undifferentiated / dedifferentiated, mesonephric-like, gastric-type mucinous), confinement to polyp / endometrium, myometrial invasion < or ≥ half, LVSI none / focal (< 5 vessels) / substantial (≥ 5), cervical stromal invasion, serosa / subserosa, adnexa (IA3 exception for low-grade endometrioid limited to uterus and ovary), vagina / parametria, pelvic peritoneum, node status by region with micro / macrometastasis, bladder or bowel mucosa, distant sites, and the molecular classifier (POLEmut → IAm when confined to corpus or cervix; p53abn → IICm when confined to corpus with any myometrial invasion). Unknown molecular status leaves the plain 2023 stage and adds the "would become … if" note.
- Output placement: Checks panel only, styled as info (not error / warn). Excluded from `report`, `Copy full report`, the Google Doc and the Sheet row. No case option to print it; if that changes, it is a new card.
- Tests: a rule table with one fixture per 2023 substage, the IA3 ovarian exception, IAm and IICm upgrades, and an assertion that the generated report text never contains "FIGO".
- Sources to record at build: FIGO 2023 endometrial staging (Berek JS et al., Int J Gynecol Obstet 2023) and the 2009 FIGO / AJCC 8th correspondence table.
