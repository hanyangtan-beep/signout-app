// Ovary, fallopian tube and primary peritoneal carcinoma — AJCC 8th edition pTNM and the FIGO 2014
// stage it corresponds to. Field ids belong to schemas/ovary_ft_peritoneum.json.
//
// The centre does not report FIGO. figo2014() feeds the Checks panel only; the report prints the
// AJCC pTNM block solely when the case option `printPTNM` is on. FIGO has not re-staged ovarian
// cancer since 2014 — the FIGO Cancer Report 2025 (Int J Gynecol Obstet 2025;171 Suppl 1) reproduces
// the 2014 table, so the AJCC 8th groups and the FIGO stages are one table here.
// Sources: Prat J. FIGO Committee on Gynecologic Oncology. Int J Gynaecol Obstet 2014;124:1-5;
// AJCC Cancer Staging Manual 8th ed., chapter 55, as displayed on the QMH GYN-Ovary page.

export const id = 'ovary';
export const edition = 'AJCC 8th edition';

const num = (x) => { const n = parseFloat(String(x ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

// ---------- vocab (schema option strings) ----------

export const SITE_PERITONEUM = 'Primary peritoneum';
export const PRIMARY_DERIVE = 'Derive from the tumour site, tubal mucosa and STIC';

export const SPILL = /intraoperative|surgical spill/i;          // rupture at surgery -> IC1
export const RUPTURED = /ruptured|fragmented/i;                  // any capsular / serosal breach
export const SURFACE_PRESENT = /^Present/;

export const FLUID_MALIGNANT = 'Malignant cells present';
export const PLEURAL_MALIGNANT = 'Malignant (positive for malignancy)';

export const FOCUS_MICRO = 'Microscopic';
export const FOCUS_LE_2CM = 'Macroscopic, 2 cm or less';
export const FOCUS_GT_2CM = 'Macroscopic, more than 2 cm';

// "Other tissue / organ involvement" entries, by the T category they carry.
const T2A = /^(Uterus|Uterine serosa|Right ovary|Left ovary|Ovary \(side|Right fallopian tube|Left fallopian tube|Fallopian tube \(side)/;
const T2B = /^(Vagina|Right parametrium|Left parametrium|Parametrium|Pelvic wall|Pelvic peritoneum|Bladder wall|Bladder mucosa|Rectal wall|Sigmoid|Other pelvic)/;
const T3_CAPSULE = /^(Liver capsule|Splenic capsule)/;
const T3_OTHER = /^(Omentum|Extrapelvic peritoneum|Small bowel serosa|Large bowel serosa|Mesentery|Diaphragm|Abdominal wall)/;
const M1B_INVOLVEMENT = /^(Bowel mucosa|Transmural)/;

// ---------- primary site ----------

/** 'ovary' | 'tube' | 'tubo-ovarian' | 'peritoneum' | 'undesignated' — house field first, else the tumour site. */
export function primarySite(v) {
  const p = v.primarySite || PRIMARY_DERIVE;
  if (p !== PRIMARY_DERIVE) return p === 'Ovary' ? 'ovary' : p === 'Fallopian tube' ? 'tube' : p === 'Tubo-ovarian' ? 'tubo-ovarian' : p === 'Peritoneum' ? 'peritoneum' : 'undesignated';
  const site = v.tumourSite || '';
  if (site === SITE_PERITONEUM) return 'peritoneum';
  if (/fallopian tube/i.test(site)) return 'tube';
  if (/tubo-ovarian/i.test(site)) return 'tubo-ovarian';
  return 'ovary';
}

export const bilateral = (v) => /^Bilateral/.test(v.tumourSite || '');

// ---------- extent ----------

/** Surgical spill (IC1), pre-operative or unknown-timing rupture / surface tumour (IC2), positive fluid (IC3). */
export function capsule(v) {
  const fields = [v.integrityRO, v.integrityLO, v.integrityRT, v.integrityLT].filter(Boolean);
  return {
    spill: fields.some((s) => SPILL.test(s)),
    ruptured: fields.some((s) => RUPTURED.test(s) && !SPILL.test(s)),
    surface: SURFACE_PRESENT.test(v.ovarianSurface || '') || SURFACE_PRESENT.test(v.tubalSurface || ''),
    fluid: v.peritonealFluid === FLUID_MALIGNANT
  };
}

/** Largest extrapelvic peritoneal focus: 'micro' | 'le2' | 'gt2' | null. The measured size wins over the pick. */
export function extrapelvicFocus(v) {
  const mm = num(v.extrapelvicFocusMm);
  if (mm !== null) return mm > 20 ? 'gt2' : mm > 0 ? 'le2' : 'micro';
  if (v.extrapelvicFocus === FOCUS_MICRO) return 'micro';
  if (v.extrapelvicFocus === FOCUS_LE_2CM) return 'le2';
  if (v.extrapelvicFocus === FOCUS_GT_2CM) return 'gt2';
  return null;
}

export function involvement(v) {
  const inv = arr(v.otherInvolvement);
  return {
    t2a: inv.some((s) => T2A.test(s)),
    t2b: inv.some((s) => T2B.test(s)),
    capsuleT3c: inv.some((s) => T3_CAPSULE.test(s)),
    extrapelvic: inv.some((s) => T3_OTHER.test(s)),
    m1b: inv.some((s) => M1B_INVOLVEMENT.test(s))
  };
}

// ---------- T, N, M ----------

export function T(v) {
  const site = primarySite(v);
  const inv = involvement(v);
  const focus = extrapelvicFocus(v);
  // T3: extrapelvic peritoneum (including omentum) and/or retroperitoneal nodes are handled by N.
  if (inv.capsuleT3c || focus === 'gt2') return { cat: 'T3c' };
  if (focus === 'le2') return { cat: 'T3b' };
  if (focus === 'micro') return { cat: 'T3a' };
  if (inv.extrapelvic) return { cat: 'T3', note: 'Extrapelvic peritoneal involvement recorded without the size of the largest focus; pT3a/b/c cannot be assigned.' };
  if (inv.t2b) return { cat: 'T2b' };
  if (inv.t2a) return { cat: 'T2a' };
  if (site === 'peritoneum') return { cat: 'TX', note: 'Primary peritoneal carcinoma cannot be pT1; record the pelvic (pT2) or extrapelvic (pT3) peritoneal involvement.' };
  if (!v.tumourSite && !v.histType) return { cat: 'TX' };
  const c = capsule(v);
  if (c.fluid) return { cat: 'T1c3' };
  if (c.ruptured || c.surface) return { cat: 'T1c2' };
  if (c.spill) return { cat: 'T1c1' };
  return { cat: bilateral(v) ? 'T1b' : 'T1a' };
}

export function nodes(v) {
  const examined = int(v.nodesExamined);
  const macro = int(v.nodesMacro) || 0; // deposits more than 10 mm
  const micro = int(v.nodesMicro) || 0; // deposits 10 mm or less
  const itc = int(v.nodesItc) || 0;
  return { examined, macro, micro, itc, positive: macro + micro };
}

export function N(v) {
  const n = nodes(v);
  if (n.examined === null || n.examined === 0) return { cat: 'NX', none: true };
  if (!n.positive) return { cat: n.itc ? 'N0(i+)' : 'N0' };
  const dep = num(v.nodeDepositMm);
  if (dep !== null) return { cat: dep > 10 ? 'N1b' : 'N1a' };
  return { cat: n.macro ? 'N1b' : 'N1a' };
}

export function M(v) {
  const mets = arr(v.distantMets).filter((s) => !/^(Not identified|Not applicable|Cannot)/.test(s));
  const pleural = mets.some((s) => /^Pleural effusion/.test(s));
  if (mets.some((s) => !/^Pleural effusion/.test(s)) || involvement(v).m1b) return { cat: 'M1b' };
  if (pleural || v.pleuralFluid === PLEURAL_MALIGNANT) return { cat: 'M1a' };
  return { cat: 'M-' };
}

export function descriptors(v) { return v.neoadjuvant === true ? ['y'] : []; }

// ---------- stage group (AJCC 8th = FIGO 2014) ----------

export function stageGroup(Tc, Nc, Mc) {
  if (Mc === 'M1b') return 'IVB';
  if (Mc === 'M1a') return 'IVA';
  if (Tc === 'T3c') return 'IIIC';
  if (Tc === 'T3b') return 'IIIB';
  if (Tc === 'T3a' || Tc === 'T3a2') return 'IIIA2';
  if (Tc === 'T3') return 'III';
  if (Nc === 'N1b') return 'IIIA1(ii)';
  if (Nc === 'N1a') return 'IIIA1(i)';
  if (Nc === 'N1') return 'IIIA1';
  if (Tc === 'T2b') return 'IIB';
  if (Tc === 'T2a') return 'IIA';
  if (Tc === 'T2') return 'II';
  if (/^T1c[123]$/.test(Tc)) return `IC${Tc.slice(-1)}`;
  if (Tc === 'T1c') return 'IC';
  if (Tc === 'T1b') return 'IB';
  if (Tc === 'T1a') return 'IA';
  if (Tc === 'T1') return 'I';
  return null;
}

/** FIGO 2014 stage for the Checks panel (never printed). Identical to the AJCC 8th group. */
export function figo2014(v) {
  return stageGroup(T(v).cat, N(v).cat, M(v).cat);
}

/** Info lines for the Checks panel. Borderline tumours are staged too (CAP / FIGO), so they get the line. */
export function referenceLines(v) {
  const f = figo2014(v);
  return [`FIGO 2014 (reference, not reported; FIGO Cancer Report 2025 reproduces the 2014 table): ${f || 'not derived'}`];
}
