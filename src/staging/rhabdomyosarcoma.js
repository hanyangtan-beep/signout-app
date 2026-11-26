// Paediatric rhabdomyosarcoma staging — COG / IRS Clinical Group I–IV + Site-Based TNM Stage 1–4 (QMH Pedi-Rhadomyosarcoma).
export const id = 'rhabdomyosarcoma';
export const edition = 'COG / IRS Clinical Group & Site-Based TNM';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const isFavourableSite = (v) => /^Favourable/i.test(v?.siteGroup || '');

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  lung: 'Lung',
  boneMarrow: 'Bone marrow',
  bone: 'Bone',
  distantLn: 'Distant lymph node(s)',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};

const M1_SITES = [METS.lung, METS.boneMarrow, METS.bone, METS.distantLn, METS.other];

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => M1_SITES.includes(x));
}

export function T(v) {
  const sz = num(v.sizeMm);
  const inv = /beyond/i.test(v.extension || '');
  const base = inv ? 'T2' : 'T1';
  if (sz === null || sz <= 0) return { cat: base };
  return { cat: `${base}${sz > 50 ? 'b' : 'a'}` };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  return { cat: inv > 0 ? 'N1' : 'N0' };
}

export function M(v) {
  return m1Sites(v).length ? { cat: 'M1' } : { cat: 'M-' };
}

export function descriptors(v) {
  return v.postTherapy === true ? ['y'] : [];
}

export function stageGroup(tCat, nCat, mCat, v = {}) {
  if (mCat === 'M1') return '4';
  if (isFavourableSite(v)) return '1';
  // Unfavourable site: Stage 2 if <= 5 cm (a) AND N0; Stage 3 if > 5 cm (b) OR N1
  if (tCat && tCat.endsWith('a') && nCat === 'N0') return '2';
  if ((tCat && tCat.endsWith('b')) || nCat === 'N1') return '3';
  return null;
}

export function referenceLines(v, st) {
  const out = [];
  if (st.stage) out.push(`COG / IRS pretreatment TNM stage (reference): Stage ${st.stage}.`);
  if (v.irsGroup && !/Cannot/i.test(v.irsGroup)) out.push(`IRS surgical-pathological Clinical Group: ${v.irsGroup}.`);
  return out;
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, isFavourableSite, METS };
