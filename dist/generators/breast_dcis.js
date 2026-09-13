// Breast DCIS resection - generator for schemas/breast_dcis.json.
// Element order follows the QMH BREAST-DCIS page (CAP DCIS Resection 4.5.0.1); house exceptions: a
// Specimen and tumour section, the Tumour histology paragraph after the nuclear grade, and the margin walker
// text. pTNM (pTis(DCIS) / pTis(Paget) with pN and pM) prints only with the printPTNM option.
// Shared helpers: ./breast_shared.js; biomarker rendering: ./breast_carcinoma.js (biomarkerItems).
import { deriveTNM, stageLine } from '../src/staging/index.js?v=mtz3fp24';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js?v=mtz3fp24';
import { hasBiomarkerData } from './breast_biomarkers.js?v=mtz3fp24';
import { biomarkerItems } from './breast_carcinoma.js?v=mtz3fp24';
import {
  num, fmt, lc1, lcProse, uc1, countWords, stripDot, arr, listJoin, specify, plural, item,
  procedureText, siteText, specimenName, diagnosisHead, otherParts, hasExtraParts, otherSpecimenLines, specimens, findingText, lettered,
  specimenSentence, tumourSentence, blockKey, marginItems, marginsPhrase, closestMargin, closestWords, nodeItems, nodesPhrase, nodeCounts, nodesSubmitted,
  metastasisValue, metastasisPhrase, ptnmSection, sharedChecks, marginChecks
} from './breast_shared.js?v=mtz3fp24';

export { specimenName, specimens, otherSpecimenLines, hasExtraParts, blockKey };

const DCIS = 'Ductal carcinoma in situ (DCIS)';
const GRADE_WORD = { 'Grade I (low)': 'low grade', 'Grade II (intermediate)': 'intermediate grade', 'Grade III (high)': 'high grade' };
const isPaget = (v) => /^Paget/.test(v.histType || '');
/** What the margin is (un)involved by: DCIS, Paget's disease, or carcinoma in situ for the papillary types. */
const marginWord = (v) => (isPaget(v) ? "Paget's disease" : /papillary/i.test(v.histType || '') ? 'carcinoma in situ' : 'DCIS');
const pagetNipple = (v) => /Paget/.test(v.nipple || '');

// ---------- type and grade ----------

export function histTypeName(v) { return v.histType || DCIS; }

/** Upper-case diagnosis head noun: DUCTAL CARCINOMA IN SITU, PAGET DISEASE OF THE NIPPLE, ... */
export function shortTypeName(v) {
  const t = histTypeName(v);
  if (t === DCIS) return 'Ductal carcinoma in situ';
  if (isPaget(v)) return "Paget's disease of the nipple";
  return t;
}

export function gradeText(v) {
  const g = v.dcisGrade || '';
  if (GRADE_WORD[g]) return GRADE_WORD[g];
  if (/^Other/.test(g)) return lc1(stripDot(v.dcisGradeDetail)) || '';
  return '';
}

export function patternText(v) {
  const list = arr(v.dcisPatterns).map((p) => (p === 'Other (specify)' ? stripDot(v.dcisPatternOther) : p)).filter(Boolean);
  return listJoin(list.map((p) => (/^Paget/.test(p) ? 'Paget disease of the nipple' : lc1(p))));
}

/** Always in situ here: pTis(DCIS), or pTis(Paget) for Paget disease without DCIS in the breast. */
export function staging(part) { return deriveTNM({ ...part.values, inSitu: true }, 'breast'); }

// ---------- macro ----------

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const s = [specimenSentence(v)];
  if (v.sizeMode === 'Cannot be determined' && !stripDot(v.tumourDims)) s.push(`Sectioning reveals ${arr(v.cutSurface).length ? 'an ill-defined firm area' : 'no discrete lesion'}${stripDot(v.sizeCannot) ? ` (${lcProse(stripDot(v.sizeCannot))})` : ''}.`);
  else s.push(tumourSentence(v, { noun: 'area' }));
  if (v.nipple === 'Present and not involved') s.push('The skin and nipple are unremarkable.');
  if (stripDot(v.otherMacro)) s.push(`${uc1(stripDot(v.otherMacro))}.`);
  else s.push('The remaining breast tissue is fibrofatty and unremarkable.');
  const c = nodeCounts(v);
  if (nodesSubmitted(v) && c.examined) s.push(`${uc1(countWords(c.examined, 'lymph node'))} ${c.examined === 1 ? 'is' : 'are'} identified${/^Sentinel/.test(v.nodeSampling) ? ' in the sentinel node specimen' : ' in the axillary tissue'} and entirely embedded.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- microscopy ----------

function sizeValue(v) {
  const size = num(v.sizeMm); const dims = stripDot(v.tumourDims);
  if (v.sizeMode === 'Cannot be determined') return `Cannot be determined${stripDot(v.sizeCannot) ? ` (${lcProse(stripDot(v.sizeCannot))})` : ''}`;
  if (size !== null) return `Greatest dimension ${fmt(size)} mm${dims ? ` (${dims} mm)` : ''}`;
  return dims ? `${dims} mm` : 'Cannot be determined';
}

function blocksValue(v) {
  const b = num(v.dcisBlocks); const t = num(v.blocksExamined);
  if (b === null && t === null) return '';
  if (b === null && isPaget(v)) return 'Not applicable (no DCIS)';
  if (b === null || t === null) return '';
  return `${fmt(b)} of ${fmt(t)} blocks`;
}

const necrosisText = (v) => {
  const n = v.dcisNecrosis || 'Not identified';
  if (/central/.test(n)) return 'central (comedo) necrosis';
  if (/focal/.test(n)) return 'focal necrosis';
  if (/^Other/.test(n)) return lc1(stripDot(v.dcisNecrosisDetail));
  return '';
};

export function histologyPara(v) {
  const typed = stripDot(v.microDescription);
  const ihc = stripDot(v.ihc);
  if (typed) return `${typed}.${ihc ? ` ${uc1(ihc)}.` : ''}`;
  const s = [];
  const size = num(v.sizeMm);
  const grade = gradeText(v);
  const patterns = patternText(v);
  const nec = necrosisText(v);
  const calc = arr(v.microcalcs).includes('Present in DCIS');
  if (isPaget(v)) {
    s.push(`Sections of the nipple show large pale malignant cells singly and in clusters within the epidermis, in keeping with Paget's disease${size !== null ? `, over ${fmt(size)} mm` : ''}.`);
    if (/lactiferous/.test(v.nipple || '')) s.push('DCIS involves the underlying lactiferous ducts.');
  } else {
    const noun = histTypeName(v) === DCIS ? 'ductal carcinoma in situ' : lc1(histTypeName(v));
    s.push(`Sections show ${noun}${grade ? ` of ${grade}` : ''}${patterns ? ` with ${patterns} architecture` : ''}${nec ? `, with ${nec}` : ''}${calc ? ' and associated microcalcification' : ''}${size !== null ? `, spanning ${fmt(size)} mm` : ''}${blocksValue(v) ? ` (${blocksValue(v)})` : ''}.`);
  }
  s.push('No invasive carcinoma is identified.');
  if (v.nipple === 'Present and not involved') s.push('The nipple is not involved.');
  if (pagetNipple(v) && !isPaget(v)) s.push("Paget's disease of the nipple is present.");
  if (/lactiferous/.test(v.nipple || '') && !isPaget(v)) s.push('DCIS involves the major lactiferous ducts of the nipple.');
  const extra = arr(v.additionalLesions).filter((x) => x !== 'Not identified' && x !== 'Other (specify)').map(lc1);
  const extraDetail = stripDot(v.additionalLesionsDetail);
  if (extra.length || extraDetail) s.push(`The background breast shows ${listJoin([...extra, extraDetail].filter(Boolean))}.`);
  if (ihc) s.push(`${uc1(ihc)}.`);
  return s.join(' ');
}

const withDetail = (val, detail) => (val && /\((specify|explain)\)/.test(val) && stripDot(detail) ? `${specify(val)}: ${stripDot(detail)}` : val);

export function synoptic(part, ctx) {
  const v = part.values;
  const st = staging(part);
  const microcalcs = arr(v.microcalcs).map((m) => (m === 'Other (specify)' ? stripDot(v.microcalcsDetail) : m)).filter(Boolean);
  const lesions = arr(v.additionalLesions).map((m) => (/\(specify\)$/.test(m) ? [specify(m), stripDot(v.additionalLesionsDetail)].filter(Boolean).join(': ') : m)).filter(Boolean);
  const patterns = arr(v.dcisPatterns).map((p) => (p === 'Other (specify)' ? stripDot(v.dcisPatternOther) : p)).filter(Boolean);
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureText(v)),
      item('Specimen laterality', v.laterality || 'Not specified'),
      item('Tumour site', siteText(v)),
      blocksValue(v) ? item('Number of blocks with DCIS out of total', blocksValue(v)) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      item('Size (extent) of DCIS', sizeValue(v)),
      !isPaget(v) || patterns.length ? item('Architectural patterns', patterns.length ? patterns.join(', ') : 'Not specified') : null,
      item('Nuclear grade', withDetail(v.dcisGrade || 'Cannot be determined (explain)', v.dcisGradeDetail)),
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Necrosis', withDetail(v.dcisNecrosis || 'Not identified', v.dcisNecrosisDetail)),
      item('Microcalcifications', microcalcs.length ? microcalcs.join(', ') : 'Not identified'),
      item('Nipple', v.nipple || 'Not present in specimen'),
      item('Additional lesions', lesions.length ? lesions.join(', ') : 'Not identified')
    ] },
    { heading: 'Ancillary studies', items: [...biomarkerItems(v, ctx), stripDot(v.ancillary) ? item('Other', stripDot(v.ancillary)) : null] },
    { heading: 'Margins (DCIS)', items: marginItems(v.marginsDcis, marginWord(v)) },
    { heading: 'Regional lymph nodes', items: nodeItems(v) },
    { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] },
    ctx?.options?.printPTNM ? ptnmSection(st, v, stageLine) : null,
    { heading: 'Additional findings', items: [stripDot(v.additionalNotes) ? item('Additional notes', stripDot(v.additionalNotes)) : { text: 'None' }] }
  ].filter(Boolean);
  const heading = lettered(part, ctx) ? `(${part.label}) ${specimenName(part)}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- diagnosis ----------

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = diagnosisHead(part);
  const size = num(v.sizeMm);
  const first = [];
  let clause = shortTypeName(v).toUpperCase();
  const grade = gradeText(v);
  if (grade) clause += `, ${grade}`;
  if (size !== null) clause += `, ${fmt(size)} mm`;
  first.push(clause);
  if (pagetNipple(v) && !isPaget(v)) first.push("Paget's disease of the nipple");
  if (/lactiferous/.test(v.nipple || '')) first.push('involving the lactiferous ducts');
  const md = marginsPhrase(v.marginsDcis, marginWord(v));
  if (md) {
    if (!/involved/.test(md)) {
      const c = closestMargin(v.marginsDcis);
      first.push(`margins clear${c ? ` (${closestWords(c)})` : ''}`);
    } else first.push(md);
  }
  first.push('no invasive carcinoma identified');
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
  const others = otherParts(v).map((p) => `(${p.label}) ${p.specimen.toUpperCase().replace(/(, .*)$/, (m) => m.toLowerCase())} - ${findingText(p.finding, 'DCIS')}`);
  return [main, ...others].join('\n\n');
}

export function comment() { return ''; }

// ---------- checks ----------

export function validate(part, ctx) {
  const v = part.values;
  const out = [];
  const err = (m) => out.push({ level: 'error', message: m });
  const warn = (m) => out.push({ level: 'warn', message: m });
  const info = (m) => out.push({ level: 'info', message: m });
  const size = num(v.sizeMm);
  if (v.sizeMode !== 'Cannot be determined' && size === null) warn('Extent of DCIS not recorded: the size prints as "Cannot be determined".');
  if (/^(Other|Cannot)/.test(v.dcisGrade || '') && !stripDot(v.dcisGradeDetail)) warn('Nuclear grade "Other / Cannot be determined" needs the explanation.');
  if (!isPaget(v) && !arr(v.dcisPatterns).length) info('No architectural pattern selected.');
  if (arr(v.dcisPatterns).includes('Other (specify)') && !stripDot(v.dcisPatternOther)) warn('Architectural pattern "Other" needs the specified pattern.');
  if (num(v.dcisBlocks) !== null && num(v.blocksExamined) !== null && num(v.dcisBlocks) > num(v.blocksExamined)) err('More blocks with DCIS than blocks examined.');
  if (num(v.dcisBlocks) === null && !isPaget(v)) info('Record the number of blocks with DCIS out of the total (QMH element).');
  if (isPaget(v) && v.nipple && !/Paget|Not present/.test(v.nipple)) warn('Histologic type is Paget disease but the nipple field does not record Paget disease.');
  if (/^Ductal carcinoma in situ|papillary/.test(v.histType || '') && pagetNipple(v)) info('DCIS with Paget disease of the nipple: pTis(DCIS) (Paget disease with underlying DCIS is staged by the DCIS).');
  const pd = marginChecks(v.marginsDcis, 'DCIS', out);
  if (pd.faces.some((f) => f.status === 'involved')) info(`${uc1(marginWord(v))} at a margin: re-excision is usually recommended after breast-conserving surgery.`);
  const close = pd.faces.filter((f) => f.status === 'uninvolved' && !f.gt && f.mm < 2);
  if (close.length) warn(`DCIS within 2 mm of the ${listJoin(close.map((f) => lc1(f.face)))} margin${close.length > 1 ? 's' : ''} (${close.map((f) => `${fmt(f.mm)} mm`).join(', ')}): 2 mm is the adequate margin for DCIS treated with breast-conserving surgery and radiotherapy.`);
  const st = staging(part);
  const c = nodeCounts(v);
  if (nodesSubmitted(v)) {
    if (c.positive + c.itc > c.examined) err(`Lymph nodes: ${c.positive + c.itc} involved but only ${c.examined} examined.`);
    if (c.sentinel > c.examined) err('Lymph nodes: more sentinel nodes than nodes examined.');
    if (c.positive) warn('Nodal metastasis with pure DCIS: exclude an unsampled invasive component (further levels / blocks) before signing out as in situ.');
    if (c.positive && num(v.depositMm) === null) info('Lymph nodes involved: record the size of the largest metastatic deposit.');
  }
  if (v.distantMets === 'Present' && !arr(v.distantSites).length) warn('Distant metastasis present: select the site(s).');
  if (v.biomarkers === 'Performed' && !hasBiomarkerData(v)) warn('Biomarker studies "Performed" but no results are entered.');
  if (/^Reported on the prior/.test(v.biomarkers || '') && !stripDot(v.priorBiomarkerSummary)) info('Biomarkers reported on the prior core: type the summary so it prints with the synoptic.');
  if (/^Not performed/.test(v.biomarkers || '')) info('ER (and PR) are requested for DCIS to guide endocrine therapy (QMH: use the Breast IHC/DISH template).');
  sharedChecks(part, st, out);
  // Nodes are not routinely sampled for pure DCIS: pNX is expected, not a warning.
  const kept = nodesSubmitted(v) ? out : out.filter((i) => !/^pNX/.test(i.message));
  if (st.stage) kept.push({ level: 'info', message: `AJCC 8th anatomic stage group (${st.M === 'M-' ? 'if cM0' : 'pM recorded'}): ${st.stage}${st.overridden ? ' (from the override)' : ''}.` });
  return kept;
}

export function flags(parts) {
  const out = [];
  for (const p of parts) {
    const v = p.values;
    if (/^Requested/.test(v.biomarkers || '')) out.push(`(${p.label}) ER/PR requested; supplementary report to follow.`);
    if (stripDot(v.ancillary) && /requested|pending|to follow|sent/i.test(v.ancillary)) out.push(`(${p.label}) Ancillary result pending: ${stripDot(v.ancillary)}.`);
  }
  return out;
}

export default { specimenName, specimens, otherSpecimenLines, macro, blockKey, synoptic, diagnosis, comment, validate, flags, staging, hasExtraParts, histTypeName, shortTypeName, gradeText, histologyPara };
