// GIST staging and risk rules (src/staging/gist.js) — every boundary of the AJCC 8th edition tables
// and the Miettinen and Lasota 2006 risk table.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM, stageLine } from '../src/staging/index.js';
import { tFromSize, T, N, M, stageGroup, mitoticClass, gradeFromMitoses, riskAssessment, descriptors } from '../src/staging/gist.js';

const base = { tumourSite: 'Stomach', tumourSize: '4', mitoticCount: '2', mitoticStatus: 'Counted', nodesExamined: '0', distantMetastasis: ['Not applicable'] };
const v = (o = {}) => ({ ...base, ...o });

test('pT follows size in cm with inclusive upper bounds', () => {
  assert.equal(tFromSize(0.5), 'T1');
  assert.equal(tFromSize(2), 'T1');
  assert.equal(tFromSize(2.1), 'T2');
  assert.equal(tFromSize(5), 'T2');
  assert.equal(tFromSize(5.1), 'T3');
  assert.equal(tFromSize(10), 'T3');
  assert.equal(tFromSize(10.1), 'T4');
  assert.equal(tFromSize(null), null);
  assert.equal(T(v({ tumourSize: '' })).cat, 'TX');
  assert.match(T(v({ tumourSize: '' })).note, /size not recorded/);
  assert.equal(T(v({ residualTumour: 'No residual tumour (complete response)' })).cat, 'T0');
});

test('pN: NX when no nodes submitted, N0 / N1 by involvement', () => {
  assert.equal(N(v()).cat, 'NX');
  assert.match(N(v()).note, /rare in GIST/);
  assert.equal(N(v({ nodesExamined: '3', nodesPositive: '' })).cat, 'NX');
  assert.equal(N(v({ nodesExamined: '3', nodesPositive: '0' })).cat, 'N0');
  assert.equal(N(v({ nodesExamined: '3', nodesPositive: '1' })).cat, 'N1');
});

test('pM from metastasis sites in the specimen', () => {
  assert.equal(M(v()).cat, 'M-');
  assert.equal(M(v({ distantMetastasis: ['Not identified'] })).cat, 'M-');
  assert.equal(M(v({ distantMetastasis: ['Liver'] })).cat, 'M1');
  assert.equal(M(v({ distantMetastasis: ['Peritoneum', 'Liver'] })).cat, 'M1');
});

test('mitotic class and grade: 5 per 5 mm2 is low, 6 is high, uncounted is GX', () => {
  assert.equal(mitoticClass(v({ mitoticCount: '5' })), 'low');
  assert.equal(mitoticClass(v({ mitoticCount: '6' })), 'high');
  assert.equal(mitoticClass(v({ mitoticCount: '0' })), 'low');
  assert.equal(mitoticClass(v({ mitoticCount: '' })), null);
  assert.equal(mitoticClass(v({ mitoticCount: '8', mitoticStatus: 'Cannot be determined' })), null);
  assert.equal(gradeFromMitoses(v({ mitoticCount: '5' })), 'G1: Low grade; mitotic rate 5 or fewer per 5 mm2');
  assert.equal(gradeFromMitoses(v({ mitoticCount: '6' })), 'G2: High grade; mitotic rate more than 5 per 5 mm2');
  assert.equal(gradeFromMitoses(v({ mitoticCount: '' })), 'GX: Cannot be assessed');
});

test('gastric / omental stage groups (AJCC 8th)', () => {
  const g = (T, mit, site = 'Stomach') => stageGroup(T, 'NX', 'M-', v({ mitoticCount: mit, tumourSite: site }));
  assert.equal(g('T1', '2'), 'IA'); assert.equal(g('T2', '5'), 'IA');
  assert.equal(g('T3', '3'), 'IB');
  assert.equal(g('T1', '9'), 'II'); assert.equal(g('T2', '6'), 'II'); assert.equal(g('T4', '1'), 'II');
  assert.equal(g('T3', '12'), 'IIIA');
  assert.equal(g('T4', '7'), 'IIIB');
  assert.equal(g('T2', '5', 'Omentum'), 'IA');
  assert.equal(stageGroup('T1', 'N1', 'M-', v()), 'IV');
  assert.equal(stageGroup('T1', 'N0', 'M1', v()), 'IV');
  assert.equal(stageGroup('T2', 'N0', 'M-', v({ mitoticCount: '' })), null);
  assert.equal(stageGroup('TX', 'N0', 'M-', v()), null);
});

test('small-intestinal and other non-gastric stage groups (AJCC 8th)', () => {
  const g = (T, mit, site = 'Jejunum') => stageGroup(T, 'N0', 'M-', v({ mitoticCount: mit, tumourSite: site }));
  assert.equal(g('T1', '0'), 'I'); assert.equal(g('T2', '5'), 'I');
  assert.equal(g('T3', '2'), 'II');
  assert.equal(g('T1', '6'), 'IIIA'); assert.equal(g('T4', '4'), 'IIIA');
  assert.equal(g('T2', '6'), 'IIIB'); assert.equal(g('T3', '8'), 'IIIB'); assert.equal(g('T4', '20'), 'IIIB');
  for (const site of ['Duodenum', 'Ileum', 'Oesophagus', 'Colon', 'Rectum', 'Mesentery', 'Peritoneum / retroperitoneum', 'Other']) assert.equal(g('T3', '2', site), 'II', site);
});

test('Miettinen and Lasota risk table: gastric column', () => {
  const r = (size, mit) => riskAssessment(v({ tumourSize: size, mitoticCount: mit })).category;
  assert.equal(r('2', '5'), 'None'); assert.equal(r('5', '5'), 'Very low risk'); assert.equal(r('10', '5'), 'Low risk'); assert.equal(r('10.5', '5'), 'Moderate risk');
  assert.equal(r('2', '6'), 'None'); assert.equal(r('5', '6'), 'Moderate risk'); assert.equal(r('10', '6'), 'High risk'); assert.equal(r('11', '6'), 'High risk');
  assert.equal(riskAssessment(v({ tumourSite: 'Omentum', tumourSize: '3', mitoticCount: '1' })).category, 'Very low risk');
});

test('Miettinen and Lasota risk table: duodenum, jejunum / ileum and rectum columns', () => {
  const r = (site, size, mit) => riskAssessment(v({ tumourSite: site, tumourSize: size, mitoticCount: mit }));
  assert.equal(r('Duodenum', '1', '1').category, 'None'); assert.equal(r('Duodenum', '3', '1').category, 'Low risk');
  assert.equal(r('Duodenum', '7', '1').category, 'Cannot be determined'); assert.match(r('Duodenum', '7', '1').note, /Insufficient data/);
  assert.equal(r('Duodenum', '12', '1').category, 'High risk'); assert.equal(r('Duodenum', '3', '9').category, 'High risk');
  assert.equal(r('Jejunum', '1', '1').category, 'None'); assert.equal(r('Ileum', '3', '1').category, 'Low risk'); assert.equal(r('Jejunum', '7', '1').category, 'Moderate risk'); assert.equal(r('Ileum', '12', '1').category, 'High risk');
  assert.equal(r('Jejunum', '1', '9').category, 'High risk'); assert.equal(r('Small intestine (not otherwise specified)', '7', '9').category, 'High risk');
  assert.equal(r('Rectum', '1', '1').category, 'None'); assert.equal(r('Rectum', '3', '1').category, 'Low risk'); assert.equal(r('Rectum', '7', '1').category, 'Cannot be determined'); assert.equal(r('Rectum', '12', '1').category, 'High risk'); assert.equal(r('Rectum', '1', '9').category, 'High risk');
});

test('risk: sites without their own column use the small-intestinal criteria with a note; metastatic disease is overtly malignant; manual pick wins', () => {
  const oes = riskAssessment(v({ tumourSite: 'Oesophagus', tumourSize: '7', mitoticCount: '1' }));
  assert.equal(oes.category, 'Moderate risk'); assert.match(oes.note, /small-intestinal .* criteria/);
  assert.equal(riskAssessment(v({ distantMetastasis: ['Liver'] })).category, 'Overtly malignant/metastatic');
  assert.equal(riskAssessment(v({ nodesExamined: '2', nodesPositive: '1' })).category, 'Overtly malignant/metastatic');
  assert.equal(riskAssessment(v({ mitoticCount: '' })).category, 'Cannot be determined');
  assert.equal(riskAssessment(v({ tumourSize: '' })).category, 'Cannot be determined');
  const manual = riskAssessment(v({ riskAssessment: 'High risk' }));
  assert.equal(manual.category, 'High risk'); assert.equal(manual.derived, false);
});

test('deriveTNM with the gist protocol: prefix, descriptors, stage line and override', () => {
  const st = deriveTNM(v(), 'gist');
  assert.equal(st.tnm, 'pT2 pNX'); assert.equal(st.stage, 'IA'); assert.equal(st.edition, 'AJCC 8th edition');
  assert.equal(stageLine(st), 'Stage group (if cM0): IA');
  assert.deepEqual(descriptors(v({ focality: 'Multifocal', recurrent: true, treatmentEffect: 'Present' })), ['m', 'r', 'y']);
  assert.equal(deriveTNM(v({ focality: 'Multifocal', treatmentEffect: 'Present' }), 'gist').tnm, 'ypT2(m) ypNX');
  const ov = deriveTNM(v({ tnmOverride: 'pT3 pN0', tnmOverrideReason: 'size after fixation' }), 'gist');
  assert.equal(ov.tnm, 'pT3 pN0'); assert.equal(ov.stage, 'IB'); assert.ok(ov.overridden);
  assert.equal(deriveTNM(v({ distantMetastasis: ['Liver'] }), 'gist').tnm, 'pT2 pNX pM1');
});
