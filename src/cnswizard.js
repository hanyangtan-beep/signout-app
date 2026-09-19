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
    id: 'site',
    field: 'site',
    question: 'Where is the tumour?',
    why: 'A midline diffuse astrocytic glioma gets H3 K27 assessment at any age, so the site decides whether that branch opens.',
    applies: (v, ctx) => ctx.glioma(v),
  },
  {
    id: 'basicIhc',
    field: 'ihc',
    question: 'Which immunohistochemistry has been done so far?',
    why: 'The first panel confirms glial lineage and frames the differential before any molecular test is sent: GFAP, OLIG2, and Ki-67 as a proliferation guide rather than a grading criterion.',
    applies: (v, ctx) => ctx.glioma(v),
    answered: (v) => has(v, 'ihc') || has(v, 'ihcOther'),
    optional: true,
  },
  {
    id: 'molStatus',
    field: 'molStatus',
    question: 'Where do the molecular studies stand?',
    why: 'Layer 4 only opens once there is something to record. Until then the diagnosis stays at what the morphology supports, with the molecular work named as pending.',
    applies: (v, ctx) => ctx.glioma(v),
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
  {
    id: 'codel',
    field: 'codel',
    question: 'What does 1p/19q testing show?',
    why: 'Codeletion separates oligodendroglioma from astrocytoma on the IDH-mutant branch, and the two are graded by different rules from here on.',
    applies: (v, ctx) => ctx.mutant(v),
    answered: (v) => answeredSelect(v, 'codel'),
  },
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
    why: 'Homozygous deletion carries grade 4 in an IDH-mutant astrocytoma. Hemizygous loss is not a criterion, and p16 or MTAP immunohistochemistry is a surrogate, not the test.',
    applies: (v, ctx) => ctx.mutant(v),
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
    why: 'A midline diffuse astrocytic glioma is assessed for H3 K27 at any age. Loss of trimethylation is not the same as an H3 K27M mutation; EZHIP overexpression and several other tumours also lose it.',
    applies: (v, ctx) => ctx.wildtype(v) && (ctx.midline(v) || ctx.ependymal(v)),
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

  // ----- ependymal -----
  {
    id: 'ezhip',
    field: 'ezhip',
    question: 'What does EZHIP immunohistochemistry show?',
    why: 'In a posterior fossa ependymoma, EZHIP overexpression supports group A where the K27me3 stain is ambiguous and methylation profiling is out of reach.',
    applies: (v, ctx) => ctx.ependymal(v) && v.h3k27me3 !== 'Loss of nuclear expression',
    answered: (v) => answeredSelect(v, 'ezhip'),
    optional: true,
  },

  // ----- methylation -----
  {
    id: 'methylation',
    field: 'methylation',
    question: 'Has DNA methylation profiling been done?',
    why: 'It settles the cases the panel cannot: a posterior fossa ependymoma group, an under-25 high-grade glioma, a discordant molecular set. Report it in layers - classifier, family, class, calibrated score against the laboratory threshold - not as a bare class name.',
    applies: (v, ctx) => ctx.glioma(v) || ctx.ependymal(v),
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

  // ----- close -----
  {
    id: 'grade',
    field: 'grade',
    question: 'Which CNS WHO grade goes in the report?',
    why: 'The proposal from the recorded findings is offered as the default. It is a proposal - the grade in the report is yours, and a disagreement is flagged beside the form rather than overruled.',
    applies: (v, ctx) => ctx.glioma(v) || ctx.ependymal(v),
  },
  {
    id: 'histClass',
    field: 'histClass',
    question: 'How does Layer 2 read?',
    why: 'The histopathological classification is the morphological line of the layered report, kept separate from the integrated diagnosis above it.',
    applies: (v, ctx) => ctx.glioma(v) || ctx.ependymal(v),
    optional: true,
  },
];

/** Predicates the steps share, kept in one place so the funnel reads as one thing. */
function context() {
  const glioma = (v) => /glioma|astrocytoma|oligodendroglioma|glioblastoma/i.test(`${v.dxFamily || ''} ${v.dxAdult || ''} ${v.dxPaediatric || ''} ${v.dxCircumscribed || ''} ${v.finding || ''}`);
  const ependymal = (v) => /ependymal|ependymoma/i.test(`${v.dxFamily || ''} ${v.dxEpendymal || ''} ${v.finding || ''}`);
  const reported = (v) => v.molStatus === 'Reported';
  const mutant = (v) => reported(v) && v.idhBranch === 'IDH-mutant';
  const wildtype = (v) => reported(v) && v.idhBranch === 'IDH-wildtype';
  const named = (v) => `${v.dxAdult || ''} ${v.finding || ''}`;
  return {
    glioma,
    ependymal,
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
    case 'h3k27me3':
      out.push('Loss of trimethylation is not an H3 K27M mutation. EZHIP overexpression and several other tumours lose it too.');
      break;
    case 'methClass':
      if (num(v.methScore) !== null && num(v.methThreshold) !== null && num(v.methScore) < num(v.methThreshold)) {
        out.push('The calibrated score is below your laboratory threshold. A subthreshold match may contribute where the other findings support it, but it cannot carry the class on its own.');
      }
      break;
    case 'grade':
      if (age !== null && age < 18 && ctx.wildtype(v)) out.push('Under 18 with an H3-wildtype high-grade glioma, consider mismatch-repair immunohistochemistry before signing out.');
      break;
    default:
      break;
  }
  return out;
}

export default { wizardSteps, wizardSupported, visibleSteps, stepAnswered, atDefault, nextStep, wizardProgress, cautions };
