# Glioma and ependymoma resection — form and grading grounding record

Sources behind `schemas/cns_tumour.json` and `generators/cns_tumour.js`. None of this text is
printed: the report register carries only what is seen down the microscope. The morphology phrases
are shared with the biopsy template in `generators/cns_morphology.js`; the grading logic is tested
in `tests/cns_tumour.test.js`.

## The form this template follows

- The synoptic item order, the item labels and the value lists are taken from the QMH cancer
  reporting page for common gliomas and ependymomas, which reproduces the US CAP protocol *Tumors of
  the Brain and Spinal Cord* 1.0.0.1 (September 2025). Page last updated 06 October 2025.
  [QMH — CNS: common gliomas and ependymomas](https://awiloqmh.github.io/CancerReportingTemplate/CNS-Common_gliomas_and_ependymomas.html)
- The QMH form prints in four layers: Layer 1 integrated diagnosis, Layer 2 histopathological
  classification, Layer 3 CNS WHO grade, Layer 4 molecular information. The generator keeps that
  order. Meningioma is a separate QMH form with its own atypia rule and stays a separate card.
  [QMH — CNS: meningioma](https://awiloqmh.github.io/CancerReportingTemplate/CNS-Meningioma.html)
- Layer 4 branches on IDH status. The IDH-mutant arm carries IDH1 R132H immunohistochemistry,
  IDH1/IDH2 sequencing, ATRX, p53, 1p/19q, CDKN2A/B and TERT; the IDH-wildtype arm carries TERT,
  H3 K27me3, H3 G34W, H3 sequencing, BRAF V600E, chromosome 7/10, EGFR amplification and others.
  `molecularBits()` implements the two lists, and the branch is tested.
- The QMH form has no margin item, no Ki-67 item and no mitotic-count item, and its grade select is
  a free choice rather than a derived value. The template keeps the grade a free choice and prints
  a *proposal* only as a warning when the recorded findings disagree with it. Ki-67 and the mitotic
  count are collected because the house microscopy paragraph carries them in prose, not as synoptic
  items.
- Treatment effect follows the CAP values: not identified / present (with the per cent of necrotic
  tumour) / cannot be determined.
- The biomarker guidance behind the Layer 4 list is the CAP/ASCO-endorsed neuro-oncology biomarker
  guideline. [Brat et al., *Arch Pathol Lab Med* 2022;146(5):547–574](https://meridian.allenpress.com/aplm/article/146/5/547/477117)

## Grading proposal (`proposedGrade`)

Grading is within tumour type, written "CNS WHO grade N" in arabic numerals, and there is no AJCC
staging module for primary CNS tumours.
[WHO CNS5 summary, Louis et al., *Neuro-Oncology* 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8328017/)

- Glioblastoma, IDH-wildtype and diffuse midline glioma, H3 K27-altered are grade 4 by entity.
- Astrocytoma, IDH-mutant is grade 2, rising to 3 with mitotic activity and to 4 with microvascular
  proliferation, necrosis **or** homozygous CDKN2A/B deletion — the molecular criterion overrides
  the morphology.
- Oligodendroglioma, IDH-mutant and 1p/19q-codeleted is grade 2, rising to 3 with brisk mitoses,
  microvascular proliferation or necrosis.
- Ependymomas are grade 2, rising to 3 with brisk mitotic activity; subependymoma and myxopapillary
  behaviour is handled by entity. Pilocytic astrocytoma and subependymoma are grade 1.
- Entities with no settled grade return nothing rather than a guess, and the generator then asks for
  a grade instead of printing one.
- The 1p/19q, CDKN2A/B and TERT criteria and the IDH-wildtype glioblastoma molecular criteria follow
  the cIMPACT-NOW updates folded into WHO CNS5.
  [cIMPACT-NOW update 3, *Acta Neuropathol* 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6132696/)
  [cIMPACT-NOW update 5, *Acta Neuropathol* 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7286557/)

## Checks the generator raises

- Grade recorded disagrees with the proposal from the entity and the findings → warning, never a
  silent correction.
- Oligodendroglioma selected without 1p/19q codeletion recorded → warning.
- IDH1 R132H positive with an IDH-wildtype entity or branch → warning.
- Glioblastoma, IDH-wildtype with none of microvascular proliferation, necrosis, TERT mutation, EGFR
  amplification or +7/−10 recorded → warning.
- Gross total resection stated on a fragmented specimen → note only; the surgeon's statement is
  printed as given.
- An entity with no settled grade and no grade chosen → error.

## UK dataset practice

The report structure and the minimum molecular set for adult CNS tumours.
[RCPath G069 dataset for tumours of the CNS in adults](https://www.rcpath.org/resourceLibrary/g069-dataset-for-histopathological-reporting-of-tumours-of-central-nervous-system-in-adults-including-the-pituitary-gland.html)

## The shared core (2026-09-19)

The four layers are held once, in `schemas/_cns_layers.json` (built by `scripts/build-cns-layers.py`)
for the fields and in `generators/cns_layers.js` for the printed prose, and both the resection
(`cns_tumour`) and the biopsy (`cns_biopsy`) splice them in. Layer 1 is the QMH family and entity
pick-list, Layer 2 the histopathological classification, Layer 3 the free grade select with the
proposal logic above, Layer 4 the IDH-branched molecular panel. The biopsy gates every shared field
on a glioma or ependymoma finding and keeps its own paths for the findings the house form does not
carry - meningioma, PitNET, schwannoma, metastasis, lymphoma, abscess, demyelination and gliosis.
The consequence is that the same tumour prints the same Layer 1 to Layer 4 wording whether it
arrived as a stereotactic core or as a craniotomy, and one entity list is maintained instead of two.
Ependymoma now takes grade 2 or 3 from the recorded mitotic activity on the biopsy as it already did
on the resection, which is why the three glioma biopsy fixtures were regenerated.

