# Fallopian tube lesions and risk-reducing sampling — sources (Phase 74, 23 October 2026)

Reference for the benign tube and ovary form (`adnexa_benign`) and the tube lesions on the uterus form's tube and adnexa parts (`generators/_tube.js`). Nothing here is printed: the report carries only what is seen and what the stains show.

## Lesions

Source: [PathologyOutlines, serous tubal intraepithelial carcinoma](https://www.pathologyoutlines.com/topic/fallopiantubesstic.html).

| Option | What the source describes | How the form reads it |
|---|---|---|
| p53 signature | Histologically normal epithelium (at least 12 cells) with mutant-pattern p53 and a low MIB1 index, typically under 10% | Microscopy: no cytological abnormality, then the stains; diagnosis "p53 SIGNATURE"; closing "There is no evidence of STIC or invasive malignancy." |
| STIL | Abnormal histology with a high N/C ratio but preserved polarity, mutant p53 and a variable MIB1 index; uncertain significance, short of STIC | Diagnosis "SEROUS TUBAL INTRAEPITHELIAL LESION (STIL)"; same closing sentence |
| STIC | Confined to the epithelium, with significant atypia, architectural change, a high proliferative index and mutant-pattern p53 (diffuse, null or, less often, cytoplasmic) | Diagnosis "SEROUS TUBAL INTRAEPITHELIAL CARCINOMA (STIC)" with "see comment"; the multidisciplinary team comment prints; no closing negative |

- The source gives a suggested Ki-67 cut-off of 10% for STIC. The form records Low or Increased and prints no figure.
- The source states there is no consensus on managing an incidental STIC and gives no referral advice; the comment's suggestion of discussion at the gynaecological oncology multidisciplinary team meeting is a house suggestion.
- p53 options: Not performed, Wild-type, Aberrant – overexpression, Aberrant – null. The checks flag a lesion with no p53 result, a p53 signature with a wild-type pattern, aberrant p53 with no lesion ticked, and (on the tube and ovary form) a p53 signature with an increased Ki-67.

## Sampling

- PathologyOutlines (above): the infundibulum and fimbria (distal 2 cm) are amputated and sectioned longitudinally, and the isthmus and ampulla are cut transversely at 2–3 mm; for women with BRCA mutations or a strong family history the entire tube is submitted, with the fimbriated end extensively examined.
- [Wikipedia, SEE-FIM protocol](https://en.wikipedia.org/wiki/SEE-FIM_Protocol): the distal third is sectioned longitudinally and the remainder transversely at 1–2 mm, all submitted.
- [The oviduct and ovarian cancer (PMC3319355)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3319355/): its SEE-FIM section concerns prophylactic salpingo-oophorectomies from women with BRCA mutations or strong family histories.
- The form: a risk-reducing indication sets the sampling default to SEE-FIM, and a risk-reducing specimen not recorded as SEE-FIM gets an information check. A STIL or STIC in a representatively sampled tube also gets an information check. Neither prints.

## House wording (2021-2026 biopsy export, aggregate only)

- The p53 signature report: "Only scattered cells are positive for Ki67" (printed with the app's Ki-67 spelling) and "There is no evidence of STIC or invasive malignancy". Its "putative precursor" clause and consecutive-cell count are not printed.
- An unremarkable risk-reducing specimen: "There is no evidence of malignancy or serous tubal intraepithelial carcinoma (STIC)."; diagnosis closer "NO EVIDENCE OF MALIGNANCY OR STIC".
- Walthard rests: "Walthard rests are seen ..." in the microscopy; "WALTHARD CELL REST" in the diagnosis.
