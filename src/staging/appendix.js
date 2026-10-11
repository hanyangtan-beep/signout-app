// Appendiceal carcinoma — AJCC 8th edition pTNM (appendix chapter), as displayed on the
// QMH GI-Appendix page (the page stamps "AJCC 9e"; the categories and groups below follow
// AJCC 8th edition, the edition the rest of the app stages against — the departure is
// recorded in docs/specs/appendix-carcinoma.md). Field ids belong to schemas/appendix_carcinoma.json.
//
// pT is taken from the "Tumour extension" check-list; when more than one box is ticked the
// deepest governs. LAMN is special: T1 and T2 are not applicable to a low-grade appendiceal
// mucinous neoplasm, so "tumour in the submucosa / muscularis propria" stays pTis(LAMN);
// acellular mucin or mucinous epithelium reaching the subserosa / mesoappendix is pT3 and
// on the serosal surface pT4a, whatever the histologic type. pN derives from the involved-node
// count as N1a (1) / N1b (2-3) / N2a (4-6) / N2b (7+) — the QMH pick-list merges N2 ("4 or
// more"); the split is carried the same deliberate way as the gastric N3a / N3b split. Tumour
// deposits in a node-negative case grade pN1c. pM splits M1a (intraperitoneal acellular
// mucin), M1b (intraperitoneal metastasis whose deposits contain tumour cells) and M1c
// (extraperitoneal sites). Stage groups follow the colon-shaped III table; stage IV carries
// the mucinous grade split: M1a is IVA at any grade, M1b is IVA at G1 / GX and IVB at
// G2-G3, M1c is always IVC.

export const id = 'appendix';
export const edition = 'AJCC 8th edition';

const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const isLAMN = (v) => /^Low-grade appendiceal mucinous neoplasm/.test(String(v.histType || ''));

/** schema 'tumourExtension' option -> {rank, t, tLAMN} — deepest ticked option governs. */
export const EXTENSION_T = [
  [/lamina propria or muscularis mucosa/i, 1, 'Tis'],
  [/mucin invades (?:the )?submucosa/i, 2, 'T1'],
  [/invades submucosa/i, 3, 'T1'],
  [/mucin invades muscularis propria/i, 4, 'T2'],
  [/invades muscularis propria/i, 5, 'T2'],
  [/mucin invades subserosa or mesoappendix/i, 6, 'T3'],
  [/into the subserosa or mesoappendix/i, 7, 'T3'],
  [/mucin invades the visceral peritoneum/i, 8, 'T4a'],
  [/invades the visceral peritoneum/i, 9, 'T4a'],
  [/directly invades \(or adheres to\)|directly invades adjacent organs or structures/i, 10, 'T4b'],
  [/cannot be determined/i, -1, 'TX'],
  [/no evidence of primary/i, -2, 'T0']
];

export function T(v) {
  const ticks = arr(v.tumourExtension);
  if (!ticks.length) return { cat: 'TX', note: 'Tumour extension not recorded; pT cannot be assigned.' };
  if (ticks.some((s) => /no evidence of primary/i.test(s))) return { cat: 'T0' };
  if (ticks.every((s) => /cannot be determined/i.test(s))) return { cat: 'TX', note: 'Tumour extension cannot be determined.' };
  let best = null;
  for (const s of ticks) {
    for (const [re, rank, cat] of EXTENSION_T) {
      if (re.test(s) && rank > 0 && (!best || rank > best.rank)) best = { rank, cat, label: s };
      if (re.test(s)) break;
    }
  }
  if (!best) return { cat: 'TX', note: 'Tumour extension options have no pT mapping.' };
  if (isLAMN(v) && ['T1', 'T2'].includes(best.cat)) return { cat: 'Tis(LAMN)', note: 'T1 and T2 are not applicable to a low-grade appendiceal mucinous neoplasm; confined by the muscularis propria this is pTis(LAMN).' };
  if (best.cat === 'T4b' && !String(v.extensionDetail || '').trim()) return { cat: 'T4b', note: 'Tumour directly invades adjacent structures; name them on the detail line.' };
  return { cat: best.cat };
}

export function N(v) {
  const examined = int(v.nodesExamined);
  const involved = int(v.nodesInvolved);
  const deposits = int(v.tumourDepositsN) ?? 0;
  if ((examined === null || examined === 0)) {
    if (deposits > 0) return { cat: 'N1c', note: 'Tumour deposits present and no regional nodes submitted or positive; this grades pN1c.' };
    return { cat: 'NX', none: true, note: 'No regional lymph nodes submitted; pN not assigned.' };
  }
  if (involved === null) return { cat: 'NX', note: 'Number of involved lymph nodes not recorded; pN cannot be assigned.' };
  if (involved === 0) {
    if (deposits > 0) return { cat: 'N1c', note: 'No positive nodes but tumour deposits recorded; this grades pN1c (deposits are not added to the nodal count).' };
    return { cat: 'N0' };
  }
  if (deposits > 0) return { cat: involved >= 4 ? (involved >= 7 ? 'N2b' : 'N2a') : involved >= 2 ? 'N1b' : 'N1a', note: 'Tumour deposits are present with positive nodes and do not change the nodal category.' };
  if (involved === 1) return { cat: 'N1a' };
  if (involved <= 3) return { cat: 'N1b' };
  if (involved <= 6) return { cat: 'N2a', note: 'The QMH pick-list merges pN2 (4 or more nodes); N2a (4-6) and N2b (7 or more) are separated here as in the gastric N3a / N3b split.' };
  return { cat: 'N2b', note: 'The QMH pick-list merges pN2 (4 or more nodes); N2a (4-6) and N2b (7 or more) are separated here as in the gastric N3a / N3b split.' };
}

/** Distant-metastasis options that carry M1a / M1b / M1c. */
export const M1A_RE = /^Intraperitoneal acellular mucin/;
export const M1B_RE = /^Intraperitoneal metastasis only/;

export function M(v) {
  // When several boxes are ticked the highest category governs (M1c > M1b > M1a).
  const mets = arr(v.distantMets);
  if (mets.some((s) => /^(Non-regional lymph node|Lung|Liver|Site\(s\) other than peritoneum)/.test(s))) return { cat: 'M1c', note: 'Metastasis outside the peritoneum grades pM1c.' };
  if (mets.some((s) => M1B_RE.test(s))) return { cat: 'M1b', note: 'Intraperitoneal metastasis (deposits containing tumour cells) grades pM1b.' };
  if (mets.some((s) => M1A_RE.test(s))) return { cat: 'M1a', note: 'Intraperitoneal acellular mucin without identifiable tumour cells grades pM1a.' };
  return { cat: 'M-' };
}

export function descriptors(v) {
  const d = [];
  if (v.multiplePrimaries === true) d.push('m');
  if (v.recurrent === true) d.push('r');
  return d;
}

/** 'G1' | 'G2' | 'G3' | 'GX' | null from the grade option (goblet-cell group counts as its WHO grade). */
export function gradeOf(v) {
  const g = String(v.grade || '');
  if (/^G1/.test(g)) return 'G1';
  if (/^G2/.test(g)) return 'G2';
  if (/^G3/.test(g)) return 'G3';
  if (/^G4/.test(g)) return 'G3';
  if (/^GX/.test(g)) return 'GX';
  const gg = String(v.gobletGrade || '');
  if (/group 1/.test(gg)) return 'G1';
  if (/group 2/.test(gg)) return 'G2';
  if (/group 3/.test(gg)) return 'G3';
  return null;
}

const N1_FAMILY = new Set(['N1a', 'N1b', 'N1c', 'N1']);

/**
 * Pathological stage groups (AJCC 8e appendix, colon-shaped III table).
 * Tis / Tis(LAMN) N0 = stage 0. T1-2 N0 I; T3 N0 IIA; T4a N0 IIB; T4b N0 IIC.
 * IIIA: T1-2 N1x and T1 N2a. IIIB: T3-4a N1x, T2-3 N2a, T1-2 N2b. IIIC: T4a N2a,
 * T3-4a N2b, T4b any positive N. Stage IV carries the mucinous grade split:
 * M1a IVA (any grade), M1b IVA at G1 / GX but IVB at G2-G3, M1c IVC.
 */
export function stageGroup(TC, NC, MC, values = {}) {
  if (MC === 'M1a') return 'IVA';
  if (MC === 'M1b') {
    const g = gradeOf(values);
    return g === 'G2' || g === 'G3' ? 'IVB' : 'IVA';
  }
  if (MC === 'M1c') return 'IVC';
  if (TC === 'Tis' || TC === 'Tis(LAMN)') return NC === 'N0' ? '0' : null;
  if (NC === 'N0') {
    if (TC === 'T1' || TC === 'T2') return 'I';
    if (TC === 'T3') return 'IIA';
    if (TC === 'T4a') return 'IIB';
    if (TC === 'T4b') return 'IIC';
    return null;
  }
  if (NC === 'N2a') {
    if (TC === 'T1') return 'IIIA';
    if (TC === 'T2' || TC === 'T3') return 'IIIB';
    if (TC === 'T4a' || TC === 'T4b') return 'IIIC';
    return null;
  }
  if (NC === 'N2b' || NC === 'N2') {
    if (TC === 'T1' || TC === 'T2') return 'IIIB';
    return 'IIIC';
  }
  if (N1_FAMILY.has(NC)) {
    if (TC === 'T1' || TC === 'T2') return 'IIIA';
    if (TC === 'T3' || TC === 'T4a') return 'IIIB';
    if (TC === 'T4b') return 'IIIC';
    return null;
  }
  return null;
}
