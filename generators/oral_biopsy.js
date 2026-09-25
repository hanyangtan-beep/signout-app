import { stripDot, checks } from './_house.js';
// Oral cavity and oropharynx — mucosal biopsy and excision: dysplasia, carcinoma and the benign mucosal
// lesions. Pure functions: (part, ctx) -> string. No macroscopy: like the other biopsy forms, the
// grossing text comes from the LIS.
// Blocks produced:
//   specimens  "Oral cavity, left lateral tongue, biopsy"
//   microscopy "(A) Sections show squamous mucosa with high grade epithelial dysplasia. There is disordered
//               stratification with drop-shaped rete ridges and loss of basal polarity, marked nuclear
//               pleomorphism and hyperchromasia, and mitoses high in the epithelium. There is no evidence of
//               invasive carcinoma."
//   diagnosis  "(A) ORAL CAVITY, left lateral tongue, biopsy - HIGH GRADE DYSPLASIA"
//
// Card: docs/roadmap.md, "Oral cavity and oropharynx — biopsy + resection pair" (pulled 2026-09-25); the
// resection half is generators/oral_carcinoma.js. House phrasing from aggregate counts of the 2021-2026 biopsy
// export (no case text is kept here): the diagnosis line opens ORAL CAVITY, TONGUE, TONSIL, BUCCAL MUCOSA,
// PALATE, GINGIVA or LIP; the dysplasia grade is written "LOW GRADE DYSPLASIA" / "HIGH GRADE DYSPLASIA" more
// often than the three-tier words, so the binary grade is the default, with the three tiers one click away
// (WHO 5th edition keeps them as its primary scheme); carcinoma reads "MODERATELY DIFFERENTIATED SQUAMOUS
// CELL CARCINOMA", "WELL-DIFFERENTIATED ..." (hyphenated) and "POORLY DIFFERENTIATED ...".
// Morphology is grounded in docs/reference/oral-morphology.md, which gives the source for each sentence:
//   dysplasia criteria and the binary grade, PVL: Muller & Tilakaratne, Head Neck Pathol 2022
//     https://pmc.ncbi.nlm.nih.gov/articles/PMC9018914/ ; Thompson et al., Head Neck Pathol 2021
//     https://pmc.ncbi.nlm.nih.gov/articles/PMC8134585/ (verrucous morphology without atypia is graded as
//     mild dysplasia, so a verrucous hyperplasia closes on malignancy alone)
//   invasion in a small biopsy, and why depth cannot be given: CAP Oral Cavity protocol 4.3.0.0
//     https://documents.cap.org/protocols/HN.Oral_4.3.0.0.REL_CAPCP.pdf
//   non-keratinising and HPV-associated carcinoma: Badoual, Head Neck Pathol 2022
//     https://pmc.ncbi.nlm.nih.gov/articles/PMC9019010/ ; basaloid: El-Mofty
//     https://pmc.ncbi.nlm.nih.gov/articles/PMC4119314/ ; verrucous carcinoma
//     https://pmc.ncbi.nlm.nih.gov/articles/PMC8291099/
//   lichen planus (AAOMP 2016) https://pmc.ncbi.nlm.nih.gov/articles/PMC8212651/ ; frictional keratosis
//     https://pmc.ncbi.nlm.nih.gov/articles/PMC6405791/ ; candidosis https://pmc.ncbi.nlm.nih.gov/articles/PMC8306613/
//   fibrous lesions https://pmc.ncbi.nlm.nih.gov/articles/PMC4688387/ ; pyogenic granuloma
//     https://pmc.ncbi.nlm.nih.gov/articles/PMC4921146/ ; squamous papilloma
//     https://pmc.ncbi.nlm.nih.gov/articles/PMC6405797/ ; granular cell tumour (S100 and CD68 positive,
//     AE1/AE3 negative in the granular cells) https://pmc.ncbi.nlm.nih.gov/articles/PMC5217610/ ; mucocele
//     (extravasation vs retention) https://pmc.ncbi.nlm.nih.gov/articles/PMC4211243/
// p16 and HPV PCR are offered at oropharyngeal sites only: the CAP guideline advises against routine HPV
// testing of oral cavity carcinoma. The printed sentences describe only what is seen (docs/new-template-brief.md).
// Wording is protected by tests/oral_biopsy.test.js and tests/fixtures/oral_biopsy/.

const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
/** Lower-case an ordinary leading word ("Lateral tongue" -> "lateral tongue") but keep an abbreviation. */
const lcWord = (s) => (/^[A-Z][a-z]/.test(s || '') ? lc1(s) : s || '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};

// ---------- option strings ----------

export const DYS = 'Epithelial dysplasia';
export const CIS = 'Squamous cell carcinoma in situ';
export const SCC = 'Invasive squamous cell carcinoma';
export const VC = 'Verrucous carcinoma';
export const VH = 'Verrucous hyperplasia';
export const ASP = 'Atypical squamous proliferation';
export const NEM = 'No evidence of malignancy';
export const TWO_TIER = 'Two-tier (low / high grade)';
export const THREE_TIER = 'Three-tier (mild / moderate / severe)';
export const ORO_ORGANS = ['OROPHARYNX', 'TONSIL', 'BASE OF TONGUE'];
const GCT_IHC = 'S100 and CD68 positive, AE1/AE3 negative';

const head = (v) => v.organ || 'ORAL CAVITY';
const finding = (v) => v.finding || '';
const features = (v) => new Set(arr(v.features));
export const oroSite = (v) => ORO_ORGANS.includes(head(v));
const sideWord = (v) => (['Left', 'Right', 'Midline'].includes(v.side) ? v.side.toLowerCase() : '');

// ---------- specimen ----------

// The organ words a clinical label repeats ("left lateral tongue" on a TONGUE line). "Hard" and "soft"
// palate keep their noun, which reads better than "PALATE, left soft".
const ORGAN_WORDS = {
  'ORAL CAVITY': ['oral cavity'],
  TONGUE: ['tongue'],
  LIP: ['lips?'],
  'BUCCAL MUCOSA': ['buccal mucosa', 'buccal'],
  GINGIVA: ['gingiva', 'gingival', 'gums?'],
  PALATE: ['(?<!(?:hard|soft)\\s)palate', 'palatal'],
  'FLOOR OF MOUTH': ['floor of (?:the )?mouth'],
  OROPHARYNX: ['oropharynx', 'oropharyngeal'],
  TONSIL: ['tonsils?', 'tonsillar'],
  'BASE OF TONGUE': ['base of (?:the )?tongue', 'tongue base']
};

/** The clinical label without the side (printed from its own field) and without a repeat of the organ. */
export function labelPhrase(v) {
  let s = stripDot(v.site).replace(/\s*,\s*/g, ' ').replace(/\b(?:left|right|bilateral|midline)\b/gi, ' ');
  for (const w of ORGAN_WORDS[head(v)] || []) s = s.replace(new RegExp(`\\b${w.replace(/ /g, '\\s+')}\\b`, 'gi'), ' ');
  s = s.replace(/\s+/g, ' ').trim().replace(/\s+of(?:\s+the)?$/i, '').trim();
  return lcWord(s);
}

/** "left lateral"; the side alone when no label was given. */
export function sitePhrase(v) {
  return [sideWord(v), labelPhrase(v)].filter(Boolean).join(' ');
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return typed;
  return [cap1(head(v).toLowerCase()), sitePhrase(v), lc1(v.procedure || '')].filter(Boolean).join(', ');
}

// ---------- dysplasia and carcinoma ----------

export function dysplasiaGrade(v) {
  if (v.dysplasiaSystem === THREE_TIER) return v.dysplasiaGrade3 || '';
  return v.dysplasiaGrade || '';
}

const DYSPLASIA_MICRO = {
  'Low grade': 'There is irregular stratification with basal cell crowding and loss of basal polarity, and the nuclei are enlarged and hyperchromatic.',
  'High grade': 'There is disordered stratification with drop-shaped rete ridges and loss of basal polarity, marked nuclear pleomorphism and hyperchromasia, and mitoses high in the epithelium.',
  Mild: 'Architectural and cytological atypia is confined to the lower third of the epithelium.',
  Moderate: 'Architectural and cytological atypia extends into the middle third of the epithelium.',
  Severe: 'Architectural and cytological atypia extends into the upper third of the epithelium.'
};

const SCC_GRADE_WORD = {
  'Well differentiated': 'well-differentiated',
  'Moderately differentiated': 'moderately differentiated',
  'Poorly differentiated': 'poorly differentiated'
};
const KERATINISING_CELLS = {
  'Well differentiated': 'with abundant keratinisation, keratin pearls and intercellular bridges, and mild nuclear pleomorphism',
  'Moderately differentiated': 'with intercellular bridges, focal keratinisation and moderate nuclear pleomorphism',
  'Poorly differentiated': 'with little keratinisation, marked nuclear pleomorphism and numerous mitoses',
  'Not graded': 'with keratinisation and intercellular bridges'
};
const TYPE_MICRO = {
  'Non-keratinising': 'composed of sheets and nests of cells with a high nuclear to cytoplasmic ratio, oval to spindled nuclei and indistinct cell borders, with little or no keratinisation',
  Basaloid: 'composed of lobules of crowded basaloid cells with hyperchromatic nuclei and scant cytoplasm in a jigsaw pattern, with foci of abrupt squamous differentiation',
  Papillary: 'composed of exophytic papillae with thin fibrovascular cores, covered by immature atypical basaloid squamous cells',
  'Spindle cell': 'composed of fascicles and sheets of malignant spindle and pleomorphic cells beneath the surface epithelium'
};

const sccType = (v) => v.sccType || 'Keratinising';
const sccGrade = (v) => (sccType(v) === 'Keratinising' ? v.sccGrade || 'Not graded' : 'Not graded');
const p16 = (v) => (finding(v) === SCC && oroSite(v) ? v.p16 || 'Not performed' : 'Not performed');
const hpvPcr = (v) => (finding(v) === SCC && oroSite(v) ? v.hpvPcr || 'Not performed' : 'Not performed');
/** An oropharyngeal carcinoma with a positive p16 (the surrogate for high-risk HPV) is HPV-associated. */
export const hpvAssociated = (v) => p16(v) === 'Positive';

function carcinomaSentence(v) {
  const type = sccType(v);
  if (type === 'Keratinising') {
    // HPV-associated carcinoma is not graded (CAP HPV-associated oropharynx protocol).
    const g = hpvAssociated(v) ? 'Not graded' : sccGrade(v);
    const word = SCC_GRADE_WORD[g];
    return `Sections show ${word ? `a ${word}` : 'an'} invasive squamous cell carcinoma, composed of infiltrating nests and cords of atypical squamous cells ${KERATINISING_CELLS[g]}, within a desmoplastic stroma.`;
  }
  const name = { 'Non-keratinising': 'non-keratinising', Basaloid: 'basaloid', Papillary: 'papillary', 'Spindle cell': 'spindle cell' }[type];
  return `Sections show an invasive ${name} squamous cell carcinoma ${TYPE_MICRO[type]}.`;
}

function p16Sentence(v) {
  switch (p16(v)) {
    case 'Positive': return 'p16 immunohistochemistry shows strong, diffuse nuclear and cytoplasmic staining of the tumour cells.';
    case 'Negative': return 'p16 immunohistochemistry is negative in the tumour cells.';
    case 'Cannot be determined': return 'p16 immunohistochemistry cannot be interpreted.';
    default: return '';
  }
}
function pcrSentence(v) {
  const r = hpvPcr(v);
  return r === 'Positive' ? 'HPV PCR is positive.' : r === 'Negative' ? 'HPV PCR is negative.' : '';
}

// ---------- microscopy ----------

const OPENING = {
  [CIS]: 'Sections show squamous mucosa with full-thickness architectural and cytological atypia, loss of maturation, marked nuclear pleomorphism and mitoses high in the epithelium.',
  [VC]: 'Sections show an exophytic and endophytic squamous proliferation with hyperkeratosis and parakeratosis, and broad, bulbous rete ridges at different levels that push into the stroma. Cytological atypia is minimal.',
  [VH]: 'Sections show an exophytic hyperkeratotic squamous proliferation with a verrucous, corrugated surface. Cytological atypia is absent.',
  [ASP]: 'Sections show a squamous proliferation with cytological atypia that falls short of a definite diagnosis of dysplasia or invasive carcinoma.',
  [NEM]: 'Sections show fragments of squamous mucosa.',
  'Squamous hyperplasia': 'Sections show squamous mucosa with acanthosis and hyperkeratosis.',
  'Frictional keratosis': 'Sections show squamous mucosa with marked hyperparakeratosis, a shaggy keratin surface and epithelial hyperplasia. The superficial lamina propria contains little inflammation.',
  'Lichen planus': 'Sections show squamous mucosa with a band-like lymphocytic infiltrate at the epithelium-lamina propria interface, basal cell hydropic degeneration and lymphocytic exocytosis.',
  'Lichenoid mucositis': 'Sections show squamous mucosa with a lichenoid interface lymphocytic infiltrate and basal cell hydropic degeneration.',
  Candidiasis: 'Sections show squamous mucosa with parakeratosis containing fungal hyphae.',
  Ulcer: 'Sections show ulcerated squamous mucosa with a fibrinopurulent exudate over granulation tissue with a mixed inflammatory infiltrate.',
  'Fibroepithelial polyp': 'Sections show a polypoid lesion of dense collagen bundles with haphazardly arranged bland spindle fibroblasts, covered by squamous epithelium with flattened rete ridges.',
  Fibroma: 'Sections show a nodule of dense collagen bundles with haphazardly arranged bland spindle fibroblasts beneath squamous epithelium with atrophic rete ridges.',
  'Fibrous epulis': 'Sections show gingival mucosa over a nodule of fibrous tissue with bland fibroblasts and a chronic inflammatory infiltrate.',
  'Pyogenic granuloma': 'Sections show a polypoid lesion composed of lobules of capillary-sized vessels lined by bland endothelial cells, in an oedematous stroma with a mixed inflammatory infiltrate.',
  'Squamous papilloma': 'Sections show an exophytic papillary lesion composed of fronds of fibrovascular tissue covered by bland, maturing squamous epithelium with variable keratinisation.',
  'Granular cell tumour': 'Sections show sheets and nests of large polygonal cells with abundant eosinophilic granular cytoplasm and small central nuclei in the lamina propria, beneath squamous epithelium.',
  Mucocele: 'Sections show pools of mucin surrounded by granulation tissue with muciphages, without an epithelial lining.',
  'Mucous extravasation cyst': 'Sections show a pseudocyst containing mucin and muciphages, walled by granulation tissue without an epithelial lining.',
  Ranula: 'Sections show a mucin-filled pseudocyst walled by granulation tissue and fibrous tissue with muciphages, without an epithelial lining.',
  'Mucous retention cyst': 'Sections show a cyst lined by ductal epithelium and containing mucin.'
};

// The feature sentences, skipped where the finding already says the same thing.
const FEATURE_MICRO = [
  ['Surface ulceration', 'The surface is ulcerated.', ['Ulcer']],
  ['Granulation tissue', 'Granulation tissue is present.', ['Ulcer', 'Mucocele', 'Mucous extravasation cyst', 'Ranula']],
  ['Chronic inflammation', 'The lamina propria contains a chronic inflammatory infiltrate.', ['Fibrous epulis']],
  ['Lichenoid inflammation', 'There is a lichenoid interface lymphocytic infiltrate.', ['Lichen planus', 'Lichenoid mucositis']],
  ['Candida hyphae', 'Fungal hyphae morphologically consistent with Candida are present in the surface keratin.', ['Candidiasis']],
  ['Actinomyces colonies', 'Colonies of filamentous bacteria morphologically consistent with Actinomyces are present.', []],
  ['Koilocytes', 'Koilocytes are present in the upper epithelium.', []],
  ['Pseudoepitheliomatous hyperplasia', 'The overlying epithelium shows pseudoepitheliomatous hyperplasia.', []]
];

function keratinSentence(v) {
  const f = features(v);
  const skip = ['Squamous hyperplasia', 'Frictional keratosis', VC, VH, 'Candidiasis'].includes(finding(v));
  const hk = f.has('Hyperkeratosis') && !skip;
  const pk = f.has('Parakeratosis') && !skip;
  if (hk && pk) return 'There is hyperkeratosis and parakeratosis.';
  if (hk) return 'There is hyperkeratosis.';
  if (pk) return 'There is parakeratosis.';
  return '';
}

const candida = (v) => finding(v) === 'Candidiasis' || features(v).has('Candida hyphae');

function stainSentence(v) {
  const s = arr(v.stains).map((x) => (x === 'Grocott (GMS)' ? 'Grocott' : x));
  if (!s.length) return '';
  const names = `${listJoin(s)} stain${s.length > 1 ? 's' : ''}`;
  return candida(v) ? `${names} highlight${s.length > 1 ? '' : 's'} the fungal hyphae.` : `${names} show${s.length > 1 ? '' : 's'} no fungal organisms.`;
}

// Closing sentence: dysplasia rules out invasion; the mucosal lesions rule out dysplasia too; lesions
// with no surface change, and verrucous hyperplasia (which the PVL consensus grades as mild dysplasia
// when it has no atypia), close on malignancy alone.
const NO_DYSPLASIA = [NEM, 'Squamous hyperplasia', 'Frictional keratosis', 'Lichen planus', 'Lichenoid mucositis', 'Candidiasis', 'Ulcer', 'Fibroepithelial polyp', 'Fibroma', 'Fibrous epulis', 'Squamous papilloma'];
const NO_MALIGNANCY = [VH, 'Pyogenic granuloma', 'Granular cell tumour', 'Mucocele', 'Mucous extravasation cyst', 'Ranula', 'Mucous retention cyst'];

function closing(v) {
  const f = finding(v);
  if (f === DYS || f === CIS) return 'There is no evidence of invasive carcinoma.';
  if (NO_DYSPLASIA.includes(f)) return 'There is no evidence of dysplasia or malignancy.';
  if (NO_MALIGNANCY.includes(f)) return 'There is no evidence of malignancy.';
  return '';
}

export function microscopy(part) {
  const v = part.values;
  const f = finding(v);
  const s = [];
  if (f === DYS) {
    const g = dysplasiaGrade(v);
    s.push(`Sections show squamous mucosa with ${g ? `${g.toLowerCase()} ` : ''}epithelial dysplasia.`);
    if (DYSPLASIA_MICRO[g]) s.push(DYSPLASIA_MICRO[g]);
  } else if (f === SCC) {
    s.push(carcinomaSentence(v));
  } else if (OPENING[f]) {
    s.push(OPENING[f]);
  } else {
    s.push('Sections show fragments of squamous mucosa.');
  }
  const k = keratinSentence(v);
  if (k) s.push(k);
  const fs = features(v);
  for (const [key, sentence, redundant] of FEATURE_MICRO) if (fs.has(key) && !redundant.includes(f)) s.push(sentence);
  if (f === SCC) {
    // What the tumour shows (invasion, p16, HPV PCR) before what the biopsy cannot show.
    const inv = arr(v.invasion);
    const pni = inv.includes('Perineural invasion');
    const lvi = inv.includes('Lymphovascular invasion');
    if (pni && lvi) s.push('Perineural and lymphovascular invasion are present.');
    else if (pni) s.push('Perineural invasion is present.');
    else if (lvi) s.push('Lymphovascular invasion is present.');
    const p = p16Sentence(v);
    if (p) s.push(p);
    const r = pcrSentence(v);
    if (r) s.push(r);
    if (v.superficial === true) s.push('The biopsy is superficial and the depth of invasion cannot be assessed.');
  }
  if (f === VC && v.superficial === true) s.push('The base of the lesion is not included in the biopsy.');
  if (f === ASP) {
    if (v.atypicalReason === 'Superficial or fragmented biopsy') s.push('The biopsy is superficial and fragmented, and the relationship of the atypical epithelium to the stroma cannot be assessed.');
    if (v.atypicalReason === 'Adjacent to ulceration') s.push('The atypical epithelium lies at the edge of an ulcer.');
  }
  if (f === 'Granular cell tumour' && v.gctIhc === GCT_IHC) s.push('The granular cells are positive for S100 and CD68 and negative for AE1/AE3.');
  const st = stainSentence(v);
  if (st) s.push(st);
  const c = closing(v);
  if (c) s.push(c);
  const notes = stripDot(v.additionalNotes);
  if (notes) s.push(`${notes}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const DX = {
  [CIS]: 'SQUAMOUS CELL CARCINOMA IN SITU',
  [VC]: 'VERRUCOUS CARCINOMA',
  [ASP]: 'ATYPICAL SQUAMOUS PROLIFERATION',
  [NEM]: 'NO EVIDENCE OF MALIGNANCY',
  'Squamous hyperplasia': 'SQUAMOUS HYPERPLASIA',
  'Frictional keratosis': 'HYPERKERATOSIS, consistent with FRICTIONAL KERATOSIS',
  'Lichen planus': 'LICHEN PLANUS',
  'Lichenoid mucositis': 'LICHENOID MUCOSITIS',
  Candidiasis: 'CANDIDIASIS',
  Ulcer: 'ULCER',
  'Fibroepithelial polyp': 'FIBROEPITHELIAL POLYP',
  Fibroma: 'FIBROMA',
  'Fibrous epulis': 'FIBROUS EPULIS',
  'Pyogenic granuloma': 'PYOGENIC GRANULOMA (LOBULAR CAPILLARY HAEMANGIOMA)',
  'Squamous papilloma': 'SQUAMOUS PAPILLOMA',
  'Granular cell tumour': 'GRANULAR CELL TUMOUR',
  Mucocele: 'MUCOCELE',
  'Mucous extravasation cyst': 'MUCOUS EXTRAVASATION CYST',
  Ranula: 'RANULA',
  'Mucous retention cyst': 'MUCOUS RETENTION CYST'
};

const DYSPLASIA_DX = {
  'Low grade': 'LOW GRADE DYSPLASIA',
  'High grade': 'HIGH GRADE DYSPLASIA',
  Mild: 'MILD DYSPLASIA',
  Moderate: 'MODERATE DYSPLASIA',
  Severe: 'SEVERE DYSPLASIA'
};

const SCC_GRADE_DX = {
  'Well differentiated': 'WELL-DIFFERENTIATED SQUAMOUS CELL CARCINOMA',
  'Moderately differentiated': 'MODERATELY DIFFERENTIATED SQUAMOUS CELL CARCINOMA',
  'Poorly differentiated': 'POORLY DIFFERENTIATED SQUAMOUS CELL CARCINOMA'
};
const SCC_TYPE_DX = {
  'Non-keratinising': 'NON-KERATINISING SQUAMOUS CELL CARCINOMA',
  Basaloid: 'BASALOID SQUAMOUS CELL CARCINOMA',
  Papillary: 'PAPILLARY SQUAMOUS CELL CARCINOMA',
  'Spindle cell': 'SPINDLE CELL SQUAMOUS CELL CARCINOMA'
};

function carcinomaLine(v) {
  const type = sccType(v);
  let line;
  if (hpvAssociated(v)) {
    // "SQUAMOUS CELL CARCINOMA, NON-KERATINISING, HPV-ASSOCIATED"; the other types keep their own name.
    line = type === 'Keratinising' ? 'SQUAMOUS CELL CARCINOMA, KERATINISING, HPV-ASSOCIATED'
      : type === 'Non-keratinising' ? 'SQUAMOUS CELL CARCINOMA, NON-KERATINISING, HPV-ASSOCIATED'
        : `${SCC_TYPE_DX[type]}, HPV-ASSOCIATED`;
  } else {
    line = type === 'Keratinising' ? SCC_GRADE_DX[sccGrade(v)] || 'SQUAMOUS CELL CARCINOMA' : SCC_TYPE_DX[type];
  }
  const q = [];
  const p = p16(v);
  const r = hpvPcr(v);
  if (p === 'Positive') q.push(r === 'Positive' ? 'p16 and HPV PCR positive' : 'p16 positive');
  else if (p === 'Negative') q.push('p16 negative');
  if (r === 'Negative' && p === 'Positive') q.push('HPV PCR negative');
  if (r !== 'Not performed' && p !== 'Positive') q.push(`HPV PCR ${r.toLowerCase()}`);
  return q.length ? `${line}; ${q.join('; ')}` : line;
}

export function mainLine(v) {
  const f = finding(v);
  let line;
  if (f === DYS) line = DYSPLASIA_DX[dysplasiaGrade(v)] || 'EPITHELIAL DYSPLASIA';
  else if (f === SCC) line = carcinomaLine(v);
  else if (f === VH) line = v.pvl === true ? 'VERRUCOUS HYPERPLASIA, consistent with PROLIFERATIVE VERRUCOUS LEUKOPLAKIA' : 'VERRUCOUS HYPERPLASIA';
  else line = DX[f] || 'FINDING NOT SELECTED';
  // Organisms named in the features ride on the line ("ULCER with ACTINOMYCES").
  const fs = features(v);
  const organisms = [fs.has('Candida hyphae') && f !== 'Candidiasis' ? 'CANDIDA ORGANISMS' : '', fs.has('Actinomyces colonies') ? 'ACTINOMYCES' : ''].filter(Boolean);
  return organisms.length ? `${line} with ${organisms.join(' AND ')}` : line;
}

export function diagnosis(part) {
  const v = part.values;
  const line = [head(v), sitePhrase(v), lc1(v.procedure || '')].filter(Boolean).join(', ');
  return `(${part.label}) ${line} - ${mainLine(v)}`;
}

// ---------- checks ----------

export function validate(part) {
  const v = part.values;
  const { out, err, warn } = checks();
  const f = finding(v);
  if (!f) err('Choose the finding.', 'finding');
  if (f === DYS && !dysplasiaGrade(v)) err('Choose the dysplasia grade.', v.dysplasiaSystem === THREE_TIER ? 'dysplasiaGrade3' : 'dysplasiaGrade');
  if (f === SCC && sccType(v) === 'Keratinising' && sccGrade(v) === 'Not graded' && !hpvAssociated(v)) warn('The carcinoma is not graded.', 'sccGrade');
  if (f === SCC && oroSite(v) && p16(v) === 'Not performed') warn('Oropharyngeal carcinoma: p16 immunohistochemistry is not recorded.', 'p16');
  if (f === SCC && hpvAssociated(v) && hpvPcr(v) === 'Negative') warn('p16 positive with a negative HPV PCR: check the HPV status before the carcinoma is called HPV-associated.', 'hpvPcr');
  if (f === SCC && hpvAssociated(v) && sccType(v) === 'Keratinising' && v.sccGrade && v.sccGrade !== 'Not graded') warn('HPV-associated carcinoma is not graded; the grade does not print.', 'sccGrade');
  // Paired sites only: the palate, the floor of the mouth and the base of the tongue are often midline.
  if (!sideWord(v) && ['TONGUE', 'BUCCAL MUCOSA', 'GINGIVA', 'TONSIL'].includes(head(v))) warn('The side is not stated.', 'side');
  return out;
}

export default { specimenName, microscopy, diagnosis, validate };
