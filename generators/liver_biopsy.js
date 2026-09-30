// Liver biopsy (medical) generator. Pure functions: (part, ctx) -> string.
// Card: docs/roadmap.md "Liver biopsy (medical)", pulled by the user 2026-09-30, built with the scores module
// src/staging/liver.js.
//
// Blocks produced:
//   specimens  "Liver, random, biopsy"
//   microscopy "(A) Sections show two cores of liver measuring 22 mm in aggregate length, with 14 portal tracts.
//               The portal tracts contain a moderate plasma cell-rich infiltrate with moderate interface hepatitis. ..."
//   diagnosis  "(A) LIVER, random, biopsy - CHRONIC HEPATITIS with MODERATE ACTIVITY and BRIDGING FIBROSIS
//               (modified HAI 5/14; Ishak stage 3/6), consistent with AUTOIMMUNE HEPATITIS"
//
// The pattern of injury (hepatitic, biliary, steatotic, transplant, other, no significant abnormality) picks the
// sentences and the diagnosis head; each score is entered as its components and derived in src/staging/liver.js.
// In the diagnosis the morphology comes first, then the scores in brackets, then the cause as "consistent with"
// (likely / typical AIH, florid duct lesions in PBC) or "compatible with" (possible / compatible AIH, drugs,
// PSC, large-duct and venous outflow obstruction). Cause words for steatotic disease print only when the
// clinical context is chosen (docs/reference/liver_biopsy-morphology.md §7.11).
//
// Grounding: docs/reference/liver_biopsy-morphology.md, which links each item to its source (RCPath G064 tissue
// pathways for liver biopsies, BSG 2020, Ishak 1995 via Brunt 2000, METAVIR 1996, Batts-Ludwig 1995, NASH CRN
// 2005, SAF/FLIP 2012, Banff 2016, Nakanuma 2010, IAIHG 2008 and 2022, Scheuer/Searle iron grades); §7 records
// the readings taken where the sources disagree. Printed prose is released-report register only: what is seen,
// the scores and the diagnosis. Thresholds and criteria live in this file, the schema help text and the Checks.
// House phrasing, from aggregate counts of the 2021-2026 biopsy export (no case text is kept here): "Please
// correlate with clinical findings" is the commonest medical-liver comment, which the correlation snippets follow.
// Wording is protected by tests/liver_biopsy.test.js and tests/fixtures/liver_biopsy/.

import { stripDot, checks } from './_house.js';
import * as L from '../src/staging/liver.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const andUpper = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} AND ${a[a.length - 1]}`;
};
const has = (list, x) => Array.isArray(list) && list.includes(x);
const RANK = { Absent: 0, Minimal: 0, Mild: 1, Moderate: 2, Marked: 3 };
const rank = (x) => RANK[x] ?? 0;

// ---------- which fields are live (mirrors the schema's showIf rules) ----------

export const patternOf = (v) => v.pattern || 'Hepatitic';
const isHep = (v) => patternOf(v) === 'Hepatitic';
const isBil = (v) => patternOf(v) === 'Biliary';
export const isAih = (v) => isHep(v) && v.hepDx === 'Autoimmune hepatitis';
export const isPbc = (v) => isBil(v) && v.bilDx === 'Primary biliary cholangitis';
const stainsOf = (v) => (Array.isArray(v.stains) ? v.stains : []);
const ironOverload = (v) => patternOf(v) === 'Other' && v.otherDx === 'Iron overload';
const perlsShown = (v) => has(stainsOf(v), 'Perls') || ironOverload(v);
const gradeSystemOf = (v) => (isHep(v) ? v.gradeSystem || 'Not graded' : 'Not graded');
const hepatocellularIron = (v) => perlsShown(v) && ['Hepatocellular', 'Mixed'].includes(v.ironSite);

// ---------- specimen ----------

// A site word that is really the procedure reads "LIVER, transjugular biopsy", not "LIVER, transjugular, biopsy".
const PROCEDURE_SITE = /^(?:transjugular|percutaneous|needle|core|needle core|laparoscopic|wedge)$/i;
const GRAFT_SITE = /^(?:allograft|transplant|graft)$/i;

/** The site as typed, without "liver" or "biopsy": "random", "segment 6", "right lobe". */
export function siteOf(v) {
  let s = stripDot(v.specimenName)
    .replace(/^\s*liver\b[\s,]*/i, '')
    .replace(/[\s,]*\b(?:needle\s+)?(?:core\s+)?biops(?:y|ies)\s*$/i, '')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .trim();
  if (/^[A-Z][a-z]/.test(s)) s = lc1(s);
  return s;
}

function siteLine(head, v) {
  const s = siteOf(v);
  if (!s) return `${head}, biopsy`;
  if (GRAFT_SITE.test(s)) return `${head} ${head === 'LIVER' ? 'ALLOGRAFT' : 'allograft'}, biopsy`;
  return PROCEDURE_SITE.test(s) ? `${head}, ${s} biopsy` : `${head}, ${s}, biopsy`;
}

export const specimenName = (part) => siteLine('Liver', part.values);
export const organPhrase = (part) => siteLine('LIVER', part.values);

// ---------- adequacy ----------

/** 'Good' | 'Compromised' | 'Inadequate' | null: the tier chosen, else the one the aggregate length gives. */
export const adequacyTier = (v) => (v.adequacy && v.adequacy !== 'Auto' ? v.adequacy : L.adequacyOf(v.coreLength));

function specimenSentence(v) {
  const n = num(v.cores);
  const frag = v.fragmented ? 'fragmented ' : '';
  const cores = n === 1 ? `a ${frag}core of liver` : n && n <= 10 ? `${WORDS[n]} ${frag}cores of liver` : n ? `${n} ${frag}cores of liver` : `${frag}cores of liver`;
  const len = num(v.coreLength);
  const measure = len ? ` measuring ${len} mm in ${n === 1 ? 'length' : 'aggregate length'}` : '';
  const pt = num(v.portalTracts);
  const tracts = pt === null ? '' : `, with ${pt === 0 ? 'no portal tracts' : pt === 1 ? 'one portal tract' : `${pt} portal tracts`}`;
  return `Sections show ${cores}${measure}${tracts}.`;
}

// An explicit "Compromised" prints its sentence; the automatic 10-20 mm tier only raises a Check, because most
// clinical cores fall in it and RCPath asks for the limitation to be stated when it matters.
function limitationSentence(v) {
  if (v.adequacy === 'Compromised') return 'The size of the biopsy limits the assessment.';
  return adequacyTier(v) === 'Inadequate' ? 'The biopsy is too small for a full assessment.' : '';
}

// ---------- shared inflammation sentences ----------

const INFILTRATE = {
  Lymphocytic: 'lymphocytic infiltrate',
  Lymphoplasmacytic: 'lymphoplasmacytic infiltrate',
  'Plasma cell-rich': 'plasma cell-rich infiltrate',
  'Mixed, with neutrophils': 'mixed inflammatory infiltrate including neutrophils',
  'Mixed, with eosinophils': 'mixed inflammatory infiltrate including eosinophils'
};

function portalSentence(v) {
  const infiltrate = INFILTRATE[v.infiltrate] || INFILTRATE.Lymphocytic;
  const comma = /including/.test(infiltrate) ? ',' : '';
  const iface = !v.interface || v.interface === 'Absent' ? 'without interface hepatitis' : `with ${lc1(v.interface)} interface hepatitis`;
  return `The portal tracts contain a ${lc1(v.portalInfl || 'Mild')} ${infiltrate}${comma} ${iface}.`;
}

const lobularSentence = (v, noun) =>
  (!v.lobular || v.lobular === 'Absent' ? 'There is no significant lobular inflammation.' : `There is ${lc1(v.lobular)} lobular ${noun}.`);

const SINGULAR = new Set(['emperipolesis', 'mild portal chronic inflammation']);
const seenSentence = (items) => (items.length ? `${cap1(listJoin(items))} ${items.length === 1 && SINGULAR.has(items[0]) ? 'is' : 'are'} seen.` : '');

// ---------- hepatitic ----------

const HEP_SEEN = [
  ['Plasma cell clusters', 'plasma cell clusters'], ['Hepatocyte rosettes', 'hepatocyte rosettes'], ['Emperipolesis', 'emperipolesis'],
  ['Acidophil bodies', 'acidophil bodies'], ['Ground-glass hepatocytes', 'ground-glass hepatocytes'],
  ['Portal lymphoid aggregates', 'portal lymphoid aggregates'], ['Eosinophils', 'eosinophils']
];
const NECROSIS = [['Confluent necrosis', 'confluent'], ['Bridging necrosis', 'bridging'], ['Centrilobular necrosis', 'centrilobular']];
const HEP_THERE = [['Bile duct injury', 'bile duct injury'], ['Canalicular cholestasis', 'canalicular cholestasis'], ['Steatosis', 'macrovesicular steatosis']];

function hepaticSentences(v) {
  const f = v.hepFeatures || [];
  const out = [portalSentence(v), lobularSentence(v, 'hepatitis')];
  out.push(seenSentence(HEP_SEEN.filter(([k]) => has(f, k)).map(([, w]) => w)));
  const adj = NECROSIS.filter(([k]) => has(f, k)).map(([, w]) => w);
  let necrosis = adj.length ? `${listJoin(adj)} necrosis` : '';
  if (!necrosis && v.hepDx === 'Drug-induced liver injury') {
    necrosis = { 'Zonal necrosis': 'zonal necrosis', 'Submassive necrosis': 'submassive necrosis' }[v.diliPattern] || '';
  }
  const there = [necrosis, ...HEP_THERE.filter(([k]) => has(f, k)).map(([, w]) => w)].filter(Boolean);
  if (there.length) out.push(`There is ${listJoin(there)}.`);
  out.push(hepGradeSentence(v));
  return out.filter(Boolean);
}

function hepGradeSentence(v) {
  const sys = gradeSystemOf(v);
  if (sys === 'Ishak modified HAI') {
    const h = L.ishakHai({ A: v.ishakA, B: v.ishakB, C: v.ishakC, D: v.ishakD }, { withoutD: isAih(v) });
    if (!h.complete) return '';
    const parts = L.ISHAK_HAI.filter((c) => h.items.includes(c.key)).map((c) => `${c.label} ${L.scoreOf(v[`ishak${c.key}`])}`);
    return `Modified HAI components: ${listJoin(parts)}.`;
  }
  if (sys === 'METAVIR') {
    const pn = L.scoreOf(v.metavirPn);
    const ln = L.scoreOf(v.metavirLn);
    if (pn === null || ln === null) return '';
    return `METAVIR components: piecemeal necrosis ${pn} and lobular necrosis ${ln}.`;
  }
  return '';
}

// ---------- biliary ----------

const BILIARY = [
  ['Florid duct lesion', 'florid duct lesions'], ['Granulomatous cholangitis', 'granulomatous cholangitis'],
  ['Lymphocytic cholangitis', 'lymphocytic cholangitis'], ['Ductular reaction', 'a ductular reaction'], ['Portal oedema', 'portal oedema'],
  ['Periportal cholate stasis', 'periportal cholate stasis'], ['Periductal concentric fibrosis', 'periductal concentric fibrosis'],
  ['Fibro-obliterative duct lesion', 'fibro-obliterative duct lesions'], ['Neutrophilic cholangitis', 'neutrophilic cholangitis'],
  ['Canalicular cholestasis', 'canalicular cholestasis'], ['Hepatocellular cholestasis', 'hepatocellular cholestasis'], ['Bile infarcts', 'bile infarcts']
];
const PLURAL = new Set(['florid duct lesions', 'fibro-obliterative duct lesions', 'bile infarcts']);

function biliarySentences(v) {
  const f = v.bilFeatures || [];
  const out = [portalSentence(v), lobularSentence(v, 'inflammation')];
  const items = BILIARY.filter(([k]) => has(f, k)).map(([, w]) => w);
  if (items.length) out.push(`There ${PLURAL.has(items[0]) ? 'are' : 'is'} ${listJoin(items)}.`);
  if (has(f, 'Bile duct loss')) {
    const d = num(v.ductlessTracts);
    const pt = num(v.portalTracts);
    if (d !== null && pt) out.push(`Bile ducts are absent from ${d} of ${pt} portal tracts.`);
    else if (d !== null) out.push(`Bile ducts are absent from ${d} portal tract${d === 1 ? '' : 's'}.`);
    else out.push('There is bile duct loss.');
  }
  if (isPbc(v)) {
    const fib = L.scoreOf(v.nkFibrosis);
    const loss = L.scoreOf(v.nkDuctLoss);
    const orcein = L.scoreOf(v.nkOrcein);
    if (fib !== null && loss !== null) {
      out.push(`Nakanuma scores: ${listJoin([`fibrosis ${fib}`, `bile duct loss ${loss}`, orcein !== null ? `orcein-positive granules ${orcein}` : ''])}.`);
    }
  }
  return out;
}

// ---------- steatotic ----------

const STEATOSIS_WORD = { 1: 'mild', 2: 'moderate', 3: 'marked' };
const BALLOONING = { 0: 'No ballooned hepatocytes are seen.', 1: 'There are a few ballooned hepatocytes.', 2: 'There are many ballooned hepatocytes.' };
const NAS_LOBULAR = { 0: 'There is no lobular inflammation.', 1: 'There is mild lobular inflammation.', 2: 'There is moderate lobular inflammation.', 3: 'There is marked lobular inflammation.' };
const STEAT_SEEN = [
  ['Mallory-Denk bodies', 'Mallory-Denk bodies'], ['Microvesicular steatosis', 'foci of microvesicular steatosis'], ['Lipogranulomas', 'lipogranulomas'],
  ['Glycogenated nuclei', 'glycogenated nuclei'], ['Megamitochondria', 'megamitochondria'], ['Portal inflammation', 'mild portal chronic inflammation']
];

const steatosisGradeOf = (v) => L.scoreOf(v.nasSteatosis) ?? L.steatosisGrade(v.steatosisPct);

function steatoticSentences(v) {
  const out = [];
  const pct = num(v.steatosisPct);
  const g = steatosisGradeOf(v);
  if (pct === 0) out.push('There is no steatosis.');
  else if (pct !== null) out.push(`There is macrovesicular steatosis involving about ${pct}% of the parenchyma.`);
  else if (g === 0) out.push('There is minimal macrovesicular steatosis.');
  else out.push(g ? `There is ${STEATOSIS_WORD[g]} macrovesicular steatosis.` : 'There is macrovesicular steatosis.');
  const b = L.scoreOf(v.nasBallooning);
  if (BALLOONING[b]) out.push(BALLOONING[b]);
  const lob = L.scoreOf(v.nasLobular);
  if (NAS_LOBULAR[lob]) out.push(NAS_LOBULAR[lob]);
  out.push(seenSentence(STEAT_SEEN.filter(([k]) => has(v.steatFeatures, k)).map(([, w]) => w)));
  const n = L.nas({ steatosis: v.nasSteatosis, lobular: v.nasLobular, ballooning: v.nasBallooning });
  if (n.complete) out.push(`NAS components: steatosis ${L.scoreOf(v.nasSteatosis)}, lobular inflammation ${lob} and ballooning ${b}.`);
  return out.filter(Boolean);
}

// ---------- transplant ----------

// Banff 2016 Table 1, as sentences (docs/reference/liver_biopsy-morphology.md §2f).
const RAI_PORTAL = {
  0: 'The portal tracts are not inflamed.',
  1: 'A minority of portal tracts contain a mainly lymphocytic infiltrate that does not expand them.',
  2: 'Most portal tracts are expanded by a mixed infiltrate of lymphocytes with occasional blasts, neutrophils and eosinophils.',
  3: 'Most portal tracts are markedly expanded by a mixed infiltrate with numerous blasts and eosinophils, spilling over into the periportal parenchyma.'
};
const RAI_DUCT = {
  0: 'The bile ducts are not inflamed.',
  1: 'A minority of bile ducts are cuffed and infiltrated by inflammatory cells, with mild reactive change.',
  2: 'Most bile ducts are infiltrated by inflammatory cells, and more than an occasional duct shows degenerative change.',
  3: 'Most bile ducts show degenerative change or focal luminal disruption.'
};
const RAI_VENOUS = {
  0: 'There is no venous endothelial inflammation.',
  1: 'Some portal and hepatic venules show subendothelial lymphocytic infiltration.',
  2: 'Most portal and hepatic venules show subendothelial infiltration.',
  3: 'Most venules show subendothelial infiltration, with perivenular inflammation and hepatocyte necrosis.'
};
const TX_FEATURES = [
  ['Central perivenulitis', 'central perivenulitis'], ['Plasma cell-rich infiltrate', 'a plasma cell-rich infiltrate'],
  ['Preservation injury', 'features of preservation injury'], ['Features of biliary obstruction', 'features of biliary obstruction'],
  ['Bile duct loss', 'bile duct loss'], ['Recurrent primary disease', 'features of recurrent primary disease'], ['Viral inclusions', 'viral inclusions']
];
const TX_PLURAL = /^(?:features|viral inclusions)/;

function transplantSentences(v) {
  const p = L.scoreOf(v.raiPortal);
  const b = L.scoreOf(v.raiBileDuct);
  const ve = L.scoreOf(v.raiVenous);
  const out = [RAI_PORTAL[p], RAI_DUCT[b], RAI_VENOUS[ve]].filter(Boolean);
  const items = TX_FEATURES.filter(([k]) => has(v.txFeatures, k)).map(([, w]) => w);
  if (items.length) out.push(`There ${TX_PLURAL.test(items[0]) ? 'are' : 'is'} also ${listJoin(items)}.`);
  const r = L.rai({ portal: v.raiPortal, bileDuct: v.raiBileDuct, venous: v.raiVenous });
  if (r.complete) out.push(`Rejection activity index components: portal inflammation ${p}, bile duct inflammation ${b} and venous endothelial inflammation ${ve}.`);
  return out;
}

// ---------- other ----------

const GRANULOMA = {
  'Non-necrotising epithelioid': 'non-necrotising epithelioid granulomas', 'Necrotising epithelioid': 'necrotising epithelioid granulomas',
  'Fibrin-ring': 'fibrin-ring granulomas', Lipogranulomas: 'lipogranulomas'
};
const GRANULOMA_SITE = { 'Portal and lobular': 'in the portal tracts and lobules', Portal: 'in the portal tracts', Lobular: 'in the lobules' };
const OUTFLOW = [
  ['Zone 3 sinusoidal dilatation', 'zone 3 sinusoidal dilatation', 'SINUSOIDAL DILATATION'], ['Sinusoidal congestion', 'sinusoidal congestion', 'CONGESTION'],
  ['Zone 3 hepatocyte atrophy', 'zone 3 hepatocyte atrophy', 'HEPATOCYTE ATROPHY'], ['Zone 3 hepatocyte loss', 'zone 3 hepatocyte loss', 'HEPATOCYTE LOSS'],
  ['Perivenular haemorrhage', 'perivenular haemorrhage', 'HAEMORRHAGE'], ['Hepatic venule obliteration', 'obliteration of hepatic venules', 'VENULAR OBLITERATION'],
  ['Perivenular fibrosis', 'perivenular fibrosis', 'FIBROSIS']
];

function otherSentences(v) {
  const dx = v.otherDx || 'Granulomatous hepatitis';
  if (dx === 'Granulomatous hepatitis') {
    return [`There are ${GRANULOMA[v.granulomaType] || GRANULOMA['Non-necrotising epithelioid']} ${GRANULOMA_SITE[v.granulomaSite] || GRANULOMA_SITE['Portal and lobular']}.`];
  }
  if (dx === 'Venous outflow obstruction') {
    const items = OUTFLOW.filter(([k]) => has(v.outflowFeatures, k)).map(([, w]) => w);
    return [items.length ? `There is ${listJoin(items)}.` : 'There is perivenular sinusoidal congestion.'];
  }
  if (dx === 'Non-specific reactive hepatitis') return ['There is mild portal and lobular inflammation, without interface hepatitis or significant hepatocyte injury.'];
  return []; // iron overload: the Perls sentence carries it
}

// ---------- fibrosis ----------

const FIBROSIS_WORDS = {
  'No fibrosis': 'no fibrosis', 'Portal fibrosis': 'portal fibrosis', 'Periportal fibrosis': 'periportal fibrosis',
  'Zone 3 perisinusoidal fibrosis': 'zone 3 perisinusoidal fibrosis', 'Perisinusoidal and periportal fibrosis': 'perisinusoidal and periportal fibrosis',
  'Bridging fibrosis': 'bridging fibrosis', 'Bridging fibrosis with nodules': 'bridging fibrosis with nodule formation', Cirrhosis: 'cirrhosis'
};
const FIBROSIS_DX = {
  'Portal fibrosis': 'PORTAL FIBROSIS', 'Periportal fibrosis': 'PERIPORTAL FIBROSIS', 'Zone 3 perisinusoidal fibrosis': 'PERISINUSOIDAL FIBROSIS',
  'Perisinusoidal and periportal fibrosis': 'PERISINUSOIDAL AND PERIPORTAL FIBROSIS', 'Bridging fibrosis': 'BRIDGING FIBROSIS',
  'Bridging fibrosis with nodules': 'BRIDGING FIBROSIS with NODULES', Cirrhosis: 'CIRRHOSIS'
};
// Nakanuma fibrosis score in words (Nakanuma 2010, Table 1).
const NAKANUMA_FIBROSIS = { 0: 'no fibrosis beyond the portal tracts', 1: 'periportal or incomplete septal fibrosis', 2: 'bridging fibrosis', 3: 'cirrhosis' };
const NAKANUMA_FIBROSIS_DX = { 1: 'PERIPORTAL FIBROSIS', 2: 'BRIDGING FIBROSIS', 3: 'CIRRHOSIS' };
const CONNECTIVE = ['Reticulin', 'Masson trichrome'];

const perivenularFibrosis = (v) => patternOf(v) === 'Other' && v.otherDx === 'Venous outflow obstruction' && has(v.outflowFeatures, 'Perivenular fibrosis');

/** The stage entry for the chosen system, or null (unstaged, an invalid stage, or PBC, which stages by Nakanuma). */
const stageInfo = (v) => (isPbc(v) ? null : L.stageOf(v.stageSystem, v.stage));

function fibrosisSentence(v) {
  let words;
  if (isPbc(v)) {
    words = NAKANUMA_FIBROSIS[L.scoreOf(v.nkFibrosis)];
  } else {
    const st = stageInfo(v);
    words = st ? st.words : String(v.stage ?? '').trim() ? '' : FIBROSIS_WORDS[v.fibrosis || 'No fibrosis'];
    // Perivenular fibrosis is recorded with the outflow features, so "no fibrosis" would contradict it.
    if (words === 'no fibrosis' && perivenularFibrosis(v)) words = 'no portal fibrosis';
  }
  if (!words) return '';
  const ct = CONNECTIVE.filter((s) => has(stainsOf(v), s));
  if (!ct.length) return `There is ${words}.`;
  return `${listJoin(ct)} ${ct.length > 1 ? 'stains show' : 'stain shows'} ${words}.`;
}

/** Fibrosis for the diagnosis: 'BRIDGING FIBROSIS', 'NONE' for no fibrosis, '' when it cannot be said. */
function fibrosisDx(v) {
  if (isPbc(v)) {
    const f = L.scoreOf(v.nkFibrosis);
    if (f === null) return '';
    return f === 0 ? 'NONE' : NAKANUMA_FIBROSIS_DX[f] || '';
  }
  const st = stageInfo(v);
  if (st) return st.dx || 'NONE';
  if (String(v.stage ?? '').trim()) return '';
  return v.fibrosis && v.fibrosis !== 'No fibrosis' ? FIBROSIS_DX[v.fibrosis] || '' : 'NONE';
}

/** Attach the fibrosis to a head: "X with BRIDGING FIBROSIS", "X with Y and BRIDGING FIBROSIS", "X without Y, with ...". */
function withFibrosis(head, fib, none = '') {
  if (!fib) return head;
  if (fib === 'NONE') return `${head}${none}`;
  const joint = / without /.test(head) ? ', with ' : / with /.test(head) ? ' and ' : ' with ';
  return `${head}${joint}${fib}`;
}

/** "; PORTAL FIBROSIS (Ishak stage 2/6)" — fibrosis as its own clause, for heads that are not a disease process. */
function fibrosisClause(v) {
  const fib = fibrosisDx(v);
  if (!fib || fib === 'NONE') return '';
  const st = stageInfo(v);
  return `; ${fib}${st ? ` (${st.label})` : ''}`;
}

// ---------- stains ----------

const IRON_GRADIENT = { 'Periportal-to-centrilobular gradient': ' with a periportal-to-centrilobular gradient', Panlobular: ' in a panlobular distribution', Patchy: ' in a patchy distribution' };

export function ironPhrase(v) {
  const grade = `grade ${v.ironGrade || '1'} hepatocellular iron${IRON_GRADIENT[v.ironGradient] || ''}`;
  if (v.ironSite === 'Hepatocellular') return grade;
  if (v.ironSite === 'Kupffer cells and macrophages') return 'iron in Kupffer cells and portal macrophages';
  if (v.ironSite === 'Mixed') return `${grade}, with iron in Kupffer cells and portal macrophages`;
  return 'no stainable iron';
}

const STAIN_SENTENCE = {
  'D-PAS': (v) => ({
    'No globules': 'D-PAS stain shows no diastase-resistant globules.',
    'Diastase-resistant globules': 'D-PAS stain shows diastase-resistant globules in hepatocytes.',
    'Ceroid-laden macrophages': 'D-PAS stain highlights ceroid-laden macrophages.'
  })[v.stDpas || 'No globules'],
  Orcein: (v) => ({
    'No copper-associated protein': 'Orcein stain shows no copper-associated protein.',
    'Copper-associated protein in periportal hepatocytes': 'Orcein stain shows copper-associated protein in periportal hepatocytes.',
    'HBsAg in hepatocytes': 'Orcein stain shows hepatitis B surface antigen in hepatocytes.'
  })[v.stOrcein || 'No copper-associated protein'],
  Rhodanine: (v) => ({
    'No stainable copper': 'Rhodanine stain shows no stainable copper.',
    'Copper in periportal hepatocytes': 'Rhodanine stain shows copper in periportal hepatocytes.'
  })[v.stRhodanine || 'No stainable copper'],
  CK7: (v) => ({
    'No ductular reaction': 'CK7 shows no ductular reaction.',
    'Ductular reaction': 'CK7 highlights a ductular reaction.',
    'Periportal hepatocyte expression': 'CK7 is expressed by periportal hepatocytes.',
    'Ductular reaction and periportal hepatocyte expression': 'CK7 highlights a ductular reaction and is expressed by periportal hepatocytes.'
  })[v.stCk7 || 'No ductular reaction'],
  CK19: (v) => ({
    'Bile ducts in all portal tracts': 'CK19 shows bile ducts in all portal tracts.',
    'Bile duct loss': 'CK19 shows bile duct loss.',
    'Ductular reaction': 'CK19 highlights a ductular reaction.'
  })[v.stCk19 || 'Bile ducts in all portal tracts'],
  HBsAg: (v) => ({
    Negative: 'HBsAg immunostain is negative.',
    'Cytoplasmic staining': 'HBsAg immunostain shows cytoplasmic staining of hepatocytes.',
    'Membranous staining': 'HBsAg immunostain shows membranous staining of hepatocytes.',
    'Cytoplasmic and membranous staining': 'HBsAg immunostain shows cytoplasmic and membranous staining of hepatocytes.'
  })[v.stHbsag || 'Negative'],
  HBcAg: (v) => ({
    Negative: 'HBcAg immunostain is negative.',
    'Nuclear staining': 'HBcAg immunostain shows nuclear staining of hepatocytes.',
    'Cytoplasmic staining': 'HBcAg immunostain shows cytoplasmic staining of hepatocytes.',
    'Nuclear and cytoplasmic staining': 'HBcAg immunostain shows nuclear and cytoplasmic staining of hepatocytes.'
  })[v.stHbcag || 'Negative']
};
const STAIN_ORDER = ['D-PAS', 'Orcein', 'Rhodanine', 'CK7', 'CK19', 'HBsAg', 'HBcAg'];

function stainSentences(v) {
  const out = [];
  if (has(stainsOf(v), 'Perls')) out.push(`Perls stain shows ${ironPhrase(v)}.`);
  else if (ironOverload(v) && v.ironSite && v.ironSite !== 'None') out.push(`There is ${ironPhrase(v)}.`);
  for (const s of STAIN_ORDER) if (has(stainsOf(v), s)) out.push(STAIN_SENTENCE[s](v));
  return out.filter(Boolean);
}

// ---------- microscopy ----------

export function microscopy(part) {
  const v = part.values;
  const s = [specimenSentence(v)];
  const pattern = patternOf(v);
  if (pattern === 'Hepatitic') s.push(...hepaticSentences(v));
  else if (pattern === 'Biliary') s.push(...biliarySentences(v));
  else if (pattern === 'Steatotic') s.push(...steatoticSentences(v));
  else if (pattern === 'Transplant') s.push(...transplantSentences(v));
  else if (pattern === 'Other') s.push(...otherSentences(v));
  else s.push('The lobular architecture is preserved, and the portal tracts and hepatocytes show no significant abnormality.');
  const fib = fibrosisSentence(v);
  if (fib) s.push(fib);
  s.push(...stainSentences(v));
  const limit = limitationSentence(v);
  if (limit) s.push(limit);
  const extra = stripDot(v.additionalNotes);
  if (extra) s.push(`${cap1(extra)}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- grades and stages for the diagnosis ----------

export function metavirActivityOf(v) {
  if (v.metavirA && v.metavirA !== 'Auto') return v.metavirA;
  return L.metavirActivity(v.metavirPn, v.metavirLn);
}

/** Bracketed labels: "modified HAI 5/14", "METAVIR A2 F3", "Batts-Ludwig grade 2/4, stage 3/4", "Ishak stage 3/6". */
function gradeStageLabels(v) {
  const out = [];
  const st = stageInfo(v);
  const sys = gradeSystemOf(v);
  let stageDone = false;
  if (sys === 'Ishak modified HAI') {
    const h = L.ishakHai({ A: v.ishakA, B: v.ishakB, C: v.ishakC, D: v.ishakD }, { withoutD: isAih(v) });
    if (h.complete) out.push(`modified HAI ${h.total}/${h.max}`);
  } else if (sys === 'METAVIR') {
    const a = metavirActivityOf(v);
    const f = st && v.stageSystem === 'METAVIR' ? `F${v.stage}` : '';
    if (a) { out.push(['METAVIR', a, f].filter(Boolean).join(' ')); stageDone = !!f; }
  } else if (sys === 'Batts-Ludwig') {
    const g = L.scoreOf(v.battsGrade);
    const s = st && v.stageSystem === 'Batts-Ludwig' ? `, stage ${v.stage}/4` : '';
    if (g !== null && g <= 4) { out.push(`Batts-Ludwig grade ${g}/4${s}`); stageDone = !!s; }
  }
  if (st && !stageDone) out.push(st.label);
  return out;
}

const bracket = (labels) => (labels.length ? ` (${labels.join('; ')})` : '');
const CHIP_ACTIVITY = ['MINIMAL ACTIVITY', 'MILD ACTIVITY', 'MODERATE ACTIVITY', 'MARKED ACTIVITY'];

/** The activity words: from METAVIR or Batts-Ludwig when that grade is recorded, else the worse of interface and lobular. */
export function activityOf(v) {
  const sys = gradeSystemOf(v);
  if (sys === 'METAVIR') {
    const a = metavirActivityOf(v);
    if (a) return L.METAVIR_ACTIVITY_WORDS[a].toUpperCase();
  }
  if (sys === 'Batts-Ludwig') {
    const g = L.scoreOf(v.battsGrade);
    if (g !== null && g <= 4) return L.BATTS_GRADE_WORDS[g].toUpperCase();
  }
  return CHIP_ACTIVITY[Math.max(rank(v.interface), rank(v.lobular))];
}

// ---------- diagnosis ----------

const AIH_QUALIFIER = { 'Likely AIH': 'consistent with', Typical: 'consistent with', 'Possible AIH': 'compatible with', Compatible: 'compatible with' };
const DILI_HEAD = {
  'Acute hepatitis': ['ACUTE HEPATITIS', true], 'Chronic hepatitis': ['CHRONIC HEPATITIS', false],
  'Zonal necrosis': ['ZONAL NECROSIS', true], 'Submassive necrosis': ['SUBMASSIVE NECROSIS', true]
};

function hepaticLine(v) {
  const dx = v.hepDx || 'Chronic hepatitis';
  let head = 'CHRONIC HEPATITIS';
  let acute = false;
  let qualifier = '';
  if (dx === 'Acute hepatitis') { head = 'ACUTE HEPATITIS'; acute = true; }
  else if (dx === 'Drug-induced liver injury') {
    [head, acute] = DILI_HEAD[v.diliPattern] || DILI_HEAD['Acute hepatitis'];
    qualifier = ', compatible with DRUG-INDUCED LIVER INJURY';
  } else {
    head = { 'Chronic hepatitis B': 'CHRONIC HEPATITIS B', 'Chronic hepatitis C': 'CHRONIC HEPATITIS C' }[dx] || 'CHRONIC HEPATITIS';
    if (dx === 'Autoimmune hepatitis' && AIH_QUALIFIER[v.aihCategory]) qualifier = `, ${AIH_QUALIFIER[v.aihCategory]} AUTOIMMUNE HEPATITIS`;
  }
  if (acute) head = withFibrosis(head, fibrosisDx(v));
  else {
    const activity = activityOf(v);
    const fib = fibrosisDx(v);
    if (activity === 'NO ACTIVITY') head = fib === 'NONE' ? `${head} without ACTIVITY or FIBROSIS` : withFibrosis(`${head} without ACTIVITY`, fib);
    else head = withFibrosis(`${head} with ${activity}`, fib, ' and NO FIBROSIS');
  }
  return `${head}${bracket(gradeStageLabels(v))}${qualifier}`;
}

const LARGE_DUCT = [
  ['Portal oedema', 'PORTAL OEDEMA'], ['Ductular reaction', 'DUCTULAR REACTION'], ['Neutrophilic cholangitis', 'ACUTE CHOLANGITIS'],
  ['Canalicular cholestasis', 'CHOLESTASIS'], ['Hepatocellular cholestasis', 'CHOLESTASIS'], ['Bile infarcts', 'BILE INFARCTS']
];
const DILI_CHOLESTATIC = { 'Acute (bland) cholestasis': 'ACUTE CHOLESTASIS', 'Cholestatic hepatitis': 'CHOLESTATIC HEPATITIS', 'Chronic cholestasis': 'CHRONIC CHOLESTASIS' };

export function nakanumaOf(v) {
  if (v.nkStage && v.nkStage !== 'Auto') return Number(v.nkStage);
  const r = L.nakanumaStage({ fibrosis: v.nkFibrosis, ductLoss: v.nkDuctLoss, orcein: v.nkOrcein });
  return r ? r.stage : null;
}

function biliaryLine(v) {
  const f = v.bilFeatures || [];
  const dx = v.bilDx || 'Chronic biliary disease';
  const labels = [];
  let head = 'CHRONIC BILIARY DISEASE';
  let qualifier = '';
  if (dx === 'Primary biliary cholangitis') {
    const florid = has(f, 'Florid duct lesion') || has(f, 'Granulomatous cholangitis');
    if (florid) head = 'CHRONIC NON-SUPPURATIVE DESTRUCTIVE CHOLANGITIS';
    qualifier = `, ${florid ? 'consistent with' : 'compatible with'} PRIMARY BILIARY CHOLANGITIS`;
    const stage = nakanumaOf(v);
    if (stage) labels.push(`Nakanuma stage ${stage}, ${L.NAKANUMA_STAGE_WORDS[stage]}`);
    const ca = L.scoreOf(v.nkCA);
    const ha = L.scoreOf(v.nkHA);
    const act = [ca !== null ? `CA${ca}` : '', ha !== null ? `HA${ha}` : ''].filter(Boolean).join(', ');
    if (act) labels.push(act);
  } else if (dx === 'Primary sclerosing cholangitis') {
    qualifier = ', compatible with PRIMARY SCLEROSING CHOLANGITIS';
  } else if (dx === 'Large-duct obstruction') {
    head = andUpper([...new Set(LARGE_DUCT.filter(([k]) => has(f, k)).map(([, w]) => w))]) || 'BILIARY-TYPE INJURY';
    qualifier = ', compatible with LARGE-DUCT OBSTRUCTION';
  } else if (dx === 'Drug-induced liver injury') {
    head = DILI_CHOLESTATIC[v.diliCholPattern] || DILI_CHOLESTATIC['Cholestatic hepatitis'];
    if (head === 'CHRONIC CHOLESTASIS' && has(f, 'Bile duct loss')) head += ' with BILE DUCT LOSS';
    qualifier = ', compatible with DRUG-INDUCED LIVER INJURY';
  }
  head = withFibrosis(head, fibrosisDx(v));
  const st = stageInfo(v);
  if (st) labels.push(st.label);
  return `${head}${bracket(labels)}${qualifier}`;
}

const STEATOSIS_DX = { 1: 'MILD', 2: 'MODERATE', 3: 'MARKED' };
const STEATOHEPATITIS_CAUSE = {
  'Metabolic dysfunction-associated': ', in keeping with METABOLIC DYSFUNCTION-ASSOCIATED STEATOHEPATITIS (MASH)',
  'Metabolic dysfunction and alcohol-related': ', in keeping with METABOLIC DYSFUNCTION AND ALCOHOL-ASSOCIATED LIVER DISEASE (MetALD)',
  'Alcohol-related': ', in keeping with ALCOHOL-RELATED STEATOHEPATITIS',
  'Drug-induced': ', compatible with DRUG-INDUCED LIVER INJURY'
};
const STEATOSIS_CAUSE = {
  'Metabolic dysfunction-associated': ', in keeping with METABOLIC DYSFUNCTION-ASSOCIATED STEATOTIC LIVER DISEASE (MASLD)',
  'Metabolic dysfunction and alcohol-related': ', in keeping with METABOLIC DYSFUNCTION AND ALCOHOL-ASSOCIATED LIVER DISEASE (MetALD)',
  'Alcohol-related': ', in keeping with ALCOHOL-RELATED LIVER DISEASE',
  'Drug-induced': ', compatible with DRUG-INDUCED LIVER INJURY'
};

export function safOf(v) {
  return L.saf({ steatosis: v.nasSteatosis, ballooning: v.nasBallooning, lobular: v.safLobular, stage: v.stageSystem === 'NASH CRN' ? v.stage : '' });
}

function steatoticLine(v) {
  const sh = (v.steatDx || 'Steatohepatitis') === 'Steatohepatitis';
  const g = steatosisGradeOf(v);
  let head = sh ? 'STEATOHEPATITIS' : `${STEATOSIS_DX[g] ? `${STEATOSIS_DX[g]} ` : ''}STEATOSIS without STEATOHEPATITIS`;
  head = withFibrosis(head, fibrosisDx(v), sh ? ' without FIBROSIS' : '');
  const labels = [];
  const n = L.nas({ steatosis: v.nasSteatosis, lobular: v.nasLobular, ballooning: v.nasBallooning });
  if (n.complete) labels.push(`NAS ${n.total}/8`);
  const st = stageInfo(v);
  if (st) labels.push(st.label);
  if (v.safReport) {
    const s = safOf(v);
    if (s.label) labels.push(s.label);
  }
  const cause = (sh ? STEATOHEPATITIS_CAUSE : STEATOSIS_CAUSE)[v.steatContext] || '';
  return `${head}${bracket(labels)}${cause}`;
}

const TCMR = {
  'No rejection': 'NO EVIDENCE OF REJECTION',
  'Indeterminate for rejection': 'INDETERMINATE FOR T-CELL-MEDIATED REJECTION',
  'Mild acute T-cell-mediated rejection': 'MILD ACUTE T-CELL-MEDIATED REJECTION',
  'Moderate acute T-cell-mediated rejection': 'MODERATE ACUTE T-CELL-MEDIATED REJECTION',
  'Severe acute T-cell-mediated rejection': 'SEVERE ACUTE T-CELL-MEDIATED REJECTION'
};

function transplantLine(v) {
  const r = L.rai({ portal: v.raiPortal, bileDuct: v.raiBileDuct, venous: v.raiVenous });
  return `${TCMR[v.txDx] || TCMR['No rejection']}${bracket(r.complete ? [`RAI ${r.total}/9`] : [])}${fibrosisClause(v)}`;
}

const GRANULOMA_DX = {
  'Non-necrotising epithelioid': 'NON-NECROTISING GRANULOMATOUS INFLAMMATION', 'Necrotising epithelioid': 'NECROTISING GRANULOMATOUS INFLAMMATION',
  'Fibrin-ring': 'FIBRIN-RING GRANULOMAS', Lipogranulomas: 'LIPOGRANULOMAS'
};
const IRON_DX = { Hepatocellular: 'HEPATOCELLULAR SIDEROSIS', 'Kupffer cells and macrophages': 'MESENCHYMAL SIDEROSIS', Mixed: 'MIXED HEPATOCELLULAR AND MESENCHYMAL SIDEROSIS' };

function otherLine(v) {
  const dx = v.otherDx || 'Granulomatous hepatitis';
  if (dx === 'Granulomatous hepatitis') return `${GRANULOMA_DX[v.granulomaType] || GRANULOMA_DX['Non-necrotising epithelioid']}${fibrosisClause(v)}`;
  if (dx === 'Iron overload') {
    const head = IRON_DX[v.ironSite] || 'NO STAINABLE IRON';
    const grade = ['Hepatocellular', 'Mixed'].includes(v.ironSite) ? ` (grade ${v.ironGrade || '1'}/4)` : '';
    return `${head}${grade}${fibrosisClause(v)}`;
  }
  if (dx === 'Venous outflow obstruction') {
    const words = OUTFLOW.filter(([k]) => has(v.outflowFeatures, k)).map(([, , w]) => w);
    return `PERIVENULAR ${andUpper(words) || 'CONGESTION'}, compatible with VENOUS OUTFLOW OBSTRUCTION${fibrosisClause(v)}`;
  }
  return `NON-SPECIFIC REACTIVE HEPATITIS${fibrosisClause(v)}`;
}

/** Hepatocellular iron of grade 2 or more outside the iron-overload head gets its own clause. */
function ironClause(v) {
  if (ironOverload(v) || !hepatocellularIron(v) || Number(v.ironGrade || '1') < 2) return '';
  return `; ${IRON_DX[v.ironSite]} (grade ${v.ironGrade}/4)`;
}

export function mainLine(v) {
  const pattern = patternOf(v);
  let line;
  if (pattern === 'Hepatitic') line = hepaticLine(v);
  else if (pattern === 'Biliary') line = biliaryLine(v);
  else if (pattern === 'Steatotic') line = steatoticLine(v);
  else if (pattern === 'Transplant') line = transplantLine(v);
  else if (pattern === 'Other') line = otherLine(v);
  else line = `NO SIGNIFICANT HISTOLOGICAL ABNORMALITY${fibrosisClause(v)}`;
  return `${line}${ironClause(v)}`;
}

export function diagnosis(part) {
  return `(${part.label}) ${organPhrase(part)} - ${mainLine(part.values)}`;
}

// ---------- checks ----------

const LYMPHOPLASMACYTIC = ['Lymphoplasmacytic', 'Plasma cell-rich'];

/**
 * IAIHG 2022 histology category (Lohse 2022, Table 5) from the recorded features, portal and lobular patterns
 * together: 'Likely AIH', 'Possible AIH', 'Unlikely AIH', or null when neither pattern applies.
 */
export function aih2022(v) {
  const lp = LYMPHOPLASMACYTIC.includes(v.infiltrate);
  const moreThanMild = rank(v.interface) > 1 || rank(v.lobular) > 1;
  const other = !!v.otherDisease;
  const fibrosis = fibrosisDx(v);
  const portalFibrosis = !!fibrosis && fibrosis !== 'NONE';
  const lobularLikely = rank(v.lobular) > 1 && (lp || rank(v.interface) > 0 || portalFibrosis);
  if (!other && ((lp && moreThanMild) || lobularLikely)) return 'Likely AIH';
  if ((lp || rank(v.lobular) > 0) && (!other || moreThanMild)) return 'Possible AIH';
  if (other) return 'Unlikely AIH';
  return null;
}

export function validate(part) {
  const v = part.values;
  const { out, at, err, warn } = checks();
  const info = (m, f) => at('info', m, f);
  const pattern = patternOf(v);

  // Adequacy (RCPath G064; BSG 2020).
  const len = num(v.coreLength);
  const derived = L.adequacyOf(v.coreLength);
  if (len === null) info('The aggregate core length is not recorded: RCPath asks for it in every report.', 'coreLength');
  else if (v.adequacy && v.adequacy !== 'Auto' && derived && v.adequacy !== derived) {
    warn(`Adequacy ${v.adequacy} does not match ${len} mm (${derived.toLowerCase()} by length: good over 20 mm, compromised 10-20 mm, inadequate under 10 mm).`, 'adequacy');
  } else if ((v.adequacy || 'Auto') === 'Auto' && derived === 'Compromised') {
    info(`${len} mm is compromised by length (10-20 mm): choose Compromised to state the limitation if it matters.`, 'adequacy');
  }
  const pt = num(v.portalTracts);
  if (pt !== null && pt <= L.FEW_PORTAL_TRACTS && pattern !== 'No significant abnormality') {
    info(`${pt} portal tracts: 10 or fewer under-estimate grade and stage (BSG 2020).`, 'portalTracts');
  }
  const ductless = num(v.ductlessTracts);
  if (isBil(v) && has(v.bilFeatures, 'Bile duct loss') && ductless !== null && pt !== null && ductless > pt) {
    err(`${ductless} portal tracts without a bile duct is more than the ${pt} portal tracts recorded.`, 'ductlessTracts');
  }

  // Grading.
  const sys = gradeSystemOf(v);
  if (sys === 'Ishak modified HAI') {
    const h = L.ishakHai({ A: v.ishakA, B: v.ishakB, C: v.ishakC, D: v.ishakD }, { withoutD: isAih(v) });
    if (h.outOfRange.length) err(`Modified HAI: ${listJoin(h.outOfRange)} out of range.`, 'ishakA');
    else if (!h.complete) warn(`Modified HAI: ${listJoin(h.missing)} not scored, so the grade is not printed.`, 'ishakA');
  } else if (sys === 'METAVIR') {
    const auto = L.metavirActivity(v.metavirPn, v.metavirLn);
    const chosen = v.metavirA && v.metavirA !== 'Auto' ? v.metavirA : '';
    if (!auto && !chosen) warn('METAVIR: score piecemeal and lobular necrosis, or choose the activity grade.', 'metavirPn');
    else if (auto && chosen && auto !== chosen) warn(`METAVIR activity ${chosen} does not match piecemeal necrosis ${v.metavirPn} and lobular necrosis ${v.metavirLn} (${auto}).`, 'metavirA');
  } else if (sys === 'Batts-Ludwig' && L.scoreOf(v.battsGrade) === null) {
    warn('Batts-Ludwig: the grade is not chosen.', 'battsGrade');
  }

  // Staging.
  if (!isPbc(v)) {
    for (const i of L.stageIssues(v.stageSystem, v.stage)) at(i.level, i.message, 'stage');
    if (pattern === 'No significant abnormality') {
      const fib = fibrosisDx(v);
      if (fib && fib !== 'NONE') warn('No significant abnormality is recorded with fibrosis: choose the pattern that explains it.', 'pattern');
    }
  }

  // AIH categories (IAIHG 2022; simplified criteria 2008).
  if (isAih(v)) {
    const cat = v.aihCategory;
    if (cat === 'Unlikely AIH' || cat === 'Atypical') {
      warn(`The AIH histology category is ${cat.replace(' AIH', '').toLowerCase()}, so the diagnosis line does not name autoimmune hepatitis: revise the category or choose another diagnosis.`, 'aihCategory');
    }
    if ((v.aihSystem || 'IAIHG 2022') === 'IAIHG 2022') {
      const expected = aih2022(v);
      if (cat === 'Likely AIH' && expected !== 'Likely AIH') {
        warn('Likely AIH (IAIHG 2022) needs a lymphoplasmacytic portal infiltrate with more than mild interface or lobular hepatitis, and no features of another liver disease.', 'aihCategory');
      } else if (cat !== 'Likely AIH' && expected === 'Likely AIH') {
        info('The recorded features meet likely AIH (IAIHG 2022).', 'aihCategory');
      }
    } else if (cat === 'Typical') {
      const missing = [
        v.interface && v.interface !== 'Absent' ? '' : 'interface hepatitis',
        LYMPHOPLASMACYTIC.includes(v.infiltrate) ? '' : 'a lymphoplasmacytic infiltrate',
        has(v.hepFeatures, 'Emperipolesis') ? '' : 'emperipolesis',
        has(v.hepFeatures, 'Hepatocyte rosettes') ? '' : 'rosettes'
      ].filter(Boolean);
      if (missing.length) warn(`Typical AIH (2008) needs all of interface hepatitis, a lymphoplasmacytic infiltrate, emperipolesis and rosettes: ${listJoin(missing)} not recorded.`, 'aihCategory');
    }
  }
  if (isHep(v) && (v.hepDx || 'Chronic hepatitis') === 'Chronic hepatitis') {
    info('RCPath advises against an unqualified "chronic hepatitis": give the likely cause, or say it is uncertain, in a comment.', 'hepDx');
  }

  // PBC (Nakanuma 2010).
  if (isPbc(v)) {
    const r = L.nakanumaStage({ fibrosis: v.nkFibrosis, ductLoss: v.nkDuctLoss, orcein: v.nkOrcein });
    const chosen = v.nkStage && v.nkStage !== 'Auto' ? Number(v.nkStage) : null;
    if (!r && chosen === null) warn('Nakanuma: score fibrosis and bile duct loss, or choose the stage.', 'nkFibrosis');
    else if (r && chosen !== null && r.stage !== chosen) warn(`Nakanuma stage ${chosen} does not match the item sum ${r.sum}/${r.max} (stage ${r.stage}).`, 'nkStage');
  }

  // Steatotic disease (NASH CRN; SAF and FLIP).
  if (pattern === 'Steatotic') {
    const n = L.nas({ steatosis: v.nasSteatosis, lobular: v.nasLobular, ballooning: v.nasBallooning });
    if (n.entered && !n.complete) warn(`NAS: ${listJoin(n.missing)} not scored, so the NAS is not printed.`, 'nasSteatosis');
    const pct = num(v.steatosisPct);
    const g = L.scoreOf(v.nasSteatosis);
    const fromPct = L.steatosisGrade(v.steatosisPct);
    if (pct !== null && fromPct === null) err(`Steatosis ${pct}% is not a percentage.`, 'steatosisPct');
    else if (fromPct !== null && g !== null && fromPct !== g) warn(`Steatosis ${pct}% is grade ${fromPct} (under 5% 0, 5-33% 1, over 33-66% 2, over 66% 3); the grade entered is ${g}.`, 'nasSteatosis');
    const fl = L.flip({ steatosis: v.nasSteatosis ?? '', ballooning: v.nasBallooning, lobular: v.nasLobular });
    const sh = (v.steatDx || 'Steatohepatitis') === 'Steatohepatitis';
    if (fl === 'none') warn('Steatosis grade 0 (under 5%): this is not steatotic liver disease by NASH CRN or FLIP.', 'nasSteatosis');
    else if (fl === 'steatohepatitis' && !sh) warn('Steatosis, ballooning and lobular inflammation are each scored at least 1, which FLIP reads as steatohepatitis.', 'steatDx');
    else if (fl === 'steatosis' && sh) warn('Steatohepatitis by FLIP needs ballooning and lobular inflammation each scored at least 1.', 'steatDx');
    // Nothing scored yet: the diagnosis would print without the features that define it (FLIP; RCPath G064).
    if (sh && !n.entered) warn('Steatohepatitis: score ballooning and lobular inflammation; the microscopy describes them only once scored.', 'nasBallooning');
    if (v.safReport) {
      const s = safOf(v);
      if (!s.complete) warn('SAF needs the steatosis grade, ballooning, SAF lobular inflammation and a NASH CRN stage.', 'safLobular');
    }
  }

  // Transplant (Banff 2016): the RAI is recorded, never compared with the global assessment.
  if (pattern === 'Transplant') {
    const r = L.rai({ portal: v.raiPortal, bileDuct: v.raiBileDuct, venous: v.raiVenous });
    if (r.entered && !r.complete) warn(`RAI: ${listJoin(r.missing)} not scored, so the RAI is not printed.`, 'raiPortal');
    else if (!r.entered && v.txDx && v.txDx !== 'No rejection' && v.txDx !== 'Indeterminate for rejection') {
      warn('Acute rejection is recorded without the rejection activity index.', 'raiPortal');
    }
  }

  // Iron.
  if (ironOverload(v) && (!v.ironSite || v.ironSite === 'None')) warn('Iron overload is the diagnosis but no iron is recorded.', 'ironSite');
  if (ironOverload(v) && !has(stainsOf(v), 'Perls')) info('Iron overload without a Perls stain in the stain list.', 'stains');

  return out;
}

export default { specimenName, microscopy, diagnosis, validate };
