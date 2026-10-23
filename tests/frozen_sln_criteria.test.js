// Frozen section sentinel node: staging criteria - Phase 76 (23 October 2026).
// The criteria panel and fuller category labels, the extranodal extent, a fifth presurgical therapy answer,
// melanoma wording without breast size categories, and the treatment and extranodal answers carried into
// the breast synoptic as its own options. The Phase 9 wording stays pinned in tests/frozen_sln.test.js.
// Spec: docs/specs/sentinel-node.md. Sources: docs/reference/sentinel-node-sources.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate, isVisible } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { SLN, slnSummary } from '../generators/frozen.js';
import { prefillFromFrozen } from '../generators/breast_carcinoma.js';

const registry = await loadAll();
const { schema, generator } = registry.frozen_section;
const breast = registry.breast_carcinoma.schema;
const byId = Object.fromEntries(schema.fields.map((f) => [f.id, f]));

const BASE = { specimenName: 'Left SLN 1', scenario: SLN, slnSide: 'Left', slnLabel: 'SLN 1', slnSize: '3 x 2 x 1', slnCount: '2', slnNodeSizes: '1.2, 0.8', slnBlocks: '2' };
function run(values) {
  const cs = createCase(schema, 1);
  Object.assign(cs, { fsTime: '1015', fsDate: '12/09/2026', fsPathologists: 'Dr. HY Tan' });
  Object.assign(cs.parts[0].values, { ...BASE, ...values });
  return generate(schema, generator, cs);
}
const line = (out) => out.intraop.split('\n')[1];
// The frozen form's checks carry no field.
const issues = (out) => out.issues.map((i) => `${i.level}|${i.message}`);
const TX = byId.slnTreatment.options;

test('labels carry the criteria; the panel sits on the result; the extent shows for extension that is present', () => {
  assert.deepEqual(byId.slnResult.optionLabels, {
    'Isolated tumour cells': 'Isolated tumour cells only (0.2 mm or less and fewer than 200 cells)',
    Micrometastasis: 'Micrometastasis (more than 0.2 mm to 2 mm, or more than 200 cells)',
    Macrometastasis: 'Macrometastasis (more than 2 mm)'
  });
  assert.equal(byId.slnResult.reference.title, 'Sentinel and regional node criteria');
  assert.deepEqual(byId.slnEneExtent.options, ['', '2 mm or less', 'More than 2 mm']);
  const v = (x) => ({ ...createCase(schema, 1).parts[0].values, ...BASE, ...x });
  assert.ok(isVisible(byId.slnEneExtent, v({ slnResult: 'Macrometastasis', slnEne: 'Present' })));
  assert.ok(!isVisible(byId.slnEneExtent, v({ slnResult: 'Macrometastasis', slnEne: 'Not identified' })));
  assert.ok(!isVisible(byId.slnEneExtent, v({ slnResult: 'Isolated tumour cells', slnEne: 'Present' })));
  assert.deepEqual(TX, ['No known presurgical therapy', 'Presurgical therapy, no definite response', 'Presurgical therapy, metastasis with treatment effect', 'Presurgical therapy, fibrous scarring and no metastasis', 'Presurgical therapy, no metastasis and no scarring']);
  assert.equal(byId.slnTreatment.optionLabels['Presurgical therapy, no metastasis and no scarring'], 'No metastasis; no fibrous scarring or histiocytic aggregates');
});

test('extranodal extent prints in the paraffin text and the diagnosis; without it, Checks asks', () => {
  const out = run({ slnResult: 'Macrometastasis', slnPositive: '1', slnMetMm: '6', slnEne: 'Present', slnEneExtent: 'More than 2 mm' });
  assert.equal(out.microscopy, 'The paraffin sections confirm the frozen section diagnosis. They show fibroadipose tissue and two lymph nodes, one of which is involved by metastatic carcinoma (macrometastasis, 6 mm) with extranodal extension (more than 2 mm).');
  assert.equal(out.diagnosis, 'LYMPH NODES, left SLN 1, excision x frozen section - METASTATIC CARCINOMA, macrometastasis 6 mm, with extranodal extension (more than 2 mm) (1/2)');
  const ask = run({ slnResult: 'Macrometastasis', slnPositive: '1', slnMetMm: '6', slnEne: 'Present' });
  assert.match(ask.diagnosis, /with extranodal extension \(1\/2\)$/);
  assert.ok(issues(ask).includes('info|Extranodal extension present: choose the extent beyond the capsule (2 mm or less, or more than 2 mm); it is carried into the breast synoptic.'));
});

test('melanoma: metastatic malignant melanoma with the deposit size, no breast category, whatever category was picked', () => {
  const mel = { slnSite: 'Skin (melanoma)', slnPositive: '1', slnMetMm: '0.4' };
  for (const r of ['Isolated tumour cells', 'Micrometastasis', 'Macrometastasis']) {
    const out = run({ ...mel, slnResult: r });
    assert.equal(line(out), 'Metastatic malignant melanoma, 0.4 mm (1 of 2 lymph nodes).', r);
    assert.equal(out.microscopy, 'The paraffin sections confirm the frozen section diagnosis. They show fibroadipose tissue and two lymph nodes, one of which is involved by metastatic malignant melanoma (0.4 mm).', r);
    assert.equal(out.diagnosis, 'LYMPH NODES, left SLN 1, excision x frozen section - METASTATIC MALIGNANT MELANOMA, largest deposit 0.4 mm (1/2)', r);
    assert.ok(issues(out).includes('info|Melanoma: any tumour cells make the node positive and the breast size categories are not used, so the lines print metastatic malignant melanoma with the deposit size.'), r);
    assert.ok(!issues(out).some((m) => /Add breast synoptic|pN0\(i\+\)|a micrometastasis is|a macrometastasis is/.test(m)), r);
  }
  const negative = run({ slnSite: 'Skin (melanoma)', slnResult: 'Negative' });
  assert.equal(line(negative), 'Negative for malignancy.');
});

test('presurgical therapy: no scarring prints; fibrous scarring reaches the diagnosis; mismatches warn', () => {
  const clean = run({ slnResult: 'Negative', slnTreatment: TX[4] });
  assert.equal(clean.microscopy, 'The paraffin sections confirm the frozen section diagnosis. They show fibroadipose tissue and two reactive lymph nodes, with no fibrous scarring or histiocytic aggregates. There is no evidence of malignancy.');
  assert.match(clean.diagnosis, /NO EVIDENCE OF MALIGNANCY \(0\/2\)$/);
  const scar = run({ slnResult: 'Negative', slnTreatment: TX[3] });
  assert.equal(scar.diagnosis, 'LYMPH NODES, left SLN 1, excision x frozen section - NO RESIDUAL METASTATIC CARCINOMA, with fibrous scarring in keeping with treatment effect (0/2)');
  assert.ok(issues(run({ slnResult: 'Macrometastasis', slnPositive: '1', slnMetMm: '3', slnTreatment: TX[4] })).includes('warn|The presurgical therapy answer says no metastasis but the frozen result has tumour: change one of them.'));
  assert.ok(issues(run({ slnResult: 'Negative', slnTreatment: TX[2] })).includes('warn|The presurgical therapy answer describes a metastasis but the frozen result is negative: change one of them.'));
  const vulva = run({ slnSite: 'Vulva', slnResult: 'Negative', slnTreatment: TX[3] });
  assert.match(vulva.diagnosis, /NO EVIDENCE OF MALIGNANCY \(0\/2\)$/, 'presurgical therapy is read for breast nodes only');
  assert.ok(!issues(vulva).some((m) => /Add breast synoptic/.test(m)), 'a vulval sentinel node has no synoptic to add');
});

test('slnSummary adds the extranodal extent only when extension is present and its extent chosen', () => {
  const v = { ...BASE, slnCount: '1', slnResult: 'Macrometastasis', slnPositive: '1', slnMetMm: '6', slnEne: 'Present', slnEneExtent: '2 mm or less', slnTreatment: TX[2] };
  assert.deepEqual(slnSummary(v), { examined: 1, positive: 1, macro: 1, micro: 0, itc: 0, largestMm: 6, ene: 'Present', side: 'Left', treatment: TX[2], eneExtent: '2 mm or less' });
  assert.equal('eneExtent' in slnSummary({ ...v, slnEneExtent: '' }), false);
  assert.equal('eneExtent' in slnSummary({ ...v, slnEne: 'Not identified' }), false, 'a stale extent is not carried');
});

test('prefill: each frozen therapy answer and extranodal answer becomes a breast synoptic option', () => {
  const opts = (id) => breast.fields.find((f) => f.id === id).options;
  const base = { ...BASE, slnCount: '1', slnResult: 'Macrometastasis', slnPositive: '1', slnMetMm: '6' };
  const got = TX.map((t) => prefillFromFrozen({ ...base, slnTreatment: t }).lnTreatmentEffect);
  assert.deepEqual(got, [undefined,
    'No definite response to presurgical therapy in metastatic carcinoma',
    'Metastatic carcinoma present with evidence of response to presurgical therapy',
    'No lymph node metastases. Fibrous scarring or histiocytic aggregates, possibly related to prior lymph node metastases with pathologic complete response',
    'No lymph node metastases and no fibrous scarring or histiocytic aggregates in the nodes']);
  for (const g of got.slice(1)) assert.ok(opts('lnTreatmentEffect').includes(g), g);
  assert.equal(prefillFromFrozen({ ...base, slnEne: 'Cannot be assessed' }).ene, 'Cannot be determined');
  for (const e of ['Not identified', 'Present', 'Cannot be assessed']) assert.ok(opts('ene').includes(prefillFromFrozen({ ...base, slnEne: e }).ene), e);
  assert.equal(prefillFromFrozen({ ...base, slnEne: 'Present', slnEneExtent: 'More than 2 mm' }).eneExtent, '1 node, greater than 2 mm');
  assert.equal(prefillFromFrozen({ ...base, slnCount: '3', slnPositive: '2', slnEne: 'Present', slnEneExtent: '2 mm or less' }).eneExtent, '2 mm or less');
  assert.equal('eneExtent' in prefillFromFrozen({ ...base, slnEne: 'Present' }), false);
});
