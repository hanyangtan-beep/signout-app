// Adrenal cortical carcinoma staging — AJCC 8th edition / ENSAT (QMH Endocrine-Adrenal).
export const id = 'adrenal';
export const edition = 'AJCC 8th edition / ENSAT';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  confined: 'Confined to adrenal gland (no extra-adrenal invasion)',
  t3: 'Infiltrates surrounding extra-adrenal adipose tissue without adjacent organ invasion (pT3)',
  t4: 'Invades adjacent organs (kidney, diaphragm, pancreas, spleen, liver) and/or venous tumour thrombus in renal vein or vena cava (pT4)',
  cannot: 'Cannot be assessed'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  liver: 'Liver',
  lung: 'Lung',
  bone: 'Bone',
  nonRegLn: 'Non-regional lymph node(s)',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};

const M1_SITES = [METS.liver, METS.lung, METS.bone, METS.nonRegLn, METS.other];

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => M1_SITES.includes(x));
}

export function T(v) {
  const ext = v.extension || '';
  if (ext === EXT.t4) return { cat: 'T4' };
  if (ext === EXT.t3) return { cat: 'T3' };
  if (ext === EXT.cannot) return { cat: 'TX', note: 'Tumour extent cannot be assessed: pT cannot be assigned.' };
  const sz = num(v.sizeMm);
  if (sz === null || sz <= 0) return { cat: 'TX', note: 'Greatest tumour dimension (mm) not recorded: pT1 vs pT2 cannot be assigned.' };
  return { cat: sz > 50 ? 'T2' : 'T1' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  return { cat: inv > 0 ? 'N1' : 'N0' };
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
  if (mCat === 'M1') return 'IV';
  if (nCat === 'N1' || tCat === 'T3' || tCat === 'T4') return 'III';
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

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, EXT, METS };
