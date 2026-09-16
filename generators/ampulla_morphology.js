// Shared microscopic morphology vocabulary for the ampullary carcinoma synoptic template.
//
// Descriptions follow the WHO Classification of Tumours: Digestive System Tumours, 5th ed (2019)
// ampullary chapter as reflected in the CAP protocol Ampulla of Vater v4.3.0.0 histologic-type
// list (https://www.cap.org/wp-content/uploads/documents/New-Cancer-Protocols-June-2025/Ampulla_4.3.0.0.REL_CAPCP.pdf)
// and the expert-authored subtype descriptions on Pathology Outlines
// (ampullacarcinoma.html, ampullaIAPN.html, ampullaadenoma.html) together with the
// pancreatobiliary- versus intestinal-type contrast set out in the Arch Pathol Lab Med review of
// the eighth-edition ampullary chapter
// (https://meridian.allenpress.com/aplm/article/145/5/543/442292/).
//
// REPORT REGISTER: every sentence below is released-report prose describing only what is seen
// down the microscope. No WHO citation, no "by definition", no exclusion logic, no percentage
// thresholds, no sampling advice, no prognostic or epidemiological commentary. The grounding
// lives in these comments; the strings print.
//
// British spelling throughout.

/** typeName -> (grade) => sentence ('' when nothing useful can be said). */
export const MORPHOLOGY = {
  // Pancreaticobiliary type: simple angulated glands in desmoplastic stroma, single layer of
  // cuboidal to low columnar cells, round nuclei with prominent nucleoli, no pseudostratification.
  'Adenocarcinoma, pancreaticobiliary-type': () => 'Simple angulated glands and small cell clusters lined by a single layer of cuboidal to low columnar cells are set in desmoplastic stroma, the nuclei round with prominent nucleoli and without pseudostratification.',
  // Intestinal type: resembles colorectal adenocarcinoma — tall columnar cells, elongated
  // pseudostratified nuclei, cribriform glands with dirty luminal necrosis.
  'Adenocarcinoma, intestinal-type': () => 'Cribriform and tubular glands are lined by tall columnar cells with elongated pseudostratified nuclei and contain luminal necrotic debris, resembling colorectal-type adenocarcinoma.',
  'Adenocarcinoma with mixed features (pancreaticobiliary- and intestinal-type)': () => 'Both patterns are present: angulated simple glands lined by cuboidal cells with round nuclei in desmoplastic stroma, alongside cribriform glands of tall columnar cells with pseudostratified nuclei and luminal debris.',
  'Adenocarcinoma, NOS': () => 'Infiltrating malignant glands are set in desmoplastic stroma without a consistent pancreaticobiliary or intestinal pattern.',
  // IAPN-associated: exophytic intra-ampullary mass of papillae and tubules with dysplastic
  // epithelium, with an invasive component beneath it.
  'Adenocarcinoma arising in intra-ampullary papillary-tubular neoplasm (IAPN)': () => 'The invasive carcinoma lies beneath an exophytic intra-ampullary proliferation of papillae and compact tubules lined by dysplastic epithelium overlying fibrovascular cores.',
  'Mucinous adenocarcinoma': () => 'Pools of extracellular mucin contain strips, glands and clusters of neoplastic columnar epithelium floating within the mucin.',
  'Poorly cohesive carcinoma': () => 'Discohesive tumour cells infiltrate singly and in cords without forming glands.',
  'Signet-ring cell carcinoma': () => 'The tumour is composed predominantly of discohesive signet-ring cells with intracytoplasmic mucin displacing the nucleus to the periphery.',
  'Medullary carcinoma': () => 'Syncytial sheets of poorly differentiated cells with vesicular nuclei and prominent nucleoli form a pushing border with a dense intratumoural lymphocytic infiltrate.',
  'Adenosquamous carcinoma': () => 'Malignant glandular and squamous components coexist, the squamous component showing keratinisation and intercellular bridges.',
  'Large cell neuroendocrine carcinoma': () => 'Organoid nests and trabeculae of large cells with moderate cytoplasm, vesicular nuclei and prominent nucleoli show brisk mitotic activity and geographic necrosis.',
  'Small cell neuroendocrine carcinoma': () => 'Sheets of small cells with scant cytoplasm, finely granular chromatin, nuclear moulding and inconspicuous nucleoli show brisk mitotic activity and extensive necrosis.',
  'Undifferentiated carcinoma, NOS': () => 'The tumour grows as sheets and cords of markedly pleomorphic cells with no gland formation, brisk mitotic activity and necrosis.',
  'Mixed neuroendocrine-non-neuroendocrine neoplasm (MiNEN) (specify components)': () => 'Two distinct components are present, one glandular and the other showing organoid neuroendocrine architecture, each forming a discrete part of the tumour.',
  'Carcinoma, NOS': () => ''
};

export function typeMorphology(typeName, grade) {
  const f = MORPHOLOGY[typeName];
  return f ? f(grade || '') : '';
}

/**
 * The subtype panel. Pancreaticobiliary-type ampullary carcinoma is typically CK7 positive,
 * MUC1 positive, CDX2 and MUC2 negative; intestinal-type is CDX2 and MUC2 positive with CK20
 * positivity and MUC1 negative. Only the result is printed — the interpretation belongs to the
 * histologic-type element, which the pathologist sets.
 */
export const SUBTYPE_PANEL = ['CK7', 'CK20', 'CDX2', 'MUC1', 'MUC2'];

export const IHC_PHRASE = {
  'CK7 positive': 'CK7',
  'CK7 negative': 'CK7 negative',
  'CK20 positive': 'CK20',
  'CK20 negative': 'CK20 negative',
  'CDX2 positive': 'CDX2',
  'CDX2 negative': 'CDX2 negative',
  'MUC1 positive': 'MUC1',
  'MUC1 negative': 'MUC1 negative',
  'MUC2 positive': 'MUC2',
  'MUC2 negative': 'MUC2 negative',
  'Chromogranin positive': 'chromogranin',
  'Synaptophysin positive': 'synaptophysin'
};
