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
// at. Nothing changes until the pathologist accepts an edit.

import { BRITISH, britishise, houseConnectors, toAscii } from './style.js';

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
/** Han Slide refuses longer questions (its own limit is the same). */
export const MAX_PROMPT_CHARS = 40000;
export const MAX_TOKENS = 1400;
export const MAX_EDITS = 12;
export const MAX_FLAGS = 8;
const MAX_FIND = 200;
const MAX_REPLACE = 300;
const MAX_WHY = 160;

/** Labels for the kinds of suggestion, as Checks shows them. */
export const KIND_LABEL = { spelling: 'Spelling', typing: 'Typing', grammar: 'Grammar', 'house style': 'House style', check: 'Check' };

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
  'no', 'not', 'none', 'nil', 'nor', 'neither', 'never', 'without', 'cannot', 'absent', 'present',
  'negative', 'positive', 'equivocal', 'indeterminate', 'suspicious', 'possible', 'probable', 'likely',
  'high', 'low', 'intermediate', 'well', 'moderately', 'poorly', 'undifferentiated', 'differentiated',
  'benign', 'malignant', 'malignancy', 'invasive', 'invasion', 'microinvasive', 'situ', 'non',
  'involved', 'uninvolved', 'clear', 'close', 'free', 'margin', 'margins', 'focal', 'diffuse', 'extensive',
  'grade', 'stage', 'ajcc', 'figo', 'gleason', 'isup', 'who', 'fnclcc', 'nottingham', 'tnm',
  'mm', 'cm', 'm', 'g', 'kg', 'mg', 'ml', 'l', 'um', 'micron', 'microns', 'x', 'percent',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'single', 'multiple', 'multifocal', 'unifocal', 'several', 'all', 'some', 'few', 'many',
  'er', 'pr', 'ki', 'mmr', 'mlh', 'pms', 'msh', 'pd', 'alk', 'ros', 'egfr', 'kras', 'braf', 'idh',
  'myc', 'bcl', 'cd', 'ck', 'ttf', 'gata', 'sox', 'wt', 'p', 'sstr', 'synaptophysin', 'chromogranin',
  'amplified', 'nonamplified', 'mutated', 'mutant', 'wild', 'type', 'deficient', 'proficient', 'loss', 'retained', 'intact',
  'equivocal', 'score', 'tps', 'cps', 'ihc', 'ish', 'fish', 'dish', 'pcr', 'stain', 'stains'
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
  'Microscopy opens with "Sections show"; a negative reads "There is no evidence of ..." ("no evidence of malignancy", not "no malignancy is seen" or "negative for malignancy"); immunohistochemistry stays in the microscopy paragraph.',
  'Concise: take out a repeated word or phrase; leave a correct sentence as it is.'
];

export const SYSTEM_PROMPT = [
  'You proofread surgical pathology reports for a consultant histopathologist before sign-out. The reports are in British English and are pasted as plain text into a laboratory information system (LIS).',
  '',
  'Find:',
  '1. Spelling, typing and grammar errors.',
  '2. Wording that departs from the house style below.',
  '3. Facts that disagree between sections: size, count, side, site, margin, grade, stage, a biomarker result, or the diagnosis against the microscopy or the macroscopic description.',
  '',
  'House style:',
  ...HOUSE_STYLE.map((r) => `- ${r}`),
  '',
  'Rules:',
  '- Never change the meaning. Do not change a number, measurement, unit, side (left, right, bilateral), site, negation (no, not, without, negative, positive, absent, present), grade, stage, margin status, biomarker result, or one diagnosis for another; correcting the spelling of a word is allowed. If one of these looks wrong or disagrees with another section, report it in "flags" instead.',
  '- [HISTORY] is context only: never edit it.',
  '- "find" is copied exactly from one section: a few words on one line, enough to be unique there. "replace" is the corrected text for that span only.',
  '- "kind" is "spelling", "grammar" or "house style". "why" is at most 12 words.',
  `- At most ${MAX_EDITS} edits and ${MAX_FLAGS} flags, the most important first. If nothing needs changing, reply {"edits":[],"flags":[]}.`,
  '',
  'Reply with one JSON object only, no other text:',
  '{"edits":[{"section":"MICRO","find":"...","replace":"...","kind":"spelling","why":"..."}],"flags":[{"section":"DX","quote":"...","why":"..."}]}'
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
      if (o && typeof o === 'object' && (Array.isArray(o.edits) || Array.isArray(o.flags))) {
        return { edits: Array.isArray(o.edits) ? o.edits : [], flags: Array.isArray(o.flags) ? o.flags : [], whole: true, readable: true };
      }
    } catch { /* cut off or untidy: take the items one by one */ }
  }
  const edits = []; const flags = [];
  for (const m of raw.matchAll(/\{[^{}]*\}/g)) {
    let o;
    try { o = JSON.parse(m[0]); } catch { continue; }
    if (o && typeof o.find === 'string') edits.push(o);
    else if (o && typeof o.quote === 'string') flags.push(o);
  }
  return { edits, flags, whole: false, readable: edits.length + flags.length > 0 || /"(edits|flags)"\s*:/.test(raw) };
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
  return fingerprint([item.source, item.section, item.kind === 'check' ? '' : item.kind, item.find || '', item.replace || '', item.quote || ''].join('\u0001'));
}

/**
 * The model's answer, vetted against the report: { items, dropped }. Items are edits
 * ({ kind, section, find, replace, why, all }) or checks ({ kind: 'check', section, quote, why,
 * suggestion }); dropped counts say what was set aside and why.
 */
export function vetReply(parsed, sections) {
  const dropped = { section: 0, notFound: 0, notUnique: 0, size: 0, same: 0, extra: 0, quote: 0 };
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
      push({ kind: 'check', section: s.key, quote: find, suggestion: replace, why: why || 'Suggested change', guarded: guard.reason });
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
    push({ kind: 'check', section: s.key, quote, why });
  }
  return { items, dropped };
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
  // A side named in the specimen and only the other side in the diagnosis.
  const spec = sections.find((s) => s.key === 'specimens');
  if (spec && dx) {
    const sides = (t) => new Set([...t.matchAll(SIDE)].map((m) => m[1].toLowerCase()));
    const a = sides(spec.text); const b = sides(dx.text);
    if (a.size === 1 && b.size === 1 && [...a][0] !== [...b][0]) {
      const at = dx.text.search(SIDE);
      push({ kind: 'check', section: 'diagnosis', quote: lineAround(dx.text, at), why: `The specimen says ${[...a][0]}, the diagnosis ${[...b][0]}` });
    }
  }
  return items;
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
    v: 1,
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
  const applies = (i) => (i.kind === 'check' ? quoteFound(textOf(i.section), i.quote) : applyEdit(textOf(i.section), i) !== null);
  const fromModel = (record?.items || []).filter((i) => i.status === 'open' && applies(i));
  const ruleKeys = new Set();
  const fromRules = rules.filter((i) => !dismissed.has(i.key) && !fromModel.some((m) => m.section === i.section && m.find && m.find === i.find)).filter((i) => {
    if (ruleKeys.has(i.key)) return false;
    ruleKeys.add(i.key);
    return true;
  });
  return [...fromRules, ...fromModel];
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
