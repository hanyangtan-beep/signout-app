// Sinonasal carcinoma staging — AJCC 8th edition (QMH HN-Nasal cavity and Nasal sinuses, CAP 4.3.0.0).
// Dual-track pT: Maxillary sinus vs Nasal cavity and ethmoid sinus; shared H&N AJCC 8th pN with ENE.
import { hnPathN } from './hypopharynx_oropharynx.js';

export const id = 'sinonasal';
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const isMaxillary = (v) => /maxillary/i.test(v?.site || '');

export function edition(v) {
  return isMaxillary(v)
    ? 'AJCC 8th edition (Maxillary sinus)'
    : 'AJCC 8th edition (Nasal cavity and ethmoid sinus)';
}

export const EXT = {
  tis: 'Carcinoma in situ (pTis)',
  t1: 'Limited to mucosa (maxillary sinus, no bone erosion) or one subsite of nasal cavity/ethmoid with or without bone invasion (pT1)',
  t2: 'Bone erosion/destruction of hard palate or middle meatus (maxillary) or two subsites / adjacent nasoethmoidal region (nasal/ethmoid) (pT2)',
  t3: 'Posterior maxillary wall, subcutaneous tissue, medial/floor of orbit, pterygoid fossa, ethmoid (maxillary) or medial/floor of orbit, maxillary sinus, palate, cribriform plate (nasal/ethmoid) (pT3)',
  t4a: 'Anterior orbital contents, skin of cheek/nose, pterygoid plates, infratemporal fossa, cribriform plate / minimal anterior cranial fossa, sphenoid or frontal sinus (pT4a)',
  t4b: 'Orbital apex, dura, brain, middle cranial fossa, cranial nerves other than V2, nasopharynx, or clivus (pT4b)',
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
  const ext = v.extension || '';
  if (ext === EXT.t4b) return { cat: 'T4b' };
  if (ext === EXT.t4a) return { cat: 'T4a' };
  if (ext === EXT.t3) return { cat: 'T3' };
  if (ext === EXT.t2) return { cat: 'T2' };
  if (ext === EXT.t1) return { cat: 'T1' };
  if (ext === EXT.tis) return { cat: 'Tis' };
  return { cat: 'TX', note: 'Tumour extent cannot be determined: pT cannot be assigned.' };
}

export const N = hnPathN;

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
  if (mCat === 'M1') return 'IVC';
  if (tCat === 'T4b' || nCat === 'N3a' || nCat === 'N3b') return 'IVB';
  if (tCat === 'T4a' || ['N2a', 'N2b', 'N2c'].includes(nCat)) return 'IVA';
  if (tCat === 'T3' || nCat === 'N1') return 'III';
  if (nCat === 'N0') {
    if (tCat === 'T2') return 'II';
    if (tCat === 'T1') return 'I';
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

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, isMaxillary, EXT, METS };
