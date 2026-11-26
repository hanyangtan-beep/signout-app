// Thymic epithelial tumour staging — AJCC 9th edition (2025) + Modified Masaoka-Koga reference (QMH Thorax-Thymus).
// AJCC 9th: pT1a <= 50 mm vs pT1b > 50 mm; pT2 includes pericardium, lung, or phrenic nerve.
export const id = 'thymus';
export const edition = 'AJCC 9th edition (2025)';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  t1: 'Limited to thymus (encapsulated or unencapsulated), mediastinal fat, or direct invasion of mediastinal pleura (pT1a <= 50 mm / pT1b > 50 mm)',
  t2: 'Direct invasion of pericardium (partial or full thickness), lung, or phrenic nerve (pT2)',
  t3: 'Direct invasion of brachiocephalic vein, superior vena cava, chest wall, or extrapericardial pulmonary vessels (pT3)',
  t4: 'Direct invasion of aorta, arch vessels, intrapericardial pulmonary vessels, myocardium, trachea, or oesophagus (pT4)',
  cannot: 'Cannot be assessed'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  pleuralPericardial: 'Separate pleural or pericardial nodule(s) (pM1a)',
  pulmonaryDistant: 'Pulmonary intraparenchymal nodule or distant organ metastasis (pM1b)',
  cannot: 'Cannot be determined'
};

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => [METS.pleuralPericardial, METS.pulmonaryDistant].includes(x));
}

export function T(v) {
  const ext = v.extension || '';
  if (ext === EXT.t4) return { cat: 'T4' };
  if (ext === EXT.t3) return { cat: 'T3' };
  if (ext === EXT.t2) return { cat: 'T2' };
  if (ext === EXT.t1) {
    const sz = num(v.sizeMm);
    if (sz === null || sz <= 0) return { cat: 'T1', note: 'Record tumour size (mm) to split AJCC 9th pT1a (<= 50 mm) vs pT1b (> 50 mm).' };
    return { cat: sz > 50 ? 'T1b' : 'T1a' };
  }
  return { cat: 'TX', note: 'Tumour extent cannot be assessed: pT cannot be assigned.' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv <= 0) return { cat: 'N0' };
  return { cat: /deep|cervical/i.test(v.nodeStation || '') ? 'N2' : 'N1' };
}

export function M(v) {
  const sites = m1Sites(v);
  if (!sites.length) return { cat: 'M-' };
  if (sites.includes(METS.pulmonaryDistant)) return { cat: 'M1b' };
  return { cat: 'M1a' };
}

export function descriptors(v) {
  const out = [];
  if (v.multiplePrimaries === true) out.push('m');
  if (v.recurrent === true) out.push('r');
  if (v.postTherapy === true) out.push('y');
  return out;
}

export function stageGroup(tCat, nCat, mCat) {
  if (mCat === 'M1b' || nCat === 'N2') return 'IVB';
  if (mCat === 'M1a') return 'IVA';
  if (nCat === 'N1') return 'IIIB';
  if (tCat === 'T4') return 'IIIB';
  if (tCat === 'T3') return 'IIIA';
  if (tCat === 'T2') return 'II';
  if (['T1', 'T1a', 'T1b'].includes(tCat) && nCat === 'N0') return 'I';
  return null;
}

export function referenceLines(v, st) {
  const out = [];
  if (st.stage) {
    const assumed = st.M === 'M-' ? ' (assuming cM0)' : '';
    out.push(`Stage group, ${st.edition} (reference, not reported): Stage ${st.stage}${assumed}.`);
  }
  if (v.masaokaKoga && !/Not applicable/i.test(v.masaokaKoga)) {
    out.push(`Modified Masaoka-Koga stage (reference): ${v.masaokaKoga}.`);
  }
  return out;
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, EXT, METS };
