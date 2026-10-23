# Sentinel node staging criteria — sources (Phase 76, 23 October 2026)

Reference for the staging criteria on Lymph node excision (`lymph_node`) and the frozen section sentinel node (`frozen_section`). Nothing here prints: the criteria sit in the "Show criteria" panel, the option labels and Checks. Spec: `docs/specs/sentinel-node.md`.

## Sources

- [QMH Cancer Reporting Template, Breast cancers](https://awiloqmh.github.io/CancerReportingTemplate/BREAST-Cancers.html), saved as `docs/reference/BREAST-Cancers.html` with the text dump `docs/reference/qmh/breast.txt` (regional lymph nodes and pN notes).
- [CAP Protocol for the Examination of Resection Specimens from Patients with Invasive Carcinoma of the Breast, version 4.11.0.0, June 2026](https://www.cap.org/wp-content/uploads/2026/06/Breast.Invasive.Res_4.11.0.0.REL_CAPCP.pdf?download).
- [Gershenwald JE et al. Melanoma staging: evidence-based changes in the American Joint Committee on Cancer eighth edition cancer staging manual. CA Cancer J Clin 2017;67(6):472–492](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5978683/).
- [ICCR dataset: Invasive melanoma, regional lymph nodes](https://www.iccr-cancer.org/docs/ICCR-Melanoma2-LN.pdf), with [the staging (N) section](https://www.iccr-cancer.org/docs/ICCR-Melanoma2-StagingN.pdf).
- [CAP Protocol for the Examination of Excision Specimens from Patients with Melanoma of the Skin, version 1.2.0.0, March 2025](https://documents.cap.org/documents/New-Cancer-Protocols-March-2025/Skin.Inv_Melanoma.Res_1.2.0.0.REL.CAPCP.docx).

## How the forms read them

| Point | Source | Form |
|---|---|---|
| "Macrometastases measure more than 2 mm." Micrometastases more than 0.2 mm to 2 mm, or more than 200 cells; "If only micrometastases are present, the N category is pN1mi." | CAP 4.11; QMH pN notes | Size category from the largest deposit (more than 2 mm macro, more than 0.2 mm micro); option labels; checks on a chosen category against the size |
| "Isolated tumor cells (ITCs) are defined as small clusters of cells not greater than 0.2 mm or single tumor cells, or a cluster of fewer than 200 cells in a single histologic cross-section. ITCs may be detected by routine histology or by immunohistochemical (IHC) methods." Nodes with ITCs only are excluded from the positive count but counted as examined | CAP 4.11 | Result "Isolated tumour cells"; diagnosis "ISOLATED TUMOUR CELLS ONLY (x/y)"; information check "pN0(i+); the node counts as examined, not as positive"; a warning above 0.2 mm |
| About 1000 cells in a 0.2 mm cluster; more than 200 dispersed or nearly confluent cells in a single section of a node is a micrometastasis; cells in different sections or levels are not added; the 200-cell threshold is a guideline and the pathologist uses judgement | QMH (`docs/reference/qmh/breast.txt`, line 320) | Panel; information check when Micrometastasis is chosen for 0.2 mm or less |
| "Classification is based on the size of the largest contiguous cluster of tumor cells. The distance between clusters should not be included in the size measurement." The deposit includes extension outside the node, or a deposit within a lymphatic channel adjacent to the node | CAP 4.11 | Panel; "Largest deposit (mm)" |
| "The measurement of extranodal extent can be performed either perpendicular to the lymph node capsule or in another dimension. As a general principle, the larger measurement can be preferentially used"; extent 2 mm or less / more than 2 mm | CAP 4.11; QMH | Extranodal extent (both forms); "extending more than 2 mm beyond the lymph node capsule"; the frozen extent fills the synoptic "ENE extent" |
| Extranodal extension: Not identified / Present / Cannot be determined | CAP 4.11; CAP melanoma | Extranodal extension options (the stored "Absent" reads "Not identified"); frozen "Cannot be assessed" maps to the synoptic "Cannot be determined" |
| Treatment effect in the nodes: "No definite response to presurgical therapy in metastatic carcinoma"; "Metastatic carcinoma present with evidence of response to presurgical therapy"; no metastases with fibrous scarring or histiocytic aggregates; no metastases and no scarring. "Treatment-related fibrosis adjacent to residual nodal deposits is not included in determining ypN dimension." | CAP 4.11 | Presurgical therapy (both forms); the frozen answers map to the synoptic's LN treatment effect options |
| "A lymph node in which any metastatic tumor cells have been identified, irrespective of how small the tumor deposit or whether it has been identified on hematoxylin and eosin-stained or immunostained sections, should be designated as a tumor-involved lymph node." | AJCC 8th edition (Gershenwald 2017); CAP melanoma | Melanoma prints no category; a warning when isolated tumour cells are chosen with the Melanoma criteria; the frozen melanoma lines print metastatic malignant melanoma whatever category was picked |
| The largest discrete metastatic deposit in sentinel nodes measured "to the nearest 0.1 mm" | AJCC 8th edition | Information check asking for the deposit size |
| A discrete deposit's cells are "in direct continuity"; "the size of the largest discrete single deposit (not the nodal area over which the multiple deposits are contained)" | ICCR | Panel |
| Nodal site(s): Subcapsular / Intraparenchymal (select all that apply); deposits "typically located in the subcapsular sinus or parenchyma" | CAP melanoma; ICCR | Location in the node; "in the subcapsular sinus", "within the nodal parenchyma" |
| Nodal naevi: capsule and trabeculae, small bland cells devoid of mitotic activity, strong S-100 and Melan-A, minimal HMB-45, Ki-67 below 2%; caution not to overinterpret isolated Melan-A-positive cells | ICCR | Panel |

## Not taken

- Matted nodes and in-transit, satellite or microsatellite metastases (melanoma N category): no field; the pathologist adds them in the additional microscopy.
- The RCB nodal measurement: the breast synoptic carries the residual cancer burden.
