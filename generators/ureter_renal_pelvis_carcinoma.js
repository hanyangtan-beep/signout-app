// Ureter and renal pelvis urothelial carcinoma resection — synoptic report (Phase 83, user request 2026-11-04).
//
// Elements and print order from the QMH Cancer Reporting Template UG-Ureter
// (https://awiloqmh.github.io/CancerReportingTemplate/UG-Ureter.html, saved as docs/reference/UG-Ureter.html),
// with the options of CAP Ureter, Renal Pelvis 2.4.0.0
// (https://documents.cap.org/documents/New-Cancer-Protocols-March-2025/UreterRenalPelvis.Res_2.4.0.0.REL.CAPCP.pdf)
// and the ICCR dataset, 2nd edition
// (https://www.iccr-cancer.org/wp-content/uploads/2025/12/ICCR-UT-Renal-Pelvis-2nd-ed-v2.0-bookmarked.pdf).
// Staging: src/staging/ureter_renal_pelvis.js, AJCC 8th edition (AJCC has no version 9 chapter for this site).
// The stage group shows in Checks only.
//
// Departures from the QMH order, all from the house report rules: the histologic type prints as a row before the
// tumour histology paragraph, which carries the microscopy and immunohistochemistry together; tumour focality
// (ICCR) follows the size; subtypes and divergent differentiation (CAP) follow the paragraph; the two QMH grade
// rows are one row, whose options name the system; the node counts share one row; the mucosal margins keep
// carcinoma in situ, high-grade and low-grade non-invasive carcinoma and dysplasia apart; treatment effect prints
// under Additional findings; MMR immunohistochemistry prints under Molecular findings. The morphology
// sentences describe only what is seen; their sources are in docs/reference/upper-tract-sources.md.

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/ureter_renal_pelvis.js';
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
// "a ureterectomy", "an invasive": the sound, not the letter.
const article = (w) => (/^(?:ure|uni|use)/i.test(w) ? 'a' : /^[aeiou]/i.test(w) ? 'an' : 'a');
const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;
// "MSH2 and MSH6", "GATA3": a typed word in capitals keeps them.
const lcWord = (s) => (/^[A-Z0-9]{2,}/.test(s || '') ? s : lc1(s));

// ---------- option strings (schemas/ureter_renal_pelvis_carcinoma.json carries the same lists) ----------

export const NU = ['Nephroureterectomy, partial', 'Nephroureterectomy, complete'];
const COMPLETE = 'Nephroureterectomy, complete';
const URETERECTOMY = 'Ureterectomy';

export const PAP = 'Papillary urothelial carcinoma, non-invasive';
export const CIS = 'Urothelial carcinoma in situ';
export const CONV = 'Urothelial carcinoma, invasive (conventional)';
// The WHO 2022 subtypes as CAP lists them ("Urothelial carcinoma, micropapillary" ...).
export const SUBTYPE_TYPES = ['micropapillary', 'nested', 'tubular and microcystic', 'lymphoepithelioma-like', 'plasmacytoid',
  'sarcomatoid', 'giant cell', 'poorly differentiated', 'lipid-rich', 'clear cell (glycogen-rich)'].map((s) => `Urothelial carcinoma, ${s}`);
export const DIVERGENT_TYPES = ['squamous', 'glandular', 'trophoblastic', 'Müllerian'].map((s) => `Urothelial carcinoma with ${s} differentiation`);
export const UC_TYPES = [PAP, CIS, CONV, ...SUBTYPE_TYPES, ...DIVERGENT_TYPES];
const SCC = 'Squamous cell carcinoma';
const VERRUCOUS = 'Verrucous carcinoma';
const SCC_IS = 'Squamous cell carcinoma in situ (no invasive carcinoma identified)';
const AIS = 'Adenocarcinoma in situ (no invasive carcinoma identified)';
export const G_TYPES = [SCC, VERRUCOUS, SCC_IS, 'Adenocarcinoma, NOS', 'Adenocarcinoma, enteric', 'Adenocarcinoma, mucinous',
  'Adenocarcinoma, mixed', 'Adenocarcinoma, signet-ring cell', AIS];
const OTHER_TYPE = 'Other histologic type (specify)';
const UNDETERMINED = 'Carcinoma, type cannot be determined';
const NON_INVASIVE_TYPES = [PAP, CIS, SCC_IS, AIS];
const UC_GRADES = ['Low grade', 'High grade'];
const G_GRADES = ['G1, well differentiated', 'G2, moderately differentiated', 'G3, poorly differentiated', 'GX, cannot be assessed'];
// Subtypes ticked beside the type: the morphological subtypes (graded high grade, WHO 2022) and divergent
// differentiation.
const DIVERGENT = ['Squamous differentiation', 'Glandular differentiation', 'Trophoblastic differentiation', 'Müllerian differentiation'];

const ext = (v) => arr(v.extension);
const isNU = (v) => NU.includes(v.procedure);
const hasCis = (v) => ext(v).includes(S.EXT.Tis);

// ---------- specimen and site ----------

/** "Kidney and ureter" for a nephroureterectomy, "Ureter" for a ureterectomy, else from the tumour site. */
export function organWords(v) {
  if (isNU(v)) return 'Kidney and ureter';
  if (v.procedure === URETERECTOMY) return 'Ureter';
  const s = arr(v.tumourSite);
  if (s.includes('Renal pelvis') || s.includes('Kidney')) return 'Kidney and ureter';
  if (s.includes('Ureter')) return 'Ureter';
  return 'Ureter and renal pelvis';
}

export function procedurePhrase(v) {
  if (isNU(v)) return 'nephroureterectomy';
  if (v.procedure === URETERECTOMY) return 'ureterectomy';
  if (v.procedure === 'Other (specify)') return lc1(stripDot(v.procedureOther));
  return '';
}

const side = (v) => (v.laterality === 'Right' || v.laterality === 'Left' ? v.laterality.toLowerCase() : '');

export function specimenName(part) {
  const v = part.values;
  return [organWords(v), side(v), procedurePhrase(v)].filter(Boolean).join(', ');
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'ureter_renal_pelvis'); }

const LEVEL = { Upper: 'upper', Middle: 'middle', Lower: 'lower' };

/** ["renal pelvis", "lower ureter"]: the sites ticked, the ureter with its level. */
export function siteList(v) {
  return arr(v.tumourSite).filter((s) => s !== 'Cannot be determined').map((s) => {
    if (s === 'Ureter') {
      const lv = arr(v.ureterLevel).map((l) => LEVEL[l]).filter(Boolean);
      return lv.length ? `${listJoin(lv)} ureter` : 'ureter';
    }
    if (s === 'Other (specify)') return lc1(stripDot(v.tumourSiteOther));
    return lc1(s);
  }).filter(Boolean);
}

export function siteValue(v) {
  if (arr(v.tumourSite).includes('Cannot be determined')) return 'Cannot be determined';
  const s = siteList(v);
  return s.length ? uc1(listJoin(s)) : 'Not specified';
}

// ---------- macro ----------

const APPEARANCE = {
  'Papillary tumour': 'a papillary tumour',
  'Sessile / solid tumour': 'a sessile, solid tumour',
  'Ulcerated tumour': 'an ulcerated tumour',
  'Plaque-like thickening': 'a plaque-like thickening of the urothelium',
  'Ill-defined lesion': 'an ill-defined lesion'
};

function ureterClause(v, segment) {
  const len = num(v.ureterLengthMm); const dia = num(v.ureterDiameterMm);
  const what = segment ? 'a segment of ureter' : 'a ureter';
  if (len !== null && dia !== null) return `${what} measuring ${fmt(len)} mm in length and ${fmt(dia)} mm in diameter`;
  if (len !== null) return `${what} measuring ${fmt(len)} mm in length`;
  if (dia !== null) return `${what} ${fmt(dia)} mm in diameter`;
  return segment ? '' : 'a ureter';
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const tag = lettered(part, ctx) ? `(${part.label}) ` : '';
  const what = procedurePhrase(v) || 'resection';
  const kd = isNU(v) || v.procedure !== URETERECTOMY ? stripDot(v.kidneyDims) : '';
  const parts = [];
  if (isNU(v)) {
    parts.push(kd ? `a kidney measuring ${kd} mm` : 'a kidney');
    parts.push(ureterClause(v, false));
  } else {
    if (kd) parts.push(`a kidney measuring ${kd} mm`);
    const u = ureterClause(v, true);
    if (u) parts.push(u);
  }
  const comprising = parts.filter(Boolean);
  const anyDims = kd || num(v.ureterLengthMm) !== null || num(v.ureterDiameterMm) !== null;
  let first = `${tag}Received in formalin is ${article(what)} ${what} specimen`;
  if (anyDims) first += ` comprising ${listJoin(comprising)}`;
  if (v.bladderCuff === 'Present') first += ', with a cuff of bladder';
  const bits = [`${first}.`];
  if (v.bladderCuff === 'Not identified' && isNU(v)) bits.push('No bladder cuff is identified.');
  const w = num(v.specimenWeightG);
  if (w !== null) bits.push(`The specimen weighs ${fmt(w)} g.`);
  const app = APPEARANCE[v.lesionAppearance];
  if (app) {
    const loc = listJoin(siteList(v));
    const ld = stripDot(v.lesionDims);
    const d = num(v.macroMarginMm);
    const where = stripDot(v.macroMarginSite);
    let s = `There is ${app}${loc ? ` in the ${loc}` : ''}${ld ? ` measuring ${ld} mm` : ''}`;
    if (d !== null) s += `, ${fmt(d)} mm from the closest${where ? ` (${where})` : ''} margin`;
    bits.push(`${s}.`);
  } else if (v.lesionAppearance === 'No macroscopic tumour') {
    bits.push('No macroscopic tumour is seen.');
  }
  if (stripDot(v.macroOther)) bits.push(`${uc1(stripDot(v.macroOther))}.`);
  const b = int(v.blocks);
  if (b) bits.push(`Representative sections are taken in ${b} block${b === 1 ? '' : 's'}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

// ---------- type and morphology ----------

const subtypeOf = (t) => (SUBTYPE_TYPES.includes(t) ? t.replace('Urothelial carcinoma, ', '') : '');

export function histTypeName(v) {
  const t = v.histType || '';
  if (t === OTHER_TYPE) return stripDot(v.histTypeOther) || 'Histologic type not specified';
  if (t === UNDETERMINED && stripDot(v.histTypeOther)) return `${t} (${lcWord(stripDot(v.histTypeOther))})`;
  return t || 'Histologic type not specified';
}

/** The type as the histology sentence reads it: "urothelial carcinoma", "micropapillary urothelial carcinoma". */
export function sentenceType(v) {
  const t = v.histType || '';
  if (t === PAP) return 'non-invasive papillary urothelial carcinoma';
  if (t === CIS) return 'urothelial carcinoma in situ';
  if (t === CONV) return 'urothelial carcinoma';
  if (subtypeOf(t)) return `${subtypeOf(t)} urothelial carcinoma`;
  if (DIVERGENT_TYPES.includes(t)) return lc1(t);
  if (t === SCC_IS) return 'squamous cell carcinoma in situ';
  if (t === AIS) return 'adenocarcinoma in situ';
  if (t === 'Adenocarcinoma, NOS') return 'adenocarcinoma';
  if (t === 'Adenocarcinoma, enteric') return 'adenocarcinoma of enteric type';
  if (t === 'Adenocarcinoma, mucinous') return 'mucinous adenocarcinoma';
  if (t === 'Adenocarcinoma, mixed') return 'adenocarcinoma of mixed type';
  if (t === 'Adenocarcinoma, signet-ring cell') return 'signet-ring cell adenocarcinoma';
  if (t === UNDETERMINED) return 'carcinoma of undetermined type';
  return lc1(histTypeName(v));
}

/** The type on the diagnosis line, in capitals. */
export function dxType(v) {
  const t = v.histType || '';
  if (t === PAP) return 'NON-INVASIVE PAPILLARY UROTHELIAL CARCINOMA';
  if (t === CIS) return 'UROTHELIAL CARCINOMA IN SITU';
  if (t === CONV) return 'INVASIVE UROTHELIAL CARCINOMA';
  if (subtypeOf(t)) return `INVASIVE UROTHELIAL CARCINOMA, ${subtypeOf(t).toUpperCase()} SUBTYPE`;
  if (DIVERGENT_TYPES.includes(t)) return `INVASIVE ${t.toUpperCase()}`;
  if (t === SCC_IS) return 'SQUAMOUS CELL CARCINOMA IN SITU';
  if (t === AIS) return 'ADENOCARCINOMA IN SITU';
  if (t === UNDETERMINED) return 'CARCINOMA, type cannot be determined';
  return histTypeName(v).toUpperCase();
}

// What is seen, by type (docs/reference/upper-tract-sources.md).
export const MORPH = {
  lowGradePapillary: 'Slender papillae with fibrovascular cores and minimal fusion are lined by orderly urothelium with mild nuclear pleomorphism; mitoses are confined to the lower half.',
  highGradePapillary: 'Fused and complex papillae with fibrovascular cores are lined by disordered, crowded urothelium with nuclear pleomorphism, enlarged nuclei, prominent nucleoli and frequent mitoses.',
  cis: 'Flat urothelium shows loss of polarity and nuclear crowding, with enlarged, pleomorphic nuclei and mitoses in the mid to upper layers.',
  conventional: 'Irregular nests and single cells with nuclear pleomorphism, hyperchromasia and frequent mitoses infiltrate the stroma.',
  micropapillary: 'Small nests of tumour cells without fibrovascular cores lie within lacunar spaces, several nests sharing one lacuna.',
  nested: 'Anastomosing, irregular nests of cytologically bland cells infiltrate the stroma, with greater atypia at the deep aspect.',
  'tubular and microcystic': 'Infiltrating microcysts and tubules lined by cuboidal or flattened cells with minimal atypia contain granular eosinophilic secretions.',
  'lymphoepithelioma-like': 'Syncytial sheets and nests of large pleomorphic cells with prominent nucleoli are obscured by abundant mixed inflammatory cells.',
  plasmacytoid: 'Discohesive single cells have eccentric nuclei and abundant eosinophilic cytoplasm.',
  sarcomatoid: 'A high-grade spindle cell component is admixed with conventional high-grade urothelial carcinoma.',
  squamousDifferentiation: 'Part of the tumour shows squamous differentiation.',
  glandularDifferentiation: 'Part of the tumour forms true glands lined by columnar cells.',
  squamous: 'Irregular infiltrating nests and sheets of malignant squamous cells show keratinisation and intercellular bridges; there is no urothelial carcinoma component.',
  smallCell: 'Sheets and nests of small to medium-sized cells with scant cytoplasm, finely granular chromatin, inconspicuous nucleoli and nuclear moulding show brisk mitotic activity and necrosis.'
};

// A component ticked beside the type: the same features, introduced as a component.
export const COMPONENT_MORPH = {
  Micropapillary: 'In a micropapillary component, small nests of tumour cells without fibrovascular cores lie within lacunar spaces, several nests sharing one lacuna.',
  Nested: 'In a nested component, anastomosing, irregular nests of cytologically bland cells infiltrate the stroma.',
  'Tubular and microcystic': 'In a tubular and microcystic component, infiltrating microcysts and tubules are lined by cuboidal or flattened cells with minimal atypia.',
  'Lymphoepithelioma-like': 'In a lymphoepithelioma-like component, syncytial sheets of large pleomorphic cells with prominent nucleoli are obscured by abundant mixed inflammatory cells.',
  Plasmacytoid: 'In a plasmacytoid component, discohesive single cells have eccentric nuclei and abundant eosinophilic cytoplasm.',
  Sarcomatoid: 'A sarcomatoid component of high-grade spindle cells is admixed with the urothelial carcinoma.',
  'Squamous differentiation': MORPH.squamousDifferentiation,
  'Glandular differentiation': MORPH.glandularDifferentiation,
  'Small cell neuroendocrine carcinoma': 'In a small cell neuroendocrine carcinoma component, sheets and nests of small to medium-sized cells with scant cytoplasm, finely granular chromatin and nuclear moulding show brisk mitotic activity and necrosis.'
};

export function typeMorphology(v) {
  const t = v.histType || '';
  if (t === PAP) return v.grade === 'Low grade' ? MORPH.lowGradePapillary : v.grade === 'High grade' ? MORPH.highGradePapillary : '';
  if (t === CIS) return MORPH.cis;
  if (t === CONV || t === DIVERGENT_TYPES[2] || t === DIVERGENT_TYPES[3]) return MORPH.conventional;
  if (t === DIVERGENT_TYPES[0]) return `${MORPH.conventional} ${MORPH.squamousDifferentiation}`;
  if (t === DIVERGENT_TYPES[1]) return `${MORPH.conventional} ${MORPH.glandularDifferentiation}`;
  if (subtypeOf(t)) return MORPH[subtypeOf(t)] || '';
  if (t === SCC) return MORPH.squamous;
  if (t === 'Small cell neuroendocrine carcinoma') return MORPH.smallCell;
  return '';
}

// The invasive extent as the sentences read it, deepest category first.
const EXTENT_PHRASE = {
  [S.EXT.T1]: 'the subepithelial connective tissue',
  [S.EXT.T2]: 'the muscularis',
  [S.EXT.T3pelvisFat]: 'beyond the muscularis into the peripelvic fat',
  [S.EXT.T3parenchyma]: 'the renal parenchyma',
  [S.EXT.T3ureterFat]: 'beyond the muscularis into the periureteric fat',
  [S.EXT.T4kidney]: 'through the kidney into the perinephric fat',
  [S.EXT.T4organs]: 'adjacent organs'
};
const T_RANK = {
  [S.EXT.T1]: 1, [S.EXT.T2]: 2, [S.EXT.T3pelvisFat]: 3, [S.EXT.T3parenchyma]: 3, [S.EXT.T3ureterFat]: 3,
  [S.EXT.T4kidney]: 4, [S.EXT.T4organs]: 4
};
const invasiveTicked = (v) => ext(v).filter((e) => T_RANK[e]);

/** "invading the renal parenchyma"; the deepest category's options only; '' when none is invasive. */
export function extentPhrase(v) {
  const inv = invasiveTicked(v);
  if (!inv.length) return '';
  const top = Math.max(...inv.map((e) => T_RANK[e]));
  const words = inv.filter((e) => T_RANK[e] === top).map((e) => (e === S.EXT.T4organs && stripDot(v.extensionOther)
    ? `the ${lcWord(stripDot(v.extensionOther))}` : EXTENT_PHRASE[e]));
  return `invading ${listJoin(words)}`;
}

const gradeWord = (v) => (v.grade === 'High grade' ? 'high-grade' : v.grade === 'Low grade' ? 'low-grade' : '');

const subtypesTicked = (v) => (SUBTYPE_TYPES.includes(v.histType) || [CONV, ...DIVERGENT_TYPES].includes(v.histType) ? arr(v.subtypes) : []);
const subtypeName = (v, s) => (s === 'Other (specify)' ? stripDot(v.subtypeOther) : s);

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const t = v.histType || '';
  const extent = extentPhrase(v);
  let s;
  if (t === CIS || t === SCC_IS || t === AIS) {
    const focal = t === CIS && v.cisExtent ? `${lc1(v.cisExtent)} ` : '';
    s = `There is ${focal}${sentenceType(v)}.`;
  } else {
    const g = UC_TYPES.includes(t) ? gradeWord(v) : '';
    const invasiveWord = t === CONV && !extent ? 'invasive ' : '';
    const what = `${g ? `${g} ` : ''}${invasiveWord}${sentenceType(v)}`;
    s = `The tumour is ${article(what)} ${what}${extent ? ` ${extent}` : ''}.`;
  }
  const bits = [typeMorphology(v)];
  for (const sub of subtypesTicked(v)) if (COMPONENT_MORPH[sub]) bits.push(COMPONENT_MORPH[sub]);
  if (t === PAP && !extent) bits.push('There is no stromal invasion.');
  if (hasCis(v) && t !== CIS) {
    const focal = v.cisExtent ? `${lc1(v.cisExtent)} ` : '';
    bits.push(`There is also ${focal}carcinoma in situ, in which ${lc1(MORPH.cis)}`);
  }
  const typed = stripDot(v.ihcOther);
  if (typed) bits.push(`${uc1(typed)}.`);
  for (const x of bits) if (x) s += ` ${x}`;
  return s;
}

// ---------- microscopic elements ----------

export function procedureValue(v) {
  const p = v.procedure || '';
  if (!p) return 'Not specified';
  return p === 'Other (specify)' ? uc1(stripDot(v.procedureOther)) || 'Other' : p;
}

export function sizeValue(v) {
  const n = num(v.tumourSizeMm);
  if (n !== null) return `${fmt(n)} mm (greatest dimension)`;
  return v.lesionAppearance === 'No macroscopic tumour' ? 'No macroscopically visible tumour' : '';
}

export function subtypesValue(v) {
  const names = subtypesTicked(v).map((s) => subtypeName(v, s)).filter(Boolean);
  if (!names.length) return '';
  const pct = stripDot(v.subtypePercents);
  return `${uc1(listJoin(names.map((s, i) => (i ? lc1(s) : s))))}${pct ? ` (${pct})` : ''}`;
}

export function gradeValue(v) {
  const g = v.grade || '';
  if (!g || g === 'Not applicable') return '';
  const pct = num(v.highGradePct);
  return UC_GRADES.includes(g) && pct !== null ? `${g} (high-grade component ${fmt(pct)}%)` : g;
}

const configurationValue = (v) => {
  const c = arr(v.configuration).map((x) => (x === 'Other (specify)' ? stripDot(v.configurationOther) : x)).filter(Boolean);
  return c.length ? uc1(listJoin(c.map((x, i) => (i ? lc1(x) : x)))) : '';
};

export function extensionValue(v) {
  const e = ext(v);
  if (!e.length) return '';
  const items = e.map((x) => {
    if (x === S.EXT.T4organs) return stripDot(v.extensionOther) ? `Invades adjacent organs (${stripDot(v.extensionOther)})` : 'Invades adjacent organs';
    if (x === S.EXT.Tis && v.cisExtent) return `Carcinoma in situ (${lc1(v.cisExtent)})`;
    return x;
  });
  return items.map((x, i) => (i ? lc1(x) : x)).join('; ');
}

// ---------- margins ----------

/** The margins this specimen has, in the QMH order: [{ id, label, name, status, mm }]. */
export function margins(v) {
  const out = [];
  const add = (id, label, name, status, mm, other = '') => out.push({ id, label, name, status: status || '', mm: num(mm), other });
  if (!isNU(v)) add('proximalMargin', 'Proximal ureteric margin', 'proximal ureteric', v.proximalMargin, v.proximalMarginMm);
  const cuff = v.procedure === COMPLETE || v.bladderCuff === 'Present';
  if (!cuff) add('distalMargin', 'Distal ureteric margin', 'distal ureteric', v.distalMargin, v.distalMarginMm);
  else add('bladderCuffMargin', 'Bladder cuff margin', 'bladder cuff', v.bladderCuffMargin, v.bladderCuffMarginMm);
  add('softTissueMargin', 'Soft tissue margin', 'soft tissue', v.softTissueMargin, v.softTissueMarginMm);
  if (v.otherMargin) {
    const n = stripDot(v.otherMarginName);
    add('otherMargin', n ? `${uc1(n)} margin` : 'Other margin', n ? lcWord(n) : 'other', v.otherMargin, v.otherMarginMm);
  }
  return out;
}

const marginValue = (m) => (m.status === 'Uninvolved' && m.mm !== null ? `Uninvolved (${fmt(m.mm)} mm)` : m.status);

const marginItems = (v) => margins(v).filter((m) => m.status).map((m) => ({ label: m.label, value: marginValue(m) }));

// ---------- lymph nodes and metastasis ----------

const sized = (mm, site) => {
  const d = num(mm); if (d === null) return '';
  const w = stripDot(site);
  return `${fmt(d)} mm${w ? ` (${lcWord(w)})` : ''}`;
};

export function nodesItem(v) {
  const examined = int(v.nodesExamined) || 0;
  if (!examined) return { label: 'Regional lymph nodes', value: 'None submitted' };
  const involved = int(v.nodesInvolved) || 0;
  const value = `${examined} examined; ${involved ? `${involved} involved` : 'none involved'}`;
  const sub = [];
  if (involved) {
    if (v.ene) sub.push({ label: 'Extranodal extension', value: v.ene });
    const dep = sized(v.largestDepositMm, v.largestDepositSite);
    if (dep) sub.push({ label: 'Size of largest metastatic deposit', value: dep });
    const node = sized(v.largestNodeMm, v.largestNodeSite);
    if (node) sub.push({ label: 'Size of largest lymph node involved', value: node });
  }
  return { label: 'Regional lymph nodes', value, sub };
}

export function nodesPhrase(v) {
  const examined = int(v.nodesExamined) || 0;
  if (!examined) return '';
  const involved = int(v.nodesInvolved) || 0;
  let s = `${involved} of ${examined} regional lymph node${examined === 1 ? '' : 's'} involved`;
  if (involved && v.ene === 'Present') s += '; extranodal extension present';
  return s;
}

const NO_METS = ['Not applicable', 'Not identified', 'Cannot be determined'];

export function metastasisValue(v) {
  const m = arr(v.distantMets);
  if (!m.length) return '';
  for (const x of NO_METS) if (m.includes(x)) return x;
  const names = m.map((s) => (s === 'Other (specify)' ? stripDot(v.distantMetsOther) || 'Other site' : s)).map((s, i) => (i ? lc1(s) : s));
  return listJoin(names);
}

// ---------- additional findings ----------

const chosen = (list, other) => arr(list).filter((s) => s !== 'None identified').map((s) => (s === 'Other (specify)' ? stripDot(other) : s)).filter(Boolean);

export function associatedValue(v) {
  const a = chosen(v.associatedLesions, v.associatedOther);
  return a.length ? uc1(a.map((s, i) => (i && !/^(?:PUNLMP|Papillary urothelial neoplasm)/.test(s) ? lc1(s) : s)).join('; ')) : '';
}

export function findingsValue(v) {
  const a = arr(v.additionalFindings).map((s) => {
    if (s === 'Other (specify)') return stripDot(v.additionalOther);
    if (s === 'Therapy-related changes' && stripDot(v.additionalOther) && !arr(v.additionalFindings).includes('Other (specify)')) return `Therapy-related changes (${lcWord(stripDot(v.additionalOther))})`;
    return s;
  }).filter(Boolean);
  return a.length ? uc1(a.map((s, i) => (i ? lc1(s) : s)).join('; ')) : '';
}

const SPECIFY_RENAL = ['Glomerular disease (specify)', 'Tubulointerstitial disease (specify)', 'Vascular disease (specify)', 'Inflammation (specify)', 'Other (specify)'];

export function renalValue(v) {
  if (v.procedure === URETERECTOMY) return '';
  const r = arr(v.renal);
  if (!r.length) return '';
  const plain = r.filter((s) => !SPECIFY_RENAL.includes(s));
  const named = r.filter((s) => SPECIFY_RENAL.includes(s) && s !== 'Other (specify)').map((s) => s.replace(' (specify)', ''));
  const detail = stripDot(v.renalDetail);
  const out = [...plain];
  if (named.length) out.push(`${listJoin(named.map((s, i) => (i ? lc1(s) : s)))}${detail ? ` (${lcWord(detail)})` : ''}`);
  else if (r.includes('Other (specify)') && detail) out.push(uc1(detail));
  return out.map((s, i) => (i ? lc1(s) : s)).join('; ');
}

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Specimen laterality', v.laterality || 'Not specified'),
      item('Tumour site', siteValue(v)),
      item('Tumour size', sizeValue(v)),
      item('Tumour focality', v.focality || '')
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Subtypes and divergent differentiation', subtypesValue(v)),
      item('Histologic grade', gradeValue(v)),
      item('Tumour configuration', configurationValue(v)),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      item('Tumour extension', extensionValue(v))
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: [nodesItem(v)] } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    { heading: 'Additional findings', items: [
      item('Additional findings', findingsValue(v)),
      item('Associated epithelial lesions', associatedValue(v)),
      item('Ipsilateral non-neoplastic renal tissue', renalValue(v)),
      v.postTherapy === true ? item('Treatment effect', v.treatmentEffect || '') : null,
      item('Other findings', uc1(stripDot(v.otherFindings))),
      !associatedValue(v) && !findingsValue(v) && !renalValue(v) && !(v.postTherapy === true && v.treatmentEffect) && !stripDot(v.otherFindings) ? { text: 'None identified' } : null
    ] }
  ].map((s) => (s ? { ...s, items: s.items.filter(Boolean) } : null)).filter((s) => s && s.items.length);
  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- molecular findings and comment ----------

const specify = (s) => String(s || '').replace(/ \((?:specify|explain)\)$/, '');

export function mmrValue(v) {
  const m = v.mmrIhc || 'Not performed';
  if (m === 'Not performed') return '';
  const d = stripDot(v.mmrDetail);
  return `${specify(m)}${d && m !== 'Requested; result to follow' && !/^Intact/.test(m) ? ` (${d})` : ''}`;
}

/** MMR immunohistochemistry and other ancillary studies under Molecular findings; '' when none. */
export function molecular(part) {
  const v = part.values;
  const items = [];
  if (mmrValue(v)) items.push({ label: 'Mismatch repair (MMR) immunohistochemistry', value: mmrValue(v) });
  if (stripDot(v.ancillaryOther)) items.push({ label: 'Other ancillary studies', value: uc1(stripDot(v.ancillaryOther)) });
  return items.length ? renderSynoptic([{ heading: 'Ancillary studies', items }], '') : '';
}

export function comment() { return ''; }

// ---------- diagnosis ----------

function marginClause(v) {
  const rows = margins(v).filter((m) => m.status);
  if (!rows.length) return '';
  const at = (re) => rows.filter((m) => re.test(m.status)).map((m) => m.name);
  const plural = (names) => `margin${names.length > 1 ? 's' : ''}`;
  const out = [];
  const inv = at(/^Involved by invasive/);
  if (inv.length) out.push(`invasive carcinoma involves the ${listJoin(inv)} ${plural(inv)}`);
  for (const [re, what] of [[/carcinoma in situ$/, 'carcinoma in situ'], [/high-grade non-invasive/, 'high-grade non-invasive papillary carcinoma'],
    [/low-grade non-invasive/, 'low-grade non-invasive papillary carcinoma'], [/dysplasia$/, 'urothelial dysplasia']]) {
    const names = at(re);
    if (names.length) out.push(`${what} at the ${listJoin(names)} ${plural(names)}`);
  }
  if (out.length) return out.join('; ');
  if (rows.some((m) => m.status === 'Cannot be assessed')) return 'margins cannot be assessed';
  // "Completely excised" only when every margin the specimen has is recorded uninvolved.
  if (margins(v).some((m) => !m.status)) return '';
  const ds = rows.filter((m) => m.mm !== null);
  if (!ds.length) return 'completely excised';
  const near = ds.reduce((a, b) => (b.mm < a.mm ? b : a));
  return `completely excised (closest margin ${fmt(near.mm)} mm, ${near.name})`;
}

// The diagnosis "with" list: subtype components, then divergent differentiation, then carcinoma in situ, in one
// phrase ("with a micropapillary component, squamous differentiation and carcinoma in situ").
function withPhrase(v) {
  const ticked = subtypesTicked(v).map((s) => [s, subtypeName(v, s)]).filter(([, n]) => n);
  const comps = ticked.filter(([s]) => !DIVERGENT.includes(s)).map(([, n]) => lc1(n));
  const bits = ticked.filter(([s]) => DIVERGENT.includes(s)).map(([, n]) => lc1(n));
  if (comps.length) bits.unshift(comps.length === 1 ? `${article(comps[0])} ${comps[0]} component` : `${listJoin(comps)} components`);
  if (hasCis(v) && v.histType !== CIS) bits.push('carcinoma in situ');
  return bits.length ? `with ${listJoin(bits)}` : '';
}

const dxGrade = (v) => {
  const g = v.grade || '';
  if (UC_GRADES.includes(g)) return lc1(g);
  if (G_GRADES.slice(0, 3).includes(g)) { const [code, words] = g.split(', '); return `${words} (${code})`; }
  return '';
};

export function diagnosis(part, ctx) {
  const v = part.values;
  const name = specimenName(part);
  const head = (lettered(part, ctx) ? `(${part.label}) ` : '') + name.replace(organWords(v), organWords(v).toUpperCase());
  const sites = siteList(v);
  const lead = [`${dxType(v)}${sites.length ? ` of the ${listJoin(sites)}` : ''}`];
  if (dxGrade(v) && v.histType !== CIS) lead.push(dxGrade(v));
  if (v.focality === 'Multifocal') lead.push('multifocal');
  const size = num(v.tumourSizeMm);
  if (size !== null) lead.push(`${fmt(size)} mm`);
  if (extentPhrase(v)) lead.push(extentPhrase(v));
  if (withPhrase(v)) lead.push(withPhrase(v));
  const clauses = [[lead.join(', '), marginClause(v), 'see synoptic report'].filter(Boolean).join('; ')];
  if (nodesPhrase(v)) clauses.push(nodesPhrase(v));
  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && st.tnm) clauses.push(`${st.tnm} (${st.edition})`);
  const bg = chosen(v.associatedLesions, v.associatedOther);
  if (bg.length) clauses.push(`Background ${listJoin(bg.map(lcWord))}`);
  return renderDiagnosis(head, clauses);
}

// ---------- checks ----------

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);
  const t = v.histType || '';
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!t) err('Histologic type not recorded.', 'histType');
  if (!ext(v).length) warn('Tumour extension not recorded: pT needs it.', 'extension');
  if (!arr(v.tumourSite).length) warn('Tumour site not recorded: the pT3 routes differ for the renal pelvis and the ureter.', 'tumourSite');
  const inSitu = NON_INVASIVE_TYPES.includes(t) && t !== PAP;
  if (num(v.tumourSizeMm) === null && v.lesionAppearance !== 'No macroscopic tumour' && t && !inSitu) warn('Tumour size not recorded (ICCR: maximum dimension of the largest tumour).', 'tumourSizeMm');
  // Grade (ICCR; WHO 2022): all invasive urothelial carcinomas are graded, all subtypes are high grade, and the
  // cut-off for high grade is a 5% component.
  const ucType = UC_TYPES.includes(t) && t !== CIS;
  if (ucType && !v.grade) warn('Histologic grade not recorded: low or high grade (ICCR recommends grading every invasive urothelial carcinoma).', 'grade');
  if (G_TYPES.includes(t) && !inSitu && !v.grade) warn('Histologic grade not recorded: G1 to G3 for squamous cell carcinoma and adenocarcinoma.', 'grade');
  if (UC_TYPES.includes(t) && G_GRADES.includes(v.grade)) warn('A urothelial carcinoma is graded low or high grade, not G1 to G3.', 'grade');
  if (G_TYPES.includes(t) && UC_GRADES.includes(v.grade)) warn('Squamous cell carcinoma and adenocarcinoma are graded G1 to G3, not low or high grade.', 'grade');
  const subtyped = SUBTYPE_TYPES.includes(t) || subtypesTicked(v).some((s) => !DIVERGENT.includes(s) && s !== 'Other (specify)');
  if (subtyped && v.grade === 'Low grade') warn('A subtype is recorded with a low grade: according to the 2022 WHO classification, all subtypes are high grade (ICCR).', 'grade');
  else if (t === CONV && v.grade === 'Low grade') info('Invasive urothelial carcinoma graded low grade: the great majority are high grade, and no standard criteria for low-grade invasive carcinoma have been established (ICCR).', 'grade');
  const pct = num(v.highGradePct);
  // ICCR: "the cutoff for high grade is 5%"; "Tumours with up to 5% high grade component would be categorised as
  // low grade". Exactly 5% raises nothing.
  if (pct !== null && v.grade === 'High grade' && pct < 5) warn(`High grade with a ${fmt(pct)}% high-grade component: with up to 5% the tumour is graded low grade, and the proportion may be stated (WHO 2022, ICCR).`, 'grade');
  if (pct !== null && v.grade === 'Low grade' && pct > 5) warn(`Low grade with a ${fmt(pct)}% high-grade component: above the 5% cut-off the tumour is graded high grade (WHO 2022, ICCR).`, 'grade');
  // Type against the extent.
  const invasive = invasiveTicked(v).length > 0;
  if (NON_INVASIVE_TYPES.includes(t) && invasive) warn('A non-invasive type with invasion ticked under Tumour extension: check the type or the extension.', 'extension');
  if (t && !NON_INVASIVE_TYPES.includes(t) && ext(v).length && !invasive && !ext(v).includes(S.EXT.TX) && !ext(v).includes(S.EXT.T0)) warn('An invasive type with no invasion ticked under Tumour extension: check the type or the extension.', 'extension');
  if (t === CIS && !hasCis(v)) warn('Urothelial carcinoma in situ: tick Carcinoma in situ under Tumour extension (pTis).', 'extension');
  if (t === PAP && !ext(v).includes(S.EXT.Ta)) warn('Non-invasive papillary carcinoma: tick it under Tumour extension (pTa).', 'extension');
  // The pT3 routes are site-specific (AJCC 8th edition; CAP, Note E).
  const sites = arr(v.tumourSite);
  const pelvic = [S.EXT.T3pelvisFat, S.EXT.T3parenchyma].filter((e) => ext(v).includes(e));
  if (pelvic.length && sites.length && !sites.includes('Renal pelvis')) warn('Peripelvic fat or renal parenchymal invasion is the pT3 route for a renal pelvis tumour: tick Renal pelvis under Tumour site, or check the extension.', 'tumourSite');
  if (ext(v).includes(S.EXT.T3ureterFat) && sites.length && !sites.includes('Ureter')) warn('Periureteric fat invasion is the pT3 route for a ureteric tumour: tick Ureter under Tumour site, or check the extension.', 'tumourSite');
  if (ext(v).includes(S.EXT.T3parenchyma)) info('Renal parenchymal invasion is pT3; in situ extension into the renal collecting ducts and tubules does not affect stage (CAP, Note E).', 'extension');
  if (S.cisWithTa(v)) info("Non-invasive papillary carcinoma with carcinoma in situ is staged pTa. CAP allows the suffix 'is' to note the carcinoma in situ; it is not printed.", 'extension');
  if (ext(v).includes(S.EXT.T4organs) && !stripDot(v.extensionOther)) warn('Adjacent organ invasion: name the organ.', 'extensionOther');
  // Margins and the bladder cuff (ICCR, Note 2: a complete nephroureterectomy includes a cuff of bladder wall).
  if (v.procedure === COMPLETE && !v.bladderCuff) warn('Complete nephroureterectomy: record the bladder cuff (ICCR: a complete nephroureterectomy includes a cuff of bladder wall).', 'bladderCuff');
  if (v.procedure === COMPLETE && v.bladderCuff === 'Not identified') info('No bladder cuff in a complete nephroureterectomy: ICCR defines the complete procedure as including a cuff of bladder wall. Check the procedure.', 'bladderCuff');
  for (const m of margins(v)) if (!m.status && m.id !== 'otherMargin') warn(`${m.label} not recorded.`, m.id);
  if (v.otherMargin && !stripDot(v.otherMarginName)) warn('Other margin: name it.', 'otherMarginName');
  // Nodes.
  const examined = int(v.nodesExamined); const involved = int(v.nodesInvolved);
  if (examined && involved === null) warn('Lymph nodes involved not recorded.', 'nodesInvolved');
  if (examined !== null && involved !== null && involved > examined) err(`${involved} involved nodes is more than the ${examined} examined.`, 'nodesInvolved');
  if (involved === 1 && num(v.largestDepositMm) === null && !(num(v.largestNodeMm) !== null && num(v.largestNodeMm) <= 20 && v.ene !== 'Present')) {
    warn('One involved node with no deposit size: pN1 (20 mm or less) or pN2 (more than 20 mm) needs it, so pN prints as pNX.', 'largestDepositMm');
  }
  if (involved && !v.ene) warn('Extranodal extension not recorded.', 'ene');
  // Staging.
  const st = staging(part, ctx);
  for (const note of st.notes || []) info(note);
  for (const l of S.referenceLines(v, st)) info(l);
  if (st.overridden && !stripDot(v.tnmOverrideReason)) warn('pTNM override has no reason.', 'tnmOverrideReason');
  if (v.postTherapy === true && !v.treatmentEffect) warn('After neoadjuvant therapy (y): record the treatment effect.', 'treatmentEffect');
  if (v.focality === 'Multifocal' && v.multiplePrimaries !== true) info('Multifocal tumour: CAP adds the suffix m to the T category for multiple tumours; tick Multiple primary tumours (m) under Staging.', 'multiplePrimaries');
  // MMR (ICCR, Note 18).
  const m = v.mmrIhc || 'Not performed';
  if (/^(?:Loss|Subclonal loss)/.test(m) && !stripDot(v.mmrDetail)) err('MMR loss: name the protein(s) lost.', 'mmrDetail');
  if (m === 'Not performed') info('MMR immunohistochemistry not performed. ICCR (Note 18) cites a review that recommends tissue testing (immunohistochemistry or molecular) when the patient is under 60, when there is a family history of upper tract urothelial, endometrial or colon cancer in a relative under 60, or when the patient has had colon or endometrial cancer; no screening protocol has been agreed.', 'mmrIhc');
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, molecular, comment, diagnosis, validate, staging };
