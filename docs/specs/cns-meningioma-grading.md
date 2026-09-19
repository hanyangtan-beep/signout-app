# Meningioma grading — redesign

The user's report: "meningioma algorithm isnt assigning an appropriate CNS grade despite
highlighting multiple atypical features or selecting a higher grade type."

## What was found, before designing anything

Two separate defects, both reproduced.

**1. The pathway's meningioma branch has no grading at all.** `meningiomaStage` in
`src/cnspathway.js` carries three nodes — a morphology node, a "grade 3 markers" node and the
update-8 1p node — and none of them reads the mitotic count, the atypical features, brain
invasion or anaplasia. The trial foot prints `GRADE FROM FINDINGS — —` for every meningioma,
because `proposedGrade` is only called for `cns_tumour` and returns `null` for a meningioma there.
So no matter how many atypical features are ticked, the algorithm surface says nothing.

**2. On the resection template a meningioma cannot be graded at all.** `cns_tumour` carries
meningioma only as an entity in the *Mesenchymal tumours involving the CNS* family. There is no
subtype field, no mitotic criterion, no atypical-feature list and no brain-invasion field, so
`proposedGrade` returns `null` and the form raises `error: CNS WHO grade is required`. A convexity
meningioma is a craniotomy specimen: the resection form is where it is actually reported.

**3. Two smaller defects of the same class as the `fusionFound` one.** The `g3` pathway node is
marked satisfied whenever *any* molecular result is recorded, so "TERT promoter wild-type" reads
as a grade-3 marker. And the pathway's own `FAMILY_FIELD` table has five entries and maps
`/^Meningioma/i` to `mgSubtype` — a family name that does not exist. The real family string is
`Mesenchymal tumours involving the CNS`, so a meningioma named on a resection never enters the
meningioma branch at all; the branch comes out `none`.

**4. One rule is out of date.** `GRADE3_SUBTYPE = ['Papillary', 'Rhabdoid']` grades those two
morphologies 3 automatically. WHO CNS5 withdrew that.

## The criteria, from the sources

Grading is **subtype-independent**: "the criteria defining atypical or anaplastic (ie, grade 2 and
3) meningioma should be applied regardless of the underlying subtype"
(https://pmc.ncbi.nlm.nih.gov/articles/PMC8328013/).

### CNS WHO grade 3 — any one of

| Criterion | Source wording |
|---|---|
| ≥20 mitoses per 1.6 mm² (10 HPF of 0.16 mm²), i.e. ≥12.5/mm² | "≥12.5 mitoses/mm² for CNS WHO grade 3 meningiomas" (https://academic.oup.com/neuro-oncology/article/27/2/319/7745776) |
| Frank anaplasia | "Frank anaplasia resembling carcinoma, high-grade sarcoma, or melanoma" (https://achr.co.in/archive/volume/9/issue/2/article/23997) |
| *TERT* promoter oncogenic variant | "molecular biomarkers … were introduced as independent diagnostic criteria for meningioma CNS WHO grade 3" (update 8) |
| *CDKN2A/CDKN2B* **homozygous** deletion | same; hemizygous loss is explicitly not usable — "case numbers … are still too small to draw firm conclusions" (update 8) |

### CNS WHO grade 2 — any one of

| Criterion | Source wording |
|---|---|
| 4–19 mitoses per 1.6 mm² (≥2.5/mm²) | "≥2.5 … mitoses/mm² for CNS WHO grades 2" (update 8) |
| Unequivocal brain invasion | "the infiltration of tumor cells through the leptomeninges into the subjacent brain parenchyma"; "extension along the Virchow–Robin spaces does not qualify … because of an intact pia mater" (update 8). "the presence of brain invasion alone is now sufficient for a designation of CNS WHO grade 2" (https://pmc.ncbi.nlm.nih.gov/articles/PMC11449035/) |
| **≥3 of 5** soft criteria | "at least 3 out of 5 'soft' criteria for atypia (sheeting architecture, hypercellularity, small cell formation, macronucleoli, spontaneous necrosis)" (ICOM consensus review) |
| Chordoid or clear cell subtype | "chordoid and clear cell meningioma … have hence been assigned to CNS WHO grade 2" (CNS5 summary) |
| 1p deletion **with** 22q deletion and/or an *NF2* oncogenic variant | "should be assigned to 'CNS WHO grade 2,' unless further molecular markers indicating CNS WHO grade 3 are present" (update 8, a proposal) |

Necrosis counts only when spontaneous: "Foci of spontaneous necrosis (non-iatrogenic)".
The 1.6 mm² area must actually be examined: "extrapolation from smaller areas should not be the
basis for grading". Ki-67 carries no grading threshold.

### What does **not** grade

- Papillary and rhabdoid morphology. "the grading of rhabdoid and papillary meningiomas was
  amended from assignment to CNS WHO grade 3 on the basis of rhabdoid or papillary histology alone
  towards stratification into CNS WHO grade 1, 2, or 3 based on the presence or absence of
  histological criteria" (update 8). This app graded them 3 and was wrong.
- H3 K27me3 loss. "offers prognostic information but does not currently inform grading" (update 8).
- Hemizygous *CDKN2A/B*, *BAP1*, *PBRM1*, methylation class alone, 1p alone, 22q alone, *NF2* alone.

### BIOB — brain invasion as the only atypical finding

Update 8 proposes that a brain-invasive but otherwise morphologically benign meningioma "should not
be graded before molecular data are obtained", and that where no testing is possible it be called
"meningioma, not otherwise specified" with the grade left off.

**House decision, confirmed by the user 2026-09-20: the printed grade follows CNS5, which makes
brain invasion alone sufficient for grade 2.** Update 8 is a proposal set, not the classification the
LIS reports against. So a BIOB case prints grade 2 and raises a warning naming the proposal and
asking for *TERT* and *CDKN2A/B*. Leaving a grade off a released report on the strength of a proposal
is the wrong default.

This is settled, not provisional. Do not change the BIOB grade to withheld, to grade 1, or to
"meningioma, not otherwise specified" on the strength of update 8 alone; it takes a further
instruction from the user, or the proposal being adopted into a published classification.

## The algorithm

```
morphology  ->  subtype, mitotic count in 1.6 mm², the five soft criteria,
                brain invasion, frank anaplasia
                    |
grade 3 gate   ->  mitoses >= 20, or anaplasia, or TERT, or CDKN2A/B homozygous
                    |  no
grade 2 gate   ->  mitoses 4-19, or brain invasion, or >= 3 of 5 soft criteria,
                   or chordoid / clear cell subtype,
                   or 1p deletion with 22q deletion / NF2 variant
                    |  no
grade 1
```

Every gate is independent of the subtype. Two states are held alongside the grade and drive the
prompts rather than the grade: **borderline** (exactly 2 soft criteria, or a mitotic count of 3,
with no molecular result) and **BIOB** (brain invasion as the sole grade-2 criterion, no grade-3
marker, and no *TERT*/*CDKN2A/B* result recorded).

## Schema

Shared group `meningioma` in `schemas/_cns_layers.json`, spliced into both templates, gated on the
finding in `cns_biopsy` and on family + entity in `cns_tumour`.

| Field | Type | Notes |
|---|---|---|
| `mgSubtype` | select | the WHO CNS5 subtypes; `Anaplastic` added. The name no longer sets the grade |
| `mgMitoses` | number | per 1.6 mm² (10 HPF of 0.16 mm²) |
| `mgAtypical` | multiselect | the five soft criteria, worded as the sources word them |
| `mgAnaplasia` | select | Not identified / Present — carcinoma-, sarcoma- or melanoma-like. **New** |
| `mgBrain` | select | Not identified / Present / No adjacent brain in the specimen |
| `mgBone` | select | unchanged |
| `mgIhc` | multiselect | gains H3 K27me3, BAP1, SMARCE1 |
| `mgMolecular` | multiselect | gains hemizygous *CDKN2A/B*, *SMARCE1*, *BAP1*, *PBRM1* |

## Report register

Printed morphology stays released-report prose describing what is seen. The criteria names, the
thresholds and every source URL live in code comments and in the pathway drawer, which is
panel-only. A printed diagnosis reads `ATYPICAL MENINGIOMA, CNS WHO grade 2`, never
"3 of 5 soft criteria present, therefore grade 2".

## Checks

1. A grade-3 molecular marker is recorded → note that it carries the grade over the morphology.
2. Papillary or rhabdoid subtype → the grade comes off the criteria, not the morphology.
3. Subtype `Atypical` or `Anaplastic` chosen while the criteria do not support that grade → warn.
4. Grade 2 or 3 with no *TERT* / *CDKN2A/B* result → testing is recommended at those grades.
5. BIOB → warn, per the decision above.
6. Borderline (2 soft criteria, or 3 mitoses) → the molecular tests settle it.
7. Mitotic count blank → it carries the grade; record it.
8. Hemizygous *CDKN2A/B* recorded → does not grade.
9. H3 K27me3 loss recorded → prognostic at grade 2, not a grading criterion.
10. Clear cell subtype without *SMARCE1* → the grade-2 assignment rests on *SMARCE1* or the
    methylation class.
11. Brain invasion not assessable and grade 1 → the grade rests on the tissue examined (existing).
12. A diagnosis naming a grade that disagrees with the computed grade (existing `grade` select).

## Batches

1. Schema + the shared grading core + the resection template + `proposedGrade`.
2. Pathway stages, the `FAMILY_FIELD` repair, the `g3` satisfaction defect, the wizard, the trial
   foot showing a grade for the biopsy template too.
3. Tests, trial starting points, screenshots, release.

## Open questions

- Methylation/CNV discordance wording ("CNS WHO grade 1, with molecular data suggestive of higher
  risk of recurrence") is update-8 reporting guidance the app does not yet carry. Deferred.
- The integrated molecular-morphological score (1p, 3p, 4p/q, 6p/q, 10p/q, 14q, 18p/q, 19p/q,
  *CDKN2A/B*, plus mitotic points) is prognostic, not a grade. Not implemented.
- Paediatric, radiation-associated and NF2-related meningiomas: update 8 states its
  recommendations "only pertain to sporadic meningiomas in adults". Not modelled.
