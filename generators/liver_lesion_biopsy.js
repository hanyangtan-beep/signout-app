// Liver biopsy (mass lesion) generator (biopsy). Card: docs/roadmap.md "Liver biopsy — neoplastic" (user request
// 2026-09-14; pulled by the user 2026-10-02), the pair of the HCC resection synoptic (generators/hcc.js).
//
// What the report carries follows RCPath G050 (liver dataset, September 2022) section 10.4, "Reporting of needle
// core biopsy specimens for the investigation of focal lesions": the biopsy size, whether lesional and
// non-lesional liver are present, a morphological description of the lesion, the stains, a comment on the
// non-lesional liver "if sufficient is included", and a single-line diagnosis. Metastases follow RCPath G167
// (cancer of unknown primary, 2024): the immunoprofile and the primary site it points to. The diagnosis list is
// the WHO 5th edition digestive classification with the 6th edition (2026) adenoma subtypes (sonic hedgehog
// HCA) and the small- and large-duct cholangiocarcinomas; grounding, panels and pitfalls are in
// docs/reference/liver_lesion_biopsy-morphology.md. CAP and ICCR publish no adult liver-mass biopsy protocol.
//
// House forms, measured on the five-year biopsy file (aggregate counts only): "METASTATIC ADENOCARCINOMA, in
// keeping with colorectal primary" (no article), "METASTATIC WELL-DIFFERENTIATED NEUROENDOCRINE TUMOUR, grade 2",
// the HCC grade first in sentence case ("Moderately differentiated HEPATOCELLULAR CARCINOMA"), and the background
// liver as on the medical liver biopsy ("CHRONIC HEPATITIS B with CIRRHOSIS (Ishak stage 6/6)"), shared with the
// HCC resection through generators/liver_background.js. The site line is the medical liver biopsy's
// ("LIVER, segment 7 mass, biopsy").
//
// Immunohistochemistry is typed the way it is jotted ("HepPar-1+, arginase-1+, CK7-, CK19-", or "positive: ...;
// negative: ...") and printed as one sentence; parseIhc() also feeds the Checks, which look for the confirmatory
// stains of each lesion. Printed text is released-report prose only: no thresholds, criteria or advice. Those
// belong to the Checks below. Wording is protected by tests/liver_lesion_biopsy.test.js — change it only deliberately.

import { checks } from './_house.js';
import { specimenName as medicalSpecimenName, organPhrase } from './liver_biopsy.js';
import { GRADE_MORPHOLOGY, SUBTYPE_MORPHOLOGY, FIBROLAMELLAR_MORPHOLOGY } from './hcc.js';
import * as BG from './liver_background.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const stripDot = (s) => String(s || '').trim().replace(/[.;:\s]+$/, '');
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

// ---------- diagnosis families ----------

export const HEPATOCELLULAR = ['Hepatocellular carcinoma', 'Fibrolamellar carcinoma', 'Hepatocellular adenoma', 'Focal nodular hyperplasia',
  'Atypical hepatocellular neoplasm', 'High-grade dysplastic nodule', 'Hepatoblastoma'];
export const METASTATIC = ['Metastatic adenocarcinoma', 'Metastatic carcinoma (specify type)', 'Metastatic neuroendocrine tumour',
  'Metastatic neuroendocrine carcinoma', 'Metastatic melanoma', 'Metastatic gastrointestinal stromal tumour'];
const PRIMARY_DX = METASTATIC.slice(0, 4);
const LESIONAL = ['Hepatocellular adenoma', 'Focal nodular hyperplasia', 'Atypical hepatocellular neoplasm', 'High-grade dysplastic nodule',
  'Bile duct adenoma', 'Bile duct hamartoma', 'Haemangioma', 'Abscess', 'Hydatid cyst', 'Inflammatory pseudotumour', 'Other (specify)'];
const NO_LESION = ['Necrotic tissue only', 'Non-lesional liver only'];
const NOT_MALIGNANT = [...LESIONAL.filter((d) => d !== 'Other (specify)'), 'PEComa (epithelioid angiomyolipoma)', 'Solitary fibrous tumour',
  'Inflammatory myofibroblastic tumour', ...NO_LESION, 'Other (specify)'];

const dxOf = (v) => v.dx || 'Metastatic adenocarcinoma';
const suspicious = (v) => v.qualifier === 'Suspicious for' && !NOT_MALIGNANT.includes(dxOf(v));

// ---------- specimen ----------

export const specimenName = (part) => medicalSpecimenName(part);

function specimenSentence(v) {
  const n = num(v.cores);
  const cores = n === 1 ? 'a core of liver' : n && n <= 10 ? `${WORDS[n]} cores of liver` : n ? `${n} cores of liver` : 'cores of liver';
  const len = num(v.coreLength);
  return `Sections show ${cores}${len ? ` measuring ${len} mm in ${n === 1 ? 'length' : 'aggregate length'}` : ''}.`;
}

// ---------- immunohistochemistry ----------

// Typed stain names, normalised (lower case, no spaces, hyphens, dots, slashes or brackets), to the printed name.
const STAIN = {
  heppar1: 'HepPar-1', heppar: 'HepPar-1', hepar1: 'HepPar-1', hepatocyteparaffin1: 'HepPar-1', arginase1: 'arginase-1', arginase: 'arginase-1',
  arg1: 'arginase-1', glypican3: 'glypican-3', glypican: 'glypican-3', gpc3: 'glypican-3', hsp70: 'HSP70', gs: 'glutamine synthetase',
  glutaminesynthetase: 'glutamine synthetase', afp: 'AFP', sall4: 'SALL4', cd10: 'CD10', pcea: 'pCEA', cea: 'CEA', cd68: 'CD68', ck7: 'CK7',
  k7: 'CK7', cytokeratin7: 'CK7', ck19: 'CK19', k19: 'CK19', cytokeratin19: 'CK19', ck20: 'CK20', k20: 'CK20', cytokeratin20: 'CK20',
  ck56: 'CK5/6', ae1ae3: 'AE1/AE3', panck: 'AE1/AE3', pancytokeratin: 'AE1/AE3', cam52: 'CAM5.2', ck818: 'CK8/18', moc31: 'MOC31',
  berep4: 'BerEP4', ema: 'EMA', cdx2: 'CDX2', satb2: 'SATB2', ttf1: 'TTF-1', napsina: 'napsin A', napsin: 'napsin A', gata3: 'GATA3',
  er: 'ER', oestrogenreceptor: 'ER', estrogenreceptor: 'ER', pr: 'PR', pax8: 'PAX8', pax2: 'PAX2', nkx31: 'NKX3.1', psa: 'PSA', p40: 'p40',
  p63: 'p63', s100p: 'S100P', muc5ac: 'MUC5AC', muc6: 'MUC6', crp: 'CRP', saa: 'SAA', serumamyloida: 'SAA', amyloida: 'SAA', lfabp: 'LFABP',
  betacatenin: 'beta-catenin', bcatenin: 'beta-catenin', ass1: 'ASS1', ptgds: 'PTGDS', wt1: 'WT1', calretinin: 'calretinin', synaptophysin: 'synaptophysin',
  syn: 'synaptophysin', chromogranin: 'chromogranin', chromogranina: 'chromogranin', cga: 'chromogranin', insm1: 'INSM1', sstr2: 'SSTR2',
  sstr2a: 'SSTR2', cd56: 'CD56', isl1: 'ISL1', s100: 'S100', sox10: 'SOX10', melana: 'Melan-A', mart1: 'Melan-A', hmb45: 'HMB45',
  prame: 'PRAME', cd117: 'CD117', ckit: 'CD117', kit: 'CD117', dog1: 'DOG1', erg: 'ERG', cd31: 'CD31', cd34: 'CD34', camta1: 'CAMTA1',
  tfe3: 'TFE3', stat6: 'STAT6', alk: 'ALK', ros1: 'ROS1', sma: 'SMA', desmin: 'desmin', caldesmon: 'caldesmon', cathepsink: 'cathepsin K',
  mdm2: 'MDM2', cdk4: 'CDK4', ini1: 'INI-1', smarcb1: 'INI-1', cd45: 'CD45', lca: 'CD45', cd20: 'CD20', cd79a: 'CD79a', pax5: 'PAX5',
  cd3: 'CD3', cd5: 'CD5', cd30: 'CD30', cd15: 'CD15', bcl2: 'BCL2', bcl6: 'BCL6', mum1: 'MUM1', cyclind1: 'cyclin D1', cd43: 'CD43',
  mpo: 'MPO', myeloperoxidase: 'MPO', lysozyme: 'lysozyme', cd61: 'CD61', tia1: 'TIA-1', eber: 'EBER', igg4: 'IgG4', igg: 'IgG', p53: 'p53',
  p16: 'p16', cd99: 'CD99', myogenin: 'myogenin', vimentin: 'vimentin', hbsag: 'HBsAg', hbcag: 'HBcAg'
};
// Sentence-initial stain names: "Beta-catenin ...", but p53, p16 and pCEA keep their lower case.
const capStain = (s) => (/^p[A-Z0-9]/.test(s) ? s : uc1(s));
const norm = (s) => String(s || '').toLowerCase().replace(/β/g, 'beta').replace(/[\s\-–./()]/g, '');
/** The printed name of a typed stain; unknown names are kept as typed. */
export const stainName = (s) => STAIN[norm(s)] || stripDot(s);
const known = (s) => norm(s) in STAIN;

const MARK = /^(.+?)\s*(\+{1,3}|\(\+\)|\+\/-|-ve|\+ve|-|−|–|\b(?:focal(?:ly)?|patchy)(?:\s*(?:\+|positive))?|\bweak(?:ly)?(?:\s*(?:\+|positive))?|\bpositive\b|\bpos\b|\bnegative\b|\bneg\b|\bretained\b|\bintact\b|\blost\b|\bloss\b)(?:\s*(\([^()]*\)))?$/i;
function resultOf(m) {
  const t = m.toLowerCase();
  if (/^(focal|patchy)/.test(t) || t === '+/-') return 'focal';
  if (/^weak/.test(t) || t === '(+)') return 'weak';
  if (/^(retained|intact)$/.test(t)) return 'retained';
  if (/^(lost|loss)$/.test(t)) return 'lost';
  if (/^(-|−|–|-ve|neg|negative)$/.test(t)) return 'neg';
  return 'pos';
}
const GROUP = /^(positive|pos|negative|neg|focal(?:ly)?\s+positive|weak(?:ly)?\s+positive|retained|lost)\s*(?:for\b|:)?\s*(.+)$/i;
const KI67 = /^ki-?67\D{0,12}?(\d+(?:\.\d+)?)\s*%?$/i;

/**
 * Typed immunohistochemistry -> { results: [{ name, result, note }], unparsed: [text], ki67 }. result is pos, focal,
 * weak, neg, retained or lost; note is a trailing bracket ("ER+ (90%)"). "CK7, CK19 negative" gives both the result;
 * a token that is neither a known stain nor marked is kept as typed.
 */
export function parseIhc(text) {
  const results = [];
  const unparsed = [];
  let ki67 = null;
  const src = String(text || '').trim().replace(/\.\s*$/, '');
  if (!src) return { results, unparsed, ki67 };
  for (const seg of src.split(/\s*;\s*/).filter(Boolean)) {
    const g = GROUP.exec(seg);
    if (g && !MARK.test(seg.split(/\s*,\s*/)[0])) {
      for (const name of g[2].split(/\s*,\s*|\s+and\s+/).filter(Boolean)) results.push({ name: stainName(name), result: resultOf(g[1].split(/\s+/)[0]), note: '' });
      continue;
    }
    let pending = [];
    for (const tok of seg.split(/\s*,\s*|\s+and\s+/).map((t) => t.trim()).filter(Boolean)) {
      const k = KI67.exec(tok);
      if (k) { ki67 = parseFloat(k[1]); continue; }
      const m = MARK.exec(tok);
      if (m) {
        const result = resultOf(m[2]);
        for (const p of pending) results.push({ name: stainName(p), result, note: '' });
        pending = [];
        results.push({ name: stainName(m[1]), result, note: m[3] || '' });
      } else if (known(tok)) pending.push(tok);
      else unparsed.push(tok);
    }
    unparsed.push(...pending);
  }
  const seen = new Set();
  return { results: results.filter((r) => (seen.has(r.name) ? false : seen.add(r.name))), unparsed, ki67 };
}

/** The result recorded for a stain ('pos', 'focal', 'weak', 'neg', 'retained', 'lost') or null. */
export function resultFor(v, name) {
  const r = parseIhc(v.ihc).results.find((x) => x.name === name);
  return r ? r.result : null;
}
const positive = (v, ...names) => names.some((n) => ['pos', 'focal', 'weak'].includes(resultFor(v, n)));
const negative = (v, ...names) => names.some((n) => resultFor(v, n) === 'neg' || resultFor(v, n) === 'lost');
const recorded = (v, ...names) => names.some((n) => resultFor(v, n) !== null);

const GS_SENTENCE = {
  'Map-like': 'Glutamine synthetase shows a map-like pattern.',
  'Diffuse strong': 'Glutamine synthetase shows diffuse strong staining.',
  'Diffuse heterogeneous (starry sky)': 'Glutamine synthetase shows diffuse heterogeneous (starry sky) staining.',
  Patchy: 'Glutamine synthetase shows patchy staining.',
  'Rim at the periphery': 'Glutamine synthetase shows a rim of staining at the periphery of the lesion.',
  'Perivenular only': 'Glutamine synthetase shows the normal perivenular pattern only.',
  Negative: 'Glutamine synthetase is negative in the lesion.'
};
const CD34_SENTENCE = {
  'Diffuse sinusoidal': 'CD34 shows diffuse sinusoidal staining.',
  'Patchy sinusoidal': 'CD34 shows patchy sinusoidal staining.',
  'No sinusoidal staining': 'CD34 shows no sinusoidal staining.'
};
const RETICULIN_SENTENCE = {
  Retained: 'The reticulin framework is retained.',
  'Focally reduced': 'The reticulin framework is focally reduced.',
  Lost: 'There is loss of the reticulin framework.'
};
const BETA_CATENIN_SENTENCE = {
  'Nuclear staining': 'Beta-catenin shows nuclear staining.',
  'Membranous only': 'Beta-catenin shows membranous staining only.'
};

function cellNoun(v) {
  if (suspicious(v)) return 'the atypical cells';
  if (dxOf(v) === 'Non-lesional liver only') return 'the hepatocytes';
  return LESIONAL.includes(dxOf(v)) ? 'the lesional cells' : 'the tumour cells';
}

/** "On immunohistochemistry, the tumour cells are positive for A and B, and negative for C." plus the patterns. */
export function ihcSentences(v) {
  const { results, unparsed, ki67 } = parseIhc(v.ihc);
  const by = (r) => results.filter((x) => x.result === r).map((x) => (x.note ? `${x.name} ${x.note}` : x.name));
  const bits = [];
  if (by('pos').length) bits.push(`positive for ${listJoin(by('pos'))}`);
  if (by('focal').length) bits.push(`focally positive for ${listJoin(by('focal'))}`);
  if (by('weak').length) bits.push(`weakly positive for ${listJoin(by('weak'))}`);
  if (by('neg').length) bits.push(`negative for ${listJoin(by('neg'))}`);
  const s = [];
  if (bits.length) s.push(`On immunohistochemistry, ${cellNoun(v)} are ${bits.length > 1 ? `${bits.slice(0, -1).join(', ')}, and ${bits[bits.length - 1]}` : bits[0]}.`);
  if (by('retained').length) s.push(`${capStain(listJoin(by('retained')))} expression is retained.`);
  if (by('lost').length) s.push(`There is loss of ${listJoin(by('lost'))} expression.`);
  if (unparsed.length) s.push(`${capStain(unparsed.join(', '))}.`);
  const hep = HEPATOCELLULAR.includes(dxOf(v));
  if (hep) for (const [field, map] of [['gs', GS_SENTENCE], ['cd34', CD34_SENTENCE], ['reticulin', RETICULIN_SENTENCE], ['betaCatenin', BETA_CATENIN_SENTENCE]]) {
    if (map[v[field]]) s.push(map[v[field]]);
  }
  const k = num(v.ki67) ?? ki67;
  if (k !== null) s.push(`The Ki-67 proliferation index is approximately ${k}%.`);
  if (stripDot(v.stainsNote)) s.push(`${uc1(stripDot(v.stainsNote))}.`);
  return s;
}

// ---------- the lesion ----------

const HCC_GRADE_KEY = { 'Well differentiated': 'G1: Well differentiated', 'Moderately differentiated': 'G2: Moderately differentiated', 'Poorly differentiated': 'G3: Poorly differentiated' };
const gradeOf = (g) => (g && g !== 'Not assessable' ? g : '');
const HB_WORDS = { 'Fetal, low mitotic activity': 'fetal (low mitotic activity)', 'Fetal, mitotically active': 'fetal (mitotically active)', 'Mixed epithelial and mesenchymal': 'mixed epithelial and mesenchymal' };
const HCA_MORPHOLOGY = {
  'HNF1A-inactivated': 'The hepatocytes are steatotic.',
  Inflammatory: 'There is sinusoidal dilatation, with patchy inflammation and ductular reaction.',
  'Beta-catenin-activated inflammatory': 'There is sinusoidal dilatation, with patchy inflammation and ductular reaction.',
  'Sonic hedgehog': 'There are haemorrhagic and peliotic areas.'
};
const CCA_PATTERN = {
  'Large duct type': 'forming glands of columnar, mucin-secreting cells',
  'Small duct type': 'composed of small ductules and cords of cuboidal, non-mucinous cells',
  'Not determined': 'forming irregular glands'
};

// (v, c) -> sentences, where c holds the subject: "The core is" / "The cores are" and "contains" / "contain".
const MORPHOLOGY = {
  'Hepatocellular carcinoma': (v, c) => {
    const g = gradeOf(v.hccGrade);
    const sub = v.hccSubtype ? ` of ${lc1(v.hccSubtype)} subtype` : '';
    return [`${c.are} infiltrated by ${g ? `${lc1(g)} ` : ''}hepatocellular carcinoma${sub}.`, GRADE_MORPHOLOGY[HCC_GRADE_KEY[g]], SUBTYPE_MORPHOLOGY[lc1(v.hccSubtype || '')]];
  },
  'Fibrolamellar carcinoma': (v, c) => [`${c.are} infiltrated by fibrolamellar carcinoma.`, FIBROLAMELLAR_MORPHOLOGY],
  'Hepatocellular adenoma': (v, c) => [`${c.contain} a hepatocellular lesion composed of benign hepatocytes in plates one to two cells thick, with unpaired arteries and no portal tracts.`, HCA_MORPHOLOGY[v.hcaSubtype]],
  'Focal nodular hyperplasia': (v, c) => [`${c.contain} a hepatocellular lesion composed of benign hepatocytes in plates one to two cells thick, with fibrous septa containing thick-walled vessels, ductular reaction and inflammation, and no normal portal tracts.`],
  'Atypical hepatocellular neoplasm': (v, c) => [`${c.contain} a well-differentiated hepatocellular neoplasm with focal architectural and cytological atypia.`],
  'High-grade dysplastic nodule': (v, c) => [`${c.contain} a hepatocellular nodule with increased cell density and small cell change, with retained portal tracts and no stromal invasion.`],
  Hepatoblastoma: (v, c) => {
    const p = arr(v.hbPatterns).map((x) => HB_WORDS[x] || lc1(x));
    return [`${c.are} infiltrated by hepatoblastoma${p.length ? `, with ${listJoin(p)} pattern${p.length > 1 ? 's' : ''}` : ''}.`, 'The tumour is composed of small primitive cells with hepatocytic differentiation.'];
  },
  'Intrahepatic cholangiocarcinoma': (v, c) => [`${c.are} infiltrated by ${v.ccaGrade ? `${lc1(v.ccaGrade)} ` : ''}adenocarcinoma ${CCA_PATTERN[v.ccaType || 'Not determined']}, set in a desmoplastic stroma.`],
  'Combined hepatocellular-cholangiocarcinoma': (v, c) => [`${c.are} infiltrated by carcinoma with intimately admixed hepatocellular and glandular components.`],
  'Adenocarcinoma, intrahepatic or metastatic': (v, c) => [`${c.are} infiltrated by adenocarcinoma forming irregular glands, set in a desmoplastic stroma.`],
  'Bile duct adenoma': (v, c) => [`${c.contain} a lesion composed of small, uniform tubules lined by a single layer of cuboidal cells without atypia, in a fibrous stroma.`],
  'Bile duct hamartoma': (v, c) => [`${c.contain} a lesion composed of dilated, irregular and branching bile ducts lined by bland flattened to cuboidal cells and containing bile or proteinaceous material, in a dense fibrous stroma.`],
  'Metastatic adenocarcinoma': (v, c) => [v.primarySite === 'Colorectal'
    ? `${c.are} infiltrated by adenocarcinoma forming cribriform glands of tall columnar cells, with luminal necrotic debris.`
    : `${c.are} infiltrated by adenocarcinoma forming irregular glands lined by pleomorphic columnar cells, set in a desmoplastic stroma.`],
  'Metastatic carcinoma (specify type)': (v, c) => [`${c.are} infiltrated by ${lc1(stripDot(v.carcinomaType)) || 'carcinoma'}.`],
  'Metastatic neuroendocrine tumour': (v, c) => [`${c.are} infiltrated by a well-differentiated neuroendocrine tumour composed of nests and trabeculae of uniform cells with finely granular chromatin.`],
  'Metastatic neuroendocrine carcinoma': (v, c) => [v.necType === 'Large cell'
    ? `${c.are} infiltrated by large cell neuroendocrine carcinoma composed of nests of large cells with vesicular chromatin and prominent nucleoli, with frequent mitoses and necrosis.`
    : `${c.are} infiltrated by small cell neuroendocrine carcinoma composed of sheets of small cells with scant cytoplasm, finely granular chromatin and nuclear moulding, with frequent mitoses and necrosis.`],
  'Metastatic melanoma': (v, c) => [`${c.are} infiltrated by sheets of pleomorphic epithelioid cells with prominent nucleoli.`],
  'Metastatic gastrointestinal stromal tumour': (v, c) => [`${c.are} infiltrated by a spindle cell tumour composed of fascicles of uniform cells with pale eosinophilic cytoplasm.`],
  Haemangioma: (v, c) => [`${c.contain} a vascular lesion composed of dilated channels lined by a single layer of bland endothelial cells, separated by fibrous septa.`],
  'Epithelioid haemangioendothelioma': (v, c) => [`${c.are} infiltrated by cords and nests of epithelioid cells with intracytoplasmic vacuoles, some containing red cells, in a myxohyaline stroma.`],
  Angiosarcoma: (v, c) => [`${c.are} infiltrated by atypical endothelial cells lining anastomosing vascular channels and dissecting the sinusoids, with marked nuclear atypia and mitoses.`],
  'PEComa (epithelioid angiomyolipoma)': (v, c) => [`${c.contain} a tumour composed of epithelioid cells with clear to granular eosinophilic cytoplasm, arranged around blood vessels.`],
  'Solitary fibrous tumour': (v, c) => [`${c.contain} a spindle cell tumour with a patternless architecture, branching thin-walled vessels and collagenous stroma.`],
  'Inflammatory myofibroblastic tumour': (v, c) => [`${c.contain} a proliferation of myofibroblastic spindle cells with a mixed inflammatory infiltrate rich in plasma cells and lymphocytes.`],
  'Undifferentiated embryonal sarcoma': (v, c) => [`${c.are} infiltrated by sheets of highly pleomorphic spindle and stellate cells in a myxoid stroma, with eosinophilic hyaline globules, necrosis and frequent atypical mitoses.`],
  'Lymphoma (specify type)': (v, c) => [`${c.are} infiltrated by sheets of atypical lymphoid cells.`],
  'Myeloid sarcoma': (v, c) => [`${c.are} infiltrated by sheets of immature myeloid cells.`],
  'Carcinoma, not further classifiable': (v, c) => [`${c.are} infiltrated by carcinoma composed of sheets of atypical epithelioid cells.`],
  'Malignant neoplasm, not further classifiable': (v, c) => [`${c.are} infiltrated by a malignant neoplasm composed of sheets of atypical cells.`],
  Abscess: (v, c) => [`${c.contain} necrotic debris with abundant neutrophils, bordered by granulation tissue and fibrosis.`, 'No malignancy is identified.'],
  'Hydatid cyst': (v, c) => [`${c.contain} fragments of an acellular laminated membrane, with a fibrous host reaction.`, 'No malignancy is identified.'],
  'Inflammatory pseudotumour': (v, c) => [`${c.contain} fibrous tissue with a dense lymphoplasmacytic infiltrate.`, 'No malignancy is identified.'],
  'Necrotic tissue only': (v, c) => [`${c.consist} of necrotic tissue, with no viable lesional tissue.`],
  'Non-lesional liver only': () => ['Only non-lesional liver is present; the targeted lesion is not represented.'],
  'Other (specify)': (v, c) => [stripDot(v.dxOther) ? `${c.contain} ${lc1(stripDot(v.dxOther))}.` : '']
};

function subject(v) {
  const one = num(v.cores) === 1;
  return { are: one ? 'The core is' : 'The cores are', contain: one ? 'The core contains' : 'The cores contain', consist: one ? 'The core consists' : 'The cores consist' };
}

export function lesionSentences(v) {
  if (stripDot(v.lesionNotes)) return [`${uc1(stripDot(v.lesionNotes))}.`];
  const c = subject(v);
  if (suspicious(v)) return [`${c.contain} a limited focus of atypical cells, suspicious for ${entityDx(v, { bare: true }).toLowerCase()}.`];
  return (MORPHOLOGY[dxOf(v)] || MORPHOLOGY['Other (specify)'])(v, c).filter(Boolean);
}

function backgroundSentences(v) {
  if (v.nonLesional === 'Not identified') return dxOf(v) === 'Non-lesional liver only' ? [] : ['No non-lesional liver is present.'];
  const bg = BG.backgroundSentences(v);
  if (dxOf(v) === 'Non-lesional liver only') return bg.map((s) => s.replace(/^The background liver shows/, 'The liver shows'));
  const lead = v.nonLesional === 'Scanty' ? 'Only a small amount of non-lesional liver is present.' : bg.length ? '' : 'Non-lesional liver is present.';
  return [lead, ...bg].filter(Boolean);
}

export function microscopy(part) {
  const v = part.values;
  const s = [specimenSentence(v), ...lesionSentences(v), ...ihcSentences(v), ...backgroundSentences(v)];
  const extra = stripDot(v.additionalNotes);
  if (extra) s.push(`${uc1(extra)}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const HCA_DX = {
  'HNF1A-inactivated': 'HNF1A-inactivated subtype', Inflammatory: 'inflammatory subtype',
  'Beta-catenin-activated, exon 3': 'beta-catenin-activated subtype (exon 3)', 'Beta-catenin-activated, exon 7/8': 'beta-catenin-activated subtype (exon 7/8)',
  'Beta-catenin-activated inflammatory': 'beta-catenin-activated inflammatory subtype', 'Sonic hedgehog': 'sonic hedgehog subtype', Unclassified: 'unclassified'
};
const HB_DX = { 'Fetal, low mitotic activity': 'fetal (low mitotic activity)', 'Fetal, mitotically active': 'fetal (mitotically active)' };

/** ", in keeping with colorectal primary" / ", favour lung primary" / ", consistent with the known breast primary"; '' when not stated. */
export function primaryClause(v) {
  if (!PRIMARY_DX.includes(dxOf(v)) || !v.primarySite) return '';
  const site = v.primarySite === 'Other (specify)' ? lc1(stripDot(v.primaryOther)) : lc1(v.primarySite);
  if (!site) return '';
  const basis = v.primaryBasis || 'In keeping with';
  if (basis === 'Favour') return `, favour ${site} primary`;
  if (basis === 'Consistent with the known') return `, consistent with the known ${site} primary`;
  return `, in keeping with ${site} primary`;
}

/** The lesion as the diagnosis names it; `bare` drops the grade (for "Suspicious for ..."). */
export function entityDx(v, { bare = false } = {}) {
  const d = dxOf(v);
  const grade = (g) => (!bare && gradeOf(g) ? `${gradeOf(g)} ` : '');
  switch (d) {
    case 'Hepatocellular carcinoma': return `${grade(v.hccGrade)}HEPATOCELLULAR CARCINOMA${v.hccSubtype ? `, ${lc1(v.hccSubtype)} subtype` : ''}`;
    case 'Fibrolamellar carcinoma': return 'FIBROLAMELLAR CARCINOMA';
    case 'Hepatocellular adenoma': return `HEPATOCELLULAR ADENOMA${HCA_DX[v.hcaSubtype] ? `, ${HCA_DX[v.hcaSubtype]}` : ''}`;
    case 'Focal nodular hyperplasia': return 'FOCAL NODULAR HYPERPLASIA';
    case 'Atypical hepatocellular neoplasm': return 'ATYPICAL HEPATOCELLULAR NEOPLASM, of uncertain malignant potential';
    case 'High-grade dysplastic nodule': return 'HIGH-GRADE DYSPLASTIC NODULE';
    case 'Hepatoblastoma': {
      const p = arr(v.hbPatterns).map((x) => HB_DX[x] || lc1(x));
      return `HEPATOBLASTOMA${p.length && !bare ? `, ${listJoin(p)} pattern${p.length > 1 ? 's' : ''}` : ''}`;
    }
    case 'Intrahepatic cholangiocarcinoma': return `${grade(v.ccaGrade)}INTRAHEPATIC CHOLANGIOCARCINOMA${v.ccaType && v.ccaType !== 'Not determined' ? `, ${lc1(v.ccaType)}` : ''}`;
    case 'Combined hepatocellular-cholangiocarcinoma': return 'COMBINED HEPATOCELLULAR-CHOLANGIOCARCINOMA';
    case 'Adenocarcinoma, intrahepatic or metastatic': return 'ADENOCARCINOMA; intrahepatic cholangiocarcinoma and metastatic adenocarcinoma cannot be distinguished';
    case 'Bile duct adenoma': return 'BILE DUCT ADENOMA';
    case 'Bile duct hamartoma': return 'BILE DUCT HAMARTOMA (von Meyenburg complex)';
    case 'Metastatic adenocarcinoma': return `METASTATIC ADENOCARCINOMA${primaryClause(v)}`;
    case 'Metastatic carcinoma (specify type)': return `METASTATIC ${(stripDot(v.carcinomaType) || 'carcinoma').toUpperCase()}${primaryClause(v)}`;
    case 'Metastatic neuroendocrine tumour': return `METASTATIC WELL-DIFFERENTIATED NEUROENDOCRINE TUMOUR${gradeOf(v.netGrade) && !bare ? `, ${lc1(v.netGrade)}` : ''}${primaryClause(v)}`;
    case 'Metastatic neuroendocrine carcinoma': return `METASTATIC ${(v.necType || 'Small cell').toUpperCase()} NEUROENDOCRINE CARCINOMA${primaryClause(v)}`;
    case 'Metastatic melanoma': return 'METASTATIC MELANOMA';
    case 'Metastatic gastrointestinal stromal tumour': return 'METASTATIC GASTROINTESTINAL STROMAL TUMOUR';
    case 'Haemangioma': return 'HAEMANGIOMA';
    case 'Epithelioid haemangioendothelioma': return 'EPITHELIOID HAEMANGIOENDOTHELIOMA';
    case 'Angiosarcoma': return 'ANGIOSARCOMA';
    case 'PEComa (epithelioid angiomyolipoma)': return 'EPITHELIOID ANGIOMYOLIPOMA (PEComa)';
    case 'Solitary fibrous tumour': return 'SOLITARY FIBROUS TUMOUR';
    case 'Inflammatory myofibroblastic tumour': return 'INFLAMMATORY MYOFIBROBLASTIC TUMOUR';
    case 'Undifferentiated embryonal sarcoma': return 'UNDIFFERENTIATED EMBRYONAL SARCOMA';
    case 'Lymphoma (specify type)': return (stripDot(v.lymphomaType) || 'lymphoma').toUpperCase();
    case 'Myeloid sarcoma': return 'MYELOID SARCOMA';
    case 'Carcinoma, not further classifiable': return 'CARCINOMA, not further classifiable';
    case 'Malignant neoplasm, not further classifiable': return 'MALIGNANT NEOPLASM, not further classifiable';
    case 'Abscess': return 'ABSCESS; no malignancy identified';
    case 'Hydatid cyst': return 'HYDATID CYST; no malignancy identified';
    case 'Inflammatory pseudotumour': return 'INFLAMMATORY PSEUDOTUMOUR; no malignancy identified';
    case 'Necrotic tissue only': return 'NECROTIC TISSUE ONLY; no viable lesional tissue identified';
    case 'Non-lesional liver only': {
      const bg = bare ? '' : backgroundOf(v);
      return `${bg ? `NON-LESIONAL LIVER showing ${bg}` : 'NON-LESIONAL LIVER ONLY'}; the targeted lesion is not represented`;
    }
    default: return (stripDot(v.dxOther) || 'see microscopy').toUpperCase();
  }
}

const backgroundOf = (v) => (v.nonLesional === 'Not identified' ? '' : [BG.backgroundDx(v), BG.nodulesDx(v)].filter(Boolean).join(' and '));

/** "; background liver shows CHRONIC HEPATITIS B with CIRRHOSIS (Ishak stage 6/6)"; '' when nothing is recorded. */
export function backgroundClause(v) {
  const bg = backgroundOf(v);
  return bg && dxOf(v) !== 'Non-lesional liver only' ? `; background liver shows ${bg}` : '';
}

export function diagnosis(part) {
  const v = part.values;
  const head = suspicious(v) ? `Suspicious for ${entityDx(v, { bare: true })}` : entityDx(v);
  return `(${part.label}) ${organPhrase(part)} - ${head}${backgroundClause(v)}`;
}

// ---------- checks ----------

const HEPATOCELLULAR_MARKERS = ['HepPar-1', 'arginase-1', 'glypican-3'];
const NE_MARKERS = ['synaptophysin', 'chromogranin', 'INSM1'];
const SITE_MARKERS = {
  Colorectal: ['CK20', 'CDX2', 'SATB2'], 'Small intestinal': ['CDX2'], Lung: ['TTF-1', 'napsin A'], Breast: ['GATA3', 'ER'], Prostatic: ['NKX3.1', 'PSA'],
  Renal: ['PAX8'], Ovarian: ['PAX8', 'WT1'], Endometrial: ['PAX8', 'ER'], Urothelial: ['GATA3', 'p63'], Thyroid: ['TTF-1', 'PAX8']
};
const NET_FITS = { 'Grade 1': (k) => k < 3, 'Grade 2': (k) => k >= 3 && k <= 20, 'Grade 3': (k) => k > 20 };

export function validate(part) {
  const v = part.values;
  const { out, at, err, warn } = checks();
  const info = (m, f) => at('info', m, f);
  const d = dxOf(v);
  const ihc = parseIhc(v.ihc);
  const ki67 = num(v.ki67) ?? ihc.ki67;
  if (!v.dx) err('Diagnosis is required.', 'dx');
  if (d === 'Other (specify)' && !stripDot(v.dxOther)) err('Specify the diagnosis.', 'dxOther');
  if (num(v.cores) === null) warn('Record the number of cores.', 'cores');
  if (num(v.coreLength) === null) info('Biopsy size: RCPath asks for it in the report (there is no minimum for a targeted biopsy).', 'coreLength');
  if (ihc.unparsed.length) info(`Immunohistochemistry printed as typed: ${ihc.unparsed.join(', ')}.`, 'ihc');
  if (ki67 !== null && (ki67 < 0 || ki67 > 100)) err(`Ki-67 ${ki67}% is not a percentage.`, 'ki67');
  if (v.qualifier === 'Suspicious for' && NOT_MALIGNANT.includes(d)) info('"Suspicious for" applies to malignant diagnoses only, so it is not printed here.', 'qualifier');

  // Hepatocellular lesions (RCPath G050 appendices O and Q; WHO 5th and 6th editions).
  if (d === 'Hepatocellular carcinoma') {
    if (v.hccGrade === 'Poorly differentiated' && !positive(v, ...HEPATOCELLULAR_MARKERS)) warn('Poorly differentiated HCC: no hepatocellular marker (HepPar-1, arginase-1 or glypican-3) is recorded as positive.', 'ihc');
    const three = [positive(v, 'glypican-3'), positive(v, 'HSP70'), v.gs === 'Diffuse strong'].filter(Boolean).length;
    if (v.hccGrade === 'Well differentiated' && three < 2 && v.reticulin !== 'Lost') info('Well-differentiated HCC on a core: RCPath supports it with reticulin loss, or at least two of glypican-3, HSP70 and diffuse glutamine synthetase.', 'reticulin');
    if (positive(v, 'CK7') && positive(v, 'CK19')) info('CK7 and CK19 positive: combined hepatocellular-cholangiocarcinoma needs unequivocal, intimately mixed elements of both on morphology; immunohistochemistry only supports it (ICCR).', 'ihc');
  }
  if (d === 'High-grade dysplastic nodule') {
    const three = [positive(v, 'glypican-3'), positive(v, 'HSP70'), v.gs === 'Diffuse strong'].filter(Boolean).length;
    if (three >= 2) warn('Two or more of glypican-3, HSP70 and diffuse glutamine synthetase are positive, which favours HCC (RCPath).', 'ihc');
    if (v.reticulin === 'Lost') warn('Reticulin loss is a feature of HCC rather than a dysplastic nodule.', 'reticulin');
  }
  if (d === 'Focal nodular hyperplasia') {
    if (v.gs && v.gs !== 'Map-like') warn(`Glutamine synthetase "${v.gs}" is not the map-like pattern of FNH.`, 'gs');
    if (!v.gs) info('FNH on a core: map-like glutamine synthetase confirms it.', 'gs');
  }
  if (d === 'Hepatocellular adenoma') {
    const st = v.hcaSubtype || 'Not determined';
    if (!v.gs) warn('Hepatocellular adenoma: glutamine synthetase is not recorded; beta-catenin activation is recognised only by glutamine synthetase or molecular testing.', 'gs');
    if (['Inflammatory', 'Beta-catenin-activated inflammatory'].includes(st) && !positive(v, 'SAA', 'CRP')) warn('Inflammatory adenoma: SAA or CRP is not recorded as positive.', 'ihc');
    if (st === 'HNF1A-inactivated' && !negative(v, 'LFABP')) warn('HNF1A-inactivated adenoma: loss of LFABP is not recorded.', 'ihc');
    if (['Beta-catenin-activated, exon 3', 'Beta-catenin-activated inflammatory'].includes(st) && v.gs !== 'Diffuse strong' && v.betaCatenin !== 'Nuclear staining') warn('Exon 3 beta-catenin activation: diffuse strong glutamine synthetase or nuclear beta-catenin is not recorded; molecular testing confirms it.', 'gs');
    if (st === 'Beta-catenin-activated, exon 7/8' && v.gs === 'Diffuse strong') warn('Diffuse strong glutamine synthetase is the exon 3 pattern, not exon 7/8.', 'gs');
    if (st === 'Sonic hedgehog' && !positive(v, 'ASS1', 'PTGDS')) warn('Sonic hedgehog adenoma: ASS1 or PTGDS is not recorded as positive.', 'ihc');
    if (st === 'Unclassified' && positive(v, 'SAA', 'CRP')) warn('SAA or CRP positive: the adenoma is inflammatory, not unclassified.', 'hcaSubtype');
    if (!/^Beta-catenin/.test(st) && (v.gs === 'Diffuse strong' || v.betaCatenin === 'Nuclear staining')) warn('Diffuse glutamine synthetase or nuclear beta-catenin points to beta-catenin activation.', 'hcaSubtype');
    if (/exon 3|inflammatory$/.test(st) && /^Beta-catenin/.test(st)) info('Exon 3 beta-catenin activation carries the increased risk of malignant transformation (RCPath G050).', 'hcaSubtype');
  }
  if (d === 'Hepatoblastoma') {
    const p = arr(v.hbPatterns);
    if (p.length === 1 && p[0] === 'Fetal, low mitotic activity') info('A pure fetal hepatoblastoma cannot be diagnosed on a biopsy (CAP).', 'hbPatterns');
    if (p.includes('Small cell undifferentiated') && !recorded(v, 'INI-1')) warn('Small cell undifferentiated pattern: record INI-1 (loss indicates malignant rhabdoid tumour).', 'ihc');
  }
  if (d === 'Fibrolamellar carcinoma' && !positive(v, 'CK7', 'CD68')) info('Fibrolamellar carcinoma: CK7 and CD68 are positive in nearly all cases but are not specific (CAP); DNAJB1-PRKACA testing can confirm a borderline case.', 'ihc');

  // Biliary and metastatic carcinoma (RCPath G050 section 10.3, G167).
  if (['Intrahepatic cholangiocarcinoma', 'Adenocarcinoma, intrahepatic or metastatic'].includes(d)) info('Immunohistochemistry cannot reliably separate intrahepatic cholangiocarcinoma from metastatic pancreatobiliary or upper gastrointestinal adenocarcinoma; keep immunohistochemistry to a minimum to conserve tissue for FGFR2 fusion testing (RCPath G050).', 'dx');
  if (PRIMARY_DX.includes(d)) {
    if (!v.primarySite) info('Primary site not stated: the diagnosis line prints without one.', 'primarySite');
    const markers = SITE_MARKERS[v.primarySite];
    if (markers && v.primaryBasis !== 'Consistent with the known' && !positive(v, ...markers)) warn(`${v.primarySite} primary: none of ${listJoin(markers)} is recorded as positive.`, 'ihc');
    if (['Upper gastrointestinal', 'Pancreatic', 'Pancreatobiliary'].includes(v.primarySite)) info('No immunoprofile separates a pancreatobiliary or upper gastrointestinal metastasis from intrahepatic cholangiocarcinoma: the primary rests on clinical and imaging findings.', 'primarySite');
    if (v.primarySite === 'Other (specify)' && !stripDot(v.primaryOther)) warn('Specify the primary site.', 'primaryOther');
  }
  if (d === 'Metastatic carcinoma (specify type)' && !stripDot(v.carcinomaType)) warn('Specify the carcinoma type.', 'carcinomaType');
  if (['Metastatic neuroendocrine tumour', 'Metastatic neuroendocrine carcinoma'].includes(d)) {
    const ne = NE_MARKERS.filter((m) => positive(v, m)).length;
    if (ne < 2) warn('Neuroendocrine differentiation: WHO 6th edition asks for at least two neuroendocrine markers, preferably including synaptophysin, chromogranin or INSM1 (CD56 does not count).', 'ihc');
  }
  if (d === 'Metastatic neuroendocrine tumour') {
    if (ki67 === null) warn('Record the Ki-67 index: it grades the tumour.', 'ki67');
    const fits = NET_FITS[v.netGrade];
    if (fits && ki67 !== null && !fits(ki67)) warn(`Ki-67 ${ki67}% does not match ${lc1(v.netGrade)} (WHO: grade 1 below 3%, grade 2 3-20%, grade 3 above 20%).`, 'netGrade');
  }
  if (d === 'Metastatic neuroendocrine carcinoma' && ki67 !== null && ki67 <= 20) warn(`Ki-67 ${ki67}% is low for a neuroendocrine carcinoma.`, 'ki67');
  if (d === 'Metastatic melanoma' && !positive(v, 'S100', 'SOX10', 'Melan-A', 'HMB45')) warn('Melanoma: no melanocytic marker (S100, SOX10, Melan-A, HMB45) is recorded as positive.', 'ihc');
  if (d === 'Metastatic gastrointestinal stromal tumour' && !positive(v, 'CD117', 'DOG1')) warn('GIST: CD117 or DOG1 is not recorded as positive.', 'ihc');

  // Cannot-miss mesenchymal and haematolymphoid lesions.
  if (d === 'Epithelioid haemangioendothelioma') {
    if (!positive(v, 'ERG', 'CD31', 'CD34')) warn('EHE: no endothelial marker (ERG, CD31, CD34) is recorded as positive.', 'ihc');
    if (!recorded(v, 'CAMTA1', 'TFE3')) warn('EHE: CAMTA1 or TFE3 is not recorded; the diagnosis rests on morphology with both stains.', 'ihc');
  }
  if (d === 'Angiosarcoma' && !positive(v, 'ERG', 'CD31')) warn('Angiosarcoma: ERG or CD31 is not recorded as positive.', 'ihc');
  if (d === 'PEComa (epithelioid angiomyolipoma)') {
    if (!positive(v, 'HMB45', 'Melan-A', 'cathepsin K')) warn('PEComa: HMB45, Melan-A or cathepsin K is not recorded as positive.', 'ihc');
    if (!negative(v, 'HepPar-1', 'AE1/AE3', 'CAM5.2', 'CK8/18')) info('PEComa: a negative keratin or HepPar-1 separates it from HCC.', 'ihc');
    if (!recorded(v, 'TFE3')) info('PEComa: TFE3 is recommended (TFE3-rearranged tumours behave worse).', 'ihc');
  }
  if (d === 'Solitary fibrous tumour' && !positive(v, 'STAT6')) warn('Solitary fibrous tumour: STAT6 is not recorded as positive.', 'ihc');
  if (d === 'Inflammatory myofibroblastic tumour' && !recorded(v, 'ALK')) warn('Inflammatory myofibroblastic tumour: record ALK (ROS1 when ALK is negative).', 'ihc');
  if (d === 'Inflammatory pseudotumour' && !recorded(v, 'IgG4')) info('Inflammatory pseudotumour: IgG4 and IgG show whether it is IgG4-related.', 'ihc');
  if (d === 'Lymphoma (specify type)') {
    if (!stripDot(v.lymphomaType)) warn('Specify the lymphoma type.', 'lymphomaType');
    if (!positive(v, 'CD45', 'CD20', 'CD3', 'PAX5', 'CD79a')) warn('Lymphoma: no lymphoid marker is recorded as positive.', 'ihc');
  }
  if (d === 'Myeloid sarcoma' && !positive(v, 'MPO', 'CD43', 'lysozyme', 'CD117', 'CD34')) warn('Myeloid sarcoma: no myeloid marker (MPO, CD43, lysozyme, CD117, CD34) is recorded as positive.', 'ihc');
  if (d === 'Undifferentiated embryonal sarcoma' && positive(v, 'glypican-3')) info('Glypican-3 stains about half of undifferentiated embryonal sarcomas: it does not mean hepatoblastoma or HCC.', 'ihc');

  // Sampling.
  if (NO_LESION.includes(d)) info('No viable lesional tissue: RCPath asks for deeper levels before reporting this, and for the report to say that further biopsy or investigation is needed (add it as a comment).', 'dx');
  if (d === 'Non-lesional liver only' && v.nonLesional === 'Not identified') err('"Non-lesional liver only" with no non-lesional liver recorded.', 'nonLesional');
  for (const i of v.nonLesional === 'Not identified' ? [] : BG.backgroundIssues(v)) at(i.level, i.message, i.field);
  return out;
}

export default { specimenName, microscopy, diagnosis, validate };
