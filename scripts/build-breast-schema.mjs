// Writes schemas/breast_biopsy.json. The biomarker fields come from generators/breast_biomarkers.js so
// the option strings stay byte-identical to the source template. Run: node scripts/build-breast-schema.mjs
import { writeFile } from 'node:fs/promises';
import { biomarkerFields } from '../generators/breast_biomarkers.js';

const when = (field, is) => ({ showIf: { field, is } });
const CAT = {
  B1: 'Normal / inadequate', B2: 'Benign', B3: 'Uncertain malignant potential', B4: 'Suspicious',
  B5a: 'In situ carcinoma', B5b: 'Invasive carcinoma', B5c: 'Carcinoma, in situ vs invasive not assessable', LN: 'Axillary lymph node'
};

const fields = [
  { id: 'laterality', label: 'Side', type: 'select', options: ['Right', 'Left'], default: 'Right' },
  { id: 'specimenName', label: 'Site (clock position, distance from nipple, lesion)', type: 'text', placeholder: "e.g. 2 o'clock, 3 cm FN", default: '' },
  { id: 'coresTotal', label: 'Number of cores', type: 'number', default: '3', min: 1 },
  { id: 'target', label: 'Imaging target', type: 'select', options: ['Mass', 'Calcification', 'Distortion', 'MRI enhancement', 'Not stated'], default: 'Mass',
    help: 'Drives the calcification correlation sentence.' },
  { id: 'category', label: 'Category', type: 'select',
    options: ['B1', 'B2', 'B3', 'B4', 'B5a', 'B5b', 'B5c', 'LN'],
    optionLabels: Object.fromEntries(Object.entries(CAT).map(([k, v]) => [k, k === 'LN' ? v : `${k} ${v}`])), default: 'B2' },

  // B1
  { id: 'b1Tissue', label: 'Tissue present', type: 'select',
    options: ['Normal breast tissue', 'Fibroadipose tissue only', 'Inadequate / crushed'], default: 'Normal breast tissue', ...when('category', 'B1') },

  // B2
  { id: 'b2Lesion', label: 'Benign lesion', type: 'select',
    options: ['Fibroadenoma', 'Fibrocystic change', 'Usual ductal hyperplasia', 'Columnar cell change', 'Sclerosing adenosis', 'Fat necrosis', 'Duct ectasia', 'Mastitis', 'PASH', 'Gynaecomastia', 'Lactational change', 'Other'],
    default: 'Fibroadenoma', ...when('category', 'B2') },
  { id: 'b2Other', label: 'Other benign lesion (name)', type: 'text', default: '', placeholder: 'e.g. Lipoma', ...when('b2Lesion', 'Other') },

  // B3
  { id: 'b3Lesion', label: 'B3 lesion', type: 'select',
    options: ['Atypical ductal hyperplasia', 'Flat epithelial atypia', 'Lobular neoplasia', 'Intraduct papilloma', 'Radial scar / complex sclerosing lesion', 'Cellular fibroepithelial lesion', 'Mucocoele-like lesion'],
    default: 'Atypical ductal hyperplasia', ...when('category', 'B3') },
  { id: 'b3Atypia', label: 'Epithelial atypia in the lesion', type: 'select', options: ['Absent', 'Present'], default: 'Absent',
    showIf: { field: 'b3Lesion', is: ['Intraduct papilloma', 'Radial scar / complex sclerosing lesion', 'Mucocoele-like lesion'] } },
  { id: 'b3Advice', label: 'B3 recommendation', type: 'select', options: ['None', 'Multidisciplinary discussion', 'Excision'], default: 'Multidisciplinary discussion', ...when('category', 'B3') },

  // B4
  { id: 'b4For', label: 'Suspicious for', type: 'select', options: ['Malignancy', 'Invasive carcinoma', 'Ductal carcinoma in situ'], default: 'Malignancy', ...when('category', 'B4') },
  { id: 'b4Reason', label: 'Reason not diagnostic', type: 'select',
    options: ['Scanty atypical cells', 'Crush artefact', 'Atypical cells at the edge of the core', 'Equivocal immunohistochemistry'], default: 'Scanty atypical cells', ...when('category', 'B4') },

  // B5a
  { id: 'insituType', label: 'In situ carcinoma type', type: 'select', options: ['Ductal carcinoma in situ', 'Pleomorphic lobular carcinoma in situ'], default: 'Ductal carcinoma in situ', ...when('category', 'B5a') },
  { id: 'dcisGrade', label: 'Nuclear grade', type: 'select', options: ['Low', 'Intermediate', 'High'], default: 'High', ...when('category', 'B5a') },
  { id: 'dcisPattern', label: 'Architecture', type: 'select', options: ['Cribriform', 'Solid', 'Micropapillary', 'Papillary', 'Comedo', 'Mixed'], default: 'Solid', ...when('category', 'B5a') },
  { id: 'dcisNecrosis', label: 'Comedo-type necrosis', type: 'select', options: ['Absent', 'Present'], default: 'Absent', ...when('category', 'B5a') },
  { id: 'dcisP63', label: 'Myoepithelial layer confirmed on p63', type: 'select', options: ['No', 'Yes'], default: 'No', ...when('category', 'B5a') },

  // B5b
  { id: 'invType', label: 'Invasive carcinoma type', type: 'select',
    options: ['No special type', 'Lobular', 'Mucinous', 'Tubular', 'Micropapillary', 'Metaplastic', 'Other'], default: 'No special type', ...when('category', 'B5b') },
  { id: 'invOther', label: 'Other invasive type (name)', type: 'text', default: '', placeholder: 'e.g. Apocrine', ...when('invType', 'Other') },
  { id: 'tubules', label: 'Tubule formation score', type: 'select', options: ['1', '2', '3'], default: '3', ...when('category', 'B5b') },
  { id: 'nuclear', label: 'Nuclear pleomorphism score', type: 'select', options: ['1', '2', '3'], default: '2', ...when('category', 'B5b') },
  { id: 'mitoses', label: 'Mitotic score', type: 'select', options: ['1', '2', '3'], default: '1', ...when('category', 'B5b') },
  { id: 'invExtentMm', label: 'Maximum extent in cores (mm)', type: 'number', default: '', step: 0.5, suffix: 'mm', ...when('category', 'B5b') },
  { id: 'invDcis', label: 'Ductal carcinoma in situ component', type: 'select', options: ['Absent', 'Present'], default: 'Absent', ...when('category', 'B5b') },
  { id: 'lvi', label: 'Lymphovascular invasion', type: 'select', options: ['Not identified', 'Present'], default: 'Not identified', ...when('category', 'B5b') },

  // B5c
  { id: 'b5cReason', label: 'Why in situ vs invasive is not assessable', type: 'select',
    options: ['Crush / cautery artefact', 'Scanty malignant cells', 'Equivocal myoepithelial staining'], default: 'Scanty malignant cells', ...when('category', 'B5c') },

  // Lymph node
  { id: 'lnResult', label: 'Lymph node result', type: 'select', options: ['Negative for malignancy', 'Metastatic carcinoma', 'Suspicious for metastatic carcinoma'], default: 'Metastatic carcinoma', ...when('category', 'LN') },

  // Common
  { id: 'calcification', label: 'Calcification in cores', type: 'select', options: ['Not identified', 'Within the lesion', 'In benign breast tissue'], default: 'Not identified',
    showIf: { field: 'category', not: 'LN' } },
  { id: 'ihcText', label: 'Immunohistochemistry sentence(s)', type: 'textarea', default: '', placeholder: 'e.g. The tumour cells show loss of E-cadherin expression.' },
  { id: 'bOverride', label: 'B category (WHO6 small diagnostic samples)', type: 'select', options: ['Auto', 'B1', 'B2', 'B3', 'B4', 'B5a', 'B5b', 'B5c'], default: 'Auto',
    showIf: { field: 'category', not: 'LN' }, help: 'Auto derives the code from the category above.' },
  { id: 'additionalNotes', label: 'Additional notes', type: 'textarea', default: '', placeholder: 'Appended to the microscopy for this part' },
  { id: 'biomarkers', label: 'Breast biomarkers', type: 'select', options: ['Not performed', 'Performed'], default: 'Not performed',
    help: 'Fields and wording follow the Breast biomarkers template (CancerReportingTemplate) exactly.' },
  ...biomarkerFields({ field: 'biomarkers', is: 'Performed' })
];

const schema = {
  id: 'breast_biopsy',
  version: '2026.09',
  name: 'Breast core biopsy',
  shortName: 'Breast · core biopsy',
  label: 'Breast',
  organ: 'BREAST',
  system: 'Breast',
  kind: 'biopsy',
  rank: 7,
  aliases: ['core', 'B3', 'B5', 'DCIS', 'ER', 'PR', 'HER2', 'calcification', 'axillary node', 'fibroadenoma'],
  specimenNoun: 'core biopsy',
  maxParts: 8,
  defaultParts: 1,
  generator: 'breast',
  // British spelling is written directly into the generator; the automatic britishiser is off so the
  // biomarker block (which must match its source template verbatim) is not respelled.
  style: { british: false },
  caseFields: [],
  options: [
    { id: 'includeHeader', label: 'Section headers (SPECIMEN / MICROSCOPIC EXAMINATION / DIAGNOSIS)', type: 'checkbox', default: false }
  ],
  partDefaults: [],
  fields,
  example: {
    caseTitle: '',
    options: { includeHeader: false },
    parts: [
      { label: 'A', values: { laterality: 'Right', specimenName: "10 o'clock, 4 cm FN", coresTotal: '3', target: 'Mass', category: 'B2', b2Lesion: 'Fibroadenoma', calcification: 'Not identified' } },
      { label: 'B', values: {
        laterality: 'Left', specimenName: "2 o'clock, 3 cm FN", coresTotal: '4', target: 'Mass', category: 'B5b', invType: 'No special type',
        tubules: '3', nuclear: '2', mitoses: '1', invExtentMm: '9', invDcis: 'Present', lvi: 'Not identified', calcification: 'Within the lesion',
        biomarkers: 'Performed', er: 'Positive (>10% positive nuclei)', erIntensity: 'Strong staining (3)', erNuclei: '66-100% (5)',
        pr: 'Positive (>10% positive nuclei)', prIntensity: 'Moderate staining (2)', prNuclei: '11-33% (3)', ki67: '15',
        her2Ihc: 'Negative for over-expression', her2Score: 'Incomplete membrane staining that is faint / barely perceptible and in greater than 10% of tumor cells (Score 1+)',
        coldIschemia: '30', fixationTime: '24', testType: 'Laboratory-developed test (QMH, HK).'
      } },
      { label: 'C', values: { laterality: 'Left', specimenName: 'axillary lymph node', coresTotal: '2', category: 'LN', lnResult: 'Metastatic carcinoma' } }
    ]
  }
};

await writeFile(new URL('../schemas/breast_biopsy.json', import.meta.url), JSON.stringify(schema, null, 2) + '\n');
console.log(`schemas/breast_biopsy.json written (${fields.length} fields)`);
