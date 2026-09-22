// Standalone breast HER2 dual-ISH report. Card: docs/roadmap.md, pulled into Now 2026-09-22.
// Fixtures: tests/fixtures/breast_ish/*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { biomarkerFields, biomarkerReport, BIOMARKER_FIELD_MAP } from '../generators/breast_biomarkers.js';
import { britishise } from '../src/style.js';

const registry = await loadAll();
const { schema, generator } = registry.breast_biomarkers;
const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'breast_ish');
const UPDATE = process.argv.includes('--update');

function ishCase(values) {
  const cs = createCase(schema, 1);
  Object.assign(cs.parts[0].values, values);
  return generate(schema, generator, cs);
}

const GROUP5 = {
  site: 'Breast', siteDetail: 'left mastectomy',
  her2Dish: 'Negative (not amplified, Group 5 result)',
  dishCells: '20', dishHer2: '1.35', dishCep17: '1.9', dishRatio: '0.71'
};

test('standalone HER2 ISH template is registered under the Biomarkers system', () => {
  assert.equal(schema.generator, 'breast_ish');
  assert.equal(schema.kind, 'biomarker');
  assert.equal(schema.system, 'Biomarkers');
  assert.equal(schema.style.british, true);
  assert.equal(schema.maxParts, 1);
  // No macro hook: the section comes from a block reported under an earlier accession.
  assert.equal(generator.macro, undefined);
  assert.equal(generator.microscopy({ values: GROUP5 }), '');
});

// The ISH fields must stay identical to the shared block's own definitions, or the standalone
// report and the three breast synoptics would drift apart field by field. Same guard as the
// breast_biopsy test, restricted to the ISH subset this template carries.
test('ISH fields are exactly the shared block definitions, minus showIf', () => {
  const ISH = ['her2Dish', 'dishCells', 'dishHer2', 'dishCep17', 'dishRatio', 'dishPctAmp',
    'dishAneusomy', 'dishHeteroSignals', 'coldIschemia', 'fixationTime', 'testType', 'bmNotes'];
  const expected = biomarkerFields(undefined)
    .filter((f) => ISH.includes(f.id))
    .map(({ showIf, ...rest }) => rest);
  const inSchema = schema.fields.filter((f) => Object.values(BIOMARKER_FIELD_MAP).includes(f.id));
  assert.deepEqual(inSchema, expected);
  assert.equal(inSchema.length, 12);
});

// Dropping ER / PR / IHC / Ki67 from the schema is what makes this an ISH-only report; the shared
// generator prints only what is filled, so no edit to it was needed. If any of those ids ever
// appear here the report would grow an ER line and its method sentence.
test('no ER, PR, HER2 IHC or Ki67 field is carried', () => {
  for (const id of ['er', 'erIntensity', 'erNuclei', 'pr', 'prIntensity', 'prNuclei', 'her2Ihc', 'her2Score', 'her2Hetero', 'ki67']) {
    assert.ok(!schema.fields.some((f) => f.id === id), `${id} must not be in the standalone schema`);
  }
  const out = ishCase(GROUP5);
  assert.ok(!/strogen|rogesterone|Ki67|assessed by IHC technique/.test(out.report));
});

test('the block is reproduced unchanged, only respelled', () => {
  const out = ishCase(GROUP5);
  assert.equal(out.diagnosis, britishise(biomarkerReport(GROUP5).replace(/\n+$/, '')));
  assert.ok(out.diagnosis.startsWith('- HER2 DISH : Negative (not amplified, Group 5 result)'));
  assert.ok(out.diagnosis.includes('  - Average number of CEP17 signals (red) per cell : 1.9'));
  assert.ok(out.diagnosis.includes('HER2 Dual ISH was performed on formalin-fixed paraffin embedded section with the Ventana INFORM HER2 Dual ISH DNA Probe Cocktail Assay'));
});

test('specimen line is sentence case and names the test', () => {
  assert.equal(ishCase(GROUP5).specimens, 'Breast, left mastectomy, HER2 dual in-situ hybridisation');
  assert.equal(ishCase({ site: 'Lymph node', her2Dish: 'Cannot be determined' }).specimens,
    'Lymph node, HER2 dual in-situ hybridisation');
  assert.equal(ishCase({ site: 'Other', siteDetail: 'Chest wall nodule', her2Dish: 'Cannot be determined' }).specimens,
    'Chest wall nodule, HER2 dual in-situ hybridisation');
});

test('nothing prints until the ISH result is chosen', () => {
  const out = ishCase({ site: 'Breast', dishHer2: '2.0' });
  assert.equal(out.diagnosis, '');
  assert.deepEqual(out.issues.map((i) => i.level), ['info']);
});

// Measured on the 18 standalone HER2 requests in the 2024-2026 export: one was reported as
// "Cannot be determined despite repeated testing", with the FISH follow-up promised in the text.
test('cannot be determined auto-ticks the FISH follow-up snippet', () => {
  const out = ishCase({ site: 'Breast', her2Dish: 'Cannot be determined' });
  assert.equal(out.comment, 'HER2 FISH will be attempted; the results will be issued in a separate report.');
  assert.ok(!ishCase(GROUP5).comment.includes('HER2 FISH will be attempted'));
});

// ASCO/CAP 2018 group boundaries, taken from the interpretive paragraphs the block itself prints:
// G1 ratio >= 2 and HER2 >= 4; G2 ratio >= 2 and HER2 < 4; G3 ratio < 2 and HER2 >= 6;
// G4 ratio < 2 and 4 <= HER2 < 6; G5 ratio < 2 and HER2 < 4.
test('the chosen Group is checked against the numbers typed above it', () => {
  const warn = (v) => ishCase({ site: 'Breast', ...v }).issues.filter((i) => i.level === 'warn').map((i) => i.message);
  assert.deepEqual(warn({ her2Dish: 'Positive, Group 2 ISH result (with IHC 3+)', dishHer2: '3.5', dishCep17: '1.6', dishRatio: '2.19' }), []);
  assert.deepEqual(warn({ her2Dish: 'Negative, Group 3 ISH result (with IHC 0-1+)', dishHer2: '6.5', dishCep17: '3.5', dishRatio: '1.86' }), []);
  assert.deepEqual(warn({ her2Dish: 'Negative, Group 4 ISH result (with IHC 0-2+)', dishHer2: '4.8', dishCep17: '2.6', dishRatio: '1.85' }), []);
  assert.deepEqual(warn({ her2Dish: 'Negative (not amplified, Group 5 result)', dishHer2: '1.35', dishCep17: '1.9', dishRatio: '0.71' }), []);

  const mismatch = warn({ her2Dish: 'Negative (not amplified, Group 5 result)', dishHer2: '6.4', dishCep17: '1.9', dishRatio: '3.37' });
  assert.equal(mismatch.length, 1);
  assert.match(mismatch[0], /read as a Group 1 result, not Group 5/);

  // Group 1 is the amplified branch: ratio >= 2.0 with >= 4.0 signals.
  assert.deepEqual(warn({ her2Dish: 'Positive (amplified, Group 1 result in greater than 10% of cell population)', dishHer2: '6.4', dishCep17: '1.9', dishRatio: '3.37' }), []);
  // Boundary: exactly 4.0 signals at ratio 2.1 is Group 1, not Group 2.
  assert.deepEqual(warn({ her2Dish: 'Positive (amplified, Group 1 result in greater than 10% of cell population)', dishHer2: '4.0', dishCep17: '1.9', dishRatio: '2.1' }), []);
  assert.match(warn({ her2Dish: 'Positive, Group 2 ISH result (with IHC 3+)', dishHer2: '4.0', dishCep17: '1.9', dishRatio: '2.1' })[0], /Group 1 result, not Group 2/);
  // Boundary: 4.0 signals at ratio 1.9 is Group 4, not Group 5.
  assert.match(warn({ her2Dish: 'Negative (not amplified, Group 5 result)', dishHer2: '4.0', dishCep17: '2.1', dishRatio: '1.9' })[0], /Group 4 result, not Group 5/);
  // ... and just under it, 3.5 signals at ratio 1.5 is Group 5, not Group 4.
  assert.deepEqual(warn({ her2Dish: 'Negative (not amplified, Group 5 result)', dishHer2: '3.5', dishCep17: '2.3', dishRatio: '1.52' }), []);
  // Boundary: 6.0 signals at ratio 1.9 is Group 3, not Group 4.
  assert.match(warn({ her2Dish: 'Negative, Group 4 ISH result (with IHC 0-2+)', dishHer2: '6.0', dishCep17: '3.2', dishRatio: '1.9' })[0], /Group 3 result, not Group 4/);

  // The ungrouped options are checked for direction only.
  assert.match(warn({ her2Dish: 'Positive (HER2 gene is amplified)', dishHer2: '2.0', dishCep17: '2.0', dishRatio: '1.0' })[0], /positive result is selected/);
  assert.match(warn({ her2Dish: 'Negative (HER2 gene is not amplified)', dishHer2: '8.0', dishCep17: '2.0', dishRatio: '4.0' })[0], /negative result is selected/);
});

test('missing signal counts are flagged, but not on an uninterpretable test', () => {
  const determined = ishCase({ site: 'Breast', her2Dish: 'Negative (HER2 gene is not amplified)' });
  assert.equal(determined.issues.filter((i) => i.level === 'warn').length, 3);
  assert.deepEqual(ishCase({ site: 'Breast', her2Dish: 'Cannot be determined' }).issues, []);
});

// The Group 2 comment is the only place "randomized" reaches a printed report, and no fixture
// selects a Group 2 result, which is why the 2026-09-22 spelling pass missed it.
test('the Group 2 comment prints British spelling throughout', () => {
  const out = ishCase({ site: 'Breast', her2Dish: 'Positive, Group 2 ISH result (with IHC 3+)', dishHer2: '3.5', dishCep17: '1.6', dishRatio: '2.19' });
  assert.ok(out.diagnosis.includes('randomised to the trastuzumab arm'));
  assert.ok(!/randomized/.test(out.report));
  assert.ok(out.diagnosis.includes('disrupt HER2 signalling pathways'));
});

// The four shapes the 2024-2026 export actually contains, plus the uncertain-timing default.
const CASES = [
  ['01-group5-negative-uncertain-timings', GROUP5],
  ['02-group2-positive-optimal-timings', {
    site: 'Breast', siteDetail: 'right, core biopsy',
    her2Dish: 'Positive, Group 2 ISH result (with IHC 3+)',
    dishCells: '20', dishHer2: '3.5', dishCep17: '1.6', dishRatio: '2.19',
    coldIschemia: '35', fixationTime: '24'
  }],
  ['03-group1-positive-amplified', {
    site: 'Breast', siteDetail: 'left, 2 o\'clock, core biopsy',
    her2Dish: 'Positive (amplified, Group 1 result in greater than 10% of cell population)',
    dishCells: '20', dishHer2: '8.75', dishCep17: '2.05', dishRatio: '4.27',
    dishPctAmp: '90', coldIschemia: '20', fixationTime: '18'
  }],
  ['04-cannot-be-determined-fish-to-follow', {
    site: 'Lymph node', siteDetail: 'left axillary',
    her2Dish: 'Cannot be determined', fixationTime: '28.5'
  }],
  ['05-non-breast-site-liver-metastasis', {
    site: 'Other', siteDetail: 'Liver segment 8',
    her2Dish: 'Negative (HER2 gene is not amplified)',
    dishCells: '20', dishHer2: '2', dishCep17: '2', dishRatio: '1',
    coldIschemia: '75', fixationTime: '80'
  }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = ishCase(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'breast_biomarkers', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});

// Out-of-range pre-analytics print their own sub-item and suppress the "meets requirements" line.
test('cold ischaemia over 60 min and fixation over 72 hours are called out', () => {
  const out = ishCase(CASES[4][1]);
  assert.ok(out.diagnosis.includes('- Cold ischaemia time : 75 min'));
  assert.ok(!out.diagnosis.includes('- Meet requirements specified in the latest version of the ASCO/CAP guidelines.'));
});

test('pre-analytic timings drive the ASCO/CAP line as they do in the shared block', () => {
  const optimal = ishCase({ ...GROUP5, coldIschemia: '35', fixationTime: '24' });
  assert.ok(optimal.diagnosis.includes('- Cold ischaemia time : 35 min'));
  assert.ok(optimal.diagnosis.includes('- Meet requirements specified in the latest version of the ASCO/CAP guidelines.'));
  const blank = ishCase(GROUP5);
  assert.ok(blank.diagnosis.includes('- Cold ischaemic time is uncertain.'));
  assert.ok(blank.diagnosis.includes('please interpret the above results with caution.'));
});
