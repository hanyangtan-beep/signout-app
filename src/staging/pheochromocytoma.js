// Phaeochromocytoma and sympathetic paraganglioma staging — AJCC 8th edition Ch. 77 (QMH Endocrine-Pheochromocytoma).
export const id = 'pheochromocytoma';
export const edition = 'AJCC 8th edition';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  none: 'No extra-adrenal / surrounding tissue invasion',
  t3: 'Invasion into surrounding tissues (e.g. liver, pancreas, spleen, kidney) (pT3)',
  cannot: 'Cannot be assessed'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  bone: 'Bone',
  distantLn: 'Distant lymph node(s)',
  liver: 'Liver',
  lung: 'Lung',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};

const M1_SITES = [METS.bone, METS.distantLn, METS.liver, METS.lung, METS.other];

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => M1_SITES.includes(x));
}

export function isSympatheticPgl(v) {
  return /sympathetic paraganglioma/i.test(v?.histType || '') || /extra-adrenal/i.test(v?.site || '');
}

export function isParasympatheticPgl(v) {
  return /parasympathetic/i.test(v?.histType || '');
}

export function T(v) {
  if (isParasympatheticPgl(v)) return { cat: 'TX', note: 'AJCC 8th Ch. 77 does not assign pT to parasympathetic paragangliomas.' };
  const ext = v.extension || '';
  if (ext === EXT.t3) return { cat: 'T3' };
  if (ext === EXT.cannot) return { cat: 'TX', note: 'Local invasion cannot be assessed: pT cannot be assigned.' };
  if (isSympatheticPgl(v)) return { cat: 'T2' };
  const sz = num(v.sizeMm);
  if (sz === null || sz <= 0) return { cat: 'TX', note: 'Greatest tumour dimension (mm) not recorded: pT1 vs pT2 cannot be assigned.' };
  return { cat: sz >= 50 ? 'T2' : 'T1' };
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
  const hasBone = sites.includes(METS.bone);
  const hasOther = sites.some((s) => s !== METS.bone);
  if (hasBone && hasOther) return { cat: 'M1c' };
  if (hasBone) return { cat: 'M1a' };
  return { cat: 'M1b' };
}

export function descriptors(v) {
  const out = [];
  if (v.multiplePrimaries === true) out.push('m');
  if (v.recurrent === true) out.push('r');
  if (v.postTherapy === true) out.push('y');
  return out;
}

export function stageGroup(tCat, nCat, mCat) {
  if (mCat && mCat.startsWith('M1')) return 'IV';
  if (tCat === 'T3' || nCat === 'N1') return 'III';
  if (nCat === 'N0') {
    if (tCat === 'T2') return 'II';
    if (tCat === 'T1') return 'I';
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

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, isSympatheticPgl, isParasympatheticPgl, EXT, METS };
