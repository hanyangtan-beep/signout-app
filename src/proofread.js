// Proofreading before sign-out (docs/specs/proofreading.md, Phase 86). Pure functions: the page's
// side is in src/app.js and the connection to Han Slide in src/hanslide.js.
//
// Two kinds of suggestion are shown together in Checks:
//   - rule checks, worked out here in the page on every computer: British spelling, the house
//     diagnosis connectors, house phrases, plain text for the LIS, a repeated word, a placeholder
//     left in, an unclosed bracket and a side that differs between the specimen and the diagnosis;
//   - PPLX 27B's suggestions, asked through Han Slide on the Mac: spelling, typing and grammar,
//     the house style, and facts that disagree between sections.
// The model reads the whole report. An edit it suggests is offered only when the text it replaces
// is in that section and it leaves every number, unit, side, negation, grade, stage and result as
// it was, with no other word changed beyond a spelling; anything else is shown as a check to look
// at, with its change flagged to accept by hand where the text is there once. A section that reads
// poorly may come back rewritten whole (Phase 87): shown as tracked changes, a change that alters a
// fact flagged and left unticked. Nothing changes until the pathologist accepts.

import { BRITISH, britishise, houseConnectors, toAscii } from './style.js';
import { diffWords, applyHunks } from './textdiff.js';

/** The report blocks the proofreader reads, in report order (the block key is left out). */
export const SECTIONS = [
  { key: 'specimens', tag: 'SPECIMEN', label: 'Specimen' },
  { key: 'macro', tag: 'MACRO', label: 'Macroscopic description' },
  { key: 'intraop', tag: 'INTRAOP', label: 'Intraoperative consultation' },
  { key: 'microscopy', tag: 'MICRO', label: 'Microscopic examination' },
  { key: 'molecular', tag: 'MOLECULAR', label: 'Molecular findings' },
  { key: 'diagnosis', tag: 'DX', label: 'Diagnosis' },
  { key: 'comment', tag: 'COMMENT', label: 'Comment' }
];
const BY_TAG = Object.fromEntries(SECTIONS.map((s) => [s.tag, s]));
const BY_KEY = Object.fromEntries(SECTIONS.map((s) => [s.key, s]));

export const MODEL_NAME = 'PPLX 27B';
/** The longest question sent; Han Slide refuses questions over 48000 characters (ProofreadLink.maxPromptCharacters). */
export const MAX_PROMPT_CHARS = 40000;
/** The longest answer asked for: the most Han Slide allows (ProofreadLink.maxTokensLimit). */
export const MAX_TOKENS = 2000;
export const MAX_EDITS = 12;
export const MAX_FLAGS = 8;
/** Whole-section rewrites in one answer, at most, and the sections that may be rewritten (prose, not lists). */
export const MAX_REWRITES = 4;
export const REWRITE_SECTIONS = ['macro', 'intraop', 'microscopy', 'comment'];
const MAX_REWRITE = 4000;
const MAX_FIND = 200;
const MAX_REPLACE = 300;
const MAX_WHY = 160;

/** Labels for the kinds of suggestion, as Checks shows them. */
export const KIND_LABEL = { spelling: 'Spelling', typing: 'Typing', grammar: 'Grammar', 'house style': 'House style', check: 'Check', flagged: 'Flagged change', rewrite: 'Rewrite' };

/** The section a block key belongs to, or null. */
export function sectionOf(key) { return BY_KEY[key] || null; }

/** The printed blocks to proofread, from the report the page shows: [{ key, tag, label, text }]. */
export function reportSections(out) {
  const list = [];
  for (const s of SECTIONS) {
    const text = String(out?.[s.key] ?? '').replace(/\s+$/, '');
    if (text.trim()) list.push({ ...s, text });
  }
  return list;
}

// ---------- small helpers ----------

/** FNV-1a, 32 bits, as 8 hex digits: a fingerprint of a block's text, not a security hash. */
export function fingerprint(text) {
  let h = 0x811c9dc5;
  const s = String(text ?? '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isWord = (s) => /^[A-Za-z][A-Za-z'-]*$/.test(s);
const wordRe = (w, flags = 'g') => new RegExp(`(?<![A-Za-z0-9])${escapeRe(w)}(?![A-Za-z0-9])`, flags);

/** How many times `find` occurs in `text` (exact, not overlapping); whole words only for a single word. */
export function occurrences(text, find, whole = false) {
  const t = String(text ?? '');
  if (!find) return 0;
  if (whole) return (t.match(wordRe(find)) || []).length;
  let n = 0;
  for (let at = t.indexOf(find); at >= 0; at = t.indexOf(find, at + find.length)) n++;
  return n;
}

/** The text with one edit applied, or null when its text is not there (or not once, unless `all`). */
export function applyEdit(text, item) {
  const t = String(text ?? '');
  if (!item?.find) return null;
  if (item.all) {
    if (!occurrences(t, item.find, true)) return null;
    return t.replace(wordRe(item.find), () => item.replace);
  }
  const at = t.indexOf(item.find);
  if (at < 0 || t.indexOf(item.find, at + 1) >= 0) return null;
  return t.slice(0, at) + item.replace + t.slice(at + item.find.length);
}

const squash = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
/** Whether a quoted piece of text is in a section (case and spacing aside). */
export function quoteFound(text, quote) {
  const q = squash(quote);
  return !!q && squash(text).includes(q);
}

// ---------- the guard on the model's edits ----------

// Words whose change alters the meaning of a report. With every number and every token holding a
// digit (pT1b, G2, HER2, 3+), these must be the same, the same number of times, before and after.
const PROTECTED = new Set([
  'left', 'right', 'bilateral', 'unilateral', 'ipsilateral', 'contralateral', 'both',
  'superior', 'inferior', 'medial', 'lateral', 'anterior', 'posterior', 'deep', 'superficial',
  'proximal', 'distal', 'radial', 'circumferential', 'serosal', 'mucosal', 'submucosal', 'transmural',
  'no', 'not', 'none', 'nil', 'nor', 'neither', 'never', 'without', 'cannot', 'absent', 'present',
  'negative', 'positive', 'equivocal', 'indeterminate', 'suspicious', 'possible', 'probable', 'likely',
  'high', 'low', 'intermediate', 'well', 'moderately', 'poorly', 'undifferentiated', 'differentiated',
  'benign', 'malignant', 'malignancy', 'invasive', 'invasion', 'microinvasive', 'situ', 'non',
  'involved', 'uninvolved', 'clear', 'close', 'free', 'margin', 'margins', 'focal', 'diffuse', 'extensive',
  'viable', 'nonviable', 'necrotic', 'ischaemic', 'ischemic', 'perforated', 'ruptured', 'denuded',
  'inadequate', 'adequate', 'acute', 'active', 'inactive', 'recurrent', 'residual', 'metastatic', 'primary',
  'borderline', 'atypical', 'dysplasia', 'hyperplasia', 'cirrhosis', 'rejection', 'amyloid',
  'dichorionic', 'monochorionic', 'diamniotic', 'monoamniotic',
  'grade', 'stage', 'ajcc', 'figo', 'gleason', 'isup', 'who', 'fnclcc', 'nottingham', 'tnm',
  'mm', 'cm', 'm', 'g', 'kg', 'mg', 'ml', 'l', 'um', 'micron', 'microns', 'hpf', 'mm2', 'x', 'percent',
  'cores', 'blocks', 'nodes',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'single', 'multiple', 'multifocal', 'unifocal', 'several', 'all', 'some', 'few', 'many',
  'er', 'pr', 'ki', 'mmr', 'mlh', 'pms', 'msh', 'pd', 'alk', 'ros', 'egfr', 'kras', 'braf', 'idh',
  'myc', 'bcl', 'cd', 'ck', 'ttf', 'gata', 'sox', 'wt', 'p', 'sstr', 'synaptophysin', 'chromogranin',
  'amplified', 'nonamplified', 'mutated', 'mutant', 'wild', 'type', 'deficient', 'proficient', 'loss', 'retained', 'intact',
  'score', 'tps', 'cps', 'ihc', 'ish', 'fish', 'dish', 'pcr', 'stain', 'stains'
]);
const SYMBOLS = /[%<>=+]/g;

/** The meaning-bearing tokens of a text, sorted: numbers, tokens with a digit, the words above, symbols. */
export function protectedTokens(text) {
  const s = String(text ?? '').toLowerCase();
  const tokens = (s.match(/[a-z0-9]+/g) || []).filter((t) => /\d/.test(t) || PROTECTED.has(t));
  return [...tokens, ...(s.match(SYMBOLS) || [])].sort();
}

// Words an edit may add or take away for grammar and the house phrases: articles, prepositions,
// auxiliaries and the house wording ("Sections show", "There is no evidence of").
// Words that can change a measurement or extent ("within", "at", "than", "only", "or") are left out.
const FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'there', 'here', 'it', 'its',
  'this', 'that', 'these', 'those', 'which', 'with', 'in', 'into', 'on', 'by', 'for', 'from', 'to', 'as',
  'and', 'also', 'has', 'have', 'had', 'show', 'shows', 'showed', 'shown', 'section', 'sections', 'seen',
  'identified', 'noted', 'evidence', 'consistent', 'compatible', 'keeping', 'appearance', 'appearances',
  'features', 'findings', 'see', 'comment'
]);

/** Damerau-Levenshtein distance (optimal string alignment), for telling a spelling fix from a new word. */
export function editDistance(a, b) {
  const m = a.length; const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}
const nearSpelling = (a, b) => editDistance(a, b) <= Math.max(1, Math.floor(Math.max(a.length, b.length) / 4));

/**
 * Whether an edit only corrects the spelling, grammar or house wording: the protected tokens are the
 * same, and every word it removes or adds is either the corrected spelling of another or a function
 * word. Case alone never counts as a change, so the house capitals and connectors pass.
 */
export function safeEdit(find, replace) {
  const a = protectedTokens(find); const b = protectedTokens(replace);
  if (a.length !== b.length || a.some((t, i) => t !== b[i])) return { safe: false, reason: 'protected' };
  const words = (s) => String(s).toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
  const before = words(find); const after = words(replace);
  const removed = [...before]; const added = [];
  for (const w of after) {
    const k = removed.indexOf(w);
    if (k >= 0) removed.splice(k, 1); else added.push(w);
  }
  const leftOver = [];
  for (const w of removed) {
    const k = added.findIndex((x) => nearSpelling(w, x));
    if (k >= 0) added.splice(k, 1); else leftOver.push(w);
  }
  if ([...leftOver, ...added].some((w) => !FUNCTION_WORDS.has(w))) return { safe: false, reason: 'wording' };
  return { safe: true };
}

// ---------- house style ----------

/**
 * The house style the model is asked to keep. It comes from the app's own rules (src/style.js,
 * docs/specs/diagnosis-connectors.md, docs/specs/trailing-negatives.md, docs/specs/report-review.md)
 * and, for the microscopy phrases, from counts on the released biopsy reports: of 9323 microscopy
 * texts, 6027 have "Sections show", 4828 "There is no evidence of" and 1495 "no evidence of
 * malignancy", against 22 "no malignancy seen / identified" and none "negative for malignancy".
 */
export const HOUSE_STYLE = [
  'British spelling: tumour, oedema, haemorrhage, oesophagus, caecum, colour, grey, fibre, centre, leucocyte, oestrogen, ischaemia, paediatric, gynaecological; -ise and -isation (characterised, organised, localised). Leave "fetal" as written.',
  'Plain text for the LIS: no Markdown, bold or tables; "x" between dimensions, straight quotes, "-" for dashes, "micro" for the micro sign.',
  'Keep the layout exactly: headings, line breaks, "- Label: value" lines, part letters such as "(A)" and capital letters.',
  'Diagnosis: the organ in capitals, then the side, site and procedure in lower case ("BREAST, right, wide local excision"); diagnostic terms in capitals; "with" and an article after it in lower case between capitalised terms ("TUBULAR ADENOMA with LOW GRADE DYSPLASIA"); "In keeping with", "Consistent with" and "Compatible with" in sentence case when they open a clause and in lower case after a comma; WITHOUT and AND as written. A named benign diagnosis stands alone, without a trailing "no evidence of malignancy".',
  'Surgical narrative microscopy opens with "Sections show"; a negative reads "There is no evidence of ..." ("no evidence of malignancy", not "no malignancy is seen" or "negative for malignancy"); immunohistochemistry stays in the microscopy paragraph. Leave structured synoptics, placenta checklists, intraoperative frozen sections and cytology reports in their own format.',
  'Concise: take out a repeated word or phrase; leave a correct sentence as it is.'
];

export const SYSTEM_PROMPT = [
  'You proofread surgical pathology reports for a consultant histopathologist before sign-out. The reports are in British English and are pasted as plain text into a laboratory information system (LIS).',
  '',
  'Find:',
  '1. Spelling, typing and grammar errors.',
  '2. Wording that departs from the house style below.',
  '3. Facts that disagree between sections: size, count, side, site, margin, grade, stage, a biomarker result, or the diagnosis against the microscopy or the macroscopic description.',
  '4. For any macroscopic description, intraoperative consultation, microscopy or comment that needs grammar, house-style or readability changes: rewrite that section whole in "rewrites" with all changes applied at once rather than piecemeal "edits".',
  '',
  'House style:',
  ...HOUSE_STYLE.map((r) => `- ${r}`),
  '',
  'Rules:',
  '- Never change the meaning. Do not change a number, measurement, unit, side (left, right, bilateral), site, negation (no, not, without, negative, positive, absent, present), grade, stage, margin status, biomarker result, or one diagnosis for another; correcting the spelling of a word is allowed. If one of these looks wrong or disagrees with another section, report it in "flags" instead.',
  '- A flag may give "replace", the corrected text for its quote, only when another section shows which is right.',
  '- [HISTORY] is context only: never edit it.',
  '- "find" and a flag\'s "quote" are copied exactly from one section: a few words on one line, enough to be unique there. "replace" is the corrected text for that span only.',
  '- "kind" is "spelling", "grammar" or "house style". "why" is at most 12 words.',
  `- A rewrite gives the whole new text of one section: MACRO, INTRAOP, MICRO or COMMENT. Apply all grammar and house-style improvements together. Change the sentence structure and flow, not just one word for a similar word. Keep every fact (each number, measurement, side, site, negation, grade and result) and the layout (line breaks, headings, "- Label: value" lines, part letters). Make no edits in a section you rewrite. At most ${MAX_REWRITES} rewrites.`,
  `- At most ${MAX_EDITS} edits and ${MAX_FLAGS} flags, the most important first. Give the edits first, then the flags, then the rewrites. If nothing needs changing, reply {"edits":[],"flags":[],"rewrites":[]}.`,
  '',
  'Reply with one JSON object only, no other text:',
  '{"edits":[{"section":"MICRO","find":"...","replace":"...","kind":"spelling","why":"..."}],"flags":[{"section":"DX","quote":"...","replace":"...","why":"..."}],"rewrites":[{"section":"MICRO","text":"...","why":"..."}]}'
].join('\n');

/**
 * The question for Han Slide: { system, prompt, maxTokens }, or { error } when the report is too
 * long. The prompt's first line names the task, as Han Slide's other questions do.
 */
export function buildPrompt(sections, history = '') {
  const lines = ['TASK: proofread',
    'Proofread this surgical pathology report before sign-out. Each section is tagged; [HISTORY] is the clinical history, context only.', ''];
  const h = String(history ?? '').trim();
  if (h) lines.push('[HISTORY]', h, '');
  for (const s of sections) lines.push(`[${s.tag}]`, s.text, '');
  lines.push('Reply with the JSON object only.');
  const prompt = lines.join('\n');
  if (prompt.length > MAX_PROMPT_CHARS) return { error: `The report is too long to proofread (${prompt.length} characters; the limit is ${MAX_PROMPT_CHARS}).` };
  return { system: SYSTEM_PROMPT, prompt, maxTokens: MAX_TOKENS };
}

// ---------- reading the model's answer ----------

/**
 * One JSON object out of the model's text; with a cut-off answer, each whole item it holds.
 * `whole` says the object was read in full; `readable` that the answer had the expected shape.
 */
export function parseReply(text) {
  // A trailing comma before a closing bracket is the commonest slip in a model's JSON.
  const raw = String(text ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/g, '').replace(/,\s*([}\]])/g, '$1');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const o = JSON.parse(raw.slice(start, end + 1));
      const list = (x) => (Array.isArray(x) ? x : []);
      if (o && typeof o === 'object' && (Array.isArray(o.edits) || Array.isArray(o.flags) || Array.isArray(o.rewrites))) {
        return { edits: list(o.edits), flags: list(o.flags), rewrites: list(o.rewrites), whole: true, readable: true };
      }
    } catch { /* cut off or untidy: take the items one by one */ }
  }
  const edits = []; const flags = []; const rewrites = [];
  for (const m of raw.matchAll(/\{[^{}]*\}/g)) {
    let o;
    try { o = JSON.parse(m[0]); } catch { continue; }
    if (o && typeof o.find === 'string') edits.push(o);
    else if (o && typeof o.quote === 'string') flags.push(o);
    else if (o && typeof o.text === 'string') rewrites.push(o);
  }
  return { edits, flags, rewrites, whole: false, readable: edits.length + flags.length + rewrites.length > 0 || /"(edits|flags|rewrites)"\s*:/.test(raw) };
}

const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const kindOf = (k) => {
  const s = String(k ?? '').toLowerCase().trim();
  if (s.startsWith('spell')) return 'spelling';
  if (s.startsWith('gram')) return 'grammar';
  if (s.startsWith('typ')) return 'typing';
  if (s.includes('house') || s.includes('style')) return 'house style';
  return 'grammar';
};

/** The section a piece of text is in: the one named, else the only other one holding it. */
function locate(sections, tag, has) {
  const named = BY_TAG[String(tag ?? '').toUpperCase().replace(/[^A-Z]/g, '')];
  const own = named && sections.find((s) => s.key === named.key);
  if (own && has(own.text)) return own;
  const others = sections.filter((s) => s !== own && has(s.text));
  return others.length === 1 ? others[0] : null;
}

/** A stable key for a suggestion, so a dismissed one stays dismissed when it is suggested again. */
export function itemKey(item) {
  const parts = [item.source, item.section, item.kind === 'check' ? '' : item.kind, item.find || '', item.replace || '', item.quote || ''];
  if (item.kind === 'rewrite') parts.push(item.text || '');
  return fingerprint(parts.join('\u0001'));
}

/**
 * The layout a rewrite must keep, as a list: the part letters opening lines, each "- Label:" label
 * (nested ones too) and each heading line in capitals, in order.
 */
export function layoutOf(text) {
  const marks = [];
  for (const line of String(text ?? '').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const letter = t.match(/^\(([A-Z]{1,2}\d*)\)/);
    if (letter) marks.push(`(${letter[1]})`);
    const label = t.match(/^-\s*([^:\n]{1,60}):/);
    if (label) marks.push(`- ${label[1].trim().toLowerCase()}:`);
    else if (/^[A-Z0-9][A-Z0-9 ,()/&+-]*:?$/.test(t) && /[A-Z]{3}/.test(t)) marks.push(t);
  }
  return marks;
}
const sameLayout = (a, b) => { const x = layoutOf(a); const y = layoutOf(b); return x.length === y.length && x.every((m, i) => m === y[i]); };

/**
 * The model's answer, vetted against the report: { items, dropped }. Items are edits
 * ({ kind, section, find, replace, why, all }), checks ({ kind: 'check', section, quote, why }) and
 * rewrites ({ kind: 'rewrite', section, text, base, why }). A check with a change to accept by hand
 * carries `suggestion` (and `all`): an edit the guard turned back, or a flag giving "replace", where
 * the text is there once. `base` is the fingerprint of the section a rewrite was made from. Dropped
 * counts say what was set aside and why.
 */
export function vetReply(parsed, sections) {
  const dropped = { section: 0, notFound: 0, notUnique: 0, size: 0, same: 0, extra: 0, quote: 0, rewrite: 0, layout: 0 };
  const items = [];
  const seen = new Set();
  const push = (item) => {
    item.source = 'model';
    item.key = itemKey(item);
    if (seen.has(item.key)) return;
    seen.add(item.key);
    items.push(item);
  };
  let edits = 0;
  let flags = 0;
  for (const e of parsed?.edits || []) {
    const find = typeof e?.find === 'string' ? e.find : '';
    const replace = typeof e?.replace === 'string' ? e.replace : '';
    if (!find.trim()) { dropped.notFound++; continue; }
    if (find.length > MAX_FIND || replace.length > MAX_REPLACE || /[\r\n]/.test(find) || /[\r\n]/.test(replace)) { dropped.size++; continue; }
    if (find === replace) { dropped.same++; continue; }
    const s = locate(sections, e.section, (t) => t.includes(find));
    if (!s) { if (BY_TAG[String(e?.section ?? '').toUpperCase()]) dropped.notFound++; else dropped.section++; continue; }
    const n = occurrences(s.text, find);
    const all = n > 1 && isWord(find) && occurrences(s.text, find, true) > 0;
    if (n > 1 && !all) { dropped.notUnique++; continue; }
    const why = clip(e.why, MAX_WHY);
    const guard = safeEdit(find, replace);
    if (guard.safe) {
      if (edits >= MAX_EDITS) { dropped.extra++; continue; }
      edits++;
      push({ kind: kindOf(e.kind), section: s.key, find, replace, why, all });
    } else {
      if (flags >= MAX_FLAGS) { dropped.extra++; continue; }
      flags++;
      push({ kind: 'check', section: s.key, quote: find, suggestion: replace, why: why || 'Suggested change', guarded: guard.reason, ...(all ? { all } : {}) });
    }
  }
  for (const f of parsed?.flags || []) {
    const quote = clip(f?.quote, MAX_FIND);
    const why = clip(f?.why, MAX_WHY);
    if (!quote || !why) { dropped.quote++; continue; }
    const s = locate(sections, f.section, (t) => quoteFound(t, quote));
    if (!s) { dropped.quote++; continue; }
    if (flags >= MAX_FLAGS) { dropped.extra++; continue; }
    flags++;
    const item = { kind: 'check', section: s.key, quote, why };
    // The corrected text a flag gives is offered to accept by hand where its quote is in the section, exactly, once.
    const exact = typeof f?.quote === 'string' ? f.quote : '';
    const replace = typeof f?.replace === 'string' ? f.replace : null;
    if (replace !== null && exact && exact !== replace && exact.length <= MAX_FIND && replace.length <= MAX_REPLACE && !/[\r\n]/.test(exact + replace)) {
      const n = occurrences(s.text, exact);
      const all = n > 1 && isWord(exact) && occurrences(s.text, exact, true) > 0;
      if (n === 1 || all) Object.assign(item, { quote: exact, suggestion: replace, guarded: 'flag', ...(all ? { all } : {}) });
    }
    push(item);
  }
  let rewrites = 0;
  const rewritten = new Set();
  for (const r of parsed?.rewrites || []) {
    const named = BY_TAG[String(r?.section ?? '').toUpperCase().replace(/[^A-Z]/g, '')];
    const s = named && sections.find((x) => x.key === named.key);
    const text = typeof r?.text === 'string' ? r.text.replace(/\r\n?/g, '\n').replace(/\s+$/, '') : '';
    if (!s || !REWRITE_SECTIONS.includes(s.key) || !text.trim() || rewritten.has(s.key)) { dropped.rewrite++; continue; }
    if (text === s.text) { dropped.same++; continue; }
    if (text.length > MAX_REWRITE || text.length < s.text.length * 0.5 || text.length > s.text.length * 1.6 + 40) { dropped.size++; continue; }
    if (!sameLayout(s.text, text)) { dropped.layout++; continue; }
    if (rewrites >= MAX_REWRITES) { dropped.extra++; continue; }
    rewrites++;
    rewritten.add(s.key);
    push({ kind: 'rewrite', section: s.key, text, base: fingerprint(s.text), why: clip(r.why, MAX_WHY) });
  }
  return { items, dropped };
}

// ---------- the facts a rewrite keeps ----------

// Words of the case form's options that say nothing on their own.
const PLAIN = new Set([...FUNCTION_WORDS, 'or', 'other', 'describe', 'specify', 'specified', 'applicable', 'assessed', 'assessable', 'only', 'than', 'more', 'less', 'per', 'see', 'type']);

/**
 * The words of the case form's options (and their labels), in lower case and British spelling: a
 * rewrite that takes one out of a section, or brings a new one in, changes a fact.
 */
export function formTerms(schemas) {
  const terms = new Set();
  for (const s of schemas || []) {
    for (const f of [...(s?.fields || []), ...(s?.caseFields || [])]) {
      for (const o of f.options || []) {
        for (const text of [o, f.optionLabels?.[o]]) {
          for (const w of britishise(String(text ?? '')).toLowerCase().match(/[a-z]{3,}/g) || []) if (!PLAIN.has(w)) terms.add(w);
        }
      }
    }
  }
  return terms;
}

/**
 * The facts of a text, sorted: numbers (a decimal whole), tokens with a digit, the protected words,
 * the symbols, and the form's terms (`terms`, from formTerms).
 */
export function factTokens(text, terms = null) {
  const s = britishise(String(text ?? '')).toLowerCase();
  const out = [];
  for (const m of s.matchAll(/\d+(?:\.\d+)?[a-z0-9]*|[a-z]+[a-z0-9]*/g)) {
    const t = m[0];
    if (/\d/.test(t) || PROTECTED.has(t) || terms?.has(t)) out.push(t);
  }
  out.push(...(s.match(SYMBOLS) || []));
  return out.sort();
}

/** The items of `a` left once each item of `b` has taken one out (lists as bags). */
function bagMinus(a, b) {
  const left = [...b];
  const out = [];
  for (const t of a) {
    const k = left.indexOf(t);
    if (k >= 0) left.splice(k, 1); else out.push(t);
  }
  return out;
}

/** What a change does to the facts, in words: "changes 2.3 to 2.5", "takes out not", "adds focal". */
export function describeFacts(lost, added) {
  const list = (x) => [...new Set(x)].join(', ');
  if (lost.length === 1 && added.length === 1) return `changes ${lost[0]} to ${added[0]}`;
  return [lost.length ? `takes out ${list(lost)}` : '', added.length ? `adds ${list(added)}` : ''].filter(Boolean).join('; ');
}

/** What changing `before` to `after` does to the facts, in words, or '' (a flagged change's label). */
export function factChange(before, after, terms = null) {
  const a = factTokens(before, terms); const b = factTokens(after, terms);
  return describeFacts(bagMinus(a, b), bagMinus(b, a));
}

/**
 * A rewrite as tracked changes over the section's text: [{ from, to, text, old, flagged, facts }]
 * in order, positions in `base`. A change is flagged when it takes out a fact the whole rewrite
 * loses or brings in one the whole rewrite adds; a fact only moved to another sentence is not.
 */
export function rewriteChanges(base, text, terms = null) {
  const before = factTokens(base, terms); const after = factTokens(text, terms);
  const lost = bagMinus(before, after); const added = bagMinus(after, before);
  return diffWords(base, text, { join: 1 }).map((h) => {
    const old = base.slice(h.from, h.to);
    const a = factTokens(old, terms); const b = factTokens(h.text, terms);
    const out = bagMinus(a, b).filter((t) => lost.includes(t));
    const inn = bagMinus(b, a).filter((t) => added.includes(t));
    return { ...h, old, flagged: out.length + inn.length > 0, facts: describeFacts(out, inn) };
  });
}

/**
 * Whether the ticked changes of a rewrite can be taken together: null, or what to tick with them.
 * Taking some changes and not others must not lose a fact the whole rewrite keeps (moved from one
 * sentence to another), nor bring one in twice.
 */
export function checkTicked(base, text, changes, ticked, terms = null) {
  const result = applyHunks(base, changes.filter((c, i) => ticked[i]));
  const before = factTokens(base, terms); const after = factTokens(text, terms); const now = factTokens(result, terms);
  const lost = bagMinus(bagMinus(before, now), bagMinus(before, after));
  const added = bagMinus(bagMinus(now, before), bagMinus(after, before));
  if (!lost.length && !added.length) return null;
  return `Tick both changes that move ${[...new Set([...lost, ...added])].join(', ')}, or neither`;
}

/** A rewrite with only the ticked changes made: the new text of the section. */
export function tickedText(base, changes, ticked) {
  return applyHunks(base, changes.filter((c, i) => ticked[i]));
}

// ---------- rule checks ----------

const PLACEHOLDERS = [
  [/_{3,}/, 'A blank (___) is left in'],
  [/\bX{2,}\b/, 'A placeholder (XX) is left in'],
  [/\bTBC\b/, 'TBC is left in'],
  [/\?{2,}/, 'Question marks are left in'],
  [/\[\s*(?:\.\.\.|…)?\s*\]/, 'Empty brackets are left in'],
  [/<[A-Za-z][^<>\n]{0,30}>/, 'A template placeholder is left in']
];
const MARKDOWN = /\*\*|(^|\n)#{1,6} |(^|\n)\|.*\|/;
const SIDE = /\b(left|right)\b/gi;
// Phrases in the microscopy fixed by rule. The negatives ("No malignancy is identified", "negative
// for malignancy") are left to the model: a template prints "No malignancy is identified" in the
// user's own wording, and "negative for malignancy" is also a cytology category.
const HOUSE_PHRASES = [
  [/\bSections shows\b/g, () => 'Sections show', 'grammar', '"Sections show", plural verb']
];

/**
 * The shortest piece of `text` holding [from, to) that occurs once: whole words on one line, widened
 * a word at a time, to the right first. Null when even the whole line occurs more than once.
 */
function uniqueSpan(text, from, to) {
  const lineStart = text.lastIndexOf('\n', Math.max(0, from - 1)) + 1;
  const nl = text.indexOf('\n', Math.max(from, to - 1));
  const lineEnd = nl < 0 ? text.length : nl;
  if (to > lineEnd) return null;
  const words = [...text.slice(lineStart, lineEnd).matchAll(/[A-Za-z0-9]+/g)].map((m) => [lineStart + m.index, lineStart + m.index + m[0].length]);
  if (!words.length) return occurrences(text, text.slice(lineStart, lineEnd)) === 1 ? [lineStart, lineEnd] : null;
  let i = words.findIndex(([, e]) => e > from);
  if (i < 0) i = words.length - 1;
  let j = words.length - 1;
  while (j > i && words[j][0] >= to) j--;
  for (let k = 0; k < words.length; k++) {
    for (let left = 0; left <= k; left++) {
      const right = k - left;
      if (i - left < 0 || j + right >= words.length) continue;
      const a = Math.min(from, words[i - left][0]);
      const b = Math.max(to, words[j + right][1]);
      if (occurrences(text, text.slice(a, b)) === 1) return [a, b];
    }
  }
  return null;
}

/** An edit turning `text` into `next` where they differ, as a unique find / replace pair, or null. */
export function editBetween(text, next) {
  if (text === next) return null;
  let p = 0;
  while (p < text.length && p < next.length && text[p] === next[p]) p++;
  let s = 0;
  while (s < text.length - p && s < next.length - p && text[text.length - 1 - s] === next[next.length - 1 - s]) s++;
  const span = uniqueSpan(text, p, text.length - s);
  if (!span) return null;
  const [a, b] = span;
  const tail = text.length - b;
  return { find: text.slice(a, b), replace: next.slice(a, next.length - tail) };
}

/**
 * The rule checks for the printed blocks: [{ source: 'rule', kind, section, find, replace, why, all }]
 * for edits and [{ source: 'rule', kind: 'check', section, quote, why }] for checks.
 */
export function ruleChecks(sections) {
  const items = [];
  const push = (item) => {
    item.source = 'rule';
    item.key = itemKey(item);
    if (!items.some((i) => i.key === item.key)) items.push(item);
  };
  for (const s of sections) {
    const text = s.text;
    // British spelling, word by word: each American form once, for all its occurrences.
    const words = new Set(text.match(/[A-Za-z]+/g) || []);
    for (const w of words) {
      if (!BRITISH[w.toLowerCase()]) continue;
      const rep = britishise(w);
      if (rep !== w) push({ kind: 'spelling', section: s.key, find: w, replace: rep, why: 'British spelling', all: true });
    }
    // Plain text for the LIS: each character the LIS would not take, with the word around it.
    for (const m of text.matchAll(/[^\s]*[^\x09\x0A\x0D\x20-\x7E][^\s]*/g)) {
      const next = text.slice(0, m.index) + toAscii(m[0]) + text.slice(m.index + m[0].length);
      const e = editBetween(text, next);
      if (e) push({ kind: 'house style', section: s.key, ...e, why: 'Plain text for the LIS' });
    }
    // A word typed twice ("the the"), on one line.
    for (const m of text.matchAll(/\b([A-Za-z]{2,})[ \t]+\1\b/gi)) {
      const e = phraseEdit(text, m, m[1]);
      if (e) push({ kind: 'typing', section: s.key, ...e, why: `"${m[1].toLowerCase()}" is typed twice` });
    }
    // Stray punctuation and spacing typos ("..", ",,", "word .").
    for (const m of text.matchAll(/(?<!\.)\.\.(?!\.)/g)) {
      const e = editBetween(text, text.slice(0, m.index) + '.' + text.slice(m.index + 2));
      if (e) push({ kind: 'typing', section: s.key, ...e, why: 'Double full stop' });
    }
    for (const m of text.matchAll(/,[ \t]*,/g)) {
      const e = editBetween(text, text.slice(0, m.index) + ',' + text.slice(m.index + m[0].length));
      if (e) push({ kind: 'typing', section: s.key, ...e, why: 'Repeated comma' });
    }
    for (const m of text.matchAll(/([A-Za-z0-9]) +([,.;])(?=\s|$)/g)) {
      const e = phraseEdit(text, m, `${m[1]}${m[2]}`);
      if (e) push({ kind: 'typing', section: s.key, ...e, why: 'Extra space before punctuation' });
    }
    if (s.key === 'microscopy') {
      for (const [re, to, kind, why] of HOUSE_PHRASES) {
        for (const m of text.matchAll(re)) {
          const e = phraseEdit(text, m, to(m[0], ...m.slice(1)));
          if (e) push({ kind, section: s.key, ...e, why });
        }
      }
    }
    for (const [re, why] of PLACEHOLDERS) {
      const m = text.match(re);
      if (m) push({ kind: 'check', section: s.key, quote: lineAround(text, m.index), why });
    }
    if (MARKDOWN.test(text)) push({ kind: 'check', section: s.key, quote: lineAround(text, text.search(MARKDOWN) + 1), why: 'Markdown does not paste into the LIS as plain text' });
    const open = unclosed(text);
    if (open !== null) push({ kind: 'check', section: s.key, quote: lineAround(text, open), why: 'A bracket is not closed' });
  }
  // The diagnosis connectors (src/style.js houseConnectors), for typed or pasted text: the generated
  // diagnosis has them already. They change only capitals, so each run of changed letters (spaces
  // between them joined) is its own edit.
  const dx = sections.find((s) => s.key === 'diagnosis');
  if (dx) {
    const fixed = dx.text.split('\n').map((line) => houseConnectors(line)).join('\n');
    if (fixed !== dx.text && fixed.length === dx.text.length) {
      for (const [from, to] of changedRuns(dx.text, fixed)) {
        const span = uniqueSpan(dx.text, from, to);
        if (!span) continue;
        const [a, b] = span;
        push({ kind: 'house style', section: 'diagnosis', find: dx.text.slice(a, b), replace: fixed.slice(a, b), why: 'House connectors: lower-case "with" and qualifiers' });
      }
    }
  }
  // Laterality & part-letter census across Specimen and Diagnosis.
  const spec = sections.find((s) => s.key === 'specimens');
  if (spec && dx) {
    const sides = (t) => new Set([...t.matchAll(SIDE)].map((m) => m[1].toLowerCase()));
    const specParts = partChunks(spec.text);
    const dxParts = partChunks(dx.text);
    if (specParts.length && dxParts.length) {
      const dxMap = new Map(dxParts.map((p) => [p.letter, p]));
      for (const sp of specParts) {
        const dp = dxMap.get(sp.letter);
        if (!dp) continue;
        const a = sides(sp.text); const b = sides(dp.text);
        if (a.size === 1 && b.size === 1 && [...a][0] !== [...b][0]) {
          const rel = dp.text.search(SIDE);
          push({ kind: 'check', section: 'diagnosis', quote: lineAround(dx.text, dp.index + Math.max(0, rel)), why: `Part (${sp.letter}): specimen says ${[...a][0]}, diagnosis says ${[...b][0]}` });
        }
      }
    } else {
      const a = sides(spec.text); const b = sides(dx.text);
      if (a.size === 1 && b.size === 1 && [...a][0] !== [...b][0]) {
        const at = dx.text.search(SIDE);
        push({ kind: 'check', section: 'diagnosis', quote: lineAround(dx.text, at), why: `The specimen says ${[...a][0]}, the diagnosis ${[...b][0]}` });
      }
    }
    if (specParts.length >= 2) {
      const specLetters = new Set(specParts.map((p) => p.letter));
      const dxMentioned = mentionedPartLetters(dx.text);
      if (dxMentioned.size > 0) {
        for (const sp of specParts) {
          if (!dxMentioned.has(sp.letter)) {
            push({ kind: 'check', section: 'specimens', quote: lineAround(spec.text, sp.index), why: `Part (${sp.letter}) is in Specimen but missing from Diagnosis` });
          }
        }
        for (const dp of dxParts) {
          if (!specLetters.has(dp.letter)) {
            push({ kind: 'check', section: 'diagnosis', quote: lineAround(dx.text, dp.index), why: `Part (${dp.letter}) is in Diagnosis but not in Specimen` });
          }
        }
      }
    }
  }
  // Cross-section cm vs mm order-of-magnitude mismatch on lesion/tumour measurements.
  const sizeSections = ['macro', 'microscopy', 'diagnosis'].map((k) => sections.find((s) => s.key === k)).filter(Boolean);
  if (sizeSections.length >= 2) {
    const seen = new Map(); // numeric string -> { unit, section, index }
    for (const s of sizeSections) {
      for (const hit of lesionSizes(s.text)) {
        const prev = seen.get(hit.num);
        if (!prev) {
          seen.set(hit.num, { unit: hit.unit, section: s, index: hit.index });
        } else if (prev.section.key !== s.key && prev.unit !== hit.unit) {
          push({
            kind: 'check',
            section: s.key,
            quote: lineAround(s.text, hit.index),
            why: `Possible unit mismatch: ${hit.num} ${prev.unit} in ${prev.section.label} vs ${hit.num} ${hit.unit} in ${s.label}`
          });
        }
      }
    }
  }
  return items;
}

/** Split a section into per-part chunks keyed by leading "(A)" .. "(Z)" markers. */
function partChunks(text) {
  const headers = [...String(text ?? '').matchAll(/(?:^|\n)\(([A-Z])\)(?=\s|$)/g)];
  if (!headers.length) return [];
  const out = [];
  for (let i = 0; i < headers.length; i++) {
    const m = headers[i];
    const start = m.index + (m[0].startsWith('\n') ? 1 : 0);
    const end = i + 1 < headers.length ? headers[i + 1].index : text.length;
    out.push({ letter: m[1], index: start, text: text.slice(start, end) });
  }
  return out;
}

/** All part letters referenced in a section, expanding ranges like "(A)-(C)" or "(A) to (C)". */
function mentionedPartLetters(text) {
  const letters = new Set();
  const s = String(text ?? '');
  for (const m of s.matchAll(/\(([A-Z])\)/g)) letters.add(m[1]);
  for (const m of s.matchAll(/\(([A-Z])\)\s*(?:-|to)\s*\(([A-Z])\)/gi)) {
    const a = m[1].toUpperCase().charCodeAt(0);
    const b = m[2].toUpperCase().charCodeAt(0);
    if (b > a && b - a <= 25) for (let c = a; c <= b; c++) letters.add(String.fromCharCode(c));
  }
  return letters;
}

/** Extract lesion/tumour measurements (value >= 1, unit mm/cm) for unit-mismatch checks. */
function lesionSizes(text) {
  const out = [];
  const re = /(?:tumour|tumor|lesion|carcinoma|adenoma|polyp|nodule|mass|melanoma|sarcoma|size)[^.\n]{0,40}?\b(\d+(?:\.\d+)?)\s*(mm|cm)\b/gi;
  for (const m of String(text ?? '').matchAll(re)) {
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n) || n < 1) continue;
    out.push({ num: String(n), unit: m[2].toLowerCase(), index: m.index });
  }
  return out;
}

/** An edit replacing a matched phrase: the phrase itself when it occurs once, else the shortest unique span. */
function phraseEdit(text, m, replacement) {
  if (occurrences(text, m[0]) === 1) return { find: m[0], replace: replacement };
  return editBetween(text, text.slice(0, m.index) + replacement + text.slice(m.index + m[0].length));
}

/** Ranges where two texts of the same length differ, a run of spaces between two ranges joining them. */
function changedRuns(a, b) {
  const runs = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const last = runs[runs.length - 1];
    if (last && /^ *$/.test(a.slice(last[1], i))) last[1] = i + 1;
    else runs.push([i, i + 1]);
  }
  return runs;
}

/** The line holding position `at`, clipped for a quote. */
function lineAround(text, at) {
  const start = text.lastIndexOf('\n', Math.max(0, at - 1)) + 1;
  const end = text.indexOf('\n', at);
  return clip(text.slice(start, end < 0 ? text.length : end), 120);
}

/** The position of the first bracket left open (or closed without opening), or null. */
function unclosed(text) {
  const stack = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(' || c === '[') stack.push(i);
    else if (c === ')' || c === ']') { if (!stack.length) return i; stack.pop(); }
  }
  return stack.length ? stack[0] : null;
}

// ---------- the record kept with the case ----------

/** Fingerprints of the blocks proofread, by block key. */
export function sectionHashes(sections) {
  return Object.fromEntries(sections.map((s) => [s.key, fingerprint(s.text)]));
}

/** The blocks changed since the record was made (added, removed or edited), in report order. */
export function changedSince(record, sections) {
  if (!record?.hashes) return [];
  const now = sectionHashes(sections);
  return SECTIONS.map((s) => s.key).filter((k) => (now[k] || '') !== (record.hashes[k] || ''));
}

/**
 * A new record from a vetted answer. Dismissed suggestions of an earlier record stay dismissed when
 * suggested again. `by` names the model and Han Slide's version; `seconds` the time it took.
 */
export function newRecord({ items, dropped, sections, by, seconds, at = new Date().toISOString(), previous = null }) {
  const dismissed = new Set([...(previous?.dismissed || []), ...((previous?.items || []).filter((i) => i.status === 'dismissed').map((i) => i.key))]);
  return {
    v: 2,
    at,
    by,
    seconds: Math.round((seconds || 0) * 10) / 10,
    hashes: sectionHashes(sections),
    items: items.map((i, n) => ({ ...i, id: `m${n + 1}`, status: dismissed.has(i.key) ? 'dismissed' : 'open' })),
    dropped,
    dismissed: [...dismissed].filter((k) => !items.some((i) => i.key === k))
  };
}

/**
 * The suggestions to show now: the rule checks and the record's open items that still apply to the
 * text on screen. A dismissed one is left out, and so is one whose text is no longer there.
 */
export function openItems(record, rules, sections) {
  const dismissed = new Set([...(record?.dismissed || []), ...((record?.items || []).filter((i) => i.status === 'dismissed').map((i) => i.key))]);
  const textOf = (key) => sections.find((s) => s.key === key)?.text ?? '';
  const applies = (i) => (i.kind === 'check' ? quoteFound(textOf(i.section), i.quote)
    : i.kind === 'rewrite' ? !!i.text && fingerprint(textOf(i.section)) === i.base
      : applyEdit(textOf(i.section), i) !== null);
  const fromModel = (record?.items || []).filter((i) => i.status === 'open' && applies(i));
  const ruleKeys = new Set();
  const fromRules = rules.filter((i) => !dismissed.has(i.key) && !fromModel.some((m) => m.section === i.section && m.find && m.find === i.find)).filter((i) => {
    if (ruleKeys.has(i.key)) return false;
    ruleKeys.add(i.key);
    return true;
  });
  return [...fromRules, ...fromModel];
}

/**
 * Consolidate piecemeal spelling, typing, grammar and house-style edits into one whole-segment
 * rewrite preview per section, so the consultant reviews and accepts all changes for a segment
 * together rather than sentence by sentence. Clinical checks and flagged changes stay separate.
 */
export function groupEditsAsRewrites(items, sections) {
  const byKey = Object.fromEntries((sections || []).map((s) => [s.key, s]));
  const checks = [];
  const perSection = new Map();
  for (const item of items || []) {
    if (item.kind === 'check') { checks.push(item); continue; }
    let bucket = perSection.get(item.section);
    if (!bucket) { bucket = { rewrite: null, edits: [] }; perSection.set(item.section, bucket); }
    if (item.kind === 'rewrite' && !bucket.rewrite) bucket.rewrite = item;
    else if (item.kind !== 'rewrite') bucket.edits.push(item);
  }
  const out = [...checks];
  for (const s of SECTIONS) {
    const bucket = perSection.get(s.key);
    if (!bucket) continue;
    const { rewrite, edits } = bucket;
    if (!edits.length) {
      if (rewrite) out.push(rewrite);
      continue;
    }
    const base = byKey[s.key]?.text ?? '';
    if (!base) {
      if (rewrite) out.push(rewrite);
      out.push(...edits);
      continue;
    }
    let next = rewrite ? rewrite.text : base;
    const applied = rewrite ? [rewrite] : [];
    const leftover = [];
    for (const e of edits) {
      const t = applyEdit(next, e);
      if (t !== null && t !== next) {
        next = t;
        applied.push(e);
      } else if (rewrite && applyEdit(base, e) !== null && t === null) {
        // The AI rewrite already resolved this rule/edit span; bundle it so Accept/Dismiss clears both.
        applied.push(e);
      } else {
        leftover.push(e);
      }
    }
    if (next !== base && applied.length) {
      const kinds = [...new Set(applied.map((m) => m.kind).filter((k) => k && k !== 'rewrite'))];
      const reasons = [...new Set(applied.map((m) => m.why).filter(Boolean))];
      const source = applied.some((m) => m.source === 'model') ? 'model' : 'rule';
      const combined = {
        kind: 'rewrite',
        section: s.key,
        text: next,
        base: fingerprint(base),
        why: clip(reasons.join('; '), MAX_WHY),
        source,
        kinds,
        combined: applied
      };
      combined.key = itemKey(combined);
      out.push(combined);
    } else if (rewrite) {
      out.push(rewrite);
    }
    out.push(...leftover);
  }
  return out;
}

/** A line for Checks: when and by what the report was proofread, and what has changed since. */
export function recordSummary(record, sections, now = new Date()) {
  if (!record?.at) return '';
  const at = new Date(record.at);
  const sameDay = at.toDateString() === now.toDateString();
  const time = at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const when = sameDay ? `at ${time}` : `on ${at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at ${time}`;
  const counts = { accepted: 0, dismissed: 0 };
  for (const i of record.items || []) if (counts[i.status] !== undefined) counts[i.status]++;
  const done = [counts.accepted ? `${counts.accepted} accepted` : '', counts.dismissed ? `${counts.dismissed} dismissed` : ''].filter(Boolean).join(', ');
  const changed = changedSince(record, sections).map((k) => BY_KEY[k]?.label || k);
  const since = changed.length ? `changed since: ${changed.join(', ')}` : 'unchanged since';
  return `Proofread ${when} by ${record.by || MODEL_NAME}${done ? ` (${done})` : ''}; ${since}.`;
}
