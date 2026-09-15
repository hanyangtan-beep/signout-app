# Case-mix analysis — LIS export 2024 to 2026-09

Source: `export-cases-2024-to-current.csv`, 4547 cases reported under one responsible pathologist. Arrival years: 2024 n=1850, 2025 n=905, 2026 n=1787. Classified by `tools/classify-case-export.py` from the **Site** column, with the **Test** code separating cytology (YNP, YFC, YGP), molecular add-ons (NGSLG, FISH0, ISH) and histology. 197 cases (4.3 per cent) are long-tail singletons that no rule matched.

The export contains patient identifiers. It was read in the sandbox only; no identifier appears in this file or anywhere in the repo.

## Coverage today

- Covered by a built template: **3603 / 4547 = 79.2 per cent**
- In a category with no template: **747 = 16.4 per cent**
- Unclassified long tail: 197 = 4.3 per cent

Building the top five gaps takes coverage to 89.9 per cent:

| Add | Cases | Cumulative coverage |
|---|---:|---:|
| Respiratory cytology | 228 | 84.3 % |
| Oral cavity / oropharynx | 106 | 86.6 % |
| Brain / CNS | 66 | 88.0 % |
| Joint fluid cytology | 44 | 89.0 % |
| CSF cytology | 40 | 89.9 % |

## Every category, by volume

| Cases | % | Category | Mix | Template |
|---:|---:|---|---|---|
| 471 | 10.4 | Gastric biopsy | Histology 467, Molecular 4 | gastric_biopsy |
| 373 | 8.2 | Colorectal polyp / biopsy | Histology 372, Molecular 1 | colonic_polyp, ibd_biopsy, colon_resection |
| 273 | 6.0 | Urine cytology | Cytology 273 | urine_cytology |
| 263 | 5.8 | Cervical smear | Cytology 263 | cervical_cytology |
| 254 | 5.6 | Endometrium / curettings | Histology 254 | endometrial_biopsy, endometrial_carcinoma |
| 245 | 5.4 | Serous effusion cytology | Cytology 232, Molecular 9, Histology 4 | effusion_cytology |
| 228 | 5.0 | Respiratory cytology | Cytology 228 | **none** |
| 214 | 4.7 | Lung / pleura | Histology 168, Molecular 46 | lung_biopsy, lung_carcinoma |
| 153 | 3.4 | Breast | Histology 152, Molecular 1 | breast_biopsy, breast_carcinoma, breast_dcis, breast_excision, phyllodes |
| 142 | 3.1 | Skin | Histology 142 | skin_lesion, skin_excision, skin_cyst |
| 141 | 3.1 | Thyroid FNA | Cytology 141 | thyroid_fna |
| 130 | 2.9 | Lymph node (histology) | Histology 111, Molecular 19 | lymph_node |
| 129 | 2.8 | Soft tissue | Histology 115, Molecular 14 | soft_tissue_benign (benign only) |
| 107 | 2.4 | Lymph node FNA | Cytology 107 | lymph_node_fna |
| 106 | 2.3 | Oral cavity / oropharynx | Histology 103, Molecular 3 | **none** |
| 101 | 2.2 | Cervix biopsy / LEEP | Histology 100, Molecular 1 | cervical_biopsy, cervical_excision |
| 99 | 2.2 | Placenta | Histology 99 | placenta |
| 90 | 2.0 | Prostate | Histology 89, Molecular 1 | prostate_biopsy, turp |
| 84 | 1.8 | Other FNA / non-gynae | Cytology 84 | **none** |
| 80 | 1.8 | Nasopharynx / sinonasal | Histology 65, Molecular 15 | nasopharyngeal_biopsy, nasal_polyps |
| 66 | 1.5 | Brain / CNS | Histology 59, Molecular 7 | **none** |
| 45 | 1.0 | Gallbladder | Histology 45 | gallbladder, gallbladder_carcinoma |
| 44 | 1.0 | Uterus resection | Histology 44 | uterus_benign |
| 44 | 1.0 | Joint fluid cytology | Cytology 44 | **none** |
| 43 | 0.9 | Ovary / fallopian tube | Histology 43 | ovarian_cyst, ovary_ft_peritoneum |
| 40 | 0.9 | Bladder / urothelium | Histology 40 | turbt |
| 40 | 0.9 | Duodenal / small bowel biopsy | Histology 40 | duodenal_biopsy |
| 40 | 0.9 | CSF cytology | Cytology 40 | **none** |
| 33 | 0.7 | Thyroid / parathyroid | Histology 33 | thyroid_benign, parathyroid |
| 31 | 0.7 | Salivary FNA | Cytology 31 | salivary_fna |
| 29 | 0.6 | Liver | Histology 29 | **none** |
| 27 | 0.6 | Abscess / inflammatory | Histology 27 | **none** |
| 25 | 0.5 | Bile duct / pancreas | Histology 25 | **none** |
| 24 | 0.5 | Bone / joint | Histology 22, Molecular 2 | **none** |
| 21 | 0.5 | Vulva / vagina | Histology 21 | **none** |
| 19 | 0.4 | Tonsil / adenoid | Histology 16, Molecular 3 | tonsils |
| 15 | 0.3 | Appendix | Histology 15 | appendix, appendix_carcinoma |
| 15 | 0.3 | Haemorrhoid | Histology 15 | **none** |
| 11 | 0.2 | Salivary gland | Histology 7, Molecular 4 | salivary_benign |
| 10 | 0.2 | Oesophageal biopsy | Histology 10 | oesophageal_biopsy, oesophageal_carcinoma |
| 9 | 0.2 | Nail / digit | Histology 9 | **none** |
| 9 | 0.2 | Kidney | Histology 9 | **none** |
| 7 | 0.2 | Cardiovascular | Histology 7 | aortic_valve_aorta |
| 7 | 0.2 | Testis / penis / scrotum | Histology 7 | **none** |
| 6 | 0.1 | Ear / temporal bone | Histology 6 | **none** |
| 6 | 0.1 | Larynx / pharynx | Histology 5, Molecular 1 | **none** |
| 1 | 0.0 | Hernia sac | Histology 1 | **none** |

## Composition of the uncovered groups

- **Respiratory cytology (228)** — sputum ~132, bronchial aspirate / trap / lavage ~35 (often lobe-tagged RUL / RLL / LUL / LLL / RB3), bronchial washing ~16, plus EBUS brushings counted under Other FNA.
- **Oral cavity / oropharynx (106)** — oral cavity biopsies, mandible and maxilla (including mandibulectomy with neck dissection and revised maxillary margins), buccal mucosa with named margins, retromolar trigone, alveolus wide local excision.
- **Brain / CNS (66)** — brain 21, brain tumour / tumor 14, parietal / occipital / periventricular tumours, CPA tumours, suprasellar and sphenoidal-ridge meningiomas.
- **Joint fluid (44)** — knee 34, elbow, hip, shoulder aspirates.
- **CSF (40)** — lumbar puncture 13 explicit, ventricular 1, rest unqualified.
- **Bile duct / pancreas (25 histology)** — bile duct, ampulla, pancreas, plus pancreatic / bile-duct / pancreatic-duct **margins** as separate parts; a further ~18 cytology cases (brushings, EUS-FNA) sit under Other FNA.
- **Liver (29)** — segment tumours, lobe resections, suspected metastases. `liver_benign` covers the non-neoplastic path only.
- **Abscess / granulation (27)** — abscess wall, acetabular and pelvic granulation tissue, antral ulcer.
- **Bone / joint (24)** — synovium (knee, wrist, elbow), femoral head, femur reaming, iliac bone biopsy, intervertebral disc.
- **Vulva / vagina (21)** — vaginal tissue masses and tumours, vulval margins, labial lesions.
- **Haemorrhoid (15)** — currently Parked on the old estimate of 0–3 cases; the export shows 15.
- **Kidney (9)** — renal masses, cyst wall, nephrectomy with IVC thrombus. Lower than the earlier 600-document estimate suggested.

## What changed against the 2020–2026 Drive estimate

| Category | Drive estimate | LIS export | Direction |
|---|---:|---:|---|
| Oral cavity | 5.0 % | 2.3 % | still a top gap, half the weight |
| Liver | 3.7 % | 0.6 % | much smaller |
| Kidney | 1.8 % | 0.2 % | negligible |
| Respiratory cytology | not measured | 5.0 % | **largest gap, previously invisible** |
| Gastric biopsy | not top-ranked | 10.4 % | largest single category overall |

The Drive folder held drafted documents, not the full reported caseload, so it under-represented cytology almost entirely. This export is the better basis for build order.

