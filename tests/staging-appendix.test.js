// src/staging/appendix.js — AJCC 8th appendix pTNM boundary tests: the LAMN pTis rule,
// the acellular-mucin layer rules, the N1a/1b/1c + N2a/2b bins, the colon-shaped stage III
// table and the stage IV mucinous grade split (M1a IVA at any grade; M1b IVA at G1 / GX,
// IVB at G2-3; M1c IVC).
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM, stageLine } from '../src/staging/index.js';

const LAMN = 'Low-grade appendiceal mucinous neoplasm';
const EXT = {
  lamm: 'Tumour invades lamina propria or muscularis mucosa',
  mucinSm: 'Acellular mucin invades submucosa',
  sm: 'Tumour invades submucosa',
  mucinMp: 'Acellular mucin invades muscularis propria',
  mp: 'Tumour invades muscularis propria',
  mucinSs: 'Acellular mucin invades subserosa or mesoappendix but does not extend to the serosal surface',
  ss: 'Tumour invades through the muscularis propria into the subserosa or mesoappendix but does not extend to the serosal surface',
  mucinSerosa: 'Acellular mucin invades the visceral peritoneum (serosa)',
  serosa: 'Tumour invades the visceral peritoneum (serosa)',
  adjacent: 'Tumour directly invades adjacent organs or structures (specify)',
  tx: 'Cannot be determined',
  t0: 'No evidence of primary tumour'
};

const base = {
  histType: 'Adenocarcinoma',
  grade: 'G2, moderately differentiated',
  tumourExtension: [EXT.sm],
  nodesExamined: '12', nodesInvolved: '0',
  tumourDeposits: 'Not identified',
  distantMets: ['Not identified']
};

const d = (vals) => deriveTNM({ ...base, ...vals }, 'appendix');

test('extension check-list maps to pT categories; the deepest box governs', () => {
  assert.equal(d({ tumourExtension: [EXT.t0] }).T, 'T0');
  assert.equal(d({ tumourExtension: [EXT.lamm] }).T, 'Tis');
  assert.equal(d({ tumourExtension: [EXT.mucinSm] }).T, 'T1');
  assert.equal(d({ tumourExtension: [EXT.sm] }).T, 'T1');
  assert.equal(d({ tumourExtension: [EXT.mucinMp] }).T, 'T2');
  assert.equal(d({ tumourExtension: [EXT.mp] }).T, 'T2');
  assert.equal(d({ tumourExtension: [EXT.mucinSs] }).T, 'T3');
  assert.equal(d({ tumourExtension: [EXT.ss] }).T, 'T3');
  assert.equal(d({ tumourExtension: [EXT.mucinSerosa] }).T, 'T4a');
  assert.equal(d({ tumourExtension: [EXT.serosa] }).T, 'T4a');
  assert.equal(d({ tumourExtension: [EXT.adjacent] }).T, 'T4b');
  assert.equal(d({ tumourExtension: [EXT.sm, EXT.ss] }).T, 'T3');
  assert.equal(d({ tumourExtension: [EXT.ss, EXT.serosa] }).T, 'T4a');
});

test('LAMN: T1 / T2 are not applicable — wall-confined disease stays pTis(LAMN)', () => {
  assert.equal(d({ histType: LAMN, tumourExtension: [EXT.sm] }).T, 'Tis(LAMN)');
  assert.equal(d({ histType: LAMN, tumourExtension: [EXT.mp, EXT.mucinMp] }).T, 'Tis(LAMN)');
  // Acellular mucin reaching the subserosa is pT3 for a LAMN too, and on the serosa pT4a.
  assert.equal(d({ histType: LAMN, tumourExtension: [EXT.mucinSs] }).T, 'T3');
  assert.equal(d({ histType: LAMN, tumourExtension: [EXT.mucinSerosa] }).T, 'T4a');
  assert.equal(d({ histType: LAMN, tumourExtension: [EXT.mucinSs] }).stage, 'IIA');
  assert.equal(d({ histType: LAMN, tumourExtension: [EXT.sm] }).stage, '0');
});

test('pN bins: N1a / N1b / N2a / N2b from the involved count; deposits without nodes are N1c', () => {
  const n = (inv, extra = {}) => d({ nodesExamined: '12', nodesInvolved: String(inv), ...extra }).N;
  assert.equal(n(0), 'N0');
  assert.equal(n(1), 'N1a');
  assert.equal(n(2), 'N1b');
  assert.equal(n(3), 'N1b');
  assert.equal(n(4), 'N2a');
  assert.equal(n(6), 'N2a');
  assert.equal(n(7), 'N2b');
  assert.equal(d({ nodesExamined: '0', nodesInvolved: '' }).N, 'NX');
  assert.equal(d({ nodesExamined: '12', nodesInvolved: '' }).N, 'NX');
  const n1c = d({ nodesExamined: '12', nodesInvolved: '0', tumourDeposits: 'Present, specify number', tumourDepositsN: '2' });
  assert.equal(n1c.N, 'N1c');
  assert.match(n1c.notes.join(' '), /pN1c/);
  // Positive nodes with deposits: the count governs; deposits are flagged, not added.
  const both = d({ nodesInvolved: '1', tumourDeposits: 'Present, specify number', tumourDepositsN: '2' });
  assert.equal(both.N, 'N1a');
  assert.match(both.notes.join(' '), /deposits are present with positive nodes/);
});

test('pM split: acellular mucin M1a, cellular peritoneal M1b, extraperitoneal M1c', () => {
  assert.equal(d({ distantMets: ['Intraperitoneal acellular mucin without identifiable tumour cells in the disseminated peritoneal mucinous deposits (specify)'] }).M, 'M1a');
  assert.equal(d({ distantMets: ['Intraperitoneal metastasis only (including peritoneal mucinous deposits containing tumour cells) (specify)'] }).M, 'M1b');
  assert.equal(d({ distantMets: ['Liver (specify)'] }).M, 'M1c');
  assert.equal(d({ distantMets: ['Non-regional lymph node(s) (specify)'] }).M, 'M1c');
  // The higher category governs when several boxes are ticked (M1c > M1b > M1a).
  assert.equal(d({ distantMets: ['Intraperitoneal acellular mucin without identifiable tumour cells in the disseminated peritoneal mucinous deposits (specify)', 'Liver (specify)'] }).M, 'M1c');
  assert.equal(d({ distantMets: ['Intraperitoneal acellular mucin without identifiable tumour cells in the disseminated peritoneal mucinous deposits (specify)', 'Intraperitoneal metastasis only (including peritoneal mucinous deposits containing tumour cells) (specify)'] }).M, 'M1b');
});

test('colon-shaped stage table boundaries', () => {
  const g = (T, N) => {
    const vals = { tumourExtension: { T1: [EXT.sm], T2: [EXT.mp], T3: [EXT.ss], 'T4a': [EXT.serosa], 'T4b': [EXT.adjacent] }[T], nodesExamined: '12', nodesInvolved: { N1a: '1', N1b: '3', N2a: '5', N2b: '8', N0: '0' }[N] ?? '0' };
    if (N === 'N1c') { vals.tumourDeposits = 'Present, specify number'; vals.tumourDepositsN = '1'; }
    return d(vals).stage;
  };
  assert.equal(g('T1', 'N0'), 'I');
  assert.equal(g('T2', 'N0'), 'I');
  assert.equal(g('T3', 'N0'), 'IIA');
  assert.equal(g('T4a', 'N0'), 'IIB');
  assert.equal(g('T4b', 'N0'), 'IIC');
  assert.equal(g('T1', 'N1a'), 'IIIA');
  assert.equal(g('T2', 'N1b'), 'IIIA');
  assert.equal(g('T1', 'N1c'), 'IIIA');
  assert.equal(g('T1', 'N2a'), 'IIIA');
  assert.equal(g('T2', 'N2a'), 'IIIB');
  assert.equal(g('T4a', 'N1c'), 'IIIB');
  assert.equal(g('T1', 'N2b'), 'IIIB');
  assert.equal(g('T4a', 'N2a'), 'IIIC');
  assert.equal(g('T3', 'N2b'), 'IIIC');
  assert.equal(g('T4b', 'N1a'), 'IIIC');
  assert.equal(g('T4b', 'N2b'), 'IIIC');
});

test('stage IV mucinous grade split', () => {
  const mucin = 'Intraperitoneal acellular mucin without identifiable tumour cells in the disseminated peritoneal mucinous deposits (specify)';
  const cell = 'Intraperitoneal metastasis only (including peritoneal mucinous deposits containing tumour cells) (specify)';
  assert.equal(d({ distantMets: [mucin], grade: 'G3, poorly differentiated / undifferentiated' }).stage, 'IVA');
  assert.equal(d({ distantMets: [cell], grade: 'G1, well differentiated' }).stage, 'IVA');
  assert.equal(d({ distantMets: [cell], grade: 'GX, cannot be assessed' }).stage, 'IVA');
  assert.equal(d({ distantMets: [cell], grade: 'G2, moderately differentiated' }).stage, 'IVB');
  assert.equal(d({ distantMets: [cell], grade: 'G3, poorly differentiated / undifferentiated' }).stage, 'IVB');
  assert.equal(d({ distantMets: ['Liver (specify)'], grade: 'G1, well differentiated' }).stage, 'IVC');
  // Goblet cell adenocarcinoma carries its three-tier Tang / WHO grade into the split.
  assert.equal(d({ histType: 'Goblet cell adenocarcinoma', grade: 'Not applicable', gobletGrade: 'Tang / WHO group 3 (high grade)', distantMets: [cell] }).stage, 'IVB');
});

test('pTis(LAMN) prints and the stage group line applies', () => {
  const r = d({ histType: LAMN, tumourExtension: [EXT.mucinMp] });
  assert.equal(r.tnm, 'pTis(LAMN) pN0');
  assert.equal(r.stage, '0');
  assert.match(stageLine(r), /Stage group \(if cM0\): 0/);
});
