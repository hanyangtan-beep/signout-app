// AJCC 8th edition Bone staging (Chapter 38) unit tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM } from '../src/staging/index.js';
import * as B from '../src/staging/bone.js';

const stage = (v) => deriveTNM({ siteGroup: B.SITE.appendicular, ...v }, 'bone');

test('bone staging: appendicular skeleton, trunk, skull and facial bones pT and stage groups', () => {
  assert.equal(stage({ tumourSizeMm: '65', histGrade: 'G1: Well differentiated, low grade' }).tnm, 'pT1');
  assert.equal(stage({ tumourSizeMm: '65', histGrade: 'G1: Well differentiated, low grade' }).stage, 'IA');
  assert.equal(stage({ tumourSizeMm: '80', histGrade: 'G2: Moderately differentiated, high grade' }).tnm, 'pT1');
  assert.equal(stage({ tumourSizeMm: '80', histGrade: 'G2: Moderately differentiated, high grade' }).stage, 'IIA');
  assert.equal(stage({ tumourSizeMm: '81', histGrade: 'G1: Well differentiated, low grade' }).tnm, 'pT2');
  assert.equal(stage({ tumourSizeMm: '81', histGrade: 'G1: Well differentiated, low grade' }).stage, 'IB');
  assert.equal(stage({ tumourSizeMm: '95', histGrade: 'G3: Poorly differentiated, high grade' }).tnm, 'pT2');
  assert.equal(stage({ tumourSizeMm: '95', histGrade: 'G3: Poorly differentiated, high grade' }).stage, 'IIB');
  assert.equal(stage({ tumourSizeMm: '50', discontinuous: true, histGrade: 'G3: Poorly differentiated, high grade' }).tnm, 'pT3');
  assert.equal(stage({ tumourSizeMm: '50', discontinuous: true, histGrade: 'G3: Poorly differentiated, high grade' }).stage, 'III');
  assert.equal(stage({ tumourSizeMm: '50', discontinuous: true, histGrade: 'G1: Well differentiated, low grade' }).stage, 'IB');
  assert.equal(stage({ noPrimary: true }).tnm, 'pT0');
});

test('bone staging: spine pT table and no AJCC 8th stage group', () => {
  const sp = (spineExtent) => stage({ siteGroup: B.SITE.spine, spineExtent, histGrade: 'G3: Poorly differentiated, high grade' });
  assert.equal(sp(B.SPINE_EXTENT.t1).T, 'T1');
  assert.equal(sp(B.SPINE_EXTENT.t2).T, 'T2');
  assert.equal(sp(B.SPINE_EXTENT.t3).T, 'T3');
  assert.equal(sp(B.SPINE_EXTENT.t4a).T, 'T4a');
  assert.equal(sp(B.SPINE_EXTENT.t4b).T, 'T4b');
  assert.equal(sp(B.SPINE_EXTENT.t4).T, 'T4');
  assert.equal(sp(B.SPINE_EXTENT.t4a).stage, null);
});

test('bone staging: pelvis pT table (a <= 80 mm / b > 80 mm / T4a / T4b) and no stage group', () => {
  const pel = (pelvisExtent, tumourSizeMm = '') => stage({ siteGroup: B.SITE.pelvis, pelvisExtent, tumourSizeMm, histGrade: 'G2: Moderately differentiated, high grade' });
  assert.equal(pel(B.PELVIS_EXTENT.t1, '70').T, 'T1a');
  assert.equal(pel(B.PELVIS_EXTENT.t1, '90').T, 'T1b');
  assert.equal(pel(B.PELVIS_EXTENT.t1, '').T, 'T1');
  assert.equal(pel(B.PELVIS_EXTENT.t2, '80').T, 'T2a');
  assert.equal(pel(B.PELVIS_EXTENT.t2, '85').T, 'T2b');
  assert.equal(pel(B.PELVIS_EXTENT.t3, '60').T, 'T3a');
  assert.equal(pel(B.PELVIS_EXTENT.t3, '120').T, 'T3b');
  assert.equal(pel(B.PELVIS_EXTENT.t4a, '120').T, 'T4a');
  assert.equal(pel(B.PELVIS_EXTENT.t4b, '120').T, 'T4b');
  assert.equal(pel(B.PELVIS_EXTENT.t3, '120').stage, null);
});

test('bone staging: regional lymph nodes, M1a (lung) vs M1b (non-lung), and y/m/r descriptors', () => {
  const n0 = stage({ tumourSizeMm: '60', nodesExamined: '4', nodesInvolved: '0', histGrade: 'G3: Poorly differentiated, high grade' });
  assert.equal(n0.tnm, 'pT1 pN0');
  assert.equal(n0.stage, 'IIA');

  const n1 = stage({ tumourSizeMm: '60', nodesExamined: '4', nodesInvolved: '1', histGrade: 'G3: Poorly differentiated, high grade' });
  assert.equal(n1.tnm, 'pT1 pN1');
  assert.equal(n1.stage, 'IVB');

  const m1a = stage({ tumourSizeMm: '90', distantMets: ['Lung'], histGrade: 'G3: Poorly differentiated, high grade' });
  assert.equal(m1a.tnm, 'pT2 pM1a');
  assert.equal(m1a.stage, 'IVA');

  const m1b = stage({ tumourSizeMm: '90', distantMets: ['Lung', 'Bone'], histGrade: 'G3: Poorly differentiated, high grade' });
  assert.equal(m1b.tnm, 'pT2 pM1b');
  assert.equal(m1b.stage, 'IVB');

  const yp = stage({ tumourSizeMm: '95', preresection: ['Chemotherapy performed'], recurrent: true, multiplePrimaries: true });
  assert.equal(yp.tnm, 'rypT2(m)');
});

test('bone staging: non-staged benign/locally aggressive bone tumours return null stage group', () => {
  assert.equal(B.isNotStaged({ histType: 'Giant cell tumour of bone' }), true);
  assert.equal(B.isNotStaged({ histType: 'Osteoblastoma' }), true);
  assert.equal(B.isNotStaged({ histType: 'Conventional osteosarcoma' }), false);
  const gct = stage({ histType: 'Giant cell tumour of bone', tumourSizeMm: '55' });
  assert.equal(gct.stage, null);
});
