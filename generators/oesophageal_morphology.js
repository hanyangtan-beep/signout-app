// Shared microscopic morphology vocabulary for the oesophageal templates (resection synoptic
// and biopsy). One short descriptive sentence per WHO 2019 type; the ordinary squamous cell
// carcinoma and adenocarcinoma sentences vary with the recorded grade. Sentences slot after
// the derived opener in the histology paragraph, so none repeats the grade words. British
// spelling throughout. Drives histologyPara in generators/oesophageal_carcinoma.js and the
// cancer sentences in generators/oesophageal.js.

const byGrade = (g1, g2, g3) => (grade) => (/^G1/.test(grade) ? g1 : /^G2/.test(grade) ? g2 : /^G3/.test(grade) ? g3 : '');

/** typeName -> (grade) => sentence ('' when nothing useful can be said). */
export const MORPHOLOGY = {
  'Squamous cell carcinoma': byGrade(
    'Invasive nests of atypical squamous epithelium show prominent keratinisation, with keratin pearls and conspicuous intercellular bridges.',
    'Invasive nests of atypical squamous epithelium show focal keratinisation and identifiable intercellular bridges, without keratin pearl formation.',
    'The tumour forms solid sheets of pleomorphic squamoid cells without keratin pearls; squamous differentiation is confirmed only by focal individual cell keratinisation.'
  ),
  'Basaloid squamous cell carcinoma': () => 'Invasive nests of closely packed basaloid cells with peripheral palisading and comedo-type necrosis surround deposits of hyaline basement membrane-like material.',
  'Spindle cell squamous cell carcinoma': () => 'Fascicles of atypical, pleomorphic spindle cells are admixed with, and maturing into, squamous carcinoma, in keeping with sarcomatoid change.',
  'Verrucous squamous cell carcinoma': () => 'Broad pushing tongues of highly differentiated keratinising squamous epithelium with minimal cytological atypia invade with a blunt, bulbous front.',
  'Adenocarcinoma': byGrade(
    'The invasive component forms well-defined glands lined by atypical columnar epithelium, set in desmoplastic stroma.',
    'The invasive component forms moderately developed glands with focal cribriform architecture, set in desmoplastic stroma.',
    'The invasive component forms poorly developed glands, fused architecture and solid sheets of atypical columnar cells, set in desmoplastic stroma.'
  ),
  'Mucinous adenocarcinoma': () => 'Large lakes of extracellular mucin contain floating strips and nests of neoplastic glandular epithelium.',
  'Signet-ring cell carcinoma (poorly cohesive carcinoma)': () => 'Poorly cohesive signet-ring cells with intracytoplasmic mucin infiltrate singly and in small clusters, accompanied by desmoplastic stroma.',
  'Adenosquamous carcinoma': () => 'The tumour is a genuine admixture of invasive gland-forming and squamous carcinoma components.',
  'Mucoepidermoid carcinoma': () => 'The tumour comprises an admixture of mucin-secreting, intermediate and epidermoid cells.',
  'Adenoid cystic carcinoma': () => 'Cribriform and tubular nests of basaloid cells surround hyaline basement membrane-like material and merge with the adjacent surface epithelium.',
  'Undifferentiated carcinoma': () => 'Sheets and nests of markedly pleomorphic cells without an identifiable line of differentiation.',
  'Lymphoepithelioma-like carcinoma': () => 'Syncytial sheets of atypical epithelial cells are enveloped by a dense lymphoid-rich infiltrate.',
  'Large cell neuroendocrine carcinoma': () => 'Large polygonal cells with organoid nesting, peripheral palisading, geographic necrosis and frequent mitoses.',
  'Small cell neuroendocrine carcinoma': () => 'Sheets of small cells with scant cytoplasm, finely granular stippled chromatin, nuclear moulding, crush artefact and a high mitotic rate.',
  'Neuroendocrine carcinoma (poorly differentiated)': () => 'Sheets of markedly atypical neuroendocrine cells with necrosis and a high mitotic rate, in keeping with a poorly differentiated neuroendocrine carcinoma.',
  'Mixed squamous cell carcinoma-neuroendocrine carcinoma': () => 'An admixture of invasive squamous carcinoma and neuroendocrine carcinoma components, each exceeding 30% of the tumour, is present.',
  'Mixed adenocarcinoma-neuroendocrine carcinoma': () => 'An admixture of invasive glandular carcinoma and neuroendocrine carcinoma components, each exceeding 30% of the tumour, is present.',
  'Mixed adenocarcinoma-neuroendocrine tumour': () => 'An admixture of invasive glandular carcinoma and a well-differentiated neuroendocrine tumour component is present, each exceeding 30% of the tumour.'
};

/**
 * Per-type microscopic sentence for a resection or biopsy part, varying with the recorded
 * grade for the common squamous cell carcinoma and adenocarcinoma ('' when nothing useful
 * can be said — Other, type-cannot-be-determined or an unrewarding grade).
 */
export function typeMorphology(typeName, grade) {
  const fn = MORPHOLOGY[typeName];
  return fn ? fn(grade || '') : /^G\d: Well-differentiated neuroendocrine tumour/.test(typeName || '')
    ? 'Uniform neuroendocrine cells with salt-and-pepper chromatin form nests and trabeculae.'
    : '';
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
