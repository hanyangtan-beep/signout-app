// AI-assisted shorthand-to-report drafting for Generic (free text) parts via Vertex AI (gemini-3.8-flash).
//
// Pure functions: expands consultant shorthand bullets into British-English, LIS-ready
// Microscopy and Diagnosis text following HOUSE_STYLE, without inventing unstated findings.

import { HOUSE_STYLE } from './proofread.js';
import { britishise, toAscii, houseConnectors } from './style.js';

const MAX_PROMPT_CHARS = 32000;

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
