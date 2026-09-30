# Breast core biopsy: papillary lesions

Research notes and build decisions for the "Papillary lesion" category of the breast core biopsy template (Phase 50, pulled by the user on 30 September 2026). Compiled 30 September 2026.

**How to read this document**
- Every quotation was read from the linked source in this session. Where a source did not say something, the text says so.
- House evidence is given as aggregate counts only, and counts under 10 are not given. No report text is reproduced.
- The code lives in `generators/breast.js` (section "papillary lesions") and `schemas/breast_biopsy.json` (fields `papLesion` to `papInvOther`). The wording is fixed by `tests/breast_papillary.test.js` and four golden fixtures in `tests/fixtures/breast_biopsy/`.

## Sources

| Short name | Source | Link |
|---|---|---|
| RCPath G150 | Royal College of Pathologists. Guidelines for non-operative diagnostic procedures and reporting in breast cancer screening, version 3, July 2026 (aligned with WHO 6th ed.) | [G150 PDF](https://www.rcpath.org/static/4b16f19c-f7bd-456c-b212f557f8040f66/c95389ed-4637-4d79-ba57852fd8dec1fa/G150-Non-op-reporting-breast-cancer-screening.pdf) |
| WHO 6th ed. | Summary of the WHO Classification of Breast Tumours, 6th edition. Histopathology 2026;89(2):199–218, doi 10.1111/his.70149 | [PMC13341065](https://pmc.ncbi.nlm.nih.gov/articles/PMC13341065/) |
| Rakha 2024 | Rakha et al. Encapsulated papillary carcinoma of the breast. Histopathology 2024;86(4):497–513, doi 10.1111/his.15310 | [PMC11791731](https://pmc.ncbi.nlm.nih.gov/articles/PMC11791731/) |
| Rakha 2026 | Rakha, Tan, Raymond. Invasive papillary carcinomas of the breast. Histopathology 2026;88(4):747–768, doi 10.1111/his.70072 | [Wiley](https://onlinelibrary.wiley.com/doi/full/10.1111/his.70072) |
| Kulka 2022 | Kulka, Madaras, Floris et al. Papillary lesions of the breast. Virchows Arch 2022;480(1):65–84, doi 10.1007/s00428-021-03182-7, CC BY 4.0 | [PMC8983543](https://pmc.ncbi.nlm.nih.gov/articles/PMC8983543/) |

## Key statements

### B categories (RCPath G150)
- Papillary lesions "with or without atypia should be categorised as B3, unless any atypical proliferation is of sufficient extent (>3 mm)…" (s3.6.5, p25). B2 is possible only for a very small papilloma seen whole within the diameter of the core.
- Encapsulated and solid papillary carcinoma are both B5a, and the report should make clear that an encapsulated papillary carcinoma is not conventional DCIS (s3.8.2).
- "If there is unequivocal DCIS and features suspicious of invasion … B5a" (s3.8, p29).
- B5c is "only used when there are large fragments of carcinoma with no surrounding stroma", and "Malignant papillary lesions should not routinely be classified as B5c…" (s3.8, pp28–29).
- Myoepithelial cells are "usually absent at the periphery of encapsulated papillary carcinoma"; papillomas with DCIS keep the layer. Surgical excision is recommended for papillomas with atypia (s3.6.9). Absent myoepithelium after needle displacement is not, alone, invasion (s2.7.3).

### Papilloma with ADH or DCIS (Kulka 2022)
- "In intraductal papilloma with ADH, this proliferation is limited to < 3 mm of extent, whereas in intraductal papilloma with DCIS, it spans ≥ 3 mm."
- "If intermediate or high-grade atypia is present in a papilloma, the lesion should be classified as papilloma with DCIS regardless of the size of the atypical epithelial proliferation."
- "…diagnostic CNB and VAB containing fragments of intraductal papillomas are coded as B3 and, due to the histomorphological heterogeneity of papillomas, excision is recommended."

### Papillary DCIS
- "Papillary DCIS is a morphological subtype of DCIS featuring fibrovascular cores lined by neoplastic ductal epithelium and devoid of MECs, but with a preserved peripheral MEC layer and well‐defined duct profiles." (Rakha 2024)
- "In papillary DCIS, myoepithelial cells are present only at the periphery of the involved ducts." (Kulka 2022)

### Encapsulated papillary carcinoma
- "EPC usually lacks myoepithelial cells in the papillae and at the periphery…"; "In the absence of a frank invasive carcinoma, EPC should be staged and managed as DCIS." (Kulka 2022)
- EPC "is staged as a form of DCIS despite a frequent lack of peripheral myoepithelial markers"; "The vast majority of EPCs are ER positive and low‐intermediate nuclear grade"; the 6th edition "acknowledges that there may be very rare forms of EPC with uncharacteristic atypical features (such as high‐grade features or ER negativity) that may still be appropriately categorised as forms of EPC", and "A note or comment enumerating the unusual features … is advised". (WHO 6th ed.)
- "High nuclear grade tumours with an EPC growth pattern and positive MEC markers at the periphery of the lesion are reported as high‐nuclear grade EPC (B5a)…"; "In our opinion, EPC lacking peripheral MECs and showing an irregular margin or high nuclear grade features can be reported as B5c, reflecting uncertainty regarding the possibility of invasion with a recommendation to fully excise with SLN biopsy but not for consideration of neoadjuvant therapy." (Rakha 2024)

### Solid papillary carcinoma (WHO 6th ed.)
- The 6th edition divides it into SPC in situ, SPC in situ with invasion ("usually hypercellular MC … or invasive breast carcinoma NST") and invasive SPC, which has "ragged and jagged contours creating a geographical jigsaw pattern within desmoplastic stroma".
- "SPC composed of circumscribed nodules with smooth contours is classified as in situ disease, even in the absence of myoepithelial cells."
- "Neuroendocrine differentiation and mucin production are very common." (Kulka 2022; the review names synaptophysin in its Fig 7 legend, not chromogranin.)

### Invasion
- "…the diagnosis of IBCP should only be made when the absence of MECs is accompanied by unequivocal evidence of stromal invasion, seen as irregular infiltrative margins, a desmoplastic stromal reaction, or entrapment of surrounding breast structures." (Rakha 2026)
- SPC "with this jigsaw-like pattern extending into the surrounding stroma and fat, or showing fat cells entrapped towards the periphery of the clusters (a sign of fat infiltration)" is invasive disease (Rakha 2026). "The presence of entrapped fat cells within an EPC is a definite sign of invasion" (Rakha 2024).
- "Frank invasion is defined as the presence of neoplastic elements that permeate beyond the fibrous tissue capsule with an irregular infiltrative appearance." (Rakha 2024)
- "True invasion must be differentiated from entrapment of neoplastic cells within the fibrous capsule and from epithelial cell displacement within the biopsy site scar tissue"; "If in doubt regarding entrapped cells within or at the periphery of the capsule, it is advisable to categorize as EPC with microinvasion, or with a focus uncertain for invasion…". (Rakha 2024)
- The lack of myoepithelial and basement-membrane markers "should not result in a diagnosis of invasive carcinoma in the absence of a recognisable pattern of invasive carcinoma, similar to recommendations provided for encapsulated and solid papillary carcinomas." (WHO 6th ed.)
- "In the presence of frank invasion, the Nottingham grade, tumour size (TNM T stage), and receptor status should be assessed in the frankly invasive component." (Rakha 2024)

### Invasive papillary carcinoma (Rakha 2026)
- "…an exceptionally rare type of IBCP defined by the formation of finger-like fibrovascular projections covered by neoplastic epithelium, which infiltrate desmoplastic or fibrotic stroma in >90% of the tumour."
- "IPC is not characterised by a circumscribed growth pattern, neuroendocrine differentiation, mucin secretion, or a peripheral fibrous capsule…"; "the term IPC should not be used for non-papillary carcinomas arising in association with papillary carcinoma in situ"; "IPC should be staged and managed as IBC-NST."
- Not found: none of the five sources calls invasive papillary carcinoma a "diagnosis of exclusion" in those words.

## House wording evidence (aggregate)

From the five-year biopsy export and the 2024–2026 LIS export. Both stay in the sandbox.
- 42 of 554 breast diagnoses in the biopsy file name a papillary lesion (cores and excisions together).
- 32 diagnosis lines read "INTRADUCTAL PAPILLOMA" and none "INTRADUCT PAPILLOMA"; the LIS export agrees. The B3 papilloma line therefore changes from INTRADUCT to INTRADUCTAL. The option value stays "Intraduct papilloma", with a label, so saved drafts still open.
- Released lines include "INTRADUCTAL PAPILLOMA with USUAL DUCTAL HYPERPLASIA" and "PAPILLARY LESION, suggestive of INTRADUCTAL PAPILLOMA". No released diagnosis uses "nuclear grade": graded DCIS lines read ", low grade" (and intermediate or high). The new lines follow that.
- Of the 42 microscopy paragraphs, 34 name p63, 32 CK5/6 and 35 ER (31 name both CK5/6 and ER). Common phrases include "fibrovascular cores" (29), "consistent with intraductal papilloma" (13) and "loss of CK5/6" (12). The stains therefore sit inside the one microscopy paragraph.
- Encapsulated and solid papillary carcinoma are rare in both files, and none is on a core. Their wording follows the sources, in house sentence form.

## Build decisions

- **Category.** "Papillary lesion" sits after B5c and before the lymph node. Its B code follows `papillaryCode()`:
  - intraductal papilloma: B3, or B2 when ticked as small and seen whole within the core
  - suggestive fragments and papilloma with ADH: B3
  - papilloma with DCIS and papillary DCIS: B5a
  - encapsulated and solid papillary carcinoma: by the invasion field (not identified or suspicious B5a, present B5b, not assessable B5c)
  - invasive papillary carcinoma: B5b
  - A B category chosen by hand still wins, and Checks says when it disagrees.
- **Fields.**
  - Nuclear grade: DCIS in a papilloma, papillary DCIS, encapsulated and solid papillary carcinoma.
  - p63 along the cores and at the edge, CK5/6 and ER pattern: every lesion except invasive papillary carcinoma. The "absent in the atypical areas" choice appears only for ADH and DCIS in a papilloma.
  - Neuroendocrine markers: solid papillary carcinoma only.
  - Invasion, with the suspicious feature, the features shown and the invasive type: encapsulated and solid papillary carcinoma only. Solid papillary carcinoma defaults to an invasive solid papillary component; encapsulated papillary carcinoma does not offer one.
  - The existing tubule, pleomorphism, mitosis, extent and LVI fields also serve an invasive papillary component. The B3 recommendation follows them and shows for the B3 papillary lesions.
- **Hidden values.** The generator gates every sentence on the lesion, because hidden fields keep their values.
- **Printed text.** Released-report prose only (docs/new-template-brief.md §3.2). The paragraph runs: description, p63, CK5/6 and ER, neuroendocrine markers, closing statement, invasion, recommendation. The 3 mm rule, the B2 rule, the B5c rule and every citation go to Checks and the galleries, not the report.
- **Diagnosis lines.** They follow the released wording: "INTRADUCTAL PAPILLOMA with ATYPICAL DUCTAL HYPERPLASIA (B3)", "ENCAPSULATED PAPILLARY CARCINOMA without invasion (B5a)", "…, invasion cannot be excluded (B5a)", "… with INVASIVE CARCINOMA OF NO SPECIAL TYPE, provisional grade 2 (B5b)", "INVASIVE SOLID PAPILLARY CARCINOMA, provisional grade 2 (B5b)", "…, IN SITU VERSUS INVASIVE NOT ASSESSABLE (B5c)".
- **Checks.**
  - Warnings:
    - invasion recorded without a stromal feature
    - no myoepithelial cells along the cores of a papilloma
    - myoepithelial cells along the cores of papillary DCIS, or none around its duct
    - CK5/6 loss in a papilloma without atypia
    - high-grade encapsulated papillary carcinoma
    - an override that disagrees with the derived code
    - "not assessable" with myoepithelial cells recorded at the edge
  - Reminders:
    - the B2 rule
    - the 3 mm and grade rule for ADH and DCIS
    - the B5c rule
    - what makes invasive papillary carcinoma
    - biomarkers of the invasive component
- **Left alone.** Intake routing, the other categories' wording (apart from INTRADUCTAL), the biomarker block, the schema example and the existing fixtures.
- **Schema builder.** `scripts/build-breast-schema.mjs` is stale (the JSON has been edited directly since the specimen intake work), so it now carries a do-not-run note.
- **Offered for later, not changed here.**
  - The existing B5a DCIS line prints "nuclear grade", but released diagnoses write ", low grade".
  - Released breast diagnoses rarely print a B code.

## Images

All 13 images are crops from Kulka 2022, reused under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) with credit and the note "(cropped)". Rakha 2024, Rakha 2026 and the WHO summary do not state an open licence, so none of their figures is used. No openly licensed image of a suspicious edge or of stroma-free fragments was found; those gallery groups are left for the user's own photographs.

| File (assets/reference/breast_biopsy/) | Figure | Shows | Gallery |
|---|---|---|---|
| papilloma.jpg | Fig 2a | Intraductal papilloma in a large duct | Lesion |
| papilloma_p63.jpg | Fig 2d | p63 along the cores and the duct wall | Lesion |
| papilloma_adh.jpg | Fig 4a | ADH under 3 mm within a papilloma | Lesion |
| papilloma_adh_ck5.jpg | Fig 4b | CK5 loss in the atypical proliferation | Lesion |
| papillary_dcis.jpg | Fig 5a | Papillary DCIS, star marking microinvasion | Lesion |
| epc.jpg | Fig 6b | Encapsulated papillary carcinoma with capsule | Lesion |
| spc.jpg | Fig 7a | Solid papillary carcinoma | Lesion |
| spc_synaptophysin.jpg | Fig 7c | Synaptophysin in solid papillary carcinoma | Lesion |
| invasive_papillary.jpg | Fig 8a | Invasive papillary carcinoma | Lesion |
| pseudoinvasion.jpg | Fig 3a | Sclerotic capsule with entrapped cells | Invasion |
| pseudoinvasion_p63.jpg | Fig 3b | p63 around the entrapped nests | Invasion |
| epc_invasion.jpg | Fig 6c | Frank invasion from an EPC | Invasion |
| spc_invasion.jpg | Fig 7b | Invasion from an SPC | Invasion |

Credit on each image: "Kulka et al., Virchows Arch 2022, Fig Nx (cropped)", licence "CC BY 4.0", link https://pmc.ncbi.nlm.nih.gov/articles/PMC8983543/.
