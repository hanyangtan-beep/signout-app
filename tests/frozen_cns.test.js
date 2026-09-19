// Frozen retune batch 2: the CNS / pituitary scenario and the result-line vocabulary.
// Answer list and phrasings measured in docs/case-mix/frozen-2021-2026.md (598 cases, 1291 parts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { frozenScenario } from '../src/intake.js';
import { organPhrase, stageable, pairTemplate, CNS } from '../generators/frozen.js';

const registry = await loadAll();
const { schema, generator } = registry.frozen_section;

function fsCase(n, caseFields = {}) {
  const cs = createCase(schema, n);
  Object.assign(cs, caseFields);
  return cs;
}
function part(cs, i, values) { Object.assign(cs.parts[i].values, values); return cs; }

test('CNS scenario is offered and the schema carries its group', () => {
  const sc = schema.fields.find((f) => f.id === 'scenario');
  assert.ok(sc.options.includes(CNS));
  for (const id of ['cnsSite', 'cnsSide', 'cnsProcedure', 'cnsPrep', 'cnsSmears', 'cnsResult', 'cnsOther']) {
    assert.ok(schema.fields.some((f) => f.id === id), `missing ${id}`);
  }
});

test('pituitary adenoma: head line, smear sentence, one-word result and paraffin paragraph', () => {
  const cs = fsCase(1, { fsPathologists: 'Dr. HY Tan', fsTime: '1145', fsDate: '04/06/2026' });
  part(cs, 0, {
    scenario: CNS, cnsSite: 'Pituitary', cnsProcedure: 'transsphenoidal excision',
    cnsPrep: 'Smear and frozen section', cnsSmears: '2', cnsResult: 'Pituitary adenoma',
    tissueDesc: 'other', tissueDescOther: 'soft tan tissue', size: '0.8 x 0.5 x 0.3',
  });
  const out = generate(schema, generator, cs);
  assert.equal(out.macro, 'Received in a fresh state is a piece of soft tan tissue measuring 0.8 x 0.5 x 0.3 cm. Two smears are prepared from the tissue. All embedded in 1 frozen block, and subsequently converted to paraffin block.');
  assert.equal(out.intraop, '(Dr. HY Tan)\nPituitary adenoma.\nThe frozen section result was phone reported at 1145 on 04/06/2026.');
  assert.match(out.microscopy, /monotonous population of epithelial cells/);
  assert.equal(out.diagnosis, 'PITUITARY, transsphenoidal excision x frozen section - PITUITARY ADENOMA');
});

test('CNS is a deferral path, not a staging path', () => {
  const cs = fsCase(1);
  part(cs, 0, { scenario: CNS, cnsResult: 'High-grade glioma' });
  assert.equal(stageable(cs.parts[0]), false);
  assert.equal(pairTemplate(cs.parts[0].values), '');
});

test('side and site build the head line; smear-only omits the block sentence', () => {
  const cs = fsCase(1);
  part(cs, 0, {
    scenario: CNS, cnsSite: 'Frontal lobe', cnsSide: 'right', cnsProcedure: 'stereotactic biopsy',
    cnsPrep: 'Smear only', cnsSmears: '1', cnsResult: 'High-grade glioma',
  });
  const out = generate(schema, generator, cs);
  assert.equal(organPhrase(cs.parts[0]), 'FRONTAL LOBE, right, stereotactic biopsy x frozen section');
  assert.match(out.macro, /One smear is prepared from the tissue\.$/);
  assert.ok(!/frozen block/.test(out.macro));
  assert.match(out.microscopy, /pseudopalisading tumour cells/);
  assert.ok(!/no evidence of malignancy/i.test(out.microscopy), 'a malignant result suppresses the closing sentence');
});

test('meningioma, schwannoma, epidermoid cyst and infarct each print their own morphology', () => {
  const expect = {
    Meningioma: /meningothelial neoplasm arranged in lobules and whorls/,
    Schwannoma: /Verocay bodies/,
    'Epidermoid cyst': /lamellated anucleate keratin/,
    'Infarcted tissue with adjacent brain': /reactive astrocytosis and a macrophage infiltrate/,
  };
  for (const [result, re] of Object.entries(expect)) {
    const cs = fsCase(1);
    part(cs, 0, { scenario: CNS, cnsResult: result });
    const out = generate(schema, generator, cs);
    assert.match(out.microscopy, re, result);
    assert.equal(out.intraop, `${result}.`);
  }
});

test('metastatic carcinoma carries the known primary into result, microscopy and diagnosis', () => {
  const cs = fsCase(1);
  part(cs, 0, { scenario: CNS, cnsSite: 'Cerebellum', cnsResult: 'Metastatic carcinoma', cnsPrimary: 'Lung' });
  const out = generate(schema, generator, cs);
  assert.equal(out.intraop, 'Metastatic carcinoma, consistent with the known lung primary.');
  assert.match(out.microscopy, /consistent with the known lung primary/);
  assert.equal(out.diagnosis, 'CEREBELLUM, biopsy x frozen section - METASTATIC CARCINOMA, consistent with a lung primary');
});

test('inadequate and deferred both take the deferral paragraph and the see-microscopy line', () => {
  for (const r of ['Inadequate for diagnosis', 'Deferred']) {
    const cs = fsCase(1);
    part(cs, 0, { scenario: CNS, cnsResult: r });
    const out = generate(schema, generator, cs);
    assert.match(out.diagnosis, /SEE MICROSCOPIC EXAMINATION$/, r);
  }
});

// ---------- (b) result-line vocabulary ----------

test('house default leaves every scenario printing exactly what it printed before', () => {
  const cs = fsCase(3);
  part(cs, 0, { specimenName: 'Tongue, medial margin' });
  part(cs, 1, { scenario: 'Lymph node', specimenName: 'Right level I lymph node' });
  part(cs, 2, { scenario: CNS, cnsResult: 'No malignancy' });
  const out = generate(schema, generator, cs);
  assert.equal(out.intraop, '(A) and (C) No malignancy.\n(B) Negative for malignancy.');
});

test('the case setting rewrites every negative line and nothing else', () => {
  const cs = fsCase(3, { fsNegative: 'No evidence of malignancy' });
  part(cs, 0, { specimenName: 'Tongue, medial margin' });
  part(cs, 1, { scenario: 'Lymph node', specimenName: 'Right level I lymph node' });
  part(cs, 2, { scenario: 'Lymph node', nodeResult: 'Macrometastasis', tumourType: 'squamous cell carcinoma' });
  const out = generate(schema, generator, cs);
  assert.equal(out.intraop, '(A) and (B) No evidence of malignancy.\n(C) Metastatic squamous cell carcinoma present (macrometastasis).');
});

test('the three measured phrasings are all reachable', () => {
  for (const phrase of ['No malignancy', 'Negative for malignancy', 'No evidence of malignancy']) {
    const cs = fsCase(1, { fsNegative: phrase });
    part(cs, 0, { specimenName: 'Tongue, medial margin' });
    assert.equal(generate(schema, generator, cs).intraop, `${phrase}.`);
  }
});

test('nodule scenario gains the measured non-committal answers', () => {
  const cases = {
    'Atypical cells present': 'Atypical cells present; immunostaining is required for confirmation.',
    'Suspicious cells present': 'Scanty suspicious cells present.',
    'Inadequate for diagnosis': 'Inadequate for diagnosis.',
  };
  for (const [result, line] of Object.entries(cases)) {
    const cs = fsCase(1);
    part(cs, 0, { scenario: 'Nodule / mass', specimenName: 'Retroperitoneal mass', noduleResult: result });
    const out = generate(schema, generator, cs);
    assert.equal(out.intraop, line);
    assert.match(out.diagnosis, /SEE MICROSCOPIC EXAMINATION$/);
  }
});

// ---------- intake ----------

test('intake routes CNS wording to the CNS scenario, before the lung test on "lobe"', () => {
  for (const t of ['Right frontal lobe tumour', 'Pituitary lesion, transsphenoidal', 'Brain, craniotomy', 'Cerebellopontine angle mass', 'Sphenoidal ridge meningioma']) {
    assert.equal(frozenScenario(t), CNS, t);
  }
  assert.equal(frozenScenario('Right upper lobe wedge'), 'Lung wedge / nodule');
});

// ---------- scenario card (d): the answers the frozen room actually gives ----------

test('the six added CNS answers each print their own result line', () => {
  const expect = {
    'Low-grade glial neoplasm': 'Low-grade glial neoplasm.',
    'Glial neoplasm, grade deferred': 'Glial neoplasm; grading deferred to paraffin sections.',
    'Lymphoid infiltrate, favour lymphoma': 'Atypical lymphoid infiltrate, favour lymphoma.',
    'Necrotic tissue only, non-diagnostic': 'Necrotic tissue only; non-diagnostic.',
    'Lesional tissue present, classification deferred': 'Lesional tissue present; classification deferred to paraffin sections.',
    'Reactive gliosis, no tumour': 'Reactive gliosis; no tumour identified.',
  };
  const opts = schema.fields.find((f) => f.id === 'cnsResult').options;
  for (const [result, line] of Object.entries(expect)) {
    assert.ok(opts.includes(result), `missing option ${result}`);
    const cs = fsCase(1);
    part(cs, 0, { scenario: CNS, cnsResult: result });
    assert.equal(generate(schema, generator, cs).intraop, line, result);
  }
});

test('grade-deferred and non-diagnostic answers take the deferral paragraph', () => {
  for (const r of ['Glial neoplasm, grade deferred', 'Necrotic tissue only, non-diagnostic', 'Lesional tissue present, classification deferred']) {
    const cs = fsCase(1);
    part(cs, 0, { scenario: CNS, cnsResult: r });
    const out = generate(schema, generator, cs);
    assert.match(out.microscopy, /^The frozen section diagnosis was deferred\./, r);
    assert.match(out.diagnosis, /SEE MICROSCOPIC EXAMINATION$/, r);
  }
});

test('a glial neoplasm does not close with "no evidence of malignancy"', () => {
  for (const r of ['Low-grade glial neoplasm', 'Glial neoplasm, grade deferred']) {
    const cs = fsCase(1);
    part(cs, 0, { scenario: CNS, cnsResult: r });
    assert.ok(!/no evidence of malignancy/i.test(generate(schema, generator, cs).microscopy), r);
  }
});

test('favour lymphoma is a malignant answer and carries the vascular pattern', () => {
  const cs = fsCase(1);
  part(cs, 0, { scenario: CNS, cnsResult: 'Lymphoid infiltrate, favour lymphoma', cnsFresh: true });
  const out = generate(schema, generator, cs);
  assert.match(out.microscopy, /disposed around and within vessel walls/);
  assert.ok(!/no evidence of malignancy/i.test(out.microscopy));
  assert.equal(out.diagnosis, 'BRAIN, biopsy x frozen section - ATYPICAL LYMPHOID INFILTRATE, FAVOUR LYMPHOMA');
});

test('the two tissue checkboxes add their sentences to the macro, in order', () => {
  const cs = fsCase(1);
  part(cs, 0, { scenario: CNS, cnsResult: 'High-grade glioma', cnsAdequate: true, cnsFresh: true });
  const out = generate(schema, generator, cs);
  assert.match(out.macro, /Lesional tissue remains for paraffin sections\. Tissue is reserved fresh for ancillary studies\.$/);
  const bare = fsCase(1);
  part(bare, 0, { scenario: CNS, cnsResult: 'High-grade glioma' });
  assert.ok(!/reserved fresh/.test(generate(schema, generator, bare).macro));
});

test('checks: smear-only answer, unreserved lymphoma, non-diagnostic sampling', () => {
  const check = (values) => {
    const cs = fsCase(1);
    part(cs, 0, { scenario: CNS, ...values });
    return (generator.validate(cs.parts[0], { case: cs }) || []);
  };
  const smear = check({ cnsPrep: 'Smear only', cnsResult: 'Necrotic tissue only, non-diagnostic' });
  assert.ok(smear.some((c) => c.level === 'warn' && /smear does not show/i.test(c.message)));
  const lymphoma = check({ cnsResult: 'Lymphoid infiltrate, favour lymphoma' });
  assert.ok(lymphoma.some((c) => c.level === 'warn' && /flow cytometry/i.test(c.message)));
  assert.equal(check({ cnsResult: 'Lymphoid infiltrate, favour lymphoma', cnsFresh: true })
    .some((c) => /flow cytometry/i.test(c.message)), false);
  assert.ok(check({ cnsResult: 'Inadequate for diagnosis' }).some((c) => /further sampling/i.test(c.message)));
});

test('CNS comments are available as snippets', () => {
  const ids = (schema.snippets || []).map((s) => s.id);
  assert.ok(ids.includes('cns_integrated_to_follow'));
  assert.ok(ids.includes('cns_meningioma_grade_deferred'));
});
