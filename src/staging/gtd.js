// Gestational trophoblastic disease staging — AJCC 8th edition (Chapter 56) / FIGO.
// Note: AJCC 8th GTD has no regional lymph node (N) category; nodal metastasis is pM1b.
export const id = 'gtd';
export const edition = 'AJCC 8th edition';

const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  uterus: 'Limited to the uterus',
  genital: 'Other genital structures (ovary, fallopian tube, vagina, broad ligament)',
  cannot: 'Cannot be determined'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  lung: 'Lung',
  spleen: 'Spleen',
  kidney: 'Kidney',
  gi: 'Gastrointestinal tract',
  liver: 'Liver',
  brain: 'Brain',
  ln: 'Lymph node(s)',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};

const OTHER_M1 = [METS.spleen, METS.kidney, METS.gi, METS.liver, METS.brain, METS.ln, METS.other];

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => x === METS.lung || OTHER_M1.includes(x));
}

export function T(v) {
  if (v.noPrimary === true) return { cat: 'T0' };
  const ext = arr(v.extension);
  if (ext.includes(EXT.genital)) return { cat: 'T2' };
  if (ext.includes(EXT.cannot)) return { cat: 'TX', note: 'Tumour extension cannot be determined: pT cannot be assigned.' };
  return { cat: 'T1' };
}

export function N() {
  // AJCC 8th GTD has no pN category.
  return { cat: 'NX', none: true };
}

export function M(v) {
  const sites = m1Sites(v);
  if (!sites.length) return { cat: 'M-' };
  if (sites.some((x) => OTHER_M1.includes(x))) return { cat: 'M1b' };
  return { cat: 'M1a' };
}

export function descriptors(v) {
  const out = [];
  if (v.recurrent === true) out.push('r');
  if (v.postTherapy === true) out.push('y');
  return out;
}

export function stageGroup(tCat, _nCat, mCat) {
  if (mCat === 'M1b') return 'IV';
  if (mCat === 'M1a') return 'III';
  if (tCat === 'T2') return 'II';
  if (tCat === 'T1') return 'I';
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
