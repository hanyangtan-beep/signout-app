// src/staging/gastric.js — AJCC 8th gastric carcinoma. Boundary and table tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM } from '../src/staging/index.js';
import { T, N, M, ecura, tFromExtension } from '../src/staging/gastric.js';

const EXT = {
  t0: 'No evidence of primary tumour',
  tis: 'Carcinoma in situ: intraepithelial tumour without invasion of the lamina propria (high-grade dysplasia)',
  t1lp: 'Tumour invades the lamina propria',
  t1mm: 'Tumour invades the muscularis mucosae',
  t1b: 'Tumour invades the submucosa',
  t2: 'Tumour invades the muscularis propria',
  t3: 'Tumour penetrates the subserosal connective tissue without invasion of the visceral peritoneum or adjacent structures',
  t4a: 'Tumour invades the serosa (visceral peritoneum)',
  t4b: 'Tumour directly invades adjacent structures (specify)',
  tx: 'Cannot be assessed'
};
const v = (extension, extras = {}) => ({ tumourExtension: extension, nodesExamined: '', nodesInvolved: '', distantMets: ['Not applicable'], ...extras });
const d = (values) => deriveTNM(values, 'gastric');

test('extension option maps to the pT category, T3 before the T4b adjacency phrase', () => {
  assert.equal(tFromExtension(EXT.t0), 'T0');
  assert.equal(tFromExtension(EXT.tis), 'Tis');
  assert.equal(tFromExtension(EXT.t1lp), 'T1a');
  assert.equal(tFromExtension(EXT.t1mm), 'T1a');
  assert.equal(tFromExtension(EXT.t1b), 'T1b');
  assert.equal(tFromExtension(EXT.t2), 'T2');
  assert.equal(tFromExtension(EXT.t3), 'T3');
  assert.equal(tFromExtension(EXT.t4a), 'T4a');
  assert.equal(tFromExtension(EXT.t4b), 'T4b');
  assert.equal(tFromExtension(EXT.tx), 'TX');
  assert.equal(tFromExtension(''), null);
});

test('pN from the involved node count against the 1-2 / 3-6 / 7-15 / 16+ boundaries', () => {
  const n = (involved, examined = 24) => N(v(EXT.t4a, { nodesExamined: String(examined), nodesInvolved: String(involved) })).cat;
  assert.equal(n(0), 'N0');
  assert.equal(n(1), 'N1');
  assert.equal(n(2), 'N1');
  assert.equal(n(3), 'N2');
  assert.equal(n(6), 'N2');
  assert.equal(n(7), 'N3a');
  assert.equal(n(15), 'N3a');
  assert.equal(n(16), 'N3b');
  assert.equal(N(v(EXT.t4a)).cat, 'NX');
  assert.equal(N(v(EXT.t4a, { nodesExamined: '0' })).cat, 'NX');
  assert.equal(N(v(EXT.t4a, { nodesExamined: '24' })).cat, 'NX');
});

test('M1 only from a metastasis option; descriptor y from the treatment effect picklist', () => {
  assert.equal(M(v(EXT.t1b, { distantMets: ['Not applicable'] })).cat, 'M-');
  assert.equal(M(v(EXT.t1b, { distantMets: ['Not identified'] })).cat, 'M-');
  assert.equal(M(v(EXT.t1b, { distantMets: ['Liver'] })).cat, 'M1');
  assert.equal(M(v(EXT.t1b, { distantMets: ['Not identified', 'Non-regional lymph node(s)'] })).cat, 'M1');
  let r = d(v(EXT.t1b, { nodesExamined: '20', nodesInvolved: '0', treatmentEffect: 'Present, with no viable cancer cells (complete response, score 0)' }));
  assert.equal(r.prefix, 'yp');
  assert.ok(r.tnm.startsWith('yp'));
});

test('stage groups: the full AJCC 8th pathological table', () => {
  const g = (ext, involved) => {
    const r = d(v(ext, { nodesExamined: '24', nodesInvolved: String(involved) }));
    return r.stage;
  };
  assert.equal(g(EXT.tis, 0), '0');
  assert.equal(g(EXT.t1b, 0), 'IA');
  assert.equal(g(EXT.t1b, 1), 'IB');
  assert.equal(g(EXT.t1b, 5), 'IIA');
  assert.equal(g(EXT.t1b, 7), 'IIB');   // N3a split matters here
  assert.equal(g(EXT.t1b, 16), 'IIIB'); // N3b
  assert.equal(g(EXT.t2, 0), 'IB');
  assert.equal(g(EXT.t2, 2), 'IIA');
  assert.equal(g(EXT.t2, 4), 'IIB');
  assert.equal(g(EXT.t2, 9), 'IIIA');  // N3a
  assert.equal(g(EXT.t2, 20), 'IIIB'); // N3b
  assert.equal(g(EXT.t3, 0), 'IIA');
  assert.equal(g(EXT.t3, 3), 'IIIA');
  assert.equal(g(EXT.t3, 8), 'IIIB');
  assert.equal(g(EXT.t3, 17), 'IIIC');
  assert.equal(g(EXT.t4a, 0), 'IIB');
  assert.equal(g(EXT.t4a, 2), 'IIIA');
  assert.equal(g(EXT.t4a, 5), 'IIIB');
  assert.equal(g(EXT.t4a, 7), 'IIIB');
  assert.equal(g(EXT.t4a, 18), 'IIIC');
  assert.equal(g(EXT.t4b, 0), 'IIIB');
  assert.equal(g(EXT.t4b, 1), 'IIIB');
  assert.equal(g(EXT.t4b, 4), 'IIIC');
  assert.equal(g(EXT.t4b, 7), 'IIIC');
  assert.equal(g(EXT.t4b, 16), 'IIIC');
});

test('stage: any M1 is IV; in situ with nodes left unassigned has no group; Tis + N0 is 0', () => {
  const r = d(v(EXT.t1b, { nodesExamined: '24', nodesInvolved: '1', distantMets: ['Liver'] }));
  assert.equal(r.stage, 'IV');
  assert.ok(r.tnm.includes('pM1'));
  const noN = d(v(EXT.tis));
  assert.equal(noN.T, 'Tis');
  assert.equal(noN.N, 'NX');
  assert.equal(noN.stage, null);
  assert.ok(d(v(EXT.tx)).tnm.includes('pTX'));
});

test('unrecorded extension is pTX with a note', () => {
  const r = d(v('', { nodesExamined: '20', nodesInvolved: '0' }));
  assert.equal(r.T, 'TX');
  assert.ok(r.notes.some((n) => /extension not recorded/.test(n)));
});

test('override: typed pTNM wins and is echoed', () => {
  const r = d(v(EXT.t1b, { nodesExamined: '20', nodesInvolved: '0', tnmOverride: 'pT3 pN2', tnmOverrideReason: 'discarded omental deposit' }));
  assert.equal(r.T, 'T3');
  assert.equal(r.N, 'N2');
  assert.ok(r.overridden);
  assert.ok(/discarded omental deposit/.test(r.notes.join(' ')));
});

test('eCura scoring: points add up with lymphatic invasion worth 3', () => {
  assert.deepEqual(ecura({ ecuraLy: 'Not identified', ecuraSize: 'Not identified', ecuraVm: 'Not identified', ecuraV: 'Not identified', ecuraSm: 'Not identified' }),
    { score: 0, band: 'Low risk (0-2 points)', undetermined: [] });
  assert.equal(ecura({ ecuraLy: 'Present' }).score, 3);
  assert.equal(ecura({ ecuraLy: 'Present' }).band, 'Intermediate risk (3-4 points)');
  assert.equal(ecura({ ecuraLy: 'Present', ecuraSize: 'Present', ecuraVm: 'Present', ecuraV: 'Cannot be determined', ecuraSm: 'Present' }).score, 6);
  assert.equal(ecura({ ecuraLy: 'Present', ecuraSize: 'Present', ecuraVm: 'Present', ecuraV: 'Cannot be determined', ecuraSm: 'Present' }).band, 'High risk (5-7 points)');
  assert.deepEqual(ecura({ ecuraV: 'Cannot be determined' }).undetermined, ['Venous invasion (V)']);
});
