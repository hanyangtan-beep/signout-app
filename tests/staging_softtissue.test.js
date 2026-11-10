// Soft tissue sarcoma grade and staging module - Phase 84 (user request 2026-11-10). FNCLCC grade (CAP Soft Tissue
// 4.2.0.0, Note G, and the QMH MS-Soft tissue sarcoma page) and pTNM on the AJCC 8th edition (AJCC has no version 9
// soft tissue chapter), the stage groups of the NCI PDQ table. Sources: docs/reference/soft-tissue-sources.md. The
// score sums, the mitotic and size cut-offs, every stage group of the trunk and extremities and the retroperitoneum
// (N1 included), the ungraded and high-by-definition types and the QMH differentiation scores are pinned here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveTNM } from '../src/staging/index.js';
import * as S from '../src/staging/softtissue.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const HPF = S.MITOTIC_UNITS[0];
const MM2 = S.MITOTIC_UNITS[1];
const NEC = Object.keys(S.NECROSIS); // none, under 50%, 50% or more
const diffOpt = (score) => S.DIFF.find((d) => d.score === score).option;
// A count that scores 1, 2 or 3 per 10 HPF.
const COUNT = { 1: '5', 2: '20', 3: '40' };
const graded = (d, m, n, extra = {}) => ({ diffScore: diffOpt(d), mitoticCount: COUNT[m], mitoticUnit: HPF, necrosis: NEC[n], ...extra });
const BASE = { siteGroup: S.SITE.TE, tumourSizeMm: '110', ...graded(3, 2, 1), distantMets: ['Not applicable'] };
const st = (patch = {}) => deriveTNM({ ...BASE, ...patch }, 'softtissue');
const tCat = (patch) => S.T({ ...BASE, ...patch }).cat;

test('soft tissue module: registered under its id, AJCC 8th edition; no node examined leaves pN out', () => {
  assert.equal(S.id, 'softtissue');
  assert.equal(S.edition, 'AJCC 8th edition');
  const r = st();
  assert.equal(r.edition, 'AJCC 8th edition');
  assert.equal(r.T, 'T3');
  assert.equal(r.tnm, 'pT3');
  assert.equal(r.noNodes, true);
  assert.equal(r.stage, 'IIIB');
});

test('FNCLCC: every sum of the three scores gives its grade (2 or 3 -> 1, 4 or 5 -> 2, 6 to 8 -> 3)', () => {
  for (const d of [1, 2, 3]) for (const m of [1, 2, 3]) for (const n of [0, 1, 2]) {
    const f = S.fnclcc(graded(d, m, n));
    const total = d + m + n;
    assert.equal(f.mode, 'fnclcc');
    assert.equal(f.total, total, `${d}+${m}+${n}`);
    assert.equal(f.grade, total <= 3 ? 1 : total <= 5 ? 2 : 3, `sum ${total}`);
    assert.equal(S.gCategory(graded(d, m, n)), `G${f.grade}`);
  }
  // The boundaries themselves.
  assert.equal(S.gradeOfScore(3), 1);
  assert.equal(S.gradeOfScore(4), 2);
  assert.equal(S.gradeOfScore(5), 2);
  assert.equal(S.gradeOfScore(6), 3);
  assert.equal(S.gradeOfScore(null), null);
  assert.equal(S.GRADE_TEXT[3], 'Grade 3 (score 6 to 8, high grade)');
});

test('FNCLCC mitotic score: 13 / 14 / 28 / 29 per 10 HPF and 5 / 6 / 11 / 12 per mm2; "<1" reads as 0', () => {
  const sc = (count, unit) => S.mitoticScore(S.mitoticCount({ mitoticCount: count }), unit);
  assert.equal(sc('13', HPF), 1);
  assert.equal(sc('14', HPF), 2);
  assert.equal(sc('28', HPF), 2);
  assert.equal(sc('29', HPF), 3);
  assert.equal(sc('5', MM2), 1);
  assert.equal(sc('6', MM2), 2);
  assert.equal(sc('11', MM2), 2);
  assert.equal(sc('12', MM2), 3);
  assert.equal(S.mitoticCount({ mitoticCount: '<1' }), 0);
  assert.equal(sc('<1', HPF), 1);
  assert.equal(S.mitoticCount({ mitoticCount: '23 per 10 HPF' }), 23);
  assert.equal(S.mitoticCount({ mitoticCount: '' }), null);
  assert.equal(S.mitoticScore(null, HPF), null);
  // The unit left blank reads as 10 HPF.
  assert.equal(S.fnclcc({ ...graded(3, 1, 0), mitoticCount: '14', mitoticUnit: '' }).mitotic.score, 2);
});

test('FNCLCC necrosis: the option picked wins; with none picked the percentage typed scores (0 -> 0, under 50 -> 1, 50 or more -> 2)', () => {
  const nec = (patch) => S.fnclcc({ ...graded(3, 2, 0), necrosis: '', ...patch }).necrosis;
  assert.equal(nec({ necrosisPct: '0' }).score, 0);
  assert.equal(nec({ necrosisPct: '30' }).score, 1);
  assert.equal(nec({ necrosisPct: '49' }).score, 1);
  assert.equal(nec({ necrosisPct: '50' }).score, 2);
  assert.equal(nec({ necrosisPct: '<5' }).score, 1);
  assert.equal(nec({ necrosisPct: '30' }).fromPct, true);
  assert.equal(nec({ necrosisPct: '' }), null);
  const both = nec({ necrosis: NEC[2], necrosisPct: '30' });
  assert.equal(both.score, 2);
  assert.equal(both.fromPct, false);
  assert.deepEqual(S.fnclcc({ ...graded(3, 2, 0), necrosis: '' }).missing, [['tumour necrosis', 'necrosis']]);
});

test('FNCLCC differentiation: the QMH list and scores, in the order of the saved QMH page', () => {
  const txt = fs.readFileSync(path.join(here, '..', 'docs', 'reference', 'qmh', 'softtissue.txt'), 'utf8').split('\n');
  const from = txt.findIndex((l) => l.startsWith('- Histologic type :'));
  const rows = [];
  for (let i = from + 1; i < txt.length && !txt[i].startsWith('- '); i++) {
    const m = txt[i].match(/^\[opt\] (.+) \(score (\d)\)$/);
    if (m) rows.push([m[1], Number(m[2])]);
  }
  assert.equal(rows.length, 28);
  // QMH spells American and runs a few words together; ours is British with spaced slashes.
  const norm = (s) => s.replace(/tumor\b/g, 'tumour').replace('spindlecell', 'spindle cell').replace(/\s*\/\s*/g, ' / ');
  assert.deepEqual(S.DIFF.map((d) => [d.name, d.score]), rows.map(([n, s]) => [norm(n), s]));
  assert.equal(S.DIFF_OPTIONS.length, 29);
  assert.equal(S.DIFF_OPTIONS.at(-1), S.DIFF_OTHER);
});

test('FNCLCC differentiation: from the type when blank; the pick and the typed score override; myxoid over 5% hypercellular scores 3', () => {
  const dif = (patch) => S.differentiation(patch)?.score ?? null;
  assert.equal(dif({ histType: 'Atypical lipomatous tumour' }), 1);
  assert.equal(dif({ histType: 'Well-differentiated liposarcoma' }), 1);
  assert.equal(dif({ histType: 'Dedifferentiated liposarcoma' }), 3);
  assert.equal(dif({ histType: 'Pleomorphic liposarcoma, NOS' }), 3);
  assert.equal(dif({ histType: 'Undifferentiated pleomorphic sarcoma' }), 3);
  assert.equal(dif({ histType: 'Leiomyosarcoma' }), 2);
  assert.equal(dif({ histType: 'Myxofibrosarcoma' }), 2);
  assert.equal(dif({ histType: 'Synovial sarcoma' }), 3);
  assert.equal(dif({ histType: 'Low-grade fibromyxoid sarcoma' }), null);
  assert.equal(dif({ histType: '' }), null);
  assert.equal(dif({ histType: 'Leiomyosarcoma', diffScore: 'Poorly differentiated / pleomorphic leiomyosarcoma (score 3)' }), 3);
  assert.equal(dif({ histType: 'Leiomyosarcoma', diffScore: S.DIFF_OTHER, diffScoreOther: '1' }), 1);
  assert.equal(dif({ diffScore: S.DIFF_OTHER, diffScoreOther: '4' }), null);
  assert.equal(dif({ diffScore: S.DIFF_OTHER, diffScoreOther: '' }), null);
  // Myxoid liposarcoma: more than 5% hypercellular (round cell) areas is high grade.
  assert.equal(dif({ histType: S.MYXOID }), 2);
  assert.equal(dif({ histType: S.MYXOID, hypercellularPct: '5' }), 2);
  assert.equal(dif({ histType: S.MYXOID, hypercellularPct: '6' }), 3);
  assert.equal(dif({ histType: S.MYXOID, hypercellularPct: '10' }), 3);
  assert.equal(S.differentiation({ histType: S.MYXOID, hypercellularPct: '10' }).name, 'High-grade myxoid (round cell) liposarcoma');
});

test('FNCLCC modes: ungraded types, high grade by definition, GX, and a grade asked of an ungraded type', () => {
  const asps = { histType: 'Alveolar soft part sarcoma', mitoticCount: '2', necrosis: NEC[0] };
  assert.equal(S.fnclcc(asps).mode, 'not graded');
  assert.equal(S.gCategory(asps), '');
  assert.equal(S.fnclcc({ histType: 'Angiosarcoma, NOS' }).mode, 'not graded');
  assert.equal(S.fnclcc({ histType: 'Solitary fibrous tumour' }).mode, 'not graded');
  for (const t of S.HIGH_BY_DEFINITION) {
    assert.equal(S.fnclcc({ histType: t }).mode, 'high by definition', t);
    assert.equal(S.gCategory({ histType: t }), 'high');
  }
  assert.equal(S.fnclcc({ histType: 'Alveolar rhabdomyosarcoma', gradeMode: 'Not graded' }).mode, 'high by definition');
  assert.equal(S.fnclcc({ histType: 'Leiomyosarcoma', gradeMode: 'Not graded' }).mode, 'not graded');
  assert.equal(S.gCategory({ ...graded(3, 3, 2), gradeMode: 'Cannot be assessed (GX)' }), 'GX');
  // FNCLCC asked for, or a differentiation score picked, grades an ungraded type.
  assert.equal(S.fnclcc({ ...asps, gradeMode: 'FNCLCC' }).mode, 'fnclcc');
  assert.equal(S.fnclcc({ ...asps, diffScore: 'Alveolar soft part sarcoma (score 3)' }).grade, 2);
  // Incomplete: no grade, the missing scores named.
  const part = S.fnclcc({ histType: 'Leiomyosarcoma' });
  assert.equal(part.grade, null);
  assert.deepEqual(part.missing.map((m) => m[1]), ['mitoticCount', 'necrosis']);
  assert.equal(S.gCategory({ histType: 'Leiomyosarcoma' }), '');
});

test('pT, trunk and extremities and retroperitoneum: 50 / 100 / 150 mm; the dimensions when no size; TX when neither', () => {
  for (const site of [S.SITE.TE, S.SITE.RP]) {
    const t = (mm) => tCat({ siteGroup: site, tumourSizeMm: mm });
    assert.equal(t('50'), 'T1');
    assert.equal(t('51'), 'T2');
    assert.equal(t('100'), 'T2');
    assert.equal(t('101'), 'T3');
    assert.equal(t('150'), 'T3');
    assert.equal(t('151'), 'T4');
    assert.equal(t(''), 'TX');
  }
  assert.equal(tCat({ tumourSizeMm: '', tumourDims: '110 x 70 x 60' }), 'T3');
  assert.equal(S.sizeMm({ tumourSizeMm: '', tumourDims: '45 x 160 x 30' }), 160);
  assert.equal(S.sizeMm({ tumourSizeMm: '', tumourDims: '' }), null);
});

test('pT, head and neck 20 / 40 mm with pT4a / pT4b by invasion; visceral by extent; orbit 20 mm, pT3 / pT4; other sites TX', () => {
  const hn = (mm, inv = S.HN.none) => tCat({ siteGroup: S.SITE.HN, tumourSizeMm: mm, hnInvasion: inv });
  assert.equal(hn('20'), 'T1');
  assert.equal(hn('21'), 'T2');
  assert.equal(hn('40'), 'T2');
  assert.equal(hn('41'), 'T3');
  assert.equal(hn('15', S.HN.T4a), 'T4a');
  assert.equal(hn('15', S.HN.T4b), 'T4b');
  assert.equal(hn(''), 'TX');
  for (const site of [S.SITE.ABD, S.SITE.THX]) {
    for (const [extent, cat] of Object.entries(S.VISCERAL_EXTENT)) assert.equal(tCat({ siteGroup: site, visceralExtent: extent }), cat, extent);
    assert.equal(tCat({ siteGroup: site, visceralExtent: '' }), 'TX');
  }
  const orb = (mm, ext = S.ORBIT.none) => tCat({ siteGroup: S.SITE.ORBIT, tumourSizeMm: mm, orbitExtent: ext });
  assert.equal(orb('20'), 'T1');
  assert.equal(orb('21'), 'T2');
  assert.equal(orb('10', S.ORBIT.T3), 'T3');
  assert.equal(orb('10', S.ORBIT.T4), 'T4');
  assert.equal(tCat({ siteGroup: S.SITE.OTHER }), 'TX');
  assert.equal(tCat({ siteGroup: S.SITE.NS }), 'TX');
  assert.equal(tCat({ siteGroup: '' }), 'TX');
});

test('stage groups, trunk and extremities: IA / IB (G1 and GX), II / IIIA / IIIB (G2 and G3), N1 and M1 -> IV', () => {
  const g = (Tmm, grade, patch = {}) => st({ tumourSizeMm: Tmm, ...grade, ...patch }).stage;
  const G1 = graded(1, 1, 0), G2 = graded(2, 2, 0), G3 = graded(3, 3, 2), GX = { gradeMode: 'Cannot be assessed (GX)' };
  for (const low of [G1, GX]) {
    assert.equal(g('40', low), 'IA');
    assert.equal(g('80', low), 'IB');
    assert.equal(g('120', low), 'IB');
    assert.equal(g('200', low), 'IB');
  }
  for (const high of [G2, G3]) {
    assert.equal(g('40', high), 'II');
    assert.equal(g('80', high), 'IIIA');
    assert.equal(g('120', high), 'IIIB');
    assert.equal(g('200', high), 'IIIB');
  }
  assert.equal(g('40', G1, { nodesExamined: '3', nodesInvolved: '1' }), 'IV');
  assert.equal(g('40', G1, { distantMets: ['Lung'] }), 'IV');
  // NX reads as N0.
  assert.equal(g('40', G1, { nodesExamined: '', nodesInvolved: '' }), 'IA');
  assert.equal(g('40', G1, { nodesExamined: '2', nodesInvolved: '0' }), 'IA');
});

test('stage groups, retroperitoneum: as the trunk except N1 -> IIIB; M1 -> IV', () => {
  const g = (Tmm, grade, patch = {}) => st({ siteGroup: S.SITE.RP, tumourSizeMm: Tmm, ...grade, ...patch }).stage;
  const G1 = graded(1, 1, 0), G3 = graded(3, 3, 2);
  assert.equal(g('40', G1), 'IA');
  assert.equal(g('300', G1), 'IB');
  assert.equal(g('40', G3), 'II');
  assert.equal(g('80', G3), 'IIIA');
  assert.equal(g('250', G3), 'IIIB');
  assert.equal(g('40', G1, { nodesExamined: '4', nodesInvolved: '2' }), 'IIIB');
  assert.equal(g('40', G1, { distantMets: ['Other (specify)'] }), 'IV');
});

test('stage groups: high grade by definition takes the G2 / G3 rows; no group for an ungraded type, an unknown T or other sites', () => {
  assert.equal(st({ histType: 'Alveolar rhabdomyosarcoma', diffScore: '', mitoticCount: '', necrosis: '', tumourSizeMm: '80' }).stage, 'IIIA');
  assert.equal(st({ histType: 'Alveolar soft part sarcoma', diffScore: '', tumourSizeMm: '80' }).stage, '');
  assert.equal(st({ tumourSizeMm: '' }).stage, '');
  assert.equal(st({ diffScore: '', histType: '' }).stage, '');
  for (const site of [S.SITE.HN, S.SITE.ABD, S.SITE.THX, S.SITE.ORBIT, S.SITE.OTHER, S.SITE.NS]) {
    assert.equal(st({ siteGroup: site, tumourSizeMm: '30' }).stage, '', site);
  }
});

test('reference lines: the group, the N0 note with no node examined, and why a group is not assignable', () => {
  const ref = (patch) => S.referenceLines({ ...BASE, ...patch }, deriveTNM({ ...BASE, ...patch }, 'softtissue'));
  assert.deepEqual(ref({}), ['Stage group, AJCC 8th edition (reference, not reported): IIIB (no node examined: N0, as CAP directs)']);
  assert.deepEqual(ref({ nodesExamined: '3', nodesInvolved: '0' }), ['Stage group, AJCC 8th edition (reference, not reported): IIIB']);
  assert.deepEqual(ref({ distantMets: ['Lung'] }), ['Stage group, AJCC 8th edition (reference, not reported): IV']);
  assert.match(ref({ tumourSizeMm: '' })[0], /not assignable - the primary tumour category is needed$/);
  assert.match(ref({ histType: 'Clear cell sarcoma of soft tissue', diffScore: '' })[0], /not assignable - the type is not graded$/);
  assert.match(ref({ necrosis: '' })[0], /not assignable - the FNCLCC grade is needed$/);
  assert.deepEqual(ref({ siteGroup: S.SITE.HN }), ['Stage group, AJCC 8th edition (reference, not reported): AJCC 8th edition defines no stage group for this site']);
  assert.deepEqual(ref({ siteGroup: S.SITE.NS }), []);
  assert.deepEqual(ref({ siteGroup: '' }), []);
});

test('pTNM: N0 / N1 by node count, M1 by any metastasis, descriptors m, r and y', () => {
  assert.equal(st({ nodesExamined: '2', nodesInvolved: '0' }).tnm, 'pT3 pN0');
  assert.equal(st({ nodesExamined: '2', nodesInvolved: '1' }).tnm, 'pT3 pN1');
  assert.equal(st({ distantMets: ['Lung'] }).tnm, 'pT3 pM1');
  assert.equal(st({ distantMets: ['Not identified'] }).tnm, 'pT3');
  assert.equal(st({ distantMets: ['Cannot be determined'] }).tnm, 'pT3');
  assert.equal(st({ preresection: ['Radiation therapy performed'] }).tnm, 'ypT3');
  assert.equal(st({ preresection: ['No known preresection therapy'] }).tnm, 'pT3');
  assert.equal(st({ preresection: ['Other (specify)'] }).tnm, 'pT3');
  assert.equal(st({ recurrent: true }).tnm, 'rpT3');
  assert.equal(st({ multiplePrimaries: true }).tnm, 'pT3(m)');
  assert.deepEqual(S.descriptors({ multiplePrimaries: true, recurrent: true, preresection: ['Chemotherapy performed'] }), ['m', 'r', 'y']);
  const ov = st({ tnmOverride: 'pT4 pN0', tnmOverrideReason: 'size on imaging' });
  assert.equal(ov.tnm, 'pT4 pN0');
  assert.equal(ov.overridden, true);
});
