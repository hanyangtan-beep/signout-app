# Trailing negatives (Phase 66)

Status: **built 2026-10-11**, at the user's request: "I noticed for a lot of templates, it will end
with a default of 'no dysplasia or malignancy' or 'negative for dysplasia or malignancy', I want to
change this behavior, because it is repetitive." The scope was approved after a survey of every
template and the released reports (project file `signout-app/specs/trailing-negatives-proposal.md`).

## Rule

1. A named benign diagnosis stands alone: "GALLBLADDER, cholecystectomy - CHRONIC CHOLECYSTITIS".
2. When there is nothing to name, the negative is the diagnosis: "NO EVIDENCE OF MALIGNANCY" (or the
   site's own form, such as "NO EVIDENCE OF DYSPLASIA OR MALIGNANCY" on bladder samples).
3. The microscopy keeps its single closing negative sentence, so each report still says it once.

There is no case-level switch. The user's decisions: routine benign specimens take the entity alone;
lesions where malignancy is the clinical question drop the tail as well; the microscopy is kept as
is. After review the user also dropped the tail on breast margin shaves, bladder samples, salivary
gland, testis and foreskin, and a polyp in a cervical biopsy, and chose the LSIL form for condyloma.

## Templates changed (24)

| Template | Before | After |
|---|---|---|
| appendix | ACUTE SUPPURATIVE APPENDICITIS; no evidence of dysplasia or malignancy | ACUTE SUPPURATIVE APPENDICITIS |
| gallbladder | CHRONIC CHOLECYSTITIS; no evidence of dysplasia or malignancy | CHRONIC CHOLECYSTITIS ("see comment" after neoplasia stays) |
| jaw_cyst | RADICULAR CYST; no evidence of dysplasia or malignancy | RADICULAR CYST (a periapical granuloma keeps "no epithelial lining identified") |
| stoma | ILEOSTOMY with REACTIVE AND PROLAPSE-TYPE CHANGES; no evidence of dysplasia or malignancy | ILEOSTOMY with REACTIVE AND PROLAPSE-TYPE CHANGES |
| thyroid_benign | NODULAR HYPERPLASIA; no evidence of malignancy | NODULAR HYPERPLASIA (also adenomatoid nodule, follicular adenoma, Graves disease, thyroiditis) |
| tonsils | REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA; no evidence of malignancy | REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA |
| nasal_polyps | INFLAMMATORY (OEDEMATOUS) SINONASAL POLYPS; no evidence of dysplasia or malignancy | INFLAMMATORY (OEDEMATOUS) SINONASAL POLYPS (also the granulomatous lines) |
| duodenal_biopsy | ACTIVE PEPTIC DUODENITIS; no evidence of dysplasia or malignancy | ACTIVE PEPTIC DUODENITIS (also the coeliac-pattern lines) |
| oesophageal_biopsy | SQUAMOUS MUCOSA with NO SIGNIFICANT HISTOLOGICAL ABNORMALITY; no evidence of dysplasia or malignancy | the line alone; columnar and Barrett's lines keep their dysplasia status |
| uterus_benign | LEIOMYOMAS; proliferative endometrium; cervix with no evidence of squamous intraepithelial lesion or malignancy | LEIOMYOMAS; proliferative endometrium (the cervix is named only when it has a finding; also the myomectomy, subtotal and adnexa lines) |
| abscess_granulation | GRANULATION TISSUE; NO EVIDENCE OF MALIGNANCY | GRANULATION TISSUE (also slough and acute on chronic inflammation) |
| ovarian_cyst | FIBROMA; no evidence of malignancy | FIBROMA |
| skin_cyst | …; no residual cyst lining identified; no evidence of malignancy | …; no residual cyst lining identified |
| lung_biopsy | BRONCHIAL MUCOSA with NO SIGNIFICANT ABNORMALITY; no evidence of granuloma, dysplasia or malignancy | BRONCHIAL MUCOSA with NO SIGNIFICANT ABNORMALITY (also granulomas and organisms) |
| nasopharyngeal_biopsy | REACTIVE LYMPHOID HYPERPLASIA; no evidence of malignancy | REACTIVE LYMPHOID HYPERPLASIA (also the granulomatous lines) |
| breast_excision | BREAST, superior margin, resection - FAT NECROSIS; no evidence of malignancy | BREAST, superior margin, resection - FAT NECROSIS |
| soft_tissue_benign | FAT NECROSIS; NO EVIDENCE OF MALIGNANCY | FAT NECROSIS (also organising haematoma, scar, foreign-body reaction) |
| bone_joint | RECENT FRACTURE; NO EVIDENCE OF MALIGNANCY | RECENT FRACTURE (also fracture callus) |
| cns_biopsy | DEMYELINATING LESION; no evidence of malignancy | DEMYELINATING LESION (also abscess) |
| liver_lesion_biopsy | ABSCESS; no malignancy identified | ABSCESS (also hydatid cyst, inflammatory pseudotumour) |
| turbt | CYSTITIS CYSTICA ET GLANDULARIS; no evidence of dysplasia or malignancy | CYSTITIS CYSTICA ET GLANDULARIS (every named benign finding, on every sample type) |
| salivary_benign | CHRONIC SIALADENITIS; no evidence of malignancy | CHRONIC SIALADENITIS (also Küttner tumour and the reactive intraparotid node) |
| testis_benign | TESTICULAR ATROPHY; NO EVIDENCE OF MALIGNANCY | TESTICULAR ATROPHY (also chronic inflammation of the foreskin) |
| cervical_biopsy | ENDOCERVICAL POLYP; no evidence of dysplasia or malignancy | ENDOCERVICAL POLYP, as the polypectomy reads |
| cervical_biopsy | CONDYLOMA ACUMINATUM; no evidence of dysplasia or malignancy | LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL / CONDYLOMA ACUMINATUM) |

The lung change also fixes a wording slip: without granulomas, squamous dysplasia printed
"…; no evidence of granuloma, malignancy". Dysplasia now reads "…LOW GRADE DYSPLASIA; no evidence of
malignancy" and carcinoma in situ "SQUAMOUS CELL CARCINOMA IN SITU; no evidence of invasive malignancy".
The uterus change removes a contradiction: a hysterectomy with LSIL of the cervix no longer ends "no
evidence of dysplasia or malignancy".

## Condyloma

LAST designates condyloma acuminatum as LSIL, with "condyloma" as an optional qualifier
([LAST Standardization Project, Arch Pathol Lab Med 2012](https://documents.cap.org/documents/2012-arpa.lgt200570-v136.pdf)).
The condyloma ranks with LSIL in `generators/cervical.js`:

- Alone: "LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL / CONDYLOMA ACUMINATUM)".
- With LSIL (CIN I): "LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL / CIN I AND CONDYLOMA ACUMINATUM)".
- With HSIL or carcinoma: the higher grade line first, then the condyloma line.
- Microscopy closes "There is no evidence of high grade squamous intraepithelial lesion or malignancy."
- Multi-part summary: "LSIL (condyloma acuminatum)", or "LSIL (CIN I and condyloma acuminatum)" when both occur.

## Unchanged

- Specific negatives: the invasion answer (lung dysplasia and carcinoma in situ, HGPIN on prostate
  cores and TURP, NIFTP "no capsular or vascular invasion identified"), "no evidence of borderline
  features or malignancy" on cystadenomas, "no tumour identified" after reactive gliosis, "no evidence
  of recurrent carcinoma" after radiotherapy in the nasopharynx, and the dysplasia status of columnar
  and Barrett's oesophageal lines.
- Nothing to name: tonsil biopsy, bladder biopsy, breast margin, unremarkable testis, foreskin and
  salpingectomy, cervical biopsy, the suboptimal nasopharyngeal sample, and the explicit "No evidence
  of malignancy" options.
- Node status: lymph-node counts, node clauses in resections and after salivary tumours, and the EBUS
  node lines in the lung template.
- Cervical biopsy findings other than a polyp or condyloma (for example chronic cervicitis), LEEP /
  cone and endocervical curettings.
- Frozen section answers, reporting categories (breast core B1, cytology) and case summaries.
- Every microscopy closing sentence, except the condyloma line above.

## Tests and fixtures

- `tests/trailing_negatives.test.js` checks the dropped tails, the kept negatives, the condyloma
  lines and summary, and that no default diagnosis line of the 24 templates ends a named entity with
  a generic negative. The templates' own unit tests carry the new lines.
- Golden fixture `tests/fixtures/soft_tissue_benign/01-fat-necrosis-buttock.json` was edited
  deliberately ("… - FAT NECROSIS"), with the reason in its description.
