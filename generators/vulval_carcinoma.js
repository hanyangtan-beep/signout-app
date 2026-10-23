// Vulval carcinoma resection — synoptic report (Phase 77, user request 2026-10-23).
//
// Elements and print order from the QMH Cancer Reporting Template GYN-Vulva
// (https://awiloqmh.github.io/CancerReportingTemplate/GYN-Vulva.html, saved as docs/reference/GYN-Vulva.html),
// with the options of CAP Vulva 5.1.0.0 (https://documents.cap.org/protocols/Vulva_5.1.0.0.REL_CAPCP.docx) and
// the ICCR vulva dataset, 2nd edition
// (https://www.iccr-cancer.org/wp-content/uploads/2024/09/ICCR-Vulva-2nd-ed-v2.1-bookmarked.pdf).
// Staging: src/staging/vulva.js, AJCC version 9 (the QMH page prints the AJCC 8th edition; the user chose
// version 9 on 2026-10-23). The stage group, which matches the FIGO 2021 stage, shows in Checks only.
//
// Departures from the QMH order, all from the house report rules: the tumour histology paragraph follows
// the histologic type; p16 and p53 immunohistochemistry are written into that paragraph (microscopy and
// immunohistochemistry in one paragraph) rather than printed as their own rows; HPV testing prints under
// Molecular findings; the adjacent epithelium prints under Additional findings; the depth-of-invasion method
// goes in the Comment. The morphology sentences describe only what is seen; their sources are in
// docs/reference/vulva-sources.md.

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/vulva.js';
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
const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;

// ---------- option strings (schemas/vulval_carcinoma.json carries the same lists) ----------

export const HPVA = 'Squamous cell carcinoma, HPV-associated';
export const HPVI = 'Squamous cell carcinoma, HPV-independent';
export const SCC_NOS = 'Squamous cell carcinoma, NOS';
export const SCC_TYPES = [HPVA, HPVI, SCC_NOS];
const BCC = 'Basal cell carcinoma, NOS';
const PAGET = 'Paget disease, extramammary (invasive)';
const BARTHOLIN = 'Bartholin gland carcinoma (specify the subtype)';
const OTHER_TYPE = 'Other histologic type (specify)';
// CAP Vulva 5.1.0.0 names the third precursor "vulvar aberrant maturation (VAM) / HPV-independent,
// p53-wild-type verruciform acanthotic vulvar intraepithelial neoplasia (HPVi (p53wt) vaVIN)".
export const PRECURSORS = ['HSIL (VIN 2)', 'HSIL (VIN 3)', 'Differentiated VIN (dVIN)', 'Vulvar aberrant maturation (VAM) / HPV-independent, p53-wild-type verruciform acanthotic VIN'];
const PAGET_IN_SITU = 'Paget disease (intraepithelial)';

// ---------- specimen and site ----------

/** "left labium majus", "clitoris", "labium majus and labium minus (bilateral)"; '' when none recorded. */
export function siteText(v) {
  const sites = arr(v.tumourSite).filter((s) => s !== 'Not specified')
    .map((s) => (s === 'Other (specify)' ? stripDot(v.tumourSiteOther) : s)).filter(Boolean).map(lc1);
  const lat = v.laterality || '';
  if (!sites.length) return lat === 'Right' || lat === 'Left' ? `${lat.toLowerCase()} vulva` : '';
  if (lat === 'Right' || lat === 'Left') return `${lat.toLowerCase()} ${listJoin(sites)}`;
  if (lat === 'Bilateral' || lat === 'Midline') return `${listJoin(sites)} (${lat.toLowerCase()})`;
  return listJoin(sites);
}

/** A typed site in sentence case: "Left labium majus" and "LEFT LABIUM MAJUS" both read "left labium majus". */
const tidySite = (s) => (!s ? '' : /[a-z]/.test(s) ? (/^[A-Z][a-z]/.test(s) ? lc1(s) : s) : s.toLowerCase());
// The specimen line: the typed name, else the site ("left labium majus"), else the side alone ("left").
// The line already opens with "Vulva", so a typed name that repeats it ("Vulva", "Vulva, left") loses
// that word.
const typedSite = (v) => tidySite(stripDot(v.specimenName)).replace(/^vulva[lr]?(?:\s*,\s*|\s+|$)/i, '');
const siteWords = (v) => typedSite(v) || siteText(v).replace(/ vulva$/, '');

export function procedurePhrase(v) {
  const p = v.procedure || '';
  if (!p || p === 'Not specified') return 'excision';
  if (p === 'Other (specify)') return lc1(stripDot(v.procedureOther)) || 'excision';
  return lc1(p);
}

export function specimenName(part) {
  const v = part.values;
  const site = siteWords(v);
  return `Vulva, ${site ? `${site}, ` : ''}${procedurePhrase(v)}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'vulva'); }

// ---------- macro ----------

const APPEARANCE = {
  'Ulcerated tumour': 'an ulcerated tumour',
  'Exophytic tumour': 'an exophytic tumour',
  'Plaque-like tumour': 'a plaque-like tumour',
  'Nodular tumour': 'a nodular tumour',
  'Ill-defined lesion': 'an ill-defined lesion'
};

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const tag = lettered(part, ctx) ? `(${part.label}) ` : '';
  const what = procedurePhrase(v);
  const dims = stripDot(v.specimenDims);
  // "a radical vulvectomy specimen", but "a wide excision specimen of vulva".
  const organ = /vulvectomy/.test(what) ? '' : ' of vulva';
  const bits = [`${tag}Received in formalin is ${article(what)} ${what} specimen${organ}${dims ? ` measuring ${dims} mm` : ''}.`];
  if (stripDot(v.orientation)) bits.push(`The specimen is orientated: ${stripDot(v.orientation)}.`);
  const app = APPEARANCE[v.lesionAppearance];
  if (app) {
    const site = siteText(v);
    const ld = stripDot(v.lesionDims);
    const d = num(v.macroMarginMm);
    const where = stripDot(v.macroMarginSite);
    let s = `There is ${app}${site ? ` on the ${site}` : ''}${ld ? ` measuring ${ld} mm` : ''}`;
    if (d !== null) s += `, ${fmt(d)} mm from the closest${where ? ` (${where})` : ''} margin`;
    bits.push(`${s}.`);
  } else if (v.lesionAppearance === 'No macroscopic lesion') {
    bits.push('No macroscopic lesion is seen.');
  }
  if (v.inking === 'Margins inked' || v.inking === 'Margins inked (see block key)') bits.push('The margins are inked.');
  const b = int(v.blocks);
  if (b) bits.push(`Representative sections are taken in ${b} block${b === 1 ? '' : 's'}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

// ---------- type and morphology ----------

export function histTypeName(v) {
  const t = v.histType || '';
  if (t === OTHER_TYPE) return stripDot(v.histTypeOther) || 'Histologic type not specified';
  if (t === BARTHOLIN) return `Bartholin gland carcinoma${stripDot(v.histTypeOther) ? ` (${lc1(stripDot(v.histTypeOther))})` : ''}`;
  return t || 'Histologic type not specified';
}

/** The type as it reads in the histology sentence. */
export function sentenceType(v) {
  const t = v.histType || '';
  if (t === HPVA) return 'HPV-associated squamous cell carcinoma';
  if (t === HPVI) return 'HPV-independent squamous cell carcinoma';
  if (t === SCC_NOS) return 'squamous cell carcinoma';
  if (t === BCC) return 'basal cell carcinoma';
  if (t === PAGET) return 'invasive extramammary Paget disease';
  if (t === 'Carcinoma, type cannot be determined') return 'carcinoma of undetermined type';
  if (t === 'Adenocarcinoma, NOS') return 'adenocarcinoma';
  if (t === 'Phyllodes tumour, borderline') return 'borderline phyllodes tumour';
  if (t === 'Phyllodes tumour, malignant') return 'malignant phyllodes tumour';
  return lc1(histTypeName(v));
}

/** The type on the diagnosis line, in capitals. */
export function dxType(v) {
  const t = histTypeName(v);
  if (t === 'Carcinoma, type cannot be determined') return 'CARCINOMA, type cannot be determined';
  return t.toUpperCase();
}

// What is seen, by pattern for squamous cell carcinoma and by type otherwise (docs/reference/vulva-sources.md).
export const PATTERN_MORPH = {
  Keratinising: 'Infiltrating nests and cords of atypical squamous cells show abundant eosinophilic cytoplasm, intercellular bridges and keratin pearls.',
  'Non-keratinising': 'Infiltrating nests and sheets of atypical squamous cells show intercellular bridges but no keratin pearls.',
  Basaloid: 'Infiltrating nests and sheets of basaloid squamous cells with scant cytoplasm and hyperchromatic nuclei lie in a desmoplastic stroma, with little keratinisation.',
  Warty: 'Papillary and infiltrating nests of atypical squamous cells show koilocytic atypia, multinucleation and prominent keratinisation.',
  Verrucous: 'Well-differentiated squamous epithelium with marked acanthosis and hyperkeratosis and minimal cytological atypia pushes into the stroma as broad, bulbous rete.'
};
const SCC_GENERIC = 'Infiltrating nests and cords of atypical squamous cells lie in a desmoplastic stroma.';
export const TYPE_MORPH = {
  [BCC]: 'Nests of basaloid cells with peripheral palisading and retraction from the surrounding stroma lie in the dermis.',
  'Adenocarcinoma, NOS': 'Infiltrating atypical glands lie in a desmoplastic stroma.',
  'Adenocarcinoma of anogenital mammary-like glands': 'Infiltrating glands and cords of atypical cuboidal and columnar cells lie in a desmoplastic stroma.',
  'Adenocarcinoma, intestinal type': 'Infiltrating glands are lined by atypical columnar cells with goblet cells.',
  [PAGET]: 'Large cells with abundant pale cytoplasm and prominent nucleoli lie singly and in nests in the epidermis and invade the dermis.',
  'Phyllodes tumour, borderline': 'Leaf-like clefts lined by epithelium lie in a cellular stroma.',
  'Phyllodes tumour, malignant': 'Leaf-like clefts lined by epithelium lie in a markedly cellular stroma with marked stromal atypia.'
};

export function typeMorphology(v) {
  if (SCC_TYPES.includes(v.histType)) return PATTERN_MORPH[v.pattern] || SCC_GENERIC;
  return TYPE_MORPH[v.histType] || '';
}

const P16 = {
  'Block-type positive': 'p16 shows diffuse block-type staining',
  Negative: 'p16 is negative',
  'Patchy, non-block-type': 'p16 shows patchy, non-block-type staining'
};
const P53 = {
  'Wild-type pattern': 'p53 shows a wild-type pattern',
  'Wild-type, mid-epithelial (basal sparing) pattern': 'p53 shows a wild-type, mid-epithelial pattern with basal sparing',
  'Abnormal, basal overexpression': 'p53 shows an abnormal pattern of basal overexpression',
  'Abnormal, parabasal / diffuse overexpression': 'p53 shows an abnormal pattern of parabasal and diffuse overexpression',
  'Abnormal, null': 'p53 shows an abnormal null pattern',
  'Abnormal, cytoplasmic': 'p53 shows an abnormal cytoplasmic pattern'
};

/** "On immunohistochemistry, p16 is negative and p53 shows an abnormal pattern of basal overexpression." */
export function ihcSentence(v) {
  const bits = [];
  if (P16[v.p16]) bits.push(P16[v.p16]);
  else if (v.p16 === 'Other (specify)' && stripDot(v.p16Other)) bits.push(`p16 ${lc1(stripDot(v.p16Other))}`);
  if (P53[v.p53]) bits.push(P53[v.p53]);
  else if (v.p53 === 'Other (specify)' && stripDot(v.p53Other)) bits.push(`p53 ${lc1(stripDot(v.p53Other))}`);
  return bits.length ? `On immunohistochemistry, ${listJoin(bits)}.` : '';
}

/** Depth of invasion applies to the staged types; a phyllodes tumour has none. */
const measured = (v) => (S.staged(v) ? S.depth(v) : null);

export function depthText(v) {
  if (!S.staged(v)) return '';
  if (v.doi === 'Cannot be determined') return `Cannot be determined${stripDot(v.doiReason) ? ` (${lc1(stripDot(v.doiReason))})` : ''}`;
  const d = num(v.doiMm);
  if (d === null) return '';
  const c = num(v.doiConventionalMm);
  return `${fmt(d)} mm${c !== null ? ` (conventional method: ${fmt(c)} mm)` : ''}`;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const what = sentenceType(v);
  const pat = SCC_TYPES.includes(v.histType) && v.pattern ? ` with a ${lc1(v.pattern)} pattern` : '';
  const d = measured(v);
  let s = `The tumour is ${article(what)} ${what}${pat}`;
  if (d !== null) s += `, invading to a depth of ${fmt(d)} mm`;
  s += '.';
  const typed = stripDot(v.ihcOther);
  for (const x of [typeMorphology(v), ihcSentence(v), typed ? `${uc1(typed)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

// ---------- microscopic elements ----------

export function siteValue(v) {
  const s = siteText(v);
  return s ? uc1(s) : 'Not specified';
}

export function procedureValue(v) {
  const p = v.procedure || '';
  if (!p) return 'Not specified';
  return p === 'Other (specify)' ? uc1(stripDot(v.procedureOther)) || 'Other' : p;
}

export function sizeValue(v) {
  const n = num(v.tumourSizeMm);
  return n === null ? 'Not recorded' : `${fmt(n)} mm (greatest dimension)`;
}

const gradeValue = (v) => (v.grade && v.grade !== 'Not applicable' ? v.grade : '');

const borderValue = (v) => (v.growthPattern === 'Other (specify)' ? uc1(stripDot(v.growthOther)) || 'Other' : v.growthPattern || '');

const EXT_PHRASE = {
  [S.EXT.vaginaLower]: 'lower one-third of the vagina',
  [S.EXT.vaginaUpper]: 'upper two-thirds of the vagina',
  [S.EXT.urethraLower]: 'lower one-third of the urethra',
  [S.EXT.urethraUpper]: 'upper two-thirds of the urethra',
  [S.EXT.anus]: 'anus',
  [S.EXT.bladder]: 'bladder mucosa',
  [S.EXT.rectum]: 'rectal mucosa',
  [S.EXT.bone]: 'pelvic bone'
};

/** "lower one-third of the urethra and anus"; [] when nothing beyond the vulva is recorded. */
function extensionPhrases(v) {
  return arr(v.extension).filter((e) => e !== S.EXT.none && e !== S.EXT.cannot)
    .map((e) => (e === S.EXT.other ? lc1(stripDot(v.extensionOther)) : EXT_PHRASE[e] || lc1(e))).filter(Boolean);
}

export function extensionValue(v) {
  const ext = arr(v.extension);
  if (!ext.length) return '';
  if (ext.includes(S.EXT.none)) return 'Not identified';
  if (ext.includes(S.EXT.cannot)) return 'Cannot be determined';
  return uc1(listJoin(extensionPhrases(v)));
}

// ---------- margins ----------

function marginValue(status, mm, site) {
  const d = num(mm); const where = stripDot(site);
  if (status === 'Uninvolved') {
    const bits = [d !== null ? `closest ${fmt(d)} mm` : '', where].filter(Boolean);
    return `Uninvolved${bits.length ? ` (${bits.join(', ')})` : ''}`;
  }
  if (status === 'Involved') return `Involved${where ? ` (${where})` : ''}`;
  return status || '';
}

const precursorsPresent = (v) => arr(v.adjacent).filter((s) => PRECURSORS.includes(s));
const pagetPresent = (v) => arr(v.adjacent).includes(PAGET_IN_SITU) || v.histType === PAGET;

/** "HSIL (VIN 3)", "dVIN": the short names the margin row carries. */
const PRECURSOR_SHORT = {
  'HSIL (VIN 2)': 'HSIL', 'HSIL (VIN 3)': 'HSIL', 'Differentiated VIN (dVIN)': 'dVIN',
  'Vulvar aberrant maturation (VAM) / HPV-independent, p53-wild-type verruciform acanthotic VIN': 'VAM / HPVi (p53wt) vaVIN'
};

function marginItems(v) {
  const what = S.staged(v) ? 'Invasive carcinoma' : 'Tumour';
  const out = [
    { label: `${what}, peripheral margin`, value: marginValue(v.peripheralMargin || 'Uninvolved', v.peripheralMarginMm, v.peripheralMarginSite) },
    { label: `${what}, deep margin`, value: marginValue(v.deepMargin || 'Uninvolved', v.deepMarginMm, v.deepMarginSite) }
  ];
  const prec = [...new Set(precursorsPresent(v).map((s) => PRECURSOR_SHORT[s]))];
  if (prec.length) out.push({ label: `Squamous precursor lesion (${listJoin(prec)})`, value: marginValue(v.precursorMargin || 'Uninvolved', v.precursorMarginMm, v.precursorMarginSite) });
  if (pagetPresent(v)) out.push({ label: 'Paget disease', value: marginValue(v.pagetMargin || 'Uninvolved', '', v.pagetMarginSite) });
  return out;
}

// ---------- lymph nodes and metastasis ----------

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const SAMPLING_SHORT = { [S.SAMPLING.sentinel]: 'sentinel lymph node biopsy', [S.SAMPLING.both]: 'sentinel lymph node biopsy and lymphadenectomy', [S.SAMPLING.dissection]: 'lymphadenectomy' };

/** "2 examined (sentinel lymph node biopsy); none involved", with the size bands and findings beneath. */
export function nodesItem(v) {
  const c = S.nodeCounts(v);
  if (!c.examined) return { label: 'Regional lymph nodes', value: 'None submitted' };
  const sn = int(v.nodesSentinel);
  const how = [SAMPLING_SHORT[v.nodeSampling] || '', v.nodeSampling === S.SAMPLING.both && sn ? `${sn} sentinel` : ''].filter(Boolean).join('; ');
  const value = `${c.examined} examined${how ? ` (${how})` : ''}; ${c.positive ? `${c.positive} involved` : 'none involved'}`;
  const sub = [];
  if (c.positive) {
    if (c.over5) sub.push({ label: 'Metastasis more than 5 mm', value: plural(c.over5, 'node', 'nodes') });
    if (c.mid) sub.push({ label: 'Metastasis more than 2 mm to 5 mm', value: plural(c.mid, 'node', 'nodes') });
    if (c.micro) sub.push({ label: 'Micrometastasis (more than 0.2 mm to 2 mm)', value: plural(c.micro, 'node', 'nodes') });
    const d = num(v.largestDepositMm);
    if (d !== null) sub.push({ label: 'Size of largest metastatic deposit', value: `${fmt(d)} mm` });
    const sites = arr(v.nodeSites).map((s) => (s === 'Other (specify)' ? stripDot(v.nodeSitesOther) || 'Other' : s));
    if (sites.length) sub.push({ label: 'Nodal sites with tumour', value: listJoin(sites.map((s, i) => (i ? lc1(s) : s))) });
  }
  if (c.itc) sub.push({ label: 'Isolated tumour cells only', value: plural(c.itc, 'node', 'nodes') });
  const found = arr(v.nodeFindings);
  if (c.positive && found.length) {
    const ene = found.includes(S.NODE_FINDINGS.ene) ? 'Present' : found.includes(S.NODE_FINDINGS.cannot) ? 'Cannot be determined' : 'Not identified';
    sub.push({ label: 'Extranodal extension', value: ene });
    if (found.includes(S.NODE_FINDINGS.fixed)) sub.push({ label: 'Fixed or ulcerated nodes', value: 'Present' });
  }
  return { label: 'Regional lymph nodes', value, sub };
}

/** The diagnosis clause: "1 of 14 regional lymph nodes involved; extranodal extension present". */
export function nodesPhrase(v) {
  const c = S.nodeCounts(v);
  if (!c.examined) return '';
  const kind = v.nodeSampling === S.SAMPLING.sentinel ? 'sentinel' : 'regional';
  let s = `${c.positive} of ${c.examined} ${kind} lymph node${c.examined === 1 ? '' : 's'} involved`;
  const found = arr(v.nodeFindings);
  if (c.positive && found.includes(S.NODE_FINDINGS.ene)) s += '; extranodal extension present';
  if (c.positive && found.includes(S.NODE_FINDINGS.fixed)) s += '; fixed or ulcerated';
  if (!c.positive && c.itc) s += `; isolated tumour cells in ${plural(c.itc, 'node', 'nodes')}`;
  return s;
}

export function metastasisValue(v) {
  const m = arr(v.distantMets);
  if (!m.length) return '';
  if (m.includes(S.METS.none)) return 'Not identified';
  if (m.includes(S.METS.cannot)) return 'Cannot be determined';
  const names = m.map((s) => (s === S.METS.other ? stripDot(v.distantMetsOther) || 'other site' : s)).map((s, i) => (i ? lc1(s) : s));
  return listJoin(names);
}

// ---------- additional findings ----------

export function adjacentValue(v) {
  const a = arr(v.adjacent);
  if (!a.length || a.includes('None identified')) return '';
  return uc1(a.map((s, i) => (i && !/^(?:HSIL|LSIL|VIN|Paget|dVIN)/.test(s) ? lc1(s) : s)).join('; '));
}

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Tumour site', siteValue(v)),
      item('Tumour size', sizeValue(v)),
      item('Tumour focality', v.focality || '')
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Histologic grade', gradeValue(v)),
      item('Depth of invasion', depthText(v)),
      item('Tumour border', borderValue(v)),
      item('Other tissue / organ involvement', extensionValue(v)),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified')
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: [nodesItem(v)] } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] } : null,
    ctx?.options?.printPTNM && S.staged(v) ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    { heading: 'Additional findings', items: [
      item('Adjacent epithelium', adjacentValue(v)),
      v.postTherapy === true ? item('Treatment effect', v.treatmentEffect || '') : null,
      item('Other findings', uc1(stripDot(v.additionalFindings))),
      !adjacentValue(v) && !(v.postTherapy === true && v.treatmentEffect) && !stripDot(v.additionalFindings) ? { text: 'None identified' } : null
    ] }
  ].map((s) => (s ? { ...s, items: s.items.filter(Boolean) } : null)).filter((s) => s && s.items.length);
  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- molecular findings and comment ----------

/** HPV testing under Molecular findings; '' when not performed. */
export function molecular(part) {
  const v = part.values;
  const r = v.hpvPcr || 'Not performed';
  if (r === 'Not performed') return '';
  const g = stripDot(v.hpvGenotype);
  const value = r === 'High-risk HPV detected' && g ? `${r} (${g})` : r;
  return renderSynoptic([{ heading: 'HPV testing', items: [{ label: 'HPV PCR', value }] }], '');
}

/** The depth method, once per case, when a depth is recorded. */
export function comment(parts) {
  const any = (parts || []).some((p) => measured(p.values) !== null);
  return any ? 'Depth of invasion is measured by the FIGO 2021 method.' : '';
}

// ---------- diagnosis ----------

function marginClause(v) {
  const inv = [v.peripheralMargin || 'Uninvolved', v.deepMargin || 'Uninvolved'];
  if (inv.includes('Involved')) {
    const where = [v.peripheralMargin === 'Involved' ? 'peripheral' : '', v.deepMargin === 'Involved' ? 'deep' : ''].filter(Boolean).join(' and ');
    return `${S.staged(v) ? 'invasive carcinoma' : 'tumour'} involves the ${where} margin${where.includes(' and ') ? 's' : ''}`;
  }
  if (inv.includes('Cannot be assessed')) return 'margins cannot be assessed';
  const ds = [['peripheral', num(v.peripheralMarginMm)], ['deep', num(v.deepMarginMm)]].filter(([, d]) => d !== null);
  if (!ds.length) return 'completely excised';
  const [where, d] = ds.reduce((a, b) => (b[1] < a[1] ? b : a));
  return `completely excised (closest margin ${fmt(d)} mm, ${where})`;
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = (lettered(part, ctx) ? `(${part.label}) ` : '') + specimenName(part).replace(/^Vulva/, 'VULVA');
  const lead = [dxType(v)];
  const size = num(v.tumourSizeMm);
  if (size !== null) lead.push(`${fmt(size)} mm`);
  const d = measured(v);
  if (d !== null) lead.push(`invading to a depth of ${fmt(d)} mm`);
  const ext = extensionPhrases(v);
  if (ext.length) lead.push(`involving the ${listJoin(ext)}`);
  const atMargin = [];
  const prec = [...new Set(precursorsPresent(v).map((s) => PRECURSOR_SHORT[s]))];
  if (prec.length && v.precursorMargin === 'Involved') atMargin.push(`${listJoin(prec)} present at the margin${stripDot(v.precursorMarginSite) ? ` (${stripDot(v.precursorMarginSite)})` : ''}`);
  if (pagetPresent(v) && v.pagetMargin === 'Involved') atMargin.push(`Paget disease present at the margin${stripDot(v.pagetMarginSite) ? ` (${stripDot(v.pagetMarginSite)})` : ''}`);
  const clauses = [[lead.join(', '), marginClause(v), ...atMargin, 'see synoptic report'].join('; ')];
  if (nodesPhrase(v)) clauses.push(nodesPhrase(v));
  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && S.staged(v) && st.tnm) clauses.push(`${st.tnm} (${st.edition})`);
  const adj = arr(v.adjacent).filter((s) => s !== 'None identified');
  if (adj.length) clauses.push(`Background ${listJoin(adj.map((s) => (/^(?:HSIL|LSIL|VIN|Paget|dVIN)/.test(s) ? s : lc1(s))))}`);
  return renderDiagnosis(head, clauses);
}

// ---------- checks ----------

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic type not recorded.', 'histType');
  if (num(v.tumourSizeMm) === null) warn('Tumour size not recorded: pT1a and pT1b need it.', 'tumourSizeMm');
  if (v.doi !== 'Cannot be determined' && num(v.doiMm) === null && S.staged(v)) warn('Depth of invasion not recorded: pT1a and pT1b need it.', 'doiMm');
  const d = S.depth(v); const c = num(v.doiConventionalMm);
  if (d !== null && c !== null && c < d) warn('The conventional depth is smaller than the FIGO 2021 depth: the conventional method measures from the most superficial dermal papilla, so it is usually the larger.', 'doiConventionalMm');
  // HPV status against the type (ICCR: block-type p16 supports HPV association; almost all HPV-associated
  // carcinomas show wild-type p53).
  if (v.histType === HPVI && v.p16 === 'Block-type positive') warn('Block-type p16 with an HPV-independent type: block-type p16 supports an HPV-associated carcinoma. Review the type.', 'p16');
  if (v.histType === HPVA && ['Negative', 'Patchy, non-block-type'].includes(v.p16)) warn('p16 is not block-type in an HPV-associated carcinoma: review the type, or confirm with HPV testing.', 'p16');
  if (v.histType === HPVA && /^Abnormal/.test(v.p53 || '')) warn('Abnormal p53 with an HPV-associated type: almost all HPV-associated carcinomas show a wild-type pattern. Review the type and the p16 result.', 'p53');
  if (v.histType === SCC_NOS && !v.p16) info('Squamous cell carcinoma, NOS: p16 immunohistochemistry (with p53) separates HPV-associated from HPV-independent carcinoma.', 'p16');
  // HPV DNA and p16 can disagree (Rakislova et al., Int J Cancer 2017, https://onlinelibrary.wiley.com/doi/full/10.1002/ijc.31006),
  // so a mismatch with the type is information, not a warning.
  if (v.histType === HPVI && v.hpvPcr === 'High-risk HPV detected') info('High-risk HPV detected with an HPV-independent type: check the type against the p16 and p53 results.', 'hpvPcr');
  if (v.histType === HPVA && v.hpvPcr === 'High-risk HPV not detected') info('High-risk HPV not detected in an HPV-associated carcinoma: check the type against the p16 and p53 results.', 'hpvPcr');
  // Margins.
  if (v.peripheralMargin === 'Involved' && !stripDot(v.peripheralMarginSite)) warn('Peripheral margin involved: give the location.', 'peripheralMarginSite');
  if (v.deepMargin === 'Involved' && !stripDot(v.deepMarginSite)) warn('Deep margin involved: give the location.', 'deepMarginSite');
  // Nodes.
  const n = S.nodeCounts(v);
  if (n.examined) {
    const counted = n.positive + n.itc;
    if (counted > n.examined) err(`The node counts add up to ${counted}, more than the ${n.examined} examined.`, 'nodesExamined');
    if (!v.nodeSampling) warn('Lymph node sampling not recorded: sentinel only adds (sn), and a negative lymphadenectomy needs 6 or more nodes.', 'nodeSampling');
    const sn = int(v.nodesSentinel);
    if (sn !== null && sn > n.examined) err(`${sn} sentinel nodes is more than the ${n.examined} examined.`, 'nodesSentinel');
    const big = num(v.largestDepositMm);
    if (n.positive && big !== null) {
      const band = big > 5 ? 'over5' : big > 2 ? 'mid' : big > 0.2 ? 'micro' : 'itc';
      if (band === 'itc') warn('The largest deposit is 0.2 mm or less, which is isolated tumour cells, yet nodes with metastasis are counted.', 'largestDepositMm');
      else if (!n[band]) warn(`The largest deposit (${fmt(big)} mm) falls in a size band with no node counted.`, 'largestDepositMm');
      else if ((band === 'micro' && (n.mid || n.over5)) || (band === 'mid' && n.over5)) warn(`A node is counted in a larger size band than the largest deposit (${fmt(big)} mm).`, 'largestDepositMm');
    }
    if (n.positive && !arr(v.nodeFindings).length) warn('Additional lymph node findings not recorded: extranodal extension makes pN1c, fixed or ulcerated nodes pN2.', 'nodeFindings');
  } else if (S.staged(v) && d !== null && d > 1) {
    info('Invasion of more than 1 mm: CAP asks for regional lymph node evaluation. No nodes are recorded, so pN is not assigned.', 'nodesExamined');
  }
  // Staging.
  const st = staging(part, ctx);
  if (S.staged(v)) {
    for (const note of st.notes || []) info(note);
    for (const l of S.referenceLines(v, st)) info(l);
  } else {
    info('Phyllodes tumours are outside the CAP vulva protocol, which points to its breast phyllodes protocol: no pTNM is printed.', 'histType');
  }
  if (st.overridden && !stripDot(v.tnmOverrideReason)) warn('pTNM override has no reason.', 'tnmOverrideReason');
  if (v.postTherapy === true && !v.treatmentEffect) warn('After neoadjuvant therapy (y): record the treatment effect.', 'treatmentEffect');
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, molecular, comment, diagnosis, validate, staging };
