# Hepatocellular carcinoma resection: morphology behind the QMH / CAP 4.3.0.0 reporting elements

Prepared 2 October 2026 for the sign-out template work. The element set is fixed by the [QMH Anatomical Pathology HCC template](https://awiloqmh.github.io/CancerReportingTemplate/GI-HCC.html), whose footer reads "Last upated on 18-Dec-2024, based on US CAP cancer protocol templates. Version: Hepatocellular 4.3.0.0 (June 2022)" ([QMH template](https://awiloqmh.github.io/CancerReportingTemplate/GI-HCC.html); saved copy at docs/reference/GI-HCC.html). Staging follows AJCC 8th edition, as on the QMH page and in the [CAP Hepatocellular Carcinoma protocol v4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true).

Conventions used below:
- Text in quotation marks is copied verbatim from the linked source (including the source's own spelling and typos). Inline reference numerals, PDF line-break hyphens and page-break running headers inside quoted passages have been left out; "..." marks omitted text. Inside a quoted option list, " / " separates consecutive options (or listing cells) exactly as they follow each other in the source.
- "n.a." means the value could not be confirmed from an openly accessible authoritative source in this session; nothing has been filled in from memory.
- The WHO Classification of Tumours (5th edition, 2019) book itself was not openly accessible. WHO criteria are therefore given as reproduced by RCPath, ICCR, CAP and peer-reviewed reviews, and are labelled as such.

---

## 0. Version status (checked 2 October 2026)

| Item | Finding | Source |
|---|---|---|
| CAP HCC protocol in use on the QMH page | v4.3.0.0. "Protocol Posting Date: June 2022"; "CAP Laboratory Accreditation Program Protocol Required Use Date: March 2023"; "Standard(s): AJCC-UICC 8" | [CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true) |
| What changed in 4.3.0.0 | "Deprecated Hepatoblastoma from Histologic Type question"; "Corrected typo in Explanatory Note C" | [CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true) |
| Latest CAP HCC protocol | Still v4.3.0.0. The CAP listing shows "Hepatocellular Carcinoma", "Current Version: Jun-22", "PDF (v4.3.0.0)", with previous versions "2021 (v4.2.0.0)" and "2020 (v4.1.0.0)". No newer HCC version is listed. | [CAP current cancer protocols](https://www.cap.org/protocols-and-guidelines/cancer-protocols/current-cancer-protocols/) |
| Recent CAP liver-adjacent changes | The 16 September 2026 release moved "Bile Duct (Distal Extrahepatic, Intrahepatic & Perihilar)" protocols to "WHO 6th Edition updates"; HCC is not listed as updated. | [CAP current cancer protocols](https://www.cap.org/protocols-and-guidelines/cancer-protocols/current-cancer-protocols/) |
| AJCC Version 9 for liver | None. The AJCC Version 9 protocols listed by year are: 2021 Cervix Uteri; 2023 Appendix, Anus, Brain & Spinal Cord; 2024 the six NET sites and Vulva; 2025 Lung, Thymus, Diffuse Pleural Mesothelioma, Nasopharynx; 2026 Salivary Glands, Oropharynx (HPV-Associated). AJCC also states: "All disease sites in the 8th Edition Cancer Staging Manual remain current until replaced with Version 9." | [AJCC Version 9 page](https://www.facs.org/quality-programs/cancer-programs/american-joint-committee-on-cancer/version-9/) |
| UICC TNM 9th edition | "The TNM Classification of Malignant Tumours, 9th Edition, published in 2025". In the UICC summary of TNM9 changes, the "Liver" row shows "—" in every column (cT, cN, cM, pT, pN, pM, cStage, pStage) and has no clarification entry. Sites that changed are marked "M". | [UICC TNM](https://www.uicc.org/what-we-do/sharing-knowledge/tnm); [Brierley et al., Int J Cancer 2026](https://onlinelibrary.wiley.com/doi/full/10.1002/ijc.70561) |
| WHO classification | WHO Classification of Tumours 6th edition, Volume 1 (Digestive System Tumours), was published on 29 July 2026. CAP 4.3.0.0 and the QMH page still use the 2019 5th edition. HCC criteria in the 6th edition: n.a. (not openly accessible). | [IARC news](https://www.iarc.who.int/news-events/publication-of-the-who-classification-of-tumours-6th-edition-volume-1-digestive-system-tumours/); [IARC book page](https://publications.iarc.who.int/Book-And-Report-Series/Who-Classification-Of-Tumours/Digestive-System-Tumours-2026); [CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true) |
| Comparator datasets used | ICCR Intrahepatic Cholangiocarcinoma, Perihilar Cholangiocarcinoma and Hepatocellular Carcinoma guide, "Version 2.0 Published November 2020". RCPath G050 liver dataset, "Version number 3", September 2022. An RCPath G050 draft revision page exists, but its content was restricted (n.a.). | [ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf); [RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf); [RCPath G050 draft page](https://www.rcpath.org/resourceLibrary/g050-liver-resection-specimens.html) |

---

## 1. Element map (QMH page to CAP 4.3.0.0 to this report)

The rendered QMH form contains these items: histologic type (WHO 2019), histologic grade, tumour extension, satellitosis, vascular invasion, perineural invasion, treatment effect (with a "Liang et al 2022" link), surgical margins (parenchymal and other), regional lymph nodes (number examined, number involved, extranodal extension, size of largest deposit, size of largest involved node), distant metastasis, pTNM (AJCC 8e) with m/r/y descriptors, and additional pathologic findings ([QMH template](https://awiloqmh.github.io/CancerReportingTemplate/GI-HCC.html)). In the saved copy, a gross-description block (procedure, tumour focality, tumour site and tumour size) and a separate "Lymphovascular invasion" item sit inside HTML comments, so they do not render. Section 13 therefore draws the macroscopy items from CAP, ICCR and RCPath.

| QMH element | CAP 4.3.0.0 counterpart | Section |
|---|---|---|
| Histologic type (WHO 2019) | Histologic Type (Note B) | 2 |
| Histologic grade | Histologic Grade (Note C) | 3 |
| Tumour extension | Tumor Extent | 4 |
| + Satellitosis | +Satellitosis (Note D) | 5 |
| Vascular invasion; + Perineural invasion | Vascular Invasion (Note E); +Perineural Invasion | 6 |
| Treatment effect | Treatment Effect (Note D) | 7 |
| Surgical margins | Margins (Note F) | 8 |
| Regional lymph nodes | Regional Lymph Nodes; Note G "Lymph Nodes" | 9 |
| Distant metastasis | Distant Metastasis | 10 |
| pTNM (AJCC 8e) | Pathologic Stage Classification (Note G) | 11 |
| Additional pathologic findings | Additional Findings (Note H) | 12 |
| (gross block, not rendered) | Procedure, Tumor Focality, Tumor Site, Tumor Size (Note D) | 13 |

Sources for the CAP column: [CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true).

---

## 2. Histologic type

### 2.1 Template options
The QMH options match the CAP 4.3.0.0 list: "Hepatocellular carcinoma", "Hepatocellular carcinoma, fibrolamellar", "Hepatocellular carcinoma, scirrhous", "Hepatocellular carcinoma, clear cell type", "Other histologic type not listed (specify)" and "Carcinoma, type cannot be determined" ([QMH template](https://awiloqmh.github.io/CancerReportingTemplate/GI-HCC.html); [CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)).

The protocol's scope is limited. CAP states: "This protocol applies only to hepatic resection specimens containing hepatocellular carcinoma including fibrolamellar carcinoma ... This scheme is also not used for combined HCC-cholangiocarcinoma, sarcomas, and metastatic tumors." CAP also notes: "Scirrhous and sarcomatoid HCC are separately listed in the AJCC 8th edition but are considered histologic variants of HCC and not as distinct entities in the WHO 2010 classification." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)).

On frequency, ICCR states that the WHO subtypes "amount together 20-30% of all HCCs and are to be distinguished from conventional/Not Otherwise Specified (NOS) HCC" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)). The table linked from the QMH page gives a different figure: "NOS-HCC accounts for approximately 65% of all HCCs" ([Loy et al., AJR 2022](https://ajronline.org/doi/full/10.2214/AJR.21.26982)). Torbenson states: "Overall, about 70% of all hepatocellular carcinomas can be subclassified into morphological subtypes." ([Torbenson, Hum Pathol 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC9258523/)). These proportions disagree.

ICCR gives this general rule: "In general, the predominant subtype is used to inform the diagnosis but minimum criteria exist for clear cell, at >80% and steatohepatitic HCC, at 50%." ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)). RCPath treats the subtypes other than fibrolamellar as "a non-core item", because "the definition and characterisation of the other subtypes are evolving" ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).

### 2.2 WHO 2019 subtypes: defining features and thresholds
Column A quotes RCPath Appendix N. RCPath describes that appendix as "Morphological subtypes of hepatocellular carcinoma – relative frequency and key histological features", based on the WHO table ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)). Column B quotes Table 1 of Loy et al. This is the figure the QMH page links as "Liang et al 2022"; see Section 7.2 ([Loy et al., AJR 2022](https://ajronline.org/doi/full/10.2214/AJR.21.26982)). Column C gives other sources.

| Subtype | A. RCPath Appendix N (WHO-based), frequency | B. Loy et al. 2022 Table 1 (QMH-linked) | C. Other thresholds |
|---|---|---|---|
| HCC, NOS | n.a. in Appendix N | "NOS-HCC accounts for approximately 65% of all HCCs" | ICCR: subtypes "together 20-30%" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)) |
| Steatohepatitic | "5–20%"; ">50% tumour shows histological features of steatohepatitis with steatotic and ballooned neoplastic cells, Mallory–Denk bodies, intra-tumoral inflammation and pericellular fibrosis" | "5–20"; "Cell ballooning, inflammation, pericellular fibrosis, and Mallory-Denk bodies" (no percentage given) | ICCR: "steatohepatitic HCC, at 50%" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)). Torbenson: the cut-off "was originally defined as 5% [16], but later moved to 50 % [17]"; "Current recommendation: at least 50%" ([Torbenson 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC9258523/)) |
| Clear cell | "3–7%"; ">80% of the tumour with clear cell morphology due to intracytoplasmic glycogen; may have steatotic neoplastic cells" | "3–7"; "Cytoplasmic accumulation of glycogen with clear cell morphology (> 80% of the tumor)" | ICCR: "clear cell, at >80%" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)). Torbenson: "Current recommendation: at least 50%, with a cut off of 90% giving a more pure group of tumors" ([Torbenson 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC9258523/)). **Disagreement** |
| Macrotrabecular-massive | "5%"; ">50% of the tumour with macrotrabecular growth pattern; trabeculae ≥10 cell-thick" | "5"; "Macrotrabecular (> 6 cells thick) architecture in > 50% of tumor, with satellite nodules and macrovascular and/or microvascular invasion"; the text says "macrotrabecular (i.e., six to 20 cells thick)" | Torbenson: "the most common are >6 [26] and ≥10 in thickness [9], while earlier definitions also used ≥20 [27]. There is no objective data to favor one over the other"; later papers "used cut-offs that range from 30 to 50% for the macrotrabecular growth pattern" ([Torbenson 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC9258523/)). **Disagreement on trabecular thickness (>6 vs ≥10 cells)** |
| Scirrhous | "4%"; ">50% of the tumour shows dense fibrosis" | "4"; "Dense fibrous stroma (> 50% of the tumor)" | Torbenson: "over 50% of the tumor showing dense intratumoral fibrosis" ([Torbenson 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC9258523/)). Concordant |
| Chromophobe | "3%"; "Neoplastic cells have light or clear cytoplasm; generally mild nuclear pleomorphism with focal areas of marked nuclear atypia; scattered microscopic pseudocysts" | "3"; "Smooth, clear (chromophobic) cytoplasm, abrupt focal nuclear anaplasia" | Percentage threshold: n.a. |
| Fibrolamellar | "1%"; "Large eosinophilic neoplastic cells with large vesicular nuclei and prominent nucleoli; usually numerous intracytoplasmic pale and/or hyaline bodies; neoplastic cells positive for K7 and CD68; dense lamellar intratumoural fibrosis; non-cirrhotic background liver" | "1"; "Well-differentiated neoplastic cells with deeply eosinophilic and granular cytoplasm; thick, fibrous lamellae"; "Young age, no liver disease" | CAP: "CK7 and CD68 are positive in nearly all fibrolamellar carcinomas but are not specific"; the DNAJB1-PRKACA alteration "is seen in 80% to 100% of FLM cases and has not been reported in classical HCC" ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)). Mixed tumours: see note below |
| Neutrophil-rich | "<1%"; "Numerous neutrophils diffusely infiltrating within the tumour; may have focal sarcomatoid morphology" | "< 1"; "Marked infiltrates by neutrophils" | Torbenson: "Most are poorly differentiated hepatocellular carcinomas, often with sarcomatoid areas"; "hepatic differentiation should be demonstrated by immunohistochemistry" ([Torbenson 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC9258523/)). Percentage threshold: n.a. |
| Lymphocyte-rich | "<1%"; "Dense intratumoural lymphoid cell infiltrates; lymphocytes outnumber neoplastic cells in most areas" | "< 1"; "Prominent lymphocytic infiltrate, predominance of cytotoxic CD8+ lymphocytes" | Torbenson: "The lymphocytosis should be diffuse (Figure 6A), involving over 50% of the tumor. Within the areas of lymphocytosis, the number of lymphocytes should exceed the number of tumor cells on H&E." ([Torbenson 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC9258523/)) |

Sources for columns A and B: [RCPath G050 V3, Appendix N](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf); [Loy et al., AJR 2022, Table 1](https://ajronline.org/doi/full/10.2214/AJR.21.26982).

**Fibrolamellar carcinoma mixed with conventional HCC: sources disagree.**
- CAP 3.1.0.0 (2011): "typical hepatocellular carcinoma should not be classified as fibrolamellar carcinoma; this term should be reserved for those tumors showing only the fibrolamellar pattern" ([CAP 3.1.0.0](https://documents.cap.org/protocols/cp-hepatocellular-carcinoma-2012-v3100.pdf)).
- Torbenson: "there is no compelling evidence for a combined hepatocellular carcinoma-fibrolamellar carcinoma ... Strength of recommendation: A" ([Torbenson 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC9258523/)).
- RCPath states that fibrolamellar carcinoma "usually arises in young patients without background liver disease or is present as a component of an otherwise conventional HCC" ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
- On prognosis, CAP 4.3.0.0 states that "several recent studies have shown that the outcome is similar to classical HCC in noncirrhotic liver" ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)). ICCR agrees: "the outcome is similar when compared to conventional HCC arising in non-cirrhotic liver" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).

---

## 3. Histologic grade

### 3.1 Template and CAP criteria (AJCC 8th, 4-tier)
The options are "G1: Well differentiated", "G2: Moderately differentiated", "G3: Poorly differentiated", "G4: Undifferentiated", "GX: Cannot be assessed", "Other (specify)" and "Not applicable". CAP adds the instruction: "For multiple tumors, select the worst grade." ([QMH template](https://awiloqmh.github.io/CancerReportingTemplate/GI-HCC.html); [CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)).

CAP Note C reads as follows ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)):
> "A variety of grading systems including Edmondson and Steiner and WHO 2010 scheme have been advocated. The former is based on nuclear features, while the latter is based on differentiation. AJCC Cancer Staging Manual, 8th edition advocates a 4-tier grading scheme ... Well-differentiated tumors closely resemble normal liver and have minimal to mild cytologic atypia, limited reticulin loss and relatively thin cell plates. Moderately differentiated HCC show thick cell plates with mild to moderate nuclear atypia and more prominent loss of reticulin. Poorly differentiated tumors show marked nuclear atypia and/or high mitotic activity; the hepatocellular nature in some of these tumors may not be clearly evident on morphology. Undifferentiated category is rarely used and is reserved for tumors that do not show obvious hepatocellular or other differentiation on morphology or immunohistochemistry. It is more appropriate to categorize these as undifferentiated carcinomas rather than a subgroup of HCC. This protocol does not preclude the use of other grading systems. The grading system used should be specified."

### 3.2 WHO 5th edition / ICCR / RCPath (3-tier)
- **ICCR:** "A recent consensus document advocated a three-point grading system (well, moderately or poorly differentiated), also recommended by the WHO Classification of tumours 5th edition, with the worst grade determining the overall grade ... Grade 1 and 2 HCC of Edmondson and Steiner are combined as well-differentiated HCC in the three-point grading system. For practical purposes, well-differentiated HCCs are those where the tumour cells closely resemble hepatocytes such that the differential diagnosis is with dysplastic nodule (in cirrhosis) or adenoma (in non-cirrhotic livers), whereas poorly differentiated HCC are those where the hepatocellular nature of the tumour is not evident from the morphology. Moderately differentiated HCCs show some degree of hepatocytic differentiation." ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf))
- **RCPath:** "Recent authors, including those of the WHO classification, favour a three-point grading system (well, moderately or poorly differentiated); where there is heterogeneity, the worst grade should be assigned ... well-differentiated HCCs are those where the tumour cells closely resemble hepatocytes such that the differential diagnosis is with high grade dysplastic nodule (in cirrhosis) or HCA (in non-cirrhotic livers)." The RCPath proforma field is "Tumour grade/differentiation by worst area: Well □ Moderate □ Poor □" ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
- **WHO grade features**, as tabulated in Gisder et al. (Table 1, after WHO) ([Gisder et al., Hepatoma Res 2022](https://www.oaepublish.com/articles/2394-5079.2021.106)):

| WHO grade | Architecture | Cytology | Other |
|---|---|---|---|
| Well differentiated | "Thin trabecular, frequent acinar structures" | "Minimal atypia" | "Fatty change is frequent" |
| Moderately differentiated | "Trabecular (3 or more cells in thickness) and acinar" | "Abundant eosinophilic cytoplasm, round nuclei with distinct nucleoli" | "Bile or proteinaceous fluid within acini" |
| Poor differentiated | "Solid" | "Moderate to marked pleomorphism" | "Absence of sinusoid-like blood spaces" |

### 3.3 Edmondson–Steiner (1954) grades, verbatim from CAP 3.1.0.0 (AJCC 7th era)
CAP 3.1.0.0 stated: "The grading system of Edmondson and Steiner is recommended for hepatocellular carcinomas by this protocol and by the AJCC Cancer Staging Manual, 7th edition." The grades are given below ([CAP 3.1.0.0](https://documents.cap.org/protocols/cp-hepatocellular-carcinoma-2012-v3100.pdf)):
- **Grade I:** "Reserved for hepatocellular carcinomas where the difference between the tumor cells and hyperplastic liver cells is so minor that a diagnosis of carcinoma rests upon the demonstration of more aggressive growths in other parts of the neoplasm. Because grade is assigned based upon the highest grade present, in effect grade I is rarely if ever used for overall tumor grade designation."
- **Grade II:** "Cells show marked resemblance to normal hepatic cells. Nuclei are larger and more hyperchromatic than in normal cells. Cytoplasm is abundant and acidophilic. Cell borders are sharp and clear cut. Acini are frequent and variable in size. Lumina are often filled with bile or protein precipitate."
- **Grade III:** "Nuclei are larger and more hyperchromatic than in grade II cells. The nuclei occupy a relatively greater proportion of the cell (high nuclear to cytoplasmic [N:C] ratio). Cytoplasm is granular and acidophilic, but less so than grade II tumors. Acini are less frequent and not as often filled with bile or protein precipitate. More single-cell growth in vascular channels is seen than in grade II."
- **Grade IV:** "Nuclei are intensely hyperchromatic. Nuclei occupy a high percentage of the cell. Cytoplasm is variable in amount, often scanty. Cytoplasm contains fewer granules. The growth pattern is medullary in character, trabeculae difficult to find, and cell masses seem to lie loosely without cohesion in vascular channels. Only rare acini are seen. Spindle cell areas have been seen in some tumors. Short plump cell forms, resembling “small cell” carcinoma of the lung, are seen in some grade IV tumors."

### 3.4 Mapping between systems

| CAP / AJCC 8 (4-tier) | WHO 5th / ICCR / RCPath (3-tier) | Edmondson–Steiner | Basis |
|---|---|---|---|
| G1 well | Well | I and II ("Grade 1 and 2 ... combined as well-differentiated") | [ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf) |
| G2 moderately | Moderately | n.a. (no explicit published mapping found for III) | n.a. |
| G3 poorly | Poorly | n.a. (no explicit published mapping found for III/IV) | n.a. |
| G4 undifferentiated | No HCC equivalent: CAP says these are better categorised "as undifferentiated carcinomas rather than a subgroup of HCC" | n.a. | [CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true) |

**Disagreements on grade:**
- CAP and AJCC 8 use a 4-tier system, while ICCR, RCPath and WHO 5th edition use 3 tiers. All of them grade by the worst area or worst tumour.
- One secondary source contradicts itself. Gisder et al. say that Edmondson–Steiner "favors a three-tiered grading system [Table 2]", although the Edmondson–Steiner scheme has four grades. The same paper also states: "Grading, according to Edmondson and Steiner, is recommended by UICC in HCC" ([Gisder et al. 2022](https://www.oaepublish.com/articles/2394-5079.2021.106)). Use the primary datasets for this point.

---

## 4. Tumour extension

### 4.1 Template options
- **QMH:** "Tumor confined to liver", "Tumor involves a major branch of the portal vein", "Tumor involves hepatic vein(s)", "Tumor involves (perforates) visceral peritoneum", "Tumor directly invades gallbladder", "Tumor directly invades diaphragm", "Tumor directly invades other adjacent organs (specify)", "Cannot be assessed", "No evidence of primary tumor" ([QMH template](https://awiloqmh.github.io/CancerReportingTemplate/GI-HCC.html)).
- **CAP:** the same list, worded "Confined to liver" ... "Cannot be determined" ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)).
- **Caution:** the option "Involves hepatic vein(s)" does not itself say "major". Only involvement of a *major* branch is pT4 (Section 11 and the definitions below).

### 4.2 Definitions that decide pT4
- **Major vascular invasion (CAP Note G):** "Major vascular invasion is defined by involvement of branches of main portal vein (right or left, excluding sectoral and segmental branches), hepatic veins (right, middle or left) or main branches of hepatic artery (right or left)." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))
- **Major vascular invasion (RCPath):** "Involvement of a major branch of the portal or hepatic vein (i.e. main left or right portal vein or left, middle or right hepatic vein) becomes stage pT4 in TNM8" ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
- **Major vascular invasion (ICCR):** "This refers to the main right or left branch of the vein, as distinct from macroscopic VI which relates to macroscopically visible involvement of any vessel – the width of the vessel is not helpful as intravascular tumour may distend the calibre of the vein." ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf))
- **Disagreement:** CAP includes the right and left hepatic arteries in its definition of major vascular invasion. The pT4 wording itself (Section 11) and the RCPath and ICCR definitions name only portal and hepatic veins.
- **Ligaments and diaphragm:** "Involvement of falciform or other ligaments is not considered T4, and should be categorized as T1-T3 based on other parameters. Direct invasion into diaphragm is considered as T4." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)). UICC wording (via ICCR) is "direct invasion of adjacent organs (including the diaphragm), other than the gallbladder" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).
- **Commonest sites:** "The most frequent location of HCC extension in other organs is the diaphragm, followed by the right adrenal gland, abdominal wall, colon, stomach and pancreas. Tumour extension to adjacent organs should be confirmed histologically" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).
- **Capsule and visceral peritoneum:** ICCR advises sampling the "Liver capsule if there is a possibility of capsular invasion, i.e., where there is subjacent tumour and overlying adherent tissue or macroscopic capsular invasion. Where the capsule appears intact over subcapsular tumour, with a smooth shiny surface, histology is not required to confirm capsular integrity." ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)). The UICC TNM Supplement (4th edition) gives only a general rule: "Penetration or perforation of visceral serosa is a criterion for the T classification of some tumour sites, e.g. stomach, colon, rectum, liver (HCC and ICC), gallbladder, lung and ovary. It may be confirmed by histological examination of biopsies or resection specimens, or by cytological examination of specimens obtained by scraping the serosa overlying the primary tumour." ([UICC TNM Supplement, 4th ed.](https://download.e-bookshelf.de/download/0000/5955/44/L-G-0000595544-0030457286.pdf)). Histological criteria for "perforation of visceral peritoneum" specific to HCC were not found in CAP 4.3.0.0, ICCR v2.0 or RCPath V3 (n.a.).
- **ICCR extent-of-invasion item:** ICCR records macroscopic and microscopic invasion separately. For HCC the options are "Tumour confined to liver", "Tumour involves visceral peritoneum", "Tumour directly invades gallbladder" and "Tumour directly invades other adjacent organs, specify" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)). This list has no major-vein option. Major veins appear instead in ICCR's vascular invasion item, as "Present macroscopically (large portal or hepatic veins)" (Section 6.1).
- **Rupture versus artefact:** ICCR's non-core "Macroscopic tumour rupture" note says rupture "is largely a clinical diagnosis". It also says rupture "needs to be distinguished from peri-operative fragmentation of the capsule, which occasionally occurs with a large, bulging, soft/friable tumour" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).

---

## 5. Satellitosis

### 5.1 Template
The item is "+ Satellitosis: Not identified / Present / Cannot be determined". It is optional ("+") in CAP ([QMH template](https://awiloqmh.github.io/CancerReportingTemplate/GI-HCC.html); [CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)).

### 5.2 Definitions by source (size and distance)

| Source | Verbatim definition | Size of satellite | Distance from main tumour |
|---|---|---|---|
| CAP 4.3.0.0 (Note D) | "There is no universally accepted definition for satellitosis, and different criteria have been used in different studies. The definition suggested by International Collaboration on Cancer Reporting (ICCR) is recommended: HCC nodule smaller than the primary tumor, within 2 cm of the primary tumor, but separated by nontumor tissue. Tumor within a vascular structure should be categorized as lymphatic/vascular invasion and not as satellitosis." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)) | Smaller than the primary (no absolute limit) | Within 2 cm |
| ICCR v2.0 (2020) | ICCR "supports the definition within the most recent WHO Classification which notes that with respect to satellitosis 'they may occur in close proximity to a single large dominant nodule, are often multiple and usually within 2 cm of the main tumour'. They are considered to represent local spread generally within portal venules." ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)) | Not specified | "usually within 2 cm" |
| ICCR v1.1 (2018) | "Roayaie et al used a definition of tumours less than or equal to 2 cm and located of less than or equal to 2 cm from the main tumour. The Liver Cancer Study Group of Japan included in their definition that the satellite nodules should be histologically similar or less differentiated than the main tumour ... we suggest a definition of 'when a satellite nodule is separated from the main tumour by a distance greater than that of the satellite diameter'." ([ICCR 1st ed. v1.1](https://www.iccr-cancer.org/wp-content/uploads/attachments/ICCR-Liver-1st-ed-v1-1-bookmark.pdf)) | ≤2 cm (Roayaie) | ≤2 cm (Roayaie); or separation greater than the satellite's diameter (ICCR v1.1 proposal) |
| RCPath V3 (2022) | "In the recently published WHO classification and ICCR dataset, satellites are defined as occurring in close proximity to a single large dominant nodule, are often multiple, and usually within 2 cm of the main tumour." ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)) | Not specified | "usually within 2 cm" |
| Renne et al., Pathologica 2021 | "A satellite nodule is a small nodule close (< 2 cm) to the main tumor." ([Renne et al. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8299323/)) | "small" | <2 cm |
| Review, J Surg Oncol 2026 | Satellite nodules "have been defined as tumors < 2 cm in size, located < 2 cm from the primary tumor"; the definition "is most commonly described as nodules ≤ 2 cm located within 2 cm of the primary tumor; however, this definition is largely based on histopathologic assessment and is not uniformly applied" ([satellite-lesion review 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC13427198/)) | <2 cm or ≤2 cm | <2 cm or within 2 cm |

**Disagreements:**
- CAP attributes its wording ("smaller than the primary tumor, within 2 cm ..., separated by nontumor tissue") to ICCR. That wording does not appear in either ICCR edition examined. ICCR v2.0 uses the WHO phrase "usually within 2 cm" with no size limit. ICCR v1.1 proposed a separation greater than the satellite diameter ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf); [ICCR 1st ed. v1.1](https://www.iccr-cancer.org/wp-content/uploads/attachments/ICCR-Liver-1st-ed-v1-1-bookmark.pdf)).
- An absolute size cut-off for the satellite itself (≤2 cm) appears only in the Roayaie-type definitions. It does not appear in CAP, WHO (as quoted), ICCR v2.0 or RCPath.

### 5.3 Rules that affect reporting and staging
- **Staging:** "For purposes of staging, satellite nodules, multifocal primary hepatocellular carcinomas, and intrahepatic metastases are considered to be multiple tumors." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)). RCPath: "Both satellitosis and intrahepatic venous dissemination are classified as multiple tumours, and are therefore equivalent for staging purposes (i.e. pT2, when no tumour is more than 50 mm)." ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf))
- **Attached co-nodules:** "A tumour with an apparent surrounding satellite nodule(s) should be regarded as a single tumour when the co-nodule(s) is attached to the main tumour. In this setting, the apparent satellite may represent an irregular leading edge of the tumour." ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf))
- **Intravascular tumour:** this is vascular invasion, not satellitosis ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)).
- **ICCR growth-pattern item:** the options include "Large dominant nodule with multiple small satellite nodules", alongside "Single distinct nodule", "Multiple distinct nodules", "Early hepatocellular carcinoma" and "Cirrhotomimetic" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).
- **Transplant explants:** "The United Network for Organ Sharing (UNOS) requires reporting of satellite HCC lesions in explanted livers." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))

---

## 6. Vascular invasion and perineural invasion

### 6.1 Template
- **Vascular invasion:** "Not identified", "Present, small vessel invasion", "Present, large vessel invasion (major branch of hepatic vein or portal vein)", "Present (not otherwise specified)", "Cannot be determined", each with the tumour nodule specified where applicable ([QMH template](https://awiloqmh.github.io/CancerReportingTemplate/GI-HCC.html); [CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)).
- **ICCR options differ:** "Not identified", "Indeterminate", "Present macroscopically (large portal or hepatic veins)" and "Present microscopically (small portal or hepatic veins or microvessels)" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)). CAP and QMH have no "indeterminate" option.
- **Lymphovascular invasion:** a separate item exists in the QMH source but is commented out (Section 1).
- **Vascular invasion is part of T for liver.** The TNM Supplement states: "The microscopic presence of tumour in lymphatic vessels or veins does not qualify as local spread of tumour as defined by the T classification (except for liver, testis and penis)." ([UICC TNM Supplement, 4th ed.](https://download.e-bookshelf.de/download/0000/5955/44/L-G-0000595544-0030457286.pdf)) CAP 4.3.0.0 has no separate lymphatic item for HCC, and a lymphatic-invasion definition specific to HCC was not found (n.a.).

### 6.2 Microscopic (small vessel) vascular invasion: definition
- **CAP:** "Microscopic vascular invasion is defined by tumor within a vascular space lined by endothelium, identified only on microscopy in the capsule or noncapsular fibrous septa, or liver tissue surrounding the tumor. Attachment of the tumor to vessel wall or presence of smooth muscle/elastic lamina (for larger vessels) helps in confirming vascular invasion. Elastic stain or immunohistochemistry for smooth muscle can be helpful in challenging situations, but their routine use is not advocated." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))
- **ICCR:** "Microscopic vascular invasion (MiVI) is usually defined as tumour within a vascular space lined by endothelium, visible only by microscopy, identified in the liver tissue surrounding the tumour and venous vessels in the tumour capsule and/or non-capsular fibrous septa. However, there is a lack of consensus for the definition of MiVI." Strict criteria are "presence of tumour cells in a space lined by endothelial cells, attachment of tumour cells to the vascular wall, or identification of muscular wall or elastic lamina of larger blood vessels". ICCR adds: "Tumour structures suspicious for VI, but for which the criteria above are not met, can be recorded as 'indeterminate'; this would not be regarded as MiVI for staging purposes." ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf))
- **RCPath:** "For the purposes of TNM classification, when the tumour nodule is within a portal area at the site appropriate to a portal vein branch, vascular invasion is only confirmed if one can clearly identify the lumen and endothelium of a portal vein (personal communication: Professor LH Sobin, TNM Helpdesk). When the configuration of the tumour suggests it may have expanded and obliterated a vascular channel but the strict definition of vascular invasion provided by the TNM helpdesk is not met, record 'not identified'. For solitary tumours >20 mm, stage as pT2 only if there is convincing vascular invasion." ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf))
- **RCPath is internally inconsistent.** Elsewhere it says: "'Uncertain' would be when the configuration of the tumour (especially HCC) suggests it may have expanded and obliterated a vascular channel but the strict definition of vascular invasion provided by the TNM helpdesk (page 16) isn't met" ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)). The same situation is therefore labelled 'uncertain' in one place and 'not identified' in another. ICCR calls it 'indeterminate'.

### 6.3 How microvascular invasion is counted or graded
- **CAP:** "The outcome may be worse with increasing number of foci with lymph-vascular invasion (LVI), but further subclassification based on extent of LVI is not supported by current data." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))
- **ICCR:** studies "sub-classify MiVI according to distance of vessels from the HCC, number of vascular structures involved and/or number of cancer cells identified within the vessel". However, "these findings have not been validated by prospective studies and/or independent groups, and therefore subclassification of MiVI is not a required item at this stage" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).
- **Research schemes, not required by CAP, ICCR or RCPath:**
  - Roayaie et al. recorded "the size of the largest vessel invaded (<5mm, 5-10mm, >10mm), number of vessels invaded (1, 2-5, >5), and furthest distance on invasion from the tumor capsule (≤1cm, >1cm)". They found that "invasion of a vessel with a muscular wall" and "invasion of a vessel that was more than 1 cm from the tumor" predicted survival ([Roayaie et al., Gastroenterology 2009](https://pmc.ncbi.nlm.nih.gov/articles/PMC2739450/)).
  - The 2015 Chinese pathology guideline graded MVI as "M0: no MVI; (2) M1 or low risk: MVI <5 vessels and ≤1 cm away from the adjacent peritumoural liver tissue; and (3) M2 or high risk: MVI >5 vessels or >1 cm away from the adjacent peritumoural liver tissue" (as summarised in [J Oncol 2022 MVI review](https://pmc.ncbi.nlm.nih.gov/articles/PMC8986383/)).

### 6.4 Large vessel and macroscopic vascular invasion
- **CAP:** "Vascular invasion includes gross as well as microscopic invasion of vessels. Macroscopic venous invasion is generally accompanied by microscopic invasion ... The presence of a portal vein tumor thrombus should be included in the report due to its adverse impact on outcome." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))
- **ICCR:** "Macroscopic VI is defined as invasion of tumour into a major vessel that can be identified during macroscopic examination or radiological imaging and is part of established clinical algorithms, such as the BCLC and contributes to TNM assessment." For the major-branch (pT4) distinction, see Section 4.2 ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).
- **Vessel diameter: sources disagree.**
  - The RCPath macroscopic core item asks for "macroscopic involvement of vessels; specify if main left or right portal vein or a main hepatic vein, and record diameter of vessel involved" ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
  - ICCR states that "the width of the vessel is not helpful as intravascular tumour may distend the calibre of the vein" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).
- **Small tumours:** "Since some studies showed lack of adverse prognostic impact of vascular invasion in tumors less than 2 cm, these tumors have been classified under the T1 category." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))

### 6.5 Perineural invasion
- **Template:** "+ Perineural invasion: Not identified / Present / Cannot be determined". It is optional in CAP ([QMH template](https://awiloqmh.github.io/CancerReportingTemplate/GI-HCC.html); [CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)).
- **CAP:** no explanatory note on perineural invasion in HCC ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)).
- **ICCR:** the proforma item is marked "(Applicable to intrahepatic and perihilar cholangiocarcinoma)", so ICCR does not record it for HCC. Note 10 (non-core) states: "The significance of perineural invasion is greater for intrahepatic cholangiocarcinoma than for hepatocellular carcinoma and is particularly relevant for large duct/perihilar tumours." It adds: "Recognition of perineural invasion, considered 'indeterminate' on haematoxylin-eosin (H&E) stains can be aided by IHC, e.g., for S100." ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf))
- **RCPath:** the core microscopic list includes "perineural invasion (CC)", and the HCC proforma has no perineural-invasion field ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
- **Disagreement:** CAP (and therefore QMH) offers perineural invasion as an optional item for HCC, while ICCR and RCPath restrict it to cholangiocarcinoma. A definition specific to HCC, or HCC-specific prognostic data: n.a.
- **Image:** Sweed et al. Fig. 3j shows "HCC with perineural invasion (arrows)" (Section 16).

---

## 7. Treatment effect

### 7.1 Template categories
- **QMH:** "No known presurgical therapy", "Complete necrosis (no viable tumor)", "Incomplete necrosis (viable tumor present), specify tumor necrosis %", "No necrosis", "Cannot be determined", followed by the link "Liang et al 2022" ([QMH template](https://awiloqmh.github.io/CancerReportingTemplate/GI-HCC.html)).
- **CAP:** the same categories, plus "+Extent of Tumor Necrosis (%)" ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)).

### 7.2 The "Liang et al 2022" reference
- **Link target:** in the saved page the link points to `.\cap\HCC_WHO2019.png`, with alt text "Risk assessment" (docs/reference/GI-HCC.html). The image is Table 1 of Loy LM, Low HM, Choi JY, Rhee H, Wong CF, Tan CH, "Variant Hepatocellular Carcinoma Subtypes According to the 2019 WHO Classification: An Imaging-Focused Review", AJR Am J Roentgenol 2022, doi:10.2214/AJR.21.26982 ([AJR](https://ajronline.org/doi/full/10.2214/AJR.21.26982); [PubMed](https://pubmed.ncbi.nlm.nih.gov/35170359/)). PubMed lists the first author as "Liang Meng Loy", which explains the label "Liang et al" ([PubMed](https://pubmed.ncbi.nlm.nih.gov/35170359/)).
- **What it contains:** the table lists subtype, prognosis, frequency, histopathologic characteristics and clinical considerations (reproduced in Section 2.2). It has **no necrosis or treatment-response categories**. The treatment-effect categories on the QMH form are CAP's own ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)).

### 7.3 Assessment rules
- **CAP:** "The extent of necrosis that would correlate with outcome is not known. Hence there are no definite guidelines for pathologic assessment of the specimen and how to assess the extent of necrosis. The entire tumor should be examined microscopically, when possible, especially for tumors up to 2 cm. For larger tumors, an additional section for each 1 cm is recommended, with additional sampling as necessary from the periphery of the tumor or areas that appear viable. The overall extent of necrosis is determined by a combination of gross and microscopic findings, and should be reported in up to 5 of the largest tumour nodules. Both gross size and size of viable tumor for each focus (up to 5) can be provided, and only size of viable tumor should be used for staging." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))
- **ICCR categories:** "No neoadjuvant treatment", "Complete response – no viable cancer cells", "Partial response – residual cancer with some tumour regression", "No response – extensive residual cancer with no evident tumour regression", "Cannot be assessed", plus "Percentage necrosis" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).
- **ICCR on thresholds:** "Although figures such as 50% and 90% necrosis have been used in some studies, there is insufficient evidence to make definite recommendations about cut off values for necrosis that correlate with outcome ... The extent of necrosis should be reported in up to five of the largest tumour nodules." ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf))
- **RCPath:** "This has been classified as complete, incomplete or absent in a consensus document. Extensive tumour sampling is necessary to establish complete tumour ablation; tumours should be sampled entirely through their largest diameter if the tumour/nodule size is 20 mm or less. For every additional 10 mm, an additional section should be taken." The proforma field is "Evidence of response to preoperative treatment: Yes, complete □ Yes, incomplete □ No □ Not applicable □" ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
- **Terminology differs:** CAP and QMH use necrosis-based labels (complete, incomplete, no necrosis). ICCR uses response labels (complete, partial, no response). RCPath uses complete, incomplete or absent. No source validates a percentage cut-off.

---

## 8. Margins

### 8.1 Template
- **QMH:** "Parenchymal margin: Cannot be assessed / Involved by invasive carcinoma / Uninvolved by invasive carcinoma, specify distance (mm)" and "Other margin(s) (specify)" with the same options ([QMH template](https://awiloqmh.github.io/CancerReportingTemplate/GI-HCC.html)).
- **CAP:** "Closest Margin(s) to Invasive Carcinoma" ("Parenchymal" or "Other (specify)"), distance as an exact value or "Greater than 1 cm" / "Greater than 10 mm", and "Margin(s) Involved by Invasive Carcinoma" ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)).

### 8.2 Parenchymal margin: distance and evidence
- **CAP:** "If the neoplasm is found near the surgical margin, the distance from the margin should be reported. For multiple tumors, the distance from the nearest tumor should be reported. Tumor within 1 mm of the resection margin may have increased risk of recurrence, but several studies have reported that a minimal surgical margin in the liver is sufficient for HCC." CAP also advises: "grossly positive margins should be microscopically confirmed and documented. If the margins are grossly free of tumor, judicious sampling of the cut surface in the region closest to the nearest identified tumor nodule is indicated." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))
- **ICCR:** a meta-analysis "found no difference in recurrence or survival for <10 millimetres (mm) compared with ≥10 mm minimal distance", but "a review of 14 retrospective case series (4197 patients with 10 year survival data) found that a distance of the tumour >10 mm from the resection margin was a significant positive prognostic factor". In addition, "margins <1 mm or >1 mm are reported in several series as significant on multivariate analysis". The proforma offers "Clearance is ≥10 mm" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).
- **RCPath:** the HCC proforma field is "distance to resection margin: <1 mm □ 1–10 mm □ state distance: ………mm >10 mm □". RCPath also notes: "there is no evidence base or consensus regarding the definition of R1 resection for liver cancer resections. Therefore, to avoid confusion the minimal distance between tumour cells and resection margin should be included in the report." ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf))

### 8.3 Other margins (hepatic vein, portal vein, bile duct, hilar)
- **ICCR:** "it may be most appropriate to document clearance and distance to margins (including liver parenchyma, bile ducts, vessels and porta hepatis connective tissue) with such malignancies rather than apply the refined R0, 1, 2 approach taken in gastrointestinal tumours." ICCR adds that "the TNM Cancer Staging Manuals do not comment on R status for liver cancers" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).
- **Not defined:** HCC-specific definitions or cut-offs for hepatic vein, portal vein, bile duct or hilar margins were not found in CAP 4.3.0.0, ICCR v2.0 or RCPath V3 (n.a.). CAP covers these only as "Other (specify)" ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)).

---

## 9. Regional lymph nodes

### 9.1 Template
- **QMH:** number examined, number involved, "Extranodal extension: Not identified / Present / Cannot be determined", "Size of largest metastatic deposit (mm), specify site" and "Size of largest lymph node involved (mm), specify site" ([QMH template](https://awiloqmh.github.io/CancerReportingTemplate/GI-HCC.html)).
- **CAP:** status, "Number of Lymph Nodes with Tumor" and "Number of Lymph Nodes Examined". It has no extranodal-extension or deposit-size items ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)). The QMH extranodal-extension and size fields therefore have no basis in CAP's HCC protocol. Definitions for these fields in HCC were not found in CAP, ICCR or RCPath (n.a.).

### 9.2 Regional stations

| Source | Verbatim |
|---|---|
| CAP 4.3.0.0 | "The regional lymph nodes for the liver include hilar, hepatoduodenal ligament, inferior phrenic, caval, common hepatic artery and portal vein lymph nodes." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)) |
| AJCC 8 (as reviewed in AJR 2020) | "The regional nodes are the hilar, hepatic, periportal, inferior phrenic, and caval nodes. The N category is binary, divided into absence (N0) or presence (N1) of nodal involvement." ([AJR 2020 lymphatics review](https://www.ajronline.org/doi/10.2214/AJR.19.22636)) |
| UICC TNM8 | Station list: n.a. from an open official source. The NHS NDRS TNM8 sheet gives only the N categories ([NDRS liver staging sheet](https://digital.nhs.uk/ndrs/data/cancer-data-training-materials/staging-sheets/liver)) |
| RCPath V3 (specimen handling) | "the site of lymph nodes should be specified if known (hilar, hepatic artery, portal vein, cystic duct). More distant lymph nodes (coeliac axis, periduodenal, periaortic) may be submitted separately by the surgeon." ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)) |

### 9.3 Node numbers and significance
- **Disagreement on node numbers:** the NHS NDRS TNM8 sheet says pN0 "Histological examination of a regional lymphadenectomy specimen will ordinarily include 3 or more lymph nodes" ([NDRS](https://digital.nhs.uk/ndrs/data/cancer-data-training-materials/staging-sheets/liver)). RCPath says "there is no recommended number of nodes for HCC" ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)). CAP 4.3.0.0 gives no number (n.a.).
- **Significance:** "There is no strong evidence of prognostic significance of local nodal metastases in hepatocellular carcinoma. Lymph node involvement is common in fibrolamellar subtype of HCC." ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf))

---

## 10. Distant metastasis

- **QMH options:** "Not applicable", "Not identified", "Non-regional lymph node(s) (specify)", "Liver (specify)", "Other (specify)", "Cannot be determined" ([QMH template](https://awiloqmh.github.io/CancerReportingTemplate/GI-HCC.html)).
- **CAP:** the same sites, with "pM Category (required only if confirmed pathologically)" and "pM1: Distant metastasis" ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)).
- **UICC TNM8 (via NHS NDRS):** "M1 Distant metastasis - This includes metastasis to non-regional lymph nodes, including periaortic, pericaval, superior mesenteric artery and/or coeliac artery lymph nodes." ([NDRS](https://digital.nhs.uk/ndrs/data/cancer-data-training-materials/staging-sheets/liver)). RCPath uses the same wording ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
- **Possible terminology clash:** "caval" nodes are regional in the CAP and AJCC lists, while "pericaval" nodes are distant in the UICC/RCPath wording. Where the boundary between these two stations lies was not found in any source (n.a.).

---

## 11. pTNM (AJCC 8th edition, as used by CAP 4.3.0.0 and the QMH page)

### 11.1 Verbatim definitions
The AJCC 8th edition manual itself is not openly accessible. The wording below is CAP's reproduction ("Standard(s): AJCC-UICC 8"), and the QMH column shows the page's abbreviated option text ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true); [QMH template](https://awiloqmh.github.io/CancerReportingTemplate/GI-HCC.html)).

| Category | CAP 4.3.0.0, verbatim | QMH option text |
|---|---|---|
| pT not assigned | "pT not assigned (cannot be determined based on available pathological information)" | same |
| pT0 | "pT0: No evidence of primary tumor" | same |
| pT1 | "pT1: Solitary tumor less than or equal to 2 cm, or greater than 2 cm without vascular invasion" | "pT1: Solitary tumor < or = 2 cm, or > 2 cm without vascular invasion" |
| pT1a | "pT1a: Solitary tumor less than or equal to 2 cm" | "pT1a: Solitary tumor < or = 2 cm" |
| pT1b | "pT1b: Solitary tumor greater than 2 cm without vascular invasion" | "pT1b: Solitary tumor >2 cm without vascular invasion" |
| pT2 | "pT2: Solitary tumor greater than 2 cm with vascular invasion, or multiple tumors, none greater than 5 cm" | "pT2: Solitary tumor > 2 cm with vascular invasion, or multiple tumors, none > 5 cm" |
| pT3 | "pT3: Multiple tumors, at least one of which is greater than 5 cm" | "pT3: Multiple tumors, at least one of which is > 5 cm" |
| pT4 | "pT4: Single tumor or multiple tumors of any size involving a major branch of the portal vein or hepatic vein, or tumor(s) with direct invasion of adjacent organs other than the gallbladder or with perforation of visceral peritoneum" | same |
| pN not assigned | "pN not assigned (no nodes submitted or found)"; "pN not assigned (cannot be determined based on available pathological information)" | same |
| pN0 | "pN0: No regional lymph node metastasis" | same |
| pN1 | "pN1: Regional lymph node metastasis" | same |
| pM | "pM Category (required only if confirmed pathologically)"; "Not applicable - pM cannot be determined from the submitted specimen(s)" | "Not applicable - pM cannot be determined from the submitted specimen(s)", under the heading "Distant metastasis (pM)" |
| pM1 | "pM1: Distant metastasis" | same |
| Descriptors | "m (multiple primary tumors)", "r (recurrent)", "y (post-treatment)" | "m (multiple primary tumors)", "r (recurrent)", "y (post treatment)" |

- **How T is built:** "The T classification depends on the number of tumor nodules, the size of the largest nodule, and the presence or absence of blood vessel invasion." Also: "Vascular invasion includes either the gross or the histologic involvement of vessels." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))
- **Small tumours:** "Since some studies showed lack of adverse prognostic impact of vascular invasion in tumors less than 2 cm, these tumors have been classified under the T1 category." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))

### 11.2 UICC TNM8 wording, the T4 erratum, and other datasets
- **UICC TNM8 (via the NHS NDRS staging sheet):**
  - T1a: "Solitary tumour 2 cm or less in greatest dimension with or without vascular invasion"
  - T1b: "Solitary tumour more than 2 cm in greatest dimension without vascular invasion"
  - T2: "Solitary tumour with vascular invasion more than 2 cm dimension or multiple tumours, none more than 5 cm in greatest dimension"
  - T3: "Multiple tumours any more than 5 cm in greatest dimension"
  - T4: "Tumour(s) involving a major branch of the portal or hepatic vein with direct invasion of adjacent organs (including the diaphragm), other than the gallbladder or with perforation of visceral peritoneum"
  - Source: [NDRS liver staging sheet](https://digital.nhs.uk/ndrs/data/cancer-data-training-materials/staging-sheets/liver)
- **UICC erratum (25 May 2018), page 80, Liver T4:**
  - "Current": "Tumor(s) involving a major branch of the portal or hepatic vein with direct invasion of adjacent organs (including the diaphragm), other than the gallbladder or with perforation of visceral peritoneal."
  - "Clarification": "Tumor(s) involving a major branch of the portal or hepatic vein or with direct invasion of adjacent organs (including the diaphragm), other than the gallbladder or with perforation of visceral peritoneal."
  - Source: [UICC 8th edition errata](https://www.dmcg.dk/siteassets/dmcg-udvalg/tnm/uicc-8th-edition-errata_25may2018_changes-highlighted.pdf). The NDRS sheet ("Last edited: 15 December 2022") still shows the uncorrected "with direct invasion" wording. CAP's "or tumor(s) with direct invasion" matches the corrected sense.
- **RCPath proforma:** "pT1a Solitary tumour <20 mm with or without vascular invasion"; "pT1b Solitary tumour >20 mm without vascular invasion"; "pT2 Solitary tumour >20 mm with vascular invasion, or multiple tumours, none >50 mm"; "pT3 Multiple tumours, any >50 mm"; "pT4 Tumour(s) invade a major branch of the portal or hepatic vein or with direct invasion of adjacent organs (includes diaphragm but not gall bladder) or perforates visceral peritoneum" ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
- **ICCR paraphrase:** "pT1a (solitary HCC <2 cm irrespective of vascular invasion (VI)) and pT1b (solitary HCC >2 cm without microvascular invasion)" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).
- **Disagreement at exactly 2 cm:** CAP ("less than or equal to 2 cm") and UICC ("2 cm or less") place a 20 mm solitary tumour in T1a. The RCPath ("<20 mm" / ">20 mm") and ICCR ("<2 cm" / ">2 cm") wordings leave exactly 20 mm unassigned. ICCR's T1b also says "without microvascular invasion", where CAP and UICC say "without vascular invasion".

### 11.3 Stage groups (UICC TNM8, via NHS NDRS)

| Stage | T | N | M |
|---|---|---|---|
| IA | T1a | N0 | M0 |
| IB | T1b | N0 | M0 |
| II | T2 | N0 | M0 |
| IIIA | T3 | N0 | M0 |
| IIIB | T4 | N0 | M0 |
| IVA | Any T | N1 | M0 |
| IVB | Any T | Any N | M1 |

Source: [NDRS liver staging sheet](https://digital.nhs.uk/ndrs/data/cancer-data-training-materials/staging-sheets/liver). CAP 4.3.0.0 has no stage-group item, and the AJCC 8th edition stage-group text itself is n.a. (not openly accessible).

### 11.4 Multiple tumours and the "m" descriptor
- **CAP:** "The “m” suffix indicates the presence of multiple primary tumors in a single site and is recorded in parentheses: pT(m)NM." CAP also says: "The TNM classification does not discriminate between multiple independent primary tumors or intrahepatic metastasis from a single primary hepatic carcinoma." and "For purposes of staging, satellite nodules, multifocal primary hepatocellular carcinomas, and intrahepatic metastases are considered to be multiple tumors." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))
- **ICCR:** "For TNM staging, multiple tumours include satellitosis, multifocal nodules and intrahepatic metastases." ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf))
- **UICC General Rule No. 5:** "In the case of multiple simultaneous tumours in one organ, the tumour with the highest T category should be classified and the multiplicity or the number of tumours should be indicated in parentheses, e.g. T2(m) or T2(5). ... In tumours of the liver, ovary and fallopian tube, multiplicity is a criterion of T classification." ([UICC TNM Supplement, 4th ed.](https://download.e-bookshelf.de/download/0000/5955/44/L-G-0000595544-0030457286.pdf))
- **Grade and other features:** grade follows the worst tumour ("For multiple tumors, select the worst grade."). CAP adds: "For multiple tumors, size and pathologic parameters can be provided for the five largest tumors, while size range and location can be provided for the rest." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))

### 11.5 How size is measured
- **CAP:** the required field is "Greatest dimension of viable tumor in Centimeters (cm)". "+Greatest Dimension of Tumor on Gross Exam in Centimeters (cm)" is optional. "For treated tumors, the size of the viable tumor used for assigning the T category." For HCC arising in adenoma, "the size of the hepatocellular adenoma and the hepatocellular carcinoma should both be conveyed in the report. Only the hepatocellular carcinoma size is used for staging purposes." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))
- **ICCR:** "The maximum diameter, measured to the nearest millimeter, can be assessed both on the unfixed or fixed specimen (unfixed specimen avoids underestimation resulting from formalin fixation-induced shrinkage). For cases with multiple tumours, it has been recommended that size of at least 5 largest tumour nodules should be provided, while a range can be expressed for additional tumour nodules." ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf))
- **UICC TNM Supplement:** "According to the AJCC Cancer Staging Manual 2009 [6], 'pT is derived from the actual measurement of the unfixed tumour in the surgical specimen. It should be noted, however, that up to 30% shrinkage of soft tissues may occur in the resected specimen.' Thus, in cases of discrepancies of clinically and pathologically detected tumour size the clinical measurement should be used also for the pT classification." ([UICC TNM Supplement, 4th ed.](https://download.e-bookshelf.de/download/0000/5955/44/L-G-0000595544-0030457286.pdf))
- **RCPath:** "Slices should be as thin as possible, and no more than 10 mm thick ... Record the number, site, maximum diameter, and distance from hepatic margin of the tumour(s)." The proforma asks for "List maximum tumour diameters (up to largest 4)" ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
- **Disagreement on how many nodules to measure:** CAP says up to 5, ICCR at least 5, and the RCPath proforma up to the largest 4.

### 11.6 The "y" and "r" prefixes
- **y:** "The “y” prefix indicates those cases in which classification is performed during or after initial multimodality therapy (ie, neoadjuvant chemotherapy, radiation therapy, or both chemotherapy and radiation therapy) ... The “y” categorization is not an estimate of tumor before multimodality therapy (ie, before initiation of neoadjuvant therapy)." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))
- **r:** "The “r” prefix indicates a recurrent tumor when staged after a documented disease-free interval and is identified by the “r” prefix: rTNM." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))
- **After locoregional therapy:** whether ypTNM applies after TACE or ablation is not stated explicitly in CAP (its example list names chemotherapy and radiation) (n.a.).

---

## 12. Non-tumorous liver (additional pathologic findings)

### 12.1 Template
The QMH items are "Fibrosis (specify extent, providing name of the scheme and assessment scale used)", "Cirrhosis", "Low-grade dysplastic nodule", "High-grade dysplastic nodule", "Steatosis", "Steatohepatitis", "Iron overload", "Chronic hepatitis (specify etiology)" and "Other (specify)". These match the CAP "+Additional Findings" list, which also offers "None identified" ([QMH template](https://awiloqmh.github.io/CancerReportingTemplate/GI-HCC.html); [CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true)).

### 12.2 Fibrosis: scheme and scale
- **CAP Note H:** "The extent of fibrosis should be reported because cirrhosis or advanced fibrosis have an adverse effect on outcome. The scoring system described by Ishak is recommended by the AJCC Cancer Staging Manual, 8 edition, but other commonly used schemes (Batts-Ludwig, Metavir) can be used. The name of the staging scheme and its scale should be included." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))
- **ICCR:** "We recommend that the type of disease and degree of fibrosis are recorded separately; for the latter any one of the three main systems in widespread use for semi-quantitative assessment is suitable although it is recognised that the Kleiner and SAF systems were developed for non-alcoholic fatty liver disease while the METAVIR, Ishak and Batts-Ludwig systems were designed for those with chronic (viral) hepatitis." The ICCR proforma scales are "ISHAK stage" /6 and KLEINER, METAVIR, BATTS-LUDWIG and SAF each /4 ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).
- **RCPath:** citing its prognostic importance, RCPath states that "the fibrosis stage of underlying chronic liver disease is regarded as a core data item. The aetiology may not always be known to the pathologist and is thus considered to be a non-core item." The proforma uses descriptive fibrosis categories, not a named scheme: "None present", "Portal/periportal", "Sinusoidal/pericellular", "Both portal & sinusoidal", "Bridging", "Bridging with nodules", "Complete cirrhosis" ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).

| Scale | Stages, verbatim | Source |
|---|---|---|
| Ishak (0–6) | 0 "No fibrosis (normal)"; 1 "Fibrous expansion of some portal areas (+/-) short fibrous septa"; 2 "Fibrous expansion of most portal areas (+/-) short fibrous septa"; 3 "Fibrous expansion of most portal areas with occasional portal to portal (P-P) bridging"; 4 "Fibrous expansion of portal areas with marked bridging (P-P) as well as portal to central (P-C)"; 5 "Marked bridging (P-P and/or P-C), with occasional nodules (incomplete cirrhosis)"; 6 "Cirrhosis, probably or definite" | [SEER Ishak glossary](https://seer.cancer.gov/seertools/glossary/view/563216da1ef5570f73545b15/) |
| AJCC fibrosis score (registry item) | "Ishak score (classified by AJCC) * F0: None to moderate fibrosis (Ishak Score 0-4) * F1: Cirrhosis/severe fibrosis (Ishak Score 5-6)". Registry code 0 includes "METAVIR score F0-F3" and "Batt-Ludwig score 0-3"; code 1 includes "METAVIR score F4" and "Batt-Ludwig score 4" | [SEER EOD Fibrosis Score](https://staging.seer.cancer.gov/eod_public/input/3.2/liver/fibrosis_score/?breadcrumbs=%28~view_schema~,~liver~%29) |
| IASL / Batts–Ludwig / METAVIR | "No fibrosis" = "No fibrosis" / "Stage 0" / "F0"; "Fibrous portal expansion" = "Mild fibrosis" / "Stage 1" / "F1"; "Periportal fibrosis + occasional septae" = "Moderate fibrosis" / "Stage 2" / "F2"; "Many septae + architectural distortion" = "Severe fibrosis" / "Stage 3" / "F3"; "Probable/Definite cirrhosis" = "Cirrhosis" / "Stage 4" / "F4" | [Clin Liver Dis 2021, Table 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC8087941/) |
| NASH CRN (Kleiner) fibrosis | "0" None; "1a" "Mild zone 3 sinusoidal fibrosis (trichrome stain to be identified)"; "1b" "Moderate zone 3 sinusoidal fibrosis (could be detected on H&E examination)"; "1c" "Portal fibrosis only"; "2" "Zone 3 sinusoidal fibrosis and periportal fibrosis"; "3" "Bridging fibrosis"; "4" "Cirrhosis" | [Pathologica 2021, NAFLD review](https://pmc.ncbi.nlm.nih.gov/articles/PMC8299321/) |

- **AJCC F0/F1 is not METAVIR F0/F1:** SEER notes that the AJCC categories "are not the same thing as the METAVIR score F0 or F1" ([SEER EOD Fibrosis Score](https://staging.seer.cancer.gov/eod_public/input/3.2/liver/fibrosis_score/?breadcrumbs=%28~view_schema~,~liver~%29)).
- **Cirrhosis:** the AJCC registry score groups Ishak 5 ("incomplete cirrhosis") with Ishak 6 as F1 ([SEER EOD Fibrosis Score](https://staging.seer.cancer.gov/eod_public/input/3.2/liver/fibrosis_score/?breadcrumbs=%28~view_schema~,~liver~%29)). Batts–Ludwig stage 3 is "fibrous septa with architectural distortion but no obvious cirrhosis", and stage 4 is "cirrhosis" ([SEER EOD](https://staging.seer.cancer.gov/eod_public/input/3.2/liver/fibrosis_score/?breadcrumbs=%28~view_schema~,~liver~%29)).
- **Where to sample:** ICCR says "It is important to assess this as far away from the main tumour mass as possible to avoid the confounding factor of peritumoral effects" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).

### 12.3 Dysplastic nodules (LGDN and HGDN)
- **ICGHN 2009:** "L-DNs show mild increase in cell density with a monotonous pattern, and they have no cytologic atypia, though they may have large cell change". "An H-DN is defined as having architectural and/or cytologic atypia, but the atypia is insufficient for a diagnosis of HCC." The "distinction between L-DNs and large regenerative nodules was often found to be difficult or impossible". "Stromal invasion is defined as tumor cell invasion into the portal tracts or fibrous septa within vaguely nodular lesions". ICGHN credits improved agreement to "the recognition of stromal invasion as a diagnostic criterion for the differentiation of H-DN from early HCC" ([ICGHN, Hepatology 2009](https://air.unimi.it/retrieve/dfa8b98f-c0f5-748b-e053-3a05fe0a3a96/HCC.pdf)).
- **CAP:** "High-grade dysplastic nodules are considered to be the precursors of hepatocellular carcinoma. The criteria outlined by the International Working Party are recommended ... Low-grade dysplastic nodules are difficult or impossible to distinguish from large regenerative nodules, and their inclusion in the report is not necessary." CAP also says "Cirrhotic nodules appreciably larger than the surrounding background liver should also be sampled, because such nodules may harbor dysplastic changes." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))
- **ICCR:** "Dysplastic nodules are generally divided into low and high grade. Application of immunohistochemistry for glypican-3, heat shock protein 70 (HSP70) and glutamine synthetase can be helpful in the detection of early hepatocellular carcinoma in this setting." The proforma records both "LOW GRADE" and "HIGH GRADE HEPATOCELLULAR DYSPLASTIC NODULE" as "Absent" or "Present" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).
- **RCPath:** "the criteria used for the diagnosis of dysplastic nodules in cirrhotic livers are still in evolution and therefore included as a non-core item in the dataset". On terminology: "The terms ‘small cell change’ and ‘large cell change’ are used to describe cytological alterations in the background liver ... This terminology has replaced small and large cell dysplasia." ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
- **Disagreement:** CAP says reporting a low-grade dysplastic nodule "is not necessary", yet its own list (and the QMH form) offers "Low-grade dysplastic nodule". ICCR records low-grade nodules on its proforma, and RCPath treats all dysplastic nodules as non-core.

### 12.4 Steatosis and steatohepatitis
- **Steatosis:** "Steatosis in more than 5% of hepatocytes is generally accepted as a working definition of a fatty liver"; grades are "mild (5-33%), moderate (34-66%), and severe (> 66%)" ([Pathologica 2021, NAFLD review](https://pmc.ncbi.nlm.nih.gov/articles/PMC8299321/)).
- **Steatohepatitis:** "Diagnosis of NASH requires i) steatosis (more than 5%), and ii) both lobular inflammation and ballooning degeneration of hepatocytes with a mainly zone 3 distribution." Ballooned hepatocytes are "enlarged hepatocytes (more than 1.5-2 times the normal size, corresponding approximately to a cellular diameter more than 30 μm) with round (instead of polygonal) shape and rarefied cytoplasm" ([Pathologica 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8299321/)).
- **NAS (Kleiner 2005, as tabulated):** steatosis "0: < 5%", "1: 5-33%", "2: 34-66%", "3: > 66%". Lobular inflammation "0: None", "1: < 2 foci/20x field", "2-4 foci/20x field" (grade 2), "3: > 4 foci/20x field". Ballooning "0: None", "1: Mild, few", "2: Moderate-marked, many". "NAFLD activity score (NAS): 0-8" ([Pathologica 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8299321/)).
- **Using NAS in reports:** the same review states that "the histological diagnosis of NASH is a prerequisite to apply the NAS score" ([Pathologica 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8299321/)).

### 12.5 Iron overload
- **Scheuer grading:** "The grading system described by Scheuer, for instance, scores hepatocellular iron on a scale of 1 to 4, ranging from minimal iron accumulation (grade 1) to diffuse accumulation that involves the entire lobule and obliterates the typical gradient (grade 4)." ([Salomao, Clin Liver Dis 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8087935/))
- **Datasets:** CAP and QMH offer only "Iron overload". A required grading scheme is n.a. in CAP, ICCR and RCPath. RCPath lists "Haemochromatosis" among the aetiologies ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).

### 12.6 Chronic hepatitis and aetiology
- **CAP:** "Specific types of underlying disease, such as viral hepatitis or hemochromatosis, should be evaluated and assigned a grade and stage, if appropriate." ([CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true))
- **ICCR:** "The severity of underlying chronic liver disease is more important that its aetiology, which may not be known to the pathologist although there may be histological pointers such as iron overload, evidence of HBV infection (ground glass hepatocytes) or a1AT accumulation." The proforma item is "Chronic hepatitis, specify type if known", alongside "Steatosis", "Steatohepatitis", "Iron overload" and "Biliary disease, specify if known" ([ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf)).
- **RCPath:** "The presence of hepatitis (viral or autoimmune), haemochromatosis, alcohol related liver disease and non-alcoholic fatty liver disease (NAFLD) should be recorded, as should both the stage of fibrosis and the nature and severity of inflammatory/metabolic disease." The proforma aetiologies are Hepatitis B, Hepatitis C, Autoimmune hepatitis, Haemochromatosis, Alcohol, NAFLD, Not known and Other ([RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
- **Activity grading:** activity-grading schemes for chronic hepatitis (for example, Ishak modified HAI or Batts–Ludwig grade) were not extracted verbatim in this session (n.a.).

---

## 13. Macroscopy items: CAP vs ICCR vs RCPath

| Item | CAP 4.3.0.0 | ICCR v2.0 | RCPath G050 V3 |
|---|---|---|---|
| Procedure / specimen type | "Wedge resection"; "Partial hepatectomy, major (3 segments or more)"; "Partial hepatectomy, minor (less than 3 segments)"; "Partial hepatectomy (not otherwise specified)"; "Total hepatectomy"; "Other (specify)"; "Not specified" | "Total hepatectomy"; "Segmental resection, specify segment(s) or type of segmentectomy"; "Wedge resection, specify site/segment" | "Segmental resection" ("List segments (if known)"); "Non-anatomic (wedge) resection" ("Site/segment of origin"); "Hepatectomy (at transplant)" |
| Specimens submitted | n.a. (no item) | "Liver"; "Extrahepatic bile duct"; "Gallbladder"; "Diaphragm"; "Not specified" (core) | "Lymph node(s) received"; "Invasion of adherent or adjacent organ ... which organ" |
| Weight | n.a. (no item) | "SPECIMEN WEIGHT" (g) | "Specimen weight" (g), a core item |
| Dimensions | n.a. (no item) | "Indicate greatest measurement for each parameter in an irregularly shaped specimen" | Core list: "where orientation is known, provide antero-posterior, medio- lateral and superior-inferior dimensions". Proforma: "For segmental resections, specimen dimensions: antero-posterior ……mm, medio-lateral ……mm, supero-inferior……mm" |
| Number / focality | "Tumor Focality": "Solitary", "Multiple", "Cannot be determined" | "TUMOUR SITE AND NUMBER" (core) | "Number of tumours present" |
| Site | "Right lobe", "Left lobe", "Caudate lobe", "Quadrate lobe", "Segmental location (specify)", "Other (specify)". CAP notes that segmental location "is best provided by the surgeon" | "Location of all tumours (HCC and intrahepatic cholangiocarcinoma) should be reported since this is important for correlation with imaging" | "For multiple tumours, the sites should be recorded in the text of the report in such a way that allows correlation with preoperative imaging." |
| Size | "Greatest dimension of viable tumor" (cm), with optional gross dimension, for up to 5 nodules | "MAXIMUM TUMOUR DIMENSION" (mm), for at least 5 nodules, "For a large number of tumours include a range" | "List maximum tumour diameters (up to largest 4)" (mm) |
| Satellitosis | "+Satellitosis" (optional): "Not identified", "Present", "Cannot be determined" | "SATELLITOSIS ... (Applicable to hepatocellular carcinoma only)": "Cannot be assessed", "Not identified", "Present" (core) | "Satellite tumour(s) present: Yes □ No □" |
| Macroscopic vessel involvement | Via "Large vessel (major branch of hepatic vein or portal vein)" and Tumor Extent | "Present macroscopically (large portal or hepatic veins)" | "Main left portal vein", "Main right portal vein", "Hepatic vein", "Vessel not specified", "No macroscopic involvement", "Diameter of vessel involved ……mm" |
| Capsule / adjacent organs | Tumor Extent (Section 4) | Extent of invasion (macroscopic) | "Liver capsule intact and smooth Yes □ No □"; core item "integrity of liver capsule (including bare area on postero-superior aspect) and presence of adherent tissues (e.g. diaphragm) or other organs" |
| Rupture | n.a. (no item) | "MACROSCOPIC TUMOUR RUPTURE": "Intact", "Fragmented specimen", "Ruptured", "Indeterminate" (non-core) | n.a. (rupture is not mentioned) |
| Gross growth pattern | n.a. | "TUMOUR GROWTH PATTERN" (non-core): "Early hepatocellular carcinoma", "Single distinct nodule", "Large dominant nodule with multiple small satellite nodules", "Cirrhotomimetic", "Multiple distinct nodules" | n.a. |
| Distance to margin | Microscopic item. Grossly: "judicious sampling of the cut surface in the region closest to the nearest identified tumor nodule is indicated" (Section 8.2) | Microscopic item | "Distance from nearest hepatic resection margin: ……..mm" (gross) |
| Inking / slicing | n.a. | "all surgical surfaces (hepatic transection plane and hilar tissues for perihilar cholangiocarcinoma) are painted prior to specimen dissection and recorded in the block key" | "The surfaces of the specimen other than the capsule (i.e. parenchymal resection plane, extrahepatic biliary tree, any tissue adherent to the liver capsule) should be painted with ink or silver nitrate to allow identification in histological sections." Also: "Slices should be as thin as possible, and no more than 10 mm thick" |
| Tumour blocks | "Sections should be prepared from each major tumor nodule, with representative sampling of smaller nodules" | "a minimum of three tumour blocks be examined and all macroscopically distinctive areas should be sampled" | "a minimum of three tumour blocks is recommended" |
| Background liver | "Cirrhotic nodules appreciably larger than the surrounding background liver should also be sampled" | "A block of representative background liver should be taken at a distance from the tumour, whether or not it looks abnormal macroscopically" | Appearance "(normal, bile-stained, nutmeg, fibrotic/cirrhotic)" should be recorded |
| Photography | n.a. | n.a. | "It is good practice to keep a photographic record of the macroscopic features of the specimen for use during multidisciplinary team (MDT) meetings." |
| Tumour (pseudo)capsule | n.a. (no item; "capsule" appears only in the microvascular invasion definition) | n.a. (no item; Note 7 describes early HCC as "a non encapsulated tumour") | Non-core only. It is listed among items that "would normally be included in the text of the report, or as locally agreed additions to the dataset proforma report": "presence of fibrous pseudocapsule surrounding tumour (HCC and CRCLM)" |

Sources: [CAP 4.3.0.0](https://www.cap.org/wp-content/uploads/protocols/Liver.HCC_4.3.0.0.REL_CAPCP.pdf?download=true); [ICCR v2.0](https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Liver-2nd-ed-v2.0-bookmark.pdf); [RCPath G050 V3](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf). Sampling rules for treated tumours are in Section 7.3.

---

## 14. Summary of source disagreements

1. **Grade** (Section 3): CAP and AJCC 8 use a 4-tier system (G1–G4), while ICCR, RCPath and WHO 5th edition use 3 tiers. Gisder et al. contradict themselves on Edmondson–Steiner.
2. **Subtype proportions and thresholds** (Section 2):
   - Subtypes are 20–30% of HCC according to ICCR. Loy et al. put NOS at about 65%, which leaves about 35% for subtypes. Torbenson says about 70% can be subclassified.
   - Clear cell cut-off: >80% (WHO/ICCR/RCPath) versus at least 50% (Torbenson, who notes that 90% gives a purer group).
   - Macrotrabecular thickness: ≥10 cells (RCPath) versus >6 cells (Loy et al.).
   - Fibrolamellar carcinoma mixed with conventional HCC is handled differently by different sources.
3. **Satellitosis** (Section 5): CAP's "ICCR" definition is not in either ICCR edition. ICCR v2.0 uses the WHO wording ("usually within 2 cm", no size limit), ICCR v1.1 proposed a separation greater than the satellite's diameter, and a ≤2 cm size limit appears only in the Roayaie-type definitions.
4. **Major vascular invasion** (Section 4): CAP includes the right and left hepatic arteries, while the pT4 wording, RCPath and ICCR name only portal and hepatic veins.
5. **Vessel diameter** (Section 6): RCPath asks for the diameter of the involved vessel, while ICCR says vessel width "is not helpful".
6. **Equivocal vascular invasion** (Section 6): ICCR uses "indeterminate". RCPath says "not identified" in one place and "uncertain" in another. CAP and QMH have no such option.
7. **Perineural invasion** (Section 6.5): an optional HCC item in CAP and QMH, but applicable only to cholangiocarcinoma in ICCR and RCPath.
8. **Treatment response terms** (Section 7): CAP uses complete/incomplete/no necrosis, ICCR complete/partial/no response, and RCPath complete/incomplete/absent. The QMH "Liang et al 2022" link is a subtype table, not a necrosis reference.
9. **Margins** (Section 8): CAP records an exact distance or "Greater than 10 mm" (also "Greater than 1 cm"), ICCR offers "Clearance is ≥10 mm", and RCPath uses <1 mm / 1–10 mm / >10 mm. The evidence for 1 mm versus 10 mm cut-offs is mixed.
10. **Lymph nodes** (Sections 9–10):
    - The regional station lists differ: CAP includes the "hepatoduodenal ligament" and "common hepatic artery" nodes, while the AJCC 8 list (per AJR) gives "hilar, hepatic, periportal, inferior phrenic, and caval".
    - NDRS/UICC expects "3 or more" nodes, but RCPath says there is "no recommended number".
    - "Caval" nodes are regional while "pericaval" nodes are distant.
    - The QMH extranodal-extension and node-size items have no CAP HCC basis.
11. **The 2 cm boundary for T1a** (Section 11): CAP and UICC say ≤2 cm; RCPath and ICCR write <20 mm or <2 cm. ICCR's T1b reads "without microvascular invasion". The NDRS T4 text is the uncorrected (pre-erratum) wording.
12. **Number of nodules measured** (Sections 11 and 13): up to 5 (CAP), at least 5 (ICCR), up to 4 (RCPath).
13. **Low-grade dysplastic nodule** (Section 12): CAP calls reporting it unnecessary yet lists it as an option. ICCR records it, and RCPath treats it as non-core.
14. **Fibrosis scale** (Section 12):
    - CAP and AJCC prefer Ishak. ICCR's proforma offers five systems (Ishak, Kleiner, METAVIR, Batts–Ludwig, SAF). RCPath uses descriptive categories.
    - The AJCC registry score groups Ishak 5 with cirrhosis.

---

## 15. Items that could not be confirmed (n.a.)

- **Classification texts:**
  - WHO Classification 5th edition (2019) and 6th edition (2026) book text, so WHO criteria are given only as reproduced by RCPath, ICCR, CAP and reviews (Section 2). HCC changes in the WHO 6th edition (Section 0).
  - AJCC 8th edition manual text. CAP's reproduction is used, and AJCC stage-group wording is n.a. (UICC groups given via NDRS) (Section 11).
  - UICC TNM8 regional lymph-node station list from an open official source (Section 9).
  - RCPath G050 draft revision content (restricted) (Section 0).
- **Subtype thresholds:** percentage thresholds for chromophobe and neutrophil-rich HCC (Section 2).
- **Grade mapping:** an explicit published mapping of Edmondson–Steiner III and IV onto CAP G2/G3 and WHO moderately/poorly differentiated (Section 3.4).
- **Definitions not found for HCC:**
  - Histological criteria for "perforation of visceral peritoneum" (Section 4).
  - Lymphatic invasion as distinct from vascular invasion (Section 6.1).
  - Perineural invasion, including definition and prognostic data (Section 6.5).
  - Hepatic vein, portal vein, bile duct and hilar margins (Section 8.3).
  - Extranodal extension and largest-deposit or largest-node size (QMH-only items) (Section 9).
- **Lymph nodes:** a recommended node number in CAP 4.3.0.0, and the anatomical boundary between "caval" (regional) and "pericaval" (distant) nodes (Sections 9–10).
- **Treatment effect:** a validated necrosis cut-off. CAP ("The extent of necrosis that would correlate with outcome is not known") and ICCR ("insufficient evidence") both say no cut-off is established, and RCPath gives none. This is therefore a gap in the evidence, not a missed source (Section 7). Whether CAP intends ypTNM after locoregional therapy (Section 11.6).
- **Background liver:** a required iron-grading scheme in CAP, ICCR or RCPath (Section 12.5), and verbatim activity-grading schemes for chronic hepatitis (Section 12.6).
- **Macroscopy:** a tumour (pseudo)capsule item in CAP or ICCR. RCPath lists the pseudocapsule only as a non-core item, and none of the three defines it (Section 13).

---

## 16. Image gallery (all CC BY 4.0)

The licence was confirmed on each article page. Nine of these figures are in the template gallery, resized under 120 KB, in `assets/reference/hcc/` (Saler Fig. 5 cropped to panel A; Kim Fig. 5 cropped to panels c-d). The three Sweed figures with panel grids (Fig. 3, 5 and 6) are not used: Fig. 3 shows twelve panels against an eleven-item legend. The grade gallery reuses three biopsy figures from `assets/reference/liver_lesion_biopsy/`. Credits, licences and links sit with each image in schemas/hcc.json.

| # | File | Figure / panels | What it shows (from legend) | Report section | Source |
|---|---|---|---|---|---|
| 1 | `benslama2025_fig2_satellite_nodules_gross.jpg` | Fig. 2 | Encapsulated 4×4 cm chromophobe HCC with "Numerous satellite nodules (<2 cm in diameter and located within 2 cm of the primary tumor)" | 5, 13 | [Ben-Slama et al., ABCD 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC11745479/) |
| 2 | `choi2023_fig2_steatohepatitic.jpg` | Fig. 2a–c | Steatohepatitic HCC: gross, H&E (fat droplets, ballooning), Hep Par-1 | 2 | [Choi & Thung, Biomedicines 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10526317/) |
| 3 | `choi2023_fig3_clear_cell.jpg` | Fig. 3a–c | Clear cell HCC in cirrhotic liver: gross, nests, clear cytoplasm | 2 | [Choi & Thung 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10526317/) |
| 4 | `choi2023_fig4_macrotrabecular_massive.jpg` | Fig. 4a–c | Macrotrabecular-massive HCC: trabeculae "of more than 10 cells", CD34 vessels encapsulating tumour clusters | 2 | [Choi & Thung 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10526317/) |
| 5 | `choi2023_fig5_fibrolamellar.jpg` | Fig. 5a–c | Fibrolamellar carcinoma: central scar, large eosinophilic cells, lamellar fibrosis (trichrome) | 2 | [Choi & Thung 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10526317/) |
| 6 | `choi2023_fig6_lymphocyte_rich.jpg` | Fig. 6a–c | Lymphocyte-rich HCC: lymphocytes "outnumber the tumor cells"; Hep Par-1 | 2 | [Choi & Thung 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10526317/) |
| 7 | `kim2023_fig5_btace_complete_necrosis.png` | Fig. 5a–d | HCC after balloon-occluded TACE: imaging, gross "totally necrotic mass", H&E "complete necrosis of HCC" | 7 | [Kim et al., Diseases 2023](https://www.mdpi.com/2079-9721/11/4/149) |
| 8 | `saler2025_fig5_chromophobe_rare_subtypes.jpg` | Figure 5A–C | Chromophobe HCC; HCC with osteoclast-like giant cells; HCC with syncytial giant cells | 2 | [Saler et al., Cancer Rep 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC11828739/) |
| 9 | `sweed2022_fig2_macroscopic_patterns.png` | Fig. 2a–f | Gross patterns: pseudocapsulated nodule, diffuse HCC with satellite nodules, infiltrative HCC, macroscopic bile duct and "lymphovascular" invasion | 5, 6, 13 | [Sweed et al., WJSO 2022](https://wjso.biomedcentral.com/articles/10.1186/s12957-022-02764-2) |
| 10 | `sweed2022_fig3_hcc_nos_grades_lvi_pni.jpg` | Fig. 3a–k | HCC-NOS grades (well/moderate/poor), patterns, "lymphovascular invasion", bile duct invasion, "perineural invasion" | 3, 6 | [Sweed et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9484175/) |
| 11 | `sweed2022_fig5_special_variants_mtm_clear_sh_scirrhous_flc.jpg` | Fig. 5a–i | Macrotrabecular-massive, clear cell, steatohepatitic, scirrhous and fibrolamellar subtypes | 2 | [Sweed et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9484175/) |
| 12 | `sweed2022_fig6_special_variants_chromophobe_lel_neutrophil.png` | Fig. 6a–i | Sarcomatoid, chromophobe, lymphoepithelioma-like, neutrophil-rich HCC and cHCC-CC | 2 | [Sweed et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9484175/) |

**Notes on the images:**
- The Sweed et al. legends label the panels "(IHC, 100×)". This is quoted as published.
- Sweed Fig. 2f is captioned "macroscopic lymphovascular invasion"; in CAP terms this is gross vascular invasion.
- Ben-Slama Fig. 2 uses the <2 cm / within 2 cm satellite criteria, which are not the CAP or ICCR wording (Section 5).
- No openly licensed image was found that shows dysplastic nodules, fibrosis stages or a margin measurement (n.a.).
