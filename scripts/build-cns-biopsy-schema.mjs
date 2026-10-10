// Builds schemas/cns_biopsy.json. Re-run after editing; the JSON is the artefact.
//
// The glioma path takes its fields from schemas/_cns_layers.json (scripts/build-cns-layers.py),
// the shared CNS diagnosis core, so that a glioma named on a stereotactic core is recorded in the
// same four layers as one named on a resection. Re-run that builder first if it has been edited.
import { readFileSync, writeFileSync } from 'node:fs';

const LAYERS = JSON.parse(readFileSync(new URL('../schemas/_cns_layers.json', import.meta.url), 'utf8')).groups;

const isFinding = (...vals) => ({ field: 'finding', is: vals.length === 1 ? vals[0] : vals });

const GLIOMAS = [
  'Astrocytoma, IDH-mutant',
  'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted',
  'Glioblastoma, IDH-wildtype',
  'Diffuse midline glioma, H3 K27-altered',
  'Pilocytic astrocytoma',
  'Ependymoma'
];
const FINDINGS = [
  'Meningioma',
  'Solitary fibrous tumour',
  ...GLIOMAS,
  'Pituitary neuroendocrine tumour (PitNET)',
  'Schwannoma',
  'Metastatic malignancy',
  'Lymphoma',
  'Abscess / acute inflammation',
  'Demyelinating lesion',
  'Gliosis, no tumour identified',
  'Other (free text)'
];
const TUMOURS = [...FINDINGS.filter((f) => !/Abscess|Demyelinating|Gliosis|Other/.test(f))];

// Defaults differ from the resection: a biopsy starts empty and is filled from what is on the
// slide, so the microscopy and molecular fields open blank or "Not performed" rather than carrying
// the resection form's worked example.
const BIOPSY_DEFAULT = {
  histClass: '', features: [], ihc: [], molStatus: 'Not performed', idh1R132H: 'Not performed'
};

const SFT = 'Solitary fibrous tumour';
function sftFields() {
  const own = { group: SFT, showIf: isFinding(SFT) };
  return [
    { id: 'sftPattern', label: 'Pattern', type: 'select', default: 'Classic (collagenous)', ...own, options: ['Classic (collagenous)', 'Cellular'] },
    { id: 'sftMitoses', label: 'Mitoses (per 10 high-power fields)', type: 'number', default: '', ...own,
      help: 'Fewer than 5 is grade 1; 5 or more is grade 2, or grade 3 with necrosis (2.5 per mm²). Count the most active area.' },
    { id: 'sftNecrosis', label: 'Necrosis', type: 'select', default: 'Not identified', ...own, options: ['Not identified', 'Present'] },
    { id: 'sftGrade', label: 'CNS WHO grade', type: 'select', default: 'From the findings', ...own,
      options: ['From the findings', 'CNS WHO grade 1', 'CNS WHO grade 2', 'CNS WHO grade 3', 'Cannot be determined'],
      help: 'From the findings grades on the mitotic count and necrosis.' },
    { id: 'sftIhc', label: 'Immunohistochemistry', type: 'multiselect', default: [], ...own, options: [
      'STAT6 strong diffuse nuclear', 'CD34 positive', 'CD34 patchy and weak', 'CD99 positive', 'BCL2 positive', 'ALDH1 positive',
      'GRIA2 positive', 'EMA negative', 'EMA focally positive', 'SSTR2A negative', 'Progesterone receptor negative', 'S100 negative',
      'SOX10 negative', 'GFAP negative', 'CD34 negative', 'STAT6 negative' ] },
    { id: 'sftFusion', label: 'NAB2::STAT6 fusion', type: 'select', default: 'Not performed', ...own, options: ['Not performed', 'Detected', 'Not detected'] }
  ];
}

function gliomaLayers() {
  const gate = { field: 'finding', is: GLIOMAS };
  const keep = new Set(['dxQualifier', 'dxQualifierDetail']);
  const groups = [
    LAYERS.layer1.filter((f) => keep.has(f.id)),
    LAYERS.layer2, LAYERS.layer3, LAYERS.features, LAYERS.ihc, LAYERS.treatment, LAYERS.layer4
  ];
  return groups.flat().map((f) => ({
    ...f,
    group: 'Glioma',
    default: f.id in BIOPSY_DEFAULT ? BIOPSY_DEFAULT[f.id] : f.default,
    showIf: f.showIf ? { all: [gate, f.showIf] } : gate
  }));
}

const fields = [
  { id: 'specimenName', label: 'Specimen as received', type: 'text', placeholder: 'Brain, right frontal lesion', default: '' },
  { id: 'site', label: 'Site', type: 'select', default: 'Frontal lobe', options: [
    'Frontal lobe', 'Parietal lobe', 'Temporal lobe', 'Occipital lobe', 'Periventricular white matter', 'Thalamus',
    'Brainstem', 'Cerebellum', 'Cerebellopontine angle', 'Suprasellar', 'Sellar', 'Posterior fossa',
    'Convexity dura', 'Falx', 'Sphenoid wing', 'Spinal cord', 'Other' ] },
  { id: 'siteOther', label: 'Site (other)', type: 'text', default: '', showIf: { field: 'site', is: 'Other' } },
  { id: 'side', label: 'Side', type: 'select', options: ['', 'right', 'left', 'midline'], default: 'right' },
  { id: 'procedure', label: 'Procedure', type: 'select', default: 'stereotactic biopsy', options: [
    'stereotactic biopsy', 'open biopsy', 'debulking', 'craniotomy and excision', 'transsphenoidal excision', 'excision' ] },
  { id: 'prep', label: 'Preparation examined', type: 'select', default: 'Paraffin sections only', options: [
    'Paraffin sections only', 'Smear and paraffin sections', 'Smear preparation only' ] },
  { id: 'smears', label: 'Smears prepared', type: 'number', default: '', showIf: { field: 'prep', is: ['Smear and paraffin sections', 'Smear preparation only'] } },
  { id: 'pieces', label: 'Number of pieces', type: 'number', default: '' },
  { id: 'adequacy', label: 'Tissue sampled', type: 'select', default: 'Lesional tissue well represented', options: [
    'Lesional tissue well represented', 'Scanty lesional tissue', 'Crush artefact limits assessment', 'No lesional tissue identified' ] },
  { id: 'finding', label: 'Diagnosis', type: 'select', options: FINDINGS, default: 'Meningioma' },
  { id: 'findingOther', label: 'Diagnosis (free text)', type: 'text', default: '', showIf: isFinding('Other (free text)') },

  // ----- meningioma -----
  // The criteria block is shared with the resection template; see scripts/build-cns-layers.py.
  // WHO CNS5 grades a meningioma on criteria that are independent of the subtype, so the same
  // block serves a stereotactic core and a craniotomy. Gated on the finding here, on family plus
  // entity on the resection form.
  ...LAYERS.meningioma.map((f) => ({ ...f, group: 'Meningioma', showIf: isFinding('Meningioma') })),

  // ----- solitary fibrous tumour (user request 2026-10-10) -----
  // Graded on the mitotic count and necrosis alone: grade 1 below 5 mitoses per 10 high-power fields
  // (2.5 per mm2), grade 2 at 5 or more, grade 3 at 5 or more with necrosis, counted in the most active
  // area. Nuclear STAT6 stands in for the NAB2::STAT6 fusion. Grounding and URLs:
  // docs/reference/cns_biopsy-morphology.md, "Solitary fibrous tumour".
  ...sftFields(),

  // ----- gliomas: the shared CNS diagnosis core, behind a glioma finding -----
  // Field-level gates are kept and combined with the finding gate through `all`, so Layer 4 still
  // branches on the IDH result exactly as it does on the resection form.
  ...gliomaLayers(),

  // ----- PitNET -----
  { id: 'pitIhc', label: 'Immunohistochemistry', type: 'multiselect', default: [], group: 'PitNET', showIf: isFinding('Pituitary neuroendocrine tumour (PitNET)'), options: [
    'synaptophysin positive', 'CK (CAM5.2) positive', 'PIT1 positive', 'TPIT positive', 'SF1 positive',
    'prolactin positive', 'growth hormone positive', 'ACTH positive', 'reticulin framework disrupted' ] },

  // ----- schwannoma -----
  { id: 'swIhc', label: 'Immunohistochemistry', type: 'multiselect', default: [], group: 'Schwannoma', showIf: isFinding('Schwannoma'), options: [
    'S100 positive', 'SOX10 positive', 'EMA highlights the capsule', 'GFAP negative' ] },

  // ----- metastasis -----
  { id: 'metType', label: 'Metastatic tumour', type: 'select', default: 'Adenocarcinoma', group: 'Metastasis', showIf: isFinding('Metastatic malignancy'), options: [
    'Adenocarcinoma', 'Squamous cell carcinoma', 'Small cell carcinoma', 'Melanoma', 'Renal cell carcinoma', 'Carcinoma, not further classifiable' ] },
  { id: 'metPrimary', label: 'Favoured primary', type: 'text', default: '', group: 'Metastasis', showIf: isFinding('Metastatic malignancy'), placeholder: 'lung' },
  { id: 'metIhc', label: 'Immunohistochemistry', type: 'multiselect', default: [], group: 'Metastasis', showIf: isFinding('Metastatic malignancy'), options: [
    'CK (AE1/AE3) positive', 'TTF-1 positive', 'napsin A positive', 'CK7 positive', 'CK20 positive', 'GATA3 positive',
    'CDX2 positive', 'PAX8 positive', 'SOX10 positive', 'HMB-45 positive', 'oestrogen receptor positive',
    'TTF-1 negative', 'CK7 negative', 'CK20 negative', 'GFAP negative', 'OLIG2 negative' ] },

  // ----- lymphoma -----
  { id: 'lyIhc', label: 'Immunohistochemistry', type: 'multiselect', default: [], group: 'Lymphoma', showIf: isFinding('Lymphoma'), options: [
    'CD20 positive', 'CD79a positive', 'BCL6 positive', 'MUM1 positive', 'CD10 negative', 'CD10 positive',
    'CD3 positive in scattered background T cells', 'CD3 negative' ] },
  { id: 'lyFresh', label: 'Fresh tissue sent for flow cytometry', type: 'checkbox', default: false, group: 'Lymphoma', showIf: isFinding('Lymphoma') },
  { id: 'lySteroid', label: 'Corticosteroid given before biopsy', type: 'checkbox', default: false, group: 'Lymphoma', showIf: isFinding('Lymphoma') },

  // ----- inflammatory / reactive -----
  { id: 'infOrganisms', label: 'Special stains', type: 'select', default: 'Not performed', group: 'Inflammatory', showIf: isFinding('Abscess / acute inflammation'), options: [
    'Not performed', 'Gram, ZN and GMS negative', 'Bacteria identified on Gram stain', 'Fungal elements identified on GMS', 'Acid-fast bacilli identified on Ziehl-Neelsen' ] },
  { id: 'demyIhc', label: 'Special stains', type: 'select', default: 'Not performed', group: 'Inflammatory', showIf: isFinding('Demyelinating lesion'), options: [
    'Not performed', 'Luxol fast blue shows myelin loss with axonal preservation on neurofilament' ] },

  { id: 'ki67', label: 'Ki-67 proliferation index (%)', type: 'number', default: '', showIf: { field: 'finding', is: TUMOURS } },
  { id: 'additionalNotes', label: 'Additional microscopy', type: 'textarea', default: '', placeholder: '' }
];

const schema = {
  id: 'cns_biopsy',
  version: '2026.10',
  name: 'Brain and CNS biopsy',
  shortName: 'Brain · biopsy / smear',
  label: 'Brain',
  organ: 'BRAIN',
  system: 'CNS',
  kind: 'biopsy',
  rank: 60,
  aliases: ['CNS', 'glioma', 'glioblastoma', 'meningioma', 'smear', 'squash', 'stereotactic', 'craniotomy', 'GBM', 'IDH', 'pituitary', 'schwannoma', 'metastasis'],
  match: {
    site: ['brain', 'brain tumour', 'cerebral', 'cerebellum', 'dura', 'meninges', 'frontal lobe', 'parietal lobe', 'temporal lobe', 'occipital lobe', 'periventricular', 'suprasellar', 'sellar', 'cerebellopontine angle', 'posterior fossa', 'spinal cord', 'sphenoidal ridge', 'sphenoid wing'],
    procedure: ['biopsy', 'stereotactic biopsy', 'craniotomy', 'excision', 'debulking', 'smear', 'squash'],
    clinical: ['glioma', 'glioblastoma', 'meningioma', 'brain tumour', 'space-occupying lesion', 'metastasis', 'pituitary adenoma', 'lymphoma'],
    // Kept in step with the JSON, which gained these on 2026-09-24 (docs/specs/specimen-intake.md, CNS and lung sites).
    sideFromText: true,
    fill: [{ field: 'specimenName', from: 'detail' }, { field: 'site', from: 'options', noGuess: true }]
  },
  specimenNoun: 'biopsy',
  maxParts: 6,
  defaultParts: 1,
  generator: 'cns_biopsy',
  style: { british: true },
  source: {
    name: 'WHO Classification of Tumours of the Central Nervous System, 5th edition (2021), with the ICCR integrated-diagnosis dataset',
    url: 'https://www.iccr-cancer.org/wp-content/uploads/2026/03/ICCR-CNS-Integrated-diagnosis-2nd-ed-v2.1-bookmark-1.pdf'
  },
  caseFields: [
    { id: 'imaging', label: 'Imaging / clinical', placeholder: 'Ring-enhancing right frontal lesion with surrounding oedema', help: 'Optional; not printed.' }
  ],
  options: [{ $use: 'includeHeader' }, { id: 'layered', label: 'Layered diagnosis lines', type: 'checkbox', default: true }],
  partDefaults: [],
  fields,
  snippets: [
    { id: 'cns_integrated_pending', label: 'Integrated diagnosis to follow', auto: { flag: 'molecularPending' },
      text: 'Molecular studies have been requested; the integrated diagnosis and CNS WHO grade will be issued in a supplementary report.' },
    { id: 'cns_mgmt', label: 'MGMT testing', auto: { flag: 'highGradeGlioma' },
      text: 'MGMT promoter methylation testing has been requested; the result will be issued in a supplementary report.' },
    { id: 'cns_meningioma_molecular', label: 'Meningioma — molecular for grading', auto: { flag: 'meningiomaBorderline' },
      text: 'TERT promoter sequencing and CDKN2A/B copy-number analysis have been requested; the CNS WHO grade will be confirmed in a supplementary report.' },
    { id: 'cns_lymphoma_flow', label: 'Lymphoma — flow and staging', auto: { flag: 'lymphoma' },
      text: 'The diagnosis should be correlated with flow cytometry, cerebrospinal fluid examination and staging investigations.' },
    { id: 'cns_steroid', label: 'Corticosteroid effect', auto: { flag: 'steroid' },
      text: 'Corticosteroid therapy before biopsy may obscure a lymphoid infiltrate; a repeat biopsy should be considered if the clinical and radiological picture is unchanged.' },
    { id: 'cns_scanty', label: 'Scanty or crushed tissue', auto: { flag: 'limited' },
      text: 'The tissue available is limited and a higher-grade component elsewhere in the lesion cannot be excluded; correlation with imaging is recommended.' }
  ],
  example: {
    caseTitle: '',
    options: { includeHeader: false, layered: true },
    parts: [{ label: 'A', values: {
      specimenName: 'Brain, right frontal lesion',
      site: 'Frontal lobe', siteOther: '', side: 'right', procedure: 'stereotactic biopsy',
      prep: 'Smear and paraffin sections', smears: '2', pieces: '3', adequacy: 'Lesional tissue well represented',
      finding: 'Glioblastoma, IDH-wildtype', findingOther: '',
      histClass: 'Glioblastoma', grade: 'From the findings',
      features: ['Increased cellularity', 'Nuclear atypia', 'Mitoses', 'Microvascular proliferation', 'Necrosis with pseudopalisading'],
      mitoses: '8',
      ihc: ['GFAP positive', 'OLIG2 positive'], ihcOther: '',
      molStatus: 'Reported', idhBranch: 'IDH-wildtype', idh1R132H: 'Negative', atrx: 'Intact nuclear expression',
      tert: 'Mutation detected (specify)', tertDetail: 'C228T',
      ki67: '25', additionalNotes: ''
    } }]
  }
};

writeFileSync(new URL('../schemas/cns_biopsy.json', import.meta.url), `${JSON.stringify(schema, null, 2)}\n`);
console.log(`cns_biopsy: ${fields.length} fields`);
