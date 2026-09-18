// Frozen section scenario 'Breast sentinel lymph node' (Phase 9, docs/specs/breast-pair.md).
// Pinned: macro wording, the intraoperative result line by category, paraffin confirmation, house diagnosis line,
// slnSummary (consumed by breast_carcinoma.prefillFromFrozen) and the separate-letter pairing flags.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { SLN_LEGACY, SLN, slnSummary, stageable, PAIRED_TEMPLATE, PAIR_SEPARATE } from '../generators/frozen.js';

const registry = await loadAll();
const { schema, generator } = registry.frozen_section;

const BASE = { specimenName: 'Left SLN 1', scenario: SLN, slnSide: 'Left', slnLabel: 'SLN 1', slnSize: '3 x 2 x 1', slnCount: '2', slnNodeSizes: '1.2, 0.8', slnBlocks: '2' };
function run(values, caseFields = { fsTime: '1015', fsDate: '12/09/2026', fsPathologists: 'Dr. HY Tan' }) {
  const cs = createCase(schema, 1);
  Object.assign(cs, caseFields);
  Object.assign(cs.parts[0].values, { ...BASE, ...values });
  return { cs, out: generate(schema, generator, cs) };
}

test('scenario is registered with its fields and pairs with breast_carcinoma as a separate letter', () => {
  assert.equal(SLN, 'Sentinel lymph node');
  assert.equal(SLN_LEGACY, 'Breast sentinel lymph node');   // saved cases keep working
  const scen = schema.fields.find((f) => f.id === 'scenario');
  assert.ok(scen.options.includes(SLN));
  for (const id of ['slnSide', 'slnLabel', 'slnReceived', 'slnSize', 'slnCount', 'slnNodeSizes', 'slnFatStripped', 'slnBlocks', 'slnResult', 'slnPositive', 'slnMetMm', 'slnEne', 'slnTreatment', 'slnMillerPayne']) {
    assert.ok(schema.fields.some((f) => f.id === id), `field ${id}`);
  }
  assert.deepEqual(schema.fields.find((f) => f.id === 'slnResult').options, ['Negative', 'Isolated tumour cells', 'Micrometastasis', 'Macrometastasis', 'No nodal tissue identified', 'Deferred']);
  assert.equal(PAIRED_TEMPLATE[SLN], 'breast_carcinoma');
  assert.equal(PAIR_SEPARATE[SLN], true, 'the mastectomy is a separate specimen, so the synoptic gets its own letter');
  assert.equal(stageable({ values: { scenario: SLN } }), true);
});

test('negative sentinel nodes: macro, intraoperative record, paraffin confirmation and diagnosis line', () => {
  const { out } = run({ slnResult: 'Negative' });
  assert.equal(out.specimens, 'Frozen section: Left SLN 1');
  assert.equal(out.macro, 'Received fresh, a piece of fibroadipose tissue measuring 3 x 2 x 1 cm. Two lymph nodes are identified within, measuring approximately 1.2 cm and 0.8 cm across respectively. The fatty tissue is stripped off. All embedded in 2 frozen blocks, and subsequently converted to paraffin blocks.');
  assert.equal(out.intraop, '(Dr. HY Tan)\nNegative for malignancy.\nThe frozen section result was phone reported at 1015 on 12/09/2026.');
  assert.equal(out.microscopy, 'The paraffin sections confirm the frozen section diagnosis. They show fibroadipose tissue and two reactive lymph nodes. There is no evidence of malignancy.');
  assert.equal(out.diagnosis, 'LYMPH NODES, left SLN 1, excision x frozen section - NO EVIDENCE OF MALIGNANCY (0/2)');
  assert.ok(out.issues.some((i) => i.level === 'info' && /Add breast synoptic/.test(i.message)));
  assert.deepEqual(slnSummary({ ...BASE, slnResult: 'Negative' }), { examined: 2, positive: 0, macro: 0, micro: 0, itc: 0, largestMm: null, ene: 'Not identified', side: 'Left', treatment: 'No known presurgical therapy' });
});

test('macrometastasis, micrometastasis and isolated tumour cells each get their own intraoperative wording', () => {
  const macro = run({ slnResult: 'Macrometastasis', slnPositive: '1', slnMetMm: '4' }).out;
  assert.equal(macro.intraop.split('\n')[1], 'Metastatic carcinoma, >2 mm (1 of 2 lymph nodes).');
  assert.equal(macro.microscopy, 'The paraffin sections confirm the frozen section diagnosis. They show fibroadipose tissue and two lymph nodes, one of which is involved by metastatic carcinoma (macrometastasis, 4 mm).');
  assert.equal(macro.diagnosis, 'LYMPH NODES, left SLN 1, excision x frozen section - METASTATIC CARCINOMA, macrometastasis 4 mm (1/2)');
  assert.deepEqual(slnSummary({ ...BASE, slnResult: 'Macrometastasis', slnPositive: '1', slnMetMm: '4' }), { examined: 2, positive: 1, macro: 1, micro: 0, itc: 0, largestMm: 4, ene: 'Not identified', side: 'Left', treatment: 'No known presurgical therapy' });

  const micro = run({ slnResult: 'Micrometastasis', slnPositive: '1', slnMetMm: '1.5' }).out;
  assert.equal(micro.intraop.split('\n')[1], 'Metastatic carcinoma, 0.2-2 mm (micrometastasis) (1 of 2 lymph nodes).');
  assert.equal(micro.diagnosis, 'LYMPH NODES, left SLN 1, excision x frozen section - METASTATIC CARCINOMA, micrometastasis 1.5 mm (1/2)');
  assert.equal(slnSummary({ ...BASE, slnResult: 'Micrometastasis', slnPositive: '1', slnMetMm: '1.5' }).micro, 1);

  const itc = run({ slnResult: 'Isolated tumour cells', slnPositive: '1', slnMetMm: '0.1' }).out;
  assert.equal(itc.intraop.split('\n')[1], 'Isolated tumour cells, 0.2 mm or less (1 of 2 lymph nodes); negative for macrometastasis.');
  assert.equal(itc.diagnosis, 'LYMPH NODES, left SLN 1, excision x frozen section - ISOLATED TUMOUR CELLS ONLY (1/2)');
  assert.ok(itc.issues.some((i) => /pN0\(i\+\)/.test(i.message)));
  assert.equal(slnSummary({ ...BASE, slnResult: 'Isolated tumour cells', slnPositive: '1', slnMetMm: '0.1' }).itc, 1);
});

test('deferred and no-nodal-tissue results', () => {
  const def = run({ slnResult: 'Deferred' }).out;
  assert.equal(def.intraop.split('\n')[1], 'Deferred to paraffin sections.');
  assert.match(def.microscopy, /^The frozen section diagnosis was deferred\./);
  assert.equal(def.diagnosis, 'LYMPH NODES, left SLN 1, excision x frozen section - SEE MICROSCOPIC EXAMINATION');
  const none = run({ slnResult: 'No nodal tissue identified', slnCount: '0' }).out;
  assert.match(none.macro, /No definite lymph node is identified\./);
  assert.equal(none.intraop.split('\n')[1], 'No nodal tissue identified; negative for malignancy.');
  assert.equal(none.diagnosis, 'LYMPH NODES, left SLN 1, excision x frozen section - NO NODAL TISSUE IDENTIFIED; no evidence of malignancy');
  assert.equal(slnSummary({ ...BASE, slnResult: 'No nodal tissue identified', slnCount: '0' }).examined, 0);
});

test('single node received bare, with extranodal extension and treatment effect', () => {
  const { out } = run({ slnReceived: 'Lymph node(s) only', slnCount: '1', slnNodeSizes: '1.5', slnResult: 'Macrometastasis', slnPositive: '1', slnMetMm: '6', slnEne: 'Present', slnTreatment: 'Presurgical therapy, metastasis with treatment effect' });
  assert.equal(out.macro, 'Received fresh, one lymph node measuring approximately 1.5 cm across. All embedded in 2 frozen blocks, and subsequently converted to paraffin blocks.');
  assert.equal(out.intraop.split('\n')[1], 'Metastatic carcinoma, >2 mm.', 'single node: no "x of y"');
  assert.equal(out.microscopy, 'The paraffin sections confirm the frozen section diagnosis. They show one lymph node, which is involved by metastatic carcinoma (macrometastasis, 6 mm) with extranodal extension, with treatment effect.');
  assert.equal(out.diagnosis, 'LYMPH NODE, left SLN 1, excision x frozen section - METASTATIC CARCINOMA, macrometastasis 6 mm, with extranodal extension, with treatment effect (1/1)');
  const s = slnSummary({ ...BASE, slnCount: '1', slnResult: 'Macrometastasis', slnPositive: '1', slnMetMm: '6', slnEne: 'Present', slnTreatment: 'Presurgical therapy, metastasis with treatment effect' });
  assert.equal(s.ene, 'Present');
  assert.equal(s.treatment, 'Presurgical therapy, metastasis with treatment effect');
});

test('checks: positive count above node count (capped), missing deposit size, macro / micro / ITC size sanity', () => {
  const msgs = (v) => run(v).out.issues.map((i) => `${i.level}: ${i.message}`);
  assert.ok(msgs({ slnResult: 'Macrometastasis', slnPositive: '3', slnMetMm: '4' }).some((m) => /^warn: Nodes involved \(3\) exceeds the nodes identified \(2\)/.test(m)));
  assert.equal(run({ slnResult: 'Macrometastasis', slnPositive: '3', slnMetMm: '4' }).out.diagnosis.slice(-5), '(2/2)', 'count capped in the report');
  assert.ok(msgs({ slnResult: 'Macrometastasis', slnPositive: '1' }).some((m) => /^info: Record the size of the largest metastatic focus/.test(m)));
  assert.ok(msgs({ slnResult: 'Macrometastasis', slnPositive: '1', slnMetMm: '1.5' }).some((m) => /^warn: Macrometastasis .* more than 2 mm/.test(m)));
  assert.ok(msgs({ slnResult: 'Micrometastasis', slnPositive: '1', slnMetMm: '3' }).some((m) => /^warn: Micrometastasis/.test(m)));
  assert.ok(msgs({ slnResult: 'Isolated tumour cells', slnPositive: '1', slnMetMm: '0.5' }).some((m) => /^warn: Isolated tumour cells .* 0\.2 mm or less/.test(m)));
  assert.ok(msgs({ slnResult: 'Negative', slnCount: '0' }).some((m) => /^warn: No lymph node identified/.test(m)));
});
