import { stripDot } from './_house.js';
// Skin lesion excision with margins (BCC / keratoacanthoma / benign lesions) generator.
// Phase 40 added the benign adnexal (follicular, sweat gland, sebaceous), neural, fibrous, vascular and
// fatty lesions, shown in groups on the Diagnosis list (schema `optionGroups`).
// Phase 43 (user 2026-09-26) retired Skin — small benign lesion into this form: Procedure offers a shave,
// punch or curettings beside the excision. Those hide the ellipse fields (orientation, inking, sampling,
// measured margins) and print the retired form's macro, block key and margin sentences:
//   macro      "(A) Received in formalin is a shave of skin measuring 0.6 x 0.4 x 0.2 cm bearing a papule
//               measuring 0.3 cm. All embedded in 1 block."
//   blockKey   "(A) (1) Shave, all embedded."
//   diagnosis  "(A) SKIN, back, shave - SEBORRHOEIC KERATOSIS; lesion extends to the edge of the shave"
// A part saved before Phase 43 has no `procedure` and reads as an excision, so its report is unchanged.
// Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Skin, left cheek nodule, excision"
//   macro      "(A) Received in formalin is an ellipse of skin measuring 2.5 x 1.2 x 0.6 cm bearing a nodule
//               measuring 0.8 cm. A suture marks 12 o'clock, taken as superior. The lesion is 2 mm from the
//               closest skin edge. The deep surface is inked. The ellipse is serially sliced and all embedded
//               in 4 blocks."
//   blockKey   "(A) (1) Tip A. (2-3) Lesion, cross-sections. (4) Tip B."
//   microscopy "(A) Sections show a piece of hair bearing skin with epidermis and dermis. A basaloid tumour is
//               seen arising from the epidermis ... The findings are those of nodular basal cell carcinoma,
//               keratotic variant. Excision is complete and the margins are as follows:
//               - Superior: 1.5 mm
//               - Inferior: 2.5 mm ..."
//   diagnosis  "(A) SKIN, left cheek nodule, excision - NODULAR BASAL CELL CARCINOMA, keratotic variant;
//               completely excised (closest margin 1.5 mm, superior)"
// House wording from docs/case-mix-analysis.md §4.9. Invasive SCC / melanoma give a short diagnosis line only;
// the schema snippet `skin_cancer_template` adds the comment pointing to the QMH skin cancer template.
// Wording is protected by tests/skinexcision.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const dash = (s) => String(s || '').replace(/[\u2013\u2014]/g, '-');

export const BCC = ['Nodular basal cell carcinoma', 'Superficial BCC', 'Infiltrative BCC', 'Micronodular BCC'];
export const CANCER = ['Invasive SCC - see comment', 'Melanoma - see comment'];
export const MALIGNANT = [...BCC, 'Squamous cell carcinoma in situ (Bowen disease)', ...CANCER];
export const isBcc = (v) => BCC.includes(v.diagnosis);
export const isCancerReferral = (v) => CANCER.includes(dash(v.diagnosis));
export const isMalignant = (v) => MALIGNANT.includes(dash(v.diagnosis));

export const SMALL = ['Shave', 'Punch', 'Curettings'];
export const procedureOf = (v) => (SMALL.includes(v.procedure) ? v.procedure : 'Excision');
export const isSmall = (v) => procedureOf(v) !== 'Excision';
// The shave, punch and curettings wording is the retired Skin lesion form's, unchanged.
const PROC = {
  Excision: { word: 'excision' },
  Shave: { word: 'shave', received: 'is a shave of skin', block: 'Shave, all embedded.' },
  Punch: { word: 'punch', received: 'is a punch biopsy of skin', block: 'Punch, all embedded.' },
  Curettings: { word: 'curettings', received: 'are multiple fragments of skin (curettings)', block: 'Curettings, all embedded.' }
};
const procWord = (v) => PROC[procedureOf(v)].word;

export const MARGINS = [
  ['Superior', 'marginSuperior'],
  ['Inferior', 'marginInferior'],
  ['Lateral', 'marginLateral'],
  ['Medial', 'marginMedial'],
  ['Deep', 'marginDeep']
];

/** "2.5x1.2" -> "2.5 x 1.2 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

/** "1.5" / "1.5mm" / "1.5 mm" -> "1.5 mm"; '' when blank. Non-numeric text (e.g. "involved") passes through. */
export function mmPhrase(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/mm|cm/i.test(s)) return s.replace(/\s*(mm|cm)$/i, ' $1').replace(/\s+/g, ' ');
  const n = num(s);
  return n === null ? s : `${fmt(n)} mm`;
}

/** Filled margins in house order: [{ name, raw, mm }]. */
export function marginList(v) {
  return MARGINS.filter(([, id]) => String(v[id] || '').trim() !== '')
    .map(([name, id]) => ({ name, raw: String(v[id]).trim(), mm: num(v[id]) }));
}

/** Closest numeric margin: { mm, names: ['Superior'] } or null when no numeric margin is typed. */
export function closestMargin(v) {
  const numeric = marginList(v).filter((m) => m.mm !== null);
  if (!numeric.length) return null;
  const min = Math.min(...numeric.map((m) => m.mm));
  return { mm: min, names: numeric.filter((m) => m.mm === min).map((m) => m.name) };
}

/** "left cheek nodule" — site then clinical label, whichever are filled. */
export function sitePhrase(v) {
  const site = stripDot(v.specimenName);
  const label = stripDot(v.clinicalLabel);
  return [site, label].filter(Boolean).join(' ');
}

export function specimenName(part) {
  const site = sitePhrase(part.values);
  const word = procWord(part.values);
  return site ? `Skin, ${site}, ${word}` : `Skin, ${word}`;
}

// ---------- macroscopic description ----------

const APPEARANCE = {
  Nodule: 'a nodule',
  'Ulcerated nodule': 'an ulcerated nodule',
  Ulcer: 'an ulcer',
  'Pigmented lesion': 'a pigmented lesion',
  Plaque: 'a plaque',
  Papule: 'a papule'
};
const appearance = (v) => APPEARANCE[v.lesionAppearance] || (v.lesionAppearance ? `a ${lc1(stripDot(v.lesionAppearance))}` : 'a lesion');
const blockCount = (v, fallback) => Math.max(1, Math.round(num(v.blocks) ?? fallback));

/** Shave / punch: "Received in formalin is a shave of skin measuring ... bearing a papule measuring ..."; curettings in aggregate. */
function smallMacro(v) {
  const p = PROC[procedureOf(v)];
  const size = sizePhrase(v.ellipseSize);
  const s = [];
  if (procedureOf(v) === 'Curettings') {
    s.push(`Received in formalin ${p.received}${size ? ` measuring ${size} in aggregate` : ''}.`);
  } else {
    const lesion = sizePhrase(v.lesionSize);
    s.push(`Received in formalin ${p.received}${size ? ` measuring ${size}` : ''} bearing ${appearance(v)}${lesion ? ` measuring ${lesion}` : ''}.`);
  }
  const blocks = blockCount(v, 1);
  s.push(`All embedded in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  return s.join(' ');
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  if (isSmall(v)) return `(${part.label}) ${smallMacro(v)}`;
  const s = [];
  const ellipse = sizePhrase(v.ellipseSize);
  const lesion = sizePhrase(v.lesionSize);
  s.push(`Received in formalin is an ellipse of skin${ellipse ? ` measuring ${ellipse}` : ''} bearing ${appearance(v)}${lesion ? ` measuring ${lesion}` : ''}.`);
  const orient = dash(v.orientation || '');
  if (orient === "Suture at 12 o'clock = superior") s.push("A suture marks 12 o'clock, taken as superior.");
  else if (orient === 'Other - describe') {
    const d = stripDot(v.orientationOther);
    if (d) s.push(`The specimen is orientated: ${lc1(d)}.`);
  } else if (orient === 'None') s.push('The specimen is not orientated.');
  const mm = mmPhrase(v.macroMargin);
  if (mm) s.push(`The lesion is ${mm} from the closest skin edge.`);
  if (v.inking === 'Deep surface inked') s.push('The deep surface is inked.');
  else if (v.inking === 'Margins inked (see block key)') s.push('The margins are inked (see block key).');
  const blocks = blockCount(v, 3);
  const plural = blocks === 1 ? '' : 's';
  if (v.blockScheme === 'Representative sections') s.push(`Representative sections in ${blocks} block${plural}.`);
  else s.push(`The ellipse is serially sliced and all embedded in ${blocks} block${plural}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const range = (a, b) => (a === b ? `(${a})` : `(${a}-${b})`);
  if (isSmall(v)) return `(${part.label}) ${range(1, blockCount(v, 1))} ${PROC[procedureOf(v)].block}`;
  const blocks = blockCount(v, 3);
  let key;
  if (v.blockScheme === 'Representative sections') key = `${range(1, blocks)} Lesion, representative sections.`;
  else if (blocks < 3) key = `${range(1, blocks)} Lesion, cross-sections.`;
  else key = `(1) Tip A. ${range(2, blocks - 1)} Lesion, cross-sections. (${blocks}) Tip B.`;
  return `(${part.label}) ${key}`;
}

// ---------- microscopy ----------

const HAIR_SKIN = 'Sections show a piece of hair bearing skin with epidermis and dermis.';
const BCC_CELLS = 'The cells display oval basophilic nuclei, prominent nucleoli, pink cytoplasm and indistinct cytoplasmic borders.';
const KERATOTIC = 'Areas of central keratinisation are seen within the tumour.';

function bccParagraph(v) {
  const k = !!v.keratotic;
  const variant = k ? ', keratotic variant' : '';
  switch (v.diagnosis) {
    case 'Superficial BCC':
      return [HAIR_SKIN,
        'Multiple buds and nests of basaloid cells with peripheral palisading arise from the undersurface of the epidermis and extend into the superficial dermis, with retraction artefact and a fibromyxoid stroma.',
        BCC_CELLS, k ? KERATOTIC : '', `The findings are those of superficial basal cell carcinoma${variant}.`];
    case 'Infiltrative BCC':
      return [HAIR_SKIN,
        'A basaloid tumour is seen arising from the epidermis and infiltrating into the dermis as irregular, angulated strands and cords of cells with peripheral palisading, set in a fibrous stroma.',
        BCC_CELLS, k ? KERATOTIC : '', 'Mitoses are occasionally seen.', `The findings are those of infiltrative basal cell carcinoma${variant}.`];
    case 'Micronodular BCC':
      return [HAIR_SKIN,
        'A basaloid tumour is seen arising from the epidermis and infiltrating into the dermis as multiple small rounded nests of uniform size with peripheral palisading.',
        BCC_CELLS, k ? KERATOTIC : '', 'Mitoses are occasionally seen.', `The findings are those of micronodular basal cell carcinoma${variant}.`];
    default: // Nodular — §4.9 paragraph verbatim
      return [HAIR_SKIN,
        'A basaloid tumour is seen arising from the epidermis and infiltrating into the dermis, forming solid nodules with peripheral palisading.',
        BCC_CELLS, k ? KERATOTIC : '', 'Mitoses are occasionally seen.', `The findings are those of nodular basal cell carcinoma${variant}.`];
  }
}

const LESION_MICRO = {
  Keratoacanthoma: [
    'Sections show a crateriform squamoproliferative lesion with a central keratin-filled crater surrounded by a lip of epidermis.',
    'The lesion is composed of large keratinocytes with abundant glassy eosinophilic cytoplasm and shows a pushing rather than infiltrative deep border, with a mixed inflammatory infiltrate at the base.',
    'There is no significant cytological atypia.',
    'Overall features are consistent with keratoacanthoma.'
  ],
  'Seborrhoeic keratosis': [
    // §4.9 paragraph verbatim (British spelling)
    'Sections show an acanthotic epidermis with elongation of rete ridges and overlying papillomatosis forming a verrucous, exophytic configuration.',
    'The epidermis is composed of cytologically bland keratinocytes without significant nuclear atypia or dysplasia.',
    'The underlying dermis shows a mild superficial perivascular lymphocytic infiltrate.',
    'The features are those of a benign squamoproliferative lesion, suggestive of seborrhoeic keratosis.',
    'There is no evidence of dysplasia or malignancy.'
  ],
  // Phase 43: the irritated keratosis, junctional and congenital naevi and the hypertrophic scar come
  // across from the retired Skin lesion form, in this form's voice. Sources are in
  // docs/reference/skin-excision-benign-sources.md.
  'Irritated seborrhoeic keratosis': [
    'Sections show an acanthotic epidermis with elongation of rete ridges and overlying papillomatosis forming a verrucous, exophytic configuration.',
    'Squamous eddies are present within the lesion.',
    'The epidermis is composed of cytologically bland keratinocytes without significant nuclear atypia or dysplasia.',
    'The underlying dermis shows a brisk lichenoid lymphocytic infiltrate.',
    'The findings are those of an irritated seborrhoeic keratosis.',
    'There is no evidence of dysplasia or malignancy.'
  ],
  'Intradermal naevus': [
    'Sections show skin with nests and cords of bland naevus cells within the dermis, showing maturation with descent.',
    'There is no junctional component.',
    'No atypical features are seen.',
    'The findings are those of an intradermal naevus.',
    'There is no evidence of malignancy.'
  ],
  'Compound naevus': [
    'Sections show skin with nests of bland naevus cells at the dermo-epidermal junction and within the dermis, showing maturation with descent.',
    'No atypical features are seen.',
    'The findings are those of a compound naevus.',
    'There is no evidence of malignancy.'
  ],
  'Junctional naevus': [
    'Sections show skin with nests of bland naevus cells confined to the dermo-epidermal junction.',
    'There is no dermal component.',
    'No atypical features are seen.',
    'The findings are those of a junctional naevus.',
    'There is no evidence of malignancy.'
  ],
  'Congenital melanocytic naevus': [
    'Sections show skin with nests and cords of bland naevus cells within the dermis, showing maturation with descent.',
    'Naevus cells extend around adnexal structures and neurovascular bundles in the deeper dermis.',
    'No atypical features are seen.',
    'The findings are those of a congenital melanocytic naevus.',
    'There is no evidence of malignancy.'
  ],
  Dermatofibroma: [
    'Sections show a poorly circumscribed dermal proliferation of bland spindle cells arranged in short fascicles, with entrapment of collagen bundles at the periphery.',
    'The overlying epidermis is acanthotic with basal hyperpigmentation.',
    'The findings are those of a dermatofibroma.',
    'There is no evidence of malignancy.'
  ],
  'Pyogenic granuloma': [
    'Sections show a polypoid lesion composed of lobules of capillary-sized vessels lined by bland endothelial cells in an oedematous stroma with a mixed inflammatory infiltrate, surrounded by an epidermal collarette.',
    'The findings are those of a pyogenic granuloma (lobular capillary haemangioma).',
    'There is no evidence of malignancy.'
  ],
  'Actinic keratosis': [
    'Sections show epidermis with parakeratosis and atypical keratinocytes confined to the lower layers of the epidermis, with sparing of the adnexal ostia.',
    'The dermis shows solar elastosis.',
    'The findings are those of an actinic keratosis.',
    'There is no evidence of invasive malignancy.'
  ],
  'Squamous cell carcinoma in situ (Bowen disease)': [
    'Sections show full-thickness atypia of the epidermis with loss of maturation, nuclear pleomorphism, dyskeratotic cells and mitoses at all levels, with extension along adnexal structures.',
    'The basement membrane is intact and there is no evidence of invasion.',
    'The findings are those of squamous cell carcinoma in situ (Bowen disease).'
  ],
  'Invasive SCC - see comment': [
    'Sections show an invasive squamous cell carcinoma arising from the epidermis and infiltrating the dermis; see comment.'
  ],
  'Melanoma - see comment': [
    'Sections show an atypical melanocytic proliferation with features of melanoma; see comment.'
  ],
  // Phase 40 benign additions (user 2026-09-25). Verruca, neurofibroma, haemangioma, keloid and the
  // fibroepithelial polyp took their sentences from the Skin lesion (shave / punch) form, which Phase 43
  // retired into this one. Sources for every paragraph: docs/reference/skin-excision-benign-sources.md.
  'Verruca vulgaris': [
    'Sections show skin with a papillomatous epidermis showing hyperkeratosis, parakeratosis, acanthosis and inward bending of the elongated rete ridges.',
    'Koilocytes with coarse keratohyaline granules are present in the upper epidermis.',
    'The findings are those of a verruca vulgaris.',
    'There is no evidence of dysplasia or malignancy.'
  ],
  Pilomatrixoma: [
    'Sections show skin with a well-circumscribed, lobulated dermal tumour composed of islands of basaloid cells that keratinise abruptly to anucleate shadow cells.',
    'There is a foreign body giant cell reaction to the keratin, with foci of calcification.',
    'The findings are those of a pilomatrixoma.',
    'There is no evidence of malignancy.'
  ],
  Trichoepithelioma: [
    'Sections show skin with a superficial dermal tumour composed of nests of basaloid cells with keratin horn cysts, closely associated with a cellular fibrous stroma containing papillary mesenchymal bodies.',
    'The findings are those of a trichoepithelioma.',
    'There is no evidence of malignancy.'
  ],
  Trichoblastoma: [
    'Sections show skin with a well-circumscribed dermal tumour composed of nests of basaloid cells with peripheral palisading, set in a prominent cellular stroma with papillary mesenchymal bodies.',
    'Cellular pleomorphism is minimal.',
    'The findings are those of a trichoblastoma.',
    'There is no evidence of malignancy.'
  ],
  Trichilemmoma: [
    'Sections show skin with a lobular squamoproliferative lesion in continuity with the epidermis, composed of pale-staining to clear cells with a peripheral palisade of columnar cells and a distinct basement membrane.',
    'The overlying epidermis is hyperkeratotic.',
    'The findings are those of a trichilemmoma.',
    'There is no evidence of malignancy.'
  ],
  Trichofolliculoma: [
    'Sections show skin with a dilated central follicle containing keratin and opening onto the epidermis, from which multiple small secondary vellus follicles radiate into a cellular fibrous stroma.',
    'The findings are those of a trichofolliculoma.',
    'There is no evidence of malignancy.'
  ],
  Poroma: [
    'Sections show skin with a well-circumscribed tumour that replaces the epidermis and extends into the dermis in broad anastomosing bands of uniform small cuboidal cells with round basophilic nuclei and compact eosinophilic cytoplasm.',
    'The tumour cells are sharply demarcated from the adjacent keratinocytes, and scattered ducts lined by an eosinophilic cuticle are seen within a delicate fibrovascular stroma.',
    'The findings are those of a poroma.',
    'There is no evidence of malignancy.'
  ],
  Hidradenoma: [
    'Sections show skin with a well-circumscribed, unencapsulated dermal tumour with solid and cystic areas and no connection to the overlying epidermis.',
    'The solid areas are composed of polygonal cells with basophilic cytoplasm and clear cells, with tubular lumina lined by cuboidal cells, in a hyalinised stroma.',
    'The findings are those of a hidradenoma.',
    'There is no evidence of malignancy.'
  ],
  Spiradenoma: [
    'Sections show skin with well-circumscribed basophilic dermal nodules composed of small dark basaloid cells at the periphery and larger pale cells centrally, arranged in trabeculae, with scattered lymphocytes, small ducts and droplets of hyaline basement membrane material.',
    'The findings are those of a spiradenoma.',
    'There is no evidence of malignancy.'
  ],
  Cylindroma: [
    'Sections show skin with a dermal tumour composed of closely packed nests of basaloid cells that fit together in a jigsaw pattern, each surrounded by a thick hyaline basement membrane.',
    'The nests show a peripheral palisade of small dark cells, with larger pale cells centrally.',
    'The findings are those of a cylindroma.',
    'There is no evidence of malignancy.'
  ],
  Syringoma: [
    'Sections show skin with a well-circumscribed proliferation of small ducts, nests and cords of bland cuboidal cells in the superficial dermis, set in a sclerotic stroma.',
    'The ducts are lined by two layers of cells and some have comma-shaped tails.',
    'The findings are those of a syringoma.',
    'There is no evidence of malignancy.'
  ],
  'Syringocystadenoma papilliferum': [
    'Sections show skin with cystic invaginations of the surface epithelium extending into the dermis, containing papillary projections lined by an inner layer of columnar cells with decapitation secretion and an outer layer of cuboidal cells.',
    'The papillary stroma contains plasma cells.',
    'The findings are those of a syringocystadenoma papilliferum.',
    'There is no evidence of malignancy.'
  ],
  'Mixed tumour (chondroid syringoma)': [
    'Sections show skin with a well-circumscribed, multilobulated dermal tumour composed of bland epithelial cells forming tubules and ducts lined by two layers of cells, with myoepithelial cells, set in a myxoid to chondroid stroma.',
    'The findings are those of a mixed tumour (chondroid syringoma).',
    'There is no evidence of malignancy.'
  ],
  'Sebaceous hyperplasia': [
    'Sections show skin with enlarged, mature sebaceous lobules grouped around a dilated central duct.',
    'The lobules have a thin peripheral rim of germinative cells.',
    'The findings are those of sebaceous hyperplasia.',
    'There is no evidence of malignancy.'
  ],
  'Sebaceous adenoma': [
    'Sections show skin with a well-circumscribed nodular proliferation of sebaceous lobules, with basaloid germinative cells at the periphery and mature vacuolated sebocytes centrally.',
    'Mature sebocytes predominate.',
    'The findings are those of a sebaceous adenoma.',
    'There is no evidence of malignancy.'
  ],
  Sebaceoma: [
    'Sections show skin with a well-circumscribed dermal tumour composed of nodules of small basaloid cells with scattered mature sebocytes and duct-like spaces.',
    'The basaloid cells predominate.',
    'There are no atypical mitoses and no necrosis.',
    'The findings are those of a sebaceoma.',
    'There is no evidence of malignancy.'
  ],
  'Naevus sebaceus': [
    'Sections show skin with an acanthotic and papillomatous epidermis, immature hair follicles and sebaceous glands, some of which open directly onto the epidermal surface.',
    'The findings are those of a naevus sebaceus.',
    'There is no evidence of malignancy.'
  ],
  Neurofibroma: [
    'Sections show skin with a poorly circumscribed dermal proliferation of bland spindle cells with wavy nuclei, set in a loose collagenous and myxoid stroma containing scattered mast cells.',
    'There is no cytological atypia or mitotic activity.',
    'The findings are those of a neurofibroma.',
    'There is no evidence of malignancy.'
  ],
  Schwannoma: [
    'Sections show skin with an encapsulated spindle cell tumour composed of cellular (Antoni A) areas with nuclear palisading forming Verocay bodies, alternating with hypocellular myxoid (Antoni B) areas.',
    'The cells have wavy, tapered nuclei, and the blood vessels have thick hyalinised walls.',
    'The findings are those of a schwannoma.',
    'There is no evidence of malignancy.'
  ],
  'Granular cell tumour': [
    'Sections show skin with a dermal proliferation of large polygonal cells with abundant eosinophilic granular cytoplasm and small central nuclei.',
    'The findings are those of a granular cell tumour.',
    'There is no evidence of malignancy.'
  ],
  'Fibroepithelial polyp': [
    'Sections show a polypoid piece of skin covered by mildly acanthotic epidermis with a loose fibrovascular dermal core containing mature adipose tissue.',
    'The findings are those of a fibroepithelial polyp.',
    'There is no evidence of dysplasia or malignancy.'
  ],
  Scar: [
    'Sections show skin in which the dermis is replaced by fibrous tissue, with collagen bundles and fibroblasts arranged parallel to the epidermis, vertically orientated small blood vessels and loss of adnexal structures.',
    'The findings are those of a scar.',
    'There is no evidence of malignancy.'
  ],
  'Hypertrophic scar': [
    'Sections show skin in which the dermis is replaced by nodules of fibrous tissue, with collagen bundles and fibroblasts arranged parallel to the epidermis, vertically orientated small blood vessels and loss of adnexal structures.',
    'The findings are those of a hypertrophic scar.',
    'There is no evidence of malignancy.'
  ],
  Keloid: [
    'Sections show skin with a dermal proliferation of thick, glassy, hyalinised collagen bundles and fibroblasts beneath a flattened epidermis, with loss of adnexal structures.',
    'The findings are those of a keloid.',
    'There is no evidence of malignancy.'
  ],
  Haemangioma: [
    'Sections show skin with a dermal proliferation of dilated, thin-walled vascular channels lined by bland flattened endothelial cells and filled with blood.',
    'There is no endothelial atypia.',
    'The findings are those of a haemangioma.',
    'There is no evidence of malignancy.'
  ],
  Lipoma: [
    'Sections show skin with an underlying lobulated proliferation of mature adipocytes separated by thin fibrous septa.',
    'No atypical stromal cells or lipoblasts are observed.',
    'The findings are those of a lipoma.',
    'There is no evidence of malignancy.'
  ],
  'Benign adnexal tumour, other': [
    'Sections show a benign adnexal tumour; see additional description.',
    'There is no evidence of malignancy.'
  ],
  'Benign, other': [
    'Sections show a benign skin lesion; see additional description.',
    'There is no evidence of malignancy.'
  ]
};

/** The house margin block: "Excision is complete and the margins are as follows:\n- Superior: 1.5 mm\n..." */
export function marginBlock(v) {
  const list = marginList(v);
  const lines = list.map((m) => `- ${m.name}: ${mmPhrase(m.raw)}`);
  const comp = dash(v.completeness || 'Complete');
  let lead;
  if (comp === 'Involved - which') {
    const inv = involvedNames(v);
    lead = `Excision is incomplete; the lesion involves the ${inv ? `${inv} margin${involvedCount(v) > 1 ? 's' : ''}` : 'margin'}.`;
    if (lines.length) lead += ' The margins are as follows:';
  } else if (comp === 'Close < 1 mm') {
    lead = lines.length ? 'Excision is complete but close (< 1 mm) and the margins are as follows:' : 'Excision is complete but close (< 1 mm).';
  } else {
    lead = lines.length ? 'Excision is complete and the margins are as follows:' : 'Excision is complete.';
  }
  return [lead, ...lines].join('\n');
}

const involvedList = (v) => (Array.isArray(v.involvedMargins) ? v.involvedMargins : []).filter(Boolean);
const involvedCount = (v) => involvedList(v).length;
const involvedNames = (v) => listJoin(involvedList(v).map((s) => s.toLowerCase()));

// Shave and punch margins, as the retired Skin lesion form printed them: [microscopy, diagnosis clause].
// "Not stated" prints nothing, and curettings carry no margin.
const SMALL_MARGIN = {
  'Completely excised': ['The lesion is completely excised.', 'completely excised'],
  'Lesion extends to the edge of the shave': ['The lesion extends to the edge of the shave.', 'lesion extends to the edge of the shave'],
  'Lesion extends to the lateral margin': ['The lesion extends to the lateral margin.', 'lesion extends to the lateral margin'],
  'Involves deep margin': ['The lesion involves the deep margin.', 'lesion involves the deep margin']
};
const smallMargin = (v) => (procedureOf(v) === 'Curettings' ? null : SMALL_MARGIN[dash(v.smallMargin || '')] || null);
/** "The lesion extends to the edge of the shave." for a shave or punch; '' when not stated or curettings. */
export const smallMarginSentence = (v) => smallMargin(v)?.[0] || '';
/** "lesion extends to the edge of the shave" for a shave or punch; '' when not stated or curettings. */
export const smallMarginClause = (v) => smallMargin(v)?.[1] || '';

export function microscopy(part) {
  const v = part.values;
  const s = [];
  const dx = dash(v.diagnosis || '');
  if (isBcc(v)) s.push(...bccParagraph(v).filter(Boolean));
  else s.push(...(LESION_MICRO[dx] || LESION_MICRO['Benign, other']));

  if (v.ulceration === 'Present') s.push('The overlying epidermis is ulcerated.');
  if (v.pni === 'Present') s.push('Perineural invasion is present.');
  else if (isMalignant(v) && !isCancerReferral(v)) s.push('There is no perineural invasion.');

  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);

  const body = s.join(' ');
  if (isCancerReferral(v)) return `(${part.label}) ${body}`;
  if (isSmall(v)) {
    const margin = smallMarginSentence(v);
    return `(${part.label}) ${body}${margin ? ` ${margin}` : ''}`;
  }
  return `(${part.label}) ${body} ${marginBlock(v)}`;
}

// ---------- diagnosis ----------

const MAIN = {
  'Nodular basal cell carcinoma': 'NODULAR BASAL CELL CARCINOMA',
  'Superficial BCC': 'SUPERFICIAL BASAL CELL CARCINOMA',
  'Infiltrative BCC': 'INFILTRATIVE BASAL CELL CARCINOMA',
  'Micronodular BCC': 'MICRONODULAR BASAL CELL CARCINOMA',
  Keratoacanthoma: 'KERATOACANTHOMA',
  'Seborrhoeic keratosis': 'SEBORRHOEIC KERATOSIS',
  // Phase 43: released forms - IRRITATED SEBORRHOEIC KERATOSIS, JUNCTIONAL NAEVUS, CONGENITAL
  // MELANOCYTIC NAEVUS and HYPERTROPHIC SCAR, each with nothing after the name.
  'Irritated seborrhoeic keratosis': 'IRRITATED SEBORRHOEIC KERATOSIS',
  'Intradermal naevus': 'INTRADERMAL NAEVUS',
  'Compound naevus': 'COMPOUND NAEVUS',
  'Junctional naevus': 'JUNCTIONAL NAEVUS',
  'Congenital melanocytic naevus': 'CONGENITAL MELANOCYTIC NAEVUS',
  Dermatofibroma: 'DERMATOFIBROMA',
  'Pyogenic granuloma': 'PYOGENIC GRANULOMA (LOBULAR CAPILLARY HAEMANGIOMA)',
  'Actinic keratosis': 'ACTINIC KERATOSIS',
  'Squamous cell carcinoma in situ (Bowen disease)': 'SQUAMOUS CELL CARCINOMA IN SITU (BOWEN DISEASE)',
  'Invasive SCC - see comment': 'INVASIVE SQUAMOUS CELL CARCINOMA',
  'Melanoma - see comment': 'MELANOMA',
  // Phase 40: the released majority forms - PILOMATRIXOMA (3 of 5 released lines), FIBROEPITHELIAL
  // POLYP (33 of 35 skin lines, not "skin tag"), VERRUCA VULGARIS (46 of 46) - and British NAEVUS.
  'Verruca vulgaris': 'VERRUCA VULGARIS',
  Pilomatrixoma: 'PILOMATRIXOMA',
  Trichoepithelioma: 'TRICHOEPITHELIOMA',
  Trichoblastoma: 'TRICHOBLASTOMA',
  Trichilemmoma: 'TRICHILEMMOMA',
  Trichofolliculoma: 'TRICHOFOLLICULOMA',
  Poroma: 'POROMA',
  Hidradenoma: 'HIDRADENOMA',
  Spiradenoma: 'SPIRADENOMA',
  Cylindroma: 'CYLINDROMA',
  Syringoma: 'SYRINGOMA',
  'Syringocystadenoma papilliferum': 'SYRINGOCYSTADENOMA PAPILLIFERUM',
  'Mixed tumour (chondroid syringoma)': 'MIXED TUMOUR (CHONDROID SYRINGOMA)',
  'Sebaceous hyperplasia': 'SEBACEOUS HYPERPLASIA',
  'Sebaceous adenoma': 'SEBACEOUS ADENOMA',
  Sebaceoma: 'SEBACEOMA',
  'Naevus sebaceus': 'NAEVUS SEBACEUS',
  Neurofibroma: 'NEUROFIBROMA',
  Schwannoma: 'SCHWANNOMA',
  'Granular cell tumour': 'GRANULAR CELL TUMOUR',
  'Fibroepithelial polyp': 'FIBROEPITHELIAL POLYP',
  Scar: 'SCAR',
  'Hypertrophic scar': 'HYPERTROPHIC SCAR',
  Keloid: 'KELOID',
  Haemangioma: 'HAEMANGIOMA',
  Lipoma: 'LIPOMA',
  'Benign adnexal tumour, other': 'BENIGN ADNEXAL TUMOUR (see microscopic examination)',
  'Benign, other': 'BENIGN SKIN LESION (see microscopic examination)'
};

/** "completely excised (closest margin 1.5 mm, superior)" / "involved at the deep margin" / "close excision (0.5 mm, deep)". */
export function marginClause(v) {
  const comp = dash(v.completeness || 'Complete');
  const closest = closestMargin(v);
  const detail = closest ? ` (closest margin ${fmt(closest.mm)} mm, ${listJoin(closest.names.map((n) => n.toLowerCase()))})` : '';
  if (comp === 'Involved - which') {
    const inv = involvedNames(v);
    return inv ? `involved at the ${inv} margin${involvedCount(v) > 1 ? 's' : ''}` : 'margin involved';
  }
  if (comp === 'Close < 1 mm') return `excised but close${detail}`;
  return `completely excised${detail}`;
}

export function diagnosis(part) {
  const v = part.values;
  const clauses = [];
  const dx = dash(v.diagnosis || '');
  let main = MAIN[dx] || dx.toUpperCase();
  if (isBcc(v) && v.keratotic) main += ', keratotic variant';
  clauses.push(main);
  if (isCancerReferral(v)) {
    clauses.push('see comment');
  } else {
    if (v.pni === 'Present') clauses.push('perineural invasion present');
    const margin = isSmall(v) ? smallMarginClause(v) : marginClause(v);
    if (margin) clauses.push(margin);
  }
  const site = sitePhrase(v);
  return `(${part.label}) SKIN, ${site ? `${site}, ` : ''}${procWord(v)} - ${clauses.join('; ')}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
