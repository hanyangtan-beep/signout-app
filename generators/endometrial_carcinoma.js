// Endometrial carcinoma resection generator (third synoptic template).
// Elements mirror the QMH Cancer Reporting Template GYN-Endometrium page (CAP Carcinoma and
// Carcinosarcoma of the Endometrium 5.1.0.0, Dec-2024). AJCC 8th pTNM is derived by
// src/staging/endometrium.js and printed only with `options.printPTNM`; FIGO 2009 and FIGO 2023
// are derived for the Checks panel (info level) and are never written into the report.
// Pure functions: (part, ctx) -> string.
//
// Blocks produced (hybrid mode):
//   specimens  "Uterus with cervix and bilateral adnexa, total hysterectomy and bilateral salpingo-oophorectomy"
//   macro      "The specimen consists of an intact uterus with cervix (165 g, 92 x 58 x 44 mm) …"
//   blockKey   the typed block key, one "(n) …" entry per line
//   microscopy one "Sections show …" paragraph ending with the IHC / molecular sentence (omitted when `synopticOnly`)
//   synoptic   CAP-style "- Element: value" list in QMH order, no stage unless `printPTNM`
//   diagnosis  "UTERUS WITH CERVIX AND BILATERAL ADNEXA, total hysterectomy and bilateral salpingo-oophorectomy - ENDOMETRIOID CARCINOMA, FIGO grade 1, …"
// Wording is protected by tests/endometrial_carcinoma.test.js - change it only deliberately.

import { deriveTNM, stageLine } from '../src/staging/index.js';
import * as S from '../src/staging/endometrium.js';

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

/** Short grade for prose and diagnosis: 'FIGO grade 1' | 'high grade' | typed | ''. */
export function gradeShort(v) {
  const g = v.grade || '';
  const m = g.match(/^FIGO grade (\d)/);
  if (m) return `FIGO grade ${m[1]}`;
  if (/^High-grade/.test(g)) return 'high grade';
  if (g === 'Other (specify)') return stripDot(v.gradeOther);
  if (g === 'Cannot be assessed') return 'grade cannot be assessed';
  return '';
}

/** Grade as printed in the synoptic (QMH wording). */
export function gradeValue(v) {
  if (v.grade === 'Other (specify)') return stripDot(v.gradeOther) || 'Other';
  return v.grade || 'Cannot be assessed';
}

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
export const stagingValues = (v) => ({ ...v, promise: resolvedPromise(v) });

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

export function myoText(v) {
  const ext = S.myoExtent(v);
  const d = num(v.depthMm); const t = num(v.myoThicknessMm); const pct = myoPercent(v);
  const measure = d !== null ? ` (${fmt(d)} mm${t ? ` of ${fmt(t)} mm` : ''}${pct !== null ? `, ${fmt(pct)}%` : ''})` : '';
  if (ext === 'polyp') return 'The carcinoma is confined to the polyp with no myometrial invasion';
  if (ext === 'endometrium') return 'The carcinoma is confined to the endometrium with no myometrial invasion';
  if (ext === 'lt-half') return `The tumour invades less than half of the myometrium${measure}`;
  if (ext === 'ge-half') return `The tumour invades half or more of the myometrium${measure}`;
  return `The depth of myometrial invasion cannot be assessed${stripDot(v.myoCannot) ? ` (${lc1(stripDot(v.myoCannot))})` : ''}`;
}

export function lvsiText(v) {
  const l = v.lvsi || 'Not identified'; const d = stripDot(v.lvsiDetail);
  if (l === 'Not identified') return 'Lymphovascular space invasion is not identified';
  if (l === S.LVSI_FOCAL) return `Focal lymphovascular space invasion is present (fewer than 5 vessels${d ? `, ${lc1(d)}` : ''})`;
  if (l === S.LVSI_SUBSTANTIAL) return `Substantial lymphovascular space invasion is present (5 or more vessels${d ? `, ${lc1(d)}` : ''})`;
  if (/^Present/.test(l)) return `Lymphovascular space invasion is present${d ? ` (${lc1(d)})` : ''}`;
  if (/^Equivocal/.test(l)) return `Lymphovascular space invasion is equivocal${d ? ` (${lc1(d)})` : ''}`;
  return 'Lymphovascular space invasion cannot be determined';
}

/** Synoptic value for LVSI in QMH wording. */
export function lvsiValue(v) {
  const l = v.lvsi || 'Not identified'; const d = stripDot(v.lvsiDetail);
  if (l === S.LVSI_FOCAL) return `Present, focal (less than 5 vessels)${d ? ` (${d})` : ''}`;
  if (l === S.LVSI_SUBSTANTIAL) return `Present, extensive / substantial (5 or more vessels)${d ? ` (${d})` : ''}`;
  if (/^Equivocal/.test(l)) return `Equivocal${d ? ` (${d})` : ''}`;
  return l;
}

export function cervixText(v) {
  const c = v.cervix || 'Not identified';
  const lusRaw = v.lus || 'Not identified';
  const depth = num(v.cervixDepthMm); const thick = num(v.cervixThicknessMm);
  let cx = '';
  if (c === 'Cervical stromal invasion') cx = `cervical stromal invasion is present${depth !== null ? ` (${fmt(depth)} mm${thick ? ` of ${fmt(thick)} mm` : ''})` : ''}`;
  else if (c === 'Endocervical glandular involvement only') cx = 'the cervix shows endocervical glandular involvement only, without stromal invasion';
  else if (c === 'Cannot be determined') cx = 'cervical involvement cannot be determined';
  else if (c === 'Not identified') cx = 'the cervix is uninvolved';
  if (lusRaw === 'Not identified' && c === 'Not identified') return 'The lower uterine segment and cervix are uninvolved';
  const bits = [];
  if (/myoinvasion/.test(lusRaw)) bits.push('The lower uterine segment is involved with myoinvasion');
  else if (/superficial/.test(lusRaw)) bits.push('The lower uterine segment shows superficial (non-invasive) involvement');
  else if (/^Cannot/.test(lusRaw)) bits.push('Lower uterine segment involvement cannot be determined');
  else bits.push('The lower uterine segment is uninvolved');
  if (cx) bits.push(uc1(cx));
  return bits.join('. ');
}

export function serosaAdnexaText(v) {
  const inv = chosen(v.otherInvolvement);
  const det = stripDot(v.otherInvolvementDetail);
  const sentences = [];
  if (v.serosa === 'Present') sentences.push('The uterine serosa is involved by carcinoma');
  else if (v.serosa === 'Cannot be determined') sentences.push('Serosal involvement cannot be determined');
  else sentences.push('The serosa is uninvolved');
  if (v.adenomyosis === 'Present, involved by tumour') sentences.push('Adenomyosis is present and is involved by carcinoma');
  else if (v.adenomyosis === 'Present, uninvolved by tumour') sentences.push('Adenomyosis is present and uninvolved by carcinoma');
  const adn = adnexaPhrase(v);
  const ovaryTube = inv.filter((s) => /ovary|fallopian tube/i.test(s));
  const others = inv.filter((s) => !/ovary|fallopian tube/i.test(s));
  if (ovaryTube.length) sentences.push(`Carcinoma involves the ${listJoin(ovaryTube.map(lc1))}${det && !others.length ? ` (${lc1(det)})` : ''}${adn ? '; the remaining adnexal tissue is uninvolved' : ''}`);
  else if (adn) sentences.push(adn === 'bilateral adnexa' ? 'Both fallopian tubes and ovaries are uninvolved' : `The ${adn.replace('adnexa', 'fallopian tube and ovary')} ${/tubes/.test(adn) ? 'are' : 'is'} uninvolved`);
  if (others.length) sentences.push(`Carcinoma ${ovaryTube.length ? 'also ' : ''}involves the ${listJoin(others.map((s) => lc1(specify(s))))}${det ? ` (${lc1(det)})` : ''}`);
  else if (det && !ovaryTube.length) sentences.push(uc1(det));
  if (v.pelvicPeritoneum === 'Present') sentences.push('The pelvic peritoneal biopsies show metastatic carcinoma');
  else if (v.pelvicPeritoneum === 'Not identified') sentences.push('The pelvic peritoneal biopsies are negative for carcinoma');
  return `${sentences.join('. ')}.`;
}

export function marginText(v) {
  const bits = [];
  const vm = v.vaginalMargin || 'Uninvolved by carcinoma'; const pm = v.parametrialMargin || 'Not applicable';
  const vmm = num(v.vaginalMarginMm); const pmm = num(v.parametrialMarginMm);
  if (vm === 'Involved by carcinoma') bits.push('the ectocervical / vaginal cuff margin is involved by carcinoma');
  else if (vm === 'Uninvolved by carcinoma') bits.push(`the ectocervical / vaginal cuff margin is uninvolved${vmm !== null ? ` (closest distance ${fmt(vmm)} mm)` : ''}`);
  else if (vm === 'Cannot be assessed') bits.push('the ectocervical / vaginal cuff margin cannot be assessed');
  if (pm === 'Involved by carcinoma') bits.push('the parametrial margin is involved by carcinoma');
  else if (pm === 'Uninvolved by carcinoma') bits.push(`the parametrial margin is uninvolved${pmm !== null ? ` (closest distance ${fmt(pmm)} mm)` : ''}`);
  else if (pm === 'Cannot be assessed') bits.push('the parametrial margin cannot be assessed');
  return bits.length ? `${uc1(bits.join('; '))}.` : '';
}

const regionName = { pelvic: 'pelvic', pa: 'para-aortic' };

export function nodesSentence(v, prefix) {
  const n = S.nodes(v, prefix); const name = regionName[prefix];
  if (n.examined === null || n.examined === 0) return '';
  const sentinel = v[`${prefix}Sentinel`] === true ? ' sentinel' : '';
  if (!n.positive && !n.itc) return n.examined === 1 ? `The single ${name}${sentinel} lymph node is negative for metastatic carcinoma (0/1)` : `All ${n.examined} ${name}${sentinel} lymph nodes are negative for metastatic carcinoma (0/${n.examined})`;
  const bits = [];
  if (n.macro) bits.push(`${n.macro} with macrometastasis`);
  if (n.micro) bits.push(`${n.micro} with micrometastasis`);
  if (n.itc) bits.push(`${n.itc} with isolated tumour cells only`);
  const dep = num(v[`${prefix}DepositMm`]); const ene = v[`${prefix}Ene`];
  const extra = [];
  if (dep !== null) extra.push(`largest deposit ${fmt(dep)} mm`);
  if (ene === 'Present') extra.push('extranodal extension present');
  else if (ene === 'Not identified' && n.positive) extra.push('no extranodal extension');
  const lat = v[`${prefix}Laterality`];
  if (lat && lat !== 'Not applicable' && lat !== 'Cannot be determined') extra.push(lc1(lat));
  return `Metastatic carcinoma ${n.positive ? 'involves' : 'is not established in'} the ${name}${sentinel} lymph nodes (${n.positive}/${n.examined}; ${bits.join(', ')}${extra.length ? `; ${extra.join(', ')}` : ''})`;
}

export function nodesValue(v, prefix) {
  const n = S.nodes(v, prefix);
  if (n.examined === null) return 'Not recorded';
  if (n.examined === 0) return 'No lymph nodes submitted or found';
  const bits = [`${n.examined} examined`, `${n.positive} involved`];
  if (n.macro) bits.push(`${n.macro} with macrometastasis (more than 2 mm)`);
  if (n.micro) bits.push(`${n.micro} with micrometastasis (more than 0.2 mm up to 2 mm)`);
  if (n.itc) bits.push(`${n.itc} with isolated tumour cells (0.2 mm or less)`);
  if (v[`${prefix}Sentinel`] === true) bits.push('includes sentinel lymph node(s)');
  const lat = v[`${prefix}Laterality`];
  if ((n.positive || n.itc) && lat && lat !== 'Not applicable') bits.push(`laterality ${lc1(lat)}`);
  const dep = num(v[`${prefix}DepositMm`]); const nd = num(v[`${prefix}NodeMm`]);
  if (dep !== null) bits.push(`largest metastatic deposit ${fmt(dep)} mm`);
  if (nd !== null) bits.push(`largest involved node ${fmt(nd)} mm`);
  const ene = v[`${prefix}Ene`];
  if ((n.positive) && ene && ene !== 'Not applicable') bits.push(`extranodal extension ${lc1(ene)}`);
  return bits.join('; ');
}

export const metastasisSites = (v) => chosen(v.distantMets);
export function metastasisValue(v) {
  const sites = metastasisSites(v); const d = stripDot(v.distantDetail);
  if (!sites.length) return arr(v.distantMets).includes('Cannot be determined') ? 'Cannot be determined' : 'Not identified';
  return `${listJoin(sites.map(specify))}${d ? ` (${d})` : ''}`;
}

export function additionalFindingsValue(v) {
  const items = arr(v.additionalFindings).map((s) => (s === 'Other (specify)' ? stripDot(v.additionalFindingsOther) : s)).filter(Boolean);
  return items.length ? items.join('; ') : 'None';
}

const FINDING_SENTENCE = {
  'Atypical hyperplasia / endometrial intraepithelial neoplasia (EIN)': 'The background endometrium shows atypical hyperplasia / endometrial intraepithelial neoplasia',
  'Endometrial polyp': 'A benign endometrial polyp is also present',
  Leiomyomas: 'Leiomyomas are present',
  Adenomyosis: 'Adenomyosis is present',
  Endometriosis: 'Endometriosis is present'
};

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

export function microscopy(part) {
  const v = part.values;
  const s = [];
  const type = histTypeName(v); const grade = gradeShort(v);
  const siteDetail = v.tumourSite !== 'Other (specify)' ? stripDot(v.tumourSiteDetail) : '';
  const site = v.tumourSite === 'Endometrial polyp' ? 'arising within an endometrial polyp' : v.tumourSite === 'Lower uterine segment' ? 'arising in the lower uterine segment' : v.tumourSite === 'Other (specify)' ? `arising in the ${lc1(stripDot(v.tumourSiteDetail)) || 'endometrium'}` : `arising in the endometrium${siteDetail ? ` (${lc1(siteDetail)})` : ''}`;
  const article = /^[AEIOU]/i.test(type) ? 'an' : 'a';
  const size = num(v.tumourSizeMm);
  s.push(`Sections show ${article} ${lc1(type)}${grade ? `, ${grade},` : ''}${size !== null ? ` measuring ${fmt(size)} mm and` : ''} ${site}${stripDot(v.microDescription) ? `; ${lc1(stripDot(v.microDescription))}` : ''}.`);
  s.push(`${myoText(v)}.`);
  s.push(`${lvsiText(v)}.`);
  if (v.pni === 'Present') s.push('Perineural invasion is present.');
  else if (v.pni === 'Cannot be determined') s.push('Perineural invasion cannot be determined.');
  const cx = cervixText(v);
  if (cx) s.push(`${cx}.`);
  s.push(serosaAdnexaText(v));
  const mg = marginText(v);
  if (mg) s.push(mg);
  for (const p of ['pelvic', 'pa']) { const t = nodesSentence(v, p); if (t) s.push(`${t}.`); }
  const sites = metastasisSites(v);
  if (sites.length) s.push(`Metastatic carcinoma is present in the ${listJoin(sites.map((x) => lc1(specify(x))))}${stripDot(v.distantDetail) ? ` (${lc1(stripDot(v.distantDetail))})` : ''}.`);
  if (v.peritonealFluid && !/^Not submitted/.test(v.peritonealFluid)) {
    const f = v.peritonealFluid;
    s.push(/Negative/.test(f) ? 'The peritoneal fluid is negative for malignancy.' : /Malignant/.test(f) ? 'The peritoneal fluid contains malignant cells.' : /Suspicious/.test(f) ? 'The peritoneal fluid is suspicious for malignancy.' : /Atypia/.test(f) ? 'The peritoneal fluid shows atypia of undetermined significance.' : /pending/.test(f) ? 'The peritoneal fluid cytology result is pending.' : 'The peritoneal fluid cannot be assessed.');
  }
  const ihc = ihcSentence(v);
  if (ihc) s.push(ihc);
  for (const f of arr(v.additionalFindings)) {
    if (f === 'Other (specify)') { if (stripDot(v.additionalFindingsOther)) s.push(`${uc1(stripDot(v.additionalFindingsOther))}.`); }
    else if (f === 'Adenomyosis' && v.adenomyosis && v.adenomyosis !== 'Not identified') continue;
    else if (FINDING_SENTENCE[f]) s.push(`${FINDING_SENTENCE[f]}.`);
  }
  if (stripDot(v.additionalNotes)) s.push(`${uc1(stripDot(v.additionalNotes))}.`);
  return s.join(' ');
}

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const line = (label, value) => (value !== '' && value !== null && value !== undefined ? `- ${label}: ${value}` : null);
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
  const rows = [
    line('Procedure', `${procedureName(v)}${extras.length ? `; ${extras.map(lc1).join(', ')}` : ''}`),
    v.hysterectomyType && v.hysterectomyType !== 'Not specified' ? line('Hysterectomy type', v.hysterectomyType) : null,
    line('Specimen integrity', v.specimenIntegrity || 'Intact'),
    line('Tumour site', `${v.tumourSite === 'Other (specify)' ? siteDetail || 'Other' : v.tumourSite || 'Endometrium'}${v.tumourSite !== 'Other (specify)' && siteDetail ? ` (${siteDetail})` : ''}`),
    line('Tumour size', sizeText),
    line('Histologic type', `${histTypeName(v)}${/Mixed cell/.test(v.histType || '') ? ' (mixed cell carcinoma)' : ''}`),
    line('Histologic grade', gradeValue(v)),
    line('Mismatch repair (MMR) immunohistochemistry', mmr),
    v.msi && v.msi !== 'Not performed' ? line('Microsatellite instability', specify(v.msi)) : null,
    line('p53 immunohistochemistry', p53),
    line('POLE status', pole),
    line('Molecular classification', cls === 'Double classifier (explain)' ? `Multiple classifier${stripDot(v.promiseDetail) ? ` (${stripDot(v.promiseDetail)})` : ''}` : cls),
    stripDot(v.otherIhc) ? line('Other immunohistochemistry', stripDot(v.otherIhc)) : null,
    line('Myometrial invasion', `${specify(v.myoInvasion || 'Cannot be assessed')}${v.myoInvasion === 'Cannot be assessed (explain)' && stripDot(v.myoCannot) ? ` (${stripDot(v.myoCannot)})` : ''}`),
    d !== null ? line('Depth of myometrial invasion', `${fmt(d)} mm`) : null,
    t !== null ? line('Myometrial thickness', `${fmt(t)} mm`) : null,
    pct !== null ? line('Percentage of myometrial invasion', `${fmt(pct)}%`) : null,
    line('Adenomyosis', v.adenomyosis || 'Not identified'),
    line('Uterine serosa involvement', v.serosa || 'Not identified'),
    line('Lower uterine segment involvement', v.lus || 'Not identified'),
    line('Cervical stromal involvement', specify(cx)),
    cx === 'Cervical stromal invasion' && cd !== null ? line('Depth of cervical stromal invasion', `${fmt(cd)} mm${ct !== null ? ` of ${fmt(ct)} mm` : ''}`) : null,
    line('Other tissue / organ involvement', inv.length ? `${inv.map(specify).join('; ')}${invDetail ? ` (${invDetail})` : ''}` : arr(v.otherInvolvement).some((s) => /^Cannot/.test(s)) ? `Cannot be determined${invDetail ? ` (${invDetail})` : ''}` : 'Not identified'),
    v.pelvicPeritoneum && v.pelvicPeritoneum !== 'Not submitted' ? line('Pelvic peritoneum', v.pelvicPeritoneum) : null,
    line('Lymphovascular invasion', lvsiValue(v)),
    line('Perineural invasion', v.pni || 'Not identified'),
    line('Peritoneal / ascitic fluid', v.peritonealFluid || 'Not submitted / unknown'),
    line('Ectocervical / vaginal cuff margin', vm === 'Uninvolved by carcinoma' && vmm !== null ? `Uninvolved by carcinoma (closest distance ${fmt(vmm)} mm)` : vm),
    line('Parametrial / paracervical margin', pm === 'Uninvolved by carcinoma' && pmm !== null ? `Uninvolved by carcinoma (closest distance ${fmt(pmm)} mm)` : pm),
    line('Pelvic lymph nodes', nodesValue(v, 'pelvic')),
    line('Para-aortic lymph nodes', nodesValue(v, 'pa')),
    line('Distant metastasis', metastasisValue(v)),
    line('Additional pathologic findings', additionalFindingsValue(v)),
    stripDot(v.additionalNotes) ? line('Additional notes', stripDot(v.additionalNotes)) : null
  ];
  if (ctx?.options?.printPTNM) {
    rows.push(line(`Pathological stage classification (${st.edition})`, `${st.tnm}${st.overridden ? ` [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${(v.tnmOverrideReason || '').trim() ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : ''}`));
    if (stageLine(st)) rows.push(`  - ${stageLine(st)}`);
  }
  const heading = ctx?.case?.parts && ctx.case.parts.length > 1 ? `(${part.label}) ${specimenName(part)}\n` : '';
  return `${heading}${rows.filter(Boolean).join('\n')}`;
}

// ---------- diagnosis ----------

export function diagnosis(part, ctx) {
  const v = part.values;
  const name = specimenName(part);
  const comma = name.indexOf(', ');
  const head = `(${part.label}) ${comma > 0 ? `${name.slice(0, comma).toUpperCase()}${name.slice(comma)}` : name.toUpperCase()} - `;
  const bits = [];
  const grade = gradeShort(v);
  const ext = S.myoExtent(v);
  const extWord = ext === 'polyp' ? 'confined to an endometrial polyp' : ext === 'endometrium' ? 'confined to the endometrium' : ext === 'lt-half' ? 'invading less than half of the myometrium' : ext === 'ge-half' ? 'invading half or more of the myometrium' : 'depth of myometrial invasion cannot be assessed';
  bits.push(`${histTypeName(v).toUpperCase()}${grade ? `, ${grade}` : ''}, ${extWord}`);
  const l = v.lvsi || 'Not identified';
  if (l === 'Not identified') bits.push('no lymphovascular space invasion');
  else if (l === S.LVSI_FOCAL) bits.push('focal lymphovascular space invasion');
  else if (l === S.LVSI_SUBSTANTIAL) bits.push('substantial lymphovascular space invasion');
  else if (/^Present/.test(l)) bits.push('lymphovascular space invasion present');
  else if (/^Equivocal/.test(l)) bits.push('equivocal lymphovascular space invasion');
  const cx = v.cervix || 'Not identified';
  const inv = chosen(v.otherInvolvement);
  const ovaryTube = inv.filter((s) => /ovary|fallopian tube/i.test(s));
  const adn = adnexaPhrase(v);
  const cxWord = cx === 'Cervical stromal invasion' ? 'cervical stromal invasion' : cx === 'Endocervical glandular involvement only' ? 'endocervical glandular involvement only' : cx === 'Not identified' && withCervix(v) ? 'cervix uninvolved' : '';
  if (v.serosa === 'Present') bits.push('serosal involvement');
  if (ovaryTube.length) bits.push(`involving the ${listJoin(ovaryTube.map(lc1))}`);
  if (cxWord === 'cervix uninvolved' && adn && !ovaryTube.length) bits.push('cervix and adnexa uninvolved');
  else { if (cxWord) bits.push(cxWord); if (adn && !ovaryTube.length) bits.push('adnexa uninvolved'); }
  const others = inv.filter((s) => !/ovary|fallopian tube/i.test(s));
  if (others.length) bits.push(`involving the ${listJoin(others.map((s) => lc1(specify(s))))}`);
  if (v.pelvicPeritoneum === 'Present') bits.push('pelvic peritoneal metastasis');
  if (v.vaginalMargin === 'Involved by carcinoma') bits.push('vaginal cuff margin involved');
  if (v.parametrialMargin === 'Involved by carcinoma') bits.push('parametrial margin involved');
  for (const p of ['pelvic', 'pa']) {
    const n = S.nodes(v, p);
    if (n.examined) bits.push(`${n.positive} of ${n.examined} ${regionName[p]} lymph node${n.examined === 1 ? '' : 's'} involved${n.itc && !n.positive ? ' (isolated tumour cells only)' : ''}`);
  }
  const sites = metastasisSites(v);
  if (sites.length) bits.push(`metastatic carcinoma in the ${listJoin(sites.map((x) => lc1(specify(x))))}`);
  const short = promiseShort(v);
  const cls = resolvedPromise(v);
  if (short) bits.push(`molecular class ${short}`);
  else if (cls === 'Double classifier (explain)') bits.push('multiple classifier (see comment)');
  else if (cls === 'Not classified (testing incomplete)') bits.push('molecular classification to follow');
  if (ctx?.options?.printPTNM) {
    const st = staging(part);
    let stage = `${st.tnm} (${st.edition})`;
    if (st.stage) stage += `, stage ${st.stage}${st.M === 'M-' ? ' (if cM0)' : ''}`;
    bits.push(stage);
  }
  return `${head}${bits.filter(Boolean).join('; ')}`;
}

// ---------- validation + flags ----------

export function validate(part) {
  const v = part.values;
  const out = [];
  const err = (m) => out.push({ level: 'error', message: m });
  const warn = (m) => out.push({ level: 'warn', message: m });
  const info = (m) => out.push({ level: 'info', message: m });
  if (!v.myoInvasion) err('Myometrial invasion is required.');
  if (v.myoInvasion === 'Cannot be assessed (explain)' && !stripDot(v.myoCannot)) warn('Myometrial invasion cannot be assessed: give the reason.');
  const d = num(v.depthMm); const t = num(v.myoThicknessMm); const pct = myoPercent(v);
  if (d !== null && t !== null && d > t) err('Depth of myometrial invasion exceeds the myometrial thickness.');
  if (pct !== null && v.myoInvasion === S.MYO_GE_HALF && pct < 50) warn(`"50% or greater" is ticked but the measurements give ${fmt(pct)}%.`);
  if (pct !== null && v.myoInvasion === S.MYO_LT_HALF && pct >= 50) warn(`"Less than 50%" is ticked but the measurements give ${fmt(pct)}%.`);
  if (S.anyMyoinvasion(v) && (d === null || t === null)) warn('Myoinvasive tumour: record the depth of invasion and the myometrial thickness in mm.');
  if (v.tumourSite === 'Endometrial polyp' && S.anyMyoinvasion(v)) warn('Tumour site is "Endometrial polyp" but myometrial invasion is recorded; the invasive component is not confined to the polyp.');
  if (/Mixed cell|Other \(specify\)/.test(v.histType || '') && !stripDot(v.histTypeOther)) err('Histologic type: specify the type(s) and percentages.');
  if (v.grade === 'Other (specify)' && !stripDot(v.gradeOther)) err('Histologic grade: specify.');
  if (v.histType === S.ENDOMETRIOID && /^High-grade/.test(v.grade || '')) warn('Endometrioid carcinoma should carry a FIGO grade rather than "High-grade (non-endometrioid carcinoma)".');
  if (v.histType && v.histType !== S.ENDOMETRIOID && !/Mixed cell|Other/.test(v.histType) && /^FIGO grade/.test(v.grade || '')) warn('FIGO grading applies to endometrioid carcinoma only; non-endometrioid carcinomas are high grade by definition.');
  if (v.cervix === 'Cervical stromal invasion' && num(v.cervixDepthMm) === null) warn('Cervical stromal invasion: record the depth and the stromal thickness in mm.');
  if (v.lvsi === 'Present, extent not specified') warn('LVSI is present but not quantified; focal (fewer than 5 vessels) versus substantial (5 or more) changes the FIGO 2023 reference stage.');
  const invRaw = arr(v.otherInvolvement);
  if (invRaw.length > 1 && invRaw.includes('Not identified')) warn('Other tissue / organ involvement: "Not identified" is ticked together with involved sites.');
  if (invRaw.some((s) => /Other organs|Cannot be determined/.test(s)) && !stripDot(v.otherInvolvementDetail)) warn('Other tissue / organ involvement: specify the site or explain.');
  if (v.ovarianSynchronous === true && !S.ovaryInvolved(v)) warn('Synchronous ovarian tumour ticked but no ovary is recorded as involved.');
  if (v.ovarianSynchronous === true && S.histotypeClass(v) !== 'non-aggressive') warn('The synchronous uterine and ovarian pattern (IA3) applies to low-grade endometrioid carcinoma only.');
  for (const p of ['pelvic', 'pa']) {
    const n = S.nodes(v, p); const name = regionName[p];
    if (n.examined === null) { if (p === 'pelvic') err('Pelvic lymph nodes: number examined is required (enter 0 if none submitted).'); continue; }
    if (n.examined > 0 && int(v[`${p}Macro`]) === null && int(v[`${p}Micro`]) === null) err(`${uc1(name)} lymph nodes: record the numbers with macrometastasis and micrometastasis (enter 0 if none).`);
    if (n.positive + n.itc > n.examined) err(`${uc1(name)} lymph nodes: involved nodes exceed the number examined.`);
    if (n.positive && (!v[`${p}Ene`] || v[`${p}Ene`] === 'Not applicable')) warn(`${uc1(name)} lymph nodes: extranodal extension is not recorded for a node-positive region.`);
    if (n.positive && num(v[`${p}DepositMm`]) === null) warn(`${uc1(name)} lymph nodes: record the size of the largest metastatic deposit in mm.`);
    if (n.examined === 0 && (int(v[`${p}Macro`]) || int(v[`${p}Micro`]) || int(v[`${p}Itc`]))) err(`${uc1(name)} lymph nodes: involved nodes recorded but none examined.`);
  }
  const anyNodes = (S.nodes(v, 'pelvic').examined || 0) + (S.nodes(v, 'pa').examined || 0);
  if (!anyNodes && (S.substantialLvsi(v) || S.isAggressive(v))) info('No lymph nodes examined (pNX) in a case with substantial LVSI or an aggressive histotype.');
  const mets = arr(v.distantMets);
  if (mets.length > 1 && mets.includes('Not identified')) warn('Distant metastasis: "Not identified" is ticked together with metastatic sites.');
  if (mets.some((s) => /\(specify\)/.test(s)) && !stripDot(v.distantDetail)) warn('Distant metastasis: specify the site.');
  if (mmrLost(v) && !stripDot(v.mmrDetail)) err('MMR loss: name the protein(s) lost.');
  if (poleMutated(v) && !stripDot(v.poleDetail)) warn('POLE mutated: record the variant.');
  if (!v.mmrIhc || v.mmrIhc === 'Not performed') warn('MMR immunohistochemistry is not recorded; universal MMR testing is recommended for endometrial carcinoma.');
  if (poleMutated(v) && (mmrLost(v) || p53Abnormal(v)) && v.promise !== 'Double classifier (explain)' && v.promise !== 'POLE-mutated carcinoma') {
    warn('POLE mutation with MMR loss or abnormal p53: pick "Double classifier (explain)" or confirm POLE-mutated; POLE takes precedence.');
  }
  if (mmrLost(v) && p53Abnormal(v) && !poleMutated(v) && v.promise !== 'Double classifier (explain)' && v.promise !== 'Mismatch repair-deficient carcinoma') {
    warn('MMR loss with abnormal p53: pick "Double classifier (explain)" or confirm MMR-deficient; MMRd takes precedence over p53abn.');
  }
  if (v.promise === 'Double classifier (explain)' && !stripDot(v.promiseDetail)) err('Double classifier: explain the combination and the class assigned.');
  if (v.promise && v.promise !== 'Derive from the results above' && v.promise !== 'Double classifier (explain)') {
    const derived = derivedPromise(v);
    if (derived !== v.promise && derived !== 'Not classified (testing incomplete)') warn(`Molecular class picked (${v.promise}) differs from the derived class (${derived}); the picked value is used.`);
  }
  if (p53Abnormal(v) && v.histType === S.ENDOMETRIOID && /^FIGO grade [12]/.test(v.grade || '')) warn('Abnormal p53 in a low-grade endometrioid carcinoma is unusual; review the staining pattern and consider a serous or high-grade component.');
  if (resolvedPromise(v) === 'Not classified (testing incomplete)' && (pending(v.pole) || pending(v.mmrIhc) || pending(v.p53))) info('Molecular testing is pending; the FIGO 2023 reference stage may change once the class is confirmed.');
  if (v.peritonealFluid === 'Results pending') info('Peritoneal fluid cytology is pending; correlate with the separate cytology report.');
  if (v.vaginalMargin === 'Uninvolved by carcinoma' && num(v.vaginalMarginMm) === null && (v.cervix === 'Cervical stromal invasion' || /Radical/.test(v.procedure || ''))) warn('Cervical involvement or radical hysterectomy: record the distance to the vaginal cuff margin in mm.');
  if (/Radical/.test(v.procedure || '') && (!v.parametrialMargin || v.parametrialMargin === 'Not applicable')) warn('Radical hysterectomy: report the parametrial margin.');
  if ((v.tnmOverride || '').trim()) {
    const st = staging(part);
    if (!st.overridden) err(`Override "${v.tnmOverride.trim()}" could not be parsed (use e.g. "pT1b pN0").`);
    else if (!(v.tnmOverrideReason || '').trim()) err('Give a reason for overriding the derived pTNM.');
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

export default { specimenName, macro, blockKey, microscopy, synoptic, diagnosis, validate, flags, staging };
