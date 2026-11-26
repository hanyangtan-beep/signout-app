// Laryngeal carcinoma staging — AJCC 8th edition (QMH HN-Larynx, CAP Larynx 4.3.0.0).
// Tri-subsite pT: Supraglottis, Glottis (pT1a/pT1b), Subglottis; shared H&N AJCC 8th pN with ENE.
import { hnPathN } from './hypopharynx_oropharynx.js';

export const id = 'larynx';
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const SUBSITES = {
  supraglottis: 'Supraglottis',
  glottis: 'Glottis',
  subglottis: 'Subglottis'
};

export function edition(v) {
  const s = v?.subsite || SUBSITES.glottis;
  return `AJCC 8th edition (Larynx — ${s})`;
}

export const EXT = {
  tis: 'Carcinoma in situ (pTis)',
  t1: 'Limited to one subsite / subglottis with normal mobility (pT1)',
  t1a: 'Limited to one vocal cord, normal mobility (glottis pT1a)',
  t1b: 'Involves both vocal cords, normal mobility (glottis pT1b)',
  t2: 'Extends to adjacent laryngeal subsite / supraglottis / subglottis and/or impaired vocal cord mobility (pT2)',
  t3: 'Limited to larynx with vocal cord fixation and/or paraglottic / pre-epiglottic space, postcricoid area, or inner cortex of thyroid cartilage (pT3)',
  t4a: 'Invades through outer cortex of thyroid cartilage and/or tissues beyond larynx (trachea, cricoid, strap muscles, thyroid, oesophagus, deep tongue) (pT4a)',
  t4b: 'Invades prevertebral space, encases carotid artery, or invades mediastinal structures (pT4b)',
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
  if (ext === EXT.t1b) return { cat: v.subsite === SUBSITES.glottis ? 'T1b' : 'T1' };
  if (ext === EXT.t1a) return { cat: v.subsite === SUBSITES.glottis ? 'T1a' : 'T1' };
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
    if (tCat.startsWith('T1')) return 'I';
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

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, SUBSITES, EXT, METS };
