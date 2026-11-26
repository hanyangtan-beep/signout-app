// Thymic epithelial tumour resection — synoptic report
// (QMH Thorax-Thymus, WHO 5th edition, ITMIG / AJCC 9th edition 2025, Modified Masaoka-Koga).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/thymus.js';
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
  return `Thymus, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'thymus'); }

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
  if (sz !== null) bits.push(`Sectioning reveals a ${fmt(sz)} mm lobulated firm tan-pink tumour divided by fibrous septa.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Thymoma, type A (conventional)': 'Encapsulated or circumscribed lobulated neoplasm composed of bland spindle-to-oval epithelial cells arranged in fascicular, storiform, rosette-like, microcystic or haemangiopericytoma-like vascular patterns with scant or absent immature T lymphocytes. Epithelial nuclei are elongated and normochromatic with finely dispersed chromatin, inconspicuous nucleoli and negligible mitoses; frequently harbours GTF2I p.L424H mutations.',
  'Thymoma, type A (atypical)': 'Spindle-to-polygonal type A thymoma exhibits increased cellularity, mild-to-moderate nuclear atypia, elevated mitotic activity (>= 4/2 mm2) and particularly foci of spontaneous coagulative tumour necrosis. Correlates with advanced stage and metastatic potential.',
  'Thymoma, type AB': 'Biphasic encapsulated lobules combine lymphocyte-poor bland spindle-cell type A areas with lymphocyte-rich type B-like areas containing polygonal epithelial cells and abundant TdT-positive immature T lymphocytes, separated by fibrous septa and rare perivascular spaces.',
  'Thymoma, type B1': 'Organoid, lymphocyte-rich "blue cell" neoplasm divided by broad fibrous bands closely recapitulates normal functional thymus. Abundant TdT-positive immature T lymphocytes obscure sparse scattered bland epithelial cells, featuring pale rounded zones of medullary differentiation (with Hassall corpuscles) and dilated perivascular spaces.',
  'Thymoma, type B2': 'Lobulated, mottled lymphocyte-rich thymoma shows an increased density of polygonal neoplastic epithelial cells forming loose small clusters (3–5 contiguous cells) with large round vesicular nuclei, prominent eosinophilic nucleoli and abundant amphophilic cytoplasm amidst abundant TdT-positive thymocytes and prominent dilated perivascular spaces.',
  'Thymoma, type B3': 'Epithelial-predominant lobules of confluent solid sheets of mildly-to-moderately atypical polygonal epithelial cells with distinct cell membranes, grooved nuclei, small nucleoli and eosinophilic-to-clear cytoplasm impart a "pink" low-power appearance. Accompanied by sparse TdT-positive lymphocytes and prominent perivascular spaces with tumour-cell palisading; negative for CD5 and CD117.',
  'Thymoma, mixed subtype (specify 10% increments)': 'Lobulated thymic epithelial neoplasm displays admixed WHO thymoma subtype patterns (such as B2/B3); report each component in 10% increments.',
  'Micronodular thymoma with lymphoid stroma': 'Multiple small, discrete rounded-to-anastomosing nodules of bland spindle-to-oval epithelial cells (type A-like) are embedded within an abundant mature B-cell lymphoid stroma containing prominent lymphoid follicles with reactive germinal centres.',
  'Metaplastic thymoma': 'Well-circumscribed biphasic neoplasm composed of anastomosing solid islands and broad trabeculae of oval-to-polygonal epithelial cells abruptly juxtaposed with sweeping bundles of bland fibroblast-like spindle cells without immature T lymphocytes, driven by YAP1::MAML2 fusion.',
  'Thymic squamous cell carcinoma': 'Unencapsulated infiltrative lobules, nests and sheets of frankly malignant keratinising or non-keratinising squamous cells with vesicular-to-hyperchromatic nuclei, prominent nucleoli, brisk mitoses and geographic necrosis invade a dense desmoplastic stroma lacking immature thymocytes. Typically positive for CD5, CD117 (c-KIT), FOXN1 and p40.',
  'Thymic basaloid carcinoma': 'Infiltrative nests, cords and lobules of tightly packed uniform small-to-medium basaloid cells exhibit striking peripheral nuclear palisading, central comedonecrosis or cystic degeneration, high nuclear-to-cytoplasmic ratios and brisk mitoses, often arising from multilocular thymic cysts.',
  'Thymic lymphoepithelial carcinoma': 'Syncytial sheets, anastomosing trabeculae and nests of undifferentiated epithelial cells with indistinct borders, large vesicular nuclei and prominent eosinophilic nucleoli infiltrate amidst a dense non-neoplastic lymphoplasmacytic stroma (frequently EBER-positive).',
  'Thymic NUT carcinoma': 'Diffuse sheets of monotonous poorly differentiated round-to-oval cells with vesicular chromatin, brisk mitotic activity and focal abrupt squamous keratinisation infiltrate the anterior mediastinum, confirmed by speckled nuclear NUT immunoreactivity.',
  'Thymic mucoepidermoid carcinoma': 'Infiltrating cystic and solid lobules composed of mucin-producing goblet cells, intermediate cells and epidermoid cells invade the thymus, often harbouring CRTC1::MAML2 rearrangements.',
  'Thymic clear cell carcinoma': 'Nests and sheets of malignant polygonal epithelial cells with abundant optically clear, PAS-positive glycogen-rich cytoplasm infiltrate the anterior mediastinum within a fibrous stroma.',
  'Thymic sarcomatoid carcinoma': 'Biphasic high-grade malignant neoplasm combines a recognisable thymic carcinoma component with pleomorphic spindle-cell sarcomatoid and/or heterologous mesenchymal areas.',
  'Thymic adenocarcinoma (papillary / enteric / adenoid cystic-like / NOS)': 'Infiltrating malignant glandular proliferation with papillary, enteric (CDX2+/CK20+), mucinous or adenoid cystic-like architecture invades the thymus after excluding metastatic adenocarcinoma.',
  'Thymic carcinoma, undifferentiated': 'Diffuse sheets of high-grade pleomorphic malignant epithelial cells with brisk mitoses and extensive necrosis lack squamous, glandular or neuroendocrine differentiation.',
  'Thymic neuroendocrine tumour (typical / atypical carcinoid)': 'Organoid nests, trabeculae, ribbons and rosettes of uniform neuroendocrine cells with coarsely stippled chromatin infiltrate the anterior mediastinum (< 2 mitoses/2 mm2 without necrosis in typical carcinoid; 2–10 mitoses/2 mm2 and/or punctate necrosis in atypical carcinoid).',
  'Thymic neuroendocrine carcinoma (small cell / large cell)': 'Diffuse sheets and organoid nests of high-grade neuroendocrine cells with coarse chromatin, extensive geographic necrosis and > 10 mitoses/2 mm2 infiltrate the thymus.'
};

export function histTypeName(v) {
  const t = v.histType || 'Thymoma, type AB';
  const mix = stripDot(v.mixedBreakdown);
  if (/mixed subtype/i.test(t) && mix) return `Thymoma, mixed (${mix})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  let s = `Sections of the thymus show ${lc1(histTypeName(v))}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
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
  const items = [{ label: 'Regional lymph nodes', value: `${inv} of ${ex} involved` }];
  if (inv > 0 && v.nodeStation) items.push({ label: 'Involved station(s)', value: v.nodeStation });
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
  const sz = num(v.sizeMm);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', histTypeName(v)),
      item('Tumour extent', v.extension || 'Not specified'),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm },
      v.masaokaKoga && v.masaokaKoga !== 'Not applicable' ? item('Modified Masaoka-Koga stage', v.masaokaKoga) : null
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
