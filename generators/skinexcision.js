import { stripDot } from './_house.js';
// Skin lesion excision with margins (BCC / keratoacanthoma / benign lesions) generator.
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
  return site ? `Skin, ${site}, excision` : 'Skin, excision';
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

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = [];
  const ellipse = sizePhrase(v.ellipseSize);
  const lesion = sizePhrase(v.lesionSize);
  const what = APPEARANCE[v.lesionAppearance] || (v.lesionAppearance ? `a ${lc1(stripDot(v.lesionAppearance))}` : 'a lesion');
  s.push(`Received in formalin is an ellipse of skin${ellipse ? ` measuring ${ellipse}` : ''} bearing ${what}${lesion ? ` measuring ${lesion}` : ''}.`);
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
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 3));
  const plural = blocks === 1 ? '' : 's';
  if (v.blockScheme === 'Representative sections') s.push(`Representative sections in ${blocks} block${plural}.`);
  else s.push(`The ellipse is serially sliced and all embedded in ${blocks} block${plural}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 3));
  const range = (a, b) => (a === b ? `(${a})` : `(${a}-${b})`);
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
  'Intradermal naevus': 'INTRADERMAL NAEVUS',
  'Compound naevus': 'COMPOUND NAEVUS',
  Dermatofibroma: 'DERMATOFIBROMA',
  'Pyogenic granuloma': 'PYOGENIC GRANULOMA (LOBULAR CAPILLARY HAEMANGIOMA)',
  'Actinic keratosis': 'ACTINIC KERATOSIS',
  'Squamous cell carcinoma in situ (Bowen disease)': 'SQUAMOUS CELL CARCINOMA IN SITU (BOWEN DISEASE)',
  'Invasive SCC - see comment': 'INVASIVE SQUAMOUS CELL CARCINOMA',
  'Melanoma - see comment': 'MELANOMA',
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
    clauses.push(marginClause(v));
  }
  const site = sitePhrase(v);
  return `(${part.label}) SKIN, ${site ? `${site}, ` : ''}excision - ${clauses.join('; ')}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
