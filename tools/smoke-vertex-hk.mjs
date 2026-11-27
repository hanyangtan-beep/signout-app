#!/usr/bin/env node
// Standalone Hong Kong Vertex AI smoke-test script for Han Sign-out.
//
// Tests two live Vertex AI routes from Hong Kong (no AI Studio, no VPN):
//   1. Routine extraction -> gemini-3.5-flash-lite (thinkingLevel: LOW, maxOutputTokens: 600)
//      using a responseSchema compiled directly from schemas/colonic_polyp.json.
//   2. Cancer resection proofread / audit -> gemini-4-neon (thinkingLevel: MEDIUM, maxOutputTokens: 2500)
//      using src/proofread.js's real SYSTEM_PROMPT, parseReply, and vetReply guard on a
//      synthetic report with planted contradictions.
//
// Prerequisites (run once on your Mac):
//   npm install --no-save @google/genai
//   gcloud auth application-default login
//   gcloud config set project <YOUR_GCP_PROJECT_ID>
//
// Usage:
//   node tools/test-vertex-hk.mjs --dry-run
//   GOOGLE_CLOUD_PROJECT=han-signout-app node tools/test-vertex-hk.mjs
//   node tools/test-vertex-hk.mjs --project=han-signout-app --location=asia-southeast1

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM_PROMPT, buildPrompt, parseReply, vetReply } from '../src/proofread.js';
import { phiWarnings } from '../src/docformat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// Nov 2026 published Vertex AI / Gemini list rates (USD per 1M tokens) for rough cost reporting.
const RATES_PER_M = {
  'gemini-3.5-flash-lite': { input: 0.30, output: 2.50 },
  'gemini-4-neon': { input: 3.00, output: 15.00 }
};

function parseArgs(argv) {
  const opts = {
    project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || '',
    location: process.env.VERTEX_LOCATION || 'global',
    flashModel: process.env.VERTEX_FLASH_MODEL || 'gemini-3.5-flash-lite',
    neonModel: process.env.VERTEX_NEON_MODEL || 'gemini-4-neon',
    dryRun: false
  };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg.startsWith('--project=')) opts.project = arg.slice('--project='.length);
    else if (arg.startsWith('--location=')) opts.location = arg.slice('--location='.length);
    else if (arg.startsWith('--flash=')) opts.flashModel = arg.slice('--flash='.length);
    else if (arg.startsWith('--neon=')) opts.neonModel = arg.slice('--neon='.length);
  }
  return opts;
}

/**
 * Compile a compact Gemini responseSchema from a real signout-app schema file.
 * Keeps property names short and sends only the requested field IDs so Gemini's
 * constrained decoder never hits schema-size 400 errors.
 */
function buildResponseSchema(schemaJson, fieldIds) {
  const properties = {};
  const fieldsById = new Map((schemaJson.fields || []).map((f) => [f.id, f]));

  for (const id of fieldIds) {
    const f = fieldsById.get(id);
    if (!f) throw new Error(`Field "${id}" not found in schemas/${schemaJson.id}.json`);
    if (f.type === 'select' || f.type === 'grade') {
      properties[id] = {
        type: 'STRING',
        description: f.label || id,
        enum: f.options,
        nullable: true
      };
    } else if (f.type === 'checkbox') {
      properties[id] = {
        type: 'BOOLEAN',
        description: f.label || id,
        nullable: true
      };
    } else if (f.type === 'number') {
      properties[id] = {
        type: 'NUMBER',
        description: f.label || id,
        nullable: true
      };
    } else {
      properties[id] = {
        type: 'STRING',
        description: f.label || id,
        nullable: true
      };
    }
  }

  return {
    type: 'OBJECT',
    properties,
    required: fieldIds
  };
}

/** Structured JSON schema matching src/proofread.js's expected reply shape. */
const PROOFREAD_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    edits: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          section: { type: 'STRING', enum: ['SPECIMEN', 'MACRO', 'INTRAOP', 'MICRO', 'MOLECULAR', 'DX', 'COMMENT'] },
          find: { type: 'STRING' },
          replace: { type: 'STRING' },
          kind: { type: 'STRING', enum: ['spelling', 'grammar', 'house style'] },
          why: { type: 'STRING' }
        },
        required: ['section', 'find', 'replace', 'kind', 'why']
      }
    },
    flags: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          section: { type: 'STRING', enum: ['SPECIMEN', 'MACRO', 'INTRAOP', 'MICRO', 'MOLECULAR', 'DX', 'COMMENT'] },
          quote: { type: 'STRING' },
          replace: { type: 'STRING', nullable: true },
          why: { type: 'STRING' }
        },
        required: ['section', 'quote', 'why']
      }
    },
    rewrites: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          section: { type: 'STRING', enum: ['MACRO', 'INTRAOP', 'MICRO', 'COMMENT'] },
          text: { type: 'STRING' },
          why: { type: 'STRING' }
        },
        required: ['section', 'text', 'why']
      }
    }
  },
  required: ['edits', 'flags', 'rewrites']
};

function estimateCostUsd(model, usage) {
  const rate = RATES_PER_M[model];
  if (!rate || !usage) return null;
  const inTok = usage.promptTokenCount || 0;
  // On Gemini 4 / 3.x, thinking tokens bill at the output rate.
  const outTok = (usage.candidatesTokenCount || 0) + (usage.thoughtsTokenCount || 0);
  return (inTok / 1e6) * rate.input + (outTok / 1e6) * rate.output;
}

function assertPhiClean(label, texts) {
  const warnings = phiWarnings(texts);
  if (warnings.length) {
    throw new Error(`PHI guard blocked ${label}: ${warnings.join('; ')}`);
  }
}

async function main() {
  const opts = parseArgs(process.argv);

  // --- Prepare Test 1: Routine extraction from real schemas/colonic_polyp.json ---
  const polypSchemaPath = path.join(REPO_ROOT, 'schemas', 'colonic_polyp.json');
  const polypSchema = JSON.parse(fs.readFileSync(polypSchemaPath, 'utf8'));
  const extractFields = ['site', 'type', 'dysplasia', 'hgdFocal', 'margin', 'marginDistance'];
  const extractResponseSchema = buildResponseSchema(polypSchema, extractFields);
  const sampleDictation = 'Ascending colon polypectomy: 8 mm pedunculated tubular adenoma with focal high-grade dysplasia; stalk margin is clear by 2 mm.';
  assertPhiClean('Test 1 dictation', { dictation: sampleDictation });

  // --- Prepare Test 2: Escalated cancer resection proofread with planted contradictions ---
  const seededSections = [
    { key: 'specimens', tag: 'SPECIMEN', label: 'Specimen', text: 'Lung, left lower lobe, lobectomy.' },
    { key: 'macro', tag: 'MACRO', label: 'Macroscopic description', text: 'Received in formalin is a left lower lobectomy specimen weighing 140 g. Sectioning reveals a firm grey-white tumor measuring 4.5 x 3.2 x 2.8 cm with focal hemorrhage.' },
    {
      key: 'microscopy',
      tag: 'MICRO',
      label: 'Microscopic examination',
      text: [
        'MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:',
        '- Histologic type: Invasive adenocarcinoma, acinar predominant',
        '- Tumour size (greatest dimension): 2.5 cm',
        '- Surgical margins: Uninvolved by invasive carcinoma (bronchial margin clear by 12 mm)',
        '- Regional lymph nodes: 0 of 14 involved'
      ].join('\n')
    },
    { key: 'diagnosis', tag: 'DX', label: 'Diagnosis', text: 'LUNG, right lower lobe, lobectomy - INVASIVE ADENOCARCINOMA, acinar predominant, 2.5 cm; margins clear; 0 of 14 lymph nodes involved.' }
  ];
  assertPhiClean('Test 2 report', Object.fromEntries(seededSections.map((s) => [s.key, s.text])));
  const proofPrompt = buildPrompt(seededSections, '68-year-old with left lower lobe lung mass.');
  if (proofPrompt.error) throw new Error(proofPrompt.error);

  console.log('=== Han Sign-out Vertex AI (Hong Kong) Smoke Test ===');
  console.log(`Project : ${opts.project || '(unset)'}`);
  console.log(`Location: ${opts.location}`);
  console.log(`Flash   : ${opts.flashModel} (thinkingLevel: LOW, maxOutputTokens: 600)`);
  console.log(`Neon    : ${opts.neonModel} (thinkingLevel: MEDIUM, maxOutputTokens: 2500)`);
  console.log('');

  if (opts.dryRun) {
    console.log('[DRY RUN] Compiled responseSchema from schemas/colonic_polyp.json:');
    console.log(JSON.stringify(extractResponseSchema, null, 2));
    console.log('\n[DRY RUN] PHI guard passed for both payloads.');
    console.log(`[DRY RUN] Proofread prompt length: ${proofPrompt.prompt.length} chars (system: ${SYSTEM_PROMPT.length} chars).`);
    console.log('[DRY RUN] Ready for live run with GOOGLE_CLOUD_PROJECT=<your-project-id>.');
    return;
  }

  if (!opts.project) {
    console.error('Error: Set GOOGLE_CLOUD_PROJECT or pass --project=<gcp-project-id>.');
    process.exit(1);
  }

  let GoogleGenAI;
  try {
    ({ GoogleGenAI } = await import('@google/genai'));
  } catch {
    console.error('Error: @google/genai is not installed.');
    console.error('Run once (without modifying package.json): npm install --no-save @google/genai');
    process.exit(1);
  }

  const ai = new GoogleGenAI({
    vertexai: true,
    project: opts.project,
    location: opts.location
  });

  // --- Execute Test 1: gemini-3.5-flash-lite ---
  console.log(`--- Test 1: Routine extraction (${opts.flashModel}) ---`);
  const t1Start = Date.now();
  const res1 = await ai.models.generateContent({
    model: opts.flashModel,
    contents: `Extract structured pathology fields from this dictation. Return null for any field not explicitly stated.\n\nDictation: ${sampleDictation}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: extractResponseSchema,
      maxOutputTokens: 600,
      thinkingConfig: { thinkingLevel: 'LOW' }
    }
  });
  const t1Ms = Date.now() - t1Start;
  const parsed1 = JSON.parse(res1.text || '{}');

  // Verify every returned enum is strictly valid in schemas/colonic_polyp.json.
  const fieldsById = new Map(polypSchema.fields.map((f) => [f.id, f]));
  const invalidEnums = [];
  for (const id of extractFields) {
    const f = fieldsById.get(id);
    const val = parsed1[id];
    if (val != null && Array.isArray(f.options) && !f.options.includes(val)) {
      invalidEnums.push(`${id}=${JSON.stringify(val)}`);
    }
  }
  const u1 = res1.usageMetadata || {};
  const c1 = estimateCostUsd(opts.flashModel, u1);
  console.log(`Latency : ${t1Ms} ms`);
  console.log(`Tokens  : prompt=${u1.promptTokenCount ?? '?'} out=${u1.candidatesTokenCount ?? '?'} think=${u1.thoughtsTokenCount ?? 0}${c1 !== null ? ` (~$${c1.toFixed(5)})` : ''}`);
  console.log('Output  :', JSON.stringify(parsed1));
  console.log(`Schema  : ${invalidEnums.length ? `FAIL (${invalidEnums.join(', ')})` : 'PASS (all enum values valid in schemas/colonic_polyp.json)'}`);
  console.log('');

  // --- Execute Test 2: gemini-4-neon ---
  console.log(`--- Test 2: Escalated resection proofread (${opts.neonModel}) ---`);
  const t2Start = Date.now();
  const res2 = await ai.models.generateContent({
    model: opts.neonModel,
    contents: proofPrompt.prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: PROOFREAD_RESPONSE_SCHEMA,
      maxOutputTokens: 2500,
      // Gemini 4 Neon: use thinkingLevel (LOW | MEDIUM | HIGH | XHIGH).
      // Never set thinkingBudget (returns 400 INVALID_ARGUMENT) or temperature/topP.
      thinkingConfig: { thinkingLevel: 'MEDIUM' }
    }
  });
  const t2Ms = Date.now() - t2Start;
  const reply2 = parseReply(res2.text || '');
  const vetted2 = vetReply(reply2, seededSections);
  const u2 = res2.usageMetadata || {};
  const c2 = estimateCostUsd(opts.neonModel, u2);

  const edits = vetted2.items.filter((i) => i.kind !== 'check' && i.kind !== 'rewrite');
  const flags = vetted2.items.filter((i) => i.kind === 'check');
  const caughtSize = flags.some((f) => /4\.5|2\.5|size|dimension/i.test(`${f.quote} ${f.why}`));
  const caughtSide = flags.some((f) => /left|right|side|laterality/i.test(`${f.quote} ${f.why}`));

  console.log(`Latency : ${t2Ms} ms`);
  console.log(`Tokens  : prompt=${u2.promptTokenCount ?? '?'} out=${u2.candidatesTokenCount ?? '?'} think=${u2.thoughtsTokenCount ?? 0}${c2 !== null ? ` (~$${c2.toFixed(5)})` : ''}`);
  console.log(`Vetted  : ${edits.length} safe edit(s), ${flags.length} clinical flag(s), dropped=${JSON.stringify(vetted2.dropped)}`);
  for (const e of edits) console.log(`  [EDIT:${e.section}] "${e.find}" -> "${e.replace}" (${e.why})`);
  for (const f of flags) console.log(`  [FLAG:${f.section}] "${f.quote}" — ${f.why}`);
  console.log(`Checks  : size contradiction=${caughtSize ? 'CAUGHT' : 'MISSED'}, side contradiction=${caughtSide ? 'CAUGHT' : 'MISSED'}`);
}

main().catch((err) => {
  console.error('\nSmoke test failed:', err?.message || err);
  process.exit(1);
});
