// Shared microscopic morphology vocabulary for the gastric synoptic template. Descriptions
// follow the WHO Classification of Tumours: Digestive System Tumours, 5th ed (2019), as
// reflected in the expert-authored Pathology Outlines chapters (stomachcarcinomageneral,
// stomachWHOclassification, stomachlel, stomachneuroendocrine, stomachgastroblastoma), the
// Verona/WHO poorly cohesive carcinoma consensus (PMC9412924), the fundic-gland-type
// literature (PMC7585219) and the 2019 NEN grading table (G1 <2 mitoses/2 mm² and Ki-67 <3%;
// G2 2-20 and 3-20%; G3 >20). Sentences slot after the derived opener in the "Tumour
// histology" paragraph, so none repeats the grade words. British spelling throughout.

const byGrade = (g1, g2, g3) => (grade) => (/^G1/.test(grade) ? g1 : /^G2/.test(grade) ? g2 : /^G3/.test(grade) ? g3 : '');

/** typeName -> (grade) => sentence ('' when nothing useful can be said). */
export const MORPHOLOGY = {
  // WHO 2019: tubular carcinoma graded on the well-formedness of the tubules; intestinal
  // lineage cells with apical mucin, growing along cohesive fronts.
  'Tubular adenocarcinoma': byGrade(
    'Well-formed, branching tubules lined by atypical columnar epithelium with apical mucin infiltrate broad cohesive fronts, set in desmoplastic stroma.',
    'Moderately formed tubules of atypical columnar epithelium alternate with cribriform and incomplete glandular structures, set in desmoplastic stroma.',
    'The infiltrate shows only rudimentary tubule formation, with predominant solid, nested or corded growth of high-grade atypical cells in desmoplastic stroma.'
  ),
  // Verona/WHO PCC-GC consensus (PMC9412924): neoplastic cells isolated or in small aggregates
  // with no well-formed glands; signet-ring cells carry a central optically clear globoid
  // mucin droplet and an eccentrically displaced nucleus; >90% signet-ring morphology defines
  // the SRC type, <90% and >10% defines PCC with an SRC component, and NOS cells may mimic
  // histiocytes or lymphocytes or show pleomorphic bizarre nuclei.
  'Poorly cohesive carcinoma (including signet-ring cell carcinoma and other variants)': () => 'Discohesive tumour cells infiltrate singly or in small aggregates without well-formed glands; signet-ring cells show a central optically clear, globoid droplet of cytoplasmic mucin and an eccentrically displaced nucleus, while other cells may mimic histiocytes or show deeply eosinophilic or pleomorphic cytoplasm.',
  // WHO 2019: more than 50% of the tumour composed of extracellular mucin containing floating
  // glands, strips or clusters (PMC9281538).
  'Mucinous adenocarcinoma': () => 'Pools of extracellular mucin predominate and contain floating strips, glands and clusters of neoplastic columnar epithelium.',
  // WHO 2019: exophytic fronds with fibrovascular cores lined by atypical columnar
  // epithelium; graded on gland architecture as for tubular carcinoma.
  'Papillary adenocarcinoma': byGrade(
    'Exophytic papillary fronds with delicate fibrovascular cores are lined by a single layer of atypical columnar epithelium with elongated nuclei.',
    'Papillary fronds with fibrovascular cores carry stratified atypical columnar epithelium, locally complex and cribriform.',
    'The papillary architecture is overlaid by solid growth of high-grade atypical cells with only focal lumen formation.'
  ),
  // WHO 2019 / Pathology Outlines: mixed carcinoma combines discrete glandular (tubular or
  // papillary) and diffuse / poorly cohesive components; no percentage cutoff for component
  // proportion is currently prescribed.
  'Mixed carcinoma (mixture of discrete glandular and signet-ring / poorly cohesive components)': () => 'Discrete glandular (tubular or papillary) and diffuse, poorly cohesive carcinoma components coexist as separable areas.',
  // WHO 2019 hepatoid adenocarcinoma: polygonal cells resembling hepatocytes with abundant
  // eosinophilic cytoplasm, centrally placed nuclei and hyaline globules, growing in
  // trabeculae; typically expresses AFP, glypican-3 and SALL4.
  'Hepatoid adenocarcinoma': () => 'Sheets and trabeculae of polygonal cells with abundant eosinophilic cytoplasm, centrally placed nuclei and occasional hyaline globules resemble hepatocytes and express hepatocellular markers (AFP, glypican-3 and SALL4).',
  // WHO 2019 medullary carcinoma with lymphoid stroma (Pathology Outlines stomachlel): large
  // oval cells with vesicular to clear nuclei, prominent nucleoli, abundant eosinophilic
  // cytoplasm and poorly defined borders, in microalveolar / thin trabecular sheets embedded
  // in a dense non-desmoplastic lymphoid stroma; the majority are EBV-associated (EBER
  // positive in all tumour cells).
  'Carcinoma with lymphoid stroma': () => 'Syncytial sheets, microalveolar nests and thin trabeculae of large cells with vesicular nuclei, prominent nucleoli and eosinophilic cytoplasm with indistinct borders are embedded in a dense, non-desmoplastic lymphoid stroma.',
  // Fundic-gland-type adenocarcinoma (PMC7585219): low-grade oxyntic-gland tumour,
  // chief-cell predominant, arising deep in the mucosa beneath intact foveolar epithelium,
  // with irregularly dilated and anastomosing glands infiltrating the submucosa; mild
  // cytological atypia; MUC6 and pepsinogen-I positive.
  'Adenocarcinoma of fundic-gland type': () => 'Irregularly dilated, anastomosing glands of low-grade oxyntic cells arise deep in the mucosa beneath an intact foveolar surface and infiltrate the lamina propria and submucosa; the differentiation is predominantly toward chief cells, expressing MUC6 and pepsinogen-I.',
  // Gastric micropapillary carcinoma: tight clusters of atypical cells without fibrovascular
  // cores float within clear stromal lacunae in an inside-out pattern, associated with a high
  // rate of lymphovascular invasion and nodal metastasis.
  'Micropapillary adenocarcinoma': () => 'Small, tight clusters of high-grade cells without fibrovascular cores show inside-out apical-basal polarity and float within clear stromal lacunae.',
  // Primary gastric SCC: pure squamous differentiation with keratinisation and intercellular
  // bridges; extension of an oesophageal or cardial primary must be excluded.
  'Squamous cell carcinoma': () => 'Invasive nests of atypical squamous epithelium show keratinisation and intercellular bridges; no glandular component is identified.',
  // Biphasic adenocarcinoma + squamous carcinoma components, demarcated or merging; WHO
  // prescribes no minimum proportion (as for the oesophageal counterpart).
  'Adenosquamous carcinoma': () => 'Invasive adenocarcinoma (tubular, mucin-producing glands) and squamous carcinoma (keratin pearls and intercellular bridges) components coexist, sharply demarcated or merging gradually.',
  // WHO 2019: sheets of high-grade cells without identifiable differentiation; keratin
  // expression variable and the diagnosis rests on exclusion (as in the oesophageal form).
  'Undifferentiated carcinoma': () => 'The tumour grows in sheets and nests of high-grade pleomorphic cells without glandular, squamous or neuroendocrine differentiation.',
  // WHO 2019 NET: organoid nests, trabeculae and rosette patterns of uniform neuroendocrine
  // cells with coarsely stippled salt-and-pepper chromatin; grading by mitotic count per
  // 2 mm² and Ki-67 index.
  'Neuroendocrine tumour': byGrade(
    'Uniform neuroendocrine cells with coarsely stippled salt-and-pepper chromatin form organoid nests and trabeculae, with low mitotic activity.',
    'Uniform neuroendocrine cells with coarsely stippled salt-and-pepper chromatin form organoid nests and trabeculae, with intermediate mitotic activity.',
    'Well-differentiated neuroendocrine cells in organoid nests and trabeculae show brisk mitotic activity while retaining well-differentiated cytology.'
  ),
  // Gastroblastoma (Pathology Outlines stomachgastroblastoma): biphasic epitheliomesenchymal
  // neoplasm with sheets of monotonous spindle cells and cords/clusters of epithelial cells
  // forming vague to well-formed glands, low mitotic rate; associated with the MALAT1-GLI1
  // fusion.
  'Gastroblastoma': () => 'The tumour is biphasic, with sheets of monotonous bland spindle cells intermixed with cords, clusters and vague glands of epithelial-type cells and a low mitotic rate.',
  // Poorly differentiated NEC, large cell type: organoid nests and trabeculae of
  // medium-to-large cells with coarse chromatin, prominent nucleoli and moderately abundant
  // cytoplasm; geographic necrosis and >20 mitoses per 2 mm².
  'Large cell neuroendocrine carcinoma': () => 'Organoid nests and trabeculae of medium-to-large cells with coarse chromatin, prominent nucleoli and moderately abundant cytoplasm show geographic necrosis and brisk mitotic activity.',
  // Poorly differentiated NEC, small cell type: sheets of small cells with scant cytoplasm,
  // finely granular chromatin, inconspicuous nucleoli, pronounced nuclear moulding, crush
  // artefact, extensive necrosis and numerous mitoses.
  'Small cell neuroendocrine carcinoma': () => 'Sheets of small, round-to-oval cells with scant cytoplasm, finely granular chromatin, absent or inconspicuous nucleoli and marked nuclear moulding show crush artefact, extensive necrosis and numerous mitoses.',
  // Poorly differentiated NEC, NOS: high-grade neuroendocrine cells with necrosis and a high
  // mitotic rate; confirmed by synaptophysin and/or chromogranin expression.
  'Neuroendocrine carcinoma (poorly differentiated)': () => 'Sheets and nests of markedly atypical cells with extensive necrosis and a high mitotic rate show an unequivocal neuroendocrine immunophenotype, in keeping with a poorly differentiated neuroendocrine carcinoma.',
  // MiNEN (WHO 2019): both a neuroendocrine and a non-neuroendocrine component, each
  // constituting more than 30% of the tumour.
  'Mixed adenocarcinoma-neuroendocrine carcinoma': () => 'Invasive adenocarcinoma and neuroendocrine carcinoma components are both present, each constituting more than 30% of the tumour (mixed neuroendocrine-non-neuroendocrine neoplasm).',
  'Mixed adenocarcinoma-neuroendocrine tumour': () => 'Invasive adenocarcinoma and a well-differentiated neuroendocrine tumour component are both present, each constituting more than 30% of the tumour (mixed neuroendocrine-non-neuroendocrine neoplasm).'
};

/**
 * Per-type microscopic sentence for the gastric resection part ('' when nothing useful can
 * be said — Other or an unrewarding grade).
 */
export function typeMorphology(typeName, grade) {
  const fn = MORPHOLOGY[typeName];
  return fn ? fn(grade || '') : '';
}
