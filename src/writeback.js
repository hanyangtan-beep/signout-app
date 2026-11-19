// Accepted proofreading changes back into the form (docs/specs/proofreading.md, Phase 87). Pure
// functions: the page's side is in src/app.js.
//
// A block's accepted text is reached one change at a time. For each change the form is searched for
// the one value that prints it (a typed box, a number, a choice, a tick, the comment or the pasted
// macroscopy) and the report is generated again to check that the block then reads exactly as
// accepted. The value is set as the form sets it: linked defaults, derived fields, dependent lists.
// Where no value prints exactly that, one that makes the change with a few others the form ties to it
// (a size moving the stage) is taken, and the note says what else changed. Boxes holding the same
// typed text as the one changed (a size typed twice, which the template compares) are also tried
// changed with it. Words a rewrite takes out in one place and puts back in another (a sentence
// moved) are one change, made only in typed text that holds all of it (`joinMoves`). A change no
// single value gives (the template's own wording, a rewrite's sentences, a move) is kept as a patch
// over the form's text (`caseState.patches[block]`, made by the engine after the form's text is
// generated), so the block still follows the form. When a later form change falls inside a patch's
// text, the patch is carried over the change where its words allow (`carryPatch`).

import { generateCase, applyLinkedDefaults, applyDerived, normalisePart, optionsFor, isVisible, toggleOption, templateIdOf, templatesInUse, applyPatches } from './engine.js';
import { britishise } from './style.js';
import { diffWords, applyHunks } from './textdiff.js';
import { applyMacroToCase } from './macroparse.js';

/** The report blocks a change may reach, for naming the other blocks a form change altered. */
export const BLOCKS = ['specimens', 'macro', 'blockKey', 'intraop', 'microscopy', 'molecular', 'diagnosis', 'comment'];
// Reports generated to try candidate values, at most, for one accepted text; past it, the rest is kept as patches.
const MAX_TRIES = 400;
// Candidate values tried for one change, the likeliest first.
const MAX_PER_CHANGE = 60;

const clone = (o) => JSON.parse(JSON.stringify(o));

/** A block's text before manual edits, as the form and its patches print it. */
export function blockText(out, key) {
  return String(out?.generated?.[key] ?? out?.[key] ?? '').replace(/\s+$/, '');
}

const isNumber = (w) => /^\d+(?:\.\d+)?$/.test(w);
const SMALL = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'by', 'for', 'and', 'or', 'with', 'is', 'are', 'was', 'were', 'be', 'as', 'from', 'into', 'this', 'that', 'there']);
/** The words of a text that can tie it to a value: lower case, British spelling, small words left out. */
function wordsOf(s) {
  const t = britishise(String(s ?? '')).toLowerCase();
  return new Set((t.match(/[a-z]+(?:'[a-z]+)?|\d+(?:\.\d+)?/g) || []).filter((w) => !SMALL.has(w)));
}
// Words alike enough to tie a value to a change: the same first five letters ("ulcer", "ulceration").
const stem = (w) => (w.length > 5 && !isNumber(w) ? w.slice(0, 5) : w);
const overlap = (a, b) => {
  const stems = new Set([...b].map(stem));
  let n = 0;
  for (const w of a) if (b.has(w) || stems.has(stem(w))) n++;
  return n;
};
/** An option's words: its value and the label the form shows for it. */
const optionWords = (f, o) => new Set([...wordsOf(o), ...wordsOf(f.optionLabels?.[o])]);
/** A value as the form shows it: an option's label where it has one. */
export function shownAs(f, v) {
  const one = (x) => (f?.optionLabels && typeof x === 'string' && x in f.optionLabels ? f.optionLabels[x] : x);
  return Array.isArray(v) ? v.map(one) : one(v);
}
const minus = (a, b) => new Set([...a].filter((w) => !b.has(w)));

/** How a value reads in a note: blank, ticked, a list. */
export function showValue(v) {
  if (Array.isArray(v)) return v.length ? v.join(', ') : '(none)';
  if (v === true) return 'ticked';
  if (v === false) return 'not ticked';
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return '(blank)';
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}

/** The words a change (from diffWords) takes out of `text`, and the words it puts in. */
function delta(text, h) {
  const was = wordsOf(text.slice(h.from, h.to)); const is = wordsOf(h.text);
  return [minus(was, is), minus(is, was)];
}

/**
 * Changes of `text` (from diffWords) with each set that moves words between them (words one takes
 * out and another puts in: a sentence moved) made one change, with the text between; `moved` marks
 * those. A move is never searched for in a choice, number or tick, which would set its facts wrong,
 * only in typed text, and is otherwise kept as one patch, made whole or not at all.
 */
export function joinMoves(text, hunks) {
  const d = hunks.map((h) => delta(text, h));
  const linked = (a, b) => [...d[a][0]].some((w) => d[b][1].has(w)) || [...d[a][1]].some((w) => d[b][0].has(w));
  const out = [];
  for (let i = 0; i < hunks.length;) {
    let end = i;
    for (let k = i; k <= end; k++) for (let j = hunks.length - 1; j > end; j--) if (linked(k, j)) { end = j; break; }
    if (end === i) out.push(hunks[i]);
    else {
      let s = ''; let at = hunks[i].from;
      for (const h of hunks.slice(i, end + 1)) { s += text.slice(at, h.from) + h.text; at = h.to; }
      out.push({ from: hunks[i].from, to: hunks[end].to, text: s, moved: true });
    }
    i = end + 1;
  }
  return out;
}

/** Typed text with `find` replaced once: exact, else ignoring case. Each way it can be done. */
function substitutions(value, find, replace) {
  const v = String(value ?? '');
  if (!find || !v) return [];
  const ways = [];
  const at = v.indexOf(find);
  if (at >= 0 && v.indexOf(find, at + 1) < 0) ways.push(v.slice(0, at) + replace + v.slice(at + find.length));
  if (!ways.length) {
    const lower = v.toLowerCase(); const f = find.toLowerCase();
    const k = lower.indexOf(f);
    if (k >= 0 && lower.indexOf(f, k + 1) < 0) {
      const typedLower = v.slice(k, k + find.length) === v.slice(k, k + find.length).toLowerCase();
      ways.push(v.slice(0, k) + replace + v.slice(k + find.length));
      if (typedLower) ways.push(v.slice(0, k) + replace.toLowerCase() + v.slice(k + find.length));
    }
  }
  return [...new Set(ways)].filter((w) => w !== v);
}

/**
 * Typed text that prints as it was typed, with the change made where it prints: when exactly one
 * printed copy of the text in the block holds the change. [value, score] pairs.
 */
function placed(value, now, h) {
  const v = String(value ?? '');
  const t = v.trim();
  if (!t || !now || !h) return [];
  const lead = v.indexOf(t);
  const found = [];
  for (let at = now.indexOf(t); at >= 0; at = now.indexOf(t, at + 1)) {
    if (at <= h.from && h.to <= at + t.length) found.push(at);
  }
  if (found.length !== 1) return [];
  const at = found[0];
  const next = v.slice(0, lead + h.from - at) + h.text + v.slice(lead + h.to - at);
  // A change at the very edge of the typed text may as well be the template's: tried after the others.
  const edge = h.from === at || h.to === at + t.length;
  return next === v ? [] : [[next, edge ? 4 : t.length >= 3 ? 12 : 5]];
}

/**
 * The values that might print one change, the likeliest first: { where, part, field, value, label,
 * from, to }. `where` is 'part' (a field of a part), 'case' (a case field or the case title),
 * 'comment' or 'meta' (the pasted macroscopy). `change` is the change with words around it, unique
 * in the block; `ctx` holds the block's text (`now`), the change's place in it (`hunk`) and the
 * changed words alone (`bare`), tried in typed text when the words around are not typed.
 */
export function candidates(templates, cs, key, change, ctx = {}) {
  const { find, replace } = change;
  const { now = '', hunk = null, bare = null } = ctx;
  const fw = wordsOf(find); const rw = wordsOf(replace);
  const added = minus(rw, fw); const removed = minus(fw, rw);
  const touched = new Set([...added, ...removed]);
  const list = [];
  const push = (score, c) => { if (score > 0) list.push({ score, c }); };
  const ways = (value) => {
    const w = placed(value, now, hunk);
    for (const s of substitutions(value, find, replace)) w.push([s, 10]);
    if (w.length <= 1 && bare && /[A-Za-z0-9]/.test(bare.find)) for (const s of substitutions(value, bare.find, bare.replace)) w.push([s, 6]);
    const seen = new Set();
    return w.filter(([s]) => !seen.has(s) && seen.add(s));
  };
  // `typed` marks text typed in a box, so the note can show the words changed rather than the whole text.
  const typed = (value, make) => { for (const [v, score] of ways(value)) push(score, { ...make(v), typed: true }); };
  const multi = cs.parts.length > 1;

  typed(cs.comment, (v) => ({ where: 'comment', field: 'comment', value: v, label: 'Comment', from: cs.comment }));
  if (key === 'macro') typed(cs.meta?.macro, (v) => ({ where: 'meta', field: 'macro', value: v, label: 'Macroscopic description (pasted)', from: cs.meta.macro }));
  if (key === 'specimens') typed(cs.caseTitle, (v) => ({ where: 'case', field: 'caseTitle', value: v, label: 'Case title', from: cs.caseTitle }));
  const caseFields = [];
  for (const id of templatesInUse(cs)) for (const f of templates[id]?.schema?.caseFields || []) if (!caseFields.some((g) => g.id === f.id)) caseFields.push(f);
  for (const f of caseFields) {
    const v = cs[f.id];
    if (f.type === 'select' || f.type === 'grade') {
      for (const o of f.options || []) if (o !== v) push(3 * overlap(optionWords(f, o), added) + 2 * overlap(optionWords(f, v), removed) + overlap(wordsOf(f.label), touched), { where: 'case', field: f.id, value: o, label: f.label, from: shownAs(f, v), to: shownAs(f, o) });
    } else typed(v, (nv) => ({ where: 'case', field: f.id, value: nv, label: f.label, from: v }));
  }

  cs.parts.forEach((part, k) => {
    const t = templates[templateIdOf(cs, part)];
    if (!t) return;
    const name = (f) => `${multi ? `(${part.label}) ` : ''}${f.label || f.id}`;
    for (const f of t.schema.fields || []) {
      if (!f.id || !isVisible(f, part.values)) continue;
      const v = part.values[f.id];
      const at = (value, score, isTyped = false) => push(score, { where: 'part', part: k, field: f.id, value, label: name(f), from: shownAs(f, v), to: shownAs(f, value), ...(isTyped ? { typed: true } : {}) });
      const lw = wordsOf(f.label);
      if (f.type === 'text' || f.type === 'textarea') {
        // Other boxes of the part holding the same text change with it too, tried after it alone.
        const twins = String(v ?? '').trim().length > 1 ? (t.schema.fields || []).filter((g) => g !== f && g.id && (g.type === 'text' || g.type === 'textarea') && part.values[g.id] === v && isVisible(g, part.values)) : [];
        for (const [nv, score] of ways(v)) {
          at(nv, score, true);
          if (twins.length) {
            push(score - 1, { where: 'part', part: k, field: f.id, value: nv, label: name(f), from: v, to: nv, typed: true,
              twins: twins.map((g) => ({ where: 'part', part: k, field: g.id, value: nv, label: name(g), from: v, to: nv, typed: true })) });
          }
        }
      } else if (f.type === 'number') {
        const cur = String(v ?? '').trim();
        if (!cur || !removed.has(cur)) continue;
        for (const n of [...added].filter(isNumber)) at(typeof v === 'number' ? Number(n) : n, 8);
      } else if (f.type === 'select' || f.type === 'grade') {
        const vw = optionWords(f, v);
        for (const o of optionsFor(f, part.values)) {
          if (o === v) continue;
          at(o, 3 * overlap(optionWords(f, o), added) + 2 * overlap(vw, removed) + overlap(lw, touched));
        }
      } else if (f.type === 'multiselect') {
        const chosen = Array.isArray(v) ? v : [];
        for (const o of optionsFor(f, part.values)) {
          const ow = optionWords(f, o);
          const score = chosen.includes(o) ? 3 * overlap(ow, removed) : 3 * overlap(ow, added) + overlap(lw, added);
          at(toggleOption(f, chosen, o), score);
        }
      } else if (f.type === 'checkbox') {
        at(!v, 2 * overlap(lw, touched));
      }
    }
  });
  const seen = new Set();
  return list.sort((a, b) => b.score - a.score).filter(({ c }) => {
    const k = JSON.stringify([c.where, c.part, c.field, c.value, (c.twins || []).map((x) => x.field)]);
    return !seen.has(k) && seen.add(k);
  }).slice(0, MAX_PER_CHANGE).map((x) => x.c);
}

/**
 * Make a candidate change in `cs` as the form makes it (mutates `cs`), with the boxes changed with it
 * (`twins`); the pasted macroscopy fills its fields again.
 */
export function applyChange(templates, cs, c) {
  if (c.where === 'part') {
    const part = cs.parts[c.part];
    const { schema, generator } = templates[templateIdOf(cs, part)];
    for (const one of [c, ...(c.twins || [])]) {
      const before = part.values[one.field];
      part.values[one.field] = clone(one.value);
      applyLinkedDefaults(schema, part, one.field, before);
      applyDerived(generator, part, one.field);
    }
    normalisePart(schema, part);
  } else if (c.where === 'meta') {
    cs.meta = { ...(cs.meta || {}), [c.field]: c.value };
    if (c.field === 'macro') applyMacroToCase(cs, (part) => templates[templateIdOf(cs, part)]?.schema);
  } else {
    cs[c.field] = c.value; // 'comment' and 'case'
  }
  return cs;
}

/** The blocks other than `key` whose text differs between two outputs. */
function otherChanged(a, b, key) {
  return BLOCKS.filter((k) => k !== key && blockText(a, k) !== blockText(b, k));
}

// A form change may bring other changes into the same block (a size moving the stage): at most
// this many, of at most this many characters together, kept when no candidate prints the block
// exactly as accepted.
const MAX_KNOCK_ON = 4;
const MAX_KNOCK_ON_CHARS = 200;
const sameHunk = (a, b) => a.from === b.from && a.to === b.to && a.text === b.text;

/**
 * The one value that makes change `h` (from diffWords) in the block's text `now`: { change,
 * caseState, out, also, knockOn } or null. Each candidate is tried on a copy of the case. One that
 * prints the block exactly so is taken first, the one changing fewest other blocks; else one that
 * makes the change with a few others in the block (`knockOn`, the block's other changes), fewest
 * first. `budget.tries` counts the reports generated.
 */
export function findChange(templates, cs, key, now, h, budget = { tries: 0 }) {
  const expected = applyHunks(now, [h]);
  const change = patchFor(now, expected);
  if (!change) return null;
  const base = generateCase(templates, cs);
  let exact = null; let near = null;
  for (const c of candidates(templates, cs, key, change, { now, hunk: h, bare: { find: now.slice(h.from, h.to), replace: h.text } })) {
    if (h.moved && !c.typed) continue;
    if (budget.tries >= MAX_TRIES) break;
    budget.tries++;
    const trial = applyChange(templates, clone(cs), c);
    let out;
    try { out = generateCase(templates, trial); } catch { continue; }
    const got = blockText(out, key);
    const also = otherChanged(base, out, key);
    const found = { change: { to: c.value, ...c }, caseState: trial, out, also, knockOn: [] };
    if (got === expected) {
      if (!exact || also.length < exact.also.length) exact = found;
      if (!also.length) break;
      continue;
    }
    if (exact) continue;
    const hunks = diffWords(now, got);
    if (!hunks.some((x) => sameHunk(x, h))) continue;
    const others = hunks.filter((x) => !sameHunk(x, h));
    const size = others.reduce((n, x) => n + (x.to - x.from) + x.text.length, 0);
    if (others.length > MAX_KNOCK_ON || size > MAX_KNOCK_ON_CHARS) continue;
    found.knockOn = others.map((x) => ({ old: now.slice(x.from, x.to), text: x.text }));
    if (!near || others.length < near.knockOn.length || (others.length === near.knockOn.length && also.length < near.also.length)) near = found;
  }
  return exact || near;
}

/**
 * A unique find / replace pair turning `text` into `next`: the change with whole words around it
 * until it occurs once (on one line, else whole lines, else the whole text).
 */
export function patchFor(text, next) {
  if (text === next) return null;
  let p = 0;
  while (p < text.length && p < next.length && text[p] === next[p]) p++;
  let s = 0;
  while (s < text.length - p && s < next.length - p && text[text.length - 1 - s] === next[next.length - 1 - s]) s++;
  const from = p; const to = text.length - s;
  const once = (a, b) => { const f = text.slice(a, b); const k = text.indexOf(f); return f && k >= 0 && text.indexOf(f, k + 1) < 0; };
  const make = (a, b) => ({ find: text.slice(a, b), replace: next.slice(a, next.length - (text.length - b)) });
  // Widen to word boundaries, a word at a time, on the line.
  const lineStart = text.lastIndexOf('\n', Math.max(0, from - 1)) + 1;
  const nl = text.indexOf('\n', Math.max(from, to - 1));
  const lineEnd = nl < 0 ? text.length : nl;
  let a = from; let b = to;
  const left = () => { let k = a; while (k > lineStart && /\S/.test(text[k - 1])) k--; while (k > lineStart && /\s/.test(text[k - 1])) k--; while (k > lineStart && /\S/.test(text[k - 1])) k--; return k; };
  const right = () => { let k = b; while (k < lineEnd && /\S/.test(text[k])) k++; while (k < lineEnd && /\s/.test(text[k])) k++; while (k < lineEnd && /\S/.test(text[k])) k++; return k; };
  // A word, or a number with its decimal part.
  const inWord = (i) => /[A-Za-z0-9]/.test(text[i] || '') || (text[i] === '.' && /\d/.test(text[i - 1] || '') && /\d/.test(text[i + 1] || ''));
  if (to <= lineEnd) {
    while (a > lineStart && inWord(a - 1)) a--;
    while (b < lineEnd && inWord(b)) b++;
    for (let n = 0; n < 40; n++) {
      if (b > a && once(a, b)) return make(a, b);
      const nb = right();
      if (nb > b) { b = nb; continue; }
      const na = left();
      if (na < a) { a = na; continue; }
      break;
    }
  }
  // Whole lines around the change.
  const ls = text.lastIndexOf('\n', Math.max(0, from - 1)) + 1;
  const le0 = text.indexOf('\n', to);
  const le = le0 < 0 ? text.length : le0;
  if (le > ls && once(ls, le)) return make(ls, le);
  return make(0, text.length);
}

/**
 * Put the accepted text of a block back into the form: { caseState, changes, patches, also, knockOn,
 * text } on a copy of the case, or null when the block cannot be made to read so. `changes` are the
 * form values set (with `from` and `to`); `patches` the find / replace pairs added over the form's
 * text; `also` the other blocks the form changes altered; `knockOn` the changes a form value brought
 * into this block beyond the text accepted (a size moving the stage), and `text` the block as it now
 * reads: the accepted text, with those.
 */
export function writeBack(templates, cs, key, target) {
  let goal = String(target ?? '').replace(/\s+$/, '');
  let work = clone(cs);
  const first = generateCase(templates, work);
  let now = blockText(first, key);
  const changes = [];
  const knockOn = [];
  const budget = { tries: 0 };
  for (let round = 0; round < 30 && now !== goal; round++) {
    let found = null;
    const hunks = joinMoves(now, diffWords(now, goal));
    for (const h of hunks) {
      const f = findChange(templates, work, key, now, h, budget);
      if (f && f.knockOn.length) {
        // The rest of the accepted text, carried over the form's knock-on changes; when it cannot
        // be, this change is kept as a patch instead.
        const rest = hunks.filter((x) => x !== h).map((x) => patchFor(now, applyHunks(now, [x]))).filter(Boolean);
        const r = applyPatches(blockText(f.out, key), rest);
        if (r.missed.length) { if (budget.tries >= MAX_TRIES) break; continue; }
        f.goal = r.text;
      }
      found = f;
      if (found || budget.tries >= MAX_TRIES) break;
    }
    if (!found) break;
    work = found.caseState;
    now = blockText(found.out, key);
    if (found.goal !== undefined) { goal = found.goal; knockOn.push(...found.knockOn); }
    const { twins = [], ...change } = found.change;
    changes.push(change, ...twins);
  }
  const patches = [];
  if (now !== goal) {
    let t = now;
    for (let n = 0; n < 60 && t !== goal; n++) {
      const [h] = joinMoves(t, diffWords(t, goal, { join: 1 }));
      const next = applyHunks(t, [h]);
      const p = patchFor(t, next);
      if (!p) break;
      patches.push(p);
      t = applyPatches(t, [p]).text;
    }
    if (t !== goal) patches.splice(0, patches.length, { find: now, replace: goal });
    work.patches = { ...(work.patches || {}), [key]: [...(work.patches?.[key] || []), ...patches] };
  }
  const out = generateCase(templates, work);
  if (blockText(out, key) !== goal) return null;
  return { caseState: work, changes, patches, also: otherChanged(first, out, key), knockOn, text: goal };
}

const WORD = /[A-Za-z0-9]+(?:[.'][A-Za-z0-9]+)*/g;
// The words either side tried with a change, in turn, until the piece occurs once.
const WIDEN = [[0, 0], [0, 1], [1, 0], [1, 1], [1, 2], [2, 1], [2, 2], [3, 3]];

/**
 * One change of `before` (`h`, from diffWords) made in `t`, where the words it changes, with up to
 * three words of `before` either side, occur in `t` once: the new `t`, 'absent' when even the words
 * it changes are not in `t`, or null when they are there more than once.
 */
function carryOne(before, h, t) {
  const words = [...before.matchAll(WORD)].map((m) => [m.index, m.index + m[0].length]);
  const left = words.filter(([, e]) => e <= h.from).reverse();
  const right = words.filter(([s]) => s >= h.to);
  const bare = before.slice(h.from, h.to);
  if (/[A-Za-z0-9]/.test(bare) && !t.includes(bare)) return 'absent';
  for (const [l, r] of WIDEN) {
    if (l > left.length || r > right.length) continue;
    const a = l ? left[l - 1][0] : h.from;
    const b = r ? right[r - 1][1] : h.to;
    const old = before.slice(a, b);
    if (!/[A-Za-z0-9]/.test(old)) continue;
    const k = t.indexOf(old);
    if (k < 0) continue;
    if (t.indexOf(old, k + 1) >= 0) continue;
    return t.slice(0, k) + before.slice(a, h.from) + h.text + before.slice(h.to, b) + t.slice(k + old.length);
  }
  return null;
}

/**
 * `text` (a rewrite of `before`) carried over the change from `before` to `after`: each change made
 * in it where its words occur there once, and left out where the rewrite has reworded them. Null
 * when a change cannot be placed.
 */
export function carryText(before, after, text) {
  let t = String(text ?? '');
  for (const h of diffWords(before, after)) {
    const r = carryOne(before, h, t);
    if (r === null) return null;
    if (r !== 'absent') t = r;
  }
  return t;
}

/**
 * A patch carried over a change in the text under it (`before` to `after`), or null. Each change
 * that falls inside the patch's `find` is made there, and in its `replace` where the words it changes
 * occur there once. `{ drop: true }` when the form now reads as the patch did.
 */
export function carryPatch(patch, before, after) {
  const at = before.indexOf(patch.find);
  if (!patch.find || at < 0 || before.indexOf(patch.find, at + 1) >= 0) return null;
  const end = at + patch.find.length;
  const inside = [];
  for (const h of diffWords(before, after)) {
    if (h.to <= at || h.from >= end) continue;
    if (h.from < at || h.to > end) return null;
    inside.push(h);
  }
  if (!inside.length) return null;
  const find = applyHunks(patch.find, inside.map((h) => ({ ...h, from: h.from - at, to: h.to - at })));
  if (find === patch.replace) return { drop: true };
  let replace = patch.replace;
  for (const h of inside) {
    const r = carryOne(patch.find, { ...h, from: h.from - at, to: h.to - at }, replace);
    if (r === null || r === 'absent') return null;
    replace = r;
  }
  const k = after.indexOf(find);
  if (k < 0 || after.indexOf(find, k + 1) >= 0) return null;
  return { find, replace };
}

/**
 * After a form change: each patch that fitted the form's text before and no longer does is carried
 * over the change where it can be (mutates `caseState.patches`). Returns whether any patch changed.
 */
export function carryPatches(caseState, before, after) {
  let changed = false;
  for (const [key, list] of Object.entries(caseState.patches || {})) {
    const was = before?.formText?.[key]; const now = after?.formText?.[key];
    if (!Array.isArray(list) || typeof was !== 'string' || typeof now !== 'string' || was === now) continue;
    if (!after.patched?.[key]?.missed?.length) continue;
    let a = was; let b = now;
    const next = [];
    for (const p of list) {
      let q = p;
      const fitted = !applyPatches(a, [p]).missed.length;
      if (fitted && applyPatches(b, [p]).missed.length) {
        const c = carryPatch(p, a, b);
        if (c?.drop) { changed = true; a = applyPatches(a, [p]).text; continue; }
        if (c) { q = c; changed = true; }
      }
      next.push(q);
      a = applyPatches(a, [p]).text;
      b = applyPatches(b, [q]).text;
    }
    caseState.patches[key] = next;
  }
  return changed;
}
