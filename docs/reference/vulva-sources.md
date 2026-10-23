# Vulval carcinoma resection — sources

Phase 77 (23 October 2026). Grounding for the Vulval carcinoma resection form (`schemas/vulval_carcinoma.json`, `generators/vulval_carcinoma.js`), its staging module (`src/staging/vulva.js`) and the Vulval carcinoma criteria on Lymph node excision (`schemas/lymph_node.json`, `generators/lymphnode.js`). Nothing on this page prints.

## Documents

| Short name | Document | Used for |
|---|---|---|
| QMH | QMH Cancer Reporting Template, GYN-Vulva, https://awiloqmh.github.io/CancerReportingTemplate/GYN-Vulva.html (saved as `docs/reference/GYN-Vulva.html`; text in `docs/reference/qmh/vulva.txt`) | Fields, options and the report order |
| CAP | CAP Vulva 5.1.0.0, https://documents.cap.org/protocols/Vulva_5.1.0.0.REL_CAPCP.docx | Histologic types, grade, depth of invasion, pattern of invasion, node rules, AJCC version 9 definitions |
| ICCR | ICCR Carcinoma of the Vulva, 2nd edition, version 2.1, https://www.iccr-cancer.org/wp-content/uploads/2024/09/ICCR-Vulva-2nd-ed-v2.1-bookmarked.pdf | HPV-associated and HPV-independent types, grading, p16 and p53, the ESGO note on depth |
| FIGO 2021 | Olawaiye AB et al. FIGO staging for carcinoma of the vulva: 2021 revision. Int J Gynaecol Obstet 2021;155(1):43–47, https://pmc.ncbi.nlm.nih.gov/articles/PMC9290586/ | Depth of invasion method |
| AJCC 9 | Olawaiye AB et al. The new (version 9) AJCC TNM staging protocol for carcinoma of the vulva. CA Cancer J Clin 2026;76(5):e70104, https://pmc.ncbi.nlm.nih.gov/articles/PMC13525161/ | T, N and M categories (Tables 3–5), stage groups (Table 6); in use from 1 January 2024 |
| Alsolami 2026 | Alsolami S, Ji J, Hoang L. Squamous cancers and precancers of the vulva: emerging diagnostic, prognostic and predictive biomarkers in pathology. Cancers (Basel) 2026;18(10):1518, https://pmc.ncbi.nlm.nih.gov/articles/PMC13204309/ | p16 and p53 patterns |
| Rakislova 2017 | Rakislova N et al. Histological characteristics of HPV-associated and -independent squamous cell carcinomas of the vulva: a study of 1,594 cases. Int J Cancer 2017, https://onlinelibrary.wiley.com/doi/full/10.1002/ijc.31006 | HPV DNA and p16 can disagree |
| Ueda 2010 | Ueda Y, Enomoto T, Kimura T, Yoshino K, Fujita M, Kimura T. Two distinct pathways to development of squamous cell carcinoma of the vulva. J Skin Cancer, published online 2010, https://pmc.ncbi.nlm.nih.gov/articles/PMC3003991/ | Basaloid and warty morphology |
| PathologyOutlines | HPV-associated SCC of the vulva, https://www.pathologyoutlines.com/topic/vulvascc.html; HPV-independent SCC of the vulva, https://www.pathologyoutlines.com/topic/vulvaverrucous.html; SCC of the vagina, https://www.pathologyoutlines.com/topic/vaginascc.html; basal cell carcinoma of the vulva, https://www.pathologyoutlines.com/topic/vulvabasalcellcarc.html; Paget disease of the vulva, https://www.pathologyoutlines.com/topic/vulvapagetsdisease.html; verrucous carcinoma of the skin, https://www.pathologyoutlines.com/topic/skintumornonmelanocyticverrucousscc.html | Printed morphology sentences |
| GLOWM | Pathology of cervical carcinoma (volume 4, chapter 6), https://m.glowm.com/resources/glowm/cd/pages/v4/v4c006.html; the histopathology of vulvar neoplasia (volume 4, chapter 40), https://www.glowm.com/resources/glowm/cd/pages/v4/v4c040.html | Non-keratinising and verrucous morphology |
| Libre Pathology | Extramammary Paget disease, https://librepathology.org/w/index.php?title=Extramammary_Paget_disease&mobileaction=toggle_view_desktop | Paget cells nested or single |

## Decisions

| Point | Source | In the app |
|---|---|---|
| Staging on AJCC version 9, not the AJCC 8th edition the QMH page prints | User, 23 October 2026; CAP; AJCC 9 | `src/staging/vulva.js`; printed as "AJCC 9th edition", as for the other version 9 protocols in the app |
| Stage group is reference only | AJCC 9 Table 6 gives each category its matching FIGO 2021 stage | Checks: "Stage group, AJCC 9th edition, matching FIGO 2021 (reference, not reported)" |
| Phyllodes tumours are not covered by the vulva protocol | CAP ("consider the Breast Phyllodes Tumor protocol") | No pTNM; Checks says so |
| Squamous cell carcinoma is typed HPV-associated, HPV-independent or NOS | CAP; ICCR | Histologic type |
| Keratinising, non-keratinising, basaloid, warty and verrucous patterns describe morphology only; most HPV-associated carcinomas are basaloid or warty, HPV-independent ones tend to be keratinising, and verrucous carcinoma is HPV-independent | ICCR | Pattern prints one sentence in Tumour histology, never in the diagnosis |
| Grade is not recommended; it may be an optional element | ICCR; CAP Note E | Histologic grade is optional |
| Depth of invasion: the FIGO 2021 and AJCC version 9 method, from the basement membrane of the deepest adjacent dysplastic, tumour-free rete ridge (or nearest dysplastic rete peg) to the deepest point of invasion; AJCC recommends the conventional method as an ancillary data point | FIGO 2021; CAP | Depth of invasion, with an optional conventional depth; Comment: "Depth of invasion is measured by the FIGO 2021 method." |
| ESGO (2023 update) advises recording depth by both methods | As reported by ICCR | Help text on the conventional depth |
| Pattern of invasion: predominantly infiltrating or a broad, pushing front | CAP | Tumour border |
| p16: report block-type staining, not "positive" alone, as HPV-independent lesions may show focal (mosaic) staining; almost all HPV-associated carcinomas are p53 wild-type | ICCR | p16 options; Checks warns on block-type p16 with an HPV-independent type, non-block p16 with an HPV-associated type, and abnormal p53 with an HPV-associated type |
| p53: two wild-type patterns (scattered; mid-epithelial, basal sparing) and four abnormal patterns (basal overexpression, parabasal/diffuse overexpression, null, cytoplasmic); basal sparing is specific to high-risk HPV; p16 is negative in fewer than 1% of HPV-associated carcinomas | Alsolami 2026 | p53 options |
| HPV DNA and p16 can disagree | Rakislova 2017 | A mismatch between HPV testing and the type is Checks information, not a warning |
| Regional nodes are the inguinal and femoral nodes only; any other involved node is distant metastasis (pM1) | CAP | Distant metastasis options; intake gives a pelvic sentinel line no criteria |
| A negative lymphadenectomy ordinarily includes 6 or more nodes; with fewer, pN is not assigned; sentinel nodes only add (sn) | CAP | Staging module; Checks |
| Invasion of more than 1 mm requires regional lymph node evaluation | CAP | Checks information when no nodes are recorded |
| Isolated tumour cells 0.2 mm or less, or 200 cells or fewer (pN0(i+)); micrometastasis more than 0.2 mm to 2.0 mm (pN1mi); more than 2.0 to 5.0 mm (pN1a); more than 5.0 mm (pN1b); extranodal extension (pN1c); fixed or ulcerated nodes (pN2); the number of involved nodes no longer counts | AJCC 9 Table 4; CAP. ICCR writes "0.2 mm or less and 200 cells or fewer" | Staging module; Lymph node excision criteria, which name a micrometastasis only and give the node's own category in Checks |

## Printed morphology sentences

| Pattern or type | Sentence (Tumour histology) | Source |
|---|---|---|
| Keratinising | Infiltrating nests and cords of atypical squamous cells show abundant eosinophilic cytoplasm, intercellular bridges and keratin pearls. | PathologyOutlines, SCC of the vagina (eosinophilic cytoplasm, keratin pearls, intercellular bridges) and HPV-independent SCC of the vulva (keratin pearls) |
| Non-keratinising | Infiltrating nests and sheets of atypical squamous cells show intercellular bridges but no keratin pearls. | GLOWM, cervical carcinoma (keratin pearls absent by definition) |
| Basaloid | Infiltrating nests and sheets of basaloid squamous cells with scant cytoplasm and hyperchromatic nuclei lie in a desmoplastic stroma, with little keratinisation. | Ueda 2010 (bands, sheets or nests in a desmoplastic stroma; focal keratinisation) |
| Warty | Papillary and infiltrating nests of atypical squamous cells show koilocytic atypia, multinucleation and prominent keratinisation. | Ueda 2010 (koilocytotic cells, often with multiple nuclei; prominent keratinisation); PathologyOutlines, HPV-associated SCC of the vulva (koilocytic change) |
| Verrucous | Well-differentiated squamous epithelium with marked acanthosis and hyperkeratosis and minimal cytological atypia pushes into the stroma as broad, bulbous rete. | PathologyOutlines, verrucous carcinoma of the skin (acanthosis, hyperkeratosis, bulbous processes with pushing borders); GLOWM, vulvar neoplasia (minimal atypia) |
| Basal cell carcinoma, NOS | Nests of basaloid cells with peripheral palisading and retraction from the surrounding stroma lie in the dermis. | PathologyOutlines, basal cell carcinoma of the vulva (criteria identical to the skin) |
| Paget disease, extramammary (invasive) | Large cells with abundant pale cytoplasm and prominent nucleoli lie singly and in nests in the epidermis and invade the dermis. | PathologyOutlines, Paget disease of the vulva; Libre Pathology |

Squamous cell carcinoma without a pattern prints "Infiltrating nests and cords of atypical squamous cells lie in a desmoplastic stroma." The adenocarcinomas and phyllodes tumours print one short generic sentence; the pathologist adds detail in Histology notes. Bartholin gland carcinoma, the other types and carcinoma of undetermined type print the type alone.

## Departures from the QMH report order

The synoptic follows the QMH report order (the element-order test in `tests/vulval_carcinoma.test.js` reads it from the saved page), except:

1. Histologic type prints as its own row before Tumour histology (QMH: inside "Tumor histology and immunohistochemical studies").
2. p16 and p53 print inside the Tumour histology paragraph, as house style puts microscopy and immunohistochemistry in one paragraph (QMH: separate rows after perineural invasion).
3. HPV testing prints under Molecular findings (QMH: a note after p53).
4. The margins print one row per lesion present (invasive carcinoma peripheral and deep, squamous precursor lesion, Paget disease), not one QMH row per possible lesion.
5. The lymph node rows print as one Regional lymph nodes row with its sub-items, and the pTNM block follows Distant metastasis; FIGO stage is not printed.
