// Pancreatic neuroendocrine tumour staging — AJCC 9th edition.
export const id = 'pancreas_net';
export const edition = 'AJCC 9th edition';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  limited: 'Limited to the pancreas',
  cbd: 'Common bile duct',
  ampulla: 'Ampulla of Vater',
  duodenum: 'Duodenum',
  stomach: 'Stomach',
  spleen: 'Spleen',
  colon: 'Colon',
  adrenal: 'Adrenal gland',
  largeVessels: 'Wall of large vessels (coeliac axis, SMA, SMV, portal, splenic or gastroduodenal)',
  otherOrgan: 'Other adjacent organ(s) (specify)',
  cannot: 'Cannot be assessed'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  liver: 'Liver',
  nonRegLn: 'Non-regional lymph node(s)',
  lung: 'Lung',
  bone: 'Bone',
  peritoneum: 'Peritoneum',
  ovary: 'Ovary',
  other: 'Other extrahepatic site (specify)',
  cannot: 'Cannot be determined'
};

const T4_SITES = [EXT.stomach, EXT.spleen, EXT.colon, EXT.adrenal, EXT.largeVessels, EXT.otherOrgan];
const T3_SITES = [EXT.cbd, EXT.ampulla, EXT.duodenum];
const EXTRAHEPATIC_METS = [METS.nonRegLn, METS.lung, METS.bone, METS.peritoneum, METS.ovary, METS.other];

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => x === METS.liver || EXTRAHEPATIC_METS.includes(x));
}

export function T(v) {
  if (v.noPrimary === true) return { cat: 'T0' };
  const ext = arr(v.extension);
  if (ext.some((x) => T4_SITES.includes(x))) return { cat: 'T4' };
  if (ext.some((x) => T3_SITES.includes(x))) return { cat: 'T3' };
  if (ext.includes(EXT.cannot)) return { cat: 'TX', note: 'Tumour extension cannot be assessed: pT cannot be assigned.' };
  const sz = num(v.sizeMm);
  if (sz === null || sz <= 0) {
    return { cat: 'TX', note: 'Greatest tumour dimension (mm) not recorded: pT1–pT3 cannot be assigned.' };
  }
  if (sz < 20) return { cat: 'T1' };
  if (sz <= 40) return { cat: 'T2' };
  return { cat: 'T3' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv !== null && inv > 0) return { cat: 'N1' };
  return { cat: 'N0' };
}

export function M(v) {
  const sites = m1Sites(v);
  if (!sites.length) return { cat: 'M-' };
  const hasLiver = sites.includes(METS.liver);
  const hasExtra = sites.some((x) => EXTRAHEPATIC_METS.includes(x));
  if (hasLiver && hasExtra) return { cat: 'M1c' };
  if (hasExtra) return { cat: 'M1b' };
  return { cat: 'M1a' };
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
  if (nCat === 'N1') return 'III';
  if (nCat === 'N0') {
    if (tCat === 'T4') return 'III';
    if (tCat === 'T2' || tCat === 'T3') return 'II';
    if (tCat === 'T1') return 'I';
  }
  return null;
}

export function referenceLines(v, st) {
  if (st.stage) {
    const assumed = st.M === 'M-' ? ' (assuming cM0)' : '';
    return [`Stage group, AJCC 9th edition (reference, not reported): Stage ${st.stage}${assumed}.`];
  }
  return [];
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, EXT, METS };
