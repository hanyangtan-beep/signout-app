# Ureter and renal pelvis urothelial carcinoma resection synoptic

Built on 4 November 2026 (Phase 83) at the user's request: "build the CA ureter and renal pelvis template". It replaces the menu placeholder for QMH UG-Ureter (`templates/planned.json`) and the "ureter / renal pelvis" item on the roadmap's Later line. The sources, decisions and printed morphology sentences are in `docs/reference/upper-tract-sources.md`; the intake rules are in `docs/specs/specimen-intake.md`.

## Scope

- One form, `ureter_renal_pelvis_carcinoma` (GU, "Ureter / pelvis Ca"), for nephroureterectomy (partial or complete), ureterectomy and other resections of the renal pelvis or ureter with carcinoma.
- Every CAP histologic type: non-invasive papillary urothelial carcinoma and carcinoma in situ, invasive urothelial carcinoma with its subtypes and divergent differentiation, squamous, glandular and neuroendocrine carcinomas, and undetermined types.
- Not covered: ureteric biopsies and washings (they keep the TURBT, generic and urine cytology forms), renal cell carcinoma, and benign nephroureterectomies.

## Form

Groups in the QMH element order: Specimen and tumour, Macroscopy, Microscopic findings, Margins, Lymph nodes and metastasis, Additional findings, Molecular findings, Staging. The example sets every field.

- Tumour site is a multiselect (ureter, renal pelvis, kidney, other, cannot be determined), with the ureteric level (upper, middle, lower) when the ureter is ticked.
- Histologic grade holds both systems: low or high grade for urothelial carcinoma, G1 to G3 for squamous cell carcinoma and adenocarcinoma. An optional high-grade component (%) prints after the grade.
- Margins follow the procedure: a nephroureterectomy has no proximal ureteric margin, and a specimen with a bladder cuff prints the cuff margin instead of the distal ureteric margin. The soft tissue margin and an optional named other margin print for every procedure.
- MMR immunohistochemistry uses the endometrial form's options and prints under Molecular findings.

## Report

- Macroscopic description and block key, then MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT in sections: Specimen and tumour, Microscopic findings, Margins, Lymph nodes, Distant metastasis, Pathological stage (AJCC 8th edition), Additional findings.
- Microscopy is one Tumour histology paragraph (type, grade and extent, features, carcinoma in situ, typed immunohistochemistry); a typed note replaces it.
- The Lymph nodes and Distant metastasis sections print only with an input, unless the case option asks for the negatives.
- The diagnosis names the specimen, then one tumour line (type, site, grade, size, extent, components, margin clause), the node line, the pTNM and any background lesion. "Completely excised" prints only when every margin shown is recorded uninvolved; a blank margin gives no margin clause and a warning.

## Staging

`src/staging/ureter_renal_pelvis.js`, on the AJCC 8th edition (chapter 61; AJCC has no version 9 chapter for this site).

- pT from the deepest tumour extension ticked; pTa with carcinoma in situ stays pTa, and the optional is suffix is not printed.
- pN from the involved node count and the largest deposit (pN1 a single deposit of 20 mm or less, pN2 over 20 mm or two or more nodes). One involved node with no size gives pNX, unless the node itself is 20 mm or less with no extranodal extension.
- pM1 prints when a distant site is ticked. The m, r and y descriptors print; a typed override replaces the derived categories, with its reason.
- The stage group shows in Checks only.

## Checks

Errors for a missing procedure, type or MMR loss detail and for more involved nodes than examined. Warnings for a missing site, extent, grade, size, margin, involved node count, node size, extranodal extension, organ or margin name, override reason or treatment effect; for a grade system that does not fit the type; for the 5% high-grade cut-off; for a subtype graded low; for a type that contradicts the extent; for a site that does not fit a pT3 option; and for a complete nephroureterectomy with the bladder cuff blank. Infos for the CAP collecting duct note, pTa with carcinoma in situ, the m suffix for multifocal tumours, an absent bladder cuff in a complete nephroureterectomy, a low-grade conventional invasive carcinoma, MMR not performed and the stage group.

## Intake

Nephroureterectomy, "kidney and ureter" and ureterectomy lines with a carcinoma cue in the line or the history open the form, with the procedure, side, site and ureteric level preset. Benign indications (non-functioning kidney, calculi, pyelonephritis, transplant, pelvi-ureteric junction obstruction, endometriosis), renal cell carcinoma and Wilms tumour stay out, and cystectomies, biopsies, washings, ureteric margins and strictures keep their forms. Across the two exports, fewer than 10 parts change route, all into the new form; no other part changes.

## Tests

- `tests/ureter_renal_pelvis_carcinoma.test.js`: metadata, menus, margin visibility against the generator, paragraph and macroscopy variants, margins and diagnosis clauses, nodes and pTNM, the QMH order with its departures, Molecular findings, checks, intake routes and presets, and four golden reports in `tests/fixtures/ureter_renal_pelvis_carcinoma/`: a pT3 pN0 renal pelvis nephroureterectomy (the example), a pTa low-grade ureterectomy, a pTis nephroureterectomy with carcinoma in situ at the bladder cuff margin, and a pT2 pN2 ureteric carcinoma with a micropapillary component.
- `tests/staging_ureter_renal_pelvis.test.js`: the T, N, M, descriptor and stage group rules.
- `tools/qa-browser.js` (kept in the QA script): a pasted left nephroureterectomy under a renal pelvis carcinoma history opens the form on Left, complete and Renal pelvis; the cuff margin shows in place of the distal ureteric margin; pT3 pN0 prints with the option and the stage group shows in Checks only; a ureteric washing keeps urine cytology.

## Open points

- pTa with carcinoma in situ prints pTa, without the optional is suffix.
- The margin options split carcinoma in situ, high-grade and low-grade non-invasive carcinoma and dysplasia, where QMH pairs them.
- A plain "nephroureterectomy" line leaves the procedure blank, as it does not say partial or complete.
- A nephroureterectomy line with no benign indication opens this form even when the specimen is benign.
- No reference image gallery yet.
