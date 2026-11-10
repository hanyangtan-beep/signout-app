// Soft tissue sarcoma - FNCLCC grade and pTNM on the AJCC 8th edition (Phase 84, user request 2026-11-10).
//
// AJCC keeps every soft tissue sarcoma chapter on the 8th edition (head and neck 40, trunk and extremities 41,
// abdomen and thoracic visceral organs 42, retroperitoneum 44, orbit 70; there is no version 9 chapter):
// https://www.facs.org/media/c5ik5tkr/ajcc-current-staging-system-2026.pdf . The categories below are those of
// CAP Soft Tissue 4.2.0.0 (June 2024), on which the QMH MS-Soft tissue sarcoma page is built:
// https://www.cap.org/wp-content/uploads/protocols/Soft.Tissue_4.2.0.0.REL_CAPCP.docx?download=true and
// https://awiloqmh.github.io/CancerReportingTemplate/MS-Soft%20tissue%20sarcoma.html . The stage groups follow
// the NCI PDQ table of the AJCC groups for the trunk, extremities and retroperitoneum,
// https://www.cancer.gov/types/soft-tissue-sarcoma/hp/adult-soft-tissue-treatment-pdq , and show in Checks only.
//
// FNCLCC grade (CAP, Note G; QMH): differentiation 1 to 3 by histological type, mitotic count 1 to 3 and
// necrosis 0 to 2; the sum 2 or 3 is grade 1, 4 or 5 grade 2, 6 to 8 grade 3. The mitotic cut-offs are QMH's
// for 10 HPF at a 22 mm eyepiece with a 40x objective (< 14, 14 to 28, > 28) and CAP's per mm2 (0 to 5, 6 to 11,
// > 11). CAP does not assign an FNCLCC grade to alveolar soft part sarcoma, clear cell sarcoma, epithelioid
// sarcoma, extraskeletal myxoid chondrosarcoma, low-grade fibromyxoid sarcoma and sclerosing epithelioid
// fibrosarcoma, does not use grade for angiosarcoma, and calls desmoplastic small round cell tumour, alveolar
// rhabdomyosarcoma and intimal sarcoma high grade by definition. Solitary fibrous tumour takes a risk model
// instead.
//
// pN: "When no lymph nodes are resected, the pathologic 'N' category is not assigned (pNX is not used for soft
// tissue tumors). Patients whose nodal status is not determined to be positive for tumor, either clinically or
// pathologically, should be designated as N0" (CAP). So pN is left out of the printed pTNM when no node is
// examined, and the stage group reads N0.

export const id = 'softtissue';
export const edition = 'AJCC 8th edition';

export const SITE = {
  HN: 'Head and neck', TE: 'Trunk and extremities', ABD: 'Abdominal visceral organs', THX: 'Thoracic visceral organs',
  RP: 'Retroperitoneum', ORBIT: 'Orbit', OTHER: 'Other (specify)', NS: 'Not specified'
};
export const SITE_GROUPS = Object.values(SITE);
const SIZE_SITES = [SITE.TE, SITE.RP];
const VISCERAL = [SITE.ABD, SITE.THX];

// Invasion options on the form (fields hnInvasion, visceralExtent, orbitExtent), in CAP's words.
export const HN = {
  none: 'No invasion of adjoining structures',
  T4a: 'Orbital invasion, skull base / dural invasion, invasion of central compartment viscera, involvement of facial skeleton, or invasion of pterygoid muscles',
  T4b: 'Brain parenchymal invasion, carotid artery encasement, prevertebral muscle invasion, or central nervous system involvement via perineural spread'
};
export const VISCERAL_EXTENT = {
  'Organ confined': 'T1',
  'Invades serosa or visceral peritoneum': 'T2a',
  'Extension beyond serosa (mesentery)': 'T2b',
  'Invades another organ': 'T3',
  'Multifocal (2 sites)': 'T4a',
  'Multifocal (3 to 5 sites)': 'T4b',
  'Multifocal (more than 5 sites)': 'T4c'
};
export const ORBIT = {
  none: 'No invasion of bony walls or globe',
  T3: 'Invasion of bony walls',
  T4: 'Invasion of globe or periorbital structures (eyelid, conjunctiva, temporal fossa, nasal cavity, paranasal sinuses or central nervous system)'
};

// ---------- FNCLCC differentiation ----------

// The QMH differentiation list, in its order, with the score each carries (field diffScore).
export const DIFF = [
  ['Well-differentiated liposarcoma', 1], ['Well-differentiated leiomyosarcoma', 1], ['Malignant neurofibroma', 1],
  ['Well-differentiated fibrosarcoma', 1], ['Myxoid liposarcoma', 2], ['Conventional leiomyosarcoma', 2], ['Conventional MPNST', 2],
  ['Conventional fibrosarcoma', 2], ['Myxofibrosarcoma', 2], ['Myxoid chondrosarcoma', 2], ['Conventional angiosarcoma', 2],
  ['High-grade myxoid (round cell) liposarcoma', 3], ['Pleomorphic liposarcoma', 3], ['Dedifferentiated liposarcoma', 3],
  ['Rhabdomyosarcoma', 3], ['Poorly differentiated / pleomorphic leiomyosarcoma', 3], ['Poorly differentiated / epithelioid angiosarcoma', 3],
  ['Poorly differentiated MPNST', 3], ['Malignant Triton tumour', 3], ['Synovial sarcoma', 3], ['Mesenchymal chondrosarcoma', 3],
  ['Extraskeletal osteosarcoma', 3], ['Extraskeletal Ewing sarcoma', 3], ['Malignant rhabdoid tumour', 3], ['Clear cell sarcoma', 3],
  ['Epithelioid sarcoma', 3], ['Alveolar soft part sarcoma', 3], ['Undifferentiated (spindle cell and pleomorphic) sarcoma', 3]
].map(([name, score]) => ({ name, score, option: `${name} (score ${score})` }));
export const DIFF_OTHER = 'Other (score typed)';
export const DIFF_OPTIONS = [...DIFF.map((d) => d.option), DIFF_OTHER];
const diffByName = (name) => DIFF.find((d) => d.name === name) || null;

// Histologic type (field histType) -> the QMH differentiation entry it takes when diffScore is left blank. A type
// with more than one entry (leiomyosarcoma, MPNST) takes the conventional one; the pathologist picks another.
const TYPE_DIFF = {
  'Atypical lipomatous tumour': 'Well-differentiated liposarcoma',
  'Well-differentiated liposarcoma': 'Well-differentiated liposarcoma',
  'Dedifferentiated liposarcoma': 'Dedifferentiated liposarcoma',
  'Pleomorphic liposarcoma, NOS': 'Pleomorphic liposarcoma',
  'Epithelioid pleomorphic liposarcoma': 'Pleomorphic liposarcoma',
  'Adult fibrosarcoma': 'Conventional fibrosarcoma',
  'Myxofibrosarcoma': 'Myxofibrosarcoma',
  'Leiomyosarcoma': 'Conventional leiomyosarcoma',
  'Embryonal rhabdomyosarcoma': 'Rhabdomyosarcoma',
  'Pleomorphic rhabdomyosarcoma': 'Rhabdomyosarcoma',
  'Spindle cell / sclerosing rhabdomyosarcoma, NOS': 'Rhabdomyosarcoma',
  'Malignant peripheral nerve sheath tumour, NOS': 'Conventional MPNST',
  'Malignant Triton tumour': 'Malignant Triton tumour',
  'Synovial sarcoma': 'Synovial sarcoma',
  'Mesenchymal chondrosarcoma': 'Mesenchymal chondrosarcoma',
  'Extraskeletal osteosarcoma': 'Extraskeletal osteosarcoma',
  'Extraskeletal Ewing sarcoma': 'Extraskeletal Ewing sarcoma',
  'Extrarenal rhabdoid tumour': 'Malignant rhabdoid tumour',
  'Undifferentiated pleomorphic sarcoma': 'Undifferentiated (spindle cell and pleomorphic) sarcoma',
  'Undifferentiated sarcoma, NOS': 'Undifferentiated (spindle cell and pleomorphic) sarcoma'
};
export const MYXOID = 'Myxoid liposarcoma';

// CAP, Note G.
export const NOT_GRADED = ['Alveolar soft part sarcoma', 'Clear cell sarcoma of soft tissue', 'Epithelioid sarcoma, distal (classic) type',
  'Epithelioid sarcoma, proximal (large cell) type', 'Extraskeletal myxoid chondrosarcoma', 'Low-grade fibromyxoid sarcoma',
  'Sclerosing epithelioid fibrosarcoma', 'Epithelioid angiosarcoma', 'Radiation-associated angiosarcoma', 'Lymphoedema-associated angiosarcoma',
  'Angiosarcoma, NOS', 'Solitary fibrous tumour'];
export const HIGH_BY_DEFINITION = ['Desmoplastic small round cell tumour', 'Alveolar rhabdomyosarcoma', 'Intimal sarcoma'];

const num = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = parseFloat(s.replace(/^</, ''));
  return Number.isFinite(n) ? n : null;
};

/** Greatest dimension in mm: the size typed, else the largest of the tumour dimensions. */
export function sizeMm(v) {
  const s = num(v.tumourSizeMm);
  if (s !== null) return s;
  const dims = String(v.tumourDims || '').match(/\d+(?:\.\d+)?/g);
  return dims ? Math.max(...dims.map(Number)) : null;
}

/** The QMH differentiation entry for the part: the one picked, else the one its type takes; null when neither. */
export function differentiation(v) {
  const picked = v.diffScore || '';
  if (picked === DIFF_OTHER) {
    const s = parseInt(String(v.diffScoreOther ?? '').trim(), 10);
    return [1, 2, 3].includes(s) ? { name: 'Other', score: s, option: `Other (score ${s})`, typed: true } : null;
  }
  const d = DIFF.find((x) => x.option === picked);
  if (d) return { ...d, picked: true };
  const t = v.histType || '';
  if (t === MYXOID) {
    const pct = num(v.hypercellularPct);
    // More than 5% hypercellular (round cell) areas make a myxoid liposarcoma high grade (WHO 2020; WHO 2026).
    return { ...diffByName(pct !== null && pct > 5 ? 'High-grade myxoid (round cell) liposarcoma' : 'Myxoid liposarcoma'), fromType: true };
  }
  return TYPE_DIFF[t] ? { ...diffByName(TYPE_DIFF[t]), fromType: true } : null;
}

export const MITOTIC_UNITS = ['per 10 HPF (22 mm eyepiece, 40x objective)', 'per mm²'];

/** The mitotic count typed (a leading number; "<1" reads as 0), or null. */
export function mitoticCount(v) {
  const s = String(v.mitoticCount ?? '').trim();
  if (!s) return null;
  if (/^<\s*1(?:\D|$)/.test(s)) return 0;
  const m = s.match(/^\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** Mitotic score 1 to 3 from the count and its unit (10 HPF at a 22 mm eyepiece unless per mm²). */
export function mitoticScore(count, unit) {
  if (count === null) return null;
  if (unit === MITOTIC_UNITS[1]) return count <= 5 ? 1 : count <= 11 ? 2 : 3;
  return count < 14 ? 1 : count <= 28 ? 2 : 3;
}

export const NECROSIS = { 'No tumour necrosis': 0, 'Less than 50% tumour necrosis': 1, '50% or more tumour necrosis': 2 };

/** Necrosis score from the percentage typed (field necrosisPct): 0 -> 0, under 50 -> 1, 50 or more -> 2; null when blank. */
export function necrosisPctScore(v) {
  const p = num(v.necrosisPct);
  if (p === null) return null;
  return p === 0 ? 0 : p < 50 ? 1 : 2;
}

export const GRADE_TEXT = { 1: 'Grade 1 (score 2 or 3, low grade)', 2: 'Grade 2 (score 4 or 5, high grade)', 3: 'Grade 3 (score 6 to 8, high grade)' };
export const gradeOfScore = (total) => (total === null ? null : total <= 3 ? 1 : total <= 5 ? 2 : 3);

/**
 * The FNCLCC grade. `mode`: 'fnclcc' | 'not graded' | 'high by definition' | 'GX'. On 'fnclcc', `grade` is 1 to 3
 * once all three scores are known, with `missing` naming any that are not.
 */
export function fnclcc(v) {
  const t = v.histType || '';
  const chosen = v.gradeMode || '';
  let mode = 'fnclcc';
  if (chosen === 'Cannot be assessed (GX)') mode = 'GX';
  else if (chosen === 'Not graded') mode = HIGH_BY_DEFINITION.includes(t) ? 'high by definition' : 'not graded';
  else if (chosen !== 'FNCLCC' && !v.diffScore) {
    if (NOT_GRADED.includes(t)) mode = 'not graded';
    else if (HIGH_BY_DEFINITION.includes(t)) mode = 'high by definition';
  }
  if (mode !== 'fnclcc') return { mode, grade: null, total: null, missing: [], diff: null, mitotic: null, necrosis: null };
  const diff = differentiation(v);
  const count = mitoticCount(v);
  const unit = v.mitoticUnit || MITOTIC_UNITS[0];
  const mScore = mitoticScore(count, unit);
  // The necrosis option picked wins; with none picked, the percentage typed gives the score.
  const nPicked = Object.prototype.hasOwnProperty.call(NECROSIS, v.necrosis || '') ? NECROSIS[v.necrosis] : null;
  const nScore = nPicked ?? necrosisPctScore(v);
  const missing = [];
  if (!diff) missing.push(['tumour differentiation score', 'diffScore']);
  if (mScore === null) missing.push(['mitotic count', 'mitoticCount']);
  if (nScore === null) missing.push(['tumour necrosis', 'necrosis']);
  const total = missing.length ? null : diff.score + mScore + nScore;
  return {
    mode, grade: gradeOfScore(total), total, missing, diff,
    mitotic: count === null ? null : { count, unit, score: mScore },
    necrosis: nScore === null ? null : { label: v.necrosis || '', pct: String(v.necrosisPct ?? '').trim(), score: nScore, fromPct: nPicked === null }
  };
}

/** 'G1' | 'G2' | 'G3' | 'GX' | 'high' (high grade by definition) | '' (not graded, or incomplete). */
export function gCategory(v) {
  const f = fnclcc(v);
  if (f.mode === 'GX') return 'GX';
  if (f.mode === 'high by definition') return 'high';
  if (f.mode === 'not graded') return '';
  return f.grade ? `G${f.grade}` : '';
}

// ---------- pTNM ----------

const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const bySize = (mm, cuts) => {
  for (let i = 0; i < cuts.length; i++) if (mm <= cuts[i]) return `T${i + 1}`;
  return `T${cuts.length + 1}`;
};

export function T(v) {
  const g = v.siteGroup || '';
  const mm = sizeMm(v);
  if (SIZE_SITES.includes(g)) return mm === null ? { cat: 'TX' } : { cat: bySize(mm, [50, 100, 150]) };
  if (g === SITE.HN) {
    if (v.hnInvasion === HN.T4b) return { cat: 'T4b' };
    if (v.hnInvasion === HN.T4a) return { cat: 'T4a' };
    return mm === null ? { cat: 'TX' } : { cat: bySize(mm, [20, 40]) };
  }
  if (VISCERAL.includes(g)) return { cat: VISCERAL_EXTENT[v.visceralExtent] || 'TX' };
  if (g === SITE.ORBIT) {
    if (v.orbitExtent === ORBIT.T4) return { cat: 'T4' };
    if (v.orbitExtent === ORBIT.T3) return { cat: 'T3' };
    return mm === null ? { cat: 'TX' } : { cat: mm <= 20 ? 'T1' : 'T2' };
  }
  return { cat: 'TX' };
}

export function N(v) {
  const examined = num(v.nodesExamined);
  const involved = num(v.nodesInvolved);
  if (!examined && !involved) return { cat: 'NX', none: true };
  return { cat: involved ? 'N1' : 'N0' };
}

const NO_METS = ['Not applicable', 'Not identified', 'Cannot be determined'];
export function M(v) {
  return list(v.distantMets).some((s) => !NO_METS.includes(s)) ? { cat: 'M1' } : { cat: 'M-' };
}

const THERAPY = ['Chemotherapy performed', 'Radiation therapy performed', 'Therapy performed, type not specified'];
export const hadTherapy = (v) => list(v.preresection).some((s) => THERAPY.includes(s));

export function descriptors(v) {
  const d = [];
  if (v.multiplePrimaries === true) d.push('m');
  if (v.recurrent === true) d.push('r');
  if (hadTherapy(v)) d.push('y');
  return d;
}

/**
 * AJCC 8th edition stage group for the trunk and extremities and the retroperitoneum (the only sites with
 * groups): GX and G1 are read together, and so are G2 and G3; NX (no node examined) reads as N0. Returns '' for
 * the other sites, for an ungraded type and for an unknown T.
 */
export function stageGroup(Tc, Nc, Mc, v = {}) {
  const site = v.siteGroup || '';
  if (!SIZE_SITES.includes(site)) return '';
  if (Mc === 'M1') return 'IV';
  if (Nc === 'N1') return site === SITE.RP ? 'IIIB' : 'IV';
  const g = gCategory(v);
  if (!g || !/^T[1-4]$/.test(Tc)) return '';
  const low = g === 'GX' || g === 'G1';
  if (low) return Tc === 'T1' ? 'IA' : 'IB';
  return { T1: 'II', T2: 'IIIA', T3: 'IIIB', T4: 'IIIB' }[Tc];
}

/** Checks-panel line: the stage group, never printed. `st` is the deriveTNM result (an override already applied). */
export function referenceLines(v, st) {
  const site = v.siteGroup || '';
  const lead = `Stage group, ${edition} (reference, not reported)`;
  if (!SIZE_SITES.includes(site)) return site && site !== SITE.NS ? [`${lead}: AJCC 8th edition defines no stage group for this site`] : [];
  const t = st ? st.T : T(v).cat;
  const n = st ? st.N : N(v).cat;
  const m = st ? st.M : M(v).cat;
  const g = stageGroup(t, n, m, v);
  if (g) return [`${lead}: ${g}${n === 'NX' && m !== 'M1' ? ' (no node examined: N0, as CAP directs)' : ''}`];
  if (!/^T[1-4]$/.test(t)) return [`${lead}: not assignable - the primary tumour category is needed`];
  const f = fnclcc(v);
  if (f.mode === 'not graded') return [`${lead}: not assignable - the type is not graded`];
  return [`${lead}: not assignable - the FNCLCC grade is needed`];
}
