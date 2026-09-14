// Staging module. `deriveTNM(values, protocol)` runs a protocol's rule tables over the
// part values and returns the pathological TNM, descriptors, stage group and the
// edition stamp. A manual override (`values.tnmOverride`, e.g. "pT3 pN1a pM1a") replaces
// the derived categories and is echoed with its reason.
//
// Protocols live in src/staging/<protocol>.js and export
//   { id, edition, T(values) -> {cat, note?}, N(values) -> {cat, note?}, M(values) -> {cat, note?},
//     descriptors(values) -> ['m','r','y'], stageGroup(T, N, M, values) -> string|null }
// stageGroup also receives the part values for protocols whose groups depend on more than TNM
// (GIST: site and mitotic rate).
// Categories are bare ('T3', 'N1b', 'M1a', 'Tis', 'TX', 'N0', 'M-') — the prefix is added here.

import * as colorectal from './colorectal.js?v=mu10vpvt';
import * as gist from './gist.js?v=mu10vpvt';
import * as endometrium from './endometrium.js?v=mu10vpvt';
import * as ovary from './ovary.js?v=mu10vpvt';
import * as lung from './lung.js?v=mu10vpvt';
import * as breast from './breast.js?v=mu10vpvt';
import * as phyllodes from './phyllodes.js?v=mu10vpvt';
import * as gastric from './gastric.js?v=mu10vpvt';
import * as oesophagus from './oesophagus.js?v=mu10vpvt';
import * as appendix from './appendix.js?v=mu10vpvt';
import * as gallbladder from './gallbladder.js?v=mu10vpvt';

export const PROTOCOLS = { colorectal, gist, endometrium, ovary, lung, breast, phyllodes, gastric, oesophagus, appendix, gallbladder };

// T, N and M alternatives are listed longest first (ovary: T1c1-3, T2a/b, T3a-c, N0(i+); lung: T1mi,
// N2a/b, M1c1/c2; breast: Tis(DCIS), Tis(Paget), T4c/d, N0(mol+), N1mi, N3a-c and the optional (sn) / (f) node suffix); the negative look-aheads stand in for \b so "N0(i+)" and "T1c1 " both terminate cleanly.
const OVERRIDE_RE = /\b(y?p?)T(is\(DCIS\)|is\(Paget\)|is|X|0|1mi|1c1|1c2|1c3|1c|1a|1b|1|2a|2b|2|3a2|3a1|3a|3b|3c|3|4a|4b|4c|4d|4)(?!\w).*?\b(?:y?p)?N(X|0\(i\+\)|0\(mol\+\)|0|1mi|1a|1b|1c|1|2a|2b|2|3a|3b|3c|3)(?:\((?:sn|f)\))?(?!\w)(?:.*?\b(?:y?p)?M(1c1|1c2|1a|1b|1c|1|X)(?!\w))?/i;
const CAT_RE = { T: /^y?p?(T(?:is\(DCIS\)|is\(Paget\)|is|X|0|1mi|1c1|1c2|1c3|1c|1a|1b|1|2a|2b|2|3a2|3a1|3a|3b|3c|3|4a|4b|4c|4d|4))$/i, N: /^y?p?(N(?:X|0\(i\+\)|0\(mol\+\)|0|1mi|1a|1b|1c|1|2a|2b|2|3a|3b|3c|3)(?:\((?:sn|f)\))?)$/i };

/** Normalise a typed prior category ("pT1a", "T1a", "ypN0") to the bare form, or null. */
export function parseCategory(text, axis) {
  const m = CAT_RE[axis]?.exec(String(text || '').trim());
  return m ? m[1].replace(/^([TN])/, (c) => c.toUpperCase()) : null;
}

// Ordinal rank of a category within its axis so a prior-specimen category can be compared with the
// current one (higher wins for the combined stage).
const RANK = (cat) => {
  const order = ['Tis', 'Tis(DCIS)', 'Tis(Paget)', 'T1mi', 'T1a', 'T1b', 'T1c', 'T1c1', 'T1c2', 'T1c3', 'T1', 'T2a', 'T2b', 'T2', 'T3a', 'T3a1', 'T3a2', 'T3b', 'T3c', 'T3', 'T4a', 'T4b', 'T4c', 'T4d', 'T4', 'N0', 'N0(i+)', 'N0(mol+)', 'N1mi', 'N1a', 'N1b', 'N1c', 'N1', 'N2a', 'N2b', 'N2', 'N3a', 'N3b', 'N3c', 'N3'];
  const i = order.indexOf(String(cat || '').replace(/\((sn|f)\)$/i, ''));
  return i < 0 ? -1 : i;
};

/** Parse a free-text override like "ypT3 pN1a pM1a" or "pT2 N0" into bare categories. */
export function parseOverride(text) {
  const m = OVERRIDE_RE.exec(text || '');
  if (!m) return null;
  return { T: `T${m[2]}`, N: `N${m[3]}`, M: m[4] ? `M${m[4]}` : 'M-' };
}

/**
 * @param {object} values part values
 * @param {string|object} protocol protocol id or module
 * @param {{prior?: {T?: string, N?: string, accession?: string, procedure?: string}}} [opts]
 *   `prior` carries categories typed from an earlier specimen (lung: completion lobectomy after a wedge).
 *   Each axis takes the higher of the prior and the current category; `origin.T/N` records which won
 *   ('current' | 'prior'). A prior category only fills in when the current one is X or lower.
 * @returns {{T, N, M, descriptors, prefix, tnm, stage, edition, notes, overridden, derived, origin, prior}}
 */
export function deriveTNM(values, protocol = 'colorectal', opts = {}) {
  const P = typeof protocol === 'string' ? PROTOCOLS[protocol] : protocol;
  if (!P) throw new Error(`Unknown staging protocol: ${protocol}`);
  const notes = [];
  const t = P.T(values); const n = P.N(values); const m = P.M(values);
  for (const r of [t, n, m]) if (r.note) notes.push(r.note);
  const descriptors = P.descriptors ? P.descriptors(values) : [];
  const derived = { T: t.cat, N: n.cat, M: m.cat };
  let cats = derived;
  let overridden = false;
  const origin = { T: 'current', N: 'current' };
  const prior = opts.prior && (opts.prior.T || opts.prior.N) ? { ...opts.prior, T: parseCategory(opts.prior.T, 'T'), N: parseCategory(opts.prior.N, 'N') } : null;
  if (prior) {
    const label = `prior ${prior.procedure || 'specimen'}${prior.accession ? ` (${prior.accession})` : ''}`;
    for (const axis of ['T', 'N']) {
      if (!prior[axis]) continue;
      const cur = cats[axis];
      if (cur === `${axis}X` || RANK(prior[axis]) > RANK(cur)) {
        cats = { ...cats, [axis]: prior[axis] };
        origin[axis] = 'prior';
        const x = axis === 'T' ? t : n;
        if (cur === `${axis}X` && x.note) notes.splice(notes.indexOf(x.note), 1); // the X explanation no longer applies
        if (cur !== `${axis}X`) notes.push(`p${axis} taken from the ${label}: ${prior[axis]} is higher than ${cur} derived from this specimen.`);
      } else if (RANK(prior[axis]) < RANK(cur)) notes.push(`This specimen derives ${cur}; the ${label} was ${prior[axis]}. The higher category governs.`);
    }
  }
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
  const stage = P.stageGroup(cats.T, cats.N, cats.M, values);
  return { ...cats, descriptors, prefix, tnm, stage, edition: P.edition, notes, overridden, derived, origin, prior };
}

/** "pT3 pN1b" -> "pT3 pN1b" is already readable; this adds the stage group line used in reports. */
export function stageLine(result) {
  if (!result.stage) return '';
  const assumed = result.M === 'M-' ? ' (if cM0)' : '';
  return `Stage group${assumed}: ${result.stage}`;
}
