// Frozen section generator. Pure functions: (part, ctx) -> string.
// Each part is one frozen specimen (the department letters frozen specimens A, B, C … and
// converts every frozen block to paraffin, so the same letters carry through to the final report).
// Blocks produced:
//   specimens  "Frozen section: (A) Tongue, medial margin, (B) …"
//   macro      "(A) Received in a fresh state is a piece of tan coloured tissue measuring … All embedded in 1 frozen block and subsequently converted to paraffin block."
//   intraop    "(Prof. A Cheung / Dr. HY Tan)" + grouped frozen diagnoses + the phone-report sentence
//   microscopy "(A) The paraffin section confirms the frozen section diagnosis. It shows … There is no evidence of malignancy."
//   diagnosis  "(A) TONGUE, medial margin, frozen section - NO EVIDENCE OF MALIGNANCY"
// Wording is protected by tests/frozen.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => String(n).replace(/\.0+$/, '');
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n) => (n >= 0 && n <= 10 ? WORDS[n] : String(n));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const stripDot = (s) => String(s || '').trim().replace(/[.;\s]+$/, '');
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};

export function specimenName(part) {
  return part.values.specimenName || `Part ${part.label}`;
}

/** "Frozen section: (A) Tongue, medial margin, (B) Tongue, posterior margin and (C) Right level I lymph node" */
export function specimens(parts) {
  if (parts.length === 1) return `Frozen section: ${specimenName(parts[0])}`;
  return `Frozen section: ${listJoin(parts.map((p) => `(${p.label}) ${specimenName(p)}`))}`;
}

// ---------- macroscopic description ----------

function tissueNoun(v) {
  const d = v.tissueDesc === 'other' ? (v.tissueDescOther || 'tissue').trim() : v.tissueDesc;
  return d || 'tissue';
}

function sizePhrase(v) {
  let s = String(v.size || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return ` measuring ${s}`;
}

export function macro(part, ctx) {
  if (ctx.options.macro === false) return '';
  const v = part.values;
  if (ovForm(v)) return ovMacro(part);
  if (isLung(v)) return luMacro(part);
  const n = Math.max(1, Math.round(num(v.pieces) ?? 1));
  const noun = tissueNoun(v);
  const size = sizePhrase(v);
  let received;
  if (noun === 'lymph node') {
    received = n === 1 ? `is a lymph node${size}` : `are ${word(n)} lymph nodes${size}${size && !/each|aggregate/i.test(size) ? ' in aggregate' : ''}`;
  } else if (n === 1) {
    received = `is a piece of ${noun}${size}`;
  } else {
    const agg = size && !/each|aggregate/i.test(size) ? ' in aggregate' : '';
    received = `are ${word(n)} pieces of ${noun}${size}${agg}`;
  }
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 1));
  const blockPhrase = blocks === 1
    ? 'in 1 frozen block and subsequently converted to paraffin block'
    : `in ${blocks} frozen blocks and subsequently converted to paraffin blocks`;
  const handling = v.handling === 'Representative section taken'
    ? `Representative section taken and embedded ${blockPhrase}. The remainder is formalin fixed.`
    : `${v.handling || 'All embedded'} ${blockPhrase}.`;
  return `(${part.label}) Received in a fresh state ${received}. ${handling}`;
}

// ---------- frozen (intraoperative) diagnosis ----------

const deferred = (v) => v.correlation === 'Deferred'
  || (v.scenario === 'Margin' && v.marginResult === 'Atypical, deferred')
  || (v.scenario === 'Lymph node' && v.nodeResult === 'Deferred')
  || (v.scenario === 'Ovarian / adnexal mass' && v.ovaryResult === 'Deferred')
  || (v.scenario === LU && v.lungResult === 'Deferred')
  || (v.scenario === 'Nodule / mass' && v.noduleResult === 'Deferred');

const tumour = (v, fallback) => stripDot(v.tumourType) || fallback;

// ---------- ovarian / adnexal mass scenario (spec: docs/specs/ovary-pair.md, Part 1) ----------

const OV = 'Ovarian / adnexal mass';
const isOvary = (v) => v.scenario === OV;
const ovForm = (v) => isOvary(v) && !!String(v.ovSpecimen || '').trim();
/** Frozen favoured type: the pick-list entry, else the free-text tumour type. */
export function ovType(v) {
  const t = String(v.ovType || '').trim();
  if (t && t !== 'other (specify)') return t === 'lymphoma, favour' ? 'lymphoma' : t;
  return stripDot(v.tumourType);
}
const ovPicked = (v) => { const t = String(v.ovType || '').trim(); return !!t && t !== 'other (specify)'; };
const isMucinous = (v) => ovPicked(v) && /mucinous/i.test(ovType(v)); // pick-list types only; free text keeps the legacy wording
const asList = (x) => (Array.isArray(x) ? x : x ? [x] : []);
/** Caveats in force: ticked ones plus the automatic mucinous caveat (suppressed by "None"). */
export function ovCaveats(v) {
  const ticked = asList(v.ovCaveat);
  const none = ticked.some((c) => /^None/.test(c));
  const set = new Set(ticked.filter((c) => !/^None/.test(c)));
  if (!none && isMucinous(v) && v.ovaryResult !== 'Deferred') set.add('Mucinous — heterogeneity and metastasis caveat');
  return [...set];
}
const CAVEAT_TEXT = {
  'Mucinous — heterogeneity and metastasis caveat': 'Mucinous tumours are heterogeneous; the frozen section cannot exclude a higher-grade or invasive component, or a metastasis from a gastrointestinal primary. Final classification awaits paraffin sections.',
  'Borderline — invasion cannot be excluded on frozen': 'The distinction between a borderline tumour and invasive carcinoma cannot be made reliably on frozen section; final classification awaits paraffin sections.',
  'Necrotic / autolysed — limited assessment': 'Assessment is limited by extensive necrosis and autolysis.',
  'Frozen artefact — deferred': 'Freezing artefact precludes a definitive interpretation.'
};
/** "serous" from "serous borderline tumour"; "" when no adjective can be read. */
const ovAdjective = (v) => {
  const m = /^(serous|mucinous|seromucinous|endometrioid|clear cell)\b/i.exec(ovType(v));
  return m ? m[1].toLowerCase() : '';
};
const OV_ORGAN = {
  'Salpingo-oophorectomy': ['OVARY AND FALLOPIAN TUBE', 'salpingo-oophorectomy'],
  Oophorectomy: ['OVARY', 'oophorectomy'],
  'Ovarian cystectomy': ['OVARY', 'cystectomy'],
  'Biopsy of ovarian mass': ['OVARY', 'biopsy'],
  'Adnexal mass, NOS': ['ADNEXAL MASS', 'excision']
};
const OV_NOUN = {
  'Salpingo-oophorectomy': 'salpingo-oophorectomy specimen',
  Oophorectomy: 'oophorectomy specimen',
  'Ovarian cystectomy': 'ovarian cystectomy specimen',
  'Biopsy of ovarian mass': 'biopsy of an ovarian mass',
  'Adnexal mass, NOS': 'adnexal mass'
};
const OV_RECEIVED = {
  Intact: 'received intact',
  'Ruptured, capsule defect present on receipt': 'with a capsular defect present on receipt',
  'Fragmented (cystectomy or morcellated)': 'received fragmented',
  'Opened by surgeon': 'opened by the surgeon before receipt'
};
const OV_SURFACE = {
  Smooth: 'The outer surface is smooth.',
  'Excrescences or papillary projections': 'The outer surface bears papillary excrescences.',
  Adhesions: 'The outer surface shows adhesions.',
  'Not assessable': 'The outer surface cannot be assessed.'
};
const OV_CUT = {
  'Unilocular cyst': 'a unilocular cyst', 'Multilocular cyst': 'a multilocular cyst', 'Serous fluid': 'serous fluid', 'Mucinous contents': 'mucinous contents',
  'Sebaceous material and hair': 'sebaceous material and hair', 'Chocolate-brown fluid': 'chocolate-brown fluid', 'Solid areas': 'solid areas',
  'Papillary excrescences (inner surface)': 'papillary excrescences on the inner surface', Necrosis: 'necrosis', Haemorrhage: 'haemorrhage',
  'Torsion (haemorrhagic infarction)': 'haemorrhagic infarction in keeping with torsion'
};

/** Ovarian-form macro: "(A) Received in a fresh state is a right salpingo-oophorectomy specimen received intact. The ovarian mass measures 120 mm … " */
function ovMacro(part) {
  const v = part.values;
  const side = String(v.ovSide || '').trim().toLowerCase();
  const noun = OV_NOUN[v.ovSpecimen] || 'adnexal mass';
  const recv = OV_RECEIVED[v.ovReceived] || OV_RECEIVED.Intact;
  const sizeMm = num(v.ovSizeMm);
  const weight = num(v.ovWeightG);
  const sents = [`(${part.label}) Received in a fresh state is a ${side ? `${side} ` : ''}${noun} ${recv}${sizeMm === null && v.size ? sizePhrase(v) : ''}.`];
  const what = v.ovSpecimen === 'Ovarian cystectomy' ? 'The cyst' : v.ovSpecimen === 'Biopsy of ovarian mass' ? 'The tissue' : 'The ovarian mass';
  if (sizeMm !== null) sents.push(`${what} measures ${fmt(sizeMm)} mm in greatest dimension${weight !== null ? ` and weighs ${fmt(weight)} g` : ''}.`);
  else if (weight !== null) sents.push(`${what} weighs ${fmt(weight)} g.`);
  if (v.ovSpecimen !== 'Biopsy of ovarian mass') sents.push(OV_SURFACE[v.ovSurface] || OV_SURFACE.Smooth);
  const cut = asList(v.ovCut).map((c) => OV_CUT[c]).filter(Boolean);
  if (cut.length) sents.push(`Cut surface shows ${listJoin(cut)}.`);
  const blocks = Math.max(1, Math.round(num(v.ovBlocks) ?? num(v.blocks) ?? 1));
  const areas = asList(v.ovCut).some((c) => /Solid|Papillary/.test(c)) ? 'Representative sections of the solid and papillary areas' : 'Representative sections';
  sents.push(`${areas} are embedded in ${blocks} frozen block${blocks === 1 ? '' : 's'} and subsequently converted to paraffin block${blocks === 1 ? '' : 's'}.`);
  return sents.join(' ');
}

/** Values the linked synoptic part is pre-filled from (engine card; see prefillFromFrozen in generators/ovary_ft_peritoneum.js). */
export function ovSummary(v) {
  if (!isOvary(v)) return null;
  return {
    side: v.ovSide || '', specimen: v.ovSpecimen || '', received: v.ovReceived || 'Intact', sizeMm: num(v.ovSizeMm), weightG: num(v.ovWeightG),
    surface: v.ovSurface || 'Smooth', result: v.ovaryResult || 'Benign', type: ovType(v), caveats: ovCaveats(v)
  };
}

// ---------- lung wedge / nodule scenario (spec: docs/specs/lung-pair.md, Part (a); house wording docs/reference/frozen-section-examples.md §10) ----------

const LU = 'Lung wedge / nodule';
const isLung = (v) => v.scenario === LU;
const LU_MALIGNANT = ['Adenocarcinoma', 'Adenocarcinoma, lepidic-predominant or in situ (extent deferred)', 'Squamous cell carcinoma', 'Non-small cell carcinoma, not further classifiable on frozen', 'Small cell carcinoma', 'Carcinoid tumour', 'Metastatic carcinoma'];
const LU_NOUN = { 'Wedge excision': 'a wedge of lung tissue', 'Nodule excision': 'a nodule of lung tissue', 'Pleural nodule, punch': 'a punch of pleural tissue', Segmentectomy: 'a segmentectomy specimen of lung' };
const LU_PROC = { 'Wedge excision': 'wedge excision', 'Nodule excision': 'excision of nodule', 'Pleural nodule, punch': 'punch biopsy', Segmentectomy: 'segmentectomy' };
const cmToMm = (cm) => (cm === null ? null : Math.round(cm * 10));

const luLobe = (v) => {
  const side = String(v.luSide || '').trim().toLowerCase();
  const lobe = String(v.luLobe || '').trim().toLowerCase();
  return [side, lobe].filter(Boolean).join(' ');
};

/** Parenchymal margin distance in mm from the staple-line field (cm); null when blank. */
const luMarginMm = (v) => cmToMm(num(v.luMarginCm));

/** "parenchymal margin clear (5 mm)" / "parenchymal margin close (3 mm)" / "parenchymal margin involved" / '' */
export function luMarginPhrase(v) {
  const mm = luMarginMm(v);
  switch (v.lungMargin || 'Clear') {
    case 'Involved': return 'parenchymal margin involved';
    case 'Close (< 5 mm)': return `parenchymal margin close${mm === null ? ' (less than 5 mm)' : ` (${fmt(mm)} mm)`}`;
    case 'Not applicable': return '';
    default: return `parenchymal margin clear${mm === null ? '' : ` (${fmt(mm)} mm)`}`;
  }
}

function luMacro(part) {
  const v = part.values;
  const noun = LU_NOUN[v.luSpecimen] || LU_NOUN['Wedge excision'];
  const size = sizePhrase({ size: v.luSize }).replace(/^ /, '');
  const staple = num(v.luStapleCm);
  const sents = [`(${part.label}) Received fresh, ${noun}${size ? ` ${size}` : ''}${staple !== null ? ` with a curvilinear staple line measuring ${fmt(staple)} cm across` : ''}.`];
  if (staple !== null && v.luStapleTrimmed !== false) sents.push('The staple line is trimmed off and submitted separately.');
  if (v.luInked !== false && v.luSpecimen !== 'Pleural nodule, punch') sents.push('The parenchymal margin is inked black.');
  const count = String(v.luNoduleCount ?? '1');
  const largest = num(v.luNoduleCm);
  const marginCm = num(v.luMarginCm);
  const distance = marginCm === null ? '' : `, ${fmt(marginCm)} cm from the staple-line margin`;
  const measure = largest === null ? '' : ` measuring ${fmt(largest)} cm across`;
  if (count === '0') sents.push('Sectioning reveals no discrete lesion.');
  else if (count === '1') sents.push(`Sectioning reveals a firm tan-white nodule${measure}${distance}.`);
  else {
    const second = num(v.luSecondCm);
    const secondDist = num(v.luSecondDistCm);
    const lead = count === '2' ? 'two firm tan-white nodules' : 'multiple firm tan-white nodules';
    let t = `Sectioning reveals ${lead}; the largest${largest === null ? ' lies' : ` measures ${fmt(largest)} cm across`}${distance}`;
    if (second !== null) t += `, and a second nodule measures ${fmt(second)} cm across${secondDist !== null ? `, ${fmt(secondDist)} cm from the main nodule` : ''}`;
    sents.push(`${t}.`);
  }
  if (v.luPleuraGross === 'Puckered') sents.push('The overlying pleura is puckered.');
  else if (v.luPleuraGross === 'Involved grossly') sents.push('The nodule abuts the pleural surface.');
  const blocks = Math.max(1, Math.round(num(v.luBlocks) ?? 1));
  const what = count === '0' ? 'Representative sections' : count === '1' ? 'Representative sections of the nodule' : 'Representative sections of the nodules';
  sents.push(`${what} are embedded in ${blocks} frozen block${blocks === 1 ? '' : 's'} and subsequently converted to paraffin block${blocks === 1 ? '' : 's'}${v.luRemainder !== false ? '; the remaining tissue is submitted for paraffin sections only' : ''}.`);
  return sents.join(' ');
}

/** Values the linked lung synoptic is pre-filled from (engine card; see prefillFromFrozen in generators/lung_carcinoma.js). */
export function lungSummary(v) {
  if (!isLung(v)) return null;
  return {
    side: v.luSide || '', lobe: v.luLobe || '', specimen: v.luSpecimen || 'Wedge excision', sizeCm: v.luSize || '',
    nodules: String(v.luNoduleCount ?? '1'), largestMm: cmToMm(num(v.luNoduleCm)), secondMm: cmToMm(num(v.luSecondCm)), marginMm: luMarginMm(v),
    pleura: v.luPleuraGross || 'Not involved grossly', node: !!v.luNode, nodeResult: v.luNode ? (v.luNodeResult || 'Negative') : '',
    result: v.lungResult || 'Adenocarcinoma', favour: v.luFavour || '', primary: v.luPrimary || '', pattern: stripDot(v.luPattern), margin: v.lungMargin || 'Clear'
  };
}

function luResultLine(v) {
  const m = luMarginPhrase(v);
  const withMargin = (lead) => `${lead}${m ? `; ${m}` : ''}.`;
  switch (v.lungResult || 'Adenocarcinoma') {
    case 'Adenocarcinoma, lepidic-predominant or in situ (extent deferred)': return withMargin('Adenocarcinoma with a lepidic pattern; the extent of invasion is deferred to paraffin sections');
    case 'Squamous cell carcinoma': return withMargin('Squamous cell carcinoma');
    case 'Non-small cell carcinoma, not further classifiable on frozen': return withMargin(`Non-small cell carcinoma${v.luFavour ? `, favour ${v.luFavour}` : ''}; subtyping on paraffin sections`);
    case 'Small cell carcinoma': return withMargin('Small cell carcinoma');
    case 'Carcinoid tumour': return withMargin('Carcinoid tumour');
    case 'Metastatic carcinoma': return withMargin(`Metastatic ${lc1(tumour(v, 'carcinoma'))}${v.luPrimary ? `, consistent with the known ${stripDot(v.luPrimary)} primary` : ''}`);
    case 'Necrotising granulomatous inflammation': return 'Necrotising granulomatous inflammation; no tumour identified.';
    case 'Non-necrotising granulomatous inflammation': return 'Non-necrotising granulomatous inflammation; no tumour identified.';
    case 'Organising pneumonia': return 'Organising pneumonia; no tumour identified.';
    case 'Benign, no tumour identified': return 'No tumour identified in the tissue examined.';
    case 'Deferred': return 'Deferred to paraffin sections.';
    default: return withMargin('Adenocarcinoma');
  }
}

function luTissue(v) {
  const pattern = stripDot(v.luPattern);
  switch (v.lungResult || 'Adenocarcinoma') {
    case 'Adenocarcinoma, lepidic-predominant or in situ (extent deferred)': return 'adenocarcinoma with a predominantly lepidic pattern';
    case 'Squamous cell carcinoma': return 'squamous cell carcinoma';
    case 'Non-small cell carcinoma, not further classifiable on frozen': return 'non-small cell carcinoma';
    case 'Small cell carcinoma': return 'small cell carcinoma';
    case 'Carcinoid tumour': return 'a carcinoid tumour';
    case 'Metastatic carcinoma': return `metastatic ${lc1(tumour(v, 'carcinoma'))}${v.luPrimary ? ` consistent with the known ${stripDot(v.luPrimary)} primary` : ''}`;
    case 'Necrotising granulomatous inflammation': return 'necrotising granulomatous inflammation';
    case 'Non-necrotising granulomatous inflammation': return 'non-necrotising granulomatous inflammation';
    case 'Organising pneumonia': return 'organising pneumonia';
    case 'Benign, no tumour identified': return 'lung parenchyma with no tumour';
    case 'Deferred': return 'the lesion described';
    default: return `adenocarcinoma${pattern ? `, ${pattern}` : ''}`;
  }
}

/** "An intrapulmonary lymph node is identified, showing involvement by metastatic carcinoma with extranodal extension." */
function luNodeSentence(v) {
  if (!isLung(v) || !v.luNode) return '';
  switch (v.luNodeResult || 'Negative') {
    case 'Involved': return 'An intrapulmonary lymph node is identified, showing involvement by metastatic carcinoma.';
    case 'Involved, with extranodal extension': return 'An intrapulmonary lymph node is identified, showing involvement by metastatic carcinoma with extranodal extension.';
    default: return 'An intrapulmonary lymph node is identified and is free of tumour.';
  }
}

function luFinalDx(v) {
  const m = luMarginPhrase(v);
  const withMargin = (lead) => `${lead}${m ? `, ${m}` : ''}`;
  switch (v.lungResult || 'Adenocarcinoma') {
    case 'Adenocarcinoma, lepidic-predominant or in situ (extent deferred)': return withMargin('ADENOCARCINOMA WITH A LEPIDIC PATTERN');
    case 'Squamous cell carcinoma': return withMargin('SQUAMOUS CELL CARCINOMA');
    case 'Non-small cell carcinoma, not further classifiable on frozen': return `NON-SMALL CELL CARCINOMA${v.luFavour ? `, favour ${v.luFavour}` : ''}; see microscopic examination`;
    case 'Small cell carcinoma': return withMargin('SMALL CELL CARCINOMA');
    case 'Carcinoid tumour': return withMargin('CARCINOID TUMOUR');
    case 'Metastatic carcinoma': return `METASTATIC ${tumour(v, 'carcinoma').toUpperCase()}${v.luPrimary ? `, consistent with ${stripDot(v.luPrimary)} primary` : ''}`;
    case 'Necrotising granulomatous inflammation': return 'NECROTISING GRANULOMATOUS INFLAMMATION, no evidence of malignancy';
    case 'Non-necrotising granulomatous inflammation': return 'NON-NECROTISING GRANULOMATOUS INFLAMMATION, no evidence of malignancy';
    case 'Organising pneumonia': return 'ORGANISING PNEUMONIA, no evidence of malignancy';
    case 'Benign, no tumour identified': return 'NO EVIDENCE OF MALIGNANCY';
    case 'Deferred': return 'SEE MICROSCOPIC EXAMINATION';
    default: return withMargin('ADENOCARCINOMA');
  }
}

/** One sentence, as phoned to the surgeon. */
export function frozenResult(part) {
  const v = part.values;
  switch (v.scenario) {
    case 'Margin':
      switch (v.marginResult) {
        case 'Positive': return `${uc1(tumour(v, 'carcinoma'))} present at the margin.`;
        case 'Close': {
          const d = num(v.marginDistance);
          return `No malignancy at the margin; ${lc1(tumour(v, 'tumour'))} approaches to within ${d === null ? 'less than 1' : fmt(d)} mm.`;
        }
        case 'Dysplasia only': return `${v.dysplasiaGrade || 'Moderate'} dysplasia; no invasive malignancy.`;
        case 'Atypical, deferred': return 'Atypical cells present; deferred to paraffin sections.';
        default: return 'No malignancy.';
      }
    case 'Lymph node':
      switch (v.nodeResult) {
        case 'Macrometastasis':
        case 'Micrometastasis': {
          const d = num(v.metSize);
          const kind = v.nodeResult === 'Macrometastasis' ? 'macrometastasis' : 'micrometastasis';
          return `Metastatic ${lc1(tumour(v, 'carcinoma'))} present (${kind}${d === null ? '' : `, ${fmt(d)} mm`}).`;
        }
        case 'Deferred': return 'Deferred to paraffin sections.';
        default: return 'Negative for malignancy.';
      }
    case 'Parathyroid':
      switch (v.parathyroidResult) {
        case 'Parathyroid, normocellular': return 'Parathyroid tissue, normocellular.';
        case 'Thyroid tissue': return 'Thyroid tissue.';
        case 'Lymph node': return 'Lymph node.';
        case 'Adipose tissue': return 'Adipose tissue.';
        case 'Thymic tissue': return 'Thymic tissue.';
        default: return 'Parathyroid tissue, hypercellular.';
      }
    case 'Ovarian / adnexal mass': {
      const t = ovType(v);
      const adj = ovAdjective(v);
      const picked = ovPicked(v);
      const line = (() => {
        switch (v.ovaryResult) {
          case 'Non-neoplastic': return `Non-neoplastic${t ? `; ${lc1(t)}` : ''}.`;
          case 'Borderline':
            if (picked && adj) return `Borderline tumour, ${adj} type; no stromal invasion in the sections examined.`;
            return `Borderline tumour${t ? `, ${lc1(t)}` : ''}.`;
          case 'Borderline, at least (invasion cannot be excluded)':
            return `At least borderline ${adj ? `${adj} ` : ''}tumour; an invasive component cannot be excluded on frozen section.`;
          case 'Malignant':
            if (picked) return `Malignant; ${/carcinoma|carcinosarcoma/i.test(t) ? 'carcinoma, ' : ''}favour ${lc1(t)}.`;
            return `Malignant${t ? `; ${lc1(t)}` : ''}.`;
          case 'Malignant, favour metastatic':
            if (/gastrointestinal/i.test(t)) return 'Malignant; adenocarcinoma, favour metastatic from a gastrointestinal primary.';
            if (/primary not determined/i.test(t)) return 'Malignant; carcinoma, favour metastatic; primary site not determined on frozen section.';
            return `Malignant; favour metastatic ${t ? lc1(t.replace(/^metastatic\s+/i, '')) : 'carcinoma'}.`;
          case 'Deferred': return 'Deferred to paraffin sections.';
          default: return `Benign${t ? `; ${lc1(t)}` : ''}.`;
        }
      })();
      const caveats = ovCaveats(v).map((c) => CAVEAT_TEXT[c]).filter(Boolean);
      return caveats.length ? `${line} ${caveats.join(' ')}` : line;
    }
    case LU: return luResultLine(v);
    case 'Nodule / mass':
      switch (v.noduleResult) {
        case 'Malignant': return `Malignant${v.tumourType ? `; ${lc1(tumour(v))}` : ''}.`;
        case 'Deferred': return 'Deferred to paraffin sections.';
        default: return `Benign${v.tumourType ? `; ${lc1(tumour(v))}` : ''}.`;
      }
    default:
      return v.freeResult ? `${uc1(stripDot(v.freeResult))}.` : 'No malignancy.';
  }
}

/** "(A)-(C)" for a consecutive run of three or more, otherwise "(A) and (B)" / "(A), (C) and (D)". */
export function labelRange(labels) {
  if (labels.length >= 3) {
    const codes = labels.map((l) => l.charCodeAt(0));
    if (codes.every((c, i) => i === 0 || c === codes[i - 1] + 1)) return `(${labels[0]})-(${labels[labels.length - 1]})`;
  }
  return listJoin(labels.map((l) => `(${l})`));
}

export function intraop(parts, ctx) {
  const groups = [];
  for (const p of parts) {
    const text = frozenResult(p);
    const g = groups.find((x) => x.text === text);
    if (g) g.labels.push(p.label); else groups.push({ text, labels: [p.label] });
  }
  const lines = [];
  const who = String(ctx.case.fsPathologists || '').trim();
  if (who) lines.push(`(${who.replace(/^\(|\)$/g, '')})`);
  for (const g of groups) lines.push(`${labelRange(g.labels)} ${g.text}`);
  const time = String(ctx.case.fsTime || '').trim();
  const date = String(ctx.case.fsDate || '').trim();
  const to = String(ctx.case.fsReportedTo || '').trim();
  if (time || date || to) {
    lines.push(`The frozen section diagnosis was phone reported${time ? ` at ${time}` : ''}${date ? ` on ${date}` : ''}${to ? ` to ${to}` : ''}.`);
  }
  return lines.join('\n');
}

// ---------- paraffin microscopy ----------

function defaultTissue(v) {
  switch (v.scenario) {
    case 'Margin':
      return v.marginResult === 'Positive'
        ? `infiltrating ${lc1(tumour(v, 'carcinoma'))} involving the margin`
        : 'squamous mucosa with underlying skeletal muscle';
    case 'Lymph node':
      return ['Macrometastasis', 'Micrometastasis'].includes(v.nodeResult)
        ? `a lymph node infiltrated by metastatic ${lc1(tumour(v, 'carcinoma'))}`
        : 'a lymph node with preserved architecture and reactive follicles';
    case 'Parathyroid':
      switch (v.parathyroidResult) {
        case 'Parathyroid, normocellular': return 'normocellular parathyroid tissue with an admixture of stromal fat';
        case 'Thyroid tissue': return 'thyroid follicles lined by bland follicular cells';
        case 'Lymph node': return 'a lymph node with reactive follicles';
        case 'Adipose tissue': return 'mature adipose tissue';
        case 'Thymic tissue': return 'thymic tissue with Hassall corpuscles';
        default: return 'hypercellular parathyroid tissue composed predominantly of chief cells with a paucity of stromal fat';
      }
    case 'Ovarian / adnexal mass':
      return ovType(v) ? `features of ${lc1(ovType(v))}` : 'ovarian stroma with the lesion described';
    case LU:
      return luTissue(v);
    case 'Nodule / mass':
      return v.tumourType ? `features of ${lc1(tumour(v))}` : 'the lesion described';
    default:
      return v.freeResult ? lc1(stripDot(v.freeResult)) : 'the tissue described';
  }
}

function malignant(v) {
  return (v.scenario === 'Margin' && v.marginResult === 'Positive')
    || (v.scenario === 'Lymph node' && ['Macrometastasis', 'Micrometastasis'].includes(v.nodeResult))
    || (v.scenario === 'Ovarian / adnexal mass' && ['Malignant', 'Malignant, favour metastatic'].includes(v.ovaryResult))
    || (v.scenario === LU && LU_MALIGNANT.includes(v.lungResult || 'Adenocarcinoma'))
    || (v.scenario === 'Nodule / mass' && v.noduleResult === 'Malignant');
}

function closingSentence(v) {
  if (malignant(v) || v.scenario === 'Parathyroid') return '';
  if (v.scenario === 'Margin' && v.marginResult === 'Dysplasia only') return 'There is no evidence of invasive malignancy.';
  if (v.scenario === 'Margin') return 'There is no evidence of dysplasia or malignancy.';
  if (v.scenario === 'Ovarian / adnexal mass' && v.ovaryResult === 'Borderline') return 'There is no evidence of stromal invasion.';
  return 'There is no evidence of malignancy.';
}

export function microscopy(part) {
  const v = part.values;
  const tissue = stripDot(v.tissue) || defaultTissue(v);
  const notes = String(v.additionalNotes || '').trim();
  let s;
  if (v.correlation === 'Discordant') {
    const reason = (v.discordanceReason || 'Sampling').toLowerCase();
    const finalDx = stripDot(v.paraffinDx);
    s = `(${part.label}) The paraffin section shows ${tissue}.`
      + (finalDx ? ` The features are those of ${lc1(finalDx)}.` : '')
      + ` This is discordant with the frozen section diagnosis (${lc1(stripDot(frozenResult(part)))}); the discrepancy is attributed to ${reason}.`;
  } else if (isOvary(v) && v.ovaryResult === 'Borderline, at least (invasion cannot be excluded)') {
    const finalDx = stripDot(v.paraffinDx);
    s = `(${part.label}) The paraffin sections show ${tissue}.`
      + (finalDx ? ` The features are those of ${lc1(finalDx)}.` : ' The presence or absence of stromal invasion is assessed on the paraffin sections.');
  } else if (deferred(v)) {
    const finalDx = stripDot(v.paraffinDx);
    s = `(${part.label}) The frozen section diagnosis was deferred. The paraffin section shows ${tissue}.`
      + (finalDx ? ` The features are those of ${lc1(finalDx)}.` : '');
  } else if (isLung(v)) {
    // House §10: plural "sections" for the lung wedge.
    s = `(${part.label}) The paraffin sections confirm the frozen section diagnosis. They show ${tissue}.`;
    const close = closingSentence(v);
    if (close) s += ` ${close}`;
  } else {
    s = `(${part.label}) The paraffin section confirms the frozen section diagnosis. It shows ${tissue}.`;
    const close = closingSentence(v);
    if (close) s += ` ${close}`;
  }
  const node = luNodeSentence(v);
  if (node) s += ` ${node}`;
  if (notes) s += ` ${notes}`;
  return s;
}

// ---------- final diagnosis line ----------

export function organPhrase(part) {
  const v = part.values;
  if (isLung(v)) {
    const side = String(v.luSide || '').trim().toLowerCase();
    const proc = LU_PROC[v.luSpecimen] || LU_PROC['Wedge excision'];
    if (v.luSpecimen === 'Pleural nodule, punch') return `PLEURA, ${side ? `${side}, ` : ''}${proc} x frozen section`;
    const lobe = luLobe(v);
    return `LUNG, ${lobe ? `${lobe}, ` : ''}${proc} x frozen section`;
  }
  if (ovForm(v)) {
    const [organ, proc] = OV_ORGAN[v.ovSpecimen] || OV_ORGAN['Adnexal mass, NOS'];
    const side = String(v.ovSide || '').trim().toLowerCase();
    return `${organ}, ${side ? `${side}, ` : ''}${proc} x frozen section`;
  }
  const name = specimenName(part).trim();
  const i = name.indexOf(',');
  if (i === -1) return name.toUpperCase();
  return `${name.slice(0, i).toUpperCase()}${name.slice(i)}`;
}

/** Final diagnosis text (uppercase lead) derived from the frozen result, unless a paraffin diagnosis overrides it. */
export function finalDx(part) {
  const v = part.values;
  const override = stripDot(v.paraffinDx);
  if (override && (v.correlation === 'Discordant' || deferred(v))) return override.toUpperCase();
  switch (v.scenario) {
    case 'Margin':
      switch (v.marginResult) {
        case 'Positive': return `INVOLVED BY ${tumour(v, 'carcinoma').toUpperCase()}`;
        case 'Close': {
          const d = num(v.marginDistance);
          return `NO EVIDENCE OF MALIGNANCY; ${lc1(tumour(v, 'tumour'))} within ${d === null ? '1' : fmt(d)} mm of the margin`;
        }
        case 'Dysplasia only': return `${(v.dysplasiaGrade || 'Moderate').toUpperCase()} DYSPLASIA; no evidence of invasive malignancy`;
        case 'Atypical, deferred': return 'SEE MICROSCOPIC EXAMINATION';
        default: return 'NO EVIDENCE OF MALIGNANCY';
      }
    case 'Lymph node':
      switch (v.nodeResult) {
        case 'Macrometastasis':
        case 'Micrometastasis': {
          const d = num(v.metSize);
          const kind = v.nodeResult === 'Macrometastasis' ? 'macrometastasis' : 'micrometastasis';
          return `METASTATIC ${tumour(v, 'carcinoma').toUpperCase()} (${kind}${d === null ? '' : `, ${fmt(d)} mm`})`;
        }
        case 'Deferred': return 'SEE MICROSCOPIC EXAMINATION';
        default: return 'NO EVIDENCE OF MALIGNANCY';
      }
    case 'Parathyroid':
      switch (v.parathyroidResult) {
        case 'Parathyroid, normocellular': return 'NORMOCELLULAR PARATHYROID TISSUE';
        case 'Thyroid tissue': return 'THYROID TISSUE; no parathyroid tissue identified';
        case 'Lymph node': return 'LYMPH NODE; no parathyroid tissue identified';
        case 'Adipose tissue': return 'ADIPOSE TISSUE; no parathyroid tissue identified';
        case 'Thymic tissue': return 'THYMIC TISSUE; no parathyroid tissue identified';
        default: return 'HYPERCELLULAR PARATHYROID TISSUE';
      }
    case 'Ovarian / adnexal mass': {
      const t = ovType(v);
      switch (v.ovaryResult) {
        case 'Non-neoplastic': return t ? t.toUpperCase() : 'NON-NEOPLASTIC; no evidence of malignancy';
        case 'Borderline': return t ? (/borderline/i.test(t) ? t.toUpperCase() : `${t.toUpperCase()}, BORDERLINE`) : 'BORDERLINE TUMOUR';
        case 'Borderline, at least (invasion cannot be excluded)': return override ? override.toUpperCase() : `AT LEAST ${t ? t.toUpperCase() : 'BORDERLINE TUMOUR'}; see microscopic examination`;
        case 'Malignant': return t ? t.toUpperCase() : 'MALIGNANT TUMOUR, see microscopic examination';
        case 'Malignant, favour metastatic':
          if (/gastrointestinal/i.test(t)) return 'METASTATIC ADENOCARCINOMA, favour a gastrointestinal or appendiceal primary';
          if (/primary not determined/i.test(t)) return 'METASTATIC CARCINOMA, primary site not determined';
          return t ? `METASTATIC ${t.replace(/^metastatic\s+/i, '').toUpperCase()}` : 'METASTATIC CARCINOMA, see microscopic examination';
        case 'Deferred': return 'SEE MICROSCOPIC EXAMINATION';
        default: return t ? t.toUpperCase() : 'BENIGN; no evidence of malignancy';
      }
    }
    case LU: return luFinalDx(v);
    case 'Nodule / mass':
      switch (v.noduleResult) {
        case 'Malignant': return v.tumourType ? tumour(v).toUpperCase() : 'MALIGNANT TUMOUR, see microscopic examination';
        case 'Deferred': return 'SEE MICROSCOPIC EXAMINATION';
        default: return v.tumourType ? tumour(v).toUpperCase() : 'BENIGN; no evidence of malignancy';
      }
    default:
      return v.freeResult ? stripDot(v.freeResult).toUpperCase() : 'NO EVIDENCE OF MALIGNANCY';
  }
}

/** Frozen scenario -> synoptic template that can be linked under the same letter (engine card "Stage this part"). */
export const PAIRED_TEMPLATE = { 'Ovarian / adnexal mass': 'ovary_ft_peritoneum', 'Lung wedge / nodule': 'lung_carcinoma' };

/** True when the frozen result is malignant and the scenario has a paired synoptic template. */
export function stageable(part) {
  return !!PAIRED_TEMPLATE[part.values.scenario] && malignant(part.values);
}

export function diagnosis(part, ctx) {
  const organ = organPhrase(part);
  // Ovarian frozen with a linked synoptic part in the same case: the synoptic carries the definitive line.
  const pairId = PAIRED_TEMPLATE[part.values.scenario];
  const linked = !!pairId && (ctx?.case?.parts || []).some((p) => p !== part && p.templateId === pairId);
  return `(${part.label}) ${organ}${organ.endsWith(' x frozen section') ? '' : ', frozen section'} - ${finalDx(part)}${linked ? ', see synoptic report' : ''}`;
}

// ---------- checks ----------

export function validate(part, ctx) {
  const v = part.values;
  const out = [];
  const info = (message) => out.push({ level: 'info', message });
  const warn = (message) => out.push({ level: 'warn', message });
  if (isLung(v)) {
    const mm = luMarginMm(v);
    if (v.lungMargin === 'Close (< 5 mm)' || (mm !== null && mm < 5 && v.lungMargin !== 'Involved' && v.lungMargin !== 'Not applicable')) warn(`Close parenchymal margin${mm === null ? '' : ` (${fmt(mm)} mm)`}: state it in the intraoperative line.`);
    if (v.lungResult === 'Adenocarcinoma, lepidic-predominant or in situ (extent deferred)') info('Lepidic pattern: the invasive size on paraffin decides pTis (AIS), pT1mi (MIA, invasion 5 mm or less) or pT1a.');
    if (malignant(v) && !part.linked && !(ctx?.case?.parts || []).some((p) => p !== part && p.templateId === 'lung_carcinoma')) info('Malignant on frozen: "Stage this part" adds the lung carcinoma synoptic under the same letter.');
    return out;
  }
  if (!isOvary(v)) return out;
  const t = ovType(v);
  const r = v.ovaryResult || 'Benign';
  if (r === 'Malignant' && /mucinous|Brenner|teratoma/i.test(t)) info('Malignant mucinous, Brenner or teratomatous tumour: consider a metastasis; the linked synoptic asks for the primary-site assignment.');
  if (/^Ruptured/.test(v.ovReceived || '') && /Malignant|Borderline/.test(r)) info('Capsule defect on receipt: IC1 (surgical spill) versus IC2 (rupture before surgery) is decided by the operative note; the synoptic asks.');
  if ((num(v.ovBlocks) ?? 0) > 3) info(`${fmt(num(v.ovBlocks))} frozen blocks: more than three blocks is unusual for an intraoperative consultation.`);
  if (r === 'Deferred' && ovCaveats(v).length === 0) warn('Deferred: state the reason for deferral (tick a caveat).');
  if (r === 'Malignant, favour metastatic' && !t) info('Favour metastatic: name the favoured primary or pick "metastatic carcinoma, primary not determined".');
  return out;
}

export default { specimens, specimenName, macro, intraop, microscopy, diagnosis, validate, organPhrase, stageable, PAIRED_TEMPLATE };
