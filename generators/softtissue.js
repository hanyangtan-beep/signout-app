import { stripDot, checks } from './_house.js';
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
//
// Benign batch 1 (docs/roadmap.md, "Soft tissue — benign template upgrade", pulled 2026-09-24) appends
// options and fields; the 16 original diagnoses print exactly as before with the new fields at their
// defaults. Added: a descriptive "no evidence of malignancy" line, reactive entities, seven benign
// tumours, desmoid-type fibromatosis / solitary fibrous tumour / DFSP, metastatic malignancy and
// lymphoma with the house immunohistochemistry sentence, MDM2 status for adipocytic tumours, and the
// RCPath G105 (V3, May 2023) section 4.4 excision items: histological location, surrounding tissue,
// completeness of excision and distance to the nearest margin. Golden cases: tests/fixtures/soft_tissue_benign/.

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

// The 16 diagnoses the template shipped with. The adipocytic modifiers (fat necrosis, atypical stromal
// cells, the mitoses sentence, encapsulation) belong to these; the schema hides them for the rest and a
// value left behind by an earlier choice is ignored rather than printed.
export const ORIGINAL = ['Lipoma', 'Angiolipoma', 'Fibrolipoma', 'Spindle cell lipoma', 'Hibernoma', 'Schwannoma', 'Neurofibroma',
  'Ganglion cyst', 'Nodular fasciitis', 'Cavernous haemangioma', 'Leiomyoma', 'Intramuscular myxoma', 'Fibroma', 'Epidermal cyst',
  'Atypical lipomatous tumour – see comment', 'Sarcoma – see comment'];
const isOriginal = (v) => ORIGINAL.includes(v.diagnosis || 'Lipoma');
const atypicalPresent = (v) => isOriginal(v) && /^Present/.test(v.atypicalCells || '');
export const isMalignantOrAtypical = (v) => isALT(v) || isSarcoma(v) || atypicalPresent(v);
export const marginsComplete = (v) => v.margins === 'Complete';
export const marginsIncomplete = (v) => /^Incomplete/.test(v.margins || '');

export const DESCRIPTIVE = 'Fibroadipose tissue – no evidence of malignancy';
export const METASTATIC = 'Metastatic malignancy';
export const LYMPHOMA = 'Lymphoma';
export const SFT = 'Solitary fibrous tumour';
export const DESMOID = 'Desmoid-type fibromatosis';
const isDescriptive = (v) => /^Fibroadipose tissue/.test(v.diagnosis || '');
const isMetastatic = (v) => v.diagnosis === METASTATIC;
const isLymphoma = (v) => v.diagnosis === LYMPHOMA;
const isSFT = (v) => v.diagnosis === SFT;
const isDFSP = (v) => /^Dermatofibrosarcoma protuberans/.test(v.diagnosis || '');
// Tumour mimics that print "NO EVIDENCE OF MALIGNANCY" on the diagnosis line, as the house does for fat
// necrosis and scar (2021-2026 biopsy export); no excision statement is made for them or for the
// descriptive line and lymphoma.
export const NEM_IN_DX = ['Fat necrosis', 'Organising haematoma', 'Scar', 'Foreign-body reaction'];
export const NO_MARGIN = [...NEM_IN_DX, DESCRIPTIVE, LYMPHOMA];
const marginsApply = (v) => !NO_MARGIN.includes(v.diagnosis);
// Intermediate and malignant lines close without "There is no evidence of malignancy."
const noNEM = (v) => isMalignantOrAtypical(v) || isMetastatic(v) || isLymphoma(v) || isSFT(v) || isDFSP(v) || v.diagnosis === DESMOID;
/** MDM2 status as recorded; saved cases without the field read as not tested. */
const mdm2 = (v) => ((isAdipocytic(v) || isALT(v)) ? v.mdm2 || 'Not tested' : 'Not tested');

const lcWord = (s) => (/^[A-Z][a-z]/.test(s || '') ? lc1(s) : s || '');

/**
 * "right thigh lipoma" from the site and clinical label; '' when both blank. A site that already names the
 * label ("right thigh lipoma" pasted from the request) is not followed by it again.
 */
export function lesionPhrase(v) {
  // A pasted site opens with a capital ("Right thigh"); the diagnosis line and macro read it in lower case.
  const site = lcWord(stripDot(v.site));
  const label = stripDot(v.clinicalLabel);
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/our\b/gi, 'ou?r');
  const named = label && site && new RegExp(`\\b${esc}s?\\b`, 'i').test(site);
  return [site, named ? '' : label].filter(Boolean).join(' ').trim();
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

function marginPredicate(v) {
  if (!marginsApply(v)) return '';
  if (marginsComplete(v)) {
    const d = num(v.marginDistance);
    return d === null ? 'is completely excised' : `is completely excised, with the nearest margin clear by ${fmt(d)} mm`;
  }
  if (marginsIncomplete(v)) return 'reaches the inked margin';
  return '';
}

const MDM2_SENTENCE = {
  Amplified: 'MDM2 amplification is detected by fluorescence in situ hybridisation (FISH).',
  'Not amplified': 'MDM2 amplification is not detected by fluorescence in situ hybridisation (FISH).'
};

// G105 section 4.4: histological location, completeness of excision with the distance to the nearest
// margin, and the nature of the surrounding tissue. Location and margin share one sentence; with the
// location blank the margin sentence is the original "The lesion is completely excised." /
// "The lesion reaches the inked margin."
const LOCATION = {
  Dermal: 'is centred in the dermis',
  Subcutaneous: 'is located in the subcutaneous tissue',
  Subfascial: 'is located deep to the fascia',
  Intramuscular: 'is located within skeletal muscle'
};
function extentSentences(v) {
  const where = LOCATION[v.location] || '';
  const margin = marginPredicate(v);
  const s = [];
  if (where && margin) s.push(`The lesion ${where} and ${margin}.`);
  else if (where || margin) s.push(`The lesion ${where || margin}.`);
  const around = stripDot(v.surrounding);
  if (around) s.push(`The surrounding tissue comprises ${lc1(around)}.`);
  return s;
}

// Opening paragraphs for the options added 2026-09-24. Each carries its own atypia statement where one
// belongs. Wording is released-report prose; entity definitions follow WHO Classification of Soft
// Tissue and Bone Tumours, 5th ed. (2020).
const MICRO_ADDED = {
  Angioleiomyoma: [
    'Sections show a well-circumscribed tumour composed of bundles of mature smooth muscle cells arranged around numerous thick-walled vessels.',
    'There is no cytological atypia, necrosis or increased mitotic activity.'
  ],
  'Tenosynovial giant cell tumour, localised': [
    'Sections show a well-circumscribed, lobulated tumour composed of mononuclear histiocytoid cells admixed with osteoclast-like multinucleated giant cells, foamy macrophages and haemosiderin-laden macrophages in a collagenous stroma.',
    'There is no significant cytological atypia or necrosis.'
  ],
  'Tenosynovial giant cell tumour, diffuse': [
    'Sections show a poorly circumscribed, infiltrative tumour composed of sheets of mononuclear histiocytoid cells with scattered osteoclast-like multinucleated giant cells, foamy macrophages and haemosiderin-laden macrophages, with cleft-like spaces.',
    'There is no significant cytological atypia or necrosis.'
  ],
  'Glomus tumour': [
    'Sections show a well-circumscribed tumour composed of sheets and nests of uniform round cells with central round nuclei, well-defined cell borders and eosinophilic cytoplasm, arranged around small vessels.',
    'There is no cytological atypia, necrosis or increased mitotic activity.'
  ],
  'Granular cell tumour': [
    'Sections show a poorly circumscribed tumour composed of sheets and nests of polygonal cells with abundant granular eosinophilic cytoplasm and small, bland nuclei.',
    'There is no significant cytological atypia, necrosis or increased mitotic activity.'
  ],
  Elastofibroma: [
    'Sections show a poorly circumscribed, paucicellular lesion composed of dense collagen admixed with mature adipose tissue and numerous enlarged, fragmented and beaded elastic fibres.',
    'There is no cytological atypia.'
  ],
  'Calcifying fibrous tumour': [
    'Sections show a well-circumscribed, paucicellular lesion composed of bland spindle cells in dense hyalinised collagen, with scattered psammomatous and dystrophic calcifications and a patchy lymphoplasmacytic infiltrate.',
    'There is no cytological atypia or mitotic activity.'
  ],
  'Fat necrosis': ['Sections show fibroadipose tissue with fat necrosis, comprising lipid-laden foamy macrophages, lipid cysts and multinucleated giant cells, with surrounding fibrosis.'],
  'Organising haematoma': ['Sections show an organising haematoma composed of blood clot and fibrin with haemosiderin-laden macrophages, and granulation tissue and fibroblasts at the periphery.'],
  Scar: ['Sections show dense fibrous scar tissue composed of hyalinised collagen with scattered small blood vessels.'],
  'Foreign-body reaction': ['Sections show fibrous tissue containing a foreign-body giant cell reaction, with multinucleated giant cells and histiocytes surrounding foreign material.'],
  'Vascular malformation': ['Sections show a lesion composed of irregular, dilated vascular channels of varying calibre with irregularly thickened muscular walls, lined by bland endothelial cells.'],
  Endometriosis: ['Sections show fibroadipose tissue containing endometrial-type glands surrounded by endometrial-type stroma, with haemosiderin-laden macrophages.'],
  'Gouty tophus': ['Sections show amorphous deposits of pale, feathery crystalline material surrounded by histiocytes and multinucleated foreign-body giant cells.'],
  [DESMOID]: [
    'Sections show an infiltrative proliferation of uniform, bland spindle cells arranged in long sweeping fascicles in a collagenous stroma with thin-walled vessels, extending between skeletal muscle fibres and fat at the periphery.',
    'There is no significant cytological atypia.'
  ],
  [SFT]: ['Sections show a well-circumscribed spindle cell tumour composed of bland ovoid to spindle cells arranged haphazardly around branching, thin-walled, staghorn-shaped vessels in a variably collagenous stroma.'],
  'Dermatofibrosarcoma protuberans – see comment': ['Sections show a dermal and subcutaneous spindle cell tumour composed of uniform spindle cells arranged in a storiform pattern, infiltrating the subcutaneous fat in a honeycomb pattern.']
};

const CONCLUSION_ADDED = {
  Angioleiomyoma: 'angioleiomyoma',
  'Tenosynovial giant cell tumour, localised': 'tenosynovial giant cell tumour, localised type',
  'Tenosynovial giant cell tumour, diffuse': 'tenosynovial giant cell tumour, diffuse type',
  'Glomus tumour': 'glomus tumour',
  'Granular cell tumour': 'granular cell tumour',
  Elastofibroma: 'elastofibroma',
  'Calcifying fibrous tumour': 'calcifying fibrous tumour',
  'Fat necrosis': 'fat necrosis',
  'Organising haematoma': 'an organising haematoma',
  Scar: 'scar tissue',
  'Foreign-body reaction': 'a foreign-body giant cell reaction',
  'Vascular malformation': 'a vascular malformation',
  Endometriosis: 'endometriosis',
  'Gouty tophus': 'a gouty tophus',
  [DESMOID]: 'desmoid-type fibromatosis',
  [SFT]: 'solitary fibrous tumour',
  'Dermatofibrosarcoma protuberans – see comment': 'dermatofibrosarcoma protuberans'
};

// The lineage stain each intermediate tumour is diagnosed on, unless the typed IHC already names it.
// ASCII only: the style layer strips non-ASCII, so the printed form is "beta-catenin".
const MARKER = {
  [SFT]: { re: /STAT6/i, text: 'On immunohistochemistry, the tumour cells show diffuse nuclear STAT6 expression.' },
  [DESMOID]: { re: /(beta|\u03b2)[\s-]*catenin/i, text: 'On immunohistochemistry, the tumour cells show nuclear beta-catenin expression.' }
};

// ---- metastatic malignancy and lymphoma ----
// House sentence, 2021-2026 biopsy export: "On immunohistochemistry, the tumour cells are positive for
// CK7, ... They are negative for CK20. The findings are consistent with metastatic adenocarcinoma of lung
// primary." The diagnosis line reads "METASTATIC ADENOCARCINOMA, consistent with LUNG PRIMARY".
const MET_MICRO = {
  Adenocarcinoma: 'Sections show soft tissue infiltrated by adenocarcinoma composed of irregular glands lined by cells with enlarged, pleomorphic, hyperchromatic nuclei, in a desmoplastic stroma.',
  Carcinoma: 'Sections show soft tissue infiltrated by nests and sheets of malignant epithelial cells with enlarged, pleomorphic, hyperchromatic nuclei, in a desmoplastic stroma.',
  'Squamous cell carcinoma': 'Sections show soft tissue infiltrated by nests of malignant squamous cells with eosinophilic cytoplasm, intercellular bridges and focal keratinisation, in a desmoplastic stroma.',
  Melanoma: 'Sections show soft tissue infiltrated by sheets of malignant epithelioid cells with vesicular nuclei and prominent nucleoli.'
};
const metType = (v) => (MET_MICRO[v.metType] ? v.metType : 'Adenocarcinoma');
/** "CK20, CDX2" -> "CK20 and CDX2"; "AE1/AE3" stays whole. */
export const markerList = (raw) => {
  const xs = stripDot(raw).split(/\s*[,;]\s*|\s+and\s+/i).map((x) => x.trim()).filter(Boolean);
  return xs.length <= 1 ? xs[0] || '' : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
};
export function ihcPanel(v, cells) {
  const pos = markerList(v.ihcPositive);
  const neg = markerList(v.ihcNegative);
  if (pos && neg) return [`On immunohistochemistry, the ${cells} are positive for ${pos}.`, `They are negative for ${neg}.`];
  if (pos) return [`On immunohistochemistry, the ${cells} are positive for ${pos}.`];
  if (neg) return [`On immunohistochemistry, the ${cells} are negative for ${neg}.`];
  return [];
}
/** Favoured primary as typed, without a trailing "primary" / "origin"; '' for melanoma. */
const primaryOf = (v) => (metType(v) === 'Melanoma' ? '' : stripDot(v.favouredPrimary).replace(/\s+(primary|origin)$/i, '').trim());

function metastaticSentences(v) {
  const type = metType(v);
  const s = [MET_MICRO[type], ...ihcPanel(v, 'tumour cells')];
  const primary = primaryOf(v);
  s.push(primary
    ? `The findings are consistent with metastatic ${lc1(type)} of ${lc1(primary)} primary.`
    : `The findings are in keeping with metastatic ${lc1(type)}.`);
  return s;
}
function lymphomaSentences(v) {
  const type = stripDot(v.lymphomaType);
  return [
    'Sections show soft tissue diffusely infiltrated by sheets of atypical lymphoid cells.',
    ...ihcPanel(v, 'atypical lymphoid cells'),
    `The findings are in keeping with ${type ? lc1(type) : 'lymphoma'}.`
  ];
}

// ---- solitary fibrous tumour risk ----
// Modified (four-variable) Demicco model, as tabulated in PMC11042756 Table 1 and PMC10796168 Table 1
// (Demicco et al., Mod Pathol 2017;30:1433-42, PubMed 28731041): age < 55 = 0, >= 55 = 1; size < 5 cm = 0,
// 5 to < 10 = 1, 10 to < 15 = 2, >= 15 = 3; mitoses per 10 HPF 0 = 0, 1-3 = 1, >= 4 = 2; necrosis < 10% = 0,
// >= 10% = 1. Total 0-3 low, 4-5 intermediate, 6-7 high risk of metastasis.
export function sftRisk(v) {
  const age = num(v.sftAge);
  const size = num(v.sftSize) ?? largestDimensionCm(v.dimensions);
  const mitoses = num(v.sftMitoses);
  const necrosis = v.sftNecrosis || '';
  const missing = [];
  if (age === null) missing.push(['age', 'sftAge']);
  if (size === null) missing.push(['tumour size', 'sftSize']);
  if (mitoses === null) missing.push(['mitotic count', 'sftMitoses']);
  if (!necrosis) missing.push(['necrosis', 'sftNecrosis']);
  if (missing.length) return { missing };
  const score = (age >= 55 ? 1 : 0)
    + (size >= 15 ? 3 : size >= 10 ? 2 : size >= 5 ? 1 : 0)
    + (mitoses >= 4 ? 2 : mitoses > 0 ? 1 : 0)
    + (necrosis === '10% or more' ? 1 : 0);
  return { score, risk: score >= 6 ? 'high' : score >= 4 ? 'intermediate' : 'low', missing: [] };
}
const SFT_NECROSIS = {
  Absent: 'There is no tumour necrosis.',
  'Less than 10%': 'Tumour necrosis involves less than 10% of the tumour.',
  '10% or more': 'Tumour necrosis involves 10% or more of the tumour.'
};
function sftSentences(v) {
  const s = [];
  const m = num(v.sftMitoses);
  if (m === 0) s.push('No mitotic figures are identified.');
  else if (m !== null) s.push(`The mitotic count is ${fmt(m)} per 10 high-power fields.`);
  if (SFT_NECROSIS[v.sftNecrosis]) s.push(SFT_NECROSIS[v.sftNecrosis]);
  return s;
}

function addedSentences(v) {
  const dx = v.diagnosis;
  if (isMetastatic(v)) return metastaticSentences(v);
  if (isLymphoma(v)) return lymphomaSentences(v);
  if (isDescriptive(v)) return [`Sections show ${lc1(stripDot(v.tissueSeen)) || 'fibroadipose tissue'}.`];
  const s = [...(MICRO_ADDED[dx] || [])];
  if (isSFT(v)) s.push(...sftSentences(v));
  const marker = MARKER[dx];
  if (marker && !marker.re.test(v.ihc || '')) s.push(marker.text);
  if (CONCLUSION_ADDED[dx]) s.push(`The findings are in keeping with ${CONCLUSION_ADDED[dx]}.`);
  return s;
}

export function microscopy(part) {
  const v = part.values;
  const s = [];
  const dx = v.diagnosis || 'Lipoma';

  if (isALT(v)) {
    s.push('Sections show an adipocytic tumour composed of mature adipocytes with variation in cell size and scattered enlarged, hyperchromatic atypical stromal cells within thickened fibrous septa.');
    if (v.fatNecrosis === 'Present') s.push('Fat necrosis is seen in areas.');
    if (MDM2_SENTENCE[mdm2(v)]) s.push(MDM2_SENTENCE[mdm2(v)]);
    s.push(mdm2(v) === 'Amplified'
      ? 'The findings are in keeping with an atypical lipomatous tumour; see comment.'
      : 'The features raise the possibility of an atypical lipomatous tumour; see comment.');
  } else if (!isOriginal(v)) {
    s.push(...addedSentences(v));
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
    if (MDM2_SENTENCE[mdm2(v)]) s.push(MDM2_SENTENCE[mdm2(v)]);
    s.push(`The findings are in keeping with ${CONCLUSION[dx] || lc1(dx)}.`);
  }

  // Metastatic malignancy and lymphoma print their panel from the positive / negative fields instead.
  const ihc = isMetastatic(v) || isLymphoma(v) ? '' : ihcSentence(v);
  if (ihc) s.push(ihc);
  s.push(...extentSentences(v));
  if (!noNEM(v)) s.push('There is no evidence of malignancy.');

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
  'Epidermal cyst': 'EPIDERMAL CYST',
  Angioleiomyoma: 'ANGIOLEIOMYOMA',
  'Tenosynovial giant cell tumour, localised': 'TENOSYNOVIAL GIANT CELL TUMOUR, localised type',
  'Tenosynovial giant cell tumour, diffuse': 'TENOSYNOVIAL GIANT CELL TUMOUR, diffuse type',
  'Glomus tumour': 'GLOMUS TUMOUR',
  'Granular cell tumour': 'GRANULAR CELL TUMOUR',
  Elastofibroma: 'ELASTOFIBROMA',
  'Calcifying fibrous tumour': 'CALCIFYING FIBROUS TUMOUR',
  'Fat necrosis': 'FAT NECROSIS',
  'Organising haematoma': 'ORGANISING HAEMATOMA',
  Scar: 'SCAR TISSUE',
  'Foreign-body reaction': 'FOREIGN BODY GIANT CELL REACTION',
  'Vascular malformation': 'VASCULAR MALFORMATION',
  Endometriosis: 'ENDOMETRIOSIS',
  'Gouty tophus': 'GOUTY TOPHUS',
  [DESCRIPTIVE]: 'NO EVIDENCE OF MALIGNANCY',
  [DESMOID]: 'DESMOID-TYPE FIBROMATOSIS',
  [SFT]: 'SOLITARY FIBROUS TUMOUR',
  'Dermatofibrosarcoma protuberans – see comment': 'DERMATOFIBROSARCOMA PROTUBERANS'
};

function mainLine(v) {
  if (isMetastatic(v)) {
    const primary = primaryOf(v);
    return `METASTATIC ${metType(v).toUpperCase()}${primary ? `, consistent with ${primary.toUpperCase()} PRIMARY` : ''}`;
  }
  if (isLymphoma(v)) return stripDot(v.lymphomaType).toUpperCase() || 'LYMPHOMA';
  return MAIN[v.diagnosis] || String(v.diagnosis || 'LIPOMA').toUpperCase();
}

/** Every line whose comment block carries something about this part closes with "see comment". */
function seeComment(v) {
  // An ALT reported as MDM2 not amplified gets no automatic comment (Checks flags the conflict).
  if (isALT(v)) return mdm2(v) !== 'Not amplified' || atypicalPresent(v);
  if (isMalignantOrAtypical(v) || isDFSP(v)) return true;
  if (isSFT(v)) return sftRisk(v).missing.length === 0;
  return isAdipocytic(v) && mdm2(v) === 'Pending';
}

export function diagnosis(part) {
  const v = part.values;
  const clauses = [];
  if (isALT(v)) clauses.push('ATYPICAL LIPOMATOUS TUMOUR');
  else if (isSarcoma(v)) clauses.push('SARCOMA');
  else clauses.push(mainLine(v));
  if (NEM_IN_DX.includes(v.diagnosis)) clauses.push('NO EVIDENCE OF MALIGNANCY');
  if (!isALT(v) && !isSarcoma(v) && atypicalPresent(v)) clauses.push('atypical stromal cells present');
  if (marginsApply(v) && marginsComplete(v)) clauses.push('completely excised');
  else if (marginsApply(v) && marginsIncomplete(v)) clauses.push('lesion reaches the inked margin');
  if (seeComment(v)) clauses.push('see comment');
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
    // Once MDM2 has been tested (or sent) the "may be considered" comment no longer applies.
    if (!isAdipocytic(v) || isMalignantOrAtypical(v) || mdm2(v) !== 'Not tested') return false;
    const d = largestDimensionCm(v.dimensions);
    return (d !== null && d > 10) || DEEP_SITE.test(`${v.site || ''} ${v.clinicalLabel || ''}`);
  });
  if (largeDeep) out.push('largeDeepAdipocytic');
  return out;
}

// ---------- comment and checks ----------

/** Case-level comment: the solitary fibrous tumour risk category, once all four inputs are recorded. */
export function comment(parts, ctx) {
  const many = (ctx?.case?.parts || parts).length > 1;
  return parts.filter((p) => isSFT(p.values)).map((p) => {
    const r = sftRisk(p.values);
    if (r.missing.length) return '';
    return `Solitary fibrous tumour${many ? ` (part ${p.label})` : ''}, modified Demicco risk model (age, tumour size, mitotic count and necrosis): score ${r.score} of 7, ${r.risk} risk of metastasis.`;
  }).filter(Boolean).join('\n\n');
}

// An atypical lipomatous tumour at these sites is designated well-differentiated liposarcoma.
const WDLPS_SITE = /\b(retroperiton\w*|mediastin\w*|paratesticular|spermatic cord)\b/i;

export function validate(part) {
  const v = part.values;
  const { out, warn } = checks();
  const where = `${v.site || ''} ${v.clinicalLabel || ''} ${v.specimenName || ''}`;
  if (isALT(v) && WDLPS_SITE.test(where)) {
    warn('Retroperitoneal, mediastinal or paratesticular site: an atypical lipomatous tumour here is designated well-differentiated liposarcoma. Report it on the soft tissue sarcoma synoptic (QMH MS-Soft tissue sarcoma).', 'diagnosis');
  }
  if (isALT(v) && mdm2(v) === 'Not amplified') warn('MDM2 is not amplified, which does not support an atypical lipomatous tumour. Review the diagnosis.', 'mdm2');
  if (isAdipocytic(v) && mdm2(v) === 'Amplified') warn('MDM2 is amplified: an adipocytic tumour with MDM2 amplification is an atypical lipomatous tumour.', 'mdm2');
  if (isSFT(v)) {
    const { missing } = sftRisk(v);
    if (missing.length) {
      const names = missing.map(([n]) => n);
      const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
      warn(`Solitary fibrous tumour: the risk comment needs the ${list}.`, missing[0][1]);
    }
  }
  if (marginsApply(v) && marginsComplete(v) && num(v.marginDistance) === 0) warn('The nearest margin is 0 mm: record the margin as reached rather than completely excised.', 'margins');
  if (isMetastatic(v) && !stripDot(v.ihcPositive) && !stripDot(v.ihcNegative) && !stripDot(v.ihc)) warn('Metastatic malignancy: no immunohistochemistry is recorded.', 'ihcPositive');
  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, flags, comment, validate };
