// Thyroid carcinoma staging module — AJCC 8th edition (Chapters 73 & 74), as used by CAP Thyroid
// protocol v4.4.0.0 (March 2023) and the QMH Endocrine-Thyroid page
// (https://awiloqmh.github.io/CancerReportingTemplate/Endocrine-Thyroid.html, saved as
// docs/reference/Endocrine-Thyroid.html).
//
// Primary tumour (pT) — identical size and gross extrathyroidal extension boundaries across
// differentiated, anaplastic and medullary thyroid carcinoma in AJCC 8th edition:
//   pT1a  <= 10 mm (1 cm), limited to the thyroid
//   pT1b  > 10 mm to <= 20 mm (2 cm), limited to the thyroid
//   pT2   > 20 mm to <= 40 mm (4 cm), limited to the thyroid
//   pT3a  > 40 mm (4 cm), limited to the thyroid
//   pT3b  gross extrathyroidal extension invading only strap muscles (any size)
//   pT4a  gross extrathyroidal extension invading subcutaneous soft tissues, larynx, trachea,
//         oesophagus or recurrent laryngeal nerve (any size)
//   pT4b  gross extrathyroidal extension invading prevertebral fascia or encasing the carotid
//         artery or mediastinal vessels (any size)
// Microscopic extrathyroidal extension (detected only on histology) does NOT upstage to pT3b in
// AJCC 8th edition; the tumour is staged by its greatest dimension.
//
// Regional lymph nodes (pN) — same across differentiated, anaplastic and medullary:
//   pN0a  >= 1 histologically confirmed benign lymph node, none involved (CAP 4.4.0.0)
//   pN1a  metastasis to level VI or VII (pretracheal, paratracheal, prelaryngeal/Delphian, or
//         superior mediastinal) lymph nodes (unilateral or bilateral)
//   pN1b  metastasis to unilateral, bilateral or contralateral lateral neck (levels I-V) or
//         retropharyngeal lymph nodes
//   pN1   regional node metastasis, compartment not specified
//   pNX   no regional lymph nodes submitted/examined (`none: true` -> omitted from printed pTNM)
//
// Low-risk follicular cell-derived neoplasms (NIFTP, FT-UMP, WDT-UMP, hyalinising trabecular
// tumour) are not staged under AJCC.
//
// Stage groups (AJCC 8th edition — shown in Checks only, never printed on the report):
//   Differentiated (PTC, IEFVPTC, FTC, oncocytic, DHGTC, PDTC):
//     Age < 55:  Stage I (M0), Stage II (M1)
//     Age >= 55: Stage I (T1-2 N0/NX M0), Stage II (T1-2 N1 M0; T3a-b Any N M0),
//                Stage III (T4a Any N M0), Stage IVA (T4b Any N M0), Stage IVB (M1)
//   Anaplastic:
//     Stage IVA (T1-3a N0/NX M0), Stage IVB (T1-3a N1 M0; T3b/T4 Any N M0), Stage IVC (M1)
//   Medullary:
//     Stage I (T1 N0 M0), Stage II (T2-3 N0 M0), Stage III (T1-3 N1a M0),
//     Stage IVA (T4a Any N M0; T1-3 N1b M0), Stage IVB (T4b Any N M0), Stage IVC (M1)

const num = (x) => {
  const n = parseFloat(String(x ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const int = (x) => {
  const n = parseInt(String(x ?? '').trim(), 10);
  return Number.isFinite(n) ? n : null;
};
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const id = 'thyroid';
export const edition = 'AJCC 8th edition';

// ---------- option strings ----------

export const ETE = {
  none: 'Not identified',
  micro: 'Microscopic only (perithyroidal soft tissue)',
  strap: 'Gross, invading only strap muscles',
  t4a: 'Gross, invading subcutaneous soft tissues, larynx, trachea, oesophagus or recurrent laryngeal nerve',
  t4b: 'Gross, invading prevertebral fascia or encasing the carotid artery or mediastinal vessels',
  cannot: 'Cannot be determined'
};

export const AGE = {
  under55: 'Under 55 years',
  ge55: '55 years or older',
  unknown: 'Not specified'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  nonRegLn: 'Non-regional lymph node(s)',
  lung: 'Lung',
  bone: 'Bone',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};
const M1_SITES = [METS.nonRegLn, METS.lung, METS.bone, METS.other];

export const LOW_RISK_TYPES = [
  'Thyroid follicular tumour of uncertain malignant potential (FT-UMP)',
  'Thyroid well-differentiated tumour of uncertain malignant potential (WDT-UMP)',
  'Hyalinising trabecular tumour',
  'Non-invasive follicular thyroid neoplasm with papillary-like nuclear features (NIFTP)',
  'Other low-risk follicular cell-derived thyroid neoplasm (specify)'
];

export const isLowRisk = (v) => LOW_RISK_TYPES.includes(v.histType || '');
export const isAnaplastic = (v) => /^Anaplastic\b/i.test(v.histType || '');
export const isMedullary = (v) => /^(?:Medullary|Other medullary|Mixed medullary)\b/i.test(v.histType || '');

/** 'low_risk' | 'anaplastic' | 'medullary' | 'differentiated' */
export function family(v) {
  if (isLowRisk(v)) return 'low_risk';
  if (isAnaplastic(v)) return 'anaplastic';
  if (isMedullary(v)) return 'medullary';
  return 'differentiated';
}

// ---------- T ----------

export function sizeMm(v) { return num(v.tumourSizeMm); }

export function T(v) {
  if (isLowRisk(v)) {
    return { cat: 'TX', note: 'Low-risk follicular cell-derived neoplasm: AJCC pTNM staging does not apply.' };
  }
  const ete = v.ete || '';
  if (ete === ETE.t4b) return { cat: 'T4b' };
  if (ete === ETE.t4a) return { cat: 'T4a' };
  if (ete === ETE.strap) return { cat: 'T3b' };
  if (ete === ETE.cannot) return { cat: 'TX', note: 'Extrathyroidal extension cannot be determined; pT cannot be assigned.' };

  const microNote = ete === ETE.micro
    ? 'Microscopic extrathyroidal extension does not upstage to pT3b in AJCC 8th edition; pT follows tumour size.'
    : '';

  const s = sizeMm(v);
  if (s === null) {
    return {
      cat: 'TX',
      note: ['Tumour size not recorded; pT cannot be assigned.', microNote].filter(Boolean).join(' ')
    };
  }
  const cat = s <= 10 ? 'T1a' : s <= 20 ? 'T1b' : s <= 40 ? 'T2' : 'T3a';
  const minNote = v.sizeAtLeast === true && cat !== 'T3a'
    ? `Tumour size is a minimum: p${cat} is the lowest category it supports.`
    : '';
  const note = [microNote, minNote].filter(Boolean).join(' ');
  return note ? { cat, note } : { cat };
}

// ---------- N ----------

/** Aggregate central (level VI/VII -> N1a), lateral/retropharyngeal (levels I-V -> N1b) and other node counts. */
export function nodeCounts(v) {
  const cEx = Math.max(0, int(v.centralExamined) || 0);
  const cInv = Math.max(0, int(v.centralInvolved) || 0);
  const lEx = Math.max(0, int(v.lateralExamined) || 0);
  const lInv = Math.max(0, int(v.lateralInvolved) || 0);
  const oEx = Math.max(0, int(v.otherNodesExamined) || 0);
  const oInv = Math.max(0, int(v.otherNodesInvolved) || 0);
  return {
    centralExamined: cEx,
    centralInvolved: cInv,
    lateralExamined: lEx,
    lateralInvolved: lInv,
    otherExamined: oEx,
    otherInvolved: oInv,
    totalExamined: cEx + lEx + oEx,
    totalInvolved: cInv + lInv + oInv
  };
}

export function N(v) {
  const c = nodeCounts(v);
  if (c.totalExamined === 0) return { cat: 'NX', none: true };
  if (c.lateralInvolved > 0) return { cat: 'N1b' };
  if (c.centralInvolved > 0) return { cat: 'N1a' };
  if (c.otherInvolved > 0) {
    return { cat: 'N1', note: 'Involved lymph nodes recorded under Other group without a central (level VI/VII) or lateral (levels I-V) compartment: assigned pN1 (subcategory cannot be determined).' };
  }
  return { cat: 'N0a' };
}

// ---------- M & descriptors ----------

export function m1Sites(v) {
  return arr(v.distantMets).filter((s) => M1_SITES.includes(s));
}

export function M(v) {
  return m1Sites(v).length ? { cat: 'M1' } : { cat: 'M-' };
}

export function descriptors(v) {
  const d = [];
  if (v.multiplePrimaries === true) d.push('m');
  if (v.recurrent === true) d.push('r');
  if (v.postTherapy === true) d.push('y');
  return d;
}

// ---------- stage groups (Checks only) ----------

const isT1 = (t) => /^T1/.test(t);
const isT2 = (t) => t === 'T2';
const isT3 = (t) => /^T3/.test(t);
const isN0 = (n) => /^N0/.test(n);
const isN1 = (n) => /^N1/.test(n);

function dtcStageForAge(Tcat, Ncat, Mcat, under55) {
  if (under55) return Mcat === 'M1' ? 'II' : 'I';
  if (Mcat === 'M1') return 'IVB';
  if (Tcat === 'T4b') return 'IVA';
  if (Tcat === 'T4a') return 'III';
  if (isT3(Tcat)) return 'II';
  if (isT1(Tcat) || isT2(Tcat)) {
    if (isN1(Ncat)) return 'II';
    if (isN0(Ncat) || Ncat === 'NX') return 'I';
  }
  return '';
}

function atcStage(Tcat, Ncat, Mcat) {
  if (Mcat === 'M1') return 'IVC';
  if (Tcat === 'T3b' || /^T4/.test(Tcat)) return 'IVB';
  if (isT1(Tcat) || isT2(Tcat) || Tcat === 'T3a') {
    if (isN1(Ncat)) return 'IVB';
    if (isN0(Ncat) || Ncat === 'NX') return 'IVA';
  }
  return '';
}

function mtcStage(Tcat, Ncat, Mcat) {
  if (Mcat === 'M1') return 'IVC';
  if (Tcat === 'T4b') return 'IVB';
  if (Tcat === 'T4a' || Ncat === 'N1b') return 'IVA';
  if ((isT1(Tcat) || isT2(Tcat) || isT3(Tcat)) && Ncat === 'N1a') return 'III';
  if ((isT2(Tcat) || isT3(Tcat)) && isN0(Ncat)) return 'II';
  if (isT1(Tcat) && isN0(Ncat)) return 'I';
  return '';
}

export function stageGroup(Tcat, Ncat, Mcat, v = {}) {
  const fam = family(v);
  if (fam === 'low_risk') return '';
  if (fam === 'anaplastic') return atcStage(Tcat, Ncat, Mcat);
  if (fam === 'medullary') return mtcStage(Tcat, Ncat, Mcat);
  if (v.patientAgeGroup === AGE.under55) return dtcStageForAge(Tcat, Ncat, Mcat, true);
  if (v.patientAgeGroup === AGE.ge55) return dtcStageForAge(Tcat, Ncat, Mcat, false);
  // Age not recorded: return both when they differ, or the shared stage when identical.
  const y = dtcStageForAge(Tcat, Ncat, Mcat, true);
  const o = dtcStageForAge(Tcat, Ncat, Mcat, false);
  if (!y && !o) return '';
  if (y === o) return y;
  return `${y} (age < 55) / ${o} (age >= 55)`;
}

/** Reference lines for the Checks panel (never printed in the report). */
export function referenceLines(v, st) {
  const fam = family(v);
  if (fam === 'low_risk') return [];
  const label = fam === 'anaplastic' ? 'Anaplastic' : fam === 'medullary' ? 'Medullary' : 'Differentiated';
  const prefix = `Stage group, ${edition} (${label}, reference, not reported):`;
  if (st.stage) {
    const assumed = st.M === 'M-' ? ' (if cM0)' : '';
    return [`${prefix} ${st.stage}${assumed}`];
  }
  if (fam === 'medullary' && st.N === 'NX' && st.T !== 'TX') {
    const ifN0 = mtcStage(st.T, 'N0', st.M);
    if (ifN0) return [`${prefix} ${ifN0} if regional lymph nodes are negative (no lymph nodes examined)`];
  }
  return [`${prefix} not assignable - primary tumour or nodal category is needed`];
}
