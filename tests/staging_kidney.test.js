// Kidney staging (AJCC 8th edition, Chapter 60).
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM } from '../src/staging/index.js';
import { EXT, METS } from '../src/staging/kidney.js';

const base = (over = {}) => ({
  sizeMm: '35',
  extension: [EXT.limited],
  nodesExamined: '4',
  nodesInvolved: '0',
  distantMets: [METS.na],
  ...over
});

test('kidney staging: size cutoffs for pT1a, pT1b, pT2a, pT2b', () => {
  assert.equal(deriveTNM(base({ sizeMm: '40' }), 'kidney').tnm, 'pT1a pN0');
  assert.equal(deriveTNM(base({ sizeMm: '40' }), 'kidney').stage, 'I');
  assert.equal(deriveTNM(base({ sizeMm: '41' }), 'kidney').tnm, 'pT1b pN0');
  assert.equal(deriveTNM(base({ sizeMm: '70' }), 'kidney').tnm, 'pT1b pN0');
  assert.equal(deriveTNM(base({ sizeMm: '71' }), 'kidney').tnm, 'pT2a pN0');
  assert.equal(deriveTNM(base({ sizeMm: '71' }), 'kidney').stage, 'II');
  assert.equal(deriveTNM(base({ sizeMm: '100' }), 'kidney').tnm, 'pT2a pN0');
  assert.equal(deriveTNM(base({ sizeMm: '101' }), 'kidney').tnm, 'pT2b pN0');
});

test('kidney staging: pT3a, pT3b, pT3c and pT4', () => {
  assert.equal(deriveTNM(base({ extension: [EXT.sinus] }), 'kidney').tnm, 'pT3a pN0');
  assert.equal(deriveTNM(base({ extension: [EXT.sinus] }), 'kidney').stage, 'III');
  assert.equal(deriveTNM(base({ extension: [EXT.perinephric] }), 'kidney').tnm, 'pT3a pN0');
  assert.equal(deriveTNM(base({ extension: [EXT.pelvicalyceal] }), 'kidney').tnm, 'pT3a pN0');
  assert.equal(deriveTNM(base({ extension: [EXT.renalVein] }), 'kidney').tnm, 'pT3a pN0');
  assert.equal(deriveTNM(base({ extension: [EXT.ivcBelow] }), 'kidney').tnm, 'pT3b pN0');
  assert.equal(deriveTNM(base({ extension: [EXT.ivcAboveOrWall] }), 'kidney').tnm, 'pT3c pN0');
  assert.equal(deriveTNM(base({ extension: [EXT.beyondGerota] }), 'kidney').tnm, 'pT4 pN0');
  assert.equal(deriveTNM(base({ extension: [EXT.beyondGerota] }), 'kidney').stage, 'IV');
});

test('kidney staging: pN0, pN1, NX omitted when no nodes, and pM1 (including non-contiguous adrenal)', () => {
  assert.equal(deriveTNM(base({ nodesExamined: '0', nodesInvolved: '0' }), 'kidney').tnm, 'pT1a');
  const n1 = deriveTNM(base({ nodesExamined: '6', nodesInvolved: '1' }), 'kidney');
  assert.equal(n1.tnm, 'pT1a pN1');
  assert.equal(n1.stage, 'III');
  const m1 = deriveTNM(base({ distantMets: [METS.nonContigAdrenal] }), 'kidney');
  assert.equal(m1.tnm, 'pT1a pN0 pM1');
  assert.equal(m1.stage, 'IV');
});

test('kidney staging: pT0, descriptors (m, r, y), and override', () => {
  assert.equal(deriveTNM(base({ noPrimary: true }), 'kidney').tnm, 'pT0 pN0');
  assert.equal(deriveTNM(base({ multiplePrimaries: true, postTherapy: true }), 'kidney').tnm, 'ypT1a(m) ypN0');
  const ov = deriveTNM(base({ tnmOverride: 'pT3a pN1', tnmOverrideReason: 'Gross sinus vein' }), 'kidney');
  assert.equal(ov.tnm, 'pT3a pN1');
  assert.equal(ov.overridden, true);
});
