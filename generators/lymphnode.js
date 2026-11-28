import { stripDot, checks } from './_house.js';
// Lymph node excision / sentinel node / dissection generator. Pure functions: (part, ctx) -> string.
// Each part is one node specimen (site or station) so any case can add node parts.
// Blocks produced:
//   specimenName "Lymph node, right SLN2, excision"
//   macro        "(A) Received in formalin is a piece of fibroadipose tissue measuring 3 x 2 x 1 cm containing one lymph node measuring 1.2 cm. All embedded in 1 block."
//   blockKey     "(A) (1) Lymph node, bisected."
//   microscopy   "(A) Sections show fibroadipose tissue and one reactive lymph node. No suspicious cells are identified on immunostain for pancytokeratin MNF116. There is no evidence of malignancy."
//   diagnosis    "(A) LYMPH NODE, right SLN2, excision - NO EVIDENCE OF MALIGNANCY (0/1)"
// The (x/y) count is derived from the positive and total node counts.
// Wording is protected by tests/lymphnode.test.js — change it only deliberately.
//
// Staging criteria (Phase 76, docs/specs/sentinel-node.md; sources in docs/reference/sentinel-node-sources.md).
// "Breast" adds the size category, isolated tumour cells, the extranodal extent and the nodal treatment
// effect; "Melanoma" adds the location of the deposits and prints no size category. With the criteria
// "Not applied" (the default) every report reads exactly as before.
//   Breast categories (AJCC 8th edition, as in the CAP breast invasive resection protocol 4.11.0.0, June 2026,
//   https://www.cap.org/wp-content/uploads/2026/06/Breast.Invasive.Res_4.11.0.0.REL_CAPCP.pdf?download, and
//   the QMH template https://awiloqmh.github.io/CancerReportingTemplate/BREAST-Cancers.html): macrometastasis
//   more than 2 mm; micrometastasis more than 0.2 mm to 2 mm or more than 200 cells in a single cross-section;
//   isolated tumour cells 0.2 mm or less or fewer than 200 cells, counted as examined but not as positive.
//   The size is that of the largest group of touching tumour cells, including any part outside the node.
//   Extranodal extent 2 mm or less / more than 2 mm (QMH; CAP 4.11 note on measuring perpendicular to the
//   capsule or in another dimension). Nodal treatment effect: the four CAP 4.11 answers.
//   Melanoma (AJCC 8th edition, Gershenwald et al. 2017, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5978683/;
//   ICCR https://www.iccr-cancer.org/docs/ICCR-Melanoma2-LN.pdf; CAP melanoma 1.2.0.0,
//   https://documents.cap.org/documents/New-Cancer-Protocols-March-2025/Skin.Inv_Melanoma.Res_1.2.0.0.REL.CAPCP.docx):
//   any tumour cells make the node positive (no isolated tumour cell category); the largest discrete deposit
//   to the nearest 0.1 mm; nodal site subcapsular, intraparenchymal or both.
//   Vulval carcinoma (Phase 77; AJCC version 9, Olawaiye et al., CA Cancer J Clin 2026, https://pmc.ncbi.nlm.nih.gov/articles/PMC13525161/,
//   as in CAP Vulva 5.1.0.0, https://documents.cap.org/protocols/Vulva_5.1.0.0.REL_CAPCP.docx, and the ICCR vulva
//   dataset 2nd edition, https://www.iccr-cancer.org/wp-content/uploads/2024/09/ICCR-Vulva-2nd-ed-v2.1-bookmarked.pdf):
//   isolated tumour cells 0.2 mm or less, or clusters of 200 cells or fewer, pN0(i+); micrometastasis more
//   than 0.2 mm to 2.0 mm, pN1mi; more than 2.0 mm to 5.0 mm pN1a; more than 5.0 mm pN1b; extranodal extension
//   pN1c; fixed or ulcerated nodes pN2. The number of involved nodes no longer counts. The report names a
//   micrometastasis only; the case pN is staged on the vulval carcinoma form from all the regional nodes.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
/** Words for 0-9, digits from 10. */
export const word = (n) => (n >= 0 && n <= 9 ? WORDS[n] : String(n));
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
/** Lower-case the first letter unless the first word is an acronym / station code ("SLN2", "L4"). */
const lcSite = (s) => {
  const t = String(s || '').trim();
  if (!t) return '';
  if (t.length > 1 && /[A-Z0-9]/.test(t.charAt(1))) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
};

const METASTATIC = ['Metastatic carcinoma', 'Metastatic malignant melanoma', 'Other metastatic tumour'];
export const isMetastatic = (v) => METASTATIC.includes(v.result);
export const isNegative = (v) => !v.result || v.result.startsWith('Negative');
export const isGranulomatous = (v) => v.result === 'Granulomatous inflammation';
export const isLymphoma = (v) => v.result === 'Lymphoma - see comment';
export const isItc = (v) => v.result === 'Isolated tumour cells';
const isBreast = (v) => v.criteria === 'Breast';
const isMelanomaCriteria = (v) => v.criteria === 'Melanoma';
const isVulvaCriteria = (v) => v.criteria === 'Vulva';

/** Largest deposit in millimetres from "8", "8 mm" or "0.8 cm"; null when blank or unreadable. */
export function depositMm(v) {
  const s = String(v.largestDeposit ?? '').trim();
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return /cm/i.test(s) ? Math.round(n * 1000) / 100 : n;
}

/**
 * Breast size category of a carcinoma metastasis: the one chosen, else from the largest deposit
 * (more than 2 mm macrometastasis, more than 0.2 mm micrometastasis). '' when the criteria are neither
 * Breast nor Vulva, when no size is given, or for a deposit of 0.2 mm or less (Checks asks for isolated
 * tumour cells or a micrometastasis by cell count). With the Vulva criteria only a micrometastasis is
 * named (more than 0.2 mm to 2 mm, pN1mi); larger deposits print their size alone.
 */
export function metCategory(v) {
  if (v.result !== 'Metastatic carcinoma') return '';
  if (isVulvaCriteria(v)) {
    const mm = depositMm(v);
    return mm !== null && mm > 0.2 && mm <= 2 ? 'Micrometastasis' : '';
  }
  if (!isBreast(v)) return '';
  if (v.metCategory === 'Macrometastasis' || v.metCategory === 'Micrometastasis') return v.metCategory;
  const mm = depositMm(v);
  if (mm === null) return '';
  return mm > 2 ? 'Macrometastasis' : mm > 0.2 ? 'Micrometastasis' : '';
}

export const TREATMENT = {
  none: 'No known presurgical therapy',
  noResponse: 'Presurgical therapy, no definite response',
  response: 'Presurgical therapy, metastasis with treatment effect',
  scarring: 'Presurgical therapy, fibrous scarring and no metastasis',
  noScarring: 'Presurgical therapy, no metastasis and no scarring'
};
/** The nodal treatment effect, read only with the Breast criteria and the results it is shown for. */
export function treatmentEffect(v) {
  if (!isBreast(v)) return TREATMENT.none;
  if (!(isNegative(v) || isItc(v) || v.result === 'Metastatic carcinoma')) return TREATMENT.none;
  return v.treatmentEffect || TREATMENT.none;
}
const responded = (v) => (isMetastatic(v) || isItc(v)) && treatmentEffect(v) === TREATMENT.response;
const scarred = (v) => isNegative(v) && treatmentEffect(v) === TREATMENT.scarring;

/**
 * Vulval pN category of this node alone (AJCC 9th edition, AJCC version 9), for Checks only: pN0(i+) for isolated tumour
 * cells; for a carcinoma metastasis pN1c with extranodal extension, else by the largest deposit. '' when
 * the criteria are not Vulva or the deposit is not recorded.
 */
export function vulvaCategory(v) {
  if (!isVulvaCriteria(v)) return '';
  if (isItc(v)) return 'pN0(i+)';
  if (v.result !== 'Metastatic carcinoma') return '';
  if (v.extranodal === 'Present') return 'pN1c';
  const mm = depositMm(v);
  if (mm === null || mm <= 0.2) return '';
  return mm > 5 ? 'pN1b' : mm > 2 ? 'pN1a' : 'pN1mi';
}

/** Melanoma deposit site, read only with the Melanoma criteria: [microscopy phrase, diagnosis clause]. */
const LOCATIONS = {
  Subcapsular: [' in the subcapsular sinus', 'subcapsular'],
  Intraparenchymal: [' within the nodal parenchyma', 'intraparenchymal'],
  'Subcapsular and intraparenchymal': [' in the subcapsular sinus and the nodal parenchyma', 'subcapsular and intraparenchymal']
};
const location = (v) => (isMelanomaCriteria(v) && v.result === 'Metastatic malignant melanoma' && LOCATIONS[v.location]) || null;

/** Extranodal extent, read only when extension is present on a metastasis. */
const eneExtent = (v) => (isMetastatic(v) && v.extranodal === 'Present' && ['2 mm or less', 'More than 2 mm'].includes(v.eneExtent) ? v.eneExtent : '');

/** Total nodes examined: microscopy count when given, else the number received (never below 0). */
export function totalNodes(v) {
  const micro = num(v.nodesTotal);
  const n = micro !== null ? micro : (num(v.nodesReceived) ?? 1);
  return Math.max(0, Math.round(n));
}

/** Nodes holding tumour, clamped to the total: those with a metastasis, or with isolated tumour cells only. */
export function involvedNodes(v) {
  if (!isMetastatic(v) && !isItc(v)) return 0;
  const total = totalNodes(v);
  const p = Math.max(0, Math.round(num(v.positiveNodes) ?? 1));
  return total > 0 ? Math.min(p, total) : p;
}

/** Positive nodes for metastatic results, clamped to the total; 0 otherwise (isolated tumour cells included). */
export function positiveNodes(v) {
  return isMetastatic(v) ? involvedNodes(v) : 0;
}

/** "(0/1)" / "(2/14)"; with isolated tumour cells only, the nodes holding them ("ISOLATED TUMOUR CELLS ONLY (1/2)"). */
export const countPhrase = (v) => `(${involvedNodes(v)}/${totalNodes(v)})`;

const procedureWord = (v) => (v.procedure || 'Excision').toLowerCase();
// A site copied from the request can name the procedure already ("left neck dissection, levels I-IV");
// the word is then not said twice.
const procedureAfter = (v, site) => { const w = procedureWord(v); return new RegExp(`\\b${w}\\b`, 'i').test(site || '') ? '' : w; };
const nodeNoun = (v, upper = false) => {
  const s = totalNodes(v) === 1 ? 'lymph node' : 'lymph nodes';
  return upper ? s.toUpperCase() : s;
};

/** "Lymph node, right SLN2, excision" — the phrase used in the SPECIMENS block. */
export function specimenName(part) {
  const v = part.values;
  const site = lcSite(v.specimenName);
  return [uc1(nodeNoun(v)), site, procedureAfter(v, site)].filter(Boolean).join(', ');
}

// ---------- macroscopic description ----------

function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 1));
const receivedCount = (v) => Math.max(0, Math.round(num(v.nodesReceived) ?? 1));

export function macro(part, ctx) {
  if (ctx.options.macro === false) return '';
  const v = part.values;
  const n = receivedCount(v);
  const largest = sizePhrase(v.largestNode);
  const blocks = blockCount(v);
  const blockSentence = blocks === 1 ? 'All embedded in 1 block.' : `All embedded in ${blocks} blocks.`;
  let s;
  if (v.tissue === 'Lymph node(s) only') {
    if (n <= 1) {
      const handling = blocks === 1 ? 'bisected and all embedded in 1 block' : `serially sliced and all embedded in ${blocks} blocks`;
      s = `Received in formalin is a lymph node${largest ? ` measuring ${largest}` : ''}, ${handling}.`;
    } else {
      s = `Received in formalin are ${word(n)} lymph nodes${largest ? `, the largest measuring ${largest}` : ''}. ${blockSentence}`;
    }
  } else {
    const size = sizePhrase(v.tissueSize);
    const nodes = n === 0 ? 'no discrete lymph node'
      : n === 1 ? `one lymph node${largest ? ` measuring ${largest}` : ''}`
        : `${word(n)} lymph nodes${largest ? `, the largest ${largest}` : ''}`;
    s = `Received in formalin is a piece of fibroadipose tissue${size ? ` measuring ${size}` : ''} containing ${nodes}. ${blockSentence}`;
  }
  return `(${part.label}) ${s}`;
}

/** "(1) Lymph node, bisected." / "(1) Lymph nodes 1-2. (2) Lymph nodes 3-4." */
export function blockKey(part, ctx) {
  if (ctx.options.macro === false) return '';
  const v = part.values;
  const override = stripDot(v.blockKeyText);
  if (override) return `(${part.label}) ${override}.`;
  const n = receivedCount(v);
  const blocks = blockCount(v);
  const items = [];
  if (n <= 1) {
    if (blocks === 1) items.push(n === 0 ? 'Fibroadipose tissue, all embedded' : 'Lymph node, bisected');
    else for (let i = 1; i <= blocks; i++) items.push(n === 0 ? `Fibroadipose tissue, portion ${i}` : `Lymph node, slice ${i}`);
  } else if (blocks >= n) {
    for (let i = 1; i <= blocks; i++) items.push(i <= n ? `Lymph node ${i}` : `Lymph node ${n}, further slice`);
  } else {
    const per = Math.ceil(n / blocks);
    let from = 1;
    for (let i = 1; i <= blocks; i++) {
      const to = Math.min(n, from + per - 1);
      if (from > n) break;
      items.push(from === to ? `Lymph node ${from}` : `Lymph nodes ${from}-${to}`);
      from = to + 1;
    }
  }
  return `(${part.label}) ${items.map((t, i) => `(${i + 1}) ${t}.`).join(' ')}`;
}

// ---------- microscopy ----------

const IHC_NAMES = {
  MNF116: 'pancytokeratin MNF116',
  'AE1/AE3': 'pancytokeratin AE1/AE3',
  CK7: 'CK7',
  'TTF-1': 'TTF-1',
  GATA3: 'GATA3',
  'S100/SOX10/Melan-A': 'S100, SOX10 and Melan-A'
};
const ihcList = (v) => (Array.isArray(v.ihc) ? v.ihc : []).filter((x) => x && x !== 'None' && x !== 'Other').map((x) => IHC_NAMES[x] || x);
const hasIhc = (v) => (Array.isArray(v.ihc) ? v.ihc : []).some((x) => x && x !== 'None');

function ihcSentence(v) {
  const custom = stripDot(v.ihcResult);
  if (custom) return `${uc1(custom)}.`;
  if (!hasIhc(v)) return '';
  const names = ihcList(v);
  const stains = names.length ? `immunostain${names.length > 1 ? 's' : ''} for ${listJoin(names)}` : 'immunostains';
  if (isMetastatic(v) || isItc(v)) return `The tumour cells are highlighted by ${stains}.`;
  return `No suspicious cells are identified on ${stains}.`;
}

const tumourNoun = (v) => {
  const t = stripDot(v.tumourType);
  if (v.result === 'Other metastatic tumour') return t ? `metastatic ${t.charAt(0).toLowerCase()}${t.slice(1)}` : 'metastatic tumour';
  return v.result === 'Metastatic malignant melanoma' ? 'metastatic malignant melanoma' : 'metastatic carcinoma';
};

/** "8 mm" from "8"; a typed unit is kept ("0.8 cm"). */
const depositText = (v) => {
  const dep = String(v.largestDeposit || '').trim();
  return dep ? (/mm|cm/i.test(dep) ? dep : `${dep} mm`) : '';
};

function eneSentence(v) {
  if (v.extranodal === 'Present') {
    const ext = eneExtent(v);
    return `Extranodal extension is present${ext ? `, extending ${ext.toLowerCase()} beyond the lymph node capsule` : ''}.`;
  }
  if (v.extranodal === 'Cannot be determined') return 'Extranodal extension cannot be determined.';
  return 'There is no extranodal extension.';
}

/** Response of a metastasis or of isolated tumour cells to presurgical therapy (Breast criteria). */
function treatmentSentence(v) {
  if (!isMetastatic(v) && !isItc(v)) return '';
  const t = treatmentEffect(v);
  if (t === TREATMENT.response) return 'There is evidence of response to presurgical therapy.';
  if (t === TREATMENT.noResponse) return 'There is no definite evidence of response to presurgical therapy.';
  return '';
}

export function microscopy(part) {
  const v = part.values;
  const total = totalNodes(v);
  const fat = v.tissue !== 'Lymph node(s) only';
  const lead = fat ? 'Sections show fibroadipose tissue and ' : 'Sections show ';
  const sentences = [];

  if (isNegative(v)) {
    const adj = v.result === 'Negative - unremarkable' ? '' : 'reactive ';
    if (total === 0) sentences.push(`${fat ? 'Sections show fibroadipose tissue' : 'Sections show fibrous tissue'} with no lymph node identified.`);
    else if (scarred(v)) {
      sentences.push(`${lead}${word(total)} ${nodeNoun(v)}.`);
      sentences.push('There is fibrous scarring in keeping with treatment effect, with no residual metastatic carcinoma.');
    } else {
      sentences.push(`${lead}${word(total)} ${adj}${nodeNoun(v)}${adj ? '' : ' with preserved architecture'}.`);
      if (treatmentEffect(v) === TREATMENT.noScarring) sentences.push('No fibrous scarring or histiocytic aggregates are seen.');
    }
    const ihc = ihcSentence(v);
    if (ihc) sentences.push(ihc);
    if (!(scarred(v) && total > 0)) sentences.push('There is no evidence of malignancy.');
  } else if (isGranulomatous(v)) {
    const gran = v.granulomaType === 'Necrotising'
      ? 'necrotising epithelioid granulomas with central necrosis'
      : 'non-necrotising epithelioid granulomas';
    sentences.push(`${lead}${word(total)} ${nodeNoun(v)} containing ${gran}.`);
    if (v.specialStains === 'ZN and GMS negative') sentences.push('Ziehl-Neelsen and Grocott stains are negative for acid-fast bacilli and fungal organisms.');
    const ihc = ihcSentence(v);
    if (ihc) sentences.push(ihc);
    sentences.push('There is no evidence of malignancy.');
  } else if (isMetastatic(v)) {
    const pos = positiveNodes(v);
    const dep = depositText(v);
    const cat = metCategory(v).toLowerCase();
    const depText = dep ? `, the largest deposit measuring ${dep}${cat ? ` (${cat})` : ''}` : '';
    const loc = location(v);
    sentences.push(`${lead}${word(total)} ${nodeNoun(v)}.`);
    const involved = pos === total
      ? (total === 1 ? 'The lymph node is' : `All ${word(total)} lymph nodes are`)
      : `${uc1(word(pos))} of the lymph nodes ${pos === 1 ? 'is' : 'are'}`;
    sentences.push(`${involved} involved by ${tumourNoun(v)}${cat && !dep ? ` (${cat})` : ''}${loc ? loc[0] : ''}${depText}.`);
    const tx = treatmentSentence(v);
    if (tx) sentences.push(tx);
    sentences.push(eneSentence(v));
    const ihc = ihcSentence(v);
    if (ihc) sentences.push(ihc);
    const rest = total - pos;
    if (rest > 0) sentences.push(`The remaining ${word(rest)} lymph node${rest === 1 ? ' is' : 's are'} reactive.`);
  } else if (isItc(v)) {
    const pos = involvedNodes(v);
    const dep = depositText(v);
    sentences.push(`${lead}${word(total)} ${nodeNoun(v)}.`);
    const holds = pos === total
      ? (total === 1 ? 'The lymph node contains' : `All ${word(total)} lymph nodes contain`)
      : `${uc1(word(pos))} of the lymph nodes ${pos === 1 ? 'contains' : 'contain'}`;
    sentences.push(`${holds} isolated tumour cells${dep ? `, the largest cluster measuring ${dep}` : ''}.`);
    const tx = treatmentSentence(v);
    if (tx) sentences.push(tx);
    const ihc = ihcSentence(v);
    if (ihc) sentences.push(ihc);
    const rest = total - pos;
    if (rest > 0) sentences.push(`The remaining ${word(rest)} lymph node${rest === 1 ? ' is' : 's are'} reactive.`);
  } else if (isLymphoma(v)) {
    sentences.push(`${lead}${word(total)} ${nodeNoun(v)} with effaced architecture replaced by an atypical lymphoid infiltrate. See comment.`);
    const ihc = ihcSentence(v);
    if (ihc) sentences.push(ihc);
  }

  const notes = stripDot(v.additionalNotes);
  if (notes) sentences.push(`${uc1(notes)}.`);
  return `(${part.label}) ${sentences.join(' ')}`;
}

// ---------- diagnosis ----------

function organPhrase(part) {
  const v = part.values;
  const site = lcSite(v.specimenName);
  return [nodeNoun(v, true), site, procedureAfter(v, site)].filter(Boolean).join(', ');
}

export function diagnosis(part) {
  const v = part.values;
  const count = countPhrase(v);
  let text;
  if (isNegative(v)) {
    text = scarred(v) && totalNodes(v) > 0
      ? `NO RESIDUAL METASTATIC CARCINOMA ${count}; fibrous scarring in keeping with treatment effect`
      : `NO EVIDENCE OF MALIGNANCY ${count}`;
  } else if (isItc(v)) {
    text = `ISOLATED TUMOUR CELLS ONLY ${count}${responded(v) ? '; treatment effect present' : ''}`;
  } else if (isGranulomatous(v)) {
    const qual = v.granulomaType === 'Necrotising' ? ', necrotising' : '';
    text = `GRANULOMATOUS INFLAMMATION${qual}; no evidence of malignancy ${count}`;
  } else if (isMetastatic(v)) {
    const clauses = [`${tumourNoun(v).toUpperCase()} ${count}`];
    const dep = depositText(v);
    const cat = metCategory(v).toLowerCase();
    if (dep) clauses.push(`largest deposit ${dep}${cat ? ` (${cat})` : ''}`);
    else if (cat) clauses.push(cat);
    const loc = location(v);
    if (loc) clauses.push(loc[1]);
    const ext = eneExtent(v);
    clauses.push(v.extranodal === 'Present' ? `extranodal extension present${ext ? ` (${ext.toLowerCase()})` : ''}`
      : v.extranodal === 'Cannot be determined' ? 'extranodal extension cannot be determined' : 'no extranodal extension');
    if (responded(v)) clauses.push('treatment effect present');
    const t = stripDot(v.tumourType);
    if (t && v.result !== 'Other metastatic tumour') clauses.push(t.charAt(0).toLowerCase() + t.slice(1));
    text = clauses.join('; ');
  } else {
    text = 'LYMPHOMA; see comment';
  }
  return `(${part.label}) ${organPhrase(part)} - ${text}`;
}

// ---------- checks ----------

const fmtMm = (n) => String(Math.round(n * 100) / 100);

/** Checks for the staging criteria; with the criteria "Not applied" nothing fires. */
export function validate(part) {
  const v = part.values;
  const { out, at, warn } = checks();
  const info = (m, field) => at('info', m, field);
  const mm = depositMm(v);
  if (isBreast(v)) {
    if (v.result === 'Metastatic malignant melanoma') warn('Staging criteria Breast with a melanoma result: change the criteria to Melanoma, or the result.', 'criteria');
    if (v.result === 'Metastatic carcinoma') {
      const chosen = v.metCategory;
      if (chosen === 'Macrometastasis' && mm !== null && mm <= 2) warn(`Macrometastasis with a largest deposit of ${fmtMm(mm)} mm: a macrometastasis is more than 2 mm.`, 'metCategory');
      if (chosen === 'Micrometastasis' && mm !== null && mm > 2) warn(`Micrometastasis with a largest deposit of ${fmtMm(mm)} mm: a micrometastasis is more than 0.2 mm and up to 2 mm.`, 'metCategory');
      if (chosen === 'Micrometastasis' && mm !== null && mm <= 0.2) info(`Micrometastasis with a largest deposit of ${fmtMm(mm)} mm: right only for more than 200 cells in a single cross-section.`, 'metCategory');
      if (!chosen && mm !== null && mm <= 0.2) warn(`Largest deposit ${fmtMm(mm)} mm: choose the result "Isolated tumour cells", or the size category Micrometastasis for more than 200 cells in a single cross-section.`, 'metCategory');
      if (!chosen && mm === null) info('Record the largest deposit (mm) or choose the size category: the report names the category from either.', 'largestDeposit');
      if (v.extranodal === 'Present' && !eneExtent(v)) info('Extranodal extension present: choose the extent beyond the capsule (2 mm or less, or more than 2 mm).', 'eneExtent');
    }
    if (isItc(v)) {
      if (mm !== null && mm > 0.2) warn(`Isolated tumour cells with a largest cluster of ${fmtMm(mm)} mm: isolated tumour cells measure 0.2 mm or less, so this is a metastasis.`, 'largestDeposit');
      info('Isolated tumour cells only: pN0(i+); the node counts as examined, not as positive.', 'result');
    }
    const t = treatmentEffect(v);
    if ((t === TREATMENT.scarring || t === TREATMENT.noScarring) && (v.result === 'Metastatic carcinoma' || isItc(v))) warn('The presurgical therapy answer says no metastasis but the result has tumour: change one of them.', 'treatmentEffect');
    if ((t === TREATMENT.response || t === TREATMENT.noResponse) && isNegative(v)) warn('The presurgical therapy answer describes a metastasis but the result is negative: change one of them.', 'treatmentEffect');
  }
  if (isMelanomaCriteria(v)) {
    if (v.result === 'Metastatic carcinoma') warn('Staging criteria Melanoma with a carcinoma result: change the criteria, or the result.', 'criteria');
    if (isItc(v)) warn('Melanoma has no isolated tumour cell category: any tumour cells make the node positive. Choose the result "Metastatic malignant melanoma".', 'result');
    if (v.result === 'Metastatic malignant melanoma') {
      if (mm === null) info('Record the largest discrete deposit (mm), to the nearest 0.1 mm.', 'largestDeposit');
      if (!location(v)) info('Choose the location of the deposits: subcapsular, intraparenchymal or both.', 'location');
    }
  }
  if (isVulvaCriteria(v)) {
    if (v.result === 'Metastatic malignant melanoma') warn('Staging criteria Vulval carcinoma with a melanoma result: change the criteria to Melanoma, or the result.', 'criteria');
    if (v.result === 'Metastatic carcinoma') {
      if (mm !== null && mm <= 0.2) warn(`Largest deposit ${fmtMm(mm)} mm: 0.2 mm or less is isolated tumour cells, pN0(i+) (AJCC 9th edition). Choose the result "Isolated tumour cells".`, 'largestDeposit');
      if (mm === null) info('Record the largest deposit (mm): the vulval pN category depends on its size.', 'largestDeposit');
    }
    if (isItc(v) && mm !== null && mm > 0.2) warn(`Isolated tumour cells with a largest cluster of ${fmtMm(mm)} mm: isolated tumour cells measure 0.2 mm or less, so this is a metastasis.`, 'largestDeposit');
    const cat = vulvaCategory(v);
    if (cat) info(`This node alone: ${cat} (AJCC 9th edition). The case pN is staged on the Vulval carcinoma resection form, from all the regional nodes.`, 'result');
  }
  return out;
}

/** Structured node summary emitted to src/reconcile.js for multi-part cancer staging reconciliation. */
export function contribution(part) {
  const v = part?.values || {};
  const total = num(v.nodesTotal) ?? num(v.nodesReceived) ?? 0;
  const examined = Number.isFinite(total) && total > 0 ? Math.round(total) : 0;
  const rawPos = num(v.positiveNodes);
  const positive = isMetastatic(v) ? Math.round(rawPos !== null && rawPos >= 0 ? rawPos : (examined > 0 ? 1 : 0)) : 0;
  const itc = isItc(v) ? Math.round(rawPos !== null && rawPos >= 0 ? rawPos : (examined > 0 ? 1 : 0)) : 0;
  const mm = depositMm(v);
  let macro = 0;
  let micro = 0;
  if (positive > 0) {
    const cat = v.metCategory || (mm !== null && mm > 0.2 && mm <= 2 ? 'Micrometastasis' : mm !== null && mm > 2 ? 'Macrometastasis' : '');
    if (cat === 'Micrometastasis') micro = positive;
    else macro = positive;
  }
  const ene = v.extranodal === 'Present' ? 'Present'
    : v.extranodal === 'Absent' ? 'Not identified'
      : v.extranodal === 'Cannot be determined' ? 'Cannot be determined' : '';
  const site = String(v.specimenName || '').trim();
  const sentinel = v.procedure === 'Sentinel lymph node biopsy' || /\b(sln\d*|sentinel)\b/i.test(site);
  return {
    kind: 'nodes',
    partLabel: part?.label || '',
    site,
    procedure: v.procedure || '',
    sentinel,
    examined,
    positive,
    macro,
    micro,
    itc,
    depositMm: mm,
    ene,
    result: v.result || ''
  };
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, validate, contribution };
