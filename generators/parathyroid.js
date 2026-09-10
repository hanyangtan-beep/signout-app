// Parathyroid excision generator. Pure functions: (part, ctx) -> string.
//   specimenName "Right superior parathyroid, excision"
//   macro        "(A) Received in formalin is a tan, smooth, encapsulated nodule labelled right superior parathyroid, weighing 450 mg and measuring 1.2 x 0.8 x 0.5 cm. All embedded in 2 blocks."
//   blockKey     "(A) (1-2) Parathyroid, all embedded."
//   microscopy   "(A) Sections show hypercellular parathyroid tissue composed predominantly of chief cells ... The features are in keeping with a parathyroid adenoma."
//   diagnosis    "(A) PARATHYROID, right superior, excision - In keeping with ADENOMA"
// Atypical tumour / carcinoma print a short capitalised line only; the schema snippet
// `parathyroid_cancer_template` adds the comment recommending the QMH cancer template.
// Wording is protected by tests/parathyroid.test.js — change it only deliberately.

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

function sizeText(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

/** "450 mg" / "1.2 g": a bare number is read as mg when >= 10, otherwise g. */
export function weightText(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/[a-z]/i.test(s)) return s.replace(/\s*(mg|g)\b/i, (m, u) => ` ${u.toLowerCase()}`).replace(/\s+/g, ' ');
  const n = num(s);
  if (n === null) return '';
  return n >= 10 ? `${fmt(n)} mg` : `${fmt(n)} g`;
}

export const NOT_PARATHYROID = {
  'Not parathyroid - thyroid tissue': 'THYROID TISSUE',
  'Not parathyroid - lymph node': 'LYMPH NODE',
  'Not parathyroid - thymic tissue': 'THYMIC TISSUE'
};
export const isNotParathyroid = (v) => v.diagnosis in NOT_PARATHYROID;
export const isMalignantOrAtypical = (v) => v.diagnosis === 'Atypical parathyroid tumour - see comment' || v.diagnosis === 'Parathyroid carcinoma - see comment';

// ---------- specimen ----------

/** "right superior", "ectopic (intrathymic)" or '' when not specified. */
export function siteWord(v) {
  const site = v.site || '';
  if (site === 'Not specified' || !site) return '';
  if (/^Ectopic/.test(site)) {
    const o = String(v.siteOther || '').trim();
    return o ? `ectopic (${lc1(o)})` : 'ectopic';
  }
  return lc1(site);
}

export function specimenName(part) {
  const v = part.values;
  const site = siteWord(v);
  const name = site ? `${site.charAt(0).toUpperCase()}${site.slice(1)} parathyroid` : 'Parathyroid';
  return `${name}, excision`;
}

// ---------- macroscopic description ----------

const APPEARANCE = {
  'Tan, smooth, encapsulated': 'a tan, smooth, encapsulated nodule',
  Lobulated: 'a tan, lobulated nodule',
  Cystic: 'a tan nodule with a cystic cut surface'
};

export function macro(part, ctx) {
  if (ctx.options.macro === false) return '';
  const v = part.values;
  const site = siteWord(v);
  const measures = [];
  const w = weightText(v.weight);
  if (w) measures.push(`weighing ${w}`);
  const dims = sizeText(v.dimensions);
  if (dims) measures.push(`measuring ${dims}`);
  const what = APPEARANCE[v.appearance] || 'a tan nodule';
  const label = site ? ` labelled ${site} parathyroid` : ' labelled parathyroid';
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 2));
  return `(${part.label}) Received in formalin is ${what}${label}${measures.length ? `, ${listJoin(measures)}` : ''}. All embedded in ${blocks} block${blocks === 1 ? '' : 's'}.`;
}

export function blockKey(part, ctx) {
  if (ctx.options.macro === false) return '';
  const blocks = Math.max(1, Math.round(num(part.values.blocks) ?? 2));
  const range = blocks === 1 ? '(1)' : `(1-${blocks})`;
  return `(${part.label}) ${range} Parathyroid, all embedded.`;
}

// ---------- microscopy ----------

const ARCH = { 'solid sheets': 'solid sheets', nests: 'nests', trabeculae: 'trabecular patterns', follicles: 'follicular structures' };

function cellSentences(v) {
  const arch = (Array.isArray(v.architecture) ? v.architecture : []).map((a) => ARCH[a]).filter(Boolean);
  const arranged = arch.length ? ` arranged in ${listJoin(arch)}` : '';
  switch (v.cellType) {
    case 'Oxyphil cells':
      return [`Sections show hypercellular parathyroid tissue composed predominantly of oxyphil cells${arranged}.`,
        'The oxyphil cells have abundant granular eosinophilic cytoplasm and small round nuclei.'];
    case 'Mixed':
      return [`Sections show hypercellular parathyroid tissue composed of an admixture of chief cells and oxyphil cells${arranged}.`,
        'The chief cells have small central nuclei with stippled chromatin and moderate eosinophilic cytoplasm, and the oxyphil cells have abundant granular eosinophilic cytoplasm.'];
    case 'Water-clear cells':
      return [`Sections show hypercellular parathyroid tissue composed of water-clear cells with abundant clear cytoplasm and small central nuclei${arranged}.`];
    default:
      return [`Sections show hypercellular parathyroid tissue composed predominantly of chief cells${arranged}.`,
        'The chief cells have small central nuclei with stippled chromatin and moderate eosinophilic cytoplasm.',
        'Scattered oxyphil cells with abundant granular eosinophilic cytoplasm are also present.'];
  }
}

function fatSentence(v, rim) {
  const cmp = rim ? ' compared with the rim' : '';
  if (v.stromalFat === 'Markedly decreased') return `The adipose tissue content within the lesion is markedly decreased${cmp}.`;
  if (v.stromalFat === 'Decreased') return `The adipose tissue content within the lesion is decreased${cmp}.`;
  if (v.stromalFat === 'Normal') return 'The stromal adipose tissue content is within normal limits.';
  return '';
}

function invasionSentences(v) {
  const inv = v.invasion === 'Present';
  const mit = v.mitoses === 'Increased';
  if (!inv && !mit) return ['There is no evidence of capsular invasion, vascular invasion or increased mitotic activity.'];
  const out = [];
  out.push(inv ? 'Capsular and/or vascular invasion is present.' : 'There is no evidence of capsular or vascular invasion.');
  out.push(mit ? 'Mitotic activity is increased.' : 'Mitotic activity is not increased.');
  return out;
}

function conclusion(v) {
  switch (v.diagnosis) {
    case 'Adenoma': return 'The features are in keeping with a parathyroid adenoma.';
    case 'Hyperplasia': return 'The features are in keeping with parathyroid hyperplasia.';
    case 'Atypical parathyroid tumour - see comment': return 'The features are those of an atypical parathyroid tumour; see comment.';
    case 'Parathyroid carcinoma - see comment': return 'The features are those of parathyroid carcinoma; see comment.';
    default: return '';
  }
}

const blockRef = (ref) => {
  const r = String(ref || '').trim().replace(/^\(|\)$/g, '');
  return r ? ` (block ${r})` : '';
};

export function microscopy(part) {
  const v = part.values;
  const s = [];
  if (isNotParathyroid(v)) {
    if (v.diagnosis === 'Not parathyroid - thyroid tissue') s.push('Sections show thyroid tissue composed of colloid-filled follicles lined by bland follicular cells.');
    else if (v.diagnosis === 'Not parathyroid - lymph node') s.push('Sections show a lymph node with preserved architecture and reactive follicles.');
    else s.push('Sections show thymic tissue with lymphocytes, epithelial cells and Hassall corpuscles.');
    s.push('No parathyroid tissue is identified.');
  } else if (v.diagnosis === 'Normocellular parathyroid') {
    s.push('Sections show normocellular parathyroid tissue composed of chief cells and scattered oxyphil cells with preserved interspersed stromal adipose tissue.');
    s.push('There is no evidence of adenoma or hyperplasia.');
  } else {
    s.push(...cellSentences(v));
    const rim = v.rim === 'Identified';
    if (rim) s.push('A thin rim of normal parathyroid tissue with abundant interspersed adipocytes is identified at the periphery.');
    else if (v.rim === 'Not identified') s.push('No rim of normal parathyroid tissue is identified.');
    const fat = fatSentence(v, rim);
    if (fat) s.push(fat);
    s.push(...invasionSentences(v));
  }
  if (v.frozen === 'Yes - confirmed parathyroid') {
    s.push(isNotParathyroid(v)
      ? `The paraffin sections do not confirm the intraoperative frozen section diagnosis of parathyroid tissue${blockRef(v.fsBlock)}.`
      : `The paraffin sections confirm the intraoperative frozen section diagnosis of parathyroid tissue${blockRef(v.fsBlock)}.`);
  }
  const c = conclusion(v);
  if (c) s.push(c);
  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

/** "PARATHYROID, right superior, excision" (site omitted when not specified). */
export function organPhrase(part, ctx) {
  const organ = ctx?.schema?.organ || 'PARATHYROID';
  const site = siteWord(part.values);
  return `${organ}, ${site ? `${site}, ` : ''}excision`;
}

export function diagnosis(part, ctx) {
  const v = part.values;
  let main;
  switch (v.diagnosis) {
    case 'Hyperplasia': main = 'In keeping with HYPERPLASIA'; break;
    case 'Normocellular parathyroid': main = 'NORMOCELLULAR PARATHYROID TISSUE'; break;
    case 'Atypical parathyroid tumour - see comment': main = 'ATYPICAL PARATHYROID TUMOUR; see comment'; break;
    case 'Parathyroid carcinoma - see comment': main = 'PARATHYROID CARCINOMA; see comment'; break;
    default:
      main = isNotParathyroid(v) ? `${NOT_PARATHYROID[v.diagnosis]}; no parathyroid tissue identified` : 'In keeping with ADENOMA';
  }
  return `(${part.label}) ${organPhrase(part, ctx)} - ${main}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
