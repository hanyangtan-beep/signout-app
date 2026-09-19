# CNS algorithmic diagnosis — trial surface

Trial only. Lives in `lab/cns-algorithm/`, is not in `dist/`, is not in the manifest, and prints nothing.
Its purpose is to settle the interaction before any of it moves into `src/`.

## What it merges

Two things that already exist separately in the app:

- the guided intake (`src/cnswizard.js` — `wizardSteps`, `cautions`), which asks the questions in order;
- the pathway (`src/cnspathway.js` — `pathway`, `pathwayChart`, `pathwaySupported`), which shows where the
  case sits and what is outstanding.

The merge is one mapping: `lab/cns-algorithm/nodefields.js` maps a chart node key (`stageId:nodeId`) to the
form field ids that answer it. Some nodes are family-dependent, so the map value may be a function of the
current values. Nothing else was needed — the wizard's ordering and the pathway's node states are both
derived from the same values object.

On merge into the app, `NODE_FIELDS` becomes a `fields` property on the pathway nodes themselves and this
file disappears. Kept out of `src/` for now so no shipped module moves while the interaction is unsettled.

## Interaction — the chart drives the questions

- The chart is the whole surface. No step list, no next/back.
- Every node is a button (click or Enter). Opening a node opens its question.
- The first outstanding node opens automatically on load and after every answer, so the default behaviour is
  a guided run; clicking any other node overrides that and lets the user revisit an answered node.
- The question card sits under the chart, horizontally aligned on the node that asks it, with a caret
  pointing back at that node. It deliberately does not float over the boxes: an anchored popover covered the
  stage rows the question was about.
- Node state carries colour: satisfied, outstanding, not applicable, with a three-swatch legend above the
  chart, since the colours are the only thing saying which nodes still want an answer. A node with no field on
  the current form says so rather than showing an empty card — several nodes are consequences of answers
  above, not questions.
- Each card carries a "Next question" button that moves to the next node still outstanding in chart order,
  wrapping round, so a case can be worked down the algorithm without hunting for what is still amber. With
  nothing left it reads "Nothing outstanding" instead.
- The footer shows the integrated diagnosis as it stands, the proposed grade, the next test, and every check
  the case raises, all recomputed on every keystroke. A check whose field belongs to a node is a button that
  opens that node: a check nobody can act on from where it is written is not much use. Warnings carry a
  coloured rule, information a plain one.

## Scope

Three branches, per the agreed fork: glioma (IDH-mutant A1/A2 and IDH-wildtype B1/B2/B3, plus the layered
methylation stage), ependymoma, and meningioma. Both CNS schemas are loadable — `cns_tumour` (resection) and
`cns_biopsy` — because the biopsy form reaches meningioma and the resection form does not.

Starting points are built in so the surface can be opened at a branch without typing a case:

| Form | Starting points |
| --- | --- |
| Gliomas and ependymomas resection | Empty form; frontal glioma 38 years (IDH-mutant astrocytoma); temporal glioma 67 years (glioblastoma, IDH-wildtype); frontal glioma with mitoses at the grade 3 threshold, which raises two checks at once; posterior fossa ependymoma |
| Brain and CNS biopsy | Empty form; convexity meningioma; thalamic glioma biopsy |

The astrocytoma and ependymoma starting points clear `features` on purpose. The resection schema pre-ticks a
common feature set, and a starting point arriving with microvascular proliferation already recorded would
hand the case a grade nobody looked down a microscope for. The glioblastoma starting point keeps its
features, because microvascular proliferation and necrosis are what made it a glioblastoma on the sections
and are also what lets the update 11 age shortcut past sequencing apply.

## Knowledge grounding

Node text, criteria and caveats come from the existing wizard and pathway modules, which are already
grounded and carry their own source links; the trial adds no new clinical claims. The research behind the
chart shape is in `analysis/cns-algorithm-research.md`. Two findings govern the drawing:

- the [CAP/AANP/AMP/SNO diffuse glioma algorithm](https://documents.cap.org/documents/diffuse_gliomas_algorithm.pdf)
  is all rights reserved — the chart is re-implemented from criteria, never traced from the figure;
- the only openly licensed adult glioma flowchart, Whitfield & Huse, Brain Pathology 2022, is CC BY-NC, which
  this project's licence rule excludes.

Highest verified guidance at the time of writing is cIMPACT-NOW update 12, Neuro-Oncology 28(9):2069–2089
([PubMed 42152226](https://pubmed.ncbi.nlm.nih.gov/42152226/)), with update 11 at
[PMC12695693](https://pmc.ncbi.nlm.nih.gov/articles/PMC12695693/). Every published figure found predates
updates 11 and 12, which is the gap this surface fills.

Nothing here prints. The report-register rule is untouched: the criteria and caveat text is panel-only.

## Verification

`node analysis/shots-cns-trial.mjs` serves the repo on port 8736 and writes six screenshots to
`analysis/qa/` — astro, the walk to the next outstanding node, a case raising two checks, GBM, revisit (a satisfied node reopened), meningioma — and reports console and page
errors. The glioblastoma shot opens the sequencing node by hand, since that case has nothing outstanding and
that node is the one that used to disagree with the caution beneath it. Last run: no errors. `npm run lint`
clean at 0 errors, `npm test` 1073 pass 0 fail.
`eslint.config.js` now lints `lab/**/*.js`.

## Two upstream fixes the merge forced

Both were found by the trial and fixed in `src/`, because both were wrong in the shipped app too.

**The sequencing caution claimed histology the case had not recorded.** `cautions()` in `src/cnswizard.js`
fired the update 11 shortcut on age alone, asserting "with classic histology" over 55 whatever the findings
said, while `src/cnspathway.js` correctly required a named glioblastoma with microvascular proliferation or
necrosis. The caution and the node could therefore disagree on the same case. The caution now shares that
condition through a `classicGbm` context predicate that mirrors `lowGradeHistology`, and over 55 with no
such histology recorded it says the shortcut does not apply rather than claiming sufficiency. Whether a
prior lower-grade glioma exists stays the reader's to know: neither CNS form records it.

**The basic panel was glial whatever the case was.** The funnel's immunohistochemistry node read GFAP,
OLIG2, S100 and explained Ki-67 in an IDH-mutant glioma even for a meningioma. `ihcPanel()` now selects by
family — EMA, SSTR2A and progesterone receptor for meningioma; GFAP and EMA for ependymal; a panel directed
by the morphology for anything else off the glioma line — and the node is also satisfied by the biopsy
form's own meningioma panel field. Two tests cover it, one per fault. No fixture changed.

## Open questions for the next pass

- Nothing on the chart tells the reader which nodes are ahead of the one they are on rather than behind it;
  chart order is the only cue and it is not obvious on the two-column stages.
- Whether the shipped pathway panel should gain the same walkable "Next question" step, or stay read-only
  with the guided intake keeping that job.

## Questions settled in this pass

- **The layered methylation stage stays on the chart.** It is already conditional: `methylationStage()` returns
  nothing unless `methylation` is reported or pending, so it appears only on cases where profiling was
  actually sent, and hiding it behind a disclosure on those cases would bury a stage that is then part of the
  diagnosis. Verified against the module: no methylation value gives `a1 a2`, pending or reported gives
  `a1 a2 meth`.
- **The footer shows every check, not the first.** A case can raise several at once — the mitoses-at-threshold
  starting point raises two — and showing one silently hid the rest.

## Correction: ATRX before 1p/19q

The chart asked 1p/19q before ATRX. It was raised on review and it was wrong, in two ways. The
bench runs the cheap stains first, and the guidance allows the diagnosis to stop there: cIMPACT-NOW
update 2 holds that a diffuse astrocytic glioma with an IDH mutation plus loss of ATRX nuclear
expression and/or strong, diffuse p53 immunopositivity can be diagnosed as astrocytoma, IDH-mutant
"in the absence of 1p/19q testing"
([cIMPACT-NOW round 1 summary](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8028562/),
[update 2](https://pubmed.ncbi.nlm.nih.gov/29497819/)). FISH belongs where those stains leave the
case open — oligodendroglial morphology with ATRX retained. The ledger in
`docs/specs/cns-cimpact-pathways.md` already recorded update 2; the chart simply did not follow it.

Changed in `src/`, not only in the trial, since both surfaces had the order wrong:

- `src/cnspathway.js` — stage A1 now runs infiltrating, IDH, ATRX, p53, 1p/19q. With ATRX lost or
  p53 abnormal the 1p/19q node reads not applicable, drops its named test, and carries a note saying
  the diagnosis can be made without it and when to test anyway. A named oligodendroglioma is exempt:
  codeletion is an essential criterion there and no stain stands in for it.
- `src/cnswizard.js` — the ATRX question comes before the 1p/19q question, and the 1p/19q question is
  skipped entirely on the same condition, through a shared `astroByIhc` predicate that mirrors the
  pathway's, so the chart and the step list cannot disagree about whether FISH is still wanted.

Five tests cover it: the order itself, the drop on ATRX loss, and the oligodendroglioma exemption,
on both surfaces. No fixture changed — no printed line moves, because none of this reaches a report.
