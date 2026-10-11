import { stripDot } from './_house.js';
// Skin cyst (epidermal / pilar / dermoid cyst excision) generator. Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Skin, right axilla seb cyst, excision"
//   macro      "(A) Received in formalin is an ellipse of skin with an underlying nodule. The ellipse of skin
//               measures 3 x 1.5 cm and the nodule measures 1.5 cm. The deep surface is inked. Sectioning shows
//               a cyst containing cheesy keratinous material. All embedded in 2 blocks."
//   blockKey   "(A) (1-2) Skin ellipse with nodule, cross-sections."
//   microscopy "(A) Sections show a piece of hair-bearing skin, with the dermis containing a cyst lined by
//               stratified squamous epithelium with a granular layer, without adnexal skin structures. Abundant
//               lamellated keratin is seen within the cyst. The findings are those of an epidermal cyst. There is
//               no evidence of dysplasia or malignancy."
//   diagnosis  "(A) SKIN, right axilla seb cyst, excision - EPIDERMAL CYST"
// House wording from docs/case-mix-analysis.md §4.8. Neoplasia options give a short diagnosis line only; the
// schema snippet `skin_cyst_cancer_template` adds the comment pointing to the QMH skin cancer template.
// Wording is protected by tests/skincyst.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const dash = (s) => String(s || '').replace(/[\u2013\u2014]/g, '-');

export const NEGATIVE = 'No evidence of malignancy';
export const hasNeoplasia = (v) => !!v.neoplasia && v.neoplasia !== NEGATIVE;
export const NO_LINING = 'Ruptured cyst with no residual lining';

/** "3x1.5" -> "3 x 1.5 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

/** "right axilla seb cyst" — site then clinical label, whichever are filled. */
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

const CONTENTS = {
  'Cheesy keratinous material': 'Sectioning shows a cyst containing cheesy keratinous material.',
  'Hair and sebaceous material': 'Sectioning shows a cyst containing hair and sebaceous material.',
  Ruptured: 'Sectioning shows a ruptured cyst with keratinous debris and surrounding fibrosis.'
};

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = ['Received in formalin is an ellipse of skin with an underlying nodule.'];
  const ellipse = sizePhrase(v.ellipseSize);
  const nodule = sizePhrase(v.noduleSize);
  if (ellipse && nodule) s.push(`The ellipse of skin measures ${ellipse} and the nodule measures ${nodule}.`);
  else if (ellipse) s.push(`The ellipse of skin measures ${ellipse}.`);
  else if (nodule) s.push(`The nodule measures ${nodule}.`);
  if (v.deepInked === 'Inked') s.push('The deep surface is inked.');
  if (CONTENTS[v.cystContents]) s.push(CONTENTS[v.cystContents]);
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 2));
  const plural = blocks === 1 ? '' : 's';
  if (v.blockScheme === 'Representative sections') s.push(`Representative sections in ${blocks} block${plural}.`);
  else s.push(`All embedded in ${blocks} block${plural}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 2));
  const range = blocks === 1 ? '(1)' : `(1-${blocks})`;
  const what = v.blockScheme === 'Representative sections' ? 'Nodule, representative sections.' : 'Skin ellipse with nodule, cross-sections.';
  return `(${part.label}) ${range} ${what}`;
}

// ---------- microscopy ----------

const SKIN_OPEN = 'Sections show a piece of hair-bearing skin, with the dermis containing a cyst';

const TYPE_MICRO = {
  'Epidermal cyst': [
    `${SKIN_OPEN} lined by stratified squamous epithelium with a granular layer, without adnexal skin structures.`,
    'Abundant lamellated keratin is seen within the cyst.',
    'The findings are those of an epidermal cyst.'
  ],
  'Pilar (trichilemmal) cyst': [
    `${SKIN_OPEN} lined by stratified squamous epithelium showing abrupt trichilemmal-type keratinisation without a granular layer.`,
    'The cyst contains dense compact eosinophilic keratin.',
    'The findings are those of a pilar (trichilemmal) cyst.'
  ],
  'Dermoid cyst': [
    `${SKIN_OPEN} lined by stratified squamous epithelium with a granular layer and adnexal structures, including sebaceous glands and hair follicles, within the cyst wall.`,
    'Lamellated keratin and hair shafts are seen within the cyst.',
    'The findings are those of a dermoid cyst.'
  ],
  'Hybrid cyst': [
    `${SKIN_OPEN} lined by stratified squamous epithelium showing both epidermal-type keratinisation with a granular layer and abrupt trichilemmal-type keratinisation.`,
    'The cyst contains lamellated and compact keratin.',
    'The findings are those of a hybrid cyst.'
  ],
  Steatocystoma: [
    `${SKIN_OPEN} lined by thin stratified squamous epithelium with a corrugated eosinophilic cuticle and sebaceous lobules within the cyst wall.`,
    'The cyst is largely empty.',
    'The findings are those of a steatocystoma.'
  ]
};

// §4.8 second paragraph (ruptured cyst, no residual lining, no granulomas) — verbatim house wording.
const NO_LINING_INFLAMED = [
  'Sections show a piece of skin with superficial subcutis.',
  'The dermis shows haemorrhage with focal refractile foreign material surrounded by patchy lymphocytic infiltrates with haemosiderin deposits.',
  'No residual lamellated keratin material or cyst epithelium is identified.',
  'Please correlate with clinical findings.'
];

const NO_LINING_GRANULOMA = [
  'Sections show a piece of skin with superficial subcutis.',
  'The dermis shows a foreign body granulomatous reaction to lamellated keratin, with multinucleated giant cells, lymphocytes, haemosiderin-laden macrophages and fibrosis.',
  'No residual cyst epithelium is identified.',
  'The findings are those of a ruptured cyst with foreign body granulomatous reaction.'
];

const NEOPLASIA_MICRO = {
  'Proliferating trichilemmal tumour - see comment': 'The cyst wall shows a lobulated proliferation of squamous epithelium with trichilemmal-type keratinisation, in keeping with a proliferating trichilemmal tumour; see comment.',
  'Malignancy - see comment': 'A malignant epithelial proliferation is identified arising in association with the cyst; see comment.'
};

export function microscopy(part) {
  const v = part.values;
  const s = [];
  const noLining = v.cystType === NO_LINING;
  const ruptured = v.rupture === 'Present';

  if (noLining) {
    s.push(...(ruptured ? NO_LINING_GRANULOMA : NO_LINING_INFLAMED));
  } else {
    s.push(...(TYPE_MICRO[v.cystType] || TYPE_MICRO['Epidermal cyst']));
    if (ruptured) s.push('The cyst is focally ruptured with a surrounding foreign body granulomatous reaction to keratin.');
  }
  if (v.giantCells === 'Present') s.push('Foreign body type multinucleated giant cells are present.');
  if (v.acuteInflammation === 'Abscess formation') s.push('There is acute inflammation with abscess formation.');
  else if (v.acuteInflammation === 'Present') s.push('There is acute inflammation.');

  if (hasNeoplasia(v)) s.push(NEOPLASIA_MICRO[dash(v.neoplasia)] || `There is ${lc1(dash(v.neoplasia))}.`);

  if (v.excision === 'Incomplete') s.push('The cyst extends to the excision margin.');
  else if (v.excision === 'Not assessable') s.push('The completeness of excision cannot be assessed.');

  if (!hasNeoplasia(v)) {
    if (noLining && !ruptured) s.push('There is no evidence of granulomatous inflammation or malignancy.');
    else if (noLining) s.push('There is no evidence of malignancy.');
    else s.push('There is no evidence of dysplasia or malignancy.');
  }

  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const MAIN = {
  'Epidermal cyst': 'EPIDERMAL CYST',
  'Pilar (trichilemmal) cyst': 'PILAR (TRICHILEMMAL) CYST',
  'Dermoid cyst': 'DERMOID CYST',
  'Hybrid cyst': 'HYBRID CYST',
  Steatocystoma: 'STEATOCYSTOMA'
};

const NEOPLASIA_DX = {
  'Proliferating trichilemmal tumour - see comment': 'PROLIFERATING TRICHILEMMAL TUMOUR',
  'Malignancy - see comment': 'MALIGNANCY ARISING IN CYST'
};

export function diagnosis(part) {
  const v = part.values;
  const clauses = [];
  const noLining = v.cystType === NO_LINING;
  const ruptured = v.rupture === 'Present';

  if (hasNeoplasia(v)) {
    clauses.push(NEOPLASIA_DX[dash(v.neoplasia)] || dash(v.neoplasia).toUpperCase());
    if (!noLining) clauses.push(`arising in ${lc1(MAIN[v.cystType] || 'EPIDERMAL CYST').toLowerCase()}`);
  } else if (noLining) {
    clauses.push(ruptured ? 'RUPTURED CYST WITH FOREIGN BODY GRANULOMATOUS REACTION' : 'CHRONIC INFLAMMATION (see microscopic examination)');
    clauses.push('no residual cyst lining identified');
  } else {
    clauses.push(MAIN[v.cystType] || 'EPIDERMAL CYST');
    if (ruptured) clauses.push('ruptured with foreign body granulomatous reaction');
  }
  if (v.acuteInflammation === 'Abscess formation') clauses.push('abscess formation');
  else if (v.acuteInflammation === 'Present') clauses.push('acute inflammation');
  if (v.excision === 'Incomplete') clauses.push('incompletely excised');
  else if (v.excision === 'Not assessable') clauses.push('completeness of excision not assessable');
  if (hasNeoplasia(v)) clauses.push('see comment');

  const site = sitePhrase(v);
  return `(${part.label}) SKIN, ${site ? `${site}, ` : ''}excision - ${clauses.join('; ')}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
