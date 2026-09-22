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
    // A biomarker report has no microscopic narrative at all: the section comes from a block already
    // reported under an earlier accession and the result lines are the whole report.
    const needsMicro = schema.kind !== 'biomarker';
    assert.ok(out.diagnosis.trim() !== '' && (!needsMicro || micro.trim() !== ''), `${schema.id} example is empty`);
    if (!needsMicro) assert.equal(micro, '', `${schema.id} must not print a microscopy paragraph`);
    if (generator.synoptic) assert.equal(out.microscopy, out.synoptic, `${schema.id} prints its synoptic as the microscopy block`);
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

test('every schema prints British spelling, and the stored value is left American', () => {
  // The layer rewrites the printed text, not the saved case. A case saved before the change still
  // holds site "Cecum" - renaming the option would have orphaned it - and now prints CAECUM.
  const c = createCase(colonic.schema, 1);
  c.parts[0].values.site = 'Cecum';
  assert.equal(colonic.schema.style.british, true);
  assert.match(generate(colonic.schema, colonic.generator, c).diagnosis, /CAECUM, Caecum polyp/);
  assert.ok(colonic.schema.fields.find((f) => f.id === 'site').options.includes('Cecum'),
    'the option value stays as saved cases hold it');
  const off = { ...colonic.schema, style: { british: false } };
  assert.match(generate(off, colonic.generator, c).diagnosis, /CECUM, Cecum polyp/, 'the flag is what does it');
});

test('no template is left on American spelling', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const missing = [];
  for (const f of readdirSync('schemas').filter((x) => x.endsWith('.json'))) {
    const d = JSON.parse(readFileSync(`schemas/${f}`, 'utf8'));
    if (!d.id || !d.fields) continue;
    if (!(d.style || {}).british) missing.push(d.id);
  }
  assert.deepEqual(missing, [], 'these schemas would print American spelling');
});

test('the britishiser leaves house exceptions alone', async () => {
  const { britishise, BRITISH } = await import('../src/style.js');
  // House wording is "fetal", not "foetal", and Mullerian is an eponym rather than an Americanism.
  assert.equal(britishise('Fetal membranes are unremarkable.'), 'Fetal membranes are unremarkable.');
  assert.equal(britishise('malignant mixed Mullerian tumor'), 'malignant mixed Mullerian tumour');
  for (const w of ['fetal', 'mullerian', 'her2', 'erbb2']) assert.ok(!(w in BRITISH), `${w} must not be in the map`);
  // Whole-word only: these are not American spellings and must survive intact.
  for (const w of ['colorectal', 'colostomy', 'colour', 'centre', 'fibre']) assert.equal(britishise(w), w);
  // The words found reaching reports through the breast biomarker block.
  assert.equal(britishise('Estrogen receptor'), 'Oestrogen receptor');
  assert.equal(britishise('Cold ischemia time'), 'Cold ischaemia time');
  assert.equal(britishise('Cold ischemic time is uncertain.'), 'Cold ischaemic time is uncertain.');
  assert.equal(britishise('HER2 signaling'), 'HER2 signalling');
});
