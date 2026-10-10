import { stripDot, checks } from './_house.js';
import { readBreastMargin } from '../src/intake.js';
// Breast benign excision and cavity shave margins generator. Pure functions: (part, ctx) -> string.
// Each part is either a cavity shave margin (side + margin name) or a breast lesion excision
// (side + site text + procedure), so a WLE case can carry the lesion and up to seven shaves.
// Blocks produced:
//   specimenName "Right breast superior margin, resection" / "Breast, L3H breast mass, excision"
//   macro        "(A) Received in formalin is a piece of fibrofatty breast tissue measuring 4 x 3 x 1 cm. A suture
//                 marks the new margin, which is inked black. No discrete lesion is seen on sectioning. Serially
//                 sliced perpendicular to the new margin and all embedded in 4 blocks."
//   blockKey     "(A) (1-4) Serial slices, all embedded, new margin inked black."
//                "(C) (1-3) Lesion with closest margin. (4) Background breast."
//   microscopy   "(A) Sections show hyalinised fibroadipose tissue, as well as breast ducts and lobules, without
//                 architectural distortion. ... There is no evidence of atypical hyperplasia, in-situ or invasive carcinoma."
//   diagnosis    "(A) RIGHT BREAST, superior margin, resection - NO EVIDENCE OF MALIGNANCY"
//                "(B) RIGHT BREAST, inferior margin, resection - FAT NECROSIS; no evidence of malignancy"
//                "(C) BREAST, L3H breast mass, excision - INTRADUCTAL PAPILLOMA with usual-type ductal hyperplasia; margins clear"
// Atypia / DCIS / invasive options give a short diagnosis line only; the schema snippet
// `breast_cancer_template` adds the comment pointing to the QMH breast cancer template.
// Wording is protected by tests/breastbenign.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');

export const NEGATIVE = 'No evidence of malignancy (benign breast tissue)';
const FEA = 'Flat epithelial atypia – see comment';
const ADH = 'Atypical ductal hyperplasia – see comment';
const DCIS = 'DCIS – see comment';
const INVASIVE = 'Invasive carcinoma – see comment';
/** Options that leave the benign pathway: short capitalised line + QMH cancer template comment. */
export const ATYPIA = [FEA, ADH, DCIS, INVASIVE];
/** Accept the en-dash or a plain hyphen in the stored value. */
const norm = (s) => String(s || '').replace(/\s*[\u2013\u2014-]\s*see comment$/, ' – see comment');

export const isShave = (v) => (v.partType || 'Cavity shave margin') !== 'Breast lesion excision';
export const isNegative = (v) => !v.result || v.result === NEGATIVE;
export const isAtypia = (v) => ATYPIA.includes(norm(v.result));
export const isFibroadenoma = (v) => v.result === 'Fibroadenoma';

// ---------- naming ----------

/** "superior" / "superolateral" (the typed name for Other); '' when unknown. */
export function marginName(v) {
  const m = v.margin || 'Superior';
  if (m === 'Other') return lc1(stripDot(v.marginOther));
  return m.toLowerCase();
}

// A blank side is not stated: the form never assumes one (user, 2026-10-10).
const sideWord = (v) => {
  const s = String(v.side || '').trim();
  return s === 'Not stated' || !s ? '' : s.toLowerCase();
};
const procedureWord = (v) => (v.procedure || 'Excision').toLowerCase();

/** "Right breast superior margin, resection" / "Breast, L3H breast mass, excision" — the SPECIMENS phrase. */
export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return typed;
  if (isShave(v)) {
    const m = marginName(v);
    const head = uc1([sideWord(v), 'breast', m ? `${m} margin` : ''].filter(Boolean).join(' '));
    return `${head}, resection`;
  }
  const site = stripDot(v.site);
  if (site) return `Breast, ${site}, ${procedureWord(v)}`;
  return `${uc1([sideWord(v), 'breast'].filter(Boolean).join(' '))}, ${procedureWord(v)}`;
}

/** "RIGHT BREAST, superior margin, resection" / "BREAST, L3H breast mass, excision" — the diagnosis organ phrase. */
export function organPhrase(v) {
  if (isShave(v)) {
    const m = marginName(v);
    const organ = [sideWord(v), 'breast'].filter(Boolean).join(' ').toUpperCase();
    return [organ, m ? `${m} margin` : '', 'resection'].filter(Boolean).join(', ');
  }
  const site = stripDot(v.site);
  if (site) return `BREAST, ${site}, ${procedureWord(v)}`;
  return `${[sideWord(v), 'breast'].filter(Boolean).join(' ').toUpperCase()}, ${procedureWord(v)}`;
}

// ---------- the specimen as received ----------

// The side and margin follow the line as received ("Breast, left superior margin"): Build parts fills
// them from the paste (src/intake.js presetValues), typing the line fills them here, and the checks flag
// a field that disagrees with the line, so a form default never prints as the specimen's side (user,
// 2026-10-10: a left superior margin kept the form's right / superior). One reader serves all three.
const LESION_WORDS = /\b(?:mass(?:es)?|lesions?|lumps?|tumou?rs?|nodules?|fibroadenomas?|papillomas?|WLE|wide\s+local\s+excision|lumpectomy)\b/i;

/**
 * Generator `derive` hook (src/engine.js applyDerived): typing the specimen as received sets the part
 * type, side and margin it names. A field the line does not name keeps its value.
 */
export function derive(values, changedId) {
  if (changedId !== 'specimenName') return {};
  const text = String(values?.specimenName || '');
  const m = readBreastMargin(text);
  const patch = {};
  if (m.side) patch.side = m.side;
  if (m.margin) {
    patch.partType = 'Cavity shave margin';
    if (m.name) { patch.margin = m.name; patch.marginOther = m.name === 'Other' ? m.other : ''; }
  } else if (LESION_WORDS.test(text)) patch.partType = 'Breast lesion excision';
  return patch;
}

/** Checks: the side and margin agree with the specimen as received, and a shave margin names both. */
export function validate(part) {
  const v = part.values || {};
  const { out, warn } = checks();
  const typed = stripDot(v.specimenName);
  const m = typed ? readBreastMargin(typed) : { margin: false, side: '', name: '', other: '' };
  const side = sideWord(v);
  if (m.side && m.side.toLowerCase() !== side) warn(`The specimen as received says ${m.side.toLowerCase()}: choose ${m.side} for the side.`, 'side');
  else if (isShave(v) && !side) warn(`Choose the side: the line otherwise reads ${organPhrase(v)}.`, 'side');
  if (m.margin && !isShave(v)) warn('The specimen as received is a margin: choose Cavity shave margin for the part type.', 'partType');
  if (isShave(v)) {
    if (m.name && m.name !== 'Other' && m.name !== (v.margin || 'Superior')) warn(`The specimen as received names the ${m.name.toLowerCase()} margin: choose ${m.name}.`, 'margin');
    else if (m.name === 'Other' && v.margin !== 'Other') warn(`The specimen as received names the ${m.other} margin: choose Other and type it.`, 'margin');
    else if (!marginName(v)) warn(`Name the margin: the line otherwise reads ${organPhrase(v)}.`, v.margin === 'Other' ? 'marginOther' : 'margin');
  }
  return out;
}

// ---------- macroscopic description ----------

/** "4x3x1" -> "4 x 3 x 1 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 3));
const blocksWord = (n) => (n === 1 ? '1 block' : `${n} blocks`);

function orientationSentence(v) {
  const shave = isShave(v);
  switch (v.orientation || 'Suture marks new margin') {
    case 'Suture marks new margin':
      return shave ? 'A suture marks the new margin, which is inked black.' : 'Sutures mark the orientation and the margins are inked.';
    case 'Inked':
      return shave ? 'The new margin is inked black.' : 'The margins are inked.';
    default:
      return 'The specimen is not orientated.';
  }
}

function lesionSentence(v) {
  switch (v.lesion || 'None seen') {
    case 'Firm nodule': {
      const size = sizePhrase(v.lesionSize);
      return `Sectioning shows a firm, well-circumscribed nodule${size ? ` measuring ${size}` : ''}.`;
    }
    case 'Cavity wall':
      return 'Sectioning shows a cavity wall with haemorrhagic and fibrotic tissue.';
    default:
      return 'No discrete lesion is seen on sectioning.';
  }
}

export function macro(part, ctx) {
  if (ctx.options.macro === false) return '';
  const v = part.values;
  const size = sizePhrase(v.dimensions);
  const blocks = blockCount(v);
  const s = [`Received in formalin is a piece of fibrofatty breast tissue${size ? ` measuring ${size}` : ''}.`];
  s.push(orientationSentence(v));
  s.push(lesionSentence(v));
  s.push(isShave(v)
    ? `Serially sliced perpendicular to the new margin and all embedded in ${blocksWord(blocks)}.`
    : `Representative sections in ${blocksWord(blocks)}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

/** "(1-4) Serial slices, all embedded, new margin inked black." / "(1-3) Lesion with closest margin. (4) Background breast." */
export function blockKey(part, ctx) {
  if (ctx.options.macro === false) return '';
  const v = part.values;
  const override = stripDot(v.blockKeyText);
  if (override) return `(${part.label}) ${override}.`;
  const n = blockCount(v);
  const range = (a, b) => (a === b ? `(${a})` : `(${a}-${b})`);
  let key;
  if (isShave(v)) {
    key = `${range(1, n)} Serial slices, all embedded, new margin inked black.`;
  } else if (n === 1) {
    key = '(1) Lesion with closest margin.';
  } else {
    key = `${range(1, n - 1)} Lesion with closest margin. (${n}) Background breast.`;
  }
  return `(${part.label}) ${key}`;
}

// ---------- microscopy ----------

const NEG_CLOSE = 'There is no evidence of atypical hyperplasia, in-situ or invasive carcinoma.';
const NEG_PARAGRAPH = 'Sections show hyalinised fibroadipose tissue, as well as breast ducts and lobules, without architectural distortion. They are lined by ductal epithelium and myoepithelium, without atypia.';
const FIBROADENOMA_PARAGRAPH = 'Sections show a fairly circumscribed breast lesion composed of glandular and ductal elements compressed into elongated, curvilinear spaces by a proliferation of bland spindle-shaped stromal cells, consistent with a fibroadenoma. The epithelial component shows no atypia, and no significant mitotic activity is seen in the stroma.';
const BENIGN_LINING = 'The included breast ducts and lobules are lined by ductal epithelium and myoepithelium, without atypia.';

const RESULT_MICRO = {
  'Fat necrosis': `Sections show fibroadipose tissue with fat necrosis, comprising lipid-laden macrophages, multinucleated giant cells, fibrosis and chronic inflammation. ${BENIGN_LINING}`,
  'Fibrocystic change': `Sections show breast tissue with fibrocystic change, comprising cyst formation, apocrine metaplasia, stromal fibrosis and mild adenosis. ${BENIGN_LINING}`,
  'Usual ductal hyperplasia': 'Sections show breast tissue with usual ductal hyperplasia, in which ducts are filled by a streaming proliferation of cytologically heterogeneous epithelial cells with irregular, slit-like peripheral spaces. The myoepithelial layer is intact and there is no atypia.',
  'Columnar cell change': 'Sections show breast tissue in which the terminal duct lobular units are dilated and lined by columnar epithelial cells with apical snouts, in keeping with columnar cell change. There is no atypia.',
  'Sclerosing adenosis': 'Sections show breast tissue with sclerosing adenosis, comprising a lobulocentric proliferation of compressed and distorted glands within a sclerotic stroma. The glands retain their myoepithelial layer and show no atypia.',
  'Intraductal papilloma': 'Sections show an intraductal papilloma within a dilated duct, composed of arborising fibrovascular cores lined by ductal epithelium and an intact myoepithelial layer. There is no atypia.',
  'Radial scar': 'Sections show a radial scar with a central fibroelastotic core from which entrapped, distorted ducts and lobules radiate. The ducts retain their myoepithelial layer and show no atypia.',
  [FEA]: 'Sections show breast tissue in which terminal duct lobular units are dilated and lined by one to several layers of monomorphic columnar cells with low grade cytological atypia, in keeping with flat epithelial atypia; see comment. There is no evidence of in-situ or invasive carcinoma.',
  [ADH]: 'Sections show breast tissue with a focal monomorphic proliferation of evenly spaced epithelial cells forming rigid cribriform spaces and micropapillae, limited in extent, in keeping with atypical ductal hyperplasia; see comment. There is no evidence of in-situ or invasive carcinoma.',
  [DCIS]: 'Sections show ducts expanded by a monomorphic proliferation of atypical epithelial cells with an intact myoepithelial layer, in keeping with ductal carcinoma in situ; see comment. No invasive carcinoma is identified.',
  [INVASIVE]: 'Sections show an infiltrative proliferation of malignant epithelial cells within a desmoplastic stroma, in keeping with invasive carcinoma; see comment.'
};

const SECONDARY_MICRO = {
  'Usual ductal hyperplasia': 'usual-type ductal hyperplasia',
  'Fibrocystic change': 'fibrocystic change',
  'Columnar cell change': 'columnar cell change',
  'Sclerosing adenosis': 'sclerosing adenosis',
  'Apocrine metaplasia': 'apocrine metaplasia',
  'Fat necrosis': 'fat necrosis',
  'Duct ectasia': 'duct ectasia'
};

/** Ticked secondary findings, minus "None" and minus the main result. */
export function secondaries(v) {
  const list = Array.isArray(v.secondary) ? v.secondary : [];
  return list.filter((x) => x && x !== 'None' && x !== v.result && SECONDARY_MICRO[x]);
}

function marginSentence(v) {
  if (isShave(v)) return '';
  const m = v.margins || 'Clear';
  if (/^Involved/.test(m)) {
    const which = lc1(stripDot(v.marginInvolved));
    return `The lesion extends to the ${which ? `${which} margin` : 'margin'}.`;
  }
  if (/^Close/.test(m)) return 'The lesion lies less than 1 mm from the closest margin.';
  return isFibroadenoma(v) ? '' : 'The lesion is clear of the margins.';
}

export function microscopy(part) {
  const v = part.values;
  const s = [];
  if (isNegative(v)) s.push(NEG_PARAGRAPH);
  else if (isFibroadenoma(v)) s.push(FIBROADENOMA_PARAGRAPH);
  else s.push(RESULT_MICRO[norm(v.result)] || `Sections show breast tissue with ${lc1(v.result)}.`);

  const sec = secondaries(v);
  if (sec.length) {
    const phrase = listJoin(sec.map((x) => SECONDARY_MICRO[x]));
    s.push(v.result === 'Intraductal papilloma' && sec.length === 1 && sec[0] === 'Usual ductal hyperplasia'
      ? 'The epithelium shows usual-type ductal hyperplasia.'
      : `The background breast shows ${phrase}.`);
  }
  if (v.calcification === 'Present, benign') s.push('Microcalcification is present within benign ducts and lobules.');
  else if (v.calcification === 'Present, in DCIS') s.push('Microcalcification is present within the ductal carcinoma in situ.');
  if (v.biopsySite === 'Present') s.push('Biopsy site changes with granulation tissue, haemosiderin-laden macrophages and fibrosis are present.');

  if (isFibroadenoma(v)) {
    const m = v.margins || 'Clear';
    if (isShave(v) || m === 'Clear') s.push('The features are those of a benign fibroadenoma, which appears completely excised.');
    else if (/^Involved/.test(m)) {
      const which = lc1(stripDot(v.marginInvolved));
      s.push(`The features are those of a benign fibroadenoma, which extends to the ${which ? `${which} margin` : 'margin'}.`);
    } else s.push('The features are those of a benign fibroadenoma, which lies less than 1 mm from the closest margin.');
  } else {
    const ms = marginSentence(v);
    if (ms) s.push(ms);
  }
  if (!isAtypia(v)) s.push(NEG_CLOSE);

  const notes = stripDot(v.additionalNotes);
  if (notes) s.push(`${uc1(notes)}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const RESULT_DX = {
  'Fat necrosis': 'FAT NECROSIS',
  'Fibrocystic change': 'FIBROCYSTIC CHANGE',
  'Usual ductal hyperplasia': 'USUAL DUCTAL HYPERPLASIA',
  'Columnar cell change': 'COLUMNAR CELL CHANGE',
  'Sclerosing adenosis': 'SCLEROSING ADENOSIS',
  'Intraductal papilloma': 'INTRADUCTAL PAPILLOMA',
  Fibroadenoma: 'FIBROADENOMA',
  'Radial scar': 'RADIAL SCAR',
  [FEA]: 'FLAT EPITHELIAL ATYPIA',
  [ADH]: 'ATYPICAL DUCTAL HYPERPLASIA',
  [DCIS]: 'DUCTAL CARCINOMA IN SITU',
  [INVASIVE]: 'INVASIVE CARCINOMA'
};

function marginClause(v) {
  const m = v.margins || 'Clear';
  if (/^Involved/.test(m)) {
    const which = lc1(stripDot(v.marginInvolved));
    return which ? `${which} margin involved` : 'margin involved';
  }
  if (/^Close/.test(m)) return 'close to margin (< 1 mm)';
  return isFibroadenoma(v) ? 'completely excised' : 'margins clear';
}

export function diagnosis(part) {
  const v = part.values;
  let main;
  const clauses = [];
  if (isNegative(v)) main = 'NO EVIDENCE OF MALIGNANCY';
  else main = RESULT_DX[norm(v.result)] || String(v.result).toUpperCase();

  const sec = secondaries(v);
  if (v.result === 'Intraductal papilloma' && sec[0] === 'Usual ductal hyperplasia') {
    main += ' with usual-type ductal hyperplasia';
    clauses.push(...sec.slice(1).map((x) => SECONDARY_MICRO[x]));
  } else {
    clauses.push(...sec.map((x) => SECONDARY_MICRO[x]));
  }
  if (v.calcification === 'Present, benign') clauses.push('benign microcalcification');
  else if (v.calcification === 'Present, in DCIS') clauses.push('microcalcification in DCIS');
  if (v.biopsySite === 'Present') clauses.push('biopsy site changes');

  if (!isShave(v)) clauses.push(marginClause(v));
  if (isAtypia(v)) clauses.push('see comment');
  else if (isShave(v) && !isNegative(v)) clauses.push('no evidence of malignancy');

  return `(${part.label}) ${organPhrase(v)} - ${[main, ...clauses].join('; ')}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, derive, validate };
