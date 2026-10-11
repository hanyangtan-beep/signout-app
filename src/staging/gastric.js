// Gastric carcinoma — AJCC 8th edition pTNM, as displayed on the QMH GI-Stomach page
// (gastric resection and endoscopic-resection elements). Field ids belong to
// schemas/gastric_carcinoma.json.
//
// pT is read straight from the "Tumour extension" pick list (CAP element, one option per
// category); submucosal depth / extent (SM1-3) and ulceration stay on the synoptic only and
// never change pT1b. pN derives from the number of involved regional nodes; AJCC recommends
// >= 16 nodes for an accurate N but N is staged from whatever was examined, so a low count
// surfaces as a Checks warning in the generator, not here. Stage groups use the AJCC 8th
// pathological table with the N3a / N3b split (the split matters at T1-3 N3).

export const id = 'gastric';
export const edition = 'AJCC 8th edition';

const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

/** schema 'tumourExtension' option -> bare pT category.
 * Order matters: the T3 string mentions "adjacent structures", so T3 is tested before
 * T4b, and "muscularis propria" (T2) before "muscularis mucosae" (T1a). */
export const EXTENSION_T = [
  [/No evidence of primary/, 'T0'],
  [/Carcinoma in situ/, 'Tis'],
  [/muscularis propria/, 'T2'],
  [/subserosal connective tissue/, 'T3'],
  [/adjacent structures/, 'T4b'],
  [/serosa \(visceral peritoneum\)/, 'T4a'],
  [/muscularis mucosae|lamina propria/, 'T1a'],
  [/submucosa/, 'T1b'],
  [/Cannot be (assessed|determined)/, 'TX']
];

/** pT from the extension option string (exact schema values). */
export function tFromExtension(option) {
  const o = String(option || '');
  for (const [re, cat] of EXTENSION_T) if (re.test(o)) return cat;
  return null;
}

export function T(v) {
  const opt = v.tumourExtension || '';
  if (!opt) return { cat: 'TX', note: 'Tumour extension not recorded; pT cannot be assigned.' };
  const cat = tFromExtension(opt);
  if (!cat) return { cat: 'TX', note: `Tumour extension "${opt.slice(0, 40)}" has no pT mapping.` };
  const notes = { T0: 'No evidence of primary tumour (ypT0 after complete pathological response).' };
  return notes[cat] ? { cat, note: notes[cat] } : { cat };
}

export function N(v) {
  const examined = int(v.nodesExamined);
  const involved = int(v.nodesInvolved);
  if (examined === null || examined === 0) return { cat: 'NX', none: true, note: 'No regional lymph nodes submitted; pN not assigned.' };
  if (involved === null) return { cat: 'NX', note: 'Number of involved lymph nodes not recorded; pN cannot be assigned.' };
  if (involved === 0) return { cat: 'N0' };
  if (involved <= 2) return { cat: 'N1' };
  if (involved <= 6) return { cat: 'N2' };
  if (involved <= 15) return { cat: 'N3a' };
  return { cat: 'N3b' };
}

/** Distant-metastasis options that carry M1 (the "Not ..." choices do not). */
export const M1_SITES = /^(Non-regional lymph node|Liver|Peritoneum|Other site)/;

export function M(v) {
  const chosen = arr(v.distantMets).filter((s) => M1_SITES.test(s));
  return chosen.length ? { cat: 'M1' } : { cat: 'M-' };
}

export function descriptors(v) {
  const d = [];
  if (v.multiplePrimaries === true) d.push('m');
  if (v.recurrent === true) d.push('r');
  const te = v.treatmentEffect || 'No known presurgical therapy';
  if (te && !/^No known|^Cannot/.test(te)) d.push('y');
  return d;
}

/**
 * Pathological stage groups (AJCC 8e stomach), N3a / N3b split where it matters:
 * T1:  N3a IIB, N3b IIIB.  T2: N3a IIIA, N3b IIIB.  T3: N3a IIIB, N3b IIIC.
 * T4a: N3a IIIB, N3b IIIC. T4b: N0/N1 IIIB, N2+ IIIC. Any M1 -> IV.
 */
const GROUP = {
  Tis: { N0: '0' },
  T0: {},
  T1a: { N0: 'IA', N1: 'IB', N2: 'IIA', N3a: 'IIB', N3b: 'IIIB' },
  T1b: { N0: 'IA', N1: 'IB', N2: 'IIA', N3a: 'IIB', N3b: 'IIIB' },
  T1: { N0: 'IA', N1: 'IB', N2: 'IIA', N3a: 'IIB', N3b: 'IIIB' },
  T2: { N0: 'IB', N1: 'IIA', N2: 'IIB', N3a: 'IIIA', N3b: 'IIIB' },
  T3: { N0: 'IIA', N1: 'IIB', N2: 'IIIA', N3a: 'IIIB', N3b: 'IIIC' },
  T4a: { N0: 'IIB', N1: 'IIIA', N2: 'IIIB', N3a: 'IIIB', N3b: 'IIIC' },
  T4b: { N0: 'IIIB', N1: 'IIIB', N2: 'IIIC', N3a: 'IIIC', N3b: 'IIIC' }
};

export function stageGroup(TC, NC, MC) {
  if (MC === 'M1') return 'IV';
  if (TC === 'Tis' && NC === 'N0') return '0';
  return GROUP[TC]?.[NC] || null;
}

// ---------- JCGC eCura C scoring (post-ESD management) ----------

/** Point value carried by each eCura element (JCGC 7e eCura score: lymphatic invasion 3, the rest 1). */
export const ECURA_POINTS = { ecuraLy: 3, ecuraSize: 1, ecuraVm: 1, ecuraV: 1, ecuraSm: 1 };
export const ECURA_LABELS = {
  ecuraLy: 'Lymphatic invasion (Ly)', ecuraSize: 'Tumour size more than 30 mm',
  ecuraVm: 'Positive vertical margin (VM)', ecuraV: 'Venous invasion (V)', ecuraSm: 'Submucosal invasion 500 um or more (SM2)'
};
const present1 = (x) => /^Present/.test(String(x || ''));

/**
 * eCura C score and risk band (page legend: Low risk 0-2 points, about 2.5 % LNM risk;
 * intermediate 3-4 points; high 5-7 points).
 */
export function ecura(v) {
  let score = 0;
  let undetermined = [];
  for (const k of Object.keys(ECURA_POINTS)) {
    const x = String(v[k] || '');
    if (present1(x)) score += ECURA_POINTS[k];
    else if (/Cannot be determined/.test(x)) undetermined.push(ECURA_LABELS[k]);
  }
  const band = score <= 2 ? 'Low risk (0-2 points)' : score <= 4 ? 'Intermediate risk (3-4 points)' : 'High risk (5-7 points)';
  return { score, band, undetermined };
}
