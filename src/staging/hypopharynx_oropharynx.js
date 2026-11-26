// Hypopharynx & HPV-independent Oropharynx carcinoma staging — AJCC 8th edition
// (QMH HN-Hypopharynx, CAP HPV-independent Oropharynx & Hypopharynx).
export const id = 'hypopharynx_oropharynx';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const SITES = {
  hypopharynx: 'Hypopharynx',
  oropharynx: 'Oropharynx (HPV-independent)'
};

export function edition(v) {
  return v?.site === SITES.oropharynx
    ? 'AJCC 8th edition (Oropharynx, HPV-independent)'
    : 'AJCC 8th edition (Hypopharynx)';
}

export const EXT = {
  tis: 'Carcinoma in situ (pTis)',
  local: 'Confined to primary site (size / subsite governs pT1–pT3)',
  multiSubsite: 'Invades > 1 subsite of hypopharynx or adjacent site without hemilarynx fixation (pT2)',
  t3Feature: 'Hemilarynx fixation, oesophageal mucosa (hypopharynx) or lingual epiglottis (oropharynx) (pT3)',
  t4a: 'Moderately advanced local disease (cartilage, hyoid, thyroid, larynx, extrinsic tongue muscle, mandible, hard palate, central soft tissue) (pT4a)',
  t4b: 'Very advanced local disease (prevertebral fascia, carotid artery encasement, skull base, pterygoid plates, mediastinal structures) (pT4b)',
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
  if (ext === EXT.tis) return { cat: 'Tis' };
  if (ext === EXT.cannot) return { cat: 'TX', note: 'Tumour extent cannot be determined: pT cannot be assigned.' };
  const sz = num(v.sizeMm);
  if (ext === EXT.t3Feature || (sz !== null && sz > 40)) return { cat: 'T3' };
  if ((v.site !== SITES.oropharynx && ext === EXT.multiSubsite) || (sz !== null && sz > 20)) return { cat: 'T2' };
  if (sz === null || sz <= 0) return { cat: 'TX', note: 'Greatest tumour dimension (mm) not recorded: pT1–pT3 cannot be assigned.' };
  return { cat: 'T1' };
}

/** Shared AJCC 8th H&N mucosal SCC pathological N category (with ENE). */
export function hnPathN(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv <= 0) return { cat: 'N0' };
  const largest = num(v.largestNodeMm);
  const ene = /^Present/i.test(v.ene || '');
  const lat = v.nodeLaterality || 'Ipsilateral (including midline)';
  const contraOrBi = lat === 'Contralateral' || lat === 'Bilateral';

  if (ene) {
    if (inv === 1 && !contraOrBi && largest !== null && largest <= 30) return { cat: 'N2a' };
    return { cat: 'N3b' };
  }
  if (largest !== null && largest > 60) return { cat: 'N3a' };
  if (contraOrBi) return { cat: 'N2c' };
  if (inv > 1) return { cat: 'N2b' };
  if (largest !== null && largest > 30) return { cat: 'N2a' };
  return { cat: 'N1' };
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

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, hnPathN, SITES, EXT, METS };
