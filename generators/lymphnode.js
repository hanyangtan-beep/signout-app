import { stripDot } from './_house.js';
// Lymph node excision / sentinel node / dissection generator. Pure functions: (part, ctx) -> string.
// Each part is one node specimen (site or station) so any case can add node parts.
// Blocks produced:
//   specimenName "Lymph node, right SLN2, excision"
//   macro        "(A) Received in formalin is a piece of fibroadipose tissue measuring 3 x 2 x 1 cm containing one lymph node measuring 1.2 cm. All embedded in 1 block."
//   blockKey     "(A) (1) Lymph node, bisected."
//   microscopy   "(A) Sections show fibroadipose tissue and one reactive lymph node. No suspicious cells are identified on immunostain for pancytokeratin MNF116. There is no evidence of malignancy."
//   diagnosis    "(A) LYMPH NODE, right SLN2, excision - NO EVIDENCE OF MALIGNANCY (0/1)"
// The (x/y) count is derived from the positive and total node counts.
// Wording is protected by tests/lymphnode.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
/** Words for 0-9, digits from 10. */
export const word = (n) => (n >= 0 && n <= 9 ? WORDS[n] : String(n));
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
/** Lower-case the first letter unless the first word is an acronym / station code ("SLN2", "L4"). */
const lcSite = (s) => {
  const t = String(s || '').trim();
  if (!t) return '';
  if (t.length > 1 && /[A-Z0-9]/.test(t.charAt(1))) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
};

const METASTATIC = ['Metastatic carcinoma', 'Metastatic malignant melanoma', 'Other metastatic tumour'];
export const isMetastatic = (v) => METASTATIC.includes(v.result);
export const isNegative = (v) => !v.result || v.result.startsWith('Negative');
export const isGranulomatous = (v) => v.result === 'Granulomatous inflammation';
export const isLymphoma = (v) => v.result === 'Lymphoma - see comment';

/** Total nodes examined: microscopy count when given, else the number received (never below 0). */
export function totalNodes(v) {
  const micro = num(v.nodesTotal);
  const n = micro !== null ? micro : (num(v.nodesReceived) ?? 1);
  return Math.max(0, Math.round(n));
}

/** Positive nodes for metastatic results, clamped to the total; 0 otherwise. */
export function positiveNodes(v) {
  if (!isMetastatic(v)) return 0;
  const total = totalNodes(v);
  const p = Math.max(0, Math.round(num(v.positiveNodes) ?? 1));
  return total > 0 ? Math.min(p, total) : p;
}

/** "(0/1)" / "(2/14)". */
export const countPhrase = (v) => `(${positiveNodes(v)}/${totalNodes(v)})`;

const procedureWord = (v) => (v.procedure || 'Excision').toLowerCase();
// A site copied from the request can name the procedure already ("left neck dissection, levels I-IV");
// the word is then not said twice.
const procedureAfter = (v, site) => { const w = procedureWord(v); return new RegExp(`\\b${w}\\b`, 'i').test(site || '') ? '' : w; };
const nodeNoun = (v, upper = false) => {
  const s = totalNodes(v) === 1 ? 'lymph node' : 'lymph nodes';
  return upper ? s.toUpperCase() : s;
};

/** "Lymph node, right SLN2, excision" — the phrase used in the SPECIMENS block. */
export function specimenName(part) {
  const v = part.values;
  const site = lcSite(v.specimenName);
  return [uc1(nodeNoun(v)), site, procedureAfter(v, site)].filter(Boolean).join(', ');
}

// ---------- macroscopic description ----------

function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 1));
const receivedCount = (v) => Math.max(0, Math.round(num(v.nodesReceived) ?? 1));

export function macro(part, ctx) {
  if (ctx.options.macro === false) return '';
  const v = part.values;
  const n = receivedCount(v);
  const largest = sizePhrase(v.largestNode);
  const blocks = blockCount(v);
  const blockSentence = blocks === 1 ? 'All embedded in 1 block.' : `All embedded in ${blocks} blocks.`;
  let s;
  if (v.tissue === 'Lymph node(s) only') {
    if (n <= 1) {
      const handling = blocks === 1 ? 'bisected and all embedded in 1 block' : `serially sliced and all embedded in ${blocks} blocks`;
      s = `Received in formalin is a lymph node${largest ? ` measuring ${largest}` : ''}, ${handling}.`;
    } else {
      s = `Received in formalin are ${word(n)} lymph nodes${largest ? `, the largest measuring ${largest}` : ''}. ${blockSentence}`;
    }
  } else {
    const size = sizePhrase(v.tissueSize);
    const nodes = n === 0 ? 'no discrete lymph node'
      : n === 1 ? `one lymph node${largest ? ` measuring ${largest}` : ''}`
        : `${word(n)} lymph nodes${largest ? `, the largest ${largest}` : ''}`;
    s = `Received in formalin is a piece of fibroadipose tissue${size ? ` measuring ${size}` : ''} containing ${nodes}. ${blockSentence}`;
  }
  return `(${part.label}) ${s}`;
}

/** "(1) Lymph node, bisected." / "(1) Lymph nodes 1-2. (2) Lymph nodes 3-4." */
export function blockKey(part, ctx) {
  if (ctx.options.macro === false) return '';
  const v = part.values;
  const override = stripDot(v.blockKeyText);
  if (override) return `(${part.label}) ${override}.`;
  const n = receivedCount(v);
  const blocks = blockCount(v);
  const items = [];
  if (n <= 1) {
    if (blocks === 1) items.push(n === 0 ? 'Fibroadipose tissue, all embedded' : 'Lymph node, bisected');
    else for (let i = 1; i <= blocks; i++) items.push(n === 0 ? `Fibroadipose tissue, portion ${i}` : `Lymph node, slice ${i}`);
  } else if (blocks >= n) {
    for (let i = 1; i <= blocks; i++) items.push(i <= n ? `Lymph node ${i}` : `Lymph node ${n}, further slice`);
  } else {
    const per = Math.ceil(n / blocks);
    let from = 1;
    for (let i = 1; i <= blocks; i++) {
      const to = Math.min(n, from + per - 1);
      if (from > n) break;
      items.push(from === to ? `Lymph node ${from}` : `Lymph nodes ${from}-${to}`);
      from = to + 1;
    }
  }
  return `(${part.label}) ${items.map((t, i) => `(${i + 1}) ${t}.`).join(' ')}`;
}

// ---------- microscopy ----------

const IHC_NAMES = {
  MNF116: 'pancytokeratin MNF116',
  'AE1/AE3': 'pancytokeratin AE1/AE3',
  CK7: 'CK7',
  'TTF-1': 'TTF-1',
  GATA3: 'GATA3',
  'S100/SOX10/Melan-A': 'S100, SOX10 and Melan-A'
};
const ihcList = (v) => (Array.isArray(v.ihc) ? v.ihc : []).filter((x) => x && x !== 'None' && x !== 'Other').map((x) => IHC_NAMES[x] || x);
const hasIhc = (v) => (Array.isArray(v.ihc) ? v.ihc : []).some((x) => x && x !== 'None');

function ihcSentence(v) {
  const custom = stripDot(v.ihcResult);
  if (custom) return `${uc1(custom)}.`;
  if (!hasIhc(v)) return '';
  const names = ihcList(v);
  const stains = names.length ? `immunostain${names.length > 1 ? 's' : ''} for ${listJoin(names)}` : 'immunostains';
  if (isMetastatic(v)) return `The tumour cells are highlighted by ${stains}.`;
  return `No suspicious cells are identified on ${stains}.`;
}

const tumourNoun = (v) => {
  const t = stripDot(v.tumourType);
  if (v.result === 'Other metastatic tumour') return t ? `metastatic ${t.charAt(0).toLowerCase()}${t.slice(1)}` : 'metastatic tumour';
  return v.result === 'Metastatic malignant melanoma' ? 'metastatic malignant melanoma' : 'metastatic carcinoma';
};

export function microscopy(part) {
  const v = part.values;
  const total = totalNodes(v);
  const fat = v.tissue !== 'Lymph node(s) only';
  const lead = fat ? 'Sections show fibroadipose tissue and ' : 'Sections show ';
  const sentences = [];

  if (isNegative(v)) {
    const adj = v.result === 'Negative - unremarkable' ? '' : 'reactive ';
    if (total === 0) sentences.push(`${fat ? 'Sections show fibroadipose tissue' : 'Sections show fibrous tissue'} with no lymph node identified.`);
    else {
      sentences.push(`${lead}${word(total)} ${adj}${nodeNoun(v)}${adj ? '' : ' with preserved architecture'}.`);
    }
    const ihc = ihcSentence(v);
    if (ihc) sentences.push(ihc);
    sentences.push('There is no evidence of malignancy.');
  } else if (isGranulomatous(v)) {
    const gran = v.granulomaType === 'Necrotising'
      ? 'necrotising epithelioid granulomas with central necrosis'
      : 'non-necrotising epithelioid granulomas';
    sentences.push(`${lead}${word(total)} ${nodeNoun(v)} containing ${gran}.`);
    if (v.specialStains === 'ZN and GMS negative') sentences.push('Ziehl-Neelsen and Grocott stains are negative for acid-fast bacilli and fungal organisms.');
    const ihc = ihcSentence(v);
    if (ihc) sentences.push(ihc);
    sentences.push('There is no evidence of malignancy.');
  } else if (isMetastatic(v)) {
    const pos = positiveNodes(v);
    const dep = String(v.largestDeposit || '').trim();
    const depText = dep ? `, the largest deposit measuring ${/mm|cm/i.test(dep) ? dep : `${dep} mm`}` : '';
    sentences.push(`${lead}${word(total)} ${nodeNoun(v)}.`);
    const involved = pos === total
      ? (total === 1 ? 'The lymph node is' : `All ${word(total)} lymph nodes are`)
      : `${uc1(word(pos))} of the lymph nodes ${pos === 1 ? 'is' : 'are'}`;
    sentences.push(`${involved} involved by ${tumourNoun(v)}${depText}.`);
    sentences.push(v.extranodal === 'Present' ? 'Extranodal extension is present.' : 'There is no extranodal extension.');
    const ihc = ihcSentence(v);
    if (ihc) sentences.push(ihc);
    const rest = total - pos;
    if (rest > 0) sentences.push(`The remaining ${word(rest)} lymph node${rest === 1 ? ' is' : 's are'} reactive.`);
  } else if (isLymphoma(v)) {
    sentences.push(`${lead}${word(total)} ${nodeNoun(v)} with effaced architecture replaced by an atypical lymphoid infiltrate. See comment.`);
    const ihc = ihcSentence(v);
    if (ihc) sentences.push(ihc);
  }

  const notes = stripDot(v.additionalNotes);
  if (notes) sentences.push(`${uc1(notes)}.`);
  return `(${part.label}) ${sentences.join(' ')}`;
}

// ---------- diagnosis ----------

function organPhrase(part) {
  const v = part.values;
  const site = lcSite(v.specimenName);
  return [nodeNoun(v, true), site, procedureAfter(v, site)].filter(Boolean).join(', ');
}

export function diagnosis(part) {
  const v = part.values;
  const count = countPhrase(v);
  let text;
  if (isNegative(v)) {
    text = `NO EVIDENCE OF MALIGNANCY ${count}`;
  } else if (isGranulomatous(v)) {
    const qual = v.granulomaType === 'Necrotising' ? ', necrotising' : '';
    text = `GRANULOMATOUS INFLAMMATION${qual}; no evidence of malignancy ${count}`;
  } else if (isMetastatic(v)) {
    const clauses = [`${tumourNoun(v).toUpperCase()} ${count}`];
    const dep = String(v.largestDeposit || '').trim();
    if (dep) clauses.push(`largest deposit ${/mm|cm/i.test(dep) ? dep : `${dep} mm`}`);
    clauses.push(v.extranodal === 'Present' ? 'extranodal extension present' : 'no extranodal extension');
    const t = stripDot(v.tumourType);
    if (t && v.result !== 'Other metastatic tumour') clauses.push(t.charAt(0).toLowerCase() + t.slice(1));
    text = clauses.join('; ');
  } else {
    text = 'LYMPHOMA; see comment';
  }
  return `(${part.label}) ${organPhrase(part)} - ${text}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
