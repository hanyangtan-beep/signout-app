// Cutaneous squamous cell carcinoma — two staging systems, picked by the tumour site.
//
// Head and neck: AJCC 8th edition, cutaneous squamous cell carcinoma of the head and neck
// (chapter 15), as listed on the QMH "HN-Skin SCC" page, which follows the CAP Cutaneous Carcinoma
// of the Head and Neck protocol v1.2.0.0
// (https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf).
// AJCC 8th includes the lip (cutaneous and dry vermilion) and the oral commissure; the wet mucosa
// is oral cavity. UICC 8th sends the vermilion to the lip and oral cavity chapter (RCPath dataset 5.1);
// "Lip" here follows AJCC, the system used for head and neck sites.
//   pT1  <= 20 mm; pT2 > 20 to 40 mm; pT3 > 40 mm, or minor bone erosion, qualifying perineural
//   invasion or deep invasion; pT4a gross cortical bone or marrow invasion; pT4b skull base
//   invasion or skull base foramen involvement. pN is the ENE table in ./hn_nodes.js.
//
// Trunk and limbs: UICC TNM 8th edition, carcinoma of the skin, as set out in Appendix A of the
// RCPath dataset for primary invasive cutaneous SCC (v4, February 2019)
// (https://www.rcpath.org/static/9c1d8f71-5d3b-4508-8e6200f11e1f4a39/Dataset-for-histopathological-reporting-of-primary-invasive-cutaneous-squamous-cell-carcinoma-and-regional-lymph-nodes.pdf).
//   The same pT1 to pT4a; pT4b axial skeleton, skull base or foraminal invasion.
//   pN1 single ipsilateral node <= 30 mm; pN2 single ipsilateral node > 30 to 60 mm, or multiple
//   ipsilateral nodes none > 60 mm; pN3 a node > 60 mm. No ENE term. "A contralateral nodal
//   metastasis (unlike with skin carcinoma of head and neck) represents a distant metastasis."
//
// Shared definitions (both systems):
//   Deep invasion: beyond the subcutaneous fat (fascia, muscle, perichondrium, periosteum) or
//   thickness > 6 mm from the granular layer of the adjacent normal epidermis to the deepest
//   point of the tumour (CAP; RCPath).
//   Qualifying perineural invasion: tumour in the nerve sheath of a nerve 0.1 mm or more in
//   calibre or lying deeper than the dermis. That is AJCC 8th's wording; UICC 8th names only a
//   named nerve, and RCPath extends it to the same rule, so both systems apply it here.
//   Size is the clinical dimension, but the pathological (usually macroscopic) dimension may be
//   used when the clinical one is not available (RCPath Appendix A) — hence sizeMm() falling back
//   to the macroscopic lesion size.
//   The pN size is that of the largest metastatic deposit, not of the node (RCPath 5.3).
//
// Not staged here: eyelid carcinoma (its own AJCC chapter) and perianal skin within 5 cm of the
// anal margin (anal chapter); vulval and penile skin go to their own templates. The QMH page
// prints no stage group, so stageGroup() returns null.
//
// The Brigham and Women's Hospital (BWH) class, verbatim from the CAP protocol: T0 in situ SCC;
// T1 0 high-risk factors; T2a 1; T2b 2-3; T3 4 factors or bone invasion. Factors: clinical
// diameter >= 2 cm; invasion beyond the subcutaneous fat, excluding bone invasion; poorly
// differentiated histology; perineural invasion of nerve(s) >= 0.1 mm in calibre. G4
// (undifferentiated) counts with G3, and a nerve deeper than the dermis counts as >= 0.1 mm, as it
// does for pT.

import { pathologicalN } from './hn_nodes.js';

const num = (x) => {
  const n = parseFloat(String(x ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const int = (x) => { const n = num(x); return n === null ? null : Math.round(n); };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));

export const id = 'skin_scc';

// ---------- sites and regions ----------

export const SITE_GROUPS = [
  { label: 'Head and neck', region: 'hn', options: ['Scalp', 'Forehead', 'Temple', 'Eyebrow', 'Nose', 'Cheek', 'Ear', 'Preauricular', 'Postauricular', 'Lip', 'Oral commissure', 'Chin', 'Jaw', 'Neck'] },
  { label: 'Trunk and limbs', region: 'trunk', options: ['Shoulder', 'Upper arm', 'Elbow', 'Forearm', 'Wrist', 'Hand', 'Finger', 'Chest', 'Abdomen', 'Back', 'Buttock', 'Groin', 'Thigh', 'Knee', 'Lower leg', 'Ankle', 'Foot', 'Toe'] },
  { label: 'Not staged here (own chapter)', region: 'none', options: ['Eyelid', 'Perianal skin (within 5 cm of the anal margin)'] },
  { label: 'Other', region: '', options: ['Other (specify)', 'Not specified'] }
];

export const SITE_OPTIONS = SITE_GROUPS.flatMap((g) => g.options);

export const REGION_OPTIONS = ['Head and neck', 'Trunk and limbs', 'Not staged here (eyelid, perianal, vulval or penile skin)'];
const REGION_BY_OPTION = { [REGION_OPTIONS[0]]: 'hn', [REGION_OPTIONS[1]]: 'trunk', [REGION_OPTIONS[2]]: 'none' };

/** 'hn' | 'trunk' | 'none' (own chapter, no pTNM) | '' (not recorded). */
export function region(v) {
  const s = v.tumourSite || '';
  const g = SITE_GROUPS.find((x) => x.region && x.options.includes(s));
  if (g) return g.region;
  return REGION_BY_OPTION[v.siteRegion] || '';
}

export const EDITIONS = { hn: 'AJCC 8th edition', trunk: 'UICC 8th edition' };

export const edition = (v) => EDITIONS[region(v)] || '';

// ---------- the option strings the rules read ----------

export const PNI = {
  none: 'Not identified',
  unstated: 'Present',
  small: 'Present, less than 0.1 mm in calibre',
  large: 'Present, 0.1 mm or more in calibre',
  deep: 'Present, in a nerve deeper than the dermis',
  cannot: 'Cannot be determined'
};
export const PNI_OPTIONS = [PNI.none, PNI.unstated, PNI.small, PNI.large, PNI.deep, PNI.cannot];

export const BONE = {
  na: 'Not applicable',
  none: 'Not identified',
  minor: 'Minor bone erosion',
  gross: 'Gross cortical bone or marrow invasion',
  base: 'Skull base or axial skeleton invasion, or foraminal involvement',
  cannot: 'Cannot be determined'
};
export const BONE_OPTIONS = [BONE.na, BONE.none, BONE.minor, BONE.gross, BONE.base, BONE.cannot];

export const DOI = { na: 'Not applicable', mm: 'Specify depth (mm)', least: 'At least (mm)', cannot: 'Cannot be determined (explain)' };
export const DOI_OPTIONS = [DOI.na, DOI.mm, DOI.least, DOI.cannot];

export const BEYOND_FAT = { none: 'Not identified', present: 'Present (specify)', cannot: 'Cannot be determined' };

export const LEVEL_IN_SITU = 'I (carcinoma in situ)';

export const NODE_LATERALITY = { ipsi: 'Ipsilateral (including midline)', contra: 'Contralateral', bi: 'Bilateral', cannot: 'Cannot be determined' };

export const DISTANT_M1 = /^(Bone|Brain|Lung|Liver|Other)/;

export const BWH_OPTIONS = [
  'Derived from the recorded factors',
  'T1: 0 high-risk factors',
  'T2a: 1 high-risk factor',
  'T2b: 2-3 high-risk factors',
  'T3: 4 high-risk factors or bone invasion'
];

// ---------- measured values ----------

/** Greatest tumour dimension in mm: the synoptic field, else the largest macroscopic lesion dimension (cm). */
export function sizeMm(v) {
  const typed = num(v.tumourSizeMm);
  if (typed !== null) return typed;
  const dims = String(v.lesionSize || '').match(/\d+(?:\.\d+)?/g);
  if (!dims) return null;
  return Math.round(Math.max(...dims.map(Number)) * 100) / 10;
}

export const sizeFromMacro = (v) => num(v.tumourSizeMm) === null && sizeMm(v) !== null;

/** Depth in mm when it can stage: a measured depth, or an "at least" depth. */
function depthMm(v) {
  const mode = v.doi || DOI.mm;
  if (mode !== DOI.mm && mode !== DOI.least) return null;
  return num(v.doiMm);
}

export const qualifyingPni = (v) => v.pni === PNI.large || v.pni === PNI.deep;
export const beyondFat = (v) => v.beyondFat === BEYOND_FAT.present;
export const anyBone = (v) => [BONE.minor, BONE.gross, BONE.base].includes(v.boneInvasion);

/** The pT3 criteria present, as short phrases (size aside). */
export function t3Factors(v) {
  const f = [];
  if (v.boneInvasion === BONE.minor) f.push('minor bone erosion');
  if (qualifyingPni(v)) f.push(v.pni === PNI.deep ? 'perineural invasion in a nerve deeper than the dermis' : 'perineural invasion of a nerve 0.1 mm or more in calibre');
  const d = depthMm(v);
  if (d !== null && d > 6) f.push(`depth of invasion ${fmt(d)} mm${v.doi === DOI.least ? ' or more' : ''}`);
  if (beyondFat(v)) f.push('invasion beyond the subcutaneous fat');
  return f;
}

// ---------- T, N, M ----------

export function T(v) {
  const r = region(v);
  if (r === 'none') return { cat: 'TX', note: 'Eyelid and perianal skin are staged in their own chapters; no pTNM is assigned here.' };
  if (r === '') return { cat: 'TX', note: 'Tumour site not recorded; the staging system (AJCC 8th head and neck, UICC 8th trunk and limbs) cannot be chosen.' };
  if (v.anatomicLevel === LEVEL_IN_SITU) return { cat: 'Tis' };
  if (v.boneInvasion === BONE.base) return { cat: 'T4b' };
  if (v.boneInvasion === BONE.gross) return { cat: 'T4a' };
  const size = sizeMm(v);
  if ((size !== null && size > 40) || t3Factors(v).length) return { cat: 'T3' };
  if (size === null) return { cat: 'TX', note: 'Tumour size not recorded; pT cannot be assigned.' };
  return { cat: size > 20 ? 'T2' : 'T1' };
}

/** 'ipsilateral' | 'contralateral' | 'bilateral' | '' */
export function nodeSide(v) {
  const l = v.nodeLaterality || '';
  if (l === NODE_LATERALITY.contra) return 'contralateral';
  if (l === NODE_LATERALITY.bi) return 'bilateral';
  if (l === NODE_LATERALITY.ipsi) return 'ipsilateral';
  return '';
}

export function N(v) {
  const r = region(v);
  if (r !== 'hn' && r !== 'trunk') return { cat: 'NX' };
  const examined = int(v.nodesExamined);
  const involved = int(v.nodesInvolved);
  // No nodes submitted is the usual excision: pNX, and nothing to warn about.
  if (examined === null || examined === 0) return { cat: 'NX' };
  if (involved === null) return { cat: 'NX', note: 'Number of involved lymph nodes not recorded; pN cannot be assigned.' };
  if (involved === 0) return { cat: 'N0' };
  const side = nodeSide(v);
  const size = num(v.largestDepositMm);
  if (r === 'hn') return pathologicalN({ count: involved, laterality: side, ene: v.ene || '', sizeMm: size });
  // UICC 8th, trunk and limbs: contralateral nodes are distant metastasis (see M).
  if (side === 'contralateral') {
    return examined > involved
      ? { cat: 'N0', note: 'Only contralateral nodes are involved; for a trunk or limb primary they are distant metastasis (pM1), and pN0 assumes the uninvolved nodes are regional.' }
      : { cat: 'NX', note: 'Only contralateral nodes are involved; for a trunk or limb primary they are distant metastasis (pM1), and no regional node is left to assign pN.' };
  }
  const bilateralNote = side === 'bilateral' ? ' Bilateral nodes: pN counts the ipsilateral nodes only, and the contralateral ones are pM1; check the category if the count includes them.' : '';
  const out = (cat, note = '') => ((note + bilateralNote).trim() ? { cat, note: (note + bilateralNote).trim() } : { cat });
  if (size !== null && size > 60) return out('N3');
  if (involved === 1) {
    if (size === null) return out('N1', 'Size of the largest metastatic deposit not recorded; pN1 assumes 30 mm or less.');
    return out(size > 30 ? 'N2' : 'N1');
  }
  return out('N2', size === null ? 'Size of the largest metastatic deposit not recorded; pN2 assumes none is larger than 60 mm.' : '');
}

export function M(v) {
  if (arr(v.distantMets).some((s) => DISTANT_M1.test(s))) return { cat: 'M1' };
  const involved = int(v.nodesInvolved);
  if (region(v) === 'trunk' && involved && involved > 0 && ['contralateral', 'bilateral'].includes(nodeSide(v))) {
    return { cat: 'M1', note: 'Contralateral lymph node metastasis from a trunk or limb primary is distant metastasis (pM1, UICC 8th).' };
  }
  return { cat: 'M-' };
}

export function descriptors(v) {
  const d = [];
  if (v.multiplePrimaries === true) d.push('m');
  if (v.recurrent === true) d.push('r');
  if (v.postTherapy === true) d.push('y');
  return d;
}

// The QMH page prints no stage group for either system.
export function stageGroup() { return null; }

// ---------- BWH ----------

export function bwhFactors(v) {
  const f = [];
  const size = sizeMm(v);
  if (size !== null && size >= 20) f.push('Tumour diameter 2 cm or more');
  if (/^G[34],/.test(v.grade || '')) f.push('Poorly differentiated histology');
  // CAP Note E: an involved nerve deep to the dermis "can be classified as greater than or equal
  // to 0.1 mm", so the deep-nerve option counts here as it does for pT3.
  if (qualifyingPni(v)) f.push(v.pni === PNI.deep ? 'Perineural invasion in a nerve deeper than the dermis' : 'Perineural invasion 0.1 mm or more in calibre');
  if (beyondFat(v)) f.push('Invasion beyond the subcutaneous fat');
  return f;
}

/** 'T0' | 'T1' | 'T2a' | 'T2b' | 'T3' */
export function bwhClass(v) {
  if (v.anatomicLevel === LEVEL_IN_SITU) return 'T0';
  if (anyBone(v)) return 'T3';
  const n = bwhFactors(v).length;
  if (n === 0) return 'T1';
  if (n === 1) return 'T2a';
  if (n <= 3) return 'T2b';
  return 'T3';
}

/** The BWH option a derived class corresponds to (T0 has none on the page). */
export const bwhOptionFor = (cls) => BWH_OPTIONS.find((o) => o.startsWith(`${cls}:`)) || '';
