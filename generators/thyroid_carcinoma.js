// Thyroid carcinoma resection — synoptic report (QMH Endocrine-Thyroid, CAP Thyroid 4.4.0.0,
// WHO 5th edition 2022, AJCC 8th edition).
//
// Sources:
//   QMH Cancer Reporting Template Endocrine-Thyroid:
//     https://awiloqmh.github.io/CancerReportingTemplate/Endocrine-Thyroid.html
//     (saved as docs/reference/Endocrine-Thyroid.html; text dump in docs/reference/qmh/thyroid.txt)
//   CAP Protocol for the Examination of Specimens From Patients With Carcinomas of the Thyroid Gland,
//     v4.4.0.0 (March 2023)
//   WHO Classification of Endocrine and Neuroendocrine Tumours, 5th edition (2022):
//     - Follicular cell-derived neoplasms divided into benign, low-risk (NIFTP, FT-UMP, WDT-UMP, HTT)
//       and malignant; papillary microcarcinoma is no longer a separate subtype.
//     - Invasive encapsulated follicular variant PTC (IEFVPTC) is a distinct entity.
//     - Oncocytic carcinoma replaces Hurthle cell carcinoma.
//     - High-grade follicular cell-derived non-anaplastic thyroid carcinoma encompasses DHGTC
//       (>= 5 mitoses/2 mm² and/or tumour necrosis) and PDTC (Turin criteria).
//     - Squamous cell carcinoma of the thyroid is classified as a subtype of anaplastic carcinoma.
//     - Cribriform-morular thyroid carcinoma is a distinct entity of uncertain histogenesis.
//     - Medullary thyroid carcinoma uses the two-tier IMTCGS (high grade: >= 5 mitoses/2 mm²,
//       tumour necrosis, or Ki-67 >= 5%).
//   Staging: src/staging/thyroid.js (AJCC 8th edition, Chapters 73 & 74). Stage group shows in
//     Checks only, never printed.

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/thyroid.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { stripDot, letteredBlockKey, checks } from './_house.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const lcw = (s) => (/^[A-Z]{2,}/.test(s || '') ? s : lc1(s));
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const article = (w) => (/^[aeiou]/i.test(w || '') ? 'an' : 'a');
const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// ---------- procedures & specimen ----------

export const PROC = {
  total: 'Total thyroidectomy',
  rHemi: 'Right lobectomy with isthmusectomy (hemithyroidectomy)',
  lHemi: 'Left lobectomy with isthmusectomy (hemithyroidectomy)',
  rLobe: 'Right lobectomy',
  lLobe: 'Left lobectomy',
  rSubtotal: 'Right lobe with partial left lobectomy (subtotal or near-total thyroidectomy)',
  lSubtotal: 'Left lobe with partial right lobectomy (subtotal or near-total thyroidectomy)',
  isthmus: 'Isthmusectomy',
  completion: 'Completion thyroidectomy (reoperative)',
  rPartial: 'Right partial excision',
  lPartial: 'Left partial excision',
  partialOther: 'Partial excision (specify)',
  other: 'Other (specify)'
};

const SPECIMEN_BY_PROC = {
  [PROC.total]: 'Thyroid, total thyroidectomy',
  [PROC.rHemi]: 'Thyroid, right lobe and isthmus, hemithyroidectomy',
  [PROC.lHemi]: 'Thyroid, left lobe and isthmus, hemithyroidectomy',
  [PROC.rLobe]: 'Right thyroid lobe, lobectomy',
  [PROC.lLobe]: 'Left thyroid lobe, lobectomy',
  [PROC.rSubtotal]: 'Thyroid, subtotal thyroidectomy',
  [PROC.lSubtotal]: 'Thyroid, subtotal thyroidectomy',
  [PROC.isthmus]: 'Thyroid isthmus, isthmusectomy',
  [PROC.completion]: 'Thyroid, completion thyroidectomy',
  [PROC.rPartial]: 'Right thyroid lobe, partial excision',
  [PROC.lPartial]: 'Left thyroid lobe, partial excision'
};

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return uc1(typed);
  const p = v.procedure || '';
  if (SPECIMEN_BY_PROC[p]) return SPECIMEN_BY_PROC[p];
  if (p === PROC.partialOther || p === PROC.other) {
    return `Thyroid, ${lcw(stripDot(v.procedureOther)) || 'resection'}`;
  }
  return 'Thyroid, resection';
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'thyroid'); }

// ---------- site ----------

export function siteList(v) {
  return arr(v.tumourSite)
    .filter((s) => s !== 'Not specified')
    .map((s) => (s === 'Other (specify)' ? stripDot(v.tumourSiteOther) : s))
    .filter(Boolean);
}

export function siteValue(v) {
  const sites = arr(v.tumourSite);
  if (!sites.length) return '';
  if (sites.includes('Not specified')) return 'Not specified';
  return sites.map((s) => (s === 'Other (specify)' ? uc1(stripDot(v.tumourSiteOther)) || 'Other' : s)).join('; ');
}

function sitePhrase(v) {
  const s = siteList(v).map((x) => lc1(x));
  return s.length ? ` in the ${listJoin(s)}` : '';
}

// ---------- macro ----------

const MACRO_NOUN = {
  [PROC.total]: 'total thyroidectomy',
  [PROC.rHemi]: 'right hemithyroidectomy',
  [PROC.lHemi]: 'left hemithyroidectomy',
  [PROC.rLobe]: 'right thyroid lobectomy',
  [PROC.lLobe]: 'left thyroid lobectomy',
  [PROC.rSubtotal]: 'subtotal thyroidectomy',
  [PROC.lSubtotal]: 'subtotal thyroidectomy',
  [PROC.isthmus]: 'isthmusectomy',
  [PROC.completion]: 'completion thyroidectomy',
  [PROC.rPartial]: 'right thyroid partial excision',
  [PROC.lPartial]: 'left thyroid partial excision'
};

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
  const noun = MACRO_NOUN[v.procedure] || (stripDot(v.procedureOther) && lc1(stripDot(v.procedureOther))) || 'thyroid resection';
  const measures = [];
  const w = num(v.weight);
  if (w !== null) measures.push(`weighing ${fmt(w)} g`);
  const dims = sizeText(v.specimenDims, 'cm');
  if (dims) measures.push(`measuring ${dims}`);
  const bits = [`${tag}Received in formalin is ${article(noun)} ${noun} specimen${measures.length ? ` ${listJoin(measures)}` : ''}.`];

  if (v.capsule === 'Focally disrupted') bits.push('The thyroid capsule is focally disrupted.');
  else if (v.capsule === 'Grossly breached by tumour') bits.push('The thyroid capsule is grossly breached by tumour.');
  else if (v.capsule) bits.push('The thyroid capsule is intact.');

  const app = v.lesionAppearance || '';
  if (app === 'No discrete macroscopic lesion') {
    bits.push('Sectioning shows no discrete macroscopic lesion.');
  } else if (app) {
    const ld = stripDot(v.tumourDims) ? sizeText(v.tumourDims, 'mm') : (num(v.tumourSizeMm) !== null ? `${fmt(num(v.tumourSizeMm))} mm` : '');
    bits.push(`Sectioning shows ${article(app)} ${lc1(app)}${sitePhrase(v)}${ld ? ` measuring ${ld}` : ''}.`);
  }

  if (v.background === 'Nodular') bits.push('The background parenchyma is nodular.');
  else if (/thyroiditis/i.test(v.background || '')) bits.push('The background parenchyma is pale and firm.');
  else if (v.background) bits.push('The background parenchyma is unremarkable.');

  const b = int(v.blocks);
  if (b) bits.push(`Representative sections are taken in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

// ---------- histologic type & morphology ----------

const SPECIFY_RE = /\s*\(specify(?:\s+subtype)?\)$/;

export function histTypeName(v) {
  const t = v.histType || '';
  if (!t) return 'Histologic type not specified';
  const extra = stripDot(v.histTypeOther);
  if (SPECIFY_RE.test(t)) {
    const base = t.replace(SPECIFY_RE, '');
    return extra ? `${base} (${extra})` : base;
  }
  if (t === 'Malignant thyroid neoplasm, type cannot be determined' && extra) {
    return `${t} (${lc1(extra)})`;
  }
  return t;
}

const isPTC = (t) => /^Papillary carcinoma\b/.test(t);
const isIEFVPTC = (t) => /follicular variant papillary/i.test(t) && !/^High-grade\b/.test(t) && !/^Mixed\b/.test(t);
const isFTC = (t) => /follicular carcinoma$/i.test(t) && !/^High-grade\b/.test(t) && !/^Mixed\b/.test(t);
const isOncocytic = (t) => /oncocytic carcinoma/i.test(t) && !/^High-grade\b/.test(t);
const isDHGTC = (t) => /^High-grade\b/.test(t);
const isDifferentiatedLowGrade = (t) => isPTC(t) || isIEFVPTC(t) || isFTC(t) || isOncocytic(t);

const TYPE_MORPH = {
  'Papillary carcinoma, classic subtype': 'Complex branching papillae with fibrovascular cores are lined by follicular cells with enlarged, elongated, overlapping optically clear nuclei, nuclear grooves and intranuclear pseudoinclusions.',
  'Papillary carcinoma, encapsulated classic subtype': 'An encapsulated tumour composed of papillae with fibrovascular cores shows characteristic papillary carcinoma nuclear features.',
  'Papillary carcinoma, oncocytic classic subtype': 'Papillae with fibrovascular cores are lined by oncocytic cells with abundant granular eosinophilic cytoplasm and nuclear features of papillary carcinoma.',
  'Papillary carcinoma, infiltrative follicular subtype': 'Infiltrating follicles lined by cells with nuclear enlargement, clearing, grooves and intranuclear pseudoinclusions invade the surrounding thyroid parenchyma without a complete capsule.',
  'Papillary carcinoma, tall cell subtype': 'Elongated follicles and papillae are lined by tall columnar cells whose height is at least three times their width, with abundant eosinophilic cytoplasm and classic papillary carcinoma nuclear features.',
  'Papillary carcinoma, hobnail subtype': 'Papillary and micropapillary structures are lined by cells with apically placed nuclei producing a hobnail appearance and eosinophilic cytoplasm.',
  'Papillary carcinoma, columnar cell subtype': 'Papillae and elongated follicles are lined by stratified columnar cells with elongated, hyperchromatic nuclei and supranuclear or subnuclear cytoplasmic vacuoles.',
  'Papillary carcinoma, clear cell subtype': 'Papillae and follicles are lined by tumour cells with abundant clear cytoplasm and nuclear features of papillary carcinoma.',
  'Papillary carcinoma, spindle cell subtype': 'Papillary carcinoma is accompanied by a prominent component of elongated spindle-shaped follicular cells with papillary carcinoma nuclear features.',
  'Papillary carcinoma, solid subtype': 'Solid sheets, nests and trabeculae of tumour cells separated by thin fibrous septa show characteristic papillary carcinoma nuclear features without tumour necrosis or elevated mitotic activity.',
  'Papillary carcinoma, diffuse sclerosing subtype': 'Diffuse involvement of the thyroid shows dense sclerosis, abundant psammoma bodies, extensive squamous metaplasia, chronic lymphocytic thyroiditis and widespread lymphatic invasion.',
  'Papillary carcinoma with fibromatosis / fasciitis-like / desmoid-type stroma': 'Papillary thyroid carcinoma is embedded in an abundant, cellular myofibroblastic spindle cell stroma resembling fibromatosis.',
  'Papillary carcinoma, Warthin-like subtype': 'Papillae with fibrovascular cores containing a dense lymphoplasmacytic infiltrate are lined by oncocytic cells showing nuclear features of papillary carcinoma.',
  'Cribriform-morular thyroid carcinoma': 'A well-circumscribed tumour shows cribriform, follicular, papillary and trabecular architecture with characteristic squamous morules.',
  'Medullary thyroid carcinoma': 'Nests, sheets and trabeculae of polygonal to spindle-shaped parafollicular cells with finely granular salt-and-pepper chromatin lie in a fibrous stroma with amyloid deposition.',
  'Anaplastic thyroid carcinoma, NOS': 'Sheets and fascicles of highly pleomorphic epithelioid, giant and spindle cells show marked nuclear atypia, frequent mitoses and extensive tumour necrosis.',
  'Anaplastic thyroid carcinoma, squamous cell carcinoma pattern': 'Infiltrating sheets and nests of markedly atypical keratinising and non-keratinising squamous cells show frequent mitoses and necrosis.',
  'Poorly differentiated thyroid carcinoma, NOS': 'Solid, trabecular and insular nests of uniform small follicular cells with convoluted nuclei lack conventional papillary carcinoma nuclear features and show mitotic activity and/or necrosis.',
  'Oncocytic poorly differentiated thyroid carcinoma': 'Solid, trabecular and insular nests of oncocytic cells with abundant granular eosinophilic cytoplasm show elevated mitotic activity and/or tumour necrosis.'
};

function typeMorphology(v) {
  const t = v.histType || '';
  if (TYPE_MORPH[t]) return TYPE_MORPH[t];
  if (isPTC(t)) return 'The tumour shows papillary and follicular architecture lined by cells with characteristic nuclear features of papillary thyroid carcinoma.';
  if (isIEFVPTC(t)) return 'An encapsulated follicular-patterned tumour lined by cells with papillary-like nuclear features shows capsular and/or vascular invasion.';
  if (isFTC(t)) return 'A follicular-patterned neoplasm lacking papillary-like nuclear features shows capsular and/or vascular invasion.';
  if (isOncocytic(t)) return 'A follicular-patterned neoplasm composed predominantly of oncocytic cells with abundant granular eosinophilic cytoplasm shows capsular and/or vascular invasion.';
  if (isDHGTC(t)) return 'The tumour retains differentiated follicular cell-derived architecture and cytological features with high-grade features (elevated mitotic activity and/or tumour necrosis).';
  if (S.isAnaplastic(v)) return 'Sheets of highly pleomorphic undifferentiated tumour cells show marked atypia, brisk mitotic activity and necrosis.';
  if (S.isMedullary(v)) return 'Nests and sheets of neuroendocrine-type tumour cells with stippled chromatin are present.';
  return '';
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const what = lc1(histTypeName(v));
  const where = sitePhrase(v);
  let s = `Sections of the thyroid show ${what}${where}.`;
  const morph = typeMorphology(v);
  const ihc = stripDot(v.ihcOther);
  for (const x of [morph, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

// ---------- microscopic & margin elements ----------

function procedureValue(v) {
  const p = v.procedure || '';
  if (!p) return 'Not specified';
  if (p === PROC.partialOther) return `Partial excision (${stripDot(v.procedureOther) || 'not specified'})`;
  if (p === PROC.other) return uc1(stripDot(v.procedureOther)) || 'Other';
  return p;
}

function focalityValue(v) {
  const f = v.tumourFocality || '';
  if (f === 'Multifocal' && stripDot(v.tumourFociCount)) return `Multifocal (${stripDot(v.tumourFociCount)})`;
  return f;
}

function sizeItem(v) {
  const n = num(v.tumourSizeMm);
  const dims = stripDot(v.tumourDims);
  const mm = (s) => `${s}${/mm$/.test(s) ? '' : ' mm'}`;
  if (n !== null) {
    return {
      label: 'Tumour size',
      value: `${v.sizeAtLeast === true ? 'At least ' : ''}${fmt(n)} mm (greatest dimension)`,
      sub: dims ? [{ label: 'All dimensions', value: mm(dims) }] : []
    };
  }
  if (stripDot(v.sizeReason)) return { label: 'Tumour size', value: `Cannot be determined (${lc1(stripDot(v.sizeReason))})` };
  if (dims) return { label: 'Tumour size', value: mm(dims) };
  return null;
}

function mitoticValue(v) {
  const m = v.mitoticCount || '';
  if (!m) return '';
  const exact = int(v.mitoticExact);
  if (m !== 'Cannot be determined' && exact !== null) return `${m} (${exact} per 2 mm²)`;
  return m;
}

function necrosisValue(v) {
  const n = v.necrosis || '';
  if (!n) return '';
  const d = stripDot(v.necrosisDetail);
  return n !== 'Not identified' && d ? `${n} (${lc1(d)})` : n;
}

function marginValue(v) {
  const st = v.marginStatus || 'Uninvolved by carcinoma';
  const site = stripDot(v.marginSite);
  const d = num(v.marginMm);
  if (st === 'Involved by carcinoma') return `Involved by carcinoma${site ? ` (${site})` : ''}`;
  if (st === 'Cannot be assessed') return `Cannot be assessed${site ? ` (${lcw(site)})` : ''}`;
  const bits = [site, d !== null ? `${fmt(d)} mm` : ''].filter(Boolean);
  return bits.length ? `Uninvolved by carcinoma (${bits.join(', ')})` : 'Uninvolved by carcinoma';
}

// ---------- lymph nodes & metastasis ----------

export function nodeItems(v) {
  const c = S.nodeCounts(v);
  if (c.totalExamined === 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  const items = [];
  if (c.centralExamined > 0) {
    const site = stripDot(v.centralSites);
    items.push({
      label: 'Central compartment (level VI / VII)',
      value: `${c.centralInvolved} of ${c.centralExamined} involved${site ? ` (${site})` : ''}`
    });
  }
  if (c.lateralExamined > 0) {
    const site = stripDot(v.lateralSites);
    items.push({
      label: 'Lateral neck / retropharyngeal (levels I–V)',
      value: `${c.lateralInvolved} of ${c.lateralExamined} involved${site ? ` (${site})` : ''}`
    });
  }
  if (c.otherExamined > 0) {
    const site = stripDot(v.otherNodesSites);
    items.push({
      label: site ? `Other regional lymph nodes (${site})` : 'Other regional lymph nodes',
      value: `${c.otherInvolved} of ${c.otherExamined} involved`
    });
  }
  if (c.totalInvolved > 0) {
    if (v.ene) items.push({ label: 'Extranodal extension (ENE)', value: v.ene });
    const dep = num(v.largestDepositMm);
    if (dep !== null) {
      const ds = stripDot(v.largestDepositSite);
      items.push({ label: 'Size of largest metastatic deposit', value: `${fmt(dep)} mm${ds ? ` (${ds})` : ''}` });
    }
    const ln = num(v.largestNodeMm);
    if (ln !== null) {
      const ls = stripDot(v.largestNodeSite);
      items.push({ label: 'Size of largest involved lymph node', value: `${fmt(ln)} mm${ls ? ` (${ls})` : ''}` });
    }
  }
  return items;
}

export function nodesPhrase(v) {
  const c = S.nodeCounts(v);
  if (c.totalExamined === 0) return '';
  const bits = [];
  if (c.centralExamined > 0) bits.push(`${c.centralInvolved} of ${c.centralExamined} central compartment`);
  if (c.lateralExamined > 0) bits.push(`${c.lateralInvolved} of ${c.lateralExamined} lateral neck`);
  if (c.otherExamined > 0) bits.push(`${c.otherInvolved} of ${c.otherExamined} regional`);
  const one = bits.length === 1 && c.totalExamined === 1;
  let s = `${listJoin(bits)} lymph node${one ? '' : 's'} involved`;
  if (c.totalInvolved > 0 && v.ene === 'Present') s += '; extranodal extension present';
  return s;
}

export function metastasisValue(v) {
  const sites = S.m1Sites(v);
  if (sites.length) {
    return listJoin(sites.map((s) => (s === S.METS.other ? stripDot(v.distantMetsOther) || 'other site' : s)).map((s, i) => (i ? lcw(s) : s)));
  }
  const m = arr(v.distantMets);
  for (const x of [S.METS.na, S.METS.none, S.METS.cannot]) if (m.includes(x)) return x;
  return '';
}

// ---------- additional findings ----------

export function additionalPathologicValue(v) {
  const a = arr(v.additionalPathologic);
  if (!a.length) return '';
  if (a.includes('None identified')) return 'None identified';
  return a.map((item) => {
    if (item === 'Thyroiditis' && stripDot(v.thyroiditisType)) return `Thyroiditis (${lc1(stripDot(v.thyroiditisType))})`;
    if (item === 'Parathyroid gland(s) present' && stripDot(v.parathyroidDetail)) return `Parathyroid gland(s) present (${lc1(stripDot(v.parathyroidDetail))})`;
    if (item === 'C-cell hyperplasia' && stripDot(v.cCellDetail)) return `C-cell hyperplasia (${lc1(stripDot(v.cCellDetail))})`;
    return item;
  }).map((s, i) => (i ? lcw(s) : s)).join('; ');
}

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const ki = num(v.ki67);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Tumour site', siteValue(v)),
      item('Tumour focality', focalityValue(v)),
      sizeItem(v)
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      S.isMedullary(v) ? item('Medullary thyroid carcinoma grade (IMTCGS)', v.mtcGrade || '') : null,
      item('Mitotic count (per 2 mm²)', mitoticValue(v)),
      ki !== null ? item('Ki-67 labelling index', `${fmt(ki)}%`) : null,
      item('Tumour necrosis', necrosisValue(v)),
      item('Angioinvasion', v.angioinvasion || 'Not identified'),
      item('Lymphatic invasion', v.lymphaticInvasion || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      item('Extrathyroidal extension', v.ete || 'Not identified'),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: [
      item('Surgical margins', marginValue(v))
    ] },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM && !S.isLowRisk(v) ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    { heading: 'Additional findings', items: [
      item('Additional pathologic findings', additionalPathologicValue(v) || (stripDot(v.additionalFindingsOther) ? '' : 'None identified')),
      item('Other findings', uc1(stripDot(v.additionalFindingsOther))),
      stripDot(v.additionalNotes) ? { label: 'Additional notes', para: `${stripDot(v.additionalNotes)}.` } : null
    ] }
  ].map((s) => (s ? { ...s, items: s.items.filter(Boolean) } : null)).filter((s) => s && s.items.length);

  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- molecular findings ----------

export function molecular(part) {
  const v = part.values;
  const items = [];
  if (v.braf && v.braf !== 'Not performed') items.push({ label: 'BRAF V600E', value: v.braf });
  if (stripDot(v.molecularOther)) items.push({ label: 'Other molecular studies', value: uc1(stripDot(v.molecularOther)) });
  if (!items.length) return '';
  return renderSynoptic([{ heading: 'Molecular studies', items }], '');
}

// ---------- diagnosis ----------

function dxType(v) {
  const name = histTypeName(v).replace(/, NOS$/, '') || 'THYROID CARCINOMA';
  const c = name.indexOf(', ');
  return c > 0 ? `${name.slice(0, c).toUpperCase()}${name.slice(c)}` : name.toUpperCase();
}

function headOf(name) {
  const idx = name.indexOf(',');
  return idx > 0 ? `${name.slice(0, idx).toUpperCase()}${name.slice(idx)}` : name.toUpperCase();
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `${lettered(part, ctx) ? `(${part.label}) ` : ''}${headOf(specimenName(part))}:`;
  const s = num(v.tumourSizeMm);
  const typeBits = [dxType(v)];
  if (S.isMedullary(v) && v.mtcGrade && v.mtcGrade !== 'Cannot be determined') {
    typeBits.push(lc1(v.mtcGrade));
  }
  if (s !== null) typeBits.push(`${v.sizeAtLeast === true ? 'at least ' : ''}${fmt(s)} mm`);
  const clauses = [typeBits.join(', ')];

  if (v.ete === S.ETE.strap) clauses.push('gross extrathyroidal extension into strap muscles');
  else if (v.ete === S.ETE.t4a) clauses.push('gross extrathyroidal extension beyond strap muscles (pT4a)');
  else if (v.ete === S.ETE.t4b) clauses.push('gross extrathyroidal extension into prevertebral fascia or major vessels (pT4b)');

  if (v.marginStatus === 'Involved by carcinoma') {
    clauses.push(`Surgical margin involved by carcinoma${stripDot(v.marginSite) ? ` (${stripDot(v.marginSite)})` : ''}`);
  } else if (v.marginStatus === 'Cannot be assessed') {
    clauses.push('Surgical margins cannot be assessed');
  } else {
    clauses.push('Margins clear');
  }

  const np = nodesPhrase(v);
  if (np) clauses.push(np);

  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && !S.isLowRisk(v) && st.tnm) {
    clauses.push(`${st.tnm} (${st.edition})`);
  }

  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

// ---------- checks ----------

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);

  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic type not recorded.', 'histType');

  const size = num(v.tumourSizeMm);
  if (size === null && !stripDot(v.sizeReason) && !S.isLowRisk(v)) {
    warn('Tumour size not recorded: pT1a, pT1b, pT2 and pT3a depend on greatest dimension.', 'tumourSizeMm');
  }

  // WHO 5th edition high-grade follicular cell-derived carcinoma check:
  // >= 5 mitoses/2 mm² or tumour necrosis in a differentiated carcinoma should be classified as DHGTC.
  const mitHigh = v.mitoticCount === 'Greater than or equal to 5 mitoses per 2 mm²' || (int(v.mitoticExact) !== null && int(v.mitoticExact) >= 5);
  if (isDifferentiatedLowGrade(v.histType || '') && (mitHigh || v.necrosis === 'Present')) {
    warn('High-grade feature recorded (>= 5 mitoses per 2 mm² and/or tumour necrosis): under WHO 5th edition, consider classifying as differentiated high-grade thyroid carcinoma (DHGTC).', 'histType');
  }

  // Medullary thyroid carcinoma checks (CAP 4.4.0.0 / WHO 5th IMTCGS):
  if (S.isMedullary(v)) {
    const ki = num(v.ki67);
    if (ki === null) warn('Medullary thyroid carcinoma: Ki-67 labelling index is required (CAP 4.4.0.0 / WHO 5th edition).', 'ki67');
    const shouldBeHigh = mitHigh || v.necrosis === 'Present' || (ki !== null && ki >= 5);
    if (!v.mtcGrade) {
      info(`Medullary thyroid carcinoma grade (IMTCGS) not recorded (features suggest ${shouldBeHigh ? 'High grade' : 'Low grade'}).`, 'mtcGrade');
    } else if (v.mtcGrade === 'Low grade' && shouldBeHigh) {
      warn('IMTCGS grade is Low grade, but >= 5 mitoses/2 mm², tumour necrosis, or Ki-67 >= 5% defines High grade.', 'mtcGrade');
    } else if (v.mtcGrade === 'High grade' && !shouldBeHigh && ki !== null) {
      warn('IMTCGS grade is High grade, but mitoses are < 5/2 mm², necrosis is absent and Ki-67 is < 5%.', 'mtcGrade');
    }
  }

  // Angioinvasion consistency for minimally invasive vs encapsulated angioinvasive types:
  const ht = v.histType || '';
  if (/^Encapsulated angioinvasive\b/.test(ht) && v.angioinvasion === 'Not identified') {
    warn('Encapsulated angioinvasive carcinoma selected, but angioinvasion is recorded as Not identified.', 'angioinvasion');
  }
  if (/^Minimally invasive\b/.test(ht) && (v.angioinvasion === 'Focal (< 4 vessels)' || v.angioinvasion === 'Extensive (>= 4 vessels)')) {
    warn('Minimally invasive carcinoma is capsular invasion only; with angioinvasion, select Encapsulated angioinvasive carcinoma.', 'histType');
  }

  // Multifocal without (m) descriptor:
  if (v.tumourFocality === 'Multifocal' && v.multiplePrimaries !== true && !S.isLowRisk(v)) {
    info('Multifocal tumour recorded: tick "Multiple primary tumours (m)" under Staging if synchronous primary tumours are present.', 'multiplePrimaries');
  }

  // Margins:
  if (v.marginStatus === 'Involved by carcinoma' && !stripDot(v.marginSite)) {
    warn('Surgical margin involved by carcinoma: specify the location.', 'marginSite');
  }

  // Nodes:
  const c = S.nodeCounts(v);
  if (c.centralInvolved > c.centralExamined) err(`Central compartment: ${c.centralInvolved} involved exceeds ${c.centralExamined} examined.`, 'centralInvolved');
  if (c.lateralInvolved > c.lateralExamined) err(`Lateral neck: ${c.lateralInvolved} involved exceeds ${c.lateralExamined} examined.`, 'lateralInvolved');
  if (c.otherInvolved > c.otherExamined) err(`Other regional nodes: ${c.otherInvolved} involved exceeds ${c.otherExamined} examined.`, 'otherNodesInvolved');
  if (c.totalInvolved > 0 && !v.ene) info('Positive lymph nodes recorded: extranodal extension (ENE) not recorded.', 'ene');

  // Staging notes & reference stage group (Checks only):
  const st = staging(part, ctx);
  for (const note of st.notes || []) info(note);
  for (const l of S.referenceLines(v, st)) info(l);
  if (st.overridden && !stripDot(v.tnmOverrideReason)) warn('pTNM override has no reason.', 'tnmOverrideReason');

  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, molecular, diagnosis, validate, staging };
