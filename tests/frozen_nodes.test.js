// Several lymph nodes in one frozen part (docs/specs/frozen-section-scenarios.md (f), Phase 47).
// A part is often labelled "lymph node" when it holds several; the node count drives the gross, the
// intraoperative positive, the paraffin sentences and the head. One node prints exactly as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate, isVisible } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { extractMacro } from '../src/macroparse.js';

const registry = await loadAll();
const { schema, generator } = registry.frozen_section;

function run(values, caseFields = {}) {
  const cs = createCase(schema, 1);
  Object.assign(cs, { fsPathologists: 'Dr. HY Tan', fsTime: '1030', fsDate: '30/09/2026' }, caseFields);
  Object.assign(cs.parts[0].values, { scenario: 'Lymph node', ...values });
  const out = generate(schema, generator, cs);
  return { ...out, result: out.intraop.split('\n')[1], checks: generator.validate(cs.parts[0], { case: cs }) };
}
const OBTURATOR = { specimenName: 'Lymph node, right obturator', tissueDesc: 'lymph node' };

test('one node prints exactly as before', () => {
  const out = run({ ...OBTURATOR, size: '1.2 cm' });
  assert.equal(out.macro, 'Received in a fresh state is a lymph node measuring 1.2 cm. All embedded in 1 frozen block, and subsequently converted to paraffin block.');
  assert.equal(out.result, 'Negative for malignancy.');
  assert.equal(out.microscopy, 'The paraffin section confirms the frozen section diagnosis. It shows a lymph node with preserved architecture and reactive follicles. There is no evidence of malignancy.');
  assert.equal(out.diagnosis, 'LYMPH NODE, right obturator, frozen section - NO EVIDENCE OF MALIGNANCY (0/1)');
  assert.deepEqual(out.checks, []);
});

test('three nodes, negative: plural gross, paraffin sentences and head; the intraoperative negative is unchanged', () => {
  const out = run({ ...OBTURATOR, size: '0.5 to 1.2 cm', lnExamined: 3 });
  assert.equal(out.macro, 'Received in a fresh state are three lymph nodes measuring 0.5 to 1.2 cm in aggregate. All embedded in 1 frozen block, and subsequently converted to paraffin block.');
  assert.equal(out.result, 'Negative for malignancy.');
  assert.equal(out.microscopy, 'The paraffin sections confirm the frozen section diagnosis. They show three lymph nodes with preserved architecture and reactive follicles. There is no evidence of malignancy.');
  assert.equal(out.diagnosis, 'LYMPH NODES, right obturator, frozen section - NO EVIDENCE OF MALIGNANCY (0/3)');
  assert.equal(out.specimens, 'Frozen section: Lymph node, right obturator', 'the specimen line keeps the label as received');
});

test('one of three positive: the intraoperative line and the paraffin sentence name the involved node', () => {
  const out = run({ ...OBTURATOR, lnExamined: 3, lnPositive: 1, nodeResult: 'Macrometastasis', metSize: '4' });
  assert.equal(out.result, 'Metastatic carcinoma present in 1 of 3 lymph nodes (macrometastasis, 4 mm).');
  assert.equal(out.microscopy, 'The paraffin sections confirm the frozen section diagnosis. They show three lymph nodes, one of which is infiltrated by metastatic carcinoma.');
  assert.equal(out.diagnosis, 'LYMPH NODES, right obturator, frozen section - METASTATIC CARCINOMA (macrometastasis, 4 mm) (1/3)');
});

test('involved share: two of four, both of two, all of three', () => {
  const tissue = (n, pos) => run({ ...OBTURATOR, lnExamined: n, lnPositive: pos, nodeResult: 'Micrometastasis', tumourType: 'squamous cell carcinoma' }).microscopy;
  assert.match(tissue(4, 2), /They show four lymph nodes, two of which are infiltrated by metastatic squamous cell carcinoma\.$/);
  assert.match(tissue(2, 2), /They show two lymph nodes, both of which are infiltrated by metastatic squamous cell carcinoma\.$/);
  assert.match(tissue(3, 3), /They show three lymph nodes, all of which are infiltrated by metastatic squamous cell carcinoma\.$/);
  assert.match(tissue(3, 9), /all of which are/, 'involved is capped at the count');
});

test('head: only the words "lymph node" turn plural; other typed names stay as typed', () => {
  assert.match(run({ specimenName: 'Left neck level III lymph node', lnExamined: 2 }).diagnosis, /^LEFT NECK LEVEL III LYMPH NODES, frozen section - NO EVIDENCE OF MALIGNANCY \(0\/2\)$/);
  assert.match(run({ specimenName: 'Right SLN1', lnExamined: 3 }).diagnosis, /^RIGHT SLN1, frozen section - /);
  assert.match(run({ specimenName: 'Lymph node(s), left obturator', lnExamined: 3 }).diagnosis, /^LYMPH NODE\(S\), left obturator, /);
  assert.match(run({ specimenName: 'Lymph nodes, left obturator', lnExamined: 3 }).diagnosis, /^LYMPH NODES, left obturator, /);
});

test('other tissue keeps its receipt and names the nodes found within', () => {
  const out = run({ specimenName: 'Lymph node', tissueDesc: 'fibrofatty tissue', size: '3 x 2 x 1 cm', lnExamined: 4, blocks: 2 });
  assert.equal(out.macro, 'Received in a fresh state is a piece of fibrofatty tissue measuring 3 x 2 x 1 cm. Four lymph nodes are identified within. All embedded in 2 frozen blocks, and subsequently converted to paraffin blocks.');
  assert.equal(run({ specimenName: 'Lymph node', tissueDesc: 'fibrofatty tissue', lnExamined: 1 }).macro,
    'Received in a fresh state is a piece of fibrofatty tissue. All embedded in 1 frozen block, and subsequently converted to paraffin block.', 'one node adds nothing');
});

test('a gross saved with pieces only reads as it did, and the check asks for the node count', () => {
  const out = run({ ...OBTURATOR, pieces: 3 });
  assert.equal(out.macro, 'Received in a fresh state are three lymph nodes. All embedded in 1 frozen block, and subsequently converted to paraffin block.');
  assert.match(out.microscopy, /It shows a lymph node with preserved architecture/);
  assert.match(out.diagnosis, /\(0\/1\)$/);
  assert.equal(out.checks.length, 1);
  assert.equal(out.checks[0].field, 'lnExamined');
  assert.match(out.checks[0].message, /gross has 3 lymph nodes but lymph nodes examined is 1/);
  const both = run({ ...OBTURATOR, pieces: 2, lnExamined: 3 });
  assert.match(both.macro, /are three lymph nodes\./, 'the node count wins once it is two or more');
  assert.match(both.checks[0].message, /Number of pieces \(2\) and lymph nodes examined \(3\) differ/);
});

test('involved above examined warns; the report caps it', () => {
  const out = run({ specimenName: 'Node', lnExamined: 2, lnPositive: 5, nodeResult: 'Macrometastasis' });
  assert.match(out.diagnosis, /\(2\/2\)$/);
  assert.ok(out.checks.some((c) => c.level === 'warn' && c.field === 'lnPositive' && /involved \(5\) exceeds lymph nodes examined \(2\)/.test(c.message)));
});

test('sentence-case register folds the plural head like any other', () => {
  assert.equal(run({ ...OBTURATOR, lnExamined: 3 }, { register: 'Sentence case' }).diagnosis, 'Lymph nodes, right obturator, frozen section - no evidence of malignancy (0/3)');
});

test('a pasted LIS gross fills the node count', () => {
  assert.equal(extractMacro(schema, "Received in a fresh state labelled 'lymph node' are three lymph nodes measuring 0.5 to 1.2 cm. All embedded in 2 frozen blocks.").lnExamined, '3');
  assert.equal(extractMacro(schema, 'Received in a fresh state is a piece of fibrofatty tissue measuring 3 x 2 x 1 cm. Four lymph nodes are identified within. All embedded in 2 frozen blocks.').lnExamined, '4');
  assert.equal(extractMacro(schema, 'Received in a fresh state is a piece of tan coloured tissue measuring 1 x 0.4 x 0.2 cm. All embedded in 1 frozen block.').lnExamined, undefined);
});

test('no frozen field shows while the field its rule reads is hidden, in any scenario', () => {
  // The CNS smear count and the breast presurgical-therapy chips used to show under every scenario,
  // because their parent fields are hidden but keep a default that satisfies the rule.
  const byId = Object.fromEntries(schema.fields.map((f) => [f.id, f]));
  const refs = (r) => (!r ? [] : r.all ? r.all.flatMap(refs) : r.any ? r.any.flatMap(refs) : [r.field]);
  const base = createCase(schema, 1).parts[0].values;
  for (const scenario of byId.scenario.options) {
    const values = { ...base, scenario };
    const stray = schema.fields.filter((f) => isVisible(f, values) && refs(f.showIf).some((id) => byId[id] && !isVisible(byId[id], values))).map((f) => f.id);
    assert.deepEqual(stray, [], `${scenario}: ${stray.join(', ')}`);
  }
  assert.ok(isVisible(byId.cnsSmears, { ...base, scenario: 'CNS / pituitary' }), 'the smear count still shows for CNS');
  assert.ok(isVisible(byId.slnTreatment, { ...base, scenario: 'Sentinel lymph node', slnSite: 'Breast' }), 'presurgical therapy still shows for a breast sentinel node');
});

test('the node count is the first Lymph node field, ahead of the frozen result', () => {
  const ids = schema.fields.map((f) => f.id);
  assert.ok(ids.indexOf('lnExamined') < ids.indexOf('nodeResult'));
  const first = schema.fields.find((f) => f.showIf?.field === 'scenario' && [].concat(f.showIf.is).includes('Lymph node'));
  assert.equal(first.id, 'lnExamined');
});
