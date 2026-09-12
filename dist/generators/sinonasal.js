// Nasal polyps / sinonasal biopsy generator. Pure functions: (part, ctx) -> string.
// Benign resection template (Phase 4b, roadmap item 13). Blocks:
//   macro      "(A) Received in formalin are multiple polypoid pieces of glistening translucent tissue measuring 3 x 2 x 1 cm in aggregate. All embedded in 2 blocks."
//   blockKey   "(A) (1-2) Polyps, all embedded."
//   microscopy "(A) Sections show polypoid fragments of sinonasal mucosa lined by respiratory epithelium with basement membrane thickening. ..."
//   diagnosis  "(A) NASAL CAVITY, polyps, polypectomy - INFLAMMATORY (OEDEMATOUS) SINONASAL POLYPS; no evidence of dysplasia or malignancy"
// Malignancy gives a short capitalised line only; the synoptic report belongs to the QMH head and
// neck cancer template (the schema's auto snippet says so in the COMMENT block). Invasive fungal
// sinusitis, inverted papilloma and the NK/T-cell lymphoma flag also auto-tick their comments.
// Wording is protected by tests/sinonasal.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};

export const OEDEMATOUS = 'Inflammatory polyp, oedematous';
export const FIBROUS = 'Inflammatory polyp, fibrous';
export const ANTROCHOANAL = 'Antrochoanal polyp';
export const REAH = 'Respiratory epithelial adenomatoid hamartoma';
export const INVERTED = 'Sinonasal papilloma, inverted';
export const EXOPHYTIC = 'Sinonasal papilloma, exophytic';
export const GRANULOMATOUS = 'Granulomatous inflammation';
export const MALIGNANT = 'Malignant - see comment (QMH head and neck template)';

export const FUNGUS_NONE = 'None';
export const FUNGUS_AFS = 'Present on GMS, non-invasive - allergic fungal sinusitis';
export const FUNGUS_BALL = 'Fungal ball';
export const FUNGUS_INVASIVE = 'Invasive, angioinvasion';

export const isMalignant = (v) => v.lesion === MALIGNANT;
export const isPapilloma = (v) => v.lesion === INVERTED || v.lesion === EXOPHYTIC;
const isGranulomatous = (v) => v.lesion === GRANULOMATOUS;
const isInflammatoryPolyp = (v) => v.lesion === OEDEMATOUS || v.lesion === FIBROUS || !v.lesion;
const hasDysplasia = (v) => isPapilloma(v) && (v.dysplasia === 'Low grade' || v.dysplasia === 'High grade');
const suspicious = (v) => v.lymphomaSuspicion === true || v.lymphomaSuspicion === 'true';
const mucin = (v) => v.allergicMucin === true || v.allergicMucin === 'true';

/** Free-text size: "3x2x1" -> "3 x 2 x 1 cm"; "12 mm" unchanged. */
function sizeText(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

/** Procedure word as printed after the site: "polypectomy" / "FESS" / "biopsy" / "turbinectomy". */
export function procedureWord(v) {
  switch (v.procedure) {
    case 'FESS': return 'FESS';
    case 'Biopsy': return 'biopsy';
    case 'Turbinectomy': return 'turbinectomy';
    default: return 'polypectomy';
  }
}

/** Specimen text as received, trimmed, trailing punctuation dropped. */
function specimenText(v) {
  return String(v.specimenName || '').trim().replace(/[.,;\s]+$/, '');
}

/** "Bilateral nasal polyps, FESS" / "Nasal polyps, polypectomy". */
export function specimenName(part) {
  const v = part.values;
  const s = specimenText(v) || 'Nasal polyps';
  return `${s}, ${procedureWord(v)}`;
}

const SINUS_WORDS = /\b(sinus|sinuses|ethmoid|ethmoidal|maxillary|antrum|antral|sphenoid|sphenoidal|frontal)\b/i;

/**
 * "NASAL CAVITY, polyps, polypectomy" / "NASAL CAVITY, bilateral polyps, FESS" /
 * "PARANASAL SINUS, left ethmoid, FESS" / "NASAL CAVITY, left inferior turbinate, turbinectomy".
 * Built from the specimen text: laterality, sinus / turbinate / septum words and "polyps".
 */
export function organPhrase(part) {
  const v = part.values;
  const text = specimenText(v);
  const lower = text.toLowerCase();
  const organ = SINUS_WORDS.test(lower) ? 'PARANASAL SINUS' : 'NASAL CAVITY';
  const bits = [];
  const lat = lower.match(/\b(bilateral|right|left)\b/);
  if (lat) bits.push(lat[1]);
  const site = lower.match(/\b((?:anterior |posterior )?(?:inferior |middle |superior )?(?:ethmoid(?:al)?|maxillary|sphenoid(?:al)?|frontal|antrum|antral|turbinate|septum|septal|nasopharynx|nasopharyngeal|middle meatus|choana|vestibule)(?: sinus(?:es)?| antrum)?)\b/);
  if (site) bits.push(site[1].replace(/\bantral\b/, 'antrum').replace(/\bseptal\b/, 'septum').replace(/\bnasopharyngeal\b/, 'nasopharynx').replace(/\bethmoidal\b/, 'ethmoid').replace(/\bsphenoidal\b/, 'sphenoid'));
  if (/\bpolyps?\b/.test(lower) || (!text && v.procedure !== 'Biopsy' && v.procedure !== 'Turbinectomy')) bits.push(/\bpolyp\b/.test(lower) && !/\bpolyps\b/.test(lower) ? 'polyp' : 'polyps');
  let siteClause = bits.join(' ');
  if (!siteClause && text) siteClause = lower.replace(/\bnasal\b/g, '').replace(/\s+/g, ' ').trim();
  return `${organ}${siteClause ? `, ${siteClause}` : ''}, ${procedureWord(v)}`;
}

// ---------- macroscopic description ----------

const FRAGMENT_WORDS = { One: 'a', Two: 'two', Three: 'three', Several: 'several', Multiple: 'multiple' };
const APPEARANCE_WORDS = {
  'Glistening translucent': 'glistening translucent',
  Fleshy: 'fleshy',
  Papillary: 'papillary',
  'Firm tan': 'firm tan',
  'Mucoid / inspissated': 'mucoid inspissated'
};

function blockCount(v, fallback = 2) {
  return Math.max(1, Math.round(num(v.blocks) ?? fallback));
}
const blockNoun = (n) => (n === 1 ? 'block' : 'blocks');
const single = (v) => v.fragments === 'One';

function blockSentence(v) {
  const blocks = blockCount(v);
  if (v.allEmbedded === 'Representative sections') return `Representative sections in ${blocks} ${blockNoun(blocks)}.`;
  return `All embedded in ${blocks} ${blockNoun(blocks)}.`;
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const count = FRAGMENT_WORDS[v.fragments] || 'multiple';
  const one = single(v);
  const look = APPEARANCE_WORDS[v.appearance] || '';
  const polypoid = v.procedure === 'Biopsy' ? '' : 'polypoid ';
  const noun = v.appearance === 'Mucoid / inspissated'
    ? `${one ? 'piece' : 'pieces'} of mucoid inspissated material`
    : `${polypoid}${one ? 'piece' : 'pieces'} of ${look ? `${look} ` : ''}tissue`;
  const size = sizeText(v.aggregateSize);
  const measure = size ? ` measuring ${size}${one ? '' : ' in aggregate'}` : '';
  const s = [`Received in formalin ${one ? 'is' : 'are'} ${count} ${noun}${measure}.`, blockSentence(v)];
  return `(${part.label}) ${s.join(' ')}`;
}

/** "(1)" or "(1-2)" for a block range. */
const range = (from, to) => (from === to ? `(${from})` : `(${from}-${to})`);

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const blocks = blockCount(v);
  let noun = single(v) ? 'Polyp' : 'Polyps';
  if (v.procedure === 'Biopsy') noun = 'Biopsy';
  else if (v.procedure === 'Turbinectomy') noun = 'Turbinate';
  const how = v.allEmbedded === 'Representative sections' ? 'representative sections' : 'all embedded';
  return `(${part.label}) ${range(1, blocks)} ${noun}, ${how}.`;
}

// ---------- microscopy ----------

/** "lined by respiratory epithelium with basement membrane thickening" (epithelium + basement membrane). */
function liningPhrase(v) {
  const bm = v.basementMembrane === 'Present';
  if (v.epithelium === 'Ulcerated') {
    return `with surface ulceration and granulation tissue${bm ? ' and basement membrane thickening of the residual epithelium' : ''}`;
  }
  const base = 'lined by respiratory epithelium';
  const extras = [];
  if (v.epithelium === 'Squamous metaplasia') extras.push('focal squamous metaplasia');
  if (bm) extras.push('basement membrane thickening');
  return extras.length ? `${base} with ${extras.join(' and ')}` : base;
}

/** "a mixed inflammatory infiltrate rich in eosinophils" etc. */
function infiltratePhrase(v) {
  switch (v.infiltrate) {
    case 'Neutrophil-rich': return 'a neutrophil-rich inflammatory infiltrate';
    case 'Mixed': return 'a mixed chronic inflammatory infiltrate';
    case 'Sparse': return 'a sparse inflammatory infiltrate';
    default: return 'a mixed inflammatory infiltrate rich in eosinophils';
  }
}

/** Stroma sentence: "The oedematous stroma contains a mixed inflammatory infiltrate rich in eosinophils and seromucinous glands." */
function stromaSentence(v, stromaWord) {
  const glands = v.glandHyperplasia === 'Present' ? ' and seromucinous glands' : '';
  return `The ${stromaWord} stroma contains ${infiltratePhrase(v)}${glands}.`;
}

function mucinSentences(v) {
  const s = [];
  if (mucin(v)) s.push('Allergic mucin containing degenerating eosinophils and Charcot-Leyden crystals is present.');
  switch (v.fungus) {
    case FUNGUS_AFS:
      s.push(`GMS and PAS stains demonstrate non-invasive fungal hyphae within the ${mucin(v) ? 'allergic ' : ''}mucin; there is no tissue invasion. The features are in keeping with allergic fungal sinusitis.`);
      break;
    case FUNGUS_BALL:
      s.push('A dense mat of tangled fungal hyphae is present, highlighted by GMS and PAS stains, without tissue invasion, in keeping with a fungal ball (mycetoma).');
      break;
    case FUNGUS_INVASIVE:
      s.push('GMS and PAS stains demonstrate fungal hyphae invading the mucosa with angioinvasion and associated necrosis, in keeping with invasive fungal sinusitis (see comment).');
      break;
    default:
      s.push('No fungal hyphae are seen on GMS.');
  }
  return s;
}

function granulomaSentences(v) {
  switch (v.granulomaPattern) {
    case 'Sarcoid-type':
      return ['Well-formed non-necrotising epithelioid granulomas are present. No organisms are seen on GMS and Ziehl-Neelsen stains. The features are in keeping with a sarcoid-type granulomatous reaction; clinical correlation is recommended.'];
    case 'TB - AFB':
      return ['Necrotising granulomas with caseous necrosis are present, raising the possibility of tuberculosis. Correlation with the Ziehl-Neelsen stain for acid-fast bacilli and with mycobacterial culture or PCR is recommended.'];
    default:
      return ['There is necrotising granulomatous inflammation with geographic basophilic necrosis, scattered multinucleated giant cells and a small vessel vasculitis. No organisms are seen on GMS and Ziehl-Neelsen stains. The features raise the possibility of granulomatosis with polyangiitis; correlation with ANCA serology is recommended.'];
  }
}

export function microscopy(part) {
  const v = part.values;
  const s = [];
  const one = single(v);
  const frag = one ? 'a polypoid fragment' : 'polypoid fragments';

  switch (v.lesion) {
    case FIBROUS:
      s.push(`Sections show ${frag} of sinonasal mucosa ${liningPhrase(v)}.`);
      s.push(stromaSentence(v, 'fibrous'));
      s.push(...mucinSentences(v));
      break;
    case ANTROCHOANAL:
      s.push(`Sections show ${frag} of sinonasal mucosa ${liningPhrase(v)}.`);
      s.push(`The stroma is oedematous and fibrous with scattered stellate cells${v.glandHyperplasia === 'Present' ? ' and seromucinous glands' : ' and few seromucinous glands'}, and contains ${infiltratePhrase(v)}.`);
      s.push(...mucinSentences(v));
      s.push('The features are those of an antrochoanal polyp.');
      break;
    case REAH:
      s.push(`Sections show polypoid sinonasal mucosa ${liningPhrase(v)}.`);
      s.push(`Beneath the surface there is a proliferation of glands lined by ciliated respiratory epithelium in direct continuity with the surface epithelium, invested by thickened eosinophilic basement membranes and set in a fibrous stroma containing ${infiltratePhrase(v)}.`);
      s.push(...mucinSentences(v));
      s.push('The features are those of a respiratory epithelial adenomatoid hamartoma.');
      break;
    case INVERTED:
    case EXOPHYTIC: {
      const pattern = v.lesion === INVERTED
        ? 'growing in an endophytic (inverted) pattern into the underlying stroma'
        : 'growing in an exophytic papillary pattern over fibrovascular cores';
      s.push(`Sections show a sinonasal papilloma composed of thickened non-keratinising squamous and transitional-type epithelium with interspersed mucous cells and transmigrating neutrophils, ${pattern}.`);
      if (v.epithelium === 'Squamous metaplasia') s.push('The adjacent surface epithelium shows squamous metaplasia.');
      else if (v.epithelium === 'Ulcerated') s.push('The surface is focally ulcerated.');
      if (v.dysplasia === 'Low grade') s.push('Low-grade dysplasia is present.');
      else if (v.dysplasia === 'High grade') s.push('High-grade dysplasia is present.');
      else s.push('There is no dysplasia.');
      if (v.fungus !== FUNGUS_NONE || mucin(v)) s.push(...mucinSentences(v));
      s.push(`The features are those of an ${v.lesion === INVERTED ? 'inverted' : 'exophytic'} sinonasal papilloma${v.lesion === INVERTED ? ' (see comment)' : ''}.`);
      break;
    }
    case GRANULOMATOUS:
      s.push(`Sections show ${one ? 'a fragment' : 'fragments'} of sinonasal mucosa ${liningPhrase(v)}.`);
      s.push(`The stroma contains ${infiltratePhrase(v)}${v.glandHyperplasia === 'Present' ? ' and seromucinous glands' : ''}.`);
      s.push(...granulomaSentences(v));
      if (v.fungus !== FUNGUS_NONE || mucin(v)) s.push(...mucinSentences(v));
      break;
    case MALIGNANT:
      s.push(`Sections show ${one ? 'a fragment' : 'fragments'} of sinonasal mucosa ${liningPhrase(v)}.`);
      if (v.fungus !== FUNGUS_NONE || mucin(v)) s.push(...mucinSentences(v));
      break;
    default: // oedematous inflammatory polyp (house paragraph)
      s.push(`Sections show ${frag} of sinonasal mucosa ${liningPhrase(v)}.`);
      s.push(stromaSentence(v, 'oedematous'));
      s.push(...mucinSentences(v));
  }

  if (suspicious(v)) s.push('In addition, there is an atypical lymphoid infiltrate with angiocentric growth and necrosis (see comment).');
  if (isMalignant(v)) s.push('In addition, there is a malignant neoplasm (see comment).');
  else if (!suspicious(v)) s.push(hasDysplasia(v) ? 'There is no evidence of invasive malignancy.' : 'There is no evidence of dysplasia or malignancy.');

  const notes = String(v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

/** Main entity in capitals. */
export function mainClause(v) {
  const plural = single(v) ? 'POLYP' : 'POLYPS';
  switch (v.lesion) {
    case FIBROUS: return `INFLAMMATORY (FIBROUS) SINONASAL ${plural}`;
    case ANTROCHOANAL: return 'ANTROCHOANAL POLYP';
    case REAH: return 'RESPIRATORY EPITHELIAL ADENOMATOID HAMARTOMA';
    case INVERTED: return 'SINONASAL PAPILLOMA, INVERTED TYPE';
    case EXOPHYTIC: return 'SINONASAL PAPILLOMA, EXOPHYTIC TYPE';
    case GRANULOMATOUS:
      if (v.granulomaPattern === 'Sarcoid-type') return 'NON-NECROTISING GRANULOMATOUS INFLAMMATION, sarcoid-type';
      if (v.granulomaPattern === 'TB - AFB') return 'NECROTISING GRANULOMATOUS INFLAMMATION; tuberculosis to be excluded (AFB / culture)';
      return 'NECROTISING GRANULOMATOUS INFLAMMATION WITH VASCULITIS; features suggestive of granulomatosis with polyangiitis - correlate with ANCA serology';
    case MALIGNANT: return 'MALIGNANT NEOPLASM - SEE COMMENT';
    default: return `INFLAMMATORY (OEDEMATOUS) SINONASAL ${plural}`;
  }
}

function fungalClause(v) {
  switch (v.fungus) {
    case FUNGUS_AFS: return 'ALLERGIC FUNGAL SINUSITIS - non-invasive fungal hyphae on GMS';
    case FUNGUS_BALL: return 'FUNGAL BALL (MYCETOMA), non-invasive';
    case FUNGUS_INVASIVE: return 'INVASIVE FUNGAL SINUSITIS WITH ANGIOINVASION - SEE COMMENT';
    default: return '';
  }
}

export function diagnosis(part) {
  const v = part.values;
  const clauses = [];
  const fungal = fungalClause(v);

  if (isMalignant(v)) {
    clauses.push(mainClause(v));
    if (fungal) clauses.push(fungal);
  } else {
    if (v.fungus === FUNGUS_INVASIVE) {
      clauses.push(fungal);
      if (isInflammatoryPolyp(v)) clauses.push(mainClause(v).toLowerCase());
      else clauses.push(mainClause(v));
    } else {
      clauses.push(mainClause(v));
      if (fungal) clauses.push(fungal);
    }
    if (mucin(v) && v.fungus !== FUNGUS_AFS) clauses.push('allergic mucin with Charcot-Leyden crystals present');
    if (isPapilloma(v)) {
      if (v.dysplasia === 'High grade') clauses.push('HIGH-GRADE DYSPLASIA');
      else if (v.dysplasia === 'Low grade') clauses.push('low-grade dysplasia');
    }
    if (v.epithelium === 'Ulcerated') clauses.push('surface ulceration');
    if (suspicious(v)) clauses.push('ATYPICAL LYMPHOID INFILTRATE - SEE COMMENT');
    else if (isGranulomatous(v)) clauses.push('no evidence of malignancy');
    else if (hasDysplasia(v)) clauses.push('no evidence of invasive malignancy');
    else clauses.push('no evidence of dysplasia or malignancy');
    if (v.lesion === INVERTED && v.fungus !== FUNGUS_INVASIVE) clauses.push('see comment');
  }
  return `(${part.label}) ${organPhrase(part)} - ${clauses.filter(Boolean).join('; ')}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
