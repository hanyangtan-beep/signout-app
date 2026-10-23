# Pituitary neuroendocrine tumour (PitNET) resection — sources (Phase 75, 23 October 2026)

Reference for the PitNET form (`pituitary_net`, Endocrine) and the hand-off from the Glioma form (`cns_tumour`). Nothing here is printed: the report carries only what is seen and what the stains show.

## Sources

- [QMH Cancer Reporting Template, Endocrine-PitNET](https://awiloqmh.github.io/CancerReportingTemplate/Endocrine-PitNET.html), saved as `docs/reference/Endocrine-PitNET.html` with the text dump `docs/reference/qmh/pitnet.txt`. The element order of the synoptic follows it.
- [CAP Protocol for the Examination of Specimens from Patients with Pituitary Neuroendocrine Tumor (PitNET), version 1.0.0.0, March 2025](https://www.cap.org/wp-content/uploads/2026/07/Pituitary.NET_1.0.0.0.REL_.CAPCP_.pdf?download).
- [Asa SL, Mete O, Perry A, Osamura RY. Overview of the 2022 WHO Classification of Pituitary Tumors. Endocr Pathol 2022;33:6–26](https://link.springer.com/article/10.1007/s12022-022-09703-7).

## How the form reads them

| Point | Source | Form |
|---|---|---|
| Types and subtypes by lineage (TPIT, PIT1, SF1, no distinct lineage) | QMH, CAP Table 1, WHO 2022 | Tumour type select, grouped by lineage; the synoptic prints "SF1-lineage pituitary neuroendocrine tumour, gonadotroph tumour" and the diagnosis "GONADOTROPH PITUITARY NEUROENDOCRINE TUMOUR (PitNET), SF1-lineage", after the house diagnosis wording |
| TPIT, PIT1 and SF1 are required to assign the lineage | CAP | Linked defaults put the lineage factor in "Positive, diffuse" and the other two in "Negative"; an information check when any of the three is not recorded; a warning when the lineage factor is negative or another factor is positive |
| Null cell tumour is a diagnosis of exclusion | CAP | All three factors default to negative; a warning when one is recorded positive |
| Keratin is required for PIT1-lineage, TPIT-lineage and null cell tumours; CAM5.2 is the usual stain | CAP | Keratin with extent, clone (default CAM5.2) and the QMH patterns; an information check when it is not recorded for those types |
| Keratin patterns: fibrous bodies in more than 70% (sparsely granulated somatotroph), perinuclear (densely granulated somatotroph, mammosomatotroph, mature plurihormonal PIT1-lineage), diffuse cytoplasmic (corticotroph), ring-like (Crooke cell) | CAP Table 1 | Pattern defaults follow the type; a warning when a sparsely granulated somatotroph tumour lacks the fibrous-body pattern or a densely granulated one has it |
| Crooke's hyaline change of the non-tumorous corticotrophs is required for corticotroph tumours | QMH, CAP | Shown for a TPIT-lineage type with adenohypophysis present; a warning when not recorded |
| Ki-67 by count of at least 500 tumour cells in hot spots, not by eye; manual count or image analysis | CAP | Field help text; the method is an optional comment snippet |
| Mitotic count per 2 mm2 | QMH, CAP | Field label carries the QMH counting note; prints "n per 2 mm2" |
| Invasion: bone, sinonasal (respiratory) mucosa, dura, brain tissue | CAP | Invasion with site; prints in the synoptic and as a diagnosis clause |
| Metastasis: cerebrospinal, liver, bone, other | QMH, CAP | Not printed when "Not applicable" |
| No grade and no stage | CAP | No grade field; the Glioma form's CNS WHO grade does not apply |

## Departures from the QMH order

- Tumour histology follows the tumour type and carries the morphology, the reticulin and PAS stains and the immunohistochemistry in one paragraph (house preference), so the QMH "Histochemical stains" and "Immunohistochemical studies" elements print inside it. Ki-67 and the mitotic count follow it.
- Tumour number and size print with the procedure and integrity under "Specimen and tumour".

## House wording (2021-2026 exports, aggregate only; fewer than 10 PitNET reports)

- Diagnosis: "PITUITARY, tumour, excision - GONADOTROPH PITUITARY NEUROENDOCRINE TUMOR (PitNET), SF1-lineage". The form prints the procedure route in the head ("transsphenoidal excision") and British spelling.
- Narrative reports: "Reticulin staining confirms loss of acinar architecture"; the form prints "Reticulin shows loss of the normal acinar architecture."
- Macroscopy: fragments, aggregate size and "All embedded"; the form's sampling defaults to "Entirely embedded".
