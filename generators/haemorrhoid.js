import { stripDot, checks } from './_house.js';
// Haemorrhoid generator (benign resection). Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Anus, 3 o'clock haemorrhoid, haemorrhoidectomy"
//   macro      "(A) Received in formalin is a piece of haemorrhoidal tissue labelled 3 o'clock, measuring
//               2 x 1.5 x 1 cm. The cut surface shows dilated vessels within the stroma. Representative sections
//               in 1 block."
//   blockKey   "(A) (1) Haemorrhoid, representative sections."
//   microscopy "(A) Sections show anal squamous mucosa. Ectatic muscular blood vessels are noted in the stroma.
//               Some of the vessels contain thrombi. The features are those of haemorrhoid. There is no evidence
//               of dysplasia or malignancy."
//   diagnosis  "(A) ANUS, 3 o'clock haemorrhoid, haemorrhoidectomy - HAEMORRHOID with THROMBOSIS"
//
// Benign batch 3 (docs/roadmap.md, "Haemorrhoid, cholesteatoma and hernia sac", pulled 2026-09-24). Before this
// template 54 of the 56 haemorrhoid parts in the two exports landed on Generic
// (docs/case-mix/benign-resections-2021-2026.md). House phrasing, from aggregate sentence counts over the 39
// five-year reports with a microscopy (no case text is kept here): "The features are those of haemorrhoid." (21,
// written with the American spelling there), "Ectatic muscular blood vessels are noted in the stroma." (14), "A
// fibroepithelial polyp is noted, consisting of a fibrovascular core covered by unremarkable epidermis." (2) and
// the closing "There is no evidence of dysplasia or malignancy.", the commonest of the closings (18). The diagnosis
// is "HAEMORRHOID", singular and British, as in 44 of the 56 released lines. The head is ANUS, as the card sets
// it: the specimen lines open ANAL 28 times and ANUS 26 times, and the organ noun is the one that codes.
// Report content follows RCPath G085 Tissue pathways for gastrointestinal and pancreatobiliary pathology (V3,
// Oct 2024) §3.3.3: a haemorrhoid shows ectatic vessels with congestion, haemorrhage and thrombosis; the overlying
// squamous epithelium may show reactive atypia that mimics anal intraepithelial neoplasia, and mucosal prolapse
// change is common. §3.3.1: representative blocks are sufficient.
//   https://www.rcpath.org/static/4593f557-d75c-4ca6-9307a9d688e02a2d/1f175bdf-4934-4ace-bbde65114401944b/g085-tissue-pathways-for-gastrointestinal-and-pancreatobiliary-pathology.pdf
// Wording is protected by tests/haemorrhoid.test.js and tests/fixtures/haemorrhoid/.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
/** Lower-case an ordinary leading word ("External" -> "external") but keep "L2", "3 o'clock". */
const lcWord = (s) => (/^[A-Z][a-z]/.test(s || '') ? lc1(s) : s || '');
const andUpper = (list) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} AND ${list[list.length - 1]}` : list[0] || '');

export const THROMBOSIS = 'Thrombosis';
export const ULCERATION = 'Surface ulceration';
export const PROLAPSE = 'Mucosal prolapse change';
export const ATYPIA = 'Reactive squamous atypia';
export const FEP = 'Fibroepithelial polyp';
const findings = (v) => new Set(v.findings || []);

// ---------- specimen ----------

const HAEM_WORD = /\b(?:haemorrhoid|hemorrhoid)/i;
/** The position or label typed on the request ("3 o'clock", "external"), first word lower-cased. */
export const labelPhrase = (v) => lcWord(stripDot(v.site));
/** "3 o'clock haemorrhoid"; a label that already names the haemorrhoid is printed as received. */
export function sitePhrase(v) {
  const label = labelPhrase(v);
  if (!label) return 'haemorrhoid';
  return HAEM_WORD.test(label) ? label : `${label} haemorrhoid`;
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return typed;
  return ['Anus', sitePhrase(v), lc1(v.procedure || '')].filter(Boolean).join(', ');
}

// ---------- macroscopic description ----------

/** "2x1.5x1" -> "2 x 1.5 x 1 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

const DESCRIPTION = {
  'A piece of haemorrhoidal tissue': { what: 'is a piece of haemorrhoidal tissue' },
  'Pieces of haemorrhoidal tissue': { what: 'are pieces of haemorrhoidal tissue', aggregate: true }
};
const desc = (v) => DESCRIPTION[v.description] || DESCRIPTION['A piece of haemorrhoidal tissue'];
const CUT_SURFACE = {
  'Dilated vessels': 'The cut surface shows dilated vessels within the stroma.',
  'Dilated vessels with thrombus': 'The cut surface shows dilated vessels within the stroma, some containing thrombus.'
};
const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 1));
const representative = (v) => v.blockScheme !== 'All embedded';

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const d = desc(v);
  const label = labelPhrase(v);
  const size = sizePhrase(v.dimensions);
  let first = `Received in formalin ${d.what}`;
  if (label) first += ` labelled ${label}`;
  if (size) first += `, measuring ${size}${d.aggregate ? ' in aggregate' : ''}`;
  const s = [`${first}.`];
  if (CUT_SURFACE[v.cutSurface]) s.push(CUT_SURFACE[v.cutSurface]);
  const blocks = blockCount(v);
  const plural = blocks === 1 ? '' : 's';
  s.push(representative(v) ? `Representative sections in ${blocks} block${plural}.` : `All embedded in ${blocks} block${plural}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const blocks = blockCount(v);
  const range = blocks === 1 ? '(1)' : `(1-${blocks})`;
  return `(${part.label}) ${range} Haemorrhoid, ${representative(v) ? 'representative sections' : 'all embedded'}.`;
}

// ---------- microscopy ----------

const OPENING = {
  'Anal squamous mucosa': 'Sections show anal squamous mucosa.',
  'Anorectal junction': 'Sections show squamous and columnar mucosa of the anorectal junction.',
  'Rectal mucosa': 'Sections show rectal mucosa.',
  'Perianal skin': 'Sections show perianal skin.'
};
const FINDING_MICRO = {
  [THROMBOSIS]: 'Some of the vessels contain thrombi.',
  [ULCERATION]: 'The surface is ulcerated.',
  [PROLAPSE]: 'There is mucosal prolapse change, with fibromuscular proliferation in the lamina propria.',
  [ATYPIA]: 'The squamous epithelium shows reactive atypia.',
  [FEP]: 'A fibroepithelial polyp is noted, consisting of a fibrovascular core covered by unremarkable epidermis.'
};
const FINDING_ORDER = [THROMBOSIS, ULCERATION, PROLAPSE, ATYPIA, FEP];
export const CLOSING = 'There is no evidence of dysplasia or malignancy.';

export function microscopy(part) {
  const v = part.values;
  const f = findings(v);
  const s = [OPENING[v.mucosa] || OPENING['Anal squamous mucosa'], 'Ectatic muscular blood vessels are noted in the stroma.'];
  s.push(...FINDING_ORDER.filter((k) => f.has(k)).map((k) => FINDING_MICRO[k]));
  s.push('The features are those of haemorrhoid.', CLOSING);
  const notes = stripDot(v.additionalNotes);
  if (notes) s.push(`${notes}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

// Reactive atypia is a microscopic finding only: the closing sentence already states that there is no dysplasia.
const FINDING_DX = { [THROMBOSIS]: 'THROMBOSIS', [ULCERATION]: 'ULCERATION', [PROLAPSE]: 'MUCOSAL PROLAPSE CHANGE' };

export function mainLine(v) {
  const f = findings(v);
  const mods = [THROMBOSIS, ULCERATION, PROLAPSE].filter((k) => f.has(k)).map((k) => FINDING_DX[k]);
  const main = mods.length ? `HAEMORRHOID with ${andUpper(mods)}` : 'HAEMORRHOID';
  return f.has(FEP) ? `FIBROEPITHELIAL POLYP; ${main}` : main;
}

export function diagnosis(part) {
  const v = part.values;
  const head = ['ANUS', sitePhrase(v), lc1(v.procedure || '')].filter(Boolean).join(', ');
  return `(${part.label}) ${head} - ${mainLine(v)}`;
}

// ---------- checks ----------

export function validate(part) {
  const v = part.values;
  const { out, warn } = checks();
  // Mucosal prolapse change is a change of the rectal (columnar) mucosa; on perianal skin it is a mis-click.
  if (findings(v).has(PROLAPSE) && v.mucosa === 'Perianal skin') {
    warn('Mucosal prolapse change is recorded on perianal skin: check the mucosa chosen for the opening sentence.', 'mucosa');
  }
  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, validate };
