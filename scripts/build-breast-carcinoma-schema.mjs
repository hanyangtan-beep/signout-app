// Writes schemas/breast_carcinoma.json (invasive carcinoma of the breast, resection). Element wording and
// order follow the QMH Cancer Reporting Template BREAST-Cancers page (CAP Breast Invasive Resection
// 4.11.0.0, AJCC 8th edition, WHO 5th edition) - docs/specs/breast-pair.md. The biomarker fields come from
// generators/breast_biomarkers.js so the option strings stay byte-identical to the QMH Breast-markers page.
// Run: node scripts/build-breast-carcinoma-schema.mjs
import { writeFile } from 'node:fs/promises';
import { biomarkerFields } from '../generators/breast_biomarkers.js';
import { when, MARGIN_HELP, MARGIN_DEFAULT, specimenFields, nodeFields, metsFields, stageFields } from './lib/breast-fields.mjs';
const G = {
  spec: 'Specimen and tumour', hist: 'Histology and grade', ext: 'Extent and invasion', dcis: 'DCIS and other lesions',
  bio: 'Biomarkers', mar: 'Margins', nodes: 'Lymph nodes and metastasis', stage: 'Stage and other findings'
};

export const HIST_TYPES = [
  'No residual invasive carcinoma',
  'Invasive carcinoma of no special type (ductal)',
  'Invasive carcinoma of no special type (ductal) with specific morphologic pattern',
  'Invasive lobular carcinoma, classic',
  'Invasive lobular carcinoma, variant pattern',
  'Mixed histologic types (specify types and percentages)',
  'Tubular carcinoma, pure or greater than 90%',
  'Invasive cribriform carcinoma, pure or greater than 90%',
  'Mucinous carcinoma, pure or greater than 90%',
  'Invasive micropapillary carcinoma, pure or greater than 90%',
  'Invasive apocrine carcinoma',
  'Metaplastic carcinoma, spindle cell',
  'Metaplastic carcinoma, with heterologous differentiation / matrix production',
  'Metaplastic carcinoma, squamous cell',
  'Metaplastic carcinoma, mixed (specify types and percentages)',
  'Metaplastic carcinoma, favorable type, low-grade adenosquamous',
  'Metaplastic carcinoma, favorable type, low-grade fibromatosis-like',
  'Metaplastic carcinoma, other type (specify)',
  'Invasive solid papillary carcinoma',
  'Adenoid cystic carcinoma, classic',
  'Secretory carcinoma',
  'Adenoid cystic carcinoma',
  'Invasive carcinoma, type cannot be determined',
  'Other (specify)'
];
const SPECIFY_TYPES = HIST_TYPES.filter((t) => /\(specify/.test(t));

const SCORE = (defs) => ({
  options: ['Score 1', 'Score 2', 'Score 3', 'Only microinvasion present (not graded)', 'Score cannot be determined'],
  optionLabels: { 'Score 1': `Score 1 ${defs[0]}`, 'Score 2': `Score 2 ${defs[1]}`, 'Score 3': `Score 3 ${defs[2]}` }
});


const fields = [
  { id: 'specimenName', label: 'Specimen as received (blank = automatic, e.g. Left breast, total mastectomy)', type: 'text', placeholder: 'Left breast and axillary contents, modified radical mastectomy', default: '' },

  ...specimenFields(G),

  // ---- Histology and grade (QMH microscopic order) ----
  { id: 'microDescription', label: 'Tumour histology (paragraph; blank = automatic from the type and grade)', type: 'textarea', group: G.hist, default: '',
    placeholder: 'Sections show an invasive carcinoma of no special type arranged in cords and nests within a desmoplastic stroma …' },
  { id: 'ihc', label: 'Immunohistochemistry (typed; appended to the histology paragraph)', type: 'text', group: G.hist, placeholder: 'E-cadherin retained; myoepithelial markers (p63, SMMHC) absent around the invasive nests', default: '' },
  { id: 'histType', label: 'Histologic type (2026, WHO 5e)', type: 'select', group: G.hist, options: HIST_TYPES, default: 'Invasive carcinoma of no special type (ductal)' },
  { id: 'histTypeDetail', label: 'Histologic type (specify / types and percentages)', type: 'text', group: G.hist, default: '', ...when('histType', [...SPECIFY_TYPES, 'Invasive carcinoma of no special type (ductal) with specific morphologic pattern', 'Invasive lobular carcinoma, variant pattern']) },
  { id: 'focality', label: 'Tumour focality', type: 'select', group: G.hist,
    options: ['Single focus of invasive carcinoma', 'Multiple foci of invasive carcinoma', 'Cannot be determined'],
    optionLabels: { 'Multiple foci of invasive carcinoma': 'Multiple foci of invasive carcinoma, specify no. and sizes' }, default: 'Single focus of invasive carcinoma' },
  { id: 'focalityDetail', label: 'Multiple foci: number and sizes', type: 'text', group: G.hist, placeholder: '2 foci, 23 mm and 8 mm, 15 mm apart', default: '', ...when('focality', 'Multiple foci of invasive carcinoma') },
  { id: 'tubule', label: 'Tubule formation', type: 'select', group: G.hist, default: 'Score 3',
    ...SCORE(['(greater than 75% of tumor area forming glandular / tubular structures)', '(10% to 75% of tumor area forming glandular/tubular structures)', '(less than 10% of tumor area forming glandular / tubular structures)']) },
  { id: 'nuclear', label: 'Nuclear pleomorphism', type: 'select', group: G.hist, default: 'Score 2',
    ...SCORE(['(similar / less than 1.5 times the size of benign epithelial cell nuclei, minimal pleomorphism)', '(larger / 1.5-2 times the size of benign epithelial cell nuclei, mild to moderate pleomorphism)', '(larger / greater than 2 times the size of benign epithelial cell nuclei, marked variation, often prominent nucleoli)']) },
  { id: 'mitotic', label: 'Mitotic rate (22 mm eyepiece, 40x)', type: 'select', group: G.hist, default: 'Score 1',
    ...SCORE(['(< or = 8 mitoses per 10 hpf)', '(9-17 mitoses per 10 hpf)', '(> or = 18 mitoses per 10 hpf)']) },
  { id: 'mitoticCount', label: 'Mitoses per 10 hpf (optional)', type: 'number', group: G.hist, placeholder: '6', default: '' },
  { id: 'grade', label: 'Histologic grade (Nottingham)', type: 'select', group: G.hist,
    options: ['Derive from the scores', 'Grade 1 (scores of 3, 4, or 5)', 'Grade 2 (scores of 6 or 7)', 'Grade 3 (scores of 8 or 9)', 'Only microinvasion present (not graded)', 'Score cannot be determined'],
    default: 'Derive from the scores', help: 'Derive sums the three scores; a typed grade that disagrees with the scores raises a Check.' },

  // ---- Extent and invasion ----
  { id: 'nipple', label: 'Nipple status', type: 'select', group: G.ext,
    options: ['Not present in specimen', 'Present and not involved', "Paget's disease present", 'Involved by invasive carcinoma', 'DCIS in major lactiferous ducts present', 'Other (specify)', 'Cannot be determined (explain)'],
    default: 'Present and not involved' },
  { id: 'nippleDetail', label: 'Nipple (specify / explain)', type: 'text', group: G.ext, default: '', ...when('nipple', ['Other (specify)', 'Cannot be determined (explain)']) },
  { id: 'skin', label: 'Skin status', type: 'select', group: G.ext,
    options: ['Not present in specimen', 'Present and not involved', 'Carcinoma directly invades into the dermis or epidermis without macroscopic skin ulceration (this does not change the T classification)', 'Carcinoma directly invades into the dermis or epidermis with macroscopic skin ulceration (classified as T4b)', 'Other (specify)', 'Cannot be determined (explain)'],
    default: 'Present and not involved' },
  { id: 'skinDetail', label: 'Skin (specify / explain)', type: 'text', group: G.ext, default: '', ...when('skin', ['Other (specify)', 'Cannot be determined (explain)']) },
  { id: 'satellite', label: 'Skin satellite foci', type: 'select', group: G.ext, options: ['Not identified', 'Macroscopic Foci Present (T4b)', 'Cannot be determined (explain)'], default: 'Not identified' },
  { id: 'skinOedema', label: "Skin oedema (including peau d'orange) not meeting inflammatory carcinoma (T4b)", type: 'checkbox', group: G.ext, default: false },
  { id: 'inflammatory', label: 'Inflammatory carcinoma (clinical diagnosis; T4d)', type: 'checkbox', group: G.ext, default: false },
  { id: 'skeletalMuscle', label: 'Skeletal muscle', type: 'select', group: G.ext,
    options: ['Not present in specimen', 'Present and not involved', 'Carcinoma invades skeletal muscle', 'Carcinoma invades into the chest wall deep to pectoralis muscle (classified as T4a)', 'Other (specify)', 'Cannot be determined (explain)'],
    default: 'Not present in specimen' },
  { id: 'skeletalMuscleDetail', label: 'Skeletal muscle (specify / explain)', type: 'text', group: G.ext, default: '', ...when('skeletalMuscle', ['Other (specify)', 'Cannot be determined (explain)']) },
  { id: 'lvi', label: 'Lymphatic and/or vascular invasion', type: 'select', group: G.ext,
    options: ['Not identified', 'Present', 'Present, focal (limited to one to two vessels in one block)', 'Present, extensive (greater than two vessels in one block or present in two or more blocks)', 'Other (specify)', 'Cannot be determined'],
    default: 'Not identified' },
  { id: 'lviDetail', label: 'LVI (specify)', type: 'text', group: G.ext, default: '', ...when('lvi', 'Other (specify)') },
  { id: 'dermalLvi', label: 'Dermal lymphatic and/or vascular invasion', type: 'select', group: G.ext,
    options: ['Not applicable (no skin present)', 'Not identified', 'Present', 'Other (specify)', 'Cannot be determined'], default: 'Not identified' },
  { id: 'pni', label: 'Perineural invasion', type: 'select', group: G.ext, options: ['Not identified', 'Present', 'Cannot be determined'], default: 'Not identified' },
  { id: 'treatmentEffect', label: 'Breast treatment effect', type: 'select', group: G.ext,
    options: ['No known presurgical therapy', 'No definite response to presurgical therapy in the invasive carcinoma', 'Probable or definite response to presurgical therapy in the invasive carcinoma', 'No residual invasive carcinoma is present in the breast after presurgical therapy'],
    default: 'No known presurgical therapy', help: 'Anything other than "No known presurgical therapy" adds the y descriptor.' },
  { id: 'lnTreatmentEffect', label: 'LN treatment effect', type: 'select', group: G.ext,
    options: ['Not applicable', 'No known presurgical therapy', 'No definite response to presurgical therapy in metastatic carcinoma', 'Metastatic carcinoma present with evidence of response to presurgical therapy', 'No lymph node metastases. Fibrous scarring or histiocytic aggregates, possibly related to prior lymph node metastases with pathologic complete response', 'No lymph node metastases and no fibrous scarring or histiocytic aggregates in the nodes'],
    default: 'Not applicable', ...when('treatmentEffect', ['No definite response to presurgical therapy in the invasive carcinoma', 'Probable or definite response to presurgical therapy in the invasive carcinoma', 'No residual invasive carcinoma is present in the breast after presurgical therapy']) },
  { id: 'millerPayne', label: 'Grading of treatment effects (Miller and Payne system)', type: 'select', group: G.ext,
    options: ['', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'],
    optionLabels: { '': 'Not graded', 'Grade 1': 'Grade 1: No change or some alteration to individual malignant cells but no reduction in overall cellularity.', 'Grade 2': 'Grade 2: A minor loss of tumour cells but overall cellularity still high; up to 30% loss.', 'Grade 3': 'Grade 3: Between an estimated 30% and 90% reduction in tumour cells.', 'Grade 4': 'Grade 4: A marked disappearance of tumour cells such that only small clusters or widely dispersed individual cells remain; more than 90% loss of tumour cells.', 'Grade 5': 'Grade 5: No malignant cells identifiable in sections from the site of the tumour; only vascular fibroelastotic stroma remains often containing macrophages. However, ductal carcinoma in situ (DCIS) may be present.' },
    default: '', ...when('treatmentEffect', ['No definite response to presurgical therapy in the invasive carcinoma', 'Probable or definite response to presurgical therapy in the invasive carcinoma', 'No residual invasive carcinoma is present in the breast after presurgical therapy']) },

  // ---- DCIS and other lesions ----
  { id: 'dcis', label: 'Ductal carcinoma in situ', type: 'select', group: G.dcis,
    options: ['Not identified', 'Present', 'Present, Negative for extensive intraductal component (EIC)', 'Present, Positive for extensive intraductal component (EIC)', 'Present, Only DCIS is present after presurgical (neoadjuvant) therapy'],
    default: 'Not identified' },
  { id: 'dcisSize', label: 'Size of DCIS (mm x mm x mm)', type: 'text', group: G.dcis, placeholder: '30 x 20 x 15', default: '', ...when('dcis', ['Present', 'Present, Negative for extensive intraductal component (EIC)', 'Present, Positive for extensive intraductal component (EIC)', 'Present, Only DCIS is present after presurgical (neoadjuvant) therapy']) },
  { id: 'dcisBlocks', label: 'Number of blocks with DCIS', type: 'number', group: G.dcis, default: '', ...when('dcis', ['Present', 'Present, Negative for extensive intraductal component (EIC)', 'Present, Positive for extensive intraductal component (EIC)', 'Present, Only DCIS is present after presurgical (neoadjuvant) therapy']) },
  { id: 'blocksExamined', label: 'Number of blocks examined', type: 'number', group: G.dcis, default: '' },
  { id: 'dcisGrade', label: 'DCIS nuclear grade', type: 'select', group: G.dcis, options: ['', 'Grade I (low)', 'Grade II (intermediate)', 'Grade III (high)'], optionLabels: { '': 'Not stated' }, default: '', ...when('dcis', ['Present', 'Present, Negative for extensive intraductal component (EIC)', 'Present, Positive for extensive intraductal component (EIC)', 'Present, Only DCIS is present after presurgical (neoadjuvant) therapy']) },
  { id: 'dcisNecrosis', label: 'DCIS necrosis', type: 'select', group: G.dcis, options: ['Not identified', 'Present, focal (small foci or single cell necrosis)', 'Present, central (expansive "comedo" necrosis)'], default: 'Not identified', ...when('dcis', ['Present', 'Present, Negative for extensive intraductal component (EIC)', 'Present, Positive for extensive intraductal component (EIC)', 'Present, Only DCIS is present after presurgical (neoadjuvant) therapy']) },
  { id: 'dcisPatterns', label: 'Architectural patterns of DCIS', type: 'multiselect', group: G.dcis,
    options: ['Comedo', 'Cribriform', 'Micropapillary', 'Papillary', 'Solid', 'Solid papillary carcinoma in situ', 'Encapsulated papillary carcinoma in situ', 'Paget disease', 'Other (specify)'], default: [], ...when('dcis', ['Present', 'Present, Negative for extensive intraductal component (EIC)', 'Present, Positive for extensive intraductal component (EIC)', 'Present, Only DCIS is present after presurgical (neoadjuvant) therapy']) },
  { id: 'dcisPatternOther', label: 'DCIS pattern (specify)', type: 'text', group: G.dcis, default: '', ...when('dcisPatterns', 'Other (specify)') },
  { id: 'additionalLesions', label: 'Additional lesions', type: 'multiselect', group: G.dcis,
    options: ['Not identified', 'Lobular carcinoma in situ, classic', 'Lobular carcinoma in situ, pleomorphic', 'Lobular carcinoma in situ (specify)', 'Atypical lobular hyperplasia', 'Flat epithelial atypia', 'Atypical ductal hyperplasia', 'Fibrocystic change', 'Usual ductal hyperplasia', 'Columnar cell change', 'Sclerosing adenosis', 'Fibroadenoma', 'Radial scar / complex sclerosing lesion', 'Intraduct papilloma', 'Biopsy site changes', 'Other (specify)'],
    default: ['Not identified'] },
  { id: 'additionalLesionsDetail', label: 'Additional lesions (specify)', type: 'text', group: G.dcis, default: '' },
  { id: 'microcalcs', label: 'Microcalcifications', type: 'multiselect', group: G.dcis,
    options: ['Not identified', 'Present in DCIS', 'Present in invasive carcinoma', 'Present in non-neoplastic tissue', 'Other (specify)'], default: ['Not identified'] },
  { id: 'microcalcsDetail', label: 'Microcalcifications (specify)', type: 'text', group: G.dcis, default: '', ...when('microcalcs', 'Other (specify)') },

  // ---- Biomarkers (QMH Breast-markers block, reused) ----
  { id: 'biomarkers', label: 'Biomarker studies', type: 'select', group: G.bio,
    options: ['Reported on the prior core biopsy', 'Performed', 'Requested; to be reported separately', 'Not performed'],
    default: 'Reported on the prior core biopsy' },
  { id: 'priorBiomarkerAccession', label: 'Prior core biopsy accession', type: 'text', group: G.bio, placeholder: 'S26-01234', default: '', ...when('biomarkers', 'Reported on the prior core biopsy') },
  { id: 'priorBiomarkerSummary', label: 'Prior biomarker summary', type: 'text', group: G.bio, placeholder: 'ER positive (90%, strong), PR positive (60%, moderate), HER2 negative (score 1+), Ki-67 20%', default: '', ...when('biomarkers', 'Reported on the prior core biopsy') },
  ...biomarkerFields({ field: 'biomarkers', is: 'Performed' }).map((f) => ({ ...f, group: G.bio })),

  // ---- Margins (7 faces, invasive then DCIS) ----
  { id: 'marginsInvasive', label: 'Surgical margins for invasive tumour', type: 'textarea', group: G.mar, default: MARGIN_DEFAULT, help: MARGIN_HELP },
  { id: 'marginsDcis', label: 'Surgical margins for DCIS', type: 'textarea', group: G.mar, default: MARGIN_DEFAULT, help: 'Same format. Margins with DCIS closer than 2 mm raise a Check (management differs for involved, < 2 mm and >= 2 mm margins).',
    ...when('dcis', ['Present', 'Present, Negative for extensive intraductal component (EIC)', 'Present, Positive for extensive intraductal component (EIC)', 'Present, Only DCIS is present after presurgical (neoadjuvant) therapy']) },

  ...nodeFields(G),
  ...metsFields(G),

  ...stageFields(G),
  { id: 'rcbClass', label: 'Residual Cancer Burden class (non-essential)', type: 'select', group: G.stage, options: ['', 'RCB-0 (pCR)', 'RCB-I', 'RCB-II', 'RCB-III'], optionLabels: { '': 'Not calculated' }, default: '',
    ...when('treatmentEffect', ['No definite response to presurgical therapy in the invasive carcinoma', 'Probable or definite response to presurgical therapy in the invasive carcinoma', 'No residual invasive carcinoma is present in the breast after presurgical therapy']) },
  { id: 'rcbDetail', label: 'RCB inputs (tumour bed mm x mm; cellularity %; in situ %; positive nodes; largest metastasis mm)', type: 'text', group: G.stage, placeholder: '35 x 20; 30 %; 10 %; 1; 4', default: '', ...when('rcbClass', ['RCB-0 (pCR)', 'RCB-I', 'RCB-II', 'RCB-III']) },
  { id: 'ancillary', label: 'Ancillary studies (other)', type: 'text', group: G.stage, placeholder: 'PD-L1 (E1L3N) requested', default: '' },
  { id: 'additionalNotes', label: 'Additional notes', type: 'textarea', group: G.stage, default: '' }
];

const defaults = Object.fromEntries(fields.map((f) => [f.id, f.default ?? (f.type === 'checkbox' ? false : f.type === 'multiselect' ? [] : '')]));

const schema = {
  id: 'breast_carcinoma',
  version: '2026.09',
  name: 'Breast carcinoma resection',
  shortName: 'Breast · cancer resection',
  label: 'Breast Ca',
  organ: 'BREAST',
  system: 'Breast',
  kind: 'cancer resection',
  rank: 45,
  aliases: ['breast', 'mastectomy', 'wide local excision', 'WLE', 'lumpectomy', 'invasive carcinoma', 'IDC', 'ILC', 'lobular', 'NST', 'Nottingham', 'DCIS', 'sentinel', 'axillary', 'synoptic', 'CAP', 'AJCC', 'neoadjuvant', 'Miller-Payne', 'RCB'],
  match: {
    site: ['breast', 'mammary', 'nipple', 'axilla', 'axillary'],
    procedure: ['mastectomy', 'wide local excision', 'WLE', 'lumpectomy', 'excision', 'breast conserving', 'axillary dissection', 'axillary clearance', 'skin-sparing', 'nipple-sparing'],
    clinical: ['breast ca', 'breast cancer', 'breast carcinoma', 'invasive ductal', 'invasive lobular', 'IDC', 'ILC', 'NST', 'DCIS', 'neoadjuvant', 'NACT', 'ER positive', 'HER2', 'triple negative', 'sentinel', 'SLN', 'mammogram', 'BIRADS'],
    // A breast excision without a cancer clue defaults to the benign excision template (intake matcher).
    bias: -1
  },
  macroExtract: {
    weight: { concept: 'weight', unit: 'g' },
    specimenDims: { concept: 'specimenDims', unit: 'mm' },
    sizeMm: { concept: 'tumourSizeMax', unit: 'mm' },
    tumourDims: { concept: 'tumourDims', unit: 'mm' }
  },
  specimenNoun: 'resection',
  maxParts: 6,
  defaultParts: 1,
  generator: 'breast_carcinoma',
  style: { british: true },
  source: {
    template: 'QMH Cancer Reporting Template - BREAST-Cancers (Invasive carcinoma of the breast)',
    url: 'https://awiloqmh.github.io/CancerReportingTemplate/BREAST-Cancers.html',
    capProtocol: 'CAP Breast Invasive Resection 4.11.0.0 (Jun 2026), as on the QMH page (last updated 27-Jul-2026)',
    staging: 'AJCC 8th edition anatomic pTNM and stage group, printed only with the printPTNM option, stamped (AJCC 8th edition); prognostic stage groups not printed',
    stagingProtocol: 'breast',
    grading: 'Nottingham (Elston-Ellis) grade from the tubule / nuclear / mitotic scores as on the QMH page',
    biomarkers: 'generators/breast_biomarkers.js (QMH Breast-markers page, verbatim)',
    savedPage: 'docs/reference/BREAST-Cancers.html',
    houseAdditions: ['Specimen and tumour section (procedure, laterality, site, size, macro fields)', 'cutSurface', 'otherParts', 'margin walker text (7 faces)', 'nodeSampling with (sn) rule', 'sentinel node counts from a same-case frozen SLN part or a prior SLN accession', 'prior core biopsy biomarker summary', 'Nottingham score-sum Check']
  },
  partDefaults: [],
  caseFields: [
    { id: 'priorAccession', label: 'Prior core biopsy: accession (e.g. S26-01234)', placeholder: 'S26-01234', help: 'Printed with the biomarker line when the results were reported on the core.' },
    { id: 'priorSlnAccession', label: 'Prior sentinel node specimen: accession', placeholder: 'S26-01200', help: 'When the sentinel nodes were reported earlier: the node counts typed here print with this accession as their origin.' },
    { id: 'priorSlnSummary', label: 'Prior sentinel node specimen: result', placeholder: '0/2; or 1/2, macrometastasis 4 mm' }
  ],
  options: [
    { id: 'includeHeader', label: 'Section headers (SPECIMEN / MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT / DIAGNOSIS)', type: 'checkbox', default: false },
    { id: 'macro', label: 'Generate the macroscopic description and block key', type: 'checkbox', default: true },
    { id: 'printPTNM', label: 'Print the AJCC 8th edition pTNM block', type: 'checkbox', default: false }
  ],
  fields,
  example: {
    caseTitle: '',
    options: { includeHeader: false, macro: true, printPTNM: true },
    priorAccession: 'S26-01234',
    parts: [{ label: 'A', values: { ...defaults,
      laterality: 'Left', tumourSite: ['Upper outer quadrant'], sitePosition: "2 o'clock, 30 mm from the nipple", specimenDims: '190 x 160 x 45', weight: '520', skinEllipse: '170 x 60',
      sizeMm: '23', tumourDims: '23 x 20 x 18', closestGrossMm: '5, posterior',
      blockKeyText: '1-4 tumour with the closest posterior margin\n5 nipple\n6-9 anterior, superior, inferior and lateral margins\n10 medial margin\n11-12 background breast',
      tubule: 'Score 3', nuclear: 'Score 2', mitotic: 'Score 1',
      dcis: 'Present, Negative for extensive intraductal component (EIC)', dcisSize: '15', dcisBlocks: '3', blocksExamined: '12', dcisGrade: 'Grade II (intermediate)', dcisNecrosis: 'Not identified', dcisPatterns: ['Cribriform', 'Solid'],
      microcalcs: ['Present in DCIS'],
      priorBiomarkerAccession: 'S26-01234', priorBiomarkerSummary: 'ER positive (90%, strong), PR positive (60%, moderate), HER2 negative (score 1+), Ki-67 15%',
      marginsInvasive: 'Anterior: 12\nPosterior: 5\nSuperior: >10\nInferior: >10\nMedial: >10\nLateral: >10',
      marginsDcis: 'Anterior: 8\nPosterior: 4\nSuperior: >10\nInferior: >10\nMedial: >10\nLateral: >10',
      nodeSampling: 'Sentinel node biopsy only', nodesExamined: '2', nodesSentinel: '2'
    } }]
  }
};

await writeFile(new URL('../schemas/breast_carcinoma.json', import.meta.url), `${JSON.stringify(schema, null, 2)}\n`);
console.log(`schemas/breast_carcinoma.json: ${fields.length} fields`);
