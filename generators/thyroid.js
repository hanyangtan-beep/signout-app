// Thyroid benign resection generator (hemithyroidectomy / total thyroidectomy / isthmusectomy).
// Pure functions: (part, ctx) -> string.
//   specimenName "Right thyroid lobe, hemithyroidectomy"
//   macro        "(A) Received in formalin is a right hemithyroidectomy specimen weighing 32 g and measuring 5 x 3.5 x 2.5 cm. ..."
//   blockKey     "(A) (1) Isthmic margin. (2-6) Dominant nodule with capsule. (7-8) Background thyroid."
//   microscopy   "(A) Sections show the thyroid gland is composed of multiple variably sized nodules ... There is no evidence of malignancy."
//   diagnosis    "(A) THYROID GLAND, right, hemithyroidectomy - NODULAR HYPERPLASIA"
// Malignant options print a short capitalised line only; the schema snippet `thyroid_cancer_template`
// adds the comment recommending the QMH thyroid cancer template.
// Wording is protected by tests/thyroid.test.js — change it only deliberately.

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
const article = (s) => (/^[aeiou]/i.test(s) ? 'an' : 'a');

/** "5 x 3.5 x 2.5 cm" from free text; '' when blank. */
function sizeText(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

export const MALIGNANT = ['Papillary thyroid carcinoma - see comment', 'Follicular carcinoma - see comment'];
export const isMalignant = (v) => MALIGNANT.includes(v.diagnosis);
const isNIFTP = (v) => /NIFTP/.test(v.diagnosis || '');
const isOther = (v) => v.diagnosis === 'Other - see comment';
/** Benign entities close with "There is no evidence of malignancy." */
export const isBenign = (v) => !isMalignant(v) && !isNIFTP(v) && !isOther(v);

// ---------- specimen ----------

/** Laterality word for the diagnosis line: "right", "right lobe and isthmus", "isthmus" or '' (total). */
export function sideWord(v) {
  switch (v.specimenName) {
    case 'Right lobe': return 'right';
    case 'Left lobe': return 'left';
    case 'Right lobe and isthmus': return 'right lobe and isthmus';
    case 'Left lobe and isthmus': return 'left lobe and isthmus';
    case 'Isthmus': return 'isthmus';
    default: return '';
  }
}

const procedureWord = (v) => lc1((v.procedure || 'Hemithyroidectomy').trim());

export function specimenName(part) {
  const v = part.values;
  let organ;
  switch (v.specimenName) {
    case 'Right lobe': organ = 'Right thyroid lobe'; break;
    case 'Left lobe': organ = 'Left thyroid lobe'; break;
    case 'Right lobe and isthmus': organ = 'Right thyroid lobe and isthmus'; break;
    case 'Left lobe and isthmus': organ = 'Left thyroid lobe and isthmus'; break;
    case 'Isthmus': organ = 'Thyroid isthmus'; break;
    case 'Total thyroid': organ = 'Thyroid'; break;
    default: organ = v.specimenName || 'Thyroid';
  }
  return `${organ}, ${procedureWord(v)}`;
}

// ---------- macroscopic description ----------

const APPEARANCE = {
  'Colloid, glistening': 'well-circumscribed colloid',
  'Solid tan': 'well-circumscribed solid tan',
  'Cystic-haemorrhagic': 'well-circumscribed cystic and haemorrhagic',
  Calcified: 'well-circumscribed, partly calcified',
  Encapsulated: 'encapsulated'
};

function receivedPhrase(v) {
  const proc = procedureWord(v);
  const side = /^Right/.test(v.specimenName || '') ? 'right ' : /^Left/.test(v.specimenName || '') ? 'left ' : '';
  let phrase = `${article(side || proc)} ${side}${proc} specimen`;
  if (/and isthmus$/.test(v.specimenName || '')) phrase += ` comprising the ${lc1(v.specimenName)}`;
  return phrase;
}

export function macro(part, ctx) {
  if (ctx.options.macro === false) return '';
  const v = part.values;
  const sentences = [];

  const measures = [];
  const w = num(v.weight);
  if (w !== null) measures.push(`weighing ${fmt(w)} g`);
  const dims = sizeText(v.dimensions);
  if (dims) measures.push(`measuring ${dims}`);
  sentences.push(`Received in formalin is ${receivedPhrase(v)}${measures.length ? ` ${listJoin(measures)}` : ''}.`);

  if (v.capsule === 'Focally disrupted') sentences.push('The capsule is focally disrupted.');
  else if (v.capsule) sentences.push('The capsule is intact.');

  const count = num(v.noduleCount);
  const look = APPEARANCE[v.noduleAppearance] || 'well-circumscribed';
  const size = sizeText(v.noduleSize);
  const site = String(v.noduleSite || '').trim();
  const noduleDesc = `${look} nodule${size ? ` measuring ${size}` : ''}${site ? ` in the ${lc1(site).replace(/^the /, '')}` : ''}`;
  if (count === 0) sentences.push('Sectioning shows no discrete nodule.');
  else if (count === null || count === 1) sentences.push(`Sectioning shows ${article(look)} ${noduleDesc}.`);
  else sentences.push(`Sectioning shows ${fmt(count)} nodules, the largest ${article(look)} ${noduleDesc}.`);

  if (v.background === 'Nodular') sentences.push('The background parenchyma is nodular.');
  else if (/thyroiditis/i.test(v.background || '')) sentences.push('The background parenchyma is pale and firm.');
  else if (v.background) sentences.push('The background parenchyma is unremarkable.');

  if (v.grossIncidental === 'Parathyroid') sentences.push('A possible parathyroid gland is identified on the posterior surface and submitted.');
  else if (v.grossIncidental === 'Lymph node') sentences.push('A lymph node is identified in the perithyroidal soft tissue and submitted.');
  else if (v.grossIncidental === 'Both') sentences.push('A possible parathyroid gland and a perithyroidal lymph node are identified and submitted.');

  const total = totalBlocks(v);
  sentences.push(`Representative sections in ${total} block${total === 1 ? '' : 's'}.`);
  return `(${part.label}) ${sentences.join(' ')}`;
}

// ---------- block key ----------

const extraBlocks = (v) => (v.grossIncidental === 'Both' ? 2 : v.grossIncidental === 'Parathyroid' || v.grossIncidental === 'Lymph node' ? 1 : 0);
const thyroidBlocks = (v) => Math.max(1, Math.round(num(v.blocks) ?? 8));
const totalBlocks = (v) => thyroidBlocks(v) + extraBlocks(v);
const range = (a, b) => (a === b ? `(${a})` : `(${a}-${b})`);

export function blockKey(part, ctx) {
  if (ctx.options.macro === false) return '';
  const v = part.values;
  const n = thyroidBlocks(v);
  const items = [];
  let next = 1;
  if (v.isthmicMarginBlock && n >= 1) {
    items.push(`${range(1, 1)} Isthmic margin.`);
    next = 2;
  }
  const remaining = n - next + 1;
  const count = num(v.noduleCount);
  if (remaining > 0) {
    if (count === 0) {
      items.push(`${range(next, n)} Thyroid parenchyma.`);
    } else {
      const bg = remaining >= 4 ? 2 : remaining >= 2 ? 1 : 0;
      const noduleEnd = n - bg;
      items.push(`${range(next, noduleEnd)} Dominant nodule with capsule.`);
      if (bg) items.push(`${range(noduleEnd + 1, n)} Background thyroid.`);
    }
    next = n + 1;
  }
  if (v.grossIncidental === 'Parathyroid' || v.grossIncidental === 'Both') items.push(`${range(next, next)} Parathyroid.`), next++;
  if (v.grossIncidental === 'Lymph node' || v.grossIncidental === 'Both') items.push(`${range(next, next)} Lymph node.`), next++;
  return `(${part.label}) ${items.join(' ')}`;
}

// ---------- microscopy ----------

const FOLLICLES = {
  'Macrofollicular with colloid': 'colloid-filled follicles',
  Microfollicular: 'microfollicles containing scant colloid',
  Mixed: 'variably sized macro- and microfollicles'
};
const follicles = (v) => FOLLICLES[v.follicularPattern] || 'colloid-filled follicles';
const polsters = (v) => (v.sanderson === 'Present' ? ', some with Sanderson polsters present' : '');

const DEGEN = {
  haemorrhage: 'haemorrhage',
  'hyalinised fibrosis': 'hyalinised fibrosis',
  'cystic change': 'cystic change',
  'dystrophic calcification': 'dystrophic calcification',
  'cholesterol clefts': 'cholesterol clefts'
};

function openingSentences(v) {
  switch (v.diagnosis) {
    case 'Hyperplastic (adenomatoid) nodule':
      return [`Sections show the thyroid is dominated by a single well-circumscribed nodule composed of ${follicles(v)}${polsters(v)}.`,
        'The follicular epithelium shows no atypia.'];
    case 'Follicular adenoma':
      return [`Sections show an encapsulated nodule composed of ${follicles(v)}${polsters(v)}, distinct from the surrounding thyroid.`,
        'The follicular cells have uniform round nuclei without atypia.'];
    case 'Diffuse hyperplasia (Graves disease)':
      return ['Sections show diffuse hyperplasia of the thyroid parenchyma with follicles lined by tall columnar cells showing papillary infoldings and peripheral scalloping of colloid.'];
    case 'Lymphocytic (Hashimoto) thyroiditis':
      return ['Sections show a diffuse lymphoplasmacytic infiltrate with germinal centre formation, follicular atrophy and Hurthle cell change of the follicular epithelium.'];
    case 'Non-invasive follicular thyroid neoplasm with papillary-like nuclear features (NIFTP)':
      return [`Sections show an encapsulated, well-demarcated nodule with a follicular growth pattern composed of ${follicles(v)}.`,
        'The lining cells show nuclear enlargement, clearing and grooves without papillae, psammoma bodies or necrosis.'];
    case 'Papillary thyroid carcinoma - see comment':
      return ['Sections show a papillary thyroid carcinoma; see comment.'];
    case 'Follicular carcinoma - see comment':
      return ['Sections show a follicular neoplasm with capsular and/or vascular invasion, in keeping with follicular carcinoma; see comment.'];
    case 'Other - see comment':
      return ['Sections show the thyroid; see comment.'];
    default:
      return [`Sections show the thyroid gland is composed of multiple variably sized nodules composed of ${follicles(v)}${polsters(v)}.`,
        'They are lined by follicular cells having round, hyperchromatic nuclei.'];
  }
}

function conclusion(v) {
  switch (v.diagnosis) {
    case 'Hyperplastic (adenomatoid) nodule': return 'The findings are those of a hyperplastic (adenomatoid) nodule.';
    case 'Follicular adenoma': return 'The features are those of a follicular adenoma.';
    case 'Diffuse hyperplasia (Graves disease)': return 'The features are those of diffuse hyperplasia, consistent with Graves disease.';
    case 'Lymphocytic (Hashimoto) thyroiditis': return 'The features are those of lymphocytic (Hashimoto) thyroiditis.';
    case 'Non-invasive follicular thyroid neoplasm with papillary-like nuclear features (NIFTP)':
      return 'The features are those of a non-invasive follicular thyroid neoplasm with papillary-like nuclear features (NIFTP).';
    case 'Nodular hyperplasia': return 'The findings are those of nodular hyperplasia.';
    default: return '';
  }
}

const blockRef = (ref) => {
  const r = String(ref || '').trim().replace(/^\(|\)$/g, '');
  return r ? ` in block (${r})` : '';
};

export function microscopy(part) {
  const v = part.values;
  const s = [...openingSentences(v)];
  const structural = !isMalignant(v) && !isOther(v);

  if (structural) {
    if (v.ptcNuclear === 'Present' && !isNIFTP(v)) s.push('Nuclear features of papillary carcinoma (nuclear enlargement, clearing, grooves and pseudoinclusions) are present.');
    else if (v.ptcNuclear === 'Not observed' && !isNIFTP(v)) s.push('Nuclear features of papillary carcinoma are not observed.');

    const degen = (Array.isArray(v.degenerative) ? v.degenerative : []).map((d) => DEGEN[d]).filter(Boolean);
    if (degen.length) s.push(`Areas of ${listJoin(degen)} are seen.`);

    if (v.noduleCapsule === 'Thin intact capsule') s.push('The dominant nodule is surrounded by a thin intact fibrous capsule.');
    else if (v.noduleCapsule === 'Thick capsule - no capsular or vascular invasion') s.push('The dominant nodule has a thick fibrous capsule; the entire capsule has been examined and shows no capsular or vascular invasion.');
    else if (isNIFTP(v)) s.push('The entire capsule has been examined and shows no capsular or vascular invasion.');

    if (v.diagnosis !== 'Lymphocytic (Hashimoto) thyroiditis') {
      if (v.thyroiditis === 'Focal') s.push('Focal lymphocytic infiltrates are present in the background thyroid.');
      else if (v.thyroiditis === 'Diffuse with germinal centres') s.push('The background thyroid shows a diffuse lymphocytic infiltrate with germinal centre formation.');
    }
    if (v.cCell === 'Present') s.push('C-cell hyperplasia is noted in the background thyroid.');
  }

  if (v.parathyroid === 'Normal') s.push(`A normal parathyroid gland is seen${blockRef(v.parathyroidBlock)}.`);
  else if (v.parathyroid === 'Nodular hyperplasia') s.push(`A parathyroid gland with features of nodular hyperplasia is seen${blockRef(v.parathyroidBlock)}.`);
  if (v.lymphNode === 'Benign') s.push('A benign lymph node has been sampled.');
  if (v.margin === 'Uninvolved' && structural) s.push('The isthmic margin is uninvolved.');

  const c = conclusion(v);
  if (c) s.push(c);
  if (isBenign(v)) s.push('There is no evidence of malignancy.');

  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const MAIN = {
  'Nodular hyperplasia': 'NODULAR HYPERPLASIA',
  'Hyperplastic (adenomatoid) nodule': 'HYPERPLASTIC (ADENOMATOID) NODULE',
  'Follicular adenoma': 'FOLLICULAR ADENOMA',
  'Diffuse hyperplasia (Graves disease)': 'DIFFUSE HYPERPLASIA (GRAVES DISEASE)',
  'Lymphocytic (Hashimoto) thyroiditis': 'LYMPHOCYTIC THYROIDITIS',
  'Non-invasive follicular thyroid neoplasm with papillary-like nuclear features (NIFTP)': 'NON-INVASIVE FOLLICULAR THYROID NEOPLASM WITH PAPILLARY-LIKE NUCLEAR FEATURES (NIFTP)',
  'Papillary thyroid carcinoma - see comment': 'PAPILLARY THYROID CARCINOMA; see comment',
  'Follicular carcinoma - see comment': 'FOLLICULAR CARCINOMA; see comment',
  'Other - see comment': 'SEE COMMENT'
};

/** "THYROID GLAND, right, hemithyroidectomy" (site omitted for a total thyroidectomy). */
export function organPhrase(part, ctx) {
  const v = part.values;
  const organ = ctx?.schema?.organ || 'THYROID GLAND';
  const side = sideWord(v);
  return `${organ}, ${side ? `${side}, ` : ''}${procedureWord(v)}`;
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const clauses = [MAIN[v.diagnosis] || 'NODULAR HYPERPLASIA'];
  if (!isMalignant(v) && !isOther(v)) {
    if (v.diagnosis !== 'Lymphocytic (Hashimoto) thyroiditis') {
      if (v.thyroiditis === 'Focal') clauses.push('focal lymphocytic thyroiditis');
      else if (v.thyroiditis === 'Diffuse with germinal centres') clauses.push('background lymphocytic thyroiditis');
    }
    if (v.cCell === 'Present') clauses.push('C-cell hyperplasia');
    if (isNIFTP(v)) clauses.push('no capsular or vascular invasion identified');
  }
  if (v.parathyroid === 'Normal') clauses.push('incidental normal parathyroid gland');
  else if (v.parathyroid === 'Nodular hyperplasia') clauses.push('incidental parathyroid gland with nodular hyperplasia');
  if (v.lymphNode === 'Benign') clauses.push('benign lymph node');
  return `(${part.label}) ${organPhrase(part, ctx)} - ${clauses.join('; ')}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
