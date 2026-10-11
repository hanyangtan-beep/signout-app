// Carcinoma of the pancreas (exocrine) — AJCC 8th edition pTNM.
// Field ids belong to schemas/pancreas_carcinoma.json.
//
// The eighth edition rewrote this chapter and the rewrite is the thing most likely to be got
// wrong by anyone porting rules from an older template, so it is stated plainly here: pT1 to
// pT3 are decided by SIZE ALONE. Extrapancreatic extension does not raise the category the way
// it did in the seventh edition, where T3 meant "extends beyond the pancreas". A 1 cm tumour
// with peripancreatic soft-tissue involvement is pT1b, not pT3. The only extension that moves
// the category is arterial: coeliac axis, superior mesenteric artery or common hepatic artery
// involvement is pT4 irrespective of size. Venous involvement (superior mesenteric vein, portal
// vein) does NOT make a tumour T4 in this edition — a deliberate change from the seventh, and a
// common slip, so `VESSEL_T4` matches the three arteries only.
//
//   Tis  carcinoma in situ / high-grade dysplasia (PanIN-3, IPMN/ITPN/MCN with high-grade dysplasia)
//   T1   <= 2 cm     T1a <= 0.5 cm   T1b > 0.5 and <= 1 cm   T1c > 1 and <= 2 cm
//   T2   > 2 and <= 4 cm
//   T3   > 4 cm
//   T4   coeliac axis, superior mesenteric artery and/or common hepatic artery, any size
//   N1   1 to 3 involved regional nodes      N2   4 or more
//
// Stage groups (AJCC 8e pancreas): Tis N0 stage 0; T1 N0 IA; T2 N0 IB; T3 N0 IIA;
// T1-T3 N1 IIB; T1-T3 N2 III; T4 any N III; any M1 IV.
// Confirmed against the CAP protocol Pancreas (Exocrine) v4.3.0.0 (June 2025) and the NDRS
// staging sheet https://digital.nhs.uk/ndrs/data/cancer-data-training-materials/staging-sheets/pancreas

export const id = 'pancreas';
export const edition = 'AJCC 8th edition';

const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const num = (x) => { const n = parseFloat(String(x ?? '').trim()); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

/** The three arteries that grade pT4. Veins are excluded on purpose — see the header. */
export const VESSEL_T4 = /^(Coeliac axis|Celiac axis|Superior mesenteric artery|Common hepatic artery)/i;
const IN_SITU = /^(No invasion|Carcinoma in situ)/i;
const NO_PRIMARY = /^No evidence of primary/i;

/** Size in cm -> bare T category, subdividing T1. */
export function sizeCategory(cm) {
  if (cm === null) return null;
  if (cm <= 0.5) return 'T1a';
  if (cm <= 1) return 'T1b';
  if (cm <= 2) return 'T1c';
  if (cm <= 4) return 'T2';
  return 'T3';
}

export function T(v) {
  const ticks = arr(v.tumourExtension);
  if (ticks.some((s) => NO_PRIMARY.test(s))) return { cat: 'T0' };
  const artery = ticks.find((s) => VESSEL_T4.test(s));
  if (artery) return { cat: 'T4', note: `Involvement of the ${artery.replace(/:.*$/, '').trim().toLowerCase()} grades pT4 irrespective of tumour size.` };
  if (ticks.some((s) => IN_SITU.test(s)) && ticks.length === 1) return { cat: 'Tis' };
  // Multifocal invasive carcinoma is staged on the largest invasive focus, not the aggregate.
  const cm = num(v.tumourSizeCm);
  if (cm === null) return { cat: 'TX', note: 'Tumour size is not recorded; pT is assigned on size in this edition and cannot be derived.' };
  const cat = sizeCategory(cm);
  // Body and tail carcinomas reach the spleen, splenic vessels, adrenal, colon or kidney; CAP notes
  // that this extension is recorded but does not change pT either.
  const note = ticks.some((s) => /peripancreatic|retroperitoneal|duodenal wall|stomach|mesocolon|mesenteric adipose|extrapancreatic common bile duct|ampulla of Vater|superior mesenteric vein|portal vein|vascular bed|spleen|splenic|adrenal|colon|kidney/i.test(s))
    ? 'Extrapancreatic extension is recorded but does not alter pT in this edition; pT1-pT3 are assigned on tumour size alone.'
    : undefined;
  return note ? { cat, note } : { cat };
}

export function N(v) {
  const examined = int(v.nodesExamined);
  const involved = int(v.nodesInvolved);
  if (examined === null || examined === 0) return { cat: 'NX', none: true, note: 'No regional lymph nodes submitted; pN not assigned.' };
  if (involved === null) return { cat: 'NX', note: 'Number of involved lymph nodes not recorded; pN cannot be assigned.' };
  if (involved === 0) return { cat: 'N0' };
  if (involved <= 3) return { cat: 'N1' };
  return { cat: 'N2' };
}

export const M1_SITES = /^(Non-regional lymph node|Liver|Other)/;

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

/** T1a/T1b/T1c all group as T1. */
const isT1 = (t) => /^T1[abc]?$/.test(t);

export function stageGroup(TC, NC, MC) {
  if (MC === 'M1') return 'IV';
  if (TC === 'Tis') return NC === 'N0' ? '0' : null;
  if (TC === 'T4') return NC === 'NX' ? null : 'III';
  const inRange = isT1(TC) || TC === 'T2' || TC === 'T3';
  if (!inRange) return null;
  if (NC === 'N2') return 'III';
  if (NC === 'N1') return 'IIB';
  if (NC !== 'N0') return null;
  if (isT1(TC)) return 'IA';
  if (TC === 'T2') return 'IB';
  return 'IIA';
}
