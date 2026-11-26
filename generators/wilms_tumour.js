// Wilms tumour (paediatric) nephrectomy — synoptic report
// (QMH Pedi-Wilms, WHO 5th Paediatric Tumours, COG & SIOP Staging Protocols).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/wilms.js';
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
  return `${uc1(`${lat}kidney`)}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'wilms'); }

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
  if (sz !== null) bits.push(`Bivalving reveals a ${fmt(sz)} mm circumscribed lobulated fleshy grey-tan renal mass with pseudocapsule.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Wilms tumour (nephroblastoma), favourable histology — triphasic / mixed': 'Classic triphasic nephroblastoma recapitulates nephrogenesis, combining sheets of primitive small round blue blastemal cells, differentiating epithelial tubules, rosettes and abortive glomeruloid bodies, and bland spindle-cell mesenchyme. Extensive sampling confirms absence of nuclear anaplasia (neither >= 3x nuclear enlargement nor multipolar mitoses).',
  'Wilms tumour (nephroblastoma), favourable histology — blastemal predominant': 'Diffuse, serpentine and nodular sheets of densely packed primitive small round blue blastemal cells with scant cytoplasm, overlapping oval nuclei and brisk mitotic activity comprise >= 66% of the viable tumour without anaplasia. Confers high-risk status in SIOP post-chemotherapy classification.',
  'Wilms tumour (nephroblastoma), favourable histology — epithelial predominant': 'Well-differentiated primitive tubules, papillary structures, rosettes and abortive glomeruloid bodies predominate (>= 66% of viable tumour) with minimal blastemal or stromal elements and no anaplasia.',
  'Wilms tumour (nephroblastoma), favourable histology — stromal predominant': 'Bland spindle-cell mesenchyme with variable heterologous differentiation (skeletal muscle/rhabdomyogenesis, cartilage, adipose tissue or myxoid stroma) predominates (>= 66% of viable tumour) without anaplasia.',
  'Wilms tumour (nephroblastoma), regressive type (post-chemotherapy SIOP)': 'Post-chemotherapy tumour demonstrates >= 66% therapy-induced coagulative necrosis, fibrosis, haemosiderin-laden and foamy macrophages, with residual viable nephroblastoma elements lacking anaplasia.',
  'Wilms tumour (nephroblastoma), completely necrotic (post-chemotherapy SIOP)': 'Entirely necrotic, fibrotic and hyalinised tumour bed contains no identifiable viable nephroblastoma cells across thorough sampling following preoperative chemotherapy (SIOP low-risk category).',
  'Wilms tumour (nephroblastoma), focal anaplasia (unfavourable histology)': 'A sharply demarcated focus of nuclear enlargement (>= 3x adjacent nuclei), marked hyperchromasia and multipolar polyploid mitotic figures is strictly confined within the primary tumour without nuclear unrest elsewhere or extrarenal/vascular anaplasia.',
  'Wilms tumour (nephroblastoma), diffuse anaplasia (unfavourable histology)': 'Widespread or non-localised nuclear enlargement (>= 3x), severe hyperchromasia and multipolar atypical mitotic figures are present across the tumour, at margins, within vascular spaces or in extrarenal sites, strongly associated with TP53 mutations.',
  'Cystic partially differentiated nephroblastoma': 'Completely circumscribed multilocular cystic renal mass lined by flattened-to-cuboidal epithelium with thin fibrous septa containing small foci of immature nephroblastic blastema and tubules without expansile solid nodules.',
  'Clear cell sarcoma of the kidney (non-Wilms differential)': 'Cords and nests of uniform round-to-oval cells with fine dusty chromatin, inconspicuous nucleoli and pale-to-clear cytoplasm are separated by a regular branching "chicken-wire" arborising fibrovascular capillary network. Typically BCOR-positive (BCOR ITD or YWHAE-NUTM2B/E).',
  'Malignant rhabdoid tumour of the kidney (SMARCB1/INI1-deficient)': 'Diffuse sheets of discohesive polygonal cells with eccentric vesicular nuclei, prominent cherry-red macronucleoli and abundant eosinophilic paranuclear hyaline inclusions infiltrate the renal parenchyma with brisk mitoses and necrosis. Defined by complete loss of nuclear SMARCB1 (INI1) immunostaining.',
  'Other paediatric renal tumour (specify)': 'Paediatric renal neoplasm (such as classic or cellular congenital mesoblastic nephroma) is present.'
};

export function histTypeName(v) {
  const t = v.histType || 'Wilms tumour (nephroblastoma), favourable histology — triphasic / mixed';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify[^)]*\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  let s = `Sections of the kidney show ${lc1(histTypeName(v))}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const nec = num(v.necrosisPct);
  const bla = num(v.blastemaPct);
  const trt = [nec !== null ? `Chemotherapy-induced necrosis accounts for ${fmt(nec)}%` : '', bla !== null ? `viable blastema accounts for ${fmt(bla)}% of viable tumour` : ''].filter(Boolean).join('; ');
  const rest = v.nephrogenicRests && !/Not identified|Cannot/i.test(v.nephrogenicRests) ? `${v.nephrogenicRests} identified in the adjacent renal parenchyma.` : '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, trt ? `${trt}.` : '', rest, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
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
  const w = S.deriveWilmsStage(v);
  const sz = num(v.sizeMm);
  const wt = num(v.weightG);
  const nec = num(v.necrosisPct);
  const bla = num(v.blastemaPct);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Protocol', v.protocol || 'COG (upfront nephrectomy)'),
      item('Procedure', procedureValue(v)),
      item('Laterality', v.laterality || 'Not specified'),
      wt !== null ? item('Specimen weight', `${fmt(wt)} g`) : null,
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic subtype (WHO 5th)', histTypeName(v)),
      nec !== null ? item('Chemotherapy-induced necrosis', `${fmt(nec)}%`) : null,
      bla !== null ? item('Viable blastemal component', `${fmt(bla)}%`) : null,
      item('Nephrogenic rests', v.nephrogenicRests || 'Not identified'),
      item('Local tumour extent', v.extension || 'Not specified'),
      item('Tumour rupture / spillage', v.capsuleRupture || 'Not identified'),
      stripDot(v.molecularStatus) ? item('Molecular / cytogenetics', stripDot(v.molecularStatus)) : null,
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: [item('Surgical margins', v.marginStatus || 'Uninvolved by tumour')] },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM ? { heading: S.edition(v), items: [
      item('Pathological stage', w.stage)
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
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex !== null && ex > 0) clauses.push(`${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`);
  const w = S.deriveWilmsStage(v);
  if (ctx?.options?.printPTNM && w.stage && !/Cannot/i.test(w.stage)) clauses.push(`${w.stage} (${S.edition(v)})`);
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

export function validate(part) {
  const v = part.values;
  const { out, err, at } = checks();
  const info = (m, f) => at('info', m, f);
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic subtype not recorded.', 'histType');
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex !== null && inv !== null && inv > ex) err(`Regional lymph nodes: ${inv} involved exceeds ${ex} examined.`, 'nodesInvolved');
  for (const l of S.referenceLines(v)) info(l);
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
