// Oesophageal carcinoma — AJCC 8th edition pTNM, as displayed on the QMH GI-Esophagus
// page. Field ids belong to schemas/oesophageal_carcinoma.json.
//
// pT is read straight from the "Tumour extension" pick list; the T4a / T4b split is read
// from the adjacent-structure detail when typed (pleura, pericardium, azygos vein,
// diaphragm and peritoneum are T4a; aorta, vertebral body and airway are T4b; "serosa
// (visceral peritoneum)" maps to T4a). pN derives from the involved-node count (1-2 / 3-6
// / 7+). Stage groups follow the AJCC 8th pathological tables: adenocarcinoma and squamous
// cell carcinoma have different groups in stage I / II (the squamous table also needs the
// tumour zone — lower oesophagus / EGJ against upper / middle thoracic); the grade carries
// the group choice at pT1-3 N0. Post-neoadjuvant cases (y descriptor) use the single
// shared ypTNM table, which does not distinguish histology or grade (AJCC 8e chapter 16).

export const id = 'oesophagus';
export const edition = 'AJCC 8th edition';

const num = (x) => { const n = parseFloat(String(x ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

/** schema 'tumourExtension' option -> bare pT category; adjacent-structure detail refines T4a / T4b. */
export const EXTENSION_T = [
  [/No evidence of primary/, 'T0'],
  [/carcinoma in situ/i, 'Tis'],
  [/muscularis propria/i, 'T2'],
  [/muscularis mucosae/i, 'T1a'],
  [/lamina propria/i, 'T1a'],
  [/submucosa/i, 'T1b'],
  [/adventitia/i, 'T3'],
  [/serosa \(visceral peritoneum\)/i, 'T4a'],
  [/adjacent structures/i, 'T4'],
  [/cannot be assessed/i, 'TX']
];

const T4A_STRUCTURES = /pleura|pericard|azygos|diaphragm|peritone/i;
const T4B_STRUCTURES = /aorta|aortic|vertebr|airway|trachea|bronch/i;

/** 'T4a' | 'T4b' from the typed adjacent structures; unrecognised wording returns 'T4b' (the lesser claim is not safe). */
export function t4FromDetail(detail) {
  const d = String(detail || '');
  if (T4B_STRUCTURES.test(d)) return 'T4b';
  if (T4A_STRUCTURES.test(d)) return 'T4a';
  return d.trim() ? 'T4b' : null;
}

export function tFromExtension(option, detail) {
  const o = String(option || '');
  for (const [re, cat] of EXTENSION_T) {
    if (!re.test(o)) continue;
    if (cat === 'T4') return t4FromDetail(detail) || 'T4X-equivalent';
    return cat;
  }
  return null;
}

export function T(v) {
  const opt = v.tumourExtension || '';
  if (!opt) return { cat: 'TX', note: 'Tumour extension not recorded; pT cannot be assigned.' };
  const cat = tFromExtension(opt, v.extensionDetail);
  if (cat === 'T4X-equivalent') return { cat: 'TX', note: 'Direct invasion of adjacent structures recorded without naming a structure; specify the structure to separate T4a from T4b.' };
  if (!cat) return { cat: 'TX', note: `Tumour extension "${opt.slice(0, 40)}" has no pT mapping.` };
  const notes = { T0: 'No evidence of primary tumour (ypT0 after complete pathological response).' };
  return notes[cat] ? { cat, note: notes[cat] } : { cat };
}

export function N(v) {
  const examined = int(v.nodesExamined);
  const involved = int(v.nodesInvolved);
  if (examined === null || examined === 0) return { cat: 'NX', note: 'No regional lymph nodes submitted; pN not assigned.' };
  if (involved === null) return { cat: 'NX', note: 'Number of involved lymph nodes not recorded; pN cannot be assigned.' };
  if (involved === 0) return { cat: 'N0' };
  if (involved <= 2) return { cat: 'N1' };
  if (involved <= 6) return { cat: 'N2' };
  return { cat: 'N3' };
}

/** Distant-metastasis options that carry M1. */
export const M1_SITES = /^(Non-regional lymph node|Liver|Other site)/;

export function M(v) {
  return arr(v.distantMets).some((s) => M1_SITES.test(s)) ? { cat: 'M1' } : { cat: 'M-' };
}

export function descriptors(v) {
  const d = [];
  if (v.multiplePrimaries === true) d.push('m');
  if (v.recurrent === true) d.push('r');
  const te = v.treatmentEffect || 'No known presurgical therapy';
  if (te && !/^No known|^Cannot/.test(te)) d.push('y');
  return d;
}

// ---------- histology family, grade and tumour zone (pathological tables need them) ----------

const SCC_TYPES = /^(Squamous cell carcinoma|Basaloid squamous|Spindle cell squamous|Verrucous squamous|Adenosquamous|Mixed squamous)/;
const ADENO_TYPES = /^(Adenocarcinoma|Mixed adenocarcinoma)/;
const NEC_TYPES = /^(Large cell neuroendocrine|Small cell neuroendocrine|Neuroendocrine carcinoma)/;

/** 'scc' | 'adenoca' | null — the pathological stage table that applies (AJCC 8e: NEC and undifferentiated carcinomas follow the squamous table as G3). */
export function stagingFamily(histType) {
  const h = String(histType || '');
  if (SCC_TYPES.test(h) || NEC_TYPES.test(h)) return 'scc';
  if (ADENO_TYPES.test(h)) return 'adenoca';
  if (/Undifferentiated carcinoma/.test(h)) return 'scc';   // AJCC 8e: undifferentiated stages as G3 SCC
  return null;
}

/** 'G1' | 'G2' | 'G3' | 'GX' from the schema grade option; unlisted types (adenoid cystic etc.) return null. */
export function gradeOf(v) {
  const g = String(v.grade || '');
  if (/^G1/.test(g)) return 'G1';
  if (/^G2/.test(g)) return 'G2';
  if (/^G3/.test(g)) return 'G3';
  if (/^GX/.test(g)) return 'GX';
  return null;
}

/** 'lower' | 'upperMid' | 'X' from the tumour-site option (used only for pT3 N0 squamous cases). */
export function siteZone(site) {
  const s = String(site || '');
  if (/Distal|junction \(EGJ\)|cardia/i.test(s)) return 'lower';
  if (/Cervical|upper thoracic|middle thoracic/i.test(s)) return 'upperMid';
  return 'X';
}

/** Effective grade for the tables: undifferentiated and NEC families are graded G3 by definition. */
function effGrade(v) {
  const g = gradeOf(v);
  if (g) return g;
  if (NEC_TYPES.test(String(v.histType || '')) || /Undifferentiated carcinoma/.test(String(v.histType || ''))) return 'G3';
  return 'GX';
}

/**
 * Pathological stage groups (AJCC 8e oesophagus, Rice et al. 2017).
 * Adenocarcinoma (no zone): T1a N0 G1/X IA; T1a N0 G2 + T1b N0 G1-2/X IB; T1 N0 G3 +
 * T2 N0 G1-2 IC; T2 N0 G3/X IIA; T1 N1 + T3 N0 IIB; T1 N2 + T2 N1 IIIA; T2 N2 + T3 N1-2 +
 * T4a N0-1 IIIB; T4a N2 + T4b N0-2 + any N3 IVA; M1 IVB.
 * Squamous follows the same cell table but (T1a N0 G1/X IA; T1b N0 G1/X IB; T1 N0 G2-3 +
 * T2 N0 G1 IB) and pT3 N0 splits by zone: lower any grade or upper/mid G1 = IIA,
 * upper/mid G2-3 or grade/zone unknown = IIB.
 * ypTNM table (yp only, shared by both histologies, no grade/zone): T0-2 N0 I; T3 N0 II;
 * T0-2 N1 IIIA; T3 N1 + T0-3 N2 + T4a N0 IIIB; T4a N1-2/X + T4b N0-2 + any N3 IVA; M1 IVB.
 */
export function stageGroup(TC, NC, MC, values = {}) {
  if (MC === 'M1') return 'IVB';
  if (TC === 'Tis' && NC === 'N0') return '0';
  const y = (values.treatmentEffect || '') && !/^No known|^Cannot/.test(values.treatmentEffect);
  if (y) {
    if (TC === 'T0' || TC === 'T1a' || TC === 'T1b' || TC === 'T2' || TC === 'Tis') {
      if (NC === 'N0') return 'I';
      if (NC === 'N1') return 'IIIA';
      if (NC === 'N2') return 'IIIB';
      if (NC === 'N3') return 'IVA';
    }
    if (TC === 'T3') {
      if (NC === 'N0') return 'II';
      if (NC === 'N1' || NC === 'N2') return 'IIIB';
      if (NC === 'N3') return 'IVA';
    }
    if (TC === 'T4a') {
      if (NC === 'N0') return 'IIIB';
      if (NC === 'N1' || NC === 'N2' || NC === 'N3' || NC === 'NX') return 'IVA';
    }
    if (TC === 'T4b') return 'IVA';
    return null;
  }
  if (NC === 'N3') return 'IVA';
  const family = stagingFamily(values.histType) || 'adenoca';
  const g = effGrade(values);
  if (family === 'adenoca') {
    if (TC === 'T1a' && NC === 'N0') return g === 'G3' ? 'IC' : g === 'G2' ? 'IB' : 'IA';
    if (TC === 'T1b' && NC === 'N0') return 'IB';
    if (TC === 'T1' && NC === 'N0') return g === 'G3' ? 'IC' : null;
    if (TC === 'T2' && NC === 'N0') return /^G[12]$/.test(g) ? 'IC' : 'IIA';
    if (NC === 'N1' && (TC === 'T1a' || TC === 'T1b')) return 'IIB';
    if (NC === 'N2' && (TC === 'T1a' || TC === 'T1b')) return 'IIIA';
    if (NC === 'N1' && TC === 'T2') return 'IIIA';
    if (NC === 'N2' && TC === 'T2') return 'IIIB';
    if (TC === 'T3' && NC === 'N0') return 'IIB';
    if (TC === 'T3' && (NC === 'N1' || NC === 'N2')) return 'IIIB';
    if (TC === 'T4a' && (NC === 'N0' || NC === 'N1')) return 'IIIB';
    if (TC === 'T4a' && NC === 'N2') return 'IVA';
    if (TC === 'T4b') return 'IVA';
    if (TC === 'T0') return null;
    return null;
  }
  // squamous
  if (TC === 'T1a' && NC === 'N0') return g === 'G1' || g === 'GX' ? 'IA' : 'IB';
  if (TC === 'T1b' && NC === 'N0') return 'IB';
  if (TC === 'T1' && NC === 'N0') return /^G[23]$/.test(g) ? 'IB' : null;
  if (TC === 'T2' && NC === 'N0') return g === 'G1' ? 'IB' : 'IIA';
  if (TC === 'T3' && NC === 'N0') {
    const zone = siteZone(values.tumourSite);
    if (zone === 'lower') return 'IIA';                                  // any grade
    if (zone === 'upperMid' && g === 'G1') return 'IIA';
    return 'IIB';                                                        // upper/mid G2-3, grade X, or zone unknown
  }
  if (NC === 'N1' && (TC === 'T1a' || TC === 'T1b')) return 'IIB';
  if (NC === 'N2' && (TC === 'T1a' || TC === 'T1b')) return 'IIIA';
  if (NC === 'N1' && TC === 'T2') return 'IIIA';
  if (NC === 'N2' && TC === 'T2') return 'IIIB';
  if (TC === 'T3' && (NC === 'N1' || NC === 'N2')) return 'IIIB';
  if (TC === 'T4a' && (NC === 'N0' || NC === 'N1')) return 'IIIB';
  if (TC === 'T4a' && NC === 'N2') return 'IVA';
  if (TC === 'T4b') return 'IVA';
  if (TC === 'T0') return null;
  return null;
}
