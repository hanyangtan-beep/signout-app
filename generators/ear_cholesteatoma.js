import { stripDot, checks } from './_house.js';
// Ear — cholesteatoma and aural polyp (benign resection). Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Ear, left cholesteatoma, resection"
//   macro      "(A) Received in formalin are fragments of tan-white tissue labelled left cholesteatoma, measuring
//               0.8 x 0.5 x 0.2 cm in aggregate. All embedded in 1 block."
//   blockKey   "(A) (1) Tissue fragments, all embedded."
//   microscopy "(A) Sections show lamellated keratinous debris and fragments of benign keratinising squamous
//               epithelium. Features are consistent with cholesteatoma. There is no evidence of dysplasia or
//               malignancy."
//   diagnosis  "(A) EAR, left cholesteatoma, resection - CHOLESTEATOMA"
//
// Benign batch 3 (docs/roadmap.md, "Haemorrhoid, cholesteatoma and hernia sac", pulled 2026-09-24). Before this
// template 35 of the 36 ear parts in the two exports landed on Generic
// (docs/case-mix/benign-resections-2021-2026.md). House phrasing, from aggregate counts only (no case text is
// kept here): the diagnosis line opens EAR in 25 of the 36; "Features are consistent with cholesteatoma." is the
// commonest cholesteatoma sentence (7 of the 27 five-year reports with a microscopy), with "No intact squamous
// epithelium is identified." (4) for keratin alone, "Granulomas are not present." (4) and "Several foreign body
// type multinucleated giant cells are seen."; 30 of the 36 were all embedded.
// Grounding:
//   Sandison A. Head Neck Pathol 2022 (the ear in the 5th edition WHO head and neck classification): "Biopsies
//   usually show only cytologically bland keratinising squamous epithelium and abundant keratin flakes." Keratin
//   with no epithelium is reported with the qualifier "Consistent with", and closes on malignancy alone.
//   https://pmc.ncbi.nlm.nih.gov/articles/PMC9018943/
//   Ohio State University atlas of head and neck pathology, aural polyp: the polyps show a chronic inflammatory
//   reaction with many small blood vessels and histiocytes.
//   https://medicine.osu.edu/-/media/files/medicine/departments/otolaryngology/atlas-of-head-and-neck-pathology/a/auralpolyp2.pdf
// Only ENT words route here ("middle ear", "mastoid", "attic", "aural", "ear canal", "cholesteatoma"): a bare
// "ear" is pinna skin and stays on the skin forms, which list it as a site.
// Wording is protected by tests/ear_cholesteatoma.test.js and tests/fixtures/ear_cholesteatoma/.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
/** Lower-case an ordinary leading word ("Cholesteatoma" -> "cholesteatoma") but keep "EAC". */
const lcWord = (s) => (/^[A-Z][a-z]/.test(s || '') ? lc1(s) : s || '');

export const CHOLESTEATOMA = 'Cholesteatoma';
export const KERATIN = 'Keratin only';
export const AURAL_POLYP = 'Aural polyp';
export const GRANULATION = 'Granulation tissue';

const head = (v) => v.organ || 'EAR';
const sideWord = (v) => (v.side === 'Left' || v.side === 'Right' ? v.side.toLowerCase() : '');
const features = (v) => new Set(v.features || []);

// ---------- specimen ----------

/**
 * The clinical label without the side (printed from its own field) and without a repeat of the head: a bare
 * "ear" goes on an EAR line ("middle ear", "ear canal" and "ear polyp" stay), and a head such as MIDDLE EAR is
 * not written twice.
 */
export function labelPhrase(v) {
  let s = stripDot(v.site).replace(/\s*,\s*/g, ' ').replace(/\b(?:left|right|bilateral)\b/gi, ' ');
  if (head(v) === 'EAR') {
    s = s.replace(/(^|\s)(ears?)(?=\s|$)/gi, (m, pre, w, off, str) => {
      const before = str.slice(0, off + pre.length);
      const after = str.slice(off + m.length);
      return /(?:middle|inner|external)\s*$/i.test(before) || /^\s*(?:canal|polyp)/i.test(after) ? m : pre;
    });
  } else {
    s = s.replace(new RegExp(`\\b${head(v).replace(/\s+/g, '\\s+')}\\b`, 'gi'), ' ');
  }
  s = s.replace(/\s+/g, ' ').trim();
  return lcWord(s);
}
/** "left cholesteatoma"; the side alone when no label was given. */
export function sitePhrase(v) {
  return [sideWord(v), labelPhrase(v)].filter(Boolean).join(' ');
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return typed;
  return [cap1(head(v).toLowerCase()), sitePhrase(v), lc1(v.procedure || '')].filter(Boolean).join(', ');
}

// ---------- macroscopic description ----------

/** "0.8x0.5x0.2" -> "0.8 x 0.5 x 0.2 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

const DESCRIPTION = {
  'Fragments of tan-white tissue': { what: 'are fragments of tan-white tissue', key: 'Tissue fragments', aggregate: true },
  'Fragments of keratinous material': { what: 'are fragments of white keratinous material', key: 'Keratinous material', aggregate: true },
  'A polypoid piece of tissue': { what: 'is a polypoid piece of tissue', key: 'Polyp' }
};
const desc = (v) => DESCRIPTION[v.description] || DESCRIPTION['Fragments of tan-white tissue'];
const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 1));
const representative = (v) => v.blockScheme === 'Representative sections';

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const d = desc(v);
  const label = sitePhrase(v);
  const size = sizePhrase(v.dimensions);
  let first = `Received in formalin ${d.what}`;
  if (label) first += ` labelled ${label}`;
  if (size) first += `, measuring ${size}${d.aggregate ? ' in aggregate' : ''}`;
  const blocks = blockCount(v);
  const plural = blocks === 1 ? '' : 's';
  const sampling = representative(v) ? `Representative sections in ${blocks} block${plural}.` : `All embedded in ${blocks} block${plural}.`;
  return `(${part.label}) ${first}. ${sampling}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const blocks = blockCount(v);
  const range = blocks === 1 ? '(1)' : `(1-${blocks})`;
  return `(${part.label}) ${range} ${desc(v).key}, ${representative(v) ? 'representative sections' : 'all embedded'}.`;
}

// ---------- microscopy ----------

const dx = (v) => ([CHOLESTEATOMA, KERATIN, AURAL_POLYP, GRANULATION].includes(v.diagnosis) ? v.diagnosis : CHOLESTEATOMA);
const acute = (v) => v.inflammation === 'Acute and chronic';
const infiltrate = (v) => (acute(v) ? 'a mixed acute and chronic' : 'a chronic');

function opening(v) {
  switch (dx(v)) {
    case KERATIN: return ['Sections show lamellated keratinous debris.', 'No intact squamous epithelium is identified.'];
    case AURAL_POLYP: return [`Sections show a polypoid fragment of granulation tissue with numerous small blood vessels and ${infiltrate(v)} inflammatory infiltrate of lymphocytes, plasma cells and histiocytes.`];
    case GRANULATION: return [`Sections show granulation tissue with ${infiltrate(v)} inflammatory infiltrate.`];
    default: return ['Sections show lamellated keratinous debris and fragments of benign keratinising squamous epithelium.'];
  }
}
const keratinising = (v) => dx(v) === CHOLESTEATOMA || dx(v) === KERATIN;
const FEATURE_MICRO = [
  ['Granulation tissue', 'Inflamed granulation tissue is also present.'],
  ['Surface ulceration', 'The surface is ulcerated.'],
  ['Foreign-body giant cells', 'Several foreign body type multinucleated giant cells are seen.'],
  ['Cholesterol clefts', 'Cholesterol clefts surrounded by foreign body type giant cells are present.'],
  ['Bone fragments', 'Fragments of bone are also present.']
];
const CONCLUSION = {
  [CHOLESTEATOMA]: 'Features are consistent with cholesteatoma.',
  [KERATIN]: 'Features are consistent with cholesteatoma.',
  [AURAL_POLYP]: 'Features are those of an aural polyp.'
};

export function microscopy(part) {
  const v = part.values;
  const f = features(v);
  const s = opening(v);
  // Granulation tissue is the lesion itself on a polyp or a granulation-tissue diagnosis, not an extra finding.
  for (const [key, sentence] of FEATURE_MICRO) if (f.has(key) && !(key === 'Granulation tissue' && !keratinising(v))) s.push(sentence);
  if (v.granulomas === 'Not present') s.push('Granulomas are not present.');
  if (CONCLUSION[dx(v)]) s.push(CONCLUSION[dx(v)]);
  s.push(dx(v) === CHOLESTEATOMA ? 'There is no evidence of dysplasia or malignancy.' : 'There is no evidence of malignancy.');
  const notes = stripDot(v.additionalNotes);
  if (notes) s.push(`${notes}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

export function mainLine(v) {
  switch (dx(v)) {
    case KERATIN: return 'Consistent with CHOLESTEATOMA';
    case AURAL_POLYP: return 'AURAL POLYP';
    case GRANULATION: return `GRANULATION TISSUE with ${acute(v) ? 'ACUTE AND CHRONIC' : 'CHRONIC'} INFLAMMATION`;
    default: return features(v).has('Granulation tissue') ? 'CHOLESTEATOMA with GRANULATION TISSUE' : 'CHOLESTEATOMA';
  }
}

export function diagnosis(part) {
  const v = part.values;
  const line = [head(v), sitePhrase(v), lc1(v.procedure || '')].filter(Boolean).join(', ');
  return `(${part.label}) ${line} - ${mainLine(v)}`;
}

// ---------- checks ----------

export function validate(part) {
  const v = part.values;
  const { out, warn } = checks();
  if (!sideWord(v)) warn('The side is not stated.', 'side');
  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, validate };
