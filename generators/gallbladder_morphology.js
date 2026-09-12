// Shared microscopic morphology vocabulary for the gallbladder synoptic template.
// Descriptions follow the WHO Classification of Tumours: Digestive System Tumours, 5th ed
// (2019) gallbladder chapter, reflected in expert-authored sources: the biliary adenocarcinoma
// and subtype wording from Pathology Outlines (gallbladderipn.html) and the textbook synopsis
// at clinicalgate.com/tumors-of-the-biliary-tree-pathologic-features (pancreatobiliary-type
// adenocarcinoma, intestinal / mucinous / clear cell / signet-ring / adenosquamous / MCN
// descriptors); the poorly differentiated NEC and undifferentiated-carcinoma sentences reuse
// the WHO 2019 NEN and exclusion-based undiffcarcinoma wording shared across the GI templates.
// British spelling throughout; sentences slot after the derived opener in the
// "Tumour histology" paragraph.

/** typeName -> (grade) => sentence ('' when nothing useful can be said). */
export const MORPHOLOGY = {
  // Pancreatobiliary-type adenocarcinoma: simple and complex, irregularly shaped glands with
  // small cell clusters, desmoplasia; well-formed cuboidal-cell glands with dilated lumina;
  // nuclear grade often unexpectedly high relative to glandular differentiation; perineural
  // and vascular invasion common.
  'Adenocarcinoma': () => MORPHOLOGY['Adenocarcinoma, biliary type'](),
  'Adenocarcinoma, biliary type': () => 'Irregularly shaped, angulated glands and small cell clusters are set in desmoplastic stroma; nuclear grade is often unexpectedly high for the degree of glandular differentiation, and perineural and vascular invasion are common (pancreatobiliary type).',
  // Intestinal type: morphologically similar to colorectal adenocarcinoma.
  'Adenocarcinoma, intestinal type': () => 'Malignant glands with pseudostratified, cigar-shaped nuclei, luminal necrosis and gland-within-gland architecture resembling colorectal adenocarcinoma (intestinal type).',
  // Mucinous adenocarcinoma: stromal mucin deposition with floating cell clusters; WHO more-
  // than-50 % extracellular mucin rule applies (as in the colorectal definition).
  'Mucinous adenocarcinoma': () => 'Extracellular mucin pools occupy more than half of the tumour and carry strips and clusters of neoplastic glandular epithelium floating in the mucin.',
  // Clear cell adenocarcinoma: sheet-like cells with clear cytoplasm resembling renal cell
  // carcinoma.
  'Clear cell adenocarcinoma': () => 'Sheets and tubules of cells with optically clear cytoplasm and well-defined membranes, resembling renal cell carcinoma, without hepatoid or steroid-type immunophenotype.',
  // Poorly cohesive carcinoma / signet-ring: diffusely infiltrative discohesive cells with
  // intracytoplasmic mucin; WHO 50 % signet-ring threshold (as for the oesophageal and gastric
  // chapters).
  'Poorly cohesive carcinoma': () => 'Discohesive tumour cells infiltrate singly and in cords without gland formation; when signet-ring cells predominate (more than half of the tumour) it is reported as signet-ring cell carcinoma.',
  'Signet-ring cell carcinoma': () => 'More than half of the tumour is composed of discohesive signet-ring cells with intracytoplasmic mucin displacing the nucleus, infiltrating singly and in single files.',
  // Adenosquamous: glandular and squamous components in variable amounts; WHO prescribes no
  // minimum proportion (as for the oesophageal chapter).
  'Adenosquamous carcinoma': () => 'Glandular and squamous components coexist in variable amounts; WHO prescribes no minimum proportion for either, only that both are present.',
  // Mucinous cystic neoplasm with invasive carcinoma: multilocular cyst lined by mucinous
  // epithelium with hormone receptor-positive ovarian-type stroma, predominantly in women;
  // invasive focus often focal — thorough sampling.
  'Mucinous cystic neoplasm with an associated invasive carcinoma': () => 'The neoplasm arises from a multilocular mucinous cyst with ovarian-type subepithelial stroma; the invasive component may be focal and hidden within the cyst wall, so thorough sampling is essential.',
  // ICPN with invasive carcinoma: papillary fronds-to-back units in papillary / tubular /
  // tubulopapillary configurations; biliary phenotype carries the highest invasive risk; the
  // invasive component is usually pancreatobiliary-type adenocarcinoma and may be away from
  // the ICPN — yet even ICPN-associated carcinomas fare better than conventional carcinomas.
  'Intracholecystic papillary neoplasm with associated invasive carcinoma': () => 'A mass-forming preinvasive neoplasm of back-to-back epithelial papillae or tubules shows biliary, intestinal, gastric or oncocytic differentiation, with an associated invasive component, usually pancreatobiliary-type adenocarcinoma, that may lie away from the papillary neoplasm — thorough sampling is warranted.',
  // ICTN (Pehlivanoglu 2020): cauliflower-like mass of compact back-to-back small tubules of
  // non-mucinous cuboidal epithelium; morules and neuroendocrine clusters frequent; PTC-type
  // nuclear clearing may be seen. Not usually associated with invasion but listed here because
  // the QMH page carries it.
  'Intracholecystic tubular neoplasm with associated invasive carcinoma': () => 'Compact back-to-back small tubules of non-mucinous cuboidal epithelium form a cauliflower-like lesion, often with squamoid morules and neuroendocrine clusters; any invasive carcinoma is reported with its own extent and grade.',
  // Squamous cell carcinoma: pure squamous differentiation with keratinisation and
  // intercellular bridges (WHO: when mixed with glands, adenosquamous).
  'Squamous cell carcinoma': () => 'Pure squamous differentiation with keratin pearls and intercellular bridges; a glandular component, however small, would qualify the tumour as adenosquamous carcinoma.',
  // Undifferentiated, NOS: no identifiable line of differentiation; diagnosis of exclusion.
  'Undifferentiated carcinoma, NOS': () => 'Sheets of high-grade pleomorphic cells show no identifiable line of differentiation; the diagnosis is reached after exhaustive exclusion of glandular, squamous and neuroendocrine differentiation.',
  // Poorly differentiated NECs and MiNEN: WHO 2019 morphology shared with the other GI pages.
  'Large cell neuroendocrine carcinoma': () => 'Organoid nests and trabeculae of medium-to-large cells with coarse chromatin, prominent nucleoli and moderately abundant cytoplasm show geographic necrosis; the mitotic rate exceeds 20 mitoses per 2 mm².',
  'Small cell neuroendocrine carcinoma': () => 'Sheets of small, round-to-oval cells with scant cytoplasm, finely granular chromatin, absent or inconspicuous nucleoli and marked nuclear moulding show crush artefact, extensive necrosis and numerous mitoses.',
  'Mixed neuroendocrine-non-neuroendocrine tumour (Mixed adenoneuroendocrine carcinoma) (specify components)': () => 'Invasive adenocarcinoma and neuroendocrine carcinoma components each constitute more than 30% of the tumour, meeting the WHO definition of a mixed neuroendocrine-non-neuroendocrine neoplasm (MiNEN).'
};

/** Per-type microscopic sentence for the gallbladder resection part ('' otherwise). */
export function typeMorphology(typeName, grade) {
  const fn = MORPHOLOGY[typeName];
  return fn ? fn(grade || '') : '';
}
