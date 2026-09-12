// Boundary tests for src/staging/ovary.js (AJCC 8th / FIGO 2014). Field ids as in schemas/ovary_ft_peritoneum.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM, parseOverride } from '../src/staging/index.js';
import * as O from '../src/staging/ovary.js';

const base = { tumourSite: 'Right ovary', histType: 'High-grade serous carcinoma', integrityRO: 'Capsule intact', integrityRT: 'Serosa intact', ovarianSurface: 'Not identified', tubalSurface: 'Not identified', peritonealFluid: 'Malignant cells not identified', otherInvolvement: ['Not identified'], extrapelvicFocus: 'Not applicable', distantMets: ['Not identified'], pleuralFluid: 'Not submitted / unknown' };
const st = (patch) => deriveTNM({ ...base, ...patch }, 'ovary');

test('stage I subdivisions: IA, IB, IC1 spill, IC2 rupture or surface, IC3 fluid; precedence c3 > c2 > c1', () => {
  assert.deepEqual([st({}).T, st({}).stage], ['T1a', 'IA']);
  assert.deepEqual([st({ tumourSite: 'Bilateral ovaries', integrityLO: 'Capsule intact' }).T, st({ tumourSite: 'Bilateral ovaries' }).stage], ['T1b', 'IB']);
  assert.equal(st({ integrityRO: 'Capsule ruptured, intraoperative (surgical spill)' }).stage, 'IC1');
  assert.equal(st({ integrityRO: 'Capsule ruptured, preoperative or unknown timing' }).stage, 'IC2');
  assert.equal(st({ ovarianSurface: 'Present, right' }).stage, 'IC2');
  assert.equal(st({ integrityRT: 'Serosa ruptured, intraoperative (surgical spill)', tumourSite: 'Right fallopian tube' }).stage, 'IC1');
  assert.equal(st({ peritonealFluid: 'Malignant cells present' }).stage, 'IC3');
  assert.equal(st({ peritonealFluid: 'Malignant cells present', integrityRO: 'Capsule ruptured, intraoperative (surgical spill)', ovarianSurface: 'Present, right' }).T, 'T1c3');
  assert.equal(st({ integrityRO: 'Capsule ruptured, intraoperative (surgical spill)', ovarianSurface: 'Present, right' }).T, 'T1c2');
  assert.equal(st({ peritonealFluid: 'Suspicious (explain)' }).stage, 'IA');
});

test('stage II: IIA uterus / tubes / ovaries, IIB other pelvic; positive washings do not upgrade', () => {
  assert.deepEqual([st({ otherInvolvement: ['Left ovary'] }).T, st({ otherInvolvement: ['Uterine serosa'] }).stage], ['T2a', 'IIA']);
  assert.equal(st({ otherInvolvement: ['Pelvic peritoneum'] }).stage, 'IIB');
  assert.equal(st({ otherInvolvement: ['Rectal wall', 'Left fallopian tube'] }).stage, 'IIB');
  assert.equal(st({ otherInvolvement: ['Pelvic peritoneum'], peritonealFluid: 'Malignant cells present' }).stage, 'IIB');
});

test('stage III: nodes-only IIIA1(i)/(ii) at the 10 mm boundary, IIIA2, IIIB at 20 mm, IIIC incl. liver capsule', () => {
  assert.deepEqual([st({ nodesExamined: '12', nodesMicro: '1', nodeDepositMm: '10' }).N, st({ nodesExamined: '12', nodesMicro: '1', nodeDepositMm: '10' }).stage], ['N1a', 'IIIA1(i)']);
  assert.deepEqual([st({ nodesExamined: '12', nodesMacro: '1', nodeDepositMm: '10.5' }).N, st({ nodesExamined: '12', nodesMacro: '1', nodeDepositMm: '10.5' }).stage], ['N1b', 'IIIA1(ii)']);
  assert.equal(st({ nodesExamined: '12', nodesMacro: '2' }).N, 'N1b');
  assert.equal(st({ nodesExamined: '12', nodesItc: '1' }).N, 'N0(i+)');
  assert.equal(st({ nodesExamined: '12', nodesItc: '1' }).stage, 'IA');
  assert.equal(st({ nodesExamined: '0' }).N, 'NX');
  assert.equal(st({ nodesExamined: '12', nodesMicro: '1', otherInvolvement: ['Omentum'], extrapelvicFocus: 'Microscopic' }).stage, 'IIIA2');
  assert.equal(st({ otherInvolvement: ['Omentum'], extrapelvicFocus: 'Microscopic' }).T, 'T3a');
  assert.deepEqual([st({ otherInvolvement: ['Omentum'], extrapelvicFocusMm: '20' }).T, st({ otherInvolvement: ['Omentum'], extrapelvicFocusMm: '20' }).stage], ['T3b', 'IIIB']);
  assert.deepEqual([st({ otherInvolvement: ['Omentum'], extrapelvicFocusMm: '21' }).T, st({ otherInvolvement: ['Omentum'], extrapelvicFocusMm: '21' }).stage], ['T3c', 'IIIC']);
  assert.equal(st({ otherInvolvement: ['Omentum'], extrapelvicFocus: 'Macroscopic, 2 cm or less' }).stage, 'IIIB');
  assert.equal(st({ otherInvolvement: ['Liver capsule'], extrapelvicFocus: 'Microscopic' }).stage, 'IIIC');
  assert.equal(st({ otherInvolvement: ['Omentum'], extrapelvicFocus: 'Macroscopic, more than 2 cm', nodesExamined: '5', nodesMicro: '1' }).tnm, 'pT3c pN1a');
  const r = st({ otherInvolvement: ['Omentum'] });
  assert.equal(r.T, 'T3'); assert.equal(r.stage, 'III'); assert.ok(r.notes.some((n) => /pT3a\/b\/c cannot be assigned/.test(n)));
});

test('stage IV: pleural cytology IVA, parenchymal / extra-abdominal / transmural bowel IVB', () => {
  assert.deepEqual([st({ pleuralFluid: 'Malignant (positive for malignancy)' }).M, st({ pleuralFluid: 'Malignant (positive for malignancy)' }).stage], ['M1a', 'IVA']);
  assert.equal(st({ distantMets: ['Liver parenchyma'] }).stage, 'IVB');
  assert.equal(st({ distantMets: ['Inguinal lymph node(s)'] }).stage, 'IVB');
  assert.equal(st({ otherInvolvement: ['Bowel mucosa'] }).stage, 'IVB');
  assert.equal(st({ distantMets: ['Liver parenchyma'], pleuralFluid: 'Malignant (positive for malignancy)' }).M, 'M1b');
});

test('primary peritoneal carcinoma is never pT1; y descriptor after neoadjuvant chemotherapy', () => {
  const p = st({ tumourSite: 'Primary peritoneum' });
  assert.equal(p.T, 'TX'); assert.equal(p.stage, null); assert.ok(p.notes.some((n) => /cannot be pT1/.test(n)));
  assert.equal(st({ tumourSite: 'Primary peritoneum', otherInvolvement: ['Pelvic peritoneum'] }).stage, 'IIB');
  assert.equal(st({ tumourSite: 'Right ovary', primarySite: 'Peritoneum' }).T, 'TX');
  assert.equal(O.primarySite({ tumourSite: 'Left fallopian tube' }), 'tube');
  assert.equal(O.primarySite({ tumourSite: 'Right tubo-ovarian', primarySite: 'Ovary' }), 'ovary');
  const y = st({ neoadjuvant: true, otherInvolvement: ['Omentum'], extrapelvicFocusMm: '30', nodesExamined: '8', nodesMacro: '1' });
  assert.equal(y.tnm, 'ypT3c ypN1b'); assert.equal(y.stage, 'IIIC');
});

test('FIGO 2014 reference line and the extended override parser', () => {
  assert.deepEqual(O.referenceLines({ ...base, otherInvolvement: ['Omentum'], extrapelvicFocusMm: '30' }), ['FIGO 2014 (reference, not reported; FIGO Cancer Report 2025 reproduces the 2014 table): IIIC']);
  assert.deepEqual(O.referenceLines({ ...base, histType: 'Serous borderline tumour', otherInvolvement: ['Pelvic peritoneum'] }), ['FIGO 2014 (reference, not reported; FIGO Cancer Report 2025 reproduces the 2014 table): IIB']);
  assert.deepEqual(parseOverride('pT1c2 pN0(i+)'), { T: 'T1c2', N: 'N0(i+)', M: 'M-' });
  assert.deepEqual(parseOverride('ypT3a2 ypN1a pM1a'), { T: 'T3a2', N: 'N1a', M: 'M1a' });
  assert.deepEqual(parseOverride('pT2b N1b'), { T: 'T2b', N: 'N1b', M: 'M-' });
  assert.deepEqual(parseOverride('pT3 pN1a pM1a'), { T: 'T3', N: 'N1a', M: 'M1a' });
  assert.deepEqual(parseOverride('pT4a pN2b'), { T: 'T4a', N: 'N2b', M: 'M-' });
  const o = st({ tnmOverride: 'pT3a2 pN0(i+)', tnmOverrideReason: 'microscopic omental focus on review' });
  assert.equal(o.tnm, 'pT3a2 pN0(i+)'); assert.equal(o.stage, 'IIIA2');
});
