// Ewing sarcoma staging — AJCC 8th edition site-aware (Bone vs Soft Tissue) (QMH Pedi-EwingSarcoma).
export const id = 'ewing';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const isBone = (v) => !/extraskeletal|soft tissue/i.test(v?.siteCategory || '');

export function edition(v) {
  return isBone(v)
    ? 'AJCC 8th edition (Bone — Ewing sarcoma)'
    : 'AJCC 8th edition (Soft tissue — Extraskeletal Ewing sarcoma)';
}

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  lung: 'Lung only (pM1a)',
  boneOther: 'Bone or other distant site(s) (pM1b)',
  cannot: 'Cannot be determined'
};

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => [METS.lung, METS.boneOther].includes(x));
}

export function T(v) {
  const sz = num(v.sizeMm);
  if (isBone(v)) {
    if (v.skipMetastases === true) return { cat: 'T3' };
    if (sz === null || sz <= 0) return { cat: 'TX', note: 'Greatest tumour dimension (mm) not recorded: bone pT1 (<= 80 mm) vs pT2 (> 80 mm) cannot be assigned.' };
    return { cat: sz > 80 ? 'T2' : 'T1' };
  }
  if (sz === null || sz <= 0) return { cat: 'TX', note: 'Greatest tumour dimension (mm) not recorded: soft tissue pT1–pT4 cannot be assigned.' };
  if (sz > 150) return { cat: 'T4' };
  if (sz > 100) return { cat: 'T3' };
  if (sz > 50) return { cat: 'T2' };
  return { cat: 'T1' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  return { cat: inv > 0 ? 'N1' : 'N0' };
}

export function M(v) {
  const sites = m1Sites(v);
  if (!sites.length) return { cat: 'M-' };
  if (sites.includes(METS.boneOther)) return { cat: 'M1b' };
  return { cat: 'M1a' };
}

export function descriptors(v) {
  const out = [];
  if (v.recurrent === true) out.push('r');
  if (v.postTherapy === true) out.push('y');
  return out;
}

export function stageGroup(tCat, nCat, mCat, v = {}) {
  if (mCat === 'M1b' || nCat === 'N1') return 'IVB';
  if (mCat === 'M1a') return 'IVA';
  if (isBone(v)) {
    if (tCat === 'T3') return 'III';
    if (tCat === 'T2') return 'IIB';
    if (tCat === 'T1') return 'IIA';
  } else {
    if (tCat === 'T3' || tCat === 'T4') return 'IIIB';
    if (tCat === 'T2') return 'IIIA';
    if (tCat === 'T1') return 'II';
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

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, isBone, METS };
