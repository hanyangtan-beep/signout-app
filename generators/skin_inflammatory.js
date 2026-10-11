// Skin biopsy (inflammatory) generator (biopsy).
//
// Medical skin biopsies: the reaction pattern and its features, the infiltrate, special stains and direct
// immunofluorescence, with graft-versus-host disease as one of the patterns. Card: docs/roadmap.md
// "Inflammatory dermatoses — medical skin biopsy" (user request and pulled by the user 2026-10-11).
// Grounding: docs/reference/skin_inflammatory-morphology.md (sources and URLs there, never in a printed line).
//
// Measured on the skin parts of the 2021-2026 biopsy export (aggregate shares only):
//   - 77% of skin punch biopsies are inflammatory (89% in the 2024-2026 LIS export); 90% of excisions are
//     lesions. A punch or biopsy line therefore opens this form unless it names a lesion and no rash.
//   - Released inflammatory diagnoses are mostly a pattern or an entity with no qualifier; "in keeping with"
//     leads the qualified ones, ahead of "consistent with" and "suggestive of".
//   - "Please correlate with clinical findings." sits in the microscopy far more often than in the diagnosis,
//     and pattern diagnoses often end "(please see description)".
//   - House sentences kept verbatim: "Sections show a piece of skin down to the subcutis.", "No fungal organisms
//     are identified on PASD stain.", "Direct immunofluorescence studies for IgA, IgG, IgM, C3, C1q and
//     fibrinogen are all negative.", "The overall features are those of ...".
//
// Blocks produced:
//   specimenName / specimens   "Skin, left forearm, punch biopsy"
//   macro, blockKey            the skin excision form's punch wording ("Received in formalin is a punch biopsy of skin ...")
//   microscopy                 opens "Sections show ..."
//   diagnosis                  "(A) SKIN, left forearm, punch biopsy - SPONGIOTIC DERMATITIS with EOSINOPHILS (please see description)"
// Wording is protected by tests/skin_inflammatory.test.js and tests/fixtures/skin_inflammatory/ — change it only deliberately.

import { stripDot, checks } from './_house.js';
import { sizePhrase } from './skinexcision.js';

const arr = (x) => (Array.isArray(x) ? x : []);
const has = (list, x) => arr(list).includes(x);
const list = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const an = (phrase) => (/^[aeiou]/i.test(phrase) ? `an ${phrase}` : `a ${phrase}`);

// ---------- pattern and diagnosis ----------

export const GVHD = 'Graft-versus-host disease';
export const NSA = 'No significant abnormality';
export const patternOf = (v) => v.pattern || 'Spongiotic';

// The pattern-level choices: the first entry of each pattern's list in the schema, and the two other
// vessel patterns. They print as the pattern itself, with "(please see description)".
export const PATTERN_LEVEL = new Set([
  'Spongiotic dermatitis', 'Psoriasiform dermatitis', 'Interface dermatitis', 'Lichenoid dermatitis', 'Perivascular dermatitis',
  'Leukocytoclastic vasculitis', 'Medium-vessel vasculitis', 'Occlusive vasculopathy', 'Blistering dermatosis',
  'Granulomatous dermatitis', 'Panniculitis', 'Dermal sclerosis', 'Folliculitis', 'Neutrophilic dermatosis'
]);

/** The diagnosis chosen, or the pattern's own entry when the value belongs to another pattern. */
export function dxOf(v, schema) {
  const f = (schema?.fields || []).find((x) => x.id === 'dx');
  const opts = f?.optionsByField?.map?.[patternOf(v)];
  if (opts && !opts.includes(v.dx)) return opts[0];
  return v.dx || 'Spongiotic dermatitis';
}

// Auto wording. A disease the histology names on its own prints alone ("LICHEN PLANUS"); one that needs the
// clinical picture, or immunofluorescence not yet recorded, prints after the pattern: "LICHENOID DERMATITIS,
// in keeping with a LICHENOID DRUG ERUPTION". The split follows the reference doc: these are the entities its
// sources describe as clinicopathological, or defined by their immunofluorescence.
const NEEDS_CONTEXT = new Set([
  'Allergic contact dermatitis', 'Arthropod bite reaction', 'Spongiotic drug reaction', 'Pityriasis rosea', 'Seborrhoeic dermatitis',
  'Psoriasis', 'Pityriasis rubra pilaris',
  'Erythema multiforme', 'Fixed drug eruption', 'Drug eruption', 'Cutaneous lupus erythematosus', 'Dermatomyositis', 'Pityriasis lichenoides',
  'Lichenoid drug eruption', 'Lichen planopilaris', 'Urticaria',
  'IgA vasculitis', 'Urticarial vasculitis', 'Cutaneous polyarteritis nodosa', 'Livedoid vasculopathy', 'Calciphylaxis',
  'Bullous pemphigoid', 'Pemphigus vulgaris', 'Pemphigus foliaceus', 'Dermatitis herpetiformis', 'Linear IgA disease',
  'Epidermolysis bullosa acquisita', 'Porphyria cutanea tarda',
  'Sarcoidosis', 'Necrobiosis lipoidica', 'Erythema nodosum', 'Lipodermatosclerosis', 'Lupus panniculitis',
  'Morphoea', 'Eosinophilic folliculitis', 'Sweet syndrome', 'Pyoderma gangrenosum'
]);
// An immunobullous disease (or IgA vasculitis) prints alone once its own deposit is recorded.
export const DIF_DEFINES = {
  'Bullous pemphigoid': 'Linear IgG and C3 along the basement membrane zone',
  'Epidermolysis bullosa acquisita': 'Linear IgG and C3 along the basement membrane zone',
  'Linear IgA disease': 'Linear IgA along the basement membrane zone',
  'Pemphigus vulgaris': 'Intercellular IgG and C3 in the epidermis',
  'Pemphigus foliaceus': 'Intercellular IgG and C3 in the epidermis',
  'Dermatitis herpetiformis': 'Granular IgA in the dermal papillae',
  'IgA vasculitis': 'Perivascular IgA and C3 in superficial dermal vessels'
};
const difConfirms = (v, dx) => DIF_DEFINES[dx] && v.dif === 'Positive' && v.difPattern === DIF_DEFINES[dx];

/** '' (the disease alone) or the lower-case qualifier that links it to the pattern. */
export function qualifierOf(v, dx) {
  const c = v.certainty || 'Auto';
  if (c === 'Diagnostic') return '';
  if (c !== 'Auto') return c.toLowerCase();
  if (difConfirms(v, dx)) return '';
  return NEEDS_CONTEXT.has(dx) ? 'in keeping with' : '';
}

// Entities written with an article in a sentence ("in keeping with an arthropod bite reaction").
const ARTICLE = new Set(['Arthropod bite reaction', 'Spongiotic drug reaction', 'Fixed drug eruption', 'Drug eruption',
  'Lichenoid drug eruption', 'Lichenoid keratosis']);
const UPPER = { 'IgA vasculitis': 'IgA VASCULITIS', 'Linear IgA disease': 'LINEAR IgA DISEASE' };
const PROSE = { 'IgA vasculitis': 'IgA vasculitis', 'Linear IgA disease': 'linear IgA disease', 'Sweet syndrome': 'Sweet syndrome',
  'Pityrosporum folliculitis': 'Pityrosporum folliculitis', 'Demodex folliculitis': 'Demodex folliculitis' };
const upper = (d) => UPPER[d] || d.toUpperCase();
const prose = (d) => PROSE[d] || d.toLowerCase();
const entityUpper = (d) => (ARTICLE.has(d) ? `${/^[aeiou]/i.test(d) ? 'an' : 'a'} ${upper(d)}` : upper(d));
const entityProse = (d) => (ARTICLE.has(d) ? an(prose(d)) : prose(d));

const PERIVASCULAR = {
  'Superficial perivascular': 'SUPERFICIAL PERIVASCULAR DERMATITIS',
  'Superficial and deep perivascular': 'SUPERFICIAL AND DEEP PERIVASCULAR DERMATITIS',
  'Superficial and deep perivascular and periadnexal': 'SUPERFICIAL AND DEEP PERIVASCULAR DERMATITIS',
  'Superficial perivascular and interstitial': 'SUPERFICIAL PERIVASCULAR AND INTERSTITIAL DERMATITIS'
};
const GRANULOMA = {
  Sarcoidal: 'SARCOIDAL GRANULOMATOUS DERMATITIS', Palisading: 'PALISADING GRANULOMATOUS DERMATITIS',
  Interstitial: 'INTERSTITIAL GRANULOMATOUS DERMATITIS', Tuberculoid: 'GRANULOMATOUS DERMATITIS',
  Suppurative: 'SUPPURATIVE GRANULOMATOUS DERMATITIS', 'Foreign body': 'FOREIGN BODY GRANULOMATOUS REACTION'
};
const PANNICULITIS = { Septal: 'SEPTAL PANNICULITIS', Lobular: 'LOBULAR PANNICULITIS', 'Septal and lobular': 'MIXED SEPTAL AND LOBULAR PANNICULITIS' };

function blisterPhrase(v) {
  const acantholytic = has(v.featBullous, 'Acantholysis') ? 'ACANTHOLYTIC ' : '';
  const level = v.blisterLevel || 'Subepidermal';
  if (level === 'Subepidermal') return `${v.blisterContent === 'Few inflammatory cells' ? 'CELL-POOR ' : ''}SUBEPIDERMAL ${acantholytic}BLISTERING DERMATOSIS`;
  return `${level.toUpperCase()} ${acantholytic}BLISTERING DERMATOSIS`;
}

/** The pattern as a diagnosis, before any cell suffix: "SPONGIOTIC DERMATITIS", "SEPTAL PANNICULITIS". */
export function patternPhrase(v, dx) {
  switch (patternOf(v)) {
    case 'Spongiotic': return 'SPONGIOTIC DERMATITIS';
    case 'Psoriasiform': return 'PSORIASIFORM DERMATITIS';
    case 'Interface (vacuolar)': return 'INTERFACE DERMATITIS';
    case 'Interface (lichenoid)': return 'LICHENOID DERMATITIS';
    case 'Perivascular': return PERIVASCULAR[v.infiltrate] || 'PERIVASCULAR DERMATITIS';
    case 'Vasculitis':
      if (['Medium-vessel vasculitis', 'Cutaneous polyarteritis nodosa'].includes(dx)) return 'MEDIUM-VESSEL VASCULITIS';
      if (['Occlusive vasculopathy', 'Livedoid vasculopathy', 'Calciphylaxis'].includes(dx)) return 'OCCLUSIVE VASCULOPATHY';
      return 'LEUKOCYTOCLASTIC VASCULITIS';
    case 'Vesiculobullous': return blisterPhrase(v);
    case 'Granulomatous': return GRANULOMA[v.granulomaType] || 'GRANULOMATOUS DERMATITIS';
    case 'Panniculitis': return `${PANNICULITIS[v.compartment] || 'SEPTAL PANNICULITIS'}${has(v.featPanniculitis, 'Vasculitis') ? ' WITH VASCULITIS' : ''}`;
    case 'Sclerosing': return 'DERMAL SCLEROSIS';
    case 'Folliculitis':
      return `${has(v.featFollicular, 'Neutrophils in the follicle') ? 'SUPPURATIVE ' : ''}FOLLICULITIS${has(v.featFollicular, 'Ruptured follicle') ? ' WITH FOLLICULAR RUPTURE' : ''}`;
    case 'Neutrophilic dermatosis': return 'NEUTROPHILIC DERMATOSIS';
    default: return '';
  }
}

// Eosinophils (or the blister's cells) name themselves after the pattern: "SPONGIOTIC DERMATITIS with EOSINOPHILS".
const EOS_PATTERNS = ['Spongiotic', 'Psoriasiform', 'Interface (vacuolar)', 'Interface (lichenoid)', 'Perivascular'];
const BLISTER_CELLS = { Eosinophils: ' WITH EOSINOPHILS', Neutrophils: ' WITH NEUTROPHILS', 'Eosinophils and neutrophils': ' WITH EOSINOPHILS AND NEUTROPHILS' };
export function cellSuffix(v) {
  const p = patternOf(v);
  if (p === 'Vesiculobullous') return BLISTER_CELLS[v.blisterContent || 'Eosinophils'] || '';
  if (!EOS_PATTERNS.includes(p)) return '';
  const eos = has(v.cells, 'Eosinophils')
    || (p === 'Spongiotic' && has(v.featSpongiotic, 'Eosinophilic spongiosis'))
    || (p === 'Perivascular' && has(v.featPerivascular, 'Interstitial eosinophils'));
  return eos ? ' WITH EOSINOPHILS' : '';
}

// ---------- graft-versus-host disease ----------
// NIH 2014 Pathology Working Group (Shulman et al., Biol Blood Marrow Transplant 2015): the final categories are
// "Not GVHD", "Possible GVHD" and "Likely GVHD" (Table 2); "likely" takes in the former "consistent with" and
// "unequivocal" categories, so the diagnosis prints the category's own word as its qualifier. The minimal
// criterion is apoptosis in the basal or lower spinous layer, the follicle or the acrosyringium (Table 1).
// The Lerner grade (acute GVHD only; chronic GVHD is not Lerner-graded) follows the secondary sources in
// docs/reference/skin_inflammatory-morphology.md §20.5 — the 1974 original is not online.

const APOPTOSIS = ['Apoptotic keratinocytes in the basal layer', 'Apoptotic keratinocytes in the lower spinous layer',
  'Apoptotic cells in the follicular epithelium', 'Apoptotic cells in the acrosyringium'];
/** '0' to 'IV', or '' when the grade is not given. */
export function lernerOf(v) {
  if (v.lerner === 'Not graded') return '';
  if (v.lerner && v.lerner !== 'Auto') return v.lerner;
  const f = v.gvhdFeatures;
  if (has(f, 'Separation of the epidermis')) return 'IV';
  if (has(f, 'Subepidermal clefts')) return 'III';
  if (APOPTOSIS.some((x) => has(f, x))) return 'II';
  if (has(f, 'Basal vacuolar change')) return 'I';
  return '0';
}
const acuteOf = (v) => ['Acute', 'Acute and chronic'].includes(v.gvhdPhase || 'Acute');
const GVHD_TYPE = {
  Acute: ['INTERFACE DERMATITIS', 'ACUTE GRAFT-VERSUS-HOST DISEASE', ''],
  'Chronic, lichen planus-like': ['LICHENOID DERMATITIS', 'CHRONIC GRAFT-VERSUS-HOST DISEASE', 'lichen planus-like'],
  'Chronic, morphoea-like': ['DERMAL SCLEROSIS', 'CHRONIC GRAFT-VERSUS-HOST DISEASE', 'morphoea-like'],
  'Chronic, lichen sclerosus-like': ['DERMAL SCLEROSIS', 'CHRONIC GRAFT-VERSUS-HOST DISEASE', 'lichen sclerosus-like'],
  'Acute and chronic': ['INTERFACE DERMATITIS', 'ACUTE AND CHRONIC GRAFT-VERSUS-HOST DISEASE', '']
};
export const nihOf = (v) => v.nih || 'Likely GVHD';

function gvhdParts(v) {
  const [phrase, disease, chronic] = GVHD_TYPE[v.gvhdPhase] || GVHD_TYPE.Acute;
  const grade = acuteOf(v) ? lernerOf(v) : '';
  // Likely GVHD carries its grade or its chronic pattern in brackets; a possible GVHD names neither.
  const note = grade && grade !== '0' ? `Lerner grade ${grade}` : chronic;
  return { phrase, disease, note: nihOf(v) === 'Likely GVHD' ? note : '' };
}
function gvhdLine(v) {
  const g = gvhdParts(v);
  if (nihOf(v) === 'Not GVHD') return 'NO EVIDENCE OF GRAFT-VERSUS-HOST DISEASE';
  const word = nihOf(v) === 'Possible GVHD' ? 'possible' : 'likely';
  return `${g.phrase}, ${word} ${g.disease}${g.note ? ` (${g.note})` : ''}`;
}
function gvhdOverall(v) {
  if (nihOf(v) === 'Not GVHD') return 'There is no evidence of graft-versus-host disease.';
  const g = gvhdParts(v);
  const lower = g.phrase.toLowerCase();
  const phrase = lower === 'dermal sclerosis' ? lower : an(lower);
  const verb = nihOf(v) === 'Possible GVHD' ? 'may represent' : 'likely represent';
  return `The overall features are those of ${phrase} and ${verb} ${g.disease.toLowerCase()}${g.note ? ` (${g.note})` : ''}.`;
}

// ---------- specimen and macroscopy ----------

const PROC = {
  'Punch biopsy': { word: 'punch biopsy', received: 'a punch biopsy of skin', second: 'punch biopsy of skin', block: 'Punch' },
  'Shave biopsy': { word: 'shave biopsy', received: 'a shave of skin', second: 'shave of skin', block: 'Shave' },
  'Incisional biopsy': { word: 'incisional biopsy', received: 'an incisional biopsy of skin', second: 'incisional biopsy of skin', block: 'Incisional biopsy' },
  Excision: { word: 'excision', received: 'an ellipse of skin', second: 'ellipse of skin', block: 'Ellipse' }
};
const procOf = (v) => PROC[v.procedure] || PROC['Punch biopsy'];
const blockCount = (v) => Math.max(1, Math.round(Number.parseFloat(v.blocks) || 1));

// The site as the line reads it, first letter lowered unless it is an acronym ("left forearm", "UK").
export const siteOf = (v) => stripDot(v.specimenName).replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase());

export function specimenName(part) {
  const site = siteOf(part.values);
  const word = procOf(part.values).word;
  return site ? `Skin, ${site}, ${word}` : `Skin, ${word}`;
}

const HANDLING = { Bisected: 'Bisected and all embedded', 'Serially sliced': 'Serially sliced and all embedded', 'Embedded whole': 'All embedded' };
const DIF_MEDIUM = { 'Received fresh': 'fresh', "Received in Michel's medium": "in Michel's medium" };

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const p = procOf(v);
  const size = sizePhrase(v.size);
  const n = blockCount(v);
  const s = [`Received in formalin is ${p.received}${size ? ` measuring ${size}` : ''}.`,
    `${HANDLING[v.handling] || HANDLING.Bisected} in ${n} block${n === 1 ? '' : 's'}.`];
  if (DIF_MEDIUM[v.difReceived]) {
    const d = sizePhrase(v.difSize);
    s.push(`A second ${p.second}${d ? ` measuring ${d}` : ''} is received ${DIF_MEDIUM[v.difReceived]} for direct immunofluorescence.`);
  }
  return `(${part.label}) ${s.join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const n = blockCount(v);
  const how = { Bisected: ', bisected', 'Serially sliced': ', serially sliced', 'Embedded whole': '' }[v.handling] ?? ', bisected';
  return `(${part.label}) ${n === 1 ? '(1)' : `(1-${n})`} ${procOf(v).block}${how}, all embedded.`;
}

// ---------- microscopy ----------
// Each feature is [where, phrase]: 'e' joins the epidermis sentence, 'd' the dermis sentence, 's' is a sentence
// of its own, 'w' / 'r' are a vessel's wall and its surroundings. A list of phrases joins the list item by item.

const FEAT = {
  featSpongiotic: {
    Parakeratosis: ['e', 'parakeratosis'], 'Mounds of parakeratosis': ['e', 'mounds of parakeratosis'],
    'Spongiotic vesicles': ['e', 'spongiotic vesicles'], 'Exocytosis of lymphocytes': ['e', 'exocytosis of lymphocytes'],
    'Eosinophilic spongiosis': ['e', 'eosinophilic spongiosis'], Acanthosis: ['e', 'acanthosis'],
    'Papillary dermal oedema': ['d', 'papillary dermal oedema'], 'Extravasated red cells': ['d', 'extravasated red cells'],
    'Haemosiderin-laden macrophages': ['d', 'haemosiderin-laden macrophages'],
    'Proliferation of small thick-walled vessels': ['d', 'a proliferation of small thick-walled vessels in the papillary dermis'],
    'Dermal fibrosis': ['d', 'dermal fibrosis']
  },
  featPsoriasiform: {
    'Confluent parakeratosis': ['e', 'confluent parakeratosis'], 'Neutrophils in the parakeratotic scale': ['e', 'neutrophils in the parakeratotic scale'],
    'Spongiform pustules': ['e', 'spongiform pustules'], 'Loss of the granular layer': ['e', 'loss of the granular layer'],
    'Suprapapillary thinning': ['e', 'thinning of the suprapapillary plates'], 'Compact orthokeratosis': ['e', 'compact orthokeratosis'],
    Hypergranulosis: ['e', 'hypergranulosis'], 'Alternating orthokeratosis and parakeratosis': ['e', 'alternating orthokeratosis and parakeratosis'],
    'Focal spongiosis': ['e', 'focal spongiosis'], 'Dilated tortuous papillary capillaries': ['d', 'dilated tortuous capillaries in the dermal papillae'],
    'Vertically orientated papillary dermal collagen': ['d', 'vertically orientated collagen in the papillary dermis']
  },
  featVacuolar: {
    'Basal vacuolar change': ['e', 'basal vacuolar change'], 'Apoptotic keratinocytes': ['e', 'scattered apoptotic keratinocytes'],
    'Apoptotic keratinocytes at all levels': ['e', 'apoptotic keratinocytes at all levels of the epidermis'],
    'Confluent epidermal necrosis': ['e', 'confluent epidermal necrosis'], 'Exocytosis of lymphocytes': ['e', 'exocytosis of lymphocytes'],
    'Epidermal atrophy': ['e', 'atrophy'], 'Follicular plugging': ['e', 'follicular plugging'],
    'Thickened basement membrane': ['e', 'thickening of the basement membrane'], 'Pigment incontinence': ['d', 'pigment incontinence'],
    'Increased dermal mucin': ['d', 'increased interstitial mucin'], 'Papillary dermal oedema': ['d', 'papillary dermal oedema']
  },
  featLichenoid: {
    'Compact orthokeratosis': ['e', 'compact orthokeratosis'], 'Focal parakeratosis': ['e', 'focal parakeratosis'],
    'Wedge-shaped hypergranulosis': ['e', 'wedge-shaped hypergranulosis'], 'Irregular acanthosis': ['e', 'irregular acanthosis'],
    'Saw-tooth rete ridges': ['e', 'saw-tooth rete ridges'], 'Basal vacuolar change': ['e', 'basal vacuolar change'],
    'Civatte bodies': ['e', 'Civatte bodies'], 'Epidermal atrophy': ['e', 'atrophy'],
    'Pigment incontinence': ['d', 'pigment incontinence'], 'Solar elastosis': ['d', 'solar elastosis']
  },
  featPerivascular: {
    'Mild spongiosis': ['e', 'mild spongiosis'], 'Focal parakeratosis': ['e', 'focal parakeratosis'],
    'Papillary dermal oedema': ['d', 'papillary dermal oedema'], 'Interstitial eosinophils': ['d', 'interstitial eosinophils'],
    'Interstitial neutrophils': ['d', 'interstitial neutrophils'], 'Extravasated red cells': ['d', 'extravasated red cells'],
    'Haemosiderin-laden macrophages': ['d', 'haemosiderin-laden macrophages'], 'Increased dermal mucin': ['d', 'increased interstitial mucin'],
    'Tight perivascular cuffing': ['d', 'tight cuffing of the vessels']
  },
  featVasculitis: {
    'Fibrinoid necrosis of vessel walls': ['w', 'fibrinoid necrosis'], 'Neutrophils in vessel walls': ['w', 'neutrophils within their walls'],
    'Lymphocytes in vessel walls': ['w', 'lymphocytes within their walls'], 'Endothelial swelling': ['w', 'endothelial swelling'],
    'Intraluminal thrombi': ['w', 'intraluminal thrombi'], 'Hyalinised vessel walls': ['w', 'hyalinised walls'],
    'Mural calcification': ['w', 'calcification of their walls'], Leukocytoclasia: ['r', 'leukocytoclasia'],
    'Extravasated red cells': ['r', 'extravasated red cells'], Eosinophils: ['r', 'eosinophils'],
    Ulceration: ['s', 'The epidermis is ulcerated.']
  },
  featBullous: {
    Acantholysis: ['x', ''],
    'Tombstoning of basal keratinocytes': ['s', 'Basal keratinocytes remain attached to the blister floor (tombstoning).'],
    'Eosinophilic spongiosis': ['s', 'The adjacent epidermis shows eosinophilic spongiosis.'],
    'Neutrophil microabscesses in the dermal papillae': ['s', 'Neutrophil microabscesses are present in the dermal papillae.'],
    'Festooning of the dermal papillae': ['s', 'The dermal papillae project into the blister floor (festooning).'],
    'Re-epithelialised blister floor': ['s', 'The blister floor is re-epithelialised.'],
    'Papillary dermal oedema': ['d', 'papillary dermal oedema']
  },
  featGranulomatous: {
    'Increased central mucin': ['g', 'increased central mucin'], 'Central caseous necrosis': ['g', 'central caseous necrosis'],
    'Multinucleated giant cells': ['g', 'multinucleated giant cells'], 'Asteroid bodies': ['g', 'asteroid bodies'],
    'Polarisable foreign material': ['g', 'polarisable foreign material'],
    'Layered granulomatous inflammation': ['g', 'horizontal layers of granulomatous inflammation'],
    'Plasma cells': ['g', 'plasma cells'], 'Dermal sclerosis': ['g', 'dermal sclerosis']
  },
  featPanniculitis: {
    'Septal thickening and fibrosis': ['p', 'septal thickening and fibrosis'], 'Miescher radial granulomas': ['p', 'Miescher radial granulomas'],
    'Multinucleated giant cells': ['p', 'multinucleated giant cells'], 'Fat necrosis': ['p', 'fat necrosis'],
    'Lipomembranous change': ['p', 'lipomembranous change'], 'Hyaline fat necrosis': ['p', 'hyaline fat necrosis'],
    'Lymphoid follicles': ['p', 'lymphoid follicles'], Vasculitis: ['p', 'vasculitis'], Calcification: ['p', 'calcification']
  },
  featSclerosing: {
    'Thickened hyalinised collagen bundles': ['d', 'thickened hyalinised collagen bundles'], 'Loss of periadnexal fat': ['d', 'loss of periadnexal fat'],
    'Atrophic adnexal structures': ['d', 'atrophic adnexal structures'], 'Squared-off biopsy edges': ['s', 'The biopsy has squared-off edges.'],
    'Homogenised papillary dermis': ['d', 'homogenisation of the papillary dermis'],
    'Band-like infiltrate beneath the sclerotic zone': ['d', 'a band-like infiltrate of lymphocytes beneath the sclerotic zone'],
    'Epidermal atrophy': ['e', 'atrophy'], 'Basal vacuolar change': ['e', 'basal vacuolar change'], 'Follicular plugging': ['e', 'follicular plugging']
  },
  featFollicular: {
    'Neutrophils in the follicle': ['f', 'neutrophils within its lumen and wall'], 'Ruptured follicle': ['f', 'rupture'],
    'Perifollicular granulomatous reaction': ['f', 'a perifollicular granulomatous reaction'], 'Yeasts in the follicle': ['f', 'yeasts within its lumen'],
    'Eosinophils in the follicular epithelium': ['f', 'eosinophils within its epithelium'], 'Demodex mites': ['f', 'Demodex mites within its lumen']
  },
  featNeutrophilic: {
    'Marked papillary dermal oedema': ['d', 'marked papillary dermal oedema'], Leukocytoclasia: ['d', 'leukocytoclasia'],
    'Dermal abscess formation': ['d', 'abscess formation'], Ulceration: ['s', 'The epidermis is ulcerated.']
  },
  gvhdFeatures: {
    'Basal vacuolar change': ['e', 'basal vacuolar change'],
    'Apoptotic keratinocytes in the basal layer': ['e', 'apoptotic keratinocytes in the basal layer'],
    'Apoptotic keratinocytes in the lower spinous layer': ['e', 'apoptotic keratinocytes in the lower spinous layer'],
    'Lymphocyte satellitosis': ['e', 'lymphocyte satellitosis'],
    'Exocytosis of lymphocytes': ['e', 'exocytosis of lymphocytes'],
    'Lichen planus-like changes': ['e', ['orthohyperkeratosis', 'hypergranulosis', 'acanthosis']],
    'Apoptotic cells in the follicular epithelium': ['a', 'the follicular epithelium'],
    'Apoptotic cells in the acrosyringium': ['a', 'the acrosyringium'],
    'Subepidermal clefts': ['s', 'There is focal subepidermal cleft formation.'],
    'Separation of the epidermis': ['s', 'The epidermis is separated from the dermis.'],
    'Perieccrine inflammation': ['d', 'lymphoplasmacytic inflammation around the eccrine coils'],
    'Homogenised papillary dermis': ['d', 'homogenisation of the papillary dermis'],
    'Sclerosis of the reticular dermis': ['d', 'thickened homogenised collagen bundles in the reticular dermis']
  }
};
const FEATURE_FIELD = {
  Spongiotic: 'featSpongiotic', Psoriasiform: 'featPsoriasiform', 'Interface (vacuolar)': 'featVacuolar', 'Interface (lichenoid)': 'featLichenoid',
  Perivascular: 'featPerivascular', Vasculitis: 'featVasculitis', Vesiculobullous: 'featBullous', Granulomatous: 'featGranulomatous',
  Panniculitis: 'featPanniculitis', Sclerosing: 'featSclerosing', Folliculitis: 'featFollicular', 'Neutrophilic dermatosis': 'featNeutrophilic',
  [GVHD]: 'gvhdFeatures'
};
/** The ticked features of the part's pattern, grouped by where they print: { e: [...], d: [...], s: [...], ... }. */
function featuresOf(v) {
  const id = FEATURE_FIELD[patternOf(v)];
  const table = FEAT[id] || {};
  const out = {};
  const ticked = arr(v[id]);
  for (const opt of ticked) {
    const [where, phrase] = table[opt] || [];
    if (where && phrase) (out[where] ||= []).push(...[phrase].flat());
  }
  // Apoptosis in both layers reads as one phrase rather than two.
  const both = ['apoptotic keratinocytes in the basal layer', 'apoptotic keratinocytes in the lower spinous layer'];
  if (id === 'gvhdFeatures' && both.every((x) => out.e?.includes(x))) {
    out.e = out.e.flatMap((x) => (x === both[0] ? ['apoptotic keratinocytes in the basal and lower spinous layers'] : x === both[1] ? [] : [x]));
  }
  return out;
}

const DEPTH = { Subcutis: 'subcutis', 'Reticular dermis': 'reticular dermis', 'Superficial dermis': 'superficial dermis' };
const DIST = {
  'Superficial perivascular': 'superficial perivascular', 'Superficial and deep perivascular': 'superficial and deep perivascular',
  'Superficial and deep perivascular and periadnexal': 'superficial and deep perivascular and periadnexal',
  'Superficial perivascular and interstitial': 'superficial perivascular and interstitial', 'Band-like': 'band-like',
  Interstitial: 'interstitial', Diffuse: 'diffuse'
};
const INFILTRATE_PATTERNS = ['Spongiotic', 'Psoriasiform', 'Interface (vacuolar)', 'Interface (lichenoid)', 'Perivascular',
  'Vesiculobullous', 'Sclerosing', 'Neutrophilic dermatosis', GVHD];
const cellWords = (v) => arr(v.cells).map((c) => c.toLowerCase());
function infiltratePhrase(v) {
  const cells = cellWords(v);
  return `a ${(v.density || 'Mild').toLowerCase()} ${DIST[v.infiltrate] || 'superficial perivascular'} infiltrate of ${cells.length ? list(cells) : 'inflammatory cells'}`;
}

function epidermisSentence(v, e) {
  const p = patternOf(v);
  if (p === 'Spongiotic') return `The epidermis shows ${(v.spongiosis || 'Moderate').toLowerCase()} spongiosis${e.length ? ` with ${list(e)}` : ''}.`;
  if (p === 'Psoriasiform') return `The epidermis shows ${(v.acanthosis || 'Regular').toLowerCase()} psoriasiform hyperplasia${e.length ? ` with ${list(e)}` : ''}.`;
  if (p === 'Perivascular' && !e.length) return 'The epidermis is unremarkable.';
  return e.length ? `The epidermis shows ${list(e)}.` : '';
}

function patternSentences(v) {
  const p = patternOf(v);
  const f = featuresOf(v);
  const e = f.e || [];
  const d = f.d || [];
  const own = f.s || [];
  const out = [];
  const withList = (xs) => (xs.length ? `, with ${list(xs)}` : '');
  switch (p) {
    case 'Vasculitis': {
      const SUBJECT = {
        'Superficial dermal small vessels': 'Small vessels in the superficial dermis',
        'Superficial and deep dermal small vessels': 'Small vessels in the superficial and deep dermis',
        'Medium-sized vessels at the dermal-subcutaneous junction': 'Medium-sized vessels at the dermal-subcutaneous junction',
        'Small vessels in the subcutis': 'Small vessels in the subcutis'
      };
      const w = f.w || [];
      const r = f.r || [];
      if (w.length) out.push(`${SUBJECT[v.vessels] || SUBJECT['Superficial dermal small vessels']} show ${list(w)}${withList(r)}.`);
      else if (r.length) out.push(`The dermis shows ${list(r)}.`);
      out.push(...own);
      return out;
    }
    case 'Vesiculobullous': {
      const level = { Subepidermal: 'a subepidermal', Suprabasal: 'a suprabasal', Intraepidermal: 'an intraepidermal', Subcorneal: 'a subcorneal' }[v.blisterLevel || 'Subepidermal'];
      const content = { Eosinophils: 'eosinophils', Neutrophils: 'neutrophils', 'Eosinophils and neutrophils': 'eosinophils and neutrophils', 'Few inflammatory cells': 'few inflammatory cells' }[v.blisterContent || 'Eosinophils'];
      out.push(`There is ${level} blister${has(v.featBullous, 'Acantholysis') ? ' with acantholysis' : ''} containing ${content}.`);
      out.push(...own);
      out.push(`The dermis shows ${infiltratePhrase(v)}${withList(d)}.`);
      return out;
    }
    case 'Granulomatous': {
      const g = f.g || [];
      const BASE = {
        Sarcoidal: 'The dermis contains well-formed non-necrotising epithelioid granulomas with few surrounding lymphocytes',
        Palisading: 'The dermis contains histiocytes palisading around foci of altered collagen',
        Interstitial: 'Histiocytes are scattered between collagen bundles in the dermis',
        Tuberculoid: 'The dermis contains epithelioid granulomas with a rim of lymphocytes',
        Suppurative: 'The dermis contains granulomas with central collections of neutrophils',
        'Foreign body': 'The dermis contains a foreign body granulomatous reaction'
      };
      out.push(`${BASE[v.granulomaType] || BASE.Sarcoidal}${withList(g)}.`);
      return out;
    }
    case 'Panniculitis': {
      const cells = cellWords(v);
      const lower = (PANNICULITIS[v.compartment] || 'SEPTAL PANNICULITIS').toLowerCase();
      out.push(`The subcutis shows ${an(lower)}${cells.length ? ` composed of ${list(cells)}` : ''}${withList(f.p || [])}.`);
      return out;
    }
    case 'Folliculitis': {
      const x = f.f || [];
      if (x.length) out.push(`A hair follicle shows ${list(x)}.`);
      const cells = cellWords(v);
      out.push(`There is ${an(`${(v.density || 'Mild').toLowerCase()} perifollicular infiltrate`)} of ${cells.length ? list(cells) : 'inflammatory cells'}.`);
      return out;
    }
    case 'Sclerosing': {
      const epi = epidermisSentence(v, e);
      if (epi) out.push(epi);
      if (d.length) out.push(`The dermis shows ${list(d)}.`);
      out.push(...own);
      out.push(`There is ${infiltratePhrase(v)}.`);
      return out;
    }
    default: {
      const epi = epidermisSentence(v, e);
      if (epi) out.push(epi);
      if (p === GVHD && f.a?.length) out.push(`Apoptotic cells are also seen in ${list(f.a)}.`);
      out.push(...own);
      const subject = v.infiltrate === 'Band-like' ? 'The papillary dermis' : 'The dermis';
      if (INFILTRATE_PATTERNS.includes(p)) out.push(`${subject} shows ${infiltratePhrase(v)}${withList(d)}.`);
      return out;
    }
  }
}

// Reagents: the house panel. A positive pattern names its deposit; for the immunobullous patterns the rest of
// the panel prints as negative, as the released reports do. Lupus band, vascular and cytoid-body patterns name
// the deposit only - their companions vary and are not assumed.
const PANEL = ['IgA', 'IgG', 'IgM', 'C3', 'C1q', 'fibrinogen'];
const DIF = {
  'Linear IgG and C3 along the basement membrane zone': ['linear deposition of IgG and C3 along the basement membrane zone', ['IgG', 'C3']],
  'Linear IgA along the basement membrane zone': ['linear deposition of IgA along the basement membrane zone', ['IgA']],
  'Intercellular IgG and C3 in the epidermis': ['intercellular deposition of IgG and C3 in the epidermis', ['IgG', 'C3']],
  'Granular IgA in the dermal papillae': ['granular deposition of IgA in the dermal papillae', ['IgA']],
  'Perivascular IgA and C3 in superficial dermal vessels': ['deposition of IgA and C3 in the walls of superficial dermal vessels', null],
  'Granular IgG, IgM and C3 along the basement membrane zone': ['granular deposition of IgG, IgM and C3 along the basement membrane zone', null],
  'IgM-positive cytoid bodies': ['IgM-positive cytoid bodies in the papillary dermis', null]
};
export function difSentence(v) {
  if (v.dif === 'Negative') return 'Direct immunofluorescence studies for IgA, IgG, IgM, C3, C1q and fibrinogen are all negative.';
  if (v.dif === 'Reported separately') return 'Direct immunofluorescence is reported separately.';
  if (v.dif !== 'Positive') return '';
  if (v.difPattern === 'Other') {
    const t = stripDot(v.difOther);
    return t ? `Direct immunofluorescence studies show ${t}.` : '';
  }
  const [text, pos] = DIF[v.difPattern] || DIF['Linear IgG and C3 along the basement membrane zone'];
  if (!pos) return `Direct immunofluorescence studies show ${text}.`;
  const neg = PANEL.filter((x) => !pos.includes(x));
  return `Direct immunofluorescence studies show ${text}; ${list(neg)} ${neg.length === 1 ? 'is' : 'are'} negative.`;
}

function stainSentences(v) {
  const out = [];
  if (v.pasd === 'Negative') out.push('No fungal organisms are identified on PASD stain.');
  else if (v.pasd === 'Positive') {
    out.push(patternOf(v) === 'Folliculitis' ? 'PASD stain shows yeasts within the follicle.' : 'PASD stain shows fungal hyphae in the stratum corneum.');
  }
  if (v.mucin === 'Increased dermal mucin') out.push('Alcian blue stain shows increased dermal mucin.');
  else if (v.mucin === 'No increase in dermal mucin') out.push('Alcian blue stain shows no increase in dermal mucin.');
  const org = arr(v.organisms);
  if (org.length) out.push(`No organisms are identified on ${list(org)} stain${org.length === 1 ? '' : 's'}.`);
  const other = stripDot(v.otherStains);
  if (other) out.push(`${other.charAt(0).toUpperCase()}${other.slice(1)}.`);
  return out;
}

/** "The overall features are those of a lichenoid dermatitis, in keeping with lichen planus." */
export function overallSentence(v, schema) {
  const p = patternOf(v);
  if (p === NSA) return '';
  if (p === GVHD) return gvhdOverall(v);
  const dx = dxOf(v, schema);
  const phrase = (patternPhrase(v, dx) + cellSuffix(v)).toLowerCase();
  const patternWords = phrase === 'dermal sclerosis' ? phrase : an(phrase);
  if (PATTERN_LEVEL.has(dx)) return `The overall features are those of ${patternWords}.`;
  const q = qualifierOf(v, dx);
  return q ? `The overall features are those of ${patternWords}, ${q} ${entityProse(dx)}.` : `The overall features are those of ${entityProse(dx)}.`;
}

export function microscopy(part, ctx) {
  const v = part.values;
  const p = patternOf(v);
  const s = [`Sections show a piece of skin down to the ${DEPTH[v.depth] || 'subcutis'}.`];
  if (p === NSA) s.push('There is no significant histological abnormality.');
  else s.push(...patternSentences(v), ...stainSentences(v));
  const dif = difSentence(v);
  if (dif) s.push(dif);
  const extra = stripDot(v.additionalNotes);
  if (extra) s.push(`${extra}.`);
  if (v.overall !== false) {
    const o = overallSentence(v, ctx?.schema);
    if (o) s.push(o);
  }
  const ddx = stripDot(v.differential);
  if (ddx) s.push(`The differential diagnosis includes ${ddx}.`);
  if (v.noMalignancy) s.push('There is no evidence of malignancy.');
  if (v.correlate !== false) s.push('Please correlate with clinical findings.');
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

/** The diagnosis after the specimen line: "SPONGIOTIC DERMATITIS with EOSINOPHILS", "LICHEN PLANUS". */
export function mainLine(v, schema) {
  const p = patternOf(v);
  if (p === NSA) return 'NO SIGNIFICANT HISTOLOGICAL ABNORMALITY';
  if (p === GVHD) return gvhdLine(v);
  const dx = dxOf(v, schema);
  const phrase = patternPhrase(v, dx) + cellSuffix(v);
  if (PATTERN_LEVEL.has(dx)) return phrase;
  const q = qualifierOf(v, dx);
  return q ? `${phrase}, ${q} ${entityUpper(dx)}` : upper(dx);
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const site = siteOf(v);
  const p = patternOf(v);
  const dx = dxOf(v, ctx?.schema);
  const ddx = !!stripDot(v.differential);
  const descriptive = p === GVHD ? nihOf(v) === 'Possible GVHD' || ddx : p !== NSA && (PATTERN_LEVEL.has(dx) || ddx);
  const pointer = v.seeDescription !== false && descriptive ? ' (please see description)' : '';
  return `(${part.label}) SKIN, ${site ? `${site}, ` : ''}${procOf(v).word} - ${mainLine(v, ctx?.schema)}${pointer}`;
}

// ---------- checks (never printed) ----------

export function validate(part, ctx) {
  const v = part.values;
  const { out, at, warn } = checks();
  const info = (m, f) => at('info', m, f);
  const p = patternOf(v);
  const dx = dxOf(v, ctx?.schema);
  if ((p === 'Spongiotic' || p === 'Psoriasiform') && (v.pasd || 'Not performed') === 'Not performed') {
    info('No PASD stain is recorded: a dermatophyte infection can look spongiotic or psoriasiform.', 'pasd');
  }
  if (dx === 'Dermatophytosis' && v.pasd !== 'Positive') warn('Dermatophytosis is chosen but the PASD stain is not recorded as positive.', 'pasd');
  if (p === 'Vesiculobullous' && (v.dif || 'Not performed') === 'Not performed') {
    info('No direct immunofluorescence is recorded for a blistering disease: the diagnosis reads "in keeping with" until it is.', 'dif');
  }
  if (DIF_DEFINES[dx] && v.dif === 'Positive' && v.difPattern !== 'Other' && v.difPattern !== DIF_DEFINES[dx]) {
    warn(`${dx} is chosen with ${(v.difPattern || '').toLowerCase()}; the deposit expected is ${DIF_DEFINES[dx].toLowerCase()}.`, 'difPattern');
  }
  if (v.dif === 'Positive' && v.difPattern === 'Other' && !stripDot(v.difOther)) warn('Describe the deposits seen on direct immunofluorescence.', 'difOther');
  if (p === 'Panniculitis' && (v.depth || 'Subcutis') !== 'Subcutis') warn('A panniculitis is reported on sections that do not reach the subcutis.', 'depth');
  if (p === 'Perivascular' && ['Band-like', 'Interstitial', 'Diffuse'].includes(v.infiltrate)) {
    warn('The perivascular pattern is chosen with a band-like, interstitial or diffuse infiltrate: choose the pattern that fits.', 'infiltrate');
  }
  if (dx === 'Pityrosporum folliculitis' && !has(v.featFollicular, 'Yeasts in the follicle')) info('Pityrosporum folliculitis is chosen without yeasts recorded in the follicle.', 'featFollicular');
  if (dx === 'Demodex folliculitis' && !has(v.featFollicular, 'Demodex mites')) info('Demodex folliculitis is chosen without mites recorded.', 'featFollicular');
  if (p === GVHD) {
    const apoptosis = APOPTOSIS.some((x) => has(v.gvhdFeatures, x));
    if (nihOf(v) === 'Likely GVHD' && acuteOf(v) && !apoptosis) {
      warn('Likely GVHD is chosen without apoptotic cells recorded; apoptosis in the epidermis or adnexa is the minimal criterion.', 'gvhdFeatures');
    }
    if (nihOf(v) === 'Possible GVHD' && !stripDot(v.differential)) info('Possible GVHD: name the other explanations in the differential.', 'differential');
    if (v.lerner && !['Auto', 'Not graded'].includes(v.lerner) && acuteOf(v) && nihOf(v) === 'Likely GVHD') {
      const auto = lernerOf({ ...v, lerner: 'Auto' });
      if (auto !== v.lerner) info(`Lerner grade ${v.lerner} is set by hand; the features ticked read as grade ${auto}.`, 'lerner');
    }
  }
  return out;
}

// The registry loads this default export; a generator without one is not wired in.
export default { specimenName, macro, blockKey, microscopy, diagnosis, validate };
