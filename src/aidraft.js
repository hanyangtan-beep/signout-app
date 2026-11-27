// AI-assisted shorthand-to-report drafting (Generic parts) and shorthand-to-form autofill
// (any structured template) via Vertex AI (gemini-3.8-flash).
//
// Pure functions:
// 1. Generic parts: expands consultant shorthand into British-English, LIS-ready Microscopy and
//    Diagnosis text following HOUSE_STYLE, without inventing unstated findings.
// 2. Structured templates: maps consultant shorthand/dictated findings straight into schema-vetted
//    histology, margin, staging, and IHC fields (with linked defaults, derived fields, and Undo).

import { optionsFor, applyLinkedDefaults, applyDerived, normalisePart } from './engine.js';
import { HOUSE_STYLE } from './proofread.js';
import { britishise, toAscii, houseConnectors } from './style.js';

const MAX_PROMPT_CHARS = 36000;
const MAX_FORM_FIELDS = 90;

export const DRAFT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    specimenName: { type: 'STRING' },
    microscopy: { type: 'STRING' },
    diagnosis: { type: 'STRING' },
    comment: { type: 'STRING' }
  },
  required: ['microscopy', 'diagnosis']
};

export const DRAFT_SYSTEM_PROMPT = [
  'You draft surgical pathology report text for a consultant histopathologist from rough shorthand notes.',
  'The output goes into Han Sign-out\'s Generic (free text) template and will be pasted as plain text into a laboratory information system (LIS).',
  '',
  'House style:',
  ...HOUSE_STYLE.map((r) => `- ${r}`),
  '',
  'Strict clinical rules:',
  '- Expand ONLY facts explicitly stated in [SHORTHAND], [SPECIMEN], [CLINICAL HISTORY], or [MACROSCOPIC].',
  '- NEVER invent measurements, margin distances, grades, stages, IHC results, or negative findings (such as "no LVI" or "margins clear") unless explicitly mentioned in the input.',
  '- "specimenName": concise "Organ, side/site, procedure" (e.g. "Buccal mucosa, right, excision"). Leave empty "" if the existing specimen name is already complete.',
  '- "microscopy": fluent, concise consultant histopathologist prose opening with "Sections show ...". Keep immunohistochemistry inside this paragraph. Do NOT include a part letter like "(A)".',
  '- "diagnosis": ONLY the diagnostic phrase(s) (e.g. "MODERATELY DIFFERENTIATED SQUAMOUS CELL CARCINOMA"). Do NOT repeat the part letter or specimen name — the app prepends "ORGAN, site, procedure - " automatically.',
  '- "comment": leave empty "" unless [SHORTHAND] explicitly asks for a comment, clinical correlation, or pending stain note.',
  '- Reply with one JSON object matching the schema only.'
].join('\n');

/** Build the drafting prompt from shorthand + case context. Returns { system, prompt } or { error }. */
export function buildDraftPrompt({ shorthand = '', part, specimen = '', clinical = '', macro = '' } = {}) {
  const notes = String(shorthand || '').trim();
  if (!notes) return { error: 'Type or paste shorthand findings first.' };

  const lines = [
    'TASK: draft',
    `Draft the Generic (free text) report fields for Part ${part?.label || 'A'} from the consultant's shorthand notes.`,
    ''
  ];
  const curSpec = String(part?.values?.specimenName || '').trim();
  if (curSpec) lines.push('[CURRENT SPECIMEN FIELD]', curSpec, '');
  const sp = String(specimen || '').trim();
  if (sp) lines.push('[SPECIMEN]', sp, '');
  const cl = String(clinical || '').trim();
  if (cl) lines.push('[CLINICAL HISTORY]', cl, '');
  const ma = String(macro || '').trim();
  if (ma) lines.push('[MACROSCOPIC]', ma, '');
  lines.push('[SHORTHAND]', notes, '', 'Reply with the JSON object only.');

  const prompt = lines.join('\n');
  if (prompt.length > MAX_PROMPT_CHARS) {
    return { error: `The input is too long to draft (${prompt.length} characters).` };
  }
  return { system: DRAFT_SYSTEM_PROMPT, prompt };
}

/** Parse JSON draft reply; returns { specimenName, microscopy, diagnosis, comment, readable }. */
export function parseDraftReply(text) {
  const raw = String(text ?? '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```(?:json)?/g, '')
    .replace(/,\s*([}\]])/g, '$1');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(raw.slice(start, end + 1));
      if (obj && (typeof obj.microscopy === 'string' || typeof obj.diagnosis === 'string')) {
        return {
          specimenName: typeof obj.specimenName === 'string' ? obj.specimenName.trim() : '',
          microscopy: typeof obj.microscopy === 'string' ? obj.microscopy.trim() : '',
          diagnosis: typeof obj.diagnosis === 'string' ? obj.diagnosis.trim() : '',
          comment: typeof obj.comment === 'string' ? obj.comment.trim() : '',
          readable: true
        };
      }
    } catch { /* fall through */ }
  }
  return { specimenName: '', microscopy: '', diagnosis: '', comment: '', readable: false };
}

const stripPartPrefix = (s) => String(s || '').replace(/^\([A-Z]\)\s*/, '').trim();
const tidyPlain = (s) => britishise(toAscii(stripPartPrefix(s))).replace(/\s+\n/g, '\n').trim();

/** Normalise a parsed draft into house-style British plain text for the Generic form. */
export function vetDraftReply(parsed, part) {
  const patch = {};
  const spec = tidyPlain(parsed?.specimenName || '');
  if (spec && !String(part?.values?.specimenName || '').trim()) {
    patch.specimenName = spec;
  }
  const micro = tidyPlain(parsed?.microscopy || '');
  if (micro) patch.microscopy = micro;

  const dx = houseConnectors(tidyPlain(parsed?.diagnosis || ''));
  if (dx) patch.diagnosis = dx;

  const comment = tidyPlain(parsed?.comment || '');
  return { patch, comment };
}

/** Apply vetted draft fields to a Generic part and return a reversible undo snapshot. */
export function applyDraftToPart(part, vetted) {
  const snapshot = {
    partLabel: part.label,
    previous: Object.entries(part.values).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v])
  };
  Object.assign(part.values, vetted.patch || {});
  return snapshot;
}

// ---------- Shorthand-to-Form Autofill for ANY structured template ----------

export const FORM_FILL_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    fields: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          value: { type: 'STRING' },
          values: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['id']
      }
    },
    comment: { type: 'STRING' },
    unmapped: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    }
  },
  required: ['fields']
};

export const FORM_FILL_SYSTEM_PROMPT = [
  'You map a consultant histopathologist\'s shorthand findings into structured fields of a pathology reporting template.',
  '',
  'Strict clinical rules:',
  '- Populate ONLY fields explicitly supported by [SHORTHAND] (and corroborating [SPECIMEN], [CLINICAL HISTORY], or [MACROSCOPIC] if relevant).',
  '- NEVER guess or invent grades, stages, invasion status, margin distances, IHC results, or negative findings not stated in the input.',
  '- Match each field "id" strictly from [FIELDS].',
  '- For "select" fields, "value" MUST be copied verbatim from that field\'s allowed options list. If none clearly matches, omit the field.',
  '- For "multiselect" fields, return matching options in "values" (copied verbatim from allowed options).',
  '- For "number" fields, return a plain number string (no unit), converting units to match the field\'s required unit (e.g. 2.5 cm -> "25" when unit is mm; 15 mm -> "1.5" when unit is cm).',
  '- For "checkbox" fields, set "value" to "true" or "false".',
  '- For "text" / "textarea" fields, write concise British English plain text (tumour, haemorrhage, oedema, caecum, oesophagus, -ise/-isation; no Markdown).',
  '- Put any clinically relevant finding from [SHORTHAND] that has no matching field in "unmapped" (short phrases, max 5 items).',
  '- Leave "comment" empty "" unless [SHORTHAND] explicitly requests a report comment or pending stain note.',
  '- Reply with one JSON object matching the schema only.'
].join('\n');

function formFillFields(schema) {
  return (schema?.fields || []).filter((f) => f?.id && f.type !== 'dishCounter').slice(0, MAX_FORM_FIELDS);
}

function describeStructuredField(field, values) {
  const bits = [`- ${field.id}`, field.label || field.id, `type:${field.type}`];
  if (field.suffix) bits.push(`unit:${field.suffix}`);
  if (field.type === 'select' || field.type === 'multiselect') {
    const opts = optionsFor(field, values || {});
    if (opts.length) bits.push(`options:${opts.slice(0, 32).join(' ; ')}`);
  }
  return bits.join(' | ');
}

/** Build the structured shorthand-to-form prompt for any non-Generic template. */
export function buildFormFillPrompt({ shorthand = '', schema, part, specimen = '', clinical = '', macro = '' } = {}) {
  const notes = String(shorthand || '').trim();
  if (!notes) return { error: 'Type or paste shorthand findings first.' };
  const fields = formFillFields(schema);
  if (!fields.length) return { error: 'This template has no fields to autofill.' };

  const lines = [
    'TASK: form-fill',
    `Map the consultant's shorthand findings into the fields of Part ${part?.label || 'A'} (${schema?.name || 'Pathology template'}).`,
    '',
    '[FIELDS]',
    ...fields.map((f) => describeStructuredField(f, part?.values)),
    ''
  ];
  const sp = String(specimen || '').trim();
  if (sp) lines.push('[SPECIMEN]', sp, '');
  const cl = String(clinical || '').trim();
  if (cl) lines.push('[CLINICAL HISTORY]', cl, '');
  const ma = String(macro || '').trim();
  if (ma) lines.push('[MACROSCOPIC]', ma, '');
  lines.push('[SHORTHAND]', notes, '', 'Reply with the JSON object only.');

  const prompt = lines.join('\n');
  if (prompt.length > MAX_PROMPT_CHARS) {
    return { error: `The input is too long to autofill (${prompt.length} characters).` };
  }
  return { system: FORM_FILL_SYSTEM_PROMPT, prompt, fields };
}

/** Parse JSON reply for structured shorthand-to-form autofill. */
export function parseFormFillReply(text) {
  const raw = String(text ?? '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```(?:json)?/g, '')
    .replace(/,\s*([}\]])/g, '$1');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(raw.slice(start, end + 1));
      if (obj && Array.isArray(obj.fields)) {
        return {
          fields: obj.fields,
          comment: typeof obj.comment === 'string' ? obj.comment.trim() : '',
          unmapped: Array.isArray(obj.unmapped) ? obj.unmapped.map((u) => String(u || '').trim()).filter(Boolean).slice(0, 5) : [],
          readable: true
        };
      }
    } catch { /* fall through */ }
  }
  return { fields: [], comment: '', unmapped: [], readable: false };
}

function matchOption(field, raw, opts) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (opts.includes(s)) return s;
  const low = s.toLowerCase();
  const brit = britishise(low);
  for (const o of opts) {
    const ol = String(o).toLowerCase();
    if (ol === low || britishise(ol) === brit) return o;
    const lbl = field.optionLabels?.[o];
    if (lbl && (lbl.toLowerCase() === low || britishise(lbl.toLowerCase()) === brit)) return o;
  }
  return null;
}

/**
 * Validate AI-suggested form fields against `schema` and `part`.
 * Evaluates in schema order on a working copy of `part.values` so conditional option lists
 * (dependent on an earlier field set in the same shorthand) resolve cleanly.
 */
export function vetFormFillReply(parsed, schema, part) {
  const fields = formFillFields(schema);
  const byId = new Map(fields.map((f, idx) => [f.id, { field: f, order: idx }]));
  const rawItems = (parsed?.fields || [])
    .map((item) => ({ item, meta: byId.get(typeof item?.id === 'string' ? item.id.trim() : '') }))
    .filter((x) => x.meta)
    .sort((a, b) => a.meta.order - b.meta.order);

  const working = Object.fromEntries(Object.entries(part?.values || {}).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v]));
  const applied = [];
  const seen = new Set();
  let skipped = 0;

  for (const { item, meta } of rawItems) {
    const field = meta.field;
    if (seen.has(field.id)) { skipped++; continue; }

    let next;
    if (field.type === 'select') {
      const opts = optionsFor(field, working);
      const matched = matchOption(field, item.value, opts);
      if (matched === null) { skipped++; continue; }
      next = matched;
    } else if (field.type === 'multiselect') {
      const opts = optionsFor(field, working);
      const rawList = Array.isArray(item.values) ? item.values : (item.value ? [item.value] : []);
      const picked = [...new Set(rawList.map((v) => matchOption(field, v, opts)).filter((v) => v !== null))];
      if (!picked.length) { skipped++; continue; }
      next = picked.sort((a, b) => opts.indexOf(a) - opts.indexOf(b));
    } else if (field.type === 'checkbox') {
      const s = String(item.value ?? '').trim().toLowerCase();
      if (s !== 'true' && s !== 'false') { skipped++; continue; }
      next = s === 'true';
    } else if (field.type === 'number') {
      const m = /-?\d+(?:\.\d+)?/.exec(String(item.value ?? '').trim());
      if (!m) { skipped++; continue; }
      next = m[0];
    } else {
      let s = tidyPlain(item.value || '');
      if (!s) { skipped++; continue; }
      if (schema?.style?.british) s = britishise(s);
      next = s;
    }

    const before = working[field.id];
    working[field.id] = next;
    if (JSON.stringify(before ?? '') === JSON.stringify(next ?? '')) continue;
    seen.add(field.id);
    applied.push({
      id: field.id,
      label: field.label || field.id,
      before: Array.isArray(before) ? [...before] : before,
      after: next
    });
  }

  return {
    applied,
    skipped,
    comment: tidyPlain(parsed?.comment || ''),
    unmapped: parsed?.unmapped || []
  };
}

/** Apply vetted structured shorthand fields to `part` and return a reversible undo snapshot. */
export function applyFormFillToPart(schema, generator, part, applied) {
  const snapshot = {
    partLabel: part.label,
    previous: Object.entries(part.values).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v])
  };
  const skip = Object.fromEntries(applied.map((a) => [a.id, true]));
  for (const item of applied) {
    const before = part.values[item.id];
    part.values[item.id] = item.after;
    applyLinkedDefaults(schema, part, item.id, before, skip);
    applyDerived(generator, part, item.id);
  }
  normalisePart(schema, part);
  return snapshot;
}
