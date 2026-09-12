// Phyllodes tumour of the breast — pT / pN / pM as displayed on the QMH BREAST-Phyllodes page
// (AJCC 8th edition; the page lists pT1 <= 5 cm, pT2 > 5-10 cm, pT3 > 10-15 cm, pT4 > 15 cm, pN0 / pN1, pM1
// and defines no stage group). Field ids belong to schemas/phyllodes.json (size in mm).

export const id = 'phyllodes';
export const edition = 'AJCC 8th edition';

const num = (x) => { const n = parseFloat(String(x ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) ? n : 0; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export function sizeT(mm) {
  if (mm === null) return null;
  if (mm <= 50) return 'T1';
  if (mm <= 100) return 'T2';
  if (mm <= 150) return 'T3';
  return 'T4';
}

export function T(v) {
  if (/^No tumor|^No tumour/i.test(v.histType || '')) return { cat: 'T0' };
  const cat = sizeT(num(v.sizeMm));
  if (!cat) return { cat: 'TX', note: 'pTX: enter the greatest dimension (mm) to derive pT (5 / 10 / 15 cm cut-offs).' };
  return { cat };
}

export function N(v) {
  const examined = int(v.nodesExamined);
  if (examined === 0 || v.nodeSampling === 'No nodes submitted') return { cat: 'NX', note: 'pNX: no regional lymph nodes examined.' };
  return { cat: int(v.nodesPositive) > 0 ? 'N1' : 'N0' };
}

export function M(v) {
  const present = v.distantMets === 'Present' || arr(v.distantSites).length > 0;
  return { cat: present ? 'M1' : 'M-' };
}

export function descriptors(v) {
  const d = [];
  if (v.recurrent === true) d.push('r');
  return d;
}

/** The page defines no stage grouping for phyllodes tumours. */
export function stageGroup() {
  return null;
}
