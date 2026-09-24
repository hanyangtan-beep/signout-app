import { stripDot, checks } from './_house.js';
// Nail and digit (benign resection). Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Nail, right hallux, clipping"
//   macro      "(A) Received in formalin is a nail clipping labelled right hallux, measuring 1.2 x 0.4 x 0.1 cm.
//               All embedded on edge in 1 block."
//   blockKey   "(A) (1) Nail clipping, all embedded."
//   microscopy "(A) Sections show nail plate. Fungal hyphae are identified within the nail plate on PAS stain. The
//               features are those of onychomycosis."
//   diagnosis  "(A) NAIL, right hallux, clipping - ONYCHOMYCOSIS"
//
// Benign batch 3 (docs/roadmap.md, "Nail and digit", pulled 2026-09-24). Before this template 36
// of the 56 nail and digit parts in the two exports landed on Generic, 12 on the soft-tissue form and 8 on the
// skin-cyst form (docs/case-mix/benign-resections-2021-2026.md). 37 of the 56 were all embedded. A clipping, an
// avulsion or a nail-unit biopsy is sectioned on edge or longitudinally; an exostosis and an amputation are
// decalcified.
// The tumour sentences are the house sentences of the forms these lesions used to go to, so a glomus tumour reads
// the same wherever it is reported: glomus tumour, localised tenosynovial giant cell tumour and gouty tophus are
// those of generators/softtissue.js, pyogenic granuloma that of generators/skinexcision.js, and the bone sentences
// of an amputation are those of generators/bone.js (tests/nail_digit.test.js checks that they stay equal).
// Grounding:
//   RCPath G075 Tissue pathways for dermatopathology §6.3-6.5: nail clippings are commonly submitted without
//   fixative and are submitted on edge; other nail specimens are sectioned longitudinally; "PAS and Gomori
//   methenamine silver are equally efficacious in the identification of fungi". Blood in the nail plate stays
//   blood (no haemosiderin), hence the haematoma sentence.
//   https://www.rcpath.org/static/88bfeeaf-7b1c-458e-be2019c1324cd7ac/G075-Tissue-pathways-for-dermatopathologyfor-publication.pdf
//   Digital myxoid pseudocyst (DermNet): "a focal deposition of mucin in the dermis with surrounding fibrous stroma
//   and no epithelial lining". https://dermnetnz.org/topics/digital-myxoid-pseudocyst-pathology
//   Acquired digital fibrokeratoma: a fibroepithelial structure covered by keratinising squamous epithelium with
//   marked compact hyperkeratosis, around a core of dense, vascularised connective tissue.
//   https://pmc.ncbi.nlm.nih.gov/articles/PMC10686781/
//   Subungual exostosis: "trabecular bone with a cap of fibrocartilaginous tissue".
//   https://pmc.ncbi.nlm.nih.gov/articles/PMC7369528/
//   Proximal bone margin after a partial foot amputation for osteomyelitis, graded as osteomyelitis or none:
//   https://pmc.ncbi.nlm.nih.gov/articles/PMC7185086/ ; histological assessment of the proximal resection margin
//   is recommended at amputation: https://pmc.ncbi.nlm.nih.gov/articles/PMC7778038/
// Wording is protected by tests/nail_digit.test.js and tests/fixtures/nail_digit/.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
/** Lower-case an ordinary leading word ("Right" -> "right") but keep "PIP", "2nd". */
const lcWord = (s) => (/^[A-Z][a-z]/.test(s || '') ? lc1(s) : s || '');

export const CLIPPING = 'Nail clipping';
export const AVULSION = 'Nail avulsion';
export const BED_BIOPSY = 'Nail matrix or bed biopsy';
export const NAIL_UNIT = 'Nail-unit excision';
export const LESION = 'Lesion excision';
export const AMPUTATION = 'Digit or ray amputation';
export const ONYCHOMYCOSIS = 'Onychomycosis';
export const NO_FUNGUS = 'No fungal organisms';
export const HAEMATOMA = 'Subungual haematoma';
export const MELANOCYTIC = 'Melanocytic lesion – see comment';
export const DESCRIPTIVE = 'No evidence of malignancy (descriptive)';
export const MARGIN_INVOLVED = 'Osteomyelitis at the margin – see comment';

const SPEC = {
  [CLIPPING]: { what: 'is a nail clipping', key: 'Nail clipping', word: 'clipping', cut: 'edge', plate: true },
  [AVULSION]: { what: 'is a nail plate', key: 'Nail plate', word: 'avulsion', cut: 'longitudinal', plate: true },
  [BED_BIOPSY]: { what: 'is a piece of nail unit tissue', key: 'Nail unit', word: 'biopsy', cut: 'longitudinal' },
  [NAIL_UNIT]: { what: 'is a nail-unit excision specimen', key: 'Nail unit', word: 'excision', cut: 'longitudinal' },
  [LESION]: { what: 'is a piece of tissue', key: 'Lesion', word: 'excision' },
  [AMPUTATION]: { what: 'is an amputated digit', key: 'Digit', word: 'amputation', amputation: true }
};
const spec = (v) => SPEC[v.specimen] || SPEC[CLIPPING];
const amputation = (v) => !!spec(v).amputation;
/** The procedure word of the specimen line: the one chosen ("curettage", "punch biopsy"), else the specimen's own. */
const WITH_PROCEDURE = new Set([AVULSION, BED_BIOPSY, NAIL_UNIT, LESION]);
const procedureWord = (v) => (WITH_PROCEDURE.has(v.specimen) && v.procedure ? lc1(v.procedure) : spec(v).word);

// ---------- specimen ----------

/**
 * The digit or position as typed ("right hallux"); commas become spaces so the line keeps its three slots.
 * "Toenail" and "fingernail" name the digit: "right great toenail" is printed "right great toe" under the NAIL head;
 * "toe nail plate" and "thumb nail bed" are kept as the house lines write them.
 */
export const labelPhrase = (v) => lcWord(stripDot(v.site)
  .replace(/\b(toe|finger)\s*nails?\b(?!\s+(?:plate|bed|matrix|fold|unit))/gi, '$1')
  .replace(/\s*,\s*/g, ' ').replace(/\s+/g, ' ').trim());

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return typed;
  return [cap1((v.organ || 'NAIL').toLowerCase()), labelPhrase(v), procedureWord(v)].filter(Boolean).join(', ');
}

// ---------- macroscopic description ----------

/** "1.2x0.4x0.1" -> "1.2 x 0.4 x 0.1 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 1));
const representative = (v) => v.blockScheme === 'Representative sections';
const decalcified = (v) => amputation(v) || (v.specimen === LESION && v.diagnosis === 'Subungual exostosis');

function sampling(v) {
  const blocks = blockCount(v);
  const n = `${blocks} block${blocks === 1 ? '' : 's'}`;
  const s = spec(v);
  if (s.amputation) {
    return v.boneMargin === 'Not submitted'
      ? `Representative sections of the soft tissue and the bone in ${n} after decalcification.`
      : `Representative sections of the soft tissue, the bone and the proximal bone margin in ${n} after decalcification.`;
  }
  if (s.cut === 'edge') return representative(v) ? `Representative pieces embedded on edge in ${n}.` : `All embedded on edge in ${n}.`;
  if (s.cut === 'longitudinal') return representative(v) ? `Sectioned longitudinally; representative sections in ${n}.` : `Sectioned longitudinally and all embedded in ${n}.`;
  const decal = decalcified(v) ? ' after decalcification' : '';
  return representative(v) ? `Representative sections in ${n}${decal}.` : `All embedded in ${n}${decal}.`;
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = spec(v);
  const label = labelPhrase(v);
  const size = sizePhrase(v.dimensions);
  const dry = s.plate && v.fixative === 'Dry';
  let first = `Received ${dry ? 'dry' : 'in formalin'} ${s.what}`;
  if (label) first += ` labelled ${label}`;
  if (size) first += `, measuring ${size}`;
  return `(${part.label}) ${first}. ${sampling(v)}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const blocks = blockCount(v);
  const range = blocks === 1 ? '(1)' : `(1-${blocks})`;
  const what = amputation(v) || representative(v) ? 'representative sections' : 'all embedded';
  return `(${part.label}) ${range} ${spec(v).key}, ${what}${decalcified(v) ? ', decalcified' : ''}.`;
}

// ---------- microscopy ----------

const STAIN = { PAS: 'PAS stain', GMS: 'GMS stain', 'PAS and GMS': 'PAS and GMS stains' };
const stainPhrase = (v) => STAIN[v.stain] || STAIN.PAS;
const NEM = 'There is no evidence of malignancy.';

// House sentences shared with the forms these lesions used to go to (see the header); change them there first.
const TUMOUR_MICRO = {
  'Pyogenic granuloma': [
    'Sections show a polypoid lesion composed of lobules of capillary-sized vessels lined by bland endothelial cells in an oedematous stroma with a mixed inflammatory infiltrate, surrounded by an epidermal collarette.',
    'The findings are those of a pyogenic granuloma (lobular capillary haemangioma).'
  ],
  'Glomus tumour': [
    'Sections show a well-circumscribed tumour composed of sheets and nests of uniform round cells with central round nuclei, well-defined cell borders and eosinophilic cytoplasm, arranged around small vessels.',
    'There is no cytological atypia, necrosis or increased mitotic activity.',
    'The findings are in keeping with glomus tumour.'
  ],
  'Tenosynovial giant cell tumour, localised': [
    'Sections show a well-circumscribed, lobulated tumour composed of mononuclear histiocytoid cells admixed with osteoclast-like multinucleated giant cells, foamy macrophages and haemosiderin-laden macrophages in a collagenous stroma.',
    'There is no significant cytological atypia or necrosis.',
    'The findings are in keeping with tenosynovial giant cell tumour, localised type.'
  ],
  'Gouty tophus': [
    'Sections show amorphous deposits of pale, feathery crystalline material surrounded by histiocytes and multinucleated foreign-body giant cells.',
    'The findings are in keeping with a gouty tophus.'
  ],
  'Digital mucous cyst': [
    'Sections show a focal collection of mucin in the dermis, with surrounding fibrous stroma and no epithelial lining.',
    'The features are those of a digital mucous (myxoid) cyst.'
  ],
  'Acquired digital fibrokeratoma': [
    'Sections show a polypoid fibroepithelial lesion with a core of dense, vascularised collagen, covered by acanthotic squamous epithelium with compact hyperkeratosis.',
    'The features are those of an acquired digital fibrokeratoma.'
  ],
  'Subungual exostosis': [
    'Sections show trabecular bone with a cap of fibrocartilaginous tissue.',
    'The features are those of a subungual exostosis.'
  ],
  Chondroma: [
    'Sections show lobules of mature hyaline cartilage containing bland chondrocytes in lacunae.',
    'There is no significant cytological atypia.',
    'The features are those of a chondroma.'
  ]
};

function lesionMicro(v) {
  const plate = spec(v).plate ? 'Sections show nail plate.' : 'Sections show nail plate and nail bed epithelium.';
  switch (v.diagnosis) {
    case ONYCHOMYCOSIS: return [plate, `Fungal hyphae are identified within the nail plate on ${stainPhrase(v)}.`, 'The features are those of onychomycosis.'];
    case NO_FUNGUS: return [plate, `No fungal organisms are identified on ${stainPhrase(v)}.`];
    case HAEMATOMA: return ['Sections show nail plate with a layer of blood on its undersurface.', `No fungal organisms are identified on ${stainPhrase(v)}.`, 'The features are those of a subungual haematoma.'];
    case MELANOCYTIC: return ['Sections show nail unit epithelium with a melanocytic proliferation; see comment.'];
    case DESCRIPTIVE: {
      const text = stripDot(v.findingsText);
      return [text ? `Sections show ${lc1(text)}.` : 'Sections show no significant pathological change.', NEM];
    }
    default: return TUMOUR_MICRO[v.diagnosis] ? [...TUMOUR_MICRO[v.diagnosis], NEM] : [plate];
  }
}

const SOFT_MICRO = {
  Gangrene: 'Sections of the soft tissue show gangrenous necrosis with acute inflammation.',
  Ulceration: 'Sections of the skin and soft tissue show ulceration with acute and chronic inflammation and granulation tissue.',
  'No significant abnormality': 'Sections of the skin and soft tissue show no significant abnormality.'
};
// generators/bone.js sentences, with "Sections show" -> "Sections of the bone show" (and "fragments of" dropped).
const BONE_MICRO = {
  'Chronic osteomyelitis': [
    'Sections of the bone show necrotic bone with empty osteocyte lacunae, marrow fibrosis, a chronic inflammatory infiltrate of lymphocytes and plasma cells, and reactive new bone formation.',
    'The features are in keeping with chronic osteomyelitis.'
  ],
  'Acute osteomyelitis': [
    'Sections of the bone show bone trabeculae with a polymorph infiltrate in the marrow spaces, marrow necrosis and osteoclastic bone resorption.',
    'The features are in keeping with acute osteomyelitis.'
  ],
  Osteonecrosis: [
    'Sections of the bone show necrotic bone trabeculae with empty osteocyte lacunae and necrotic marrow.',
    'The features are in keeping with osteonecrosis.'
  ],
  'No osteomyelitis': ['Sections of the bone show trabeculae of viable bone and fibrous marrow tissue.', 'There is no osteomyelitis.']
};
const osteomyelitis = (v) => /osteomyelitis|osteonecrosis/i.test(v.ampBone || '') && v.ampBone !== 'No osteomyelitis';

function amputationMicro(v) {
  const s = [SOFT_MICRO[v.ampSoft] || SOFT_MICRO.Gangrene, ...(BONE_MICRO[v.ampBone] || BONE_MICRO['Chronic osteomyelitis'])];
  if (osteomyelitis(v)) {
    if (v.boneMargin === 'Viable, no osteomyelitis') s.push('The proximal bone margin shows viable bone with no osteomyelitis.');
    if (v.boneMargin === MARGIN_INVOLVED) s.push('Osteomyelitis extends to the proximal bone margin.');
  }
  s.push(NEM);
  return s;
}

export function microscopy(part) {
  const v = part.values;
  const s = amputation(v) ? amputationMicro(v) : lesionMicro(v);
  const notes = stripDot(v.additionalNotes);
  if (notes) s.push(`${notes}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const LESION_DX = {
  [ONYCHOMYCOSIS]: 'ONYCHOMYCOSIS',
  [NO_FUNGUS]: 'NO FUNGAL ORGANISMS IDENTIFIED',
  [HAEMATOMA]: 'SUBUNGUAL HAEMATOMA',
  'Pyogenic granuloma': 'PYOGENIC GRANULOMA (LOBULAR CAPILLARY HAEMANGIOMA)',
  'Digital mucous cyst': 'DIGITAL MUCOUS CYST',
  'Glomus tumour': 'GLOMUS TUMOUR',
  'Tenosynovial giant cell tumour, localised': 'TENOSYNOVIAL GIANT CELL TUMOUR, localised type',
  'Acquired digital fibrokeratoma': 'ACQUIRED DIGITAL FIBROKERATOMA',
  'Subungual exostosis': 'SUBUNGUAL EXOSTOSIS',
  Chondroma: 'CHONDROMA',
  'Gouty tophus': 'GOUTY TOPHUS',
  [MELANOCYTIC]: 'MELANOCYTIC LESION OF THE NAIL UNIT; see comment',
  [DESCRIPTIVE]: 'NO EVIDENCE OF MALIGNANCY'
};
const SOFT_DX = { Gangrene: 'GANGRENE', Ulceration: 'ULCERATION' };
const BONE_DX = { 'Chronic osteomyelitis': 'CHRONIC OSTEOMYELITIS', 'Acute osteomyelitis': 'ACUTE OSTEOMYELITIS', Osteonecrosis: 'OSTEONECROSIS' };

export function mainLine(v) {
  if (!amputation(v)) return LESION_DX[v.diagnosis] || LESION_DX[ONYCHOMYCOSIS];
  const soft = SOFT_DX[v.ampSoft] || '';
  const bone = BONE_DX[v.ampBone] || '';
  if (!bone) return soft ? `${soft}; no osteomyelitis` : 'NO OSTEOMYELITIS; NO EVIDENCE OF MALIGNANCY';
  const main = soft ? `${soft} with ${bone}` : bone;
  if (v.boneMargin === 'Viable, no osteomyelitis') return `${main}; proximal bone margin viable, no osteomyelitis`;
  if (v.boneMargin === MARGIN_INVOLVED) return `${main}; OSTEOMYELITIS AT THE PROXIMAL BONE MARGIN; see comment`;
  return main;
}

export function diagnosis(part) {
  const v = part.values;
  const line = [v.organ || 'NAIL', labelPhrase(v), procedureWord(v)].filter(Boolean).join(', ');
  return `(${part.label}) ${line} - ${mainLine(v)}`;
}

// ---------- checks ----------

const PLATE_ONLY = new Set([ONYCHOMYCOSIS, NO_FUNGUS, HAEMATOMA]);

export function validate(part) {
  const v = part.values;
  const { out, warn } = checks();
  if (amputation(v)) {
    if (v.organ === 'NAIL') warn('Choose TOE, FINGER or THUMB as the head for an amputation.', 'organ');
    if (osteomyelitis(v) && v.boneMargin === 'Not submitted') warn('The proximal bone margin is not submitted: the report cannot comment on residual osteomyelitis.', 'boneMargin');
  } else if (spec(v).plate && !PLATE_ONLY.has(v.diagnosis)) {
    warn('A nail clipping or avulsed plate cannot show this lesion: check the specimen type.', 'diagnosis');
  } else if (v.specimen === LESION && PLATE_ONLY.has(v.diagnosis)) {
    warn('This is a nail-plate diagnosis: choose the diagnosis of the lesion.', 'diagnosis');
  }
  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, validate };
