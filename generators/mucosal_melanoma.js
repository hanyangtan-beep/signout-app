// Head and neck mucosal melanoma resection — synoptic report
// (QMH HN-Mucosal Melanoma, CAP Mucosal Melanoma 1.1.0.0, WHO 5th edition, AJCC 8th edition).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/mucosal_melanoma.js';
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

function siteValue(v) {
  const s = v.site || '';
  if (s === 'Other head and neck mucosa (specify)') return uc1(stripDot(v.siteOther)) || 'Head and neck mucosa';
  return s || 'Head and neck mucosa';
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return uc1(typed);
  const lat = v.laterality && !/Not specified|Midline/i.test(v.laterality) ? `${v.laterality} ` : '';
  return `${uc1(`${lat}${lc1(siteValue(v))}`)}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'mucosal_melanoma'); }

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
  const pig = v.pigmentation === 'Amelanotic / not identified' ? 'fleshy tan-grey' : 'darkly pigmented';
  if (sz !== null) bits.push(`Examination reveals a ${fmt(sz)} mm ${pig} mucosal tumour involving the ${lc1(siteValue(v))}.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Mucosal melanoma, not specified': 'Infiltrating sheets, nests and fascicles of pleomorphic epithelioid, spindled, plasmacytoid or small round melanocytes invade the submucosa and underlying bone/cartilage. Tumour cells display large vesicular nuclei, prominent eosinophilic macronucleoli, intranuclear cytoplasmic pseudoinclusions and brisk atypical mitotic activity with frequent ulceration and necrosis. S100, SOX10, Melan-A and HMB45 confirm melanocytic lineage.',
  'Mucosal melanoma, lentiginous': 'Confluent lentiginous proliferation of atypical hyperchromatic melanocytes along the mucosal basal layer with pagetoid upward migration is accompanied by invasive submucosal nests of pleomorphic melanocytes. Frequently demonstrates prominent radial mucosal spread that may extend beyond clinical margins.',
  'Mucosal melanoma, nodular': 'Expansile vertical-growth nodule composed of cohesive sheets of pleomorphic epithelioid and/or spindled melanocytes with prominent eosinophilic nucleoli, frequent mitoses and variable melanin pigmentation invades the submucosa beneath ulcerated mucosa without a prominent radial in situ component.',
  'Mucosal melanoma, desmoplastic': 'Paucicellular-to-moderately cellular fascicles of atypical hyperchromatic spindle cells infiltrate within a dense fibrous collagenous stroma accompanied by patchy lymphoid aggregates and prominent neurotropism. Typically S100 and SOX10 positive while Melan-A and HMB45 are frequently negative.',
  'Mucosal melanoma, other (specify)': 'Infiltrating malignant melanocytic neoplasm involves the head and neck mucosa with destructive submucosal invasion.'
};

export function histTypeName(v) {
  const t = v.histType || 'Mucosal melanoma, not specified';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify[^)]*\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  let s = `Sections show ${lc1(histTypeName(v))}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const pig = v.pigmentation === 'Amelanotic / not identified' ? 'Intracytoplasmic melanin pigment is not identified.' : 'Coarse intracytoplasmic melanin pigment is present.';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, pig, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'Uninvolved by invasive melanoma';
  const items = [{ label: 'Surgical margins (invasive)', value: st }];
  if (v.inSituMargin) items.push({ label: 'Surgical margins (melanoma in situ)', value: v.inSituMargin });
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
  const items = [{ label: 'Regional lymph nodes', value: `${inv} of ${ex} involved` }];
  if (inv > 0 && v.ene) items.push({ label: 'Extranodal extension (ENE)', value: v.ene });
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
  const sz = num(v.sizeMm);
  const extText = arr(v.extension).join('; ') || 'Not specified';

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Tumour site', siteValue(v)),
      item('Laterality', v.laterality || 'Not specified'),
      item('Tumour focality', v.focality || 'Unifocal'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic subtype (WHO 5th)', histTypeName(v)),
      item('Melanin pigmentation', v.pigmentation || 'Present'),
      item('Mucosal ulceration', v.ulceration || 'Present'),
      item('Tumour extent', extText),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
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
  clauses.push(v.marginStatus || 'Uninvolved by invasive melanoma');
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex !== null && ex > 0) clauses.push(`${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`);
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
