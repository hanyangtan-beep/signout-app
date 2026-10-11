// Brain and CNS biopsy generator (roadmap "Brain and CNS — biopsy + smear", Now; built 2026-09-19).
//
// Small-specimen module for the local neurosurgical work: stereotactic cores, open biopsies,
// debulkings and the squash/smear preparation. Diagnosis lines follow the layered integrated
// format — a WHO CNS5 diagnosis with the CNS WHO grade in the first layer, then the histological
// appearance and the molecular parameters underneath. Grading is WHO CNS5; there is no AJCC
// staging module for CNS tumours.
//
// Knowledge grounding, comments only (never printed):
//   WHO CNS5 summary — IDH-mutant astrocytoma graded 2/3/4, CDKN2A/B homozygous deletion makes
//     grade 4 without microvascular proliferation or necrosis; an IDH-wildtype adult diffuse
//     astrocytic glioma is a glioblastoma with any of TERT promoter mutation, EGFR amplification,
//     or combined +7/-10   https://pmc.ncbi.nlm.nih.gov/articles/PMC8328017/
//   Layered reporting (integrated diagnosis + CNS WHO grade, histological appearance, molecular
//     parameters)   https://www.iccr-cancer.org/wp-content/uploads/2026/03/ICCR-CNS-Integrated-diagnosis-2nd-ed-v2.1-bookmark-1.pdf
//   Meningioma grading — grade 2 at 4-19 mitoses per 10 HPF (1.6 mm²), three of five atypical
//     features (high cellularity, small cell change, prominent nucleoli, sheeting, spontaneous
//     necrosis), brain invasion, or chordoid / clear cell morphology; grade 3 at 20 or more
//     mitoses, anaplastic cytology, papillary or rhabdoid morphology, TERT promoter mutation
//     (C228T / C250T), or CDKN2A/B homozygous deletion
//     https://academic.oup.com/neuro-oncology/article/24/9/1524/6525422
//     https://academic.oup.com/neuro-oncology/article/27/2/319/7745776
//   Solitary fibrous tumour grading - grade 1 below 2.5 mitoses per mm2 (fewer than 5 per 10 HPF),
//     grade 2 at 2.5 per mm2 (5 per 10 HPF) or more, grade 3 at that count with necrosis, counted in
//     the most proliferative area; strong diffuse nuclear STAT6 stands in for NAB2::STAT6
//     https://thejns.org/view/journals/j-neurosurg/140/1/article-p69.xml
//     https://pmc.ncbi.nlm.nih.gov/articles/PMC9427069/
//     https://www.pathologyoutlines.com/topic/cnstumorsft.html
//
// Blocks produced:
//   specimenName / microscopy (smear block, then "Sections show …") / diagnosis / summary / flags
// Wording is protected by tests/cns_biopsy.test.js — change it only deliberately.

import { stripDot } from './_house.js';
// The glioma path shares the four-layer diagnosis core with the resection template, so a
// glioblastoma named on a stereotactic core reads exactly as it does on a craniotomy.
import {
  grade as layerGrade, proposedGrade, gradeText, gradeClause, upperEntity,
  histClassText, featureClause, mitoticClause, ihcClause, molecularClause, molecularBits,
  treatmentClause, NP, pathwayChecks, meningiomaGrade, meningiomaName, meningiomaChecks, siteChecks
} from './cns_layers.js';
import {
  uc1, lc1, num, arr, word, list,
  MENINGIOMA, SFT, ASTRO, OLIGO, GBM, DMG, PILOCYTIC, EPENDYMOMA, PITNET, SCHWANNOMA, METASTASIS, LYMPHOMA,
  ABSCESS, DEMYELINATION, GLIOSIS, FREETEXT,
  MENINGIOMA_SUBTYPE, SFT_MORPHOLOGY, BASE_MORPHOLOGY, METASTASIS_MORPHOLOGY, FEATURE_PHRASE, ATYPICAL_PHRASE, MOLECULAR_PHRASE
} from './cns_morphology.js';

export {
  MENINGIOMA, SFT, ASTRO, OLIGO, GBM, DMG, PILOCYTIC, EPENDYMOMA, PITNET, SCHWANNOMA, METASTASIS, LYMPHOMA,
  ABSCESS, DEMYELINATION, GLIOSIS, FREETEXT
} from './cns_morphology.js';

// ---------- small helpers ----------

// ---------- finding families ----------

const GLIOMAS = [ASTRO, OLIGO, GBM, DMG, PILOCYTIC, EPENDYMOMA];

export const isGlioma = (v) => GLIOMAS.includes(v.finding);
export const isMeningioma = (v) => v.finding === MENINGIOMA;
export const isSft = (v) => v.finding === SFT;
const finding = (v) => v.finding || MENINGIOMA;
const noTissue = (v) => v.adequacy === 'No lesional tissue identified';
const limited = (v) => v.adequacy === 'Scanty lesional tissue' || v.adequacy === 'Crush artefact limits assessment';
const smeared = (v) => v.prep === 'Smear and paraffin sections' || v.prep === 'Smear preparation only';
const smearOnly = (v) => v.prep === 'Smear preparation only';

// ---------- specimen and organ line ----------

// A part built from a pasted request that named no site on the list has none: the lines print what is
// known ("BRAIN, left, stereotactic biopsy") and the Checks panel asks for the site.
const siteWord = (v) => (v.site === 'Other' ? (stripDot(v.siteOther) || 'Brain') : (v.site || ''));
const placeOf = (v) => [(v.side || '').trim(), lc1(siteWord(v))].filter(Boolean).join(' ');

export function specimenName(part) {
  const v = part.values;
  const text = stripDot(v.specimenName);
  if (text) return `${text}, ${v.procedure || 'stereotactic biopsy'}`;
  return ['Brain', placeOf(v), v.procedure || 'stereotactic biopsy'].filter(Boolean).join(', ');
}

export function organPhrase(part) {
  const v = part.values;
  const site = siteWord(v);
  const organ = /spinal/i.test(site) ? 'SPINAL CORD' : /dura|falx|sphenoid|convexity/i.test(site) ? 'DURA' : /sellar/i.test(site) ? 'PITUITARY' : 'BRAIN';
  const detail = organ === 'BRAIN' || organ === 'PITUITARY' ? placeOf(v) : (v.side || '').trim();
  return [organ, detail, (v.procedure || 'stereotactic biopsy').toLowerCase()].filter(Boolean).join(', ');
}

// ---------- the smear block ----------

const SMEAR_TEXT = {
  [MENINGIOMA]: 'cohesive whorled clusters of cells with bland oval nuclei and indistinct cytoplasmic borders in a fibrillary background',
  [ASTRO]: 'a fibrillary glial background traversed by elongated hyperchromatic nuclei with fine cytoplasmic processes',
  [OLIGO]: 'monomorphic cells with rounded nuclei lying against delicate branching capillaries',
  [GBM]: 'a hypercellular fibrillary smear with pleomorphic hyperchromatic nuclei, mitoses, proliferated vessels and necrotic debris',
  [DMG]: 'a cellular fibrillary smear composed of small to medium-sized cells with hyperchromatic angulated nuclei',
  [PILOCYTIC]: 'elongated piloid cells with hair-like processes together with brightly eosinophilic Rosenthal fibres',
  [EPENDYMOMA]: 'cells with monomorphic round nuclei and fibrillary processes radiating on to vessels',
  [PITNET]: 'a discohesive population of monotonous cells with round nuclei and finely granular chromatin',
  [SCHWANNOMA]: 'cohesive clusters of spindle cells with elongated wavy nuclei in a fibrillary matrix',
  // Meningeal SFT smears: cohesive cellular clusters of ovoid to short spindle cells with minimal
  // cytoplasm, scattered single cells, minimal collagenous stroma
  // https://pmc.ncbi.nlm.nih.gov/articles/PMC12485863/
  [SFT]: 'cohesive cellular clusters of ovoid to short spindle cells with scant cytoplasm, with scattered single cells and wisps of collagenous stroma',
  [METASTASIS]: 'cohesive clusters of large epithelioid cells with well-defined cytoplasmic borders against a non-fibrillary background',
  [LYMPHOMA]: 'discohesive large atypical lymphoid cells with scant cytoplasm and prominent nucleoli',
  [ABSCESS]: 'abundant neutrophils, necrotic debris and macrophages',
  [DEMYELINATION]: 'sheets of foamy macrophages in a fibrillary background',
  [GLIOSIS]: 'a fibrillary background with scattered reactive astrocytes'
};

/** The squash/smear preparation gets its own short block ahead of the sections. */
export function smearBlock(part) {
  const v = part.values;
  if (!smeared(v)) return '';
  const n = Math.max(1, Math.round(num(v.smears) ?? 2));
  const made = `${uc1(word(n))} smear preparation${n === 1 ? ' is' : 's are'} made from the tissue.`;
  if (noTissue(v)) return `${made} They show brain parenchyma only.`;
  const text = SMEAR_TEXT[finding(v)] || 'the lesional tissue described below';
  return `${made} ${n === 1 ? 'It shows' : 'They show'} ${text}.`;
}

// ---------- morphology ----------

function morphologySentence(v) {
  if (isMeningioma(v)) {
    return `a meningothelial neoplasm arranged in ${MENINGIOMA_SUBTYPE[v.mgSubtype] || MENINGIOMA_SUBTYPE.Meningothelial}`;
  }
  if (finding(v) === METASTASIS) {
    return `brain parenchyma ${METASTASIS_MORPHOLOGY[v.metType] || METASTASIS_MORPHOLOGY.Adenocarcinoma}`;
  }
  if (isSft(v)) return SFT_MORPHOLOGY[v.sftPattern] || SFT_MORPHOLOGY['Classic (collagenous)'];
  if (finding(v) === FREETEXT) return stripDot(v.findingOther) ? lc1(stripDot(v.findingOther)) : 'the lesional tissue described';
  return BASE_MORPHOLOGY[finding(v)] || 'brain parenchyma with reactive astrocytosis';
}


function mitoticSentence(v) {
  if (isMeningioma(v)) {
    const n = num(v.mgMitoses);
    if (n === null) return '';
    return n === 0
      ? 'Mitoses are not identified in 1.6 mm2 (10 high-power fields).'
      : `Mitoses number ${n} per 1.6 mm2 (10 high-power fields).`;
  }
  return mitoticClause(v);
}

function meningiomaSentences(v) {
  const s = [];
  const feats = arr(v.mgAtypical).map((f) => ATYPICAL_PHRASE[f] || lc1(f));
  if (feats.length) s.push(`The tumour shows ${list(feats)}.`);
  const m = mitoticSentence(v);
  if (m) s.push(m);
  if (v.mgBrain === 'Present') s.push('Tumour infiltrates the adjacent brain parenchyma.');
  else if (v.mgBrain === 'Not identified') s.push('No invasion of the adjacent brain parenchyma is identified.');
  else s.push('No adjacent brain parenchyma is present in the tissue examined.');
  if (v.mgBone === 'Dura involved') s.push('Tumour involves the attached dura.');
  if (v.mgBone === 'Bone involved') s.push('Tumour involves the attached bone.');
  return s;
}

// The solitary fibrous tumour count is per 10 high-power fields, the unit the grade is read in; the
// thresholds stay in the help text and the Checks, never in the printed sentence.
function sftSentences(v) {
  const s = [];
  const n = num(v.sftMitoses);
  if (n !== null) s.push(n === 0 ? 'Mitoses are not identified in 10 high-power fields.' : `Mitoses number ${n} per 10 high-power fields.`);
  if (v.sftNecrosis === 'Present') s.push('There are foci of tumour necrosis.');
  else if (v.sftNecrosis === 'Not identified') s.push('No necrosis is identified.');
  return s;
}

// ---------- immunohistochemistry, printed with the microscopy ----------

const IHC_FIELD = {
  [MENINGIOMA]: 'mgIhc',
  [SFT]: 'sftIhc',
  [PITNET]: 'pitIhc',
  [SCHWANNOMA]: 'swIhc',
  [METASTASIS]: 'metIhc',
  [LYMPHOMA]: 'lyIhc'
};

function ihcValues(v) {
  if (isGlioma(v)) return arr(v.ihc);
  const key = IHC_FIELD[finding(v)];
  return key ? arr(v[key]) : [];
}

/** "On immunohistochemistry, the tumour cells are positive for GFAP and OLIG2, and negative for IDH1 R132H; ATRX is retained." */
function ihcSentence(v) {
  if (isGlioma(v)) return ihcClause(v);
  if (isSft(v)) return sftIhcSentence(v);
  const values = ihcValues(v);
  if (!values.length) return '';
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
  if (clauses.length) sentence = `On immunohistochemistry, the ${finding(v) === LYMPHOMA ? 'atypical cells' : 'tumour cells'} are ${list(clauses)}`;
  // marker names keep their own capitals; "Progesterone receptor" prints lower case in prose
  if (other.length) {
    const tail = list(other.map((o) => lc1(o)));
    sentence = sentence ? `${sentence}, with ${tail}` : `On immunohistochemistry, there is ${tail}`;
  }
  return `${sentence}.`;
}

// Solitary fibrous tumour: the STAT6 result leads, as the soft tissue template prints it, then the
// positive, negative and qualified stains. Only the strong diffuse nuclear pattern is offered as
// positive, since a meningioma can show weak nuclear or cytoplasmic STAT6 but not that pattern
// (https://pmc.ncbi.nlm.nih.gov/articles/PMC10791336/).
const SFT_STAIN = {
  'CD34 positive': ['pos', 'CD34'],
  'CD99 positive': ['pos', 'CD99'],
  'BCL2 positive': ['pos', 'BCL2'],
  'ALDH1 positive': ['pos', 'ALDH1'],
  'GRIA2 positive': ['pos', 'GRIA2'],
  'CD34 patchy and weak': ['with', 'patchy weak staining for CD34'],
  'EMA focally positive': ['with', 'focal staining for EMA'],
  'EMA negative': ['neg', 'EMA'],
  'SSTR2A negative': ['neg', 'SSTR2A'],
  'Progesterone receptor negative': ['neg', 'progesterone receptor'],
  'S100 negative': ['neg', 'S100'],
  'SOX10 negative': ['neg', 'SOX10'],
  'GFAP negative': ['neg', 'GFAP'],
  'CD34 negative': ['neg', 'CD34'],
  'STAT6 negative': ['neg', 'STAT6']
};
const STAT6_STRONG = 'STAT6 strong diffuse nuclear';

function sftIhcSentence(v) {
  const values = arr(v.sftIhc);
  const stat6 = values.includes(STAT6_STRONG);
  const by = { pos: [], neg: [], with: [] };
  for (const entry of values) {
    const [kind, text] = SFT_STAIN[entry] || [];
    if (kind) by[kind].push(text);
  }
  const out = [];
  if (stat6) out.push('On immunohistochemistry, the tumour cells show strong diffuse nuclear STAT6 expression.');
  const clauses = [];
  if (by.pos.length) clauses.push(`positive for ${list(by.pos)}`);
  if (by.neg.length) clauses.push(`negative for ${list(by.neg)}`);
  let rest = clauses.length ? `${stat6 ? 'They are' : 'On immunohistochemistry, the tumour cells are'} ${clauses.join(', and ')}` : '';
  if (by.with.length) {
    rest = rest ? `${rest}, with ${list(by.with)}` : `${stat6 ? 'There is' : 'On immunohistochemistry, there is'} ${list(by.with)}`;
  }
  if (rest) out.push(`${rest}.`);
  return out.join(' ');
}

function ki67Sentence(v) {
  const n = num(v.ki67);
  if (n === null) return '';
  return `The Ki-67 proliferation index is approximately ${n} per cent.`;
}

function stainSentence(v) {
  if (finding(v) === ABSCESS) {
    switch (v.infOrganisms) {
      case 'Gram, ZN and GMS negative': return 'Gram, Ziehl-Neelsen and GMS stains do not highlight any organisms.';
      case 'Bacteria identified on Gram stain': return 'Gram stain highlights bacteria.';
      case 'Fungal elements identified on GMS': return 'GMS stain highlights fungal elements.';
      case 'Acid-fast bacilli identified on Ziehl-Neelsen': return 'Ziehl-Neelsen stain highlights acid-fast bacilli.';
      default: return '';
    }
  }
  if (finding(v) === DEMYELINATION && v.demyIhc && v.demyIhc !== 'Not performed') {
    return 'Luxol fast blue shows loss of myelin with preservation of axons on neurofilament immunohistochemistry.';
  }
  return '';
}

// ---------- molecular ----------

const SFT_FUSION = { Detected: 'NAB2::STAT6 fusion detected', 'Not detected': 'no NAB2::STAT6 fusion detected' };
const molecularResults = (v) => {
  if (isMeningioma(v)) return arr(v.mgMolecular);
  if (isSft(v) && SFT_FUSION[v.sftFusion]) return [SFT_FUSION[v.sftFusion]];
  return [];
};

function molecularSentence(v) {
  if (isGlioma(v)) return molecularClause(v);
  if (isSft(v)) {
    if (v.sftFusion === 'Detected') return 'On molecular testing, a NAB2::STAT6 fusion is detected.';
    if (v.sftFusion === 'Not detected') return 'On molecular testing, no NAB2::STAT6 fusion is detected.';
    return '';
  }
  const results = molecularResults(v);
  if (results.length) {
    return `On molecular testing, ${list(results.map((r) => MOLECULAR_PHRASE[r] || lc1(r)))}.`;
  }
  return '';
}

// ---------- microscopy ----------

export function microscopy(part) {
  const v = part.values;
  const s = [];
  const smear = smearBlock(part);

  if (noTissue(v)) {
    const lead = `Sections show brain parenchyma with reactive astrocytosis; no lesional tissue is identified in the material examined.`;
    const notes = stripDot(v.additionalNotes);
    return `(${part.label}) ${smear ? `${smear} ` : ''}${lead}${notes ? ` ${notes}.` : ''}`;
  }

  const n = num(v.pieces);
  const pieces = n !== null && n > 0 ? `${word(Math.round(n))} piece${n === 1 ? '' : 's'} of tissue comprising ` : '';
  const opener = smearOnly(v)
    ? `The paraffin sections of the residual tissue show ${pieces}${morphologySentence(v)}.`
    : `Sections show ${pieces}${morphologySentence(v)}.`;
  s.push(opener);

  if (isMeningioma(v)) s.push(...meningiomaSentences(v));
  else if (isSft(v)) s.push(...sftSentences(v));
  else if (isGlioma(v)) {
    const f = featureClause(v);
    if (f) s.push(f);
    const m = mitoticClause(v);
    if (m) s.push(m);
  }
  if (finding(v) === PITNET) s.push('The lesion is well demarcated from the compressed adjacent anterior pituitary.');
  if (finding(v) === LYMPHOMA && v.lySteroid) s.push('There are scattered apoptotic bodies and macrophages within the infiltrate.');

  const ihc = ihcSentence(v);
  if (ihc) s.push(ihc);
  const ki = ki67Sentence(v);
  if (ki) s.push(ki);
  const st = stainSentence(v);
  if (st) s.push(st);
  const te = isGlioma(v) ? treatmentClause(v) : '';
  if (te) s.push(te);
  const mol = molecularSentence(v);
  if (mol) s.push(mol);

  if (limited(v)) {
    s.push(v.adequacy === 'Crush artefact limits assessment'
      ? 'Crush artefact limits the assessment of the tissue.'
      : 'The lesional tissue available is scanty.');
  }
  if ([ABSCESS, DEMYELINATION, GLIOSIS].includes(finding(v))) s.push('There is no evidence of malignancy.');

  const notes = stripDot(v.additionalNotes);
  if (notes) s.push(`${notes}.`);
  return `(${part.label}) ${smear ? `${smear} ` : ''}${s.join(' ')}`;
}

// ---------- grading ----------

// The meningioma criteria live in generators/cns_layers.js so that the biopsy and the resection
// template grade the same tumour identically. They are subtype-independent in WHO CNS5, and
// papillary and rhabdoid morphology no longer grade on their own - this module used to return grade
// 3 for both, which cIMPACT-NOW update 8 withdrew.
export { meningiomaGrade, meningiomaGrading, meningiomaChecks } from './cns_layers.js';

/**
 * WHO CNS5 grade for the glioma families the template covers. The shared core does the work: the
 * chosen grade prints whenever one is made, otherwise the grade the recorded findings support.
 * The `finding` select is the biopsy's Layer 1, so it is passed as the entity.
 */
export function gliomaGrade(v) {
  return layerGrade(v, finding(v));
}

// Solitary fibrous tumour: WHO CNS5 grades on the mitotic count and necrosis alone. Below 5 mitoses
// per 10 high-power fields (2.5 per mm2) is grade 1 whatever the necrosis; 5 or more is grade 2, and
// grade 3 with necrosis. No count, no grade. Sources in the header and the grounding doc.
export function sftFindingsGrade(v) {
  const n = num(v.sftMitoses);
  if (n === null) return null;
  if (n < 5) return 1;
  return v.sftNecrosis === 'Present' ? 3 : 2;
}

const SFT_CBD = 'Cannot be determined';
const sftChosen = (v) => {
  const m = /^CNS WHO grade (\d)$/.exec(v.sftGrade || '');
  return m ? Number(m[1]) : null;
};

/** The grade that prints: the one chosen, otherwise the one the mitotic count and necrosis support. */
export function sftGrade(v) {
  if (v.sftGrade === SFT_CBD) return null;
  return sftChosen(v) ?? sftFindingsGrade(v);
}

export function grade(v) {
  if (isMeningioma(v)) return meningiomaGrade(v);
  if (isSft(v)) return sftGrade(v);
  if (isGlioma(v)) return gliomaGrade(v);
  if (finding(v) === SCHWANNOMA) return 1;
  return null;
}

// ---------- diagnosis ----------

function meningiomaDx(v) {
  // The name and the grade both come from the shared core, so a meningioma reads identically on a
  // stereotactic core and on a craniotomy.
  return `${upperEntity(meningiomaName(v))}, CNS WHO grade ${meningiomaGrade(v)}`;
}

function sftDx(v) {
  if (v.sftGrade === SFT_CBD) return 'SOLITARY FIBROUS TUMOUR, CNS WHO grade cannot be determined';
  const g = sftGrade(v);
  return g ? `SOLITARY FIBROUS TUMOUR, CNS WHO grade ${g}` : 'SOLITARY FIBROUS TUMOUR';
}

function metastasisDx(v) {
  const head = {
    Adenocarcinoma: 'METASTATIC ADENOCARCINOMA',
    'Squamous cell carcinoma': 'METASTATIC SQUAMOUS CELL CARCINOMA',
    'Small cell carcinoma': 'METASTATIC SMALL CELL CARCINOMA',
    Melanoma: 'METASTATIC MELANOMA',
    'Renal cell carcinoma': 'METASTATIC RENAL CELL CARCINOMA',
    'Carcinoma, not further classifiable': 'METASTATIC CARCINOMA'
  }[v.metType] || 'METASTATIC CARCINOMA';
  const p = stripDot(v.metPrimary);
  return p ? `${head}, consistent with a ${lc1(p)} primary` : head;
}

export function diagnosisText(part) {
  const v = part.values;
  if (noTissue(v)) return 'NO LESIONAL TISSUE IDENTIFIED; brain parenchyma with reactive gliosis only';
  switch (finding(v)) {
    case MENINGIOMA: return meningiomaDx(v);
    case SFT: return sftDx(v);
    case ASTRO:
    case OLIGO:
    case GBM:
    case DMG:
    case PILOCYTIC:
    case EPENDYMOMA: {
      // Layer 1 in the house diagnosis-line case, exactly as generators/cns_tumour.js prints it.
      const clause = gradeClause(v, finding(v));
      return `${upperEntity(finding(v))}${clause ? `, ${clause}` : ''}`;
    }
    case PITNET: return 'PITUITARY NEUROENDOCRINE TUMOUR (PitNET)';
    case SCHWANNOMA: return 'SCHWANNOMA, CNS WHO grade 1';
    case METASTASIS: return metastasisDx(v);
    case LYMPHOMA: return arr(v.lyIhc).some((x) => /^CD20 positive|^CD79a positive/.test(x))
      ? 'MALIGNANT LYMPHOMA, large B-cell type'
      : 'MALIGNANT LYMPHOID INFILTRATE (see microscopic description)';
    case ABSCESS: return 'ACUTE INFLAMMATION AND ABSCESS FORMATION';
    case DEMYELINATION: return 'DEMYELINATING LESION';
    case GLIOSIS: return 'REACTIVE GLIOSIS; no tumour identified';
    case FREETEXT: return stripDot(v.findingOther) ? stripDot(v.findingOther).toUpperCase() : 'SEE MICROSCOPIC EXAMINATION';
    default: return 'SEE MICROSCOPIC EXAMINATION';
  }
}

const HISTOLOGY_LAYER = {
  [ASTRO]: 'diffuse astrocytic glioma',
  [OLIGO]: 'diffuse glioma with oligodendroglial morphology',
  [GBM]: 'diffuse astrocytic glioma',
  [DMG]: 'diffuse glioma of the midline',
  [PILOCYTIC]: 'biphasic piloid glioma',
  [EPENDYMOMA]: 'glioma with perivascular pseudorosettes',
  [MENINGIOMA]: 'meningothelial neoplasm'
};

/**
 * The layers printed under the diagnosis line. A glioma prints the shared four-layer set - the
 * histological appearance, Layer 2, immunohistochemistry, Layer 4 and the CNS WHO grade - so that
 * the biopsy and the resection read alike. The other findings keep their own two-line form.
 */
export function layers(part) {
  const v = part.values;
  const out = [];
  if (isSft(v)) {
    // Its own fields only, so values left behind on a hidden meningioma block cannot print here.
    out.push(`- Histological appearance: ${v.sftPattern === 'Cellular' ? 'cellular neoplasm' : 'spindle cell neoplasm'} with staghorn vessels`);
    const stains = arr(v.sftIhc).map((x) => lc1(x));
    if (stains.length) out.push(`- Immunohistochemistry: ${stains.join('; ')}`);
    const mol = molecularResults(v);
    if (mol.length) out.push(`- Molecular parameters: ${mol.join('; ')}`);
    const g = sftGrade(v);
    if (v.sftGrade === SFT_CBD) out.push('- CNS WHO grade: cannot be determined');
    else if (g) out.push(`- CNS WHO grade ${g}`);
    return out;
  }
  const base = HISTOLOGY_LAYER[finding(v)];
  if (!base) return out;
  if (isGlioma(v)) {
    const feats = arr(v.features).map((f) => FEATURE_PHRASE[f] || lc1(f));
    out.push(`- Histological appearance: ${base}${feats.length ? `, showing ${list(feats)}` : ''}`);
    const hist = histClassText(v);
    if (hist) out.push(`- Histopathological classification: ${lc1(hist)}`);
    const ihcBits = [...arr(v.ihc).map((x) => lc1(x)), ...(stripDot(v.ihcOther) ? [lc1(stripDot(v.ihcOther))] : [])];
    if (ihcBits.length) out.push(`- Immunohistochemistry: ${ihcBits.join('; ')}`);
    if (v.molStatus === 'Reported') {
      const bits = molecularBits(v).map((b) => `${b.label} ${lc1(b.value)}`);
      if (bits.length) out.push(`- Molecular parameters: ${bits.join('; ')}`);
    } else if (v.molStatus === 'Sent, result pending') {
      out.push('- Molecular parameters: requested, result pending');
    }
    const t = gradeText(v, finding(v));
    if (t && t !== 'Not applicable') out.push(`- ${/^CNS WHO grade/.test(t) ? t : `CNS WHO grade: ${lc1(t)}`}`);
    return out;
  }
  const feats = arr(v.mgAtypical).map((f) => lc1(ATYPICAL_PHRASE[f] || f));
  out.push(`- Histological appearance: ${base}${feats.length ? `, showing ${list(feats)}` : ''}`);
  const ihcBits = ihcValues(v).map((x) => lc1(x));
  const molBits = molecularResults(v).map((x) => lc1(x));
  if (ihcBits.length) out.push(`- Immunohistochemistry: ${ihcBits.join('; ')}`);
  if (molBits.length) out.push(`- Molecular parameters: ${molBits.join('; ')}`);
  const g = grade(v);
  if (g) out.push(`- CNS WHO grade ${g}`);
  return out;
}

export function diagnosis(part, ctx) {
  const head = `(${part.label}) ${organPhrase(part)} - ${diagnosisText(part)}`;
  const wantLayers = !ctx || !ctx.options || ctx.options.layered !== false;
  if (!wantLayers || noTissue(part.values)) return head;
  const extra = layers(part);
  return extra.length ? `${head}\n${extra.join('\n')}` : head;
}

// ---------- summary and flags ----------

const partList = (parts) => {
  const l = parts.map((p) => `(${p.label})`);
  return l.length === 1 ? l[0] : `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}`;
};

export function summary(parts, ctx) {
  if (parts.length < 2 || (ctx && ctx.options && ctx.options.summary === false)) return '';
  const tumour = parts.filter((p) => ![ABSCESS, DEMYELINATION, GLIOSIS].includes(finding(p.values)) && !noTissue(p.values));
  const rest = parts.filter((p) => !tumour.includes(p));
  const bits = [];
  if (tumour.length) {
    const types = [...new Set(tumour.map((p) => lc1(diagnosisText(p).split(',')[0])))];
    bits.push(`${list(types)} in ${partList(tumour)}`);
  }
  if (rest.length) bits.push(`no tumour identified in ${partList(rest)}`);
  return bits.length ? `SUMMARY: ${bits.join('; ')}.` : '';
}

export function flags(parts) {
  const out = [];
  for (const p of parts) {
    const v = p.values;
    if (isGlioma(v) && (v.molStatus === 'Sent, result pending' || (v.grade || '') === 'Pending')) out.push('molecularPending');
    if ([GBM, DMG].includes(finding(v)) || (finding(v) === ASTRO && gliomaGrade(v) === 4)) out.push('highGradeGlioma');
    if (isMeningioma(v) && arr(v.mgAtypical).length === 2 && !arr(v.mgMolecular).length) out.push('meningiomaBorderline');
    if (finding(v) === LYMPHOMA) out.push('lymphoma');
    if (finding(v) === LYMPHOMA && v.lySteroid) out.push('steroid');
    if (limited(v) || noTissue(v)) out.push('limited');
  }
  return [...new Set(out)];
}

// ---------- checks ----------

export function validate(part) {
  const v = part.values;
  const out = [];
  const info = (message, field) => out.push({ level: 'info', message, field });
  const warn = (message, field) => out.push({ level: 'warn', message, field });

  siteChecks(v, warn);
  if (noTissue(v) && finding(v) !== GLIOSIS) {
    warn('No lesional tissue identified: the diagnosis line reports the absence of lesional tissue, not the selected diagnosis.', 'adequacy');
  }
  if (smearOnly(v) && !noTissue(v)) {
    info('Smear preparation only: the paraffin sentence refers to the residual tissue. Check that paraffin sections were in fact examined.', 'prep');
  }
  if (isMeningioma(v)) meningiomaChecks(v, warn, info);
  if (isSft(v)) sftChecks(v, warn, info);
  if (isGlioma(v)) {
    pathwayChecks(v, warn, (level, message, field) => out.push({ level, message, field }), finding(v));
    // Layer 3 is a free choice: the grade the findings support is proposed and disagreement is
    // flagged, never silently overruled. Mirrors the checks in generators/cns_tumour.js.
    const g = gliomaGrade(v);
    const prop = proposedGrade(v, finding(v));
    if (g && prop && g !== prop) {
      warn(`CNS WHO grade ${g} is recorded but the entity and the recorded findings support grade ${prop}.`, 'grade');
    }
    if (!histClassText(v)) info('Histopathological classification (Layer 2) is not recorded.', 'histClass');
  }
  if (finding(v) === GBM) {
    const feats = arr(v.features);
    const histology = feats.includes('Microvascular proliferation') || feats.some((f) => f.startsWith('Necrosis'));
    const molecular = /^Mutation detected/.test(v.tert || '') || v.egfr === 'Amplified'
      || v.chr710 === 'Combined gain of chromosome 7 and loss of chromosome 10';
    if (!histology && !molecular) {
      warn('Glioblastoma, IDH-wildtype: record microvascular proliferation or necrosis, or a TERT promoter mutation, EGFR amplification or combined +7/-10.', 'features');
    }
    if (v.idh1R132H === 'Positive') warn('IDH1 R132H is positive; this is not compatible with glioblastoma, IDH-wildtype.', 'idh1R132H');
    if (v.molStatus === 'Reported' && v.idhBranch !== 'IDH-wildtype') warn('Glioblastoma, IDH-wildtype is recorded but the molecular branch is not IDH-wildtype.', 'idhBranch');
    if (v.molStatus === 'Reported' && v.tert === NP && v.egfr === NP && v.chr710 === NP) {
      info('No TERT promoter, EGFR or chromosome 7/10 result is recorded for an IDH-wildtype glioblastoma.', 'tert');
    }
  }
  if ((finding(v) === ASTRO || finding(v) === OLIGO) && v.molStatus === 'Reported' && v.idhBranch !== 'IDH-mutant') {
    warn(`${finding(v)} is recorded but the molecular branch is not IDH-mutant.`, 'idhBranch');
  }
  if (finding(v) === OLIGO && v.molStatus === 'Reported' && v.codel !== '1p/19q codeletion detected') {
    warn('Oligodendroglioma requires an IDH mutation with codeletion of 1p and 19q; the codeletion is not recorded.', 'codel');
  }
  if (finding(v) === ASTRO && v.codel === '1p/19q codeletion detected') {
    warn('1p/19q codeletion is recorded with a diagnosis of astrocytoma, IDH-mutant.', 'codel');
  }
  if (finding(v) === DMG && v.h3k27me3 === 'Retained nuclear expression') {
    warn('Diffuse midline glioma, H3 K27-altered is recorded but H3 K27 trimethylation is retained.', 'h3k27me3');
  }
  if (finding(v) === DMG && v.h3k27me3 === NP && v.h3seq !== 'H3 K27M detected') {
    info('Diffuse midline glioma: record H3 K27M sequencing or loss of nuclear H3 K27 trimethylation.', 'h3seq');
  }
  if (finding(v) === ASTRO && gliomaGrade(v) === 4 && v.cdkn2a === 'Homozygous deletion detected') {
    info('CDKN2A/B homozygous deletion sets CNS WHO grade 4 in an IDH-mutant astrocytoma.', 'cdkn2a');
  }
  if (finding(v) === ASTRO && gliomaGrade(v) === 4 && v.pdgfra === 'Amplified') {
    info('PDGFRA amplification carries CNS WHO grade 4 in an IDH-mutant astrocytoma on its own.', 'pdgfra');
  }
  if (isGlioma(v) && v.molStatus === 'Not performed' && /IDH-mutant|IDH-wildtype|codeleted|H3 /.test(finding(v))) {
    info('The diagnosis names a molecular alteration but no molecular studies are recorded.', 'molStatus');
  }
  if (finding(v) === LYMPHOMA && !v.lyFresh) {
    info('No fresh tissue reserved: flow cytometry cannot be added later from the paraffin block.', 'lyFresh');
  }
  if (finding(v) === LYMPHOMA && v.lySteroid) {
    info('Corticosteroid before biopsy: a repeat biopsy may be needed if the infiltrate is depleted.', 'lySteroid');
  }
  if (finding(v) === PITNET && !arr(v.pitIhc).some((x) => /PIT1|TPIT|SF1/.test(x))) {
    info('Record the transcription factor result (PIT1, TPIT or SF1); it determines the PitNET lineage.', 'pitIhc');
  }
  return out;
}

/**
 * Solitary fibrous tumour. The grade is proposed from the count and necrosis and a different choice is
 * flagged, never overruled; the STAT6 and fusion checks ask for the result that confirms the entity.
 * STAT6 is lost in some dedifferentiated tumours (https://thejns.org/view/journals/j-neurosurg/140/1/article-p69.xml).
 */
export function sftChecks(v, warn, info) {
  const stains = arr(v.sftIhc);
  const has = (x) => stains.includes(x);
  const n = num(v.sftMitoses);
  const chosen = sftChosen(v);
  const supported = sftFindingsGrade(v);
  if (n === null && chosen === null && v.sftGrade !== SFT_CBD) {
    info('Solitary fibrous tumour: record the mitotic count per 10 high-power fields. It sets the CNS WHO grade, with necrosis for grade 3.', 'sftMitoses');
  }
  if (chosen !== null && supported !== null && chosen !== supported) {
    warn(`CNS WHO grade ${chosen} is recorded but the mitotic count and necrosis support grade ${supported}.`, 'sftGrade');
  }
  if (n !== null && n < 5 && v.sftNecrosis === 'Present') {
    info(`Necrosis with ${n} mitos${n === 1 ? 'is' : 'es'} per 10 high-power fields stays CNS WHO grade 1: necrosis raises the grade only at 5 or more.`, 'sftNecrosis');
  }
  if (!has(STAT6_STRONG) && !has('STAT6 negative') && v.sftFusion !== 'Detected') {
    info('Solitary fibrous tumour: record the STAT6 immunostain or the NAB2::STAT6 fusion result.', 'sftIhc');
  }
  if (has('STAT6 negative') && v.sftFusion !== 'Detected') {
    warn('STAT6 is negative and no NAB2::STAT6 fusion is recorded: strong nuclear STAT6 is expected in solitary fibrous tumour, and only rare dedifferentiated tumours lose it.', 'sftIhc');
  }
  if (v.sftFusion === 'Not detected' && !has(STAT6_STRONG)) {
    warn('No NAB2::STAT6 fusion is detected and strong nuclear STAT6 is not recorded: nothing on the form confirms solitary fibrous tumour.', 'sftFusion');
  }
  for (const [a, b] of [[STAT6_STRONG, 'STAT6 negative'], ['CD34 positive', 'CD34 negative'], ['CD34 patchy and weak', 'CD34 negative'],
    ['CD34 positive', 'CD34 patchy and weak'], ['EMA negative', 'EMA focally positive']]) {
    if (has(a) && has(b)) warn(`Immunohistochemistry records both ${a} and ${lc1(b)}: keep one.`, 'sftIhc');
  }
}

export default { specimenName, microscopy, diagnosis, summary, flags, validate };
