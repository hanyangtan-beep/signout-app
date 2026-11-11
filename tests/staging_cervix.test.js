// Cervical carcinoma staging module (AJCC version 9, the definitions in CAP Cervix 5.1.1.0, the stage groups of
// AJCC Table 10 with their matching FIGO 2018 stages). Spec: docs/specs/cervical-carcinoma.md and
// docs/reference/cervix-sources.md. The 3 / 5 mm depth and 20 / 40 mm size cut-offs, the visible-lesion rule,
// T2-T4 by extension, pelvic and para-aortic N with the mi / a split, adnexa and serosa as M1 and the grouping
// are all pinned here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM, parseOverride, stageLine } from '../src/staging/index.js';
import * as S from '../src/staging/cervix.js';

const BASE = {
  histType: 'Squamous cell carcinoma, HPV-associated', lesionAppearance: 'No macroscopic lesion', doi: '', doiMm: '7', tumourSizeMm: '25',
  extension: ['Not identified'], pelvicExamined: '18', pelvicSentinel: '0', pelvicMacro: '0', pelvicMicro: '0', pelvicItc: '0',
  paExamined: '', paSentinel: '', paMacro: '', paMicro: '', paItc: '', distantMets: ['Not applicable']
};
const cx = (patch = {}) => deriveTNM({ ...BASE, ...patch }, 'cervix');
const tnm = (patch) => cx(patch).tnm;
const tCat = (patch) => S.T({ ...BASE, ...patch }).cat;
const tNote = (patch) => S.T({ ...BASE, ...patch }).note || '';
const nCat = (patch) => S.N({ ...BASE, ...patch }).cat;
const refs = (patch = {}) => S.referenceLines({ ...BASE, ...patch }, cx(patch));

test('cervix module: registered under its id, AJCC 9th edition', () => {
  assert.equal(S.id, 'cervix');
  assert.equal(S.edition, 'AJCC 9th edition');
  const r = cx();
  assert.equal(r.edition, 'AJCC 9th edition');
  assert.equal(r.tnm, 'pT1b2 pN0');
  assert.equal(r.stage, 'IB2');
  assert.equal(stageLine(r), 'Stage group (if cM0): IB2');
});

test('cervix T1a: 3 mm and 5 mm are the depth limits for a tumour seen only under the microscope', () => {
  const micro = { tumourSizeMm: '6' };
  assert.equal(tCat({ ...micro, doiMm: '3' }), 'T1a1');
  assert.equal(tCat({ ...micro, doiMm: '3.1' }), 'T1a2');
  assert.equal(tCat({ ...micro, doiMm: '5' }), 'T1a2');
  assert.equal(tCat({ ...micro, doiMm: '5.1' }), 'T1b1');
  assert.equal(tCat({ ...micro, doiMm: '0.4' }), 'T1a1');
  // The CAP category alone, without a measurement.
  assert.equal(tCat({ ...micro, doiMm: '', doi: S.DOI.le3 }), 'T1a1');
  assert.equal(tCat({ ...micro, doiMm: '', doi: S.DOI.le5 }), 'T1a2');
  assert.equal(tCat({ ...micro, doiMm: '', doi: S.DOI.gt5 }), 'T1b1');
  assert.equal(tCat({ ...micro, doiMm: '2', doi: S.DOI.gt5 }), 'T1a1', 'the measurement wins over the category');
  assert.equal(tCat({ ...micro, doiMm: '', doi: '' }), 'T1');
  assert.match(tNote({ ...micro, doiMm: '', doi: '' }), /^pT1 \(subcategory cannot be determined\): depth of stromal invasion not recorded\.$/);
  assert.equal(tCat({ ...micro, doiMm: '2', doi: S.DOI.cannot }), 'T1', 'depth cannot be determined');
  // Horizontal extent no longer changes the category (FIGO 2018).
  assert.equal(tCat({ ...micro, doiMm: '2', tumourSizeMm: '12', horizontalMm: '12' }), 'T1a1');
  assert.match(tNote({ ...micro, doiMm: '2.5', doiAtLeast: true }), /The depth of invasion is a minimum \(tumour reaches a margin\): pT1a1 is the lowest category it supports\./);
});

test('cervix T1b: 20 mm and 40 mm split T1b1, T1b2 and T1b3; a visible lesion is T1b whatever the depth', () => {
  assert.equal(tCat({ tumourSizeMm: '20' }), 'T1b1');
  assert.equal(tCat({ tumourSizeMm: '20.1' }), 'T1b2');
  assert.equal(tCat({ tumourSizeMm: '40' }), 'T1b2');
  assert.equal(tCat({ tumourSizeMm: '41' }), 'T1b3');
  assert.equal(tCat({ tumourSizeMm: '' }), 'T1b');
  assert.match(tNote({ tumourSizeMm: '' }), /^pT1b \(subcategory cannot be determined\): tumour size not recorded\.$/);
  assert.match(tNote({ tumourSizeMm: '18', sizeAtLeast: true }), /The tumour size is a minimum \(tumour reaches a margin\): pT1b1 is the lowest category it supports\./);
  assert.equal(tNote({ tumourSizeMm: '45', sizeAtLeast: true }), '', 'T1b3 is the top of the range');
  for (const look of S.VISIBLE) {
    assert.equal(tCat({ lesionAppearance: look, doiMm: '2', tumourSizeMm: '12' }), 'T1b1', look);
    assert.match(tNote({ lesionAppearance: look, doiMm: '2', tumourSizeMm: '12' }), /A macroscopically visible tumour is pT1b whatever the depth/);
  }
  assert.equal(tCat({ lesionAppearance: 'No macroscopic lesion', doiMm: '2', tumourSizeMm: '12' }), 'T1a1');
});

test('cervix T2-T4: vagina, parametrium, lower vagina, pelvic wall and mucosa; the corpus is disregarded', () => {
  const E = S.EXT;
  assert.equal(tCat({ extension: [E.vaginaUpper], tumourSizeMm: '40' }), 'T2a1');
  assert.equal(tCat({ extension: [E.vaginaUpper], tumourSizeMm: '41' }), 'T2a2');
  assert.equal(tCat({ extension: [E.vaginaUpper], tumourSizeMm: '' }), 'T2a');
  assert.match(tNote({ extension: [E.vaginaUpper], tumourSizeMm: '' }), /pT2a \(subcategory cannot be determined\)/);
  for (const p of S.PARAMETRIUM) assert.equal(tCat({ extension: [p, E.vaginaUpper] }), 'T2b', p);
  assert.equal(tCat({ extension: [E.vaginaLower, E.paraR] }), 'T3a');
  assert.equal(tCat({ extension: [E.pelvicWall, E.vaginaLower] }), 'T3b');
  assert.equal(tCat({ extension: [E.bladderMucosa, E.pelvicWall] }), 'T4');
  assert.equal(tCat({ extension: [E.bowelMucosa] }), 'T4');
  assert.equal(tCat({ extension: [E.vaginaNs] }), 'T2');
  assert.match(tNote({ extension: [E.vaginaNs] }), /The upper two-thirds is pT2a, the lower third pT3a\./);
  for (const wall of [E.bladderWall, E.rectalWall]) {
    assert.equal(tCat({ extension: [wall] }), 'T2', wall);
    assert.match(tNote({ extension: [wall] }), /not pT4 \(the mucosa must be involved\)/);
  }
  assert.equal(tCat({ extension: [E.corpus] }), 'T1b2', 'corpus extension does not change T');
  assert.match(tNote({ extension: [E.corpus] }), /^Extension to the uterine corpus is disregarded for pT\.$/);
  assert.equal(tCat({ extension: [E.cannot] }), 'TX');
  assert.equal(tCat({ extension: [E.ovaryR] }), 'T1b2', 'the adnexa are M, not T');
});

test('cervix N: pelvic N1, para-aortic N2, micrometastasis mi, macrometastasis a', () => {
  assert.equal(nCat({}), 'N0');
  assert.equal(nCat({ pelvicMicro: '1' }), 'N1mi');
  assert.equal(nCat({ pelvicMacro: '2', pelvicMicro: '1' }), 'N1a');
  assert.equal(nCat({ paExamined: '5', paMicro: '1' }), 'N2mi');
  assert.equal(nCat({ paExamined: '5', paMacro: '1', pelvicMacro: '3' }), 'N2a');
  assert.equal(nCat({ pelvicExamined: '', paExamined: '6', paMacro: '1' }), 'N2a', 'para-aortic alone');
  assert.equal(tnm({ pelvicMicro: '1' }), 'pT1b2 pN1mi');
  assert.equal(tnm({ paExamined: '5', paMicro: '1' }), 'pT1b2 pN2mi');
});

test('cervix N0: isolated tumour cells, the (sn) suffix and no pN without nodes', () => {
  assert.equal(nCat({ pelvicItc: '1' }), 'N0(i+)');
  assert.equal(nCat({ pelvicExamined: '3', pelvicSentinel: '3' }), 'N0(sn)');
  assert.equal(nCat({ pelvicExamined: '2', pelvicSentinel: '2', pelvicItc: '1' }), 'N0(i+)(sn)');
  assert.equal(nCat({ pelvicExamined: '4', pelvicSentinel: '2' }), 'N0', 'not every node a sentinel node');
  assert.equal(nCat({ pelvicExamined: '2', pelvicSentinel: '2', paExamined: '1', paSentinel: '1' }), 'N0(sn)');
  assert.equal(nCat({ pelvicExamined: '2', pelvicSentinel: '2', pelvicMacro: '1' }), 'N1a(sn)');
  const itc = cx({ pelvicExamined: '2', pelvicSentinel: '2', pelvicItc: '1' });
  assert.equal(itc.tnm, 'pT1b2 pN0(i+)(sn)');
  assert.equal(itc.stage, 'IB2', 'N0(i+) groups with N0');
  assert.ok(itc.notes.includes('Isolated tumour cells only: pN0(i+), grouped with pN0 for the stage.'));
  const none = cx({ pelvicExamined: '', pelvicSentinel: '', doiMm: '2', tumourSizeMm: '6' });
  assert.equal(none.N, 'NX');
  assert.equal(none.tnm, 'pT1a1', 'pN is not printed when no node was examined');
  assert.equal(none.stage, '');
});

test('cervix M: the adnexa and uterine serosa are M1 under version 9, with the FIGO difference in Checks', () => {
  const adnexa = cx({ extension: [S.EXT.ovaryR] });
  assert.equal(adnexa.M, 'M1');
  assert.equal(adnexa.tnm, 'pT1b2 pN0 pM1');
  assert.equal(adnexa.stage, 'IVB');
  assert.deepEqual(S.m1Sites({ ...BASE, extension: [S.EXT.tubeL, S.EXT.ovaryL] }), [S.METS.adnexa], 'one Adnexa site for any number of adnexal entries');
  assert.deepEqual(refs({ extension: [S.EXT.ovaryR] }), [
    'Stage group, AJCC 9th edition, matching FIGO 2018 (reference, not reported): IVB',
    'AJCC version 9 makes adnexal or uterine serosal involvement pM1 (stage IVB); FIGO 2018 does not stage it as IV, and groups this tumour by its cervical extent and nodes (IB2).'
  ]);
  assert.match(refs({ distantMets: [S.METS.serosa], pelvicExamined: '' }).join('\n'), /\(IB2 if the nodes are negative\)\.$/);
  const lung = cx({ distantMets: [S.METS.lung, S.METS.adnexa] });
  assert.equal(lung.stage, 'IVB');
  assert.equal(refs({ distantMets: [S.METS.lung, S.METS.adnexa] }).length, 1, 'no FIGO note when a true distant site is present');
  assert.equal(cx({ extension: [S.EXT.omentum] }).M, 'M1', 'omentum is intraperitoneal disease');
  assert.equal(cx({ distantMets: [S.METS.inguinal] }).M, 'M1', 'inguinal nodes are distant');
  assert.equal(cx({ distantMets: ['Not identified'] }).M, 'M-');
});

test('cervix stage groups (AJCC Table 10, matching FIGO 2018)', () => {
  const g = S.stageGroup;
  assert.equal(g('T1a1', 'N0', 'M-'), 'IA1');
  assert.equal(g('T1a2', 'N0(sn)', 'M-'), 'IA2');
  assert.equal(g('T1b1', 'N0(i+)', 'M-'), 'IB1');
  assert.equal(g('T1b3', 'N0', 'M-'), 'IB3');
  assert.equal(g('T2a1', 'N0', 'M-'), 'IIA1');
  assert.equal(g('T2a2', 'N0', 'M-'), 'IIA2');
  assert.equal(g('T2b', 'N0', 'M-'), 'IIB');
  assert.equal(g('T3a', 'N0', 'M-'), 'IIIA');
  assert.equal(g('T3b', 'N0', 'M-'), 'IIIB');
  assert.equal(g('T1a1', 'N1mi', 'M-'), 'IIIC1');
  assert.equal(g('TX', 'N1a', 'M-'), 'IIIC1');
  assert.equal(g('T3b', 'N1a', 'M-'), 'IIIC1');
  assert.equal(g('T1b1', 'N2mi(sn)', 'M-'), 'IIIC2');
  assert.equal(g('T4', 'N2a', 'M-'), 'IVA');
  assert.equal(g('T1b1', 'N0', 'M1'), 'IVB');
  assert.equal(g('TX', 'N0', 'M-'), '');
  assert.equal(g('T1a1', 'NX', 'M-'), '');
});

test('cervix Checks line: the stage group, never printed; FIGO adds p to IIIC; no nodes says why', () => {
  assert.deepEqual(refs(), ['Stage group, AJCC 9th edition, matching FIGO 2018 (reference, not reported): IB2']);
  assert.deepEqual(refs({ extension: [S.EXT.paraL], pelvicMacro: '2' }), ['Stage group, AJCC 9th edition, matching FIGO 2018 (reference, not reported): IIIC1 (FIGO IIIC1p)']);
  assert.deepEqual(refs({ paExamined: '4', paMacro: '1' }), ['Stage group, AJCC 9th edition, matching FIGO 2018 (reference, not reported): IIIC2 (FIGO IIIC2p)']);
  assert.deepEqual(refs({ pelvicExamined: '', doiMm: '2', tumourSizeMm: '6' }),
    ['Stage group, AJCC 9th edition, matching FIGO 2018 (reference, not reported): IA1 if the regional nodes are negative (no lymph nodes examined)']);
  assert.deepEqual(refs({ extension: [S.EXT.cannot] }), ['Stage group, AJCC 9th edition, matching FIGO 2018 (reference, not reported): not assignable - the primary tumour category is needed']);
});

test('cervix override: the version 9 subcategories parse; descriptors m, r and y', () => {
  assert.deepEqual((({ T, N }) => ({ T, N }))(parseOverride('pT1b2 pN0')), { T: 'T1b2', N: 'N0' });
  assert.deepEqual((({ T, N }) => ({ T, N }))(parseOverride('pT2a1 pN2mi')), { T: 'T2a1', N: 'N2mi' });
  assert.deepEqual((({ T, N }) => ({ T, N }))(parseOverride('ypT1a2 pN0(sn)')), { T: 'T1a2', N: 'N0' }, 'the (sn) suffix is read as the bare category');
  const ov = cx({ tnmOverride: 'pT2a1 pN2mi' });
  assert.equal(ov.tnm, 'pT2a1 pN2mi');
  assert.equal(ov.stage, 'IIIC2');
  assert.ok(ov.overridden);
  assert.equal(tnm({ postTherapy: true }), 'ypT1b2 ypN0');
  assert.equal(tnm({ recurrent: true }), 'rpT1b2 pN0');
  assert.deepEqual(S.descriptors({ multiplePrimaries: true, recurrent: true, postTherapy: true }), ['m', 'r', 'y']);
});
