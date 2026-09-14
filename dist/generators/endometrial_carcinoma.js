// Endometrial carcinoma resection generator (third synoptic template).
// Elements mirror the QMH Cancer Reporting Template GYN-Endometrium page (CAP Carcinoma and
// Carcinosarcoma of the Endometrium 5.1.0.0, Dec-2024). AJCC 8th pTNM is derived by
// src/staging/endometrium.js and printed only with `options.printPTNM`; FIGO 2009 and FIGO 2023
// are derived for the Checks panel (info level) and are never written into the report.
// Pure functions: (part, ctx) -> string.
//
// Blocks produced:
//   specimens  "Uterus with cervix and bilateral adnexa, total hysterectomy and bilateral salpingo-oophorectomy"
//   macro      "The specimen consists of an intact uterus with cervix (165 g, 92 x 58 x 44 mm) …"
//   blockKey   the typed block key, one "(n) …" entry per line
//   synoptic   sectioned "- Element: value" list in QMH order (docs/specs/synoptic-layout.md) with the
//              "- Tumour histology:" paragraph after the grade; no stage unless `printPTNM`
//   diagnosis  specimen line, then one "- " clause per line
// There is no separate narrative microscopy paragraph. Wording is protected by
// tests/endometrial_carcinoma.test.js and tests/fixtures/endometrium - change it only deliberately.

import { deriveTNM, stageLine } from '../src/staging/index.js?v=mu10wmri';
import * as S from '../src/staging/endometrium.js?v=mu10wmri';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js?v=mu10wmri';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const stripDot = (s) => String(s || '').trim().replace(/[.;\s]+$/, '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const chosen = (list) => arr(list).filter((s) => !/^Not (identified|applicable|submitted)|^Cannot/.test(s));
const specify = (s) => String(s || '').replace(/\s*\((specify|explain)[^)]*\)\s*:?$/i, '').trim();

// ---------- specimen and procedure ----------

export function procedureName(v) {
  if (v.procedure === 'Other (specify)') return stripDot(v.procedureOther) || 'hysterectomy';
  return v.procedure || 'Total hysterectomy and bilateral salpingo-oophorectomy';
}

const withCervix = (v) => !/Supracervical/.test(v.procedure || '');

/** Adnexal phrase derived from the procedure and additional procedures ('bilateral adnexa', 'right adnexa', 'bilateral fallopian tubes', ''). */
export function adnexaPhrase(v) {
  const p = v.procedure || ''; const extra = arr(v.additionalProcedures);
  if (/bilateral salpingo-oophorectomy/i.test(p)) return 'bilateral adnexa';
  const r = extra.includes('Right salpingo-oophorectomy'); const l = extra.includes('Left salpingo-oophorectomy');
  if (r && l) return 'bilateral adnexa';
  if (r) return 'right adnexa';
  if (l) return 'left adnexa';
  if (extra.includes('Bilateral salpingectomy')) return 'bilateral fallopian tubes';
  return '';
}

export function specimenName(part) {
  const v = part.values;
  const typed = (v.specimenName || '').trim();
  if (typed) return typed;
  const adn = adnexaPhrase(v);
  const organ = `Uterus ${withCervix(v) ? 'with' : 'without'} cervix${adn ? ` and ${adn}` : ''}`;
  const proc = lc1(procedureName(v));
  const extras = arr(v.additionalProcedures).filter((x) => !/salpingo-oophorectomy|salpingectomy|washing/i.test(x)).map(lc1);
  return `${organ}, ${proc}${extras.length ? ` with ${listJoin(extras)}` : ''}`;
}

// ---------- histology ----------

export function histTypeName(v) {
  if (/Mixed cell|Other \(specify\)/.test(v.histType || '')) return stripDot(v.histTypeOther) || specify(v.histType) || 'Carcinoma';
  if (/^Carcinosarcoma/.test(v.histType || '')) return 'Carcinosarcoma';
  return v.histType || 'Endometrioid carcinoma';
}

// ---------- grade (derived by default) ----------

export const GRADE_DERIVE = 'Derive from the histologic type (and architecture / nuclear grade for endometrioid carcinoma)';
const HIGH_GRADE = 'High-grade (non-endometrioid carcinoma)';
const ENDOMETRIOID_LIKE = (v) => v.histType === S.ENDOMETRIOID || /^Mixed cell/.test(v.histType || '');
const solidGrade = (v) => (/^More than 50%/.test(v.solidPct || '') ? 3 : /^6-50%/.test(v.solidPct || '') ? 2 : 1);
const nuclear3 = (v) => /^Nuclear grade 3/.test(v.nuclearGrade || '');

/**
 * Grade derived from the histotype: endometrioid carcinoma from the solid non-squamous
 * proportion (architectural grade) raised by one for grade 3 nuclei; a mixed carcinoma and every
 * non-endometrioid type print as high grade; 'Other (specify)' histotypes have no derived grade.
 * Returns `{ grade, reason }`.
 */
export function derivedGrade(v) {
  if (!v.histType || v.histType === 'Other (specify)') return { grade: 'Cannot be assessed', reason: 'no derived grade for an "Other" histotype; pick the grade explicitly' };
  if (v.histType === S.ENDOMETRIOID) {
    const a = solidGrade(v); const g = Math.min(3, a + (nuclear3(v) ? 1 : 0));
    const solid = (v.solidPct || '5% or less').replace(/\s*\(.*\)$/, '').toLowerCase();
    return { grade: S[`GRADE_${g}`], reason: `solid non-squamous growth ${solid} (architectural grade ${a})${nuclear3(v) ? ', raised by one for grade 3 nuclei' : ', nuclear grade 1-2'}` };
  }
  if (/^Mixed cell/.test(v.histType)) return { grade: HIGH_GRADE, reason: 'a mixed carcinoma is graded by its highest-grade component, which is a high-grade non-endometrioid type by definition' };
  return { grade: HIGH_GRADE, reason: `${lc1(histTypeName(v))} is high grade by definition and is not FIGO graded` };
}

/** Grade used everywhere (picked value wins over the derived one). */
export const resolvedGrade = (v) => (v.grade && v.grade !== GRADE_DERIVE ? v.grade : derivedGrade(v).grade);
export const gradeIsDerived = (v) => !v.grade || v.grade === GRADE_DERIVE;

/** "; tumour confined to the endometrium" etc. after "Not identified" in the Myometrial invasion row (CAP wording). */
function noInvasionSuffix(v) {
  if (v.myoInvasion !== S.MYO_NONE) return '';
  const e = v.noInvasionExtent;
  if (e === undefined || e === null) return S.myoExtent(v) === 'polyp' ? '; tumour limited to an endometrial polyp' : '; tumour confined to the endometrium';
  if (e === S.NOINV_POLYP) return '; tumour limited to an endometrial polyp';
  if (e === S.NOINV_POLYP_AND_ENDOMETRIUM) return '; tumour in an endometrial polyp and the underlying endometrium';
  if (e === 'Cannot be determined') return '; extent cannot be determined';
  return '; tumour confined to the endometrium';
}

/** Short grade for prose and diagnosis: 'FIGO grade 1' | 'high grade' | typed | ''. */
export function gradeShort(v) {
  const g = resolvedGrade(v);
  const m = g.match(/^FIGO grade (\d)/);
  if (m) return `FIGO grade ${m[1]}`;
  if (/^High-grade/.test(g)) return 'high grade';
  if (g === 'Other (specify)') return stripDot(v.gradeOther);
  if (g === 'Cannot be assessed') return 'grade cannot be assessed';
  return '';
}

/** Grade as printed in the synoptic (QMH wording). */
export function gradeValue(v) {
  const g = resolvedGrade(v);
  if (g === 'Other (specify)') return stripDot(v.gradeOther) || 'Other';
  return g || 'Cannot be assessed';
}

// ---------- histologic description by type ----------

const ARCH_WORD = {
  Glandular: 'glandular', Villoglandular: 'villoglandular', Cribriform: 'cribriform', Papillary: 'papillary',
  'Solid (non-squamous)': 'solid', Microcystic: 'microcystic'
};
const DIFF_PHRASE = {
  'Squamous differentiation': 'squamous differentiation with morules and keratinising nests',
  'Mucinous differentiation': 'mucinous differentiation with intracytoplasmic mucin',
  'Secretory change': 'secretory change with subnuclear and supranuclear vacuoles',
  'Ciliated cells': 'ciliated cells lining part of the glands',
  'Sex cord-like elements': 'sex cord-like elements',
  'Spindle cell (sarcomatoid) areas': 'low-grade spindle cell (sarcomatoid) areas merging with the glandular component',
  'Corded and hyalinised (CHEC) pattern': 'a corded and hyalinised pattern with cords of epithelioid cells in a hyalinised stroma'
};
const TYPE_TEXT = {
  'Serous carcinoma': 'The tumour shows complex papillary and glandular architecture with slit-like spaces, epithelial budding and tufting, lined by cells with marked nuclear pleomorphism, hyperchromasia and prominent nucleoli; hobnail cells are present and mitotic activity is brisk with atypical forms.',
  'Clear cell carcinoma': 'The tumour shows an admixture of tubulocystic, papillary and solid patterns; the papillae have hyalinised cores and the tumour cells have clear to eosinophilic cytoplasm with hobnail nuclei showing moderate to marked atypia, with only modest mitotic activity.',
  'Dedifferentiated carcinoma': null,
  'Undifferentiated carcinoma': 'The tumour is composed of sheets of monotonous, discohesive small to intermediate-sized round to ovoid cells with vesicular nuclei and scant cytoplasm, without glandular, squamous or neuroendocrine differentiation; mitotic activity is brisk and there are areas of geographic necrosis. No low-grade endometrioid component is identified.',
  'Mesonephric-like adenocarcinoma': 'The tumour shows an admixture of tubular, glandular, papillary, ductal and solid growth patterns; the tubules contain dense eosinophilic intraluminal secretions and are lined by cuboidal to columnar cells with vesicular chromatin, nuclear grooves and overlapping nuclei resembling those of papillary thyroid carcinoma. Squamous and mucinous differentiation are absent.',
  'Squamous cell carcinoma, NOS': 'The tumour is composed of infiltrating nests and sheets of squamous cells with keratinisation and intercellular bridges, without any glandular, endometrioid or serous component.',
  'Gastric (gastrointestinal)-type carcinoma': 'The tumour is composed of glands lined by cells with abundant pale, clear to eosinophilic cytoplasm, distinct cell borders and basally located nuclei, with intracytoplasmic mucin and a deceptively bland infiltrative growth pattern with limited stromal response.',
  'Small cell neuroendocrine carcinoma': 'The tumour is composed of sheets, nests and trabeculae of small cells with scant cytoplasm, finely granular chromatin, inconspicuous nucleoli, nuclear moulding and crush artefact; mitotic activity is brisk with abundant apoptotic bodies and areas of necrosis.',
  'Large cell neuroendocrine carcinoma': 'The tumour shows organoid nests, trabeculae and sheets with peripheral palisading and rosette-like structures, composed of large cells with moderate to abundant cytoplasm, vesicular chromatin and prominent nucleoli; mitotic activity is high and there is geographic necrosis.'
};

/**
 * Type-specific histologic description, '' for 'Other (specify)'. For endometrioid-like types
 * the text continues the opening sentence ("Sections show an endometrioid carcinoma with …").
 */
export function histologyText(v) {
  const type = v.histType || S.ENDOMETRIOID;
  if (type === S.ENDOMETRIOID) {
    const arch = arr(v.architecture).map((a) => ARCH_WORD[a]).filter(Boolean);
    const archText = arch.length ? listJoin(arch) : 'glandular';
    const solid = (v.solidPct || '5% or less').replace(/\s*\(.*\)$/, '').toLowerCase();
    const nuclei = nuclear3(v) ? 'markedly pleomorphic, hyperchromatic nuclei with prominent nucleoli (nuclear grade 3)' : 'elongated, mildly to moderately atypical nuclei';
    const s = [`with a predominantly ${archText} architecture of confluent, back-to-back glands lined by stratified columnar cells with ${nuclei}; solid non-squamous growth makes up ${solid} of the tumour.`];
    const diff = arr(v.differentiation).map((d) => DIFF_PHRASE[d]).filter(Boolean);
    if (diff.length) s.push(`There is ${listJoin(diff)}.`);
    return s.join(' ');
  }
  if (/^Carcinosarcoma/.test(type)) {
    const carc = arr(v.csCarcinomatous).map(lc1);
    const carcText = carc.length ? `a high-grade carcinomatous component with ${listJoin(carc)} features` : 'a high-grade carcinomatous component';
    const sarc = v.csSarcomatous || 'Homologous (high-grade spindle cell sarcoma, NOS)';
    let sarcText;
    if (/^Homologous/.test(sarc)) sarcText = 'a homologous high-grade sarcomatous component of pleomorphic spindle cells';
    else if (/other or mixed/.test(sarc)) sarcText = `a heterologous sarcomatous component${stripDot(v.csSarcomatousDetail) ? ` with ${lc1(stripDot(v.csSarcomatousDetail))}` : ''}`;
    else sarcText = `a heterologous sarcomatous component with ${{ rhabdomyosarcoma: 'rhabdomyoblastic differentiation (rhabdomyosarcoma)', chondrosarcoma: 'malignant cartilage (chondrosarcoma)', osteosarcoma: 'malignant osteoid (osteosarcoma)', liposarcoma: 'lipoblastic differentiation (liposarcoma)' }[sarc.replace(/^Heterologous, /, '')]}`;
    return `The tumour is biphasic, composed of ${carcText} and ${sarcText}, with an abrupt transition between the two components.`;
  }
  if (type === 'Dedifferentiated carcinoma') {
    return `The tumour is biphasic: a ${v.ddLowGrade || 'FIGO grade 1 endometrioid carcinoma'} component is sharply juxtaposed with an undifferentiated component of sheets of monotonous, discohesive round to ovoid cells with vesicular nuclei, no glandular differentiation, brisk mitotic activity and necrosis.`;
  }
  if (/^Mixed cell/.test(type)) {
    const arch = arr(v.architecture).map((a) => ARCH_WORD[a]).filter(Boolean);
    return `The tumour is a mixed carcinoma of ${stripDot(v.histTypeOther) ? lc1(stripDot(v.histTypeOther)) : 'two distinct histotypes (specify)'}, each component showing the morphology characteristic of its type${arch.length ? `; the endometrioid component has a ${listJoin(arch)} architecture` : ''}.`;
  }
  return TYPE_TEXT[type] || '';
}

const INVASION_TEXT = {
  'Infiltrative glands with stromal response': 'Myometrial invasion is by irregular infiltrative glands eliciting a stromal response',
  'Broad pushing (expansile) front': 'The tumour invades the myometrium with a broad pushing (expansile) front',
  'MELF (microcystic, elongated and fragmented) pattern': 'A MELF (microcystic, elongated and fragmented) pattern of invasion is present, with a fibromyxoid stromal reaction',
  'Adenomyosis-like (irregular islands without stromal response)': 'The invasive glands form irregular islands within the myometrium without a stromal response, adenomyosis-like in appearance',
  'Diffusely infiltrative single cells and cords': 'The tumour infiltrates the myometrium diffusely as single cells and cords'
};

// ---------- molecular ----------

const mmrLost = (v) => /^Loss|^Subclonal loss/.test(v.mmrIhc || '');
const p53Abnormal = (v) => /^Abnormal|^Subclonal abnormal/.test(v.p53 || '');
const poleMutated = (v) => /^Mutated/.test(v.pole || '');
const pending = (x) => x === 'Requested; result to follow';

/** Derived ProMisE class from the individual results (precedence POLE > MMR > p53). */
const notDone = (x) => !x || x === 'Not performed';
export function derivedPromise(v) {
  if (notDone(v.pole) && notDone(v.mmrIhc) && notDone(v.p53)) return 'Not performed';
  if (poleMutated(v)) return 'POLE-mutated carcinoma';
  if (mmrLost(v)) return 'Mismatch repair-deficient carcinoma';
  if (p53Abnormal(v)) return 'p53-abnormal carcinoma';
  if (pending(v.pole) || pending(v.mmrIhc) || pending(v.p53)) return 'Not classified (testing incomplete)';
  const intactMmr = /^Intact/.test(v.mmrIhc || '');
  const wtP53 = /^Normal/.test(v.p53 || '');
  if (intactMmr && wtP53) return 'No specific molecular profile (NSMP)';
  return 'Not classified (testing incomplete)';
}

/** The ProMisE label used for staging and printing (picked value wins over the derived one). */
export function resolvedPromise(v) {
  return v.promise && v.promise !== 'Derive from the results above' ? v.promise : derivedPromise(v);
}

const PROMISE_SHORT = {
  'POLE-mutated carcinoma': 'POLEmut', 'Mismatch repair-deficient carcinoma': 'MMRd', 'p53-abnormal carcinoma': 'p53abn',
  'No specific molecular profile (NSMP)': 'NSMP'
};
export const promiseShort = (v) => PROMISE_SHORT[resolvedPromise(v)] || null;

/** Values handed to the staging module: the resolved ProMisE label replaces the raw picker value. */
export const stagingValues = (v) => ({ ...v, promise: resolvedPromise(v), grade: resolvedGrade(v) });

export function ihcSentence(v) {
  const bits = []; const pend = [];
  if (v.mmrIhc && v.mmrIhc !== 'Not performed') {
    if (/^Intact/.test(v.mmrIhc)) bits.push('intact nuclear expression of MLH1, PMS2, MSH2 and MSH6');
    else if (/^Loss/.test(v.mmrIhc)) bits.push(`loss of nuclear expression of ${stripDot(v.mmrDetail) || 'mismatch repair protein(s)'} with retained expression of the remaining mismatch repair proteins`);
    else if (/^Subclonal loss/.test(v.mmrIhc)) bits.push(`subclonal loss of nuclear expression of ${stripDot(v.mmrDetail) || 'mismatch repair protein(s)'}`);
    else if (pending(v.mmrIhc)) pend.push('mismatch repair');
    else bits.push(`mismatch repair immunohistochemistry cannot be assessed${stripDot(v.mmrDetail) ? ` (${lc1(stripDot(v.mmrDetail))})` : ''}`);
  }
  if (v.p53 && v.p53 !== 'Not performed') {
    if (/^Normal/.test(v.p53)) bits.push('wild-type p53 staining');
    else if (/Overexpression/.test(v.p53)) bits.push('abnormal p53 staining (strong diffuse nuclear overexpression)');
    else if (/Null/.test(v.p53)) bits.push('abnormal p53 staining (null pattern with an internal positive control)');
    else if (/Cytoplasmic/.test(v.p53)) bits.push('abnormal p53 staining (cytoplasmic pattern)');
    else if (/^Subclonal/.test(v.p53)) bits.push(`subclonal abnormal p53 staining${stripDot(v.p53Detail) ? ` (${lc1(stripDot(v.p53Detail))})` : ''}`);
    else if (pending(v.p53)) pend.push('p53');
    else bits.push(`p53 staining cannot be determined${stripDot(v.p53Detail) ? ` (${lc1(stripDot(v.p53Detail))})` : ''}`);
  }
  if (stripDot(v.otherIhc)) bits.push(stripDot(v.otherIhc));
  const parts = [];
  if (bits.length) parts.push(`Immunohistochemistry shows ${listJoin(bits)}`);
  if (pend.length) parts.push(`${listJoin(pend)} immunohistochemistry ${pend.length > 1 ? 'have' : 'has'} been requested (result${pend.length > 1 ? 's' : ''} to follow)`);
  if (v.msi && v.msi !== 'Not performed') parts.push(`microsatellite instability testing shows ${/^Cannot/.test(v.msi) ? 'an indeterminate result' : v.msi.replace(/\s*\(.*\)$/, '').replace('MSI-Stable', 'a microsatellite-stable (MSS) result').replace('MSI-High', 'a microsatellite instability-high (MSI-H) result').replace('MSI-Low', 'a microsatellite instability-low (MSI-L) result')}`);
  if (v.pole && v.pole !== 'Not performed') {
    if (/^Wild/.test(v.pole)) parts.push('POLE sequencing shows no exonuclease domain mutation');
    else if (poleMutated(v)) parts.push(`POLE sequencing shows a pathogenic exonuclease domain mutation${stripDot(v.poleDetail) ? ` (${stripDot(v.poleDetail)})` : ''}`);
    else if (pending(v.pole)) parts.push('POLE sequencing has been requested (result to follow)');
    else parts.push(`POLE status cannot be assessed${stripDot(v.poleDetail) ? ` (${lc1(stripDot(v.poleDetail))})` : ''}`);
  }
  const cls = resolvedPromise(v);
  const detail = stripDot(v.promiseDetail);
  if (cls === 'Not performed') { if (!bits.length && !parts.length) return ''; }
  else if (cls === 'Not classified (testing incomplete)') parts.push(parts.length ? 'the molecular classification awaits the outstanding results' : 'Molecular classification has not been performed');
  else if (cls === 'Double classifier (explain)') parts.push(`the tumour is a multiple classifier${detail ? ` (${lc1(detail)})` : ''}`);
  else parts.push(`the molecular class is ${cls.replace(' carcinoma', '').replace('No specific molecular profile (NSMP)', 'no specific molecular profile (NSMP)').replace('Mismatch repair-deficient', 'mismatch repair-deficient (MMRd)')}`);
  if (parts.length) parts[0] = uc1(parts[0]);
  return `${parts.join('; ')}.`;
}

// ---------- extent helpers ----------

export function myoPercent(v) {
  const p = num(v.myoPercent);
  if (p !== null) return p;
  const d = num(v.depthMm); const t = num(v.myoThicknessMm);
  return d !== null && t ? Math.round((d / t) * 100) : null;
}

/** Synoptic value for LVSI in QMH wording. */
export function lvsiValue(v) {
  const l = v.lvsi || 'Not identified'; const d = stripDot(v.lvsiDetail);
  if (l === S.LVSI_FOCAL) return `Present, focal (less than 5 vessels)${d ? ` (${d})` : ''}`;
  if (l === S.LVSI_SUBSTANTIAL) return `Present, extensive / substantial (5 or more vessels)${d ? ` (${d})` : ''}`;
  if (/^Equivocal/.test(l)) return `Equivocal${d ? ` (${d})` : ''}`;
  return l;
}

const regionName = { pelvic: 'pelvic', pa: 'para-aortic' };

export const metastasisSites = (v) => chosen(v.distantMets);
export function metastasisValue(v) {
  const sites = metastasisSites(v); const d = stripDot(v.distantDetail);
  if (!sites.length) return arr(v.distantMets).includes('Cannot be determined') ? 'Cannot be determined' : 'Not identified';
  return `${listJoin(sites.map(specify))}${d ? ` (${d})` : ''}`;
}

// ---------- staging ----------

export function staging(part) {
  return deriveTNM(stagingValues(part.values), 'endometrium');
}

// ---------- macro ----------

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const w = num(v.weight); const dims = stripDot(v.dimensions);
  const meas = [w !== null ? `${fmt(w)} g` : '', dims ? `${dims} mm` : ''].filter(Boolean).join(', ');
  const integrity = v.specimenIntegrity && v.specimenIntegrity !== 'Intact' ? (v.specimenIntegrity === 'Other (specify)' ? '' : `${lc1(v.specimenIntegrity)} `) : 'intact ';
  const adn = adnexaPhrase(v);
  const adnAttached = adn === 'bilateral adnexa' ? ' with attached right and left fallopian tubes and ovaries'
    : adn === 'right adnexa' ? ' with attached right fallopian tube and ovary' : adn === 'left adnexa' ? ' with attached left fallopian tube and ovary'
      : adn === 'bilateral fallopian tubes' ? ' with attached right and left fallopian tubes' : '';
  const ht = v.hysterectomyType && v.hysterectomyType !== 'Not specified' && v.hysterectomyType !== 'Other (specify)' ? ` from a ${lc1(v.hysterectomyType)} ${lc1(procedureName(v))}` : ` from a ${lc1(procedureName(v))}`;
  const s = [];
  s.push(`The specimen consists of an ${integrity}uterus ${withCervix(v) ? 'with' : 'without'} cervix${meas ? ` (${meas})` : ''}${adnAttached}${ht}.`);
  const cav = num(v.cavityLengthMm);
  const serosaMacro = v.serosaMacro && v.serosaMacro !== 'Other (specify)' ? `The serosa ${v.serosaMacro === 'Smooth and glistening' ? 'is smooth and glistening' : v.serosaMacro === 'Adhesions' ? 'shows adhesions' : v.serosaMacro === 'Tumour nodules' ? 'bears tumour nodules' : 'is disrupted'}.` : '';
  if (serosaMacro) s.push(serosaMacro);
  const size = num(v.tumourSizeMm); const dimsT = stripDot(v.tumourDims);
  const sizeText = dimsT ? `${dimsT} mm` : size !== null ? `${fmt(size)} mm` : stripDot(v.sizeCannot) ? `of indeterminate size (${lc1(stripDot(v.sizeCannot))})` : '';
  const growth = v.tumourGrowth && !/Not grossly|Cannot/.test(v.tumourGrowth) ? `${lc1(v.tumourGrowth).replace(/,.*$/, '')} ` : '';
  const site = v.tumourSite === 'Other (specify)' ? stripDot(v.tumourSiteDetail) || 'endometrium' : lc1(v.tumourSite || 'endometrium');
  const arising = v.tumourSite === 'Endometrial polyp' ? 'arising within an endometrial polyp' : `arising from the ${site}`;
  const siteDetail = v.tumourSite !== 'Other (specify)' ? stripDot(v.tumourSiteDetail) : '';
  if (v.tumourGrowth === 'Not grossly visible') s.push(`The endometrial cavity${cav !== null ? ` (${fmt(cav)} mm in length)` : ''} shows no grossly visible tumour${siteDetail ? `; the ${lc1(siteDetail)} is sampled in full` : ''}.`);
  else {
    const md = num(v.macroDepthMm); const mm = num(v.macroMyoMm);
    const inv = md !== null ? `, with invasion to a depth of ${fmt(md)} mm on sectioning${mm !== null ? ` where the myometrium measures ${fmt(mm)} mm` : ''}` : '';
    s.push(`The endometrial cavity${cav !== null ? ` (${fmt(cav)} mm in length)` : ''} contains a ${growth}tumour${sizeText ? ` measuring ${sizeText}` : ''} ${arising}${siteDetail ? ` (${lc1(siteDetail)})` : ''}${inv}.`);
  }
  s.push(stripDot(v.cervixMacro) ? `${uc1(stripDot(v.cervixMacro))}.` : `The ${withCervix(v) ? 'lower uterine segment and cervix are' : 'lower uterine segment is'} unremarkable.`);
  if (adn) s.push(stripDot(v.adnexaMacro) ? `${uc1(stripDot(v.adnexaMacro))}.` : `The ${adn === 'bilateral adnexa' ? 'fallopian tubes and ovaries are' : adn === 'bilateral fallopian tubes' ? 'fallopian tubes are' : 'fallopian tube and ovary are'} unremarkable.`);
  else if (stripDot(v.adnexaMacro)) s.push(`${uc1(stripDot(v.adnexaMacro))}.`);
  if (stripDot(v.otherMacro)) s.push(`${uc1(stripDot(v.otherMacro))}.`);
  return s.join(' ');
}

export function blockKey(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const lines = String(part.values.blockKeyText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((l) => {
    const m = l.match(/^\(?([\dA-Za-z]+(?:\s*[-–,]\s*[\dA-Za-z]+)*)\)?[\s.:)-]+(.*)$/);
    return m ? `(${m[1].replace(/\s+/g, '')}) ${stripDot(m[2])}.` : `${stripDot(l)}.`;
  }).join('\n');
}

// ---------- microscopy ----------

/**
 * The "- Tumour histology:" paragraph: architecture, cytology, differentiation, necrosis and
 * the pattern of myoinvasion only. Extent, LVSI, nodes, IHC, molecular and margins are
 * elements of their own and are not repeated here.
 */
export function histologyPara(v) {
  const type = histTypeName(v);
  const article = /^[AEIOU]/i.test(type) ? 'an' : 'a';
  const hist = histologyText(v);
  const s = [];
  if (ENDOMETRIOID_LIKE(v) && v.histType !== undefined && /^Mixed cell/.test(v.histType || '') === false && hist) s.push(`Sections show ${article} ${lc1(type)} ${hist}`);
  else { s.push(`Sections show ${article} ${lc1(type)}.`); if (hist) s.push(hist); }
  if (stripDot(v.microDescription)) s.push(`${uc1(stripDot(v.microDescription))}.`);
  s.push(v.tumourNecrosis === 'Present' ? 'Tumour necrosis is present.' : 'Tumour necrosis is not seen.');
  if (S.anyMyoinvasion(v) && INVASION_TEXT[v.invasionPattern]) s.push(`${INVASION_TEXT[v.invasionPattern]}.`);
  return s.join(' ');
}

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const extras = arr(v.additionalProcedures);
  const size = num(v.tumourSizeMm); const dimsT = stripDot(v.tumourDims);
  const sizeText = size !== null ? `${fmt(size)} mm in greatest dimension${dimsT ? ` (${dimsT} mm)` : ''}` : stripDot(v.sizeCannot) ? `Cannot be determined (${lc1(stripDot(v.sizeCannot))})` : 'Cannot be determined';
  const siteDetail = stripDot(v.tumourSiteDetail);
  const d = num(v.depthMm); const t = num(v.myoThicknessMm); const pct = myoPercent(v);
  const inv = chosen(v.otherInvolvement);
  const invDetail = stripDot(v.otherInvolvementDetail);
  const cx = v.cervix || 'Not identified';
  const cd = num(v.cervixDepthMm); const ct = num(v.cervixThicknessMm);
  const vm = v.vaginalMargin || 'Uninvolved by carcinoma'; const pm = v.parametrialMargin || 'Not applicable';
  const vmm = num(v.vaginalMarginMm); const pmm = num(v.parametrialMarginMm);
  const st = staging(part);
  const pole = v.pole && v.pole !== 'Not performed' ? (poleMutated(v) ? `Mutated${stripDot(v.poleDetail) ? ` (${stripDot(v.poleDetail)})` : ''}` : /^Cannot/.test(v.pole) ? `Cannot be assessed${stripDot(v.poleDetail) ? ` (${stripDot(v.poleDetail)})` : ''}` : v.pole) : 'Not performed';
  const mmr = v.mmrIhc && v.mmrIhc !== 'Not performed' ? `${specify(v.mmrIhc)}${stripDot(v.mmrDetail) ? ` (${stripDot(v.mmrDetail)})` : ''}` : 'Not performed';
  const p53 = v.p53 && v.p53 !== 'Not performed' ? `${specify(v.p53)}${stripDot(v.p53Detail) ? ` (${stripDot(v.p53Detail)})` : ''}` : 'Not performed';
  const cls = resolvedPromise(v);
  const findings = arr(v.additionalFindings).map((s) => (s === 'Other (specify)' ? stripDot(v.additionalFindingsOther) : s)).filter(Boolean);
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', `${procedureName(v)}${extras.length ? `; ${extras.map(lc1).join(', ')}` : ''}`),
      v.hysterectomyType && v.hysterectomyType !== 'Not specified' ? item('Hysterectomy type', v.hysterectomyType) : null,
      item('Specimen integrity', v.specimenIntegrity || 'Intact'),
      item('Tumour site', `${v.tumourSite === 'Other (specify)' ? siteDetail || 'Other' : v.tumourSite || 'Endometrium'}${v.tumourSite !== 'Other (specify)' && siteDetail ? ` (${siteDetail})` : ''}`),
      item('Tumour size', sizeText)
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', `${histTypeName(v)}${/Mixed cell/.test(v.histType || '') ? ' (mixed cell carcinoma)' : ''}`),
      item('Histologic grade', gradeValue(v)),
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Mismatch repair (MMR) immunohistochemistry', mmr),
      v.msi && v.msi !== 'Not performed' ? item('Microsatellite instability', specify(v.msi)) : null,
      item('p53 immunohistochemistry', p53),
      item('POLE status', pole),
      item('Molecular classification', cls === 'Double classifier (explain)' ? `Multiple classifier${stripDot(v.promiseDetail) ? ` (${stripDot(v.promiseDetail)})` : ''}` : cls),
      stripDot(v.otherIhc) ? item('Other immunohistochemistry', stripDot(v.otherIhc)) : null,
      { ...item('Myometrial invasion', `${specify(v.myoInvasion || 'Cannot be assessed')}${v.myoInvasion === 'Cannot be assessed (explain)' && stripDot(v.myoCannot) ? ` (${stripDot(v.myoCannot)})` : ''}${noInvasionSuffix(v)}`), sub: [
        d !== null ? item('Depth of myometrial invasion', `${fmt(d)} mm`) : null,
        t !== null ? item('Myometrial thickness', `${fmt(t)} mm`) : null,
        pct !== null ? item('Percentage of myometrial invasion', `${fmt(pct)}%`) : null
      ] },
      item('Adenomyosis', v.adenomyosis || 'Not identified'),
      item('Uterine serosa involvement', v.serosa || 'Not identified'),
      item('Lower uterine segment involvement', v.lus || 'Not identified'),
      { ...item('Cervical stromal involvement', specify(cx)), sub: [
        cx === 'Cervical stromal invasion' && cd !== null ? item('Depth of cervical stromal invasion', `${fmt(cd)} mm${ct !== null ? ` of ${fmt(ct)} mm` : ''}`) : null
      ] },
      item('Other tissue / organ involvement', inv.length ? `${inv.map(specify).join('; ')}${invDetail ? ` (${invDetail})` : ''}` : arr(v.otherInvolvement).some((s) => /^Cannot/.test(s)) ? `Cannot be determined${invDetail ? ` (${invDetail})` : ''}` : 'Not identified'),
      v.pelvicPeritoneum && v.pelvicPeritoneum !== 'Not submitted' ? item('Pelvic peritoneum', v.pelvicPeritoneum) : null,
      item('Lymphovascular invasion', lvsiValue(v)),
      item('Perineural invasion', v.pni || 'Not identified'),
      item('Peritoneal / ascitic fluid', v.peritonealFluid || 'Not submitted / unknown')
    ] },
    { heading: 'Margins', items: [
      item('Ectocervical / vaginal cuff margin', vm === 'Uninvolved by carcinoma' && vmm !== null ? `Uninvolved by carcinoma (closest distance ${fmt(vmm)} mm)` : vm),
      item('Parametrial / paracervical margin', pm === 'Uninvolved by carcinoma' && pmm !== null ? `Uninvolved by carcinoma (closest distance ${fmt(pmm)} mm)` : pm)
    ] },
    { heading: 'Lymph nodes', items: [nodesItem(v, 'pelvic'), nodesItem(v, 'pa')] },
    { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] },
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: `${st.tnm}${st.overridden ? ` [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${(v.tnmOverrideReason || '').trim() ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : ''}`,
        sub: stageLine(st) ? [{ label: stageLine(st).split(': ')[0], value: stageLine(st).split(': ').slice(1).join(': ') }] : [] }
    ] } : null,
    { heading: 'Additional findings', items: [
      ...(findings.length ? findings.map((f) => ({ text: f })) : [{ text: 'None' }]),
      stripDot(v.additionalNotes) ? item('Additional notes', stripDot(v.additionalNotes)) : null
    ] }
  ];
  const heading = ctx?.case?.parts && ctx.case.parts.length > 1 ? `(${part.label}) ${specimenName(part)}` : '';
  return renderSynoptic(sections, heading);
}

/** Lymph node element: counts on the parent line, the QMH sub-elements nested under it. */
export function nodesItem(v, prefix) {
  const label = prefix === 'pelvic' ? 'Pelvic lymph nodes' : 'Para-aortic lymph nodes';
  const n = S.nodes(v, prefix);
  if (n.examined === null) return { label, value: 'Not recorded' };
  if (n.examined === 0) return { label, value: 'No lymph nodes submitted or found' };
  const bits = [`${n.examined} examined`, `${n.positive} involved`];
  if (v[`${prefix}Sentinel`] === true) bits.push('includes sentinel lymph node(s)');
  const sub = [];
  if (n.macro) sub.push({ label: 'Macrometastasis (more than 2 mm)', value: String(n.macro) });
  if (n.micro) sub.push({ label: 'Micrometastasis (more than 0.2 mm up to 2 mm)', value: String(n.micro) });
  if (n.itc) sub.push({ label: 'Isolated tumour cells (0.2 mm or less)', value: String(n.itc) });
  const lat = v[`${prefix}Laterality`];
  if ((n.positive || n.itc) && lat && lat !== 'Not applicable') sub.push({ label: 'Laterality', value: lat });
  const dep = num(v[`${prefix}DepositMm`]); const nd = num(v[`${prefix}NodeMm`]);
  if (dep !== null) sub.push({ label: 'Largest metastatic deposit', value: `${fmt(dep)} mm` });
  if (nd !== null) sub.push({ label: 'Largest involved node', value: `${fmt(nd)} mm` });
  const ene = v[`${prefix}Ene`];
  if (n.positive && ene && ene !== 'Not applicable') sub.push({ label: 'Extranodal extension', value: ene });
  return { label, value: bits.join('; '), sub };
}

// ---------- diagnosis ----------

export function diagnosis(part, ctx) {
  const v = part.values;
  const name = specimenName(part);
  const comma = name.indexOf(', ');
  const head = `(${part.label}) ${comma > 0 ? `${name.slice(0, comma).toUpperCase()}${name.slice(comma)}` : name.toUpperCase()}`;
  const grade = gradeShort(v);
  const ext = S.myoExtent(v);
  const extWord = ext === 'polyp' ? 'confined to an endometrial polyp' : ext === 'endometrium' ? (v.noInvasionExtent === S.NOINV_POLYP_AND_ENDOMETRIUM ? 'confined to an endometrial polyp and the underlying endometrium' : v.noInvasionExtent === 'Cannot be determined' ? 'no myometrial invasion' : 'confined to the endometrium') : ext === 'lt-half' ? 'invading less than half of the myometrium' : ext === 'ge-half' ? 'invading half or more of the myometrium' : 'depth of myometrial invasion cannot be assessed';
  const tumour = [`${histTypeName(v).toUpperCase()}${grade ? `, ${grade}` : ''}, ${extWord}`];
  // Local extent: LVSI, serosa, cervix, adnexa, other organs, peritoneum, margins.
  const local = [];
  const l = v.lvsi || 'Not identified';
  if (l === 'Not identified') local.push('no lymphovascular space invasion');
  else if (l === S.LVSI_FOCAL) local.push('focal lymphovascular space invasion');
  else if (l === S.LVSI_SUBSTANTIAL) local.push('substantial lymphovascular space invasion');
  else if (/^Present/.test(l)) local.push('lymphovascular space invasion present');
  else if (/^Equivocal/.test(l)) local.push('equivocal lymphovascular space invasion');
  const cx = v.cervix || 'Not identified';
  const inv = chosen(v.otherInvolvement);
  const ovaryTube = inv.filter((s) => /ovary|fallopian tube/i.test(s));
  const adn = adnexaPhrase(v);
  const cxWord = cx === 'Cervical stromal invasion' ? 'cervical stromal invasion' : cx === 'Endocervical glandular involvement only' ? 'endocervical glandular involvement only' : cx === 'Not identified' && withCervix(v) ? 'cervix uninvolved' : '';
  if (v.serosa === 'Present') local.push('serosal involvement');
  if (ovaryTube.length) local.push(`involving the ${listJoin(ovaryTube.map(lc1))}`);
  if (cxWord === 'cervix uninvolved' && adn && !ovaryTube.length) local.push('cervix and adnexa uninvolved');
  else { if (cxWord) local.push(cxWord); if (adn && !ovaryTube.length) local.push('adnexa uninvolved'); }
  const others = inv.filter((s) => !/ovary|fallopian tube/i.test(s));
  if (others.length) local.push(`involving the ${listJoin(others.map((s) => lc1(specify(s))))}`);
  if (v.pelvicPeritoneum === 'Present') local.push('pelvic peritoneal metastasis');
  if (v.vaginalMargin === 'Involved by carcinoma') local.push('vaginal cuff margin involved');
  if (v.parametrialMargin === 'Involved by carcinoma') local.push('parametrial margin involved');
  // Nodes and distant disease.
  const spread = [];
  for (const p of ['pelvic', 'pa']) {
    const n = S.nodes(v, p);
    if (n.examined) spread.push(`${n.positive} of ${n.examined} ${regionName[p]} lymph node${n.examined === 1 ? '' : 's'} involved${n.itc && !n.positive ? ' (isolated tumour cells only)' : ''}`);
  }
  const sites = metastasisSites(v);
  if (sites.length) spread.push(`metastatic carcinoma in the ${listJoin(sites.map((x) => lc1(specify(x))))}`);
  // Molecular class, then the stage when printed.
  const molecular = [];
  const short = promiseShort(v);
  const cls = resolvedPromise(v);
  if (short) molecular.push(`molecular class ${short}`);
  else if (cls === 'Double classifier (explain)') molecular.push('multiple classifier (see comment)');
  else if (cls === 'Not classified (testing incomplete)') molecular.push('molecular classification to follow');
  const stage = [];
  if (ctx?.options?.printPTNM) {
    const st = staging(part);
    let s = `${st.tnm} (${st.edition})`;
    if (st.stage) s += `, stage ${st.stage}${st.M === 'M-' ? ' (if cM0)' : ''}`;
    stage.push(s);
  }
  return renderDiagnosis(head, [tumour, local, spread, molecular, stage].map((g) => g.filter(Boolean).join('; ')));
}

// ---------- validation + flags ----------

export function validate(part) {
  const v = part.values;
  const out = [];
  // The optional second argument is the id of the field the check is about; the Checks panel
  // uses it to jump to that field. Omit it when a check does not point at one field.
  const at = (level, m, field) => out.push(field ? { level, message: m, field } : { level, message: m });
  const err = (m, field) => at('error', m, field);
  const warn = (m, field) => at('warn', m, field);
  const info = (m, field) => at('info', m, field);
  if (!v.myoInvasion) err('Myometrial invasion is required.', 'myoInvasion');
  if (v.myoInvasion === 'Cannot be assessed (explain)' && !stripDot(v.myoCannot)) warn('Myometrial invasion cannot be assessed: give the reason.', 'myoCannot');
  if (v.myoInvasion === S.MYO_NONE) {
    const polypMicro = v.noInvasionExtent === S.NOINV_POLYP || v.noInvasionExtent === S.NOINV_POLYP_AND_ENDOMETRIUM;
    if (polypMicro && v.tumourSite !== 'Endometrial polyp') warn('Microscopy places the tumour in an endometrial polyp but the macroscopic Tumour site is not "Endometrial polyp".', 'tumourSite');
    if (!polypMicro && v.tumourSite === 'Endometrial polyp' && v.noInvasionExtent !== 'Cannot be determined') info('Macroscopic Tumour site is "Endometrial polyp" but the tumour is recorded as confined to the endometrium; state whether the underlying endometrium is involved (FIGO 2023 IA1 basis).', 'noInvasionExtent');
    if (v.noInvasionExtent === 'Cannot be determined') warn('Extent without myometrial invasion cannot be determined; the FIGO 2023 IA1 basis is left open.', 'noInvasionExtent');
  }
  const d = num(v.depthMm); const t = num(v.myoThicknessMm); const pct = myoPercent(v);
  if (d !== null && t !== null && d > t) err('Depth of myometrial invasion exceeds the myometrial thickness.', 'depthMm');
  if (pct !== null && v.myoInvasion === S.MYO_GE_HALF && pct < 50) warn(`"50% or greater" is ticked but the measurements give ${fmt(pct)}%.`, 'myoInvasion');
  if (pct !== null && v.myoInvasion === S.MYO_LT_HALF && pct >= 50) warn(`"Less than 50%" is ticked but the measurements give ${fmt(pct)}%.`, 'myoInvasion');
  if (S.anyMyoinvasion(v) && (d === null || t === null)) warn('Myoinvasive tumour: record the depth of invasion and the myometrial thickness in mm.', 'depthMm');
  if (v.tumourSite === 'Endometrial polyp' && S.anyMyoinvasion(v)) warn('Tumour site is "Endometrial polyp" but myometrial invasion is recorded; the invasive component is not confined to the polyp.', 'tumourSite');
  if (/Mixed cell|Other \(specify\)/.test(v.histType || '') && !stripDot(v.histTypeOther)) err('Histologic type: specify the type(s) and percentages.', 'histTypeOther');
  if (v.grade === 'Other (specify)' && !stripDot(v.gradeOther)) err('Histologic grade: specify.', 'gradeOther');
  if (gradeIsDerived(v)) {
    const dg = derivedGrade(v);
    if (v.histType === 'Other (specify)') err('Histologic grade: no grade can be derived for an "Other" histotype; pick it explicitly.', 'grade');
    else info(`Histologic grade derived: ${dg.grade} - ${dg.reason}.`);
  } else {
    if (v.histType === S.ENDOMETRIOID && /^High-grade/.test(v.grade || '')) warn('Endometrioid carcinoma should carry a FIGO grade rather than "High-grade (non-endometrioid carcinoma)".', 'grade');
    if (v.histType && v.histType !== S.ENDOMETRIOID && !/Mixed cell|Other/.test(v.histType) && /^FIGO grade/.test(v.grade || '')) warn('FIGO grading applies to endometrioid carcinoma only; non-endometrioid carcinomas are high grade by definition.', 'grade');
    if (v.histType === S.ENDOMETRIOID && /^FIGO grade/.test(v.grade || '') && v.grade !== derivedGrade(v).grade) warn(`Histologic grade picked (${v.grade}) differs from the grade derived from the solid growth and nuclear grade (${derivedGrade(v).grade}); the picked value is used.`, 'grade');
  }
  if (v.histType === S.ENDOMETRIOID && arr(v.architecture).includes('Solid (non-squamous)') && /^5% or less/.test(v.solidPct || '5% or less')) warn('Solid (non-squamous) architecture is ticked but solid growth is recorded as 5% or less.', 'architecture');
  if (/^Carcinosarcoma/.test(v.histType || '') && /other or mixed/.test(v.csSarcomatous || '') && !stripDot(v.csSarcomatousDetail)) err('Carcinosarcoma: specify the heterologous elements.', 'csSarcomatousDetail');
  if (v.cervix === 'Cervical stromal invasion' && num(v.cervixDepthMm) === null) warn('Cervical stromal invasion: record the depth and the stromal thickness in mm.', 'cervixDepthMm');
  if (v.lvsi === 'Present, extent not specified') warn('LVSI is present but not quantified; focal (fewer than 5 vessels) versus substantial (5 or more) changes the FIGO 2023 reference stage.', 'lvsi');
  const invRaw = arr(v.otherInvolvement);
  if (invRaw.length > 1 && invRaw.includes('Not identified')) warn('Other tissue / organ involvement: "Not identified" is ticked together with involved sites.', 'otherInvolvement');
  if (invRaw.some((s) => /Other organs|Cannot be determined/.test(s)) && !stripDot(v.otherInvolvementDetail)) warn('Other tissue / organ involvement: specify the site or explain.', 'otherInvolvementDetail');
  if (v.ovarianSynchronous === true && !S.ovaryInvolved(v)) warn('Synchronous ovarian tumour ticked but no ovary is recorded as involved.', 'ovarianSynchronous');
  if (v.ovarianSynchronous === true && S.histotypeClass(stagingValues(v)) !== 'non-aggressive') warn('The synchronous uterine and ovarian pattern (IA3) applies to low-grade endometrioid carcinoma only.', 'ovarianSynchronous');
  for (const p of ['pelvic', 'pa']) {
    const n = S.nodes(v, p); const name = regionName[p];
    if (n.examined === null) { if (p === 'pelvic') err('Pelvic lymph nodes: number examined is required (enter 0 if none submitted).', 'pelvicExamined'); continue; }
    if (n.examined > 0 && int(v[`${p}Macro`]) === null && int(v[`${p}Micro`]) === null) err(`${uc1(name)} lymph nodes: record the numbers with macrometastasis and micrometastasis (enter 0 if none).`, `${p}Macro`);
    if (n.positive + n.itc > n.examined) err(`${uc1(name)} lymph nodes: involved nodes exceed the number examined.`, `${p}Examined`);
    if (n.positive && (!v[`${p}Ene`] || v[`${p}Ene`] === 'Not applicable')) warn(`${uc1(name)} lymph nodes: extranodal extension is not recorded for a node-positive region.`, `${p}Ene`);
    if (n.positive && num(v[`${p}DepositMm`]) === null) warn(`${uc1(name)} lymph nodes: record the size of the largest metastatic deposit in mm.`, `${p}DepositMm`);
    if (n.examined === 0 && (int(v[`${p}Macro`]) || int(v[`${p}Micro`]) || int(v[`${p}Itc`]))) err(`${uc1(name)} lymph nodes: involved nodes recorded but none examined.`, `${p}Examined`);
  }
  const anyNodes = (S.nodes(v, 'pelvic').examined || 0) + (S.nodes(v, 'pa').examined || 0);
  if (!anyNodes && (S.substantialLvsi(v) || S.isAggressive(stagingValues(v)))) info('No lymph nodes examined (pNX) in a case with substantial LVSI or an aggressive histotype.');
  const mets = arr(v.distantMets);
  if (mets.length > 1 && mets.includes('Not identified')) warn('Distant metastasis: "Not identified" is ticked together with metastatic sites.', 'distantMets');
  if (mets.some((s) => /\(specify\)/.test(s)) && !stripDot(v.distantDetail)) warn('Distant metastasis: specify the site.', 'distantDetail');
  if (mmrLost(v) && !stripDot(v.mmrDetail)) err('MMR loss: name the protein(s) lost.', 'mmrDetail');
  if (poleMutated(v) && !stripDot(v.poleDetail)) warn('POLE mutated: record the variant.', 'poleDetail');
  if (!v.mmrIhc || v.mmrIhc === 'Not performed') warn('MMR immunohistochemistry is not recorded; universal MMR testing is recommended for endometrial carcinoma.', 'mmrIhc');
  if (poleMutated(v) && (mmrLost(v) || p53Abnormal(v)) && v.promise !== 'Double classifier (explain)' && v.promise !== 'POLE-mutated carcinoma') {
    warn('POLE mutation with MMR loss or abnormal p53: pick "Double classifier (explain)" or confirm POLE-mutated; POLE takes precedence.', 'promise');
  }
  if (mmrLost(v) && p53Abnormal(v) && !poleMutated(v) && v.promise !== 'Double classifier (explain)' && v.promise !== 'Mismatch repair-deficient carcinoma') {
    warn('MMR loss with abnormal p53: pick "Double classifier (explain)" or confirm MMR-deficient; MMRd takes precedence over p53abn.', 'promise');
  }
  if (v.promise === 'Double classifier (explain)' && !stripDot(v.promiseDetail)) err('Double classifier: explain the combination and the class assigned.', 'promiseDetail');
  if (v.promise && v.promise !== 'Derive from the results above' && v.promise !== 'Double classifier (explain)') {
    const derived = derivedPromise(v);
    if (derived !== v.promise && derived !== 'Not classified (testing incomplete)') warn(`Molecular class picked (${v.promise}) differs from the derived class (${derived}); the picked value is used.`, 'promise');
  }
  if (p53Abnormal(v) && v.histType === S.ENDOMETRIOID && /^FIGO grade [12]/.test(resolvedGrade(v))) warn('Abnormal p53 in a low-grade endometrioid carcinoma is unusual; review the staining pattern and consider a serous or high-grade component.', 'p53');
  if (resolvedPromise(v) === 'Not classified (testing incomplete)' && (pending(v.pole) || pending(v.mmrIhc) || pending(v.p53))) info('Molecular testing is pending; the FIGO 2023 reference stage may change once the class is confirmed.');
  if (v.peritonealFluid === 'Results pending') info('Peritoneal fluid cytology is pending; correlate with the separate cytology report.');
  if (v.vaginalMargin === 'Uninvolved by carcinoma' && num(v.vaginalMarginMm) === null && (v.cervix === 'Cervical stromal invasion' || /Radical/.test(v.procedure || ''))) warn('Cervical involvement or radical hysterectomy: record the distance to the vaginal cuff margin in mm.', 'vaginalMarginMm');
  if (/Radical/.test(v.procedure || '') && (!v.parametrialMargin || v.parametrialMargin === 'Not applicable')) warn('Radical hysterectomy: report the parametrial margin.', 'parametrialMargin');
  if ((v.tnmOverride || '').trim()) {
    const st = staging(part);
    if (!st.overridden) err(`Override "${v.tnmOverride.trim()}" could not be parsed (use e.g. "pT1b pN0").`, 'tnmOverride');
    else if (!(v.tnmOverrideReason || '').trim()) err('Give a reason for overriding the derived pTNM.', 'tnmOverrideReason');
  }
  for (const l of S.referenceLines(stagingValues(v))) info(l);
  return out;
}

export function flags(parts) {
  const out = new Set();
  for (const p of parts) {
    const v = p.values;
    const cls = resolvedPromise(v);
    if (cls === 'Mismatch repair-deficient carcinoma' || (mmrLost(v) && cls === 'Double classifier (explain)')) out.add('mmrd');
    if (cls === 'p53-abnormal carcinoma') out.add('p53abn');
    if (cls === 'POLE-mutated carcinoma') out.add('polemut');
    if (cls === 'Not classified (testing incomplete)' && (pending(v.pole) || pending(v.mmrIhc) || pending(v.p53))) out.add('molecularPending');
  }
  return [...out];
}

export default { specimenName, macro, blockKey, synoptic, diagnosis, validate, flags, staging };
