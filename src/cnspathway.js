// The CNS pathway, read from the case as it stands: a flowchart of the published order, with each
// node lit by the values already on the form.
//
// It reads and writes nothing. No field is set, no line is printed, no grade is proposed here - the
// proposal and the warnings live in generators/cns_layers.js, where they belong. This module exists
// so that a pathologist can see where the case has got to in the funnel, which criterion is
// satisfied, which is still outstanding, and what the next test would be.
//
// It is the picture; src/cnswizard.js is the path walked one question at a time. They read the same
// fields and either can be open, or neither.
//
// Node criterion text and source links are panel text, exempt from the printed register in exactly
// the way the reference-gallery criteria are. Nothing in this file reaches a report.
//
//   pathwaySupported(schema)  -> does this template carry the fields the pathway needs?
//   pathway(values)           -> { branch, title, lede, stages, nextTest, sources }
//
// Each stage is { id, label, nodes }. Each node is:
//   { id, label, state, detail, note?, test?, source? }
// with state one of:
//   'satisfied'   - the criterion is met, or the step is done, on the values recorded
//   'outstanding' - the step applies and is not done; `test` names what would settle it
//   'na'          - the step does not apply on this branch, or is excluded by what is recorded
//
// Knowledge grounding, comments only and never printed. Order and criteria from
// docs/specs/cns-cimpact-pathways.md, which follows AOSNP-ADAPTR
// (https://pmc.ncbi.nlm.nih.gov/articles/PMC12861567/), WHO CNS5 essential criteria
// (https://pmc.ncbi.nlm.nih.gov/articles/PMC10227121/), cIMPACT-NOW update 8
// (https://pubmed.ncbi.nlm.nih.gov/39212325/), update 9
// (https://academic.oup.com/noa/article/7/1/vdae228/7942502), update 11
// (https://onlinelibrary.wiley.com/doi/10.1111/bpa.70035) and update 12
// (https://academic.oup.com/neuro-oncology/advance-article/doi/10.1093/neuonc/noag108/8687120).

const SRC = {
  funnel: { label: 'AOSNP-ADAPTR reporting funnel', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12861567/' },
  cns5: { label: 'WHO CNS5 essential criteria', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10227121/' },
  u8: { label: 'cIMPACT-NOW update 8', url: 'https://pubmed.ncbi.nlm.nih.gov/39212325/' },
  u9: { label: 'cIMPACT-NOW update 9', url: 'https://academic.oup.com/noa/article/7/1/vdae228/7942502' },
  u11: { label: 'cIMPACT-NOW update 11', url: 'https://onlinelibrary.wiley.com/doi/10.1111/bpa.70035' },
  u12: { label: 'cIMPACT-NOW update 12', url: 'https://academic.oup.com/neuro-oncology/advance-article/doi/10.1093/neuonc/noag108/8687120' },
};

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
const done = (v, id) => has(v, id) && v[id] !== 'Not performed' && v[id] !== 'Cannot be determined';
const feat = (v, re) => arr(v.features).some((f) => re.test(f));

/** The text the case itself puts on a node, so the drawer shows the value and not just its state. */
const shown = (label, value) => (value ? `${label}: ${value}` : label);

/** A node in one call. `state` is worked out by the caller; everything else is description. */
const node = (id, label, state, detail, extra = {}) => ({ id, label, state, detail, ...extra });

/**
 * The family field for each family, so an entity left on a schema default in a family the case is
 * not in cannot pull the pathway onto the wrong branch: only the field belonging to the recorded
 * family is read.
 */
const FAMILY_FIELD = [
  [/^Adult-type diffuse gliomas/i, 'dxAdult'],
  [/^Paediatric-type diffuse/i, 'dxPaediatric'],
  [/^Circumscribed astrocytic/i, 'dxCircumscribed'],
  [/^Ependymal tumours/i, 'dxEpendymal'],
  [/^Meningioma/i, 'mgSubtype'],
];

/** What the case is, as far as the recorded values say. */
function read(values) {
  const v = values || {};
  const family = `${v.dxFamily || ''}`;
  const entityField = (FAMILY_FIELD.find(([re]) => re.test(family)) || [])[1];
  const named = `${(entityField && v[entityField]) || ''} ${v.finding || ''}`.trim();
  return {
    v,
    named,
    family,
    age: num(v.patientAge),
    glioma: /glioma|astrocytoma|oligodendroglioma|glioblastoma/i.test(`${family} ${named}`),
    ependymal: /ependymal|ependymoma/i.test(`${family} ${named}`),
    meningioma: /meningioma/i.test(`${family} ${named}`),
    posteriorFossa: /posterior fossa|fourth ventricle|cerebell/i.test(`${v.site || ''} ${named}`),
    midline: /midline|thalam|pons|brainstem|brain stem|spinal|hypothalam/i.test(`${v.site || ''} ${named}`),
    reported: v.molStatus === 'Reported',
    mutant: v.molStatus === 'Reported' && v.idhBranch === 'IDH-mutant',
    wildtype: v.molStatus === 'Reported' && v.idhBranch === 'IDH-wildtype',
    astro: /^Astrocytoma, IDH-mutant/i.test(named) || /astrocytoma, idh-mutant/i.test(named),
    oligo: /oligodendroglioma/i.test(named),
    gbm: /glioblastoma/i.test(named),
    lowGradeHistology: !feat(v, /Microvascular|Necrosis/i) && (num(v.mitoses) === null || num(v.mitoses) < 3),
  };
}

/** Stage 1: the funnel every CNS case runs, whatever it turns out to be. */
function funnelStage(c) {
  const { v, age } = c;
  const nodes = [];

  nodes.push(node('context', 'Clinical and radiological context', has(v, 'patientAge') || has(v, 'site') || has(v, 'imaging') ? 'satisfied' : 'outstanding',
    shown('Age, site, imaging, any prior lower-grade glioma', [age !== null ? `${age} years` : null, v.site || null].filter(Boolean).join(', ')),
    { note: 'Supportive, never definitive. T2-FLAIR mismatch favours astrocytoma, IDH-mutant, but is not specific.', test: 'Record the age and the site', source: SRC.funnel }));

  nodes.push(node('morphology', 'Haematoxylin and eosin', has(v, 'dxFamily') || has(v, 'finding') ? 'satisfied' : 'outstanding',
    shown('Astrocytic against oligodendroglial morphology, mitoses, microvascular proliferation, necrosis', v.dxFamily || v.finding || ''),
    { test: 'Settle the family on the sections', source: SRC.funnel }));

  nodes.push(node('ihc', 'Basic immunohistochemistry', has(v, 'ihc') || has(v, 'ihcOther') ? 'satisfied' : 'outstanding',
    'GFAP, OLIG2, S100, Ki-67',
    { note: 'Ki-67 is ancillary. It is not a grading criterion in an IDH-mutant glioma and has no established cut-off.', test: 'GFAP and OLIG2 at least', source: SRC.funnel }));

  if (!c.glioma && !c.ependymal) {
    nodes.push(node('idh', 'IDH status', 'na', 'The IDH funnel runs for the diffuse gliomas. This case is not on it.', { source: SRC.cns5 }));
    return { id: 'funnel', label: 'The funnel', nodes };
  }

  nodes.push(node('r132h', 'IDH1 p.R132H immunohistochemistry', done(v, 'idh1R132H') ? 'satisfied' : 'outstanding',
    shown('The first molecular step', v.idh1R132H && v.idh1R132H !== 'Not performed' ? v.idh1R132H : ''),
    { test: 'IDH1 R132H immunohistochemistry', source: SRC.funnel }));

  const seqNeeded = v.idh1R132H === 'Negative' || v.idh1R132H === 'Cannot be determined';
  if (!seqNeeded) {
    nodes.push(node('seq', 'IDH1 and IDH2 sequencing', v.idh1R132H === 'Positive' ? 'na' : 'outstanding',
      v.idh1R132H === 'Positive' ? 'A positive R132H stain settles it; sequencing is not required.' : 'Runs once the stain is read as negative.',
      { test: 'Read the R132H stain first', source: SRC.funnel }));
  } else if (age !== null && age > 55 && c.gbm && c.lowGradeHistology === false) {
    nodes.push(node('seq', 'IDH1 and IDH2 sequencing', done(v, 'idhSeq') ? 'satisfied' : 'na',
      shown('Over 55 with classic glioblastoma histology and no known lower-grade glioma: a negative R132H stain is sufficient', done(v, 'idhSeq') ? v.idhSeq : ''),
      { note: 'The update 11 age shortcut. Sequencing is still the safer course where anything is atypical.', source: SRC.u11 }));
  } else {
    nodes.push(node('seq', 'IDH1 and IDH2 sequencing', done(v, 'idhSeq') ? 'satisfied' : 'outstanding',
      shown('Non-canonical IDH1 and all IDH2 mutations are invisible to the R132H stain', done(v, 'idhSeq') ? v.idhSeq : ''),
      {
        note: age !== null && age < 55
          ? `At ${age}, sequencing is expected before an IDH-wildtype diagnosis.`
          : 'Expected for astrocytoma, for oligodendroglioma, and for glioblastoma under 55.',
        test: 'IDH1 and IDH2 sequencing',
        source: SRC.funnel,
      }));
  }

  nodes.push(node('branch', 'Branch point', c.reported && has(v, 'idhBranch') ? 'satisfied' : 'outstanding',
    shown('IDH-mutant or IDH-wildtype', c.reported ? v.idhBranch : (v.molStatus || '')),
    { test: 'Record the branch once the results are back', source: SRC.cns5 }));

  return { id: 'funnel', label: 'The funnel', nodes };
}

/** Branch A1: which IDH-mutant entity. */
function branchAEntity(c) {
  const { v } = c;
  const nodes = [];
  const codelDone = done(v, 'codel');
  const codeleted = v.codel === '1p/19q codeletion detected';
  const atrxLost = v.atrx === 'Loss of nuclear expression';

  nodes.push(node('infiltrating', 'A diffusely infiltrating glioma', c.glioma ? 'satisfied' : 'outstanding',
    'The first essential criterion for both entities.', { source: SRC.cns5 }));
  nodes.push(node('idhmut', 'An IDH1 or IDH2 hotspot mutation', c.mutant ? 'satisfied' : 'outstanding',
    shown('The second essential criterion for both', v.idh1R132H === 'Positive' ? 'R132H positive' : (done(v, 'idhSeq') ? v.idhSeq : '')),
    { source: SRC.cns5 }));

  nodes.push(node('codel', 'Combined whole-arm 1p/19q deletion', codelDone ? 'satisfied' : 'outstanding',
    shown('Present defines oligodendroglioma; excluded, with ATRX loss or an ATRX mutation, defines astrocytoma', codelDone ? v.codel : ''),
    { test: '1p/19q testing', source: SRC.cns5 }));

  nodes.push(node('atrx', 'ATRX', done(v, 'atrx') ? 'satisfied' : 'outstanding',
    shown('Loss supports astrocytoma; retained nuclear staining is desirable in oligodendroglioma', done(v, 'atrx') ? v.atrx : ''),
    {
      note: !codelDone
        ? 'Where 1p/19q testing is out of reach, HIP1R and vimentin with retained ATRX are reported at 96 per cent sensitivity and 100 per cent specificity for 1p/19q status. H3 K27me3 loss alone is neither sensitive nor specific.'
        : undefined,
      test: 'ATRX immunohistochemistry',
      source: SRC.funnel,
    }));

  nodes.push(node('p53', 'TP53 or p53', done(v, 'p53') ? 'satisfied' : 'na',
    shown('Desirable, not essential. Strong nuclear staining above 10 per cent of tumour cells; above 40 per cent reads more reliably in practice, and negative staining does not exclude a mutation', done(v, 'p53') ? v.p53 : ''),
    { source: SRC.funnel }));

  if (codeleted && (atrxLost || /Abnormal/.test(v.p53 || ''))) {
    nodes.push(node('dual', 'Dual-genotype IDH-mutant glioma', 'outstanding',
      'ATRX loss or a TP53 mutation together with whole-arm 1p/19q codeletion falls outside the classification.',
      { note: 'Report all four layers and append NEC.', test: 'Confirm both results, then report as NEC', source: SRC.cns5 }));
  }

  return { id: 'a1', label: 'A1 - Which IDH-mutant entity', nodes };
}

/** Branch A2/A3: the grading ladder. */
function branchAGrade(c) {
  const { v } = c;
  const nodes = [];

  if (c.oligo) {
    nodes.push(node('oligograde', 'Oligodendroglioma grading is unchanged', 'satisfied',
      'Grade 2 or grade 3 only. Update 12 found insufficient evidence to change it.', { source: SRC.u12 }));
    nodes.push(node('oligocdkn', 'CDKN2A/B homozygous deletion', done(v, 'cdkn2a') ? 'satisfied' : 'na',
      shown('Not documented in any reported grade 2 oligodendroglioma', done(v, 'cdkn2a') ? v.cdkn2a : ''),
      { note: 'A reason to look again at a grade 2 designation - not an independent grade 3 criterion, and not grade 4.', source: SRC.u12 }));
    return { id: 'a2', label: 'A3 - Grading oligodendroglioma', nodes };
  }

  const mit = num(v.mitoses);
  const mvpNec = feat(v, /Microvascular|Necrosis/i);
  const g4mol = v.cdkn2a === 'Homozygous deletion detected' || v.pdgfra === 'Amplified';
  const g3mol = arr(v.molHigher).length > 0;

  nodes.push(node('g4', 'Grade 4 criteria', mvpNec || g4mol ? 'satisfied' : 'outstanding',
    'Microvascular proliferation, necrosis, CDKN2A/B homozygous deletion, or PDGFRA amplification. Any one is enough.',
    {
      note: v.pdgfra === 'Amplified'
        ? 'PDGFRA amplification is grade 4 on its own, without microvascular proliferation or necrosis.'
        : (done(v, 'pdgfra') ? undefined : 'PDGFRA is not yet recorded, and it is a grade 4 criterion in its own right.'),
      test: done(v, 'pdgfra') ? 'CDKN2A/B copy number' : 'PDGFRA copy number',
      source: SRC.u12,
    }));

  nodes.push(node('g3', 'Grade 3 criteria', (mit !== null && mit >= 3) || g3mol ? 'satisfied' : 'outstanding',
    shown('Three or more mitoses per 2.4 mm2, or a grade 3 molecular criterion', mit !== null ? `${mit} recorded` : ''),
    {
      note: mvpNec || g4mol
        ? 'A grade 4 finding is already recorded, so the grade 3 criteria do not change the grade.'
        : 'Grade 3 also requires microvascular proliferation, necrosis and both grade 4 molecular criteria to be absent. Ten fields of 0.24 mm2 are 2.4 mm2.',
      test: 'Mitotic count by area, and the grade 3 molecular panel',
      source: SRC.u12,
    }));

  nodes.push(node('cdkn2a', 'CDKN2A/B copy number', done(v, 'cdkn2a') ? 'satisfied' : 'outstanding',
    shown('Homozygous deletion is grade 4', done(v, 'cdkn2a') ? v.cdkn2a : ''),
    {
      note: v.cdkn2a === 'Hemizygous loss detected' ? 'Hemizygous loss is not a grading criterion.' : undefined,
      test: 'CDKN2A/B copy number',
      source: SRC.u12,
    }));

  nodes.push(node('molhigher', 'Grade 3 molecular panel', g3mol ? 'satisfied' : 'outstanding',
    shown('CDK4, CDK6, CCND2, EGFR or MYCN amplification; RB1 homozygous deletion or pathogenic mutation; pathogenic CDKN2A, PIK3CA or PIK3R1 mutation; a G-CIMP-low or A_IDH_HG signature', arr(v.molHigher).join(', ')),
    { test: 'The update 12 grade 3 molecular set', source: SRC.u12 }));

  nodes.push(node('ki67', 'Ki-67', 'na', 'Explicitly not recommended as a grading criterion.', { source: SRC.u12 }));

  return { id: 'a2', label: 'A2 - Grading astrocytoma, IDH-mutant', nodes };
}

/** Branch B1: the glioblastoma criteria and the three update 11 caveats. */
function branchBCriteria(c) {
  const { v, age } = c;
  const nodes = [];
  const mvp = feat(v, /Microvascular/i);
  const nec = feat(v, /Necrosis/i);
  const tert = v.tert === 'Mutation detected (specify)' || /Mutation detected/i.test(v.tert || '');
  const egfr = v.egfr === 'Amplified';
  const c710 = v.chr710 === 'Combined gain of chromosome 7 and loss of chromosome 10';
  const met = [mvp && 'microvascular proliferation', nec && 'necrosis', tert && 'a TERT promoter mutation', egfr && 'EGFR amplification', c710 && 'combined +7/-10'].filter(Boolean);
  const young = age !== null && age < 40;

  nodes.push(node('wildtype', 'IDH-wildtype and H3-wildtype diffuse astrocytic glioma', c.wildtype ? 'satisfied' : 'outstanding',
    shown('The essential first half of the definition', c.wildtype ? 'IDH-wildtype recorded' : ''), { source: SRC.u11 }));

  nodes.push(node('oneof', 'One or more defining criteria', met.length ? 'satisfied' : 'outstanding',
    shown('Microvascular proliferation, necrosis, TERT promoter mutation, EGFR amplification, or +7/-10', met.join(', ')),
    { test: 'TERT promoter, EGFR copy number, chromosome 7 and 10', source: SRC.u11 }));

  nodes.push(node('tertsole', 'TERT must not be the sole defining factor in low-grade histology', tert && !mvp && !nec && c.lowGradeHistology ? 'outstanding' : (tert ? 'satisfied' : 'na'),
    tert && !mvp && !nec && c.lowGradeHistology
      ? 'A TERT promoter mutation is the only defining factor recorded and the histology is low-grade.'
      : 'The first of the three update 11 amendments.',
    { test: 'Add EGFR copy number and chromosome 7/10, or profile by methylation', source: SRC.u11 }));

  nodes.push(node('egfrsole', 'EGFR must not be the sole defining factor under 40', egfr && young && met.length === 1 ? 'outstanding' : (young ? 'satisfied' : 'na'),
    egfr && young && met.length === 1
      ? `EGFR amplification is the only defining factor recorded and the patient is ${age}.`
      : (young ? `The patient is ${age}, so this amendment is live.` : 'Applies under 40 years.'),
    { test: 'Add TERT promoter status, exclude BRAF, and consider methylation profiling', source: SRC.u11 }));

  nodes.push(node('c710sole', '+7/-10 must not be the sole defining factor under 40', c710 && young && met.length === 1 ? 'outstanding' : (young ? 'satisfied' : 'na'),
    c710 && young && met.length === 1
      ? `Combined +7/-10 is the only defining factor recorded and the patient is ${age}.`
      : 'It is not entirely specific: it occurs in some pleomorphic xanthoastrocytomas and in diffuse hemispheric glioma, H3 G34-mutant.',
    { test: 'Add TERT promoter status and EGFR copy number, exclude BRAF, and consider methylation profiling', source: SRC.u11 }));

  return { id: 'b1', label: 'B1 - Glioblastoma, IDH-wildtype', nodes };
}

/** Branch B2 and B3: H3 status, then the differential update 11 asks to be held open. */
function branchBH3(c) {
  const { v, age } = c;
  const nodes = [];
  const k27 = done(v, 'h3k27me3');
  const seq = done(v, 'h3seq');

  const midlineState = c.midline ? (k27 || seq ? 'satisfied' : 'outstanding') : (k27 || seq ? 'satisfied' : 'na');
  nodes.push(node('midline', 'H3 K27 assessment', midlineState,
    c.midline
      ? shown('A midline diffuse astrocytic glioma gets H3 K27 assessment at any age', [k27 ? v.h3k27me3 : null, seq ? v.h3seq : null].filter(Boolean).join('; '))
      : shown('Not a midline site on what is recorded', [k27 ? v.h3k27me3 : null, seq ? v.h3seq : null].filter(Boolean).join('; ')),
    { test: 'H3 K27me3 immunohistochemistry, then H3 K27M', source: SRC.u11 }));

  nodes.push(node('k27loss', 'Loss of K27me3 is not an H3 K27M mutation', v.h3k27me3 === 'Loss of nuclear expression' ? (seq ? 'satisfied' : 'outstanding') : 'na',
    v.h3k27me3 === 'Loss of nuclear expression'
      ? 'Trimethylation is lost. Confirm by H3 K27M immunohistochemistry or sequencing before the diagnosis rests on it.'
      : 'Retained nuclear K27me3 may serve as a surrogate for H3 K27-wildtype in a rigorously controlled setting. Ambiguous staining goes to K27M testing.',
    { test: 'H3 K27M immunohistochemistry or sequencing', source: SRC.u11 }));

  const differential = age !== null && age < 40;
  nodes.push(node('differential', 'The differential to hold open', differential ? 'outstanding' : 'na',
    differential
      ? `At ${age}: diffuse paediatric-type high-grade glioma H3-wildtype and IDH-wildtype, diffuse hemispheric glioma H3 G34-mutant, pleomorphic xanthoastrocytoma, subependymoma, gliomatosis-like glioma, and FGFR3::TACC3 fusion-positive glioma.`
      : 'Update 11 asks for this list to be held open in a younger patient.',
    {
      note: age !== null && age < 25
        ? 'Diffuse paediatric-type high-grade glioma needs a matching methylation profile as an essential criterion. Under 25, where methylation is out of reach, PDGFRA, EGFR or MYCN single-gene analysis may support it with NOS appended.'
        : undefined,
      test: 'Methylation profiling',
      source: SRC.u11,
    }));

  const mmr = age !== null && age < 18 ? 'outstanding' : (age !== null && age <= 40 && !c.gbm ? 'outstanding' : 'na');
  nodes.push(node('mmr', 'Mismatch-repair immunohistochemistry', mmr,
    age !== null && age < 18
      ? `Considered under 18 with an H3-wildtype high-grade glioma, including an IDH-mutant astrocytoma. The patient is ${age}.`
      : (age !== null && age <= 40 && !c.gbm
        ? `Considered at 18 to 40 where an H3- and IDH-wildtype high-grade glioma does not meet the glioblastoma criteria. The patient is ${age}.`
        : 'Considered in the young, and at 18 to 40 where the glioblastoma criteria are not met.'),
    { test: 'MLH1, PMS2, MSH2, MSH6', source: SRC.u11 }));

  return { id: 'b2', label: 'B2 and B3 - H3 status and the differential', nodes };
}

/** Posterior fossa ependymoma, update 11. */
function ependymomaStage(c) {
  const { v } = c;
  const nodes = [];
  const k27 = done(v, 'h3k27me3');
  const lost = v.h3k27me3 === 'Loss of nuclear expression';
  const ezhip = done(v, 'ezhip');
  const meth = v.methylation === 'Reported';

  nodes.push(node('morph', 'Ependymoma morphology and immunoprofile', c.ependymal ? 'satisfied' : 'outstanding',
    'Perivascular pseudorosettes, dot-like EMA. Essential for both groups.', { source: SRC.u11 }));

  nodes.push(node('site', 'Posterior fossa', c.posteriorFossa ? 'satisfied' : 'na',
    shown('The group A and group B split is a posterior fossa question', v.site || ''), { source: SRC.u11 }));

  nodes.push(node('k27me3', 'H3 K27me3', k27 ? 'satisfied' : 'outstanding',
    shown('Loss in tumour nuclei, with non-neoplastic endothelial and inflammatory nuclei as the internal control, defines group A with the morphology', k27 ? v.h3k27me3 : ''),
    { note: 'Most group A cases lose it completely.', test: 'H3 K27me3 immunohistochemistry', source: SRC.u11 }));

  nodes.push(node('ezhip', 'EZHIP', ezhip ? 'satisfied' : (lost ? 'na' : 'outstanding'),
    shown('Strong diffuse nuclear EZHIP supports group A where the K27me3 stain is ambiguous and methylation is out of reach; group B is typically negative', ezhip ? v.ezhip : ''),
    { test: 'EZHIP immunohistochemistry', source: SRC.u11 }));

  nodes.push(node('meth', 'Methylation profile', meth ? 'satisfied' : 'outstanding',
    shown('Definite group B classification requires methylation', meth ? [v.methFamily, v.methClass].filter(Boolean).join(' / ') : ''),
    { test: 'DNA methylation profiling', source: SRC.u11 }));

  const nos = c.posteriorFossa && v.h3k27me3 === 'Retained nuclear expression' && !meth && v.ezhip !== 'Overexpressed (strong diffuse nuclear staining)';
  nodes.push(node('nos', 'Posterior fossa ependymoma, NOS', nos ? 'outstanding' : 'na',
    nos
      ? 'Retained K27me3, no EZHIP overexpression and no conclusive methylation: this is reported as NOS rather than assigned a group.'
      : 'The landing place when the group cannot be established.',
    { test: 'Methylation profiling, or report as NOS', source: SRC.u11 }));

  return { id: 'ep', label: 'Posterior fossa ependymoma', nodes };
}

/** Meningioma, update 8. */
function meningiomaStage(c) {
  const { v } = c;
  const mol = arr(v.mgMolecular);
  const oneP = mol.some((m) => /^1p deletion detected/i.test(m));
  const partner = mol.some((m) => /^22q deletion detected|NF2 pathogenic variant detected/i.test(m));
  const nodes = [];

  nodes.push(node('morph', 'Standardised morphological assessment', has(v, 'mgSubtype') || has(v, 'finding') ? 'satisfied' : 'outstanding',
    'Most prominently brain invasion, which is tumour nests within GFAP-positive parenchyma without intervening leptomeninges.', { source: SRC.u8 }));

  nodes.push(node('g3', 'Grade 3 markers', mol.length ? 'satisfied' : 'outstanding',
    shown('TERT promoter variants and CDKN2A/B homozygous deletion are confirmed CNS WHO grade 3 markers', mol.join(', ')),
    { test: 'TERT promoter, CDKN2A/B copy number', source: SRC.u8 }));

  nodes.push(node('g2', 'Grade 2 on 1p with 22q or NF2', oneP && partner ? 'outstanding' : 'na',
    oneP && partner
      ? 'Grade 1 morphology carrying 1p deletion together with 22q deletion or an NF2 oncogenic variant: update 8 proposes grade 2.'
      : 'Applies to grade 1 morphology carrying 1p deletion with 22q deletion or an NF2 variant.',
    { test: '1p, 22q and NF2', source: SRC.u8 }));

  return { id: 'mg', label: 'Meningioma', nodes };
}

/** Methylation reporting, update 9. Shown once the case says a profile was run. */
function methylationStage(c) {
  const { v } = c;
  if (v.methylation !== 'Reported' && v.methylation !== 'Sent, result pending') return null;
  const score = num(v.methScore);
  const threshold = num(v.methThreshold);
  const nodes = [];

  nodes.push(node('layered', 'Layered result', v.methylation === 'Reported' ? 'satisfied' : 'outstanding',
    shown('Classifier, family match, class match, calibrated score, quality-control data', [v.methClassifier, v.methFamily, v.methClass].filter(Boolean).join(' / ')),
    { test: 'The full classifier output, not a bare class name', source: SRC.u9 }));

  nodes.push(node('score', 'Calibrated score against the threshold', score !== null && threshold !== null ? (score >= threshold ? 'satisfied' : 'outstanding') : 'outstanding',
    score !== null && threshold !== null
      ? `${score} against a threshold of ${threshold}.`
      : 'Scores run 0 to 1 against a stated threshold, and the thresholds used for match, no-match, indeterminate and negative should be reported.',
    {
      note: score !== null && threshold !== null && score < threshold
        ? 'A subthreshold match can still contribute where the other findings support it, but it cannot carry the class on its own.'
        : undefined,
      test: 'Record the score and the laboratory threshold',
      source: SRC.u9,
    }));

  nodes.push(node('qc', 'Quality control', done(v, 'methQc') ? (/Failed/.test(v.methQc) ? 'outstanding' : 'satisfied') : 'outstanding',
    shown('A failed or reserved run is not a result', v.methQc || ''), { test: 'Record the quality-control outcome', source: SRC.u9 }));

  return { id: 'meth', label: 'Methylation reporting', nodes };
}

/** Does this template carry enough of the layered fields for the pathway to mean anything? */
export function pathwaySupported(schema) {
  const ids = new Set((schema?.fields || []).map((f) => f.id));
  return ids.has('idhBranch') && ids.has('molStatus');
}

/**
 * The pathway as the case currently stands.
 *
 * Read-only in the strictest sense: nothing here sets a field, proposes a grade or contributes a
 * word to the report. `nextTest` names the test that would settle the first outstanding node, which
 * is the one thing a pathologist standing at the microscope usually wants from a flowchart.
 */
export function pathway(values) {
  const c = read(values);
  const stages = [funnelStage(c)];
  let branch = 'none';
  let title = 'CNS pathway';
  let lede = 'The published order, lit by what is on the form. Nothing here is printed.';

  if (c.ependymal) {
    branch = 'ependymoma';
    title = 'Ependymoma';
    lede = 'The posterior fossa group question, as update 11 sets it out.';
  } else if (c.meningioma) {
    branch = 'meningioma';
    title = 'Meningioma';
    lede = 'Morphological assessment and the update 8 molecular markers.';
  } else if (c.mutant) {
    branch = 'A';
    title = 'Branch A - IDH-mutant';
    lede = c.oligo
      ? 'Oligodendroglioma: the entity criteria, then the grading rules update 12 left unchanged.'
      : 'Astrocytoma, IDH-mutant: the entity split, then the update 12 grading ladder.';
    stages.push(branchAEntity(c), branchAGrade(c));
  } else if (c.wildtype) {
    branch = 'B';
    title = 'Branch B - IDH-wildtype';
    lede = 'The glioblastoma criteria with the three update 11 caveats, then H3 status and the differential.';
    stages.push(branchBCriteria(c), branchBH3(c));
  } else if (c.glioma) {
    branch = 'pending';
    title = 'Awaiting the branch point';
    lede = 'The branch opens once IDH status is recorded. Until then only the funnel applies.';
  }

  if (c.ependymal) stages.push(ependymomaStage(c));
  if (c.meningioma) stages.push(meningiomaStage(c));
  const meth = methylationStage(c);
  if (meth) stages.push(meth);

  const first = stages.flatMap((s) => s.nodes).find((n) => n.state === 'outstanding' && n.test);
  const sources = [...new Set(stages.flatMap((s) => s.nodes).map((n) => n.source).filter(Boolean))];

  return { branch, title, lede, stages, nextTest: first ? first.test : null, sources };
}

/**
 * The same pathway, laid out as a flowchart for the full-width overlay.
 *
 * The drawer beside the form stays a list - a column 460px wide cannot show a branch. This gives
 * the overlay a geometry to draw: the common funnel as a left-to-right chain, a fork where the
 * case leaves it, a greyed stub for the branch not taken, and the branch stages as boxes along a
 * second rail. Coordinates are plain numbers in a 1200-wide space; the view scales them.
 *
 * Pure. It derives everything from `pathway()`, reads no values of its own and holds no state.
 *
 * Returns:
 *   width, height   the drawing box
 *   funnel          { id, label, nodes: [{ key, node, x, y, w, h }] }
 *   fork            { x, y, w, h, label, state } or null when the case never branches
 *   stub            { x, y, w, h, label } for the branch not taken, or null
 *   stages          the branch stages, each { id, label, anyOf, state, counts, x, y, w, h, nodes }
 *   links           [{ kind: 'flow' | 'stub', points: [[x, y], ...] }]
 */
const CHART = {
  W: 1200, M: 28, GAP: 18, SGAP: 26,
  FY: 74, FH: 50,
  FORK_W: 168, FORK_H: 52, FORK_GAP: 40,
  RAIL: 26, HEAD: 34, ROW: 26, PAD: 12, FOOT: 14,
};

export function pathwayChart(result) {
  const p = result || { stages: [] };
  const stages = p.stages || [];
  if (!stages.length) return { width: CHART.W, height: 140, funnel: null, fork: null, stub: null, stages: [], links: [] };

  const rollUp = (nodes) => {
    const counts = { satisfied: 0, outstanding: 0, na: 0 };
    nodes.forEach((n) => { if (counts[n.state] !== undefined) counts[n.state] += 1; });
    return { counts, state: counts.outstanding ? 'outstanding' : (counts.satisfied ? 'satisfied' : 'na') };
  };

  const links = [];
  const cx = CHART.W / 2;
  const [first, ...rest] = stages;

  // The funnel: every case runs it, so it reads left to right as one chain.
  const n = first.nodes.length || 1;
  const w = Math.min(190, Math.floor((CHART.W - 2 * CHART.M - (n - 1) * CHART.GAP) / n));
  const x0 = Math.round((CHART.W - (n * w + (n - 1) * CHART.GAP)) / 2);
  const mid = CHART.FY + CHART.FH / 2;
  const funnelNodes = first.nodes.map((nd, k) => {
    const x = x0 + k * (w + CHART.GAP);
    if (k) links.push({ kind: 'flow', points: [[x - CHART.GAP, mid], [x, mid]] });
    return { key: `${first.id}:${nd.id}`, node: nd, x, y: CHART.FY, w, h: CHART.FH };
  });
  const funnel = { id: first.id, label: first.label, nodes: funnelNodes, ...rollUp(first.nodes) };

  // The fork, where the branch point is answered and the case leaves the common path. It sits
  // directly under the last funnel box so the line into it is a straight drop, and the branch not
  // taken hangs off it on a dashed line.
  const branched = !!p.branch && p.branch !== 'none';
  let fork = null;
  let stub = null;
  let top = CHART.FY + CHART.FH + CHART.FORK_GAP;
  if (branched) {
    const last = funnelNodes[funnelNodes.length - 1];
    const branchNode = first.nodes.find((nd) => nd.id === 'branch');
    const fx = Math.min(CHART.W - CHART.M - CHART.FORK_W, Math.max(CHART.M, Math.round(last.x + last.w / 2 - CHART.FORK_W / 2)));
    fork = {
      x: fx, y: top, w: CHART.FORK_W, h: CHART.FORK_H,
      label: p.branch === 'pending' ? 'Branch point' : String(p.title || '').replace(/^Branch [AB] - /, ''),
      state: p.branch === 'pending' ? 'outstanding' : (branchNode ? branchNode.state : 'satisfied'),
    };
    const drop = fx + CHART.FORK_W / 2;
    links.push({ kind: 'flow', points: [[drop, CHART.FY + CHART.FH], [drop, top]] });
    if (p.branch === 'A' || p.branch === 'B') {
      const sw = 210;
      stub = { x: CHART.M, y: top + 4, w: sw, h: CHART.FORK_H - 8, label: `branch ${p.branch === 'A' ? 'B' : 'A'}, not this case` };
      links.push({ kind: 'stub', points: [[fx, top + CHART.FORK_H / 2], [stub.x + sw, top + CHART.FORK_H / 2]] });
    }
    top += CHART.FORK_H + CHART.FORK_GAP;
  }

  // The branch stages, along one rail, each box holding its criteria as rows.
  const m = rest.length;
  const outStages = [];
  if (m) {
    const sw = Math.floor((CHART.W - 2 * CHART.M - (m - 1) * CHART.SGAP) / m);
    const sx0 = Math.round((CHART.W - (m * sw + (m - 1) * CHART.SGAP)) / 2);
    rest.forEach((st, k) => {
      const x = sx0 + k * (sw + CHART.SGAP);
      const nodes = st.nodes.map((nd, j) => ({
        key: `${st.id}:${nd.id}`, node: nd,
        x: x + CHART.PAD, y: top + CHART.HEAD + j * CHART.ROW, w: sw - 2 * CHART.PAD, h: CHART.ROW - 5,
      }));
      outStages.push({
        id: st.id, label: st.label,
        anyOf: st.nodes.some((nd) => nd.id === 'oneof' || nd.id === 'g4'),
        ...rollUp(st.nodes),
        x, y: top, w: sw, h: CHART.HEAD + st.nodes.length * CHART.ROW + CHART.FOOT, nodes,
      });
      if (k) links.push({ kind: 'flow', points: [[x - CHART.SGAP, top + CHART.HEAD / 2], [x, top + CHART.HEAD / 2]] });
    });
    const firstBox = outStages[0];
    const from = branched ? fork.x + fork.w / 2 : cx;
    const entry = branched ? fork.y + fork.h : CHART.FY + CHART.FH;
    links.push({ kind: 'flow', points: [[from, entry], [from, top - CHART.RAIL], [firstBox.x + firstBox.w / 2, top - CHART.RAIL], [firstBox.x + firstBox.w / 2, top]] });
  }

  const height = (outStages.length ? Math.max(...outStages.map((s) => s.y + s.h)) : top) + 32;
  return { width: CHART.W, height, funnel, fork, stub, stages: outStages, links };
}

export default { pathway, pathwaySupported, pathwayChart };
