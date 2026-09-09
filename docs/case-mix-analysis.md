# Case-mix analysis of the "Pathology reports" Drive folder

*Internal analysis for template prioritisation in the sign-out app. Generated 2026-09-09 from the Google Docs in the folder. No accession numbers, patient names or dates from individual reports are reproduced here; placeholders such as `[ACC]` mark where an accession number was stripped from a verbatim quote.*

Raw data: `signout-app/analysis/tallies.json` (all counts), `signout-app/analysis/parsed.json` (per-document parse, anonymised titles), `signout-app/analysis/docs/*.txt` (plain-text exports), `signout-app/analysis/parse_reports.py` + `features.py` (parsing code).

---

## 1. Corpus overview

| Item | Value |
|---|---|
| Google Docs listed in folder (non-trashed) | 600 |
| Successfully exported to text/plain | 600 (0 failures) |
| Document creation dates | 2020-08 to 2026-07 |
| Last-modified dates | 2020-08 to 2026-07 |
| Docs that are **macroscopic/block-key draft only** (no microscopic text, no diagnosis line) | **379 (63%)** |
| Docs containing a microscopic paragraph and/or a formal diagnosis line | 221 (37%) |
| Docs with at least one parsable `ORGAN, site, procedure - DIAGNOSIS` line | 92 (15%) |
| Docs containing synoptic / staging vocabulary (pT, pTNM, AJCC, "Histologic type", "Tumor focality", etc.) | 144 (24%) |
| Docs mentioning frozen section | 28 |
| Docs that are slide reviews / referred-in cases | ~12 |

**Key observation.** This folder is predominantly a *grossing / drafting* workspace: two thirds of the docs stop after the macroscopic description and block key. The specimen-type distribution is therefore reliable (it is derived from the specimen title and gross description), but the *diagnosis-phrase* tallies (Section 3) are based on only the ~90 documents that reached the diagnosis stage and should be read as indicative rather than definitive.

Report type among the 221 docs with microscopic/diagnostic content: generic benign specimen 124, synoptic/cancer resection 69, small biopsy 18, cancer without synoptic block 10.

---

## 2. Specimen types (primary specimen per document)

Classification is by the main specimen in the specimen title (lymph nodes and margins accompanying a main specimen are folded into the main specimen; a document listing only nodes is counted under "Lymph node"). The last column shows how many of those documents got as far as microscopy/diagnosis.

| Specimen type | Docs | Share | With micro/dx |
|---|---|---|---|
| Breast (mastectomy, WLE, margins, cores) | 93 | 15.5% | 31 |
| Uterus (hysterectomy ± adnexa, myomectomy) | 49 | 8.2% | 19 |
| Oral cavity / oropharynx (glossectomy, mandibulectomy, buccal, neck dissections) | 30 | 5.0% | 12 |
| Thyroid (± parathyroid) | 30 | 5.0% | 15 |
| Placenta | 28 | 4.7% | 9 |
| Lung / pleura | 26 | 4.3% | 5 |
| Prostate (radical prostatectomy, TURP, cystoprostatectomy) | 25 | 4.2% | 13 |
| Lymph node (stand-alone node/dissection docs) | 25 | 4.2% | 8 |
| Skin (other lesions: BCC, SK, melanoma, KA, scar, debridement) | 23 | 3.8% | 9 |
| Colon / rectum resection | 22 | 3.7% | 2 |
| Liver (hepatectomy, segmentectomy, punch) | 22 | 3.7% | 9 |
| Other / unclassified (frozen-section fragments, aortic valve, ligamentum flavum, mucocele, empty docs) | 21 | 3.5% | 7 |
| Gallbladder | 20 | 3.3% | 5 |
| Salivary gland (parotid, submandibular) | 15 | 2.5% | 7 |
| Ovary / adnexa (cysts, cystectomy, ovarian tumours) | 15 | 2.5% | 10 |
| Cervix (cone, LLETZ, transformation zone, biopsies) | 15 | 2.5% | 5 |
| Duodenum / small bowel | 13 | 2.2% | 2 |
| Kidney (nephrectomy) | 11 | 1.8% | 2 |
| Appendix | 11 | 1.8% | 2 |
| Stomach resection | 10 | 1.7% | 2 |
| Skin cyst (epidermal / "sebaceous") | 9 | 1.5% | 3 |
| Lipoma / soft tissue tumour | 9 | 1.5% | 5 |
| Vascular (vessels, clot, AVM) | 7 | 1.2% | 4 |
| Oesophagus / GOJ | 6 | 1.0% | 3 |
| Prostate needle biopsy | 6 | 1.0% | 5 |
| Brain / CNS / pituitary | 6 | 1.0% | 3 |
| Bone / joint | 6 | 1.0% | 4 |
| Ureter / urethra | 5 | 0.8% | 2 |
| Testis / scrotum | 5 | 0.8% | 1 |
| Larynx / pharynx / nasal | 4 | 0.7% | 2 |
| Penis / foreskin | 4 | 0.7% | 2 |
| Tonsil / adenoid | 4 | 0.7% | 3 |
| Bladder / urothelium | 3 | 0.5% | 2 |
| Fallopian tube (alone) | 3 | 0.5% | 0 |
| Colonic polyp (polypectomy) | 3 | 0.5% | 1 |
| Products of conception | 3 | 0.5% | 0 |
| Stomach biopsy | 3 | 0.5% | 3 |
| Thymus / mediastinum | 2 | 0.3% | 0 |
| Peritoneum / omentum | 2 | 0.3% | 2 |
| Pancreas / biliary | 2 | 0.3% | 1 |
| Vulva / vagina | 2 | 0.3% | 0 |
| Colon / rectum biopsy | 1 | 0.2% | 1 |
| Endometrial curettings | 1 | 0.2% | 0 |
| Hernia sac | 0-1 | <0.2% | 0 |
| Haemorrhoids | 0 | 0% | 0 |

Organ tokens appearing in the parsed diagnosis lines (92 docs): lymph node 51 lines, prostate 28, breast 17, tongue 11, skin 9, soft tissue 9, thyroid 6, ovary 5, cervix 5, gallbladder 4, parathyroid 3, uterus 3, tonsil 3, placenta 3, stomach 3, liver 3, mandible 3, appendix 2.

---

## 3. Top 40 diagnosis phrases (normalised, from the 92 docs with diagnosis lines)

Part letters, node counts `(x/y)`, block references and "see microscopic" cross-references were stripped; case and whitespace normalised.

| Diagnosis phrase | Count |
|---|---|
| no evidence of malignancy | 72 |
| acinar adenocarcinoma, gleason score 9 (4 + 5), grade group 5 | 7 |
| no malignancy | 5 |
| metastatic carcinoma | 4 |
| acinar adenocarcinoma, gleason score 9 (5 + 4), grade group 5 | 4 |
| non-specific mild chronic inflammation | 4 |
| no nodal tissue identified; no evidence of malignancy | 3 |
| nodular hyperplasia | 3 |
| moderately differentiated squamous cell carcinoma | 3 |
| metastatic papillary thyroid carcinoma | 3 |
| epidermal cyst | 2 |
| in keeping with adenoma (parathyroid) | 2 |
| angiolipoma | 2 |
| micrometastatic carcinoma | 2 |
| acinar adenocarcinoma, gleason score 7 (4 + 3), grade group 3 | 2 |
| acinar adenocarcinoma, gleason score 8 (4 + 4), grade group 4 | 2 |
| acinar adenocarcinoma, gleason score 10 (5 + 5), grade group 5 | 2 |
| low grade squamous intraepithelial lesion (hpv) | 2 |
| involved by low grade endometrial stromal sarcoma | 2 |
| no significant pathology (placenta) | 2 |
| reactive lymphoid hyperplasia | 2 |
| chronic inflammation | 1 |
| fat necrosis; no malignancy | 1 |
| adenoma-like adenocarcinoma, well differentiated, with perforation | 1 |
| fibrous obliteration; no malignancy. serositis (appendix) | 1 |
| no residual invasive carcinoma identified (pathologic complete response in resection specimen) | 1 |
| no residual carcinoma identified (pathologic complete response) | 1 |
| venous involvement by metastatic carcinoma | 1 |
| carcinoma cells present | 1 |
| one lymph node with no evidence of malignancy | 1 |
| metastatic carcinoma; appendiceal tissue present and uninvolved by tumour | 1 |
| residual urothelial carcinoma in-situ | 1 |
| recurrent invasive carcinoma, 7 mm, margins clear | 1 |
| invasive adenocarcinoma, acinar predominant (lung) | 1 |
| acinar adenocarcinoma | 1 |
| low-grade salivary gland neoplasm, favor pleomorphic adenoma | 1 |
| compatible with urachal remnant | 1 |
| benign squamoproliferative lesion, suggestive of seborrheic keratosis | 1 |
| schwannoma | 1 |
| benign cyst, in keeping with burnt out endometriotic cyst | 1 |

Take-away: **"NO EVIDENCE OF MALIGNANCY"** (lymph nodes, margins, frozen sections) is by far the single most common diagnosis string and deserves a one-click macro. Prostate-core Gleason strings are the next most repetitive family. Everything else is long-tail.

---

## 4. Common non-cancer, non-small-GI-biopsy entities

Counts are documents whose primary specimen is that entity; feature counts are keyword hits in the full text of those documents (macro + micro). Quoted lines/paragraphs are the user's verbatim wording (anonymised).

### 4.1 Placenta — 28 docs (28 benign; 9 with micro)
Features found: weight recorded 16, singleton 17, twin 5, cord insertion described 16, three-vessel cord stated 14, membranes described 26, "chorioamnionitis" wording 10, "funisitis" 12, "villitis" 9, "infarct"/"retroplacental haematoma" mentioned (mostly as negatives in macro) 17, meconium 1, MVM 0.

Representative diagnosis lines:
- `PLACENTA: - NO SIGNIFICANT PATHOLOGY.`
- `PLACENTA: - CHORIOAMNIONITIS`
- `TWIN PLACENTA, UMBILICAL CORDS AND FETAL MEMBRANES, BIRTH: - FETAL MEMBRANES AT T-ZONE: ...`

Representative microscopic paragraph:
> Sections of the placenta show third-trimester chorionic villi. The umbilical cord contains two arteries and one vein with no features of funisitis. No chorioamnionitis is seen within the placental membranes. There is no evidence of villitis.

Variant (inflamed):
> Sections of the placenta show third-trimester chorionic villi with no inflammation. The umbilical cord contains two arteries and one vein with no features of funisitis. Mild neutrophilic infiltration is seen in the chorion and amnion.

Variant (second trimester, funisitis):
> Sections of the placenta show second-trimester chorionic villi with no inflammation. The umbilical cord contains two arteries and one vein with mild neutrophilic infiltrates in the wall of the umbilical vein, consistent with funisitis. The chorion and amnion do not show acute inflammation.

Macro opening used repeatedly: "The placenta weighs ___ g. Consists of a singleton placenta with a centrally/eccentrically inserted umbilical cord. The umbilical cord measures ___ cm long and ___ cm in diameter..." Block key is almost always `(1)&(2) Umbilical cord and roll of placental membranes. (3)&(4) Placental disc.`

### 4.2 Gallbladder — 20 docs (18 benign; 5 with micro)
Of the 20, 8 are gallbladders accompanying a liver/pancreas resection; ~12 are stand-alone cholecystectomies. Features: chronic cholecystitis 4, acute-on-chronic 1, adenomyomatous hyperplasia 1, Rokitansky-Aschoff sinuses 2, cystic duct margin block 13; cholesterolosis 0 and stones 0 mentioned (stones are presumably not received).

Representative diagnosis lines:
- `GALLBLADDER, resection: - CHRONIC CHOLECYSTITIS.`
- `GALLBLADDER, resection: - ACUTE AND CHRONIC CHOLECYSTITIS.`

Representative microscopic paragraphs:
> Sections of the gallbladder show thickening of the muscular wall, Rokitansky-Aschoff sinus formation as well as a transmural chronic inflammatory infiltrate of lymphocytes and some plasma cells. Bile accumulation is seen within the glands. The findings are consistent with chronic cholecystitis. There is no evidence of dysplasia or malignancy.

> Sections of the gallbladder wall show mucosal ulceration, necrosis and acute inflammatory infiltrates extending through full thickness of the gallbladder. The background shows rokitansky-aschoff sinus formation as well as chronic inflammatory infiltrates. Features are in keeping with acute and chronic cholecystitis. There is no evidence of dysplasia or malignancy.

> Sections of the gallbladder wall show features a transmural chronic inflammatory infiltrate, subserosal fibrosis and thick muscular wall. The fundus shows adenomyomatous hyperplasia, composed of deeply penetrating, irregularly cystically dilated glands accompanied by bundles of fibromuscular proliferation. There is no evidence of dysplasia or malignancy.

Standard macro: "'Gallbladder, resection'. A gallbladder measures __ x __ x __ cm, has been opened prior to submission. The mucosa is unremarkable. 3 representative blocks." Block key `(1) Cystic duct. (2) Body. (3) Fundus.`

### 4.3 Thyroid / parathyroid — 30 docs (19 benign, 9 synoptic PTC, 1 biopsy; 15 with micro)
Features: hemithyroidectomy/lobe 23, isthmic margin block 21, nodular hyperplasia 12, papillary carcinoma 12, parathyroid adenoma/hyperplasia 9, follicular adenoma 4, Graves 3, lymphocytic thyroiditis 2.

Representative diagnosis lines:
- `THYROID GLAND, RIGHT, hemithyroidectomy - NODULAR HYPERPLASIA.`
- `(A) Right THYROID, excision: - DIFFUSE HYPERPLASIA (GRAVE'S DISEASE).`
- `(B) Right thyroid, resection: - LYMPHOCYTIC THYROIDITIS.`
- `PARATHYROID, right superior parathyroid, resection - In keeping with ADENOMA`

Representative microscopic paragraphs:
> Sections show the thyroid gland is composed of multiple variably sized nodules composed of colloid-filled follicles, some with Sanderson polsters present. They are lined by mildly pleomorphic follicular cells having round, hyperchromatic nuclei. Nuclear features of papillary carcinoma are not observed. Areas of haemorrhage, hyalinized fibrosis and dystrophic calcification are seen. A parathyroid gland with features of nodular hyperplasia is seen in block (A4). The findings are those of nodular hyperplasia. There is no evidence of malignancy.

> Sections of the right thyroid show it is dominated by a single encapsulated nodule. Within, variably sized dilated, colloid rich follicles are seen, with adjacent fibrosis and haemorrhage. The follicular epithelium shows no atypia. These findings are those of nodular hyperplasia. The adjacent thyroid tissue shows similar hyperplastic changes, along with scattered lymphoplasmacytic infiltrates with germinal centre formation. The findings are consistent with a hyperplastic nodule within a background of nodular hyperplasia. A benign lymph node has been sampled. There is no evidence of malignancy.

> Sections show hypercellular parathyroid tissue composed predominantly of chief cells arranged in solid sheets, nests, and trabecular patterns. The chief cells have small central nuclei with stippled chromatin and moderate eosinophilic cytoplasm. Scattered oxyphil cells with abundant granular eosinophilic cytoplasm are also present. A thin rim of normal parathyroid tissue with abundant interspersed adipocytes is identified at the periphery. The adipose tissue content within the adenoma is markedly decreased compared to the rim. There is no evidence of capsular invasion, vascular invasion...

### 4.4 Uterus for fibroids / adenomyosis — 49 uterus docs, of which ~29 mention leiomyoma/fibroid and 13 adenomyosis (15 are endometrial carcinoma, 5 cervical carcinoma, 9 have pT/FIGO staging)
Features: with adnexa/BSO 42, endometrial polyp 5, pelvic lymph nodes 13.

Representative diagnosis lines:
- `(A) UTERUS - ADENOMYOSIS (B) Left ovary and tube - NO MALIGNANCY`
- `(B) UTERUS, resection: - Uterine LEIOMYOMAS. - ADENOMYOSIS; ENDOMETRIAL POLYP.`
- `C) Right OVARY and RIGHT FALLOPIAN TUBE, resection: - PARATUBAL CYST; - CYSTIC FOLLICLE, ovary; - ENDOMETRIOSIS.`

Representative microscopic paragraph:
> Sections of the uterus show adenomyosis with scattered islands of endometrial glands and stroma in the myometrium. Intramural and subserosal leiomyomata with no coagulative necrosis are seen. Mitoses are inconspicuous and there is no cytological atypia. The endometrial cavity shows weakly proliferative endometrium without hyperplasia. Endometrial polyp with fibrotic stroma and thick-walled vessels is sampled. The cervix shows no evidence of squamous intraepithelial lesion, glandular dysplasia, or malignancy.

Myomectomy variant:
> Sections show pieces of smooth muscle tumor tissue comprising spindle cells arranged in fascicles and whorls. Thick walled vessels are seen. While the tumor cellularity is high, no epithelioid tumor cells, significant nuclear atypia, coagulative tumor necrosis, or frequent mitoses are observed. Focally proliferative endometrium without evidence of hyperplasia or chronic endometritis is seen. There is no evidence of malignancy. Features are those of leiomyoma.

### 4.5 Ovarian cysts / benign adnexa — 15 ovary docs (10 benign; 9 mention carcinoma/borderline in differential or as diagnosis)
Features: endometriotic cyst/endometriosis 8, haemorrhagic/torsion 4, serous cystadenoma 1, mucinous cystadenoma 1, mature cystic teratoma 1, cystic follicle/corpus luteum 1, paratubal cyst 1.

Representative diagnosis lines:
- `OVARY. Right ovarian cyst, excision - BENIGN CYST, in keeping with burnt out ENDOMETRIOTIC CYST`
- `(A) Left OVARY and left FALLOPIAN TUBE, resection: - ENDOMETRIOTIC CYST OF OVARY.`
- `1. OVARY, outer right ovarian cyst, excision: - MUCINOUS CYSTADENOMA.` / `2. OVARY, inner right ovarian cyst, excision: - MATURE CYSTIC TERATOMA and MUCINOUS CYSTADENOMA.`
- `(A) Right OVARY, slide review: * SEROUS CYSTADENOMA; NO MALIGNANCY.`

Representative microscopic paragraphs:
> Sections show a fibrocollagenous cyst wall with extensive old hemorrhage, abundant hemosiderin-laden macrophages, and focal chronic inflammation. The lining epithelium is largely absent. No definite viable endometrial glands are identified. Ovarian stroma is noted in the periphery. No epithelial atypia or malignancy is seen. These features are those of a benign haemorrhagic cyst, in keeping with a burnt-out endometriotic cyst.

> Sections of the ovary show a cyst lined by benign mullerian epithelium, underneath which benign fibrous stroma composed of bland spindle cells is seen. Features are those of a serous cystadenoma. There is no evidence of malignancy.

> Sections show a mature cystic teratoma including components from at least two lineages of differentiation. The endodermal components are composed of gastric mucosa, thyroid follicles and respiratory epithelium. Smooth muscle fibres, adipose tissue and hyaline cartilage. No immature neuroepithelial tissue is seen. In areas, ovarian stromal wall is seen lined by endocervical-type mucinous epithelium, similar to that seen in (A). There is no evidence of other germ cell tumor components, borderline component, or malignancy.

### 4.6 Lymph nodes reported as negative — 25 stand-alone node docs plus dozens of node parts inside other cases; "NO EVIDENCE OF MALIGNANCY (x/y)" appears 72 times
Features (stand-alone docs): metastatic 11, no malignancy 6, sentinel 4, reactive 2, granulomatous 2, lymphoma work-up 1.

Representative diagnosis lines:
- `LYMPH NODE, right SLN2, excision - NO EVIDENCE OF MALIGNANCY (0/1)`
- `(C) LYMPH NODES, left external iliac lymph nodes, resection - NO EVIDENCE OF MALIGNANCY (0/4)`
- `(A) LYMPH NODE, subcarinal, resection: - GRANULOMATOUS INFLAMMATION; NO EVIDENCE OF MALIGNANCY (0/1).`

Representative microscopic paragraphs:
> Sections show fibroadipose tissue and one reactive lymph node with no evidence of malignancy.

> Sections show fibroadipose tissue and 13 reactive lymph nodes. There is no evidence of malignancy.

> Sections show fibroadipose tissue and 1 reactive lymph node. No suspicious cells are identified on immunostain for pancytokeratin MNF116. There is no evidence of malignancy.

### 4.7 Appendix — 11 docs (but 7 are appendices inside a right hemicolectomy/other resection; ~4 stand-alone appendicectomies)
Features: acute suppurative appendicitis 1, periappendicitis 1, perforation 1, neoplasm (NET/mucinous/adenocarcinoma) 2; faecolith 0, fibrous obliteration 1 (in a dx line).

Representative diagnosis lines:
- `APPENDIX: - PERIAPPENDICITIS.`
- `APPENDIX ... - FIBROUS OBLITERATION; NO MALIGNANCY. SEROSITIS`

Representative microscopic paragraphs:
> Sections of the appendix show ulceration and suppurative inflammation extending to the serosal surface, where neutrophilic fibrinous exudates are seen. The findings are consistent with acute suppurative appendicitis. There is no evidence of dysplasia or malignancy.

> Sections of the appendix show neutrophilic fibrinous exudates on the serosal surface. No acute inflammation is seen within the appendiceal mucosa. Features are in keeping with periappendicitis.

Standard macro: "'Appendix, resection'. An appendix measuring __ cm long and __ cm in diameter. The surface shows areas of congestion and discoloration. All embedded in 3 blocks."

### 4.8 Skin cysts ("sebaceous"/epidermal) — 9 docs (all benign; 3 with micro)
Features: epidermal cyst 3, lamellated keratin 3, ruptured/inflamed 1; pilar cyst 0.

Representative diagnosis lines:
- `SKIN, right axilla seb cyst, excision - EPIDERMAL CYST`
- `SKIN, right shoulder seb cyst, excision - CHRONIC INFLAMMATION (see microscopic examination)`

Representative microscopic paragraphs:
> The section shows a piece of hair-bearing skin, with the dermis containing a cyst composed of stratified squamous epithelium with a granular layer, without adnexal skin structures. Abundant lamellated keratin is seen within the cyst. The findings are those of an epidermal cyst. There is no evidence of dysplasia or malignancy.

> Sections show a piece of skin with superficial subcutis. The dermis show haemorrhage with focal refractile foreign material surrounded by patchy lymphocytic infiltrates with haemosiderin deposits. No residual lamellated keratin material or cyst epithelium is identified. Please correlate with clinical findings. There is no evidence of granulomatous inflammation or malignancy.

Standard macro: "'[Site] sebaceous cyst, excision'. An ellipse of skin with an underlying nodule. The ellipse of skin measures __ x __ cm and the nodule measures __ cm. The deep surface is inked..."

### 4.9 Skin — other lesions — 23 docs (17 benign, 4 synoptic melanoma/SCC)
Features: margins reported 14, BCC 4, ulcer/debridement 5, pilonidal/sinus/abscess 4, scar 3, seborrhoeic keratosis 2, keratoacanthoma 2, melanoma 2, naevus 1.

Representative diagnosis lines:
- `SKIN, left back nodule, resection - Benign squamoproliferative lesion, suggestive of seborrheic keratosis`
- `SKIN, prepuce, excision: * FORDYCE SPOTS.`
- `SOFT TISSUE, pilonidal abscess wall, excision: ...`

Representative microscopic paragraphs:
> Sections show an acanthotic epidermis with elongation of rete ridges and overlying papillomatosis forming a verrucous, exophytic configuration. The epidermis is composed of cytologically bland keratinocytes without significant nuclear atypia or dysplasia. The underlying dermis shows a mild superficial perivascular lymphocytic infiltrate. The features are those of a benign squamoproliferative lesion, suggestive of seborrheic keratosis. There is no evidence of dysplasia or malignancy.

> Sections show a piece of hair bearing skin with epidermis and dermis. A basaloid tumour is seen arising from the epidermis and infiltrating into the dermis, forming solid nodules with peripheral palisading. The cells display oval basophilic nuclei, prominent nucleoli, pink cytoplasm and indistinct cytoplasmic borders. Areas of central keratinisation are seen within the tumour. Mitoses are occasionally seen. The findings are those of nodular basal cell carcinoma, keratotic variant.

> ... Overall features are consistent with keratoacanthoma. Excision is complete and the margins are as follows: - Superior: 1.5 mm - Inferior: 2.5 mm - Lateral: 3.5 mm - Medial: 6 mm - Deep: 2.5 mm

### 4.10 Lipoma / benign soft tissue — 9 docs (4 benign, 5 sarcoma/myxoma)
Representative diagnosis lines:
- `(A) SOFT TISSUE, right thigh lipoma, resection - ANGIOLIPOMA`
- `SKIN, left breast skin nodule, resection - SCHWANNOMA`

Representative microscopic paragraphs:
> Sections show partially encapsulated fibroadipose tissue composed of lobules of mature adipocytes separated by thin fibrous septa. Fat necrosis is seen in areas. No atypical stromal cells or lipoblasts are observed. The findings are in keeping with lipoma. There is no evidence of malignancy.

> Sections show a well-circumscribed benign adipocytic neoplasm composed predominantly of mature adipocytes admixed with numerous small thin walled capillary-sized vessels, with focal peripheral accentuation. Intraluminal fibrin thrombi are present. No significant cytologic atypia, lipoblasts, tumor necrosis, or increased mitotic activity are identified.

### 4.11 Tonsil — 4 docs
- `(A) Left TONSIL, tonsillectomy: - REACTIVE LYMPHOID HYPERPLASIA.` (same for right)
- `TONSIL, right tonsil, biopsy: - NO EVIDENCE OF MALIGNANCY.`
> Sections of the tonsils show reactive lymphoid follicles with germinal centres. The surface is covered by benign squamous epithelium. A few colonies of actinomyces are noted on the surface. There is no evidence of dysplasia or malignancy.

### 4.12 Salivary gland (benign) — 15 docs, pleomorphic adenoma 4
- `PAROTID, left parotid, punch - Low-grade salivary gland neoplasm, favor pleomorphic adenoma`
> ... a well circumscribed, thinly encapsulated tumour composed of a mixture of epithelial elements, myoepithelial elements, and stromal elements is seen. The epithelial cells show tubules and nests, with streaming of spindle or stellate shaped myoepithelial elements. Eosinophilic luminal secretions are present. Squamous metaplastic change is seen. Mitoses are inconspicuous. The findings are consistent with pleomorphic adenoma. No malignant transformation is seen. The tumour has been completely excised, the margins being given as follows:

### 4.13 Breast — benign excisions / cavity margins (26 of 93 breast docs have no carcinoma/DCIS wording; 85 mention margins)
- `(A) Right BREAST inferior margin, resection: - NO EVIDENCE OF MALIGNANCY.` (repeated for each cavity shave)
- `(B) BREAST, L3H breast mass, resection: - INTRADUCTAL PAPILLOMA with usual-type DUCTAL HYPERPLASIA, margins clear.`
- `(A) Breast, right superior margin, excision - FAT NECROSIS; NO MALIGNANCY`
> Sections show hyalinised fibroadipose tissue, as well as breast ducts and lobules, without architectural distortion. They are lined by ductal epithelium and myoepithelium, without atypia. There is no evidence of atypical hyperplasia, in-situ or invasive carcinoma.

> Sections show a fairly circumscribed breast lesion composed of glandular and ductal elements compressed into elongated, curvilinear spaces by a proliferation of bland spindle-shaped stromal cells, consistent with a fibroadenoma. The epithelial component shows no atypia, and no significant mitotic activity is seen in the stroma. The features are those of a benign fibroadenoma, which appears completely excised.

### 4.14 Entities that are rare or absent in this folder
Hernia sac 0-1, haemorrhoids 0, products of conception 3 (macro only), endometrial curettings 1, penis/foreskin 4 (Fordyce spots, benign foreskin), testis 5 (mostly germ cell tumours), fallopian tube alone 3 (macro only), vulva/vagina 2.

---

## 5. Roadmap confirmation — small GI / prostate biopsies

Counts are documents whose full text contains the relevant wording (title, macro or micro):

| Roadmap entity | Docs |
|---|---|
| Gastric biopsy (endoscopic) / gastritis / H. pylori wording | 7 (3 are dedicated gastric-biopsy docs, e.g. `STOMACH, antrum, biopsy: * ACTIVE CHRONIC GASTRITIS; INTESTINAL METAPLASIA.`; 2 are gastric MALT lymphoma biopsies) |
| Colonic polyp / polypectomy / adenoma wording | 11 (3 dedicated polypectomy docs, e.g. tubular adenoma) |
| Prostate needle cores | 12 (6 dedicated core docs; sector-labelled cores with Gleason/Grade Group per site) |
| IBD / colitis biopsy | 1 |
| Endoscopic procedure wording (OGD, colonoscopy, EMR, ESD) | 0 |

Conclusion: small endoscopic GI biopsies are a **small minority** of this folder (probably because they are signed out directly in the LIS rather than drafted in Docs). Prostate cores are the best-represented small-biopsy family here, and their diagnosis strings are highly formulaic (`PROSTATE, <sector>, biopsy: - Acinar ADENOCARCINOMA, Gleason score 7 (3 + 4), Grade group 2.` / `- NO EVIDENCE OF MALIGNANCY`). Gastric-biopsy, polyp and IBD templates remain sensible for a sign-out app, but this corpus cannot be used to validate their wording beyond a handful of examples.

---

## 6. Recommended generic templates (entities with >= 5 documents), in priority order

Priority weighs (a) number of documents, (b) how formulaic the existing wording is (high re-use of identical sentences), and (c) whether the case is benign/generic (synoptic cancer resections are excluded — they need protocol-driven synoptic templates, not generic ones).

| # | Template | Docs | Fields the template needs |
|---|---|---|---|
| 1 | **Lymph node(s) — negative / reactive / metastatic** (stand-alone and as part of any case) | 25 stand-alone + ~70 node parts | Site/station; number of nodes; result (no evidence of malignancy / reactive / granulomatous / metastatic); x/y counts; largest metastasis size; extranodal extension; immunostain used (e.g. MNF116); anthracosis; auto-generates `NO EVIDENCE OF MALIGNANCY (0/n)` |
| 2 | **Placenta (singleton / twin)** | 28 | Weight; trimester; singleton/twin & chorionicity (T-zone); cord length, diameter, insertion, vessel number, funisitis; membranes (colour, insertion), chorioamnionitis (maternal/fetal stage); villitis; infarcts; retroplacental haematoma; meconium; MVM/FVM; standard block key (1)&(2) cord + membrane roll, (3)&(4) disc |
| 3 | **Breast — cavity shave margins & benign excision** | ~26 benign + margin parts in most of 93 | Per-margin part label (superior/inferior/medial/lateral/posterior/anterior); result (no evidence of malignancy / fat necrosis / fibrocystic change / UDH / papilloma / fibroadenoma / ADH); calcification; completeness of excision |
| 4 | **Thyroid — benign hemithyroidectomy / total thyroidectomy** | 30 (19 benign) | Side; weight; dominant nodule size; diagnosis (nodular hyperplasia / hyperplastic nodule / follicular adenoma / Graves diffuse hyperplasia / lymphocytic thyroiditis); capsular & vascular invasion negative; PTC nuclear features absent; isthmic margin; incidental parathyroid; sampled lymph nodes |
| 5 | **Parathyroid adenoma / hyperplasia** | 9 | Gland position; weight; rim of normal gland; cellularity/loss of fat; chief vs oxyphil; capsular/vascular invasion; frozen-section correlation |
| 6 | **Gallbladder** | 20 (12 stand-alone) | Length/diameter; wall thickness; stones (present/absent/not received); mucosa; cholecystitis type (chronic / acute / acute-on-chronic / gangrenous / xanthogranulomatous); Rokitansky-Aschoff sinuses; cholesterolosis; adenomyomatous hyperplasia; intestinal metaplasia; dysplasia/malignancy negative; cystic duct margin; standard block key cystic duct / body / fundus |
| 7 | **Uterus — hysterectomy for leiomyoma / adenomyosis (± adnexa)** | ~29 benign of 49 | Uterus weight/size; leiomyoma number, location (intramural/subserosal/submucosal), largest size, degeneration; adenomyosis; endometrium phase/hyperplasia/polyp; cervix (SIL/nabothian cysts); each tube (paratubal cyst) and ovary (cystic follicle, corpus luteum, endometriosis, inclusion cyst); all "no malignancy" statements |
| 8 | **Ovarian cyst / cystectomy** | 15 (10 benign) | Side; cyst size; type (endometriotic / burnt-out haemorrhagic / serous cystadenoma / mucinous cystadenoma / mature cystic teratoma / follicular / corpus luteum / paratubal); lining present or attenuated; borderline features negative; torsion/haemorrhage; ovarian stroma present; fallopian tube unremarkable |
| 9 | **Skin — epidermal ("sebaceous") cyst** | 9 | Site; skin ellipse size; cyst size; type (epidermal / pilar); ruptured; foreign-body granulomatous reaction; completeness |
| 10 | **Skin — benign lesion excision** (SK, naevus, keratoacanthoma, scar, pilonidal, Fordyce) and **BCC excision** | 23 | Site; lesion type; margins (superior/inferior/medial/lateral/deep in mm with block refs); for BCC: subtype, depth, perineural invasion, completeness |
| 11 | **Prostate needle cores** | 12 | Per-sector part; number & length of cores; result (benign / HGPIN / atypical glands suspicious / acinar adenocarcinoma); Gleason pattern, score, Grade Group; % pattern 4; length/% core involved; perineural invasion; extraprostatic extension; IHC (K903/p63, AMACR, NKX3.1) |
| 12 | **Appendix** | 11 (4 stand-alone) | Length/diameter; serosa; lumen (faecolith); inflammation type (acute suppurative / gangrenous / periappendicitis only / fibrous obliteration / no acute inflammation); perforation; serositis; incidental neoplasm (NET / LAMN / adenocarcinoma) with mesoappendiceal margin |
| 13 | **Lipoma / benign soft tissue tumour** | 9 (4 benign) | Site; size; circumscription/encapsulation; type (lipoma / angiolipoma / schwannoma / neurofibroma); lipoblasts/atypical stromal cells negative; margins |
| 14 | **Salivary gland — pleomorphic adenoma** | 15 (4 PA) | Gland; tumour size; encapsulation; components; margins; malignant transformation negative |
| 15 | **Tonsils** | 4 (below the >=5 threshold, but 100% formulaic) | Side; reactive lymphoid hyperplasia; actinomyces; dysplasia/malignancy negative |
| 16 | **Frozen section correlation block** | 28 docs mention frozen section | Time phone-reported; frozen diagnosis; paraffin confirmation sentence ("The paraffin sections confirm the frozen sections diagnosis.") |

Deferred to the synoptic/cancer track (not generic templates): breast carcinoma (mastectomy/WLE with CAP-style synoptic – 37 mastectomies, 25 DCIS mentions, 15 post-NAC), oral cavity SCC with neck dissection (30), lung resection (26), radical prostatectomy/cystoprostatectomy (25), colorectal resection (22), liver HCC/metastasis (22), endometrial/cervical carcinoma hysterectomy (~20), kidney RCC (11), stomach/oesophagus resection (16), PTC thyroidectomy (12).

---

## 7. Parsing caveats

1. **63% of docs are macro/block-key drafts only.** Specimen-type counts are robust; diagnosis counts and microscopic-paragraph examples come from the 221 docs that reached microscopy and only 92 with formal diagnosis lines.
2. Titles are heterogeneous (many docs start with "(Specimen received in formalin)", a quoted macro line, a "Tab 1" marker or a block-key line); when no clean title was present the category was inferred from the opening macro text and then from keyword frequency over the whole document. Expect roughly ±10% misclassification on the smaller categories ("Other/unclassified" = 21 docs).
3. Diagnosis lines were captured with patterns for `ORGAN, site, procedure - DIAGNOSIS`, `ORGAN, site, procedure: - DIAGNOSIS`, `ORGAN: - DIAGNOSIS` and the two-line `...:` / `- DIAGNOSIS` form; bullet-style `* DIAGNOSIS` after a colon is also captured. Multi-diagnosis strings on one line (e.g. prostate cores A–F) were split on part labels.
4. Docs with multiple tabs export as one text stream; a few docs contain more than one case (e.g. a working doc with several skin-cyst and breast-margin diagnoses), so "docs" is not exactly "cases".
5. Report-type classification ("synoptic/cancer" 144) is keyword-based (pT/pTNM/AJCC/"Histologic type" etc.) and will include a few benign resections whose templates contain those headings.
6. Feature counts (e.g. "infarct" in placenta) count the word regardless of negation, so they indicate what the template *mentions*, not the positive rate.
