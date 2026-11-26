// Wilms tumour (nephroblastoma) staging — COG (upfront) & SIOP (post-chemotherapy) Stage I–V (QMH Pedi-Wilms).
export const id = 'wilms';

const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export function edition(v) {
  return /SIOP/i.test(v?.protocol || '')
    ? 'SIOP post-chemotherapy staging'
    : 'COG (Children\'s Oncology Group) staging';
}

export const EXT = {
  s1: 'Limited to kidney with intact capsule, no renal sinus/vessel invasion, completely excised (Stage I)',
  s2: 'Extends beyond kidney (perirenal fat, renal sinus soft tissue/vessels, or renal vein) but completely excised with negative margins (Stage II)',
  s3: 'Residual non-haematogenous tumour confined to abdomen: positive margins, tumour rupture/spillage, regional lymph node metastasis, peritoneal implants, or piecemeal resection (Stage III)',
  cannot: 'Cannot be determined'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  lung: 'Lung',
  liver: 'Liver',
  bone: 'Bone',
  brain: 'Brain',
  extraAbdominalLn: 'Extra-abdominal lymph node(s)',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};

const M1_SITES = [METS.lung, METS.liver, METS.bone, METS.brain, METS.extraAbdominalLn, METS.other];

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => M1_SITES.includes(x));
}

export function deriveWilmsStage(v) {
  if (v.bilateral === true) return { stage: 'Stage V', note: 'Bilateral renal involvement at diagnosis (stage each kidney individually).' };
  if (m1Sites(v).length) return { stage: 'Stage IV', note: 'Haematogenous or extra-abdominal lymph node metastasis.' };
  const inv = int(v.nodesInvolved) ?? 0;
  const rupture = /^Present/i.test(v.capsuleRupture || '');
  const posMargin = /^Involved/i.test(v.marginStatus || '');
  const ext = v.extension || '';
  if (ext === EXT.s3 || inv > 0 || rupture || posMargin) {
    const reasons = [];
    if (rupture) reasons.push('tumour rupture/spillage');
    if (posMargin) reasons.push('involved surgical margin');
    if (inv > 0) reasons.push('regional lymph node metastasis');
    return { stage: 'Stage III', note: reasons.length ? `Upgraded to Stage III (${reasons.join(', ')}).` : '' };
  }
  if (ext === EXT.s2) return { stage: 'Stage II', note: '' };
  if (ext === EXT.s1) return { stage: 'Stage I', note: '' };
  return { stage: 'Cannot be determined', note: 'Local tumour extent not recorded.' };
}

export function T(v) {
  const w = deriveWilmsStage(v);
  return { cat: w.stage, note: w.note || undefined };
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
  return /SIOP/i.test(v?.protocol || '') || v.postTherapy === true ? ['y'] : [];
}

export function stageGroup(tCat) {
  return tCat && tCat.startsWith('Stage ') ? tCat.replace('Stage ', '') : null;
}

export function referenceLines(v) {
  const w = deriveWilmsStage(v);
  const out = [`${edition(v)}: ${w.stage}.`];
  if (w.note) out.push(w.note);
  return out;
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, deriveWilmsStage, EXT, METS };
