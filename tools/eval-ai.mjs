#!/usr/bin/env node
// Benchmark harness for Han Sign-out Vertex AI models:
// Compares gemini-3.5-flash-lite (LOW), gemini-4-neon (LOW), and gemini-4-neon (MEDIUM)
// across 10 real golden fixtures (false-positive / noise test) plus 5 seeded contradiction
// cases derived from real resection fixtures (clinical recall test).
//
// Usage:
//   node tools/eval-ai.mjs --dry-run
//   GOOGLE_APPLICATION_CREDENTIALS=~/Downloads/han-signout-app-877526515988.json \
//   GOOGLE_CLOUD_PROJECT=han-signout-app \
//   node tools/eval-ai.mjs
//
// Optional flags:
//   --profiles=flash,neon-low,neon-med   Subset of profiles to run
//   --only=seeded | --only=clean         Run only seeded or clean cases
//   --location=global                    Vertex AI location (default: global)
//   --out=eval-results.json              Write detailed JSON results to a file

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM_PROMPT, buildPrompt, parseReply, vetReply, reportSections } from '../src/proofread.js';
import { phiWarnings } from '../src/docformat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const PROFILES = {
  flash: { label: 'Flash-Lite (LOW)', model: 'gemini-3.5-flash-lite', thinkingLevel: 'LOW', maxOutputTokens: 4096, inRate: 0.30, outRate: 2.50 },
  flash38: { label: '3.8 Flash (MED)', model: 'gemini-3.8-flash', thinkingLevel: 'MEDIUM', maxOutputTokens: 8192, inRate: 0.75, outRate: 3.75 },
  'flash38-low': { label: '3.8 Flash (LOW)', model: 'gemini-3.8-flash', thinkingLevel: 'LOW', maxOutputTokens: 4096, inRate: 0.75, outRate: 3.75 },
  hydrogen: { label: 'Hydrogen (MED)', model: 'gemini-4-hydrogen', thinkingLevel: 'MEDIUM', maxOutputTokens: 8192, inRate: 1.50, outRate: 7.50 },
  'hydrogen-high': { label: 'Hydrogen (HIGH)', model: 'gemini-4-hydrogen', thinkingLevel: 'HIGH', maxOutputTokens: 12000, inRate: 1.50, outRate: 7.50 },
  'neon-low': { label: 'Neon (LOW)', model: 'gemini-4-neon', thinkingLevel: 'LOW', maxOutputTokens: 6000, inRate: 3.00, outRate: 15.00 },
  'neon-med': { label: 'Neon (MEDIUM)', model: 'gemini-4-neon', thinkingLevel: 'MEDIUM', maxOutputTokens: 8192, inRate: 3.00, outRate: 15.00 }
};

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

const FIXTURE_SPECS = [
  { id: 'gastric-hp', kind: 'biopsy', file: 'tests/fixtures/gastric/02-load-example-hp-ulcer-im.json' },
  { id: 'colonic-ssl', kind: 'biopsy', file: 'tests/fixtures/colonic/05-serrated-with-comments.json' },
  { id: 'breast-ish', kind: 'biomarker', file: 'tests/fixtures/breast_ish/02-group2-positive-optimal-timings.json' },
  { id: 'breast-ca', kind: 'cancer resection', file: 'tests/fixtures/breast_ca/02-wle-nst-grade1-biomarkers-performed.json' },
  { id: 'endometrium', kind: 'cancer resection', file: 'tests/fixtures/endometrium/01-endometrioid-ia2-nsmp.json' },
  { id: 'lung-ca', kind: 'cancer resection', file: 'tests/fixtures/lung/03-lobectomy-acinar-pl1-n2a.json' },
  { id: 'cns-gbm', kind: 'cancer resection', file: 'tests/fixtures/cns_tumour/01-glioblastoma-idh-wildtype.json' },
  { id: 'whipple-pdac', kind: 'cancer resection', file: 'tests/fixtures/whipple/pancreas-01-pdac-pt2-pn1-sma-margin-r1.json' },
  { id: 'lymphoma-dlbcl', kind: 'cancer resection', file: 'tests/fixtures/lymphoma_node/01-dlbcl-excision-non-gcb.json' },
  { id: 'sarcoma-ups', kind: 'cancer resection', file: 'tests/fixtures/soft_tissue_sarcoma/01-ups-thigh-g3-pt3.json' }
];

function parseArgs(argv) {
  const opts = {
    project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || '',
    location: process.env.VERTEX_LOCATION || 'global',
    profiles: ['flash', 'neon-low', 'neon-med'],
    only: 'all',
    out: '',
    dryRun: false
  };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg.startsWith('--project=')) opts.project = arg.slice('--project='.length);
    else if (arg.startsWith('--location=')) opts.location = arg.slice('--location='.length);
    else if (arg.startsWith('--profiles=')) opts.profiles = arg.slice('--profiles='.length).split(',').filter(Boolean);
    else if (arg.startsWith('--only=')) opts.only = arg.slice('--only='.length);
    else if (arg.startsWith('--out=')) opts.out = arg.slice('--out='.length);
  }
  return opts;
}

/**
 * Convert a golden fixture JSON into the { key, tag, label, text } sections array
 * expected by src/proofread.js.
 */
function sectionsFromFixture(fixture) {
  if (fixture.expected && (fixture.expected.specimens || fixture.expected.microscopy || fixture.expected.diagnosis)) {
    return reportSections(fixture.expected);
  }
  if (fixture.molecular || fixture.diagnosis) {
    return reportSections({
      specimens: String(fixture.report || '').split('\n\n')[0] || '',
      molecular: fixture.molecular || '',
      diagnosis: fixture.diagnosis || '',
      comment: fixture.comment || ''
    });
  }
  const raw = String(fixture.report || fixture.expected?.report || '').trim();
  const blocks = raw.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (!blocks.length) return [];

  // Identify diagnosis (usually the last block opening with an ALL-CAPS organ line) and comment.
  let comment = '';
  let dxIdx = blocks.length - 1;
  if (dxIdx > 0 && !/^(?:\([A-Z]\)\s+)?[A-Z][A-Z0-9 ,()/&-]{2,}/.test(blocks[dxIdx])) {
    comment = blocks[dxIdx];
    dxIdx--;
  }
  const specimens = blocks[0];
  const diagnosis = dxIdx > 0 ? blocks[dxIdx] : '';
  const middle = blocks.slice(1, dxIdx);

  // Separate macroscopy (first descriptive paragraph) from microscopy/synoptic (skipping block keys like "(1) ...").
  let macro = '';
  const microParts = [];
  for (let i = 0; i < middle.length; i++) {
    const b = middle[i];
    if (i === 0 && !/^(?:Specimen and tumour|Microscopic|Sections show|\([A-Z]\))/i.test(b)) {
      macro = b;
    } else if (/^\(1[)-]/.test(b)) {
      // Block key — intentionally omitted by src/proofread.js
      continue;
    } else {
      microParts.push(b);
    }
  }

  return reportSections({
    specimens,
    macro,
    microscopy: microParts.join('\n\n'),
    diagnosis,
    comment
  });
}

function cloneSections(sections) {
  return sections.map((s) => ({ ...s }));
}

function mutateSection(sections, key, replacer) {
  const copy = cloneSections(sections);
  const target = copy.find((s) => s.key === key);
  if (!target) throw new Error(`Section "${key}" not found for mutation`);
  const next = replacer(target.text);
  if (next === target.text) throw new Error(`Mutation on "${key}" did not change text`);
  target.text = next;
  return copy;
}

/** Build 5 clinically realistic seeded-contradiction cases from real resection fixtures. */
function buildSeededCases(cleanById) {
  return [
    {
      id: 'seed-lung-size',
      kind: 'cancer resection',
      seeded: true,
      description: 'Lung macro size 45 mm vs synoptic/dx 23 mm',
      expectRe: /45|23|size|dimension/i,
      sections: mutateSection(cleanById.get('lung-ca').sections, 'macro', (t) => t.replace('23 mm', '45 mm').replace('23 x 20 x 18 mm', '45 x 38 x 30 mm'))
    },
    {
      id: 'seed-lung-side',
      kind: 'cancer resection',
      seeded: true,
      description: 'Lung diagnosis left vs specimen/macro right',
      expectRe: /left|right|side|laterality/i,
      sections: mutateSection(cleanById.get('lung-ca').sections, 'diagnosis', (t) => t.replace(/right upper lobe/i, 'left upper lobe'))
    },
    {
      id: 'seed-breast-nodes',
      kind: 'cancer resection',
      seeded: true,
      description: 'Breast diagnosis side flipped against specimen',
      expectRe: /left|right|side|laterality/i,
      sections: mutateSection(cleanById.get('breast-ca').sections, 'diagnosis', (t) => (/left/i.test(t) ? t.replace(/left/i, 'right') : t.replace(/right/i, 'left')))
    },
    {
      id: 'seed-whipple-margin',
      kind: 'cancer resection',
      seeded: true,
      description: 'Whipple diagnosis claims clear margin vs synoptic involved',
      expectRe: /margin|involved|clear|R1|SMA|uninvolved/i,
      sections: mutateSection(cleanById.get('whipple-pdac').sections, 'diagnosis', (t) => t.replace(/involved/i, 'clear'))
    },
    {
      id: 'seed-sarcoma-grade',
      kind: 'cancer resection',
      seeded: true,
      description: 'Sarcoma diagnosis Grade 1 vs synoptic Grade 3',
      expectRe: /grade\s*1|grade\s*3|fnclcc|grade/i,
      sections: mutateSection(cleanById.get('sarcoma-ups').sections, 'diagnosis', (t) => t.replace(/Grade 3/i, 'Grade 1'))
    }
  ];
}

function p95(nums) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
}

async function runCase(ai, profile, testCase) {
  const promptObj = buildPrompt(testCase.sections, '');
  if (promptObj.error) throw new Error(`${testCase.id}: ${promptObj.error}`);
  const start = Date.now();
  const res = await ai.models.generateContent({
    model: profile.model,
    contents: promptObj.prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: PROOFREAD_RESPONSE_SCHEMA,
      maxOutputTokens: profile.maxOutputTokens,
      thinkingConfig: { thinkingLevel: profile.thinkingLevel }
    }
  });
  const ms = Date.now() - start;
  const parsed = parseReply(res.text || '');
  const vetted = vetReply(parsed, testCase.sections);
  const edits = vetted.items.filter((i) => i.kind !== 'check' && i.kind !== 'rewrite');
  const flags = vetted.items.filter((i) => i.kind === 'check');
  const rewrites = vetted.items.filter((i) => i.kind === 'rewrite');

  const u = res.usageMetadata || {};
  const inTok = u.promptTokenCount || 0;
  const outTok = u.candidatesTokenCount || 0;
  const thinkTok = u.thoughtsTokenCount || 0;
  const costUsd = (inTok / 1e6) * profile.inRate + ((outTok + thinkTok) / 1e6) * profile.outRate;

  const caught = testCase.seeded
    ? flags.some((f) => testCase.expectRe.test(`${f.quote} ${f.why} ${f.suggestion || ''}`))
    : null;

  return {
    caseId: testCase.id,
    seeded: !!testCase.seeded,
    ms,
    inTok,
    outTok,
    thinkTok,
    costUsd,
    editsCount: edits.length,
    flagsCount: flags.length,
    rewritesCount: rewrites.length,
    caught,
    flags: flags.map((f) => ({ section: f.section, quote: f.quote, why: f.why })),
    edits: edits.map((e) => ({ section: e.section, find: e.find, replace: e.replace, why: e.why }))
  };
}

async function main() {
  const opts = parseArgs(process.argv);

  const cleanCases = FIXTURE_SPECS.map((spec) => {
    const raw = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, spec.file), 'utf8'));
    const sections = sectionsFromFixture(raw);
    if (!sections.length) throw new Error(`No sections extracted from ${spec.file}`);
    const warnings = phiWarnings(Object.fromEntries(sections.map((s) => [s.key, s.text])));
    if (warnings.length) throw new Error(`PHI guard triggered on ${spec.id}: ${warnings.join('; ')}`);
    return { ...spec, seeded: false, sections };
  });

  const cleanById = new Map(cleanCases.map((c) => [c.id, c]));
  const seededCases = buildSeededCases(cleanById);

  const selectedCases = opts.only === 'clean'
    ? cleanCases
    : opts.only === 'seeded'
      ? seededCases
      : [...cleanCases, ...seededCases];

  const activeProfiles = opts.profiles.map((id) => {
    if (!PROFILES[id]) throw new Error(`Unknown profile "${id}". Valid: ${Object.keys(PROFILES).join(', ')}`);
    return { id, ...PROFILES[id] };
  });

  console.log('=== Han Sign-out AI Model Benchmark ===');
  console.log(`Profiles: ${activeProfiles.map((p) => p.label).join(' | ')}`);
  console.log(`Cases   : ${selectedCases.filter((c) => !c.seeded).length} clean fixtures + ${selectedCases.filter((c) => c.seeded).length} seeded contradictions = ${selectedCases.length} total`);
  console.log(`Project : ${opts.project || '(unset)'} (${opts.location})\n`);

  if (opts.dryRun) {
    for (const c of selectedCases) {
      const chars = c.sections.reduce((n, s) => n + s.text.length, 0);
      console.log(`  [${c.seeded ? 'SEED ' : 'CLEAN'}] ${c.id.padEnd(18)} sections=${c.sections.length} chars=${chars}${c.description ? ` — ${c.description}` : ''}`);
    }
    console.log('\n[DRY RUN] All 15 cases loaded, mutated, and passed PHI guard cleanly.');
    return;
  }

  if (!opts.project) {
    console.error('Error: Set GOOGLE_CLOUD_PROJECT or pass --project=han-signout-app.');
    process.exit(1);
  }

  let GoogleGenAI;
  try {
    ({ GoogleGenAI } = await import('@google/genai'));
  } catch {
    console.error('Error: @google/genai is not installed. Run: npm install --no-save @google/genai');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ vertexai: true, project: opts.project, location: opts.location });
  const allResults = {};

  for (const profile of activeProfiles) {
    console.log(`\n--- Running profile: ${profile.label} (${profile.model}, ${profile.thinkingLevel}) ---`);
    const rows = [];
    for (const tc of selectedCases) {
      try {
        const r = await runCase(ai, profile, tc);
        rows.push(r);
        const tag = tc.seeded ? (r.caught ? 'CAUGHT' : 'MISSED') : `clean(e=${r.editsCount},f=${r.flagsCount})`;
        console.log(`  ${tc.id.padEnd(18)} ${String(r.ms).padStart(6)} ms | think=${String(r.thinkTok).padStart(4)} | $${r.costUsd.toFixed(4)} | ${tag}`);
      } catch (err) {
        console.log(`  ${tc.id.padEnd(18)} ERROR: ${err?.message || err}`);
        rows.push({ caseId: tc.id, seeded: !!tc.seeded, error: String(err?.message || err) });
      }
    }
    allResults[profile.id] = rows;
  }

  // --- Summary table ---
  console.log('\n=== Summary Comparison ===');
  console.log('Profile            | Recall   | Clean Noise (e/f) | Avg ms | P95 ms | Avg $/case | 500/mo $');
  console.log('-------------------+----------+-------------------+--------+--------+------------+---------');
  for (const profile of activeProfiles) {
    const rows = (allResults[profile.id] || []).filter((r) => !r.error);
    const clean = rows.filter((r) => !r.seeded);
    const seeded = rows.filter((r) => r.seeded);
    const caught = seeded.filter((r) => r.caught).length;
    const avgE = clean.length ? (clean.reduce((s, r) => s + r.editsCount, 0) / clean.length).toFixed(1) : '-';
    const avgF = clean.length ? (clean.reduce((s, r) => s + r.flagsCount, 0) / clean.length).toFixed(1) : '-';
    const avgMs = rows.length ? Math.round(rows.reduce((s, r) => s + r.ms, 0) / rows.length) : 0;
    const p95Ms = Math.round(p95(rows.map((r) => r.ms)));
    const avgCost = rows.length ? rows.reduce((s, r) => s + r.costUsd, 0) / rows.length : 0;
    const mo500 = avgCost * 500;
    const recallStr = seeded.length ? `${caught}/${seeded.length}` : '-';
    console.log(
      `${profile.label.padEnd(18)} | ${recallStr.padEnd(8)} | ${`${avgE} / ${avgF}`.padEnd(17)} | ${String(avgMs).padStart(6)} | ${String(p95Ms).padStart(6)} | $${avgCost.toFixed(4).padStart(9)} | $${mo500.toFixed(2)}`
    );
  }

  if (opts.out) {
    fs.writeFileSync(opts.out, JSON.stringify({ project: opts.project, location: opts.location, results: allResults }, null, 2));
    console.log(`\nSaved detailed results to ${opts.out}`);
  }
}

main().catch((err) => {
  console.error('\nEval failed:', err?.message || err);
  process.exit(1);
});
