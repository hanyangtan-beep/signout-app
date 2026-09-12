// Breast carcinoma resection - synoptic report in the QMH BREAST-Cancers element order (CAP Breast
// Invasive Resection 4.11.0.0, AJCC 8th edition), house layout: the "- " bullets, the Tumour histology
// paragraph after the grade, pTNM only when printPTNM (docs/specs/breast-pair.md).
//
// Sentinel nodes: a frozen "Breast sentinel lymph node" part in the same case pre-fills the node counts
// ("Add breast synoptic" in the app; `prefillFromFrozen`) and the Regional lymph nodes line names it as
// the origin; a prior sentinel node accession typed in the case fields prints the same way.
import { deriveTNM, stageLine } from '../src/staging/index.js';
import * as S from '../src/staging/breast.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { biomarkerReport, hasBiomarkerData } from './breast_biomarkers.js';
import { slnSummary } from './frozen.js';
import {
  num, fmt, lc1, uc1, countWords, stripDot, arr, listJoin, specify, plural, item,
  procedureText, siteText, headParts, specimenName, diagnosisHead, otherParts, hasExtraParts, otherSpecimenLines, specimens, findingText, lettered,
  specimenSentence, tumourSentence, blockKey, marginItems, marginsPhrase, closestMargin, parseMargins, nodeItems, nodesPhrase, nodeCounts, nodesSubmitted,
  metastasisValue, metastasisPhrase, ptnmSection, sharedChecks, marginChecks
} from './breast_shared.js';

export { specimenName, specimens, otherSpecimenLines, hasExtraParts, blockKey };

const SLN_SCENARIO = 'Breast sentinel lymph node';
const NST = 'Invasive carcinoma of no special type (ductal)';
const dcisPresent = (v) => /^Present/.test(v.dcis || '');
const treated = (v) => S.treated(v);
const noResidual = (v) => S.NO_RESIDUAL.test(v.histType || '') || v.sizeMode === 'No residual carcinoma';
const microinvasion = (v) => v.sizeMode === 'Microinvasion only';
const ULCER = /with macroscopic skin ulceration/;

// ---------- histology ----------

/** Pattern / variant detail typed by the user, with a redundant leading "with" or trailing "pattern" / "variant" removed. */
function patternDetail(v) {
  return stripDot(v.histTypeDetail).replace(/^with\s+/i, '').replace(/\s+(pattern|variant)$/i, '');
}

export function histTypeName(v) {
  const t = v.histType || NST;
  const d = /with specific morphologic pattern|variant pattern/.test(t) ? patternDetail(v) : stripDot(v.histTypeDetail);
  if (/\(specify/.test(t)) return d ? `${specify(t)}: ${d}` : specify(t);
  if (/with specific morphologic pattern|variant pattern/.test(t) && d) return `${t} (${d})`;
  return t;
}

/** Short type for the diagnosis line: "Invasive carcinoma of no special type", "Invasive lobular carcinoma" … */
export function shortTypeName(v) {
  const t = v.histType || NST;
  const d = /with specific morphologic pattern|variant pattern/.test(t) ? patternDetail(v) : stripDot(v.histTypeDetail);
  if (t === 'Other (specify)') return d || 'Invasive carcinoma';
  if (/^Mixed histologic types/.test(t)) return d ? `Invasive carcinoma, mixed types (${d})` : 'Invasive carcinoma, mixed histologic types';
  if (/^Metaplastic carcinoma, other/.test(t)) return d ? `Metaplastic carcinoma, ${lc1(d)}` : 'Metaplastic carcinoma';
  if (/^Metaplastic carcinoma, mixed/.test(t)) return d ? `Metaplastic carcinoma, mixed (${d})` : 'Metaplastic carcinoma, mixed';
  return t.replace(/ \(ductal\)/, '').replace(/, pure or greater than 90%/, '').replace(/ with specific morphologic pattern$/, d ? ` with ${lc1(d)} pattern` : '').replace(/, variant pattern$/, d ? `, ${lc1(d)} variant` : ', variant pattern').replace(/, classic$/, '').replace(/ \/ matrix production/, '');
}

const scoreNum = (s) => { const m = String(s || '').match(/^Score ([123])/); return m ? parseInt(m[1], 10) : null; };
const gradeFromSum = (sum) => (sum <= 5 ? 1 : sum <= 7 ? 2 : 3);
const GRADE_TEXT = { 1: 'Grade 1 (scores of 3, 4, or 5)', 2: 'Grade 2 (scores of 6 or 7)', 3: 'Grade 3 (scores of 8 or 9)' };

/** Nottingham grade: {value, short, sum, derived, typed, mismatch}. */
export function gradeOf(v) {
  const t = scoreNum(v.tubule); const n = scoreNum(v.nuclear); const m = scoreNum(v.mitotic);
  const any = [v.tubule, v.nuclear, v.mitotic];
  const typed = v.grade && v.grade !== 'Derive from the scores' ? v.grade : '';
  const sum = t !== null && n !== null && m !== null ? t + n + m : null;
  const derived = sum !== null ? gradeFromSum(sum) : null;
  if (noResidual(v)) return { value: 'Not applicable (no residual invasive carcinoma)', short: '', sum, derived, typed, mismatch: false };
  if (any.some((s) => /^Only microinvasion/.test(s || '')) || (typed && /^Only microinvasion/.test(typed))) return { value: 'Only microinvasion present (not graded)', short: 'microinvasion only', sum, derived, typed, mismatch: false };
  if (typed && /^Grade [123]/.test(typed)) {
    const g = parseInt(typed.charAt(6), 10);
    return { value: `${GRADE_TEXT[g]}${sum !== null ? `; total score ${sum}` : ''}`, short: `grade ${g}`, sum, derived, typed, mismatch: derived !== null && derived !== g };
  }
  if (typed && /cannot/.test(typed)) return { value: 'Score cannot be determined', short: '', sum, derived, typed, mismatch: false };
  if (derived === null) return { value: 'Score cannot be determined', short: '', sum, derived, typed, mismatch: false };
  return { value: `${GRADE_TEXT[derived]}; total score ${sum}`, short: `grade ${derived}`, sum, derived, typed, mismatch: false };
}

const DCIS_GRADE_WORD = { 'Grade I (low)': 'low', 'Grade II (intermediate)': 'intermediate', 'Grade III (high)': 'high' };

export function dcisText(v) {
  if (!dcisPresent(v)) return '';
  const g = DCIS_GRADE_WORD[v.dcisGrade] || '';
  const pats = arr(v.dcisPatterns).map((p) => (p === 'Other (specify)' ? stripDot(v.dcisPatternOther) : lc1(p))).filter(Boolean);
  const nec = v.dcisNecrosis || 'Not identified';
  const size = stripDot(v.dcisSize);
  return `Ductal carcinoma in situ${g ? ` of ${g} nuclear grade` : ''}${pats.length ? `, ${listJoin(pats)} type${pats.length > 1 ? 's' : ''}` : ''}${/^Present, central/.test(nec) ? ', with comedo necrosis' : /^Present, focal/.test(nec) ? ', with focal necrosis' : ', without necrosis'}, is present${size ? ` (${size} mm)` : ''}${/Positive for extensive/.test(v.dcis) ? ' and forms an extensive intraductal component' : ''}.`;
}

/** Automatic Tumour histology paragraph (typed microDescription wins); the typed IHC is appended. */
export function histologyPara(v) {
  const typed = stripDot(v.microDescription);
  const ihc = stripDot(v.ihc);
  if (typed) return `${typed}.${ihc ? ` ${uc1(ihc)}.` : ''}`;
  const s = [];
  const g = gradeOf(v);
  if (noResidual(v)) {
    s.push(`Sections from the tumour bed show ${treated(v) ? 'fibrosis, elastosis and histiocytic aggregates in keeping with treated tumour, with' : 'a fibrotic area with'} no residual invasive carcinoma.`);
  } else {
    const type = lc1(shortTypeName(v));
    const size = num(v.sizeMm);
    const scores = g.sum !== null ? ` (tubule formation ${scoreNum(v.tubule)}, nuclear pleomorphism ${scoreNum(v.nuclear)}, mitotic count ${scoreNum(v.mitotic)}${num(v.mitoticCount) !== null ? `, ${fmt(num(v.mitoticCount))} per 10 hpf` : ''}; total ${g.sum})` : '';
    s.push(`Sections show ${/^[aeiou]/.test(type) ? 'an' : 'a'} ${type}${g.short && /^grade/.test(g.short) ? `, Nottingham ${g.short}${scores}` : microinvasion(v) ? ' (microinvasion only, not graded)' : ''}${size !== null ? `, measuring ${fmt(size)} mm in greatest dimension` : ''}${/^Multiple/.test(v.focality || '') ? ` as multiple foci${stripDot(v.focalityDetail) ? ` (${stripDot(v.focalityDetail)})` : ''}` : ''}.`);
    if (treated(v)) s.push(`There is ${/^No definite/.test(v.treatmentEffect) ? 'no definite' : 'a'} response to presurgical therapy${v.millerPayne ? ` (Miller-Payne ${lc1(v.millerPayne)})` : ''}.`);
  }
  const d = dcisText(v);
  if (d) s.push(d);
  const lvi = v.lvi || 'Not identified';
  s.push(/^Present/.test(lvi) ? `Lymphovascular invasion is present${/focal|extensive/.test(lvi) ? ` (${/focal/.test(lvi) ? 'focal' : 'extensive'})` : ''}.` : 'There is no lymphovascular invasion.');
  if (v.pni === 'Present') s.push('Perineural invasion is present.');
  const np = v.nipple || ''; const sk = v.skin || '';
  const structures = [];
  if (np === 'Present and not involved') structures.push('nipple');
  if (sk === 'Present and not involved') structures.push('skin');
  if (structures.length) s.push(`The ${listJoin(structures)} ${structures.length === 1 ? 'is' : 'are'} not involved.`);
  if (/Paget/.test(np)) s.push("Paget's disease of the nipple is present.");
  if (/^Involved/.test(np)) s.push('The nipple is involved by invasive carcinoma.');
  if (/lactiferous/.test(np)) s.push('DCIS involves the major lactiferous ducts of the nipple.');
  if (/^Carcinoma directly invades/.test(sk)) s.push(`The carcinoma invades the dermis${ULCER.test(sk) ? ' with skin ulceration' : ''}.`);
  if (/^Carcinoma invades/.test(v.skeletalMuscle || '')) s.push(/chest wall/.test(v.skeletalMuscle) ? 'The carcinoma invades the chest wall.' : 'The carcinoma invades skeletal muscle.');
  const extra = arr(v.additionalLesions).filter((x) => x !== 'Not identified' && x !== 'Other (specify)' && !/\(specify\)$/.test(x)).map(lc1);
  const extraDetail = stripDot(v.additionalLesionsDetail);
  if (extra.length || extraDetail) s.push(`The background breast shows ${listJoin([...extra, extraDetail].filter(Boolean))}.`);
  if (ihc) s.push(`${uc1(ihc)}.`);
  return s.join(' ');
}

// ---------- sentinel node origin ----------

/** Same-case frozen SLN parts: [{label, summary}] for the nodes-origin line and the count Checks. */
export function slnParts(part, ctx) {
  return (ctx?.case?.parts || []).filter((p) => p !== part && p.templateId === 'frozen_section' && p.values?.scenario === SLN_SCENARIO)
    .map((p) => ({ label: p.label, summary: slnSummary(p.values) })).filter((x) => x.summary);
}

export function nodesOrigin(part, ctx) {
  const sib = slnParts(part, ctx);
  if (sib.length) return `sentinel nodes from part${sib.length > 1 ? 's' : ''} ${listJoin(sib.map((s) => s.label))}`;
  const acc = stripDot(ctx?.case?.priorSlnAccession);
  if (acc) return `sentinel nodes from ${acc}`;
  return '';
}

// ---------- staging ----------

export function staging(part) { return deriveTNM(part.values, 'breast'); }

// ---------- macro ----------

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const s = [];
  if (part.linked) {
    if (stripDot(v.otherMacro)) s.push(`${uc1(stripDot(v.otherMacro))}.`);
    return s.length ? `(${part.label}) ${s.join(' ')}` : '';
  }
  s.push(specimenSentence(v));
  if (noResidual(v)) s.push(`Sectioning shows ${treated(v) ? 'an ill-defined fibrotic area at the tumour bed' : 'a fibrotic area at the previous biopsy site'}${stripDot(v.tumourDims) ? ` (${stripDot(v.tumourDims)} mm)` : ''}; no residual tumour is identified grossly.`);
  else if (v.sizeMode === 'Cannot be determined' && !stripDot(v.tumourDims)) s.push(`Sectioning reveals an ill-defined tumour of indeterminate size${stripDot(v.sizeCannot) ? ` (${lc1(stripDot(v.sizeCannot))})` : ''}.`);
  else s.push(tumourSentence(v));
  if (v.nipple === 'Present and not involved' || v.skin === 'Present and not involved') s.push('The skin and nipple are unremarkable.');
  if (stripDot(v.otherMacro)) s.push(`${uc1(stripDot(v.otherMacro))}.`);
  else s.push('The remaining breast tissue is fibrofatty and unremarkable.');
  const c = nodeCounts(v);
  if (nodesSubmitted(v) && c.examined && !slnParts(part, ctx).length && !stripDot(ctx?.case?.priorSlnAccession)) s.push(`${uc1(countWords(c.examined, 'lymph node'))} ${c.examined === 1 ? 'is' : 'are'} identified in the ${/^Sentinel node biopsy only/.test(v.nodeSampling) ? 'sentinel node specimen' : 'axillary tissue'}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- synoptic ----------

function sizeValue(v) {
  const size = num(v.sizeMm); const dims = stripDot(v.tumourDims);
  if (noResidual(v)) return 'No residual carcinoma';
  if (microinvasion(v)) return `Microinvasion only (< or = 1 mm)${size !== null ? `, ${fmt(size)} mm` : ''}`;
  if (v.sizeMode === 'Cannot be determined') return `Cannot be determined${stripDot(v.sizeCannot) ? ` (${lc1(stripDot(v.sizeCannot))})` : ''}`;
  if (size !== null) return `Greatest dimension ${fmt(size)} mm${dims ? ` (${dims} mm)` : ''}`;
  return dims ? `${dims} mm` : 'Cannot be determined';
}

function extensionSummary(v) {
  const e = [];
  if (/^Involved|Paget|lactiferous/.test(v.nipple || '')) e.push('nipple');
  if (/^Carcinoma directly invades/.test(v.skin || '')) e.push(ULCER.test(v.skin) ? 'skin with ulceration' : 'dermis');
  if (/^Macroscopic/.test(v.satellite || '')) e.push('macroscopic skin satellite foci');
  if (v.skinOedema === true) e.push('skin oedema');
  if (v.inflammatory === true) e.push('inflammatory carcinoma');
  if (/^Carcinoma invades/.test(v.skeletalMuscle || '')) e.push(/chest wall/.test(v.skeletalMuscle) ? 'chest wall' : 'skeletal muscle');
  return e.length ? `Involves the ${listJoin(e)}` : 'Confined to the breast parenchyma';
}

const withDetail = (val, detail) => (val && /\((specify|explain)\)/.test(val) && stripDot(detail) ? `${specify(val)}: ${stripDot(detail)}` : val);

/** breast_biomarkers text ("- ER: Positive\n  - Intensity: Strong\n\nParagraph…") → synoptic items with sub-items. */
export function biomarkerBlock(text) {
  const out = [];
  for (const raw of String(text || '').split('\n')) {
    if (!raw.trim()) continue;
    const m = raw.match(/^(\s*)-\s*(.*)$/);
    if (!m) { out.push({ text: raw.trim() }); continue; }
    const body = m[2].trim();
    const kv = body.match(/^([^:]+?)\s*:\s*(.*)$/);
    const it = kv && kv[2] ? { label: kv[1], value: kv[2] } : { text: body };
    if (m[1].length >= 2 && out.length && out[out.length - 1].label) (out[out.length - 1].sub ||= []).push(it);
    else out.push(it);
  }
  return out;
}

export function biomarkerItems(v, ctx) {
  const mode = v.biomarkers || 'Not performed';
  if (mode === 'Performed') {
    if (!hasBiomarkerData(v)) return [item('Biomarker studies', 'Performed (results not yet entered)')];
    return biomarkerBlock(biomarkerReport(v));
  }
  if (/^Reported on the prior/.test(mode)) {
    const acc = stripDot(v.priorBiomarkerAccession) || stripDot(ctx?.case?.priorAccession);
    const sum = stripDot(v.priorBiomarkerSummary);
    return [item('Biomarker studies', `Reported on the prior core biopsy${acc ? ` (${acc})` : ''}${sum ? `: ${sum}` : ''}`)];
  }
  if (/^Requested/.test(mode)) return [item('Biomarker studies', 'Requested; to be reported separately')];
  return [item('Biomarker studies', 'Not performed on this specimen')];
}

export function synoptic(part, ctx) {
  const v = part.values;
  const st = staging(part);
  const g = gradeOf(v);
  const te = v.treatmentEffect || S.NO_THERAPY;
  const microcalcs = arr(v.microcalcs).map((m) => (m === 'Other (specify)' ? stripDot(v.microcalcsDetail) : m)).filter(Boolean);
  const lesions = arr(v.additionalLesions).map((m) => (/\(specify\)$/.test(m) ? [specify(m), stripDot(v.additionalLesionsDetail)].filter(Boolean).join(': ') : m)).filter(Boolean);
  const origin = nodesOrigin(part, ctx);
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureText(v)),
      item('Specimen laterality', v.laterality || 'Not specified'),
      item('Tumour site', siteText(v)),
      item('Tumour size', sizeValue(v))
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      item('Tumour focality', noResidual(v) ? 'Not applicable (no residual invasive carcinoma)' : `${v.focality || 'Single focus of invasive carcinoma'}${/^Multiple/.test(v.focality || '') && stripDot(v.focalityDetail) ? ` (${stripDot(v.focalityDetail)})` : ''}`),
      item('Histologic grade', g.value),
      !noResidual(v) && g.sum !== null ? item('Tubule formation', v.tubule) : null,
      !noResidual(v) && g.sum !== null ? item('Nuclear pleomorphism', v.nuclear) : null,
      !noResidual(v) && g.sum !== null ? item('Mitotic rate', `${v.mitotic}${num(v.mitoticCount) !== null ? ` (${fmt(num(v.mitoticCount))} per 10 hpf)` : ''}`) : null,
      { label: 'Tumour histology', para: histologyPara(v) },
      { label: 'Tumour extension', value: extensionSummary(v), sub: [
        item('Nipple', withDetail(v.nipple || 'Not present in specimen', v.nippleDetail)),
        item('Skin', withDetail(v.skin || 'Not present in specimen', v.skinDetail)),
        item('Skin satellite foci', v.satellite || 'Not identified'),
        v.skinOedema === true ? item('Skin oedema', "Present, including peau d'orange (T4b)") : null,
        v.inflammatory === true ? item('Inflammatory carcinoma', 'Present (clinical diagnosis; T4d)') : null,
        item('Skeletal muscle', withDetail(v.skeletalMuscle || 'Not present in specimen', v.skeletalMuscleDetail))
      ].filter(Boolean) },
      item('Lymphatic and/or vascular invasion', withDetail(v.lvi || 'Not identified', v.lviDetail)),
      item('Dermal lymphatic and/or vascular invasion', v.dermalLvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      item('Breast treatment effect', te),
      treated(v) ? item('LN treatment effect', v.lnTreatmentEffect && v.lnTreatmentEffect !== 'Not applicable' ? v.lnTreatmentEffect : 'Not applicable') : null,
      treated(v) && v.millerPayne ? item('Grading of treatment effects (Miller and Payne)', v.millerPayne) : null,
      { label: 'Ductal carcinoma in situ', value: v.dcis || 'Not identified', sub: dcisPresent(v) ? [
        item('Size (extent) of DCIS', stripDot(v.dcisSize) ? `${stripDot(v.dcisSize)} mm` : ''),
        num(v.dcisBlocks) !== null ? item('Number of blocks with DCIS', `${fmt(num(v.dcisBlocks))}${num(v.blocksExamined) !== null ? ` of ${fmt(num(v.blocksExamined))} blocks examined` : ''}`) : null,
        item('Nuclear grade', v.dcisGrade || ''),
        item('Necrosis', v.dcisNecrosis || 'Not identified'),
        arr(v.dcisPatterns).length ? item('Architectural patterns', arr(v.dcisPatterns).map((p) => (p === 'Other (specify)' ? stripDot(v.dcisPatternOther) : p)).filter(Boolean).join(', ')) : null
      ].filter(Boolean) : [] },
      item('Additional lesions', lesions.length ? lesions.join(', ') : 'Not identified'),
      item('Microcalcifications', microcalcs.length ? microcalcs.join(', ') : 'Not identified')
    ] },
    { heading: 'Ancillary studies', items: [...biomarkerItems(v, ctx), stripDot(v.ancillary) ? item('Other', stripDot(v.ancillary)) : null] },
    !noResidual(v) ? { heading: 'Margins (invasive carcinoma)', items: marginItems(v.marginsInvasive, 'invasive carcinoma') } : null,
    dcisPresent(v) ? { heading: 'Margins (DCIS)', items: marginItems(v.marginsDcis, 'DCIS') } : null,
    { heading: 'Regional lymph nodes', items: [
      ...nodeItems(v, { origin }),
      v.imNodes && v.imNodes !== 'Not submitted' ? item('Internal mammary nodes', v.imNodes) : null,
      v.infraclavicular === true ? item('Infraclavicular (level III) nodes', 'Involved') : null,
      v.supraclavicular === true ? item('Ipsilateral supraclavicular nodes', 'Involved') : null
    ] },
    { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] },
    ctx?.options?.printPTNM ? ptnmSection(st, v, stageLine) : null,
    { heading: 'Additional findings', items: [
      treated(v) && v.rcbClass ? item('Residual Cancer Burden', `${v.rcbClass}${stripDot(v.rcbDetail) ? ` (${stripDot(v.rcbDetail)})` : ''}`) : null,
      stripDot(v.additionalNotes) ? item('Additional notes', stripDot(v.additionalNotes)) : null,
      ...(!(treated(v) && v.rcbClass) && !stripDot(v.additionalNotes) ? [{ text: 'None' }] : [])
    ] }
  ].filter(Boolean);
  const heading = lettered(part, ctx) ? `(${part.label}) ${specimenName(part)}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- diagnosis ----------

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = diagnosisHead(part);
  const g = gradeOf(v);
  const size = num(v.sizeMm);
  const first = [];
  if (noResidual(v)) {
    first.push(`NO RESIDUAL INVASIVE CARCINOMA${treated(v) ? ' after presurgical therapy' : ''}${v.millerPayne ? ` (Miller-Payne ${lc1(v.millerPayne)})` : ''}`);
  } else {
    let clause = shortTypeName(v).toUpperCase();
    if (g.short) clause += `, ${g.short}`;
    if (microinvasion(v)) clause += size !== null ? `, ${fmt(size)} mm` : '';
    else if (size !== null) clause += `, ${fmt(size)} mm`;
    if (/^Multiple/.test(v.focality || '')) clause += ', multifocal';
    first.push(clause);
    if (treated(v)) first.push(`${/^No definite/.test(v.treatmentEffect) ? 'no definite' : 'with'} response to presurgical therapy${v.millerPayne ? ` (Miller-Payne ${lc1(v.millerPayne)})` : ''}`);
  }
  if (dcisPresent(v)) first.push(`DCIS present${DCIS_GRADE_WORD[v.dcisGrade] ? ` (${DCIS_GRADE_WORD[v.dcisGrade]} grade${stripDot(v.dcisSize) ? `, ${stripDot(v.dcisSize)} mm` : ''})` : stripDot(v.dcisSize) ? ` (${stripDot(v.dcisSize)} mm)` : ''}${/Positive for extensive/.test(v.dcis) ? ', extensive intraductal component' : ''}`);
  if (/Paget/.test(v.nipple || '')) first.push("Paget's disease of the nipple");
  const ext = [];
  if (/^Involved/.test(v.nipple || '')) ext.push('nipple');
  if (/^Carcinoma directly invades/.test(v.skin || '')) ext.push(ULCER.test(v.skin) ? 'skin (with ulceration)' : 'dermis');
  if (/^Carcinoma invades/.test(v.skeletalMuscle || '')) ext.push(/chest wall/.test(v.skeletalMuscle) ? 'chest wall' : 'skeletal muscle');
  if (ext.length) first.push(`invading the ${listJoin(ext)}`);
  if (/^Present/.test(v.lvi || '')) first.push('lymphovascular invasion present');
  const mi = !noResidual(v) ? marginsPhrase(v.marginsInvasive) : '';
  const md = dcisPresent(v) ? marginsPhrase(v.marginsDcis, 'DCIS') : '';
  if (mi && md) {
    const ci = closestMargin(v.marginsInvasive); const cd = closestMargin(v.marginsDcis);
    const involvedI = /involved/.test(mi); const involvedD = /involved/.test(md);
    if (!involvedI && !involvedD) {
      const cl = (c) => (c.allGt ? `all greater than ${fmt(c.mm)} mm` : `${fmt(c.mm)} mm, ${lc1(c.face)}`);
      first.push(`margins clear${ci || cd ? ` (closest: ${[ci ? `invasive carcinoma ${cl(ci)}` : '', cd ? `DCIS ${cl(cd)}` : ''].filter(Boolean).join('; ')})` : ''}`);
    } else first.push([mi, md].join('; '));
  } else if (mi || md) first.push(mi || md);
  const clauses = [`${first.join('; ')}; see synoptic report`];
  const np = nodesPhrase(v);
  if (np) clauses.push(np);
  const mp = metastasisPhrase(v);
  if (mp) clauses.push(mp);
  if (ctx?.options?.printPTNM) {
    const st = staging(part);
    let s = `${st.tnm} (${st.edition})`;
    if (st.stage) s += `, stage ${st.stage}${st.M === 'M-' ? ' (if cM0)' : ''}`;
    clauses.push(s);
  }
  const main = renderDiagnosis(head, clauses);
  const others = otherParts(v).map((p) => `(${p.label}) ${p.specimen.toUpperCase().replace(/(, .*)$/, (m) => m.toLowerCase())} - ${findingText(p.finding, 'CARCINOMA')}`);
  return [main, ...others].join('\n\n');
}

export function comment() { return ''; }

// ---------- frozen link ----------

/** Pre-fill from a frozen "Breast sentinel lymph node" part (app "Add breast synoptic"). */
export function prefillFromFrozen(fv) {
  const s = fv ? slnSummary(fv) : null;
  if (!s) return {};
  const out = { nodeSampling: 'Sentinel node biopsy only', nodesExamined: String(s.examined), nodesSentinel: String(s.examined), nodesMacro: String(s.macro), nodesMicro: String(s.micro), nodesItc: String(s.itc) };
  if (s.side) out.laterality = s.side;
  if (s.positive && s.largestMm !== null) out.depositMm = String(s.largestMm);
  if (s.positive) out.ene = s.ene;
  if (s.treatment && s.treatment !== S.NO_THERAPY) out.lnTreatmentEffect = s.treatment;
  return out;
}

// ---------- checks ----------

export function validate(part, ctx) {
  const v = part.values;
  const out = [];
  const err = (m) => out.push({ level: 'error', message: m });
  const warn = (m) => out.push({ level: 'warn', message: m });
  const info = (m) => out.push({ level: 'info', message: m });
  const size = num(v.sizeMm);
  if (/^Reported on the prior/.test(v.biomarkers || '') && !stripDot(v.priorBiomarkerAccession) && !stripDot(ctx?.case?.priorAccession)) warn('Biomarkers reported on the prior core biopsy: record its accession number.');
  const t = v.histType || NST;
  if (!noResidual(v) && v.sizeMode !== 'Cannot be determined' && size === null) warn('Tumour size not recorded: pT cannot be derived.');
  if (microinvasion(v) && size !== null && size > 1) err('Microinvasion only is selected but the size is more than 1 mm.');
  if (/\(specify/.test(t) && !stripDot(v.histTypeDetail)) err('Histologic type needs the specified types / percentages.');
  if (/^Multiple/.test(v.focality || '') && !stripDot(v.focalityDetail)) warn('Multiple foci: record the number and sizes; pT uses the largest focus.');
  const g = gradeOf(v);
  if (g.mismatch) err(`Histologic grade: the scores total ${g.sum} (${GRADE_TEXT[g.derived]}) but ${g.typed.replace(/ \(.*$/, '')} is selected.`);
  if (!noResidual(v) && !microinvasion(v) && g.sum === null && !/cannot/.test(v.grade || '')) warn('Nottingham grade: pick all three scores (or "Score cannot be determined").');
  if (treated(v) && (!v.lnTreatmentEffect || v.lnTreatmentEffect === 'Not applicable') && nodesSubmitted(v)) info('Presurgical therapy with nodes submitted: state the LN treatment effect.');
  if (!treated(v) && v.millerPayne) warn('Miller-Payne grade is recorded without presurgical therapy.');
  if (noResidual(v) && !treated(v) && !dcisPresent(v)) info('No residual invasive carcinoma without presurgical therapy: the carcinoma from the prior biopsy governs the stage (pT0 in this specimen).');
  if (dcisPresent(v)) {
    if (!v.dcisGrade) warn('DCIS present: record the nuclear grade.');
    if (!stripDot(v.dcisSize)) warn('DCIS present: record the size (extent).');
    const pd = marginChecks(v.marginsDcis, 'DCIS', out);
    const close = pd.faces.filter((f) => f.status === 'uninvolved' && !f.gt && f.mm < 2);
    if (close.length) warn(`DCIS within 2 mm of the ${listJoin(close.map((f) => lc1(f.face)))} margin${close.length > 1 ? 's' : ''} (${close.map((f) => `${fmt(f.mm)} mm`).join(', ')}): 2 mm is the adequate margin for DCIS.`);
  }
  if (!noResidual(v)) {
    const pi = marginChecks(v.marginsInvasive, 'invasive carcinoma', out);
    if (pi.faces.some((f) => f.status === 'involved')) info(/^Total mastectomy/.test(v.procedure || '') ? 'Invasive carcinoma at a margin of the mastectomy specimen: the involved margin is stated in the diagnosis; consider a comment for the clinical team.' : 'Invasive carcinoma at a margin: "no ink on tumour" is the adequate margin for invasive carcinoma after breast-conserving surgery.');
  }
  const st = staging(part);
  const c = nodeCounts(v);
  if (nodesSubmitted(v)) {
    if (c.positive + c.itc > c.examined) err(`Lymph nodes: ${c.positive + c.itc} involved but only ${c.examined} examined.`);
    if (c.sentinel > c.examined) err('Lymph nodes: more sentinel nodes than nodes examined.');
    if (/^Sentinel node biopsy only/.test(v.nodeSampling) && c.examined > 5) info(`${c.examined} sentinel nodes examined: (sn) is not appended above 5 nodes.`);
    if (c.positive && num(v.depositMm) === null) info('Lymph nodes involved: record the size of the largest metastatic deposit.');
    if (c.macro && num(v.depositMm) !== null && num(v.depositMm) <= 2) warn('A macrometastasis is more than 2 mm, but the largest deposit is 2 mm or less.');
    if (!c.macro && c.micro && num(v.depositMm) !== null && num(v.depositMm) > 2) warn('Micrometastasis only, but the largest deposit is more than 2 mm.');
  }
  for (const sp of slnParts(part, ctx)) {
    const s = sp.summary;
    if (!nodesSubmitted(v) || c.examined < s.examined || c.macro < s.macro || c.micro < s.micro || c.itc < s.itc) warn(`Part ${sp.label} (frozen sentinel nodes: ${s.positive}/${s.examined}${s.macro ? ', macrometastasis' : s.micro ? ', micrometastasis' : s.itc ? ', isolated tumour cells' : ''}) is not reflected in the node counts here.`);
    if (s.side && v.laterality && s.side !== v.laterality) warn(`Part ${sp.label} sentinel nodes are ${lc1(s.side)}; this specimen is ${lc1(v.laterality)}.`);
  }
  if (stripDot(ctx?.case?.priorSlnAccession) && !nodesSubmitted(v)) warn(`Prior sentinel node accession ${stripDot(ctx.case.priorSlnAccession)} is typed but no nodes are entered: enter its counts under Regional lymph nodes.`);
  if (v.distantMets === 'Present' && !arr(v.distantSites).length) warn('Distant metastasis present: select the site(s).');
  if (v.biomarkers === 'Performed' && !hasBiomarkerData(v)) warn('Biomarker studies "Performed" but no results are entered.');
  if (/^Reported on the prior/.test(v.biomarkers || '') && !stripDot(v.priorBiomarkerSummary)) info('Biomarkers reported on the prior core: type the summary so it prints with the synoptic.');
  if (v.biomarkers === 'Performed' && /\(Score 2\+\)$/.test(v.her2Score || '') && !v.her2Dish) warn('HER2 IHC 2+ is equivocal: reflex in situ hybridisation is expected.');
  sharedChecks(part, st, out);
  if (st.stage) info(`AJCC 8th anatomic stage group (${st.M === 'M-' ? 'if cM0' : 'pM recorded'}): ${st.stage}${st.overridden ? ' (from the override)' : ''}. The prognostic stage group (grade, ER, PR, HER2) is not printed.`);
  return out;
}

export function flags(parts) {
  const out = [];
  for (const p of parts) {
    const v = p.values;
    if (/^Requested/.test(v.biomarkers || '')) out.push(`(${p.label}) Biomarker studies requested; supplementary report to follow.`);
    if (stripDot(v.ancillary) && /requested|pending|to follow|sent/i.test(v.ancillary)) out.push(`(${p.label}) Ancillary result pending: ${stripDot(v.ancillary)}.`);
    if (v.biomarkers === 'Performed' && /\(Score 2\+\)$/.test(v.her2Score || '') && !v.her2Dish) out.push(`(${p.label}) HER2 IHC 2+: ISH result pending.`);
  }
  return out;
}

export default { specimenName, specimens, otherSpecimenLines, macro, blockKey, synoptic, diagnosis, comment, validate, flags, staging, hasExtraParts, prefillFromFrozen };
