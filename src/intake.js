// Specimen intake: parse an LIS specimen list pasted by the pathologist, then suggest a template
// for every lettered part. Pure functions, no DOM; shared by the app and tests/intake.test.js.
//
//   parseIntake(text)                  -> { history, casePrefix, parts, warnings }
//   matchParts(parsed, history, manifest) -> [{ label, text, templateId, tier, role, candidates }]
//   presetValues(schema, part, match)  -> values patch applied on Build parts
//   deriveTitle(parts)                 -> "(A) antrum and (B) body" (feeds the gastric site parser)
//
// House LIS format (docs/specs/specimen-intake.md): parts are lettered "(A)".."(Z)" only — numbers in
// parentheses are lymph node stations, "(8a)" included. Each part is often a triple
// "Site, detail, Procedure". A case-level prefix ("Breast, excision:") may precede "(A)".

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const MAX_PARTS = 26;
export const GENERIC_ID = 'generic';

const PROCEDURE_WORDS = /^(resection|excision|biopsy|biopsies|polypectomy|curettings?|curettage|shave|punch|core|cores|fna|aspirate|smear|washing|fluid|dissection|enucleation|amputation|replacement|explant|re-excision|reexcision|revision|closure|reversal)$/i;
const MARKER = /\(([A-Z])\)/g;
// The LIS letters a list, not a specimen: a case with one part carries no "(A)" at all, and the case
// export letters nothing whatever the part count (0 of 4545 rows in the 2024-2026 export). An
// unlettered list is split on newlines and on a comma with no space after it — that is how the export
// joins parts ("Antrum,Angular,Body"), while the "Site, detail" pair inside one part keeps the space
// ("Breast, Right mastectomy"). 899 of those 4545 rows split on that comma; the rest are one part.
const UNLETTERED_SPLIT = /\n|,(?=\S)/;
const SPECIMEN_HEADING = /^\s*specimens?\s*:?\s*$/i;
const HISTORY_HEADING = /^\s*(clinical\s+)?history\s*:?\s*$/i;

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const stripEnds = (s) => clean(s).replace(/^(and|&)\s+/i, '').replace(/[\s,;]*\b(and|&)\s*$/i, '').replace(/[\s,;:.]+$/g, '').trim();

/** Split "Site, detail, Procedure" into its LIS triple; anything else is free text. */
export function splitTriple(text) {
  const bits = clean(text).split(/\s*,\s*/).filter(Boolean);
  const out = { site: '', detail: '', procedure: '' };
  if (bits.length >= 2 && PROCEDURE_WORDS.test(bits[bits.length - 1])) {
    out.procedure = bits[bits.length - 1];
    out.site = bits[0];
    out.detail = bits.slice(1, -1).join(', ');
    if (out.detail && out.detail.toLowerCase() === out.site.toLowerCase()) out.detail = '';
  }
  return out;
}

/** Display text for a part: the LIS text with a duplicated site ("Stomach, stomach") collapsed. */
export function tidyText(text) {
  const t = splitTriple(text);
  if (!t.procedure) return clean(text);
  return [t.site, t.detail, t.procedure.toLowerCase()].filter(Boolean).join(', ');
}

/**
 * Tidy one part as the LIS writes it, before it is split or scored.
 *  - "Others, vault biopsy" - `Others` is the LIS null category, not a site (959 of 6384 part-pieces
 *    in the 2024-2026 export). Dropped so the site word leads.
 *  - "Placenta, Placenta" - the category and the description hold the same phrase (730 pieces).
 *    Collapsed to one, otherwise it is printed twice in the specimen name.
 * Only a leading `Others` and only an all-identical repeat, so "Breast, Right mastectomy" is untouched.
 */
export function tidyPart(text) {
  let bits = clean(text).split(/\s*,\s*/).filter(Boolean);
  if (bits.length > 1 && /^others?$/i.test(bits[0])) bits = bits.slice(1);
  if (bits.length > 1 && new Set(bits.map((b) => b.toLowerCase())).size === 1) bits = [bits[0]];
  return bits.join(', ');
}

/**
 * Parse the pasted LIS text. The specimen list is whatever follows the last "specimen" heading;
 * without a heading it is the block (after the last blank line) that contains the first "(A)".
 */
export function parseIntake(raw) {
  const text = String(raw || '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const warnings = [];
  let start = -1;
  for (let i = 0; i < lines.length; i++) if (SPECIMEN_HEADING.test(lines[i])) start = i + 1;
  if (start < 0) {
    const a = lines.findIndex((l) => /\(A\)/.test(l));
    if (a >= 0) {
      start = a;
      while (start > 0 && lines[start - 1].trim() !== '' && !HISTORY_HEADING.test(lines[start - 1])) start--;
    }
  }
  // No heading and no "(A)": an unlettered list, which is what a single-part case always looks like.
  // The list is then the last block of the paste and whatever sits above it is the history.
  if (start < 0) start = lastBlockStart(lines);
  const history = historyOf(lines.slice(0, start));
  const list = lines.slice(start).join('\n').trim();
  const first = list.search(MARKER);
  const parts = [];
  MARKER.lastIndex = 0;
  const markers = [];
  let m;
  while ((m = MARKER.exec(list)) !== null) markers.push({ letter: m[1], index: m.index, end: m.index + m[0].length });
  const lettered = markers.length > 0;
  let casePrefix = '';
  if (lettered && first > 0) casePrefix = stripEnds(list.slice(0, first));
  const add = (label, seg) => {
    const body = tidyPart(stripEnds(seg));
    parts.push({ label, text: tidyText(body), raw: body, ...splitTriple(body) });
  };
  if (lettered) markers.forEach((mk, i) => add(mk.letter, list.slice(mk.end, i + 1 < markers.length ? markers[i + 1].index : undefined)));
  else unletteredParts(list).forEach((body, i) => add(LETTERS[i] || String(i + 1), body));
  // Only a lettered list can carry a letter gap; the unlettered path assigns the letters itself.
  parts.forEach((p, i) => {
    if (lettered && p.label !== LETTERS[i]) warnings.push(`Part ${i + 1} is labelled (${p.label}); expected (${LETTERS[i]}).`);
    if (!p.text) warnings.push(`Part (${p.label}) has no text.`);
  });
  if (!parts.length && text.trim()) warnings.push('No specimen text found.');
  if (parts.length > MAX_PARTS) warnings.push(`${parts.length} parts found; the app holds at most ${MAX_PARTS}.`);
  return { history, casePrefix, parts, warnings: [...new Set(warnings)] };
}

/** The last block of the paste: everything after the final blank line (or the whole of a one-block paste). */
function lastBlockStart(lines) {
  let i = lines.length - 1;
  while (i >= 0 && lines[i].trim() === '') i--;
  while (i >= 0 && lines[i].trim() !== '' && !HISTORY_HEADING.test(lines[i])) i--;
  return i + 1;
}

/** Parts of an unlettered list: one per line, and one per comma that has no space after it. */
function unletteredParts(list) {
  const out = [];
  for (const piece of String(list).split(UNLETTERED_SPLIT)) {
    const body = stripEnds(piece);
    if (!body) continue;
    // "Antrum,biopsy" is one part typed without the space, not a part called "biopsy".
    if (out.length && PROCEDURE_WORDS.test(body)) out[out.length - 1] += `, ${body}`;
    else out.push(body);
  }
  return out;
}

function historyOf(lines) {
  const kept = lines.filter((l) => !HISTORY_HEADING.test(l) && !SPECIMEN_HEADING.test(l));
  return kept.join('\n').replace(/^\n+|\n+$/g, '').replace(/\n{3,}/g, '\n\n');
}

// ---------- matching ----------

const RESECTION_CTX = /\b(resection|excision|re-excision|\w+ectomy|wedge|lobectomy|dissection|debulking|amputation|enucleation|replacement|explant|turbt|turp|leep|lletz|cone|closure|reversal|revision)\b/i;
const BIOPSY_CTX = /\b(biops(y|ies)|bx|punch|cores?|curett\w*|pipelle|polypectomy|emr|esd|fna|aspirate|smear|cytology|fluid|washing|urine|brushing|shave)\b/i;
const CANCER_CTX = /\b(ca|carcinoma|cancer|malignan\w*|adenocarcinoma|tumou?r|gist|lymphoma|sarcoma|metasta\w*|mets?)\b/i;
const NODE_STRONG = /\b(ln|slnb?|sentinel)\b/i;
const NODE = /\b(lymph\s*nodes?|nodes?)\b/i;
const CYTO = /\b(fna|aspirate|smear|cytology|tbna|washing|fluid)\b/i;
const MARGIN = /\bmargin\b/i;
const CANCER_KINDS = ['cancer resection'];
const RESECTION_KINDS = ['benign resection', 'cancer resection'];
const BIOPSY_KINDS = ['biopsy', 'cytology'];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const termRe = (term) => {
  const t = clean(term);
  const lead = /^[a-z0-9]/i.test(t) ? '\\b' : '';
  const tail = /[a-z0-9]$/i.test(t) ? (t.length >= 4 && /[a-z]$/i.test(t) ? 's?\\b' : '\\b') : '';
  return new RegExp(`${lead}${esc(t)}${tail}`, 'i');
};
const hits = (terms, text) => (terms || []).filter((t) => termRe(t).test(text)).length;

// `match.siteAbbrev`: house short forms for a subsite - "DC polyp 1", "AC cancer", "ICV SMT". They
// are too short to stand on their own: in the 2021-2026 biopsy export AC is also the
// acromioclavicular joint and an axillary clearance margin. So an abbreviation only counts as a site
// hit when the part also names something a specimen is actually taken for. A full site word
// ("descending colon") never needs this and is matched by `match.site` as before.
const ABBREV_CTX = /\b(polyps?|polypectomy|tumours?|tumors?|mass|masses|lesions?|biopsy|biopsies|cancer|carcinomas?|adenomas?|ESD|EMR|SMT|scar|ulcers?|erosions?|stricture|colitis)\b/i;
const siteHitsFor = (mt, text) =>
  hits(mt.site, text) + (mt.siteAbbrev && ABBREV_CTX.test(text) ? hits(mt.siteAbbrev, text) : 0);

const BREAST_MARGINS = ['Superior', 'Inferior', 'Medial', 'Lateral', 'Anterior', 'Posterior'];

/**
 * Score every template for one part. Candidates are templates whose `match.site` hits the part
 * text (or case prefix); among candidates the score is procedure + clinical hits, a kind gate
 * (biopsy template vs resected part and vice versa), a cancer-context nudge and `match.bias`.
 */
export function scorePart(part, ctx, manifest) {
  const text = `${ctx.casePrefix ? ctx.casePrefix + ' ' : ''}${part.raw || part.text}`;
  const history = ctx.history || '';
  const resected = RESECTION_CTX.test(text);
  const biopsied = BIOPSY_CTX.test(text);
  const cancer = CANCER_CTX.test(history) || CANCER_CTX.test(text);
  const out = [];
  for (const t of manifest) {
    if (t.id === GENERIC_ID || !t.match) continue;
    const mt = t.match;
    const siteHits = siteHitsFor(mt, text);
    if (!siteHits) continue;
    let score = 2 * hits(mt.procedure, text) + 2 * Math.min(1, hits(mt.clinical, history)) - 4 * hits(mt.not, text) + (mt.bias || 0);
    if (resected && !biopsied && BIOPSY_KINDS.includes(t.kind)) score -= 3;
    if (biopsied && !resected && RESECTION_KINDS.includes(t.kind)) score -= 3;
    // `match.bare`: for these templates a site word with no procedure named is evidence in itself,
    // weighted like one procedure hit. It is declared per template rather than inferred from the
    // kind, because the inference only holds where the rival specimen is always named: nobody writes
    // "antrum" for a gastrectomy, so a bare gastric subsite is a biopsy - but a bare "sigmoid" is as
    // likely to be a segment of a resection as a polyp, and a bare "prostate" as likely chips as
    // cores. A bonus and not a penalty on the resection, so an organ whose only template is a
    // resection keeps a non-negative score and stays out of the generic bucket.
    if (!resected && !biopsied && mt.bare) score += 2;
    if (cancer && !biopsied && CANCER_KINDS.includes(t.kind)) score += 1;
    out.push({ id: t.id, score, name: t.name, rank: t.rank ?? 999 });
  }
  return out.sort((a, b) => b.score - a.score || a.rank - b.rank || a.name.localeCompare(b.name));
}

/** Role rules that beat scoring: lymph node parts and breast margins. */
function roleOf(part, ctx, manifest) {
  const text = `${part.raw || part.text}`;
  const ids = new Set(manifest.map((t) => t.id));
  if (ids.has('lymph_node') && !CYTO.test(text)) {
    const strong = NODE_STRONG.test(text);
    const startsWithNode = /^\s*(lymph\s*nodes?|nodes?)\b/i.test(text);
    const otherSite = manifest.some((t) => !['lymph_node', 'lymph_node_fna', GENERIC_ID].includes(t.id) && t.match && siteHitsFor(t.match, text) > 0);
    if (strong || (NODE.test(text) && (startsWithNode || !otherSite))) return { role: 'lymph_node', templateId: 'lymph_node' };
  }
  if (ids.has('breast_excision') && MARGIN.test(text) && !/\bbreast\b/i.test(text)) {
    const breastCase = /\bbreast\b/i.test(ctx.casePrefix || '') || /\bbreast\b/i.test(ctx.history || '') || (ctx.parts || []).some((p) => /\bbreast\b/i.test(p.raw || p.text));
    if (breastCase) {
      // Side comes from the main breast part ("Left 2-3H breast mass"), else the prefix / history.
      const main = (ctx.parts || []).find((p) => /\bbreast\b/i.test(p.raw || p.text) && !MARGIN.test(p.raw || p.text));
      const src = `${main ? main.raw || main.text : ''} ${ctx.casePrefix || ''} ${ctx.history || ''}`;
      const caseSide = /\bleft\b/i.test(src) && !/\bright\b/i.test(src) ? 'Left' : /\bright\b/i.test(src) && !/\bleft\b/i.test(src) ? 'Right' : '';
      return { role: 'breast_margin', templateId: 'breast_excision', caseSide };
    }
  }
  return null;
}

/**
 * Match every parsed part. Tiers: confident (role rule, or best beats the runner-up by >= 2),
 * choose (close call — the strip shows a dropdown), none (no candidate; generic form).
 */
export function matchParts(parsed, history, manifest) {
  const ctx = { casePrefix: parsed.casePrefix || '', history: history || parsed.history || '', parts: parsed.parts };
  return parsed.parts.map((part) => {
    const role = roleOf(part, ctx, manifest);
    const candidates = scorePart(part, ctx, manifest);
    if (role) return { ...part, templateId: role.templateId, tier: 'confident', role: role.role, caseSide: role.caseSide || '', candidates };
    const best = candidates[0];
    const second = candidates[1];
    if (!best || best.score < 0) return { ...part, templateId: GENERIC_ID, tier: 'none', role: null, candidates };
    if (!second || best.score - second.score >= 2) return { ...part, templateId: best.id, tier: 'confident', role: null, candidates };
    // Weak evidence (an organ word alone): offer the candidates but start from the generic form.
    return { ...part, templateId: best.score >= 2 ? best.id : GENERIC_ID, tier: 'choose', role: null, candidates };
  });
}

/** Values to pre-fill on the new part; conservative — only fields whose meaning is certain. */
export function presetValues(schema, part, match = {}) {
  const values = {};
  const fieldIds = new Set((schema?.fields || []).map((f) => f.id));
  const field = (id) => (schema?.fields || []).find((f) => f.id === id);
  const text = part.raw || part.text || '';
  const side = /\bleft\b/i.test(text) ? 'Left' : /\bright\b/i.test(text) ? 'Right' : '';
  if (side && field('side')?.options?.includes(side)) values.side = side;
  if (match.role === 'lymph_node' || schema?.id === 'lymph_node') {
    let station = part.detail || part.text;
    station = station.replace(/^\s*lymph\s*nodes?\s*(at|of|from)?\s*[,:-]?\s*/i, '').trim();
    if (fieldIds.has('specimenName')) values.specimenName = station;
    const opts = field('procedure')?.options || [];
    const proc = /sentinel/i.test(text) ? 'Sentinel lymph node biopsy' : /dissection/i.test(text) ? 'Dissection' : /resection/i.test(text) ? 'Resection' : 'Excision';
    if (opts.includes(proc)) values.procedure = proc;
    return values;
  }
  if (match.role === 'breast_margin') {
    if (!values.side && match.caseSide && field('side')?.options?.includes(match.caseSide)) values.side = match.caseSide;
    values.partType = 'Cavity shave margin';
    const named = BREAST_MARGINS.find((m) => new RegExp(`\\b${m}\\b`, 'i').test(text));
    if (named) values.margin = named;
    else { values.margin = 'Other'; values.marginOther = text.replace(/\bmargins?\b/i, '').trim().toLowerCase(); }
    return values;
  }
  if (schema?.id === 'breast_excision') {
    values.partType = 'Breast lesion excision';
    if (fieldIds.has('site')) values.site = part.detail || part.text;
    return values;
  }
  if (schema?.id === GENERIC_ID) {
    values.specimenName = part.text;
    return values;
  }
  if (schema?.id === 'frozen_section') {
    const sc = frozenScenario(text);
    if (sc && field('scenario')?.options?.includes(sc)) values.scenario = sc;
    applyFill(schema, part, values);
    // The margin pick-lists carry the organ, so the typed specimen name would say it twice.
    if (values.scenario === 'Margin' && values.mgOrgan) delete values.specimenName;
    else if (!values.specimenName && fieldIds.has('specimenName')) values.specimenName = part.detail || part.text;
    return values;
  }
  applyFill(schema, part, values);
  return values;
}

/** Spelling variants folded before option matching (applied to option labels and part text alike). */
const SITE_SPELLINGS = [
  [/\bcaec/g, 'cec'], [/\bileo-?caec/g, 'ileocec'], [/\boesophag/g, 'esophag'],
  [/\bgreater curv(ature)?\b/g, 'gc'], [/\blesser curv(ature)?\b/g, 'lc'],
  [/\brecto-?sigmoid( junction)?\b/g, 'rectosigmoid'], [/\bsigmoid colon\b/g, 'sigmoid'],
  [/\brandom colon(ic)?\b/g, 'random'], [/\bt\.?i\.?\b/g, 'terminal ileum'],
  // "Angular" is the house word for the incisura angularis and is written alone on the gastric
  // mapping request (20 cases in the 2024-2026 export against 57 spelling it "incisura").
  [/\bincisura( angularis)?\b/g, 'incisura'], [/\bangular(is)?\b/g, 'incisura'], [/\bmandibular\b/g, 'mandible'], [/\bmaxillary\b/g, 'maxilla'], [/\bantral\b/g, 'antrum'],
  [/\ba\.?p\.?r\.?\b/g, 'abdominoperineal resection'], [/\blar\b/g, 'low anterior resection'],
  // Uterus: LIS shorthand → the benign-uterus specimen options
  [/\b(?:tlh|tah|lavh|th)\s*-?\s*bso\b/g, 'uterus cervix and bilateral adnexa'], [/\b(?:appendages|adnexae|bilateral tubes and ovaries|bilateral ovaries and tubes|bso)\b/g, 'bilateral adnexa'],
  [/\b(?:tlh|tah|lavh)\b/g, 'uterus and cervix total hysterectomy'], [/\btubes?\(s\)/g, 'tube'], [/\btubes\b/g, 'tube'], [/\bsterili[sz]ation\b/g, 'sterilisation'],
];
const UNSPECIFIC_OPTION = /unspecified|not (specified|otherwise|stated|applicable|identified)|cannot be|^other\b|specify/i;

function siteTokens(s) {
  let x = String(s || '').toLowerCase();
  for (const [re, to] of SITE_SPELLINGS) x = x.replace(re, to);
  return x.split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * The option whose words all appear in the part text; the longest wins, a tie or an
 * "unspecified"-type option gives nothing. "Ascending colon, biopsy" → "Ascending colon";
 * "antrum" alone → nothing for ["Antrum, greater curvature", "Antrum, lesser curvature"].
 */
export function matchOption(options, text) {
  const have = new Set(siteTokens(text));
  if (!have.size) return '';
  let best = ''; let bestN = 0; let tie = false;
  for (const opt of options || []) {
    if (UNSPECIFIC_OPTION.test(opt)) continue;
    let toks = siteTokens(opt);
    if (toks.length > 1) toks = toks.filter((w) => w !== 'colon');   // "Ascending colon" also matches "ascending, biopsy"
    if (!toks.length || !toks.every((w) => have.has(w))) continue;
    if (toks.length > bestN) { best = opt; bestN = toks.length; tie = false; }
    else if (toks.length === bestN && opt !== best) tie = true;
  }
  return tie ? '' : best;
}

/**
 * Drop the words `strip` matches from a copied specimen value, comma-part by comma-part, so a
 * pasted "Prostate biopsy, left apex" reaches a Site field as "left apex" — the organ and the
 * procedure are already printed by the diagnosis line and would otherwise be said twice.
 * A comma-part left with no letters or digits is dropped whole.
 */
export function stripWords(value, strip) {
  const re = new RegExp(strip, 'gi');
  return String(value || '')
    .split(/\s*,\s*/)
    .map((bit) => bit.replace(re, ' ').replace(/\s*\(\s*\)\s*/g, ' ').replace(/\s+/g, ' ').replace(/^[\s-]+|[\s,;:.-]+$/g, '').trim())
    .filter((bit) => /[a-z0-9]/i.test(bit))
    .join(', ');
}

/**
 * The frozen scenario read off the request line. The order is the measured one: the sentinel and
 * node words are checked before "margin" because "sentinel node, level II margin" is a node, and
 * the organ-specific scenarios are checked before the generic margin for the same reason.
 * Ranking and vocabulary from `docs/case-mix/frozen-2021-2026.md` (598 cases, 1291 parts).
 */
export function frozenScenario(text) {
  const t = String(text || '').toLowerCase();
  // CNS first: "frontal lobe" would otherwise be caught by the lung test on "lobe".
  if (/\bbrain\b|cerebell|cerebral|pituitar|sellar|craniotomy|burr hole|meningioma|glioma|schwannoma|intracranial|cerebellopontine|\bcpa\b|(?:frontal|temporal|parietal|occipital)\s+lobe/.test(t)) return 'CNS / pituitary';
  if (/\bsln\b|sentinel/.test(t)) return 'Sentinel lymph node';
  if (/parathyroid/.test(t)) return 'Parathyroid';
  if (/lymph\s*nodes?\b|\blevel\s+[i1-5]\b|\bnodal\b/.test(t)) return 'Lymph node';
  if (/pancrea|bile duct|cystic duct|ampull/.test(t)) return 'Pancreatic / bile duct margin';
  if (/\blung\b|pleura|wedge|lobe/.test(t)) return 'Lung wedge / nodule';
  if (/ovar|adnex|fallopian|omentum|omental|peritone/.test(t)) return 'Ovarian / adnexal mass';
  if (/margin|\bstump\b|staple line|transection|resection margin/.test(t)) return 'Margin';
  if (/nodule|\bmass\b|tumou?r|lesion/.test(t)) return 'Nodule / mass';
  return '';
}

/** `match.fill`: `{field, from: "detail" | "text" | "options", fallback?, strip?, unless?}` rules (a single object is accepted too). */
function applyFill(schema, part, values) {
  const rules = [].concat(schema?.match?.fill || []);
  const field = (id) => (schema?.fields || []).find((f) => f.id === id);
  const text = part.raw || part.text || '';
  for (const rule of rules) {
    const f = field(rule.field);
    if (!f || values[rule.field]) continue;
    if (rule.from === 'options') {
      if (!Array.isArray(f.options)) continue;
      const opt = matchOption(f.options, text);
      if (opt) values[rule.field] = opt;
    } else if (f.type === 'text') {
      let v = rule.from === 'detail' ? part.detail : part.text;
      // `fallback` — the LIS triple did not parse ("Prostate biopsy, left apex" has no trailing
      // procedure word), so copy the pasted part itself rather than leaving the field empty.
      if (!v && rule.fallback) v = rule.fallback === 'detail' ? part.detail : part.text;
      // `strip` (regex source) removes the organ and procedure words, then the remainder opens with a
      // capital so the microscopy heading reads "Left apex, 2 cores" whatever the LIS casing was.
      if (v && rule.strip) v = stripWords(v, rule.strip).replace(/^[a-z]/, (c) => c.toUpperCase());
      // `unless` (regex source) skips a value that is only a generic word ("polyp", "biopsy").
      if (v && !(rule.unless && new RegExp(rule.unless, 'i').test(v.trim()))) values[rule.field] = v;
    }
  }
}

/** "(A) antrum and (B) body" — site per part, so the gastric title parser keeps working. */
export function deriveTitle(parts) {
  const items = parts.map((p) => `(${p.label}) ${p.detail || p.text}`);
  if (items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
