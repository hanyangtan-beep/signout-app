// Writes schemas/phyllodes.json (phyllodes tumour of the breast, resection). Element wording and order
// follow the QMH Cancer Reporting Template BREAST-Phyllodes page (CAP Phyllodes Tumor 4.1.0.0, AJCC 8th
// edition) - docs/specs/breast-pair.md. Shared blocks: scripts/lib/breast-fields.mjs.
// Run: node scripts/build-phyllodes-schema.mjs
import { writeFile } from 'node:fs/promises';
import { when, MARGIN_HELP, MARGIN_DEFAULT, specimenFields, metsFields, stageFields } from './lib/breast-fields.mjs';

const G = { spec: 'Specimen and tumour', hist: 'Histology and grade', mar: 'Margins', nodes: 'Lymph nodes and metastasis', stage: 'Stage and other findings' };

export const HIST_TYPES = ['Phyllodes tumor, benign', 'Phyllodes tumor, borderline', 'Phyllodes tumor, malignant', 'No tumor'];

const spec = specimenFields(G, {
  tumourWord: 'tumour', sizeModes: ['Greatest dimension', 'No residual tumour', 'Cannot be determined'],
  sizeHelp: 'Greatest dimension in mm. pT uses the 5 / 10 / 15 cm cut-offs (pT1 to pT4).'
});
for (const f of spec) {
  if (f.id === 'cutSurface') { f.options = ['Firm', 'Fleshy', 'Grey-white', 'Tan', 'Well-circumscribed', 'Lobulated', 'Leaf-like clefts', 'Cystic', 'Haemorrhagic', 'Necrotic', 'Ill-defined / stellate']; f.default = ['Firm', 'Well-circumscribed', 'Lobulated']; }
  if (f.id === 'closestGrossMm') f.placeholder = '3, anterior';
  if (f.id === 'blockKeyText') f.placeholder = '1-6 tumour with the closest anterior margin\n7-10 posterior, superior, inferior and lateral margins\n11 medial margin\n12 background breast';
  if (f.id === 'sizeMode') f.optionLabels = { ...f.optionLabels, 'No residual tumour': 'No residual tumour (re-excision)' };
}

const fields = [
  { id: 'specimenName', label: 'Specimen as received (blank = automatic, e.g. Left breast, wide local excision)', type: 'text', placeholder: 'Left breast, wide local excision', default: '' },
  ...spec,

  // ---- Histology and grade (QMH microscopic order) ----
  { id: 'microDescription', label: 'Tumour histology (paragraph; blank = automatic from the elements)', type: 'textarea', group: G.hist, default: '',
    placeholder: 'Sections show a fibroepithelial tumour with leaf-like fronds and a cellular stroma …' },
  { id: 'ihc', label: 'Immunohistochemistry (typed; appended to the histology paragraph)', type: 'text', group: G.hist, placeholder: 'CD34 is retained in the stroma; Ki-67 index is 5%', default: '' },
  { id: 'histType', label: 'Histologic type', type: 'select', group: G.hist, options: HIST_TYPES, default: 'Phyllodes tumor, benign' },
  { id: 'stromalCellularity', label: 'Stromal cellularity', type: 'select', group: G.hist,
    options: ['Mild (stromal nuclei are non-overlapping)', 'Moderate (some overlapping stromal nuclei)', 'Marked (many overlapping stromal nuclei)'], default: 'Mild (stromal nuclei are non-overlapping)' },
  { id: 'stromalAtypia', label: 'Stromal atypia', type: 'select', group: G.hist,
    options: ['None', 'Mild (minimal variation in nuclear size, even chromatin, and smooth nuclear contours)', 'Moderate (more variation in nuclear size and irregular nuclear membranes)', 'Marked (marked nuclear pleomorphism, hyperchromasia, and irregular nuclear contours)'],
    default: 'Mild (minimal variation in nuclear size, even chromatin, and smooth nuclear contours)' },
  { id: 'stromalOvergrowth', label: 'Stromal overgrowth (a 40x field without epithelium)', type: 'select', group: G.hist, options: ['Absent', 'Present', 'Cannot be determined'], default: 'Absent' },
  { id: 'mitoticMode', label: 'Mitotic rate', type: 'select', group: G.hist, options: ['None identified', 'Mitoses per 10 high power fields', 'Mitoses per square millimeter (mm2)', 'Cannot be determined'], default: 'Mitoses per 10 high power fields' },
  { id: 'mitoticCount', label: 'Mitotic count (number)', type: 'number', group: G.hist, default: '', min: 0, ...when('mitoticMode', ['Mitoses per 10 high power fields', 'Mitoses per square millimeter (mm2)']),
    help: 'WHO: benign < 5 per 10 hpf, borderline 5-9, malignant 10 or more (about 2.5 / 5 per mm2). The Check compares the count with the selected type.' },
  { id: 'tumourBorder', label: 'Histologic tumour border', type: 'select', group: G.hist,
    options: ['Circumscribed (well-defined; pushing)', 'Infiltrative (permeative), focal', 'Infiltrative (permeative), extensive', 'Cannot be determined'], default: 'Circumscribed (well-defined; pushing)' },
  { id: 'heterologous', label: 'Malignant heterologous elements', type: 'multiselect', group: G.hist,
    options: ['Not identified', 'Liposarcoma (excluding well-differentiated liposarcoma)', 'Osteosarcoma', 'Chondrosarcoma', 'Other (specify)'], default: ['Not identified'] },
  { id: 'heterologousDetail', label: 'Heterologous element (specify)', type: 'text', group: G.hist, default: '', ...when('heterologous', 'Other (specify)') },
  { id: 'lvi', label: 'Lymphovascular invasion (non-essential)', type: 'select', group: G.hist, options: ['Not identified', 'Present', 'Cannot be determined'], default: 'Not identified' },
  { id: 'pni', label: 'Perineural invasion (non-essential)', type: 'select', group: G.hist, options: ['Not identified', 'Present', 'Cannot be determined'], default: 'Not identified' },
  { id: 'epithelium', label: 'Epithelial component (house)', type: 'multiselect', group: G.hist,
    options: ['Bland bilayered epithelium', 'Usual ductal hyperplasia', 'Apocrine metaplasia', 'Squamous metaplasia', 'Atypical ductal hyperplasia', 'Atypical lobular hyperplasia', 'Ductal carcinoma in situ (specify)', 'Lobular carcinoma in situ (specify)', 'Other (specify)'], default: ['Bland bilayered epithelium'] },
  { id: 'epitheliumDetail', label: 'Epithelial component (specify)', type: 'text', group: G.hist, default: '' },
  { id: 'additionalFindings', label: 'Additional pathologic findings', type: 'multiselect', group: G.hist,
    options: ['Not identified', 'Fibroepithelial proliferation (coexisting fibroadenoma or fibroadenomatoid change in the tissue surrounding the phyllodes tumor)', 'Atypical ductal hyperplasia', 'Atypical lobular hyperplasia', 'Other (specify)'], default: ['Not identified'] },
  { id: 'additionalFindingsDetail', label: 'Additional findings (specify)', type: 'text', group: G.hist, default: '', ...when('additionalFindings', 'Other (specify)') },

  // ---- Margins ----
  { id: 'margins', label: 'Surgical margins', type: 'textarea', group: G.mar, default: MARGIN_DEFAULT, help: `${MARGIN_HELP} Margins under 10 mm for borderline or malignant tumours raise a Check (re-excision is usually considered).` },

  // ---- Regional lymph nodes (simple pair on the QMH page) and distant metastasis ----
  { id: 'nodeSampling', label: 'Regional lymph nodes', type: 'select', group: G.nodes, options: ['No nodes submitted', 'Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection'], default: 'No nodes submitted',
    help: 'Nodal metastasis is rare in phyllodes tumours; nodes are usually not sampled.' },
  { id: 'nodesExamined', label: 'Number of regional lymph nodes examined', type: 'number', group: G.nodes, default: '', min: 0, ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'nodesPositive', label: 'Number of involved lymph nodes', type: 'number', group: G.nodes, default: '0', min: 0, ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'depositMm', label: 'Size of largest metastatic deposit (mm)', type: 'number', group: G.nodes, default: '', ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'depositSite', label: 'Largest deposit: site', type: 'text', group: G.nodes, default: '', ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'largestNodeMm', label: 'Size of largest lymph node involved (mm)', type: 'number', group: G.nodes, default: '', ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'ene', label: 'Extranodal extension', type: 'select', group: G.nodes, options: ['Not identified', 'Present', 'Cannot be determined'], default: 'Not identified', ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'eneExtent', label: 'ENE extent (number 2 mm or less, number greater than 2 mm)', type: 'text', group: G.nodes, default: '', ...when('ene', 'Present') },
  ...metsFields(G).map((f) => (f.id === 'distantSites' ? { ...f, options: ['Lung', 'Bone', 'Liver', 'Brain', 'Non-regional lymph node(s)', 'Other (specify)'] } : f)),

  // ---- Stage and other findings ----
  ...stageFields(G).map((f) => (f.id === 'tnmOverride' ? { ...f, placeholder: 'pT2 pNX' } : f)),
  { id: 'ancillary', label: 'Ancillary studies', type: 'text', group: G.stage, placeholder: 'MED12 / TERT not tested', default: '' },
  { id: 'additionalNotes', label: 'Additional notes', type: 'textarea', group: G.stage, default: '' }
];

const defaults = Object.fromEntries(fields.map((f) => [f.id, f.default ?? (f.type === 'checkbox' ? false : f.type === 'multiselect' ? [] : '')]));

const schema = {
  id: 'phyllodes',
  version: '2026.09',
  name: 'Breast phyllodes tumour resection',
  shortName: 'Breast · phyllodes tumour',
  label: 'Phyllodes',
  organ: 'BREAST',
  system: 'Breast',
  kind: 'cancer resection',
  rank: 47,
  aliases: ['breast', 'phyllodes', 'phylloides', 'cystosarcoma', 'fibroepithelial', 'stromal', 'wide local excision', 'mastectomy', 'synoptic', 'CAP'],
  match: {
    site: ['breast', 'mammary'],
    procedure: ['mastectomy', 'wide local excision', 'WLE', 'lumpectomy', 'excision', 'breast conserving'],
    // A query ("?phyllodes", "fibroepithelial lesion") stays with the benign Breast excision template; only a named or graded
    // phyllodes tumour scores here, and even then the intake strip offers both (choose tier).
    clinical: ['phyllodes tumour', 'phyllodes tumor', 'borderline phyllodes', 'malignant phyllodes', 'benign phyllodes', 'known phyllodes', 'recurrent phyllodes', 'cystosarcoma'],
    // A breast excision without a phyllodes clue defaults to the benign excision template (intake matcher).
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
  generator: 'phyllodes',
  style: { british: true },
  source: {
    template: 'QMH Cancer Reporting Template - BREAST-Phyllodes (Phyllodes tumor of the breast)',
    url: 'https://awiloqmh.github.io/CancerReportingTemplate/BREAST-Phyllodes.html',
    capProtocol: 'CAP Phyllodes Tumor of the Breast 4.1.0.0, as on the QMH page (last updated 27-Jul-2026)',
    staging: 'AJCC 8th edition pT (5 / 10 / 15 cm), pN0 / pN1, pM1 as listed on the page; no stage group is defined; printed only with the printPTNM option',
    stagingProtocol: 'phyllodes',
    grading: 'WHO 5th edition benign / borderline / malignant from stromal cellularity, atypia, overgrowth, mitoses, border and heterologous elements (Checks compare the elements with the selected type)',
    savedPage: 'docs/reference/BREAST-Phyllodes.html',
    houseAdditions: ['Specimen and tumour section (procedure, laterality, site, size, macro fields)', 'epithelial component', 'margin walker text (7 faces)', 'Tumour histology paragraph after the histologic type']
  },
  partDefaults: [],
  caseFields: [
    { id: 'priorAccession', label: 'Prior core biopsy: accession (e.g. S26-01234)', placeholder: 'S26-01234', help: 'Mentioned in the Additional notes when typed.' }
  ],
  options: [
    { id: 'includeHeader', label: 'Section headers (SPECIMEN / MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT / DIAGNOSIS)', type: 'checkbox', default: false },
    { id: 'macro', label: 'Generate the macroscopic description and block key', type: 'checkbox', default: true },
    { id: 'printPTNM', label: 'Print the AJCC 8th edition pTNM block', type: 'checkbox', default: false }
  ],
  fields,
  example: {
    caseTitle: '',
    options: { includeHeader: false, macro: true, printPTNM: false },
    parts: [{ label: 'A', values: { ...defaults,
      procedure: 'Excision (less than total mastectomy)', laterality: 'Left', tumourSite: ['Upper outer quadrant'], sitePosition: "2 o'clock", specimenDims: '70 x 55 x 40', weight: '95',
      sizeMm: '45', tumourDims: '45 x 40 x 35', closestGrossMm: '3, anterior',
      blockKeyText: '1-6 tumour with the closest anterior margin\n7-10 posterior, superior, inferior and lateral margins\n11 medial margin\n12 background breast',
      histType: 'Phyllodes tumor, borderline', stromalCellularity: 'Moderate (some overlapping stromal nuclei)', stromalAtypia: 'Mild (minimal variation in nuclear size, even chromatin, and smooth nuclear contours)',
      stromalOvergrowth: 'Absent', mitoticMode: 'Mitoses per 10 high power fields', mitoticCount: '6', tumourBorder: 'Infiltrative (permeative), focal',
      margins: 'Anterior: 3\nPosterior: 8\nSuperior: >10\nInferior: >10\nMedial: >10\nLateral: >10'
    } }]
  }
};

await writeFile(new URL('../schemas/phyllodes.json', import.meta.url), `${JSON.stringify(schema, null, 2)}\n`);
console.log(`schemas/phyllodes.json: ${fields.length} fields`);
