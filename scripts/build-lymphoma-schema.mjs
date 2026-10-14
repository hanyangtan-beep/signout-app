// Builds schemas/lymphoma_node.json. Re-run after editing; the JSON is the artefact.
//
// Cards: docs/roadmap.md "Lymph node for lymphoma — form, specimen and diagnosis" and "… —
// immunohistochemistry and ancillary studies" (pulled by the user 2026-10-14, Phase 71). The option lists
// (diagnoses, markers, cytology, FISH and clonality results) come from generators/lymphoma_node.js so the
// form and the printed wording cannot drift apart. Grounding: docs/reference/lymphoma_node-morphology.md.
import { writeFileSync } from 'node:fs';
import {
  DX_GROUPS, DX_OPTIONS, OTHER, NEOPLASTIC, LESIONAL, SELF_WORDED, DLBCL, FL, CHL, MARKERS, MARKER_NAMES, RESULTS, resultField,
  CYTOLOGY, BACKGROUND_OPTIONS, FEATURES, FISH_RESULTS, CLONALITY_RESULTS, MIXED
} from '../generators/lymphoma_node.js';

const REFERRAL = { field: 'received', is: 'Slides for review' };
const IN_HOUSE = { field: 'received', is: 'In house' };
const dxIs = (...d) => ({ field: 'dx', is: d.length === 1 ? d[0] : d });
const CORE = { field: 'procedure', is: 'Core biopsy' };
const NOT_CORE = { field: 'procedure', not: 'Core biopsy' };
const NODE_EXCISION = { field: 'procedure', is: ['Excision', 'Excisional biopsy'] };

const specimen = [
  { id: 'site', label: 'Site', type: 'text', group: 'Specimen', default: '', placeholder: 'left neck',
    help: 'Printed after "Lymph node," in the specimen and diagnosis lines.' },
  { id: 'procedure', label: 'Procedure', type: 'select', group: 'Specimen', default: 'Excision',
    options: ['Excision', 'Excisional biopsy', 'Incisional biopsy', 'Core biopsy', 'Biopsy'] },
  { id: 'received', label: 'Material', type: 'select', group: 'Specimen', default: 'In house', options: ['In house', 'Slides for review'] },
  { id: 'refHospital', label: 'Referring hospital', type: 'text', group: 'Specimen', default: '', showIf: REFERRAL },
  { id: 'refNumber', label: 'Referring laboratory number', type: 'text', group: 'Specimen', default: '', showIf: REFERRAL },
  { id: 'slidesHE', label: 'H&E slides', type: 'number', group: 'Specimen', default: '', min: 0, showIf: REFERRAL },
  { id: 'slidesIHC', label: 'Immunostained slides', type: 'number', group: 'Specimen', default: '', min: 0, showIf: REFERRAL },
  { id: 'slidesISH', label: 'In situ hybridisation slides', type: 'number', group: 'Specimen', default: '', min: 0, showIf: REFERRAL },
  { id: 'refBlocks', label: 'Paraffin blocks', type: 'number', group: 'Specimen', default: '', min: 0, showIf: REFERRAL },
  { id: 'refDate', label: 'Original specimen received on', type: 'text', group: 'Specimen', default: '', placeholder: 'dd/mm/yyyy', showIf: REFERRAL }
];

const macroscopy = [
  { id: 'fixation', label: 'Received', type: 'select', group: 'Macroscopy', default: 'Fresh', options: ['Fresh', 'In formalin'], showIf: IN_HOUSE },
  { id: 'freshFor', label: 'Fresh tissue taken for', type: 'multiselect', group: 'Macroscopy', default: [],
    options: ['Flow cytometry', 'Cytogenetics', 'Molecular studies', 'Touch imprints', 'Microbiology'], showIf: { all: [IN_HOUSE, { field: 'fixation', is: 'Fresh' }] } },
  { id: 'nodeCount', label: 'Lymph nodes', type: 'number', group: 'Macroscopy', default: '', min: 1, showIf: { all: [IN_HOUSE, NODE_EXCISION] },
    help: 'Blank is one lymph node.' },
  { id: 'size', label: 'Size (cm)', type: 'text', group: 'Macroscopy', default: '', placeholder: '2.5 x 2.0 x 1.5', showIf: { all: [IN_HOUSE, NOT_CORE] },
    help: 'The largest node when there are several.' },
  { id: 'cores', label: 'Cores', type: 'number', group: 'Macroscopy', default: '', min: 1, showIf: { all: [IN_HOUSE, CORE] } },
  { id: 'coreLength', label: 'Core length (mm)', type: 'text', group: 'Macroscopy', default: '', placeholder: '8 to 15', showIf: { all: [IN_HOUSE, CORE] } },
  { id: 'cutSurface', label: 'Cut surface', type: 'select', group: 'Macroscopy', default: 'Not described',
    options: ['Not described', 'Homogeneous, tan and fleshy', 'Nodular', 'With areas of necrosis', 'With fibrous bands'], showIf: { all: [IN_HOUSE, NOT_CORE] } },
  { id: 'embedded', label: 'Embedding', type: 'select', group: 'Macroscopy', default: 'All embedded', options: ['All embedded', 'Representative sections'],
    showIf: { all: [IN_HOUSE, NOT_CORE] } },
  { id: 'blocks', label: 'Blocks', type: 'number', group: 'Macroscopy', default: '', min: 1, showIf: IN_HOUSE },
  { id: 'blockKeyText', label: 'Block key', type: 'textarea', group: 'Macroscopy', default: '', placeholder: '1. Lymph node, serial slices', showIf: IN_HOUSE },
  { id: 'macroNotes', label: 'Additional macroscopy', type: 'text', group: 'Macroscopy', default: '', showIf: IN_HOUSE }
];

const LESION = dxIs(...LESIONAL);
const morphology = [
  { id: 'architecture', label: 'Nodal architecture', type: 'select', group: 'Morphology', default: 'Effaced', options: ['Effaced', 'Partially effaced', 'Preserved'] },
  { id: 'pattern', label: 'Growth pattern', type: 'select', group: 'Morphology', default: 'Diffuse',
    options: ['Diffuse', 'Follicular / nodular', 'Follicular and diffuse', 'Nodular with fibrous bands', 'Interfollicular', 'Paracortical', 'Sinusoidal'], showIf: LESION },
  { id: 'cellSize', label: 'Cell size', type: 'select', group: 'Morphology', default: 'Large',
    options: ['Small', 'Small to medium', 'Medium', 'Medium to large', 'Large', MIXED], showIf: LESION },
  { id: 'cytology', label: 'Cytology', type: 'multiselect', group: 'Morphology', default: [], options: CYTOLOGY, showIf: LESION },
  { id: 'background', label: 'Background cells', type: 'multiselect', group: 'Morphology', default: [], options: BACKGROUND_OPTIONS },
  { id: 'features', label: 'Other features', type: 'multiselect', group: 'Morphology', default: [], options: FEATURES },
  { id: 'morphNotes', label: 'Additional microscopy', type: 'textarea', group: 'Morphology', default: '' }
];

const diagnosisFields = [
  { id: 'dx', label: 'Diagnosis (WHO-HAEM5)', type: 'select', group: 'Diagnosis', default: DLBCL, options: DX_OPTIONS, optionGroups: DX_GROUPS },
  { id: 'dxOther', label: 'Diagnosis as typed', type: 'text', group: 'Diagnosis', default: '', showIf: dxIs(OTHER),
    help: 'Printed as typed, in capitals where you type them.' },
  { id: 'certainty', label: 'Certainty', type: 'select', group: 'Diagnosis', default: 'Diagnostic',
    options: ['Diagnostic', 'Consistent with', 'In keeping with', 'Suspicious for'], showIf: { field: 'dx', not: SELF_WORDED } },
  { id: 'recurrent', label: 'Recurrent', type: 'checkbox', group: 'Diagnosis', default: false, showIf: dxIs(...NEOPLASTIC.filter((d) => !SELF_WORDED.includes(d))) },
  { id: 'extent', label: 'Extent', type: 'select', group: 'Diagnosis', default: 'Not stated', options: ['Not stated', 'Partial involvement'],
    showIf: dxIs(...NEOPLASTIC.filter((d) => !SELF_WORDED.includes(d))) },
  { id: 'flGrade', label: 'Grade', type: 'select', group: 'Diagnosis', default: 'Not graded', options: ['Not graded', 'Grade 1', 'Grade 2', 'Grade 1-2', 'Grade 3A'],
    showIf: dxIs(FL), help: 'Optional in WHO-HAEM5; retained by the ICC. Follicular large B-cell lymphoma (formerly grade 3B) is its own entity.' },
  { id: 'flPattern', label: 'Pattern', type: 'select', group: 'Diagnosis', default: 'Not stated',
    options: ['Not stated', 'Follicular', 'Follicular and diffuse', 'Predominantly diffuse'], showIf: dxIs(FL) },
  { id: 'flDlbcl', label: 'With focal diffuse large B-cell lymphoma', type: 'checkbox', group: 'Diagnosis', default: false, showIf: dxIs(FL) },
  { id: 'chlSubtype', label: 'Subtype', type: 'select', group: 'Diagnosis', default: 'Not subtyped',
    options: ['Not subtyped', 'Nodular sclerosis', 'Mixed cellularity', 'Lymphocyte-rich', 'Lymphocyte-depleted'], showIf: dxIs(CHL) },
  { id: 'bnli', label: 'BNLI grade', type: 'select', group: 'Diagnosis', default: 'Not graded', options: ['Not graded', 'Grade 1', 'Grade 2'],
    showIf: { all: [dxIs(CHL), { field: 'chlSubtype', is: 'Nodular sclerosis' }] } },
  { id: 'reactivePattern', label: 'Reactive pattern', type: 'multiselect', group: 'Diagnosis', default: ['Follicular hyperplasia'],
    options: ['Follicular hyperplasia', 'Paracortical hyperplasia', 'Sinus histiocytosis'], showIf: dxIs('Reactive lymphoid hyperplasia') },
  { id: 'granulomaType', label: 'Granulomas', type: 'select', group: 'Diagnosis', default: 'Non-necrotising', options: ['Non-necrotising', 'Necrotising'],
    showIf: dxIs('Granulomatous lymphadenitis') }
];

const PANEL = (m) => ({ field: 'panel', is: m });
const ihc = [
  { id: 'panel', label: 'Immunohistochemistry panel', type: 'multiselect', group: 'Immunohistochemistry', default: [], options: MARKER_NAMES,
    help: 'Pick the markers done, then set a result for each. The panel prints in this order.' },
  ...MARKERS.map(([m]) => ({ id: resultField(m), label: m, type: 'select', group: 'Immunohistochemistry', default: 'Positive', options: RESULTS, showIf: PANEL(m) })),
  { id: 'mycPct', label: 'MYC (% of cells)', type: 'number', group: 'Immunohistochemistry', default: '', min: 0, max: 100, showIf: PANEL('MYC') },
  { id: 'bcl2Pct', label: 'BCL2 (% of cells)', type: 'number', group: 'Immunohistochemistry', default: '', min: 0, max: 100, showIf: PANEL('BCL2') },
  { id: 'ihcCells', label: 'Cells described', type: 'text', group: 'Immunohistochemistry', default: '', placeholder: 'atypical lymphoid cells',
    help: 'Blank: the atypical lymphoid cells, the Hodgkin and Reed-Sternberg cells for classic Hodgkin lymphoma, the LP cells for NLPHL.' },
  { id: 'ihcBackground', label: 'Background and other stains', type: 'textarea', group: 'Immunohistochemistry', default: '',
    placeholder: 'CD21 highlights expanded follicular dendritic cell meshworks. CD3 highlights the background T cells' },
  { id: 'ki67', label: 'Ki-67 (%)', type: 'number', group: 'Immunohistochemistry', default: '', min: 0, max: 100 },
  { id: 'cbCount', label: 'Centroblasts per HPF', type: 'number', group: 'Immunohistochemistry', default: '', min: 0, showIf: dxIs(FL) },
  { id: 'cbField', label: 'Field for the count', type: 'text', group: 'Immunohistochemistry', default: '', placeholder: '40x objective, 0.159 mm2', showIf: dxIs(FL) },
  { id: 'eber', label: 'EBER in situ hybridisation', type: 'select', group: 'Immunohistochemistry', default: 'Not performed',
    options: ['Not performed', 'Negative', 'Positive in the atypical cells', 'Scattered positive background cells'] },
  { id: 'coo', label: 'Cell of origin', type: 'select', group: 'Immunohistochemistry', default: 'Auto (Hans)',
    options: ['Auto (Hans)', 'GCB type', 'Non-GCB type', 'Not assessed'], showIf: dxIs(DLBCL),
    help: 'Auto reads CD10, BCL6 and MUM1 from the panel by the Hans algorithm.' }
];

const molecular = [
  { id: 'fishMYC', label: 'FISH: MYC', type: 'select', group: 'Molecular and flow cytometry', default: 'Not performed', options: FISH_RESULTS },
  { id: 'fishBCL2', label: 'FISH: BCL2', type: 'select', group: 'Molecular and flow cytometry', default: 'Not performed', options: FISH_RESULTS },
  { id: 'fishBCL6', label: 'FISH: BCL6', type: 'select', group: 'Molecular and flow cytometry', default: 'Not performed', options: FISH_RESULTS },
  { id: 'fishOther', label: 'Other FISH or molecular result', type: 'text', group: 'Molecular and flow cytometry', default: '', placeholder: 'IGH::CCND1 fusion detected' },
  { id: 'clonIG', label: 'IG clonality', type: 'select', group: 'Molecular and flow cytometry', default: 'Not performed', options: CLONALITY_RESULTS },
  { id: 'clonTR', label: 'TR clonality', type: 'select', group: 'Molecular and flow cytometry', default: 'Not performed', options: CLONALITY_RESULTS },
  { id: 'flow', label: 'Flow cytometry', type: 'select', group: 'Molecular and flow cytometry', default: 'Not performed',
    options: ['Not performed', 'Concordant', 'Not concordant', 'Pending'] },
  { id: 'flowRef', label: 'Flow cytometry reference', type: 'text', group: 'Molecular and flow cytometry', default: '',
    showIf: { field: 'flow', is: ['Concordant', 'Not concordant', 'Pending'] } },
  { id: 'flowText', label: 'Flow cytometry finding', type: 'text', group: 'Molecular and flow cytometry', default: '',
    placeholder: 'a kappa-restricted CD10-positive B-cell population', showIf: { field: 'flow', is: ['Concordant', 'Not concordant'] } }
];

// Intake. The lymph node role rule (src/intake.js roleOf) sends a node line here instead of to the
// lymph node form when the line, the case prefix or the clinical history meets `gate`, unless `exclude`
// names a sentinel node, a dissection, an aspirate or a frozen section. The site words let a line that
// says "lymphadenopathy" without "node" reach the form by score. Two-letter abbreviations (HL, FL, MCL)
// are left out of the gate: they mean other things on other request lines.
const LYMPHOMA_WORDS = '\\b(?:lymphomas?|lymphoproliferative|LPD|PTLD|Hodgkin\\w*|NHL|DLBCL|CLL|SLL|MALT\\w*|PTCL|AITL|ALCL|Burkitt\\w*|lymphoid\\s+neoplasm\\w*|atypical\\s+lymphoid|Kikuchi\\w*|Castleman\\w*)\\b';
// The clinical question, when the request writes it on the line ("Lymph node, left neck, excision ?lymphoma",
// "core biopsy (query lymphoma)", "excision r/o lymphoma"), is not part of the site: the site box keeps "Left neck".
const QUESTION_STRIP = `(?:\\?\\s*|\\b(?:query|r\\/o|rule\\s+out|to\\s+exclude|exclude|for|suspected|suspicious\\s+(?:of|for))\\s+)?${LYMPHOMA_WORDS}`
  + '(?:\\s+(?:disorders?|disease|work-?\\s*up))?|\\?';
const match = {
  site: ['lymph node', 'lymph nodes', 'LN', 'node', 'nodes', 'lymphadenopathy'],
  procedure: ['excision', 'excisional biopsy', 'incisional biopsy', 'core biopsy', 'core', 'cores', 'biopsy', 'biopsies', 'incision', 'trucut', 'tru-cut', 'slide review', 'slides for review'],
  clinical: ['lymphoma', 'lymphoproliferative', 'PTLD', 'Hodgkin', 'NHL', 'DLBCL', 'CLL', 'SLL', 'MALT', 'Burkitt', 'atypical lymphoid', 'Kikuchi', 'Castleman'],
  gate: LYMPHOMA_WORDS,
  exclude: ['sentinel', 'SLN', 'SLNB', 'dissection', 'lymphadenectomy', 'clearance', 'FNA', 'aspirate', 'aspiration', 'EBUS', 'TBNA', 'frozen', 'FS'],
  own: { site: ['lymph node', 'lymph nodes', 'LN', 'node', 'nodes', 'lymphadenopathy'], procedure: ['core biopsy', 'core', 'cores', 'biopsy', 'biopsies', 'incisional biopsy', 'excisional biopsy', 'trucut', 'tru-cut'] },
  bias: 1,
  fill: [
    { field: 'site', from: 'text',
      strip: '\\b(?:lymph\\s*nodes?|LNs?|nodes?|lymphadenopathy|excisional\\s+biops(?:y|ies)|incisional\\s+biops(?:y|ies)|core\\s+(?:needle\\s+)?biops(?:y|ies)|needle\\s+biops(?:y|ies)|tru-?cut(?:\\s+biops(?:y|ies))?|excision|incision|biops(?:y|ies)|cores?|for\\s+slides?\\s+review|slides?\\s+for\\s+review|slides?\\s+review|for\\s+review|x\\s*\\d+)\\b'
        + `|${QUESTION_STRIP}` },
    { field: 'procedure', from: 'map', map: [['\\bcores?\\b|tru-?cut', 'Core biopsy'], ['\\bexcisional', 'Excisional biopsy'], ['\\bincisional|\\bincision\\b', 'Incisional biopsy'], ['\\bexcision', 'Excision'], ['\\bbiops', 'Biopsy']] },
    { field: 'received', from: 'map', map: [['slides?\\s+(?:for\\s+)?review|for\\s+(?:slide\\s+)?review|consultation', 'Slides for review']] }
  ]
};

const schema = {
  id: 'lymphoma_node',
  version: '2026.10',
  name: 'Lymph node for lymphoma (WHO-HAEM5)',
  shortName: 'Lymph node · lymphoma work-up',
  label: 'Lymphoma',
  organ: 'LYMPH NODE',
  system: 'Lymphoid',
  kind: 'cancer resection',
  rank: 22,
  aliases: ['lymphoma', 'NHL', 'Hodgkin', 'DLBCL', 'follicular lymphoma', 'PTLD', 'lymphoproliferative'],
  match,
  specimenNoun: 'specimen',
  maxParts: 6,
  defaultParts: 1,
  generator: 'lymphoma_node',
  style: { british: true },
  source: {
    template: 'n.a. (no QMH page)',
    name: 'WHO Classification of Haematolymphoid Tumours, 5th edition (WHO-HAEM5); International Consensus Classification (2022)',
    staging: 'None. Lymphoma is not staged by AJCC TNM.'
  },
  caseFields: [],
  options: [
    { $use: 'includeHeader' },
    { id: 'macro', label: 'Generate the macroscopic description and block key', type: 'checkbox', default: true },
    { id: 'ihcList', label: 'List the immunohistochemistry panel marker by marker under the microscopy', type: 'checkbox', default: true }
  ],
  partDefaults: [],
  fields: [...specimen, ...macroscopy, ...morphology, ...diagnosisFields, ...ihc, ...molecular],
  snippets: [
    { id: 'lymphoma_dual_expressor', label: 'MYC and BCL2 dual expression', auto: { flag: 'dualExpressor' },
      text: 'The lymphoma cells ({parts}) co-express MYC and BCL2 by immunohistochemistry (dual expressor).' },
    { id: 'lymphoma_pending', label: 'Further studies pending', auto: { flag: 'studiesPending' },
      text: 'Further studies ({parts}) are in progress; a supplementary report will follow.' }
  ],
  example: {
    caseTitle: '',
    options: { includeHeader: false, macro: true, ihcList: true },
    parts: [{ label: 'A', values: {
      site: 'left neck', procedure: 'Excision', received: 'In house', fixation: 'Fresh', freshFor: ['Flow cytometry', 'Cytogenetics'],
      size: '3.2 x 2.5 x 1.8', cutSurface: 'Homogeneous, tan and fleshy', embedded: 'All embedded', blocks: '3',
      blockKeyText: '1-3. Lymph node, serial slices',
      architecture: 'Effaced', pattern: 'Diffuse', cellSize: 'Large', cytology: ['Vesicular nuclei with prominent nucleoli'],
      background: ['Small lymphocytes', 'Histiocytes'], features: ['Frequent mitoses'],
      dx: DLBCL, certainty: 'Diagnostic',
      panel: ['CD20', 'PAX5', 'CD10', 'BCL6', 'MUM1', 'BCL2', 'MYC', 'CD3', 'CD5', 'Cyclin D1', 'CD30'],
      r_CD20: 'Positive', r_PAX5: 'Positive', r_CD10: 'Negative', r_BCL6: 'Positive', r_MUM1: 'Positive', r_BCL2: 'Positive', r_MYC: 'Positive',
      r_CD3: 'Negative', r_CD5: 'Negative', r_CyclinD1: 'Negative', r_CD30: 'Negative',
      mycPct: '50', bcl2Pct: '80', ki67: '80', eber: 'Negative', coo: 'Auto (Hans)',
      fishMYC: 'Not rearranged', fishBCL2: 'Not rearranged', fishBCL6: 'Pending', flow: 'Concordant', flowText: 'a monotypic lambda-restricted B-cell population'
    } }]
  }
};

writeFileSync(new URL('../schemas/lymphoma_node.json', import.meta.url), `${JSON.stringify(schema, null, 2)}\n`);
console.log(`schemas/lymphoma_node.json written (${schema.fields.length} fields)`);
