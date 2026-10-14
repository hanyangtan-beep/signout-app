// Builds schemas/gvhd_biopsy.json. Re-run after editing; the JSON is the artefact.
//
// Card: docs/roadmap.md "GI and oral graft-versus-host disease biopsy" (user request and pulled by the user
// 2026-10-14, Phase 71). The option lists come from generators/gvhd_biopsy.js so the form and the printed
// wording cannot drift apart. Grounding: docs/reference/gvhd_biopsy-morphology.md.
import { writeFileSync } from 'node:fs';
import {
  SITES, OTHER_SITE, REGION_LABELS, sitesOf, APOPTOSIS, CRYPT_LOSS, CRYPT_CHANGES, PANETH, GUT_FEATURES, OESO_FEATURES,
  LAMINA_PROPRIA, ORAL_FEATURES, SALIVARY_FEATURES, VIRAL, CMV, DIFFERENTIAL, NIH, PHASES, GRADES
} from '../generators/gvhd_biopsy.js';

const LABEL = { oesophagus: 'Oesophagus', stomach: 'Stomach', small: 'Small bowel', colon: 'Colon or rectum', oral: 'Oral mucosa' };
/** Visible for these regions: a listed site of the region, or a typed site with the region chosen. */
const inRegion = (...regions) => ({
  any: [{ field: 'site', is: sitesOf(...regions) }, { all: [{ field: 'site', is: OTHER_SITE }, { field: 'region', is: regions.map((r) => LABEL[r]) }] }]
});
const GUT = inRegion('oesophagus', 'stomach', 'small', 'colon');
const GLANDS = inRegion('stomach', 'small', 'colon');
const BOWEL = inRegion('small', 'colon');
const OESO = inRegion('oesophagus');
const ORAL = inRegion('oral');
const SALIVARY = { all: [ORAL, { field: 'salivary', is: 'Included' }] };

const NIH_REFERENCE = {
  title: 'NIH 2014 categories and organ criteria',
  intro: 'Final categories for a biopsy taken for GVHD; no single feature is pathognomonic.',
  groups: [
    { heading: 'Categories', points: [
      'Not GVHD: no evidence for GVHD',
      'Possible GVHD: evidence of GVHD but other possible explanations, such as CMV with inclusions near the apoptotic changes, mycophenolate injury or a drug reaction; name them',
      'Likely GVHD: clear evidence of GVHD without a competing cause, or with mitigating factors (a limited sample, focal findings, recent chemotherapy or radiotherapy), or GVHD the most likely diagnosis on limited clinical information',
      'Likely GVHD includes the former "consistent with" and "unequivocal" categories'
    ], images: [] },
    { heading: 'Minimal criteria by site', points: [
      'Gut: apoptosis in the crypts, variable, at least one per piece',
      'Oral mucosa: lichenoid interface lymphocytes with exocytosis and variable apoptosis',
      'Minor salivary gland (chronic GVHD): periductal lymphocytic infiltrate with damaged intralobular ducts, periductal fibroplasia and acinar destruction',
      'In the gut the histology does not separate acute from chronic GVHD'
    ], images: [] }
  ],
  note: 'Shulman et al., Biol Blood Marrow Transplant 2015 (NIH 2014 Pathology Working Group), Tables 1 and 2.'
};
const GRADE_REFERENCE = {
  title: 'Gut grade (small bowel and colon)',
  intro: 'Graded at the most severe point; grading correlates poorly with outcome and is optional.',
  columns: 2,
  groups: [
    { heading: '1', points: ['Isolated apoptotic epithelial cells without crypt loss'], images: [] },
    { heading: '2', points: ['Crypt necrosis, withering and individual crypt loss'], images: [] },
    { heading: '3', points: ['Contiguous areas of multiple crypt loss'], images: [] },
    { heading: '4', points: ['Extensive crypt dropout with denudation of the epithelium'], images: [] }
  ],
  note: 'Nat Rev Gastroenterol Hepatol 2018 (PMC6240460), Table 2; Lerner grades on PathologyOutlines.'
};

const specimen = [
  { id: 'site', label: 'Site', type: 'select', group: 'Specimen', default: 'Colon', options: SITES },
  { id: 'siteOther', label: 'Site as typed', type: 'text', group: 'Specimen', default: '', showIf: { field: 'site', is: OTHER_SITE } },
  { id: 'region', label: 'Region', type: 'select', group: 'Specimen', default: 'Colon or rectum', options: REGION_LABELS, showIf: { field: 'site', is: OTHER_SITE },
    help: 'Chooses the findings the form offers for a typed site.' },
  { id: 'detail', label: 'Site detail', type: 'text', group: 'Specimen', default: '', placeholder: 'D2; lower; 10 cm from AV',
    help: 'Printed after the site: "DUODENUM, D2, biopsy".' },
  { id: 'procedure', label: 'Procedure', type: 'select', group: 'Specimen', default: 'Biopsy', options: ['Biopsy', 'Punch biopsy', 'Incisional biopsy'] },
  { id: 'pieces', label: 'Pieces', type: 'number', group: 'Specimen', default: '', min: 1, step: 1, placeholder: '2' },
  { id: 'sections', label: 'Serial sections examined', type: 'number', group: 'Specimen', default: '', min: 1, step: 1,
    help: 'Not printed. The Checks compare it with the NIH 2014 advice (at least 8, up to 20).' }
];

const gut = [
  { id: 'apoptosis', label: 'Apoptosis', type: 'select', group: 'Gut findings', default: 'None seen', options: APOPTOSIS, showIf: GUT,
    help: 'Crypt apoptosis in the bowel, glandular apoptosis in the stomach, basal apoptosis in the oesophagus.' },
  { id: 'superficial', label: 'Apoptotic debris in the surface epithelium and lamina propria', type: 'checkbox', group: 'Gut findings', default: false, showIf: GUT },
  { id: 'cryptLoss', label: 'Crypt or gland loss', type: 'select', group: 'Gut findings', default: 'None', options: CRYPT_LOSS, showIf: GLANDS },
  { id: 'cryptChanges', label: 'Crypt changes', type: 'multiselect', group: 'Gut findings', default: [], options: CRYPT_CHANGES, showIf: GLANDS },
  { id: 'paneth', label: 'Paneth cells', type: 'select', group: 'Gut findings', default: 'Not stated', options: PANETH, showIf: BOWEL },
  { id: 'gutFeatures', label: 'Other features', type: 'multiselect', group: 'Gut findings', default: [], options: GUT_FEATURES, showIf: GLANDS },
  { id: 'oesoFeatures', label: 'Other features', type: 'multiselect', group: 'Gut findings', default: [], options: OESO_FEATURES, showIf: OESO },
  { id: 'laminaPropria', label: 'Lamina propria infiltrate', type: 'select', group: 'Gut findings', default: 'Sparse', options: LAMINA_PROPRIA, showIf: GLANDS },
  { id: 'eosinophils', label: 'Eosinophils', type: 'select', group: 'Gut findings', default: 'Inconspicuous', options: ['Not stated', 'Inconspicuous', 'Increased'], showIf: GUT }
];

const oral = [
  { id: 'oralFeatures', label: 'Mucosa', type: 'multiselect', group: 'Oral findings', default: [], options: ORAL_FEATURES, showIf: ORAL },
  { id: 'salivary', label: 'Minor salivary glands', type: 'select', group: 'Oral findings', default: 'Not included', options: ['Not included', 'Included'], showIf: ORAL },
  { id: 'lobules', label: 'Salivary lobules', type: 'number', group: 'Oral findings', default: '', min: 0, step: 1, showIf: SALIVARY,
    help: 'Lobules that are not completely fibrotic. Printed as the number present.' },
  { id: 'salivaryFeatures', label: 'Salivary gland changes', type: 'multiselect', group: 'Oral findings', default: [], options: SALIVARY_FEATURES, showIf: SALIVARY,
    help: 'Any change ticked reads as lymphocytic sialadenitis and chronic GVHD.' }
];

const infection = [
  { id: 'viral', label: 'Viral cytopathic change', type: 'select', group: 'Infection and stains', default: 'Not seen', options: VIRAL },
  { id: 'granuloma', label: 'Granulomas', type: 'select', group: 'Infection and stains', default: 'Not seen', options: ['Not seen', 'Present'] },
  { id: 'cmv', label: 'CMV immunohistochemistry', type: 'select', group: 'Infection and stains', default: 'Not performed', options: CMV },
  { id: 'otherStains', label: 'Other stains', type: 'text', group: 'Infection and stains', default: '', placeholder: 'Immunohistochemistry for adenovirus is negative' }
];

const diagnosisFields = [
  { id: 'nih', label: 'NIH category', type: 'select', group: 'Diagnosis', default: 'Likely GVHD', options: NIH, reference: NIH_REFERENCE,
    help: 'The NIH 2014 final categories. Possible GVHD: name the other explanations in the differential.' },
  { id: 'phase', label: 'Phase', type: 'select', group: 'Diagnosis', default: 'Not stated', options: PHASES,
    help: 'Not stated prints "graft-versus-host disease"; salivary gland changes print as chronic.' },
  { id: 'grade', label: 'Grade', type: 'select', group: 'Diagnosis', default: 'Auto', options: GRADES, reference: GRADE_REFERENCE,
    showIf: { all: [BOWEL, { field: 'nih', is: 'Likely GVHD' }] },
    help: 'Auto reads the crypt findings: 1 apoptosis, 2 individual crypt loss, 3 contiguous crypt loss, 4 extensive loss with denudation. Printed with Likely GVHD only.' },
  { id: 'differential', label: 'Differential diagnosis', type: 'multiselect', group: 'Diagnosis', default: [], options: DIFFERENTIAL },
  { id: 'differentialOther', label: 'Differential as typed', type: 'text', group: 'Diagnosis', default: '', placeholder: 'adenovirus infection',
    help: 'Joins the ticked options: "The differential diagnosis includes ...".' },
  { id: 'extraDx', label: 'Additional diagnosis', type: 'text', group: 'Diagnosis', default: '', placeholder: 'MILD CHRONIC INACTIVE GASTRITIS',
    help: 'Printed as typed, as its own line under the GVHD line.' }
];

const report = [
  { id: 'additionalNotes', label: 'Additional microscopy', type: 'textarea', group: 'Report', default: '' },
  { id: 'seeDescription', label: 'Add "(please see description)" for Possible GVHD or a differential', type: 'checkbox', group: 'Report', default: true },
  { id: 'noDysplasia', label: 'Close with "There is no evidence of dysplasia or malignancy."', type: 'checkbox', group: 'Report', default: true },
  { id: 'correlate', label: 'Close with "Please correlate with clinical findings."', type: 'checkbox', group: 'Report', default: true }
];

// Intake. A GI or oral line comes here when the line, the case prefix or the clinical history meets `gate`
// (GVHD, graft-versus-host disease, an allogeneic or stem cell transplant, BMT), unless `exclude` names a polyp, a
// mass, a resection or a lesion for dysplasia. The bias makes a gated line confident over the organ forms, whose
// site words it shares. The pattern is the Dermatoses form's GVHD fill pattern with aGVHD and cGVHD added.
const GATE = '\\b[ac]?GVHD?\\b|graft[\\s-]+(?:versus|vs\\.?)[\\s-]+host|\\ballo(?:geneic)?[\\s-]*(?:HSCT|BMT|SCT|PBSCT|HCT|transplant\\w*)|\\b(?:HSCT|BMT|PBSCT)\\b|(?:stem[\\s-]+cell|bone[\\s-]+marrow|ha?ematopoietic(?:[\\s-]+stem)?[\\s-]+cell)[\\s-]+transplant\\w*';
const SITE_MAP = [
  ['\\bterminal\\s+ileum\\b|\\bTI\\b', 'Terminal ileum'], ['\\bile(?:um|al)\\b', 'Ileum'], ['\\bjejun', 'Jejunum'], ['\\bduoden|\\bD[1-4]\\b', 'Duodenum'],
  ['o?esophag|\\bOGJ\\b|\\bGOJ\\b', 'Oesophagus'], ['\\bantr', 'Gastric antrum'], ['\\b(?:body|corpus|fundus)\\b', 'Gastric body'], ['\\b(?:stomach|gastric)\\b', 'Stomach'],
  ['\\bca?ec(?:um|al)\\b', 'Caecum'], ['\\bhepatic\\s+flexure\\b', 'Hepatic flexure'], ['\\bsplenic\\s+flexure\\b', 'Splenic flexure'], ['\\bascending\\b', 'Ascending colon'],
  ['\\btransverse\\b', 'Transverse colon'], ['\\bdescending\\b', 'Descending colon'], ['\\brecto-?sigmoid\\b', 'Rectosigmoid'], ['\\bsigmoid\\b', 'Sigmoid colon'],
  ['\\brect(?:um|al)\\b', 'Rectum'], ['\\bcolon|\\bcolonic\\b', 'Colon'],
  ['\\bbuccal\\b|\\bcheek\\b', 'Buccal mucosa'], ['\\blips?\\b|\\blabial\\b|\\bminor\\s+salivary\\b|\\bMSG\\b', 'Lip'], ['\\btongue\\b', 'Tongue'], ['\\bging|\\bgums?\\b', 'Gingiva'],
  ['\\bhard\\s+palate\\b', 'Hard palate'], ['\\bsoft\\s+palate\\b', 'Soft palate'], ['\\bpalat', 'Palate'], ['\\bfloor\\s+of\\s+(?:the\\s+)?mouth\\b', 'Floor of mouth'],
  ['\\boral\\b|\\bmouth\\b', 'Oral mucosa']
];
const DETAIL_STRIP = '\\b(?:terminal\\s+ileum|ileum|ileal|TI|jejun\\w*|duoden\\w*|o?esophag\\w*|OGJ|GOJ|stomach|gastric|antr\\w*|body|corpus|fundus|ca?ec(?:um|al)|hepatic\\s+flexure|splenic\\s+flexure|ascending|transverse|descending|recto-?sigmoid|sigmoid|rect(?:um|al)|colon(?:ic)?|buccal(?:\\s+mucosa)?|cheek|mucosa|lips?|labial|minor\\s+salivary\\s+glands?|salivary\\s+glands?|MSG|tongue|ging\\w*|gums?|hard\\s+palate|soft\\s+palate|palat\\w*|floor\\s+of\\s+(?:the\\s+)?mouth|mouth|oral(?:\\s+cavity)?|punch|incisional|biops(?:y|ies)|bx|x\\s*\\d+|for\\s+[ac]?GVHD?|[ac]?GVHD?|query|r\\/o)\\b|\\?\\s*[ac]?GVHD?\\b|\\?|[()]';
// The clinical question and the transplant, when written on the line ("biopsy ?acute GVHD", "post BMT",
// "(post allo-HSCT)"), are not part of the site detail.
const CLINICAL_STRIP = '(?:\\?\\s*|\\b(?:query|r\\/o|rule\\s+out|to\\s+exclude|exclude|for|suspected)\\s+)?(?:\\b(?:acute|chronic|upper\\s+GI|lower\\s+GI|gut|GI)\\s+)?'
  + '(?:\\b[ac]?GVHD?\\b|\\bgraft[\\s-]+(?:versus|vs\\.?)[\\s-]+host(?:[\\s-]+disease)?\\b)'
  + '|\\b(?:post[\\s-]*)?(?:allo(?:geneic)?[\\s-]*)?(?:HSCT|BMT|SCT|PBSCT|HCT)\\b'
  + '|\\b(?:post[\\s-]+)?(?:allo(?:geneic)?[\\s-]+)?(?:stem[\\s-]+cell|bone[\\s-]+marrow|ha?ematopoietic(?:[\\s-]+stem)?[\\s-]+cell)[\\s-]+transplant\\w*'
  + '|\\b(?:post[\\s-]+)?allo(?:geneic)?[\\s-]+transplant\\w*';
const match = {
  site: ['oesophagus', 'oesophageal', 'esophagus', 'esophageal', 'stomach', 'gastric', 'antrum', 'antral', 'corpus', 'body', 'fundus', 'duodenum', 'duodenal', 'D2',
    'jejunum', 'jejunal', 'ileum', 'ileal', 'terminal ileum', 'TI', 'small bowel', 'colon', 'colonic', 'caecum', 'cecum', 'ascending', 'transverse', 'descending',
    'sigmoid', 'rectosigmoid', 'rectum', 'rectal', 'hepatic flexure', 'splenic flexure', 'random colon',
    'oral', 'oral mucosa', 'mouth', 'buccal', 'buccal mucosa', 'cheek', 'lip', 'lips', 'labial', 'tongue', 'gingiva', 'gingival', 'gum', 'palate', 'hard palate', 'soft palate',
    'floor of mouth', 'minor salivary gland', 'minor salivary glands', 'MSG'],
  procedure: ['biopsy', 'biopsies', 'punch', 'punch biopsy', 'incisional biopsy'],
  clinical: ['GVHD', 'aGVHD', 'cGVHD', 'GVH', 'graft-versus-host', 'graft versus host', 'BMT', 'HSCT', 'allo-HSCT', 'allogeneic', 'stem cell transplant', 'bone marrow transplant'],
  gate: GATE,
  exclude: ['polyp', 'polypectomy', 'mass', 'tumour', 'tumor', 'growth', 'carcinoma', 'cancer', 'EMR', 'ESD', 'resection', 'excision', 'colectomy', 'gastrectomy',
    'oesophagectomy', 'esophagectomy', 'leukoplakia', 'leucoplakia', 'erythroplakia', 'dysplasia', 'frozen'],
  bias: 5,
  fill: [
    { field: 'site', from: 'map', map: SITE_MAP },
    { field: 'detail', from: 'text', strip: `${DETAIL_STRIP}|${CLINICAL_STRIP}`, unless: '^(?:and|of|the|for|with)$' },
    { field: 'procedure', from: 'map', map: [['\\bpunch', 'Punch biopsy'], ['\\bincisional', 'Incisional biopsy']] },
    { field: 'salivary', from: 'map', map: [['salivary|\\bMSG\\b|\\blips?\\b|\\blabial\\b', 'Included']] }
  ]
};

const schema = {
  id: 'gvhd_biopsy',
  version: '2026.10',
  name: 'GI and oral graft-versus-host disease biopsy',
  shortName: 'GI / oral · GVHD biopsy',
  label: 'GVHD',
  organ: 'COLON',
  system: 'GI',
  kind: 'biopsy',
  rank: 64,
  aliases: ['GVHD', 'graft-versus-host disease', 'graft versus host', 'aGVHD', 'cGVHD', 'BMT', 'HSCT', 'allogeneic transplant', 'lichenoid mucositis', 'minor salivary gland'],
  match,
  specimenNoun: 'biopsy',
  maxParts: 8,
  defaultParts: 1,
  generator: 'gvhd_biopsy',
  style: { british: true },
  source: {
    template: 'n.a. (no QMH page)',
    name: 'NIH Consensus Development Project on Criteria for Clinical Trials in Chronic GVHD: 2014 Pathology Working Group Report (Shulman et al., Biol Blood Marrow Transplant 2015)',
    staging: 'None. Gut grade 1-4 (Nat Rev Gastroenterol Hepatol 2018; Lerner) where graded.'
  },
  caseFields: [
    { id: 'transplantDay', label: 'Days since transplant', placeholder: '45',
      help: 'Optional; read from the clinical history when blank ("day +15", "D+15"). Used by the Checks only.' },
    { id: 'mmf', label: 'Mycophenolate (MMF)', type: 'select', options: ['Not stated', 'Yes', 'No'], default: 'Not stated',
      help: 'Optional; read from the clinical history when not stated. Used by the Checks only.' }
  ],
  options: [{ $use: 'includeHeader' }],
  partDefaults: [],
  fields: [...specimen, ...gut, ...oral, ...infection, ...diagnosisFields, ...report],
  snippets: [],
  example: {
    caseTitle: '',
    options: { includeHeader: false },
    parts: [{ label: 'A', values: {
      site: 'Sigmoid colon', procedure: 'Biopsy', pieces: '2', sections: '10',
      apoptosis: 'At least one per piece', cryptLoss: 'Individual crypts', cryptChanges: ['Withering', 'Regenerative epithelial changes'],
      paneth: 'Not stated', laminaPropria: 'Sparse', eosinophils: 'Inconspicuous',
      viral: 'Not seen', granuloma: 'Not seen', cmv: 'Negative',
      nih: 'Likely GVHD', phase: 'Not stated', grade: 'Auto'
    } }]
  }
};

writeFileSync(new URL('../schemas/gvhd_biopsy.json', import.meta.url), `${JSON.stringify(schema, null, 2)}\n`);
console.log(`schemas/gvhd_biopsy.json written (${schema.fields.length} fields)`);
