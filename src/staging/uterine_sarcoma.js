// Uterine sarcoma staging — AJCC 8th edition (Chapter 54) and FIGO 2009.
// Two pT tracks: "All sarcoma" (LMS, ESS, UUS, RMS, PEComa) vs "Adenosarcoma".
export const id = 'uterine_sarcoma';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const isAdenosarcoma = (v) => /adenosarcoma/i.test(v?.histType || '');

export function edition(v) {
  return isAdenosarcoma(v) ? 'AJCC 8th edition (Adenosarcoma)' : 'AJCC 8th edition (Uterine sarcoma)';
}

export const EXT = {
  limited: 'Limited to uterus',
  adnexa: 'Adnexa (ovary / fallopian tube)',
  pelvicTissue: 'Other extrauterine pelvic tissue (parametrium / vagina / pelvic wall)',
  abdOne: 'Abdominal tissues (1 site)',
  abdMulti: 'Abdominal tissues (> 1 site)',
  bladderRectum: 'Bladder and/or rectal mucosa',
  cannot: 'Cannot be determined'
};

export const MYO = {
  na: 'Not applicable',
  none: 'Not identified (limited to endometrium / endocervix)',
  lt50: 'Less than 50% myometrial invasion',
  ge50: '50% or more myometrial invasion',
  cannot: 'Cannot be assessed'
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
  if (v.noPrimary === true) return { cat: 'T0' };
  const ext = arr(v.extension);
  if (ext.includes(EXT.bladderRectum)) return { cat: 'T4' };
  if (ext.includes(EXT.abdMulti)) return { cat: 'T3b' };
  if (ext.includes(EXT.abdOne)) return { cat: 'T3a' };
  if (ext.includes(EXT.pelvicTissue)) return { cat: 'T2b' };
  if (ext.includes(EXT.adnexa)) return { cat: 'T2a' };
  if (ext.includes(EXT.cannot)) return { cat: 'TX', note: 'Extrauterine extension cannot be determined: pT cannot be assigned.' };

  if (isAdenosarcoma(v)) {
    const myo = v.myometrialInvasion || '';
    if (myo === MYO.none) return { cat: 'T1a' };
    if (myo === MYO.lt50) return { cat: 'T1b' };
    if (myo === MYO.ge50) return { cat: 'T1c' };
    return { cat: 'T1', note: 'Myometrial invasion depth not recorded: adenosarcoma pT1a–pT1c cannot be assigned.' };
  }

  const sz = num(v.sizeMm);
  if (sz === null || sz <= 0) {
    return { cat: 'T1', note: 'Greatest tumour dimension (mm) not recorded: uterine sarcoma pT1a vs pT1b cannot be assigned.' };
  }
  return { cat: sz <= 50 ? 'T1a' : 'T1b' };
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
  if (v.recurrent === true) out.push('r');
  if (v.postTherapy === true) out.push('y');
  return out;
}

export function stageGroup(tCat, nCat, mCat) {
  if (mCat === 'M1') return 'IVB';
  if (tCat === 'T4') return 'IVA';
  if (nCat === 'N1') return 'IIIC';
  const nNorm = nCat === 'N0(i+)' ? 'N0' : nCat;
  if (nNorm === 'N0' || nCat === 'NX') {
    if (tCat === 'T3b') return 'IIIB';
    if (tCat === 'T3a') return 'IIIA';
    if (tCat === 'T2b') return 'IIB';
    if (tCat === 'T2a') return 'IIA';
    if (tCat === 'T1c') return 'IC';
    if (tCat === 'T1b') return 'IB';
    if (tCat === 'T1a') return 'IA';
    if (tCat === 'T1') return 'I';
  }
  return null;
}

export function referenceLines(v, st) {
  if (st.stage) {
    const assumed = st.M === 'M-' ? ' (assuming cM0)' : '';
    return [`Stage group, ${st.edition} / FIGO (reference, not reported): Stage ${st.stage}${assumed}.`];
  }
  return [];
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, isAdenosarcoma, EXT, MYO, METS };
