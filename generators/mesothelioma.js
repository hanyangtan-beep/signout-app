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
  'Epithelioid mesothelioma': 'Tubulopapillary, trabecular, adenomatoid (microglandular) and solid sheets of polygonal-to-cuboidal mesothelial cells with eosinophilic cytoplasm and round-to-oval nuclei invade subpleural adipose tissue and fibromuscular wall. Delicate fibrovascular cores frequently show myxoid or hyalinised stromal change, while deciduoid or clear-cell variants may occur. WHO 5th edition requires two-tier nuclear grading (nuclear atypia, mitoses and necrosis), predominant architectural pattern documentation (>= 50% solid confers worse prognosis) and BAP1/MTAP/CDKN2A confirmation.',
  'Biphasic mesothelioma': 'Malignant pleural neoplasm combines intimately admixed or distinct epithelioid (tubulopapillary, trabecular or solid) and malignant spindled sarcomatoid components (>= 10% of each in resection specimens, or any unequivocal proportion in small biopsies). Reported with estimated percentages of both components rather than nuclear grading, using pancytokeratin and BAP1/MTAP/CDKN2A to separate true malignant spindling from reactive fibroblasts.',
  'Sarcomatoid mesothelioma': 'Haphazard, fascicular or storiform proliferations of elongated malignant spindle cells infiltrate pleural soft tissues, adipose tissue, chest wall fascia or lung parenchyma without surface-to-deep zonation. Cytology spans from deceptively bland fibroblast-like spindle cells to overtly pleomorphic anaplastic cells with brisk mitoses and geographic coagulative necrosis (transitional sheet-like elongated cells are classified here). Diffuse pancytokeratin positivity with frequent MTAP/CDKN2A loss is typical.',
  'Sarcomatoid mesothelioma, desmoplastic': 'Dense, paucicellular, hyalinised collagenous stroma arranged in a storiform or "patternless" pattern comprises >= 50% of the tumour and separates atypical spindle cells. Diagnosis requires unequivocal stromal/adipose invasion (highlighted by pancytokeratin), bland coagulative necrosis without acute inflammation or frank sarcomatoid cellular nodules, supported by CDKN2A homozygous deletion.',
  'Sarcomatoid mesothelioma with heterologous differentiation': 'Malignant sarcomatoid (or biphasic) mesothelioma exhibits overt malignant mesenchymal heterologous elements, most commonly osteosarcomatous (malignant lace-like osteoid), chondrosarcomatous or rhabdomyosarcomatous differentiation, alongside diffuse pleural spread and cytokeratin-positive mesothelial areas.',
  'Localised pleural mesothelioma': 'Solitary, sharply circumscribed nodular or pedunculated serosal/subserosal pleural mass with complete clinical, radiological and pathological absence of diffuse pleural spread. Histologically and immunophenotypically indistinguishable from diffuse epithelioid, biphasic or sarcomatoid mesothelioma, but carries a markedly better prognosis after complete excision.',
  'Mesothelioma in situ': 'Pre-invasive single flat-to-cuboidal monolayer of bland-to-mildly atypical mesothelial cells lines the pleural surface without stromal invasion, multilayered piling or mass lesion. Definitive diagnosis strictly requires multidisciplinary correlation (non-resolving effusion, no mass) plus clonal loss of nuclear BAP1 or cytoplasmic MTAP and/or CDKN2A homozygous deletion.',
  'Well-differentiated papillary mesothelial tumour (WDPMT)': 'Solitary or multifocal small (< 2 cm) exophytic arborising papillae with thick fibrous or myxoid fibrovascular cores are lined by a single layer of uniform, bland flat-to-cuboidal mesothelial cells with rare-to-absent mitoses. Lacks deep stromal invasion and retains BAP1 and MTAP immunoreactivity.'
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
