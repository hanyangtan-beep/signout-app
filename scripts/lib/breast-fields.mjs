// Shared field blocks for the breast schema build scripts (breast_carcinoma, breast_dcis, phyllodes).
// The wording is the QMH BREAST-* pages'; see docs/specs/breast-pair.md.
export const when = (field, is) => ({ showIf: { field, is } });

export const MARGIN_HELP = 'One face per line, "Face: value". Value = distance in mm (uninvolved, closest distance), "involved", "cannot" (cannot be assessed) or ">10" (uninvolved, greater than 10 mm). "All: >5" fills the six faces. Faces: Anterior, Posterior, Superior, Inferior, Medial, Lateral, Other (name).';
export const MARGIN_DEFAULT = 'Anterior: \nPosterior: \nSuperior: \nInferior: \nMedial: \nLateral: ';

/** Procedure, laterality, site, specimen measurements, tumour size, macro fields, block key and other parts. */
export function specimenFields(G, { tumourWord = 'invasive carcinoma', sizeModes = null, sizeHelp = null } = {}) {
  const F = [
  // ---- Specimen and tumour (house section; QMH gross elements) ----
  { id: 'procedure', label: 'Procedure', type: 'select', group: G.spec,
    options: ['Excision (less than total mastectomy)', 'Total mastectomy (including nipple-sparing and skin-sparing mastectomy)', 'Other (specify)', 'Not specified'],
    default: 'Total mastectomy (including nipple-sparing and skin-sparing mastectomy)' },
  { id: 'procedureOther', label: 'Procedure (specify)', type: 'text', group: G.spec, placeholder: 'modified radical mastectomy', default: '', ...when('procedure', 'Other (specify)') },
  { id: 'laterality', label: 'Specimen laterality', type: 'select', group: G.spec, options: ['Right', 'Left', 'Not specified'], default: 'Left' },
  { id: 'tumourSite', label: 'Tumour site', type: 'multiselect', group: G.spec,
    options: ['Upper outer quadrant', 'Lower outer quadrant', 'Upper inner quadrant', 'Lower inner quadrant', 'Central', 'Nipple', 'Position (specify)', 'Other (specify)', 'Not specified'],
    default: ['Upper outer quadrant'] },
  { id: 'sitePosition', label: "Position (o'clock, distance from nipple)", type: 'text', group: G.spec, placeholder: "2 o'clock, 3 cm from the nipple", default: '' },
  { id: 'specimenDims', label: 'Specimen size (mm x mm x mm)', type: 'text', group: G.spec, placeholder: '190 x 160 x 45', default: '' },
  { id: 'weight', label: 'Specimen weight (g)', type: 'number', group: G.spec, placeholder: '520', default: '' },
  { id: 'skinEllipse', label: 'Skin ellipse (mm x mm)', type: 'text', group: G.spec, placeholder: '170 x 60', default: '' },
  { id: 'sizeMode', label: 'Tumour size', type: 'select', group: G.spec,
    options: ['Greatest dimension', 'Microinvasion only', 'No residual carcinoma', 'Cannot be determined'],
    optionLabels: { 'Greatest dimension': 'Greatest dimension (mm)', 'Microinvasion only': 'Microinvasion only (< or = 1 mm)', 'Cannot be determined': 'Cannot be determined (explain)' },
    default: 'Greatest dimension', help: 'Largest contiguous invasive focus; DCIS and satellites more than 5 mm apart are excluded. Drives pT.' },
  { id: 'sizeMm', label: 'Greatest dimension of the invasive carcinoma (mm)', type: 'number', group: G.spec, placeholder: '23', default: '', ...when('sizeMode', ['Greatest dimension', 'Microinvasion only']) },
  { id: 'tumourDims', label: 'All dimensions (mm x mm x mm)', type: 'text', group: G.spec, placeholder: '23 x 20 x 18', default: '', ...when('sizeMode', 'Greatest dimension') },
  { id: 'sizeCannot', label: 'Size cannot be determined (explain)', type: 'text', group: G.spec, default: '', ...when('sizeMode', 'Cannot be determined') },
  { id: 'cutSurface', label: 'Cut surface (macro)', type: 'multiselect', group: G.spec,
    options: ['Firm', 'Grey-white', 'Tan', 'Ill-defined / stellate', 'Well-circumscribed', 'Gritty', 'Necrosis', 'Haemorrhage', 'Mucoid'], default: ['Firm', 'Grey-white', 'Ill-defined / stellate'] },
  { id: 'closestGrossMm', label: 'Closest gross margin (mm) and face', type: 'text', group: G.spec, placeholder: '5, posterior', default: '' },
  { id: 'otherMacro', label: 'Other macroscopic findings', type: 'text', group: G.spec, placeholder: 'A previous biopsy cavity is present 10 mm from the tumour', default: '' },
  { id: 'blockKeyText', label: 'Block key (one block or range per line)', type: 'textarea', group: G.spec,
    placeholder: '1-4 tumour with closest posterior margin\n5 nipple\n6-9 anterior, superior, inferior, medial and lateral margins\n10-11 background breast', default: '' },
  { id: 'otherParts', label: 'Other parts (one per line: "C) Axillary contents, dissection - negative 0/12")', type: 'textarea', group: G.spec,
    placeholder: 'C) Axillary lymph nodes, dissection - metastatic 2/14', default: '',
    help: 'Nodes from a separately labelled axillary dissection are still counted in the Regional lymph nodes block; type the counts there too.' },
  ];
  if (tumourWord !== 'invasive carcinoma') {
    for (const f of F) {
      if (f.id === 'sizeMm') f.label = `Greatest dimension of the ${tumourWord} (mm)`;
      if (f.id === 'sizeMode') {
        f.options = sizeModes || ['Greatest dimension', 'Cannot be determined'];
        f.optionLabels = Object.fromEntries(Object.entries(f.optionLabels).filter(([k]) => f.options.includes(k)));
        if (sizeHelp) f.help = sizeHelp;
      }
      if (f.id === 'sizeMm' || f.id === 'tumourDims') f.showIf = { field: 'sizeMode', is: 'Greatest dimension' };
    }
  }
  return F;
}

/** Regional lymph node block (QMH order) - shared by invasive carcinoma and DCIS; phyllodes uses a simple pair. */
export function nodeFields(G) {
  return [
  // ---- Regional lymph nodes and distant metastasis ----
  { id: 'nodeSampling', label: 'Regional lymph nodes', type: 'select', group: G.nodes,
    options: ['No nodes submitted', 'Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection'], default: 'Sentinel node biopsy only',
    help: '"Sentinel node biopsy only" with 5 or fewer nodes examined adds the (sn) modifier.' },
  { id: 'nodesExamined', label: 'Number of regional lymph nodes examined', type: 'number', group: G.nodes, default: '', min: 0, ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'nodesSentinel', label: 'Number of sentinel lymph nodes examined', type: 'number', group: G.nodes, default: '', min: 0, ...when('nodeSampling', ['Sentinel node biopsy only', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'nodesMacro', label: 'Number of lymph nodes with macrometastasis (>2 mm)', type: 'number', group: G.nodes, default: '0', min: 0, ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'nodesMicro', label: 'Number of lymph nodes with micrometastasis (> 0.2 to 2 mm and/or > 200 cells)', type: 'number', group: G.nodes, default: '0', min: 0, ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'nodesItc', label: 'Number of lymph nodes with isolated tumour cells (0.2 mm or less and 200 cells or fewer)', type: 'number', group: G.nodes, default: '0', min: 0, ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'nodeMolPos', label: 'Positive molecular findings (RT-PCR) with no ITCs detected (pN0(mol+))', type: 'checkbox', group: G.nodes, default: false, ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'depositMm', label: 'Size of largest metastatic deposit (mm)', type: 'number', group: G.nodes, default: '', ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'depositSite', label: 'Largest deposit: site', type: 'text', group: G.nodes, placeholder: 'sentinel lymph node 1', default: '', ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'largestNodeMm', label: 'Size of largest lymph node involved (mm)', type: 'number', group: G.nodes, default: '', ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'largestNodeSite', label: 'Largest involved node: site', type: 'text', group: G.nodes, default: '', ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'ene', label: 'Extranodal extension', type: 'select', group: G.nodes, options: ['Not identified', 'Present', 'Cannot be determined'], default: 'Not identified', ...when('nodeSampling', ['Sentinel node biopsy only', 'Axillary dissection', 'Sentinel node biopsy and axillary dissection']) },
  { id: 'eneExtent', label: 'ENE extent (number 2 mm or less, number greater than 2 mm)', type: 'text', group: G.nodes, placeholder: '1 node, greater than 2 mm', default: '', ...when('ene', 'Present') },
  { id: 'imNodes', label: 'Internal mammary nodes', type: 'select', group: G.nodes, options: ['Not submitted', 'Negative', 'Positive (sentinel, microscopic)', 'Positive (clinically detected)'], default: 'Not submitted' },
  { id: 'infraclavicular', label: 'Infraclavicular (level III) node metastasis', type: 'checkbox', group: G.nodes, default: false },
  { id: 'supraclavicular', label: 'Ipsilateral supraclavicular node metastasis', type: 'checkbox', group: G.nodes, default: false },
  ];
}

/** Distant metastasis triplet. */
export function metsFields(G) {
  return [
  { id: 'distantMets', label: 'Distant metastasis', type: 'select', group: G.nodes, options: ['Not applicable', 'Not identified', 'Present', 'Cannot be determined'], default: 'Not applicable' },
  { id: 'distantSites', label: 'Distant metastasis: site(s)', type: 'multiselect', group: G.nodes, options: ['Non-regional lymph node(s)', 'Lung', 'Liver', 'Bone', 'Brain', 'Other (specify)'], default: [], ...when('distantMets', 'Present') },
  { id: 'distantDetail', label: 'Distant metastasis (specify / case number)', type: 'text', group: G.nodes, default: '', ...when('distantMets', ['Present', 'Cannot be determined']) },
  ];
}

/** Recurrent descriptor and pTNM override. */
export function stageFields(G) {
  return [
  // ---- Stage and other findings ----
  { id: 'recurrent', label: 'Recurrent tumour (r descriptor)', type: 'checkbox', group: G.stage, default: false },
  { id: 'tnmOverride', label: 'pTNM override (blank = derived)', type: 'text', group: G.stage, placeholder: 'pT2 pN1a', default: '', help: 'Type the categories to print instead of the derived ones; the derived values stay visible in brackets.' },
  { id: 'tnmOverrideReason', label: 'Override reason', type: 'text', group: G.stage, default: '', showIf: { field: 'tnmOverride', truthy: true } },
  ];
}
