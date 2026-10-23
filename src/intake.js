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
// A neck dissection is a nodal specimen, but "neck" is a skin site word, so "Left neck dissection,
// levels I-IV" named no node and went to the skin forms (to skin SCC when the history named SCC).
// It is a node part when nothing else on the line names a site: "hemiglossectomy and neck
// dissection" in one part still scores as the primary.
const NECK_DISSECTION = /\bneck\s+dissections?\b/gi;
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
// `match.alone`: site and procedure words that count only on a line naming none of `alone.unless`
// (regex source). The benign uterus form reads a tube-only request this way ("Left fallopian tube,
// salpingectomy", "FALLOPIAN TUBE, left paratubal cyst, excision": 99 of the 18,913 request lines of
// the 2021-2026 biopsy and 2024-2026 LIS exports, 78 of them with no candidate at all), while a line
// that also names the ovary, the uterus or a pregnancy keeps the route it had - the ovarian cyst form,
// the hysterectomy forms, and the ectopic pregnancy card. A fill rule marked `alone` follows the same gate.
const aloneFor = (mt, text) => (mt?.alone && !new RegExp(mt.alone.unless, 'i').test(text) ? mt.alone : null);
const siteHitsFor = (mt, text) =>
  hits(mt.site, text) + (mt.siteAbbrev && ABBREV_CTX.test(text) ? hits(mt.siteAbbrev, text) : 0) + hits(aloneFor(mt, text)?.site, text);

// `match.exclude`: words that take a template out of the running altogether rather than 4 points
// down (`match.not`). The abscess form reads "abscess", "ulcer" and "fistula" as its site words, and
// those turn up on every organ: a mandibular fistula or a gastric ulcer belongs to that organ's
// template, and a penalty alone still left the abscess form tied with it, which sent the part to
// Generic. The bone and joint form declares it too: "iliac" is also a lymph node station, and a
// jaw, a digit, an ossicle, marrow, a vessel, an amputation or a spinal cord lesion each has its own
// template or card.
const excluded = (mt, text) => !!(mt.exclude && hits(mt.exclude, text));

// `match.own`: biopsy words a resection form reports itself, on a line naming one of `own.site`.
// There they are not biopsy context for that form, so the -3 kind gate below leaves it alone.
// Skin excision takes curettings: 20 of the 22 skin curettings in the 2021-2026 biopsy file and 13
// of the 14 in the 2024-2026 LIS export were seborrhoeic keratoses, yet the gate left the form at
// -1 and every one opened Generic. The sites are the unambiguous skin words; ear, eyelid, lip and
// nose curettings keep their routes (the ear ones are the cholesteatoma form's).
// On a biopsy form `own` works the other way: resection words it reports itself. A cervical polyp
// "excision" is a polypectomy, and the gate sent "Cervical polyp, excision" to Generic (2026-10-05).
const ownFor = (mt, text) => (mt?.own && hits(mt.own.site, text) ? mt.own : null);
const without = (terms, text) => (terms || []).reduce((s, t) => s.replace(new RegExp(termRe(t).source, 'gi'), ' '), text);

// ---- Breast cavity shave margins ------------------------------------------------------------------
// The lab writes a cavity shave margin "Breast, left superior margin". In the 2021-2026 biopsy and
// 2024-2026 LIS exports 168 specimen lines name a breast margin, nearly all in that shape, and none was
// filled as a margin: the role rule took only a margin line without the word "breast" ("Anterior margin"
// under "Breast, excision:"), so 153 opened Generic as a close call and 15 opened the excision form as a
// lesion excision, and a part switched to the form by hand kept its right / superior defaults (user,
// 2026-10-10). None of those lines reads as a lesion excision that names its margins: "mass" and
// "lumpectomy" come only after the margin word ("Breast, superior margin, left breast mass"). A margin
// line without "breast" still needs a breast case: a side and a margin direction with no organ ("Left
// superior margin") named a breast margin in fewer than one in ten of the 29 such lines.
export const BREAST_MARGINS = ['Superior', 'Inferior', 'Medial', 'Lateral', 'Anterior', 'Posterior'];
const MARGIN_DIRS = { superior: 'Superior', sup: 'Superior', inferior: 'Inferior', inf: 'Inferior', medial: 'Medial', med: 'Medial', lateral: 'Lateral', lat: 'Lateral', anterior: 'Anterior', ant: 'Anterior', posterior: 'Posterior', post: 'Posterior' };
// A line that names a margin only to orient the lesion ("Left breast mass, WLE, superior margin short
// stitch"), or names the lesion before the margin, is the lesion excision.
const MARGIN_ORIENT = /\b(?:stitch\w*|sutur\w*|loops?|clips?|short|long|ink(?:ed)?|marked)\b/i;
const LESION_THEN_MARGIN = /\b(?:mass(?:es)?|lesions?|lumps?|tumou?rs?|nodules?|mastectomy)\b[^()]*?\bmargin\b/i;
// A frozen section margin ("Superior margin, FS") is the frozen form's, whatever the case.
const FROZEN_WORDS = /\b(?:frozen|FS|intra-?operative)\b/i;
// Words that are not the margin's name: side, organ, sequence and procedure ("left new superior").
const NOT_MARGIN_NAME = /\b(?:left|right|lt|rt|l|r|breast|mammary|new|final|additional|further|re|cavity|shaves?|shaved|shaving|excision|re-excision|resection|specimen|the|of)\b\.?/gi;
// "Lt" / "Rt" and a bare "L" / "R" are a side on a margin line ("L superior margin", "Superior margin
// (R lumpectomy)"); sideOf reads them only beside an hour, "breast" or a sided site word.
const MARGIN_SIDE_LETTER = /(?:^|[\s(,;:])(lt|rt|l|r)\.?(?=[\s),;:]|$)/gi;

/**
 * A breast margin line in the excision form's terms: `margin` (the line is a margin specimen), `side`
 * ('Left', 'Right' or '' when it names none or both), `name` (one of BREAST_MARGINS, 'Other', or '' when
 * the margin is not named) and `other` (the name as written, for Other: "superomedial", "deep").
 * "Breast, left superior margin" -> { margin: true, side: 'Left', name: 'Superior', other: '' }.
 */
export function readBreastMargin(text) {
  const t = clean(text);
  const margin = MARGIN.test(t) && !MARGIN_ORIENT.test(t) && !LESION_THEN_MARGIN.test(t);
  const found = sidesIn(t);
  if (margin) for (const m of t.matchAll(MARGIN_SIDE_LETTER)) found.add(/^l/i.test(m[1]) ? 'Left' : 'Right');
  const side = found.size === 1 ? [...found][0] : '';
  if (!margin) return { margin, side, name: '', other: '' };
  // The name is in the comma piece before "margin": "Breast, left new superior margin" -> "left new superior".
  const before = t.slice(0, t.search(MARGIN)).split(/[,;:]/).pop().replace(/[()]/g, ' ');
  const dirs = [...new Set((before.match(/[A-Za-z]+/g) || []).map((w) => MARGIN_DIRS[w.toLowerCase()]).filter(Boolean))];
  if (dirs.length === 1) return { margin, side, name: dirs[0], other: '' };
  const other = before.replace(NOT_MARGIN_NAME, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  return { margin, side, name: other ? 'Other' : '', other };
}

/** True when a specimen line is a breast margin for the excision form (a frozen section margin is not). */
export const breastMarginLine = (text) => readBreastMargin(text).margin && !FROZEN_WORDS.test(String(text || ''));

/** The side of a breast case, for a breast line that names none: the main breast part, else the prefix and history. */
function breastCaseSide(ctx) {
  const main = (ctx.parts || []).find((p) => BREAST_WORD.test(p.raw || p.text) && !MARGIN.test(p.raw || p.text));
  return sideOf(`${main ? main.raw || main.text : ''} ${ctx.casePrefix || ''} ${ctx.history || ''}`);
}

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
    if (!siteHits || excluded(mt, text)) continue;
    // `match.gate`: a pattern the specimen line or the clinical history must meet before the
    // template is a candidate at all. Skin SCC shares every site word with the skin excision form
    // and only the diagnosis tells them apart, so it is offered only when SCC is named (and not
    // "SCC in situ"). A gate that fails leaves the part to the other templates, never to generic.
    if (mt.gate && !new RegExp(mt.gate, 'i').test(`${text} ${history}`)) continue;
    let score = 2 * hits(mt.procedure, text) + 2 * hits(aloneFor(mt, text)?.procedure, text) + 2 * Math.min(1, hits(mt.clinical, history)) - 4 * hits(mt.not, text) + (mt.bias || 0);
    const own = ownFor(mt, text);
    const resectedHere = own && BIOPSY_KINDS.includes(t.kind) ? RESECTION_CTX.test(without(own.procedure, text)) : resected;
    if (resectedHere && !biopsied && BIOPSY_KINDS.includes(t.kind)) score -= 3;
    const biopsiedHere = own ? BIOPSY_CTX.test(without(own.procedure, text)) : biopsied;
    if (biopsiedHere && !resected && RESECTION_KINDS.includes(t.kind)) score -= 3;
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

// A request for a HER2 dual ISH test on a block already reported: the standalone HER2 ISH form
// (`breast_biomarkers`), whatever the specimen was. "Breast, left 8 o'clock, 2 cm FN, core biopsy,
// paraffin block (26BX-012345), for HER-2 DISH test" (user example, 2026-10-08) scored as a breast
// core biopsy, and a node or a liver metastasis sent for the test would have taken the node or liver
// form. The test has to be named in the specimen line itself - a history that mentions an earlier
// HER2 result does not make a new core a HER2 request - and the case has to be a breast one: named in
// the line, or in the history or prefix when the line is one of the form's other sites (a node, soft
// tissue or skin, the liver). Gastric and other HER2 requests keep their own routes. FISH is a
// different test and is not matched.
export const HER2_ISH_TEST = /\b(?:HER-?2(?:\/neu)?|c-?erb-?B-?2)\b[^;\n]*?\b(?:D-?ISH|dual[\s-]?ISH|SISH|ISH|in[\s-]?situ[\s-]+hybridi[sz]ation)\b|\bD-?ISH\b|\bdual[\s-]?ISH\b/i;
const BREAST_WORD = /\b(?:breast|mammary)\b/i;
const HER2_ISH_OTHER_SITE = /\b(?:lymph\s*nodes?|LN|axill(?:a|ary)|soft\s+tissue|chest\s+wall|skin|liver|hepatic)\b/i;
const her2IshRequest = (text, ctx) => HER2_ISH_TEST.test(text)
  && (BREAST_WORD.test(text) || (BREAST_WORD.test(`${ctx.casePrefix || ''} ${ctx.history || ''}`) && HER2_ISH_OTHER_SITE.test(text)));

// The lymphoma test reads the history as well as the line: the request names the node and the history
// names the question ("Lymph node, left neck, excision" with "?lymphoma").
const lymphomaNode = (mt, text, ctx) => !excluded(mt, text) && !!mt.gate
  && new RegExp(mt.gate, 'i').test(`${text} ${ctx.casePrefix || ''} ${ctx.history || ''}`);

/** Role rules that beat scoring: HER2 ISH requests, lymph node parts and breast margins. */
function roleOf(part, ctx, manifest) {
  const text = `${part.raw || part.text}`;
  const ids = new Set(manifest.map((t) => t.id));
  if (ids.has('breast_biomarkers') && her2IshRequest(text, ctx)) return { role: 'her2_ish', templateId: 'breast_biomarkers' };
  if (ids.has('lymph_node') && !CYTO.test(text)) {
    const strong = NODE_STRONG.test(text);
    const startsWithNode = /^\s*(lymph\s*nodes?|nodes?)\b/i.test(text);
    // The lymphoma form (Phase 71) shares the node site words, so it is not "a site elsewhere" either.
    const siteElsewhere = (s) => manifest.some((t) => !['lymph_node', 'lymph_node_fna', 'lymphoma_node', GENERIC_ID].includes(t.id) && t.match && !excluded(t.match, text) && siteHitsFor(t.match, s) > 0);
    const otherSite = siteElsewhere(text);
    const neck = text.search(NECK_DISSECTION) >= 0 && !siteElsewhere(text.replace(NECK_DISSECTION, ' '));
    if (strong || neck || (NODE.test(text) && (startsWithNode || !otherSite))) {
      // A node sent for lymphoma (Phase 71, user request 2026-10-14): the lymphoma form when the line, the
      // case prefix or the history meets its `match.gate`, unless its `match.exclude` names a sentinel node,
      // a dissection, an aspirate or a frozen section. Both are declared in schemas/lymphoma_node.json.
      const lymphoma = manifest.find((t) => t.id === 'lymphoma_node');
      if (lymphoma?.match && lymphomaNode(lymphoma.match, text, ctx)) return { role: 'lymphoma_node', templateId: 'lymphoma_node' };
      return { role: 'lymph_node', templateId: 'lymph_node' };
    }
  }
  // A breast margin (readBreastMargin): a line that says "breast" is one on its own; one that does not
  // ("Anterior margin" under "Breast, excision:") needs the breast in the prefix, the history or another
  // part. A frozen section margin stays with the frozen form. matchParts adds the case's side.
  if (ids.has('breast_excision') && breastMarginLine(text)) {
    const breastCase = [text, ctx.casePrefix, ctx.history, ...(ctx.parts || []).map((p) => p.raw || p.text)].some((s) => BREAST_WORD.test(s || ''));
    if (breastCase) return { role: 'breast_margin', templateId: 'breast_excision' };
  }
  return null;
}

/**
 * Match every parsed part. Tiers: confident (role rule, or best beats the runner-up by >= 2),
 * choose (close call — the strip shows a dropdown), none (no candidate; generic form).
 */
export function matchParts(parsed, history, manifest) {
  const ctx = { casePrefix: parsed.casePrefix || '', history: history || parsed.history || '', parts: parsed.parts };
  // Every row carries the breast case's side, so a breast part whose line names none takes it whichever
  // form it ends up on (a margin picked by hand from Generic included).
  const caseSide = breastCaseSide(ctx);
  return parsed.parts.map((part) => {
    const role = roleOf(part, ctx, manifest);
    const candidates = scorePart(part, ctx, manifest);
    if (role) return { ...part, templateId: role.templateId, tier: 'confident', role: role.role, caseSide, history: ctx.history, candidates };
    const best = candidates[0];
    const second = candidates[1];
    if (!best || best.score < 0) return { ...part, templateId: GENERIC_ID, tier: 'none', role: null, caseSide, history: ctx.history, candidates };
    if (!second || best.score - second.score >= 2) return { ...part, templateId: best.id, tier: 'confident', role: null, caseSide, history: ctx.history, candidates };
    // Weak evidence (an organ word alone): offer the candidates but start from the generic form.
    return { ...part, templateId: best.score >= 2 ? best.id : GENERIC_ID, tier: 'choose', role: null, caseSide, history: ctx.history, candidates };
  });
}

// ---- Side, and the breast clock face -------------------------------------------------------------
// Measured on the 671 breast part-pieces of the 2021-2026 biopsy export: 510 name the side as a word,
// 119 put the side letter on the clock hour ("L11H" 59, "R2H" 60), 3 write "Lt" / "Rt". 290 carry a
// clock position: "11 o'clock" in its spellings, "11H" (never "11 H"), and six ranges ("2-3H"); 24 give
// the distance from the nipple ("3cm FN", "2FN"). Of the released diagnosis lines that give side and
// hour, 94 read "BREAST, left 11 o'clock, core biopsy", 71 "BREAST, L11H ...", 25 "BREAST, left 11H".
const HOUR = '(?:1[0-2]|0?[1-9])';
const CLOCK_SRC = `(?<![A-Za-z\\d])(?:([LR])t?\\.?)?\\s?(${HOUR})(?:\\s?(?:-|/|to)\\s?(${HOUR}))?(?:H\\b|\\s?o\\s?['\u2019]?\\s?clock\\b)`;
const CLOCK = new RegExp(CLOCK_SRC, 'i');
const CLOCK_ALL = new RegExp(CLOCK_SRC, 'gi');
const DISTANCE = /(\d+(?:\.\d+)?)\s?(?:cm)?\s?(?:FN|FTN|from\s+(?:the\s+)?nipple)\b/i;
// "Lt" / "Rt" only beside an hour, "breast", "axilla" or a CNS or lung site word, and a bare "L" / "R"
// only beside the site word: on its own "RT" is as often radiotherapy. In the 208 CNS request lines of
// the 2021-2026 biopsy and 2024-2026 LIS exports the side is written "R CPA", "L sphenoidal" and
// "Rt temporal" as well as in full.
const SIDED_SITE = '(?:frontal|temporal|parietal|occipital|fronto|temporo|parieto|occipito|cerebell|cpa\\b|cerebello-?pontine|sphenoid|thalam|upper|middle|lower|lung)';
const SIDE_WORDS = new RegExp(`\\b(left|right)\\b|\\b(lt|rt)\\b\\.?(?=\\s*(?:\\d|breast|axill|${SIDED_SITE}))|\\b([lr])\\b\\.?(?=\\s*${SIDED_SITE})`, 'gi');
// A lung lobe written as the house abbreviation carries its side: RUL, RML, RLL, LUL, LLL.
const LOBE_ABBREV = /\b(R(?:UL|ML|LL)|L(?:UL|LL))\b/gi;
const TARGET_NOUNS = /\b(lesions?|mass(?:es)?|lumps?|nodules?|tumou?rs?)\b/gi;

/**
 * The side a specimen line names: "Left", "Right", or '' when it names none or both. Reads the words,
 * "Lt" / "Rt", the letter fused to a clock hour ("L11H", "R 2H", "L10-11H") and to a lung lobe ("LLL"),
 * and a bare letter on a CNS or lung site word ("R CPA", "L upper lobe"). Anywhere else a bare L or R is
 * not a side ("LN", "L 3 cores").
 */
export function sideOf(text) {
  const found = sidesIn(text);
  return found.size === 1 ? [...found][0] : '';
}

/** Every side the line names, read as sideOf reads them (a Set of 'Left' / 'Right'). */
function sidesIn(text) {
  const t = String(text || '');
  const found = new Set();
  for (const m of t.matchAll(SIDE_WORDS)) found.add(/^l/i.test(m[1] || m[2] || m[3]) ? 'Left' : 'Right');
  for (const m of t.matchAll(CLOCK_ALL)) if (m[1]) found.add(/^l/i.test(m[1]) ? 'Left' : 'Right');
  for (const m of t.matchAll(LOBE_ABBREV)) found.add(/^l/i.test(m[1]) ? 'Left' : 'Right');
  return found;
}

/**
 * The side as a field spells it ("left" on the CNS forms, "Left" elsewhere), or '' when the line names
 * none the field offers. A line with neither side may still say "midline" or "bilateral", which only the
 * CNS side fields offer.
 */
export function sideFor(options, text) {
  const s = sideOf(text) || (/\bmidline\b/i.test(text) ? 'midline' : /\bbilateral\b/i.test(text) ? 'bilateral' : '');
  return (s && (options || []).find((o) => o.toLowerCase() === s.toLowerCase())) || '';
}

/**
 * A breast site written the house way, for a template that prints the side from its own field:
 * "L11H lesion" -> "11 o'clock"; "Right 2 O'clock, 3cm FN" -> "2 o'clock, 3 cm FN"; "R10-11H PA" ->
 * "10-11 o'clock, PA"; "left UOQ" -> "UOQ". The side goes (left in, the diagnosis line would read
 * "BREAST, left L11H lesion"), and so do "breast" and the generic target nouns (lesion, mass, lump,
 * nodule, tumour) that the target field already carries; any other word is kept after the clock.
 * `tokensOnly` returns just the clock and the distance, for a line that is not an LIS triple.
 */
export function clockSite(text, { tokensOnly = false } = {}) {
  let t = ` ${String(text || '')} `;
  let clock = '';
  let distance = '';
  const c = t.match(CLOCK);
  if (c) {
    clock = `${Number(c[2])}${c[3] ? `-${Number(c[3])}` : ''} o'clock`;
    t = t.replace(c[0], ' ');
  }
  const d = t.match(DISTANCE);
  if (d) {
    distance = `${d[1]} cm FN`;
    t = t.replace(d[0], ' ');
  }
  if (tokensOnly) return [clock, distance].filter(Boolean).join(', ');
  const rest = t.replace(SIDE_WORDS, ' ').replace(/\bbreast\b/gi, ' ').replace(TARGET_NOUNS, ' ')
    .split(/\s*[,;]\s*/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => /[a-z0-9]/i.test(s));
  return [clock, distance, ...rest].filter(Boolean).join(', ');
}

// The HER2 ISH request line read into the form: the organ when the line opens on one the form offers,
// the rest of the specimen as written, and the block number. "Breast, left 8 o'clock, 2 cm FN, core
// biopsy, paraffin block (26BX-012345), for HER-2 DISH test" -> Breast / "left 8 o'clock, 2 cm FN,
// core biopsy" / 26BX-012345, which the form prints back as the same line. A line that does not open
// on the organ ("Left breast, 8H, core biopsy, …") keeps its own words under Other.
const ISH_TAIL = /[\s,;]*\b(?:paraffin\s+blocks?\b|blocks?\s*(?:no\.?\s*)?(?=[(\dA-Z])|for\s+(?:the\s+)?(?:HER-?2|c-?erb|D-?ISH|dual[\s-]?ISH|ISH)\b)/i;
const ISH_BLOCK = /\bblocks?\s*(?:no\.?\s*)?(?:\(\s*([^)]+?)\s*\)|([A-Z0-9]*\d[A-Z0-9]*(?:[-/][A-Z0-9]+)*(?:\s+[A-Z]{1,2}\d{1,3}\b)?))/i;
export function her2IshValues(schema, text) {
  const values = {};
  const fieldIds = new Set((schema?.fields || []).map((f) => f.id));
  const options = (schema?.fields || []).find((f) => f.id === 'site')?.options || [];
  const line = clean(text).replace(/[\s.]+$/, '');
  const b = ISH_BLOCK.exec(line);
  if (b && fieldIds.has('blockNo')) values.blockNo = (b[1] || b[2]).trim();
  const cut = line.search(ISH_TAIL);
  const head = (cut >= 0 ? line.slice(0, cut) : line).replace(/[\s,;:-]+$/, '').trim();
  if (!head) return values;
  const m = /^(breast|lymph\s+nodes?|soft\s+tissue|liver)\b\s*(?:[,:]\s*|\s+-\s+|$)(.*)$/i.exec(head);
  const organ = m && options.find((o) => o.toLowerCase() === m[1].toLowerCase().replace(/\s+/g, ' ').replace(/s$/, ''));
  if (organ && fieldIds.has('site')) {
    values.site = organ;
    if (fieldIds.has('siteDetail')) values.siteDetail = m[2].trim();
  } else if (options.includes('Other') && fieldIds.has('siteDetail')) {
    values.site = 'Other';
    values.siteDetail = head.charAt(0).toUpperCase() + head.slice(1);
  }
  return values;
}

/** Values to pre-fill on the new part; conservative — only fields whose meaning is certain. */
export function presetValues(schema, part, match = {}) {
  const values = {};
  const fieldIds = new Set((schema?.fields || []).map((f) => f.id));
  const field = (id) => (schema?.fields || []).find((f) => f.id === id);
  const text = part.raw || part.text || '';
  // Templates call the field `side` or `laterality`. Until 2026-09-24 only `side` was written, and only
  // as "Left" / "Right", so eight templates kept their default whatever the request said: the six
  // `laterality` ones ("Parotid, right" printed left) and the two CNS ones ("left frontal" printed right).
  // The option is matched without case: the CNS templates spell theirs "left" / "right".
  const sideField = ['side', 'laterality'].find((id) => fieldIds.has(id));
  const sideOption = (s) => (s && sideField ? (field(sideField).options || []).find((o) => o.toLowerCase() === s.toLowerCase()) : undefined);
  const side = sideField ? sideFor(field(sideField).options, text) : '';
  if (side) values[sideField] = side;
  // `match.sideFromText`: the side is only ever the one the request names. When it names none, the field
  // is left blank (or on the template's own "Not stated") rather than keeping the form's default side.
  else if (sideField && schema.match?.sideFromText) {
    values[sideField] = (field(sideField).options || []).find((o) => /^not (stated|specified)$/i.test(o)) || '';
  }
  if (match.role === 'her2_ish') return { ...values, ...her2IshValues(schema, text) };
  if (match.role === 'lymph_node' || schema?.id === 'lymph_node') {
    let station = part.detail || part.text;
    station = station.replace(/^\s*lymph\s*nodes?\s*(at|of|from)?\s*[,:-]?\s*/i, '').trim();
    if (fieldIds.has('specimenName')) values.specimenName = station;
    const opts = field('procedure')?.options || [];
    const proc = /sentinel/i.test(text) ? 'Sentinel lymph node biopsy' : /dissection/i.test(text) ? 'Dissection' : /resection/i.test(text) ? 'Resection' : 'Excision';
    if (opts.includes(proc)) values.procedure = proc;
    return values;
  }
  // Breast excision form: the part's line goes into "Specimen as received" as written, and the side and
  // margin come from it, never from the form's right / superior defaults (user, 2026-10-10). A margin line
  // (readBreastMargin) is a cavity shave margin however it reached the form: by the role rule, or picked
  // by hand for a line that opened Generic. A side the line does not name is the case's, else Not stated.
  if (schema?.id === 'breast_excision') {
    const m = readBreastMargin(text);
    const notStated = (field('side')?.options || []).find((o) => /^not stated$/i.test(o)) || '';
    values.side = sideOption(m.side) || sideOption(match.caseSide) || notStated;
    const received = clean(part.text || text);
    if (fieldIds.has('specimenName') && received) values.specimenName = received.charAt(0).toUpperCase() + received.slice(1);
    if (m.margin) {
      values.partType = 'Cavity shave margin';
      values.margin = m.name || 'Other';
      values.marginOther = m.name === 'Other' ? m.other : '';
    } else {
      values.partType = 'Breast lesion excision';
      if (fieldIds.has('site')) values.site = part.detail || part.text;
    }
    return values;
  }
  if (schema?.id === GENERIC_ID) {
    values.specimenName = part.text;
    return values;
  }
  if (schema?.id === 'frozen_section') {
    const sc = frozenScenario(text);
    if (sc && field('scenario')?.options?.includes(sc)) values.scenario = sc;
    applyFill(schema, part, values, match.history);
    // The margin pick-lists carry the organ, so the typed specimen name would say it twice.
    if (values.scenario === 'Margin' && values.mgOrgan) delete values.specimenName;
    else if (!values.specimenName && fieldIds.has('specimenName')) values.specimenName = part.detail || part.text;
    return values;
  }
  applyFill(schema, part, values, match.history);
  return values;
}

/** Spelling variants folded before option matching (applied to option labels and part text alike). */
const SITE_SPELLINGS = [
  [/\bcaec/g, 'cec'], [/\bileo-?caec/g, 'ileocec'], [/\boesophag/g, 'esophag'],
  // The adjective and the noun name the same option. "Caecal polyp" was reaching a Site field whose
  // option is "Caecum" and matching nothing, because the rule above only folds ae to e. Kept to the
  // caecum and the rectum, the two whose adjective the requests actually use.
  [/\bcecal\b/g, 'cecum'], [/\brectal\b/g, 'rectum'],
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

// House short forms for a subsite, expanded before option matching. Kept separate from
// SITE_SPELLINGS and applied only when the field's own options contain the expansion, because these
// are two letters and mean other things elsewhere: AC is also the acromioclavicular joint and an
// axillary clearance margin. A Site list that offers "Descending colon" is asking for a colonic
// subsite and nothing else, so on that list the expansion is unambiguous; on any other list it never
// fires. ICV is deliberately absent where no ileocaecal option exists - the valve is its own
// landmark, and quietly rounding it to the caecum would put a site in the report the request did
// not name. The CNS and lung entries are words rather than letters and are gated the same way:
// "upper" becomes "upper lobe" only on a list that offers Upper lobe.
const SITE_ABBREV = [
  [/\bac\b/g, 'ascending colon'], [/\bdc\b/g, 'descending colon'], [/\btc\b/g, 'transverse colon'],
  [/\bhf\b/g, 'hepatic flexure'], [/\bsf\b/g, 'splenic flexure'], [/\bicv\b/g, 'ileocecal valve'],
  // CNS: the requests name a lobe by its adjective. Of 208 CNS request lines (2021-2026 biopsy and
  // 2024-2026 LIS exports) 3 write "lobe", so "Frontal lobe" matched almost nothing and the form's
  // default printed instead. Two lobes run together ("fronto-parietal") are not one option and are left
  // for the pathologist to choose, as are "frontal sinus", "temporal bone" and the scalp.
  ...['frontal', 'temporal', 'parietal', 'occipital'].map((w) => [
    new RegExp(`(?<![a-z]-)\\b${w}\\b(?!-|\\s+(?:lobe|bone|sinus|scalp|skin|artery|muscle|horn|lymph|node|pleura|peritone))`, 'g'), `${w} lobe`]),
  [/\bcerebellar\b(?!-)|\bvermi(?:s|an)\b/g, 'cerebellum'], [/\bcpa\b|\bcerebello-?pontine\b(?!\s+angle)/g, 'cerebellopontine angle'],
  [/\bbrain\s+stem\b|\bpons\b|\bpontine\b|\bmedulla(?:\s+oblongata)?\b|\bmidbrain\b/g, 'brainstem'], [/\bthalamic\b/g, 'thalamus'],
  [/\bpituitary\b|\bsella\b|\bintrasellar\b/g, 'sellar'], [/\b(?:supra|intra)?sellar\b(?!\s+region)|\bsella\b|\bpituitary\b/g, 'sellar region'],
  [/\b(?:supra|intra)?sellar\b|\bsella\b/g, 'sellar suprasellar'],
  [/(?<![a-z]-)\bsphenoid(?:al)?\b(?!\s+sinus)(?:\s+(?:wing|ridge)\b)?/g, 'sphenoid wing'], [/(?<![a-z]-)\bsphenoid(?:al)?\b(?!\s+sinus)(?:\s+(?:wing|ridge)\b)?/g, 'sphenoidal ridge'],
  [/\b(?:para)?falx\b|\b(?:para)?falcine\b/g, 'falx'], [/\bconvexity\b(?!\s+dura)/g, 'convexity dura'],
  [/\bperiventricular\b(?!\s+white)/g, 'periventricular white matter'], [/\b4th\s+ventricle\b/g, 'fourth ventricle'],
  [/\b3rd\s+ventricle\b/g, 'third ventricle'], [/\blateral\s+ventricles\b/g, 'lateral ventricle'], [/\bpineal\b(?!\s+region)/g, 'pineal region'],
  [/\binsular\b/g, 'insula'], [/\bcallosal\b/g, 'corpus callosum'], [/\bspinal\b(?!\s+(?:cord|accessory))|\bintramedullary\b/g, 'spinal cord'],
  // Lung: the lobe by its abbreviation or its adjective alone ("right upper and middle lobes"), and the
  // wedge, which the requests write without "resection" ("LLL wedge").
  [/\b[rl]ul\b|\bupper\b(?!\s+lobe\b)/g, 'upper lobe'], [/\brml\b|\bmiddle\b(?!\s+lobe\b)/g, 'middle lobe'],
  [/\b[rl]ll\b|\blower\b(?!\s+lobe\b)/g, 'lower lobe'], [/\blingular\b/g, 'lingula'],
  [/\bwedge(?:\s+(?:resection|excision))?\b(?!\s+biopsy)/g, 'wedge resection'], [/\bwedge(?:\s+(?:resection|excision))?\b(?!\s+biopsy)/g, 'wedge excision'],
  [/\bcompletion\b(?!\s+lobectomy)/g, 'completion lobectomy'],
  // Abscess, ulcer and granulation tissue: the requests write the procedure in short or as a verb
  // ("I&D", "incision", "debrided", "punch") and the anal site without "peri". Only the abscess form
  // offers Incision and drainage, Debridement and PERIANAL, so nothing else receives them; Punch biopsy is
  // offered by the abscess and the bone and joint forms, and is a punch biopsy on both.
  [/\bi\s*&\s*d\b|\bi\s+and\s+d\b|\bincision\b(?!\s+(?:and\s+drainage|biopsy))/g, 'incision and drainage'],
  [/\bdebrid(?:ed|ement)\b/g, 'debridement'], [/\bpunch\b(?!\s+biopsy)/g, 'punch biopsy'],
  [/\bperi-?\s?anal\b|(?<![a-z-])\banal\b/g, 'perianal'],
  // Pancreas: the requests name the part of the gland on its own ("Pancreas, tail, distal
  // pancreatectomy", "pancreatic body and tail") where the site options read "Tail of pancreas". Only
  // the pancreatic carcinoma site list offers these, so nothing else receives them.
  [/\bhead\b(?!\s+of\s+(?:the\s+)?pancreas)/g, 'head of pancreas'], [/\bbody\b(?!\s+of\s+(?:the\s+)?pancreas)/g, 'body of pancreas'],
  [/\btail\b(?!\s+of\s+(?:the\s+)?pancreas)/g, 'tail of pancreas'], [/\buncinate\b(?!\s+process)/g, 'uncinate process'],
];

// The gate is a whole-option match rather than a looser test on the first word. Both behave
// identically on all 1048 option lists shipped today, so this is a statement of intent and not a
// fix for an observed case: an option has to BE the expansion to receive it.
function expandAbbrev(text, options) {
  const opts = (options || []).map((o) => siteTokens(o).join(' '));
  let out = String(text || '').toLowerCase();
  for (const [re, to] of SITE_ABBREV) {
    if (!re.test(out)) { re.lastIndex = 0; continue; }
    re.lastIndex = 0;
    const want = siteTokens(to).join(' ');
    if (opts.some((o) => o === want)) out = out.replace(re, to);
    re.lastIndex = 0;
  }
  return out;
}

/**
 * The option whose words all appear in the part text; the longest wins, a tie or an
 * "unspecified"-type option gives nothing. "Ascending colon, biopsy" → "Ascending colon";
 * "antrum" alone → nothing for ["Antrum, greater curvature", "Antrum, lesser curvature"].
 * A house abbreviation is expanded first, but only into an option this field actually offers.
 */
export function matchOption(options, text) {
  const have = new Set(siteTokens(expandAbbrev(text, options)));
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
 * For a multiselect: every option whose words all appear in the part text, less any whose words are
 * all inside a longer match. "Lung, right upper and middle lobes" → ["Upper lobe", "Middle lobe"].
 */
export function matchOptions(options, text) {
  const have = new Set(siteTokens(expandAbbrev(text, options)));
  const hits = (options || [])
    .filter((opt) => !UNSPECIFIC_OPTION.test(opt))
    .map((opt) => ({ opt, toks: siteTokens(opt) }))
    .filter(({ toks }) => toks.length && toks.every((w) => have.has(w)));
  return hits
    .filter((a) => !hits.some((b) => b.toks.length > a.toks.length && a.toks.every((w) => b.toks.includes(w))))
    .map(({ opt }) => opt);
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
  // CNS first: "frontal lobe" would otherwise be caught by the lung test on "lobe". The lobe adjective
  // alone ("left temporal tumour", "fronto-parietal lesion") is how the requests name most CNS sites, but
  // not on a line about the scalp, skin, pleura, peritoneum or a node ("parietal pleura", "occipital node").
  if (/\bbrain\b|cerebell|cerebral|pituitar|sellar|craniotomy|burr hole|meningioma|glioma|schwannoma|intracranial|cerebellopontine|\bcpa\b|(?:frontal|temporal|parietal|occipital)\s+lobe/.test(t)) return 'CNS / pituitary';
  if (/\b(?:frontal|temporal|parietal|occipital)\b(?!\s+(?:bone|sinus|artery|arteries|muscle))|\b(?:fronto|temporo|parieto|occipito)-?(?:frontal|temporal|parietal|occipital)\b/.test(t) && !/scalp|\bskin\b|cutaneous|pleura|peritone|lymph|\bnodes?\b/.test(t)) return 'CNS / pituitary';
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

/**
 * `match.fill`: `{field, from: "detail" | "text" | "options" | "side" | "map", fallback?, strip?, unless?, clock?,
 * noGuess?, scenario?, alone?, history?}` rules (a single object is accepted too). `alone` applies the rule only on a line
 * that `match.alone` reads (see aloneFor). `clock` writes a breast site the house way
 * (see clockSite) and, when the line is not an LIS triple, still takes its clock position and distance from
 * the whole line. `noGuess` empties an options field the line names nothing on, so the form's default site
 * ("Frontal lobe", "Upper lobe") never prints for a request that did not name it. `side` writes the side the
 * line names (see sideFor). `scenario` applies the rule only to a frozen part read as that scenario. On an
 * options rule `strip` drops words before matching: the frozen CNS list offers "Brain" beside "Cerebellum",
 * and without it "Brain, right cerebellar lesion" is a one-word tie that matches neither.
 */
function applyFill(schema, part, values, history = '') {
  const rules = [].concat(schema?.match?.fill || []);
  const field = (id) => (schema?.fields || []).find((f) => f.id === id);
  const text = part.raw || part.text || '';
  for (const rule of rules) {
    const f = field(rule.field);
    if (!f || values[rule.field]) continue;
    if (rule.scenario && values.scenario !== rule.scenario) continue;
    if (rule.alone && !aloneFor(schema.match, text)) continue;
    if (rule.from === 'options') {
      if (!Array.isArray(f.options)) continue;
      const words = rule.strip ? stripWords(text, rule.strip) : text;
      if (f.type === 'multiselect') {
        const opts = matchOptions(f.options, words);
        if (opts.length || rule.noGuess) values[rule.field] = opts;
        continue;
      }
      const opt = matchOption(f.options, words);
      if (opt || rule.noGuess) values[rule.field] = opt;
    } else if (rule.from === 'side') {
      const side = sideFor(f.options, text);
      if (side) values[rule.field] = side;
    } else if (rule.from === 'map') {
      // `map`: [regex source, option] pairs tried in order against the part text; the first that matches
      // names the option. For pick-lists whose option words are not what the request writes ("THR" is a
      // femoral head, "curetting" is bone curettings), where whole-option matching finds nothing. On a
      // text field the mapped word is the value. `noGuess` blanks the field when nothing matches, so a
      // default the request did not state ("lipoma" on a soft tissue excision) is not printed.
      // `history: true` reads the clinical history as well as the line: a skin punch biopsy from a transplant
      // recipient opens on the graft-versus-host pattern when the request says so in the history, which is
      // where it is written ("post allo-HSCT day 30, rash ?GVHD"), not on the specimen line.
      const hay = rule.history ? `${text}\n${history || ''}` : text;
      const hit = (rule.map || []).find(([re]) => new RegExp(re, 'i').test(hay));
      const ok = hit && (Array.isArray(f.options) ? f.options.includes(hit[1]) : true);
      if (ok) values[rule.field] = hit[1];
      else if (rule.noGuess) values[rule.field] = '';
    } else if (f.type === 'text') {
      let v = rule.from === 'detail' ? part.detail : part.text;
      // `fallback` — the LIS triple did not parse ("Prostate biopsy, left apex" has no trailing
      // procedure word), so copy the pasted part itself rather than leaving the field empty. 'site' copies
      // only the first piece of a triple that parsed without a detail ("Right thigh lipoma, excision").
      if (!v && rule.fallback) v = { detail: part.detail, site: part.site }[rule.fallback] ?? part.text;
      // `strip` (regex source) removes the organ and procedure words, then the remainder opens with a
      // capital so the microscopy heading reads "Left apex, 2 cores" whatever the LIS casing was.
      if (v && rule.strip) v = stripWords(v, rule.strip).replace(/^[a-z]/, (c) => c.toUpperCase());
      // `dedupe` — a piece the same as an earlier one, in any case, is dropped: the LIS often lists a site
      // twice ("Right back sebaceous cyst, Right back"), which would otherwise print "right back, Right back".
      if (v && rule.dedupe) {
        const seen = new Set();
        v = v.split(/\s*,\s*/).filter((bit) => !seen.has(bit.toLowerCase()) && seen.add(bit.toLowerCase())).join(', ');
      }
      // `lower` — the value prints mid-heading ("SKIN, left cheek nodule, excision"), so a first word
      // typed with a capital ("Left", "RIght") opens in lower case; a short form in capitals ("L leg",
      // "RLL") keeps its case.
      if (v && rule.lower) v = v.replace(/^[A-Za-z]+/, (w) => (/[a-z]/.test(w) ? w.toLowerCase() : w));
      if (rule.clock) v = v ? clockSite(v) : clockSite(text, { tokensOnly: true });
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
