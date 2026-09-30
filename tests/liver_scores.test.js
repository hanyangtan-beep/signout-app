// Medical liver scores (src/staging/liver.js). Card: docs/roadmap.md "Liver biopsy (medical) — scores module".
// Boundary tests on every sum and range; the tiers are those of docs/reference/liver_biopsy-morphology.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../src/staging/liver.js';

test('scoreOf reads whole numbers only', () => {
  assert.equal(L.scoreOf('0'), 0);
  assert.equal(L.scoreOf(' 3 '), 3);
  assert.equal(L.scoreOf(4), 4);
  for (const v of ['', null, undefined, 'Not assessed', '1a', '1.5', '-1']) assert.equal(L.scoreOf(v), null, String(v));
});

test('sumOf reports missing and out-of-range components and totals only a complete set', () => {
  const parts = [{ key: 'a', label: 'alpha', max: 2 }, { key: 'b', label: 'beta', max: 3 }];
  assert.deepEqual(L.sumOf(parts, { a: '2', b: '3' }), { total: 5, max: 5, complete: true, entered: 2, missing: [], outOfRange: [] });
  assert.deepEqual(L.sumOf(parts, { a: '0', b: '0' }).total, 0);
  const partial = L.sumOf(parts, { a: '1' });
  assert.equal(partial.total, null);
  assert.equal(partial.complete, false);
  assert.equal(partial.entered, 1);
  assert.deepEqual(partial.missing, ['beta']);
  const over = L.sumOf(parts, { a: '3', b: '1' });
  assert.equal(over.total, null);
  assert.deepEqual(over.outOfRange, ['alpha']);
  assert.equal(L.sumOf(parts, {}).entered, 0);
});

test('Ishak modified HAI: A 0-4, B 0-6, C 0-4, D 0-4, maximum 18; without D for AIH, maximum 14', () => {
  assert.deepEqual(L.ISHAK_HAI.map((c) => [c.key, c.max]), [['A', 4], ['B', 6], ['C', 4], ['D', 4]]);
  const full = L.ishakHai({ A: '4', B: '6', C: '4', D: '4' });
  assert.deepEqual([full.total, full.max, full.items], [18, 18, ['A', 'B', 'C', 'D']]);
  assert.equal(L.ishakHai({ A: '0', B: '0', C: '0', D: '0' }).total, 0);
  assert.deepEqual(L.ishakHai({ A: '5', B: '0', C: '0', D: '0' }).outOfRange, ['interface hepatitis']);
  assert.deepEqual(L.ishakHai({ A: '0', B: '7', C: '0', D: '0' }).outOfRange, ['confluent necrosis']);
  assert.deepEqual(L.ishakHai({ A: '0', B: '0', C: '5', D: '0' }).outOfRange, ['focal necrosis']);
  assert.deepEqual(L.ishakHai({ A: '0', B: '0', C: '0', D: '5' }).outOfRange, ['portal inflammation']);
  const aih = L.ishakHai({ A: '3', B: '0', C: '2', D: '4' }, { withoutD: true });
  assert.deepEqual([aih.total, aih.max, aih.items], [5, 14, ['A', 'B', 'C']]);
  assert.equal(L.ishakHai({ A: '3', B: '0', C: '2' }, { withoutD: true }).complete, true, 'D is not needed for AIH');
  assert.deepEqual(L.ishakHai({ A: '3', B: '0', C: '2' }).missing, ['portal inflammation']);
});

test('METAVIR activity follows the Bedossa 1996 table for every PN and LN pair', () => {
  const table = { 0: ['A0', 'A1', 'A2'], 1: ['A1', 'A1', 'A2'], 2: ['A2', 'A2', 'A3'], 3: ['A3', 'A3', 'A3'] };
  for (const [pn, row] of Object.entries(table)) row.forEach((a, ln) => assert.equal(L.metavirActivity(pn, String(ln)), a, `PN${pn} LN${ln}`));
  assert.equal(L.metavirActivity('4', '0'), null, 'PN over 3');
  assert.equal(L.metavirActivity('0', '3'), null, 'LN over 2');
  assert.equal(L.metavirActivity('', '1'), null);
  assert.equal(L.metavirActivity('1', ''), null);
  assert.deepEqual(Object.keys(L.METAVIR_ACTIVITY_WORDS), ['A0', 'A1', 'A2', 'A3']);
});

test('Batts-Ludwig grades 0-4 each have words', () => {
  assert.deepEqual(Object.keys(L.BATTS_GRADE_WORDS), ['0', '1', '2', '3', '4']);
  assert.equal(L.BATTS_GRADE_WORDS[0], 'no activity');
  assert.equal(L.BATTS_GRADE_WORDS[4], 'severe activity');
});

test('NAS: steatosis 0-3, lobular inflammation 0-3, ballooning 0-2, total 0-8', () => {
  assert.deepEqual(L.NAS.map((c) => [c.key, c.max]), [['steatosis', 3], ['lobular', 3], ['ballooning', 2]]);
  assert.equal(L.nas({ steatosis: '3', lobular: '3', ballooning: '2' }).total, 8);
  assert.equal(L.nas({ steatosis: '0', lobular: '0', ballooning: '0' }).total, 0);
  assert.equal(L.nas({ steatosis: '2', lobular: '2', ballooning: '1' }).total, 5);
  assert.deepEqual(L.nas({ steatosis: '4', lobular: '0', ballooning: '0' }).outOfRange, ['steatosis']);
  assert.deepEqual(L.nas({ steatosis: '0', lobular: '4', ballooning: '0' }).outOfRange, ['lobular inflammation']);
  assert.deepEqual(L.nas({ steatosis: '0', lobular: '0', ballooning: '3' }).outOfRange, ['ballooning']);
  assert.equal(L.nas({ steatosis: '2', lobular: '1' }).complete, false);
});

test('steatosis grade from the percentage: under 5% 0, 5-33% 1, over 33-66% 2, over 66% 3', () => {
  const cases = [['0', 0], ['4.9', 0], ['5', 1], ['33', 1], ['33.5', 2], ['34', 2], ['66', 2], ['67', 3], ['100', 3]];
  for (const [pct, g] of cases) assert.equal(L.steatosisGrade(pct), g, `${pct}%`);
  for (const v of ['', '-1', '101', 'many']) assert.equal(L.steatosisGrade(v), null, v);
});

test('SAF: S, A as ballooning plus SAF lobular inflammation (0-4), F from the NASH CRN stage with 1a-1c pooled', () => {
  assert.deepEqual(['0', '1a', '1b', '1c', '1', '2', '3', '4'].map(L.safFibrosis), [0, 1, 1, 1, 1, 2, 3, 4]);
  assert.equal(L.safFibrosis('5'), null);
  assert.equal(L.safFibrosis(''), null);
  const s = L.saf({ steatosis: '2', ballooning: '1', lobular: '2', stage: '2' });
  assert.deepEqual([s.S, s.A, s.F, s.complete, s.label, s.activityWord], [2, 3, 2, true, 'SAF S2 A3 F2', 'severe activity']);
  assert.equal(L.saf({ steatosis: '1', ballooning: '2', lobular: '2', stage: '0' }).A, 4);
  assert.equal(L.saf({ steatosis: '1', ballooning: '2', lobular: '2', stage: '0' }).activityWord, 'severe activity', 'A4 reads as severe');
  assert.equal(L.saf({ steatosis: '1', ballooning: '0', lobular: '0', stage: '1b' }).label, 'SAF S1 A0 F1');
  assert.equal(L.saf({ steatosis: '1', ballooning: '0', lobular: '0', stage: '1b' }).activityWord, 'no activity');
  assert.equal(L.saf({ steatosis: '1', ballooning: '0', lobular: '3', stage: '1' }).A, null, 'SAF lobular is 0-2');
  assert.equal(L.saf({ steatosis: '1', ballooning: '3', lobular: '0', stage: '1' }).A, null, 'ballooning is 0-2');
  assert.equal(L.saf({ steatosis: '4', ballooning: '0', lobular: '0', stage: '1' }).S, null, 'steatosis is 0-3');
  const partial = L.saf({ steatosis: '2', ballooning: '1', lobular: '1', stage: '' });
  assert.deepEqual([partial.complete, partial.label], [false, null]);
});

test('FLIP: steatosis 1 or more enters; all three at 1 or more is steatohepatitis', () => {
  assert.equal(L.flip({ steatosis: '0', ballooning: '2', lobular: '2' }), 'none');
  assert.equal(L.flip({ steatosis: '1', ballooning: '1', lobular: '1' }), 'steatohepatitis');
  assert.equal(L.flip({ steatosis: '1', ballooning: '0', lobular: '2' }), 'steatosis');
  assert.equal(L.flip({ steatosis: '3', ballooning: '2', lobular: '0' }), 'steatosis');
  assert.equal(L.flip({ steatosis: '', ballooning: '1', lobular: '1' }), null);
  assert.equal(L.flip({ steatosis: '2', ballooning: '', lobular: '1' }), null);
});

test('rejection activity index: three components 0-3, maximum 9', () => {
  assert.deepEqual(L.RAI.map((c) => [c.key, c.max]), [['portal', 3], ['bileDuct', 3], ['venous', 3]]);
  assert.equal(L.rai({ portal: '3', bileDuct: '3', venous: '3' }).total, 9);
  assert.equal(L.rai({ portal: '2', bileDuct: '2', venous: '2' }).total, 6);
  assert.equal(L.rai({ portal: '0', bileDuct: '0', venous: '0' }).total, 0);
  assert.deepEqual(L.rai({ portal: '4', bileDuct: '0', venous: '0' }).outOfRange, ['portal inflammation']);
  assert.deepEqual(L.rai({ portal: '1', bileDuct: '1' }).missing, ['venous endothelial inflammation']);
});

test('Nakanuma stage: three-item sums 0 / 1-3 / 4-6 / 7-9, two-item sums 0 / 1-2 / 3-4 / 5-6', () => {
  const three = [[0, 1], [1, 2], [3, 2], [4, 3], [6, 3], [7, 4], [9, 4]];
  for (const [sum, stage] of three) {
    const f = Math.min(sum, 3);
    const b = Math.min(sum - f, 3);
    const o = sum - f - b;
    const r = L.nakanumaStage({ fibrosis: String(f), ductLoss: String(b), orcein: String(o) });
    assert.deepEqual([r.sum, r.max, r.items, r.stage], [sum, 9, 3, stage], `three-item sum ${sum}`);
  }
  const two = [[0, 1], [1, 2], [2, 2], [3, 3], [4, 3], [5, 4], [6, 4]];
  for (const [sum, stage] of two) {
    const f = Math.min(sum, 3);
    const r = L.nakanumaStage({ fibrosis: String(f), ductLoss: String(sum - f), orcein: 'Not assessed' });
    assert.deepEqual([r.sum, r.max, r.items, r.stage], [sum, 6, 2, stage], `two-item sum ${sum}`);
  }
  assert.equal(L.nakanumaStage({ fibrosis: '4', ductLoss: '0', orcein: '0' }), null);
  assert.equal(L.nakanumaStage({ fibrosis: '0', ductLoss: '4', orcein: '0' }), null);
  assert.equal(L.nakanumaStage({ fibrosis: '0', ductLoss: '0', orcein: '4' }), null);
  assert.equal(L.nakanumaStage({ fibrosis: '', ductLoss: '1', orcein: '1' }), null);
  assert.deepEqual(Object.keys(L.NAKANUMA_STAGE_WORDS), ['1', '2', '3', '4']);
});

test('stage systems: every stage has words and a label; stage 0 has no diagnosis phrase', () => {
  const expected = { Ishak: ['0', '1', '2', '3', '4', '5', '6'], METAVIR: ['0', '1', '2', '3', '4'], 'NASH CRN': ['0', '1a', '1b', '1c', '2', '3', '4'], 'Batts-Ludwig': ['0', '1', '2', '3', '4'] };
  assert.deepEqual(Object.keys(L.STAGE_SYSTEMS), Object.keys(expected));
  for (const [sys, stages] of Object.entries(expected)) {
    assert.deepEqual(L.STAGE_SYSTEMS[sys].stages, stages, sys);
    for (const s of stages) {
      const st = L.stageOf(sys, s);
      assert.ok(st.words && st.label, `${sys} ${s}`);
      assert.equal(!!st.dx, s !== '0', `${sys} ${s} dx`);
    }
    for (const s of stages) assert.ok(L.ALL_STAGES.includes(s), `${s} in ALL_STAGES`);
  }
  assert.equal(L.stageOf('Ishak', '3').label, 'Ishak stage 3/6');
  assert.equal(L.stageOf('METAVIR', '3').label, 'METAVIR F3');
  assert.equal(L.stageOf('NASH CRN', '1c').label, 'NASH CRN stage 1c');
  assert.equal(L.stageOf('Batts-Ludwig', '2').label, 'Batts-Ludwig stage 2/4');
  assert.deepEqual(['Ishak 5', 'Ishak 6', 'METAVIR 4', 'NASH CRN 4', 'Batts-Ludwig 4'].map((x) => {
    const [sys, s] = [x.slice(0, x.lastIndexOf(' ')), x.slice(x.lastIndexOf(' ') + 1)];
    return L.stageOf(sys, s).cirrhotic;
  }), [false, true, true, true, true], 'Ishak 5 is incomplete cirrhosis');
  assert.equal(L.stageOf('Ishak', '7'), null);
  assert.equal(L.stageOf('METAVIR', '5'), null);
  assert.equal(L.stageOf('NASH CRN', '1'), null, 'NASH CRN stage 1 is written 1a, 1b or 1c');
  assert.equal(L.stageOf('', '2'), null);
});

test('stageIssues: a stage without a system warns; a stage the system does not have is an error', () => {
  assert.deepEqual(L.stageIssues('Ishak', ''), []);
  assert.deepEqual(L.stageIssues('', ''), []);
  assert.deepEqual(L.stageIssues('Ishak', '6'), []);
  assert.equal(L.stageIssues('', '3')[0].level, 'warn');
  assert.equal(L.stageIssues('METAVIR', '6')[0].level, 'error');
  assert.equal(L.stageIssues('Batts-Ludwig', '1a')[0].level, 'error');
  assert.equal(L.stageIssues('Scheuer', '2')[0].level, 'error');
});

test('adequacy by total core length: over 20 mm good, 10-20 mm compromised, under 10 mm inadequate', () => {
  const cases = [['25', 'Good'], ['20.5', 'Good'], ['20', 'Compromised'], ['10', 'Compromised'], ['9.9', 'Inadequate'], ['1', 'Inadequate']];
  for (const [mm, tier] of cases) assert.equal(L.adequacyOf(mm), tier, `${mm} mm`);
  for (const v of ['', '0', '-3', 'long']) assert.equal(L.adequacyOf(v), null, v);
  assert.equal(L.FEW_PORTAL_TRACTS, 10);
});
