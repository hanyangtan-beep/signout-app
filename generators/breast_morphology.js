// Shared microscopic morphology vocabulary for the breast resection synoptic templates
// (breast_carcinoma, breast_dcis, phyllodes). Descriptors follow the WHO Classification of
// Tumours: Breast Tumours, 5th ed as reflected in expert-authored sources — principally the
// PathologyOutlines breast chapters, with fetched reviews for the NST special patterns and the
// metaplastic subtypes. Per-entity source URLs are recorded in
// docs/reference/breast-morphology-sources.md.
//
// REGISTER RULE (house standard): the emitted sentence is released-report prose. It states what
// is seen down the microscope in this case and nothing else. WHO rules, percentage and mitotic
// thresholds, exclusion logic, sampling advice, incidence and prognostic commentary stay in
// these comments and never reach the report. Measured values (size, mitotic count, extent) are
// printed by the generator from the recorded fields, not here. British spelling throughout
// ("fetal" by house exception). Sentences slot after the derived opener in the "Tumour
// histology" paragraph.

const lowGrade = (g) => /1/.test(String(g || ''));
const highGrade = (g) => /3/.test(String(g || ''));

// ---------------------------------------------------------------------------
// Invasive carcinoma — per histologic type
// ---------------------------------------------------------------------------

/** histType (breast_carcinoma) -> (gradeShort) => sentence. */
export const MORPHOLOGY = {
  // IBC-NST: architecture from sheets, nests, cords to single cells; tubule formation prominent
  // in well differentiated and absent in poorly differentiated tumours; small nests provoke a
  // desmoplastic/scirrhous response. Grade-banded so the sentence matches the recorded scores.
  // https://www.pathologyoutlines.com/topic/breastmalignantductalnos.html
  'Invasive carcinoma of no special type (ductal)': (g) => (lowGrade(g)
    ? 'The tumour infiltrates as well-formed tubules and glands lined by cells with uniform nuclei and inconspicuous nucleoli, within a fibrous stroma.'
    : highGrade(g)
      ? 'The tumour infiltrates as solid nests, sheets and cords of cells with abundant eosinophilic cytoplasm, pleomorphic vesicular nuclei and prominent nucleoli, within a desmoplastic stroma.'
      : 'The tumour infiltrates as nests, cords and irregular glands of cells with moderately pleomorphic nuclei and variably conspicuous nucleoli, within a desmoplastic stroma.'),
  // Same base morphology; the named pattern sentence is appended from NST_PATTERN_MORPHOLOGY.
  'Invasive carcinoma of no special type (ductal) with specific morphologic pattern': (g) => MORPHOLOGY['Invasive carcinoma of no special type (ductal)'](g),
  // Classic ILC: discohesive small monomorphic cells in single files and cords, targetoid growth
  // around benign ducts, scant cytoplasm with occasional intracytoplasmic lumen, desmoplasia and
  // necrosis uncommon. https://www.pathologyoutlines.com/topic/breastmalignantlobularclassic.html
  'Invasive lobular carcinoma, classic': () => 'The tumour cells are small, discohesive and monomorphic, with round to notched ovoid nuclei and scant cytoplasm occasionally containing an intracytoplasmic lumen, and infiltrate singly and in single files and cords, in places encircling benign ducts in a targetoid pattern; a desmoplastic reaction is inconspicuous.',
  // Variant ILC: the classic base plus the named variant sentence from ILC_VARIANT_MORPHOLOGY.
  'Invasive lobular carcinoma, variant pattern': () => 'The tumour cells are discohesive and lack polarity, and infiltrate singly and in single files and cords, in places encircling benign ducts in a targetoid pattern.',
  // Mixed types: the components are named in the typed detail, so no single sentence applies.
  'Mixed histologic types (specify types and percentages)': () => '',
  // Tubular: ovoid and angulated tubules with open lumina, single layer of cuboidal to columnar
  // cells, apical snouts, low-grade nuclei, sparse mitoses, no myoepithelium, desmoplastic stroma.
  // https://www.pathologyoutlines.com/topic/breastmalignanttubular.html
  'Tubular carcinoma, pure or greater than 90%': () => 'Small ovoid and angulated tubules with open lumina, lined by a single layer of cuboidal to columnar cells with uniform low-grade nuclei and apical cytoplasmic snouts, infiltrate a desmoplastic stroma; a myoepithelial layer is absent and mitoses are sparse.',
  // Invasive cribriform: islands and nests with rounded or angulated contours containing sieve-like
  // spaces formed by arches of small cells; desmoplastic stroma; no myoepithelium; sparse mitoses.
  // https://www.pathologyoutlines.com/topic/breastmalignantcribriform.html
  'Invasive cribriform carcinoma, pure or greater than 90%': () => 'Invasive islands and nests with rounded and angulated contours contain sieve-like cribriform spaces formed by arches of small cells with mild to moderate pleomorphism, set in a desmoplastic stroma; a myoepithelial layer is absent and mitoses are sparse.',
  // Mucinous: clusters and nests of low to intermediate-grade cells floating in pools of
  // extracellular mucin divided by fibrous septa carrying capillaries (Capella A and B).
  // https://www.pathologyoutlines.com/topic/breastmalignantmucinous.html
  'Mucinous carcinoma, pure or greater than 90%': () => 'Clusters, strips and nests of tumour cells with low to intermediate-grade nuclei float within pools of extracellular mucin, which are divided by fibrous septa containing thin-walled capillaries.',
  // Invasive micropapillary: tufts, hollow tubules and morulae within clear spaces, reverse
  // (inside-out) polarity, abundant eosinophilic cytoplasm, knobby peripheral nuclei.
  // https://www.pathologyoutlines.com/topic/breastmalignantmicropapillary.html
  'Invasive micropapillary carcinoma, pure or greater than 90%': () => 'Tufts, hollow tubules and morulae of tumour cells with abundant eosinophilic cytoplasm lie within clear spaces in a fibrocollagenous stroma, showing reverse polarity with the apical surface facing the stroma; the peripheral nuclei bulge, giving the clusters a knobby contour.',
  // Apocrine: abundant granular eosinophilic cytoplasm, well-defined borders, enlarged round
  // nuclei, prominent nucleoli. https://www.pathologyoutlines.com/topic/breastmalignantapocrine.html
  'Invasive apocrine carcinoma': () => 'The infiltrating cells have abundant granular eosinophilic cytoplasm, well-defined cell borders, enlarged round nuclei and prominent nucleoli.',
  // Metaplastic spindle cell: fascicular and storiform spindle cells with infiltrative margins,
  // moderate to marked atypia, readily identified mitoses; transition to an epithelioid or
  // squamous component in mixed tumours. https://www.pathologyoutlines.com/topic/breastmalignantmetaplastic.html
  // https://pmc.ncbi.nlm.nih.gov/articles/PMC8983634/
  'Metaplastic carcinoma, spindle cell': () => 'Atypical spindle cells arranged in fascicles and a storiform pattern infiltrate the surrounding breast tissue, showing moderate to marked cytological atypia and readily identified mitoses, with focal transition to an epithelioid component.',
  // Heterologous / matrix-producing: abrupt transition from the carcinoma to chondroid and/or
  // osseous matrix without an intervening spindle cell component.
  // https://pmc.ncbi.nlm.nih.gov/articles/PMC3832232/ · https://path.upmc.edu/cases/case116/dx.html
  'Metaplastic carcinoma, with heterologous differentiation / matrix production': () => 'The carcinoma shows an abrupt transition to a malignant heterologous mesenchymal component with chondroid and osseous matrix, without an intervening spindle cell component.',
  // Metaplastic squamous: sheets, cords and nests of polygonal cells with dense eosinophilic
  // cytoplasm, pleomorphic hyperchromatic nuclei, variable keratinisation, prominent stromal
  // inflammation. https://www.pathologyoutlines.com/topic/breastmalignantscc.html
  'Metaplastic carcinoma, squamous cell': () => 'Sheets, cords and nests of polygonal cells with dense eosinophilic cytoplasm, pleomorphic hyperchromatic nuclei and variable keratinisation infiltrate the breast parenchyma, with a prominent stromal inflammatory infiltrate.',
  // Mixed and "other type" metaplastic: components are named in the typed detail.
  'Metaplastic carcinoma, mixed (specify types and percentages)': () => '',
  'Metaplastic carcinoma, other type (specify)': () => '',
  // Low-grade adenosquamous: infiltrative angulated and compressed bland glands with squamous
  // differentiation and luminal keratin debris, cellular spindled stroma arranged around the
  // glands, peripheral lymphoid aggregates, infrequent mitoses.
  // https://www.pathologyoutlines.com/topic/breastmalignantadenosquamous.html
  'Metaplastic carcinoma, favorable type, low-grade adenosquamous': () => 'Infiltrative angulated and compressed glands lined by bland epithelium show variable squamous differentiation with luminal keratin debris, set in a fibrotic to cellular spindled stroma arranged circumferentially around the glands, with peripheral lymphoid aggregates and infrequent mitoses.',
  // Fibromatosis-like: bland spindled fibroblast-like and myofibroblast-like cells in interlacing
  // fascicles with irregular infiltrative margins, minimal pleomorphism, rare mitoses,
  // collagenised stroma with peripheral lymphoid aggregates.
  // https://www.pathologyoutlines.com/topic/breastmalignantmetaplasticfibro.html
  'Metaplastic carcinoma, favorable type, low-grade fibromatosis-like': () => 'Bland spindled fibroblast-like cells in interlacing fascicles infiltrate the surrounding breast parenchyma with irregular margins, showing minimal nuclear pleomorphism and rare mitoses, within a collagenised stroma with peripheral lymphoid aggregates.',
  // Invasive solid papillary: solid nests with angulated, jigsaw-like contours punctuated by
  // delicate fibrovascular cores with palisading, infiltrating desmoplastic stroma; monomorphic
  // round to plasmacytoid cells, low to intermediate-grade nuclei, intracellular and extracellular
  // mucin. https://www.pathologyoutlines.com/topic/breastmalignantsolidpapillarycarcinoma.html
  'Invasive solid papillary carcinoma': () => 'Solid nests with angulated, jigsaw-like contours are punctuated by delicate fibrovascular cores with cellular palisading and infiltrate a desmoplastic stroma; the cells are monomorphic and round to plasmacytoid, with low to intermediate-grade nuclei and intracellular and extracellular mucin.',
  // Adenoid cystic: dual luminal epithelial and basaloid myoepithelial population in tubular,
  // cribriform and solid patterns; true glandular lumina and pseudolumens with basement membrane
  // material. https://www.pathologyoutlines.com/topic/breastmalignantadenoidcystic.html
  'Adenoid cystic carcinoma, classic': () => 'A dual population of luminal epithelial and basaloid myoepithelial cells forms tubular, cribriform and solid structures, with true glandular lumina and pseudolumens containing eosinophilic basement membrane material; the nuclei are of low to intermediate grade.',
  'Adenoid cystic carcinoma': () => 'A dual population of luminal epithelial and basaloid myoepithelial cells forms tubular, cribriform and solid structures, with true glandular lumina and pseudolumens containing eosinophilic basement membrane material.',
  // Secretory: circumscribed tumour, microcystic/solid/tubular architecture, vacuolated to
  // granular cytoplasm, abundant pale blue to dense pink secretions, bland low-grade nuclei, low
  // mitotic rate. https://www.pathologyoutlines.com/topic/breastmalignantjuvenile.html
  'Secretory carcinoma': () => 'A circumscribed tumour with microcystic, solid and tubular architecture is composed of cells with abundant vacuolated to granular cytoplasm and bland uniform low-grade nuclei, with abundant pale blue to dense pink intraluminal and intracytoplasmic secretions; mitoses are sparse.',
  // Deliberately silent: the type itself carries no morphology to assert.
  'Invasive carcinoma, type cannot be determined': () => '',
  'Other (specify)': () => '',
  'No residual invasive carcinoma': () => ''
};

/** Named specific morphological patterns within IBC-NST, matched from the typed detail. */
export const NST_PATTERN_MORPHOLOGY = {
  // Medullary pattern: syncytial growth without glandular structures, circumscribed pushing border,
  // high-grade nuclei with prominent nucleoli, prominent lymphoplasmacytic infiltrate.
  // https://www.pathologyoutlines.com/topic/breastmalignantmedullary.html
  medullary: 'The carcinoma grows in a syncytial pattern without glandular structures, with a circumscribed pushing border, nuclei showing prominent nucleoli and a prominent lymphoplasmacytic infiltrate.',
  // Neuroendocrine differentiation within NST: recorded as a pattern rather than a distinct entity.
  // https://www.pathologyoutlines.com/topic/breastmalignantductalnos.html
  neuroendocrine: 'The tumour cells show neuroendocrine differentiation, without the features of a large cell or small cell neuroendocrine carcinoma.',
  // Pleomorphic pattern: bizarre pleomorphic and multinucleated giant tumour cells, atypical
  // mitoses. https://pmc.ncbi.nlm.nih.gov/articles/PMC11197633/
  pleomorphic: 'Numerous bizarre pleomorphic and multinucleated giant tumour cells with atypical mitoses are present.',
  // Osteoclast-like stromal giant cells: giant cells in a vascular stroma with extravasated red
  // cells, haemosiderin and chronic inflammation. https://www.pathologyoutlines.com/topic/breastosteoclast.html
  'osteoclast-like': 'Multinucleated osteoclast-like giant cells lie within a vascular stroma showing extravasated red blood cells, haemosiderin deposition and a chronic inflammatory infiltrate.',
  // Choriocarcinomatous pattern: syncytiotrophoblast-like multinucleated giant cells with a high
  // nuclear-to-cytoplasmic ratio, haemorrhagic and necrotic background.
  // https://pmc.ncbi.nlm.nih.gov/articles/PMC3800734/
  choriocarcinomatous: 'Multinucleated syncytiotrophoblast-like giant cells with prominent nucleoli are admixed with the carcinoma, against a haemorrhagic and necrotic background.',
  // Oncocytic pattern: abundant granular eosinophilic cytoplasm, well-defined borders, round
  // central nuclei, prominent nucleoli. https://www.pathologyoutlines.com/topic/breastmalignantapocrine.html
  oncocytic: 'The tumour cells have abundant granular eosinophilic cytoplasm, well-defined cell borders and round central nuclei with prominent nucleoli.',
  // Apocrine pattern within NST: same cytology as invasive apocrine carcinoma.
  apocrine: 'The tumour cells have abundant granular eosinophilic cytoplasm, well-defined cell borders and enlarged nuclei with prominent nucleoli.'
};

/** Non-classic (variant) growth patterns of invasive lobular carcinoma, matched from the detail. */
export const ILC_VARIANT_MORPHOLOGY = {
  // Solid: sheets and large nests rather than single files.
  solid: 'The lobular-type cells grow in solid sheets and large nests rather than single files.',
  // Alveolar: rounded clusters and aggregates.
  alveolar: 'The lobular-type cells form rounded clusters and aggregates rather than single files.',
  // Pleomorphic: larger cells, greater cytonuclear atypia, higher mitotic count, abundant
  // eosinophilic to vacuolated cytoplasm, prominent nucleoli, dense fibrous stroma.
  // https://www.pathologyoutlines.com/topic/breastmalignantlobularpleomorphic.html
  pleomorphic: 'The cells are enlarged with abundant eosinophilic to vacuolated cytoplasm, irregular nuclei showing coarse chromatin and prominent nucleoli, and readily identified mitoses, within a densely fibrotic stroma.',
  // Tubulolobular: single files admixed with small round to angulated tubules, low-grade nuclei,
  // dense collagenous stroma. https://www.pathologyoutlines.com/topic/breastmalignanttubulolobular.html
  tubulolobular: 'Single cells and single-file cords are admixed with small round to angulated tubules with low-grade nuclei, within a dense collagenous stroma.',
  // Histiocytoid: foamy cytoplasm resembling histiocytes.
  histiocytoid: 'The cells have abundant foamy cytoplasm resembling histiocytes.',
  // Signet ring: large intracytoplasmic vacuoles displacing the nuclei.
  'signet ring': 'Many cells contain a large intracytoplasmic vacuole displacing the nucleus, producing signet ring forms.',
  // Apocrine: abundant eosinophilic granular cytoplasm.
  apocrine: 'The cells have abundant granular eosinophilic cytoplasm.'
};

/** Per-type microscopic sentence for the breast carcinoma part ('' when nothing applies). */
export function typeMorphology(typeName, grade) {
  const fn = MORPHOLOGY[typeName];
  return fn ? fn(grade || '') : '';
}

/** Named-pattern sentence for the NST / ILC "specify" types, matched from the typed detail. */
export function detailMorphology(typeName, detail) {
  const d = String(detail || '').toLowerCase();
  if (!d) return '';
  const map = /lobular/.test(String(typeName || '')) ? ILC_VARIANT_MORPHOLOGY
    : /no special type/.test(String(typeName || '')) ? NST_PATTERN_MORPHOLOGY : null;
  if (!map) return '';
  for (const key of Object.keys(map)) if (d.includes(key)) return map[key];
  return '';
}

// Patterns whose own sentence describes the growth completely, so the generic type sentence would
// contradict it (the medullary pattern has a pushing border and no desmoplastic reaction).
const SELF_CONTAINED = ['medullary'];

/** True when the pattern sentence should replace, not follow, the generic type sentence. */
export function detailReplacesType(typeName, detail) {
  const d = String(detail || '').toLowerCase();
  if (!d || !/no special type/.test(String(typeName || ''))) return false;
  return SELF_CONTAINED.some((k) => d.includes(k));
}

// ---------------------------------------------------------------------------
// Ductal carcinoma in situ
// ---------------------------------------------------------------------------

/** Nuclear-grade cytology for DCIS, keyed by the house grade word.
 *  https://www.pathologyoutlines.com/topic/breastmalignantdcis.html */
export const DCIS_CYTOLOGY = {
  low: 'The nuclei are monotonous and round with smooth contours, fine chromatin and inconspicuous nucleoli, and mitoses are rare.',
  intermediate: 'The nuclei show mild to moderate variation in size with variably coarse chromatin and occasional nucleoli, and mitoses are infrequent.',
  high: 'The nuclei are large and markedly pleomorphic with irregular vesicular chromatin and prominent nucleoli, and mitoses are readily identified.'
};

/** Architectural-pattern clauses for DCIS, keyed by the schema option (lower case).
 *  https://www.pathologyoutlines.com/topic/breastmalignantdcis.html */
export const DCIS_PATTERN_MORPHOLOGY = {
  comedo: 'the comedo areas show central expansile necrosis containing cellular debris and coarse calcification',
  cribriform: 'the cribriform areas show rigid punched-out lumina bridged by trabecular bars and Roman arches, lined by evenly spaced polarised cells',
  micropapillary: 'the micropapillary areas show tufts and club-shaped fronds without fibrovascular cores',
  papillary: 'the papillary areas show fronds with prominent fibrovascular septa',
  solid: 'the solid areas show ducts filled by sheets of cohesive, evenly spaced cells',
  'solid papillary carcinoma in situ': 'the solid papillary areas show expansile nodules of monomorphic round to plasmacytoid cells punctuated by delicate fibrovascular cores',
  'encapsulated papillary carcinoma in situ': 'the encapsulated papillary areas show delicate fibrovascular fronds within a cystically dilated duct surrounded by a thick fibrous capsule',
  'paget disease': 'the nipple epidermis contains large pale malignant cells singly and in clusters'
};

/** In situ types other than DCIS proper. */
export const DCIS_TYPE_MORPHOLOGY = {
  // Paget: single cells and clusters through the epidermis, abundant pale cytoplasm, large
  // irregular nuclei with prominent nucleoli, dermal chronic inflammation.
  // https://www.pathologyoutlines.com/topic/breastmalignantpaget.html
  'Paget disease': 'The malignant cells have abundant pale cytoplasm and large irregular nuclei with prominent nucleoli, and the underlying dermis shows a chronic inflammatory infiltrate.',
  // Encapsulated papillary CIS: papillary fronds with fibrovascular cores within a cystically
  // dilated duct surrounded by a thick fibrous capsule; myoepithelial cells absent along the
  // papillae and at the periphery.
  // https://www.pathologyoutlines.com/topic/breastmalignantencapsulatedpapillary.html
  'Encapsulated papillary carcinoma in situ': 'Delicate papillary fronds with fibrovascular cores, lined by cuboidal to columnar cells with low to intermediate-grade atypia, fill a cystically dilated duct surrounded by a thick fibrous capsule; myoepithelial cells are not identified along the papillae or at the periphery.',
  // Solid papillary CIS: expansile nodules with smooth rounded contours, solid proliferation
  // punctuated by delicate fibrovascular cores with palisading, monomorphic round to plasmacytoid
  // cells, intracellular and extracellular mucin.
  // https://www.pathologyoutlines.com/topic/breastmalignantsolidpapillarycarcinoma.html
  'Solid papillary carcinoma in situ': 'Expansile nodules with smooth rounded contours show a solid proliferation of monomorphic round to plasmacytoid cells punctuated by delicate fibrovascular cores with cellular palisading, with low to intermediate-grade nuclei and intracellular and extracellular mucin.'
};

/** Cytology sentence for the recorded DCIS nuclear grade ('' when not one of the three). */
export function dcisCytology(gradeWord) {
  return DCIS_CYTOLOGY[String(gradeWord || '').toLowerCase()] || '';
}

/** One sentence describing the recorded DCIS architectural patterns ('' when none recognised). */
export function dcisPatternMorphology(names) {
  const clause = (name) => {
    const n = String(name || '').toLowerCase().trim();
    if (DCIS_PATTERN_MORPHOLOGY[n]) return DCIS_PATTERN_MORPHOLOGY[n];
    // Schema options carry parenthetical glosses, e.g. "Paget disease (DCIS involving nipple skin)".
    const key = Object.keys(DCIS_PATTERN_MORPHOLOGY).find((k) => n.startsWith(k));
    return key ? DCIS_PATTERN_MORPHOLOGY[key] : '';
  };
  const list = (Array.isArray(names) ? names : [names]).map(clause).filter(Boolean);
  if (!list.length) return '';
  const sep = list.length > 2 ? '; ' : ', ';
  const joined = list.length > 1 ? `${list.slice(0, -1).join('; ')}${sep}and ${list[list.length - 1]}` : list[0];
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
}

/** Type sentence for the non-DCIS in situ types ('' otherwise). */
export function dcisTypeMorphology(typeName) {
  return DCIS_TYPE_MORPHOLOGY[typeName] || '';
}

// ---------------------------------------------------------------------------
// Phyllodes tumour
// ---------------------------------------------------------------------------

// The generator already prints stromal cellularity, atypia, overgrowth, mitoses and border from
// the recorded fields, so these sentences add only what those fields do not carry.
// https://www.pathologyoutlines.com/topic/breastphyllodesgeneral.html
export const PHYLLODES_MORPHOLOGY = {
  'Phyllodes tumor, benign': 'Subepithelial stromal condensation is present beneath the leaf-like fronds, and the epithelium retains its myoepithelial layer.',
  'Phyllodes tumor, borderline': 'Subepithelial stromal condensation and periductal stromal expansion are present beneath the leaf-like fronds, and the epithelium retains its myoepithelial layer.',
  'Phyllodes tumor, malignant': 'The stroma forms a malignant spindle cell proliferation resembling a sarcoma, and the epithelial component is sparse and displaced by the stromal growth.',
  'No tumor': ''
};

/** Per-type microscopic sentence for the phyllodes part ('' when nothing applies). */
export function phyllodesMorphology(typeName) {
  return PHYLLODES_MORPHOLOGY[typeName] || '';
}
