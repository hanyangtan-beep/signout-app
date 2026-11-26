// Paediatric neuroblastoma resection — synoptic report
// (QMH Pedi-Neuroblastoma, WHO 5th Paediatric Tumours, INPC / Shimada, INRGSS).

import { deriveTNM, showNodes } from '../src/staging/index.js';
import * as S from '../src/staging/neuroblastoma.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { stripDot, letteredBlockKey, checks } from './_house.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
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
  const lat = v.laterality && !/Not specified|Midline/i.test(v.laterality) ? `${v.laterality} ` : '';
  return `${uc1(`${lat}${lc1(v.site || 'adrenal gland')}`)}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'neuroblastoma'); }

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
  if (sz !== null) bits.push(`Sectioning reveals a ${fmt(sz)} mm lobulated fleshy grey-tan tumour with focal haemorrhage and punctate calcification.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Neuroblastoma (Schwannian stroma-poor), undifferentiated': 'Diffuse sheets of small round blue neuroblastic cells with scant cytoplasm and stippled salt-and-pepper chromatin lack identifiable neuropil or ganglionic differentiation.',
  'Neuroblastoma (Schwannian stroma-poor), poorly differentiated': 'Lobules and nests of small round neuroblastic cells set within fibrillary pink neuropil with Homer-Wright pseudorosettes show < 5% differentiating ganglion-like cells within a Schwannian stroma-poor background.',
  'Neuroblastoma (Schwannian stroma-poor), differentiating': 'Neuroblastic lobules within abundant fibrillary neuropil show >= 5% differentiating neuroblasts with enlarged eccentric vesicular nuclei, prominent nucleoli and abundant eosinophilic cytoplasm.',
  'Ganglioneuroblastoma, intermixed (Schwannian stroma-rich)': 'Predominant (> 50%) Schwannian ganglioneuromatous stroma contains well-defined microscopic nests of differentiating neuroblasts in fibrillary neuropil.',
  'Ganglioneuroblastoma, nodular (composite)': 'Grossly and microscopically distinct haemorrhagic Schwannian stroma-poor neuroblastic nodule(s) are juxtaposed with a dominant Schwannian stroma-rich ganglioneuromatous or intermixed ganglioneuroblastomatous component.',
  'Ganglioneuroma, maturing (Schwannian stroma-dominant)': 'Schwannian stroma-dominant proliferation contains mature ganglion cells admixed with scattered minor collections of maturing neuroblasts without discrete neuroblastic nests.',
  'Ganglioneuroma, mature (Schwannian stroma-dominant)': 'Fascicles of bland Schwannian spindle cells and neuritic processes contain scattered mature ganglion cells without neuroblastic elements.',
  'Post-therapy peripheral neuroblastic tumour (NOS / unclassifiable)': 'Post-chemotherapy tumour shows extensive treatment-induced necrosis, fibrosis, haemosiderin-laden macrophages, calcification and variable ganglionic maturation.',
  'Other histologic type not listed (specify)': 'Peripheral neuroblastic tumour is present.'
};

export function histTypeName(v) {
  const t = v.histType || 'Neuroblastoma (Schwannian stroma-poor), poorly differentiated';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify[^)]*\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  let s = `Sections show ${lc1(histTypeName(v))}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const mki = v.mki && !/Not applicable/i.test(v.mki) ? `Mitosis-Karyorrhexis Index (MKI) is ${lc1(v.mki)}.` : '';
  const nec = num(v.therapyNecrosisPct);
  const trt = nec !== null ? `Treatment-related necrosis / regression accounts for approximately ${fmt(nec)}% of the tumour bed.` : '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, mki, trt, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function nodeItems(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  return [{ label: 'Regional lymph nodes', value: `${inv} of ${ex} involved` }];
}

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const sz = num(v.sizeMm);
  const age = num(v.ageMonths);
  const nec = num(v.therapyNecrosisPct);
  const inpc = S.inpcPrognostic(v);
  const inrgCode = S.inrgStageCode(v);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Primary site', v.site || 'Adrenal gland'),
      item('Laterality', v.laterality || 'Not specified'),
      age !== null ? item('Patient age at diagnosis', `${fmt(age)} months`) : null,
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'INPC & microscopic findings', items: [
      item('Histologic category (INPC / WHO 5th)', histTypeName(v)),
      v.mki && !/Not applicable/i.test(v.mki) ? item('Mitosis-Karyorrhexis Index (MKI)', v.mki) : null,
      item('INPC prognostic group', inpc.group),
      nec !== null ? item('Post-therapy necrosis / regression', `${fmt(nec)}%`) : null,
      item('MYCN amplification', v.mycnStatus || 'Pending / not performed'),
      v.scaStatus && !/Not performed/i.test(v.scaStatus) ? item('Chromosomal aberrations', v.scaStatus) : null,
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: [item('Surgical margins', v.marginStatus || 'Uninvolved by tumour')] },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    ctx?.options?.printPTNM ? { heading: 'INRGSS & INPC classification', items: [
      item('INPC prognostic group', inpc.group),
      inrgCode ? item('INRGSS stage', `${inrgCode} (${v.inrgStage})`) : item('INRGSS stage', 'Cannot be determined')
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
  const inpc = S.inpcPrognostic(v);
  if (inpc.group !== 'Cannot be determined') clauses.push(`INPC ${lc1(inpc.group)}`);
  clauses.push(v.marginStatus || 'Uninvolved by tumour');
  const inrgCode = S.inrgStageCode(v);
  if (ctx?.options?.printPTNM && inrgCode) clauses.push(`INRGSS Stage ${inrgCode}`);
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

export function validate(part) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic category not recorded.', 'histType');
  if (/neuroblastoma/i.test(v.histType || '') && !/ganglioneuroblastoma/i.test(v.histType || '') && num(v.ageMonths) === null) {
    warn('Patient age (months) is needed to derive INPC Favourable vs Unfavourable histology.', 'ageMonths');
  }
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex !== null && inv !== null && inv > ex) err(`Regional lymph nodes: ${inv} involved exceeds ${ex} examined.`, 'nodesInvolved');
  for (const l of S.referenceLines(v)) info(l);
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
