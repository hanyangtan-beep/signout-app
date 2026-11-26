// Phaeochromocytoma / paraganglioma resection — synoptic report
// (QMH Endocrine-Pheochromocytoma, WHO 5th edition 2022, RCPath 2024, AJCC 8th Ch. 77).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/pheochromocytoma.js';
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
  const lat = v.laterality && !/Not specified|Midline/i.test(v.laterality) ? `${v.laterality} ` : '';
  const organ = /extra-adrenal/i.test(v.site || '') ? 'paraganglioma' : 'adrenal gland';
  return `${uc1(`${lat}${organ}`)}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'pheochromocytoma'); }

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
  if (sz !== null) bits.push(`Sectioning reveals a ${fmt(sz)} mm well-circumscribed dusky grey-brown haemorrhagic tumour.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Phaeochromocytoma (intra-adrenal paraganglioma)': 'Well-defined alveolar nests (Zellballen) and trabeculae of polygonal chief cells with abundant granular basophilic-to-amphophilic cytoplasm, round-to-oval nuclei with salt-and-pepper chromatin and occasional endocrine atypia are invested by a rich capillary network and peripheral sustentacular cells.',
  'Composite phaeochromocytoma (with ganglioneuroma / neuroblastoma / MPNST)': 'Intra-adrenal phaeochromocytoma with nested Zellballen architecture is intimately admixed with a distinct neurogenic component (ganglioneuroma, ganglioneuroblastoma, neuroblastoma or malignant peripheral nerve sheath tumour).',
  'Sympathetic paraganglioma (extra-adrenal)': 'Extra-adrenal chromaffin paraganglioma forms Zellballen nests and trabeculae of polygonal chief cells with granular amphophilic cytoplasm surrounded by delicate fibrovascular septa and sustentacular cells.',
  'Composite sympathetic paraganglioma': 'Extra-adrenal sympathetic paraganglioma is combined with a distinct ganglioneuromatous or neuroblastic component.',
  'Parasympathetic paraganglioma (head and neck)': 'Lobulated Zellballen nests of uniform polygonal chief cells with amphophilic cytoplasm and low mitotic activity are separated by a rich vascular stroma and S100-positive sustentacular cells.',
  'Other histologic type not listed (specify)': 'Neuroendocrine chromaffin/paraganglionic neoplasm is present.'
};

export function histTypeName(v) {
  const t = v.histType || 'Phaeochromocytoma (intra-adrenal paraganglioma)';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify[^)]*\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  let s = `Sections show ${lc1(histTypeName(v))}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const sdhb = v.sdhbIhc && v.sdhbIhc !== 'Not performed' ? `SDHB immunohistochemistry is ${lc1(v.sdhbIhc)}.` : '';
  const mit = num(v.mitoticRate);
  const ki = num(v.ki67Pct);
  const prol = [mit !== null ? `Mitotic rate is ${fmt(mit)} per 2 mm2` : '', ki !== null ? `Ki-67 labelling index is ${fmt(ki)}%` : ''].filter(Boolean).join('; ');
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, sdhb, prol ? `${prol}.` : '', ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'Uninvolved by tumour';
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
  const mit = num(v.mitoticRate);
  const ki = num(v.ki67Pct);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Tumour site', v.site || 'Adrenal gland (intra-adrenal)'),
      item('Laterality', v.laterality || 'Not specified'),
      item('Tumour focality', v.focality || 'Unifocal'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', histTypeName(v)),
      item('SDHB immunohistochemistry', v.sdhbIhc || 'Not performed'),
      mit !== null ? item('Mitotic rate', `${fmt(mit)} per 2 mm2`) : null,
      ki !== null ? item('Ki-67 labelling index', `${fmt(ki)}%`) : null,
      stripDot(v.riskScore) ? item('Risk stratification score', stripDot(v.riskScore)) : null,
      item('Tumour necrosis', v.necrosis || 'Not identified'),
      item('Vascular invasion', v.lvi || 'Not identified'),
      item('Local invasion', v.extension || 'No extra-adrenal / surrounding tissue invasion'),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM && !S.isParasympatheticPgl(v) ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    { heading: 'Additional findings', items: [
      arr(v.additionalFindings).length ? item('Additional pathologic findings', arr(v.additionalFindings).join('; ')) : null,
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
  if (/Lost/i.test(v.sdhbIhc || '')) clauses.push('SDHB-deficient (recommend genetic counselling / SDHx testing)');
  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && !S.isParasympatheticPgl(v) && st.tnm) clauses.push(`${st.tnm} (${st.edition})`);
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic type not recorded.', 'histType');
  if (/Lost/i.test(v.sdhbIhc || '')) info('SDHB loss indicates likely hereditary SDHx mutation and elevated metastatic risk — consider clinical genetics referral.', 'sdhbIhc');
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
