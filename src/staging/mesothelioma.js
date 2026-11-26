// Pleural mesothelioma staging — AJCC 9th edition (2025+) (QMH Thorax-Mesothelioma).
export const id = 'mesothelioma';
export const edition = 'AJCC 9th edition (2025)';

const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  t1: 'Ipsilateral parietal pleura with or without mediastinal, diaphragmatic, or visceral pleura involvement (pT1)',
  t2: 'Each ipsilateral pleural surface with diaphragmatic muscle invasion and/or confluent visceral pleural extension into lung parenchyma (pT2)',
  t3: 'Locally advanced potentially resectable: endothoracic fascia, mediastinal fat, solitary chest wall soft tissue focus, or non-transmural pericardium (pT3)',
  t4: 'Diffuse/multifocal chest wall (with/without rib), transdiaphragmatic peritoneum, contralateral pleura, mediastinal organs, spine, transmural pericardium/myocardium, or brachial plexus (pT4)',
  cannot: 'Cannot be assessed'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  nonRegLn: 'Non-regional lymph node(s)',
  contralateralLung: 'Contralateral lung',
  liver: 'Liver',
  bone: 'Bone',
  peritoneum: 'Peritoneum (distant)',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};

const M1_SITES = [METS.nonRegLn, METS.contralateralLung, METS.liver, METS.bone, METS.peritoneum, METS.other];

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => M1_SITES.includes(x));
}

export function epithelioidGrade(v) {
  if (!/^Epithelioid/i.test(v?.histType || '')) return null;
  const nuc = int(v.nuclearAtypiaScore);
  const mit = int(v.mitoticScore);
  const nec = /^Present/i.test(v.necrosis || '');
  if (nuc === null || mit === null) return null;
  const total = nuc + mit;
  // WHO 5th 2-tier nuclear grading: score 2–3 = nuclear grade I; 4–5 = nuclear grade II; 6 = nuclear grade III.
  // Low grade = nuclear grade I, or nuclear grade II without necrosis. High grade = nuclear grade II with necrosis, or nuclear grade III.
  if (total >= 6 || (total >= 4 && nec)) return { tier: 'High grade', nuclearGrade: total >= 6 ? 'Grade III' : 'Grade II (with necrosis)' };
  return { tier: 'Low grade', nuclearGrade: total >= 4 ? 'Grade II (without necrosis)' : 'Grade I' };
}

export function T(v) {
  if (/in situ/i.test(v.histType || '')) return { cat: 'Tis' };
  const ext = v.extension || '';
  if (ext === EXT.t4) return { cat: 'T4' };
  if (ext === EXT.t3) return { cat: 'T3' };
  if (ext === EXT.t2) return { cat: 'T2' };
  if (ext === EXT.t1) return { cat: 'T1' };
  return { cat: 'TX', note: 'Tumour extent cannot be assessed: pT cannot be assigned.' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv <= 0) return { cat: 'N0' };
  return { cat: /contralateral|supraclavicular/i.test(v.nodeStation || '') ? 'N2' : 'N1' };
}

export function M(v) {
  return m1Sites(v).length ? { cat: 'M1' } : { cat: 'M-' };
}

export function descriptors(v) {
  const out = [];
  if (v.recurrent === true) out.push('r');
  if (v.postTherapy === true) out.push('y');
  return out;
}

export function stageGroup(tCat, nCat, mCat) {
  if (mCat === 'M1') return 'IV';
  if (tCat === 'T4' || nCat === 'N2') return 'IIIB';
  if (tCat === 'T3' && nCat === 'N1') return 'IIIA';
  if (tCat === 'T3' && nCat === 'N0') return 'II';
  if (['T1', 'T2'].includes(tCat) && nCat === 'N1') return 'II';
  if (tCat === 'T2' && nCat === 'N0') return 'IB';
  if (tCat === 'T1' && nCat === 'N0') return 'IA';
  return null;
}

export function referenceLines(v, st) {
  const out = [];
  const eg = epithelioidGrade(v);
  if (eg) out.push(`WHO 5th epithelioid mesothelioma 2-tier grade: ${eg.tier} (${eg.nuclearGrade}).`);
  if (st.stage) {
    const assumed = st.M === 'M-' ? ' (assuming cM0)' : '';
    out.push(`Stage group, ${st.edition} (reference, not reported): Stage ${st.stage}${assumed}.`);
  }
  return out;
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, epithelioidGrade, EXT, METS };
