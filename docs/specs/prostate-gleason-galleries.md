# Prostate biopsy — Gleason pattern reference galleries

Shipped 2026-09-14. Reference galleries on the prostate biopsy grading fields, using the same
`field.reference` mechanism as the gastric IM and endometrial carcinoma galleries: criteria bullets
under headings, an optional strip of photomicrographs under each heading, lazy-loaded, with a
lightbox on click. Images are never written into the report.

## Fields and galleries

Six fields carry `field.reference`, 94 photomicrographs in `assets/reference/prostate/`, ≤ 150 kB
JPEG each (8.2 MB total), 21 of the 22 criteria groups illustrated.

| Field | Groups (images) |
| --- | --- |
| `primary` / `secondary` | Pattern 3 (3), Pattern 4 (7), Pattern 5 (5), Borderline 3 vs 4 (6) — identical criteria and identical images on both fields, emitted twice so each field is self-contained |
| `tertiary5` | Minor pattern 5 on needle biopsy (2), Pattern 5 as a true secondary grade (4), The 5 % rule — resections only (0, text) |
| `cribriform` | ISUP definition (2), Large vs small cribriform (2), Not cribriform (4) |
| `idcp` | Essential criteria (7), vs invasive cribriform carcinoma (7), vs high grade PIN (6) |
| `category` | Benign (2), HGPIN (4), ASAP (2), Adenocarcinoma (4), Benign mimics of carcinoma (6) |

The Grade Group table is printed once at the top of the `primary` gallery only, so it is not
repeated on every field.

## Criteria text

`scripts/prostate_reference_text.py` holds the headings and bullets. They are the agent's summary of
the three consensus sources below and should be read critically; source URLs live in that file's
docstring and in code comments, never in printed report prose.

- Epstein JI, Egevad L, Amin MB, et al. The 2014 ISUP Consensus Conference on Gleason Grading.
  Am J Surg Pathol 2016;40:244-52. doi:10.1097/PAS.0000000000000530
- van Leenders GJLH, van der Kwast TH, Grignon DJ, et al. The 2019 ISUP Consensus Conference on
  Grading of Prostatic Carcinoma. Am J Surg Pathol 2020;44:e87-e99. doi:10.1097/PAS.0000000000001497
- Surintrspanont J, Zhou M. Prostate Pathology: What is New in the 2022 WHO Classification of
  Urinary and Male Genital Tumors? Pathologica 2023;115:41-56. doi:10.32074/1591-951X-822

## Pipeline

`gleason-refs/build_gallery.py` (research directory, not in the repo) holds every crop as source
file + panel grid fraction + caption + source key, trims white/black gutters, resizes to ≤ 1100 px
wide and ≤ 900 px tall, and compresses to ≤ 150 kB (dropping quality to 46, then shrinking rather
than degrading further). It writes `assets/reference/prostate/images.json`
(`{field, group, src, caption, credit, license, url}`), which `scripts/gen-prostate-reference.py`
merges into `schemas/prostate_biopsy.json` — asserting that every `group` matches an existing
heading, that the file exists, and that the licence is CC0 / CC BY / CC BY-SA and not NC or ND.
`tests/reference.test.js` re-checks file, caption, credit, licence, URL and the ≤ 150 kB budget for
every entry, that each of the six fields has ≥ 2 illustrated groups, and that `secondary` mirrors
`primary` exactly.

## Sources

Licences verified 2026-09-14 against the Wikimedia Commons API (`extmetadata`
`LicenseShortName` / `Artist`) and against the open-access statement printed on each PMC article.
Every figure panel was checked against its published legend before cropping; the panel letter is
cited in the credit (e.g. `Fig 3a (cropped)`).

| Source (credit as printed) | Licence | Used for | URL |
| --- | --- | --- | --- |
| Gordetsky & Epstein, Diagn Pathol 2016, via Wikimedia Commons (10 single-panel uploads of Figs 2–3) | CC BY 4.0 | 3+3=6 discrete glands; poorly formed, fused with vacuoles, glomeruloid, irregular cribriform, minor cribriform pattern 4; sheets, cords, single cells, comedonecrosis pattern 5 | https://doi.org/10.1186/s13000-016-0478-2 |
| Egevad et al., Virchows Arch 2020, Figs 3–5 (6 panel crops) | CC BY 4.0 | borderline 3+3 tangential vs 3+4 poorly formed / fused; 3+4 vs 4+3; 4+3 vs 4+4; dispersed cells and strands vs crush artefact; tadpole strands | https://doi.org/10.1007/s00428-020-02858-w |
| Destouni et al., Cancers 2022, Figs 1, 3, 4 (10) | CC BY 4.0 | benign cribriform mimics (tufting, basal cell hyperplasia, clear cell hyperplasia); IDC-P dense cribriform with 34βE12 and ERG; invasive cribriform merging with invasion, in periprostatic fat, 34βE12 negative | https://doi.org/10.3390/cancers14133041 |
| Compérat et al., Cancers 2024, Figs 1–2 (3) | CC BY 4.0 | cribriform definition at 100×; IDC-P H&E with AMACR/p63 double stain | https://doi.org/10.3390/cancers16112002 |
| Smith & Wobker, Cancers 2024, Figs 1, 2, 3, 6 (10) | CC BY 4.0 | tufted and flat HGPIN, HGPIN immunophenotype; florid HGPIN vs atypical intraductal proliferation with PTEN; clear cell cribriform hyperplasia and basal cell hyperplasia as IDC-P simulants | https://doi.org/10.3390/cancers16061097 |
| Surintrspanont & Zhou, Cancers 2023, Fig 2 (2) | CC BY 4.0 | IDC-P glands surrounded by invasive carcinoma, with p63 | https://doi.org/10.3390/cancers15225319 |
| Varma et al., Virchows Arch 2019, Fig 3 (2) | CC BY 4.0 | IDC-P with very patchy basal cells (H&E and CK5/6) | https://doi.org/10.1007/s00428-019-02544-6 |
| Cruz et al., J Bras Patol Med Lab 2016, via Wikimedia Commons (2 panel crops) | CC BY 4.0 | blue luminal mucin; double and marginated nucleoli | https://commons.wikimedia.org/wiki/File:Micrograph_of_histopathological_criteria_for_prostate_cancer.jpg |
| Mikael Häggström, Wikimedia Commons (6) | CC0 1.0 | normal prostate, atrophy, HGPIN, intraluminal crystalloid, seminal vesicle, circumferential perineural invasion | file pages linked under each image |
| Nephron, Wikimedia Commons (11) | CC BY-SA 3.0 (IDC-P low mag: CC BY-SA 4.0) | pattern 4 at low and intermediate power, pattern 4 with 5, adenosis, ASAP, Cowper glands, nephrogenic adenoma, intraductal carcinoma | file pages linked under each image |
| Librepath, Wikimedia Commons (1) | CC BY-SA 3.0 | basal cell hyperplasia | file page linked under the image |

## Gaps and caveats

- No licensed image shows pattern 3 branching glands as a named feature, and none shows atrophic or
  pseudohyperplastic pattern 3; both remain criteria text only.
- The 5 % rule group (tertiary pattern on resections) ships as text with no image.
- Crush artefact is covered only indirectly, by the Egevad Fig 5a/b borderline case whose legend
  raises crush artefact as a consideration.
- Large vs small cribriform is illustrated by a complex cribriform focus invading periprostatic fat
  and by a small cribriform focus in a 3+4 core. Two papers that address the size distinction
  directly (Kazan, PMC10652068; Okubo, PMC12508520) carry a `cc by` label in Europe PMC metadata
  only, with no publisher statement confirmed, so they were not used.
- Rejected on licence grounds: PMC11614181 (CC BY-NC-SA), PMC7380027 (unverified), the Commons file
  "Invasive cribriform prostate carcinoma.jpg" (sourced to Modern Pathology). Nothing was taken from
  Am J Surg Pathol, Modern Pathology, Human Pathology, Histopathology or PathologyOutlines.
- Several journal panels crop small (Smith Fig 3 panels land at ~250 px because the PMC composite is
  772 px wide). They are legible as thumbnails and in the lightbox but are not high resolution.
- Nephron and Librepath images are CC BY-SA, so the gallery as displayed carries share-alike credit
  lines; no CC BY-SA image is written into a report.
