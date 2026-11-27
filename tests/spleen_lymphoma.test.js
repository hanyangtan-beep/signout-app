import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createCase, generateCase } from '../src/engine.js';
import gen from '../generators/spleen_lymphoma.js';

const ROOT = new URL('..', import.meta.url).pathname;
const schema = JSON.parse(readFileSync(join(ROOT, 'schemas/spleen_lymphoma.json'), 'utf8'));
const registry = { spleen_lymphoma: { schema, generator: gen } };

test('spleen_lymphoma: example SMZL report renders macro, synoptic IHC, molecular and diagnosis', () => {
  const cs = { schemaId: 'spleen_lymphoma', options: { macro: true, blockKey: true, ihcList: true }, parts: schema.example.parts };
  const out = generateCase(registry, cs);
  assert.match(out.macro, /weighing 1240 g/);
  assert.match(out.microscopy, /biphasic lymphoid nodules/i);
  assert.match(out.microscopy, /Immunohistochemistry/);
  assert.match(out.molecular, /BRAF p\.V600E/);
  assert.match(out.diagnosis, /SPLENIC MARGINAL ZONE LYMPHOMA/);
  assert.match(out.diagnosis, /Splenic hilar lymph nodes: INVOLVED BY LYMPHOMA/);
  assert.equal(out.issues.length, 0);
});

test('spleen_lymphoma: SBLPN warns if BRAF V600E or Annexin A1/CD25 is positive', () => {
  const cs = createCase(schema);
  cs.parts[0].values.dx = 'Splenic B-cell lymphoma/leukaemia with prominent nucleoli';
  cs.parts[0].values.brafV600E = 'Detected (mutated)';
  cs.parts[0].values.panel = ['CD20', 'Annexin A1', 'CD25'];
  cs.parts[0].values.r_CD20 = 'Positive';
  cs.parts[0].values.r_AnnexinA1 = 'Positive';
  cs.parts[0].values.r_CD25 = 'Negative';
  const out = generateCase(registry, cs);
  assert.ok(out.issues.some((i) => i.field === 'brafV600E' && i.level === 'warn'));
  assert.ok(out.issues.some((i) => i.field === 'panel' && i.level === 'warn'));
  assert.match(out.diagnosis, /SPLENIC B-CELL LYMPHOMA\/LEUKAEMIA with PROMINENT NUCLEOLI/i);
});

test('spleen_lymphoma: HSTCL validates CD3+/CD20- and emits hstcl snippet flag', () => {
  const cs = createCase(schema);
  cs.parts[0].values.dx = 'Hepatosplenic T-cell lymphoma';
  cs.parts[0].values.panel = ['CD3', 'CD5', 'TIA-1', 'TCR-gamma/delta'];
  cs.parts[0].values.r_CD3 = 'Positive';
  cs.parts[0].values.r_CD5 = 'Negative';
  cs.parts[0].values.r_TIA1 = 'Positive';
  cs.parts[0].values.r_TCRgd = 'Positive';
  const out = generateCase(registry, cs);
  assert.equal(out.issues.length, 0);
  assert.match(out.diagnosis, /HEPATOSPLENIC T-CELL LYMPHOMA/);
});

test('spleen_lymphoma: every reference gallery image exists on disk with credit, license and url', () => {
  const dxField = schema.fields.find((f) => f.id === 'dx');
  assert.ok(dxField?.reference?.groups?.length >= 5);
  let count = 0;
  for (const g of dxField.reference.groups) {
    for (const im of g.images || []) {
      count++;
      assert.ok(existsSync(join(ROOT, im.src)), `missing image: ${im.src}`);
      assert.ok(im.credit && im.license && im.url, `incomplete attribution for ${im.src}`);
    }
  }
  assert.ok(count >= 10, `expected >= 10 reference images, got ${count}`);
});
