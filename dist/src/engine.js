// Generic schema engine: builds part defaults, evaluates visibility, and assembles
// the report from a schema + generator module. Runs unchanged in the browser and in Node.

import { applyStyle } from './style.js?v=mu10wmri';

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const HEADERS = {
  specimens: 'SPECIMEN:',
  macro: 'MACROSCOPIC DESCRIPTION:',
  blockKey: 'BLOCK KEY:',
  intraop: 'INTRAOPERATIVE CONSULTATION:',
  microscopy: 'MICROSCOPIC EXAMINATION:',
  synoptic: 'MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:',
  diagnosis: 'DIAGNOSIS:',
  comment: 'COMMENT:'
};

/**
 * Block order in the assembled report. `macro` and `intraop` only appear for templates with
 * those hooks; `comment` only when a snippet or free-text comment is active. Synoptic text is
 * not a block of its own: it prints inside `microscopy`, part by part in case order, under the
 * heading MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT whenever any part is synoptic
 * (`out.microscopyHeading`). `out.synoptic` still exposes the synoptic text alone.
 */
export const BLOCK_ORDER = ['specimens', 'macro', 'blockKey', 'intraop', 'microscopy', 'diagnosis', 'comment'];

/** Default values for one part. `index` is 0-based. */
export function defaultValues(schema, index = 0) {
  const values = {};
  for (const f of schema.fields) {
    let v = f.default ?? (f.type === 'checkbox' ? false : f.type === 'multiselect' ? [] : '');
    if (Array.isArray(v)) v = [...v];
    if (index === 0 && f.defaultForFirstPart !== undefined) v = f.defaultForFirstPart;
    values[f.id] = v;
  }
  // Per-position defaults (e.g. an IBD site series or a 12-core prostate map).
  const pd = schema.partDefaults && schema.partDefaults[index];
  if (pd) Object.assign(values, pd);
  return values;
}

export function createPart(schema, index) {
  return { label: LETTERS[index], values: defaultValues(schema, index) };
}

export function defaultOptions(schema) {
  const o = {};
  for (const opt of schema.options || []) o[opt.id] = opt.default ?? false;
  return o;
}

/** A fresh case for a schema with `n` parts (default: the schema's `defaultParts`, else 1). */
export function createCase(schema, n) {
  const count = n ?? schema.defaultParts ?? 1;
  const parts = [];
  for (let i = 0; i < Math.min(count, schema.maxParts || 10); i++) parts.push(createPart(schema, i));
  return { schemaId: schema.id, schemaVersion: schema.version, caseTitle: '', options: defaultOptions(schema), parts };
}

/**
 * Re-letter parts A, B, C… after add/remove. A part flagged `linked: true` (a synoptic part added
 * under a frozen part with "Stage this part") takes the letter of the part before it instead of
 * advancing the sequence, so the frozen and the synoptic share one specimen letter.
 */
export function relabel(parts) {
  let i = 0;
  parts.forEach((p, k) => {
    if (p.linked && k > 0) p.label = parts[k - 1].label;
    else p.label = LETTERS[i++];
  });
  return parts;
}

/** Number of distinct specimen letters in a case (linked pairs count once). */
export const letterCount = (parts) => new Set(parts.map((p) => p.label)).size;

/**
 * Evaluate a `showIf` rule against the part values. Rules: `is` / `not` (a value or a
 * list of values), `truthy`, and for multiselect fields `min` / `max` (number of ticked
 * options). When the referenced field is a multiselect (its value is an array), `is`
 * means "contains any of" and `not` means "contains none of".
 */
export function isVisible(field, values) {
  const rule = field.showIf;
  if (!rule) return true;
  const v = values[rule.field];
  if (Array.isArray(v)) {
    const want = (x) => (Array.isArray(x) ? x : [x]);
    if ('is' in rule && !want(rule.is).some((x) => v.includes(x))) return false;
    if ('not' in rule && want(rule.not).some((x) => v.includes(x))) return false;
    if ('truthy' in rule && (v.length > 0) !== !!rule.truthy) return false;
    if ('min' in rule && v.length < rule.min) return false;
    if ('max' in rule && v.length > rule.max) return false;
    return true;
  }
  if ('is' in rule) return Array.isArray(rule.is) ? rule.is.includes(v) : v === rule.is;
  if ('not' in rule) return Array.isArray(rule.not) ? !rule.not.includes(v) : v !== rule.not;
  if ('truthy' in rule) return !!v === !!rule.truthy;
  // Numeric fields: `min` / `max` compare the typed value (blank never matches).
  if ('min' in rule || 'max' in rule) {
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return false;
    if ('min' in rule && n < rule.min) return false;
    if ('max' in rule && n > rule.max) return false;
  }
  return true;
}

/**
 * Toggle one option of a multiselect field and return the new array. Options listed in
 * `field.exclusive` clear everything else when ticked and are cleared when anything
 * else is ticked (e.g. "Invasive mucinous" among the lung adenocarcinoma patterns).
 * Order follows the field's option list so generated prose is stable.
 */
export function toggleOption(field, current, option) {
  const cur = Array.isArray(current) ? current : [];
  const exclusive = field.exclusive || [];
  let next;
  if (cur.includes(option)) next = cur.filter((x) => x !== option);
  else if (exclusive.includes(option)) next = [option];
  else next = [...cur.filter((x) => !exclusive.includes(x)), option];
  const order = field.options || [];
  return next.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** Human list: "lepidic and acinar", "lepidic, acinar and solid". */
export function joinList(items, conj = 'and') {
  const a = items.filter((x) => x !== undefined && x !== null && x !== '');
  if (a.length === 0) return '';
  if (a.length === 1) return a[0];
  return `${a.slice(0, -1).join(', ')} ${conj} ${a[a.length - 1]}`;
}

/**
 * Case presets (`schema.presets[]`): a named set of parts, e.g. the Sydney five-site
 * gastric mapping. Returns a fresh case for the schema whose parts carry the preset's
 * values over the defaults, with `caseTitle` set when the preset provides one.
 */
export function applyPreset(schema, preset) {
  const c = createCase(schema, preset.parts.length);
  preset.parts.forEach((pp, i) => { Object.assign(c.parts[i].values, pp.values || {}); });
  if (preset.caseTitle) c.caseTitle = preset.caseTitle;
  return c;
}

/** Evaluate a bare condition (`{field, is|not|truthy}`) against part values. */
export function matches(rule, values) { return isVisible({ showIf: rule }, values); }

const partList = (labels) => {
  if (labels.length === 0) return '';
  if (labels.length === 1) return `part ${labels[0]}`;
  return `parts ${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
};

/**
 * Snippets available to a case: every `schema.snippets[]` entry of every template in
 * use, tagged with the template id, whether its `auto` rule matches any of that
 * template's parts (`suggested`), the matching part labels, and whether it is active.
 * A snippet is active when the user ticked it (`caseState.snippets[id] === true`) or
 * when it is suggested and the user has not unticked it (`!== false`).
 */
export function snippetsFor(templates, caseState) {
  const chosen = caseState.snippets || {};
  const out = [];
  for (const id of templatesInUse(caseState)) {
    const t = templates[id];
    if (!t) continue;
    const own = caseState.parts.filter((p) => templateIdOf(caseState, p) === id)
      .map((p) => normalisePart(t.schema, { label: p.label, templateId: id, values: { ...p.values } }));
    // Case-level flags from the generator (e.g. an OLGA stage) drive `auto: {flag}` rules.
    const flags = t.generator && t.generator.flags ? t.generator.flags(own, { schema: t.schema, case: caseState }) || [] : [];
    for (const sn of t.schema.snippets || []) {
      if (out.some((o) => o.id === sn.id)) continue;
      let matched = [];
      if (sn.auto && 'flag' in sn.auto) matched = flags.includes(sn.auto.flag) ? own.map((p) => p.label) : [];
      else if (sn.auto) matched = own.filter((p) => matches(sn.auto, p.values)).map((p) => p.label);
      const suggested = matched.length > 0;
      const active = chosen[sn.id] === true || (suggested && chosen[sn.id] !== false);
      out.push({ ...sn, templateId: id, suggested, matchedParts: matched, active });
    }
  }
  return out;
}

/** Fill `{parts}` in a snippet's text with "part A" / "parts A and C" (single-part cases drop the reference). */
export function renderSnippet(snippet, single) {
  const labels = snippet.matchedParts || [];
  let text = snippet.text;
  if (single || labels.length === 0) {
    text = text.replace(/\s*\(\{parts\}\)/g, '').replace(/\s+in \{parts\}/g, '').replace(/\{parts\}/g, 'this specimen');
  } else {
    text = text.replace(/\{parts\}/g, partList(labels));
  }
  return text;
}

/** Options for a field, honouring `optionsByField` (e.g. dysplasia grades allowed for a polyp type). */
export function optionsFor(field, values) {
  const dep = field.optionsByField;
  if (dep && dep.map[values[dep.field]]) return dep.map[values[dep.field]];
  return field.options || [];
}

/** Coerce a value to something in the allowed option list (first option if not). */
export function coerceValue(field, values) {
  if (!field.options) return values[field.id];
  const opts = optionsFor(field, values);
  return opts.includes(values[field.id]) ? values[field.id] : opts[0];
}

/** Normalise all dependent fields in a part after an edit. */
export function normalisePart(schema, part) {
  for (const f of schema.fields) {
    if (f.optionsByField) part.values[f.id] = coerceValue(f, part.values);
  }
  return part;
}

/**
 * Single-part rule: a case with one part is written without part letters.
 * "(A) STOMACH, antrum, biopsy - ..." becomes "STOMACH, antrum, biopsy - ...", and a
 * microscopy heading line that is only "(A)" disappears. Letters return automatically
 * once a second part exists. Opt out per schema (`alwaysLetter: true`) or per case
 * (`options.alwaysLetter`).
 */
export function dropPartLetters(text, label = 'A') {
  const re = new RegExp(`^\\(${label}\\)[ \\t]*`);
  const out = [];
  for (const line of String(text ?? '').split('\n')) {
    if (!re.test(line)) { out.push(line); continue; }
    const rest = line.replace(re, '');
    if (rest !== '') out.push(rest); // a bare "(A)" heading line is removed entirely
  }
  return out.join('\n');
}

export function assemble(blocks, includeHeader) {
  const present = BLOCK_ORDER.filter((k) => blocks[k] && blocks[k].trim() !== '');
  if (!includeHeader) return present.map((k) => blocks[k]).join('\n\n');
  const header = (k) => (k === 'microscopy' && blocks.microscopyHeading ? `${blocks.microscopyHeading}:` : HEADERS[k]);
  return present.map((k) => `${header(k)}\n${blocks[k]}`).join('\n\n');
}

/** Template id of a part: its own `templateId`, else the case default. */
export function templateIdOf(caseState, part) {
  return part.templateId || caseState.schemaId;
}

/** Distinct template ids used by a case, in order of first appearance. */
export function templatesInUse(caseState) {
  const ids = [];
  for (const p of caseState.parts) {
    const id = templateIdOf(caseState, p);
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** "gastric_biopsy+colonic_polyp" — the value stored in the Sheet's template column. */
export function templateLabel(caseState) {
  return templatesInUse(caseState).join('+');
}

/**
 * Generate all output blocks for a case whose parts may use different templates
 * (e.g. A gastric, B gastric, C colonic polyp). `templates` is the registry:
 * `{ [id]: { schema, generator } }`.
 *
 * Parts keep their case order in every block. Case-level hooks (`prepare`,
 * `specimens`, `summary`) run once per template over that template's parts;
 * `specimens` is only honoured when the whole case uses one template, since it
 * may rewrite the specimen list from the case title.
 * @returns {{specimens: string, microscopy: string, diagnosis: string, comment: string, report: string}}
 */
export function generateCase(templates, caseState) {
  const ids = templatesInUse(caseState);
  for (const id of ids) if (!templates[id]) throw new Error(`Template ${id} is not installed`);

  const options = {};
  for (const id of ids) Object.assign(options, defaultOptions(templates[id].schema));
  Object.assign(options, caseState.options || {});

  // Normalised parts in case order, each tagged with its template.
  const parts = caseState.parts.map((p, k) => {
    const id = templateIdOf(caseState, p);
    return normalisePart(templates[id].schema, { label: p.label, templateId: id, linked: !!p.linked && k > 0, values: { ...p.values } });
  });

  // One context per template, holding only that template's parts.
  const ctxs = {};
  for (const id of ids) {
    const { schema, generator: gen } = templates[id];
    const own = parts.filter((p) => p.templateId === id);
    const ctx = { schema, gen, case: caseState, options, parts: own, prepared: {} };
    if (gen.prepare) ctx.prepared = gen.prepare(caseState, ctx) || {};
    ctxs[id] = ctx;
  }
  const styled = (id, text) => applyStyle(text, templates[id].schema.style || {});

  let specimens;
  if (ids.length === 1 && ctxs[ids[0]].gen.specimens) {
    specimens = styled(ids[0], ctxs[ids[0]].gen.specimens(parts, ctxs[ids[0]]));
  } else {
    // A linked synoptic part shares its letter with the frozen part before it: the frozen part names
    // the specimen; the synoptic only contributes the extra letters typed into its `otherParts`.
    const lines = [];
    for (const p of parts) {
      const g = ctxs[p.templateId].gen;
      if (p.linked) { if (typeof g.otherSpecimenLines === 'function') lines.push(...g.otherSpecimenLines(p, ctxs[p.templateId]).map((l) => styled(p.templateId, l))); continue; }
      lines.push(styled(p.templateId, `(${p.label}) ${g.specimenName(p, ctxs[p.templateId])}`));
    }
    specimens = lines.join('\n');
  }
  // Optional per-part macroscopic description (frozen sections) and per-template intraoperative block.
  // A linked synoptic part's macro additions join the frozen part's paragraph (same letter, same specimen).
  const macroParas = [];
  for (const p of parts) {
    const g = ctxs[p.templateId].gen;
    if (!g.macro) continue;
    const t = styled(p.templateId, g.macro(p, ctxs[p.templateId]));
    if (!t || t.trim() === '') continue;
    if (p.linked && macroParas.length) macroParas[macroParas.length - 1] += ` ${t.replace(new RegExp(`^\\(${p.label}\\)[ \\t]*`), '')}`;
    else macroParas.push(t);
  }
  const macro = macroParas.join('\n\n');
  // Optional per-part block key (benign resections): "(A1) Cystic duct margin." lines.
  const blockKey = parts.filter((p) => ctxs[p.templateId].gen.blockKey)
    .map((p) => styled(p.templateId, ctxs[p.templateId].gen.blockKey(p, ctxs[p.templateId]))).filter((t) => t && t.trim() !== '').join('\n');
  const intraop = ids.filter((id) => ctxs[id].gen.intraop)
    .map((id) => styled(id, ctxs[id].gen.intraop(ctxs[id].parts, ctxs[id]))).filter((t) => t && t.trim() !== '').join('\n\n');
  // One microscopy block, parts in case order. Cancer templates with a `synoptic` hook print
  // their sectioned QMH element list (tumour histology included) in place of a narrative
  // paragraph (docs/specs/synoptic-layout.md); the heading says so when any part is synoptic.
  const perPart = (p) => { const c = ctxs[p.templateId]; return styled(p.templateId, c.gen.synoptic ? c.gen.synoptic(p, c) : c.gen.microscopy(p, c)); };
  const microscopy = parts.map(perPart).filter((t) => t && t.trim() !== '').join('\n\n');
  const hasSynoptic = parts.some((p) => ctxs[p.templateId].gen.synoptic);
  const synoptic = parts.filter((p) => ctxs[p.templateId].gen.synoptic).map(perPart).filter((t) => t && t.trim() !== '').join('\n\n');
  // Validation issues (`{level: 'error'|'warn', message}`) from templates with a `validate` hook.
  const issues = [];
  for (const p of parts) {
    const g = ctxs[p.templateId].gen;
    if (!g.validate) continue;
    for (const it of g.validate(p, ctxs[p.templateId]) || []) issues.push({ ...it, part: p.label });
  }
  // Multi-line diagnoses (synoptic templates: specimen line + "- " clauses) get a blank line between parts.
  // A linked pair prints one diagnosis for its letter: the synoptic's clauses under the frozen part's
  // specimen phrase ("… x frozen section"), the frozen part's own line being dropped.
  const diagnoses = [];
  parts.forEach((p, k) => {
    if (parts[k + 1]?.linked) return;
    let text = styled(p.templateId, ctxs[p.templateId].gen.diagnosis(p, ctxs[p.templateId]));
    if (p.linked) {
      const prev = parts[k - 1];
      const pg = ctxs[prev.templateId].gen;
      if (typeof pg.organPhrase === 'function') text = text.replace(/^[^\n]*/, `(${p.label}) ${pg.organPhrase(prev, ctxs[prev.templateId])}`);
    }
    diagnoses.push(text);
  });
  let diagnosis = diagnoses.join(diagnoses.some((d) => d.includes('\n')) ? '\n\n' : '\n');
  for (const id of ids) {
    const ctx = ctxs[id];
    if (!ctx.gen.summary) continue;
    const summary = ctx.gen.summary(ctx.parts, ctx);
    if (summary && summary.trim() !== '') diagnosis += `\n\n${styled(id, summary)}`;
  }

  // A generator may print its own extra per-letter lines (ovary: contralateral adnexa, omentum, nodes
  // typed into `otherParts`); the case then behaves as multi-part and keeps "(A)".
  const extraParts = parts.some((p) => typeof ctxs[p.templateId].gen.hasExtraParts === 'function' && ctxs[p.templateId].gen.hasExtraParts(p));
  const single = letterCount(parts) === 1 && !extraParts && !ids.some((id) => templates[id].schema.alwaysLetter) && !options.alwaysLetter;
  const letters = (text) => (single ? dropPartLetters(text, parts[0].label) : text);
  // Generators may add a case-level comment (`comment(parts, ctx)`: e.g. the completion-resection
  // staging sentence); it prints before the snippets and the typed comment.
  const genComments = ids.map((id) => (ctxs[id].gen.comment ? styled(id, ctxs[id].gen.comment(ctxs[id].parts, ctxs[id]) || '') : ''));
  const comment = [
    ...genComments,
    ...snippetsFor(templates, caseState).filter((sn) => sn.active).map((sn) => styled(sn.templateId, renderSnippet(sn, single))),
    (caseState.comment || '').trim()
  ].filter((t) => t && t.trim() !== '').join('\n\n');
  const blocks = {
    specimens: tidy(letters(specimens)),
    macro: tidy(letters(macro)),
    blockKey: tidy(letters(blockKey)),
    intraop: tidy(letters(intraop)),
    microscopy: tidy(letters(microscopy)),
    diagnosis: tidy(letters(diagnosis)),
    comment: tidy(comment),
    microscopyHeading: hasSynoptic ? HEADERS.synoptic.slice(0, -1) : HEADERS.microscopy.slice(0, -1)
  };
  // Text pasted from the LIS (case meta) either replaces the generated macro / block key
  // (explicit toggle) or is appended after it. Typed text is printed verbatim.
  const source = {};
  for (const [key, toggle, sep] of [['macro', 'useLisMacro', '\n\n'], ['blockKey', 'useLisBlockKey', '\n']]) {
    const r = mergeLis(blocks[key], caseState.meta?.[key], !!caseState.meta?.[toggle], sep);
    blocks[key] = r.text;
    source[key] = r.source;
  }
  // Per-block manual edits made in the report preview (`caseState.edits[block] = text`)
  // replace the generated (or LIS) text verbatim. `generated` keeps the pre-edit text for Revert.
  const generated = { ...blocks };
  const edited = {};
  for (const key of BLOCK_ORDER) {
    const e = caseState.edits?.[key];
    if (typeof e !== 'string') continue;
    blocks[key] = e.trim();
    edited[key] = true;
    source[key] = 'edited';
  }
  return { ...blocks, synoptic: tidy(letters(synoptic)), issues, source, edited, generated, report: assemble(blocks, !!options.includeHeader) };
}

/**
 * Combine a generated block with text typed in the case panel.
 * `source` says what is printing: `generated`, `typed` (nothing generated), `merged`
 * (generated then typed, the legacy behaviour) or `lis` (typed replaces generated).
 * The toggle with nothing typed falls back to the generated text.
 */
export function mergeLis(generated, typed, override, sep = '\n\n') {
  const g = (generated || '').trim();
  const t = (typed || '').trim();
  if (!t) return { text: g, source: g ? 'generated' : 'none' };
  if (override) return { text: t, source: 'lis' };
  if (!g) return { text: t, source: 'typed' };
  return { text: `${g}${sep}${t}`, source: 'merged' };
}

function tidy(text) { return applyStyle(text, {}); }

/**
 * Generate all output blocks for a single-template case (legacy entry point; the
 * fixtures and the per-template tests use it). Every part is forced onto `schema`.
 * @returns {{specimens: string, microscopy: string, diagnosis: string, report: string}}
 */
export function generate(schema, gen, caseState) {
  const cs = { ...caseState, schemaId: schema.id, parts: caseState.parts.map((p) => ({ ...p, templateId: schema.id })) };
  return generateCase({ [schema.id]: { schema, generator: gen } }, cs);
}
