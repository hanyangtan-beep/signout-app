// Pleural mesothelioma resection — synoptic report
// (QMH Thorax-Mesothelioma, WHO 5th edition, Husain 2024, AJCC 9th edition 2025).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/mesothelioma.js';
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
  return `${uc1(`${lat}pleura`)}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'mesothelioma'); }

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
  const th = num(v.pleuralThicknessMm);
  if (th !== null) bits.push(`The thickened firm tan-white pleural rind measures up to ${fmt(th)} mm in maximum thickness.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Epithelioid mesothelioma': 'Tubulopapillary, trabecular, adenomatoid and solid sheets of polygonal-to-cuboidal mesothelial cells with eosinophilic cytoplasm and round-to-oval nuclei invade into subpleural adipose tissue and fibromuscular wall.',
  'Biphasic mesothelioma': 'Infiltrating malignant mesothelial neoplasm combines distinct epithelioid (tubulopapillary/solid) and malignant spindled sarcomatoid components.',
  'Sarcomatoid mesothelioma': 'Intersecting fascicles and storiform sheets of atypical malignant spindle cells with elongated hyperchromatic nuclei infiltrate subpleural fat and chest wall soft tissues.',
  'Sarcomatoid mesothelioma, desmoplastic': 'Dense paucicellular hyalinised collagenous stroma arranged in a patternless pattern contains atypical spindled mesothelial cells with bland necrosis and fat/skeletal muscle invasion.',
  'Sarcomatoid mesothelioma with heterologous differentiation': 'Malignant sarcomatoid mesothelioma exhibits focal osteosarcomatous, chondrosarcomatous or rhabdomyosarcomatous heterologous elements.',
  'Localised pleural mesothelioma': 'Circumscribed solitary pleural-based malignant mesothelial proliferation shows invasive epithelioid or sarcomatoid morphology without diffuse pleural spread.',
  'Mesothelioma in situ': 'Single-layer flat-to-cuboidal surface mesothelial proliferation displays clonal BAP1/MTAP loss without identifiable stromal invasion.',
  'Well-differentiated papillary mesothelial tumour (WDPMT)': 'Superficial arborising myxoid/fibrous papillae are lined by a single layer of bland cuboidal mesothelial cells without stromal invasion.'
};

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  let s = `Sections of the pleura show ${lc1(v.histType || 'Epithelioid mesothelioma')}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const eg = S.epithelioidGrade(v);
  const gr = eg ? `Two-tier epithelioid nuclear grade is ${lc1(eg.tier)} (${lc1(eg.nuclearGrade)}).` : '';
  const sarc = num(v.sarcomatoidPct);
  const sp = sarc !== null ? `The sarcomatoid component comprises approximately ${fmt(sarc)}% of the tumour.` : '';
  const bm = v.bap1Mtap && v.bap1Mtap !== 'Not performed' ? `Ancillary testing demonstrates ${lc1(v.bap1Mtap)}.` : '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, gr, sp, bm, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function nodeItems(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  const items = [{ label: 'Regional lymph nodes', value: `${inv} of ${ex} involved` }];
  if (inv > 0 && v.nodeStation) items.push({ label: 'Involved station(s)', value: v.nodeStation });
  return items;
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
  const th = num(v.pleuralThicknessMm);
  const eg = S.epithelioidGrade(v);
  const sarc = num(v.sarcomatoidPct);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Laterality', v.laterality || 'Not specified'),
      th !== null ? item('Maximum pleural thickness', `${fmt(th)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', v.histType || 'Epithelioid mesothelioma'),
      eg ? item('Epithelioid 2-tier nuclear grade', `${eg.tier} (${eg.nuclearGrade})`) : null,
      sarc !== null ? item('Sarcomatoid component', `${fmt(sarc)}%`) : null,
      item('Tumour necrosis', v.necrosis || 'Not identified'),
      v.bap1Mtap && v.bap1Mtap !== 'Not performed' ? item('BAP1 / MTAP / CDKN2A status', v.bap1Mtap) : null,
      item('Tumour extent', v.extension || 'Not specified'),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: [item('Surgical margins', v.marginStatus || 'Cannot be assessed')] },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM && !/WDPMT/i.test(v.histType || '') ? { heading: `Pathological stage (${st.edition})`, items: [
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
  const eg = S.epithelioidGrade(v);
  const first = [(v.histType || 'Epithelioid mesothelioma').toUpperCase()];
  if (eg) first.push(lc1(eg.tier));
  const clauses = [first.join(', ')];
  clauses.push(v.marginStatus || 'Cannot be assessed');
  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && !/WDPMT/i.test(v.histType || '') && st.tnm) clauses.push(`${st.tnm} (${st.edition})`);
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic type not recorded.', 'histType');
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
