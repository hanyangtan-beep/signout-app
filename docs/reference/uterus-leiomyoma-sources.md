# Uterine leiomyoma assessment — sources (Phase 74, 23 October 2026)

Reference for the leiomyoma fields on the benign uterus form (`schemas/uterus_benign.json`, `generators/uterus.js`). Nothing here is printed: the report carries only what is seen.

## Types and changes

Source: [PathologyOutlines, leiomyoma](https://www.pathologyoutlines.com/topic/uterusleiomyoma.html).

- Types offered: usual; cellular; mitotically active; with bizarre nuclei; fumarate hydratase (FH) deficient; lipoleiomyoma; epithelioid; myxoid; apoplectic; hydropic; dissecting; diffuse leiomyomatosis; intravenous leiomyomatosis; STUMP. The page describes each except intravenous leiomyomatosis, which it mentions only as "intravenous extension" of a dissecting leiomyoma; no source is summarised here for it.
- Changes offered: hyaline degeneration; hydropic change; myxoid change; cystic degeneration; red degeneration; infarct-type necrosis; calcification. The page lists hyalinisation, cystic change and calcification without describing them, and does not use "red degeneration", which is kept as a house option (printed "red (haemorrhagic) degeneration"). Progestogen effect is not offered here.
- FH-deficient leiomyoma: the leiomyoma page names alveolar oedema, staghorn vessels and prominent eosinophilic nucleoli with perinucleolar halos. [PathologyOutlines, FH and 2SC](https://www.pathologyoutlines.com/topic/stainsFH2SC.html) describes FH loss as complete absence of staining in tumour cells, with vessels as the internal control, and 2SC as strong, diffuse cytoplasmic and nuclear staining; it links FH deficiency to hereditary leiomyomatosis and renal cell carcinoma (HLRCC). The printed comment's referral for genetic counselling is a house suggestion; the page does not state it.

## Necrosis, atypia and mitoses

- [Modern Pathology review](https://www.nature.com/articles/modpathol2015139): three types of necrosis in smooth muscle tumours — ulceration with underlying necrosis (submucosal), infarct-type (hyalinising) necrosis and coagulative tumour cell necrosis. In infarct-type necrosis, granulation tissue or hyalinisation separates necrotic from viable tumour; tumour cell necrosis shows an abrupt transition without it. The review also cautions that apoptotic and karyorrhectic cells can be mistaken for mitoses. The form records infarct-type necrosis as a change and coagulative tumour cell necrosis as its own field; infarct-type necrosis alone prints "Areas of infarct-type necrosis are present, with no coagulative tumour cell necrosis."
- Atypia: none, mild, focal moderate to severe, or diffuse moderate to severe.
- Mitoses are typed as written (per 10 HPF, or per mm²). The form prints the count and draws no threshold.

## STUMP

Source: [PathologyOutlines, STUMP](https://www.pathologyoutlines.com/topic/uterusstump.html): a smooth muscle tumour with features exceeding the criteria for leiomyoma (including subtypes) but insufficient for leiomyosarcoma. The page gives its scenarios with mitoses per mm² and per 10 HPF (field diameter 0.55 mm), and notes that early infarct-type necrosis can be hard to tell from coagulative necrosis.

- STUMP leads the diagnosis, the microscopy ends "The features are those of a smooth muscle tumour of uncertain malignant potential (STUMP); see comment." with no "There is no evidence of malignancy", and the comment suggests clinical follow-up.

## Datasets for the next cards

- Morcellated leiomyoma and uterine leiomyosarcoma (both in Next): [ICCR uterine malignant dataset](https://www.iccr-cancer.org/datasets/published-datasets/female-reproductive/uterine-malignant/), [RCPath G106 uterine sarcomas](https://www.rcpath.org/static/c146b1c0-0e0e-47a4-a6ab29b3230d69f8/G106-Dataset-for-histopathological-reporting-of-uterine-sarcomas.pdf), [QMH GYN-Sarcoma template](https://awiloqmh.github.io/CancerReportingTemplate/GYN-Sarcoma.html), [RCPath tissue pathways for gynaecological pathology](https://www.rcpath.org/static/94763195-0982-40ed-bbc79ca92370e9ac/Tissue-pathways-for-gynaecological-pathology.pdf).
