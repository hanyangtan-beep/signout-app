import { stripDot } from './_house.js';
// Skin — small benign lesion (shave / punch / small ellipse / curettings) generator.
// Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Skin, left forearm, shave"
//   macro      "(A) Received in formalin is a shave of skin measuring 0.6 x 0.4 x 0.2 cm bearing a pigmented
//               papule. All embedded in 1 block."
//   blockKey   "(A) (1) Shave, all embedded."  /  "(A) (1-2) Ellipse, cross-sections, all embedded."
//   microscopy "(A) Sections show a piece of skin with nests of naevus cells at the dermo-epidermal junction and
//               within the dermis. The melanocytes mature with depth and there is no cytological atypia or mitotic
//               activity. The findings are those of a compound melanocytic naevus. The lesion is completely excised
//               with a closest margin of 2 mm. There is no evidence of malignancy."
//   diagnosis  "(A) SKIN, back, excision - COMPOUND MELANOCYTIC NAEVUS; no atypical features; completely excised
//               (closest margin 2 mm)"
// House wording from docs/case-mix-analysis.md §4.9 (seborrhoeic keratosis paragraph verbatim, British spelling).
// The "Malignant / atypical" option gives a short diagnosis line only; the schema snippet
// `skin_lesion_cancer_template` adds the comment pointing to the QMH skin cancer template. `flags()` drives the
// actinic-keratosis-at-margin snippet; the naevus-with-atypia snippet is a field rule on `dysplasticFeatures`.
// Wording is protected by tests/skinlesion.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
const dash = (s) => String(s || '').replace(/[\u2013\u2014]/g, '-');

export const MALIGNANT = 'Malignant / atypical - see comment';
export const NAEVUS = 'Melanocytic naevus';
export const SK = 'Seborrhoeic keratosis';
export const PG = 'Pyogenic granuloma (lobular capillary haemangioma)';
export const AK = 'Actinic keratosis';
export const isMalignant = (v) => dash(v.lesionType) === MALIGNANT;

export const PROCEDURES = {
  Shave: { word: 'shave', received: 'is a shave of skin', block: 'Shave, all embedded.' },
  Punch: { word: 'punch', received: 'is a punch biopsy of skin', block: 'Punch, all embedded.' },
  'Excision, ellipse': { word: 'excision', received: 'is an ellipse of skin', block: 'Ellipse, cross-sections, all embedded.' },
  Curettings: { word: 'curettings', received: 'are multiple fragments of skin (curettings)', block: 'Curettings, all embedded.' }
};
const proc = (v) => PROCEDURES[v.procedure] || PROCEDURES.Shave;
export const isExcision = (v) => v.procedure === 'Excision, ellipse';

/** "0.6x0.4x0.2" -> "0.6 x 0.4 x 0.2 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

/** "2" -> "2 mm"; '' when blank or non-numeric. */
export function mmPhrase(raw) {
  const n = num(raw);
  return n === null ? '' : `${fmt(n)} mm`;
}

export function specimenName(part) {
  const site = stripDot(part.values.specimenName);
  return `Skin, ${site ? `${site}, ` : ''}${proc(part.values).word}`;
}

// ---------- macroscopic description ----------

const NOUNS = { Papule: 'papule', Polypoid: 'polypoid lesion', Nodule: 'nodule' };
const ADJECTIVES = ['Ulcerated', 'Pigmented', 'Verrucous'];

/** "a pigmented papule" / "an ulcerated polypoid lesion" / "a lesion" from the multiselect. */
export function lesionPhrase(v) {
  const picked = Array.isArray(v.lesionDescription) ? v.lesionDescription : [];
  const noun = Object.keys(NOUNS).filter((k) => picked.includes(k)).map((k) => NOUNS[k])[0] || 'lesion';
  const adj = ADJECTIVES.filter((a) => picked.includes(a)).map((a) => a.toLowerCase());
  const words = [...adj, noun].join(' ');
  return `${/^[aeiou]/.test(words) ? 'an' : 'a'} ${words}`;
}

const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 1));

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const p = proc(v);
  const size = sizePhrase(v.specimenSize);
  const lesion = sizePhrase(v.lesionSize);
  const s = [];
  if (v.procedure === 'Curettings') {
    s.push(`Received in formalin ${p.received}${size ? ` measuring ${size} in aggregate` : ''}.`);
  } else {
    s.push(`Received in formalin ${p.received}${size ? ` measuring ${size}` : ''} bearing ${lesionPhrase(v)}${lesion ? ` measuring ${lesion}` : ''}.`);
    if (isExcision(v) && v.deepInked) s.push('The deep surface is inked.');
  }
  const blocks = blockCount(v);
  s.push(`All embedded in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const blocks = blockCount(v);
  const range = blocks === 1 ? '(1)' : `(1-${blocks})`;
  return `(${part.label}) ${range} ${proc(v).block}`;
}

// ---------- microscopy ----------

const SK_OPEN = 'Sections show an acanthotic epidermis with elongation of rete ridges and overlying papillomatosis forming a verrucous, exophytic configuration.';
const SK_BLAND = 'The epidermis is composed of cytologically bland keratinocytes without significant nuclear atypia or dysplasia.';
const SK_DERMIS = 'The underlying dermis shows a mild superficial perivascular lymphocytic infiltrate.';

const SK_SUBTYPE = {
  Acanthotic: { sentence: 'The lesion is composed of broad sheets of basaloid keratinocytes with horn pseudocysts.', dermis: SK_DERMIS, name: 'a seborrhoeic keratosis', dx: 'SEBORRHOEIC KERATOSIS' },
  Hyperkeratotic: { sentence: 'There is marked hyperkeratosis and papillomatosis with church-spire-like projections of the epidermis.', dermis: SK_DERMIS, name: 'a seborrhoeic keratosis, hyperkeratotic type', dx: 'SEBORRHOEIC KERATOSIS, hyperkeratotic type' },
  Irritated: { sentence: 'Squamous eddies are present within the lesion.', dermis: 'The underlying dermis shows a brisk lichenoid lymphocytic infiltrate.', name: 'an irritated seborrhoeic keratosis', dx: 'IRRITATED SEBORRHOEIC KERATOSIS' },
  Clonal: { sentence: 'Well-demarcated intraepidermal nests of basaloid keratinocytes are present (clonal pattern).', dermis: SK_DERMIS, name: 'a seborrhoeic keratosis, clonal type', dx: 'SEBORRHOEIC KERATOSIS, clonal type' },
  Reticulated: { sentence: 'Thin interlacing strands of basaloid keratinocytes extend from the epidermis into the dermis, with basal hyperpigmentation (reticulated pattern).', dermis: SK_DERMIS, name: 'a seborrhoeic keratosis, reticulated type', dx: 'SEBORRHOEIC KERATOSIS, reticulated type' }
};
const skSub = (v) => SK_SUBTYPE[v.skSubtype] || SK_SUBTYPE.Acanthotic;

const NAEVUS_LOCATION = {
  Intradermal: 'nests and cords of naevus cells confined to the dermis, without a junctional component',
  Compound: 'nests of naevus cells at the dermo-epidermal junction and within the dermis',
  Junctional: 'nests of naevus cells confined to the dermo-epidermal junction'
};
export const NAEVUS_BLAND = 'The melanocytes mature with depth and there is no cytological atypia or mitotic activity.';
const NAEVUS_ATYPIA = 'There is mild architectural disorder and mild random cytological atypia of the melanocytes. The melanocytes mature with depth and there is no mitotic activity.';
const CONGENITAL = 'Naevus cells extend around adnexal structures and neurovascular bundles in the deeper dermis, in keeping with a congenital pattern.';

const AK_LEVEL = { 'KIN I': 'the lower third of the epidermis', 'KIN II': 'the lower two-thirds of the epidermis', 'KIN III': 'the full thickness of the epidermis' };

const NO_MALIGNANCY = 'There is no evidence of malignancy.';
const NO_DYSPLASIA = 'There is no evidence of dysplasia or malignancy.';

/** [sentences, negative closer] for the chosen lesion type. */
function lesionSentences(v) {
  const type = dash(v.lesionType || SK);
  switch (type) {
    case SK: {
      const sub = skSub(v);
      return [[SK_OPEN, sub.sentence, SK_BLAND, sub.dermis, `The features are those of ${sub.name}.`], NO_DYSPLASIA];
    }
    case NAEVUS: {
      const nType = NAEVUS_LOCATION[v.naevusType] ? v.naevusType : 'Intradermal';
      const s = [`Sections show a piece of skin with ${NAEVUS_LOCATION[nType]}.`];
      if (v.congenitalPattern) s.push(CONGENITAL);
      s.push(v.dysplasticFeatures === 'Mild' ? NAEVUS_ATYPIA : NAEVUS_BLAND);
      s.push(`The findings are those of ${nType === 'Intradermal' ? 'an' : 'a'} ${nType.toLowerCase()} melanocytic naevus${v.congenitalPattern ? ' with congenital pattern' : ''}${v.dysplasticFeatures === 'Mild' ? ' with mild dysplastic features' : ''}.`);
      return [s, NO_MALIGNANCY];
    }
    case 'Skin tag / fibroepithelial polyp':
      return [[
        'Sections show a polypoid piece of skin covered by mildly acanthotic epidermis with a loose fibrovascular dermal core containing mature adipose tissue.',
        'The findings are those of a skin tag (fibroepithelial polyp).'
      ], NO_DYSPLASIA];
    case PG: {
      const s = [
        'Sections show a polypoid lesion composed of lobules of capillary-sized vessels lined by bland endothelial cells in an oedematous stroma with a mixed inflammatory infiltrate, surrounded by an epidermal collarette.'
      ];
      if (v.pgUlceration === 'Present') s.push('The surface is ulcerated and covered by fibrinopurulent exudate.');
      s.push('The findings are those of a pyogenic granuloma (lobular capillary haemangioma).');
      return [s, NO_MALIGNANCY];
    }
    case 'Dermatofibroma':
      return [[
        'Sections show a piece of skin with a poorly circumscribed dermal proliferation of bland spindle cells arranged in short fascicles, with entrapment of collagen bundles at the periphery.',
        'The overlying epidermis is acanthotic with basal hyperpigmentation.',
        'The findings are those of a dermatofibroma.'
      ], NO_MALIGNANCY];
    case 'Verruca vulgaris':
      return [[
        'Sections show a piece of skin with a papillomatous epidermis showing hyperkeratosis, parakeratosis, acanthosis and inward bending of the elongated rete ridges.',
        'Koilocytes with coarse keratohyaline granules are present in the upper epidermis.',
        'The findings are those of a verruca vulgaris.'
      ], NO_DYSPLASIA];
    case 'Molluscum contagiosum':
      return [[
        'Sections show a piece of skin with a cup-shaped, endophytic epidermal proliferation containing numerous large intracytoplasmic eosinophilic inclusions (molluscum bodies) in the upper layers.',
        'The findings are those of molluscum contagiosum.'
      ], NO_DYSPLASIA];
    case AK: {
      const grade = AK_LEVEL[v.akGrade] ? v.akGrade : 'KIN I';
      return [[
        `Sections show a piece of skin with parakeratosis and atypical keratinocytes showing nuclear enlargement and hyperchromasia confined to ${AK_LEVEL[grade]}, with sparing of the adnexal ostia.`,
        'The dermis shows solar elastosis.',
        `The findings are those of an actinic keratosis (${grade}).`
      ], 'There is no evidence of invasive malignancy.'];
    }
    case 'Neurofibroma':
      return [[
        'Sections show a piece of skin with a poorly circumscribed dermal proliferation of bland spindle cells with wavy nuclei, set in a loose collagenous and myxoid stroma containing scattered mast cells.',
        'There is no cytological atypia or mitotic activity.',
        'The findings are those of a neurofibroma.'
      ], NO_MALIGNANCY];
    case 'Haemangioma':
      return [[
        'Sections show a piece of skin with a dermal proliferation of dilated, thin-walled vascular channels lined by bland flattened endothelial cells and filled with blood.',
        'There is no endothelial atypia.',
        'The findings are those of a haemangioma.'
      ], NO_MALIGNANCY];
    case 'Keloid / hypertrophic scar':
      return [[
        'Sections show a piece of skin with a dermal proliferation of thick, glassy, hyalinised collagen bundles and fibroblasts beneath a flattened epidermis, with loss of adnexal structures.',
        'The findings are those of a keloid / hypertrophic scar.'
      ], NO_MALIGNANCY];
    case 'Xanthelasma':
      return [[
        'Sections show a piece of skin with aggregates of foamy histiocytes within the superficial dermis, around vessels and adnexal structures.',
        'There is no cytological atypia.',
        'The findings are those of a xanthelasma.'
      ], NO_MALIGNANCY];
    case 'Chondrodermatitis nodularis helicis':
      return [[
        'Sections show a piece of skin with a central epidermal ulcer covered by fibrinous crust, beneath which the dermis shows fibrinoid degeneration of collagen and granulation tissue extending to the underlying auricular cartilage, which shows degenerative change.',
        'The findings are those of chondrodermatitis nodularis helicis.'
      ], NO_MALIGNANCY];
    case MALIGNANT:
      return [['Sections show an atypical proliferation with features suspicious for malignancy; see comment.'], ''];
    default:
      return [['Sections show a piece of skin with a benign lesion; see additional description.'], NO_MALIGNANCY];
  }
}

const MARGIN_MICRO = {
  'Completely excised': 'The lesion is completely excised',
  'Lesion extends to the edge of the shave': 'The lesion extends to the edge of the shave.',
  'Lesion extends to the lateral margin': 'The lesion extends to the lateral margin.',
  'Involves deep margin': 'The lesion involves the deep margin.'
};

/** "The lesion is completely excised with a closest margin of 2 mm." / "The lesion extends to the edge of the shave." / ''. */
export function marginSentence(v) {
  const status = dash(v.marginStatus || '');
  if (status === 'Completely excised') {
    const mm = isExcision(v) ? mmPhrase(v.closestMargin) : '';
    return `${MARGIN_MICRO[status]}${mm ? ` with a closest margin of ${mm}` : ''}.`;
  }
  return MARGIN_MICRO[status] || '';
}

export function microscopy(part) {
  const v = part.values;
  const [sentences, closer] = lesionSentences(v);
  const s = [...sentences];
  const margin = marginSentence(v);
  if (margin && !isMalignant(v)) s.push(margin);
  if (closer) s.push(closer);
  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const MAIN = {
  'Skin tag / fibroepithelial polyp': 'SKIN TAG (FIBROEPITHELIAL POLYP)',
  [PG]: 'PYOGENIC GRANULOMA (LOBULAR CAPILLARY HAEMANGIOMA)',
  Dermatofibroma: 'DERMATOFIBROMA',
  'Verruca vulgaris': 'VERRUCA VULGARIS',
  'Molluscum contagiosum': 'MOLLUSCUM CONTAGIOSUM',
  Neurofibroma: 'NEUROFIBROMA',
  Haemangioma: 'HAEMANGIOMA',
  'Keloid / hypertrophic scar': 'KELOID / HYPERTROPHIC SCAR',
  Xanthelasma: 'XANTHELASMA',
  'Chondrodermatitis nodularis helicis': 'CHONDRODERMATITIS NODULARIS HELICIS',
  [MALIGNANT]: 'MALIGNANT / ATYPICAL LESION'
};

/** "completely excised (closest margin 2 mm)" / "lesion extends to the edge of the shave" / ''. */
export function marginClause(v) {
  const status = dash(v.marginStatus || '');
  if (status === 'Completely excised') {
    const mm = isExcision(v) ? mmPhrase(v.closestMargin) : '';
    return `completely excised${mm ? ` (closest margin ${mm})` : ''}`;
  }
  if (status === 'Lesion extends to the edge of the shave') return 'lesion extends to the edge of the shave';
  if (status === 'Lesion extends to the lateral margin') return 'lesion extends to the lateral margin';
  if (status === 'Involves deep margin') return 'lesion involves the deep margin';
  return '';
}

export function diagnosis(part) {
  const v = part.values;
  const type = dash(v.lesionType || SK);
  const clauses = [];
  if (type === SK) {
    clauses.push(skSub(v).dx);
  } else if (type === NAEVUS) {
    const nType = NAEVUS_LOCATION[v.naevusType] ? v.naevusType : 'Intradermal';
    clauses.push(`${nType.toUpperCase()} MELANOCYTIC NAEVUS${v.congenitalPattern ? ', congenital pattern' : ''}`);
    clauses.push(v.dysplasticFeatures === 'Mild' ? 'mild dysplastic features' : 'no atypical features');
  } else if (type === AK) {
    clauses.push(`ACTINIC KERATOSIS (${AK_LEVEL[v.akGrade] ? v.akGrade : 'KIN I'})`);
  } else if (type === PG) {
    clauses.push(MAIN[PG]);
    if (v.pgUlceration === 'Present') clauses.push('ulcerated');
  } else {
    clauses.push(MAIN[type] || type.toUpperCase());
  }
  if (isMalignant(v)) clauses.push('see comment');
  else {
    const m = marginClause(v);
    if (m) clauses.push(m);
  }
  const site = stripDot(v.specimenName);
  return `(${part.label}) SKIN, ${site ? `${site}, ` : ''}${proc(v).word} - ${clauses.join('; ')}`;
}

// ---------- case-level flags (drive the schema snippets) ----------

const AT_MARGIN = ['Lesion extends to the edge of the shave', 'Lesion extends to the lateral margin', 'Involves deep margin'];

/** `akMargin` when any part is an actinic keratosis reaching a margin (compound rule, so a case-level flag). */
export function flags(parts) {
  const hit = parts.some((p) => dash(p.values.lesionType) === AK && AT_MARGIN.includes(dash(p.values.marginStatus || '')));
  return hit ? ['akMargin'] : [];
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, flags };
