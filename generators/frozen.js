import { stripDot } from './_house.js';
// Frozen section generator. Pure functions: (part, ctx) -> string.
// Each part is one frozen specimen (the department letters frozen specimens A, B, C … and
// converts every frozen block to paraffin, so the same letters carry through to the final report).
// Blocks produced:
//   specimens  "Frozen section: (A) Tongue, medial margin, (B) …"
//   macro      "(A) Received in a fresh state is a piece of tan coloured tissue measuring … All embedded in 1 frozen block, and subsequently converted to paraffin block."
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
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};

/**
 * Margin head line from the pick-lists: "TONGUE, anterior margin, excision". Margins are 40.4 per
 * cent of all frozen parts in the five-year measurement and the descriptor vocabulary is small and
 * repeating, so it is chosen rather than typed. A typed specimen name still wins.
 */
export function marginName(v) {
  const organ = (v.mgOrgan === 'Other' ? String(v.mgOrganOther || '').trim() : String(v.mgOrgan || '').trim());
  if (!organ) return '';
  const desc = (v.mgDescriptor === 'Other' ? String(v.mgDescriptorOther || '').trim() : String(v.mgDescriptor || '').trim());
  const proc = String(v.mgProcedure ?? 'excision').trim();
  const bits = [organ.toUpperCase(), desc ? `${desc.toLowerCase()} margin` : 'margin'];
  // The measured head line ends "excision x frozen section", the same shape the sentinel and
  // pancreatic scenarios already use, so the generic ", frozen section" suffix is not added again.
  return `${bits.join(', ')}${proc ? `, ${proc.toLowerCase()}` : ''} x frozen section`;
}

/**
 * The one block sentence. The five-year file carries six variants across roughly 900 occurrences
 * that differ only in digit-versus-word and one serial comma, plus four scenario-specific hand
 * written copies in this generator. House form is the digit and the comma (774 of the 900).
 * `converted: false` is the minority form, 32 measured cases, where the block is not converted.
 */
export function blockClause(n, converted = true) {
  const b = Math.max(1, Math.round(n || 1));
  const noun = b === 1 ? 'block' : 'blocks';
  if (!converted) return `in ${b} ${noun} for frozen section`;
  return `in ${b} frozen ${noun}, and subsequently converted to paraffin ${noun}`;
}

export function specimenName(part) {
  const v = part.values;
  if (v.specimenName) return v.specimenName;
  if (v.scenario === 'Margin') { const m = marginName(v); if (m) return m; }
  return `Part ${part.label}`;
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
  if (isSln(v)) return slnMacro(part);
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
  // One generated block sentence. The measured file carries six variants across ~900 occurrences
  // that differ only in digit-versus-word and one serial comma; the house form is the digit and the
  // comma (774 of them). 32 cases do not convert the block, which is the `converted` flag.
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 1));
  const blockPhrase = blockClause(blocks, v.converted !== false);
  const handling = v.handling === 'Representative section taken'
    ? `Representative section taken and embedded ${blockPhrase}. The remainder is formalin fixed.`
    : `${v.handling || 'All embedded'} ${blockPhrase}.`;
  // CNS: the smear is the intraoperative preparation and is recorded before the blocks.
  const smear = isCns(v) ? cnsSmearSentence(v) : '';
  const tail = v.cnsPrep === 'Smear only' ? '' : ` ${handling}`;
  const reserved = isCns(v) ? cnsTissueSentences(v) : '';
  return `(${part.label}) Received in a fresh state ${received}.${smear ? ` ${smear}` : ''}${tail}${reserved}`;
}

// ---------- frozen (intraoperative) diagnosis ----------

const deferred = (v) => v.correlation === 'Deferred'
  || (v.scenario === 'Margin' && v.marginResult === 'Atypical, deferred')
  || (v.scenario === 'Lymph node' && v.nodeResult === 'Deferred')
  || (v.scenario === 'Ovarian / adnexal mass' && v.ovaryResult === 'Deferred')
  || (v.scenario === LU && v.lungResult === 'Deferred')
  || (v.scenario === SLN && v.slnResult === 'Deferred')
  || (v.scenario === 'Nodule / mass' && ['Deferred', 'Inadequate for diagnosis', 'Atypical cells present'].includes(v.noduleResult))
  || (v.scenario === CNS && CNS_DEFERRED.includes(v.cnsResult))
  || (v.scenario === PD && v.pdResult === 'Atypical, deferred');

const tumour = (v, fallback) => stripDot(v.tumourType) || fallback;

/**
 * " (0/1)" — the involved-over-examined count appended to a node diagnosis line. 102 of the 598
 * measured cases print it. Generated only when the examined count is recorded, so a case saved
 * before the field existed prints exactly as it did.
 */
function nodeCount(v) {
  const n = num(v.lnExamined);
  if (n === null) return '';
  const examined = Math.max(0, Math.round(n));
  const positive = ['Macrometastasis', 'Micrometastasis'].includes(v.nodeResult)
    ? Math.min(examined, Math.max(1, Math.round(num(v.lnPositive) ?? 1)))
    : 0;
  return ` (${positive}/${examined})`;
}

/**
 * The report register. Uppercase is house and the default; sentence case is the minority register
 * measured in the five-year file and is kept reachable as a case setting rather than left to
 * whatever was typed last. Only runs of two or more capitals are folded, so pTNM stays pTNM and an
 * abbreviation the pathologist typed in a free-text result is not quietly lowercased.
 */
export function applyRegister(text, register) {
  if (register !== 'Sentence case') return text;
  let first = true;
  return String(text).replace(/\b[A-Z]{2,}(?:[ -][A-Z]{2,})*\b/g, (run) => {
    const folded = run.toLowerCase();
    const out = first ? uc1(folded) : folded;
    first = false;
    return out;
  });
}

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
  sents.push(`${areas} are embedded ${blockClause(blocks, v.converted !== false)}.`);
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
  sents.push(`${what} are embedded ${blockClause(blocks, v.converted !== false)}${v.luRemainder !== false ? '; the remaining tissue is submitted for paraffin sections only' : ''}.`);
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

// ---------- pancreatic / bile duct margin scenario (Whipple card, split (g)) ----------
// The intraoperative neck, bile duct and uncinate shavings sent during a pancreaticoduodenectomy.
// The generic macro path already describes a shaving, so this scenario adds only the named margin,
// the result wording and the summary the paraffin synoptic is pre-filled from.

export const PD = 'Pancreatic / bile duct margin';
const isPd = (v) => v.scenario === PD;

/** Margin name -> the noun the report prints, and the paraffin field it pre-fills. */
export const PD_SITES = {
  'Pancreatic neck (transection)': { noun: 'pancreatic neck margin', field: 'neckMargin', mm: 'neckMarginMm' },
  'Bile duct': { noun: 'bile duct margin', field: 'bileDuctMargin', mm: 'bileDuctMarginMm' },
  'Uncinate (superior mesenteric artery)': { noun: 'uncinate margin', field: 'uncinateMargin', mm: 'uncinateMarginMm' },
  'Pancreatic duct': { noun: 'pancreatic duct margin', field: 'pancDuctMargin', mm: 'pancDuctMarginMm' },
  'Proximal (gastric or duodenal)': { noun: 'proximal margin', field: 'proximalMargin', mm: 'proximalMarginMm' },
  'Distal (duodenal or jejunal)': { noun: 'distal margin', field: 'distalMargin', mm: 'distalMarginMm' },
};
const PD_ORIGIN_TEMPLATE = { Pancreatic: 'pancreas_carcinoma', Ampullary: 'ampulla_carcinoma', 'Distal bile duct': 'pancreas_carcinoma' };
const PD_MALIGNANT = ['Carcinoma present at margin', 'Carcinoma close to margin'];
const pdSite = (v) => PD_SITES[v.pdSite] || PD_SITES['Pancreatic neck (transection)'];
const pdResult = (v) => v.pdResult || 'Negative';

function pdResultLine(v) {
  const noun = pdSite(v).noun;
  const d = num(v.pdDistanceMm);
  switch (pdResult(v)) {
    case 'Carcinoma present at margin': return `${uc1(tumour(v, 'carcinoma'))} present at the ${noun}.`;
    case 'Carcinoma close to margin': return `No carcinoma at the ${noun}; ${lc1(tumour(v, 'carcinoma'))} approaches to within ${d === null ? 'less than 1' : fmt(d)} mm.`;
    case 'High-grade dysplasia only': return `High-grade dysplasia at the ${noun}; no invasive carcinoma.`;
    case 'Low-grade dysplasia only': return `Low-grade dysplasia at the ${noun}; no invasive carcinoma.`;
    case 'Atypical, deferred': return `Atypical epithelium at the ${noun}; deferred to paraffin sections.`;
    case 'No epithelium identified': return `No ductal epithelium is identified in the ${noun}.`;
    default: return `No carcinoma or dysplasia at the ${noun}.`;
  }
}

function pdFinalDx(v) {
  const noun = pdSite(v).noun;
  const d = num(v.pdDistanceMm);
  switch (pdResult(v)) {
    case 'Carcinoma present at margin': return `INVOLVED BY ${tumour(v, 'carcinoma').toUpperCase()}`;
    case 'Carcinoma close to margin': return `NO EVIDENCE OF MALIGNANCY; ${lc1(tumour(v, 'carcinoma'))} within ${d === null ? '1' : fmt(d)} mm of the ${noun}`;
    case 'High-grade dysplasia only': return 'HIGH-GRADE DYSPLASIA; no evidence of invasive carcinoma';
    case 'Low-grade dysplasia only': return 'LOW-GRADE DYSPLASIA; no evidence of invasive carcinoma';
    case 'Atypical, deferred': return 'SEE MICROSCOPIC EXAMINATION';
    case 'No epithelium identified': return 'NO DUCTAL EPITHELIUM IDENTIFIED';
    default: return 'NO EVIDENCE OF MALIGNANCY';
  }
}

function pdTissue(v) {
  switch (pdResult(v)) {
    case 'Carcinoma present at margin': return `infiltrating ${lc1(tumour(v, 'carcinoma'))} involving the ${pdSite(v).noun}`;
    case 'Carcinoma close to margin': return `infiltrating ${lc1(tumour(v, 'carcinoma'))} lying close to the inked ${pdSite(v).noun}`;
    case 'High-grade dysplasia only': return 'ductal epithelium with high-grade dysplasia';
    case 'Low-grade dysplasia only': return 'ductal epithelium with low-grade dysplasia';
    case 'No epithelium identified': return 'pancreatic parenchyma and fibrous tissue without ductal epithelium';
    default: return 'pancreatic parenchyma and ducts lined by bland cuboidal epithelium';
  }
}

/**
 * Structured margin summary consumed by the pancreas and ampulla synoptics (prefillFromFrozen).
 * `{site, field, mmField, result, distanceMm, origin, involved}`.
 */
export function marginSummary(v) {
  if (!isPd(v)) return null;
  const site = pdSite(v);
  return {
    site: v.pdSite || 'Pancreatic neck (transection)',
    field: site.field,
    mmField: site.mm,
    result: pdResult(v),
    distanceMm: num(v.pdDistanceMm),
    origin: v.pdOrigin || 'Pancreatic',
    involved: pdResult(v) === 'Carcinoma present at margin',
  };
}

// ---------- breast sentinel lymph node scenario (spec: docs/specs/breast-pair.md, Part (a); house wording docs/reference/frozen-section-examples.md §1–2) ----------

export const SLN = 'Sentinel lymph node';
/** The scenario was breast-only until the five-year measurement (236 sentinel parts, 25 breast parts);
 *  saved cases and fixtures still carry the old value, so both are accepted forever. */
export const SLN_LEGACY = 'Breast sentinel lymph node';
const isSln = (v) => v.scenario === SLN || v.scenario === SLN_LEGACY;
/** Sentinel site, defaulting to breast so cases saved before the site field existed read the same. */
const slnSite = (v) => (v.slnSite === 'Other' ? (String(v.slnSiteOther || '').trim() || 'Breast') : (v.slnSite || 'Breast'));
const slnIsBreast = (v) => slnSite(v) === 'Breast';
const SLN_POSITIVE = ['Isolated tumour cells', 'Micrometastasis', 'Macrometastasis'];
const slnCount = (v) => Math.max(0, Math.round(num(v.slnCount) ?? 1));
const slnPositive = (v) => (SLN_POSITIVE.includes(v.slnResult) ? Math.min(slnCount(v), Math.max(1, Math.round(num(v.slnPositive) ?? 1))) : 0);
const slnTreated = (v) => slnIsBreast(v) && !!v.slnTreatment && v.slnTreatment !== 'No known presurgical therapy';

/** House label: side plus an auto number — "right SLN1", "left SLN 2" as measured. A typed label wins. */
function slnNodeLabel(v) {
  const typed = stripDot(v.slnLabel);
  if (typed) return typed;
  const n = num(v.slnNumber);
  return n === null ? 'sentinel lymph node' : `SLN${fmt(Math.max(1, Math.round(n)))}`;
}

/** "1 cm and 0.5 cm across respectively" from "1 and 0.5" / "1, 0.5" / "1 cm and 0.5 cm". */
function slnNodeSizePhrase(v) {
  const raw = String(v.slnNodeSizes || '').trim();
  if (!raw) return '';
  const sizes = raw.split(/\s*(?:,|and|&)\s*/i).map((s) => s.trim().replace(/\s*cm$/i, '')).filter(Boolean);
  if (!sizes.length) return '';
  const withUnit = sizes.map((s) => `${s} cm`);
  return ` measuring approximately ${listJoin(withUnit)} across${withUnit.length > 1 ? ' respectively' : ''}`;
}

/** House §1 macro: fibroadipose tissue, nodes identified within, fat stripped, frozen blocks processed to paraffin. */
function slnMacro(part) {
  const v = part.values;
  const n = slnCount(v);
  const nodesOnly = v.slnReceived === 'Lymph node(s) only';
  const blocks = Math.max(1, Math.round(num(v.slnBlocks) ?? 1));
  const sizes = slnNodeSizePhrase(v);
  const nodeNoun = n === 1 ? 'lymph node' : 'lymph nodes';
  const sentences = [];
  if (nodesOnly) {
    sentences.push(n === 0
      ? 'Received fresh, a piece of fibroadipose tissue. No definite lymph node is identified.'
      : `Received fresh, ${word(n)} ${nodeNoun}${sizes}.`);
  } else {
    sentences.push(`Received fresh, a piece of fibroadipose tissue${sizePhrase({ size: v.slnSize })}.`);
    sentences.push(n === 0
      ? 'No definite lymph node is identified.'
      : `${uc1(word(n))} ${nodeNoun} ${n === 1 ? 'is' : 'are'} identified within${sizes ? `,${sizes}` : ''}.`);
    if (v.slnFatStripped !== false && n > 0) sentences.push('The fatty tissue is stripped off.');
  }
  sentences.push(`All embedded ${blockClause(blocks, v.converted !== false)}.`);
  return `(${part.label}) ${sentences.join(' ')}`;
}

/** Intraoperative line: "Negative for malignancy." / "Metastatic carcinoma, >2 mm (1 of 2 lymph nodes)." */
function slnResultLine(v, ctx) {
  const n = slnCount(v);
  const pos = slnPositive(v);
  const of = n > 1 ? ` (${pos} of ${n} lymph nodes)` : '';
  switch (v.slnResult || 'Negative') {
    case 'Macrometastasis': return `Metastatic ${lc1(tumour(v, 'carcinoma'))}, >2 mm${of}.`;
    case 'Micrometastasis': return `Metastatic ${lc1(tumour(v, 'carcinoma'))}, 0.2-2 mm (micrometastasis)${of}.`;
    case 'Isolated tumour cells': return `Isolated tumour cells, 0.2 mm or less${of}; negative for macrometastasis.`;
    case 'No nodal tissue identified': return 'No nodal tissue identified; negative for malignancy.';
    case 'Deferred': return 'Deferred to paraffin sections.';
    default: return negative(ctx, 'Negative for malignancy');
  }
}

/** Paraffin microscopy body for the sentinel node part. */
function slnTissue(v) {
  const n = slnCount(v);
  const pos = slnPositive(v);
  const nodes = n === 0 ? 'no lymph node' : `${word(n)} ${n === 1 ? 'lymph node' : 'lymph nodes'}`;
  const fat = v.slnReceived === 'Lymph node(s) only' ? '' : 'fibroadipose tissue and ';
  if (v.slnResult === 'No nodal tissue identified' || n === 0) return 'fibroadipose tissue with no lymph node identified';
  if (!SLN_POSITIVE.includes(v.slnResult)) {
    return slnTreated(v) && v.slnTreatment === 'Presurgical therapy, fibrous scarring and no metastasis'
      ? `${fat}${nodes} with fibrous scarring and no residual metastatic carcinoma`
      : `${fat}${n === 1 ? 'a reactive lymph node' : `${word(n)} reactive lymph nodes`}`;
  }
  const mm = num(v.slnMetMm);
  const kind = v.slnResult === 'Macrometastasis' ? 'macrometastasis' : v.slnResult === 'Micrometastasis' ? 'micrometastasis' : 'isolated tumour cells';
  const focus = `${kind}${mm === null ? '' : `, ${fmt(mm)} mm`}`;
  const which = n === 1 ? 'which is' : pos === n ? 'all of which are' : `${word(pos)} of which ${pos === 1 ? 'is' : 'are'}`;
  let s = `${fat}${nodes}, ${which} involved by metastatic ${lc1(tumour(v, 'carcinoma'))} (${focus})`;
  if (v.slnEne === 'Present') s += ' with extranodal extension';
  if (slnIsBreast(v) && v.slnTreatment === 'Presurgical therapy, metastasis with treatment effect') s += `, with treatment effect${v.slnMillerPayne ? ` (Miller-Payne ${stripDot(v.slnMillerPayne).replace(/^Miller[- ]Payne\s*/i, '')})` : ''}`;
  return s;
}

/** "LYMPH NODES, left SLN 1, excision x frozen section" */
function slnOrganPhrase(v) {
  const n = slnCount(v);
  const side = String(v.slnSide || '').trim().toLowerCase();
  const label = slnNodeLabel(v);
  return `${n === 1 ? 'LYMPH NODE' : 'LYMPH NODES'}, ${side ? `${side} ` : ''}${label}, excision x frozen section`;
}

function slnFinalDx(v) {
  const n = slnCount(v);
  const pos = slnPositive(v);
  const count = ` (${pos}/${n})`;
  const mm = num(v.slnMetMm);
  const tx = slnIsBreast(v) && v.slnTreatment === 'Presurgical therapy, metastasis with treatment effect' ? ', with treatment effect' : '';
  const ene = v.slnEne === 'Present' ? ', with extranodal extension' : '';
  switch (v.slnResult || 'Negative') {
    case 'Macrometastasis': return `METASTATIC ${tumour(v, 'carcinoma').toUpperCase()}, macrometastasis${mm === null ? '' : ` ${fmt(mm)} mm`}${ene}${tx}${count}`;
    case 'Micrometastasis': return `METASTATIC ${tumour(v, 'carcinoma').toUpperCase()}, micrometastasis${mm === null ? '' : ` ${fmt(mm)} mm`}${ene}${tx}${count}`;
    case 'Isolated tumour cells': return `ISOLATED TUMOUR CELLS ONLY${count}`;
    case 'No nodal tissue identified': return 'NO NODAL TISSUE IDENTIFIED; no evidence of malignancy';
    case 'Deferred': return 'SEE MICROSCOPIC EXAMINATION';
    default: return `NO EVIDENCE OF MALIGNANCY${count}`;
  }
}

/**
 * Structured node summary consumed by the breast carcinoma synoptic (prefillFromFrozen).
 * `{examined, positive, macro, micro, itc, largestMm, ene, side, treatment}`.
 */
export function slnSummary(v) {
  if (!isSln(v) || !slnIsBreast(v)) return null;
  const n = slnCount(v);
  const pos = slnPositive(v);
  const r = v.slnResult || 'Negative';
  return {
    examined: n,
    positive: pos,
    macro: r === 'Macrometastasis' ? pos : 0,
    micro: r === 'Micrometastasis' ? pos : 0,
    itc: r === 'Isolated tumour cells' ? pos : 0,
    largestMm: num(v.slnMetMm),
    ene: v.slnEne || 'Not identified',
    side: v.slnSide || '',
    treatment: v.slnTreatment || 'No known presurgical therapy',
  };
}

// ---------- CNS / pituitary scenario ----------

/**
 * 48 parts in the five-year file — 3.7 per cent of parts, 8.0 per cent of cases — and the largest
 * measured category with no scenario at all. The answer list is short and formulaic and is taken
 * from the file: meningioma (11 printed lines), pituitary adenoma, high-grade glioma, schwannoma,
 * epidermoid cyst, infarcted tissue with adjacent brain, no malignancy. Metastatic carcinoma and
 * inadequate for diagnosis come from the file-wide result vocabulary. Smears are the intraoperative
 * preparation the macro has never had words for. No synoptic pairs with it: CNS grading is WHO CNS5
 * and belongs to the `cns_biopsy` template, not to a staging path off the frozen section.
 *
 * Paraffin morphology below is released-report prose. Knowledge grounding, comments only:
 *   meningioma     https://www.pathologyoutlines.com/topic/cnstumormeningiomageneral.html
 *   pituitary      https://clinicalpub.com/histologic-features-of-pituitary-adenomas-and-sellar-region-masses/
 *   high-grade glioma  https://www.ncbi.nlm.nih.gov/books/NBK558954/
 *   schwannoma     https://pmc.ncbi.nlm.nih.gov/articles/PMC7884141/
 *   epidermoid cyst    https://pmc.ncbi.nlm.nih.gov/articles/PMC10832492/
 */
export const CNS = 'CNS / pituitary';
const isCns = (v) => v.scenario === CNS;
const cnsSite = (v) => (v.cnsSite === 'Other' ? (String(v.cnsSiteOther || '').trim() || 'Brain') : (v.cnsSite || 'Brain'));
const cnsResult = (v) => v.cnsResult || 'No malignancy';
const CNS_MALIGNANT = ['High-grade glioma', 'Metastatic carcinoma', 'Lymphoid infiltrate, favour lymphoma'];
// Results that make the frozen answer a deferral rather than a diagnosis.
const CNS_DEFERRED = ['Deferred', 'Inadequate for diagnosis', 'Glial neoplasm, grade deferred',
  'Necrotic tissue only, non-diagnostic', 'Lesional tissue present, classification deferred'];
// Answers that only a frozen section can give; a smear alone does not support them.
const CNS_FROZEN_ONLY = ['Epidermoid cyst', 'Infarcted tissue with adjacent brain', 'Necrotic tissue only, non-diagnostic'];
const cnsSmears = (v) => Math.max(1, Math.round(num(v.cnsSmears) ?? 2));

/** "Two smears are prepared." — the squash/smear sentence, inserted before the block sentence. */
function cnsSmearSentence(v) {
  const prep = v.cnsPrep || 'Smear and frozen section';
  if (prep === 'Frozen section only') return '';
  const n = cnsSmears(v);
  return `${uc1(word(n))} smear${n === 1 ? ' is' : 's are'} prepared from the tissue.`;
}

/** "Lesional tissue remains for paraffin sections. Tissue is reserved fresh for ancillary studies." */
function cnsTissueSentences(v) {
  const s = [];
  if (v.cnsAdequate) s.push('Lesional tissue remains for paraffin sections.');
  if (v.cnsFresh) s.push('Tissue is reserved fresh for ancillary studies.');
  return s.length ? ` ${s.join(' ')}` : '';
}

function cnsResultLine(v, ctx) {
  switch (cnsResult(v)) {
    case 'Low-grade glial neoplasm': return 'Low-grade glial neoplasm.';
    case 'Glial neoplasm, grade deferred': return 'Glial neoplasm; grading deferred to paraffin sections.';
    case 'Lymphoid infiltrate, favour lymphoma': return 'Atypical lymphoid infiltrate, favour lymphoma.';
    case 'Necrotic tissue only, non-diagnostic': return 'Necrotic tissue only; non-diagnostic.';
    case 'Lesional tissue present, classification deferred': return 'Lesional tissue present; classification deferred to paraffin sections.';
    case 'Reactive gliosis, no tumour': return 'Reactive gliosis; no tumour identified.';
    case 'Meningioma': return 'Meningioma.';
    case 'Pituitary adenoma': return 'Pituitary adenoma.';
    case 'High-grade glioma': return 'High-grade glioma.';
    case 'Schwannoma': return 'Schwannoma.';
    case 'Epidermoid cyst': return 'Epidermoid cyst.';
    case 'Infarcted tissue with adjacent brain': return 'Infarcted tissue with adjacent brain.';
    case 'Metastatic carcinoma': {
      const p = stripDot(v.cnsPrimary);
      return `Metastatic carcinoma${p ? `, consistent with the known ${lc1(p)} primary` : ''}.`;
    }
    case 'Inadequate for diagnosis': return 'Inadequate for diagnosis.';
    case 'Deferred': return 'Deferred to paraffin sections.';
    case 'Other': return v.cnsOther ? `${uc1(stripDot(v.cnsOther))}.` : negative(ctx);
    default: return negative(ctx);
  }
}

function cnsTissue(v) {
  switch (cnsResult(v)) {
    case 'Low-grade glial neoplasm':
      return 'a mildly hypercellular glial proliferation with elongated bland nuclei in a fibrillary background, without microvascular proliferation or necrosis';
    case 'Glial neoplasm, grade deferred':
      return 'a hypercellular glial proliferation with nuclear atypia in a fibrillary background';
    case 'Lymphoid infiltrate, favour lymphoma':
      return 'sheets of large atypical lymphoid cells with vesicular nuclei and prominent nucleoli, disposed around and within vessel walls';
    case 'Necrotic tissue only, non-diagnostic':
      return 'necrotic tissue and fibrin without viable lesional tissue';
    case 'Lesional tissue present, classification deferred':
      return 'the lesional tissue described';
    case 'Reactive gliosis, no tumour':
      return 'brain parenchyma with reactive astrocytosis and a scattered macrophage infiltrate';
    case 'Meningioma':
      return 'a meningothelial neoplasm arranged in lobules and whorls, the cells syncytial with indistinct borders, eosinophilic cytoplasm and round nuclei containing intranuclear pseudoinclusions, with scattered psammoma bodies';
    case 'Pituitary adenoma':
      return 'a monotonous population of epithelial cells arranged in sheets and nests around a delicate vascular network, without the acinar architecture of the surrounding anterior pituitary';
    case 'High-grade glioma':
      return 'a hypercellular astrocytic neoplasm with nuclear pleomorphism and brisk mitotic activity, together with microvascular proliferation and foci of necrosis rimmed by pseudopalisading tumour cells';
    case 'Schwannoma':
      return 'a spindle cell neoplasm with alternating compact and loose areas, nuclear palisading forming Verocay bodies, and thick-walled hyalinised vessels';
    case 'Epidermoid cyst':
      return 'a cyst lined by keratinising squamous epithelium with a granular layer, the lumen filled with lamellated anucleate keratin, and no adnexal structures in the wall';
    case 'Infarcted tissue with adjacent brain':
      return 'infarcted tissue with adjacent brain parenchyma showing reactive astrocytosis and a macrophage infiltrate';
    case 'Metastatic carcinoma': {
      const p = stripDot(v.cnsPrimary);
      return `brain parenchyma infiltrated by metastatic carcinoma forming discrete nests with a sharp interface against surrounding gliotic brain${p ? `, consistent with the known ${lc1(p)} primary` : ''}`;
    }
    case 'Inadequate for diagnosis':
      return 'scanty fragments of brain parenchyma with crush artefact';
    case 'Other':
      return v.cnsOther ? lc1(stripDot(v.cnsOther)) : 'the tissue described';
    default:
      return 'brain parenchyma with reactive astrocytosis';
  }
}

function cnsFinalDx(v) {
  switch (cnsResult(v)) {
    case 'Low-grade glial neoplasm': return 'LOW-GRADE GLIAL NEOPLASM';
    case 'Lymphoid infiltrate, favour lymphoma': return 'ATYPICAL LYMPHOID INFILTRATE, FAVOUR LYMPHOMA';
    case 'Reactive gliosis, no tumour': return 'REACTIVE GLIOSIS; NO TUMOUR IDENTIFIED';
    case 'Glial neoplasm, grade deferred':
    case 'Necrotic tissue only, non-diagnostic':
    case 'Lesional tissue present, classification deferred': return 'SEE MICROSCOPIC EXAMINATION';
    case 'Meningioma': return 'MENINGIOMA';
    case 'Pituitary adenoma': return 'PITUITARY ADENOMA';
    case 'High-grade glioma': return 'HIGH-GRADE GLIOMA';
    case 'Schwannoma': return 'SCHWANNOMA';
    case 'Epidermoid cyst': return 'EPIDERMOID CYST';
    case 'Infarcted tissue with adjacent brain': return 'INFARCTED TISSUE WITH ADJACENT BRAIN';
    case 'Metastatic carcinoma': {
      const p = stripDot(v.cnsPrimary);
      return `METASTATIC CARCINOMA${p ? `, consistent with a ${lc1(p)} primary` : ''}`;
    }
    case 'Inadequate for diagnosis':
    case 'Deferred': return 'SEE MICROSCOPIC EXAMINATION';
    case 'Other': return v.cnsOther ? stripDot(v.cnsOther).toUpperCase() : 'NO EVIDENCE OF MALIGNANCY';
    default: return 'NO EVIDENCE OF MALIGNANCY';
  }
}

function cnsOrganPhrase(v) {
  const site = cnsSite(v).toUpperCase();
  const side = String(v.cnsSide || '').trim().toLowerCase();
  const proc = String(v.cnsProcedure || 'biopsy').trim().toLowerCase();
  return `${site}, ${side ? `${side}, ` : ''}${proc} x frozen section`;
}

// ---------- the negative answer ----------

/**
 * Three phrasings of the same negative answer — `No malignancy` (138), `Negative for malignancy`
 * (122), `No evidence of malignancy` (15) — carry 275 of roughly 400 intraoperative result lines in
 * the five-year file. Each scenario keeps the phrasing it already generated as its house default,
 * so nothing that exists changes; the case setting picks one phrasing for the whole report instead
 * of leaving it to whatever was typed last. Compound negatives ("No carcinoma at the pancreatic
 * neck margin", "No tumour identified in the tissue examined") are not one of the three and are
 * left alone.
 */
function negative(ctx, houseDefault = 'No malignancy') {
  const choice = String(ctx?.case?.fsNegative || 'House default');
  return `${choice === 'House default' ? houseDefault : choice}.`;
}

/** One sentence, as phoned to the surgeon. */
export function frozenResult(part, ctx) {
  const v = part.values;
  switch (v.scenario) {
    case CNS:
      return cnsResultLine(v, ctx);
    case PD:
      return pdResultLine(v);
    case 'Margin':
      switch (v.marginResult) {
        case 'Positive': return `${uc1(tumour(v, 'carcinoma'))} present at the margin.`;
        case 'Close': {
          const d = num(v.marginDistance);
          return `No malignancy at the margin; ${lc1(tumour(v, 'tumour'))} approaches to within ${d === null ? 'less than 1' : fmt(d)} mm.`;
        }
        case 'Dysplasia only': return `${v.dysplasiaGrade || 'Moderate'} dysplasia; no invasive malignancy.`;
        case 'Atypical, deferred': return 'Atypical cells present; deferred to paraffin sections.';
        default: return negative(ctx, 'No malignancy');
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
        default: return negative(ctx, 'Negative for malignancy');
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
    case SLN:
    case SLN_LEGACY: return slnResultLine(v, ctx);
    case 'Nodule / mass':
      switch (v.noduleResult) {
        case 'Malignant': return `Malignant${v.tumourType ? `; ${lc1(tumour(v))}` : ''}.`;
        // Measured non-committal answers: "Atypical cells present - need immunostain to confirm",
        // "Scanty suspicious cells present", "Inadequate for diagnosis".
        case 'Atypical cells present': return 'Atypical cells present; immunostaining is required for confirmation.';
        case 'Suspicious cells present': return 'Scanty suspicious cells present.';
        case 'Inadequate for diagnosis': return 'Inadequate for diagnosis.';
        case 'Deferred': return 'Deferred to paraffin sections.';
        default: return `Benign${v.tumourType ? `; ${lc1(tumour(v))}` : ''}.`;
      }
    default:
      return v.freeResult ? `${uc1(stripDot(v.freeResult))}.` : negative(ctx, 'No malignancy');
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
    const text = frozenResult(p, ctx);
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
  // House sentence, measured across 515 of 598 cases: "result", and the recipient before the time.
  if (time || date || to) {
    lines.push(`The frozen section result was phone reported${to ? ` to ${to}` : ''}${time ? ` at ${time}` : ''}${date ? ` on ${date}` : ''}.`);
  }
  return lines.join('\n');
}

// ---------- paraffin microscopy ----------

function defaultTissue(v) {
  switch (v.scenario) {
    case CNS:
      return cnsTissue(v);
    case PD:
      return pdTissue(v);
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
    case SLN:
    case SLN_LEGACY:
      return slnTissue(v);
    case 'Nodule / mass':
      return v.tumourType ? `features of ${lc1(tumour(v))}` : 'the lesion described';
    default:
      return v.freeResult ? lc1(stripDot(v.freeResult)) : 'the tissue described';
  }
}

function malignant(v) {
  return (v.scenario === 'Margin' && v.marginResult === 'Positive')
    || (v.scenario === PD && PD_MALIGNANT.includes(pdResult(v)))
    || (v.scenario === 'Lymph node' && ['Macrometastasis', 'Micrometastasis'].includes(v.nodeResult))
    || (v.scenario === 'Ovarian / adnexal mass' && ['Malignant', 'Malignant, favour metastatic'].includes(v.ovaryResult))
    || (v.scenario === LU && LU_MALIGNANT.includes(v.lungResult || 'Adenocarcinoma'))
    || (v.scenario === SLN && SLN_POSITIVE.includes(v.slnResult))
    || (v.scenario === CNS && CNS_MALIGNANT.includes(cnsResult(v)))
    || (v.scenario === 'Nodule / mass' && v.noduleResult === 'Malignant');
}

// Glial answers that are neoplastic but not graded on the frozen: "no evidence of malignancy"
// would contradict the neoplasm just reported, so the closing sentence is dropped.
const CNS_NO_CLOSING = ['Low-grade glial neoplasm', 'Glial neoplasm, grade deferred'];

function closingSentence(v) {
  if (malignant(v) || v.scenario === 'Parathyroid') return '';
  if (isCns(v) && CNS_NO_CLOSING.includes(cnsResult(v))) return '';
  if (isPd(v) && /dysplasia only$/i.test(pdResult(v))) return 'There is no evidence of invasive carcinoma.';
  if (isPd(v)) return 'There is no evidence of dysplasia or malignancy.';
  if (v.scenario === 'Margin' && v.marginResult === 'Dysplasia only') return 'There is no evidence of invasive malignancy.';
  if (v.scenario === 'Margin') return 'There is no evidence of dysplasia or malignancy.';
  if (v.scenario === 'Ovarian / adnexal mass' && v.ovaryResult === 'Borderline') return 'There is no evidence of stromal invasion.';
  return 'There is no evidence of malignancy.';
}

export function microscopy(part, ctx) {
  const v = part.values;
  const tissue = stripDot(v.tissue) || defaultTissue(v);
  const notes = String(v.additionalNotes || '').trim();
  let s;
  if (v.correlation === 'Discordant') {
    const reason = (v.discordanceReason || 'Sampling').toLowerCase();
    const finalDx = stripDot(v.paraffinDx);
    s = `(${part.label}) The paraffin section shows ${tissue}.`
      + (finalDx ? ` The features are those of ${lc1(finalDx)}.` : '')
      + ` This is discordant with the frozen section diagnosis (${lc1(stripDot(frozenResult(part, ctx)))}); the discrepancy is attributed to ${reason}.`;
  } else if (isOvary(v) && v.ovaryResult === 'Borderline, at least (invasion cannot be excluded)') {
    const finalDx = stripDot(v.paraffinDx);
    s = `(${part.label}) The paraffin sections show ${tissue}.`
      + (finalDx ? ` The features are those of ${lc1(finalDx)}.` : ' The presence or absence of stromal invasion is assessed on the paraffin sections.');
  } else if (deferred(v)) {
    const finalDx = stripDot(v.paraffinDx);
    s = `(${part.label}) The frozen section diagnosis was deferred. The paraffin section shows ${tissue}.`
      + (finalDx ? ` The features are those of ${lc1(finalDx)}.` : '');
  } else if (isLung(v) || isSln(v)) {
    // House §10 (lung) and §2 (sentinel nodes): plural "sections".
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
  if (isCns(v)) return cnsOrganPhrase(v);
  if (isSln(v)) return slnOrganPhrase(v);
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
    case CNS:
      return cnsFinalDx(v);
    case PD:
      return pdFinalDx(v);
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
    case 'Lymph node': {
      const count = nodeCount(v);
      switch (v.nodeResult) {
        case 'Macrometastasis':
        case 'Micrometastasis': {
          const d = num(v.metSize);
          const kind = v.nodeResult === 'Macrometastasis' ? 'macrometastasis' : 'micrometastasis';
          return `METASTATIC ${tumour(v, 'carcinoma').toUpperCase()} (${kind}${d === null ? '' : `, ${fmt(d)} mm`})${count}`;
        }
        case 'Deferred': return 'SEE MICROSCOPIC EXAMINATION';
        default: return `NO EVIDENCE OF MALIGNANCY${count}`;
      }
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
    case SLN:
    case SLN_LEGACY: return slnFinalDx(v);
    case 'Nodule / mass':
      switch (v.noduleResult) {
        case 'Malignant': return v.tumourType ? tumour(v).toUpperCase() : 'MALIGNANT TUMOUR, see microscopic examination';
        case 'Atypical cells present':
        case 'Suspicious cells present':
        case 'Inadequate for diagnosis':
        case 'Deferred': return 'SEE MICROSCOPIC EXAMINATION';
        default: return v.tumourType ? tumour(v).toUpperCase() : 'BENIGN; no evidence of malignancy';
      }
    default:
      return v.freeResult ? stripDot(v.freeResult).toUpperCase() : 'NO EVIDENCE OF MALIGNANCY';
  }
}

/** Frozen scenario -> synoptic template that can be linked under the same letter (engine card "Stage this part"). */
export const PAIRED_TEMPLATE = { 'Ovarian / adnexal mass': 'ovary_ft_peritoneum', 'Lung wedge / nodule': 'lung_carcinoma', [SLN]: 'breast_carcinoma', [SLN_LEGACY]: 'breast_carcinoma', [PD]: 'pancreas_carcinoma' };

/**
 * The paired template for one frozen part. Most scenarios map straight off PAIRED_TEMPLATE; the
 * pancreatobiliary margin picks pancreas or ampulla from the stated origin, because the same neck
 * shaving is sent for both operations. The app prefers this over the static map.
 */
export function pairTemplate(values) {
  if (values?.scenario === PD) return PD_ORIGIN_TEMPLATE[values.pdOrigin] || 'pancreas_carcinoma';
  // The sentinel scenario is no longer breast-only: only a breast sentinel node has a breast
  // synoptic to link to. A vulval or oral sentinel node pairs with nothing yet.
  if (isSln(values || {}) && !slnIsBreast(values || {})) return '';
  return PAIRED_TEMPLATE[values?.scenario] || '';
}

/** Scenarios whose synoptic is a separate specimen (own letter, not linked): the breast SLN pairs with the
 *  breast resection, which is a different specimen, so the button reads "Add breast synoptic" and any SLN
 *  result (negative included) can add it. */
export const PAIR_SEPARATE = { [SLN]: true, [SLN_LEGACY]: true, [PD]: true };

/** True when the scenario has a paired synoptic template and (for same-letter pairs) the result is malignant. */
export function stageable(part) {
  const sc = part.values.scenario;
  return !!pairTemplate(part.values) && (!!PAIR_SEPARATE[sc] || malignant(part.values));
}

export function diagnosis(part, ctx) {
  const organ = organPhrase(part);
  // Ovarian frozen with a linked synoptic part in the same case: the synoptic carries the definitive line.
  const pairId = PAIRED_TEMPLATE[part.values.scenario];
  const linked = !!pairId && !PAIR_SEPARATE[part.values.scenario] && (ctx?.case?.parts || []).some((p) => p !== part && p.templateId === pairId);
  const line = `${organ}${organ.endsWith(' x frozen section') ? '' : ', frozen section'} - ${finalDx(part)}${linked ? ', see synoptic report' : ''}`;
  return `(${part.label}) ${applyRegister(line, ctx?.case?.register)}`;
}

// ---------- checks ----------

export function validate(part, ctx) {
  const v = part.values;
  const out = [];
  const info = (message) => out.push({ level: 'info', message });
  const warn = (message) => out.push({ level: 'warn', message });
  if (isPd(v)) {
    const d = num(v.pdDistanceMm);
    if (pdResult(v) === 'Carcinoma close to margin' && d !== null && d <= 1) warn(`${uc1(pdSite(v).noun)} clearance of ${fmt(d)} mm: at 1 mm or less the paraffin report gives this as a positive margin (R1).`, 'pdDistanceMm');
    if (pdResult(v) === 'Carcinoma close to margin' && d === null) info('Record the clearance in mm: the distance is printed in the intraoperative line and carried into the paraffin synoptic.', 'pdDistanceMm');
    if (pdResult(v) === 'No epithelium identified' && /neck|duct/i.test(v.pdSite || 'Pancreatic neck (transection)')) info('No ductal epithelium in the shaving: say so in the intraoperative line rather than reporting the margin as negative.', 'pdResult');
    if (pdResult(v) === 'High-grade dysplasia only') info('High-grade dysplasia at the margin is recorded separately in the paraffin synoptic; it does not make the margin positive for invasive carcinoma.', 'pdResult');
  }
  if (isLung(v)) {
    const mm = luMarginMm(v);
    if (v.lungMargin === 'Close (< 5 mm)' || (mm !== null && mm < 5 && v.lungMargin !== 'Involved' && v.lungMargin !== 'Not applicable')) warn(`Close parenchymal margin${mm === null ? '' : ` (${fmt(mm)} mm)`}: state it in the intraoperative line.`);
    if (v.lungResult === 'Adenocarcinoma, lepidic-predominant or in situ (extent deferred)') info('Lepidic pattern: the invasive size on paraffin decides pTis (AIS), pT1mi (MIA, invasion 5 mm or less) or pT1a.');
    if (malignant(v) && !part.linked && !(ctx?.case?.parts || []).some((p) => p !== part && p.templateId === 'lung_carcinoma')) info('Malignant on frozen: "Stage this part" adds the lung carcinoma synoptic under the same letter.');
    return out;
  }
  if (isSln(v)) {
    const n = slnCount(v);
    const pos = SLN_POSITIVE.includes(v.slnResult) ? Math.round(num(v.slnPositive) ?? 1) : 0;
    const mm = num(v.slnMetMm);
    if (pos > n) warn(`Nodes involved (${pos}) exceeds the nodes identified (${n}); the count is capped in the report.`);
    if (pos && mm === null) info('Record the size of the largest metastatic focus (mm); it is carried into the breast synoptic.');
    if (n === 0 && v.slnResult !== 'No nodal tissue identified' && v.slnResult !== 'Deferred') warn('No lymph node identified: pick the result "No nodal tissue identified" or enter the node count.', 'slnCount');
    if (v.slnResult === 'Macrometastasis' && mm !== null && mm <= 2) warn(`Macrometastasis with a largest focus of ${fmt(mm)} mm: a macrometastasis is more than 2 mm.`, 'slnMetMm');
    if (v.slnResult === 'Micrometastasis' && mm !== null && (mm > 2 || mm <= 0.2)) warn(`Micrometastasis with a largest focus of ${fmt(mm)} mm: a micrometastasis is more than 0.2 mm and up to 2 mm.`, 'slnMetMm');
    if (v.slnResult === 'Isolated tumour cells' && mm !== null && mm > 0.2) warn(`Isolated tumour cells with a largest focus of ${fmt(mm)} mm: isolated tumour cells measure 0.2 mm or less.`, 'slnMetMm');
    if (v.slnResult === 'Isolated tumour cells') info('Isolated tumour cells only: pN0(i+) in the linked synoptic; the intraoperative line reports negative for macrometastasis.');
    if (v.slnResult && v.slnResult !== 'Deferred' && !(ctx?.case?.parts || []).some((p) => p !== part && p.templateId === 'breast_carcinoma')) info('"Add breast synoptic" adds the breast carcinoma resection as the next part with the sentinel node counts pre-filled.');
    return out;
  }
  if (isCns(v)) {
    const r = cnsResult(v);
    if (v.cnsPrep === 'Smear only' && CNS_FROZEN_ONLY.includes(r)) {
      warn('Smear only: this answer rests on architecture that the smear does not show. Take a frozen section or soften the answer.', 'cnsPrep');
    }
    if (r === 'Lymphoid infiltrate, favour lymphoma' && !v.cnsFresh) {
      warn('Favour lymphoma with no fresh tissue reserved: flow cytometry cannot be added later from the paraffin block.', 'cnsFresh');
    }
    if (['Inadequate for diagnosis', 'Necrotic tissue only, non-diagnostic'].includes(r)) {
      info('Non-diagnostic: say that further sampling is advised in the intraoperative answer given to the surgeon.', 'cnsResult');
    }
    if (r === 'Meningioma') info('"Grading of the meningioma is deferred to paraffin sections" is available as a comment.', 'cnsResult');
    if (['High-grade glioma', 'Low-grade glial neoplasm', 'Glial neoplasm, grade deferred'].includes(r)) {
      info('"WHO CNS5 integrated diagnosis to follow" is available as a comment; the CNS biopsy template writes the paraffin report.', 'cnsResult');
    }
    if (!v.cnsAdequate && !CNS_DEFERRED.includes(r) && r !== 'No malignancy') {
      info('Record whether lesional tissue remains for paraffin sections; the surgeon asks at the time.', 'cnsAdequate');
    }
    return out;
  }
  if (!isOvary(v)) return out;
  const t = ovType(v);
  const r = v.ovaryResult || 'Benign';
  if (r === 'Malignant' && /mucinous|Brenner|teratoma/i.test(t)) info('Malignant mucinous, Brenner or teratomatous tumour: consider a metastasis; the linked synoptic asks for the primary-site assignment.');
  if (/^Ruptured/.test(v.ovReceived || '') && /Malignant|Borderline/.test(r)) info('Capsule defect on receipt: IC1 (surgical spill) versus IC2 (rupture before surgery) is decided by the operative note; the synoptic asks.');
  if ((num(v.ovBlocks) ?? 0) > 3) info(`${fmt(num(v.ovBlocks))} frozen blocks: more than three blocks is unusual for an intraoperative consultation.`, 'ovBlocks');
  if (r === 'Deferred' && ovCaveats(v).length === 0) warn('Deferred: state the reason for deferral (tick a caveat).', 'ovCaveat');
  if (r === 'Malignant, favour metastatic' && !t) info('Favour metastatic: name the favoured primary or pick "metastatic carcinoma, primary not determined".', 'ovType');
  return out;
}

export default { specimens, specimenName, marginName, blockClause, macro, intraop, microscopy, diagnosis, validate, organPhrase, stageable, applyRegister, PAIRED_TEMPLATE, PAIR_SEPARATE, pairTemplate, marginSummary, PD, PD_SITES, SLN, SLN_LEGACY, CNS };
