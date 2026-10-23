# Vulval carcinoma — reference gallery research (2026-10-23)

Researched on 2026-10-23 (user request: "card the vulval carcinoma template; do research on a reference gallery as well. ask me before you build") and built the same day as Phase 78, with the user's decisions below. The panels attach to fields of the `vulval_carcinoma` synoptic (Phase 77) through `field.reference` (schemas/README.md, "Field reference photos"). The gallery is the last card of the Vulval carcinoma group. "As built" records what shipped; the research sections after it stand as researched.

## Decisions (user, 2026-10-23)

1. Staging edition: AJCC version 9 with FIGO 2021, for the form and the node panel.
2. Images from other sites (penile, perianal, oral): left out, as not representative of the vulva. Where no vulval image was found, the group keeps its points and has no photograph.
3. The Bleeker et al. Fig 1 schematic: used, as the first image of the depth panel.
4. Ed Uthman's eyepiece series: not used. The user asked for other verrucous carcinoma images instead, and two vulval sources were added (Wang et al. 2021, Fig 1B; Bouquet de Jolinière et al. 2016, Fig 3E). A centre crop of the series remains possible.
5. The node criteria panel: kept, as text.
6. ExpertPath: the user asked for its reference images, through their login. ExpertPath is Elsevier's subscription content and the app is published at a public address, so the panels link the matching ExpertPath topics, which open with the reader's own login, and hold none of their images. ExpertPath has no vulva-specific verrucous carcinoma topic (the topic the user linked is the penile one), so the Dermatopathology "Verrucous Carcinoma (and Variants)" topic is linked.

## As built (Phase 78, 2026-10-23)

Eight panels on `vulval_carcinoma` (schema 2026.10b). Every photograph is of a vulval lesion. Captions and points never print.

| Panel | Field | Groups | Photographs (new + reused) | ExpertPath links |
|---|---|---|---|---|
| Vulval carcinoma types | `histType` | 6 | 10 (8 + 2) | 6 |
| Depth of invasion: three measurements | `doi` | 3 | 5 (5 + 0) | 0 |
| Tumour border | `growthPattern` | 2 | 4 (4 + 0) | 2 |
| Squamous precursors at a margin | `precursorMargin` | 3 | 6 (3 + 3) | 3 |
| Paget disease at a margin | `pagetMargin` | 1 | 1 (0 + 1) | 1 |
| Regional lymph nodes (AJCC version 9) | `nodeSampling` | 4 | 0 | 0 |
| p16 patterns | `p16` | 3 | 5 (4 + 1) | 0 |
| p53 patterns | `p53` | 6 | 7 (0 + 7) | 0 |

- 38 placements of 34 files: 22 new files in `assets/reference/vulval_carcinoma/` (24 placements) and 12 reused from `assets/reference/lower_genital/` (14 placements), with their cervical biopsy captions and credits. The cervical `p16_block_boundary.jpg` and `p16_block_hsil.jpg` are not used, as the p16 panel now has vulval images.
- Groups may carry `links` (schemas/README.md); the app lists them under the images and opens them in a new tab. 12 links reach 6 ExpertPath topics: [Squamous Cell Carcinoma (vulva)](https://app.expertpath.com/document/squamous-cell-carcinoma/8d70c2d4-901b-4a4e-9b70-056c239a810f), [Verrucous Carcinoma (and Variants)](https://app.expertpath.com/document/verrucous-carcinoma-and-variants/6d08105b-6c03-4352-83f6-2de3e1747543), [Basal Cell Carcinoma (vulva)](https://app.expertpath.com/document/basal-cell-carcinoma/788c2f11-4458-4652-b350-41d1936ad7f1), [Extramammary Paget Disease (vulva)](https://app.expertpath.com/document/extramammary-paget-disease/141d8db5-d433-4705-9d03-eb85f1f6f5ea), [Bartholin Gland Carcinoma](https://app.expertpath.com/document/bartholin-gland-carcinoma/6b739e6e-4b66-47f5-9530-36c922e524ef) and [Vulvar Intraepithelial Neoplasia](https://app.expertpath.com/document/vulvar-intraepithelial-neoplasia/6d9143d7-fd2d-4014-953c-8128277c2b55).
- Paget disease moves from the precursor panel to its own `pagetMargin` field, which the form reports separately.
- The p53 panel is the cervical biopsy one (the same points and images) under this form's option names.
- The depth captions quote the Bleeker et al. survey for each case, from the Fig 4 legend.
- Fix: the depth of invasion help now gives the FIGO 2021 wording, "from the basement membrane of the deepest adjacent dysplastic, tumour-free rete ridge (or the nearest dysplastic rete peg) to the deepest point of invasion"; Phase 77 had "dysplasia-free".
- Tests: the galleries test in `tests/vulval_carcinoma.test.js` and the links test in `tests/reference.test.js`; the browser QA opens every panel, waits for each photograph and checks that the printed report does not change.

### Changes from the research

- The stand-ins are gone: Hrudka et al. (penile), Philippou et al. (penile), Trøstrup and Matzen (perianal) and Johansson et al. (oral). HPV-associated carcinoma now shows Alsolami et al. 2026, Fig 1A (H&E) and Fig 1B (block-type p16); the pushing border shows Wang et al. 2021, Fig 1B and Bouquet de Jolinière et al. 2016, Fig 3E (vulval verrucous carcinoma); the node panel is text only.
- Alsolami et al. 2026 moves up from the backups: the publisher's full-size figure files (mdpi-res.com) made its panels usable, and Fig 1N (negative p16, HPV-independent carcinoma) and Fig 2B (block-type p16 in HSIL) join the p16 panel. The Thuijs, Klamminger and Kostov crops also come from the MDPI files, and the Wang, Peng and Nobile crops from the Frontiers figure files.
- Thuijs et al. 2024, Fig 3B (patchy p16 in vaVIN) joins the p16 panel.
- Samba et al. 2024 (adenoid cystic carcinoma) is left out: the form has no adenoid cystic carcinoma option, and the case report does not place the tumour in the Bartholin gland. The type panel has 6 groups, not 7.

### Sources (as built)

| Source | Licence | Panels used | Field |
|---|---|---|---|
| Alsolami et al., Cancers 2026. [PMC13204309](https://pmc.ncbi.nlm.nih.gov/articles/PMC13204309/) | CC BY 4.0 | Fig 1A, 1B, 1N; Fig 2B | `histType`, `p16` |
| Peng et al., Front Oncol 2025. [PMC12667435](https://pmc.ncbi.nlm.nih.gov/articles/PMC12667435/) | CC BY 4.0 | Fig 3B | `histType` |
| Wang et al., Front Oncol 2021. [PMC8193986](https://pmc.ncbi.nlm.nih.gov/articles/PMC8193986/) | CC BY 4.0 | Fig 1A, 1B | `histType`, `growthPattern` |
| Bouquet de Jolinière et al., Front Surg 2016. [PMC4749678](https://pmc.ncbi.nlm.nih.gov/articles/PMC4749678/) | CC BY 4.0 | Fig 3E | `growthPattern` |
| Asuman et al., Indian J Dermatol 2008. [PMC2763753](https://pmc.ncbi.nlm.nih.gov/articles/PMC2763753/) | CC BY 2.0 | Fig 2 | `histType` |
| Nobile et al., Front Oncol 2026. [PMC12864080](https://pmc.ncbi.nlm.nih.gov/articles/PMC12864080/) | CC BY 4.0 | Fig 3C | `histType` |
| Alessandrini et al., Diagn Pathol 2018. [PMC6389142](https://pmc.ncbi.nlm.nih.gov/articles/PMC6389142/) | CC BY 4.0 | Fig 1b | `histType` |
| Kostov et al., Cancers 2025. [PMC12691067](https://pmc.ncbi.nlm.nih.gov/articles/PMC12691067/) | CC BY 4.0 | Fig 1B | `histType` |
| Bleeker et al., Int J Gynecol Pathol 2024. [PMC11332368](https://pmc.ncbi.nlm.nih.gov/articles/PMC11332368/) | CC BY 4.0 | Fig 1; Fig 4A–D | `doi` |
| Klamminger et al., Cancers 2025. [PMC12109898](https://pmc.ncbi.nlm.nih.gov/articles/PMC12109898/) | CC BY 4.0 | Fig 1A, 1C | `growthPattern` |
| Thuijs et al., Cancers 2024. [PMC11640302](https://pmc.ncbi.nlm.nih.gov/articles/PMC11640302/) | CC BY 4.0 | Fig 3A, 3B, 3C | `precursorMargin`, `p16` |

## Research summary (as proposed, before the decisions)

| Panel | Field | New images | Reused | Groups |
|---|---|---|---|---|
| Histological type | `histType` | 9 | 2 | 7 |
| Depth of invasion | `doi` | 4 | 0 | 3 |
| Tumour growth pattern | `growthPattern` | 4 | 0 | 2 |
| Precursor lesions at the margins | `precursorMargin` | 2 | 5 | 4 |
| Regional lymph nodes | `nodes` | 5 | 0 | 4 |
| p16 and p53 | `p16`, `p53` | 0 | 10 | 3 and 6 |

- 24 new images from 14 open-access articles: 13 through PMC and 1 whose figure is hosted on Wikimedia Commons. All are CC BY 4.0 except Asuman et al. 2008, which is CC BY 2.0.
- 17 reused placements (14 distinct files) from `assets/reference/lower_genital/`, already credited in `schemas/cervical_biopsy.json`.
- Vulval sources cover type, depth of invasion, infiltrating pattern and precursors. Three parts use images from other sites because no open vulval image was found: HPV-associated carcinoma (penile), the pushing front (penile and perianal verrucous carcinoma) and lymph nodes (oral squamous cell carcinoma). Each caption names its site.

## Method

- Europe PMC searches restricted to `OPEN_ACCESS:y AND (LICENSE:"cc by" OR LICENSE:"cc0" OR LICENSE:"cc by-sa") AND HAS_FT:y`, covering type, depth of invasion, invasion pattern, precursor lesions, sentinel nodes, extranodal extension, margins, Bartholin gland, mammary-type, Paget disease and basal cell carcinoma. Figure legends were read from the full-text XML.
- Candidate figures were downloaded from the PMC open-access bucket, which confirmed CC BY for every article used. Licence statements were then checked in each article's XML. Every panel was viewed on a contact sheet against its legend.
- Wikimedia Commons API search, with licence, author and credit metadata. Commons rate-limited the first pass and was queried again slowly.
- MDPI blocks scripted downloads of its high-resolution figure files, as in earlier phases, so the PMC copies set the panel sizes.

## Build rules (as in earlier galleries)

- New files go in `assets/reference/vulval_carcinoma/`; reused files stay in `assets/reference/lower_genital/`.
- JPEG, 900 px or less, 150 kB or less. Crop to one panel and keep its scale bar and arrows. Never upscale.
- `license` must match `^CC(0| BY| BY-SA)` (tests/reference.test.js). Credits follow "Bleeker et al., Int J Gynecol Pathol 2024, Fig 4C (cropped)"; `url` is the PMC article or the Commons file page.
- Captions never print and follow "Feature: description (H&E)." Images from other sites name the site in the caption (penile, oral, perianal).
- No NC or ND licences, PathologyOutlines, textbooks, AI-generated images, eyepiece photographs or schematics. The one schematic candidate is listed under decisions.

## Panels

#### `histType` — "Histological type" (new; 3 columns; 7 groups, 11 images)

Groups follow the option labels (QMH WHO 5th edition list; CAP 5.1 adds "Bartholin gland carcinoma (specify subtype)").

1. Squamous cell carcinoma, HPV-associated. Points: warty or basaloid morphology is over-represented and the precursor is HSIL (CAP Vulva 5.1.0.0, subtype table); features that suggest HPV are warty or basaloid histology, koilocytic atypia, karyorrhexis and background HSIL (Alsolami et al. 2026); p16 is positive with diffuse, block-like staining (CAP). Images: Hrudka et al. 2026, Fig 4A (basaloid) and Fig 4B (warty), both penile.
2. Squamous cell carcinoma, HPV-independent. Points: keratinising morphology is over-represented in p53-mutant tumours, whose precursor is dVIN; verrucous morphology is over-represented in p53-wild-type tumours, whose precursors may include VAM / HPVi (p53wt) vaVIN, VAAD and DEVIL (CAP table); verrucous carcinoma falls under HPV-independent SCC, which often arises with lichen sclerosus and chronic inflammation (ICCR). Images: Peng et al. 2025, Fig 3B (keratinising nests with a fibromyxoid stromal reaction); reused `vulva_scc_keratinising.jpg`; Wang et al. 2021, Fig 1A (verrucous carcinoma of the vulva, low power).
3. Basal cell carcinoma, NOS. Image: Asuman et al. 2008, Fig 2 (clitoris and vulva: dermal basaloid masses, peripheral palisading, clefts).
4. Adenocarcinoma of mammary gland type (QMH: "of anogenital mammary-like glands"). Image: Nobile et al. 2026, Fig 3C (glandular tumour infiltrating the dermis).
5. Paget disease, extramammary. Images: reused `paget_he_vulva.jpg` (intraepithelial); Alessandrini et al. 2018, Fig 1B (stromal and lymphovascular invasion; small, about 280 px wide).
6. Adenoid cystic carcinoma. Image: Samba et al. 2024, Fig 1 (cribriform pattern with myxoid or hyalinised globules).
7. Bartholin gland carcinoma (specify subtype). Point: squamous cell carcinoma, adenoid cystic carcinoma and adenocarcinoma are the most common subtypes (Kostov et al. 2025). Image: Kostov et al. 2025, Fig 1B (squamous cell carcinoma of the Bartholin gland: anastomosing nests and cords).

CAP notes that "warty", "basaloid", "verrucous" and "papillary" are no longer needed as type terms, so these patterns appear as images inside the two squamous groups and not as options.

#### `doi` — "Depth of invasion" (new; 2 columns; 3 groups, 4 images)

All four images are panels of Bleeker et al. 2024, Fig 4: annotated H&E sections with the FIGO 2021 line in yellow, the FIGO 2009 (conventional) line in red and tumour thickness in blue. Captions name the colours.

1. FIGO 2021 (staging; AJCC version 9). Points: measured "from the basement membrane of the deepest, adjacent, dysplastic, tumor-free rete ridge (or nearest dysplastic rete peg) to the deepest point of invasion" (FIGO 2021); this method down-stages some conventional stage IB tumours to IA (CAP); where the deepest rete ridge lies deeper than the tumour, some measure from the most adjacent basement membrane, dysplastic or not (CAP); state when the depth is ambiguous (CAP). Images: Fig 4C and Fig 4D, where the yellow line runs obliquely from the nearest dysplastic epithelium.
2. Conventional (ancillary). Points: measured from the most superficial dermal papilla adjacent to the tumour to the deepest point of invasion; AJCC recommends it as an ancillary data point (CAP). Image: Fig 4A (red against yellow).
3. Tumour thickness (not staged). Points: measured from the tumour surface, or from the bottom of the granular layer when the surface is keratinised, to the deepest point of invasion; not a staging parameter and not a substitute for depth of invasion, because of exophytic growth (CAP). Image: Fig 4B (blue, red and yellow lines together).

#### `growthPattern` — "Tumour growth pattern" (new; 2 columns; 2 groups, 4 images)

Points (CAP): tumours separate into a predominantly infiltrating pattern and invasion with a broad, pushing front; related parameters are high tumour budding, spray-like infiltration and a prominent fibromyxoid response; as a group these features are understudied.

1. Pushing. Images: Philippou et al. 2019 (Wikimedia Commons), 20× panel (penile verrucous carcinoma with a broad-based front); Trøstrup and Matzen 2019, Fig 2A (perianal verrucous carcinoma, low power).
2. Infiltrating. Images: Klamminger et al. 2025, Fig 1A (tumour buds of 4 or fewer cells at the invasive front) and Fig 1C (poorly defined clusters of 5 or more cells in the stroma beside the front).

#### `precursorMargin` — "Precursor lesions at the margins" (reuse and new; 3 columns; 4 groups, 7 images)

Point (CAP): report margin status for precursor lesions and for Paget disease when present, even if invasive carcinoma involves the margin.

1. HSIL (usual-type VIN). Reused: `vulva_hsil_basaloid.jpg`, `p16_block_hsil.jpg`.
2. dVIN. Reused: `dvin_basal_atypia.jpg`, `p53_basal_dvin.jpg`.
3. VAM / HPVi (p53wt) vaVIN. Points: patchy (negative) p16 and wild-type p53 (Thuijs et al. 2024). Images: Thuijs et al. 2024, Fig 3A (H&E) and Fig 3C (wild-type p53).
4. Paget disease. Reused: `paget_he_vulva.jpg`.

#### `nodes` — "Regional lymph nodes" (new; 3 columns; 4 groups, 5 images)

All five images are panels of Johansson et al. 2026, Fig 1 (oral squamous cell carcinoma). Captions say "oral squamous cell carcinoma"; the points carry the vulval categories.

1. Isolated tumour cells: Fig 1A (H&E) and Fig 1B (keratin). Point: 0.2 mm or less, or single cells or clusters of 200 cells or fewer in one cross-section, staged pN0(i+) (CAP, AJCC version 9). ICCR writes "≤0.2 mm and ≤200 cells".
2. Micrometastasis: Fig 1C. Point: more than 0.2 mm and up to 2 mm, staged pN1mi.
3. Metastasis more than 2 mm: Fig 1D. Points: more than 2 mm and up to 5 mm is pN1a; more than 5 mm is pN1b.
4. Extranodal extension: Fig 1E. Points: extranodal extension is pN1c; fixed or ulcerated nodes are pN2; involved internal iliac, external iliac or common iliac nodes are distant metastases (CAP).

#### `p16`, `p53` — reuse (3 and 6 groups, 10 images; no new images)

Same groups and files as the `cervical_biopsy` p16 and p53 panels. The CAP p53 options map onto the Kortekaas et al. patterns already there.

## Sources (new images)

| Source | Licence | Panels used | Used for |
|---|---|---|---|
| Bleeker et al., Int J Gynecol Pathol 2024. [PMC11332368](https://pmc.ncbi.nlm.nih.gov/articles/PMC11332368/), doi:10.1097/PGP.0000000000001009 | CC BY 4.0 | Fig 4A–D | Depth of invasion |
| Hrudka et al., Front Oncol 2026. [PMC13437480](https://pmc.ncbi.nlm.nih.gov/articles/PMC13437480/), doi:10.3389/fonc.2026.1890741 | CC BY 4.0 | Fig 4A, 4B | HPV-associated SCC (penile) |
| Peng et al., Front Oncol 2025. [PMC12667435](https://pmc.ncbi.nlm.nih.gov/articles/PMC12667435/), doi:10.3389/fonc.2025.1662088 | CC BY 4.0 | Fig 3B | HPV-independent SCC |
| Wang et al., Front Oncol 2021. [PMC8193986](https://pmc.ncbi.nlm.nih.gov/articles/PMC8193986/), doi:10.3389/fonc.2021.598594 | CC BY 4.0 | Fig 1A | Verrucous carcinoma of the vulva |
| Asuman et al., Indian J Dermatol 2008. [PMC2763753](https://pmc.ncbi.nlm.nih.gov/articles/PMC2763753/), doi:10.4103/0019-5154.44795 | CC BY 2.0 | Fig 2 | Basal cell carcinoma |
| Nobile et al., Front Oncol 2026. [PMC12864080](https://pmc.ncbi.nlm.nih.gov/articles/PMC12864080/), doi:10.3389/fonc.2026.1716250 | CC BY 4.0 | Fig 3C | Mammary-type adenocarcinoma |
| Alessandrini et al., Diagn Pathol 2018. [PMC6389142](https://pmc.ncbi.nlm.nih.gov/articles/PMC6389142/), doi:10.1186/s13000-017-0680-x | CC BY 4.0 | Fig 1B | Paget disease with invasion |
| Samba et al., Cureus 2024. [PMC11008925](https://pmc.ncbi.nlm.nih.gov/articles/PMC11008925/), doi:10.7759/cureus.56048 | CC BY 4.0 | Fig 1 | Adenoid cystic carcinoma |
| Kostov et al., Cancers 2025. [PMC12691067](https://pmc.ncbi.nlm.nih.gov/articles/PMC12691067/), doi:10.3390/cancers17233819 | CC BY 4.0 | Fig 1B | Bartholin gland carcinoma |
| Philippou et al., Case Rep Urol 2019, doi:10.1155/2019/1537379, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Micrograph_of_penile_verrucous_carcinoma_-_20x_and_200x.jpg) | CC BY 4.0 | 20× panel | Pushing front (penile) |
| Trøstrup and Matzen, Int J Surg Case Rep 2019. [PMC6280022](https://pmc.ncbi.nlm.nih.gov/articles/PMC6280022/), doi:10.1016/j.ijscr.2018.11.017 | CC BY 4.0 | Fig 2A | Pushing front (perianal) |
| Klamminger et al., Cancers 2025. [PMC12109898](https://pmc.ncbi.nlm.nih.gov/articles/PMC12109898/), doi:10.3390/cancers17101718 | CC BY 4.0 | Fig 1A, 1C | Infiltrating front |
| Thuijs et al., Cancers 2024. [PMC11640302](https://pmc.ncbi.nlm.nih.gov/articles/PMC11640302/), doi:10.3390/cancers16233966 | CC BY 4.0 | Fig 3A, 3C | VAM / HPVi (p53wt) vaVIN |
| Johansson et al., Eur Arch Otorhinolaryngol 2026. [PMC13152956](https://pmc.ncbi.nlm.nih.gov/articles/PMC13152956/), doi:10.1007/s00405-026-10070-w | CC BY 4.0 | Fig 1A–E | Lymph node categories (oral) |

Criteria sources (points only, no images): [CAP Vulva 5.1.0.0](https://documents.cap.org/protocols/Vulva_5.1.0.0.REL_CAPCP.docx); [ICCR Carcinoma of the Vulva, 2nd edition v2.1](https://www.iccr-cancer.org/wp-content/uploads/2024/09/ICCR-Vulva-2nd-ed-v2.1-bookmarked.pdf); [FIGO 2021 vulval staging (Olawaiye et al., Int J Gynaecol Obstet 2021)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9290586/); [Alsolami et al., Cancers 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC13204309/) (CC BY 4.0).

## Backups

- Alsolami et al. 2026, Fig 1A, 1F, 1L and Fig 2I–K: vulval HPV-associated and HPV-independent carcinoma and vaVIN with p16 and p53. The PMC plates are 743 to 749 px for 11 to 14 panels, so each panel is about 215 px wide. Usable only if the publisher's file can be obtained.
- Janković et al., Dermatopathology 2026 ([PMC13214969](https://pmc.ncbi.nlm.nih.gov/articles/PMC13214969/), CC BY 4.0), Fig 1: cutaneous SCC sentinel nodes showing isolated tumour cells, micrometastasis and macrometastasis with keratin. Panels are about 230 px.
- Mikael Häggström, Wikimedia Commons, CC0: [isolated tumour cells in a pelvic node, H&E and AE1/AE3](https://commons.wikimedia.org/wiki/File:HE_histopathology_and_CK_AE1-AE3_immunohistochemistry_in_isolated_tumor_cells_(ITCs)_of_endometrial_adenocarcinoma_in_a_lymph_node_(original).jpg) (endometrial adenocarcinoma) and [extranodal extension with arrows](https://commons.wikimedia.org/wiki/File:Histopathology_of_a_lymph_node_with_metastatic_invasive_ductal_carcinoma_from_the_breast.jpg) (breast). Nephron, Wikimedia Commons, CC BY-SA 3.0: [breast carcinoma in a lymph node with extranodal extension](https://commons.wikimedia.org/wiki/File:Breast_carcinoma_in_a_lymph_node.jpg).
- Ed Uthman, Wikimedia Commons, CC BY 2.0: [Verrucous Carcinoma 4](https://commons.wikimedia.org/wiki/File:Verrucous_Carcinoma_4_(146950404).jpg) and the rest of its series (mons pubis, "pushing" invasion). These are eyepiece photographs with a circular field, excluded by the build rules unless a centre crop (about 610 × 460 px) is accepted.
- Philippou et al. 2019, 200× panel (pushing front at high power).
- Wang et al. 2021, Fig 1B; Bouquet de Jolinière et al., Front Surg 2016 ([PMC4749678](https://pmc.ncbi.nlm.nih.gov/articles/PMC4749678/), CC BY 4.0), Fig 3: vulval verrucous carcinoma, small panels.
- Aminimoghadam et al., Int J Surg Case Rep 2023 ([PMC10276133](https://pmc.ncbi.nlm.nih.gov/articles/PMC10276133/)), Fig 1, and Rudd et al., Cureus 2021 ([PMC8794399](https://pmc.ncbi.nlm.nih.gov/articles/PMC8794399/)), Fig 1: vulval basal cell carcinoma (CC BY 4.0).
- Sato et al., Cureus 2025 ([PMC12673286](https://pmc.ncbi.nlm.nih.gov/articles/PMC12673286/)), Fig 3B–C: adenoid cystic carcinoma of the Bartholin gland, small panels.
- Kostov et al. 2025, Fig 1A (infiltrative nests beside the Bartholin duct) and Fig 4 (Bartholin gland adenocarcinoma, strong colour cast).
- Nobile et al. 2026, Fig 3B (in situ component) and Fig 3D (widespread perineural invasion, if a perineural invasion panel is wanted).
- Peng et al. 2025, Fig 3C–D: dVIN beside carcinoma.
- Haddad et al., Einstein 2025 ([PMC12539858](https://pmc.ncbi.nlm.nih.gov/articles/PMC12539858/)), Fig 2: HPV-independent carcinoma, small and compressed.
- Petrică et al., Reports 2025 ([PMC12643405](https://pmc.ncbi.nlm.nih.gov/articles/PMC12643405/)), Fig 2a–b: warty carcinoma of the cervix with block p16.
- Markel et al., Gynecol Oncol Rep 2025 ([PMC12516504](https://pmc.ncbi.nlm.nih.gov/articles/PMC12516504/)), Fig 3: mammary-like adenocarcinoma, small panels.
- Bleeker et al. 2024, Fig 1: a drawn schematic of the three depth lines (CC BY 4.0). See decisions.

## Excluded

- Olawaiye et al., CA Cancer J Clin 2026 ([PMC13525161](https://pmc.ncbi.nlm.nih.gov/articles/PMC13525161/)), the AJCC version 9 vulva article. Its Figure 3 compares the two depth methods, but the licence is CC BY-NC-ND 4.0.
- Feng et al., Front Oncol 2025 ([PMC12270868](https://pmc.ncbi.nlm.nih.gov/articles/PMC12270868/)), Fig 1: an HPV-associated vulval "verrucous cancer". The high-power panel is basaloid and does not show verrucous carcinoma.
- Giant condyloma (Buschke–Löwenstein tumour) reports and clinical photographs: not verrucous carcinoma histology.
- Search hits from other organs without vulval relevance, and radiology or clinical figures.

## Gaps and caveats

- No open vulval photomicrograph of HPV-associated (basaloid or warty) carcinoma at gallery resolution was found. The penile panels stand in, labelled as penile.
- No open vulval node images were found. The oral SCC plate stands in, and the vulval thresholds sit in the points.
- No open photomicrograph of a measured vulval margin was found. The margin rows keep text criteria, and the precursor panel shows what may lie at a margin.
- Invasive Paget disease has one small panel (about 280 px).
- Lymphovascular and perineural invasion have no vulval panels proposed. Nobile et al. Fig 3D is a backup for perineural invasion.
- Several PMC copies give panels of 300 to 400 px. Nothing is upscaled.

## Decisions for the user (answered 2026-10-23; see Decisions above)

1. Images from other sites (penile basaloid and warty; penile and perianal verrucous pushing front; oral SCC nodes): accept them with site-named captions, or keep those groups text-only.
2. Bleeker et al. Fig 1 schematic for depth of invasion: earlier galleries rejected schematics.
3. Ed Uthman's vulval verrucous series: keep it excluded as eyepiece photographs, or allow a centre crop.

## Draft card

The roadmap card "Vulval carcinoma — reference galleries" (Vulval carcinoma group) used this brief as its spec; it was pulled by the user on 2026-10-23 and built as Phase 78. "As built" above gives the shipped panels, counts and sources.
