// Intrahepatic cholangiocarcinoma staging — AJCC 8th edition (Chapter 23: Intrahepatic Bile Ducts),
// QMH GI-Intrahepatic bile ducts (CAP IntrahepaticBileDuct 4.4.0.0), WHO 6th edition.
//
// Pathological T:
//   pT0 : No evidence of primary tumour
//   pTis: Carcinoma in situ (intraductal tumour)
//   pT1a: Solitary tumour <= 50 mm (<= 5 cm) without vascular invasion
//   pT1b: Solitary tumour > 50 mm (> 5 cm) without vascular invasion
//   pT2 : Solitary tumour with intrahepatic vascular invasion, OR multiple tumours (with or without vascular invasion)
//   pT3 : Tumour perforating the visceral peritoneum
//   pT4 : Tumour involving local extrahepatic structures by direct invasion
//
// Pathological N:
//   pN0 : No regional lymph node metastasis
//   pN1 : Metastasis in regional lymph node(s)
//   (no nodes submitted -> NX with none: true, omitted from printed pTNM)
//
// Pathological M:
//   pM1 : Distant metastasis
//
// Stage groups (reference in Checks only):
//   Stage 0   : Tis N0 M0
//   Stage IA  : T1a N0 M0
//   Stage IB  : T1b N0 M0
//   Stage II  : T2 N0 M0
//   Stage IIIA: T3 N0 M0
//   Stage IIIB: T4 N0 M0, or Any T N1 M0
//   Stage IV  : Any T Any N M1

export const id = 'intrahepatic_bile_duct';
export const edition = 'AJCC 8th edition';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const EXT = {
  tis: 'Confined to intrahepatic bile ducts (carcinoma in situ / high-grade dysplasia)',
  parenchyma: 'Confined to hepatic parenchyma',
  peritoneum: 'Perforates visceral peritoneal surface',
  gallbladder: 'Directly invades gallbladder',
  extrahepatic: 'Directly invades adjacent extrahepatic structure(s) other than gallbladder (specify)',
  cannot: 'Cannot be assessed'
};

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  nonRegLn: 'Non-regional lymph node(s)',
  peritoneum: 'Peritoneum (distant)',
  other: 'Other distant site (specify)',
  cannot: 'Cannot be determined'
};

export function m1Sites(v) {
  return arr(v.distantMets).filter((x) => [METS.nonRegLn, METS.peritoneum, METS.other].includes(x));
}

export function T(v) {
  if (v.noPrimary === true) return { cat: 'T0' };
  const ext = arr(v.extension);
  if (ext.includes(EXT.gallbladder) || ext.includes(EXT.extrahepatic)) return { cat: 'T4' };
  if (ext.includes(EXT.peritoneum)) return { cat: 'T3' };
  if (ext.includes(EXT.tis) && !ext.includes(EXT.parenchyma)) return { cat: 'Tis' };
  if (ext.includes(EXT.cannot)) return { cat: 'TX', note: 'Tumour extension cannot be assessed: pT cannot be assigned.' };
  if (v.focality === 'Multiple' || v.lvi === 'Present') return { cat: 'T2' };
  const sz = num(v.sizeMm);
  if (sz === null || sz <= 0) {
    return { cat: 'TX', note: 'Greatest tumour dimension (mm) not recorded: pT1a/pT1b cannot be assigned.' };
  }
  return sz <= 50 ? { cat: 'T1a' } : { cat: 'T1b' };
}

export function N(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex === null || ex <= 0) return { cat: 'NX', none: true };
  if (inv !== null && inv > 0) return { cat: 'N1' };
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
  if (nCat === 'N1') return 'IIIB';
  if (nCat === 'N0') {
    if (tCat === 'T4') return 'IIIB';
    if (tCat === 'T3') return 'IIIA';
    if (tCat === 'T2') return 'II';
    if (tCat === 'T1b') return 'IB';
    if (tCat === 'T1a') return 'IA';
    if (tCat === 'Tis') return '0';
  }
  return null;
}

export function referenceLines(v, st) {
  if (st.stage) {
    const assumed = st.M === 'M-' ? ' (assuming cM0)' : '';
    return [`Stage group, AJCC 8th edition (reference, not reported): Stage ${st.stage}${assumed}.`];
  }
  return [];
}

export default { id, edition, T, N, M, descriptors, stageGroup, referenceLines, m1Sites, EXT, METS };
