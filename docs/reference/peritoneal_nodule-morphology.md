# Peritoneal nodule biopsy — morphology and immunohistochemistry sources

Grounding record for `schemas/peritoneal_nodule.json` and `generators/peritoneal_nodule.js` (Phase 58, roadmap card
"Peritoneal nodule biopsy", pulled by the user 2026-10-07). The wording here is a draft for curation, not report
text: the printed sentences are written by hand against the report-register rule in `docs/new-template-brief.md` §3.
No QMH CancerReportingTemplate page covers peritoneal biopsies (the QMH GYN-Ovary page is the ovary, tube and
peritoneum resection synoptic, already `ovary_ft_peritoneum`). CAP and ICCR publish no peritoneal nodule biopsy
protocol; the ICCR mesothelioma dataset covers mesothelioma only.

## Mesothelial lesions

### Reactive mesothelial hyperplasia

- "Reactive proliferation of mesothelial cells with no or minimal cytologic atypia and without invasion"; simple and
  florid forms ([PathologyOutlines, mesothelial hyperplasia (peritoneum)](https://www.pathologyoutlines.com/topic/pleuraperitmesothelialhyper.html)).
- Architecture: "solid sheets, nests, discrete small papillary or tubulopapillary growths, gland-like structures,
  cord-like linear arrays or single cells"; cells "small, regular, round or oval and exhibit central nucleoli";
  usually accompanied by inflammatory cells; psammoma bodies may be seen ([PathologyOutlines](https://www.pathologyoutlines.com/topic/pleuraperitmesothelialhyper.html)).
- Worrying reactive changes: "enlarged vesicular nuclei, multinucleation, conspicuous nucleoli and rare mitotic
  figures" ([PathologyOutlines](https://www.pathologyoutlines.com/topic/pleuraperitmesothelialhyper.html)).
- IHC: CK AE1/AE3, CK7, CK5/6, calretinin, WT1 and D2-40 positive; BAP1 and MTAP retained; CDKN2A intact by FISH
  ([PathologyOutlines](https://www.pathologyoutlines.com/topic/pleuraperitmesothelialhyper.html)).
- Features of mesothelioma rather than hyperplasia: diffuse involvement, infiltration of underlying tissue and at
  least moderate atypia ([PathologyOutlines](https://www.pathologyoutlines.com/topic/pleuraperitmesothelialhyper.html)).

### Well-differentiated papillary mesothelial tumour (WDPMT)

- The former "well-differentiated papillary mesothelioma" is renamed "well-differentiated papillary mesothelial
  tumor" ([IMIG guidelines, Arch Pathol Lab Med 2024](https://orca.cardiff.ac.uk/id/eprint/173721/1/i1543-2165-148-11-1251.pdf));
  ICD-O 9052/1, "considered distinct from mesothelioma" ([ICCR mesothelioma dataset, 3rd ed.](https://www.iccr-cancer.org/wp-content/uploads/2023/05/ICCR-Mesothelioma-3rd-ed-v3.1-bookmark.pdf)).
- "Branching plump papillae lined by a single layer of bland cuboidal cells"; minimal atypia; mitoses usually
  absent; cores may be myxoid, oedematous or fibrotic, with psammomatous calcification; "invasion of underlying
  pre-existing tissues is absent" ([PathologyOutlines, WDPMT (peritoneum)](https://www.pathologyoutlines.com/topic/peritoneumwelldiffpapillarymeso.html)).
- IHC: broad-spectrum keratin, calretinin, WT1 and D2-40 positive; CK5/6 ~90%; BAP1 retained; invasion, BAP1 loss
  or CDKN2A homozygous deletion precludes WDPMT ([PathologyOutlines](https://www.pathologyoutlines.com/topic/peritoneumwelldiffpapillarymeso.html)).

### Mesothelioma

- Terminology: "mesothelioma" rather than "malignant mesothelioma" ([IMIG 2024](https://orca.cardiff.ac.uk/id/eprint/173721/1/i1543-2165-148-11-1251.pdf)).
  Types epithelioid, sarcomatoid (including desmoplastic) and biphasic; in a small biopsy with no assignable type,
  "mesothelioma not otherwise specified (NOS)" ([ICCR](https://www.iccr-cancer.org/wp-content/uploads/2023/05/ICCR-Mesothelioma-3rd-ed-v3.1-bookmark.pdf)).
- Invasion is the key feature; it may involve only "a few layers of collagenous tissue"; entrapped reactive cells do
  not establish invasion ([IMIG 2024](https://orca.cardiff.ac.uk/id/eprint/173721/1/i1543-2165-148-11-1251.pdf));
  "invasion into adipose tissue or stromal invasion" indicates malignancy ([PathologyOutlines, peritoneal mesothelioma](https://www.pathologyoutlines.com/topic/pleuraperitmesotheliomageneral.html)).
- Epithelioid patterns: tubular, papillary and solid most common ([PathologyOutlines](https://www.pathologyoutlines.com/topic/pleuraperitmesotheliomageneral.html);
  [epithelioid](https://www.pathologyoutlines.com/topic/pleuraperitmesothelioma.html)).
- Panel: broad-spectrum keratin plus "2 mesothelial and 2 epithelial markers" — mesothelial calretinin, CK5/6,
  WT1, D2-40, HEG1; epithelial claudin-4, MOC-31, BerEP4 ([IMIG 2024](https://orca.cardiff.ac.uk/id/eprint/173721/1/i1543-2165-148-11-1251.pdf)).
- BAP1 (nuclear) or MTAP (cytoplasmic) loss, or CDKN2A homozygous deletion, is never found in benign mesothelium;
  peritoneal sensitivity BAP1 loss 60–70%, MTAP loss 5–10%, CDKN2A deletion 10–15%; interpret with a positive
  internal control ([IMIG 2024](https://orca.cardiff.ac.uk/id/eprint/173721/1/i1543-2165-148-11-1251.pdf)). The markers
  are useful "only when lost" ([ICCR](https://www.iccr-cancer.org/wp-content/uploads/2023/05/ICCR-Mesothelioma-3rd-ed-v3.1-bookmark.pdf)).
- Peritoneal epithelioid mesothelioma versus serous carcinoma: PAX8 0/40 versus 93%, claudin-4 0/40 versus 98%; ER
  usually absent in mesothelioma; recommended panel claudin-4 and PAX8 (or ER) with calretinin and thrombomodulin
  ([Mod Pathol, PAX8, PAX2, claudin-4 and h-caldesmon study](https://www.nature.com/articles/modpathol2012200)). PAX8 is positive in a minority of
  mesotheliomas ([PathologyOutlines, PAX8](https://www.pathologyoutlines.com/topic/stainspax8.html)); GATA3 is positive
  in many mesotheliomas ([PathologyOutlines, GATA3](https://www.pathologyoutlines.com/topic/stainsgata3.html)).

## Peritoneal loose body

- Unattached infarcted epiploic appendages are "peritoneal loose bodies or peritoneal mice"; histology "central
  infarcted adipose tissue with peripheral fat necrosis and calcification, surrounded by thick, inflamed fibrotic
  tissue" ([PathologyOutlines, infarcted epiploic appendages](https://www.pathologyoutlines.com/topic/coloninfarcted.html)).
- A "core of necrotic, calcified fat" laminated by "layers of acellular hyalinised fibrous tissue", from a "torted
  and infarcted epiploic appendage" ([CT diagnosis of a large peritoneal loose body, PMC3473474](https://pmc.ncbi.nlm.nih.gov/articles/PMC3473474/)).
- "Central zone of necrotic fatty tissue", "micro-calcifications" and an "outer densely laminated, hyalinised,
  acellular fibrous tissue" ([Indian J Pathol Oncol, free-floating peritoneal loose body](https://ijpo.co.in/archive/volume/12/issue/2/article/18491/pdf)).

## Müllerian and other inclusions

- Endometriosis: endometrial-type glands and stroma; at least two of glands, stroma or evidence of chronic
  haemorrhage (haemosiderin-laden or foamy macrophages); stroma CD10 positive; ER, PR and PAX2 often positive
  ([PathologyOutlines, endometriosis](https://www.pathologyoutlines.com/topic/ovarynontumorendometriosis.html)).
- Endosalpingiosis: "glands and tubules lined by low columnar or cuboidal cells, typically with cilia"; psammoma
  bodies may be present; WT1+, PAX8+, calretinin−; no endometrial stroma or haemorrhage ([PathologyOutlines, endosalpingiosis (peritoneum)](https://www.pathologyoutlines.com/topic/pleuraendosalpingiosis.html)).
- Deciduosis (ectopic decidua): "large polygonal cells with abundant eosinophilic cytoplasm, bland nuclei and
  visible nucleoli"; no glands; keratin, WT1 and calretinin negative; associated with pregnancy ([PathologyOutlines, ectopic decidual reaction](https://www.pathologyoutlines.com/topic/ovarynontumorectopicdecidual.html)).
- Splenosis: autotransplanted splenic tissue on the peritoneal surface after rupture or splenectomy; "red and white
  pulp, resembling accessory spleen" ([PathologyOutlines, splenosis](https://www.pathologyoutlines.com/topic/spleensplenectomy.html)).

## Fat necrosis, adhesion and granulomas

- Fat necrosis: anucleate adipocytes, lipid-laden foamy histiocytes and multinucleated foreign-body giant cells, with
  later fibrosis and calcification ([PathologyOutlines, fat necrosis](https://www.pathologyoutlines.com/topic/breastfatnecrosis.html)).
- Adhesions: "cellular fibrous connective tissue containing vessels and nerves; may contain fat and smooth muscle"
  ([PathologyOutlines, adhesions](https://www.pathologyoutlines.com/topic/colonadhesions.html)).
- Foreign-body reaction: epithelioid histiocytes and multinucleate giant cells around foreign material, some
  birefringent; suture is a cause ([PathologyOutlines, foreign body reaction](https://www.pathologyoutlines.com/topic/skinnontumorforeignbodyreaction.html)).
- Keratin granulomas: "eosinophilic laminated keratin deposits with ghost squamous cells" with foreign-body giant
  cells, associated with endometrioid carcinoma with squamous differentiation; usually without viable tumour cells
  ([peritoneal keratin granuloma case report, PMC3216880](https://pmc.ncbi.nlm.nih.gov/articles/PMC3216880/)).
- Granulomas: necrotising (usually infective) versus non-necrotising; AFB stains for mycobacteria and GMS/PAS for
  fungi, with culture ([PathologyOutlines, granulomatous inflammation](https://www.pathologyoutlines.com/topic/lymphnodesgranulomatous.html)).
  Peritoneal tuberculosis: caseating granulomas in 70–95% of biopsies; Ziehl-Neelsen positive in 50–63%; culture
  ~70%; tissue PCR 25–70% ([PMC7035809](https://pmc.ncbi.nlm.nih.gov/articles/PMC7035809/)).

## Metastatic carcinoma

- High-grade serous carcinoma: papillary, glandular, cribriform and solid growth with slit-like spaces; marked
  nuclear pleomorphism, prominent nucleoli, high mitotic activity; psammoma bodies variable; WT1 and PAX8 positive;
  p53 aberrant (overexpression, null or cytoplasmic) ([PathologyOutlines, HGSC](https://www.pathologyoutlines.com/topic/ovarytumorserouscarcinomahg.html)).
- Low-grade serous carcinoma: compact nests and micropapillae of uniform small cells, psammoma bodies frequent; WT1
  and ER positive; p53 wild-type ([PathologyOutlines, LGSC](https://www.pathologyoutlines.com/topic/ovarytumorserouscarcinomalg.html)).
- Colorectal: garland pattern and intraluminal dirty necrosis; CK7−, CK20+, CDX2+, SATB2+, PAX8−, ER−
  ([PathologyOutlines, colorectal adenocarcinoma metastatic to ovary](https://www.pathologyoutlines.com/topic/ovarytumorcolorectaladeno.html)).
  SATB2 is sensitive and specific for colorectal and appendiceal origin, negative in pancreatobiliary carcinoma and
  usually in gastric carcinoma ([PathologyOutlines, SATB2](https://www.pathologyoutlines.com/topic/stainssatb2.html));
  CDX2 and CK20 are not specific in isolation ([PMC5609935](https://pmc.ncbi.nlm.nih.gov/articles/PMC5609935/)).
- Breast: GATA3 positive in 72–94%; also urothelial and other tumours, so a panel is needed ([PathologyOutlines, GATA3](https://www.pathologyoutlines.com/topic/stainsgata3.html)).
- Lung: TTF-1 positive in lung adenocarcinoma; aberrant positivity in colorectal and endometrial carcinoma with the
  SPT24/SP141 clones ([PathologyOutlines, TTF1](https://www.pathologyoutlines.com/topic/stainsttf1.html)).
- Müllerian: PAX8 positive in serous and endometrial carcinoma; separates Müllerian from breast and other CK7-positive
  carcinomas ([PathologyOutlines, PAX8](https://www.pathologyoutlines.com/topic/stainspax8.html)).

## Not built (Later)

- Peritoneal mucinous disease: PSOGI acellular mucin, low-grade and high-grade mucinous carcinoma peritonei, and
  high-grade with signet-ring cells ([PathologyOutlines, pseudomyxoma peritonei](https://www.pathologyoutlines.com/topic/appendixpseudomyxoma.html);
  [PSOGI consensus, PubMed 26492181](https://pubmed.ncbi.nlm.nih.gov/26492181/)).
