// Gastric biopsy lesions: polyp / adenoma types, WHO carcinoma types and the QMH stomach
// biomarker panel (HER2 IHC and dual ISH, EBER, MMR, PD-L1, claudin 18.2). Pure functions over
// `part.values`, called by generators/gastric.js. Every new field defaults to "None" / "Not
// performed" / blank and prints nothing until it is set, so a biopsy without a polyp or a typed
// carcinoma reads exactly as before (tests/fixtures/gastric).
//
// Grounding (docs/reference/gastric_biopsy-morphology.md and
// docs/specs/gastric-biopsy-polyps-carcinoma.md carry the URLs):
//   - polyps and adenomas: Pathology Outlines (stomachhyperplastic, stomachfundicgland,
//     stomachadenomas, stomachpyloricglandadenoma, stomachoxynticglandadenoma,
//     stomachinflammatoryfibroid); "Gastric Adenomas and Mimickers: A Review", Diagnostics 2026
//     (PMC13297954); StatPearls "Gastric Polyps" (NBK560704).
//   - carcinoma types: WHO Classification of Tumours, Digestive System Tumours, 6th ed (2026) as
//     summarised in PMC13128328 and Virchows Arch 2026 (s00428-026-04697-7): the main categories
//     are unchanged from 2019, poorly cohesive carcinoma is split into signet-ring cell and
//     non-signet-ring cell types, sarcomatoid carcinoma is named among the uncommon types, and
//     gastroblastoma has moved to the mesenchymal chapter (it is not offered here). WHO 6th folds
//     intestinal-type and foveolar-type adenomas into gastric dysplasia (MAPS III); the adenoma
//     terms are kept here at the user's request (2026-10-07). Morphology sentences are the biopsy counterparts of
//     generators/gastric_morphology.js, without stromal or depth claims a biopsy cannot support.
//   - biomarkers: QMH Stomach/OGJ biomarkers page (updated 11-Apr-2025) for the elements, their
//     order and the clones; CAP gastric HER2 template (biopsy cluster of at least 5 cells; ISH
//     amplified at a HER2/CEP17 ratio of 2 or more); Agilent 22C3 gastric manual (CPS); Roche
//     VENTANA CLDN18 (43-14A) interpretation guide (positive at 75% or more of viable tumour cells
//     with moderate to strong membranous staining). Cut-offs live in the help panels and the
//     checks, never in a printed sentence (docs/new-template-brief.md section 3 rule 2).

const blank = (v) => String(v ?? '').trim() === '';
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const num = (v) => { if (blank(v)) return null; const n = Number(String(v).trim()); return Number.isFinite(n) ? n : null; };
const shown = (n) => String(Number(n));
const stripDot = (s) => String(s || '').trim().replace(/[.;\s]+$/, '');

// ---------- polyps and adenomas ----------

/** Polyp option -> diagnosis term and the microscopy sentence that follows its name. */
export const POLYPS = {
  'Hyperplastic polyp': {
    dx: 'HYPERPLASTIC POLYP',
    text: 'Elongated, tortuous and cystically dilated foveolar pits are lined by hyperplastic foveolar epithelium and set in an oedematous, inflamed lamina propria with strands of smooth muscle.'
  },
  'Fundic gland polyp': {
    dx: 'FUNDIC GLAND POLYP',
    text: 'Cystically dilated oxyntic glands are lined by parietal cells, chief cells and mucous foveolar cells.'
  },
  'Intestinal-type adenoma': {
    dx: 'INTESTINAL-TYPE ADENOMA',
    text: 'Tubular glands are lined by dysplastic intestinal-type columnar epithelium with goblet cells and occasional Paneth cells, without apical mucin caps.'
  },
  'Foveolar-type adenoma': {
    dx: 'FOVEOLAR-TYPE ADENOMA',
    text: 'Glands and surface epithelium are lined by dysplastic foveolar-type columnar cells with apical mucin caps.'
  },
  'Pyloric gland adenoma': {
    dx: 'PYLORIC GLAND ADENOMA',
    text: 'Closely packed pyloric-type tubular glands are lined by cuboidal to low columnar cells with eosinophilic, ground-glass cytoplasm, without apical mucin caps.'
  },
  'Oxyntic gland adenoma': {
    dx: 'OXYNTIC GLAND ADENOMA',
    text: 'Irregular, branching and anastomosing oxyntic-type glands, composed mainly of chief cells with basophilic cytoplasm and mild nuclear atypia, lie in the deep mucosa beneath the surface foveolar epithelium.'
  },
  'Inflammatory fibroid polyp': {
    dx: 'INFLAMMATORY FIBROID POLYP',
    text: 'Bland spindle and stellate cells in an oedematous stroma rich in eosinophils form onion-skin cuffs around thin-walled vessels.'
  }
};

export const polypOf = (s) => POLYPS[s.polyp] || null;

/** "- Polyp: Fundic gland polyp. Cystically dilated …" or nothing. */
export function polypLines(s) {
  const p = polypOf(s);
  return p ? [`- Polyp: ${s.polyp}. ${p.text}`] : [];
}

// ---------- carcinoma ----------

export const CARCINOMA = ['Intramucosal carcinoma', 'Malignancy present'];
/** A typed carcinoma replaces the bare "Intramucosal carcinoma" / "Malignancy present" value. */
export const isCarcinoma = (s) => CARCINOMA.includes(s.dysplasia);
const typed = (s) => isCarcinoma(s) && !blank(s.caType) && (s.caType !== 'Other (specify)' || !blank(s.caOther));

export const GRADED = ['Adenocarcinoma', 'Tubular adenocarcinoma', 'Papillary adenocarcinoma'];
export const LAUREN_TYPES = [
  'Adenocarcinoma', 'Tubular adenocarcinoma', 'Papillary adenocarcinoma',
  'Poorly cohesive carcinoma, signet-ring cell type', 'Poorly cohesive carcinoma, non-signet-ring cell type',
  'Mucinous adenocarcinoma', 'Mixed adenocarcinoma', 'Micropapillary adenocarcinoma'
];

const byGrade = (well, moderate, poor, none) => (g) => (g === 'Well differentiated' ? well : g === 'Moderately differentiated' ? moderate : g === 'Poorly differentiated' ? poor : none);

/** Carcinoma type -> (differentiation) => microscopy sentence ('' when nothing useful can be said). */
export const CA_MORPHOLOGY = {
  Adenocarcinoma: byGrade(
    'Well-formed glands are lined by atypical columnar epithelium.',
    'Irregular, fused and cribriform glands are lined by atypical columnar epithelium.',
    'High-grade atypical cells grow in solid sheets, cords and single cells, with only focal gland formation.',
    ''
  ),
  'Tubular adenocarcinoma': byGrade(
    'Well-formed, branching tubules are lined by atypical columnar epithelium.',
    'Moderately formed tubules of atypical columnar epithelium alternate with cribriform and incomplete glands.',
    'Only rudimentary tubules are formed, with solid, nested or corded growth of high-grade atypical cells.',
    'Irregular tubules are lined by atypical columnar epithelium.'
  ),
  'Papillary adenocarcinoma': () => 'Papillary fronds with fibrovascular cores are lined by atypical columnar epithelium.',
  // Verona / WHO consensus (PMC9412924): signet-ring cells carry a central, optically clear globoid
  // mucin droplet that displaces the nucleus; the non-signet-ring type is made of histiocytoid,
  // eosinophilic or pleomorphic cells.
  'Poorly cohesive carcinoma, signet-ring cell type': () => 'Discohesive tumour cells infiltrate singly and in small clusters without gland formation; most show a central, optically clear globoid mucin droplet that displaces the nucleus to the periphery.',
  'Poorly cohesive carcinoma, non-signet-ring cell type': () => 'Discohesive tumour cells infiltrate singly and in small clusters without gland formation; most are histiocytoid, eosinophilic or pleomorphic rather than signet-ring cells.',
  'Mucinous adenocarcinoma': () => 'Pools of extracellular mucin predominate and contain floating strips, glands and clusters of neoplastic epithelium.',
  'Mixed adenocarcinoma': () => 'Discrete glandular and poorly cohesive carcinoma components coexist.',
  'Micropapillary adenocarcinoma': () => 'Small, tight clusters of high-grade cells without fibrovascular cores show inside-out polarity and float within clear stromal spaces.',
  // A biopsy cannot show the submucosal invasion that separates this from an oxyntic gland adenoma,
  // so the sentence stops at the mucosa (Pathology Outlines stomachoxynticglandadenoma).
  'Adenocarcinoma of fundic-gland type': () => 'Irregular, anastomosing glands of low-grade oxyntic-type cells, mainly chief cells, lie deep in the mucosa beneath the surface foveolar epithelium.',
  'Hepatoid adenocarcinoma': () => 'Sheets and trabeculae of polygonal cells with abundant eosinophilic cytoplasm and central nuclei resemble hepatocytes.',
  // EBV-associated carcinoma (PMC3140657): syncytial growth, poorly formed glands, dense
  // tumour-infiltrating lymphocytes, no desmoplasia.
  'Carcinoma with lymphoid stroma': () => 'Syncytial sheets and poorly formed glands of large cells with vesicular nuclei and prominent nucleoli are embedded in a dense lymphoid stroma.',
  'Adenosquamous carcinoma': () => 'Glandular and squamous carcinoma components coexist.',
  'Squamous cell carcinoma': () => 'Nests of atypical squamous epithelium show keratinisation and intercellular bridges.',
  'Undifferentiated carcinoma': () => 'High-grade pleomorphic cells grow in sheets without glandular, squamous or neuroendocrine differentiation.',
  'Sarcomatoid carcinoma': () => 'Atypical spindle and pleomorphic cells grow in sheets and fascicles.',
  'Large cell neuroendocrine carcinoma': () => 'Organoid nests and trabeculae of medium-to-large cells with coarse chromatin, prominent nucleoli and moderately abundant cytoplasm show necrosis and brisk mitotic activity.',
  'Small cell neuroendocrine carcinoma': () => 'Sheets of small cells with scant cytoplasm, finely granular chromatin, inconspicuous nucleoli and nuclear moulding show crush artefact, necrosis and numerous mitoses.',
  'Mixed neuroendocrine-non-neuroendocrine neoplasm': () => 'Adenocarcinoma and neuroendocrine carcinoma components are both present.'
};

const typeName = (s) => (s.caType === 'Other (specify)' ? stripDot(s.caOther) : s.caType);
const gradeOf = (s) => (GRADED.includes(s.caType) && !blank(s.caGrade) ? lc1(s.caGrade) : '');
function laurenOf(s) {
  if (!LAUREN_TYPES.includes(s.caType) || blank(s.caLauren)) return '';
  return s.caLauren === 'Mixed type' ? 'mixed intestinal and diffuse type (Lauren)' : `${lc1(s.caLauren)} (Lauren)`;
}
/** "TUBULAR ADENOCARCINOMA" / "POORLY COHESIVE CARCINOMA, signet-ring cell type": the term in capitals, qualifiers after the first comma as typed. */
const upperHead = (t) => { const c = t.indexOf(', '); return c > 0 ? `${t.slice(0, c).toUpperCase()}${t.slice(c)}` : t.toUpperCase(); };

/** Diagnosis term for a typed carcinoma ('' when untyped): "INTRAMUCOSAL TUBULAR ADENOCARCINOMA, well differentiated". */
export function carcinomaHead(s) {
  if (!typed(s)) return '';
  const name = upperHead(typeName(s));
  const head = s.dysplasia === 'Intramucosal carcinoma' ? `INTRAMUCOSAL ${name}` : name;
  return [head, gradeOf(s), laurenOf(s)].filter(Boolean).join(', ');
}

/** The "- Dysplasia / malignancy:" value: the typed carcinoma with its morphology, else the option as before. */
export function dysplasiaValue(s) {
  if (!typed(s)) return s.dysplasia;
  const name = s.dysplasia === 'Intramucosal carcinoma' ? `Intramucosal ${lc1(typeName(s))}` : typeName(s);
  const head = [name, gradeOf(s), laurenOf(s)].filter(Boolean).join(', ');
  const fn = CA_MORPHOLOGY[s.caType];
  const morph = fn ? fn(GRADED.includes(s.caType) ? s.caGrade || '' : '') : '';
  return `${head}.${morph ? ` ${morph}` : ''}`;
}

/** The polyp-led or carcinoma-led opening of the diagnosis ('' when the biopsy has neither). */
export function lesionHead(s) {
  const p = polypOf(s);
  const ca = carcinomaHead(s);
  if (!p) return ca;
  if (ca) return `${p.dx} with ${ca}`;
  const d = s.dysplasia || 'Absent';
  if (d === 'Absent') return p.dx;
  if (d === 'Indefinite for dysplasia') return `${p.dx}, INDEFINITE FOR DYSPLASIA`;
  if (d === 'Malignancy present') return `${p.dx}; MALIGNANCY PRESENT`;
  return `${p.dx} with ${d.toUpperCase()}`;
}

// ---------- biomarkers (QMH order: HER2 IHC, dual ISH, EBER, MMR, PD-L1, claudin 18.2) ----------

const requested = (what) => `${what} has been requested (result to follow).`;
const listOf = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

const HER2_IHC = {
  'Score 0': 'HER2 (4B5) is negative (score 0).',
  'Score 1+': 'HER2 (4B5) is negative (score 1+).',
  'Score 2+': 'HER2 (4B5) is equivocal (score 2+).',
  'Score 3+': 'HER2 (4B5) is positive (score 3+).',
  'Cannot be determined': 'HER2 (4B5) cannot be assessed.'
};
export const ISH_SHOWN = ['Score 2+', 'Cannot be determined'];

function ishText(s) {
  const v = s.her2Ish || 'Not performed';
  if (v === 'Pending') return requested('HER2 dual ISH');
  if (v === 'Cannot be determined') return 'HER2 dual ISH cannot be assessed.';
  if (v !== 'Amplified' && v !== 'Not amplified') return '';
  const bits = [];
  if (num(s.her2Ratio) !== null) bits.push(`HER2/CEP17 ratio ${shown(num(s.her2Ratio))}`);
  if (num(s.her2Copies) !== null) bits.push(`average ${shown(num(s.her2Copies))} HER2 signals per cell`);
  return `HER2 dual ISH shows ${v === 'Amplified' ? 'amplification' : 'no amplification'}${bits.length ? ` (${bits.join('; ')})` : ''}.`;
}

export function her2Text(s) {
  const v = s.her2 || 'Not performed';
  const ihc = HER2_IHC[v] || '';
  return [ihc, ihc && ISH_SHOWN.includes(v) ? ishText(s) : ''].filter(Boolean).join(' ');
}

const EBER = {
  'Negative in tumour cells': 'EBER in situ hybridisation is negative in the tumour cells.',
  'Positive in tumour cells': 'EBER in situ hybridisation is positive in the tumour cells.',
  'Background lymphoid cells only': 'EBER in situ hybridisation is negative in the tumour cells, with scattered positive background lymphoid cells.',
  'Cannot be determined': 'EBER in situ hybridisation cannot be assessed.'
};

// The colonic sentences (generators/colonic.js MMR_MICRO), so the two GI templates read alike.
const MMR = {
  'Retained (MLH1, PMS2, MSH2, MSH6)': 'Immunohistochemistry shows retained nuclear expression of MLH1, PMS2, MSH2 and MSH6 in the tumour cells (mismatch repair proficient).',
  'Loss of MLH1 and PMS2': 'Immunohistochemistry shows loss of nuclear expression of MLH1 and PMS2 in the tumour cells, with retained MSH2 and MSH6 (mismatch repair deficient).',
  'Loss of MSH2 and MSH6': 'Immunohistochemistry shows loss of nuclear expression of MSH2 and MSH6 in the tumour cells, with retained MLH1 and PMS2 (mismatch repair deficient).',
  'Isolated loss of PMS2': 'Immunohistochemistry shows isolated loss of nuclear expression of PMS2 in the tumour cells, with retained MLH1, MSH2 and MSH6 (mismatch repair deficient).',
  'Isolated loss of MSH6': 'Immunohistochemistry shows isolated loss of nuclear expression of MSH6 in the tumour cells, with retained MLH1, PMS2 and MSH2 (mismatch repair deficient).'
};

/** The CPS prints as a value with its clone; whether it counts as positive depends on the drug, so no label is printed. */
export function pdl1Text(s) {
  const v = s.pdl1 || 'Not performed';
  const clone = s.pdl1Clone || '22C3';
  if (v === 'Cannot be determined') return `PD-L1 (${clone}) cannot be assessed.`;
  if (v !== 'Performed' || num(s.pdl1Cps) === null) return '';
  const tps = num(s.pdl1Tps);
  return `PD-L1 (${clone}) combined positive score is ${shown(num(s.pdl1Cps))}${tps !== null ? ` (tumour proportion score ${shown(tps)}%)` : ''}.`;
}

/** 2+ plus 3+ (either may be left blank), or null when neither is entered. */
export function claudinTotal(s) {
  const two = num(s.claudin2);
  const three = num(s.claudin3);
  return two === null && three === null ? null : (two || 0) + (three || 0);
}

export function claudinText(s) {
  const v = s.claudin || 'Not performed';
  if (v === 'Cannot be determined') return 'Claudin 18.2 (43-14A) cannot be assessed.';
  if (v !== 'Positive' && v !== 'Negative') return '';
  const head = `Claudin 18.2 (43-14A) is ${v.toLowerCase()}`;
  const total = claudinTotal(s);
  if (total === null) return `${head}.`;
  if (total === 0) return `${head}, with no moderate to strong membranous staining.`;
  const split = num(s.claudin2) !== null && num(s.claudin3) !== null ? ` (2+ ${shown(num(s.claudin2))}%, 3+ ${shown(num(s.claudin3))}%)` : '';
  return `${head}, with moderate to strong membranous staining in ${shown(total)}% of tumour cells${split}.`;
}

const PENDING_IHC = [['her2', 'HER2'], ['mmr', 'mismatch repair'], ['pdl1', 'PD-L1'], ['claudin', 'claudin 18.2']];

/** "HER2, PD-L1 and claudin 18.2 immunohistochemistry have been requested (results to follow)." */
export function pendingText(s) {
  const ihc = PENDING_IHC.filter(([f]) => s[f] === 'Pending').map(([, name]) => name);
  const out = [];
  if (ihc.length) {
    const many = ihc.length > 1;
    const what = listOf(ihc);
    out.push(`${what.charAt(0).toUpperCase()}${what.slice(1)} immunohistochemistry ${many ? 'have' : 'has'} been requested (result${many ? 's' : ''} to follow).`);
  }
  if (s.eber === 'Pending') out.push(requested('EBER in situ hybridisation'));
  return out.join(' ');
}

/** Biomarker sentences in QMH order, then anything still requested; they print only with a carcinoma. */
export function biomarkerText(s) {
  if (!isCarcinoma(s)) return '';
  return [her2Text(s), EBER[s.eber] || '', MMR[s.mmr] || '', pdl1Text(s), claudinText(s), pendingText(s)].filter(Boolean).join(' ');
}

export function biomarkerLines(s) {
  const t = biomarkerText(s);
  return t ? [`- Biomarkers: ${t}`] : [];
}

const recorded = (v) => !blank(v) && v !== 'Not performed';
const anyBiomarker = (s) => [s.her2, s.eber, s.mmr, s.pdl1, s.claudin].some(recorded);

// ---------- checks ----------

/** Polyp, carcinoma and biomarker checks for the gastric biopsy validator. */
export function lesionChecks(s, { err, warn, info }) {
  const d = s.dysplasia || 'Absent';
  if (['Intestinal-type adenoma', 'Foveolar-type adenoma'].includes(s.polyp) && ['Absent', 'Indefinite for dysplasia'].includes(d)) {
    warn(`${s.polyp}: record the dysplasia grade (low or high).`, 'dysplasia');
  }
  if (s.polyp === 'Oxyntic gland adenoma' && ['Low grade dysplasia', 'High grade dysplasia'].includes(d)) {
    warn('Oxyntic gland adenoma shows no more than mild atypia: recheck the dysplasia grade, or consider gastric dysplasia or a fundic-gland-type adenocarcinoma.', 'dysplasia');
  }
  if (s.polyp === 'Inflammatory fibroid polyp' && d !== 'Absent') {
    info('Inflammatory fibroid polyp is a mesenchymal lesion: the dysplasia recorded prints with it on the diagnosis line.', 'dysplasia');
  }
  if (!isCarcinoma(s)) {
    if (anyBiomarker(s)) info('Biomarkers print only when the dysplasia / malignancy field records a carcinoma.', 'dysplasia');
    return;
  }
  if (blank(s.caType)) info(`Carcinoma type not recorded: the line prints "${d.toUpperCase()}".`, 'caType');
  if (s.caType === 'Other (specify)' && blank(s.caOther)) err('Specify the carcinoma type.', 'caOther');
  if (/^Poorly cohesive/.test(s.caType || '') && s.caLauren === 'Intestinal type') warn('Poorly cohesive carcinoma is usually diffuse type (Lauren).', 'caLauren');
  if (['Tubular adenocarcinoma', 'Papillary adenocarcinoma'].includes(s.caType) && s.caLauren === 'Diffuse type') warn(`${s.caType} is usually intestinal type (Lauren).`, 'caLauren');

  if (s.her2 === 'Score 2+' && (s.her2Ish || 'Not performed') === 'Not performed') info('HER2 2+ is equivocal: record the dual ISH result, or Pending.', 'her2Ish');
  if (ISH_SHOWN.includes(s.her2) && ['Amplified', 'Not amplified'].includes(s.her2Ish)) {
    const r = num(s.her2Ratio);
    if (blank(s.her2Ratio)) warn('Record the HER2/CEP17 ratio.', 'her2Ratio');
    else if (r === null || r < 0) err('The HER2/CEP17 ratio is not a number.', 'her2Ratio');
    else if (s.her2Ish === 'Amplified' && r < 2) warn('A HER2/CEP17 ratio below 2.0 is not amplified (CAP).', 'her2Ratio');
    else if (s.her2Ish === 'Not amplified' && r >= 2) warn('A HER2/CEP17 ratio of 2.0 or more is amplified (CAP).', 'her2Ratio');
  }
  if (s.pdl1 === 'Performed') {
    const c = num(s.pdl1Cps);
    if (blank(s.pdl1Cps)) err('Record the combined positive score (CPS).', 'pdl1Cps');
    else if (c === null || c < 0 || c > 100) err('The CPS runs from 0 to 100 (a higher count is recorded as 100).', 'pdl1Cps');
    const t = num(s.pdl1Tps);
    if (!blank(s.pdl1Tps) && (t === null || t < 0 || t > 100)) err('The tumour proportion score is a percentage.', 'pdl1Tps');
  }
  if (['Positive', 'Negative'].includes(s.claudin)) {
    const total = claudinTotal(s);
    if ([s.claudin2, s.claudin3].some((x) => !blank(x) && (num(x) === null || num(x) < 0))) err('Claudin 18.2 percentages must be numbers.', 'claudin2');
    else if (total !== null && total > 100) err('Claudin 18.2: the 2+ and 3+ percentages add up to more than 100%.', 'claudin2');
    else if (total !== null && s.claudin === 'Positive' && total < 75) warn('Claudin 18.2 is positive at 75% or more of tumour cells with moderate to strong membranous staining (VENTANA 43-14A).', 'claudin');
    else if (total !== null && s.claudin === 'Negative' && total >= 75) warn('75% or more of tumour cells with moderate to strong membranous staining is claudin 18.2 positive (VENTANA 43-14A).', 'claudin');
  }
}
