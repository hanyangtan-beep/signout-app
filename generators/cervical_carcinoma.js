// Cervical carcinoma resection — synoptic report (Phase 85, user request 2026-11-11).
//
// Elements and print order from the QMH Cancer Reporting Template GYN-Cervix
// (https://awiloqmh.github.io/CancerReportingTemplate/GYN-Cervix.html, saved as docs/reference/GYN-Cervix.html),
// with the options of CAP Cervix 5.1.1.0 (https://documents.cap.org/documents/Cervix_5.1.1.0.REL_CAPCP.pdf) and
// the ICCR carcinomas of the cervix dataset
// (https://www.iccr-cancer.org/datasets/published-datasets/female-reproductive/carcinomas-of-the-cervix/).
// Staging: src/staging/cervix.js, AJCC version 9 (the QMH page prints the AJCC 8th edition; version 9 is the
// house rule). The stage group, which matches FIGO 2018, shows in Checks only.
//
// The form takes loop excisions and cones as well as trachelectomies, hysterectomies and exenterations; the
// margins offered follow the procedure (ectocervical, endocervical and radial for an excision; vaginal cuff and
// radial for a hysterectomy).
//
// Departures from the QMH order (docs/reference/cervix-sources.md lists them): the tumour histology paragraph
// follows perineural invasion rather than opening the section, and the margin rows give "location, distance"
// ("7 o'clock, 4.5 mm") under one "Surgical margins" line, as in the user's own cervical cone reports (2026); the
// sentinel counts sit in the pelvic and para-aortic rows; the pTNM block follows Distant metastasis; HPV testing
// prints under Molecular findings. The morphology sentences describe only what is seen; their sources are in
// docs/reference/cervix-sources.md.

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/cervix.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { stripDot, letteredBlockKey, checks } from './_house.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
// Lower-case the first letter unless the word is an abbreviation in capitals ("HSIL", "AIS", "LEEP").
const lcw = (s) => (/^[A-Z]{2,}/.test(s || '') ? s : lc1(s));
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
// "an HPV-associated ...", "an LEEP" is not wanted: the letters of HPV are read aloud, LEEP is read as a word.
const article = (w) => (/^(?:[aeiou]|HPV\b)/i.test(w) ? 'an' : 'a');
const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// ---------- option strings (schemas/cervical_carcinoma.json carries the same lists) ----------

export const PROC = {
  loop: 'Loop excision (LEEP / LLETZ)',
  cone: 'Cone biopsy',
  simpleTrach: 'Simple trachelectomy',
  radicalTrach: 'Radical trachelectomy',
  simpleHyst: 'Simple hysterectomy',
  radicalHyst: 'Radical hysterectomy',
  exent: 'Pelvic exenteration',
  other: 'Other (specify)'
};
const HYST = [PROC.simpleHyst, PROC.radicalHyst];
const WITH_ADNEXA = [PROC.simpleHyst, PROC.radicalHyst, PROC.exent, PROC.radicalTrach];
const RADICAL = [PROC.radicalTrach, PROC.radicalHyst, PROC.exent];

export const HPVA_SCC = 'Squamous cell carcinoma, HPV-associated';
export const HPVI_SCC = 'Squamous cell carcinoma, HPV-independent';
export const SCC_NOS = 'Squamous cell carcinoma, NOS';
export const SCC_TYPES = [HPVA_SCC, HPVI_SCC, SCC_NOS];
export const HPVA_ADENO = 'Adenocarcinoma, HPV-associated';
const ADENO_NOS = 'Adenocarcinoma, NOS';
const HPVI_ADENO = ['Adenocarcinoma, HPV-independent, NOS', 'Adenocarcinoma, HPV-independent, gastric type', 'Adenocarcinoma, HPV-independent, clear cell type', 'Adenocarcinoma, HPV-independent, mesonephric type'];
const CARCINOSARCOMA = 'Carcinosarcoma (malignant mixed Mullerian tumour)';
const UNDETERMINED = 'Carcinoma, type cannot be determined';
const OTHER_TYPE = 'Other histologic type (specify)';
const HPV_INDEPENDENT = [HPVI_SCC, ...HPVI_ADENO];
const HPV_ASSOCIATED = [HPVA_SCC, HPVA_ADENO];

export const MARGIN = { clear: 'Uninvolved by invasive carcinoma', involved: 'Involved by invasive carcinoma', cannot: 'Cannot be assessed' };
export const PREC_NONE = 'Uninvolved by intraepithelial neoplasia';
export const HSIL_ADJ = 'High-grade squamous intraepithelial lesion (CIN 2 or 3)';
export const AIS_ADJ = 'Endocervical adenocarcinoma in situ';

// ---------- specimen ----------

/** The adnexa removed with a hysterectomy, as the specimen line names them: ['bilateral adnexa'], ['right ovary']. */
export function adnexaParts(v) {
  if (!WITH_ADNEXA.includes(v.procedure)) return [];
  const x = new Set(arr(v.additionalProcedures));
  const r = x.has('Right salpingo-oophorectomy'); const l = x.has('Left salpingo-oophorectomy');
  if (x.has('Bilateral salpingo-oophorectomy') || (r && l)) return ['bilateral adnexa'];
  const out = [];
  if (r) out.push('right adnexa');
  if (l) out.push('left adnexa');
  if (x.has('Bilateral salpingectomy')) out.push('bilateral fallopian tubes');
  else {
    if (x.has('Right salpingectomy') && !r) out.push('right fallopian tube');
    if (x.has('Left salpingectomy') && !l) out.push('left fallopian tube');
  }
  if (x.has('Right oophorectomy') && !r) out.push('right ovary');
  if (x.has('Left oophorectomy') && !l) out.push('left ovary');
  return out;
}

// As on the endometrial form: the adnexal procedures join the procedure ("radical hysterectomy and bilateral
// salpingo-oophorectomy"), the others follow "with" ("with omentectomy").
const ADNEXAL_PROC = /salpingo-oophorectomy|salpingectomy|oophorectomy/i;
const extraProcs = (v, adnexal) => (WITH_ADNEXA.includes(v.procedure) ? arr(v.additionalProcedures).filter((x) => ADNEXAL_PROC.test(x) === adnexal).map(lc1) : []);
const withExtras = (s, v) => {
  const adn = extraProcs(v, true); const other = extraProcs(v, false);
  return `${s}${adn.length === 1 ? ` and ${adn[0]}` : adn.length ? `, ${listJoin(adn)}` : ''}${other.length ? ` with ${listJoin(other)}` : ''}`;
};

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return uc1(typed);
  const p = v.procedure || '';
  if (HYST.includes(p)) {
    const adn = adnexaParts(v);
    const organ = `Uterus with cervix${adn.length === 1 ? ` and ${adn[0]}` : adn.length ? `, ${listJoin(adn)}` : ''}`;
    return withExtras(`${organ}, ${lc1(p)}`, v);
  }
  if (p === PROC.exent) return withExtras(`Pelvic exenteration${stripDot(v.exenterationOrgans) ? ` (${stripDot(v.exenterationOrgans)})` : ''}`, v);
  if (p === PROC.radicalTrach) return withExtras('Cervix, radical trachelectomy', v);
  if (p === PROC.simpleTrach) return 'Cervix, trachelectomy';
  if (p === PROC.loop) return 'Cervix, LEEP';
  if (p === PROC.cone) return 'Cervix, cone biopsy';
  if (p === PROC.other) return `Cervix, ${lcw(stripDot(v.procedureOther)) || 'excision'}`;
  return 'Cervix, excision';
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'cervix'); }

// ---------- site ----------

const QUADRANT = / quadrant \(.*\)$/;

/** " from 4 to 9 o'clock", " in the left superior (anterior) quadrant"; '' when no site is recorded. */
export function sitePhrase(v) {
  const sites = arr(v.tumourSite).filter((s) => s !== 'Not specified');
  const quads = sites.filter((s) => QUADRANT.test(s)).map((s) => s.replace(QUADRANT, '').toLowerCase());
  const bits = [];
  if (quads.length) bits.push(`in the ${listJoin(quads)} quadrant${quads.length > 1 ? 's' : ''}`);
  const other = sites.includes(PROC.other) ? stripDot(v.tumourSiteOther) : '';
  if (other) {
    if (/\d/.test(other)) bits.push(`${/\bto\b|[-–]/.test(other) ? 'from' : 'at'} ${other}`);
    else bits.push(`at the ${lc1(other).replace(/^the\s+/i, '')}`);
  }
  return bits.length ? ` ${bits.join(' and ')}` : '';
}

export function siteValue(v) {
  return arr(v.tumourSite).map((s) => (s === PROC.other ? uc1(stripDot(v.tumourSiteOther)) || 'Other' : s)).join('; ');
}

// ---------- macro ----------

const MACRO_NOUN = {
  [PROC.loop]: 'LEEP', [PROC.cone]: 'cone biopsy', [PROC.simpleTrach]: 'trachelectomy', [PROC.radicalTrach]: 'radical trachelectomy',
  [PROC.simpleHyst]: 'simple hysterectomy', [PROC.radicalHyst]: 'radical hysterectomy', [PROC.exent]: 'pelvic exenteration'
};
const APPEARANCE = {
  'Exophytic tumour': 'an exophytic tumour',
  'Ulcerated tumour': 'an ulcerated tumour',
  'Endophytic / infiltrative tumour': 'an endophytic, infiltrative tumour'
};

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const tag = lettered(part, ctx) ? `(${part.label}) ` : '';
  const noun = MACRO_NOUN[v.procedure] || (v.procedure === PROC.other && lcw(stripDot(v.procedureOther))) || 'excision';
  const orient = stripDot(v.orientation);
  const bits = [`${tag}Received in formalin is ${article(noun)} ${noun} specimen${orient ? ` with ${orient}` : ''}.`];
  const dims = stripDot(v.specimenDims);
  if (dims) bits.push(`The specimen measures ${dims}${/^[\d.\s x×]+$/.test(dims) ? ' mm' : ''}.`);
  const app = APPEARANCE[v.lesionAppearance];
  if (app) {
    const ld = stripDot(v.lesionDims);
    bits.push(`There is ${app}${sitePhrase(v)}${ld ? ` measuring ${ld}${/mm$/.test(ld) ? '' : ' mm'}` : ''}.`);
  } else if (v.lesionAppearance === 'No macroscopic lesion') bits.push('No macroscopic lesion is seen.');
  if (stripDot(v.inking)) bits.push(`The margins are inked: ${stripDot(v.inking)}.`);
  if (v.radialSections === true) bits.push('Radially sectioned and embedded in a clockwise fashion.');
  const b = int(v.blocks);
  if (v.allEmbedded === true) bits.push(b ? `All embedded in ${plural(b, 'block', 'blocks')}.` : 'All embedded.');
  else if (b) bits.push(`Representative sections are taken in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

// ---------- type and morphology ----------

const isAdeno = (v) => /^Adenocarcinoma/.test(v.histType || '');
/** The noun on the margin lines: "invasive adenocarcinoma" for the adenocarcinomas (the user's wording), else "invasive carcinoma". */
const invasive = (v) => `invasive ${isAdeno(v) ? 'adenocarcinoma' : 'carcinoma'}`;

export function histTypeName(v) {
  const t = v.histType || '';
  if (t === OTHER_TYPE) return uc1(stripDot(v.histTypeOther)) || 'Histologic type not specified';
  if (t === UNDETERMINED && stripDot(v.histTypeOther)) return `${t} (${lc1(stripDot(v.histTypeOther))})`;
  if (t === HPVA_ADENO && v.adenoSubtype) return `${t}, ${lcw(v.adenoSubtype)}`;
  return t || 'Histologic type not specified';
}

const SENTENCE = {
  [HPVA_SCC]: 'HPV-associated squamous cell carcinoma',
  [HPVI_SCC]: 'HPV-independent squamous cell carcinoma',
  [SCC_NOS]: 'squamous cell carcinoma',
  [ADENO_NOS]: 'adenocarcinoma',
  [HPVA_ADENO]: 'HPV-associated adenocarcinoma',
  'Adenocarcinoma, HPV-independent, NOS': 'HPV-independent adenocarcinoma',
  'Adenocarcinoma, HPV-independent, gastric type': 'HPV-independent adenocarcinoma, gastric type',
  'Adenocarcinoma, HPV-independent, clear cell type': 'HPV-independent adenocarcinoma, clear cell type',
  'Adenocarcinoma, HPV-independent, mesonephric type': 'HPV-independent adenocarcinoma, mesonephric type',
  'Endometrioid carcinoma, NOS': 'endometrioid carcinoma',
  [CARCINOSARCOMA]: 'carcinosarcoma',
  'Carcinoma, unclassifiable (undifferentiated carcinoma)': 'undifferentiated carcinoma',
  'Neuroendocrine tumour, NOS': 'neuroendocrine tumour',
  'Neuroendocrine tumour, grade 1': 'grade 1 neuroendocrine tumour',
  'Neuroendocrine tumour, grade 2': 'grade 2 neuroendocrine tumour',
  'Neuroendocrine carcinoma, NOS': 'neuroendocrine carcinoma',
  [UNDETERMINED]: 'carcinoma of undetermined type'
};

/** The type as it reads in the histology sentence ("HPV-associated adenocarcinoma, intestinal type"). */
export function sentenceType(v) {
  const t = v.histType || '';
  const base = t === OTHER_TYPE ? lc1(stripDot(v.histTypeOther)) || 'carcinoma' : SENTENCE[t] || lc1(t) || 'carcinoma';
  if (t === HPVA_ADENO && v.adenoSubtype) return `${base}, ${lcw(v.adenoSubtype)}`;
  if (SCC_TYPES.includes(t) && v.sccPattern) return `${base} with a ${lc1(v.sccPattern)} pattern`;
  return base;
}

/** The type on the diagnosis line: the name in capitals up to the first comma, the qualifier as written; ", NOS" dropped. */
export function dxType(v) {
  const t = v.histType || '';
  if (t === CARCINOSARCOMA) return 'CARCINOSARCOMA';
  const name = (t === OTHER_TYPE ? uc1(stripDot(v.histTypeOther)) : t).replace(/, NOS$/, '') || 'CARCINOMA';
  const c = name.indexOf(', ');
  return c > 0 ? `${name.slice(0, c).toUpperCase()}${name.slice(c)}` : name.toUpperCase();
}

// What is seen, by pattern for squamous cell carcinoma, by subtype for HPV-associated adenocarcinoma and by type
// otherwise (docs/reference/cervix-sources.md). Unclassifiable carcinoma, carcinoma of undetermined type and the
// other types print the type alone.
export const PATTERN_MORPH = {
  Keratinising: 'Infiltrating irregular nests of atypical squamous cells show abundant eosinophilic cytoplasm, intercellular bridges and keratin pearls.',
  'Non-keratinising': 'Infiltrating nests and sheets of atypical squamous cells show intercellular bridges but no keratin pearls.',
  Basaloid: 'Well-defined nests of immature basaloid cells with scant cytoplasm and hyperchromatic nuclei show peripheral palisading and little keratinisation.',
  Papillary: 'Papillae with fibrovascular cores are lined by multilayered atypical squamous epithelium.',
  Warty: 'Atypical squamous epithelium with a warty, condyloma-like surface shows koilocytic atypia and keratinisation.',
  Verrucous: 'Well-differentiated squamous epithelium with marked acanthosis and minimal cytological atypia pushes into the stroma as broad, bulbous pegs.',
  'Lymphoepithelioma-like': 'Syncytial nests of undifferentiated cells with vesicular nuclei and prominent nucleoli lie in a dense lymphoplasmacytic infiltrate.'
};
const SCC_GENERIC = 'Irregular, anastomosing nests of atypical squamous cells infiltrate a desmoplastic stroma.';
export const SUBTYPE_MORPH = {
  'Usual type': 'Infiltrating glands are lined by columnar cells with mucin-depleted cytoplasm and enlarged, hyperchromatic nuclei, with apical mitotic figures and basal apoptotic bodies.',
  'Mucinous type, NOS': 'Infiltrating glands are lined by atypical columnar cells with abundant intracytoplasmic mucin.',
  'Intestinal type': 'Infiltrating glands are lined by atypical intestinal-type epithelium with goblet cells.',
  'Signet-ring cell type': 'Mucinous tumour cells, including signet-ring cells, infiltrate the stroma.',
  'Invasive stratified mucin-producing carcinoma (iSMC)': 'Solid infiltrative nests of stratified mucinous cells show peripheral nuclear palisading, apoptotic bodies and a neutrophilic infiltrate.',
  'Villoglandular type': 'Long, thin exophytic papillae with fibrovascular cores are lined by columnar cells with mild to moderate nuclear atypia.',
  'Micropapillary type': 'Small, tightly cohesive papillary groups of tumour cells lie within clear spaces.'
};
const ADENO_GENERIC = 'Irregular, angulated atypical glands infiltrate the cervical stroma.';
export const TYPE_MORPH = {
  [ADENO_NOS]: ADENO_GENERIC,
  'Adenocarcinoma, HPV-independent, NOS': ADENO_GENERIC,
  'Adenocarcinoma, HPV-independent, gastric type': 'Infiltrating glands are lined by columnar cells with abundant clear to pale eosinophilic cytoplasm and distinct cell borders.',
  'Adenocarcinoma, HPV-independent, clear cell type': 'Tubulocystic, papillary and solid growths of cells with clear to pale eosinophilic cytoplasm include hobnail cells.',
  'Adenocarcinoma, HPV-independent, mesonephric type': 'Small, back-to-back tubules lined by cuboidal cells contain eosinophilic, colloid-like secretions.',
  'Endometrioid carcinoma, NOS': 'Fused and cribriform tubular glands are lined by columnar cells with pseudostratified nuclei.',
  [CARCINOSARCOMA]: 'Carcinomatous and sarcomatous components are intimately admixed.',
  'Adenosquamous carcinoma': 'Malignant glandular and squamous components are intermixed.',
  'Adenoid basal carcinoma': 'Small nests and cords of bland basaloid cells with peripheral palisading infiltrate the stroma without a stromal reaction.',
  'Mucoepidermoid carcinoma': 'Nests of epidermoid, intermediate and mucous cells infiltrate the stroma.',
  'Neuroendocrine tumour, NOS': 'Nests and trabeculae of round to oval cells with finely granular chromatin infiltrate the stroma.',
  'Neuroendocrine tumour, grade 1': 'Nests and trabeculae of round to oval cells with finely granular chromatin infiltrate the stroma.',
  'Neuroendocrine tumour, grade 2': 'Nests and trabeculae of round to oval cells with finely granular chromatin infiltrate the stroma.',
  'Small cell neuroendocrine carcinoma': 'Sheets of small cells with scant cytoplasm and hyperchromatic, moulded nuclei show frequent mitoses, apoptotic bodies and necrosis.',
  'Large cell neuroendocrine carcinoma': 'Insular and trabecular growths of large atypical cells with eosinophilic cytoplasmic granules show frequent mitoses and extensive necrosis.'
};

export function typeMorphology(v) {
  if (SCC_TYPES.includes(v.histType)) return PATTERN_MORPH[v.sccPattern] || SCC_GENERIC;
  if (v.histType === HPVA_ADENO) return SUBTYPE_MORPH[v.adenoSubtype] || ADENO_GENERIC;
  return TYPE_MORPH[v.histType] || '';
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const what = sentenceType(v);
  const where = sitePhrase(v);
  let s = `Sections of the cervix show involvement by ${what}${where && /,| pattern$/.test(what) ? ',' : ''}${where}.`;
  const typed = stripDot(v.ihcOther);
  for (const x of [typeMorphology(v), typed ? `${uc1(typed)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

// ---------- microscopic elements ----------

export function procedureValue(v) {
  const p = v.procedure || '';
  if (!p) return 'Not specified';
  if (p === PROC.other) return uc1(stripDot(v.procedureOther)) || 'Other';
  if (p === PROC.exent && stripDot(v.exenterationOrgans)) return withExtras(`Pelvic exenteration (${stripDot(v.exenterationOrgans)})`, v);
  return withExtras(p, v);
}

const hysterectomyTypeValue = (v) => {
  if (!HYST.includes(v.procedure)) return '';
  const t = v.hysterectomyType || '';
  if (!t || t === 'Not specified') return '';
  return t === 'Other (specify)' ? uc1(stripDot(v.hysterectomyTypeOther)) : t;
};

function sizeItem(v) {
  const n = num(v.tumourSizeMm);
  const dims = stripDot(v.tumourDims);
  const mm = (s) => `${s}${/mm$/.test(s) ? '' : ' mm'}`;
  if (n !== null) {
    return { label: 'Tumour size', value: `${v.sizeAtLeast === true ? 'At least ' : ''}${fmt(n)} mm (greatest dimension)`, sub: dims ? [{ label: 'All dimensions', value: mm(dims) }] : [] };
  }
  if (stripDot(v.sizeReason)) return { label: 'Tumour size', value: `Cannot be determined (${lc1(stripDot(v.sizeReason))})` };
  if (dims) return { label: 'Tumour size', value: mm(dims) };
  return null;
}

const gradeValue = (v) => (v.grade && v.grade !== 'Not applicable' ? v.grade : '');

/** "Not more than 3 mm (deepest 1.9 mm, 7 o'clock)": the category follows the measurement when there is one. */
export function depthText(v) {
  if (v.doi === S.DOI.cannot) return `Cannot be determined${stripDot(v.doiReason) ? ` (${lc1(stripDot(v.doiReason))})` : ''}`;
  const mm = num(v.doiMm);
  const cat = mm !== null ? S.depthCategory(mm) : v.doi || '';
  if (!cat) return '';
  const bits = [mm !== null ? `${v.doiAtLeast === true ? 'at least' : 'deepest'} ${fmt(mm)} mm` : '', stripDot(v.doiSite)].filter(Boolean);
  return `${cat}${bits.length ? ` (${bits.join(', ')})` : ''}`;
}

function horizontalItem(v) {
  const h = v.horizontal || '';
  if (!h) return null;
  const mm = num(v.horizontalMm);
  let value = h;
  if (h === 'Specify (mm)') value = mm !== null ? `${fmt(mm)} mm` : '';
  else if (/^Estimated/.test(h) && mm !== null) value = `${h} (${fmt(mm)} mm)`;
  if (!value) return null;
  const blocks = /^(?:Specify|Estimated)/.test(h) ? stripDot(v.horizontalBlocks) : '';
  return { label: 'Horizontal extent of stromal invasion', value, sub: blocks ? [{ label: 'Number of blocks involved', value: blocks }] : [] };
}

const silvaValue = (v) => (v.histType === HPVA_ADENO ? v.silva || '' : '');

const EXT_PHRASE = {
  [S.EXT.corpus]: 'uterine corpus',
  [S.EXT.paraR]: 'right parametrium',
  [S.EXT.paraL]: 'left parametrium',
  [S.EXT.paraNs]: 'parametrium',
  [S.EXT.vaginaUpper]: 'upper two-thirds of the vagina',
  [S.EXT.vaginaLower]: 'lower one-third of the vagina',
  [S.EXT.vaginaNs]: 'vagina',
  [S.EXT.ovaryR]: 'right ovary',
  [S.EXT.ovaryL]: 'left ovary',
  [S.EXT.ovaryNs]: 'ovary',
  [S.EXT.tubeR]: 'right fallopian tube',
  [S.EXT.tubeL]: 'left fallopian tube',
  [S.EXT.tubeNs]: 'fallopian tube'
};
const NEGATIVE_EXT = [S.EXT.na, S.EXT.none, S.EXT.cannot];

/** "right parametrium and upper two-thirds of the vagina"; [] when nothing beyond the cervix is recorded. */
export function extensionPhrases(v) {
  const ext = arr(v.extension).filter((e) => !NEGATIVE_EXT.includes(e));
  const both = ext.includes(S.EXT.paraR) && ext.includes(S.EXT.paraL);
  const out = [];
  for (const e of ext) {
    if (both && e === S.EXT.paraL) continue;
    if (both && e === S.EXT.paraR) { out.push('both parametria'); continue; }
    if (e === S.EXT.other) { if (stripDot(v.extensionOther)) out.push(lcw(stripDot(v.extensionOther))); continue; }
    out.push(EXT_PHRASE[e] || lc1(e));
  }
  return out;
}

export function extensionValue(v) {
  const ext = arr(v.extension);
  if (!ext.length) return '';
  for (const e of NEGATIVE_EXT) if (ext.includes(e)) return e;
  const names = ext.map((e) => (e === S.EXT.other ? uc1(stripDot(v.extensionOther)) || 'Other' : e));
  return names.map((s, i) => (i ? lcw(s) : s)).join('; ');
}

// ---------- margins ----------

/** The margins the procedure has, in the QMH order (schemas/cervical_carcinoma.json shows the same ones). */
export function marginsFor(v) {
  const p = v.procedure || '';
  if (p === PROC.radicalTrach) return ['endo', 'vaginal', 'radial'];
  if (HYST.includes(p) || p === PROC.exent) return ['vaginal', 'radial'];
  if (p === PROC.other) return ['ecto', 'endo', 'vaginal', 'radial'];
  return ['ecto', 'endo', 'radial'];
}
export const MARGIN_LABEL = { ecto: 'Ectocervical margin', endo: 'Endocervical / lower uterine segment margin', vaginal: 'Vaginal cuff margin', radial: 'Radial (circumferential) margin' };
const MARGIN_WORD = { ecto: 'ectocervical', endo: 'endocervical', vaginal: 'vaginal cuff', radial: 'radial' };

export const precursorShown = (v) => arr(v.adjacent).some((a) => a === HSIL_ADJ || a === AIS_ADJ);
const status = (v, m) => v[`${m}Margin`] || MARGIN.clear;
const precursor = (v, m) => (m !== 'radial' && precursorShown(v) ? v[`${m}Precursor`] || PREC_NONE : '');
const precursorInvolved = (v, m) => /^Involved/.test(precursor(v, m));

// The Surgical margins line above names the tumour, so a margin row reads "Involved, 9 o'clock" or
// "7 o'clock, 4.5 mm" (location, distance: the user's cone report) without repeating it.
function marginValue(v, m) {
  const st = status(v, m); const site = stripDot(v[`${m}MarginSite`]); const d = num(v[`${m}MarginMm`]);
  let inv;
  if (st === MARGIN.involved) inv = `Involved${site ? `, ${site}` : ''}`;
  else if (st === MARGIN.cannot) inv = `Cannot be assessed${site ? ` (${lcw(site)})` : ''}`;
  else inv = d !== null ? [site, `${fmt(d)} mm`].filter(Boolean).join(', ') : `Uninvolved${site ? `, ${site}` : ''}`;
  const p = precursor(v, m);
  const psite = stripDot(v[`${m}PrecursorSite`]);
  const prec = !p ? '' : p === PREC_NONE ? p : `${p}${psite ? `, ${psite}` : ''}`;
  return [inv, lcw(prec)].filter(Boolean).join('; ');
}

function marginItems(v) {
  const ms = marginsFor(v);
  const sts = ms.map((m) => status(v, m));
  const cannot = ms.filter((m) => status(v, m) === MARGIN.cannot);
  let value;
  if (sts.includes(MARGIN.involved)) value = `Involved by ${invasive(v)}`;
  else if (cannot.length === ms.length) value = 'Cannot be assessed';
  else if (cannot.length) value = `Uninvolved by ${invasive(v)}; ${listJoin(cannot.map((m) => MARGIN_WORD[m]))} margin${cannot.length > 1 ? 's' : ''} cannot be assessed`;
  else value = `Uninvolved by ${invasive(v)}`;
  const sub = ms.map((m) => ({ label: MARGIN_LABEL[m], value: marginValue(v, m) }));
  if ([PROC.exent, PROC.other].includes(v.procedure) && stripDot(v.otherMargin)) sub.push({ label: 'Other margins', value: uc1(stripDot(v.otherMargin)) });
  return [{ label: 'Surgical margins', value, sub }];
}

const PREC_SHORT = (p) => p.replace(/^Involved by /, '');

/** "Margins clear", "Ectocervical margin involved by invasive carcinoma", "Margins clear of invasive carcinoma; HSIL (CIN 2-3) at the endocervical margin". */
export function marginClause(v) {
  const ms = marginsFor(v);
  const involved = ms.filter((m) => status(v, m) === MARGIN.involved);
  const cannot = ms.filter((m) => status(v, m) === MARGIN.cannot);
  const prec = ms.filter((m) => precursorInvolved(v, m)).map((m) => `${PREC_SHORT(precursor(v, m))} at the ${MARGIN_WORD[m]} margin`);
  const bits = [];
  if (involved.length) bits.push(`${uc1(listJoin(involved.map((m) => MARGIN_WORD[m])))} margin${involved.length > 1 ? 's' : ''} involved by ${invasive(v)}`);
  else if (cannot.length === ms.length) bits.push('Margins cannot be assessed');
  else if (prec.length || cannot.length) bits.push(`Margins clear of ${invasive(v)}`);
  else bits.push('Margins clear');
  if (cannot.length && cannot.length < ms.length) bits.push(`${listJoin(cannot.map((m) => MARGIN_WORD[m]))} margin${cannot.length > 1 ? 's' : ''} cannot be assessed`);
  return [...bits, ...prec].join('; ');
}

// ---------- lymph nodes and metastasis ----------

const REGIONS = [['pelvic', 'Pelvic', 'pelvic'], ['pa', 'Para-aortic', 'para-aortic']];

function regionItem(v, r, label) {
  const c = S.nodes(v, r);
  if (!c.examined) return null;
  const sn = c.sentinel ? ` (${c.sentinel >= c.examined ? 'sentinel' : `${c.sentinel} sentinel`})` : '';
  const value = `${c.examined} examined${sn}; ${c.positive ? `${c.positive} involved` : 'none involved'}`;
  const sub = [];
  if (c.macro) sub.push({ label: 'Macrometastasis (more than 2 mm)', value: plural(c.macro, 'node', 'nodes') });
  if (c.micro) sub.push({ label: 'Micrometastasis (more than 0.2 mm to 2 mm)', value: plural(c.micro, 'node', 'nodes') });
  if (c.itc) sub.push({ label: 'Isolated tumour cells only', value: plural(c.itc, 'node', 'nodes') });
  if (c.positive || c.itc) {
    if (stripDot(v[`${r}Sites`])) sub.push({ label: 'Site(s) with positive lymph nodes', value: uc1(stripDot(v[`${r}Sites`])) });
    const d = num(v[`${r}DepositMm`]);
    if (d !== null) sub.push({ label: 'Size of largest metastatic deposit', value: `${fmt(d)} mm` });
  }
  if (c.positive && v[`${r}Ene`]) sub.push({ label: 'Extranodal extension', value: v[`${r}Ene`] });
  return { label: `${label} lymph nodes`, value, sub };
}

export function nodeItems(v) {
  const items = REGIONS.map(([r, label]) => regionItem(v, r, label)).filter(Boolean);
  return items.length ? items : [{ label: 'Regional lymph nodes', value: 'None submitted' }];
}

/** "0 of 18 pelvic lymph nodes involved", "1 of 16 pelvic and 0 of 4 para-aortic lymph nodes involved". */
export function nodesPhrase(v) {
  const done = REGIONS.map(([r, , word]) => ({ r, word, c: S.nodes(v, r) })).filter((x) => x.c.examined);
  if (!done.length) return '';
  const sn = S.sentinelOnly(v) ? ' sentinel' : '';
  const one = done.length === 1 && done[0].c.examined === 1;
  let s = `${listJoin(done.map((x) => `${x.c.positive} of ${x.c.examined} ${x.word}`))}${sn} lymph node${one ? '' : 's'} involved`;
  const pos = done.reduce((a, x) => a + x.c.positive, 0);
  const itc = done.reduce((a, x) => a + x.c.itc, 0);
  if (!pos && itc) s += `; isolated tumour cells in ${plural(itc, 'node', 'nodes')}`;
  if (pos && done.some((x) => v[`${x.r}Ene`] === 'Present')) s += '; extranodal extension present';
  return s;
}

/**
 * The Distant metastasis line. The pM1 sites come first, the adnexa and omentum included when they are recorded
 * only under Other tissue / organ involvement (AJCC version 9 makes them pM1), so the line never reads
 * "Not identified" beside a pM1.
 */
export function metastasisValue(v) {
  const sites = S.m1Sites(v);
  if (sites.length) return listJoin(sites.map((s) => (s === S.METS.other ? stripDot(v.distantMetsOther) || 'other site' : s)).map((s, i) => (i ? lcw(s) : s)));
  const m = arr(v.distantMets);
  for (const x of [S.METS.na, S.METS.none, S.METS.cannot]) if (m.includes(x)) return x;
  return '';
}

// ---------- additional findings ----------

export function adjacentValue(v) {
  const a = arr(v.adjacent);
  if (!a.length) return '';
  if (a.includes('None identified')) return 'None identified';
  return a.map((s, i) => (i ? lc1(s) : s)).join('; ');
}

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const other = [
    v.postTherapy === true ? item('Treatment effect', v.treatmentEffect || '') : null,
    item('Other findings', uc1(stripDot(v.additionalFindings)))
  ].filter(Boolean);
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Hysterectomy type', hysterectomyTypeValue(v)),
      item('Tumour site', siteValue(v)),
      sizeItem(v)
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      item('Histologic grade', gradeValue(v)),
      item('p16 immunohistochemistry', v.p16 || ''),
      item('Depth of stromal invasion', depthText(v)),
      item('Depth of stromal invasion (proportion)', v.stromaThird || ''),
      horizontalItem(v),
      item('Silva pattern of invasion', silvaValue(v)),
      item('Other tissue / organ involvement', extensionValue(v)),
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
      item('Additional pathologic findings', adjacentValue(v) || (other.length ? '' : 'None identified')),
      ...other,
      stripDot(v.additionalNotes) ? { label: 'Additional notes', para: `${stripDot(v.additionalNotes)}.` } : null
    ] }
  ].map((s) => (s ? { ...s, items: s.items.filter(Boolean) } : null)).filter((s) => s && s.items.length);
  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- molecular findings ----------

/** HPV testing under Molecular findings; '' when not performed. */
export function molecular(part) {
  const v = part.values;
  const r = v.hpvPcr || 'Not performed';
  if (r === 'Not performed') return '';
  const g = stripDot(v.hpvGenotype);
  const value = r === 'High-risk HPV detected' && g ? `${r} (${g})` : r;
  return renderSynoptic([{ heading: 'HPV testing', items: [{ label: 'HPV PCR', value }] }], '');
}

// ---------- diagnosis ----------

/** The specimen line in capitals up to its first comma outside brackets: "CERVIX, cone biopsy:". */
function headOf(name) {
  let depth = 0;
  for (let i = 0; i < name.length; i += 1) {
    const ch = name[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    else if (ch === ',' && depth === 0) return `${name.slice(0, i).toUpperCase()}${name.slice(i)}`;
  }
  const b = name.indexOf(' (');
  return b > 0 ? `${name.slice(0, b).toUpperCase()}${name.slice(b)}` : name.toUpperCase();
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `${lettered(part, ctx) ? `(${part.label}) ` : ''}${headOf(specimenName(part))}:`;
  const ext = extensionPhrases(v);
  const clauses = [`${dxType(v)}${ext.length ? `, involving ${listJoin(ext.map((e) => (/^both /.test(e) ? e : `the ${e}`)))}` : ''}`, marginClause(v)];
  if (nodesPhrase(v)) clauses.push(nodesPhrase(v));
  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && st.tnm) clauses.push(`${st.tnm} (${st.edition})`);
  // The user's cone report: no stop between the clauses, a full stop after the last ("- Margins clear.").
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

// ---------- checks ----------

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic type not recorded.', 'histType');
  const ext = arr(v.extension);
  const confined = !ext.length || ext.every((e) => NEGATIVE_EXT.includes(e) || e === S.EXT.corpus);
  const band = S.depthBand(v);
  const size = num(v.tumourSizeMm);
  if (size === null && !stripDot(v.sizeReason) && ((confined && (band === 'b' || S.visible(v))) || ext.includes(S.EXT.vaginaUpper))) {
    warn('Tumour size not recorded: pT1b1 to pT1b3 and pT2a1 / pT2a2 need it.', 'tumourSizeMm');
  }
  const mm = num(v.doiMm);
  if (confined && v.doi !== S.DOI.cannot && mm === null && !v.doi && !S.visible(v)) warn('Depth of stromal invasion not recorded: pT1a1, pT1a2 and pT1b need it.', 'doiMm');
  if (v.doi && v.doi !== S.DOI.cannot && mm !== null && S.depthCategory(mm) !== v.doi) {
    warn(`The depth category chosen (${v.doi}) does not match the measurement (${fmt(mm)} mm is "${S.depthCategory(mm)}"): the report and pT follow the measurement.`, 'doi');
  }
  // Horizontal extent and lymphovascular invasion no longer change the category (FIGO 2018, AJCC version 9).
  if (confined && (band === 'a1' || band === 'a2') && !S.visible(v)) {
    const wide = v.horizontal === 'Estimated as greater than 7 mm' || (num(v.horizontalMm) !== null && num(v.horizontalMm) > 7);
    if (wide) info('Horizontal extent over 7 mm: it no longer changes the category (FIGO 2018, AJCC version 9); pT follows the depth.', 'horizontal');
    if (v.lvi === 'Present') info('Lymphovascular invasion does not change the category (FIGO 2018, AJCC version 9).', 'lvi');
  }
  // HPV status against the type: CAP Cervix 5.1.1.0 (Note C) accepts "NOS" only when p16 or HPV testing is not available.
  if (HPV_INDEPENDENT.includes(v.histType) && v.p16 === 'Positive') warn('p16 positive with an HPV-independent type: block-type p16 supports an HPV-associated carcinoma. Review the type.', 'p16');
  if (HPV_ASSOCIATED.includes(v.histType) && v.p16 === 'Negative') warn('p16 negative with an HPV-associated type: review the type, or confirm with HPV testing.', 'p16');
  if ((v.histType === SCC_NOS || v.histType === ADENO_NOS) && !v.p16 && (v.hpvPcr || 'Not performed') === 'Not performed') {
    info(`${v.histType}: p16 immunohistochemistry or HPV testing separates HPV-associated from HPV-independent carcinoma (CAP: NOS only when neither is available).`, 'p16');
  }
  if (HPV_INDEPENDENT.includes(v.histType) && v.hpvPcr === 'High-risk HPV detected') info('High-risk HPV detected with an HPV-independent type: check the type against the p16 result.', 'hpvPcr');
  if (HPV_ASSOCIATED.includes(v.histType) && v.hpvPcr === 'High-risk HPV not detected') info('High-risk HPV not detected in an HPV-associated carcinoma: check the type against the p16 result.', 'hpvPcr');
  if (v.histType === HPVA_ADENO && !v.silva) info('Silva pattern of invasion not recorded (HPV-associated adenocarcinoma).', 'silva');
  // Extent beyond the cervix in a hysterectomy or a radical procedure.
  if ((HYST.includes(v.procedure) || RADICAL.includes(v.procedure)) && !ext.length) warn('Other tissue / organ involvement not recorded: the parametrium and the vagina set pT2.', 'extension');
  // Margins.
  for (const m of marginsFor(v)) {
    if (status(v, m) === MARGIN.involved && !stripDot(v[`${m}MarginSite`])) warn(`${MARGIN_LABEL[m]} involved: give the location.`, `${m}MarginSite`);
    if (precursorInvolved(v, m) && !stripDot(v[`${m}PrecursorSite`])) warn(`${MARGIN_LABEL[m]} involved by intraepithelial neoplasia: give the location.`, `${m}PrecursorSite`);
  }
  // Nodes.
  for (const [r, label] of REGIONS) {
    const c = S.nodes(v, r);
    if (!c.examined) {
      if (c.macro || c.micro || c.itc) err(`${label} node counts are recorded but no node is examined.`, `${r}Examined`);
      continue;
    }
    const counted = c.positive + c.itc;
    if (counted > c.examined) err(`${label}: the node counts add up to ${counted}, more than the ${c.examined} examined.`, `${r}Examined`);
    if (c.sentinel > c.examined) err(`${label}: ${c.sentinel} sentinel nodes is more than the ${c.examined} examined.`, `${r}Sentinel`);
    const d = num(v[`${r}DepositMm`]);
    if (c.positive && d !== null) {
      if (d <= 0.2) warn(`${label}: the largest deposit is 0.2 mm or less, which is isolated tumour cells, yet nodes with metastasis are counted.`, `${r}DepositMm`);
      else if (d > 2 && !c.macro) warn(`${label}: the largest deposit (${fmt(d)} mm) is a macrometastasis, but none is counted.`, `${r}Macro`);
      else if (d <= 2 && c.macro) warn(`${label}: a macrometastasis is counted, but the largest deposit is ${fmt(d)} mm.`, `${r}DepositMm`);
    }
    if (c.positive && !v[`${r}Ene`]) info(`${label}: extranodal extension not recorded.`, `${r}Ene`);
  }
  const mets = arr(v.distantMets);
  if (mets.includes(S.METS.none) && S.m1Sites(v).length) {
    info(`Distant metastasis is "Not identified", but ${listJoin(S.m1Sites(v).map(lc1))} ${S.m1Sites(v).length > 1 ? 'are' : 'is'} recorded as involved: AJCC version 9 makes this pM1, and the report prints it under Distant metastasis.`, 'distantMets');
  }
  const anyNodes = REGIONS.some(([r]) => S.nodes(v, r).examined);
  if (!anyNodes && RADICAL.includes(v.procedure)) {
    info('No lymph nodes are recorded with a radical procedure, so pN is not assigned. Nodes sent as separate parts can be counted here, all parts together.', 'pelvicExamined');
  }
  // Staging.
  const st = staging(part, ctx);
  for (const note of st.notes || []) info(note);
  for (const l of S.referenceLines(v, st)) info(l);
  if (st.overridden && !stripDot(v.tnmOverrideReason)) warn('pTNM override has no reason.', 'tnmOverrideReason');
  if (v.postTherapy === true && !v.treatmentEffect) warn('After neoadjuvant therapy (y): record the treatment effect.', 'treatmentEffect');
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, molecular, diagnosis, validate, staging };
