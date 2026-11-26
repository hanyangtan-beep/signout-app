// Meningioma integrated grading — WHO CNS5 (5th edition, 2021) (QMH CNS-Meningioma).
// Automated CNS WHO Grade 1–3 incorporating mitoses, brain invasion, atypical features, chordoid/clear cell, and TERT/CDKN2A/B molecular overrule.
export const id = 'meningioma';
export const edition = 'WHO CNS5 (5th edition)';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export function deriveCnsGrade(v) {
  const mit = num(v.mitosesPer10Hpf);
  const molG3 = v.tertPromoter === 'Mutated' || v.cdkn2ab === 'Homozygous deletion';
  const anaplasia = v.frankAnaplasia === true || /anaplastic/i.test(v.histType || '');
  if (molG3 || anaplasia || (mit !== null && mit >= 20)) {
    const reasons = [];
    if (v.tertPromoter === 'Mutated') reasons.push('TERT promoter mutation');
    if (v.cdkn2ab === 'Homozygous deletion') reasons.push('CDKN2A/B homozygous deletion');
    if (mit !== null && mit >= 20) reasons.push(`${mit} mitoses/10 HPF (>= 20)`);
    if (anaplasia) reasons.push('frank anaplasia');
    return { grade: 'CNS WHO grade 3', reason: reasons.join('; ') };
  }
  const brainInv = /^Present/i.test(v.brainInvasion || '');
  const atypicalCnt = arr(v.atypicalFeatures).length;
  const g2Sub = /chordoid|clear cell|atypical/i.test(v.histType || '');
  if (brainInv || atypicalCnt >= 3 || g2Sub || (mit !== null && mit >= 4)) {
    const reasons = [];
    if (mit !== null && mit >= 4) reasons.push(`${mit} mitoses/10 HPF (4–19)`);
    if (brainInv) reasons.push('brain invasion');
    if (atypicalCnt >= 3) reasons.push(`${atypicalCnt} of 5 atypical features`);
    if (g2Sub) reasons.push('grade 2 subtype');
    return { grade: 'CNS WHO grade 2', reason: reasons.join('; ') };
  }
  return { grade: 'CNS WHO grade 1', reason: '< 4 mitoses/10 HPF without brain invasion or grade 2/3 criteria' };
}

export function T(v) {
  const g = deriveCnsGrade(v);
  return { cat: g.grade };
}

export function N() { return { cat: 'NX', none: true }; }
export function M() { return { cat: 'M-' }; }
export function descriptors() { return []; }
export function stageGroup(tCat) { return tCat || null; }

export function referenceLines(v) {
  const g = deriveCnsGrade(v);
  return [`Integrated ${edition}: ${g.grade} (${g.reason}).`];
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, deriveCnsGrade };
