// Head and neck mucosal melanoma staging — AJCC 8th edition (QMH HN-Mucosal Melanoma, CAP 1.1.0.0).
// Primary tumour starts at pT3 (no pT1/pT2).
export const id = 'mucosal_melanoma';
export const edition = 'AJCC 8th edition';

const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  t3: 'Limited to mucosa and/or immediately underlying soft tissue (pT3)',
  t4a: 'Deep soft tissues, muscle, cartilage, bone, or overlying skin (pT4a)',
  t4b: 'Brain, dura, skull base, lower cranial nerves (IX–XII), masticator space, carotid artery, prevertebral space, or mediastinum (pT4b)',
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
  const ext = arr(v.extension);
  if (ext.includes(EXT.t4b)) return { cat: 'T4b' };
  if (ext.includes(EXT.t4a)) return { cat: 'T4a' };
  if (ext.includes(EXT.t3)) return { cat: 'T3' };
  return { cat: 'TX', note: 'Tumour extent cannot be determined: pT3–pT4b cannot be assigned.' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  const sfx = v.nodeSuffix === '(sn) Sentinel node' ? '(sn)' : (v.nodeSuffix === '(f) FNA / core' ? '(f)' : '');
  return { cat: `${inv > 0 ? 'N1' : 'N0'}${sfx}` };
}

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

const base = (cat) => String(cat || '').replace(/\((?:sn|f)\)$/, '');

export function stageGroup(tCat, nCat, mCat) {
  if (mCat === 'M1') return 'IVC';
  if (tCat === 'T4b') return 'IVB';
  const n = base(nCat);
  if (tCat === 'T4a' || n === 'N1') return 'IVA';
  if (tCat === 'T3' && n === 'N0') return 'III';
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
