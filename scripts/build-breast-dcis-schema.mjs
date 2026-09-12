// Writes schemas/breast_dcis.json (ductal carcinoma in situ of the breast, resection). Element wording and
// order follow the QMH Cancer Reporting Template BREAST-DCIS page (CAP Breast DCIS Resection 4.5.0.1,
// AJCC 8th edition, WHO 5th edition) - docs/specs/breast-pair.md. Shared blocks: scripts/lib/breast-fields.mjs.
// Run: node scripts/build-breast-dcis-schema.mjs
import { writeFile } from 'node:fs/promises';
import { biomarkerFields } from '../generators/breast_biomarkers.js';
import { when, MARGIN_HELP, MARGIN_DEFAULT, specimenFields, nodeFields, metsFields, stageFields } from './lib/breast-fields.mjs';

const G = {
  spec: 'Specimen and tumour', hist: 'Histology and grade', bio: 'Biomarkers', mar: 'Margins', nodes: 'Lymph nodes and metastasis', stage: 'Stage and other findings'
};

export const HIST_TYPES = ['Ductal carcinoma in situ (DCIS)', 'Paget disease', 'Encapsulated papillary carcinoma in situ', 'Solid papillary carcinoma in situ'];
export const PATTERNS = ['Comedo', 'Cribriform', 'Micropapillary', 'Papillary', 'Solid', 'Solid papillary carcinoma in situ', 'Encapsulated papillary carcinoma in situ', 'Paget disease (DCIS involving nipple skin)', 'Other (specify)'];

const spec = specimenFields(G, {
  tumourWord: 'DCIS', sizeModes: ['Greatest dimension', 'Cannot be determined'],
  sizeHelp: 'Extent of DCIS: the greatest dimension of the involved area (from the slides and the block map), not the gross lesion. Microinvasion makes the case an invasive carcinoma (use the Breast carcinoma template).'
});
for (const f of spec) {
  if (f.id === 'cutSurface') f.default = ['Ill-defined / stellate', 'Gritty'];
  if (f.id === 'closestGrossMm') f.placeholder = '8, anterior';
  if (f.id === 'blockKeyText') f.placeholder = '1-6 lesion / biopsy site with margins\n7 nipple\n8-13 anterior, posterior, superior, inferior, medial and lateral margins\n14-16 remaining breast';
  if (f.id === 'otherMacro') f.placeholder = 'A biopsy cavity with a marker clip is present 8 mm from the anterior margin';
}

const fields = [
  { id: 'specimenName', label: 'Specimen as received (blank = automatic, e.g. Left breast, wide local excision)', type: 'text', placeholder: 'Left breast, hookwire-guided wide local excision', default: '' },
  ...spec,

  // ---- Histology and grade (QMH microscopic order) ----
  { id: 'microDescription', label: 'Tumour histology (paragraph; blank = automatic from the type and grade)', type: 'textarea', group: G.hist, default: '',
    placeholder: 'Sections show ducts expanded by a cribriform and solid proliferation of monotonous intermediate-grade cells with central necrosis and calcification …' },
  { id: 'ihc', label: 'Immunohistochemistry (typed; appended to the histology paragraph)', type: 'text', group: G.hist, placeholder: 'Myoepithelial markers (p63, SMMHC) are retained around the involved ducts; no invasion is identified', default: '' },
  { id: 'histType', label: 'Histologic type (WHO 6e)', type: 'select', group: G.hist, options: HIST_TYPES, default: 'Ductal carcinoma in situ (DCIS)' },
  { id: 'dcisBlocks', label: 'Number of blocks with DCIS', type: 'number', group: G.hist, default: '', min: 0 },
  { id: 'blocksExamined', label: 'Number of blocks examined', type: 'number', group: G.hist, default: '', min: 0 },
  { id: 'dcisPatterns', label: 'Architectural patterns', type: 'multiselect', group: G.hist, options: PATTERNS, default: ['Cribriform'] },
  { id: 'dcisPatternOther', label: 'Architectural pattern (specify)', type: 'text', group: G.hist, default: '', ...when('dcisPatterns', 'Other (specify)') },
  { id: 'dcisGrade', label: 'Nuclear grade', type: 'select', group: G.hist, options: ['Grade I (low)', 'Grade II (intermediate)', 'Grade III (high)', 'Other (specify)', 'Cannot be determined (explain)'], default: 'Grade II (intermediate)' },
  { id: 'dcisGradeDetail', label: 'Nuclear grade (specify / explain)', type: 'text', group: G.hist, default: '', ...when('dcisGrade', ['Other (specify)', 'Cannot be determined (explain)']) },
  { id: 'dcisNecrosis', label: 'Necrosis', type: 'select', group: G.hist,
    options: ['Not identified', 'Present, focal (small foci or single cell necrosis)', 'Present, central (expansive "comedo" necrosis)', 'Other (specify)', 'Cannot be determined (explain)'], default: 'Not identified' },
  { id: 'dcisNecrosisDetail', label: 'Necrosis (specify / explain)', type: 'text', group: G.hist, default: '', ...when('dcisNecrosis', ['Other (specify)', 'Cannot be determined (explain)']) },
  { id: 'microcalcs', label: 'Microcalcifications (non-essential)', type: 'multiselect', group: G.hist, options: ['Not identified', 'Present in DCIS', 'Present in non-neoplastic tissue', 'Other (specify)'], default: ['Present in DCIS'] },
  { id: 'microcalcsDetail', label: 'Microcalcifications (specify)', type: 'text', group: G.hist, default: '', ...when('microcalcs', 'Other (specify)') },
  { id: 'nipple', label: 'Nipple (house; Paget disease sets pTis (Paget) when no DCIS is in the breast)', type: 'select', group: G.hist,
    options: ['Not present in specimen', 'Present and not involved', "Paget's disease present", 'DCIS in major lactiferous ducts present'], default: 'Not present in specimen' },
  { id: 'additionalLesions', label: 'Additional lesions (house)', type: 'multiselect', group: G.hist,
    options: ['Not identified', 'Lobular carcinoma in situ, classic', 'Lobular carcinoma in situ, pleomorphic', 'Atypical lobular hyperplasia', 'Flat epithelial atypia', 'Atypical ductal hyperplasia', 'Radial scar / complex sclerosing lesion', 'Papilloma', 'Fibroadenoma', 'Usual ductal hyperplasia', 'Columnar cell change', 'Other (specify)'],
    default: ['Not identified'] },
  { id: 'additionalLesionsDetail', label: 'Additional lesions (specify)', type: 'text', group: G.hist, default: '' },

  // ---- Biomarkers (QMH: use the Breast IHC/DISH template for ER and PR) ----
  { id: 'biomarkers', label: 'Biomarker studies (ER and PR)', type: 'select', group: G.bio,
    options: ['Reported on the prior core biopsy', 'Performed', 'Requested; to be reported separately', 'Not performed'], default: 'Requested; to be reported separately' },
  { id: 'priorBiomarkerAccession', label: 'Prior core biopsy accession', type: 'text', group: G.bio, placeholder: 'S26-01234', default: '', ...when('biomarkers', 'Reported on the prior core biopsy') },
  { id: 'priorBiomarkerSummary', label: 'Prior biomarker summary', type: 'text', group: G.bio, placeholder: 'ER positive (95%, strong), PR positive (80%, strong)', default: '', ...when('biomarkers', 'Reported on the prior core biopsy') },
  ...biomarkerFields({ field: 'biomarkers', is: 'Performed' }).map((f) => ({ ...f, group: G.bio })),

  // ---- Margins (DCIS; 2 mm rule) ----
  { id: 'marginsDcis', label: 'Surgical margins (DCIS)', type: 'textarea', group: G.mar, default: MARGIN_DEFAULT, help: `${MARGIN_HELP} Margins with DCIS closer than 2 mm raise a Check (management differs for involved, < 2 mm and >= 2 mm margins).` },

  // ---- Regional lymph nodes and distant metastasis ----
  ...nodeFields(G).map((f) => (f.id === 'nodeSampling' ? { ...f, default: 'No nodes submitted' } : f)),
  ...metsFields(G),

  // ---- Stage and other findings ----
  ...stageFields(G),
  { id: 'ancillary', label: 'Ancillary studies (other)', type: 'text', group: G.stage, default: '' },
  { id: 'additionalNotes', label: 'Additional notes', type: 'textarea', group: G.stage, default: '' }
];

const defaults = Object.fromEntries(fields.map((f) => [f.id, f.default ?? (f.type === 'checkbox' ? false : f.type === 'multiselect' ? [] : '')]));

const schema = {
  id: 'breast_dcis',
  version: '2026.09',
  name: 'Breast DCIS resection',
  shortName: 'Breast · DCIS resection',
  label: 'DCIS',
  organ: 'BREAST',
  system: 'Breast',
  kind: 'cancer resection',
  // Three-column layout: these render in the case column beside the LIS macroscopy boxes (src/app.js splitFields).
  layout: { macroGroups: ['Specimen and tumour'], macroFields: ['specimenName'] },
  rank: 46,
  aliases: ['breast', 'DCIS', 'ductal carcinoma in situ', 'in situ', 'Paget', 'encapsulated papillary', 'solid papillary', 'wide local excision', 'mastectomy', 'microcalcification', 'synoptic', 'CAP'],
  match: {
    site: ['breast', 'mammary', 'nipple'],
    procedure: ['mastectomy', 'wide local excision', 'WLE', 'lumpectomy', 'excision', 'hookwire', 'wire-guided', 'wire guided', 'breast conserving'],
    clinical: ['DCIS', 'ductal carcinoma in situ', 'in situ', 'Paget', 'microcalcification', 'calcification', 'mammogram', 'BIRADS'],
    // The invasive template wins when the history mentions invasive carcinoma; a plain breast excision defaults to the benign template.
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
  generator: 'breast_dcis',
  style: { british: true },
  source: {
    template: 'QMH Cancer Reporting Template - BREAST-DCIS (Ductal carcinoma in situ of the breast)',
    url: 'https://awiloqmh.github.io/CancerReportingTemplate/BREAST-DCIS.html',
    capProtocol: 'CAP Breast DCIS Resection 4.5.0.1 (June 2026), as on the QMH page (last updated 27-Jul-2026)',
    staging: 'AJCC 8th edition pTis(DCIS) / pTis(Paget) with pN and pM, printed only with the printPTNM option; DCIS has stage group 0 (if cM0)',
    stagingProtocol: 'breast',
    biomarkers: 'generators/breast_biomarkers.js (QMH Breast-markers page, verbatim)',
    savedPage: 'docs/reference/BREAST-DCIS.html',
    houseAdditions: ['Specimen and tumour section (procedure, laterality, site, size, macro fields)', 'nipple status', 'additional lesions', 'margin walker text (7 faces)', 'nodeSampling with (sn) rule', 'Tumour histology paragraph after the grade']
  },
  partDefaults: [],
  caseFields: [
    { id: 'priorAccession', label: 'Prior core biopsy: accession (e.g. S26-01234)', placeholder: 'S26-01234', help: 'Printed with the biomarker line when the results were reported on the core.' }
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
    priorAccession: 'S26-02345',
    parts: [{ label: 'A', values: { ...defaults,
      procedure: 'Excision (less than total mastectomy)', laterality: 'Right', tumourSite: ['Upper outer quadrant'], sitePosition: "10 o'clock, 40 mm from the nipple", specimenDims: '60 x 45 x 30', weight: '48',
      sizeMm: '22', tumourDims: '22 x 15 x 10', closestGrossMm: '8, anterior',
      blockKeyText: '1-6 lesion and biopsy site with the anterior margin\n7-11 posterior, superior, inferior, medial and lateral margins\n12-14 remaining breast',
      dcisBlocks: '5', blocksExamined: '14', dcisPatterns: ['Cribriform', 'Solid'], dcisGrade: 'Grade II (intermediate)', dcisNecrosis: 'Present, focal (small foci or single cell necrosis)', microcalcs: ['Present in DCIS'],
      biomarkers: 'Reported on the prior core biopsy', priorBiomarkerAccession: 'S26-02345', priorBiomarkerSummary: 'ER positive (95%, strong), PR positive (80%, strong)',
      marginsDcis: 'Anterior: 3\nPosterior: 6\nSuperior: >10\nInferior: >10\nMedial: >10\nLateral: 5'
    } }]
  }
};

await writeFile(new URL('../schemas/breast_dcis.json', import.meta.url), `${JSON.stringify(schema, null, 2)}\n`);
console.log(`schemas/breast_dcis.json: ${fields.length} fields`);
