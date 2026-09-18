// Macro extraction (roadmap card (e)): read the pasted LIS macroscopic description and
// pre-fill a template's macro fields (weight, dimensions, tumour size, depth of invasion,
// wall thickness, cavity length, length / diameter, block count).
//
// A schema opts in with a `macroExtract` map:  { fieldId: { concept, unit?, near? } }
//   concept  one of CONCEPTS below
//   unit     'mm' | 'cm' | 'g' | 'count' — the unit the field is typed in (default mm)
//   label    true → append the unit to the text ("5 mm") for free-text fields that accept either unit
//   min      arrays only: minimum number of dimensions to accept (default 2; use 1 for "2.8 or 2.8 x 2 x 1.5")
//   near     optional regex source; the concept is searched only in sentences mentioning it
// Values are extracted from the chunk of the paste belonging to the part ("(A) …", "(B) …";
// unlettered text belongs to part A) and written only to fields still at their default or
// still holding the previous auto-fill, so a hand-edited value is never overwritten.

import { defaultValues } from './engine.js';

const NUM = String.raw`(\d+(?:\.\d+)?)`;
const UNIT = String.raw`(mm|cm|millimet(?:er|re)s?|centimet(?:er|re)s?)`;
const APPROX = String.raw`(?:approximately|approx\.?|about|roughly|at least|up to|around)?\s*`;
const SEP = String.raw`\s*(?:x|×|by)\s*`;
// A run of one to three measurements: "9 x 6 x 4 cm", "1.5 cm x 1 cm x 0.5 cm", "0.4 cm".
const DIMS = new RegExp(String.raw`${NUM}\s*(?:${UNIT})?(?:${SEP}${NUM}\s*(?:${UNIT})?)?(?:${SEP}${NUM}\s*(?:${UNIT})?)?\s*${UNIT}`, 'gi');
const MARKER = /\(([A-Z])\)/g;
const TUMOUR_WORDS = /\b(tumou?r|mass|lesion|nodule|growth|polyp|ulcer|carcinoma|neoplasm|thickening|cyst|fibroids?|leiomyomas?|adenoma|goitre|goiter|scar|stone|calcul\w+)\b/i;
const NOT_SPECIMEN = /\b(tumou?r|mass|lesion|nodule|growth|polyp|ulcer|cyst|ovary|ovaries|tube|fimbria\w*|cervix|nipple|stitch|suture|areola|stone|calcul\w+|lymph node|appendix|omentum|cavity|wall|myometri\w+|thickness|deep|depth|margin|from the|comes to|apart from)\b/i;

function isCm(u) { return /^c/i.test(u || ''); }
function mmOf(n, u) { return isCm(u) ? Number(n) * 10 : Number(n); }
export function fmt(mm, unit = 'mm') {
  if (mm === null || mm === undefined || !Number.isFinite(mm)) return '';
  const v = unit === 'cm' ? mm / 10 : mm;
  return String(Math.round(v * 100) / 100);
}
function fmtDims(mms, unit) { return mms.map((m) => fmt(m, unit)).join(' x '); }

function sentences(text) { return text.split(/(?<=[.;])\s+|\n+/).map((s) => s.trim()).filter(Boolean); }

/** Every measurement run in `text`: { index, mms[], max }; the trailing unit applies to unitless earlier numbers. */
export function findDims(text) {
  const out = [];
  DIMS.lastIndex = 0;
  let m;
  while ((m = DIMS.exec(text))) {
    const [, n1, u1, n2, u2, n3, u3, uLast] = m;
    const nums = [[n1, u1], [n2, u2], [n3, u3]].filter(([n]) => n !== undefined);
    const mms = nums.map(([n, u]) => mmOf(n, u || uLast));
    out.push({ index: m.index, end: m.index + m[0].length, mms, max: Math.max(...mms), text: m[0] });
  }
  return out;
}

function before(text, index, n = 90) { return text.slice(Math.max(0, index - n), index); }

// ---------- concept extractors: (text) → mm / g / count or null ----------

function weight(text) {
  const m = /weigh(?:s|ing|t)?\s*(?:is|of|:)?\s*(?:approximately|approx\.?|about)?\s*(\d+(?:\.\d+)?)\s*(g|gm|gms|grams?)\b/i.exec(text)
    || /\b(\d+(?:\.\d+)?)\s*(g|gm|gms|grams?)\b(?!\s*\/|\s*(?:x|×)\s*\d)/i.exec(text);   // a bare gram figure is the weight
  return m ? Number(m[1]) : null;
}

const AXIS = String.raw`(?:from\s+)?(?:cervix\s+to\s+fundus|fundus\s+to\s+cervix|cornu\s+to\s+cornu|intercornual\w*|antero-?posterior\w*|superoinferior\w*|mediolateral\w*|craniocaudal\w*|transvers\w*|in\s+length|long|wide|in\s+width|in\s+thickness|thick|deep|from\s+superficial\s+to\s+deep|superficial\s+to\s+deep|from\s+(?:the\s+)?fundus\s+to|from\s+(?:the\s+)?cervix\s+to|proximal\s+to\s+distal|from\s+medial\s+to\s+lateral|from\s+superior\s+to\s+inferior)`;
const AXES = new RegExp(String.raw`${NUM}\s*${UNIT}\s*${AXIS}`, 'gi');
const ADNEXA = /\b(ovary|ovaries|ovarian|tube|tubes|fimbria\w*|nipple|areola|stone|calcul\w+|lymph\s+node|appendix|omentum|cavity|cervix\s+measures|stitch|suture|margin|endometri\w+)\b/i;
const SPECIMEN_LEAD = /^(?:(?:the|a|an|this)\s+)?(?:[\w-]+\s+){0,3}?(?:uterus|specimen|it|whole|entire|gallbladder|kidney|liver|thyroid|spleen|placenta|breast|lung|stomach|colon|bowel|segment|piece|portion|ellipse|lobe|adrenal|prostate|parotid|submandibular|salivary|testis|tonsil|hemicolectomy|lumpectomy|mastectomy|wedge)\b/i;

/** Axis measurements in one sentence: "9 cm from cervix to fundus, 4.8 cm from cornu to cornu and 3.5 cm anteroposteriorly" → mm[] (≥2) or null. */
function axesIn(sentence) {
  const found = [];
  AXES.lastIndex = 0;
  let m;
  while ((m = AXES.exec(sentence)) && found.length < 3) found.push(mmOf(m[1], m[2]));
  return found.length >= 2 ? found : null;
}

function specimenDims(text) {
  let fallback = null;
  for (const s of sentences(text)) {
    if (TUMOUR_WORDS.test(s)) continue;
    const runs = findDims(s).filter((d) => d.mms.length >= 2 && !NOT_SPECIMEN.test(before(s, d.index)));
    const axes = axesIn(s);
    const lead = SPECIMEN_LEAD.test(s.replace(/^[^A-Za-z]+/, '').replace(/^['"‘’“”].*?['"‘’“”]\.?\s*/, ''));
    if (ADNEXA.test(s) && !lead) { if (!fallback && (axes || runs[0])) fallback = axes || runs[0].mms; continue; }
    if (axes) return axes;
    if (runs[0]) return runs[0].mms;
  }
  return fallback;
}

/** Size of the tumour / lesion: the measurement run after a tumour word ("measuring 4.5 x 3.5 x 1.2 cm"), or its spanning axes. */
function tumourDims(text) {
  for (const s of sentences(text)) {
    const tw = TUMOUR_WORDS.exec(s);
    if (!tw) continue;
    const runs = findDims(s).filter((d) => d.index > tw.index)
      .filter((d) => !/^\s*(?:from|to|away|of\s+the|clear|thick|deep|depth|out\s+of|into|in\s+depth)\b/i.test(s.slice(d.end, d.end + 12)))
      .filter((d) => !/(?:myometri\w+|wall|thickness|within|comes\s+to|to\s+the|margin|at)\s*(?:approximately|approx\.?|about|at\s+least)?\s*$/i.test(before(s, d.index, 30)));
    if (!runs.length) continue;
    if (runs[0].mms.length >= 2) return runs[0].mms;
    const axes = axesIn(s.slice(tw.index));
    if (axes) return axes;
    if (/\b(?:rang\w+|up\s+to|largest|between|and)\b/i.test(s)) return [Math.max(...runs.filter((d) => d.mms.length === 1).map((d) => d.max))];
    return runs[0].mms;
  }
  return null;
}
function tumourSizeMax(text) { const d = tumourDims(text); return d ? Math.max(...d) : null; }

function depthOfInvasion(text) {
  const pats = [
    new RegExp(String.raw`depth\s+of\s+(?:\w+\s+)?(?:invasion|infiltration)\s*(?:is|of|measures|measuring|:|=)?\s*${APPROX}${NUM}\s*${UNIT}`, 'i'),
    new RegExp(String.raw`invad(?:es|ing|ed)\s+(?:the\s+\w+\s+)?(?:to\s+a\s+depth\s+of|for|up\s+to|into\s+the\s+\w+\s+(?:for|by|to\s+a\s+depth\s+of))\s*${APPROX}${NUM}\s*${UNIT}`, 'i'),
    new RegExp(String.raw`${NUM}\s*(?:${UNIT})?\s*(?:thick|deep|in\s+depth|in\s+thickness|invasion|of\s+invasion)?\s*(?:out\s+of|of|into|in|within|through)\s+(?:a|an|the)?\s*(?:total\s+)?(?:myometri\w+|uterine\s+wall|wall|muscularis)\s*(?:thickness|wall)?\s*(?:of|measuring|which\s+measures|that\s+measures)?\s*${APPROX}${NUM}\s*${UNIT}`, 'i'),
    new RegExp(String.raw`(?:invasion|invades|infiltrat\w+|myometri\w+)[^.]{0,40}?${NUM}\s*/\s*${NUM}\s*${UNIT}`, 'i')
  ];
  for (const re of pats) {
    const m = re.exec(text);
    if (!m) continue;
    const g = m.slice(1).filter((x) => x !== undefined);
    // last group is a unit; the first number takes its own unit if present, else the trailing one
    const unit = g[g.length - 1];
    return mmOf(g[0], g[1] && /^(mm|cm|milli|centi)/i.test(g[1]) ? g[1] : unit);
  }
  return null;
}

function wallThickness(text) {
  const pats = [
    new RegExp(String.raw`(?:myometri\w+|endometri\w+|uterine\s+wall|wall|muscularis|cyst\s+wall|gallbladder\s+wall)\s+(?:thickness|thickened|measures|measuring|is|of)\s*(?:is|of|up\s+to|measures|measuring|:)?\s*${APPROX}${NUM}\s*${UNIT}`, 'i'),
    new RegExp(String.raw`(?:out\s+of|of|in|into|within|through)\s+(?:a|an|the)?\s*(?:total\s+)?(?:myometri\w+|uterine\s+wall|wall|muscularis)\s*(?:thickness|wall)?\s*(?:of|measuring|which\s+measures|that\s+measures)?\s*${APPROX}${NUM}\s*${UNIT}`, 'i'),
    new RegExp(String.raw`(?:myometri\w+|uterine\s+wall|cyst\s+wall|gallbladder\s+wall)\b(?:(?!inva|infiltrat|tumou?r)[^.;]){0,30}?(?:measures|measuring|is|thickness(?:\s+of)?)\s*${APPROX}${NUM}\s*${UNIT}`, 'i'),
    new RegExp(String.raw`${NUM}\s*${UNIT}\s*(?:thick|in\s+thickness)\s+(?:myometri\w+|wall)`, 'i'),
    new RegExp(String.raw`(?:myometri\w+|wall)[^.]{0,30}?${NUM}\s*${UNIT}\s*(?:thick|in\s+thickness)`, 'i'),
    new RegExp(String.raw`(?:invasion|invades|infiltrat\w+|myometri\w+)[^.]{0,40}?${NUM}\s*/\s*${NUM}\s*${UNIT}`, 'i')
  ];
  for (let i = 0; i < pats.length; i++) {
    const m = pats[i].exec(text);
    if (!m) continue;
    const g = m.slice(1).filter((x) => x !== undefined);
    if (i === pats.length - 1) return mmOf(g[1], g[2]);     // "6/15 mm" → thickness is the second number
    return mmOf(g[0], g[1]);
  }
  return null;
}

function cavityLength(text) {
  const m = new RegExp(String.raw`cavity\s*(?:length)?\s*(?:measures|measuring|is|of|:)?\s*${APPROX}${NUM}\s*${UNIT}`, 'i').exec(text)
    || new RegExp(String.raw`${NUM}\s*${UNIT}\s*(?:long|in\s+length)\s+(?:endometrial|uterine)\s+cavity`, 'i').exec(text);
  return m ? mmOf(m[1], m[2]) : null;
}

function length(text) {
  const m = new RegExp(String.raw`(?:length\s+(?:of\s+)?\w*\s*(?:measures|measuring|is|of)?\s*${APPROX}${NUM}\s*${UNIT})|(?:${NUM}\s*${UNIT}\s*(?:long|in\s+length))`, 'i').exec(text);
  if (!m) return null;
  const g = m.slice(1).filter((x) => x !== undefined);
  return mmOf(g[0], g[1]);
}

function diameter(text) {
  const m = new RegExp(String.raw`${NUM}\s*${UNIT}\s*(?:in\s+(?:maximum\s+|greatest\s+)?diameter|in\s+circumference|wide|across|in\s+width)`, 'i').exec(text)
    || new RegExp(String.raw`diameter\s*(?:of|measures|measuring|is|:)?\s*${APPROX}${NUM}\s*${UNIT}`, 'i').exec(text);
  return m ? mmOf(m[1], m[2]) : null;
}

function blocks(text) {
  let last = null, m;
  // House macros spell small counts out ("Four blocks are submitted"), so words count too.
  const re = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(?:representative\s+)?blocks?\b/gi;
  while ((m = re.exec(text))) {
    const w = m[1].toLowerCase();
    const n = /^\d/.test(w) ? Number(w) : WORD_NUMBER[w];
    if (Number.isFinite(n)) last = n;
  }
  if (last === null && /\ba single\s+block\b/i.test(text)) last = 1;
  return last;
}

/** First measurement run with two or more numbers in the scope, no context filtering (use with `near`). */
function dims(text) { const r = findDims(text).find((d) => d.mms.length >= 2); return r ? r.mms : null; }
/** Greatest number of the first measurement run in the scope (use with `near`). */
function size(text) { const r = findDims(text)[0]; return r ? r.max : null; }
/** "N cm long and N cm in diameter" → [length, diameter]. */
function lengthDiameter(text) { const l = length(text), d = diameter(text); return l !== null && d !== null ? [l, d] : l !== null ? [l] : null; }

/** Fluid volume in millilitres: "25 ml of straw-coloured fluid", "volume 120 mL". */
function volume(text) {
  const m = /\bvolume\s*(?:of|is|:)?\s*(\d+(?:\.\d+)?)\s*(?:ml|mls|cc|millilit(?:er|re)s?)\b/i.exec(text)
    || /\b(\d+(?:\.\d+)?)\s*(?:ml|mls|cc|millilit(?:er|re)s?)\b/i.exec(text);
  return m ? Number(m[1]) : null;
}

const WORD_NUMBER = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, a: 1, an: 1, single: 1
};
/**
 * How many of a named thing: "three cores", "2 tissue fragments", "a single piece".
 * `noun` is a regex source for the thing being counted; up to two adjectives may sit between
 * the number and the noun ("3 needle core biopsies"). The last count in the scope wins, which
 * is what a macro that revises itself ("…submitted; 4 fragments in total") means.
 */
function countOf(text, noun) {
  const re = new RegExp(String.raw`\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an|single)\s+(?:[a-z-]+\s+){0,2}(?:${noun})`, 'gi');
  let last = null, m;
  while ((m = re.exec(text))) {
    const w = m[1].toLowerCase();
    const n = /^\d/.test(w) ? Number(w) : WORD_NUMBER[w];
    if (Number.isFinite(n)) last = n;
  }
  return last;
}

// ---- Frozen-section vocabulary -----------------------------------------------------------------
// The frozen grosses are written to a narrow house pattern that the general concepts above read
// badly: the count and the block count are adjectives apart from their noun ("1 frozen block",
// "2 blocks for frozen section"), the specimen is often a strip or a wedge rather than a piece, and
// a small specimen is measured in one dimension ("0.6 cm across", "ranging from 0.6 cm to 0.2 cm").
// Measured against the five-year frozen file rather than invented; the shared concepts are left
// alone so the resection templates keep their captured behaviour.

const RECEIPT = /\b(?:received|submitted|consists?\s+of|comprises?)\b/i;
const PIECE_NOUN = String.raw`pieces?|fragments?|strips?|wedges?|cores?|portions?|bits?|nodules?|specimens?|lymph\s+nodes?|tubular\s+structures?|tubal\s+structures?`;
const VAGUE_COUNT = /\b(?:multiple|several|numerous|many|few|a\s+number\s+of)\s+(?:[a-z-]+\s+){0,2}(?:pieces?|fragments?|bits?|portions?)/i;

/** The sentence the specimen is received in and the `n - 1` that follow it — the description can run on past the receipt line. */
function receiptScope(text, n) {
  const ss = sentences(text);
  const i = ss.findIndex((s) => RECEIPT.test(s));
  return ss.slice(Math.max(0, i)).slice(0, n);
}

/**
 * How many pieces were received. Read from the receiving sentence only, because later sentences
 * count blocks and sections. "Multiple pieces" is not a number and returns null, leaving the field
 * at its default rather than inventing a count.
 */
function frozenPieces(text) {
  const re = new RegExp(String.raw`\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an|single)\s+(?:[a-z-]+\s+){0,3}?(?:${PIECE_NOUN})\b`, 'i');
  // Two sentences, because a designation line can precede the description ("Specimen designated
  // …, received fresh. It consists of a piece of tissue measuring ….").
  for (const s of receiptScope(text, 2)) {
    if (VAGUE_COUNT.test(s)) return null;
    const m = re.exec(s);
    if (!m) continue;
    const w = m[1].toLowerCase();
    const n = /^\d/.test(w) ? Number(w) : WORD_NUMBER[w];
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Frozen block count. The count wanted is the one tied to the frozen blocks, never the paraffin
 * total that a lung or nodule macro adds afterwards ("… 2 representative blocks are taken for
 * frozen section examination. 4 representative blocks in total." is two, not four).
 */
const BLOCK_NUM = String.raw`(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an|single)`;
function frozenBlocks(text) {
  const pats = [
    new RegExp(String.raw`${BLOCK_NUM}\s+(?:[a-z-]+\s+){0,2}?frozen\s+(?:section\s+)?blocks?`, 'i'),
    new RegExp(String.raw`${BLOCK_NUM}\s+(?:[a-z-]+\s+){0,2}?blocks?\b[^.;]{0,30}?\bfor\s+frozen`, 'i'),
    new RegExp(String.raw`embedded\s+in\s+${BLOCK_NUM}\s+(?:[a-z-]+\s+){0,2}?blocks?`, 'i')
  ];
  // "One representative block is taken from each piece" is a count per piece, not a total.
  if (/from\s+each\s+(?:piece|fragment|nodule|specimen)/i.test(text)) return null;
  for (const re of pats) {
    const m = re.exec(text);
    if (!m) continue;
    const w = m[1].toLowerCase();
    const n = /^\d/.test(w) ? Number(w) : WORD_NUMBER[w];
    if (Number.isFinite(n)) return n;
  }
  // Nothing said "frozen": a plain block count still counts, as long as the sentence is not the
  // paraffin total the macro adds at the end.
  const plain = sentences(text).filter((s) => !/paraffin|in\s+total|additional/i.test(s));
  return plain.length ? blocks(plain.join(' ')) : null;
}

/**
 * Specimen measurement. Two or three dimensions when the macro gives them; otherwise the single
 * "x cm across" figure, and the largest of a range ("ranging from 0.6 cm to 0.2 cm across"), which
 * is how the house measures multiple small pieces.
 */
const NAMED_AXIS = /o'?clock|superficial\s+to\s+deep|in\s+length|\blong\b|\bwide\b|in\s+width|in\s+thickness|\bthick\b|in\s+diameter/i;
// "to 6 o'clock" is an axis, not a range: a range runs from one measurement to another.
const RANGE = new RegExp(String.raw`\brang\w+|\bbetween\b|\bup\s+to\b|\bto\s+${NUM}\s*${UNIT}`, 'i');
function frozenSize(text) {
  for (const s of receiptScope(text, 3)) {
    const runs = findDims(s);
    const full = runs.find((d) => d.mms.length >= 2);
    if (full) return full.mms;
    const singles = runs.filter((d) => d.mms.length === 1);
    if (!singles.length) continue;
    // Dimensions given one axis at a time ("0.5 cm from 12 to 6 o'clock, 0.2 cm from 3 to 9 …")
    // are one measurement; a range across several pieces is not, and the largest stands for it.
    if (singles.length >= 2 && NAMED_AXIS.test(s) && !RANGE.test(s)) return singles.slice(0, 3).map((d) => d.max);
    return [Math.max(...singles.map((d) => d.max))];
  }
  return null;
}

/** The tissue phrase the macro uses: "a piece of soft tan coloured tissue measuring …" → "soft tan coloured tissue". */
function tissuePhrase(text) {
  const re = new RegExp(String.raw`\b(?:of|is|are|consists?\s+of)\s+((?:[a-z][a-z-]*\s+){0,4}?(?:tissue|material|mucosa|skin|fat|lymph\s+nodes?))\b`, 'i');
  const m = receiptScope(text, 2).map((s) => re.exec(s)).find(Boolean);
  if (!m) return null;
  const phrase = m[1].trim().replace(/\s+/g, ' ')
    .replace(new RegExp(String.raw`^(?:the|a|an|\d+|one|two|three|four|five|six|multiple|several)\s+(?:(?:${PIECE_NOUN})\s+of\s+)?`, 'i'), '')
    .replace(new RegExp(String.raw`^(?:${PIECE_NOUN})\s+of\s+`, 'i'), '');
  return /^(?:the|a|an|and|it)?$/i.test(phrase) ? null : phrase.toLowerCase();
}

export const CONCEPTS = { weight, specimenDims, dims, size, tumourDims, tumourSizeMax, depthOfInvasion, wallThickness, cavityLength, length, diameter, lengthDiameter, blocks, volume, frozenPieces, frozenBlocks, frozenSize, tissuePhrase };

// ---- Sided adnexa ------------------------------------------------------------------------------
// "The right ovary measures 2 x 1.5 x 0.8 cm and the left ovary 2.5 x 1.5 x 1 cm." Sentences are split into
// clauses at "and / while the <right|left|both|ovary|tube…>" so a `near` rule reads only its own clause, and each
// clause carries the side named before the organ word.
const CLAUSE_SPLIT = /;\s*|,?\s+(?:and|while|whereas)\s+(?=(?:the\s+|a\s+|an\s+)?(?:right|left|both|bilateral|contralateral|other|ovary|ovaries|ovarian|fallopian|tubes?|uterus|cervix|endometri\w+|myometri\w+)\b)|,\s+(?=(?:the\s+)?(?:right|left|both|bilateral|contralateral|ovary|ovaries|fallopian|tubes?)\b)/i;
export function clauses(text) { return sentences(text).flatMap((s) => s.split(CLAUSE_SPLIT)).map((c) => c.trim()).filter(Boolean); }

const SIDE_RE = /\b(right|left|both|bilateral|rt\.?|lt\.?)\b/i;
/** 'right' | 'left' | 'both' | null — the side named in the clause before the first `near` word. */
export function sideOf(clause, near) {
  const m = near ? near.exec(clause) : null;
  const head = m ? clause.slice(0, m.index) : clause;
  const sm = SIDE_RE.exec(head) || (m && /\b(?:ovaries|tubes)\b/i.test(clause) ? ['', 'both'] : null);
  if (!sm) return null;
  const w = sm[1].toLowerCase();
  return /^r/.test(w) ? 'right' : /^l/.test(w) ? 'left' : 'both';
}

/** [{ side, value }] — `fn` run on every clause matching `near`, in text order; clauses without a value skipped. */
function sidedValues(text, near, fn) {
  const out = [];
  for (const c of clauses(text)) {
    if (near && !near.test(c)) continue;
    const v = fn(c);
    if (v === null || v === undefined) continue;
    out.push({ side: sideOf(c, near), value: v });
  }
  return out;
}
const maxOf = (v) => (Array.isArray(v) ? Math.max(...v) : v);
const fmtValue = (v, unit) => (Array.isArray(v) ? fmtDims(v, unit) : fmt(v, unit));

/** Pick one value per side: the first right, the first left, else the largest unlabelled / both. */
function bySide(vals) {
  const right = vals.find((x) => x.side === 'right'), left = vals.find((x) => x.side === 'left');
  const rest = vals.filter((x) => x.side !== 'right' && x.side !== 'left');
  const largest = rest.length ? rest.reduce((a, b) => (maxOf(b.value) > maxOf(a.value) ? b : a)) : null;
  return { right, left, largest };
}

/** Free-text adnexa sentence for templates with a single "Adnexa (macro)" field, e.g. "the right ovary measures
 *  30 x 20 x 10 mm and the right fallopian tube 50 mm long and 6 mm in diameter; the left ovary measures …". */
function adnexaSentence(text, unit) {
  const ov = bySide(sidedValues(text, /\bovar/i, dims));
  const tb = bySide(sidedValues(text, /\b(?:tubes?|fallopian|salpin\w+)\b/i, lengthDiameter));
  const fD = (v) => `${fmtDims(v, unit)} ${unit}`, f1 = (v) => `${fmt(v, unit)} ${unit}`;
  const tubePhrase = (v) => (v.length >= 2 ? `${f1(v[0])} long and ${f1(v[1])} in diameter` : `${f1(v[0])} long`);
  const pieces = [];
  for (const side of ['right', 'left']) {
    const o = ov[side], t = tb[side];
    if (!o && !t) continue;
    const bits = [];
    if (o) bits.push(`the ${side} ovary measures ${fD(o.value)}`);
    if (t) bits.push(o ? `the ${side} fallopian tube ${tubePhrase(t.value)}` : `the ${side} fallopian tube measures ${tubePhrase(t.value)}`);
    pieces.push(bits.join(' and '));
  }
  if (!pieces.length) {
    const bits = [];
    if (ov.largest) bits.push(`the ovaries measure up to ${fD(ov.largest.value)}`);
    if (tb.largest) bits.push(`the fallopian tubes measure up to ${tubePhrase(tb.largest.value)}`);
    if (bits.length) pieces.push(bits.join(' and '));
  }
  return pieces.length ? pieces.join('; ') : null;
}

/** Run one rule against text; returns the field value as a string, or null. */
export function extractConcept(rule, text) {
  if (!text) return null;
  const unit = rule.unit || 'mm';
  const label = rule.label ? ` ${unit}` : '';
  if (rule.concept === 'adnexaSentence') return adnexaSentence(text, unit);
  if (rule.concept === 'choice') {
    // First matching pattern wins, so the schema lists the specific before the general.
    for (const [pattern, value] of rule.map || []) {
      if (new RegExp(pattern, 'i').test(text)) return rule.boolean ? value === 'true' : value;
    }
    return rule.fallback === undefined ? null : (rule.boolean ? rule.fallback === 'true' : rule.fallback);
  }
  if (rule.concept === 'count') {
    // `of` names the thing counted; `near` (if given) still restricts which clauses are read.
    let scope = text;
    if (rule.near) {
      const near = new RegExp(rule.near, 'i');
      const hits = clauses(text).filter((c) => near.test(c));
      if (!hits.length) return null;
      scope = hits.join(' ');
    }
    const n = countOf(scope, rule.of || rule.near || 'pieces?|fragments?');
    return n === null ? null : String(n);
  }
  const fn = CONCEPTS[rule.concept];
  if (!fn) return null;
  const min = rule.min ?? (rule.concept === 'lengthDiameter' ? 1 : 2);   // a tube length alone is worth keeping
  const ok = (v) => (Array.isArray(v) ? v.length >= min : true);
  if (rule.sides) {
    // Paired organs: "right …, left …" when both sides are measured, else the single / largest value.
    const near = rule.near ? new RegExp(rule.near, 'i') : null;
    const vals = sidedValues(text, near, fn).filter((x) => ok(x.value));
    if (!vals.length) return null;
    const { right, left, largest } = bySide(vals);
    if (right && left) return `right ${fmtValue(right.value, unit)}, left ${fmtValue(left.value, unit)}${label}`;
    const one = right || left || largest;
    return fmtValue(one.value, unit) + label;
  }
  let scope = text;
  if (rule.near) {
    const near = new RegExp(rule.near, 'i');
    const hits = clauses(text).filter((c) => near.test(c));
    if (!hits.length) return null;
    scope = hits.join(' ');
  }
  const v = fn(scope);
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return ok(v) ? fmtDims(v, unit) + label : null;
  if (typeof v === 'string') return v;          // phrase concepts carry their own text
  if (unit === 'g' || unit === 'count') return String(v);
  return fmt(v, unit) + label;
}

/** { fieldId: value } for every macroExtract rule that finds something in `text`. */
export function extractMacro(schema, text) {
  const out = {};
  for (const [field, rule] of Object.entries(schema?.macroExtract || {})) {
    // `when` gates a rule on a field extracted above it, so a free-text "other" box is filled
    // only when the select it belongs to actually landed on "other".
    if (rule.when && Object.entries(rule.when).some(([f, v]) => out[f] !== v)) continue;
    const v = extractConcept(rule, text || '');
    if (v !== null && v !== '') out[field] = v;
  }
  return out;
}

/** Split the paste into lettered chunks { A: '…', B: '…' }; `lettered` is false when no (A) markers exist. */
export function splitMacroParts(text) {
  const t = (text || '').replace(/\r/g, '');
  const marks = [];
  MARKER.lastIndex = 0;
  let m;
  while ((m = MARKER.exec(t))) {
    const expected = String.fromCharCode(65 + marks.length);
    if (m[1] === expected) marks.push({ letter: m[1], index: m.index, end: m.index + m[0].length });
  }
  if (!marks.length) return { lettered: false, chunks: {} };
  const chunks = {};
  marks.forEach((mk, i) => { chunks[mk.letter] = t.slice(mk.end, marks[i + 1]?.index ?? t.length).trim(); });
  return { lettered: true, chunks };
}

/**
 * Fill the macro fields of every part from the pasted macro. Only fields at their default or
 * still holding the previous auto-fill are written; when the paste no longer yields a value
 * the earlier auto-fill is reverted to the default. Returns the number of fields now filled.
 */
export function applyMacroToCase(caseState, schemaFor) {
  const text = caseState.meta?.macro || '';
  const { lettered, chunks } = splitMacroParts(text);
  let filled = 0;
  caseState.parts.forEach((part, i) => {
    const schema = schemaFor(part);
    if (!schema?.macroExtract) return;
    const chunk = lettered ? (chunks[part.label] || '') : (i === 0 ? text : '');
    const found = extractMacro(schema, chunk);
    const defaults = defaultValues(schema, i);
    const prev = part.macroFill || {};
    const next = {};
    for (const field of Object.keys(schema.macroExtract)) {
      const cur = part.values[field];
      const def = defaults[field];
      const writable = cur === def || cur === '' || cur === undefined || (field in prev && cur === prev[field]);
      if (!writable) continue;
      if (field in found) { part.values[field] = found[field]; next[field] = found[field]; filled++; }
      else if (field in prev) part.values[field] = def;
    }
    if (Object.keys(next).length) part.macroFill = next; else delete part.macroFill;
  });
  return filled;
}
