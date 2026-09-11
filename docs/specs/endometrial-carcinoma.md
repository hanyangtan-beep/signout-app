# Endometrial carcinoma resection (synoptic) — brief

Carded 2026-09-11 for building. Source page saved as `docs/reference/GYN-Endometrium.html` (QMH "Carcinoma of the endometrium"; CAP protocol "Carcinoma and Carcinosarcoma of the Endometrium 5.1.0.0 (Dec-2024)"; importer draft: `node tools/import-qmh.js docs/reference/GYN-Endometrium.html`).

## What the QMH page prints

Macroscopic block (procedure, hysterectomy type, specimen integrity, tumour site, tumour size), microscopic block (histologic type WHO 5e, grade, molecular type with MMR IHC / MSI / p53 / POLE and ProMisE + TCGA class, myometrial invasion with depth / thickness / percentage, adenomyosis, serosa, lower uterine segment, cervical involvement with stromal depth / thickness, other tissue or organ involvement, LVSI, perineural invasion, peritoneal / ascitic fluid, margins, pelvic and para-aortic nodes, distant metastasis, additional findings, notes).

The page displays the FIGO 2009 and FIGO 2023 tables and has an AJCC 8th pTNM block, but **its script has both the FIGO stage line and the pTNM block commented out** — the QMH output prints no stage. The centre does not formally report FIGO. Decision: the report prints no stage line by default; FIGO 2009 and 2023 are derived and shown in the Checks panel for reference only; AJCC pTNM (8th) is derived and printable through a case option that defaults off.

## Schema `endometrial_carcinoma` (kind synoptic cancer resection, rank after GIST)

- name "Endometrial carcinoma resection", shortName "Uterus · cancer resection", organ Uterus, system Gynaecological, aliases endometrium, endometrial carcinoma, hysterectomy for carcinoma, serous, carcinosarcoma, TAHBSO. Header "Uterus". maxParts 3 (raised from 1 on 2026-09-11 so separately submitted omentum, node packets or peritoneal biopsies can be added as lettered parts) with per-adnexa and node sub-entries (right / left tube and ovary, pelvic nodes by side, para-aortic nodes) as fields, not letters, matching QMH.
- Fields in QMH order (option wording verbatim from the page; house spelling in generated prose only):
  1. procedure (Total hysterectomy and bilateral salpingo-oophorectomy … Peritoneal washing, Other) as multiselect; hysterectomyType (Abdominal … Not specified); specimenIntegrity (Intact / Opened / Morcellated / Other).
  2. tumourSite (Endometrium / Lower uterine segment / Endometrial polyp / Cannot be determined / Other); tumourSizeMm (greatest), tumourDims (mm x mm x mm), sizeCannot.
  3. histType (Endometrioid carcinoma, Serous carcinoma, Clear cell carcinoma, Dedifferentiated carcinoma, Carcinosarcoma (malignant mixed Mullerian tumor), Mesonephric-like adenocarcinoma, Squamous cell carcinoma NOS, Gastric (gastrointestinal)-type carcinoma, Mixed cell carcinoma (specify types and percentages), Small cell neuroendocrine carcinoma, Large cell neuroendocrine carcinoma, Other); grade (FIGO grade 1 / 2 / 3 (endometrioid), High-grade (non-endometrioid), Other, Cannot be assessed) — grade shown only for endometrioid / mixed; non-endometrioid auto "High-grade".
  4. Molecular: mmrIhc (Not performed / Intact MLH1, PMS2, MSH2, MSH6 / Loss (specify) / Subclonal loss (specify) / Cannot be assessed); msi (Not performed / MSS / MSI-L / MSI-H / Cannot be assessed); p53 (Normal wild-type / Abnormal overexpression / Abnormal null / Abnormal cytoplasmic / Subclonal abnormal variants / Other / Cannot be determined); pole (Not performed / Wild-type / Mutated (specify) / Cannot be assessed); promise (POLEmut / MMRd / p53abn / NSMP / Double classifier / Not classified) — auto-suggested from the four results with the ProMisE order of precedence (POLE → MMR → p53), user can override; tcga optional mirror.
  5. myoInvasion (Not identified / < 50% / ≥ 50% / Cannot be assessed); depthMm, myoThicknessMm, myoPercent (auto from depth / thickness, editable); adenomyosis (Not identified / Present, uninvolved / Present, involved / Cannot be determined); serosa (Not identified / Present / Cannot be determined); lus (Not identified / Present, superficial / Present, myoinvasion / Cannot be determined); cervix (Not identified / Cervical stromal invasion / Endocervical glandular involvement only / Cannot be determined) with cervixDepth, cervixThickness.
  6. otherInvolvement multiselect (Not applicable, Not identified, Right / Left / unspecified ovary, Right / Left / unspecified fallopian tube, Vagina, Right / Left / unspecified parametrium, Pelvic wall, Bladder wall without / with mucosal involvement, Bowel wall without / with mucosal involvement, Omentum, Other, Cannot be determined); ovarianSynchronous checkbox ("Low-grade endometrioid carcinoma limited to uterus and ovary — synchronous / IA3 pattern") shown when an ovary is ticked and histType is endometrioid grade 1–2.
  7. lvsi (Not identified / Present / Present, focal (< 5 vessels) / Present, substantial (≥ 5 vessels) / Equivocal / Cannot be determined); pni; peritonealFluid (Not submitted / NFM / AUS / SFM / Malignant / Cannot be determined / Results pending).
  8. Margins: ectocervicalVaginalMargin, parametrialMargin (Cannot be assessed / Uninvolved, location and closest distance / Involved) with mm and location text.
  9. Pelvic nodes: pelvicExamined, pelvicMacro (> 2 mm), pelvicMicro (> 0.2–2 mm), pelvicItc, pelvicLaterality, pelvicLargestDepositMm, pelvicLargestNodeMm, pelvicEne. Para-aortic: same eight fields with prefix `pa`. Sentinel node flag per region (optional, for the node-count wording).
  10. distantMets multiselect (Not applicable, Not identified, Inguinal lymph node(s), Omentum, Extrapelvic peritoneum, Lung, Liver, Bone, Other, Cannot be determined) with specify text.
  11. additionalFindings multiselect (Atypical hyperplasia / EIN, Other) + additionalNotes.

## Generator `generators/endometrial_carcinoma.js`

- macro (when `options.macro`): "The specimen consists of a uterus with cervix (… g, … x … x … cm) [with attached right and left fallopian tubes and ovaries]. The endometrial cavity contains a … cm [polypoid / exophytic / infiltrative] tumour arising from the [site], with invasion to an estimated … of the myometrium on sectioning. The cervix is [unremarkable]. …" with weight, dimensions, cavity length and adnexa dimensions as macro fields; block key in the house form (anterior / posterior full-thickness slices, LUS, cervix 12/3/6/9, adnexa, nodes by station).
- microscopy: one "Sections show …" paragraph with type, grade, depth (mm / mm, %), LVSI, cervix, LUS, serosa, adnexa, margins, nodes, then the IHC / molecular sentence ("Immunohistochemistry shows intact nuclear expression of MLH1, PMS2, MSH2 and MSH6, wild-type p53 staining; POLE sequencing …; the molecular class is …").
- synoptic: printed elements in QMH order with QMH wording; no FIGO line; pTNM block only when `options.printPTNM`.
- diagnosis: `UTERUS WITH CERVIX AND BILATERAL ADNEXA, total hysterectomy and bilateral salpingo-oophorectomy - ENDOMETRIOID CARCINOMA, FIGO grade 1, invading less than half of the myometrium; no lymphovascular space invasion; cervix and adnexa uninvolved; 0 of 12 pelvic lymph nodes involved; molecular class NSMP`. Aggressive types print `SEROUS CARCINOMA, high grade …`. Node sub-lines per region.
- flags (Checks panel, info level): `FIGO 2009 (reference, not reported): …` and `FIGO 2023 (reference, not reported): …` from `src/staging/endometrium.js`; explanatory clause and "would become IAm / IICm if …" when the molecular class is unknown.
- validate: ≥ 50% ticked but depth / thickness give < 50% → warn; cervical stromal invasion with cervix "Not identified" for LUS → none; carcinoma in a polyp with any myometrial invasion → warn (site vs invasion); POLEmut with p53abn both present → require Double classifier; substantial LVSI with node count 0 and no nodes examined → info (pNX); Results pending on fluid → info; node numbers with positive > examined → error.

## `src/staging/endometrium.js`

Exports `figo2009(v)`, `figo2023(v)`, `T(v)`, `N(v)`, `M(v)` (AJCC 8th), `aggressive(histType, grade)`.

- Non-aggressive = endometrioid (or mixed with endometrioid predominant) FIGO grade 1–2. Aggressive = endometrioid grade 3, serous, clear cell, carcinosarcoma, dedifferentiated / undifferentiated, mesonephric-like, gastric-type, neuroendocrine, squamous.
- FIGO 2023 rule order: IVC (distant / nodes above renal vessels) → IVB (extrapelvic peritoneum / omentum) → IVA (bladder or bowel mucosa) → IIIC2 (para-aortic; i micro / ii macro) → IIIC1 (pelvic; i / ii) → IIIB2 (pelvic peritoneum) → IIIB1 (vagina / parametrium) → IIIA2 (serosa) → IIIA1 (adnexa, unless IA3) → IICm (p53abn, confined to corpus ± cervix, any myoinvasion) → IIC (aggressive, any myoinvasion) → IIB (non-aggressive, substantial LVSI) → IIA (cervical stroma, non-aggressive) → IAm (POLEmut, confined to corpus ± cervix) → IC (aggressive, polyp / endometrium only) → IB (non-aggressive ≥ 50%, no / focal LVSI) → IA3 (low-grade endometrioid limited to uterus and ovary) → IA2 (non-aggressive < 50%, no / focal LVSI) → IA1 (non-aggressive, polyp / endometrium). Molecular upgrades apply only when the class is confirmed; otherwise the plain stage prints with the conditional note.
- FIGO 2009: IA / IB by depth; II cervical stroma; IIIA serosa / adnexa; IIIB vagina / parametrium; IIIC1 pelvic / IIIC2 para-aortic; IVA bladder / bowel mucosa; IVB distant incl. inguinal nodes and intra-abdominal spread. Endocervical glandular involvement only does not raise stage.
- AJCC 8th: pT1a / pT1b / pT2 / pT3a / pT3b / pT4; pN0, pN0(i+), pN1mi / pN1a, pN2mi / pN2a; pM1. Groups mirror FIGO 2009.
- Tests: rule table with one fixture per 2023 substage; IA3 exception; IAm and IICm; endocervical-glandular-only does not stage as II; ITCs give pN0(i+) and no FIGO node upgrade; assertion that `report` never contains "FIGO" unless `printPTNM` is on (and even then FIGO is absent).

## Fixtures

`tests/fixtures/endometrium/`: 01 low-grade endometrioid IA2 NSMP (example); 02 serous IIC → IICm p53abn with pelvic macrometastasis absent; 03 endometrioid grade 1 confined to polyp with POLEmut (IAm); 04 carcinosarcoma with para-aortic macrometastasis (IIIC2ii) and omental deposit (IVB); 05 low-grade endometrioid uterus + ovary (IA3); 06 endocervical glandular only (stays I). Element order test against the saved page.

## Sources

- QMH page: https://awiloqmh.github.io/CancerReportingTemplate/GYN-Endometrium.html
- FIGO 2023: Berek JS et al., FIGO staging of endometrial cancer: 2023, Int J Gynecol Obstet 2023;162:383–394 (confirm URL at build).
- CAP Endometrium 5.1.0.0 (Dec 2024) as cited on the page.
- WHO Female Genital Tumours 5th ed. (histotypes; ProMisE precedence).
