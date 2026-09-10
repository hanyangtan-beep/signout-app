// Tonsils / adenoids generator. Pure functions: (part, ctx) -> string.
// Benign resection template (Phase 4b, roadmap item 19). Blocks:
//   macro      "(A) Received in formalin are two tonsils labelled left and right. The left tonsil measures 2.5 x 2 x 1.5 cm and weighs 4 g; ... Representative sections in 2 blocks."
//   blockKey   "(A) (1) Left tonsil. (2) Right tonsil."
//   microscopy "(A) Sections of the tonsils show reactive lymphoid follicles with germinal centres. The surface is covered by benign squamous epithelium. ..."
//   diagnosis  "(A) TONSILS, bilateral, tonsillectomy - REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA WITH CHRONIC TONSILLITIS; actinomyces colonies present; no evidence of malignancy"
// Squamous cell carcinoma gives a short capitalised line only; the synoptic report belongs to
// the QMH head and neck cancer template (the schema's auto snippet says so in the COMMENT block).
// The asymmetric-tonsil flag (atypical lymphoid infiltrate) auto-ticks the lymphoma / p16 / EBER comment.
// Wording is protected by tests/tonsil.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));

export const BILATERAL = 'Bilateral tonsils, tonsillectomy';
export const LEFT = 'Left tonsil, tonsillectomy';
export const RIGHT = 'Right tonsil, tonsillectomy';
export const ADENOIDS = 'Adenoids, adenoidectomy';
export const BIOPSY = 'Tonsil, biopsy';

export const NEGATIVE = 'No evidence of dysplasia or malignancy';
export const SCC = 'Squamous cell carcinoma - see comment (QMH head and neck template)';
export const ATYPICAL = 'Present - see comment';

export const hasNeoplasm = (v) => !!v.neoplasia && v.neoplasia !== NEGATIVE;
const isAtypical = (v) => v.atypicalInfiltrate === ATYPICAL;

/** Specimen type from the select; unknown / blank values fall back to bilateral tonsils. */
export function specimenType(v) {
  const s = String(v.specimenName || '').trim();
  if ([LEFT, RIGHT, ADENOIDS, BIOPSY].includes(s)) return s;
  return BILATERAL;
}

/** Free-text size: "2.5x2x1.5" -> "2.5 x 2 x 1.5 cm"; "12 mm" unchanged. */
function sizeText(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

/** "right tonsil" from the biopsy site field (lower-cased, trailing punctuation dropped). */
function biopsySite(v) {
  const s = String(v.biopsySite || '').trim().replace(/[.,;\s]+$/, '');
  if (!s) return '';
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** "Bilateral tonsils, tonsillectomy" / "Tonsil, right tonsil, biopsy". */
export function specimenName(part) {
  const v = part.values;
  const type = specimenType(v);
  if (type === BIOPSY) {
    const site = biopsySite(v);
    return site ? `Tonsil, ${site}, biopsy` : 'Tonsil, biopsy';
  }
  return type;
}

/** "TONSILS, bilateral, tonsillectomy" / "LEFT TONSIL, tonsillectomy" / "ADENOIDS, adenoidectomy" / "TONSIL, right tonsil, biopsy". */
export function organPhrase(part) {
  const v = part.values;
  switch (specimenType(v)) {
    case LEFT: return 'LEFT TONSIL, tonsillectomy';
    case RIGHT: return 'RIGHT TONSIL, tonsillectomy';
    case ADENOIDS: return 'ADENOIDS, adenoidectomy';
    case BIOPSY: {
      const site = biopsySite(v);
      return site ? `TONSIL, ${site}, biopsy` : 'TONSIL, biopsy';
    }
    default: return 'TONSILS, bilateral, tonsillectomy';
  }
}

// ---------- macroscopic description ----------

/** "measures 2.5 x 2 x 1.5 cm and weighs 4 g" (either clause may be absent; '' when both blank). */
function measureWeigh(sizeRaw, weightRaw, verbs = ['measures', 'weighs']) {
  const size = sizeText(sizeRaw);
  const w = num(weightRaw);
  const bits = [];
  if (size) bits.push(`${verbs[0]} ${size}`);
  if (w !== null) bits.push(`${verbs[1]} ${fmt(w)} g`);
  return bits.join(' and ');
}

function surfaceSentence(v, plural) {
  const surf = plural ? 'The surfaces are' : 'The surface is';
  const cut = plural ? 'the cut surfaces are' : 'the cut surface is';
  const cutWord = {
    Unremarkable: 'unremarkable',
    Fibrotic: 'fibrotic',
    Nodular: 'nodular',
    Haemorrhagic: 'haemorrhagic'
  }[v.cutSurface];
  let surfWord;
  switch (v.surface) {
    case 'Unremarkable': surfWord = 'unremarkable'; break;
    case 'Ulcerated': surfWord = 'ulcerated'; break;
    case 'Asymmetric - larger side': surfWord = plural ? `asymmetric, the ${String(v.largerSide || 'left').toLowerCase()} being the larger` : 'cryptic'; break;
    case 'Cryptic with debris': surfWord = 'cryptic'; break;
    default: surfWord = '';
  }
  const out = [];
  if (surfWord && cutWord) out.push(`${surf} ${surfWord} and ${cut} ${cutWord}.`);
  else if (surfWord) out.push(`${surf} ${surfWord}.`);
  else if (cutWord) out.push(`${cut.charAt(0).toUpperCase()}${cut.slice(1)} ${cutWord}.`);
  if (v.cutSurface === 'Mass - describe') {
    const desc = String(v.cutSurfaceMass || '').trim().replace(/\.$/, '');
    out.push(desc ? `On sectioning there is a mass: ${desc}.` : 'On sectioning there is a mass.');
  }
  return out;
}

function blockCount(v, fallback = 2) {
  return Math.max(1, Math.round(num(v.blocks) ?? fallback));
}
const blockNoun = (n) => (n === 1 ? 'block' : 'blocks');

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const type = specimenType(v);
  const s = [];
  const blocks = blockCount(v);

  if (type === BILATERAL) {
    s.push('Received in formalin are two tonsils labelled left and right.');
    const left = measureWeigh(v.leftSize, v.leftWeight);
    const right = measureWeigh(v.rightSize, v.rightWeight);
    if (left && right) s.push(`The left tonsil ${left}; the right tonsil ${right}.`);
    else if (left) s.push(`The left tonsil ${left}.`);
    else if (right) s.push(`The right tonsil ${right}.`);
    s.push(...surfaceSentence(v, true));
    s.push(`Representative sections in ${blocks} ${blockNoun(blocks)}.`);
  } else if (type === LEFT || type === RIGHT) {
    const side = type === LEFT ? 'left' : 'right';
    const m = measureWeigh(type === LEFT ? v.leftSize : v.rightSize, type === LEFT ? v.leftWeight : v.rightWeight, ['measuring', 'weighing']);
    s.push(`Received in formalin is a ${side} tonsil${m ? ` ${m}` : ''}.`);
    s.push(...surfaceSentence(v, false));
    s.push(`Representative sections in ${blocks} ${blockNoun(blocks)}.`);
  } else if (type === ADENOIDS) {
    const size = sizeText(v.aggregateSize);
    const w = num(v.aggregateWeight);
    const bits = [];
    if (size) bits.push(`measuring ${size} in aggregate`);
    if (w !== null) bits.push(`weighing ${fmt(w)} g`);
    s.push(`Received in formalin are multiple fragments of adenoid tissue${bits.length ? ` ${bits.join(' and ')}` : ''}.`);
    if (v.surface === 'Ulcerated') s.push('The surface is focally ulcerated.');
    if (v.cutSurface === 'Mass - describe') s.push(...surfaceSentence({ ...v, surface: '', cutSurface: 'Mass - describe' }, true));
    s.push(`All embedded in ${blocks} ${blockNoun(blocks)}.`);
  } else {
    const size = sizeText(v.aggregateSize);
    s.push(`Received in formalin is a piece of tissue${size ? ` measuring ${size}` : ''}.`);
    s.push(`All embedded in ${blocks} ${blockNoun(blocks)}.`);
  }
  return `(${part.label}) ${s.join(' ')}`;
}

/** "(1)" or "(1-2)" for a block range. */
const range = (from, to) => (from === to ? `(${from})` : `(${from}-${to})`);

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const type = specimenType(v);
  const blocks = blockCount(v);
  let key;
  if (type === BILATERAL) {
    const leftN = Math.max(1, Math.ceil(blocks / 2));
    const rightN = Math.max(1, blocks - leftN);
    key = `${range(1, leftN)} Left tonsil. ${range(leftN + 1, leftN + rightN)} Right tonsil.`;
  } else if (type === LEFT) key = `${range(1, blocks)} Left tonsil.`;
  else if (type === RIGHT) key = `${range(1, blocks)} Right tonsil.`;
  else if (type === ADENOIDS) key = `${range(1, blocks)} Adenoids, all embedded.`;
  else key = `${range(1, blocks)} Tonsil biopsy, all embedded.`;
  return `(${part.label}) ${key}`;
}

// ---------- microscopy ----------

function subject(type) {
  if (type === BILATERAL) return 'Sections of the tonsils';
  if (type === ADENOIDS) return 'Sections of the adenoids';
  return 'Sections of the tonsil';
}

export function microscopy(part) {
  const v = part.values;
  const type = specimenType(v);
  const s = [];
  if (v.lymphoidHyperplasia === 'Unremarkable lymphoid tissue') s.push(`${subject(type)} show unremarkable lymphoid tissue.`);
  else s.push(`${subject(type)} show reactive lymphoid follicles with germinal centres.`);

  if (v.epithelium === 'Benign respiratory (adenoids)') s.push('The surface is covered by benign respiratory epithelium.');
  else if (v.epithelium === 'Ulcerated') s.push('The surface epithelium is ulcerated with granulation tissue.');
  else if (v.epithelium) s.push('The surface is covered by benign squamous epithelium.');

  if (v.cryptitis === 'Present') s.push('The crypts contain keratinous debris and neutrophils, in keeping with cryptitis.');
  if (v.actinomyces === 'Present') s.push('A few colonies of actinomyces are noted on the surface.');
  if (v.fibrosis === 'Present') s.push(type === ADENOIDS ? 'There is stromal fibrosis.' : 'There is stromal fibrosis, in keeping with chronic tonsillitis.');
  if (isAtypical(v)) s.push('In addition, there is an atypical lymphoid infiltrate (see comment).');
  if (hasNeoplasm(v)) s.push('In addition, there is an invasive squamous cell carcinoma (see comment).');
  else if (!isAtypical(v)) s.push('There is no evidence of dysplasia or malignancy.');
  const notes = String(v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

/** Main entity in capitals. */
function mainClause(v, type) {
  const chronic = v.cryptitis === 'Present' || v.fibrosis === 'Present';
  const reactive = v.lymphoidHyperplasia !== 'Unremarkable lymphoid tissue';
  if (type === BIOPSY) return reactive ? 'REACTIVE LYMPHOID HYPERPLASIA' : '';
  if (type === ADENOIDS) return reactive ? 'REACTIVE LYMPHOID HYPERPLASIA' : 'UNREMARKABLE LYMPHOID TISSUE';
  if (reactive) return chronic ? 'REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA WITH CHRONIC TONSILLITIS' : 'REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA';
  return chronic ? 'CHRONIC TONSILLITIS' : 'UNREMARKABLE LYMPHOID TISSUE';
}

export function diagnosis(part) {
  const v = part.values;
  const type = specimenType(v);
  const clauses = [];
  if (hasNeoplasm(v)) {
    clauses.push('SQUAMOUS CELL CARCINOMA');
    const main = mainClause(v, type);
    if (main) clauses.push(main.toLowerCase());
    if (v.actinomyces === 'Present') clauses.push('actinomyces colonies present');
    clauses.push('see comment');
  } else if (isAtypical(v)) {
    const main = mainClause(v, type);
    if (main) clauses.push(main);
    clauses.push('ATYPICAL LYMPHOID INFILTRATE - SEE COMMENT');
    if (v.actinomyces === 'Present') clauses.push('actinomyces colonies present');
  } else if (type === BIOPSY) {
    // House form: "TONSIL, right tonsil, biopsy - NO EVIDENCE OF MALIGNANCY" (hyperplasia stays in the microscopy).
    clauses.push('NO EVIDENCE OF MALIGNANCY');
    if (v.actinomyces === 'Present') clauses.push('actinomyces colonies present');
    if (v.epithelium === 'Ulcerated') clauses.push('surface ulceration');
  } else {
    clauses.push(mainClause(v, type));
    if (v.actinomyces === 'Present') clauses.push('actinomyces colonies present');
    if (v.epithelium === 'Ulcerated') clauses.push('surface ulceration');
    clauses.push('no evidence of malignancy');
  }
  return `(${part.label}) ${organPhrase(part)} - ${clauses.filter(Boolean).join('; ')}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
