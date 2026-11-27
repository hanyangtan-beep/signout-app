import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createCase, generateCase } from '../src/engine.js';
import gen from '../generators/liver_allograft_explant.js';

const ROOT = new URL('..', import.meta.url).pathname;
const schema = JSON.parse(readFileSync(join(ROOT, 'schemas/liver_allograft_explant.json'), 'utf8'));
const registry = { liver_allograft_explant: { schema, generator: gen } };

test('liver_allograft_explant: example chronic rejection report renders cleanly with zero issues', () => {
  const cs = { schemaId: 'liver_allograft_explant', options: { macro: true, blockKey: true }, parts: schema.example.parts };
  const out = generateCase(registry, cs);
  assert.match(out.macro, /weighing 1280 g/);
  assert.match(out.microscopy, /Banff rejection activity index \(RAI\): 2\/9/);
  assert.match(out.diagnosis, /CHRONIC \(DUCTOPENIC\) ALLOGRAFT REJECTION/);
  assert.equal(out.issues.length, 0);
});

test('liver_allograft_explant: AMR warns without C4d; acute TCMR warns if RAI is 0/9', () => {
  const cs = createCase(schema);
  cs.parts[0].values.dx = 'Antibody-mediated rejection (acute or chronic AMR)';
  cs.parts[0].values.c4dLiver = 'Not performed';
  assert.ok(generateCase(registry, cs).issues.some((i) => i.field === 'c4dLiver' && i.level === 'warn'));

  cs.parts[0].values.dx = 'Acute / late-onset T-cell-mediated rejection (TCMR)';
  cs.parts[0].values.raiPortal = '0';
  cs.parts[0].values.raiBileDuct = '0';
  cs.parts[0].values.raiVenous = '0';
  assert.ok(generateCase(registry, cs).issues.some((i) => i.field === 'raiPortal' && i.level === 'warn'));
});

test('liver_allograft_explant: every reference gallery image exists on disk with credit, license and url', () => {
  const dxField = schema.fields.find((f) => f.id === 'dx');
  let count = 0;
  for (const g of dxField.reference.groups) {
    for (const im of g.images || []) {
      count++;
      assert.ok(existsSync(join(ROOT, im.src)), `missing image: ${im.src}`);
      assert.ok(im.credit && im.license && im.url, `incomplete attribution for ${im.src}`);
    }
  }
  assert.ok(count >= 6);
});
