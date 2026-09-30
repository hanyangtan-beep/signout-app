#!/usr/bin/env node
// Scaffold a new template: schema, generator, test, fixture directory, manifest entry.
//
//   node scripts/new-template.mjs <id> --system <S> --kind <K> \
//        --name "Pancreatic biopsy" --label Pancreas --organ PANCREAS \
//        [--short "Pancreas · biopsy"] [--rank 40] [--aliases "IPMN,PanIN"] \
//        [--qmh path/to/saved-page.html] [--force]
//
// It writes the boilerplate — the imports, the block wiring, the standard assertions, the
// metadata keys build-manifest.mjs demands — and nothing else. The clinical content is yours:
// every `TODO` it leaves is a decision the scaffold cannot make. It refuses to overwrite an
// existing schema, generator or test unless you pass --force.
//
// With --qmh it also runs tools/import-qmh.js over a saved QMH CancerReportingTemplate page
// and drops the element draft beside the schema as <id>.qmh-draft.json for curation by hand.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SYSTEMS = ['GI', 'Hepatobiliary', 'GU', 'Gynae', 'Breast', 'Thoracic', 'Head and neck',
  'Skin', 'Cardiovascular', 'Lymphoid', 'Soft tissue', 'Endocrine', 'CNS', 'Frozen', 'Cytology'];
const KINDS = ['biopsy', 'benign resection', 'cancer resection', 'frozen', 'cytology'];

function parseArgs(argv) {
  const [id, ...rest] = argv;
  const opt = {};
  for (let i = 0; i < rest.length; i += 1) {
    if (!rest[i].startsWith('--')) continue;
    const key = rest[i].slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) opt[key] = true;
    else { opt[key] = next; i += 1; }
  }
  return { id, opt };
}

function die(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

const { id, opt } = parseArgs(process.argv.slice(2));
if (!id || id === true || id.startsWith('--')) {
  die('usage: node scripts/new-template.mjs <id> --system <S> --kind <K> --name "<Name>" --label <Label> --organ <ORGAN>');
}
if (!/^[a-z][a-z0-9_]*$/.test(id)) die(`id "${id}" must be lower_snake_case`);
if (!SYSTEMS.includes(opt.system)) die(`--system must be one of: ${SYSTEMS.join(', ')}`);
if (!KINDS.includes(opt.kind)) die(`--kind must be one of: ${KINDS.join(', ')}`);
for (const k of ['name', 'label', 'organ']) if (!opt[k] || opt[k] === true) die(`--${k} is required`);

const generatorName = opt.generator && opt.generator !== true ? opt.generator : id;
const paths = {
  schema: join(ROOT, 'schemas', `${id}.json`),
  generator: join(ROOT, 'generators', `${generatorName}.js`),
  test: join(ROOT, 'tests', `${id}.test.js`),
  fixtures: join(ROOT, 'tests', 'fixtures', id)
};
if (!opt.force) {
  for (const [what, p] of Object.entries(paths)) {
    if (what !== 'fixtures' && existsSync(p)) die(`${p} already exists — pass --force only if you mean to overwrite it`);
  }
}

const isCancer = opt.kind === 'cancer resection';
const isResection = isCancer || opt.kind === 'benign resection';
const short = opt.short && opt.short !== true ? opt.short : `${opt.label} · ${opt.kind === 'biopsy' ? 'biopsy' : opt.kind}`;
const aliases = opt.aliases && opt.aliases !== true ? String(opt.aliases).split(',').map((s) => s.trim()).filter(Boolean) : [];

// ---------- schema ----------

const schema = {
  id,
  version: new Date().toISOString().slice(0, 7).replace('-', '.'),
  name: opt.name,
  shortName: short,
  label: opt.label,
  organ: opt.organ,
  system: opt.system,
  kind: opt.kind,
  rank: Number(opt.rank) || 100,
  aliases,
  match: { site: [String(opt.label).toLowerCase()], procedure: [], clinical: [] },
  specimenNoun: opt.kind === 'biopsy' ? 'biopsy' : 'specimen',
  maxParts: 6,
  defaultParts: 1,
  generator: generatorName,
  style: { british: true },
  caseFields: [],
  options: [
    { $use: 'includeHeader' },
    ...(isResection ? [{ id: 'macro', label: 'Generate the macroscopic description and block key', type: 'checkbox', default: true }] : []),
    ...(isCancer ? [
      { id: 'synopticOnly', label: 'Synoptic report only (omit the narrative paragraph)', type: 'checkbox', default: false },
      { $use: 'printPTNM' },
      { id: 'stageGroup', label: 'Print the AJCC stage group under the pTNM', type: 'checkbox', default: false }
    ] : [])
  ],
  partDefaults: [],
  fields: [
    { id: 'specimenName', label: 'Specimen as received', type: 'text', placeholder: 'TODO: a worked example, e.g. Left breast, total mastectomy', default: '' },
    ...(isResection ? [
      { id: 'macroDescription', label: 'Macroscopic description', type: 'textarea', group: 'Macroscopy', placeholder: 'TODO', default: '' },
      { id: 'blocks', label: 'Blocks', type: 'number', group: 'Macroscopy', min: 0, step: 1, default: '' },
      { id: 'blockKeyText', label: 'Block key', type: 'textarea', group: 'Macroscopy', placeholder: '1. TODO\n2. TODO', default: '' }
    ] : []),
    { id: 'additionalNotes', label: 'Additional microscopy', type: 'textarea', placeholder: '', default: '' }
  ],
  ...(isResection ? { macroExtract: { blocks: { concept: 'blocks', unit: 'count' } } } : {}),
  ...(isCancer ? { source: { template: 'TODO: QMH page name', url: 'TODO', capProtocol: 'TODO', staging: 'TODO: AJCC 8th edition', stagingProtocol: 'TODO' } } : {}),
  example: {
    caseTitle: '',
    options: { includeHeader: false },
    parts: [{
      label: 'A',
      values: {
        specimenName: 'TODO',
        ...(isResection ? { macroDescription: 'TODO', blocks: '1', blockKeyText: '1. TODO' } : {})
      }
    }]
  }
};

// ---------- generator ----------

const gen = `// ${opt.name} generator (${opt.kind}).
//
// TODO: record here what this template does, which QMH page or protocol the elements come
// from, and any deliberate house departures. Knowledge grounding and source URLs live in
// comments like this one — never in a printed sentence.
//
// Blocks produced:
//   specimenName / specimens${isResection ? '\n//   macro                     the "(A) Received in formalin is a …" paragraph\n//   blockKey                  the typed block key, one "(n) …" entry per line' : ''}${isCancer ? '\n//   synoptic                  sectioned "- Element: value" list in QMH order' : ''}
//   microscopy                opens "Sections show …"
//   diagnosis
// Wording is protected by tests/${id}.test.js — change it only deliberately.

import { stripDot${isResection ? ', letteredBlockKey' : ''}${isCancer ? ', checks' : ''} } from './_house.js';

${isResection ? "const lettered = (part, ctx) => (ctx?.parts?.length || 1) > 1;\n" : ''}

export function specimenName(part) {
  return stripDot(part.values.specimenName) || 'TODO';
}

// The engine builds the SPECIMEN block from specimenName and letters it for multi-part cases,
// so a generator only exports "specimens" when it needs a different line shape — and then the
// signature is (parts, ctx), the whole array, not one part.
${isResection ? `
export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const d = stripDot(part.values.macroDescription);
  return d ? \`\${lettered(part, ctx) ? \`(\${part.label}) \` : ''}\${d}.\` : '';
}

export const blockKey = (part, ctx) => letteredBlockKey(part, ctx, { lettered, strip: stripDot });
` : ''}${isCancer ? `
// The engine calls synoptic() INSTEAD of microscopy() when a generator exports it, and prints
// the result under a SYNOPTIC REPORT heading — so the narrative paragraph belongs in here too,
// above the element list, unless the case turns synopticOnly on.
export function synoptic(part, ctx) {
  const elements = ['- TODO: element list in the QMH page order'];  // TODO
  const narrative = ctx?.options?.synopticOnly ? '' : microscopy(part, ctx);
  return [narrative, elements.join('\\n')].filter(Boolean).join('\\n\\n');
}

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn } = checks();
  // TODO: the checks this template needs. err() blocks, warn() advises.
  void v; void err; void warn;
  return out;
}
` : ''}
export function microscopy(part, ctx) {
  const extra = stripDot(part.values.additionalNotes);
  // TODO: the morphology sentences. Released-report prose only — what is seen, nothing else.
  const sentences = ['TODO'];
  if (extra) sentences.push(extra);
  return \`Sections show \${sentences.join('. ')}.\`;
}

export function diagnosis(part) {
  // Return the part's whole diagnosis: its lettered specimen line and the "- " clauses under it. The engine
  // prints the text as returned, and drops the letter when the case has one part.
  return \`(\${part.label}) TODO:\\n- TODO\`;
}

// The registry loads this default export; a generator without one is not wired in.
export default { specimenName, microscopy, diagnosis${isResection ? ', macro, blockKey' : ''}${isCancer ? ', synoptic, validate' : ''} };
`;

// ---------- test ----------

const testSrc = `// ${opt.name} template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';

const registry = await loadAll();
const t = registry.${id};
const run = (c) => generate(t.schema, t.generator, c);
const example = () => ({ ...JSON.parse(JSON.stringify(t.schema.example)), schemaId: t.schema.id });
const one = (values) => {
  const c = createCase(t.schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has ${id}');
  assert.equal(t.schema.system, ${JSON.stringify(opt.system)});
  assert.equal(t.schema.kind, ${JSON.stringify(opt.kind)});
  assert.ok(t.schema.label && !/^(biopsy|polyp|specimen)$/i.test(t.schema.label), 'label is an organ word');
  assert.ok(t.schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
});

test('the example case renders every expected block', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = run(c);
  assert.match(r.report, /SPECIMENS?:/);
  assert.match(r.report, ${isCancer ? '/SYNOPTIC REPORT:/' : '/MICROSCOPIC EXAMINATION:/'});
  assert.match(r.report, /DIAGNOSIS:/);${isResection ? `
  assert.match(r.report, /MACROSCOPIC DESCRIPTION:/);` : ''}
});

test('microscopy opens "Sections show"', () => {
  const r = run(one({ specimenName: 'TODO' }));
  assert.match(r.microscopy, /Sections show /);
});

test('a multi-part case letters its specimens', () => {
  const r = run(createCase(t.schema, 2));
  assert.match(r.specimens, /\\(A\\)/);
  assert.match(r.specimens, /\\(B\\)/);
});

// TODO: the assertions that actually matter for this template — the wording of each
// morphology sentence, the diagnosis line, and every branch of the form.
void one;
`;

writeFileSync(paths.schema, `${JSON.stringify(schema, null, 1)}\n`);
writeFileSync(paths.generator, gen);
writeFileSync(paths.test, testSrc);
mkdirSync(paths.fixtures, { recursive: true });

let qmhNote = '';
if (opt.qmh && opt.qmh !== true) {
  const draft = join(ROOT, 'schemas', `${id}.qmh-draft.json`);
  try {
    const out = execFileSync('node', [join(ROOT, 'tools', 'import-qmh.js'), opt.qmh], { encoding: 'utf8' });
    writeFileSync(draft, out);
    qmhNote = `\n  QMH element draft  schemas/${id}.qmh-draft.json (curate by hand into fields, then delete)`;
  } catch (e) {
    qmhNote = `\n  QMH import FAILED: ${e.message.split('\n')[0]}`;
  }
}

execFileSync('node', [join(ROOT, 'scripts', 'build-manifest.mjs')], { stdio: 'inherit' });

process.stdout.write(`
scaffolded ${id}

  schema             schemas/${id}.json
  generator          generators/${generatorName}.js
  test               tests/${id}.test.js
  fixtures           tests/fixtures/${id}/
  manifest           rebuilt${qmhNote}

Next, in order:
  1. Fill the fields. Every TODO in the schema is a question the scaffold could not answer.
  2. Fill the generator. Printed sentences are released-report prose — what is seen, nothing
     else. No WHO citations, no exclusion logic, no prognostic commentary. Grounding goes in
     comments.
  3. Replace the placeholder assertions in the test with the wording you actually want.
  4. npm test, then npm run release.
`);
