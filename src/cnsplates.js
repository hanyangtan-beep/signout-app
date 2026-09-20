/**
 * Family reference plates - the diagnostic algorithm for a WHO CNS5 family, drawn in the app's
 * own hand.
 *
 * Why these exist. The pathway module covers four families of nineteen: adult-type diffuse glioma,
 * circumscribed astrocytic glioma, ependymal tumours and meningioma. The rest carry an entity
 * picklist and no map at all, which is exactly where a trainee wants one. The obvious fix - paste
 * the published figure - does not survive contact with two facts:
 *
 *   1. Licence. The figures worth having are not reusable. The WHO CNS5 overview (Louis et al.,
 *      Neuro-Oncology 2021) carries no open licence. cIMPACT-NOW update 11 is CC BY-NC-ND 4.0, and
 *      so is the adult-type diffuse glioma review that has the best algorithm figure - NC bars a
 *      published app, ND bars cropping or annotating it. Checked 2026-09-20 against the licence
 *      statement on each article page.
 *   2. Currency. A published figure is frozen at its publication date. The reusable CC BY reviews
 *      are 2022 and 2024-25; this app carries cIMPACT-NOW updates 11 and 12. A figure that
 *      disagrees with the app's own checks, inside the app, is a hazard rather than an
 *      inconsistency - the picture is the thing that looks authoritative.
 *
 * What is protected is a particular drawing, not the algorithm. The criteria, their order and the
 * branch points are facts, published to be applied. So the plate is drawn here from the criteria
 * the app already encodes, which makes it current by construction and unable to drift from the
 * checks. Where the real published figure is wanted, `figures` deep-links to it on the publisher's
 * page: linking is unrestricted, and the reader has institutional access.
 *
 * Register. Like the pathway drawer and its overlay, a plate is panel-only. It sets no field,
 * proposes no grade and contributes no word to any report, so it may carry criteria text that the
 * report register forbids in printed prose.
 *
 * No imports by design, matching `cnspathway.js` and `cnswizard.js`.
 */

/** Sources. Panel-only, so these are cited in the plate foot as well as here. */
const SRC = {
  who5: {
    label: 'WHO CNS5 overview',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8328013/',
  },
  review22: {
    label: 'WHO 2021 CNS classification review',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9427889/',
  },
  plgg: {
    label: 'Paediatric-type diffuse low-grade gliomas',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12372413/',
  },
  paedFront: {
    label: 'Paediatric CNS tumours and the 2021 classification',
    url: 'https://www.frontiersin.org/journals/molecular-neuroscience/articles/10.3389/fnmol.2024.1268038/full',
  },
  phgg: {
    label: 'Recent updates in paediatric diffuse glioma classification',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11493159/',
  },
  g34: {
    label: 'Diffuse hemispheric glioma, H3 G34-mutant - a review',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12354862/',
  },
  /**
   * CC BY-NC-ND 4.0, so linked and quoted in comment only - never reproduced, and no figure of it
   * is embedded. It is cited here because it is the current criteria set for the H3-wildtype,
   * IDH-wildtype entity and `cnspathway.js` already carries it as SRC.u11.
   */
  u11: {
    label: 'cIMPACT-NOW update 11',
    url: 'https://onlinelibrary.wiley.com/doi/10.1111/bpa.70035',
  },
};

/**
 * Paediatric-type diffuse low-grade gliomas.
 *
 * Grounding, all four entities: the family is IDH-wildtype throughout and splits on driver -
 * MYB/MYBL1 against the MAPK pathway
 * (https://pmc.ncbi.nlm.nih.gov/articles/PMC9427889/, https://pmc.ncbi.nlm.nih.gov/articles/PMC12372413/).
 *
 * Grade is not uniform across the family, which an earlier build of this plate got wrong. Three
 * carry CNS WHO grade 1: diffuse astrocytoma MYB- or MYBL1-altered and PLNTY are both listed at
 * grade 1 in the WHO CNS5 table of newly recognised types, and angiocentric glioma carries grade 1
 * from CNS4 (https://pmc.ncbi.nlm.nih.gov/articles/PMC8328013/,
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC9763978/). Diffuse low-grade glioma, MAPK pathway-altered
 * has NO assigned grade - it appears in the CNS5 newly-recognised list with the grade column blank,
 * and the paediatric review states these tumours "are believed to have a favourable outcome even if
 * a CNS WHO grade has yet to be assigned" (https://pmc.ncbi.nlm.nih.gov/articles/PMC9763978/).
 * `FIXED_GRADE` in generators/cns_layers.js omits it for the same reason, and the two are now tied
 * together by a test.
 * Molecular demonstration is mandatory for the two MAPK entities and not for angiocentric glioma;
 * for MYB/MYBL1-altered astrocytoma a characteristic methylation profile may stand in where no
 * alteration is detectable. CD34 and OLIG2 carry most of the separation at the bench, and the
 * dot-like EMA of angiocentric glioma is the classic ependymoma trap.
 */
const PAED_LOW = {
  family: 'Paediatric-type diffuse low-grade gliomas',
  /**
   * The entity field this family drives. Named per plate rather than tried in turn, because each
   * entity picklist carries a schema default that is present whether or not anyone chose it - a
   * plate that read them all in turn would mark an entity from a different family's default.
   */
  entityField: 'dxPaedLow',
  title: 'Paediatric-type diffuse low-grade gliomas',
  lede: 'All four are IDH-wildtype and the family splits on which driver is altered. Three are grade 1; the MAPK-altered diffuse glioma has no assigned grade at all. At the bench CD34 and OLIG2 do most of the separating.',
  gate: {
    label: 'Before the family applies',
    nodes: [
      {
        key: 'g1',
        label: 'Diffusely infiltrative, low-grade',
        detail: 'A diffusely infiltrative glial neoplasm without the features of an anaplastic one. Marked hypercellularity, brisk or atypical mitoses, microvascular proliferation and geographic necrosis are absent across the family.',
        source: SRC.plgg,
      },
      {
        key: 'g2',
        label: 'IDH-wildtype',
        detail: 'The paediatric-type diffuse gliomas are IDH-wildtype throughout. An IDH mutation moves the case to the adult-type family, whatever the age of the patient.',
        source: SRC.review22,
      },
      {
        key: 'g3',
        label: 'H3-wildtype',
        detail: 'H3 status separates low-grade from high-grade paediatric-type diffuse glioma. A K27 or G34 alteration leaves this family.',
        source: SRC.review22,
      },
      {
        key: 'g4',
        label: 'Usually long-standing epilepsy',
        detail: 'Context rather than a criterion. Most sit in the cerebral hemispheres of children, adolescents or young adults and present with drug-resistant seizures, placing them among the long-term epilepsy-associated tumours.',
        source: SRC.paedFront,
      },
    ],
  },
  fork: { label: 'Which driver is altered?' },
  rails: [
    {
      key: 'myb',
      label: 'MYB or MYBL1 altered',
      note: 'OLIG2 negative in both. Cortical, epilepsy-associated.',
      nodes: [
        {
          key: 'ang',
          label: 'Angiocentric glioma',
          grade: 'CNS WHO grade 1',
          key_line: 'MYB::QKI · EMA dot-like · OLIG2 negative',
          detail: 'Monomorphic bipolar spindle cells aggregating concentrically in perivascular spaces, with subpial condensation and interspersed neurons. Nearly all have a MYB alteration at 6q23, most often a MYB::QKI fusion, but demonstrating the rearrangement is not mandatory.',
          note: 'The dot-like or ring-like EMA is the ependymoma trap. OLIG2 and neuronal markers are negative; GFAP, S100 and vimentin positive; Ki-67 under 5 per cent.',
          source: SRC.plgg,
        },
        {
          key: 'mybast',
          label: 'Diffuse astrocytoma, MYB- or MYBL1-altered',
          grade: 'CNS WHO grade 1',
          key_line: 'MYB or MYBL1 structural variant · CD34 negative',
          detail: 'A monomorphic astrocytic neoplasm of low to moderate cellularity with small round-to-ovoid nuclei permeating neuropil, diffusely infiltrative borders and subpial condensation. A structural variant involving MYB or MYBL1 is required; where none is detectable, a characteristic DNA methylation profile may be sufficient.',
          note: 'GFAP positive, CD34 and OLIG2 negative, ATRX retained, IDH1 p.R132H negative, Ki-67 under 1 per cent. A subtle angiocentric pattern may occur and does not make it an angiocentric glioma.',
          source: SRC.plgg,
        },
      ],
    },
    {
      key: 'mapk',
      label: 'MAPK pathway altered',
      note: 'Molecular demonstration is mandatory for both.',
      nodes: [
        {
          key: 'plnty',
          label: 'Polymorphous low-grade neuroepithelial tumour of the young',
          grade: 'CNS WHO grade 1',
          key_line: 'BRAF p.V600E or FGFR2/FGFR3 · CD34 diffuse strong',
          detail: 'Oligodendroglioma-like elements in at least part of an at least focally infiltrative low-grade glioma, with calcification as a hallmark and a polymorphous range from clear cells with perinuclear haloes to spindled and pleomorphic forms. Unequivocal evidence of a BRAF, FGFR2, FGFR3 or other MAPK-pathway alteration is required.',
          note: 'Diffuse strong CD34 is an essential criterion and the single most useful stain in the family. OLIG2 and GFAP are diffusely positive. Rosenthal fibres, eosinophilic granular bodies and dysmorphic neurons are typically absent, which is what separates it from pilocytic astrocytoma and ganglioglioma.',
          source: SRC.plgg,
        },
        {
          key: 'mapkdlg',
          label: 'Diffuse low-grade glioma, MAPK pathway-altered',
          grade: 'No CNS WHO grade assigned',
          key_line: 'FGFR1 TKD-ITD, FGFR1 mutation or BRAF p.V600E',
          detail: 'An infiltrative low-grade glioma resembling oligodendroglioma, astrocytoma or a mixture of the two. FGFR1-altered tumours tend to be multinodular with clear rounded cells overlapping dysembryoplastic neuroepithelial tumour; BRAF p.V600E tumours tend to a fibrillary background with elongated to spindled cells and subpial condensation.',
          note: 'Alone in this family it carries no CNS WHO grade: the behaviour is believed to be favourable but a grade has yet to be assigned, so the grade line is left unset rather than taken as grade 1 from the company it keeps. IDH mutation, histone mutation and CDKN2A deletion must all be absent. Infiltration exceeds the circumscribed paediatric gliomas but falls well short of an adult-type IDH-mutant diffuse glioma.',
          source: SRC.plgg,
        },
      ],
    },
  ],
  /** The stains that actually decide it, in the order they are worth doing. */
  discriminators: [
    ['CD34', 'Diffuse and strong is an essential criterion for PLNTY. Negative in the MYB/MYBL1 astrocytoma.'],
    ['OLIG2', 'Diffuse in PLNTY. Negative in both MYB-driven entities.'],
    ['EMA', 'Dot-like or ring-like points to angiocentric glioma, and is the reason it is mistaken for ependymoma.'],
    ['Calcification', 'Confluent and radiologically obvious is the PLNTY hallmark.'],
  ],
  /**
   * The genuine published figures, linked rather than reproduced. Both are CC BY, but the app links
   * to every figure on principle: a link is always permitted, never goes stale against a licence,
   * and opens the figure in its own context.
   */
  figures: [
    { label: 'Simplified WHO CNS5 diagnostic algorithm (Fig 1)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9427889/figure/Fig1/', cite: 'WHO 2021 CNS classification review, CC BY 4.0' },
    { label: 'Paediatric-type diffuse low-grade gliomas, figures 1 to 4', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12372413/#FIG1', cite: 'Pediatric-Type Diffuse Low-Grade Gliomas, CC BY 4.0' },
    { label: 'Grade, molecular alteration, age and site in one table (Fig 1)', url: 'https://www.frontiersin.org/journals/molecular-neuroscience/articles/10.3389/fnmol.2024.1268038/full#F1', cite: 'Paediatric CNS tumours and the 2021 classification, CC BY 4.0' },
  ],
  sources: [SRC.review22, SRC.plgg, SRC.paedFront],
};

/**
 * Paediatric-type diffuse high-grade gliomas.
 *
 * Grounding. The family is IDH-wildtype throughout and splits first on histone H3: an H3 alteration
 * gives the two eponymous entities, separated by site rather than by morphology - K27 in the midline,
 * G34 in the hemispheres - and H3-wildtype gives the other two, separated by age and driver
 * (https://pmc.ncbi.nlm.nih.gov/articles/PMC11493159/,
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC9209749/).
 *
 * Three of the four are CNS WHO grade 4 and the fourth carries no grade at all. For the two histone
 * entities the grade holds "irrespective of the presence or absence of necrosis and microvascular
 * proliferation", which is the single most useful thing to know about them at the bench: a bland
 * midline biopsy is still grade 4 (https://pmc.ncbi.nlm.nih.gov/articles/PMC11493159/). Infant-type
 * hemispheric glioma is assigned no WHO grade, so the plate says so rather than inventing one.
 *
 * Two points of current practice that a frozen published figure would miss. K27-altered is no longer
 * K27M-mutant only - EZHIP overexpression and EGFR alteration also qualify, both acting through loss
 * of K27 trimethylation. And cIMPACT-NOW update 11 holds that "a definitive diagnosis of Diffuse
 * pediatric-type high-grade glioma, H3-wildtype and IDH-wildtype requires DNA methylation
 * profiling", with PDGFRA, EGFR or MYCN single-gene surrogates permitted under 25 years and the
 * diagnosis then qualified NOS (https://onlinelibrary.wiley.com/doi/10.1111/bpa.70035).
 *
 * OLIG2 is the stain that earns its place here: negative in G34-mutant and in the EGFR-mutant
 * subtype of diffuse midline glioma, and an OLIG2-negative malignant glioma in a young adult is one
 * of update 11's stated triggers to think of the H3-wildtype entity
 * (https://pmc.ncbi.nlm.nih.gov/articles/PMC12354862/).
 */
const PAED_HIGH = {
  family: 'Paediatric-type diffuse high-grade gliomas',
  entityField: 'dxPaedHigh',
  title: 'Paediatric-type diffuse high-grade gliomas',
  lede: 'All four are IDH-wildtype. Histone H3 splits the family in two, then site decides between the H3-altered pair and age decides between the H3-wildtype pair. Three are grade 4; the infant tumour carries no grade at all.',
  gate: {
    label: 'Before the family applies',
    nodes: [
      {
        key: 'g1',
        label: 'Diffuse glioma with mitotic activity',
        detail: 'A diffusely infiltrative glioma with histological features of malignancy. Mitotic activity is the entry criterion; microvascular proliferation and palisading necrosis are desirable rather than required, and for the two histone-altered entities the grade holds whether or not they are present.',
        source: SRC.u11,
      },
      {
        key: 'g2',
        label: 'IDH-wildtype',
        detail: 'The paediatric-type diffuse gliomas are IDH-wildtype throughout, and update 11 tightened the wording to absence of mutation in IDH1 and IDH2 rather than either. An IDH mutation moves the case to the adult-type family whatever the age.',
        source: SRC.u11,
      },
      {
        key: 'g3',
        label: 'Not restricted to children',
        detail: 'Typically a child, adolescent or young adult, but the family is not confined to them. The H3-wildtype entity is reported up to 70 years and is worth considering in any malignant glioma under 40, particularly one that is OLIG2- or ATRX-negative, TERT promoter-wildtype, or post-irradiation.',
        source: SRC.u11,
      },
      {
        key: 'g4',
        label: 'Methylation profiling settles it',
        detail: 'Context rather than a criterion. Histology alone does not separate these four, and for the H3-wildtype entity a definitive diagnosis requires DNA methylation profiling. Where testing is unavailable the diagnosis is made as far as it can be and qualified NOS.',
        source: SRC.u11,
      },
    ],
  },
  fork: { label: 'Is histone H3 altered?' },
  rails: [
    {
      key: 'h3alt',
      label: 'Histone H3 altered',
      note: 'Site separates them, not morphology. Both grade 4 regardless of necrosis.',
      nodes: [
        {
          key: 'dmg',
          label: 'Diffuse midline glioma, H3 K27-altered',
          grade: 'CNS WHO grade 4',
          key_line: 'K27M, EZHIP or EGFR · K27me3 lost · midline',
          detail: 'A diffusely infiltrating glioma of the midline - pons, thalamus, spinal cord, and also hypothalamus, pineal region and cerebellum. Morphology is polymorphous and unhelpful, ranging from small monomorphic cells to astrocytic, oligodendroglial, epithelioid, piloid, giant-cell and undifferentiated patterns. The grade holds irrespective of necrosis and microvascular proliferation, so a bland-looking midline biopsy is still grade 4.',
          note: 'Three routes qualify as K27-altered, all acting through loss of K27 trimethylation: an H3 K27M mutation in H3F3A or HIST1H3B/C, EZHIP overexpression, or an EGFR alteration. Lost trimethylation is therefore not the same as a K27M mutation, and posterior fossa group A ependymoma loses it too. OLIG2 is positive except in the EGFR-mutant subtype, which is OLIG2-negative and GFAP-positive.',
          source: SRC.phgg,
        },
        {
          key: 'g34',
          label: 'Diffuse hemispheric glioma, H3 G34-mutant',
          grade: 'CNS WHO grade 4',
          key_line: 'H3-3A G34R or G34V · ATRX lost · OLIG2 negative',
          detail: 'A hemispheric tumour of adolescents and young adults, usually frontal or parietal. Two morphologies occur: glioblastoma-like with brisk mitoses, palisading necrosis and microvascular proliferation, or small hyperchromatic cells resembling an embryonal tumour. G34R is commoner than G34V. The grade holds regardless of microvascular proliferation and necrosis.',
          note: 'Both patterns are OLIG2-negative, with ATRX loss and diffuse p53 - a glioblastoma-like hemispheric glioma in a young patient that is OLIG2-negative should raise it. The embryonal-like pattern is diffusely synaptophysin-positive with only focal GFAP, which is the embryonal tumour trap. TP53 mutation is near-universal and CDKN2A is homozygously deleted in about three-quarters.',
          source: SRC.g34,
        },
      ],
    },
    {
      key: 'h3wt',
      label: 'Histone H3-wildtype',
      note: 'Age and driver separate them. Both need molecular work.',
      nodes: [
        {
          key: 'phgg',
          label: 'Diffuse paediatric-type high-grade glioma, H3-wildtype and IDH-wildtype',
          grade: 'CNS WHO grade 4',
          key_line: 'Methylation subclass RTK1, RTK2 or MYCN · K27me3 retained',
          detail: 'A diffuse glioma with mitotic activity, wildtype for H3, IDH1 and IDH2, whose methylation profile aligns with one of the subtypes: RTK1 with PDGFRA alteration, RTK2 with EGFR alteration and TERT promoter mutation, or MYCN with MYCN amplification. Morphology is glioblastoma-like or embryonal-like; the MYCN subtype may be biphasic, with circumscribed nodules beside a diffuse component.',
          note: 'Definitive diagnosis requires methylation profiling. Where it is out of reach, single-gene PDGFRA, EGFR or MYCN may support it in a patient under 25 and the diagnosis is then qualified NOS. Trimethylation is retained, which separates it from a midline K27-altered tumour. RTK1 may be post-irradiation and may show MSH2 or MSH6 loss over a germline mismatch-repair defect.',
          source: SRC.u11,
        },
        {
          key: 'ithg',
          label: 'Infant-type hemispheric glioma',
          grade: 'No CNS WHO grade assigned',
          key_line: 'RTK fusion — NTRK1/2/3, ROS1, ALK or MET',
          detail: 'A large superficial hemispheric tumour of the first year of life, often cystic and necrotic on imaging. Histology is high-grade: high cellularity, nuclear pleomorphism, brisk mitoses, necrosis and endothelial proliferation. NTRK-fused tumours tend to be spindled with a high Ki-67; ALK-fused tumours may be biphasic, or show ependymal or ganglion-cell differentiation.',
          note: 'No CNS WHO grade is assigned to this entity, so the grade line is left unset rather than inferred from the histology. The fusion is the point: it is targetable, so demonstrating it changes treatment and not only the name. GFAP and OLIG2 are positive, and ALK is positive in ALK-fused tumours. A biphasic ALK tumour may contain a component that looks low-grade.',
          source: SRC.phgg,
        },
      ],
    },
  ],
  discriminators: [
    ['OLIG2', 'Negative in G34-mutant and in the EGFR-mutant subtype of midline glioma. An OLIG2-negative malignant glioma in a young patient is a trigger to look further.'],
    ['H3 K27me3', 'Lost in K27-altered, retained in the H3-wildtype entity. Loss is not a K27M mutation - EZHIP and EGFR-altered tumours lose it, and so does group A ependymoma.'],
    ['ATRX and p53', 'ATRX loss with diffuse p53 points to G34-mutant. ATRX negativity also raises the H3-wildtype entity.'],
    ['Fusion panel', 'NTRK1/2/3, ROS1, ALK and MET in a hemispheric tumour under one year. Targetable, so worth doing early.'],
    ['Methylation profiling', 'The only definitive route to the H3-wildtype entity, and what separates it from an NOS diagnosis.'],
  ],
  figures: [
    { label: 'Simplified WHO CNS5 diagnostic algorithm (Fig 1)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9427889/figure/Fig1/', cite: 'WHO 2021 CNS classification review, CC BY 4.0' },
    { label: 'Differential diagnosis of paediatric diffuse glioma (Table 1)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11493159/#T1', cite: 'Recent updates in paediatric diffuse glioma classification, CC BY 4.0' },
    { label: 'Grade, molecular alteration, age and site in one table (Fig 1)', url: 'https://www.frontiersin.org/journals/molecular-neuroscience/articles/10.3389/fnmol.2024.1268038/full#F1', cite: 'Paediatric CNS tumours and the 2021 classification, CC BY 4.0' },
    { label: 'Revised criteria for the H3-wildtype entity', url: 'https://onlinelibrary.wiley.com/doi/10.1111/bpa.70035', cite: 'cIMPACT-NOW update 11 - linked only, CC BY-NC-ND 4.0' },
  ],
  sources: [SRC.phgg, SRC.g34, SRC.u11, SRC.paedFront],
};

const PLATES = { [PAED_LOW.family]: PAED_LOW, [PAED_HIGH.family]: PAED_HIGH };

/** Families that have a plate, for the button to test against. */
export const PLATE_FAMILIES = Object.keys(PLATES);

/** The plate for a family name, or null. */
export function plateFor(family) {
  return PLATES[family] || null;
}

/** Does this case have a family plate to show? */
export function plateSupported(values) {
  return !!plateFor(values?.dxFamily);
}

/**
 * The entity the form currently holds for this family, or ''.
 *
 * Deliberately not called "recorded": these fields carry a schema default, so a value here means
 * the form shows it, not that the reporter chose it. The plate marks it as selected on the form and
 * claims no more than that.
 */
export function plateSelection(values) {
  const plate = plateFor(values?.dxFamily);
  if (!plate || !plate.entityField) return '';
  return values[plate.entityField] || '';
}

// ---------- geometry ----------
//
// Same contract as pathwayChart(): a pure function returning a 1200-wide drawing box with absolute
// coordinates, so the view can position wrapping HTML boxes on them and draw only the connectors in
// SVG. Tested for overlap and for staying inside the box.

const W = 1200;
const PAD = 44;
const GATE_Y = 44;
const GATE_H = 62;
const GATE_GAP = 22;
const FORK_W = 260;
const FORK_H = 46;
const FORK_Y = 146;
const RAIL_Y = 248;
const RAIL_GAP = 32;
const RAIL_HEAD = 56;
const NODE_H = 104;
const NODE_GAP = 12;
const RAIL_PAD = 14;

/** Lay a plate out. Returns boxes with x/y/w/h plus the links between them. */
export function plateChart(plate) {
  if (!plate) return null;
  const gateN = plate.gate.nodes.length;
  const gateW = Math.round((W - PAD * 2 - GATE_GAP * (gateN - 1)) / gateN);
  const gate = {
    label: plate.gate.label,
    nodes: plate.gate.nodes.map((n, i) => ({
      key: n.key,
      node: n,
      x: PAD + i * (gateW + GATE_GAP),
      y: GATE_Y,
      w: gateW,
      h: GATE_H,
    })),
  };

  const fork = {
    label: plate.fork.label,
    x: Math.round((W - FORK_W) / 2),
    y: FORK_Y,
    w: FORK_W,
    h: FORK_H,
  };

  const railN = plate.rails.length;
  const railW = Math.round((W - PAD * 2 - RAIL_GAP * (railN - 1)) / railN);
  const rails = plate.rails.map((r, i) => {
    const x = PAD + i * (railW + RAIL_GAP);
    const h = RAIL_HEAD + r.nodes.length * NODE_H + (r.nodes.length - 1) * NODE_GAP + RAIL_PAD;
    return {
      key: r.key,
      label: r.label,
      note: r.note,
      x,
      y: RAIL_Y,
      w: railW,
      h,
      nodes: r.nodes.map((n, j) => ({
        key: n.key,
        node: n,
        x: x + RAIL_PAD,
        y: RAIL_Y + RAIL_HEAD + j * (NODE_H + NODE_GAP),
        w: railW - RAIL_PAD * 2,
        h: NODE_H,
      })),
    };
  });

  // Connectors, as point arrays so the existing pwcLinks() renderer draws them unchanged: the gate
  // row chains left to right, the row drops to the fork, and the fork elbows out to each rail head.
  const links = [];
  for (let i = 0; i < gate.nodes.length - 1; i += 1) {
    const a = gate.nodes[i];
    const b = gate.nodes[i + 1];
    links.push({ kind: 'flow', points: [[a.x + a.w, a.y + a.h / 2], [b.x, b.y + b.h / 2]] });
  }
  const lastGate = gate.nodes[gate.nodes.length - 1];
  const gateMidX = Math.round(PAD + (W - PAD * 2) / 2);
  links.push({ kind: 'flow', points: [[gateMidX, lastGate.y + lastGate.h], [gateMidX, fork.y]] });
  const elbow = Math.round((fork.y + fork.h + RAIL_Y) / 2);
  for (const r of rails) {
    const cx = r.x + Math.round(r.w / 2);
    links.push({
      kind: 'flow',
      points: [[fork.x + fork.w / 2, fork.y + fork.h], [fork.x + fork.w / 2, elbow], [cx, elbow], [cx, r.y]],
    });
  }

  const height = Math.max(...rails.map((r) => r.y + r.h)) + 28;
  return { width: W, height, gate, fork, rails, links };
}

/** Every selectable entry, in reading order - the view uses this to resolve a selection. */
export function plateEntries(chart) {
  if (!chart) return [];
  return [...chart.gate.nodes, ...chart.rails.flatMap((r) => r.nodes)];
}

export default { plateFor, plateSupported, plateSelection, plateChart, plateEntries, PLATE_FAMILIES };
