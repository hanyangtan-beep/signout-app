# Radical prostatectomy — reference galleries

Reference panels on `schemas/prostate_radical.json` (built 2026-11-25). Captions, criteria, credits, and links are on-screen study aids only and never print in the generated report.

## Design decisions

1. **Six panels on `select` fields:** All six panels attach to `select` controls (`histType`, `primary`, `cribriform`, `idcp`, `epe`, `marginStatus`) so every reference toggle renders in `src/app.js`.
2. **Reused Gleason/cribriform/IDC-P library + 3 new resection-specific photos:** Reuses 14 verified `CC BY 4.0` / `CC BY-SA 3.0` / `CC0` photomicrographs already stored in `assets/reference/prostate/` alongside 3 new `CC BY-SA 3.0` Wikimedia Commons photomicrographs in `assets/reference/prostate_radical/` (`epe_high.jpg`, `ductal_adeno.jpg`, `sv_normal.jpg`), all JPEG `<= 900 px` and `<= 150 kB`.
3. **Radical prostatectomy 5% rule:** The `primary` panel explicitly highlights the radical prostatectomy 5% minor (tertiary) pattern rule (distinct from needle core biopsy).
4. **ExpertPath links:** Topic links open `https://app.expertpath.com/` in a new tab with the user's own login; no ExpertPath images are stored and no unverified document UUIDs are fabricated.

## Panels

| Panel | Field | Groups | Photographs (new + reused) | ExpertPath links |
|---|---|---:|---:|---:|
| Prostate carcinoma types (WHO 5th edition) | `histType` | 4 | 1 + 2 | 4 |
| Gleason patterns 3, 4 and 5 (radical prostatectomy) | `primary` | 4 | 0 + 10 | 2 |
| Cribriform pattern 4 (ISUP / WHO 5th) | `cribriform` | 3 | 0 + 4 | 1 |
| Intraductal carcinoma of the prostate (IDC-P) | `idcp` | 2 | 0 + 4 | 1 |
| Extraprostatic extension (pT3a) and seminal vesicle invasion (pT3b) | `epe` | 3 | 2 + 1 | 2 |
| Radical prostatectomy surgical margins (CAP 4.3.0.0) | `marginStatus` | 3 | 0 + 0 | 1 |

Total: **6 panels**, **3 new JPEG photographs** in `assets/reference/prostate_radical/` + **14 unique reused photographs** from `assets/reference/prostate/`, **11 ExpertPath links**.

## New sources and licences (`assets/reference/prostate_radical/`)

| File | Subject | Credit | Licence | Source URL |
|---|---|---|---|---|
| `epe_high.jpg` | Extraprostatic extension (tumour in periprostatic fat) | Nephron | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Prostate_carcinoma_with_extraprostatic_extension_--_high_mag.jpg |
| `ductal_adeno.jpg` | Prostatic ductal adenocarcinoma | Nephron | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Ductal_adenocarcinoma_of_prostate_--_high_mag.jpg |
| `sv_normal.jpg` | Normal seminal vesicle epithelium (SVI mimic) | Nephron | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Seminal_vesicle_high_mag.jpg |
