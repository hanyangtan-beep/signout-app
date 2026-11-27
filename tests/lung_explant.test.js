import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createCase, generateCase } from '../src/engine.js';
import gen from '../generators/lung_explant.js';

const ROOT = new URL('..', import.meta.url).pathname;
const schema = JSON.parse(readFileSync(join(ROOT, 'schemas/lung_explant.json'), 'utf8'));
const registry = { lung_explant: { schema, generator: gen } };

test('lung_explant: example LAM report renders cleanly with zero issues', () => {
  const cs = { schemaId: 'lung_explant', options: { macro: true, blockKey: true }, parts: schema.example.parts };
  const out = generateCase(registry, cs);
  assert.match(out.macro, /weighing 740 g/);
  assert.match(out.microscopy, /smooth muscle-like \(LAM\) cells/i);
  assert.match(out.diagnosis, /LYMPHANGIOLEIOMYOMATOSIS \(LAM\)/);
  assert.equal(out.issues.length, 0);
});

test('lung_explant: LAM warns without HMB-45/SMA/Cathepsin K; CLAD-BOS renders ISHLT grades', () => {
  const cs = createCase(schema);
  cs.parts[0].values.nativeDx = 'Lymphangioleiomyomatosis (LAM)';
  cs.parts[0].values.ihcStains = [];
  assert.ok(generateCase(registry, cs).issues.some((i) => i.field === 'ihcStains' && i.level === 'warn'));

  cs.parts[0].values.context = 'Failed lung allograft (re-transplant)';
  cs.parts[0].values.allograftDx = 'Chronic lung allograft dysfunction — bronchiolitis obliterans syndrome (CLAD-BOS)';
  cs.parts[0].values.ishltA = 'A1 (minimal)';
  cs.parts[0].values.ishltB = 'B1R (low-grade)';
  const out = generateCase(registry, cs);
  assert.match(out.diagnosis, /CHRONIC LUNG ALLOGRAFT DYSFUNCTION/);
  assert.match(out.diagnosis, /ISHLT grade: A1 \(minimal\); B1R \(low-grade\)/);
});

test('lung_explant: every reference gallery image exists on disk with credit, license and url', () => {
  const dxField = schema.fields.find((f) => f.id === 'nativeDx');
  let count = 0;
  for (const g of dxField.reference.groups) {
    for (const im of g.images || []) {
      count++;
      assert.ok(existsSync(join(ROOT, im.src)), `missing image: ${im.src}`);
      assert.ok(im.credit && im.license && im.url, `incomplete attribution for ${im.src}`);
    }
  }
  assert.ok(count >= 3);
});
