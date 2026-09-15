import { stripDot } from './_house.js';
// Dental / jaw cyst (enucleation / curettage / apicectomy) generator. Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Mandible, left posterior, 36 region, enucleation"
//   macro      "(A) Received in formalin are multiple fragments of cyst wall measuring 1.5 x 1 x 0.3 cm in aggregate,
//               together with a tooth root. All soft tissue embedded in 1 block; the tooth is not processed."
//   blockKey   "(A) (1) Cyst wall, all embedded. Tooth retained, not processed."
//   microscopy "(A) Sections show a cyst lined by non-keratinised stratified squamous epithelium of variable thickness
//               with arcading, supported by a fibrous wall containing a moderate chronic inflammatory infiltrate,
//               cholesterol clefts and foamy macrophages. Rushton bodies are seen within the lining. The findings are
//               those of a radicular cyst. There is no evidence of dysplasia or malignancy."
//   diagnosis  "(A) MANDIBLE, left posterior, enucleation - RADICULAR CYST; no evidence of dysplasia or malignancy"
// Roadmap Phase 4b item 18. The odontogenic tumour option gives a short diagnosis line only; the schema snippet
// `jaw_cyst_tumour_template` adds the comment pointing to the QMH head and neck template. OKC and glandular
// odontogenic cyst auto-tick their recurrence snippets. Wording is protected by tests/jawcyst.test.js.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const dash = (s) => String(s || '').replace(/[\u2013\u2014]/g, '-');

export const TUMOUR = 'Odontogenic tumour - see comment';
export const GRANULOMA = 'Periapical granuloma (no lining)';
export const OKC = 'Odontogenic keratocyst';
export const isTumour = (v) => dash(v.cystType) === TUMOUR;
export const isGranuloma = (v) => v.cystType === GRANULOMA;

/** "1.5x1x0.3" -> "1.5 x 1 x 0.3 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

/** "Mandible" / "Maxilla" as typed in the site select; defaults to Mandible. */
export function siteWord(v) {
  return /maxilla/i.test(String(v.site || '')) ? 'Maxilla' : 'Mandible';
}

/** Region phrase for the diagnosis: "left posterior mandible, 36 region" -> "left posterior" (site word and stray commas removed). */
export function regionPhrase(v) {
  let r = stripDot(v.specimenName);
  r = r.replace(/\b(mandible|mandibular|maxilla|maxillary|jaw)\b/gi, '').replace(/\s{2,}/g, ' ');
  r = r.replace(/\s+,/g, ',').replace(/,\s*,/g, ',').replace(/,(?=\S)/g, ', ');
  return r.replace(/^[\s,]+|[\s,]+$/g, '');
}

/** "36 region" from the tooth field; '' when blank. */
export function toothPhrase(v) {
  const t = stripDot(v.toothNumber);
  if (!t) return '';
  return /region|tooth/i.test(t) ? t : `${t} region`;
}

const PROCEDURE = {
  Enucleation: 'enucleation',
  Curettage: 'curettage',
  Marsupialisation: 'marsupialisation',
  Apicectomy: 'apicectomy',
  'Extraction with cyst': 'extraction with cyst'
};
const procWord = (v) => PROCEDURE[v.procedure] || lc1(v.procedure) || 'enucleation';

export function specimenName(part) {
  const v = part.values;
  return [siteWord(v), regionPhrase(v), toothPhrase(v), procWord(v)].filter(Boolean).join(', ');
}

// ---------- macroscopic description ----------

const CONTENTS = {
  'Clear / straw fluid': 'clear straw-coloured fluid',
  'Cheesy keratin': 'cheesy keratinous material',
  Purulent: 'purulent material'
};

const TOOTH = {
  Root: 'a tooth root',
  Apex: 'a root apex',
  Crown: 'a tooth crown',
  'Whole tooth': 'a tooth'
};
const toothNoun = (v) => TOOTH[v.toothPart] || 'a tooth';

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = [];
  const n = num(v.fragments);
  const size = sizePhrase(v.aggregateSize);
  const tooth = v.toothIncluded ? `, together with ${toothNoun(v)}` : '';
  if (n === 1) {
    s.push(`Received in formalin is a single fragment of cyst wall${size ? ` measuring ${size}` : ''}${tooth}.`);
  } else {
    const count = n !== null ? fmt(n) : (stripDot(v.fragments) || 'multiple').toLowerCase();
    s.push(`Received in formalin are ${count} fragments of cyst wall${size ? ` measuring ${size} in aggregate` : ''}${tooth}.`);
  }
  const wall = sizePhrase(v.wallThickness);
  if (wall) s.push(`The cyst wall measures up to ${wall} in thickness.`);
  const contents = (Array.isArray(v.contents) ? v.contents : []).map((c) => CONTENTS[c]).filter(Boolean);
  if (contents.length) s.push(`The cyst contains ${listJoin(contents)}.`);
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 1));
  const plural = blocks === 1 ? '' : 's';
  if (v.toothIncluded) s.push(`All soft tissue embedded in ${blocks} block${plural}; the tooth is not processed.`);
  else s.push(`All embedded in ${blocks} block${plural}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 1));
  const range = blocks === 1 ? '(1)' : `(1-${blocks})`;
  const tooth = v.toothIncluded ? ' Tooth retained, not processed.' : '';
  return `(${part.label}) ${range} Cyst wall, all embedded.${tooth}`;
}

// ---------- microscopy ----------

/** Lining phrase per cyst type, completing "Sections show a cyst lined by …". */
const LINING = {
  'Radicular (periapical) cyst': 'non-keratinised stratified squamous epithelium of variable thickness with arcading',
  'Residual cyst': 'non-keratinised stratified squamous epithelium of variable thickness with arcading',
  'Dentigerous cyst': 'thin, regular non-keratinised epithelium two to four cells thick resembling reduced enamel epithelium',
  [OKC]: 'parakeratinised stratified squamous epithelium of uniform thickness, five to eight cells thick, with a corrugated surface and a palisaded, hyperchromatic basal layer',
  'Lateral periodontal cyst': 'thin non-keratinised epithelium one to three cells thick with focal plaque-like thickenings of clear cells',
  'Botryoid odontogenic cyst': 'thin non-keratinised epithelium one to three cells thick with focal plaque-like thickenings, arranged as multiple cystic spaces',
  'Glandular odontogenic cyst': 'non-keratinised epithelium of variable thickness with a superficial layer of eosinophilic cuboidal to columnar cells, intraepithelial microcysts, mucous cells and epithelial whorls',
  'Nasopalatine duct cyst': 'a combination of stratified squamous and ciliated respiratory-type epithelium'
};

const FINDINGS = {
  'Radicular (periapical) cyst': 'a radicular cyst',
  'Residual cyst': 'a residual (radicular) cyst',
  'Dentigerous cyst': 'a dentigerous cyst',
  [OKC]: 'an odontogenic keratocyst',
  'Lateral periodontal cyst': 'a lateral periodontal cyst',
  'Botryoid odontogenic cyst': 'a botryoid odontogenic cyst',
  'Glandular odontogenic cyst': 'a glandular odontogenic cyst',
  'Nasopalatine duct cyst': 'a nasopalatine duct cyst'
};

const INFLAMMATION = {
  Mild: 'a mild chronic inflammatory infiltrate',
  Moderate: 'a moderate chronic inflammatory infiltrate',
  Severe: 'a dense mixed inflammatory infiltrate'
};

const TUMOUR_MICRO = {
  'Unicystic ameloblastoma': 'Sections show a cyst lined by odontogenic epithelium with a palisaded columnar basal layer showing reverse nuclear polarity and subnuclear vacuolation, and an overlying loosely arranged stellate reticulum-like layer. The features are those of a unicystic ameloblastoma; see comment.',
  'Conventional ameloblastoma': 'Sections show islands and strands of odontogenic epithelium with peripheral palisaded columnar cells showing reverse nuclear polarity and central stellate reticulum-like areas, set in a fibrous stroma. The features are those of a conventional ameloblastoma; see comment.',
  Odontoma: 'Sections show a haphazard admixture of dentine, enamel matrix, cementum and pulpal tissue with odontogenic epithelium. The features are those of an odontoma; see comment.',
  Other: 'Sections show an odontogenic tumour; see comment.'
};

export function microscopy(part) {
  const v = part.values;
  const s = [];

  if (isTumour(v)) {
    s.push(TUMOUR_MICRO[v.tumourSubtype] || TUMOUR_MICRO.Other);
  } else if (isGranuloma(v)) {
    const extras = listJoin([v.cholesterolClefts ? 'cholesterol clefts' : '', v.foamyMacrophages ? 'foamy macrophages' : '']);
    s.push(`Sections show inflamed granulation tissue and fibrous tissue containing a dense mixed chronic inflammatory infiltrate rich in plasma cells and lymphocytes${extras ? `, with ${extras}` : ''}.`);
    s.push('No epithelial lining is identified.');
    s.push('The findings are those of a periapical granuloma.');
  } else {
    const lining = LINING[v.cystType] || LINING['Radicular (periapical) cyst'];
    const wallItems = listJoin([INFLAMMATION[v.inflammation] || '', v.cholesterolClefts ? 'cholesterol clefts' : '', v.foamyMacrophages ? 'foamy macrophages' : '']);
    s.push(`Sections show a cyst lined by ${lining}, supported by a fibrous wall${wallItems ? ` containing ${wallItems}` : ''}.`);
    if (v.cystType === 'Nasopalatine duct cyst') s.push('Neurovascular bundles are present within the wall.');
    if (v.rushtonBodies) s.push('Rushton bodies are seen within the lining.');
    if (v.cystType === OKC) {
      if (v.satelliteCysts) s.push('Satellite (daughter) cysts are present within the wall.');
      if (v.buddingBasal) s.push('Budding of the basal layer into the wall is seen.');
    }
    s.push(`The findings are those of ${FINDINGS[v.cystType] || 'a radicular cyst'}.`);
  }

  if (!isTumour(v)) s.push(isGranuloma(v) ? 'There is no evidence of malignancy.' : 'There is no evidence of dysplasia or malignancy.');

  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const MAIN = {
  'Radicular (periapical) cyst': 'RADICULAR CYST',
  'Residual cyst': 'RESIDUAL CYST',
  'Dentigerous cyst': 'DENTIGEROUS CYST',
  [OKC]: 'ODONTOGENIC KERATOCYST',
  'Lateral periodontal cyst': 'LATERAL PERIODONTAL CYST',
  'Botryoid odontogenic cyst': 'BOTRYOID ODONTOGENIC CYST',
  'Glandular odontogenic cyst': 'GLANDULAR ODONTOGENIC CYST',
  'Nasopalatine duct cyst': 'NASOPALATINE DUCT CYST',
  [GRANULOMA]: 'PERIAPICAL GRANULOMA'
};

const TUMOUR_DX = {
  'Unicystic ameloblastoma': 'UNICYSTIC AMELOBLASTOMA',
  'Conventional ameloblastoma': 'AMELOBLASTOMA, CONVENTIONAL',
  Odontoma: 'ODONTOMA',
  Other: 'ODONTOGENIC TUMOUR'
};

export function diagnosis(part) {
  const v = part.values;
  const clauses = [];
  if (isTumour(v)) {
    clauses.push(TUMOUR_DX[v.tumourSubtype] || TUMOUR_DX.Other);
    clauses.push('see comment');
  } else if (isGranuloma(v)) {
    clauses.push(MAIN[GRANULOMA]);
    clauses.push('no epithelial lining identified');
    clauses.push('no evidence of malignancy');
  } else {
    clauses.push(MAIN[v.cystType] || 'RADICULAR CYST');
    if (v.cystType === OKC && v.satelliteCysts) clauses.push('satellite cysts present');
    if (v.inflammation === 'Severe') clauses.push('heavily inflamed');
    clauses.push('no evidence of dysplasia or malignancy');
  }
  const head = [siteWord(v).toUpperCase(), regionPhrase(v), procWord(v)].filter(Boolean).join(', ');
  return `(${part.label}) ${head} - ${clauses.join('; ')}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
