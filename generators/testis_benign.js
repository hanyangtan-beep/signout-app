import { stripDot, checks } from './_house.js';
// Testis, scrotal contents and foreskin — benign (benign resection). Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Prepuce, circumcision"
//   macro      "(A) Received in formalin is a piece of foreskin, measuring 3 x 2 x 0.3 cm. Representative sections
//               in 1 block."
//   blockKey   "(A) (1) Foreskin, representative sections."
//   microscopy "(A) Sections of the prepuce show stratified squamous epithelium. The epithelium is atrophic, with
//               hyperkeratosis and a band of homogenised, sclerotic collagen in the superficial dermis, beneath
//               which there is a band-like lymphocytic infiltrate. Features are consistent with lichen sclerosus.
//               There is no evidence of penile intraepithelial neoplasia or malignancy."
//   diagnosis  "(A) PREPUCE, circumcision - Consistent with LICHEN SCLEROSUS (balanitis xerotica obliterans)"
//
// Benign batch 3 (docs/roadmap.md, "Testis, scrotum and foreskin — benign", pulled 2026-09-24). Before this
// template 37 of the 45 testis, scrotum and foreskin parts in the two exports landed on Generic
// (docs/case-mix/benign-resections-2021-2026.md). Six specimens share the form, each with its own head and
// procedure unless the request line names them: PREPUCE / circumcision, TESTIS / orchidectomy or biopsy, TUNICA
// VAGINALIS / excision (hydrocele), EPIDIDYMIS / excision and VAS DEFERENS / vasectomy. The diagnosis line opens
// TESTIS in 14 of the 45 and PREPUCE in 5; penile and scrotal skin lesions stay on the skin forms, testicular
// tumours on their own card.
// Grounding: RCPath G099 Tissue pathways for urological pathology (V3, Sept 2024) — §7.2 prepuce (comment on
// LS/BXO and Zoon's balanitis, report non-specific balanoposthitis, exclude PeIN or malignancy); §8.1 testicular
// biopsy (adequacy is best judged by 25 seminiferous tubules, submit all tissue, describe spermatogenesis,
// maturation arrest and Sertoli cell-only tubules, a Johnsen-type score, Leydig cell hyperplasia and GCNIS); §8.2
// non-malignant orchidectomy (spermatogenesis, GCNIS, basement membrane thickening, Leydig cells; in torsion the
// Mikuz grade 1-3, which G099 spells "Mikutz"); §8.3 hydrocele ("Confirm benign mesothelial lining and fibrous
// thickening"); §9.1 epididymal cyst ("a cyst with a fibromuscular wall that is lined by bland cuboidal
// epithelium"; a spermatocele "is lined by a single layer of flattened epithelial cells"); §9.2 vasectomy
// ("Confirm vas deferens and that the full cross section is seen"; sperm granuloma, vasitis nodosa).
//   https://www.rcpath.org/static/88d7ee53-9a54-4b9b-8bb89b03318b4c47/g099-tissue-pathways-for-urological-pathology.pdf
//   Lichen sclerosus (2023 update): an atrophic epidermis with compact orthohyperkeratosis, a zone of sclerosis
//   beneath the basement membrane and a superficial lichenoid inflammatory band.
//   https://pmc.ncbi.nlm.nih.gov/articles/PMC9978401/
//   Zoon's balanitis (StatPearls): epidermal atrophy, a dense lichenoid subepidermal infiltrate composed largely of
//   plasma cells, erythrocyte extravasation and haemosiderin deposition. https://ncbi.nlm.nih.gov/sites/books/NBK482129/
//   Mikuz grades (Andrology 2023): grade 1 interstitial oedema, slight extravasation and desquamation of germ cells,
//   possibly reversible; grade 2 diffuse interstitial haemorrhage with partial necrosis; grade 3 haemorrhagic
//   infarction. https://onlinelibrary.wiley.com/doi/10.1111/andr.13368 ; https://librepathology.org/wiki/Testicular_torsion
//   Johnsen score 1-10: https://pmc.ncbi.nlm.nih.gov/articles/PMC12748690/table/Tab8/
// The printed name is "Mikuz", the author's own spelling.
// Wording is protected by tests/testis_benign.test.js and tests/fixtures/testis_benign/.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export const PREPUCE = 'Prepuce';
export const ORCHIDECTOMY = 'Orchidectomy';
export const BIOPSY = 'Testicular biopsy';
export const HYDROCELE = 'Hydrocele sac';
export const EPIDIDYMAL = 'Epididymal cyst or spermatocele';
export const VAS = 'Vas deferens';
export const GCNIS = 'Present – see comment';
export const NOT_FULL = 'Not in full cross-section – see comment';

const SPEC = {
  [PREPUCE]: { head: 'PREPUCE', procedure: 'Circumcision', what: 'is a piece of foreskin', key: 'Foreskin' },
  [ORCHIDECTOMY]: { head: 'TESTIS', procedure: 'Orchidectomy', what: 'is a testis', key: 'Testis' },
  [BIOPSY]: { head: 'TESTIS', procedure: 'Biopsy', what: 'are fragments of testicular tissue', key: 'Testicular tissue', aggregate: true },
  [HYDROCELE]: { head: 'TUNICA VAGINALIS', procedure: 'Excision', what: 'is a piece of membranous tissue', key: 'Hydrocele sac' },
  [EPIDIDYMAL]: { head: 'EPIDIDYMIS', procedure: 'Excision', what: 'is a thin-walled cyst', key: 'Cyst' },
  [VAS]: { head: 'VAS DEFERENS', procedure: 'Vasectomy', what: 'is a segment of vas deferens', key: 'Vas deferens' }
};
const kind = (v) => (SPEC[v.specimen] ? v.specimen : PREPUCE);
/** Heads that fit each specimen; any other chosen head is flagged (an epididymal line left on the prepuce form). */
const HEADS = {
  [PREPUCE]: ['PREPUCE', 'FORESKIN'],
  [ORCHIDECTOMY]: ['TESTIS', 'SPERMATIC CORD'],
  [BIOPSY]: ['TESTIS'],
  [HYDROCELE]: ['TUNICA VAGINALIS', 'TESTIS', 'SPERMATIC CORD'],
  [EPIDIDYMAL]: ['EPIDIDYMIS', 'TESTIS', 'SPERMATIC CORD'],
  [VAS]: ['VAS DEFERENS', 'SPERMATIC CORD']
};
const spec = (v) => SPEC[kind(v)];
const head = (v) => v.organ || spec(v).head;
const procedure = (v) => v.procedure || spec(v).procedure;
const sideWord = (v) => (['Left', 'Right', 'Bilateral'].includes(v.side) ? v.side.toLowerCase() : '');
const bilateralVas = (v) => kind(v) === VAS && v.side === 'Bilateral';

// ---------- specimen ----------

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return typed;
  return [cap1(head(v).toLowerCase()), sideWord(v), lc1(procedure(v))].filter(Boolean).join(', ');
}

// ---------- macroscopic description ----------

/** "3x2x0.3" -> "3 x 2 x 0.3 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 1));
const representative = (v) => v.blockScheme !== 'All embedded';

/** What the label names once a side is given: "labelled left testis", "labelled right spermatocele". */
const labelNoun = (v) => ({ [BIOPSY]: 'testis', [HYDROCELE]: 'hydrocele sac', [EPIDIDYMAL]: lc1(v.cystType || 'Epididymal cyst') }[kind(v)] || '');

/** "is a right testis"; "are two segments of vas deferens (left and right)"; other specimens are labelled. */
function what(v) {
  if (bilateralVas(v)) return 'are two segments of vas deferens (left and right)';
  const w = spec(v).what;
  const side = v.side === 'Left' || v.side === 'Right' ? v.side.toLowerCase() : '';
  if (!side || kind(v) === PREPUCE) return w;
  if (kind(v) === ORCHIDECTOMY || kind(v) === VAS) return w.replace(/^is a /, `is a ${side} `);
  return `${w} labelled ${[side, labelNoun(v)].filter(Boolean).join(' ')}`;
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const size = sizePhrase(v.dimensions);
  let first = `Received in formalin ${what(v)}`;
  if (size) first += `, measuring ${size}${spec(v).aggregate || bilateralVas(v) ? ' in aggregate' : ''}`;
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
  return `(${part.label}) ${range} ${spec(v).key}, ${representative(v) ? 'representative sections' : 'all embedded'}.`;
}

// ---------- microscopy ----------

const NEM = 'There is no evidence of malignancy.';
const PREPUCE_MICRO = {
  'No specific abnormality': ['No specific pathological change is seen.'],
  'Lichen sclerosus': [
    'The epithelium is atrophic, with hyperkeratosis and a band of homogenised, sclerotic collagen in the superficial dermis, beneath which there is a band-like lymphocytic infiltrate.',
    'Features are consistent with lichen sclerosus.'
  ],
  "Zoon's balanitis": [
    'The epithelium is thinned, and the superficial dermis contains a dense band-like infiltrate composed largely of plasma cells, with extravasated red cells and haemosiderin deposition.',
    "The features are those of Zoon's (plasma cell) balanitis."
  ],
  Balanoposthitis: [
    'There is non-specific acute and chronic inflammation of the epithelium and superficial dermis, with spongiosis.',
    'The features are those of non-specific balanoposthitis.'
  ],
  'Chronic inflammation': ['There is mild chronic inflammation in the dermis.']
};
const SPERM = {
  Absent: 'No spermatogonia, spermatocytes, spermatids and spermatozoa are noted.',
  Reduced: 'Spermatogenesis is reduced, with occasional spermatozoa.',
  Present: 'Spermatogenesis is present.'
};
const LEYDIG = { 'No hyperplasia': 'No Leydig cell hyperplasia is seen.', Hyperplasia: 'Focally, there is hyperplasia of the Leydig cells.' };
const leydig = (v) => LEYDIG[v.leydig] || LEYDIG['No hyperplasia'];
const gcnis = (v) => v.gcnis === GCNIS;
const gcnisClose = (v) => (gcnis(v)
  ? ['Germ cell neoplasia in situ is present; see comment.', 'There is no evidence of an invasive germ cell tumour.']
  : ['There is no evidence of germ cell neoplasia in situ or malignancy.']);
const MIKUZ = {
  1: ['Sections show testis with interstitial oedema, vascular congestion and focal extravasation of red cells.', 'There is sloughing of germ cells into the tubular lumina.',
    'The features are those of testicular torsion, Mikuz grade 1.'],
  2: ['Sections show testis with diffuse interstitial haemorrhage and necrosis of the germ cells in some of the seminiferous tubules.',
    'The features are those of testicular torsion, Mikuz grade 2.'],
  3: ['Sections show testis with complete haemorrhagic infarction; the germ cells in all the seminiferous tubules are necrotic.',
    'The features are those of testicular torsion, Mikuz grade 3.']
};
const grade = (v) => (MIKUZ[v.mikuz] ? String(v.mikuz) : '3');
const PATTERN = {
  'Normal spermatogenesis': 'All stages of spermatogenesis are present in normal numbers.',
  Hypospermatogenesis: 'All stages of spermatogenesis are present, but in reduced numbers.',
  'Sertoli cell-only': 'The seminiferous tubules are lined by Sertoli cells only; no germ cells are seen.',
  'Tubular sclerosis': 'The seminiferous tubules are sclerotic, with thickened, hyalinised basement membranes and no seminiferous epithelium.'
};
const arrestAt = (v) => (v.arrestStage === 'Early spermatid' ? 'early spermatid' : 'primary spermatocyte');
function patternSentence(v) {
  if (v.pattern === 'Maturation arrest') {
    return arrestAt(v) === 'early spermatid'
      ? 'Spermatogenesis is arrested at the early spermatid stage; no late spermatids or spermatozoa are seen.'
      : 'Spermatogenesis is arrested at the primary spermatocyte stage; no spermatids or spermatozoa are seen.';
  }
  return PATTERN[v.pattern] || PATTERN.Hypospermatogenesis;
}
const johnsen = (v) => stripDot(v.johnsen);
const tubules = (v) => num(v.tubules);

function micro(v) {
  switch (kind(v)) {
    case ORCHIDECTOMY:
      if (v.orchidDx === 'Torsion') return [...MIKUZ[grade(v)], NEM];
      if (v.orchidDx === 'Unremarkable testis') return ['Sections show testis with active spermatogenesis.', leydig(v), ...gcnisClose(v)];
      return ['Sections show testis with atrophic seminiferous tubules and interstitial fibrosis.', 'The basement membrane is thickened.', SPERM[v.spermatogenesis] || SPERM.Absent, leydig(v), ...gcnisClose(v)];
    case BIOPSY: {
      const n = tubules(v);
      const s = [n ? `Sections show testicular parenchyma with ${n} seminiferous tubule${n === 1 ? '' : 's'}.` : 'Sections show testicular parenchyma.', patternSentence(v)];
      if (johnsen(v)) s.push(`The mean Johnsen score is ${johnsen(v)}.`);
      return [...s, leydig(v), ...gcnisClose(v)];
    }
    case HYDROCELE: return ['Sections show a thickened fibrous wall lined by benign mesothelium.', NEM];
    case EPIDIDYMAL:
      return v.cystType === 'Spermatocele'
        ? ['Sections show a cyst with a fibromuscular wall, lined by a single layer of flattened epithelial cells.', 'Spermatozoa are present in the cyst contents.', NEM]
        : ['Sections show a cyst with a fibromuscular wall, lined by bland cuboidal epithelium.', NEM];
    case VAS: {
      const s = [v.crossSection === NOT_FULL
        ? 'Sections show fibromuscular tissue; a full cross-section of vas deferens is not identified.'
        : bilateralVas(v) ? 'Sections show two segments of vas deferens, each in full cross-section.' : 'Sections show a segment of vas deferens in full cross-section.'];
      const f = new Set(v.vasFindings || []);
      if (f.has('Sperm granuloma')) s.push('A sperm granuloma is present.');
      if (f.has('Vasitis nodosa')) s.push('There is vasitis nodosa, with small ductular structures in the muscular wall.');
      return [...s, NEM];
    }
    default:
      return ['Sections of the prepuce show stratified squamous epithelium.', ...(PREPUCE_MICRO[v.prepuceDx] || PREPUCE_MICRO['No specific abnormality']),
        'There is no evidence of penile intraepithelial neoplasia or malignancy.'];
  }
}

export function microscopy(part) {
  const v = part.values;
  const s = micro(v);
  const notes = stripDot(v.additionalNotes);
  if (notes) s.push(`${notes}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const PREPUCE_DX = {
  'No specific abnormality': 'NO EVIDENCE OF MALIGNANCY',
  'Lichen sclerosus': 'Consistent with LICHEN SCLEROSUS (balanitis xerotica obliterans)',
  "Zoon's balanitis": "ZOON'S (PLASMA CELL) BALANITIS",
  Balanoposthitis: 'NON-SPECIFIC BALANOPOSTHITIS',
  'Chronic inflammation': 'CHRONIC INFLAMMATION'
};
const PATTERN_DX = {
  'Normal spermatogenesis': 'NORMAL SPERMATOGENESIS',
  Hypospermatogenesis: 'HYPOSPERMATOGENESIS',
  'Sertoli cell-only': 'SERTOLI CELL-ONLY PATTERN',
  'Tubular sclerosis': 'TUBULAR SCLEROSIS'
};
const GCNIS_DX = 'GERM CELL NEOPLASIA IN SITU; see comment';

export function mainLine(v) {
  switch (kind(v)) {
    case ORCHIDECTOMY:
      if (v.orchidDx === 'Torsion') return `In keeping with TORSION OF TESTIS, Mikuz grade ${grade(v)}`;
      if (v.orchidDx === 'Unremarkable testis') return gcnis(v) ? GCNIS_DX : 'NO EVIDENCE OF MALIGNANCY';
      return gcnis(v) ? `TESTICULAR ATROPHY; ${GCNIS_DX}` : 'TESTICULAR ATROPHY';
    case BIOPSY: {
      const main = v.pattern === 'Maturation arrest' ? `MATURATION ARREST AT THE ${arrestAt(v).toUpperCase()} STAGE` : PATTERN_DX[v.pattern] || PATTERN_DX.Hypospermatogenesis;
      const score = johnsen(v) ? ` (mean Johnsen score ${johnsen(v)})` : '';
      return `${main}${score}${gcnis(v) ? `; ${GCNIS_DX}` : ''}`;
    }
    case HYDROCELE: return 'Consistent with HYDROCELE';
    case EPIDIDYMAL: return v.cystType === 'Spermatocele' ? 'SPERMATOCELE' : 'EPIDIDYMAL CYST';
    case VAS: {
      if (v.crossSection === NOT_FULL) return 'FULL CROSS-SECTION OF VAS DEFERENS NOT IDENTIFIED; see comment';
      const f = new Set(v.vasFindings || []);
      const extra = [f.has('Sperm granuloma') ? 'SPERM GRANULOMA' : '', f.has('Vasitis nodosa') ? 'VASITIS NODOSA' : ''].filter(Boolean);
      const main = bilateralVas(v) ? 'VAS DEFERENS, full cross-section of both segments' : 'VAS DEFERENS, full cross-section';
      return [main, ...extra].join('; ');
    }
    default: return PREPUCE_DX[v.prepuceDx] || PREPUCE_DX['No specific abnormality'];
  }
}

export function diagnosis(part) {
  const v = part.values;
  const line = [head(v), sideWord(v), lc1(procedure(v))].filter(Boolean).join(', ');
  return `(${part.label}) ${line} - ${mainLine(v)}`;
}

// ---------- checks ----------

export function validate(part) {
  const v = part.values;
  const { out, warn } = checks();
  if (kind(v) !== PREPUCE && !sideWord(v)) warn('The side is not stated.', 'side');
  if (kind(v) === BIOPSY) {
    const n = tubules(v);
    if (n !== null && n < 25) warn('Fewer than 25 seminiferous tubules: state that the biopsy may not be representative.', 'tubules');
    if (representative(v)) warn('Submit all the tissue from a testicular biopsy.', 'blockScheme');
    const j = num(v.johnsen);
    if (johnsen(v) && (j === null || j < 1 || j > 10)) warn('The Johnsen score runs from 1 to 10.', 'johnsen');
  }
  if (bilateralVas(v) && blockCount(v) < 2) warn('Bilateral vasectomy: submit one block of each vas.', 'blocks');
  if (bilateralVas(v) && (v.crossSection === NOT_FULL || (v.vasFindings || []).length)) {
    warn('Both vasa are in one part: record left and right as separate parts so the finding is assigned to a side.', 'side');
  }
  if (v.organ && !HEADS[kind(v)].includes(v.organ)) warn('The organ head does not match the specimen: check the specimen type.', 'organ');
  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, validate };
