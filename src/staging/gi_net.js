// Site-aware GI neuroendocrine tumour staging — AJCC 8th edition (Chapters 29–33).
// Covers Stomach (Ch. 29), Duodenum / Ampulla (Ch. 30), Jejunum / Ileum (Ch. 31),
// Appendix (Ch. 32), and Colon / Rectum (Ch. 33).

export const id = 'gi_net';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const SITES = {
  stomach: 'Stomach',
  duodenum: 'Duodenum / Ampulla',
  jejunumIleum: 'Jejunum / Ileum',
  appendix: 'Appendix',
  colonRectum: 'Colon / Rectum'
};

export const DEPTH = {
  laminaPropria: 'Lamina propria or submucosa',
  muscularis: 'Muscularis propria',
  subserosa: 'Subserosa / mesoappendix / perirectal tissue without serosal penetration',
  serosa: 'Visceral peritoneum (serosa)',
  adjacent: 'Adjacent organ(s) or structure(s)',
  cannot: 'Cannot be assessed'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  liver: 'Liver',
  nonRegLn: 'Non-regional lymph node(s)',
  lung: 'Lung',
  bone: 'Bone',
  peritoneum: 'Peritoneum',
  other: 'Other extrahepatic site (specify)',
  cannot: 'Cannot be determined'
};

const EXTRAHEPATIC = [METS.nonRegLn, METS.lung, METS.bone, METS.peritoneum, METS.other];

export function edition(v) {
  const s = v?.site || SITES.jejunumIleum;
  const ch = {
    [SITES.stomach]: 'AJCC 8th edition (Stomach NET, Ch. 29)',
    [SITES.duodenum]: 'AJCC 8th edition (Duodenum / Ampulla NET, Ch. 30)',
    [SITES.jejunumIleum]: 'AJCC 8th edition (Jejunum / Ileum NET, Ch. 31)',
    [SITES.appendix]: 'AJCC 8th edition (Appendix NET, Ch. 32)',
    [SITES.colonRectum]: 'AJCC 8th edition (Colon / Rectum NET, Ch. 33)'
  }[s] || 'AJCC 8th edition';
  return ch;
}

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => x === METS.liver || EXTRAHEPATIC.includes(x));
}

export function T(v) {
  if (v.noPrimary === true) return { cat: 'T0' };
  const d = v.depth || '';
  const sz = num(v.sizeMm);
  const site = v.site || SITES.jejunumIleum;

  if (d === DEPTH.serosa || d === DEPTH.adjacent) return { cat: 'T4' };
  if (d === DEPTH.cannot) return { cat: 'TX', note: 'Depth of invasion cannot be assessed: pT cannot be assigned.' };

  if (site === SITES.appendix) {
    if (d === DEPTH.subserosa || (sz !== null && sz > 40)) return { cat: 'T3' };
    if (sz === null || sz <= 0) return { cat: 'TX', note: 'Tumour size (mm) not recorded: appendiceal NET pT1–pT3 cannot be assigned.' };
    if (sz > 20) return { cat: 'T2' };
    return { cat: 'T1' };
  }

  if (d === DEPTH.subserosa) return { cat: 'T3' };
  if (site === SITES.duodenum && v.pancreasInvasion === true) return { cat: 'T3' };

  if (site === SITES.colonRectum) {
    if (d === DEPTH.muscularis || (sz !== null && sz > 20)) return { cat: 'T2' };
    if (sz === null || sz <= 0) return { cat: 'T1', note: 'Tumour size (mm) not recorded: colorectal NET pT1a vs pT1b cannot be assigned.' };
    return { cat: sz < 10 ? 'T1a' : 'T1b' };
  }

  // Stomach, Duodenum/Ampulla, Jejunum/Ileum: T1 <= 10 mm and LP/SM; T2 muscularis propria or > 10 mm.
  if (d === DEPTH.muscularis || (sz !== null && sz > 10)) return { cat: 'T2' };
  if (sz === null || sz <= 0) return { cat: 'TX', note: 'Tumour size (mm) not recorded: pT1 vs pT2 cannot be assigned.' };
  return { cat: 'T1' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv === null || inv <= 0) return { cat: 'N0' };
  if (v.site === SITES.jejunumIleum && (inv >= 12 || v.mesentericMassOver20mm === true)) {
    return { cat: 'N2' };
  }
  return { cat: 'N1' };
}

export function M(v) {
  const sites = m1Sites(v);
  if (!sites.length) return { cat: 'M-' };
  const hasLiver = sites.includes(METS.liver);
  const hasExtra = sites.some((x) => EXTRAHEPATIC.includes(x));
  if (hasLiver && hasExtra) return { cat: 'M1c' };
  if (hasExtra) return { cat: 'M1b' };
  return { cat: 'M1a' };
}

export function descriptors(v) {
  const out = [];
  if (v.multiplePrimaries === true) out.push('m');
  if (v.recurrent === true) out.push('r');
  if (v.postTherapy === true) out.push('y');
  return out;
}

export function stageGroup(tCat, nCat, mCat, v = {}) {
  if (mCat && mCat.startsWith('M1')) return 'IV';
  const site = v.site || SITES.jejunumIleum;
  const hasN = nCat === 'N1' || nCat === 'N2';

  if (site === SITES.stomach || site === SITES.colonRectum) {
    if (hasN) return 'IIIB';
    if (nCat === 'N0') {
      if (tCat === 'T4') return 'IIIA';
      if (tCat === 'T3') return 'IIB';
      if (tCat === 'T2') return 'IIA';
      if (tCat.startsWith('T1')) return 'I';
    }
    return null;
  }

  if (site === SITES.duodenum) {
    if (hasN) return 'IIIB';
    if (nCat === 'N0') {
      if (tCat === 'T4') return 'IIIA';
      if (tCat === 'T2' || tCat === 'T3') return 'II';
      if (tCat === 'T1') return 'I';
    }
    return null;
  }

  // Jejunum/Ileum and Appendix:
  if (hasN) return 'III';
  if (nCat === 'N0') {
    if (tCat === 'T4') return 'III';
    if (tCat === 'T2' || tCat === 'T3') return 'II';
    if (tCat === 'T1') return 'I';
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

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, SITES, DEPTH, METS };
