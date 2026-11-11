# Cervical carcinoma resection — sources

Phase 85 (11 November 2026). Grounding for the Cervical carcinoma resection form (`schemas/cervical_carcinoma.json`, `generators/cervical_carcinoma.js`), its staging module (`src/staging/cervix.js`) and the LEEP form's "Upgrade this part" hand-off (`generators/leep.js`). The spec is `docs/specs/cervical-carcinoma.md`.

## Documents

| Short name | Document | Used for |
|---|---|---|
| QMH | QMH Cancer Reporting Template, GYN-Cervix, https://awiloqmh.github.io/CancerReportingTemplate/GYN-Cervix.html (saved as `docs/reference/GYN-Cervix.html`; text in `docs/reference/qmh/cervix.txt`) | Fields, options and the report order |
| CAP | CAP Cervix 5.1.1.0, https://documents.cap.org/documents/Cervix_5.1.1.0.REL_CAPCP.pdf | Procedures, histologic types, depth and horizontal extent, the Silva system, margins, regional nodes and node counts, the AJCC version 9 categories (its Table 1) and the AJCC / WHO / FIGO note on the adnexa |
| ICCR | ICCR Carcinomas of the Cervix, https://www.iccr-cancer.org/datasets/published-datasets/female-reproductive/carcinomas-of-the-cervix/ | HPV-associated and HPV-independent types, grading, the basaloid and usual-type features |
| AJCC 9 | AJCC version 9 cervix uteri (Olawaiye et al., CA Cancer J Clin 2021), https://acsjournals.onlinelibrary.wiley.com/doi/full/10.3322/caac.21663 | T, N and M categories and the stage groups |
| FIGO | FIGO Cancer Report 2025 (Bhatla et al.), https://pmc.ncbi.nlm.nih.gov/articles/PMC12411820/ | FIGO 2018 stages with the corrigendum, IIIC1p and IIIC2p |
| WHO 5th | WHO Classification of Tumours, Female Genital Tumours, 5th edition, https://publications.iarc.who.int/592 | Type names, as CAP and QMH list them |
| PathologyOutlines | HPV associated cervical squamous cell carcinoma, https://www.pathologyoutlines.com/topic/cervixSCC.html; HPV independent cervical squamous cell carcinoma, https://www.pathologyoutlines.com/topic/cervixscchpvindep.html; lymphoepithelioma-like carcinoma, https://www.pathologyoutlines.com/topic/cervixlymphoepithelioma.html; HPV associated adenocarcinoma (usual type and variants), https://www.pathologyoutlines.com/topic/cervixhpvadenocarcinoma.html; invasive stratified mucin producing carcinoma, https://www.pathologyoutlines.com/topic/cervixinvasivestratifiedmucincarc.html; gastric type adenocarcinoma, https://www.pathologyoutlines.com/topic/cervixgas.html; clear cell carcinoma, https://www.pathologyoutlines.com/topic/cervixclearcell.html; mesonephric adenocarcinoma, https://www.pathologyoutlines.com/topic/cervixmesonephricadeno.html; primary endometrioid adenocarcinoma, https://www.pathologyoutlines.com/topic/cervixprimaryendoadeno.html; carcinosarcoma, https://www.pathologyoutlines.com/topic/cervixMMMT.html; adenosquamous carcinoma, https://www.pathologyoutlines.com/topic/cervixadenosquamous.html; adenoid basal carcinoma, https://www.pathologyoutlines.com/topic/cervixadenoidbasal.html; neuroendocrine tumour, https://www.pathologyoutlines.com/topic/cervixcarcinoidtumor.html; small cell neuroendocrine carcinoma, https://www.pathologyoutlines.com/topic/cervixsmallcell.html; large cell neuroendocrine carcinoma, https://www.pathologyoutlines.com/topic/cervixlargecellneuroendocrine.html | The printed morphology sentences |
| Adenocarcinoma review | Recent advances in invasive adenocarcinoma of the cervix, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6864265 | Villoglandular and micropapillary sentences |
| User | The user's own cervical cone reports (2026) | Wording: "CERVIX, cone biopsy:" over "- ADENOCARCINOMA, HPV-associated" and "- Margins clear"; the depth, horizontal extent, block count, Silva pattern and margin rows |

## Decisions

| Point | Source | In the app |
|---|---|---|
| Staging on AJCC version 9, not the AJCC 8th edition the QMH page prints | House rule (AJCC version 9 when it exists); CAP; AJCC 9 | `src/staging/cervix.js`; printed as "AJCC 9th edition" |
| The stage group is reference only; the categories match FIGO 2018 | AJCC 9; FIGO | Checks: "Stage group, AJCC 9th edition, matching FIGO 2018 (reference, not reported)", with IIIC1p or IIIC2p when nodes are involved |
| pT1 is carcinoma strictly confined to the cervix; extension to the corpus is disregarded | CAP | Uterine corpus in Other tissue / organ involvement does not change the category |
| All gross lesions, even with superficial invasion, are stage IB | CAP (FIGO definitions) | A macroscopically visible tumour (exophytic, ulcerated or endophytic) is staged pT1b on its size, with a Checks note |
| pT1a1 invasion 3 mm or less; pT1a2 more than 3 to 5 mm; pT1b1 more than 5 mm deep and 20 mm or less; pT1b2 more than 20 to 40 mm; pT1b3 more than 40 mm | AJCC 9; CAP Table 1 | Staging module; boundary tests at 3, 5, 20 and 40 mm |
| Horizontal extent no longer changes the category; clinicians may request it | CAP | Horizontal extent of stromal invasion is recorded; over 7 mm gives a Checks note only |
| Depth is measured from the base of the epithelium (surface or gland) from which the invasion arises, or from the nearest dysplastic crypt or surface when they are not in continuity | CAP; PathologyOutlines (HPV associated SCC) | Help text on the depth field; the row prints the QMH bands ("Not more than 3 mm", "Greater than 5 mm") with the measurement |
| pT2a: upper two-thirds of the vagina without parametrial invasion (pT2a1 / pT2a2 at 40 mm); pT2b: parametrium, not up to the pelvic wall; pT3a lower third of the vagina; pT3b pelvic wall or hydronephrosis; pT4 the mucosa of the bladder or rectum (biopsy-proven; bullous oedema is not enough) | CAP Table 1 | Staging module; a bladder or rectal wall without mucosa gives a Checks note |
| Pelvic (parametrial, obturator, internal and external iliac, common iliac, sacral, presacral) and para-aortic nodes are regional; any other involved node is pM1 | CAP | Node rows by region; inguinal nodes are offered under Distant metastasis |
| Macrometastasis more than 2 mm, micrometastasis more than 0.2 to 2 mm, isolated tumour cells 0.2 mm or less (or 200 cells or fewer); pN0(i+) groups with pN0; (sn) when only sentinel nodes were examined | CAP; AJCC 9 | pN1a / pN1mi (pelvic), pN2a / pN2mi (para-aortic); sentinel counts sit in the pelvic and para-aortic rows |
| AJCC version 9: "Uterine serosa and adnexal involvement are considered M1 disease"; FIGO stages involvement of the ovary or tube with tumour limited to the cervix as stage I, and WHO excludes the adnexa from M1 | CAP Note G | pM1 and IVB for the adnexa and the uterine serosa, with the FIGO note in Checks |
| The Silva system applies only to HPV-associated invasive endocervical adenocarcinoma | CAP | Silva pattern shows for HPV-associated adenocarcinoma only |
| Squamous cell carcinoma and adenocarcinoma are typed HPV-associated, HPV-independent or NOS; keratinising, non-keratinising, basaloid, papillary, warty, verrucous and lymphoepithelioma-like are morphological patterns, not diagnostic categories | WHO 5th; ICCR; PathologyOutlines (HPV associated SCC) | Histologic type; the pattern prints one sentence in Tumour histology and never in the diagnosis |
| Gastric-type adenocarcinoma and neuroendocrine carcinomas are best regarded as high grade; grading is not recommended for HPV-independent adenocarcinomas; tumours with a micropapillary, signet-ring or iSMC component are high grade automatically | ICCR | Grade is optional and left blank in the gastric-type fixture |
| Villoglandular adenocarcinoma is a morphological variant of usual-type HPV-associated adenocarcinoma | ICCR | A subtype of HPV-associated adenocarcinoma |

## Printed morphology sentences

| Type, pattern or subtype | Sentence (Tumour histology) | Source |
|---|---|---|
| Squamous cell carcinoma, no pattern | Irregular, anastomosing nests of atypical squamous cells infiltrate a desmoplastic stroma. | PathologyOutlines, HPV associated SCC (irregular anastomosing nests within desmoplastic or inflammatory stroma) |
| Keratinising | Infiltrating irregular nests of atypical squamous cells show abundant eosinophilic cytoplasm, intercellular bridges and keratin pearls. | PathologyOutlines, HPV associated SCC (keratin pearls, intercellular bridges) and HPV independent SCC (keratin pearl formation, abundant eosinophilic cytoplasm and intercellular bridges) |
| Non-keratinising | Infiltrating nests and sheets of atypical squamous cells show intercellular bridges but no keratin pearls. | PathologyOutlines, HPV associated SCC (polygonal cells forming sheets or nests; intercellular bridges but not keratin pearls) |
| Basaloid | Well-defined nests of immature basaloid cells with scant cytoplasm and hyperchromatic nuclei show peripheral palisading and little keratinisation. | PathologyOutlines, HPV associated SCC (well defined nests of immature basaloid cells, peripheral palisading, scant cytoplasm, focal keratinisation); ICCR (minimal keratinisation) |
| Papillary | Papillae with fibrovascular cores are lined by multilayered atypical squamous epithelium. | PathologyOutlines, HPV associated SCC |
| Warty | Atypical squamous epithelium with a warty, condyloma-like surface shows koilocytic atypia and keratinisation. | PathologyOutlines, HPV associated SCC |
| Verrucous | Well-differentiated squamous epithelium with marked acanthosis and minimal cytological atypia pushes into the stroma as broad, bulbous pegs. | PathologyOutlines, HPV associated SCC (acanthotic epithelium, broad based pushing invasion with bulbous epithelial pegs, minimal cytologic atypia) |
| Lymphoepithelioma-like | Syncytial nests of undifferentiated cells with vesicular nuclei and prominent nucleoli lie in a dense lymphoplasmacytic infiltrate. | PathologyOutlines, lymphoepithelioma-like carcinoma and HPV associated SCC |
| Adenocarcinoma, no subtype (NOS, HPV-associated or HPV-independent) | Irregular, angulated atypical glands infiltrate the cervical stroma. | PathologyOutlines, HPV associated adenocarcinoma (irregularly shaped, angulated or fragmented glands) |
| Usual type | Infiltrating glands are lined by columnar cells with mucin-depleted cytoplasm and enlarged, hyperchromatic nuclei, with apical mitotic figures and basal apoptotic bodies. | PathologyOutlines, HPV associated adenocarcinoma (mucin-depleted epithelium, enlarged hyperchromatic nuclei, apical mitoses) and primary endometrioid adenocarcinoma (floating luminal mitoses, basal apoptotic bodies of HPV-associated adenocarcinoma); ICCR (apoptotic bodies at scanning magnification) |
| Mucinous type, NOS | Infiltrating glands are lined by atypical columnar cells with abundant intracytoplasmic mucin. | PathologyOutlines, HPV associated adenocarcinoma (mucinous epithelium 50% or more of the tumour) |
| Intestinal type | Infiltrating glands are lined by atypical intestinal-type epithelium with goblet cells. | PathologyOutlines, HPV associated adenocarcinoma (intestinal differentiation, goblet cells) |
| Signet-ring cell type | Mucinous tumour cells, including signet-ring cells, infiltrate the stroma. | PathologyOutlines, HPV associated adenocarcinoma (mucinous epithelium with signet ring cells) |
| iSMC | Solid infiltrative nests of stratified mucinous cells show peripheral nuclear palisading, apoptotic bodies and a neutrophilic infiltrate. | PathologyOutlines, invasive stratified mucin producing carcinoma |
| Villoglandular type | Long, thin exophytic papillae with fibrovascular cores are lined by columnar cells with mild to moderate nuclear atypia. | Adenocarcinoma review (long, thin exophytic papillae lined by columnar cells with mild-to-moderate atypia) |
| Micropapillary type | Small, tightly cohesive papillary groups of tumour cells lie within clear spaces. | Adenocarcinoma review (small, tightly cohesive papillary groups, often surrounded by clear spaces) |
| Gastric type | Infiltrating glands are lined by columnar cells with abundant clear to pale eosinophilic cytoplasm and distinct cell borders. | PathologyOutlines, gastric type adenocarcinoma (Kojima criteria) |
| Clear cell type | Tubulocystic, papillary and solid growths of cells with clear to pale eosinophilic cytoplasm include hobnail cells. | PathologyOutlines, clear cell carcinoma |
| Mesonephric type | Small, back-to-back tubules lined by cuboidal cells contain eosinophilic, colloid-like secretions. | PathologyOutlines, mesonephric adenocarcinoma |
| Endometrioid carcinoma | Fused and cribriform tubular glands are lined by columnar cells with pseudostratified nuclei. | PathologyOutlines, primary endometrioid adenocarcinoma |
| Carcinosarcoma | Carcinomatous and sarcomatous components are intimately admixed. | PathologyOutlines, carcinosarcoma |
| Adenosquamous carcinoma | Malignant glandular and squamous components are intermixed. | PathologyOutlines, adenosquamous carcinoma; ICCR (unequivocal malignant squamous and glandular components) |
| Adenoid basal carcinoma | Small nests and cords of bland basaloid cells with peripheral palisading infiltrate the stroma without a stromal reaction. | PathologyOutlines, adenoid basal carcinoma (WHO 5th edition criteria) |
| Mucoepidermoid carcinoma | Nests of epidermoid, intermediate and mucous cells infiltrate the stroma. | PathologyOutlines, invasive stratified mucin producing carcinoma (differential diagnosis: three cell types, epidermoid, intermediate and mucous) |
| Neuroendocrine tumour (NOS, grade 1, grade 2) | Nests and trabeculae of round to oval cells with finely granular chromatin infiltrate the stroma. | PathologyOutlines, neuroendocrine tumour |
| Small cell neuroendocrine carcinoma | Sheets of small cells with scant cytoplasm and hyperchromatic, moulded nuclei show frequent mitoses, apoptotic bodies and necrosis. | PathologyOutlines, small cell neuroendocrine carcinoma |
| Large cell neuroendocrine carcinoma | Insular and trabecular growths of large atypical cells with eosinophilic cytoplasmic granules show frequent mitoses and extensive necrosis. | PathologyOutlines, large cell neuroendocrine carcinoma |

Unclassifiable (undifferentiated) carcinoma, neuroendocrine carcinoma NOS, mixed neuroendocrine non-neuroendocrine carcinoma, carcinoma of undetermined type and a typed other type print the type alone (ICCR notes it is uncertain whether a truly undifferentiated cervical carcinoma is a separate subtype). A typed Histology note replaces the whole paragraph.

## Departures from the QMH report order

The synoptic follows the QMH report order (the element-order test in `tests/cervical_carcinoma.test.js` reads it from the saved page), except:

1. The Tumour histology paragraph follows Perineural invasion, as in the user's cone reports (QMH: the histology heading opens the section).
2. The margins print one "Surgical margins" row that names the tumour, with one sub-row per margin giving the location and distance ("7 o'clock, 4.5 mm"), as in the user's cone reports; the precursor status sits on the same sub-row.
3. Sentinel nodes are counted within the pelvic and para-aortic rows, not as rows of their own.
4. The pTNM block follows Distant metastasis; FIGO stage is not printed (Checks only).
5. HPV testing prints under Molecular findings.
6. The report opens with the house "Specimen and tumour" section (procedure, hysterectomy type, site and size) and closes with the diagnosis in the user's form.
