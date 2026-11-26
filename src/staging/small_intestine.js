// Small intestine carcinoma staging — AJCC 8th edition (Chapter 18).
export const id = 'small_intestine';
export const edition = 'AJCC 8th edition';

const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  tis: 'High-grade dysplasia / carcinoma in situ',
  lp: 'Tumour invades the lamina propria',
  sm: 'Tumour invades the submucosa',
  mp: 'Tumour invades the muscularis propria',
  ss: 'Tumour invades through the muscularis propria into the subserosa or nonperitonealised perimuscular tissue (mesentery or retroperitoneum) without serosal penetration',
  serosa: 'Tumour perforates the visceral peritoneum',
  pancreas: 'Tumour directly invades the pancreas',
  bileDuct: 'Tumour directly invades the bile duct',
  otherOrgan: 'Tumour directly invades other organs or structures (specify)',
  cannot: 'Cannot be determined'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  nonRegLn: 'Non-regional lymph node(s) (specify)',
  liver: 'Liver',
  peritoneum: 'Peritoneum',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};

const M1_SITES = [METS.nonRegLn, METS.liver, METS.peritoneum, METS.other];

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => M1_SITES.includes(x));
}

export function T(v) {
  if (v.noPrimary === true) return { cat: 'T0' };
  const ext = v.extension || '';
  if (ext === EXT.serosa || ext === EXT.pancreas || ext === EXT.bileDuct || ext === EXT.otherOrgan) return { cat: 'T4' };
  if (ext === EXT.ss) return { cat: 'T3' };
  if (ext === EXT.mp) return { cat: 'T2' };
  if (ext === EXT.sm) return { cat: 'T1b' };
  if (ext === EXT.lp) return { cat: 'T1a' };
  if (ext === EXT.tis) return { cat: 'Tis' };
  return { cat: 'TX', note: 'Tumour extension cannot be determined: pT cannot be assigned.' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv === null || inv <= 0) return { cat: 'N0' };
  if (inv >= 3) return { cat: 'N2' };
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
  if (mCat === 'M1') return 'IV';
  if (nCat === 'N2') return 'IIIB';
  if (nCat === 'N1') return 'IIIA';
  if (nCat === 'N0') {
    if (tCat === 'T4') return 'IIB';
    if (tCat === 'T3') return 'IIA';
    if (tCat === 'T2' || tCat.startsWith('T1')) return 'I';
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
