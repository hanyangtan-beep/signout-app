// Breast phyllodes tumour resection - generator for schemas/phyllodes.json.
// Element order follows the QMH BREAST-Phyllodes page (CAP Phyllodes Tumor 4.1.0.0); house exceptions: a
// Specimen and tumour section, the Tumour histology paragraph after the histologic type, the epithelial
// component and the margin walker text. pTNM prints only with the printPTNM option, and only for malignant phyllodes tumour (AJCC staging does not apply to benign or borderline tumours).
import { deriveTNM, stageLine } from '../src/staging/index.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import {
  num, int, fmt, lc1, uc1, countWords, stripDot, arr, listJoin, specify, plural, item,
  procedureText, siteText, specimenName, diagnosisHead, otherParts, hasExtraParts, otherSpecimenLines, specimens, findingText, lettered,
  specimenSentence, tumourSentence, blockKey, marginItems, marginsPhrase, closestMargin, closestWords, nodeItems, nodesPhrase, nodeCounts, nodesSubmitted,
  metastasisValue, metastasisPhrase, ptnmSection, sharedChecks, marginChecks
} from './breast_shared.js';

export { specimenName, specimens, otherSpecimenLines, hasExtraParts, blockKey };

export const GRADES = ['benign', 'borderline', 'malignant'];
const noTumour = (v) => /^No tumo/i.test(v.histType || '') || v.sizeMode === 'No residual tumour';

/** 'benign' | 'borderline' | 'malignant' | '' from the histologic type. */
export function gradeOf(v) {
  const m = String(v.histType || '').match(/,\s*(benign|borderline|malignant)/i);
  return m ? m[1].toLowerCase() : '';
}

/** House spelling for the report: "Phyllodes tumour, borderline". */
export function histTypeName(v) { return (v.histType || 'Phyllodes tumor, benign').replace(/tumor/g, 'tumour'); }

/** Grade suggested by the WHO elements (mitoses, cellularity, atypia, overgrowth, border, heterologous). */
export function suggestedGrade(v) {
  if (arr(v.heterologous).some((h) => h !== 'Not identified')) return 'malignant';
  const mit = num(v.mitoticCount);
  const perMm2 = /mm2/.test(v.mitoticMode || '');
  const hi = perMm2 ? 5 : 10; const mid = perMm2 ? 2.5 : 5;
  const marked = /^Marked/.test(v.stromalCellularity || '') && /^Marked/.test(v.stromalAtypia || '') && v.stromalOvergrowth === 'Present' && /extensive/.test(v.tumourBorder || '') && mit !== null && mit >= hi;
  if (marked) return 'malignant';
  const anyBorderline = /^Moderate|^Marked/.test(v.stromalCellularity || '') || /^Moderate|^Marked/.test(v.stromalAtypia || '') || v.stromalOvergrowth === 'Present' || /Infiltrative/.test(v.tumourBorder || '') || (mit !== null && mit >= mid);
  return anyBorderline ? 'borderline' : 'benign';
}

export function staging(part) { return deriveTNM(part.values, 'phyllodes'); }

// ---------- macro ----------

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const s = [specimenSentence(v)];
  if (noTumour(v)) s.push(`Sectioning shows a fibrotic area at the previous excision site${stripDot(v.tumourDims) ? ` (${stripDot(v.tumourDims)} mm)` : ''} with no residual tumour.`);
  else if (v.sizeMode === 'Cannot be determined' && !stripDot(v.tumourDims)) s.push(`Sectioning reveals a tumour of indeterminate size${stripDot(v.sizeCannot) ? ` (${lc1(stripDot(v.sizeCannot))})` : ''}.`);
  else s.push(tumourSentence(v));
  if (v.nipple === 'Present and not involved') s.push('The skin and nipple are unremarkable.');
  if (stripDot(v.otherMacro)) s.push(`${uc1(stripDot(v.otherMacro))}.`);
  else s.push('The remaining breast tissue is fibrofatty and unremarkable.');
  const c = nodeCounts(v);
  if (nodesSubmitted(v) && c.examined) s.push(`${uc1(countWords(c.examined, 'lymph node'))} ${c.examined === 1 ? 'is' : 'are'} identified and entirely embedded.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- microscopy ----------

function sizeValue(v) {
  const size = num(v.sizeMm); const dims = stripDot(v.tumourDims);
  if (noTumour(v)) return 'No residual tumour';
  if (v.sizeMode === 'Cannot be determined') return `Cannot be determined${stripDot(v.sizeCannot) ? ` (${lc1(stripDot(v.sizeCannot))})` : ''}`;
  if (size !== null) return `Greatest dimension ${fmt(size)} mm${dims ? ` (${dims} mm)` : ''}`;
  return dims ? `${dims} mm` : 'Cannot be determined';
}

function mitosesValue(v) {
  const mode = v.mitoticMode || 'None identified';
  const n = num(v.mitoticCount);
  if (/^Mitoses per 10/.test(mode)) return n !== null ? `${fmt(n)} per 10 high power fields` : 'Per 10 high power fields (count not recorded)';
  if (/mm2/.test(mode)) return n !== null ? `${fmt(n)} per mm2` : 'Per mm2 (count not recorded)';
  return mode;
}

const shortOpt = (s) => String(s || '').replace(/\s*\(.*$/, '');

export function histologyPara(v) {
  const typed = stripDot(v.microDescription);
  const ihc = stripDot(v.ihc);
  if (typed) return `${typed}.${ihc ? ` ${uc1(ihc)}.` : ''}`;
  const s = [];
  if (noTumour(v)) {
    s.push('Sections from the previous excision site show fibrosis and fat necrosis with no residual phyllodes tumour.');
  } else {
    const size = num(v.sizeMm);
    const n = num(v.mitoticCount);
    const mit = /^None/.test(v.mitoticMode || '') ? 'no mitoses are seen' : n !== null ? `mitoses number ${fmt(n)} per ${/mm2/.test(v.mitoticMode) ? 'mm2' : '10 high power fields'}` : '';
    const stroma = [
      `${lc1(shortOpt(v.stromalCellularity || 'mild'))} stromal cellularity`,
      /^None/.test(v.stromalAtypia || '') ? 'no stromal atypia' : `${lc1(shortOpt(v.stromalAtypia))} stromal atypia`,
      v.stromalOvergrowth === 'Present' ? 'stromal overgrowth' : 'no stromal overgrowth'
    ];
    s.push(`Sections show a fibroepithelial tumour${size !== null ? ` measuring ${fmt(size)} mm` : ''} with leaf-like fronds lined by a bland bilayered epithelium and ${listJoin(stroma)}${mit ? `; ${mit}` : ''}.`);
    const border = v.tumourBorder || '';
    if (/^Circumscribed/.test(border)) s.push('The border is circumscribed and pushing.');
    else if (/Infiltrative/.test(border)) s.push(`The border is ${/extensive/.test(border) ? 'extensively' : 'focally'} infiltrative into the surrounding breast.`);
    const het = arr(v.heterologous).filter((h) => h !== 'Not identified').map((h) => (h === 'Other (specify)' ? stripDot(v.heterologousDetail) : lc1(shortOpt(h)))).filter(Boolean);
    s.push(het.length ? `Malignant heterologous elements are present (${listJoin(het)}).` : 'No malignant heterologous element is seen.');
    const ep = arr(v.epithelium).filter((e) => e !== 'Bland bilayered epithelium').map((e) => (/\(specify\)$/.test(e) ? [lc1(specify(e)), stripDot(v.epitheliumDetail)].filter(Boolean).join(': ') : lc1(e)));
    if (ep.length) s.push(`The epithelial component shows ${listJoin(ep)}.`);
    if (v.lvi === 'Present') s.push('Lymphovascular invasion is present.');
    if (v.pni === 'Present') s.push('Perineural invasion is present.');
    s.push(`The features are those of a ${gradeOf(v) || 'benign'} phyllodes tumour.`);
  }
  const extra = arr(v.additionalFindings).filter((x) => x !== 'Not identified').map((x) => (x === 'Other (specify)' ? stripDot(v.additionalFindingsDetail) : lc1(shortOpt(x)))).filter(Boolean);
  if (extra.length) s.push(`The surrounding breast shows ${listJoin(extra)}.`);
  if (ihc) s.push(`${uc1(ihc)}.`);
  return s.join(' ');
}

export function synoptic(part, ctx) {
  const v = part.values;
  const st = staging(part);
  const het = arr(v.heterologous).map((h) => (h === 'Other (specify)' ? stripDot(v.heterologousDetail) : h)).filter(Boolean);
  const extra = arr(v.additionalFindings).map((x) => (x === 'Other (specify)' ? stripDot(v.additionalFindingsDetail) : x)).filter(Boolean);
  const ep = arr(v.epithelium).map((e) => (/\(specify\)$/.test(e) ? [specify(e), stripDot(v.epitheliumDetail)].filter(Boolean).join(': ') : e)).filter(Boolean);
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureText(v)),
      item('Specimen laterality', v.laterality || 'Not specified'),
      item('Tumour site', siteText(v)),
      item('Tumour size', sizeValue(v))
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      { label: 'Tumour histology', para: histologyPara(v) },
      ...(!noTumour(v) ? [
        item('Stromal cellularity', v.stromalCellularity || 'Not stated'),
        item('Stromal atypia', v.stromalAtypia || 'Not stated'),
        item('Stromal overgrowth', v.stromalOvergrowth || 'Not stated'),
        item('Mitotic rate', mitosesValue(v)),
        item('Histologic tumour border', v.tumourBorder || 'Not stated'),
        item('Malignant heterologous elements', het.length ? het.join(', ') : 'Not identified'),
        item('Lymphovascular invasion', v.lvi || 'Not identified'),
        item('Perineural invasion', v.pni || 'Not identified'),
        item('Epithelial component', ep.length ? ep.join(', ') : 'Bland bilayered epithelium')
      ] : [])
    ] },
    { heading: 'Surgical margins', items: marginItems(v.margins, 'tumour') },
    { heading: 'Regional lymph nodes', items: nodeItems(v, { simple: true }) },
    { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] },
    ctx?.options?.printPTNM ? (gradeOf(v) === 'malignant' || noTumour(v) ? ptnmSection(st, v, stageLine) : { heading: `Pathological stage (${st.edition})`, items: [item('pTNM', `Not applicable (${gradeOf(v) || 'benign'} phyllodes tumour; AJCC staging applies to malignant phyllodes tumour only)`)] }) : null,
    { heading: 'Additional findings', items: [
      item('Additional pathologic findings', extra.length ? extra.join(', ') : 'Not identified'),
      stripDot(v.ancillary) ? item('Ancillary studies', stripDot(v.ancillary)) : null,
      stripDot(v.additionalNotes) ? item('Additional notes', stripDot(v.additionalNotes)) : null
    ] }
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
  if (noTumour(v)) first.push('NO RESIDUAL PHYLLODES TUMOUR');
  else {
    let clause = `${gradeOf(v).toUpperCase() || 'BENIGN'} PHYLLODES TUMOUR`;
    const het = arr(v.heterologous).filter((h) => h !== 'Not identified').map((h) => (h === 'Other (specify)' ? stripDot(v.heterologousDetail) : lc1(shortOpt(h)))).filter(Boolean);
    if (het.length) clause += ` with ${listJoin(het)}`;
    if (size !== null) clause += `, ${fmt(size)} mm`;
    first.push(clause);
    if (v.lvi === 'Present') first.push('lymphovascular invasion present');
  }
  const mp = marginsPhrase(v.margins);
  if (mp) {
    if (!/involved/.test(mp)) {
      const c = closestMargin(v.margins);
      first.push(`margins clear${c ? ` (${closestWords(c)})` : ''}`);
    } else first.push(mp);
  }
  const clauses = [`${first.join('; ')}; see synoptic report`];
  const np = nodesPhrase(v, { simple: true });
  if (np) clauses.push(np);
  const met = metastasisPhrase(v);
  if (met) clauses.push(met);
  if (ctx?.options?.printPTNM && (gradeOf(v) === 'malignant' || noTumour(v))) {
    const st = staging(part);
    clauses.push(`${st.tnm} (${st.edition})`);
  }
  const main = renderDiagnosis(head, clauses);
  const others = otherParts(v).map((p) => `(${p.label}) ${p.specimen.toUpperCase().replace(/(, .*)$/, (m) => m.toLowerCase())} - ${findingText(p.finding, 'PHYLLODES TUMOUR')}`);
  return [main, ...others].join('\n\n');
}

export function comment(parts) {
  const notes = [];
  for (const part of parts) {
    const v = part.values;
    const g = gradeOf(v);
    if (noTumour(v) || !g || g === 'benign') continue;
    const c = closestMargin(v.margins);
    const involved = /involved/.test(marginsPhrase(v.margins) || '');
    if (involved || (c && !c.gt && c.mm < 10)) notes.push(`${parts.length > 1 ? `(${part.label}) ` : ''}${uc1(g)} phyllodes tumours are usually excised with a clear margin of at least 10 mm; the ${involved ? 'involved' : `${fmt(c.mm)} mm ${lc1(c.face)}`} margin is noted for the clinical team's consideration of re-excision.`);
  }
  return notes.join('\n');
}

// ---------- checks ----------

export function validate(part, ctx) {
  const v = part.values;
  const out = [];
  // The optional second argument is the id of the field the check is about; the Checks panel
  // uses it to jump to that field. Omit it when a check does not point at one field.
  const at = (level, m, field) => out.push(field ? { level, message: m, field } : { level, message: m });
  const err = (m, field) => at('error', m, field);
  const warn = (m, field) => at('warn', m, field);
  const info = (m, field) => at('info', m, field);
  const size = num(v.sizeMm);
  const g = gradeOf(v);
  if (!noTumour(v)) {
    if (v.sizeMode !== 'Cannot be determined' && size === null) warn('Tumour size not recorded: pT cannot be derived.', 'sizeMm');
    if (/^Mitoses per/.test(v.mitoticMode || '') && num(v.mitoticCount) === null) warn('Mitotic rate: enter the count.', 'mitoticCount');
    const sg = suggestedGrade(v);
    if (g && sg !== g) {
      if (sg === 'malignant' && arr(v.heterologous).some((h) => h !== 'Not identified')) err('A malignant heterologous element makes the tumour malignant regardless of the other features.', 'histType');
      else warn(`Histologic type is ${g} but the WHO elements entered suggest ${sg}: review the cellularity, atypia, overgrowth, mitoses and border.`, 'histType');
    }
    if (arr(v.heterologous).includes('Other (specify)') && !stripDot(v.heterologousDetail)) warn('Heterologous element "Other" needs the specified type.', 'heterologousDetail');
    if (arr(v.epithelium).some((e) => /\(specify\)$/.test(e)) && !stripDot(v.epitheliumDetail)) warn('Epithelial component needs the specified lesion.', 'epitheliumDetail');
    if (arr(v.epithelium).some((e) => /carcinoma in situ/.test(e))) info('In situ carcinoma within a phyllodes tumour: consider the DCIS template or a separate diagnosis line.');
    const pm = marginChecks(v.margins, 'tumour', out, { field: 'margins' });
    if (g && g !== 'benign') {
      const close = pm.faces.filter((f) => f.status === 'uninvolved' && !f.gt && f.mm < 10);
      if (close.length) info(`${uc1(g)} phyllodes tumour within 10 mm of the ${listJoin(close.map((f) => lc1(f.face)))} margin${close.length > 1 ? 's' : ''} (${close.map((f) => `${fmt(f.mm)} mm`).join(', ')}): a comment on re-excision is added.`, 'margins');
    }
    if (pm.faces.some((f) => f.status === 'involved')) warn('Tumour at a margin: re-excision is usually recommended for phyllodes tumours of any grade.', 'margins');
  }
  const st = staging(part);
  if (nodesSubmitted(v)) {
    const ex = int(v.nodesExamined); const pos = int(v.nodesPositive);
    if (pos > ex) err(`Lymph nodes: ${pos} involved but only ${ex} examined.`, 'nodesExamined');
    if (pos > 0 && g !== 'malignant') warn('Nodal metastasis is essentially confined to malignant phyllodes tumours: review the grade.', 'histType');
    if (pos > 0 && num(v.depositMm) === null) info('Lymph nodes involved: record the size of the largest metastatic deposit.', 'depositMm');
  }
  if (v.distantMets === 'Present' && !arr(v.distantSites).length) warn('Distant metastasis present: select the site(s).', 'distantSites');
  sharedChecks(part, st, out);
  return nodesSubmitted(v) ? out : out.filter((i) => !/^pNX/.test(i.message));
}

export function flags(parts) {
  const out = [];
  for (const p of parts) {
    const v = p.values;
    if (stripDot(v.ancillary) && /requested|pending|to follow|sent/i.test(v.ancillary)) out.push(`(${p.label}) Ancillary result pending: ${stripDot(v.ancillary)}.`);
  }
  return out;
}

export default { specimenName, specimens, otherSpecimenLines, macro, blockKey, synoptic, diagnosis, comment, validate, flags, staging, hasExtraParts, gradeOf, suggestedGrade, histTypeName, histologyPara };
