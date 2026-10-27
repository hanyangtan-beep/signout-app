# Uterine leiomyoma assessment — sources (Phase 74, 23 October 2026; Phase 81, 27 October 2026)

Reference for the leiomyoma fields on the benign uterus form (`schemas/uterus_benign.json`, `generators/uterus.js`) and for the morcellated / hysteroscopic fibroid form (`schemas/uterus_morcellated.json`, `generators/uterus_morcellated.js`), which shares them. Apart from the bizarre nuclei caveat below, nothing here is printed: the report carries only what is seen.

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

## Morcellated and hysteroscopic specimens (Phase 81)

Source: [RCPath tissue pathways for gynaecological pathology](https://www.rcpath.org/static/94763195-0982-40ed-bbc79ca92370e9ac/Tissue-pathways-for-gynaecological-pathology.pdf) (version 3, February 2023).

- Section 7.1: morcellated specimens come in multiple pieces, among which endometrial, endocervical or serosal surfaces and fibroid fragments may be identified. Section 7.2.4: in a morcellated hysterectomy, sample the cervical, endometrial and serosal surfaces and any focal lesion. The form records myometrium, endometrium, cervix and serosa among the fragments; a morcellated supracervical hysterectomy opens with myometrium, endometrium and serosa ticked, and a check notes a hysterectomy with no endometrium recorded.
- Section 8.1: fragmented or morcellated specimens are measured in three dimensions and sliced, and any departure from a white, whorled cut surface is noted. Up to three representative blocks suffice in premenopausal women with no unusual history or imaging findings; any abnormality needs more extensive sampling, and the blocks should include the interface with normal myometrium where possible. The form prints the aggregate weight and size, the fragment size range, the cut surface and any fleshy area or necrosis; it opens on three blocks, and a check asks for more when a fleshy or necrotic area, or atypical features, are recorded with three blocks or fewer. RCPath gives the dimensions in millimetres; the form prints centimetres, as the house macroscopy does.
- Section 8.2: leiomyomas in these specimens are reported as at hysterectomy (section 7.3), so the form uses the uterus form's leiomyoma fields and wording. A leiomyoma with bizarre nuclei may not be diagnosable on a morcellated specimen: RCPath advises sampling more tissue, and a caveat that the lesion needs complete removal for a confident diagnosis. The form prints the caveat in the comment ("As the specimen is fragmented, the diagnosis of leiomyoma with bizarre nuclei can be made with confidence only if the lesion has been completely removed.") and the diagnosis reads "see comment".
- The fragmentation comment ("Fragmentation of the morcellated specimen precludes assessment of the tumour border and the serosa.") is a house snippet, automatic for a morcellated specimen and offered for a hysteroscopic one; neither source words it.
- Background: [Seidman et al., PLoS One 2012](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0050058). Of 1,091 uterine morcellations (2005–2010) for presumed fibroids, 1.2% held an unexpected leiomyoma variant or an atypical or malignant smooth muscle tumour, and unexpected leiomyosarcoma was found in 0.09%. The authors took one block per 1 cm of the lesion's radiological greatest dimension; the form does not adopt that rule, which is noted for the leiomyosarcoma card.

## Datasets for the next cards

- Uterine leiomyosarcoma (in Next): [ICCR uterine malignant dataset](https://www.iccr-cancer.org/datasets/published-datasets/female-reproductive/uterine-malignant/), [RCPath G106 uterine sarcomas](https://www.rcpath.org/static/c146b1c0-0e0e-47a4-a6ab29b3230d69f8/G106-Dataset-for-histopathological-reporting-of-uterine-sarcomas.pdf), [QMH GYN-Sarcoma template](https://awiloqmh.github.io/CancerReportingTemplate/GYN-Sarcoma.html); the RCPath tissue pathways are summarised above.
