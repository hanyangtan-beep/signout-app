// Paediatric extragonadal germ cell tumour resection — synoptic report
// (QMH Pedi-GermCellTumors, WHO 5th edition Paediatric Tumours, COG / MaGIC Staging).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/extragonadal_gct.js';
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
  return `${uc1(v.site || 'Extragonadal mass')}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'extragonadal_gct'); }

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
  const bits = [`${tag}Received in formalin is a ${proc} specimen${dims ? ` measuring ${dims}` : ''}.`];
  const sz = num(v.sizeMm);
  if (sz !== null) bits.push(`Sectioning reveals a ${fmt(sz)} mm variegated solid and multilocular cystic mass with mucoid, fatty and cartilaginous areas.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Mature teratoma': 'Well-differentiated mature tissues representing ectodermal (stratified squamous epithelium, skin adnexa, mature neuroglia), mesodermal (adipose tissue, smooth muscle, cartilage, bone) and endodermal (respiratory and gastrointestinal epithelium) lineages lack immature neuroectoderm or malignant germ cell elements.',
  'Immature teratoma, grade 1': 'Mature teratomatous tissues contain rare small foci of immature neuroectodermal tubules and rosettes occupying <= 1 low-power field on any single slide.',
  'Immature teratoma, grade 2': 'Mature teratomatous elements are accompanied by moderate amounts of immature neuroectodermal tubules and neuroepithelium occupying 2–3 low-power fields on any slide.',
  'Immature teratoma, grade 3': 'Abundant confluent sheets and rosettes of immature embryonic-type neuroectoderm occupy >= 4 low-power fields on at least one slide.',
  'Yolk sac tumour': 'Microcystic/reticular, papillary, solid and endodermal sinus (Schiller-Duval bodies) proliferations of atypical cuboidal cells with PAS-positive hyaline globules infiltrate the extragonadal mass.',
  'Germinoma / seminoma': 'Sheets of uniform clear polygonal germ cells with distinct cell membranes, squared-off nuclei and central nucleoli are divided by lymphocyte-rich fibrous septa.',
  'Embryonal carcinoma': 'Solid sheets, glandular spaces and papillae of large primitive pleomorphic epithelial cells with overlapping vesicular nuclei, macronucleoli and geographic necrosis infiltrate the mass.',
  'Choriocarcinoma': 'Biphasic malignant proliferation of mononucleated cytotrophoblast and intermediate trophoblast capped by pleomorphic multinucleated syncytiotrophoblast is set amidst extensive haemorrhage and necrosis.',
  'Mixed malignant germ cell tumour (specify percentages)': 'Intimately admixed malignant germ cell tumour components replace the extragonadal mass.',
  'Teratoma with somatic-type malignancy (specify)': 'Teratoma contains an expansile pure nodule (>= 5 mm) of somatic-type malignant carcinoma, sarcoma or neuroectodermal tumour.',
  'Other histologic type not listed (specify)': 'Extragonadal germ cell neoplasm is present.'
};

export function histTypeName(v) {
  const t = v.histType || 'Mature teratoma';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify[^)]*\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  let s = `Sections show ${lc1(histTypeName(v))}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const ys = v.yolkSacFoci && v.yolkSacFoci !== 'Not identified' ? `Yolk sac tumour component: ${lc1(v.yolkSacFoci)}.` : 'No microscopic yolk sac tumour foci are identified.';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, ys, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function nodeItems(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  return [{ label: 'Regional lymph nodes', value: `${inv} of ${ex} involved` }];
}

function metastasisValue(v) {
  const sites = S.m1Sites(v);
  if (sites.length) return listJoin(sites.map((s, i) => (i ? lc1(s) : s)));
  const m = arr(v.distantMets);
  for (const x of [S.METS.na, S.METS.none, S.METS.cannot]) if (m.includes(x)) return x;
  return '';
}

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const cog = S.deriveCogStage(v);
  const sz = num(v.sizeMm);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Primary site', v.site || 'Sacrococcygeal region'),
      /sacrococcygeal/i.test(v.site || '') && v.altmanType && v.altmanType !== 'Not specified' ? item('Altman classification', v.altmanType) : null,
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', histTypeName(v)),
      item('Microscopic yolk sac tumour foci', v.yolkSacFoci || 'Not identified'),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins & coccyx', items: [
      item('Completeness of resection', v.resectionCompleteness || 'Complete gross resection (R0/R1)'),
      item('Surgical margins', v.marginStatus || 'Uninvolved by tumour'),
      v.coccyxPresent && !/not applicable/i.test(v.coccyxPresent) ? item('Coccyx status', v.coccyxPresent) : null
    ] },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM ? { heading: S.edition, items: [
      item('COG stage', cog.stage)
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
  if (sz !== null) first.push(`${fmt(sz)} mm`);
  const clauses = [first.join(', ')];
  clauses.push(v.marginStatus || 'Uninvolved by tumour');
  const cog = S.deriveCogStage(v);
  if (ctx?.options?.printPTNM && cog.stage && !/Cannot/i.test(cog.stage)) clauses.push(`COG ${cog.stage}`);
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

export function validate(part) {
  const v = part.values;
  const { out, err, at } = checks();
  const info = (m, f) => at('info', m, f);
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic type not recorded.', 'histType');
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex !== null && inv !== null && inv > ex) err(`Regional lymph nodes: ${inv} involved exceeds ${ex} examined.`, 'nodesInvolved');
  for (const l of S.referenceLines(v)) info(l);
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
