# Ureter and renal pelvis carcinoma resection: sources

Phase 83, 4 November 2026 (user request). The grounding for the "Ureter / pelvis Ca" form (`schemas/ureter_renal_pelvis_carcinoma.json`, `generators/ureter_renal_pelvis_carcinoma.js`) and its staging module (`src/staging/ureter_renal_pelvis.js`). Nothing on this page prints; cut-offs and citations stay in Checks, field help and code comments. The spec is `docs/specs/upper-tract-urothelial.md`; the intake rules are in `docs/specs/specimen-intake.md`.

## Documents

| Short name | Document | Used for |
|---|---|---|
| QMH | [QMH Cancer Reporting Template, UG-Ureter](https://awiloqmh.github.io/CancerReportingTemplate/UG-Ureter.html), saved as `docs/reference/UG-Ureter.html` with its text in `docs/reference/qmh/ureter.txt` | Fields, options and the printed order |
| CAP | [CAP, Protocol for the Examination of Resection Specimens from Patients with Carcinoma of the Ureter or Renal Pelvis, version 2.4.0.0 (March 2025)](https://documents.cap.org/documents/New-Cancer-Protocols-March-2025/UreterRenalPelvis.Res_2.4.0.0.REL.CAPCP.pdf) | Histologic types, subtypes and divergent differentiation, grade options, tumour extension, margins (Note F), regional nodes, pN, the m and is suffixes |
| ICCR | [ICCR, Carcinoma of the Renal Pelvis and Ureter Histopathology Reporting Guide, 2nd edition, version 2.0 (December 2025)](https://www.iccr-cancer.org/wp-content/uploads/2025/12/ICCR-UT-Renal-Pelvis-2nd-ed-v2.0-bookmarked.pdf), from the [dataset page](https://www.iccr-cancer.org/datasets/published-datasets/urinary-male-genital/renal-pelvis-and-ureter/) | Procedure terms (Note 2), focality, the grading rules, ancillary studies (Note 18), the staging editions |
| AJCC 2026 | [AJCC Current Staging System 2026](https://www.facs.org/media/c5ik5tkr/ajcc-current-staging-system-2026.pdf) | Chapter 61, Renal Pelvis & Ureter, is on the 8th edition; there is no version 9 chapter |
| NCI PDQ | [Transitional Cell Cancer (Kidney/Ureter) Treatment (PDQ), health professional version](https://www.cancer.gov/types/kidney/hp/transitional-cell-treatment-pdq) | The AJCC 8th edition stage groups, used in Checks only |

## Decisions

| Point | Source | In the app |
|---|---|---|
| Stage on the AJCC 8th edition | AJCC 2026 lists chapter 61 on the 8th edition; ICCR assesses staging on the 9th edition UICC and 8th edition AJCC | Printed as "AJCC 8th edition"; the print option reads "Print the pTNM block (AJCC 8th edition)" |
| Stage group is not printed | NCI PDQ: 0a Ta N0 M0, 0is Tis N0 M0, I T1 N0 M0, II T2 N0 M0, III T3 N0 M0, IV T4 N0 M0, any T N1 or N2, any M1 | One info in Checks: "Stage group, AJCC 8th edition (reference, not reported)" |
| pT3 differs by site: peripelvic fat or renal parenchyma for the renal pelvis, periureteric fat for the ureter | CAP | Separate Tumour extension options; Checks flag a pelvic pT3 option without Renal pelvis ticked under Tumour site, and the periureteric option without Ureter |
| In situ spread into the renal collecting ducts and tubules does not affect stage | CAP, Note E | An info in Checks when renal parenchymal invasion is ticked |
| pN1 is a single node of 2 cm or less; pN2 a single node over 2 cm or multiple nodes | CAP | One involved node with no deposit or node size gives pNX with a warning |
| The m suffix for multiple tumours; is may be added for associated carcinoma in situ | CAP | m prints when Multiple primary tumours (m) is ticked; is is not printed, and Checks say so for Ta with carcinoma in situ |
| Urothelial carcinoma, its subtypes and divergent differentiation are graded low or high; squamous cell carcinoma and adenocarcinoma G1 to G3 | CAP, Note C | One Histologic grade field holding both systems; Checks flag a system that does not fit the type |
| Grade on the highest-grade component; the cut-off for high grade is 5%, and tumours with up to 5% high grade are low grade, with the proportion optionally stated | ICCR | Optional High-grade component (%), printed after a low grade; Checks warn on High grade with under 5% and Low grade with over 5%; exactly 5% raises nothing |
| All subtypes are high grade (WHO 2022) | ICCR | Checks warn on a subtype graded low grade |
| No standard criteria for low-grade invasive urothelial carcinoma; every invasive urothelial carcinoma should be graded | ICCR | Checks warn when the grade is blank, and add an info when an invasive conventional carcinoma is graded low |
| "Partial" means the whole ureter is not removed; a complete (radical) nephroureterectomy includes a cuff of bladder wall | ICCR, Note 2 | Procedure help; Checks ask for the bladder cuff in a complete nephroureterectomy |
| Margin status is given for invasive carcinoma, for low-grade non-invasive papillary carcinoma, and for carcinoma in situ or high-grade non-invasive papillary carcinoma; the soft tissue margin appears in the invasive list only | CAP, Note F | Each mucosal margin has one status: uninvolved, involved by invasive carcinoma, carcinoma in situ, high-grade or low-grade non-invasive papillary carcinoma or urothelial dysplasia, or cannot be assessed; the soft tissue margin has uninvolved, involved by invasive carcinoma and cannot be assessed. QMH pairs carcinoma in situ with high-grade, and low-grade with dysplasia |
| MMR testing | ICCR, Note 18 | MMR immunohistochemistry prints under Molecular findings; Checks quote the cited testing criteria when it is not performed |

## Printed morphology

One Tumour histology paragraph: the type sentence, then the features of the type, then one sentence per ticked subtype or divergent differentiation, then carcinoma in situ, then any typed immunohistochemistry. A typed microscopy note replaces the generated sentences.

| Type or component | As the type | As a ticked component | Source |
|---|---|---|---|
| Low-grade non-invasive papillary | Slender papillae with fibrovascular cores and minimal fusion are lined by orderly urothelium with mild nuclear pleomorphism; mitoses are confined to the lower half. | - | [PathologyOutlines, low-grade papillary urothelial carcinoma](https://www.pathologyoutlines.com/topic/bladderlgpap.html) |
| High-grade non-invasive papillary | Fused and complex papillae with fibrovascular cores are lined by disordered, crowded urothelium with nuclear pleomorphism, enlarged nuclei, prominent nucleoli and frequent mitoses. | - | [PathologyOutlines, high-grade papillary urothelial carcinoma](https://www.pathologyoutlines.com/topic/bladderHGpap.html) |
| Carcinoma in situ | Flat urothelium shows loss of polarity and nuclear crowding, with enlarged, pleomorphic nuclei and mitoses in the mid to upper layers. | - | [PathologyOutlines, urothelial carcinoma in situ](http://www.pathologyoutlines.com/topic/bladdercis.html) |
| Invasive, conventional | Irregular nests and single cells with nuclear pleomorphism, hyperchromasia and frequent mitoses infiltrate the stroma. | - | [PathologyOutlines, invasive urothelial carcinoma](https://www.pathologyoutlines.com/topic/bladderurothelialinvasivegen.html) |
| Micropapillary | Small nests of tumour cells without fibrovascular cores lie within lacunar spaces, several nests sharing one lacuna. | In a micropapillary component, small nests of tumour cells without fibrovascular cores lie within lacunar spaces, several nests sharing one lacuna. | [PathologyOutlines, micropapillary subtype](https://www.pathologyoutlines.com/topic/kidneytumormalignanturothelialcarcinomasubtypesmicropap.html) |
| Nested | Anastomosing, irregular nests of cytologically bland cells infiltrate the stroma, with greater atypia at the deep aspect. | In a nested component, anastomosing, irregular nests of cytologically bland cells infiltrate the stroma. | [PathologyOutlines, nested subtype](https://www.pathologyoutlines.com/topic/bladdernested.html) |
| Tubular and microcystic | Infiltrating microcysts and tubules lined by cuboidal or flattened cells with minimal atypia contain granular eosinophilic secretions. | In a tubular and microcystic component, infiltrating microcysts and tubules are lined by cuboidal or flattened cells with minimal atypia. | [PathologyOutlines, microcystic subtype](https://www.pathologyoutlines.com/topic/bladdermicrocystic.html) |
| Lymphoepithelioma-like | Syncytial sheets and nests of large pleomorphic cells with prominent nucleoli are obscured by abundant mixed inflammatory cells. | In a lymphoepithelioma-like component, syncytial sheets of large pleomorphic cells with prominent nucleoli are obscured by abundant mixed inflammatory cells. | [PathologyOutlines, lymphoepithelioma-like subtype](https://www.pathologyoutlines.com/topic/bladderlymphoepithel.html) |
| Plasmacytoid | Discohesive single cells have eccentric nuclei and abundant eosinophilic cytoplasm. | In a plasmacytoid component, discohesive single cells have eccentric nuclei and abundant eosinophilic cytoplasm. | [PathologyOutlines, plasmacytoid subtype](https://www.pathologyoutlines.com/topic/kidneytumormalignanturothelialcarcinomasubtypesplasma.html) |
| Sarcomatoid | A high-grade spindle cell component is admixed with conventional high-grade urothelial carcinoma. | A sarcomatoid component of high-grade spindle cells is admixed with the urothelial carcinoma. | [PathologyOutlines, sarcomatoid subtype](https://www.pathologyoutlines.com/topic/bladdersarcomatoidvariant.html) |
| Squamous differentiation | Irregular nests and single cells with nuclear pleomorphism, hyperchromasia and frequent mitoses infiltrate the stroma. Part of the tumour shows squamous differentiation. | Part of the tumour shows squamous differentiation. | [PathologyOutlines, squamous differentiation](https://www.pathologyoutlines.com/topic/bladdersquamousdiff.html) |
| Glandular differentiation | Irregular nests and single cells with nuclear pleomorphism, hyperchromasia and frequent mitoses infiltrate the stroma. Part of the tumour forms true glands lined by columnar cells. | Part of the tumour forms true glands lined by columnar cells. | [PathologyOutlines, glandular differentiation](https://www.pathologyoutlines.com/topic/kidneytumormalignanturothelialcarcinomasubtypesglandulardiff.html) |
| Squamous cell carcinoma | Irregular infiltrating nests and sheets of malignant squamous cells show keratinisation and intercellular bridges; there is no urothelial carcinoma component. | - | [PathologyOutlines, squamous cell carcinoma](https://www.pathologyoutlines.com/topic/bladdersquamous.html) |
| Small cell neuroendocrine carcinoma | Sheets and nests of small to medium-sized cells with scant cytoplasm, finely granular chromatin, inconspicuous nucleoli and nuclear moulding show brisk mitotic activity and necrosis. | In a small cell neuroendocrine carcinoma component, sheets and nests of small to medium-sized cells with scant cytoplasm, finely granular chromatin and nuclear moulding show brisk mitotic activity and necrosis. | [PathologyOutlines, small cell carcinoma](https://www.pathologyoutlines.com/topic/bladdersmallcell.html) |

The other types (giant cell, poorly differentiated, lipid-rich and clear cell subtypes, verrucous carcinoma, the adenocarcinomas, large cell neuroendocrine carcinoma, the neuroendocrine tumour, other and undetermined types) print the type sentence only, so the features go in the microscopy note. Urothelial carcinoma with trophoblastic or Müllerian differentiation prints the conventional sentence. A ticked component with no sentence in the table prints in the subtypes row and the diagnosis only.

## Departures from the QMH order

`tests/ureter_renal_pelvis_carcinoma.test.js` reads the QMH order from the saved page and checks these departures:

1. Tumour focality (ICCR) prints after the tumour size.
2. The histologic type prints as its own row before the Tumour histology paragraph, and subtypes and divergent differentiation (CAP) after it.
3. The two QMH grade rows are one Histologic grade row.
4. The distal ureteric margin and the bladder cuff margin are alternatives: a specimen with a bladder cuff prints the cuff margin. The proximal ureteric margin prints for a ureterectomy or another procedure, not for a nephroureterectomy.
5. Node counts print in one row, with extranodal extension and the sizes as sub-rows.
6. Treatment effect and other findings close Additional findings; MMR immunohistochemistry prints under Molecular findings.
