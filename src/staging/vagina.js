// Vaginal carcinoma staging — AJCC 8th edition (Chapter 50) and FIGO.
export const id = 'vagina';
export const edition = 'AJCC 8th edition';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  none: 'Not identified (confined to vaginal wall)',
  paravaginal: 'Paravaginal tissues (not pelvic sidewall)',
  pelvicSidewall: 'Pelvic sidewall',
  lowerThird: 'Vagina, lower third (with pelvic sidewall or hydronephrosis)',
  bladderMucosa: 'Bladder mucosa',
  rectalMucosa: 'Rectal mucosa',
  beyondPelvis: 'Beyond the true pelvis',
  other: 'Other organs/tissue (specify)',
  cannot: 'Cannot be determined'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  distant: 'Distant metastasis (specify)',
  cannot: 'Cannot be determined'
};

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => x === METS.distant);
}

export function T(v) {
  if (v.noPrimary === true) return { cat: 'T0' };
  const ext = arr(v.extension);
  if (ext.includes(EXT.bladderMucosa) || ext.includes(EXT.rectalMucosa) || ext.includes(EXT.beyondPelvis)) {
    return { cat: 'T4' };
  }
  if (ext.includes(EXT.pelvicSidewall) || ext.includes(EXT.lowerThird) || v.hydronephrosis === true) {
    return { cat: 'T3' };
  }
  if (ext.includes(EXT.cannot)) {
    return { cat: 'TX', note: 'Other tissue/organ involvement cannot be determined: pT cannot be assigned.' };
  }
  const sz = num(v.sizeMm);
  if (ext.includes(EXT.paravaginal)) {
    if (sz === null || sz <= 0) return { cat: 'T2', note: 'Greatest tumour dimension (mm) not recorded: pT2a vs pT2b cannot be assigned.' };
    return { cat: sz <= 20 ? 'T2a' : 'T2b' };
  }
  if (sz === null || sz <= 0) return { cat: 'T1', note: 'Greatest tumour dimension (mm) not recorded: pT1a vs pT1b cannot be assigned.' };
  return { cat: sz <= 20 ? 'T1a' : 'T1b' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  const itc = int(v.nodesItc) ?? 0;
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv > 0) return { cat: 'N1' };
  if (itc > 0) return { cat: 'N0(i+)', note: 'Isolated tumour cells only (<= 0.2 mm): pN0(i+), grouped with pN0.' };
  return { cat: 'N0' };
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
  if (mCat === 'M1') return 'IVB';
  if (tCat === 'T4') return 'IVA';
  const nNorm = nCat === 'N0(i+)' ? 'N0' : nCat;
  if (nNorm === 'N1' && ['T1', 'T1a', 'T1b', 'T2', 'T2a', 'T2b', 'T3'].includes(tCat)) return 'III';
  if (tCat === 'T3' && nNorm === 'N0') return 'III';
  if (tCat.startsWith('T2') && nNorm === 'N0') return 'II';
  if (tCat.startsWith('T1') && nNorm === 'N0') return 'I';
  return null;
}

export function referenceLines(v, st) {
  if (st.stage) {
    const assumed = st.M === 'M-' ? ' (assuming cM0)' : '';
    return [`Stage group, ${st.edition} / FIGO (reference, not reported): Stage ${st.stage}${assumed}.`];
  }
  return [];
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, EXT, METS };
