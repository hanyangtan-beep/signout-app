// Frozen template retune, batch 1 — splits (a)-(e).
// Everything asserted here is drawn from docs/case-mix/frozen-2021-2026.md: 598 cases, 1291 parts,
// five years of released frozen reports. The wording is the measured house wording, not a guess.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { loadManifest, loadTemplate } from '../src/registry.js';
import { parseIntake, matchParts, presetValues, frozenScenario } from '../src/intake.js';
import { applyRegister, blockClause, marginName, pairTemplate, SLN, SLN_LEGACY } from '../generators/frozen.js';

const registry = await loadAll();
const { schema, generator } = registry.frozen_section;
const manifest = await loadManifest();

function fsCase(n, caseFields = {}) {
  const cs = createCase(schema, n);
  Object.assign(cs, caseFields);
  return cs;
}
function part(cs, i, values) { Object.assign(cs.parts[i].values, values); return cs; }

// ---------- (a) margin pick-lists ----------

test('margin head line is built from the organ, descriptor and procedure pick-lists', () => {
  const cs = fsCase(1);
  part(cs, 0, { scenario: 'Margin', mgOrgan: 'TONGUE', mgDescriptor: 'anterior', mgProcedure: 'excision', size: '1 x 0.5 x 0.3 cm' });
  const out = generate(schema, generator, cs);
  assert.equal(out.diagnosis, 'TONGUE, anterior margin, excision x frozen section - NO EVIDENCE OF MALIGNANCY');
});

test('margin pick-lists: Other falls back to the typed value, and a typed specimen name still wins', () => {
  assert.equal(marginName({ mgOrgan: 'Other', mgOrganOther: 'Hard palate', mgDescriptor: 'Other', mgDescriptorOther: 'deep', mgProcedure: 'resection' }), 'HARD PALATE, deep margin, resection x frozen section');
  assert.equal(marginName({ mgOrgan: 'OESOPHAGUS', mgProcedure: 'resection' }), 'OESOPHAGUS, margin, resection x frozen section');
  assert.equal(marginName({ mgDescriptor: 'proximal' }), '', 'no organ, no generated name');

  const cs = fsCase(1);
  part(cs, 0, { scenario: 'Margin', specimenName: 'Tongue, medial margin', mgOrgan: 'TONGUE', mgDescriptor: 'anterior' });
  const out = generate(schema, generator, cs);
  assert.match(out.diagnosis, /^TONGUE, medial margin,/, 'a typed name is never overwritten by the pick-lists');
});

// ---------- (b) the node count ----------

test('lymph node diagnosis carries the measured (involved/examined) count', () => {
  const cs = fsCase(1);
  part(cs, 0, { scenario: 'Lymph node', specimenName: 'Right level II lymph node', lnExamined: 3 });
  assert.match(generate(schema, generator, cs).diagnosis, /NO EVIDENCE OF MALIGNANCY \(0\/3\)$/);

  const cs2 = fsCase(1);
  part(cs2, 0, { scenario: 'Lymph node', specimenName: 'Right level II lymph node', lnExamined: 4, lnPositive: 2, nodeResult: 'Macrometastasis', metSize: '6', tumourType: 'squamous cell carcinoma' });
  assert.match(generate(schema, generator, cs2).diagnosis, /METASTATIC SQUAMOUS CELL CARCINOMA \(macrometastasis, 6 mm\) \(2\/4\)$/);
});

test('node count: positive never exceeds examined, and a case without the field prints no count', () => {
  const cs = fsCase(1);
  part(cs, 0, { scenario: 'Lymph node', specimenName: 'Node', lnExamined: 1, lnPositive: 5, nodeResult: 'Micrometastasis' });
  assert.match(generate(schema, generator, cs).diagnosis, /\(1\/1\)$/);

  const cs2 = fsCase(1);
  cs2.parts[0].values = { scenario: 'Lymph node', specimenName: 'Node', nodeResult: 'Negative' };
  assert.match(generate(schema, generator, cs2).diagnosis, /NO EVIDENCE OF MALIGNANCY$/, 'a case saved before the field existed is unchanged');
});

// ---------- (c) the sentinel scenario is no longer breast-only ----------

test('sentinel scenario is renamed, the legacy value still works, and only breast pairs with a synoptic', () => {
  assert.equal(SLN, 'Sentinel lymph node');
  assert.equal(SLN_LEGACY, 'Breast sentinel lymph node');
  const scen = schema.fields.find((f) => f.id === 'scenario');
  assert.ok(scen.options.includes(SLN));
  assert.ok(!scen.options.includes(SLN_LEGACY), 'the legacy value is accepted but no longer offered');

  assert.equal(pairTemplate({ scenario: SLN, slnSite: 'Breast' }), 'breast_carcinoma');
  assert.equal(pairTemplate({ scenario: SLN_LEGACY }), 'breast_carcinoma', 'a saved case still pairs');
  assert.equal(pairTemplate({ scenario: SLN, slnSite: 'Vulva' }), '', 'a vulval sentinel node has no synoptic to link to');
});

test('a non-breast sentinel node drops the breast-only treatment effect wording', () => {
  const cs = fsCase(1);
  part(cs, 0, { scenario: SLN, slnSite: 'Oral cavity / head and neck', slnLabel: 'SLN 1', slnCount: '2', slnResult: 'Macrometastasis', slnPositive: '1', slnMetMm: '4', slnTreatment: 'Presurgical therapy, metastasis with treatment effect' });
  const out = generate(schema, generator, cs);
  assert.ok(!/treatment effect/.test(out.report), 'Miller-Payne and treatment effect are breast concepts');
  assert.match(out.diagnosis, /\(1\/2\)$/);
});

// ---------- (d) one block sentence ----------

test('the block sentence is generated in one place, with the measured serial comma', () => {
  assert.equal(blockClause(1), 'in 1 frozen block, and subsequently converted to paraffin block');
  assert.equal(blockClause(3), 'in 3 frozen blocks, and subsequently converted to paraffin blocks');
  assert.equal(blockClause(1, false), 'in 1 block for frozen section');
  assert.equal(blockClause(2, false), 'in 2 blocks for frozen section');
});

test('converted off gives the minority form measured in 32 cases', () => {
  const cs = fsCase(1);
  part(cs, 0, { specimenName: 'Tongue, medial margin', size: '1 x 0.4 x 0.2 cm', blocks: '1', converted: false });
  assert.match(generate(schema, generator, cs).macro, /All embedded in 1 block for frozen section\.$/);
});

test('the phone sentence names the recipient before the time', () => {
  const cs = fsCase(1, { fsPathologists: 'Dr. HY Tan', fsTime: '1134', fsDate: '10/09/2026', fsReportedTo: 'Dr Lee (OT 3)' });
  part(cs, 0, { specimenName: 'Tongue, medial margin' });
  assert.match(generate(schema, generator, cs).intraop, /The frozen section result was phone reported to Dr Lee \(OT 3\) at 1134 on 10\/09\/2026\.$/);
});

// ---------- the register setting ----------

test('uppercase is the house register and the default', () => {
  const cs = fsCase(1);
  part(cs, 0, { specimenName: 'Tongue, medial margin' });
  assert.match(generate(schema, generator, cs).diagnosis, /^TONGUE, medial margin, frozen section - NO EVIDENCE OF MALIGNANCY$/);
  const reg = (schema.caseFields || []).find((f) => f.id === 'register');
  assert.equal(reg.default, 'Uppercase');
  assert.deepEqual(reg.options, ['Uppercase', 'Sentence case']);
});

test('sentence case folds the diagnosis line without touching short abbreviations', () => {
  const cs = fsCase(1, { register: 'Sentence case' });
  part(cs, 0, { specimenName: 'Tongue, medial margin' });
  assert.equal(generate(schema, generator, cs).diagnosis, 'Tongue, medial margin, frozen section - no evidence of malignancy');

  assert.equal(applyRegister('NO EVIDENCE OF MALIGNANCY', 'Uppercase'), 'NO EVIDENCE OF MALIGNANCY');
  assert.equal(applyRegister('pT2 pN1a(sn)', 'Sentence case'), 'pT2 pN1a(sn)', 'staging is not a capital run');
});

// ---------- (e) intake routing ----------

test('the request line picks the frozen scenario', () => {
  assert.equal(frozenScenario('Left breast sentinel lymph node'), 'Sentinel lymph node');
  assert.equal(frozenScenario('SLN, right axilla'), 'Sentinel lymph node');
  assert.equal(frozenScenario('Right level II lymph nodes'), 'Lymph node');
  assert.equal(frozenScenario('Parathyroid gland, left inferior'), 'Parathyroid');
  assert.equal(frozenScenario('Tongue, anterior margin'), 'Margin');
  assert.equal(frozenScenario('Pancreatic neck margin'), 'Pancreatic / bile duct margin');
  assert.equal(frozenScenario('Right upper lobe wedge resection'), 'Lung wedge / nodule');
  assert.equal(frozenScenario('Left ovarian mass'), 'Ovarian / adnexal mass');
  assert.equal(frozenScenario('Sentinel node, level II margin'), 'Sentinel lymph node', 'the node word wins over the margin word');
  assert.equal(frozenScenario('Tissue'), '');
});

test('a pasted frozen request prefills the scenario and the margin pick-lists', async () => {
  const s = parseIntake('(A) Tongue, anterior margin x frozen section\n(B) Right level II lymph nodes x frozen section');
  const matched = matchParts(s, '', manifest);
  const tpl = await loadTemplate('frozen_section');
  const a = presetValues(tpl.schema, matched[0]);
  assert.equal(a.scenario, 'Margin');
  assert.equal(a.mgOrgan, 'TONGUE');
  assert.equal(a.mgDescriptor, 'anterior');
  assert.ok(!a.specimenName, 'the pick-lists carry the organ, so the head line is not written twice');
  const b = presetValues(tpl.schema, matched[1]);
  assert.equal(b.scenario, 'Lymph node');
});
