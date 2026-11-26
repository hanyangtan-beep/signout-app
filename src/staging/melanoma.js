// Cutaneous melanoma staging — AJCC 8th edition (QMH Skin-Melanoma).
// Breslow thickness 0.8 mm threshold for pT1a vs pT1b; ulceration splits a/b; microsatellites/satellites/in-transit -> pN1c/pN2c/pN3c.
export const id = 'melanoma';
export const edition = 'AJCC 8th edition';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  m1a: 'Distant skin, soft tissue (including muscle), and/or non-regional lymph node (pM1a)',
  m1b: 'Lung metastasis with or without M1a sites (pM1b)',
  m1c: 'Non-CNS visceral sites with or without M1a/M1b sites (pM1c)',
  m1d: 'Central nervous system (CNS) metastasis (pM1d)',
  cannot: 'Cannot be determined'
};

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => [METS.m1a, METS.m1b, METS.m1c, METS.m1d].includes(x));
}

export function T(v) {
  if (v.inSituOnly === true || /in situ/i.test(v.histType || '')) return { cat: 'Tis' };
  if (v.noPrimary === true) return { cat: 'T0' };
  const raw = num(v.breslowMm);
  if (raw === null || raw <= 0) return { cat: 'TX', note: 'Breslow thickness (mm) not recorded: pT1–pT4 cannot be assigned.' };
  // AJCC 8th rounds Breslow to nearest 0.1 mm
  const b = Math.round(raw * 10) / 10;
  const ulc = /^Present/i.test(v.ulceration || '');
  if (b > 4.0) return { cat: ulc ? 'T4b' : 'T4a' };
  if (b > 2.0) return { cat: ulc ? 'T3b' : 'T3a' };
  if (b > 1.0) return { cat: ulc ? 'T2b' : 'T2a' };
  if (b >= 0.8 || ulc) return { cat: 'T1b' };
  return { cat: 'T1a' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  const sat = /^Present/i.test(v.microsatellites || '');
  if ((ex === null || ex <= 0) && !sat) return { cat: 'NX', none: true };
  const sfx = v.nodeSuffix === '(sn) Sentinel node' ? '(sn)' : '';
  if (sat) {
    if (inv === 0) return { cat: `N1c${sfx}` };
    if (inv === 1) return { cat: `N2c${sfx}` };
    return { cat: `N3c${sfx}` };
  }
  if (inv <= 0) return { cat: `N0${sfx}` };
  const clin = /clinically detected|macroscopic/i.test(v.nodeDetection || '');
  if (inv === 1) return { cat: `${clin ? 'N1b' : 'N1a'}${sfx}` };
  if (inv <= 3) return { cat: `${clin ? 'N2b' : 'N2a'}${sfx}` };
  return { cat: `${clin ? 'N3b' : 'N3a'}${sfx}` };
}

export function M(v) {
  const sites = m1Sites(v);
  if (!sites.length) return { cat: 'M-' };
  if (sites.includes(METS.m1d)) return { cat: 'M1d' };
  if (sites.includes(METS.m1c)) return { cat: 'M1c' };
  if (sites.includes(METS.m1b)) return { cat: 'M1b' };
  return { cat: 'M1a' };
}

export function descriptors(v) {
  const out = [];
  if (v.multiplePrimaries === true) out.push('m');
  if (v.recurrent === true) out.push('r');
  if (v.postTherapy === true) out.push('y');
  return out;
}

const base = (c) => String(c || '').replace(/\(sn\)$/, '');

export function stageGroup(tCat, nCat, mCat) {
  if (mCat && mCat.startsWith('M1')) return 'IV';
  const n = base(nCat);
  if (n === 'N0') {
    if (tCat === 'Tis') return '0';
    if (tCat === 'T1a' || tCat === 'T1b') return 'IA';
    if (tCat === 'T2a') return 'IB';
    if (tCat === 'T2b' || tCat === 'T3a') return 'IIA';
    if (tCat === 'T3b' || tCat === 'T4a') return 'IIB';
    if (tCat === 'T4b') return 'IIC';
  }
  if (['N1a', 'N2a'].includes(n) && ['T1a', 'T1b', 'T2a'].includes(tCat)) return 'IIIA';
  if (['N3a', 'N3b', 'N3c'].includes(n) && tCat === 'T4b') return 'IIID';
  if (['N1a', 'N1b', 'N1c', 'N2a', 'N2b', 'N2c', 'N3a', 'N3b', 'N3c'].includes(n)) {
    if (tCat === 'T4b' || ['N3a', 'N3b', 'N3c'].includes(n)) return 'IIIC';
    return 'IIIB';
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

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, METS };
