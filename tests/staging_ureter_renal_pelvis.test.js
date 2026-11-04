// Ureter and renal pelvis carcinoma staging module - Phase 83 (4 November 2026). AJCC 8th edition (AJCC keeps
// chapter 61 on the 8th edition), the categories of CAP Ureter, Renal Pelvis 2.4.0.0, the stage groups of the NCI
// PDQ table. Sources: docs/reference/upper-tract-sources.md. pT by the deepest extent with the site-specific pT3
// routes, carcinoma in situ beside pTa, pN by count and the 20 mm cut-off, the descriptors, the override and the
// grouping are pinned here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM, stageLine } from '../src/staging/index.js';
import * as S from '../src/staging/ureter_renal_pelvis.js';

const BASE = { extension: [S.EXT.T3parenchyma], nodesExamined: '3', nodesInvolved: '0', distantMets: ['Not applicable'] };
const ur = (patch = {}) => deriveTNM({ ...BASE, ...patch }, 'ureter_renal_pelvis');
const tnm = (patch) => ur(patch).tnm;
const tCat = (extension) => S.T({ ...BASE, extension }).cat;
const nCat = (patch) => S.N({ ...BASE, ...patch }).cat;

test('ureter and renal pelvis module: registered under its id, AJCC 8th edition', () => {
  assert.equal(S.id, 'ureter_renal_pelvis');
  assert.equal(S.edition, 'AJCC 8th edition');
  const r = ur();
  assert.equal(r.edition, 'AJCC 8th edition');
  assert.equal(r.tnm, 'pT3 pN0');
  assert.equal(r.stage, 'III');
  assert.equal(stageLine(r), 'Stage group (if cM0): III');
});

test('ureter and renal pelvis T: the deepest extent ticked; the three pT3 routes and the two pT4 routes', () => {
  assert.equal(tCat([S.EXT.Ta]), 'Ta');
  assert.equal(tCat([S.EXT.Tis]), 'Tis');
  assert.equal(tCat([S.EXT.T1]), 'T1');
  assert.equal(tCat([S.EXT.T2]), 'T2');
  for (const e of [S.EXT.T3pelvisFat, S.EXT.T3parenchyma, S.EXT.T3ureterFat]) assert.equal(tCat([e]), 'T3', e);
  for (const e of [S.EXT.T4kidney, S.EXT.T4organs]) assert.equal(tCat([e]), 'T4', e);
  assert.equal(tCat([S.EXT.T1, S.EXT.T3ureterFat, S.EXT.Tis]), 'T3', 'the deepest wins; carcinoma in situ does not lower it');
  assert.equal(tCat([S.EXT.T0]), 'T0');
  assert.equal(tCat([S.EXT.TX]), 'TX');
  assert.equal(tCat([]), 'TX', 'no extension, pTX (the generator warns)');
});

test('ureter and renal pelvis T: carcinoma in situ beside a non-invasive papillary carcinoma stays pTa, the suffix not printed', () => {
  const v = { ...BASE, extension: [S.EXT.Ta, S.EXT.Tis], nodesExamined: '', nodesInvolved: '' };
  assert.equal(S.T(v).cat, 'Ta');
  assert.equal(S.cisWithTa(v), true);
  assert.equal(deriveTNM(v, 'ureter_renal_pelvis').tnm, 'pTa');
  assert.equal(S.cisWithTa({ extension: [S.EXT.Ta, S.EXT.Tis, S.EXT.T1] }), false, 'invasion makes it pT1');
  assert.equal(S.cisWithTa({ extension: [S.EXT.Tis] }), false);
});

test('ureter and renal pelvis N: one node 20 mm or less is pN1; more than 20 mm or more than one node is pN2', () => {
  assert.equal(nCat({}), 'N0');
  assert.equal(nCat({ nodesInvolved: '1', largestDepositMm: '20' }), 'N1');
  assert.equal(nCat({ nodesInvolved: '1', largestDepositMm: '21' }), 'N2');
  assert.equal(nCat({ nodesInvolved: '2', largestDepositMm: '3' }), 'N2', 'multiple nodes, whatever their size');
  assert.equal(nCat({ nodesInvolved: '1', largestDepositMm: '', largestNodeMm: '15' }), 'N1', 'a 15 mm node cannot hold a deposit over 20 mm');
  assert.equal(nCat({ nodesInvolved: '1', largestDepositMm: '', largestNodeMm: '25' }), 'NX', 'a 25 mm node with no deposit size');
  assert.equal(nCat({ nodesInvolved: '1', largestDepositMm: '', largestNodeMm: '15', ene: 'Present' }), 'NX', 'with extranodal extension the deposit may exceed the node');
  assert.equal(nCat({ nodesInvolved: '1' }), 'NX', 'one node, no size');
  assert.deepEqual(S.N({ ...BASE, nodesExamined: '', nodesInvolved: '' }), { cat: 'NX', none: true });
  assert.equal(tnm({ nodesExamined: '', nodesInvolved: '' }), 'pT3', 'no nodes submitted: no pN printed');
});

test('ureter and renal pelvis M and descriptors: m, r and y; pM1 only for a named site', () => {
  assert.equal(S.M({ distantMets: ['Not applicable'] }).cat, 'M-');
  assert.equal(S.M({ distantMets: ['Not identified'] }).cat, 'M-');
  assert.equal(S.M({ distantMets: ['Lung', 'Liver'] }).cat, 'M1');
  assert.equal(tnm({ distantMets: ['Bone'] }), 'pT3 pN0 pM1');
  assert.equal(tnm({ multiplePrimaries: true }), 'pT3(m) pN0');
  assert.equal(tnm({ recurrent: true }), 'rpT3 pN0');
  assert.equal(tnm({ postTherapy: true }), 'ypT3 ypN0');
});

test('ureter and renal pelvis stage groups: 0a, 0is, I to III with N0; T4, N1, N2 or M1 is IV; else not assignable', () => {
  assert.equal(S.stageGroup('Ta', 'N0', 'M-'), '0a');
  assert.equal(S.stageGroup('Tis', 'N0', 'M-'), '0is');
  assert.equal(S.stageGroup('T1', 'N0', 'M-'), 'I');
  assert.equal(S.stageGroup('T2', 'N0', 'M-'), 'II');
  assert.equal(S.stageGroup('T3', 'N0', 'M-'), 'III');
  assert.equal(S.stageGroup('T4', 'N0', 'M-'), 'IV');
  assert.equal(S.stageGroup('T4', 'NX', 'M-'), 'IV', 'T4 is IV with any N');
  assert.equal(S.stageGroup('T1', 'N1', 'M-'), 'IV');
  assert.equal(S.stageGroup('Ta', 'N2', 'M-'), 'IV');
  assert.equal(S.stageGroup('T2', 'N0', 'M1'), 'IV');
  assert.equal(S.stageGroup('T2', 'NX', 'M-'), '');
  assert.equal(S.stageGroup('TX', 'N0', 'M-'), '');
  assert.deepEqual(S.referenceLines({ ...BASE }, ur()), ['Stage group, AJCC 8th edition (reference, not reported): III']);
  assert.deepEqual(S.referenceLines({ ...BASE, nodesInvolved: '1' }, ur({ nodesInvolved: '1' })),
    ['Stage group, AJCC 8th edition (reference, not reported): not assignable - the regional node category is needed']);
  assert.deepEqual(S.referenceLines({ ...BASE, extension: [] }, ur({ extension: [] })),
    ['Stage group, AJCC 8th edition (reference, not reported): not assignable - the primary tumour category is needed']);
});

test('ureter and renal pelvis override: pTa and pTis parse; the override wins and carries its reason', () => {
  const ta = ur({ tnmOverride: 'pTa pN0', tnmOverrideReason: 'papillary tumour without invasion on levels' });
  assert.equal(ta.overridden, true);
  assert.equal(ta.tnm, 'pTa pN0');
  assert.equal(ta.T, 'Ta');
  assert.equal(ta.stage, '0a');
  assert.equal(ta.derived.T, 'T3');
  const tis = ur({ tnmOverride: 'pTis pNX', tnmOverrideReason: 'x' });
  assert.equal(tis.T, 'Tis');
  assert.equal(tis.tnm, 'pTis pNX');
});
