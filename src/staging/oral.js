// Oral cavity and oropharynx squamous cell carcinoma — two staging systems, picked by the tumour site
// and, in the oropharynx, by p16.
//
// Oral cavity: AJCC 8th edition, lip and oral cavity, as listed on the QMH "HN-Lip and oral cavity"
// page (saved as docs/reference/HN-Lip-and-oral-cavity.html), which follows the CAP Oral Cavity
// protocol v4.3.0.0 (https://documents.cap.org/protocols/HN.Oral_4.3.0.0.REL_CAPCP.pdf).
// "DOI is depth of invasion and not tumor thickness."
//   pT1  <= 20 mm with DOI <= 5 mm
//   pT2  <= 20 mm with DOI > 5 mm; or > 20 to 40 mm with DOI <= 10 mm
//   pT3  > 20 to 40 mm with DOI > 10 mm; or > 40 mm with DOI <= 10 mm
//   pT4a > 40 mm with DOI > 10 mm; or adjacent structures only (through cortical bone of the mandible
//        or maxilla, or the maxillary sinus or the skin of the face)
//   pT4b masticator space, pterygoid plates or skull base, or encasing the internal carotid artery
//   "Superficial erosion of bone / tooth socket (alone) by gingival primary is not sufficient to
//   classify a tumor as T4." The RCPath oral cavity dataset records the level of bone invasion as
//   cortical or medullary; medullary invasion (through the cortex) is the T4a level here, and cortical
//   erosion alone is not.
//   pN is the AJCC 8th extranodal extension table in ./hn_nodes.js, shared with head and neck skin.
//   CAP: "Examination of fewer tumor-free nodes still mandates a pN0 designation."
//
// Oropharynx with p16 positive: AJCC Version 9, oropharynx (HPV-associated), as listed on the QMH
// "HN-HPV-Oropharynx" page (saved as docs/reference/HN-HPV-Oropharynx.html), which follows the CAP
// HPV-Associated Oropharynx protocol v1.1.0.0
// (https://www.cap.org/wp-content/uploads/2026/06/HN.HPV-Assoc_Oropharynx.Res_1.1.0.0.REL_CAPCP.pdf).
//   pT0 no evidence of primary tumour (by override only; the form always records a tumour)
//   pT1 <= 20 mm; pT2 > 20 to 40 mm; pT3 > 40 mm or extension to the lingual surface of the epiglottis
//   pT4 larynx, deep (extrinsic) muscle of the tongue, pterygoid muscles, hard palate, mandible,
//       pterygoid plates, nasopharynx or skull base, or encasing the carotid artery
//   "Mucosal extension to lingual surface of epiglottis from primary tumors of the base of the tongue
//   and vallecula does not constitute invasion of the larynx."
//   pN0 no involved node: "A minimum of 6 lymph nodes is required to assign pN0 status based on AJCC
//       Version 9 guidelines"; pN1a one node and pN1b 2 to 4 nodes without definitive extranodal
//       extension; pN2 1 to 4 nodes with it, or more than 4 without; pN3 more than 4 with it.
//       Laterality and deposit size play no part.
//
// Oropharynx with p16 negative, equivocal or not recorded: HPV-independent carcinoma is staged on the
// CAP HPV-independent oropharynx and hypopharynx protocol, which is not built (it keeps its menu
// placeholder); no pTNM is given and the note says why. Neither QMH page prints a stage group.

import { pathologicalN } from './hn_nodes.js';

const num = (x) => {
  const n = parseFloat(String(x ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const int = (x) => { const n = num(x); return n === null ? null : Math.round(n); };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const id = 'oral';

// ---------- sites, regions and the system in use ----------

export const SITE_GROUPS = [
  { label: 'Oral cavity', region: 'oral', options: ['Tongue (anterior two thirds)', 'Floor of mouth', 'Buccal mucosa', 'Lower alveolus and gingiva', 'Upper alveolus and gingiva', 'Retromolar trigone', 'Hard palate', 'Lip mucosa'] },
  { label: 'Oropharynx', region: 'oro', options: ['Palatine tonsil', 'Base of tongue', 'Soft palate and uvula', 'Oropharyngeal wall', 'Vallecula'] },
  { label: 'Other', region: '', options: ['Other (specify)', 'Not specified'] }
];

export const SITE_OPTIONS = SITE_GROUPS.flatMap((g) => g.options);

export const REGION_OPTIONS = ['Oral cavity', 'Oropharynx'];
const REGION_BY_OPTION = { [REGION_OPTIONS[0]]: 'oral', [REGION_OPTIONS[1]]: 'oro' };

/** 'oral' | 'oro' | '' (not recorded). "Other" and "Not specified" sites take the second question. */
export function region(v) {
  const s = v.tumourSite || '';
  const g = SITE_GROUPS.find((x) => x.region && x.options.includes(s));
  if (g) return g.region;
  return REGION_BY_OPTION[v.siteRegion] || '';
}

export const P16 = { pos: 'Positive', neg: 'Negative', cannot: 'Cannot be determined', np: 'Not performed' };

/** 'oral' (AJCC 8th) | 'hpv' (AJCC Version 9) | 'oroNeg' (oropharynx without a positive p16; no pTNM) | '' */
export function system(v) {
  const r = region(v);
  if (r === 'oral') return 'oral';
  if (r === 'oro') return v.p16 === P16.pos ? 'hpv' : 'oroNeg';
  return '';
}

export const EDITIONS = { oral: 'AJCC 8th edition', hpv: 'AJCC 9th edition' };

export const edition = (v) => EDITIONS[system(v)] || '';

// ---------- the option strings the rules read ----------

export const DOI = { mm: 'Specify depth (mm)', least: 'At least (mm)', lt1: 'Less than 1 mm', other: 'Other (specify)', cannot: 'Cannot be determined (explain)' };
export const DOI_OPTIONS = [DOI.mm, DOI.least, DOI.lt1, DOI.other, DOI.cannot];

export const BONE = { na: 'Not applicable', none: 'Not identified', present: 'Present', cannot: 'Cannot be determined' };
export const BONE_LEVEL = { cortical: 'Cortical (superficial erosion only)', medullary: 'Medullary (through the cortex)' };

// Oral cavity: named structures beyond the primary site. Bone is its own element.
export const ORAL_T4A = ['Maxillary sinus', 'Skin of the face'];
export const ORAL_T4B = ['Masticator space', 'Pterygoid plates', 'Skull base', 'Encases the internal carotid artery'];
export const ORAL_ADJACENT = ['Not identified', ...ORAL_T4A, ...ORAL_T4B];

// HPV-associated oropharynx: extension that sets pT3 or pT4 whatever the size.
export const HPV_T3 = ['Lingual surface of the epiglottis'];
export const HPV_T4 = ['Larynx', 'Deep (extrinsic) muscle of the tongue', 'Pterygoid muscles', 'Hard palate', 'Mandible', 'Pterygoid plates', 'Nasopharynx', 'Skull base', 'Encases the carotid artery'];
export const HPV_EXTENT = ['Not identified', ...HPV_T3, ...HPV_T4];

export const NODE_LATERALITY = { ipsi: 'Ipsilateral (including midline)', contra: 'Contralateral', bi: 'Bilateral', cannot: 'Cannot be determined' };

export const DISTANT_M1 = /^(Non-regional|Lung|Liver|Bone|Brain|Other)/;

// ---------- measurements ----------

export const sizeMm = (v) => num(v.tumourSizeMm);

/** Depth in mm when it can stage: a measured depth, an "at least" depth, or under 1 mm. */
export function depthMm(v) {
  const mode = v.doi || DOI.mm;
  if (mode === DOI.lt1) return 0.5;
  if (mode !== DOI.mm && mode !== DOI.least) return null;
  return num(v.doiMm);
}

export const depthIsFloor = (v) => (v.doi || DOI.mm) === DOI.least;

/** Oral pT by size and depth alone (CAP 4.3.0.0). */
export function sizeDepthT(size, doi) {
  if (size <= 20) return doi <= 5 ? 'T1' : 'T2';
  if (size <= 40) return doi <= 10 ? 'T2' : 'T3';
  return doi <= 10 ? 'T3' : 'T4a';
}

export const bonePresent = (v) => v.boneInvasion === BONE.present;
export const boneMedullary = (v) => bonePresent(v) && v.boneLevel === BONE_LEVEL.medullary;

const picked = (v, key, list) => arr(v[key]).filter((s) => list.includes(s));

// ---------- T ----------

function oralT(v) {
  if (picked(v, 'adjacent', ORAL_T4B).length) return { cat: 'T4b' };
  if (picked(v, 'adjacent', ORAL_T4A).length || boneMedullary(v)) return { cat: 'T4a' };
  const boneNote = bonePresent(v) && !v.boneLevel
    ? ' Bone invasion is present without a level: medullary invasion (through the cortex) is pT4a, and superficial cortical erosion by a gingival primary is not.'
    : '';
  const out = (cat, note = '') => ((note + boneNote).trim() ? { cat, note: (note + boneNote).trim() } : { cat });
  const size = sizeMm(v);
  const doi = depthMm(v);
  if (size === null) return out('TX', 'Tumour size not recorded; pT cannot be assigned.');
  if (doi === null) return out('TX', 'Depth of invasion not recorded as a measurement; the oral cavity pT needs both size and depth.');
  const cat = sizeDepthT(size, doi);
  if (depthIsFloor(v) && cat !== sizeDepthT(size, Infinity)) {
    return out('TX', `Depth of invasion is at least ${doi} mm; with a tumour of ${size} mm the pT could be higher than ${cat}, so it is not assigned.`);
  }
  return out(cat);
}

function hpvT(v) {
  if (picked(v, 'hpvExtent', HPV_T4).length) return { cat: 'T4' };
  const size = sizeMm(v);
  if (picked(v, 'hpvExtent', HPV_T3).length || (size !== null && size > 40)) return { cat: 'T3' };
  if (size === null) return { cat: 'TX', note: 'Tumour size not recorded; pT cannot be assigned.' };
  return { cat: size > 20 ? 'T2' : 'T1' };
}

const OROPHARYNX_NOTE = {
  none: 'p16 immunohistochemistry not recorded: an oropharyngeal carcinoma is staged as HPV-associated (AJCC 9th edition) only when p16 is positive; no pTNM is assigned here.',
  neg: 'p16 is not positive: HPV-independent oropharyngeal carcinoma is staged on the HPV-independent oropharynx and hypopharynx protocol; no pTNM is assigned here.'
};

export function oropharynxNote(v) {
  return v.p16 === P16.neg || v.p16 === P16.cannot ? OROPHARYNX_NOTE.neg : OROPHARYNX_NOTE.none;
}

export function T(v) {
  const s = system(v);
  if (s === 'oral') return oralT(v);
  if (s === 'hpv') return hpvT(v);
  if (s === 'oroNeg') return { cat: 'TX', note: oropharynxNote(v) };
  return { cat: 'TX', note: 'Tumour site not recorded; the staging system (AJCC 8th oral cavity, AJCC 9th HPV-associated oropharynx) cannot be chosen.' };
}

// ---------- N ----------

/** 'ipsilateral' | 'contralateral' | 'bilateral' | '' */
export function nodeSide(v) {
  const l = v.nodeLaterality || '';
  if (l === NODE_LATERALITY.contra) return 'contralateral';
  if (l === NODE_LATERALITY.bi) return 'bilateral';
  if (l === NODE_LATERALITY.ipsi) return 'ipsilateral';
  return '';
}

/** 'Present' | 'Cannot be determined' | 'Not identified' | '' from the ENE option. */
export function eneState(v) {
  const e = v.ene || '';
  if (/^Present/.test(e)) return 'Present';
  return e;
}

function oralN(v) {
  const examined = int(v.nodesExamined);
  const involved = int(v.nodesInvolved);
  if (examined === null || examined === 0) return { cat: 'NX', none: true };
  if (involved === null) return { cat: 'NX', note: 'Number of involved lymph nodes not recorded; pN cannot be assigned.' };
  if (involved === 0) return { cat: 'N0' };
  return pathologicalN({ count: involved, laterality: nodeSide(v), ene: eneState(v), sizeMm: num(v.largestDepositMm) });
}

export const HPV_MIN_PN0 = 6;

function hpvN(v) {
  const examined = int(v.nodesExamined);
  const involved = int(v.nodesInvolved);
  if (examined === null || examined === 0) return { cat: 'NX', none: true };
  if (involved === null) return { cat: 'NX', note: 'Number of involved lymph nodes not recorded; pN cannot be assigned.' };
  if (involved === 0) {
    if (examined < HPV_MIN_PN0) return { cat: 'NX', note: `A minimum of ${HPV_MIN_PN0} lymph nodes is required to assign pN0 status (AJCC 9th edition); fewer were examined.` };
    return { cat: 'N0' };
  }
  const ene = eneState(v);
  if (ene === 'Present') return { cat: involved > 4 ? 'N3' : 'N2' };
  const cat = involved > 4 ? 'N2' : involved === 1 ? 'N1a' : 'N1b';
  return ene === 'Cannot be determined'
    ? { cat, note: 'Extranodal extension cannot be determined; the category without definitive extranodal extension is given.' }
    : { cat };
}

export function N(v) {
  const s = system(v);
  if (s === 'oral') return oralN(v);
  if (s === 'hpv') return hpvN(v);
  return { cat: 'NX', none: !(int(v.nodesExamined) > 0) };
}

// ---------- M, descriptors, stage ----------

export function M(v) {
  if (arr(v.distantMets).some((s) => DISTANT_M1.test(s))) return { cat: 'M1' };
  return { cat: 'M-' };
}

export function descriptors(v) {
  const d = [];
  if (v.multiplePrimaries === true) d.push('m');
  if (v.recurrent === true) d.push('r');
  if (v.postTherapy === true) d.push('y');
  return d;
}

// Neither QMH page prints a stage group.
export function stageGroup() { return null; }
