# Ependymal tumours — a site-first algorithm

## The problem

`ependymomaStage(c)` in `src/cnspathway.js` is a single posterior-fossa stage: `morph → site →
k27me3 → ezhip → meth → nos`. Its `site` node only asks whether the tumour is in the posterior
fossa, and the whole molecular arm downstream of it is H3 K27me3 and EZHIP. A supratentorial
ependymoma walks into a posterior fossa funnel; a spinal ependymoma reaches `na` at the site node
and then falls through a K27me3 question that does not apply to it. ZFTA, YAP1 and MYCN are absent
from the module and from the schema altogether, even though `dxEpendymal` already offers the
entities that depend on them.

That is backwards relative to the classification. Compartment is not a modifier applied after a
molecular result — it is the first discriminator, and it determines which molecular test is the
right one to order.

## What the sources say

cIMPACT-NOW update 7 set the shape: "Ependymomas should be classified by anatomic site and by
molecular group or an associated genetic alteration, so that classification of the disease reflects
its underlying biology", and "a diagnosis of subependymoma or myxopapillary ependymoma is made on
morphologic criteria. Other ependymomas would be classified according to anatomic site and the
results of molecular testing, if available."
<https://pmc.ncbi.nlm.nih.gov/articles/PMC8018155/>

Morphology remains the gate in front of all of it: "Prerequisite for the diagnosis of all
ependymoma is the presence of typical morphological and immunohistopathological features…
Localization in one of the three neuroanatomical compartments, specific molecular and, in some
cases, immunohistochemical criteria define the different tumor types."
<https://pmc.ncbi.nlm.nih.gov/articles/PMC9245931/>

The AOSNP-ADAPTR resource-level recommendations set out the order of testing per compartment, and
name the surrogate immunostains that stand in for the molecular test when it is unavailable:
L1CAM and p65 supratentorially, H3 K27me3 and EZHIP in the posterior fossa, MYCN in the spine,
HOXB13 for myxopapillary ependymoma. <https://onlinelibrary.wiley.com/doi/full/10.1111/bpa.70114>

cIMPACT-NOW update 11 revises the posterior fossa arm: "Loss of H3 K27me3 expression" replaces
"global reduction"; EZHIP supports PFA where K27me3 is ambiguous and methylation is unavailable;
PFB still requires methylation; and a posterior fossa tumour with retained K27me3, no EZHIP
overexpression and no conclusive methylation "should be considered as posterior fossa ependymoma,
NOS". <https://onlinelibrary.wiley.com/doi/10.1111/bpa.70035>

ICCR lists the essential (bold) alteration per type: ZFTA for ST-ZFTA, YAP1 for ST-YAP1, global
reduction of H3 K27me3 *or* methylation for PFA, methylation for PFB, 22q and absence of MYCN for
spinal ependymoma, MYCN for SP-MYCN, GFAP for myxopapillary ependymoma.
<https://www.iccr-cancer.org/wp-content/uploads/2026/03/ICCR-CNS-Molecular-information-2nd-ed-v2.1-bookmark-1.pdf>

## The proposed algorithm

### Stage `ep` — is it ependymal, and where is it

| Node | Question | Criterion |
| --- | --- | --- |
| `morph` | Ependymal morphology and immunoprofile | Perivascular pseudorosettes, true ependymal rosettes, monomorphic round nuclei in a fibrillary matrix; GFAP positive, EMA dot-like or ring-like, OLIG2 negative, SOX10 negative. A molecular result does not make an ependymoma of a tumour whose morphology is incompatible. |
| `pattern` | Is this one of the two morphologically defined types | Subependymoma and myxopapillary ependymoma are diagnosed on morphology at any site and **exit here** — they never reach the compartment question. HOXB13 resolves myxopapillary ependymoma against spinal ependymoma where the two overlap; methylation resolves the histologically unresolved case. |
| `site` | Which compartment | Supratentorial / posterior fossa / spinal, derived from `site`. This is the fork. Clear cell, tanycytic and papillary are descriptive patterns, not types. |

### Stage `st` — supratentorial

| Node | Question | Criterion |
| --- | --- | --- |
| `surrogate` | L1CAM and p65 | Strong diffuse L1CAM with nuclear p65 supports a ZFTA fusion where fusion testing is unavailable; both negative points to YAP1 or to NEC. |
| `zfta` | ZFTA fusion | Supratentorial + ZFTA fusion → ST ependymoma, ZFTA fusion-positive. Partners: RELA (commonest), MAML2, MAML3, NCOA1, NCOA2, MN1, CTNNA2. |
| `yap1` | YAP1 fusion | Supratentorial + YAP1 fusion → ST ependymoma, YAP1 fusion-positive. YAP1::MAMLD1 typically; PAS-positive eosinophilic granular bodies are frequent. |
| `nec` | Neither detected | Testing done, neither fusion → ST ependymoma, NEC. Testing unavailable or unsuccessful → ST ependymoma, NOS. |

### Stage `pf` — posterior fossa

| Node | Question | Criterion |
| --- | --- | --- |
| `k27me3` | H3 K27me3 | Loss of nuclear expression in tumour cells, with retained staining in endothelial and inflammatory cells as internal control → PFA. |
| `ezhip` | EZHIP | Strong diffuse nuclear EZHIP supports PFA where K27me3 is ambiguous and methylation is unavailable. Negative in PFB. |
| `meth` | Methylation profiling | Mandatory for PFB. Also the route to PFA where K27me3 is uninterpretable, and the route that identifies the PFSE class. |
| `nec` | Neither resolved | Retained K27me3 + EZHIP negative + no conclusive methylation → posterior fossa ependymoma, NOS. TERT promoter mutation and/or chromosome 6 loss with PFSE class → "Posterior fossa ependymal tumour with TERT promoter mutation and/or chromosome 6 loss and with PFSE methylation class assignment, NEC". A ZFTA fusion in the posterior fossa → "Posterior fossa ependymoma, ZFTA fusion-positive, NEC". |

### Stage `sp` — spinal

| Node | Question | Criterion |
| --- | --- | --- |
| `mimic` | What else is in the differential | Myxopapillary ependymoma (HOXB13); drop metastasis from PFA, suspected when OLIG2 is negative and K27me3 is lost — radiological correlation; diffuse midline glioma, H3 K27-altered, which can itself carry MYCN amplification, so K27M and K27me3 are read alongside. |
| `mycn` | MYCN | Amplification → SP ependymoma, MYCN-amplified. MYCN immunohistochemistry is the surrogate; FISH confirms. Highly recommended where histology is high grade or the radiology is aggressive, because high-grade histology is not always present. |
| `cnv` | Copy number | 22q loss supports spinal ependymoma; NF2 status is prognostic. |

### Grade

Histological, on all three compartments: brisk mitotic activity and microvascular proliferation
carry more weight than pleomorphism or necrosis; CNS WHO grade 2 or 3. Subependymoma grade 1,
myxopapillary ependymoma grade 2. No grade is assigned to SP ependymoma, MYCN-amplified. Ki-67 is
not a WHO grading marker for this family.

## Schema

New fields, group "Layer 4 — molecular", gated `molStatus is Reported` unless stated:

| Field | Type | Options |
| --- | --- | --- |
| `zfta` | select | Not performed / No fusion detected / ZFTA::RELA fusion detected / ZFTA fusion detected, other partner (specify) / Cannot be determined |
| `zftaDetail` | text | shown on "other partner" |
| `yap1` | select | Not performed / No fusion detected / YAP1::MAMLD1 fusion detected / YAP1 fusion detected, other partner (specify) / Cannot be determined |
| `yap1Detail` | text | shown on "other partner" |
| `epIhc` | multiselect | L1CAM positive (strong diffuse) / L1CAM negative / p65 nuclear positive / p65 negative / MYCN positive / MYCN negative / HOXB13 positive / HOXB13 negative |
| `mycn` | select | Not performed / Not amplified / Amplified / Cannot be determined |
| `epCnv` | multiselect | Gain of 1q / Loss of 6q / Loss of chromosome 6 / Loss of 22q / Homozygous deletion of CDKN2A/B / Stable genome / Chromosomal instability and aneuploidy |

**Bug fix in the same batch.** `h3k27me3` is gated `idhBranch is IDH-wildtype` — the same
mis-gating that hid `braf`. An ependymal case never sets `idhBranch`, so the field the posterior
fossa arm depends on is hidden on the form while the wizard asks for it. Re-gate to
`molStatus is Reported`.

## Report register

Printed sentences describe what is seen and nothing else: "A ZFTA::RELA fusion is detected.",
"Nuclear expression of H3 K27me3 is lost in tumour cells, with retained staining in endothelial and
inflammatory cells.", "MYCN is amplified." Survival associations of 1q gain and 6q loss, sensitivity
and specificity of the surrogate stains, and the resource-level reasoning stay in the panel and in
code comments.

## Checks

- ZFTA fusion detected but the diagnosis is not ST-ZFTA — info.
- PFB selected with no methylation result — warn; methylation is the essential criterion.
- PFA selected with retained K27me3 and no methylation — warn.
- Posterior fossa, retained K27me3, EZHIP negative, no methylation, but a specific group chosen —
  prompt NOS.
- Diagnosis compartment inconsistent with `site` — warn.
- Spinal with high-grade histology or high-grade features and MYCN not performed — info.
- ZFTA fusion in a posterior fossa tumour — info, NEC label.
- Grade recorded against SP ependymoma, MYCN-amplified — info.
- Myxopapillary ependymoma away from conus or filum with HOXB13 not performed — info.

## Batches

1. **Schema + register.** Seven fields, the `h3k27me3` re-gate, molecular sentences in
   `generators/cns_layers.js`. No pathway change. Rebuild the schema chain, tests for the new
   sentences.
2. **Pathway.** Rewrite `ependymomaStage` as `ep` + one of `st` / `pf` / `sp`; compartment derived
   in `read()`; `lab/cns-algorithm/nodefields.js` entries for every new node; tests asserting the
   whole question set per compartment.
3. **Wizard, checks, trial.** Wizard steps per compartment, the checks above, trial starting points
   for a supratentorial ZFTA case and a spinal MYCN case, screenshots, commit, rebuild and redeploy
   the trial.

## Open

- Whether the derived compartment needs an explicit override field for the rare tumour whose
  `site` entry is "Other".
- Whether the main app is deployed and published now that three pathway corrections sit in `src/`.
