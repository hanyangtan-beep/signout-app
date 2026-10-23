// Vulval carcinoma staging module (AJCC version 9, the definitions in CAP Vulva 5.1.0.0, the stage groups of
// AJCC Table 6 with their matching FIGO 2021 stages). Spec: docs/specs/specimen-intake.md (Vulval carcinoma
// resection) and docs/reference/vulva-sources.md. The 20 mm / 1.0 mm T1 cut-offs, T2-T4 by extension, N by the
// CAP size-band counts, the 6-node rule for a negative lymphadenectomy, pelvic nodes as M1 and the grouping
// are all pinned here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM, stageLine } from '../src/staging/index.js';
import * as S from '../src/staging/vulva.js';

const BASE = {
  histType: 'Squamous cell carcinoma, HPV-independent', tumourSizeMm: '24', doiMm: '4.5', extension: ['Not identified'],
  nodeSampling: 'Sentinel lymph node biopsy only', nodesExamined: '2', nodesOver5: '0', nodes2to5: '0', nodesMicro: '0',
  nodesItc: '0', nodeFindings: ['None identified'], distantMets: ['Not identified']
};
const vu = (patch = {}) => deriveTNM({ ...BASE, ...patch }, 'vulva');
const tnm = (patch) => vu(patch).tnm;
const tCat = (patch) => S.T({ ...BASE, ...patch }).cat;
const nCat = (patch) => S.N({ ...BASE, ...patch }).cat;

test('vulva module: registered under its id, AJCC 9th edition', () => {
  assert.equal(S.id, 'vulva');
  assert.equal(S.edition, 'AJCC 9th edition');
  const r = vu();
  assert.equal(r.edition, 'AJCC 9th edition');
  assert.equal(r.tnm, 'pT1b pN0(sn)');
  assert.equal(r.stage, 'IB');
  assert.equal(stageLine(r), 'Stage group (if cM0): IB');
});

test('vulva T1: 20 mm and 1.0 mm are the T1a limits; either one exceeded is T1b', () => {
  assert.equal(tCat({ tumourSizeMm: '20', doiMm: '1.0' }), 'T1a');
  assert.equal(tCat({ tumourSizeMm: '21', doiMm: '1.0' }), 'T1b', 'size over 2 cm');
  assert.equal(tCat({ tumourSizeMm: '20', doiMm: '1.1' }), 'T1b', 'invasion over 1 mm');
  assert.equal(tCat({ tumourSizeMm: '8', doiMm: '0.4' }), 'T1a');
  assert.equal(tCat({ tumourSizeMm: '25', doiMm: '' }), 'T1b', 'size alone decides T1b');
  assert.equal(tCat({ tumourSizeMm: '', doiMm: '3' }), 'T1b', 'depth alone decides T1b');
  const unsure = S.T({ ...BASE, tumourSizeMm: '15', doiMm: '' });
  assert.equal(unsure.cat, 'T1', 'T1a needs both measurements');
  assert.match(unsure.note, /pT1 \(subcategory cannot be determined\): depth of invasion not recorded/);
  assert.equal(S.T({ ...BASE, tumourSizeMm: '', doiMm: '' }).note,
    'pT1 (subcategory cannot be determined): tumour size and depth of invasion not recorded.');
  assert.equal(tCat({ tumourSizeMm: '15', doiMm: '0.5', doi: 'Cannot be determined' }), 'T1', 'an undeterminable depth is not a depth');
});

test('vulva T2-T4: extension to the lower third, upper two-thirds and pelvic bone', () => {
  assert.equal(tCat({ extension: ['Urethra, lower one-third'] }), 'T2');
  assert.equal(tCat({ extension: ['Vagina, lower one-third'] }), 'T2');
  assert.equal(tCat({ extension: ['Anus'], tumourSizeMm: '10', doiMm: '0.5' }), 'T2', 'extension outranks a T1a size');
  assert.equal(tCat({ extension: ['Vagina, upper two-thirds'] }), 'T3');
  assert.equal(tCat({ extension: ['Urethra, upper two-thirds'] }), 'T3');
  assert.equal(tCat({ extension: ['Bladder mucosa'] }), 'T3');
  assert.equal(tCat({ extension: ['Rectal mucosa', 'Anus'] }), 'T3', 'the highest site sets T');
  assert.equal(tCat({ extension: ['Pelvic bone', 'Bladder mucosa'] }), 'T4');
  const tx = S.T({ ...BASE, extension: ['Cannot be determined'] });
  assert.equal(tx.cat, 'TX');
  assert.match(tx.note, /cannot be determined: pT is not assigned/);
  assert.equal(tCat({ extension: ['Other tissue or organ (specify)'] }), 'T1b', 'an unlisted organ does not raise T');
});

test('vulva N: the largest size band with a node sets N1mi / N1a / N1b; ENE N1c; fixed or ulcerated N2', () => {
  assert.equal(nCat({ nodesMicro: '1' }), 'N1mi(sn)');
  assert.equal(nCat({ nodesMicro: '1', nodes2to5: '1' }), 'N1a(sn)');
  assert.equal(nCat({ nodes2to5: '2', nodesOver5: '1', nodesExamined: '9', nodeSampling: 'Lymphadenectomy' }), 'N1b');
  assert.equal(nCat({ nodesOver5: '1', nodeFindings: ['Extranodal extension'], nodeSampling: 'Lymphadenectomy', nodesExamined: '12' }), 'N1c');
  assert.equal(nCat({ nodesMicro: '1', nodeFindings: ['Extranodal extension', 'Fixed or ulcerated nodes'], nodeSampling: 'Lymphadenectomy', nodesExamined: '12' }), 'N2',
    'fixed or ulcerated nodes outrank extranodal extension');
  assert.equal(nCat({ nodeFindings: ['Extranodal extension'] }), 'N0(sn)', 'ENE without a counted positive node does not stage N1c');
  assert.equal(nCat({ nodesMicro: '1', nodeSampling: 'Sentinel lymph node biopsy and lymphadenectomy', nodesExamined: '8' }), 'N1mi',
    '(sn) only when sentinel nodes alone were examined');
  assert.deepEqual(S.nodeCounts({ nodesExamined: '7', nodesOver5: '1', nodes2to5: '2', nodesMicro: '1', nodesItc: '3' }),
    { examined: 7, over5: 1, mid: 2, micro: 1, itc: 3, positive: 4 }, 'ITC nodes are not counted as positive');
});

test('vulva N0: isolated tumour cells, the (sn) suffix and the 6-node rule for a negative lymphadenectomy', () => {
  assert.equal(nCat({}), 'N0(sn)');
  const itc = S.N({ ...BASE, nodesItc: '1' });
  assert.equal(itc.cat, 'N0(i+)(sn)');
  assert.match(itc.note, /grouped with pN0 for the stage/);
  assert.equal(nCat({ nodeSampling: 'Lymphadenectomy', nodesExamined: '6' }), 'N0', '6 nodes: pN0');
  const five = S.N({ ...BASE, nodeSampling: 'Lymphadenectomy', nodesExamined: '5' });
  assert.equal(five.cat, 'NX', '5 negative nodes: pN not assigned');
  assert.equal(five.note, 'pN not assigned (cannot be determined): a negative inguinofemoral lymphadenectomy ordinarily includes 6 or more lymph nodes, and 5 were examined.');
  assert.match(S.N({ ...BASE, nodeSampling: 'Lymphadenectomy', nodesExamined: '1' }).note, /and 1 was examined\.$/);
  assert.equal(nCat({ nodeSampling: 'Lymphadenectomy', nodesExamined: '3', nodes2to5: '1' }), 'N1a', 'a positive node stages however few nodes');
  assert.equal(nCat({ nodeSampling: 'Sentinel lymph node biopsy only', nodesExamined: '1' }), 'N0(sn)', 'the 6-node rule is for lymphadenectomy');
  const none = S.N({ ...BASE, nodesExamined: '' });
  assert.equal(none.cat, 'NX');
  assert.equal(none.none, true, 'no nodes examined');
  assert.equal(S.N({ ...BASE, nodesExamined: '0' }).none, true);
});

test('vulva M: pelvic nodes and distant sites are M1, IVB; inguinofemoral nodes are regional', () => {
  for (const site of ['Pelvic lymph node(s)', 'Internal iliac / hypogastric lymph node(s)', 'External iliac lymph node(s)',
    'Common iliac lymph node(s)', 'Presacral lymph node(s)', 'Lung', 'Liver', 'Bone', 'Other (specify)']) {
    const r = vu({ distantMets: [site] });
    assert.equal(r.M, 'M1', site);
    assert.equal(r.stage, 'IVB', site);
  }
  assert.equal(tnm({ distantMets: ['External iliac lymph node(s)'] }), 'pT1b pN0(sn) pM1');
  assert.equal(vu({ distantMets: ['Not identified'] }).M, 'M-');
  assert.equal(vu({ distantMets: ['Cannot be determined'] }).M, 'M-', 'cannot be determined is not M1');
  assert.equal(vu({ distantMets: [] }).M, 'M-');
});

test('vulva stage groups (AJCC Table 6, matching FIGO 2021)', () => {
  const g = S.stageGroup;
  assert.equal(g('T1', 'N0', 'M-'), 'I');
  assert.equal(g('T1a', 'N0', 'M-'), 'IA');
  assert.equal(g('T1b', 'N0(sn)', 'M-'), 'IB', '(sn) is dropped for the grouping');
  assert.equal(g('T1b', 'N0(i+)(sn)', 'M-'), 'IB', 'N0(i+) groups with N0');
  assert.equal(g('T2', 'N0', 'M-'), 'II');
  assert.equal(g('T3', 'N0', 'M-'), 'IIIA');
  assert.equal(g('T1b', 'N1mi(sn)', 'M-'), 'IIIA');
  assert.equal(g('TX', 'N1a', 'M-'), 'IIIA');
  assert.equal(g('T2', 'N1b', 'M-'), 'IIIB');
  assert.equal(g('T3', 'N1c', 'M-'), 'IIIC');
  assert.equal(g('T1b', 'N1', 'M-'), 'III');
  assert.equal(g('T4', 'N0', 'M-'), 'IVA');
  assert.equal(g('T4', 'NX', 'M-'), 'IVA');
  assert.equal(g('T1a', 'N2', 'M-'), 'IVA');
  assert.equal(g('T1a', 'N0', 'M1'), 'IVB');
  assert.equal(g('T1b', 'NX', 'M-'), '', 'T1b needs the node category');
  assert.equal(g('T1a', 'NX', 'M-'), 'IA', 'T1a with no nodes examined');
  assert.equal(g('TX', 'N0', 'M-'), '');
});

test('vulva Checks line: the stage group, never printed; IA without nodes says why', () => {
  assert.deepEqual(S.referenceLines(BASE), ['Stage group, AJCC 9th edition, matching FIGO 2021 (reference, not reported): IB']);
  assert.deepEqual(S.referenceLines({ ...BASE, tumourSizeMm: '15', doiMm: '0.8', nodesExamined: '' }),
    ['Stage group, AJCC 9th edition, matching FIGO 2021 (reference, not reported): IA, with no nodes examined (CAP asks for node evaluation only for invasion of more than 1 mm)']);
  assert.deepEqual(S.referenceLines({ ...BASE, nodesExamined: '' }),
    ['Stage group, AJCC 9th edition, matching FIGO 2021 (reference, not reported): not assignable - the regional node category is needed']);
  assert.deepEqual(S.referenceLines({ ...BASE, extension: ['Cannot be determined'] }),
    ['Stage group, AJCC 9th edition, matching FIGO 2021 (reference, not reported): not assignable - the primary tumour category is needed']);
  assert.deepEqual(S.referenceLines({ ...BASE, histType: 'Phyllodes tumour, malignant' }), [], 'phyllodes tumours are not staged here');
});

test('vulva descriptors and prefix: m, r and y', () => {
  assert.deepEqual(S.descriptors({ multiplePrimaries: true, recurrent: true, postTherapy: true }), ['m', 'r', 'y']);
  assert.deepEqual(S.descriptors({}), []);
  assert.match(tnm({ postTherapy: true }), /^ypT1b/);
  assert.equal(S.staged({ histType: 'Phyllodes tumour, borderline' }), false);
  assert.equal(S.staged({ histType: 'Basal cell carcinoma' }), true);
});
