// Paediatric extragonadal germ cell tumour staging — COG / MaGIC Stage I–IV (QMH Pedi-GermCellTumors).
export const id = 'extragonadal_gct';
export const edition = 'COG / MaGIC Paediatric Extragonadal GCT Staging';

const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  lung: 'Lung',
  liver: 'Liver',
  bone: 'Bone',
  cns: 'CNS / brain',
  distantLn: 'Distant lymph node(s)',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};

const M1_SITES = [METS.lung, METS.liver, METS.bone, METS.cns, METS.distantLn, METS.other];

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => M1_SITES.includes(x));
}

export function deriveCogStage(v) {
  if (m1Sites(v).length) return { stage: 'Stage IV', note: 'Distant metastases present.' };
  const inv = int(v.nodesInvolved) ?? 0;
  if (inv > 0 || /gross residual|biopsy only/i.test(v.resectionCompleteness || '')) {
    return { stage: 'Stage III', note: inv > 0 ? 'Regional lymph node metastasis.' : 'Gross residual disease or biopsy only.' };
  }
  if (/^Involved|microscopic residual/i.test(v.marginStatus || '')) {
    return { stage: 'Stage II', note: 'Microscopic residual disease at surgical margin.' };
  }
  if (/complete/i.test(v.resectionCompleteness || '') && /^Uninvolved/i.test(v.marginStatus || '')) {
    return { stage: 'Stage I', note: 'Complete resection with negative margins (and coccygectomy for sacrococcygeal primary).' };
  }
  return { stage: 'Cannot be determined', note: 'Resection completeness / margin status needed for COG stage.' };
}

export function T(v) {
  const c = deriveCogStage(v);
  return { cat: c.stage, note: c.note };
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

export function stageGroup(tCat) {
  return tCat && tCat.startsWith('Stage ') ? tCat.replace('Stage ', '') : null;
}

export function referenceLines(v) {
  const c = deriveCogStage(v);
  return [`${edition}: ${c.stage} (${c.note})`];
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, deriveCogStage, METS };
