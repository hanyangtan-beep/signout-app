# Skin squamous cell carcinoma — morphology and staging grounding record

Sources behind `schemas/skin_scc.json`, `generators/skin_scc_morphology.js`, `generators/skin_scc.js`,
`src/staging/skin_scc.js` and `src/staging/hn_nodes.js`. None of this text is printed: the report
register carries only what is seen down the microscope (see `docs/new-template-brief.md`). The notes
below were gathered on 2026-09-25 from the QMH "HN-Skin SCC" page (saved as
`docs/reference/HN-Skin-SCC.html`), the CAP cutaneous carcinoma of the head and neck protocol
v1.2.0.0, the RCPath cutaneous SCC dataset (v4, February 2019), the WHO 5th edition skin tumours
update and the topic pages cited in each section. Tests: `tests/skin_scc.test.js`.

## Morphology of Invasive Cutaneous Squamous Cell Carcinoma — Histologic Types (for QMH Diagnostic Reporting Template)

**Scope note on the fixed element list.** The [QMH Cancer Reporting Template, "HN-Skin SCC" page](https://awiloqmh.github.io/CancerReportingTemplate/HN-Skin%20SCC.html) is built on the CAP "Cutaneous Carcinoma of the Head and Neck" protocol. The **current CAP protocol version fetched for this report is v1.2.0.0** (posting date April 2026; PDF: [CAP HN.Skin_Cutaneous_1.2.0.0](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)). Its Histologic Type field lists, under the WHO classification of epidermal carcinomas it cites: squamous cell carcinoma NOS, verrucous SCC, acantholytic SCC, lymphoepithelial carcinoma, clear cell SCC, spindle cell SCC, and SCC with sarcomatoid differentiation ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)). Keratoacanthoma-type SCC, adenosquamous carcinoma, SCC with osteoclast-like giant cells, and pseudovascular (pseudoangiosarcomatous) SCC are **not** listed as separate WHO-recognized subtypes in this CAP protocol version, and the WHO 5th-edition skin tumours update explicitly states that "pseudovascular SCC" is no longer considered a subtype of SCC and is not the recommended term, and that adenosquamous carcinoma has been removed as an SCC subtype (most such tumours reclassified as squamoid eccrine ductal carcinoma) ([Histopathology, WHO Skin5 key updates](https://onlinelibrary.wiley.com/doi/full/10.1111/his.15562)). These four entities are nonetheless retained in the QMH template's element list (reflecting older WHO 4th-edition terminology/legacy clinical usage) and are researched below as instructed, with this discrepancy flagged rather than silently resolved, per the grounding rules.

---

### 1. Squamous cell carcinoma, not otherwise specified (conventional cutaneous SCC)

**a. Morphology**
- Invasive SCC is defined by infiltration of atypical keratinocytes through the basement membrane into the dermis, most often arising in association with (and resembling) a precursor actinic keratosis in ~97% of cases ([PMC3018652](https://pmc.ncbi.nlm.nih.gov/articles/PMC3018652/); [Head & Neck Pathol 2011](https://onlinelibrary.wiley.com/doi/10.1155/2011/210813)).
- Malignant keratinocytes show intense mitotic activity, pleomorphism, enlarged nuclei, loss of maturation/polarity and a disordered ("windblown") epidermal appearance; tumor cells are large with abundant eosinophilic cytoplasm and vesicular nuclei ([Patholines](https://patholines.org/Squamous-cell_carcinoma_of_the_skin/)).
- Well-differentiated tumors show prominent keratinization, keratin ("pearl-like") whorls, slightly enlarged hyperchromatic nuclei, abundant cytoplasm and readily visible intercellular bridges; moderately differentiated tumors show more structural disorganization and less keratin; poorly differentiated tumors show greatly enlarged pleomorphic nuclei, high atypia, frequent mitoses, and little to no keratinization, with cells infiltrating in cords ([Patholines](https://patholines.org/Squamous-cell_carcinoma_of_the_skin/); [PMC3018652](https://pmc.ncbi.nlm.nih.gov/articles/PMC3018652/)).
- Ulceration is common; a corresponding inflammatory infiltrate often accompanies dermal nests ([Patholines](https://patholines.org/Squamous-cell_carcinoma_of_the_skin/)).

**b. Immunohistochemical panel**
- No dedicated IHC panel is required for morphologically obvious conventional SCC; keratin expression (higher-molecular-weight keratins) and EMA support squamous lineage when morphology is equivocal, especially after anaplastic transformation ([Patologi PDF](https://www.patologi.com/skin%20cancer.pdf)).
- p63 and p40 are used to support a squamous-cell-carcinoma diagnosis, particularly for poorly differentiated/clear-cell areas ([Patholines](https://patholines.org/Squamous-cell_carcinoma/)).
- p16 IHC correlates with HPV infection and is mainly relevant at HPV-associated sites (cervix, vagina, vulva, penis, anus, oropharynx) rather than routine cutaneous SCC ([Patholines](https://patholines.org/Squamous-cell_carcinoma/)).

**c. Entity-specific reporting statement**
- Report should state degree of differentiation (grade), tumor size, depth of invasion, anatomic location, perineural invasion, perivascular/lymphovascular invasion and immunosuppression status, as these are the key prognostic determinants for conventional SCC ([Head & Neck Pathol 2011](https://onlinelibrary.wiley.com/doi/10.1155/2011/210813)). Perineural invasion occurs in ~14% of head/neck SCC and is associated with ~23% local recurrence (vs ~9% without) and worse disease-specific mortality ([PMC3018652](https://pmc.ncbi.nlm.nih.gov/articles/PMC3018652/); [Head & Neck Pathol 2011](https://onlinelibrary.wiley.com/doi/10.1155/2011/210813)).

---

### 2. Keratoacanthoma (keratoacanthoma-type SCC)

**a. Morphology**
- Large, well-differentiated squamous tumor with a central keratin-filled crater on low power; the surrounding epidermis forms a "lip" around the invaginating crateriform tumor ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocytickeratoacanthoma.html)).
- Tumor cells are bland with abundant eosinophilic/glassy cytoplasm and enlarged, hyperchromatic-to-vesicular nuclei; mitotic activity and atypia are usually confined to the tumor periphery ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocytickeratoacanthoma.html)).
- Intraepidermal neutrophilic microabscesses and keratin horn pearls within the tumor are characteristic ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocytickeratoacanthoma.html)).
- Architecturally the lesion shows an organized, multilocular infundibular-trichilemmal pattern, typically following an exo-/endophytic proliferative, mature, and involutional/regressing sequence, with regressing lesions showing epidermal atrophy, bland cytology, dermal inflammation and fibrosis at the periphery ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocytickeratoacanthoma.html); [Histopathology, WHO Skin5 update](https://onlinelibrary.wiley.com/doi/full/10.1111/his.15562)).

**b. Immunohistochemical panel**
- Ki-67 is positive in the basal cells of the tumor lobule and negative suprabasally, with a characteristic **peripheral-only** pattern; irregular Ki-67 distribution extending beyond the periphery is relatively specific for conventional SCC, distinguishing the two ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocytickeratoacanthoma.html); [Histopathology, WHO Skin5 update](https://onlinelibrary.wiley.com/doi/full/10.1111/his.15562)).
- CK17 shows a suprabasal, centrally staining pattern and is weak/negative in the tumor lobules ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocytickeratoacanthoma.html)).
- CK6 and CK10 are positive in tumor islands; CK14 is positive in the basal layer; CK10 is positive in spinous/granular layers; PAS is positive in the outer root sheath and epithelial tumor cells ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocytickeratoacanthoma.html)).
- p53, Ki67 and p16 in combination may permit distinction of keratoacanthoma from follicular SCC; loss of p16 with an aberrant, focally weak, cytoplasmic pattern is a feature raising concern for SCC ([Histopathology, WHO Skin5 update](https://onlinelibrary.wiley.com/doi/full/10.1111/his.15562)).

**c. Entity-specific reporting statement**
- For lesions entirely resected, the diagnosis may be rendered as "Well differentiated squamous cell carcinoma, keratoacanthoma type"; for lesions not entirely histologically examined, "Well differentiated squamous cell carcinoma with features of keratoacanthoma" ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocytickeratoacanthoma.html)).
- The WHO 5th edition considers keratoacanthoma likely a separate/self-resolving entity from SCC, and when distinction from SCC is genuinely uncertain, the term "squamoproliferative tumour of uncertain malignant potential" may be used ([Histopathology, WHO Skin5 update](https://onlinelibrary.wiley.com/doi/full/10.1111/his.15562)).
- Sources disagree on nosologic status: Pathology Outlines and the CAP protocol frame it operationally as an SCC variant for reporting purposes, whereas WHO 5th edition treats it as controversial/likely a distinct entity ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocytickeratoacanthoma.html); [Histopathology, WHO Skin5 update](https://onlinelibrary.wiley.com/doi/full/10.1111/his.15562)).

---

### 3. Acantholytic squamous cell carcinoma

**a. Morphology**
- Defined by loss of cohesion between epidermal or adnexal epithelial cells, forming intraepithelial clefts (most commonly suprabasilar), with acantholytic keratinocytes showing a round shape, central round uniformly basophilic nucleus, eosinophilic cytoplasm and loss of desmosomal attachments over at least half of the cell circumference ([PMC5319832](https://pmc.ncbi.nlm.nih.gov/articles/PMC5319832/)).
- Prominent acantholysis can produce a pseudoglandular appearance; associated spongiosis and dyskeratotic keratinocytes may be seen ([PMC5319832](https://pmc.ncbi.nlm.nih.gov/articles/PMC5319832/)).
- Also termed adenoid SCC, pseudoglandular SCC, or (historically) adenoacanthoma of Lever; acantholysis in most series comprises <25% of the tumor area ([PMC5319832](https://pmc.ncbi.nlm.nih.gov/articles/PMC5319832/); [PMC10767014](https://pmc.ncbi.nlm.nih.gov/articles/PMC10767014/)).
- Nearly half of acantholytic SCCs predominantly or exclusively involve follicular epithelium rather than the interfollicular epidermis ("follicular pattern" acantholytic SCC), distinct from keratoacanthoma (which lacks epidermal involvement and has a crateriform, glassy-cytoplasm profile) ([PMC5319832](https://pmc.ncbi.nlm.nih.gov/articles/PMC5319832/)).

**b. Immunohistochemical panel**
- No standardized IHC panel is reported for routine diagnosis; acantholysis is a histologic diagnosis and no validated minimal diagnostic IHC criteria have been established ([PMC5319832](https://pmc.ncbi.nlm.nih.gov/articles/PMC5319832/)).
- Loss of E-cadherin has been demonstrated in the pseudovascular/pseudoangiosarcomatous morphologic extreme of this spectrum and is considered supportive of loss of cell adhesion underlying acantholysis ([PMC6421930](https://pmc.ncbi.nlm.nih.gov/articles/PMC6421930/)).
- Mucin stains (e.g., mucicarmine) are used to exclude true glandular/mucinous differentiation and to distinguish suprabasilar acantholysis (no mucin) from a central acantholytic mucin pool described in follicular SCC ([PMC5319832](https://pmc.ncbi.nlm.nih.gov/articles/PMC5319832/)).

**c. Entity-specific reporting statement**
- Because acantholytic SCC is "necessarily a histologic diagnosis" without a validated minimal criterion set, the report should describe the extent (percentage) of acantholytic change and note whether the lesion is follicular-pattern, since this affects differential diagnosis but not treatment ([PMC5319832](https://pmc.ncbi.nlm.nih.gov/articles/PMC5319832/)). The WHO 5th edition explicitly states that "pseudovascular SCC" is not the recommended synonym for acantholytic SCC ([Histopathology, WHO Skin5 update](https://onlinelibrary.wiley.com/doi/full/10.1111/his.15562)).

---

### 4. Spindle cell squamous cell carcinoma

**a. Morphology**
- Defined as a poorly differentiated spindle or epithelioid cell tumor showing evidence of epithelial differentiation through an associated well- to moderately differentiated conventional SCC component and/or definitive IHC expression of epithelial markers; keratinization is rare or absent in the spindled component ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)).
- An overlying SCC in situ component and/or a moderately differentiated conventional SCC component is frequently identifiable adjacent to the spindled tumor ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)).
- Epithelioid variants of spindle cell SCC can closely mimic melanoma morphologically ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)).
- Perineural invasion (~14.3%) and lymphovascular invasion (~8.2%) are reported in institutional series ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)).

**b. Immunohistochemical panel**
- A focused initial panel is recommended: p63 or p40, keratin 5/6, CD10, CD163 or CD68, and SOX10 or S100, intended specifically to separate spindle cell SCC from its two main mimics — atypical fibroxanthoma/pleomorphic dermal sarcoma (AFX/PDS) and spindle cell/dedifferentiated melanoma ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)).
- Pooled sensitivity for keratin/squamous markers in spindle cell SCC: p63 89% (95% CI 81–95%), AE1/AE3 87% (68–99%), MNF116 87% (76–95%), CK903/34βE12 85% (69–96%) ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)). Up to one-third of cases may lack expression of any single conventional keratin marker, so a keratin panel (not a single marker) should be used ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)).
- Institutional cohort staining: keratin 903 83.3%, pan-keratin 80.0%, MNF116 76.9%, p63 71.0%, keratin 5/6 69.7%, CAM5.2 57.1%, p40 48.3%; CD10 93.8%, CD68 66.7%; S100 0%, SOX10 0%, MelanA/Mart1 0%, MiTF 0% — i.e., melanocytic markers are consistently negative in spindle cell SCC, which is the key point of separation from spindle cell/dedifferentiated melanoma ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)).
- Versus AFX specifically: p63 is markedly more sensitive/specific for spindle cell SCC (90% positive, usually strong/diffuse nuclear) than for AFX (13% positive, focal/weak); p63 plus any cytokeratin (e.g., AE1/AE3) was positive in 90% of spindle cell SCC and 0% of AFX (p<0.0001), whereas CD10 alone did not discriminate the two (78% AFX vs 60% spindle cell SCC, p=0.4) ([PMC2480581](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2480581/)).

**c. Entity-specific reporting statement**
- Because up to a third of spindle cell SCCs can be keratin-negative, the report should explicitly record which markers were used and their result, and should not exclude the diagnosis on a single negative keratin stain in the appropriate clinical/morphologic context ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)). Note that CAP designates this WHO subtype as "Spindle cell squamous cell carcinoma," listed separately from "SCC with sarcomatoid differentiation" ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)); sources use "spindle cell SCC," "sarcomatoid SCC" and "desmoplastic SCC" partly overlappingly ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)).

---

### 5. Verrucous squamous cell carcinoma

**a. Morphology**
- Well-differentiated squamous proliferation with both exophytic (papillomatosis, massive hyperkeratosis, expanded granular layer with parakeratosis) and endophytic (blunt bulbous projections, deep pushing margin) components ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticverrucousscc.html)).
- Tissue between the bulbous rete processes is diminished and hypovascular; an inflamed, edematous, lymphocyte-rich stroma is typically present at the advancing edge ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticverrucousscc.html)).
- Cytology is bland: large polygonal squamous cells with abundant pink cytoplasm, enlarged but minimally atypical nuclei, rare mitoses, and well-differentiated keratinocytes throughout; the interface at the bulbous tips may show slightly more atypia ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticverrucousscc.html)).
- Diagnosis requires a deep incisional or excisional sample — superficial/fragmented biopsies may be misleading and mimic reactive processes ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticverrucousscc.html)). Verrucous carcinoma is characterized by slow growth, low metastatic potential, but potential local destructiveness and recurrence ([PMC9606218](https://pmc.ncbi.nlm.nih.gov/articles/PMC9606218/)).

**b. Immunohistochemical panel**
- No specific IHC panel or expected staining pattern for verrucous carcinoma diagnosis is described in the sources reviewed; the differential from giant condyloma (Buschke–Löwenstein tumor), which is histologically identical, relies on HPV PCR detection of low-risk types 6/11, not IHC ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticverrucousscc.html)).

**c. Entity-specific reporting statement**
- The report should specifically comment on whether the sample is adequate (deep enough) to exclude verrucous carcinoma versus pseudoepitheliomatous hyperplasia or a wart, since superficial biopsies are frequently non-diagnostic ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticverrucousscc.html)).
- The CAP protocol notes that grading may reasonably be marked "not applicable" when a subtype with a well-established intrinsic biologic behavior such as verrucous SCC comprises the bulk of the tumor ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)).

---

### 6. Adenosquamous carcinoma (cutaneous)

**a. Morphology**
- Irregular, anastomosing islands of squamous cells, usually originating in the epidermis, arranged in an infiltrative pattern with extensive invasion of the reticular dermis, often within a desmoplastic stroma; deep infiltration can involve nerve, subcutis, muscle and bone ([JAMA Dermatology case series](https://jamanetwork.com/journals/jamadermatology/fullarticle/712218)).
- Squamous differentiation (cytoplasmic cornification) was present in all reported primary tumors, with keratinizing cysts/keratin pearls in ~41% ([JAMA Dermatology case series](https://jamanetwork.com/journals/jamadermatology/fullarticle/712218)).
- Glandular differentiation was present in 96% of primary tumors, occurring within well-differentiated squamous nests, with glands lined by cuboidal-to-low-columnar epithelium, sometimes with an eosinophilic ductular cuticle and variable intraluminal eosinophilic mucin; the glandular component ranged 5–80% of tumor area and tended to be greater in recurrences than primaries ([JAMA Dermatology case series](https://jamanetwork.com/journals/jamadermatology/fullarticle/712218)).
- Severe nuclear atypia was present in 44% of cases; mean mitotic rate 3/10 HPF; no lymphovascular invasion was identified in the series, but perineural invasion was seen in 15% of primaries (rising to 43% of recurrences) ([JAMA Dermatology case series](https://jamanetwork.com/journals/jamadermatology/fullarticle/712218)).

**b. Immunohistochemical panel**
- High-molecular-weight keratin 903 (clone βE12) and carcinoembryonic antigen (CEA) were used in the reference case series to support the diagnosis of glandular/ductal differentiation ([JAMA Dermatology case series](https://jamanetwork.com/journals/jamadermatology/fullarticle/712218)).
- CEA, CK7 and mucin positivity, together with high-molecular-weight keratin positivity, characterize cutaneous adenosquamous carcinoma and separate it from extramammary Paget disease/acantholytic mimics, which are typically negative for high-molecular-weight keratin ([Cutis case report](https://cdn.mdedge.com/files/s3fs-public/CT1040030026_e.PDF)).

**c. Entity-specific reporting statement**
- The report should quantify the proportion of glandular versus squamous components, since a higher glandular fraction correlates with recurrence in the reference series, and should explicitly distinguish this entity from mucoepidermoid carcinoma and from squamous cell carcinoma with mucinous metaplasia ([JAMA Dermatology case series](https://jamanetwork.com/journals/jamadermatology/fullarticle/712218)).
- **Important classification caveat:** the WHO 5th edition of skin tumours no longer includes adenosquamous carcinoma as an SCC subtype; most tumours previously so classified are now considered to show ductal differentiation and are reclassified as squamoid eccrine ductal carcinoma ([Histopathology, WHO Skin5 update](https://onlinelibrary.wiley.com/doi/full/10.1111/his.15562); [PMC10660363](https://pmc.ncbi.nlm.nih.gov/articles/PMC10660363/)). It also does not appear as a distinct dropdown option in the current CAP cutaneous carcinoma protocol's histologic type list ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)).

---

### 7. Clear cell squamous cell carcinoma

**a. Morphology**
- Islands of large oval-to-polyhedral malignant squamous cells with eosinophilic-to-amphophilic cytoplasm and vesicular nuclei, with areas showing clear-cell change; isolated keratin pearl formation and (sometimes) pseudoglandular arrangement may be seen ([J Oral Maxillofac Pathol case report](https://journals.lww.com/jpat/fulltext/2013/17010/clear_cell_variant_of_squamous_cell_carcinoma_of.23.aspx)).
- The clear-cell appearance results from **hydropic degeneration** and intracellular fluid accumulation — not from accumulation of glycogen, lipid, or mucin — and otherwise the tumor's growth pattern and nuclear features are indistinguishable from conventional SCC; the change has no independent prognostic significance ([J Oral Maxillofac Pathol case report](https://journals.lww.com/jpat/fulltext/2013/17010/clear_cell_variant_of_squamous_cell_carcinoma_of.23.aspx); [Indian J Pathol Microbiol review](https://journals.lww.com/ijpm/fulltext/2020/63020/clear_cell_lesions_in_pathology__histomorphologic.5.aspx)).
- Poorly differentiated clear-cell SCC may show no attempted keratinization elsewhere and greatly enlarged pleomorphic nuclei, requiring other tumor areas to show classic keratinizing SCC morphology, or IHC, for confident classification ([Patholines](https://patholines.org/Squamous-cell_carcinoma/)).

**b. Immunohistochemical panel**
- PAS, mucicarmine and Alcian blue are negative in clear cell SCC (confirming absence of glycogen and mucin), while AE1/AE3 is strongly positive, confirming epithelial/squamous lineage ([J Oral Maxillofac Pathol case report](https://journals.lww.com/jpat/fulltext/2013/17010/clear_cell_variant_of_squamous_cell_carcinoma_of.23.aspx)).
- p63/p40 support the squamous cell carcinoma diagnosis when morphology alone is insufficient ([Patholines](https://patholines.org/Squamous-cell_carcinoma/)).
- Versus sebaceous carcinoma: evidence of squamous differentiation (keratin pearls) distinguishes clear cell SCC; specific sebaceous markers (e.g., adipophilin) were not reported in the fetched sources for cutaneous sebaceous carcinoma comparison — flagged as n.a. ([J Oral Maxillofac Pathol case report](https://journals.lww.com/jpat/fulltext/2013/17010/clear_cell_variant_of_squamous_cell_carcinoma_of.23.aspx)).
- Versus balloon cell melanoma: melanoma markers HMB45 and Melan-A are required to exclude melanocytic origin ([Indian J Pathol Microbiol review](https://journals.lww.com/ijpm/fulltext/2020/63020/clear_cell_lesions_in_pathology__histomorphologic.5.aspx)).
- Versus metastatic clear cell renal cell carcinoma: renal cell carcinoma is positive for CAIX, PAX8/PAX2, CD10 and vimentin, and is CK7-negative and AMACR-negative, versus the AE1/AE3-strong, keratin-positive, CAIX-negative profile of clear cell SCC ([Indian J Pathol Microbiol review](https://journals.lww.com/ijpm/fulltext/2020/63020/clear_cell_lesions_in_pathology__histomorphologic.5.aspx)).
- Versus clear cell acanthoma, clear cell hidradenoma/hidradenocarcinoma, tricholemmoma, and pilar tumor with clear cell change: all of these have PAS-positive cytoplasmic glycogen, whereas true clear cell SCC is PAS-negative ([J Oral Maxillofac Pathol case report](https://journals.lww.com/jpat/fulltext/2013/17010/clear_cell_variant_of_squamous_cell_carcinoma_of.23.aspx)).

**c. Entity-specific reporting statement**
- Because the clear-cell change carries no independent prognostic weight, the report should grade the tumor by its conventional (non-clear-cell) cytoarchitectural features and state which special stains (PAS, mucicarmine) were performed to exclude glycogen/mucin-rich mimics ([Indian J Pathol Microbiol review](https://journals.lww.com/ijpm/fulltext/2020/63020/clear_cell_lesions_in_pathology__histomorphologic.5.aspx)).

---

### 8. Squamous cell carcinoma with sarcomatoid differentiation

**a. Morphology**
- Same entity/spectrum as "sarcomatoid SCC" discussed under spindle cell SCC above: poorly differentiated spindle or epithelioid cell tumor with little or no overt squamous morphology, requiring either an associated conventional SCC/SCC in situ component or IHC confirmation of epithelial lineage for diagnosis ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)).
- Sources use "sarcomatoid SCC," "spindle cell SCC," "desmoplastic SCC," and "primary cutaneous sarcomatoid SCC" largely as overlapping/synonymous terms in the literature ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)), though the CAP protocol's histologic type list keeps "Spindle cell squamous cell carcinoma" and "Squamous cell carcinoma with sarcomatoid differentiation" as two separate checkbox options ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)).
- Institutional tumor size range 0.3–10 cm (median 1.4 cm); perineural invasion 14.3%, lymphovascular invasion 8.2% ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)).

**b. Immunohistochemical panel**
- Same panel as spindle cell SCC: p63 or p40, keratin 5/6, CD10, CD163 or CD68, SOX10 or S100, used to separate from AFX/pleomorphic dermal sarcoma and from spindle cell/dedifferentiated melanoma ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)).
- Melanocytic markers (S100, SOX10, MelanA/Mart1, MiTF) were 0% positive across the institutional cohort, providing strong negative support against melanoma ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)).
- WHO 5th edition designates "SCC with sarcomatoid differentiation" as the retained/acknowledged terminology among the uncommon SCC subtypes discussed in the terminology update ([Histopathology, WHO Skin5 update](https://onlinelibrary.wiley.com/doi/full/10.1111/his.15562)).

**c. Entity-specific reporting statement**
- As with spindle cell SCC, the report should record the specific IHC panel used and explicitly state that keratin negativity in up to a third of cases does not exclude the diagnosis in the appropriate context ([MDPI Cancers 2026](https://www.mdpi.com/2072-6694/18/9/1411)).

---

### 9. Squamous cell carcinoma with osteoclast-like giant cells

**a. Morphology**
- A rare variant in which multinucleated osteoclast-type giant cells (OLGCs) are interspersed within (or juxtaposed to) an otherwise poorly differentiated squamous cell carcinoma, most often on sun-damaged head/neck skin of elderly males ([JCIMCR case report](https://jcimcr.org/pdfs/JCIMCR-v4-2694.pdf)).
- The neoplastic epithelial component is markedly atypical with evident squamous differentiation infiltrating the dermis; the OLGCs themselves are morphologically bland — no nuclear atypia or mitoses — favoring a reactive histiocytic process rather than a neoplastic giant-cell component ([JCIMCR case report](https://jcimcr.org/pdfs/JCIMCR-v4-2694.pdf); [PMC6389463](https://pmc.ncbi.nlm.nih.gov/articles/PMC6389463/)).
- Reported cases have shown atypical tumor cells that are spindled/ovoid with prominent nucleoli, and OLGCs described as a "distinctive stromal change" ([PMC6389463](https://pmc.ncbi.nlm.nih.gov/articles/PMC6389463/)).
- The overall SCC component is typically poorly differentiated/high grade ([JCIMCR case report](https://jcimcr.org/pdfs/JCIMCR-v4-2694.pdf); [Case Reports 2019](https://onlinelibrary.wiley.com/doi/full/10.1002/ccr3.1955)).

**b. Immunohistochemical panel**
- Neoplastic squamous cells: positive for CK5/6 and p63/p40; OLGCs are negative for cytokeratins, CK5/6 and p63/p40 ([JCIMCR case report](https://jcimcr.org/pdfs/JCIMCR-v4-2694.pdf); [PMC6389463](https://pmc.ncbi.nlm.nih.gov/articles/PMC6389463/)).
- OLGCs are positive for CD68, supporting a histiocytic/monocyte-lineage (macrophage-fusion) origin ([JCIMCR case report](https://jcimcr.org/pdfs/JCIMCR-v4-2694.pdf); [PMC6389463](https://pmc.ncbi.nlm.nih.gov/articles/PMC6389463/)).
- Anti-histone H3.3 G34W (a giant cell tumor of bone marker) is negative in the OLGCs, supporting that they are reactive rather than a genuine neoplastic giant-cell tumor component ([PMC6389463](https://pmc.ncbi.nlm.nih.gov/articles/PMC6389463/); [Case Reports 2019](https://onlinelibrary.wiley.com/doi/full/10.1002/ccr3.1955)).
- S-100 and Melan-A are negative, excluding a melanocytic lesion; PRAME may highlight the neoplastic cells and has been proposed as a prognostic adjunct ([JCIMCR case report](https://jcimcr.org/pdfs/JCIMCR-v4-2694.pdf)).
- CD51 and TRAP (classic osteoclast markers) were **not** reported/tested in any of the fetched sources — n.a.

**c. Entity-specific reporting statement**
- The report should specifically state that the giant cells are CD68-positive/keratin-negative reactive histiocytes rather than a sarcomatous or neoplastic giant-cell component, since this variant has previously been misdiagnosed as atypical fibroxanthoma or giant cell tumor of bone ([JCIMCR case report](https://jcimcr.org/pdfs/JCIMCR-v4-2694.pdf); [PMC6389463](https://pmc.ncbi.nlm.nih.gov/articles/PMC6389463/)). This variant is reported to carry greater prometastatic potential than conventional SCC ([Case Reports 2019](https://onlinelibrary.wiley.com/doi/full/10.1002/ccr3.1955)). It is not listed as a separate WHO/CAP histologic subtype in the current CAP protocol ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)).

---

### 10. Pseudovascular squamous cell carcinoma (pseudoangiosarcomatous)

**a. Morphology**
- A rare acantholytic SCC variant, also termed pseudovascular/pseudoangiosarcomatous adenoid SCC or angiosarcoma-like SCC, in which extreme acantholysis and necrosis create slit-like or micropapillary vascular-like spaces and pseudovascular cystic areas that mimic angiosarcoma ([Clin Exp Dermatol abstract](https://academic.oup.com/ced/article-abstract/25/3/206/6628101?redirectedFrom=fulltext); [PMC6421930](https://pmc.ncbi.nlm.nih.gov/articles/PMC6421930/)).
- Focal areas of conventional SCC morphology are usually identifiable, typically at the radial tumor edge, confirming squamous lineage ([PMC6421930](https://pmc.ncbi.nlm.nih.gov/articles/PMC6421930/)).
- Prominent stromal eosinophilia has been described in the primary tumor, within pseudovascular cystic areas, and within metastatic foci; its prognostic significance is unclear ([PMC6421930](https://pmc.ncbi.nlm.nih.gov/articles/PMC6421930/)).

**b. Immunohistochemical panel**
- AE1/AE3 is positive and CAM5.2 is focally positive, confirming epithelial origin ([PMC6421930](https://pmc.ncbi.nlm.nih.gov/articles/PMC6421930/)).
- CD34 is negative in tumor cells (versus true vascular tumors, where CD34 highlights endothelial cells), and desmin is negative — jointly excluding angiosarcoma as the leading mimic ([PMC6421930](https://pmc.ncbi.nlm.nih.gov/articles/PMC6421930/)).
- Loss of E-cadherin expression supports loss of tumor cell adhesion as the mechanistic basis of the acantholysis and pseudovascular appearance ([PMC6421930](https://pmc.ncbi.nlm.nih.gov/articles/PMC6421930/)).
- p53 and vimentin were positive in the reported case, though these are not specific discriminators ([PMC6421930](https://pmc.ncbi.nlm.nih.gov/articles/PMC6421930/)).

**c. Entity-specific reporting statement**
- The report should explicitly document that keratin positivity/CD34 negativity was used to exclude a vascular neoplasm, given the striking morphologic overlap with angiosarcoma ([PMC6421930](https://pmc.ncbi.nlm.nih.gov/articles/PMC6421930/)). Pseudovascular SCC is reported to show higher rates of recurrence and metastasis than other SCC variants ([Clin Exp Dermatol abstract](https://academic.oup.com/ced/article-abstract/25/3/206/6628101?redirectedFrom=fulltext)).
- **Important classification caveat:** the WHO 5th edition states pseudovascular SCC is "no longer considered a subtype of SCC" and is explicitly not the recommended term for acantholytic SCC ([Histopathology, WHO Skin5 update](https://onlinelibrary.wiley.com/doi/full/10.1111/his.15562)). It is not listed as a distinct dropdown option in the current CAP protocol's histologic type field ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)).

---

### 11. Lymphoepithelioma-like carcinoma of the skin

**a. Morphology**
- An exceptionally rare, poorly differentiated carcinoma forming well-circumscribed lobules/nests of large cohesive epithelioid cells set within a dense, polymorphous, polytypic T- and B-lymphocytic/plasmacytic infiltrate; the biphasic epithelial-lymphoid pattern may be most apparent at high magnification and the inflammatory component can obscure the epithelial cells, mimicking a lymphoproliferative process ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticLEL.html); [PMC5916400](https://pmc.ncbi.nlm.nih.gov/articles/PMC5916400/)).
- Tumor cells are polygonal with poorly defined eosinophilic cytoplasm, vesicular nuclei with prominent nucleoli, and increased (sometimes atypical) mitotic activity; the epithelial cells typically lack connection with the overlying epidermis and grow as an expansile, well-delimited dermal nodule with a characteristic syncytial arrangement ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticLEL.html); [PMC5916400](https://pmc.ncbi.nlm.nih.gov/articles/PMC5916400/)).
- Focal ductular differentiation or trichilemmal keratinization has rarely been reported, raising the (unresolved) possibility that some cases represent an adnexal rather than squamous neoplasm ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticLEL.html)).

**b. Immunohistochemical panel**
- Cytokeratins AE1/AE3 and CK5/6, together with p63 (nuclear) and EMA, confirm the epithelial/squamous nature of the tumor cells ([PMC5916400](https://pmc.ncbi.nlm.nih.gov/articles/PMC5916400/)).
- CD45 is positive in the reactive inflammatory infiltrate and negative in the tumor cells — the key marker separating carcinoma cells from the accompanying lymphoid population and excluding lymphoma ([PMC5916400](https://pmc.ncbi.nlm.nih.gov/articles/PMC5916400/)).
- **EBER (EBV-encoded RNA in situ hybridization) is negative**, and LMP-1 IHC is also negative — cutaneous lymphoepithelioma-like carcinoma is *not* associated with Epstein–Barr virus, in sharp contrast to its histologic look-alike, lymphoepithelial carcinoma of the nasopharynx/salivary gland/lung/stomach, which is consistently EBV-associated ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticLEL.html); [PMC5916400](https://pmc.ncbi.nlm.nih.gov/articles/PMC5916400/)). This EBER-negative result is the specific test used to exclude **metastatic nasopharyngeal carcinoma** to the skin.
- Melanoma markers (S100, HMB45) and neuroendocrine markers (chromogranin, synaptophysin, CD56) are negative, excluding melanoma and Merkel cell carcinoma respectively; p63 is characteristically negative in neuroendocrine tumors, reinforcing this distinction ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticLEL.html); [PMC5916400](https://pmc.ncbi.nlm.nih.gov/articles/PMC5916400/)).

**c. Entity-specific reporting statement**
- The report must state the EBER (in situ hybridization) result and explicitly note that a negative result supports a primary cutaneous origin over metastatic nasopharyngeal or other EBV-associated lymphoepithelial carcinoma, for which clinical correlation (nasopharyngeal examination/imaging) is recommended ([Pathology Outlines](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticLEL.html); [PMC5916400](https://pmc.ncbi.nlm.nih.gov/articles/PMC5916400/)).
- The WHO 5th edition does not recommend "lymphoepithelioma-like SCC" as terminology, preferring "lymphoepithelial carcinoma" — which is the term actually used in the current CAP protocol's histologic type checklist ([Histopathology, WHO Skin5 update](https://onlinelibrary.wiley.com/doi/full/10.1111/his.15562); [CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)).

---

## General Questions

### G1. Histologic grade for cutaneous SCC

Grading of cutaneous SCC is **not standardized**, and the CAP protocol and RCPath dataset partly diverge on the number of tiers ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true); [RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)).

**CAP protocol (4-tier, as classically used and reproduced in the checklist: G1–G4):**
- **Grade 1 (well-differentiated):** "squamous epithelium that frequently shows easily recognizable and often abundant keratinization. Intercellular bridges are readily apparent. There is minimal pleomorphism, and mitotic figures are mainly basally located." ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true))
- **Grade 2 (moderately differentiated):** "more structural disorganization in which squamous epithelial derivation is less obvious. Nuclear and cytoplasmic pleomorphism are more pronounced, and mitotic figures may be numerous. Keratin formation is typically limited to keratin pearls, horn cysts, and scattered individually keratinized cells." ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true))
- **Grade 3 (poorly differentiated):** "it may be difficult to establish squamous differentiation, usually by identification of rare intercellular bridges or small foci of keratinization." ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true))
- **Grade 4 (undifferentiated):** "Used to denote anaplastic or undifferentiated tumors." ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true))
- The CAP protocol also reproduces the alternative single-parameter **Broders quantitative system**: Grade 1 <25% undifferentiated, Grade 2 ≥25–<50%, Grade 3 ≥50–<75%, Grade 4 ≥75% undifferentiated ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)).
- For management, grade is typically collapsed to two tiers, with grades 3–4 (poorly differentiated/undifferentiated) forming the high-risk category, although CAP notes even moderately differentiated (grade 2) tumors may show greater subclinical spread, and grade 2 shows the highest interobserver variability ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)).
- CAP explicitly recommends recording histologic type as "not applicable" for grade when a subtype with well-established intrinsic behavior (e.g., verrucous SCC) predominates ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)).

**RCPath dataset (3-tier: well/moderately/poorly differentiated — note this differs from the CAP/AJCC 4-tier system):**
- RCPath states that "UICC and AJCC…equate Grades 1, 2, 3 and 4 with well, moderately, poorly and undifferentiated, respectively, but accept that Grades 3 and 4 can be combined," but after consultation RCPath itself adopted a **three-grade classification** incorporating cytological features and mitotic activity, explicitly considering and rejecting the Broders percentage method ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)).
- RCPath's three grades are worded almost identically to CAP's Grades 1–3 (well: "squamous epithelium that frequently shows easily recognisable and often abundant keratinisation…intercellular bridges (prickles) are readily apparent…minimal pleomorphism and mitotic figures mainly basally located"; moderately: "more structural disorganisation…nuclear and cytoplasmic pleomorphism is more pronounced…keratin formation…limited to…keratin pearls…horn cysts and scattered individual keratinised cells"; poorly: "may be difficult to establish the true nature of the lesion unless intercellular bridges are identified or small foci of keratinisation found. Rarely, the tumour is completely anaplastic…immunohistochemical demonstration of keratin expression is often of value.") ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)).

**Does the worst area govern?**
- **RCPath: Yes, explicitly.** "This dataset has adopted the widely recognised approach that a tumour should be classified according to its most poorly differentiated region, irrespective of the percentage present. This approach is also advocated by the NCCN and is used in some other RCPath cancer datasets." The percentage of each differentiated component can optionally be entered as a non-core item ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)).
- **CAP: not explicitly stated in this protocol version.** The CAP protocol text fetched does not contain an explicit "worst-area-governs" instruction analogous to RCPath's; it only presents the two alternative grading systems (qualitative 4-tier and Broders percentage) side by side without directing which region of a heterogeneous tumor to use — this point should be recorded as **n.a. for CAP** based on the text fetched ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)).
- AJCC TNM 8, per RCPath's characterization, provides broad two-tier definitions only ("low-grade" = considerable differentiation, uniform cell size, infrequent mitoses/nuclear irregularity, intact intercellular bridges; "high-grade" = poor differentiation, frequent spindle cell features, necrosis, high mitotic activity) and gives **no guidance on the percentage of differentiated component required** to establish grade — this gap is exactly why RCPath adopted the worst-area rule ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)).

### G2. Anatomic (Clark) level I–V, as used in the CAP cutaneous carcinoma protocol

Per the CAP protocol's exact wording:
- **I** — Intraepidermal tumor only
- **II** — Tumor present in but does not fill and expand papillary dermis
- **III** — Tumor fills and expands papillary dermis
- **IV** — Tumor invades into reticular dermis
- **V** — Tumor invades subcutis
([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true))

Note the discrepancy with RCPath practice: RCPath explicitly recommends **against** using Clark levels for cutaneous SCC where possible, stating "Clark levels are defined in detail in the RCPath melanoma dataset but in general, when possible, it is recommended that they not be used for cSCC," and further notes that under TNM 8 assessment of level of invasion is "simplified by the absence of a requirement to specify invasion into the papillary dermis (Clark level II), interface between the papillary and reticular dermis (Clark level III) or the reticular dermis (Clark level IV)" — i.e., RCPath/TNM 8 practice reduces this essentially to a binary distinction of invasion beyond versus not beyond the subcutaneous fat (Clark level 5) ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)).

### G3. Tumour thickness / depth of invasion (DOI): measurement and "deep invasion"

**CAP protocol:**
- "Whenever possible, DOI, as measured from the granular layer of the adjacent normal epidermis to the base of the tumor is recommended for determining T status. This DOI is measured at a right angle to the adjacent normal skin, with the upper point of reference the granular layer of the epidermis of the adjacent uninvolved epidermis. The lower reference point is the deepest point of tumor invasion (i.e., the leading edge of a single mass or an isolated group of cells deep to the main mass)." ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true))
- "If the tumor is transected by the deep margin of the specimen, the thickness may be indicated as 'at least __ mm' with a comment explaining the limitation of thickness assessment." ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true))
- **"Deep invasion" (verbatim, footnote to pT):** "Deep invasion is defined as invasion beyond the subcutaneous fat (i.e., to underlying microanatomic landmarks such as fascia, muscle, perichondrium, and/or periosteum) or greater than 6 mm (as measured from the granular layer of adjacent normal epidermis to the base of the tumor)." ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true))

**RCPath dataset:**
- "*Tumour thickness/depth is stated to be measured in millimetres from the granular layer of the nearest normal adjacent epidermis to the base of the tumour" and "UICC and AJCC TNM 8 regards a thickness >6 mm as deep invasion and a solitary high-risk factor that upstages T1 or T2 to T3" ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)).
- RCPath stratifies thickness/depth as a core item into bands: ≤2 mm, >2–4 mm, >4–6 mm, and >6 mm, and separately flags invasion beyond the subcutaneous fat (beyond Clark level 5) as a distinct high-risk determinant ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)).
- RCPath provides **provisional practical guidance for difficult measurement scenarios** not fully covered by TNM 8: (1) for cup-shaped/crateriform (e.g., follicular-variant) tumors, thickness should be measured from the lowest bottom edge of the central lumen/space to the deepest tumor base (the Fernandez-Flores method), provided invasiveness (irregular/budding border) is confirmed; (2) for exophytic tumors that arise entirely at or above the level of the adjacent granular layer, thickness should be recorded as "<2 mm" rather than a zero/negative value; (3) where the adjacent epidermis is sloping/irregular/undulating and no model fits, RCPath recommends recording "absolute thickness" (i.e., total vertical span of the tumor rather than a granular-layer-referenced measurement), used as free text with an explanatory comment ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)).

**Agreement:** CAP and RCPath agree on the reference points (granular layer of adjacent normal epidermis → deepest point of invasion) and on the ">6 mm" and "beyond subcutaneous fat" dual criteria defining "deep invasion" under AJCC/UICC TNM 8 ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true); [RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)).

### G4. Perineural invasion (PNI): the 0.1 mm calibre rule and "nerve deeper than the dermis" rule

**CAP protocol (verbatim, T3 footnote):** "perineural invasion for T3 classification is defined as tumor cells within the nerve sheath of a nerve lying deeper than the dermis or measuring 0.1 mm or larger in caliber, or presenting with clinical or radiographic involvement of named nerves without skull base invasion or transgression." ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true))
- CAP's discussion (Note E) adds: "the diameter of involved nerve is more studied and a diameter of greater than or equal to 0.1 mm is included in the definition of 'deep invasion' in pT status… Location of the involved nerve deep to the dermis serves as a surrogate for this size cut-off and can be used even in the absence of a reticle or ocular micrometer to help assign a pT category. In other words, the size of involved nerves deep to the dermis can be classified as greater than or equal to 0.1 mm." ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)) — i.e., CAP treats "nerve deeper than the dermis" as a practical surrogate for the 0.1 mm calliper measurement, not an independent additional criterion.

**RCPath dataset:** "Perineural invasion, when conforming to specified defined criteria, is a high-risk feature that upstages T1 or T2 to T3. The criteria include a named nerve or large calibre ≥0.1 mm diameter or beyond the dermis. AJCC TNM 8 contains all the criteria, whereas UICC TNM 8 is currently confined to a named nerve, which may include clinical or imaging detection. Named nerves and those beyond the dermis are invariably large calibre in type, over 0.1 mm in diameter. On that basis, it appears appropriate to apply all of these criteria." ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf))
- RCPath additionally flags a diagnostic pitfall: in re-excision specimens, "apparent perineural invasion" may actually represent benign perineural epithelial cells from reactive/reparative proliferation of traumatized eccrine ducts into a plane of lower resistance ("re-excision perineural invasion"), which IHC can help exclude ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)).

**AJCC 8th vs UICC 8th wording (per RCPath's summary):** AJCC TNM 8 applies the **full triad** of criteria (named nerve OR ≥0.1 mm calibre OR beyond the dermis) as upstaging criteria to T3, whereas UICC TNM 8 is, per RCPath, **"currently confined to a named nerve"** (which may include clinical/imaging detection), i.e., UICC's stated criterion is narrower on paper, though RCPath notes this is largely moot in practice because named nerves and nerves beyond the dermis are "invariably" ≥0.1 mm in calibre anyway ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)). This is a source disagreement worth flagging rather than resolving: RCPath's own text explicitly notes the AJCC/UICC wording difference.

### G5. pN size cut-off (3 cm / 6 cm): metastatic deposit size or lymph node size? ENE definition.

**This is a point of explicit disagreement between the two source documents that must be reported, not resolved:**

- **CAP protocol (verbatim):** "pN1: Metastasis in a single ipsilateral lymph node, 3 cm or smaller in greatest dimension and ENE(-)"; "pN2: Metastasis in a single ipsilateral lymph node, 3 cm or smaller in greatest dimension and ENE(+); or larger than 3 cm but not larger than 6 cm in greatest dimension and ENE(-)…"; "pN3: Metastasis in a lymph node larger than 6 cm in greatest dimension and ENE(-)…" ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)). The phrase used throughout is "lymph node…in greatest dimension" — i.e., CAP's pN wording applies the 3 cm/6 cm cut-offs to the **size of the involved lymph node**, not explicitly to the metastatic tumor deposit within it. Also note the CAP data-element list separately captures "Size of Largest Nodal Metastatic Deposit" (in cm) as its own distinct field from lymph node size, implying CAP itself treats these as two different measurements, only one of which (node size) is used for the pN formula text as fetched ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)).

- **RCPath dataset (verbatim, direct contradiction):** For "Skin carcinoma of head and neck (excluding vermillion lip)": "pN1 Metastasis in a single ipsilateral lymph node ≤30 mm in greatest dimension, without extranodal extension… pN2a Metastasis in a single ipsilateral lymph node, more than 30 mm but not >60 mm in greatest dimension, without extranodal extension… pN3a Metastasis in a lymph node, >60 mm in greatest dimension, without extranodal extension" ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)) — this wording again refers to the lymph node's own greatest dimension. **However**, RCPath's separate specimen-handling section (5.3.9, on lymph nodes generally, i.e. for the trunk/limb skin carcinoma pN system rather than the head-and-neck-specific one) states explicitly and verbatim: **"The number of involved regional and/or intraparotid nodes and the size of the largest metastatic deposit are primary pN staging determinants. There are staging breakpoints at 30 mm and 60 mm. Note that size relates to metastatic deposit and not lymph node."** ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)).

- **Net assessment:** The pN category *wording* in both the CAP protocol and the RCPath head-and-neck skin carcinoma pN definitions is phrased in terms of the lymph node's own "greatest dimension." But RCPath's explanatory prose in its specimen-handling section states in plain language that "size relates to metastatic deposit and not lymph node" — an instruction that appears in tension with the formal pN wording quoted just above it in the same document, and this exact tension is reproduced faithfully here rather than adjudicated. The practical corollary given by RCPath is that nodes should be sliced at 4–5 mm intervals specifically to allow "measurement of the maximum diameter of the largest metastasis," and that "the dimensions of the largest macroscopic metastatic deposit should be recorded," which is operationally about measuring the deposit within the node during grossing — but the formal category thresholds as literally worded reference the lymph node's dimension ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)). Given the sources disagree/are internally in tension, this is reported as a disagreement rather than resolved in favor of one reading.

**Extranodal extension (ENE) definition for pathological staging:**
- RCPath (verbatim): "ENE is a staging parameter for skin carcinoma of the head and neck (but not for carcinoma of the skin) and its presence signifies pN3b. ENE is defined as invasion beyond the nodal capsule into the surrounding soft tissue, although a stromal reaction is not required. ENE detected on histological examination is designated as ENEmi (microscopic ENE ≤2 mm) or ENEma (major ENE >2 mm), although both qualify as just ENE for pN staging. ENE can also be identified on a clinical basis." ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf))
- The CAP protocol's regional lymph node section records ENE simply as a binary "Not identified / Present / Cannot be determined" data field, without providing its own explicit histologic definition of ENE in the text fetched ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true)) — the microscopic/major (ENEmi/ENEma) distinction is a term found in the RCPath source but not (in the text retrieved) explicitly defined in the CAP protocol.

### G6. Brigham and Women's Hospital (BWH) tumour staging

Per the CAP protocol (verbatim):

> "Brigham and Women's Hospital (BWH) Tumor Staging
> The Brigham and Women's Hospital (BWH) system is an alternative tumor classification system. Prior analysis from a single institution cohort demonstrated that the BWH staging system offers improved distinctiveness, homogeneity, and monotonicity over the AJCC 7th edition staging system. Compared to the AJCC 8th edition staging system, BWH had higher specificity and positive predictive value for identifying cases at risk for metastasis or death. A systematic review of sentinel node biopsy in CSCC demonstrated that BWH T2b/T3 tumors have a high risk of sentinel node positivity (29.4%).
>
> pT0 — In situ SCC
> pT1 — 0 high-risk factors*
> pT2a — 1 high-risk factor*
> pT2b — 2–3 high-risk factors*
> pT3 — 4 risk factors* or bone invasion
>
> *BWH staging high-risk features:
> - Clinical tumor diameter greater than or equal 2 cm
> - Tumor invasion beyond subcutaneous fat, excluding bone invasion, which upgrades tumor to stage pT3
> - Poorly differentiated histology
> - Perineural invasion of nerve(s) greater than or equal 0.1 mm in caliber"

([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true))

---

### Summary of source disagreements identified

| Topic | Disagreement |
|---|---|
| Grading tiers | CAP/AJCC use a classical 4-tier system (G1–G4, well/moderate/poor/undifferentiated), with Broders' percentage method as an alternative; RCPath adopted a 3-tier system (well/moderate/poor) and explicitly rejected the Broders percentage method after consultation ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true); [RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)) |
| "Worst area governs" grading rule | Stated explicitly by RCPath; not explicitly stated in the CAP protocol text fetched (n.a. for CAP) ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)) |
| Clark levels | Listed and defined I–V in the CAP protocol; RCPath recommends against using Clark levels for cSCC where possible ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true); [RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)) |
| PNI upstaging criteria, AJCC vs UICC | RCPath states AJCC TNM 8 applies the full triad (named nerve / ≥0.1 mm / beyond dermis) while UICC TNM 8 is "currently confined to a named nerve" ([RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)) |
| pN size cut-off — node vs deposit | CAP and RCPath's formal pN wording both reference the lymph node's "greatest dimension"; RCPath's specimen-handling prose separately and explicitly states "size relates to metastatic deposit and not lymph node" — an internal tension within the RCPath document itself, reproduced here rather than resolved ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true); [RCPath dataset](https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf)) |
| Histologic subtype terminology and current WHO status | The CAP protocol (v1.2.0.0, current) and the QMH template both retain "keratoacanthoma-type," "adenosquamous carcinoma," "osteoclast-like giant cell SCC" and "pseudovascular SCC" (the latter two not in CAP's own dropdown; adenosquamous also not in CAP's dropdown), while the WHO 5th edition explicitly discontinues pseudovascular SCC and adenosquamous carcinoma as SCC subtypes and treats keratoacanthoma as likely a separate entity ([CAP protocol](https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true); [Histopathology, WHO Skin5 update](https://onlinelibrary.wiley.com/doi/full/10.1111/his.15562)) |

### Notes on evidence gaps (n.a.)

- CD51 and TRAP (classic osteoclast-lineage IHC markers) were not reported in any fetched source for SCC with osteoclast-like giant cells; only CD68 positivity is documented — marked n.a. for CD51/TRAP.
- A dedicated adipophilin/sebaceous-marker comparison for clear cell SCC vs sebaceous carcinoma was not found in the fetched sources — marked n.a.
- The CAP protocol text fetched does not contain an explicit statement on whether grading should follow the worst area for cutaneous SCC (unlike RCPath, which states this explicitly) — marked n.a. for CAP on this specific point.
- The CAP protocol's own explicit histologic/microscopic definition of ENE (beyond a present/not-identified checkbox) was not found in the text fetched — marked n.a. for CAP's own definition (RCPath's definition is available and quoted above).
