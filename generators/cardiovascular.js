// Cardiovascular (aortic / mitral valve replacement, prosthetic valve explant, ascending aorta / aortic
// root resection) generator. Pure functions: (part, ctx) -> string.
// One part per specimen container; the `specimenName` select decides the part type:
//   valve      "Aortic valve, replacement" / "Mitral valve, replacement"
//   prosthetic "Prosthetic valve, explant"
//   aorta      "Ascending aorta, resection" / "Aortic root, resection"
// Blocks produced (valve):
//   specimens  "Aortic valve, replacement"
//   macro      "(A) Received in formalin are three cusps of aortic valve measuring up to 2.5 x 1.5 x 0.5 cm, with
//               nodular calcification on the aortic aspect. Decalcified and all embedded in 2 blocks."
//   blockKey   "(A) (1-2) Valve cusps, decalcified, all embedded."
//   microscopy "(A) Sections show valve cusps with nodular dystrophic calcification and fibrosis. There is no
//               evidence of active inflammation, vegetation or organisms on Gram and GMS stains."
//   diagnosis  "(A) AORTIC VALVE, replacement - CALCIFIC DEGENERATION, tricuspid morphology; no evidence of endocarditis"
// Aorta parts:
//   macro      "(B) Received in formalin is a segment of aorta measuring 5 cm in length and 3.5 cm in diameter, with
//               a wall thickness of 0.3 cm. The intima shows an intimal tear measuring 1.5 cm with a false lumen.
//               Representative sections in 4 blocks."
//   blockKey   "(B) (1-4) Aortic wall including intimal tear, representative sections."
//   microscopy "(B) Sections show the aortic wall with an intimal tear and a dissection plane within the outer third
//               of the media containing fresh haemorrhage and fibrin. The media shows moderate mucoid extracellular
//               matrix accumulation and elastic fibre fragmentation, with mild loss of smooth muscle nuclei and no
//               laminar medial collapse. Overall, moderate medial degeneration. Atherosclerosis is mild. There is no
//               evidence of aortitis or malignancy."
//   diagnosis  "(B) AORTA, ascending, resection - ACUTE DISSECTION WITH MODERATE MEDIAL DEGENERATION"
// Medial degeneration is graded per the SCVP consensus (mucoid extracellular matrix accumulation, elastic fibre
// fragmentation / loss, smooth muscle nuclei loss, laminar medial collapse, overall grade). Schema snippets add the
// blood culture (endocarditis), large vessel vasculitis (aortitis) and QMH cancer template (neoplasia) comments.
// Wording is protected by tests/cardiovascular.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const lc = (s) => String(s || '').toLowerCase();
const stripDot = (s) => String(s || '').trim().replace(/[.;\s]+$/, '');
/** Option strings may carry an en dash ("Malignant tumour – see comment") or a hyphen; compare on the hyphen form. */
const key = (s) => String(s || '').replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
export const word = (n) => (n >= 0 && n <= 9 ? WORDS[n] : String(n));

// ---------- part types ----------

export const AORTIC_VALVE = 'Aortic valve, replacement';
export const MITRAL_VALVE = 'Mitral valve, replacement';
export const PROSTHETIC = 'Prosthetic valve, explant';
export const ASC_AORTA = 'Ascending aorta, resection';
export const AORTIC_ROOT = 'Aortic root, resection';

export const kindOf = (v) => {
  switch (v.specimenName) {
    case PROSTHETIC: return 'prosthetic';
    case ASC_AORTA:
    case AORTIC_ROOT: return 'aorta';
    default: return 'valve';
  }
};
export const isValve = (v) => kindOf(v) === 'valve';
export const isProsthetic = (v) => kindOf(v) === 'prosthetic';
export const isAorta = (v) => kindOf(v) === 'aorta';
const isMitral = (v) => v.specimenName === MITRAL_VALVE;
const isRoot = (v) => v.specimenName === AORTIC_ROOT;

export const NEGATIVE = 'No evidence of malignancy';
export const hasNeoplasia = (v) => !!v.neoplasia && v.neoplasia !== NEGATIVE;
export const hasVegetations = (v) => !isAorta(v) && v.vegetations === true;
export const hasDissection = (v) => isAorta(v) && !!v.dissection && v.dissection !== 'None';
export const hasAortitis = (v) => isAorta(v) && !!v.aortitis && v.aortitis !== 'None';

export function specimenName(part) {
  return (part.values.specimenName || '').trim() || AORTIC_VALVE;
}

// ---------- macroscopic description ----------

/** "2.5x1.5x0.5" -> "2.5 x 1.5 x 0.5 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

/** A single length ("5", "5 cm", "3.5") -> "5 cm"; '' when blank. */
export function lengthPhrase(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/cm|mm/i.test(s)) return s.replace(/\s*(cm|mm)$/i, ' $1').replace(/\s+/g, ' ');
  const n = num(s);
  return n === null ? s : `${fmt(n)} cm`;
}

const blockCount = (raw, fallback) => Math.max(1, Math.round(num(raw) ?? fallback));
const blockRange = (n) => (n === 1 ? '(1)' : `(1-${n})`);

const VALVE_MACRO = {
  'Nodular calcification, aortic aspect': ', with nodular calcification on the aortic aspect',
  'Nodular calcification': ', with nodular calcification',
  'Thickened and fibrotic': ', which are thickened and fibrotic',
  'Thickened, myxoid and redundant': ', which are thickened, myxoid and redundant',
  Unremarkable: ''
};

function valveMacro(v) {
  const s = [];
  const n = Math.max(1, Math.round(num(v.cuspCount) ?? (isMitral(v) ? 2 : 3)));
  const fragments = !isMitral(v) && key(v.cuspMorphology).startsWith('Fragments');
  const noun = isMitral(v) ? 'mitral valve' : 'aortic valve';
  const piece = fragments ? 'fragment' : isMitral(v) ? 'leaflet' : 'cusp';
  const size = sizePhrase(v.valveSize);
  const sizeClause = size ? ` measuring ${n === 1 ? '' : 'up to '}${size}` : '';
  let appearance = VALVE_MACRO[v.valveMacro] ?? '';
  if (n === 1 && appearance.startsWith(', which are')) appearance = appearance.replace(', which are', ', which is');
  s.push(`Received in formalin ${n === 1 ? `is a ${piece}` : `are ${word(n)} ${piece}s`} of ${noun}${sizeClause}${appearance}.`);
  const blocks = blockCount(v.valveBlocks, 2);
  s.push(`${v.decalcified === false ? 'All' : 'Decalcified and all'} embedded in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  return s.join(' ');
}

function prostheticMacro(v) {
  const s = [];
  const type = stripDot(v.prosthesisType);
  const diam = lengthPhrase(v.prosthesisDiameter);
  s.push(`Received in formalin is an explanted prosthetic valve${type ? ` (${lc(type)})` : ''}${diam ? ` measuring ${diam} in diameter` : ''}.`);
  const blocks = blockCount(v.valveBlocks, 2);
  s.push(`The cusps and sewing ring are ${v.decalcified === false ? '' : 'decalcified and '}all embedded in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  return s.join(' ');
}

const INTIMA_MACRO = {
  'Atheromatous plaques': 'The intima shows atheromatous plaques.',
  Smooth: 'The intima is smooth.',
  'Aneurysmal dilatation': 'The segment is aneurysmally dilated and the intima shows atheromatous plaques.'
};

function aortaMacro(v) {
  const s = [];
  const len = lengthPhrase(v.aortaLength);
  const diam = lengthPhrase(v.aortaDiameter);
  const wall = lengthPhrase(v.aortaWall);
  const dims = [len ? `${len} in length` : '', diam ? `${diam} in diameter` : ''].filter(Boolean).join(' and ');
  s.push(`Received in formalin is a segment of ${isRoot(v) ? 'aortic root' : 'aorta'}${dims ? ` measuring ${dims}` : ''}${wall ? `, with a wall thickness of ${wall}` : ''}.`);
  if (v.intimaMacro === 'Intimal tear with false lumen' || v.intimaMacro === 'Intimal tear') {
    const tear = lengthPhrase(v.tearSize);
    s.push(`The intima shows an intimal tear${tear ? ` measuring ${tear}` : ''}${v.intimaMacro === 'Intimal tear with false lumen' ? ' with a false lumen' : ''}.`);
  } else if (INTIMA_MACRO[v.intimaMacro]) {
    s.push(INTIMA_MACRO[v.intimaMacro]);
  }
  const blocks = blockCount(v.aortaBlocks, 4);
  s.push(`Representative sections in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  return s.join(' ');
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const text = isAorta(v) ? aortaMacro(v) : isProsthetic(v) ? prostheticMacro(v) : valveMacro(v);
  return `(${part.label}) ${text}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  let text;
  if (isAorta(v)) {
    const tear = v.intimaMacro === 'Intimal tear with false lumen' || v.intimaMacro === 'Intimal tear';
    text = `${blockRange(blockCount(v.aortaBlocks, 4))} Aortic wall${tear ? ' including intimal tear' : ''}, representative sections.`;
  } else if (isProsthetic(v)) {
    text = `${blockRange(blockCount(v.valveBlocks, 2))} Prosthetic valve cusps and sewing ring${v.decalcified === false ? '' : ', decalcified'}, all embedded.`;
  } else {
    text = `${blockRange(blockCount(v.valveBlocks, 2))} Valve ${isMitral(v) ? 'leaflets' : 'cusps'}${v.decalcified === false ? '' : ', decalcified'}, all embedded.`;
  }
  return `(${part.label}) ${text}`;
}

// ---------- microscopy ----------

const CALCIFIC_MICRO = {
  None: 'fibrosis and no significant calcification',
  Mild: 'focal nodular dystrophic calcification and fibrosis',
  Moderate: 'nodular dystrophic calcification and fibrosis',
  Severe: 'extensive nodular dystrophic calcification and fibrosis'
};

const ORGANISM_MICRO = {
  Negative: 'Gram and GMS stains show no organisms.',
  'Gram-positive cocci': 'Gram stain shows Gram-positive cocci within the vegetations; GMS stain shows no fungal organisms.',
  'Fungal hyphae': 'GMS stain shows fungal hyphae within the vegetations; Gram stain shows no bacteria.'
};

const NO_ENDOCARDITIS = 'There is no evidence of active inflammation, vegetation or organisms on Gram and GMS stains.';

function vegetationSentences(v, site) {
  return [
    `Vegetations composed of fibrin, platelets and neutrophils are present on the ${site}, with underlying acute inflammation and tissue destruction, in keeping with active endocarditis.`,
    ORGANISM_MICRO[v.organisms] || ORGANISM_MICRO.Negative
  ];
}

function valveMicro(v) {
  const s = [];
  const noun = isMitral(v) ? 'valve leaflets' : 'valve cusps';
  s.push(`Sections show ${noun} with ${CALCIFIC_MICRO[v.calcific] || CALCIFIC_MICRO.Moderate}.`);
  if (!isMitral(v)) {
    if (v.cuspMorphology === 'Bicuspid') s.push('The cusps are in keeping with a bicuspid aortic valve.');
    else if (key(v.cuspMorphology).startsWith('Fragments')) s.push('The valve is received in fragments and the cusp morphology cannot be assessed.');
  }
  if (v.myxoid === 'Present') s.push('There is myxoid degeneration with expansion of the spongiosa.');
  if (v.commissuralFusion === 'Present') s.push('Commissural fusion is present.');
  if (v.rheumatic === 'Present') s.push(`There is diffuse fibrosis of the ${noun} with neovascularisation, in keeping with rheumatic-type valve disease.`);
  if (hasVegetations(v)) s.push(...vegetationSentences(v, `${isMitral(v) ? 'leaflet' : 'cusp'} surface`));
  return s;
}

const PROSTHETIC_MICRO = {
  Pannus: 'pannus formation composed of fibrous tissue extending from the sewing ring over the cusps',
  Thrombus: 'adherent thrombus',
  'Cuspal degeneration': 'cuspal degeneration with collagen disruption and calcification'
};

function prostheticMicro(v) {
  const s = [];
  const findings = Array.isArray(v.prostheticFindings) ? v.prostheticFindings.filter((f) => PROSTHETIC_MICRO[f]) : [];
  if (findings.length) s.push(`Sections show a prosthetic valve with ${listJoin(findings.map((f) => PROSTHETIC_MICRO[f]))}.`);
  else s.push('Sections show prosthetic valve cusps and sewing ring without significant pannus, thrombus or cuspal degeneration.');
  if (hasVegetations(v)) s.push(...vegetationSentences(v, 'prosthetic cusps and sewing ring'));
  return s;
}

const DISSECTION_CONTENT = {
  Acute: 'containing fresh haemorrhage and fibrin',
  Subacute: 'containing organising haemorrhage with granulation tissue and early fibrosis',
  'Chronic, healed': 'which is fibrosed, with neointima lining the false lumen'
};

const AORTITIS_MICRO = {
  'Giant cell': 'There is a granulomatous inflammatory infiltrate within the media with multinucleated giant cells and laminar medial necrosis, in keeping with giant cell aortitis.',
  Lymphoplasmacytic: 'There is a dense lymphoplasmacytic infiltrate within the media and adventitia, in keeping with lymphoplasmacytic aortitis.',
  'IgG4-pattern': 'There is a dense lymphoplasmacytic infiltrate with storiform fibrosis and obliterative phlebitis in the adventitia, in keeping with IgG4-pattern aortitis.',
  Infectious: 'There is a neutrophil-rich inflammatory infiltrate with medial destruction and necrosis, in keeping with infectious aortitis.'
};

const ATHERO_MICRO = {
  None: 'There is no significant atherosclerosis.',
  Mild: 'Atherosclerosis is mild.',
  Moderate: 'Atherosclerosis is moderate.',
  Severe: 'Atherosclerosis is severe.'
};

function aortaMicro(v) {
  const s = [];
  if (hasDissection(v)) {
    const tear = v.intimalTear !== 'Not identified';
    const noFalseLumen = v.falseLumen === 'Outer-media haemorrhage only';
    const plane = noFalseLumen ? 'haemorrhage within the outer third of the media without a defined false lumen' : `a dissection plane within the outer third of the media ${DISSECTION_CONTENT[v.dissection] || DISSECTION_CONTENT.Acute}`;
    s.push(`Sections show the aortic wall with ${tear ? 'an intimal tear and ' : ''}${plane}.`);
    if (!tear) s.push('No intimal tear is identified in the sections examined.');
  } else {
    s.push('Sections show the aortic wall with an intact intima and no dissection.');
  }
  const mecm = v.mecm || 'Moderate';
  const elastic = v.elastic || 'Moderate';
  const smc = v.smcLoss || 'Mild';
  const medial = mecm === elastic
    ? `${lc(mecm)} mucoid extracellular matrix accumulation and elastic fibre fragmentation`
    : `${lc(mecm)} mucoid extracellular matrix accumulation and ${lc(elastic)} elastic fibre fragmentation`;
  const collapse = v.laminarCollapse === 'Present';
  let tail;
  if (smc === 'None') tail = collapse ? 'with laminar medial collapse but no loss of smooth muscle nuclei' : 'without loss of smooth muscle nuclei or laminar medial collapse';
  else tail = `with ${lc(smc)} loss of smooth muscle nuclei and ${collapse ? 'laminar medial collapse' : 'no laminar medial collapse'}`;
  s.push(`The media shows ${medial}, ${tail}.`);
  s.push(`Overall, ${lc(v.medialGrade || 'Moderate')} medial degeneration.`);
  s.push(ATHERO_MICRO[v.atherosclerosis] || ATHERO_MICRO.Mild);
  if (hasAortitis(v)) s.push(AORTITIS_MICRO[v.aortitis]);
  return s;
}

export function microscopy(part) {
  const v = part.values;
  let s;
  if (isAorta(v)) s = aortaMicro(v);
  else if (isProsthetic(v)) s = prostheticMicro(v);
  else s = valveMicro(v);

  if (hasNeoplasia(v)) s.push(`A malignant tumour is present within the ${isAorta(v) ? 'aortic wall' : 'valve'}; see comment.`);

  if (isAorta(v)) {
    if (hasAortitis(v) && hasNeoplasia(v)) { /* both stated above */ } else if (hasAortitis(v)) s.push('There is no evidence of malignancy.');
    else if (hasNeoplasia(v)) s.push('There is no evidence of aortitis.');
    else s.push('There is no evidence of aortitis or malignancy.');
  } else if (!hasVegetations(v)) {
    s.push(NO_ENDOCARDITIS);
  }

  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const HEADER = {
  [AORTIC_VALVE]: 'AORTIC VALVE, replacement',
  [MITRAL_VALVE]: 'MITRAL VALVE, replacement',
  [PROSTHETIC]: 'PROSTHETIC VALVE, explant',
  [ASC_AORTA]: 'AORTA, ascending, resection',
  [AORTIC_ROOT]: 'AORTIC ROOT, resection'
};

const ORGANISM_DX = {
  Negative: 'ACTIVE ENDOCARDITIS, no organisms identified on Gram and GMS stains',
  'Gram-positive cocci': 'ACTIVE INFECTIVE ENDOCARDITIS, Gram-positive cocci on Gram stain',
  'Fungal hyphae': 'ACTIVE INFECTIVE ENDOCARDITIS, fungal hyphae on GMS stain'
};

const PROSTHETIC_DX = { Pannus: 'PANNUS FORMATION', Thrombus: 'THROMBUS', 'Cuspal degeneration': 'CUSPAL DEGENERATION' };

const AORTITIS_DX = {
  'Giant cell': 'GIANT CELL AORTITIS',
  Lymphoplasmacytic: 'LYMPHOPLASMACYTIC AORTITIS',
  'IgG4-pattern': 'LYMPHOPLASMACYTIC AORTITIS, IgG4-pattern',
  Infectious: 'INFECTIOUS AORTITIS'
};

const DISSECTION_DX = { Acute: 'ACUTE DISSECTION', Subacute: 'SUBACUTE DISSECTION', 'Chronic, healed': 'CHRONIC (HEALED) DISSECTION' };

/** Native valve findings: main entities in capitals followed by lower-case qualifiers. */
function valveClauses(v) {
  const main = [];
  if (v.calcific && v.calcific !== 'None') main.push('CALCIFIC DEGENERATION');
  if (v.myxoid === 'Present') main.push('MYXOID DEGENERATION');
  if (v.rheumatic === 'Present') main.push('CHRONIC RHEUMATIC-TYPE VALVE DISEASE');
  const quals = [];
  if (!isMitral(v)) {
    if (v.cuspMorphology === 'Bicuspid') quals.push('bicuspid morphology');
    else if (key(v.cuspMorphology).startsWith('Fragments')) quals.push('cusp morphology cannot be assessed on fragments');
    else quals.push('tricuspid morphology');
  }
  if (v.commissuralFusion === 'Present') quals.push('commissural fusion');
  return { main, quals };
}

function prostheticClauses(v) {
  const findings = Array.isArray(v.prostheticFindings) ? v.prostheticFindings.filter((f) => PROSTHETIC_DX[f]) : [];
  return { main: findings.length ? [findings.map((f) => PROSTHETIC_DX[f]).join(' AND ')] : [], quals: [] };
}

export function diagnosis(part) {
  const v = part.values;
  const header = HEADER[v.specimenName] || HEADER[AORTIC_VALVE];
  const clauses = [];

  if (isAorta(v)) {
    const grade = `${(v.medialGrade || 'Moderate').toUpperCase()} MEDIAL DEGENERATION`;
    const mainClause = hasDissection(v) ? `${DISSECTION_DX[v.dissection] || DISSECTION_DX.Acute} WITH ${grade}` : grade;
    if (hasNeoplasia(v)) {
      clauses.push('MALIGNANT TUMOUR');
      clauses.push(lc(mainClause));
    } else {
      clauses.push(mainClause);
    }
    if (hasAortitis(v)) clauses.push(hasNeoplasia(v) ? lc(AORTITIS_DX[v.aortitis]) : AORTITIS_DX[v.aortitis]);
    if (v.atherosclerosis === 'Moderate' || v.atherosclerosis === 'Severe') clauses.push(`${lc(v.atherosclerosis)} atherosclerosis`);
    if (hasNeoplasia(v)) clauses.push('see comment');
    return `(${part.label}) ${header} - ${clauses.join('; ')}`;
  }

  const { main, quals } = isProsthetic(v) ? prostheticClauses(v) : valveClauses(v);
  if (hasNeoplasia(v)) {
    clauses.push('MALIGNANT TUMOUR');
    if (hasVegetations(v)) clauses.push(lc(ORGANISM_DX[v.organisms] || ORGANISM_DX.Negative));
    if (main.length) clauses.push(`background ${lc(main.join(' and '))}`);
    clauses.push(...quals);
    clauses.push('see comment');
  } else if (hasVegetations(v)) {
    clauses.push(ORGANISM_DX[v.organisms] || ORGANISM_DX.Negative);
    if (main.length) clauses.push(`background ${lc(main.join(' and '))}`);
    clauses.push(...quals);
  } else {
    const head = main.length ? main.join('; ') : 'NO SIGNIFICANT ABNORMALITY';
    clauses.push(quals.length ? `${head}, ${quals.join(', ')}` : head);
    clauses.push('no evidence of endocarditis');
  }
  return `(${part.label}) ${header} - ${clauses.join('; ')}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
