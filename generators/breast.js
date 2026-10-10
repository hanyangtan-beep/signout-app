// Breast core biopsy generator. Pure functions: (part, ctx) -> string.
// Each part is one biopsy site. The B category (WHO Classification of Tumours, Breast, 6th ed.,
// "Small diagnostic samples": B1 normal / inadequate, B2 benign, B3 uncertain malignant potential,
// B4 suspicious, B5a in situ, B5b invasive, B5c malignant, in situ vs invasive not assessable) is
// derived from the category and printed at the end of the diagnosis line, e.g.
//   "(A) BREAST, right 10 o'clock, 4 cm FN, core biopsy - FIBROADENOMA (B2)"
// The biomarker block is a verbatim port of the Breast biomarkers template (see breast_biomarkers.js).
// British spelling is written directly (schema style.british is off). Wording is protected by
// tests/breast.test.js — change it only deliberately.
// The "Papillary lesion" category (Phase 50) takes its B code from the lesion and, for encapsulated and
// solid papillary carcinoma, from the invasion field; its wording is protected by tests/breast_papillary.test.js
// and the golden fixtures in tests/fixtures/breast_biopsy/. Grounding: docs/reference/breast-papillary-lesions.md.

import { biomarkerReport, hasBiomarkerData } from './breast_biomarkers.js';

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => String(n).replace(/\.0+$/, '');
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n) => (n >= 0 && n <= 10 ? WORDS[n] : String(n));
const low = (s) => String(s || '').trim().toLowerCase();
const clean = (s) => String(s || '').trim().replace(/[.;\s]+$/, '');

export const B_CODES = { B1: 'B1', B2: 'B2', B3: 'B3', B4: 'B4', B5a: 'B5a', B5b: 'B5b', B5c: 'B5c' };

function coreCount(part) {
  const n = num(part.values.coresTotal);
  return n === null || n < 1 ? 1 : Math.round(n);
}

/** "cores of" / "a core of" opener. */
function coresPhrase(part) {
  const n = coreCount(part);
  return n === 1 ? 'a core' : `${word(n)} cores`;
}

const isLN = (part) => part.values.category === 'LN';

const cap = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;

// The side is the one the request named. A pasted request that names none leaves the chips blank
// (`match.sideFromText`), and the lines then carry no side instead of a guessed one; validate() asks.
export function specimenName(part) {
  const v = part.values;
  const side = low(v.laterality);
  const site = clean(v.specimenName);
  if (isLN(part)) return `${cap([side, site || 'axillary lymph node'].filter(Boolean).join(' '))}, core biopsy`;
  return `${cap([side, 'breast'].filter(Boolean).join(' '))}${site ? `, ${site}` : ''}, core biopsy`;
}

/** B code for a part: manual override, else derived from the category (for a papillary lesion, from the
 * lesion and its invasion). Lymph node cores carry none. */
export function bCode(part) {
  const v = part.values;
  if (isLN(part)) return '';
  if (v.bOverride && v.bOverride !== 'Auto') return v.bOverride;
  if (v.category === 'Papillary') return papillaryCode(v);
  return B_CODES[v.category] || '';
}

/** Nottingham grade from the three scores: 3-5 = 1, 6-7 = 2, 8-9 = 3. */
export function nottingham(t, n, m) {
  const a = parseInt(t, 10), b = parseInt(n, 10), c = parseInt(m, 10);
  if (![1, 2, 3].includes(a) || ![1, 2, 3].includes(b) || ![1, 2, 3].includes(c)) return null;
  const sum = a + b + c;
  return { sum, grade: sum <= 5 ? 1 : sum <= 7 ? 2 : 3 };
}

const NO_MALIG = 'There is no evidence of atypical hyperplasia, in situ or invasive malignancy.';

const B2_TEXT = {
  Fibroadenoma: 'a fibroepithelial lesion composed of compressed, elongated ducts within a bland, paucicellular fibrous stroma. The epithelial component shows no atypia and there is no stromal overgrowth, stromal atypia or significant mitotic activity. The features are those of a fibroadenoma.',
  'Fibrocystic change': 'breast tissue with cyst formation, apocrine metaplasia, stromal fibrosis and mild usual ductal hyperplasia, in keeping with fibrocystic change.',
  'Usual ductal hyperplasia': 'breast tissue in which ducts are expanded by a proliferation of streaming epithelial cells of variable size and shape with irregular, slit-like peripheral lumina, in keeping with usual ductal hyperplasia.',
  'Columnar cell change': 'breast tissue with variably dilated acini lined by columnar epithelial cells bearing apical snouts, without cytological atypia, in keeping with columnar cell change.',
  'Sclerosing adenosis': 'breast tissue with a lobulocentric proliferation of compressed and distorted glands within a sclerotic stroma. A myoepithelial layer is preserved. The features are those of sclerosing adenosis.',
  'Fat necrosis': 'fibroadipose breast tissue with fat necrosis, foamy macrophages, foreign body giant cell reaction and fibrosis.',
  'Duct ectasia': 'breast tissue with dilated ducts containing inspissated secretions and foamy macrophages, with periductal fibrosis and chronic inflammation, in keeping with duct ectasia.',
  Mastitis: 'breast tissue with a dense mixed acute and chronic inflammatory infiltrate involving the ducts, lobules and stroma, in keeping with mastitis.',
  PASH: 'breast tissue with anastomosing slit-like spaces within a dense collagenous stroma, lined by bland spindle cells, in keeping with pseudoangiomatous stromal hyperplasia.',
  Gynaecomastia: 'breast tissue with ducts showing epithelial hyperplasia surrounded by loose, oedematous periductal stroma. No lobules are seen. The features are those of gynaecomastia.',
  'Lactational change': 'breast tissue with lobules showing secretory (lactational) change. There is no atypia.'
};
const B2_DX = {
  Fibroadenoma: 'FIBROADENOMA', 'Fibrocystic change': 'FIBROCYSTIC CHANGE', 'Usual ductal hyperplasia': 'USUAL DUCTAL HYPERPLASIA',
  'Columnar cell change': 'COLUMNAR CELL CHANGE', 'Sclerosing adenosis': 'SCLEROSING ADENOSIS', 'Fat necrosis': 'FAT NECROSIS',
  'Duct ectasia': 'DUCT ECTASIA', Mastitis: 'MASTITIS', PASH: 'PSEUDOANGIOMATOUS STROMAL HYPERPLASIA',
  Gynaecomastia: 'GYNAECOMASTIA', 'Lactational change': 'LACTATIONAL CHANGE'
};

const B3_TEXT = {
  'Atypical ductal hyperplasia': 'breast tissue in which one to two ducts are expanded by a monotonous epithelial proliferation forming rigid cribriform spaces, lined by cells with evenly spaced rounded nuclei. The proliferation is limited in extent and falls short of ductal carcinoma in situ. The features are those of atypical ductal hyperplasia.',
  'Flat epithelial atypia': 'breast tissue with dilated acini lined by one to several layers of columnar epithelial cells showing low grade cytological atypia with rounded nuclei and apical snouts, without architectural complexity. The features are those of flat epithelial atypia.',
  'Lobular neoplasia': 'breast tissue with lobules expanded by a proliferation of small, discohesive, monotonous epithelial cells with intracytoplasmic vacuoles, in keeping with lobular neoplasia (atypical lobular hyperplasia / lobular carcinoma in situ).',
  'Intraduct papilloma': 'an intraductal papillary proliferation with fibrovascular cores lined by epithelial and myoepithelial cells',
  'Radial scar / complex sclerosing lesion': 'a sclerosing lesion with a central fibroelastotic core from which entrapped, distorted ducts radiate, with surrounding ducts showing usual ductal hyperplasia and cyst formation',
  'Cellular fibroepithelial lesion': 'a fibroepithelial lesion with a cellular stroma showing mild stromal expansion and focal periductal condensation. There is no stromal atypia and mitotic activity is low. Fibroadenoma and benign phyllodes tumour cannot be reliably distinguished on core biopsy.',
  'Mucocoele-like lesion': 'breast tissue with dilated ducts containing mucin, with extravasation of mucin into the surrounding stroma. The lining epithelium is attenuated'
};
const B3_DX = {
  'Atypical ductal hyperplasia': 'ATYPICAL DUCTAL HYPERPLASIA', 'Flat epithelial atypia': 'FLAT EPITHELIAL ATYPIA',
  'Lobular neoplasia': 'LOBULAR NEOPLASIA (ATYPICAL LOBULAR HYPERPLASIA / LOBULAR CARCINOMA IN SITU)',
  // The option value stays "Intraduct papilloma" so saved drafts still open; the printed line follows the
  // released reports, which read INTRADUCTAL (the five-year biopsy file and the LIS export hold no INTRADUCT).
  'Intraduct papilloma': 'INTRADUCTAL PAPILLOMA', 'Radial scar / complex sclerosing lesion': 'RADIAL SCAR / COMPLEX SCLEROSING LESION',
  'Cellular fibroepithelial lesion': 'CELLULAR FIBROEPITHELIAL LESION, PHYLLODES TUMOUR NOT EXCLUDED', 'Mucocoele-like lesion': 'MUCOCOELE-LIKE LESION'
};
const B3_ATYPIA_LESIONS = ['Intraduct papilloma', 'Radial scar / complex sclerosing lesion', 'Mucocoele-like lesion'];

const INV_TEXT = {
  'No special type': 'an invasive carcinoma of no special type composed of tumour cells arranged in cords, nests and sheets',
  Lobular: 'an invasive lobular carcinoma composed of small, discohesive tumour cells infiltrating the stroma in single files and targetoid arrangements',
  Mucinous: 'an invasive mucinous carcinoma composed of clusters of tumour cells floating in pools of extracellular mucin',
  Tubular: 'an invasive tubular carcinoma composed of well formed, angulated tubules lined by a single layer of tumour cells',
  Micropapillary: 'an invasive micropapillary carcinoma composed of morula-like clusters of tumour cells within clear stromal spaces',
  Metaplastic: 'a metaplastic carcinoma with spindle cell and heterologous differentiation'
};
const INV_DX = {
  'No special type': 'INVASIVE CARCINOMA OF NO SPECIAL TYPE', Lobular: 'INVASIVE LOBULAR CARCINOMA', Mucinous: 'INVASIVE MUCINOUS CARCINOMA',
  Tubular: 'INVASIVE TUBULAR CARCINOMA', Micropapillary: 'INVASIVE MICROPAPILLARY CARCINOMA', Metaplastic: 'METAPLASTIC CARCINOMA'
};
const TUBULE_TEXT = { 1: 'Tubule formation is well developed throughout most of the tumour', 2: 'Tubule formation is seen in a moderate proportion of the tumour', 3: 'Tubule formation is inconspicuous' };
const NUCLEAR_TEXT = { 1: 'small, uniform nuclei with inconspicuous nucleoli', 2: 'moderate nuclear pleomorphism with visible nucleoli', 3: 'marked nuclear pleomorphism with vesicular chromatin and prominent nucleoli' };
const MITOSES_TEXT = { 1: 'Mitoses are infrequent', 2: 'Mitoses are readily identified', 3: 'Mitoses are frequent' };

function calcSentence(v) {
  const c = v.calcification || 'Not identified';
  if (c === 'Within the lesion') return 'Calcification is present within the lesion.';
  if (c === 'In benign breast tissue') return v.target === 'Calcification' ? 'Calcification is present in benign breast tissue, in keeping with the imaging target.' : 'Calcification is present in benign breast tissue.';
  if (v.target === 'Calcification') return 'Calcification is not identified in the sections examined; radiological correlation is recommended.';
  return '';
}

function benignNarrative(part) {
  const v = part.values;
  const lesion = v.b2Lesion || 'Fibroadenoma';
  if (lesion === 'Other') {
    const name = clean(v.b2Other) || 'a benign lesion';
    return `Sections show ${coresPhrase(part)} of breast tissue showing ${low(name)}. ${NO_MALIG}`;
  }
  return `Sections show ${coresPhrase(part)} of ${B2_TEXT[lesion]} ${NO_MALIG}`;
}

function b3Narrative(part) {
  const v = part.values;
  const lesion = v.b3Lesion || 'Atypical ductal hyperplasia';
  let text = `Sections show ${coresPhrase(part)} of ${B3_TEXT[lesion]}`;
  if (B3_ATYPIA_LESIONS.includes(lesion)) {
    text += v.b3Atypia === 'Present'
      ? '. The epithelium shows focal cytological atypia. There is no evidence of invasive malignancy.'
      : '. The epithelium shows no atypia. There is no evidence of in situ or invasive malignancy.';
  } else if (lesion === 'Atypical ductal hyperplasia' || lesion === 'Flat epithelial atypia' || lesion === 'Lobular neoplasia') {
    text += ' There is no evidence of invasive malignancy.';
  } else {
    text += ' There is no evidence of in situ or invasive malignancy.';
  }
  if (v.b3Advice === 'Multidisciplinary discussion') text += ' Multidisciplinary discussion is recommended.';
  if (v.b3Advice === 'Excision') text += ' Excision is recommended.';
  return text;
}

function b4Narrative(part) {
  const v = part.values;
  const reason = {
    'Scanty atypical cells': 'the scanty nature of the atypical cells',
    'Crush artefact': 'crush artefact',
    'Atypical cells at the edge of the core': 'the atypical cells being present only at the edge of the core',
    'Equivocal immunohistochemistry': 'equivocal immunohistochemical staining'
  }[v.b4Reason] || 'the limited material';
  return `Sections show ${coresPhrase(part)} of breast tissue containing a small focus of atypical epithelial cells with enlarged, hyperchromatic nuclei. The features are suspicious for ${low(v.b4For || 'malignancy')} but are not diagnostic owing to ${reason}. Further sampling is recommended.`;
}

function insituNarrative(part) {
  const v = part.values;
  if (v.insituType === 'Pleomorphic lobular carcinoma in situ') {
    return `Sections show ${coresPhrase(part)} of breast tissue with lobules and ducts distended by discohesive tumour cells showing marked nuclear pleomorphism${v.dcisNecrosis === 'Present' ? ' and central comedo-type necrosis' : ''}. The tumour cells show loss of E-cadherin expression. The features are those of pleomorphic lobular carcinoma in situ. There is no evidence of invasive carcinoma in the material examined.`;
  }
  const grade = low(v.dcisGrade || 'high');
  const pattern = low(v.dcisPattern || 'solid');
  let text = `Sections show ${coresPhrase(part)} of breast tissue containing ducts expanded by ${grade} nuclear grade ductal carcinoma in situ with a ${pattern} pattern${v.dcisNecrosis === 'Present' ? ' and comedo-type necrosis' : ''}.`;
  text += v.dcisP63 === 'Yes'
    ? ' A myoepithelial layer is preserved around the involved ducts, confirmed on p63 immunostaining.'
    : ' A myoepithelial layer is preserved around the involved ducts.';
  text += ' There is no evidence of invasive carcinoma in the material examined.';
  return text;
}

function invasiveNarrative(part) {
  const v = part.values;
  const type = v.invType || 'No special type';
  const g = nottingham(v.tubules, v.nuclear, v.mitoses);
  const opener = type === 'Other'
    ? `an invasive carcinoma (${low(clean(v.invOther)) || 'type not further specified'}) composed of tumour cells arranged in cords, nests and sheets`
    : INV_TEXT[type];
  let text = `Sections show ${coresPhrase(part)} of breast tissue infiltrated by ${opener}. ${TUBULE_TEXT[v.tubules] || TUBULE_TEXT[3]}. The tumour cells show ${NUCLEAR_TEXT[v.nuclear] || NUCLEAR_TEXT[2]}. ${MITOSES_TEXT[v.mitoses] || MITOSES_TEXT[1]}.`;
  if (g) text += ` Provisional Nottingham grade ${g.grade} (tubules ${v.tubules}, nuclear pleomorphism ${v.nuclear}, mitoses ${v.mitoses}; score ${g.sum}/9).`;
  const mm = num(v.invExtentMm);
  if (mm !== null) text += ` The invasive carcinoma measures ${fmt(mm)} mm in maximum extent in the cores.`;
  text += v.invDcis === 'Present' ? ' An associated ductal carcinoma in situ component is present.' : ' No ductal carcinoma in situ is identified.';
  text += v.lvi === 'Present' ? ' Lymphovascular invasion is present.' : ' Lymphovascular invasion is not identified.';
  return text;
}

function b5cNarrative(part) {
  const v = part.values;
  const reason = {
    'Crush / cautery artefact': 'crush and cautery artefact',
    'Scanty malignant cells': 'the scanty nature of the malignant cells',
    'Equivocal myoepithelial staining': 'equivocal myoepithelial immunostaining'
  }[v.b5cReason] || 'the limited material';
  return `Sections show ${coresPhrase(part)} of breast tissue containing malignant epithelial cells with enlarged, pleomorphic, hyperchromatic nuclei. The distinction between in situ and invasive carcinoma cannot be made on this material owing to ${reason}.`;
}

// ---------- papillary lesions (Phase 50) ----------
// B codes (RCPath G150, 2026: s3.5, s3.6.5, s3.8 and Appendix F): a papilloma with or without atypia is B3,
// B2 only when small and seen whole within the width of the core; ADH and DCIS within a papilloma are split
// by extent (3 mm); papilloma with DCIS, papillary DCIS, and encapsulated and solid papillary carcinoma are
// B5a; B5b needs overt invasion; B5c only for fragments of carcinoma with no surrounding stroma. Invasion
// needs unequivocal stromal invasion - absent myoepithelial cells alone are not invasion (Rakha, Histopathology
// 2026, his.70072; WHO 6th ed.). None of these rules is printed: the report states the findings.
// Phase 61: invasive lobular carcinoma with solid papillary pattern, a variation of the solid pattern of ILC in
// WHO 6th ed. (Quinn, Histopathology 2026, his.70149), is invasive carcinoma, so B5b; E-cadherin and p120
// separate it from solid and encapsulated papillary carcinoma (Kuba and Brogi, Histopathology 2023, his.14829).

export const PAP = {
  IP: 'Intraductal papilloma', SUG: 'Papillary lesion, suggestive of papilloma', ADH: 'Papilloma with atypical ductal hyperplasia',
  DCIS_IN: 'Papilloma with ductal carcinoma in situ', PDCIS: 'Papillary ductal carcinoma in situ',
  EPC: 'Encapsulated papillary carcinoma', SPC: 'Solid papillary carcinoma', IPC: 'Invasive papillary carcinoma',
  ILC_SP: 'Invasive lobular carcinoma with solid papillary pattern'
};
const papLesion = (v) => v.papLesion || PAP.IP;
const isEpcSpc = (lesion) => lesion === PAP.EPC || lesion === PAP.SPC;
/** The invasion pick of an encapsulated or solid papillary carcinoma; '' for the other lesions. */
const papInvasion = (v) => (isEpcSpc(papLesion(v)) ? v.papInvasion || 'Not identified' : '');

/** True when the papillary lesion carries an invasive component (the grading fields show). */
export function papInvasive(v) {
  const lesion = papLesion(v);
  return lesion === PAP.IPC || lesion === PAP.ILC_SP || (isEpcSpc(lesion) && papInvasion(v) === 'Present');
}

/** The B code a papillary lesion gives before any override. */
export function papillaryCode(v) {
  const lesion = papLesion(v);
  if (lesion === PAP.IP) return v.papWithinCore ? 'B2' : 'B3';
  if (lesion === PAP.SUG || lesion === PAP.ADH) return 'B3';
  if (lesion === PAP.DCIS_IN || lesion === PAP.PDCIS) return 'B5a';
  if (isEpcSpc(lesion)) {
    const inv = papInvasion(v);
    return inv === 'Present' ? 'B5b' : inv === 'Not assessable' ? 'B5c' : 'B5a';
  }
  return lesion === PAP.IPC || lesion === PAP.ILC_SP ? 'B5b' : 'B3';
}

/** The B3 recommendation prints for the B3 papillary lesions; it mirrors the b3Advice showIf. */
const papAdvises = (v) => [PAP.SUG, PAP.ADH].includes(papLesion(v)) || (papLesion(v) === PAP.IP && !v.papWithinCore);

const listJoin = (xs, conj = 'and') => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${conj} ${xs[xs.length - 1]}`);
const papGrade = (v) => low(v.papGrade || 'Low');
// Cells lining the cores, by nuclear grade: lining cells (papillary DCIS, EPC, DCIS in a papilloma) and
// the tumour cells of a solid papillary carcinoma.
const LINING = {
  low: 'a monotonous population of atypical epithelial cells with small, uniform nuclei',
  intermediate: 'atypical epithelial cells with moderately enlarged, mildly pleomorphic nuclei',
  high: 'atypical epithelial cells with large, pleomorphic nuclei'
};
const SOLID = {
  low: 'monotonous tumour cells with small, uniform nuclei',
  intermediate: 'tumour cells with moderately enlarged, mildly pleomorphic nuclei',
  high: 'tumour cells with large, pleomorphic nuclei'
};

/** Where the edge of the lesion lies, for the p63 sentence. */
function papEdgeWords(lesion) {
  if (lesion === PAP.PDCIS) return 'around the involved ducts';
  if (lesion === PAP.SPC || lesion === PAP.ILC_SP) return 'around the tumour nodules';
  return 'at the periphery of the lesion';
}

/** One p63 sentence from the cores and edge picks (house: "Immunostaining for p63 ..."); '' if unstained. */
function papP63Sentence(v, lesion, b5c) {
  const cores = v.papMecCores || 'Not stained';
  const edge = v.papMecEdge || 'Not stained';
  const where = papEdgeWords(lesion);
  const pos = [];
  const neg = [];
  if (cores === 'Present') pos.push('along the fibrovascular cores');
  if (cores === 'Absent in the atypical areas') { pos.push('along the fibrovascular cores'); neg.push('within the atypical areas'); }
  if (cores === 'Absent') neg.push('along the fibrovascular cores');
  if (edge === 'Present') pos.push(where);
  if (edge === 'Focal') pos.push(`focally ${where}`);
  if (edge === 'Absent') neg.push(where);
  let text = '';
  if (pos.length) text = `Immunostaining for p63 demonstrates myoepithelial cells ${listJoin(pos)}${neg.length ? ` but none ${listJoin(neg, 'or')}` : ''}.`;
  else if (neg.length) text = `Immunostaining for p63 shows no myoepithelial cells ${listJoin(neg, 'or')}.`;
  // A stroma-free B5c core already says why the edge cannot be judged.
  if (edge === 'Edge not sampled' && !b5c) text = [text, 'The edge of the lesion is not represented in the cores.'].filter(Boolean).join(' ');
  return text;
}

/** E-cadherin and p120 as a predicate of "The tumour cells": encapsulated and solid papillary carcinoma and
 * the solid papillary pattern of ILC only (their fields show); '' when neither is stained. */
const CADHERIN_LESIONS = [PAP.EPC, PAP.SPC, PAP.ILC_SP];
function papCadherinPhrase(v, lesion) {
  if (!CADHERIN_LESIONS.includes(lesion)) return '';
  const e = { Lost: 'show loss of E-cadherin expression', Aberrant: 'show aberrant E-cadherin expression', Retained: 'retain membranous E-cadherin expression' }[v.papEcad];
  const p = { Cytoplasmic: 'cytoplasmic p120 staining', Membranous: 'membranous p120 staining' }[v.papP120];
  if (e && p) {
    if (v.papEcad === 'Retained') return v.papP120 === 'Membranous' ? 'retain membranous E-cadherin and p120 expression' : `${e} but show ${p}`;
    return `${e} with ${p}`;
  }
  return e || (p ? `show ${p}` : '');
}

/** E-cadherin and p120, CK5/6 and ER on the lesional cells, in one sentence (house: "show loss of CK5/6",
 * "diffusely positive for ER"). */
function papCkErSentence(v, lesion) {
  const ck = { Mosaic: 'show a mosaic pattern of CK5/6 staining', Negative: 'show loss of CK5/6' }[v.papCk56];
  const er = { Heterogeneous: 'are heterogeneously positive for ER', 'Diffuse, strong': 'are diffusely and strongly positive for ER' }[v.papEr];
  const preds = [papCadherinPhrase(v, lesion), ck, er].filter(Boolean);
  if (!preds.length) return '';
  const subject = [PAP.IP, PAP.SUG].includes(lesion) ? 'The epithelial cells' : [PAP.ADH, PAP.DCIS_IN].includes(lesion) ? 'The atypical cells' : 'The tumour cells';
  return `${subject} ${listJoin(preds)}.`;
}

/** Neuroendocrine markers: solid papillary carcinoma and the solid papillary pattern of ILC. */
function papNeSentence(v, afterCkEr) {
  if (!['Positive', 'Negative'].includes(v.papNe)) return '';
  const picked = (Array.isArray(v.papNeMarkers) ? v.papNeMarkers : []).map((m) => (m === 'INSM1' ? m : low(m)));
  const pos = v.papNe === 'Positive';
  const list = picked.length ? listJoin(picked, pos ? 'and' : 'or') : 'neuroendocrine markers';
  if (afterCkEr) return pos ? `They also express ${list}.` : `They do not express ${list}.`;
  return pos ? `The tumour cells express ${list}.` : `The tumour cells do not express ${list}.`;
}

/** The invasive component's name in a sentence ("Invasive mucinous carcinoma"). */
function papInvName(v) {
  const type = v.papInvType || 'No special type';
  if (type === 'Other') return cap(clean(v.papInvOther) || 'invasive carcinoma');
  return { 'No special type': 'Invasive carcinoma of no special type', 'Solid papillary': 'Invasive solid papillary carcinoma',
    Mucinous: 'Invasive mucinous carcinoma', Lobular: 'Invasive lobular carcinoma' }[type] || 'Invasive carcinoma of no special type';
}

/** Grading, extent and LVI; `component` words them for the invasive part of an in situ papillary carcinoma. */
function papGradingSentences(v, component) {
  const g = nottingham(v.tubules, v.nuclear, v.mitoses);
  const tubule = TUBULE_TEXT[v.tubules] || TUBULE_TEXT[3];
  let text = component
    ? `In the invasive component, ${tubule[0].toLowerCase()}${tubule.slice(1)}. The invasive tumour cells show ${NUCLEAR_TEXT[v.nuclear] || NUCLEAR_TEXT[2]}. ${MITOSES_TEXT[v.mitoses] || MITOSES_TEXT[1]}.`
    : `${tubule}. The tumour cells show ${NUCLEAR_TEXT[v.nuclear] || NUCLEAR_TEXT[2]}. ${MITOSES_TEXT[v.mitoses] || MITOSES_TEXT[1]}.`;
  if (g) text += ` Provisional Nottingham grade ${g.grade} (tubules ${v.tubules}, nuclear pleomorphism ${v.nuclear}, mitoses ${v.mitoses}; score ${g.sum}/9).`;
  const mm = num(v.invExtentMm);
  if (mm !== null) text += ` The invasive carcinoma measures ${fmt(mm)} mm in maximum extent in the cores.`;
  text += v.lvi === 'Present' ? ' Lymphovascular invasion is present.' : ' Lymphovascular invasion is not identified.';
  return text;
}

const INV_SEEN = {
  'Irregular infiltrative margin': 'an irregular infiltrative margin', 'Desmoplastic stroma': 'desmoplastic stroma',
  'Entrapped fat': 'entrapped fat', 'Entrapped breast tissue': 'entrapped breast tissue'
};

/** The invasion statement of an encapsulated or solid papillary carcinoma. */
function papInvasionText(v, lesion) {
  const inv = papInvasion(v);
  if (inv === 'Not assessable') return 'The distinction between in situ and invasive carcinoma cannot be made on this material, as the fragments include no surrounding stroma.';
  if (inv === 'Suspicious, not definite') {
    const s = v.papSuspect || 'Irregular nests at the edge';
    if (s === 'Irregular nests at the edge') return 'Irregular nests of tumour cells are present at the edge of the lesion, but definite stromal invasion is not established. Invasion cannot be excluded.';
    if (s === 'Nests entrapped in the capsule or stroma') {
      return `Nests of tumour cells are entrapped within the ${lesion === PAP.EPC ? 'fibrous capsule' : 'surrounding stroma'}, but definite stromal invasion is not established. Invasion cannot be excluded.`;
    }
    return 'Definite stromal invasion is not established, but invasion cannot be excluded.';
  }
  if (inv === 'Present') {
    const seen = (Array.isArray(v.papInvSeen) ? v.papInvSeen : []).map((x) => INV_SEEN[x]).filter(Boolean);
    const where = lesion === PAP.EPC ? 'beyond the fibrous capsule' : 'beyond the circumscribed nodules';
    return `${papInvName(v)} is present ${where}${seen.length ? `, with ${listJoin(seen)}` : ''}. ${papGradingSentences(v, true)}`;
  }
  return 'There is no evidence of invasive carcinoma in the material examined.';
}

function papillaryNarrative(part) {
  const v = part.values;
  const lesion = papLesion(v);
  const cores = coresPhrase(part);
  const g = papGrade(v);
  const b5c = papInvasion(v) === 'Not assessable';
  const out = [];
  if (lesion === PAP.IP) {
    out.push(`Sections show ${cores} of breast tissue containing an intraductal papillary proliferation with fibrovascular cores lined by epithelial and myoepithelial cells.`);
    out.push(v.papUdh ? 'The epithelium shows usual ductal hyperplasia without atypia.' : 'The epithelium shows no atypia.');
  } else if (lesion === PAP.SUG) {
    out.push(`Sections show ${cores} of breast tissue and detached fragments of a papillary lesion. The fragments consist of fibrovascular cores lined by epithelial and myoepithelial cells, and the epithelium shows no atypia.`);
  } else if (lesion === PAP.ADH) {
    out.push(`Sections show ${cores} of breast tissue containing an intraductal papilloma with fibrovascular cores lined by epithelial and myoepithelial cells. Part of the papilloma is involved by a monotonous epithelial proliferation forming rigid cribriform spaces, lined by cells with evenly spaced rounded nuclei. The atypical proliferation is limited in extent and falls short of ductal carcinoma in situ.`);
  } else if (lesion === PAP.DCIS_IN) {
    out.push(`Sections show ${cores} of breast tissue containing an intraductal papilloma with fibrovascular cores lined by epithelial and myoepithelial cells. Part of the papilloma is involved by ${g} nuclear grade ductal carcinoma in situ, composed of ${LINING[g]}.`);
  } else if (lesion === PAP.PDCIS) {
    out.push(`Sections show ${cores} of breast tissue containing ducts distended by a papillary proliferation, with delicate fibrovascular cores lined by ${LINING[g]}.`);
  } else if (lesion === PAP.EPC) {
    out.push(b5c
      ? `Sections show ${cores} composed entirely of fragments of a papillary carcinoma, with delicate fibrovascular cores lined by ${LINING[g]}.`
      : `Sections show ${cores} of breast tissue containing a papillary carcinoma within a cystic space surrounded by a fibrous capsule. The delicate fibrovascular cores are lined by ${LINING[g]}.`);
  } else if (lesion === PAP.SPC) {
    out.push(b5c
      ? `Sections show ${cores} composed entirely of fragments of a solid epithelial proliferation of ${SOLID[g]}, arranged around delicate fibrovascular cores.`
      : `Sections show ${cores} of breast tissue containing expansile solid nodules with smooth contours, composed of ${SOLID[g]} arranged around delicate fibrovascular cores.`);
  } else if (lesion === PAP.ILC_SP) {
    out.push(`Sections show ${cores} of breast tissue containing expansile, well-circumscribed solid nodules of discohesive tumour cells arranged around delicate fibrovascular cores.`);
    if (v.papIlcCords) out.push('Similar tumour cells also infiltrate the adjacent stroma in single files and linear cords.');
  } else {
    out.push(`Sections show ${cores} of breast tissue infiltrated by an invasive papillary carcinoma, composed of papillary structures with fibrovascular cores lined by tumour cells, without a myoepithelial layer.`);
    out.push(papGradingSentences(v, false));
    return out.join(' ');
  }
  const p63 = papP63Sentence(v, lesion, b5c);
  const ckEr = papCkErSentence(v, lesion);
  out.push(p63, ckEr);
  if (lesion === PAP.SPC || lesion === PAP.ILC_SP) out.push(papNeSentence(v, !!ckEr));
  if (lesion === PAP.IP) {
    out.push('The features are consistent with intraductal papilloma.');
    if (v.papWithinCore) out.push('The papilloma is small and is seen whole within the core.');
    out.push('There is no evidence of in situ or invasive malignancy.');
  } else if (lesion === PAP.SUG) {
    out.push('The features are suggestive of intraductal papilloma. There is no evidence of in situ or invasive malignancy.');
  } else if (lesion === PAP.ADH) {
    out.push('The features are those of an intraductal papilloma with atypical ductal hyperplasia. There is no evidence of invasive malignancy.');
  } else if (lesion === PAP.DCIS_IN) {
    out.push('There is no evidence of invasive carcinoma in the material examined.');
  } else if (lesion === PAP.PDCIS) {
    out.push(`The features are those of ${g} nuclear grade papillary ductal carcinoma in situ. There is no evidence of invasive carcinoma in the material examined.`);
  } else if (lesion === PAP.ILC_SP) {
    out.push('The features are those of invasive lobular carcinoma with a solid papillary pattern.');
    out.push(papGradingSentences(v, false));
  } else {
    const name = lesion === PAP.EPC ? 'encapsulated papillary carcinoma' : 'solid papillary carcinoma';
    out.push(b5c ? `The features are in keeping with ${name}.` : `The features are those of ${name}.`);
    out.push(papInvasionText(v, lesion));
  }
  if (papAdvises(v)) {
    if (v.b3Advice === 'Multidisciplinary discussion') out.push('Multidisciplinary discussion is recommended.');
    if (v.b3Advice === 'Excision') out.push('Excision is recommended.');
  }
  return out.filter(Boolean).join(' ');
}

/** The diagnosis after the organ head, before the B code. Released wording: "INTRADUCTAL PAPILLOMA with
 * USUAL DUCTAL HYPERPLASIA", "PAPILLARY LESION, suggestive of INTRADUCTAL PAPILLOMA", "..., low grade". */
function papillaryDx(v) {
  const lesion = papLesion(v);
  const grade = `${papGrade(v)} grade`;
  const g = nottingham(v.tubules, v.nuclear, v.mitoses);
  const provisional = g ? `, provisional grade ${g.grade}` : '';
  if (lesion === PAP.IP) return v.papUdh ? 'INTRADUCTAL PAPILLOMA with USUAL DUCTAL HYPERPLASIA' : 'INTRADUCTAL PAPILLOMA';
  if (lesion === PAP.SUG) return 'PAPILLARY LESION, suggestive of INTRADUCTAL PAPILLOMA';
  if (lesion === PAP.ADH) return 'INTRADUCTAL PAPILLOMA with ATYPICAL DUCTAL HYPERPLASIA';
  if (lesion === PAP.DCIS_IN) return `INTRADUCTAL PAPILLOMA with DUCTAL CARCINOMA IN SITU, ${grade}`;
  if (lesion === PAP.PDCIS) return `PAPILLARY DUCTAL CARCINOMA IN SITU, ${grade}`;
  if (lesion === PAP.IPC) return `INVASIVE PAPILLARY CARCINOMA${provisional}`;
  if (lesion === PAP.ILC_SP) return `INVASIVE LOBULAR CARCINOMA with SOLID PAPILLARY PATTERN${provisional}`;
  const name = lesion === PAP.EPC ? 'ENCAPSULATED PAPILLARY CARCINOMA' : 'SOLID PAPILLARY CARCINOMA';
  const inv = papInvasion(v);
  if (inv === 'Suspicious, not definite') return `${name}, invasion cannot be excluded`;
  if (inv === 'Not assessable') return `${name}, IN SITU VERSUS INVASIVE NOT ASSESSABLE`;
  if (inv === 'Present') {
    // WHO 6th ed.: invasive solid papillary carcinoma is its own entity, so it is named alone.
    if (lesion === PAP.SPC && v.papInvType === 'Solid papillary') return `INVASIVE SOLID PAPILLARY CARCINOMA${provisional}`;
    return `${name} with ${papInvName(v).toUpperCase()}${provisional}`;
  }
  return `${name} without invasion`;
}

/** Checks for a papillary lesion: warnings where the picks disagree with each other or with the rules above,
 * and reminders of the rules themselves (level info). */
function papillaryChecks(v) {
  const lesion = papLesion(v);
  const inv = papInvasion(v);
  const out = [];
  const warn = (field, message) => out.push({ level: 'warn', field, message });
  const info = (field, message) => out.push({ level: 'info', field, message });
  if (inv === 'Present' && !(Array.isArray(v.papInvSeen) && v.papInvSeen.length)) {
    warn('papInvSeen', 'Invasion is recorded without a stromal feature. Absent myoepithelial cells alone do not make invasion (Rakha 2026; WHO 6th ed.): tick what shows it.');
  }
  if ([PAP.IP, PAP.SUG, PAP.ADH, PAP.DCIS_IN].includes(lesion) && v.papMecCores === 'Absent') {
    warn('papMecCores', 'No myoepithelial cells along the fibrovascular cores fits papillary DCIS or encapsulated papillary carcinoma better than a papilloma (Rakha 2024; Kulka 2022).');
  }
  if (lesion === PAP.PDCIS && v.papMecCores === 'Present') {
    warn('papMecCores', 'Myoepithelial cells along the fibrovascular cores favour a papilloma involved by DCIS: the cores of papillary DCIS are devoid of them (Rakha 2024).');
  }
  if (lesion === PAP.PDCIS && v.papMecEdge === 'Absent') {
    warn('papMecEdge', 'Papillary DCIS keeps a myoepithelial layer around the duct (Rakha 2024; Kulka 2022); with none there, consider encapsulated or solid papillary carcinoma.');
  }
  if ([PAP.IP, PAP.SUG].includes(lesion) && v.papCk56 === 'Negative') {
    warn('papCk56', 'Loss of CK5/6 in a papilloma without atypia: look again for atypical ductal hyperplasia or DCIS within it.');
  }
  if (lesion === PAP.EPC && v.papGrade === 'High') {
    warn('papGrade', 'High-grade encapsulated papillary carcinoma is rare, and a note of the unusual features is advised (WHO 6th ed.). With peripheral myoepithelial cells it stays B5a; without them, Rakha 2024 reports it as B5c, since invasion cannot be excluded.');
  }
  if (isEpcSpc(lesion) && (v.papEcad === 'Lost' || v.papP120 === 'Cytoplasmic')) {
    warn(v.papEcad === 'Lost' ? 'papEcad' : 'papP120', 'Loss of E-cadherin or cytoplasmic p120 points to lobular differentiation: consider invasive lobular carcinoma with solid papillary pattern (WHO 6th ed.; Kuba and Brogi 2023).');
  }
  if (lesion === PAP.ILC_SP) {
    if (v.papEcad === 'Retained' && v.papP120 !== 'Cytoplasmic') {
      warn('papEcad', 'Membranous E-cadherin is retained: consider solid or encapsulated papillary carcinoma. A lobular carcinoma that keeps E-cadherin shows cytoplasmic p120 or loses membranous β-catenin (Kuba and Brogi 2023).');
    } else if (v.papP120 === 'Membranous') {
      warn('papP120', 'Membranous p120 does not support lobular differentiation, which moves p120 to the cytoplasm (Kuba and Brogi 2023): consider solid or encapsulated papillary carcinoma.');
    }
    if (v.papMecCores === 'Present' || ['Present', 'Focal'].includes(v.papMecEdge)) {
      warn(v.papMecCores === 'Present' ? 'papMecCores' : 'papMecEdge', 'Myoepithelial cells are recorded, but this pattern has none in its nodules (Kuba and Brogi 2023): consider lobular neoplasia, including within a papillary lesion.');
    }
  }
  if (v.bOverride && v.bOverride !== 'Auto' && v.bOverride !== papillaryCode(v)) {
    warn('bOverride', `The B category chosen (${v.bOverride}) differs from the one this lesion gives (${papillaryCode(v)}).`);
  }
  if (inv === 'Not assessable' && ['Present', 'Focal'].includes(v.papMecEdge)) {
    warn('papMecEdge', 'Myoepithelial cells are recorded at the edge, so the edge and its stroma are in the cores; B5c is only for fragments with no surrounding stroma (RCPath G150).');
  }
  if (lesion === PAP.IP && v.papWithinCore) {
    info('papWithinCore', 'B2 is for a small papilloma without atypia seen whole within the width of the core; otherwise B3 (RCPath G150).');
  }
  if (lesion === PAP.ADH || lesion === PAP.DCIS_IN) {
    info('papLesion', 'ADH and DCIS within a papilloma are separated by extent: DCIS when the atypical proliferation is larger than 3 mm (RCPath G150), or at any size when of intermediate or high nuclear grade (Kulka 2022).');
  }
  if (inv === 'Not assessable') {
    info('papInvasion', 'B5c is for fragments of carcinoma with no surrounding stroma, and malignant papillary lesions are not routinely B5c (RCPath G150).');
  }
  if (lesion === PAP.IPC) {
    info('papLesion', 'Pure invasive papillary carcinoma is exceptionally rare: its papillae infiltrate the stroma, without the circumscription, capsule, neuroendocrine differentiation or mucin of encapsulated and solid papillary carcinoma, which stay in situ without stromal invasion (Rakha 2026; WHO 6th ed.).');
  }
  if (lesion === PAP.ILC_SP) {
    info('papLesion', 'A variation of the solid pattern of invasive lobular carcinoma, not a separate tumour type (WHO 6th ed.). Confirm lobular differentiation with E-cadherin and p120 or β-catenin; on a core it is easily taken for lobular carcinoma in situ, or for solid or encapsulated papillary carcinoma (Kuba and Brogi 2023).');
    if (v.papNe === 'Positive') {
      info('papNe', 'Neuroendocrine markers do not exclude this pattern: they were diffusely positive in one reported case (Kuba and Brogi 2023). E-cadherin and p120 separate it from solid papillary carcinoma.');
    }
  }
  if (papInvasive(v) && v.biomarkers === 'Performed') {
    info('biomarkers', 'Grade, size and receptors are assessed in the invasive component (Rakha 2024).');
  }
  return out;
}

function lnNarrative(part) {
  const v = part.values;
  const r = v.lnResult || 'Metastatic carcinoma';
  if (r === 'Negative for malignancy') return `Sections show ${coresPhrase(part)} of lymphoid tissue with preserved nodal architecture and reactive follicles. There is no evidence of metastatic malignancy.`;
  if (r === 'Suspicious for metastatic carcinoma') return `Sections show ${coresPhrase(part)} of lymphoid tissue containing rare clusters of atypical epithelioid cells. The features are suspicious for but not diagnostic of metastatic carcinoma. Further sampling is recommended.`;
  return `Sections show ${coresPhrase(part)} of lymphoid tissue infiltrated by metastatic carcinoma forming nests and cords of pleomorphic tumour cells. The features are in keeping with metastatic carcinoma of breast origin.`;
}

function b1Narrative(part) {
  const v = part.values;
  const t = v.b1Tissue || 'Normal breast tissue';
  if (t === 'Fibroadipose tissue only') return `Sections show ${coresPhrase(part)} of fibroadipose tissue. No glandular breast tissue is seen. There is no evidence of malignancy. The imaging target may not be represented; radiological correlation is recommended.`;
  if (t === 'Inadequate / crushed') return `Sections show ${coresPhrase(part)} of crushed and fragmented tissue that is inadequate for assessment. Repeat sampling is recommended.`;
  return `Sections show ${coresPhrase(part)} of fibroadipose breast tissue containing normal ducts and lobules. ${NO_MALIG} The imaging target may not be represented; radiological correlation is recommended.`;
}

export function microscopy(part) {
  const v = part.values;
  const cat = v.category || 'B2';
  const narrative = {
    B1: b1Narrative, B2: benignNarrative, B3: b3Narrative, B4: b4Narrative, B5a: insituNarrative, B5b: invasiveNarrative, B5c: b5cNarrative,
    Papillary: papillaryNarrative, LN: lnNarrative
  }[cat] || benignNarrative;
  const sentences = [narrative(part)];
  if (cat !== 'LN') {
    const calc = calcSentence(v);
    if (calc) sentences.push(calc);
  }
  const ihc = clean(v.ihcText);
  if (ihc) sentences.push(ihc + '.');
  const note = clean(v.additionalNotes);
  if (note) sentences.push(note + '.');
  let text = `(${part.label}) ${sentences.join(' ')}`;
  if (v.biomarkers === 'Performed' && hasBiomarkerData(v)) {
    text += ' Biomarkers results are as follows:\n' + biomarkerReport(v).replace(/\n+$/, '');
  }
  return text;
}

export function diagnosis(part) {
  const v = part.values;
  const side = low(v.laterality);
  const site = clean(v.specimenName);
  const code = bCode(part);
  const suffix = code ? ` (${code})` : '';
  if (isLN(part)) {
    const dx = { 'Negative for malignancy': 'NO EVIDENCE OF MALIGNANCY', 'Metastatic carcinoma': 'METASTATIC CARCINOMA', 'Suspicious for metastatic carcinoma': 'SUSPICIOUS FOR METASTATIC CARCINOMA' }[v.lnResult] || 'METASTATIC CARCINOMA';
    return `(${part.label}) ${[side, site || 'axillary lymph node'].filter(Boolean).join(' ').toUpperCase()}, core biopsy - ${dx}`;
  }
  const where = [side, site].filter(Boolean).join(' '); // "left 11 o'clock"
  const head = `(${part.label}) BREAST, ${where ? `${where}, ` : ''}core biopsy - `;
  const cat = v.category || 'B2';
  if (cat === 'B1') {
    const t = v.b1Tissue || 'Normal breast tissue';
    const dx = t === 'Inadequate / crushed' ? 'INADEQUATE FOR ASSESSMENT' : t === 'Fibroadipose tissue only' ? 'FIBROADIPOSE TISSUE ONLY, NO EVIDENCE OF MALIGNANCY' : 'NORMAL BREAST TISSUE, NO EVIDENCE OF MALIGNANCY';
    return head + dx + suffix;
  }
  if (cat === 'B2') {
    const lesion = v.b2Lesion || 'Fibroadenoma';
    const dx = lesion === 'Other' ? (clean(v.b2Other) || 'BENIGN BREAST TISSUE').toUpperCase() : B2_DX[lesion];
    return head + dx + suffix;
  }
  if (cat === 'B3') {
    const lesion = v.b3Lesion || 'Atypical ductal hyperplasia';
    let dx = B3_DX[lesion];
    if (B3_ATYPIA_LESIONS.includes(lesion) && v.b3Atypia === 'Present') dx += ' WITH ATYPIA';
    return head + dx + suffix;
  }
  if (cat === 'B4') return head + `ATYPICAL EPITHELIAL PROLIFERATION, SUSPICIOUS FOR ${(v.b4For || 'malignancy').toUpperCase()}` + suffix;
  if (cat === 'B5a') {
    if (v.insituType === 'Pleomorphic lobular carcinoma in situ') return head + 'PLEOMORPHIC LOBULAR CARCINOMA IN SITU' + suffix;
    return head + `DUCTAL CARCINOMA IN SITU, ${low(v.dcisGrade || 'high')} nuclear grade` + suffix;
  }
  if (cat === 'B5b') {
    const type = v.invType || 'No special type';
    const dx = type === 'Other' ? `INVASIVE CARCINOMA, ${(clean(v.invOther) || 'TYPE NOT SPECIFIED').toUpperCase()}` : INV_DX[type];
    const g = nottingham(v.tubules, v.nuclear, v.mitoses);
    return head + dx + (g ? `, provisional grade ${g.grade}` : '') + suffix;
  }
  if (cat === 'B5c') return head + 'CARCINOMA, IN SITU VERSUS INVASIVE NOT ASSESSABLE' + suffix;
  if (cat === 'Papillary') return head + papillaryDx(v) + suffix;
  return head + 'NO EVIDENCE OF MALIGNANCY' + suffix;
}

/** Checks panel: the side is blank only when a pasted request named none; a papillary lesion adds its own. */
export function validate(part) {
  const out = ['Right', 'Left'].includes(part.values.laterality) ? []
    : [{ level: 'warn', message: 'Choose Right or Left: the specimen request named no side, so none is printed.' }];
  if (part.values.category === 'Papillary') out.push(...papillaryChecks(part.values));
  return out;
}

export default { specimenName, microscopy, diagnosis, validate };
