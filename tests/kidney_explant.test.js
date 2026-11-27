import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createCase, generateCase } from '../src/engine.js';
import gen from '../generators/kidney_explant.js';

const ROOT = new URL('..', import.meta.url).pathname;
const schema = JSON.parse(readFileSync(join(ROOT, 'schemas/kidney_explant.json'), 'utf8'));
const registry = { kidney_explant: { schema, generator: gen } };

test('kidney_explant: example ADPKD report renders cleanly with zero issues', () => {
  const cs = { schemaId: 'kidney_explant', options: { macro: true, blockKey: true }, parts: schema.example.parts };
  const out = generateCase(registry, cs);
  assert.match(out.macro, /weighing 2150 g/);
  assert.match(out.microscopy, /numerous cysts of variable size/i);
  assert.match(out.diagnosis, /AUTOSOMAL DOMINANT POLYCYSTIC KIDNEY DISEASE \(ADPKD\)/);
  assert.equal(out.issues.length, 0);
});

test('kidney_explant: failed renal allograft ABMR checks C4d and BKV checks SV40', () => {
  const cs = createCase(schema);
  cs.parts[0].values.context = 'Failed renal allograft';
  cs.parts[0].values.allograftDx = 'Chronic active antibody-mediated rejection';
  cs.parts[0].values.c4d = 'Not performed';
  const out = generateCase(registry, cs);
  assert.ok(out.issues.some((i) => i.field === 'c4d' && i.level === 'warn'));

  cs.parts[0].values.allograftDx = 'BK polyomavirus nephropathy';
  cs.parts[0].values.sv40 = 'Not performed';
  const outBk = generateCase(registry, cs);
  assert.ok(outBk.issues.some((i) => i.field === 'sv40' && i.level === 'warn'));
});

test('kidney_explant: every reference gallery image exists on disk with credit, license and url', () => {
  const refs = schema.fields.filter((f) => f.reference);
  assert.ok(refs.length >= 2);
  let count = 0;
  for (const f of refs) {
    for (const g of f.reference.groups) {
      for (const im of g.images || []) {
        count++;
        assert.ok(existsSync(join(ROOT, im.src)), `missing image: ${im.src}`);
        assert.ok(im.credit && im.license && im.url, `incomplete attribution for ${im.src}`);
      }
    }
  }
  assert.ok(count >= 5);
});
