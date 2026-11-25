// AJCC 8th edition Prostate (Radical Prostatectomy, Chapter 58) staging unit tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM } from '../src/staging/index.js';
import * as P from '../src/staging/prostate.js';

const stage = (v) => deriveTNM(v, 'prostate');

test('prostate staging: pT2 organ confined, pT3a EPE or bladder neck, pT3b SVI, pT4 adjacent, pT0', () => {
  assert.equal(stage({ epe: 'Not identified', bladderNeck: 'Not identified', svi: 'Not identified' }).tnm, 'pT2');
  assert.equal(stage({ epe: 'Present, focal', bladderNeck: 'Not identified', svi: 'Not identified' }).tnm, 'pT3a');
  assert.equal(stage({ epe: 'Present, nonfocal', bladderNeck: 'Not identified', svi: 'Not identified' }).tnm, 'pT3a');
  assert.equal(stage({ epe: 'Not identified', bladderNeck: 'Present', svi: 'Not identified' }).tnm, 'pT3a');
  assert.equal(stage({ epe: 'Present, nonfocal', bladderNeck: 'Not identified', svi: 'Present, right' }).tnm, 'pT3b');
  assert.equal(stage({ epe: 'Not identified', svi: 'Present, bilateral' }).tnm, 'pT3b');
  assert.equal(stage({ epe: 'Present, nonfocal', svi: 'Present, left', adjacentInvasion: 'Present' }).tnm, 'pT4');
  assert.equal(stage({ noPrimary: true }).tnm, 'pT0');
  assert.equal(stage({ epe: 'Cannot be determined' }).T, 'TX');
});

test('prostate staging: pN0/pN1, pM1a/b/c, y/m/r descriptors and Stage IVA/IVB', () => {
  const n0 = stage({ epe: 'Present, focal', nodesExamined: '12', nodesInvolved: '0' });
  assert.equal(n0.tnm, 'pT3a pN0');
  assert.equal(n0.stage, null);

  const n1 = stage({ epe: 'Present, nonfocal', svi: 'Present, bilateral', nodesExamined: '14', nodesInvolved: '2' });
  assert.equal(n1.tnm, 'pT3b pN1');
  assert.equal(n1.stage, 'IVA');

  const m1a = stage({ epe: 'Present, focal', distantMets: ['Non-regional lymph node(s)'] });
  assert.equal(m1a.tnm, 'pT3a pM1a');
  assert.equal(m1a.stage, 'IVB');

  const m1b = stage({ epe: 'Present, focal', distantMets: ['Bone'] });
  assert.equal(m1b.tnm, 'pT3a pM1b');
  assert.equal(m1b.stage, 'IVB');

  const m1c = stage({ epe: 'Present, focal', distantMets: ['Bone', 'Other (specify)'] });
  assert.equal(m1c.tnm, 'pT3a pM1c');
  assert.equal(m1c.stage, 'IVB');

  const yp = stage({ epe: 'Not identified', treatmentEffect: 'Hormonal therapy effect present', recurrent: true });
  assert.equal(yp.tnm, 'rypT2');
});

test('prostate staging: Gleason score and WHO/ISUP Grade Group arithmetic', () => {
  assert.deepEqual(P.gleasonInfo({ primary: '3', secondary: '3' }), { primary: 3, secondary: 3, tertiary: null, score: 6, group: 1 });
  assert.deepEqual(P.gleasonInfo({ primary: '3', secondary: '4', tertiary: '5' }), { primary: 3, secondary: 4, tertiary: 5, score: 7, group: 2 });
  assert.deepEqual(P.gleasonInfo({ primary: '4', secondary: '3' }), { primary: 4, secondary: 3, tertiary: null, score: 7, group: 3 });
  assert.deepEqual(P.gleasonInfo({ primary: '4', secondary: '4' }), { primary: 4, secondary: 4, tertiary: null, score: 8, group: 4 });
  assert.deepEqual(P.gleasonInfo({ primary: '3', secondary: '5' }), { primary: 3, secondary: 5, tertiary: null, score: 8, group: 4 });
  assert.deepEqual(P.gleasonInfo({ primary: '4', secondary: '5' }), { primary: 4, secondary: 5, tertiary: null, score: 9, group: 5 });
  assert.deepEqual(P.gleasonInfo({ primary: '5', secondary: '5' }), { primary: 5, secondary: 5, tertiary: null, score: 10, group: 5 });
});
