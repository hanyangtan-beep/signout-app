// Bladder TURBT / bladder biopsy generator. Pure functions: (part, ctx) -> string.
// Each part is one specimen (tumour TURBT, tumour base, random biopsies, prostatic urethra, cold-cup biopsy).
// Blocks produced:
//   specimenName "Urinary bladder, left lateral wall tumour, TURBT"
//   macro        "(A) Received in formalin are multiple tan friable tissue chips measuring 3 x 2 x 0.5 cm in
//                 aggregate and weighing 4 g. All embedded in 2 blocks."
//   blockKey     "(A) (1-2) Bladder chips, all embedded."
//   microscopy   "(A) Sections show fragments of bladder wall with a papillary urothelial neoplasm composed of
//                 fibrovascular cores lined by urothelium showing marked architectural and cytological disorder,
//                 with loss of polarity, nuclear pleomorphism and frequent mitoses. Nests of tumour cells
//                 infiltrate the lamina propria. Muscularis propria is present and uninvolved. There is no
//                 lymphovascular invasion."
//   diagnosis    "(A) URINARY BLADDER, left lateral wall tumour, TURBT - HIGH GRADE PAPILLARY UROTHELIAL
//                 CARCINOMA WITH LAMINA PROPRIA INVASION (pT1); muscularis propria present and uninvolved"
// Benign default: "Sections show fragments of bladder mucosa lined by unremarkable urothelium with underlying
// lamina propria and muscularis propria. There is no evidence of dysplasia or malignancy." /
// "URINARY BLADDER, random biopsies - NO EVIDENCE OF DYSPLASIA OR MALIGNANCY".
// Muscularis propria invasion gives "(at least pT2)" and the schema snippet `bladder_cancer_template`
// adds the comment pointing to the QMH bladder cancer template; no cystectomy staging is built here.
// Wording is protected by tests/turbt.test.js — change it only deliberately.

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
const stripDot = (s) => String(s || '').trim().replace(/[.;,\s]+$/, '');
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
/** Words for 0-9, digits from 10. */
export const word = (n) => (n >= 0 && n <= 9 ? WORDS[n] : String(n));

// ---------- classification helpers ----------

export const NEOPLASM_NONE = 'None';
export const PAPILLOMA = 'Urothelial papilloma';
export const PUNLMP = 'PUNLMP';
export const LG = 'Low grade papillary urothelial carcinoma';
export const HG = 'High grade papillary urothelial carcinoma';
export const CIS_ONLY = 'Urothelial carcinoma in situ';
export const NONPAP = 'Invasive urothelial carcinoma, non-papillary';

export const INV_TA = 'No invasion (pTa)';
export const INV_T1 = 'Lamina propria invasion (pT1)';
export const INV_T2 = 'Muscularis propria invasion (pT2 at least)';

export const MP_PRESENT = 'Present and uninvolved';
export const MP_ABSENT = 'Not represented';
export const MP_INVOLVED = 'Present and involved';

export const hasNeoplasm = (v) => !!v.neoplasm && v.neoplasm !== NEOPLASM_NONE;
/** Carcinomas that can invade (the papilloma / PUNLMP / CIS-only options are non-invasive by definition). */
export const isCarcinoma = (v) => [LG, HG, NONPAP].includes(v.neoplasm);
export const mpInvolved = (v) => isCarcinoma(v) && (v.invasion === INV_T2 || v.muscularisPropria === MP_INVOLVED);

/** Effective invasion level for a carcinoma: 'ta' | 't1' | 't2'. Non-papillary invasive carcinoma is at least pT1. */
export function invasionLevel(v) {
  if (!isCarcinoma(v)) return 'ta';
  if (mpInvolved(v)) return 't2';
  if (v.invasion === INV_T1 || v.neoplasm === NONPAP) return 't1';
  return 'ta';
}

/** Muscularis propria status as printed: 'present' | 'absent' | 'involved'. */
export function mpStatus(v) {
  if (mpInvolved(v)) return 'involved';
  return v.muscularisPropria === MP_ABSENT ? 'absent' : 'present';
}

// ---------- specimen phrase ----------

const SITE_TYPES = {
  'Bladder tumour, TURBT': (site) => ({ organ: 'Urinary bladder', rest: `${site ? `${site} tumour` : 'tumour'}, TURBT` }),
  'Tumour base, resection': (site) => ({ organ: 'Urinary bladder', rest: `${site ? `${site} tumour base` : 'tumour base'}, resection` }),
  'Random bladder biopsies': (site) => ({ organ: 'Urinary bladder', rest: site ? `random biopsies, ${site}` : 'random biopsies' }),
  'Prostatic urethra, biopsy': (site) => ({ organ: 'Prostatic urethra', rest: site ? `${site}, biopsy` : 'biopsy' }),
  'Bladder, cold-cup biopsy': (site) => ({ organ: 'Urinary bladder', rest: site ? `${site}, cold-cup biopsy` : 'cold-cup biopsy' })
};

/** { organ, rest } from the site fields, or from a typed specimen name (organ = text before the first comma). */
export function sitePhrase(v) {
  const typed = stripDot(v.specimenName);
  if (typed) {
    const i = typed.indexOf(',');
    if (i === -1) return { organ: typed, rest: '' };
    return { organ: typed.slice(0, i).trim(), rest: typed.slice(i + 1).trim() };
  }
  const site = lc1(stripDot(v.site));
  const build = SITE_TYPES[v.siteType] || SITE_TYPES['Bladder tumour, TURBT'];
  return build(site);
}

export function specimenName(part) {
  const { organ, rest } = sitePhrase(part.values);
  return rest ? `${organ}, ${rest}` : organ;
}

const isBiopsyType = (v) => /biops/i.test(v.siteType || '') && !stripDot(v.specimenName);
const isUrethra = (v) => (v.siteType || '') === 'Prostatic urethra, biopsy';

// ---------- macroscopic description ----------

/** "3x2x0.5" -> "3 x 2 x 0.5 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

/** "4" -> "4 g"; "4.5 g" unchanged; '' when blank. */
export function weightPhrase(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/g$/i.test(s)) return s.replace(/\s*g$/i, ' g');
  const n = num(s);
  return n === null ? s : `${fmt(n)} g`;
}

const APPEARANCE = {
  'Tan friable chips': ['tan friable tissue chip', 'tan friable tissue chips'],
  'Tan-brown mucosal fragments': ['tan-brown mucosal fragment', 'tan-brown mucosal fragments'],
  'Papillary fragments': ['tan papillary tissue fragment', 'tan papillary tissue fragments'],
  'Grey-white firm chips': ['grey-white firm tissue chip', 'grey-white firm tissue chips'],
  'Haemorrhagic fragments': ['haemorrhagic tissue fragment', 'haemorrhagic tissue fragments']
};

/** Fragment count: { n (number|null), text } — "3" -> three, "multiple" as typed, blank -> ''. */
export function fragmentPhrase(raw) {
  const s = String(raw || '').trim();
  if (!s) return { n: null, text: '' };
  const n = num(s);
  if (n !== null && /^\d+$/.test(s)) return { n: Math.round(n), text: word(Math.round(n)) };
  return { n: null, text: lc1(s) };
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = [];
  const frag = fragmentPhrase(v.fragments);
  const noun = APPEARANCE[v.appearance] || APPEARANCE['Tan friable chips'];
  const single = frag.n === 1;
  const size = sizePhrase(v.aggregateSize);
  const weight = weightPhrase(v.aggregateWeight);
  let head;
  if (single) head = `Received in formalin is a single ${noun[0]}`;
  else if (frag.text) head = `Received in formalin are ${frag.text} ${noun[1]}`;
  else head = `Received in formalin are ${noun[1]}`;
  const measures = [];
  if (size) measures.push(`measuring ${size}${single ? '' : ' in aggregate'}`);
  if (weight) measures.push(`weighing ${weight}`);
  if (measures.length) head += ` ${measures.join(' and ')}`;
  s.push(`${head}.`);
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 1));
  s.push(`All embedded in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 1));
  const range = blocks === 1 ? '(1)' : `(1-${blocks})`;
  let tissue = 'Bladder chips';
  if (isUrethra(v)) tissue = 'Prostatic urethral biopsies';
  else if (isBiopsyType(v)) tissue = 'Bladder biopsies';
  return `(${part.label}) ${range} ${tissue}, all embedded.`;
}

// ---------- microscopy ----------

const PAPILLARY_OPEN = 'Sections show fragments of bladder wall with a papillary urothelial neoplasm composed of fibrovascular cores lined by ';
const NEOPLASM_MICRO = {
  [PAPILLOMA]: `${PAPILLARY_OPEN}urothelium of normal thickness without cytological atypia, in keeping with urothelial papilloma.`,
  [PUNLMP]: `${PAPILLARY_OPEN}thickened urothelium with preserved polarity and minimal cytological atypia; mitoses are rare.`,
  [LG]: `${PAPILLARY_OPEN}thickened urothelium showing an overall orderly appearance with mild variation in nuclear size, shape and polarity; mitoses are infrequent.`,
  [HG]: `${PAPILLARY_OPEN}urothelium showing marked architectural and cytological disorder, with loss of polarity, nuclear pleomorphism and frequent mitoses.`,
  [CIS_ONLY]: 'Sections show fragments of bladder mucosa in which the flat urothelium shows marked cytological atypia with nuclear enlargement, pleomorphism, hyperchromasia and loss of polarity extending through the full thickness of the epithelium, in keeping with urothelial carcinoma in situ.',
  [NONPAP]: 'Sections show fragments of bladder wall infiltrated by nests and cords of malignant urothelial cells with marked nuclear pleomorphism and frequent mitoses; no papillary component is identified.'
};

const DIVERGENT = { Squamous: 'squamous', Glandular: 'glandular' };
const SUBTYPE = {
  Micropapillary: 'a micropapillary component',
  Nested: 'a nested component',
  Plasmacytoid: 'a plasmacytoid component',
  Sarcomatoid: 'a sarcomatoid component',
  'Small cell': 'a small cell neuroendocrine carcinoma component'
};

/** "The tumour shows squamous and glandular divergent differentiation and a micropapillary component." or ''. */
export function variantSentence(v) {
  const list = Array.isArray(v.variant) ? v.variant : [];
  const div = list.filter((x) => DIVERGENT[x]).map((x) => DIVERGENT[x]);
  const sub = list.filter((x) => SUBTYPE[x]).map((x) => SUBTYPE[x]);
  const bits = [];
  if (div.length) bits.push(`${listJoin(div)} divergent differentiation`);
  if (sub.length) bits.push(listJoin(sub));
  return bits.length ? `The tumour shows ${listJoin(bits)}.` : '';
}

const CYSTITIS_MICRO = {
  'Cystitis cystica et glandularis': 'The lamina propria contains von Brunn nests with cystic dilatation and glandular metaplasia, in keeping with cystitis cystica et glandularis.',
  'Follicular cystitis': 'The lamina propria contains lymphoid follicles with germinal centres, in keeping with follicular cystitis.',
  'Eosinophilic cystitis': 'The lamina propria shows a dense inflammatory infiltrate rich in eosinophils, in keeping with eosinophilic cystitis.',
  'BCG-related granulomatous cystitis': 'The lamina propria contains non-necrotising granulomas with associated chronic inflammation, in keeping with BCG-related granulomatous cystitis.',
  'Radiation or chemotherapy change': 'There is stromal hyalinisation with ectatic vessels and reactive urothelial atypia, in keeping with radiation or chemotherapy change.',
  'Polypoid cystitis': 'The mucosa shows polypoid projections with oedematous lamina propria and chronic inflammation, in keeping with polypoid cystitis.'
};

const CYSTITIS_DX = {
  'Cystitis cystica et glandularis': 'cystitis cystica et glandularis',
  'Follicular cystitis': 'follicular cystitis',
  'Eosinophilic cystitis': 'eosinophilic cystitis',
  'BCG-related granulomatous cystitis': 'BCG-related granulomatous cystitis',
  'Radiation or chemotherapy change': 'radiation or chemotherapy change',
  'Polypoid cystitis': 'polypoid cystitis'
};

const mpSentence = (v) => {
  switch (mpStatus(v)) {
    case 'involved': return 'Muscularis propria is present and is infiltrated by tumour.';
    case 'absent': return 'Muscularis propria is not represented in the sample.';
    default: return 'Muscularis propria is present and uninvolved.';
  }
};

const isKeratinising = (v) => /keratinising/i.test(v.squamousMetaplasia || '') && !/non-keratinising/i.test(v.squamousMetaplasia || '');
const hasSquamousMetaplasia = (v) => /^Present/.test(v.squamousMetaplasia || '');

export function microscopy(part) {
  const v = part.values;
  const s = [];

  if (hasNeoplasm(v)) {
    s.push(NEOPLASM_MICRO[v.neoplasm] || `Sections show fragments of bladder wall with ${lc1(v.neoplasm)}.`);
    if (isCarcinoma(v)) {
      const lvl = invasionLevel(v);
      if (lvl === 't2') s.push('Nests of tumour cells infiltrate the lamina propria and extend into the muscularis propria.');
      else if (lvl === 't1') s.push('Nests of tumour cells infiltrate the lamina propria.');
      else s.push('There is no evidence of invasion of the lamina propria.');
      const variant = variantSentence(v);
      if (variant) s.push(variant);
      if (v.cis === 'Present') s.push('The adjacent flat urothelium shows urothelial carcinoma in situ.');
    } else if (v.neoplasm !== CIS_ONLY) {
      s.push('There is no evidence of invasion.');
    }
    s.push(mpSentence(v));
    if (v.lvi === 'Present') s.push('Lymphovascular invasion is present.');
    else if (v.lvi === 'Indeterminate') s.push('Lymphovascular invasion cannot be reliably assessed in this material.');
    else s.push('There is no lymphovascular invasion.');
    if (v.urothelium === 'Reactive atypia') s.push('The background urothelium shows reactive atypia.');
    else if (v.urothelium === 'Denuded') s.push('The background urothelium is largely denuded.');
  } else {
    const mp = mpStatus(v);
    if (v.urothelium === 'Denuded') {
      s.push(`Sections show fragments of bladder mucosa in which the urothelium is largely denuded, with underlying lamina propria${mp === 'present' ? ' and muscularis propria' : ''}.`);
    } else if (v.urothelium === 'Reactive atypia') {
      s.push(`Sections show fragments of bladder mucosa lined by urothelium showing reactive atypia with mild nuclear enlargement, preserved polarity and an underlying inflamed lamina propria${mp === 'present' ? ' and muscularis propria' : ''}.`);
    } else {
      s.push(`Sections show fragments of bladder mucosa lined by unremarkable urothelium with underlying lamina propria${mp === 'present' ? ' and muscularis propria' : ''}.`);
    }
    if (mp !== 'present') s.push('Muscularis propria is not represented in the sample.');
  }

  if (CYSTITIS_MICRO[v.cystitis]) s.push(CYSTITIS_MICRO[v.cystitis]);
  if (hasSquamousMetaplasia(v)) {
    s.push(isKeratinising(v)
      ? 'There is keratinising squamous metaplasia of the surface urothelium.'
      : 'There is non-keratinising squamous metaplasia of the surface urothelium.');
  }
  if (v.nephrogenicAdenoma === 'Present') s.push('There is a nephrogenic adenoma composed of small tubules lined by cuboidal cells with hobnail nuclei within the lamina propria.');

  if (!hasNeoplasm(v)) s.push('There is no evidence of dysplasia or malignancy.');

  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const VARIANT_DX = {
  Squamous: 'squamous', Glandular: 'glandular',
  Micropapillary: 'micropapillary subtype', Nested: 'nested subtype', Plasmacytoid: 'plasmacytoid subtype',
  Sarcomatoid: 'sarcomatoid subtype', 'Small cell': 'small cell neuroendocrine carcinoma component'
};

/** "; with squamous and glandular divergent differentiation; micropapillary subtype" clauses. */
export function variantClauses(v) {
  const list = Array.isArray(v.variant) ? v.variant : [];
  const out = [];
  const div = list.filter((x) => DIVERGENT[x]).map((x) => VARIANT_DX[x]);
  if (div.length) out.push(`with ${listJoin(div)} divergent differentiation`);
  for (const x of list) if (SUBTYPE[x]) out.push(VARIANT_DX[x]);
  return out;
}

export function mainDiagnosis(v) {
  switch (v.neoplasm) {
    case PAPILLOMA: return 'UROTHELIAL PAPILLOMA';
    case PUNLMP: return 'PAPILLARY UROTHELIAL NEOPLASM OF LOW MALIGNANT POTENTIAL (PUNLMP)';
    case CIS_ONLY: return 'UROTHELIAL CARCINOMA IN SITU (pTis)';
    case LG:
    case HG:
    case NONPAP: {
      const base = v.neoplasm === NONPAP ? 'INVASIVE UROTHELIAL CARCINOMA, NON-PAPILLARY' : `${v.neoplasm === HG ? 'HIGH' : 'LOW'} GRADE PAPILLARY UROTHELIAL CARCINOMA`;
      switch (invasionLevel(v)) {
        case 't2': return `${base} WITH INVASION OF MUSCULARIS PROPRIA (at least pT2)`;
        case 't1': return `${base} WITH LAMINA PROPRIA INVASION (pT1)`;
        default: return `${base}, NON-INVASIVE (pTa)`;
      }
    }
    default: return '';
  }
}

export function diagnosis(part) {
  const v = part.values;
  const { organ, rest } = sitePhrase(v);
  const head = rest ? `${organ.toUpperCase()}, ${rest}` : organ.toUpperCase();
  const clauses = [];

  if (hasNeoplasm(v)) {
    clauses.push(mainDiagnosis(v));
    if (isCarcinoma(v)) clauses.push(...variantClauses(v));
    if (isCarcinoma(v) && v.cis === 'Present') clauses.push('associated urothelial carcinoma in situ');
    if (v.lvi === 'Present') clauses.push('lymphovascular invasion present');
    else if (v.lvi === 'Indeterminate') clauses.push('lymphovascular invasion indeterminate');
    switch (mpStatus(v)) {
      case 'involved': clauses.push('see comment'); break;
      case 'absent': clauses.push('muscularis propria not represented'); break;
      default: clauses.push(invasionLevel(v) === 'ta' || !isCarcinoma(v) ? 'muscularis propria present' : 'muscularis propria present and uninvolved');
    }
  } else {
    const findings = [];
    if (v.urothelium === 'Reactive atypia') findings.push('reactive urothelial atypia');
    if (CYSTITIS_DX[v.cystitis]) findings.push(CYSTITIS_DX[v.cystitis]);
    if (hasSquamousMetaplasia(v)) findings.push(isKeratinising(v) ? 'keratinising squamous metaplasia' : 'non-keratinising squamous metaplasia');
    if (v.nephrogenicAdenoma === 'Present') findings.push('nephrogenic adenoma');
    if (findings.length) {
      clauses.push(findings[0].toUpperCase(), ...findings.slice(1));
      if (v.urothelium === 'Denuded') clauses.push('urothelium largely denuded');
      clauses.push('no evidence of dysplasia or malignancy');
    } else {
      clauses.push('NO EVIDENCE OF DYSPLASIA OR MALIGNANCY');
      if (v.urothelium === 'Denuded') clauses.push('urothelium largely denuded, see comment');
    }
  }
  return `(${part.label}) ${head} - ${clauses.join('; ')}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
