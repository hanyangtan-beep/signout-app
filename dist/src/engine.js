// Generic schema engine: builds part defaults, evaluates visibility, and assembles
// the report from a schema + generator module. Runs unchanged in the browser and in Node.

import { applyStyle } from './style.js?v=mtux8we2';

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const HEADERS = {
  specimens: 'SPECIMEN:',
  macro: 'MACROSCOPIC DESCRIPTION:',
  intraop: 'INTRAOPERATIVE CONSULTATION:',
  microscopy: 'MICROSCOPIC EXAMINATION:',
  diagnosis: 'DIAGNOSIS:',
  comment: 'COMMENT:'
};

/** Block order in the assembled report. `macro` and `intraop` only appear for templates with those hooks; `comment` only when a snippet or free-text comment is active. */
export const BLOCK_ORDER = ['specimens', 'macro', 'intraop', 'microscopy', 'diagnosis', 'comment'];

/** Default values for one part. `index` is 0-based. */
export function defaultValues(schema, index = 0) {
  const values = {};
  for (const f of schema.fields) {
    let v = f.default ?? (f.type === 'checkbox' ? false : '');
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

/** Re-letter parts A, B, C… after add/remove. */
export function relabel(parts) {
  parts.forEach((p, i) => { p.label = LETTERS[i]; });
  return parts;
}

/** Evaluate a `showIf` rule against the part values. */
export function isVisible(field, values) {
  const rule = field.showIf;
  if (!rule) return true;
  const v = values[rule.field];
  if ('is' in rule) return Array.isArray(rule.is) ? rule.is.includes(v) : v === rule.is;
  if ('not' in rule) return Array.isArray(rule.not) ? !rule.not.includes(v) : v !== rule.not;
  if ('truthy' in rule) return !!v === !!rule.truthy;
  return true;
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
    const own = caseState.parts.filter((p) => templateIdOf(caseState, p) === id);
    for (const sn of t.schema.snippets || []) {
      if (out.some((o) => o.id === sn.id)) continue;
      const matched = sn.auto ? own.filter((p) => matches(sn.auto, normalisePart(t.schema, p).values)).map((p) => p.label) : [];
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
  return present.map((k) => `${HEADERS[k]}\n${blocks[k]}`).join('\n\n');
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
  const parts = caseState.parts.map((p) => {
    const id = templateIdOf(caseState, p);
    return normalisePart(templates[id].schema, { label: p.label, templateId: id, values: { ...p.values } });
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
    specimens = parts.map((p) => styled(p.templateId, `(${p.label}) ${ctxs[p.templateId].gen.specimenName(p, ctxs[p.templateId])}`)).join('\n');
  }
  // Optional per-part macroscopic description (frozen sections) and per-template intraoperative block.
  const macro = parts.filter((p) => ctxs[p.templateId].gen.macro)
    .map((p) => styled(p.templateId, ctxs[p.templateId].gen.macro(p, ctxs[p.templateId]))).filter((t) => t && t.trim() !== '').join('\n\n');
  const intraop = ids.filter((id) => ctxs[id].gen.intraop)
    .map((id) => styled(id, ctxs[id].gen.intraop(ctxs[id].parts, ctxs[id]))).filter((t) => t && t.trim() !== '').join('\n\n');
  const microscopy = parts.map((p) => styled(p.templateId, ctxs[p.templateId].gen.microscopy(p, ctxs[p.templateId]))).join('\n\n');
  let diagnosis = parts.map((p) => styled(p.templateId, ctxs[p.templateId].gen.diagnosis(p, ctxs[p.templateId]))).join('\n');
  for (const id of ids) {
    const ctx = ctxs[id];
    if (!ctx.gen.summary) continue;
    const summary = ctx.gen.summary(ctx.parts, ctx);
    if (summary && summary.trim() !== '') diagnosis += `\n\n${styled(id, summary)}`;
  }

  const single = parts.length === 1 && !templates[ids[0]].schema.alwaysLetter && !options.alwaysLetter;
  const letters = (text) => (single ? dropPartLetters(text, parts[0].label) : text);
  const comment = [
    ...snippetsFor(templates, caseState).filter((sn) => sn.active).map((sn) => styled(sn.templateId, renderSnippet(sn, single))),
    (caseState.comment || '').trim()
  ].filter((t) => t && t.trim() !== '').join('\n\n');
  const blocks = {
    specimens: tidy(letters(specimens)),
    macro: tidy(letters(macro)),
    intraop: tidy(letters(intraop)),
    microscopy: tidy(letters(microscopy)),
    diagnosis: tidy(letters(diagnosis)),
    comment: tidy(comment)
  };
  return { ...blocks, report: assemble(blocks, !!options.includeHeader) };
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
