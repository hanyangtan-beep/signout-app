// Shared microscopic morphology vocabulary for the appendix synoptic template. Descriptions
// follow the WHO Classification of Tumours: Digestive System Tumours, 5th ed (2019), as
// reflected in the expert-authored chapters (pathologyoutlines.com/topic/appendixadenocarcinoma.html
// and appendixmucinousneoplasm.html), the Tang goblet-cell-classification literature
// (PMC5801558) and the WHO 2019 NEN and MiNEN rules used across the GI templates. Sentences
// slot after the derived opener in the "Tumour histology" paragraph, so none repeats the
// grade words. British spelling throughout.

const byGrade = (g1, g2, g3) => (grade) => (/^G1/.test(grade) ? g1 : /^G2/.test(grade) ? g2 : /^G3/.test(grade) || /^G4/.test(grade) ? g3 : '');

/** typeName -> (grade, gobletGrade) => sentence ('' when nothing useful can be said). */
export const MORPHOLOGY = {
  // Non-mucinous appendiceal adenocarcinoma resembles colorectal adenocarcinoma: neoplastic
  // glands of columnar cells with hyperchromatic nuclei, often cribriform and with necrotic
  // debris; WHO 5th ed two-tier grading on gland formation (low grade ≥50%, high grade <50%).
  'Adenocarcinoma': byGrade(
    'Irregularly infiltrating glands lined by columnar cells with hyperchromatic nuclei, often cribriform and containing necrotic debris, are set in desmoplastic stroma, resembling colorectal adenocarcinoma.',
    'Irregularly infiltrating glands lined by columnar cells with hyperchromatic nuclei, often cribriform and containing necrotic debris, are set in desmoplastic stroma, resembling colorectal adenocarcinoma.',
    'The infiltrate is dominated by fused, abortive glands and solid sheets of high-grade atypical cells (less than half of the tumour forming glands), set in desmoplastic stroma.'
  ),
  // Mucinous adenocarcinoma: >50% extracellular mucin; irregular, jagged glands or single
  // cells, strips and clusters float in the mucin; infiltrative rather than pushing growth;
  // often high-grade cytology (AJCC 8e tiered mucinous grading: G2 conventional; G3 when any
  // signet-ring component).
  'Mucinous adenocarcinoma': () => 'Extracellular mucin pools occupy more than half of the tumour and contain irregular, jagged glands, strips, clusters and single cells of neoplastic columnar epithelium in an infiltrative, non-pushing pattern.',
  // LAMN (Pathology Outlines appendixmucinousneoplasm): villous or occasionally flat
  // proliferation of mucinous epithelium with abundant apical mucin, elongated nuclei and
  // low-grade atypia; by definition no infiltrative growth; effacement of the muscularis
  // mucosae with crypt loss and lymphoid atrophy; mucin, epithelium or both may dissect
  // beyond the appendiceal wall.
  'Low-grade appendiceal mucinous neoplasm': () => 'A villous to flat proliferation of mucinous epithelium shows abundant apical mucin, elongated nuclei and low-grade nuclear atypia, effaces the muscularis mucosae with crypt loss and lymphoid atrophy, and expands the wall by pushing growth without infiltrative invasion.',
  // HAMN: same pushing push-to-wall behaviour as LAMN but with high-grade epithelial features;
  // convoluted architecture including micropapillary or cribriform areas.
  'High-grade appendiceal mucinous neoplasm': () => 'The mucinous epithelium shows high-grade cytological and architectural features, with nuclear stratification, complex convoluted glands and cribriform or micropapillary areas, yet the growth remains pushing without infiltrative invasion.',
  // Signet-ring cell carcinoma: WHO/Pathology Outlines threshold of more than 50% signet-ring
  // cells; singly discohesive infiltrate; worse prognosis note.
  'Signet-ring cell carcinoma (poorly cohesive carcinoma)': () => 'More than half of the tumour is composed of discohesive signet-ring cells with intracytoplasmic mucin displacing the nucleus, infiltrating singly and in small clusters without gland formation.',
  // Goblet cell adenocarcinoma (formerly carcinoid), Tang groups A/B/C (PMC5801558):
  // A = typical: small concentric nests of well-defined goblet cells with minimal atypia,
  // minimal desmoplasia; B = signet-ring cell type: large irregular clusters of goblet or
  // signet-ring cells with single-file infiltration, significant atypia and desmoplasia
  // destroying the wall; C = poorly differentiated: confluent sheets of signet-ring cells or
  // gland-forming areas indistinguishable from poorly differentiated adenocarcinoma.
  // House label uses WHO-current "goblet cell adenocarcinoma" (QMH page: "Goblet cell
  // carcinoid"); matches the benign appendicectomy upgrade map. Spec notes the discrepancy.
  'Goblet cell adenocarcinoma': (grade, gobletGrade) => {
    const g = String(gobletGrade || '').replace(/group C/i, 'group 3').replace(/group B/i, 'group 2').replace(/group A/i, 'group 1');
    if (/group 3/i.test(g)) return 'Confluent sheets of signet-ring cells and gland-forming areas indistinguishable from poorly differentiated adenocarcinoma predominate, with only focal goblet-cell morphology (Tang group C).';
    if (/group 2/i.test(g)) return 'Large, irregular clusters of goblet and signet-ring cells show single-file and single-cell infiltration with significant atypia and desmoplasia destroying the appendiceal wall (Tang group B).';
    return 'Small nests arranged as concentric tubules of well-defined goblet cells infiltrate the wall with minimal atypia, minimal desmoplasia and little architectural distortion (Tang group A).';
  },
  // Poorly differentiated NECs: WHO 2019 morphology as for the oesophageal / gastric chapters.
  'Large cell neuroendocrine carcinoma': () => 'Organoid nests and trabeculae of medium-to-large cells with coarse chromatin, prominent nucleoli and moderately abundant cytoplasm show geographic necrosis; the mitotic rate exceeds 20 mitoses per 2 mm².',
  'Small cell neuroendocrine carcinoma': () => 'Sheets of small, round-to-oval cells with scant cytoplasm, finely granular chromatin, absent or inconspicuous nucleoli and marked nuclear moulding show crush artefact, extensive necrosis and numerous mitoses.',
  'Neuroendocrine carcinoma (poorly differentiated)': () => 'Sheets and nests of markedly atypical cells with extensive necrosis and a high mitotic rate show an unequivocal neuroendocrine immunophenotype, in keeping with a poorly differentiated neuroendocrine carcinoma.',
  // MiNEN (WHO 2019): both a neuroendocrine and a non-neuroendocrine component, each
  // constituting more than 30% of the tumour.
  'Mixed neuroendocrine-non-neuroendocrine neoplasm (Mixed adenoneuroendocrine carcinoma)': () => 'Invasive adenocarcinoma and neuroendocrine carcinoma components each constitute more than 30% of the tumour, meeting the WHO definition of a mixed neuroendocrine-non-neuroendocrine neoplasm (MiNEN).',
  // Medullary carcinoma (WHO 5th ed GI cancers): syncytial sheets of large vesicular cells
  // with pushing borders and a prominent tumour-infiltrating lymphocyte response; commonly
  // mismatch-repair deficient.
  'Medullary carcinoma': () => 'Syncytial sheets of large cells with vesicular nuclei and pushing borders carry a prominent lymphoplasmacytic infiltrate, a morphology commonly associated with mismatch-repair deficiency.',
  // Adenosquamous carcinoma: biphasic glandular + squamous components; WHO prescribes no
  // minimum proportion for either (as oesophageal adenosquamous).
  'Adenosquamous carcinoma': () => 'Invasive adenocarcinoma (tubular, mucin-producing glands) and squamous cell carcinoma (keratin pearls, intercellular bridges) components coexist, either sharply demarcated or merging gradually; WHO does not prescribe a minimum proportion for either component.',
  // Undifferentiated carcinoma: no identifiable line of differentiation; diagnosis of
  // exclusion (as the oesophageal WHO definition).
  'Undifferentiated carcinoma': () => 'Sheets and nests of high-grade pleomorphic cells show no unequivocal line of differentiation; the diagnosis is reached after exclusion of glandular, squamous and neuroendocrine differentiation.'
};

/**
 * Per-type microscopic sentence for the appendiceal resection part ('' when nothing useful
 * can be said — carcinoma-type-not-determined, Other or an unrewarding grade). Goblet cell
 * adenocarcinoma varies with the recorded Tang / WHO group.
 */
export function typeMorphology(typeName, grade, gobletGrade) {
  const fn = MORPHOLOGY[typeName];
  return fn ? fn(grade || '', gobletGrade || '') : '';
}
