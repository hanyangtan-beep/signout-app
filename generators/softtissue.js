import { stripDot } from './_house.js';
// Soft tissue (benign lesion: lipoma and friends) generator. Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Right thigh lipoma, excision"
//   macro      "(A) Received in formalin is a lobulated piece of yellow fatty tissue labelled right thigh lipoma,
//               measuring 6 x 4 x 2.5 cm and weighing 30 g. The cut surface is homogeneous and yellow.
//               Representative sections in 3 blocks."
//   blockKey   "(A) (1-3) Lesion with capsule, representative sections."
//   microscopy "(A) Sections show partially encapsulated fibroadipose tissue composed of lobules of mature
//               adipocytes separated by thin fibrous septa. Fat necrosis is seen in areas. No atypical stromal
//               cells or lipoblasts are observed. The findings are in keeping with lipoma. The lesion is
//               completely excised. There is no evidence of malignancy."
//   diagnosis  "(A) SOFT TISSUE, right thigh lipoma, excision - LIPOMA; completely excised"
// Atypical lipomatous tumour / sarcoma (or atypical cells present) give a short diagnosis line only; the schema
// snippets `soft_tissue_sarcoma_template` / `soft_tissue_atypical_cells` (field rules) add the comment pointing to
// MDM2 testing and the QMH sarcoma template. The `largeDeepAdipocytic` flag (benign adipocytic lesion > 10 cm or
// a deep site) pre-ticks the `soft_tissue_mdm2_large_deep` comment.
// Wording is protected by tests/softtissue.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
/** Normalise "–" / "-" variants of an option so either spelling matches. */
const norm = (s) => String(s || '').replace(/\s*[–—-]\s*/g, ' - ').trim();

export const ADIPOCYTIC = ['Lipoma', 'Angiolipoma', 'Fibrolipoma', 'Spindle cell lipoma', 'Hibernoma'];
export const isAdipocytic = (v) => ADIPOCYTIC.includes(v.diagnosis);
export const isALT = (v) => /^Atypical lipomatous tumour/.test(v.diagnosis || '');
export const isSarcoma = (v) => /^Sarcoma/.test(v.diagnosis || '');
export const isMalignantOrAtypical = (v) => isALT(v) || isSarcoma(v) || /^Present/.test(v.atypicalCells || '');
export const marginsComplete = (v) => v.margins === 'Complete';
export const marginsIncomplete = (v) => /^Incomplete/.test(v.margins || '');

/** "right thigh lipoma" from the site and clinical label; '' when both blank. */
export function lesionPhrase(v) {
  return [stripDot(v.site), stripDot(v.clinicalLabel)].filter(Boolean).join(' ').trim();
}

export function specimenName(part) {
  const v = part.values;
  const typed = (v.specimenName || '').trim();
  if (typed) return typed;
  const lesion = lesionPhrase(v);
  const proc = lc1(v.procedure || 'Excision');
  if (!lesion) return `Soft tissue, ${proc}`;
  return `${lesion.charAt(0).toUpperCase()}${lesion.slice(1)}, ${proc}`;
}

// ---------- macroscopic description ----------

/** "6x4x2.5" -> "6 x 4 x 2.5 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

/** Largest dimension in cm from the free-text size ("6 x 4 x 2.5" -> 6; "45 mm" -> 4.5); null when blank. */
export function largestDimensionCm(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  const max = Math.max(...nums);
  return /mm/i.test(s) && !/cm/i.test(s) ? max / 10 : max;
}

const DESCRIPTION = {
  'Lobulated yellow fatty tissue with a thin capsule': 'a lobulated piece of yellow fatty tissue',
  'Well-circumscribed firm tan-white nodule': 'a well-circumscribed firm tan-white nodule',
  'Cystic with gelatinous contents': 'a cystic lesion containing gelatinous material',
  'Ill-defined fibrofatty tissue': 'an ill-defined piece of fibrofatty tissue'
};

const CUT_SURFACE = {
  'Homogeneous yellow': 'The cut surface is homogeneous and yellow.',
  'Whorled tan-white': 'The cut surface is whorled and tan-white.',
  Myxoid: 'The cut surface is glistening and myxoid.',
  Haemorrhagic: 'The cut surface is haemorrhagic.'
};

const CAPSULE = {
  'Partially encapsulated': 'The lesion is partially encapsulated.',
  'Not identified': 'No capsule is identified.'
};

function cutSurfaceSentence(v) {
  if (norm(v.cutSurface) === 'Necrotic areas - describe') {
    const d = stripDot(v.cutSurfaceOther);
    return d ? `The cut surface is ${lc1(d)}.` : 'The cut surface shows areas of necrosis.';
  }
  return CUT_SURFACE[v.cutSurface] || (v.cutSurface ? `The cut surface is ${lc1(stripDot(v.cutSurface))}.` : '');
}

const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 3));

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = [];
  const what = DESCRIPTION[v.description] || 'a piece of soft tissue';
  const lesion = lesionPhrase(v);
  const size = sizePhrase(v.dimensions);
  const w = num(v.weight);
  const measure = [size ? `measuring ${size}` : '', w !== null ? `weighing ${fmt(w)} g` : ''].filter(Boolean).join(' and ');
  let first = `Received in formalin is ${what}`;
  if (lesion) first += ` labelled ${lesion}`;
  if (measure) first += `${lesion ? ',' : ''} ${measure}`;
  s.push(`${first}.`);
  s.push(cutSurfaceSentence(v));
  if (CAPSULE[v.capsule]) s.push(CAPSULE[v.capsule]);
  const blocks = blockCount(v);
  s.push(`Representative sections in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  return `(${part.label}) ${s.filter(Boolean).join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const blocks = blockCount(part.values);
  const range = blocks === 1 ? '(1)' : `(1-${blocks})`;
  return `(${part.label}) ${range} Lesion with capsule, representative sections.`;
}

// ---------- microscopy ----------

const ENCAPSULATION = {
  'Partially encapsulated': 'partially encapsulated',
  'Well circumscribed and encapsulated': 'well-circumscribed, encapsulated',
  'Unencapsulated, ill-defined': 'ill-defined, unencapsulated'
};
const enc = (v) => ENCAPSULATION[v.encapsulation] || 'partially encapsulated';

/**
 * Opening sentences per diagnosis. `atypia: true` means the paragraph already carries its own negative
 * atypia / mitoses sentence, so the generic "No atypical stromal cells or lipoblasts" line is not added.
 */
const MICRO = {
  Lipoma: (v) => [`Sections show ${enc(v)} fibroadipose tissue composed of lobules of mature adipocytes separated by thin fibrous septa.`],
  // Verbatim house paragraph (docs/case-mix-analysis.md §4.10); the style layer britishises "tumor".
  Angiolipoma: () => [
    'Sections show a well-circumscribed benign adipocytic neoplasm composed predominantly of mature adipocytes admixed with numerous small thin walled capillary-sized vessels, with focal peripheral accentuation.',
    'Intraluminal fibrin thrombi are present.',
    'No significant cytologic atypia, lipoblasts, tumor necrosis, or increased mitotic activity are identified.'
  ],
  Fibrolipoma: (v) => [`Sections show ${enc(v)} adipocytic tissue composed of lobules of mature adipocytes traversed by broad bands of mature fibrous connective tissue.`],
  'Spindle cell lipoma': () => ['Sections show a well-circumscribed lesion composed of mature adipocytes admixed with bland spindle cells, ropey collagen bundles and a myxoid stroma containing scattered mast cells.'],
  Hibernoma: () => ['Sections show a lobulated adipocytic tumour composed of polygonal brown fat cells with abundant granular to multivacuolated eosinophilic cytoplasm and small central nuclei, admixed with mature adipocytes.'],
  Schwannoma: () => [
    'Sections show a well-circumscribed, encapsulated spindle cell tumour composed of compact hypercellular Antoni A areas with nuclear palisading forming Verocay bodies, alternating with loose hypocellular Antoni B areas.',
    'Thick-walled hyalinised vessels are present.',
    'There is no significant cytological atypia, necrosis or increased mitotic activity.'
  ],
  Neurofibroma: () => [
    'Sections show an unencapsulated, ill-defined spindle cell lesion composed of bland wavy spindle cells with buckled nuclei set in a loose collagenous and myxoid stroma containing shredded-carrot collagen bundles and scattered mast cells.',
    'There is no cytological atypia, necrosis or increased mitotic activity.'
  ],
  'Ganglion cyst': () => [
    'Sections show a cystic lesion with a fibrous wall lacking an epithelial or synovial lining, containing myxoid material.',
    'There is no cytological atypia.'
  ],
  'Nodular fasciitis': () => [
    'Sections show a poorly circumscribed cellular proliferation of plump, uniform myofibroblastic spindle cells arranged in short irregular fascicles with a tissue-culture-like appearance, set in a loose myxoid stroma with extravasated red blood cells and scattered lymphocytes.',
    'Mitotic figures are present but no atypical forms are seen.',
    'There is no cytological atypia or necrosis.'
  ],
  'Cavernous haemangioma': () => [
    'Sections show a lesion composed of dilated, thin-walled, blood-filled vascular channels lined by a single layer of bland flattened endothelial cells and separated by fibrous septa.',
    'There is no endothelial atypia or increased mitotic activity.'
  ],
  Leiomyoma: () => [
    'Sections show a well-circumscribed tumour composed of intersecting fascicles of bland smooth muscle cells with elongated, blunt-ended nuclei and eosinophilic cytoplasm.',
    'There is no cytological atypia, necrosis or increased mitotic activity.'
  ],
  'Intramuscular myxoma': () => [
    'Sections show a hypocellular lesion composed of bland spindle to stellate cells set in abundant myxoid stroma with sparse vasculature, infiltrating between skeletal muscle fibres at the periphery.',
    'There is no cytological atypia, necrosis or mitotic activity.'
  ],
  Fibroma: () => [
    'Sections show a well-circumscribed paucicellular lesion composed of bland spindle cells set in dense hyalinised collagenous stroma.',
    'There is no cytological atypia, necrosis or mitotic activity.'
  ],
  'Epidermal cyst': () => [
    'Sections show a cyst lined by stratified squamous epithelium with a granular layer and containing lamellated keratin.',
    'There is no cytological atypia.'
  ]
};
const HAS_OWN_ATYPIA_SENTENCE = new Set(['Angiolipoma', 'Schwannoma', 'Neurofibroma', 'Ganglion cyst', 'Nodular fasciitis', 'Cavernous haemangioma', 'Leiomyoma', 'Intramuscular myxoma', 'Fibroma', 'Epidermal cyst']);

const CONCLUSION = {
  Lipoma: 'lipoma',
  Angiolipoma: 'angiolipoma',
  Fibrolipoma: 'fibrolipoma',
  'Spindle cell lipoma': 'spindle cell lipoma',
  Hibernoma: 'hibernoma',
  Schwannoma: 'schwannoma',
  Neurofibroma: 'neurofibroma',
  'Ganglion cyst': 'a ganglion cyst',
  'Nodular fasciitis': 'nodular fasciitis',
  'Cavernous haemangioma': 'cavernous haemangioma',
  Leiomyoma: 'leiomyoma',
  'Intramuscular myxoma': 'intramuscular myxoma',
  Fibroma: 'fibroma',
  'Epidermal cyst': 'an epidermal cyst'
};

function ihcSentence(v) {
  const t = stripDot(v.ihc);
  if (!t) return '';
  if (/^immunohistochem/i.test(t)) return `${t}.`;
  return `Immunohistochemistry: ${t}.`;
}

function marginSentence(v) {
  if (marginsComplete(v)) return 'The lesion is completely excised.';
  if (marginsIncomplete(v)) return 'The lesion reaches the inked margin.';
  return '';
}

export function microscopy(part) {
  const v = part.values;
  const s = [];
  const dx = v.diagnosis || 'Lipoma';

  if (isALT(v)) {
    s.push('Sections show an adipocytic tumour composed of mature adipocytes with variation in cell size and scattered enlarged, hyperchromatic atypical stromal cells within thickened fibrous septa.');
    if (v.fatNecrosis === 'Present') s.push('Fat necrosis is seen in areas.');
    s.push('The features raise the possibility of an atypical lipomatous tumour; see comment.');
  } else if (isSarcoma(v)) {
    s.push('Sections show a malignant mesenchymal tumour composed of atypical spindle and pleomorphic cells with brisk mitotic activity and areas of necrosis; see comment.');
  } else {
    s.push(...(MICRO[dx] || MICRO.Lipoma)(v));
    if (v.fatNecrosis === 'Present') s.push('Fat necrosis is seen in areas.');
    if (/^Present/.test(v.atypicalCells || '')) {
      s.push('Scattered atypical stromal cells / lipoblasts are present; see comment.');
    } else if (!HAS_OWN_ATYPIA_SENTENCE.has(dx)) {
      s.push('No atypical stromal cells or lipoblasts are observed.');
    }
    if (v.mitosesSentence === true && !HAS_OWN_ATYPIA_SENTENCE.has(dx)) s.push('No increased mitotic activity or necrosis is seen.');
    if (dx === 'Schwannoma' && !/S-?100/i.test(v.ihc || '')) s.push('The tumour cells are diffusely and strongly positive for S100.');
    s.push(`The findings are in keeping with ${CONCLUSION[dx] || lc1(dx)}.`);
  }

  const ihc = ihcSentence(v);
  if (ihc) s.push(ihc);
  const m = marginSentence(v);
  if (m) s.push(m);
  if (!isMalignantOrAtypical(v)) s.push('There is no evidence of malignancy.');

  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const MAIN = {
  Lipoma: 'LIPOMA',
  Angiolipoma: 'ANGIOLIPOMA',
  Fibrolipoma: 'FIBROLIPOMA',
  'Spindle cell lipoma': 'SPINDLE CELL LIPOMA',
  Hibernoma: 'HIBERNOMA',
  Schwannoma: 'SCHWANNOMA',
  Neurofibroma: 'NEUROFIBROMA',
  'Ganglion cyst': 'GANGLION CYST',
  'Nodular fasciitis': 'NODULAR FASCIITIS',
  'Cavernous haemangioma': 'CAVERNOUS HAEMANGIOMA',
  Leiomyoma: 'LEIOMYOMA',
  'Intramuscular myxoma': 'INTRAMUSCULAR MYXOMA',
  Fibroma: 'FIBROMA',
  'Epidermal cyst': 'EPIDERMAL CYST'
};

export function diagnosis(part) {
  const v = part.values;
  const clauses = [];
  if (isALT(v)) clauses.push('ATYPICAL LIPOMATOUS TUMOUR');
  else if (isSarcoma(v)) clauses.push('SARCOMA');
  else clauses.push(MAIN[v.diagnosis] || String(v.diagnosis || 'LIPOMA').toUpperCase());
  if (!isALT(v) && !isSarcoma(v) && /^Present/.test(v.atypicalCells || '')) clauses.push('atypical stromal cells present');
  if (marginsComplete(v)) clauses.push('completely excised');
  else if (marginsIncomplete(v)) clauses.push('lesion reaches the inked margin');
  if (isMalignantOrAtypical(v)) clauses.push('see comment');
  const organ = (v.organ || 'SOFT TISSUE').toUpperCase();
  const lesion = lesionPhrase(v);
  const proc = lc1(v.procedure || 'Excision');
  const head = [organ, lesion, proc].filter(Boolean).join(', ');
  return `(${part.label}) ${head} - ${clauses.join('; ')}`;
}

// ---------- case-level flags for the auto comments ----------

const DEEP_SITE = /\b(deep|intramuscular|intra-muscular|subfascial|retroperiton\w*|mediastin\w*|intra-abdominal|intraabdominal|paraspinal|pelvi[sc])\b/i;

/** `largeDeepAdipocytic`: benign adipocytic lesion > 10 cm or at a deep site (case-level; drives the MDM2 comment). */
export function flags(parts) {
  const vals = parts.map((p) => p.values);
  const out = [];
  const largeDeep = vals.some((v) => {
    if (!isAdipocytic(v) || isMalignantOrAtypical(v)) return false;
    const d = largestDimensionCm(v.dimensions);
    return (d !== null && d > 10) || DEEP_SITE.test(`${v.site || ''} ${v.clinicalLabel || ''}`);
  });
  if (largeDeep) out.push('largeDeepAdipocytic');
  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, flags };
