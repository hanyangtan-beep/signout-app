// Urethral carcinoma staging — AJCC 8th edition dual-track (QMH UG-Urethra, CAP 4.3.0.0).
// Dual-track pT: Prostatic urethra vs Male penile/bulbomembranous & Female urethra.
export const id = 'urethra';

const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const isProstatic = (v) => /prostatic/i.test(v?.site || '');

export function edition(v) {
  return isProstatic(v)
    ? 'AJCC 8th edition (Prostatic urethra)'
    : 'AJCC 8th edition (Male penile / female urethra)';
}

export const EXT = {
  t0: 'No evidence of primary tumour (pT0)',
  ta: 'Non-invasive papillary carcinoma (pTa)',
  tis: 'Carcinoma in situ (including prostatic urethra / prostatic ducts without stromal invasion) (pTis)',
  t1: 'Invades subepithelial connective tissue (pT1)',
  t2: 'Invades corpus spongiosum or periurethral muscle (penile/female) OR prostatic stroma (prostatic urethra) (pT2)',
  t3: 'Invades corpus cavernosum or anterior vagina (penile/female) OR periprostatic fat (prostatic urethra) (pT3)',
  t4: 'Invades other adjacent organs (bladder wall, seminal vesicle, rectal wall, scrotum) (pT4)',
  cannot: 'Cannot be determined'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  nonRegLn: 'Non-regional lymph node(s)',
  lung: 'Lung',
  liver: 'Liver',
  bone: 'Bone',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};

const M1_SITES = [METS.nonRegLn, METS.lung, METS.liver, METS.bone, METS.other];

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => M1_SITES.includes(x));
}

export function T(v) {
  const ext = v.extension || '';
  if (ext === EXT.t4) return { cat: 'T4' };
  if (ext === EXT.t3) return { cat: 'T3' };
  if (ext === EXT.t2) return { cat: 'T2' };
  if (ext === EXT.t1) return { cat: 'T1' };
  if (ext === EXT.tis) return { cat: 'Tis' };
  if (ext === EXT.ta) return { cat: 'Ta' };
  if (ext === EXT.t0) return { cat: 'T0' };
  return { cat: 'TX', note: 'Tumour extent cannot be determined: pT cannot be assigned.' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv <= 0) return { cat: 'N0' };
  return { cat: inv === 1 ? 'N1' : 'N2' };
}

export function M(v) {
  return m1Sites(v).length ? { cat: 'M1' } : { cat: 'M-' };
}

export function descriptors(v) {
  const out = [];
  if (v.multiplePrimaries === true) out.push('m');
  if (v.recurrent === true) out.push('r');
  if (v.postTherapy === true) out.push('y');
  return out;
}

export function stageGroup(tCat, nCat, mCat) {
  if (mCat === 'M1' || tCat === 'T4' || nCat === 'N2') return 'IV';
  if (tCat === 'T3' || nCat === 'N1') return 'III';
  if (nCat === 'N0') {
    if (tCat === 'T2') return 'II';
    if (tCat === 'T1') return 'I';
    if (tCat === 'Tis') return '0is';
    if (tCat === 'Ta') return '0a';
  }
  return null;
}

export function referenceLines(v, st) {
  if (st.stage) {
    const assumed = st.M === 'M-' ? ' (assuming cM0)' : '';
    return [`Stage group, ${st.edition} (reference, not reported): Stage ${st.stage}${assumed}.`];
  }
  return [];
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, isProstatic, EXT, METS };
