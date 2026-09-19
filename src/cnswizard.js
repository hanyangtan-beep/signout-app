// Guided intake for the CNS templates: the diagnostic funnel asked one question at a time, in the
// order a neuropathologist works through it, writing into the ordinary form fields as it goes.
//
// It is an option, not a replacement. The standard form stays exactly where it was; the wizard is a
// second way in for someone who does not yet carry the funnel in their head, and every answer it
// records is the same value the form would have taken. Close it at any point and the case is intact.
//
// Nothing here is printed. The `why` text on each step is teaching copy for the panel, and the
// `caution` text is a caveat raised by the answers already given. The report register is untouched:
// the wizard only sets fields, and the generators decide what prose those fields produce.
//
// Pure functions, no DOM, so tests/cnswizard.test.js can walk the whole funnel.
//
//   wizardSteps(schema)          -> the steps this schema supports, in funnel order
//   visibleSteps(steps, values)  -> the steps that apply to the case as it currently stands
//   nextStep(steps, values)      -> the first applicable step with nothing recorded, or null
//   wizardProgress(steps, values)-> { answered, total, step }
//   cautions(step, values)       -> caveats to show under the current question
//
// Knowledge grounding (comments only, never printed). The order follows the reporting funnel in
// docs/specs/cns-cimpact-pathways.md, which in turn follows AOSNP-ADAPTR
// (https://pmc.ncbi.nlm.nih.gov/articles/PMC12861567/) and WHO CNS5 essential criteria
// (https://pmc.ncbi.nlm.nih.gov/articles/PMC10227121/), with the cIMPACT-NOW updates 8 to 12
// carried as cautions rather than as rules that write a diagnosis.

const arr = (x) => (Array.isArray(x) ? x : x === undefined || x === null || x === '' ? [] : [x]);
const num = (x) => {
  if (x === undefined || x === null || x === '') return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
};
const has = (v, id) => {
  const x = v?.[id];
  return Array.isArray(x) ? x.length > 0 : x !== undefined && x !== null && x !== '';
};
/** A select that has been moved off "Not performed" counts as answered; the default does not. */
const answeredSelect = (v, id, notPerformed = 'Not performed') => has(v, id) && v[id] !== notPerformed;
// A fusion select records a found fusion. The bare test `/fusion detected/` also matches
// "No fusion detected", the opposite answer, so the negative is excluded explicitly. Mirrors
// `fusionFound` in generators/cns_layers.js.
const fusionFound = (x) => /fusion detected/i.test(x || '') && !/^No\b/i.test(x || '');

/**
 * The funnel. Each step names the field it writes, the question in the pathologist's words, why the
 * step is there, and when it applies. `answered` defaults to "the field holds something"; a step
 * that must be positively answered overrides it.
 */
const STEPS = [
  {
    id: 'age',
    field: 'patientAge',
    question: 'How old is the patient?',
    why: 'Age gates several of the rules further down: a solitary EGFR amplification or combined +7/-10 will not define glioblastoma under 40, IDH sequencing is expected under 55 when R132H is negative, and mismatch-repair testing is considered in the young.',
  },
  {
    id: 'family',
    field: 'dxFamily',
    altField: 'finding',
    question: 'On the haematoxylin and eosin sections, which family is this?',
    why: 'The funnel starts with the morphology. Everything after this - which antibodies, which molecular tests, which grading rules - follows from the family you land in here.',
  },
  {
    id: 'entity',
    field: 'dxAdult',
    question: 'Which entity within the family, on morphology alone for now?',
    why: 'A working entity, not a final one. Layer 4 may move it, and the wizard will tell you when the molecular results do not support what you picked.',
    applies: (v) => v.dxFamily === 'Adult-type diffuse gliomas',
  },
  {
    id: 'epEntity',
    field: 'dxEpendymal',
    question: 'Which ependymal tumour, on morphology and site?',
    why: 'The ependymal types are defined by the compartment they sit in and the molecular group of that compartment, so the working entity and the site are one question in two parts.',
    applies: (v) => v.dxFamily === 'Ependymal tumours',
  },
  {
    id: 'caEntity',
    field: 'dxCircumscribed',
    question: 'Which circumscribed astrocytic glioma, on morphology alone for now?',
    why: 'This family is defined by a MAPK pathway alteration rather than by IDH, so the working entity sets which alteration is looked for first: KIAA1549::BRAF in a pilocytic astrocytoma, BRAF p.V600E with CDKN2A/B in a pleomorphic xanthoastrocytoma.',
    applies: (v) => v.dxFamily === 'Circumscribed astrocytic gliomas',
  },
  {
    id: 'site',
    field: 'site',
    question: 'Where is the tumour?',
    why: 'A midline diffuse astrocytic glioma gets H3 K27 assessment at any age, so the site decides whether that branch opens. An ependymal tumour is classified on the compartment itself: supratentorial, posterior fossa or spinal.',
    applies: (v, ctx) => ctx.glioma(v) || ctx.ependymal(v) || ctx.circumscribed(v),
  },
  {
    id: 'basicIhc',
    field: 'ihc',
    question: 'Which immunohistochemistry has been done so far?',
    why: 'The first panel frames the differential before any molecular test is sent: GFAP, OLIG2 and Ki-67 on a glioma, GFAP with EMA on an ependymal tumour, where dot-like or ring-like staining supports ependymal differentiation. Ki-67 is a proliferation guide rather than a grading criterion in either.',
    applies: (v, ctx) => ctx.glioma(v) || ctx.ependymal(v) || ctx.circumscribed(v),
    answered: (v) => has(v, 'ihc') || has(v, 'ihcOther'),
    optional: true,
  },
  {
    id: 'molStatus',
    field: 'molStatus',
    question: 'Where do the molecular studies stand?',
    why: 'Layer 4 only opens once there is something to record. Until then the diagnosis stays at what the morphology supports, with the molecular work named as pending.',
    applies: (v, ctx) => ctx.glioma(v) || ctx.circumscribed(v) || ctx.ependymal(v),
  },
  {
    id: 'idh1R132H',
    field: 'idh1R132H',
    question: 'What does IDH1 R132H immunohistochemistry show?',
    why: 'The branch point of the whole funnel. R132H covers the great majority of IDH-mutant gliomas, but it is one codon: a negative stain is not an IDH-wildtype tumour until the gene has been sequenced.',
    applies: (v, ctx) => ctx.reported(v) && ctx.glioma(v),
    answered: (v) => answeredSelect(v, 'idh1R132H'),
  },
  {
    id: 'idhSeq',
    field: 'idhSeq',
    question: 'What does IDH1 / IDH2 sequencing show?',
    why: 'Sequencing settles the branch where the stain cannot. It is expected under 55 with a negative R132H stain before an IDH-wildtype diagnosis is made.',
    applies: (v, ctx) => ctx.reported(v) && ctx.glioma(v) && v.idh1R132H === 'Negative',
    answered: (v) => answeredSelect(v, 'idhSeq'),
  },
  {
    id: 'idhBranch',
    field: 'idhBranch',
    question: 'Which branch does that put the tumour on?',
    why: 'The two Layer 4 panels are different lists. Setting the branch here opens the right one and closes the other.',
    applies: (v, ctx) => ctx.reported(v) && ctx.glioma(v),
  },

  // ----- branch A: IDH-mutant -----
  // ATRX and p53 are asked before 1p/19q, and 1p/19q is then asked only of the cases they leave
  // open. cIMPACT-NOW update 2 (https://pubmed.ncbi.nlm.nih.gov/29497819/) allows astrocytoma,
  // IDH-mutant to be diagnosed on IDH mutation with ATRX loss and/or strong diffuse p53 "in the
  // absence of 1p/19q testing" (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8028562/), and it is
  // also the cheaper stain-first order the bench runs.
  {
    id: 'atrx',
    field: 'atrx',
    question: 'What do ATRX and p53 show?',
    why: 'Loss of nuclear ATRX with an abnormal p53 pattern supports an astrocytoma on the IDH-mutant branch; both retained, with a codeletion, supports an oligodendroglioma.',
    applies: (v, ctx) => ctx.mutant(v),
    answered: (v) => answeredSelect(v, 'atrx'),
    optional: true,
  },
  {
    id: 'codel',
    field: 'codel',
    question: 'What does 1p/19q testing show?',
    why: 'Codeletion separates oligodendroglioma from astrocytoma on the IDH-mutant branch, and the two are graded by different rules from here on.',
    applies: (v, ctx) => ctx.mutant(v) && (ctx.oligo(v) || !ctx.astroByIhc(v)),
    answered: (v) => answeredSelect(v, 'codel'),
  },
  {
    id: 'features',
    field: 'features',
    question: 'Which of these are present on the sections?',
    why: 'Microvascular proliferation or necrosis carries grade 4 in an IDH-mutant astrocytoma on their own. Record what you see; the grade follows.',
    applies: (v, ctx) => ctx.glioma(v),
    answered: (v) => has(v, 'features') || has(v, 'mitoses'),
    optional: true,
  },
  {
    id: 'mitoses',
    field: 'mitoses',
    question: 'How many mitoses in ten high-power fields, counted in the most active area?',
    why: 'Three or more per 2.4 mm2 - ten fields of 0.24 mm2 - is the grade 2 against grade 3 line in an IDH-mutant astrocytoma. Check your own field diameter before you trust the count.',
    applies: (v, ctx) => ctx.mutantAstro(v) || ctx.oligo(v),
  },
  {
    id: 'cdkn2a',
    field: 'cdkn2a',
    question: 'What does CDKN2A / CDKN2B copy number show?',
    why: 'Homozygous deletion carries grade 4 in an IDH-mutant astrocytoma, and it is read together with the MAPK alteration in pleomorphic xanthoastrocytoma and in high-grade astrocytoma with piloid features. Hemizygous loss is not a criterion, and p16 or MTAP immunohistochemistry is a surrogate, not the test.',
    applies: (v, ctx) => ctx.mutant(v) || ctx.pxaOrPiloid(v),
    answered: (v) => answeredSelect(v, 'cdkn2a'),
  },
  {
    id: 'pdgfra',
    field: 'pdgfra',
    question: 'Is PDGFRA amplified?',
    why: 'It carries grade 4 in an IDH-mutant astrocytoma on its own, alongside CDKN2A/B homozygous deletion, and it is easy to miss because the histology need not look grade 4.',
    applies: (v, ctx) => ctx.mutantAstro(v),
    answered: (v) => answeredSelect(v, 'pdgfra'),
  },
  {
    id: 'molHigher',
    field: 'molHigher',
    question: 'Any of these higher-grade alterations?',
    why: 'Any one of them carries grade 3 in an IDH-mutant astrocytoma where microvascular proliferation, necrosis, CDKN2A/B homozygous deletion and PDGFRA amplification are all absent - a tumour that would otherwise read as grade 2.',
    applies: (v, ctx) => ctx.mutantAstro(v),
    optional: true,
  },

  // ----- branch B: IDH-wildtype -----
  {
    id: 'h3k27me3',
    field: 'h3k27me3',
    question: 'What does H3 K27 trimethylation show?',
    why: 'A midline diffuse astrocytic glioma is assessed for H3 K27 at any age, and in a posterior fossa ependymoma loss of trimethylation defines group A alongside the morphology. Loss of trimethylation is not the same as an H3 K27M mutation; EZHIP overexpression and several other tumours also lose it.',
    // An ependymal tumour never reaches the IDH branch - it is not on the IDH funnel at all - so it
    // cannot be gated on the wildtype branch the way a midline diffuse glioma is. K27me3 is asked of
    // it on the site, which is what its own classification turns on.
    // In an ependymal tumour it is a posterior fossa question, where loss classifies group A, and a
    // spinal one, where loss with OLIG2 negativity raises a drop metastasis from a posterior fossa
    // group A tumour. It is not asked of a supratentorial ependymoma.
    applies: (v, ctx) => (ctx.wildtype(v) && ctx.midline(v))
      || (ctx.ependymal(v) && !ctx.morphDefined(v) && (ctx.posteriorFossa(v) || ctx.spinal(v) || !ctx.compartment(v))),
    answered: (v) => answeredSelect(v, 'h3k27me3'),
  },
  {
    id: 'h3seq',
    field: 'h3seq',
    question: 'What does H3 sequencing show?',
    why: 'Confirms K27M or G34R/V where the stain is suggestive. Over 55 with classic hemispheric histology, G34-wildtype may be assumed and the test is not needed.',
    applies: (v, ctx) => ctx.wildtype(v) && (v.h3k27me3 === 'Loss of nuclear expression' || v.h3g34w === 'Positive' || ctx.midline(v)),
    answered: (v) => answeredSelect(v, 'h3seq'),
    optional: true,
  },
  {
    id: 'tert',
    field: 'tert',
    question: 'What does TERT promoter testing show?',
    why: 'One of the three molecular routes into glioblastoma, IDH-wildtype. It will not carry the diagnosis on its own in a tumour whose histology is low-grade.',
    applies: (v, ctx) => ctx.wildtype(v),
    answered: (v) => answeredSelect(v, 'tert'),
  },
  {
    id: 'egfr',
    field: 'egfr',
    question: 'Is EGFR amplified?',
    why: 'The second molecular route into glioblastoma. Under 40 it is not a solitary defining factor, because the paediatric-type and circumscribed gliomas carry it too.',
    applies: (v, ctx) => ctx.wildtype(v),
    answered: (v) => answeredSelect(v, 'egfr'),
  },
  {
    id: 'chr710',
    field: 'chr710',
    question: 'What does chromosome 7 and 10 copy number show?',
    why: 'The third route. Combined gain of 7 with loss of 10 is the classic pattern, and like EGFR it is not a solitary defining factor under 40.',
    applies: (v, ctx) => ctx.wildtype(v),
    answered: (v) => answeredSelect(v, 'chr710'),
  },

  // ----- ependymal: the compartment decides which test is asked -----
  // WHO CNS5 classifies these tumours by anatomical site first and then by the molecular group or
  // alteration of that compartment, so the questions below are gated on the compartment rather than
  // asked of every ependymoma (cIMPACT-NOW update 7,
  // https://pmc.ncbi.nlm.nih.gov/articles/PMC8018155/). Subependymoma and myxopapillary ependymoma
  // are made on morphology at any site and are asked none of them.
  {
    id: 'epIhc',
    field: 'epIhc',
    question: 'Which ependymal surrogate markers are recorded?',
    why: 'Where fusion testing and methylation are out of reach, immunohistochemistry stands in: L1CAM and nuclear p65 for a supratentorial ZFTA fusion, MYCN in a spinal tumour, HOXB13 to separate a myxopapillary ependymoma from a spinal ependymoma. The posterior fossa is settled on K27me3 and EZHIP instead, so it is not asked there.',
    applies: (v, ctx) => ctx.ependymal(v) && ctx.reported(v) && (ctx.supratentorial(v) || ctx.spinal(v) || ctx.morphDefined(v)),
    answered: (v) => has(v, 'epIhc'),
    optional: true,
  },
  {
    id: 'zfta',
    field: 'zfta',
    question: 'What does ZFTA fusion testing show?',
    why: 'A ZFTA fusion is the defining alteration of the commonest supratentorial ependymoma, and RELA is its commonest partner. It is a supratentorial question: a fusion found in the posterior fossa is reported NEC.',
    applies: (v, ctx) => ctx.ependymal(v) && ctx.reported(v) && ctx.supratentorial(v),
    answered: (v) => answeredSelect(v, 'zfta'),
  },
  {
    id: 'yap1',
    field: 'yap1',
    question: 'What does YAP1 fusion testing show?',
    why: 'Asked of a supratentorial ependymoma once no ZFTA fusion is found. YAP1::MAMLD1 is the usual partner, and these tumours are negative for L1CAM and p65.',
    applies: (v, ctx) => ctx.ependymal(v) && ctx.reported(v) && ctx.supratentorial(v)
      && !fusionFound(v.zfta),
    answered: (v) => answeredSelect(v, 'yap1'),
  },
  {
    id: 'ezhip',
    field: 'ezhip',
    question: 'What does EZHIP immunohistochemistry show?',
    why: 'In a posterior fossa ependymoma, EZHIP overexpression supports group A where the K27me3 stain is ambiguous and methylation profiling is out of reach.',
    applies: (v, ctx) => ctx.ependymal(v) && ctx.posteriorFossa(v) && v.h3k27me3 !== 'Loss of nuclear expression',
    answered: (v) => answeredSelect(v, 'ezhip'),
    optional: true,
  },
  {
    id: 'mycn',
    field: 'mycn',
    question: 'What does MYCN testing show?',
    why: 'MYCN amplification defines a distinct spinal ependymoma with a poor outcome. Worth sending on high-grade histology or aggressive radiology, because the histology is not always high-grade.',
    applies: (v, ctx) => ctx.ependymal(v) && ctx.reported(v) && ctx.spinal(v),
    answered: (v) => answeredSelect(v, 'mycn'),
  },
  {
    id: 'epCnv',
    field: 'epCnv',
    question: 'What does copy number show?',
    why: '22q loss supports a spinal ependymoma; 1q gain and 6q loss carry prognostic weight in group A; chromosomal instability is characteristic of group B and a stable genome of group A.',
    applies: (v, ctx) => ctx.ependymal(v) && ctx.reported(v) && !ctx.morphDefined(v),
    answered: (v) => has(v, 'epCnv'),
    optional: true,
  },

  // ----- circumscribed astrocytic gliomas: the MAPK pathway -----
  // Asked of this family instead of the IDH branch questions, because a MAPK pathway alteration is
  // the essential molecular criterion here and IDH is not a criterion at all (ICCR CNS molecular
  // information 2nd ed,
  // https://www.iccr-cancer.org/wp-content/uploads/2026/03/ICCR-CNS-Molecular-information-2nd-ed-v2.1-bookmark-1.pdf).
  {
    id: 'brafFusion',
    field: 'brafFusion',
    question: 'What does BRAF fusion testing show?',
    why: 'It is the first test to send in this family, and a tandem duplication and fusion on a low-grade piloid astrocytic neoplasm carries the diagnosis.',
    applies: (v, ctx) => ctx.reported(v) && ctx.circumscribed(v),
    answered: (v) => answeredSelect(v, 'brafFusion'),
  },
  {
    id: 'braf',
    field: 'braf',
    question: 'What does BRAF p.V600E testing show?',
    why: 'The alteration of pleomorphic xanthoastrocytoma, and the one with a targeted therapy behind it. A VE1 stain is a screen rather than the test, and a negative result does not exclude the fusion or the other MAPK alterations.',
    applies: (v, ctx) => ctx.reported(v) && (ctx.circumscribed(v) || ctx.wildtype(v)),
    answered: (v) => answeredSelect(v, 'braf'),
  },
  {
    id: 'mapkOther',
    field: 'mapkOther',
    question: 'Any other MAPK pathway alteration?',
    why: 'NF1, FGFR1, NTRK1/2/3 and RAF1 carry the pathway in the minority of cases where BRAF is negative. Where none of them is found, a methylation profile is the fallback.',
    applies: (v, ctx) => ctx.reported(v) && ctx.circumscribed(v),
    optional: true,
  },

  // ----- methylation -----
  {
    id: 'methylation',
    field: 'methylation',
    question: 'Has DNA methylation profiling been done?',
    why: 'It settles the cases the panel cannot: a posterior fossa ependymoma group, an under-25 high-grade glioma, a discordant molecular set. Report it in layers - classifier, family, class, calibrated score against the laboratory threshold - not as a bare class name.',
    applies: (v, ctx) => ctx.glioma(v) || ctx.ependymal(v) || ctx.circumscribed(v),
    answered: (v) => answeredSelect(v, 'methylation'),
    optional: true,
  },
  {
    id: 'methClass',
    field: 'methClass',
    question: 'Which methylation class was matched, and at what calibrated score?',
    why: 'The class and score are the result; the classifier version and threshold make it readable by whoever picks the case up next. A subthreshold match may still contribute but cannot carry the class alone.',
    applies: (v) => v.methylation === 'Reported',
  },

  // ----- meningioma: the grading criteria, in the order they are applied -----
  // WHO CNS5 grades a meningioma on criteria that hold whatever the subtype
  // (https://pmc.ncbi.nlm.nih.gov/articles/PMC8328013/), so the subtype is asked for the name and
  // the criteria are then asked one at a time. cIMPACT-NOW update 8
  // (https://academic.oup.com/neuro-oncology/article/27/2/319/7745776) withdrew automatic grade 3
  // for papillary and rhabdoid morphology and added the two molecular gates.
  {
    id: 'mgSubtype',
    field: 'mgSubtype',
    question: 'Which meningioma subtype is this?',
    why: 'The subtype names the tumour. Only chordoid and clear cell carry a grade of their own; papillary and rhabdoid morphology no longer grade on their own, and every other subtype takes the grade the criteria give.',
    applies: (v, ctx) => ctx.meningioma(v),
  },
  {
    id: 'mgMitoses',
    field: 'mgMitoses',
    question: 'How many mitoses per 1.6 mm² in the most active area?',
    why: 'The single heaviest grading criterion: 4 to 19 carries grade 2 and 20 or more carries grade 3. 1.6 mm² is 10 high-power fields of 0.16 mm², or about 7 fields on a wider modern eyepiece; the full area has to be examined rather than extrapolated.',
    applies: (v, ctx) => ctx.meningioma(v),
    answered: (v) => num(v.mgMitoses) !== null,
  },
  {
    id: 'mgAtypical',
    field: 'mgAtypical',
    question: 'Which of the five atypical features are present?',
    why: 'Sheeting architecture, hypercellularity, small cell change, macronucleoli and spontaneous necrosis. Three or more carry grade 2 on their own. Necrosis counts only where it is spontaneous; embolisation or radiotherapy necrosis does not.',
    applies: (v, ctx) => ctx.meningioma(v),
    answered: (v) => has(v, 'mgAtypical'),
    optional: true,
  },
  {
    id: 'mgAnaplasia',
    field: 'mgAnaplasia',
    question: 'Is there frank anaplasia?',
    why: 'Overtly malignant cytology - resembling carcinoma, high-grade sarcoma or melanoma - carries grade 3 by itself, without reference to the mitotic count.',
    applies: (v, ctx) => ctx.meningioma(v),
    answered: (v) => has(v, 'mgAnaplasia'),
  },
  {
    id: 'mgBrain',
    field: 'mgBrain',
    question: 'Is brain invasion present?',
    why: 'Tumour nests within parenchyma with no intervening leptomeninges carries grade 2. Extension along Virchow-Robin spaces does not qualify, because the pia stays intact. Say so plainly when there is no adjacent brain in the specimen: the grade then rests on the tissue examined.',
    applies: (v, ctx) => ctx.meningioma(v),
    answered: (v) => has(v, 'mgBrain'),
  },
  {
    id: 'mgMolecular',
    field: 'mgMolecular',
    question: 'What do the meningioma molecular studies show?',
    why: 'A TERT promoter mutation or CDKN2A/B homozygous deletion carries grade 3 whatever the histology shows, and 1p deletion with 22q deletion or an NF2 variant carries grade 2. Hemizygous CDKN2A/B loss and 1p on its own do not grade.',
    applies: (v, ctx) => ctx.meningioma(v) && ctx.reported(v),
    answered: (v) => has(v, 'mgMolecular'),
    optional: true,
  },
  {
    id: 'mgIhc',
    field: 'mgIhc',
    question: 'Which meningioma markers are recorded?',
    why: 'EMA and SSTR2A support the diagnosis and a negative STAT6 keeps solitary fibrous tumour out of it. H3 K27me3 loss carries prognostic weight and does not enter the grade.',
    applies: (v, ctx) => ctx.meningioma(v),
    answered: (v) => has(v, 'mgIhc'),
    optional: true,
  },

  // ----- close -----
  {
    id: 'grade',
    field: 'grade',
    question: 'Which CNS WHO grade goes in the report?',
    why: 'The proposal from the recorded findings is offered as the default. It is a proposal - the grade in the report is yours, and a disagreement is flagged beside the form rather than overruled.',
    applies: (v, ctx) => ctx.glioma(v) || ctx.ependymal(v) || ctx.circumscribed(v) || ctx.meningioma(v),
  },
  {
    id: 'histClass',
    field: 'histClass',
    question: 'How does Layer 2 read?',
    why: 'The histopathological classification is the morphological line of the layered report, kept separate from the integrated diagnosis above it.',
    applies: (v, ctx) => ctx.glioma(v) || ctx.ependymal(v) || ctx.circumscribed(v) || ctx.meningioma(v),
    optional: true,
  },
];

// Which entity field the chosen family actually reads. The resection form carries one select per
// family and they all hold a value at once, so reading them all together made an ependymoma look
// like a glioma through whatever `dxAdult` happened to be sitting at. Mirrors `FAMILY_FIELD` in
// src/cnspathway.js.
const FAMILY_FIELD = [
  [/^Adult-type diffuse gliomas/i, 'dxAdult'],
  [/^Paediatric-type diffuse low-grade/i, 'dxPaedLow'],
  [/^Paediatric-type diffuse high-grade/i, 'dxPaedHigh'],
  [/^Circumscribed astrocytic/i, 'dxCircumscribed'],
  [/^Ependymal tumours/i, 'dxEpendymal'],
  // A meningioma on the resection form sits in the mesenchymal family, under dxMesenchymal. The
  // old entry named a family that does not exist, so the wizard never asked a meningioma anything.
  [/^Mesenchymal tumours/i, 'dxMesenchymal'],
];

/** Predicates the steps share, kept in one place so the funnel reads as one thing. */
function context() {
  const named = (v) => {
    const field = (FAMILY_FIELD.find(([re]) => re.test(`${v.dxFamily || ''}`)) || [])[1];
    return `${(field && v[field]) || ''} ${v.finding || ''}`.trim();
  };
  // A circumscribed astrocytic glioma is not on the IDH funnel: it is defined by a MAPK pathway
  // alteration, most often KIAA1549::BRAF, and IDH is only ever run on it to clear an adult diffuse
  // astrocytoma out of the differential. So `glioma` here means the diffuse gliomas the funnel was
  // built for, and the branch A and branch B questions cannot reach this family. Mirrors
  // `circumscribed` in src/cnspathway.js.
  const circumscribed = (v) => /^Circumscribed astrocytic/i.test(`${v.dxFamily || ''}`)
    || /pilocytic|pilomyxoid|xanthoastrocytoma|piloid features|astroblastoma|subependymal giant cell|chordoid glioma/i.test(named(v));
  const glioma = (v) => !circumscribed(v)
    && /glioma|astrocytoma|oligodendroglioma|glioblastoma/i.test(`${v.dxFamily || ''} ${named(v)}`);
  const ependymal = (v) => /ependymal|ependymoma/i.test(`${v.dxFamily || ''} ${named(v)}`);
  const meningioma = (v) => /meningioma/i.test(`${v.dxFamily || ''} ${named(v)}`);
  // The compartment, off the site entry first and the entity name only as a fallback. Spinal is
  // tested before infratentorial and infratentorial before supratentorial, so a cauda equina or
  // fourth ventricle entry is never swallowed by a looser term. Mirrors `compartmentOf` in
  // src/cnspathway.js.
  const compartmentOf = (text) => {
    const t = String(text || '');
    if (/spinal|cauda equina|filum|conus|intramedullary|intradural/i.test(t)) return 'Spinal';
    if (/posterior fossa|infratentorial|cerebell|fourth ventricle|brainstem|brain stem|pons|medulla/i.test(t)) return 'Posterior fossa';
    if (/supratentorial|frontal|parietal|temporal|occipital|insula|corpus callosum|basal ganglia|thalam|lateral ventricle|third ventricle|pineal|hemisphere/i.test(t)) return 'Supratentorial';
    return '';
  };
  const compartment = (v) => compartmentOf(v.site) || compartmentOf(named(v));
  // Subependymoma and myxopapillary ependymoma are made on morphological criteria at any site, so
  // the compartment questions are never put to them.
  const morphDefined = (v) => /subependymoma|myxopapillary/i.test(named(v));
  const pxaOrPiloid = (v) => /xanthoastrocytoma|piloid features/i.test(named(v));
  const reported = (v) => v.molStatus === 'Reported';
  // The IDH branch exists for the diffuse gliomas only, so both branch predicates carry that
  // condition rather than leaving each step to remember it. An ependymal tumour is never mutant or
  // wildtype here, whatever the branch field happens to hold.
  const mutant = (v) => reported(v) && v.idhBranch === 'IDH-mutant' && glioma(v);
  const wildtype = (v) => reported(v) && v.idhBranch === 'IDH-wildtype' && glioma(v);
  return {
    glioma,
    circumscribed,
    pxaOrPiloid,
    ependymal,
    meningioma,
    compartment,
    morphDefined,
    supratentorial: (v) => compartment(v) === 'Supratentorial' && !morphDefined(v),
    posteriorFossa: (v) => compartment(v) === 'Posterior fossa' && !morphDefined(v),
    spinal: (v) => compartment(v) === 'Spinal' && !morphDefined(v),
    reported,
    mutant,
    wildtype,
    mutantAstro: (v) => mutant(v) && /^Astrocytoma, IDH-mutant/.test(named(v).trim()),
    oligo: (v) => mutant(v) && /Oligodendroglioma/i.test(named(v)),
    midline: (v) => /midline|thalam|pons|brainstem|brain stem|spinal|hypothalam/i.test(`${v.site || ''} ${named(v)}`),
    // Classic glioblastoma histology as the update 11 shortcut means it: a named glioblastoma with
    // microvascular proliferation or necrosis actually recorded. Mirrors `lowGradeHistology` in
    // src/cnspathway.js so the caution and the pathway node cannot disagree on the same case. The
    // absence of a prior lower-grade glioma is the reader's to know: neither CNS form records it.
    classicGbm: (v) => /glioblastoma/i.test(named(v))
      && (Array.isArray(v.features) ? v.features : []).some((f) => /Microvascular|Necrosis/i.test(String(f))),
    // The update 2 surrogate: on the IDH-mutant branch, ATRX loss and/or strong diffuse p53 settles
    // astrocytoma without 1p/19q testing. Mirrors `astroSettled` in src/cnspathway.js so the step
    // list and the chart cannot disagree about whether FISH is still wanted.
    astroByIhc: (v) => mutant(v)
      && (v.atrx === 'Loss of nuclear expression' || /Abnormal/.test(v.p53 || '')),
  };
}

/**
 * The steps this schema can drive, in funnel order: a step is kept only when the schema actually
 * carries its field, so the same funnel serves the resection and the biopsy form without either of
 * them being asked for a field it does not have.
 *
 * @param {{fields?: Array<{id: string}>}} schema
 */
export function wizardSteps(schema) {
  const byId = new Map((schema?.fields || []).map((f) => [f.id, f]));
  const out = [];
  for (const step of STEPS) {
    const field = byId.has(step.field) ? step.field : (step.altField && byId.has(step.altField) ? step.altField : null);
    if (!field) continue;
    out.push({ ...step, field, def: byId.get(field).default });
  }
  return out;
}

/** Does this schema support the guided intake at all? */
export function wizardSupported(schema) {
  return wizardSteps(schema).length >= 6 && (schema?.fields || []).some((f) => f.id === 'idhBranch');
}

/** The steps that apply to the case as it currently stands. */
export function visibleSteps(steps, values) {
  const ctx = context();
  return steps.filter((s) => !s.applies || s.applies(values, ctx));
}

const sameAsDefault = (value, def) => {
  // An empty default is not a decision waiting to be confirmed - it is simply an empty field.
  if (def === undefined || def === '' || def === null || (Array.isArray(def) && def.length === 0)) return false;
  if (Array.isArray(value) || Array.isArray(def)) {
    const a = arr(value);
    const b = arr(def);
    return a.length === b.length && a.every((x, i) => x === b[i]);
  }
  return String(value) === String(def);
};

/** Is the field still sitting on the value the schema gave it? */
export function atDefault(step, values) {
  return sameAsDefault(values?.[step.field], step.def);
}

/**
 * Has this step been answered?
 *
 * A field still sitting on its schema default counts as unanswered, so the funnel asks the question
 * rather than assuming the default was a decision. A new part arrives with most of the form
 * pre-filled - that is the right behaviour for the ordinary form and the wrong one for a wizard
 * whose whole purpose is to have the pathologist look at each step.
 */
export function stepAnswered(step, values) {
  if (sameAsDefault(values?.[step.field], step.def)) return false;
  return step.answered ? step.answered(values) : has(values, step.field);
}

/** The first applicable step with nothing recorded, or null when the funnel is walked. */
export function nextStep(steps, values, skipped = []) {
  return visibleSteps(steps, values).find((s) => !stepAnswered(s, values) && !skipped.includes(s.id)) || null;
}

/**
 * Where the walk has got to. `total` counts only the steps that apply right now, so it moves as the
 * case opens branches - which is honest about the funnel rather than pretending it is a fixed list.
 */
export function wizardProgress(steps, values, skipped = []) {
  const shown = visibleSteps(steps, values);
  return {
    answered: shown.filter((s) => stepAnswered(s, values)).length,
    total: shown.length,
    step: nextStep(steps, values, skipped),
  };
}

/**
 * Caveats raised by the answers already recorded, shown under the current question. These are the
 * cIMPACT-NOW cautions in teaching form; the same ground is covered as panel warnings by
 * generators/cns_layers.js `pathwayChecks` once the fields are set, so a case is never carried by
 * the wizard alone.
 */
export function cautions(step, values) {
  const v = values || {};
  const ctx = context();
  const age = num(v.patientAge);
  const out = [];
  if (!step) return out;
  switch (step.id) {
    case 'idhSeq':
      // The over-55 shortcut carries a histological condition, so the caution must not assert classic
      // histology the case has not recorded. With neither microvascular proliferation nor necrosis on
      // the form the shortcut does not apply, and the pathway keeps the sequencing node outstanding.
      if (age !== null && age < 55) out.push(`At ${age}, a negative R132H stain is not enough: IDH1 and IDH2 should be sequenced before an IDH-wildtype diagnosis.`);
      else if (age !== null && age > 55 && ctx.classicGbm(v)) out.push(`At ${age}, with classic glioblastoma histology recorded and no known lower-grade glioma, a negative R132H stain is taken as sufficient and sequencing is not required.`);
      else if (age !== null && age > 55) out.push(`At ${age}, the shortcut past sequencing needs classic glioblastoma histology. With none recorded, sequence before an IDH-wildtype diagnosis is made.`);
      break;
    case 'mitoses':
      if (ctx.oligo(v)) out.push('Oligodendroglioma grading is unchanged: the count is read against the established threshold for that entity, not the astrocytoma line.');
      else out.push('Ten fields of 0.24 mm2 are 2.4 mm2. If your own high-power field is smaller, the count needs adjusting before it is read against the threshold.');
      break;
    case 'cdkn2a':
      out.push('Hemizygous loss is not a grading criterion. Only homozygous deletion is.');
      if (ctx.oligo(v)) out.push('In an oligodendroglioma, homozygous deletion has not been reported in a grade 2 tumour: it is a reason to look again at a grade 2 designation, not a grade 3 criterion of its own.');
      break;
    case 'molHigher':
      if (arr(v.features).some((f) => /Microvascular|Necrosis/.test(f)) || v.cdkn2a === 'Homozygous deletion detected' || v.pdgfra === 'Amplified') {
        out.push('A grade 4 finding is already recorded, so these alterations will not change the grade. Record them anyway if they were tested.');
      }
      break;
    case 'egfr':
    case 'chr710':
      if (age !== null && age < 40) out.push(`At ${age}, neither EGFR amplification nor combined +7/-10 defines glioblastoma on its own. Hold open the paediatric-type and circumscribed gliomas, and consider methylation profiling.`);
      break;
    case 'tert':
      out.push('A TERT promoter mutation will not carry glioblastoma in a tumour whose histology is low-grade.');
      break;
    case 'zfta':
      if (ctx.ependymal(v) && ctx.posteriorFossa(v)) out.push('A ZFTA fusion in the posterior fossa is outside the WHO CNS5 list, which names this entity supratentorially only. Such a case is reported NEC.');
      else out.push('L1CAM and nuclear p65 are sensitive surrogates but neither is specific on its own, so a fusion result outranks them where it can be had.');
      break;
    case 'yap1':
      out.push('YAP1-fused ependymomas are negative for L1CAM and p65, so a negative surrogate panel is what brings this test into play rather than ruling it out.');
      break;
    case 'mycn':
      if (v.h3k27me3 === 'Loss of nuclear expression') out.push('K27me3 is lost here. Before a spinal MYCN-amplified ependymoma is settled, exclude a drop metastasis from a posterior fossa group A tumour on the imaging, and a diffuse midline glioma, H3 K27-altered, which can itself carry MYCN amplification.');
      else out.push('No CNS WHO grade is assigned to spinal ependymoma, MYCN-amplified. The entity itself carries the prognosis.');
      break;
    case 'epIhc':
      if (ctx.spinal(v)) out.push('In a spinal tumour, HOXB13 separates a myxopapillary ependymoma from a spinal ependymoma where the morphology overlaps.');
      else if (ctx.supratentorial(v)) out.push('L1CAM positivity is sensitive for a ZFTA fusion but is expressed in many other tumours; read it with nuclear p65.');
      break;
    case 'h3k27me3':
      out.push('Loss of trimethylation is not an H3 K27M mutation. EZHIP overexpression and several other tumours lose it too.');
      break;
    case 'methClass':
      if (num(v.methScore) !== null && num(v.methThreshold) !== null && num(v.methScore) < num(v.methThreshold)) {
        out.push('The calibrated score is below your laboratory threshold. A subthreshold match may contribute where the other findings support it, but it cannot carry the class on its own.');
      }
      break;
    case 'mgSubtype':
      if (/^(Papillary|Rhabdoid)$/.test(v.mgSubtype || '')) {
        out.push(`${v.mgSubtype} morphology no longer carries CNS WHO grade 3 on its own. It is graded on the criteria that follow, and the morphology still deserves a mention because it carries prognostic weight.`);
      } else if (/^(Atypical|Anaplastic)$/.test(v.mgSubtype || '')) {
        out.push(`${v.mgSubtype} is a grade designation rather than a subtype. Record the criteria that make it so and the grade follows; a subtype chosen here will not carry a grade on its own.`);
      } else if (/^(Chordoid|Clear cell)$/.test(v.mgSubtype || '')) {
        out.push(`${v.mgSubtype} meningioma is CNS WHO grade 2 on the morphology alone.`);
      }
      break;
    case 'mgMitoses':
      out.push('1.6 mm² is 10 fields of 0.16 mm², or about 7 fields at 0.23 to 0.24 mm². If your own high-power field is wider, count fewer fields rather than counting ten and reporting the number as if it were per 1.6 mm2.');
      break;
    case 'mgAtypical':
      if (arr(v.mgAtypical).length === 2) out.push('Two of the five features sits on the grade 1 / grade 2 border. Where TERT and CDKN2A/B are available they settle it.');
      if (arr(v.mgAtypical).some((f) => /necrosis/i.test(f))) out.push('Necrosis counts only where it is spontaneous. Necrosis following embolisation, radiosurgery or radiotherapy does not.');
      break;
    case 'mgBrain':
      out.push('Brain invasion is read on a section that actually contains brain. Where none is present, record that rather than "not identified": the grade then plainly rests on the tissue examined.');
      break;
    case 'mgMolecular':
      out.push('Hemizygous CDKN2A/B loss does not grade; only homozygous deletion does. 1p deletion grades only alongside 22q deletion or an NF2 variant.');
      break;
    case 'grade':
      if (age !== null && age < 18 && ctx.wildtype(v)) out.push('Under 18 with an H3-wildtype high-grade glioma, consider mismatch-repair immunohistochemistry before signing out.');
      if (ctx.meningioma(v) && num(v.mgMitoses) === null) out.push('No mitotic count is recorded. It is the criterion that most often carries the meningioma grade, so the proposal below is provisional until it is.');
      break;
    default:
      break;
  }
  return out;
}

export default { wizardSteps, wizardSupported, visibleSteps, stepAnswered, atDefault, nextStep, wizardProgress, cautions };
