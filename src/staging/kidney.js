// Renal cell carcinoma nephrectomy staging — AJCC 8th edition (Chapter 60: Kidney),
// CAP Protocol for the Examination of Resection Specimens From Patients With Invasive
// Carcinoma of Renal Tubular Origin v4.3.0.0 (Sept 2023), and WHO Classification of
// Urinary and Male Genital Tumours, 5th edition (2022).
//
// Pathological T:
//   pT0 : No evidence of primary tumour
//   pT1a: Tumour <= 40 mm in greatest dimension, limited to the kidney
//   pT1b: Tumour > 40 mm but <= 70 mm in greatest dimension, limited to the kidney
//   pT2a: Tumour > 70 mm but <= 100 mm in greatest dimension, limited to the kidney
//   pT2b: Tumour > 100 mm in greatest dimension, limited to the kidney
//   pT3a: Tumour extends into renal vein or its segmental branches, OR invades
//         pelvicalyceal system, OR invades perirenal and/or renal sinus fat
//         (but not beyond Gerota's fascia)
//   pT3b: Tumour extends into vena cava below the diaphragm
//   pT3c: Tumour extends into vena cava above the diaphragm OR invades the wall of the vena cava
//   pT4 : Tumour invades beyond Gerota's fascia (including contiguous extension into
//         the ipsilateral adrenal gland)
//
// Pathological N:
//   pN0 : No regional lymph node metastasis
//   pN1 : Metastasis in regional lymph node(s)
//   (no nodes submitted -> NX with none: true, omitted from printed pTNM)
//
// Pathological M:
//   pM1 : Distant metastasis (including non-contiguous ipsilateral adrenal gland)
//
// Stage groups (reference in Checks only):
//   Stage I  : T1 N0 M0
//   Stage II : T2 N0 M0
//   Stage III: T1-2 N1 M0, or T3 N0-1 M0
//   Stage IV : T4 Any N M0, or Any T Any N M1

export const id = 'kidney';
export const edition = 'AJCC 8th edition';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  limited: 'Limited to kidney',
  perinephric: 'Perinephric fat (not beyond Gerota\'s fascia)',
  sinus: 'Renal sinus fat',
  pelvicalyceal: 'Pelvicalyceal system',
  renalVein: 'Renal vein or its segmental branches',
  ivcBelow: 'Vena cava below diaphragm',
  ivcAboveOrWall: 'Vena cava above diaphragm or invading vena cava wall',
  beyondGerota: 'Beyond Gerota\'s fascia (including contiguous ipsilateral adrenal gland)',
  cannot: 'Cannot be assessed'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  nonContigAdrenal: 'Non-contiguous ipsilateral adrenal gland',
  contralateral: 'Contralateral kidney or adrenal gland',
  nonRegLn: 'Non-regional lymph node(s)',
  other: 'Other distant site (specify)',
  cannot: 'Cannot be determined'
};

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => [METS.nonContigAdrenal, METS.contralateral, METS.nonRegLn, METS.other].includes(x));
}

export function T(v) {
  if (v.noPrimary === true) return { cat: 'T0' };
  const ext = arr(v.extension);
  if (ext.includes(EXT.beyondGerota)) return { cat: 'T4' };
  if (ext.includes(EXT.ivcAboveOrWall)) return { cat: 'T3c' };
  if (ext.includes(EXT.ivcBelow)) return { cat: 'T3b' };
  if (ext.includes(EXT.perinephric) || ext.includes(EXT.sinus) || ext.includes(EXT.pelvicalyceal) || ext.includes(EXT.renalVein)) {
    return { cat: 'T3a' };
  }
  if (ext.includes(EXT.cannot)) {
    return { cat: 'TX', note: 'Tumour extension cannot be assessed: pT cannot be assigned.' };
  }
  const sz = num(v.sizeMm);
  if (sz === null || sz <= 0) {
    return { cat: 'TX', note: 'Greatest tumour dimension not recorded: pT1/pT2 cannot be assigned.' };
  }
  if (sz <= 40) return { cat: 'T1a' };
  if (sz <= 70) return { cat: 'T1b' };
  if (sz <= 100) return { cat: 'T2a' };
  return { cat: 'T2b' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv !== null && inv > 0) return { cat: 'N1' };
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
  if (mCat === 'M1') return 'IV';
  if (tCat === 'T4') return 'IV';
  if (/^T3[abc]$/.test(tCat)) return 'III';
  if (nCat === 'N1' && /^T[12][ab]$/.test(tCat)) return 'III';
  if (nCat === 'N0' && /^T2[ab]$/.test(tCat)) return 'II';
  if (nCat === 'N0' && /^T1[ab]$/.test(tCat)) return 'I';
  return null;
}

export function referenceLines(v, st) {
  if (st.stage) {
    const assumed = st.M === 'M-' ? ' (assuming cM0)' : '';
    return [`Stage group, AJCC 8th edition (reference, not reported): Stage ${st.stage}${assumed}.`];
  }
  return [];
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, EXT, METS };
