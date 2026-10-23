// Lymph node excision: sentinel node staging criteria - Phase 76 (23 October 2026).
// Breast (AJCC 8th edition, as in the CAP breast protocol 4.11 and the QMH template): the size category,
// isolated tumour cells, the extranodal extent and the nodal treatment effect. Melanoma (AJCC 8th edition,
// ICCR, CAP melanoma): no isolated tumour cell category, the largest discrete deposit and its location.
// With the criteria "Not applied" (the default) every report reads as before (tests/lymphnode.test.js).
// Spec: docs/specs/sentinel-node.md. Sources: docs/reference/sentinel-node-sources.md.
// Phase 77 (deliberate): a fourth option, Vulval carcinoma (AJCC version 9, CAP Vulva 5.1.0.0, ICCR vulva
// 2nd edition): the report names a micrometastasis only; Checks gives the node's own pN category; groin
// lines of a vulval case open with these criteria. Sources: docs/reference/vulva-sources.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTemplate, loadManifest } from '../src/registry.js';
import { createCase, generate, isVisible, applyLinkedDefaults } from '../src/engine.js';
import { parseIntake, matchParts, presetValues, sentinelCriteria, nodeCriteria } from '../src/intake.js';
import gen, { metCategory, vulvaCategory, depositMm, involvedNodes, positiveNodes, countPhrase, TREATMENT } from '../generators/lymphnode.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'lymph_node_sln');
const UPDATE = process.env.UPDATE_FIXTURES === '1';
const { schema } = await loadTemplate('lymph_node');
const { schema: frozen } = await loadTemplate('frozen_section');
const manifest = await loadManifest();
const byId = Object.fromEntries(schema.fields.map((f) => [f.id, f]));

const runParts = (list) => {
  const c = createCase(schema, list.length);
  list.forEach((v, i) => { c.parts[i].values = { ...c.parts[i].values, ...v }; });
  return generate(schema, gen, c);
};
const run = (values) => runParts([values]);
const BREAST = { specimenName: 'left SLN1', procedure: 'Sentinel lymph node biopsy', criteria: 'Breast' };
const MELANOMA = { specimenName: 'right groin', procedure: 'Sentinel lymph node biopsy', criteria: 'Melanoma' };
const VULVA = { specimenName: 'Left groin sentinel lymph node', procedure: 'Sentinel lymph node biopsy', criteria: 'Vulva' };
const issues = (r) => r.issues.map((i) => `${i.level}|${i.field || ''}|${i.message}`);

// ---------- form ----------

test('the staging criteria field: options, labels, the sentinel default and the criteria panel', () => {
  const f = byId.criteria;
  assert.deepEqual(f.options, ['', 'Breast', 'Melanoma', 'Vulva'], 'Phase 77 (deliberate): Vulva added');
  assert.deepEqual(f.optionLabels, { '': 'Not applied', Breast: 'Breast carcinoma', Melanoma: 'Melanoma', Vulva: 'Vulval carcinoma' });
  assert.equal(f.default, '');
  assert.deepEqual(f.defaultByField, { field: 'procedure', map: { 'Sentinel lymph node biopsy': 'Breast' } });
  assert.deepEqual(f.reference.groups.map((g) => g.heading), ['Breast: the largest deposit', 'Extranodal extension', 'Breast: after presurgical therapy', 'Melanoma', 'Vulval carcinoma: the largest deposit']);
  // Phase 77 (deliberate): the frozen section form is untouched, so its panel keeps the breast and melanoma groups.
  const fsRef = frozen.fields.find((x) => x.id === 'slnResult').reference;
  assert.deepEqual(fsRef.groups, f.reference.groups.filter((g) => !g.heading.startsWith('Vulval')), 'the frozen form shows the same breast and melanoma criteria');
  for (const k of ['title', 'intro', 'columns']) assert.deepEqual(fsRef[k], f.reference[k], `the same panel ${k}`);
  assert.ok(f.reference.note.startsWith(fsRef.note + ' '), 'the lymph node note extends the frozen note');
  assert.ok(byId.result.options.includes('Isolated tumour cells'));
  for (const id of ['metCategory', 'location', 'eneExtent', 'treatmentEffect']) assert.ok(id in byId && 'default' in byId[id], `${id} has a default`);
  assert.deepEqual(byId.extranodal.options, ['Absent', 'Present', 'Cannot be determined']);
  assert.equal(byId.extranodal.optionLabels.Absent, 'Not identified');
});

test('choosing a sentinel node biopsy sets the Breast criteria; a value the request set is kept', () => {
  const p = { values: { procedure: 'Excision', criteria: '' } };
  p.values.procedure = 'Sentinel lymph node biopsy';
  applyLinkedDefaults(schema, p, 'procedure', 'Excision');
  assert.equal(p.values.criteria, 'Breast');
  const q = { values: { procedure: 'Sentinel lymph node biopsy', criteria: '' } };
  applyLinkedDefaults(schema, q, 'procedure', 'Excision', { criteria: '' });
  assert.equal(q.values.criteria, '', 'a pelvic sentinel node from the request stays Not applied');
});

test('the new fields show only for the criteria and results they belong to', () => {
  const v = (x) => ({ ...createCase(schema, 1).parts[0].values, ...x });
  assert.ok(isVisible(byId.metCategory, v({ criteria: 'Breast', result: 'Metastatic carcinoma' })));
  assert.ok(!isVisible(byId.metCategory, v({ criteria: '', result: 'Metastatic carcinoma' })));
  assert.ok(isVisible(byId.location, v({ criteria: 'Melanoma', result: 'Metastatic malignant melanoma' })));
  assert.ok(!isVisible(byId.location, v({ criteria: 'Breast', result: 'Metastatic malignant melanoma' })));
  assert.ok(isVisible(byId.eneExtent, v({ result: 'Metastatic carcinoma', extranodal: 'Present' })));
  assert.ok(!isVisible(byId.eneExtent, v({ result: 'Metastatic carcinoma', extranodal: 'Absent' })));
  assert.ok(isVisible(byId.treatmentEffect, v({ criteria: 'Breast', result: 'Negative - reactive' })));
  assert.ok(!isVisible(byId.treatmentEffect, v({ criteria: 'Breast', result: 'Lymphoma - see comment' })));
  assert.ok(isVisible(byId.positiveNodes, v({ result: 'Isolated tumour cells' })));
});

// ---------- categories and counts ----------

test('breast size category: chosen, else from the largest deposit; nothing without the Breast criteria', () => {
  const m = (x) => metCategory({ criteria: 'Breast', result: 'Metastatic carcinoma', ...x });
  assert.equal(m({ largestDeposit: '8' }), 'Macrometastasis');
  assert.equal(m({ largestDeposit: '2' }), 'Micrometastasis', '2 mm is a micrometastasis');
  assert.equal(m({ largestDeposit: '2.1 mm' }), 'Macrometastasis');
  assert.equal(m({ largestDeposit: '0.3' }), 'Micrometastasis');
  assert.equal(m({ largestDeposit: '0.2' }), '', '0.2 mm is not a micrometastasis by size');
  assert.equal(m({ largestDeposit: '0.5 cm' }), 'Macrometastasis');
  assert.equal(m({ largestDeposit: '0.15', metCategory: 'Micrometastasis' }), 'Micrometastasis', 'more than 200 cells');
  assert.equal(m({ largestDeposit: '' }), '');
  assert.equal(metCategory({ criteria: '', result: 'Metastatic carcinoma', largestDeposit: '8' }), '');
  assert.equal(metCategory({ criteria: 'Melanoma', result: 'Metastatic malignant melanoma', largestDeposit: '8' }), '');
  assert.equal(depositMm({ largestDeposit: '0.8 cm' }), 8);
  assert.equal(depositMm({ largestDeposit: 'n/a' }), null);
});

test('isolated tumour cells: counted as nodes holding tumour, not as positive nodes', () => {
  const v = { result: 'Isolated tumour cells', nodesReceived: '3', positiveNodes: '1' };
  assert.equal(involvedNodes(v), 1);
  assert.equal(positiveNodes(v), 0);
  assert.equal(countPhrase(v), '(1/3)');
});

// ---------- wording ----------

test('breast macrometastasis: the category follows the size; extranodal extent in both sections', () => {
  const r = run({ ...BREAST, result: 'Metastatic carcinoma', largestDeposit: '8', extranodal: 'Present', eneExtent: 'More than 2 mm', ihc: ['GATA3'] });
  assert.equal(r.microscopy, 'Sections show fibroadipose tissue and one lymph node. The lymph node is involved by metastatic carcinoma, the largest deposit measuring 8 mm (macrometastasis). Extranodal extension is present, extending more than 2 mm beyond the lymph node capsule. The tumour cells are highlighted by immunostain for GATA3.');
  assert.equal(r.diagnosis, 'LYMPH NODE, left SLN1, sentinel lymph node biopsy - METASTATIC CARCINOMA (1/1); largest deposit 8 mm (macrometastasis); extranodal extension present (more than 2 mm)');
  assert.deepEqual(issues(r), []);
});

test('breast micrometastasis chosen without a size; extranodal extension that cannot be determined', () => {
  const r = run({ ...BREAST, result: 'Metastatic carcinoma', metCategory: 'Micrometastasis', extranodal: 'Cannot be determined' });
  assert.equal(r.microscopy, 'Sections show fibroadipose tissue and one lymph node. The lymph node is involved by metastatic carcinoma (micrometastasis). Extranodal extension cannot be determined.');
  assert.equal(r.diagnosis, 'LYMPH NODE, left SLN1, sentinel lymph node biopsy - METASTATIC CARCINOMA (1/1); micrometastasis; extranodal extension cannot be determined');
});

test('isolated tumour cells: one node, and one of three with the rest reactive', () => {
  const one = run({ ...BREAST, result: 'Isolated tumour cells', largestDeposit: '0.1', ihc: ['AE1/AE3'] });
  assert.equal(one.microscopy, 'Sections show fibroadipose tissue and one lymph node. The lymph node contains isolated tumour cells, the largest cluster measuring 0.1 mm. The tumour cells are highlighted by immunostain for pancytokeratin AE1/AE3.');
  assert.equal(one.diagnosis, 'LYMPH NODE, left SLN1, sentinel lymph node biopsy - ISOLATED TUMOUR CELLS ONLY (1/1)');
  assert.deepEqual(issues(one), ['info|result|Isolated tumour cells only: pN0(i+); the node counts as examined, not as positive.']);
  const three = run({ ...BREAST, result: 'Isolated tumour cells', nodesReceived: '3', largestDeposit: '0.1' });
  assert.equal(three.microscopy, 'Sections show fibroadipose tissue and three lymph nodes. One of the lymph nodes contains isolated tumour cells, the largest cluster measuring 0.1 mm. The remaining two lymph nodes are reactive.');
  assert.match(three.diagnosis, /ISOLATED TUMOUR CELLS ONLY \(1\/3\)$/);
});

test('treatment effect: response, no definite response, fibrous scarring, no scarring', () => {
  const resp = run({ ...BREAST, result: 'Metastatic carcinoma', largestDeposit: '3', treatmentEffect: TREATMENT.response });
  assert.equal(resp.microscopy, 'Sections show fibroadipose tissue and one lymph node. The lymph node is involved by metastatic carcinoma, the largest deposit measuring 3 mm (macrometastasis). There is evidence of response to presurgical therapy. There is no extranodal extension.');
  assert.match(resp.diagnosis, /METASTATIC CARCINOMA \(1\/1\); largest deposit 3 mm \(macrometastasis\); no extranodal extension; treatment effect present$/);
  const none = run({ ...BREAST, result: 'Metastatic carcinoma', largestDeposit: '1', treatmentEffect: TREATMENT.noResponse });
  assert.match(none.microscopy, /\(micrometastasis\)\. There is no definite evidence of response to presurgical therapy\. There is no extranodal extension\.$/);
  assert.doesNotMatch(none.diagnosis, /treatment effect/);
  const scar = run({ ...BREAST, treatmentEffect: TREATMENT.scarring, ihc: ['AE1/AE3'] });
  assert.equal(scar.microscopy, 'Sections show fibroadipose tissue and one lymph node. There is fibrous scarring in keeping with treatment effect, with no residual metastatic carcinoma. No suspicious cells are identified on immunostain for pancytokeratin AE1/AE3.');
  assert.equal(scar.diagnosis, 'LYMPH NODE, left SLN1, sentinel lymph node biopsy - NO RESIDUAL METASTATIC CARCINOMA (0/1); fibrous scarring in keeping with treatment effect');
  const clean = run({ ...BREAST, treatmentEffect: TREATMENT.noScarring });
  assert.equal(clean.microscopy, 'Sections show fibroadipose tissue and one reactive lymph node. No fibrous scarring or histiocytic aggregates are seen. There is no evidence of malignancy.');
  assert.match(clean.diagnosis, /NO EVIDENCE OF MALIGNANCY \(0\/1\)$/);
  const itc = run({ ...BREAST, result: 'Isolated tumour cells', largestDeposit: '0.05', treatmentEffect: TREATMENT.response });
  assert.match(itc.microscopy, /measuring 0\.05 mm\. There is evidence of response to presurgical therapy\.$/);
  assert.match(itc.diagnosis, /ISOLATED TUMOUR CELLS ONLY \(1\/1\); treatment effect present$/);
});

test('melanoma: the deposit and its location, no size category', () => {
  const r = run({ ...MELANOMA, result: 'Metastatic malignant melanoma', largestDeposit: '0.4', location: 'Subcapsular', ihc: ['SOX10'] });
  assert.equal(r.microscopy, 'Sections show fibroadipose tissue and one lymph node. The lymph node is involved by metastatic malignant melanoma in the subcapsular sinus, the largest deposit measuring 0.4 mm. There is no extranodal extension. The tumour cells are highlighted by immunostain for SOX10.');
  assert.equal(r.diagnosis, 'LYMPH NODE, right groin, sentinel lymph node biopsy - METASTATIC MALIGNANT MELANOMA (1/1); largest deposit 0.4 mm; subcapsular; no extranodal extension');
  assert.deepEqual(issues(r), []);
  const both = run({ ...MELANOMA, result: 'Metastatic malignant melanoma', location: 'Subcapsular and intraparenchymal' });
  assert.match(both.microscopy, /melanoma in the subcapsular sinus and the nodal parenchyma\./);
  assert.match(both.diagnosis, /\(1\/1\); subcapsular and intraparenchymal; no extranodal/);
});

test('the criteria fields are ignored when hidden: stale values never print', () => {
  const r = run({ criteria: '', result: 'Metastatic carcinoma', largestDeposit: '8', metCategory: 'Micrometastasis', location: 'Subcapsular', treatmentEffect: TREATMENT.response, eneExtent: 'More than 2 mm' });
  assert.equal(r.microscopy, 'Sections show fibroadipose tissue and one lymph node. The lymph node is involved by metastatic carcinoma, the largest deposit measuring 8 mm. There is no extranodal extension.');
  assert.match(r.diagnosis, /METASTATIC CARCINOMA \(1\/1\); largest deposit 8 mm; no extranodal extension$/);
  assert.deepEqual(issues(r), []);
});

// ---------- checks ----------

test('checks: category against size, isolated tumour cells, criteria against result, therapy against result', () => {
  const msg = (x) => issues(run(x));
  assert.deepEqual(msg({ ...BREAST, result: 'Metastatic carcinoma', largestDeposit: '1.5', metCategory: 'Macrometastasis' }), ['warn|metCategory|Macrometastasis with a largest deposit of 1.5 mm: a macrometastasis is more than 2 mm.']);
  assert.deepEqual(msg({ ...BREAST, result: 'Metastatic carcinoma', largestDeposit: '3', metCategory: 'Micrometastasis' }), ['warn|metCategory|Micrometastasis with a largest deposit of 3 mm: a micrometastasis is more than 0.2 mm and up to 2 mm.']);
  assert.deepEqual(msg({ ...BREAST, result: 'Metastatic carcinoma', largestDeposit: '0.15', metCategory: 'Micrometastasis' }), ['info|metCategory|Micrometastasis with a largest deposit of 0.15 mm: right only for more than 200 cells in a single cross-section.']);
  assert.deepEqual(msg({ ...BREAST, result: 'Metastatic carcinoma', largestDeposit: '0.15' }), ['warn|metCategory|Largest deposit 0.15 mm: choose the result "Isolated tumour cells", or the size category Micrometastasis for more than 200 cells in a single cross-section.']);
  assert.deepEqual(msg({ ...BREAST, result: 'Metastatic carcinoma' }), ['info|largestDeposit|Record the largest deposit (mm) or choose the size category: the report names the category from either.']);
  assert.deepEqual(msg({ ...BREAST, result: 'Metastatic carcinoma', largestDeposit: '4', extranodal: 'Present' }), ['info|eneExtent|Extranodal extension present: choose the extent beyond the capsule (2 mm or less, or more than 2 mm).']);
  assert.ok(msg({ ...BREAST, result: 'Isolated tumour cells', largestDeposit: '0.5' }).includes('warn|largestDeposit|Isolated tumour cells with a largest cluster of 0.5 mm: isolated tumour cells measure 0.2 mm or less, so this is a metastasis.'));
  assert.deepEqual(msg({ ...MELANOMA, result: 'Isolated tumour cells' }), ['warn|result|Melanoma has no isolated tumour cell category: any tumour cells make the node positive. Choose the result "Metastatic malignant melanoma".']);
  assert.deepEqual(msg({ ...MELANOMA, result: 'Metastatic malignant melanoma' }), ['info|largestDeposit|Record the largest discrete deposit (mm), to the nearest 0.1 mm.', 'info|location|Choose the location of the deposits: subcapsular, intraparenchymal or both.']);
  assert.ok(msg({ ...BREAST, result: 'Metastatic malignant melanoma', largestDeposit: '1' }).includes('warn|criteria|Staging criteria Breast with a melanoma result: change the criteria to Melanoma, or the result.'));
  assert.ok(msg({ ...MELANOMA, result: 'Metastatic carcinoma' }).includes('warn|criteria|Staging criteria Melanoma with a carcinoma result: change the criteria, or the result.'));
  assert.deepEqual(msg({ ...BREAST, result: 'Metastatic carcinoma', largestDeposit: '3', treatmentEffect: TREATMENT.scarring }), ['warn|treatmentEffect|The presurgical therapy answer says no metastasis but the result has tumour: change one of them.']);
  assert.deepEqual(msg({ ...BREAST, treatmentEffect: TREATMENT.response }), ['warn|treatmentEffect|The presurgical therapy answer describes a metastasis but the result is negative: change one of them.']);
  assert.deepEqual(msg({ criteria: '', result: 'Isolated tumour cells', largestDeposit: '0.5' }), [], 'no criteria, no checks');
});

// ---------- intake ----------

test('intake: the criteria a sentinel line opens with', () => {
  assert.equal(sentinelCriteria('Left axillary lymph nodes, dissection'), undefined, 'not a sentinel line');
  assert.equal(sentinelCriteria('Left sentinel lymph node'), 'Breast', 'no cue anywhere');
  assert.equal(sentinelCriteria('Right SLN1'), 'Breast');
  assert.equal(sentinelCriteria('Sentinel lymph node, left axilla'), 'Breast');
  assert.equal(sentinelCriteria('Sentinel lymph node, left axilla', 'melanoma left forearm'), 'Melanoma');
  assert.equal(sentinelCriteria('Right groin sentinel lymph node'), '');
  assert.equal(sentinelCriteria('Para aortic sentinel lymph node'), '');
  assert.equal(sentinelCriteria('Left maxillary SLN'), 'Breast', '"maxillary" is not an axillary cue, nor a region word');
  assert.equal(sentinelCriteria('Left sentinel lymph node', 'CA corpus'), '');
  assert.equal(sentinelCriteria('Left sentinel lymph node', '', '(A) Uterus, TAHBSO\n(B) Left sentinel lymph node'), '');
  assert.equal(sentinelCriteria('Left sentinel lymph node', 'previous hysterectomy', '(A) Left breast, wide local excision\n(B) Left sentinel lymph node'), 'Breast', 'the operation in the request outranks the history');
});

test('intake: presetValues carries the criteria on sentinel lines only', () => {
  const rows = (text, history = '') => matchParts(parseIntake(text), history, manifest);
  const pre = (r) => presetValues(schema, r, r);
  const breast = rows('Left breast, wide local excision\nLeft sentinel lymph node');
  assert.equal(breast[1].templateId, 'lymph_node');
  assert.equal(pre(breast[1]).criteria, 'Breast');
  const gyn = rows('(A) Uterus and appendages, resection, (B) Left sentinel pelvic lymph node, (C) Right sentinel pelvic lymph node and (D) Para aortic sentinel lymph node', 'CA corpus');
  assert.deepEqual(gyn.slice(1).map((r) => [r.templateId, pre(r).criteria]), [['lymph_node', ''], ['lymph_node', ''], ['lymph_node', '']]);
  const dissection = rows('Left axillary lymph nodes, dissection');
  assert.equal(dissection[0].templateId, 'lymph_node');
  assert.equal('criteria' in pre(dissection[0]), false);
});

// ---------- vulval carcinoma (Phase 77) ----------

test('vulval criteria: only a micrometastasis is named, at more than 0.2 mm to 2.0 mm', () => {
  const cat = (mm, x = {}) => metCategory({ criteria: 'Vulva', result: 'Metastatic carcinoma', largestDeposit: mm, ...x });
  assert.equal(cat('0.2'), '', '0.2 mm is isolated tumour cells');
  assert.equal(cat('0.21'), 'Micrometastasis');
  assert.equal(cat('2.0'), 'Micrometastasis');
  assert.equal(cat('2.1'), '', 'a larger deposit prints its size alone');
  assert.equal(cat('0.15 cm'), 'Micrometastasis', 'centimetres read as 1.5 mm');
  assert.equal(cat(''), '');
  assert.equal(cat('1', { metCategory: 'Macrometastasis' }), 'Micrometastasis', 'the breast size category is not read');
  assert.equal(metCategory({ criteria: 'Vulva', result: 'Isolated tumour cells', largestDeposit: '0.1' }), '');
});

test('vulval criteria: the node\'s own pN category, at the AJCC 9th edition boundaries', () => {
  const vc = (x) => vulvaCategory({ criteria: 'Vulva', result: 'Metastatic carcinoma', extranodal: 'Absent', ...x });
  assert.deepEqual(['0.2', '0.21', '2.0', '2.1', '5.0', '5.1', ''].map((mm) => vc({ largestDeposit: mm })), ['', 'pN1mi', 'pN1mi', 'pN1a', 'pN1a', 'pN1b', '']);
  assert.equal(vc({ largestDeposit: '1', extranodal: 'Present' }), 'pN1c', 'extranodal extension outranks the size');
  assert.equal(vc({ result: 'Isolated tumour cells', largestDeposit: '0.1' }), 'pN0(i+)');
  assert.equal(vc({ result: 'Negative - reactive' }), '');
  assert.equal(vulvaCategory({ criteria: 'Breast', result: 'Metastatic carcinoma', largestDeposit: '3' }), '', 'Vulva criteria only');
});

test('vulval criteria: the report and Checks', () => {
  const micro = run({ ...VULVA, result: 'Metastatic carcinoma', largestDeposit: '1.5', extranodal: 'Absent' });
  assert.match(micro.report, /the largest deposit measuring 1\.5 mm \(micrometastasis\)\./);
  assert.match(micro.report, /largest deposit 1\.5 mm \(micrometastasis\); no extranodal extension/);
  assert.ok(issues(micro).includes('info|result|This node alone: pN1mi (AJCC 9th edition). The case pN is staged on the Vulval carcinoma resection form, from all the regional nodes.'));
  const big = run({ ...VULVA, result: 'Metastatic carcinoma', largestDeposit: '6', extranodal: 'Absent' });
  assert.match(big.report, /the largest deposit measuring 6 mm\. There is no extranodal extension\./);
  assert.doesNotMatch(big.report, /macrometastasis/i, 'no breast category');
  const small = run({ ...VULVA, result: 'Metastatic carcinoma', largestDeposit: '0.2', extranodal: 'Absent' });
  assert.ok(issues(small).includes('warn|largestDeposit|Largest deposit 0.2 mm: 0.2 mm or less is isolated tumour cells, pN0(i+) (AJCC 9th edition). Choose the result "Isolated tumour cells".'));
  const itc = run({ ...VULVA, result: 'Isolated tumour cells', largestDeposit: '0.3' });
  assert.ok(issues(itc).some((m) => m.startsWith('warn|largestDeposit|Isolated tumour cells with a largest cluster of 0.3 mm')));
  const none = run({ ...VULVA, result: 'Metastatic carcinoma', extranodal: 'Absent' });
  assert.ok(issues(none).includes('info|largestDeposit|Record the largest deposit (mm): the vulval pN category depends on its size.'));
  const mel = run({ ...VULVA, result: 'Metastatic malignant melanoma' });
  assert.ok(issues(mel).some((m) => m.startsWith('warn|criteria|Staging criteria Vulval carcinoma with a melanoma result')));
  const neg = run({ ...VULVA });
  assert.deepEqual(issues(neg).filter((m) => /vulv|pN/i.test(m)), [], 'a negative node has no vulval checks');
  assert.ok(!isVisible(byId.metCategory, { ...createCase(schema, 1).parts[0].values, criteria: 'Vulva', result: 'Metastatic carcinoma' }), 'the breast size category stays hidden');
  assert.ok(!isVisible(byId.treatmentEffect, { ...createCase(schema, 1).parts[0].values, criteria: 'Vulva', result: 'Metastatic carcinoma' }), 'the nodal treatment effect stays breast-only');
});

test('intake: groin lines of a vulval case open with the Vulva criteria; pelvic lines stay Not applied', () => {
  assert.equal(sentinelCriteria('Left groin sentinel lymph node'), '', 'no vulval cue: as before');
  assert.equal(sentinelCriteria('Left groin sentinel lymph node', 'vulval carcinoma'), 'Vulva');
  assert.equal(sentinelCriteria('Left groin sentinel lymph node', 'CA endometrium'), '');
  assert.equal(sentinelCriteria('Left groin sentinel lymph node', 'melanoma of the vulva'), 'Melanoma', 'melanoma outranks the vulva');
  assert.equal(sentinelCriteria('Left pelvic sentinel lymph node', 'vulval carcinoma'), '', 'a pelvic node is pM1, not regional');
  assert.equal(sentinelCriteria('Left sentinel lymph node', 'carcinoma of the left labium majus'), 'Vulva');
  assert.equal(sentinelCriteria('Right SLN', '', '(A) Vulva, wide local excision\n(B) Right SLN'), 'Vulva');
  assert.equal(nodeCriteria('Right inguinofemoral lymph node dissection', 'SCC vulva'), 'Vulva');
  assert.equal(nodeCriteria('Right inguinofemoral lymph node dissection'), undefined, 'no vulval cue: the form keeps its default');
  assert.equal(nodeCriteria('Left inguinal lymph node dissection', 'melanoma left heel'), undefined);
  assert.equal(nodeCriteria('Left axillary lymph nodes, dissection', 'vulval carcinoma'), undefined, 'not a groin line');
  assert.equal(nodeCriteria('Left axillary sentinel lymph node'), 'Breast', 'sentinel lines keep their rules');
  const rows = matchParts(parseIntake('(A) Vulva, left, wide local excision\n(B) Left groin sentinel lymph node\n(C) Left pelvic sentinel lymph node\n(D) Right inguinofemoral lymph node dissection'), 'vulval carcinoma', manifest);
  assert.deepEqual(rows.slice(1).map((r) => [r.templateId, presetValues(schema, r, r).criteria]), [['lymph_node', 'Vulva'], ['lymph_node', ''], ['lymph_node', 'Vulva']]);
});

// ---------- golden reports ----------

// Written on first run, compared after; edit deliberately (UPDATE_FIXTURES=1 rewrites).
const CASES = [
  ['01-breast-macrometastasis', 'breast sentinel node, macrometastasis with extranodal extension more than 2 mm, one of two nodes', [{ ...BREAST, nodesReceived: '2', result: 'Metastatic carcinoma', positiveNodes: '1', largestDeposit: '6', extranodal: 'Present', eneExtent: 'More than 2 mm', ihc: ['AE1/AE3'] }]],
  ['02-breast-micrometastasis', 'breast sentinel node, micrometastasis by size, no extranodal extension', [{ ...BREAST, result: 'Metastatic carcinoma', largestDeposit: '1.2', ihc: ['AE1/AE3'] }]],
  ['03-breast-isolated-tumour-cells', 'breast sentinel node, isolated tumour cells only in one of two nodes', [{ ...BREAST, nodesReceived: '2', result: 'Isolated tumour cells', positiveNodes: '1', largestDeposit: '0.1', ihc: ['AE1/AE3'] }]],
  ['04-breast-post-treatment-scarring', 'breast sentinel node after presurgical therapy, fibrous scarring and no residual metastasis', [{ ...BREAST, nodesReceived: '3', treatmentEffect: TREATMENT.scarring, ihc: ['AE1/AE3'] }]],
  ['05-melanoma-subcapsular', 'melanoma sentinel node, subcapsular deposit 0.4 mm', [{ ...MELANOMA, result: 'Metastatic malignant melanoma', largestDeposit: '0.4', location: 'Subcapsular', ihc: ['SOX10'] }]],
  ['06-vulva-groin-sentinel', 'Phase 77: vulval carcinoma, left groin sentinel node, 3 mm deposit without extranodal extension (pN1a for this node)', [{ ...VULVA, result: 'Metastatic carcinoma', largestDeposit: '3', extranodal: 'Absent', ihc: ['AE1/AE3'] }]]
];
for (const [name, description, parts] of CASES) {
  test(`golden: ${name}`, () => {
    const r = runParts(parts);
    const file = path.join(FIX, `${name}.json`);
    const current = { description, templateId: 'lymph_node', values: parts, report: r.report, checks: r.issues };
    if (UPDATE || !fs.existsSync(file)) {
      fs.mkdirSync(FIX, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
    }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(r.report, saved.report, `${file} changed; re-run with UPDATE_FIXTURES=1 only after a deliberate wording change`);
    assert.deepEqual(r.issues, saved.checks, `${file} checks changed`);
    assert.doesNotMatch(r.report, /undefined|\[object|NaN| {3,}/);
  });
}
