// Word-level differences between two texts (docs/specs/proofreading.md, Phase 87): the changes in
// a rewrite shown as tracked changes, and the steps by which an accepted text is put back into the
// form (src/writeback.js). Pure functions.

// Words (with an apostrophe inside), numbers (with a decimal part), runs of spaces, and any other
// character on its own. Together they cover the whole text.
const TOKEN = /\s+|[A-Za-z]+(?:'[A-Za-z]+)*|\d+(?:\.\d+)?|[^\sA-Za-z\d]/g;
const IS_WORD = /^[A-Za-z\d]/;
// Above this many cells the middle of two texts is taken as one change rather than compared word by word.
const MAX_CELLS = 2_000_000;

/** The tokens of a text, in order; joined they give the text back. */
export function tokens(text) {
  return String(text ?? '').match(TOKEN) || [];
}

/** Matched token pairs [i, j] of a longest common subsequence, in order. */
function common(x, y) {
  const n = x.length; const m = y.length;
  const w = m + 1;
  const d = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      d[i * w + j] = x[i] === y[j] ? d[(i + 1) * w + j + 1] + 1 : Math.max(d[(i + 1) * w + j], d[i * w + j + 1]);
    }
  }
  const pairs = [];
  let i = 0; let j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { pairs.push([i, j]); i++; j++; }
    else if (d[(i + 1) * w + j] >= d[i * w + j + 1]) i++;
    else j++;
  }
  return pairs;
}

/**
 * Where `b` differs from `a`, word by word: [{ from, to, text }] in order, `from` and `to` being
 * positions in `a` and `text` what stands there in `b`. Changes with only spaces or punctuation
 * between them are joined, and with `join` words or fewer between them when `join` is set, so a
 * reworded phrase reads as one change.
 */
export function diffWords(a, b, { join = 0 } = {}) {
  a = String(a ?? ''); b = String(b ?? '');
  if (a === b) return [];
  const x = tokens(a); const y = tokens(b);
  const at = [0];
  for (const t of x) at.push(at[at.length - 1] + t.length);
  let p = 0;
  while (p < x.length && p < y.length && x[p] === y[p]) p++;
  let s = 0;
  while (s < x.length - p && s < y.length - p && x[x.length - 1 - s] === y[y.length - 1 - s]) s++;
  const xm = x.slice(p, x.length - s); const ym = y.slice(p, y.length - s);
  const pairs = xm.length * ym.length > MAX_CELLS ? [] : common(xm, ym);
  pairs.push([xm.length, ym.length]);
  const hunks = [];
  let i = 0; let j = 0;
  for (const [pi, pj] of pairs) {
    if (pi > i || pj > j) hunks.push({ from: at[p + i], to: at[p + pi], text: ym.slice(j, pj).join(''), _i: p + i, _e: p + pi });
    i = pi + 1; j = pj + 1;
  }
  // Join neighbours: the tokens between two changes are the same in both texts.
  const out = [];
  for (const h of hunks) {
    const last = out[out.length - 1];
    if (last) {
      const between = x.slice(last._e, h._i);
      const words = between.filter((t) => IS_WORD.test(t)).length;
      if (words <= join) {
        last.text += between.join('') + h.text;
        last.to = h.to;
        last._e = h._e;
        continue;
      }
    }
    out.push({ ...h });
  }
  return out.map(({ from, to, text }) => ({ from, to, text }));
}

/** `a` with the given changes made (positions in `a`, as from diffWords). */
export function applyHunks(a, hunks) {
  let t = String(a ?? '');
  for (const h of [...hunks].sort((u, v) => v.from - u.from || v.to - u.to)) t = t.slice(0, h.from) + h.text + t.slice(h.to);
  return t;
}
