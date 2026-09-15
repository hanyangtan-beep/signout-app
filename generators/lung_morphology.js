// Shared microscopic morphology vocabulary for the lung carcinoma synoptic template.
// Descriptors follow the WHO Classification of Tumours: Thoracic Tumours, 5th ed (2021) as
// reflected in expert-authored sources — the PathologyOutlines lung tumour chapters and
// Nicholson et al., "The 2021 WHO Classification of Lung Tumors", J Thorac Oncol 2022.
// Per-type source URLs are recorded in docs/reference/lung-morphology-sources.md.
//
// REGISTER RULE (house standard): the emitted sentence is released-report prose. It states
// what is seen down the microscope in this case and nothing else. WHO rules, percentage and
// mitotic thresholds, exclusion logic, sampling advice, incidence and prognostic commentary
// stay in these comments and never reach the report. Measured values (mitotic count,
// necrosis, invasive size) are printed by the generator from the recorded fields, not here.
// British spelling throughout ("fetal" by house exception). Sentences slot after the derived
// opener in the "Tumour histology" paragraph.

const highGrade = (g) => /^(G3|G4|High)/i.test(String(g || ''));

/** Growth-pattern descriptors for invasive non-mucinous adenocarcinoma (WHO five patterns). */
export const PATTERN_MORPHOLOGY = {
  // Neoplastic type II pneumocytes and club cells along intact alveolar walls; bland cytology.
  lepidic: 'The lepidic areas consist of bland cuboidal pneumocyte-type cells lining intact alveolar walls',
  // Round to oval glands invading fibrous stroma; includes complex glandular / cribriform.
  acinar: 'The acinar areas consist of round to oval malignant glands set in fibrous stroma',
  // Papillae with true fibrovascular cores, replacing the alveolar lining.
  papillary: 'The papillary areas consist of cuboidal to columnar cells covering papillae with fibrovascular cores',
  // Tufts and ill-defined projections lacking fibrovascular cores.
  micropapillary: 'The micropapillary areas consist of tufts and small cell clusters lying free within air spaces, without fibrovascular cores',
  // Sheets without gland formation, papillae or lepidic growth.
  solid: 'The solid areas consist of sheets of tumour cells without gland formation',
  // Fused and cribriform glands; graded with the acinar pattern but counted as high-grade.
  'complex glandular': 'The complex glandular areas consist of fused and cribriform malignant glands with back-to-back lumina'
};

// Cytology shared by the non-mucinous invasive adenocarcinomas graded by pattern percentages;
// the architecture itself is described by the pattern sentences above.
export const ADENO_CYTOLOGY = 'The tumour cells are cuboidal to columnar with eosinophilic to vacuolated cytoplasm, enlarged nuclei showing vesicular chromatin and conspicuous nucleoli, and infiltrate a desmoplastic stroma.';

/** Pattern sentence for the predominant pattern name ('' when unrecognised). */
export function patternMorphology(name) {
  const s = PATTERN_MORPHOLOGY[String(name || '').toLowerCase().trim()];
  return s ? `${s}.` : '';
}

// STAS: tumour cells in air spaces beyond the tumour edge, in three patterns — micropapillary
// or ring-like clusters, solid nests, and discohesive single cells.
export const STAS_SENTENCE = 'Tumour cells are present within air spaces beyond the edge of the main tumour, as small clusters and discohesive single cells.';

/** typeName -> (grade) => sentence ('' when nothing useful can be said). */
export const MORPHOLOGY = {
  // AIS non-mucinous: pure lepidic growth, no stromal/vascular/pleural invasion, no necrosis;
  // mild-to-moderate atypia, hobnailing, nuclear grooves and pseudoinclusions.
  'Adenocarcinoma in situ (AIS), non-mucinous': () => 'The tumour grows purely along intact alveolar walls as a single layer of cuboidal to hobnail pneumocyte-type cells with mild to moderate nuclear atypia; no stromal, vascular or pleural invasion and no necrosis is identified.',
  // AIS mucinous: purely lepidic mucinous cells, minimal atypia, basal nuclei.
  'Adenocarcinoma in situ (AIS), mucinous': () => 'The tumour grows purely along intact alveolar walls as a single layer of tall columnar mucinous cells with abundant intracytoplasmic mucin, basally oriented nuclei and minimal atypia; no invasion is identified.',
  // MIA non-mucinous: lepidic-predominant with small invasive focus recognised as angulated
  // glands in desmoplastic stroma; LVI, pleural invasion, necrosis and STAS absent.
  'Minimally invasive adenocarcinoma, non-mucinous': () => 'A predominantly lepidic tumour of bland pneumocyte-type cells contains a small invasive focus of angulated glands in desmoplastic stroma with increased nuclear atypia; lymphovascular invasion, pleural invasion and necrosis are not identified.',
  'Minimally invasive adenocarcinoma, mucinous': () => 'A predominantly lepidic tumour of columnar mucinous cells with basal nuclei contains a small invasive focus of angulated glands in desmoplastic stroma; lymphovascular invasion, pleural invasion and necrosis are not identified.',
  // Invasive non-mucinous adenocarcinoma: the opener already carries the pattern percentages,
  // so the generator appends patternMorphology() for the predominant pattern instead of a
  // type-level sentence here.
  'Invasive adenocarcinoma (non-mucinous; predominant pattern from the percentages)': () => '',
  // Invasive mucinous adenocarcinoma: goblet / GI-type tall columnar cells, basal bland nuclei,
  // often lepidic growth with alveolar mucin filling; STAS common.
  'Invasive mucinous adenocarcinoma': () => 'The tumour is composed of goblet and tall columnar cells with abundant intracytoplasmic mucin and basally oriented, minimally atypical nuclei growing along alveolar walls; the adjacent alveolar spaces are filled with mucin.',
  'Mixed invasive mucinous and non-mucinous adenocarcinoma': () => 'Columnar mucinous cells with abundant intracytoplasmic mucin and basal nuclei are admixed with a conventional non-mucinous adenocarcinoma of pneumocyte-type cells, both components forming a substantial part of the tumour.',
  // Colloid: mucin pools distending and destroying alveolar spaces, sparse well-differentiated
  // cells floating within; low mitotic count, no necrosis.
  'Colloid adenocarcinoma': () => 'Pools of extracellular mucin distend and destroy the alveolar spaces and contain scanty well-differentiated mucin-laden cuboidal to columnar tumour cells, floating freely and lining the fibrous walls of the mucin-filled spaces.',
  // Fetal: branching tubules of glycogen-rich clear columnar cells resembling pseudoglandular
  // fetal lung; low grade has subnuclear vacuoles and squamoid morules, high grade has
  // disorganised glands, prominent nucleoli, necrosis and no morules.
  'Fetal adenocarcinoma': (g) => (highGrade(g)
    ? 'Irregular branching tubules lined by columnar cells with clear glycogen-rich cytoplasm resemble fetal lung, and are accompanied by disorganised glands with large vesicular nuclei, prominent nucleoli, marked anisonucleosis and broad areas of necrosis in desmoplastic stroma; squamoid morules are not identified.'
    : 'Irregular branching tubules lined by pseudostratified columnar cells with clear glycogen-rich cytoplasm, subnuclear and supranuclear vacuoles and small uniform oval nuclei resemble fetal lung in the pseudoglandular stage; squamoid morules are present.'),
  // Enteric: colorectal-like glands / papillae / cribriform with dirty necrosis, pseudostratified
  // tall columnar cells, eosinophilic cytoplasm, frequent mitoses, desmoplastic inflamed stroma.
  'Enteric-type adenocarcinoma': () => 'Glandular, papillary and cribriform structures are lined by tall columnar cells with pseudostratified atypical nuclei and eosinophilic cytoplasm, with dirty luminal necrosis and a desmoplastic, inflamed stroma, resembling colorectal adenocarcinoma.',
  // SCIS: full-thickness replacement of bronchial epithelium, no maturation, mitoses at all
  // levels, intact basement membrane; ductal extension permitted.
  'Squamous cell carcinoma in situ (SCIS)': () => 'The bronchial epithelium is replaced through its full thickness by atypical squamous cells with coarse chromatin, loss of maturation and surface orientation, and mitoses at all levels; the basement membrane is intact and no invasion is identified.',
  // SCC keratinising: keratin pearls and intercellular bridges; inflammation and necrosis common.
  'Invasive squamous cell carcinoma, keratinising': (g) => (highGrade(g)
    ? 'Infiltrating nests and sheets of squamous cells with severe nuclear atypia, numerous mitoses and central necrosis show focal keratinisation and intercellular bridges.'
    : 'Infiltrating nests and sheets of squamous cells show keratinisation with keratin pearls and intercellular bridges, accompanied by a brisk stromal inflammatory infiltrate.'),
  // SCC non-keratinising: solid nests and sheets without keratinisation or bridges; squamous
  // lineage supported by p40 / CK5-6 rather than by morphology.
  'Invasive squamous cell carcinoma, non-keratinising': () => 'The tumour infiltrates as solid nests and sheets of cells with eosinophilic cytoplasm and well-defined cell borders; keratinisation, keratin pearls and intercellular bridges are not identified.',
  // Basaloid: small-to-intermediate basaloid cells, high N:C ratio, peripheral palisading,
  // rosetting, comedo necrosis, high mitotic rate, minimal keratinisation.
  'Invasive squamous cell carcinoma, basaloid': () => 'Solid lobules and nests of small to intermediate basaloid cells with scant cytoplasm and a high nuclear-to-cytoplasmic ratio show prominent peripheral palisading, focal rosetting, comedo-type necrosis and frequent mitoses; keratinisation is minimal.',
  // Lymphoepithelial carcinoma: syncytial sheets of polygonal cells, vesicular nuclei with
  // prominent nucleoli, dense CD8-positive lymphoplasmacytic infiltrate, pushing border.
  'Lymphoepithelial carcinoma': () => 'Anastomosing islands and syncytial sheets of monomorphous polygonal cells with large vesicular nuclei and prominent eosinophilic nucleoli are embedded in a dense lymphoplasmacytic infiltrate, with a predominantly pushing border against the adjacent lung.',
  // Large cell carcinoma: sheets of large polygonal cells, vesicular nuclei, prominent nucleoli;
  // no glandular, squamous or neuroendocrine differentiation on morphology or IHC.
  'Large cell carcinoma': () => 'Sheets and solid nests of large round to polygonal cells with moderately abundant cytoplasm, well-defined cell borders, vesicular nuclei and prominent nucleoli show no glandular, squamous or neuroendocrine differentiation.',
  // Adenosquamous: both squamous (bridges, pearls) and glandular (mucin lumina) components.
  'Adenosquamous carcinoma': () => 'Malignant glandular and squamous components coexist within the one tumour, the glandular component forming mucin-containing lumina and the squamous component showing keratinisation and intercellular bridges.',
  // Pleomorphic carcinoma: NSCLC (usually adenocarcinoma) with a substantial spindle and/or
  // giant cell population; necrosis, haemorrhage and vascular invasion common.
  'Pleomorphic carcinoma': () => 'A non-small cell carcinoma component is accompanied by a substantial population of malignant spindle cells and bizarre neoplastic giant cells, with necrosis and haemorrhage.',
  // Spindle cell carcinoma: fascicular / storiform spindle cells, variable atypia, chronic
  // inflammation; collagenous or myxoid stroma.
  'Spindle cell carcinoma': () => 'The tumour is composed of tightly packed elongated spindle cells growing in fascicular and storiform patterns within a collagenous to myxoid stroma, accompanied by a chronic inflammatory infiltrate.',
  // Giant cell carcinoma: pleomorphic malignant giant cells, multilobated nuclei, emperipolesis.
  'Giant cell carcinoma': () => 'The tumour is composed of highly pleomorphic malignant giant cells of widely varying size and shape with abundant eosinophilic cytoplasm and multiple irregular, often multilobated nuclei; leukocyte emperipolesis is seen, with necrosis and haemorrhage.',
  // Carcinosarcoma: biphasic — carcinoma plus a genuinely sarcomatous spindle cell component;
  // heterologous rhabdomyoblastic / chondroid / osseous elements may be present.
  'Carcinosarcoma': () => 'The tumour is biphasic, with a carcinomatous component merging into a frankly sarcomatous spindle cell component; heterologous rhabdomyoblastic, cartilaginous and osseous elements are sought and recorded below.',
  // Pulmonary blastoma: fetal-type branching tubules with glycogen vacuoles in a primitive
  // blastematous stroma; squamoid morules in about two-thirds.
  'Pulmonary blastoma': () => 'Branching tubules lined by pseudostratified columnar cells with subnuclear and supranuclear glycogen vacuoles, resembling fetal lung, are set in a loose primitive mesenchymal stroma; squamoid morules are present.',
  // NUT carcinoma: monotonous primitive medium-sized cells in sheets with abrupt keratinisation,
  // necrosis and neutrophils; NUT (NUTM1) nuclear staining is definitional.
  'NUT carcinoma': () => 'Sheets of monotonous primitive medium-sized cells with cleared cytoplasm, large nuclei and prominent nucleoli show abrupt foci of keratinisation, against a background of necrosis with prominent neutrophils.',
  // SMARCA4-deficient undifferentiated tumour: discohesive large epithelioid cells, vesicular
  // chromatin, prominent nucleoli, rhabdoid cells; BRG1 (SMARCA4) loss is definitional.
  'Thoracic SMARCA4-deficient undifferentiated tumour': () => 'Diffuse sheets of discohesive large round to epithelioid cells with vesicular chromatin and prominent nucleoli include scattered rhabdoid cells; glandular and squamous differentiation is not identified.',
  // Adenoid cystic: cribriform / tubular / solid patterns, pseudocysts with basement-membrane
  // material, dual luminal and abluminal myoepithelial population; perineural invasion typical.
  'Adenoid cystic carcinoma': () => 'A dual population of luminal epithelial and abluminal myoepithelial cells forms cribriform and tubular structures with pseudocystic spaces containing basement membrane-like material; perineural invasion is present.',
  // Epithelial-myoepithelial carcinoma: bilayered duct-like structures, inner epithelial and
  // outer clear myoepithelial cells, thin fibrous septa; mitoses and necrosis typically absent.
  'Epithelial-myoepithelial carcinoma': () => 'A circumscribed tumour with a pushing margin is divided by thin hyalinised fibrous septa into bilayered duct-like structures, with an inner layer of cuboidal to columnar epithelial cells and an outer layer of clear myoepithelial cells; the lumina contain pale amorphous material.',
  // Mucoepidermoid: squamoid, mucous and intermediate cells, no keratinisation and no surface
  // in situ carcinoma; high-grade tumours show atypia, mitoses and necrosis.
  'Mucoepidermoid carcinoma': (g) => (highGrade(g)
    ? 'Squamoid, mucin-producing and intermediate cells form solid and cystic areas with nuclear atypia, pleomorphism, frequent mitoses and necrosis; keratinisation is not identified.'
    : 'Squamoid cells with intercellular bridges, mucous cells with pale intracytoplasmic mucin and peripherally displaced nuclei, and bland polygonal intermediate cells line cystic spaces and form solid nests; keratinisation and significant atypia are not identified.'),
  // Typical carcinoid: organoid / trabecular / nested / rosetting architecture, salt-and-pepper
  // chromatin, fine vascular stroma; necrosis absent and mitoses rare (counts printed from the
  // recorded mitotic and necrosis fields, not asserted here).
  'Typical carcinoid / neuroendocrine tumour, grade 1': () => 'Uniform polygonal cells with round to oval nuclei, salt-and-pepper chromatin, inconspicuous nucleoli and moderately abundant eosinophilic cytoplasm form organoid nests, trabeculae and rosettes within a fine, richly vascular stroma.',
  // Atypical carcinoid: same architecture and cytology with greater pleomorphism; the mitotic
  // count and necrosis that separate it from typical carcinoid are printed from the fields.
  'Atypical carcinoid / neuroendocrine tumour, grade 2': () => 'Polygonal cells with salt-and-pepper chromatin and moderately abundant eosinophilic cytoplasm form organoid nests, trabeculae and rosettes within a fine, richly vascular stroma, with greater nuclear pleomorphism than a typical carcinoid.',
  'Carcinoid tumour, NOS / neuroendocrine tumour, NOS': () => 'Uniform polygonal cells with round to oval nuclei, salt-and-pepper chromatin and moderately abundant eosinophilic cytoplasm form organoid nests, trabeculae and rosettes within a fine, richly vascular stroma.',
  // Small cell carcinoma: small round-oval cells, scant cytoplasm, finely dispersed chromatin,
  // absent nucleoli, moulding, smudging, crush artefact, apoptosis, Azzopardi phenomenon.
  'Small cell carcinoma': () => 'Sheets and ribbons of small to medium-sized cells with scant cytoplasm, finely dispersed chromatin, inconspicuous nucleoli and marked nuclear moulding show crush artefact, extensive necrosis, frequent apoptotic bodies and numerous mitoses; basophilic nuclear material encrusts vessel walls.',
  'Combined small cell carcinoma (specify the non-small cell component)': () => 'A small cell carcinoma of moulded cells with scant cytoplasm, finely dispersed chromatin and numerous mitoses is admixed with a morphologically distinct non-small cell component, specified above.',
  // LCNEC: organoid nesting with peripheral palisading, rosettes, large cells with abundant
  // cytoplasm, coarse chromatin, prominent nucleoli, geographic necrosis, brisk mitoses.
  'Large cell neuroendocrine carcinoma': () => 'Organoid nests with peripheral palisading, anastomosing trabeculae and rosette-like structures are composed of large cells with abundant amphophilic cytoplasm, coarse granular chromatin and prominent nucleoli, showing geographic necrosis and brisk mitotic activity.',
  'Combined large cell neuroendocrine carcinoma (specify the other component)': () => 'A large cell neuroendocrine carcinoma of organoid nests with peripheral palisading, prominent nucleoli, geographic necrosis and brisk mitotic activity is admixed with a non-neuroendocrine carcinoma component, specified above.'
};

/** Per-type microscopic sentence for the lung resection part ('' otherwise). */
export function typeMorphology(typeName, grade) {
  const fn = MORPHOLOGY[typeName];
  return fn ? fn(grade || '') : '';
}
