// Morphology sentences for ovarian / fallopian tube / peritoneal synoptic reporting.
//
// Register rule: these strings are printed into a released report. They describe
// what is seen down the microscope in the case at hand. They must not cite WHO
// rules, thresholds, definitions, exclusion logic, incidence or prognosis.
// Knowledge grounding and source URLs belong in comments only.
//
// Sources (read and recorded in docs/reference/ovary-morphology-sources.md):
//   PathologyOutlines ovarian / fallopian tube / soft tissue topic pages (WHO 2020 aligned)
//   https://www.pathologyoutlines.com/ovary.html
//   Modern Pathology, dedifferentiated endometrioid carcinoma
//   https://www.nature.com/articles/modpathol201041
//   Ovarian seromucinous carcinoma clinicopathological study
//   https://pmc.ncbi.nlm.nih.gov/articles/PMC9862510/
//   Steroid cell tumour review
//   https://pmc.ncbi.nlm.nih.gov/articles/PMC10861727/

// Grade helpers. `grade` is the raw gradeWho value, e.g. 'G2: Moderately differentiated'.
const isG1 = (g) => /^G1/.test(g || '');
const isG3 = (g) => /^G3/.test(g || '');

// Keys must match the histType options in schemas/ovary_ft_peritoneum.json exactly.
export const MORPHOLOGY = {
  // --- Serous ---------------------------------------------------------------
  'Serous borderline tumour':
    'The tumour is composed of slender, irregularly contoured papillae with fibrous to oedematous cores showing hierarchical branching, the larger papillae arborising into progressively smaller papillae that terminate in detached epithelial tufts and single cells. The lining epithelium is stratified and crowded with hobnailing and a mixed population of cuboidal, columnar, ciliated and eosinophilic cells, showing mild to moderate nuclear atypia with coarsened chromatin and small nucleoli. Mitotic figures are sparse, psammomatous calcification is present and there is no stromal invasion.',

  'Serous borderline tumour, micropapillary / cribriform variant':
    'Slender thread-like micropapillae without fibrovascular cores radiate directly from the cyst wall and from bulbous, smooth-contoured stromal stalks, interweaving to produce labyrinthine spaces at low power, and elsewhere fuse into confluent sieve-like cribriform sheets. The lining is a monotonous population of low cuboidal cells with high nuclear to cytoplasmic ratio, small prominent nucleoli and moderate atypia, with little ciliation. Mitotic figures are sparse and there is no stromal invasion; conventional serous borderline tumour is admixed.',

  'Serous borderline tumour with microinvasion':
    'Within an otherwise typical serous borderline tumour there are scattered single cells and rounded cell clusters lying within the papillary and intracystic stroma, frequently separated from it by retraction clefts. The invading cells have abundant hypereosinophilic cytoplasm and only mild nuclear atypia, mitotic figures are scant, and the surrounding stroma is unremarkable to minimally fibroblastic.',

  'Microinvasive low-grade serous carcinoma':
    'Within a serous borderline tumour there are micropapillae, inverted micropapillae and confluent cribriform structures haphazardly infiltrating the papillary and intracystic stroma. The invading cells are monotonous and hyperchromatic with scant cytoplasm and prominent nucleoli, in contrast to the hypereosinophilic cells of the background tumour.',

  'Low-grade serous carcinoma':
    'The tumour infiltrates as micropapillae, compact cell nests and inverted macropapillae with broad fibrovascular cores, together with cribriform and glandular areas and single cells within slit-like retraction spaces. The cells are small and uniform with scant cytoplasm, vesicular chromatin and a single conspicuous nucleolus, showing mild to moderate atypia without pleomorphism. Mitotic figures are infrequent, necrosis is absent and psammoma bodies are numerous.',

  'High-grade serous carcinoma':
    'The tumour grows in solid sheets punctuated by slit-like spaces, with hierarchical papillary branching and cribriform and glandular areas. The cells are cuboidal to columnar with eosinophilic cytoplasm and markedly pleomorphic, hyperchromatic nuclei including bizarre and multinucleated forms, with large eosinophilic nucleoli. Mitotic figures are numerous and include atypical forms, geographic and comedo-type necrosis is present, and tumour-infiltrating lymphocytes and psammoma bodies are seen.',

  // --- Mucinous -------------------------------------------------------------
  'Mucinous borderline tumour':
    'The cysts and glands are lined by gastrointestinal-type mucinous epithelium with goblet cells, showing epithelial tufting, villous and filiform intraluminal projections, nuclear stratification, hyperchromasia and scattered mitotic figures. The glands contain luminal mucin, and focal mucin extravasation with an associated histiocytic and inflammatory response is seen adjacent to ruptured glands. There is no stromal invasion.',

  'Mucinous borderline tumour with intraepithelial carcinoma':
    'The tumour is a gastrointestinal-type mucinous borderline tumour containing discrete foci of marked nuclear stratification and severe cytological atypia with loss of polarity, hyperchromatic pleomorphic nuclei and readily identified mitotic figures. These foci remain confined to the epithelium, without stromal invasion.',

  'Mucinous borderline tumour with microinvasion':
    'Within a gastrointestinal-type mucinous borderline tumour there are small foci of stromal invasion by single cells and small nests, each focus measuring less than 5 mm. The invading cells show only mild atypia comparable to the background borderline epithelium. Mucin extravasation from ruptured glands with an associated histiocytic reaction is also present.',

  'Mucinous adenocarcinoma':
    'The tumour is composed of intestinal-type mucinous glands showing marked architectural complexity with cribriforming, papillary infolding and solid areas, lined by stratified columnar cells with hyperchromatic pleomorphic nuclei, loss of polarity and readily identified mitotic figures. Luminal necrotic debris is conspicuous, and the carcinoma merges with adjacent benign and borderline mucinous epithelium.',

  // --- Endometrioid / seromucinous -----------------------------------------
  'Endometrioid borderline tumour':
    'The tumour comprises crowded endometrioid-type glands, cysts and non-branching villous papillae with focal cribriform architecture, lined by stratified columnar cells with mild to moderate nuclear atypia, set within a fibromatous adenofibromatous stroma. Squamous morular metaplasia is present. There is no destructive stromal invasion, glandular confluence or stromal disappearance.',

  'Endometrioid carcinoma':
    'The tumour is composed of confluent, back-to-back endometrioid glands lined by stratified columnar cells with elongated nuclei, invading the stroma in an expansile fashion. Squamous differentiation with morules and keratin pearls is present, and cytoplasmic mucin, intracytoplasmic vacuoles and ciliated change are seen focally. Adjacent endometriosis is identified.',

  'Endometrioid carcinoma, seromucinous type':
    'The tumour is predominantly papillary, with large fibro-oedematous papillae and smaller nipple-like projections lined by endocervical-type mucinous epithelium with stratification and moderate nuclear atypia. Squamous metaplasia and admixed ciliated and indifferent eosinophilic cells are present, and the papillary cores contain a mixed inflammatory infiltrate.',

  'Seromucinous borderline tumour':
    'The tumour forms hierarchically branching papillae lined by a mixed Müllerian population of endocervical-type mucinous, endometrioid, squamous, ciliated, hobnail and indifferent eosinophilic cells, all cytologically bland with at most mild atypia. The papillary cores are oedematous to fibrotic and contain a conspicuous inflammatory infiltrate rich in neutrophils and eosinophils. Background endometriosis is present and there is no stromal invasion.',

  // --- Clear cell -----------------------------------------------------------
  'Clear cell borderline tumour':
    'The tumour is adenofibromatous, comprising small glands and cysts widely separated by abundant dense fibromatous stroma. The glands are lined by one to two layers of cuboidal, flattened and hobnail cells with clear cytoplasm and mildly enlarged hyperchromatic nuclei with small nucleoli, and contain inspissated eosinophilic secretions. There is no confluent, solid, papillary or cribriform growth and no stromal invasion.',

  'Clear cell carcinoma':
    'The tumour shows admixed papillary, tubulocystic and solid architecture. The papillae are small, rounded and non-branching with hyalinised fibrovascular cores, the tubules and cysts contain dense eosinophilic secretions, and the solid areas comprise sheets of polyhedral cells separated by delicate fibrovascular septa. The cells have abundant clear to granular eosinophilic cytoplasm with sharp cell borders and bulge into the lumina as hobnail forms, with markedly atypical nuclei showing irregular contours and prominent nucleoli. Mitotic figures are infrequent.',

  // --- Brenner --------------------------------------------------------------
  'Borderline Brenner tumour':
    'The tumour forms papillae covered by multilayered transitional-type epithelium set against a dense fibromatous stroma, with mild to moderate nuclear atypia and scattered mitotic figures. Smooth-contoured nests of bland transitional epithelium with oval, longitudinally grooved nuclei are present at the periphery, together with calcification. There is no stromal invasion.',

  'Malignant Brenner tumour':
    'The tumour invades the stroma as irregular, angulated nests, cords and single cells with transitional-type features and an associated desmoplastic response. The cells have moderate eosinophilic cytoplasm and markedly atypical, hyperchromatic nuclei with readily identified mitotic figures, and show focal squamous differentiation. Nests of benign and borderline Brenner epithelium are present at the periphery.',

  // --- Other carcinomas -----------------------------------------------------
  'Mesonephric-like adenocarcinoma':
    'The tumour shows an admixture of architectural patterns within the same lesion, predominantly small closely packed tubules containing dense eosinophilic intraluminal secretions, together with papillary, solid, retiform, sieve-like and spindle cell areas. The cells are flattened to cuboidal with scant cytoplasm and mildly to moderately atypical nuclei showing vesicular chromatin and nuclear grooves. There is no squamous or mucinous differentiation.',

  'Small cell carcinoma, hypercalcaemic type':
    'The tumour grows diffusely as sheets of tightly packed, discohesive small round cells with scant cytoplasm, hyperchromatic nuclei and small nucleoli, interrupted by follicle-like spaces containing eosinophilic fluid. Mitotic figures are numerous and necrosis is extensive. A population of larger cells with abundant eosinophilic cytoplasm and rhabdoid morphology is present, and the intervening stroma is focally myxoid.',

  'Dedifferentiated carcinoma':
    'The tumour is biphasic with an abrupt, sharply demarcated transition between the two components. The differentiated component is a low-grade endometrioid adenocarcinoma with confluent glands and squamous morules. The undifferentiated component grows as patternless diffuse sheets of monomorphic, discohesive medium-sized cells with variable eosinophilic to rhabdoid cytoplasm, numerous mitotic figures and geographic necrosis, and lies deep to the glandular component.',

  'Undifferentiated carcinoma, NOS':
    'The tumour grows as diffuse, patternless sheets of monomorphic medium-sized cells that are at least focally discohesive, with variable eosinophilic and rhabdoid cytoplasm and vesicular nuclei with small nucleoli. Nests, glands, papillae and trabeculae are absent, there is no squamous or mucinous differentiation, mitotic figures are numerous and there is extensive geographic necrosis.',

  'Carcinosarcoma (malignant mixed Mullerian tumour)':
    'The tumour comprises intimately admixed carcinomatous and sarcomatous elements, both markedly atypical with numerous mitotic figures. The carcinomatous component is of high-grade serous type, forming solid and papillary areas with pleomorphic nuclei and prominent nucleoli. The sarcomatous component consists of pleomorphic spindle and rounded cells in a fascicular to haphazard arrangement, with intracytoplasmic hyaline globules. Necrosis and lymphovascular invasion are present.',

  'Mixed epithelial borderline tumour (specify types and percentages)':
    'The tumour contains two morphologically distinct borderline components, each retaining the architecture and cytology of the corresponding pure tumour type and merging at their interface. Neither component shows stromal invasion.',

  'Mixed carcinoma (specify types and percentages)':
    'The tumour contains two morphologically distinct carcinomatous components, each reproducing the architecture and cytology of the corresponding pure tumour type, with an abrupt interface between them.',

  // --- Mesenchymal ----------------------------------------------------------
  'Endometrioid stromal sarcoma, low-grade':
    'The tumour permeates the ovarian stroma as irregular tongues and islands of monotonous oval to short spindled cells with scant cytoplasm and minimal nuclear atypia, resembling proliferative-phase endometrial stroma and whorling around abundant delicate arteriolar-type vessels. Hyalinised collagen bands and foamy histiocytes are present, mitotic figures are infrequent and necrosis is absent. Lymphovascular invasion is identified.',

  'Endometrioid stromal sarcoma, high-grade':
    'The tumour invades in a permeative, tongue-like fashion as vaguely nested sheets of round cells with scant cytoplasm and uniformly atypical, hyperchromatic nuclei, supported by a delicate network of arborising curvilinear vessels. Mitotic figures are numerous, tumour cell necrosis and lymphovascular invasion are present, and a low-grade spindle cell component of bland cells in a fibromyxoid matrix is admixed.',

  'Adenosarcoma':
    'The tumour is biphasic, with widely spaced, non-invasive Müllerian-type glands distributed throughout a predominant cellular stroma. Periglandular cuffs of condensed hypercellular stroma and intraglandular polypoid protrusions of stroma are present, producing a phyllodes-like architecture. The stromal cells are spindled with mild to moderate atypia and scattered mitotic figures, and the glandular epithelium is cytologically bland to mildly atypical.',

  'Leiomyosarcoma':
    'The tumour is composed of intersecting fascicles of spindle cells with abundant eosinophilic fibrillary cytoplasm, blunt-ended nuclei and moderate to marked nuclear atypia including pleomorphic and multinucleated forms. Mitotic figures are numerous and coagulative tumour cell necrosis is present.',

  'Fibrosarcoma':
    'The tumour is composed of spindle cells in densely cellular sheets and intersecting fascicles producing a herringbone architecture, with mild to moderate nuclear atypia and elongated hyperchromatic nuclei. Mitotic figures are readily identified throughout.',

  // --- Sex cord-stromal -----------------------------------------------------
  'Granulosa cell tumour, adult type':
    'The tumour is composed of small, uniform cuboidal to polygonal cells with scant cytoplasm and pale, angulated nuclei showing longitudinal grooves, arranged in diffuse sheets with trabecular, corded and insular areas. Microfollicular areas with Call-Exner bodies containing eosinophilic material are present. The intervening stroma is hypervascular and focally fibrothecomatous, and mitotic figures are infrequent.',

  'Granulosa cell tumour, juvenile type':
    'The tumour grows in diffuse and nodular sheets punctuated by macrofollicles and microfollicles containing eosinophilic secretions. The cells are primitive-appearing with abundant luteinised eosinophilic to vacuolated cytoplasm and round to oval, hyperchromatic nuclei with irregular contours and small nucleoli, without nuclear grooves. Mitotic figures are numerous.',

  'Steroid cell tumour, NOS':
    'The tumour grows diffusely, with focal nested and corded areas, and is composed of polygonal to rounded cells with distinct cell borders, central round nuclei with conspicuous nucleoli and moderate to abundant cytoplasm ranging from granular eosinophilic to vacuolated and spongy. Lipochrome pigment is present within the cytoplasm. Nuclear atypia is slight, mitotic figures are scant and the intervening stroma is sparse and focally hyalinised. Reinke crystals are not identified.',

  'Steroid cell tumour, malignant':
    'The tumour is composed of sheets and nests of polygonal cells with granular eosinophilic to vacuolated cytoplasm and distinct cell borders, showing moderate to marked nuclear atypia with enlarged hyperchromatic nuclei and prominent nucleoli. Mitotic figures are readily identified, and there is coagulative tumour cell necrosis with intratumoral haemorrhage.',

  'Sertoli-Leydig cell tumour': (g) =>
    isG1(g)
      ? 'The tumour is composed of well-formed open and compressed Sertoli cell tubules separated by clusters of Leydig cells within the intervening stroma. The Sertoli cells are low columnar to cuboidal with pale cytoplasm and oval, focally grooved nuclei with small nucleoli; the Leydig cells have abundant eosinophilic cytoplasm containing lipofuscin pigment and Reinke crystals, with round nuclei and prominent nucleoli. Nuclear atypia and mitotic activity are minimal.'
      : isG3(g)
        ? 'The tumour grows as diffuse sarcomatoid sheets and fascicles of immature Sertoli cells with scant cytoplasm and moderately to markedly atypical, hyperchromatic spindled nuclei, with only rare vague tubule formation. Mitotic figures are numerous, and small clusters of Leydig cells with eosinophilic cytoplasm are present within the intervening stroma.'
        : 'The tumour is lobulated, with alternating hypocellular and hypercellular areas in which Sertoli cells form compressed tubules, cords and solid sheets. The Sertoli cells have scant cytoplasm and oval to spindled, hyperchromatic nuclei with mild to moderate atypia and scattered mitotic figures, and small clusters of Leydig cells with abundant eosinophilic cytoplasm lie within the intervening stroma.',

  'Other sex cord-stromal tumour (specify type)':
    'The tumour is composed of sex cord-type cells with scant to moderate pale cytoplasm and bland, angulated nuclei, arranged in nests, tubules and cords around deposits of eosinophilic basement membrane-like material, set within a fibromatous stroma. Nuclear atypia is minimal and mitotic figures are infrequent.',

  // --- Germ cell ------------------------------------------------------------
  'Immature teratoma':
    'The tumour contains mature elements derived from all three germ layers, admixed with immature neuroepithelium forming primitive tubules, rosettes and pseudorosettes together with sheets of spindled neuroectodermal cells. The immature cells have scant cytoplasm, hyperchromatic nuclei and numerous mitotic figures.',

  'Teratoma with malignant transformation (specify type)':
    'Within a mature cystic teratoma containing elements of all three germ layers there is a confluent somatic malignancy, which invades the surrounding teratomatous tissue and ovarian stroma as irregular infiltrating nests with an associated desmoplastic response, marked nuclear atypia and numerous mitotic figures.',

  'Malignant struma ovarii (specify type)':
    'Within a background of struma ovarii comprising macrofollicles and microfollicles containing colloid, lined by cuboidal to columnar cells with small round nuclei, there is a thyroid-type carcinoma. The carcinoma forms confluent papillary and follicular growth composed of cells with crowded, overlapping, elongated nuclei showing optically clear chromatin, irregular contours, longitudinal grooves and nuclear pseudoinclusions.',

  'Dysgerminoma':
    'The tumour is composed of nests and sheets of large uniform polygonal cells with clear to eosinophilic cytoplasm and distinct cell membranes, separated by delicate fibrous septa containing a dense lymphocytic infiltrate and epithelioid histiocytes. The nuclei are central and round to oval with angulated, squared-off contours, coarse chromatin and prominent nucleoli, and mitotic figures are numerous. Non-caseating granulomas and lymphoid follicles are present within the septa.',

  'Yolk sac tumour':
    'The tumour shows admixed reticular-microcystic, endodermal sinus and solid patterns. The reticular areas form a loose meshwork of anastomosing channels and microcysts lined by primitive cells with clear to eosinophilic cytoplasm set in a myxoid stroma, and the endodermal sinus areas contain Schiller-Duval bodies comprising a central vessel ensheathed by tumour cells projecting into a sinusoidal space. Intracytoplasmic and extracellular eosinophilic hyaline globules are conspicuous, and mitotic figures are numerous.',

  'Embryonal carcinoma':
    'The tumour is composed of sheets and nests of large primitive cells with abundant amphophilic cytoplasm, indistinct cell borders and pleomorphic vesicular nuclei with coarse nuclear membranes and prominent nucleoli, with focal papillary and glandular formations. Mitotic figures are numerous and there is confluent tumour cell necrosis. Scattered multinucleated syncytiotrophoblast-like cells and eosinophilic hyaline globules are present.',

  'Gonadoblastoma':
    'The tumour comprises rounded nests of admixed germ cells and small sex cord cells surrounding deposits of eosinophilic basement membrane-like material. The germ cells are large with clear cytoplasm, round nuclei and prominent nucleoli; the sex cord cells are small and bland with angulated, focally grooved nuclei, palisading at the periphery of the nests and encircling the eosinophilic material in a Call-Exner-like arrangement. The basement membrane material is calcified, with psammomatous and larger mulberry-like concretions.',

  'Choriocarcinoma, non-gestational type':
    'The tumour is composed of mononucleated cytotrophoblast and intermediate trophoblast with clear cytoplasm and vesicular nuclei, rimmed by multinucleated syncytiotrophoblast with abundant basophilic to amphophilic cytoplasm, arranged around central blood channels. There is extensive haemorrhage and necrosis, and mitotic figures are numerous.',

  'Mixed malignant germ cell tumour (specify types and percentages)':
    'The tumour contains two morphologically distinct malignant germ cell components, each reproducing the architecture and cytology of the corresponding pure tumour type, lying side by side with an abrupt interface.',

  // --- Miscellaneous --------------------------------------------------------
  'Gastrointestinal stromal tumour':
    'The tumour is composed of intersecting fascicles of monotonous spindle cells with elongated blunt-ended nuclei, abundant pale eosinophilic cytoplasm and distinctive perinuclear vacuolisation. Nuclear palisading and perivascular hyalinisation are present, and nuclear pleomorphism is inconspicuous.',

  'Solitary fibrous tumour, malignant':
    'The tumour is composed of ovoid to fusiform spindle cells with indistinct cell borders arranged haphazardly and in short ill-defined fascicles within a collagenous stroma, centred on dilated, branching, thin-walled staghorn vessels. The tumour is hypercellular with moderate to marked nuclear atypia, numerous mitotic figures and coagulative necrosis.',

  'Desmoplastic small round cell tumour':
    'The tumour is composed of sharply demarcated nests, trabeculae and single files of small round cells separated by abundant desmoplastic stroma. The cells are uniform with scant cytoplasm, indistinct cell borders and small hyperchromatic nuclei with inconspicuous nucleoli, with peripheral palisading of the nests. Mitotic figures are numerous and there is focal tumour cell necrosis.',
};

// Serous tubal intraepithelial carcinoma, printed when STIC is recorded among the
// additional findings. https://www.pathologyoutlines.com/topic/fallopiantubesstic.html
export const STIC_SENTENCE =
  'The fimbrial mucosa shows a focus of serous tubal intraepithelial carcinoma, in which the epithelium is stratified and denuded of ciliated cells, with loss of nuclear polarity, enlarged hyperchromatic pleomorphic nuclei, prominent nucleoli and epithelial fractures with exfoliation of small cell clusters, without stromal invasion.';

// Peritoneal implant morphology, keyed to the implants field values.
// https://www.pathologyoutlines.com/topic/ovarytumorserousborderline.html
export const IMPLANT_MORPHOLOGY = {
  'Present, non-invasive epithelial':
    'The peritoneal implants consist of hierarchically branching papillary tufts without supporting stroma, lying on the mesothelial surface and within cystic mesothelial invaginations, with a smooth, non-destructive interface with the underlying tissue.',
  'Present, non-invasive desmoplastic':
    'The peritoneal implants consist of papillae and clusters of hypereosinophilic cells set within an inflamed, granulation tissue-like fibroblastic stroma, remaining serosa-based with a smooth, sharply delineated contour and no destruction of underlying tissue.',
};

/**
 * Morphology sentence for a histological type.
 * @param {string} typeName exact histType option string
 * @param {string} grade raw gradeWho value, e.g. 'G2: Moderately differentiated'
 * @returns {string} sentence, or '' when no morphology is defined for the type
 */
export function typeMorphology(typeName, grade) {
  const entry = MORPHOLOGY[typeName];
  if (!entry) return '';
  return typeof entry === 'function' ? entry(grade || '') : entry;
}

/**
 * Morphology sentence for a peritoneal implant value.
 * @param {string} implantValue raw implants field value
 * @returns {string} sentence, or '' when the value carries no morphology
 */
export function implantMorphology(implantValue) {
  const key = String(implantValue || '').replace(/\s*\(specify site\)\s*$/, '').trim();
  return IMPLANT_MORPHOLOGY[key] || '';
}
