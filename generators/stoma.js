// Stoma closure / revision generator. Pure functions: (part, ctx) -> string.
// Benign resection template (Phase 4b, roadmap item 16). Blocks:
//   specimens  "Small bowel, loop ileostomy, closure"
//   macro      "(A) Received in formalin is a segment of small bowel measuring 6 cm in length and up to 3 cm in
//               diameter, with an attached ellipse of skin measuring 3 x 2 cm at the stoma site. The mucosa is
//               congested and prolapsed at the stoma. Representative sections in 3 blocks."
//   blockKey   "(A) (1) Stoma with skin. (2) Bowel wall. (3) Proximal and distal margins."
//   microscopy "(A) Sections show small bowel with an ileostomy site covered by hyperkeratotic skin. The adjacent
//               mucosa shows prolapse-type changes with fibromuscular obliteration of the lamina propria, crypt
//               distortion and surface erosion. Granulation tissue with foreign body giant cell reaction to suture
//               material is present in the wall. The resection margins are viable. There is no evidence of
//               dysplasia or malignancy."
//   diagnosis  "(A) SMALL BOWEL, ileostomy, closure - ILEOSTOMY WITH REACTIVE AND PROLAPSE-TYPE CHANGES; no evidence
//               of dysplasia or malignancy"
// Dysplasia / malignancy options give a short capitalised line only; the schema snippet
// `stoma_cancer_template` adds the comment pointing to the QMH GI cancer template.
// Wording is protected by tests/stoma.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export const NEGATIVE = 'No dysplasia or malignancy';
export const hasNeoplasia = (v) => !!v.neoplasia && v.neoplasia !== NEGATIVE;

/** Colostomy variants sit in the large bowel; everything else is small bowel. */
export const isColostomy = (v) => /colostomy/i.test(v.stomaType || '');
export const organ = (v) => (isColostomy(v) ? 'LARGE BOWEL' : 'SMALL BOWEL');
const organLower = (v) => organ(v).toLowerCase();

/** "Ileostomy, loop" -> "loop ileostomy"; "Colostomy, end" -> "end colostomy"; "Ileostomy" -> "ileostomy". */
export function stomaPhrase(v) {
  const raw = String(v.stomaType || 'Ileostomy');
  const [noun, qual] = raw.split(',').map((s) => s.trim().toLowerCase());
  return qual ? `${qual} ${noun}` : noun;
}
/** Bare noun: "ileostomy" / "colostomy". */
const stomaNoun = (v) => (isColostomy(v) ? 'colostomy' : 'ileostomy');
const procedureLower = (v) => String(v.procedure || 'Closure').trim().toLowerCase();

/** "Small bowel, loop ileostomy, closure" unless typed in `specimenName`. */
export function specimenName(part) {
  const v = part.values;
  const typed = String(v.specimenName || '').trim();
  if (typed) return typed;
  return `${cap1(organLower(v))}, ${stomaPhrase(v)}, ${procedureLower(v)}`;
}

/** "SMALL BOWEL, loop ileostomy, closure" for the diagnosis line. */
export function organPhrase(part) {
  const v = part.values;
  return `${organ(v)}, ${stomaPhrase(v)}, ${procedureLower(v)}`;
}

// ---------- macroscopic description ----------

/** "3x2" -> "3 x 2 cm"; "30 mm" unchanged; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

function measurePhrase(v) {
  const l = num(v.length);
  const d = num(v.diameter);
  const bits = [];
  if (l !== null) bits.push(`${fmt(l)} cm in length`);
  if (d !== null) bits.push(`up to ${fmt(d)} cm in diameter`);
  return bits.length ? ` measuring ${bits.join(' and ')}` : '';
}

function skinPhrase(v) {
  if (!v.skinIncluded) return '';
  const size = sizePhrase(v.skinSize);
  return size ? `, with an attached ellipse of skin measuring ${size} at the stoma site` : ', with an attached ellipse of skin at the stoma site';
}

const MUCOSA_MACRO = {
  Unremarkable: 'The mucosa is unremarkable.',
  'Prolapsed, congested': 'The mucosa is congested and prolapsed at the stoma.',
  Ulcerated: 'The mucosa is ulcerated at the stoma.'
};

const SEROSA_MACRO = {
  Congested: 'The serosa is congested.',
  'Fibrous adhesions': 'The serosa shows fibrous adhesions.',
  'Fibrinous exudate': 'The serosa is covered by fibrinous exudate.'
};

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = [];
  s.push(`Received in formalin is a segment of ${organLower(v)}${measurePhrase(v)}${skinPhrase(v)}.`);
  if (MUCOSA_MACRO[v.mucosaMacro]) s.push(MUCOSA_MACRO[v.mucosaMacro]);
  if (SEROSA_MACRO[v.serosaMacro]) s.push(SEROSA_MACRO[v.serosaMacro]);
  if (v.sutureMacro) s.push('Suture material is present in the wall.');
  if (v.herniaSacMacro) s.push('A parastomal hernia sac of fibrous tissue is also received.');
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 3));
  s.push(`Representative sections in ${blocks} ${blocks === 1 ? 'block' : 'blocks'}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const keys = [v.skinIncluded ? 'Stoma with skin.' : 'Stoma site.', 'Bowel wall.', 'Proximal and distal margins.'];
  if (v.herniaSacMacro) keys.push('Parastomal hernia sac.');
  return `(${part.label}) ${keys.map((k, i) => `(${i + 1}) ${k}`).join(' ')}`;
}

// ---------- microscopy ----------

function openingSentence(v) {
  const site = `${stomaNoun(v)} site`;
  const base = `Sections show ${organLower(v)} with ${isColostomy(v) ? 'a' : 'an'} ${site}`;
  if (!v.skinIncluded) return `${base}.`;
  switch (v.peristomalSkin) {
    case 'Unremarkable':
      return `${base} covered by unremarkable skin.`;
    case 'Ulcerated':
      return `${base} with ulceration of the peristomal skin.`;
    case 'Pseudoepitheliomatous hyperplasia':
      return `${base} covered by skin showing pseudoepitheliomatous hyperplasia.`;
    case 'Hyperkeratotic':
    default:
      return `${base} covered by hyperkeratotic skin.`;
  }
}

const IBD_MICRO = {
  'Inactive chronic': 'The mucosa also shows crypt architectural distortion and basal plasmacytosis without active inflammation, in keeping with inactive chronic inflammatory bowel disease (see comment).',
  Active: 'The mucosa also shows crypt architectural distortion and basal plasmacytosis with cryptitis and crypt abscesses, in keeping with active chronic inflammatory bowel disease (see comment).'
};

export function microscopy(part) {
  const v = part.values;
  const s = [openingSentence(v)];
  if (v.prolapseChange) s.push('The adjacent mucosa shows prolapse-type changes with fibromuscular obliteration of the lamina propria, crypt distortion and surface erosion.');
  else if ((v.ischaemia === 'None' || !v.ischaemia) && !IBD_MICRO[v.ibdActivity]) s.push('The adjacent mucosa is unremarkable.');
  if (v.ischaemia === 'Superficial') s.push('There is superficial ischaemic change with withering of crypts and surface erosion.');
  else if (v.ischaemia === 'Transmural') s.push('There is transmural ischaemic change with coagulative necrosis of the bowel wall.');
  if (v.sutureReaction) s.push('Granulation tissue with foreign body giant cell reaction to suture material is present in the wall.');
  if (v.stenosis === 'Mural fibrosis') s.push('The wall shows fibrosis.');
  else if (v.stenosis === 'Stenosis with mural fibrosis') s.push('The stoma is stenotic with fibrosis of the wall.');
  if (v.herniaSac) s.push('The parastomal hernia sac consists of fibrous tissue with a mesothelial lining.');
  if (IBD_MICRO[v.ibdActivity]) s.push(v.prolapseChange ? IBD_MICRO[v.ibdActivity] : IBD_MICRO[v.ibdActivity].replace('The mucosa also shows', 'The mucosa shows'));
  if (v.diverticula) s.push('Diverticula lined by mucosa extend through the muscularis propria.');
  if (v.neoplasia === 'Dysplasia - see comment') s.push('Dysplasia is present in the mucosa (see comment).');
  else if (v.neoplasia === 'Malignancy - see comment') s.push('A malignant neoplasm is present (see comment).');
  s.push(v.marginsViable ? 'The resection margins are viable.' : 'The resection margins show ischaemic change.');
  if (!hasNeoplasia(v)) s.push('There is no evidence of dysplasia or malignancy.');
  const notes = String(v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

/** Reactive changes = skin change, suture reaction or fibrosis / stenosis. */
const hasReactive = (v) => (v.skinIncluded && v.peristomalSkin && v.peristomalSkin !== 'Unremarkable') || !!v.sutureReaction || (v.stenosis && v.stenosis !== 'None');

function mainClause(v) {
  const STOMA = stomaNoun(v).toUpperCase();
  const feats = [];
  if (hasReactive(v)) feats.push('REACTIVE');
  if (v.prolapseChange) feats.push('PROLAPSE-TYPE');
  if (feats.length) return `${STOMA} WITH ${feats.join(' AND ')} CHANGES`;
  if (v.ischaemia === 'Transmural' || v.ischaemia === 'Superficial') return `${STOMA} WITH ${v.ischaemia.toUpperCase()} ISCHAEMIC CHANGE`;
  if (IBD_MICRO[v.ibdActivity]) return `${STOMA} WITH ${v.ibdActivity === 'Active' ? 'ACTIVE' : 'INACTIVE'} CHRONIC INFLAMMATORY BOWEL DISEASE`;
  return `${STOMA} WITH NO SIGNIFICANT ABNORMALITY`;
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const clauses = [];
  if (v.neoplasia === 'Dysplasia - see comment') clauses.push('DYSPLASIA');
  else if (v.neoplasia === 'Malignancy - see comment') clauses.push('MALIGNANCY');
  const main = mainClause(v);
  clauses.push(main);
  const feats = hasReactive(v) || v.prolapseChange;
  if (feats && v.ischaemia === 'Transmural') clauses.push('TRANSMURAL ISCHAEMIC CHANGE');
  else if (feats && v.ischaemia === 'Superficial') clauses.push('superficial ischaemic change');
  if (v.stenosis === 'Mural fibrosis') clauses.push('mural fibrosis');
  else if (v.stenosis === 'Stenosis with mural fibrosis') clauses.push('stenosis');
  if (v.herniaSac || v.herniaSacMacro) clauses.push('parastomal hernia sac');
  if (feats && IBD_MICRO[v.ibdActivity]) clauses.push(`${v.ibdActivity === 'Active' ? 'active' : 'inactive'} chronic inflammatory bowel disease at the stoma`);
  if (v.diverticula) clauses.push('diverticula');
  if (!v.marginsViable) clauses.push('ischaemic change at the resection margins');
  if (hasNeoplasia(v) || IBD_MICRO[v.ibdActivity]) clauses.push('see comment');
  return `(${part.label}) ${organPhrase(part, ctx)} - ${clauses.join('; ')}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
