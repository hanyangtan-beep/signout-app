import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/prostate.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('prostate_biopsy');
const run = (c) => generate(schema, gen, c);

test('prostate biopsy: inadequate core microscopy, diagnosis and repeat sampling snippet', () => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, specimenName: 'Right apex', coresTotal: '1', category: 'Inadequate' };
  const r = run(c);
  assert.ok(r.microscopy.includes('Sections show a core of fibromuscular tissue only. No prostatic glandular tissue is present for assessment.'));
  assert.equal(r.diagnosis, 'PROSTATE, right apex, needle core biopsy - INADEQUATE FOR DIAGNOSIS - fibromuscular tissue only, no prostatic glands sampled');
  assert.ok(r.comment.includes('repeat sampling is advised if clinically indicated'));

  c.parts[0].values.coresTotal = '2';
  assert.ok(run(c).microscopy.includes('Sections show 2 cores of fibromuscular tissue only.'));
});

test('prostate biopsy: inadequate core is excluded from summary denominator and listed separately', () => {
  const c = createCase(schema, 3);
  c.parts[0].values = { ...c.parts[0].values, specimenName: 'Right base', coresTotal: '2', category: 'Adenocarcinoma', primary: '3', secondary: '4', coresPositive: '1' };
  c.parts[1].values = { ...c.parts[1].values, specimenName: 'Left base', coresTotal: '2', category: 'Benign' };
  c.parts[2].values = { ...c.parts[2].values, specimenName: 'Left apex', coresTotal: '2', category: 'Inadequate' };
  const r = run(c);
  assert.ok(r.diagnosis.includes('SUMMARY: Acinar adenocarcinoma in 1 of 4 cores (part A); highest Gleason score 3+4=7 (Grade Group 2); (C) inadequate.'));
  assert.ok(r.comment.includes('(part C)'));

  c.parts[0].values.category = 'Benign';
  const benign = run(c);
  assert.ok(benign.diagnosis.includes('SUMMARY: No evidence of malignancy in 4 cores; (C) inadequate.'));
});

test('prostate biopsy: enriched reference galleries on atrophy, pni, epe, lvi and Modern Pathology links', () => {
  for (const id of ['category', 'primary', 'secondary', 'tertiary5', 'cribriform', 'idcp', 'atrophy', 'pni', 'epe', 'lvi']) {
    const f = schema.fields.find((x) => x.id === id);
    assert.ok(f?.reference?.groups?.length > 0, `${id} has a reference gallery`);
  }
  const cat = schema.fields.find((x) => x.id === 'category').reference;
  assert.ok(cat.groups.some((g) => g.heading.includes('ductal')));
  const allLinks = schema.fields.flatMap((f) => (f.reference?.groups || []).flatMap((g) => g.links || []));
  assert.ok(allLinks.some((l) => l.label.includes('Modern Pathology')), 'includes Modern Pathology literature links');
});
