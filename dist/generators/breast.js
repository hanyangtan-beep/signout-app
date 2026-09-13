// Breast core biopsy generator. Pure functions: (part, ctx) -> string.
// Each part is one biopsy site. The B category (WHO Classification of Tumours, Breast, 6th ed.,
// "Small diagnostic samples": B1 normal / inadequate, B2 benign, B3 uncertain malignant potential,
// B4 suspicious, B5a in situ, B5b invasive, B5c malignant, in situ vs invasive not assessable) is
// derived from the category and printed at the end of the diagnosis line, e.g.
//   "(A) BREAST, right 10 o'clock, 4 cm FN, core biopsy - FIBROADENOMA (B2)"
// The biomarker block is a verbatim port of the Breast biomarkers template (see breast_biomarkers.js).
// British spelling is written directly (schema style.british is off). Wording is protected by
// tests/breast.test.js — change it only deliberately.

import { biomarkerReport, hasBiomarkerData } from './breast_biomarkers.js?v=mtzspr4o';

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

export function specimenName(part) {
  const v = part.values;
  const side = low(v.laterality) || 'right';
  const site = clean(v.specimenName);
  if (isLN(part)) return `${side[0].toUpperCase()}${side.slice(1)} ${site || 'axillary lymph node'}, core biopsy`;
  return `${side[0].toUpperCase()}${side.slice(1)} breast${site ? `, ${site}` : ''}, core biopsy`;
}

/** B code for a part: manual override, else derived from the category. Lymph node cores carry none. */
export function bCode(part) {
  const v = part.values;
  if (isLN(part)) return '';
  if (v.bOverride && v.bOverride !== 'Auto') return v.bOverride;
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
  'Intraduct papilloma': 'INTRADUCT PAPILLOMA', 'Radial scar / complex sclerosing lesion': 'RADIAL SCAR / COMPLEX SCLEROSING LESION',
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
    B1: b1Narrative, B2: benignNarrative, B3: b3Narrative, B4: b4Narrative, B5a: insituNarrative, B5b: invasiveNarrative, B5c: b5cNarrative, LN: lnNarrative
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
  const side = low(v.laterality) || 'right';
  const site = clean(v.specimenName);
  const code = bCode(part);
  const suffix = code ? ` (${code})` : '';
  if (isLN(part)) {
    const dx = { 'Negative for malignancy': 'NO EVIDENCE OF MALIGNANCY', 'Metastatic carcinoma': 'METASTATIC CARCINOMA', 'Suspicious for metastatic carcinoma': 'SUSPICIOUS FOR METASTATIC CARCINOMA' }[v.lnResult] || 'METASTATIC CARCINOMA';
    return `(${part.label}) ${side.toUpperCase()} ${(site || 'axillary lymph node').toUpperCase()}, core biopsy - ${dx}`;
  }
  const head = `(${part.label}) BREAST, ${side}${site ? ` ${site}` : ''}, core biopsy - `;
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
  return head + 'NO EVIDENCE OF MALIGNANCY' + suffix;
}

export default { specimenName, microscopy, diagnosis };
