// Gallbladder carcinoma resection generator (eighth synoptic template; the paired template of
// the benign cholecystectomy - see generators/gallbladder.js and its "Upgrade this part"
// hand-off). Elements mirror the QMH Cancer Reporting Template GI-Gallbladder page (AJCC 8th
// edition) in the QMH order, with deliberate house departures recorded in
// docs/specs/gallbladder-carcinoma.md: the "- Tumour histology:" paragraph follows
// "- Histologic grade:" (all synoptic templates) and the treatment-effect strings are the
// house CAP TRG variants (score 0-3). Tumour size is in cm as on the page. pTNM is derived
// by src/staging/gallbladder.js and printed only with `options.printPTNM`, stamped
// (AJCC 8th edition); a typed override wins and is echoed with its reason. Treatment effect
// beyond "No known presurgical therapy" adds the y descriptor automatically.
// Pure functions: (part, ctx) -> string.
//
// Blocks produced:
//   specimenName / specimens  "(A) Gallbladder, fundus, radical cholecystectomy"
//   macro                     "The specimen consists of a radical cholecystectomy …"
//   blockKey                  the typed block key, one "(n) …" entry per line
//   synoptic                  sectioned "- Element: value" list in QMH order
//   diagnosis                 the specimen line + "- " clauses, lowest margin distance
// Wording is protected by tests/gallbladder.test.js — change it only deliberately.

import { typeMorphology } from './gallbladder_morphology.js';
import { deriveTNM, stageLine } from '../src/staging/index.js';
import * as S from '../src/staging/gallbladder.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { letteredBlockKey, checks } from './_house.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
// stripDot here also strips a trailing colon; see generators/_house.js for why it is not shared.
const stripDot = (s) => String(s || '').trim().replace(/[.;:\s]+$/, '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const listAnd = listJoin;
const chosen = (list) => arr(list).filter((s) => !/^Not (identified|applicable|specified)|^Cannot|^None /.test(s));
const specify = (s) => String(s || '').replace(/\s*\((specify)[^)]*\)\s*:?$/i, '').trim();

// The QMH tumour-extension boxes ticked on the page; the deepest governs the pT category
// (matches the ranks in src/staging/gallbladder.js). Keep these strings verbatim in the schema.
export const EXTENSION = {
  t0: 'No evidence of primary tumour',
  t1a: 'Invades lamina propria',
  t1b: 'Invades muscular layer',
  t2a: 'Invades perimuscular connective tissue on the peritoneal side without serosal involvement',
  t2b: 'Invades perimuscular connective tissue on the hepatic side without liver involvement',
  t3serosa: 'Perforates serosa (visceral peritoneum)',
  t3liver: 'Directly invades liver',
  organ: /^Directly invades other adjacent organ\(s\) or structure\(s\): /,
  other: 'Directly invades other adjacent organ(s) or structure(s): Other (specify)',
  tx: 'Cannot be assessed'
};

/** Highest-ranked ticked extension row, with its label. */
function deepestExtension(v) {
  const ticks = arr(v.tumourExtension);
  if (!ticks.length) return null;
  if (ticks.some((s) => /no evidence of primary/i.test(s))) return { cat: 'T0', label: EXTENSION.t0 };
  const rows = [];
  for (const s of ticks) {
    for (const [re, rank, cat] of S.EXTENSION_T) {
      if (re.test(s)) { if (rank > 0) rows.push({ rank, cat, label: s }); break; }
    }
  }
  if (!rows.length) return null;
  return rows.reduce((a, b) => (b.rank > a.rank ? b : a));
}

const isPT0 = (v) => arr(v.tumourExtension).some((s) => /no evidence of primary/i.test(s));

// ---------- specimen ----------

export function procedureText(v) {
  if (/^(Other|Not specified)$/.test(v.procedure || '')) return stripDot(v.procedureOther) || (v.procedure === 'Not specified' ? 'Not specified' : v.procedure);
  return v.procedure || 'Not specified';
}

/** Head phrase: "simple cholecystectomy" / "radical cholecystectomy". */
export function procedurePhrase(v) {
  const p = specify(procedureText(v));
  if (p === 'Not specified') return '';
  if (/^Simple cholecystectomy/.test(p)) return 'simple cholecystectomy';
  if (/^Radical cholecystectomy/.test(p)) return 'radical cholecystectomy (with liver resection and lymphadenectomy)';
  return lc1(p);
}

export const sitePhrase = (s) => lc1(specify(s));

export function sitesText(v) {
  const sites = chosen(v.tumourSite).map((s) => (s === 'Other (specify)' ? stripDot(v.tumourSiteOther) : sitePhrase(s))).filter(Boolean);
  if (!sites.length) return '';
  return listJoin(sites);
}

export function specimenName(part) {
  const v = part.values;
  const typed = (v.specimenName || '').trim();
  if (typed) return typed;
  const sites = sitesText(v);
  const proc = procedurePhrase(v);
  return `Gallbladder${sites ? `, ${sites}` : ''}${proc ? `, ${proc}` : ''}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

// ---------- staging ----------

export function staging(part, ctx) { return deriveTNM(part.values, 'gallbladder'); }

// ---------- macro ----------

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const proc = procedurePhrase(v) || 'cholecystectomy';
  const article = /^[aeiou]/.test(proc) ? 'an' : 'a';
  let s = `(${part.label}) Received in formalin is ${article} ${proc} specimen`;
  const dims = stripDot(v.specimenDims) || stripDot(v.gallbladderDims);
  if (dims) s += ` measuring ${dims} mm`;
  s += '.';
  const det = [];
  if (stripDot(v.gallbladderDims) && stripDot(v.specimenDims) !== stripDot(v.gallbladderDims)) det.push(`the gallbladder measures ${stripDot(v.gallbladderDims)} mm`);
  if (stripDot(v.liverDims)) det.push(`a liver wedge measuring ${stripDot(v.liverDims)} mm is attached`);
  if (det.length) s += ` ${uc1(listJoin(det))}.`;
  const size = num(v.tumourSizeCm);
  const gd = stripDot(v.grossDetails);
  s += ' There is a tumour';
  const sites = sitesText(v);
  if (sites) s += ` in the ${sites}`;
  if (stripDot(v.tumourDims)) s += ` measuring ${stripDot(v.tumourDims)} mm`;
  else if (size !== null) s += ` measuring ${fmt(size)} cm in greatest dimension`;
  s += '.';
  if (gd) s += ` ${uc1(gd)}.`;
  s += ' Representative sections are taken; see block key.';
  return s;
}

// ---------- block key ----------

const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;

export const blockKey = (part, ctx) => letteredBlockKey(part, ctx, { lettered, strip: stripDot });

// ---------- values shared by synoptic and diagnosis ----------

export const histTypeName = (v) => (v.histType === 'Other (specify)'
  ? (v.histTypeOther || '').trim() || 'Histologic type not specified'
  : v.histType || 'Histologic type not specified');
/** Short canonical name for the diagnosis line, without the WHO descriptor parentheses. */
export function shortTypeName(v) {
  let t = specify(histTypeName(v)).replace(/ \(specify components\)$/, '');
  t = t.replace(/ \(Mixed adenoneuroendocrine carcinoma\)$/, ' (MANEC)');
  if (t === 'Mixed neuroendocrine-non-neuroendocrine tumour (specify components)') t = 'Mixed neuroendocrine-non-neuroendocrine tumour (MANEC)';
  if (/^Mixed neuroendocrine/.test(t) && stripDot(v.histTypeOther)) t = `Mixed neuroendocrine-non-neuroendocrine tumour (${stripDot(v.histTypeOther)})`;
  return t;
}

const gradeShort = (v) => (!v.grade || /^(GX|Not applicable|Other)$/.test(v.grade) ? (stripDot(v.gradeOther) || '') : v.grade.replace(/^G\d, /, ''));

/** An invasion clause for the derived histology sentence and the diagnosis. */
export function extensionPhrase(v) {
  const deep = deepestExtension(v);
  if (!deep) return '';
  const s = deep.label;
  if (s === EXTENSION.t1a) return 'invading the lamina propria';
  if (s === EXTENSION.t1b) return 'invading the muscular layer';
  if (s === EXTENSION.t2a) return 'invading the perimuscular connective tissue on the peritoneal side, without serosal involvement';
  if (s === EXTENSION.t2b) return 'invading the perimuscular connective tissue on the hepatic side, without liver involvement';
  if (s === EXTENSION.t3serosa) return 'perforating the serosa (visceral peritoneum)';
  if (s === EXTENSION.t3liver) return 'directly invading the liver';
  const m = /: (.+)$/.exec(s);
  if (m) {
    const organ = m[1] === 'Other (specify)' ? stripDot(v.extensionDetail) || 'other adjacent organs or structures' : m[1];
    return `directly invading the ${lc1(organ)}`;
  }
  return '';
}

/** Derived "- Tumour histology:" paragraph; the typed notes win when entered. */
export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return stripDot(v.histologyNotes) + '.';
  const g = gradeShort(v);
  const bits = [[g, lc1(histTypeName(v))].filter(Boolean).join(' ')].filter(Boolean);
  let s = `The tumour is a ${bits.join(', ')}`;
  const ext = extensionPhrase(v);
  if (ext) s += `, ${ext}`;
  s += '.';
  if (!isPT0(v)) {
    const typeName = v.histType === 'Other (specify)' ? '' : v.histType || '';
    const morph = typeMorphology(typeName, v.grade || '');
    if (morph) s += ` ${morph.replace(/\.$/, '')}.`;
  }
  return s;
}

function treatmentText(v) {
  const te = v.treatmentEffect || 'No known presurgical therapy';
  return /^No known/.test(te) ? 'No known presurgical therapy' : te;
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

// ---------- synoptic ----------

export function nodesItem(v) {
  const ex = int(v.nodesExamined);
  if (ex === null || ex === 0) return { label: 'Regional lymph nodes', value: ex === 0 ? 'None submitted (0 examined)' : 'Not recorded' };
  const inv = int(v.nodesInvolved);
  const sub = [
    { label: 'Number examined', value: String(ex) },
    { label: 'Number involved', value: inv === null ? 'Not recorded' : String(inv) }
  ];
  const ene = v.ene;
  if (inv && inv > 0) sub.push({ label: 'Extranodal extension', value: !ene || /^Not applicable/.test(ene) ? 'Not identified' : ene });
  const dep = num(v.largestDepositMm);
  if (inv && inv > 0 && dep !== null) sub.push({ label: 'Size of largest metastatic deposit', value: `${fmt(dep)} mm${stripDot(v.largestNodeSite) ? `, ${stripDot(v.largestNodeSite)}` : ''}` });
  const node = num(v.largestNodeMm);
  if (inv && inv > 0 && node !== null) sub.push({ label: 'Size of largest lymph node involved', value: `${fmt(node)} mm` });
  return { label: 'Regional lymph nodes', value: inv === null ? `${ex} examined; involved not recorded` : `${ex} examined; ${inv} involved`, sub };
}

export function metastasisValue(v) {
  const sites = chosen(v.distantMets).map((s) => specify(s.replace(/\s*\(specify\)\s*$/, '')));
  const kept = chosen(v.distantMets);
  const d = stripDot(v.distantDetail);
  const hasSpec = kept.some((s) => /\(specify\)/.test(s));
  if (!kept.length) {
    if (arr(v.distantMets).some((s) => /^Cannot/.test(s))) return `Cannot be determined${d ? ` (${d})` : ''}`;
    return arr(v.distantMets).includes('Not identified') ? 'Not identified' : 'Not applicable';
  }
  return `${listJoin(sites)}${d && hasSpec ? ` (${d})` : ''}`;
}

export function sizeTextValue(v) {
  const size = num(v.tumourSizeCm);
  const mode = v.sizeMode || '';
  if (/^Not applicable/.test(mode)) return 'Not applicable';
  if (/^Cannot be assessed/.test(mode)) return `Cannot be assessed${stripDot(v.sizeCannot) ? ` (${lc1(stripDot(v.sizeCannot))})` : ''}`;
  if (size === null) return 'Cannot be assessed';
  return /^Multifocal/.test(mode) ? `${fmt(size)} cm (multifocal invasive carcinoma, largest focus)` : `${fmt(size)} cm (unifocal invasive carcinoma, greatest dimension)`;
}

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const sites = arr(v.tumourSite);
  const extTicks = arr(v.tumourExtension);
  const extVal = extTicks.length
    ? listJoin(extTicks.map((s) => (s === EXTENSION.other && stripDot(v.extensionDetail) ? `Directly invades other adjacent organ(s) or structure(s): ${stripDot(v.extensionDetail)}` : s)))
    : 'Not recorded';
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureText(v)),
      item('Tumour site', sites.length
        ? listJoin(sites.map((s) => (s === 'Other (specify)' ? stripDot(v.tumourSiteOther) || 'Other' : s)))
        : 'Not specified'),
      item('Tumour size', sizeTextValue(v))
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      v.grade && v.grade !== 'Not applicable' ? item('Histologic grade', stripDot(v.grade) || stripDot(v.gradeOther) || null) : null,
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Tumour extension', extVal),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      item('Treatment effect', treatmentText(v))
    ] },
    { heading: 'Margins', items: [
      item('Cystic duct margin', resMarginText(v.cysticDuctMargin, v.cysticDuctMarginMm)),
      item('Hepatic parenchymal margin', resMarginText(v.hepaticMargin, v.hepaticMarginMm)),
      item('Radial margin', resMarginText(v.radialMargin, v.radialMarginMm)),
      item('High-grade intraepithelial neoplasia at the margins', v.hgIEN && v.hgIEN !== 'Not applicable' ? (v.hgIEN === 'Other (specify)' ? stripDot(v.hgIENDetail) || 'Other' : v.hgIEN) : null),
      v.otherMargin && !/^Not applicable/.test(v.otherMargin) ? item('Other margin(s)', `${resMarginText(v.otherMargin)}${stripDot(v.otherMarginDetail) ? ` (${stripDot(v.otherMarginDetail)})` : ''}`) : null
    ] },
    { heading: 'Lymph nodes', items: [nodesItem(v)] },
    { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] },
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${(v.tnmOverrideReason || '').trim() ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm,
        sub: stageLine(st) ? [{ label: stageLine(st).split(': ')[0], value: stageLine(st).split(': ').slice(1).join(': ') }] : [] }
    ] } : null,
    { heading: 'Additional findings', items: (() => {
      const f = chosen(v.additionalFindings)
        .map((s) => (s === 'Other (specify)' ? stripDot(v.additionalFindingsDetail) : s))
        .filter(Boolean);
      return [
        ...(f.length ? f.map((t) => ({ text: t })) : []),
        stripDot(v.additionalNotes) ? item('Additional notes', stripDot(v.additionalNotes)) : null,
        !f.length && !stripDot(v.additionalNotes) ? { text: 'None identified' } : null
      ];
    })() }
  ].filter(Boolean);
  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- diagnosis ----------

const upperHead = (spec) => { const c = spec.indexOf(', '); return c > 0 ? `${spec.slice(0, c).toUpperCase()}${spec.slice(c)}` : spec.toUpperCase(); };

/** "0 of 6 regional lymph nodes involved"; '' when none submitted. */
export function nodesPhrase(v) {
  const ex = int(v.nodesExamined);
  if (ex === null || ex === 0) return '';
  const inv = int(v.nodesInvolved) ?? 0;
  return `${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`;
}

const marginsPhrase = (v) => {
  const named = [
    { name: 'cystic duct margin', value: v.cysticDuctMargin, mm: num(v.cysticDuctMarginMm) },
    { name: 'hepatic parenchymal margin', value: v.hepaticMargin && !/^Not applicable/.test(v.hepaticMargin) ? v.hepaticMargin : '', mm: num(v.hepaticMarginMm) },
    { name: 'radial margin', value: v.radialMargin, mm: num(v.radialMarginMm) },
    { name: 'other margin', value: v.otherMargin && !/^Not applicable/.test(v.otherMargin) ? v.otherMargin : '', detail: stripDot(v.otherMarginDetail) }
  ].filter((m) => m.value && !/^Cannot be assessed/.test(m.value));
  const involved = named.filter((m) => /^Involved/.test(m.value || '')).map((m) => (m.detail ? `${m.name} (${m.detail})` : m.name));
  const clear = named.filter((m) => /^Uninvolved/.test(m.value || ''));
  const out = [];
  if (involved.length) out.push(`${listAnd(involved.map((x) => x.replace(/ margin$/, '')))} margin${involved.length > 1 ? 's' : ''} involved`);
  if (clear.length) {
    const mmVals = clear.map((m) => m.mm).filter((x) => Number.isFinite(x));
    out.push(`${clear.length > 1 ? 'other margins clear' : `${clear.map((m) => m.name).join(' and ')} clear`}${mmVals.length ? ` (closest ${fmt(Math.min(...mmVals))} mm)` : ''}`);
  }
  return out.join('; ');
};

export function diagnosis(part, ctx) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  const head = `(${part.label}) ${typed ? upperHead(typed) : upperHead(specimenName(part))}`;
  const first = [];
  if (isPT0(v)) {
    first.push('NO RESIDUAL CARCINOMA following therapy');
  } else {
    const g = gradeShort(v);
    const type = [upperHead(shortTypeName(v)), g].filter(Boolean).join(', ');
    let clause = type;
    const size = num(v.tumourSizeCm);
    if (size !== null && !/^Not applicable/.test(v.sizeMode || '')) clause += `, ${fmt(size)} cm`;
    const ext = extensionPhrase(v);
    if (ext) clause += `, ${ext}`;
    first.push(clause);
    const invasion = [];
    if (v.lvi === 'Present') invasion.push('lymphovascular invasion present');
    if (v.pni === 'Present') invasion.push('perineural invasion present');
    first.push(...invasion);
  }
  if (!/^No known/.test(v.treatmentEffect || 'No known presurgical therapy')) first.push(`treatment effect: ${lc1(String(v.treatmentEffect).replace(/\s*\\(not otherwise specified\\)/, ''))}`);
  const mp = marginsPhrase(v);
  if (mp) first.push(mp);
  const clauses = [`${first.join('; ')}; see synoptic report`];
  const np = nodesPhrase(v);
  if (np) clauses.push(np + (v.ene === 'Present' ? '; extranodal extension present' : ''));
  const mets = chosen(v.distantMets).map((s) => lc1(specify(s.replace(/\s*\(specify\)\s*$/, ''))));
  if (mets.length) clauses.push(`distant metastasis: ${listJoin(mets)}`);
  if (ctx?.options?.printPTNM) {
    const st = staging(part, ctx);
    let s = `${st.tnm} (${st.edition})`;
    if (st.stage) s += `, stage ${st.stage}${st.M === 'M-' ? ' (if cM0)' : ''}`;
    clauses.push(s);
  }
  return renderDiagnosis(head, clauses);
}

// ---------- validation ----------

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn } = checks();
  const cr = isPT0(v);
  if (!cr && num(v.tumourSizeCm) === null && !/^Not applicable/.test(v.sizeMode || '') && !/^Cannot be assessed/.test(v.sizeMode || '')) warn('Tumour size is not recorded.', 'tumourSizeCm');
  if (!v.histType) err('Histologic type is required.', 'histType');
  if (!arr(v.tumourExtension).length && !cr) err('Tumour extension is required to assign pT.', 'tumourExtension');
  const ticks = arr(v.tumourExtension);
  if (ticks.includes(EXTENSION.other) && !stripDot(v.extensionDetail)) warn('Tumour directly invades an other adjacent organ or structure: specify it.', 'extensionDetail');
  // Hepatic-side (pT2b) disease: the radial (hepatic-bed) margin is the decisive one.
  const t2b = ticks.includes(EXTENSION.t2b);
  if (t2b && !v.radialMargin) err('Radial (hepatic bed) margin status is required for hepatic-side (pT2b) disease.', 'radialMargin');
  if (t2b && /^Cannot be assessed/.test(v.radialMargin || '')) warn('Hepatic-side (pT2b) disease: the radial margin should be assessed and sampled rather than left "cannot be assessed".', 'radialMargin');
  // Incidental carcinoma in a simple cholecystectomy beyond the muscular layer needs completion.
  if (/^Simple cholecystectomy/.test(v.procedure || '') && ticks.some((s) => s !== EXTENSION.t1a && s !== EXTENSION.t1b && s !== EXTENSION.t0 && s !== EXTENSION.tx)) {
    warn('Simple cholecystectomy with invasion beyond the muscular layer (pT2 or higher): consider completion radical cholecystectomy with bile-duct excision (incidental carcinoma pathway).', 'procedure');
  }
  if (/^Involved/.test(v.cysticDuctMargin || '')) warn('Cystic duct margin involved: consider re-resection of the cystic duct stump / extrahepatic bile duct.', 'cysticDuctMargin');
  if (/^Radical cholecystectomy/.test(v.procedure || '') && /^Not applicable/.test(v.hepaticMargin || '')) warn('A radical cholecystectomy includes a liver wedge; the hepatic parenchymal margin should be assessable.', 'hepaticMargin');
  const ex = int(v.nodesExamined); const pos = int(v.nodesInvolved);
  if (ex === null) err('Number of regional lymph nodes examined is required (enter 0 if none submitted).', 'nodesExamined');
  else if (ex > 0 && pos === null) err('Number of involved lymph nodes is required (enter 0 if none).', 'nodesInvolved');
  if (ex !== null && pos !== null && pos > ex) err('Involved nodes exceed the number examined.', 'nodesInvolved');
  if (ex !== null && ex > 0 && ex < 6) warn('Fewer than 6 regional lymph nodes examined; AJCC 8th edition recommends at least 6 for reliable nodal staging.', 'nodesExamined');
  if (pos && pos > 0 && (!v.ene || /^Not applicable/.test(v.ene))) warn('Extranodal extension is not recorded for a node-positive case.', 'ene');
  if (/^Present, with no viable/.test(v.treatmentEffect || '') && !cr) warn('Complete pathological response (score 0) recorded but Tumour extension is not "No evidence of primary tumour".', 'treatmentEffect');
  if (!cr) {
    for (const [label, sel, mm, field] of [['Cystic duct margin', v.cysticDuctMargin, v.cysticDuctMarginMm, 'cysticDuctMarginMm'], ['Hepatic parenchymal margin', v.hepaticMargin, v.hepaticMarginMm, 'hepaticMarginMm'], ['Radial margin', v.radialMargin, v.radialMarginMm, 'radialMarginMm']]) {
      if (/^Uninvolved/.test(sel || '') && /distance/i.test(sel) && num(mm) === null) warn(`${label} uninvolved: record the distance.`, field);
    }
  }
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
