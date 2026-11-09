// Suggestions box (docs/specs/suggestions-and-roadmap.md). Pure helpers, shared with the tests:
// the Google Form's pre-fill URL, the form-choices summary and the patient-detail check.
//
// The form belongs to the app's owner, so only the owner sees the responses, and colleagues need
// no Drive or Sheet access. The app never submits anything itself: it opens the form pre-filled in
// a new tab and the user presses Submit there.

import { phiWarnings } from './docformat.js';
import { defaultValues, isVisible } from './engine.js';

/**
 * Google Form "Sign-out app — suggestions" (form id 1LFrHIihbJq12zOdsK8W7WxMJZ8CrQskwFvEJoykNZK8,
 * published 2026-09-29). Every question is a text question, so the pre-fill never depends on an
 * option list kept in step with this file. Entry ids were read from the published form; if the form
 * is rebuilt, read them again from its "Get pre-filled link".
 */
export const FORM = {
  url: 'https://docs.google.com/forms/d/e/1FAIpQLSftImbMb7pUyJqJHllZ18P0wTcy5VMRuEBgu3XaU7lvMjP6pA/viewform',
  entries: {
    template: 674902609,
    type: 1125631593,
    where: 1397005955,
    suggestion: 1135536539,
    choices: 1090571533,
    by: 685570690,
    app: 229315778
  }
};

export const SYSTEM_WIDE = 'The whole app (system-wide)';

export const TYPES = ['Error in the output', 'Wording change', 'Missing option or field', 'New template', 'Other'];

export const WHERE = ['Form fields', 'Macroscopy', 'Microscopy', 'Diagnosis', 'Comment', 'Intake', 'Layout or navigation'];

/** Longest text each answer carries; the pre-fill URL stays well inside what Google accepts. */
export const LIMITS = { suggestion: 3000, choices: 1500, short: 300 };

// Beyond docformat's HKID, honorific, phone and date-of-birth rules: an accession or hospital
// number shape (S25-01234, HS26-012345, HN12345678, an HKID written without its bracketed check
// digit) and any run of seven or more digits.
const ACCESSION = /\b[A-Z]{1,3}\s?\d{2}\s?[-/]?\s?\d{4,6}\b/i;
const LONG_NUMBER = /\d{7,}/;

/** Reasons the suggestion text looks like it carries patient details; empty when it does not. */
export function suggestionWarnings(text) {
  const t = String(text || '');
  const out = phiWarnings({ text: t }).map((w) => w.replace(/^text: /, ''));
  if (ACCESSION.test(t)) out.push('looks like an accession or hospital number');
  else if (LONG_NUMBER.test(t)) out.push('contains a long number');
  return [...new Set(out)];
}

const CHOICE = new Set(['select', 'multiselect', 'checkbox', 'grade']);

/** Every value a field's own option lists allow (plain lists, grouped lists and `optionsByField`). */
function staticOptions(field) {
  const set = new Set();
  const add = (o) => {
    if (typeof o === 'string') set.add(o);
    else if (o && typeof o === 'object') {
      if (Array.isArray(o.options)) o.options.forEach(add);
      else if ('value' in o) set.add(String(o.value));
    }
  };
  (field.options || []).forEach(add);
  const dep = field.optionsByField;
  if (dep && dep.map) for (const list of Object.values(dep.map)) (list || []).forEach(add);
  return set;
}

/**
 * The part's choice fields that differ from the template default, one "Label [id]: value" line
 * each. Only dropdowns, tick boxes, multi-choice chips and grades are read, and a value is
 * printed only when it is on the field's own option list — so free text, numbers, the specimen
 * line and report text can never reach the form, even if a value was set some other way.
 */
export function choiceSummary(schema, values, index = 0) {
  const vals = values || {};
  const defaults = defaultValues(schema, index);
  const lines = [];
  for (const f of schema.fields || []) {
    if (!CHOICE.has(f.type) || !isVisible(f, vals)) continue;
    const label = `${f.label || f.id} [${f.id}]`;
    const v = vals[f.id];
    const d = defaults[f.id];
    if (f.type === 'checkbox') {
      if (!!v !== !!d) lines.push(`${label}: ${v ? 'yes' : 'no'}`);
      continue;
    }
    const opts = staticOptions(f);
    if (f.type === 'multiselect') {
      const picked = (Array.isArray(v) ? v : []).filter((x) => opts.has(x));
      const was = Array.isArray(d) ? d : [];
      if (picked.length === was.length && picked.every((x) => was.includes(x))) continue;
      lines.push(`${label}: ${picked.length ? picked.join(', ') : 'none'}`);
      continue;
    }
    if (v === d || !opts.has(v)) continue;
    lines.push(`${label}: ${v}`);
  }
  return lines.join('\n');
}

/**
 * Build id → "YYYY-MM-DD" where the id carries a date; '' otherwise, and never an error. Builds
 * before Phase 79 stamped base-36 milliseconds; since then tools/build-lib.js stamps a 12-character
 * content hash, which carries no date (reading one from it threw "Invalid time value").
 */
export function buildDate(build) {
  const s = String(build || '');
  if (!/^[0-9a-z]{1,10}$/.test(s)) return '';
  const d = new Date(parseInt(s, 36));
  const year = d.getUTCFullYear(); // NaN for an invalid date
  return year >= 2020 && year < 2100 ? d.toISOString().slice(0, 10) : '';
}

/** The "App details" answer: build, template and version, and the layout it was sent from. */
export function appDetails({ build = '', templateId = '', version = '', layout = '' } = {}) {
  const date = buildDate(build);
  const parts = [!build ? 'Build: source checkout' : date ? `Build ${date} (${build})` : `Build ${build}`];
  if (templateId) parts.push(`${templateId}${version ? ` v${version}` : ''}`);
  if (layout) parts.push(layout);
  return parts.join(' · ');
}

/** The pre-filled form URL. Blank answers are left out; spaces are %20, never "+". */
export function prefillUrl(answers, form = FORM) {
  const a = answers || {};
  const q = new URLSearchParams({ usp: 'pp_url' });
  const put = (key, value, max) => {
    const s = String(value ?? '').trim();
    if (s) q.append(`entry.${form.entries[key]}`, s.slice(0, max));
  };
  put('template', a.template, LIMITS.short);
  put('type', a.type, LIMITS.short);
  put('where', Array.isArray(a.where) ? a.where.join(', ') : a.where, LIMITS.short);
  put('suggestion', a.suggestion, LIMITS.suggestion);
  put('choices', a.choices, LIMITS.choices);
  put('by', a.by, LIMITS.short);
  put('app', a.app, LIMITS.short);
  return `${form.url}?${q.toString().replace(/\+/g, '%20')}`;
}
