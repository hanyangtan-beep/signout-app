// Cutaneous melanoma excision — synoptic report
// (QMH Skin-Melanoma, WHO 5th edition Skin Tumours, AJCC 8th edition).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/melanoma.js';
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
  const site = stripDot(v.site) || 'skin';
  return `Skin (${lc1(site)}), ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'melanoma'); }

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
  const bits = [`${tag}Received in formalin is a skin ${proc} ellipse${dims ? ` measuring ${dims}` : ''}.`];
  const sz = num(v.lesionSizeMm);
  if (sz !== null) bits.push(`The epidermal surface bears an asymmetric variegated pigmented lesion measuring ${fmt(sz)} mm.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Superficial spreading melanoma (low-CSD melanoma)': 'Asymmetric intraepidermal proliferation of atypical epithelioid melanocytes displays prominent pagetoid upward scatter across all epidermal layers, confluent irregular junctional nests and dermal invasion lacking deep maturation. Dermal tumour cells show pleomorphic vesicular nuclei, prominent eosinophilic nucleoli, dusty melanin pigment and dermal mitotic figures, often with a lymphocytic host response.',
  'Lentigo maligna melanoma (high-CSD melanoma)': 'Confluent lentiginous proliferation of atypical hyperchromatic melanocytes along an effaced, atrophic epidermis over marked solar elastosis extends down hair follicles and sweat ducts, accompanied by invasive dermal nests or spindle cells.',
  'Desmoplastic melanoma, pure': 'Paucicellular fascicles of atypical hyperchromatic spindle cells infiltrate within a dense fibrous collagenous dermis (>= 90% desmoplastic) accompanied by nodular lymphoid aggregates and frequent neurotropism. Typically S100 and SOX10 positive while Melan-A and HMB45 are negative.',
  'Desmoplastic melanoma, mixed': 'Desmoplastic spindle-cell melanoma in collagenous stroma is admixed with >= 10% non-desmoplastic cellular epithelioid or spindled melanoma.',
  'Nodular melanoma': 'Expansile vertical-growth dermal nodule composed of cohesive sheets of pleomorphic epithelioid or spindled melanocytes with prominent nucleoli, brisk dermal mitoses and frequent ulceration lacks an adjacent radial-growth in situ component beyond three rete ridges.',
  'Acral lentiginous melanoma': 'Broad confluent lentiginous proliferation of atypical dendritic and epithelioid melanocytes along hyperplastic acral skin with compact hyperkeratosis and marked pagetoid scatter invades the underlying dermis.',
  'Spitz melanoma (malignant Spitz tumour)': 'Large epithelioid and/or spindled Spitzoid melanocytes with abundant eosinophilic ground-glass cytoplasm exhibit marked nuclear pleomorphism, deep dermal mitoses, asymmetry, epidermal consumption and lack of maturation with depth.',
  'Melanoma arising in a blue naevus': 'Expansile sheets of pleomorphic epithelioid or spindled malignant melanocytes with coagulative necrosis and brisk mitotic activity arise abruptly within a pre-existing cellular blue naevus.',
  'Melanoma arising in a giant congenital naevus': 'Proliferative sheets of high-grade atypical melanocytes with brisk mitotic activity and necrosis arise within a pre-existing congenital melanocytic naevus.',
  'Nevoid melanoma': 'Deceptively symmetrical verrucous or dome-shaped dermal proliferation of small-to-medium monomorphic melanocytes exhibits incomplete maturation, subtle nuclear atypia, deep dermal mitoses and loss of p16 or HMB45 gradient.',
  'Melanoma in situ': 'Confluent lentiginous and pagetoid intraepidermal proliferation of atypical melanocytes is confined strictly above the epidermal basement membrane without dermal invasion.',
  'Melanoma, not otherwise specified': 'Invasive proliferation of atypical pleomorphic melanocytes infiltrates the dermis without maturation with depth.',
  'Other histologic subtype not listed (specify)': 'Cutaneous malignant melanoma is present with atypical melanocytic proliferation.'
};

export function histTypeName(v) {
  const t = v.histType || 'Superficial spreading melanoma (low-CSD melanoma)';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify[^)]*\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  let s = `Sections of the skin show ${lc1(histTypeName(v))}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const br = num(v.breslowMm);
  const mr = num(v.mitoticRate);
  const micro = [br !== null ? `Breslow thickness is ${fmt(br)} mm` : '', mr !== null ? `dermal mitotic rate is ${fmt(mr)}/mm2` : ''].filter(Boolean).join('; ');
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, micro ? `${micro}.` : '', ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function nodeItems(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  const items = [{ label: 'Regional lymph nodes', value: `${inv} of ${ex} involved` }];
  if (inv > 0 && v.nodeDetection) items.push({ label: 'Nodal detection', value: v.nodeDetection });
  return items;
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
  const br = num(v.breslowMm);
  const mr = num(v.mitoticRate);
  const pm = num(v.closestPeripheralMm);
  const dm = num(v.closestDeepMm);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Anatomic site', stripDot(v.site) || 'Not specified')
    ] },
    { heading: 'Microstaging and histology', items: [
      item('Histologic subtype (WHO 5th)', histTypeName(v)),
      br !== null ? item('Breslow thickness', `${fmt(br)} mm`) : null,
      item('Ulceration', v.ulceration || 'Not identified'),
      item('Clark anatomic level', v.clarkLevel || 'Cannot be determined'),
      mr !== null ? item('Dermal mitotic rate', `${fmt(mr)} per mm2`) : null,
      item('Microsatellites / satellites / in-transit metastases', v.microsatellites || 'Not identified'),
      item('Tumour-infiltrating lymphocytes (TILs)', v.tils || 'Cannot be determined'),
      item('Tumour regression', v.regression || 'Not identified'),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Neurotropism / perineural invasion', v.pni || 'Not identified'),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: [
      item('Peripheral margins (invasive)', `${v.peripheralMargin || 'Uninvolved by invasive melanoma'}${pm !== null && /uninvolved/i.test(v.peripheralMargin || '') ? ` (closest ${fmt(pm)} mm)` : ''}`),
      item('Peripheral margins (in situ)', v.inSituMargin || 'Uninvolved by melanoma in situ'),
      item('Deep margin', `${v.deepMargin || 'Uninvolved by invasive melanoma'}${dm !== null && /uninvolved/i.test(v.deepMargin || '') ? ` (closest ${fmt(dm)} mm)` : ''}`)
    ] },
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
  const br = num(v.breslowMm);
  const first = [histTypeName(v).toUpperCase()];
  if (br !== null) first.push(`Breslow thickness ${fmt(br)} mm`);
  first.push(/^Present/i.test(v.ulceration || '') ? 'ulcerated' : 'non-ulcerated');
  const clauses = [first.join(', ')];
  const anyInv = [v.peripheralMargin, v.deepMargin].some((m) => /^Involved/i.test(m || ''));
  clauses.push(anyInv ? 'Surgical margin(s) involved by invasive melanoma' : 'Surgical margins uninvolved by invasive melanoma');
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
