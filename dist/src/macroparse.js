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

import { defaultValues } from './engine.js?v=mu17n9h5';

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
  const re = /\b(\d+)\s*(?:representative\s+)?blocks?\b/gi;
  while ((m = re.exec(text))) last = Number(m[1]);
  if (last === null && /\b(?:one|a single|1)\s+block\b/i.test(text)) last = 1;
  return last;
}

/** First measurement run with two or more numbers in the scope, no context filtering (use with `near`). */
function dims(text) { const r = findDims(text).find((d) => d.mms.length >= 2); return r ? r.mms : null; }
/** Greatest number of the first measurement run in the scope (use with `near`). */
function size(text) { const r = findDims(text)[0]; return r ? r.max : null; }
/** "N cm long and N cm in diameter" → [length, diameter]. */
function lengthDiameter(text) { const l = length(text), d = diameter(text); return l !== null && d !== null ? [l, d] : l !== null ? [l] : null; }

export const CONCEPTS = { weight, specimenDims, dims, size, tumourDims, tumourSizeMax, depthOfInvasion, wallThickness, cavityLength, length, diameter, lengthDiameter, blocks };

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
  if (unit === 'g' || unit === 'count') return String(v);
  return fmt(v, unit) + label;
}

/** { fieldId: value } for every macroExtract rule that finds something in `text`. */
export function extractMacro(schema, text) {
  const out = {};
  for (const [field, rule] of Object.entries(schema?.macroExtract || {})) {
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
