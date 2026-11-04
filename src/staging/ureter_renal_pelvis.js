// Renal pelvis and ureter carcinoma - pTNM on the AJCC 8th edition (Phase 83, user request 2026-11-04).
//
// AJCC has no version 9 chapter for this site: its list of current systems keeps chapter 61, Renal Pelvis and
// Ureter, on the 8th edition (https://www.facs.org/media/c5ik5tkr/ajcc-current-staging-system-2026.pdf). The
// categories below are those of CAP Ureter, Renal Pelvis 2.4.0.0 (March 2025),
// https://documents.cap.org/documents/New-Cancer-Protocols-March-2025/UreterRenalPelvis.Res_2.4.0.0.REL.CAPCP.pdf ,
// and they read the same in the ICCR dataset (2nd edition, December 2025), which stages on UICC TNM 9th edition,
// https://www.iccr-cancer.org/wp-content/uploads/2025/12/ICCR-UT-Renal-Pelvis-2nd-ed-v2.0-bookmarked.pdf .
// The stage groups follow the NCI PDQ table of the AJCC groups,
// https://www.cancer.gov/types/kidney/hp/transitional-cell-treatment-pdq , and show in Checks only.
//
// pT is the deepest extent ticked: Ta < Tis < T1 < T2 < T3 < T4. Carcinoma in situ beside a non-invasive papillary
// carcinoma stays pTa: CAP says "The suffix 'is' may be added to any T to indicate the presence of associated
// carcinoma in situ", so carcinoma in situ does not raise the category, and the optional suffix is not printed.
// pN: one involved node, 20 mm or less, is pN1; more than 20 mm, or more than one node, is pN2. With one involved
// node and no size the category cannot be chosen, so it stays pNX; the generator warns. A missing extension gives
// pTX, and the generator warns about that too.

export const id = 'ureter_renal_pelvis';
export const edition = 'AJCC 8th edition';

// The tumour extension options on the form (field `extension`), in the CAP order, with the category each names.
export const EXT = {
  Ta: 'Non-invasive papillary carcinoma',
  Tis: 'Carcinoma in situ',
  T1: 'Invades subepithelial connective tissue',
  T2: 'Invades the muscularis',
  T3pelvisFat: 'Invades beyond the muscularis into peripelvic fat',
  T3parenchyma: 'Invades the renal parenchyma',
  T3ureterFat: 'Invades beyond the muscularis into periureteric fat',
  T4kidney: 'Invades through the kidney into perinephric fat',
  T4organs: 'Invades adjacent organs (specify)',
  T0: 'No evidence of primary tumour',
  TX: 'Cannot be assessed'
};

const T_OF = {
  [EXT.Ta]: 'Ta', [EXT.Tis]: 'Tis', [EXT.T1]: 'T1', [EXT.T2]: 'T2',
  [EXT.T3pelvisFat]: 'T3', [EXT.T3parenchyma]: 'T3', [EXT.T3ureterFat]: 'T3',
  [EXT.T4kidney]: 'T4', [EXT.T4organs]: 'T4', [EXT.T0]: 'T0', [EXT.TX]: 'TX'
};

const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const num = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Every tumour on the form is staged: the CAP protocol applies to all the carcinomas it lists. */
export const staged = () => true;

/** True when carcinoma in situ is ticked beside a non-invasive papillary carcinoma (pTa, the suffix optional). */
export const cisWithTa = (v) => {
  const ext = list(v.extension);
  return ext.includes(EXT.Tis) && ext.includes(EXT.Ta) && !ext.some((e) => /^T[1-4]$/.test(T_OF[e] || ''));
};

export function T(v) {
  const cats = list(v.extension).map((e) => T_OF[e]).filter(Boolean);
  if (!cats.length) return { cat: 'TX' };
  const invasive = cats.filter((c) => /^T[1-4]$/.test(c)).map((c) => Number(c[1]));
  if (invasive.length) return { cat: `T${Math.max(...invasive)}` };
  if (cats.includes('Ta')) return { cat: 'Ta' };
  if (cats.includes('Tis')) return { cat: 'Tis' };
  if (cats.includes('T0')) return { cat: 'T0' };
  return { cat: 'TX' };
}

export function N(v) {
  const examined = num(v.nodesExamined);
  const involved = num(v.nodesInvolved);
  if (!examined && !involved) return { cat: 'NX', none: true };
  if (!involved) return { cat: 'N0' };
  if (involved >= 2) return { cat: 'N2' };
  const deposit = num(v.largestDepositMm);
  if (deposit !== null) return { cat: deposit > 20 ? 'N2' : 'N1' };
  const node = num(v.largestNodeMm);
  // A node 20 mm or less, with no extranodal extension, cannot hold a deposit larger than 20 mm, so its size
  // alone gives pN1. With extranodal extension the deposit may be larger than the node.
  if (node !== null && node <= 20 && v.ene !== 'Present') return { cat: 'N1' };
  return { cat: 'NX' };
}

export function M(v) {
  const sites = list(v.distantMets).filter((s) => !['Not applicable', 'Not identified', 'Cannot be determined'].includes(s));
  return sites.length ? { cat: 'M1' } : { cat: 'M-' };
}

export function descriptors(v) {
  const d = [];
  if (v.multiplePrimaries === true) d.push('m');
  if (v.recurrent === true) d.push('r');
  if (v.postTherapy === true) d.push('y');
  return d;
}

/** AJCC 8th edition stage group: T4 with any N, any T with N1 or N2, and M1 are stage IV. */
export function stageGroup(T, N, M) {
  if (M === 'M1' || T === 'T4' || N === 'N1' || N === 'N2') return 'IV';
  if (N !== 'N0') return '';
  return { Ta: '0a', Tis: '0is', T1: 'I', T2: 'II', T3: 'III' }[T] || '';
}

/**
 * Checks-panel reference line: the stage group, never printed in the report. `st` is the deriveTNM result (an
 * override already applied); without it the derived categories are used.
 */
export function referenceLines(v, st) {
  const t = st ? st.T : T(v).cat;
  const n = st ? st.N : N(v).cat;
  const g = st ? st.stage : stageGroup(t, n, M(v).cat);
  if (g) return [`Stage group, ${edition} (reference, not reported): ${g}`];
  const why = /X$/.test(n) || n === '' ? 'the regional node category is needed' : 'the primary tumour category is needed';
  return [`Stage group, ${edition} (reference, not reported): not assignable - ${why}`];
}
