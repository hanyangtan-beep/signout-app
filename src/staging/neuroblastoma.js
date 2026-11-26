// Paediatric neuroblastoma classification & staging — INPC (Shimada) + INRGSS (QMH Pedi-Neuroblastoma).
export const id = 'neuroblastoma';
export const edition = 'INRGSS / INPC (Shimada)';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };

export const INRGSS = {
  l1: 'L1: Localised tumour not involving vital structures (no IDRFs) and confined to one body compartment',
  l2: 'L2: Locoregional tumour with presence of one or more image-defined risk factors (IDRFs)',
  m: 'M: Distant metastatic disease (except MS)',
  ms: 'MS: Metastatic disease in children < 18 months confined to skin, liver, and/or bone marrow (< 10%)',
  cannot: 'Cannot be determined'
};

export function inpcPrognostic(v) {
  const t = v.histType || '';
  if (/ganglioneuroma/i.test(t)) return { group: 'Favourable histology', reason: 'Ganglioneuroma (Schwannian stroma-dominant).' };
  if (/intermixed/i.test(t)) return { group: 'Favourable histology', reason: 'Ganglioneuroblastoma, intermixed (Schwannian stroma-rich).' };
  if (/nodular/i.test(t)) {
    if (/favourable/i.test(v.gnbnSubset || '')) return { group: 'Favourable histology', reason: 'Ganglioneuroblastoma, nodular — favourable subset.' };
    return { group: 'Unfavourable histology', reason: 'Ganglioneuroblastoma, nodular — unfavourable subset (default).' };
  }
  if (/neuroblastoma/i.test(t)) {
    const age = num(v.ageMonths);
    const mki = v.mki || '';
    if (age === null) return { group: 'Cannot be determined', reason: 'Patient age (months) required for INPC favourable/unfavourable assignment.' };
    if (age >= 60) return { group: 'Unfavourable histology', reason: 'Neuroblastoma in patient >= 5 years (60 months).' };
    if (/undifferentiated/i.test(t)) return { group: 'Unfavourable histology', reason: 'Undifferentiated neuroblastoma (any age).' };
    if (age < 18) {
      if (/high/i.test(mki)) return { group: 'Unfavourable histology', reason: 'Neuroblastoma < 18 months with high MKI (> 4%).' };
      if (/low|intermediate/i.test(mki)) return { group: 'Favourable histology', reason: 'Poorly differentiated or differentiating neuroblastoma < 18 months with low/intermediate MKI.' };
      return { group: 'Cannot be determined', reason: 'MKI required for INPC assignment.' };
    }
    // 18 to < 60 months
    if (/differentiating/i.test(t) && /low/i.test(mki)) {
      return { group: 'Favourable histology', reason: 'Differentiating neuroblastoma (18–60 months) with low MKI (< 2%).' };
    }
    if (!mki || /cannot/i.test(mki)) return { group: 'Cannot be determined', reason: 'MKI required for INPC assignment.' };
    return { group: 'Unfavourable histology', reason: 'Neuroblastoma (18–60 months) without differentiating + low MKI combination.' };
  }
  return { group: 'Cannot be determined', reason: 'Non-INPC or unspecified histologic type.' };
}

export function inrgStageCode(v) {
  const s = v.inrgStage || '';
  if (s.startsWith('MS')) return 'MS';
  if (s.startsWith('M:')) return 'M';
  if (s.startsWith('L2')) return 'L2';
  if (s.startsWith('L1')) return 'L1';
  return null;
}

export function T(v) {
  const code = inrgStageCode(v);
  return code ? { cat: code } : { cat: 'TX', note: 'INRGSS pretreatment stage not selected.' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  return { cat: inv > 0 ? 'N1' : 'N0' };
}

export function M(v) {
  const code = inrgStageCode(v);
  return code === 'M' || code === 'MS' ? { cat: 'M1' } : { cat: 'M-' };
}

export function descriptors(v) {
  return v.postTherapy === true ? ['y'] : [];
}

export function stageGroup(tCat) {
  return ['L1', 'L2', 'M', 'MS'].includes(tCat) ? tCat : null;
}

export function referenceLines(v) {
  const lines = [];
  const inpc = inpcPrognostic(v);
  lines.push(`INPC (Shimada) prognostic group: ${inpc.group} (${inpc.reason})`);
  const code = inrgStageCode(v);
  if (code) lines.push(`INRGSS stage (reference): ${code}.`);
  return lines;
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, inpcPrognostic, inrgStageCode, INRGSS };
