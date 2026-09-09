// Input states for the golden fixtures. Expected outputs are produced by
// tools/capture-fixtures.js, which runs BOTH the extracted legacy functions and
// the original HTML apps (in jsdom) and refuses to write if they disagree.

const { defaultPart } = require('../legacy/gastric-legacy');

function gp(label, index, overrides) { return Object.assign(defaultPart(label, index), overrides || {}); }

const gastric = [
  {
    name: '01-normal-antrum-body',
    description: 'Two parts, everything Absent. Captures the legacy default wording for a negative biopsy.',
    caseTitle: '',
    parts: [gp('A', 0, { specimenName: 'Antrum' }), gp('B', 1, { specimenName: 'Body' })]
  },
  {
    name: '02-load-example-hp-ulcer-im',
    description: 'The built-in Load example case: H. pylori body gastritis with ulcer and mild incomplete IM; case title supplies sites.',
    caseTitle: '(A) Antrum and (B) Body',
    parts: [
      gp('A', 0, { specimenName: 'Antrum', chronic: 'Mild' }),
      gp('B', 1, { specimenName: 'Body', activity: 'Mild', chronic: 'Mild', follicles: 'Present', ulcer: 'Present', imDegree: 'Mild', imType: 'Incomplete', hp: 'Moderate density' })
    ]
  },
  {
    name: '03-hp-active-im-complete-atrophy',
    description: 'Single antral part: H. pylori active gastritis with moderate complete IM and mild atrophy.',
    caseTitle: '',
    parts: [gp('A', 0, { specimenName: 'Antrum', activity: 'Moderate', chronic: 'Moderate', follicles: 'Present', imDegree: 'Moderate', imType: 'Complete', atrophy: 'Mild', hp: 'High density' })]
  },
  {
    name: '04-hp-negative-lgd-marked-im',
    description: 'H. pylori negative, inactive, marked incomplete IM, moderate atrophy, low grade dysplasia.',
    caseTitle: '',
    parts: [gp('A', 0, { specimenName: 'Incisura', chronic: 'Moderate', atrophy: 'Moderate', imDegree: 'Marked', imType: 'Incomplete', dysplasia: 'Low grade dysplasia' })]
  },
  {
    name: '05-title-parsing-overrides-names',
    description: 'Case title sites override blank specimen names; trailing "and" and punctuation stripped.',
    caseTitle: '(A) Antrum, (B) Body and (C) Incisura;',
    parts: [gp('A', 0, {}), gp('B', 1, { activity: 'Mild', hp: 'Low density' }), gp('C', 2, { chronic: 'Mild' })]
  },
  {
    name: '06-four-parts-superficial-notes',
    description: 'Four parts including superficial gastric mucosa and indeterminate site types with additional notes.',
    caseTitle: '',
    parts: [
      gp('A', 0, { specimenName: 'Antrum', siteType: 'Superficial gastric mucosa', additionalNotes: 'Superficial fragments only; deep glands not represented.' }),
      gp('B', 1, { specimenName: 'Body', siteType: 'Indeterminate', chronic: 'Mild' }),
      gp('C', 2, { specimenName: 'Cardia', siteType: 'Cardiac type', chronic: 'Mild', follicles: 'Present' }),
      gp('D', 3, { specimenName: 'Incisura', siteType: 'Pyloric type', imDegree: 'Mild', imType: '' })
    ]
  },
  {
    name: '07-hp-marked-active-imc',
    description: 'H. pylori high density, marked activity, ulcer, intramucosal carcinoma: exercises extras ordering after HP diagnosis.',
    caseTitle: '',
    parts: [gp('A', 0, { specimenName: 'Antrum', activity: 'Marked', chronic: 'Marked', ulcer: 'Present', imDegree: 'Mild', imType: 'Incomplete', atrophy: 'Mild', dysplasia: 'Intramucosal carcinoma', hp: 'High density' })]
  },
  {
    name: '08-blank-names-fallback',
    description: 'No case title and blank specimen names: diagnosis falls back to "stomach"; specimen line uses Part labels.',
    caseTitle: '',
    parts: [gp('A', 0, { activity: 'Mild' }), gp('B', 1, { dysplasia: 'Indefinite for dysplasia' })]
  }
];

const colonic = [
  {
    name: '01-default-single-ta-lgd',
    description: 'App default state: one sigmoid tubular adenoma LGD, header on, uppercase on.',
    includeHeader: true, uppercaseDx: true,
    specimens: [{ site: 'Sigmoid', type: 'tubularAdenoma', dysplasia: 'Low grade dysplasia', customSpecimen: '', comment: '' }]
  },
  {
    name: '02-load-example-custom-specimen',
    description: 'The built-in Load example: custom specimen line override.',
    includeHeader: true, uppercaseDx: true,
    specimens: [{ site: 'Sigmoid', type: 'tubularAdenoma', dysplasia: 'Low grade dysplasia', customSpecimen: 'lower sigmoid polyp 18 cm', comment: '' }]
  },
  {
    name: '03-ten-polyps-mixed',
    description: 'Maximum of ten specimens (A-J) across all six polyp types and all sites.',
    includeHeader: true, uppercaseDx: true,
    specimens: [
      { site: 'Cecum', type: 'tubularAdenoma', dysplasia: 'Low grade dysplasia', customSpecimen: '', comment: '' },
      { site: 'Ascending colon', type: 'sessileSerrated', dysplasia: 'No dysplasia', customSpecimen: '', comment: '' },
      { site: 'Hepatic flexure', type: 'hyperplasticPolyp', dysplasia: 'Not applicable', customSpecimen: '', comment: '' },
      { site: 'Transverse colon', type: 'tubulovillousAdenoma', dysplasia: 'Low grade dysplasia', customSpecimen: '', comment: '' },
      { site: 'Splenic flexure', type: 'tubularAdenoma', dysplasia: 'High grade dysplasia', customSpecimen: '', comment: '' },
      { site: 'Descending colon', type: 'traditionalSerrated', dysplasia: 'Low grade dysplasia', customSpecimen: '', comment: '' },
      { site: 'Sigmoid', type: 'villousAdenoma', dysplasia: 'High grade dysplasia', customSpecimen: '', comment: '' },
      { site: 'Rectosigmoid', type: 'sessileSerrated', dysplasia: 'Low grade dysplasia', customSpecimen: '', comment: '' },
      { site: 'Rectum', type: 'hyperplasticPolyp', dysplasia: 'Not applicable', customSpecimen: '', comment: '' },
      { site: 'Colon, site not specified', type: 'tubularAdenoma', dysplasia: 'Low grade dysplasia', customSpecimen: '', comment: '' }
    ]
  },
  {
    name: '04-no-header-no-uppercase',
    description: 'Header off and uppercase off: plain blocks with sentence-case diagnosis.',
    includeHeader: false, uppercaseDx: false,
    specimens: [
      { site: 'Rectum', type: 'hyperplasticPolyp', dysplasia: 'Not applicable', customSpecimen: '', comment: '' },
      { site: 'Sigmoid', type: 'tubularAdenoma', dysplasia: 'Low grade dysplasia', customSpecimen: '', comment: '' }
    ]
  },
  {
    name: '05-serrated-with-comments',
    description: 'SSL without dysplasia, SSL with HGD and TSA with per-specimen comments appended to microscopy.',
    includeHeader: true, uppercaseDx: true,
    specimens: [
      { site: 'Ascending colon', type: 'sessileSerrated', dysplasia: 'No dysplasia', customSpecimen: '', comment: 'The lesion is completely excised in the planes examined.' },
      { site: 'Cecum', type: 'sessileSerrated', dysplasia: 'High grade dysplasia', customSpecimen: 'caecal polyp 12 mm', comment: '' },
      { site: 'Rectum', type: 'traditionalSerrated', dysplasia: 'High grade dysplasia', customSpecimen: '', comment: 'The base is not clearly represented.' }
    ]
  },
  {
    name: '06-site-not-specified',
    description: '"Colon, site not specified" maps to COLON / Colon in diagnosis and specimen name.',
    includeHeader: true, uppercaseDx: true,
    specimens: [{ site: 'Colon, site not specified', type: 'tubulovillousAdenoma', dysplasia: 'High grade dysplasia', customSpecimen: '', comment: '' }]
  },
  {
    name: '07-header-on-sentence-case',
    description: 'Header on, uppercase off: sentence-case diagnosis under DIAGNOSIS heading.',
    includeHeader: true, uppercaseDx: false,
    specimens: [
      { site: 'Descending colon', type: 'villousAdenoma', dysplasia: 'Low grade dysplasia', customSpecimen: '', comment: '' },
      { site: 'Colon, site not specified', type: 'sessileSerrated', dysplasia: 'No dysplasia', customSpecimen: '', comment: '' }
    ]
  },
  {
    name: '08-whitespace-trimming',
    description: 'Padded custom specimen and comment strings are trimmed before use.',
    includeHeader: false, uppercaseDx: true,
    specimens: [{ site: 'Rectosigmoid', type: 'tubularAdenoma', dysplasia: 'High grade dysplasia', customSpecimen: '  rectosigmoid polyp 8 mm  ', comment: '  Margins are involved.  ' }]
  }
];

module.exports = { gastric, colonic };
