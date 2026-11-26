// Paediatric rhabdomyosarcoma resection — synoptic report
// (QMH Pedi-Rhadomyosarcoma, WHO 5th edition, COG / IRS Clinical Group & Site-Based TNM).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/rhabdomyosarcoma.js';
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
  return `${uc1(stripDot(v.site) || 'Soft tissue')}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'rhabdomyosarcoma'); }

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
  if (sz !== null) bits.push(`Sectioning reveals a ${fmt(sz)} mm fleshy tan-white myxoid-to-firm tumour.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Embryonal rhabdomyosarcoma, conventional': 'Alternating hypercellular and hypocellular myxoid zones of primitive round-to-spindle mesenchymal cells with scattered differentiating eosinophilic rhabdomyoblasts (strap cells with cross-striations) infiltrate soft tissue.',
  'Embryonal rhabdomyosarcoma, botryoid': 'Polypoid grape-like mucosal projections show a dense subepithelial cambium layer of primitive rhabdomyoblasts overlying a hypocellular myxoid core.',
  'Embryonal rhabdomyosarcoma with anaplasia': 'Embryonal rhabdomyosarcoma displays enlarged hyperchromatic pleomorphic nuclei (>= 3x adjacent nuclei) and atypical multipolar mitotic figures.',
  'Alveolar rhabdomyosarcoma, FOXO1 fusion-positive': 'Fibrovascular septa divide discohesive nests of monotonous primitive small round blue cells with central alveolar loss of cohesion, occasional multinucleated wreath-like giant cells and diffuse myogenin expression.',
  'Alveolar rhabdomyosarcoma, FOXO1 fusion-negative': 'Alveolar/solid nested small round cell rhabdomyosarcoma lacks FOXO1 gene rearrangement on molecular testing.',
  'Spindle cell / sclerosing rhabdomyosarcoma (MYOD1-mutant / VGLL2-NCOA2 / NOS)': 'Intersecting fascicles of atypical elongated eosinophilic spindle cells and/or pseudovascular cords embedded in a densely hyalinised sclerotic stroma show strong diffuse MYOD1 expression.',
  'Pleomorphic rhabdomyosarcoma': 'Disorganised sheets of markedly pleomorphic large polygonal, spindled and bizarre multinucleated eosinophilic rhabdomyoblasts invade skeletal muscle.',
  'Rhabdomyosarcoma with TFCP2 rearrangement (intraosseous / epithelioid)': 'Sheets of epithelioid and spindled rhabdomyoblastic cells with strong keratin, ALK and myogenic marker expression infiltrate bone and adjacent soft tissue.'
};

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  let s = `Sections show ${lc1(v.histType || 'Embryonal rhabdomyosarcoma, conventional')}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const mol = v.molecularStatus && !/Pending/i.test(v.molecularStatus) ? `Molecular testing: ${v.molecularStatus}.` : '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, mol, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
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

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('COG site group', v.siteGroup || ''),
      item('Anatomic site', stripDot(v.site) || 'Not specified'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic & molecular findings', items: [
      item('Histologic type (WHO 5th)', v.histType || 'Embryonal rhabdomyosarcoma, conventional'),
      item('Molecular status', v.molecularStatus || 'Pending / not performed'),
      item('Anaplasia', v.anaplasia || 'Not identified'),
      item('Local invasiveness', v.extension || 'Confined to anatomic site of origin (T1)'),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM ? { heading: S.edition, items: [
      item('pTNM', st.tnm),
      st.stage ? item('COG pretreatment stage', `Stage ${st.stage}`) : null,
      v.irsGroup && !/Cannot/i.test(v.irsGroup) ? item('IRS Clinical Group', v.irsGroup) : null
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
  const first = [(v.histType || 'Embryonal rhabdomyosarcoma, conventional').toUpperCase()];
  if (sz !== null) first.push(`${fmt(sz)} mm`);
  const clauses = [first.join(', ')];
  clauses.push(v.marginStatus || 'Uninvolved by sarcoma');
  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && st.stage) clauses.push(`COG Stage ${st.stage}`);
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, at } = checks();
  const info = (m, f) => at('info', m, f);
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic type not recorded.', 'histType');
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex !== null && inv !== null && inv > ex) err(`Regional lymph nodes: ${inv} involved exceeds ${ex} examined.`, 'nodesInvolved');
  const st = staging(part, ctx);
  for (const l of S.referenceLines(v, st)) info(l);
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
