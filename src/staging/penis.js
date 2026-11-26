// Penile carcinoma staging — AJCC 8th edition (QMH UG-Penis).
// Auto-upgrades pT1a to pT1b when LVI, PNI, or G3 (poorly differentiated) is present.
export const id = 'penis';
export const edition = 'AJCC 8th edition';

const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  tis: 'Penile intraepithelial neoplasia (PeIN / carcinoma in situ) (pTis)',
  ta: 'Non-invasive localised squamous cell carcinoma (pTa)',
  t1: 'Invades subepithelial connective tissue / lamina propria / dartos (pT1a or pT1b)',
  t2: 'Invades corpus spongiosum (with or without urethral invasion) (pT2)',
  t3: 'Invades corpus cavernosum (with or without urethral invasion) (pT3)',
  t4: 'Invades adjacent structures (scrotum, prostate, pubic bone) (pT4)',
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
  if (ext === EXT.t1) {
    const highRisk = /^Present/i.test(v.lvi || '') || /^Present/i.test(v.pni || '') || /^G3/i.test(v.grade || '');
    return { cat: highRisk ? 'T1b' : 'T1a' };
  }
  if (ext === EXT.ta) return { cat: 'Ta' };
  if (ext === EXT.tis) return { cat: 'Tis' };
  return { cat: 'TX', note: 'Tumour extent cannot be determined: pT cannot be assigned.' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv <= 0) return { cat: 'N0' };
  const ene = /^Present/i.test(v.ene || '');
  const pelvic = v.pelvicNodesInvolved === true;
  if (ene || pelvic) return { cat: 'N3' };
  const bilat = /bilateral/i.test(v.nodeLaterality || '');
  if (bilat || inv >= 3) return { cat: 'N2' };
  return { cat: 'N1' };
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
  if (mCat === 'M1' || tCat === 'T4' || nCat === 'N3') return 'IV';
  if (nCat === 'N2') return 'IIIB';
  if (nCat === 'N1') return 'IIIA';
  if (nCat === 'N0') {
    if (tCat === 'T3') return 'IIB';
    if (tCat === 'T2' || tCat === 'T1b') return 'IIA';
    if (tCat === 'T1a') return 'I';
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

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, EXT, METS };
