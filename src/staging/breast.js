// Breast carcinoma — AJCC 8th edition anatomic pTNM, as displayed on the QMH BREAST-Cancers and
// BREAST-DCIS pages (CAP Breast Invasive Resection 4.11.0.0; CAP DCIS Resection 4.5.0.1). Field ids belong
// to schemas/breast_carcinoma.json and schemas/breast_dcis.json (the DCIS schema shares the node and
// metastasis fields; its histologic types all resolve to Tis).
//
// T: T1mi <= 1 mm; T1a > 1-5; T1b > 5-10; T1c > 10-20; T2 > 20-50; T3 > 50 mm (largest contiguous invasive
// focus; multifocal carries the (m) descriptor). T4a chest wall deep to pectoralis; T4b skin ulceration,
// macroscopic satellite nodules or oedema; T4c both; T4d inflammatory carcinoma (clinical). Tis(DCIS) when only
// in-situ carcinoma; Tis(Paget) for Paget disease without invasive carcinoma or DCIS; T0 no residual carcinoma.
// N: N0(i+) isolated tumour cells only (<= 0.2 mm and <= 200 cells); N0(mol+) RT-PCR only; N1mi micrometastases
// only (> 0.2-2 mm and/or > 200 cells); N1a 1-3 nodes with >= 1 macrometastasis; N2a 4-9; N3a >= 10 or
// infraclavicular (level III); N1b internal mammary sentinel node with axilla negative; N1c N1a + N1b; N2b
// clinically detected internal mammary nodes with axilla negative; N3b axillary + internal mammary (>= 4
// axillary with any internal mammary, or 1-3 axillary with clinically detected internal mammary); N3c
// supraclavicular. "(sn)" suffix when sentinel node biopsy only and <= 5 nodes examined.
// M: M1 with the sites entered; M- otherwise.
// Stage groups (anatomic): 0 Tis N0; IA T1 N0; IB T0-1 N1mi; IIA T0-1 N1, T2 N0; IIB T2 N1 (incl. N1mi), T3 N0;
// IIIA T0-2 N2, T3 N1-2; IIIB T4 N0-2; IIIC any N3; IV M1. N0(i+) and N0(mol+) group as N0.

export const id = 'breast';
export const edition = 'AJCC 8th edition';

const num = (x) => { const n = parseFloat(String(x ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) ? n : 0; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

export const NO_RESIDUAL = /^No residual invasive carcinoma/;
export const PAGET = /Paget/i;
export const IN_SITU_TYPES = /^(Ductal carcinoma in situ|Encapsulated papillary carcinoma in situ|Solid papillary carcinoma in situ|Other)/;
export const NO_THERAPY = 'No known presurgical therapy';

/** True when the part records presurgical (neoadjuvant) therapy. */
export const treated = (v) => !!v.treatmentEffect && v.treatmentEffect !== NO_THERAPY;

const T4a = (v) => /chest wall/i.test(v.skeletalMuscle || '');
const T4b = (v) => /with macroscopic skin ulceration/i.test(v.skin || '') || /Macroscopic/i.test(v.satellite || '') || v.skinOedema === true;

/** T from the invasive size in mm (T1mi when microinvasion only). */
export function sizeT(mm, microinvasion = false) {
  if (microinvasion) return 'T1mi';
  if (mm === null) return null;
  if (mm <= 1) return 'T1mi';
  if (mm <= 5) return 'T1a';
  if (mm <= 10) return 'T1b';
  if (mm <= 20) return 'T1c';
  if (mm <= 50) return 'T2';
  return 'T3';
}

export function T(v) {
  const type = String(v.histType || '');
  const inSitu = v.inSitu === true || IN_SITU_TYPES.test(type) || (v.templateKind === 'dcis');
  if (inSitu) {
    if (PAGET.test(type) && !/^Paget disease.*with/i.test(type)) return { cat: 'Tis(Paget)' };
    return { cat: 'Tis(DCIS)' };
  }
  if (NO_RESIDUAL.test(type) || v.sizeMode === 'No residual carcinoma') {
    if (/^Present|^Only DCIS/.test(v.dcis || '')) return { cat: 'Tis(DCIS)', note: treated(v) ? 'Only DCIS remains after presurgical therapy: ypTis(DCIS).' : 'No residual invasive carcinoma with DCIS present: pTis(DCIS); the invasive category from the prior biopsy governs when known.' };
    if (PAGET.test(v.nipple || '')) return { cat: 'Tis(Paget)' };
    return { cat: 'T0', note: treated(v) ? 'No residual invasive carcinoma after presurgical therapy: ypT0.' : 'No residual invasive carcinoma: pT0 in this specimen; the invasive category from the prior biopsy governs when known.' };
  }
  if (v.inflammatory === true) return { cat: 'T4d' };
  const a = T4a(v); const b = T4b(v);
  if (a && b) return { cat: 'T4c' };
  if (a) return { cat: 'T4a' };
  if (b) return { cat: 'T4b' };
  const mm = num(v.sizeMm);
  const cat = sizeT(mm, v.sizeMode === 'Microinvasion only');
  if (!cat) return { cat: 'TX', note: 'pTX: enter the greatest dimension of the largest contiguous invasive focus (mm) to derive pT.' };
  return { cat };
}

/** Node counts read once for N() and the generator. */
export function nodeCounts(v) {
  const examined = int(v.nodesExamined);
  const sentinel = int(v.nodesSentinel);
  const macro = int(v.nodesMacro);
  const micro = int(v.nodesMicro);
  const itc = int(v.nodesItc);
  return { examined, sentinel, macro, micro, itc, positive: macro + micro };
}

export function N(v) {
  const c = nodeCounts(v);
  const sampling = String(v.nodeSampling || '');
  if (sampling === 'No nodes submitted' || (c.examined === 0 && !v.imNodes?.startsWith('Positive') && !v.supraclavicular && !v.infraclavicular)) {
    return { cat: 'NX', none: true, note: 'pNX: no regional lymph nodes examined.' };
  }
  const sn = /^Sentinel node biopsy only/.test(sampling) && c.examined <= 5 ? '(sn)' : '';
  const im = String(v.imNodes || '');
  const imMicro = im === 'Positive (sentinel, microscopic)';
  const imClin = im === 'Positive (clinically detected)';
  if (v.supraclavicular === true) return { cat: `N3c${sn}` };
  let cat;
  if (c.positive >= 10 || v.infraclavicular === true) cat = 'N3a';
  else if (c.positive >= 4) cat = (imMicro || imClin) ? 'N3b' : 'N2a';
  else if (c.positive >= 1) {
    if (imClin) cat = 'N3b';
    else if (c.macro === 0) cat = 'N1mi';
    else cat = imMicro ? 'N1c' : 'N1a';
  } else if (imClin) cat = 'N2b';
  else if (imMicro) cat = 'N1b';
  else if (c.itc > 0) cat = 'N0(i+)';
  else if (v.nodeMolPos === true) cat = 'N0(mol+)';
  else cat = 'N0';
  const note = cat === 'N1mi' && c.micro >= 1 && (imMicro) ? 'Micrometastases with an internal mammary sentinel node: pN1mi is retained; N1c requires a macrometastasis.' : undefined;
  return { cat: `${cat}${sn}`, note };
}

export function M(v) {
  const present = v.distantMets === 'Present' || arr(v.distantSites).length > 0;
  if (!present) return { cat: 'M-' };
  return { cat: 'M1' };
}

export function descriptors(v) {
  const d = [];
  if (/^Multiple foci/.test(String(v.focality || ''))) d.push('m');
  if (v.recurrent === true) d.push('r');
  if (treated(v)) d.push('y');
  return d;
}

/** Strip the (sn) / (f) suffix and the i+ / mol+ qualifiers to the grouping category. */
export function bareN(N) {
  const n = String(N || '').replace(/\((sn|f)\)$/i, '');
  if (/^N0/.test(n)) return 'N0';
  return n;
}

export function stageGroup(Tc, Nc, Mc) {
  if (Mc === 'M1') return 'IV';
  const t = String(Tc || '');
  const n = bareN(Nc);
  if (t === 'TX' || n === 'NX') return null;
  const T0 = t === 'T0', Tis = /^Tis/.test(t), T1 = /^T1/.test(t), T2 = t === 'T2', T3 = t === 'T3', T4 = /^T4/.test(t);
  if (/^N3/.test(n)) return 'IIIC';
  if (T4) return 'IIIB';
  if (/^N2/.test(n)) return 'IIIA';
  if (n === 'N1mi') {
    if (T0 || T1 || Tis) return 'IB';
    if (T2) return 'IIB';
    if (T3) return 'IIIA';
  }
  if (/^N1/.test(n)) {
    if (T0 || T1 || Tis) return 'IIA';
    if (T2) return 'IIB';
    if (T3) return 'IIIA';
  }
  // N0
  if (Tis) return '0';
  if (T1 || T0) return T0 ? null : 'IA';
  if (T2) return 'IIA';
  if (T3) return 'IIB';
  return null;
}
