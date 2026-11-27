import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/hirschsprung_resection.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('hirschsprung_resection');
const run = (c) => generate(schema, gen, c);

test('hirschsprung pull-through: example renders macro, block key, microscopy and diagnosis', () => {
  const c = { ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id };
  const r = run(c);
  assert.equal(r.specimens, 'Colon, transanal endorectal pull-through (TERPT)');
  assert.ok(r.macro.includes('measuring 18 cm in length'));
  assert.ok(r.blockKey.includes('(1) Proximal resection margin, full-circumference ring. (2-6) Longitudinal strip, distal to proximal.'));
  assert.ok(r.microscopy.includes('complete absence of ganglion cells'));
  assert.ok(r.microscopy.includes('Calretinin immunohistochemistry confirms loss'));
  assert.equal(r.diagnosis, 'COLON, pull-through resection - HIRSCHSPRUNG DISEASE (aganglionic segment 9 cm); proximal resection margin circumferentially ganglionated without transition zone features.');
  assert.equal(r.issues.length, 0);
});

test('hirschsprung pull-through: checks flag transition zone margin, length mismatch and total colonic appendix', () => {
  const c = createCase(schema, 1);
  c.parts[0].values = {
    ...c.parts[0].values,
    specimenLength: '12',
    aganglionicLength: '15',
    proximalMargin: 'Partial circumferential aganglionosis / hypoganglionosis (transition zone at margin)',
    totalColonic: true,
    appendixStatus: 'Not included',
    enterocolitis: 'Present - moderate (cryptitis / crypt abscesses)'
  };
  const r = run(c);
  assert.ok(r.diagnosis.includes('TOTAL COLONIC AGANGLIONOSIS'));
  assert.ok(r.diagnosis.includes('TRANSITION ZONE FEATURES AT PROXIMAL RESECTION MARGIN'));
  assert.ok(r.diagnosis.includes('Hirschsprung-associated enterocolitis (moderate)'));
  assert.ok(r.issues.some((i) => i.level === 'error' && i.field === 'aganglionicLength'));
  assert.ok(r.issues.some((i) => i.level === 'warn' && i.field === 'proximalMargin'));
  assert.ok(r.issues.some((i) => i.level === 'warn' && i.field === 'appendixStatus'));
});
