// Nasopharyngeal carcinoma staging — AJCC 9th edition (QMH HN-Nasopharynx, CAP Nasopharynx 1.0.0.0).
export const id = 'nasopharynx';
export const edition = 'AJCC 9th edition';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  tis: 'Carcinoma in situ (pTis)',
  t1: 'Confined to nasopharynx, or extends to oropharynx and/or nasal cavity without parapharyngeal involvement (pT1)',
  t2: 'Parapharyngeal space and/or adjacent soft tissue (medial pterygoid, lateral pterygoid, prevertebral muscles) (pT2)',
  t3: 'Bony structures of skull base (including pterygoid structures), paranasal sinuses, or cervical vertebrae (pT3)',
  t4: 'Intracranial extension, cranial nerves, hypopharynx, orbit (including inferior orbital fissure), parotid gland, or extensive soft tissue beyond lateral pterygoid (pT4)',
  cannot: 'Cannot be determined'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  nonRegLn: 'Non-regional lymph node(s)',
  lung: 'Lung',
  liver: 'Liver',
  bone: 'Bone',
  brain: 'Brain',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};

const M1_SITES = [METS.nonRegLn, METS.lung, METS.liver, METS.bone, METS.brain, METS.other];

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => M1_SITES.includes(x));
}

export function T(v) {
  if (v.noPrimary === true) return { cat: 'T0' };
  const ext = v.extension || '';
  if (ext === EXT.t4) return { cat: 'T4' };
  if (ext === EXT.t3) return { cat: 'T3' };
  if (ext === EXT.t2) return { cat: 'T2' };
  if (ext === EXT.t1) return { cat: 'T1' };
  if (ext === EXT.tis) return { cat: 'Tis' };
  return { cat: 'TX', note: 'Tumour extent cannot be determined: pT cannot be assigned.' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv <= 0) return { cat: 'N0' };
  const largest = num(v.largestNodeMm);
  if ((largest !== null && largest > 60) || v.belowCricoid === true || v.advancedEne === true) {
    return { cat: 'N3' };
  }
  if (v.nodeLaterality === 'Bilateral' && v.retropharyngealOnly !== true) {
    return { cat: 'N2' };
  }
  return { cat: 'N1' };
}

export function M(v) {
  if (!m1Sites(v).length) return { cat: 'M-' };
  if (v.metastasisBurden === '<= 3 metastatic lesions (pM1a)') return { cat: 'M1a' };
  if (v.metastasisBurden === '> 3 metastatic lesions (pM1b)') return { cat: 'M1b' };
  return { cat: 'M1' };
}

export function descriptors(v) {
  const out = [];
  if (v.multiplePrimaries === true) out.push('m');
  if (v.recurrent === true) out.push('r');
  if (v.postTherapy === true) out.push('y');
  return out;
}

export function stageGroup(tCat, nCat, mCat) {
  if (mCat === 'M1a') return 'IVA';
  if (mCat === 'M1b') return 'IVB';
  if (mCat === 'M1') return 'IV';
  if (tCat === 'T4' || nCat === 'N3') return 'III';
  if (tCat === 'T3' || nCat === 'N2') return 'II';
  if (nCat === 'N1' && ['T0', 'T1', 'T2'].includes(tCat)) return 'IB';
  if (nCat === 'N0') {
    if (tCat === 'T1' || tCat === 'T2') return 'IA';
    if (tCat === 'Tis') return '0';
  }
  return null;
}

export function referenceLines(v, st) {
  if (st.stage) {
    const assumed = st.M === 'M-' ? ' (assuming cM0)' : '';
    return [`Stage group, ${st.edition} (reference, not reported): Stage ${st.stage}${assumed}.`];
  }
  return [];
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, EXT, METS };
