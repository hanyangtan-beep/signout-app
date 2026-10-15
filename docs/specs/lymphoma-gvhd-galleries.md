# Lymph node for lymphoma and GVHD biopsy — reference gallery research

Researched 2026-10-15 for the two Phase 71 forms, `lymphoma_node` and `gvhd_biopsy`, which shipped without
photographs. Research only: nothing is built, no image is in the repo and the roadmap is unchanged. The
galleries use the existing `field.reference` mechanism (`schemas/README.md`, "Field reference photos"), as
the prostate, gastric and endometrial galleries do, and never print.

## Summary

- 83 images on 9 panels (80 new files, all distinct, and 3 reused from the oral and
  inflammatory skin galleries), 64 groups, of which 8 stay text only.
- Sources: 18 open-access journal articles (all CC BY 4.0) and 22 Wikimedia Commons files (CC BY, CC BY-SA
  or CC0). Nothing from NC or ND sources, PathologyOutlines, textbooks or AI.
- Four M cards, numbered in the suggested build order. The cap of three cards per batch means two batches:
  cards 1 to 3 first (GVHD; lymphoma cells; lymphoma stains and EBER), then card 4 (growth patterns and
  other features).

| Card | Form | Fields | Panels | New images | Groups (text only) |
| --- | --- | --- | --- | --- | --- |
| 1 | `gvhd_biopsy` | `grade`, `apoptosis`, `oralFeatures`, `differential` | 4 | 19 (+3 reused) | 19 (3) |
| 2 | `lymphoma_node` | `cytology` | 1 | 16 | 13 (1) |
| 3 | `lymphoma_node` | `panel`, `eber` | 2 | 26 | 14 (1) |
| 4 | `lymphoma_node` | `pattern`, `features` | 2 | 19 | 18 (3) |

## Method

- Journal figures: Europe PMC searches restricted to open-access articles; figure legends read for every
  candidate article; figures fetched from the PMC open-access bucket (`pmc-oa-opendata`), where the published
  figures are about 700 to 800 px wide; every panel letter checked against its legend on a contact sheet
  before it was chosen.
- Licences: each article's own licence statement (CC BY 4.0; the German Pathologie article states "Creative
  Commons Namensnennung 4.0") matched against the bucket's licence code. Commons: `extmetadata`
  `LicenseShortName` and `Artist` from the Commons API, and the uploader where no author is given.
- Rejected: NC or ND licences; eyepiece phone photographs; grids too small to crop; images from another site
  when the form is nodal (lung, intestine), unless the feature does not depend on site and the caption names
  the site; radiology and gross photographs; schematics; anything AI-generated.
- Sizes below are estimates of the crop from the published figure. Nothing has been cropped yet.

## Build rules

- Folders `assets/reference/gvhd_biopsy/` and `assets/reference/lymphoma_node/`, following `liver_biopsy` and
  `hirschsprung_biopsy`.
- At most 900 px, JPEG, and at most 150 kB per file. Only the prostate gallery is tested for the 150 kB
  ceiling today; the cards add the same check for their own files.
- `license` must match `^CC(0| BY| BY-SA)` in `tests/reference.test.js`. A plain "Public domain" label fails, so
  public-domain files are not used.
- Credits follow the existing galleries: "Hippe et al., Virchows Arch 2023, Fig 1A (cropped)"; "Nephron,
  Wikimedia Commons, full figure"; "Mark Ong, Wikimedia Commons, cropped" for the two centre crops. The URL is
  the DOI for journal figures and the file page for Commons. Reused images keep their existing credit lines.
- Group points come from the Phase 71 morphology briefs (`docs/reference/gvhd_biopsy-morphology.md`,
  `docs/reference/lymphoma_node-morphology.md`); no new criteria research is needed. Captions are reference
  text in the house style ("Feature: description (H&E).") and never print.
- Pipeline as for prostate: a build script in the research directory (`p72/`, not in the repo) crops each
  panel from `selection.json`, trims gutters, resizes and compresses, and writes `images.json`; a generator
  merges it into the schema, asserting that every group matches a heading and every licence passes.

## Card 1 — GVHD biopsy (`gvhd_biopsy`)

The grade photos come from one grading study (Kuş Öztürk et al.) and the crypt injury photos from the
Round-Robin study that validated the colonic GVHD criteria (Hippe et al.), so the labels follow published
definitions. Felemban et al. is the only openly licensed oral GVHD histology found; the oral panel therefore
borrows three images already in the app, each captioned as a comparison: skin GVHD with satellitosis,
vacuolar interface change in skin, and oral lichen planus. Drop them if the panel should show oral GVHD only.
The "Crypt injury" panel sits on `apoptosis`, the first of the adjacent crypt fields (`apoptosis`, `cryptLoss`,
`cryptChanges`, `paneth`), and covers all four; the build can split it into one panel per field instead.

#### `grade` — "Gut grade (small bowel and colon)" (existing text panel; add photos; 2 columns; 4 groups, 4 images)

| Group | Caption (draft) | Credit (links to source) | Licence | Size (px) |
| --- | --- | --- | --- | --- |
| 1 | Grade 1: apoptosis in the crypt epithelium (H&E). | [Kuş Öztürk et al., Turk J Gastroenterol 2023, Fig 1A (cropped)](https://doi.org/10.5152/tjg.2023.22012) | CC BY 4.0 | 350 × 315 |
| 2 | Grade 2: destruction of an isolated crypt (H&E). | [Kuş Öztürk et al., Turk J Gastroenterol 2023, Fig 1B (cropped)](https://doi.org/10.5152/tjg.2023.22012) | CC BY 4.0 | 350 × 315 |
| 3 | Grade 3: contiguous crypt destruction (H&E). | [Kuş Öztürk et al., Turk J Gastroenterol 2023, Fig 1C (cropped)](https://doi.org/10.5152/tjg.2023.22012) | CC BY 4.0 | 350 × 315 |
| 4 | Grade 4: diffuse mucosal denudation and ulceration (H&E). | [Kuş Öztürk et al., Turk J Gastroenterol 2023, Fig 1D (cropped)](https://doi.org/10.5152/tjg.2023.22012) | CC BY 4.0 | 350 × 315 |

#### `apoptosis` — "Crypt injury" (new; 3 columns; 6 groups, 7 images)

| Group | Caption (draft) | Credit (links to source) | Licence | Size (px) |
| --- | --- | --- | --- | --- |
| Apoptotic bodies | Colon: crypts with several apoptotic bodies (arrows), one enlarged in the inset (H&E). | [Hippe et al., Virchows Arch 2023, Fig 1A (cropped)](https://doi.org/10.1007/s00428-023-03544-3) | CC BY 4.0 | 370 × 280 |
| Exploding crypts | Crypt destruction: flattened crypt epithelium with the lumen filled by cell debris (arrow), apoptotic bodies in neighbouring crypts (H&E). | [Hippe et al., Virchows Arch 2023, Fig 1B (cropped)](https://doi.org/10.1007/s00428-023-03544-3) | CC BY 4.0 | 370 × 280 |
| Crypt loss | Crypt loss: missing or strongly degenerated crypts (arrows) (H&E). | [Hippe et al., Virchows Arch 2023, Fig 1C (cropped)](https://doi.org/10.1007/s00428-023-03544-3) | CC BY 4.0 | 370 × 280 |
| Denudation | Epithelial denudation with surface fibrin (arrow) and granulation tissue (H&E). | [Hippe et al., Virchows Arch 2023, Fig 1D (cropped)](https://doi.org/10.1007/s00428-023-03544-3) | CC BY 4.0 | 370 × 280 |
| Stomach | Stomach: apoptosis in the gland epithelium; some drugs give a very similar picture (H&E). | [Mark Ong, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Apoptotic_gastropathy_high_mag.jpg) | CC BY-SA 4.0 | 1040 × 772 |
| Chronic change | Architectural distortion: a branched crypt (arrow) beside a distorted crypt (H&E). | [Hippe et al., Virchows Arch 2023, Fig 1E (cropped)](https://doi.org/10.1007/s00428-023-03544-3) | CC BY 4.0 | 370 × 280 |
|  | Paneth cell metaplasia in a colonic crypt (H&E). | [Mikael Häggström, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Histopathology_Paneth_cell_metaplasia.jpg) | CC0 1.0 | 2048 × 1532 |

#### `oralFeatures` — "Oral mucosa" (new; 2 columns; 4 groups, 5 images, 3 reused)

| Group | Caption (draft) | Credit (links to source) | Licence | Size (px) |
| --- | --- | --- | --- | --- |
| Lichenoid interface inflammation | Buccal mucosa, chronic GVHD: hyperkeratosis and acanthosis with a mild lichenoid lymphocytic infiltrate (H&E). | [Felemban et al., Cureus 2024, Fig 4A (cropped)](https://doi.org/10.7759/cureus.60147) | CC BY 4.0 | 375 × 237 |
|  | Oral lichen planus, for comparison (H&E). | [Lorini et al., Cancers 2021, Fig 2A (cropped)](https://www.mdpi.com/2072-6694/13/15/3696) — reuse `assets/reference/oral/lichen_planus.jpg` | CC BY 4.0 | in app |
| Apoptotic keratinocytes and satellitosis | Skin, acute GVHD, for comparison: apoptotic keratinocytes with adjacent lymphocytes (satellitosis) (H&E). | [Mark Ong, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Skin_graft_versus_host_disease_high_mag_1.jpg) — reuse `assets/reference/skin_inflammatory/gvhd_satellitosis_1.jpg` | CC BY-SA 4.0 | in app |
|  | Buccal mucosa, chronic GVHD: a dyskeratotic keratinocyte with melanin incontinence (H&E). | [Felemban et al., Cureus 2024, Fig 4B (cropped)](https://doi.org/10.7759/cureus.60147) | CC BY 4.0 | 375 × 237 |
| Basal vacuolar change | Skin, for comparison: vacuolar alteration of the basal layer (arrows) (H&E). | [Heldt Manica and Cohen, Cureus 2017, via Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Micrograph_of_vacuolar_interface_dermatitis.jpg) — reuse `assets/reference/skin_inflammatory/vacuolar_interface.jpg` | CC BY 3.0 | in app |
| Minor salivary glands | text only | | | |

#### `differential` — "Mimics" (new; 3 columns; 5 groups, 6 images)

| Group | Caption (draft) | Credit (links to source) | Licence | Size (px) |
| --- | --- | --- | --- | --- |
| CMV-related injury | CMV colitis: an enlarged cell with a viral inclusion (H&E). | [Nephron, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:CMV_colitis_-_high_mag_-_cropped.jpg) | CC BY-SA 3.0 | 1000 × 1500 |
|  | CMV immunohistochemistry: nuclear staining in infected cells (arrows), terminal ileum. | [Purg et al., Diagnostics 2024, Fig 1C (cropped)](https://doi.org/10.3390/diagnostics14232633) | CC BY 4.0 | 750 × 430 |
| Mycophenolate effect | Mycophenolate: increased apoptosis at the crypt bases (arrows) (H&E). | [Chaudhary et al., Cureus 2026, Fig 2d (cropped)](https://doi.org/10.7759/cureus.109482) | CC BY 4.0 | 250 × 240 |
|  | Mycophenolate: a dilated damaged crypt with flattened epithelium and luminal inflammatory cells (H&E). | [Chaudhary et al., Cureus 2026, Fig 2e (cropped)](https://doi.org/10.7759/cureus.109482) | CC BY 4.0 | 250 × 240 |
| Other drug effect | Checkpoint inhibitor colitis: increased intraepithelial lymphocytes and apoptosis (H&E). | [Angerer et al., Pathologie (Heidelb) 2026, Fig 1d (cropped)](https://doi.org/10.1007/s00292-025-01501-2) | CC BY 4.0 | 230 × 150 |
|  | Colchicine gastropathy: ring mitoses and apoptosis (H&E). | [Angerer et al., Pathologie (Heidelb) 2026, Fig 1b (cropped)](https://doi.org/10.1007/s00292-025-01501-2) | CC BY 4.0 | 230 × 150 |
| Other infection | text only | | | |
| Conditioning effect | text only | | | |

## Card 2 — Lymph node: cells (`lymphoma_node`)

One group per `cytology` option. The large-cell image comes from a diffuse large B-cell lymphoma of the
small intestine, and its caption names the site.

#### `cytology` — "Cells" (new; 4 columns; 13 groups, 16 images)

| Group | Caption (draft) | Credit (links to source) | Licence | Size (px) |
| --- | --- | --- | --- | --- |
| Centrocytes and centroblasts | Follicular lymphoma: a centrocyte, a centroblast and a follicular dendritic cell, labelled (H&E). | [Mikael Häggström, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Centrocyte,_centroblast_and_follicular_dendritic_cell_in_a_follicular_lymphoma.jpg) | CC0 1.0 | 427 × 301 |
| Irregular, cleaved nuclei | Mantle cell lymphoma: medium-sized cells with irregular nuclear contours and a pink histiocyte (H&E). | [Gabriel Caponetti, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Nodular_Mantle_Cell_Lymphoma_-_high_power_view_-_by_Gabriel_Caponetti.jpg) | CC BY-SA 3.0 | 1280 × 960 |
| Round nuclei with clumped chromatin | Chronic lymphocytic leukaemia/small lymphocytic lymphoma: small round nuclei with clumped chromatin and a proliferation centre (H&E). | [Sander et al., Virchows Arch 2023, Fig 2B (cropped)](https://doi.org/10.1007/s00428-022-03460-y) | CC BY 4.0 | 375 × 280 |
| Vesicular nuclei with prominent nucleoli | Diffuse large B-cell lymphoma (small intestine): large cells with vesicular nuclei and prominent nucleoli (H&E). | [CoRus13, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Diffuse_large_B-cell_lymphoma_of_the_small_intestine,_very_high_mag.2.jpg) | CC BY-SA 4.0 | 4272 × 2848 |
| Blastoid chromatin | High-grade B-cell lymphoma, NOS: medium-sized cells with round nuclei and finely dispersed chromatin (H&E). | [Anagnostopoulos et al., Cancers 2026, Fig 7A, full figure](https://doi.org/10.3390/cancers18040579) | CC BY 4.0 | 716 × 472 |
| Plasmacytoid differentiation | text only | | | |
| Monocytoid cells with pale cytoplasm | Nodal marginal zone lymphoma: cells with abundant pale cytoplasm in a nodular pattern (H&E). | [Laurent et al., Virchows Arch 2023, Fig 5B (cropped)](https://doi.org/10.1007/s00428-022-03432-2) | CC BY 4.0 | 338 × 191 |
| Clear cytoplasm | Nodal TFH-cell lymphoma, angioimmunoblastic-type: atypical clear cells with small lymphocytes and histiocytes (H&E). | [Ondrejka et al., Virchows Arch 2023, Fig 4B (cropped)](https://doi.org/10.1007/s00428-023-03607-5) | CC BY 4.0 | 235 × 235 |
| Hodgkin and Reed-Sternberg cells | Mixed cellularity classic Hodgkin lymphoma: a classic Hodgkin and Reed-Sternberg cell (H&E). | [Satou et al., Cancers 2022, Fig 3B (cropped)](https://doi.org/10.3390/cancers14112647) | CC BY 4.0 | 385 × 290 |
|  | A binucleate Reed-Sternberg cell (H&E). | [Ed Uthman, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Hodgkin_Disease,_Reed-Sternberg_Cell.jpg) | CC BY-SA 2.0 | 1577 × 1293 |
| Lacunar cells | Nodular sclerosis: lacunar cells with abundant clear cytoplasm (H&E). | [Satou et al., Cancers 2022, Fig 2B (cropped)](https://doi.org/10.3390/cancers14112647) | CC BY 4.0 | 253 × 199 |
|  | A lacunar cell: a Reed-Sternberg cell with a space around it (H&E). | [Mark Ong, Wikimedia Commons, cropped](https://commons.wikimedia.org/wiki/File:CHL_lacunar_cell_x40.jpg) | CC BY-SA 4.0 | 520 × 390 crop |
| Mummified cells | A mummified (apoptotic) Hodgkin cell (H&E). | [Mark Ong, Wikimedia Commons, cropped](https://commons.wikimedia.org/wiki/File:CHL_mummified_cell_x40.jpg) | CC BY-SA 4.0 | 520 × 390 crop |
| LP (popcorn) cells | Nodular lymphocyte predominant Hodgkin lymphoma: an LP (popcorn) cell (H&E). | [Nephron, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Popcorn_cell_in_nodular_lymphocyte_predominant_Hodgkin_lymphoma_-_very_high_mag_cropped.jpg) | CC BY-SA 3.0 | 1595 × 1160 |
|  | LP cells among small lymphocytes and histiocytes in a nodule (H&E). | [Satou et al., Cancers 2022, Fig 6B (cropped)](https://doi.org/10.3390/cancers14112647) | CC BY 4.0 | 247 × 280 |
| Hallmark cells | Anaplastic large cell lymphoma: large pleomorphic cells including hallmark cells (H&E). | [Nephron, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Anaplastic_large_cell_lymphoma_-_cropped_-_very_high_mag.jpg) | CC BY-SA 3.0 | 1800 × 1440 |
|  | ALK-positive anaplastic large cell lymphoma: abundant pale to eosinophilic cytoplasm and oval to indented nuclei (H&E). | [Braye and de Leval, J Hematop 2025, Fig 1G (cropped)](https://doi.org/10.1007/s12308-025-00672-4) | CC BY 4.0 | 225 × 150 |

## Card 3 — Lymph node: staining patterns and EBER (`lymphoma_node`)

`panel` has 43 stains, so its groups are organised by question rather than by stain. The `eber` groups match
the field's three results.

#### `panel` — "Staining patterns" (new; 3 columns; 11 groups, 23 images)

| Group | Caption (draft) | Credit (links to source) | Licence | Size (px) |
| --- | --- | --- | --- | --- |
| BCL2 in follicles | Follicular lymphoma: BCL2 in the neoplastic follicles. | [Nephron, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Follicluar_lymphoma_-_bcl2_--_low_mag.jpg) | CC BY-SA 3.0 | 4272 × 2848 |
|  | BCL2 control tissue: germinal centres negative, mantle and interfollicular cells positive. | [Nephron, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Follicular_lymphoma_-_control_bcl2_--_low_mag.jpg) | CC BY-SA 3.0 | 4272 × 2848 |
| Ki-67 in follicles | Follicular lymphoma: few Ki-67 (MIB-1) positive cells in a neoplastic follicle (red chromogen). | [Patho, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Follicular_lymphoma,_Mib1.jpg) | CC BY-SA 3.0 | 1920 × 1280 |
|  | Reactive follicular hyperplasia: many Ki-67 (MIB-1) positive cells in the germinal centre (red chromogen). | [Patho, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Follicular_lymphatic_hyperplasia,_Mib-1.jpg) | CC BY-SA 3.0 | 1920 × 1280 |
| Cell of origin (Hans) | Diffuse large B-cell lymphoma, germinal centre type: CD20, CD10 and BCL6 positive, MUM1 negative. | [Furlan Silva Fabri et al., Cureus 2026, Fig 7, full figure](https://doi.org/10.7759/cureus.111802) | CC BY 4.0 | 750 × 563 |
| MYC, Ki-67 and BCL2 in Burkitt lymphoma | Burkitt lymphoma: MYC in the tumour cells. | [Anagnostopoulos et al., Cancers 2026, Fig 2F (cropped)](https://doi.org/10.3390/cancers18040579) | CC BY 4.0 | 690 × 560 |
|  | Burkitt lymphoma: Ki-67 close to 100%. | [Anagnostopoulos et al., Cancers 2026, Fig 2G (cropped)](https://doi.org/10.3390/cancers18040579) | CC BY 4.0 | 690 × 520 |
|  | Burkitt lymphoma: BCL2 not expressed by the tumour cells. | [Anagnostopoulos et al., Cancers 2026, Fig 2I (cropped)](https://doi.org/10.3390/cancers18040579) | CC BY 4.0 | 650 × 540 |
| Cyclin D1 | Mantle cell lymphoma: cyclin D1 in a mantle zone pattern around a germinal centre. | [Sander et al., Virchows Arch 2023, Fig 7A (cropped)](https://doi.org/10.1007/s00428-022-03460-y) | CC BY 4.0 | 646 × 430 |
| Hodgkin and Reed-Sternberg cells | Classic Hodgkin lymphoma: CD30 in the Hodgkin and Reed-Sternberg cells. | [Satou et al., Cancers 2022, Fig 1B (cropped)](https://doi.org/10.3390/cancers14112647) | CC BY 4.0 | 256 × 290 |
|  | Classic Hodgkin lymphoma: CD15 in the Hodgkin and Reed-Sternberg cells. | [Gloghini et al., Cancers 2026, Fig 1, CD15 panel (cropped)](https://doi.org/10.3390/cancers18091446) | CC BY 4.0 | 240 × 250 |
|  | Classic Hodgkin lymphoma: PAX5 in the larger Hodgkin cells, weaker than in the small B cells. | [Mark Ong, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:PAX5_immunohistochemistry_in_relapsed_classical_Hodgkin%27s_lymphoma.jpg) | CC BY-SA 4.0 | 1600 × 1200 |
| Nodular lymphocyte predominant Hodgkin lymphoma | CD20 in the LP cells. | [Satou et al., Cancers 2022, Fig 6C (cropped)](https://doi.org/10.3390/cancers14112647) | CC BY 4.0 | 247 × 280 |
|  | CD21 shows the follicular dendritic cell meshwork within the nodules. | [Satou et al., Cancers 2022, Fig 6E (cropped)](https://doi.org/10.3390/cancers14112647) | CC BY 4.0 | 247 × 280 |
| Anaplastic large cell lymphoma | ALK-positive anaplastic large cell lymphoma: strong, diffuse CD30 in the large atypical cells. | [Braye and de Leval, J Hematop 2025, Fig 1E (cropped)](https://doi.org/10.1007/s12308-025-00672-4) | CC BY 4.0 | 225 × 150 |
|  | ALK-positive anaplastic large cell lymphoma: nuclear and cytoplasmic ALK. | [Braye and de Leval, J Hematop 2025, Fig 1F (cropped)](https://doi.org/10.1007/s12308-025-00672-4) | CC BY 4.0 | 225 × 150 |
| TFH lymphoma | Nodal TFH-cell lymphoma, angioimmunoblastic-type, core biopsy: CD23 shows a diffuse, dense follicular dendritic cell meshwork. | [Ondrejka et al., Adv Anat Pathol 2025, Fig 14C (cropped)](https://doi.org/10.1097/PAP.0000000000000492) | CC BY 4.0 | 236 × 165 |
|  | Nodal TFH-cell lymphoma, angioimmunoblastic-type: ICOS-positive atypical cells rim a germinal centre. | [Ondrejka et al., Adv Anat Pathol 2025, Fig 4D (cropped)](https://doi.org/10.1097/PAP.0000000000000492) | CC BY 4.0 | 236 × 165 |
|  | Nodal TFH-cell lymphoma, angioimmunoblastic-type: extensive PD-1 expression in the infiltrate. | [Ondrejka et al., Virchows Arch 2023, Fig 4C, PD-1 panel (cropped)](https://doi.org/10.1007/s00428-023-03607-5) | CC BY 4.0 | 235 × 120 |
| TdT | T-lymphoblastic lymphoma in a lymph node: uniform nuclear TdT. | [Chaudhary et al., J Hematop 2025, Fig 2B (cropped)](https://doi.org/10.1007/s12308-025-00674-2) | CC BY 4.0 | 375 × 198 |
|  | T-lymphoblastic lymphoma in a lymph node: CD3. | [Chaudhary et al., J Hematop 2025, Fig 2C (cropped)](https://doi.org/10.1007/s12308-025-00674-2) | CC BY 4.0 | 375 × 198 |
| Kikuchi-Fujimoto disease | Kikuchi-Fujimoto disease: CD123-positive plasmacytoid dendritic cells at the edge of the necrosis. | [Rieck et al., J Hematop 2026, Fig 3b (cropped)](https://doi.org/10.1007/s12308-026-00709-2) | CC BY 4.0 | 355 × 200 |
|  | Kikuchi-Fujimoto disease: CD68-positive macrophages in the necrosis. | [Rieck et al., J Hematop 2026, Fig 3g (cropped)](https://doi.org/10.1007/s12308-026-00709-2) | CC BY 4.0 | 355 × 200 |

#### `eber` — "EBER in situ hybridisation" (new; 3 columns; 3 groups, 3 images)

| Group | Caption (draft) | Credit (links to source) | Licence | Size (px) |
| --- | --- | --- | --- | --- |
| Positive in the atypical cells | Mixed cellularity classic Hodgkin lymphoma: EBER in the Hodgkin and Reed-Sternberg cells. | [Satou et al., Cancers 2022, Fig 3D (cropped)](https://doi.org/10.3390/cancers14112647) | CC BY 4.0 | 385 × 290 |
|  | EBV-positive Burkitt lymphoma: EBER in all tumour cells. | [Anagnostopoulos et al., Cancers 2026, Fig 2H (cropped)](https://doi.org/10.3390/cancers18040579) | CC BY 4.0 | 690 × 520 |
| Scattered positive background cells | text only | | | |
| Negative | Nodular sclerosis classic Hodgkin lymphoma: EBER negative. | [Satou et al., Cancers 2022, Fig 2C (cropped)](https://doi.org/10.3390/cancers14112647) | CC BY 4.0 | 253 × 199 |

## Card 4 — Lymph node: growth patterns and other features (`lymphoma_node`)

One group per option on both fields. The necrosis and karyorrhectic debris images come from Kikuchi-Fujimoto
disease, a necrotising lymphadenitis rather than a lymphoma, and their captions name it.

#### `pattern` — "Growth patterns" (new; 4 columns; 7 groups, 7 images)

| Group | Caption (draft) | Credit (links to source) | Licence | Size (px) |
| --- | --- | --- | --- | --- |
| Diffuse | High-grade B-cell lymphoma with 11q aberrations: diffuse sheets of medium-sized blastic cells with a starry sky (H&E). | [Anagnostopoulos et al., Cancers 2026, Fig 5A, full figure](https://doi.org/10.3390/cancers18040579) | CC BY 4.0 | 737 × 485 |
| Follicular / nodular | Follicular lymphoma: crowded follicles throughout the node (H&E). | [Nephron, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Follicular_lymphoma_--_very_low_mag.jpg) | CC BY-SA 3.0 | 4272 × 2848 |
| Follicular and diffuse | text only | | | |
| Nodular with fibrous bands | Nodular sclerosis classic Hodgkin lymphoma: thick collagen bands dividing the node into nodules (H&E). | [Laskar et al., Cureus 2025, Fig 5, full figure](https://doi.org/10.7759/cureus.98152) | CC BY 4.0 | 750 × 559 |
| Interfollicular | text only | | | |
| Paracortical | Reactive node: hyperplastic follicles separated by an expanded paracortex with histiocytic aggregates (H&E). | [Ondrejka et al., Adv Anat Pathol 2025, Fig 1B (cropped)](https://doi.org/10.1097/PAP.0000000000000492) | CC BY 4.0 | 235 × 290 |
|  | Dermatopathic lymphadenopathy: pale, expanded paracortex with histiocytes and melanin (H&E). | [Nephron, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Dermatopathic_lymphadenopathy_-_intermed_mag.jpg) | CC BY-SA 3.0 | 2848 × 4272 |
| Sinusoidal | Intrasinusoidal ALK-positive anaplastic large cell lymphoma: a sinus distended by atypical cells (H&E). | [Braye and de Leval, J Hematop 2025, Fig 1D (cropped)](https://doi.org/10.1007/s12308-025-00672-4) | CC BY 4.0 | 225 × 150 |
|  | ALK highlights tumour cell aggregates moulding the sinuses (panoramic view). | [Braye and de Leval, J Hematop 2025, Fig 1C (cropped)](https://doi.org/10.1007/s12308-025-00672-4) | CC BY 4.0 | 225 × 150 |

#### `features` — "Other features" (new; 4 columns; 11 groups, 12 images)

| Group | Caption (draft) | Credit (links to source) | Licence | Size (px) |
| --- | --- | --- | --- | --- |
| Necrosis | Kikuchi-Fujimoto disease: subcapsular necrosis (asterisks) (H&E). | [Rieck et al., J Hematop 2026, Fig 2b (cropped)](https://doi.org/10.1007/s12308-026-00709-2) | CC BY 4.0 | 340 × 230 |
| Sclerosis | Nodular sclerosis: thickened capsule and nodules surrounded by collagen bands (H&E). | [Satou et al., Cancers 2022, Fig 2A (cropped)](https://doi.org/10.3390/cancers14112647) | CC BY 4.0 | 253 × 199 |
| Frequent mitoses | Diffuse large B-cell lymphoma: frequent mitoses, including atypical forms (arrows) (H&E). | [Furlan Silva Fabri et al., Cureus 2026, Fig 6, full figure](https://doi.org/10.7759/cureus.111802) | CC BY 4.0 | 750 × 561 |
| Starry-sky pattern | Burkitt lymphoma: starry-sky pattern at low power (H&E). | [Anagnostopoulos et al., Cancers 2026, Fig 2A (cropped)](https://doi.org/10.3390/cancers18040579) | CC BY 4.0 | 690 × 560 |
|  | Burkitt lymphoma: tingible body macrophages among monotonous medium-sized cells (H&E). | [Ed Uthman, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Burkitt_lymphoma,_H%26E.jpg) | CC BY 2.0 | 1024 × 768 |
| Back-to-back follicles | Follicular lymphoma: back-to-back follicles with little tissue between them (H&E). | [Nephron, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Follicular_lymphoma_--_low_mag.jpg) | CC BY-SA 3.0 | 4272 × 2848 |
| Attenuated mantle zones | Nodal TFH-cell lymphoma, angioimmunoblastic-type (pattern 1): large germinal centres with attenuated mantle zones (H&E). | [Ondrejka et al., Adv Anat Pathol 2025, Fig 4A (cropped)](https://doi.org/10.1097/PAP.0000000000000492) | CC BY 4.0 | 236 × 165 |
| Absent tingible body macrophages | Follicular lymphoma: monotonous follicle centre cells without tingible body macrophages (H&E). | [Nephron, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Follicular_lymphoma_--_high_mag.jpg) | CC BY-SA 3.0 | 4272 × 2848 |
|  | A tingible body macrophage with engulfed apoptotic debris, for comparison. | [Arnold and Kahwash, Wikimedia Commons, full figure](https://commons.wikimedia.org/wiki/File:Tingible_body_macrophage.jpg) | CC BY 3.0 | 600 × 453 |
| Proliferated high endothelial venules | Nodal TFH-cell lymphoma, angioimmunoblastic-type, core biopsy: effaced architecture with increased vascularity (H&E). | [Ondrejka et al., Virchows Arch 2023, Fig 4A (cropped)](https://doi.org/10.1007/s00428-023-03607-5) | CC BY 4.0 | 470 × 235 |
| Residual reactive follicles | Intrasinusoidal ALK-positive anaplastic large cell lymphoma: preserved architecture with hyperplastic follicles (H&E). | [Braye and de Leval, J Hematop 2025, Fig 1A (cropped)](https://doi.org/10.1007/s12308-025-00672-4) | CC BY 4.0 | 225 × 150 |
| Capsular and perinodal extension | text only | | | |
| Karyorrhectic debris | Kikuchi-Fujimoto disease: karyorrhectic debris (nuclear dust) in the necrosis (H&E). | [Rieck et al., J Hematop 2026, Fig 2g (cropped)](https://doi.org/10.1007/s12308-026-00709-2) | CC BY 4.0 | 170 × 190 |

## Sources

Licences verified 2026-10-15. All journal figures are CC BY 4.0; the PMC article pages are at
`https://pmc.ncbi.nlm.nih.gov/articles/<PMCID>/`.

| Source (credit as printed) | Licence | Panels used | Fields | URL |
| --- | --- | --- | --- | --- |
| Anagnostopoulos et al., Cancers 2026 (PMC12938643) | CC BY 4.0 | Fig 5A, Fig 2A, Fig 7A, Fig 2F, Fig 2G, Fig 2I, Fig 2H | `cytology`, `eber`, `features`, `panel`, `pattern` | https://doi.org/10.3390/cancers18040579 |
| Angerer et al., Pathologie (Heidelb) 2026 (PMC12816097) | CC BY 4.0 | Fig 1d, Fig 1b | `differential` | https://doi.org/10.1007/s00292-025-01501-2 |
| Braye and de Leval, J Hematop 2025 (PMC12689821) | CC BY 4.0 | Fig 1D, Fig 1C, Fig 1A, Fig 1G, Fig 1E, Fig 1F | `cytology`, `features`, `panel`, `pattern` | https://doi.org/10.1007/s12308-025-00672-4 |
| Chaudhary et al., Cureus 2026 (PMC13285106) | CC BY 4.0 | Fig 2d, Fig 2e | `differential` | https://doi.org/10.7759/cureus.109482 |
| Chaudhary et al., J Hematop 2025 (PMC12701855) | CC BY 4.0 | Fig 2B, Fig 2C | `panel` | https://doi.org/10.1007/s12308-025-00674-2 |
| Felemban et al., Cureus 2024 (PMC11166251) | CC BY 4.0 | Fig 4A, Fig 4B | `oralFeatures` | https://doi.org/10.7759/cureus.60147 |
| Furlan Silva Fabri et al., Cureus 2026 (PMC13420299) | CC BY 4.0 | Fig 6, Fig 7 | `features`, `panel` | https://doi.org/10.7759/cureus.111802 |
| Gloghini et al., Cancers 2026 (PMC13162904) | CC BY 4.0 | Fig 1 (CD15 panel) | `panel` | https://doi.org/10.3390/cancers18091446 |
| Hippe et al., Virchows Arch 2023 (PMC10326090) | CC BY 4.0 | Fig 1A, Fig 1B, Fig 1C, Fig 1D, Fig 1E | `apoptosis` | https://doi.org/10.1007/s00428-023-03544-3 |
| Kuş Öztürk et al., Turk J Gastroenterol 2023 (PMC10334676) | CC BY 4.0 | Fig 1A, Fig 1B, Fig 1C, Fig 1D | `grade` | https://doi.org/10.5152/tjg.2023.22012 |
| Laskar et al., Cureus 2025 (PMC12752721) | CC BY 4.0 | Fig 5 | `pattern` | https://doi.org/10.7759/cureus.98152 |
| Laurent et al., Virchows Arch 2023 (PMC9852150) | CC BY 4.0 | Fig 5B | `cytology` | https://doi.org/10.1007/s00428-022-03432-2 |
| Ondrejka et al., Adv Anat Pathol 2025 (PMC11974631) | CC BY 4.0 | Fig 1B, Fig 4A, Fig 14C, Fig 4D | `features`, `panel`, `pattern` | https://doi.org/10.1097/PAP.0000000000000492 |
| Ondrejka et al., Virchows Arch 2023 (PMC10541838) | CC BY 4.0 | Fig 4A, Fig 4B, Fig 4C (PD-1 panel) | `cytology`, `features`, `panel` | https://doi.org/10.1007/s00428-023-03607-5 |
| Purg et al., Diagnostics 2024 (PMC11640633) | CC BY 4.0 | Fig 1C | `differential` | https://doi.org/10.3390/diagnostics14232633 |
| Rieck et al., J Hematop 2026 (PMC13234052) | CC BY 4.0 | Fig 2b, Fig 2g, Fig 3b, Fig 3g | `features`, `panel` | https://doi.org/10.1007/s12308-026-00709-2 |
| Sander et al., Virchows Arch 2023 (PMC9852142) | CC BY 4.0 | Fig 2B, Fig 7A | `cytology`, `panel` | https://doi.org/10.1007/s00428-022-03460-y |
| Satou et al., Cancers 2022 (PMC9179292) | CC BY 4.0 | Fig 2A, Fig 3B, Fig 2B, Fig 6B, Fig 1B, Fig 6C, Fig 6E, Fig 3D, Fig 2C | `cytology`, `eber`, `features`, `panel` | https://doi.org/10.3390/cancers14112647 |

| Commons author | Licence | Files | Fields |
| --- | --- | --- | --- |
| Arnold and Kahwash | CC BY 3.0 | Tingible body macrophage.jpg | `features` |
| CoRus13 | CC BY-SA 4.0 | Diffuse large B-cell lymphoma of the small intestine, very high mag.2.jpg | `cytology` |
| Ed Uthman | CC BY 2.0, CC BY-SA 2.0 | Burkitt lymphoma, H&E.jpg; Hodgkin Disease, Reed-Sternberg Cell.jpg | `cytology`, `features` |
| Gabriel Caponetti | CC BY-SA 3.0 | Nodular Mantle Cell Lymphoma - high power view - by Gabriel Caponetti.jpg | `cytology` |
| Mark Ong | CC BY-SA 4.0 | Apoptotic gastropathy high mag.jpg; CHL lacunar cell x40.jpg; CHL mummified cell x40.jpg; PAX5 immunohistochemistry in relapsed classical Hodgkin's lymphoma.jpg | `apoptosis`, `cytology`, `panel` |
| Mikael Häggström | CC0 1.0 | Histopathology Paneth cell metaplasia.jpg; Centrocyte, centroblast and follicular dendritic cell in a follicular lymphoma.jpg | `apoptosis`, `cytology` |
| Nephron | CC BY-SA 3.0 | CMV colitis - high mag - cropped.jpg; Follicular lymphoma -- very low mag.jpg; Dermatopathic lymphadenopathy - intermed mag.jpg; Follicular lymphoma -- low mag.jpg; Follicular lymphoma -- high mag.jpg; Popcorn cell in nodular lymphocyte predominant Hodgkin lymphoma - very high mag cropped.jpg; Anaplastic large cell lymphoma - cropped - very high mag.jpg; Follicluar lymphoma - bcl2 -- low mag.jpg; Follicular lymphoma - control bcl2 -- low mag.jpg | `cytology`, `differential`, `features`, `panel`, `pattern` |
| Patho | CC BY-SA 3.0 | Follicular lymphoma, Mib1.jpg; Follicular lymphatic hyperplasia, Mib-1.jpg | `panel` |

## Backups

Checked and usable if a primary crop disappoints:

- GVHD: Zhang et al., Front Immunol 2025, Fig 2B (ileocaecal apoptosis; https://doi.org/10.3389/fimmu.2025.1610071);
  Mark Ong, "CMV colitis submucosa high mag" (Commons, CC BY-SA 4.0); Nephron, "Paneth cell metaplasia in the
  left colon -- high mag" (Commons, CC BY-SA 3.0); Ed Uthman, "Normal colonic mucosa" (Commons, CC BY-SA 2.0).
- Hodgkin: Gloghini et al. Fig 1, the other panels (EBER, LMP1, CD20, CD3 rosettes); Satou et al. Figs 4 and 5
  (lymphocyte-rich with PD-1 rosettes; lymphocyte-depleted); Mark Ong, a multinucleate Hodgkin and
  Reed-Sternberg cell at ×40 (Commons, CC BY-SA 4.0); KGH, "Hodgkin lymphoma (1) to (4)", mixed cellularity and CD30 on a lymph node biopsy
  (Commons, CC BY-SA 3.0; the author is only "assumed" by Commons, so these stay backups); Gabriel Caponetti,
  NLPHL high power (Commons, CC BY-SA 3.0); Eichenauer et al., Leukemia 2025, Fig 1 (NLPHL growth patterns A
  to F on CD20; https://doi.org/10.1038/s41375-025-02641-3).
- B-cell: Anagnostopoulos et al. Fig 2B to 2E and 2J (Burkitt high power, CD20, CD10, BCL6, weak MUM1); Sander
  et al. Fig 7C and 7D (centrocytic and blastoid mantle cell lymphoma; about 210 px); Tai et al., Cureus 2026,
  Figs 2 and 3 (Hans markers, MYC and BCL2; https://doi.org/10.7759/cureus.103667); Wen et al., Front Immunol
  2026, Fig 2 (EBV-positive DLBCL with EBER; https://doi.org/10.3389/fimmu.2026.1878880).
- T-cell: Ondrejka et al. 2025 Fig 8 (intrasinusoidal ALK-positive ALCL, CD30) and Fig 11 (PTCL, NOS); Marvin
  101, "Anaplastic Large Cell Lymphoma CD30" (Commons, CC BY-SA 4.0).
- For a later diagnosis gallery: Gong et al., Front Oncol 2026, Fig 1A (Castleman disease, onion-skin
  mantles; https://doi.org/10.3389/fonc.2026.1840675); Nephron's Castleman, Kikuchi, toxoplasmosis and
  dermatopathic series; 藤澤孝志, "Castleman micro1" (hyaline vascular, CC BY-SA 4.0); Mikael Häggström,
  reactive node and sinus histiocytosis (CC0); Calicut Medical College, tuberculous node with caseating
  granuloma (CC BY-SA 4.0).

## Excluded

- Yale Rosen's nodular sclerosis Hodgkin lymphoma series (Commons): lung parenchyma surrounds the nodules,
  so it is not a nodal image.
- Nephron's mantle cell lymphoma series (Commons): intestinal.
- Sameem Arif, "Non-classical Hodgkin's lymphoma" 1 and 2, and Lakshminarayanan et al., Cureus 2025: eyepiece
  photographs.
- "Castleman.jpg" (a CT scan) and the gross photographs (AFIP nodular sclerosis; "Malignant lymphoma, high
  grade B cell 1"): outside scope, and their public-domain labels fail the licence check.
- Hematology Reports 2022 nodular sclerosis view (PMC9680227, Fig 2): blurred.
- Small or schematic: Kreft et al., PLoS One 2021 (its grade labels also differ from the form's); Choi and
  Quintanilla-Martinez 2025; Rodriguez-Pinilla et al. 2024; Cruz Osorio et al. 2026; the Datta, Bellas and Yu
  grids; Kurshumliu's CD21 and CD23 diagrams; Art Anderson's high endothelial venules (a special stain);
  several small GVHD case figures (Ghimire 2026, Maffini 2016, Yoo 2026, Hagen 2025, Laxer 2026).
- Wrong entity: Li et al., Cureus 2024 (oral leukoplakia with dysplasia); Nguyen et al., IJMS 2024 (schematic
  with an inset reproduced from another paper); Fiorentini et al., IJMS 2025 (Sjögren grading); Nephron,
  "Chronic sialadenitis" (not GVHD).

## Gaps and caveats

- No openly licensed photograph was found for these groups, which stay text only: minor salivary glands,
  other infection and conditioning effect (GVHD); plasmacytoid differentiation; scattered EBER-positive
  background cells; the follicular and diffuse and interfollicular patterns; capsular and perinodal
  extension. No panel is proposed for `oesoFeatures`, as no open oesophageal GVHD image was found.
- Several journal panels crop small, about 170 to 260 px (Satou Fig 2; Laurent Fig 5; Chaudhary et al.,
  Cureus Fig 2; Angerer Fig 1; Braye and de Leval Fig 1; the Ondrejka figures; Rieck Fig 2g). They work as
  thumbnails and in the lightbox but are not high resolution, the same caveat as the prostate galleries.
- The EBER panel in Anagnostopoulos et al. reads like an H&E at thumbnail size, so it sits second to Satou's
  EBER-positive Hodgkin cells.
- The two Ki-67 images (User:Patho) use a red chromogen; the BCL2 pair (Nephron) uses brown DAB. Nephron's
  "control bcl2" is the on-slide control tissue, so its caption describes the staining and not the site.
- Several images are CC BY-SA, so the gallery carries share-alike credit lines; no gallery image is written
  into a report.

## Draft cards

Not on the roadmap. Card them with "card the galleries" (or a subset); the roadmap change is then rebuilt and
published as usual.

### Lymphoma and GVHD galleries — group note (user request 2026-10-15)
Group:      gallery cards for the two Phase 71 forms: (1) GVHD biopsy; (2) lymph node cells; (3) lymph node staining patterns and EBER; (4) lymph node growth patterns and other features.
Evidence:   n.a. — galleries for forms that shipped on 2026-10-14.
Status:     researched 2026-10-15; waits to be carded. Two batches under the cap of three: cards 1 to 3, then card 4.
Spec:       `docs/specs/lymphoma-gvhd-galleries.md`

### GVHD biopsy — reference galleries (user request 2026-10-15)   Size: M; Lymphoma and GVHD galleries (1 of 4)
Why:        the GVHD form has two text-only panels and no photographs, yet grade, crypt injury, oral change and the mimics are judged by eye.
Change:     photos on the `grade` panel (one per grade) and new panels on `apoptosis` ("Crypt injury"), `oralFeatures` ("Oral mucosa", salivary glands text only) and `differential` ("Mimics", other infection and conditioning text only). 19 new images in `assets/reference/gvhd_biopsy/`; 3 reused from `oral/` and `skin_inflammatory/` with their credits.
Untouched:  GVHD fields, wording, Checks and fixtures; the `nih` panel; every other gallery.
Accept:     `tests/reference.test.js` passes for every new image (file, caption, credit, licence, URL; CC BY, CC BY-SA or CC0); each new panel has at least two illustrated groups; each new file is at most 150 kB; no golden fixture changes; nothing prints.
Verify:     tests + browser (light: open each panel and the lightbox)
Ship:       with batch
Depends on: none
Spec:       `docs/specs/lymphoma-gvhd-galleries.md`, card 1

### Lymph node for lymphoma — cell gallery (user request 2026-10-15)   Size: M; Lymphoma and GVHD galleries (2 of 4)
Why:        the 13 `cytology` choices are the morphology the diagnosis rests on, and none has a picture.
Change:     a new panel on `cytology` ("Cells") with one group per option (plasmacytoid differentiation text only). 16 images in `assets/reference/lymphoma_node/`.
Untouched:  lymphoma fields, wording, Checks and fixtures; every other gallery.
Accept:     as card 1.
Verify:     tests + browser (light)
Ship:       with batch
Depends on: none
Spec:       `docs/specs/lymphoma-gvhd-galleries.md`, card 2

### Lymph node for lymphoma — staining pattern and EBER galleries (user request 2026-10-15)   Size: M; Lymphoma and GVHD galleries (3 of 4)
Why:        stains are read as patterns (BCL2 in follicles, Ki-67 in follicles, cyclin D1 in the mantle, CD30, CD15 and PAX5 in Hodgkin cells, dendritic cell meshworks, TdT), not only as positive or negative.
Change:     new panels on `panel` ("Staining patterns", groups by question) and `eber` (one group per result; scattered positive background cells text only). 26 images in `assets/reference/lymphoma_node/`.
Untouched:  as card 2.
Accept:     as card 1.
Verify:     tests + browser (light)
Ship:       with batch
Depends on: none
Spec:       `docs/specs/lymphoma-gvhd-galleries.md`, card 3

### Lymph node for lymphoma — growth pattern and feature galleries (user request 2026-10-15)   Size: M; Lymphoma and GVHD galleries (4 of 4)
Why:        growth pattern and the other features are the low-power calls the form asks for first.
Change:     new panels on `pattern` ("Growth patterns"; follicular and diffuse and interfollicular text only) and `features` ("Other features"; capsular and perinodal extension text only). 19 images in `assets/reference/lymphoma_node/`.
Untouched:  as card 2.
Accept:     as card 1.
Verify:     tests + browser (light)
Ship:       with the next batch
Depends on: none
Spec:       `docs/specs/lymphoma-gvhd-galleries.md`, card 4

Later (one line, if wanted): Lymph node for lymphoma — diagnosis gallery on `dx`, built from the backups above.
