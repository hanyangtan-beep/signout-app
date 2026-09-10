import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCase } from '../src/engine.js';
import { buildDocText } from '../src/docformat.js';

// Editable final report (roadmap, Phase 6): `caseState.edits[block]` replaces the generated block verbatim.

const schema = {
  id: 'toy', version: '1', name: 'Toy', shortName: 'Toy', label: 'Toy', organ: 'TOY', system: 'GI', kind: 'benign resection',
  rank: 99, aliases: [], specimenNoun: 'resection', maxParts: 3, defaultParts: 1, generator: 'toy', style: { british: true },
  caseFields: [], options: [{ id: 'macro', label: 'macro', type: 'checkbox', default: true }],
  fields: [{ id: 'size', label: 'Size', type: 'text', default: '2', group: 'Macroscopy' }],
  example: { parts: [{ label: 'A', values: { size: '2' } }] }
};
const gen = {
  specimenName: () => 'Toy, resection',
  macro: (p) => `(${p.label}) Received in formalin is a toy measuring ${p.values.size} cm.`,
  blockKey: (p) => `(${p.label}) (1) Margin. (2) Body.`,
  microscopy: (p) => `(${p.label}) Sections show a benign toy.`,
  diagnosis: (p) => `(${p.label}) TOY, resection - BENIGN`,
  validate: (p) => (p.values.size === '' ? [{ level: 'error', message: 'Size missing' }] : [])
};
const templates = { toy: { schema, generator: gen } };
const mk = (edits, extra = {}) => ({
  schemaId: 'toy', options: {}, comment: '', edits,
  meta: { accession: 'S25/1', status: 'draft', clinical: '', macro: '', blockKey: '' },
  parts: [{ label: 'A', values: { size: '2' } }], ...extra
});

test('no edits: output unchanged, edited map empty, generated mirrors the blocks', () => {
  const out = generateCase(templates, mk(undefined));
  assert.deepEqual(out.edited, {});
  assert.equal(out.generated.microscopy, out.microscopy);
  assert.equal(out.source.microscopy, undefined);
});

test('an edited microscopy prints verbatim in the block, the full report and the Doc', () => {
  const text = 'Sections show a benign toy with focal chronic inflammation. No dysplasia or malignancy is seen.';
  const cs = mk({ microscopy: text });
  const out = generateCase(templates, cs);
  assert.equal(out.microscopy, text);
  assert.equal(out.edited.microscopy, true);
  assert.equal(out.source.microscopy, 'edited');
  assert.equal(out.generated.microscopy, 'Sections show a benign toy.');
  assert.ok(out.report.includes(text) && !out.report.includes('Sections show a benign toy.'));
  const doc = buildDocText(cs, out);
  assert.ok(doc.includes(`MICROSCOPIC EXAMINATION:\n${text}\n`));
  assert.equal(out.diagnosis, 'TOY, resection - BENIGN', 'other blocks untouched');
});

test('edited diagnosis feeds Copy diagnosis (out.diagnosis) and the Doc', () => {
  const cs = mk({ diagnosis: 'TOY, resection - BENIGN TOY WITH REACTIVE CHANGES' });
  const out = generateCase(templates, cs);
  assert.equal(out.diagnosis, 'TOY, resection - BENIGN TOY WITH REACTIVE CHANGES');
  assert.ok(buildDocText(cs, out).includes('DIAGNOSIS:\nTOY, resection - BENIGN TOY WITH REACTIVE CHANGES'));
});

test('edits override the LIS macro text and are trimmed; an empty edit removes the block from the report', () => {
  const cs = mk({ macro: '  Edited macro.  \n', comment: '' }, { meta: { accession: 'S25/1', macro: 'LIS macro.', useLisMacro: true, blockKey: '' } });
  const out = generateCase(templates, cs);
  assert.equal(out.macro, 'Edited macro.');
  assert.equal(out.source.macro, 'edited');
  assert.equal(out.comment, '');
  assert.ok(!out.report.includes('LIS macro.'));
});

test('a comment can be added purely by editing (no snippet or free text)', () => {
  const out = generateCase(templates, mk({ comment: 'Discussed with the clinical team.' }));
  assert.equal(out.comment, 'Discussed with the clinical team.');
  assert.ok(out.report.endsWith('Discussed with the clinical team.'));
});

test('edits do not silence validation: Checks stay driven by the fields', () => {
  const cs = mk({ microscopy: 'Fixed wording.' });
  cs.parts[0].values.size = '';
  const out = generateCase(templates, cs);
  assert.equal(out.issues.length, 1);
  assert.equal(out.microscopy, 'Fixed wording.');
});

test('non-string or unknown edit keys are ignored', () => {
  const out = generateCase(templates, mk({ microscopy: 42, bogus: 'x', diagnosis: null }));
  assert.deepEqual(out.edited, {});
  assert.equal(out.microscopy, 'Sections show a benign toy.');
});

test('edits round-trip through the saved case JSON', () => {
  const cs = mk({ microscopy: 'Edited.' });
  const back = JSON.parse(JSON.stringify(cs));
  assert.equal(generateCase(templates, back).microscopy, 'Edited.');
});
