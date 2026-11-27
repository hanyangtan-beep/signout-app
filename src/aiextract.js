// AI-assisted specimen and macroscopic field extraction via Vertex AI (gemini-3.5-flash-lite).
//
// Pure functions: builds a compact schema-aware prompt for the active part's specimen/macro
// fields, parses the structured JSON reply, validates every value against the schema's allowed
// types and options, and applies them with a reversible undo snapshot.

import { optionsFor, applyLinkedDefaults, applyDerived, normalisePart } from './engine.js';
import { britishise } from './style.js';
import { LETTERS, MAX_PARTS, GENERIC_ID, splitTriple, tidyText, matchParts } from './intake.js';

const MAX_FIELDS = 35;
const MAX_PROMPT_CHARS = 36000;
const MACRO_GROUP_RE = /\b(specimen|macro|gross|measurement|received)\b/i;
const INTAKE_ID_RE = /^(side|laterality|site|subsite|lobe|location|procedure|specimen|specimenType|specimenName|weight|dims|dimensions|size|tumou?rSize|tumou?rDims|lesionSize|length|diameter|thickness|wallThickness|cavityLength|depth|blocks|blockCount|blockKey|nodeCount|nodesExamined|lymphNodes|volume|focality|multifocal)/i;

/** Structured JSON schema for Vertex AI /v1/ai (task: "extract"). */
export const EXTRACT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    fields: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          value: { type: 'STRING' },
          values: { type: 'ARRAY', items: { type: 'STRING' } },
          evidence: { type: 'STRING' }
        },
        required: ['id', 'evidence']
      }
    }
  },
  required: ['fields']
};

export const EXTRACT_SYSTEM_PROMPT = [
  'You extract structured specimen and macroscopic fields from surgical pathology LIS text into a schema-driven reporting form.',
  '',
  'Rules:',
  '- Extract ONLY facts explicitly stated in [SPECIMEN], [CLINICAL HISTORY], or [MACROSCOPIC] for the named part. NEVER guess or infer microscopic/histologic findings or staging.',
  '- Match each field ID exactly from the provided field list.',
  '- For "select" fields, "value" MUST be copied verbatim from that field\'s allowed options list. If none clearly matches, omit the field.',
  '- For "multiselect" fields, return matching options in "values" (copied verbatim from allowed options).',
  '- For "number" fields, return a plain number string (no unit), converting units to match the field\'s required unit (e.g. 2.5 cm -> "25" when unit is mm; 15 mm -> "1.5" when unit is cm).',
  '- For "checkbox" fields, set "value" to "true" or "false".',
  '- For "text" / "textarea" fields, keep values concise, plain text, British spelling (tumour, haemorrhage, oedema, caecum, oesophagus, -ise/-isation), and match any requested unit.',
  '- Include a short verbatim "evidence" quote (<= 100 chars) from the source text for every extracted field.',
  '- If no fields can be confidently extracted, reply {"fields":[]}.',
  '- Reply with one JSON object matching the schema only.'
].join('\n');

/**
 * Fields of `schema` eligible for AI extraction from specimen + clinical history + macro paste.
 * Prioritises schema.macroExtract and layout.macroGroups/macroFields, then specimen/gross fields.
 */
export function extractableFields(schema) {
  const fields = schema?.fields || [];
  const macroExtract = schema?.macroExtract || {};
  const macroGroups = new Set(schema?.layout?.macroGroups || []);
  const macroIds = new Set(schema?.layout?.macroFields || []);

  const primary = [];
  const secondary = [];
  for (const f of fields) {
    if (!f?.id || f.type === 'dishCounter') continue;
    if (f.id in macroExtract || macroGroups.has(f.group) || macroIds.has(f.id)) {
      primary.push(f);
    } else if (MACRO_GROUP_RE.test(f.group || '') || INTAKE_ID_RE.test(f.id)) {
      secondary.push(f);
    }
  }
  return [...primary, ...secondary].slice(0, MAX_FIELDS);
}

function unitFor(schema, field) {
  return schema?.macroExtract?.[field.id]?.unit || field.suffix || '';
}

function describeField(schema, field, values) {
  const parts = [`- ${field.id}`, field.label || field.id, `type: ${field.type}`];
  const unit = unitFor(schema, field);
  if (unit) parts.push(`unit: ${unit}`);
  if (field.type === 'select' || field.type === 'multiselect') {
    const opts = optionsFor(field, values || {});
    if (opts.length) parts.push(`options: ${opts.join(' ; ')}`);
  }
  return parts.join(' | ');
}

/** Build the extraction prompt for one part. Returns { system, prompt, fields } or { error }. */
export function buildExtractPrompt({ schema, part, specimen = '', clinical = '', macro = '' } = {}) {
  const sp = String(specimen || '').trim();
  const cl = String(clinical || '').trim();
  const ma = String(macro || '').trim();
  if (!sp && !cl && !ma) return { error: 'Paste a specimen or macroscopic description first.' };

  const fields = extractableFields(schema);
  if (!fields.length) return { error: 'This template has no specimen or macroscopic fields to extract.' };

  const lines = [
    'TASK: extract',
    `Extract specimen and macroscopic fields for Part ${part?.label || 'A'} (${schema?.name || 'Pathology report'}).`,
    '',
    '[FIELDS]',
    ...fields.map((f) => describeField(schema, f, part?.values)),
    ''
  ];
  if (sp) lines.push('[SPECIMEN]', sp, '');
  if (cl) lines.push('[CLINICAL HISTORY]', cl, '');
  if (ma) lines.push('[MACROSCOPIC]', ma, '');
  lines.push('Reply with the JSON object only.');

  const prompt = lines.join('\n');
  if (prompt.length > MAX_PROMPT_CHARS) {
    return { error: `The pasted text is too long to extract (${prompt.length} characters).` };
  }
  return { system: EXTRACT_SYSTEM_PROMPT, prompt, fields };
}

/** Parse the JSON reply from Vertex AI; returns { fields[], readable }. */
export function parseExtractReply(text) {
  const raw = String(text ?? '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```(?:json)?/g, '')
    .replace(/,\s*([}\]])/g, '$1');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(raw.slice(start, end + 1));
      if (obj && Array.isArray(obj.fields)) return { fields: obj.fields, readable: true };
    } catch { /* fall through */ }
  }
  return { fields: [], readable: false };
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
 * Validate model-extracted field values against `schema` and `part`.
 * Returns { applied: [{ id, label, before, after, evidence }], skipped }.
 */
export function vetExtractedFields(parsed, schema, part) {
  const eligible = new Map(extractableFields(schema).map((f) => [f.id, f]));
  const values = part?.values || {};
  const applied = [];
  const seen = new Set();
  let skipped = 0;

  for (const item of parsed?.fields || []) {
    const id = typeof item?.id === 'string' ? item.id.trim() : '';
    const field = eligible.get(id);
    if (!field || seen.has(id)) { skipped++; continue; }

    let next;
    if (field.type === 'select') {
      const opts = optionsFor(field, values);
      const matched = matchOption(field, item.value, opts);
      if (matched === null) { skipped++; continue; }
      next = matched;
    } else if (field.type === 'multiselect') {
      const opts = optionsFor(field, values);
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
      let s = String(item.value ?? '').trim();
      if (!s) { skipped++; continue; }
      if (schema?.style?.british) s = britishise(s);
      next = s;
    }

    const before = values[id];
    if (JSON.stringify(before ?? '') === JSON.stringify(next ?? '')) continue;
    seen.add(id);
    applied.push({
      id,
      label: field.label || id,
      before: Array.isArray(before) ? [...before] : before,
      after: next,
      evidence: String(item.evidence ?? '').trim().slice(0, 120)
    });
  }
  return { applied, skipped };
}

/** Apply vetted extracted fields to `part` and return an undo snapshot. */
export function applyExtractedFields(schema, generator, part, applied) {
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

// ---------- AI multi-part specimen intake (gemini-3.5-flash-lite) ----------

export const INTAKE_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    history: { type: 'STRING' },
    parts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          text: { type: 'STRING' },
          templateId: { type: 'STRING' },
          reason: { type: 'STRING' }
        },
        required: ['label', 'text', 'templateId']
      }
    }
  },
  required: ['parts']
};

export const INTAKE_SYSTEM_PROMPT = [
  'You parse surgical pathology LIS specimen lists into ordered specimen parts and match each part to the best installed reporting template.',
  '',
  'Rules:',
  '- Split [SPECIMEN] into ordered specimen parts labelled A, B, C... (single uppercase letters, up to Z). Preserve explicit container letters when present; map numbered containers (1., 2., 3.) to A, B, C.',
  '- Separate any clinical history embedded inside [SPECIMEN] into "history" — never turn clinical history into a specimen part.',
  '- Write each part\'s "text" as a clean, concise LIS specimen line preserving laterality, organ, subsite, clock position, lymph node station, and procedure (e.g. "Breast, right 11 o\'clock, core biopsy").',
  '- Choose "templateId" strictly from the [TEMPLATES] list using BOTH the part text and [CLINICAL HISTORY] (e.g. cancer history -> cancer resection template; benign/polyp/biopsy -> biopsy or benign resection template; lymph node / SLN -> lymph_node or lymphoma_node; HER2 DISH request -> breast_biomarkers; if no template clearly fits, use "generic").',
  '- Keep "reason" concise (<= 10 words).',
  '- Reply with one JSON object matching the schema only.'
].join('\n');

/** Build the multi-part intake prompt from raw LIS text and the installed template manifest. */
export function buildIntakePrompt({ raw = '', clinical = '', manifest = [] } = {}) {
  const sp = String(raw || '').trim();
  if (!sp) return { error: 'Paste a specimen list first.' };
  const catalogue = manifest
    .map((t) => {
      const aliases = Array.isArray(t.aliases) && t.aliases.length ? ` | aliases: ${t.aliases.slice(0, 6).join(', ')}` : '';
      return `- ${t.id} | ${t.name} | ${t.kind || ''}${aliases}`;
    });
  const lines = [
    'TASK: extract',
    'Split this LIS specimen text into ordered specimen parts and pick the best templateId for each part.',
    '',
    '[TEMPLATES]',
    ...catalogue,
    ''
  ];
  const cl = String(clinical || '').trim();
  if (cl) lines.push('[CLINICAL HISTORY]', cl, '');
  lines.push('[SPECIMEN]', sp, '', 'Reply with the JSON object only.');
  const prompt = lines.join('\n');
  if (prompt.length > MAX_PROMPT_CHARS) {
    return { error: `The specimen list is too long to parse with AI (${prompt.length} characters).` };
  }
  return { system: INTAKE_SYSTEM_PROMPT, prompt };
}

/** Parse the JSON reply for multi-part intake; returns { history, parts[], readable }. */
export function parseIntakeReply(text) {
  const raw = String(text ?? '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```(?:json)?/g, '')
    .replace(/,\s*([}\]])/g, '$1');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(raw.slice(start, end + 1));
      if (obj && Array.isArray(obj.parts)) {
        return {
          history: typeof obj.history === 'string' ? obj.history.trim() : '',
          parts: obj.parts,
          readable: true
        };
      }
    } catch { /* fall through */ }
  }
  return { history: '', parts: [], readable: false };
}

/**
 * Validate AI-parsed specimen parts and enrich them with matchParts() metadata
 * so buildPartsFromIntake() works identically to deterministic intake.
 */
export function vetIntakeParts(parsed, manifest = [], fallbackHistory = '') {
  const validIds = new Set(manifest.map((t) => t.id));
  validIds.add(GENERIC_ID);
  const history = parsed?.history || String(fallbackHistory || '').trim();
  const rawParts = [];
  const chosenIds = [];
  const reasons = [];

  for (const p of (parsed?.parts || []).slice(0, MAX_PARTS)) {
    const body = String(p?.text ?? '').replace(/\s+/g, ' ').trim();
    if (!body) continue;
    const idx = rawParts.length;
    const rawLabel = String(p?.label ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '');
    const label = rawLabel.length === 1 ? rawLabel : (LETTERS[idx] || String(idx + 1));
    const tid = typeof p?.templateId === 'string' && validIds.has(p.templateId.trim()) ? p.templateId.trim() : GENERIC_ID;
    rawParts.push({ label, text: tidyText(body), raw: body, ...splitTriple(body) });
    chosenIds.push(tid);
    reasons.push(String(p?.reason ?? '').trim().slice(0, 100));
  }

  const parsedObj = { history, casePrefix: '', parts: rawParts, warnings: [] };
  const matched = matchParts(parsedObj, history, manifest);
  const rows = matched.map((r, i) => ({
    ...r,
    templateId: chosenIds[i],
    tier: chosenIds[i] === GENERIC_ID ? 'none' : 'confident',
    aiReason: reasons[i]
  }));
  return { parsed: parsedObj, rows };
}
