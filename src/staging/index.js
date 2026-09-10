// Staging module. `deriveTNM(values, protocol)` runs a protocol's rule tables over the
// part values and returns the pathological TNM, descriptors, stage group and the
// edition stamp. A manual override (`values.tnmOverride`, e.g. "pT3 pN1a pM1a") replaces
// the derived categories and is echoed with its reason.
//
// Protocols live in src/staging/<protocol>.js and export
//   { id, edition, T(values) -> {cat, note?}, N(values) -> {cat, note?}, M(values) -> {cat, note?},
//     descriptors(values) -> ['m','r','y'], stageGroup(T, N, M) -> string|null }
// Categories are bare ('T3', 'N1b', 'M1a', 'Tis', 'TX', 'N0', 'M-') — the prefix is added here.

import * as colorectal from './colorectal.js';

export const PROTOCOLS = { colorectal };

const OVERRIDE_RE = /\b(y?p?)T(is|X|0|1|2|3|4a|4b|4)\b.*?\b(?:y?p)?N(X|0|1a|1b|1c|1|2a|2b|2)\b(?:.*?\b(?:y?p)?M(1a|1b|1c|1|X)\b)?/i;

/** Parse a free-text override like "ypT3 pN1a pM1a" or "pT2 N0" into bare categories. */
export function parseOverride(text) {
  const m = OVERRIDE_RE.exec(text || '');
  if (!m) return null;
  return { T: `T${m[2]}`, N: `N${m[3]}`, M: m[4] ? `M${m[4]}` : 'M-' };
}

/**
 * @param {object} values part values
 * @param {string|object} protocol protocol id or module
 * @returns {{T, N, M, descriptors, prefix, tnm, stage, edition, notes, overridden, derived}}
 */
export function deriveTNM(values, protocol = 'colorectal') {
  const P = typeof protocol === 'string' ? PROTOCOLS[protocol] : protocol;
  if (!P) throw new Error(`Unknown staging protocol: ${protocol}`);
  const notes = [];
  const t = P.T(values); const n = P.N(values); const m = P.M(values);
  for (const r of [t, n, m]) if (r.note) notes.push(r.note);
  const descriptors = P.descriptors ? P.descriptors(values) : [];
  const derived = { T: t.cat, N: n.cat, M: m.cat };
  let cats = derived;
  let overridden = false;
  const ov = (values.tnmOverride || '').trim();
  if (ov) {
    const parsed = parseOverride(ov);
    if (parsed) { cats = { ...parsed, M: parsed.M === 'M-' ? derived.M : parsed.M }; overridden = true; notes.push(`TNM overridden by pathologist${(values.tnmOverrideReason || '').trim() ? `: ${values.tnmOverrideReason.trim()}` : ''}.`); }
    else notes.push(`Override "${ov}" could not be parsed; derived TNM used.`);
  }
  const prefix = descriptors.includes('y') ? 'yp' : 'p';
  // r prefix for recurrence, (m) suffix on T for multiple synchronous primaries; the y prefix folds into 'yp'.
  const parts = [`${descriptors.includes('r') ? 'r' : ''}${prefix}${cats.T}${descriptors.includes('m') ? '(m)' : ''}`, `${prefix}${cats.N}`];
  if (cats.M !== 'M-') parts.push(`${prefix}${cats.M}`);
  const tnm = parts.join(' ');
  const stage = P.stageGroup(cats.T, cats.N, cats.M);
  return { ...cats, descriptors, prefix, tnm, stage, edition: P.edition, notes, overridden, derived };
}

/** "pT3 pN1b" -> "pT3 pN1b" is already readable; this adds the stage group line used in reports. */
export function stageLine(result) {
  if (!result.stage) return '';
  const assumed = result.M === 'M-' ? ' (if cM0)' : '';
  return `Stage group${assumed}: ${result.stage}`;
}
