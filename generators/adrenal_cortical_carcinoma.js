// Adrenal cortical carcinoma resection — synoptic report
// (QMH Endocrine-Adrenal, WHO 5th edition, RCPath 2024, AJCC 8th / ENSAT).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/adrenal.js';
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
  const lat = v.laterality && !/Not specified/i.test(v.laterality) ? `${v.laterality} ` : '';
  return `${uc1(`${lat}adrenal gland`)}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'adrenal'); }

function sizeText(raw, defaultUnit = 'cm') {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ` ${defaultUnit}`;
  return s;
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const tag = lettered(part, ctx) ? `(${part.label}) ` : '';
  const proc = lc1(procedureValue(v));
  const dims = sizeText(v.specimenDims, 'cm');
  const wt = num(v.weightG);
  const bits = [`${tag}Received in formalin is a ${proc} specimen${dims ? ` measuring ${dims}` : ''}${wt !== null ? ` and weighing ${fmt(wt)} g` : ''}.`];
  const sz = num(v.sizeMm);
  if (sz !== null) bits.push(`Serial sectioning reveals a ${fmt(sz)} mm lobulated yellow-tan haemorrhagic tumour with fibrous bands and areas of necrosis.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Adrenal cortical carcinoma, conventional': 'Diffuse sheets and broad trabeculae of pleomorphic polygonal adrenocortical cells with predominantly eosinophilic lipid-poor cytoplasm, enlarged vesicular nuclei, prominent nucleoli, atypical mitotic figures and confluent tumour necrosis disrupt the reticulin framework.',
  'Adrenal cortical carcinoma, oncocytic (> 90% oncocytic)': 'Diffuse sheets and nested arrays composed of > 90% large polygonal cells with abundant deeply eosinophilic granular cytoplasm, pleomorphic nuclei and prominent nucleoli exhibit elevated mitotic activity and/or venous invasion.',
  'Adrenal cortical carcinoma, myxoid': 'Cords, trabeculae and pseudoglandular clusters of atypical eosinophilic adrenocortical cells are suspended within abundant alcianophilic extracellular myxoid stroma.',
  'Adrenal cortical carcinoma, sarcomatoid': 'Biphasic malignant adrenocortical neoplasm displays high-grade pleomorphic spindle cell and/or heterologous sarcomatous areas merged with conventional adrenocortical carcinoma.',
  'Adrenal cortical carcinoma, paediatric': 'Expansile lobules and diffuse sheets of pleomorphic eosinophilic adrenocortical cells with increased mitotic activity, confluent necrosis and vascular/capsular invasion replace the paediatric adrenal cortex.',
  'Adrenal cortical neoplasm of uncertain malignant potential': 'Borderline adrenocortical proliferation displays worrisome histologic features insufficient for a definitive diagnosis of adrenal cortical carcinoma.',
  'Other histologic type not listed (specify)': 'Malignant adrenocortical neoplasm is present.'
};

export function histTypeName(v) {
  const t = v.histType || 'Adrenal cortical carcinoma, conventional';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify[^)]*\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  let s = `Sections of the adrenal gland show ${lc1(histTypeName(v))}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const sc = stripDot(v.scoreValue) ? `${v.scoringSystem || 'Weiss score'}: ${stripDot(v.scoreValue)}.` : '';
  const mit = num(v.mitoticRate);
  const ki = num(v.ki67Pct);
  const prol = [mit !== null ? `Mitotic count is ${fmt(mit)} per 10 mm2` : '', ki !== null ? `Ki-67 labelling index is ${fmt(ki)}%` : ''].filter(Boolean).join('; ');
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, sc, prol ? `${prol}.` : '', ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'Uninvolved by carcinoma';
  const items = [{ label: 'Surgical margins', value: st }];
  const d = num(v.closestMarginMm);
  const site = stripDot(v.closestMarginSite);
  if (d !== null && /uninvolved/i.test(st)) {
    items.push({ label: 'Distance to closest margin', value: `${fmt(d)} mm${site ? ` (${lc1(site)})` : ''}` });
  } else if (/involved/i.test(st) && site) {
    items.push({ label: 'Involved margin(s)', value: uc1(site) });
  }
  return items;
}

function nodeItems(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  return [{ label: 'Regional lymph nodes', value: `${inv} of ${ex} involved` }];
}

function metastasisValue(v) {
  const sites = S.m1Sites(v);
  if (sites.length) {
    const detail = stripDot(v.distantMetsOther);
    return listJoin(sites.map((s) => (s === S.METS.other ? detail || 'other site' : s)).map((s, i) => (i ? lc1(s) : s)));
  }
  const m = arr(v.distantMets);
  for (const x of [S.METS.na, S.METS.none, S.METS.cannot]) if (m.includes(x)) return x;
  return '';
}

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const sz = num(v.sizeMm);
  const wt = num(v.weightG);
  const mit = num(v.mitoticRate);
  const ki = num(v.ki67Pct);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Laterality', v.laterality || 'Not specified'),
      wt !== null ? item('Weight', `${fmt(wt)} g`) : null,
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic subtype (WHO 5th)', histTypeName(v)),
      item('Scoring system', stripDot(v.scoreValue) ? `${v.scoringSystem || 'Weiss score'}: ${stripDot(v.scoreValue)}` : (v.scoringSystem || '')),
      item('Histologic grade', v.grade || 'Cannot be assessed'),
      mit !== null ? item('Mitotic rate', `${fmt(mit)} per 10 mm2`) : null,
      ki !== null ? item('Ki-67 labelling index', `${fmt(ki)}%`) : null,
      item('Confluent tumour necrosis', v.necrosis || 'Not identified'),
      item('Vascular invasion', v.lvi || 'Not identified'),
      item('Tumour extent', v.extension || 'Not specified'),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    { heading: 'Additional findings', items: [
      stripDot(v.additionalNotes) ? { label: 'Additional notes', para: `${stripDot(v.additionalNotes)}.` } : null
    ] }
  ].map((s) => (s ? { ...s, items: s.items.filter(Boolean) } : null)).filter((s) => s && s.items.length);

  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

function headOf(name) {
  const idx = name.indexOf(',');
  return idx > 0 ? `${name.slice(0, idx).toUpperCase()}${name.slice(idx)}` : name.toUpperCase();
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `${lettered(part, ctx) ? `(${part.label}) ` : ''}${headOf(specimenName(part))}:`;
  const sz = num(v.sizeMm);
  const first = [histTypeName(v).toUpperCase()];
  if (v.grade && !/Cannot/i.test(v.grade)) first.push(lc1(v.grade.replace(/\s*\([^)]*\)/, '')));
  if (sz !== null) first.push(`${fmt(sz)} mm`);
  const clauses = [first.join(', ')];
  clauses.push(v.marginStatus || 'Uninvolved by carcinoma');
  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && st.tnm) clauses.push(`${st.tnm} (${st.edition})`);
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic subtype not recorded.', 'histType');
  const mit = num(v.mitoticRate);
  if (mit !== null) {
    if (mit > 20 && /^Low grade/i.test(v.grade || '')) warn(`Mitotic rate (${fmt(mit)}/10 mm2) exceeds 20/10 mm2 and corresponds to high-grade ACC.`, 'grade');
    if (mit <= 20 && /^High grade/i.test(v.grade || '')) warn(`Mitotic rate (${fmt(mit)}/10 mm2) is <= 20/10 mm2 and corresponds to low-grade ACC.`, 'grade');
  }
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex !== null && inv !== null && inv > ex) err(`Regional lymph nodes: ${inv} involved exceeds ${ex} examined.`, 'nodesInvolved');
  const st = staging(part, ctx);
  for (const note of st.notes || []) info(note);
  for (const l of S.referenceLines(v, st)) info(l);
  if (st.overridden && !stripDot(v.tnmOverrideReason)) warn('pTNM override has no reason.', 'tnmOverrideReason');
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
