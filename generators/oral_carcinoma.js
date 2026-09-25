// Oral cavity and oropharynx carcinoma resection generator — the synoptic form for squamous cell
// carcinoma and its variants in the oral cavity and oropharynx.
// Elements follow the QMH "HN-Lip and oral cavity" page (CAP Oral Cavity protocol v4.3.0.0) and, for an
// oropharyngeal site, the QMH "HN-HPV-Oropharynx" page (CAP HPV-Associated Squamous Cell Carcinoma of the
// Oropharynx v1.1.0.0), in the page order, with the house departures used by every synoptic template:
// the "- Tumour histology:" paragraph follows "- Histologic grade:", margin distances are in mm, British
// spelling throughout. Oral-only elements (depth of invasion, bone invasion, worst pattern of invasion,
// the high grade dysplasia margin) show for an oral cavity site; p16 and HPV PCR show for an oropharyngeal
// one. The engine keeps hidden values, so every element here is gated on the region as well.
//
// One template, two staging systems: src/staging/oral.js picks AJCC 8th edition for the oral cavity and
// AJCC 9th edition for an oropharyngeal carcinoma with a positive p16; an oropharyngeal carcinoma without
// one is HPV-independent and gets no pTNM (its protocol keeps its menu placeholder). pTNM prints only with
// `options.printPTNM`, stamped with the edition in use. Grade is not assigned to HPV-associated carcinoma
// (CAP HPV-associated oropharynx protocol).
//
// The morphology sentences describe only what is seen (docs/new-template-brief.md); their sources are in
// docs/reference/oral-morphology.md. House diagnosis wording from aggregate counts of the 2021-2026 biopsy
// export: "SQUAMOUS CELL CARCINOMA, moderately differentiated" on a synoptic line, as on the skin form.
// Wording is protected by tests/oral_carcinoma.test.js — change it only deliberately.

import { deriveTNM } from '../src/staging/index.js';
import * as S from '../src/staging/oral.js';
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
// "an HPV-associated ...": the letters are read aloud.
const article = (w) => (/^(?:[aeiou]|HPV\b)/i.test(w) ? 'an' : 'a');

// ---------- option strings (schemas/oral_carcinoma.json carries the same lists) ----------

export const ORAL_TYPES = [
  'Squamous cell carcinoma, conventional (keratinising)',
  'Squamous cell carcinoma, non-keratinising',
  'Adenosquamous carcinoma',
  'Basaloid squamous cell carcinoma',
  'Acantholytic squamous cell carcinoma',
  'Papillary squamous cell carcinoma',
  'Spindle cell (sarcomatoid) squamous cell carcinoma',
  'Verrucous carcinoma',
  'Carcinoma cuniculatum',
  'Lymphoepithelial carcinoma (non-nasopharyngeal)'
];
export const HPV_TYPES = [
  'Squamous cell carcinoma, non-keratinising, HPV-associated',
  'Squamous cell carcinoma, keratinising, HPV-associated',
  'Adenosquamous carcinoma, HPV-associated',
  'Ciliated adenosquamous carcinoma, HPV-associated',
  'Basaloid squamous cell carcinoma, HPV-associated',
  'Papillary squamous cell carcinoma, HPV-associated',
  'Spindle cell (sarcomatoid) squamous cell carcinoma, HPV-associated',
  'Lymphoepithelial carcinoma (non-nasopharyngeal), HPV-associated',
  'HPV-associated carcinoma, type cannot be determined'
];
export const NE_TYPES = [
  'Neuroendocrine tumour, grade 1',
  'Neuroendocrine tumour, grade 2',
  'Neuroendocrine tumour, grade 3',
  'Neuroendocrine carcinoma, small cell type',
  'Neuroendocrine carcinoma, large cell type',
  'Combined neuroendocrine carcinoma (specify the components)'
];
export const OTHER_TYPES = ['Carcinoma, type cannot be determined', 'Other histologic type not listed (specify)'];
const OTHER_TYPE = OTHER_TYPES[1];
const COMBINED_NE = NE_TYPES[5];
const CONVENTIONAL = ORAL_TYPES[0];
const LEC = [ORAL_TYPES[9], HPV_TYPES[7]];
/** Types that take no grade: HPV-associated carcinoma, neuroendocrine neoplasms (their own grade), verrucous. */
export const UNGRADED = [...HPV_TYPES, ...NE_TYPES, 'Verrucous carcinoma', 'Carcinoma cuniculatum'];
export const isHpvType = (t) => HPV_TYPES.includes(t);

export const PROCEDURES = ['Wide local excision', 'Partial glossectomy', 'Hemiglossectomy', 'Subtotal or total glossectomy', 'Marginal mandibulectomy', 'Segmental mandibulectomy', 'Partial maxillectomy', 'Palatectomy', 'Composite resection', 'Transoral resection', 'Tonsillectomy', 'Neck dissection', 'Other (specify)', 'Not specified'];
const BONE_PROCEDURES = ['Marginal mandibulectomy', 'Segmental mandibulectomy', 'Partial maxillectomy', 'Composite resection'];
export const ENE = ['Not identified', 'Present, major (more than 2 mm from the capsule)', 'Present, minor (2 mm or less from the capsule)', 'Present, less than 1 mm from the capsule', 'Cannot be determined'];
export const PNI = ['Not identified', 'Present', 'Present, intratumoural', 'Present, extratumoural', 'Present, intraneural (size of nerve)', 'Cannot be determined'];
const PNI_INTRANEURAL = PNI[4];
export const MARGIN_INV = ['All margins negative for invasive tumour', 'Margin(s) involved by invasive tumour (specify)', 'Cannot be assessed'];
export const MARGIN_HGD = ['Uninvolved by high grade dysplasia / carcinoma in situ', 'Involved by high grade dysplasia / carcinoma in situ (specify)', 'Cannot be assessed'];
const METS_SITES = ['Non-regional lymph node(s)', 'Lung', 'Liver', 'Bone', 'Brain', 'Other (specify)'];

// ---------- specimen and site ----------

const oral = (v) => S.region(v) === 'oral';
const oro = (v) => S.region(v) === 'oro';

// Site words as they read after the laterality ("left lower alveolus"); the rest are lower-cased.
const SITE_PHRASE = {
  'Tongue (anterior two thirds)': 'tongue',
  'Lower alveolus and gingiva': 'lower alveolus',
  'Upper alveolus and gingiva': 'upper alveolus',
  'Soft palate and uvula': 'soft palate',
  'Palatine tonsil': 'tonsil',
  'Not specified': ''
};

/** "left tongue", "floor of mouth (midline)"; '' when no site is recorded. */
export function siteText(v) {
  const s = v.tumourSite || '';
  let site = s === 'Other (specify)' ? stripDot(v.tumourSiteOther) : (s in SITE_PHRASE ? SITE_PHRASE[s] : lc1(s));
  if (!site) return '';
  site = lc1(site);
  const lat = v.laterality || '';
  if (lat === 'Right' || lat === 'Left') return `${lat.toLowerCase()} ${site}`;
  if (lat === 'Midline' || lat === 'Bilateral') return `${site} (${lat.toLowerCase()})`;
  return site;
}

/** A typed site in sentence case: "Left lateral tongue" and "LEFT LATERAL TONGUE" both read "left lateral tongue". */
const tidySite = (s) => (!s ? '' : /[a-z]/.test(s) ? (/^[A-Z][a-z]/.test(s) ? lc1(s) : s) : s.toLowerCase());

const siteWords = (v) => tidySite(stripDot(v.specimenName)) || siteText(v);

/** The synoptic site: "Tongue (anterior two thirds), left". */
function siteValue(v) {
  const s = v.tumourSite || '';
  const name = s === 'Other (specify)' ? stripDot(v.tumourSiteOther) || 'Other' : s;
  if (!name || name === 'Not specified') return 'Not specified';
  const lat = ['Right', 'Left', 'Midline', 'Bilateral'].includes(v.laterality) ? `, ${v.laterality.toLowerCase()}` : '';
  return `${uc1(name)}${lat}`;
}

export function procedureText(v) {
  const p = arr(v.procedure).filter((s) => s !== 'Not specified');
  if (!p.length) return 'Not specified';
  return listJoin(p.map((s, i) => {
    const t = s === 'Other (specify)' ? stripDot(v.procedureOther) || 'other procedure' : s;
    return i === 0 ? uc1(t) : lc1(t);
  }));
}

const PRIMARY = (s) => s !== 'Neck dissection' && s !== 'Not specified';

/** "partial glossectomy", "segmental mandibulectomy and neck dissection"; "resection" when none is named. */
export function procedurePhrase(v) {
  const p = arr(v.procedure).filter((s) => s !== 'Not specified');
  const words = p.map((s) => (s === 'Other (specify)' ? stripDot(v.procedureOther) : s)).filter(Boolean).map(lc1);
  if (!p.some(PRIMARY)) words.unshift('resection');
  return listJoin(words);
}

const regionWord = (v) => (oro(v) ? 'Oropharynx' : 'Oral cavity');

export function specimenName(part) {
  const v = part.values;
  const site = siteWords(v);
  return `${regionWord(v)}, ${site ? `${site}, ` : ''}${procedurePhrase(v)}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

// ---------- staging ----------

export function staging(part) { return deriveTNM(part.values, 'oral'); }

const staged = (v) => ['oral', 'hpv'].includes(S.system(v));

// ---------- macro ----------

const APPEARANCE = {
  'Ulcerated tumour': 'an ulcerated tumour',
  'Exophytic tumour': 'an exophytic tumour',
  'Endophytic tumour': 'an endophytic tumour',
  'Indurated area': 'an indurated area',
  'Scar (previous biopsy site)': 'a scar at the previous biopsy site'
};

/** "45 x 30 x 20 mm" from "45x30x20"; a typed unit is kept. */
function dimsText(s) {
  const t = stripDot(s).replace(/\s*[x×]\s*/gi, ' x ').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return /\b(?:mm|cm)$/i.test(t) ? t : `${t} mm`;
}

function primaryProcedure(v) {
  const p = arr(v.procedure).filter(PRIMARY);
  if (!p.length) return 'resection';
  const s = p[0];
  return s === 'Other (specify)' ? lc1(stripDot(v.procedureOther)) || 'resection' : lc1(s);
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = [];
  const proc = primaryProcedure(v);
  const dims = dimsText(v.specimenDims);
  s.push(`Received in formalin is ${article(proc)} ${proc} specimen${dims ? ` measuring ${dims}` : ''}.`);
  const o = stripDot(v.orientation);
  if (o) s.push(`The specimen is orientated: ${lc1(o)}.`);
  const where = siteWords(v);
  const lesion = dimsText(v.lesionDims);
  let t = `There is ${APPEARANCE[v.lesionAppearance] || 'a tumour'}${where ? ` in the ${where}` : ''}${lesion ? ` measuring ${lesion}` : ''}`;
  const m = num(v.macroMarginMm);
  if (m !== null) t += `, ${fmt(m)} mm from the closest${stripDot(v.macroMarginSite) ? ` (${lc1(stripDot(v.macroMarginSite))})` : ''} margin`;
  s.push(`${t}.`);
  if (v.inking === 'Margins inked (see block key)') s.push('The margins are inked.');
  if (v.decalcified === true && arr(v.procedure).some((x) => BONE_PROCEDURES.includes(x))) s.push('The bone is decalcified.');
  const blocks = int(v.blocks);
  const key = stripDot(v.blockKeyText) ? '; see block key' : '';
  s.push(`Representative sections are taken${blocks ? ` in ${blocks} block${blocks === 1 ? '' : 's'}` : ''}${key}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;

export function blockKey(part, ctx) {
  if (stripDot(part.values.blockKeyText)) return letteredBlockKey(part, ctx, { lettered });
  return '';
}

// ---------- type, grade, depth and extent ----------

export const histTypeName = (v) => {
  if (v.histType === OTHER_TYPE) return stripDot(v.histTypeOther) || 'Histologic type not specified';
  if (v.histType === COMBINED_NE) return `Combined neuroendocrine carcinoma${stripDot(v.histTypeOther) ? ` (${stripDot(v.histTypeOther)})` : ''}`;
  return v.histType || 'Histologic type not specified';
};

const SENTENCE_TYPE = {
  [CONVENTIONAL]: 'keratinising squamous cell carcinoma',
  'Squamous cell carcinoma, non-keratinising': 'non-keratinising squamous cell carcinoma',
  'Squamous cell carcinoma, non-keratinising, HPV-associated': 'HPV-associated non-keratinising squamous cell carcinoma',
  'Squamous cell carcinoma, keratinising, HPV-associated': 'HPV-associated keratinising squamous cell carcinoma',
  'HPV-associated carcinoma, type cannot be determined': 'HPV-associated carcinoma of undetermined type',
  'Carcinoma, type cannot be determined': 'carcinoma of undetermined type'
};

/** The type as it reads in the histology sentence. */
export function sentenceType(v) {
  const t = v.histType || '';
  if (SENTENCE_TYPE[t]) return SENTENCE_TYPE[t];
  if (isHpvType(t)) return `HPV-associated ${lc1(t.replace(/, HPV-associated$/, ''))}`;
  return lc1(histTypeName(v));
}

/** The type as it reads on the diagnosis line: the entity in capitals, "type cannot be determined" not. */
export function dxType(v) {
  const t = histTypeName(v);
  if (t === CONVENTIONAL) return 'SQUAMOUS CELL CARCINOMA';
  const m = /^(.*), type cannot be determined$/.exec(t);
  if (m) return `${m[1].toUpperCase()}, type cannot be determined`;
  return t.toUpperCase();
}

const gradeShort = (v) => {
  if (UNGRADED.includes(v.histType)) return '';
  const g = v.grade || '';
  if (!g || g === 'Not applicable' || /^GX,/.test(g)) return '';
  if (g === 'Other (specify)') return stripDot(v.gradeOther);
  return g.replace(/^G\d, /, '');
};

const gradeValue = (v) => {
  if (UNGRADED.includes(v.histType)) return '';
  const g = v.grade || '';
  if (!g || g === 'Not applicable') return '';
  if (g === 'Other (specify)') return stripDot(v.gradeOther) || 'Other';
  return g;
};

/** Depth for print: "8 mm", "at least 7 mm", "less than 1 mm", "cannot be determined (tangential sections)", ''. */
export function depthText(v) {
  if (!oral(v)) return '';
  const mode = v.doi || S.DOI.mm;
  const d = num(v.doiMm);
  const note = stripDot(v.doiNote);
  if (mode === S.DOI.mm) return d === null ? '' : `${fmt(d)} mm`;
  if (mode === S.DOI.least) return d === null ? '' : `at least ${fmt(d)} mm`;
  if (mode === S.DOI.lt1) return 'less than 1 mm';
  if (mode === S.DOI.cannot) return `cannot be determined${note ? ` (${lc1(note)})` : ''}`;
  if (mode === S.DOI.other) return note ? lc1(note) : '';
  return '';
}

const measuredDepth = (v) => {
  const d = depthText(v);
  return d && ![S.DOI.cannot, S.DOI.other].includes(v.doi || S.DOI.mm) ? d : '';
};

/** Structures beyond the primary site, each as [verb, object]: ['invades', 'the maxillary sinus']. */
function extentParts(v) {
  const picks = oral(v) ? arr(v.adjacent).filter((s) => S.ORAL_ADJACENT.includes(s) && s !== 'Not identified')
    : oro(v) ? arr(v.hpvExtent).filter((s) => S.HPV_EXTENT.includes(s) && s !== 'Not identified') : [];
  const out = [];
  const inv = picks.filter((s) => !/^Encases/.test(s) && !S.HPV_T3.includes(s)).map((s) => `the ${lc1(s)}`);
  const reach = picks.filter((s) => S.HPV_T3.includes(s)).map((s) => `the ${lc1(s)}`);
  if (inv.length) out.push(['invades', listJoin(inv)]);
  if (reach.length) out.push(['extends to', listJoin(reach)]);
  for (const s of picks.filter((x) => /^Encases/.test(x))) out.push(['encases', lc1(s.replace(/^Encases /, ''))]);
  return out;
}
const PARTICIPLE = { invades: 'invading', 'extends to': 'extending to', encases: 'encasing' };

function extentValue(v) {
  const bits = extentParts(v).map(([verb, obj]) => `${verb} ${obj}`);
  const typed = stripDot(v.extentNotes);
  if (typed) bits.push(lc1(typed));
  if (bits.length) return uc1(bits.join('; '));
  const list = oral(v) ? arr(v.adjacent) : oro(v) ? arr(v.hpvExtent) : [];
  if (!list.includes('Not identified')) return '';
  // Bone through the cortex is itself an adjacent structure (pT4a), so the row beside the bone
  // row must not read "no extension".
  return oral(v) && S.bonePresent(v) ? 'No other adjacent structure involved' : 'No extension beyond the primary site';
}

/** "invading to a depth of 8 mm", "invading the maxillary sinus"; '' when neither is recorded. */
export function invasionPhrase(v) {
  const bits = [];
  const d = measuredDepth(v);
  if (d) bits.push(`invading to a depth of ${d}`);
  for (const [verb, obj] of extentParts(v)) bits.push(`${PARTICIPLE[verb]} ${obj}`);
  return listJoin(bits);
}

// ---------- morphology ----------

const CONVENTIONAL_MORPH = {
  'G1, well differentiated': 'Infiltrating nests and cords of atypical squamous cells show abundant keratinisation, keratin pearls and intercellular bridges, with mild nuclear pleomorphism, in a desmoplastic stroma.',
  'G2, moderately differentiated': 'Infiltrating nests and cords of atypical squamous cells show intercellular bridges and focal keratinisation, with moderate nuclear pleomorphism, in a desmoplastic stroma.',
  'G3, poorly differentiated': 'Infiltrating nests, cords and single atypical squamous cells show little keratinisation, with marked nuclear pleomorphism and numerous mitoses, in a desmoplastic stroma.'
};
const CONVENTIONAL_UNGRADED = 'Infiltrating nests and cords of atypical squamous cells show keratinisation and intercellular bridges, in a desmoplastic stroma.';
const NONKERATINISING = 'Sheets and nests of cells with a high nuclear to cytoplasmic ratio, oval to spindled hyperchromatic nuclei and indistinct cell borders show little or no keratinisation.';
const ADENOSQUAMOUS = 'Squamous cell carcinoma is admixed with glandular structures lined by columnar cells, some containing intracytoplasmic mucin.';
const BASALOID = 'Lobules of crowded basaloid cells with hyperchromatic nuclei and scant cytoplasm show foci of abrupt squamous differentiation.';
const PAPILLARY = 'Exophytic papillae with thin fibrovascular cores are covered by immature atypical basaloid squamous cells, with invasion at the base.';
const SPINDLE = 'Fascicles and sheets of malignant spindle and pleomorphic cells lie beneath the surface epithelium.';
const LYMPHOEPITHELIAL = 'Syncytial sheets of undifferentiated cells with vesicular nuclei and prominent nucleoli lie in a dense lymphoplasmacytic infiltrate.';
const NET = 'Nests and trabeculae of uniform cells have round nuclei with finely granular chromatin.';

export const MORPHOLOGY = {
  'Squamous cell carcinoma, non-keratinising': NONKERATINISING,
  'Adenosquamous carcinoma': ADENOSQUAMOUS,
  'Basaloid squamous cell carcinoma': BASALOID,
  'Acantholytic squamous cell carcinoma': 'Nests of atypical squamous cells show acantholysis, forming pseudoglandular spaces that contain detached dyskeratotic cells.',
  'Papillary squamous cell carcinoma': PAPILLARY,
  'Spindle cell (sarcomatoid) squamous cell carcinoma': SPINDLE,
  'Verrucous carcinoma': 'The exophytic and endophytic, heavily keratinised squamous proliferation has broad, bulbous rete ridges that push into the stroma, with minimal cytological atypia.',
  'Carcinoma cuniculatum': 'Branching, keratin-filled crypts and burrows are lined by well-differentiated squamous epithelium with minimal cytological atypia.',
  'Lymphoepithelial carcinoma (non-nasopharyngeal)': LYMPHOEPITHELIAL,
  'Squamous cell carcinoma, non-keratinising, HPV-associated': NONKERATINISING,
  'Squamous cell carcinoma, keratinising, HPV-associated': 'Infiltrating nests of atypical squamous cells show keratinisation and intercellular bridges, in a desmoplastic stroma.',
  'Adenosquamous carcinoma, HPV-associated': ADENOSQUAMOUS,
  'Ciliated adenosquamous carcinoma, HPV-associated': 'Nests of non-keratinising squamous cells surround cystic spaces lined by ciliated columnar cells.',
  'Basaloid squamous cell carcinoma, HPV-associated': BASALOID,
  'Papillary squamous cell carcinoma, HPV-associated': PAPILLARY,
  'Spindle cell (sarcomatoid) squamous cell carcinoma, HPV-associated': SPINDLE,
  'Lymphoepithelial carcinoma (non-nasopharyngeal), HPV-associated': LYMPHOEPITHELIAL,
  'Neuroendocrine tumour, grade 1': NET,
  'Neuroendocrine tumour, grade 2': NET,
  'Neuroendocrine tumour, grade 3': NET,
  'Neuroendocrine carcinoma, small cell type': 'Sheets of small cells with scant cytoplasm, finely granular chromatin and nuclear moulding show numerous mitoses and necrosis.',
  'Neuroendocrine carcinoma, large cell type': 'Nests and trabeculae of large cells with moderate cytoplasm, vesicular chromatin and prominent nucleoli show numerous mitoses and necrosis.'
};

export function typeMorphology(v) {
  const t = v.histType || '';
  if (t === CONVENTIONAL) return CONVENTIONAL_MORPH[v.grade] || CONVENTIONAL_UNGRADED;
  return MORPHOLOGY[t] || '';
}

export const IHC_PHRASE = {
  'p40 positive': 'p40',
  'p63 positive': 'p63',
  'CK5/6 positive': 'CK5/6',
  'AE1/AE3 positive': 'AE1/AE3',
  'Synaptophysin positive': 'synaptophysin',
  'Chromogranin positive': 'chromogranin',
  'INSM1 positive': 'INSM1'
};

export function ihcPhrase(v) {
  const picks = arr(v.ihc).map((s) => IHC_PHRASE[s]).filter(Boolean);
  const typed = stripDot(v.ihcOther);
  const bits = [];
  if (picks.length) bits.push(`express ${listJoin(picks)}`);
  if (typed) bits.push(lc1(typed));
  return bits.length ? `The tumour cells ${listJoin(bits)}.` : '';
}

function eberSentence(v) {
  if (!LEC.includes(v.histType)) return '';
  if (v.eber === 'Positive') return 'EBER in situ hybridisation is positive in the tumour cells.';
  if (v.eber === 'Negative') return 'EBER in situ hybridisation is negative in the tumour cells.';
  return '';
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const what = [gradeShort(v), sentenceType(v)].filter(Boolean).join(' ');
  let s = `The tumour is ${article(what)} ${what}`;
  const inv = invasionPhrase(v);
  if (inv) s += `, ${inv}`;
  s += '.';
  for (const x of [typeMorphology(v), ihcPhrase(v), eberSentence(v)]) if (x) s += ` ${x}`;
  return s;
}

// ---------- microscopic elements ----------

export function sizeValue(v) {
  const size = S.sizeMm(v);
  return size === null ? 'Not recorded' : `${fmt(size)} mm (greatest dimension)`;
}

const focalityValue = (v) => {
  if (v.focality === 'Multiple foci (specify)') return `Multiple foci${stripDot(v.focalityDetail) ? ` (${stripDot(v.focalityDetail)})` : ''}`;
  if (v.focality === 'Cannot be determined') return 'Cannot be determined';
  return '';
};

function boneItem(v) {
  if (!oral(v)) return null;
  const b = v.boneInvasion || S.BONE.na;
  if (b === S.BONE.na) return null;
  if (b !== S.BONE.present) return { label: 'Bone invasion', value: b };
  const sub = [];
  if (v.bonePattern) sub.push({ label: 'Pattern', value: v.bonePattern });
  if (v.boneLevel) sub.push({ label: 'Level', value: v.boneLevel });
  return { label: 'Bone invasion', value: 'Present', sub };
}

function pniValue(v) {
  const p = v.pni || 'Not identified';
  if (p !== PNI_INTRANEURAL) return p;
  const d = num(v.pniNerveMm);
  return `Present, intraneural${d !== null ? ` (nerve ${fmt(d)} mm in diameter)` : ''}`;
}

const wpoiValue = (v) => (oral(v) && v.wpoi && v.wpoi !== 'Not assessed' ? v.wpoi : '');

const p16Value = (v) => (oro(v) ? v.p16 || 'Not recorded' : '');

function pcrValue(v) {
  if (!oro(v)) return '';
  const r = v.hpvPcr || 'Not performed';
  if (r === 'Not performed') return '';
  if (r === 'Positive') return `Positive${stripDot(v.hpvPcrDetail) ? ` (${stripDot(v.hpvPcrDetail)})` : ''}`;
  return r;
}

// ---------- margins ----------

const mm = (x) => { const n = num(x); return n === null ? '' : `${fmt(n)} mm`; };
const marginWord = (where) => {
  const w = lc1(where.replace(/^the /i, ''));
  return /\bmargins?\b/i.test(w) ? w : `${w} margin`;
};

function invasiveMarginItem(v) {
  const m = v.invasiveMargin || MARGIN_INV[0];
  if (m === MARGIN_INV[2]) return { label: 'Invasive tumour', value: 'Margins cannot be assessed' };
  if (m === MARGIN_INV[1]) {
    const where = stripDot(v.invasiveInvolvedDetail);
    return { label: 'Invasive tumour', value: `Involved${where ? ` (${where})` : ''}` };
  }
  const d = mm(v.closestMm);
  const sub = d ? [{ label: 'Closest margin', value: `${d}${stripDot(v.closestSite) ? ` (${stripDot(v.closestSite)})` : ''}` }] : [];
  return { label: 'Invasive tumour', value: 'All margins negative', sub };
}

function hgdMarginItem(v) {
  if (!oral(v)) return null;
  const m = v.hgdMargin || '';
  if (!m) return null;
  const d = stripDot(v.hgdDetail);
  const label = 'High grade dysplasia / carcinoma in situ';
  if (m === MARGIN_HGD[2]) return { label, value: 'Margins cannot be assessed' };
  if (m === MARGIN_HGD[1]) return { label, value: `Involved${d ? ` (${d})` : ''}` };
  return { label, value: `Margins uninvolved${d ? ` (closest ${d})` : ''}` };
}

function bedMarginItem(v) {
  const m = v.bedMargin || '';
  if (!m || m === 'Not applicable') return null;
  const d = stripDot(v.bedDetail);
  return { label: 'Tumour bed margins', value: `${m}${d ? ` (${d})` : ''}` };
}

/** The diagnosis-line margin clause. */
export function marginsPhrase(v) {
  const m = v.invasiveMargin || MARGIN_INV[0];
  if (m === MARGIN_INV[2]) return 'margins cannot be assessed';
  let s;
  if (m === MARGIN_INV[1]) {
    const where = stripDot(v.invasiveInvolvedDetail);
    s = `invasive carcinoma involves the ${where ? marginWord(where) : 'margin'}`;
  } else {
    const d = mm(v.closestMm);
    s = `completely excised${d ? ` (closest margin ${d}${stripDot(v.closestSite) ? `, ${lc1(stripDot(v.closestSite))}` : ''})` : ''}`;
  }
  if (oral(v) && v.hgdMargin === MARGIN_HGD[1]) {
    const where = stripDot(v.hgdDetail);
    s += `; high grade dysplasia involves the ${where ? marginWord(where) : 'margin'}`;
  }
  return s;
}

// ---------- lymph nodes and metastasis ----------

const involvedCount = (v) => int(v.nodesInvolved);

export function nodesItem(v) {
  const ex = int(v.nodesExamined);
  if (ex === null) return null;
  if (ex === 0) return { label: 'Regional lymph nodes', value: 'None submitted (0 examined)' };
  const inv = involvedCount(v);
  const sub = [];
  if (inv && inv > 0) {
    // QMH order on both pages: ENE, the largest deposit, the largest node, then laterality.
    const e = v.ene || '';
    const eMm = /^Present/.test(e) ? mm(v.eneMm) : '';
    sub.push({ label: 'Extranodal extension', value: e ? `${e}${eMm ? `; ${eMm}` : ''}` : 'Not recorded' });
    const dep = mm(v.largestDepositMm);
    if (dep) sub.push({ label: 'Size of largest metastatic deposit', value: `${dep}${stripDot(v.largestDepositSite) ? `, ${stripDot(v.largestDepositSite)}` : ''}` });
    const node = mm(v.largestNodeMm);
    if (node) sub.push({ label: 'Size of largest involved lymph node', value: `${node}${stripDot(v.largestNodeSite) ? `, ${stripDot(v.largestNodeSite)}` : ''}` });
    if (v.nodeLaterality) sub.push({ label: 'Laterality', value: v.nodeLaterality });
  }
  if (stripDot(v.nodeLevels)) sub.push({ label: 'By level', value: stripDot(v.nodeLevels) });
  return { label: 'Regional lymph nodes', value: inv === null ? `${ex} examined; involved not recorded` : `${ex} examined; ${inv} involved`, sub };
}

const ENE_SHORT = { [ENE[1]]: 'major', [ENE[2]]: 'minor', [ENE[3]]: 'less than 1 mm from the capsule' };

export function nodesPhrase(v) {
  const ex = int(v.nodesExamined);
  if (ex === null || ex === 0) return '';
  const inv = involvedCount(v) ?? 0;
  let s = `${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`;
  if (inv > 0 && /^Present/.test(v.ene || '')) s += `; extranodal extension present${ENE_SHORT[v.ene] ? ` (${ENE_SHORT[v.ene]})` : ''}`;
  return s;
}

export function metastasisValue(v) {
  const all = arr(v.distantMets);
  const d = stripDot(v.distantDetail);
  const kept = all.filter((s) => METS_SITES.includes(s));
  if (kept.length) return `${listJoin(kept.map((s) => (s === 'Other (specify)' ? 'other site' : s)).map((s, i) => (i ? lc1(s) : s)))}${d ? ` (${d})` : ''}`;
  if (all.includes('Cannot be determined')) return `Cannot be determined${d ? ` (${d})` : ''}`;
  if (all.includes('Not identified')) return 'Not identified';
  return '';
}

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureText(v)),
      item('Tumour site', siteValue(v)),
      item('Tumour size', sizeValue(v)),
      item('Tumour focality', focalityValue(v))
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      item('Histologic grade', gradeValue(v)),
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Depth of invasion', uc1(depthText(v))),
      item('Tumour extent', extentValue(v)),
      boneItem(v),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', pniValue(v)),
      item('Worst pattern of invasion', wpoiValue(v)),
      item('HPV status by p16 immunohistochemistry', p16Value(v)),
      item('HPV PCR', pcrValue(v))
    ] },
    { heading: 'Margins', items: [invasiveMarginItem(v), hgdMarginItem(v), bedMarginItem(v), item('Frozen section margins', stripDot(v.frozenMargins))] },
    { heading: 'Lymph nodes', items: [nodesItem(v)] },
    { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] },
    ctx?.options?.printPTNM && staged(v) ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    { heading: 'Additional findings', items: [
      v.postTherapy === true ? item('Treatment effect', stripDot(v.treatmentEffect)) : null,
      item('Additional notes', stripDot(v.additionalNotes)),
      !(v.postTherapy === true && stripDot(v.treatmentEffect)) && !stripDot(v.additionalNotes) ? { text: 'None identified' } : null
    ] }
  ].map((s) => (s ? { ...s, items: s.items.filter(Boolean) } : null)).filter((s) => s && s.items.length);
  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- diagnosis ----------

const upperHead = (spec) => { const c = spec.indexOf(', '); return c > 0 ? `${spec.slice(0, c).toUpperCase()}${spec.slice(c)}` : spec.toUpperCase(); };

const PNI_SHORT = { [PNI[2]]: 'intratumoural', [PNI[3]]: 'extratumoural', [PNI[4]]: 'intraneural' };

function boneClause(v) {
  if (!oral(v) || v.boneInvasion !== S.BONE.present) return '';
  if (v.boneLevel === S.BONE_LEVEL.medullary) return 'medullary bone invasion';
  if (v.boneLevel === S.BONE_LEVEL.cortical) return 'cortical bone erosion';
  return 'bone invasion present';
}

function p16Clause(v) {
  if (!oro(v)) return '';
  const p = v.p16 || '';
  const r = v.hpvPcr || 'Not performed';
  if (p === S.P16.pos) return r === 'Positive' ? 'p16 and HPV PCR positive' : r === 'Negative' ? 'p16 positive; HPV PCR negative' : 'p16 positive';
  if (p === S.P16.neg) return r === 'Positive' || r === 'Negative' ? `p16 negative; HPV PCR ${r.toLowerCase()}` : 'p16 negative';
  return '';
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `(${part.label}) ${upperHead(specimenName(part))}`;
  let clause = [dxType(v), gradeShort(v)].filter(Boolean).join(', ');
  const size = S.sizeMm(v);
  if (size !== null) clause += `, ${fmt(size)} mm`;
  const d = measuredDepth(v);
  if (d) clause += `, invading to a depth of ${d}`;
  const first = [clause];
  for (const [verb, obj] of extentParts(v)) first.push(`${PARTICIPLE[verb]} ${obj}`);
  first.push(boneClause(v));
  if (/^Present/.test(v.pni || '')) first.push(`perineural invasion present${PNI_SHORT[v.pni] ? ` (${PNI_SHORT[v.pni]})` : ''}`);
  if (v.lvi === 'Present') first.push('lymphovascular invasion present');
  first.push(p16Clause(v));
  first.push(marginsPhrase(v));
  const clauses = [`${first.filter(Boolean).join('; ')}; see synoptic report`];
  const np = nodesPhrase(v);
  if (np) clauses.push(np);
  const mets = arr(v.distantMets).filter((s) => METS_SITES.includes(s)).map((s) => (s === 'Other (specify)' ? stripDot(v.distantDetail) || 'other site' : lc1(s)));
  if (mets.length) clauses.push(`distant metastasis: ${listJoin(mets)}`);
  if (ctx?.options?.printPTNM && staged(v)) {
    const st = staging(part, ctx);
    clauses.push(`${st.tnm} (${st.edition})`);
  }
  return renderDiagnosis(head, clauses);
}

// ---------- validation ----------

// Staging notes the validator already states as a check of its own, or that describe the normal outcome.
const QUIET_NOTE = /^(Tumour size not recorded; pT|Tumour site not recorded|Depth of invasion not recorded as a measurement|Number of involved lymph nodes not recorded|Size of the largest metastatic deposit not recorded|TNM overridden)/;
const BONE_NOTE = /\s*Bone invasion is present without a level:[\s\S]*$/;

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn } = checks();
  const r = S.region(v);
  const sys = S.system(v);
  const st = staging(part, ctx);
  const t = v.histType || '';
  if (!t) err('Histologic type is required.', 'histType');
  if ((t === OTHER_TYPE || t === COMBINED_NE) && !stripDot(v.histTypeOther)) warn(`Histologic type "${t === OTHER_TYPE ? 'Other' : 'Combined'}" needs specifying.`, 'histTypeOther');
  if (t && !UNGRADED.includes(t) && !v.grade) warn('Histologic grade is not recorded.', 'grade');
  if (!v.tumourSite) err('Tumour site is required: it chooses the staging system (AJCC 8th oral cavity, AJCC 9th HPV-associated oropharynx).', 'tumourSite');
  else if (r === '') err('Choose the region for this site: oral cavity or oropharynx.', 'siteRegion');
  if (v.tumourSite === 'Other (specify)' && !stripDot(v.tumourSiteOther)) warn('Tumour site "Other" needs specifying.', 'tumourSiteOther');
  // p16 decides the oropharyngeal system; the type has to agree with it.
  if (r === 'oro' && !v.p16) err('Record p16 immunohistochemistry: a positive result stages an oropharyngeal carcinoma as HPV-associated (AJCC 9th edition).', 'p16');
  if (r === 'oro' && isHpvType(t) && v.p16 && v.p16 !== S.P16.pos) err('An HPV-associated type is recorded but p16 is not positive.', 'histType');
  if (r === 'oro' && v.p16 === S.P16.pos && t && !isHpvType(t) && !NE_TYPES.includes(t) && !OTHER_TYPES.includes(t)) warn('p16 is positive: choose the HPV-associated type.', 'histType');
  if (r === 'oral' && isHpvType(t)) warn('HPV-associated types are listed for the oropharynx; this is an oral cavity site.', 'histType');
  if (oro(v) && v.p16 === S.P16.pos && v.hpvPcr === 'Negative') warn('p16 positive with a negative HPV PCR: check the HPV status.', 'hpvPcr');
  if (sys === 'oroNeg' && stripDot(v.tnmOverride)) warn('No pTNM prints for an oropharyngeal carcinoma without a positive p16; the typed pTNM is not used.', 'tnmOverride');
  // Size and depth.
  const size = S.sizeMm(v);
  if (staged(v) && size === null && !st.overridden) err('pT cannot be assigned: record the tumour size (greatest dimension).', 'tumourSizeMm');
  if (r === 'oral' && !st.overridden && S.depthMm(v) === null) {
    if ([S.DOI.mm, S.DOI.least].includes(v.doi || S.DOI.mm)) err('Record the depth of invasion (mm): the oral cavity pT needs it.', 'doiMm');
    else warn('Depth of invasion is not a measurement; pT is not assigned.', 'doi');
  }
  const depth = r === 'oral' ? S.depthMm(v) : null;
  if (depth !== null && size !== null && depth > size) warn(`Depth of invasion (${fmt(depth)} mm) is greater than the tumour size (${fmt(size)} mm); check the measurements.`, 'doiMm');
  if (r === 'oral' && v.boneInvasion === S.BONE.present && !v.boneLevel) warn('Record the level of bone invasion: medullary invasion (through the cortex) is pT4a; superficial cortical erosion by a gingival primary is not.', 'boneLevel');
  // Margins.
  if (v.invasiveMargin === MARGIN_INV[1] && !stripDot(v.invasiveInvolvedDetail)) warn('Name the margin involved by invasive tumour.', 'invasiveInvolvedDetail');
  if (r === 'oral' && !v.hgdMargin) warn('Record the margin status for high grade dysplasia / carcinoma in situ.', 'hgdMargin');
  if (r === 'oral' && v.hgdMargin === MARGIN_HGD[1] && !stripDot(v.hgdDetail)) warn('Name the margin involved by high grade dysplasia.', 'hgdDetail');
  // Nodes.
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex !== null && inv !== null && inv > ex) err('More lymph nodes involved than examined.', 'nodesInvolved');
  if (ex && ex > 0 && inv === null) err('Number of involved lymph nodes is required when nodes are examined.', 'nodesInvolved');
  if (inv && inv > 0) {
    if (!v.ene) err('Extranodal extension is required for involved nodes: it decides pN.', 'ene');
    if (r === 'oral' && num(v.largestDepositMm) === null) err('Size of the largest metastatic deposit is required: pN turns on 30 mm and 60 mm.', 'largestDepositMm');
    if (r === 'oral' && !v.nodeLaterality) warn('Laterality of the involved nodes is not recorded; they are staged as ipsilateral.', 'nodeLaterality');
    if (v.nodeLaterality === S.NODE_LATERALITY.bi && inv < 2) warn('Bilateral nodal involvement needs at least two involved nodes.', 'nodesInvolved');
    const e = num(v.eneMm);
    if (e !== null && ((v.ene === ENE[1] && e <= 2) || (v.ene === ENE[2] && e > 2) || (v.ene === ENE[3] && e >= 1))) warn(`Extranodal extension of ${fmt(e)} mm does not match "${v.ene}".`, 'eneMm');
  }
  if (arr(v.distantMets).includes('Other (specify)') && !stripDot(v.distantDetail)) warn('Distant metastasis "Other" needs specifying.', 'distantDetail');
  for (const n of st.notes) {
    const note = n.replace(BONE_NOTE, '').trim();
    if (!note || QUIET_NOTE.test(note)) continue;
    if (!v.p16 && /^p16 immunohistochemistry not recorded/.test(note)) continue;
    warn(note);
  }
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
