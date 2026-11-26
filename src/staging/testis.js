// Testicular germ cell tumour staging — AJCC 8th edition Ch. 59 (QMH UG-Testis).
// Pure seminoma confined to testis splits at 30 mm (pT1a < 30 mm vs pT1b >= 30 mm); integrates S0–S3 serum markers.
export const id = 'testis';
export const edition = 'AJCC 8th edition';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  t0: 'No evidence of primary tumour (e.g. regressed / scar only) (pT0)',
  tis: 'Germ cell neoplasia in situ (GCNIS) only (pTis)',
  t1: 'Limited to testis (including rete testis invasion) without lymphovascular invasion (pT1 / pT1a / pT1b)',
  t2: 'Limited to testis with lymphovascular invasion, OR invades hilar soft tissue, epididymis, or tunica vaginalis (pT2)',
  t3: 'Directly invades spermatic cord soft tissue (pT3)',
  t4: 'Invades scrotum (pT4)',
  cannot: 'Cannot be assessed'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  nonRetroLn: 'Non-retroperitoneal lymph node(s) (pM1a)',
  lung: 'Lung (pM1a)',
  visceral: 'Non-pulmonary visceral metastasis (liver, brain, bone, etc.) (pM1b)',
  cannot: 'Cannot be determined'
};

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => [METS.nonRetroLn, METS.lung, METS.visceral].includes(x));
}

export function isPureSeminoma(v) {
  const t = v?.histType || '';
  return /^Seminoma\b/i.test(t) && !/spermatocytic|mixed/i.test(t);
}

export function T(v) {
  const ext = v.extension || '';
  if (ext === EXT.t4) return { cat: 'T4' };
  if (ext === EXT.t3) return { cat: 'T3' };
  if (ext === EXT.t2) return { cat: 'T2' };
  if (ext === EXT.t1) {
    if (/^Present/i.test(v.lvi || '')) return { cat: 'T2' };
    if (isPureSeminoma(v)) {
      const sz = num(v.sizeMm);
      if (sz === null || sz <= 0) return { cat: 'T1', note: 'Record tumour size (mm) to split pure seminoma into pT1a (< 30 mm) vs pT1b (>= 30 mm).' };
      return { cat: sz < 30 ? 'T1a' : 'T1b' };
    }
    return { cat: 'T1' };
  }
  if (ext === EXT.tis) return { cat: 'Tis' };
  if (ext === EXT.t0) return { cat: 'T0' };
  return { cat: 'TX', note: 'Tumour extent cannot be assessed: pT cannot be assigned.' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv <= 0) return { cat: 'N0' };
  const sz = num(v.largestNodeMm);
  const ene = /^Present/i.test(v.ene || '');
  if (sz !== null && sz > 50) return { cat: 'N3' };
  if (inv > 5 || ene || (sz !== null && sz > 20)) return { cat: 'N2' };
  return { cat: 'N1' };
}

export function M(v) {
  const sites = m1Sites(v);
  if (!sites.length) return { cat: 'M-' };
  if (sites.includes(METS.visceral)) return { cat: 'M1b' };
  return { cat: 'M1a' };
}

export function descriptors(v) {
  const out = [];
  if (v.multiplePrimaries === true) out.push('m');
  if (v.recurrent === true) out.push('r');
  if (v.postTherapy === true) out.push('y');
  return out;
}

export function serumS(v) {
  const s = v.serumMarkers || '';
  const m = s.match(/^(S[0-3X])\b/);
  return m ? m[1] : 'SX';
}

export function stageGroup(tCat, nCat, mCat, v = {}) {
  const s = serumS(v);
  if (mCat === 'M1b' || s === 'S3') return 'IIIC';
  if (mCat === 'M1a') return s === 'S2' ? 'IIIB' : 'IIIA';
  if (nCat === 'N3') return s === 'S2' ? 'IIIB' : (s === 'S0' || s === 'S1' ? 'IIC' : null);
  if (nCat === 'N2') return s === 'S2' ? 'IIIB' : (s === 'S0' || s === 'S1' ? 'IIB' : null);
  if (nCat === 'N1') return s === 'S2' ? 'IIIB' : (s === 'S0' || s === 'S1' ? 'IIA' : null);
  if (nCat === 'N0') {
    if (s === 'S1' || s === 'S2') return 'IS';
    if (['T2', 'T3', 'T4'].includes(tCat)) return 'IB';
    if (['T1', 'T1a', 'T1b'].includes(tCat)) return 'IA';
    if (tCat === 'Tis') return '0';
  }
  return null;
}

export function referenceLines(v, st) {
  const out = [];
  const s = serumS(v);
  const sg = stageGroup(st.T, st.N, st.M, v);
  if (sg) {
    const assumed = st.M === 'M-' ? ' (assuming cM0)' : '';
    out.push(`Stage group, ${st.edition} (reference, ${s}, not reported): Stage ${sg}${assumed}.`);
  }
  return out;
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, isPureSeminoma, serumS, EXT, METS };
