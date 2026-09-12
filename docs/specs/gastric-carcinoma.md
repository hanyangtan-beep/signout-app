# Gastric carcinoma resection — Built (Phase 11)

Template `gastric_carcinoma` (kind `cancer resection`, system GI). Built 2026-09-12 against the
saved QMH GI page `docs/reference/GI-Stomach.html`
(source: https://awiloqmh.github.io/CancerReportingTemplate/, Gastric carcinoma).
Placeholders retired from `templates/planned.json` and the GI pickers.

## Decisions

- **Element order = the QMH page**, pinned by `tests/gastric.test.js` through
  `tools/import-qmh.js`. One deliberate exception, agreed with the user template-wide: the
  `- Tumour histology:` summary paragraph prints directly after the grade (the page has the
  prose block further down; ours anchors the microscopic summary to the grade so it reads
  type → Lauren → WHO grade → JCGC grade → prose).
- **Staging** `src/staging/gastric.js`, AJCC 8th edition. T is read off the tumour-extension
  pick-list (Tis / T1a / T1b with SM depth field / T2 / T3 / T4a with peritoneal-structure echo /
  T4b, plus an explicit Cannot-determine → TX and "No evidence of primary tumour" → T0).
  N from the involved count: 1-2 N1, 3-6 N2, 7-15 N3a, 16+ N3b; examined 0 → NX. The
  stage-group table takes the N3a/N3b split directly (AJCC's N3 combined row splits in the
  central columns). `M1_SITES` (non-regional node, liver, peritoneum, other) force stage IV.
  Descriptors y / m / r auto-derived from treatment effect, multiple arrested primaries etc.,
  plus a typed `tnmOverride` that prints `pT3 pN2 [pathologist override; derived T1b/N2 - reason]`.
- **Endoscopic resections** swap proximal / distal / omental margins for HM and VM and add an
  `Endoscopic curability (eCura C)` synoptic section (JCGC Guidelines 7e scoring: Ly 3 points,
  size > 30 mm 1, VM+ 1, V 1, SM2 1; strata 0-2 / 3-4 / 5-7). The score also surfaces in
  Checks as a warning with the undetermined elements listed. eCura inputs appear only for
  `Endoscopic resection`.
- **Margins**: distance required on "Uninvolved …" prox / dist (omental distance is optional);
  sentinel fields added as distance-less variants? No — covered by the in-test audit.
- **Diagnosis** line pattern: `STOMACH, antrum, lesser curvature, distal partial gastrectomy`
  head; `- TUBULAR ADENOCARCINOMA, moderately differentiated, intestinal type (Lauren), 35 mm,
  invading the submucosa; perineural invasion present; other margins clear (closest 38 mm);
  see synoptic report`; nodes `- 4 of 24 regional lymph nodes involved; extranodal extension
  present`; pTNM line only when `printPTNM` is on, stamped `(AJCC 8th edition)`.
- **No-evidence-of-primary / complete response**: "Not applicable (no residual tumour)" size;
  `NO RESIDUAL CARCINOMA following therapy` diagnosis; CIS gets `HIGH-GRADE DYSPLASIA /
  CARCINOMA IN SITU` and Checks warn that CIS does not metastasise if nodes are positive.

## Checks

Required: histologic type, tumour extension (or T0), nodes examined + involved (involved ≤
examined), margin distances when uninvolved. Warnings: fewer than 16 nodes examined (AJCC
guideline), ENE unrecorded when node-positive, T4b without the adjacent-structure note, CIS
with positive nodes, complete-response vs T0 shape, eCura strata (low-risk ~2.5 % LNM note;
high-risk 5-7; undetermined elements named).

## Macro parsing

`finLisMacro` picks up: weight (`460g`, `weighs 280 g`), specimen dims 2-3D, stomach length,
duodenal cuff, omentum 2-3D, tumour `55 x 45 mm` or 3D, `tumour size cannot be determined`
(whole-organ), sentinel "No tumour is identified" for the treated case. UK / JP guides have no
site prefix; append site only when HK conventions are inferred (`(R)Proximal margin` runs).

## Tests

`tests/gastric.test.js` (pinned wording examples: gastrectomy with nodes + deposits, treated/yp,
complete response, CIS warning, eCura strata, distal-metastasis M1 grouping, TNM override) and
`tests/staging-gastric.test.js` (boundary bins T/N/M, N3a/N3b stage-table split, eCura scoring,
override echo). Staging protocol id `gastric`.
