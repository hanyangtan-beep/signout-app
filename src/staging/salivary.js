// Major salivary gland carcinoma staging — AJCC 9th edition (QMH HN-Salivary gland, CAP Salivary Gland 1.0.0.0).
// Note AJCC 9th Salivary Gland pN: pN0 (none), pN1 (1–3 nodes without ENE), pN2 (> 3 nodes OR any node with definitive pathological ENE).
export const id = 'salivary';
export const edition = 'AJCC 9th edition';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  none: 'No evidence of extraparenchymal extension',
  t3: 'Gross extraparenchymal soft tissue extension (pT3)',
  t4a: 'Invades skin, bone, cartilage, facial/named nerve, ear canal, or adjacent organ parenchyma (pT4a)',
  t4b: 'Invades skull base, pterygoid plates, and/or encases carotid artery (pT4b)',
  cannot: 'Cannot be assessed'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  nonRegLn: 'Non-regional lymph node(s)',
  lung: 'Lung',
  liver: 'Liver',
  bone: 'Bone',
  brain: 'Brain',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};

const M1_SITES = [METS.nonRegLn, METS.lung, METS.liver, METS.bone, METS.brain, METS.other];

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => M1_SITES.includes(x));
}

export function T(v) {
  if (v.noPrimary === true) return { cat: 'T0' };
  if (/intracapsular/i.test(v.histType || '')) return { cat: 'Tis' };
  const ext = v.extension || '';
  if (ext === EXT.t4b) return { cat: 'T4b' };
  if (ext === EXT.t4a) return { cat: 'T4a' };
  if (ext === EXT.cannot) return { cat: 'TX', note: 'Extraparenchymal extension cannot be assessed: pT cannot be assigned.' };
  const sz = num(v.sizeMm);
  if (ext === EXT.t3 || (sz !== null && sz > 40)) return { cat: 'T3' };
  if (sz === null || sz <= 0) return { cat: 'TX', note: 'Greatest tumour dimension (mm) not recorded: pT1–pT3 cannot be assigned.' };
  if (sz > 20) return { cat: 'T2' };
  return { cat: 'T1' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv <= 0) return { cat: 'N0' };
  const ene = /^Present/i.test(v.ene || '');
  if (ene || inv > 3) return { cat: 'N2' };
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
  if (mCat === 'M1') return 'IVC';
  if (tCat === 'T4b') return 'IVB';
  if (tCat === 'T4a' || nCat === 'N2') return 'IVA';
  if (tCat === 'T3' || nCat === 'N1') return 'III';
  if (nCat === 'N0') {
    if (tCat === 'T2') return 'II';
    if (tCat === 'T1') return 'I';
    if (tCat === 'Tis') return '0';
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
