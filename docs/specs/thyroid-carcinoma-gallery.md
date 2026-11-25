# Thyroid carcinoma resection — reference galleries

Reference panels on `schemas/thyroid_carcinoma.json` (user-approved 2026-11-25). Captions, criteria, credits, and links are on-screen study aids only and never print in the generated report.

## Design decisions

1. **Six panels on `select` fields:** `src/app.js` renders the reference toggle button on `select` and `multiselect` fields, so all six panels attach directly to the relevant `select` controls (`histType`, `capsule`, `angioinvasion`, `mitoticCount`, `ete`, and `ene`).
2. **Thyroid-only openly licensed photomicrographs:** Every stored image is a thyroid histopathology photomicrograph under `CC BY 4.0`, `CC BY-SA 3.0/4.0`, or `CC0` (no `NC` or `ND`, no AI-generated images, no stand-ins from other organs), saved as JPEG at `<= 900 px` and `<= 150 kB` in `assets/reference/thyroid_carcinoma/`.
3. **Criteria-only where no clean open thyroid photo exists:** No openly licensed CC BY thyroid extrathyroidal extension histopathology photograph was available, so `ete` is a structured AJCC 8th edition criteria panel with ExpertPath links.
4. **ExpertPath links:** Topic links open `https://app.expertpath.com/` in a new tab with the user's own login; no ExpertPath images are stored and no unverified document UUIDs are fabricated.

## Panels

| Panel | Field | Groups | Photographs (new + reused) | ExpertPath links |
|---|---|---:|---:|---:|
| Thyroid carcinoma types (WHO 5th edition) | `histType` | 10 | 13 + 0 | 11 |
| Capsular invasion and post-FNA mimickers | `capsule` | 3 | 2 + 0 | 1 |
| Angioinvasion vs lymphatic invasion (CAP 4.4.0.0) | `angioinvasion` | 3 | 1 + 0 | 1 |
| High-grade features: DHGTC, PDTC and IMTCGS | `mitoticCount` | 3 | 2 + 2 | 3 |
| Extrathyroidal extension (AJCC 8th edition) | `ete` | 4 | 0 + 0 | 1 |
| Regional lymph node compartments and extranodal extension (AJCC 8th edition) | `ene` | 3 | 1 + 0 | 1 |

Total: **6 panels**, **19 unique JPEG photographs** (21 image slots including 2 reused between `histType` and `mitoticCount`), **18 ExpertPath links**.

## Sources and licences

| File | Subject | Credit | Licence | Source URL |
|---|---|---|---|---|
| `ptc_classic.jpg` | Classic PTC nuclear features | Librepath | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Papillary_thyroid_carcinoma_-_pi_--_high_mag.jpg |
| `ptc_tall_cell.jpg` | Tall cell subtype PTC | Nephron | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Papillary_thyroid_carcinoma_tall_cell_var_intermed_mag.jpg |
| `ptc_tall_hobnail.jpg` | Tall cell and hobnail PTC | Cameselle-Teijeiro, Eloy & Sobrinho-Simões (Endocr Pathol 2020) | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Histopathology_of_tall_cell_and_hobnail_variants_of_papillary_thyroid_carcinoma.jpg |
| `ptc_oncocytic.jpg` | Oncocytic subtype PTC | Nephron | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Papillary_thyroid_carcinoma_oncocytic_variant_--_high_mag.jpg |
| `iefvptc.jpg` | Minimally invasive IEFVPTC | Dioufa et al., Virchows Archiv 2025 (PMC12876452), Fig 9 | CC BY 4.0 | https://pmc.ncbi.nlm.nih.gov/articles/PMC12876452/ |
| `ftc_low.jpg` | Follicular thyroid carcinoma | Nephron | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Follicular_thyroid_carcinoma_--_low_mag.jpg |
| `oncocytic_ca.jpg` | Oncocytic (Hürthle cell) carcinoma | Librepath | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Hurthle_cell_carcinoma_--_high_mag.jpg |
| `dhgtc_necrosis.jpg` | DHGTC with coagulative tumour necrosis | Cochand-Priollet et al., Current Oncology 2023 (PMC10453903), Fig 6 | CC BY 4.0 | https://pmc.ncbi.nlm.nih.gov/articles/PMC10453903/ |
| `pdtc_insular.jpg` | PDTC (insular/solid pattern) | Dioufa et al., Virchows Archiv 2025 (PMC12876452), Fig 10 | CC BY 4.0 | https://pmc.ncbi.nlm.nih.gov/articles/PMC12876452/ |
| `atc_low.jpg` | Anaplastic thyroid carcinoma | Nephron | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Anaplastic_thyroid_carcinoma_low_mag.jpg |
| `atc_scc.jpg` | ATC, squamous cell carcinoma pattern | Cochand-Priollet et al., Current Oncology 2023 (PMC10453903), Fig 8 | CC BY 4.0 | https://pmc.ncbi.nlm.nih.gov/articles/PMC10453903/ |
| `mtc_high.jpg` | Medullary thyroid carcinoma | Nephron | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Medullary_thyroid_carcinoma_-_high_mag.jpg |
| `niftp.jpg` | NIFTP | Mikael Häggström | CC0 | https://commons.wikimedia.org/wiki/File:Histopathology_of_NIFTP.png |
| `capsular_invasion.jpg` | Unequivocal trans-capsular invasion | Dioufa et al., Virchows Archiv 2025 (PMC12876452), Fig 1 | CC BY 4.0 | https://pmc.ncbi.nlm.nih.gov/articles/PMC12876452/ |
| `capsular_mimic_fna.jpg` | Post-FNA mimickers of capsular invasion | Dioufa et al., Virchows Archiv 2025 (PMC12876452), Fig 2 | CC BY 4.0 | https://pmc.ncbi.nlm.nih.gov/articles/PMC12876452/ |
| `angioinvasion.jpg` | Intravascular tumour thrombus (angioinvasion) | Dioufa et al., Virchows Archiv 2025 (PMC12876452), Fig 3 | CC BY 4.0 | https://pmc.ncbi.nlm.nih.gov/articles/PMC12876452/ |
| `mtc_mitoses.jpg` | High-grade MTC mitotic figures | Cochand-Priollet et al., Current Oncology 2023 (PMC10453903), Fig 10 | CC BY 4.0 | https://pmc.ncbi.nlm.nih.gov/articles/PMC10453903/ |
| `mtc_high_grade.jpg` | High-grade MTC (necrosis, mitoses, Ki-67) | Goswami et al., Journal of Medicine and Life 2024 (PMC11080517), Fig 7 | CC BY 4.0 | https://pmc.ncbi.nlm.nih.gov/articles/PMC11080517/ |
| `ln_ptc_met.jpg` | Lymph node metastasis of PTC | Nephron | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Lymph_node_with_papillary_thyroid_carcinoma.jpg |

## Rejected candidates (not used)

- `PMC12323743` (NIHMS manuscript — no open Creative Commons licence declared)
- `PMC12438045` (`CC BY-NC-ND 4.0`)
- `PMC12765880` (`CC BY-NC 4.0`)
- `PMC11071005` (`CC BY-NC-ND 4.0`)
