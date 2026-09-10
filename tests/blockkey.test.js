import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCase, BLOCK_ORDER, HEADERS } from '../src/engine.js';
import { buildDocText } from '../src/docformat.js';

// A minimal benign-resection style template exercising the Phase 4b `blockKey` export.
const schema = {
  id: 'toy_resection', version: '1', name: 'Toy', shortName: 'Toy · resection', label: 'Toy', organ: 'TOY',
  system: 'GI', kind: 'benign resection', rank: 99, aliases: [], specimenNoun: 'resection', maxParts: 3, defaultParts: 1,
  generator: 'toy', style: { british: true }, caseFields: [],
  options: [{ id: 'macro', label: 'macro', type: 'checkbox', default: true }],
  fields: [
    { id: 'size', label: 'Size', type: 'text', default: '', group: 'Macroscopy' },
    { id: 'blocks', label: 'Blocks', type: 'number', default: 3, group: 'Macroscopy' },
    { id: 'result', label: 'Result', type: 'select', options: ['Benign', 'Other'], default: 'Benign' }
  ],
  example: { parts: [{ label: 'A', values: { size: '2', blocks: 3, result: 'Benign' } }] }
};
const gen = {
  specimenName: () => 'Toy, resection',
  macro: (p, ctx) => (ctx.options.macro === false ? '' : `(${p.label}) Received in formalin is a toy measuring ${p.values.size} cm. Representative sections in ${p.values.blocks} blocks.`),
  blockKey: (p, ctx) => (ctx.options.macro === false ? '' : `(${p.label}) (1) Margin. (2) Body. (3) Tip.`),
  microscopy: (p) => `(${p.label}) Sections show a benign toy.`,
  diagnosis: (p) => `(${p.label}) TOY, resection - BENIGN`
};
const templates = { toy_resection: { schema, generator: gen } };
const mk = (n, options = {}) => ({
  schemaId: 'toy_resection', options, comment: '', meta: { accession: 'S25/1', status: 'draft', clinical: '', macro: '', blockKey: '' },
  parts: Array.from({ length: n }, (_, i) => ({ label: 'ABC'[i], values: { size: '2', blocks: 3, result: 'Benign' } }))
});

test('blockKey is a first-class block between macro and intraop', () => {
  assert.deepEqual(BLOCK_ORDER.slice(0, 4), ['specimens', 'macro', 'blockKey', 'intraop']);
  assert.equal(HEADERS.blockKey, 'BLOCK KEY:');
});

test('single-part case prints the house (1) (2) (3) block key without a part letter', () => {
  const out = generateCase(templates, mk(1));
  assert.equal(out.blockKey, '(1) Margin. (2) Body. (3) Tip.');
  assert.match(out.macro, /^Received in formalin/);
  assert.ok(out.report.indexOf(out.macro) < out.report.indexOf(out.blockKey));
  assert.ok(out.report.indexOf(out.blockKey) < out.report.indexOf(out.microscopy));
});

test('two-part case keeps (A)/(B) on every block-key line and macro paragraph', () => {
  const out = generateCase(templates, mk(2));
  assert.equal(out.blockKey, '(A) (1) Margin. (2) Body. (3) Tip.\n(B) (1) Margin. (2) Body. (3) Tip.');
  assert.match(out.macro, /^\(A\) Received[\s\S]*\n\n\(B\) Received/);
});

test('macro option off removes both macro and block key', () => {
  const out = generateCase(templates, mk(1, { macro: false }));
  assert.equal(out.macro, '');
  assert.equal(out.blockKey, '');
  assert.ok(!out.report.includes('BLOCK KEY'));
});

test('Doc text merges generated block key with the typed one', () => {
  const cs = mk(1);
  cs.meta.blockKey = '(4) Extra lymph node.';
  const doc = buildDocText(cs, generateCase(templates, cs));
  assert.match(doc, /BLOCK KEY:\n\(1\) Margin\. \(2\) Body\. \(3\) Tip\.\n\(4\) Extra lymph node\./);
});
