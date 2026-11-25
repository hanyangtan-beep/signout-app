// Radical prostatectomy staging — AJCC 8th edition (Chapter 58: Prostate),
// CAP Protocol for the Examination of Radical Prostatectomy Specimens v4.3.0.0 (Sept 2023),
// and WHO Classification of Urinary and Male Genital Tumours, 5th edition (2022).
//
// Pathological T (radical prostatectomy — no pT1 and no pT2a/b/c sub-staging in AJCC 8th):
//   pT0 : No evidence of primary tumour
//   pT2 : Organ confined
//   pT3a: Extraprostatic extension (unilateral or bilateral) OR microscopic invasion of bladder neck
//   pT3b: Tumour invades seminal vesicle(s) (muscular wall)
//   pT4 : Tumour is fixed or invades adjacent structures other than seminal vesicles
//         (external sphincter, rectum, bladder wall, levator muscles, and/or pelvic wall)
//
// Pathological N:
//   pN0 : No positive regional lymph nodes
//   pN1 : Metastasis in regional lymph node(s)
//   (no nodes submitted -> NX with none: true, omitted from printed pTNM)
//
// Pathological M:
//   pM1a: Non-regional lymph node(s)
//   pM1b: Bone(s)
//   pM1c: Other site(s) with or without bone disease
//
// Prognostic stage groups:
//   Stage IVA (any T, N1, M0) and Stage IVB (any T, any N, M1) are derivable from pathology alone.
//   Stages I–IIIC require preoperative serum PSA in AJCC 8th edition and are noted in Checks only.

export const id = 'prostate';
export const edition = 'AJCC 8th edition';

const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  nonRegLn: 'Non-regional lymph node(s)',
  bone: 'Bone',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};

export function gleasonInfo(v) {
  const p = int(v.primary);
  const s = int(v.secondary);
  const t = int(v.tertiary);
  if (p === null || s === null) return null;
  const score = p + s;
  let group = null;
  if (score <= 6) group = 1;
  else if (p === 3 && s === 4) group = 2;
  else if (p === 4 && s === 3) group = 3;
  else if (score === 8) group = 4;
  else if (score >= 9) group = 5;
  return { primary: p, secondary: s, tertiary: t, score, group };
}

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => [METS.nonRegLn, METS.bone, METS.other].includes(x));
}

export function T(v) {
  if (v.noPrimary === true) return { cat: 'T0' };
  if (v.adjacentInvasion === 'Present') return { cat: 'T4' };
  if (/^Present\b/.test(v.svi || '')) return { cat: 'T3b' };
  if (/^Present\b/.test(v.epe || '') || v.bladderNeck === 'Present') return { cat: 'T3a' };
  if (v.epe === 'Cannot be determined' || v.svi === 'Cannot be determined' || v.bladderNeck === 'Cannot be determined') {
    return { cat: 'TX', note: 'Extraprostatic extension, bladder neck or seminal vesicle status cannot be determined: pT cannot be assigned.' };
  }
  return { cat: 'T2' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv !== null && inv > 0) return { cat: 'N1' };
  return { cat: 'N0' };
}

export function M(v) {
  const sites = m1Sites(v);
  if (!sites.length) return { cat: 'M-' };
  if (sites.includes(METS.other)) return { cat: 'M1c' };
  if (sites.includes(METS.bone)) return { cat: 'M1b' };
  return { cat: 'M1a' };
}

export function descriptors(v) {
  const out = [];
  if (v.multiplePrimaries === true) out.push('m');
  if (v.recurrent === true) out.push('r');
  const te = v.treatmentEffect || '';
  const hasTherapyEffect = /effect(?:s)? present/i.test(te);
  if (v.postTherapy === true || hasTherapyEffect) out.push('y');
  return out;
}

export function stageGroup(tCat, nCat, mCat) {
  if (mCat && mCat.startsWith('M1')) return 'IVB';
  if (nCat === 'N1') return 'IVA';
  return null;
}

export function referenceLines(v, st) {
  if (st.stage) {
    const assumed = st.M === 'M-' ? ' (assuming cM0)' : '';
    return [`Stage group, AJCC 8th edition (reference, not reported): Stage ${st.stage}${assumed}.`];
  }
  return ['AJCC 8th edition prognostic stage groups I–IIIC require preoperative serum PSA and are not derived from pathology alone.'];
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, gleasonInfo, m1Sites, METS };
