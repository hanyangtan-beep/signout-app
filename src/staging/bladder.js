// Urinary bladder carcinoma cystectomy staging — AJCC 8th edition (Chapter 62: Urinary Bladder),
// CAP Protocol for the Examination of Cystectomy Specimens From Patients With Carcinoma of
// the Urinary Bladder v4.2.0.0 (June 2023), and WHO Classification of Urinary and Male
// Genital Tumours, 5th edition (2022).
//
// Pathological T:
//   pT0 : No evidence of primary tumour
//   pTa : Non-invasive papillary carcinoma
//   pTis: Urothelial carcinoma in situ: "flat tumour"
//   pT1 : Tumour invades lamina propria (subepithelial connective tissue)
//   pT2a: Tumour invades superficial muscularis propria (inner half)
//   pT2b: Tumour invades deep muscularis propria (outer half)
//   pT3a: Tumour invades perivesical soft tissue microscopically
//   pT3b: Tumour invades perivesical soft tissue macroscopically (extravesical mass)
//   pT4a: Extravesical tumour directly invades prostatic stroma (transmural from bladder,
//         NOT via prostatic urethra), seminal vesicles, uterus, or vagina
//   pT4b: Extravesical tumour invades pelvic wall or abdominal wall
//
// Pathological N:
//   pN0 : No lymph node metastasis
//   pN1 : Single regional lymph node metastasis in the true pelvis (perivesical,
//         obturator, internal/external iliac, or presacral)
//   pN2 : Multiple regional lymph node metastases in the true pelvis
//   pN3 : Lymph node metastasis to the common iliac lymph nodes
//   (no nodes submitted -> NX with none: true, omitted from printed pTNM)
//
// Pathological M:
//   pM1a: Distant metastasis limited to lymph nodes beyond the common iliacs
//   pM1b: Non-lymph node distant metastases
//
// Stage groups (reference in Checks only):
//   Stage 0a  : Ta N0 M0
//   Stage 0is : Tis N0 M0
//   Stage I   : T1 N0 M0
//   Stage II  : T2a-T2b N0 M0
//   Stage IIIA: T3a-T4a N0 M0, or T1-T4a N1 M0
//   Stage IIIB: T1-T4a N2-N3 M0
//   Stage IVA : T4b Any N M0, or Any T Any N M1a
//   Stage IVB : Any T Any N M1b

export const id = 'bladder';
export const edition = 'AJCC 8th edition';

const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  ta: 'Non-invasive papillary carcinoma (pTa)',
  tis: 'Carcinoma in situ (flat tumour, pTis)',
  t1: 'Subepithelial connective tissue / lamina propria (pT1)',
  t2a: 'Superficial muscularis propria, inner half (pT2a)',
  t2b: 'Deep muscularis propria, outer half (pT2b)',
  t3a: 'Perivesical soft tissue, microscopic (pT3a)',
  t3b: 'Perivesical soft tissue, macroscopic extravesical mass (pT3b)',
  t4a: 'Direct transmural invasion of prostatic stroma, seminal vesicles, uterus or vagina (pT4a)',
  t4b: 'Pelvic wall or abdominal wall (pT4b)',
  cannot: 'Cannot be assessed'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  nonRegLn: 'Non-regional lymph node(s) beyond common iliacs (pM1a)',
  nonLn: 'Non-lymph node distant metastasis (specify) (pM1b)',
  cannot: 'Cannot be determined'
};

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => [METS.nonRegLn, METS.nonLn].includes(x));
}

export function T(v) {
  if (v.noPrimary === true) return { cat: 'T0' };
  const ext = v.extension || '';
  if (ext === EXT.t4b) return { cat: 'T4b' };
  if (ext === EXT.t4a) return { cat: 'T4a' };
  if (ext === EXT.t3b) return { cat: 'T3b' };
  if (ext === EXT.t3a) return { cat: 'T3a' };
  if (ext === EXT.t2b) return { cat: 'T2b' };
  if (ext === EXT.t2a) return { cat: 'T2a' };
  if (ext === EXT.t1) return { cat: 'T1' };
  if (ext === EXT.tis) return { cat: 'Tis' };
  if (ext === EXT.ta) return { cat: 'Ta' };
  return { cat: 'TX', note: 'Depth of tumour invasion cannot be assessed: pT cannot be assigned.' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  const ci = int(v.commonIliacInvolved);
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if ((ci !== null && ci > 0) || v.commonIliacPositive === true) return { cat: 'N3' };
  if (inv !== null && inv >= 2) return { cat: 'N2' };
  if (inv === 1) return { cat: 'N1' };
  return { cat: 'N0' };
}

export function M(v) {
  const sites = m1Sites(v);
  if (sites.includes(METS.nonLn)) return { cat: 'M1b' };
  if (sites.includes(METS.nonRegLn)) return { cat: 'M1a' };
  return { cat: 'M-' };
}

export function descriptors(v) {
  const out = [];
  if (v.multiplePrimaries === true) out.push('m');
  if (v.recurrent === true) out.push('r');
  if (v.postTherapy === true) out.push('y');
  return out;
}

export function stageGroup(tCat, nCat, mCat) {
  if (mCat === 'M1b') return 'IVB';
  if (mCat === 'M1a' || tCat === 'T4b') return 'IVA';
  const invT = ['T1', 'T2a', 'T2b', 'T3a', 'T3b', 'T4a'].includes(tCat);
  if (invT && (nCat === 'N2' || nCat === 'N3')) return 'IIIB';
  if (invT && nCat === 'N1') return 'IIIA';
  if (nCat === 'N0') {
    if (['T3a', 'T3b', 'T4a'].includes(tCat)) return 'IIIA';
    if (['T2a', 'T2b'].includes(tCat)) return 'II';
    if (tCat === 'T1') return 'I';
    if (tCat === 'Tis') return '0is';
    if (tCat === 'Ta') return '0a';
  }
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
