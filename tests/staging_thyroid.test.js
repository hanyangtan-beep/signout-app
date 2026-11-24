// Thyroid carcinoma staging module (AJCC 8th edition, Chapters 73 & 74; CAP Thyroid 4.4.0.0).
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM, parseOverride } from '../src/staging/index.js';
import * as S from '../src/staging/thyroid.js';

const BASE = {
  histType: 'Papillary carcinoma, classic subtype',
  tumourSizeMm: '18',
  ete: S.ETE.none,
  centralExamined: '6',
  centralInvolved: '0',
  lateralExamined: '',
  lateralInvolved: '',
  otherNodesExamined: '',
  otherNodesInvolved: '',
  distantMets: [S.METS.na],
  patientAgeGroup: S.AGE.ge55
};

const th = (patch = {}) => deriveTNM({ ...BASE, ...patch }, 'thyroid');
const tCat = (patch) => S.T({ ...BASE, ...patch }).cat;
const tNote = (patch) => S.T({ ...BASE, ...patch }).note || '';
const nCat = (patch) => S.N({ ...BASE, ...patch }).cat;

test('thyroid module: registered under its id, AJCC 8th edition', () => {
  assert.equal(S.id, 'thyroid');
  assert.equal(S.edition, 'AJCC 8th edition');
  const r = th();
  assert.equal(r.edition, 'AJCC 8th edition');
  assert.equal(r.tnm, 'pT1b pN0a');
  assert.equal(r.stage, 'I');
});

test('thyroid T: 10, 20 and 40 mm boundaries and gross vs microscopic ETE', () => {
  assert.equal(tCat({ tumourSizeMm: '10' }), 'T1a');
  assert.equal(tCat({ tumourSizeMm: '10.1' }), 'T1b');
  assert.equal(tCat({ tumourSizeMm: '20' }), 'T1b');
  assert.equal(tCat({ tumourSizeMm: '20.1' }), 'T2');
  assert.equal(tCat({ tumourSizeMm: '40' }), 'T2');
  assert.equal(tCat({ tumourSizeMm: '40.1' }), 'T3a');
  assert.equal(tCat({ tumourSizeMm: '' }), 'TX');
  // Microscopic ETE does NOT upstage to T3b in AJCC 8th edition.
  assert.equal(tCat({ tumourSizeMm: '15', ete: S.ETE.micro }), 'T1b');
  assert.match(tNote({ tumourSizeMm: '15', ete: S.ETE.micro }), /Microscopic extrathyroidal extension does not upstage to pT3b/);
  // Gross ETE overrides size.
  assert.equal(tCat({ tumourSizeMm: '8', ete: S.ETE.strap }), 'T3b');
  assert.equal(tCat({ tumourSizeMm: '8', ete: S.ETE.t4a }), 'T4a');
  assert.equal(tCat({ tumourSizeMm: '8', ete: S.ETE.t4b }), 'T4b');
  assert.equal(tCat({ tumourSizeMm: '15', ete: S.ETE.cannot }), 'TX');
  assert.match(tNote({ tumourSizeMm: '15', sizeAtLeast: true }), /pT1b is the lowest category/);
});

test('thyroid N: pN0a, central pN1a, lateral pN1b, unspecified pN1, and omitted when none examined', () => {
  assert.equal(nCat({}), 'N0a');
  assert.equal(nCat({ centralInvolved: '2' }), 'N1a');
  assert.equal(nCat({ centralInvolved: '2', lateralExamined: '10', lateralInvolved: '1' }), 'N1b');
  assert.equal(nCat({ centralExamined: '', lateralExamined: '12', lateralInvolved: '3' }), 'N1b');
  assert.equal(nCat({ centralExamined: '', otherNodesExamined: '2', otherNodesInvolved: '1' }), 'N1');
  const none = th({ centralExamined: '', centralInvolved: '' });
  assert.equal(none.N, 'NX');
  assert.equal(none.tnm, 'pT1b');
});

test('thyroid M and descriptors: m, r, y and override', () => {
  assert.equal(th({ distantMets: [S.METS.lung] }).tnm, 'pT1b pN0a pM1');
  assert.equal(th({ multiplePrimaries: true }).tnm, 'pT1b(m) pN0a');
  assert.equal(th({ postTherapy: true, recurrent: true }).tnm, 'rypT1b ypN0a');
  assert.deepEqual((({ T, N }) => ({ T, N }))(parseOverride('pT3b pN0a')), { T: 'T3b', N: 'N0a' });
  const ov = th({ tnmOverride: 'pT4a pN1b' });
  assert.equal(ov.tnm, 'pT4a pN1b');
  assert.equal(ov.stage, 'III');
});

test('differentiated thyroid carcinoma stage groups: age < 55 vs >= 55 and unknown age', () => {
  // Age < 55: Stage I for any T/N if M0, Stage II if M1.
  assert.equal(th({ patientAgeGroup: S.AGE.under55, ete: S.ETE.t4b, lateralExamined: '10', lateralInvolved: '5' }).stage, 'I');
  assert.equal(th({ patientAgeGroup: S.AGE.under55, distantMets: [S.METS.lung] }).stage, 'II');
  // Age >= 55:
  assert.equal(th({ tumourSizeMm: '15' }).stage, 'I');
  assert.equal(th({ tumourSizeMm: '35' }).stage, 'I');
  assert.equal(th({ tumourSizeMm: '15', centralInvolved: '1' }).stage, 'II');
  assert.equal(th({ tumourSizeMm: '45' }).stage, 'II');
  assert.equal(th({ ete: S.ETE.strap }).stage, 'II');
  assert.equal(th({ ete: S.ETE.t4a }).stage, 'III');
  assert.equal(th({ ete: S.ETE.t4b }).stage, 'IVA');
  assert.equal(th({ distantMets: [S.METS.bone] }).stage, 'IVB');
  // Unknown age: shows both when they differ, single when identical.
  assert.equal(th({ patientAgeGroup: S.AGE.unknown, tumourSizeMm: '15' }).stage, 'I');
  assert.equal(th({ patientAgeGroup: S.AGE.unknown, ete: S.ETE.t4a }).stage, 'I (age < 55) / III (age >= 55)');
});

test('anaplastic thyroid carcinoma stage groups: IVA, IVB, IVC', () => {
  const atc = { histType: 'Anaplastic thyroid carcinoma, NOS', patientAgeGroup: S.AGE.unknown };
  assert.equal(th({ ...atc, tumourSizeMm: '45' }).stage, 'IVA');
  assert.equal(th({ ...atc, tumourSizeMm: '25', centralInvolved: '1' }).stage, 'IVB');
  assert.equal(th({ ...atc, ete: S.ETE.strap }).stage, 'IVB');
  assert.equal(th({ ...atc, ete: S.ETE.t4a }).stage, 'IVB');
  assert.equal(th({ ...atc, distantMets: [S.METS.lung] }).stage, 'IVC');
});

test('medullary thyroid carcinoma stage groups: I, II, III, IVA, IVB, IVC', () => {
  const mtc = { histType: 'Medullary thyroid carcinoma', patientAgeGroup: S.AGE.unknown };
  assert.equal(th({ ...mtc, tumourSizeMm: '15' }).stage, 'I');
  assert.equal(th({ ...mtc, tumourSizeMm: '30' }).stage, 'II');
  assert.equal(th({ ...mtc, ete: S.ETE.strap }).stage, 'II');
  assert.equal(th({ ...mtc, tumourSizeMm: '15', centralInvolved: '1' }).stage, 'III');
  assert.equal(th({ ...mtc, tumourSizeMm: '15', lateralExamined: '10', lateralInvolved: '1' }).stage, 'IVA');
  assert.equal(th({ ...mtc, ete: S.ETE.t4a }).stage, 'IVA');
  assert.equal(th({ ...mtc, ete: S.ETE.t4b }).stage, 'IVB');
  assert.equal(th({ ...mtc, distantMets: [S.METS.bone] }).stage, 'IVC');
});

test('low-risk follicular cell-derived neoplasms are not staged', () => {
  const niftp = th({ histType: 'Non-invasive follicular thyroid neoplasm with papillary-like nuclear features (NIFTP)' });
  assert.equal(niftp.T, 'TX');
  assert.equal(niftp.stage, '');
  assert.deepEqual(S.referenceLines({ ...BASE, histType: 'Non-invasive follicular thyroid neoplasm with papillary-like nuclear features (NIFTP)' }, niftp), []);
});
