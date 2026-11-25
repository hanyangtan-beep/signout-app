// Bone tumour resection staging — AJCC 8th edition (Chapter 38: Bone),
// CAP Protocol for the Examination of Resection Specimens From Patients With Primary Tumors of Bone
// v4.2.0.0 (June 2024), and WHO Classification of Soft Tissue and Bone Tumours, 5th edition (2020).
//
// Three anatomical site tables for pT:
//   1. Appendicular skeleton, trunk, skull, and facial bones:
//        T1 <= 80 mm, T2 > 80 mm, T3 discontinuous tumours in primary bone site
//   2. Spine:
//        T1 1 or 2 adjacent vertebral segments; T2 3 adjacent segments;
//        T3 >= 4 adjacent or any nonadjacent segments;
//        T4a spinal canal; T4b gross vascular invasion / tumour thrombus in great vessels
//   3. Pelvis:
//        T1 (a <= 80 mm / b > 80 mm): 1 pelvic segment, no extraosseous extension
//        T2 (a <= 80 mm / b > 80 mm): 1 segment with extraosseous extension OR 2 segments without
//        T3 (a <= 80 mm / b > 80 mm): 2 segments with extraosseous extension
//        T4a: involves sacroiliac joint and extends medial to sacral neuroforamen
//        T4b: encasement of external iliac vessels or gross tumour thrombus in major pelvic vessels
//        T4: spans 3 pelvic segments or crosses SI joint (subcategory cannot be determined)
//
// Prognostic stage groups (Checks only, never printed):
//   AJCC 8th edition defines stage groups ONLY for Appendicular skeleton, trunk, skull, and facial
//   bones (IA, IB, IIA, IIB, III, IVA, IVB). No AJCC 8th stage groups exist for Spine or Pelvis.

export const id = 'bone';
export const edition = 'AJCC 8th edition';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const SITE = {
  appendicular: 'Appendicular skeleton, trunk, skull, and facial bones',
  spine: 'Spine',
  pelvis: 'Pelvis',
  notSpecified: 'Not specified'
};

export const SPINE_EXTENT = {
  t1: 'Confined to 1 vertebral segment or 2 adjacent vertebral segments',
  t2: 'Confined to 3 adjacent vertebral segments',
  t3: 'Confined to 4 or more adjacent vertebral segments, or any nonadjacent vertebral segments',
  t4a: 'Extension into the spinal canal',
  t4b: 'Gross vascular invasion or tumour thrombus in the great vessels',
  t4: 'Extension into the spinal canal or great vessels (subcategory cannot be determined)'
};

export const PELVIS_EXTENT = {
  t1: 'Confined to 1 pelvic segment with no extraosseous extension',
  t2: 'Confined to 1 pelvic segment with extraosseous extension, or 2 segments without extraosseous extension',
  t3: 'Spans 2 pelvic segments with extraosseous extension',
  t4a: 'Involves sacroiliac joint and extends medial to the sacral neuroforamen',
  t4b: 'Encasement of external iliac vessels or gross tumour thrombus in major pelvic vessels',
  t4: 'Spans 3 pelvic segments or crosses the sacroiliac joint (subcategory cannot be determined)'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  lung: 'Lung',
  bone: 'Bone',
  nonRegLn: 'Non-regional lymph node(s)',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};

// Benign / locally aggressive bone neoplasms listed in CAP Bone 4.2.0.0 that are NOT staged by AJCC pTNM.
export const NOT_STAGED_TYPES = new Set([
  'Synovial chondromatosis',
  'Osteoblastoma',
  'Giant cell tumour of bone',
  'Desmoplastic fibroma',
  'Epithelioid haemangioma',
  'Langerhans cell histiocytosis'
]);

export const isNotStaged = (v) => NOT_STAGED_TYPES.has(v.histType || '');

export function gradeCode(v) {
  const g = v.histGrade || '';
  if (/^G1\b/.test(g)) return 'G1';
  if (/^G2\b/.test(g)) return 'G2';
  if (/^G3\b/.test(g)) return 'G3';
  if (/^GX\b/.test(g)) return 'GX';
  return '';
}

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => [METS.lung, METS.bone, METS.nonRegLn, METS.other].includes(x));
}

export function T(v) {
  if (v.noPrimary === true) return { cat: 'T0' };
  const sg = v.siteGroup || '';
  const size = num(v.tumourSizeMm);

  if (sg === SITE.spine) {
    const ext = v.spineExtent || '';
    if (ext === SPINE_EXTENT.t4b) return { cat: 'T4b' };
    if (ext === SPINE_EXTENT.t4a) return { cat: 'T4a' };
    if (ext === SPINE_EXTENT.t4) return { cat: 'T4' };
    if (ext === SPINE_EXTENT.t3) return { cat: 'T3' };
    if (ext === SPINE_EXTENT.t2) return { cat: 'T2' };
    if (ext === SPINE_EXTENT.t1) return { cat: 'T1' };
    return { cat: 'TX', note: 'Spine pT requires vertebral segment involvement / spinal canal or great vessel extension.' };
  }

  if (sg === SITE.pelvis) {
    const ext = v.pelvisExtent || '';
    if (ext === PELVIS_EXTENT.t4b) return { cat: 'T4b' };
    if (ext === PELVIS_EXTENT.t4a) return { cat: 'T4a' };
    if (ext === PELVIS_EXTENT.t4) return { cat: 'T4' };
    const sub = (base) => {
      if (size === null) return { cat: base, note: `Pelvis ${base} subcategory (a <= 80 mm vs b > 80 mm) requires tumour greatest dimension.` };
      return { cat: size <= 80 ? `${base}a` : `${base}b` };
    };
    if (ext === PELVIS_EXTENT.t3) return sub('T3');
    if (ext === PELVIS_EXTENT.t2) return sub('T2');
    if (ext === PELVIS_EXTENT.t1) return sub('T1');
    return { cat: 'TX', note: 'Pelvis pT requires pelvic segment involvement and extraosseous extension.' };
  }

  if (sg === SITE.appendicular) {
    if (v.discontinuous === true) return { cat: 'T3' };
    if (size === null) return { cat: 'TX', note: 'Tumour greatest dimension not recorded: appendicular/trunk/skull pT1 (<= 80 mm) vs pT2 (> 80 mm) cannot be assigned.' };
    if (size <= 0) return { cat: 'T0' };
    return { cat: size <= 80 ? 'T1' : 'T2' };
  }

  return { cat: 'TX', note: 'AJCC anatomical site group not selected: pT cannot be assigned.' };
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
  const nonLung = sites.some((s) => s !== METS.lung);
  return { cat: nonLung ? 'M1b' : 'M1a' };
}

export function descriptors(v) {
  const out = [];
  if (v.multiplePrimaries === true) out.push('m');
  if (v.recurrent === true) out.push('r');
  const pre = arr(v.preresection);
  const hadTherapy = pre.some((x) => [
    'Chemotherapy performed',
    'Radiation therapy performed',
    'Therapy performed, type not specified'
  ].includes(x));
  if (hadTherapy || v.postTherapy === true) out.push('y');
  return out;
}

export function stageGroup(tCat, nCat, mCat, v = {}) {
  if (isNotStaged(v)) return null;
  if (v.siteGroup !== SITE.appendicular) return null;

  // Stage IVB: any N1, or M1b (non-lung distant metastasis)
  if (nCat === 'N1' || mCat === 'M1b') return 'IVB';
  // Stage IVA: M1a (lung only) with N0 (or NX assumed cN0)
  if (mCat === 'M1a') return 'IVA';

  // M0 (or M- assumed cM0), N0 (or NX assumed cN0)
  if (tCat === 'TX' || tCat === 'T0') return null;
  const g = gradeCode(v);
  const low = g === 'G1' || g === 'GX' || !g;
  const high = g === 'G2' || g === 'G3';

  if (low) {
    if (tCat === 'T1') return 'IA';
    if (tCat === 'T2' || tCat === 'T3') return 'IB';
  }
  if (high) {
    if (tCat === 'T1') return 'IIA';
    if (tCat === 'T2') return 'IIB';
    if (tCat === 'T3') return 'III';
  }
  return null;
}

export function referenceLines(v, st) {
  if (isNotStaged(v)) {
    return ['Non-sarcomatous / locally aggressive bone neoplasm: AJCC 8th edition pTNM does not apply and is not printed.'];
  }
  if (v.siteGroup === SITE.spine || v.siteGroup === SITE.pelvis) {
    return [`AJCC 8th edition defines no prognostic stage groups for primary bone sarcomas of the ${v.siteGroup.toLowerCase()}.`];
  }
  if (!st.stage) return [];
  const caveats = [];
  if (st.noNodes) caveats.push('assuming cN0');
  if (st.M === 'M-') caveats.push('assuming cM0');
  const g = gradeCode(v);
  if (!g || g === 'GX') caveats.push('grade unstated/GX treated as low grade per AJCC 8th');
  const suffix = caveats.length ? ` (${caveats.join(', ')})` : '';
  return [`Stage group, AJCC 8th edition (reference, not reported): Stage ${st.stage}${suffix}.`];
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, SITE, SPINE_EXTENT, PELVIS_EXTENT, METS, NOT_STAGED_TYPES, isNotStaged, gradeCode, m1Sites };
