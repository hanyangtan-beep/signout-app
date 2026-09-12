// Shared microscopic morphology vocabulary for the oesophageal templates (resection synoptic
// and biopsy). Descriptions follow the WHO Classification of Tumours: Digestive System
// Tumours, 5th ed (2019) and current expert references (Pathology Outlines expert-authored
// chapters at pathologyoutlines.com; ITBCC consensus for tumour budding). The common squamous
// cell carcinoma and adenocarcinoma narratives vary with the recorded grade. Sentences slot
// after the derived opener in the histology paragraph, so none repeats the grade words.
// British spelling throughout. Drives histologyPara in generators/oesophageal_carcinoma.js
// and the cancer sentences in generators/oesophageal.js.

const byGrade = (g1, g2, g3) => (grade) => (/^G1/.test(grade) ? g1 : /^G2/.test(grade) ? g2 : /^G3/.test(grade) ? g3 : '');

/** typeName -> (grade) => sentence ('' when nothing useful can be said). */
export const MORPHOLOGY = {
  // WHO 2019 definition: "a malignant epithelial tumour displaying squamous cell
  // differentiation characterized by keratinocyte type cells with intercellular bridges or
  // keratinisation"; grading on cytological atypia, mitotic activity and keratinisation —
  // Grade 1: enlarged cells, abundant eosinophilic cytoplasm, prominent keratinisation,
  // pushing margin, cells well ordered. Grade 2: evident atypia, less ordered, mitoses easily
  // found. Grade 3: predominantly basal-like cells in nests, ± central necrosis.
  'Squamous cell carcinoma': byGrade(
    'Invasive nests of enlarged keratinocytes with abundant eosinophilic cytoplasm mature in an orderly fashion, with prominent keratinisation, keratin pearls and conspicuous intercellular bridges; the invasive front is broad and pushing.',
    'Invasive nests and cords of atypical squamous epithelium show disturbed nuclear polarity with readily identifiable mitotic figures; differentiation rests on focal keratinisation and identifiable intercellular bridges, without keratin pearl formation.',
    'The tumour forms solid nests of basal-like cells with high nuclear to cytoplasmic ratios, hyperchromasia and nuclear membrane irregularities, frequently surrounding central comedo-type necrosis; squamous lineage is affirmed only by focal individual cell keratinisation.'
  ),
  // Solid to cribriform nests, lobules and trabeculae of basaloid cells nuclei with peripheral
  // palisading and central comedo-type necrosis; microcystic spaces contain basophilic
  // basement membrane-like material without true lumina; frequent mitoses; stromal
  // hyalinisation.
  'Basaloid squamous cell carcinoma': () => 'Solid, cribriform and trabecular nests of closely packed basaloid cells show hyperchromatic, peripherally palisading nuclei and central comedo-type necrosis; microcystic spaces contain basophilic basement membrane-like material without true glandular lumina, and mitotic figures are numerous.',
  // Biphasic: sarcomatoid spindle-cell component resembling high-grade pleomorphic sarcoma
  // (± bizarre giant cells, heterologous elements) dominates; the epithelial component is
  // usually squamous and often limited or only in situ.
  'Spindle cell squamous cell carcinoma': () => 'Fascicles of atypical spindle cells with high-grade pleomorphism, resembling undifferentiated sarcoma, dominate the tumour; sampling shows transition to, or admixture with, conventional squamous carcinoma, in keeping with sarcomatoid metaplasia of the epithelial component.',
  // Well-differentiated papillary fronds of squamous epithelium with variable hyper- and
  // parakeratosis, bland cytology with only mild atypia, and pushing invasion with blunt,
  // bulbous epithelial projections.
  'Verrucous squamous cell carcinoma': () => 'Papillary fronds of highly differentiated squamous epithelium with hyperkeratosis and parakeratosis overlie blunt, bulbous rete projections that invade with a uniformly pushing front; cytological atypia is minimal.',
  // Tubular pattern most common: irregular, single or anastomosing glands lined by single to
  // stratified malignant columnar epithelium in desmoplastic stroma; lineage gastric or
  // intestinal. Grading reflects gland formation: well >95% glands, moderate 50-95% and
  // poorly differentiated <50%.
  'Adenocarcinoma': byGrade(
    'Well-formed, irregularly infiltrating tubular glands lined by a single layer of atypical columnar epithelium are set in desmoplastic stroma, of gastric- or intestinal-type cytology.',
    'Irregular, variably anastomosing glands lined by stratified atypical columnar epithelium with focal cribriform change are set in desmoplastic stroma.',
    'The infiltrate is dominated by fused, abortive glands and solid sheets of high-grade atypical cells with only occasional lumen formation, set in desmoplastic stroma.'
  ),
  // WHO 2019: >50% of the tumour composed of extracellular mucin containing floating glands,
  // strips or clusters of neoplastic epithelium.
  'Mucinous adenocarcinoma': () => 'Extracellular mucin pools occupy more than half of the tumour and contain floating strips, glands and clusters of neoplastic columnar epithelium.',
  // Poorly cohesive signet-ring cells with intracytoplasmic mucin displacing the nucleus
  // infiltrate singly and in small clusters; WHO assigns any carcinoma with signet-ring
  // morphology to grade 3.
  'Signet-ring cell carcinoma (poorly cohesive carcinoma)': () => 'Poorly cohesive cells with intracytoplasmic mucin displacing the nucleus infiltrate the wall singly and in small clusters without gland formation; tumours of this morphology are high grade by definition.',
  // Biphasic: adenocarcinoma and squamous carcinoma components with distinct boundaries or
  // gradual transition; squamous areas show keratin pearls and intercellular bridges,
  // glandular areas form mucin-producing tubules; WHO does not set a minimum proportion for
  // either component.
  'Adenosquamous carcinoma': () => 'Invasive adenocarcinoma (tubular, mucin-producing glands) and squamous cell carcinoma (keratin pearls, intercellular bridges) components coexist, either sharply demarcated or merging gradually; WHO does not prescribe a minimum proportion for either component.',
  // Tight admixture of intermediate cells, mucin-producing cells and malignant squamoid cells.
  'Mucoepidermoid carcinoma': () => 'The tumour nests are composed of a tight admixture of intermediate-type cells, mucin-producing cells and malignant squamoid cells.',
  // Cribriform nests of basaloid ductal-type and myoepithelial cells; pseudolumina filled with
  // hyaline basement membrane-like material.
  'Adenoid cystic carcinoma': () => 'Cribriform nests of basaloid ductal and myoepithelial cells enclose pseudolumina filled with hyaline basement membrane-like material, with a minority of true ductal lumina.',
  // Sheets and nests of high-grade cells without identifiable differentiation; pancytokeratin
  // expression variable (diffuse to patchy or negative); diagnosis of exclusion after
  // glandular, squamous, neuroendocrine, melanocytic and lymphoid lines are tested.
  'Undifferentiated carcinoma': () => 'Sheets and nests of high-grade pleomorphic cells, locally with rhabdoid features and geographic necrosis, show no unequivocal line of differentiation; the diagnosis is reached after exclusion of glandular, squamous and neuroendocrine differentiation.',
  // WHO 2019: undifferentiated or poorly differentiated carcinoma in syncytial sheets of
  // large epithelioid cells with vesicular nuclei and prominent nucleoli, enveloped by a
  // dense, non-neoplastic lymphoplasmacytic infiltrate; EBV association in a subset.
  'Lymphoepithelioma-like carcinoma': () => 'Syncytial sheets and nests of large epithelioid tumour cells with vesicular nuclei, prominent nucleoli and occasional clear cytoplasm are enveloped by a dense, mature lymphoplasmacytic infiltrate.',
  // Poorly differentiated NEC, large cell type: organoid nests and trabeculae of medium-to-
  // large cells with coarse chromatin, prominent nucleoli and moderately abundant cytoplasm;
  // geographic necrosis, numerous mitoses and Ki-67 typically >20% (often >60%).
  'Large cell neuroendocrine carcinoma': () => 'Organoid nests and trabeculae of medium-to-large cells with coarse chromatin, prominent nucleoli and moderately abundant cytoplasm show geographic necrosis; the mitotic rate exceeds 20 mitoses per 2 mm².',
  // Poorly differentiated NEC, small cell type: sheets of small cells with scant cytoplasm,
  // finely granular chromatin, inconspicuous nucleoli and pronounced nuclear moulding;
  // extensive necrosis, crush artefact and numerous mitoses.
  'Small cell neuroendocrine carcinoma': () => 'Sheets of small, round-to-oval cells with scant cytoplasm, finely granular chromatin, absent or inconspicuous nucleoli and marked nuclear moulding show crush artefact, extensive necrosis and numerous mitoses.',
  // Poorly differentiated NEC not further specified: high-grade neuroendocrine cells with
  // necrosis and high mitotic rate (>20 mitoses per 2 mm²); confirmed by expression of
  // synaptophysin and/or chromogranin.
  'Neuroendocrine carcinoma (poorly differentiated)': () => 'Sheets and nests of markedly atypical cells with extensive necrosis and a high mitotic rate show an unequivocal neuroendocrine immunophenotype, in keeping with a poorly differentiated neuroendocrine carcinoma.',
  // MiNEN (WHO 2019): both a neuroendocrine and a non-neuroendocrine component each
  // constituting more than 30% of the tumour.
  'Mixed squamous cell carcinoma-neuroendocrine carcinoma': () => 'Invasive squamous cell carcinoma and neuroendocrine carcinoma components each constitute more than 30% of the tumour, meeting the WHO definition of a mixed neuroendocrine-non-neuroendocrine neoplasm.',
  'Mixed adenocarcinoma-neuroendocrine carcinoma': () => 'Invasive adenocarcinoma and neuroendocrine carcinoma components each constitute more than 30% of the tumour, meeting the WHO definition of a mixed neuroendocrine-non-neuroendocrine neoplasm (MiNEN).',
  'Mixed adenocarcinoma-neuroendocrine tumour': () => 'Invasive adenocarcinoma and a well-differentiated neuroendocrine tumour component each constitute more than 30% of the tumour, meeting the WHO definition of a mixed neuroendocrine-non-neuroendocrine neoplasm (MiNEN).'
};

/**
 * Per-type microscopic sentence for a resection or biopsy part, varying with the recorded
 * grade for the common squamous cell carcinoma and adenocarcinoma ('' when nothing useful
 * can be said — Other, type-cannot-be-determined or an unrewarding grade). Well-
 * differentiated neuroendocrine tumours take a grade-specific sentence keyed to the WHO 2019
 * mitotic / Ki-67 tiers (G1 <2 mitoses per 2 mm² and Ki-67 <3%; G2 2-20 and 3-20%; G3 >20).
 */
export function typeMorphology(typeName, grade) {
  const fn = MORPHOLOGY[typeName];
  if (fn) return fn(grade || '');
  const net = /^G(\d): Well-differentiated neuroendocrine tumour/.exec(typeName || '');
  if (!net) return '';
  const activity = { 1: 'with sparse mitotic activity (fewer than 2 mitoses per 2 mm²)', 2: 'with moderate mitotic activity (2-20 mitoses per 2 mm²)', 3: 'with frequent mitoses (more than 20 mitoses per 2 mm²), yet retaining well-differentiated cytology' }[net[1]] || '';
  return `Uniform neuroendocrine cells with coarsely stippled salt-and-pepper chromatin form organoid nests and trabeculae, ${activity}.`;
}

const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const num = (x) => { const n = parseFloat(String(x ?? '').trim()); return Number.isFinite(n) ? n : null; };

/** Ancillary-study sentence: HER2, MMR and PD-L1 combined into one clause (empty when none recorded). */
export function ihcSentence(v) {
  const bits = [];
  const her2 = v.her2 || '';
  if (her2 && her2 !== 'Not performed') bits.push(`HER2 ${lc1(her2)}`);
  const mmr = v.mmr || '';
  if (mmr && mmr !== 'Not performed') bits.push(/^Retained/.test(mmr) ? 'mismatch repair proteins show retained nuclear expression (proficient mismatch repair)' : `mismatch repair immunohistochemistry shows ${lc1(mmr)}`);
  const cps = num(v.pdl1Cps);
  if (cps !== null) bits.push(`PD-L1 combined positive score ${cps}`);
  if (!bits.length) return '';
  if (bits.length === 1 && mmr && mmr !== 'Not performed') return bits[0].replace(/^m/, 'M') + '.';
  return `Immunohistochemistry: ${bits.join('; ')}.`;
}
