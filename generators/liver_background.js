// Background liver for the neoplastic liver pair: the mass-lesion biopsy (generators/liver_lesion_biopsy.js)
// and the HCC resection (generators/hcc.js). Cards: docs/roadmap.md "Liver biopsy — neoplastic" and
// "HCC — resection synoptic" (pulled by the user 2026-10-02).
//
// The findings are the QMH GI-HCC "Additional pathologic findings" boxes (CAP Hepatocellular 4.3.0.0). The
// page asks for fibrosis "providing name of the scheme and assessment scale used", so the stage is named with
// its system from src/staging/liver.js — the same Ishak, METAVIR, NASH CRN and Batts-Ludwig tiers, words and
// diagnosis phrases as the medical liver biopsy (generators/liver_biopsy.js). House diagnosis line, measured
// on the five-year file: "- CHRONIC HEPATITIS B with CIRRHOSIS", the aetiology in capitals and the fibrosis
// joined by a lower-case "with" (docs/specs/diagnosis-connectors.md).
// Field ids are shared by both schemas: bgFindings, bgStageSystem, bgStage, bgAetiology, bgAetiologyOther,
// bgSteatosisPct, bgOther.

import * as L from '../src/staging/liver.js';

const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const stripDot = (s) => String(s || '').trim().replace(/[.;:\s]+$/, '');
const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};

/** The QMH boxes, verbatim apart from British spelling. Keep in step with the bgFindings options. */
export const FINDING = {
  none: 'None identified',
  fibrosis: 'Fibrosis (specify extent, providing name of the scheme and assessment scale used)',
  cirrhosis: 'Cirrhosis',
  lgdn: 'Low-grade dysplastic nodule',
  hgdn: 'High-grade dysplastic nodule',
  steatosis: 'Steatosis',
  steatohepatitis: 'Steatohepatitis',
  iron: 'Iron overload',
  hepatitis: 'Chronic hepatitis (specify aetiology)',
  other: 'Other (specify)'
};
const ORDER = [FINDING.fibrosis, FINDING.cirrhosis, FINDING.lgdn, FINDING.hgdn, FINDING.steatosis, FINDING.steatohepatitis, FINDING.iron, FINDING.hepatitis, FINDING.other];

export const findingsOf = (v) => arr(v.bgFindings).filter((s) => s !== FINDING.none);
const has = (v, s) => arr(v.bgFindings).includes(s);

/** The stage entry ({ label, words, dx, cirrhotic }) or null. */
export const stageInfo = (v) => L.stageOf(v.bgStageSystem, v.bgStage);

/** "hepatitis B" / "autoimmune hepatitis" / typed text: the aetiology as it reads after "chronic". */
function aetiologyWords(v) {
  const a = v.bgAetiology || 'Not determined';
  if (a === 'Other (specify)') return stripDot(v.bgAetiologyOther) || '';
  return { 'Hepatitis B': 'hepatitis B', 'Hepatitis C': 'hepatitis C', 'Hepatitis B and D': 'hepatitis B and D', Autoimmune: 'autoimmune hepatitis', 'Not determined': '' }[a] ?? lc1(a);
}

/** Chronic hepatitis for the microscopy: "chronic hepatitis B", "autoimmune hepatitis", "chronic hepatitis". */
function hepatitisWords(v) {
  const a = aetiologyWords(v);
  if (!a) return 'chronic hepatitis';
  if (/hepatitis$/.test(a) && !/^hepatitis/.test(a)) return a; // "autoimmune hepatitis", or typed "drug-induced hepatitis"
  return /^hepatitis /.test(a) ? `chronic ${a}` : `chronic hepatitis (${a})`;
}

/** The synoptic rows under "Additional findings", in the QMH order; [] when none is ticked. */
export function findingItems(v) {
  const st = stageInfo(v);
  const pct = num(v.bgSteatosisPct);
  const out = [];
  for (const f of ORDER) {
    if (!has(v, f)) continue;
    if (f === FINDING.fibrosis) out.push(st ? `Fibrosis (${st.label})` : 'Fibrosis');
    else if (f === FINDING.cirrhosis) out.push(st && st.cirrhotic && !has(v, FINDING.fibrosis) ? `Cirrhosis (${st.label})` : 'Cirrhosis');
    else if (f === FINDING.steatosis) out.push(pct !== null ? `Steatosis (about ${pct}% of the parenchyma)` : 'Steatosis');
    else if (f === FINDING.steatohepatitis) out.push(pct !== null && !has(v, FINDING.steatosis) ? `Steatohepatitis (steatosis about ${pct}% of the parenchyma)` : 'Steatohepatitis');
    else if (f === FINDING.hepatitis) out.push(`Chronic hepatitis${aetiologyWords(v) ? ` (${aetiologyWords(v)})` : ''}`);
    else if (f === FINDING.other) { if (stripDot(v.bgOther)) out.push(stripDot(v.bgOther)); }
    else out.push(f);
  }
  return out;
}

/**
 * The background liver as microscopy sentences, for the biopsy:
 * "The background liver shows chronic hepatitis B and steatohepatitis. There is cirrhosis (Ishak stage 6/6)."
 */
export function backgroundSentences(v) {
  const st = stageInfo(v);
  const pct = num(v.bgSteatosisPct);
  const shows = [];
  if (has(v, FINDING.hepatitis)) shows.push(hepatitisWords(v));
  if (has(v, FINDING.steatohepatitis)) shows.push(pct !== null ? `steatohepatitis, with macrovesicular steatosis involving about ${pct}% of the parenchyma` : 'steatohepatitis');
  else if (has(v, FINDING.steatosis)) shows.push(pct !== null ? `macrovesicular steatosis involving about ${pct}% of the parenchyma` : 'macrovesicular steatosis');
  if (has(v, FINDING.iron)) shows.push('iron overload');
  if (has(v, FINDING.lgdn)) shows.push('a low-grade dysplastic nodule');
  if (has(v, FINDING.hgdn)) shows.push('a high-grade dysplastic nodule');
  if (has(v, FINDING.other) && stripDot(v.bgOther)) shows.push(lc1(stripDot(v.bgOther)));
  const s = [];
  if (shows.length) s.push(`The background liver shows ${listJoin(shows)}.`);
  if (st) s.push(`There is ${st.words} (${st.label}).`);
  else if (has(v, FINDING.cirrhosis)) s.push('There is cirrhosis.');
  else if (has(v, FINDING.fibrosis)) s.push('There is fibrosis.');
  if (!s.length && arr(v.bgFindings).includes(FINDING.none)) s.push('The background liver shows no significant abnormality.');
  return s;
}

/** "CHRONIC HEPATITIS B" / "AUTOIMMUNE HEPATITIS" for the diagnosis. */
function hepatitisDx(v) {
  const a = aetiologyWords(v);
  if (!a) return 'CHRONIC HEPATITIS';
  if (/hepatitis$/.test(a) && !/^hepatitis/.test(a)) return a.toUpperCase();
  return /^hepatitis /.test(a) ? `CHRONIC ${a.replace(/^hepatitis/, 'HEPATITIS')}` : `CHRONIC HEPATITIS (${a})`;
}

/**
 * The background liver for the diagnosis line, '' when nothing is recorded:
 * "CHRONIC HEPATITIS B with CIRRHOSIS (Ishak stage 6/6)", "STEATOHEPATITIS with BRIDGING FIBROSIS (NASH CRN stage 3)",
 * "CIRRHOSIS". Dysplastic nodules are left to nodulesDx().
 */
export function backgroundDx(v) {
  const st = stageInfo(v);
  const heads = [];
  if (has(v, FINDING.hepatitis)) heads.push(hepatitisDx(v));
  if (has(v, FINDING.steatohepatitis)) heads.push('STEATOHEPATITIS');
  else if (has(v, FINDING.steatosis)) heads.push('STEATOSIS');
  if (has(v, FINDING.iron)) heads.push('IRON OVERLOAD');
  if (has(v, FINDING.other) && stripDot(v.bgOther) && !heads.length) heads.push(stripDot(v.bgOther).toUpperCase());
  const head = heads.length ? `${heads.slice(0, -1).join(', ')}${heads.length > 1 ? ' and ' : ''}${heads[heads.length - 1]}` : '';
  let fib = st ? st.dx : '';
  if (!fib && has(v, FINDING.cirrhosis)) fib = 'CIRRHOSIS';
  if (!fib && !st && has(v, FINDING.fibrosis)) fib = 'FIBROSIS';
  const label = st && st.dx ? ` (${st.label})` : '';
  if (head && fib) return `${head}${/ with /.test(head) ? ' and ' : ' with '}${fib}${label}`;
  if (head) return head;
  return fib ? `${fib}${label}` : '';
}

/** "HIGH-GRADE DYSPLASTIC NODULE" (and/or the low-grade one); '' when neither is ticked. */
export function nodulesDx(v) {
  const n = [];
  if (has(v, FINDING.hgdn)) n.push('HIGH-GRADE DYSPLASTIC NODULE');
  if (has(v, FINDING.lgdn)) n.push('LOW-GRADE DYSPLASTIC NODULE');
  return n.join(' and ');
}

/** Checks on the background: [{ level, message, field }]. */
export function backgroundIssues(v) {
  const out = [];
  for (const i of L.stageIssues(v.bgStageSystem, v.bgStage)) out.push({ ...i, field: 'bgStage' });
  const st = stageInfo(v);
  if (has(v, FINDING.fibrosis) && !st && !String(v.bgStage ?? '').trim()) out.push({ level: 'warn', message: 'Fibrosis is ticked: name the scheme and stage (Ishak, METAVIR, NASH CRN or Batts-Ludwig), as the QMH page asks.', field: 'bgStage' });
  if (st && st.cirrhotic && !has(v, FINDING.cirrhosis)) out.push({ level: 'warn', message: `${st.label} is cirrhosis: tick Cirrhosis as well.`, field: 'bgFindings' });
  if (st && !st.cirrhotic && has(v, FINDING.cirrhosis)) out.push({ level: 'warn', message: `Cirrhosis is ticked but ${st.label} is not a cirrhotic stage.`, field: 'bgStage' });
  if (has(v, FINDING.hepatitis) && v.bgAetiology === 'Other (specify)' && !stripDot(v.bgAetiologyOther)) out.push({ level: 'warn', message: 'Chronic hepatitis: specify the aetiology.', field: 'bgAetiologyOther' });
  if (has(v, FINDING.other) && !stripDot(v.bgOther)) out.push({ level: 'warn', message: 'Other background finding ticked: specify it.', field: 'bgOther' });
  if (arr(v.bgFindings).includes(FINDING.none) && findingsOf(v).length) out.push({ level: 'warn', message: '"None identified" is ticked with other background findings.', field: 'bgFindings' });
  const pct = num(v.bgSteatosisPct);
  if (pct !== null && (pct < 0 || pct > 100)) out.push({ level: 'error', message: `Steatosis ${pct}% is not a percentage.`, field: 'bgSteatosisPct' });
  return out;
}
