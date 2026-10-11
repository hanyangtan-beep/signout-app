// Hepatocellular carcinoma resection generator (synoptic). Card: docs/roadmap.md "HCC — resection synoptic"
// (pulled by the user 2026-10-02), the pair of the mass-lesion liver biopsy (generators/liver_lesion_biopsy.js).
// Elements mirror the QMH Cancer Reporting Template GI-HCC page (CAP Hepatocellular 4.3.0.0, AJCC 8th edition;
// text in docs/reference/qmh/hcc.txt) in the QMH order, with the house departures of the other synoptic
// templates: a "Specimen and tumour" section first (procedure, segments, number and size of the tumours — the
// page has no gross elements, and pT needs them), and the "- Tumour histology:" paragraph after
// "- Histologic grade:". Further departures: the WHO 5th edition subtypes follow the QMH types in the list
// (steatohepatitic, macrotrabecular-massive, chromophobe, neutrophil-rich, lymphocyte-rich), and the QMH
// "Liver (specify)" distant-metastasis box is dropped because intrahepatic spread is multiplicity, not M1.
// pTNM is derived by src/staging/hcc.js and printed only with `options.printPTNM`; a typed override wins.
//
// House diagnosis, measured on the five-year file (22 HCC resections): the grade first in sentence case
// ("Moderately differentiated HEPATOCELLULAR CARCINOMA"), then dash lines "- Stage pT1b (pTNM, AJCC 8th
// edition)", "- Margin clear" and the background liver "- CHRONIC HEPATITIS B with CIRRHOSIS"; no size, pN or
// margin distance on the line. The background wording is shared with the biopsy (generators/liver_background.js).
// Morphology sentences are grounded in docs/reference/hcc-morphology.md; printed text is released-report prose.
// Pure functions: (part, ctx) -> string. Wording is protected by tests/hcc.test.js — change it only deliberately.

import { deriveTNM, stageLine, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/hcc.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { letteredBlockKey, checks } from './_house.js';
import * as BG from './liver_background.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const stripDot = (s) => String(s || '').trim().replace(/[.;:\s]+$/, '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const chosen = (list) => arr(list).filter((s) => !/^Not (identified|applicable|specified)|^Cannot|^None /.test(s));
const specify = (s) => String(s || '').replace(/\s*\((specify)[^)]*\)\s*:?$/i, '').trim();
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const countWord = (n) => (n >= 0 && n < 10 ? NUMBER_WORDS[n] : String(n));

export const EXTENSION = S.EXTENSION;
export const UNINVOLVED = 'Uninvolved by invasive carcinoma (specify distance)';
const isPT0 = (v) => arr(v.tumourExtension).includes(EXTENSION.none);
const isComplete = (v) => S.COMPLETE_NECROSIS.test(v.treatmentEffect || '');
const FIBROLAMELLAR = 'Hepatocellular carcinoma, fibrolamellar';

// ---------- specimen ----------

export function procedureText(v) {
  if (v.procedure === 'Other') return stripDot(v.procedureOther) || 'Other';
  return v.procedure || 'Not specified';
}

/** Head phrase: "partial hepatectomy", "wedge resection", or the typed procedure. */
export function procedurePhrase(v) {
  const p = procedureText(v);
  if (p === 'Not specified') return 'resection';
  if (/^Partial hepatectomy/.test(p)) return 'partial hepatectomy';
  if (p === 'Other') return 'resection';
  return lc1(p);
}

/** "segment 6", "segments 5 and 6"; '' when not specified. */
export function segmentsText(v) {
  const n = arr(v.segments).filter((s) => /^Segment \d$/.test(s)).map((s) => s.replace('Segment ', ''));
  if (!n.length) return '';
  return n.length === 1 ? `segment ${n[0]}` : `segments ${listJoin(n)}`;
}

/**
 * The specimen-line procedure word. The house writes "resection" for a partial hepatectomy ("Liver, segment 6,
 * resection"; no HCC resection line in the 2021-2026 biopsy file says "partial hepatectomy"); a named operation
 * ("right hepatectomy", "left lateral sectionectomy") arrives as the received name from the intake fill.
 */
export function linePhrase(v) {
  const p = procedurePhrase(v);
  return p === 'partial hepatectomy' ? 'resection' : p;
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return typed;
  const seg = segmentsText(v);
  return `Liver${seg ? `, ${seg}` : ''}, ${linePhrase(v)}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

// ---------- staging ----------

export function staging(part) { return deriveTNM(part.values, 'hcc'); }

// ---------- macro ----------

const otherSizes = (v) => String(v.otherSizesCm || '').split(/[,;\s]+(?:and\s+)?/).map(num).filter((n) => n !== null);

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const proc = procedurePhrase(v);
  const article = /^[aeiou]/.test(proc) ? 'an' : 'a';
  const seg = segmentsText(v);
  let s = `(${part.label}) Received in formalin is ${article} ${proc} specimen${seg ? ` (${seg})` : ''}`;
  const dims = stripDot(v.specimenDims);
  const wt = num(v.specimenWeight);
  if (dims) s += ` measuring ${dims} mm`;
  if (wt !== null) s += `${dims ? ' and' : ''} weighing ${fmt(wt)} g`;
  s += '.';
  const n = int(v.tumourCount) ?? 1;
  const size = num(v.tumourSizeCm);
  const tdims = stripDot(v.tumourDims);
  const measure = tdims ? `measuring ${tdims} mm` : size !== null ? `measuring ${fmt(size)} cm in greatest dimension` : '';
  if (n > 1) {
    s += ` There are ${countWord(n)} tumours${measure ? `, the largest ${measure}` : ''}`;
    const others = otherSizes(v);
    if (others.length) s += `; the others measure ${listJoin(others.map(fmt))} cm`;
    s += '.';
  } else {
    s += ` There is a single tumour${measure ? ` ${measure}` : ''}.`;
  }
  const gd = stripDot(v.grossDetails);
  if (gd) s += ` ${uc1(gd)}.`;
  s += ' Representative sections are taken; see block key.';
  return s;
}

// ---------- block key ----------

const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;

export const blockKey = (part, ctx) => letteredBlockKey(part, ctx, { lettered, strip: stripDot });

// ---------- values shared by synoptic and diagnosis ----------

export const histTypeName = (v) => (v.histType === 'Other histologic type not listed (specify)'
  ? stripDot(v.histTypeOther) || 'Histologic type not specified'
  : v.histType || 'Histologic type not specified');

/** "Moderately differentiated" from "G2: Moderately differentiated"; '' for GX, not applicable or fibrolamellar. */
export function gradeWords(v) {
  if (v.histType === FIBROLAMELLAR) return '';
  if (v.grade === 'Other (specify)') return stripDot(v.gradeOther);
  if (!v.grade || /^(GX|Not applicable)/.test(v.grade)) return '';
  return v.grade.replace(/^G\d: /, '');
}

/** The subtype from "Hepatocellular carcinoma, steatohepatitic" -> "steatohepatitic"; '' for conventional HCC. */
export function subtypeOf(v) {
  const m = /^Hepatocellular carcinoma, (.+)$/.exec(v.histType || '');
  if (!m || v.histType === FIBROLAMELLAR) return '';
  return m[1].replace(/ type$/, '');
}

/** "invading a major branch of the portal vein" etc. for the histology paragraph; '' when confined. */
export function extensionPhrase(v) {
  const t = arr(v.tumourExtension);
  const bits = [];
  if (t.includes(EXTENSION.portal)) bits.push('a major branch of the portal vein');
  if (t.includes(EXTENSION.hepaticVein)) bits.push('the hepatic vein');
  if (t.includes(EXTENSION.gallbladder)) bits.push('the gallbladder');
  if (t.includes(EXTENSION.diaphragm)) bits.push('the diaphragm');
  if (t.includes(EXTENSION.other)) bits.push(stripDot(v.extensionDetail) ? `the ${lc1(stripDot(v.extensionDetail))}` : 'other adjacent organs');
  const out = [];
  if (bits.length) out.push(`invading ${listJoin(bits)}`);
  if (t.includes(EXTENSION.peritoneum)) out.push('perforating the visceral peritoneum');
  return listJoin(out);
}

// Morphology sentences by grade and subtype (WHO 5th edition, digestive system tumours, 2019; grounding in
// docs/reference/hcc-morphology.md). What is seen only: no thresholds or criteria in the printed text.
export const GRADE_MORPHOLOGY = {
  'G1: Well differentiated': 'The tumour cells closely resemble hepatocytes, with mild nuclear atypia, and grow in thin trabeculae.',
  'G2: Moderately differentiated': 'The tumour cells are hepatocyte-like, with moderate nuclear atypia, and grow in thickened trabeculae and pseudoglandular structures.',
  'G3: Poorly differentiated': 'The tumour cells show marked nuclear pleomorphism and grow in solid sheets, with only focal hepatocellular differentiation.',
  'G4: Undifferentiated': 'The tumour cells are undifferentiated and grow in solid sheets.'
};
export const SUBTYPE_MORPHOLOGY = {
  steatohepatitic: 'The tumour shows steatosis, ballooned tumour cells with Mallory-Denk bodies, inflammation and pericellular fibrosis.',
  'clear cell': 'Most tumour cells have abundant clear cytoplasm.',
  'macrotrabecular-massive': 'The tumour grows predominantly in thick macrotrabeculae.',
  scirrhous: 'Tumour cell nests are separated by dense intratumoural fibrosis.',
  chromophobe: 'The tumour cells have pale chromophobic cytoplasm and mostly bland nuclei, with scattered clusters of anaplastic nuclei.',
  'neutrophil-rich': 'Numerous neutrophils infiltrate the tumour.',
  'lymphocyte-rich': 'A dense lymphocytic infiltrate is present throughout the tumour.'
};
export const FIBROLAMELLAR_MORPHOLOGY = 'The tumour is composed of large polygonal cells with abundant granular eosinophilic cytoplasm and prominent nucleoli, separated by parallel lamellae of collagen.';

/** Derived "- Tumour histology:" paragraph; the typed notes win when entered. */
export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return stripDot(v.histologyNotes) + '.';
  if (isPT0(v) || isComplete(v)) return 'The tumour is completely necrotic, with no viable tumour cells.';
  const g = gradeWords(v);
  const sub = subtypeOf(v);
  const type = v.histType === FIBROLAMELLAR ? 'fibrolamellar carcinoma' : lc1(histTypeName(v)).replace(/^hepatocellular carcinoma, .+$/, 'hepatocellular carcinoma');
  let s = `The tumour is ${/^[aeiou]/i.test(g || type) ? 'an' : 'a'} ${[lc1(g), type].filter(Boolean).join(' ')}${sub ? ` of ${sub} subtype` : ''}`;
  const ext = extensionPhrase(v);
  if (ext) s += `, ${ext}`;
  s += '.';
  const morph = v.histType === FIBROLAMELLAR ? FIBROLAMELLAR_MORPHOLOGY : [GRADE_MORPHOLOGY[v.grade], SUBTYPE_MORPHOLOGY[sub]].filter(Boolean).join(' ');
  if (morph) s += ` ${morph}`;
  return s;
}

function treatmentText(v) {
  const te = v.treatmentEffect || 'No known presurgical therapy';
  if (/^No known/.test(te)) return te;
  const p = num(v.necrosisPct);
  const base = /^Incomplete necrosis/.test(te) && p !== null ? `${te}, tumour necrosis ${fmt(p)}%` : te;
  return stripDot(v.treatment) ? `${base}, after ${stripDot(v.treatment)}` : base;
}

/** Value minus the placeholder parentheses, with any typed distance appended. */
export function resMarginText(vv, mmVal) {
  const s = (vv || '').trim();
  if (!s || /^Not applicable/.test(s)) return '';
  const mm = num(mmVal);
  if (/specify distance/.test(s)) {
    const base = s.replace(/\s*\((specify[^)]*)\)\s*/, '');
    return mm !== null ? `${base}, ${fmt(mm)} mm` : base;
  }
  return s;
}

export function sizeValue(v) {
  const size = num(v.tumourSizeCm);
  if (size === null) return isPT0(v) ? 'Not applicable' : 'Not recorded';
  const others = otherSizes(v);
  return `${fmt(size)} cm (largest tumour, greatest dimension)${others.length ? `; other tumours ${listJoin(others.map(fmt))} cm` : ''}`;
}

export function focalityValue(v) {
  const n = int(v.tumourCount);
  if (n === null) return 'Not recorded';
  return n === 1 ? 'Solitary' : `Multiple (${n} tumours)`;
}

// ---------- synoptic ----------

export function nodesItem(v) {
  const ex = int(v.nodesExamined);
  if (ex === null || ex === 0) return { label: 'Regional lymph nodes', value: ex === 0 ? 'None submitted (0 examined)' : 'Not recorded' };
  const inv = int(v.nodesInvolved);
  const sub = [
    { label: 'Number examined', value: String(ex) },
    { label: 'Number involved', value: inv === null ? 'Not recorded' : String(inv) }
  ];
  if (inv && inv > 0) {
    sub.push({ label: 'Extranodal extension', value: !v.ene || /^Not applicable/.test(v.ene) ? 'Not identified' : v.ene });
    const dep = num(v.largestDepositMm);
    if (dep !== null) sub.push({ label: 'Size of largest metastatic deposit', value: `${fmt(dep)} mm${stripDot(v.largestNodeSite) ? `, ${stripDot(v.largestNodeSite)}` : ''}` });
    const node = num(v.largestNodeMm);
    if (node !== null) sub.push({ label: 'Size of largest lymph node involved', value: `${fmt(node)} mm` });
  }
  return { label: 'Regional lymph nodes', value: inv === null ? `${ex} examined; involved not recorded` : `${ex} examined; ${inv} involved`, sub };
}

export function metastasisValue(v) {
  const kept = chosen(v.distantMets);
  const d = stripDot(v.distantDetail);
  if (!kept.length) {
    if (arr(v.distantMets).some((s) => /^Cannot/.test(s))) return `Cannot be determined${d ? ` (${d})` : ''}`;
    return arr(v.distantMets).includes('Not identified') ? 'Not identified' : 'Not applicable';
  }
  return `${listJoin(kept.map((s) => specify(s)))}${d ? ` (${d})` : ''}`;
}

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part);
  const ext = arr(v.tumourExtension);
  const extVal = ext.length
    ? listJoin(ext.map((s) => (s === EXTENSION.other && stripDot(v.extensionDetail) ? `Tumour directly invades other adjacent organs: ${stripDot(v.extensionDetail)}` : s)))
    : 'Not recorded';
  const vi = v.vascularInvasion || 'Not identified';
  const viVal = /^Present/.test(vi) && stripDot(v.vascularDetail) ? `${vi} (${stripDot(v.vascularDetail)})` : vi;
  const other = v.otherMargin && !/^Not applicable/.test(v.otherMargin)
    ? `${resMarginText(v.otherMargin, v.otherMarginMm)}${stripDot(v.otherMarginDetail) ? ` (${stripDot(v.otherMarginDetail)})` : ''}` : '';
  const findings = BG.findingItems(v);
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureText(v)),
      item('Tumour site', segmentsText(v) ? uc1(segmentsText(v)) : 'Not specified'),
      item('Tumour focality', focalityValue(v)),
      item('Tumour size', sizeValue(v))
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      v.grade && v.grade !== 'Not applicable' ? item('Histologic grade', v.grade === 'Other (specify)' ? stripDot(v.gradeOther) || 'Other' : v.grade) : null,
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Tumour extension', extVal),
      item('Satellitosis', v.satellitosis || 'Not identified'),
      item('Vascular invasion', viVal),
      item('Perineural invasion', v.pni || 'Not identified'),
      item('Treatment effect', treatmentText(v))
    ] },
    { heading: 'Margins', items: [
      item('Parenchymal margin', resMarginText(v.parenchymalMargin, v.parenchymalMarginMm) || 'Not recorded'),
      other ? item('Other margin(s)', other) : null
    ] },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: [nodesItem(v)] } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm,
        sub: stageLine(st) ? [{ label: stageLine(st).split(': ')[0], value: stageLine(st).split(': ').slice(1).join(': ') }] : [] }
    ] } : null,
    { heading: 'Additional findings', items: [
      ...findings.map((t) => ({ text: t })),
      stripDot(v.additionalNotes) ? item('Additional notes', stripDot(v.additionalNotes)) : null,
      !findings.length && !stripDot(v.additionalNotes) ? { text: 'None identified' } : null
    ] }
  ].filter(Boolean);
  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- diagnosis ----------

const upperHead = (spec) => { const c = spec.indexOf(', '); return c > 0 ? `${spec.slice(0, c).toUpperCase()}${spec.slice(c)}` : spec.toUpperCase(); };

/** The tumour clause: "Moderately differentiated HEPATOCELLULAR CARCINOMA, steatohepatitic subtype". */
export function tumourDx(v) {
  if (isPT0(v) || isComplete(v)) return `COMPLETELY NECROTIC NODULE${stripDot(v.treatment) ? ` after ${stripDot(v.treatment)}` : ''}, consistent with treated HEPATOCELLULAR CARCINOMA; no viable tumour`;
  if (v.histType === FIBROLAMELLAR) return 'FIBROLAMELLAR CARCINOMA';
  if (v.histType === 'Carcinoma, type cannot be determined') return 'CARCINOMA, type cannot be determined';
  const name = v.histType === 'Other histologic type not listed (specify)' ? (stripDot(v.histTypeOther) || 'carcinoma').toUpperCase() : 'HEPATOCELLULAR CARCINOMA';
  const g = gradeWords(v);
  const sub = subtypeOf(v);
  let s = g ? `${uc1(lc1(g))} ${name}` : name;
  if (sub) s += `, ${sub} subtype`;
  const n = int(v.tumourCount);
  if (n && n > 1) s += `, multifocal (${countWord(n)} tumours)`;
  return s;
}

/** "Margin clear", "Margins clear", "Parenchymal margin involved", "Margin cannot be assessed"; '' when not recorded. */
export function marginDx(v) {
  const named = [
    { name: 'parenchymal', value: v.parenchymalMargin || '' },
    { name: stripDot(v.otherMarginDetail) || 'other', value: v.otherMargin && !/^Not applicable/.test(v.otherMargin) ? v.otherMargin : '' }
  ].filter((m) => m.value);
  if (!named.length) return '';
  const involved = named.filter((m) => /^Involved/.test(m.value));
  if (involved.length) return named.length === 1 ? 'Margin involved' : `${uc1(listJoin(involved.map((m) => m.name.replace(/ margin$/, ''))))} margin${involved.length > 1 ? 's' : ''} involved`;
  const clear = named.filter((m) => /^Uninvolved/.test(m.value));
  if (clear.length === named.length) return named.length > 1 ? 'Margins clear' : 'Margin clear';
  if (clear.length) return `${uc1(listJoin(clear.map((m) => m.name.replace(/ margin$/, ''))))} margin clear; ${listJoin(named.filter((m) => !/^Uninvolved/.test(m.value)).map((m) => m.name.replace(/ margin$/, '')))} margin cannot be assessed`;
  return named.length > 1 ? 'Margins cannot be assessed' : 'Margin cannot be assessed';
}

/** "Stage pT1b (pTNM, AJCC 8th edition)", with pN only when nodes were examined and pM only when M1. */
export function stageDx(st) {
  const pre = st.tnm.split(' ');
  const keep = pre.filter((x) => !/N[X]$/.test(x));
  return `Stage ${keep.join(' ')} (pTNM, ${st.edition})`;
}

/** "0 of 2 regional lymph nodes involved"; '' when none submitted. */
export function nodesPhrase(v) {
  const ex = int(v.nodesExamined);
  if (ex === null || ex === 0) return '';
  const inv = int(v.nodesInvolved) ?? 0;
  return `${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`;
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `(${part.label}) ${upperHead(specimenName(part))}`;
  const clauses = [tumourDx(v)];
  if (/^Incomplete necrosis/.test(v.treatmentEffect || '')) {
    const p = num(v.necrosisPct);
    clauses.push(`Treatment effect: incomplete necrosis${p !== null ? ` (${fmt(p)}%)` : ''}${stripDot(v.treatment) ? ` after ${stripDot(v.treatment)}` : ''}`);
  }
  if (ctx?.options?.printPTNM) clauses.push(stageDx(staging(part)));
  const m = marginDx(v);
  if (m) clauses.push(m);
  const np = nodesPhrase(v);
  if (np) clauses.push(np + (v.ene === 'Present' ? '; extranodal extension present' : ''));
  const mets = chosen(v.distantMets).map((s) => lc1(specify(s)));
  if (mets.length) clauses.push(`Distant metastasis: ${listJoin(mets)}${stripDot(v.distantDetail) ? ` (${stripDot(v.distantDetail)})` : ''}`);
  const bg = BG.backgroundDx(v);
  if (bg) clauses.push(bg);
  const nod = BG.nodulesDx(v);
  if (nod) clauses.push(`${nod} in the background liver`);
  return renderDiagnosis(head, clauses);
}

// ---------- validation ----------

export function validate(part) {
  const v = part.values;
  const { out, at, err, warn } = checks();
  const info = (m, f) => at('info', m, f);
  const t0 = isPT0(v) || isComplete(v);
  const ext = arr(v.tumourExtension);
  if (!v.histType) err('Histologic type is required.', 'histType');
  if (!ext.length) err('Tumour extension is required to assign pT.', 'tumourExtension');
  if (int(v.tumourCount) === null && !t0) err('Number of tumours is required to assign pT.', 'tumourCount');
  if (num(v.tumourSizeCm) === null && !t0) err('Size of the largest tumour is required to assign pT.', 'tumourSizeCm');
  if (ext.includes(EXTENSION.confined) && ext.some((s) => s !== EXTENSION.confined && s !== EXTENSION.gallbladder)) warn('"Tumour confined to liver" is ticked with an extension beyond the liver.', 'tumourExtension');
  if (ext.includes(EXTENSION.other) && !stripDot(v.extensionDetail)) warn('Tumour directly invades other adjacent organs: specify them.', 'extensionDetail');
  const large = S.LARGE_VESSEL.test(v.vascularInvasion || '');
  const veinTick = ext.includes(EXTENSION.portal) || ext.includes(EXTENSION.hepaticVein);
  if (veinTick && /^Not identified/.test(v.vascularInvasion || 'Not identified')) err('A major portal or hepatic vein branch is ticked under Tumour extension, but vascular invasion is "Not identified".', 'vascularInvasion');
  if (large && !veinTick) warn('Large vessel invasion: tick the portal vein or hepatic vein box under Tumour extension as well.', 'tumourExtension');
  if (ext.includes(EXTENSION.hepaticVein)) info('Hepatic vein(s) gives pT4 only for the right, middle or left hepatic vein (CAP, RCPath); a smaller branch is vascular invasion.', 'tumourExtension');
  const n = int(v.tumourCount);
  const size = num(v.tumourSizeCm);
  const dimsMm = stripDot(v.tumourDims).split(/\s*x\s*/i).map(num);
  // After treatment the staged size is the viable tumour (CAP), which can be smaller than the gross nodule.
  if (size !== null && !S.descriptors(v).includes('y') && dimsMm.every((x) => x !== null) && Math.abs(Math.max(...dimsMm) / 10 - size) > 0.05) {
    warn(`Largest tumour ${size} cm does not match its gross dimensions (${stripDot(v.tumourDims)} mm).`, 'tumourSizeCm');
  }
  if (!t0 && n === 1 && size !== null && size > 2 && /^Cannot/.test(v.vascularInvasion || '')) warn('Solitary tumour larger than 2 cm: vascular invasion decides pT1b or pT2, so it should be assessed.', 'vascularInvasion');
  if (v.satellitosis === 'Present' && (n ?? 1) < 2) info('Satellitosis counts as multiple tumours for pT (AJCC 8th edition).', 'satellitosis');
  const others = otherSizes(v);
  if (n !== null && others.length && others.length !== n - 1) warn(`${others.length} other tumour size${others.length === 1 ? '' : 's'} entered for ${n} tumours.`, 'otherSizesCm');
  if (size !== null && others.some((x) => x > size)) err('Another tumour is larger than the largest tumour.', 'otherSizesCm');
  if (v.histType === FIBROLAMELLAR && v.grade && !/^Not applicable/.test(v.grade)) info('Fibrolamellar carcinoma: CAP gives no grading guidance and the diagnosis line prints no grade; "Not applicable" also leaves the synoptic row out.', 'grade');
  if (/^Incomplete necrosis/.test(v.treatmentEffect || '') && num(v.necrosisPct) === null) warn('Incomplete necrosis: record the percentage of tumour necrosis.', 'necrosisPct');
  if (t0 && v.grade && !/^(GX|Not applicable)/.test(v.grade)) warn('No viable tumour: there is nothing to grade, so choose GX or "Not applicable".', 'grade');
  if (/^Uninvolved/.test(v.parenchymalMargin || '') && num(v.parenchymalMarginMm) === null && !t0) warn('Parenchymal margin uninvolved: record the distance.', 'parenchymalMarginMm');
  if (/^Uninvolved/.test(v.otherMargin || '') && num(v.otherMarginMm) === null) warn('Other margin uninvolved: record the distance.', 'otherMarginMm');
  if (v.otherMargin && !/^Not applicable/.test(v.otherMargin) && !stripDot(v.otherMarginDetail)) warn('Other margin: name it (e.g. hilar vascular or bile duct margin).', 'otherMarginDetail');
  const ex = int(v.nodesExamined); const pos = int(v.nodesInvolved);
  if (ex === null) warn('Number of regional lymph nodes examined: enter 0 if none were submitted.', 'nodesExamined');
  else if (ex > 0 && pos === null) err('Number of involved lymph nodes is required (enter 0 if none).', 'nodesInvolved');
  if (ex !== null && pos !== null && pos > ex) err('Involved nodes exceed the number examined.', 'nodesInvolved');
  if (pos && pos > 0 && (!v.ene || /^Not applicable/.test(v.ene))) info('Node-positive: extranodal extension is not recorded (a QMH item; the CAP protocol has none).', 'ene');
  if (chosen(v.distantMets).length && !stripDot(v.distantDetail)) warn('Distant metastasis: specify the site.', 'distantDetail');
  for (const i of BG.backgroundIssues(v)) at(i.level, i.message, i.field);
  const st = staging(part);
  // pNX is the expected state of a hepatectomy without nodes, so its note is not repeated as a check.
  const noteField = (x) => (/override/i.test(x) ? 'tnmOverride' : /necrosis/i.test(x) ? 'treatmentEffect' : /^Size/.test(x) ? 'tumourSizeCm'
    : /^(Multiple|Number of tumours)/.test(x) ? 'tumourCount' : /vascular invasion|vessel/i.test(x) && !/^Tumour /.test(x) ? 'vascularInvasion' : 'tumourExtension');
  for (const note of st.notes.filter((x) => !/^No regional lymph nodes submitted/.test(x))) info(note, noteField(note));
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
