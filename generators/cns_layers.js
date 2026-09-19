// Shared CNS diagnosis core: the four layers of the house brain form, in one place.
//
// Source template: QMH Cancer Reporting Template - CNS (Common gliomas and ependymomas)
//   https://awiloqmh.github.io/CancerReportingTemplate/CNS-Common_gliomas_and_ependymomas.html
// which carries the US CAP protocol "Tumors of the Brain and Spinal Cord" 1.0.0.1 (September 2025).
// That page has no specimen, procedure, macroscopic or margin item: it is the diagnosis block and
// nothing else, so it applies to a stereotactic core exactly as it applies to a craniotomy. This
// module is therefore shared by both CNS templates —
//   generators/cns_tumour.js   glioma and ependymoma resection (the whole set)
//   generators/cns_biopsy.js   biopsy and smear (on the glioma and ependymoma path)
// — so that a glioblastoma reads the same whichever way it arrived in the laboratory. The matching
// field definitions live in schemas/_cns_layers.json (scripts/build-cns-layers.py).
//
// The layers, in the house print order:
//   Layer 1  Integrated diagnosis  - entity, CNS WHO grade, NOS / NEC / pending qualifier
//   Layer 2  Histopathological classification (the older histological vocabulary, a separate field)
//   Layer 3  CNS WHO grade - a free choice on the form, proposed here and never overwritten
//   Layer 4  Molecular information, branched into an IDH-mutant and an IDH-wildtype panel
// Mitoses, Ki-67 and treatment effect are the house extras; the page carries none of the first two.
//
// Knowledge grounding, comments only (never printed):
//   WHO CNS5 grading - IDH-mutant astrocytoma 2/3/4, grade 4 on microvascular proliferation,
//     necrosis or CDKN2A/B homozygous deletion; oligodendroglioma 2/3; an IDH-wildtype adult
//     diffuse astrocytic glioma is glioblastoma (grade 4) with TERT promoter mutation, EGFR
//     amplification or combined +7/-10   https://pmc.ncbi.nlm.nih.gov/articles/PMC8328017/
//   CAP-AANP-AMP-SNO biomarker guideline (the Layer 4 panel and its branching): Brat DJ et al.,
//     Arch Pathol Lab Med 2022;146(5):547-574   https://pubmed.ncbi.nlm.nih.gov/34351401/
//   Layered integrated reporting   https://www.iccr-cancer.org/wp-content/uploads/2026/03/ICCR-CNS-Integrated-diagnosis-2nd-ed-v2.1-bookmark-1.pdf
//
// Every entity-dependent function takes the entity as an optional second argument. The resection
// template reads it from Layer 1 (`dxFamily` and the per-family entity select); the biopsy names
// the same tumour in its flat `finding` select and passes that through.

import { stripDot } from './_house.js';
import { uc1, lc1, num, arr, list, ASTRO, OLIGO, GBM, DMG, PILOCYTIC, SCHWANNOMA, FEATURE_PHRASE } from './cns_morphology.js';

export const NP = 'Not performed';
export const CBD = 'Cannot be determined';

// ---------- Layer 1: integrated diagnosis ----------

/** The per-family entity field that Layer 1 reads, keyed by the family select. */
export const FAMILY_FIELD = {
  'Adult-type diffuse gliomas': 'dxAdult',
  'Paediatric-type diffuse low-grade gliomas': 'dxPaedLow',
  'Paediatric-type diffuse high-grade gliomas': 'dxPaedHigh',
  'Circumscribed astrocytic gliomas': 'dxCircumscribed',
  'Glioneuronal and neuronal tumours': 'dxGlioneuronal',
  'Ependymal tumours': 'dxEpendymal',
  'Choroid plexus tumours': 'dxChoroid',
  'Medulloblastomas, molecularly defined': 'dxMedMol',
  'Medulloblastomas, histologically defined': 'dxMedHist',
  'Other CNS embryonal tumours': 'dxEmbryonal',
  'Pineal tumours': 'dxPineal',
  'Cranial and paraspinal nerve tumours': 'dxNerve',
  'Mesenchymal tumours involving the CNS': 'dxMesenchymal',
  'Melanocytic tumours': 'dxMelanocytic',
  'Haematolymphoid tumours involving the CNS': 'dxHaem',
  'Germ cell tumours': 'dxGerm',
  'Tumours of the sellar region': 'dxSellar',
  'Metastatic tumour': 'dxMetastatic'
};

/** The WHO CNS5 entity chosen in Layer 1, or the typed free text when the list does not carry it. */
export function entity(v) {
  const fam = v.dxFamily || 'Adult-type diffuse gliomas';
  if (fam === 'Other / not listed') return stripDot(v.dxOther) || 'Tumour type not specified';
  const chosen = v[FAMILY_FIELD[fam]] || '';
  if (!chosen || /^Other entity/.test(chosen)) return stripDot(v.dxOther) || 'Tumour type not specified';
  return chosen;
}

/** Layer 1 as printed: the entity, then the grade, then any NOS / NEC / pending qualifier. */
export function integratedDiagnosis(v, e = entity(v)) {
  const q = v.dxQualifier || '';
  // A meningioma is named from its subtype and its grade, so Layer 1 reads "Atypical meningioma,
  // CNS WHO grade 2" rather than the bare family entity with a grade bolted on.
  let s = e === 'Meningioma' ? meningiomaName(v) : e;
  const g = grade(v, e);
  if (g) s += `, CNS WHO grade ${g}`;
  if (/^NOS/.test(q)) s += ', NOS';
  else if (/^NEC/.test(q)) s += ', NEC';
  else if (q === CBD) s += `; cannot be determined${stripDot(v.dxQualifierDetail) ? ` (${lc1(stripDot(v.dxQualifierDetail))})` : ''}`;
  else if (/^Pending/.test(q)) s += `; pending further studies${stripDot(v.dxQualifierDetail) ? ` (${lc1(stripDot(v.dxQualifierDetail))})` : ''}`;
  return s;
}

/** The entity in the house diagnosis-line case: the name in capitals, its qualifiers left alone. */
export const upperEntity = (s) => {
  const c = s.indexOf(', ');
  return c > 0 ? `${s.slice(0, c).toUpperCase()}${s.slice(c)}` : s.toUpperCase();
};

// ---------- Layer 2: histopathological classification ----------

export const histClassText = (v) => (v.histClass === 'Other (specify)'
  ? stripDot(v.histClassOther) || 'Other'
  : v.histClass || '');

// ---------- Layer 3: CNS WHO grade ----------

export const FIXED_GRADE = {
  [GBM]: 4,
  [DMG]: 4,
  'Diffuse hemispheric glioma, H3 G34-mutant': 4,
  'Diffuse astrocytoma, MYB- or MYBL1-altered': 1,
  'Angiocentric glioma': 1,
  'Polymorphous low-grade neuroepithelial tumour of the young': 1,
  [PILOCYTIC]: 1,
  'Subependymal giant cell astrocytoma': 1,
  'Chordoid glioma': 2,
  Ganglioglioma: 1,
  Gangliocytoma: 1,
  'Desmoplastic infantile ganglioglioma / desmoplastic infantile astrocytoma': 1,
  'Dysembryoplastic neuroepithelial tumour': 1,
  'Papillary glioneuronal tumour': 1,
  'Rosette-forming glioneuronal tumour': 1,
  'Myxoid glioneuronal tumour': 1,
  'Multinodular and vacuolating neuronal tumour': 1,
  'Dysplastic cerebellar gangliocytoma (Lhermitte-Duclos disease)': 1,
  'Central neurocytoma': 2,
  'Extraventricular neurocytoma': 2,
  'Cerebellar liponeurocytoma': 2,
  'Myxopapillary ependymoma': 2,
  Subependymoma: 1,
  'Spinal ependymoma, MYCN-amplified': 3,
  'Choroid plexus papilloma': 1,
  'Atypical choroid plexus papilloma': 2,
  'Choroid plexus carcinoma': 3,
  'Medulloblastoma, WNT-activated': 4,
  'Medulloblastoma, SHH-activated and TP53-wildtype': 4,
  'Medulloblastoma, SHH-activated and TP53-mutant': 4,
  'Medulloblastoma, non-WNT/non-SHH': 4,
  'Medulloblastoma, classic': 4,
  'Medulloblastoma, desmoplastic/nodular': 4,
  'Medulloblastoma with extensive nodularity': 4,
  'Medulloblastoma, large cell / anaplastic': 4,
  'Atypical teratoid/rhabdoid tumour': 4,
  'Embryonal tumour with multilayered rosettes': 4,
  'CNS neuroblastoma, FOXR2-activated': 4,
  'CNS tumour with BCOR internal tandem duplication': 4,
  Pineocytoma: 1,
  Pineoblastoma: 4,
  [SCHWANNOMA]: 1,
  Neurofibroma: 1,
  Perineurioma: 1,
  'Hybrid nerve sheath tumour': 1,
  'Paraganglioma of the cauda equina': 1,
  Haemangioblastoma: 1
};

export const HIGH_GRADE_FEATURES = ['Microvascular proliferation', 'Necrosis with pseudopalisading', 'Necrosis without pseudopalisading'];
export const isEpendymoma = (e) => /ependymoma/i.test(e) && !/^Subependymoma|^Myxopapillary/.test(e);

/**
 * The anatomical compartment, which in the ependymal family is asked before any molecular test:
 * WHO CNS5 classifies these tumours by anatomical site and then by the molecular group or
 * alteration of that site (cIMPACT-NOW update 7, https://pmc.ncbi.nlm.nih.gov/articles/PMC8018155/).
 * Spinal is tested before infratentorial and infratentorial before supratentorial, so a cauda
 * equina or fourth ventricle entry is never swallowed by a looser term. Mirrors `compartmentOf` in
 * src/cnspathway.js and the predicate of the same name in src/cnswizard.js.
 */
/**
 * True where a fusion select records a fusion that was found. The bare test `/fusion detected/`
 * also matches "No fusion detected", which is the opposite answer, so the negative is excluded
 * explicitly. Shared with src/cnspathway.js and src/cnswizard.js.
 */
export const fusionFound = (x) => /fusion detected/i.test(x || '') && !/^No\b/i.test(x || '');

export const compartmentOf = (text) => {
  const t = String(text || '');
  if (/spinal|cauda equina|filum|conus|intramedullary|intradural/i.test(t)) return 'Spinal';
  if (/posterior fossa|infratentorial|cerebell|fourth ventricle|brainstem|brain stem|pons|medulla/i.test(t)) return 'Posterior fossa';
  if (/supratentorial|frontal|parietal|temporal|occipital|insula|corpus callosum|basal ganglia|thalam|lateral ventricle|third ventricle|pineal|hemisphere/i.test(t)) return 'Supratentorial';
  return '';
};

/**
 * The mitotic threshold that sends an IDH-mutant astrocytoma from grade 2 to grade 3: three or more
 * in 2.4 mm2, which is ten high-power fields of 0.24 mm2, counted in the most active area. The
 * field records the count over ten fields, so the two read as the same number here. Before this,
 * a single mitosis was enough, which is the WHO CNS5 reading the update replaces.
 */
export const ASTRO_MITOTIC_THRESHOLD = 3;

/** Grade 4 by molecular criterion in an IDH-mutant astrocytoma: the two copy-number findings. */
export function grade4Molecular(v) {
  const out = [];
  if (v.cdkn2a === 'Homozygous deletion detected') out.push('homozygous deletion of CDKN2A/B');
  if (v.pdgfra === 'Amplified') out.push('amplification of PDGFRA');
  return out;
}

/** Grade 3 by molecular criterion in an IDH-mutant astrocytoma: the higher-risk alteration set. */
export function grade3Molecular(v) {
  return arr(v.molHigher);
}

/** One higher-grade alteration in prose: "amplification of CDK4", "a pathogenic PIK3CA mutation". */
export function higherPhrase(entry) {
  const amp = /^(\w+) amplification$/.exec(entry);
  if (amp) return `amplification of ${amp[1]}`;
  const hom = /^(\w+) homozygous deletion$/.exec(entry);
  if (hom) return `homozygous deletion of ${hom[1]}`;
  const mut = /^(\w+) pathogenic mutation$/.exec(entry);
  if (mut) return `a pathogenic ${mut[1]} mutation`;
  const sig = /^(.+) methylation signature$/.exec(entry);
  if (sig) return `a ${sig[1]} methylation signature`;
  return lc1(entry);
}

/** The grade the recorded findings support, or null when the entity does not carry a settled grade. */
export function proposedGrade(v, e = entity(v)) {
  const feats = arr(v.features);
  const mit = num(v.mitoses);
  const high = feats.some((x) => HIGH_GRADE_FEATURES.includes(x));
  if (FIXED_GRADE[e]) return FIXED_GRADE[e];
  if (e === ASTRO) {
    if (high || grade4Molecular(v).length) return 4;
    if (grade3Molecular(v).length) return 3;
    return mit !== null && mit >= ASTRO_MITOTIC_THRESHOLD ? 3 : 2;
  }
  if (e === OLIGO) return high || (mit !== null && mit >= 6) ? 3 : 2;
  if (e === 'Pleomorphic xanthoastrocytoma') return (mit !== null && mit >= 5) || high ? 3 : 2;
  if (isEpendymoma(e)) return high || (mit !== null && mit >= 5) ? 3 : 2;
  // A meningioma is graded on its own criteria, which are independent of the subtype; see
  // meningiomaGrading below. Without this arm the resection form named a meningioma and then had
  // no grade to propose, so it raised "CNS WHO grade is required" whatever was recorded.
  // The biopsy form records the morphology in `finding` rather than in the Layer 1 entity selects,
  // so both routes to a meningioma are read; otherwise the biopsy foot showed no proposed grade.
  if (e === 'Meningioma' || /^Meningioma/.test(v.finding || '')) return meningiomaGrade(v);
  return null;
}

// ---------- meningioma grading ----------
//
// WHO CNS5 grades a meningioma on criteria that are applied "regardless of the underlying subtype"
// (https://pmc.ncbi.nlm.nih.gov/articles/PMC8328013/), so this is one gate set for all fifteen
// subtypes, shared by the biopsy and the resection template.
//
//   grade 3, any one of:  >= 20 mitoses per 1.6 mm2 (>= 12.5/mm2); frank anaplasia resembling
//     carcinoma, high-grade sarcoma or melanoma; a TERT promoter oncogenic variant; CDKN2A/B
//     homozygous deletion. The last two are independent diagnostic criteria in CNS5
//     (https://academic.oup.com/neuro-oncology/article/27/2/319/7745776). Hemizygous CDKN2A/B loss
//     is explicitly not usable for grading.
//   grade 2, any one of:  4-19 mitoses per 1.6 mm2 (>= 2.5/mm2); unequivocal brain invasion, which
//     is tumour through the leptomeninges into the subjacent parenchyma and not extension along
//     Virchow-Robin spaces; at least three of the five soft criteria (sheeting, hypercellularity,
//     small cell change, macronucleoli, spontaneous non-iatrogenic necrosis); chordoid or clear
//     cell subtype; or 1p deletion with 22q deletion and/or an NF2 oncogenic variant, which is the
//     cIMPACT-NOW update 8 proposal.
//   grade 1 otherwise.
//
// Papillary and rhabdoid morphology no longer grade on their own: update 8 records that the grading
// of those tumours "was amended from assignment to CNS WHO grade 3 on the basis of rhabdoid or
// papillary histology alone towards stratification into CNS WHO grade 1, 2, or 3 based on the
// presence or absence of histological criteria". H3 K27me3 loss "offers prognostic information but
// does not currently inform grading", and Ki-67 carries no threshold.

/** The two subtypes CNS5 assigns to grade 2 on the morphology alone. */
export const MENINGIOMA_GRADE2_SUBTYPE = ['Chordoid', 'Clear cell'];
/** Names that are grades rather than morphological subtypes, and so cannot support themselves. */
export const MENINGIOMA_GRADE_NAME = { Atypical: 2, Anaplastic: 3 };

const MG_TERT = 'TERT promoter mutation detected';
const MG_CDKN2A = 'CDKN2A/B homozygous deletion detected';
const MG_1P = '1p deletion detected';
const MG_22Q = '22q deletion detected';
const MG_NF2 = 'NF2 pathogenic variant detected';

/**
 * The CNS WHO grade the recorded meningioma findings support, with the criteria that carried it.
 *
 * Returns `{ grade, grade3, grade2, biob, borderline }`. `grade3` and `grade2` name the criteria
 * met, in prose, for the pathway panel and the checks - never for the printed report. `biob` marks
 * a brain-invasive but otherwise benign tumour, `borderline` a case sitting on the grade 1 / 2 line
 * where the molecular tests decide it.
 */
export function meningiomaGrading(v) {
  const mit = num(v.mgMitoses);
  const soft = arr(v.mgAtypical);
  const mol = arr(v.mgMolecular);
  const sub = v.mgSubtype || '';
  const g3 = [];
  const g2 = [];

  if (mit !== null && mit >= 20) g3.push(`${mit} mitoses per 1.6 mm\u00b2`);
  if (v.mgAnaplasia === 'Present') g3.push('frank anaplasia');
  if (mol.includes(MG_TERT)) g3.push('a TERT promoter mutation');
  if (mol.includes(MG_CDKN2A)) g3.push('CDKN2A/B homozygous deletion');

  if (mit !== null && mit >= 4 && mit < 20) g2.push(`${mit} mitoses per 1.6 mm\u00b2`);
  if (v.mgBrain === 'Present') g2.push('brain invasion');
  if (soft.length >= 3) g2.push(`${soft.length} of the five atypical features`);
  if (MENINGIOMA_GRADE2_SUBTYPE.includes(sub)) g2.push(`${lc1(sub)} morphology`);
  if (mol.includes(MG_1P) && (mol.includes(MG_22Q) || mol.includes(MG_NF2))) {
    g2.push(`1p deletion with ${mol.includes(MG_22Q) ? '22q deletion' : 'an NF2 variant'}`);
  }

  const grade = g3.length ? 3 : g2.length ? 2 : 1;
  const tested = mol.some((m) => /^TERT promoter|^CDKN2A\/B/.test(m));
  return {
    grade,
    grade3: g3,
    grade2: g2,
    // Brain invasion standing alone, with nothing else atypical and no grade 3 marker looked for.
    biob: !g3.length && g2.length === 1 && v.mgBrain === 'Present' && !tested,
    // Two soft criteria, or a mitotic count of three, is the grade 1 / grade 2 border.
    borderline: grade === 1 && !tested && (soft.length === 2 || mit === 3),
    tested,
  };
}

/** Subtypes WHO names in their own right; they lead the diagnosis and take the grade the criteria give. */
const MENINGIOMA_NAMED_SUBTYPE = ['Chordoid', 'Clear cell', 'Papillary', 'Rhabdoid'];

/**
 * The meningioma as named in Layer 1, without its grade.
 *
 * A subtype WHO names in its own right leads the line - "Clear cell meningioma" - because calling
 * that an atypical meningioma of clear cell type reads as two diagnoses. Atypical and anaplastic are
 * grade designations rather than subtypes, so they replace the head word and are never repeated as a
 * type. Everything else is a grade 1 morphological variant and is named after the noun.
 */
export function meningiomaName(v) {
  const sub = v.mgSubtype || '';
  const g = meningiomaGrade(v);
  if (MENINGIOMA_NAMED_SUBTYPE.includes(sub)) return `${uc1(lc1(sub))} meningioma`;
  if (g === 3) return 'Anaplastic meningioma';
  if (g === 2) return 'Atypical meningioma';
  return sub && !(sub in MENINGIOMA_GRADE_NAME) ? `Meningioma, ${lc1(sub)} type` : 'Meningioma';
}

/** The meningioma grade as a bare number, for the diagnosis line and the synoptic row. */
export const meningiomaGrade = (v) => meningiomaGrading(v).grade;

/**
 * Prompts around the meningioma grade. The grade itself comes off the criteria; these say which
 * criterion carried it, and which recorded result cannot carry a grade however suggestive it looks.
 */
export function meningiomaChecks(v, warn, info) {
  const g = meningiomaGrading(v);
  const mol = arr(v.mgMolecular);
  const soft = arr(v.mgAtypical);
  const sub = v.mgSubtype || '';

  if (g.grade3.length) info(`CNS WHO grade 3 on ${list(g.grade3)}.`, 'finding');
  else if (g.grade2.length) info(`CNS WHO grade 2 on ${list(g.grade2)}.`, 'finding');

  // TERT and CDKN2A/B homozygous deletion are independent grade 3 criteria: they carry the grade
  // whatever the morphology shows.  https://academic.oup.com/neuro-oncology/article/27/2/319/7745776
  if (mol.includes('TERT promoter mutation detected') || mol.includes('CDKN2A/B homozygous deletion detected')) {
    info('A grade 3 molecular criterion is recorded; it carries CNS WHO grade 3 independently of the morphology.', 'mgMolecular');
  }
  // Update 8 withdrew the automatic grade 3 for these two morphologies.
  if (sub === 'Papillary' || sub === 'Rhabdoid') {
    info(`${sub} morphology no longer grades on its own; the grade shown comes off the mitotic count, the atypical features, brain invasion and the molecular result.`, 'mgSubtype');
  }
  if (sub === 'Clear cell' && !mol.includes('SMARCE1 alteration detected')
    && !arr(v.mgIhc).includes('SMARCE1 loss of nuclear expression')) {
    info('Clear cell meningioma is CNS WHO grade 2 on the morphology; SMARCE1 loss or the corresponding methylation class supports it.', 'mgSubtype');
  }
  // Atypical and anaplastic are grade names. Choosing one without a supporting criterion asks the
  // report to print a grade the findings do not carry.
  if (sub in MENINGIOMA_GRADE_NAME && g.grade < MENINGIOMA_GRADE_NAME[sub]) {
    warn(`Subtype recorded as ${lc1(sub)} but the findings support CNS WHO grade ${g.grade}: ${lc1(sub)} meningioma is the grade ${MENINGIOMA_GRADE_NAME[sub]} designation, so record the criterion that supports it or change the subtype.`, 'mgSubtype');
  }
  // cIMPACT-NOW update 8 asks that a brain-invasive but otherwise benign meningioma not be graded
  // until molecular data are in. The printed grade follows CNS5, where brain invasion alone is
  // sufficient for grade 2, and this warns instead of withholding the grade.
  if (g.biob) {
    warn('Brain invasion is the only atypical finding. It carries CNS WHO grade 2 under WHO CNS5, but cIMPACT-NOW update 8 asks that such a tumour not be graded before TERT promoter and CDKN2A/B testing; send both.', 'mgBrain');
  }
  if (v.mgBrain === 'Present') {
    info('Brain invasion recorded. It is read as tumour nests within brain parenchyma without intervening leptomeninges on a section carrying adjacent brain; a smooth pushing interface and entrapped perivascular tumour are not brain invasion.', 'mgBrain');
  }
  if (num(v.mgMitoses) === null) {
    info('Record the mitotic count per 1.6 mm² (10 high-power fields); it carries the meningioma grade. The full area must be examined, not extrapolated from a smaller one.', 'mgMitoses');
  }
  if (g.borderline) {
    info(`${soft.length === 2 ? 'Two atypical features' : 'Three mitoses per 1.6 mm²'}: this sits on the grade 1 / grade 2 border, where TERT promoter, CDKN2A/B and the 1p / 22q / NF2 results settle the grade.`, soft.length === 2 ? 'mgAtypical' : 'mgMitoses');
  }
  if (g.grade >= 2 && !g.tested) {
    info('TERT promoter and CDKN2A/B testing is recommended at CNS WHO grade 2 and 3; either result would raise the grade to 3.', 'mgMolecular');
  }
  // Results that look like grading criteria and are not.
  if (mol.includes('CDKN2A/B hemizygous deletion detected')) {
    info('Hemizygous CDKN2A/B deletion does not grade; only homozygous deletion carries CNS WHO grade 3.', 'mgMolecular');
  }
  if (arr(v.mgIhc).includes('H3 K27me3 loss of nuclear expression')) {
    info('H3 K27me3 loss is prognostic and does not inform the CNS WHO grade.', 'mgIhc');
  }
  if (v.mgBrain === 'No adjacent brain in the specimen' && g.grade === 1) {
    info('No adjacent brain in the specimen: the grade rests on the tissue examined and brain invasion cannot be assessed.', 'mgBrain');
  }
  if (soft.includes('Spontaneous necrosis')) {
    info('Necrosis counts towards atypia only when spontaneous; necrosis following embolisation, radiation or previous surgery does not.', 'mgAtypical');
  }
}


const SELECTED_GRADE = {
  'CNS WHO grade 1': 1, 'CNS WHO grade 2': 2, 'CNS WHO grade 3': 3, 'CNS WHO grade 4': 4
};

/** The grade that prints: the pathologist's choice when one is made, otherwise the proposal. */
export function grade(v, e = entity(v)) {
  const sel = v.grade || 'From the findings';
  if (SELECTED_GRADE[sel]) return SELECTED_GRADE[sel];
  if (sel === 'From the findings') return proposedGrade(v, e);
  return null;
}

/** Layer 3 as printed in the synoptic row - "4", or the free-choice values of the QMH select. */
export function gradeValue(v, e = entity(v)) {
  const t = gradeText(v, e);
  return t.replace(/^CNS WHO grade /, '');
}

/** Layer 3 in prose - "CNS WHO grade 4" - for the integrated diagnosis and the diagnosis line. */
export function gradeText(v, e = entity(v)) {
  const sel = v.grade || 'From the findings';
  if (sel === 'Pending') return 'Pending';
  if (sel === 'Not applicable') return 'Not applicable';
  if (sel === CBD) return `Cannot be determined${stripDot(v.gradeOther) ? ` (${lc1(stripDot(v.gradeOther))})` : ''}`;
  if (sel === 'Other (specify)') return stripDot(v.gradeOther) || 'Other';
  const g = grade(v, e);
  return g ? `CNS WHO grade ${g}` : '';
}

/** The grade as it reads on the diagnosis line. "Not applicable" simply drops off the line. */
export function gradeClause(v, e = entity(v)) {
  const t = gradeText(v, e);
  if (!t || t === 'Not applicable') return '';
  if (t === 'Pending') return 'CNS WHO grade pending';
  if (/^Cannot be determined/.test(t)) return `CNS WHO grade ${lc1(t)}`;
  return lc1(t);
}

// ---------- house microscopy extras ----------

export function featureClause(v) {
  const feats = arr(v.features).map((f) => FEATURE_PHRASE[f] || lc1(f));
  return feats.length ? `The tumour shows ${list(feats)}.` : '';
}

export function mitoticClause(v) {
  const n = num(v.mitoses);
  if (n === null) return '';
  return n === 0
    ? 'Mitoses are not identified in 10 high-power fields.'
    : `Mitoses number ${n} per 10 high-power fields.`;
}

/**
 * The mismatch repair result as a fragment for the immunohistochemistry sentence. Retained
 * expression is printed because it is a recorded negative that the clinician acts on, the same way
 * the panel's own negatives are printed.
 */
function mmrClause(v) {
  const m = v.mmr;
  if (!m || m === 'Not performed') return '';
  if (m === CBD) {
    const detail = stripDot(v.mmrDetail);
    return detail ? lc1(detail) : '';
  }
  if (m === 'Retained (MMR proficient)') return 'retained nuclear expression of MLH1, PMS2, MSH2 and MSH6';
  // 'Loss of MLH1 and PMS2' -> 'loss of nuclear expression of MLH1 and PMS2'
  return m.replace(/^Loss of /, 'loss of nuclear expression of ');
}

/** Immunohistochemistry, printed inside the microscopy paragraph as the house style requires. */
export function ihcClause(v) {
  const values = arr(v.ihc);
  const extra = stripDot(v.ihcOther);
  // Mismatch repair alone is enough to earn the sentence: it can be the only stain done on a case
  // whose panel was recorded elsewhere.
  const mmrBit = mmrClause(v);
  if (!values.length && !extra && !mmrBit) return '';
  const pos = [];
  const neg = [];
  const other = [];
  for (const entry of values) {
    if (/ positive$/.test(entry)) pos.push(entry.replace(/ positive$/, ''));
    else if (/ negative$/.test(entry)) neg.push(entry.replace(/ negative$/, ''));
    else other.push(entry);
  }
  const clauses = [];
  if (pos.length) clauses.push(`positive for ${list(pos.map(lc1))}`);
  if (neg.length) clauses.push(`negative for ${list(neg.map(lc1))}`);
  let sentence = '';
  if (clauses.length) sentence = `On immunohistochemistry, the tumour cells are ${list(clauses)}`;
  // Mismatch repair rides in the same paragraph as the rest of the immunohistochemistry, which is
  // what the house style asks for. Only what the stains show is printed; what a loss pattern might
  // mean for the patient or the family belongs in the checks, not in the morphology.
  const tailBits = [...other.map((o) => lc1(o)), ...(extra ? [lc1(extra)] : []), ...(mmrBit ? [mmrBit] : [])];
  if (tailBits.length) {
    const tail = list(tailBits);
    sentence = sentence ? `${sentence}, with ${tail}` : `On immunohistochemistry, there is ${tail}`;
  }
  return `${sentence}.`;
}

export function ki67Clause(v) {
  const n = num(v.ki67);
  return n === null ? '' : `The Ki-67 proliferation index is approximately ${n} per cent.`;
}

// ---------- treatment effect ----------

export function treatmentClause(v) {
  const te = v.treatmentEffect || 'No known presurgical therapy';
  const detail = stripDot(v.treatmentDetail);
  if (te === 'Present') {
    const pct = num(v.necroticPct);
    return `There is evidence of treatment effect${pct !== null ? `, with necrotic tumour occupying approximately ${pct} per cent of the lesion` : ''}${detail ? ` (${lc1(detail)})` : ''}.`;
  }
  if (te === 'Not identified') return 'No treatment effect is identified.';
  return '';
}

/** Treatment effect as the synoptic row prints it. */
export function treatmentValue(v) {
  const te = v.treatmentEffect || 'No known presurgical therapy';
  const detail = stripDot(v.treatmentDetail);
  if (te === 'No known presurgical therapy') return 'No known presurgical therapy';
  if (te === 'Present') {
    const pct = num(v.necroticPct);
    return `Present${pct !== null ? `; necrotic tumour ${pct}%` : ''}${detail ? ` (${detail})` : ''}`;
  }
  if (te === CBD) return `Cannot be determined${detail ? ` (${detail})` : ''}`;
  return te;
}

// ---------- Layer 4: molecular information ----------

const PLAIN = (s) => (s && s !== NP ? s : '');

/** A "(specify)" option printed with its free-text detail in place of the bracket. */
const spec = (value, detail, base) => (/\(specify\)$/.test(value || '')
  ? `${base}${stripDot(detail) ? ` (${stripDot(detail)})` : ''}`
  : value);

/**
 * Every Layer 4 item that was actually performed, each with its synoptic label, printed value and
 * the prose form used inside the microscopy paragraph. The branch follows the QMH page: the
 * IDH-mutant panel and the IDH-wildtype panel are different lists.
 */
export function molecularBits(v) {
  const out = [];
  const add = (label, value, prose) => { if (PLAIN(value)) out.push({ label, value, prose }); };

  add('IDH1 R132H (immunohistochemistry)', v.idh1R132H,
    v.idh1R132H === 'Positive' ? 'IDH1 R132H is expressed' : v.idh1R132H === 'Negative' ? 'IDH1 R132H is not expressed' : 'IDH1 R132H immunohistochemistry cannot be interpreted');
  if (PLAIN(v.idhSeq)) {
    const val = spec(v.idhSeq, v.idhSeqDetail, 'Mutation detected');
    add('IDH1 / IDH2 sequencing', val,
      /^Mutation detected/.test(val) ? `an IDH mutation is detected${stripDot(v.idhSeqDetail) ? ` (${stripDot(v.idhSeqDetail)})` : ''}` : v.idhSeq === 'No mutation detected' ? 'IDH1 and IDH2 are wild-type' : 'IDH sequencing cannot be interpreted');
  }
  if (v.idhBranch === 'IDH-mutant') {
    add('ATRX (immunohistochemistry)', v.atrx,
      v.atrx === 'Loss of nuclear expression' ? 'there is loss of nuclear ATRX expression' : v.atrx === 'Intact nuclear expression' ? 'nuclear ATRX expression is intact' : 'ATRX immunohistochemistry cannot be interpreted');
    add('p53 (immunohistochemistry)', v.p53,
      v.p53 === 'Normal (wild-type pattern)' ? 'p53 shows a wild-type pattern' : v.p53 && v.p53 !== NP && v.p53 !== CBD ? `p53 shows an abnormal pattern (${lc1(String(v.p53).replace(/^Abnormal[, ]*/, '').replace(/^\(|\)$/g, '') || 'mutated')})` : 'p53 immunohistochemistry cannot be interpreted');
    if (PLAIN(v.codel)) {
      const val = spec(v.codel, v.codelDetail, v.codel === 'Polysomy (specify)' ? 'Polysomy' : 'Other');
      add('1p/19q (FISH)', val,
        v.codel === '1p/19q codeletion detected' ? 'there is codeletion of 1p and 19q'
          : v.codel === 'No deletion detected' ? '1p and 19q are retained'
            : `1p/19q testing shows ${lc1(val)}`);
    }
    add('CDKN2A / CDKN2B', v.cdkn2a,
      v.cdkn2a === 'Homozygous deletion detected' ? 'there is homozygous deletion of CDKN2A/B'
        : v.cdkn2a === 'No homozygous deletion detected' ? 'there is no homozygous deletion of CDKN2A/B'
          : v.cdkn2a === 'Hemizygous loss detected' ? 'there is hemizygous loss of CDKN2A/B' : 'CDKN2A/B copy number cannot be interpreted');
    add('PDGFRA amplification', v.pdgfra,
      v.pdgfra === 'Amplified' ? 'PDGFRA is amplified' : v.pdgfra === 'Not amplified' ? 'PDGFRA is not amplified' : 'PDGFRA copy number cannot be interpreted');
    const higher = grade3Molecular(v);
    if (higher.length) out.push({ label: 'Other higher-grade alterations', value: higher.join('; '), prose: `there is ${list(higher.map(higherPhrase))}` });
  }
  // H3 K27me3 runs for every case, not only branch B: loss of nuclear expression is the essential
  // criterion for a posterior fossa group A ependymoma, and a spinal ependymoma is stained to
  // exclude a drop metastasis from one. Neither case sets idhBranch.
  add('H3 trimethylated K27 (immunohistochemistry)', v.h3k27me3,
    v.h3k27me3 === 'Loss of nuclear expression' ? 'there is loss of nuclear H3 K27 trimethylation' : v.h3k27me3 === 'Retained nuclear expression' ? 'nuclear H3 K27 trimethylation is retained' : 'H3 K27 trimethylation cannot be interpreted');
  if (v.idhBranch === 'IDH-wildtype') {
    add('H3 G34W (immunohistochemistry)', v.h3g34w,
      v.h3g34w === 'Positive' ? 'H3 G34W is expressed' : v.h3g34w === 'Negative' ? 'H3 G34W is not expressed' : 'H3 G34W immunohistochemistry cannot be interpreted');
    if (PLAIN(v.h3seq)) {
      const val = spec(v.h3seq, v.h3seqDetail, 'Other mutation');
      add('H3 mutation (sequencing)', val,
        v.h3seq === 'H3 K27M detected' ? 'an H3 K27M mutation is detected'
          : v.h3seq === 'H3 G34R/V detected' ? 'an H3 G34R/V mutation is detected'
            : v.h3seq === 'No mutation detected' ? 'no H3 mutation is detected' : `H3 sequencing shows ${lc1(val)}`);
    }
  }
  // The MAPK block sits between the H3 items and the copy-number items so the wildtype order is
  // unchanged, but it runs for every case: a BRAF alteration is the diagnostic test in the
  // circumscribed astrocytic gliomas, not a branch B afterthought.
  add('BRAF V600E', v.braf,
    v.braf === 'Detected' ? 'a BRAF V600E mutation is detected' : v.braf === 'Not detected' ? 'no BRAF V600E mutation is detected' : 'BRAF testing cannot be interpreted');
  if (PLAIN(v.brafFusion)) {
    const val = spec(v.brafFusion, v.brafFusionDetail, 'Other BRAF fusion');
    add('BRAF fusion', val,
      v.brafFusion === 'KIAA1549::BRAF fusion detected' ? 'a KIAA1549::BRAF fusion is detected'
        : v.brafFusion === 'No fusion detected' ? 'no BRAF fusion is detected'
          : v.brafFusion === CBD ? 'BRAF fusion testing cannot be interpreted' : `there is ${lc1(val)}`);
  }
  if (stripDot(v.mapkOther)) {
    add('Other MAPK pathway alteration', stripDot(v.mapkOther), `${lc1(stripDot(v.mapkOther))} is detected`);
  }
  if (v.idhBranch === 'IDH-wildtype') {
    add('Chromosome 7 / 10 (FISH)', v.chr710,
      v.chr710 === 'Combined gain of chromosome 7 and loss of chromosome 10' ? 'there is combined gain of chromosome 7 and loss of chromosome 10'
        : v.chr710 === 'No change detected' ? 'chromosomes 7 and 10 show no copy-number change'
          : v.chr710 === CBD ? 'chromosome 7 and 10 copy number cannot be interpreted' : `there is ${lc1(String(v.chr710))}`);
    add('EGFR amplification', v.egfr,
      v.egfr === 'Amplified' ? 'EGFR is amplified' : v.egfr === 'Not amplified' ? 'EGFR is not amplified' : 'EGFR copy number cannot be interpreted');
  }
  if (PLAIN(v.tert)) {
    const val = spec(v.tert, v.tertDetail, 'Mutation detected');
    add('TERT promoter', val,
      /^Mutation detected/.test(val) ? `a TERT promoter mutation is detected${stripDot(v.tertDetail) ? ` (${stripDot(v.tertDetail)})` : ''}`
        : v.tert === 'No mutation detected' ? 'the TERT promoter is wild-type' : 'TERT promoter testing cannot be interpreted');
  }
  add('EZHIP (immunohistochemistry)', v.ezhip,
    v.ezhip === 'Overexpressed (strong diffuse nuclear staining)' ? 'EZHIP is overexpressed, with strong diffuse nuclear staining'
      : v.ezhip === 'Negative' ? 'EZHIP is not expressed' : 'EZHIP immunohistochemistry cannot be interpreted');
  out.push(...ependymalBits(v));
  const others = stripDot(v.molOthers);
  if (others) out.push({ label: 'Other molecular studies', value: others, prose: lc1(others) });
  out.push(...methylationBits(v));
  return out;
}

/**
 * The compartment-specific ependymal molecular items. Which of these is the right test is settled
 * by anatomical compartment, not the other way round: ZFTA and YAP1 supratentorially, H3 K27me3 /
 * EZHIP / methylation in the posterior fossa, MYCN in the spine (cIMPACT-NOW update 7,
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC8018155/). The surrogate immunostains stand in for the
 * molecular test where that test is unavailable (AOSNP-ADAPTR,
 * https://onlinelibrary.wiley.com/doi/full/10.1111/bpa.70114). Only what was seen is printed; the
 * survival associations of 1q gain and 6q loss stay in the checks panel.
 */
export function ependymalBits(v) {
  const out = [];
  const add = (label, value, prose) => { if (PLAIN(value)) out.push({ label, value, prose }); };
  if (PLAIN(v.zfta)) {
    const val = spec(v.zfta, v.zftaDetail, 'ZFTA fusion detected, other partner');
    add('ZFTA fusion', val,
      v.zfta === 'ZFTA::RELA fusion detected' ? 'a ZFTA::RELA fusion is detected'
        : v.zfta === 'No fusion detected' ? 'no ZFTA fusion is detected'
          : v.zfta === CBD ? 'ZFTA fusion testing cannot be interpreted'
            : `a ZFTA fusion is detected${stripDot(v.zftaDetail) ? ` (${stripDot(v.zftaDetail)})` : ''}`);
  }
  if (PLAIN(v.yap1)) {
    const val = spec(v.yap1, v.yap1Detail, 'YAP1 fusion detected, other partner');
    add('YAP1 fusion', val,
      v.yap1 === 'YAP1::MAMLD1 fusion detected' ? 'a YAP1::MAMLD1 fusion is detected'
        : v.yap1 === 'No fusion detected' ? 'no YAP1 fusion is detected'
          : v.yap1 === CBD ? 'YAP1 fusion testing cannot be interpreted'
            : `a YAP1 fusion is detected${stripDot(v.yap1Detail) ? ` (${stripDot(v.yap1Detail)})` : ''}`);
  }
  add('MYCN amplification', v.mycn,
    v.mycn === 'Amplified' ? 'MYCN is amplified' : v.mycn === 'Not amplified' ? 'MYCN is not amplified' : 'MYCN copy number cannot be interpreted');
  const ihc = arr(v.epIhc).filter(Boolean);
  if (ihc.length) {
    out.push({ label: 'Ependymal surrogate immunohistochemistry', value: ihc.join('; '), prose: list(ihc.map(epIhcPhrase)) });
  }
  const cnv = arr(v.epCnv).filter(Boolean);
  if (cnv.length) {
    out.push({ label: 'Copy number (ependymal)', value: cnv.join('; '), prose: list(cnv.map(epCnvPhrase)) });
  }
  return out;
}

/** Released-report wording for one ependymal surrogate immunostain. */
function epIhcPhrase(x) {
  const map = {
    'L1CAM positive (strong diffuse)': 'L1CAM shows strong diffuse staining',
    'L1CAM negative': 'L1CAM is not expressed',
    'p65 nuclear expression': 'p65 shows nuclear expression',
    'p65 negative': 'p65 is not expressed',
    'MYCN positive': 'MYCN is expressed',
    'MYCN negative': 'MYCN is not expressed',
    'HOXB13 positive': 'HOXB13 is expressed',
    'HOXB13 negative': 'HOXB13 is not expressed',
  };
  return map[x] || lc1(String(x));
}

/** Released-report wording for one ependymal copy-number finding. */
function epCnvPhrase(x) {
  const map = {
    'Gain of 1q': 'there is gain of 1q',
    'Loss of 6q': 'there is loss of 6q',
    'Loss of chromosome 6': 'there is loss of chromosome 6',
    'Loss of 22q': 'there is loss of 22q',
    'Homozygous deletion of CDKN2A/B': 'there is homozygous deletion of CDKN2A/B',
    'Stable genome': 'the genome is copy-number stable',
    'Chromosomal instability and aneuploidy': 'there is chromosomal instability with aneuploidy',
  };
  return map[x] || lc1(String(x));
}

/**
 * DNA methylation profiling in the layered form: the classifier and its version, the family and
 * class matched, the calibrated score against the laboratory threshold, and the quality control.
 */
export function methylationBits(v) {
  if (v.methylation === 'Sent, result pending') {
    return [{ label: 'DNA methylation profiling', value: 'Requested, result pending', prose: 'DNA methylation profiling has been requested and the result is pending' }];
  }
  if (v.methylation !== 'Reported') return [];
  const out = [];
  const classifier = stripDot(v.methClassifier);
  const family = stripDot(v.methFamily);
  const cls = stripDot(v.methClass);
  const score = num(v.methScore);
  const threshold = num(v.methThreshold);
  const qcDetail = stripDot(v.methQcDetail);
  const scoreText = score === null ? '' : `${score}${threshold === null ? '' : ` (laboratory threshold ${threshold})`}`;
  if (classifier) out.push({ label: 'Classifier', value: classifier, prose: '' });
  if (family) out.push({ label: 'Methylation class family', value: family, prose: '' });
  if (cls) out.push({ label: 'Methylation class', value: cls, prose: '' });
  if (scoreText) out.push({ label: 'Calibrated score', value: scoreText, prose: '' });
  if (v.methQc) {
    out.push({ label: 'Quality control', value: `${String(v.methQc).replace(/ \(specify\)$/, '')}${qcDetail ? ` (${qcDetail})` : ''}`, prose: '' });
  }
  const named = cls || family;
  if (named) {
    out[0].prose = `DNA methylation profiling${classifier ? ` (${classifier})` : ''} matches ${named}${scoreText ? `, calibrated score ${scoreText}` : ''}`;
  } else if (out.length) {
    out[0].prose = `DNA methylation profiling${classifier ? ` (${classifier})` : ''} has been performed${scoreText ? `, calibrated score ${scoreText}` : ''}`;
  }
  return out;
}

/**
 * The pathway prompts the two CNS templates share: the cIMPACT-NOW criteria that bear on a case
 * once the findings are in. Every one of them is a panel warning. None of them is printed, and none
 * overwrites a chosen grade - cIMPACT-NOW is explicitly not official WHO, so the printed register
 * stays WHO CNS5 and the guidance stays beside the form.
 *
 * Knowledge grounding, comments only (never printed):
 *   Update 12 (2026), IDH-mutant glioma grading - grade 3 at 3 or more mitoses per 2.4 mm2 (10
 *     fields of 0.24 mm2) or a higher-risk alteration, with microvascular proliferation, necrosis,
 *     CDKN2A/B homozygous deletion and PDGFRA amplification absent; grade 4 adds PDGFRA
 *     amplification to CDKN2A/B homozygous deletion; CDKN2A/B hemizygous loss is not a criterion;
 *     oligodendroglioma grading unchanged, CDKN2A/B homozygous deletion there prompting
 *     reconsideration of grade 2 rather than a grade of its own; Ki-67 not a grading criterion
 *     https://academic.oup.com/neuro-oncology/advance-article/doi/10.1093/neuonc/noag108/8687120
 *   Update 11 (2025), IDH- and H3-wildtype diffuse high-grade gliomas and posterior fossa
 *     ependymal tumours - a TERT promoter mutation is not a solitary defining factor in a
 *     histologically low-grade tumour; EGFR amplification and +7/-10 are not solitary defining
 *     factors under 40; a midline diffuse astrocytic glioma gets H3 K27 assessment at any age;
 *     retained K27me3 without EZHIP overexpression and without methylation is NOS; mismatch-repair
 *     testing under 18 and in an 18-40 adult not meeting the glioblastoma criteria
 *     https://onlinelibrary.wiley.com/doi/10.1111/bpa.70035
 *   Update 9 (2025), methylation profiling reported in a layered form with the classifier, family,
 *     class, calibrated score, threshold and quality control
 *     https://academic.oup.com/noa/article/7/1/vdae228/7942502
 *   Update 8 (2025), meningioma - 1p deletion with 22q deletion and/or an NF2 variant on grade 1
 *     morphology proposed as grade 2   https://pubmed.ncbi.nlm.nih.gov/39212325/
 *   Full reading, with the gap list this was built from: docs/specs/cns-cimpact-pathways.md
 *
 * @param {object} v the part's values
 * @param {(message: string, field?: string) => void} warn panel warning sink
 * @param {(level: string, message: string, field?: string) => void} at panel note sink
 */
export function pathwayChecks(v, warn, at, e = entity(v)) {
  const age = num(v.patientAge);
  const feats = arr(v.features);
  const mit = num(v.mitoses);
  const high = feats.some((x) => HIGH_GRADE_FEATURES.includes(x));
  const reported = v.molStatus === 'Reported';
  const noMethylation = v.methylation !== 'Reported';

  if (e === ASTRO && reported) {
    if (v.cdkn2a === 'Hemizygous loss detected') {
      at('info', 'Hemizygous loss of CDKN2A/B is recorded. Hemizygous loss is not a grading criterion; only homozygous deletion is.', 'cdkn2a');
    }
    if (grade3Molecular(v).length && (high || grade4Molecular(v).length)) {
      at('info', `A higher-grade alteration is recorded alongside ${list([...high ? ['microvascular proliferation or necrosis'] : [], ...grade4Molecular(v)])}, which carries the higher grade.`, 'molHigher');
    }
    if (mit !== null && mit > 0 && mit < ASTRO_MITOTIC_THRESHOLD && !high && !grade4Molecular(v).length && !grade3Molecular(v).length) {
      at('info', `Mitoses number ${mit} per 10 high-power fields, below the threshold of ${ASTRO_MITOTIC_THRESHOLD} per 2.4 mm2 that separates grade 3 from grade 2. Count in the most mitotically active area.`, 'mitoses');
    }
    if (mit === null && !high) at('info', 'No mitotic count is recorded; the count separates grade 2 from grade 3.', 'mitoses');
    if (v.pdgfra === NP && (mit !== null && mit >= ASTRO_MITOTIC_THRESHOLD)) {
      at('info', 'PDGFRA amplification is not recorded. It carries grade 4 on its own in an IDH-mutant astrocytoma.', 'pdgfra');
    }
  }

  if (e === OLIGO && v.cdkn2a === 'Homozygous deletion detected' && proposedGrade(v, e) === 2) {
    warn('Homozygous deletion of CDKN2A/B is recorded in an oligodendroglioma. It has not been reported in a grade 2 tumour; reconsider the grade 2 designation. It is not by itself a criterion for grade 3 or grade 4.', 'cdkn2a');
  }

  // Every check below belongs to the IDH-wildtype diffuse glioma branch: the glioblastoma molecular
  // routes, the paediatric differential and the mismatch-repair prompt. An ependymal tumour is not
  // on that branch at all - it is classified on site and the molecular group of that compartment -
  // so the branch field it is carrying must not let these fire on it.
  // A circumscribed astrocytic glioma is not on that branch either: it is defined by a MAPK pathway
  // alteration and IDH is run on it only to clear an adult diffuse astrocytoma out of the
  // differential (ICCR CNS molecular information 2nd ed,
  // https://www.iccr-cancer.org/wp-content/uploads/2026/03/ICCR-CNS-Molecular-information-2nd-ed-v2.1-bookmark-1.pdf).
  const circumscribed = /^Circumscribed astrocytic/i.test(`${v.dxFamily || ''}`)
    || /pilocytic|pilomyxoid|xanthoastrocytoma|piloid features|astroblastoma|subependymal giant cell|chordoid glioma/i.test(e);
  const diffuseGlioma = /glioma|astrocytoma|oligodendroglioma|glioblastoma/i.test(e)
    && !circumscribed
    && !/ependymoma|ependymal/i.test(`${e} ${v.dxFamily || ''}`);

  // The MAPK criterion. An alteration is essential for pilocytic astrocytoma and, with CDKN2A/B,
  // for pleomorphic xanthoastrocytoma, so molecular results recorded without one are worth a note.
  if (circumscribed && reported) {
    const mapk = fusionFound(v.brafFusion)
      || v.braf === 'Detected' || `${v.mapkOther || ''}`.trim() !== '';
    if (!mapk) {
      at('info', 'No MAPK pathway alteration is recorded. It is an essential criterion in this family: KIAA1549::BRAF is the commonest, then BRAF p.V600E, then NF1, FGFR1 and NTRK1/2/3.', 'brafFusion');
    }
    if (/xanthoastrocytoma|piloid features/i.test(e) && v.cdkn2a === NP) {
      at('info', 'CDKN2A/B copy number is not recorded. It is read together with the MAPK alteration in this entity.', 'cdkn2a');
    }
  }

  if (reported && v.idhBranch === 'IDH-wildtype' && diffuseGlioma) {
    const tertOnly = /^Mutation detected/.test(v.tert || '') && !high
      && v.egfr !== 'Amplified' && v.chr710 !== 'Combined gain of chromosome 7 and loss of chromosome 10';
    if (tertOnly) {
      warn('A TERT promoter mutation is the only feature recorded in a histologically low-grade IDH-wildtype diffuse astrocytic tumour. It should not carry a diagnosis of glioblastoma on its own.', 'tert');
    }
    const soleCopyNumber = !high && !/^Mutation detected/.test(v.tert || '')
      && (v.egfr === 'Amplified') !== (v.chr710 === 'Combined gain of chromosome 7 and loss of chromosome 10')
      && (v.egfr === 'Amplified' || v.chr710 === 'Combined gain of chromosome 7 and loss of chromosome 10');
    if (soleCopyNumber && age !== null && age < 40) {
      warn(`${v.egfr === 'Amplified' ? 'EGFR amplification' : 'Combined +7/-10'} is the only molecular feature recorded in a patient of ${age}. It should not define glioblastoma on its own under 40; add TERT promoter status, exclude BRAF, or profile by methylation.`, v.egfr === 'Amplified' ? 'egfr' : 'chr710');
    }
    if (age !== null && age < 40 && e === GBM) {
      at('info', 'Under 40, hold open diffuse paediatric-type high-grade glioma H3-wildtype and IDH-wildtype, diffuse hemispheric glioma H3 G34-mutant, pleomorphic xanthoastrocytoma and FGFR3::TACC3 fusion-positive glioma.', 'dxAdult');
    }
    // Only prompted while the panel is genuinely outstanding. Once a result is recorded, either way,
    // the prompt has been answered and repeating it is noise.
    const mmrOutstanding = !v.mmr || v.mmr === 'Not performed';
    if (age !== null && age < 18 && mmrOutstanding) {
      at('info', 'Under 18, consider mismatch-repair immunohistochemistry on an H3-wildtype high-grade glioma.', 'mmr');
    } else if (age !== null && age >= 18 && age <= 40 && e !== GBM && /glioma|astrocytoma/i.test(e) && mmrOutstanding) {
      at('info', 'Between 18 and 40, consider mismatch-repair immunohistochemistry where an H3- and IDH-wildtype high-grade glioma does not meet the glioblastoma criteria.', 'mmr');
    }
  }

  // Loss of a mismatch repair protein carries consequences beyond this tumour, for the patient and
  // for the family, so it is raised wherever it is recorded rather than only inside branch B2.
  // Update 11 asks for molecular analysis to pinpoint the underlying defect.
  // https://onlinelibrary.wiley.com/doi/10.1111/bpa.70035
  if (/^Loss of /.test(v.mmr || '')) {
    warn(`Mismatch repair immunohistochemistry shows ${v.mmr.replace(/^Loss of /, 'loss of ')}. Molecular analysis to pinpoint the underlying defect is advised, and the finding carries implications for the patient and the family.`, 'mmr');
  }

  if (reported && /midline/i.test(v.site || '') && /glioma|astrocytoma/i.test(e) && v.h3k27me3 === NP && v.h3seq === NP) {
    warn('A midline diffuse astrocytic glioma is recorded with no H3 K27 assessment. H3 K27 status should be assessed at any age in a midline tumour.', 'h3k27me3');
  }
  if (v.h3k27me3 === 'Loss of nuclear expression' && v.h3seq === NP && e !== DMG) {
    at('info', 'Loss of H3 K27 trimethylation does not by itself establish an H3 K27M mutation; confirm by H3 K27M immunohistochemistry or sequencing.', 'h3seq');
  }

  // ----- the ependymal family, compartment first -----
  // The compartment settles which molecular test is the right one, so every check below is gated on
  // it rather than on the entity name alone (cIMPACT-NOW update 7,
  // https://pmc.ncbi.nlm.nih.gov/articles/PMC8018155/; AOSNP-ADAPTR,
  // https://onlinelibrary.wiley.com/doi/full/10.1111/bpa.70114).
  if (/ependymoma/i.test(e)) {
    const siteCompartment = compartmentOf(v.site);
    const namedCompartment = compartmentOf(e);
    const compartment = siteCompartment || namedCompartment;
    const zftaFusion = fusionFound(v.zfta);
    const epIhc = arr(v.epIhc);
    const tested = (x) => !!x && x !== NP && x !== CBD;

    if (siteCompartment && namedCompartment && siteCompartment !== namedCompartment) {
      warn(`The diagnosis names a ${namedCompartment.toLowerCase()} tumour but the site is recorded as ${v.site}. The compartment decides which molecular test applies, so the two should agree.`, 'site');
    }

    if (compartment === 'Supratentorial' && isEpendymoma(e)) {
      if (reported && v.zfta === NP && v.yap1 === NP && !epIhc.length) {
        at('info', 'A supratentorial ependymoma is classified on ZFTA and, where no ZFTA fusion is found, YAP1. Where fusion testing is out of reach, L1CAM and p65 immunohistochemistry stand in.', 'zfta');
      }
      if (reported && tested(v.zfta) && tested(v.yap1) && !zftaFusion && !fusionFound(v.yap1) && !/NEC|NOS/i.test(v.dxQualifier || '')) {
        at('info', 'Fusion testing is recorded with neither a ZFTA nor a YAP1 fusion detected. A supratentorial ependymoma tested and not placed in a molecular type is reported NEC.', 'dxQualifier');
      }
    }

    if (compartment === 'Posterior fossa') {
      if (isEpendymoma(e) && v.h3k27me3 === 'Retained nuclear expression' && v.ezhip !== 'Overexpressed (strong diffuse nuclear staining)' && noMethylation) {
        warn('A posterior fossa ependymoma with retained H3 K27 trimethylation and no EZHIP overexpression cannot be assigned to group A or group B without methylation profiling; it is reported as posterior fossa ependymoma, NOS.', 'methylation');
      }
      if (v.h3k27me3 === CBD && v.ezhip === NP && noMethylation) {
        at('info', 'Where H3 K27me3 staining is ambiguous and methylation profiling is unavailable, EZHIP immunohistochemistry supports group A.', 'ezhip');
      }
      if (/group PFB/i.test(e) && noMethylation) {
        warn('Group PFB is recorded with no methylation result. Methylation profiling is the essential criterion for group PFB; retained H3 K27 trimethylation alone does not establish it.', 'methylation');
      }
      if (/group PFA/i.test(e) && v.h3k27me3 === 'Retained nuclear expression' && noMethylation) {
        warn('Group PFA is recorded with retained H3 K27 trimethylation and no methylation result. Loss of trimethylation, EZHIP overexpression or a methylation class is needed to support the group.', 'h3k27me3');
      }
      if (zftaFusion) {
        at('info', 'A ZFTA fusion is recorded in a posterior fossa tumour. The WHO CNS5 entity is supratentorial, so such a case is reported as posterior fossa ependymoma, ZFTA fusion-positive, NEC.', 'zfta');
      }
    }

    if (compartment === 'Spinal') {
      if (isEpendymoma(e) && (high || (mit !== null && mit >= 5)) && v.mycn === NP && !epIhc.some((x) => /^MYCN/.test(x))) {
        at('info', 'High-grade histology is recorded in a spinal ependymoma with no MYCN result. MYCN immunohistochemistry, confirmed by FISH, identifies spinal ependymoma, MYCN-amplified.', 'mycn');
      }
      if (v.mycn === 'Amplified' && /grade/i.test(v.grade || '')) {
        at('info', 'No CNS WHO grade is assigned to spinal ependymoma, MYCN-amplified.', 'grade');
      }
      if (v.h3k27me3 === 'Loss of nuclear expression' && isEpendymoma(e)) {
        at('info', 'H3 K27 trimethylation is lost in a spinal ependymal tumour. Correlate with the imaging to exclude a drop metastasis from a posterior fossa group A ependymoma, and consider diffuse midline glioma, H3 K27-altered.', 'h3k27me3');
      }
    }

    if (/^Myxopapillary/.test(e) && !/conus|filum|cauda equina/i.test(v.site || '')
      && !epIhc.some((x) => /^HOXB13/.test(x))) {
      at('info', 'Myxopapillary ependymoma is recorded away from the conus, filum terminale or cauda equina with no HOXB13 result. HOXB13 separates it from a spinal ependymoma where the morphology overlaps.', 'epIhc');
    }
  }

  if (v.methylation === 'Reported') {
    const score = num(v.methScore);
    const threshold = num(v.methThreshold);
    if (score !== null && threshold !== null && score < threshold) {
      at('info', `The calibrated score of ${score} is below the laboratory threshold of ${threshold}. A subthreshold match may still contribute where the other findings support the class, but it cannot carry the class on its own.`, 'methScore');
    }
    if (/^Failed/.test(v.methQc || '')) warn('Methylation quality control failed; the classifier output should not be read as a match.', 'methQc');
  }

  // Gated on the diffuse gliomas: the age prompts exist for the IDH-wildtype rules, and raising one
  // on a meningioma, whose branch never reaches IDH at all, is noise on the foot.
  if (age === null && diffuseGlioma && (e === GBM || (reported && v.idhBranch === 'IDH-wildtype'))) {
    at('info', 'No patient age is recorded; the age-dependent prompts for an IDH-wildtype glioma stay silent without it.', 'patientAge');
  }
  if (age !== null && age > 55 && reported && v.idh1R132H === 'Negative' && v.idhSeq === NP && e === GBM) {
    at('info', `At ${age}, with classic histology and no pre-existing lower-grade glioma, IDH1 R132H immunonegativity is taken as sufficient for IDH-wildtype; sequencing is not required.`, 'idhSeq');
  }
  if (age !== null && age < 55 && reported && v.idh1R132H === 'Negative' && v.idhSeq === NP && e === GBM) {
    warn(`IDH1 R132H is negative and no IDH1/IDH2 sequencing is recorded in a patient of ${age}. Sequencing is required under 55 before glioblastoma, IDH-wildtype.`, 'idhSeq');
  }
  if (reported && v.idhBranch === 'IDH-mutant' && v.idh1R132H === 'Negative' && v.idhSeq === NP) {
    warn('An IDH-mutant tumour is recorded with negative IDH1 R132H immunohistochemistry and no sequencing. A non-canonical IDH1 or an IDH2 mutation is not detected by R132H immunohistochemistry.', 'idhSeq');
  }
}

/** The molecular results in prose, for the microscopy paragraph. */
export function molecularClause(v) {
  if (v.molStatus === 'Sent, result pending') return 'Molecular studies have been requested and the results are pending.';
  if (v.molStatus !== 'Reported') return '';
  const bits = molecularBits(v).map((b) => b.prose).filter(Boolean);
  return bits.length ? `On molecular testing, ${list(bits)}.` : '';
}

/** The Layer 4 rows as the synoptic prints them, including the two non-reported states. */
export function molecularItems(v) {
  if (v.molStatus === 'Sent, result pending') return [{ label: 'Molecular studies', value: 'Requested, result pending' }];
  if (v.molStatus === 'Not performed') return [{ label: 'Molecular studies', value: 'Not performed' }];
  return molecularBits(v).map((b) => ({ label: b.label, value: b.value }));
}
