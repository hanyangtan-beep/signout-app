# Synoptic report layout (sections, nesting, tumour histology)

Status: agreed with the user 2026-09-11; not yet built (roadmap card in Next).

## Rules

1. QMH element order is sacred. Only headings, blank lines and indentation are added; no element moves.
2. Section headings in capitals, taken from each QMH page's own legends; one blank line between sections. Endometrium: SPECIMEN, TUMOUR, EXTENT OF INVASION, MARGINS, LYMPH NODES, DISTANT METASTASIS, ADDITIONAL FINDINGS (pTNM as its own section after DISTANT METASTASIS when the option is on). GIST and colorectal mappings to be recorded here from `tests/fixtures/qmh/GI-GIST.html` and `GI-Colon-and-rectum.html` at build.
3. Every element keeps its `- ` bullet. QMH sub-elements print as nested `  - ` lines under their parent.
4. Values wrap at 80 characters with a two-space hanging indent; spaces only, never tabs.
5. `- Tumour histology:` is inserted where the QMH microscopic block begins (after Histologic type / grade). Its paragraph runs on the following lines at two-space indent and carries only architecture, cytology, differentiation, necrosis and invasion pattern; extent, LVSI, nodes and IHC are not repeated in prose.
6. The separate narrative microscopy paragraph is dropped for synoptic templates; the block heading is `MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT`. No switch back.
7. Additional findings print one bullet each.
8. Diagnosis: specimen line, then one `- ` clause per line with hanging indent.

## Agreed example (endometrium fixture 01)

```
MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT

SPECIMEN
- Procedure: Total hysterectomy and bilateral salpingo-oophorectomy; sentinel
  lymph node biopsy
- Hysterectomy type: Laparoscopic, robotic-assisted
- Specimen integrity: Intact
- Tumour site: Endometrium (posterior wall and fundus)
- Tumour size: 35 mm in greatest dimension (35 x 30 x 12 mm)

TUMOUR
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

EXTENT OF INVASION
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

MARGINS
- Ectocervical / vaginal cuff margin: Uninvolved by carcinoma
- Parametrial / paracervical margin: Not applicable

LYMPH NODES
- Pelvic lymph nodes: 3 examined; 0 involved; includes sentinel lymph node(s)
- Para-aortic lymph nodes: No lymph nodes submitted or found

DISTANT METASTASIS
- Distant metastasis: Not identified

ADDITIONAL FINDINGS
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

SPECIMENS, MACROSCOPIC EXAMINATION and BLOCK KEY blocks are unchanged and precede this.

## Fixture log

- (at build) all endometrium fixtures, GIST and colorectal expectations regenerated for the new layout; reason "synoptic layout".
