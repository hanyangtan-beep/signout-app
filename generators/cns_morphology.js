// Shared CNS morphology vocabulary.
//
// Extracted from generators/cns_biopsy.js so that the biopsy template and the glioma /
// ependymoma resection template (generators/cns_tumour.js) describe the same tumour with the
// same words: a glioblastoma smeared at biopsy and the same glioblastoma resected a week later
// must not read as two different lesions. Nothing here is template-specific; the callers decide
// which sentences they print and in what order.
//
// Printed register: released-report prose describing what is seen down the microscope. Grounding
// and source URLs live in comments only (docs/reference/cns_biopsy-morphology.md,
// docs/reference/cns_tumour-morphology.md), never in the printed sentence.

export const uc1 = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
// Acronyms keep their capitals: "GFAP positive" must not become "gFAP positive".
export const lc1 = (s) => (/^[A-Z][A-Z0-9]/.test(String(s || '')) ? String(s || '') : String(s || '').charAt(0).toLowerCase() + String(s || '').slice(1));
export const num = (x) => (x === '' || x === null || x === undefined || Number.isNaN(Number(x)) ? null : Number(x));
export const arr = (x) => (Array.isArray(x) ? x.filter(Boolean) : []);
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const word = (n) => (n >= 0 && n <= 10 ? WORDS[n] : String(n));
export const list = (items) => {
  const l = items.filter(Boolean);
  if (l.length <= 1) return l[0] || '';
  return `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}`;
};

// ---------- finding families ----------

export const MENINGIOMA = 'Meningioma';
export const ASTRO = 'Astrocytoma, IDH-mutant';
export const OLIGO = 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted';
export const GBM = 'Glioblastoma, IDH-wildtype';
export const DMG = 'Diffuse midline glioma, H3 K27-altered';
export const PILOCYTIC = 'Pilocytic astrocytoma';
export const EPENDYMOMA = 'Ependymoma';
export const PITNET = 'Pituitary neuroendocrine tumour (PitNET)';
export const SCHWANNOMA = 'Schwannoma';
export const METASTASIS = 'Metastatic malignancy';
export const LYMPHOMA = 'Lymphoma';
export const ABSCESS = 'Abscess / acute inflammation';
export const DEMYELINATION = 'Demyelinating lesion';
export const GLIOSIS = 'Gliosis, no tumour identified';
export const FREETEXT = 'Other (free text)';

export const MENINGIOMA_SUBTYPE = {
  Meningothelial: 'lobules of syncytial cells with indistinct borders, eosinophilic cytoplasm and oval nuclei containing intranuclear pseudoinclusions',
  Fibrous: 'intersecting fascicles of spindle cells set in a collagenous matrix',
  Transitional: 'lobules, whorls and fascicles, with scattered psammoma bodies',
  Psammomatous: 'whorls of bland meningothelial cells around abundant psammoma bodies',
  Angiomatous: 'sheets of meningothelial cells among numerous small and medium-sized vessels with hyalinised walls',
  Microcystic: 'stellate cells with long processes enclosing microcysts in a loose mucoid background',
  Secretory: 'meningothelial whorls containing intracytoplasmic eosinophilic hyaline inclusions',
  'Lymphoplasmacyte-rich': 'meningothelial whorls obscured by a dense lymphoplasmacytic infiltrate',
  Metaplastic: 'meningothelial whorls with foci of adipose and osseous metaplasia',
  Chordoid: 'cords and trabeculae of eosinophilic vacuolated cells in a myxoid matrix',
  'Clear cell': 'sheets of clear glycogen-rich cells with blocky perivascular and interstitial collagen',
  Atypical: 'sheets and whorls of meningothelial cells with increased cellularity',
  Papillary: 'meningothelial cells in a perivascular pseudopapillary arrangement',
  Rhabdoid: 'sheets of cells with eccentric nuclei and eosinophilic paranuclear cytoplasmic inclusions'
};

export const BASE_MORPHOLOGY = {
  [ASTRO]: 'a diffusely infiltrating astrocytic neoplasm in which atypical glial cells with elongated hyperchromatic nuclei permeate the cortex and white matter',
  [OLIGO]: 'a diffusely infiltrating glial neoplasm composed of cells with uniform rounded nuclei and perinuclear haloes set in a delicate branching capillary network',
  [GBM]: 'a diffusely infiltrating, hypercellular astrocytic neoplasm with marked nuclear pleomorphism and hyperchromasia',
  [DMG]: 'a diffusely infiltrating glial neoplasm composed of small to medium-sized cells with hyperchromatic angulated nuclei',
  [PILOCYTIC]: 'a biphasic glial neoplasm in which compact piloid areas containing Rosenthal fibres alternate with loose microcystic areas containing eosinophilic granular bodies',
  [EPENDYMOMA]: 'a glial neoplasm forming perivascular pseudorosettes, the cells having monomorphic round nuclei and fibrillary processes radiating on to the vessel walls',
  [PITNET]: 'a monotonous population of epithelial cells arranged in sheets and nests around a delicate vascular network, without the acinar architecture of the anterior pituitary',
  [SCHWANNOMA]: 'a spindle cell neoplasm with alternating compact and loose areas, nuclear palisading forming Verocay bodies, and thick-walled hyalinised vessels',
  [LYMPHOMA]: 'sheets of large atypical lymphoid cells with vesicular nuclei and prominent nucleoli, disposed around and within vessel walls, in a background of reactive astrocytosis',
  [ABSCESS]: 'brain parenchyma with a dense neutrophilic infiltrate and necrotic debris, rimmed by granulation tissue and reactive astrocytes',
  [DEMYELINATION]: 'a well-demarcated area of myelin loss occupied by sheets of foamy macrophages, with relative preservation of axons and scattered reactive astrocytes',
  [GLIOSIS]: 'brain parenchyma with reactive astrocytosis and a scattered macrophage infiltrate'
};

export const METASTASIS_MORPHOLOGY = {
  Adenocarcinoma: 'infiltrated by a metastatic adenocarcinoma forming glands and solid nests with a sharp interface against the surrounding gliotic brain',
  'Squamous cell carcinoma': 'infiltrated by a metastatic squamous cell carcinoma forming nests with keratinisation and intercellular bridges, with a sharp interface against the surrounding gliotic brain',
  'Small cell carcinoma': 'infiltrated by a metastatic carcinoma composed of small cells with scant cytoplasm, nuclear moulding and brisk mitotic activity, with extensive necrosis',
  Melanoma: 'infiltrated by a metastatic malignant neoplasm composed of epithelioid cells with prominent nucleoli and intracytoplasmic brown pigment',
  'Renal cell carcinoma': 'infiltrated by a metastatic carcinoma composed of clear cells in nests separated by delicate sinusoidal vessels',
  'Carcinoma, not further classifiable': 'infiltrated by a metastatic carcinoma forming solid nests with a sharp interface against the surrounding gliotic brain'
};

export const FEATURE_PHRASE = {
  'Increased cellularity': 'increased cellularity',
  'Nuclear atypia': 'nuclear atypia',
  Mitoses: 'mitotic activity',
  'Microvascular proliferation': 'microvascular proliferation',
  'Necrosis with pseudopalisading': 'necrosis rimmed by pseudopalisading tumour cells',
  'Necrosis without pseudopalisading': 'necrosis',
  'Infiltration of cortex with perineuronal satellitosis': 'infiltration of the cortex with perineuronal satellitosis',
  'Rounded nuclei with perinuclear haloes': 'rounded nuclei with perinuclear haloes',
  'Delicate branching capillary network': 'a delicate branching capillary network',
  Microcalcification: 'microcalcification',
  'Perivascular pseudorosettes': 'perivascular pseudorosettes',
  'Biphasic pattern with Rosenthal fibres and eosinophilic granular bodies': 'a biphasic pattern with Rosenthal fibres and eosinophilic granular bodies',
  // Added for the resection template (generators/cns_tumour.js); the biopsy template does not
  // offer these options, so its fixtures are unaffected.
  'True ependymal rosettes': 'true ependymal rosettes',
  'Biphasic pattern with Rosenthal fibres': 'a biphasic pattern with Rosenthal fibres',
  'Eosinophilic granular bodies': 'eosinophilic granular bodies',
  'Gemistocytic change': 'gemistocytic change',
  'Multinucleated giant cells': 'multinucleated giant cells',
  'Sarcomatous spindle cell component': 'a sarcomatous spindle cell component',
  'Infiltration of adjacent cortex': 'infiltration of the adjacent cortex',
  'Secondary structures of Scherer': 'secondary structures of Scherer'
};

export const ATYPICAL_PHRASE = {
  'High cellularity': 'high cellularity',
  'Small cell change': 'small cell change',
  'Prominent nucleoli': 'prominent nucleoli',
  'Sheet-like growth': 'sheet-like growth',
  'Spontaneous necrosis': 'foci of spontaneous necrosis'
};

export const MOLECULAR_PHRASE = {
  'IDH1 or IDH2 mutation detected': 'an IDH mutation is detected',
  'IDH wild-type': 'IDH1 and IDH2 are wild-type',
  '1p/19q codeletion': 'there is codeletion of 1p and 19q',
  '1p/19q retained': '1p and 19q are retained',
  'CDKN2A/B homozygous deletion detected': 'there is homozygous deletion of CDKN2A/B',
  'TERT promoter mutation detected': 'a TERT promoter mutation is detected',
  'TERT promoter wild-type': 'the TERT promoter is wild-type',
  'No CDKN2A/B homozygous deletion': 'there is no homozygous deletion of CDKN2A/B',
  'EGFR amplification detected': 'EGFR is amplified',
  'Combined gain of chromosome 7 and loss of chromosome 10': 'there is combined gain of chromosome 7 and loss of chromosome 10',
  'H3 K27M mutation detected': 'an H3 K27M mutation is detected',
  'MGMT promoter methylated': 'the MGMT promoter is methylated',
  'MGMT promoter unmethylated': 'the MGMT promoter is unmethylated',
  'BRAF fusion detected': 'a BRAF fusion is detected'
};

