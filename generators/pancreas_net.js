// Pancreatic neuroendocrine tumour resection — synoptic report (QMH Endocrine-Pancreas-NET,
// CAP Pancreas Endocrine 5.0.1.0, WHO 5th edition, AJCC 9th edition).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/pancreas_net.js';
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
  return `Pancreas, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'pancreas_net'); }

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
  const site = v.site && v.site !== 'Not specified' ? lc1(v.site) : '';
  if (sz !== null) {
    bits.push(`Sectioning reveals a well-circumscribed ${fmt(sz)} mm tan-yellow fleshy tumour${site ? ` in the ${site}` : ''}.`);
  }
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const GRADE_MORPH = {
  'G1: Well-differentiated neuroendocrine tumour': 'Organoid nested, trabecular and gyriform proliferations of uniform round-to-oval neuroendocrine cells display finely stippled ("salt-and-pepper") chromatin, inconspicuous nucleoli, amphophilic to eosinophilic cytoplasm, minimal nuclear pleomorphism and a rich sinusoidal capillary network.',
  'G2: Well-differentiated neuroendocrine tumour': 'Well-differentiated organoid nests and trabeculae of neuroendocrine cells with stippled ("salt-and-pepper") chromatin exhibit mild-to-moderate nuclear enlargement, focal nucleolar prominence and intermediate proliferative activity (mitotic rate 2–20/2 mm2 or Ki-67 3–20%).',
  'G3: Well-differentiated neuroendocrine tumour': 'Well-differentiated organoid nested and trabecular architecture with neuroendocrine chromatin is preserved despite elevated proliferative activity (mitotic rate > 20/2 mm2 or Ki-67 > 20%), distinguishing PanNET G3 from poorly differentiated neuroendocrine carcinoma.'
};

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const gr = v.grade || 'G1: Well-differentiated neuroendocrine tumour';
  let s = `Sections of the pancreas show a ${lc1(gr)}.`;
  const morph = GRADE_MORPH[gr] || GRADE_MORPH['G1: Well-differentiated neuroendocrine tumour'];
  s += ` ${morph}`;
  if (/insulinoma/i.test(v.functionalType || '')) s += ' Stromal hyalinisation / amyloid deposition may be seen in keeping with an insulin-producing neoplasm.';
  else if (/somatostatinoma/i.test(v.functionalType || '')) s += ' Glandular/pseudoglandular formations and psammoma bodies are characteristic of somatostatin-producing neoplasms.';
  if (stripDot(v.ihcText)) s += ` ${uc1(stripDot(v.ihcText))}.`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'All margins uninvolved by tumour';
  const items = [{ label: 'Surgical margins', value: st }];
  const d = num(v.closestMarginMm);
  if (d !== null && /uninvolved/i.test(st)) {
    items.push({ label: 'Distance to closest margin', value: `${fmt(d)} mm${stripDot(v.closestMarginSite) ? ` (${lc1(stripDot(v.closestMarginSite))})` : ''}` });
  }
  if (/involved/i.test(st) && stripDot(v.involvedMarginDetail)) {
    items.push({ label: 'Involved margin(s)', value: uc1(stripDot(v.involvedMarginDetail)) });
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
    return listJoin(sites.map((s) => (s === S.METS.other ? detail || 'other extrahepatic site' : s)).map((s, i) => (i ? lc1(s) : s)));
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
  const mit = num(v.mitoticCount);
  const ki = num(v.ki67Pct);

  const gradeSub = [];
  if (mit !== null) gradeSub.push({ label: 'Mitotic rate', value: `${fmt(mit)} mitoses / 2 mm2` });
  if (ki !== null) gradeSub.push({ label: 'Ki-67 labelling index', value: `${fmt(ki)}%` });

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Tumour site', v.site || 'Not specified'),
      item('Tumour focality', v.focality || 'Unifocal'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null,
      item('Functional type', v.functionalType || 'Non-functional')
    ] },
    { heading: 'Microscopic findings', items: [
      { label: 'Histologic type and grade (WHO 5th)', value: v.grade || 'Not specified', sub: gradeSub },
      item('Tumour necrosis', v.necrosis || 'Not identified'),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      item('Tumour extension', arr(v.extension).length ? arr(v.extension).join('; ') : S.EXT.limited),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    { heading: 'Additional findings', items: [
      arr(v.additionalFindings).length || stripDot(v.additionalOther)
        ? item('Additional pathologic findings', [...arr(v.additionalFindings), stripDot(v.additionalOther) ? uc1(stripDot(v.additionalOther)) : ''].filter(Boolean).join('; '))
        : null,
      stripDot(v.additionalNotes) ? { label: 'Additional notes', para: `${stripDot(v.additionalNotes)}.` } : null
    ] }
  ].map((s) => (s ? { ...s, items: s.items.filter(Boolean) } : null)).filter((s) => s && s.items.length);

  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

export function molecular(part) {
  const v = part.values;
  const items = [];
  if (v.daxxAtrx && v.daxxAtrx !== 'Not performed') items.push({ label: 'DAXX / ATRX IHC', value: v.daxxAtrx });
  if (v.sstr2 && v.sstr2 !== 'Not performed') items.push({ label: 'SSTR2A IHC', value: v.sstr2 });
  if (stripDot(v.molecularNotes)) items.push({ label: 'Other molecular studies', value: uc1(stripDot(v.molecularNotes)) });
  if (!items.length) return '';
  return renderSynoptic([{ heading: 'Molecular studies', items }], '');
}

function headOf(name) {
  const idx = name.indexOf(',');
  return idx > 0 ? `${name.slice(0, idx).toUpperCase()}${name.slice(idx)}` : name.toUpperCase();
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `${lettered(part, ctx) ? `(${part.label}) ` : ''}${headOf(specimenName(part))}:`;
  const sz = num(v.sizeMm);
  const grShort = (v.grade || 'G1: Well-differentiated neuroendocrine tumour').split(':')[0];
  const first = [`WELL-DIFFERENTIATED PANCREATIC NEUROENDOCRINE TUMOUR, ${grShort}`];
  if (sz !== null) first.push(`${fmt(sz)} mm`);
  const clauses = [first.join(', ')];

  const ki = num(v.ki67Pct);
  const mit = num(v.mitoticCount);
  if (mit !== null || ki !== null) {
    const bits = [];
    if (mit !== null) bits.push(`mitotic rate ${fmt(mit)}/2 mm2`);
    if (ki !== null) bits.push(`Ki-67 index ${fmt(ki)}%`);
    clauses.push(uc1(bits.join(', ')));
  }

  clauses.push(v.marginStatus || 'All margins uninvolved by tumour');

  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex !== null && ex > 0) {
    let np = `${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`;
    if (inv > 0 && v.ene === 'Present') np += '; extranodal extension present';
    clauses.push(np);
  }

  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && st.tnm) clauses.push(`${st.tnm} (${st.edition})`);
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);

  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.grade) err('WHO grade not recorded.', 'grade');

  // WHO 5th mitotic / Ki-67 vs grade consistency:
  const mit = num(v.mitoticCount);
  const ki = num(v.ki67Pct);
  let expected = null;
  if ((mit !== null && mit > 20) || (ki !== null && ki > 20)) expected = 'G3';
  else if ((mit !== null && mit >= 2) || (ki !== null && ki >= 3)) expected = 'G2';
  else if (mit !== null || ki !== null) expected = 'G1';
  if (expected && v.grade && /^G[123]\b/.test(v.grade) && !v.grade.startsWith(expected)) {
    warn(`Recorded mitotic rate / Ki-67 corresponds to ${expected}, but selected grade is ${v.grade.split(':')[0]}.`, 'grade');
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

export default { specimenName, specimens, macro, blockKey, synoptic, molecular, diagnosis, validate, staging };
