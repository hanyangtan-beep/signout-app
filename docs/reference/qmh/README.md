# QMH template text dumps

Plain-text renderings of the QMH Cancer Reporting Template pages, one per cancer site, taken at the time each synoptic template was built. They are the provenance for the element-order tests: the "element order follows the QMH … page" test in each synoptic suite asserts our printed row order against the heading order in the corresponding file here.

These were previously under `analysis/qmh/`, which is gitignored, so a fresh clone could not check the claim. They now live here and are tracked. The matching rendered HTML is in `docs/reference/*.html`.

| File | Page | Template |
|---|---|---|
| `breast.txt` | BREAST-Cancers | `breast_carcinoma` |
| `dcis.txt` | BREAST-DCIS | `breast_dcis` |
| `phyllodes.txt` | BREAST-Phyllodes | `phyllodes` |
| `lung.txt` | Thorax-Lung | `lung_carcinoma` |
| `ovary.txt` | GYN-Ovary | `ovary_ft_peritoneum` |
| `hcc.txt` | GI-HCC | `hcc` |
| `pitnet.txt` | Endocrine-PitNET | `pituitary_net` |
| `vulva.txt` | GYN-Vulva | `vulval_carcinoma` |
| `ureter.txt` | UG-Ureter | `ureter_renal_pelvis_carcinoma` |
| `softtissue.txt` | MS-Soft tissue sarcoma | `soft_tissue_sarcoma` |
| `cervix.txt` | GYN-Cervix | `cervical_carcinoma` |
| `stomach-biomarkers.txt` | Biomarker-Stomach (updated 11-Apr-2025) | `gastric_biopsy` (biomarker sentence order) |

Do not edit by hand. To refresh a page, re-save the rendered HTML into `docs/reference/` and re-dump the text; a change here should be reviewed against the element-order test in the same commit.
