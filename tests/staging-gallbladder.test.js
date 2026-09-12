// src/staging/gallbladder.js — AJCC 8th gallbladder pTNM boundary tests: lamina propria /
// muscular layer T1a / T1b, the T2a (peritoneal side) / T2b (hepatic side) side rule and the
// both-sides precedence, liver and adjacent-organ counting toward T3 / T4, N bins 1-3 vs 4+,
// and the full stage-group table.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM } from '../src/staging/index.js';

const EXT = {
  lp: 'Invades lamina propria',
  ml: 'Invades muscular layer',
  t2a: 'Invades perimuscular connective tissue on the peritoneal side without serosal involvement',
  t2b: 'Invades perimuscular connective tissue on the hepatic side without liver involvement',
  serosa: 'Perforates serosa (visceral peritoneum)',
  liver: 'Directly invades liver',
  stomach: 'Directly invades other adjacent organ(s) or structure(s): Stomach',
  duodenum: 'Directly invades other adjacent organ(s) or structure(s): Duodenum',
  pancreas: 'Directly invades other adjacent organ(s) or structure(s): Pancreas',
  portal: 'Directly invades other adjacent organ(s) or structure(s): Main portal vein',
  artery: 'Directly invades other adjacent organ(s) or structure(s): Hepatic artery',
  other: 'Directly invades other adjacent organ(s) or structure(s): Other (specify)',
  t0: 'No evidence of primary tumour',
  tx: 'Cannot be assessed'
};

const base = {
  histType: 'Adenocarcinoma',
  grade: 'G2, moderately differentiated',
  tumourExtension: [EXT.lp],
  nodesExamined: '2', nodesInvolved: '0',
  treatmentEffect: 'No known presurgical therapy',
  distantMets: ['Not identified']
};

const d = (vals) => deriveTNM({ ...base, ...vals }, 'gallbladder');

test('extension check-list maps to pT; deepest box governs; both sides is T2b', () => {
  assert.equal(d({ tumourExtension: [EXT.t0] }).T, 'T0');
  assert.equal(d({ tumourExtension: [EXT.lp] }).T, 'T1a');
  assert.equal(d({ tumourExtension: [EXT.ml] }).T, 'T1b');
  assert.equal(d({ tumourExtension: [EXT.t2a] }).T, 'T2a');
  assert.equal(d({ tumourExtension: [EXT.t2b] }).T, 'T2b');
  assert.equal(d({ tumourExtension: [EXT.t2a, EXT.t2b] }).T, 'T2b');
  assert.equal(d({ tumourExtension: [EXT.lp, EXT.t2b] }).T, 'T2b');
  assert.equal(d({ tumourExtension: [EXT.serosa] }).T, 'T3');
  assert.equal(d({ tumourExtension: [EXT.t2a, EXT.serosa] }).T, 'T3');
});

test('liver and adjacent-organ invasion: one organ T3, two or more T4, portal vein / hepatic artery T4', () => {
  assert.equal(d({ tumourExtension: [EXT.liver] }).T, 'T3');
  assert.equal(d({ tumourExtension: [EXT.stomach] }).T, 'T3');
  assert.equal(d({ tumourExtension: [EXT.other] }).T, 'T3');
  assert.equal(d({ tumourExtension: [EXT.liver, EXT.duodenum] }).T, 'T4');
  assert.equal(d({ tumourExtension: [EXT.stomach, EXT.pancreas] }).T, 'T4');
  assert.equal(d({ tumourExtension: [EXT.portal] }).T, 'T4');
  assert.equal(d({ tumourExtension: [EXT.artery] }).T, 'T4');
  assert.equal(d({ tumourExtension: [EXT.t2b, EXT.liver] }).T, 'T3');
});

test('pN bins 1-3 / 4+ and NX precedences', () => {
  const n = (x, inv) => d({ nodesExamined: String(x), nodesInvolved: String(inv) }).N;
  assert.equal(n(3, 0), 'N0');
  assert.equal(n(3, 1), 'N1');
  assert.equal(n(3, 3), 'N1');
  assert.equal(n(6, 4), 'N2');
  assert.equal(d({ nodesExamined: '0', nodesInvolved: '' }).N, 'NX');
  assert.equal(d({ nodesExamined: '3', nodesInvolved: '' }).N, 'NX');
});

test('distant metastasis: a separate hepatic focus is M1 (direct invasion is T3)', () => {
  assert.equal(d({ distantMets: ['Liver (specify)'] }).M, 'M1');
  assert.equal(d({ distantMets: ['Non-regional lymph node(s) (specify)'] }).M, 'M1');
  assert.equal(d({ distantMets: ['Other (specify)'] }).M, 'M1');
  assert.equal(d({ distantMets: ['Not identified'] }).M, 'M-');
});

test('stage-group table boundaries', () => {
  const g = (T, N) => {
    const mapT = { T1a: [EXT.lp], T1b: [EXT.ml], T2a: [EXT.t2a], T2b: [EXT.t2b], T3: [EXT.serosa], T4: [EXT.portal] };
    return d({ tumourExtension: mapT[T], nodesExamined: '4', nodesInvolved: { N0: '0', N1: '2', N2: '4' }[N] }).stage;
  };
  assert.equal(g('T1a', 'N0'), 'I');
  assert.equal(g('T1b', 'N0'), 'I');
  assert.equal(g('T2a', 'N0'), 'IIA');
  assert.equal(g('T2b', 'N0'), 'IIB');
  assert.equal(g('T3', 'N0'), 'IIIA');
  assert.equal(g('T1a', 'N1'), 'IIIB');
  assert.equal(g('T2a', 'N1'), 'IIIB');
  assert.equal(g('T3', 'N1'), 'IIIB');
  assert.equal(g('T4', 'N0'), 'IVA');
  assert.equal(g('T4', 'N1'), 'IVA');
  assert.equal(g('T2b', 'N2'), 'IVB');
  assert.equal(g('T4', 'N2'), 'IVB');
  assert.equal(d({ distantMets: ['Other (specify)'] }).stage, 'IVB');
});

test('y descriptor from a scored treatment effect', () => {
  const r = d({ treatmentEffect: 'Present, with residual cancer showing evident tumour regression, but more than single cells or rare small groups of cancer cells (partial response, score 2)', tumourExtension: [EXT.t2b] });
  assert.equal(r.prefix, 'yp');
  assert.equal(r.tnm, 'ypT2b ypN0');
});
