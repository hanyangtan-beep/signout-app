// Colon and rectum carcinoma resection generator (Phase 5, first synoptic template).
// Elements mirror the QMH Cancer Reporting Template GI-Colon-and-rectum page (CAP Colon and
// Rectum Resection 4.4.0.1); pTNM is derived by src/staging (AJCC 8th edition) rather than
// picked by hand. Pure functions: (part, ctx) -> string.
//
// Blocks produced (hybrid mode):
//   specimens  "Ascending colon, right hemicolectomy"
//   macro      "(A) Received in formalin is a right hemicolectomy specimen comprising a segment of colon
//               measuring 22 cm in length with attached terminal ileum 6 cm and appendix 5 cm. There is an
//               ulcerated tumour in the ascending colon measuring 45 mm in greatest dimension (45 x 38 mm),
//               9 cm from the proximal margin and 10 cm from the distal margin. Macroscopic tumour
//               perforation is not identified. Representative sections are taken; see block key."
//   blockKey   the typed block key, one "(n) …" entry per line
//   microscopy narrative paragraph (omitted when the case option `synopticOnly` is on)
//   synoptic   CAP-style "- Element: value" list ending with the derived pTNM and stage group
//   diagnosis  "(A) ASCENDING COLON, right hemicolectomy - INVASIVE ADENOCARCINOMA, moderately
//               differentiated (G2), invading through the muscularis propria into pericolic tissue;
//               2 of 22 lymph nodes involved; margins clear; pT3 pN1b (AJCC 8th edition), stage IIIB;
//               MMR proficient"
// Wording is protected by tests/colon_resection.test.js — change it only deliberately.

import { deriveTNM, stageLine } from '../src/staging/index.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const stripDot = (s) => String(s || '').trim().replace(/[.;\s]+$/, '');

export const RECTAL_SITES = ['Rectosigmoid junction', 'Rectum'];
export const isRectal = (v) => RECTAL_SITES.includes(v.tumourSite);
export const MMR_LOSS = ['Loss of MLH1 and PMS2', 'Loss of MSH2 and MSH6', 'Isolated loss of PMS2', 'Isolated loss of MSH6'];
const NO_PRIMARY = ['No evidence of primary tumour', 'Cannot be assessed'];
const NON_INVASIVE = ['No invasion (high grade dysplasia)', 'Invades lamina propria / muscularis mucosae (intramucosal carcinoma)'];

export function procedureName(v) {
  return v.procedure === 'Other' ? (v.procedureOther || '').trim() || 'resection' : v.procedure || 'resection';
}

export function siteName(v) {
  if (!v.tumourSite || v.tumourSite === 'Cannot be determined' || v.tumourSite === 'Colon, not otherwise specified') return 'Colon';
  return v.tumourSite;
}

export function specimenName(part) {
  const v = part.values;
  const typed = (v.specimenName || '').trim();
  if (typed) return typed;
  return `${siteName(v)}, ${lc1(procedureName(v))}`;
}

// ---------- staging ----------

export function staging(part) {
  return deriveTNM(part.values, 'colorectal');
}

/** Budding score from the count when a count is given, else the picked score. */
export function buddingScore(v) {
  const n = int(v.buddingCount);
  if (n === null) return v.buddingScore || 'Cannot be determined';
  if (n <= 4) return 'Low score (Bd1, 0-4 buds)';
  if (n <= 9) return 'Intermediate score (Bd2, 5-9 buds)';
  return 'High score (Bd3, 10 or more buds)';
}

export const histTypeName = (v) => (v.histType === 'Other' ? (v.histTypeOther || '').trim() || 'carcinoma' : v.histType || 'Adenocarcinoma');

const GRADE_WORDS = {
  'G1: Well differentiated': 'well differentiated',
  'G2: Moderately differentiated': 'moderately differentiated',
  'G3: Poorly differentiated': 'poorly differentiated',
  'G4: Undifferentiated': 'undifferentiated'
};
const GRADE_SHORT = { 'G1: Well differentiated': 'G1', 'G2: Moderately differentiated': 'G2', 'G3: Poorly differentiated': 'G3', 'G4: Undifferentiated': 'G4', 'GX: Cannot be assessed': 'GX' };

const EXTENSION_PHRASE = {
  'No evidence of primary tumour': 'no residual invasive carcinoma is identified',
  'No invasion (high grade dysplasia)': 'shows high grade dysplasia without invasion',
  'Invades lamina propria / muscularis mucosae (intramucosal carcinoma)': 'is confined to the lamina propria / muscularis mucosae (intramucosal carcinoma)',
  'Invades submucosa': 'invades the submucosa',
  'Invades muscularis propria': 'invades the muscularis propria',
  'Invades through muscularis propria into pericolorectal tissue': 'invades through the muscularis propria into the {peri} tissue',
  'Invades visceral peritoneum (including through inflammation to the serosal surface)': 'invades through the {peri} tissue to involve the visceral peritoneum (serosal surface)',
  'Directly invades or adheres to adjacent structure(s)': 'directly invades {adjacent}',
  'Cannot be assessed': 'depth of invasion cannot be assessed'
};
const periWord = (v) => (isRectal(v) ? 'perirectal / mesorectal' : 'pericolic');

export function extensionPhrase(v) {
  const t = EXTENSION_PHRASE[v.tumourExtension] || 'depth of invasion is not recorded';
  return t.replace('{peri}', periWord(v)).replace('{adjacent}', (v.adjacentStructure || '').trim() ? `the ${stripDot(v.adjacentStructure)}` : 'an adjacent structure');
}

const LVI_PHRASE = {
  'Not identified': 'Lymphovascular invasion is not identified.',
  'Small vessel': 'Small vessel lymphovascular invasion is present.',
  'Large vessel (venous), intramural': 'Intramural large vessel (venous) invasion is present.',
  'Large vessel (venous), extramural': 'Extramural venous invasion is present.',
  'Present (not otherwise specified)': 'Lymphovascular invasion is present.',
  'Cannot be determined': 'Lymphovascular invasion cannot be determined.'
};
const PNI_PHRASE = { 'Not identified': 'Perineural invasion is not identified.', Present: 'Perineural invasion is present.', 'Cannot be determined': 'Perineural invasion cannot be determined.' };

const BUD_WORD = { 'Low score (Bd1, 0-4 buds)': 'low (Bd1)', 'Intermediate score (Bd2, 5-9 buds)': 'intermediate (Bd2)', 'High score (Bd3, 10 or more buds)': 'high (Bd3)' };

export function buddingSentence(v) {
  const score = buddingScore(v);
  if (score === 'Not applicable') return '';
  if (score === 'Cannot be determined') return 'Tumour budding cannot be determined.';
  const n = int(v.buddingCount);
  return `Tumour budding is ${BUD_WORD[score]}${n !== null ? `, with ${n} bud${n === 1 ? '' : 's'} in the hotspot field` : ''}.`;
}

const RYAN_PHRASE = {
  'Complete response (score 0): no viable cancer cells': 'There is a complete pathological response to neoadjuvant therapy with no viable tumour cells (modified Ryan score 0).',
  'Near complete response (score 1): single cells or rare small groups of cancer cells': 'Treatment effect is present with only single cells or rare small groups of tumour cells remaining (near complete response, modified Ryan score 1).',
  'Partial response (score 2): residual cancer with evident tumour regression': 'Treatment effect is present with residual carcinoma showing evident regression (partial response, modified Ryan score 2).',
  'Poor or no response (score 3): extensive residual cancer with no evident tumour regression': 'There is extensive residual carcinoma with no evident tumour regression (poor or no response, modified Ryan score 3).',
  'Present (not otherwise specified)': 'Treatment effect is present.',
  'Cannot be determined': 'Treatment effect cannot be determined.'
};

// ---------- margins ----------

export function marginValue(status, mm) {
  if (!status || status === 'Not applicable') return '';
  if (status === 'Uninvolved by invasive carcinoma') { const n = num(mm); return n !== null ? `Uninvolved by invasive carcinoma (${fmt(n)} mm)` : 'Uninvolved by invasive carcinoma'; }
  return status;
}

export function marginsSentence(v) {
  const margins = [
    ['proximal', v.proximalMargin, v.proximalMarginMm],
    ['distal', v.distalMargin, v.distalMarginMm],
    [isRectal(v) ? 'circumferential' : 'radial', v.radialMargin, v.radialMarginMm],
    [(v.otherMarginName || '').trim() || 'other', v.otherMargin, v.otherMarginMm]
  ].filter(([, s]) => s && s !== 'Not applicable');
  if (!margins.length) return '';
  const involved = margins.filter(([, s]) => s === 'Involved by invasive carcinoma').map(([n]) => n);
  const clear = margins.filter(([, s]) => s === 'Uninvolved by invasive carcinoma');
  const cba = margins.filter(([, s]) => s === 'Cannot be assessed').map(([n]) => n);
  const bits = [];
  if (clear.length) {
    const withMm = clear.filter(([, , mm]) => num(mm) !== null);
    const nearest = withMm.length ? withMm.reduce((a, b) => (num(b[2]) < num(a[2]) ? b : a)) : null;
    bits.push(`The ${listJoin(clear.map(([n]) => n))} margin${clear.length > 1 ? 's are' : ' is'} clear of carcinoma${nearest ? ` (${nearest[0]} margin clearance ${fmt(num(nearest[2]))} mm)` : ''}`);
  }
  if (involved.length) bits.push(`${bits.length ? 'the' : 'The'} ${listJoin(involved)} margin${involved.length > 1 ? 's are' : ' is'} involved by carcinoma`);
  if (cba.length) bits.push(`${bits.length ? 'the' : 'The'} ${listJoin(cba)} margin${cba.length > 1 ? 's' : ''} cannot be assessed`);
  return `${bits.join('; ')}.`;
}

export function nonInvasiveSentence(v) {
  const s = v.nonInvasiveMargin;
  if (!s || s === 'Not applicable') return '';
  if (s === 'Uninvolved by non-invasive tumour') return 'The margins are free of adenoma and dysplasia.';
  const where = (v.nonInvasiveMarginDetail || '').trim();
  return `The ${where ? `${stripDot(where)} margin is` : 'margin is'} ${lc1(s)}.`;
}

// ---------- nodes ----------

export function nodesSentence(v) {
  const ex = int(v.nodesExamined); const pos = int(v.nodesPositive);
  if (ex === null) return '';
  if (ex === 0) return 'No lymph nodes are identified.';
  const apEx = int(v.apicalExamined); const apPos = int(v.apicalPositive);
  const apical = apEx ? ` including ${apEx} apical node${apEx === 1 ? '' : 's'}` : '';
  if (pos === null) return `A total of ${ex} regional lymph node${ex === 1 ? ' is' : 's are'} identified${apical}.`;
  if (pos === 0) return `A total of ${ex} regional lymph node${ex === 1 ? ' is' : 's are'} identified${apical}, all free of metastatic carcinoma (0/${ex}).`;
  let s = `A total of ${ex} regional lymph node${ex === 1 ? ' is' : 's are'} identified${apical}, ${pos === 1 ? 'one of which contains' : `${pos} of which contain`} metastatic carcinoma (${pos}/${ex})`;
  if (apPos) s += `, including ${apPos} apical node${apPos === 1 ? '' : 's'}`;
  if (v.ene === 'Present') s += ', with extranodal extension';
  else if (v.ene === 'Not identified') s += ', without extranodal extension';
  const dep = num(v.largestDepositMm);
  if (dep !== null) s += `; the largest metastatic deposit measures ${fmt(dep)} mm`;
  return `${s}.`;
}

export function depositsSentence(v) {
  if (v.tumourDeposits === 'Present') { const n = int(v.tumourDepositsCount); return `${n !== null ? (n === 1 ? 'One tumour deposit is' : `${n} tumour deposits are`) : 'Tumour deposits are'} present in the ${periWord(v)} fat.`; }
  if (v.tumourDeposits === 'Cannot be determined') return 'Tumour deposits cannot be determined.';
  return 'No tumour deposits are identified.';
}

export const metastasisSites = (v) => (Array.isArray(v.distantMetastasis) ? v.distantMetastasis.filter((s) => s !== 'Not applicable') : []);

export function metastasisSentence(v) {
  const sites = metastasisSites(v);
  if (!sites.length) return '';
  const detail = (v.metastasisDetail || '').trim();
  return `Metastatic carcinoma is present in the ${listJoin(sites.map((s) => lc1(s)))}${detail ? ` (${stripDot(detail)})` : ''}.`;
}

const MMR_PHRASE = {
  'Retained (MLH1, PMS2, MSH2, MSH6)': 'Immunohistochemistry shows retained nuclear expression of MLH1, PMS2, MSH2 and MSH6 in the tumour cells (mismatch repair proficient).',
  'Loss of MLH1 and PMS2': 'Immunohistochemistry shows loss of MLH1 and PMS2 expression with retained MSH2 and MSH6 in the tumour cells (mismatch repair deficient).',
  'Loss of MSH2 and MSH6': 'Immunohistochemistry shows loss of MSH2 and MSH6 expression with retained MLH1 and PMS2 in the tumour cells (mismatch repair deficient).',
  'Isolated loss of PMS2': 'Immunohistochemistry shows isolated loss of PMS2 expression with retained MLH1, MSH2 and MSH6 in the tumour cells (mismatch repair deficient).',
  'Isolated loss of MSH6': 'Immunohistochemistry shows isolated loss of MSH6 expression with retained MLH1, PMS2 and MSH2 in the tumour cells (mismatch repair deficient).',
  Pending: 'Mismatch repair immunohistochemistry is pending.'
};
const MMR_DX = {
  'Retained (MLH1, PMS2, MSH2, MSH6)': 'MMR proficient',
  'Loss of MLH1 and PMS2': 'MMR deficient (loss of MLH1 / PMS2)',
  'Loss of MSH2 and MSH6': 'MMR deficient (loss of MSH2 / MSH6)',
  'Isolated loss of PMS2': 'MMR deficient (isolated loss of PMS2)',
  'Isolated loss of MSH6': 'MMR deficient (isolated loss of MSH6)',
  Pending: 'MMR immunohistochemistry pending'
};

// ---------- macro ----------

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const proc = lc1(procedureName(v));
  const len = num(v.specimenLength);
  const segment = /proctocolectomy|anterior resection|abdominoperineal|hartmann/i.test(proc) ? 'colon and rectum' : isRectal(v) ? 'rectum' : 'colon';
  let s = `(${part.label}) Received in formalin is a ${proc} specimen`;
  if (len !== null) s += ` comprising a segment of ${segment} measuring ${fmt(len)} cm in length`;
  const att = stripDot(v.attachedStructures);
  if (att) s += ` with attached ${att}`;
  s += '.';
  const size = num(v.tumourSize);
  const site = lc1(siteName(v));
  if (v.tumourAppearance === 'Not identified macroscopically') s += ` No tumour is identified macroscopically in the ${site}.`;
  else if (v.tumourAppearance === 'Ulcer or scar only (post-treatment)') s += ` There is an area of ulceration and scarring in the ${site}${size !== null ? ` measuring ${fmt(size)} mm in greatest dimension` : ''}.`;
  else {
    const look = { Ulcerated: 'an ulcerated', 'Polypoid / exophytic': 'a polypoid exophytic', 'Annular / constricting': 'an annular constricting', 'Infiltrative / diffuse': 'an infiltrative' }[v.tumourAppearance] || 'a';
    s += ` There is ${look} tumour in the ${site}`;
    if (size !== null) s += ` measuring ${fmt(size)} mm in greatest dimension`;
    const other = stripDot(v.tumourSizeOther);
    if (other && !/cannot/i.test(other)) s += ` (${other})`;
    const dp = num(v.distanceProximal); const dd = num(v.distanceDistal);
    const dist = [dp !== null ? `${fmt(dp)} cm from the proximal margin` : '', dd !== null ? `${fmt(dd)} cm from the distal margin` : ''].filter(Boolean);
    if (dist.length) s += `, ${dist.join(' and ')}`;
    s += '.';
  }
  if (v.macroPerforation === 'Present') s += ' There is macroscopic tumour perforation.';
  else if (v.macroPerforation === 'Not identified') s += ' Macroscopic tumour perforation is not identified.';
  if (isRectal(v) && v.mesorectum && v.mesorectum !== 'Not applicable') s += ` The mesorectum is ${v.mesorectum === 'Cannot be determined' ? 'not assessable' : lc1(v.mesorectum)}.`;
  const om = stripDot(v.otherMacro);
  if (om) s += ` ${om.charAt(0).toUpperCase()}${om.slice(1)}.`;
  s += ' Representative sections are taken; see block key.';
  return s;
}

export function blockKey(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const lines = String(part.values.blockKeyText || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return '';
  const entries = lines.map((l) => {
    const m = /^\(?([0-9]+(?:\s*[-–]\s*[0-9]+)?[a-z]?)\)?[.:)\s-]+(.*)$/i.exec(l);
    return m ? `(${m[1].replace(/\s+/g, '')}) ${stripDot(m[2])}.` : `${stripDot(l)}.`;
  });
  return `(${part.label}) ${entries.join(' ')}`;
}

// ---------- microscopy ----------

export function microscopy(part) {
  const v = part.values;
  const p = [];
  const noPrimary = NO_PRIMARY.includes(v.tumourExtension);
  const type = histTypeName(v);
  const gradeWord = GRADE_WORDS[v.grade];
  if (v.tumourExtension === 'No evidence of primary tumour') {
    p.push(`Sections of the ${lc1(siteName(v))} show ${v.treatmentEffect && v.treatmentEffect !== 'No known presurgical therapy' ? 'fibrosis and mucin pools consistent with treated tumour bed; ' : ''}no residual invasive carcinoma is identified.`);
  } else if (NON_INVASIVE.includes(v.tumourExtension)) {
    const precursor = v.precursorPolyp && v.precursorPolyp !== 'Not identified' ? ` within a ${lc1(v.precursorPolyp === 'Other' ? (v.precursorPolypOther || 'polyp') : v.precursorPolyp)}` : '';
    p.push(`Sections of the ${lc1(siteName(v))} show ${v.tumourExtension === 'No invasion (high grade dysplasia)' ? 'high grade dysplasia' : 'intramucosal adenocarcinoma'}${precursor}; the lesion ${extensionPhrase(v)} and there is no submucosal invasion.`);
  } else {
    let first = `Sections of the tumour in the ${lc1(siteName(v))} show an invasive ${gradeWord ? `${gradeWord} ` : ''}${lc1(type)}`;
    const precursor = v.precursorPolyp && v.precursorPolyp !== 'Not identified' ? ` arising in a ${lc1(v.precursorPolyp === 'Other' ? (v.precursorPolypOther || 'polyp') : v.precursorPolyp)}` : '';
    first += precursor;
    first += `. The tumour ${extensionPhrase(v)}`;
    if (v.tumourExtension === 'Invades submucosa') {
      const depth = v.submucosalDepth === 'Exact depth (mm)' && num(v.submucosalDepthMm) !== null ? `to a depth of ${fmt(num(v.submucosalDepthMm))} mm` : v.submucosalDepth && v.submucosalDepth !== 'Cannot be determined' ? `to a depth of ${lc1(v.submucosalDepth)}` : '';
      const extent = v.submucosalExtent && v.submucosalExtent !== 'Cannot be determined' ? `into the ${lc1(v.submucosalExtent)}` : '';
      const d = [depth, extent].filter(Boolean).join(', ');
      if (d) first += ` ${d}`;
    }
    p.push(`${first}.`);
    if (v.multiplePrimary === 'Present') p.push(`A separate primary tumour is present${(v.multiplePrimaryDetail || '').trim() ? ` (${stripDot(v.multiplePrimaryDetail)})` : ''}.`);
    p.push(LVI_PHRASE[v.lvi] || '');
    p.push(PNI_PHRASE[v.pni] || '');
    p.push(buddingSentence(v));
    p.push(depositsSentence(v));
    if (v.macroPerforation === 'Present') p.push('Tumour perforation is confirmed histologically.');
  }
  if (v.treatmentEffect && v.treatmentEffect !== 'No known presurgical therapy') p.push(RYAN_PHRASE[v.treatmentEffect] || '');
  p.push(marginsSentence(v));
  p.push(nonInvasiveSentence(v));
  p.push(nodesSentence(v));
  p.push(metastasisSentence(v));
  const findings = Array.isArray(v.additionalFindings) ? v.additionalFindings : [];
  if (findings.length) {
    const detail = stripDot(v.additionalFindingsDetail);
    p.push(`The background bowel shows ${listJoin(findings.map((f) => lc1(f)))}${detail ? ` (${detail})` : ''}.`);
  }
  if (v.mmr && v.mmr !== 'Not performed') p.push(MMR_PHRASE[v.mmr] || '');
  const anc = stripDot(v.ancillary);
  if (anc) p.push(`${anc.charAt(0).toUpperCase()}${anc.slice(1)}.`);
  const notes = stripDot(v.additionalNotes);
  if (notes) p.push(`${notes}.`);
  return `(${part.label}) ${p.filter(Boolean).join(' ')}`;
}

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const st = staging(part);
  const line = (label, value) => (value !== '' && value !== null && value !== undefined ? `- ${label}: ${value}` : null);
  const size = num(v.tumourSize);
  const other = stripDot(v.tumourSizeOther);
  const sizeText = size !== null ? `${fmt(size)} mm in greatest dimension${other && !/cannot/i.test(other) ? ` (${other})` : ''}` : other || 'Cannot be determined';
  const ex = int(v.nodesExamined); const pos = int(v.nodesPositive); const apEx = int(v.apicalExamined); const apPos = int(v.apicalPositive);
  const nodeBits = [];
  if (ex !== null) nodeBits.push(`${ex} examined${apEx !== null ? ` (${apEx} apical)` : ''}`);
  if (pos !== null) nodeBits.push(`${pos} involved${apPos !== null ? ` (${apPos} apical)` : ''}`);
  if (pos && v.ene && v.ene !== 'Not applicable') nodeBits.push(`extranodal extension ${lc1(v.ene)}`);
  if (pos && num(v.largestDepositMm) !== null) nodeBits.push(`largest metastatic deposit ${fmt(num(v.largestDepositMm))} mm`);
  const sites = metastasisSites(v);
  const bud = buddingScore(v);
  const budCount = int(v.buddingCount);
  const findings = Array.isArray(v.additionalFindings) ? v.additionalFindings : [];
  const rows = [
    line('Procedure', procedureName(v)),
    line('Tumour site', v.tumourSite || 'Not specified'),
    isRectal(v) ? line('Tumour location relative to anterior peritoneal reflection', v.rectalLocation) : null,
    line('Tumour size', sizeText),
    line('Macroscopic tumour perforation', v.macroPerforation || 'Cannot be determined'),
    isRectal(v) ? line('Macroscopic intactness of mesorectum', v.mesorectum) : null,
    line('Histologic type (WHO 2019)', histTypeName(v)),
    line('Histologic grade', v.grade || 'GX: Cannot be assessed'),
    line('Multiple primary tumours', v.multiplePrimary === 'Present' ? `Present${(v.multiplePrimaryDetail || '').trim() ? ` (${stripDot(v.multiplePrimaryDetail)})` : ''}` : v.multiplePrimary),
    line('Tumour extension', `${v.tumourExtension || 'Cannot be assessed'}${v.tumourExtension === 'Directly invades or adheres to adjacent structure(s)' && (v.adjacentStructure || '').trim() ? ` (${stripDot(v.adjacentStructure)})` : ''}`),
    v.tumourExtension === 'Invades submucosa' ? line('Depth of submucosal invasion (pT1)', v.submucosalDepth === 'Exact depth (mm)' && num(v.submucosalDepthMm) !== null ? `${fmt(num(v.submucosalDepthMm))} mm` : v.submucosalDepth) : null,
    v.tumourExtension === 'Invades submucosa' ? line('Extent of submucosal invasion (pT1)', v.submucosalExtent) : null,
    line('Lymphatic and / or vascular invasion', v.lvi || 'Cannot be determined'),
    line('Perineural invasion', v.pni || 'Cannot be determined'),
    line('Tumour budding (ITBCC 2016)', bud === 'Not applicable' ? 'Not applicable' : `${bud}${budCount !== null ? `; ${budCount} bud${budCount === 1 ? '' : 's'} in 1 hotspot field` : ''}`),
    line('Type of polyp in which invasive carcinoma arose', v.precursorPolyp === 'Other' ? (v.precursorPolypOther || 'Other').trim() : v.precursorPolyp || 'Not identified'),
    line('Tumour deposits', v.tumourDeposits === 'Present' ? `Present${int(v.tumourDepositsCount) !== null ? ` (${int(v.tumourDepositsCount)})` : ''}` : v.tumourDeposits || 'Not identified'),
    line('Treatment effect (modified Ryan scheme, 2005)', v.treatmentEffect || 'No known presurgical therapy'),
    line('Proximal margin', marginValue(v.proximalMargin, v.proximalMarginMm) || 'Cannot be assessed'),
    line('Distal margin', marginValue(v.distalMargin, v.distalMarginMm) || 'Cannot be assessed'),
    line(isRectal(v) ? 'Circumferential (radial) margin' : 'Radial or mesenteric margin', marginValue(v.radialMargin, v.radialMarginMm)),
    v.otherMargin && v.otherMargin !== 'Not applicable' ? line(`Other margin (${(v.otherMarginName || 'specify').trim()})`, marginValue(v.otherMargin, v.otherMarginMm)) : null,
    v.nonInvasiveMargin && v.nonInvasiveMargin !== 'Not applicable' ? line('Status of non-invasive tumour at margin(s)', `${v.nonInvasiveMargin}${(v.nonInvasiveMarginDetail || '').trim() ? ` (${stripDot(v.nonInvasiveMarginDetail)})` : ''}`) : null,
    line('Regional lymph nodes', nodeBits.length ? nodeBits.join('; ') : 'Not recorded'),
    line('Distant metastasis', sites.length ? `${listJoin(sites)}${(v.metastasisDetail || '').trim() ? ` (${stripDot(v.metastasisDetail)})` : ''}` : 'Not applicable'),
    line(`Pathological stage classification (${st.edition})`, `${st.tnm}${st.overridden ? ` [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${(v.tnmOverrideReason || '').trim() ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : ''}`),
    ctx?.options?.stageGroup === false ? null : (stageLine(st) ? `  - ${stageLine(st)}` : null),
    findings.length ? line('Additional pathological findings', `${listJoin(findings)}${(v.additionalFindingsDetail || '').trim() ? ` (${stripDot(v.additionalFindingsDetail)})` : ''}`) : null,
    v.mmr && v.mmr !== 'Not performed' ? line('Mismatch repair immunohistochemistry', v.mmr) : null,
    stripDot(v.ancillary) ? line('Other ancillary studies', stripDot(v.ancillary)) : null
  ].filter(Boolean);
  // Multi-part cases get a labelled heading so the blocks can be told apart; the engine drops the letter otherwise.
  const heading = ctx?.case?.parts && ctx.case.parts.length > 1 ? `(${part.label}) ${specimenName(part)}\n` : '';
  return `${heading}${rows.join('\n')}`;
}

// ---------- diagnosis ----------

export function diagnosis(part, ctx) {
  const v = part.values;
  const st = staging(part);
  const organ = siteName(v).toUpperCase();
  const head = `(${part.label}) ${organ}, ${lc1(procedureName(v))} - `;
  const bits = [];
  if (v.tumourExtension === 'No evidence of primary tumour') {
    bits.push(v.treatmentEffect && v.treatmentEffect !== 'No known presurgical therapy' ? 'NO RESIDUAL CARCINOMA (complete pathological response)' : 'NO EVIDENCE OF RESIDUAL CARCINOMA');
  } else if (NON_INVASIVE.includes(v.tumourExtension)) {
    bits.push(v.tumourExtension === 'No invasion (high grade dysplasia)' ? 'HIGH GRADE DYSPLASIA, no invasive carcinoma' : 'INTRAMUCOSAL ADENOCARCINOMA, no submucosal invasion');
  } else {
    const type = histTypeName(v);
    const gradeWord = GRADE_WORDS[v.grade];
    const g = GRADE_SHORT[v.grade];
    const ext = extensionPhrase(v).replace(/^invades/, 'invading').replace(/^directly invades/, 'directly invading').replace(/^is confined/, 'confined');
    bits.push(`INVASIVE ${type.toUpperCase()}${gradeWord ? `, ${gradeWord} (${g})` : g ? ` (${g})` : ''}, ${ext}`);
    if (v.lvi && v.lvi !== 'Not identified' && v.lvi !== 'Cannot be determined') bits.push(v.lvi.startsWith('Large vessel (venous), extramural') ? 'extramural venous invasion present' : 'lymphovascular invasion present');
    if (v.pni === 'Present') bits.push('perineural invasion present');
    if (v.tumourDeposits === 'Present') bits.push('tumour deposits present');
  }
  const ex = int(v.nodesExamined); const pos = int(v.nodesPositive);
  if (ex !== null && ex > 0 && pos !== null) bits.push(pos === 0 ? `no lymph node metastasis (0/${ex})` : `${pos} of ${ex} lymph nodes involved`);
  const involved = [['proximal', v.proximalMargin], ['distal', v.distalMargin], [isRectal(v) ? 'circumferential' : 'radial', v.radialMargin], [(v.otherMarginName || 'other').trim(), v.otherMargin]].filter(([, s]) => s === 'Involved by invasive carcinoma').map(([n]) => n);
  const anyMargin = [v.proximalMargin, v.distalMargin, v.radialMargin, v.otherMargin].some((s) => s && s !== 'Not applicable');
  if (involved.length) bits.push(`${listJoin(involved)} margin${involved.length > 1 ? 's' : ''} involved`);
  else if (anyMargin && [v.proximalMargin, v.distalMargin, v.radialMargin, v.otherMargin].every((s) => !s || s === 'Not applicable' || s === 'Uninvolved by invasive carcinoma')) bits.push('margins clear');
  const sites = metastasisSites(v);
  if (sites.length) bits.push(`metastatic carcinoma in ${listJoin(sites.map(lc1))}`);
  let stage = `${st.tnm} (${st.edition})`;
  if (ctx?.options?.stageGroup !== false && st.stage) stage += `, stage ${st.stage}${st.M === 'M-' ? ' (if cM0)' : ''}`;
  bits.push(stage);
  if (v.mmr && v.mmr !== 'Not performed') bits.push(MMR_DX[v.mmr]);
  return `${head}${bits.filter(Boolean).join('; ')}`;
}

// ---------- validation + flags ----------

export function validate(part) {
  const v = part.values;
  const out = [];
  const err = (m) => out.push({ level: 'error', message: m });
  const warn = (m) => out.push({ level: 'warn', message: m });
  const invasive = v.tumourExtension && !NO_PRIMARY.includes(v.tumourExtension) && !NON_INVASIVE.includes(v.tumourExtension);
  if (!v.tumourExtension) err('Tumour extension is required to assign pT.');
  if (invasive && (!v.grade || v.grade === 'Not applicable')) warn('Histologic grade is not recorded for an invasive carcinoma.');
  if (v.tumourExtension === 'Invades submucosa' && (!v.submucosalDepth || v.submucosalDepth === 'Cannot be determined')) warn('pT1 tumour: depth of submucosal invasion is not recorded.');
  if (v.tumourExtension === 'Directly invades or adheres to adjacent structure(s)' && !(v.adjacentStructure || '').trim()) warn('pT4b: specify the adjacent structure invaded.');
  const ex = int(v.nodesExamined); const pos = int(v.nodesPositive); const apEx = int(v.apicalExamined); const apPos = int(v.apicalPositive);
  if (ex === null) err('Number of regional lymph nodes examined is required (enter 0 if none found).');
  else if (pos === null) err('Number of involved lymph nodes is required (enter 0 if none).');
  if (ex !== null && pos !== null && pos > ex) err('Involved lymph nodes exceed the number examined.');
  if (apEx !== null && ex !== null && apEx > ex) err('Apical nodes examined exceed the total nodes examined.');
  if (apPos !== null && apEx !== null && apPos > apEx) err('Apical nodes involved exceed the apical nodes examined.');
  if (apPos !== null && pos !== null && apPos > pos) err('Apical nodes involved exceed the total nodes involved.');
  if (ex !== null && ex > 0 && ex < 12 && invasive && (!v.treatmentEffect || v.treatmentEffect === 'No known presurgical therapy')) warn(`Only ${ex} lymph nodes examined (12 or more recommended); consider further sampling of the mesentery.`);
  if (pos && (!v.ene || v.ene === 'Not applicable')) warn('Extranodal extension is not recorded for a node-positive case.');
  if (v.tumourDeposits === 'Present' && int(v.tumourDepositsCount) === null) warn('Tumour deposits present: record the number.');
  if (invasive) {
    for (const [name, s, mm] of [['Proximal', v.proximalMargin, v.proximalMarginMm], ['Distal', v.distalMargin, v.distalMarginMm], ['Radial / mesenteric', v.radialMargin, v.radialMarginMm]]) {
      if (!s) err(`${name} margin status is required.`);
      else if (s === 'Uninvolved by invasive carcinoma' && num(mm) === null) warn(`${name} margin: record the clearance in mm.`);
    }
    if (isRectal(v) && v.radialMargin === 'Uninvolved by invasive carcinoma' && num(v.radialMarginMm) !== null && num(v.radialMarginMm) <= 1) warn('Circumferential margin clearance is 1 mm or less - regarded as involved for rectal carcinoma.');
    if (isRectal(v) && (!v.mesorectum || v.mesorectum === 'Not applicable')) warn('Rectal tumour: record the macroscopic intactness of the mesorectum.');
    if (isRectal(v) && (!v.rectalLocation || v.rectalLocation === 'Not applicable')) warn('Rectal tumour: record the location relative to the anterior peritoneal reflection.');
  }
  const bc = int(v.buddingCount);
  if (bc !== null && v.buddingScore && v.buddingScore !== 'Cannot be determined' && v.buddingScore !== buddingScore(v)) warn(`Tumour budding score does not match the count (${bc} buds = ${buddingScore(v)}); the count is used.`);
  if ((v.tnmOverride || '').trim()) {
    const st = staging(part);
    if (!st.overridden) err(`Override "${v.tnmOverride.trim()}" could not be parsed (use e.g. "pT2 pN1a" or "ypT3 pN0 pM1a").`);
    else if (!(v.tnmOverrideReason || '').trim()) err('Give a reason for overriding the derived pTNM.');
  }
  if (v.treatmentEffect && v.treatmentEffect !== 'No known presurgical therapy' && v.treatmentEffect !== 'Cannot be determined' && v.tumourExtension === 'No evidence of primary tumour' && pos) warn('Complete response in the primary with positive nodes: check the treatment effect score.');
  if (v.mmr === 'Not performed' && invasive) warn('Mismatch repair immunohistochemistry not recorded (recommended for all colorectal carcinomas).');
  return out;
}

export function flags(parts) {
  const f = new Set();
  for (const p of parts) {
    const v = p.values;
    const ex = int(v.nodesExamined);
    const invasive = v.tumourExtension && !NO_PRIMARY.includes(v.tumourExtension) && !NON_INVASIVE.includes(v.tumourExtension);
    if (ex !== null && ex < 12 && invasive && (!v.treatmentEffect || v.treatmentEffect === 'No known presurgical therapy')) f.add('fewNodes');
    if (['Loss of MSH2 and MSH6', 'Isolated loss of PMS2', 'Isolated loss of MSH6'].includes(v.mmr)) f.add('lynchPattern');
    if (isRectal(v) && v.radialMargin === 'Uninvolved by invasive carcinoma' && num(v.radialMarginMm) !== null && num(v.radialMarginMm) <= 1) f.add('crmClose');
  }
  return [...f];
}

export default { specimenName, macro, blockKey, microscopy, synoptic, diagnosis, validate, flags, staging };
