import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCase, mergeLis } from '../src/engine.js';
import { buildDocText } from '../src/docformat.js';

// LIS macro / block key override (roadmap, Phase 6): text pasted into the case panel
// either replaces the generated macro / block key (explicit toggle) or is appended.

const schema = {
  id: 'toy_resection', version: '1', name: 'Toy', shortName: 'Toy', label: 'Toy', organ: 'TOY',
  system: 'GI', kind: 'benign resection', rank: 99, aliases: [], specimenNoun: 'resection', maxParts: 3, defaultParts: 1,
  generator: 'toy', style: { british: true }, caseFields: [],
  options: [{ id: 'macro', label: 'macro', type: 'checkbox', default: true }],
  fields: [{ id: 'size', label: 'Size', type: 'text', default: '2', group: 'Macroscopy' }],
  example: { parts: [{ label: 'A', values: { size: '2' } }] }
};
const gen = {
  specimenName: () => 'Toy, resection',
  macro: (p, ctx) => (ctx.options.macro === false ? '' : `(${p.label}) Received in formalin is a toy measuring ${p.values.size} cm.`),
  blockKey: (p, ctx) => (ctx.options.macro === false ? '' : `(${p.label}) (1) Margin. (2) Body.`),
  microscopy: (p) => `(${p.label}) Sections show a benign toy.`,
  diagnosis: (p) => `(${p.label}) TOY, resection - BENIGN`
};
const templates = { toy_resection: { schema, generator: gen } };
const mk = (meta = {}, options = {}) => ({
  schemaId: 'toy_resection', options, comment: '',
  meta: { accession: 'S25/1', status: 'draft', clinical: '', macro: '', blockKey: '', useLisMacro: false, useLisBlockKey: false, ...meta },
  parts: [{ label: 'A', values: { size: '2' } }]
});

const LIS_MACRO = "'Left fallopian tube'. Consists of a distended segment of tubal tissue measuring approximately 4 x 2 x 2 cm. 3 representative blocks.";
const LIS_KEY = '(1) Uninvolved fallopian tube.\n(2)&(3) Haemorrhagic tubal tissue with distension.';

test('mergeLis: generated only, typed only, merged, override, and toggle with nothing typed', () => {
  assert.deepEqual(mergeLis('G', '', false), { text: 'G', source: 'generated' });
  assert.deepEqual(mergeLis('', 'T', false), { text: 'T', source: 'typed' });
  assert.deepEqual(mergeLis('G', 'T', false, '\n'), { text: 'G\nT', source: 'merged' });
  assert.deepEqual(mergeLis('G', 'T', true), { text: 'T', source: 'lis' });
  assert.deepEqual(mergeLis('G', '   ', true), { text: 'G', source: 'generated' });
  assert.deepEqual(mergeLis('', '', true), { text: '', source: 'none' });
});

test('no pasted text: generated macro and block key print unchanged, source generated', () => {
  const out = generateCase(templates, mk());
  assert.equal(out.macro, 'Received in formalin is a toy measuring 2 cm.');
  assert.equal(out.blockKey, '(1) Margin. (2) Body.');
  assert.deepEqual(out.source, { macro: 'generated', blockKey: 'generated' });
});

test('toggle off: pasted text is appended after the generated text (legacy merge)', () => {
  const out = generateCase(templates, mk({ macro: LIS_MACRO, blockKey: '(3) Extra node.' }));
  assert.equal(out.macro, `Received in formalin is a toy measuring 2 cm.\n\n${LIS_MACRO}`);
  assert.equal(out.blockKey, '(1) Margin. (2) Body.\n(3) Extra node.');
  assert.deepEqual(out.source, { macro: 'merged', blockKey: 'merged' });
});

test('toggle on: pasted macro replaces the generated one, verbatim, in every output', () => {
  const cs = mk({ macro: LIS_MACRO, useLisMacro: true });
  const out = generateCase(templates, cs);
  assert.equal(out.macro, LIS_MACRO);
  assert.equal(out.source.macro, 'lis');
  assert.equal(out.blockKey, '(1) Margin. (2) Body.', 'block key untouched when only the macro toggle is on');
  assert.ok(out.report.includes(LIS_MACRO));
  assert.ok(!out.report.includes('Received in formalin is a toy'));
  const doc = buildDocText(cs, out);
  assert.match(doc, new RegExp(`MACROSCOPIC DESCRIPTION:\\n${LIS_MACRO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n\\nBLOCK KEY:\\n\\(1\\) Margin\\. \\(2\\) Body\\.`));
  assert.equal((doc.match(/Received in formalin/g) || []).length, 0, 'Doc no longer prints the generated macro');
});

test('block key toggle is independent of the macro toggle', () => {
  const cs = mk({ blockKey: LIS_KEY, useLisBlockKey: true });
  const out = generateCase(templates, cs);
  assert.equal(out.macro, 'Received in formalin is a toy measuring 2 cm.');
  assert.equal(out.blockKey, LIS_KEY);
  assert.deepEqual(out.source, { macro: 'generated', blockKey: 'lis' });
  const doc = buildDocText(cs, out);
  assert.ok(doc.includes(`BLOCK KEY:\n${LIS_KEY}\n`));
  assert.ok(!doc.includes('(1) Margin.'));
});

test('toggle on with nothing pasted falls back to the generated text', () => {
  const out = generateCase(templates, mk({ macro: '  ', useLisMacro: true, useLisBlockKey: true }));
  assert.equal(out.macro, 'Received in formalin is a toy measuring 2 cm.');
  assert.equal(out.blockKey, '(1) Margin. (2) Body.');
  assert.deepEqual(out.source, { macro: 'generated', blockKey: 'generated' });
});

test('templates without a generated macro print the pasted text (biopsy workflow)', () => {
  const out = generateCase(templates, mk({ macro: LIS_MACRO, blockKey: LIS_KEY }, { macro: false }));
  assert.equal(out.macro, LIS_MACRO);
  assert.equal(out.blockKey, LIS_KEY);
  assert.deepEqual(out.source, { macro: 'typed', blockKey: 'typed' });
  assert.ok(buildDocText(mk({ macro: LIS_MACRO, blockKey: LIS_KEY }, { macro: false }), out).includes(`MACROSCOPIC DESCRIPTION:\n${LIS_MACRO}`));
});

test('Doc builder keeps the legacy merge for callers whose output has no source map', () => {
  const cs = mk({ macro: 'Typed.', blockKey: '(9) Typed.' });
  const legacyOut = { specimens: 'Toy', macro: 'Gen.', blockKey: '(1) Gen.', microscopy: 'M', diagnosis: 'D', comment: '' };
  const doc = buildDocText(cs, legacyOut);
  assert.ok(doc.includes('MACROSCOPIC DESCRIPTION:\nGen.\n\nTyped.'));
  assert.ok(doc.includes('BLOCK KEY:\n(1) Gen.\n(9) Typed.'));
});
