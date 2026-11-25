// Extrahepatic bile duct carcinoma staging — AJCC 8th edition:
//   Chapter 25: Perihilar Bile Ducts
//   Chapter 26: Distal Bile Duct
export const id = 'bile_duct';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const isDistal = (v) => v.anatomicLocation === 'Distal extrahepatic bile duct';

export function edition(v) {
  return isDistal(v) ? 'AJCC 8th edition (Distal Bile Duct)' : 'AJCC 8th edition (Perihilar Bile Ducts)';
}

export const PERIHILAR_EXT = {
  tis: 'Carcinoma in situ / high-grade dysplasia (pTis)',
  t1: 'Confined to bile duct (up to muscle layer or fibrous tissue) (pT1)',
  t2a: 'Beyond bile duct wall into surrounding adipose tissue (pT2a)',
  t2b: 'Adjacent hepatic parenchyma (pT2b)',
  t3: 'Unilateral branches of portal vein or hepatic artery (pT3)',
  t4: 'Main portal vein / bilateral branches, common hepatic artery, or bilateral 2nd-order biliary radicals (pT4)',
  cannot: 'Cannot be assessed'
};

export const DISTAL_EXT = {
  tis: 'Carcinoma in situ / high-grade dysplasia (pTis)',
  invasive: 'Invasive carcinoma (depth of invasion determines pT1–pT3)',
  t4: 'Coeliac axis, superior mesenteric artery, and/or common hepatic artery (pT4)',
  cannot: 'Cannot be assessed'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  nonRegLn: 'Non-regional lymph node(s)',
  liver: 'Liver (non-contiguous)',
  peritoneum: 'Peritoneum',
  other: 'Other distant site (specify)',
  cannot: 'Cannot be determined'
};

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => [METS.nonRegLn, METS.liver, METS.peritoneum, METS.other].includes(x));
}

export function T(v) {
  if (v.noPrimary === true) return { cat: 'T0' };
  if (isDistal(v)) {
    const ext = v.distalExtension || '';
    if (ext === DISTAL_EXT.t4) return { cat: 'T4' };
    if (ext === DISTAL_EXT.tis) return { cat: 'Tis' };
    if (ext === DISTAL_EXT.cannot) return { cat: 'TX', note: 'Distal bile duct tumour extent cannot be assessed: pT cannot be assigned.' };
    const d = num(v.invasionDepthMm);
    if (d === null || d <= 0) {
      return { cat: 'TX', note: 'Depth of invasion (mm) not recorded for distal bile duct carcinoma: pT1–pT3 cannot be assigned.' };
    }
    if (d < 5) return { cat: 'T1' };
    if (d <= 12) return { cat: 'T2' };
    return { cat: 'T3' };
  }
  const ext = v.perihilarExtension || '';
  if (ext === PERIHILAR_EXT.t4) return { cat: 'T4' };
  if (ext === PERIHILAR_EXT.t3) return { cat: 'T3' };
  if (ext === PERIHILAR_EXT.t2b) return { cat: 'T2b' };
  if (ext === PERIHILAR_EXT.t2a) return { cat: 'T2a' };
  if (ext === PERIHILAR_EXT.t1) return { cat: 'T1' };
  if (ext === PERIHILAR_EXT.tis) return { cat: 'Tis' };
  return { cat: 'TX', note: 'Perihilar bile duct tumour extent cannot be assessed: pT cannot be assigned.' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv !== null && inv >= 4) return { cat: 'N2' };
  if (inv !== null && inv >= 1) return { cat: 'N1' };
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

export function stageGroup(tCat, nCat, mCat, values = {}) {
  if (isDistal(values)) {
    if (mCat === 'M1') return 'IV';
    if (tCat === 'T4') return 'IIIB';
    if (nCat === 'N2' && ['T1', 'T2', 'T3'].includes(tCat)) return 'IIIA';
    if ((tCat === 'T3' && (nCat === 'N0' || nCat === 'N1')) || (tCat === 'T2' && nCat === 'N1')) return 'IIB';
    if ((tCat === 'T2' && nCat === 'N0') || (tCat === 'T1' && nCat === 'N1')) return 'IIA';
    if (tCat === 'T1' && nCat === 'N0') return 'I';
    if (tCat === 'Tis' && nCat === 'N0') return '0';
    return null;
  }
  if (mCat === 'M1') return 'IVB';
  if (nCat === 'N2') return 'IVA';
  if (nCat === 'N1') return 'IIIC';
  if (nCat === 'N0') {
    if (tCat === 'T4') return 'IIIB';
    if (tCat === 'T3') return 'IIIA';
    if (tCat === 'T2a' || tCat === 'T2b') return 'II';
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

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, isDistal, PERIHILAR_EXT, DISTAL_EXT, METS };
