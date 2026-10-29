// Liver explant: the native liver removed at transplant (benign resection form). Card: docs/roadmap.md "Liver
// explant" in the liver transplant pair (pulled by the user 2026-10-29); spec docs/specs/liver-transplant-pair.md.
//
// The gross follows the RCPath liver dataset G050 and the UCLA total hepatectomy grossing protocol: weight and
// three dimensions, the hilar margins en face before slicing, thrombus by vessel, the gallbladder and hilar nodes,
// thin slices, and every mass or prominent nodule numbered with its segment and size and matched to the imaging.
// The microscopy shares the background-liver fields and wording with the HCC form (generators/liver_background.js)
// and adds the activity, the features of the cause, liver cell change, a histology per nodule, the biliary
// findings, the thrombus, the nodes and the gallbladder, and the necrosis of an acute liver failure explant.
//
// Hepatocellular carcinoma is staged on the HCC synoptic, linked under the same letter ("Add HCC synoptic"):
// prefillPaired() carries the specimen, the tumour nodules and the background over, and the linked synoptic prints
// no gross or block key of its own and takes its background-liver clauses from this form (hostedClauses). The
// engine prints the pair under organPhrase(). Milan, UCSF and the complete-response wording live in the checks
// only; the printed report states what is seen.
//
// Sources (verified 2026-10-29):
//   RCPath G050 liver dataset: https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf
//   UCLA total hepatectomy grossing: https://www.uclahealth.org/sites/default/files/documents/Total%20Hepatectomy%20or%20Transplant%2007.23.20.pdf
//   CAP HCC protocol 4.2.0.0 (five largest nodules, viable size): https://documents.cap.org/protocols/Liver.HCC_4.2.0.0.REL_CAPCP.docx
//   Explant evaluation (5 mm slices, cause features, incidental BilIN): https://pmc.ncbi.nlm.nih.gov/articles/PMC5347400/
//   Dysplastic nodules: https://pmc.ncbi.nlm.nih.gov/articles/PMC5070563/ ; explant nodule sampling: https://pmc.ncbi.nlm.nih.gov/articles/PMC4933863/
//   Milan on explant: https://www.wjgnet.com/2220-3230/full/v16/i2/115879.htm ; UCSF: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4806190/
//   Complete response: https://www.ectrx.org/detail/current/2023/21/10/0/820/0
// Wording is protected by tests/liver_explant.test.js — change it only deliberately.

import { letteredBlockKey, checks, stripDot } from './_house.js';
import * as BG from './liver_background.js';
import { LARGE_VESSEL } from '../src/staging/hcc.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const countWord = (n) => (n >= 0 && n < 10 ? NUMBER_WORDS[n] : String(n));
// Block numbers take the part letter when the case has more than one letter (a linked HCC synoptic shares A).
const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;

export const HCC = 'Hepatocellular carcinoma';
export const TREATED = 'Treated HCC, no viable tumour';
const HGDN = 'High-grade dysplastic nodule';
const LGDN = 'Low-grade dysplastic nodule';
const DEFAULT_NAME = 'Native liver, total hepatectomy';

// ---------- specimen ----------

export function specimenName(part) {
  return stripDot(part.values.specimenName) || DEFAULT_NAME;
}

/**
 * The diagnosis head: "LIVER, native, total hepatectomy" from "Native liver, total hepatectomy", "LIVER, explant"
 * from "Liver, explant" or "Liver explant". The engine also prints a linked HCC synoptic under it.
 */
export function organPhrase(part) {
  const name = specimenName(part);
  const m = /^(native|explanted|recipient)\s+liver\b,?\s*(.*)$/i.exec(name);
  if (m) return ['LIVER', m[1].toLowerCase(), m[2]].filter(Boolean).join(', ');
  const e = /^liver\s+(explant\w*)\s*,?\s*(.*)$/i.exec(name);
  if (e) return ['LIVER', e[1].toLowerCase(), e[2]].filter(Boolean).join(', ');
  const c = name.indexOf(', ');
  return c > 0 ? `${name.slice(0, c).toUpperCase()}${name.slice(c)}` : name.toUpperCase();
}

// ---------- nodules ----------

/** The described nodules, largest first as entered: up to five rows of the form. */
export function nodules(v) {
  const n = Math.min(5, Math.max(0, int(v.noduleCount) ?? 0));
  const rows = [];
  for (let i = 1; i <= n; i += 1) {
    rows.push({
      i, seg: stripDot(v[`n${i}Seg`]), mm: num(v[`n${i}Mm`]), desc: stripDot(v[`n${i}Desc`]), histo: v[`n${i}Histo`] || '',
      nec: num(v[`n${i}Nec`]), viable: num(v[`n${i}Viable`]), other: stripDot(v[`n${i}Other`])
    });
  }
  return rows;
}
const isTumourRow = (r) => r.histo === HCC || r.histo === TREATED;
/** An HCC nodule with viable tumour: a nodule recorded as HCC whose viable size is not 0. */
const isViableRow = (r) => r.histo === HCC && r.viable !== 0 && r.nec !== 100;

/** "Hepatocellular carcinoma", "Other malignancy" or "None": the form's choice, else read off the nodule table. */
export function tumourOf(v) {
  if (v.tumour) return v.tumour;
  return nodules(v).some(isTumourRow) ? HCC : 'None';
}

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8 };
/** "segment 6" from "6", "S6", "VI" or "segment 6"; "segments 5 and 6" from "5/6"; other text as typed. */
export function segWords(s) {
  const t = stripDot(s);
  if (!t) return '';
  const rest = t.replace(/\b(?:segments?|segs?|s)\.?(?=\s*(?:\d|[ivx]+\b))/gi, ' ').replace(/\band\b|[/,&+]/gi, ' ').trim();
  const toks = rest.split(/\s+/).filter(Boolean);
  const segs = toks.map((x) => (/^[1-8][ab]?$/i.test(x) ? x.toLowerCase() : ROMAN[x.toLowerCase()] ? String(ROMAN[x.toLowerCase()]) : null));
  if (!toks.length || segs.some((x) => x === null)) return lc1(t);
  return `${segs.length > 1 ? 'segments' : 'segment'} ${listJoin(segs)}`;
}

// ---------- macro ----------

const dimsText = (s) => stripDot(s).replace(/\s*cm$/i, '').replace(/\s*[x×*]\s*/gi, ' x ');
const VESSEL = { 'Portal vein': 'portal vein', 'Hepatic artery': 'hepatic artery', 'Hepatic veins': 'hepatic veins' };
const NODULARITY = { Micronodular: 'micronodular', Macronodular: 'macronodular', Mixed: 'nodular, with micronodules and macronodules' };
const GROSS_BACKGROUND = {
  Fibrotic: 'The parenchyma is firm and fibrotic.',
  'Bile-stained': 'The parenchyma is bile-stained.',
  Nutmeg: 'The parenchyma has a congested, nutmeg appearance.',
  'Massive necrosis': 'The parenchyma is soft and mottled, with extensive necrosis.',
  Normal: 'The parenchyma is unremarkable.'
};

function noduleGross(r) {
  const where = r.seg ? `, in ${segWords(r.seg)},` : '';
  const bits = [r.mm !== null ? `measures ${fmt(r.mm)} mm` : '', r.desc ? `is ${lc1(r.desc)}` : ''].filter(Boolean);
  if (bits.length) return `Nodule ${r.i}${where} ${bits.join(' and ')}.`;
  return r.seg ? `Nodule ${r.i} is in ${segWords(r.seg)}.` : '';
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const w = num(v.weightG);
  const dims = dimsText(v.dims);
  const measure = listJoin([w !== null ? `weighing ${fmt(w)} g` : '', dims ? `measuring ${dims} cm` : '']);
  const s = [`Received ${v.fixation === 'In formalin' ? 'in formalin' : 'fresh'} is a native liver${measure ? ` ${measure}` : ''}.`];
  const adh = stripDot(v.adherent);
  if (adh) s.push(`The specimen includes adherent ${lc1(adh)}.`);
  if (v.hilum === 'Submitted en face') s.push('The hilar margins (bile duct, portal vein and hepatic artery) are submitted en face.');
  const vessels = arr(v.thrombus).map((x) => VESSEL[x]).filter(Boolean);
  if (vessels.length) s.push(`Thrombus is present in the ${listJoin(vessels)}${stripDot(v.thrombusDetail) ? `, ${lc1(stripDot(v.thrombusDetail))}` : ''}.`);
  if (v.gallbladder === 'Present') s.push(`The gallbladder is attached${stripDot(v.gbDetail) ? ` (${stripDot(v.gbDetail)})` : ''}.`);
  else if (v.gallbladder === 'Absent') s.push('The gallbladder is absent.');
  const nodes = int(v.nodesFound);
  if (nodes === 0) s.push('No hilar lymph node is identified.');
  else if (nodes !== null) s.push(`${uc1(countWord(nodes))} hilar lymph node${nodes === 1 ? ' is' : 's are'} identified.`);
  const slice = num(v.sliceMm);
  if (slice !== null) s.push(`The liver is serially sliced at ${fmt(slice)} mm intervals.`);
  if (v.background === 'Cirrhotic') s.push(`The parenchyma is diffusely ${NODULARITY[v.nodularity] || 'nodular'}.`);
  else if (GROSS_BACKGROUND[v.background]) s.push(GROSS_BACKGROUND[v.background]);
  const rows = nodules(v);
  const more = v.moreNodules ? stripDot(v.otherNodules) : '';
  if (!rows.length && !more) s.push('No mass or prominent nodule is seen.');
  for (const r of rows) { const g = noduleGross(r); if (g) s.push(g); }
  if (more) s.push(/^there\b/i.test(more) ? `${uc1(more)}.` : `There are also ${lc1(more)}.`);
  if (v.imagingMatch === 'All imaging lesions identified') s.push('All lesions described on imaging are identified.');
  else if (v.imagingMatch === 'Not all imaging lesions identified') s.push(`Not all lesions described on imaging are identified${stripDot(v.imagingDetail) ? ` (not found: ${stripDot(v.imagingDetail)})` : ''}.`);
  s.push(String(v.blockKeyText || '').trim() ? 'Representative sections are taken; see block key.' : 'Representative sections are taken.');
  return `(${part.label}) ${s.join(' ')}`;
}

export const blockKey = (part, ctx) => letteredBlockKey(part, ctx, { lettered, strip: stripDot });

// ---------- microscopy ----------

const ACTIVITY = { None: ' with no significant inflammatory activity', Mild: ' with mild interface and lobular activity', Moderate: ' with moderate interface and lobular activity', Marked: ' with marked interface and lobular activity' };
// The words of each cause feature, and whether they take a plural verb.
const CAUSE = {
  'Ground-glass hepatocytes': ['ground-glass hepatocytes', true],
  'Florid duct lesions': ['florid duct lesions', true],
  'Bile duct loss': ['bile duct loss', false],
  'Periductal concentric fibrosis': ['periductal concentric fibrosis', false],
  'Copper-associated protein': ['copper-associated protein', false],
  'PAS-D-positive globules': ['PAS-D-positive globules', true],
  'Mallory-Denk bodies': ['Mallory-Denk bodies', true]
};
const has = (v, s) => arr(v.bgFindings).includes(s);

/** The background liver: fibrosis and activity, steatosis, iron, a typed finding, the cause features, cell change. */
export function liverSentences(v) {
  const s = [];
  const st = BG.stageInfo(v);
  const act = ACTIVITY[v.activity] || '';
  let fib = '';
  if ((st && st.cirrhotic) || (!st && has(v, BG.FINDING.cirrhosis))) fib = `established cirrhosis${st ? ` (${st.label})` : ''}`;
  else if (st) fib = `${st.words} (${st.label})`;
  else if (has(v, BG.FINDING.fibrosis)) fib = 'fibrosis';
  if (fib) s.push(`The liver shows ${fib}${act}.`);
  else if (act) s.push(`The liver shows ${act.replace(/^ with /, '')}.`);
  const pct = num(v.bgSteatosisPct);
  const fat = pct !== null ? ` involving about ${fmt(pct)}% of the parenchyma` : '';
  if (has(v, BG.FINDING.steatohepatitis)) s.push(`There is steatohepatitis${fat ? `, with macrovesicular steatosis${fat}` : ''}.`);
  else if (has(v, BG.FINDING.steatosis)) s.push(`There is macrovesicular steatosis${fat}.`);
  if (has(v, BG.FINDING.iron)) s.push('There is iron overload.');
  // A typed finding heads the diagnosis only when nothing else does (BG.backgroundDx); otherwise it is said here.
  const other = has(v, BG.FINDING.other) ? stripDot(v.bgOther) : '';
  const otherHeads = has(v, BG.FINDING.hepatitis) || has(v, BG.FINDING.steatohepatitis) || has(v, BG.FINDING.steatosis) || has(v, BG.FINDING.iron);
  if (other && otherHeads) s.push(`${uc1(other)} is also present.`);
  const cause = arr(v.causeFeatures).map((x) => CAUSE[x]).filter(Boolean);
  if (cause.length) s.push(`${uc1(listJoin(cause.map(([w]) => w)))} ${cause.length > 1 || cause[0][1] ? 'are' : 'is'} present.`);
  const cell = arr(v.cellChange).filter((x) => / cell change$/.test(x)).map(lc1);
  if (cell.length) s.push(`${uc1(listJoin(cell))} ${cell.length > 1 ? 'are' : 'is'} present.`);
  if (!s.length && arr(v.bgFindings).includes(BG.FINDING.none)) s.push('There is no fibrosis.');
  return s;
}

const article = (w) => (/^(?:a|an|the)\s/i.test(w) ? w : `${/^[aeiou]/i.test(w) ? 'an' : 'a'} ${w}`);

/** "Nodule 2 (segment 6, 12 mm) is a high-grade dysplastic nodule." per described nodule with a histology. */
export function noduleSentences(v) {
  return nodules(v).map((r) => {
    const tag = [r.seg ? segWords(r.seg) : '', r.mm !== null ? `${fmt(r.mm)} mm` : ''].filter(Boolean).join(', ');
    const head = `Nodule ${r.i}${tag ? ` (${tag})` : ''}`;
    if (r.histo === HCC) {
      const nec = r.nec !== null && r.nec > 0 ? ` with about ${fmt(r.nec)}% necrosis` : '';
      const viable = r.viable !== null && r.viable > 0 && (r.mm === null || r.viable < r.mm) ? `; the viable tumour measures ${fmt(r.viable)} mm` : '';
      return `${head} is a hepatocellular carcinoma${nec}${viable}.`;
    }
    if (r.histo === TREATED) return `${head} is completely necrotic, with no viable tumour, consistent with treated hepatocellular carcinoma.`;
    if (r.histo === 'Other') return r.other ? `${head} is ${article(lc1(r.other))}.` : '';
    if (r.histo) return `${head} is ${article(lc1(r.histo))}.`;
    return '';
  }).filter(Boolean);
}

const BILIARY = { 'Low-grade BilIN': 'low-grade biliary intraepithelial neoplasia', 'High-grade BilIN': 'high-grade biliary intraepithelial neoplasia', 'Von Meyenburg complex': 'a von Meyenburg complex', 'Bile duct adenoma': 'a bile duct adenoma' };
const THROMBUS = { Bland: 'bland thrombus', 'Organising bland': 'organising bland thrombus', 'Tumour thrombus': 'tumour thrombus' };

function otherSentences(v) {
  const s = [];
  if (tumourOf(v) === 'Other malignancy' && stripDot(v.tumourOther)) s.push(`There is ${lc1(stripDot(v.tumourOther))}.`);
  const bil = arr(v.incidental).map((x) => BILIARY[x]).filter(Boolean);
  if (bil.length) s.push(`There is ${listJoin(bil)}.`);
  const vessels = arr(v.thrombus).map((x) => VESSEL[x]).filter(Boolean);
  if (vessels.length && THROMBUS[v.thrombusHisto]) {
    const plural = vessels.length > 1 || vessels[0] === 'hepatic veins';
    s.push(`The ${listJoin(vessels)} contain${plural ? '' : 's'} ${THROMBUS[v.thrombusHisto]}.`);
  }
  const n = int(v.nodesFound);
  if (n && n > 0) {
    const nodes = `${countWord(n)} hilar lymph node${n === 1 ? '' : 's'}`;
    if (v.nodesHisto === 'Metastatic tumour') {
      const pos = int(v.nodesPositive);
      s.push(pos !== null ? `Metastatic tumour is present in ${countWord(pos)} of ${nodes}.` : `Metastatic tumour is present in the hilar lymph nodes.`);
    } else if (v.nodesHisto === 'Other (describe)') {
      if (stripDot(v.nodesOther)) s.push(`${uc1(nodes)} show${n === 1 ? 's' : ''} ${lc1(stripDot(v.nodesOther))}.`);
    } else if (v.nodesHisto === 'Reactive changes') s.push(`${uc1(nodes)} show${n === 1 ? 's' : ''} reactive changes.`);
  }
  if (v.gallbladder === 'Present') {
    if (v.gallbladderHisto === 'Chronic cholecystitis') s.push('The gallbladder shows chronic cholecystitis.');
    else if (v.gallbladderHisto === 'No significant abnormality') s.push('The gallbladder shows no significant abnormality.');
    else if (v.gallbladderHisto === 'Other (describe)' && stripDot(v.gbOther)) s.push(`The gallbladder shows ${lc1(stripDot(v.gbOther))}.`);
  }
  return s;
}

const massive = (v) => v.background === 'Massive necrosis';
const NECROSIS_DIST = { Panacinar: 'in a panacinar pattern', Multiacinar: 'in a multiacinar pattern', 'Zone 3': 'mainly in zone 3' };

function necrosisSentences(v) {
  if (!massive(v)) return [];
  const pct = num(v.necrosisPct);
  const where = [pct !== null ? `involving about ${fmt(pct)}% of the parenchyma` : '', NECROSIS_DIST[v.necrosisZone] || ''].filter(Boolean).join(' ');
  const feats = arr(v.necrosisFeatures).map(lc1);
  return [`There is ${v.necrosisPattern === 'Submassive' ? 'submassive' : 'massive'} hepatic necrosis${where ? `, ${where}` : ''}${feats.length ? `, with ${listJoin(feats)}` : ''}.`];
}

const dysplastic = (v) => nodules(v).some((r) => r.histo === HGDN || r.histo === LGDN) || arr(v.cellChange).length > 0
  || arr(v.incidental).some((x) => /BilIN/.test(x));
const malignant = (v) => tumourOf(v) !== 'None' || nodules(v).some(isTumourRow)
  || (v.thrombusHisto === 'Tumour thrombus' && arr(v.thrombus).length > 0)
  || (v.nodesHisto === 'Metastatic tumour' && (int(v.nodesFound) ?? 0) > 0);

export function microscopy(part) {
  const v = part.values;
  const s = [...necrosisSentences(v), ...liverSentences(v), ...noduleSentences(v), ...otherSentences(v)];
  // Open point 5 of the spec: the explant's negative statement closes the microscopy and is not on the line.
  if (!malignant(v)) s.push(dysplastic(v) ? 'There is no malignancy.' : 'There is no dysplasia or malignancy.');
  const notes = stripDot(v.additionalNotes);
  if (notes) s.push(`${notes}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const countClause = (n, one) => (n > 1 ? `${one}S (${countWord(n)})` : one);

/** The liver disease: the background-liver clause, or the necrosis of an acute liver failure explant first. */
function liverClauses(v) {
  const out = [];
  if (massive(v)) out.push(`${v.necrosisPattern === 'Submassive' ? 'SUBMASSIVE' : 'MASSIVE'} HEPATIC NECROSIS`);
  const bg = BG.backgroundDx(v);
  if (bg) out.push(bg);
  return out;
}

/** "HIGH-GRADE DYSPLASTIC NODULES (two)" and the low-grade one, from the nodule table. */
function noduleClauses(v, inBackground) {
  const rows = nodules(v);
  const tail = inBackground ? ' in the background liver' : '';
  return [[HGDN, 'HIGH-GRADE DYSPLASTIC NODULE'], [LGDN, 'LOW-GRADE DYSPLASTIC NODULE']]
    .map(([h, words]) => { const n = rows.filter((r) => r.histo === h).length; return n ? `${countClause(n, words)}${tail}` : ''; })
    .filter(Boolean);
}

function biliaryClauses(v) {
  return arr(v.incidental).filter((x) => /BilIN/.test(x)).map((x) => `${/^High/.test(x) ? 'HIGH' : 'LOW'}-GRADE BILIARY INTRAEPITHELIAL NEOPLASIA`);
}

/** The malignancy clause of an explant without a linked synoptic. */
function tumourClauses(v) {
  const t = tumourOf(v);
  if (t === 'Other malignancy') {
    // The entity in capitals, any typed size or site after the first comma as typed.
    const o = stripDot(v.tumourOther);
    const c = o.indexOf(',');
    return [!o ? 'MALIGNANCY' : c > 0 ? `${o.slice(0, c).toUpperCase()}${o.slice(c)}` : o.toUpperCase()];
  }
  if (t !== HCC) return [];
  const tum = nodules(v).filter(isTumourRow);
  if (tum.length && !tum.some(isViableRow)) return ['COMPLETELY NECROTIC NODULE, consistent with treated HEPATOCELLULAR CARCINOMA, no viable tumour'];
  return ['HEPATOCELLULAR CARCINOMA'];
}

/**
 * The explant's clauses under a linked HCC synoptic (generators/hcc.js prints them after its own): the liver
 * disease, the dysplastic nodules, biliary intraepithelial neoplasia and any other malignancy. Bland thrombus,
 * nodes, the gallbladder and benign biliary lesions stay in the microscopy.
 */
export function hostedClauses(explant) {
  const v = explant.values;
  const other = tumourOf(v) === 'Other malignancy' ? tumourClauses(v) : [];
  return [...liverClauses(v), ...noduleClauses(v, true), ...biliaryClauses(v), ...other];
}

export function diagnosis(part) {
  const v = part.values;
  const clauses = [...tumourClauses(v), ...liverClauses(v), ...noduleClauses(v, false), ...biliaryClauses(v)];
  return `(${part.label}) ${organPhrase(part)} - ${clauses.length ? clauses.join('; ') : 'NO SIGNIFICANT HISTOLOGICAL ABNORMALITY'}`;
}

// ---------- the linked HCC synoptic ----------

/** Templates a part of this form can link under its letter ("Add HCC synoptic"). */
export const PAIR_TARGETS = ['hcc'];
export const PAIR_BUTTON = { text: 'Add HCC synoptic', title: 'Add the HCC synoptic under the same letter, pre-filled from the explant' };

/** 'hcc' when the explant holds hepatocellular carcinoma, else ''. */
export function pairedTemplate(part) {
  return tumourOf(part.values) === HCC ? 'hcc' : '';
}

const BG_FIELDS = ['bgFindings', 'bgStageSystem', 'bgStage', 'bgAetiology', 'bgAetiologyOther', 'bgSteatosisPct', 'bgOther'];
export { BG_FIELDS };

/** "220 x 150 x 100" (mm) from "22 x 15 x 10" (cm); '' when the dimensions do not parse. */
const dimsMm = (s) => {
  const parts = dimsText(s).split(' x ').map(num);
  return parts.length && parts.every((x) => x !== null) ? parts.map((x) => fmt(x * 10)).join(' x ') : '';
};

/**
 * Values the linked HCC synoptic opens with: a total hepatectomy, the explant's name, weight and dimensions, and
 * the staged tumour: the nodules with viable tumour (all tumour nodules when none has), their segments, count and
 * sizes (the viable size where recorded, as the spec stages on viable tumour only), the treatment effect when a
 * nodule is recorded as treated, the necrosis of a single viable nodule, the hilar nodes and the background liver.
 */
export function prefillPaired(v) {
  const rows = nodules(v);
  const tum = rows.filter(isTumourRow);
  const viable = tum.filter(isViableRow);
  const out = { procedure: 'Total hepatectomy', specimenName: specimenName({ values: v }) };
  if (num(v.weightG) !== null) out.specimenWeight = v.weightG;
  if (dimsMm(v.dims)) out.specimenDims = dimsMm(v.dims);
  const staged = viable.length ? viable : tum;
  const segs = [...new Set(staged.flatMap((r) => (segWords(r.seg).match(/\b[1-8]\b/g) || [])))].sort();
  if (segs.length) out.segments = segs.map((x) => `Segment ${x}`);
  const sizes = viable.map((r) => (r.viable !== null ? r.viable : r.mm)).filter((x) => x !== null).sort((a, b) => b - a);
  if (viable.length) out.tumourCount = viable.length;
  if (sizes.length) { out.tumourSizeCm = fmt(sizes[0] / 10); out.otherSizesCm = sizes.slice(1).map((x) => fmt(x / 10)).join(', '); }
  const necrotic = tum.some((r) => r.histo === TREATED || (r.nec !== null && r.nec > 0));
  if (necrotic) out.treatmentEffect = viable.length ? 'Incomplete necrosis (viable tumour present)' : 'Complete necrosis (no viable tumour)';
  if (necrotic && viable.length === 1 && viable[0].nec !== null) out.necrosisPct = fmt(viable[0].nec);
  const nodes = int(v.nodesFound);
  if (nodes !== null) {
    out.nodesExamined = nodes;
    if (nodes > 0 && v.nodesHisto === 'Reactive changes') out.nodesInvolved = 0;
    else if (nodes > 0 && v.nodesHisto === 'Metastatic tumour' && int(v.nodesPositive) !== null) out.nodesInvolved = int(v.nodesPositive);
  }
  if (v.thrombusHisto === 'Tumour thrombus' && arr(v.thrombus).length) out.vascularInvasion = 'Present, large vessel invasion (major branch of hepatic vein or portal vein)';
  for (const k of BG_FIELDS) if (v[k] !== undefined) out[k] = Array.isArray(v[k]) ? [...v[k]] : v[k];
  const nod = [[HGDN, 'High-grade dysplastic nodule'], [LGDN, 'Low-grade dysplastic nodule']].filter(([h]) => rows.some((r) => r.histo === h)).map(([, o]) => o);
  if (nod.length) out.bgFindings = [...arr(out.bgFindings).filter((x) => x !== BG.FINDING.none), ...nod];
  return out;
}

// ---------- checks (never printed) ----------

/** Milan and UCSF on a list of tumour sizes (mm); vascular invasion true, false or null (not yet recorded). */
function criteria(sizes, vi) {
  const n = sizes.length;
  const big = n ? Math.max(...sizes) : 0;
  const total = sizes.reduce((a, b) => a + b, 0);
  const milanSize = (n === 1 && big <= 50) || (n >= 2 && n <= 3 && big <= 30);
  const ucsf = (n === 1 && big <= 65) || (n >= 2 && n <= 3 && big <= 45 && total <= 80);
  return { n, big, milan: milanSize && vi !== true, milanSize, ucsf };
}

export function validate(part, ctx) {
  const v = part.values;
  const { out, at, err, warn } = checks();
  const info = (m, f) => at('info', m, f);
  if (num(v.weightG) === null) warn('Weight: record the explant weight.', 'weightG');
  if (!stripDot(v.dims)) warn('Dimensions: give three dimensions.', 'dims');
  if (v.hilum === 'Not submitted') info('Hilar margins not submitted: the UCLA protocol takes the bile duct and vascular margins en face before slicing.', 'hilum');
  const slice = num(v.sliceMm);
  if (slice !== null && slice > 10) warn(`Slices of ${fmt(slice)} mm: RCPath G050 asks for no more than 10 mm, and 5 mm is advised.`, 'sliceMm');
  const rows = nodules(v);
  const key = String(v.blockKeyText || '');
  if (rows.length && key.trim() && !/background|non-?tumou?r|uninvolved/i.test(key)) warn('Block key: no background liver block is named; take at least one as far from any tumour as possible (RCPath G050).', 'blockKeyText');
  if (v.moreNodules && !stripDot(v.otherNodules)) warn('More than five nodules: give the number, size range and site of the rest.', 'otherNodules');
  if (v.imagingMatch === 'Not all imaging lesions identified' && !stripDot(v.imagingDetail)) warn('Not all imaging lesions identified: say which were not found.', 'imagingDetail');
  for (const r of rows) {
    if (r.mm === null) warn(`Nodule ${r.i}: record the size.`, `n${r.i}Mm`);
    if (!r.histo) warn(`Nodule ${r.i}: choose the histology.`, `n${r.i}Histo`);
    if (r.histo === 'Other' && !r.other) warn(`Nodule ${r.i}: specify the histology.`, `n${r.i}Other`);
    if (r.histo === HCC && r.viable !== null && r.mm !== null && r.viable > r.mm) err(`Nodule ${r.i}: the viable tumour is larger than the nodule.`, `n${r.i}Viable`);
    if (r.histo === HCC && (r.nec === 100 || r.viable === 0)) info(`Nodule ${r.i}: no viable tumour, so choose "${TREATED}".`, `n${r.i}Histo`);
    if (r.nec !== null && (r.nec < 0 || r.nec > 100)) err(`Nodule ${r.i}: necrosis ${r.nec}% is not a percentage.`, `n${r.i}Nec`);
  }
  if (!arr(v.bgFindings).length) warn('Background liver: tick the findings, or "None identified".', 'bgFindings');
  for (const i of BG.backgroundIssues(v)) at(i.level, i.message, i.field);
  if (v.background === 'Cirrhotic' && !has(v, BG.FINDING.cirrhosis) && !BG.stageInfo(v)?.cirrhotic) info('The gross is cirrhotic but Cirrhosis is not ticked.', 'bgFindings');
  if (massive(v)) {
    if (num(v.necrosisPct) === null) warn('Massive necrosis: record the percentage of parenchyma involved.', 'necrosisPct');
    if (has(v, BG.FINDING.cirrhosis)) info('Massive necrosis and Cirrhosis are both ticked: check the background liver.', 'bgFindings');
  }
  const t = tumourOf(v);
  if (v.tumour === 'None' && rows.some(isTumourRow)) warn('A nodule is recorded as hepatocellular carcinoma but Malignancy is "None".', 'tumour');
  if (t === 'Other malignancy' && !stripDot(v.tumourOther)) warn('Other malignancy: name it.', 'tumourOther');
  if (v.nodesHisto === 'Metastatic tumour' && (int(v.nodesFound) ?? 0) > 0) {
    const pos = int(v.nodesPositive);
    if (pos === null) warn('Metastatic tumour in the nodes: record how many are involved.', 'nodesPositive');
    else if (pos > int(v.nodesFound)) err('Involved nodes exceed the number found.', 'nodesPositive');
  }
  const linked = (ctx?.case?.parts || []).find((p) => p !== part && p.linked && p.label === part.label && p.templateId === 'hcc');
  if (t === HCC && !linked) warn('Hepatocellular carcinoma: "Add HCC synoptic" adds the HCC synoptic under the same letter, pre-filled from this form.', 'tumour');
  const thrombusTumour = v.thrombusHisto === 'Tumour thrombus' && arr(v.thrombus).length > 0;
  if (linked && thrombusTumour && !LARGE_VESSEL.test(linked.values?.vascularInvasion || '')) warn('Tumour thrombus in a hilar vessel: the HCC synoptic\'s vascular invasion should be large vessel invasion.', 'thrombusHisto');
  // Transplant criteria on the explant: counted on viable tumour and on all tumour nodules, because no source read
  // says whether a completely necrotic nodule counts (spec, "Necrotic nodules").
  const tum = rows.filter(isTumourRow);
  if (t === HCC && tum.length && !v.moreNodules) {
    const viRaw = linked ? linked.values?.vascularInvasion || 'Not identified' : '';
    const vi = thrombusTumour || /^Present/.test(viRaw) ? true : linked && /^Not identified/.test(viRaw) ? false : null;
    const viable = tum.filter(isViableRow).map((r) => (r.viable !== null ? r.viable : r.mm));
    const all = tum.map((r) => r.mm);
    const say = (c) => `${c.milan ? 'within' : 'outside'} Milan, ${c.ucsf ? 'within' : 'outside'} UCSF (${countWord(c.n)} nodule${c.n === 1 ? '' : 's'}, largest ${fmt(c.big)} mm)`;
    const parts = [];
    if (viable.length && viable.every((x) => x !== null)) parts.push(`counting viable tumour, ${say(criteria(viable, vi))}`);
    if (all.every((x) => x !== null)) parts.push(`counting all nodules, ${say(criteria(all, vi))}`);
    if (parts.length) info(`Transplant criteria on the explant: ${parts.join('; ')}. Vascular invasion: ${vi === true ? 'present' : vi === false ? 'not identified' : 'not yet recorded on the synoptic'}.`, 'noduleCount');
    if (!viable.length) info('No viable tumour in any nodule: a complete response, as Exp Clin Transplant 2023 uses the term.', 'noduleCount');
  }
  return out;
}

// The registry loads this default export; a generator without one is not wired in.
export default { specimenName, organPhrase, macro, blockKey, microscopy, diagnosis, validate, hostedClauses, pairedTemplate, prefillPaired, PAIR_TARGETS, PAIR_BUTTON };
