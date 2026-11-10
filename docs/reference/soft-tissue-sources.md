# Soft tissue sarcoma resection: sources

Phase 84, 10 November 2026 (user request 2026-09-24, pulled on 2026-11-10 with "make sure liposarcoma is included"). The grounding for the "Sarcoma" form (`schemas/soft_tissue_sarcoma.json`, `generators/soft_tissue_sarcoma.js`) and its staging module (`src/staging/softtissue.js`). Nothing on this page prints; cut-offs and citations stay in Checks, field help and code comments. The spec is `docs/specs/soft-tissue-sarcoma.md`; the intake rules are in `docs/specs/specimen-intake.md`.

## Documents

| Short name | Document | Used for |
|---|---|---|
| QMH | [QMH Cancer Reporting Template, MS-Soft tissue sarcoma](https://awiloqmh.github.io/CancerReportingTemplate/MS-Soft%20tissue%20sarcoma.html), saved as `docs/reference/MS-Soft-tissue-sarcoma.html` with its text in `docs/reference/qmh/softtissue.txt` | Fields, options and the printed order; the FNCLCC differentiation list and scores; the mitotic cut-offs at a 22 mm eyepiece; treatment effect as the percentage of viable tumour |
| CAP | [CAP, Protocol for the Examination of Resection Specimens From Patients With Soft Tissue Tumors, version 4.2.0.0 (June 2024)](https://www.cap.org/wp-content/uploads/protocols/Soft.Tissue_4.2.0.0.REL_CAPCP.docx?download=true) | Procedure terms, histologic types (the WHO 5th edition list), tumour extent and depth, liposarcoma naming and molecular findings (Note D, Table 1), the types AJCC staging does not suit (Note F), FNCLCC grading and the types not graded (Note G), treatment response (Note H), margins and the fascial envelope (Note J), regional nodes and pNX (Note K) |
| ICCR | [ICCR, Soft Tissue Sarcoma, Resection Specimens, 1st edition, version 1.1](https://www.iccr-cancer.org/wp-content/uploads/2022/10/ICCR-STSarcoma_Resection-1st-edn-v1.1-hyperlink.pdf), from the [dataset page](https://www.iccr-cancer.org/datasets/published-datasets/soft-tissue-bone/soft-tissue-sarcoma-resection-specimens/) | Cross-check of the reporting elements |
| AJCC 2026 | [AJCC Current Staging System 2026](https://www.facs.org/media/c5ik5tkr/ajcc-current-staging-system-2026.pdf) and the [AJCC version 9 page](https://www.facs.org/quality-programs/cancer-programs/american-joint-committee-on-cancer/version-9/) | Every soft tissue sarcoma chapter (head and neck 40, trunk and extremities 41, abdomen and thoracic visceral organs 42, retroperitoneum 44, orbit 70) is on the 8th edition; there is no version 9 chapter |
| NCI PDQ | [Soft Tissue Sarcoma Treatment (PDQ), health professional version](https://www.cancer.gov/types/soft-tissue-sarcoma/hp/adult-soft-tissue-treatment-pdq) | The AJCC 8th edition stage groups for the trunk and extremities and the retroperitoneum, used in Checks only |
| WHO 5th | [WHO Classification of Tumours, Soft Tissue and Bone Tumours, 5th edition (IARC)](https://publications.iarc.who.int/588) and [WHO Pathology: Highlights of the 2020 Sarcoma Update](https://pmc.ncbi.nlm.nih.gov/articles/PMC9216237/) | The printed type list, as QMH and CAP give it; the myxoid liposarcoma high-grade threshold; MDM2 in the liposarcomas |
| WHO 6th | [ICCR notice of the 6th edition online](https://www.iccr-cancer.org/2026/09/08/new-who-classification-for-soft-tissue-and-bone-tumours-online/) and Hornick et al., [The 2026 World Health Organization Classification of Tumors of Soft Tissue and Bone: 6th Edition](https://pmc.ncbi.nlm.nih.gov/articles/PMC13742349/) | Advice in Checks only: the mitotic threshold for dedifferentiation and the end of "low-grade dedifferentiation" |
| PathologyOutlines | [Myxofibrosarcoma](https://www.pathologyoutlines.com/topic/softtissuemyxofibrosarcoma.html); [Pleomorphic liposarcoma](https://www.pathologyoutlines.com/topic/softtissueadiposepleomorphiclipo.html) | The two morphology sentences with no report of the user's to follow |
| User's reports | The user's own sarcoma and liposarcoma reports, read in the sandbox only (no case is quoted or counted here) | The diagnosis lines, the margin layout, the liposarcoma wording and most morphology sentences |

## Decisions

| Point | Source | In the app |
|---|---|---|
| Stage on the AJCC 8th edition | AJCC 2026 lists the soft tissue chapters on the 8th edition | Printed as "AJCC 8th edition"; the print option reads "Print the pTNM block (AJCC 8th edition)" |
| pT by site group: trunk and extremities and retroperitoneum by size (50, 100 and 150 mm), head and neck by size (20 and 40 mm) with T4a and T4b by invasion, the abdominal and thoracic visceral organs by extent, the orbit by size and invasion | CAP | Tumour site (AJCC site group) is a field of its own; Other and Not specified give pTX with an info |
| Stage groups only for the trunk and extremities and the retroperitoneum; any T N1 M0 is IV on the trunk and extremities and IIIB in the retroperitoneum | NCI PDQ (table footnote: "Stage IIIB for soft tissue sarcoma of the retroperitoneum; stage IV for soft tissue sarcoma of the trunk and extremities") | One info in Checks: "Stage group, AJCC 8th edition (reference, not reported)". CAP Note K groups both sites with IIIB; the app follows the AJCC table |
| "When no lymph nodes are resected, the pathologic 'N' category is not assigned (pNX is not used for soft tissue tumors)" | CAP, Note K | pN is left out of the pTNM when no node is examined; the stage group reads N0 and says so |
| FNCLCC grade: differentiation 1 to 3 by type, mitotic count 1 to 3, necrosis 0 to 2; 2 or 3 is grade 1, 4 or 5 grade 2, 6 to 8 grade 3 | CAP, Note G; QMH | Three scored rows under the grade; an incomplete score leaves the grade row out with a warning |
| Mitotic cut-offs per 10 HPF at a 22 mm eyepiece (fewer than 14, 14 to 28, more than 28) or per mm² (0 to 5, 6 to 11, more than 11) | QMH (per 10 HPF); CAP (per mm²) | A unit field beside the count; an info when the count sits near a cut-off |
| Types without an FNCLCC grade (alveolar soft part sarcoma, clear cell sarcoma, epithelioid sarcoma, extraskeletal myxoid chondrosarcoma, low-grade fibromyxoid sarcoma, sclerosing epithelioid fibrosarcoma), angiosarcoma not graded, and the types high grade by definition | CAP, Note G | The grade row prints Not graded or high grade, with the CAP wording in Checks |
| The types AJCC staging does not suit, among them atypical lipomatous tumour, solitary fibrous tumour, retroperitoneal leiomyosarcoma and head and neck rhabdomyosarcoma | CAP, Note F | An info in Checks; the pTNM still prints while the block is on |
| "Generally, the term well-differentiated liposarcoma has been used for groin/retroperitoneum and deep skeletal muscle tumors, due to their increased potential for de-differentiation, whereas atypical lipomatous tumor is preferred for superficial subcutaneous tumors with the same histology since these are generally cured by limited excision." | CAP, Note D | A warning for an atypical lipomatous tumour in the retroperitoneum, groin, mediastinum or paratesticular region, and for a well-differentiated liposarcoma that is only dermal or subcutaneous elsewhere; an info only for an intramuscular atypical lipomatous tumour, as the user's own reports name an intramuscular thigh tumour so |
| MDM2 amplification in atypical lipomatous tumour, well-differentiated and dedifferentiated liposarcoma; a FUS or EWSR1 and DDIT3 fusion in myxoid liposarcoma | CAP, Note D, Table 1 | MDM2 and DDIT3 / FUS FISH print under Molecular findings; Checks ask for them, and warn when a result contradicts the type |
| More than 5% hypercellular (round cell) areas make a myxoid liposarcoma high grade | WHO 5th | The percentage prints under the type and in the diagnosis; above 5% the differentiation score is 3 unless another is picked |
| Dedifferentiation needs 5 or more mitoses per 10 HPF in a non-lipogenic area; "low-grade dedifferentiation" is no longer used | WHO 6th (Hornick et al.) | Infos in Checks only; the printed type list stays WHO 5th |
| "Therapy response is expressed as a percentage of total tumor area that is non-viable" | CAP, Note H | The form records the percentage of viable tumour, as QMH asks ("Present, specify percentage of viable tumor"); the row reads "Present (10% viable tumour)" |
| An adequate sample for grading "is not always available ... in tumors previously treated with radiation or chemotherapy"; "In problematic cases, the grade of the pretreatment specimen (if available) should take precedence" | CAP, Notes G and D | An info in Checks when a preresection therapy is ticked and the tumour is graded |
| Specify the location of every margin under 0.5 cm and the distance of the closest; the intact fascial envelope or fibrous pseudocapsule at the closest margin is an optional element | CAP, Note J | One margin per typed line with its distance in mm and block, under a Surgical margin row naming the closest; the fascial envelope row follows |
| Depth is not used in AJCC 8th edition staging and is an optional element for the trunk and extremities | CAP | Tumour depth prints after the focality and is used only by the liposarcoma naming Checks |

## Printed morphology

One Tumour histology paragraph: "Sections show a(n) <type>.", the sentence for the type, the liposarcoma sentences (the well-differentiated component, heterologous differentiation, the hypercellular areas), then any typed immunohistochemistry. A typed microscopy note replaces the generated sentences.

| Type | Sentence | Source |
|---|---|---|
| Undifferentiated pleomorphic sarcoma | The tumour is composed of pleomorphic spindle and polygonal cells arranged in sheets and short, haphazard fascicles. The tumour cells have enlarged, hyperchromatic nuclei with bizarre and multinucleated forms. | The user's reports |
| Dedifferentiated liposarcoma | The tumour is composed of pleomorphic spindle cells arranged in sheets and short, haphazard interlacing fascicles, associated with hyalinised and sclerotic stroma. The tumour cells have enlarged, hyperchromatic nuclei with frequent bizarre or multinucleated forms. | The user's reports |
| Well-differentiated component (dedifferentiated liposarcoma) | The dedifferentiated liposarcoma is surrounded by well-differentiated liposarcoma, comprising adipocytes that vary in size, separated by fibrous septa containing atypical stromal cells with hyperchromatic nuclei. | The user's reports |
| Atypical lipomatous tumour and well-differentiated liposarcoma | The tumour is composed of lobules of adipocytes that vary in size, separated by fibrous septa containing scattered atypical stromal cells with enlarged, irregular, hyperchromatic nuclei. | The user's reports |
| Myxoid liposarcoma | The tumour is composed of uniform ovoid cells arranged haphazardly in a myxoid stroma containing delicate, thin-walled, branching blood vessels. | The user's reports |
| Pleomorphic liposarcoma | The tumour is composed of sheets of pleomorphic spindle and polygonal cells with bizarre and multinucleated forms, among which are scattered pleomorphic, multivacuolated lipoblasts with scalloped nuclei. | [PathologyOutlines, pleomorphic liposarcoma](https://www.pathologyoutlines.com/topic/softtissueadiposepleomorphiclipo.html), in the user's terms |
| Leiomyosarcoma | The tumour is composed of spindle cells arranged in interlacing fascicles, with eosinophilic cytoplasm and elongated nuclei showing nuclear pleomorphism and coarse chromatin. | The user's reports |
| Myxofibrosarcoma | The tumour is composed of atypical spindle and stellate cells with hyperchromatic nuclei in a myxoid stroma with elongated, curvilinear blood vessels. | [PathologyOutlines, myxofibrosarcoma](https://www.pathologyoutlines.com/topic/softtissuemyxofibrosarcoma.html) |
| Synovial sarcoma | The tumour contains uniform spindle cells arranged in fascicles, with ovoid, overlapping nuclei and scanty cytoplasm. | The user's reports |

The other types print the type sentence only, so their features go in the microscopy note.

## Departures from the QMH order

`tests/soft_tissue_sarcoma.test.js` reads the QMH order from the saved page and checks these departures:

1. The node counts fold into the Regional lymph nodes row ("3 examined; 1 involved"), the nodal sites replace the size of the largest node involved, and "Additional pathologic findings" is a section heading.
2. Tumour depth (CAP) follows the focality.
3. The histologic type prints as its own row before the tumour histology paragraph, and the QMH FNCLCC "Histologic type" sub-row is named Tumour differentiation.
4. The treatment effect prints under Additional findings, after the preresection treatment.
5. Each margin prints under the Surgical margin row, with the fascial envelope (CAP).
6. MDM2 and other ancillary studies print under Molecular findings.
