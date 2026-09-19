# CNS integrated diagnosis — step-wise pathways and the cIMPACT-NOW ledger

Research note and build spec, 2026-09-19. Written in response to: the CNS template may need
flowcharts that walk the user step-wise to the right integrated diagnosis, split on IDH-mutant
versus IDH-wildtype, and it must take the cIMPACT-NOW updates into account.

Two things come out of the research that change the shape of the card:

1. **Five cIMPACT-NOW updates now post-date WHO CNS5**, and two of them change glioma practice
   directly. Update 11 (2025) adapts the diagnostic criteria for IDH- and H3-wildtype diffuse
   high-grade gliomas and for posterior fossa ependymal tumours. Update 12 (2026) rewrites the
   grading of IDH-mutant astrocytoma, including a numeric mitotic threshold and eight new
   molecular grade-3 criteria. The template's grading logic is built on WHO CNS5 alone and is
   now behind on both.
2. **The flowchart must not touch the printed report.** cIMPACT-NOW is explicitly "Not official
   WHO", and update 11 states its recommendations "are not formal changes to WHO definitions and
   diagnostic criteria". The report register stays WHO CNS5. The pathway belongs in the Checks
   panel and in a guidance drawer, proposing and warning — never printing, and never overwriting
   a chosen grade, exactly as the existing grade proposal behaves.

---

## The cIMPACT-NOW ledger

cIMPACT-NOW ran seven updates between 2018 and 2020, "virtually all" of whose recommendations
were absorbed into WHO CNS5, and then a second phase which has so far produced updates 8 to 12
([International Society of Neuropathology](https://www.intsocneuropathol.com/about-5)).

| Update | Year | Subject | Status for the template |
| --- | --- | --- | --- |
| 1 | 2018 | NOS versus NEC | In CNS5. Layer 1 qualifier already carries it |
| 2 | 2018 | Diffuse midline glioma criteria; astrocytoma on ATRX/p53 without 1p/19q | In CNS5 |
| 3 | 2018 | IDH-wildtype lower-grade glioma with molecular features of glioblastoma | In CNS5, amended by 11 |
| 4 | 2019 | Paediatric-type low-grade diffuse gliomas | In CNS5 |
| 5 | 2020 | Grading of IDH-mutant astrocytoma | In CNS5, **superseded by 12** |
| 6 | 2020 | Molecular definition of glioblastoma; new entities | In CNS5, amended by 11 |
| 7 | 2020 | Molecular classification of ependymal tumours | In CNS5, amended by 11 |
| 8 | 2024/25 | Meningioma molecular risk parameters and grading | **Post-CNS5, actionable** |
| 9 | 2025 | Genome-wide DNA methylation profiling | **Post-CNS5, reporting-format** |
| 10 | 2025 | Criteria for defining new tumour types | Not a reporting change |
| 11 | 2025 | IDH- and H3-wildtype diffuse high-grade gliomas; posterior fossa ependymal tumours | **Post-CNS5, actionable** |
| 12 | 2026 | Risk stratification and grading of IDH-mutant gliomas | **Post-CNS5, actionable** |

Update 5 warned when it was published that grading criteria "were stated to be revisited in 2025
as part of another cIMPACT-NOW working committee"
([ISN](https://www.intsocneuropathol.com/about-5)). Update 12 is that revisit.

---

## Branch point: establishing IDH status

The published pathway is a single funnel to one branch point, not a free-form panel. Order, from
the AOSNP-ADAPTR resource-level recommendations
([Brain Pathology](https://pmc.ncbi.nlm.nih.gov/articles/PMC12861567/)):

1. Clinical and radiological context — age, site, prior lower-grade glioma, MRI. Supportive, never
   definitive. T2-FLAIR mismatch favours astrocytoma, IDH-mutant, but is not specific and occurs in
   some paediatric-type low-grade gliomas.
2. H&E — astrocytic versus oligodendroglial morphology, mitoses, microvascular proliferation,
   necrosis.
3. Basic immunohistochemistry — GFAP, vimentin, OLIG2, S100, Ki-67. Ki-67 is ancillary only:
   typically under 4% in grade 2 astrocytoma, 5-10% in grade 3, variably raised in grade 4, with no
   established cut-off because values overlap.
4. **IDH1 p.R132H immunohistochemistry** as the first molecular step.
5. If negative, **IDH1 and IDH2 sequencing** — essential for astrocytoma, for oligodendroglioma,
   and for glioblastoma in a patient under 55 years. Non-canonical IDH1 and all IDH2 mutations are
   invisible to R132H immunohistochemistry, and infratentorial IDH-mutant astrocytomas carry
   non-R132H mutations disproportionately (IDH1 R132C, R132G, IDH2 R172S, R172G).

The age shortcut, from update 11
([Brain Pathology](https://onlinelibrary.wiley.com/doi/10.1111/bpa.70035)): in a patient **over 55
years** with classic glioblastoma histology and no pre-existing lower-grade glioma, IDH1 p.R132H
immunonegativity is sufficient to call IDH-wildtype; H3 K27 testing is generally not needed for a
non-midline diffuse glioma; and the tumour can be taken as H3 G34-wildtype, supported by retained
ATRX and OLIG2 positivity.

---

## Branch A — IDH-mutant

### A1. Astrocytoma versus oligodendroglioma

- Astrocytoma, IDH-mutant needs a diffusely infiltrating glioma, an IDH1/2 hotspot mutation, and
  **either** ATRX loss or an ATRX mutation **or** exclusion of combined whole-arm 1p and 19q
  deletion. TP53 mutation, or strong nuclear p53 in more than 10% of tumour cells, is desirable, as
  is the astrocytoma methylation profile
  ([Brain Pathology](https://pmc.ncbi.nlm.nih.gov/articles/PMC10227121/)).
- Oligodendroglioma needs the same first two plus combined whole-arm 1p/19q deletion; retained
  nuclear ATRX, a TERT promoter mutation and the matching methylome are desirable.
- Practical reading of p53: a threshold above 40% of tumour cells is considered more reliable in
  practice than the 10% figure, and negative staining does not exclude a TP53 mutation because
  truncating mutations give a null phenotype
  ([AOSNP-ADAPTR](https://pmc.ncbi.nlm.nih.gov/articles/PMC12861567/)).
- Where 1p/19q testing is unavailable, HIP1R and vimentin plus retained ATRX are reported at 96%
  sensitivity and 100% specificity for 1p/19q status; H3 K27me3 loss alone is neither sensitive nor
  specific, being reported in 13%, 27% and up to 75% of IDH-mutant astrocytomas in different series
  and retained in 25% of oligodendrogliomas.
- **Dual-genotype IDH-mutant glioma** (ATRX loss or TP53 mutation together with whole-arm 1p/19q
  codeletion) falls outside the classification; report all layers and add NEC.

### A2. Grading astrocytoma, IDH-mutant — update 12

Update 12 concluded there is sufficient evidence to modify the grading criteria for astrocytoma,
IDH-mutant, and insufficient evidence to change the grading of oligodendroglioma
([Neuro-Oncology, 18 May 2026](https://academic.oup.com/neuro-oncology/advance-article/doi/10.1093/neuonc/noag108/8687120)).

| Grade | Criteria |
| --- | --- |
| 2 | Mitoses not detected or low, **under 3 per 2.4 mm²**; no microvascular proliferation, no necrosis, no grade 3 or 4 molecular criterion |
| 3 | **3 or more mitoses per 2.4 mm²**, or a grade 3 molecular criterion, or both; no microvascular proliferation, no necrosis, no grade 4 molecular criterion |
| 4 | Microvascular proliferation, necrosis, **CDKN2A/B homozygous deletion**, or **PDGFRA amplification** |

Grade 3 molecular criteria: amplification of **CDK4**, **CDK6**, **CCND2**, **EGFR** or **MYCN**;
**RB1** homozygous deletion or pathogenic mutation; pathogenic **CDKN2A** mutation; pathogenic
**PIK3CA** or **PIK3R1** mutation; a **G-CIMP-low** or **A_IDH_HG** methylation signature.

Detail that matters for the app:

- The threshold is stated by area — 3 per 2.4 mm², equivalent to 10 high-power fields of 0.24 mm²
  each — and the update restates the WHO CNS5 position that mitotic counts must be given by area
  rather than by 10 high-power fields, since field size varies between microscopes and digital
  pathology will require the conversion.
- Grade 3 also requires that microvascular proliferation, necrosis and the two grade 4 molecular
  criteria are all absent.
- **PDGFRA amplification** is grade 4 on its own, without microvascular proliferation or necrosis.
  In CATNON, grade 3 IDH-mutant astrocytomas with amplification had overall survival of 3.1 years
  against 9.3 years without (n = 440, hazard ratio 3.51, p < 0.0001), independent of CDKN2A/B
  homozygous deletion.
- CDKN2A/B **hemizygous** deletion is not a grading criterion, in astrocytoma or in
  oligodendroglioma; four studies split two-and-two on its prognostic effect.
- Ki-67 is explicitly not recommended as a grading criterion.
- Grade should not drive treatment alone. The working group aimed the whole exercise at the grade
  2/3 interface, since management depends on risk assessment there.
- An independent validation cohort of 1,140 IDH-mutant astrocytomas moved 99 of 789 CNS5 grade 2 or
  3 tumours (12.5%) up a grade under the new criteria: 77 grade 2 cases to grade 3 on the molecular
  criteria (16.6% of grade 2 tumours; median overall survival 109.6 against 146.0 months, hazard
  ratio 2.6, p < 0.0001), and 22 to grade 4 on PDGFRA amplification — 7 from grade 2 and 15 from
  grade 3 — with median survival 51.4 months, statistically indistinguishable from tumours already
  grade 4 (p = 0.1277)
  ([Acta Neuropathologica](https://pmc.ncbi.nlm.nih.gov/articles/PMC13391642/)).

### A3. Grading oligodendroglioma

Unchanged: grade 2 or 3 only. CDKN2A/B homozygous deletion has not been documented in any reported
grade 2 oligodendroglioma, so finding one should prompt reconsideration of a grade 2 designation —
but the evidence does not support it as an independent grade 3 criterion, and certainly not grade 4
([Neuro-Oncology](https://academic.oup.com/neuro-oncology/advance-article/doi/10.1093/neuonc/noag108/8687120)).
Testing may be restricted to borderline cases
([Brain Pathology](https://pmc.ncbi.nlm.nih.gov/articles/PMC10227121/)).

---

## Branch B — IDH-wildtype

### B1. Glioblastoma, IDH-wildtype — update 11 criteria

Essential: an IDH-wildtype **and** H3-wildtype diffuse astrocytic glioma, **and** one or more of
microvascular proliferation, necrosis, TERT promoter mutation, EGFR amplification, or +7/−10
chromosome copy-number change. Desirable: the glioblastoma, IDH-wildtype methylation profile
([Brain Pathology](https://onlinelibrary.wiley.com/doi/10.1111/bpa.70035)).

The three amendments update 11 layers onto the CNS5 definition:

- A **TERT promoter mutation must not be the sole defining factor** in a histologically low-grade
  IDH-wildtype diffuse astrocytic tumour.
- **EGFR amplification must not be the sole defining factor in a patient under 40 years.**
- **+7/−10 must not be the sole defining factor in a patient under 40 years.** In that setting, add
  TERT promoter status and EGFR amplification, exclude BRAF mutation, and/or profile by methylation.
  +7/−10 is not entirely specific: it also occurs in some pleomorphic xanthoastrocytomas and in
  diffuse hemispheric glioma, H3 G34-mutant.

### B2. H3 status

- A midline diffuse astrocytic glioma at **any age** gets H3 K27 assessment.
- Retained nuclear H3 K27me3 may serve as a surrogate for H3 K27-wildtype in a rigorously
  controlled setting. **Loss does not equal H3 K27M-mutant** — confirm by H3 K27M immunohistochemistry
  or sequencing. Ambiguous staining also goes to H3 K27M testing.

### B3. The differential update 11 asks to be held open

In a younger patient, before settling on glioblastoma: diffuse paediatric-type high-grade glioma
H3-wildtype and IDH-wildtype, diffuse hemispheric glioma H3 G34-mutant, pleomorphic
xanthoastrocytoma, subependymoma, gliomatosis-like glioma, and FGFR3::TACC3 fusion-positive glioma.

Diffuse paediatric-type high-grade glioma, H3-wildtype and IDH-wildtype requires a methylation
profile matching one of its subtypes (pHGG RTK1, RTK2 or MYC) as an essential criterion. Where
methylation is unavailable and material cannot be sent out, in a patient **under 25 years**,
PDGFRA, EGFR or MYCN single-gene analysis may support the diagnosis with **NOS** appended.
Mismatch-repair immunohistochemistry should be considered in a patient under 18 years with an
H3-wildtype high-grade glioma — including IDH-mutant astrocytoma — and in an adult of 18 to 40
years whose H3- and IDH-wildtype high-grade glioma does not meet the glioblastoma criteria.

---

## Posterior fossa ependymoma — update 11

| Entity | Essential criteria |
| --- | --- |
| Posterior fossa group A (PFA) | Posterior fossa tumour with ependymoma morphology and immunoprofile, **and** loss of H3 K27me3 in tumour nuclei **or** a PFA methylation profile |
| Posterior fossa group B (PFB) | Ependymoma morphology and immunoprofile, **and** a PFB methylation profile. Definite classification requires methylation |

Practical points: non-neoplastic endothelial and inflammatory nuclei are the internal control for
H3 K27me3, and most PFA cases lose it completely; strong diffuse nuclear EZHIP supports PFA where
staining is ambiguous and methylation is unavailable, and PFB is typically EZHIP-negative. **A
posterior fossa ependymoma with retained H3 K27me3 and no EZHIP overexpression, without conclusive
methylation, is "Posterior fossa ependymoma, NOS."** Chromosome 1q gain and/or 6q loss carry worse
survival. A posterior fossa ZFTA fusion-positive tumour is reported as "Posterior fossa ependymoma,
ZFTA fusion-positive, NEC" ([Brain Pathology](https://onlinelibrary.wiley.com/doi/10.1111/bpa.70035)).

---

## Meningioma — update 8

Confirms TERT promoter variants and CDKN2A/B homozygous deletion as CNS WHO grade 3 markers, gives
guidance on standardised morphological assessment — most prominently brain invasion — and **proposes
grade 2 for a tumour with grade 1 morphology carrying 1p deletion together with 22q deletion and/or
an NF2 oncogenic variant**
([Neuro-Oncology 2025;27(2):319-330](https://pubmed.ncbi.nlm.nih.gov/39212325/)).

---

## Methylation reporting — update 9

Profile when it may resolve a differential, when findings are discordant, when subtyping is needed,
or when methylation is the only way to define the type. Interpret inside the whole case; an
unexpected result needs expert, sometimes multidisciplinary review. For the report, update 9 asks
for the result in a **layered format** carrying the classifier used, the methylation family match,
the class match, the confidence score or scores, quality-control data and the full classifier
output. Calibrated scores run 0 to 1 against a stated threshold; a subthreshold match can still
contribute when ancillary data support it, and the thresholds used for match, no-match,
indeterminate and negative should be reported
([Neuro-Oncology Advances 2025;7(1)](https://academic.oup.com/noa/article/7/1/vdae228/7942502)).

---

## Gap analysis against the built template

Current state: `generators/cns_layers.js` `proposedGrade` and `schemas/_cns_layers.json` Layer 4,
shared by `cns_tumour` and `cns_biopsy`.

| # | Gap | Where |
| --- | --- | --- |
| 1 | Astrocytoma goes to grade 3 on **any** mitosis (`feats.includes('Mitoses') \|\| mit > 0`). Update 12 sets 3 or more per 2.4 mm² | `cns_layers.js:161` |
| 2 | PDGFRA amplification absent — a missed grade 4 criterion | `proposedGrade`, Layer 4 |
| 3 | No grade 3 molecular criteria at all: CDK4, CDK6, CCND2, EGFR, MYCN, RB1, CDKN2A mutation, PIK3CA, PIK3R1, G-CIMP-low, A_IDH_HG | `proposedGrade`, Layer 4 |
| 4 | Oligodendroglioma grade ignores CDKN2A/B homozygous deletion — warning, not an automatic grade | `cns_layers.js:163` |
| 5 | Mitoses are recorded per 10 high-power fields with no field area. The same "10 HPF" means 1.6 mm² in the meningioma rule already coded and 2.4 mm² in update 12 — 2.5 against 1.25 mitoses per mm². Ambiguous as stored | `_cns_layers.json` `mitoses` |
| 6 | No patient age field, so none of the update 11 age rules can fire: the under-40 EGFR and +7/−10 caveats, the over-55 shortcuts, the under-25 surrogate rule, the mismatch-repair prompts | schema |
| 7 | TERT-promoter-only in a histologically low-grade IDH-wildtype tumour raises no warning | checks |
| 8 | `cdkn2a` offers homozygous deletion but does not distinguish hemizygous loss, which update 12 rules out as a criterion in both entities | `_cns_layers.json` Layer 4 |
| 9 | Methylation has no structured home — no classifier, family, class, score or threshold fields, against update 9 | Layer 4 |
| 10 | Posterior fossa ependymoma has no EZHIP field and no "NOS without methylation" rule | Layer 4, checks |
| 11 | Meningioma grading lacks the update 8 1p + 22q/NF2 grade 2 proposal | `cns_biopsy.js:287` |
| 12 | Grade 4 astrocytoma is reachable only via features or CDKN2A/B, so grade 3 and grade 4 molecular sets are conflated | `proposedGrade` |

Gap 5 is the one worth settling before any of the others: every numeric grading rule in the two CNS
templates and the meningioma rule depends on it, and the two published conventions disagree by a
factor of two.

---

## Three ways to build it

### Option A — Rules first, no flowchart

Bring `proposedGrade` up to update 12, add the missing Layer 4 fields (PDGFRA, the grade 3 set,
CDKN2A/B for oligodendroglioma, EZHIP, the methylation block), add an age field, fix the mitotic
area, and put every update 11 and 12 caveat into the Checks panel as warnings. No new user
interface. Smallest change, fixes all twelve gaps in the output, gives no step-wise guidance.

### Option B — Rules first, then a read-only pathway drawer

Option A, then a drawer beside the Layer 4 panel that draws the current branch as a flowchart —
funnel to IDH, then the mutant or wildtype branch — with the step the case has reached highlighted
from the values already entered, and the next recommended test named. Read-only: it never writes a
field and never prints. Two batches.

### Option C — A guided intake wizard

A step-wise wizard that asks the questions in the published order and writes Layer 1 to Layer 4 as
the answers come in, with the free-text template still available underneath. Largest change,
touches intake for both CNS templates, and risks fighting the existing layout the moment a case
does not follow the funnel.

Option B matches how the template already behaves — propose and warn, never overwrite — and keeps
cIMPACT-NOW out of the printed register while still walking the user through it. Recommend A and B
as two cards, A first, since B is only useful once the rules behind it are current.

---

## Sources

- cIMPACT-NOW, International Society of Neuropathology — <https://www.intsocneuropathol.com/about-5>
- Update 8, Neuro-Oncology 2025;27(2):319-330 — <https://pubmed.ncbi.nlm.nih.gov/39212325/>
- Update 9, Neuro-Oncology Advances 2025;7(1):vdae228 — <https://academic.oup.com/noa/article/7/1/vdae228/7942502>
- Update 10, Brain Pathology — <https://pmc.ncbi.nlm.nih.gov/articles/PMC12488253/>
- Update 11, Brain Pathology 2026;36(1) — <https://onlinelibrary.wiley.com/doi/10.1111/bpa.70035>
- Update 12, Neuro-Oncology, 18 May 2026, doi 10.1093/neuonc/noag108 — <https://academic.oup.com/neuro-oncology/advance-article/doi/10.1093/neuonc/noag108/8687120>
- Validation of update 12, Acta Neuropathologica 2026;152(1):9 — <https://pmc.ncbi.nlm.nih.gov/articles/PMC13391642/>
- Updates on the WHO diagnosis of IDH-mutant glioma, Brain Pathology — <https://pmc.ncbi.nlm.nih.gov/articles/PMC10227121/>
- AOSNP-ADAPTR resource level-based recommendations, adult-type diffuse gliomas — <https://pmc.ncbi.nlm.nih.gov/articles/PMC12861567/>
