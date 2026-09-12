# Breast pair — SLN frozen + breast carcinoma synoptic (+ DCIS and phyllodes resections)

Pulled into Now 2026-09-12 ("Build the breast pair and the rest of the breast resections"). Three cards, one batch, one publish:
(1) frozen scenario **Breast sentinel lymph node(s)** (Frozen section scenarios card (a)); (2) `src/staging/breast.js` + `breast_carcinoma` synoptic (linked-pair pattern, as lung); (3) `breast_dcis` + `phyllodes` synoptics — the remaining Breast placeholders in `templates/planned.json`.

## Sources

- QMH pages (rendered copies in `docs/reference/`, text dumps in `analysis/qmh/*.txt`, gitignored):
  - `https://awiloqmh.github.io/CancerReportingTemplate/BREAST-Cancers.html` — "Invasive carcinoma of the breast", CAP Breast Invasive Resection 4.11.0.0 (Jun 2026), AJCC 8th edition, WHO 5th edition → `docs/reference/BREAST-Cancers.html`.
  - `https://awiloqmh.github.io/CancerReportingTemplate/BREAST-DCIS.html` — CAP DCIS Resection 4.5.0.1 → `docs/reference/BREAST-DCIS.html`.
  - `https://awiloqmh.github.io/CancerReportingTemplate/BREAST-Phyllodes.html` — phyllodes tumour, AJCC 8th pT1–pT4 by 5 / 10 / 15 cm, pN0 / pN1 → `docs/reference/BREAST-Phyllodes.html`.
- Biomarkers: the existing `generators/breast_biomarkers.js` block (`biomarkerFields`, `biomarkerReport`) — verbatim QMH Breast-markers wording; reused unchanged.
- House frozen wording: `docs/reference/frozen-section-examples.md` §1–2 (SLN macro, grouped intraoperative line, paraffin confirmation, `(0/2)` count in the diagnosis line).
- Staging rules: AJCC Cancer Staging Manual 8th edition, breast chapter (anatomic stage groups; prognostic stage groups are a Later add). T1mi ≤ 1 mm; T1a > 1–5; T1b > 5–10; T1c > 10–20; T2 > 20–50; T3 > 50; T4a chest wall (ribs, intercostals, serratus anterior — not pectoralis alone); T4b skin ulceration / macroscopic satellite nodules / oedema; T4c = T4a + T4b; T4d inflammatory (clinical). ITC ≤ 0.2 mm and ≤ 200 cells → N0(i+); micrometastasis > 0.2–2 mm → N1mi when no macrometastasis; N1a 1–3 nodes with ≥ 1 macrometastasis; N2a 4–9; N3a ≥ 10 or infraclavicular; N1b / N1c / N2b / N3b internal mammary rules; N3c supraclavicular; `(sn)` suffix when sentinel node biopsy only and ≤ 5 nodes examined. Stage groups: 0 Tis N0; IA T1 N0; IB T0–1 N1mi; IIA T0–1 N1, T2 N0; IIB T2 N1 (incl. N1mi), T3 N0; IIIA T0–2 N2, T3 N1–2; IIIB T4 N0–2; IIIC any N3; IV M1.

## QMH element order (sacred)

### Invasive carcinoma (`analysis/qmh/breast.txt`)

Gross: Procedure · Laterality · Tumor site · Tumor size. Micro: Tumor histology and IHC · Histologic type (WHO 5e) · Tumor focality · Histologic grade (Nottingham; tubule / nuclear / mitotic scores) · Tumor size · Tumor extension (Nipple, Skin, Skin satellite foci, Skeletal muscle) · LVI · Dermal LVI · +PNI · Breast Treatment Effect · LN Treatment Effect · +Miller and Payne · DCIS (+ size, blocks, nuclear grade, necrosis, architecture) · +Additional lesions · +Microcalcifications · Ancillary (biomarker block) · Margins invasive (Anterior, Posterior, Superior, Inferior, Medial, Lateral, Other) · Margins DCIS (same faces) · Regional LN (examined, sentinel, macro, micro, ITC, largest deposit, largest node, ENE) · Distant metastasis · Stage (AJCC 8e; descriptors m / r / y; pT; sn / f; pN; pM) · Additional notes · NON ESSENTIAL: Residual Cancer Burden.

House layout (as lung / ovary): a "Specimen and tumour" section first (procedure, laterality, site, size), then the microscopic elements in the order above; Tumour histology paragraph printed after Histologic grade (house exception); pTNM printed only via the `printPTNM` option; stage group in Checks and as `Stage group (if cM0)` sub-line.

### DCIS (`analysis/qmh/dcis.txt`)

Procedure · Laterality · Tumor site · Tumor size · Blocks with DCIS / total · Histologic type (DCIS / Paget / Encapsulated papillary CIS / Solid papillary CIS / Other) · Extent · +Architecture · Nuclear grade · Necrosis · +Microcalcifications · ER / PR (biomarker block) · Margins (7 faces, ≥ 2 mm threshold) · Regional LN · Distant metastasis · Stage (pTis(DCIS) / pTis(Paget); pN; pM) · Additional notes.

### Phyllodes (`analysis/qmh/phyllodes.txt`)

Procedure · Laterality · Tumor site · Tumor size · Histologic type (benign / borderline / malignant) · Stromal cellularity · Stromal atypia · Stromal overgrowth · Mitotic rate · Tumor border · Malignant heterologous elements · +LVI · +PNI · Margins (7 faces) · Regional LN · Distant metastasis · Stage (pT1–4; pN0 / pN1; pM) · +Additional pathologic findings · Additional notes. No AJCC stage group is defined on the page → none printed.

## Parts

### (a) Frozen scenario "Breast sentinel lymph node"

Fields (group `Breast sentinel lymph node`): side; node label (e.g. `SLN 1`); nodes found; fat stripped; frozen result (Negative / Isolated tumour cells / Micrometastasis / Macrometastasis / No nodal tissue identified / Deferred); positive node count; largest metastasis (mm); extranodal extension; treatment effect (post-neoadjuvant); frozen blocks. Macro per house §1 ("Received fresh, a piece of fibroadipose tissue measuring … Two lymph nodes are identified within, measuring approximately … The fatty tissue is stripped off. All embedded in N frozen blocks, and subsequently processed to paraffin."). Intraoperative line "Negative for malignancy." / "Metastatic carcinoma, > 2 mm." / "Metastatic carcinoma, 0.2–2 mm (micrometastasis)." / "Isolated tumour cells; negative for macrometastasis." Paraffin "Sections show fibroadipose tissue and two reactive lymph nodes. There is no evidence of malignancy." Diagnosis `LYMPH NODES, left SLN 1, excision x frozen section - NO EVIDENCE OF MALIGNANCY (0/2)` (singular `LYMPH NODE` for one node). Export `slnSummary(v)`; `PAIRED_TEMPLATE['Breast sentinel lymph node'] = 'breast_carcinoma'`; stageable when macro / micro / ITC. Checks: positive ≤ found; macro with size ≤ 2 mm; micro with size > 2 mm; "Stage this part" hint.

### (b) `src/staging/breast.js` and `breast_carcinoma`

Protocol `breast`: T from `tumourExtent` / `skin` / `satellite` / `skeletalMuscle` / `inflammatory` / `sizeMm` / `histType` (no residual → T0; DCIS-only or Paget-only → Tis); N from node counts + `imNodes` + `infraclavicular` / `supraclavicular` + `nodeSampling` (sn); M from `distantSites`; descriptors m (focality Multiple), r (`recurrent`), y (breast treatment effect ≠ "No known presurgical therapy"). `src/staging/index.js`: register; extend `OVERRIDE_RE` / `CAT_RE` / `RANK` with `Tis(DCIS)`, `Tis(Paget)`, `T4c`, `T4d`, `N0(mol+)`, `N1mi`, `N3a–c` and the optional `(sn)` / `(f)` node suffix.

Schema built by `scripts/build-breast-carcinoma-schema.mjs` (injects `biomarkerFields({field:'biomarkers', is:'Performed'})`). Generator in QMH order; margins per face with distance; nodes consume `slnSummary` from the linked SLN part (`prefillFromFrozen`: laterality, sentinel count, examined, macro / micro / ITC, largest deposit, ENE, treatment effect, `nodeSampling` = sentinel only); Nottingham score-sum Check; DCIS margin Check when < 2 mm; diagnosis `BREAST, left, mastectomy - INVASIVE CARCINOMA OF NO SPECIAL TYPE, grade 2, 23 mm; margins clear; see synoptic report - 0 of 2 sentinel lymph nodes involved - pT2 pN0(sn) (AJCC 8th edition), stage IIA (if cM0)`.

### (c) `breast_dcis` and `phyllodes`

`breast_dcis` uses protocol `breast` (Tis(DCIS) / Tis(Paget); N and M as above; stage 0 when N0). `phyllodes` uses protocol `phyllodes` (T by 50 / 100 / 150 mm; N0 / N1; M1; no stage group). Both share `generators/breast_shared.js` (procedure, laterality, site, size, 7-face margin walker, regional node block, distant metastasis). Placeholders `breast_carcinoma`, `breast_dcis`, `phyllodes` removed from `templates/planned.json`.

### (d) Tests and fixtures

`tests/staging_breast.test.js` (T / N / M boundaries, (sn) suffix, stage groups, phyllodes T); `tests/frozen_sln.test.js` (house lines, checks, `slnSummary`); `tests/breast_carcinoma.test.js`, `tests/breast_dcis.test.js`, `tests/phyllodes.test.js` (element order vs the QMH dumps, golden fixtures in `tests/fixtures/breast_ca/`, `breast_dcis/`, `phyllodes/`, linked SLN → carcinoma fixture). Existing fixtures untouched.

## Built (2026-09-12, Phase 9)

Shipped as one batch with the three Now cards; 49 templates, 726 tests. Departures from and additions to the plan above:

- **Pairing by separate letter.** The SLN frozen part stays part A and **Add breast synoptic** appends a lettered part B (`breast_carcinoma`) rather than staging the frozen part in place (`pairSeparate` on the scenario). `prefillFromFrozen` copies side, node counts (examined / sentinel / macro / micro / ITC), ENE and treatment effect; the deposit size is carried only when a node is positive. Editing part A after pairing raises "Part A (frozen sentinel nodes: …) is not reflected in the node counts here" rather than silently overwriting.
- **Intake matcher.** `breast_carcinoma` carries `bias: -1` so a plain "Breast, excision" still maps to the benign excision template unless the clinical text names carcinoma; phyllodes clinical terms narrowed to "phyllodes" / "fibroepithelial".
- **Margins.** The per-face walker accepts `Face: 12`, `Face: >10`, `Face: involved`, and `All: >10` (prints "all greater than 10 mm"); unparsed lines raise "Margins (…): lines not understood: …".
- **Shared code.** `scripts/lib/breast-fields.mjs` (procedure, laterality, site, macro, block key, margins, nodes, biomarker block via `biomarkerBlock`) feeds the three schema builders; `generators/breast_shared.js` holds `nodesPhrase` (mixed "macrometastases in N and micrometastasis in M; largest deposit X mm"), `siteProse`, `lcProse`, `countWords`, `patternDetail` and the tumour-sentence a/an fix.
- **DCIS.** Schema flag `inSitu: true`; synoptic label "DCIS"; pNX note suppressed for pure in situ disease; involved-margin info wording depends on histType (Paget at a margin → re-excision note); stage 0 printed only when nodes are staged.
- **Phyllodes.** Case-level comment when a borderline / malignant tumour is within 10 mm of a margin; `pTNM` printed for malignant tumours only, otherwise "Not applicable (…)"; WHO elements produce a suggested grade with a mismatch warn and a heterologous-element error.
- **Carcinoma.** SLN diagnosis clause adds ENE when present; deposit-size info for macrometastases; focality "Not applicable" on pCR; mastectomy involved-margin info variant; warn to record the prior core accession when biomarkers were reported on the core; biomarkers "Test type:" printed on its own line.
- **Fixtures.** New golden dirs `tests/fixtures/breast_ca/` (6), `tests/fixtures/breast_dcis/` (3), `tests/fixtures/phyllodes/` (3); no existing fixture changed.
