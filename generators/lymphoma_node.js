// Lymph node for lymphoma (WHO-HAEM5): a lymph node excision, excisional, incisional or core biopsy
// sent for a lymphoma work-up, examined in house or received as slides for review.
//
// Cards: docs/roadmap.md "Lymph node for lymphoma — form, specimen and diagnosis" and "… —
// immunohistochemistry and ancillary studies" (user request and pulled by the user 2026-10-14; an L
// split into two M cards built together, Phase 71). Spec docs/specs/lymphoma-node.md; grounding
// docs/reference/lymphoma_node-morphology.md (WHO-HAEM5, Alaggio et al. Leukemia 2022, PMC9214472;
// ICC, Campo et al. Blood 2022, PMC9479027; Hans et al. Blood 2004, PubMed 14504078; PathologyOutlines
// DLBCL, FL, cHL, Kikuchi and MUM1 pages; BNLI grade, Mediterr J Hematol Infect Dis 2014, PMC4063617).
//
// House shape (2021-2026 biopsy export, aggregate): the microscopy opens with the slides received for a
// referral, then "Sections show …", the immunophenotype in one paragraph with Ki-67 and EBER, and closes
// "The overall features are those of / consistent with …". The diagnosis is the specimen line then
// "- ENTITY" with the grade in lower case after it ("FOLLICULAR LYMPHOMA, grade 3A"), the cell of origin
// after a DLBCL ("non-GCB type"), "Recurrent …", "In keeping with partial involvement by …".
// Departures, by the user's rules: the cell-of-origin method moves to the Comment, FISH and clonality to
// MOLECULAR FINDINGS, and the panel is also listed marker by marker in the synoptic block.
//
// Printed text is released-report prose only. Thresholds (Hans 30%, MYC 40% / BCL2 50%, centroblast
// bands, Burkitt Ki-67), citations and exclusion logic stay in the Checks and in these comments.
//
// Blocks: specimenName, macro, blockKey, synoptic (narrative + list), molecular, diagnosis, comment,
// flags (snippets), validate. Wording is protected by tests/lymphoma_node.test.js and the golden
// fixtures in tests/fixtures/lymphoma_node/.

import { stripDot, letteredBlockKey, checks } from './_house.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';

const lettered = (part, ctx) => (ctx?.parts?.length || 1) > 1;
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) && n >= 0 ? n : null; };
const num = (x) => { const n = parseFloat(String(x ?? '').trim()); return Number.isFinite(n) ? n : null; };
const word = (n) => (n >= 0 && n <= 10 ? WORDS[n] : String(n));
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
// Lower the first letter of a word that is not an acronym ("Left neck" -> "left neck", "LN" stays).
const lc1 = (s) => String(s || '').replace(/^([A-Z])(?=[a-z])/, (c) => c.toLowerCase());
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const article = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a');
const has = (arr, x) => Array.isArray(arr) && arr.includes(x);

// ---------- the diagnosis list (WHO-HAEM5 names) ----------

export const DX_GROUPS = [
  { label: 'Reactive and tumour-like', options: ['Reactive lymphoid hyperplasia', 'Granulomatous lymphadenitis', 'Kikuchi-Fujimoto disease', 'Castleman disease', 'Atypical lymphoid proliferation'] },
  { label: 'Mature B-cell', options: ['Diffuse large B-cell lymphoma, NOS', 'T-cell/histiocyte-rich large B-cell lymphoma', 'EBV-positive diffuse large B-cell lymphoma',
    'DLBCL/HGBL with MYC and BCL2 rearrangements', 'High-grade B-cell lymphoma, NOS', 'High-grade B-cell lymphoma with 11q aberrations', 'Follicular lymphoma',
    'Follicular large B-cell lymphoma', 'Nodal marginal zone lymphoma', 'Extranodal marginal zone lymphoma of MALT', 'Chronic lymphocytic leukaemia/small lymphocytic lymphoma',
    'Mantle cell lymphoma', 'Lymphoplasmacytic lymphoma', 'Burkitt lymphoma', 'Plasmablastic lymphoma', 'B-lymphoblastic leukaemia/lymphoma', 'B-cell lymphoma, not further classified'] },
  { label: 'Hodgkin', options: ['Classic Hodgkin lymphoma', 'Nodular lymphocyte predominant Hodgkin lymphoma'] },
  { label: 'T and NK', options: ['Peripheral T-cell lymphoma, NOS', 'Nodal TFH-cell lymphoma, angioimmunoblastic-type', 'Nodal TFH-cell lymphoma, follicular-type',
    'Nodal TFH-cell lymphoma, NOS', 'ALK-positive anaplastic large cell lymphoma', 'ALK-negative anaplastic large cell lymphoma', 'EBV-positive nodal T- and NK-cell lymphoma',
    'Extranodal NK/T-cell lymphoma', 'Adult T-cell leukaemia/lymphoma', 'T-lymphoblastic leukaemia/lymphoma', 'T-cell lymphoma, not further classified'] },
  { label: 'Not further classified', options: ['Lymphoma, not further classified', 'Other (type the diagnosis)'] }
];
export const DX_OPTIONS = DX_GROUPS.flatMap((g) => g.options);
export const OTHER = 'Other (type the diagnosis)';
export const NON_NEOPLASTIC = ['Reactive lymphoid hyperplasia', 'Granulomatous lymphadenitis', 'Kikuchi-Fujimoto disease', 'Castleman disease'];
// Diagnoses that name their own wording or qualifier and take no certainty, recurrence or extent.
export const SELF_WORDED = ['Kikuchi-Fujimoto disease', 'Atypical lymphoid proliferation', 'B-cell lymphoma, not further classified',
  'T-cell lymphoma, not further classified', 'Lymphoma, not further classified', OTHER];
// A neoplasm, for the recurrence and extent fields and the "no immunohistochemistry" check.
export const NEOPLASTIC = DX_OPTIONS.filter((d) => !NON_NEOPLASTIC.includes(d) && d !== 'Atypical lymphoid proliferation' && d !== OTHER);
// Lesional: a proliferation of atypical cells is described (growth pattern, cell size, cytology).
export const LESIONAL = DX_OPTIONS.filter((d) => !NON_NEOPLASTIC.includes(d));
export const B_CELL = DX_GROUPS[1].options;
export const DLBCL = 'Diffuse large B-cell lymphoma, NOS';
export const DOUBLE_HIT = 'DLBCL/HGBL with MYC and BCL2 rearrangements';
export const FL = 'Follicular lymphoma';
export const CHL = 'Classic Hodgkin lymphoma';
export const NLPHL = 'Nodular lymphocyte predominant Hodgkin lymphoma';
export const NTFHL = ['Nodal TFH-cell lymphoma, angioimmunoblastic-type', 'Nodal TFH-cell lymphoma, follicular-type', 'Nodal TFH-cell lymphoma, NOS'];
// Dual expression is a DLBCL finding (PathologyOutlines DLBCL; PMC11262692); the snippet is offered
// for the large B-cell entities where it is reported.
export const DUAL_DX = [DLBCL, 'EBV-positive diffuse large B-cell lymphoma', 'High-grade B-cell lymphoma, NOS'];

// [option, CAPITALISED diagnosis term, sentence-case phrase for the closing sentence]
const ENTITY = {
  'Castleman disease': ['CASTLEMAN DISEASE', 'Castleman disease'],
  'Diffuse large B-cell lymphoma, NOS': ['DIFFUSE LARGE B-CELL LYMPHOMA, NOS', 'diffuse large B-cell lymphoma, NOS'],
  'T-cell/histiocyte-rich large B-cell lymphoma': ['T-CELL/HISTIOCYTE-RICH LARGE B-CELL LYMPHOMA', 'T-cell/histiocyte-rich large B-cell lymphoma'],
  'EBV-positive diffuse large B-cell lymphoma': ['EBV-POSITIVE DIFFUSE LARGE B-CELL LYMPHOMA', 'EBV-positive diffuse large B-cell lymphoma'],
  'DLBCL/HGBL with MYC and BCL2 rearrangements': ['DIFFUSE LARGE B-CELL LYMPHOMA/HIGH-GRADE B-CELL LYMPHOMA with MYC and BCL2 REARRANGEMENTS',
    'diffuse large B-cell lymphoma/high-grade B-cell lymphoma with MYC and BCL2 rearrangements'],
  'High-grade B-cell lymphoma, NOS': ['HIGH-GRADE B-CELL LYMPHOMA, NOS', 'high-grade B-cell lymphoma, NOS'],
  'High-grade B-cell lymphoma with 11q aberrations': ['HIGH-GRADE B-CELL LYMPHOMA with 11q ABERRATIONS', 'high-grade B-cell lymphoma with 11q aberrations'],
  'Follicular large B-cell lymphoma': ['FOLLICULAR LARGE B-CELL LYMPHOMA', 'follicular large B-cell lymphoma'],
  'Nodal marginal zone lymphoma': ['NODAL MARGINAL ZONE LYMPHOMA', 'nodal marginal zone lymphoma'],
  'Extranodal marginal zone lymphoma of MALT': ['EXTRANODAL MARGINAL ZONE LYMPHOMA OF MUCOSA-ASSOCIATED LYMPHOID TISSUE (MALT LYMPHOMA)',
    'extranodal marginal zone lymphoma of mucosa-associated lymphoid tissue (MALT lymphoma)'],
  'Chronic lymphocytic leukaemia/small lymphocytic lymphoma': ['CHRONIC LYMPHOCYTIC LEUKAEMIA/SMALL LYMPHOCYTIC LYMPHOMA', 'chronic lymphocytic leukaemia/small lymphocytic lymphoma'],
  'Mantle cell lymphoma': ['MANTLE CELL LYMPHOMA', 'mantle cell lymphoma'],
  'Lymphoplasmacytic lymphoma': ['LYMPHOPLASMACYTIC LYMPHOMA', 'lymphoplasmacytic lymphoma'],
  'Burkitt lymphoma': ['BURKITT LYMPHOMA', 'Burkitt lymphoma'],
  'Plasmablastic lymphoma': ['PLASMABLASTIC LYMPHOMA', 'plasmablastic lymphoma'],
  'B-lymphoblastic leukaemia/lymphoma': ['B-LYMPHOBLASTIC LEUKAEMIA/LYMPHOMA', 'B-lymphoblastic leukaemia/lymphoma'],
  'B-cell lymphoma, not further classified': ['B-CELL LYMPHOMA (please see description)', 'a B-cell lymphoma'],
  'Nodular lymphocyte predominant Hodgkin lymphoma': ['NODULAR LYMPHOCYTE PREDOMINANT HODGKIN LYMPHOMA', 'nodular lymphocyte predominant Hodgkin lymphoma'],
  'Peripheral T-cell lymphoma, NOS': ['PERIPHERAL T-CELL LYMPHOMA, NOS', 'peripheral T-cell lymphoma, NOS'],
  'Nodal TFH-cell lymphoma, angioimmunoblastic-type': ['NODAL T-FOLLICULAR HELPER CELL LYMPHOMA, ANGIOIMMUNOBLASTIC-TYPE', 'nodal T-follicular helper cell lymphoma, angioimmunoblastic-type'],
  'Nodal TFH-cell lymphoma, follicular-type': ['NODAL T-FOLLICULAR HELPER CELL LYMPHOMA, FOLLICULAR-TYPE', 'nodal T-follicular helper cell lymphoma, follicular-type'],
  'Nodal TFH-cell lymphoma, NOS': ['NODAL T-FOLLICULAR HELPER CELL LYMPHOMA, NOS', 'nodal T-follicular helper cell lymphoma, NOS'],
  'ALK-positive anaplastic large cell lymphoma': ['ALK-POSITIVE ANAPLASTIC LARGE CELL LYMPHOMA', 'ALK-positive anaplastic large cell lymphoma'],
  'ALK-negative anaplastic large cell lymphoma': ['ALK-NEGATIVE ANAPLASTIC LARGE CELL LYMPHOMA', 'ALK-negative anaplastic large cell lymphoma'],
  'EBV-positive nodal T- and NK-cell lymphoma': ['EBV-POSITIVE NODAL T- AND NK-CELL LYMPHOMA', 'EBV-positive nodal T- and NK-cell lymphoma'],
  'Extranodal NK/T-cell lymphoma': ['EXTRANODAL NK/T-CELL LYMPHOMA', 'extranodal NK/T-cell lymphoma'],
  'Adult T-cell leukaemia/lymphoma': ['ADULT T-CELL LEUKAEMIA/LYMPHOMA', 'adult T-cell leukaemia/lymphoma'],
  'T-lymphoblastic leukaemia/lymphoma': ['T-LYMPHOBLASTIC LEUKAEMIA/LYMPHOMA', 'T-lymphoblastic leukaemia/lymphoma'],
  'T-cell lymphoma, not further classified': ['T-CELL LYMPHOMA (please see description)', 'a T-cell lymphoma'],
  'Lymphoma, not further classified': ['MALIGNANT LYMPHOMA (please see description)', 'a malignant lymphoma'],
  'Atypical lymphoid proliferation': ['ATYPICAL LYMPHOID PROLIFERATION (please see description)', 'an atypical lymphoid proliferation'],
  // The PathologyOutlines Kikuchi sample report reads "Necrotizing lymphadenitis (see comment)", the comment
  // favouring Kikuchi disease; the form prints the histological term with the entity after it.
  'Kikuchi-Fujimoto disease': ['HISTIOCYTIC NECROTISING LYMPHADENITIS, in keeping with KIKUCHI-FUJIMOTO DISEASE', 'histiocytic necrotising lymphadenitis, in keeping with Kikuchi-Fujimoto disease']
};

// ---------- immunohistochemistry ----------

// [option label, field key]; the option order is the order the panel prints in.
export const MARKERS = [
  ['CD20', 'CD20'], ['PAX5', 'PAX5'], ['CD79a', 'CD79a'], ['OCT2', 'OCT2'], ['BOB1', 'BOB1'], ['CD10', 'CD10'], ['BCL6', 'BCL6'], ['MUM1', 'MUM1'],
  ['BCL2', 'BCL2'], ['MYC', 'MYC'], ['Cyclin D1', 'CyclinD1'], ['SOX11', 'SOX11'], ['CD5', 'CD5'], ['CD23', 'CD23'], ['CD43', 'CD43'], ['LEF1', 'LEF1'],
  ['Kappa', 'Kappa'], ['Lambda', 'Lambda'], ['CD138', 'CD138'], ['CD3', 'CD3'], ['CD2', 'CD2'], ['CD4', 'CD4'], ['CD7', 'CD7'], ['CD8', 'CD8'],
  ['CD56', 'CD56'], ['Granzyme B', 'GranzymeB'], ['TIA1', 'TIA1'], ['PD1', 'PD1'], ['ICOS', 'ICOS'], ['CXCL13', 'CXCL13'], ['CD30', 'CD30'], ['CD15', 'CD15'],
  ['CD45', 'CD45'], ['EMA', 'EMA'], ['ALK', 'ALK'], ['TdT', 'TdT'], ['CD34', 'CD34'], ['CD21', 'CD21'], ['CD68', 'CD68'], ['MPO', 'MPO'],
  ['CD123', 'CD123'], ['Cytokeratin (AE1/AE3)', 'AE1AE3'], ['S100', 'S100']
];
export const MARKER_NAMES = MARKERS.map(([m]) => m);
export const RESULTS = ['Positive', 'Negative', 'Positive (subset)', 'Weak', 'Not assessable'];
export const resultField = (marker) => `r_${(MARKERS.find(([m]) => m === marker) || [])[1]}`;
const IN_SENTENCE = { 'Cyclin D1': 'cyclin D1', Kappa: 'kappa', Lambda: 'lambda', 'Granzyme B': 'granzyme B', 'Cytokeratin (AE1/AE3)': 'cytokeratin (AE1/AE3)' };
const inSentence = (m) => IN_SENTENCE[m] || m;

/** The panel in print order, each marker with its result: [[marker, result], ...]. */
export function panelOf(v) {
  const chosen = Array.isArray(v.panel) ? v.panel : [];
  return MARKER_NAMES.filter((m) => chosen.includes(m)).map((m) => [m, v[resultField(m)] || 'Positive']);
}
const resultOf = (v, marker) => (has(v.panel, marker) ? v[resultField(marker)] || 'Positive' : '');

/**
 * Cell of origin by the Hans algorithm (Hans et al. Blood 2004): CD10 positive is GCB; CD10 negative
 * with BCL6 negative is non-GCB; CD10 negative, BCL6 positive is non-GCB with MUM1 positive and GCB with
 * MUM1 negative. A marker counts as positive at 30% or more of the lymphoma cells (PathologyOutlines
 * MUM1), which the form records as "Positive"; a subset, weak or not assessable result leaves the
 * read-out undetermined. Returns 'GCB type', 'non-GCB type' or ''.
 */
export function hansOf(v) {
  const cd10 = resultOf(v, 'CD10');
  const bcl6 = resultOf(v, 'BCL6');
  const mum1 = resultOf(v, 'MUM1');
  if (cd10 === 'Positive') return 'GCB type';
  if (cd10 !== 'Negative') return '';
  if (bcl6 === 'Negative') return 'non-GCB type';
  if (bcl6 !== 'Positive') return '';
  if (mum1 === 'Positive') return 'non-GCB type';
  if (mum1 === 'Negative') return 'GCB type';
  return '';
}

/** The cell of origin printed for a DLBCL, NOS: the Hans read-out on Auto, the type chosen otherwise. */
export function cellOfOrigin(v) {
  if (v.dx !== DLBCL) return '';
  if (v.coo === 'GCB type') return 'GCB type';
  if (v.coo === 'Non-GCB type') return 'non-GCB type';
  if (v.coo === 'Not assessed') return '';
  return hansOf(v);
}
const cooFromHans = (v) => v.dx === DLBCL && (!v.coo || v.coo === 'Auto (Hans)') && !!hansOf(v);

/** True when the immunohistochemistry meets the dual-expressor read-out (MYC 40% or more, BCL2 50% or more). */
export function dualExpressor(v) {
  if (!DUAL_DX.includes(v.dx) || !has(v.panel, 'MYC') || !has(v.panel, 'BCL2')) return false;
  const myc = num(v.mycPct);
  const bcl2 = num(v.bcl2Pct);
  return myc !== null && bcl2 !== null && myc >= 40 && bcl2 >= 50;
}

// ---------- the entity, the clause and the closing sentence ----------

function reactiveTerm(v) {
  const p = Array.isArray(v.reactivePattern) ? v.reactivePattern : [];
  const f = p.includes('Follicular hyperplasia');
  const pc = p.includes('Paracortical hyperplasia');
  const base = f && pc ? 'REACTIVE FOLLICULAR AND PARACORTICAL HYPERPLASIA' : f ? 'REACTIVE FOLLICULAR HYPERPLASIA' : pc ? 'REACTIVE PARACORTICAL HYPERPLASIA' : 'REACTIVE LYMPHOID HYPERPLASIA';
  return p.includes('Sinus histiocytosis') ? `${base} with SINUS HISTIOCYTOSIS` : base;
}

/** The entity as [CAPITALISED term, sentence-case phrase], grade, subtype and cell of origin included. */
export function entityOf(v) {
  const dx = v.dx || '';
  if (dx === OTHER) { const t = stripDot(v.dxOther); return t ? [t, lc1(t)] : ['', '']; }
  if (dx === 'Reactive lymphoid hyperplasia') { const t = reactiveTerm(v); return [t, t.toLowerCase()]; }
  if (dx === 'Granulomatous lymphadenitis') {
    const t = v.granulomaType === 'Necrotising' ? 'NECROTISING GRANULOMATOUS LYMPHADENITIS' : 'NON-NECROTISING GRANULOMATOUS LYMPHADENITIS';
    return [t, t.toLowerCase()];
  }
  if (dx === FL) {
    const grade = v.flGrade && v.flGrade !== 'Not graded' ? `, ${lc1(v.flGrade)}` : '';
    const pattern = v.flPattern && v.flPattern !== 'Not stated' ? `, ${v.flPattern.toLowerCase()} pattern` : '';
    const dl = v.flDlbcl ? ', with focal DIFFUSE LARGE B-CELL LYMPHOMA' : '';
    const dls = v.flDlbcl ? ', with focal diffuse large B-cell lymphoma' : '';
    return [`FOLLICULAR LYMPHOMA${grade}${pattern}${dl}`, `follicular lymphoma${grade}${pattern}${dls}`];
  }
  if (dx === CHL) {
    const sub = v.chlSubtype && v.chlSubtype !== 'Not subtyped' ? `${v.chlSubtype} ` : '';
    const bnli = sub && v.chlSubtype === 'Nodular sclerosis' && v.bnli && v.bnli !== 'Not graded' ? `, ${v.bnli} (BNLI)` : '';
    return [`${sub.toUpperCase()}CLASSIC HODGKIN LYMPHOMA${bnli.toUpperCase()}`, `${sub.toLowerCase()}classic Hodgkin lymphoma${bnli.toLowerCase().replace('(bnli)', '(BNLI)')}`];
  }
  const e = ENTITY[dx];
  if (!e) return ['', ''];
  const coo = cellOfOrigin(v);
  return coo ? [`${e[0]}, ${coo}`, `${e[1]}, ${coo}`] : [e[0], e[1]];
}

const QUALIFIER = { 'Consistent with': 'Consistent with', 'In keeping with': 'In keeping with', 'Suspicious for': 'Suspicious for' };
const CLOSING = { 'Consistent with': 'are consistent with', 'In keeping with': 'are in keeping with', 'Suspicious for': 'are suspicious for' };
const takesQualifiers = (v) => !SELF_WORDED.includes(v.dx);
const neoplastic = (v) => NEOPLASTIC.includes(v.dx) && !SELF_WORDED.includes(v.dx);

/** The diagnosis clause: qualifier, extent and recurrence, then the entity. */
export function dxClause(v) {
  const [caps] = entityOf(v);
  if (!caps) return '';
  if (!takesQualifiers(v)) return caps;
  const lead = [];
  if (neoplastic(v) && v.extent === 'Partial involvement') lead.push('partial involvement by');
  if (neoplastic(v) && v.recurrent) lead.push('recurrent');
  const core = [...lead, caps].join(' ');
  const q = QUALIFIER[v.certainty];
  return q ? `${q} ${core}` : cap1(core);
}

/** "The overall features are those of …" from the same pieces as the diagnosis. */
export function closingSentence(v) {
  const [, phrase] = entityOf(v);
  if (!phrase) return '';
  const lead = [];
  if (takesQualifiers(v) && neoplastic(v) && v.extent === 'Partial involvement') lead.push('partial involvement by');
  if (takesQualifiers(v) && neoplastic(v) && v.recurrent) lead.push('recurrent');
  const verb = (takesQualifiers(v) && CLOSING[v.certainty]) || 'are those of';
  return `The overall features ${verb} ${[...lead, phrase].join(' ')}.`;
}

// ---------- specimen ----------

const PROCEDURE = { Excision: 'excision', 'Excisional biopsy': 'excisional biopsy', 'Incisional biopsy': 'incisional biopsy', 'Core biopsy': 'core biopsy', Biopsy: 'biopsy' };
const procWord = (v) => PROCEDURE[v.procedure] || 'excision';
const siteOf = (v) => lc1(stripDot(v.site).replace(/^[,\s]+/, ''));
const referral = (v) => v.received === 'Slides for review';
const isCore = (v) => v.procedure === 'Core biopsy';
const isNodeExcision = (v) => v.procedure === 'Excision' || v.procedure === 'Excisional biopsy';

export function specimenName(part) {
  const v = part.values;
  const site = siteOf(v);
  return `Lymph node, ${site ? `${site}, ` : ''}${procWord(v)}${referral(v) ? ' for slide review' : ''}`;
}

function slideCounts(v) {
  return { he: int(v.slidesHE), ihc: int(v.slidesIHC), ish: int(v.slidesISH), blocks: int(v.refBlocks) };
}

/** "(B26/12345 x 13 slides from QEH)" for the diagnosis line of a referral. */
function referralBracket(v) {
  const { he, ihc, ish } = slideCounts(v);
  const total = (he || 0) + (ihc || 0) + (ish || 0);
  const ref = stripDot(v.refNumber);
  const hosp = stripDot(v.refHospital);
  const what = [ref, total ? `${total} slide${total === 1 ? '' : 's'}` : ''].filter(Boolean).join(' x ');
  const from = hosp ? `${what ? `${what} ` : 'slides '}from ${hosp}` : what;
  return from ? ` (${from})` : '';
}

export function dxHead(part) {
  const v = part.values;
  const site = siteOf(v);
  return `LYMPH NODE, ${site ? `${site}, ` : ''}${procWord(v)}${referral(v) ? ` for slide review${referralBracket(v)}` : ''}`;
}

// ---------- macroscopy ----------

const withUnit = (s, unit) => (/\b(cm|mm)\b/i.test(s) ? s : `${s} ${unit}`);

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  if (referral(v)) return '';
  const how = v.fixation === 'In formalin' ? 'in formalin' : 'fresh';
  const size = stripDot(v.size);
  const out = [];
  if (isCore(v)) {
    const n = int(v.cores);
    const len = stripDot(v.coreLength);
    const what = n === 1 ? 'is one core' : n ? `are ${word(n)} cores` : 'are cores';
    out.push(`Received ${how} ${what} of tan tissue${len ? ` measuring ${withUnit(len, 'mm')} in length` : ''}.`);
  } else if (isNodeExcision(v)) {
    const n = int(v.nodeCount) || 1;
    out.push(n > 1 ? `Received ${how} are ${word(n)} lymph nodes${size ? `, the largest measuring ${withUnit(size, 'cm')}` : ''}.`
      : `Received ${how} is a lymph node${size ? ` measuring ${withUnit(size, 'cm')}` : ''}.`);
  } else {
    out.push(`Received ${how} is a piece of tan tissue${size ? ` measuring ${withUnit(size, 'cm')}` : ''}.`);
  }
  if (!isCore(v)) {
    const cut = {
      'Homogeneous, tan and fleshy': 'The cut surface is homogeneous, tan and fleshy.',
      Nodular: 'The cut surface is nodular.',
      'With areas of necrosis': 'The cut surface shows areas of necrosis.',
      'With fibrous bands': 'The cut surface shows fibrous bands.'
    }[v.cutSurface];
    if (cut) out.push(cut);
  }
  if (how === 'fresh') {
    const fresh = (Array.isArray(v.freshFor) ? v.freshFor : []).filter((x) => x !== 'Touch imprints').map((x) => x.toLowerCase());
    if (fresh.length) out.push(`A portion is taken fresh for ${list(fresh)}.`);
    if (has(v.freshFor, 'Touch imprints')) out.push('Touch imprints are made.');
  }
  const b = int(v.blocks);
  const inBlocks = b ? ` in ${word(b)} block${b === 1 ? '' : 's'}` : '';
  if (isCore(v)) out.push(`All embedded${inBlocks}.`);
  else if (v.embedded === 'Representative sections') out.push(`Representative sections are embedded${inBlocks}.`);
  else out.push(`${isNodeExcision(v) ? 'Serially sliced and all' : 'All'} embedded${inBlocks}.`);
  const notes = stripDot(v.macroNotes);
  if (notes) out.push(`${cap1(notes)}.`);
  return `(${part.label}) ${out.join(' ')}`;
}

export const blockKey = (part, ctx) => (referral(part.values) ? '' : letteredBlockKey(part, ctx, { lettered, strip: stripDot }));

// ---------- microscopy ----------

const PATTERN_ADJ = { Diffuse: 'diffuse', 'Follicular / nodular': 'nodular', 'Follicular and diffuse': 'follicular and diffuse', 'Nodular with fibrous bands': 'nodular',
  Interfollicular: 'interfollicular', Paracortical: 'paracortical', Sinusoidal: 'sinusoidal' };
const SIZE_ADJ = { Small: 'small', 'Small to medium': 'small to medium-sized', Medium: 'medium-sized', 'Medium to large': 'medium to large', Large: 'large' };
export const MIXED = 'Scattered large cells in a mixed background';

function infiltrate(v) {
  const pat = PATTERN_ADJ[v.pattern] ? `${PATTERN_ADJ[v.pattern]} ` : '';
  const bands = v.pattern === 'Nodular with fibrous bands';
  if (v.cellSize === MIXED) return `a ${pat}mixed infiltrate${bands ? ' separated by fibrous bands' : ''} containing scattered large atypical cells`;
  const size = SIZE_ADJ[v.cellSize];
  return `a ${pat}proliferation of ${size ? `${size} ` : ''}atypical lymphoid cells${bands ? ' separated by fibrous bands' : ''}`;
}

function referralOpener(v) {
  const { he, ihc, ish, blocks } = slideCounts(v);
  const items = [];
  const add = (n, noun) => { if (n) items.push(`${word(n)} ${noun}${n === 1 ? '' : 's'}`); };
  add(he, 'H&E section'); add(ihc, 'immunostained section'); add(ish, 'in situ hybridisation section'); add(blocks, 'paraffin block');
  const total = (he || 0) + (ihc || 0) + (ish || 0) + (blocks || 0);
  const ref = stripDot(v.refNumber);
  const hosp = stripDot(v.refHospital);
  const subject = items.length ? cap1(list(items)) : 'Slides';
  const one = total === 1;
  const s1 = `${subject}${ref ? ` labelled ${ref}` : ''} ${one ? 'is' : 'are'} received${hosp ? ` from ${hosp}` : ' for review'}.`;
  const site = siteOf(v);
  const what = `${site ? `${site} ` : ''}lymph node ${procWord(v)}`;
  const date = stripDot(v.refDate);
  const s2 = `${one ? 'It represents' : 'They represent'} ${article(what)} ${what}${date ? `, received on ${date}` : ''}.`;
  return `${s1} ${s2}`;
}

function opening(v) {
  let what;
  if (isCore(v)) {
    const n = referral(v) ? null : int(v.cores);
    what = n === 1 ? 'one core of lymphoid tissue' : n ? `${word(n)} cores of lymphoid tissue` : 'cores of lymphoid tissue';
  } else if (isNodeExcision(v)) {
    const n = referral(v) ? 1 : int(v.nodeCount) || 1;
    what = n > 1 ? `${word(n)} lymph nodes` : 'a lymph node';
  } else if (v.procedure === 'Incisional biopsy') what = 'part of a lymph node';
  else what = 'lymph node tissue';
  const lesional = LESIONAL.includes(v.dx);
  const arch = v.architecture || 'Effaced';
  if (!lesional) {
    const tail = arch === 'Preserved' ? ' with preserved nodal architecture' : arch === 'Partially effaced' ? ' with the nodal architecture partially effaced' : ' with the nodal architecture effaced';
    return `Sections show ${what}${tail}.`;
  }
  const inf = infiltrate(v);
  if (arch === 'Preserved') return `Sections show ${what} with preserved nodal architecture and ${inf}.`;
  if (arch === 'Partially effaced') return `Sections show ${what} with the nodal architecture partially effaced by ${inf}.`;
  return `Sections show ${what} with the nodal architecture effaced by ${inf}.`;
}

const NUCLEAR = [
  ['Irregular, cleaved nuclei', 'irregular, cleaved nuclei'], ['Round nuclei with clumped chromatin', 'round nuclei with clumped chromatin'],
  ['Vesicular nuclei with prominent nucleoli', 'vesicular nuclei with prominent nucleoli'], ['Blastoid chromatin', 'fine, blastoid chromatin'],
  ['Plasmacytoid differentiation', 'plasmacytoid differentiation'], ['Monocytoid cells with pale cytoplasm', 'monocytoid features with abundant pale cytoplasm'],
  ['Clear cytoplasm', 'clear cytoplasm']
];
const LARGE_CELLS = [
  ['Hodgkin and Reed-Sternberg cells', 'Hodgkin and Reed-Sternberg cells'], ['Lacunar cells', 'lacunar cells'], ['Mummified cells', 'mummified cells'],
  ['LP (popcorn) cells', 'LP (popcorn) cells'], ['Hallmark cells', 'hallmark cells with eccentric, kidney-shaped nuclei']
];
export const CYTOLOGY = ['Centrocytes and centroblasts', ...NUCLEAR.map(([o]) => o), ...LARGE_CELLS.map(([o]) => o)];
const BACKGROUND = [['Small lymphocytes', 'small lymphocytes'], ['Eosinophils', 'eosinophils'], ['Plasma cells', 'plasma cells'], ['Neutrophils', 'neutrophils'],
  ['Histiocytes', 'histiocytes'], ['Epithelioid histiocytes', 'epithelioid histiocytes'], ['Tingible body macrophages', 'tingible body macrophages']];
export const BACKGROUND_OPTIONS = BACKGROUND.map(([o]) => o);
export const FEATURES = ['Necrosis', 'Sclerosis', 'Frequent mitoses', 'Starry-sky pattern', 'Back-to-back follicles', 'Attenuated mantle zones',
  'Absent tingible body macrophages', 'Proliferated high endothelial venules', 'Residual reactive follicles', 'Capsular and perinodal extension', 'Karyorrhectic debris'];

function cytologySentences(v) {
  if (!LESIONAL.includes(v.dx)) return [];
  const c = Array.isArray(v.cytology) ? v.cytology : [];
  const out = [];
  const cccb = c.includes('Centrocytes and centroblasts');
  const nuc = NUCLEAR.filter(([o]) => c.includes(o)).map(([, w]) => w);
  if (cccb && nuc.length) out.push(`The atypical cells comprise centrocytes and centroblasts and show ${list(nuc)}.`);
  else if (cccb) out.push('The atypical cells comprise centrocytes and centroblasts.');
  else if (nuc.length) out.push(`The atypical cells show ${list(nuc)}.`);
  const big = LARGE_CELLS.filter(([o]) => c.includes(o)).map(([, w]) => w);
  if (big.length) out.push(`${cap1(list(big))} are present.`);
  return out;
}

function reactiveSentences(v) {
  const out = [];
  if (v.dx === 'Reactive lymphoid hyperplasia') {
    const p = Array.isArray(v.reactivePattern) ? v.reactivePattern : [];
    if (p.includes('Follicular hyperplasia')) out.push('Reactive follicles of varying size and shape show polarised germinal centres with tingible body macrophages and intact mantle zones.');
    if (p.includes('Paracortical hyperplasia')) out.push('The paracortex is expanded by a mixed population of small lymphocytes, immunoblasts and histiocytes.');
    if (p.includes('Sinus histiocytosis')) out.push('The sinuses are distended by histiocytes.');
  }
  if (v.dx === 'Granulomatous lymphadenitis') out.push(v.granulomaType === 'Necrotising' ? 'There are epithelioid granulomas with central necrosis.' : 'There are non-necrotising epithelioid granulomas.');
  if (v.dx === 'Kikuchi-Fujimoto disease') out.push('There are paracortical areas of necrosis with karyorrhectic debris and histiocytes.');
  return out;
}

function featureSentences(v) {
  const f = Array.isArray(v.features) ? v.features : [];
  const kikuchi = v.dx === 'Kikuchi-Fujimoto disease';
  const out = [];
  const there = [];
  if (f.includes('Necrosis') && !kikuchi) there.push('areas of necrosis');
  if (f.includes('Sclerosis')) there.push('sclerosis');
  if (f.includes('Karyorrhectic debris') && !kikuchi) there.push('abundant karyorrhectic debris');
  if (f.includes('Starry-sky pattern')) there.push('a starry-sky pattern');
  if (f.includes('Proliferated high endothelial venules')) there.push('a proliferation of high endothelial venules');
  if (there.length) out.push(`There ${/^(areas|abundant)/.test(there[0]) ? 'are' : 'is'} ${list(there)}.`);
  if (f.includes('Frequent mitoses')) out.push('Mitoses are frequent.');
  const fol = [];
  if (f.includes('Attenuated mantle zones')) fol.push('attenuated mantle zones');
  if (f.includes('Absent tingible body macrophages')) fol.push('no tingible body macrophages');
  if (f.includes('Back-to-back follicles')) out.push(`The follicles are crowded and back to back${fol.length ? `, with ${list(fol)}` : ''}.`);
  else if (fol.length) out.push(`The follicles show ${list(fol)}.`);
  if (f.includes('Residual reactive follicles')) out.push('Residual reactive follicles are present.');
  if (f.includes('Capsular and perinodal extension')) out.push('The infiltrate extends through the capsule into the perinodal fat.');
  return out;
}

/** The cells the immunophenotype describes: typed, else by the diagnosis. */
export function ihcSubject(v) {
  const typed = stripDot(v.ihcCells);
  if (typed) return /^(the|a|an)\s/i.test(typed) ? lc1(typed) : `the ${lc1(typed)}`;
  if (v.dx === CHL) return 'the Hodgkin and Reed-Sternberg cells';
  if (v.dx === NLPHL) return 'the LP cells';
  if (!LESIONAL.includes(v.dx)) return 'the lymphoid cells';
  return 'the atypical lymphoid cells';
}

function ihcSentences(v) {
  const panel = panelOf(v);
  const subject = ihcSubject(v);
  const by = (r) => panel.filter(([, res]) => res === r).map(([m]) => inSentence(m));
  const pos = by('Positive');
  const weak = by('Weak');
  const neg = by('Negative');
  const subset = by('Positive (subset)');
  const na = by('Not assessable');
  const out = [];
  const clauses = [];
  if (pos.length) clauses.push(`positive for ${list(pos)}`);
  if (weak.length) clauses.push(`weakly positive for ${list(weak)}`);
  if (neg.length) clauses.push(`negative for ${list(neg)}`);
  if (clauses.length) {
    // Two short clauses take "and"; a list inside a clause takes the comma before the last clause.
    const simple = clauses.length === 2 && ![pos, weak, neg].some((xs) => xs.length > 1);
    const joined = clauses.length === 1 ? clauses[0] : simple ? clauses.join(' and ') : `${clauses.slice(0, -1).join(', ')}, and ${clauses[clauses.length - 1]}`;
    out.push(`Immunohistochemical stains show that ${subject} are ${joined}.`);
  }
  if (subset.length) out.push(`A subset of ${subject} is positive for ${list(subset)}.`);
  if (na.length) out.push(`Staining for ${list(na)} is not assessable.`);
  const pct = [];
  const myc = has(v.panel, 'MYC') ? num(v.mycPct) : null;
  const bcl2 = has(v.panel, 'BCL2') ? num(v.bcl2Pct) : null;
  const cells = subject.replace(/^the /, '');
  if (myc !== null && bcl2 !== null) pct.push(`MYC is expressed in approximately ${myc}% and BCL2 in approximately ${bcl2}% of the ${cells}.`);
  else if (myc !== null) pct.push(`MYC is expressed in approximately ${myc}% of the ${cells}.`);
  else if (bcl2 !== null) pct.push(`BCL2 is expressed in approximately ${bcl2}% of the ${cells}.`);
  out.push(...pct);
  const bg = stripDot(v.ihcBackground);
  if (bg) out.push(`${cap1(bg)}.`);
  if (v.dx === FL && int(v.cbCount) !== null) {
    const field = stripDot(v.cbField);
    out.push(`Centroblasts are counted at ${int(v.cbCount)}/HPF${field ? ` (${field})` : ''}.`);
  }
  const ki = num(v.ki67);
  if (ki !== null) out.push(`The Ki-67 proliferative index is approximately ${ki}%.`);
  const eber = {
    Negative: `In situ hybridisation for EBER is negative in ${subject}.`,
    'Positive in the atypical cells': `In situ hybridisation for EBER is positive in ${subject}.`,
    'Scattered positive background cells': 'In situ hybridisation for EBER highlights scattered background cells only.'
  }[v.eber];
  if (eber) out.push(eber);
  return out;
}

/** The narrative paragraph: what the slides show, the immunophenotype and the overall impression. */
export function microscopy(part) {
  const v = part.values;
  const out = [];
  if (referral(v)) out.push(referralOpener(v));
  out.push(opening(v));
  out.push(...reactiveSentences(v));
  out.push(...cytologySentences(v));
  const bg = BACKGROUND.filter(([o]) => has(v.background, o)).map(([, w]) => w);
  if (bg.length) out.push(`The background contains ${list(bg)}.`);
  out.push(...featureSentences(v));
  const notes = stripDot(v.morphNotes);
  if (notes) out.push(`${cap1(notes)}.`);
  out.push(...ihcSentences(v));
  const close = closingSentence(v);
  if (close) out.push(close);
  return `(${part.label}) ${out.join(' ')}`;
}

/** The marker-by-marker list printed under the paragraph (option `ihcList`). */
export function panelList(part) {
  const v = part.values;
  const items = panelOf(v).map(([m, r]) => {
    const pct = m === 'MYC' ? num(v.mycPct) : m === 'BCL2' ? num(v.bcl2Pct) : null;
    return { label: m, value: pct !== null ? `${r} (${pct}%)` : r };
  });
  const ki = num(v.ki67);
  if (ki !== null) items.push({ label: 'Ki-67', value: `approximately ${ki}%` });
  if (v.dx === FL && int(v.cbCount) !== null) items.push({ label: 'Centroblasts', value: `${int(v.cbCount)}/HPF` });
  const coo = cellOfOrigin(v);
  if (coo) items.push({ label: cooFromHans(v) ? 'Cell of origin (Hans algorithm)' : 'Cell of origin', value: cap1(coo) });
  const ish = v.eber && v.eber !== 'Not performed' ? [{ label: 'EBER', value: v.eber }] : [];
  return renderSynoptic([{ heading: 'Immunohistochemistry', items }, { heading: 'In situ hybridisation', items: ish }]);
}

// The engine calls synoptic() in place of microscopy() and prints it under "MICROSCOPIC EXAMINATION AND
// SYNOPTIC REPORT"; the paragraph comes first, the panel list after it.
export function synoptic(part, ctx) {
  const narrative = microscopy(part, ctx);
  const showList = !(ctx?.options && ctx.options.ihcList === false);
  const listText = showList ? panelList(part) : '';
  return [narrative, listText].filter(Boolean).join('\n\n');
}

// ---------- molecular findings ----------

export const FISH_RESULTS = ['Not performed', 'Rearranged', 'Not rearranged', 'Pending', 'Failed'];
export const CLONALITY_RESULTS = ['Not performed', 'Clonal', 'Polyclonal', 'Pending'];

export function molecular(part, ctx) {
  const v = part.values;
  const fish = [['MYC', v.fishMYC], ['BCL2', v.fishBCL2], ['BCL6', v.fishBCL6]].filter(([, r]) => r && r !== 'Not performed').map(([g, r]) => ({ label: g, value: r }));
  const other = stripDot(v.fishOther);
  if (other) fish.push({ text: other });
  const clon = [['IG gene rearrangement', v.clonIG], ['TR gene rearrangement', v.clonTR]].filter(([, r]) => r && r !== 'Not performed').map(([l, r]) => ({ label: l, value: r }));
  if (!fish.length && !clon.length) return '';
  return renderSynoptic([{ heading: 'FISH', items: fish }, { heading: 'Clonality', items: clon }], lettered(part, ctx) ? `(${part.label})` : '');
}

// ---------- diagnosis and comment ----------

export function diagnosis(part) {
  return renderDiagnosis(`(${part.label}) ${dxHead(part)}`, [dxClause(part.values)]);
}

export function comment(parts, ctx) {
  const many = (parts?.length || 0) > 1;
  const out = [];
  for (const p of parts || []) {
    const v = p.values;
    if (v.flow !== 'Concordant' && v.flow !== 'Not concordant') continue;
    const ref = stripDot(v.flowRef);
    const finding = stripDot(v.flowText);
    const lead = `${many ? `(${p.label}) ` : ''}Flow cytometry${ref ? ` (${ref})` : ''}`;
    if (v.flow === 'Concordant') out.push(finding ? `${lead} shows ${finding}, concordant with the histological findings.` : `${lead} is concordant with the histological findings.`);
    else out.push(finding ? `${lead} shows ${finding}; the result is not concordant with the histological findings.` : `${lead} is not concordant with the histological findings.`);
  }
  if ((parts || []).some((p) => cooFromHans(p.values))) out.push('The cell of origin is assigned by the Hans immunohistochemical algorithm (CD10, BCL6 and MUM1).');
  void ctx;
  return out.join(' ');
}

const PENDING = (v) => [v.fishMYC, v.fishBCL2, v.fishBCL6, v.clonIG, v.clonTR, v.flow].includes('Pending');

export function flags(parts) {
  const out = [];
  if ((parts || []).some((p) => dualExpressor(p.values))) out.push('dualExpressor');
  if ((parts || []).some((p) => PENDING(p.values))) out.push('studiesPending');
  return out;
}

// ---------- checks ----------

/** The grade a centroblast count gives (PathologyOutlines FL: 0-5, 6-15, more than 15 per 0.159 mm2 field). */
export function gradeForCount(n) {
  if (n === null || n === undefined) return '';
  return n <= 5 ? 'Grade 1' : n <= 15 ? 'Grade 2' : 'Grade 3A';
}

export function validate(part) {
  const v = part.values;
  const { out, at, err, warn } = checks();
  const info = (m, f) => at('info', m, f);
  const r = (m) => resultOf(v, m);
  if (v.dx === OTHER && !stripDot(v.dxOther)) err('Type the diagnosis.', 'dxOther');
  if (referral(v) && !stripDot(v.refHospital)) warn('Slides for review: name the referring hospital.', 'refHospital');
  if (NEOPLASTIC.includes(v.dx) && !panelOf(v).length) warn('No immunohistochemistry is recorded for a lymphoma diagnosis.', 'panel');
  if (v.dx === DLBCL) {
    const hans = hansOf(v);
    if ((v.coo === 'GCB type' || v.coo === 'Non-GCB type') && hans && v.coo.toLowerCase() !== hans.toLowerCase()) {
      warn(`The cell of origin chosen (${v.coo}) differs from the Hans algorithm read-out (${cap1(hans)}).`, 'coo');
    }
    if ((!v.coo || v.coo === 'Auto (Hans)') && !hans) info('The Hans algorithm needs CD10, BCL6 and MUM1 recorded as positive or negative (30% of the lymphoma cells or more counts as positive); no cell of origin is printed.', 'panel');
  }
  if (v.dx === FL) {
    const n = int(v.cbCount);
    const grade = v.flGrade;
    if (n !== null && grade && grade !== 'Not graded') {
      const expect = gradeForCount(n);
      const ok = grade === expect || (grade === 'Grade 1-2' && expect !== 'Grade 3A');
      if (!ok) warn(`A count of ${n} centroblasts per high-power field is ${expect.toLowerCase()} (0 to 5 grade 1, 6 to 15 grade 2, more than 15 grade 3A, per 0.159 mm2 field); the grade chosen is ${grade.toLowerCase()}.`, 'flGrade');
    }
    if (grade === 'Grade 3A' && (v.flPattern === 'Follicular and diffuse' || v.flPattern === 'Predominantly diffuse') && !v.flDlbcl) {
      warn('Grade 3A with diffuse areas: a diffuse area of grade 3 is reported as diffuse large B-cell lymphoma alongside the follicular lymphoma.', 'flDlbcl');
    }
  }
  const mycR = v.fishMYC === 'Rearranged';
  const bcl2R = v.fishBCL2 === 'Rearranged';
  const bcl6R = v.fishBCL6 === 'Rearranged';
  if (mycR && bcl2R && B_CELL.includes(v.dx) && v.dx !== DOUBLE_HIT) {
    warn('MYC and BCL2 are both rearranged: the WHO-HAEM5 entity is diffuse large B-cell lymphoma/high-grade B-cell lymphoma with MYC and BCL2 rearrangements.', 'dx');
  }
  if (v.dx === DOUBLE_HIT && !(mycR && bcl2R)) {
    if (mycR && bcl6R) warn('MYC with BCL6 rearrangement, without BCL2, is classified as diffuse large B-cell lymphoma, NOS or high-grade B-cell lymphoma, NOS by the cytomorphology.', 'dx');
    else warn('This entity needs MYC and BCL2 rearrangements: record both FISH results.', 'fishMYC');
  }
  if (v.dx === CHL && (r('CD30') === 'Negative' || r('CD45') === 'Positive')) {
    warn('Classic Hodgkin lymphoma: the Hodgkin and Reed-Sternberg cells are expected to be CD30 positive and CD45 negative.', 'panel');
  }
  if (v.dx === 'Mantle cell lymphoma' && r('Cyclin D1') === 'Negative') {
    warn('Mantle cell lymphoma with cyclin D1 negative: the cyclin D1-negative subtype carries CCND2, CCND3 or CCNE rearrangements.', 'panel');
  }
  if (v.dx === 'Burkitt lymphoma' && num(v.ki67) !== null && num(v.ki67) < 95) warn('Burkitt lymphoma with a Ki-67 index below 95%.', 'ki67');
  if (NTFHL.includes(v.dx) && !['PD1', 'ICOS', 'CXCL13', 'CD10', 'BCL6'].some((m) => r(m) === 'Positive' || r(m) === 'Positive (subset)')) {
    warn('Nodal TFH-cell lymphoma: no TFH marker (PD1, ICOS, CXCL13, CD10 or BCL6) is recorded as positive.', 'panel');
  }
  if (v.dx === 'ALK-positive anaplastic large cell lymphoma' && r('ALK') === 'Negative') warn('ALK-positive anaplastic large cell lymphoma with ALK recorded as negative.', 'panel');
  if (v.dx === 'ALK-negative anaplastic large cell lymphoma' && r('ALK') === 'Positive') warn('ALK-negative anaplastic large cell lymphoma with ALK recorded as positive.', 'panel');
  if ((v.dx === 'ALK-positive anaplastic large cell lymphoma' || v.dx === 'ALK-negative anaplastic large cell lymphoma') && r('CD30') === 'Negative') warn('Anaplastic large cell lymphoma with CD30 recorded as negative.', 'panel');
  if (v.dx === 'EBV-positive diffuse large B-cell lymphoma' && v.eber !== 'Positive in the atypical cells') warn('EBV-positive diffuse large B-cell lymphoma: EBER in situ hybridisation is not recorded as positive in the lymphoma cells.', 'eber');
  if (v.dx === DLBCL && v.eber === 'Positive in the atypical cells') warn('EBER is positive in the lymphoma cells of a diffuse large B-cell lymphoma, NOS: EBV-positive diffuse large B-cell lymphoma is the WHO-HAEM5 entity.', 'dx');
  if (dualExpressor(v)) info('MYC 40% or more and BCL2 50% or more: dual expressor by immunohistochemistry (the comment snippet is suggested).', 'mycPct');
  return out;
}

// The registry loads this default export; a generator without one is not wired in.
export default { specimenName, macro, blockKey, synoptic, microscopy, molecular, diagnosis, comment, flags, validate };
