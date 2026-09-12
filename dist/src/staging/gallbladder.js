// Gallbladder carcinoma — AJCC 8th edition pTNM (gallbladder chapter), as displayed on the
// QMH GI-Gallbladder page. Field ids belong to schemas/gallbladder_carcinoma.json.
//
// pT is taken from the "Tumour extension" check-list; when more than one box is ticked the
// deepest governs: lamina propria T1a, muscular layer T1b, perimuscular connective tissue
// on the peritoneal side T2a (no serosal involvement) or on the hepatic side T2b (no liver
// involvement — if both sides are ticked the hepatic-side T2b wins), serosa perforated,
// direct liver invasion or a single adjacent organ T3, and main portal vein / hepatic artery
// or two or more organs (the liver counting as one) T4. pN derives from the involved-node
// count (N1 = 1-3, N2 = 4 or more). Stage groups: Tis N0 stage 0; T1 N0 I; T2a N0 IIA;
// T2b N0 IIB; T3 N0 IIIA; T1-T3 N1 IIIB; T4 N0-1 IVA; any T N2 and any M1 IVB.

export const id = 'gallbladder';
export const edition = 'AJCC 8th edition';

const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

/** schema 'tumourExtension' option -> {rank, t} — deepest ticked option governs. Adjacent organs count toward T4. */
export const EXTENSION_T = [
  [/invades lamina propria/i, 1, 'T1a'],
  [/invades muscular layer/i, 2, 'T1b'],
  [/peritoneal side without serosal involvement|peritoneal side, without involvement of the serosa/i, 3, 'T2a'],
  [/hepatic side without liver involvement|hepatic side, with no extension into the liver/i, 4, 'T2b'],
  [/perforates serosa/i, 5, 'T3'],
  [/main portal vein|hepatic artery/i, 7, 'T4'],
  [/directly invades liver/i, 6, 'T3-organ'],
  // Listed first so that "…organ(s) or structure(s): Main portal vein" cannot be captured here.
  [/: (Stomach|Duodenum|Colon|Pancreas|Extrahepatic bile ducts|Omentum)(?:$|:)|: Other \(specify\)/i, 6, 'T3-organ'],
  [/cannot be assessed/i, -1, 'TX'],
  [/no evidence of primary/i, -2, 'T0']
];

export function T(v) {
  const ticks = arr(v.tumourExtension);
  if (!ticks.length) return { cat: 'TX', note: 'Tumour extension not recorded; pT cannot be assigned.' };
  if (ticks.some((s) => /no evidence of primary/i.test(s))) return { cat: 'T0' };
  if (ticks.every((s) => /cannot be assessed/i.test(s))) return { cat: 'TX', note: 'Tumour extension cannot be assessed.' };
  let organs = 0;
  let major = null;
  for (const s of ticks) {
    for (const [re, rank, cat] of EXTENSION_T) {
      if (!re.test(s)) continue;
      if (rank > 0) {
        if (cat === 'T4') return { cat: 'T4', note: 'Invasion of the main portal vein or hepatic artery grades pT4.' };
        if (cat === 'T3-organ') organs += 1;
        else if (!major || rank > major.rank) major = { rank, cat };
      }
      break;
    }
  }
  // Two or more organs (the liver counting as one) grade T4; a single organ grades T3,
  // which still outweighs any wall-confined category.
  if (organs >= 2) return { cat: 'T4', note: 'Direct invasion of two or more extrahepatic organs grades pT4.' };
  if (organs === 1) return { cat: 'T3', note: 'Direct invasion of the liver or one adjacent organ grades pT3.' };
  if (major) return { cat: major.cat };
  return { cat: 'TX', note: 'Tumour extension options have no pT mapping.' };
}

export function N(v) {
  const examined = int(v.nodesExamined);
  const involved = int(v.nodesInvolved);
  if (examined === null || examined === 0) return { cat: 'NX', note: 'No regional lymph nodes submitted; pN not assigned.' };
  if (involved === null) return { cat: 'NX', note: 'Number of involved lymph nodes not recorded; pN cannot be assigned.' };
  if (involved === 0) return { cat: 'N0' };
  if (involved <= 3) return { cat: 'N1' };
  return { cat: 'N2' };
}

/** Distant-metastasis options that carry M1 (a separate hepatic focus is M1 — direct liver invasion is T3). */
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

/** Pathological stage groups (AJCC 8e gallbladder): Tis N0 0; T1 N0 I; T2a N0 IIA; T2b N0 IIB; T3 N0 IIIA; T1-T3 N1 IIIB; T4 N0-1 IVA; N2 or M1 IVB. */
export function stageGroup(TC, NC, MC) {
  if (MC === 'M1') return 'IVB';
  if (TC === 'Tis') return NC === 'N0' ? '0' : null;
  if (NC === 'N2') return 'IVB';
  if (TC === 'T1a' || TC === 'T1b' || TC === 'T1') {
    if (NC === 'N0') return 'I';
    if (NC === 'N1') return 'IIIB';
    return null;
  }
  if (TC === 'T2a') {
    if (NC === 'N0') return 'IIA';
    if (NC === 'N1') return 'IIIB';
    return null;
  }
  if (TC === 'T2b' || TC === 'T2') {
    if (NC === 'N0') return 'IIB';
    if (NC === 'N1') return 'IIIB';
    return null;
  }
  if (TC === 'T3') {
    if (NC === 'N0') return 'IIIA';
    if (NC === 'N1') return 'IIIB';
    return null;
  }
  if (TC === 'T4') {
    if (NC === 'N0' || NC === 'N1') return 'IVA';
    return null;
  }
  return null;
}
