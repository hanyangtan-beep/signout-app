// Colon and rectum carcinoma — AJCC 8th edition (CAP Colon and Rectum Resection 4.4.0.1).
// Field values referenced here belong to the colon_resection schema.

export const id = 'colorectal';
export const edition = 'AJCC 8th edition';

export const EXTENSION_TO_T = {
  'No evidence of primary tumour': 'T0',
  'No invasion (high grade dysplasia)': 'Tis',
  'Invades lamina propria / muscularis mucosae (intramucosal carcinoma)': 'Tis',
  'Invades submucosa': 'T1',
  'Invades muscularis propria': 'T2',
  'Invades through muscularis propria into pericolorectal tissue': 'T3',
  'Invades visceral peritoneum (including through inflammation to the serosal surface)': 'T4a',
  'Directly invades or adheres to adjacent structure(s)': 'T4b',
  'Cannot be assessed': 'TX'
};

export function T(v) {
  const cat = EXTENSION_TO_T[v.tumourExtension];
  if (!cat) return { cat: 'TX', note: 'Tumour extension not recorded; pT cannot be assigned.' };
  if (cat === 'T0' && v.treatmentEffect && v.treatmentEffect !== 'No known presurgical therapy') return { cat, note: 'No residual primary tumour after therapy (ypT0).' };
  return { cat };
}

const int = (x) => { const n = parseInt(x, 10); return Number.isFinite(n) ? n : null; };

export function N(v) {
  const examined = int(v.nodesExamined);
  const positive = int(v.nodesPositive);
  const deposits = v.tumourDeposits === 'Present';
  if (examined === null || examined === 0) {
    if (deposits) return { cat: 'N1c', note: 'Tumour deposits with no lymph nodes examined: pN1c.' };
    return { cat: 'NX', none: true, note: 'No regional lymph nodes examined; pN cannot be assigned.' };
  }
  if (positive === null) return { cat: 'NX', note: 'Number of involved nodes not recorded; pN cannot be assigned.' };
  if (positive === 0) return deposits ? { cat: 'N1c' } : { cat: 'N0' };
  if (positive === 1) return { cat: 'N1a' };
  if (positive <= 3) return { cat: 'N1b' };
  if (positive <= 6) return { cat: 'N2a' };
  return { cat: 'N2b' };
}

export const METASTASIS_SITES = ['Non-regional lymph node(s)', 'Liver', 'Peritoneum', 'Other site'];

export function M(v) {
  const sites = Array.isArray(v.distantMetastasis) ? v.distantMetastasis.filter((s) => METASTASIS_SITES.includes(s)) : [];
  if (sites.length === 0) return { cat: 'M-' };
  if (sites.includes('Peritoneum')) return { cat: 'M1c' };
  if (sites.length === 1) return { cat: 'M1a' };
  return { cat: 'M1b' };
}

export function descriptors(v) {
  const d = [];
  if ((v.multiplePrimary || '') === 'Present') d.push('m');
  if (v.recurrent === true) d.push('r');
  if (v.treatmentEffect && v.treatmentEffect !== 'No known presurgical therapy' && v.treatmentEffect !== 'Cannot be determined') d.push('y');
  return d;
}

const T_RANK = { Tis: 0, T1: 1, T2: 2, T3: 3, T4a: 4, T4b: 5 };

/** AJCC 8th edition anatomic stage / prognostic groups for colorectal carcinoma. */
export function stageGroup(T, N, M) {
  if (M === 'M1a') return 'IVA';
  if (M === 'M1b') return 'IVB';
  if (M === 'M1c') return 'IVC';
  if (M === 'M1') return 'IV';
  if (T === 'TX' || N === 'NX' || T === 'T0') return null;
  const t = T_RANK[T];
  if (t === undefined) return null;
  if (N === 'N0') {
    if (T === 'Tis') return '0';
    if (t <= 2) return 'I';
    if (T === 'T3') return 'IIA';
    if (T === 'T4a') return 'IIB';
    return 'IIC';
  }
  if (T === 'Tis') return null;
  const n1 = N === 'N1' || N === 'N1a' || N === 'N1b' || N === 'N1c';
  if (n1) {
    if (t <= 2) return 'IIIA';
    if (T === 'T3' || T === 'T4a') return 'IIIB';
    return 'IIIC';
  }
  if (N === 'N2a') {
    if (T === 'T1') return 'IIIA';
    if (T === 'T2' || T === 'T3') return 'IIIB';
    return 'IIIC';
  }
  if (N === 'N2b' || N === 'N2') {
    if (t <= 2) return 'IIIB';
    return 'IIIC';
  }
  return null;
}
