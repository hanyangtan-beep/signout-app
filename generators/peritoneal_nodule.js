// Peritoneal nodule biopsy (biopsy). Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Omentum, nodule, biopsy"
//   microscopy "(A) Sections show fibroadipose tissue involved by adenocarcinoma forming cribriform glands of tall
//               columnar cells, with luminal necrotic debris. On immunohistochemistry, the tumour cells are positive
//               for CK20, CDX2 and SATB2, and negative for CK7."
//   diagnosis  "(A) OMENTUM, nodule, biopsy - METASTATIC ADENOCARCINOMA, in keeping with colorectal primary"
//
// Card: docs/roadmap.md "Peritoneal nodule biopsy" (pulled by the user 2026-10-07). Grounding, with a source URL beside
// every statement: docs/reference/peritoneal_nodule-morphology.md. No QMH, CAP or ICCR template covers a peritoneal
// biopsy; the mesothelial work-up follows the IMIG 2024 guideline
// (https://orca.cardiff.ac.uk/id/eprint/173721/1/i1543-2165-148-11-1251.pdf) and the ICCR mesothelioma dataset
// (https://www.iccr-cancer.org/wp-content/uploads/2023/05/ICCR-Mesothelioma-3rd-ed-v3.1-bookmark.pdf): "mesothelioma"
// rather than "malignant mesothelioma", the renamed well-differentiated papillary mesothelial tumour, and BAP1 / MTAP
// read only when lost.
//
// House phrasing, from aggregate counts only (161 non-resection peritoneal, omental and mesenteric parts in the
// 2021-2026 biopsy and 2024-2026 LIS exports; no case text is kept here):
//   - the line opens on the site in capitals with the rest in lower case: OMENTUM (24 heads), POUCH OF DOUGLAS (14)
//     and SOFT TISSUE (13, the "SOFT TISSUE, <site>, ..." form, kept as the head-style switch); the second segment
//     is "biopsy" (37) or "excision" (37), and "nodule" is the commonest lesion word;
//   - 70 diagnosis lines say "no evidence of malignancy" and 53 of them say nothing else, so the no-lesion category
//     prints NO EVIDENCE OF MALIGNANCY alone; a named benign entity prints with no trailing negative (house rule);
//   - malignant lines open METASTATIC (24) or INVOLVED BY (24), the lead switch; high-grade serous carcinoma is the
//     commonest named tumour (16);
//   - microscopy opens "Sections show" (101 of 122), the tissue is fibroadipose (51) or adipose, and "involved by"
//     is the house verb for a deposit.
// The immunohistochemistry is one sentence in the microscopy paragraph ("On immunohistochemistry, the tumour cells
// are positive for ..., and negative for ..."), the form of the liver lesion biopsy, whose typed-stain parser reads
// the "Other stains" box here.
// Wording is protected by tests/peritoneal_nodule.test.js and tests/fixtures/peritoneal_nodule/.

import { stripDot, checks } from './_house.js';
import { parseIhc } from './liver_lesion_biopsy.js';

const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const joinWith = (word) => (items) => {
  const a = items.filter(Boolean);
  return a.length <= 1 ? a[0] || '' : `${a.slice(0, -1).join(', ')} ${word} ${a[a.length - 1]}`;
};
const listJoin = joinWith('and');
const listOr = joinWith('or');
// Sentence-initial stain names: "BAP1 ...", "Calretinin ..."; p53 and p16 keep their lower case.
const capStain = (s) => (/^p[A-Z0-9]/.test(s) ? s : uc1(s));

// ---------- option strings ----------

export const NEM = 'No evidence of malignancy';
export const RMH = 'Reactive mesothelial hyperplasia';
export const LOOSE_BODY = 'Peritoneal loose body';
export const ENDOMETRIOSIS = 'Endometriosis';
export const ENDOSALPINGIOSIS = 'Endosalpingiosis';
export const FAT_NECROSIS = 'Fat necrosis';
export const FIBROSIS = 'Fibrous adhesion / fibrosis';
export const GRANULOMA = 'Granulomatous inflammation';
export const SPLENOSIS = 'Splenosis';
export const DECIDUOSIS = 'Deciduosis';
export const WDPMT = 'Well-differentiated papillary mesothelial tumour';
export const METASTATIC = 'Metastatic carcinoma';
export const MESOTHELIOMA = 'Mesothelioma';
export const OTHER = 'Other (specify)';
export const UNCERTAIN = 'Uncertain – see comment';
/** The categories the sampling-caveat comment is offered for. */
export const BENIGN = [NEM, RMH, LOOSE_BODY, ENDOMETRIOSIS, ENDOSALPINGIOSIS, FAT_NECROSIS, FIBROSIS, GRANULOMA, SPLENOSIS, DECIDUOSIS];
export const MESOTHELIAL = [RMH, WDPMT, MESOTHELIOMA];
/** The marker chips, in family order: keratin, mesothelial, epithelial, then site markers (IMIG 2024 panel). */
export const MARKERS = ['AE1/AE3', 'calretinin', 'WT1', 'D2-40', 'CK5/6', 'BerEP4', 'MOC31', 'claudin-4', 'CK7', 'CK20', 'CDX2', 'SATB2', 'PAX8', 'GATA3', 'TTF-1', 'ER', 'PR'];
const MESOTHELIAL_MARKERS = ['calretinin', 'WT1', 'D2-40', 'CK5/6'];
const EPITHELIAL_MARKERS = ['BerEP4', 'MOC31', 'claudin-4'];
// The carcinoma markers IMIG 2024 counts towards the two negatives a mesothelioma diagnosis wants.
const CARCINOMA_MARKERS = [...EPITHELIAL_MARKERS, 'CEA', 'TTF-1', 'PAX8', 'ER', 'CDX2', 'SATB2', 'GATA3'];
// Typed names the liver stain map does not carry, normalised the same way (lower case, no spaces or punctuation).
const LOCAL_STAIN = { d240: 'D2-40', podoplanin: 'D2-40', claudin4: 'claudin-4', cldn4: 'claudin-4', bap1: 'BAP1', mtap: 'MTAP' };
const localName = (name) => LOCAL_STAIN[String(name).toLowerCase().replace(/[\s\-–./()]/g, '')] || name;

const dxOf = (v) => v.dx || NEM;

// ---------- the specimen line ----------

const SITE_WORDS = {
  'Parietal peritoneum': 'peritoneum', Omentum: 'omentum', Mesentery: 'mesentery', 'Pelvic peritoneum': 'pelvic peritoneum',
  'Pouch of Douglas': 'pouch of Douglas', 'Paracolic gutter': 'paracolic gutter', Diaphragm: 'diaphragm', 'Serosa of a named organ': 'serosa'
};
const SIDED = ['Paracolic gutter', 'Diaphragm', 'Pelvic peritoneum'];
const ORGANED = ['Mesentery', 'Serosa of a named organ'];
const LESION = { Nodule: 'nodule', Nodules: 'nodules', Deposit: 'deposit', Deposits: 'deposits', Plaque: 'plaque' };

/** The site in running-text case: "left paracolic gutter", "small bowel mesentery", "pouch of Douglas". */
export function siteWords(v) {
  const site = v.site || 'Parietal peritoneum';
  if (site === OTHER) return lc1(stripDot(v.siteOther)) || 'peritoneum';
  const side = SIDED.includes(site) && v.side ? `${v.side.toLowerCase()} ` : '';
  const organ = ORGANED.includes(site) && stripDot(v.organ) ? `${lc1(stripDot(v.organ))} ` : '';
  return `${side}${organ}${SITE_WORDS[site] || 'peritoneum'}`;
}

function segments(v) {
  const rest = [LESION[v.lesion], v.procedure === 'Excision' ? 'excision' : 'biopsy'].filter(Boolean);
  return v.headStyle === 'Soft tissue' ? ['soft tissue', siteWords(v), ...rest] : [siteWords(v), ...rest];
}

/** "Omentum, nodule, biopsy" — the SPECIMEN block line. */
export function specimenName(part) {
  const [head, ...rest] = segments(part.values);
  return [uc1(head), ...rest].join(', ');
}

/** "OMENTUM, nodule, biopsy" — the head of the diagnosis line. */
export function organPhrase(part) {
  const [head, ...rest] = segments(part.values);
  return [head.toUpperCase(), ...rest].join(', ');
}

// ---------- immunohistochemistry ----------

const P53_SENTENCE = {
  'Wild-type pattern': 'p53 shows a wild-type staining pattern.',
  'Aberrant, overexpression': 'p53 shows aberrant (mutation-type) overexpression.',
  'Aberrant, null': 'p53 shows an aberrant (mutation-type) null pattern.',
  'Aberrant, cytoplasmic': 'p53 shows aberrant (mutation-type) cytoplasmic staining.'
};

function cellNoun(v) {
  switch (dxOf(v)) {
    case METASTATIC: case MESOTHELIOMA: return 'the tumour cells';
    case NEM: case RMH: return 'the mesothelial cells';
    case WDPMT: return 'the lining cells';
    case ENDOSALPINGIOSIS: return 'the glandular cells';
    case DECIDUOSIS: return 'the decidual cells';
    default: return 'the lesional cells';
  }
}

/**
 * Every stain result recorded on the part: the ticked chips, the typed box (focal, weak, retained and lost results
 * and a Ki-67 index are read there) and the BAP1 / MTAP selects. A name appears once, first entry wins.
 */
export function ihcResults(v) {
  const typed = parseIhc(v.ihcOther);
  const out = { pos: [], focal: [], weak: [], neg: [], retained: [], lost: [], unparsed: typed.unparsed, ki67: typed.ki67 };
  const seen = new Set();
  const add = (key, name, note = '') => {
    if (seen.has(name)) return;
    seen.add(name);
    out[key].push(note ? `${name} ${note}` : name);
  };
  for (const m of arr(v.ihcPos)) add('pos', m);
  for (const m of arr(v.ihcNeg)) add('neg', m);
  for (const r of typed.results) add(r.result, localName(r.name), r.note);
  if (MESOTHELIAL.includes(dxOf(v))) {
    for (const [field, name] of [['bap1', 'BAP1'], ['mtap', 'MTAP']]) {
      if (v[field] === 'Retained') add('retained', name);
      if (v[field] === 'Lost') add('lost', name);
    }
  }
  return out;
}

/** The result recorded for a marker: 'pos', 'focal', 'weak', 'neg', 'retained', 'lost' or null. */
export function resultFor(v, name) {
  const r = ihcResults(v);
  for (const key of ['pos', 'focal', 'weak', 'neg', 'retained', 'lost']) if (r[key].some((x) => x === name || x.startsWith(`${name} `))) return key;
  return null;
}
const positive = (v, ...names) => names.some((n) => ['pos', 'focal', 'weak'].includes(resultFor(v, n)));
const negative = (v, ...names) => names.some((n) => resultFor(v, n) === 'neg');

/** "On immunohistochemistry, the tumour cells are positive for A and B, and negative for C." and the extras. */
export function ihcSentences(v) {
  const r = ihcResults(v);
  const bits = [];
  if (r.pos.length) bits.push(`positive for ${listJoin(r.pos)}`);
  if (r.focal.length) bits.push(`focally positive for ${listJoin(r.focal)}`);
  if (r.weak.length) bits.push(`weakly positive for ${listJoin(r.weak)}`);
  if (r.neg.length) bits.push(`negative for ${listJoin(r.neg)}`);
  const s = [];
  if (bits.length) s.push(`On immunohistochemistry, ${cellNoun(v)} are ${bits.length > 1 ? `${bits.slice(0, -1).join(', ')}, and ${bits[bits.length - 1]}` : bits[0]}.`);
  if (dxOf(v) === METASTATIC && P53_SENTENCE[v.p53]) s.push(P53_SENTENCE[v.p53]);
  if (r.retained.length) s.push(`${capStain(listJoin(r.retained))} expression is retained.`);
  if (r.lost.length) s.push(`There is loss of ${listJoin(r.lost)} expression.`);
  if (r.ki67 !== null) s.push(`The Ki-67 proliferation index is approximately ${r.ki67}%.`);
  if (r.unparsed.length) s.push(`${capStain(r.unparsed.join(', '))}.`);
  return s;
}

// ---------- the lesion ----------

const tissueOf = (v) => lc1(v.tissue || 'Fibroadipose tissue');
const NO_MALIGNANCY = 'There is no evidence of malignancy.';
const NEM_FINDINGS = { 'Mild chronic inflammation': 'mild chronic inflammation', Fibrosis: 'fibrosis', 'Vascular congestion': 'vascular congestion', Haemorrhage: 'haemorrhage' };
const RMH_ARCHITECTURE = {
  Simple: 'a surface layer of reactive mesothelial cells',
  Florid: 'a florid surface proliferation of mesothelial cells forming sheets, nests and small tubules',
  Papillary: 'a surface proliferation of mesothelial cells forming small papillae and tubulopapillary structures'
};
const GRANULOMA_SENTENCE = {
  'Foreign-body reaction to suture': 'granulomatous inflammation composed of histiocytes and foreign-body-type multinucleated giant cells surrounding suture material',
  'Foreign-body reaction': 'granulomatous inflammation composed of histiocytes and foreign-body-type multinucleated giant cells surrounding foreign material',
  'Keratin granulomas': 'granulomas composed of laminated anucleate keratin and ghost squamous cells, surrounded by histiocytes and foreign-body-type multinucleated giant cells',
  'Necrotising granulomas': 'granulomas composed of epithelioid histiocytes and multinucleated giant cells, with central necrosis',
  'Non-necrotising granulomas': 'well-formed non-necrotising granulomas composed of epithelioid histiocytes and multinucleated giant cells'
};
const STAIN_SENTENCE = {
  Pending: 'Ziehl-Neelsen and Grocott stains are pending.',
  Negative: 'Ziehl-Neelsen and Grocott stains are negative for acid-fast bacilli and fungal organisms.',
  'Acid-fast bacilli present': 'Ziehl-Neelsen stain highlights acid-fast bacilli.',
  'Fungal organisms present': 'Grocott stain highlights fungal organisms.'
};
const MESOTHELIOMA_SENTENCE = {
  Epithelioid: 'epithelioid mesothelioma composed of tubules, papillae and solid sheets of atypical epithelioid cells',
  Biphasic: 'biphasic mesothelioma with epithelioid and sarcomatoid components',
  Sarcomatoid: 'sarcomatoid mesothelioma composed of fascicles of atypical spindle cells',
  'Not otherwise specified': 'mesothelioma composed of atypical mesothelial cells'
};
const INVASION_SENTENCE = {
  'Adipose tissue': 'The tumour invades the underlying adipose tissue.',
  'Fibrous stroma': 'The tumour invades the underlying fibrous stroma.'
};
const psammomaOf = (v) => (v.psammoma ? ', with psammoma bodies' : '');
const CARCINOMA_SENTENCE = {
  Adenocarcinoma: (v) => (v.primarySite === 'Colorectal'
    ? 'adenocarcinoma forming cribriform glands of tall columnar cells, with luminal necrotic debris'
    : 'adenocarcinoma forming irregular glands lined by pleomorphic columnar cells, set in a desmoplastic stroma'),
  'High-grade serous carcinoma': (v) => `high-grade serous carcinoma forming papillae, solid sheets and slit-like spaces, composed of cells with marked nuclear pleomorphism, prominent nucleoli and frequent mitoses${psammomaOf(v)}`,
  'Low-grade serous carcinoma': (v) => `low-grade serous carcinoma forming small nests and micropapillae of cells with uniform nuclei${psammomaOf(v)}`,
  'Mucinous adenocarcinoma': () => 'mucinous adenocarcinoma, with strips and clusters of atypical columnar mucinous cells floating in pools of extracellular mucin',
  'Poorly cohesive (signet-ring cell) carcinoma': () => 'poorly cohesive carcinoma composed of single cells and small clusters, including signet-ring cells with intracytoplasmic mucin displacing the nucleus',
  'Squamous cell carcinoma': () => 'squamous cell carcinoma forming nests of atypical squamous cells with keratinisation',
  'Carcinoma (type not determined)': () => 'carcinoma composed of sheets and nests of atypical epithelioid cells',
  [OTHER]: (v) => lc1(stripDot(v.carcinomaOther)) || 'carcinoma'
};

/** `{ body, close }`: the lesion sentences, and the closing negative that follows the immunohistochemistry. */
export function lesionSentences(v) {
  const t = tissueOf(v);
  switch (dxOf(v)) {
    case NEM: {
      const f = arr(v.nemFindings);
      const lined = f.includes('Mesothelial lining') ? ' lined by mesothelium' : '';
      const bg = f.filter((x) => NEM_FINDINGS[x]).map((x) => NEM_FINDINGS[x]);
      return { body: [`Sections show ${t}${lined}${bg.length ? `, with ${listJoin(bg)}` : ''}.`], close: [NO_MALIGNANCY] };
    }
    case RMH:
      return {
        body: [`Sections show ${t} with ${RMH_ARCHITECTURE[v.rmhPattern] || RMH_ARCHITECTURE.Simple}.`,
          'The cells have uniform round to oval nuclei with small central nucleoli.',
          'The proliferation is confined to the surface, with no invasion of the underlying tissue.'],
        close: [NO_MALIGNANCY]
      };
    case LOOSE_BODY: {
      const f = arr(v.lbFeatures);
      const core = f.includes('Central fat necrosis') ? ' surrounding a central core of necrotic fat' : '';
      const calc = f.includes('Calcification') ? ', with calcification' : '';
      return {
        body: [`Sections show a nodule composed of concentric layers of hyalinised, acellular fibrous tissue${core}${calc}.`,
          'The features are consistent with an infarcted and detached appendix epiploica.'],
        close: [NO_MALIGNANCY]
      };
    }
    case ENDOMETRIOSIS:
      return { body: [`Sections show ${t} containing endometrial-type glands and stroma${v.haemosiderin === false ? '' : ', with haemosiderin-laden macrophages'}.`], close: [NO_MALIGNANCY] };
    case ENDOSALPINGIOSIS:
      return { body: [`Sections show ${t} containing small glands lined by a single layer of bland ciliated tubal-type epithelium${psammomaOf(v)}.`], close: [NO_MALIGNANCY] };
    case FAT_NECROSIS: {
      const f = arr(v.fnFeatures).map(lc1);
      return { body: [`Sections show ${t} with fat necrosis, composed of anucleate adipocytes surrounded by foamy macrophages and multinucleated giant cells${f.length ? `, with ${listJoin(f)}` : ''}.`], close: [NO_MALIGNANCY] };
    }
    case FIBROSIS: {
      const f = arr(v.fibFeatures).map(lc1);
      return { body: [`Sections show cellular fibrous connective tissue containing blood vessels${f.length ? `, with ${listJoin(f)}` : ''}.`], close: [NO_MALIGNANCY] };
    }
    case GRANULOMA: {
      const g = v.granType || 'Foreign-body reaction to suture';
      const body = [`Sections show ${t} with ${GRANULOMA_SENTENCE[g] || GRANULOMA_SENTENCE['Foreign-body reaction to suture']}.`];
      const infective = ['Necrotising granulomas', 'Non-necrotising granulomas'].includes(g);
      if (infective && STAIN_SENTENCE[v.specialStains]) body.push(STAIN_SENTENCE[v.specialStains]);
      return { body, close: g === 'Keratin granulomas' ? ['No viable tumour cells are seen.'] : [NO_MALIGNANCY] };
    }
    case SPLENOSIS:
      return { body: ['Sections show a nodule of splenic tissue with red and white pulp.'], close: [NO_MALIGNANCY] };
    case DECIDUOSIS:
      return { body: [`Sections show ${t} containing nodules of large polygonal decidual cells with abundant eosinophilic cytoplasm, bland nuclei and small nucleoli.`], close: [NO_MALIGNANCY] };
    case WDPMT:
      return {
        body: [`Sections show papillae with fibrovascular cores lined by a single layer of bland cuboidal mesothelial cells${psammomaOf(v)}.`,
          'There is no invasion of the underlying tissue.'],
        close: []
      };
    case MESOTHELIOMA: {
      const body = [`Sections show ${t} involved by ${MESOTHELIOMA_SENTENCE[v.mesoType] || MESOTHELIOMA_SENTENCE.Epithelioid}.`];
      const inv = INVASION_SENTENCE[v.mesoInvasion ?? 'Adipose tissue'];
      if (inv) body.push(inv);
      return { body, close: [] };
    }
    case METASTATIC: {
      const type = v.carcinomaType || 'Adenocarcinoma';
      return { body: [`Sections show ${t} involved by ${(CARCINOMA_SENTENCE[type] || CARCINOMA_SENTENCE.Adenocarcinoma)(v)}.`], close: [] };
    }
    default: {
      const typed = stripDot(v.dxOther);
      return { body: typed ? [`Sections show ${t} with ${lc1(typed)}.`] : [], close: [] };
    }
  }
}

export function microscopy(part) {
  const v = part.values;
  const { body, close } = lesionSentences(v);
  const s = [...body, ...ihcSentences(v), ...close];
  const extra = stripDot(v.additionalNotes);
  if (extra) s.push(`${uc1(extra)}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- the diagnosis line ----------

const RMH_DX = { Simple: 'REACTIVE MESOTHELIAL HYPERPLASIA', Florid: 'FLORID REACTIVE MESOTHELIAL HYPERPLASIA', Papillary: 'REACTIVE MESOTHELIAL HYPERPLASIA, papillary pattern' };
const GRANULOMA_DX = {
  'Foreign-body reaction to suture': 'SUTURE GRANULOMA',
  'Foreign-body reaction': 'FOREIGN-BODY GIANT CELL REACTION',
  'Keratin granulomas': 'KERATIN GRANULOMAS',
  'Necrotising granulomas': 'NECROTISING GRANULOMATOUS INFLAMMATION',
  'Non-necrotising granulomas': 'NON-NECROTISING GRANULOMATOUS INFLAMMATION'
};
const MESOTHELIOMA_DX = { Epithelioid: 'EPITHELIOID MESOTHELIOMA', Biphasic: 'BIPHASIC MESOTHELIOMA', Sarcomatoid: 'SARCOMATOID MESOTHELIOMA', 'Not otherwise specified': 'MESOTHELIOMA, not otherwise specified' };
const CARCINOMA_DX = {
  Adenocarcinoma: 'ADENOCARCINOMA',
  'High-grade serous carcinoma': 'HIGH-GRADE SEROUS CARCINOMA',
  'Low-grade serous carcinoma': 'LOW-GRADE SEROUS CARCINOMA',
  'Mucinous adenocarcinoma': 'MUCINOUS ADENOCARCINOMA',
  'Poorly cohesive (signet-ring cell) carcinoma': 'POORLY COHESIVE CARCINOMA, signet-ring cell type',
  'Squamous cell carcinoma': 'SQUAMOUS CELL CARCINOMA',
  'Carcinoma (type not determined)': 'CARCINOMA'
};

/** ", in keeping with colorectal primary" / ", favour Müllerian primary" / ", consistent with the known breast primary". */
export function primaryClause(v) {
  if (dxOf(v) !== METASTATIC || !v.primarySite || v.primarySite === UNCERTAIN) return '';
  const typed = v.primarySite === OTHER ? stripDot(v.primaryOther).replace(/\s+(primary|origin)$/i, '') : v.primarySite;
  if (!typed) return '';
  const site = /^Müllerian/.test(typed) ? typed : lc1(typed);
  const basis = v.primaryBasis || 'In keeping with';
  if (basis === 'Favour') return `, favour ${site} primary`;
  if (basis === 'Consistent with the known') return `, consistent with the known ${site} primary`;
  return `, in keeping with ${site} primary`;
}

function carcinomaDx(v) {
  const type = v.carcinomaType || 'Adenocarcinoma';
  const name = type === OTHER ? (stripDot(v.carcinomaOther) || 'carcinoma').toUpperCase() : CARCINOMA_DX[type] || 'CARCINOMA';
  return `${v.lead === 'Involved by' ? 'INVOLVED BY' : 'METASTATIC'} ${name}${primaryClause(v)}`;
}

/** The entity as the diagnosis line names it. */
export function entityDx(v) {
  switch (dxOf(v)) {
    case NEM: return 'NO EVIDENCE OF MALIGNANCY';
    case RMH: return RMH_DX[v.rmhPattern] || RMH_DX.Simple;
    case LOOSE_BODY: return 'PERITONEAL LOOSE BODY';
    case ENDOMETRIOSIS: return 'ENDOMETRIOSIS';
    case ENDOSALPINGIOSIS: return 'ENDOSALPINGIOSIS';
    case FAT_NECROSIS: return 'FAT NECROSIS';
    case FIBROSIS: return v.fibrosisTerm === 'Fibrosis' ? 'FIBROSIS' : 'FIBROUS ADHESION';
    case GRANULOMA: return GRANULOMA_DX[v.granType] || GRANULOMA_DX['Foreign-body reaction to suture'];
    case SPLENOSIS: return 'SPLENOSIS';
    case DECIDUOSIS: return 'DECIDUOSIS';
    case WDPMT: return 'WELL-DIFFERENTIATED PAPILLARY MESOTHELIAL TUMOUR';
    case MESOTHELIOMA: return MESOTHELIOMA_DX[v.mesoType] || MESOTHELIOMA_DX.Epithelioid;
    case METASTATIC: return carcinomaDx(v);
    default: return (stripDot(v.dxOther) || 'SEE COMMENT').toUpperCase();
  }
}

const necrotising = (v) => dxOf(v) === GRANULOMA && v.granType === 'Necrotising granulomas';
/** The diagnoses whose line closes "see comment": the comment carries the work-up. */
export const seeComment = (v) => dxOf(v) === MESOTHELIOMA || necrotising(v) || (dxOf(v) === METASTATIC && v.primarySite === UNCERTAIN);

export function diagnosis(part) {
  const v = part.values;
  const clauses = [entityDx(v)];
  if (dxOf(v) === GRANULOMA && ['Necrotising granulomas', 'Non-necrotising granulomas'].includes(v.granType)) {
    if (v.specialStains === 'Acid-fast bacilli present') clauses.push('acid-fast bacilli identified');
    if (v.specialStains === 'Fungal organisms present') clauses.push('fungal organisms identified');
  }
  if (seeComment(v)) clauses.push('see comment');
  return `(${part.label}) ${organPhrase(part)} - ${clauses.join('; ')}`;
}

// ---------- case flags ----------

// A request that names malignancy: the clinical history or the pasted specimen list. It offers the sampling caveat
// for the benign parts (schema snippet `peri_sampling`). "Deposit" and "implant" are left out on purpose: the
// requests use them for endometriosis too.
const MALIGNANCY_QUERY = /\b(?:carcinoma\w*|cancers?|ca|malignan\w*|metasta\w*|mets?|carcinomatosis|tumou?rs?|neoplas\w*|mesothelioma|lymphoma|sarcoma|omental cake|hipec|cytoreduct\w*|debulking)\b/i;

export function flags(parts, ctx) {
  const meta = ctx?.case?.meta || {};
  return MALIGNANCY_QUERY.test(`${meta.clinical || ''} ${meta.specimen || ''}`) ? ['malignancyQuery'] : [];
}

// ---------- checks ----------

const SITE_MARKERS = {
  Colorectal: ['CK20', 'CDX2', 'SATB2'], Appendiceal: ['CK20', 'CDX2', 'SATB2'], 'Tubo-ovarian': ['PAX8', 'WT1'], Müllerian: ['PAX8'],
  Endometrial: ['PAX8', 'ER'], Breast: ['GATA3'], Lung: ['TTF-1'], Urothelial: ['GATA3'], Renal: ['PAX8']
};

export function validate(part) {
  const v = part.values;
  const { out, at, err, warn } = checks();
  const info = (m, f) => at('info', m, f);
  const d = dxOf(v);
  const both = arr(v.ihcPos).filter((m) => arr(v.ihcNeg).includes(m));
  if (both.length) err(`${listJoin(both)} ${both.length > 1 ? 'are' : 'is'} ticked both positive and negative.`, 'ihcNeg');
  const typed = parseIhc(v.ihcOther);
  if (typed.unparsed.length) info(`Other stains printed as typed: ${typed.unparsed.join(', ')}.`, 'ihcOther');

  if ((v.site || '') === OTHER && !stripDot(v.siteOther)) err('Type the site.', 'siteOther');
  if (v.site === 'Serosa of a named organ' && !stripDot(v.organ)) warn('Name the organ: the line otherwise reads SEROSA.', 'organ');
  if (d === OTHER && !stripDot(v.dxOther)) err('Type the diagnosis.', 'dxOther');

  if (d === METASTATIC) {
    const type = v.carcinomaType || 'Adenocarcinoma';
    if (type === OTHER && !stripDot(v.carcinomaOther)) warn('Type the carcinoma.', 'carcinomaOther');
    if (v.primarySite === OTHER && !stripDot(v.primaryOther)) warn('Type the primary site.', 'primaryOther');
    if (!v.primarySite) info('Primary site not stated: the diagnosis line prints without one.', 'primarySite');
    const markers = SITE_MARKERS[v.primarySite];
    if (markers && v.primaryBasis !== 'Consistent with the known' && !positive(v, ...markers)) {
      warn(`${v.primarySite} primary: ${markers.length > 1 ? `none of ${listOr(markers)} is recorded` : `${markers[0]} is not recorded`} as positive.`, 'ihcPos');
    }
    if (['Colorectal', 'Appendiceal'].includes(v.primarySite) && positive(v, 'CK7')) info('CK7 is positive: colorectal and appendiceal carcinomas are usually CK7 negative.', 'ihcPos');
    if (['Tubo-ovarian', 'Müllerian', 'Endometrial'].includes(v.primarySite) && negative(v, 'PAX8')) warn('PAX8 is negative: unusual for a Müllerian primary.', 'ihcNeg');
    if (['Upper gastrointestinal', 'Pancreatobiliary'].includes(v.primarySite)) info('No immunoprofile separates an upper gastrointestinal from a pancreatobiliary primary: the primary rests on the clinical and imaging findings.', 'primarySite');
    if (type === 'High-grade serous carcinoma' && v.p53 === 'Wild-type pattern') warn('Wild-type p53 is unusual for high-grade serous carcinoma.', 'p53');
    if (type === 'Low-grade serous carcinoma' && /^Aberrant/.test(v.p53 || '')) warn('Aberrant p53 is unusual for low-grade serous carcinoma.', 'p53');
    if (positive(v, 'calretinin') && positive(v, 'D2-40', 'CK5/6') && !positive(v, ...EPITHELIAL_MARKERS)) info('Calretinin with D2-40 or CK5/6 positive, and no epithelial marker positive: consider a mesothelial lesion.', 'dx');
  }

  if (d === MESOTHELIOMA) {
    const meso = MESOTHELIAL_MARKERS.filter((m) => positive(v, m)).length;
    if (meso < 2) warn('Mesothelioma: record at least two mesothelial markers (calretinin, WT1, D2-40, CK5/6) as positive.', 'ihcPos');
    if (CARCINOMA_MARKERS.filter((m) => negative(v, m)).length < 2) warn('Mesothelioma: record at least two carcinoma markers (BerEP4, MOC31, claudin-4 or a site marker) as negative.', 'ihcNeg');
    if (positive(v, ...EPITHELIAL_MARKERS)) warn(`${listJoin(EPITHELIAL_MARKERS.filter((m) => positive(v, m)))} positive: this favours carcinoma over mesothelioma.`, 'ihcPos');
    if (positive(v, 'PAX8')) info('PAX8 is positive in a minority of peritoneal mesotheliomas; claudin-4 separates serous carcinoma better.', 'ihcPos');
    if (!resultFor(v, 'BAP1') && !resultFor(v, 'MTAP')) warn('Mesothelioma: BAP1 and MTAP are not recorded.', 'bap1');
    if (v.mesoInvasion === 'Not seen in this sample' && resultFor(v, 'BAP1') !== 'lost' && resultFor(v, 'MTAP') !== 'lost') {
      warn('No invasion and no BAP1 or MTAP loss: this sample shows nothing that separates mesothelioma from a reactive proliferation.', 'mesoInvasion');
    }
  }
  if ([RMH, WDPMT].includes(d)) {
    const lost = ['BAP1', 'MTAP'].filter((n) => resultFor(v, n) === 'lost');
    if (lost.length) warn(`Loss of ${listJoin(lost)} is not seen in ${d === RMH ? 'reactive mesothelium' : 'well-differentiated papillary mesothelial tumour'}: consider mesothelioma.`, lost[0].toLowerCase());
  }
  if (d === RMH && positive(v, ...EPITHELIAL_MARKERS)) warn(`${listJoin(EPITHELIAL_MARKERS.filter((m) => positive(v, m)))} positive: this is unusual for mesothelial cells.`, 'ihcPos');
  if (d === ENDOSALPINGIOSIS && positive(v, 'calretinin')) info('Endosalpingiosis is usually calretinin negative, and PAX8 and WT1 positive.', 'ihcPos');
  if (d === DECIDUOSIS && positive(v, 'AE1/AE3')) warn('Keratin positive: decidual cells are keratin negative.', 'ihcPos');
  if (necrotising(v) && (v.specialStains || 'Not performed') === 'Not performed') warn('Necrotising granulomas: record the Ziehl-Neelsen and Grocott stains, or mark them pending.', 'specialStains');
  return out;
}

export default { specimenName, microscopy, diagnosis, validate, flags };
