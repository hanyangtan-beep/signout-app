import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, createPart, isVisible, optionsFor, normalisePart, generate, relabel } from '../src/engine.js';
import { toAscii, britishise, applyStyle } from '../src/style.js';
import { loadAll } from '../src/registry.js';

const registry = await loadAll();
const gastric = registry.gastric_biopsy;
const colonic = registry.colonic_polyp;

test('schemas load with generators attached', () => {
  assert.equal(gastric.schema.id, 'gastric_biopsy');
  assert.equal(typeof gastric.generator.diagnosis, 'function');
  assert.equal(typeof colonic.generator.microscopy, 'function');
});

test('gastric defaults: first part pyloric, later parts body type', () => {
  const c = createCase(gastric.schema, 3);
  assert.deepEqual(c.parts.map((p) => p.label), ['A', 'B', 'C']);
  assert.equal(c.parts[0].values.siteType, 'Pyloric type');
  assert.equal(c.parts[1].values.siteType, 'Body type');
  assert.equal(c.parts[0].values.hp, 'Absent');
});

test('gastric showIf: IM type hidden while IM absent', () => {
  const f = gastric.schema.fields.find((x) => x.id === 'imType');
  assert.equal(isVisible(f, { imDegree: 'Absent' }), false);
  assert.equal(isVisible(f, { imDegree: 'Mild' }), true);
});

test('colonic dysplasia options follow polyp type and are coerced', () => {
  const f = colonic.schema.fields.find((x) => x.id === 'dysplasia');
  assert.deepEqual(optionsFor(f, { type: 'hyperplasticPolyp' }), ['Not applicable']);
  const part = createPart(colonic.schema, 0);
  part.values.type = 'hyperplasticPolyp';
  normalisePart(colonic.schema, part);
  assert.equal(part.values.dysplasia, 'Not applicable');
  part.values.type = 'sessileSerrated';
  normalisePart(colonic.schema, part);
  assert.equal(part.values.dysplasia, 'No dysplasia');
});

test('schema examples generate without error and include every part', () => {
  for (const { schema, generator } of Object.values(registry)) {
    const ex = { schemaId: schema.id, ...schema.example };
    const out = generate(schema, generator, ex);
    // Single-part examples print without a letter; multi-part ones must keep every (A)/(B).
    if (ex.parts.length > 1) for (const p of ex.parts) assert.ok(out.diagnosis.includes(`(${p.label})`), `${schema.id} missing ${p.label}`);
    // Synoptic templates carry their microscopy inside the synoptic block instead of a narrative paragraph.
    const micro = generator.synoptic ? out.synoptic : out.microscopy;
    assert.ok(out.diagnosis.trim() !== '' && micro.trim() !== '', `${schema.id} example is empty`);
    if (generator.synoptic) assert.equal(out.microscopy.trim(), '', `${schema.id} should have no narrative microscopy`);
    assert.ok(out.report.length > 0);
  }
});

test('relabel keeps A.. sequence after removal', () => {
  const c = createCase(gastric.schema, 3);
  c.parts.splice(1, 1);
  relabel(c.parts);
  assert.deepEqual(c.parts.map((p) => p.label), ['A', 'B']);
});

test('gastric title parsing now covers parts up to J', () => {
  const c = createCase(gastric.schema, 5);
  c.caseTitle = '(A) Antrum, (B) Body, (C) Incisura, (D) Cardia and (E) Fundus';
  const out = generate(gastric.schema, gastric.generator, c);
  assert.match(out.diagnosis, /\(E\) STOMACH, fundus, biopsy - /);
});

test('style layer: ASCII normalisation and case-preserving British spelling', () => {
  assert.equal(toAscii('“smart” – 5 µm ≥ 2'), '"smart" - 5 microm >= 2');
  assert.equal(britishise('TUMOR tumor Tumor cecum'), 'TUMOUR tumour Tumour caecum');
  assert.equal(applyStyle('a\n\n\n\nb  '), 'a\n\nb');
});

test('legacy schemas keep American spelling (parity) unless style.british is set', () => {
  const c = createCase(colonic.schema, 1);
  c.parts[0].values.site = 'Cecum';
  assert.match(generate(colonic.schema, colonic.generator, c).diagnosis, /CECUM, Cecum polyp/);
  const british = { ...colonic.schema, style: { british: true } };
  assert.match(generate(british, colonic.generator, c).diagnosis, /CAECUM, Caecum polyp/);
});
