# Benign resections — case mix, 2021 to 2026

Source: the anonymised five-year biopsy file (January 2021 to 14 September 2026; 9,325 cases with a diagnosis) and the 2024–2026 LIS export (4,547 cases, of which 2,964 histology — cytology YNP, YFC, YGP and molecular NGSLG, FISH0, ISH rows are left out). Produced by `python3 tools/profile-benign-resections.py --route`. Both files are PHI and stay in the sandbox; only the counts below leave them — no accession number, site text, case text or patient field appears here.

Unit: diagnosis parts (a case can carry several), classified from each part's specimen line and diagnosis, first rule wins. Shares are cases over all cases in that file. This is not the site-based table in `docs/case-mix-2026-09.md`, which buckets whole cases by the LIS Site column; soft tissue, for example, is 129 cases there. Heads that already have an organ template (stomach, breast, uterus, placenta and so on) are not counted here, except products of gestation and standalone fallopian tubes.

## Summary

| Category | Five-year parts | Cases | Share | Export parts | Cases | Share | Generic today |
|---|---:|---:|---:|---:|---:|---:|---:|
| Soft tissue | 421 | 366 | 3.9% | 102 | 97 | 2.1% | 236 / 523 |
| Abscess, ulcer and granulation tissue | 206 | 192 | 2.1% | 56 | 52 | 1.1% | 183 / 262 |
| Bone and joint | 154 | 141 | 1.5% | 25 | 25 | 0.5% | 165 / 179 |
| Products of gestation | 90 | 89 | 1.0% | 24 | 23 | 0.5% | 107 / 114 |
| Fallopian tube, benign (not ectopic) | 68 | 51 | 0.5% | 15 | 15 | 0.3% | 69 / 83 |
| Haemorrhoid | 40 | 39 | 0.4% | 16 | 16 | 0.4% | 54 / 56 |
| Nail and digit | 41 | 40 | 0.4% | 15 | 15 | 0.3% | 36 / 56 |
| Kidney | 45 | 41 | 0.4% | 10 | 10 | 0.2% | 44 / 55 |
| Testis, scrotum and foreskin | 35 | 30 | 0.3% | 10 | 10 | 0.2% | 37 / 45 |
| Ear and temporal bone | 30 | 27 | 0.3% | 6 | 6 | 0.1% | 35 / 36 |
| Hernia sac | 8 | 8 | 0.1% | 0 | 0 | 0.0% | 2 / 8 |
| Ectopic pregnancy | 6 | 6 | 0.1% | 2 | 2 | 0.0% | 7 / 8 |
| **All of the above** | 1144 | 1017 | 10.9% | 281 | 271 | 6.0% | 975 / 1425 |

## Composition

### Soft tissue

| Group | Five-year | Export |
|---|---:|---:|
| on the benign template today | 124 | 32 |
| descriptive, no evidence of malignancy | 74 | 23 |
| metastasis / lymphoma / other malignancy | 77 | 11 |
| reactive | 31 | 6 |
| sarcoma | 27 | 9 |
| inflammatory | 25 | 4 |
| other | 17 | 6 |
| benign tumour not on the list | 18 | 2 |
| ALT / WDLPS | 13 | 5 |
| nodal tissue | 11 | 3 |
| desmoid / SFT / DFSP / IMT | 4 | 1 |

Intake top-1 today: `generic` 236, `soft_tissue_benign` 236, `lymph_node` 19, `frozen_section` 16, `jaw_cyst` 4, `skin_lesion` 3, `colon_resection` 2, `breast_excision` 2, `breast_carcinoma` 2, `colonic_polyp` 1, `duodenal_biopsy` 1, `skin_cyst` 1.

### Abscess, ulcer and granulation tissue

| Group | Five-year | Export |
|---|---:|---:|
| abscess (wall) | 56 | 16 |
| ulcer | 31 | 11 |
| granulation tissue | 24 | 5 |
| other | 15 | 7 |
| acute / chronic inflammation | 17 | 4 |
| descriptive, no evidence of malignancy | 13 | 5 |
| stasis change / dermatitis | 13 | 4 |
| ruptured / inflamed cyst | 15 | 0 |
| fistula / sinus | 11 | 2 |
| malignant or premalignant | 6 | 1 |
| necrotic tissue / debridement | 5 | 1 |

| Specimen line | Five-year | Export |
|---|---:|---:|
| skin | 85 | 20 |
| soft tissue | 55 | 16 |
| other | 39 | 16 |
| perianal / anal / pilonidal | 27 | 4 |

Intake top-1 today: `generic` 183, `skin_cyst` 40, `soft_tissue_benign` 31, `jaw_cyst` 5, `turbt` 2, `effusion_cytology` 1.

### Bone and joint

| Group | Five-year | Export |
|---|---:|---:|
| descriptive, no evidence of malignancy | 72 | 11 |
| primary bone or cartilage tumour | 24 | 6 |
| metastatic carcinoma | 25 | 4 |
| osteomyelitis / infection | 12 | 2 |
| degenerative (OA / disc) | 3 | 1 |
| fracture / callus | 4 | 0 |
| other | 4 | 0 |
| plasma cell neoplasm / lymphoma | 4 | 0 |
| necrosis / AVN | 3 | 0 |
| crystal arthropathy | 1 | 1 |
| synovium: chondromatosis / TGCT / synovitis / wear debris | 2 | 0 |

| Specimen line | Five-year | Export |
|---|---:|---:|
| curettage / excision / resection | 38 | 5 |
| synovium / joint | 34 | 8 |
| bone biopsy / core | 18 | 5 |
| femoral / humeral head | 21 | 1 |
| spine / disc / ligamentum | 18 | 4 |
| other | 18 | 1 |
| reamings | 6 | 1 |
| amputation | 1 | 0 |

Intake top-1 today: `generic` 165, `gastric_biopsy` 5, `soft_tissue_benign` 3, `jaw_cyst` 2, `effusion_cytology` 2, `nasal_polyps` 1, `frozen_section` 1.

### Products of gestation

| Group | Five-year | Export |
|---|---:|---:|
| products of gestation confirmed | 82 | 20 |
| other | 6 | 4 |
| molar (hydatidiform mole) | 2 | 0 |

| Specimen line | Five-year | Export |
|---|---:|---:|
| headed tissue mass (passed per vaginam) | 55 | 7 |
| uterine evacuation / curettage | 27 | 12 |
| other | 8 | 5 |

Intake top-1 today: `generic` 107, `endometrial_biopsy` 5, `placenta` 2.

### Fallopian tube, benign (not ectopic)

| Group | Five-year | Export |
|---|---:|---:|
| paratubal / fimbrial cyst | 30 | 10 |
| unremarkable / sterilisation segment | 24 | 3 |
| hydrosalpinx | 6 | 1 |
| other | 6 | 1 |
| endometriosis | 1 | 0 |
| salpingitis / tubo-ovarian abscess | 1 | 0 |

Intake top-1 today: `generic` 69, `ovarian_cyst` 14.

### Haemorrhoid

| Group | Five-year | Export |
|---|---:|---:|
| haemorrhoid | 34 | 13 |
| with another finding | 4 | 2 |
| other | 1 | 1 |
| fibroepithelial polyp / skin tag | 1 | 0 |

| Specimen line | Five-year | Export |
|---|---:|---:|
| header ANAL | 19 | 9 |
| header ANUS | 19 | 7 |
| header RECTUM | 2 | 0 |

Intake top-1 today: `generic` 54, `colon_resection` 2.

### Nail and digit

| Group | Five-year | Export |
|---|---:|---:|
| descriptive, no evidence of malignancy | 8 | 4 |
| nail-unit melanocytic | 6 | 4 |
| TGCT / glomus / other tumour | 6 | 3 |
| inflammatory / pyogenic granuloma | 5 | 1 |
| bone / cartilage | 4 | 1 |
| nail plate / fungal | 3 | 2 |
| digital mucous / ganglion cyst | 4 | 0 |
| gouty tophus | 2 | 0 |
| other | 2 | 0 |
| metastasis | 1 | 0 |

| Specimen line | Five-year | Export |
|---|---:|---:|
| finger / thumb | 25 | 9 |
| toe | 10 | 3 |
| nail unit | 6 | 3 |

Intake top-1 today: `generic` 36, `soft_tissue_benign` 12, `skin_cyst` 8.

### Kidney

| Group | Five-year | Export |
|---|---:|---:|
| renal cell carcinoma / renal tumour | 24 | 4 |
| urothelial carcinoma | 5 | 2 |
| descriptive, no evidence of malignancy | 5 | 1 |
| polycystic / end-stage / cyst | 4 | 2 |
| other malignant | 3 | 1 |
| angiomyolipoma | 2 | 0 |
| graft / vascular | 2 | 0 |

Intake top-1 today: `generic` 44, `turbt` 7, `soft_tissue_benign` 2, `lymph_node` 2.

### Testis, scrotum and foreskin

| Group | Five-year | Export |
|---|---:|---:|
| foreskin (phimosis / lichen sclerosus) | 6 | 3 |
| penile / scrotal skin lesion | 7 | 2 |
| orchidectomy, no tumour / atrophy | 7 | 1 |
| testis tumour / lymphoma | 5 | 1 |
| urothelial / other carcinoma | 3 | 1 |
| hydrocele / epididymal cyst / vas | 3 | 0 |
| testicular biopsy | 2 | 1 |
| torsion / infarction | 1 | 1 |
| other | 1 | 0 |

| Specimen line | Five-year | Export |
|---|---:|---:|
| orchidectomy / testis | 15 | 3 |
| penile / scrotal skin | 11 | 4 |
| circumcision / prepuce | 5 | 2 |
| hydrocele / epididymis / cord / vas | 4 | 1 |

Intake top-1 today: `generic` 37, `skin_cyst` 5, `ovarian_cyst` 2, `soft_tissue_benign` 1.

### Ear and temporal bone

| Group | Five-year | Export |
|---|---:|---:|
| cholesteatoma (incl. keratin only) | 21 | 4 |
| canal skin lesion | 4 | 1 |
| aural polyp / granulation / inflammation | 3 | 0 |
| descriptive, no evidence of malignancy | 1 | 1 |
| atypical / malignant | 1 | 0 |

| Specimen line | Five-year | Export |
|---|---:|---:|
| middle ear / mastoid / cholesteatoma | 20 | 4 |
| other | 8 | 2 |
| external auditory canal | 2 | 0 |

Intake top-1 today: `generic` 35, `skin_cyst` 1.

### Hernia sac

| Group | Five-year | Export |
|---|---:|---:|
| hernia sac | 5 | 0 |
| involved by carcinoma | 3 | 0 |

Intake top-1 today: `soft_tissue_benign` 6, `generic` 2.

### Ectopic pregnancy

| Group | Five-year | Export |
|---|---:|---:|
| tubal pregnancy | 5 | 1 |
| other | 1 | 1 |

Intake top-1 today: `generic` 7, `ovarian_cyst` 1.

Haemorrhoid diagnosis spelling (both files): HAEMORRHOID 44, HEMORRHOID 10, neither 2; plural 2 of 56.

Products-of-gestation diagnosis wording (both files): PRODUCTS OF GESTATION 102, PRODUCTS OF CONCEPTION 0, neither 12 of 114.
