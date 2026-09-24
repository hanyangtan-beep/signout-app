// Endometrial biopsy: part letters in the microscopy (roadmap card, 2026-09-24).
// A multi-part case letters every microscopy paragraph, narrative or products-of-gestation
// checklist alike; the single-part rule drops the letter from a one-part case.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';

const registry = await loadAll();
const { schema, generator } = registry.endometrial_biopsy;

const CURETTINGS = { specimenType: 'Endometrial curettings' };
const POG = { specimenType: 'Uterus, suction evacuation', phase: 'Gestational (decidua and hypersecretory glands)', villi: 'Present' };
const SCANTY = { specimenType: 'Endometrial curettings', amount: 'Scanty (inadequate for assessment)' };

function run(...parts) {
  const c = createCase(schema, parts.length);
  parts.forEach((values, i) => { c.parts[i].values = { ...c.parts[i].values, ...values }; });
  return generate(schema, generator, c).microscopy.split('\n\n');
}

test('two narrative parts: each paragraph opens with its letter', () => {
  const [a, b] = run(CURETTINGS, CURETTINGS);
  assert.match(a, /^\(A\) Sections show /);
  assert.match(b, /^\(B\) Sections show /);
});

test('checklist and narrative parts in one case are both lettered, in either order', () => {
  const [a1, b1] = run(POG, CURETTINGS);
  assert.match(a1, /^\(A\)\n- Chorionic villi/);
  assert.match(b1, /^\(B\) Sections show /);
  const [a2, b2] = run(CURETTINGS, POG);
  assert.match(a2, /^\(A\) Sections show /);
  assert.match(b2, /^\(B\)\n- Chorionic villi/);
});

test('the scanty path is lettered too', () => {
  const [a, b] = run(SCANTY, CURETTINGS);
  assert.match(a, /^\(A\) /);
  assert.match(b, /^\(B\) /);
});

test('single part: no letter on the narrative or the checklist', () => {
  const [n] = run(CURETTINGS);
  assert.match(n, /^Sections show /);
  const [p] = run(POG);
  assert.match(p, /^- Chorionic villi/);
});

test('the two-part example letters both paragraphs', () => {
  const c = { schemaId: schema.id, caseTitle: '', options: {}, parts: schema.example.parts.map((p, i) => ({ label: 'AB'[i], values: p.values })) };
  const micro = generate(schema, generator, c).microscopy.split('\n\n');
  assert.equal(micro.length, 2);
  assert.match(micro[0], /^\(A\) /);
  assert.match(micro[1], /^\(B\) /);
});
