// Staging module — colorectal AJCC 8th edition rule tables and override handling (Phase 5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM, parseOverride, stageLine } from '../src/staging/index.js';
import * as crc from '../src/staging/colorectal.js';

const base = {
  tumourExtension: 'Invades through muscularis propria into pericolorectal tissue', nodesExamined: '20', nodesPositive: '0',
  tumourDeposits: 'Not identified', distantMetastasis: ['Not applicable'], treatmentEffect: 'No known presurgical therapy', multiplePrimary: 'Not applicable (no additional primary site)', recurrent: false
};
const run = (v) => deriveTNM({ ...base, ...v }, 'colorectal');

test('every tumour extension option maps to a pT category', () => {
  const expected = {
    'No evidence of primary tumour': 'T0', 'No invasion (high grade dysplasia)': 'Tis',
    'Invades lamina propria / muscularis mucosae (intramucosal carcinoma)': 'Tis', 'Invades submucosa': 'T1', 'Invades muscularis propria': 'T2',
    'Invades through muscularis propria into pericolorectal tissue': 'T3',
    'Invades visceral peritoneum (including through inflammation to the serosal surface)': 'T4a',
    'Directly invades or adheres to adjacent structure(s)': 'T4b', 'Cannot be assessed': 'TX'
  };
  for (const [ext, cat] of Object.entries(expected)) assert.equal(run({ tumourExtension: ext }).T, cat, ext);
  assert.equal(run({ tumourExtension: '' }).T, 'TX');
});

test('pN follows the number of positive nodes and tumour deposits', () => {
  assert.equal(run({ nodesPositive: '0' }).N, 'N0');
  assert.equal(run({ nodesPositive: '1' }).N, 'N1a');
  assert.equal(run({ nodesPositive: '2' }).N, 'N1b');
  assert.equal(run({ nodesPositive: '3' }).N, 'N1b');
  assert.equal(run({ nodesPositive: '4' }).N, 'N2a');
  assert.equal(run({ nodesPositive: '6' }).N, 'N2a');
  assert.equal(run({ nodesPositive: '7' }).N, 'N2b');
  assert.equal(run({ nodesPositive: '0', tumourDeposits: 'Present' }).N, 'N1c');
  assert.equal(run({ nodesPositive: '2', tumourDeposits: 'Present' }).N, 'N1b', 'deposits do not change a node-positive pN');
  assert.equal(run({ nodesExamined: '0', nodesPositive: '' }).N, 'NX');
  assert.equal(run({ nodesExamined: '', nodesPositive: '', tumourDeposits: 'Present' }).N, 'N1c');
  assert.equal(run({ nodesPositive: '' }).N, 'NX');
});

test('pM from the metastasis sites in the specimen', () => {
  assert.equal(run({}).M, 'M-');
  assert.equal(run({ distantMetastasis: ['Liver'] }).M, 'M1a');
  assert.equal(run({ distantMetastasis: ['Liver', 'Non-regional lymph node(s)'] }).M, 'M1b');
  assert.equal(run({ distantMetastasis: ['Peritoneum'] }).M, 'M1c');
  assert.equal(run({ distantMetastasis: ['Liver', 'Peritoneum'] }).M, 'M1c');
});

test('stage groups follow the AJCC 8th edition table', () => {
  const g = crc.stageGroup;
  assert.equal(g('Tis', 'N0', 'M-'), '0');
  assert.equal(g('T1', 'N0', 'M-'), 'I'); assert.equal(g('T2', 'N0', 'M-'), 'I');
  assert.equal(g('T3', 'N0', 'M-'), 'IIA'); assert.equal(g('T4a', 'N0', 'M-'), 'IIB'); assert.equal(g('T4b', 'N0', 'M-'), 'IIC');
  assert.equal(g('T1', 'N1a', 'M-'), 'IIIA'); assert.equal(g('T2', 'N1c', 'M-'), 'IIIA'); assert.equal(g('T1', 'N2a', 'M-'), 'IIIA');
  assert.equal(g('T3', 'N1b', 'M-'), 'IIIB'); assert.equal(g('T4a', 'N1a', 'M-'), 'IIIB'); assert.equal(g('T2', 'N2a', 'M-'), 'IIIB');
  assert.equal(g('T3', 'N2a', 'M-'), 'IIIB'); assert.equal(g('T1', 'N2b', 'M-'), 'IIIB'); assert.equal(g('T2', 'N2b', 'M-'), 'IIIB');
  assert.equal(g('T4a', 'N2a', 'M-'), 'IIIC'); assert.equal(g('T3', 'N2b', 'M-'), 'IIIC'); assert.equal(g('T4a', 'N2b', 'M-'), 'IIIC');
  assert.equal(g('T4b', 'N1a', 'M-'), 'IIIC'); assert.equal(g('T4b', 'N2b', 'M-'), 'IIIC');
  assert.equal(g('T1', 'N0', 'M1a'), 'IVA'); assert.equal(g('T3', 'N2b', 'M1b'), 'IVB'); assert.equal(g('TX', 'NX', 'M1c'), 'IVC');
  assert.equal(g('TX', 'N0', 'M-'), null); assert.equal(g('T3', 'NX', 'M-'), null); assert.equal(g('T0', 'N0', 'M-'), null);
});

test('prefix and descriptors: y after therapy, (m) for multiple primaries, r for recurrence', () => {
  assert.equal(run({}).tnm, 'pT3 pN0');
  assert.equal(run({ treatmentEffect: 'Partial response (score 2): residual cancer with evident tumour regression' }).tnm, 'ypT3 ypN0');
  assert.equal(run({ treatmentEffect: 'Cannot be determined' }).tnm, 'pT3 pN0', 'unknown treatment effect does not add y');
  assert.equal(run({ multiplePrimary: 'Present' }).tnm, 'pT3(m) pN0');
  assert.equal(run({ recurrent: true }).tnm, 'rpT3 pN0');
  assert.equal(run({ distantMetastasis: ['Liver'] }).tnm, 'pT3 pN0 pM1a');
});

test('stage line marks the cM0 assumption when no metastasis is in the specimen', () => {
  assert.equal(stageLine(run({})), 'Stage group (if cM0): IIA');
  assert.equal(stageLine(run({ distantMetastasis: ['Liver'] })), 'Stage group: IVA');
  assert.equal(stageLine(run({ tumourExtension: 'Cannot be assessed' })), '');
});

test('manual override replaces the derived categories, keeps derived M when omitted, and records a note', () => {
  const r = run({ tnmOverride: 'pT2 pN1a', tnmOverrideReason: 'deeper invasion on levels' });
  assert.equal(r.tnm, 'pT2 pN1a'); assert.equal(r.stage, 'IIIA'); assert.equal(r.overridden, true);
  assert.deepEqual(r.derived, { T: 'T3', N: 'N0', M: 'M-' });
  assert.match(r.notes.join(' '), /overridden by pathologist: deeper invasion on levels/);
  assert.equal(run({ tnmOverride: 'ypT3 pN0', distantMetastasis: ['Liver'] }).M, 'M1a');
  assert.equal(run({ tnmOverride: 'pT3 pN0 pM1c' }).stage, 'IVC');
  const bad = run({ tnmOverride: 'stage 3' });
  assert.equal(bad.overridden, false); assert.equal(bad.tnm, 'pT3 pN0');
  assert.deepEqual(parseOverride('ypT4a ypN2b ypM1b'), { T: 'T4a', N: 'N2b', M: 'M1b' });
  assert.equal(parseOverride('T3'), null);
});

test('edition is stamped on every result', () => {
  assert.equal(run({}).edition, 'AJCC 8th edition');
  assert.throws(() => deriveTNM({}, 'nonexistent'), /Unknown staging protocol/);
});
