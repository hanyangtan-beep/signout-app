import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createCase, generateCase } from '../src/engine.js';
import gen from '../generators/heart_explant.js';

const ROOT = new URL('..', import.meta.url).pathname;
const schema = JSON.parse(readFileSync(join(ROOT, 'schemas/heart_explant.json'), 'utf8'));
const registry = { heart_explant: { schema, generator: gen } };

test('heart_explant: example HCM report renders cleanly with zero issues', () => {
  const cs = { schemaId: 'heart_explant', options: { macro: true, blockKey: true }, parts: schema.example.parts };
  const out = generateCase(registry, cs);
  assert.match(out.macro, /weighing 620 g/);
  assert.match(out.microscopy, /myofibre disarray/i);
  assert.match(out.diagnosis, /HYPERTROPHIC CARDIOMYOPATHY \(HCM\)/);
  assert.equal(out.issues.length, 0);
});

test('heart_explant: cardiac amyloidosis warns without Congo red; allograft AMR warns without C4d', () => {
  const cs = createCase(schema);
  cs.parts[0].values.nativeDx = 'Cardiac amyloidosis (restrictive cardiomyopathy)';
  cs.parts[0].values.congoRed = 'Not performed';
  assert.ok(generateCase(registry, cs).issues.some((i) => i.field === 'congoRed' && i.level === 'warn'));

  cs.parts[0].values.context = 'Failed cardiac allograft (re-transplant)';
  cs.parts[0].values.allograftDx = 'Antibody-mediated rejection (ISHLT pAMR)';
  cs.parts[0].values.c4dHeart = 'Not performed';
  assert.ok(generateCase(registry, cs).issues.some((i) => i.field === 'c4dHeart' && i.level === 'warn'));
});

test('heart_explant: every reference gallery image exists on disk with credit, license and url', () => {
  const dxField = schema.fields.find((f) => f.id === 'nativeDx');
  let count = 0;
  for (const g of dxField.reference.groups) {
    for (const im of g.images || []) {
      count++;
      assert.ok(existsSync(join(ROOT, im.src)), `missing image: ${im.src}`);
      assert.ok(im.credit && im.license && im.url, `incomplete attribution for ${im.src}`);
    }
  }
  assert.ok(count >= 4);
});
