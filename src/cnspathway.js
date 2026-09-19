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
  u2: { label: 'cIMPACT-NOW update 2', url: 'https://pubmed.ncbi.nlm.nih.gov/29497819/' },
  u7: { label: 'cIMPACT-NOW update 7', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8018155/' },
  iccr: { label: 'ICCR CNS molecular information', url: 'https://www.iccr-cancer.org/wp-content/uploads/2026/03/ICCR-CNS-Molecular-information-2nd-ed-v2.1-bookmark-1.pdf' },
  mapk: { label: 'WHO CNS5 molecular work-up review', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9427889/' },
  adaptr: { label: 'AOSNP-ADAPTR ependymal recommendations', url: 'https://onlinelibrary.wiley.com/doi/full/10.1111/bpa.70114' },
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

// True where a fusion select records a fusion that was found. The bare test `/fusion detected/`
// also matches "No fusion detected", which is the opposite answer, so the negative is excluded
// explicitly. Mirrors `fusionFound` in generators/cns_layers.js.
const fusionFound = (x) => /fusion detected/i.test(x || '') && !/^No\b/i.test(x || '');

/**
 * The three neuroanatomical compartments of the ependymal classification. Spinal is tested first
 * and infratentorial before supratentorial, so that a cauda equina or fourth ventricle entry is
 * never swallowed by a looser hemispheric term.
 */
function compartmentOf(text) {
  const s = String(text || '');
  if (/spinal|cauda equina|filum|conus|intramedullary|intradural/i.test(s)) return 'Spinal';
  if (/posterior fossa|infratentorial|cerebell|fourth ventricle|brainstem|brain stem|pons|medulla/i.test(s)) return 'Posterior fossa';
  if (/supratentorial|frontal|parietal|temporal|occipital|insula|corpus callosum|basal ganglia|thalam|lateral ventricle|third ventricle|pineal|hemisphere/i.test(s)) return 'Supratentorial';
  return '';
}

/** What the case is, as far as the recorded values say. */
function read(values) {
  const v = values || {};
  const family = `${v.dxFamily || ''}`;
  const entityField = (FAMILY_FIELD.find(([re]) => re.test(family)) || [])[1];
  const named = `${(entityField && v[entityField]) || ''} ${v.finding || ''}`.trim();
  // A circumscribed astrocytic glioma is a glioma by name and nothing like one by algorithm: it is
  // defined by a MAPK pathway alteration, most often KIAA1549::BRAF in pilocytic astrocytoma and
  // BRAF p.V600E in pleomorphic xanthoastrocytoma, and IDH is no part of its criteria
  // (ICCR CNS molecular information 2nd ed,
  // https://www.iccr-cancer.org/wp-content/uploads/2026/03/ICCR-CNS-Molecular-information-2nd-ed-v2.1-bookmark-1.pdf).
  // So it comes off the IDH funnel exactly as the ependymal tumours do, and `glioma` here means the
  // diffuse gliomas the funnel was built for.
  const circumscribed = /^Circumscribed astrocytic/i.test(family)
    || /pilocytic|pilomyxoid|xanthoastrocytoma|piloid features|astroblastoma|subependymal giant cell|chordoid glioma/i.test(named);
  // Compartment comes off the site entry first. The entity name is only a fallback, so that a case
  // sitting on an entity default cannot move the compartment out from under a recorded site - and
  // where the two disagree the clash is surfaced rather than silently resolved.
  const siteCompartment = compartmentOf(v.site);
  const namedCompartment = compartmentOf(named);
  return {
    v,
    named,
    family,
    age: num(v.patientAge),
    circumscribed,
    // Pleomorphic xanthoastrocytoma and high-grade astrocytoma with piloid features are the two in
    // this family read with CDKN2A/B alongside the MAPK alteration.
    pxaOrPiloid: /xanthoastrocytoma|piloid features/i.test(named),
    glioma: !circumscribed && /glioma|astrocytoma|oligodendroglioma|glioblastoma/i.test(`${family} ${named}`),
    ependymal: /ependymal|ependymoma/i.test(`${family} ${named}`),
    meningioma: /meningioma/i.test(`${family} ${named}`),
    posteriorFossa: /posterior fossa|fourth ventricle|cerebell/i.test(`${v.site || ''} ${named}`),
    compartment: siteCompartment || namedCompartment,
    compartmentClash: !!(siteCompartment && namedCompartment && siteCompartment !== namedCompartment),
    // Subependymoma and myxopapillary ependymoma are made on morphology, at any site, and never
    // reach the compartment question (cIMPACT-NOW update 7).
    epMorphType: /subependymoma/i.test(named) ? 'Subependymoma'
      : /myxopapillary/i.test(named) ? 'Myxopapillary ependymoma' : '',
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

/**
 * The basic panel, by the family the morphology settled on. Markers only: what they show, and what
 * that means, belongs to the stage the case then runs.
 *
 * @param {{glioma: boolean, ependymal: boolean, meningioma: boolean}} c
 */
function ihcPanel(c) {
  if (c.meningioma) {
    return {
      markers: 'EMA, SSTR2A, progesterone receptor, Ki-67',
      note: 'Ki-67 is ancillary. It carries no grading threshold of its own in a meningioma.',
      test: 'EMA and SSTR2A at least',
    };
  }
  if (c.ependymal) {
    return {
      markers: 'GFAP, EMA, S100, Ki-67',
      note: 'Dot-like or ring-like EMA supports ependymal differentiation. Ki-67 is ancillary and has no established cut-off.',
      test: 'GFAP and EMA at least',
    };
  }
  if (c.circumscribed) {
    return {
      markers: 'GFAP, OLIG2, CD34, BRAF VE1, Ki-67',
      note: 'CD34 is common in pleomorphic xanthoastrocytoma and in ganglioglioma. A VE1 stain reads only p.V600E and does not exclude the other MAPK alterations.',
      test: 'GFAP and OLIG2 at least, with CD34 and VE1 where the morphology raises them',
    };
  }
  if (!c.glioma) {
    return {
      markers: 'A panel directed by the morphology',
      note: 'The panel follows the differential raised on the sections rather than a fixed list.',
      test: 'A panel directed by the morphology',
    };
  }
  return {
    markers: 'GFAP, OLIG2, S100, Ki-67',
    note: 'Ki-67 is ancillary. It is not a grading criterion in an IDH-mutant glioma and has no established cut-off.',
    test: 'GFAP and OLIG2 at least',
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

  // The panel follows the family settled on the sections. A meningioma or a metastasis reaching this
  // node should not be asked for the glial panel, and should not be read the IDH-mutant glioma note.
  const panel = ihcPanel(c);
  nodes.push(node('ihc', 'Basic immunohistochemistry', has(v, 'ihc') || has(v, 'ihcOther') || has(v, 'mgIhc') ? 'satisfied' : 'outstanding',
    panel.markers,
    { note: panel.note, test: panel.test, source: SRC.funnel }));

  // A circumscribed astrocytic glioma is the one case that still uses IDH, and uses it backwards:
  // not as a branch point but as the test that clears an adult diffuse astrocytoma out of the
  // differential. A wildtype result does not put it on branch B. It goes to the MAPK stage, where
  // its own essential criterion lives.
  if (c.circumscribed) {
    nodes.push(node('idh', 'IDH status', done(v, 'idh1R132H') || done(v, 'idhSeq') ? 'satisfied' : 'outstanding',
      shown('An exclusion here rather than a branch point: a wildtype result clears an adult diffuse astrocytoma, and IDH is no part of the criteria for this family',
        [done(v, 'idh1R132H') ? v.idh1R132H : null, done(v, 'idhSeq') ? v.idhSeq : null].filter(Boolean).join('; ')),
      { note: 'Worth doing in an adult. In a child with classic piloid morphology it adds nothing.', test: 'IDH1 R132H immunohistochemistry', source: SRC.iccr }));
    return { id: 'funnel', label: 'The funnel', nodes };
  }

  // The IDH funnel is a diffuse glioma funnel. Ependymal tumours are classified on anatomical site
  // with the molecular group of that compartment - supratentorial ZFTA or YAP1, posterior fossa A or
  // B, spinal MYCN - and IDH has no part in it
  // (https://pmc.ncbi.nlm.nih.gov/articles/PMC11543070/, cIMPACT-NOW update 7
  // https://pmc.ncbi.nlm.nih.gov/articles/PMC8018155/). They leave the funnel here for their own
  // stage rather than being asked for a stain and a branch that mean nothing on them.
  if (!c.glioma) {
    nodes.push(node('idh', 'IDH status', 'na',
      c.ependymal
        ? 'Ependymal tumours are classified on site and the molecular group of that compartment. The IDH funnel is a diffuse glioma funnel and does not run here.'
        : 'The IDH funnel runs for the diffuse gliomas. This case is not on it.',
      { source: c.ependymal ? SRC.u7 : SRC.cns5 }));
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

  // ATRX and p53 come before 1p/19q, which is the order the bench actually runs and the order the
  // guidance allows: cIMPACT-NOW update 2 (https://pubmed.ncbi.nlm.nih.gov/29497819/) holds that a
  // diffuse astrocytic glioma with an IDH mutation plus ATRX loss and/or strong diffuse p53 can be
  // diagnosed as astrocytoma, IDH-mutant "in the absence of 1p/19q testing"
  // (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8028562/). FISH is therefore reserved for the
  // cases those stains leave open - morphologically oligodendroglial with ATRX retained.
  const p53Abnormal = /Abnormal/.test(v.p53 || '');
  // Not where oligodendroglioma is the named diagnosis: there codeletion is an essential criterion
  // and no stain stands in for it.
  const astroSettled = (atrxLost || p53Abnormal) && !c.oligo;

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

  nodes.push(node('codel', 'Combined whole-arm 1p/19q deletion',
    codelDone ? 'satisfied' : (astroSettled ? 'na' : 'outstanding'),
    shown('Present defines oligodendroglioma; excluded, with ATRX loss or an ATRX mutation, defines astrocytoma', codelDone ? v.codel : ''),
    {
      note: astroSettled && !codelDone
        ? `Astrocytoma can be diagnosed without 1p/19q testing on ${atrxLost && p53Abnormal ? 'ATRX loss with strong diffuse p53' : atrxLost ? 'ATRX loss' : 'strong diffuse p53'} in an IDH-mutant diffuse astrocytic glioma. Test where the morphology is oligodendroglial and ATRX is retained.`
        : undefined,
      test: astroSettled ? undefined : '1p/19q testing',
      source: astroSettled ? SRC.u2 : SRC.cns5,
    }));

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

/**
 * The ependymal family, compartment first.
 *
 * WHO CNS5 classifies these tumours by anatomical site and then by molecular group or genetic
 * alteration - "Ependymomas should be classified by anatomic site and by molecular group or an
 * associated genetic alteration, so that classification of the disease reflects its underlying
 * biology" (cIMPACT-NOW update 7, https://pmc.ncbi.nlm.nih.gov/articles/PMC8018155/). The
 * compartment is what decides which molecular test is the right one to order, so it is asked
 * before any of them, and the two morphologically defined types leave the algorithm ahead of it.
 *
 * Morphology stays the gate in front of all of it: "Prerequisite for the diagnosis of all
 * ependymoma is the presence of typical morphological and immunohistopathological features"
 * (https://pmc.ncbi.nlm.nih.gov/articles/PMC9245931/).
 */
function ependymalStage(c) {
  const { v } = c;
  const nodes = [];
  const morphType = c.epMorphType;

  nodes.push(node('morph', 'Ependymal morphology and immunoprofile', c.ependymal ? 'satisfied' : 'outstanding',
    'Perivascular pseudorosettes, true ependymal rosettes, monomorphic round nuclei in a fibrillary matrix; GFAP positive, EMA dot-like or ring-like, OLIG2 and SOX10 negative. A molecular result cannot make an ependymoma of a tumour whose morphology is against it.',
    { test: 'GFAP and EMA at least, with OLIG2', source: SRC.u7 }));

  nodes.push(node('pattern', 'Subependymoma or myxopapillary ependymoma', morphType ? 'satisfied' : 'na',
    morphType
      ? shown('Made on morphology at any site, so the compartment question does not arise', morphType)
      : 'These two are made on morphological criteria alone and leave here. Everything else is classified by compartment and then by molecular result.',
    {
      note: morphType === 'Myxopapillary ependymoma'
        ? 'HOXB13 separates it from a spinal ependymoma where the morphology overlaps.'
        : undefined,
      source: SRC.u7,
    }));

  const compartment = c.compartment;
  nodes.push(node('site', 'Anatomical compartment', morphType ? 'na' : (compartment ? 'satisfied' : 'outstanding'),
    morphType
      ? 'Not asked of a subependymoma or a myxopapillary ependymoma.'
      : shown('Supratentorial, posterior fossa or spinal. The compartment settles which molecular test applies', compartment ? `${compartment}${v.site ? ` (${v.site})` : ''}` : (v.site || '')),
    {
      note: c.compartmentClash ? 'The site recorded and the entity named sit in different compartments.' : undefined,
      test: 'Record the site',
      source: SRC.u7,
    }));

  return { id: 'ep', label: 'Ependymal tumour - compartment', nodes };
}

/** Where a subependymoma or a myxopapillary ependymoma goes instead of the compartment stages. */
function ependymalMorphStage(c) {
  const { v } = c;
  const mpe = c.epMorphType === 'Myxopapillary ependymoma';
  const nodes = [];
  const ihc = arr(v.epIhc);
  const gfap = arr(v.ihc).some((x) => /^GFAP positive/i.test(x));
  const hox = ihc.some((x) => /^HOXB13/i.test(x));
  const meth = v.methylation === 'Reported';

  nodes.push(node('morph', c.epMorphType || 'Morphologically defined type', c.epMorphType ? 'satisfied' : 'outstanding',
    mpe
      ? 'Cuboidal to columnar cells around hyalinised fibrovascular cores with perivascular myxoid material, at the conus, filum terminale or cauda equina.'
      : 'Clusters of isomorphic nuclei in a dense fibrillary matrix, often with microcysts, at a ventricular surface.',
    { source: SRC.cns5 }));

  nodes.push(node('gfap', 'GFAP', gfap ? 'satisfied' : 'outstanding',
    mpe
      ? 'GFAP expression is the essential immunohistochemical criterion for myxopapillary ependymoma.'
      : 'Diffuse GFAP with focal dot-like EMA confirms the subependymal glial origin.',
    { test: 'GFAP, with EMA', source: SRC.iccr }));

  nodes.push(node('hoxb13', 'HOXB13', hox ? 'satisfied' : (mpe ? 'outstanding' : 'na'),
    mpe
      ? shown('Separates myxopapillary ependymoma from spinal ependymoma where the morphology overlaps', hox ? ihc.filter((x) => /^HOXB13/i.test(x)).join('; ') : '')
      : 'A myxopapillary question, not a subependymoma one.',
    { test: 'HOXB13 immunohistochemistry', source: SRC.adaptr }));

  nodes.push(node('meth', 'Methylation profile', meth ? 'satisfied' : 'na',
    shown('Reserved for the histologically unresolved case: both types carry a discrete methylation profile', meth ? [v.methFamily, v.methClass].filter(Boolean).join(' / ') : ''),
    { test: 'DNA methylation profiling', source: SRC.adaptr }));

  nodes.push(node('grade', 'Grade', 'satisfied',
    mpe ? 'Myxopapillary ependymoma is CNS WHO grade 2.' : 'Subependymoma is CNS WHO grade 1.',
    { source: SRC.cns5 }));

  return { id: 'epm', label: c.epMorphType || 'Morphologically defined type', nodes };
}

/** Supratentorial: ZFTA, then YAP1, with L1CAM and p65 standing in where fusion testing is out of reach. */
function ependymalSupraStage(c) {
  const { v } = c;
  const nodes = [];
  const ihc = arr(v.epIhc);
  const l1cam = ihc.some((x) => /^L1CAM positive/i.test(x));
  const p65 = ihc.some((x) => /^p65 nuclear/i.test(x));
  const surrogateDone = ihc.some((x) => /^L1CAM|^p65/i.test(x));
  const zfta = fusionFound(v.zfta);
  const yap1 = fusionFound(v.yap1);
  const tested = done(v, 'zfta') || done(v, 'yap1');

  nodes.push(node('surrogate', 'L1CAM and p65', surrogateDone ? 'satisfied' : 'outstanding',
    shown('Strong diffuse L1CAM with nuclear p65 stands in for a ZFTA fusion where fusion testing is out of reach; both negative points to YAP1 or to NEC', surrogateDone ? ihc.filter((x) => /^L1CAM|^p65/i.test(x)).join('; ') : ''),
    {
      note: l1cam && !p65 ? 'L1CAM alone is sensitive but not specific: it is expressed in many other tumours.' : undefined,
      test: 'L1CAM and p65 immunohistochemistry',
      source: SRC.adaptr,
    }));

  nodes.push(node('zfta', 'ZFTA fusion', zfta ? 'satisfied' : (done(v, 'zfta') ? 'na' : 'outstanding'),
    shown('A ZFTA fusion in a supratentorial ependymoma is the essential criterion for ZFTA fusion-positive. RELA is the commonest partner', done(v, 'zfta') ? [v.zfta, v.zftaDetail].filter(Boolean).join(' - ') : ''),
    { test: 'ZFTA fusion by FISH, RT-PCR or sequencing', source: SRC.iccr }));

  nodes.push(node('yap1', 'YAP1 fusion', yap1 ? 'satisfied' : (zfta ? 'na' : (done(v, 'yap1') ? 'na' : 'outstanding')),
    shown('Asked where no ZFTA fusion is found. A YAP1 fusion, typically YAP1::MAMLD1, is the essential criterion for YAP1 fusion-positive', done(v, 'yap1') ? [v.yap1, v.yap1Detail].filter(Boolean).join(' - ') : ''),
    { test: 'YAP1 fusion by FISH, RT-PCR or sequencing', source: SRC.iccr }));

  const nec = tested && !zfta && !yap1;
  nodes.push(node('nec', 'Supratentorial ependymoma, NEC or NOS', nec ? 'outstanding' : 'na',
    nec
      ? 'Fusion testing done and neither fusion found: this is reported NEC. Where the testing could not be done or did not work, it is NOS.'
      : 'The landing place when neither fusion is found, or when fusion testing cannot be done.',
    { test: 'Report as NEC, or as NOS where testing was not feasible', source: SRC.u7 }));

  nodes.push(gradeNode(c));
  return { id: 'epst', label: 'Supratentorial ependymoma', nodes };
}

/** Posterior fossa: K27me3, EZHIP, methylation, as update 11 revises them. */
function ependymalFossaStage(c) {
  const { v } = c;
  const nodes = [];
  const k27 = done(v, 'h3k27me3');
  const lost = v.h3k27me3 === 'Loss of nuclear expression';
  const ezhip = done(v, 'ezhip');
  const meth = v.methylation === 'Reported';
  const zfta = fusionFound(v.zfta);

  nodes.push(node('k27me3', 'H3 K27me3', k27 ? 'satisfied' : 'outstanding',
    shown('Loss of nuclear expression in tumour cells, with endothelial and inflammatory nuclei retaining it as the internal control, classifies a posterior fossa ependymoma as group A', k27 ? v.h3k27me3 : ''),
    { note: 'Update 11 replaced "global reduction" with "loss of expression". Most group A cases lose it completely.', test: 'H3 K27me3 immunohistochemistry', source: SRC.u11 }));

  nodes.push(node('ezhip', 'EZHIP', ezhip ? 'satisfied' : (lost ? 'na' : 'outstanding'),
    shown('Strong diffuse nuclear EZHIP supports group A where the K27me3 stain is ambiguous and methylation is out of reach; group B is typically negative', ezhip ? v.ezhip : ''),
    { test: 'EZHIP immunohistochemistry', source: SRC.u11 }));

  nodes.push(node('meth', 'Methylation profile', meth ? 'satisfied' : 'outstanding',
    shown('Definite group B classification requires methylation. It also identifies the posterior fossa subependymoma class', meth ? [v.methFamily, v.methClass].filter(Boolean).join(' / ') : ''),
    { test: 'DNA methylation profiling', source: SRC.u11 }));

  const nos = v.h3k27me3 === 'Retained nuclear expression' && !meth && v.ezhip !== 'Overexpressed (strong diffuse nuclear staining)';
  nodes.push(node('nos', zfta ? 'Posterior fossa ependymoma, ZFTA fusion-positive, NEC' : 'Posterior fossa ependymoma, NOS', nos || zfta ? 'outstanding' : 'na',
    zfta
      ? 'A ZFTA fusion in the posterior fossa is outside the WHO CNS5 list, which names ZFTA fusion-positive ependymoma supratentorially only. Update 11 designates it NEC.'
      : nos
        ? 'Retained K27me3, no EZHIP overexpression and no conclusive methylation: reported NOS rather than assigned a group.'
        : 'The landing place when the group cannot be established, and where an emerging type is designated NEC.',
    { test: zfta ? 'Report as NEC' : 'Methylation profiling, or report as NOS', source: SRC.u11 }));

  nodes.push(gradeNode(c));
  return { id: 'eppf', label: 'Posterior fossa ependymoma', nodes };
}

/** Spinal: the mimics first, then MYCN. */
function ependymalSpinalStage(c) {
  const { v } = c;
  const nodes = [];
  const ihc = arr(v.epIhc);
  const cnv = arr(v.epCnv);
  const amp = v.mycn === 'Amplified' || ihc.includes('MYCN positive');
  const mycnDone = done(v, 'mycn') || ihc.some((x) => /^MYCN/i.test(x));
  const k27lost = v.h3k27me3 === 'Loss of nuclear expression';
  const mimicDone = done(v, 'h3k27me3') || ihc.some((x) => /^HOXB13/i.test(x));

  nodes.push(node('mimic', 'What else is in the differential', mimicDone ? 'satisfied' : 'outstanding',
    'Myxopapillary ependymoma, separated by HOXB13; a drop metastasis from a group A ependymoma, suspected where OLIG2 is negative and K27me3 is lost, which calls for radiological correlation; and diffuse midline glioma, H3 K27-altered, which can itself carry MYCN amplification.',
    {
      note: k27lost ? 'K27me3 is lost here. A drop metastasis from a posterior fossa group A ependymoma has to be excluded on the imaging.' : undefined,
      test: 'H3 K27me3 and H3 K27M, with HOXB13 where the morphology is myxopapillary',
      source: SRC.adaptr,
    }));

  nodes.push(node('mycn', 'MYCN', amp ? 'satisfied' : (mycnDone ? 'na' : 'outstanding'),
    shown('Amplification in a spinal ependymoma is the essential criterion for MYCN-amplified. Immunohistochemistry is the surrogate and FISH confirms it', mycnDone ? [done(v, 'mycn') ? v.mycn : '', ...ihc.filter((x) => /^MYCN/i.test(x))].filter(Boolean).join('; ') : ''),
    {
      note: 'Worth ordering on high-grade histology or aggressive radiology, because high-grade histology is not always present in this entity.',
      test: 'MYCN immunohistochemistry, then FISH',
      source: SRC.adaptr,
    }));

  nodes.push(node('cnv', 'Copy number', cnv.length ? 'satisfied' : 'outstanding',
    shown('22q loss supports a spinal ependymoma; NF2 status carries prognostic weight', cnv.join('; ')),
    { test: 'Genome-wide copy number, or 22q', source: SRC.iccr }));

  nodes.push(gradeNode(c));
  return { id: 'epsp', label: 'Spinal ependymoma', nodes };
}

/**
 * The grade node shared by the three compartment stages. Grading in this family stays histological:
 * brisk mitotic activity and microvascular proliferation carry more weight than pleomorphism or
 * necrosis, and Ki-67 is not a WHO grading marker here.
 */
function gradeNode(c) {
  const { v } = c;
  const mycnAmp = v.mycn === 'Amplified';
  const graded = has(v, 'grade') && v.grade !== 'From the findings' && v.grade !== 'Pending';
  return node('grade', 'Grade', mycnAmp ? 'na' : (graded ? 'satisfied' : 'outstanding'),
    mycnAmp
      ? 'No CNS WHO grade is assigned to spinal ependymoma, MYCN-amplified.'
      : shown('CNS WHO grade 2 or grade 3, on the histology: brisk mitotic activity and microvascular proliferation carry it', graded ? String(v.grade) : ''),
    {
      note: mycnAmp ? undefined : 'Ki-67 is not a WHO grading marker in this family.',
      test: 'Record mitotic count and microvascular proliferation',
      source: SRC.adaptr,
    });
}

/**
 * The circumscribed astrocytic gliomas: morphology, then a MAPK pathway alteration.
 *
 * A MAPK pathway alteration is an essential criterion for pilocytic astrocytoma - "MAPK pathway
 * alteration, such as BRAF, most frequent KIAA1549::BRAF" - and for pleomorphic xanthoastrocytoma
 * it is the MAPK alteration "combined with CDKN2A/B" homozygous deletion, per the ICCR CNS
 * molecular information dataset
 * (https://www.iccr-cancer.org/wp-content/uploads/2026/03/ICCR-CNS-Molecular-information-2nd-ed-v2.1-bookmark-1.pdf).
 * KIAA1549::BRAF is not specific on its own: it is also seen in pilomyxoid astrocytoma,
 * ganglioglioma and diffuse leptomeningeal glioneuronal tumour, so it is read with the morphology.
 */
function mapkStage(c) {
  const { v } = c;
  const nodes = [];
  const fusion = fusionFound(v.brafFusion);
  const v600 = v.braf === 'Detected';
  const other = has(v, 'mapkOther');
  const anyMapk = fusion || v600 || other;
  const tested = done(v, 'brafFusion') || done(v, 'braf') || other;

  nodes.push(node('morph', 'A circumscribed astrocytic glioma on the sections', c.circumscribed ? 'satisfied' : 'outstanding',
    shown('Piloid or compact circumscribed growth rather than diffuse infiltration: Rosenthal fibres and eosinophilic granular bodies in a pilocytic astrocytoma, pleomorphic and lipidised cells with a reticulin network in a pleomorphic xanthoastrocytoma', c.named || ''),
    { source: SRC.cns5 }));

  nodes.push(node('mapk', 'A MAPK pathway alteration', anyMapk ? 'satisfied' : 'outstanding',
    shown('The essential molecular criterion for this family', [
      fusion ? v.brafFusion : null,
      v600 ? 'BRAF V600E detected' : null,
      other ? String(v.mapkOther) : null,
    ].filter(Boolean).join('; ')),
    {
      note: tested && !anyMapk
        ? 'BRAF is negative on what is recorded. NF1, FGFR1 and NTRK1/2/3 carry the pathway in a minority, and a methylation profile is the fallback where none of them is found.'
        : 'KIAA1549::BRAF is the commonest and is not specific: pilomyxoid astrocytoma, ganglioglioma and diffuse leptomeningeal glioneuronal tumour carry it too, so it is read with the morphology.',
      test: 'KIAA1549::BRAF fusion testing, BRAF p.V600E, then NF1, FGFR1 and NTRK1/2/3 where the first two are negative',
      source: SRC.iccr,
    }));

  nodes.push(node('v600', 'BRAF p.V600E', done(v, 'braf') ? 'satisfied' : 'outstanding',
    shown('The alteration of pleomorphic xanthoastrocytoma, and the one with a targeted therapy behind it', done(v, 'braf') ? v.braf : ''),
    { note: 'A VE1 stain is a screen. Sequencing settles it, and it does not exclude the fusion and the other MAPK alterations.', test: 'BRAF p.V600E', source: SRC.iccr }));

  nodes.push(node('cdkn', 'CDKN2A / CDKN2B', c.pxaOrPiloid ? (done(v, 'cdkn2a') ? 'satisfied' : 'outstanding') : 'na',
    c.pxaOrPiloid
      ? shown('Read together with the MAPK alteration in pleomorphic xanthoastrocytoma and in high-grade astrocytoma with piloid features', done(v, 'cdkn2a') ? v.cdkn2a : '')
      : 'Applies to pleomorphic xanthoastrocytoma and to high-grade astrocytoma with piloid features rather than to the family as a whole.',
    { test: 'CDKN2A/B copy number', source: SRC.iccr }));

  nodes.push(node('meth', 'Methylation profile', v.methylation === 'Reported' ? 'satisfied' : 'outstanding',
    shown('The separation of high-grade astrocytoma with piloid features from a pilocytic astrocytoma rests on the methylation class', v.methylation === 'Reported' ? [v.methFamily, v.methClass].filter(Boolean).join(' / ') : ''),
    { test: 'DNA methylation profiling', source: SRC.mapk }));

  return { id: 'mapk', label: 'MAPK pathway', nodes };
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

  if (c.circumscribed) {
    branch = 'mapk';
    title = 'Circumscribed astrocytic glioma';
    lede = 'IDH clears the diffuse gliomas out of the way; the diagnosis then rests on a MAPK pathway alteration.';
    stages.push(mapkStage(c));
  } else if (c.ependymal) {
    branch = 'ependymoma';
    title = c.epMorphType || (c.compartment ? `${c.compartment} ependymoma` : 'Ependymal tumour');
    lede = c.epMorphType
      ? 'Made on morphology, at any site: the compartment question does not arise.'
      : 'Anatomical compartment first, then the molecular test that compartment calls for.';
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

  if (c.ependymal) {
    stages.push(ependymalStage(c));
    if (c.epMorphType) stages.push(ependymalMorphStage(c));
    else if (c.compartment === 'Supratentorial') stages.push(ependymalSupraStage(c));
    else if (c.compartment === 'Posterior fossa') stages.push(ependymalFossaStage(c));
    else if (c.compartment === 'Spinal') stages.push(ependymalSpinalStage(c));
  }
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
