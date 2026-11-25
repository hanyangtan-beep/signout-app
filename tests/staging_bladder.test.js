// Urinary bladder staging (AJCC 8th edition, Chapter 62).
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM } from '../src/staging/index.js';
import { EXT, METS } from '../src/staging/bladder.js';

const base = (over = {}) => ({
  extension: EXT.t2b,
  nodesExamined: '16',
  nodesInvolved: '0',
  commonIliacInvolved: '0',
  distantMets: [METS.na],
  ...over
});

test('bladder staging: pTa, pTis, pT1, pT2a, pT2b, pT3a, pT3b, pT4a, pT4b', () => {
  assert.equal(deriveTNM(base({ extension: EXT.ta }), 'bladder').tnm, 'pTa pN0');
  assert.equal(deriveTNM(base({ extension: EXT.ta }), 'bladder').stage, '0a');
  assert.equal(deriveTNM(base({ extension: EXT.tis }), 'bladder').tnm, 'pTis pN0');
  assert.equal(deriveTNM(base({ extension: EXT.tis }), 'bladder').stage, '0is');
  assert.equal(deriveTNM(base({ extension: EXT.t1 }), 'bladder').tnm, 'pT1 pN0');
  assert.equal(deriveTNM(base({ extension: EXT.t1 }), 'bladder').stage, 'I');
  assert.equal(deriveTNM(base({ extension: EXT.t2a }), 'bladder').tnm, 'pT2a pN0');
  assert.equal(deriveTNM(base({ extension: EXT.t2a }), 'bladder').stage, 'II');
  assert.equal(deriveTNM(base({ extension: EXT.t2b }), 'bladder').tnm, 'pT2b pN0');
  assert.equal(deriveTNM(base({ extension: EXT.t3a }), 'bladder').tnm, 'pT3a pN0');
  assert.equal(deriveTNM(base({ extension: EXT.t3a }), 'bladder').stage, 'IIIA');
  assert.equal(deriveTNM(base({ extension: EXT.t3b }), 'bladder').tnm, 'pT3b pN0');
  assert.equal(deriveTNM(base({ extension: EXT.t4a }), 'bladder').tnm, 'pT4a pN0');
  assert.equal(deriveTNM(base({ extension: EXT.t4b }), 'bladder').tnm, 'pT4b pN0');
  assert.equal(deriveTNM(base({ extension: EXT.t4b }), 'bladder').stage, 'IVA');
});

test('bladder staging: pN0, pN1, pN2, pN3 (common iliac), NX omitted, pM1a and pM1b', () => {
  assert.equal(deriveTNM(base({ nodesExamined: '0', nodesInvolved: '0' }), 'bladder').tnm, 'pT2b');
  const n1 = deriveTNM(base({ nodesInvolved: '1' }), 'bladder');
  assert.equal(n1.tnm, 'pT2b pN1');
  assert.equal(n1.stage, 'IIIA');
  const n2 = deriveTNM(base({ nodesInvolved: '3' }), 'bladder');
  assert.equal(n2.tnm, 'pT2b pN2');
  assert.equal(n2.stage, 'IIIB');
  const n3 = deriveTNM(base({ nodesInvolved: '1', commonIliacInvolved: '1' }), 'bladder');
  assert.equal(n3.tnm, 'pT2b pN3');
  assert.equal(n3.stage, 'IIIB');
  const m1a = deriveTNM(base({ distantMets: [METS.nonRegLn] }), 'bladder');
  assert.equal(m1a.tnm, 'pT2b pN0 pM1a');
  assert.equal(m1a.stage, 'IVA');
  const m1b = deriveTNM(base({ distantMets: [METS.nonLn] }), 'bladder');
  assert.equal(m1b.tnm, 'pT2b pN0 pM1b');
  assert.equal(m1b.stage, 'IVB');
});

test('bladder staging: ypT0 complete response, descriptors, and override', () => {
  const cr = deriveTNM(base({ noPrimary: true, postTherapy: true }), 'bladder');
  assert.equal(cr.tnm, 'ypT0 ypN0');
  const ov = deriveTNM(base({ tnmOverride: 'pT3a pN2', tnmOverrideReason: 'Revised after deeper levels' }), 'bladder');
  assert.equal(ov.tnm, 'pT3a pN2');
  assert.equal(ov.overridden, true);
});
