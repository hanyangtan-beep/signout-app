// AI-assisted IHC Panel & Differential Diagnosis Assistant via Vertex AI (gemini-4-neon).
//
// Pure functions: takes the case context + optional consultant morphology/IHC notes, asks
// Gemini 4 Neon for a ranked differential diagnosis, discriminating next stains/molecular tests,
// diagnostic pitfalls, and an optional LIS-ready British-English Comment paragraph.

import { HOUSE_STYLE } from './proofread.js';
import { britishise, toAscii } from './style.js';

const MAX_PROMPT_CHARS = 36000;

export const IHC_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    differential: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          entity: { type: 'STRING' },
          likelihood: { type: 'STRING', enum: ['primary', 'consider', 'exclude'] },
          rationale: { type: 'STRING' },
          profile: { type: 'STRING' }
        },
        required: ['entity', 'likelihood', 'rationale', 'profile']
      }
    },
    nextStains: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          marker: { type: 'STRING' },
          purpose: { type: 'STRING' }
        },
        required: ['marker', 'purpose']
      }
    },
    pitfalls: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    commentDraft: { type: 'STRING' }
  },
  required: ['summary', 'differential', 'nextStains', 'commentDraft']
};

export const IHC_SYSTEM_PROMPT = [
  'You are a consultant surgical pathologist advising a colleague on immunohistochemistry (IHC), molecular workup, and differential diagnosis (WHO 5th edition, British English).',
  '',
  'Tasks:',
  '1. "summary": 1 concise sentence synthesising the morphological/immunophenotypic problem.',
  '2. "differential": 3 to 5 ranked diagnostic entities ("primary" = leading diagnosis, "consider" = key alternative, "exclude" = important mimic to rule out). Include concise "rationale" (<= 25 words) and expected "profile" (e.g. "CK7+, GATA3+, ER+, SOX10-").',
  '3. "nextStains": 3 to 8 high-yield, discriminating next IHC stains or molecular tests (do NOT repeat stains already reported as done unless a different clone/re-evaluation is needed). Explain briefly in "purpose" what positive vs negative distinguishes.',
  '4. "pitfalls": 0 to 3 high-value IHC/diagnostic caveats (e.g. aberrant expression, focal positivity, clone sensitivity, fixation artefacts).',
  '5. "commentDraft": a concise, LIS-ready British-English Comment paragraph (2 to 4 sentences, plain text, no Markdown, no bullet points, no smart quotes) suitable for pasting into the report\'s Comment block if the pathologist chooses to insert it.',
  '',
  'House style for commentDraft:',
  ...HOUSE_STYLE.map((r) => `- ${r}`),
  '',
  'Strict rules:',
  '- Ground your reasoning ONLY in the provided case context and [MORPHOLOGY / STAINS]. Do not fabricate stain results that were not reported.',
  '- Reply with one JSON object matching the schema only.'
].join('\n');

/** Build the IHC & differential prompt from notes + case context. */
export function buildIhcPrompt({ notes = '', caseState, sections = [] } = {}) {
  const userNotes = String(notes || '').trim();
  const specimen = String(caseState?.meta?.specimen || '').trim();
  const clinical = String(caseState?.meta?.clinical || '').trim();
  const macro = String(caseState?.meta?.macro || '').trim();
  const reportBits = (sections || []).filter((s) => ['specimens', 'microscopy', 'molecular', 'diagnosis', 'comment'].includes(s.key) && s.text?.trim());

  if (!userNotes && !specimen && !clinical && !reportBits.length) {
    return { error: 'Enter morphology/IHC notes or fill part of the case first.' };
  }

  const lines = [
    'TASK: ihc-differential',
    'Provide a ranked differential diagnosis, discriminating next IHC/molecular panel, pitfalls, and a British-English Comment draft.',
    ''
  ];
  if (specimen) lines.push('[SPECIMEN]', specimen, '');
  if (clinical) lines.push('[CLINICAL HISTORY]', clinical, '');
  if (macro) lines.push('[MACROSCOPIC]', macro, '');
  if (reportBits.length) {
    lines.push('[CURRENT REPORT]');
    for (const s of reportBits) lines.push(`[${s.tag}]`, s.text, '');
  }
  if (userNotes) lines.push('[MORPHOLOGY / STAINS]', userNotes, '');
  lines.push('Reply with the JSON object only.');

  const prompt = lines.join('\n');
  if (prompt.length > MAX_PROMPT_CHARS) {
    return { error: `The case context is too long for IHC consult (${prompt.length} characters).` };
  }
  return { system: IHC_SYSTEM_PROMPT, prompt };
}

/** Parse JSON IHC consult reply; returns structured fields + readable flag. */
export function parseIhcReply(text) {
  const raw = String(text ?? '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```(?:json)?/g, '')
    .replace(/,\s*([}\]])/g, '$1');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(raw.slice(start, end + 1));
      if (obj && (Array.isArray(obj.differential) || Array.isArray(obj.nextStains))) {
        return {
          summary: String(obj.summary || '').trim(),
          differential: Array.isArray(obj.differential) ? obj.differential : [],
          nextStains: Array.isArray(obj.nextStains) ? obj.nextStains : [],
          pitfalls: Array.isArray(obj.pitfalls) ? obj.pitfalls : [],
          commentDraft: typeof obj.commentDraft === 'string' ? obj.commentDraft.trim() : '',
          readable: true
        };
      }
    } catch { /* fall through */ }
  }
  return { summary: '', differential: [], nextStains: [], pitfalls: [], commentDraft: '', readable: false };
}

const tidyPlain = (s) => britishise(toAscii(String(s || ''))).replace(/\s+\n/g, '\n').trim();
const LIKELIHOOD_ORDER = { primary: 0, consider: 1, exclude: 2 };

/** Normalise and cap the parsed IHC consult into clean British-English plain text. */
export function vetIhcReply(parsed) {
  const differential = (parsed?.differential || [])
    .map((d) => ({
      entity: tidyPlain(d?.entity || '').slice(0, 120),
      likelihood: ['primary', 'consider', 'exclude'].includes(d?.likelihood) ? d.likelihood : 'consider',
      rationale: tidyPlain(d?.rationale || '').slice(0, 260),
      profile: tidyPlain(d?.profile || '').slice(0, 180)
    }))
    .filter((d) => d.entity)
    .sort((a, b) => (LIKELIHOOD_ORDER[a.likelihood] ?? 1) - (LIKELIHOOD_ORDER[b.likelihood] ?? 1))
    .slice(0, 5);

  const seenMarkers = new Set();
  const nextStains = [];
  for (const s of parsed?.nextStains || []) {
    const marker = tidyPlain(s?.marker || '').slice(0, 80);
    const purpose = tidyPlain(s?.purpose || '').slice(0, 220);
    if (!marker || seenMarkers.has(marker.toLowerCase())) continue;
    seenMarkers.add(marker.toLowerCase());
    nextStains.push({ marker, purpose });
    if (nextStains.length >= 8) break;
  }

  const pitfalls = (parsed?.pitfalls || [])
    .map((p) => tidyPlain(p).slice(0, 240))
    .filter(Boolean)
    .slice(0, 3);

  const commentDraft = tidyPlain(parsed?.commentDraft || '');
  const summary = tidyPlain(parsed?.summary || '');

  return { summary, differential, nextStains, pitfalls, commentDraft };
}

/** Append the drafted IHC comment into `caseState.comment` and return an undo snapshot. */
export function appendIhcComment(caseState, commentDraft) {
  const draft = tidyPlain(commentDraft);
  const prevComment = String(caseState?.comment || '');
  if (!draft) return { prevComment, changed: false };
  const sep = prevComment.trim() ? '\n\n' : '';
  caseState.comment = `${prevComment.trimEnd()}${sep}${draft}`;
  return { prevComment, changed: true };
}
