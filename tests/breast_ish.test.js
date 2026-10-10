// Standalone breast HER2 dual-ISH report. Card: docs/roadmap.md, pulled into Now 2026-09-22.
// Fixtures: tests/fixtures/breast_ish/*.json (golden; --update only after a deliberate change).
// 2026-10-08 (user request): the pre-analytic lines, the method sentence and the interpretive
// paragraphs moved from the DIAGNOSIS block to the COMMENT block; the calculator is tested in
// tests/dish_calculator.test.js. The same day (second request) the result lines moved on to their own
// MOLECULAR FINDINGS block, DIAGNOSIS became one line naming the specimen, the specimen line gained the
// paraffin block, and a pasted HER2 DISH request opens this form (src/intake.js, role her2_ish).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, generateCase } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { biomarkerFields, biomarkerReport, BIOMARKER_FIELD_MAP } from '../generators/breast_biomarkers.js';
import { britishise } from '../src/style.js';
import { splitBlock, verdict } from '../generators/breast_ish.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { loadManifest } from '../src/registry.js';
import { buildDocText } from '../src/docformat.js';
import { buildPayload } from '../src/lisbridge.js';

const registry = await loadAll();
const manifest = await loadManifest();
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
  assert.equal(typeof generator.molecular, 'function');
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

// Still the ported block, unedited: the result lines in MOLECULAR FINDINGS and the rest in COMMENT, so
// the two blocks joined by their blank line are the block exactly as the shared generator writes it.
test('the block is reproduced unchanged across Molecular findings and Comment, only respelled', () => {
  const out = ishCase(GROUP5);
  assert.equal(`${out.molecular}\n\n${out.comment}`, britishise(biomarkerReport(GROUP5).replace(/\n+$/, '')));
  assert.equal(out.molecular, [
    '- HER2 DISH : Negative (not amplified, Group 5 result)',
    '  - Number of tumour cell counted : 20',
    '  - Average number of HER2 signals (black) per cell : 1.35',
    '  - Average number of CEP17 signals (red) per cell : 1.9',
    '  - HER2/CEP17 ratio : 0.71'
  ].join('\n'));
  assert.ok(out.comment.startsWith('- Cold ischaemic time is uncertain.\n- Formalin fixation time is uncertain.'));
  assert.ok(out.comment.includes('HER2 Dual ISH was performed on formalin-fixed paraffin embedded section with the Ventana INFORM HER2 Dual ISH DNA Probe Cocktail Assay'));
});

// The user's own example, 2026-10-08: these lines were to print under the comment, not with the result.
test('pre-analytic lines and the method sentence print in the Comment, not with the result', () => {
  const cs = createCase(schema, 1);
  Object.assign(cs.parts[0].values, GROUP5, { coldIschemia: '2', fixationTime: '2' });
  cs.options = { ...cs.options, includeHeader: true };
  const out = generate(schema, generator, cs);
  assert.equal(out.comment, [
    '- Cold ischaemia time : 2 min',
    '  - Optimal (<= 60 min).',
    '- Fixation time in buffered formalin : 2 hours',
    '  - Inadequate fixation (<6 hours).',
    '- Given the suboptimal cold ischaemia time and/or suboptimal formalin fixation time, please interpret the above results with caution.',
    '',
    'HER2 Dual ISH was performed on formalin-fixed paraffin embedded section with the Ventana INFORM HER2 Dual ISH DNA Probe Cocktail Assay on an automated system, and was examined by a pathologist under light microscopy.'
  ].join('\n'));
  assert.ok(!/ischaemi|fixation|Ventana/i.test(out.molecular), out.molecular);
  assert.ok(!/ischaemi|fixation|Ventana/i.test(out.diagnosis), out.diagnosis);
  assert.equal(out.microscopy, '');
  // With headings: MOLECULAR FINDINGS carries the result, DIAGNOSIS the one line, and COMMENT opens on
  // the pre-analytic lines.
  assert.ok(out.report.includes('MOLECULAR FINDINGS:\n- HER2 DISH : Negative (not amplified, Group 5 result)\n'), out.report);
  assert.ok(out.report.includes('  - HER2/CEP17 ratio : 0.71\n\nDIAGNOSIS:\nBreast, left mastectomy, for HER-2 DISH test - NEGATIVE for HER2 amplification\n\nCOMMENT:\n- Cold ischaemia time : 2 min\n'), out.report);
  assert.ok(!/MICROSCOPIC/.test(out.report));
});

// The generated comment comes first; a snippet and the typed comment follow it, as on every template.
test('a typed comment follows the generated text', () => {
  const cs = createCase(schema, 1);
  Object.assign(cs.parts[0].values, GROUP5);
  cs.comment = 'Discussed with Dr Chan.';
  const out = generate(schema, generator, cs);
  assert.ok(out.comment.startsWith('- Cold ischaemic time is uncertain.'));
  assert.ok(out.comment.endsWith('light microscopy.\n\nDiscussed with Dr Chan.'), out.comment);
});

// The request's own wording (user example, 2026-10-08): the organ, the specimen as written, the
// paraffin block the section was cut from and the test.
test('specimen line is sentence case, names the paraffin block and the test', () => {
  assert.equal(ishCase(GROUP5).specimens, 'Breast, left mastectomy, for HER-2 DISH test.');
  assert.equal(ishCase({ site: 'Breast', siteDetail: "Left 8 o'clock, 2 cm FN, core biopsy", blockNo: '26BX-012345' }).specimens,
    "Breast, left 8 o'clock, 2 cm FN, core biopsy, paraffin block (26BX-012345), for HER-2 DISH test.");
  // Brackets typed with the number are not doubled.
  assert.equal(ishCase({ site: 'Breast', blockNo: '(26BX-012345)' }).specimens, 'Breast, paraffin block (26BX-012345), for HER-2 DISH test.');
  assert.equal(ishCase({ site: 'Lymph node', her2Dish: 'Cannot be determined' }).specimens, 'Lymph node, for HER-2 DISH test.');
  assert.equal(ishCase({ site: 'Other', siteDetail: 'Chest wall nodule', her2Dish: 'Cannot be determined' }).specimens,
    'Chest wall nodule, for HER-2 DISH test.');
});

test('nothing prints until the ISH result is chosen', () => {
  const out = ishCase({ site: 'Breast', dishHer2: '2.0' });
  assert.equal(out.molecular, '');
  assert.equal(out.diagnosis, '');
  assert.deepEqual(out.issues.map((i) => i.level), ['info']);
});

// The user's example, 2026-10-08, section for section (the request's "amplfication" spelt out).
test('the user example prints Specimen, Molecular findings, a one-line Diagnosis and Comment', () => {
  const cs = createCase(schema, 1);
  Object.assign(cs.parts[0].values, {
    site: 'Breast', siteDetail: "left 8 o'clock, 2 cm FN, core biopsy", blockNo: '26BX-012345',
    her2Dish: 'Negative (not amplified, Group 5 result)',
    dishCells: '20', dishHer2: '3.25', dishCep17: '2.30', dishRatio: '1.41', coldIschemia: '5', fixationTime: '32'
  });
  cs.options = { ...cs.options, includeHeader: true };
  const out = generate(schema, generator, cs);
  assert.equal(out.report, [
    'SPECIMEN:',
    "Breast, left 8 o'clock, 2 cm FN, core biopsy, paraffin block (26BX-012345), for HER-2 DISH test.",
    '',
    'MOLECULAR FINDINGS:',
    '- HER2 DISH : Negative (not amplified, Group 5 result)',
    '  - Number of tumour cell counted : 20',
    '  - Average number of HER2 signals (black) per cell : 3.25',
    '  - Average number of CEP17 signals (red) per cell : 2.30',
    '  - HER2/CEP17 ratio : 1.41',
    '',
    'DIAGNOSIS:',
    "Breast, left 8 o'clock, 2 cm FN, core biopsy, paraffin block (26BX-012345), for HER-2 DISH test - NEGATIVE for HER2 amplification",
    '',
    'COMMENT:',
    '- Cold ischaemia time : 5 min',
    '  - Optimal (<= 60 min).',
    '- Fixation time in buffered formalin : 32 hours',
    '  - Optimal fixation (6-72 hours).',
    '- Meet requirements specified in the latest version of the ASCO/CAP guidelines.',
    '',
    'HER2 Dual ISH was performed on formalin-fixed paraffin embedded section with the Ventana INFORM HER2 Dual ISH DNA Probe Cocktail Assay on an automated system, and was examined by a pathologist under light microscopy.'
  ].join('\n'));
  assert.deepEqual(out.issues, []);
});

// Group 1, Group 5 and the ungrouped results speak of amplification; Groups 2-4 are read with the IHC and
// take the CAP wording ("Positive / Negative, based on IHC and ISH results", Breast Biomarker 1.6.1.0),
// pointing to the interpretive paragraph the comment prints for them.
test('every result has its diagnosis verdict', () => {
  const expected = {
    'Cannot be determined': 'HER2 amplification status CANNOT BE DETERMINED; see comment',
    'Negative (HER2 gene is not amplified)': 'NEGATIVE for HER2 amplification',
    'Positive (HER2 gene is amplified)': 'POSITIVE for HER2 amplification',
    'Negative (not amplified, Group 5 result)': 'NEGATIVE for HER2 amplification',
    'Negative, Group 2 ISH result (with IHC 0-2+)': 'NEGATIVE for HER2, based on IHC and ISH results (Group 2 ISH result with IHC 0-2+); see comment',
    'Negative, Group 3 ISH result (with IHC 0-1+)': 'NEGATIVE for HER2, based on IHC and ISH results (Group 3 ISH result with IHC 0-1+); see comment',
    'Negative, Group 4 ISH result (with IHC 0-2+)': 'NEGATIVE for HER2, based on IHC and ISH results (Group 4 ISH result with IHC 0-2+); see comment',
    'Positive (amplified, Group 1 result in greater than 10% of cell population)': 'POSITIVE for HER2 amplification',
    'Positive, Group 2 ISH result (with IHC 3+)': 'POSITIVE for HER2, based on IHC and ISH results (Group 2 ISH result with IHC 3+); see comment',
    'Positive, Group 3 ISH result (with IHC 2-3+)': 'POSITIVE for HER2, based on IHC and ISH results (Group 3 ISH result with IHC 2-3+); see comment',
    'Positive, Group 4 ISH result (with IHC 3+)': 'POSITIVE for HER2, based on IHC and ISH results (Group 4 ISH result with IHC 3+); see comment'
  };
  const options = schema.fields.find((f) => f.id === 'her2Dish').options.filter(Boolean);
  assert.deepEqual([...options].sort(), Object.keys(expected).sort(), 'a result option has no verdict here');
  for (const o of options) {
    assert.equal(verdict(o), expected[o], o);
    const out = ishCase({ site: 'Breast', siteDetail: 'right, core biopsy', blockNo: '26BX-000001', her2Dish: o });
    assert.equal(out.diagnosis, `Breast, right, core biopsy, paraffin block (26BX-000001), for HER-2 DISH test - ${expected[o]}`);
    // "see comment" only where the comment has something to see.
    if (/see comment/.test(expected[o])) assert.match(out.comment, /This sample has a Group|HER2 FISH will be attempted/, o);
  }
  assert.equal(verdict(''), '');
});

// Measured on the 18 standalone HER2 requests in the 2024-2026 export: one was reported as
// "Cannot be determined despite repeated testing", with the FISH follow-up promised in the text.
test('cannot be determined auto-ticks the FISH follow-up snippet', () => {
  const out = ishCase({ site: 'Breast', her2Dish: 'Cannot be determined' });
  assert.equal(out.molecular, '- HER2 DISH : Cannot be determined');
  assert.equal(out.diagnosis, 'Breast, for HER-2 DISH test - HER2 amplification status CANNOT BE DETERMINED; see comment');
  // After the pre-analytic lines and the method sentence, which now lead the comment.
  assert.ok(out.comment.startsWith('- Cold ischaemic time is uncertain.'), out.comment);
  assert.ok(out.comment.endsWith('light microscopy.\n\nHER2 FISH will be attempted; the results will be issued in a separate report.'), out.comment);
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
  assert.ok(out.comment.includes('randomised to the trastuzumab arm'));
  assert.ok(!/randomized/.test(out.report));
  assert.ok(out.comment.includes('disrupt HER2 signalling pathways'));
  // The interpretive paragraphs travel with the rest of the block, after the method sentence.
  assert.ok(out.comment.indexOf('Ventana INFORM') < out.comment.indexOf('This sample has a Group 2 HER2 ISH result'));
  assert.ok(!/This sample has|eligible/.test(out.molecular), out.molecular);
  assert.ok(!/This sample has|eligible/.test(out.diagnosis), out.diagnosis);
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

// The fixtures record the MOLECULAR FINDINGS, DIAGNOSIS and COMMENT blocks as well as the report (since
// 2026-10-08): the header-less report joins them with blank lines, so the report alone could not show
// which block a line prints in.
test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = ishCase(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'breast_biomarkers', values, report: out.report, molecular: out.molecular, diagnosis: out.diagnosis, comment: out.comment, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.equal(out.molecular, saved.molecular, `${file} molecular findings block changed`);
    assert.equal(out.diagnosis, saved.diagnosis, `${file} diagnosis block changed`);
    assert.equal(out.comment, saved.comment, `${file} comment block changed`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});

// Out-of-range pre-analytics print their own sub-item and suppress the "meets requirements" line.
test('cold ischaemia over 60 min and fixation over 72 hours are called out', () => {
  const out = ishCase(CASES[4][1]);
  assert.ok(out.comment.includes('- Cold ischaemia time : 75 min'));
  assert.ok(!out.comment.includes('- Meet requirements specified in the latest version of the ASCO/CAP guidelines.'));
});

test('pre-analytic timings drive the ASCO/CAP line as they do in the shared block', () => {
  const optimal = ishCase({ ...GROUP5, coldIschemia: '35', fixationTime: '24' });
  assert.ok(optimal.comment.includes('- Cold ischaemia time : 35 min'));
  assert.ok(optimal.comment.includes('- Meet requirements specified in the latest version of the ASCO/CAP guidelines.'));
  const blank = ishCase(GROUP5);
  assert.ok(blank.comment.includes('- Cold ischaemic time is uncertain.'));
  assert.ok(blank.comment.includes('please interpret the above results with caution.'));
});

// The test type and the free-text notes sit between the pre-analytic lines and the method sentence in
// the block, so they move with them.
test('the test type and additional notes print in the Comment', () => {
  const out = ishCase({ ...GROUP5, testType: 'Laboratory-developed test (QMH, HK).', bmNotes: 'Block A3 tested.' });
  assert.ok(out.comment.includes('- Test type : Laboratory-developed test (QMH, HK).'));
  assert.ok(out.comment.includes('- Additional notes: \n  - Block A3 tested.'.replace(' \n', '\n')));
  assert.ok(!/Test type|Additional notes/.test(out.molecular));
  assert.ok(!/Test type|Additional notes/.test(out.diagnosis));
});

// Other ISH abnormalities are sub-items of the result, so they stay with it.
test('other ISH abnormalities stay with the result', () => {
  const out = ishCase({ ...GROUP5, dishPctAmp: '5', dishAneusomy: true, dishHeteroSignals: true });
  assert.ok(out.molecular.endsWith('  - Percentage of Cells with Amplified HER2 Signals : 5\n  - Other ISH abnormalities:\n    - Aneusomy\n    - Heterogeneous signals'), out.molecular);
  assert.ok(out.comment.startsWith('- Cold ischaemic time is uncertain.'));
});

test('splitBlock cuts at the first blank line only', () => {
  assert.deepEqual(splitBlock('- A\n  - b\n\n- C\n\nD\n'), { result: '- A\n  - b', rest: '- C\n\nD' });
  assert.deepEqual(splitBlock('- A\n'), { result: '- A', rest: '' });
  assert.deepEqual(splitBlock(''), { result: '', rest: '' });
});

// A pasted HER2 DISH request opens this form and fills it so the specimen line prints back as pasted.
// Before 2026-10-08 the user's line opened the breast core biopsy form.
test('a pasted HER2 DISH request opens the HER2 ISH form with the site, the specimen and the block', () => {
  const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
  const line = "Breast, left 8 o'clock, 2 cm FN, core biopsy, paraffin block (26BX-012345), for HER-2 DISH test.";
  const m = route(line, 'CA left breast L8H 2FN 2.24 cm with 2 suspicious left axilla LN up to 1.9 cm.');
  assert.equal(m.templateId, 'breast_biomarkers');
  assert.equal(m.tier, 'confident');
  const values = presetValues(schema, m, m);
  assert.deepEqual(values, { blockNo: '26BX-012345', site: 'Breast', siteDetail: "left 8 o'clock, 2 cm FN, core biopsy" });
  assert.equal(ishCase(values).specimens, line, 'the specimen line prints back as pasted');

  // A node or a liver metastasis sent for the test, in a breast case, comes here too.
  const node = route('Lymph node, left axilla, core biopsy, paraffin block (26BX-011111), for HER-2 DISH test', 'CA left breast');
  assert.equal(node.templateId, 'breast_biomarkers');
  assert.deepEqual(presetValues(schema, node, node), { blockNo: '26BX-011111', site: 'Lymph node', siteDetail: 'left axilla, core biopsy' });
  assert.equal(route('Liver, segment 8, core biopsy, paraffin block (26BX-022222), for HER-2 DISH test', 'Metastatic breast carcinoma').templateId, 'breast_biomarkers');
  // A line that does not open on the organ keeps its own words, under Other, block letter included.
  const other = route('Left breast, 8H, core biopsy, block 26BX-044444 A1, for HER2 DISH');
  assert.equal(other.templateId, 'breast_biomarkers');
  const ov = presetValues(schema, other, other);
  assert.deepEqual(ov, { blockNo: '26BX-044444 A1', site: 'Other', siteDetail: 'Left breast, 8H, core biopsy' });
  assert.equal(ishCase(ov).specimens, 'Left breast, 8H, core biopsy, paraffin block (26BX-044444 A1), for HER-2 DISH test.');

  // Everything else keeps its route: a gastric HER2 request, a node in a gastric case, a core whose
  // history mentions an earlier DISH, FISH (another test) and the IHC panel.
  assert.equal(route('Stomach, antrum, biopsy, paraffin block (26BX-033333), for HER-2 DISH test', 'CA stomach').templateId, 'gastric_biopsy');
  assert.notEqual(route('Lymph node, left axilla, core biopsy, paraffin block (26BX-011111), for HER-2 DISH test', 'CA stomach').templateId, 'breast_biomarkers');
  assert.equal(route("Breast, left 8 o'clock, core biopsy", 'previous HER2 DISH negative').templateId, 'breast_biopsy');
  assert.equal(route('Breast, left, core biopsy, for HER2 FISH').templateId, 'breast_biopsy');
  assert.equal(route('Breast, left 11H, core biopsy, for ER, PR, HER2, Ki67').templateId, 'breast_biopsy');
});

// The Google Doc and the LIS payload carry the new block in report order, and nothing else gains it.
test('the Doc and the LIS payload carry Molecular findings between the microscopy and the diagnosis', () => {
  const cs = createCase(schema, 1);
  Object.assign(cs.parts[0].values, GROUP5, { blockNo: '26BX-012345' });
  cs.meta = { accession: '26BX-030000', clinical: 'Left breast lesion.' };
  const out = generate(schema, generator, cs);
  const doc = buildDocText(cs, out);
  const heads = doc.split('\n').filter((l) => /^[A-Z][A-Z ]+:$/.test(l));
  assert.deepEqual(heads, ['CLINICAL HISTORY:', 'SPECIMEN:', 'MACROSCOPIC DESCRIPTION:', 'BLOCK KEY:', 'MICROSCOPIC EXAMINATION:', 'MOLECULAR FINDINGS:', 'DIAGNOSIS:', 'COMMENT:']);
  assert.ok(doc.includes('MOLECULAR FINDINGS:\n- HER2 DISH : Negative (not amplified, Group 5 result)\n'), doc);
  assert.ok(doc.includes('DIAGNOSIS:\nBreast, left mastectomy, paraffin block (26BX-012345), for HER-2 DISH test - NEGATIVE for HER2 amplification\n'), doc);
  const markers = buildPayload(out).split('\n').filter((l) => /^<<<.*>>>$/.test(l));
  assert.deepEqual(markers, ['<<<SPECIMENS>>>', '<<<MOLECULAR>>>', '<<<DIAGNOSIS>>>', '<<<COMMENT>>>']);
  // A template without the hook prints no such block anywhere.
  const other = registry.breast_biopsy;
  const bcs = createCase(other.schema, 1);
  const bout = generate(other.schema, other.generator, bcs);
  assert.equal(bout.molecular, '');
  assert.ok(!buildDocText(bcs, bout).includes('MOLECULAR FINDINGS'));
  assert.ok(!buildPayload(bout).includes('<<<MOLECULAR>>>'));
});

// Lettered like every other template's lines, so a HER2 part reported alongside another template's
// part says which letter it is; on its own (the usual case) the letter is dropped.
test('in a mixed case the Molecular findings and the diagnosis line carry the part letter', () => {
  const templates = { breast_biomarkers: registry.breast_biomarkers, breast_biopsy: registry.breast_biopsy };
  const a = createCase(registry.breast_biopsy.schema, 1).parts[0];
  const b = createCase(schema, 1).parts[0];
  Object.assign(b.values, GROUP5);
  const cs = { schemaId: 'breast_biopsy', options: {}, parts: [{ ...a, label: 'A', templateId: 'breast_biopsy' }, { ...b, label: 'B', templateId: 'breast_biomarkers' }] };
  const out = generateCase(templates, cs);
  assert.ok(out.molecular.startsWith('(B)\n- HER2 DISH : Negative (not amplified, Group 5 result)\n'), out.molecular);
  assert.ok(out.diagnosis.includes('\n(B) Breast, left mastectomy, for HER-2 DISH test - NEGATIVE for HER2 amplification'), out.diagnosis);
  assert.ok(out.specimens.includes('(B) Breast, left mastectomy, for HER-2 DISH test.'), out.specimens);
  // On its own the part is unlettered.
  const alone = ishCase(GROUP5);
  assert.ok(!/\(A\)/.test(`${alone.molecular}\n${alone.diagnosis}\n${alone.specimens}`));
});
