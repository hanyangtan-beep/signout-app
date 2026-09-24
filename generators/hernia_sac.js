import { stripDot, checks } from './_house.js';
import { ihcPanel } from './softtissue.js';
// Hernia sac (benign resection). Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Soft tissue, right inguinal hernia sac, excision"
//   macro      "(A) Received in formalin is a membranous sac labelled right inguinal hernia sac, measuring
//               4 x 3 x 0.5 cm. Representative sections in 1 block."
//   blockKey   "(A) (1) Hernia sac, representative sections."
//   microscopy "(A) Sections show peritoneal fibroadipose tissue lined by benign mesothelium. No vas deferens or
//               epididymal tissue is identified. Features are in keeping with a hernia sac. There is no evidence
//               of granulomatous inflammation or malignancy."
//   diagnosis  "(A) SOFT TISSUE, right inguinal hernia sac, excision - In keeping with HERNIA SAC"
//
// Benign batch 3 (docs/roadmap.md, "Haemorrhoid, cholesteatoma and hernia sac", pulled 2026-09-24). The eight
// hernia sacs in the two exports routed to the soft-tissue form (6) or Generic (2)
// (docs/case-mix/benign-resections-2021-2026.md). House phrasing, from aggregate counts only (no case text is
// kept here): the diagnosis line opens SOFT TISSUE in 6 of the 8, which stays the default head (HERNIA SAC is
// the other choice); "Features are in keeping with a hernia sac." (3) and "There is no evidence of granulomatous
// inflammation or malignancy." (4); 6 of the 8 were sampled representatively. Three of the eight carried
// metastatic carcinoma, which is why the involved branch exists.
// Grounding:
//   RCPath G099 Tissue pathways for urological pathology (V3, Sept 2024) §9.1 lists a hernia sac with entrapped
//   epididymis among the findings to note, the reason the cord structures are a field; a vas deferens or
//   epididymis in a (paediatric) sac points to the comment.
//   https://www.rcpath.org/static/88d7ee53-9a54-4b9b-8bb89b03318b4c47/g099-tissue-pathways-for-urological-pathology.pdf
// The metastatic-carcinoma sentences are those of the soft-tissue form (generators/softtissue.js), reworded for
// the wall of the sac; the immunohistochemistry sentence is the shared ihcPanel().
// Wording is protected by tests/hernia_sac.test.js and tests/fixtures/hernia_sac/.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const andUpper = (list) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} AND ${list[list.length - 1]}` : list[0] || '');

export const MET = 'Metastatic carcinoma – see comment';
export const VAS = 'Vas deferens';
export const EPIDIDYMIS = 'Epididymis';

const head = (v) => (v.organ === 'HERNIA SAC' ? 'HERNIA SAC' : 'SOFT TISSUE');
const bilateral = (v) => v.side === 'Bilateral';
const sideWord = (v) => (['Left', 'Right', 'Bilateral'].includes(v.side) ? v.side.toLowerCase() : '');
const typeWord = (v) => lc1(v.herniaType || '');

// ---------- specimen ----------

/** "right inguinal hernia sac"; "bilateral inguinal hernia sacs"; the sac words are dropped under a HERNIA SAC head. */
export function sitePhrase(v, { withSac = head(v) !== 'HERNIA SAC' } = {}) {
  const words = [sideWord(v), typeWord(v)];
  if (withSac) words.push(bilateral(v) ? 'hernia sacs' : 'hernia sac');
  return words.filter(Boolean).join(' ');
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return typed;
  return [cap1(head(v).toLowerCase()), sitePhrase(v), lc1(v.procedure || '')].filter(Boolean).join(', ');
}

// ---------- macroscopic description ----------

/** "4x3x0.5" -> "4 x 3 x 0.5 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

const DESCRIPTION = {
  'A membranous sac': { what: 'is a membranous sac' },
  'Pieces of fibrofatty tissue': { what: 'are pieces of fibrofatty tissue', aggregate: true }
};
/** Both sacs in one container: "are two membranous sacs", measured in aggregate. */
const desc = (v) => {
  const d = DESCRIPTION[v.description] || DESCRIPTION['A membranous sac'];
  return bilateral(v) && d === DESCRIPTION['A membranous sac'] ? { what: 'are two membranous sacs', aggregate: true } : d;
};
const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 1));
const representative = (v) => v.blockScheme !== 'All embedded';

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const d = desc(v);
  const label = sitePhrase(v, { withSac: true });
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
  return `(${part.label}) ${range} ${bilateral(v) ? 'Hernia sacs' : 'Hernia sac'}, ${representative(v) ? 'representative sections' : 'all embedded'}.`;
}

// ---------- microscopy ----------

const CONTENTS_MICRO = {
  'Viable omentum': 'Adherent omental fat is also present, with no infarction.',
  'Infarcted omentum': 'Adherent omental fat shows haemorrhagic infarction.'
};
const CORD_MICRO = {
  'Not identified': 'No vas deferens or epididymal tissue is identified.',
  [VAS]: 'A segment of vas deferens is present in the wall of the sac.',
  [EPIDIDYMIS]: 'Epididymal tissue is present in the wall of the sac.'
};
const MET_MICRO = {
  Adenocarcinoma: 'The wall of the sac is infiltrated by adenocarcinoma composed of irregular glands lined by cells with enlarged, pleomorphic, hyperchromatic nuclei.',
  Carcinoma: 'The wall of the sac is infiltrated by nests and sheets of malignant epithelial cells with enlarged, pleomorphic, hyperchromatic nuclei.',
  'Squamous cell carcinoma': 'The wall of the sac is infiltrated by nests of malignant squamous cells with eosinophilic cytoplasm, intercellular bridges and focal keratinisation.'
};
const metType = (v) => (MET_MICRO[v.metType] ? v.metType : 'Adenocarcinoma');
/** Favoured primary as typed, without a trailing "primary" / "origin". */
const primaryOf = (v) => stripDot(v.favouredPrimary).replace(/\s+(primary|origin)$/i, '').trim();
const metastatic = (v) => v.malignancy === MET;

export function microscopy(part) {
  const v = part.values;
  const s = ['Sections show peritoneal fibroadipose tissue lined by benign mesothelium.'];
  if (CONTENTS_MICRO[v.contents]) s.push(CONTENTS_MICRO[v.contents]);
  if (v.endometriosis === 'Present') s.push('Foci of endometriosis, composed of endometrial-type glands and stroma, are present in the wall of the sac.');
  if (CORD_MICRO[v.cordStructures]) s.push(CORD_MICRO[v.cordStructures]);
  s.push(bilateral(v) ? 'Features are in keeping with hernia sacs.' : 'Features are in keeping with a hernia sac.');
  if (metastatic(v)) {
    const type = metType(v);
    const primary = primaryOf(v);
    s.push(MET_MICRO[type], ...ihcPanel(v, 'tumour cells'));
    s.push(primary
      ? `The findings are consistent with metastatic ${lc1(type)} of ${lc1(primary)} primary.`
      : `The findings are in keeping with metastatic ${lc1(type)}.`);
  } else {
    s.push('There is no evidence of granulomatous inflammation or malignancy.');
  }
  const notes = stripDot(v.additionalNotes);
  if (notes) s.push(`${notes}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const CORD_DX = { [VAS]: 'VAS DEFERENS IDENTIFIED; see comment', [EPIDIDYMIS]: 'EPIDIDYMAL TISSUE IDENTIFIED; see comment' };

export function mainLine(v) {
  const mods = [];
  if (v.contents === 'Infarcted omentum') mods.push('INFARCTED OMENTUM');
  if (v.endometriosis === 'Present') mods.push('ENDOMETRIOSIS');
  let main;
  if (metastatic(v)) {
    const primary = primaryOf(v);
    main = `HERNIA SAC involved by METASTATIC ${metType(v).toUpperCase()}${primary ? `, consistent with ${primary.toUpperCase()} PRIMARY` : ''}; see comment`;
  } else {
    const sacs = bilateral(v) ? 'HERNIA SACS' : 'HERNIA SAC';
    main = mods.length ? `In keeping with ${sacs} with ${andUpper(mods)}` : `In keeping with ${sacs}`;
  }
  return CORD_DX[v.cordStructures] ? `${main}; ${CORD_DX[v.cordStructures]}` : main;
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
  if (!sideWord(v) && ['Inguinal', 'Femoral', 'Obturator', 'Spigelian'].includes(v.herniaType)) warn('The side is not stated.', 'side');
  if (metastatic(v) && !stripDot(v.ihcPositive) && !stripDot(v.ihcNegative) && !primaryOf(v)) {
    warn('Metastatic carcinoma is recorded with no immunohistochemistry or favoured primary: add them or say so in the comment.', 'malignancy');
  }
  if (bilateral(v) && (metastatic(v) || CORD_DX[v.cordStructures] || v.endometriosis === 'Present' || v.contents === 'Infarcted omentum')) {
    warn('Both sacs are in one part: record left and right as separate parts so the finding is assigned to a side.', 'side');
  }
  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, validate };
