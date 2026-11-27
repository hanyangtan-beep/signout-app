import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createCase, generateCase } from '../src/engine.js';
import gen from '../generators/spleen_benign.js';

const ROOT = new URL('..', import.meta.url).pathname;
const schema = JSON.parse(readFileSync(join(ROOT, 'schemas/spleen_benign.json'), 'utf8'));
const registry = { spleen_benign: { schema, generator: gen } };

test('spleen_benign: example SANT report renders macro, microscopy, diagnosis and triphasic snippet', () => {
  const cs = { schemaId: 'spleen_benign', options: { macro: true, blockKey: true }, parts: schema.example.parts };
  const out = generateCase(registry, cs);
  assert.match(out.macro, /weighing 265 g/);
  assert.match(out.microscopy, /coalescing angiomatoid nodules/i);
  assert.match(out.diagnosis, /SCLEROSING ANGIOMATOID NODULAR TRANSFORMATION \(SANT\)/);
  assert.match(out.diagnosis, /Splenic hilar lymph nodes: reactive, negative for tumour/);
  assert.equal(out.issues.length, 0);
});

test('spleen_benign: EBV-positive inflammatory FDC sarcoma checks EBER and FDC markers', () => {
  const cs = createCase(schema);
  cs.parts[0].values.dx = 'EBV-positive inflammatory follicular dendritic cell sarcoma';
  cs.parts[0].values.eber = 'Not performed';
  cs.parts[0].values.ihcDone = [];
  const out = generateCase(registry, cs);
  assert.ok(out.issues.some((i) => i.field === 'eber' && i.level === 'warn'));
  assert.ok(out.issues.some((i) => i.field === 'ihcDone' && i.level === 'warn'));

  cs.parts[0].values.eber = 'Positive in neoplastic spindle cells';
  cs.parts[0].values.ihcDone = ['CD21', 'CD23'];
  const clean = generateCase(registry, cs);
  assert.equal(clean.issues.length, 0);
  assert.match(clean.diagnosis, /EBV-POSITIVE INFLAMMATORY FOLLICULAR DENDRITIC CELL SARCOMA/);
});

test('spleen_benign: splenic angiosarcoma warns when no vascular marker recorded', () => {
  const cs = createCase(schema);
  cs.parts[0].values.dx = 'Splenic angiosarcoma';
  const out = generateCase(registry, cs);
  assert.ok(out.issues.some((i) => i.field === 'ihcDone' && i.level === 'warn'));
  assert.match(out.diagnosis, /PRIMARY SPLENIC ANGIOSARCOMA/);
});

test('spleen_benign: every reference gallery image exists on disk with credit, license and url', () => {
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
