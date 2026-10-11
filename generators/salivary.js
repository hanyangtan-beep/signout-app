// Salivary gland benign resection generator (parotidectomy / submandibular gland excision / minor gland excision).
// Pure functions: (part, ctx) -> string.
//   specimenName "Left parotid, superficial parotidectomy"
//   macro        "(A) Received in formalin is a superficial parotidectomy specimen measuring 4.5 x 3.5 x 2 cm and weighing 18 g. ..."
//   blockKey     "(A) (1-3) Nodule with closest margin. (4) Nodule with capsule. (5) Background gland."
//   microscopy   "(A) Sections show a well circumscribed, thinly encapsulated tumour composed of a mixture of epithelial elements, ..."
//   diagnosis    "(A) PAROTID, left, superficial parotidectomy - PLEOMORPHIC ADENOMA; completely excised"
// The pleomorphic adenoma paragraph reuses the house wording in docs/case-mix-analysis.md §4.12.
// Malignant option prints a short capitalised line only; the schema snippet `salivary_cancer_template` adds the
// comment recommending the QMH salivary gland template. Flags `paRecurrenceRisk` (pleomorphic adenoma with a
// breached capsule or satellite nodules) pre-ticks the re-excision comment; `salivary_igg4` is a field rule on `igg4`.
// Wording is protected by tests/salivary.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace(/\.0+$/, ''));
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const article = (s) => (/^[aeiou]/i.test(s) ? 'an' : 'a');
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const countWord = (n) => (n >= 0 && n <= 10 ? WORDS[n] : String(n));

/** "4.5 x 3.5 x 2 cm" from free text; '' when blank. */
function sizeText(raw, unit = 'cm') {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ` ${unit}`;
  return s;
}

export const PA = 'Pleomorphic adenoma';
export const KUTTNER = 'Küttner tumour (chronic sclerosing sialadenitis)';
export const MALIGNANT = 'Malignant - see comment';
export const INFLAMMATORY = ['Chronic sialadenitis', KUTTNER];
export const NEOPLASMS = [PA, 'Warthin tumour', 'Basal cell adenoma', 'Oncocytoma', 'Myoepithelioma'];
export const isPA = (v) => v.lesion === PA;
export const isMalignant = (v) => v.lesion === MALIGNANT;
export const isInflammatory = (v) => INFLAMMATORY.includes(v.lesion);
export const isNeoplasm = (v) => NEOPLASMS.includes(v.lesion);
export const isReactiveNode = (v) => v.lesion === 'Intraparotid lymph node, reactive';
export const isMucocoele = (v) => v.lesion === 'Mucocoele / ranula';
export const isCyst = (v) => v.lesion === 'Lymphoepithelial cyst' || isMucocoele(v);
/** Lesions for which a margin statement is printed. */
export const hasMargin = (v) => isNeoplasm(v) || isCyst(v);

// ---------- specimen ----------

const isMinor = (v) => /^Minor salivary gland/.test(v.gland || '');
/** "lip" / "palate" for a minor gland; '' otherwise. */
const minorSite = (v) => (isMinor(v) ? lc1((v.gland.split(',')[1] || '').trim()) : '');
const sideWord = (v) => (v.laterality === 'Left' || v.laterality === 'Right' ? lc1(v.laterality) : '');

/** "parotid" / "submandibular gland" / "minor salivary gland" — the tissue noun in prose. */
export function glandWord(v) {
  if (isMinor(v)) return 'minor salivary gland';
  if (v.gland === 'Submandibular gland') return 'submandibular gland';
  return 'parotid';
}

/** "PAROTID" / "SUBMANDIBULAR GLAND" / "MINOR SALIVARY GLAND" for the diagnosis line. */
export function organWord(v) {
  if (isMinor(v)) return 'MINOR SALIVARY GLAND';
  if (v.gland === 'Submandibular gland') return 'SUBMANDIBULAR GLAND';
  return 'PAROTID';
}

/** Procedure in lower case for the diagnosis line; "Submandibular gland excision" shortens to "excision". */
export function procedureWord(v) {
  const p = (v.procedure || 'Superficial parotidectomy').trim();
  if (p === 'Submandibular gland excision') return 'excision';
  if (p === 'Excision of lesion') return 'excision';
  return lc1(p);
}

/** "Left parotid, superficial parotidectomy" / "Minor salivary gland, lip, excision biopsy". */
export function specimenName(part) {
  const v = part.values;
  const typed = (v.specimenName || '').trim();
  if (typed) return typed;
  const side = sideWord(v);
  if (isMinor(v)) return `Minor salivary gland, ${minorSite(v)}, ${procedureWord(v)}`;
  const organ = `${side ? `${side} ` : ''}${glandWord(v)}`;
  return `${organ.charAt(0).toUpperCase()}${organ.slice(1)}, ${procedureWord(v)}`;
}

// ---------- macroscopic description ----------

const NODULE = {
  'Well-circumscribed, glistening': 'well-circumscribed, glistening, grey-white nodule',
  'Cystic with brown fluid': 'cystic nodule containing brown fluid',
  'Firm, tan': 'firm, tan nodule'
};

function receivedPhrase(v) {
  const p = (v.procedure || 'Superficial parotidectomy').trim();
  const side = sideWord(v);
  const from = isMinor(v) ? `the ${minorSite(v)}` : `the ${side ? `${side} ` : ''}${glandWord(v)}`;
  if (p === 'Excision of lesion') return `an excision specimen from ${from}`;
  if (p === 'Excision biopsy') return `an excision biopsy specimen from ${from}`;
  return `${article(p)} ${lc1(p)} specimen`;
}

export function macro(part, ctx) {
  if (ctx.options.macro === false) return '';
  const v = part.values;
  const s = [];

  const measures = [];
  const dims = sizeText(v.dimensions);
  if (dims) measures.push(`measuring ${dims}`);
  const w = num(v.weight);
  if (w !== null) measures.push(`weighing ${fmt(w)} g`);
  s.push(`Received in formalin is ${receivedPhrase(v)}${measures.length ? ` ${listJoin(measures)}` : ''}.`);

  if (v.noduleDescription === 'No discrete nodule') {
    s.push('Sectioning shows no discrete nodule.');
  } else {
    const look = NODULE[v.noduleDescription] || NODULE['Well-circumscribed, glistening'];
    const size = sizeText(v.noduleSize);
    const mm = num(v.marginDistance);
    let sentence = `Sectioning shows ${article(look)} ${look}${size ? ` measuring ${size}` : ''}`;
    if (mm !== null) sentence += `, ${fmt(mm / 10)} cm from the closest inked margin`;
    s.push(`${sentence}.`);
    if (v.grossCapsule === 'Breached') s.push('The capsule is focally breached.');
    else if (v.grossCapsule === 'Satellite nodule') s.push('A satellite nodule is present adjacent to the main nodule.');
  }

  if (v.stone) {
    const size = sizeText(v.stoneSize, 'mm');
    s.push(`A calculus${size ? ` measuring ${size}` : ''} is present within the duct.`);
  }

  const gland = `The surrounding ${glandWord(v)} tissue`;
  if (v.grossBackground === 'Firm, fibrotic') s.push(`${gland} is firm and fibrotic.`);
  else if (v.grossBackground === 'Atrophic') s.push(`${gland} is atrophic.`);
  else s.push(`${gland} is unremarkable.`);

  const n = blockCount(v);
  s.push(`Representative sections in ${n} block${n === 1 ? '' : 's'}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- block key ----------

const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 5));
const range = (a, b) => (a === b ? `(${a})` : `(${a}-${b})`);

export function blockKey(part, ctx) {
  if (ctx.options.macro === false) return '';
  const v = part.values;
  const n = blockCount(v);
  const items = [];
  if (v.noduleDescription === 'No discrete nodule') {
    if (v.stone && n >= 2) {
      items.push(`${range(1, n - 1)} Gland, representative sections.`);
      items.push(`${range(n, n)} Duct with calculus.`);
    } else {
      items.push(`${range(1, n)} Gland, representative sections.`);
    }
  } else if (n === 1) {
    items.push('(1) Nodule with closest margin.');
  } else if (n === 2) {
    items.push('(1) Nodule with closest margin.', '(2) Nodule with capsule.');
  } else {
    items.push(`${range(1, n - 2)} Nodule with closest margin.`);
    items.push(`${range(n - 1, n - 1)} Nodule with capsule.`);
    items.push(`${range(n, n)} Background gland.`);
  }
  return `(${part.label}) ${items.join(' ')}`;
}

// ---------- microscopy ----------

const nodeTotal = (v) => Math.max(1, Math.round(num(v.nodeTotal) ?? 1));
const nodePositive = (v) => Math.max(0, Math.round(num(v.nodePositive) ?? 0));

function nodeSentence(v) {
  if (!v.lymphNodes) return '';
  const t = nodeTotal(v);
  const p = nodePositive(v);
  const where = isMinor(v) ? 'adjacent' : v.gland === 'Submandibular gland' ? 'submandibular' : 'intraparotid';
  const count = countWord(t);
  const head = `${count.charAt(0).toUpperCase()}${count.slice(1)} ${where} lymph node${t === 1 ? '' : 's'}`;
  if (p > 0) return `${head} ${t === 1 ? 'is' : 'are'} identified, of which ${countWord(p)} ${p === 1 ? 'shows' : 'show'} metastatic tumour (${p}/${t}).`;
  return `${head} ${t === 1 ? 'shows' : 'show'} reactive changes only (${p}/${t}).`;
}

function marginSentence(v) {
  switch (v.margin) {
    case 'Tumour reaches inked margin': return 'The tumour reaches the inked margin.';
    case 'Capsule breached at margin': return 'The capsule is breached at the inked margin.';
    default: return isCyst(v) ? 'The lesion is completely excised.' : 'The tumour is completely excised.';
  }
}

function paSentences(v) {
  const s = [
    'Sections show a well circumscribed, thinly encapsulated tumour composed of a mixture of epithelial elements, myoepithelial elements, and stromal elements.',
    'The epithelial cells show tubules and nests, with streaming of spindle or stellate shaped myoepithelial elements.',
    'Eosinophilic luminal secretions are seen.',
    v.stroma === 'Hyalinised' ? 'The stroma is hyalinised.' : 'The stroma is chondromyxoid.'
  ];
  let capsule;
  if (v.microCapsule === 'Focally thin') capsule = 'The capsule is focally thin';
  else if (v.microCapsule === 'Breached') capsule = 'The capsule is focally breached, with tumour extending into the surrounding gland';
  else capsule = 'The capsule is intact';
  if (v.satellites) s.push(`${capsule}.`, 'Satellite nodules are present in the adjacent gland.');
  if (v.margin === 'Completely excised' && !v.satellites) s.push(`${capsule} and the tumour is completely excised.`);
  else {
    if (!v.satellites) s.push(`${capsule}.`);
    s.push(marginSentence(v));
  }
  return s;
}

function lesionSentences(v) {
  switch (v.lesion) {
    case PA: return paSentences(v);
    case 'Warthin tumour':
      return ['Sections show a well circumscribed, partly cystic tumour composed of papillary and cystic structures lined by a bilayer of oncocytic epithelium, set in a lymphoid stroma with germinal centres.',
        'There is no cytological atypia.', 'The features are those of Warthin tumour.', marginSentence(v)];
    case 'Basal cell adenoma':
      return ['Sections show a well circumscribed, encapsulated tumour composed of basaloid cells arranged in nests, trabeculae and tubules with peripheral palisading and a surrounding hyalinised basement membrane-like material.',
        'There is no infiltrative growth, perineural invasion or cytological atypia.', 'The features are those of basal cell adenoma.', marginSentence(v)];
    case 'Oncocytoma':
      return ['Sections show a well circumscribed, encapsulated tumour composed of sheets and nests of large polygonal cells with abundant granular eosinophilic cytoplasm and round central nuclei.',
        'There is no infiltrative growth or cytological atypia.', 'The features are those of oncocytoma.', marginSentence(v)];
    case 'Myoepithelioma':
      return ['Sections show a well circumscribed, encapsulated tumour composed of spindle and plasmacytoid myoepithelial cells in a scant stroma, without ductal differentiation or chondromyxoid stroma.',
        'There is no cytological atypia and mitoses are inconspicuous.', 'The features are those of myoepithelioma.', marginSentence(v)];
    case 'Lymphoepithelial cyst':
      return ['Sections show a cyst lined by squamous and cuboidal epithelium, surrounded by a dense lymphoid stroma with germinal centres.',
        'The features are those of a lymphoepithelial cyst.', marginSentence(v)];
    case 'Chronic sialadenitis': {
      const s = ['Sections show salivary gland tissue with acinar atrophy, ductal dilatation, periductal fibrosis and a chronic inflammatory infiltrate of lymphocytes and plasma cells.'];
      if (v.sialolithiasis) s.push('A calculus is present within a dilated duct, in keeping with sialolithiasis.');
      if (v.igg4) s.push('There is a plasma cell-rich infiltrate with storiform fibrosis and obliterative phlebitis, raising the possibility of IgG4-related disease; see comment.');
      s.push('The features are those of chronic sialadenitis.');
      return s;
    }
    case KUTTNER: {
      const s = ['Sections show salivary gland tissue with marked acinar atrophy, dense periductal and interlobular sclerosis, and a heavy lymphoplasmacytic infiltrate with lymphoid follicle formation.'];
      if (v.sialolithiasis) s.push('A calculus is present within a dilated duct, in keeping with sialolithiasis.');
      if (v.igg4) s.push('Storiform fibrosis and obliterative phlebitis are present, raising the possibility of IgG4-related disease; see comment.');
      s.push('The features are those of chronic sclerosing sialadenitis (Kuttner tumour).');
      return s;
    }
    case 'Intraparotid lymph node, reactive':
      return ['Sections show a lymph node with preserved architecture, reactive follicular hyperplasia and open sinuses, surrounded by unremarkable parotid tissue.',
        'The features are those of a reactive intraparotid lymph node.'];
    case 'Mucocoele / ranula':
      return ['Sections show a cystic space filled with mucin and muciphages, lined by granulation tissue rather than epithelium, adjacent to minor salivary gland tissue showing chronic inflammation and ductal dilatation.',
        'The features are those of a mucocoele (mucus extravasation cyst).', marginSentence(v)];
    case MALIGNANT: {
      const type = (v.whoType || '').trim().replace(/\.$/, '');
      return [type ? `Sections show a malignant salivary gland neoplasm, ${lc1(type)}; see comment.` : 'Sections show a malignant salivary gland neoplasm; see comment.'];
    }
    default: return paSentences(v);
  }
}

export function microscopy(part) {
  const v = part.values;
  const s = [...lesionSentences(v)];
  if (!isMalignant(v)) {
    if (!isReactiveNode(v) && !isInflammatory(v)) s.push(`The surrounding ${glandWord(v)} tissue is unremarkable.`);
    if (v.facialNerve) s.push('A segment of peripheral nerve is included and is unremarkable.');
    s.push('There is no evidence of malignancy.');
    const nodes = nodeSentence(v);
    if (nodes) s.push(nodes);
  } else {
    const nodes = nodeSentence(v);
    if (nodes) s.push(nodes);
  }
  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const MAIN = {
  [PA]: 'PLEOMORPHIC ADENOMA',
  'Warthin tumour': 'WARTHIN TUMOUR',
  'Basal cell adenoma': 'BASAL CELL ADENOMA',
  Oncocytoma: 'ONCOCYTOMA',
  Myoepithelioma: 'MYOEPITHELIOMA',
  'Lymphoepithelial cyst': 'LYMPHOEPITHELIAL CYST',
  'Chronic sialadenitis': 'CHRONIC SIALADENITIS',
  [KUTTNER]: 'CHRONIC SCLEROSING SIALADENITIS (KUTTNER TUMOUR)',
  'Intraparotid lymph node, reactive': 'REACTIVE LYMPHOID HYPERPLASIA, INTRAPAROTID LYMPH NODE',
  'Mucocoele / ranula': 'MUCOCOELE (MUCUS EXTRAVASATION CYST)'
};

/** "PAROTID, left, superficial parotidectomy" / "MINOR SALIVARY GLAND, lip, excision biopsy". */
export function organPhrase(part) {
  const v = part.values;
  const site = isMinor(v) ? minorSite(v) : sideWord(v);
  return `${organWord(v)}, ${site ? `${site}, ` : ''}${procedureWord(v)}`;
}

function marginClause(v) {
  switch (v.margin) {
    case 'Tumour reaches inked margin': return 'tumour reaches the inked margin';
    case 'Capsule breached at margin': return 'capsule breached at the inked margin';
    default: return 'completely excised';
  }
}

function nodeClause(v) {
  if (!v.lymphNodes) return '';
  const t = nodeTotal(v);
  const p = nodePositive(v);
  const where = isMinor(v) ? 'regional' : v.gland === 'Submandibular gland' ? 'submandibular' : 'intraparotid';
  if (p > 0) return `metastatic tumour in ${p} of ${t} ${where} lymph node${t === 1 ? '' : 's'} (${p}/${t})`;
  return `${where} lymph node${t === 1 ? '' : 's'} with no evidence of malignancy (${p}/${t})`;
}

export function diagnosis(part) {
  const v = part.values;
  const clauses = [];
  if (isMalignant(v)) {
    const type = (v.whoType || '').trim().replace(/\.$/, '');
    clauses.push(`${type ? type.toUpperCase() : 'MALIGNANT SALIVARY GLAND NEOPLASM'}; see comment`);
  } else {
    clauses.push(MAIN[v.lesion] || 'PLEOMORPHIC ADENOMA');
    if (isPA(v) && v.satellites) clauses.push('satellite nodules present');
    if (isInflammatory(v) && v.sialolithiasis) clauses.push('sialolithiasis');
    if (isInflammatory(v) && v.igg4) clauses.push('IgG4-related disease to be excluded - see comment');
    if (hasMargin(v)) clauses.push(marginClause(v));
  }
  const nodes = nodeClause(v);
  if (nodes) clauses.push(nodes);
  return `(${part.label}) ${organPhrase(part)} - ${clauses.join('; ')}`;
}

// ---------- case-level flags for the auto comments ----------

export function flags(parts) {
  const vals = parts.map((p) => p.values);
  const out = [];
  if (vals.some((v) => isPA(v) && (v.satellites || v.microCapsule === 'Breached' || v.margin === 'Capsule breached at margin' || v.grossCapsule === 'Breached' || v.grossCapsule === 'Satellite nodule'))) out.push('paRecurrenceRisk');
  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, flags };
