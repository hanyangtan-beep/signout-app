// Shared microscopic morphology vocabulary for the pancreatic carcinoma synoptic template.
//
// Descriptions follow the WHO Classification of Tumours: Digestive System Tumours, 5th ed (2019)
// pancreas chapter as reflected in the CAP protocol Pancreas (Exocrine) v4.3.0.0 histologic-type
// list (https://documents.cap.org/documents/New-Cancer-Protocols-June-2025/Panc.Exo_4.3.0.0.REL_CAPCP.pdf)
// and in the expert-authored subtype descriptions on Pathology Outlines
// (pancreasductal.html, pancreascolloid.html, pancreasmedullary.html, pancreasadenosquamous.html,
// pancreasundifferentiated.html, pancreasacinar.html, pancreaspancreatoblastoma.html,
// pancreasspn.html, pancreasIPMN.html, pancreasMCN.html, pancreasITPN.html).
//
// REPORT REGISTER: every sentence below is released-report prose describing only what is seen
// down the microscope. No WHO citation, no "by definition", no exclusion logic, no percentage
// thresholds, no sampling advice, no prognostic or epidemiological commentary. The grounding
// lives in these comments; the strings print.
//
// British spelling throughout; sentences slot after the derived opener in the
// "Tumour histology" paragraph.

/** typeName -> (grade) => sentence ('' when nothing useful can be said). */
export const MORPHOLOGY = {
  // Ductal adenocarcinoma: haphazardly arranged, variably sized infiltrating glands with
  // incomplete lumina and luminal necrotic debris, set in abundant desmoplastic stroma; the
  // glands sit next to muscular vessels and nerves, and the nuclear variation within a single
  // gland is the most reliable feature. Grade modifies how well the glands are formed.
  'Ductal adenocarcinoma, NOS': (grade) => {
    const base = 'Haphazardly arranged infiltrating glands with incomplete lumina and luminal necrotic debris are set in abundant desmoplastic stroma, lying immediately adjacent to muscular vessels and nerves, and show marked variation in nuclear size within individual glands.';
    if (/^G1/.test(grade || '')) return `${base} The glands are well formed and lined by columnar mucin-containing cells.`;
    if (/^G3/.test(grade || '')) return `${base} Gland formation is poor, with irregular cords, small clusters and single infiltrating cells and widespread nuclear pleomorphism.`;
    return base;
  },
  // Colloid (mucinous non-cystic) carcinoma: large stromal mucin pools containing suspended
  // strips and clusters of well-differentiated neoplastic epithelium; almost always arises in
  // an IPMN, usually intestinal type.
  'Colloid carcinoma (mucinous carcinoma)': () => 'Large pools of stromal mucin contain suspended strips, clusters and detached glands of neoplastic columnar epithelium.',
  // Poorly cohesive / signet-ring: discohesive infiltration without gland formation.
  'Poorly cohesive carcinoma': () => 'Discohesive tumour cells infiltrate singly and in cords through desmoplastic stroma without forming glands.',
  'Signet-ring carcinoma': () => 'The tumour is composed predominantly of discohesive signet-ring cells with intracytoplasmic mucin displacing the nucleus to the periphery.',
  // IPMN with associated invasive carcinoma: dilated ducts lined by papillary mucinous
  // epithelium with an invasive component arising from it.
  'Intraductal papillary mucinous neoplasm with associated invasive carcinoma': () => 'The invasive carcinoma arises in association with dilated ducts lined by papillary and tufted mucinous epithelium with fibrovascular cores.',
  'Intraductal oncocytic papillary neoplasm with associated invasive carcinoma': () => 'The invasive carcinoma arises in association with an intraductal proliferation of arborising papillae lined by several layers of cells with abundant granular eosinophilic cytoplasm and intraepithelial lumina.',
  'Intraductal tubulopapillary neoplasm with associated invasive carcinoma': () => 'The invasive carcinoma arises in association with an intraductal nodular proliferation of back-to-back tubules lined by cuboidal cells without appreciable cytoplasmic mucin, with foci of necrosis.',
  'Mucinous cystic neoplasm with associated invasive carcinoma': () => 'The invasive carcinoma arises in a multiloculated mucinous cystic lesion lined by mucinous epithelium overlying densely cellular ovarian-type subepithelial stroma.',
  // Medullary carcinoma: syncytial sheets, pushing border, prominent lymphocytic infiltrate.
  'Medullary carcinoma': () => 'Syncytial sheets of poorly differentiated tumour cells with vesicular nuclei and prominent nucleoli form a pushing border, accompanied by a dense intratumoural lymphocytic infiltrate and little desmoplasia.',
  'Adenosquamous carcinoma': () => 'Malignant glandular and squamous components coexist, the squamous component showing keratinisation and intercellular bridges.',
  'Hepatoid carcinoma': () => 'Sheets and trabeculae of polygonal cells with abundant granular eosinophilic cytoplasm and central round nuclei resemble hepatocytes, with intervening sinusoid-like vessels.',
  'Large cell carcinoma with rhabdoid phenotype': () => 'Sheets of discohesive large cells with eccentric nuclei, prominent nucleoli and abundant eosinophilic cytoplasm containing paranuclear hyaline inclusions.',
  'Undifferentiated carcinoma, NOS': () => 'The tumour grows as sheets and cords of markedly pleomorphic cells with no gland formation, brisk mitotic activity and extensive necrosis.',
  'Undifferentiated carcinoma with osteoclast-like giant cells': () => 'Pleomorphic mononuclear tumour cells are admixed with scattered non-neoplastic osteoclast-like multinucleated giant cells containing numerous uniform small nuclei.',
  // Acinar cell carcinoma: densely cellular, acinar/solid, scant stroma, single prominent
  // nucleolus, granular apically eosinophilic cytoplasm (PAS-D positive zymogen granules).
  'Acinar cell carcinoma': () => 'A densely cellular tumour grows in acinar and solid patterns with minimal intervening stroma; the cells have granular eosinophilic apical cytoplasm and round basal nuclei with a single prominent nucleolus.',
  'Acinar cell cystadenocarcinoma': () => 'Cystic spaces are lined by neoplastic cells with granular eosinophilic apical cytoplasm and round nuclei with prominent nucleoli, with solid acinar areas in the walls.',
  'Mixed acinar-ductal carcinoma': () => 'Acinar areas with granular eosinophilic cytoplasm are admixed with mucin-containing glandular areas set in desmoplastic stroma.',
  'Pancreatoblastoma': () => 'A cellular tumour shows acinar differentiation punctuated by squamoid nests of spindled to epithelioid cells, separated by cellular stromal bands.',
  'Solid-pseudopapillary neoplasm': () => 'Discohesive uniform cells fall away from delicate fibrovascular cores to leave pseudopapillae, with grooved nuclei, eosinophilic hyaline globules and foci of cholesterol clefts and haemorrhage.',
  'Solid-pseudopapillary neoplasm with high grade carcinoma': () => 'A solid-pseudopapillary pattern of discohesive cells around delicate fibrovascular cores is present alongside a sarcomatoid and markedly atypical component with brisk mitotic activity and necrosis.',
  'Large cell neuroendocrine carcinoma': () => 'Organoid nests and trabeculae of large cells with moderate cytoplasm, vesicular nuclei and prominent nucleoli show brisk mitotic activity and geographic necrosis.',
  'Small cell neuroendocrine carcinoma': () => 'Sheets of small cells with scant cytoplasm, finely granular chromatin, nuclear moulding and inconspicuous nucleoli show brisk mitotic activity, extensive necrosis and crush artefact.',
  'Mixed neuroendocrine-non-neuroendocrine neoplasm (MiNEN) (specify components)': () => 'Two distinct components are present, one showing glandular differentiation and the other organoid neuroendocrine architecture, each forming a discrete part of the tumour.'
};

/** Sentence for a type name and grade; '' when the type is free text or unlisted. */
export function typeMorphology(typeName, grade) {
  const f = MORPHOLOGY[typeName];
  return f ? f(grade || '') : '';
}

/**
 * Immunohistochemistry sentences, appended to the same paragraph when the panel is ticked.
 * Only the result is stated; no interpretation is printed.
 */
export const IHC_PHRASE = {
  'CK7 positive': 'CK7',
  'CK20 positive': 'CK20',
  'CDX2 positive': 'CDX2',
  'MUC1 positive': 'MUC1',
  'MUC2 positive': 'MUC2',
  'MUC5AC positive': 'MUC5AC',
  'SMAD4 (DPC4) retained': 'SMAD4 (DPC4), retained nuclear expression',
  'SMAD4 (DPC4) lost': 'SMAD4 (DPC4), loss of nuclear expression',
  'Trypsin positive': 'trypsin',
  'BCL10 positive': 'BCL10',
  'Chromogranin positive': 'chromogranin',
  'Synaptophysin positive': 'synaptophysin',
  'Beta-catenin nuclear': 'beta-catenin, nuclear expression'
};
