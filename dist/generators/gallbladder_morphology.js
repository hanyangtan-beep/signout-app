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
  'Adenocarcinoma, biliary type': () => 'Irregularly shaped, angulated glands and small cell clusters lined by cuboidal to low columnar cells are set in dense desmoplastic stroma; the nuclear grade appears disproportionately high for the degree of glandular differentiation, and perineural and vascular invasion are frequent.',
  // Intestinal type: morphologically similar to colorectal adenocarcinoma.
  'Adenocarcinoma, intestinal type': () => 'The malignant glands are composed of tall columnar cells with pseudostratified, cigar-shaped nuclei and luminal necrotic debris, resembling colorectal-type adenocarcinoma.',
  // Mucinous adenocarcinoma: stromal mucin deposition with floating cell clusters; WHO more-
  // than-50 % extracellular mucin rule applies (as in the colorectal definition).
  'Mucinous adenocarcinoma': () => 'Pools of extracellular mucin predominate and contain strips, glands and clusters of neoplastic columnar epithelium floating in the mucin.',
  // Clear cell adenocarcinoma: sheet-like cells with clear cytoplasm resembling renal cell
  // carcinoma.
  'Clear cell adenocarcinoma': () => 'The tumour is composed of sheets and tubules of cells with optically clear cytoplasm and well-defined cell membranes, resembling clear cell renal cell carcinoma.',
  // Poorly cohesive carcinoma / signet-ring: diffusely infiltrative discohesive cells with
  // intracytoplasmic mucin; WHO 50 % signet-ring threshold (as for the oesophageal and gastric
  // chapters).
  'Poorly cohesive carcinoma': () => 'Discohesive tumour cells infiltrate singly and in cords without gland formation.',
  'Signet-ring cell carcinoma': () => 'The tumour is composed predominantly of discohesive signet-ring cells with intracytoplasmic mucin displacing the nucleus, infiltrating singly and in single files.',
  // Adenosquamous: glandular and squamous components in variable amounts; WHO prescribes no
  // minimum proportion (as for the oesophageal chapter).
  'Adenosquamous carcinoma': () => 'Malignant glandular and squamous components coexist, the squamous component showing keratinisation and intercellular bridges.',
  // Mucinous cystic neoplasm with invasive carcinoma: multilocular cyst lined by mucinous
  // epithelium with hormone receptor-positive ovarian-type stroma, predominantly in women;
  // invasive focus often focal — thorough sampling.
  'Mucinous cystic neoplasm with an associated invasive carcinoma': () => 'The invasive carcinoma arises in a multiloculated mucinous cystic neoplasm lined by mucinous epithelium overlying ovarian-type subepithelial stroma.',
  // ICPN with invasive carcinoma: papillary fronds-to-back units in papillary / tubular /
  // tubulopapillary configurations; biliary phenotype carries the highest invasive risk; the
  // invasive component is usually pancreatobiliary-type adenocarcinoma and may be away from
  // the ICPN — yet even ICPN-associated carcinomas fare better than conventional carcinomas.
  'Intracholecystic papillary neoplasm with associated invasive carcinoma': () => 'The invasive carcinoma arises in association with an exophytic papillary neoplasm of back-to-back papillae lined by dysplastic epithelium overlying fibrovascular cores.',
  // ICTN (Pehlivanoglu 2020): cauliflower-like mass of compact back-to-back small tubules of
  // non-mucinous cuboidal epithelium; morules and neuroendocrine clusters frequent; PTC-type
  // nuclear clearing may be seen. Not usually associated with invasion but listed here because
  // the QMH page carries it.
  'Intracholecystic tubular neoplasm with associated invasive carcinoma': () => 'The invasive carcinoma arises in a polypoid intracholecystic neoplasm of compact back-to-back small tubules lined by non-mucinous cuboidal epithelium with squamoid morules.',
  // Squamous cell carcinoma: pure squamous differentiation with keratinisation and
  // intercellular bridges (WHO: when mixed with glands, adenosquamous).
  'Squamous cell carcinoma': () => 'The tumour shows squamous differentiation with keratin pearls and intercellular bridges; no glandular component is identified.',
  // Undifferentiated, NOS: no identifiable line of differentiation; diagnosis of exclusion.
  'Undifferentiated carcinoma, NOS': () => 'The tumour grows in sheets of high-grade pleomorphic cells without glandular, squamous or neuroendocrine differentiation.',
  // Poorly differentiated NECs and MiNEN: WHO 2019 morphology shared with the other GI pages.
  'Large cell neuroendocrine carcinoma': () => 'Organoid nests and trabeculae of medium-to-large cells with coarse chromatin, prominent nucleoli and moderately abundant cytoplasm show geographic necrosis and brisk mitotic activity.',
  'Small cell neuroendocrine carcinoma': () => 'Sheets of small, round-to-oval cells with scant cytoplasm, finely granular chromatin, absent or inconspicuous nucleoli and marked nuclear moulding show crush artefact, extensive necrosis and numerous mitoses.',
  'Mixed neuroendocrine-non-neuroendocrine tumour (Mixed adenoneuroendocrine carcinoma) (specify components)': () => 'Invasive adenocarcinoma and neuroendocrine carcinoma components are both present, each constituting more than 30% of the tumour (mixed neuroendocrine-non-neuroendocrine neoplasm).'
};

/** Per-type microscopic sentence for the gallbladder resection part ('' otherwise). */
export function typeMorphology(typeName, grade) {
  const fn = MORPHOLOGY[typeName];
  return fn ? fn(grade || '') : '';
}
