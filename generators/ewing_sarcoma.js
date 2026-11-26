// Ewing sarcoma (paediatric) resection — synoptic report
// (QMH Pedi-EwingSarcoma, WHO 5th edition, AJCC 8th Bone / Soft Tissue).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/ewing.js';
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
  return `${uc1(stripDot(v.site) || 'Bone / soft tissue')}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'ewing'); }

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
  if (sz !== null) bits.push(`Coronal sectioning reveals a ${fmt(sz)} mm grey-tan necrotic tumour bed centred in ${lc1(stripDot(v.site) || 'the primary site')}.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Ewing sarcoma, classic': 'Monotonous sheets and lobules separated by fibrous septa are composed of uniform small round blue cells with round nuclei, finely dispersed chromatin, inconspicuous nucleoli and scant clear-to-pale PAS-positive glycogen-rich cytoplasm. Occasional Homer Wright pseudorosettes and geographic necrosis with perivascular sparing ("filigree" pattern) are classic, with strong diffuse membranous CD99, nuclear NKX2.2 and FET::ETS rearrangement.',
  'Ewing sarcoma, atypical / large-cell': 'Sheets of larger round-to-oval cells with moderate nuclear pleomorphism, irregular contours, coarser chromatin and prominent nucleoli infiltrate bone or soft tissue while retaining diffuse membranous CD99, NKX2.2 and FET::ETS fusion.',
  'Ewing sarcoma, adamantinoma-like': 'Basaloid nested and palisading round-cell proliferation displays overt epithelial/squamous keratinisation (squamous pearls) and diffuse p40, CK5/6 and pancytokeratin expression alongside CD99, NKX2.2 and FET::ETS rearrangement.',
  'Round cell sarcoma with EWSR1::non-ETS fusion': 'Sheets, nests and cords of uniform round-to-spindle cells in variable fibrous, collagenous or myxoid stroma harbour an EWSR1::non-ETS translocation (such as EWSR1::NFATC2 or EWSR1::PATZ1).',
  'CIC-rearranged sarcoma': 'Lobulated sheets of mildly-to-moderately pleomorphic round-to-epithelioid and focally spindled cells with vesicular nuclei, prominent nucleoli, myxoid stromal change and extensive geographic necrosis infiltrate soft tissue. Typically shows patchy CD99 and diffuse nuclear ETV4 and WT1 expression.',
  'Sarcoma with BCOR genetic alterations': 'Sheets and fascicles of uniform round-to-short spindle cells with fine chromatin and scant-to-moderate cytoplasm within a myxoid, richly vascularised stroma infiltrate bone or soft tissue, characteristically expressing nuclear BCOR, SATB2 and TLE1.'
};

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  let s = `Sections show ${lc1(v.histType || 'Ewing sarcoma, classic')}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const nec = num(v.necrosisPct);
  const trt = nec !== null ? `Treatment-related necrosis accounts for approximately ${fmt(nec)}% of the tumour bed.` : '';
  const fus = v.fusionStatus && !/Pending/i.test(v.fusionStatus) ? `Molecular confirmation: ${v.fusionStatus}.` : '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, trt, fus, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'Uninvolved by sarcoma';
  const items = [{ label: 'Surgical margins', value: st }];
  const d = num(v.closestMarginMm);
  if (d !== null && /uninvolved/i.test(st)) items.push({ label: 'Distance to closest margin', value: `${fmt(d)} mm` });
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
  if (sites.length) return listJoin(sites.map((s, i) => (i ? lc1(s) : s)));
  const m = arr(v.distantMets);
  for (const x of [S.METS.na, S.METS.none, S.METS.cannot]) if (m.includes(x)) return x;
  return '';
}

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const sz = num(v.sizeMm);
  const nec = num(v.necrosisPct);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Primary compartment', v.siteCategory || 'Bone (appendicular / trunk / pelvis)'),
      item('Anatomic site', stripDot(v.site) || 'Not specified'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic & molecular findings', items: [
      item('Histologic type (WHO 5th)', v.histType || 'Ewing sarcoma, classic'),
      item('Molecular fusion status', v.fusionStatus || 'Pending / not performed'),
      nec !== null ? item('Post-neoadjuvant treatment necrosis', `${fmt(nec)}%`) : null,
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
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
  const nec = num(v.necrosisPct);
  const first = [(v.histType || 'Ewing sarcoma, classic').toUpperCase()];
  if (nec !== null) first.push(`${fmt(nec)}% treatment-related necrosis`);
  const clauses = [first.join(', ')];
  clauses.push(v.marginStatus || 'Uninvolved by sarcoma');
  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && st.tnm) clauses.push(`${st.tnm} (${st.edition})`);
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
