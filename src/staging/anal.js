// Anal canal carcinoma staging — AJCC 9th edition (QMH GI-Anus, CAP Anus 5.0.0.0).
export const id = 'anal';
export const edition = 'AJCC 9th edition';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  tis: 'Carcinoma in situ (HSIL / AIN 2–3 / Paget disease)',
  lp: 'Tumour invades lamina propria',
  mm: 'Tumour invades muscularis mucosae',
  sm: 'Tumour invades submucosa',
  sphincter: 'Tumour invades into but not through anal sphincter muscle',
  rectumMp: 'Tumour invades into but not through muscularis propria of rectum',
  perianalSoftTissue: 'Tumour invades through anal sphincter muscle into perianal or perirectal soft tissue without involvement of adjacent structures',
  perianalSkin: 'Tumour invades perianal skin',
  adjacent: 'Tumour directly invades adjacent organ(s) (vagina, urethra, bladder, etc.)',
  cannot: 'Cannot be determined'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  nonRegLn: 'Non-regional lymph node(s) (specify)',
  liver: 'Liver',
  lung: 'Lung',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};

const M1_SITES = [METS.nonRegLn, METS.liver, METS.lung, METS.other];

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => M1_SITES.includes(x));
}

export function T(v) {
  if (v.noPrimary === true) return { cat: 'T0' };
  const ext = arr(v.extension);
  if (ext.includes(EXT.adjacent)) return { cat: 'T4' };
  if (ext.includes(EXT.tis) && ext.length === 1) return { cat: 'Tis' };
  const sz = num(v.sizeMm);
  if (sz === null || sz <= 0) {
    return { cat: 'TX', note: 'Greatest tumour dimension (mm) not recorded: anal pT1–pT3 cannot be assigned.' };
  }
  if (sz <= 20) return { cat: 'T1' };
  if (sz <= 50) return { cat: 'T2' };
  return { cat: 'T3' };
}

export function N(v) {
  const extEx = int(v.externalIliacExamined) ?? 0;
  const extInv = int(v.externalIliacInvolved) ?? 0;
  const othEx = int(v.otherNodesExamined) ?? 0;
  const othInv = int(v.otherNodesInvolved) ?? 0;
  const totalEx = extEx + othEx;
  if (totalEx <= 0) return { cat: 'NX', none: true };
  if (extInv > 0 && othInv > 0) return { cat: 'N1c' };
  if (extInv > 0) return { cat: 'N1b' };
  if (othInv > 0) return { cat: 'N1a' };
  return { cat: 'N0' };
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

export function stageGroup(tCat, nCat, mCat) {
  if (mCat === 'M1') return 'IV';
  const isN1 = nCat && nCat.startsWith('N1');
  if (isN1) {
    if (tCat === 'T3' || tCat === 'T4') return 'IIIC';
    if (tCat === 'T1' || tCat === 'T2') return 'IIIA';
    return null;
  }
  if (nCat === 'N0') {
    if (tCat === 'T4') return 'IIIB';
    if (tCat === 'T3') return 'IIB';
    if (tCat === 'T2') return 'IIA';
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

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, EXT, METS };
