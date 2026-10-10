// HER2 DISH calculator (user request 2026-10-08): generators/dish_calculator.js, the `derive` hook on the
// standalone HER2 ISH template and its Checks. Group boundaries are the ASCO/CAP 2018 table; the
// Group 2-4 results follow the CAP HER2 2023 algorithm; the arithmetic follows the QMH calculator page
// (docs/reference/Biomarker-DISH-calculator.html).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate, applyDerived } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import {
  tally, signal, ishGroup, needsIhc, dishResult, groupOfOption, deriveDish, calculatorView,
  GROUPED_RESULTS, GROUP_RULES, MIN_NUCLEI, IHC_SCORES
} from '../generators/dish_calculator.js';

const registry = await loadAll();
const { schema, generator } = registry.breast_biomarkers;

/** Pairs from two lists of numbers: counts([2, 3], [2, 2]) -> [['2', '2'], ['3', '2']]. */
const counts = (her2, cep17) => her2.map((h, i) => [String(h), String(cep17[i])]);
const repeat = (n, h, c) => counts(Array(n).fill(h), Array(n).fill(c));

// The QMH page's doSums('mean'), transcribed: each average is the sum over 20 nuclei / 20 with
// toFixed(2), and the ratio is the two printed averages divided, toFixed(2).
function qmh(her2, cep17) {
  const h = (her2.reduce((a, b) => a + b, 0) / 20).toFixed(2);
  const c = (cep17.reduce((a, b) => a + b, 0) / 20).toFixed(2);
  return { her2: h, cep17: c, ratio: (h / c).toFixed(2) };
}

test('the calculator field and the IHC score sit before the result on the HER2 ISH form', () => {
  const ids = schema.fields.map((f) => f.id);
  // The paraffin block (2026-10-08) belongs to the specimen line, so it sits with the site fields.
  assert.deepEqual(ids.slice(0, 6), ['site', 'siteDetail', 'blockNo', 'dishCounts', 'dishIhc', 'her2Dish']);
  const calc = schema.fields.find((f) => f.id === 'dishCounts');
  assert.equal(calc.type, 'dishCounter');
  assert.deepEqual(calc.default, []);
  assert.deepEqual(schema.fields.find((f) => f.id === 'dishIhc').options, ['', ...IHC_SCORES]);
  // Every result the calculator can write is one of the template's own options.
  const options = schema.fields.find((f) => f.id === 'her2Dish').options;
  for (const r of GROUPED_RESULTS) assert.ok(options.includes(r), r);
  assert.equal(typeof generator.derive, 'function');
});

test('signals are whole numbers; blank is not counted yet', () => {
  assert.equal(signal(''), null);
  assert.equal(signal('  '), null);
  assert.equal(signal('0'), 0);
  assert.equal(signal(' 12 '), 12);
  assert.ok(Number.isNaN(signal('2.5')));
  assert.ok(Number.isNaN(signal('-1')));
  assert.ok(Number.isNaN(signal('x')));
});

test('twenty nuclei give the averages and ratio the QMH calculator gives', () => {
  const h = [2, 3, 2, 2, 1, 2, 3, 2, 2, 2, 1, 2, 2, 3, 2, 2, 2, 1, 2, 2];
  const c = [2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2];
  const t = tally(counts(h, c));
  assert.equal(t.cells, 20);
  assert.equal(t.her2Total, 40);
  assert.equal(t.cep17Total, 38);
  assert.deepEqual([t.her2Text, t.cep17Text, t.ratioText], ['2.00', '1.90', '1.05']);
  const q = qmh(h, c);
  assert.deepEqual([t.her2Text, t.cep17Text, t.ratioText], [q.her2, q.cep17, q.ratio]);
});

// A deterministic sweep over plausible counts. With 20 nuclei the averages are exact, so the two can
// only part at an exact tie in the ratio's third decimal, which the QMH page's toFixed() rounds either
// way on binary floating point; here an exact tie rounds up.
test('agrees with the QMH arithmetic on 2,000 random 20-nucleus counts, exact ties aside', () => {
  let seed = 20261008;
  const rand = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  let ties = 0;
  for (let run = 0; run < 2000; run++) {
    const amplified = rand(3);
    const h = Array.from({ length: 20 }, () => 1 + rand(amplified === 2 ? 14 : amplified ? 7 : 4));
    const c = Array.from({ length: 20 }, () => 1 + rand(4));
    const t = tally(counts(h, c));
    const q = qmh(h, c);
    assert.equal(t.her2Text, q.her2);
    assert.equal(t.cep17Text, q.cep17);
    const sumH = h.reduce((a, b) => a + b, 0) * 5;  // the averages in hundredths
    const sumC = c.reduce((a, b) => a + b, 0) * 5;
    const tie = (sumH * 200) % sumC === 0 && ((sumH * 200) / sumC) % 2 === 1;
    if (tie) { ties += 1; continue; }
    assert.equal(t.ratioText, q.ratio, `HER2 ${h.join(',')} / CEP17 ${c.join(',')}`);
  }
  assert.ok(ties < 200, `${ties} ties`);
});

test('an exact tie in the ratio rounds half up', () => {
  // HER2 51 and CEP17 40 signals over 20 nuclei: 2.55 / 2.00 = 1.275 exactly. The QMH page prints 1.27
  // (2.55 is stored just under itself in binary); decimal rounding gives 1.28.
  const her2 = [...Array(11).fill(3), ...Array(9).fill(2)];
  const t = tally(counts(her2, Array(20).fill(2)));
  assert.equal(t.her2Total, 51);
  assert.equal(t.cep17Total, 40);
  assert.deepEqual([t.her2Text, t.cep17Text, t.ratioText], ['2.55', '2.00', '1.28']);
  assert.equal(qmh(her2, Array(20).fill(2)).ratio, '1.27');
});

test('more than 20 nuclei are averaged over every complete nucleus', () => {
  const t = tally([...repeat(20, 2, 2), ...repeat(10, 5, 2)]);
  assert.equal(t.cells, 30);
  assert.deepEqual([t.her2Text, t.cep17Text, t.ratioText], ['3.00', '2.00', '1.50']);
  // 81 signals over 40 nuclei is 2.025 exactly: half up to 2.03.
  const u = tally([...repeat(39, 2, 2), ['3', '2']]);
  assert.equal(u.her2Text, '2.03');
});

test('a nucleus with one count or a non-number is left out and named', () => {
  const rows = repeat(20, 2, 2);
  rows[3] = ['2', ''];
  rows[7] = ['2.5', '2'];
  rows[25] = ['', ''];
  const t = tally(rows);
  assert.equal(t.cells, 18);
  assert.deepEqual(t.partial, [3]);
  assert.deepEqual(t.invalid, [7]);
  assert.equal(tally([]).entered, false);
  assert.equal(tally(repeat(20, '', '')).entered, false);
  assert.equal(tally(undefined).cells, 0);
  // No CEP17 signal at all: averages, but no ratio.
  const z = tally(repeat(20, 2, 0));
  assert.deepEqual([z.her2Text, z.cep17Text, z.ratioText], ['2.00', '0.00', '']);
});

test('ASCO/CAP groups, at their boundaries', () => {
  assert.equal(ishGroup(2.0, 4.0), 1);
  assert.equal(ishGroup(2.0, 3.99), 2);
  assert.equal(ishGroup(1.99, 6.0), 3);
  assert.equal(ishGroup(1.99, 5.99), 4);
  assert.equal(ishGroup(1.99, 4.0), 4);
  assert.equal(ishGroup(1.99, 3.99), 5);
  assert.equal(ishGroup(0.71, 1.35), 5);
  assert.equal(ishGroup(NaN, 2), null);
  assert.equal(ishGroup(2, undefined), null);
  assert.deepEqual([1, 2, 3, 4, 5].map(needsIhc), [false, true, true, true, false]);
  assert.deepEqual(Object.keys(GROUP_RULES), ['1', '2', '3', '4', '5']);
});

// CAP HER2 2023 algorithm: Group 2 and 4 positive only with IHC 3+; Group 3 positive with 2+ or 3+.
test('Groups 2-4 take their result from the concurrent IHC score', () => {
  const table = [1, 2, 3, 4, 5].map((g) => ['', ...IHC_SCORES].map((s) => dishResult(g, s)));
  assert.deepEqual(table, [
    Array(5).fill('Positive (amplified, Group 1 result in greater than 10% of cell population)'),
    ['', 'Negative, Group 2 ISH result (with IHC 0-2+)', 'Negative, Group 2 ISH result (with IHC 0-2+)', 'Negative, Group 2 ISH result (with IHC 0-2+)', 'Positive, Group 2 ISH result (with IHC 3+)'],
    ['', 'Negative, Group 3 ISH result (with IHC 0-1+)', 'Negative, Group 3 ISH result (with IHC 0-1+)', 'Positive, Group 3 ISH result (with IHC 2-3+)', 'Positive, Group 3 ISH result (with IHC 2-3+)'],
    ['', 'Negative, Group 4 ISH result (with IHC 0-2+)', 'Negative, Group 4 ISH result (with IHC 0-2+)', 'Negative, Group 4 ISH result (with IHC 0-2+)', 'Positive, Group 4 ISH result (with IHC 3+)'],
    Array(5).fill('Negative (not amplified, Group 5 result)')
  ]);
  assert.equal(dishResult(null, '3+'), '');
  assert.equal(dishResult(2, 'Score 3+'), '');
  assert.equal(groupOfOption('Negative, Group 4 ISH result (with IHC 0-2+)'), 4);
  assert.equal(groupOfOption('Cannot be determined'), null);
});

test('editing the counts fills the numbers, and the result once 20 nuclei are counted', () => {
  const v = { her2Dish: '', dishIhc: '', dishCounts: repeat(12, 2, 2) };
  assert.deepEqual(deriveDish(v, 'dishCounts'), { dishCells: '12', dishHer2: '2.00', dishCep17: '2.00', dishRatio: '1.00' });
  v.dishCounts = repeat(20, 2, 2);
  assert.deepEqual(deriveDish(v, 'dishCounts'), {
    dishCells: '20', dishHer2: '2.00', dishCep17: '2.00', dishRatio: '1.00', her2Dish: 'Negative (not amplified, Group 5 result)'
  });
  // Group 1 needs no IHC.
  assert.equal(deriveDish({ dishCounts: repeat(20, 9, 2) }, 'dishCounts').her2Dish,
    'Positive (amplified, Group 1 result in greater than 10% of cell population)');
  // Any other field changes nothing.
  assert.deepEqual(deriveDish(v, 'dishHer2'), {});
  assert.deepEqual(deriveDish(v, 'site'), {});
});

test('Groups 2-4 wait for the IHC score, then follow it', () => {
  const g3 = repeat(20, 7, 4);  // 7.00 / 4.00 = 1.75 with 7 signals: Group 3
  const v = { her2Dish: '', dishIhc: '', dishCounts: g3 };
  assert.equal(deriveDish(v, 'dishCounts').her2Dish, undefined);
  for (const [score, result] of [['1+', 'Negative, Group 3 ISH result (with IHC 0-1+)'], ['2+', 'Positive, Group 3 ISH result (with IHC 2-3+)']]) {
    v.dishIhc = score;
    assert.equal(deriveDish(v, 'dishIhc').her2Dish, result);
  }
  // Taking the score away again clears the grouped result the counts no longer support.
  assert.equal(deriveDish({ ...v, dishIhc: '', her2Dish: 'Positive, Group 3 ISH result (with IHC 2-3+)' }, 'dishIhc').her2Dish, '');
});

test('fewer than 20 nuclei, or no counts, clear a grouped result but leave an ungrouped choice alone', () => {
  const g5 = 'Negative (not amplified, Group 5 result)';
  assert.equal(deriveDish({ her2Dish: g5, dishCounts: repeat(19, 2, 2) }, 'dishCounts').her2Dish, '');
  const cleared = deriveDish({ her2Dish: g5, dishCounts: [] }, 'dishCounts');
  assert.deepEqual(cleared, { dishCells: '', dishHer2: '', dishCep17: '', dishRatio: '', her2Dish: '' });
  assert.equal(deriveDish({ her2Dish: 'Cannot be determined', dishCounts: repeat(5, 2, 2) }, 'dishCounts').her2Dish, undefined);
  // ...until the counts give a group: the counted nuclei decide.
  assert.equal(deriveDish({ her2Dish: 'Cannot be determined', dishCounts: repeat(20, 2, 2) }, 'dishCounts').her2Dish, g5);
});

test('with nothing counted, the IHC score reads the typed averages and ratio', () => {
  const typed = { dishCounts: [], dishHer2: '3.5', dishCep17: '1.6', dishRatio: '2.19', her2Dish: '' };
  assert.deepEqual(deriveDish({ ...typed, dishIhc: '3+' }, 'dishIhc'), { her2Dish: 'Positive, Group 2 ISH result (with IHC 3+)' });
  assert.deepEqual(deriveDish({ ...typed, dishIhc: '2+' }, 'dishIhc'), { her2Dish: 'Negative, Group 2 ISH result (with IHC 0-2+)' });
  // No numbers typed: a hand-picked result stays.
  assert.deepEqual(deriveDish({ dishCounts: [], dishIhc: '3+', her2Dish: 'Positive (HER2 gene is amplified)' }, 'dishIhc'), {});
});

test('the panel view walks empty, counting, needs-IHC and done', () => {
  assert.equal(calculatorView({}).state, 'empty');
  const counting = calculatorView({ dishCounts: repeat(8, 2, 2) });
  assert.deepEqual([counting.state, counting.cells, counting.group], ['counting', 8, 5]);
  assert.equal(calculatorView({ dishCounts: repeat(20, 2, 0) }).state, 'no-ratio');
  const g4 = calculatorView({ dishCounts: repeat(20, 5, 3) });  // 5.00 / 3.00 = 1.67: Group 4
  assert.deepEqual([g4.state, g4.group, g4.result], ['needs-ihc', 4, '']);
  const done = calculatorView({ dishCounts: repeat(20, 5, 3), dishIhc: '2+' });
  assert.deepEqual([done.state, done.result, done.recount], ['done', 'Negative, Group 4 ISH result (with IHC 0-2+)', true]);
  assert.equal(calculatorView({ dishCounts: repeat(20, 5, 3), dishIhc: '3+' }).recount, false);
  assert.equal(MIN_NUCLEI, 20);
});

/** A case driven the way the form drives it: each edit, then the derive hook. */
function edit(values, steps) {
  const cs = createCase(schema, 1);
  const part = cs.parts[0];
  Object.assign(part.values, values);
  for (const [id, value] of steps) { part.values[id] = value; applyDerived(generator, part, id); }
  return { cs, part, out: generate(schema, generator, cs) };
}

test('applyDerived writes the patch through the generator and returns what changed', () => {
  const cs = createCase(schema, 1);
  const part = cs.parts[0];
  part.values.dishCounts = repeat(20, 2, 2);
  assert.deepEqual(applyDerived(generator, part, 'dishCounts'), ['dishCells', 'dishHer2', 'dishCep17', 'dishRatio', 'her2Dish']);
  assert.deepEqual(applyDerived(generator, part, 'dishCounts'), []);
  assert.deepEqual(applyDerived({}, part, 'dishCounts'), []);
  assert.deepEqual(applyDerived(null, part, 'dishCounts'), []);
});

test('counted nuclei print as the report lines, with the method in the comment', () => {
  const h = [2, 3, 2, 2, 1, 2, 3, 2, 2, 2, 1, 2, 2, 3, 2, 2, 2, 1, 2, 2];
  const c = [2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2];
  const { out } = edit({ site: 'Breast', siteDetail: 'left mastectomy' }, [['dishCounts', counts(h, c)]]);
  // Since 2026-10-08 the result lines are the Molecular findings and the diagnosis is one line.
  assert.equal(out.diagnosis, 'Breast, left mastectomy, for HER-2 DISH test - NEGATIVE for HER2 amplification');
  assert.equal(out.molecular, [
    '- HER2 DISH : Negative (not amplified, Group 5 result)',
    '  - Number of tumour cell counted : 20',
    '  - Average number of HER2 signals (black) per cell : 2.00',
    '  - Average number of CEP17 signals (red) per cell : 1.90',
    '  - HER2/CEP17 ratio : 1.05'
  ].join('\n'));
  assert.ok(out.comment.includes('Ventana INFORM HER2 Dual ISH DNA Probe Cocktail Assay'));
  assert.deepEqual(out.issues, []);
});

test('a Group 4 count with IHC 3+ prints the positive Group 4 result and its comment', () => {
  const { out } = edit({ site: 'Breast' }, [['dishCounts', repeat(20, 5, 3)], ['dishIhc', '3+']]);
  assert.ok(out.molecular.startsWith('- HER2 DISH : Positive, Group 4 ISH result (with IHC 3+)\n  - Number of tumour cell counted : 20'));
  assert.equal(out.diagnosis, 'Breast, for HER-2 DISH test - POSITIVE for HER2, based on IHC and ISH results (Group 4 ISH result with IHC 3+); see comment');
  assert.ok(out.comment.includes('This sample has a Group 4 result'));
  assert.ok(out.comment.includes('may be eligible for several therapies that disrupt HER2 signalling pathways'));
  assert.deepEqual(out.issues, []);
});

test('Checks while counting and after', () => {
  const messages = (values) => edit({ site: 'Breast' }, Object.entries(values)).out.issues.map((i) => `${i.level}: ${i.message}`);
  // Part-way: one reference line, and the nucleus being typed is not flagged.
  const typing = repeat(12, 2, 2);
  typing.push(['3', '']);
  assert.deepEqual(messages({ dishCounts: typing }), ['info: 12 of 20 nuclei counted; the result is filled in once at least 20 are counted.']);
  // An earlier nucleus with one count, and a non-number, are named.
  const gaps = repeat(22, 2, 2);
  gaps[4] = ['2', ''];
  gaps[9] = ['two', '2'];
  assert.deepEqual(messages({ dishCounts: gaps }), [
    'warn: Nucleus 5: only one of the two counts is entered, so it is left out of the averages.',
    'warn: Nucleus 10: counts must be whole numbers of signals, so it is left out of the averages.'
  ]);
  // A Group 3 count waiting for its IHC score.
  assert.deepEqual(messages({ dishCounts: repeat(20, 7, 4) }), [
    'info: The numbers read as Group 3 (ratio < 2.0, >= 6.0 HER2 signals per cell): choose the concurrent HER2 IHC score and the result is filled in.'
  ]);
  // IHC 2+ in Groups 2-4: the blinded recount.
  const recount = messages({ dishCounts: repeat(20, 5, 3), dishIhc: '2+' });
  assert.equal(recount.length, 1);
  assert.match(recount[0], /^info: Group 4 with IHC 2\+: ASCO\/CAP asks for a recount of at least 20 nuclei, including the IHC 2\+ area, by a second observer blinded/);
  // No CEP17 signal.
  assert.ok(messages({ dishCounts: repeat(20, 2, 0) }).includes('warn: No CEP17 signals are counted, so there is no ratio.'));
});

test('Checks on a result chosen or numbers typed over the calculator', () => {
  const issues = (values, steps = []) => edit({ site: 'Breast', ...values }, steps).out.issues;
  // A ratio typed over the calculator's: named, and it now contradicts the Group 5 result too.
  const typedOver = issues({}, [['dishCounts', repeat(20, 2, 2)], ['dishRatio', '2.20']]);
  assert.deepEqual(typedOver.filter((i) => i.field === 'dishRatio').map((i) => i.message), ['The ratio typed (2.20) differs from the calculator (1.00).']);
  // A result chosen by hand on 15 nuclei.
  const short = issues({ her2Dish: 'Negative (not amplified, Group 5 result)', dishCounts: repeat(15, 2, 2), dishCells: '15', dishHer2: '2.00', dishCep17: '2.00', dishRatio: '1.00' });
  assert.deepEqual(short.map((i) => i.message), ['Only 15 nuclei are counted; ASCO/CAP asks for at least 20.']);
  // The IHC score disagrees with the Group 2 option chosen.
  const wrongIhc = issues({ her2Dish: 'Negative, Group 2 ISH result (with IHC 0-2+)', dishIhc: '3+', dishHer2: '3.5', dishCep17: '1.6', dishRatio: '2.19' });
  assert.deepEqual(wrongIhc.map((i) => [i.level, i.field, i.message]), [
    ['warn', 'her2Dish', 'With IHC 3+, a Group 2 result reads "Positive, Group 2 ISH result (with IHC 3+)".']
  ]);
  // Discordant pairs are a reference line.
  const discordant = issues({ her2Dish: 'Negative (not amplified, Group 5 result)', dishIhc: '3+', dishHer2: '2', dishCep17: '2', dishRatio: '1' });
  assert.deepEqual(discordant.map((i) => i.message), ['IHC 3+ with a Group 5 ISH result: the two tests disagree; review both before sign-out.']);
  // Nothing counted and no IHC: the checks are the ones the template always had.
  assert.deepEqual(issues({ her2Dish: 'Negative (not amplified, Group 5 result)', dishHer2: '1.35', dishCep17: '1.9', dishRatio: '0.71' }), []);
});
