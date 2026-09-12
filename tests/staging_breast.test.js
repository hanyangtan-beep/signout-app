// Breast carcinoma (AJCC 8th) and phyllodes tumour (AJCC 8th soft tissue-style T) staging modules.
// Spec: docs/specs/breast-pair.md. The in situ pTis categories, the (sn) suffix, N by macro / micro / ITC counts,
// the anatomic stage group and the phyllodes 50 / 100 / 150 mm cut-offs are all pinned here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM, stageLine } from '../src/staging/index.js';
import { sizeT, N, stageGroup, bareN } from '../src/staging/breast.js';
import { sizeT as phT } from '../src/staging/phyllodes.js';

const NST = 'Invasive carcinoma of no special type (ductal)';
const BASE = { histType: NST, sizeMode: 'Greatest dimension', sizeMm: '23', nodeSampling: 'Sentinel node biopsy only', nodesExamined: '2', nodesSentinel: '2', nodesMacro: '0', nodesMicro: '0', nodesItc: '0', treatmentEffect: 'No known presurgical therapy', distantMets: 'Not applicable' };
const br = (patch = {}) => deriveTNM({ ...BASE, ...patch }, 'breast');
const tnm = (patch) => br(patch).tnm;

test('breast T: size cut-offs, microinvasion, T4 descriptors, in situ and no residual', () => {
  assert.equal(sizeT(1), 'T1mi');
  assert.equal(sizeT(4), 'T1a');
  assert.equal(sizeT(10), 'T1b');
  assert.equal(sizeT(20), 'T1c');
  assert.equal(sizeT(20.5), 'T2');
  assert.equal(sizeT(50), 'T2');
  assert.equal(sizeT(51), 'T3');
  assert.equal(sizeT(null), null);
  assert.equal(sizeT(30, true), 'T1mi', 'microinvasion only overrides the size');
  assert.equal(tnm({ sizeMode: 'Microinvasion only', sizeMm: '0.8' }), 'pT1mi pN0(sn)');
  assert.equal(tnm({ skin: 'Present and involved with macroscopic skin ulceration' }), 'pT4b pN0(sn)');
  assert.equal(tnm({ skinOedema: true }), 'pT4b pN0(sn)');
  assert.equal(tnm({ inflammatory: true }), 'pT4d pN0(sn)');
  assert.equal(tnm({ sizeMm: '' }), 'pTX pN0(sn)');
  assert.ok(br({ sizeMm: '' }).notes.some((n) => /pTX/.test(n)));
  // In situ: the DCIS template forces inSitu; Paget alone is pTis(Paget).
  assert.equal(deriveTNM({ ...BASE, inSitu: true, histType: 'Ductal carcinoma in situ (DCIS)' }, 'breast').tnm, 'pTis(DCIS) pN0(sn)');
  assert.equal(deriveTNM({ ...BASE, inSitu: true, histType: 'Paget disease' }, 'breast').tnm, 'pTis(Paget) pN0(sn)');
  assert.equal(tnm({ histType: 'No residual invasive carcinoma', sizeMode: 'No residual carcinoma', sizeMm: '', dcis: 'Not identified' }), 'pT0 pN0(sn)');
  assert.equal(tnm({ histType: 'No residual invasive carcinoma', sizeMode: 'No residual carcinoma', sizeMm: '', dcis: 'Present, Negative for extensive intraductal component (EIC)' }), 'pTis(DCIS) pN0(sn)');
  assert.equal(tnm({ histType: 'No residual invasive carcinoma', sizeMode: 'No residual carcinoma', sizeMm: '', dcis: 'Present, Negative for extensive intraductal component (EIC)', treatmentEffect: 'Presurgical therapy with response' }), 'ypTis(DCIS) ypN0(sn)');
});

test('breast N: macro / micro / ITC counts, (sn) up to five sentinel nodes, N2a / N3a, internal mammary and supraclavicular', () => {
  assert.equal(tnm({ nodesMacro: '1' }), 'pT2 pN1a(sn)');
  assert.equal(tnm({ nodesMicro: '1' }), 'pT2 pN1mi(sn)');
  assert.equal(tnm({ nodesItc: '1' }), 'pT2 pN0(i+)(sn)');
  assert.equal(tnm({ nodeMolPos: true }), 'pT2 pN0(mol+)(sn)');
  assert.equal(tnm({ nodeSampling: 'Axillary dissection', nodesSentinel: '', nodesExamined: '14', nodesMacro: '4' }), 'pT2 pN2a');
  assert.equal(tnm({ nodeSampling: 'Axillary dissection', nodesSentinel: '', nodesExamined: '20', nodesMacro: '10' }), 'pT2 pN3a');
  assert.equal(tnm({ nodeSampling: 'Sentinel node biopsy only', nodesExamined: '6', nodesSentinel: '6', nodesMacro: '1' }), 'pT2 pN1a', 'more than five sentinel nodes drops the (sn) suffix');
  assert.equal(tnm({ nodesMacro: '1', imNodes: 'Positive (sentinel, microscopic)' }), 'pT2 pN1c(sn)');
  assert.equal(tnm({ imNodes: 'Positive (sentinel, microscopic)' }), 'pT2 pN1b(sn)');
  assert.equal(tnm({ imNodes: 'Positive (clinically detected)' }), 'pT2 pN2b(sn)');
  assert.equal(tnm({ nodesMacro: '1', imNodes: 'Positive (clinically detected)' }), 'pT2 pN3b(sn)');
  assert.equal(tnm({ infraclavicular: true }), 'pT2 pN3a(sn)');
  assert.equal(tnm({ supraclavicular: true }), 'pT2 pN3c(sn)');
  assert.equal(tnm({ nodeSampling: 'No nodes submitted', nodesExamined: '', nodesSentinel: '' }), 'pT2 pNX');
  assert.ok(br({ nodeSampling: 'No nodes submitted', nodesExamined: '', nodesSentinel: '' }).notes.some((n) => /^pNX/.test(n)));
  assert.equal(bareN('N0(i+)(sn)'), 'N0');
  assert.equal(bareN('N1a(sn)'), 'N1a');
  assert.equal(N({ nodeSampling: 'Sentinel node biopsy only', nodesExamined: '3', nodesMacro: '0', nodesMicro: '2', nodesItc: '0' }).cat, 'N1mi(sn)');
});

test('breast M, descriptors and the anatomic stage group', () => {
  assert.equal(tnm({ distantMets: 'Present', distantSites: ['Bone'] }), 'pT2 pN0(sn) pM1');
  assert.equal(br({ distantMets: 'Present', distantSites: ['Bone'] }).stage, 'IV');
  assert.equal(tnm({ focality: 'Multiple foci of invasive carcinoma', sizeMm: '25' }), 'pT2(m) pN0(sn)');
  assert.equal(tnm({ recurrent: true }), 'rpT2 pN0(sn)');
  assert.equal(tnm({ treatmentEffect: 'Presurgical therapy with response', sizeMm: '8' }), 'ypT1b ypN0(sn)');
  assert.equal(br({}).stage, 'IIA');
  assert.equal(br({ sizeMm: '15' }).stage, 'IA');
  assert.equal(br({ sizeMm: '15', nodesMicro: '1' }).stage, 'IB');
  assert.equal(br({ nodesMacro: '1' }).stage, 'IIB');
  assert.equal(br({ sizeMm: '55' }).stage, 'IIB');
  assert.equal(br({ nodeSampling: 'Axillary dissection', nodesSentinel: '', nodesExamined: '14', nodesMacro: '4' }).stage, 'IIIA');
  assert.equal(br({ inflammatory: true }).stage, 'IIIB');
  assert.equal(br({ supraclavicular: true }).stage, 'IIIC');
  assert.equal(deriveTNM({ ...BASE, inSitu: true, histType: 'Ductal carcinoma in situ (DCIS)' }, 'breast').stage, '0');
  assert.equal(br({ nodeSampling: 'No nodes submitted', nodesExamined: '', nodesSentinel: '' }).stage, null, 'no group with NX');
  assert.equal(stageGroup('T1c', 'N0(sn)', 'M-'), 'IA');
  assert.equal(stageGroup('T0', 'N1a', 'M-'), 'IIA');
  assert.equal(br({}).edition, 'AJCC 8th edition');
  assert.match(stageLine(br({})), /IIA/);
});

test('breast override: a typed pTNM replaces the derived one and keeps the reason', () => {
  const s = br({ tnmOverride: 'pT3 pN1a', tnmOverrideReason: 'size on the radiology-pathology review' });
  assert.equal(s.overridden, true);
  assert.match(s.tnm, /^pT3 pN1a/);
  assert.deepEqual([s.derived.T, s.derived.N], ['T2', 'N0(sn)']);
  assert.equal(s.stage, 'IIIA', 'the stage group follows the overridden categories');
  assert.ok(s.notes.some((n) => /overridden by pathologist: size on the radiology-pathology review/.test(n)));
});

test('phyllodes T by 50 / 100 / 150 mm, N by involved count, M, r prefix, no stage group', () => {
  assert.equal(phT(50), 'T1');
  assert.equal(phT(51), 'T2');
  assert.equal(phT(100), 'T2');
  assert.equal(phT(101), 'T3');
  assert.equal(phT(150), 'T3');
  assert.equal(phT(151), 'T4');
  const ph = (v) => deriveTNM({ histType: 'Phyllodes tumor, malignant', ...v }, 'phyllodes');
  assert.equal(ph({ sizeMm: '45', nodeSampling: 'No nodes submitted' }).tnm, 'pT1 pNX');
  assert.equal(ph({ sizeMm: '51', nodeSampling: 'Sentinel node biopsy only', nodesExamined: '2', nodesPositive: '0' }).tnm, 'pT2 pN0');
  assert.equal(ph({ sizeMm: '120', nodeSampling: 'Axillary dissection', nodesExamined: '3', nodesPositive: '1' }).tnm, 'pT3 pN1');
  assert.equal(ph({ sizeMm: '160', distantMets: 'Present', distantSites: ['Lung'] }).tnm, 'pT4 pNX pM1');
  assert.equal(ph({ sizeMm: '30', recurrent: true }).tnm, 'rpT1 pNX');
  assert.equal(ph({ histType: 'No tumor' }).tnm, 'pT0 pNX');
  assert.equal(ph({}).tnm, 'pTX pNX');
  assert.ok(ph({}).notes.some((n) => /5 \/ 10 \/ 15 cm/.test(n)));
  assert.equal(ph({ sizeMm: '45' }).stage, null, 'phyllodes has no AJCC stage group');
  assert.equal(ph({ sizeMm: '45' }).edition, 'AJCC 8th edition');
});
