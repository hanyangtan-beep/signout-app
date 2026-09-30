// Medical liver biopsy scores. Card: docs/roadmap.md "Liver biopsy (medical) — scores module"
// (pulled by the user 2026-09-30).
//
// Every score is entered as its components and derived here; the template's Checks compare what is
// recorded with what the components give. Ranges, tier definitions and sum rules are those of
// docs/reference/liver_biopsy-morphology.md (section numbers below), which links each one to its source.
// Where sources disagree, §7 of that file records the reading taken. Pure functions, no DOM. Not a TNM
// protocol, so it is not registered in PROTOCOLS (src/staging/index.js).

/** A score select value as a whole number, or null when blank or not a whole number. */
export function scoreOf(v) {
  const s = String(v ?? '').trim();
  return /^\d+$/.test(s) ? Number(s) : null;
}

/**
 * Sum a set of components `[{ key, label, max }]` read from `values[key]`.
 * Returns { total, max, complete, entered, missing: [labels], outOfRange: [labels] };
 * `total` is null unless every component is entered and in range.
 */
export function sumOf(components, values) {
  let total = 0;
  const missing = [];
  const outOfRange = [];
  let entered = 0;
  for (const c of components) {
    const n = scoreOf(values[c.key]);
    if (n === null) { missing.push(c.label); continue; }
    entered += 1;
    if (n < 0 || n > c.max) { outOfRange.push(c.label); continue; }
    total += n;
  }
  const max = components.reduce((a, c) => a + c.max, 0);
  const complete = missing.length === 0 && outOfRange.length === 0;
  return { total: complete ? total : null, max, complete, entered, missing, outOfRange };
}

// ---------- Ishak modified HAI (§2a) ----------
// A interface hepatitis 0–4, B confluent necrosis 0–6, C focal lytic necrosis, apoptosis and focal
// inflammation 0–4, D portal inflammation 0–4; grade = A + B + C + D, maximum 18 (Brunt 2000; Krishna 2021).
// IAIHG 2022 grades autoimmune hepatitis on A, B and C only ("item D should not be included"), maximum 14 (§2h).
export const ISHAK_HAI = [
  { key: 'A', label: 'interface hepatitis', max: 4 },
  { key: 'B', label: 'confluent necrosis', max: 6 },
  { key: 'C', label: 'focal necrosis', max: 4 },
  { key: 'D', label: 'portal inflammation', max: 4 }
];

/** Modified HAI from { A, B, C, D }; `withoutD` for autoimmune hepatitis (IAIHG 2022). */
export function ishakHai(values, { withoutD = false } = {}) {
  const parts = withoutD ? ISHAK_HAI.slice(0, 3) : ISHAK_HAI;
  return { ...sumOf(parts, values), items: parts.map((c) => c.key) };
}

// ---------- METAVIR (§2b; §7.2) ----------
// Activity from piecemeal necrosis (PN 0–3) and lobular necrosis (LN 0–2) by the Bedossa 1996 algorithm.
// PN0/LN1 = A1 and PN2/LN2 = A3 were checked against two reproductions of the table (§7.2).
const METAVIR_A = [
  ['A0', 'A1', 'A2'],
  ['A1', 'A1', 'A2'],
  ['A2', 'A2', 'A3'],
  ['A3', 'A3', 'A3']
];
export const METAVIR_ACTIVITY_WORDS = { A0: 'no activity', A1: 'mild activity', A2: 'moderate activity', A3: 'severe activity' };

/** METAVIR activity grade ('A0'–'A3'), or null when either component is blank or out of range. */
export function metavirActivity(pn, ln) {
  const p = scoreOf(pn);
  const l = scoreOf(ln);
  if (p === null || l === null || p > 3 || l > 2) return null;
  return METAVIR_A[p][l];
}

// ---------- Batts–Ludwig grade (§2c) ----------
// 0 portal inflammation only, 1 minimal, 2 mild, 3 moderate, 4 severe (AASLD Pathology Pearls post 5).
export const BATTS_GRADE_WORDS = { 0: 'no activity', 1: 'minimal activity', 2: 'mild activity', 3: 'moderate activity', 4: 'severe activity' };

// ---------- NASH CRN and NAS (§2d; §7.4, §7.5) ----------
// Steatosis 0–3, lobular inflammation 0–3 (the paper's table, not the abstract's 0–2), ballooning 0–2;
// NAS = the unweighted sum, 0–8; fibrosis is not part of the NAS (Kleiner 2005).
export const NAS = [
  { key: 'steatosis', label: 'steatosis', max: 3 },
  { key: 'lobular', label: 'lobular inflammation', max: 3 },
  { key: 'ballooning', label: 'ballooning', max: 2 }
];
export function nas(values) {
  return sumOf(NAS, values);
}

/** Steatosis grade from the percentage: <5% 0, 5–33% 1, >33–66% 2, >66% 3 (NASH CRN); 67% grades 3 (§7.5). */
export function steatosisGrade(pct) {
  const n = parseFloat(String(pct ?? '').trim());
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  if (n < 5) return 0;
  if (n <= 33) return 1;
  if (n <= 66) return 2;
  return 3;
}

// ---------- SAF and FLIP (§2e; §7.6) ----------
// SAF: S = steatosis 0–3; A = ballooning 0–2 + SAF lobular inflammation 0–2 (≤2 or >2 foci per 20× field),
// range 0–4, graded A0 none, A1 mild, A2 moderate, A ≥3 severe; F as NASH CRN with 1a/1b/1c pooled as 1
// (Bedossa 2012). FLIP: steatosis ≥1 enters; steatosis, ballooning and lobular inflammation each ≥1 is
// steatohepatitis, otherwise steatosis (Bedossa 2012, 2014).
export const SAF_ACTIVITY_WORDS = { 0: 'no activity', 1: 'mild activity', 2: 'moderate activity', 3: 'severe activity' };

/** SAF F from a NASH CRN stage ('0', '1a', '1b', '1c', '2', '3', '4'). */
export function safFibrosis(crnStage) {
  const s = String(crnStage ?? '').trim();
  if (/^1[abc]?$/.test(s)) return 1;
  return ['0', '2', '3', '4'].includes(s) ? Number(s) : null;
}

/** { S, A, F, activityWord, label } from steatosis, ballooning, SAF lobular inflammation and the CRN stage. */
export function saf({ steatosis, ballooning, lobular, stage }) {
  const S = scoreOf(steatosis);
  const B = scoreOf(ballooning);
  const L = scoreOf(lobular);
  const okS = S !== null && S <= 3;
  const okA = B !== null && L !== null && B <= 2 && L <= 2;
  const A = okA ? B + L : null;
  const F = safFibrosis(stage);
  const bits = [okS ? `S${S}` : null, A !== null ? `A${A}` : null, F !== null ? `F${F}` : null];
  return {
    S: okS ? S : null,
    A,
    F,
    complete: bits.every(Boolean),
    activityWord: A === null ? null : SAF_ACTIVITY_WORDS[Math.min(A, 3)],
    label: bits.every(Boolean) ? `SAF ${bits.join(' ')}` : null
  };
}

/** FLIP: 'steatohepatitis', 'steatosis', 'none' (steatosis <1) or null when a component is blank. */
export function flip({ steatosis, ballooning, lobular }) {
  const S = scoreOf(steatosis);
  const B = scoreOf(ballooning);
  const L = scoreOf(lobular);
  if (S === null) return null;
  if (S < 1) return 'none';
  if (B === null || L === null) return null;
  return B >= 1 && L >= 1 ? 'steatohepatitis' : 'steatosis';
}

// ---------- Banff rejection activity index (§2f; §7.7) ----------
// Portal inflammation, bile duct inflammation damage and venous endothelial inflammation, each 1–3 in Banff
// 2016 Table 1 (0 = absent); RAI = the sum, maximum 9. The global assessment is recorded separately and is
// never derived from the RAI: no official mapping exists.
export const RAI = [
  { key: 'portal', label: 'portal inflammation', max: 3 },
  { key: 'bileDuct', label: 'bile duct inflammation', max: 3 },
  { key: 'venous', label: 'venous endothelial inflammation', max: 3 }
];
export function rai(values) {
  return sumOf(RAI, values);
}

// ---------- Nakanuma PBC staging (§2g; §7.8) ----------
// Fibrosis 0–3, bile duct loss 0–3, orcein-positive granules 0–3. Three-item sum: 0 stage 1, 1–3 stage 2,
// 4–6 stage 3, 7–9 stage 4. Without orcein, two-item sum: 0 stage 1, 1–2 stage 2, 3–4 stage 3, 5–6 stage 4
// (Nakanuma 2010, Table 2; confirmed by de Vries 2015).
export const NAKANUMA_STAGE_WORDS = { 1: 'no progression', 2: 'mild progression', 3: 'moderate progression', 4: 'advanced progression' };

/** { sum, max, items, stage } or null when fibrosis or bile duct loss is blank; orcein null → two items. */
export function nakanumaStage({ fibrosis, ductLoss, orcein }) {
  const f = scoreOf(fibrosis);
  const b = scoreOf(ductLoss);
  const o = scoreOf(orcein);
  if (f === null || b === null || f > 3 || b > 3 || (o !== null && o > 3)) return null;
  if (o === null) {
    const sum = f + b;
    return { sum, max: 6, items: 2, stage: sum === 0 ? 1 : sum <= 2 ? 2 : sum <= 4 ? 3 : 4 };
  }
  const sum = f + b + o;
  return { sum, max: 9, items: 3, stage: sum === 0 ? 1 : sum <= 3 ? 2 : sum <= 6 ? 3 : 4 };
}

// ---------- Fibrosis stage systems (§2a–2d; §7.3) ----------
// `words` is the tier definition as a sentence fragment for the microscopy; `dx` is the short capitalised
// phrase for the diagnosis line; `cirrhotic` marks the stages that are cirrhosis (Ishak 5 is incomplete).
export const STAGE_SYSTEMS = {
  Ishak: {
    stages: ['0', '1', '2', '3', '4', '5', '6'],
    label: (s) => `Ishak stage ${s}/6`,
    words: {
      0: 'no fibrosis',
      1: 'fibrous expansion of some portal areas, with or without short fibrous septa',
      2: 'fibrous expansion of most portal areas, with or without short fibrous septa',
      3: 'fibrous expansion of most portal areas with occasional portal-to-portal bridging',
      4: 'fibrous expansion of portal areas with marked portal-to-portal and portal-to-central bridging',
      5: 'marked bridging fibrosis with occasional nodules (incomplete cirrhosis)',
      6: 'cirrhosis'
    },
    dx: { 1: 'PORTAL FIBROSIS', 2: 'PORTAL FIBROSIS', 3: 'BRIDGING FIBROSIS', 4: 'BRIDGING FIBROSIS', 5: 'INCOMPLETE CIRRHOSIS', 6: 'CIRRHOSIS' },
    cirrhotic: ['6']
  },
  METAVIR: {
    stages: ['0', '1', '2', '3', '4'],
    label: (s) => `METAVIR F${s}`,
    words: { 0: 'no fibrosis', 1: 'portal fibrosis without septa', 2: 'portal fibrosis with rare septa', 3: 'numerous septa without cirrhosis', 4: 'cirrhosis' },
    dx: { 1: 'PORTAL FIBROSIS', 2: 'PORTAL FIBROSIS with RARE SEPTA', 3: 'BRIDGING FIBROSIS', 4: 'CIRRHOSIS' },
    cirrhotic: ['4']
  },
  'NASH CRN': {
    stages: ['0', '1a', '1b', '1c', '2', '3', '4'],
    label: (s) => `NASH CRN stage ${s}`,
    words: {
      0: 'no fibrosis',
      '1a': 'mild zone 3 perisinusoidal fibrosis',
      '1b': 'moderate zone 3 perisinusoidal fibrosis',
      '1c': 'portal or periportal fibrosis',
      2: 'zone 3 perisinusoidal and portal or periportal fibrosis',
      3: 'bridging fibrosis',
      4: 'cirrhosis'
    },
    dx: { '1a': 'PERISINUSOIDAL FIBROSIS', '1b': 'PERISINUSOIDAL FIBROSIS', '1c': 'PORTAL FIBROSIS', 2: 'PERISINUSOIDAL AND PERIPORTAL FIBROSIS', 3: 'BRIDGING FIBROSIS', 4: 'CIRRHOSIS' },
    cirrhotic: ['4']
  },
  'Batts-Ludwig': {
    stages: ['0', '1', '2', '3', '4'],
    label: (s) => `Batts-Ludwig stage ${s}/4`,
    words: { 0: 'no fibrosis', 1: 'fibrous portal expansion', 2: 'periportal fibrosis with rare portal-to-portal septa', 3: 'fibrous septa with architectural distortion, without obvious cirrhosis', 4: 'cirrhosis' },
    dx: { 1: 'PORTAL FIBROSIS', 2: 'PERIPORTAL FIBROSIS', 3: 'SEPTAL FIBROSIS', 4: 'CIRRHOSIS' },
    cirrhotic: ['4']
  }
};

/** Every stage value any system allows, in order (the options when no system is chosen). */
export const ALL_STAGES = ['0', '1', '1a', '1b', '1c', '2', '3', '4', '5', '6'];

/** The stage's entry for a system: { label, words, dx } or null when the system or stage is unknown. */
export function stageOf(system, stage) {
  const sys = STAGE_SYSTEMS[system];
  const s = String(stage ?? '').trim();
  if (!sys || !sys.stages.includes(s)) return null;
  return { label: sys.label(s), words: sys.words[s], dx: sys.dx[s] || null, cirrhotic: sys.cirrhotic.includes(s) };
}

/** Checks for a stage and its system: [{ level, message }]. */
export function stageIssues(system, stage) {
  const s = String(stage ?? '').trim();
  if (!s) return [];
  if (!system) return [{ level: 'warn', message: `Fibrosis stage ${s} has no system: choose Ishak, METAVIR, NASH CRN or Batts-Ludwig.` }];
  const sys = STAGE_SYSTEMS[system];
  if (!sys) return [{ level: 'error', message: `Unknown staging system "${system}".` }];
  if (!sys.stages.includes(s)) return [{ level: 'error', message: `Stage ${s} is not a ${system} stage (${sys.stages.join(', ')}).` }];
  return [];
}

// ---------- Adequacy (§1.1; §7.1) ----------
// RCPath G064: good >20 mm, compromised 10–20 mm, inadequate <10 mm of total core length. BSG 2020: ten or
// fewer portal tracts under-estimate stage and grade.
export function adequacyOf(lengthMm) {
  const n = parseFloat(String(lengthMm ?? '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n > 20) return 'Good';
  if (n >= 10) return 'Compromised';
  return 'Inadequate';
}
export const FEW_PORTAL_TRACTS = 10;
