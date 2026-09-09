// Generic schema engine: builds part defaults, evaluates visibility, and assembles
// the report from a schema + generator module. Runs unchanged in the browser and in Node.

import { applyStyle } from './style.js?v=mtu867k5';

export const LETTERS = 'ABCDEFGHIJ'.split('');

export const HEADERS = {
  specimens: 'SPECIMEN:',
  microscopy: 'MICROSCOPIC EXAMINATION:',
  diagnosis: 'DIAGNOSIS:'
};

/** Default values for one part. `index` is 0-based. */
export function defaultValues(schema, index = 0) {
  const values = {};
  for (const f of schema.fields) {
    let v = f.default ?? (f.type === 'checkbox' ? false : '');
    if (index === 0 && f.defaultForFirstPart !== undefined) v = f.defaultForFirstPart;
    values[f.id] = v;
  }
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

/** A fresh case for a schema with `n` parts. */
export function createCase(schema, n = 1) {
  const parts = [];
  for (let i = 0; i < Math.min(n, schema.maxParts || 10); i++) parts.push(createPart(schema, i));
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

export function assemble(blocks, includeHeader) {
  const order = ['specimens', 'microscopy', 'diagnosis'];
  const present = order.filter((k) => blocks[k] && blocks[k].trim() !== '');
  if (!includeHeader) return present.map((k) => blocks[k]).join('\n\n');
  return present.map((k) => `${HEADERS[k]}\n${blocks[k]}`).join('\n\n');
}

/**
 * Generate all output blocks for a case.
 * @returns {{specimens: string, microscopy: string, diagnosis: string, report: string}}
 */
export function generate(schema, gen, caseState) {
  const parts = caseState.parts.map((p) => normalisePart(schema, { label: p.label, values: { ...p.values } }));
  const options = { ...defaultOptions(schema), ...(caseState.options || {}) };
  const ctx = { schema, case: caseState, options, parts, prepared: {} };
  if (gen.prepare) ctx.prepared = gen.prepare(caseState, ctx) || {};
  const style = schema.style || {};

  const specimens = gen.specimens
    ? gen.specimens(parts, ctx)
    : parts.map((p) => `(${p.label}) ${gen.specimenName(p, ctx)}`).join('\n');
  const microscopy = parts.map((p) => gen.microscopy(p, ctx)).join('\n\n');
  const diagnosis = parts.map((p) => gen.diagnosis(p, ctx)).join('\n');

  const blocks = {
    specimens: applyStyle(specimens, style),
    microscopy: applyStyle(microscopy, style),
    diagnosis: applyStyle(diagnosis, style)
  };
  return { ...blocks, report: assemble(blocks, !!options.includeHeader) };
}
