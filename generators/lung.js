// Lung / bronchial biopsy generator (endobronchial, transbronchial, cryobiopsy, CT-guided,
// EBUS mass and EBUS lymph node cores). WHO 5th edition small-biopsy terminology.
// Protected by tests/lung.test.js.

const NP = 'Not performed';
const has = (v) => v && v !== NP && v !== 'None' && v !== 'Absent';

export const isNode = (v) => v.specimenType === 'EBUS lymph node core biopsy';

const MUCINOUS = 'Invasive mucinous';
const joinAnd = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

/** Ticked adenocarcinoma patterns as an array (older cases stored a single string). */
export function adenoPatterns(v) {
  const raw = v.adenoPattern;
  const arr = Array.isArray(raw) ? raw : raw && raw !== 'Not specified' ? [raw] : [];
  return arr.filter((x) => x && x !== 'Not specified');
}

/**
 * Pattern phrase for the microscopy sentence: "with an acinar pattern",
 * "with mixed lepidic and acinar patterns (acinar predominant)", or "" when none ticked.
 * Micropapillary and solid components stay in the list even when minor because they
 * carry prognostic weight. Invasive mucinous is an entity and is handled separately.
 */
export function patternPhrase(v) {
  const pats = adenoPatterns(v).filter((x) => x !== MUCINOUS).map((x) => x.toLowerCase());
  if (pats.length === 0) return '';
  if (pats.length === 1) return ` with ${/^[aeiou]/.test(pats[0]) ? 'an' : 'a'} ${pats[0]} pattern`;
  const pred = (v.adenoPredominant || '').toLowerCase();
  const predTag = pred && pred !== 'not specified' && pats.includes(pred) ? ` (${pred} predominant)` : '';
  return ` with mixed ${joinAnd(pats)} patterns${predTag}`;
}

/** Diagnosis-line qualifier: ", acinar pattern" / ", mixed lepidic and acinar patterns (acinar predominant)". */
export function patternDx(v) {
  const pats = adenoPatterns(v).filter((x) => x !== MUCINOUS).map((x) => x.toLowerCase());
  if (pats.length === 0) return '';
  if (pats.length === 1) return `, ${pats[0]} pattern`;
  const pred = (v.adenoPredominant || '').toLowerCase();
  const predTag = pred && pred !== 'not specified' && pats.includes(pred) ? ` (${pred} predominant)` : '';
  return `, mixed ${joinAnd(pats)} patterns${predTag}`;
}

export const isMucinous = (v) => adenoPatterns(v).includes(MUCINOUS);
export const isInadequate = (v) => (isNode(v) ? v.nodeTissue === 'Blood and scant lymphocytes only (inadequate)' : v.tissue === 'Blood, fibrin and crushed cells only (inadequate)');
export const hasTumour = (v) => !isInadequate(v) && has(v.neoplasia) && v.neoplasia !== 'Atypical lymphoid infiltrate (lymphoma suspected)' && (!isNode(v) || v.nodeFinding === 'Metastatic carcinoma');
export const isCarcinoma = (v) => hasTumour(v) && !/suspicious|Carcinoid/.test(v.neoplasia);

const NOUN = {
  'Transbronchial biopsy': 'transbronchial biopsy',
  'Endobronchial biopsy': 'endobronchial biopsy',
  'Transbronchial cryobiopsy': 'transbronchial cryobiopsy',
  'CT-guided core biopsy': 'CT-guided core biopsy',
  'EBUS-guided core biopsy (mass)': 'EBUS-guided core biopsy',
  'EBUS lymph node core biopsy': 'EBUS core biopsy'
};

export function specimenName(part) {
  const v = part.values;
  const site = (v.site || '').trim();
  const noun = NOUN[v.specimenType] || 'biopsy';
  if (isNode(v)) return `Lymph node, ${site || 'station not stated'}, ${noun}`;
  return site ? `Lung, ${site}, ${noun}` : `Lung, ${noun}`;
}
export function organPhrase(part) {
  const v = part.values;
  const site = (v.site || '').trim();
  const noun = NOUN[v.specimenType] || 'biopsy';
  if (isNode(v)) return `LYMPH NODE, ${site || 'station not stated'}, ${noun}`;
  return site ? `LUNG, ${site}, ${noun}` : `LUNG, ${noun}`;
}

// ---------- microscopy ----------

const TISSUE = {
  'Bronchial mucosa': 'bronchial mucosa',
  'Bronchial mucosa and alveolated lung parenchyma': 'bronchial mucosa and alveolated lung parenchyma',
  'Alveolated lung parenchyma': 'alveolated lung parenchyma',
  'Fibrous tissue and tumour': 'fibrous tissue infiltrated by tumour'
};

const BENIGN = {
  'Chronic bronchitis with goblet cell hyperplasia': 'The bronchial mucosa shows goblet cell hyperplasia, basement membrane thickening and mild chronic inflammation in the submucosa, in keeping with chronic bronchitis.',
  'Squamous metaplasia': 'The bronchial epithelium shows squamous metaplasia.',
  'Organising pneumonia': 'The alveolar spaces contain plugs of loose fibroblastic tissue with a mild chronic inflammatory infiltrate in the interstitium, in keeping with organising pneumonia.',
  'Acute lung injury with hyaline membranes': 'The alveolar spaces are lined by hyaline membranes with reactive type II pneumocyte hyperplasia and interstitial oedema, in keeping with acute lung injury.',
  'Eosinophilic infiltrate': 'There is a prominent eosinophilic infiltrate within the alveolar spaces and interstitium.',
  'Aspiration (foreign material with giant cell reaction)': 'Foreign material with a surrounding foreign body giant cell reaction is present, in keeping with aspiration.',
  Anthracosis: 'Anthracotic pigment is present.',
  'Interstitial fibrosis': 'The alveolar septa are thickened by fibrosis with reactive pneumocyte hyperplasia.',
  'Viral cytopathic change': 'Viral cytopathic change is present within the epithelial cells.'
};

const DYSPLASIA = {
  'Low grade': 'The metaplastic squamous epithelium shows low grade dysplasia.',
  'High grade / carcinoma in situ': 'The metaplastic squamous epithelium shows high grade dysplasia amounting to squamous cell carcinoma in situ.'
};

const ORGANISM = {
  'Aspergillus-type septate hyphae': 'Septate fungal hyphae with acute-angle branching are present, morphologically consistent with Aspergillus species.',
  Pneumocystis: 'The alveolar spaces contain foamy eosinophilic exudate; GMS stain highlights cup-shaped organisms consistent with Pneumocystis jirovecii.',
  Cryptococcus: 'Encapsulated yeast forms with narrow-based budding are present, consistent with Cryptococcus species.',
  'Mucorales-type hyphae': 'Broad, pauciseptate, ribbon-like fungal hyphae with right-angle branching are present, consistent with Mucorales.',
  'Other (specify in notes)': 'Organisms are identified (see additional notes).'
};

const TUMOUR = {
  Adenocarcinoma: (v) => (isMucinous(v)
    ? `The ${isNode(v) ? 'lymphoid tissue' : 'tissue'} is infiltrated by adenocarcinoma composed of tall columnar and goblet-like cells with abundant apical mucin and basally located, mildly atypical nuclei, growing along alveolar walls and in glands with extracellular mucin, in keeping with invasive mucinous adenocarcinoma.`
    : `The ${isNode(v) ? 'lymphoid tissue is infiltrated' : 'tissue is infiltrated'} by adenocarcinoma composed of atypical glandular cells${patternPhrase(v)}, with enlarged hyperchromatic nuclei, prominent nucleoli and mitoses.`),
  'Squamous cell carcinoma': (v) => `The tissue is infiltrated by ${(v.sccType || 'non-keratinising').toLowerCase()} squamous cell carcinoma composed of nests of atypical polygonal cells with ${v.sccType === 'Keratinising' ? 'keratinisation, intercellular bridges' : 'dense eosinophilic cytoplasm'} and hyperchromatic nuclei.`,
  'Non-small cell carcinoma, favour adenocarcinoma': () => 'The tissue is infiltrated by non-small cell carcinoma composed of nests and cords of atypical cells with moderate cytoplasm, enlarged pleomorphic nuclei and mitoses, without definite glandular or squamous differentiation on morphology.',
  'Non-small cell carcinoma, favour squamous cell carcinoma': () => 'The tissue is infiltrated by non-small cell carcinoma composed of nests of atypical cells with moderate eosinophilic cytoplasm, enlarged pleomorphic nuclei and mitoses, without definite glandular or squamous differentiation on morphology.',
  'Non-small cell carcinoma, not further classifiable': () => 'The tissue is infiltrated by non-small cell carcinoma composed of nests of atypical cells with enlarged pleomorphic nuclei and mitoses, without definite glandular or squamous differentiation on morphology.',
  'Small cell carcinoma': () => 'The tissue is infiltrated by sheets of small to intermediate-sized cells with scant cytoplasm, finely granular chromatin, inconspicuous nucleoli, nuclear moulding, frequent mitoses, apoptotic bodies and crush artefact, in keeping with small cell carcinoma.',
  'Large cell neuroendocrine carcinoma': () => 'The tissue is infiltrated by nests and trabeculae of large cells with moderate cytoplasm, vesicular chromatin, prominent nucleoli, frequent mitoses and necrosis, with organoid and rosette-like architecture, in keeping with large cell neuroendocrine carcinoma.',
  'Carcinoid / neuroendocrine tumour': (v) => `The tissue is infiltrated by a neuroendocrine tumour composed of organoid nests and trabeculae of uniform cells with moderate granular cytoplasm and finely granular chromatin${v.carcinoidType === 'Atypical carcinoid' ? ', with increased mitoses and focal necrosis' : v.carcinoidType === 'Typical carcinoid' ? ', without necrosis and with rare mitoses' : ''}.`,
  'Metastatic carcinoma': (v) => `The tissue is infiltrated by carcinoma with morphology ${(v.metastasisPrimary || '').trim() ? `in keeping with metastasis from a ${v.metastasisPrimary.trim()} primary` : 'favouring a metastasis'}.`,
  'Atypical cells suspicious for carcinoma': () => 'Scattered clusters of atypical cells with enlarged hyperchromatic nuclei and increased nuclear to cytoplasmic ratio are present, suspicious for carcinoma, but the amount of tissue and crush artefact preclude a definite diagnosis.'
};

function ihcSentence(v) {
  const pos = [];
  const focal = [];
  const neg = [];
  const put = (name, val) => {
    if (!val || val === NP) return;
    if (val === 'Positive') pos.push(name);
    else if (val === 'Focal positive') focal.push(name);
    else neg.push(name);
  };
  put('TTF-1', v.ttf1); put('napsin A', v.napsin); put('p40', v.p40); put('CK5/6', v.ck56);
  put('synaptophysin, chromogranin and INSM1', v.neMarkers);
  put('ALK (D5F3)', v.alk); put('ROS1', v.ros1);
  const bits = [];
  const join = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
  if (pos.length) bits.push(`positive for ${join(pos)}`);
  if (focal.length) bits.push(`focally positive for ${join(focal)}`);
  if (neg.length) bits.push(`negative for ${join(neg)}`);
  const s = [];
  if (bits.length) s.push(`On immunohistochemistry, the atypical cells are ${bits.join(', ')}.`);
  if (v.ki67) s.push(`The Ki-67 proliferation index is approximately ${v.ki67}%.`);
  if ((v.ihcOther || '').trim()) s.push(v.ihcOther.trim().replace(/[.;]\s*$/, '') + '.');
  return s;
}

export function pdl1Text(v) {
  if (!v.pdl1 || v.pdl1 === NP) return '';
  const clone = v.pdl1Clone || '22C3';
  if (v.pdl1 === 'Inadequate (< 100 tumour cells)') return `PD-L1 (${clone}): inadequate for assessment (fewer than 100 viable tumour cells).`;
  const tps = v.pdl1Tps ? `${v.pdl1Tps}%` : v.pdl1.replace('TPS ', '');
  return `PD-L1 (${clone}) tumour proportion score: ${tps}.`;
}

export function molecularText(v) {
  if (!v.molecular || v.molecular === 'Not requested') return '';
  if (v.molecular === 'Insufficient tumour for molecular testing') return 'Molecular testing: insufficient tumour for testing on this material.';
  return `Molecular testing (EGFR, ALK, ROS1, BRAF, KRAS, MET, RET, NTRK) has been requested on block ${(v.blockRef || '').trim() || part0()}; a supplementary report will follow.`;
}
const part0 = () => 'A1';

export function microscopy(part) {
  const v = part.values;
  const s = [];
  const n = v.pieces ? `${v.pieces} pieces of ` : '';
  if (isNode(v)) {
    if (isInadequate(v)) return 'Sections show blood and scant lymphocytes only. No diagnostic lymph node tissue is present.';
    s.push(`Sections show ${n}lymphoid tissue${v.nodeTissue === 'Lymphoid tissue and bronchial mucosa' ? ' and fragments of bronchial mucosa' : ''}.`);
    if (v.nodeFinding === 'Metastatic carcinoma' && TUMOUR[v.neoplasia]) {
      s.push(TUMOUR[v.neoplasia](v));
      s.push(...ihcSentence(v));
    } else if (v.nodeFinding === 'Metastatic carcinoma') {
      s.push('The lymphoid tissue is infiltrated by metastatic carcinoma.');
      s.push(...ihcSentence(v));
    } else if (v.nodeFinding === 'Granulomas') {
      s.push(`${v.granuloma === 'Necrotising granulomas' ? 'Necrotising' : 'Non-necrotising'} epithelioid granulomas are present within the lymphoid tissue.`);
    } else if (v.nodeFinding === 'Anthracosis and reactive change') {
      s.push('The lymphoid tissue shows anthracotic pigment and reactive follicular hyperplasia.');
    } else if (v.nodeFinding === 'Atypical lymphoid infiltrate') {
      s.push('The lymphoid tissue shows an atypical lymphoid infiltrate; immunohistochemical work-up is in progress and a supplementary report will follow.');
    }
  } else {
    if (isInadequate(v)) return 'Sections show blood, fibrin and crushed cells only. No diagnostic tissue is present.';
    s.push(`Sections show ${n}${TISSUE[v.tissue] || 'bronchial mucosa'}.`);
    if (hasTumour(v)) {
      s.push(TUMOUR[v.neoplasia](v));
      s.push(...ihcSentence(v));
    }
    if (BENIGN[v.benign]) s.push(BENIGN[v.benign]);
    if (v.benign === 'Squamous metaplasia' && DYSPLASIA[v.squamousDysplasia]) s.push(DYSPLASIA[v.squamousDysplasia]);
    if (v.granuloma && v.granuloma !== 'Absent') s.push(`${v.granuloma === 'Necrotising granulomas' ? 'Necrotising' : 'Non-necrotising'} epithelioid granulomas with multinucleated giant cells are present.`);
  }
  if (v.granuloma && v.granuloma !== 'Absent' && v.specialStains && v.specialStains !== NP) {
    s.push(v.specialStains === 'Negative for acid-fast bacilli and fungal elements'
      ? 'Ziehl-Neelsen and PASD stains do not highlight any acid-fast bacillus or fungal element respectively.'
      : v.specialStains === 'Acid-fast bacilli present' ? 'Ziehl-Neelsen stain highlights acid-fast bacilli.' : 'PASD / GMS stains highlight fungal elements.');
  }
  if (ORGANISM[v.organisms]) s.push(ORGANISM[v.organisms]);
  if (v.neoplasia === 'Atypical lymphoid infiltrate (lymphoma suspected)' && !isNode(v)) s.push('There is a dense atypical lymphoid infiltrate; immunohistochemical work-up is in progress and a supplementary report will follow.');
  if ((v.additionalNotes || '').trim()) s.push(v.additionalNotes.trim());
  if (hasTumour(v)) {
    const pd = pdl1Text(v);
    if (pd) s.push(pd);
  } else if (v.neoplasia !== 'Atypical lymphoid infiltrate (lymphoma suspected)' && !(isNode(v) && v.nodeFinding === 'Atypical lymphoid infiltrate')) {
    const g = v.granuloma && v.granuloma !== 'Absent';
    s.push(isNode(v) ? 'There is no evidence of metastatic malignancy.' : `There is no evidence of ${g ? '' : 'granuloma, '}${v.benign === 'Squamous metaplasia' && v.squamousDysplasia !== 'Absent' ? 'invasive ' : 'dysplasia or '}malignancy.`);
  }
  return s.join(' ');
}

// ---------- diagnosis ----------

const DX = {
  Adenocarcinoma: (v) => (isMucinous(v) ? 'INVASIVE MUCINOUS ADENOCARCINOMA' : `ADENOCARCINOMA${patternDx(v)}`),
  'Squamous cell carcinoma': (v) => `SQUAMOUS CELL CARCINOMA, ${(v.sccType || 'non-keratinising').toLowerCase()} type`,
  'Non-small cell carcinoma, favour adenocarcinoma': (v) => `NON-SMALL CELL CARCINOMA, favour adenocarcinoma${ihcTag(v)}`,
  'Non-small cell carcinoma, favour squamous cell carcinoma': (v) => `NON-SMALL CELL CARCINOMA, favour squamous cell carcinoma${ihcTag(v)}`,
  'Non-small cell carcinoma, not further classifiable': () => 'NON-SMALL CELL CARCINOMA, not otherwise specified',
  'Small cell carcinoma': () => 'SMALL CELL CARCINOMA',
  'Large cell neuroendocrine carcinoma': () => 'LARGE CELL NEUROENDOCRINE CARCINOMA',
  'Carcinoid / neuroendocrine tumour': (v) => (v.carcinoidType === 'Atypical carcinoid' ? 'NEUROENDOCRINE TUMOUR, favour atypical carcinoid' : v.carcinoidType === 'Typical carcinoid' ? 'NEUROENDOCRINE TUMOUR, favour typical carcinoid' : 'NEUROENDOCRINE TUMOUR (carcinoid); grade not assessable on biopsy'),
  'Metastatic carcinoma': (v) => `METASTATIC CARCINOMA${(v.metastasisPrimary || '').trim() ? `, consistent with ${v.metastasisPrimary.trim()} primary` : ''}`,
  'Atypical cells suspicious for carcinoma': () => 'ATYPICAL CELLS, SUSPICIOUS FOR CARCINOMA; repeat sampling suggested'
};

function ihcTag(v) {
  const bits = [];
  const t = (name, val) => { if (val && val !== NP) bits.push(`${name} ${val.toLowerCase()}`); };
  t('TTF-1', v.ttf1); t('p40', v.p40);
  return bits.length ? ` (${bits.join(', ')})` : '';
}

export function diagnosisText(part) {
  const v = part.values;
  if (isInadequate(v)) return isNode(v) ? 'BLOOD AND SCANT LYMPHOCYTES ONLY; NO LYMPH NODE TISSUE FOR ASSESSMENT (INADEQUATE)' : 'BLOOD, FIBRIN AND CRUSHED CELLS ONLY; NO DIAGNOSTIC TISSUE (INADEQUATE)';
  if (isNode(v)) {
    if (v.nodeFinding === 'Metastatic carcinoma') return `METASTATIC ${DX[v.neoplasia] ? DX[v.neoplasia](v).replace(/^METASTATIC /, '') : 'CARCINOMA'}`;
    if (v.nodeFinding === 'Granulomas') return `${v.granuloma === 'Necrotising granulomas' ? 'NECROTISING' : 'NON-NECROTISING'} GRANULOMATOUS LYMPHADENITIS${stainTag(v)}; no evidence of malignancy`;
    if (v.nodeFinding === 'Atypical lymphoid infiltrate') return 'ATYPICAL LYMPHOID INFILTRATE; immunohistochemistry to follow';
    if (v.nodeFinding === 'Anthracosis and reactive change') return 'REACTIVE LYMPH NODE WITH ANTHRACOSIS; no evidence of malignancy';
    return 'LYMPH NODE TISSUE; NO EVIDENCE OF MALIGNANCY';
  }
  if (hasTumour(v)) return DX[v.neoplasia](v);
  if (v.neoplasia === 'Atypical lymphoid infiltrate (lymphoma suspected)') return 'ATYPICAL LYMPHOID INFILTRATE; immunohistochemistry to follow';
  const items = [];
  if (v.granuloma && v.granuloma !== 'Absent') items.push(`${v.granuloma === 'Necrotising granulomas' ? 'NECROTISING' : 'NON-NECROTISING'} GRANULOMATOUS INFLAMMATION${stainTag(v)}`);
  if (ORGANISM[v.organisms]) items.push(v.organisms === 'Other (specify in notes)' ? 'ORGANISMS IDENTIFIED, see microscopic description' : `${v.organisms.replace(/-type septate hyphae|-type hyphae/, '').toUpperCase()} IDENTIFIED`);
  if (v.benign === 'Squamous metaplasia' && v.squamousDysplasia && v.squamousDysplasia !== 'Absent') items.push(v.squamousDysplasia === 'Low grade' ? 'SQUAMOUS METAPLASIA WITH LOW GRADE DYSPLASIA' : 'SQUAMOUS CELL CARCINOMA IN SITU; no invasion identified');
  else if (v.benign && v.benign !== 'None') items.push(BENIGN_DX[v.benign] || v.benign.toUpperCase());
  if (!items.length) items.push(v.tissue === 'Alveolated lung parenchyma' ? 'ALVEOLATED LUNG PARENCHYMA WITH NO SIGNIFICANT ABNORMALITY' : 'BRONCHIAL MUCOSA WITH NO SIGNIFICANT ABNORMALITY');
  // A named finding stands alone (trailing negatives, Phase 66); squamous dysplasia and carcinoma in situ keep
  // the invasion answer.
  const dysp = v.benign === 'Squamous metaplasia' && v.squamousDysplasia && v.squamousDysplasia !== 'Absent';
  if (!dysp) return items.join('; ');
  return `${items.join('; ')}; no evidence of malignancy`.replace('SQUAMOUS CELL CARCINOMA IN SITU; no invasion identified; no evidence of malignancy', 'SQUAMOUS CELL CARCINOMA IN SITU; no evidence of invasive malignancy');
}

const BENIGN_DX = {
  'Chronic bronchitis with goblet cell hyperplasia': 'BRONCHIAL MUCOSA WITH CHRONIC BRONCHITIS',
  'Squamous metaplasia': 'BRONCHIAL MUCOSA WITH SQUAMOUS METAPLASIA',
  'Organising pneumonia': 'ORGANISING PNEUMONIA',
  'Acute lung injury with hyaline membranes': 'ACUTE LUNG INJURY WITH HYALINE MEMBRANES',
  'Eosinophilic infiltrate': 'EOSINOPHILIC INFILTRATE',
  'Aspiration (foreign material with giant cell reaction)': 'FOREIGN MATERIAL WITH GIANT CELL REACTION, in keeping with aspiration',
  Anthracosis: 'ANTHRACOSIS',
  'Interstitial fibrosis': 'INTERSTITIAL FIBROSIS',
  'Viral cytopathic change': 'VIRAL CYTOPATHIC CHANGE'
};

function stainTag(v) {
  if (!v.specialStains || v.specialStains === NP) return '';
  if (v.specialStains === 'Negative for acid-fast bacilli and fungal elements') return '; no acid-fast bacilli or fungal elements on special stains';
  return v.specialStains === 'Acid-fast bacilli present' ? '; ACID-FAST BACILLI IDENTIFIED' : '; FUNGAL ELEMENTS IDENTIFIED';
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const lines = [`(${part.label}) ${organPhrase(part)} - ${diagnosisText(part)}`];
  if (hasTumour(v) && ctx?.options?.molecularLine !== false) {
    const pd = pdl1Text(v);
    if (pd) lines.push(`- ${pd}`);
    const mol = molecularText(v);
    if (mol) lines.push(`- ${mol}`);
  }
  return lines.join('\n');
}

// ---------- summary ----------

const partList = (parts) => {
  const l = parts.map((p) => `(${p.label})`);
  return l.length === 1 ? l[0] : `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}`;
};

export function summary(parts, ctx) {
  if (parts.length < 2 || ctx.options.summary === false) return '';
  const bits = [];
  const lungTum = parts.filter((p) => !isNode(p.values) && hasTumour(p.values));
  if (lungTum.length) {
    const types = [...new Set(lungTum.map((p) => DX[p.values.neoplasia](p.values).split(';')[0].split(' (')[0].toLowerCase()))];
    bits.push(`${types.join(' and ')} in ${partList(lungTum)}`);
  }
  const nodes = parts.filter((p) => isNode(p.values) && !isInadequate(p.values));
  const posNodes = nodes.filter((p) => p.values.nodeFinding === 'Metastatic carcinoma');
  const negNodes = nodes.filter((p) => p.values.nodeFinding !== 'Metastatic carcinoma');
  if (posNodes.length) bits.push(`metastatic carcinoma in ${posNodes.map((p) => `${(p.values.site || '').trim() || 'lymph node'} (${p.label})`).join(' and ')}`);
  if (negNodes.length) bits.push(`no metastasis in ${negNodes.map((p) => `${(p.values.site || '').trim() || 'lymph node'} (${p.label})`).join(' and ')}`);
  const inad = parts.filter((p) => isInadequate(p.values));
  if (inad.length) bits.push(`${partList(inad)} inadequate`);
  const gran = parts.filter((p) => p.values.granuloma && p.values.granuloma !== 'Absent');
  if (gran.length && !lungTum.length && !posNodes.length) bits.push(`granulomatous inflammation in ${partList(gran)}`);
  if (!bits.length) bits.push('no evidence of malignancy in any part');
  return `SUMMARY: ${bits.join('; ')}.`;
}

export default { specimenName, microscopy, diagnosis, summary };
