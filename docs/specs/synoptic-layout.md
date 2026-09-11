# Synoptic report layout (sections, nesting, tumour histology)

Status: agreed with the user 2026-09-11; not yet built (roadmap card in Next).

## Rules

1. QMH element order is sacred. Only headings, blank lines and indentation are added; no element moves. One approved exception: the Tumour histology element (rule 5).
2. Section headings in sentence case, one blank line between sections, one shared vocabulary mapped from the QMH legends:

   | Heading | Endometrium (no QMH legend) | GIST legend | Colorectal legend |
   | --- | --- | --- | --- |
   | Specimen and tumour | procedure … tumour size | Gross descriptions | Gross descriptions |
   | Microscopic findings | histologic type … peritoneal / ascitic fluid | Microscopic descriptions | Microscopic descriptions |
   | Margins | Surgical margins of excision specimen | Surgical margins | Surgical margins for … |
   | Lymph nodes / Regional lymph nodes | Pelvic lymph nodes + Para-aortic lymph nodes | Regional lymph nodes | Lymph nodes examination |
   | Distant metastasis | Distant Metastasis | Distant Metastasis | Distant Metastasis |
   | Pathological stage (AJCC 8th edition) | only when the pTNM option is on | Pathologic Stage Classification (AJCC 8e) | same |
   | Additional findings | Additional pathologic findings | (notes only) | Additional pathologic findings (incl. MMR IHC, which stays here) |

   Endometrium's Microscopic findings block is long (type through fluid); no sub-heading is inserted because the QMH page has none there.
3. Every element keeps its `- ` bullet. QMH sub-elements print as nested `  - ` lines under their parent (depth / thickness / percentage of myoinvasion; cervical stromal depth / thickness; node macro / micro / ITC counts, apical counts, laterality, largest deposit, extranodal extension; budding hotspot count; stage group under pTNM).
4. Values wrap at 80 characters with a two-space hanging indent; spaces only, never tabs.
5. `- Tumour histology:` follows Histologic grade in all three templates. For GIST and colorectal this is a deliberate, user-approved departure from the QMH page, whose "Tumor histology and immunohistochemical studies" element opens the microscopic block; the element-order tests carry this single exception. The paragraph runs on the following lines at two-space indent and carries only architecture, cytology, differentiation, necrosis and invasion pattern (GIST: cell type, arrangement, cytoplasm, nuclei, necrosis; colorectal: gland pattern, mucinous / signet-ring component, necrosis — a new `tumourMorphology` field set, since the template has none today). Extent, LVSI, nodes, IHC, molecular, margins and risk are not repeated in prose.
6. The separate narrative microscopy paragraph is dropped for synoptic templates; the block heading is `MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT` (block headings stay in capitals like the other LIS block headings; only the section headings inside are sentence case). No switch back.
7. Additional findings print one bullet each.
8. Diagnosis: specimen line, then one `- ` clause per line with hanging indent. `Copy diagnosis` copies the multi-line form. COMMENT block unchanged.

## Agreed example — endometrium fixture 01

```
MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT

Specimen and tumour
- Procedure: Total hysterectomy and bilateral salpingo-oophorectomy; sentinel
  lymph node biopsy
- Hysterectomy type: Laparoscopic, robotic-assisted
- Specimen integrity: Intact
- Tumour site: Endometrium (posterior wall and fundus)
- Tumour size: 35 mm in greatest dimension (35 x 30 x 12 mm)

Microscopic findings
- Histologic type: Endometrioid carcinoma
- Histologic grade: FIGO grade 1 (endometrioid carcinoma)
- Tumour histology:
  Sections show an endometrioid carcinoma with a predominantly glandular
  architecture of confluent, back-to-back glands lined by stratified columnar
  cells with elongated, mildly to moderately atypical nuclei; solid
  non-squamous growth makes up 5% or less of the tumour. There is squamous
  differentiation with morules and keratinising nests. Tumour necrosis is not
  seen. Myometrial invasion is by irregular infiltrative glands eliciting a
  stromal response.
- Mismatch repair (MMR) immunohistochemistry: Intact nuclear expression of
  MLH1, PMS2, MSH2 and MSH6
- p53 immunohistochemistry: Normal (wild type) expression
- POLE status: Wild-type
- Molecular classification: No specific molecular profile (NSMP)
- Other immunohistochemistry: ER and PR positive
- Myometrial invasion: Estimated less than 50% myometrial invasion
  - Depth of myometrial invasion: 6 mm
  - Myometrial thickness: 18 mm
  - Percentage of myometrial invasion: 33%
- Adenomyosis: Not identified
- Uterine serosa involvement: Not identified
- Lower uterine segment involvement: Not identified
- Cervical stromal involvement: Not identified
- Other tissue / organ involvement: Not identified
- Lymphovascular invasion: Not identified
- Perineural invasion: Not identified
- Peritoneal / ascitic fluid: Not submitted / unknown

Margins
- Ectocervical / vaginal cuff margin: Uninvolved by carcinoma
- Parametrial / paracervical margin: Not applicable

Lymph nodes
- Pelvic lymph nodes: 3 examined; 0 involved; includes sentinel lymph node(s)
- Para-aortic lymph nodes: No lymph nodes submitted or found

Distant metastasis
- Distant metastasis: Not identified

Additional findings
- Atypical hyperplasia / endometrial intraepithelial neoplasia (EIN)
- Leiomyomas

DIAGNOSIS
UTERUS WITH CERVIX AND BILATERAL ADNEXA, total hysterectomy and bilateral
salpingo-oophorectomy with sentinel lymph node biopsy
- ENDOMETRIOID CARCINOMA, FIGO grade 1, invading less than half of the
  myometrium
- no lymphovascular space invasion; cervix and adnexa uninvolved
- 0 of 3 pelvic lymph nodes involved
- molecular class NSMP
```

## Agreed example — GIST (schema example, stomach wedge)

```
MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT

Specimen and tumour
- Procedure: Wedge resection
- Tumour site: Stomach (greater curvature, body)
- Tumour size: 4.5 cm in greatest dimension (4.5 x 3.8 x 3.0 cm)
- Tumour focality: Unifocal
- Tumour rupture: Not identified

Microscopic findings
- Histologic type: Gastrointestinal stromal tumour, spindle cell type
- Histologic grade: G1: Low grade; mitotic rate 5 or fewer per 5 mm2
- Tumour histology:
  Sections show a well-circumscribed gastrointestinal stromal tumour composed
  of spindle cells arranged in fascicles, with pale eosinophilic cytoplasm and
  uniform ovoid nuclei. Necrosis is not identified.
- Mitotic count: 2 per 5 mm2 (5 or fewer per 5 mm2)
- Necrosis: Not identified
- KIT (CD117) IHC: Positive
- DOG1 IHC: Positive
- SDHB IHC: Not performed
- Other immunohistochemistry: desmin, S100 and SOX10 negative
- Lymphovascular invasion: Not identified
- Perineural invasion: Not identified
- Risk assessment (Miettinen and Lasota 2006): Very low risk (stomach, 4.5 cm,
  2 mitoses per 5 mm2)
- Presurgical treatment: No known presurgical therapy
- Treatment effect: No known presurgical therapy
- Molecular studies: Requested; result to follow (block 3)

Margins
- Surgical margins: Uninvolved by GIST (8 mm from the gastric resection margin)

Regional lymph nodes
- Regional lymph nodes: No regional lymph nodes submitted or found

Distant metastasis
- Distant metastasis: Not applicable

Pathological stage (AJCC 8th edition)
- pTNM: pT2 pNX
  - Stage group (if cM0): IA

DIAGNOSIS
STOMACH, wedge resection
- GASTROINTESTINAL STROMAL TUMOUR, spindle cell type, 4.5 cm, mitotic count
  2 per 5 mm2
- very low risk (Miettinen and Lasota 2006); margins clear
- pT2 pNX (AJCC 8th edition), stage IA (if cM0)
- KIT and DOG1 positive; molecular studies to follow

COMMENT
Mutation analysis for KIT and PDGFRA hot spots has been requested and will be
issued as a supplementary report. The result guides tyrosine kinase inhibitor
selection and dosing.
```

## Agreed example — colorectal (schema example, right hemicolectomy)

```
MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT

Specimen and tumour
- Procedure: Right hemicolectomy
- Tumour site: Ascending colon
- Tumour size: 45 mm in greatest dimension (45 x 38 mm)
- Macroscopic tumour perforation: Not identified

Microscopic findings
- Histologic type (WHO 2019): Adenocarcinoma
- Histologic grade: G2: Moderately differentiated
- Tumour histology:
  Sections show an invasive moderately differentiated adenocarcinoma arising
  in a tubulovillous adenoma, forming irregular glands with a desmoplastic
  stromal response and luminal dirty necrosis.
- Multiple primary tumours: Not applicable (no additional primary site)
- Tumour extension: Invades through muscularis propria into pericolorectal
  tissue
- Lymphatic and / or vascular invasion: Small vessel
- Perineural invasion: Not identified
- Tumour budding (ITBCC 2016): Low score (Bd1, 0-4 buds)
  - Hotspot count: 3 buds in 1 field
- Type of polyp in which invasive carcinoma arose: Tubulovillous adenoma
- Tumour deposits: Not identified
- Treatment effect (modified Ryan scheme, 2005): No known presurgical therapy

Margins
- Proximal margin: Uninvolved by invasive carcinoma (90 mm)
- Distal margin: Uninvolved by invasive carcinoma (100 mm)
- Radial or mesenteric margin: Uninvolved by invasive carcinoma (15 mm)

Regional lymph nodes
- Regional lymph nodes: 22 examined; 2 involved
  - Apical lymph nodes: 1 examined; 0 involved
  - Extranodal extension: Not identified
  - Largest metastatic deposit: 6 mm

Distant metastasis
- Distant metastasis: Not applicable

Pathological stage (AJCC 8th edition)
- pTNM: pT3 pN1b
  - Stage group (if cM0): IIIB

Additional findings
- Diverticulosis
- Mismatch repair immunohistochemistry: Retained (MLH1, PMS2, MSH2, MSH6)

DIAGNOSIS
ASCENDING COLON, right hemicolectomy
- INVASIVE ADENOCARCINOMA, moderately differentiated (G2), invading through
  the muscularis propria into the pericolic tissue
- lymphovascular invasion present; 2 of 22 lymph nodes involved; margins
  clear
- pT3 pN1b (AJCC 8th edition), stage IIIB (if cM0)
- MMR proficient
```

The colorectal histology sentence about glands, desmoplasia and dirty necrosis is a placeholder for the new `tumourMorphology` fields; the built wording will follow the field values.

SPECIMENS, MACROSCOPIC EXAMINATION and BLOCK KEY blocks are unchanged and precede the synoptic in every case.

## Fixture log

- (at build) all endometrium fixtures, GIST and colorectal expectations regenerated for the new layout; reason "synoptic layout".
