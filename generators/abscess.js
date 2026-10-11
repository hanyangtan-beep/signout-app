import { stripDot, checks } from './_house.js';
// Abscess, ulcer and granulation tissue generator (benign resection). Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Skin, left axilla abscess wall, excision"
//   macro      "(A) Received in formalin are irregular pieces of tan-brown soft tissue labelled left axilla
//               abscess wall, measuring 3 x 2 x 1 cm in aggregate. All embedded in 2 blocks."
//   blockKey   "(A) (1-2) Tissue pieces, all embedded."
//   microscopy "(A) Sections show skin and subcutaneous tissue with dense suppurative inflammation composed of
//               abundant neutrophils, histiocytes and necrotic debris, surrounded by granulation tissue and
//               fibrosis. The findings are in keeping with an abscess wall. There is no evidence of granulomatous
//               inflammation or malignancy."
//   diagnosis  "(A) SKIN, left axilla abscess wall, excision - In keeping with ABSCESS WALL"
//
// Benign batch 1 (docs/roadmap.md, "Abscess, ulcer and granulation tissue", pulled 2026-09-24). Before this
// template, 183 of the 262 abscess, ulcer and granulation-tissue parts in the five-year biopsy file landed on
// Generic. Each diagnosis carries a fixed narrative; the modifiers (granulomas, foreign material, special
// stains and organisms) add sentences, and the paragraph closes on one of the two house sentences — "There is
// no evidence of dysplasia or malignancy." for a skin surface (ulcer, stasis change, sinus tract) or "There is
// no evidence of granulomatous inflammation or malignancy." elsewhere, which is dropped to "There is no
// evidence of malignancy." once granulomas, a foreign-body reaction or a ruptured cyst are described.
//
// Wording: the house phrasing of the 2021-2026 biopsy export (aggregate sentence counts only; no case text
// is kept here) — "The findings are in keeping with abscess wall", "The features are consistent with abscess
// wall, suggestive of ruptured cyst", "No acid-fast bacilli are identified on Ziehl-Neelsen stain", "No fungal
// organisms are identified on PASD stain", "Perivascular red cell extravasation and haemosiderin deposits are
// present", "The features are consistent with stasis dermatitis", "The findings are in keeping with pilonidal
// sinus tract". Report content follows RCPath G075 Tissue pathways for dermatopathology (V3, Feb 2024) §3.6
// and G085 Tissue pathways for GI and pancreatobiliary pathology (V3, Oct 2024) §3.4.3 (fistula-in-ano: the
// report records granulomas, which raise Crohn's disease, and any foreign material).
//   https://www.rcpath.org/static/88bfeeaf-7b1c-458e-be2019c1324cd7ac/G075-Tissue-pathways-for-dermatopathologyfor-publication.pdf
//   https://www.rcpath.org/static/4593f557-d75c-4ca6-9307a9d688e02a2d/1f175bdf-4934-4ace-bbde65114401944b/g085-tissue-pathways-for-gastrointestinal-and-pancreatobiliary-pathology.pdf
// An identified cyst stays on `skin_cyst`; this template's ruptured-cyst line is for an abscess wall in which
// keratin and a foreign-body reaction suggest a cyst that is no longer seen.
// Wording is protected by tests/abscess_granulation.test.js and tests/fixtures/abscess_granulation/.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
/** Lower-case an ordinary leading word ("Left axilla" -> "left axilla") but keep "L2", "R8H", "I&D". */
const lcWord = (s) => (/^[A-Z][a-z]/.test(s || '') ? lc1(s) : s || '');

export const ABSCESS = 'Abscess wall';
export const GRANULATION = 'Granulation tissue';
export const ULCER = 'Ulcer';
export const STASIS = 'Stasis change';
export const SINUS = 'Sinus tract';
export const FISTULA = 'Fistula tract';
export const RUPTURED = 'Ruptured cyst with foreign-body reaction';
export const NECROTIC = 'Necrotic tissue or slough';
export const INFLAMMATION = 'Acute on chronic inflammation';
// A skin surface is described: the paragraph closes on the dysplasia sentence.
export const SURFACE_DX = [ULCER, STASIS, SINUS];

const dx = (v) => v.diagnosis || ABSCESS;
export const granulomasPresent = (v) => /^Present/.test(v.granulomas || '');
export const organismsIdentified = (v) => /^Identified/.test(v.organisms || '');
const foreign = (v) => (v.foreignMaterial && v.foreignMaterial !== 'Absent' ? v.foreignMaterial : '');
const organ = (v) => String(v.organ || 'SKIN').toUpperCase();
const perianal = (v) => organ(v) === 'PERIANAL';
const pilonidal = (v) => dx(v) === SINUS && foreign(v) === 'Hair shafts';

// ---------- specimen ----------

/**
 * "left axilla abscess wall" — the typed site / clinical label, first word lower-cased. Under the
 * PERIANAL head a leading "perianal" / "anal" is dropped, so the line does not say it twice.
 */
export const labelPhrase = (v) => lcWord(stripDot(v.site));
const ANAL_WORD = /^(?:peri-?\s?anal|anal)\b\s*/i;
export const sitePhrase = (v) => (organ(v) === 'PERIANAL' ? labelPhrase(v).replace(ANAL_WORD, '') : labelPhrase(v));

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return typed;
  const o = organ(v);
  const label = labelPhrase(v);
  const proc = lc1(v.procedure || '');
  // "Perianal abscess wall, incision and drainage", "Anal fistula, excision": on the specimen line the
  // anal word reads as an adjective, and a label that already opens with one is printed as received.
  if (o === 'PERIANAL') {
    const named = ANAL_WORD.test(label) ? cap1(label) : label ? `Perianal ${label}` : 'Perianal tissue';
    return [named, proc].filter(Boolean).join(', ');
  }
  return [o === 'SOFT TISSUE' ? 'Soft tissue' : 'Skin', label, proc].filter(Boolean).join(', ');
}

// ---------- macroscopic description ----------

/** "3x2x1" -> "3 x 2 x 1 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

const DESCRIPTION = {
  'Irregular pieces of soft tissue': { what: 'are irregular pieces of tan-brown soft tissue', aggregate: true, key: 'Tissue pieces' },
  'Piece of skin': { what: 'is a piece of skin', key: 'Skin' },
  'Ellipse of skin': { what: 'is an ellipse of skin', cross: true, key: 'Skin ellipse' },
  'Ellipse of skin with a sinus opening': { what: 'is an ellipse of skin', tail: 'with a sinus opening on the surface', cross: true, key: 'Skin ellipse with sinus opening' },
  'Necrotic tissue and slough': { what: 'are fragments of necrotic tissue and slough', aggregate: true, key: 'Tissue fragments' }
};
const desc = (v) => DESCRIPTION[v.description] || DESCRIPTION['Irregular pieces of soft tissue'];
const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 2));
const representative = (v) => v.blockScheme === 'Representative sections';

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const d = desc(v);
  const site = labelPhrase(v);
  const size = sizePhrase(v.dimensions);
  let first = `Received in formalin ${d.what}`;
  if (site) first += ` labelled ${site}`;
  if (size) first += `, measuring ${size}${d.aggregate ? ' in aggregate' : ''}`;
  if (d.tail) first += `${size ? ',' : ''} ${d.tail}`;
  const blocks = blockCount(v);
  const plural = blocks === 1 ? '' : 's';
  const sampling = representative(v) ? `Representative sections in ${blocks} block${plural}.` : `All embedded in ${blocks} block${plural}.`;
  return `(${part.label}) ${first}. ${sampling}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const d = desc(v);
  const blocks = blockCount(v);
  const range = blocks === 1 ? '(1)' : `(1-${blocks})`;
  const what = representative(v) ? (d.cross ? 'representative cross-sections' : 'representative sections') : d.cross ? 'cross-sections, all embedded' : 'all embedded';
  return `(${part.label}) ${range} ${d.key}, ${what}.`;
}

// ---------- microscopy ----------

const TISSUE = { SKIN: 'skin and subcutaneous tissue', 'SOFT TISSUE': 'fibroadipose soft tissue', PERIANAL: 'perianal skin and subcutaneous tissue' };
const tissue = (v) => TISSUE[organ(v)] || TISSUE.SKIN;
const surface = (v) => (perianal(v) ? 'perianal skin' : 'skin');

/** The fixed narrative per diagnosis: `body` sentences, then the modifiers, then `conclusion`. */
const NARRATIVE = {
  [ABSCESS]: (v) => ({
    body: [`Sections show ${tissue(v)} with dense suppurative inflammation composed of abundant neutrophils, histiocytes and necrotic debris, surrounded by granulation tissue and fibrosis.`],
    conclusion: 'The findings are in keeping with an abscess wall.'
  }),
  [GRANULATION]: () => ({
    body: ['Sections show inflamed granulation tissue composed of proliferating small blood vessels in an oedematous stroma with mixed acute and chronic inflammatory infiltrates.', 'No epithelium is identified.']
  }),
  [ULCER]: (v) => {
    if (v.ulcerPart === 'Base') {
      return { body: ['Sections show an ulcer base composed of fibrinopurulent exudate and necrotic debris overlying inflamed granulation tissue.', 'No epithelium is identified.'] };
    }
    if (v.ulcerPart === 'Edge') {
      return { body: [`Sections show ${surface(v)} at the edge of an ulcer, with reactive epidermal hyperplasia.`, 'The underlying dermis contains granulation tissue with mixed acute and chronic inflammatory infiltrates.'] };
    }
    return {
      body: [`Sections show ulcerated ${surface(v)}.`, 'The ulcer base is covered by fibrinopurulent exudate and necrotic debris overlying inflamed granulation tissue.', 'The epidermis at the ulcer edge shows reactive changes.']
    };
  },
  [STASIS]: (v) => {
    const ulcerated = v.stasisUlcer === 'Present';
    return {
      body: [
        `Sections show ${surface(v)} with a lobular proliferation of thick-walled capillaries in the papillary dermis.`,
        'Perivascular red cell extravasation and haemosiderin deposits are present, and the dermis is fibrotic.',
        ...(ulcerated ? ['The epidermis is ulcerated, with fibrinopurulent exudate and granulation tissue at the ulcer base.'] : [])
      ],
      conclusion: `The features are in keeping with stasis dermatitis${ulcerated ? ' with ulceration' : ''}.`
    };
  },
  [SINUS]: (v) => ({
    body: [`Sections show ${surface(v)} with a sinus tract extending into the dermis and subcutis, lined by granulation tissue and focally by squamous epithelium, with surrounding mixed inflammatory infiltrates and fibrosis.`],
    conclusion: pilonidal(v) ? 'The findings are in keeping with a pilonidal sinus.' : 'The findings are in keeping with a sinus tract.'
  }),
  [FISTULA]: (v) => ({
    body: [`Sections show ${tissue(v)} with a tract lined by inflamed granulation tissue, with surrounding mixed acute and chronic inflammatory infiltrates and fibrosis.`],
    conclusion: perianal(v) ? 'The features are consistent with fistula-in-ano.' : 'The findings are in keeping with a fistula tract.'
  }),
  [RUPTURED]: (v) => ({
    body: [`Sections show ${tissue(v)} with suppurative inflammation and granulation tissue surrounding fragments of lamellated keratin, with a foreign-body giant cell reaction.`, 'No residual cyst lining is identified.'],
    conclusion: 'The features are consistent with an abscess wall, suggestive of a ruptured cyst.'
  }),
  [NECROTIC]: () => ({
    body: ['Sections show necrotic fibroinflammatory material and slough, composed of fibrin, neutrophils and necrotic debris, admixed with focal inflamed granulation tissue.', 'No viable epithelium is identified.']
  }),
  [INFLAMMATION]: (v) => ({
    body: [`Sections show ${tissue(v)} with mixed acute and chronic inflammatory infiltrates, oedema and focal granulation tissue formation.`]
  })
};

const FOREIGN_MICRO = {
  'Refractile foreign material': 'In areas, refractile foreign material is seen, surrounded by a foreign-body giant cell reaction.',
  'Suture material': 'Suture material is seen, surrounded by a foreign-body giant cell reaction.',
  'Hair shafts': 'Hair shafts are seen, surrounded by a foreign-body giant cell reaction.'
};

const STAIN_ORDER = ['Ziehl-Neelsen', 'PASD', 'Grocott', 'Gram'];
/** One negative sentence per organism class, in the house form; PASD and Grocott share the fungal one. */
export function stainSentences(stains) {
  const have = STAIN_ORDER.filter((s) => (stains || []).includes(s));
  const out = [];
  if (have.includes('Ziehl-Neelsen')) out.push('No acid-fast bacilli are identified on Ziehl-Neelsen stain.');
  const fungal = have.filter((s) => s === 'PASD' || s === 'Grocott');
  if (fungal.length === 2) out.push('No fungal organisms are identified on PASD and Grocott stains.');
  else if (fungal.length) out.push(`No fungal organisms are identified on ${fungal[0]} stain.`);
  if (have.includes('Gram')) out.push('No bacterial organisms are identified on Gram stain.');
  return out;
}

function organismSentences(v) {
  if (organismsIdentified(v)) {
    const typed = stripDot(v.organismText);
    return [typed ? `${cap1(typed)}.` : 'Organisms are identified.'];
  }
  return stainSentences(v.stains);
}

/** The house closing sentence. */
export function closing(v) {
  if (SURFACE_DX.includes(dx(v))) return 'There is no evidence of dysplasia or malignancy.';
  if (granulomasPresent(v) || foreign(v) || dx(v) === RUPTURED) return 'There is no evidence of malignancy.';
  return 'There is no evidence of granulomatous inflammation or malignancy.';
}

export function microscopy(part) {
  const v = part.values;
  const n = (NARRATIVE[dx(v)] || NARRATIVE[ABSCESS])(v);
  const s = [...n.body];
  if (pilonidal(v)) s.push('Hair shafts engulfed by foreign-body giant cells are seen in the wall of the sinus tract.');
  else if (foreign(v)) s.push(FOREIGN_MICRO[foreign(v)]);
  if (granulomasPresent(v)) s.push(v.granulomaType === 'Necrotising' ? 'Necrotising granulomas are present.' : 'Non-necrotising epithelioid granulomas are present.');
  s.push(...organismSentences(v));
  if (n.conclusion) s.push(n.conclusion);
  s.push(closing(v));
  const notes = stripDot(v.additionalNotes);
  if (notes) s.push(`${notes}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

export function mainLine(v) {
  switch (dx(v)) {
    case GRANULATION: return 'GRANULATION TISSUE';
    case ULCER: return v.ulcerPart === 'Edge' ? 'In keeping with ULCER EDGE' : v.ulcerPart === 'Base' ? 'ULCER BASE' : 'ULCER';
    case STASIS: return v.stasisUlcer === 'Present' ? 'ULCER, in keeping with STASIS DERMATITIS' : 'In keeping with STASIS DERMATITIS';
    case SINUS: return pilonidal(v) ? 'PILONIDAL SINUS' : 'In keeping with SINUS TRACT';
    case FISTULA: return perianal(v) ? 'Consistent with FISTULA-IN-ANO' : 'In keeping with FISTULA TRACT';
    case RUPTURED: return 'Consistent with ABSCESS WALL, suggestive of RUPTURED CYST';
    case NECROTIC: return 'NECROTIC TISSUE';
    case INFLAMMATION: return 'ACUTE ON CHRONIC INFLAMMATION';
    default: return 'In keeping with ABSCESS WALL';
  }
}

const FOREIGN_DX = {
  'Refractile foreign material': 'foreign body giant cell reaction',
  'Suture material': 'foreign body giant cell reaction to suture material',
  'Hair shafts': 'foreign body giant cell reaction to hair shafts'
};

export function diagnosis(part) {
  const v = part.values;
  const clauses = [mainLine(v)];
  if (granulomasPresent(v)) clauses.push(`${v.granulomaType === 'Necrotising' ? 'necrotising' : 'non-necrotising'} granulomas present`);
  if (foreign(v) && !pilonidal(v) && dx(v) !== RUPTURED) clauses.push(FOREIGN_DX[foreign(v)]);
  if (organismsIdentified(v)) clauses.push('organisms identified');
  if (granulomasPresent(v)) clauses.push('see comment');
  const head = [organ(v), sitePhrase(v), lc1(v.procedure || '')].filter(Boolean).join(', ');
  return `(${part.label}) ${head} - ${clauses.join('; ')}`;
}

// ---------- checks ----------

export function validate(part) {
  const v = part.values;
  const { out, warn } = checks();
  const stains = v.stains || [];
  if (granulomasPresent(v) && !stains.includes('Ziehl-Neelsen')) {
    warn('Granulomas are present but no Ziehl-Neelsen stain is recorded.', 'stains');
  }
  if (granulomasPresent(v) && !stains.includes('PASD') && !stains.includes('Grocott')) {
    warn('Granulomas are present but no fungal stain (PASD or Grocott) is recorded.', 'stains');
  }
  if (organismsIdentified(v) && !stripDot(v.organismText)) warn('Organisms identified: describe what is seen and on which stain.', 'organismText');
  if (dx(v) === FISTULA && !perianal(v) && /\b(peri-?anal|anal|ano)\b/i.test(`${v.site || ''} ${v.specimenName || ''}`)) {
    warn('The site reads as perianal: choose PERIANAL for the organ so the line reads fistula-in-ano.', 'organ');
  }
  if (dx(v) === SINUS && /pilonidal/i.test(`${v.site || ''} ${v.specimenName || ''}`) && foreign(v) !== 'Hair shafts') {
    warn('Pilonidal sinus: record hair shafts under foreign material if they are seen.', 'foreignMaterial');
  }
  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, validate };
