// Pre-sign-out Cancer Synoptic Staging & Clinical QA Audit via Vertex AI (gemini-4-neon).
//
// Pure functions: builds a clinical audit prompt containing the case's visible form state, raw LIS
// pastes, and generated report, then vets structured findings and reversible form-field or
// text write-back patches so the pathologist can apply fixes straight back into the form.

import { isVisible, optionsFor, applyLinkedDefaults, applyDerived, normalisePart } from './engine.js';
import { britishise } from './style.js';
import { SECTIONS, applyEdit, fingerprint } from './proofread.js';

const MAX_PROMPT_CHARS = 38000;
const MAX_FINDINGS = 8;
const BY_TAG = Object.fromEntries(SECTIONS.map((s) => [s.tag, s]));
const SEVERITY_ORDER = { critical: 0, warn: 1, info: 2 };

/** True when the case includes a cancer resection, biomarker, CNS, lymphoma, or melanoma template. */
export function isAuditEligible(schemas = []) {
  return (schemas || []).some((s) => {
    const kind = String(s?.kind || '').toLowerCase();
    const id = String(s?.id || '').toLowerCase();
    return kind.includes('cancer') || kind.includes('biomarker')
      || /\b(cns|brain|melanoma|lymphoma|sarcoma)\b/.test(id);
  });
}

/** Structured JSON schema for Vertex AI /v1/ai (task: "audit"). */
export const AUDIT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    verdict: { type: 'STRING', enum: ['clear', 'review'] },
    summary: { type: 'STRING' },
    findings: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          severity: { type: 'STRING', enum: ['critical', 'warn', 'info'] },
          category: { type: 'STRING', enum: ['staging', 'grading', 'margins', 'laterality', 'cross-part', 'biomarkers', 'history', 'omission'] },
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
          },
          textPatch: {
            type: 'OBJECT',
            properties: {
              section: { type: 'STRING', enum: ['SPECIMEN', 'MACRO', 'INTRAOP', 'MICRO', 'MOLECULAR', 'DX', 'COMMENT'] },
              find: { type: 'STRING' },
              replace: { type: 'STRING' }
            },
            required: ['section', 'find', 'replace']
          }
        },
        required: ['severity', 'category', 'title', 'detail']
      }
    }
  },
  required: ['verdict', 'summary', 'findings']
};

export const AUDIT_SYSTEM_PROMPT = [
  'You are a consultant surgical pathologist performing a pre-sign-out staging and clinical QA audit on a cancer resection, biomarker, or complex pathology report (British English).',
  '',
  'Check ONLY high-value clinical and diagnostic accuracy:',
  '1. Staging & grading arithmetic: AJCC 8th/9th pT/pN/ypT/ypN vs stated tumour size, depth of invasion, anatomical extent, and positive/total lymph node counts; Nottingham, Gleason/ISUP, WHO CNS5, FIGO, and FNCLCC score/grade consistency.',
  '2. Cross-part reconciliation: separate lymph node, sentinel node, or margin parts contradicting the primary resection part (e.g. total positive nodes across Parts A + B vs pN stage).',
  '3. Raw LIS paste vs form/report contradictions: laterality, tumour size, margin distance, or specimen type in [SPECIMEN PASTE] or [MACRO PASTE] disagreeing with [FORM STATE] or [REPORT].',
  '4. Margin, LVI, PNI, and extranodal extension concordance across [MACRO], [MICRO], and [DX].',
  '5. Clinical history alignment: [HISTORY] mentions neoadjuvant therapy (NACT/CRT) without ypT/ypN or treatment response, or asks a specific question left unaddressed.',
  '6. Mandatory biomarker/synoptic completeness: e.g. invasive breast carcinoma lacking ER/PR/HER2 mention/pending note, colorectal carcinoma lacking MMR/MSI, or involved/close margin missing distance.',
  '',
  'Working backwards into the form:',
  '- When a discrepancy has a clear fix in [FORM STATE], include "fieldPatch" with the exact 0-based "partIndex", exact "fieldId", and exact allowed option string in "value" (or array of allowed options in "values" for multiselect, plain number string for number, "true"/"false" for checkbox).',
  '- When a fix belongs in a free-text report section (e.g. a hand-edited block or [COMMENT]) rather than a single picklist field, include "textPatch" with exact "section", verbatim one-line "find", and "replace".',
  '- Omit both patches when human judgement is required (e.g. two sections disagree and neither is clearly authoritative).',
  '',
  'Strict anti-noise rules:',
  '- NEVER comment on grammar, punctuation, telegraphic phrasing, or wording style.',
  '- If no genuine clinical, staging, grading, margin, biomarker, or cross-part issue exists, reply {"verdict":"clear","summary":"No staging or clinical discrepancies found.","findings":[]}.',
  '- Reply with one JSON object matching the schema only.'
].join('\n');

function formatVal(v) {
  if (Array.isArray(v)) return v.length ? `[${v.join(', ')}]` : '[]';
  if (v === true) return 'true';
  if (v === false) return 'false';
  return String(v ?? '').trim() || '(blank)';
}

function describeFormField(f, values) {
  const parts = [`- ${f.id}`, f.label || f.id, `type:${f.type}`, `current:${formatVal(values[f.id])}`];
  if (f.suffix) parts.push(`unit:${f.suffix}`);
  if (f.type === 'select' || f.type === 'multiselect') {
    const opts = optionsFor(f, values);
    if (opts.length && opts.length <= 24) parts.push(`options:${opts.join(' ; ')}`);
  }
  return parts.join(' | ');
}

/** Build the audit prompt from case state, visible form fields, and generated report sections. */
export function buildAuditPrompt({ caseState, parts = [], schemaFor, sections = [] } = {}) {
  if (!sections.length) return { error: 'Nothing in the report to audit yet.' };
  const lines = [
    'TASK: audit',
    'Audit this surgical pathology case for staging, grading, margin, biomarker, cross-part, and clinical-history accuracy.',
    ''
  ];

  const clinical = String(caseState?.meta?.clinical || '').trim();
  const specimenPaste = String(caseState?.meta?.specimen || '').trim();
  const macroPaste = String(caseState?.meta?.macro || '').trim();
  if (clinical) lines.push('[HISTORY]', clinical, '');
  if (specimenPaste) lines.push('[SPECIMEN PASTE]', specimenPaste, '');
  if (macroPaste) lines.push('[MACRO PASTE]', macroPaste, '');

  lines.push('[FORM STATE]');
  parts.forEach((part, i) => {
    const s = schemaFor(part);
    const vis = (s?.fields || []).filter((f) => f.type !== 'dishCounter' && isVisible(f, part.values || {}));
    lines.push(`### partIndex ${i} — Part (${part.label})${part.linked ? ' [linked synoptic]' : ''}: ${s?.name || ''}`);
    for (const f of vis) lines.push(describeFormField(f, part.values || {}));
    lines.push('');
  });

  lines.push('[REPORT]');
  for (const s of sections) lines.push(`[${s.tag}]`, s.text, '');
  lines.push('Reply with the JSON object only.');

  const prompt = lines.join('\n');
  if (prompt.length > MAX_PROMPT_CHARS) {
    return { error: `This case is too long for a single staging audit (${prompt.length} characters).` };
  }
  return { system: AUDIT_SYSTEM_PROMPT, prompt };
}

/** Parse JSON audit reply; returns { verdict, summary, findings[], readable }. */
export function parseAuditReply(text) {
  const raw = String(text ?? '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```(?:json)?/g, '')
    .replace(/,\s*([}\]])/g, '$1');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(raw.slice(start, end + 1));
      if (obj && Array.isArray(obj.findings)) {
        return {
          verdict: obj.verdict === 'clear' ? 'clear' : 'review',
          summary: String(obj.summary || '').trim(),
          findings: obj.findings,
          readable: true
        };
      }
    } catch { /* fall through */ }
  }
  return { verdict: 'review', summary: '', findings: [], readable: false };
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
    let s = String(fp.value ?? '').trim();
    if (!s) return null;
    if (schema?.style?.british) s = britishise(s);
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

function vetTextPatch(tp, sections) {
  if (!tp || typeof tp !== 'object') return null;
  const sec = BY_TAG[String(tp.section || '').toUpperCase().replace(/[^A-Z]/g, '')];
  if (!sec) return null;
  const block = sections.find((s) => s.key === sec.key);
  const find = typeof tp.find === 'string' ? tp.find : '';
  const replace = typeof tp.replace === 'string' ? tp.replace : '';
  if (!block || !find.trim() || find === replace || /[\r\n]/.test(find) || /[\r\n]/.test(replace)) return null;
  if (applyEdit(block.text, { find, replace }) === null) return null;
  return { section: sec.key, sectionLabel: sec.label, find, replace };
}

/** Validate and sort audit findings, keeping only verified form or text patches. */
export function vetAuditFindings(parsed, parts, schemaFor, sections) {
  const seen = new Set();
  const findings = [];
  for (const f of parsed?.findings || []) {
    const title = String(f?.title || '').trim().slice(0, 120);
    const detail = String(f?.detail || '').trim().slice(0, 320);
    if (!title || !detail) continue;
    const severity = ['critical', 'warn', 'info'].includes(f?.severity) ? f.severity : 'warn';
    const category = String(f?.category || 'staging').toLowerCase();
    const fieldPatch = vetFieldPatch(f.fieldPatch, parts, schemaFor);
    const textPatch = fieldPatch ? null : vetTextPatch(f.textPatch, sections);
    const key = fingerprint(`${severity}|${category}|${title}|${fieldPatch?.fieldId || textPatch?.find || ''}`);
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({ key, severity, category, title, detail, fieldPatch, textPatch });
  }
  findings.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 1) - (SEVERITY_ORDER[b.severity] ?? 1));
  const capped = findings.slice(0, MAX_FINDINGS);
  return {
    verdict: capped.length ? 'review' : 'clear',
    summary: parsed?.summary || (capped.length ? `${capped.length} clinical item${capped.length === 1 ? '' : 's'} to review.` : 'No staging or clinical discrepancies found.'),
    findings: capped
  };
}

/** Apply a vetted `fieldPatch` directly into `part.values` and return a reversible undo snapshot. */
export function applyAuditFieldPatch(schema, generator, part, patch) {
  const snapshot = {
    kind: 'field',
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
