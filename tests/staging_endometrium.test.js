// Boundary table for src/staging/endometrium.js: AJCC 8th pTNM, FIGO 2009 and FIGO 2023.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/staging/endometrium.js';
import { deriveTNM } from '../src/staging/index.js';

const BASE = {
  histType: E.ENDOMETRIOID, grade: E.GRADE_1, tumourSite: 'Endometrium', myoInvasion: E.MYO_LT_HALF,
  lvsi: 'Not identified', cervix: 'Not identified', serosa: 'Not identified', otherInvolvement: ['Not identified'],
  pelvicPeritoneum: 'Not submitted', pelvicExamined: '12', pelvicMacro: '0', pelvicMicro: '0', pelvicItc: '0',
  paExamined: '0', distantMets: ['Not identified'], promise: 'No specific molecular profile (NSMP)'
};
const v = (o) => ({ ...BASE, ...o });
const SEROUS = { histType: 'Serous carcinoma', grade: 'High-grade (non-endometrioid carcinoma)' };

test('histotype class', () => {
  assert.equal(E.histotypeClass(v({})), 'non-aggressive');
  assert.equal(E.histotypeClass(v({ grade: E.GRADE_2 })), 'non-aggressive');
  assert.equal(E.histotypeClass(v({ grade: E.GRADE_3 })), 'aggressive');
  assert.equal(E.histotypeClass(v({ grade: 'Cannot be assessed' })), 'unknown');
  for (const t of ['Serous carcinoma', 'Clear cell carcinoma', 'Carcinosarcoma (malignant mixed Mullerian tumor)', 'Dedifferentiated carcinoma', 'Mesonephric-like adenocarcinoma', 'Gastric (gastrointestinal)-type carcinoma', 'Small cell neuroendocrine carcinoma', 'Squamous cell carcinoma, NOS', 'Mixed cell carcinoma (specify types and percentages)']) {
    assert.equal(E.histotypeClass(v({ histType: t, grade: 'High-grade (non-endometrioid carcinoma)' })), 'aggressive', t);
  }
  assert.equal(E.aggressive('Serous carcinoma', ''), true);
});

// [name, overrides, expected T, N, M, AJCC/FIGO 2009 group, FIGO 2023]
const TABLE = [
  ['confined to endometrium', { myoInvasion: E.MYO_NONE }, 'T1a', 'N0', 'M-', 'IA', 'IA1'],
  ['confined to polyp (legacy: macro site, no micro pick)', { myoInvasion: E.MYO_NONE, tumourSite: 'Endometrial polyp' }, 'T1a', 'N0', 'M-', 'IA', 'IA1'],
  ['confined to polyp (micro pick)', { myoInvasion: E.MYO_NONE, noInvasionExtent: E.NOINV_POLYP }, 'T1a', 'N0', 'M-', 'IA', 'IA1'],
  ['polyp and underlying endometrium', { myoInvasion: E.MYO_NONE, tumourSite: 'Endometrial polyp', noInvasionExtent: E.NOINV_POLYP_AND_ENDOMETRIUM }, 'T1a', 'N0', 'M-', 'IA', 'IA1'],
  ['< 50% myoinvasion', {}, 'T1a', 'N0', 'M-', 'IA', 'IA2'],
  ['< 50% with focal LVSI stays IA2', { lvsi: E.LVSI_FOCAL }, 'T1a', 'N0', 'M-', 'IA', 'IA2'],
  ['>= 50% myoinvasion', { myoInvasion: E.MYO_GE_HALF }, 'T1b', 'N0', 'M-', 'IB', 'IB'],
  ['substantial LVSI, non-aggressive', { lvsi: E.LVSI_SUBSTANTIAL }, 'T1a', 'N0', 'M-', 'IA', 'IIB'],
  ['cervical stromal invasion, non-aggressive', { cervix: 'Cervical stromal invasion' }, 'T2', 'N0', 'M-', 'II', 'IIA'],
  ['cervical stroma plus substantial LVSI', { cervix: 'Cervical stromal invasion', lvsi: E.LVSI_SUBSTANTIAL }, 'T2', 'N0', 'M-', 'II', 'II'],
  ['endocervical glandular only stays I', { cervix: 'Endocervical glandular involvement only' }, 'T1a', 'N0', 'M-', 'IA', 'IA2'],
  ['aggressive, no myoinvasion', { ...SEROUS, myoInvasion: E.MYO_NONE }, 'T1a', 'N0', 'M-', 'IA', 'IC'],
  ['aggressive, < 50% myoinvasion', SEROUS, 'T1a', 'N0', 'M-', 'IA', 'IIC'],
  ['aggressive, >= 50% myoinvasion', { ...SEROUS, myoInvasion: E.MYO_GE_HALF }, 'T1b', 'N0', 'M-', 'IB', 'IIC'],
  ['grade 3 endometrioid is aggressive', { grade: E.GRADE_3 }, 'T1a', 'N0', 'M-', 'IA', 'IIC'],
  ['p53abn with myoinvasion', { ...SEROUS, promise: 'p53-abnormal carcinoma' }, 'T1a', 'N0', 'M-', 'IA', 'IICm'],
  ['p53abn without myoinvasion is not IICm', { ...SEROUS, myoInvasion: E.MYO_NONE, promise: 'p53-abnormal carcinoma' }, 'T1a', 'N0', 'M-', 'IA', 'IC'],
  ['POLEmut confined to polyp', { myoInvasion: E.MYO_NONE, tumourSite: 'Endometrial polyp', promise: 'POLE-mutated carcinoma' }, 'T1a', 'N0', 'M-', 'IA', 'IAm'],
  ['POLEmut with cervical extension', { cervix: 'Cervical stromal invasion', promise: 'POLE-mutated carcinoma' }, 'T2', 'N0', 'M-', 'II', 'IAm'],
  ['POLEmut with serosal involvement is not IAm', { serosa: 'Present', promise: 'POLE-mutated carcinoma' }, 'T3a', 'N0', 'M-', 'IIIA', 'IIIA2'],
  ['ovary involved, aggressive', { ...SEROUS, otherInvolvement: ['Right ovary'] }, 'T3a', 'N0', 'M-', 'IIIA', 'IIIA1'],
  ['ovary involved, synchronous low-grade pattern', { otherInvolvement: ['Left ovary'], ovarianSynchronous: true }, 'T3a', 'N0', 'M-', 'IIIA', 'IA3'],
  ['ovary involved, synchronous box unticked', { otherInvolvement: ['Left ovary'] }, 'T3a', 'N0', 'M-', 'IIIA', 'IIIA1'],
  ['tube involved', { otherInvolvement: ['Right fallopian tube'] }, 'T3a', 'N0', 'M-', 'IIIA', 'IIIA1'],
  ['serosa involved', { serosa: 'Present' }, 'T3a', 'N0', 'M-', 'IIIA', 'IIIA2'],
  ['vagina involved', { otherInvolvement: ['Vagina'] }, 'T3b', 'N0', 'M-', 'IIIB', 'IIIB1'],
  ['parametrium involved', { otherInvolvement: ['Left parametrium'] }, 'T3b', 'N0', 'M-', 'IIIB', 'IIIB1'],
  ['pelvic peritoneum', { pelvicPeritoneum: 'Present' }, 'T1a', 'N0', 'M1', 'IVB', 'IIIB2'],
  ['pelvic micrometastasis', { pelvicMicro: '1' }, 'T1a', 'N1mi', 'M-', 'IIIC1', 'IIIC1i'],
  ['pelvic macrometastasis', { pelvicMacro: '2', pelvicMicro: '1' }, 'T1a', 'N1a', 'M-', 'IIIC1', 'IIIC1ii'],
  ['para-aortic micrometastasis', { paExamined: '5', paMicro: '1' }, 'T1a', 'N2mi', 'M-', 'IIIC2', 'IIIC2i'],
  ['para-aortic macrometastasis outranks pelvic', { pelvicMacro: '3', paExamined: '5', paMacro: '1' }, 'T1a', 'N2a', 'M-', 'IIIC2', 'IIIC2ii'],
  ['isolated tumour cells only', { pelvicItc: '2' }, 'T1a', 'N0(i+)', 'M-', 'IA', 'IA2'],
  ['no nodes submitted', { pelvicExamined: '0' }, 'T1a', 'NX', 'M-', 'IA', 'IA2'],
  ['bladder mucosa', { otherInvolvement: ['Bladder wall with mucosal involvement'] }, 'T4', 'N0', 'M-', 'IVA', 'IVA'],
  ['bowel wall without mucosa is T3b-level pelvic spread', { otherInvolvement: ['Bowel wall without mucosal involvement', 'Pelvic wall'] }, 'T3b', 'N0', 'M-', 'IIIB', 'IIIB1'],
  ['omentum', { distantMets: ['Omentum'] }, 'T1a', 'N0', 'M1', 'IVB', 'IVB'],
  ['omentum via organ involvement', { otherInvolvement: ['Omentum'] }, 'T1a', 'N0', 'M1', 'IVB', 'IVB'],
  ['extrapelvic peritoneum', { distantMets: ['Extrapelvic peritoneum'] }, 'T1a', 'N0', 'M1', 'IVB', 'IVB'],
  ['inguinal node', { distantMets: ['Inguinal lymph node(s)'] }, 'T1a', 'N0', 'M1', 'IVB', 'IVC'],
  ['lung', { distantMets: ['Lung (specify)'] }, 'T1a', 'N0', 'M1', 'IVB', 'IVC'],
  ['nodes plus omentum: IVB wins', { paExamined: '4', paMacro: '1', distantMets: ['Omentum'] }, 'T1a', 'N2a', 'M1', 'IVB', 'IVB'],
  ['myoinvasion not recorded', { myoInvasion: 'Cannot be assessed (explain)' }, 'TX', 'N0', 'M-', null, null]
];

for (const [name, o, t, n, m, group, f23] of TABLE) {
  test(`stage: ${name}`, () => {
    const x = v(o);
    assert.equal(E.T(x).cat, t, 'T');
    assert.equal(E.N(x).cat, n, 'N');
    assert.equal(E.M(x).cat, m, 'M');
    assert.equal(E.stageGroup(t, n, m), group, 'AJCC group');
    assert.equal(E.figo2009(x).stage, group, 'FIGO 2009');
    assert.equal(E.figo2023(x).stage, f23, 'FIGO 2023');
  });
}

test('myoExtent: the microscopic pick overrides the macro site once it exists', () => {
  assert.equal(E.myoExtent(v({ myoInvasion: E.MYO_NONE, tumourSite: 'Endometrial polyp', noInvasionExtent: E.NOINV_ENDOMETRIUM })), 'endometrium');
  assert.equal(E.myoExtent(v({ myoInvasion: E.MYO_NONE, tumourSite: 'Endometrium', noInvasionExtent: E.NOINV_POLYP })), 'polyp');
  assert.equal(E.myoExtent(v({ myoInvasion: E.MYO_NONE, noInvasionExtent: E.NOINV_POLYP_AND_ENDOMETRIUM })), 'endometrium');
  assert.equal(E.figo2023(v({ myoInvasion: E.MYO_NONE, noInvasionExtent: E.NOINV_POLYP })).basis, 'non-aggressive histotype limited to an endometrial polyp');
  assert.equal(E.figo2023(v({ ...SEROUS, myoInvasion: E.MYO_NONE, noInvasionExtent: E.NOINV_POLYP })).basis, 'aggressive histotype limited to a polyp');
});

test('FIGO 2023 conditional note when the molecular class is unconfirmed', () => {
  const r = E.figo2023(v({ promise: 'Not classified (testing incomplete)' }));
  assert.equal(r.stage, 'IA2');
  assert.match(r.conditional, /IICm if p53abn or IAm if POLEmut/);
  const r2 = E.figo2023(v({ promise: '', myoInvasion: E.MYO_NONE }));
  assert.equal(r2.stage, 'IA1');
  assert.match(r2.conditional, /^would become IAm if POLEmut/);
  assert.equal(E.figo2023(v({})).conditional, undefined);
  assert.equal(E.figo2023(v({ promise: 'Mismatch repair-deficient carcinoma' })).stage, 'IA2');
});

test('FIGO 2009 notes and reference lines', () => {
  assert.match(E.figo2009(v({ cervix: 'Endocervical glandular involvement only' })).note, /glandular involvement only does not raise/);
  assert.match(E.figo2009(v({ pelvicItc: '1' })).note, /isolated tumour cells do not upstage/);
  const lines = E.referenceLines(v({}));
  assert.deepEqual(lines, [
    'FIGO 2009 (reference, not reported): IA',
    'FIGO 2023 (reference, not reported): IA2 - invasion of less than half of the myometrium, non-aggressive histotype'
  ]);
  assert.equal(E.referenceLines(v({ myoInvasion: '' }))[0], 'FIGO 2009 (reference, not reported): not assignable - myometrial invasion not recorded');
});

test('deriveTNM through the shared staging index', () => {
  const st = deriveTNM(v({ myoInvasion: E.MYO_GE_HALF, pelvicMacro: '1' }), 'endometrium');
  assert.equal(st.tnm, 'pT1b pN1a');
  assert.equal(st.stage, 'IIIC1');
  assert.equal(st.edition, 'AJCC 8th edition');
  const m1 = deriveTNM(v({ distantMets: ['Liver (specify)'] }), 'endometrium');
  assert.equal(m1.tnm, 'pT1a pN0 pM1');
  assert.equal(m1.stage, 'IVB');
  assert.equal(deriveTNM(v({ pelvicItc: '1' }), 'endometrium').tnm, 'pT1a pN0(i+)');
});
