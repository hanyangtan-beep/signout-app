import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/colonic.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('colonic_polyp');
const run = (c) => generate(schema, gen, c);

function one(values) {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
}

test('colonic polyp: perineurioma microscopy, diagnosis and IHC', () => {
  const r = run(one({ site: 'Sigmoid', type: 'perineurioma', dysplasia: 'Not applicable' }));
  assert.ok(r.microscopy.includes('poorly circumscribed proliferation of bland spindle cells with ovoid nuclei and pale, indistinct cytoplasm'));
  assert.ok(r.microscopy.includes('separating and entrapping serrated / hyperplastic crypts'));
  assert.ok(r.microscopy.endsWith('There is no evidence of dysplasia or malignancy.'));
  assert.equal(r.diagnosis, 'SIGMOID, Sigmoid polyp, polypectomy - PERINEURIOMA.');
  assert.equal(r.issues.length, 0);

  const ihc = run(one({ site: 'Rectum', type: 'perineurioma', perineuriomaIhc: 'EMA / GLUT1 / claudin-1 positive; S100 negative' }));
  assert.ok(ihc.microscopy.includes('weak / focal EMA and diffuse GLUT1, claudin-1 and collagen IV positivity'));
  assert.equal(ihc.issues.length, 0);
});

test('colonic polyp: perineurioma checks warn on S100 positivity or ganglion cells', () => {
  const s100 = run(one({ site: 'Sigmoid', type: 'perineurioma', perineuriomaIhc: 'S100 positive' }));
  assert.ok(s100.issues.some((i) => i.level === 'warn' && i.field === 'perineuriomaIhc' && i.message.includes('Schwann cell hamartoma')));

  const gang = run(one({ site: 'Sigmoid', type: 'perineurioma', perineuriomaGanglion: true }));
  assert.ok(gang.issues.some((i) => i.level === 'warn' && i.field === 'perineuriomaGanglion' && i.message.includes('ganglioneuroma')));
});
