// Endometrial biopsy: dated secretory phases (user 2026-09-25).
// Interval, early, mid- and late secretory sit under Secretory in the Background endometrium
// list. The diagnosis lines follow the released house wording (INTERVAL ENDOMETRIUM, never
// "interval phase"; MID-SECRETORY hyphenated), and undated Secretory is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';

const registry = await loadAll();
const { schema, generator } = registry.endometrial_biopsy;
const phaseOptions = schema.fields.find((f) => f.id === 'phase').options;

function run(values) {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, specimenType: 'Endometrial curettings', ...values };
  return generate(schema, generator, c);
}

const DATED = [
  ['Interval', 'INTERVAL ENDOMETRIUM', /scattered subnuclear vacuoles, in keeping with interval endometrium\. The gland to stromal ratio is within normal limits\./],
  ['Early secretory', 'EARLY SECRETORY ENDOMETRIUM', /uniform subnuclear vacuoles with rare mitoses, in keeping with early secretory endometrium\./],
  ['Mid-secretory', 'MID-SECRETORY ENDOMETRIUM', /luminal secretions, and the stroma is oedematous, in keeping with mid-secretory endometrium\./],
  ['Late secretory', 'LATE SECRETORY ENDOMETRIUM', /predecidual change around the spiral arterioles, in keeping with late secretory endometrium\./]
];

test('the four dated phases follow Secretory, in cycle order', () => {
  const i = phaseOptions.indexOf('Secretory');
  assert.deepEqual(phaseOptions.slice(i, i + 5), ['Secretory', 'Interval', 'Early secretory', 'Mid-secretory', 'Late secretory']);
});

for (const [phase, dx, micro] of DATED) {
  test(`${phase}: diagnosis line and microscopy`, () => {
    const out = run({ phase });
    assert.equal(out.diagnosis, `ENDOMETRIUM, curettings - ${dx}; no evidence of hyperplasia or malignancy`);
    assert.match(out.microscopy, micro);
  });
}

test('undated Secretory is unchanged', () => {
  const out = run({ phase: 'Secretory' });
  assert.equal(out.diagnosis, 'ENDOMETRIUM, curettings - SECRETORY ENDOMETRIUM; no evidence of hyperplasia or malignancy');
  assert.match(out.microscopy, /secretory vacuoles and luminal secretions, and the stroma is oedematous, in keeping with secretory endometrium\./);
});

test('every Background endometrium option has its own diagnosis line', () => {
  for (const phase of phaseOptions.filter((o) => !/^(Not assessable|Gestational)/.test(o))) {
    assert.doesNotMatch(run({ phase }).diagnosis, /BENIGN ENDOMETRIUM/, phase);
  }
});

test('a dated phase prints as the background to a polyp', () => {
  assert.equal(
    run({ phase: 'Mid-secretory', polyp: 'Present' }).diagnosis,
    'ENDOMETRIUM, curettings - ENDOMETRIAL POLYP; background mid-secretory endometrium; no evidence of hyperplasia or malignancy'
  );
});

test('under a carcinoma, the background sentence reads for every dated phase', () => {
  const bg = (phase) => run({ phase, carcinoma: 'Endometrioid carcinoma' }).microscopy.match(/The background endometrium is [^.]+\./)[0];
  assert.equal(bg('Interval'), 'The background endometrium is in the interval phase.');
  assert.equal(bg('Early secretory'), 'The background endometrium is early secretory.');
  assert.equal(bg('Mid-secretory'), 'The background endometrium is mid-secretory.');
  assert.equal(bg('Late secretory'), 'The background endometrium is late secretory.');
});
