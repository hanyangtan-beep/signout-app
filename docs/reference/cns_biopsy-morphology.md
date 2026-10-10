# Brain and CNS biopsy — morphology and grading grounding record

Sources behind `schemas/cns_biopsy.json` and `generators/cns_biopsy.js`. None of this text is printed:
the report register carries only what is seen down the microscope. Grading logic is tested in
`tests/cns_biopsy.test.js`.

## Classification and layered reporting

- WHO CNS5 keeps the layered integrated report: integrated diagnosis with the CNS WHO grade, then
  the histological appearance, then the molecular parameters. The generator writes the head line and
  the `- Histological appearance` / `- Immunohistochemistry` / `- Molecular parameters` /
  `- CNS WHO grade` layers underneath, and the `layered` option switches the layers off for a case
  that does not need them. [ICCR CNS integrated diagnosis dataset, 2nd ed v2.1](https://www.iccr-cancer.org/wp-content/uploads/2026/03/ICCR-CNS-Integrated-diagnosis-2nd-ed-v2.1-bookmark-1.pdf)
- Grading is within tumour type and written "CNS WHO grade N" in arabic numerals. There is no AJCC
  staging module for primary CNS tumours. [WHO CNS5 summary, Louis et al., Neuro-Oncology 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8328017/)
- UK dataset practice for the report structure and the minimum molecular set.
  [RCPath G069 dataset for tumours of the CNS in adults](https://www.rcpath.org/resourceLibrary/g069-dataset-for-histopathological-reporting-of-tumours-of-central-nervous-system-in-adults-including-the-pituitary-gland.html)

## Diffuse gliomas

- An adult-type IDH-wildtype diffuse astrocytic glioma is diagnosed as glioblastoma, CNS WHO grade 4,
  when it shows microvascular proliferation or necrosis, **or** any of: TERT promoter mutation, EGFR
  amplification, combined gain of chromosome 7 and loss of chromosome 10. The template warns when a
  glioblastoma is selected with none of these recorded. [WHO CNS5 summary](https://pmc.ncbi.nlm.nih.gov/articles/PMC8328017/)
- All IDH-mutant diffuse astrocytic tumours are one entity, astrocytoma IDH-mutant, graded 2, 3 or 4.
  Homozygous deletion of CDKN2A/B makes it grade 4 even without microvascular proliferation or
  necrosis — the generator applies this in `gliomaGrade`. [WHO CNS5 summary](https://pmc.ncbi.nlm.nih.gov/articles/PMC8328017/)
- Oligodendroglioma requires an IDH mutation together with 1p/19q codeletion; the template warns when
  the codeletion is absent from a reported molecular set. Grade 3 on microvascular proliferation,
  necrosis or brisk mitoses. [WHO CNS5 summary](https://pmc.ncbi.nlm.nih.gov/articles/PMC8328017/)
- Diffuse midline glioma, H3 K27-altered is CNS WHO grade 4 irrespective of the histological
  appearance. [WHO CNS5 summary](https://pmc.ncbi.nlm.nih.gov/articles/PMC8328017/)

## Meningioma grading

- CNS WHO grade 2 on any of: 4–19 mitoses per 10 high-power fields (1.6 mm2); three or more of the
  five atypical features (high cellularity, small cell change, prominent nucleoli, sheet-like growth,
  spontaneous necrosis); brain invasion; chordoid or clear cell morphology.
- CNS WHO grade 3 on any of: 20 or more mitoses per 10 high-power fields; anaplastic cytology;
  papillary or rhabdoid morphology; TERT promoter mutation (C228T/C250T); homozygous deletion of
  CDKN2A and/or CDKN2B.
- Brain invasion means tumour extending through the leptomeninges into brain parenchyma; extension
  along Virchow–Robin spaces does not count. The template records "no adjacent brain parenchyma is
  present" separately from "not identified", and notes in Checks that grading then rests on the
  tissue examined.
  [Brain invasion in meningioma, Neuro-Oncology 2022](https://academic.oup.com/neuro-oncology/article/24/9/1524/6525422) ·
  [PMC9435498](https://pmc.ncbi.nlm.nih.gov/articles/PMC9435498/) ·
  [cIMPACT-NOW update 8, Neuro-Oncology 2025](https://academic.oup.com/neuro-oncology/article/27/2/319/7745776)
- Two atypical features sit on the grade 1 / grade 2 border; the template raises an info check and
  offers the molecular snippet rather than pushing the grade either way.

## Solitary fibrous tumour

Added 2026-10-10 at the user's request (Phase 64).

- Graded on the mitotic count and necrosis alone, counted in the most proliferative area: CNS WHO
  grade 1 below 2.5 mitoses per mm2 (fewer than 5 per 10 high-power fields); grade 2 at 2.5 per mm2
  (5 per 10 high-power fields) or more without necrosis; grade 3 at that count with necrosis.
  Necrosis with a lower count leaves the tumour at grade 1, and Checks says so. With no count there
  is no grade: the line reads "SOLITARY FIBROUS TUMOUR" and Checks asks for the count. The count is
  entered per 10 high-power fields, the unit the local reports use; the per-mm2 figure stays in the
  help text. A chosen grade prints as chosen, and a disagreement with the findings is a warning.
  [J Neurosurg 2024](https://thejns.org/view/journals/j-neurosurg/140/1/article-p69.xml) ·
  [PMC9427069](https://pmc.ncbi.nlm.nih.gov/articles/PMC9427069/) ·
  [PathologyOutlines, CNS SFT](https://www.pathologyoutlines.com/topic/cnstumorsft.html) ·
  [WHO CNS5 summary, Louis et al. 2021](https://academic.oup.com/neuro-oncology/article/23/8/1231/6311214)
- Morphology, two ends of one spectrum. Classic: alternating hypocellular and hypercellular areas,
  ovoid to spindle cells with vesicular nuclei and indistinct borders between collagen bundles, and
  thin-walled, branching staghorn vessels. Cellular (the former haemangiopericytoma, a term WHO CNS5
  retired and the form does not offer): densely packed, monotonous ovoid to round cells with little
  or no stroma around prominent staghorn vessels.
  [PMC13586501](https://pmc.ncbi.nlm.nih.gov/articles/PMC13586501/) ·
  [PMC10791336](https://pmc.ncbi.nlm.nih.gov/articles/PMC10791336/)
- Immunohistochemistry. Strong diffuse nuclear STAT6 stands in for the NAB2::STAT6 fusion and leads
  the stain sentence, as on the soft tissue form. A meningioma can show weak nuclear or cytoplasmic
  STAT6 but not that pattern, so only the strong diffuse nuclear pattern is offered as positive. CD34
  is positive in most tumours but reduced or lost in higher grades, so CD34 negative raises no Check;
  CD99 and BCL2 are frequently positive, and ALDH1 and GRIA2 are offered. EMA is variable and focal
  in a minority; SSTR2A is negative; progesterone receptor, S100, SOX10 and GFAP are negative or only
  focal. STAT6 is lost in some dedifferentiated tumours, so STAT6 negative without a fusion is a
  warning rather than a block. [PMC13586501](https://pmc.ncbi.nlm.nih.gov/articles/PMC13586501/) ·
  [PMC10791336](https://pmc.ncbi.nlm.nih.gov/articles/PMC10791336/) ·
  [PathologyOutlines, CNS SFT](https://www.pathologyoutlines.com/topic/cnstumorsft.html) ·
  [J Neurosurg 2024](https://thejns.org/view/journals/j-neurosurg/140/1/article-p69.xml)
- Smears: cohesive cellular clusters of ovoid to short spindle cells with scant cytoplasm, scattered
  single cells and little collagenous stroma. The collagen-rich smear is the picture of the
  hypocellular tumour. [PMC12485863](https://pmc.ncbi.nlm.nih.gov/articles/PMC12485863/)
- Local reports name the tumour rarely. Their panel (STAT6, CD34, EMA, SSTR2A, S100, SOX10, GFAP)
  and their per-10-high-power-field count set the options. Routing is unchanged. In the CNS pathway
  the tumour stays on the funnel with the other non-glioma findings; it has no branch of its own.

## Smear and squash preparations

The smear block is written before the paraffin sentence and carries its own morphology per finding
(fibrillary glial background for gliomas, cohesive whorls for meningioma, discohesive large cells for
lymphoma, cohesive epithelioid clusters for metastasis). With "Smear preparation only" the paraffin
sentence is phrased as the residual tissue, and Checks asks whether paraffin sections were examined.

## Local case mix

The roadmap card was sized on the five-year local corpus: 66 cases, 1.5 per cent — brain 21, brain
tumour 14, with parietal, occipital, periventricular, cerebellopontine angle and suprasellar lesions
and sphenoidal-ridge meningiomas. The site list and the procedure list follow that distribution.
