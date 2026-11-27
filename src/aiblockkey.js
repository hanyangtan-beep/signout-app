// AI-assisted Block-Key Parser & Gross-to-Slide Reconciliation Check via Vertex AI (gemini-3.8-flash).
//
// Pure functions:
// 1. Cleans messy LIS block keys (or extracts block key lines embedded in Macroscopic text) into
//    consistent, plain-text British-English house format without altering cassette labels or counts.
// 2. Reconciles sampled cassettes/blocks against the structured form and report (margins, lymph
//    node counts, parts/lesions, frozen-section residuals) and emits vetted reversible field patches.

import { isVisible, optionsFor, applyLinkedDefaults, applyDerived, normalisePart } from './engine.js';
import { britishise, toAscii } from './style.js';
import { fingerprint } from './proofread.js';

const MAX_PROMPT_CHARS = 36000;
const MAX_CHECKS = 8;
const SEVERITY_ORDER = { critical: 0, warn: 1, info: 2 };

export const BLOCK_KEY_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    cleanedBlockKey: { type: 'STRING' },
    summary: { type: 'STRING' },
    checks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          severity: { type: 'STRING', enum: ['critical', 'warn', 'info'] },
          category: { type: 'STRING', enum: ['margins', 'nodes', 'blocks', 'laterality', 'lesion', 'omission'] },
          title: { type: 'STRING' },
          detail: { type: 'STRING' },
          fieldPatch: {
            type: 'OBJECT',
            properties: {
              partIndex: { type: 'INTEGER' },
              fieldId: { type: 'STRING' },
              value: { type: 'STRING' },
              values: { type: 'ARRAY', items: { type: 'STRING' } }
            },
            required: ['partIndex', 'fieldId']
          }
        },
        required: ['severity', 'category', 'title', 'detail']
      }
    }
  },
  required: ['cleanedBlockKey', 'summary', 'checks']
};

export const BLOCK_KEY_SYSTEM_PROMPT = [
  'You are a consultant surgical pathologist cleaning a messy LIS block key into concise British-English house format and performing a gross-to-slide reconciliation check against the structured reporting form.',
  '',
  'Task 1 — "cleanedBlockKey":',
  '- Normalise the block key from [BLOCK KEY] (or extract block-key lines embedded inside [MACROSCOPIC] if [BLOCK KEY] is blank) into crisp, plain-text LIS lines (one line per block or block range, e.g. "A1-A3: Tumour with deepest invasion (3 blocks)", "A4: Proximal margin (shave)", "A5-A8: Pericolic lymph nodes (14 nodes, all embedded)").',
  '- Use British English spelling (tumour, haemorrhage, oedema, caecum, oesophagus, -ise/-isation) and plain ASCII only (no Markdown, no bullets, no smart quotes).',
  '- NEVER alter, drop, or invent cassette letters, block numbers, piece counts, laterality, ink colours, decalcification notes, or "all embedded" / "representative" qualifiers.',
  '- If no block key exists anywhere in [BLOCK KEY] or [MACROSCOPIC], return "".',
  '',
  'Task 2 — "checks" (Gross-to-Slide Reconciliation):',
  '- Compare the sampled blocks and [MACROSCOPIC] against [FORM STATE] and [REPORT] for genuine discrepancies:',
  '  * Margin blocks sampled (e.g. proximal, distal, CRM/radial, bronchial, ureteric, vascular, resection margin) that are blank or marked "not assessable" on the form.',
  '  * Lymph node counts or stations in the block key/macro disagreeing with nodes examined on the form.',
  '  * Separate lesions, polyps, satellite nodules, or additional parts mentioned in the block key/macro that are missing from the form/report.',
  '  * Laterality or anatomical site mismatches between cassette descriptions and the form.',
  '- When a discrepancy has a clear, unambiguous fix in [FORM STATE], include "fieldPatch" with exact 0-based "partIndex", exact "fieldId", and exact allowed option string in "value" (or array in "values" for multiselect, plain number string for number, "true"/"false" for checkbox).',
  '- Omit "fieldPatch" when human judgement is required.',
  '- If everything reconciles cleanly, return "checks": [] and a 1-line "summary".',
  '- Reply with one JSON object matching the schema only.'
].join('\n');

function formatVal(v) {
  if (Array.isArray(v)) return v.length ? `[${v.join(', ')}]` : '[]';
  if (v === true) return 'true';
  if (v === false) return 'false';
  return String(v ?? '').trim() || '(blank)';
}

function describeField(f, values) {
  const bits = [`- ${f.id}`, f.label || f.id, `type:${f.type}`, `current:${formatVal(values[f.id])}`];
  if (f.suffix) bits.push(`unit:${f.suffix}`);
  if (f.type === 'select' || f.type === 'multiselect') {
    const opts = optionsFor(f, values);
    if (opts.length && opts.length <= 24) bits.push(`options:${opts.join(' ; ')}`);
  }
  return bits.join(' | ');
}

/** Build the block-key clean & gross-to-slide check prompt. */
export function buildBlockKeyPrompt({ caseState, parts = [], schemaFor, sections = [] } = {}) {
  const blockKey = String(caseState?.meta?.blockKey || '').trim();
  const macro = String(caseState?.meta?.macro || '').trim();
  if (!blockKey && !macro) {
    return { error: 'Paste a block key (or macroscopic description with blocks) first.' };
  }

  const lines = [
    'TASK: block-key-check',
    'Clean the block key into British-English house format and reconcile all sampled blocks against the form and report.',
    ''
  ];
  const sp = String(caseState?.meta?.specimen || '').trim();
  if (sp) lines.push('[SPECIMEN]', sp, '');
  if (macro) lines.push('[MACROSCOPIC]', macro, '');
  if (blockKey) lines.push('[BLOCK KEY]', blockKey, '');

  lines.push('[FORM STATE]');
  parts.forEach((part, i) => {
    const s = schemaFor(part);
    const vis = (s?.fields || []).filter((f) => f.type !== 'dishCounter' && isVisible(f, part.values || {}));
    lines.push(`### partIndex ${i} — Part (${part.label})${part.linked ? ' [linked synoptic]' : ''}: ${s?.name || ''}`);
    for (const f of vis) lines.push(describeField(f, part.values || {}));
    lines.push('');
  });

  if (sections.length) {
    lines.push('[REPORT]');
    for (const s of sections) lines.push(`[${s.tag}]`, s.text, '');
  }
  lines.push('Reply with the JSON object only.');

  const prompt = lines.join('\n');
  if (prompt.length > MAX_PROMPT_CHARS) {
    return { error: `This case is too long for block-key checking (${prompt.length} characters).` };
  }
  return { system: BLOCK_KEY_SYSTEM_PROMPT, prompt };
}

/** Parse JSON block-key reply; returns { cleanedBlockKey, summary, checks[], readable }. */
export function parseBlockKeyReply(text) {
  const raw = String(text ?? '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```(?:json)?/g, '')
    .replace(/,\s*([}\]])/g, '$1');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(raw.slice(start, end + 1));
      if (obj && (typeof obj.cleanedBlockKey === 'string' || Array.isArray(obj.checks))) {
        return {
          cleanedBlockKey: typeof obj.cleanedBlockKey === 'string' ? obj.cleanedBlockKey.trim() : '',
          summary: String(obj.summary || '').trim(),
          checks: Array.isArray(obj.checks) ? obj.checks : [],
          readable: true
        };
      }
    } catch { /* fall through */ }
  }
  return { cleanedBlockKey: '', summary: '', checks: [], readable: false };
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

function vetFieldPatch(fp, parts, schemaFor) {
  if (!fp || typeof fp !== 'object') return null;
  const idx = Number.isInteger(fp.partIndex) ? fp.partIndex : -1;
  if (idx < 0 || idx >= parts.length) return null;
  const part = parts[idx];
  const schema = schemaFor(part);
  const fieldId = typeof fp.fieldId === 'string' ? fp.fieldId.trim() : '';
  const field = (schema?.fields || []).find((f) => f.id === fieldId);
  if (!field || field.type === 'dishCounter') return null;

  const values = part.values || {};
  let next;
  if (field.type === 'select') {
    const opts = optionsFor(field, values);
    const matched = matchOption(field, fp.value, opts);
    if (matched === null) return null;
    next = matched;
  } else if (field.type === 'multiselect') {
    const opts = optionsFor(field, values);
    const rawList = Array.isArray(fp.values) ? fp.values : (fp.value ? [fp.value] : []);
    const picked = [...new Set(rawList.map((v) => matchOption(field, v, opts)).filter((v) => v !== null))];
    if (!picked.length) return null;
    next = picked.sort((a, b) => opts.indexOf(a) - opts.indexOf(b));
  } else if (field.type === 'checkbox') {
    const s = String(fp.value ?? '').trim().toLowerCase();
    if (s !== 'true' && s !== 'false') return null;
    next = s === 'true';
  } else if (field.type === 'number') {
    const m = /-?\d+(?:\.\d+)?/.exec(String(fp.value ?? '').trim());
    if (!m) return null;
    next = m[0];
  } else {
    let s = britishise(toAscii(String(fp.value ?? ''))).trim();
    if (!s) return null;
    next = s;
  }

  const before = values[fieldId];
  if (JSON.stringify(before ?? '') === JSON.stringify(next ?? '')) return null;
  return {
    partIndex: idx,
    partLabel: part.label,
    fieldId,
    fieldLabel: field.label || fieldId,
    before: Array.isArray(before) ? [...before] : before,
    after: next
  };
}

const tidyPlain = (s) => britishise(toAscii(String(s || ''))).replace(/[ \t]+\n/g, '\n').trim();

/** Validate cleaned block key and gross-to-slide check findings + field patches. */
export function vetBlockKeyReply(parsed, parts, schemaFor) {
  const cleanedBlockKey = tidyPlain(parsed?.cleanedBlockKey || '');
  const seen = new Set();
  const checks = [];

  for (const c of parsed?.checks || []) {
    const title = tidyPlain(c?.title || '').slice(0, 120);
    const detail = tidyPlain(c?.detail || '').slice(0, 320);
    if (!title || !detail) continue;
    const severity = ['critical', 'warn', 'info'].includes(c?.severity) ? c.severity : 'warn';
    const category = String(c?.category || 'blocks').toLowerCase();
    const fieldPatch = vetFieldPatch(c.fieldPatch, parts, schemaFor);
    const key = fingerprint(`${severity}|${category}|${title}|${fieldPatch?.fieldId || ''}`);
    if (seen.has(key)) continue;
    seen.add(key);
    checks.push({ key, severity, category, title, detail, fieldPatch });
  }

  checks.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 1) - (SEVERITY_ORDER[b.severity] ?? 1));
  const capped = checks.slice(0, MAX_CHECKS);
  const summary = tidyPlain(parsed?.summary || '')
    || (capped.length ? `${capped.length} gross-to-slide item${capped.length === 1 ? '' : 's'} to review.` : 'Block key reconciled cleanly with the form.');

  return { cleanedBlockKey, summary, checks: capped };
}

/** Apply a vetted block-key reconciliation `fieldPatch` into `part.values` and return an undo snapshot. */
export function applyBlockKeyFieldPatch(schema, generator, part, patch) {
  const snapshot = {
    partLabel: part.label,
    fieldLabel: patch.fieldLabel,
    previous: Object.entries(part.values).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v])
  };
  const before = part.values[patch.fieldId];
  part.values[patch.fieldId] = patch.after;
  applyLinkedDefaults(schema, part, patch.fieldId, before, { [patch.fieldId]: true });
  applyDerived(generator, part, patch.fieldId);
  normalisePart(schema, part);
  return snapshot;
}
