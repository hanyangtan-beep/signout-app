// Renal cell carcinoma nephrectomy — synoptic report (QMH UG-Kidney, CAP Kidney 4.3.0.0,
// WHO 5th edition 2022, AJCC 8th edition Chapter 60).
//
// Sources:
//   QMH Cancer Reporting Template UG-Kidney:
//     https://awiloqmh.github.io/CancerReportingTemplate/UG-Kidney.html
//     (saved as docs/reference/UG-Kidney.html)
//   CAP Protocol for the Examination of Resection Specimens From Patients With Invasive
//     Carcinoma of Renal Tubular Origin, v4.3.0.0 (Sept 2023)
//   WHO Classification of Urinary and Male Genital Tumours, 5th edition (2022)
//   Staging: src/staging/kidney.js (AJCC 8th edition, Chapter 60).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/kidney.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { stripDot, letteredBlockKey, checks } from './_house.js';

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
const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// ---------- specimen & procedure ----------

function procedureValue(v) {
  const p = v.procedure || '';
  if (!p) return 'Not specified';
  if (p === 'Other (specify)') return uc1(stripDot(v.procedureOther)) || 'Other';
  return p;
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return uc1(typed);
  const lat = v.laterality && v.laterality !== 'Not specified' ? `${lc1(v.laterality)} ` : '';
  const proc = lc1(procedureValue(v));
  return `${uc1(lat)}kidney, ${proc}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'kidney'); }

// ---------- macro ----------

function sizeText(raw, defaultUnit = 'cm') {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ` ${defaultUnit}`;
  return s;
}

function siteList(v) {
  const xs = arr(v.site).map((x) => lc1(x));
  const other = stripDot(v.siteOther);
  if (other) xs.push(lc1(other));
  return listJoin(xs);
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const tag = lettered(part, ctx) ? `(${part.label}) ` : '';
  const lat = v.laterality && v.laterality !== 'Not specified' ? `${lc1(v.laterality)} ` : '';
  const proc = lc1(procedureValue(v));
  const w = num(v.weight);
  const dims = sizeText(v.specimenDims, 'cm');
  const measures = [];
  if (w !== null) measures.push(`weighing ${fmt(w)} g`);
  if (dims) measures.push(`measuring ${dims}`);
  const bits = [`${tag}Received in formalin is a ${lat}${proc} specimen${measures.length ? ` ${listJoin(measures)}` : ''}.`];

  const sz = num(v.sizeMm);
  const allDims = stripDot(v.allDimsMm);
  const loc = siteList(v);
  if (sz !== null) {
    const dimClause = allDims ? ` (${allDims} mm)` : '';
    const app = stripDot(v.grossAppearance) ? `, ${lc1(stripDot(v.grossAppearance))}` : '';
    bits.push(`Sectioning reveals a ${fmt(sz)} mm${dimClause} tumour${loc ? ` in the ${loc}` : ''}${app}.`);
  }

  const adrenal = stripDot(v.adrenalGross);
  if (adrenal) bits.push(`Adrenal gland: ${lc1(adrenal)}.`);

  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

// ---------- histologic type & WHO/ISUP grade ----------

const SPECIFY_RE = /\s*\(specify\)$/;

export function histTypeName(v) {
  const t = v.histType || '';
  if (!t) return 'Histologic type not specified';
  const extra = stripDot(v.histTypeOther);
  if (SPECIFY_RE.test(t)) {
    const base = t.replace(SPECIFY_RE, '');
    return extra ? `${base} (${extra})` : base;
  }
  if (t === 'Renal cell carcinoma, NOS' && extra) return `${t} (${lc1(extra)})`;
  return t;
}

export const NON_GRADABLE_RCC = new Set([
  'Chromophobe renal cell carcinoma',
  'Multilocular cystic renal neoplasm of low malignant potential',
  'Clear cell papillary renal cell tumour',
  'Other oncocytic tumours of the kidney (specify)'
]);

const TYPE_MORPH = {
  'Clear cell renal cell carcinoma': 'Nests and acini of polygonal tumour cells with optically clear cytoplasm are separated by a delicate branching sinusoidal capillary network.',
  'Papillary renal cell carcinoma': 'True fibrovascular papillae and tubules are lined by cuboidal to columnar cells with variable foamy macrophages and psammoma bodies.',
  'Chromophobe renal cell carcinoma': 'Solid sheets of pale polygonal and eosinophilic cells display prominent plant-like cell membranes, raisinoid nuclei and perinuclear haloes.',
  'Clear cell papillary renal cell tumour': 'Tubulopapillary and cystic structures are lined by low-grade clear cells with characteristically apically aligned nuclei away from the basement membrane.',
  'Multilocular cystic renal neoplasm of low malignant potential': 'Thin fibrous septa lined by a single layer of low-grade clear cells form variable cysts without expansile solid nodules.',
  'Collecting duct carcinoma': 'Infiltrating irregular tubular and tubulopapillary glands with marked nuclear atypia elicit a prominent desmoplastic stromal reaction.',
  'Mucinous tubular and spindle cell carcinoma': 'Elongated tightly packed tubules merge with bland spindle cells within a basophilic mucinous stroma.',
  'Tubulocystic renal cell carcinoma': 'Variably sized tubules and cysts lined by hobnail eosinophilic cells with prominent nucleoli are separated by fibrotic septa.',
  'TFE3-rearranged renal cell carcinoma': 'Papillary and nested epithelioid clear and eosinophilic cells are accompanied by psammoma bodies.',
  'FH-deficient renal cell carcinoma': 'Papillary and tubulocystic architecture shows large tumour cells with prominent viral-inclusion-like eosinophilic nucleoli and perinucleolar clearing.'
};

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const what = lc1(histTypeName(v));
  const gr = v.grade && !/^Not applicable|GX\b/.test(v.grade) ? `, ${v.grade}` : '';
  let s = `Sections of the kidney show ${what}${gr}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

// ---------- features, extension, margins, nodes ----------

function featureWithPct(status, pctRaw) {
  if (!status || status === 'Not identified') return status || 'Not identified';
  const p = num(pctRaw);
  return p !== null ? `${status} (${fmt(p)}%)` : status;
}

function extensionValue(v) {
  const xs = arr(v.extension);
  if (!xs.length) return 'Limited to kidney';
  return xs.join('; ');
}

function marginItems(v) {
  const st = v.marginStatus || 'All margins uninvolved by invasive carcinoma';
  const items = [{ label: 'Surgical margins', value: st }];
  if (st === 'All margins uninvolved by invasive carcinoma') {
    const d = num(v.closestMarginMm);
    const site = stripDot(v.closestMarginSite);
    if (d !== null) {
      items.push({ label: 'Distance to closest margin', value: `${fmt(d)} mm${site ? ` (${lc1(site)})` : ''}` });
    }
  } else if (st === 'Involved by invasive carcinoma') {
    const involved = arr(v.involvedMargins).map((x) => lc1(x));
    const other = stripDot(v.involvedMarginsOther);
    if (other) involved.push(lc1(other));
    if (involved.length) items.push({ label: 'Involved margin(s)', value: uc1(listJoin(involved)) });
  }
  return items;
}

function nodeItems(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  const site = stripDot(v.nodeSites);
  const items = [{ label: 'Regional lymph nodes', value: `${inv} of ${ex} involved${site ? ` (${site})` : ''}` }];
  if (inv > 0) {
    if (v.ene) items.push({ label: 'Extranodal extension (ENE)', value: v.ene });
    const dep = num(v.largestDepositMm);
    if (dep !== null) items.push({ label: 'Size of largest metastatic deposit', value: `${fmt(dep)} mm` });
  }
  return items;
}

function metastasisValue(v) {
  const sites = S.m1Sites(v);
  if (sites.length) {
    const detail = stripDot(v.distantMetsOther);
    const list = listJoin(sites.map((s) => (s === S.METS.other ? detail || 'other distant site' : s)).map((s, i) => (i ? lc1(s) : s)));
    return detail && !sites.includes(S.METS.other) ? `${list} (${detail})` : list;
  }
  const m = arr(v.distantMets);
  for (const x of [S.METS.na, S.METS.none, S.METS.cannot]) if (m.includes(x)) return x;
  return '';
}

function nonNeoplasticValue(v) {
  const xs = arr(v.nonNeoplastic);
  const other = stripDot(v.nonNeoplasticOther);
  if (other) xs.push(uc1(other));
  return xs.length ? xs.join('; ') : 'Unremarkable';
}

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const sz = num(v.sizeMm);
  const allDims = stripDot(v.allDimsMm);
  const sizeStr = sz !== null ? `${fmt(sz)} mm${allDims ? ` (${allDims} mm)` : ''}` : 'Not specified';

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Specimen laterality', v.laterality || 'Not specified'),
      item('Tumour focality', v.focality || 'Unifocal'),
      siteList(v) ? item('Tumour site', uc1(siteList(v))) : null,
      item('Tumour size (greatest dimension)', sizeStr)
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      item('Histologic grade (WHO/ISUP)', v.grade || 'Not specified'),
      item('Sarcomatoid features', featureWithPct(v.sarcomatoid, v.sarcomatoidPct)),
      item('Rhabdoid features', featureWithPct(v.rhabdoid, v.rhabdoidPct)),
      item('Tumour necrosis', featureWithPct(v.necrosis, v.necrosisPct)),
      item('Lymphovascular invasion (excluding renal vein / IVC)', v.lvi || 'Not identified'),
      v.pni && v.pni !== 'Not assessed' ? item('Perineural invasion', v.pni) : null,
      item('Tumour extension', extensionValue(v)),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    { heading: 'Additional findings', items: [
      item('Non-neoplastic kidney', nonNeoplasticValue(v)),
      stripDot(v.additionalNotes) ? { label: 'Additional notes', para: `${stripDot(v.additionalNotes)}.` } : null
    ] }
  ].map((s) => (s ? { ...s, items: s.items.filter(Boolean) } : null)).filter((s) => s && s.items.length);

  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- molecular findings ----------

export function molecular(part) {
  const v = part.values;
  const items = [];
  if (stripDot(v.molecularNotes)) items.push({ label: 'Molecular / cytogenetic studies', value: uc1(stripDot(v.molecularNotes)) });
  if (!items.length) return '';
  return renderSynoptic([{ heading: 'Molecular studies', items }], '');
}

// ---------- diagnosis ----------

function headOf(name) {
  const idx = name.indexOf(',');
  return idx > 0 ? `${name.slice(0, idx).toUpperCase()}${name.slice(idx)}` : name.toUpperCase();
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `${lettered(part, ctx) ? `(${part.label}) ` : ''}${headOf(specimenName(part))}:`;
  const sz = num(v.sizeMm);
  const firstBits = [histTypeName(v).toUpperCase()];
  if (v.grade && !/^Not applicable|GX\b/.test(v.grade)) firstBits.push(v.grade);
  if (sz !== null) firstBits.push(`${fmt(sz)} mm`);
  const clauses = [firstBits.join(', ')];

  const highGradeBits = [];
  if (v.sarcomatoid === 'Present') highGradeBits.push(`sarcomatoid features (${num(v.sarcomatoidPct) !== null ? `${fmt(num(v.sarcomatoidPct))}%` : 'present'})`);
  if (v.rhabdoid === 'Present') highGradeBits.push(`rhabdoid features (${num(v.rhabdoidPct) !== null ? `${fmt(num(v.rhabdoidPct))}%` : 'present'})`);
  if (highGradeBits.length) clauses.push(`${uc1(listJoin(highGradeBits))} present`);

  const ext = arr(v.extension).filter((x) => x !== S.EXT.limited && x !== S.EXT.cannot);
  if (ext.length) clauses.push(`Tumour extends into ${listJoin(ext.map((x) => lc1(x)))}`);
  else clauses.push('Confined to the kidney');

  if (v.marginStatus === 'Involved by invasive carcinoma') {
    const inv = arr(v.involvedMargins).map((x) => lc1(x));
    const other = stripDot(v.involvedMarginsOther);
    if (other) inv.push(lc1(other));
    clauses.push(`Surgical margin involved by carcinoma${inv.length ? ` (${listJoin(inv)})` : ''}`);
  } else if (v.marginStatus === 'Cannot be assessed') {
    clauses.push('Surgical margins cannot be assessed');
  } else {
    const d = num(v.closestMarginMm);
    const site = stripDot(v.closestMarginSite);
    clauses.push(`Surgical margins clear${d !== null ? ` (closest ${fmt(d)} mm${site ? `, ${lc1(site)}` : ''})` : ''}`);
  }

  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex !== null && ex > 0) {
    let np = `${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`;
    if (inv > 0 && v.ene === 'Present') np += '; extranodal extension present';
    clauses.push(np);
  }

  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && st.tnm) {
    clauses.push(`${st.tnm} (${st.edition})`);
  }

  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

// ---------- checks ----------

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);

  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic type not recorded.', 'histType');
  if (num(v.sizeMm) === null && !v.noPrimary) warn('Greatest tumour dimension (mm) not recorded.', 'sizeMm');

  // WHO/ISUP grading rules:
  const isNonGradable = NON_GRADABLE_RCC.has(v.histType || '');
  if (isNonGradable && v.grade && !/^Not applicable|GX\b/.test(v.grade)) {
    warn(`${histTypeName(v)} is not graded by the WHO/ISUP nucleolar grading system (select Not applicable).`, 'grade');
  }
  if ((v.sarcomatoid === 'Present' || v.rhabdoid === 'Present') && v.grade && !/^G4\b/.test(v.grade) && !isNonGradable) {
    warn('Sarcomatoid or rhabdoid differentiation automatically assigns WHO/ISUP Grade 4 (G4).', 'grade');
  }
  if (v.sarcomatoid === 'Present' && num(v.sarcomatoidPct) === null) {
    info('Sarcomatoid features present: record estimated percentage of sarcomatoid component (CAP 4.3.0.0).', 'sarcomatoidPct');
  }
  if (v.rhabdoid === 'Present' && num(v.rhabdoidPct) === null) {
    info('Rhabdoid features present: record estimated percentage of rhabdoid component (CAP 4.3.0.0).', 'rhabdoidPct');
  }

  // Extension consistency:
  const ext = arr(v.extension);
  if (ext.includes(S.EXT.limited) && ext.length > 1) {
    warn('Tumour extension selects "Limited to kidney" alongside extrarenal extension.', 'extension');
  }

  // Margin checks:
  if (v.marginStatus === 'Involved by invasive carcinoma' && !arr(v.involvedMargins).length && !stripDot(v.involvedMarginsOther)) {
    warn('Positive surgical margin: specify at least one involved margin.', 'involvedMargins');
  }

  // Nodes:
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex !== null && inv !== null && inv > ex) {
    err(`Regional lymph nodes: ${inv} involved exceeds ${ex} examined.`, 'nodesInvolved');
  }
  if (inv !== null && inv > 0 && !v.ene) {
    info('Positive lymph nodes recorded: extranodal extension (ENE) not recorded.', 'ene');
  }

  // Staging notes & reference lines:
  const st = staging(part, ctx);
  for (const note of st.notes || []) info(note);
  for (const l of S.referenceLines(v, st)) info(l);
  if (st.overridden && !stripDot(v.tnmOverrideReason)) warn('pTNM override has no reason.', 'tnmOverrideReason');

  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, molecular, diagnosis, validate, staging };
