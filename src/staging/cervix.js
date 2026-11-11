// Cervical carcinoma — AJCC version 9 (cervix uteri, 2020; Olawaiye et al., CA Cancer J Clin 2021,
// https://acsjournals.onlinelibrary.wiley.com/doi/full/10.3322/caac.21663), with the definitions CAP Cervix
// 5.1.1.0 lists (https://documents.cap.org/documents/Cervix_5.1.1.0.REL_CAPCP.pdf). The categories match
// FIGO 2018 with its corrigendum (FIGO Cancer Report 2025, https://pmc.ncbi.nlm.nih.gov/articles/PMC12411820/).
// The QMH page (docs/reference/GYN-Cervix.html) prints the AJCC 8th edition; version 9 is the user's rule
// (AJCC version 9 when it exists).
//
// T  T1a1 stromal invasion <= 3 mm; T1a2 > 3 to <= 5 mm; T1b1 > 5 mm deep and <= 20 mm; T1b2 > 20 to <= 40 mm;
//    T1b3 > 40 mm. T1a is microscopic only: a macroscopically visible tumour is T1b on its size whatever the
//    depth (FIGO: all gross lesions, even with superficial invasion, are stage IB). Horizontal extent and
//    lymphovascular invasion no longer change the category; extension to the corpus is disregarded.
//    T2a1 / T2a2 upper two-thirds of the vagina (<= 40 mm / > 40 mm); T2b parametrium; T3a lower third of the
//    vagina; T3b pelvic wall; T4 bladder or rectal mucosa. "(subcategory cannot be determined)" when the size
//    or depth that would split the category is missing.
// N  pelvic nodes N1, para-aortic N2 (with or without pelvic): mi > 0.2 to 2.0 mm, a > 2.0 mm; isolated tumour
//    cells (<= 0.2 mm or <= 200 cells) N0(i+). "(sn)" when every node examined is a sentinel node. pN is not
//    printed when no node was examined (CAP: pNX is not for use by the pathologist).
// M  M1: inguinal nodes, intraperitoneal disease (omentum, extrapelvic peritoneum), lung, liver, bone and other
//    distant sites, and (AJCC version 9, CAP Note G) the uterine serosa and the adnexa. FIGO 2018 does not
//    count adnexal or uterine serosal involvement as stage IV; the Checks line says so.
// Stage (Table 10): T1-T3b N0 by T (I to IIIB); TX, T0, T1-T3 N1 IIIC1; N2 IIIC2; T4 any N IVA; M1 IVB.
//    N0(i+) groups with N0. With no node examined only T4 and M1 group; the Checks line gives the group the
//    tumour would have with negative nodes.

export const id = 'cervix';
export const edition = 'AJCC 9th edition';

export const EXT = {
  na: 'Not applicable',
  none: 'Not identified',
  corpus: 'Uterine corpus',
  paraR: 'Right parametrium',
  paraL: 'Left parametrium',
  paraNs: 'Parametrium (side not specified)',
  vaginaUpper: 'Vagina, upper two-thirds',
  vaginaLower: 'Vagina, lower one-third',
  vaginaNs: 'Vagina (location not specified)',
  ovaryR: 'Right ovary',
  ovaryL: 'Left ovary',
  ovaryNs: 'Ovary (side not specified)',
  tubeR: 'Right fallopian tube',
  tubeL: 'Left fallopian tube',
  tubeNs: 'Fallopian tube (side not specified)',
  pelvicWall: 'Pelvic wall',
  bladderWall: 'Bladder wall',
  bladderMucosa: 'Bladder mucosa',
  rectalWall: 'Rectal wall',
  bowelMucosa: 'Bowel mucosa',
  omentum: 'Omentum',
  other: 'Other organs / tissue (specify)',
  cannot: 'Cannot be determined'
};
export const PARAMETRIUM = [EXT.paraR, EXT.paraL, EXT.paraNs];
export const ADNEXA = [EXT.ovaryR, EXT.ovaryL, EXT.ovaryNs, EXT.tubeR, EXT.tubeL, EXT.tubeNs];

export const METS = {
  na: 'Not applicable',
  none: 'Not identified',
  serosa: 'Uterine serosa',
  adnexa: 'Adnexa',
  inguinal: 'Inguinal lymph node(s)',
  omentum: 'Omentum',
  peritoneum: 'Extrapelvic peritoneum',
  lung: 'Lung',
  liver: 'Liver',
  bone: 'Bone',
  other: 'Other (specify)',
  cannot: 'Cannot be determined'
};
const DISTANT = [METS.serosa, METS.adnexa, METS.inguinal, METS.omentum, METS.peritoneum, METS.lung, METS.liver, METS.bone, METS.other];

// Depth of stromal invasion: the CAP categories, or a measurement in millimetres.
export const DOI = {
  le3: 'Not more than 3 mm',
  le5: 'Greater than 3 mm but not more than 5 mm',
  gt5: 'Greater than 5 mm',
  cannot: 'Cannot be determined'
};

// Macroscopic appearances that make the tumour grossly visible (pT1b, not pT1a).
export const VISIBLE = ['Exophytic tumour', 'Ulcerated tumour', 'Endophytic / infiltrative tumour'];

const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const num = (x) => {
  if (x === null || x === undefined || String(x).trim() === '') return null;
  const n = Number(String(x).trim());
  return Number.isFinite(n) ? n : null;
};
const int = (x) => { const n = num(x); return n === null ? null : Math.max(0, Math.round(n)); };

// ---------- T ----------

/** The measured depth in mm, or null (not measured or not determinable). */
export function depthMm(v) { return v.doi === DOI.cannot ? null : num(v.doiMm); }

/** The CAP depth category the measurement falls in ('' without a measurement). */
export function depthCategory(mm) {
  if (mm === null || mm === undefined) return '';
  return mm <= 3 ? DOI.le3 : mm <= 5 ? DOI.le5 : DOI.gt5;
}

/** 'a1' (<= 3 mm), 'a2' (> 3 to 5 mm), 'b' (> 5 mm) or null: the measurement first, else the category. */
export function depthBand(v) {
  if (v.doi === DOI.cannot) return null;
  const mm = depthMm(v);
  const c = mm !== null ? depthCategory(mm) : v.doi || '';
  return c === DOI.le3 ? 'a1' : c === DOI.le5 ? 'a2' : c === DOI.gt5 ? 'b' : null;
}

export const visible = (v) => VISIBLE.includes(v.lesionAppearance);

const atLeastNote = (cat, what) => `The ${what} is a minimum (tumour reaches a margin): p${cat} is the lowest category it supports.`;

function t1b(v, size, notes) {
  if (size === null) {
    notes.push('pT1b (subcategory cannot be determined): tumour size not recorded.');
    return 'T1b';
  }
  const cat = size <= 20 ? 'T1b1' : size <= 40 ? 'T1b2' : 'T1b3';
  if (v.sizeAtLeast === true && cat !== 'T1b3') notes.push(atLeastNote(cat, 'tumour size'));
  return cat;
}

export function T(v) {
  const ext = arr(v.extension);
  const notes = [];
  const done = (cat) => ({ cat, ...(notes.length ? { note: notes.join(' ') } : {}) });
  const size = num(v.tumourSizeMm);
  if (ext.includes(EXT.corpus)) notes.push('Extension to the uterine corpus is disregarded for pT.');
  if (ext.includes(EXT.bladderMucosa) || ext.includes(EXT.bowelMucosa)) return done('T4');
  if (ext.includes(EXT.pelvicWall)) return done('T3b');
  if (ext.includes(EXT.vaginaLower)) return done('T3a');
  if (ext.some((e) => PARAMETRIUM.includes(e))) return done('T2b');
  if (ext.includes(EXT.vaginaUpper)) {
    if (size === null) { notes.push('pT2a (subcategory cannot be determined): tumour size not recorded.'); return done('T2a'); }
    const cat = size <= 40 ? 'T2a1' : 'T2a2';
    if (v.sizeAtLeast === true && cat === 'T2a1') notes.push(atLeastNote(cat, 'tumour size'));
    return done(cat);
  }
  if (ext.includes(EXT.vaginaNs)) {
    notes.push('Vaginal involvement without the level: pT2 (subcategory cannot be determined). The upper two-thirds is pT2a, the lower third pT3a.');
    return done('T2');
  }
  if (ext.includes(EXT.bladderWall) || ext.includes(EXT.rectalWall)) {
    notes.push('Bladder or rectal wall involvement without the mucosa is not pT4 (the mucosa must be involved): pT2 (subcategory cannot be determined). Use the override if the route of spread sets another category.');
    return done('T2');
  }
  if (ext.includes(EXT.cannot)) { notes.push('Other tissue or organ involvement cannot be determined: pT is not assigned.'); return done('TX'); }
  // Confined to the cervix.
  const band = depthBand(v);
  if (visible(v)) {
    if (band === 'a1' || band === 'a2') notes.push('A macroscopically visible tumour is pT1b whatever the depth (FIGO: all gross lesions, even with superficial invasion, are stage IB).');
    return done(t1b(v, size, notes));
  }
  if (band === 'b') return done(t1b(v, size, notes));
  if (band === 'a1' || band === 'a2') {
    const cat = band === 'a1' ? 'T1a1' : 'T1a2';
    if (v.doiAtLeast === true) notes.push(atLeastNote(cat, 'depth of invasion'));
    return done(cat);
  }
  notes.push('pT1 (subcategory cannot be determined): depth of stromal invasion not recorded.');
  return done('T1');
}

// ---------- N ----------

export function nodes(v, prefix) {
  const examined = int(v[`${prefix}Examined`]);
  const sentinel = int(v[`${prefix}Sentinel`]) ?? 0;
  const macro = int(v[`${prefix}Macro`]) ?? 0;
  const micro = int(v[`${prefix}Micro`]) ?? 0;
  const itc = int(v[`${prefix}Itc`]) ?? 0;
  return { examined, sentinel, macro, micro, itc, positive: macro + micro };
}

/** True when every node examined is a sentinel node. */
export function sentinelOnly(v) {
  const pel = nodes(v, 'pelvic'); const pa = nodes(v, 'pa');
  const total = (pel.examined || 0) + (pa.examined || 0);
  return total > 0 && pel.sentinel + pa.sentinel === total;
}

export function N(v) {
  const pel = nodes(v, 'pelvic'); const pa = nodes(v, 'pa');
  if (!((pel.examined || 0) + (pa.examined || 0))) return { cat: 'NX', none: true };
  const sn = sentinelOnly(v) ? '(sn)' : '';
  if (pa.macro) return { cat: `N2a${sn}` };
  if (pa.micro) return { cat: `N2mi${sn}` };
  if (pel.macro) return { cat: `N1a${sn}` };
  if (pel.micro) return { cat: `N1mi${sn}` };
  if (pel.itc || pa.itc) return { cat: `N0(i+)${sn}`, note: 'Isolated tumour cells only: pN0(i+), grouped with pN0 for the stage.' };
  return { cat: `N0${sn}` };
}

// ---------- M, descriptors, stage ----------

/** The recorded sites that make pM1 under AJCC version 9 (the extension list included). */
export function m1Sites(v) {
  const m = arr(v.distantMets).filter((x) => DISTANT.includes(x));
  const ext = arr(v.extension);
  if (ext.some((e) => ADNEXA.includes(e)) && !m.includes(METS.adnexa)) m.push(METS.adnexa);
  if (ext.includes(EXT.omentum) && !m.includes(METS.omentum)) m.push(METS.omentum);
  return m;
}

/** pM1 rests only on the adnexa or the uterine serosa, which FIGO 2018 does not stage as IV. */
export const figoDiffers = (v) => {
  const m = m1Sites(v);
  return m.length > 0 && m.every((x) => x === METS.adnexa || x === METS.serosa);
};

export function M(v) {
  return m1Sites(v).length ? { cat: 'M1' } : { cat: 'M-' };
}

export function descriptors(v) {
  const d = [];
  if (v.multiplePrimaries === true) d.push('m');
  if (v.recurrent === true) d.push('r');
  if (v.postTherapy === true) d.push('y');
  return d;
}

/** The grouping category: the (sn) / (f) suffix dropped and N0(i+) read as N0. */
export const base = (cat) => String(cat || '').replace(/\((?:sn|f)\)$/, '').replace(/^N0\(i\+\)$/, 'N0');

const BY_T = { T1: 'I', T1a: 'IA', T1a1: 'IA1', T1a2: 'IA2', T1b: 'IB', T1b1: 'IB1', T1b2: 'IB2', T1b3: 'IB3', T2: 'II', T2a: 'IIA', T2a1: 'IIA1', T2a2: 'IIA2', T2b: 'IIB', T3: 'III', T3a: 'IIIA', T3b: 'IIIB' };

export function stageGroup(Tc, Nc, Mc) {
  const t = base(Tc); const n = base(Nc);
  if (Mc === 'M1') return 'IVB';
  if (t === 'T4') return 'IVA';
  if (/^N2/.test(n)) return 'IIIC2';
  if (/^N1/.test(n)) return 'IIIC1';
  if (n === 'N0') return BY_T[t] || '';
  return '';
}

const HEAD = 'Stage group, AJCC 9th edition, matching FIGO 2018 (reference, not reported)';

/**
 * Checks-panel reference lines: the stage group (FIGO 2018 adds "p" to IIIC when the nodes are proven
 * pathologically), the group with negative nodes when no node was examined, and the FIGO difference for the
 * adnexa and uterine serosa. Never printed in the report. `st` is the deriveTNM result (an override applied);
 * without it the derived categories are used.
 */
export function referenceLines(v, st) {
  const t = st ? st.T : T(v).cat;
  const n = st ? st.N : N(v).cat;
  const m = st ? st.M : M(v).cat;
  const g = st ? st.stage : stageGroup(t, n, m);
  const out = [];
  if (g) out.push(`${HEAD}: ${g}${/^IIIC/.test(g) ? ` (FIGO ${g}p)` : ''}`);
  else if (base(n) === 'NX') {
    const ifNeg = stageGroup(t, 'N0', m);
    out.push(ifNeg ? `${HEAD}: ${ifNeg} if the regional nodes are negative (no lymph nodes examined)` : `${HEAD}: not assignable - the primary tumour category is needed`);
  } else out.push(`${HEAD}: not assignable - the primary tumour category is needed`);
  if (m === 'M1' && figoDiffers(v)) {
    const figo = stageGroup(t, base(n) === 'NX' ? 'N0' : n, 'M-');
    out.push(`AJCC version 9 makes adnexal or uterine serosal involvement pM1 (stage IVB); FIGO 2018 does not stage it as IV${figo ? `, and groups this tumour by its cervical extent and nodes (${figo}${base(n) === 'NX' ? ' if the nodes are negative' : ''})` : ''}.`);
  }
  return out;
}
