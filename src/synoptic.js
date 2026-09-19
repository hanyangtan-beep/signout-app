// Shared layout for the synoptic (cancer resection) templates — see docs/specs/synoptic-layout.md.
//
// A synoptic is a list of sections; each section has a sentence-case heading and items.
// Every item keeps its leading "- " bullet. Item shapes:
//   { label, value }                 "- Label: value"
//   { label, value, sub: [items] }   parent line, then "  - Sub label: value" lines
//   { label, para }                  "- Label:" then the paragraph on ONE line, two-space indent
//   { text }                         "- text" (additional findings, one bullet each)
// Short "- Label: value" items wrap at WIDTH characters with a hanging indent that lines the
// continuation up under the first word of the text (spaces only, never tabs). A `para` item is
// prose - the tumour histology paragraph - and is printed on a single unbroken line so that the
// LIS re-flows it to its own width instead of inheriting our hard breaks. Empty sections are
// skipped.

export const WIDTH = 80;

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/**
 * Word-wrap `text` at `width`. The first line is indented `first` spaces and every later
 * line `rest` spaces (a hanging indent when `rest` > `first`). Spaces only, never tabs.
 */
export function wrap(text, rest = 0, width = WIDTH, first = 0) {
  // A bare number stays with the word that follows it ("2 per 5 mm2", "4.5 cm") so a line never
  // ends on an orphaned figure.
  const words = [];
  for (const w of clean(text).split(' ').filter(Boolean)) {
    const prev = words[words.length - 1];
    if (prev !== undefined && /^\d+(\.\d+)?$/.test(prev)) words[words.length - 1] = `${prev} ${w}`;
    else words.push(w);
  }
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line === '') { line = w; continue; }
    const candidate = `${line} ${w}`;
    const indent = lines.length === 0 ? first : rest;
    if (candidate.length + indent <= width) line = candidate;
    else { lines.push(line); line = w; }
  }
  if (line !== '') lines.push(line);
  return lines.map((l, i) => ' '.repeat(i === 0 ? first : rest) + l).join('\n');
}

/** Wrap a bullet ("- Label: value") so continuation lines sit under the text, not the dash. */
function bullet(prefix, text, depth = 0) {
  const lead = depth * 2;
  return wrap(`${prefix}${text}`, lead + prefix.length, WIDTH, lead);
}

const present = (v) => v !== '' && v !== null && v !== undefined;

/** Render one item (and its sub-items) to lines. Returns [] when the item prints nothing. */
export function renderItem(item, depth = 0) {
  if (!item) return [];
  const out = [];
  if (item.para !== undefined) {
    if (!present(item.para) || clean(item.para) === '') return [];
    out.push(`${' '.repeat(depth * 2)}- ${item.label}:`);
    out.push(`${' '.repeat(depth * 2 + 2)}${clean(item.para)}`);
  } else if (item.text !== undefined) {
    if (!present(item.text) || clean(item.text) === '') return [];
    out.push(bullet('- ', clean(item.text), depth));
  } else {
    if (!present(item.value)) return [];
    out.push(bullet('- ', `${item.label}: ${clean(item.value)}`, depth));
  }
  for (const s of item.sub || []) out.push(...renderItem(s, depth + 1));
  return out;
}

/**
 * Render sections to the synoptic text. `sections` is `[{heading, items}]`; a section with
 * no printable item is omitted. `partHeading` ("(A) Uterus, ...") prints first in multi-part cases.
 */
export function renderSynoptic(sections, partHeading = '') {
  const blocks = [];
  for (const sec of sections) {
    if (!sec) continue;
    const lines = (sec.items || []).flatMap((it) => renderItem(it));
    if (!lines.length) continue;
    blocks.push([sec.heading, ...lines].join('\n'));
  }
  const body = blocks.join('\n\n');
  return partHeading ? `${partHeading}\n${body}` : body;
}

/**
 * Diagnosis: the specimen line, then one "- " clause per line with a hanging indent.
 * Empty clauses are dropped. `head` is wrapped without indent.
 */
export function renderDiagnosis(head, clauses) {
  const lines = [wrap(head, 0)];
  for (const c of clauses) if (present(c) && clean(c) !== '') lines.push(bullet('- ', clean(c)));
  return lines.join('\n');
}

/**
 * Parse rendered synoptic text back into elements (used by the tests). Returns
 * `[{section, label, value, depth}]`; wrapped continuation lines are re-joined and a
 * paragraph item's text becomes its `value`.
 */
export function parseSynoptic(text) {
  const items = [];
  let section = '';
  let last = null;
  for (const raw of String(text ?? '').split('\n')) {
    if (raw.trim() === '') { last = null; continue; }
    const m = raw.match(/^( *)- (.*)$/);
    if (m) {
      const depth = m[1].length / 2;
      const body = m[2];
      const i = body.indexOf(': ');
      // "Label: value" wins over the paragraph form "Label:" so a wrapped value ending in ":" is not mistaken for a heading.
      const item = i > 0 ? { label: body.slice(0, i), value: body.slice(i + 2) } : body.endsWith(':') ? { label: body.slice(0, -1), value: '', para: true } : { label: '', value: body };
      last = { section, depth, ...item };
      items.push(last);
      continue;
    }
    if (/^ +/.test(raw) && last) { last.value = last.value ? `${last.value} ${raw.trim()}` : raw.trim(); continue; }
    section = raw.trim();
    last = null;
  }
  return items;
}

/** `{label: value}` of the top-level elements (depth 0) — the shape the older tests used. */
export function synopticRows(text) {
  return Object.fromEntries(parseSynoptic(text).filter((it) => it.depth === 0 && it.label).map((it) => [it.label, it.value]));
}
