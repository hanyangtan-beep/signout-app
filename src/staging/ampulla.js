// Carcinoma of the ampulla of Vater — AJCC 8th edition pTNM.
// Field ids belong to schemas/ampulla_carcinoma.json.
//
// Unlike the pancreatic chapter, the ampullary chapter is an extension chapter: pT is read off
// the tumour-extension check-list and size never enters it. When more than one box is ticked the
// deepest governs.
//
//   Tis  carcinoma in situ / high-grade dysplasia, including IAPN with high-grade dysplasia
//   T1a  limited to the ampulla of Vater or sphincter of Oddi
//   T1b  beyond the sphincter of Oddi (perisphincteric invasion) and/or into duodenal submucosa
//   T2   into the muscularis propria of the duodenum
//   T3a  invades the pancreas to a depth of 0.5 cm or less
//   T3b  more than 0.5 cm into the pancreas, or into peripancreatic or periduodenal soft tissue
//        or duodenal serosa, without coeliac axis or superior mesenteric artery involvement
//   T4   coeliac axis, superior mesenteric artery and/or common hepatic artery
//   N1   1 to 3 involved regional nodes      N2   4 or more
//
// The 0.5 cm rule is the whole of the T3a/T3b split, so `pancreasDepthCm` is asked for whenever
// pancreatic invasion is ticked and the validator complains when it is missing rather than
// silently defaulting to the lower category.
//
// Non-vascular adjacent organs (stomach, gallbladder, omentum) have no T4 rule in this chapter —
// T4 is vascular only — so they are carried at T3b and a note says so rather than being quietly
// dropped. That mirrors how the extrapancreatic-extension note works in the pancreatic module.
//
// Stage groups: Tis N0 0; T1a N0 IA; T1b or T2 N0 IB; T3a N0 IIA; T3b N0 IIB;
// T1-T3 N1 IIIA; any T N2 IIIB; T4 any N IIIB; any M1 IV.
// Confirmed against the CAP protocol Ampulla of Vater v4.3.0.0 (June 2025) and the NDRS staging
// sheet https://digital.nhs.uk/ndrs/data/cancer-data-training-materials/staging-sheets/ampulla-of-vater

export const id = 'ampulla';
export const edition = 'AJCC 8th edition';

const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const num = (x) => { const n = parseFloat(String(x ?? '').trim()); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

/** schema 'tumourExtension' option -> [regexp, rank, category]. Deepest ticked option governs. */
export const EXTENSION_T = [
  [/^Carcinoma in situ|high-grade dysplasia/i, 1, 'Tis'],
  [/limited to (the )?ampulla of Vater or sphincter of Oddi/i, 2, 'T1a'],
  [/beyond the sphincter of Oddi|perisphincteric/i, 3, 'T1b'],
  [/duodenal submucosa/i, 3, 'T1b'],
  [/muscularis propria of the duodenum/i, 4, 'T2'],
  // Pancreatic invasion: the recorded depth decides T3a vs T3b (see PANCREAS_RE below).
  [/invades the pancreas/i, 5, 'T3-pancreas'],
  [/peripancreatic soft tissue|periduodenal (soft )?tissue|duodenal serosa/i, 6, 'T3b'],
  [/coeliac axis|celiac axis|superior mesenteric artery|common hepatic artery/i, 8, 'T4'],
  [/other adjacent organ|^Stomach|^Gallbladder|^Omentum/i, 7, 'T3b-organ'],
  [/cannot be determined/i, -1, 'TX'],
  [/no evidence of primary/i, -2, 'T0']
];

export const PANCREAS_RE = /invades the pancreas/i;

const ORGAN_NOTE = 'Invasion of an adjacent organ other than the pancreas is recorded; this chapter has no organ-based pT4 rule, so it is carried at pT3b.';

export function T(v) {
  const ticks = arr(v.tumourExtension);
  if (!ticks.length) return { cat: 'TX', note: 'Tumour extension not recorded; pT cannot be assigned.' };
  if (ticks.some((s) => /no evidence of primary/i.test(s))) return { cat: 'T0' };
  if (ticks.every((s) => /cannot be determined/i.test(s))) return { cat: 'TX', note: 'Tumour extension cannot be determined.' };
  let best = null;
  let organ = false;
  for (const s of ticks) {
    for (const [re, rank, cat] of EXTENSION_T) {
      if (!re.test(s)) continue;
      if (cat === 'T4') return { cat: 'T4', note: 'Arterial involvement grades pT4 in this chapter irrespective of the depth of pancreatic invasion.' };
      if (cat === 'T3b-organ') organ = true;
      if (rank > 0 && (!best || rank > best.rank)) best = { rank, cat };
      break;
    }
  }
  if (!best) return { cat: 'TX', note: 'Tumour extension options have no pT mapping.' };
  if (best.cat === 'T3-pancreas') {
    const d = num(v.pancreasDepthCm);
    if (d === null) return { cat: 'T3', note: 'Depth of pancreatic invasion is not recorded; the pT3a/pT3b split turns on the 0.5 cm threshold and cannot be made.' };
    if (organ) return { cat: 'T3b', note: ORGAN_NOTE };
    return d <= 0.5 ? { cat: 'T3a' } : { cat: 'T3b' };
  }
  if (best.cat === 'T3b-organ') return { cat: 'T3b', note: ORGAN_NOTE };
  return { cat: best.cat };
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

const isT3 = (t) => t === 'T3' || t === 'T3a' || t === 'T3b';

export function stageGroup(TC, NC, MC) {
  if (MC === 'M1') return 'IV';
  if (TC === 'Tis') return NC === 'N0' ? '0' : null;
  if (TC === 'T4') return NC === 'NX' ? null : 'IIIB';
  const staged = TC === 'T1a' || TC === 'T1b' || TC === 'T2' || isT3(TC);
  if (!staged) return null;
  if (NC === 'N2') return 'IIIB';
  if (NC === 'N1') return 'IIIA';
  if (NC !== 'N0') return null;
  if (TC === 'T1a') return 'IA';
  if (TC === 'T1b' || TC === 'T2') return 'IB';
  if (TC === 'T3a') return 'IIA';
  if (TC === 'T3b') return 'IIB';
  return null; // bare T3 with the 0.5 cm split unresolved — no group
}
