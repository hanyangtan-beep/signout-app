# Bone tumour resection — reference galleries

Reference panels on `schemas/bone_tumour.json` (built 2026-11-25). Captions, criteria, credits, and links are on-screen study aids only and never print in the generated report.

## Design decisions

1. **Five panels on `select` fields:** All five panels attach to `select` controls (`histType`, `histGrade`, `treatmentEffect`, `siteGroup`, `cortexStatus`) so every reference toggle renders in `src/app.js`.
2. **Bone-only openly licensed photomicrographs:** Every stored image is a primary bone tumour histopathology photomicrograph under `CC BY-SA 3.0` or `CC BY-SA 4.0` (no `NC` or `ND`, no AI-generated images, no stand-ins from other sites), saved as JPEG at `<= 900 px` and `<= 150 kB` in `assets/reference/bone_tumour/`.
3. **Criteria-only panels where no clean open photo exists:** `treatmentEffect`, `siteGroup`, and `cortexStatus` carry structured CAP 4.2.0.0 / AJCC 8th edition criteria and ExpertPath links without stand-in photos.
4. **ExpertPath links:** Topic links open `https://app.expertpath.com/` in a new tab with the user's own login; no ExpertPath images are stored and no unverified document UUIDs are fabricated.

## Panels

| Panel | Field | Groups | Photographs (new + reused) | ExpertPath links |
|---|---|---:|---:|---:|
| Bone tumour types (WHO 5th edition) | `histType` | 8 | 10 + 0 | 9 |
| Histologic grading of bone sarcomas (AJCC 8th / WHO 5th) | `histGrade` | 3 | 0 + 3 | 2 |
| Neoadjuvant treatment effect in bone sarcomas (CAP 4.2.0.0 / Huvos) | `treatmentEffect` | 3 | 0 + 0 | 1 |
| AJCC 8th edition bone staging site tables | `siteGroup` | 3 | 0 + 0 | 1 |
| Cortical destruction, marrow permeation and soft tissue extension | `cortexStatus` | 3 | 0 + 0 | 1 |

Total: **5 panels**, **10 unique JPEG photographs** (13 image slots including 3 reused between `histType` and `histGrade`), **14 ExpertPath links**.

## Sources and licences

| File | Subject | Credit | Licence | Source URL |
|---|---|---|---|---|
| `osteosarcoma_conv.jpg` | Conventional high-grade osteosarcoma | Nephron | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Osteosarcoma_-_high_mag.jpg |
| `osteosarcoma_small_cell.jpg` | Small cell osteosarcoma | Nephron | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Small_cell_osteosarcoma_-_high_mag.jpg |
| `osteosarcoma_parosteal.jpg` | Parosteal osteosarcoma | 藤澤孝志 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Parosteal_osteosarcoma.jpg |
| `osteoblastoma.jpg` | Osteoblastoma | Nephron | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Osteoblastoma_-_high_mag.jpg |
| `chondrosarcoma_dediff.jpg` | Dedifferentiated chondrosarcoma | Sarahkayb | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Bone_Chondrosarcoma_Dedifferentiated_HP_PA.jpg |
| `chondrosarcoma_mesench.jpg` | Mesenchymal chondrosarcoma | Sarahkayb | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Bone_Chondrosarcoma_Mesenchymal_MP5_PA.JPG |
| `ewing_sarcoma.jpg` | Ewing sarcoma | Nephron | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Ewing_sarcoma_-_high_mag.jpg |
| `chordoma.jpg` | Conventional chordoma | Nephron | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Chordoma_--_high_mag.jpg |
| `gct_bone.jpg` | Giant cell tumour of bone | Nephron | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Giant_cell_tumour_of_bone_-_high_mag.jpg |
| `adamantinoma.jpg` | Adamantinoma of long bones | Nephron | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Adamantinoma_-_intermed_mag.jpg |
