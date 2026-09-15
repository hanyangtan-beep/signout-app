import { stripDot } from './_house.js';
// Liver (benign lesion / abscess resection) generator. Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Liver, segment VI, wedge resection"
//   macro      "(A) Received in formalin is a wedge of liver labelled segment VI measuring 6 x 5 x 3 cm and
//               weighing 45 g. The capsule is intact. Sectioning shows a well-circumscribed spongy dark red lesion
//               measuring 3.5 cm, 0.5 cm from the inked parenchymal margin. The background liver is unremarkable.
//               Representative sections in 5 blocks."
//   blockKey   "(A) (1-3) Lesion with closest parenchymal margin. (4) Lesion with capsule. (5) Background liver."
//   microscopy "(A) Sections show a well-circumscribed lesion composed of dilated, thin-walled vascular channels
//               lined by flattened endothelium and separated by fibrous septa, consistent with a cavernous
//               haemangioma. Areas of thrombosis and sclerosis are seen. The lesion is completely excised. The
//               background liver shows preserved architecture with mild macrovesicular steatosis and no
//               significant fibrosis. There is no evidence of malignancy."
//   diagnosis  "(A) LIVER, segment VI, wedge resection - CAVERNOUS HAEMANGIOMA; completely excised; background
//               liver with mild steatosis"
// "Mucinous cystic neoplasm" and "Malignant" give a short diagnosis line only; the schema snippets
// `liver_mcn_template` / `liver_cancer_template` (field rules) add the comment pointing to the QMH templates.
// The `betaCateninAdenoma` flag pre-ticks the `liver_beta_catenin_adenoma` comment (malignant potential).
// Generated text writes "beta-catenin" (the style layer strips non-ASCII such as the Greek letter).
// Wording is protected by tests/liverbenign.test.js — change it only deliberately.

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
/** Normalise "–" / "—" to "-" so either spelling of an option matches. */
const norm = (s) => String(s || '').replace(/[–—]/g, '-').trim();
/** Adenoma subtype key from the option text: HNF1A / Inflammatory / betaCatenin / Unclassified. */
const adenomaKey = (s) => {
  const t = String(s || '');
  if (/^HNF1A/i.test(t)) return 'HNF1A';
  if (/^Inflammatory/i.test(t)) return 'Inflammatory';
  if (/^(β|beta)-?catenin/i.test(t)) return 'betaCatenin';
  if (/^Unclassified/i.test(t)) return 'Unclassified';
  return '';
};

export const MCN = 'Mucinous cystic neoplasm – see comment';
export const MALIGNANT = 'Malignant – see comment';
export const isMCN = (v) => norm(v.lesionType) === norm(MCN);
export const isMalignant = (v) => norm(v.lesionType) === norm(MALIGNANT);
export const needsComment = (v) => isMCN(v) || isMalignant(v);
export const isBetaCatenin = (v) => v.lesionType === 'Hepatocellular adenoma' && adenomaKey(v.adenomaSubtype) === 'betaCatenin';
export const marginsComplete = (v) => v.margin === 'Completely excised';
export const marginsInvolved = (v) => /reaches/.test(v.margin || '');

const PROCEDURE_LC = {
  'Wedge resection': 'wedge resection',
  Segmentectomy: 'segmentectomy',
  'Partial hepatectomy': 'partial hepatectomy',
  Enucleation: 'enucleation',
  'Cyst deroofing': 'cyst deroofing'
};
const procLc = (v) => PROCEDURE_LC[v.procedure] || lc1(stripDot(v.procedure)) || 'wedge resection';

/** "segment VI" as typed, normalised to lower-case "segment" and no trailing stop; '' when blank. */
export function segmentPhrase(v) {
  const s = stripDot(v.segment);
  if (!s) return '';
  return s.replace(/^Segment\b/, 'segment');
}

export function specimenName(part) {
  const v = part.values;
  const typed = (v.specimenName || '').trim();
  if (typed) return typed;
  return ['Liver', segmentPhrase(v), procLc(v)].filter(Boolean).join(', ');
}

// ---------- macroscopic description ----------

/** "6x5x3" -> "6 x 5 x 3 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

/** Margin distance typed in mm -> "0.5 cm" / "1.2 cm"; '' when blank. */
export function marginPhrase(raw) {
  const n = num(raw);
  if (n === null) return '';
  if (n === 0) return 'reaching';
  return `${fmt(Math.round(n) / 10)} cm from`;
}

const SPECIMEN_NOUN = {
  'Wedge resection': 'a wedge of liver',
  Segmentectomy: 'a segment of liver',
  'Partial hepatectomy': 'a partial hepatectomy specimen',
  Enucleation: 'an enucleated liver lesion',
  'Cyst deroofing': 'a deroofed portion of cyst wall from the liver'
};

const LESION = {
  'Spongy dark red': 'a well-circumscribed spongy dark red lesion',
  'Well-circumscribed tan': 'a well-circumscribed tan lesion',
  'Unilocular cyst with clear fluid': 'a unilocular thin-walled cyst containing clear fluid',
  'Cavity with purulent material': 'an irregular cavity containing purulent material',
  'Central scar': 'a well-circumscribed tan lesion with a central stellate scar'
};

const CAPSULE = {
  Intact: 'The capsule is intact.',
  Disrupted: 'The capsule is disrupted.'
};

const BACKGROUND_MACRO = {
  Unremarkable: 'The background liver is unremarkable.',
  Steatotic: 'The background liver is pale and steatotic.',
  Cirrhotic: 'The background liver is nodular and cirrhotic.'
};

function lesionPhrase(v) {
  if (norm(v.lesionDescription) === 'Other - describe') {
    const d = stripDot(v.lesionOther);
    return d ? `a ${lc1(d)}` : 'a lesion';
  }
  return LESION[v.lesionDescription] || (v.lesionDescription ? `a ${lc1(stripDot(v.lesionDescription))} lesion` : 'a lesion');
}

const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 5));

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = [];
  const noun = SPECIMEN_NOUN[v.procedure] || 'a piece of liver';
  const seg = segmentPhrase(v);
  const size = sizePhrase(v.dimensions);
  const w = num(v.weight);
  const measure = [size ? `measuring ${size}` : '', w !== null ? `weighing ${fmt(w)} g` : ''].filter(Boolean).join(' and ');
  let first = `Received in formalin is ${noun}`;
  if (seg) first += ` labelled ${seg}`;
  if (measure) first += ` ${measure}`;
  s.push(`${first}.`);
  if (CAPSULE[v.capsule]) s.push(CAPSULE[v.capsule]);
  const lsize = sizePhrase(v.lesionSize);
  const dist = marginPhrase(v.marginDistance);
  let lesion = `Sectioning shows ${lesionPhrase(v)}`;
  if (lsize) lesion += ` measuring ${lsize}`;
  if (dist) lesion += `, ${dist} the inked parenchymal margin`;
  s.push(`${lesion}.`);
  if (BACKGROUND_MACRO[v.backgroundMacro]) s.push(BACKGROUND_MACRO[v.backgroundMacro]);
  const blocks = blockCount(v);
  s.push(`Representative sections in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  return `(${part.label}) ${s.filter(Boolean).join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const n = blockCount(part.values);
  const keys = [];
  if (n === 1) {
    keys.push('(1) Lesion with closest parenchymal margin.');
  } else if (n === 2) {
    keys.push('(1) Lesion with closest parenchymal margin.', '(2) Background liver.');
  } else {
    const last = n - 2;
    keys.push(`${last === 1 ? '(1)' : `(1-${last})`} Lesion with closest parenchymal margin.`);
    keys.push(`(${n - 1}) Lesion with capsule.`);
    keys.push(`(${n}) Background liver.`);
  }
  return `(${part.label}) ${keys.join(' ')}`;
}

// ---------- microscopy ----------

const ORGANISMS = {
  'Not identified': 'No organisms are identified on Gram, GMS or PAS stains.',
  'Bacteria on Gram': 'Gram stain demonstrates bacterial organisms within the necrotic debris; GMS and PAS stains are negative for fungal organisms.',
  'Fungal organisms on GMS / PAS': 'GMS and PAS stains demonstrate fungal organisms within the necrotic debris.'
};

const ADENOMA_SUBTYPE = {
  HNF1A: 'The lesional hepatocytes show diffuse steatosis and loss of LFABP expression on immunohistochemistry, in keeping with an HNF1A-inactivated hepatocellular adenoma.',
  Inflammatory: 'The lesion shows sinusoidal dilatation, inflammatory infiltrates and a ductular reaction around thick-walled arteries, and the lesional hepatocytes are positive for SAA and CRP on immunohistochemistry, in keeping with an inflammatory hepatocellular adenoma.',
  betaCatenin: 'The lesional hepatocytes show nuclear beta-catenin expression and diffuse, strong glutamine synthetase staining on immunohistochemistry, in keeping with a beta-catenin-activated hepatocellular adenoma; see comment.',
  Unclassified: 'Immunohistochemistry for LFABP, SAA, CRP, beta-catenin and glutamine synthetase shows no defining pattern, in keeping with an unclassified hepatocellular adenoma.'
};

const ADENOMA_DX = {
  HNF1A: 'HEPATOCELLULAR ADENOMA, HNF1A-INACTIVATED',
  Inflammatory: 'HEPATOCELLULAR ADENOMA, INFLAMMATORY TYPE',
  betaCatenin: 'HEPATOCELLULAR ADENOMA, BETA-CATENIN-ACTIVATED',
  Unclassified: 'HEPATOCELLULAR ADENOMA, UNCLASSIFIED'
};

function lesionSentences(v) {
  const s = [];
  switch (v.lesionType) {
    case 'Pyogenic abscess':
      s.push('Sections show a cavity containing necrotic debris and abundant neutrophils, surrounded by a wall of granulation tissue and fibrous tissue with a mixed inflammatory infiltrate, consistent with a pyogenic abscess.');
      if (v.amoebic === true) s.push('The necrotic debris contains trophozoites with ingested red blood cells and there is a relative paucity of neutrophils, raising the possibility of an amoebic abscess.');
      if (ORGANISMS[v.abscessOrganisms]) s.push(ORGANISMS[v.abscessOrganisms]);
      break;
    case 'Simple biliary cyst':
      s.push('Sections show a unilocular cyst lined by a single layer of bland cuboidal to flattened biliary-type epithelium with a thin fibrous wall, consistent with a simple biliary cyst.');
      s.push('No ovarian-type stroma is identified.');
      break;
    case 'Ciliated foregut cyst':
      s.push('Sections show a cyst lined by ciliated pseudostratified columnar epithelium with an underlying layer of loose connective tissue, smooth muscle bundles and an outer fibrous capsule, consistent with a ciliated foregut cyst.');
      break;
    case 'Biliary hamartoma (von Meyenburg complex)':
      s.push('Sections show a small lesion composed of irregularly dilated bile duct-like structures lined by bland cuboidal biliary epithelium and embedded in dense fibrous stroma, consistent with a biliary hamartoma (von Meyenburg complex).');
      break;
    case 'Focal nodular hyperplasia':
      if (v.fnhScar === false) {
        s.push('Sections show a well-circumscribed, unencapsulated nodular lesion composed of benign hepatocytes arranged in nodules separated by fibrous septa containing thick-walled dystrophic arteries, a ductular reaction and a chronic inflammatory infiltrate.');
        s.push('No central scar is seen in the sections examined.');
      } else {
        s.push('Sections show a well-circumscribed, unencapsulated nodular lesion composed of benign hepatocytes arranged in nodules separated by fibrous septa radiating from a central stellate scar, which contains thick-walled dystrophic arteries, a ductular reaction and a chronic inflammatory infiltrate.');
      }
      s.push('No portal tracts are present within the lesion.');
      if (v.fnhGlutamineSynthetase === true) s.push('Glutamine synthetase immunostaining shows a map-like pattern.');
      s.push('The features are consistent with focal nodular hyperplasia.');
      break;
    case 'Hepatocellular adenoma':
      s.push('Sections show a well-circumscribed, unencapsulated proliferation of benign-appearing hepatocytes arranged in plates one to two cells thick, with unpaired arteries and an absence of portal tracts.');
      s.push('No significant cytological atypia, pseudoglandular formation or loss of the reticulin framework is seen.');
      s.push(ADENOMA_SUBTYPE[adenomaKey(v.adenomaSubtype)] || 'The features are consistent with a hepatocellular adenoma.');
      break;
    case 'Hydatid cyst':
      s.push('Sections show a cyst with an acellular, laminated eosinophilic membrane and an inner germinal layer, surrounded by a fibrous pericyst with a chronic inflammatory infiltrate including eosinophils and palisading histiocytes.');
      s.push(v.protoscolices === true ? 'Protoscolices with hooklets are identified.' : 'No protoscolices are identified in the sections examined.');
      s.push('The features are consistent with a hydatid cyst (Echinococcus).');
      break;
    default:
      if (isMCN(v)) {
        s.push('Sections show a multilocular cyst lined by mucinous columnar epithelium overlying a cellular ovarian-type stroma.');
        if (v.mcnIhc !== false) s.push('The stromal cells are positive for ER, PR and inhibin on immunohistochemistry.');
        s.push('The features are those of a mucinous cystic neoplasm; see comment.');
      } else if (isMalignant(v)) {
        s.push('Sections show a malignant neoplasm within the liver parenchyma; see comment.');
      } else {
        // Cavernous haemangioma (default)
        s.push('Sections show a well-circumscribed lesion composed of dilated, thin-walled vascular channels lined by flattened endothelium and separated by fibrous septa, consistent with a cavernous haemangioma.');
        const extra = [v.haemThrombosis === true ? 'thrombosis' : '', v.haemSclerosis === true ? 'sclerosis' : ''].filter(Boolean);
        if (extra.length) s.push(`Areas of ${listJoin(extra)} are seen.`);
      }
  }
  return s;
}

const STEATOSIS_MICRO = {
  'Mild (<33%)': 'mild macrovesicular steatosis',
  'Moderate (33–66%)': 'moderate macrovesicular steatosis',
  'Moderate (33-66%)': 'moderate macrovesicular steatosis',
  'Severe (>66%)': 'severe macrovesicular steatosis'
};
const FIBROSIS_MICRO = {
  Portal: 'portal fibrosis',
  Periportal: 'periportal fibrosis',
  Bridging: 'bridging fibrosis'
};

export function backgroundSentence(v) {
  const steat = STEATOSIS_MICRO[v.steatosis] || 'no significant steatosis';
  const infl = v.inflammation === true ? 'mild portal and lobular chronic inflammation' : '';
  if (v.fibrosis === 'Cirrhosis') {
    return `The background liver shows an established cirrhosis with regenerative nodules surrounded by fibrous septa, with ${listJoin([steat, infl])}.`;
  }
  const fib = FIBROSIS_MICRO[v.fibrosis] || 'no significant fibrosis';
  return `The background liver shows preserved architecture with ${listJoin([steat, infl, fib])}.`;
}

function marginSentence(v) {
  if (marginsComplete(v)) return 'The lesion is completely excised.';
  if (marginsInvolved(v)) return 'The lesion reaches the parenchymal margin.';
  return '';
}

export function microscopy(part) {
  const v = part.values;
  const s = [...lesionSentences(v)];
  const m = marginSentence(v);
  if (m) s.push(m);
  s.push(backgroundSentence(v));
  if (!needsComment(v)) s.push('There is no evidence of malignancy.');
  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const MAIN = {
  'Cavernous haemangioma': 'CAVERNOUS HAEMANGIOMA',
  'Pyogenic abscess': 'PYOGENIC ABSCESS',
  'Simple biliary cyst': 'SIMPLE BILIARY CYST',
  'Ciliated foregut cyst': 'CILIATED FOREGUT CYST',
  'Biliary hamartoma (von Meyenburg complex)': 'BILIARY HAMARTOMA (VON MEYENBURG COMPLEX)',
  'Focal nodular hyperplasia': 'FOCAL NODULAR HYPERPLASIA',
  'Hydatid cyst': 'HYDATID CYST'
};

const STEATOSIS_DX = {
  'Mild (<33%)': 'mild steatosis',
  'Moderate (33–66%)': 'moderate steatosis',
  'Moderate (33-66%)': 'moderate steatosis',
  'Severe (>66%)': 'severe steatosis'
};
const FIBROSIS_DX = {
  Portal: 'portal fibrosis',
  Periportal: 'periportal fibrosis',
  Bridging: 'bridging fibrosis',
  Cirrhosis: 'cirrhosis'
};

/** "background liver with mild steatosis and bridging fibrosis"; '' when the background is unremarkable. */
export function backgroundClause(v) {
  const items = [STEATOSIS_DX[v.steatosis], v.inflammation === true ? 'mild chronic inflammation' : '', FIBROSIS_DX[v.fibrosis]].filter(Boolean);
  return items.length ? `background liver with ${listJoin(items)}` : '';
}

export function diagnosis(part) {
  const v = part.values;
  const clauses = [];
  if (isMCN(v)) clauses.push('MUCINOUS CYSTIC NEOPLASM');
  else if (isMalignant(v)) clauses.push('MALIGNANT NEOPLASM');
  else if (v.lesionType === 'Hepatocellular adenoma') clauses.push(ADENOMA_DX[adenomaKey(v.adenomaSubtype)] || 'HEPATOCELLULAR ADENOMA');
  else clauses.push(MAIN[v.lesionType] || String(v.lesionType || 'CAVERNOUS HAEMANGIOMA').toUpperCase());
  if (v.lesionType === 'Pyogenic abscess' && v.amoebic === true) clauses.push('features suggestive of amoebic abscess');
  if (marginsComplete(v)) clauses.push('completely excised');
  else if (marginsInvolved(v)) clauses.push('lesion reaches the parenchymal margin');
  const bg = backgroundClause(v);
  if (bg) clauses.push(bg);
  if (needsComment(v) || isBetaCatenin(v)) clauses.push('see comment');
  const head = ['LIVER', segmentPhrase(v), procLc(v)].filter(Boolean).join(', ');
  return `(${part.label}) ${head} - ${clauses.join('; ')}`;
}

// ---------- case-level flags for the auto comments ----------

/** `betaCateninAdenoma`: any part is a β-catenin-activated hepatocellular adenoma (drives the malignant-potential comment). */
export function flags(parts) {
  const out = [];
  if (parts.some((p) => isBetaCatenin(p.values))) out.push('betaCateninAdenoma');
  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, flags };
