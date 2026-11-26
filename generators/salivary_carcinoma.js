// Salivary gland carcinoma resection — synoptic report
// (QMH HN-Salivary gland, CAP Salivary Gland 1.0.0.0, WHO 5th edition, AJCC 9th edition).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/salivary.js';
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
  if (s === 'Other (specify)') return uc1(stripDot(v.siteOther)) || 'Other';
  return s || 'Salivary gland';
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return uc1(typed);
  const lat = v.laterality && !/Not specified/i.test(v.laterality) ? `${v.laterality} ` : '';
  const organ = /parotid/i.test(v.site || '') ? 'parotid gland'
    : (/submandibular/i.test(v.site || '') ? 'submandibular gland'
      : (/sublingual/i.test(v.site || '') ? 'sublingual gland' : 'salivary gland'));
  return `${uc1(`${lat}${organ}`)}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'salivary'); }

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
  if (sz !== null) bits.push(`Serial sectioning reveals a ${fmt(sz)} mm firm tan-white tumour within the ${lc1(siteValue(v))}.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Mucoepidermoid carcinoma': 'Infiltrating cystic and solid lobules composed of varying proportions of mucin-producing goblet cells, intermediate cells and epidermoid cells invade the salivary parenchyma within a fibrous stroma.',
  'Adenoid cystic carcinoma, tubular / cribriform pattern': 'Infiltrating cribriform (' + 'Swiss-cheese) and tubular proliferations of dual basaloid myoepithelial and inner ductal cells contain basophilic mucoid and hyalinised basement membrane-like cylinders with characteristic neurotropism.',
  'Adenoid cystic carcinoma, solid pattern': 'Predominantly solid sheets and lobules of hyperchromatic basaloid cells with elevated mitotic activity, nuclear pleomorphism and focal necrosis infiltrate the salivary gland alongside minor cribriform or tubular foci.',
  'Acinic cell carcinoma': 'Infiltrating solid, microcystic, papillary-cystic or follicular proliferations of serous acinar cells containing basophilic zymogen cytoplasmic granules and uniform round eccentric nuclei replace the salivary parenchyma.',
  'Secretory carcinoma': 'Lobulated microcystic, tubular and papillary-cystic proliferations of uniform cells with abundant eosinophilic vacuolated cytoplasm and intraluminal eosinophilic PAS-positive colloid-like secretions infiltrate the gland.',
  'Polymorphous adenocarcinoma, conventional': 'Architectural diversity comprising lobular, trabecular, tubular, fascicular and concentric targetoid patterns is formed by cytologically uniform cells with pale oval optically clear nuclei.',
  'Polymorphous adenocarcinoma, cribriform subtype': 'Multinodular cribriform and solid lobules separated by fibrous septa are composed of uniform cells with ground-glass optically clear overlapping nuclei and minimal mitotic activity.',
  'Salivary duct carcinoma': 'Infiltrating ductal nests, cribriform Roman-bridge formations and solid sheets of large pleomorphic apocrine cells with abundant eosinophilic cytoplasm, vesicular nuclei, prominent nucleoli and central comedonecrosis invade the salivary gland.',
  'Carcinoma ex pleomorphic adenoma, intracapsular (non-invasive)': 'High-grade malignant epithelial proliferation is entirely confined within the intact fibrous capsule of a pre-existing hyalinised and chondromyxoid pleomorphic adenoma without capsular penetration.',
  'Carcinoma ex pleomorphic adenoma, minimally invasive': 'Malignant epithelial component arising within a pre-existing pleomorphic adenoma breaches the tumour capsule with limited invasive extension into adjacent salivary parenchyma.',
  'Carcinoma ex pleomorphic adenoma, invasive': 'Widely infiltrative malignant carcinoma extends beyond the capsule of a pre-existing hyalinised or chondromyxoid pleomorphic adenoma into surrounding salivary parenchyma and soft tissue.',
  'Epithelial-myoepithelial carcinoma': 'Infiltrating multinodular biphasic tubules are lined by inner cuboidal eosinophilic ductal cells surrounded by an outer mantle of polygonal clear myoepithelial cells.',
  'Hyalinising clear cell carcinoma': 'Infiltrating cords, trabeculae and small nests of glycogen-rich polygonal clear-to-eosinophilic squamous-like cells invade within a densely hyalinised and fibrocellular stroma.',
  'Microsecretory adenocarcinoma': 'Uniformly sized microcysts lined by flattened-to-cuboidal intercalated duct-like cells containing basophilic intraluminal secretions infiltrate within a fibromyxoid stroma.',
  'Intraductal carcinoma': 'Intraductal papillary, cribriform and solid proliferations of intercalated duct-like or apocrine epithelial cells are surrounded by an intact peripheral myoepithelial cell layer.',
  'Basal cell adenocarcinoma': 'Infiltrating solid, trabecular, tubular or membranous nests of dual dark peripheral palisading and paler central basaloid cells invade beyond the capsule into salivary parenchyma and soft tissues.',
  'Myoepithelial carcinoma': 'Multinodular infiltrative sheets and cords of epithelioid, spindled, plasmacytoid or clear malignant myoepithelial cells are set in a myxoid or hyalinised stroma with increased mitotic activity and focal necrosis.',
  'Mucinous adenocarcinoma, NOS': 'Infiltrating glands, clusters and single mucin-producing carcinoma cells float within abundant extracellular mucin pools.',
  'Mucinous adenocarcinoma, intraductal papillary mucinous neoplasia subtype': 'Complex papillary and cystic proliferations lined by tall columnar mucinous epithelium with abundant extracellular mucin exhibit stromal invasion.',
  'Mucinous adenocarcinoma, colloid / signet-ring subtype': 'Pools of extracellular mucin contain floating clusters and individual signet-ring carcinoma cells infiltrating the salivary parenchyma.',
  'Sclerosing microcystic adenocarcinoma': 'Infiltrating bland-appearing microcysts and attenuated tubules lined by dual ductal and myoepithelial cells are embedded in a dense paucicellular sclerotic stroma.',
  'Lymphoepithelial carcinoma': 'Syncytial sheets and irregular islands of undifferentiated epithelial cells with vesicular nuclei and prominent nucleoli infiltrate amidst a dense reactive lymphoplasmacytic stroma.',
  'Sebaceous adenocarcinoma': 'Infiltrating nests and sheets of malignant cells with finely vacuolated sebaceous cytoplasm, nuclear pleomorphism and necrosis invade the salivary gland.',
  'Carcinosarcoma': 'True biphasic malignant neoplasm combines an infiltrating high-grade carcinomatous component with an intimate malignant mesenchymal (chondrosarcomatous, osteosarcomatous or spindle cell) component.',
  'Sialoblastoma': 'Lobulated solid nests of primitive basaloid cells with ductal differentiation, peripheral palisading and variable mitotic activity are separated by fibrous stroma.',
  'Neuroendocrine carcinoma (small cell / large cell)': 'Diffuse sheets and organoid nests of high-grade neuroendocrine cells with coarse chromatin, geographic necrosis and brisk mitotic activity infiltrate the salivary gland.',
  'Carcinoma, type cannot be determined': 'Infiltrating malignant epithelial neoplasm is present without lineage-specific architectural features.',
  'Other histologic type not listed (specify)': 'Infiltrating malignant salivary gland neoplasm is present.'
};

export function histTypeName(v) {
  const t = v.histType || 'Mucoepidermoid carcinoma';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify[^)]*\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const gr = v.grade && !/^Not applicable|GX/.test(v.grade) ? `, ${lc1(v.grade)}` : '';
  let s = `Sections of the salivary gland show ${lc1(histTypeName(v))}${gr}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const invMm = num(v.caExPaInvasionMm);
  const cap = invMm !== null ? `Invasion extends ${fmt(invMm)} mm beyond the pleomorphic adenoma capsule.` : '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, cap, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'Uninvolved by invasive carcinoma';
  const items = [{ label: 'Surgical margins', value: st }];
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
  if (inv > 0) {
    const l = num(v.largestNodeMm);
    if (l !== null) items.push({ label: 'Largest involved lymph node', value: `${fmt(l)} mm` });
    if (v.ene) items.push({ label: 'Extranodal extension (ENE)', value: v.ene });
  }
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
  const invMm = num(v.caExPaInvasionMm);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Tumour site', siteValue(v)),
      item('Laterality', v.laterality || 'Not specified'),
      item('Tumour focality', v.focality || 'Unifocal'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', histTypeName(v)),
      v.grade && v.grade !== 'Not applicable' ? item('Histologic grade', v.grade) : null,
      invMm !== null ? item('Extent of invasion beyond PA capsule', `${fmt(invMm)} mm`) : null,
      item('Extraparenchymal extension', v.extension || 'No evidence of extraparenchymal extension'),
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
  if (v.grade && !/^Not applicable|GX/.test(v.grade)) first.push(lc1(v.grade));
  if (sz !== null) first.push(`${fmt(sz)} mm`);
  const clauses = [first.join(', ')];
  clauses.push(v.marginStatus || 'Uninvolved by invasive carcinoma');
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
