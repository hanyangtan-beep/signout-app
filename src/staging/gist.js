// Gastrointestinal stromal tumour — AJCC 8th edition (CAP GIST Resection 4.3.0.0, Dec 2022) with
// the Miettinen and Lasota (2006) risk table used by the QMH GI-GIST page.
// Field values referenced here belong to the gist_resection schema.

export const id = 'gist';
export const edition = 'AJCC 8th edition';

const num = (x) => { const n = parseFloat(String(x ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };

/** Sites staged with the gastric table (AJCC groups omental GIST with gastric). */
export const GASTRIC_GROUP = ['Stomach', 'Omentum'];
export const isGastricGroup = (v) => GASTRIC_GROUP.includes(v.tumourSite);

/** pT from the greatest dimension in cm: T1 <= 2, T2 > 2-5, T3 > 5-10, T4 > 10. */
export function tFromSize(cm) {
  if (cm === null || cm < 0) return null;
  if (cm <= 2) return 'T1';
  if (cm <= 5) return 'T2';
  if (cm <= 10) return 'T3';
  return 'T4';
}

export function T(v) {
  if (v.residualTumour === 'No residual tumour (complete response)') return { cat: 'T0', note: 'No residual primary tumour after therapy (ypT0).' };
  const cm = num(v.tumourSize);
  const cat = tFromSize(cm);
  if (!cat) return { cat: 'TX', note: 'Tumour size not recorded; pT cannot be assigned.' };
  return { cat };
}

export function N(v) {
  const examined = int(v.nodesExamined);
  const positive = int(v.nodesPositive);
  if (examined === null || examined === 0) return { cat: 'NX', none: true, note: 'No regional lymph nodes submitted; pN not assigned (nodal metastasis is rare in GIST and the stage group assumes N0).' };
  if (positive === null) return { cat: 'NX', note: 'Number of involved nodes not recorded; pN cannot be assigned.' };
  return { cat: positive > 0 ? 'N1' : 'N0' };
}

export const METASTASIS_SITES = ['Non-regional lymph node(s)', 'Liver', 'Peritoneum', 'Other site'];

export function M(v) {
  const sites = Array.isArray(v.distantMetastasis) ? v.distantMetastasis.filter((s) => METASTASIS_SITES.includes(s)) : [];
  return sites.length ? { cat: 'M1' } : { cat: 'M-' };
}

export function descriptors(v) {
  const d = [];
  if ((v.focality || '') === 'Multifocal') d.push('m');
  if (v.recurrent === true) d.push('r');
  if (v.treatmentEffect && v.treatmentEffect !== 'No known presurgical therapy' && v.treatmentEffect !== 'Cannot be determined') d.push('y');
  return d;
}

/** Mitotic rate class: 'low' (<= 5 per 5 mm2), 'high' (> 5), or null when not counted. */
export function mitoticClass(v) {
  if (v.mitoticStatus && v.mitoticStatus !== 'Counted') return null;
  const n = num(v.mitoticCount);
  if (n === null) return null;
  return n > 5 ? 'high' : 'low';
}

/** CAP histologic grade line derived from the mitotic count. */
export function gradeFromMitoses(v) {
  const c = mitoticClass(v);
  if (c === 'low') return 'G1: Low grade; mitotic rate 5 or fewer per 5 mm2';
  if (c === 'high') return 'G2: High grade; mitotic rate more than 5 per 5 mm2';
  return 'GX: Cannot be assessed';
}

/**
 * AJCC 8th edition stage groups. Gastric and omental GISTs use one table, all other sites
 * (small intestine, oesophagus, colorectum, mesentery, peritoneum) the other; both split by
 * mitotic rate. NX is staged as N0 (AJCC permits cN0/pN0 when nodes are not assessed).
 */
export function stageGroup(T, N, M, v = {}) {
  if (M === 'M1') return 'IV';
  if (N === 'N1') return 'IV';
  if (T === 'TX' || T === 'T0') return null;
  if (N !== 'N0' && N !== 'NX') return null;
  const mit = mitoticClass(v);
  if (!mit) return null;
  const low = mit === 'low';
  if (isGastricGroup(v)) {
    if (T === 'T1' || T === 'T2') return low ? 'IA' : 'II';
    if (T === 'T3') return low ? 'IB' : 'IIIA';
    if (T === 'T4') return low ? 'II' : 'IIIB';
    return null;
  }
  if (T === 'T1' || T === 'T2') return low ? 'I' : (T === 'T1' ? 'IIIA' : 'IIIB');
  if (T === 'T3') return low ? 'II' : 'IIIB';
  if (T === 'T4') return low ? 'IIIA' : 'IIIB';
  return null;
}

// ---------- Miettinen and Lasota 2006 risk of progressive disease ----------

const RISK_COLUMN = {
  Stomach: 'gastric', Omentum: 'gastric', Duodenum: 'duodenum', Jejunum: 'jejunumIleum', Ileum: 'jejunumIleum',
  'Small intestine (not otherwise specified)': 'jejunumIleum', Rectum: 'rectum'
};
export const RISK_TABLE_SITES = Object.keys(RISK_COLUMN);
// Rows: size band x mitotic class. 'insufficient' = insufficient data in the source table.
const RISK_TABLE = {
  gastric: { low: ['None', 'Very low risk', 'Low risk', 'Moderate risk'], high: ['None', 'Moderate risk', 'High risk', 'High risk'] },
  duodenum: { low: ['None', 'Low risk', 'insufficient', 'High risk'], high: ['insufficient', 'High risk', 'insufficient', 'High risk'] },
  jejunumIleum: { low: ['None', 'Low risk', 'Moderate risk', 'High risk'], high: ['High risk', 'High risk', 'High risk', 'High risk'] },
  rectum: { low: ['None', 'Low risk', 'insufficient', 'High risk'], high: ['High risk', 'High risk', 'insufficient', 'High risk'] }
};
const sizeBand = (cm) => (cm <= 2 ? 0 : cm <= 5 ? 1 : cm <= 10 ? 2 : 3);

/**
 * @returns {{category: string, note?: string, derived: boolean}}
 *   category is one of the QMH pick-list values: None, Very low risk, Low risk, Moderate risk,
 *   High risk, Overtly malignant/metastatic, Cannot be determined.
 */
export function riskAssessment(v) {
  const manual = v.riskAssessment && v.riskAssessment !== 'Derive from site, size and mitotic count' ? v.riskAssessment : null;
  if (manual) return { category: manual, derived: false };
  if (M(v).cat === 'M1' || N(v).cat === 'N1') return { category: 'Overtly malignant/metastatic', derived: true };
  const cm = num(v.tumourSize);
  const mit = mitoticClass(v);
  if (cm === null || !mit) return { category: 'Cannot be determined', derived: true, note: `Risk cannot be derived: ${cm === null ? 'tumour size' : 'mitotic count'} not recorded.` };
  const site = v.tumourSite || '';
  const column = RISK_COLUMN[site];
  const table = RISK_TABLE[column || 'jejunumIleum'];
  const cell = table[mit][sizeBand(cm)];
  let note;
  if (!column && site) note = `Risk for ${site.toLowerCase()} GIST assessed with the small-intestinal (jejunum / ileum) criteria; data for this site are limited.`;
  if (!site) note = 'Tumour site not recorded; risk assessed with the small-intestinal criteria.';
  if (cell === 'insufficient') return { category: 'Cannot be determined', derived: true, note: `Insufficient data in the Miettinen and Lasota table for a ${column} GIST of this size and mitotic rate.` };
  return { category: cell, derived: true, note };
}
