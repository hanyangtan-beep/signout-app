import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, createCase, toggleOption, isVisible, defaultValues, snippetsFor } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { patternPhrase, patternDx, adenoPatterns } from '../generators/lung.js';

const registry = await loadAll();
const { schema, generator } = registry.lung_biopsy;
const field = schema.fields.find((f) => f.id === 'adenoPattern');
const predominant = schema.fields.find((f) => f.id === 'adenoPredominant');

test('multiselect field defaults to an empty array and toggles in option order', () => {
  assert.deepEqual(defaultValues(schema).adenoPattern, []);
  let v = toggleOption(field, [], 'Acinar');
  v = toggleOption(field, v, 'Lepidic');
  assert.deepEqual(v, ['Lepidic', 'Acinar']);
  v = toggleOption(field, v, 'Acinar');
  assert.deepEqual(v, ['Lepidic']);
});

test('invasive mucinous is exclusive', () => {
  let v = toggleOption(field, ['Lepidic', 'Acinar'], 'Invasive mucinous');
  assert.deepEqual(v, ['Invasive mucinous']);
  v = toggleOption(field, v, 'Solid');
  assert.deepEqual(v, ['Solid']);
});

test('predominant pattern appears only with two or more patterns; lepidic auto-ticks the caveat', () => {
  assert.equal(isVisible(predominant, { adenoPattern: ['Acinar'] }), false);
  assert.equal(isVisible(predominant, { adenoPattern: ['Acinar', 'Solid'] }), true);
  const caveat = schema.snippets.find((s) => s.id === 'lung_small_biopsy');
  const c = createCase(schema, 1);
  c.parts[0].values.neoplasia = 'Adenocarcinoma';
  c.parts[0].values.adenoPattern = ['Lepidic', 'Acinar'];
  const sn = snippetsFor({ [schema.id]: { schema, generator } }, { ...c, schemaId: schema.id }).find((x) => x.id === caveat.id);
  assert.equal(sn.suggested, true);
  c.parts[0].values.adenoPattern = ['Acinar'];
  const sn2 = snippetsFor({ [schema.id]: { schema, generator } }, { ...c, schemaId: schema.id }).find((x) => x.id === caveat.id);
  assert.equal(sn2.suggested, false);
});

test('pattern prose: single, mixed with predominant, mixed without predominant, none', () => {
  assert.equal(patternPhrase({ adenoPattern: ['Acinar'] }), ' with an acinar pattern');
  assert.equal(patternPhrase({ adenoPattern: ['Solid'] }), ' with a solid pattern');
  assert.equal(patternPhrase({ adenoPattern: ['Lepidic', 'Acinar'], adenoPredominant: 'Acinar' }), ' with mixed lepidic and acinar patterns (acinar predominant)');
  assert.equal(patternPhrase({ adenoPattern: ['Lepidic', 'Acinar', 'Micropapillary'], adenoPredominant: 'Not specified' }), ' with mixed lepidic, acinar and micropapillary patterns');
  assert.equal(patternPhrase({ adenoPattern: ['Lepidic', 'Acinar'], adenoPredominant: 'Solid' }), ' with mixed lepidic and acinar patterns');
  assert.equal(patternPhrase({ adenoPattern: [] }), '');
  assert.equal(patternDx({ adenoPattern: ['Acinar', 'Micropapillary'], adenoPredominant: 'Acinar' }), ', mixed acinar and micropapillary patterns (acinar predominant)');
  // Older saved cases stored a single string.
  assert.deepEqual(adenoPatterns({ adenoPattern: 'Acinar' }), ['Acinar']);
  assert.deepEqual(adenoPatterns({ adenoPattern: 'Not specified' }), []);
});

test('generated report: mixed patterns and invasive mucinous adenocarcinoma', () => {
  const c = createCase(schema, 1);
  Object.assign(c.parts[0].values, { specimenType: 'Transbronchial biopsy', site: 'right upper lobe', neoplasia: 'Adenocarcinoma', adenoPattern: ['Lepidic', 'Acinar'], adenoPredominant: 'Acinar' });
  let out = generate(schema, generator, c);
  assert.match(out.microscopy, /adenocarcinoma composed of atypical glandular cells with mixed lepidic and acinar patterns \(acinar predominant\), with enlarged/);
  assert.match(out.diagnosis, /LUNG, right upper lobe, transbronchial biopsy - ADENOCARCINOMA, mixed lepidic and acinar patterns \(acinar predominant\)/);
  c.parts[0].values.adenoPattern = ['Invasive mucinous'];
  out = generate(schema, generator, c);
  assert.match(out.microscopy, /in keeping with invasive mucinous adenocarcinoma\./);
  assert.match(out.diagnosis, /biopsy - INVASIVE MUCINOUS ADENOCARCINOMA/);
  assert.doesNotMatch(out.diagnosis, /ADENOCARCINOMA,/);
});

test('example case renders the mixed-pattern sentence', () => {
  const out = generate(schema, generator, { schemaId: schema.id, ...JSON.parse(JSON.stringify(schema.example)) });
  assert.match(out.diagnosis, /ADENOCARCINOMA, mixed lepidic and acinar patterns \(acinar predominant\)/);
});
