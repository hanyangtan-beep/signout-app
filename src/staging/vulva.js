// Vulval carcinoma — AJCC version 9 (vulva), the definitions CAP Vulva 5.1.0.0 lists
// (https://documents.cap.org/protocols/Vulva_5.1.0.0.REL_CAPCP.docx), with the AJCC version 9 stage
// groups (Table 6, https://pmc.ncbi.nlm.nih.gov/articles/PMC13525161/); the AJCC tables give each
// category its matching FIGO 2021 stage
// (https://pmc.ncbi.nlm.nih.gov/articles/PMC9290586/). The QMH page (docs/reference/GYN-Vulva.html)
// prints the AJCC 8th edition; the user chose version 9 on 2026-10-23.
//
// T  T1a: <= 2 cm and stromal invasion <= 1.0 mm (FIGO 2021 depth, from the deepest adjacent
//        dysplastic tumour-free rete ridge); T1b: > 2 cm or > 1.0 mm; T2 lower one-third of the urethra or
//        vagina, or the anus; T3 upper two-thirds of the urethra or vagina, bladder mucosa, rectal mucosa;
//        T4 fixed to pelvic bone. "pT1 (subcategory cannot be determined)" when size or depth is missing.
// N  N0(i+) isolated tumour cells (<= 0.2 mm or <= 200 cells); N1mi > 0.2 to 2.0 mm; N1a > 2.0 to 5.0 mm;
//    N1b > 5.0 mm; N1c extranodal extension; N2 fixed or ulcerated. Node number no longer counts; the form
//    records the CAP counts of nodes in each size band, and the largest band present sets N1. "(sn)"
//    when only sentinel nodes were examined. A negative inguinofemoral lymphadenectomy ordinarily has 6 or
//    more nodes; below that pN is not assigned (CAP). The form records totals, so the rule reads the total.
// M  M1: pelvic (internal iliac / hypogastric, external iliac, common iliac, presacral) nodes or distant sites.
// Stage: T1 N0 I; T1a N0 IA; T1b N0 IB; T2 N0 II; T3 N0 IIIA; TX-T3 N1mi / N1a IIIA; N1b IIIB; N1c IIIC;
//    N1 (subcategory unknown) III; T4 any N or any T N2 IVA; M1 IVB. N0(i+) groups with N0. FIGO IA has no
//    node condition, so T1a with no nodes examined stays IA; other T categories need the node category.

export const id = 'vulva';
export const edition = 'AJCC 9th edition';

export const NOT_STAGED = ['Phyllodes tumour, borderline', 'Phyllodes tumour, malignant'];
export const staged = (v) => !NOT_STAGED.includes(v.histType);

export const EXT = {
  vaginaLower: 'Vagina, lower one-third',
  vaginaUpper: 'Vagina, upper two-thirds',
  urethraLower: 'Urethra, lower one-third',
  urethraUpper: 'Urethra, upper two-thirds',
  anus: 'Anus',
  bladder: 'Bladder mucosa',
  rectum: 'Rectal mucosa',
  bone: 'Pelvic bone',
  other: 'Other tissue or organ (specify)',
  none: 'Not identified',
  cannot: 'Cannot be determined'
};
const T2_SITES = [EXT.vaginaLower, EXT.urethraLower, EXT.anus];
const T3_SITES = [EXT.vaginaUpper, EXT.urethraUpper, EXT.bladder, EXT.rectum];

export const SAMPLING = {
  sentinel: 'Sentinel lymph node biopsy only',
  both: 'Sentinel lymph node biopsy and lymphadenectomy',
  dissection: 'Lymphadenectomy'
};

export const NODE_FINDINGS = {
  none: 'None identified',
  ene: 'Extranodal extension',
  fixed: 'Fixed or ulcerated nodes',
  cannot: 'Cannot be determined'
};

export const METS = {
  none: 'Not identified',
  pelvic: 'Pelvic lymph node(s)',
  internal: 'Internal iliac / hypogastric lymph node(s)',
  external: 'External iliac lymph node(s)',
  common: 'Common iliac lymph node(s)',
  presacral: 'Presacral lymph node(s)',
  lung: 'Lung',
  liver: 'Liver',
  bone: 'Bone',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};
const DISTANT = [METS.pelvic, METS.internal, METS.external, METS.common, METS.presacral, METS.lung, METS.liver, METS.bone, METS.other];

const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const num = (x) => {
  if (x === null || x === undefined || String(x).trim() === '') return null;
  const n = Number(String(x).trim());
  return Number.isFinite(n) ? n : null;
};
const int = (x) => { const n = num(x); return n === null ? null : Math.max(0, Math.round(n)); };

// ---------- T ----------

/** Depth of invasion in mm by the FIGO 2021 method, or null when not recorded or not determinable. */
export function depth(v) { return v.doi === 'Cannot be determined' ? null : num(v.doiMm); }

export function T(v) {
  const ext = arr(v.extension);
  if (ext.includes(EXT.bone)) return { cat: 'T4' };
  if (ext.some((e) => T3_SITES.includes(e))) return { cat: 'T3' };
  if (ext.some((e) => T2_SITES.includes(e))) return { cat: 'T2' };
  if (ext.includes(EXT.cannot)) return { cat: 'TX', note: 'Other tissue or organ involvement cannot be determined: pT is not assigned.' };
  const size = num(v.tumourSizeMm); const d = depth(v);
  if ((size !== null && size > 20) || (d !== null && d > 1)) return { cat: 'T1b' };
  if (size !== null && d !== null) return { cat: 'T1a' };
  const missing = [size === null ? 'tumour size' : '', d === null ? 'depth of invasion' : ''].filter(Boolean).join(' and ');
  return { cat: 'T1', note: `pT1 (subcategory cannot be determined): ${missing} not recorded.` };
}

// ---------- N ----------

export function nodeCounts(v) {
  const examined = int(v.nodesExamined);
  const over5 = int(v.nodesOver5) || 0; const mid = int(v.nodes2to5) || 0;
  const micro = int(v.nodesMicro) || 0; const itc = int(v.nodesItc) || 0;
  return { examined, over5, mid, micro, itc, positive: over5 + mid + micro };
}

export function N(v) {
  const c = nodeCounts(v);
  if (!c.examined) return { cat: 'NX', none: true };
  const sn = v.nodeSampling === SAMPLING.sentinel ? '(sn)' : '';
  const found = arr(v.nodeFindings);
  if (c.positive > 0) {
    if (found.includes(NODE_FINDINGS.fixed)) return { cat: `N2${sn}` };
    if (found.includes(NODE_FINDINGS.ene)) return { cat: `N1c${sn}` };
    if (c.over5) return { cat: `N1b${sn}` };
    if (c.mid) return { cat: `N1a${sn}` };
    return { cat: `N1mi${sn}` };
  }
  if (v.nodeSampling === SAMPLING.dissection && c.examined < 6) {
    return { cat: 'NX', note: `pN not assigned (cannot be determined): a negative inguinofemoral lymphadenectomy ordinarily includes 6 or more lymph nodes, and ${c.examined} ${c.examined === 1 ? 'was' : 'were'} examined.` };
  }
  if (c.itc) return { cat: `N0(i+)${sn}`, note: 'Isolated tumour cells only: pN0(i+), grouped with pN0 for the stage.' };
  return { cat: `N0${sn}` };
}

// ---------- M, descriptors, stage ----------

export function M(v) {
  const m = arr(v.distantMets);
  return m.some((x) => DISTANT.includes(x)) ? { cat: 'M1' } : { cat: 'M-' };
}

export function descriptors(v) {
  const d = [];
  if (v.multiplePrimaries === true) d.push('m');
  if (v.recurrent === true) d.push('r');
  if (v.postTherapy === true) d.push('y');
  return d;
}

/** The grouping category: the (sn) suffix dropped and N0(i+) read as N0. */
const base = (cat) => String(cat || '').replace(/\((?:sn|f)\)$/, '').replace(/^N0\(i\+\)$/, 'N0');

export function stageGroup(T, N, M) {
  const t = base(T); const n = base(N);
  if (M === 'M1') return 'IVB';
  if (t === 'T4' || n === 'N2') return 'IVA';
  if (n === 'N1c') return 'IIIC';
  if (n === 'N1b') return 'IIIB';
  if (n === 'N1mi' || n === 'N1a') return 'IIIA';
  if (n === 'N1') return 'III';
  if (n === 'N0') return { T1a: 'IA', T1b: 'IB', T1: 'I', T2: 'II', T3: 'IIIA' }[t] || '';
  // Table 6 has no T1a NX row; CAP asks for node evaluation only for invasion of more than 1 mm, so a
  // T1a tumour with no nodes examined is grouped IA (referenceLines says why).
  if (n === 'NX' && t === 'T1a') return 'IA';
  return '';
}

/**
 * Checks-panel reference line: the stage group; the AJCC tables give each category its matching FIGO 2021
 * stage. Never printed in the report.
 * `st` is the deriveTNM result (an override or a prior specimen already applied); without it the derived
 * categories are used.
 */
export function referenceLines(v, st) {
  if (!staged(v)) return [];
  const n = st ? st.N : N(v).cat;
  const g = st ? st.stage : stageGroup(T(v).cat, n, M(v).cat);
  if (g === 'IA' && base(n) === 'NX') return ['Stage group, AJCC 9th edition, matching FIGO 2021 (reference, not reported): IA, with no nodes examined (CAP asks for node evaluation only for invasion of more than 1 mm)'];
  if (g) return [`Stage group, AJCC 9th edition, matching FIGO 2021 (reference, not reported): ${g}`];
  const why = base(n) === 'NX' ? 'the regional node category is needed' : 'the primary tumour category is needed';
  return [`Stage group, AJCC 9th edition, matching FIGO 2021 (reference, not reported): not assignable - ${why}`];
}
