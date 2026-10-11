// Hepatocellular carcinoma — AJCC 8th edition pTNM (liver chapter), as displayed on the QMH GI-HCC
// page (CAP Hepatocellular 4.3.0.0). Field ids belong to schemas/hcc.json. Card: docs/roadmap.md
// "HCC — resection synoptic" (pulled by the user 2026-10-02); definitions quoted with their sources in
// docs/reference/hcc-morphology.md.
//
// pT (QMH option text, AJCC 8th): pT1a solitary tumour <= 2 cm; pT1b solitary tumour > 2 cm without
// vascular invasion; pT2 solitary tumour > 2 cm with vascular invasion, or multiple tumours, none > 5 cm;
// pT3 multiple tumours, at least one > 5 cm; pT4 single or multiple tumours of any size involving a major
// branch of the portal vein or hepatic vein, or tumour(s) with direct invasion of adjacent organs other than
// the gallbladder or with perforation of visceral peritoneum.
// - Multiplicity is the number of tumours recorded; satellitosis counts as multiple tumours (AJCC: multiple
//   tumours include satellitosis, multifocal tumours and intrahepatic metastases).
// - Vascular invasion is the microscopic or gross invasion recorded under "Vascular invasion"; large vessel
//   invasion (a major branch of the portal or hepatic vein) and the matching extension ticks grade pT4.
// - Direct invasion of the gallbladder does not change the category; the diaphragm and other adjacent organs,
//   and perforation of the visceral peritoneum, grade pT4.
// - Complete necrosis after treatment (no viable tumour) is ypT0: the y-classification stages viable tumour.
// pN: N0 / N1 from the involved-node count; no nodes submitted is NX. pM: a non-regional node or another
// distant site is M1 (intrahepatic spread is multiplicity, not M1).
// Stage groups: T1a N0 IA; T1b N0 IB; T2 N0 II; T3 N0 IIIA; T4 N0 IIIB; any T N1 IVA; any M1 IVB.

export const id = 'hcc';
export const edition = 'AJCC 8th edition';

const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const num = (x) => { const n = parseFloat(String(x ?? '').trim()); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

/** The QMH tumour-extension options (British spelling) and what each does to pT. Keep in step with the schema. */
export const EXTENSION = {
  confined: 'Tumour confined to liver',
  portal: 'Tumour involves a major branch of the portal vein',
  hepaticVein: 'Tumour involves hepatic vein(s)',
  peritoneum: 'Tumour involves (perforates) visceral peritoneum',
  gallbladder: 'Tumour directly invades gallbladder',
  diaphragm: 'Tumour directly invades diaphragm',
  other: 'Tumour directly invades other adjacent organs (specify)',
  cannot: 'Cannot be assessed',
  none: 'No evidence of primary tumour'
};
const T4_EXTENSION = [EXTENSION.portal, EXTENSION.hepaticVein, EXTENSION.peritoneum, EXTENSION.diaphragm, EXTENSION.other];

export const LARGE_VESSEL = /^Present, large vessel invasion/;
export const ANY_VESSEL = /^Present/;
export const COMPLETE_NECROSIS = /^Complete necrosis/;

/** Number of tumours for staging: the count entered, or two or more when satellitosis is present. */
export function tumourNumber(v) {
  const n = int(v.tumourCount);
  if (v.satellitosis === 'Present') return { n: Math.max(n ?? 1, 2), satellites: true };
  return { n, satellites: false };
}

export function T(v) {
  const ext = arr(v.tumourExtension);
  if (ext.includes(EXTENSION.none)) return { cat: 'T0' };
  if (COMPLETE_NECROSIS.test(v.treatmentEffect || '')) return { cat: 'T0', note: 'Complete necrosis after treatment (no viable tumour): ypT0.' };
  const t4 = ext.filter((s) => T4_EXTENSION.includes(s));
  if (t4.length) return { cat: 'T4', note: `${t4[0]}: pT4.` };
  if (LARGE_VESSEL.test(v.vascularInvasion || '')) return { cat: 'T4', note: 'Large vessel invasion (a major branch of the portal or hepatic vein): pT4.' };
  const size = num(v.tumourSizeCm);
  const { n, satellites } = tumourNumber(v);
  if (n === null) return { cat: 'TX', note: 'Number of tumours not recorded; pT cannot be assigned.' };
  if (size === null) return { cat: 'TX', note: 'Size of the largest tumour not recorded; pT cannot be assigned.' };
  if (n >= 2) {
    const why = satellites && (int(v.tumourCount) ?? 1) < 2 ? ' (satellitosis counts as multiple tumours)' : '';
    return size > 5 ? { cat: 'T3', note: `Multiple tumours, at least one larger than 5 cm${why}: pT3.` } : { cat: 'T2', note: `Multiple tumours, none larger than 5 cm${why}: pT2.` };
  }
  if (size <= 2) return { cat: 'T1a' };
  if (ANY_VESSEL.test(v.vascularInvasion || '')) return { cat: 'T2', note: 'Solitary tumour larger than 2 cm with vascular invasion: pT2.' };
  if (!v.vascularInvasion || /^Cannot/.test(v.vascularInvasion)) return { cat: 'T1', note: 'Vascular invasion not assessed: a solitary tumour larger than 2 cm is pT1b only without it.' };
  return { cat: 'T1b' };
}

export function N(v) {
  const examined = int(v.nodesExamined);
  const involved = int(v.nodesInvolved);
  if (examined === null || examined === 0) return { cat: 'NX', none: true, note: 'No regional lymph nodes submitted; pN not assigned.' };
  if (involved === null) return { cat: 'NX', note: 'Number of involved lymph nodes not recorded; pN cannot be assigned.' };
  return { cat: involved > 0 ? 'N1' : 'N0' };
}

/** Distant-metastasis options that carry M1. */
export const M1_SITES = /^(Non-regional lymph node|Other)/;

export function M(v) {
  return arr(v.distantMets).some((s) => M1_SITES.test(s)) ? { cat: 'M1' } : { cat: 'M-' };
}

export function descriptors(v) {
  const d = [];
  if (v.multiplePrimaries === true) d.push('m');
  if (v.recurrent === true) d.push('r');
  const te = v.treatmentEffect || 'No known presurgical therapy';
  if (!/^No known|^Cannot/.test(te)) d.push('y');
  return d;
}

/** AJCC 8th edition HCC stage groups. */
export function stageGroup(TC, NC, MC) {
  if (MC === 'M1') return 'IVB';
  if (NC === 'N1') return 'IVA';
  if (NC !== 'N0') return null;
  return { T1a: 'IA', T1b: 'IB', T2: 'II', T3: 'IIIA', T4: 'IIIB' }[TC] || null;
}
