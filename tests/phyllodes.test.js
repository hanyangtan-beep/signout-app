// Phyllodes tumour resection (synoptic, WHO grade, AJCC 8th for malignant only) - generator, fixtures and QMH element order.
// Spec: docs/specs/breast-pair.md. Fixtures: tests/fixtures/phyllodes/*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { gradeOf, suggestedGrade, histTypeName } from '../generators/phyllodes.js';
import { parseSynoptic } from '../src/synoptic.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'phyllodes');
const UPDATE = process.argv.includes('--update');
const registry = await loadAll();
const { schema, generator } = registry.phyllodes;
const EX = schema.example.parts[0].values;
const defaults = (s) => Object.fromEntries(s.fields.filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));

function run(patch = {}, options = {}, caseFields = {}) {
  const values = { ...defaults(schema), ...EX, ...patch };
  const cs = { schemaId: 'phyllodes', caseTitle: '', options: { ...schema.example.options, ...options }, ...caseFields, parts: [{ label: 'A', values }] };
  return generate(schema, generator, cs);
}
const rows = (out) => Object.fromEntries(parseSynoptic(out.synoptic).filter((r) => r.label).map((r) => [r.label, r.value]));
const flatDx = (out) => out.diagnosis.replace(/\s+/g, ' ');
const info = (out) => out.issues.filter((i) => i.level === 'info').map((i) => i.message);
const warns = (out) => out.issues.filter((i) => i.level === 'warn').map((i) => i.message);
const errs = (out) => out.issues.filter((i) => i.level === 'error').map((i) => i.message);

const MASTECTOMY = 'Total mastectomy (including nipple-sparing and skin-sparing mastectomy)';
const MALIGNANT = { histType: 'Phyllodes tumor, malignant', stromalCellularity: 'Marked (many overlapping stromal nuclei)', stromalAtypia: 'Marked (marked nuclear pleomorphism, hyperchromasia, and irregular nuclear contours)', stromalOvergrowth: 'Present', mitoticCount: '18', tumourBorder: 'Infiltrative (permeative), extensive' };
const BENIGN = { histType: 'Phyllodes tumor, benign', stromalCellularity: 'Mild (stromal nuclei are non-overlapping)', stromalAtypia: 'Mild (minimal variation in nuclear size, even chromatin, and smooth nuclear contours)', stromalOvergrowth: 'Absent', mitoticCount: '2', tumourBorder: 'Circumscribed (well-defined; pushing)' };

const CASES = [
  ['01-wle-borderline-phyllodes-45mm', {}, { printPTNM: true }],
  ['02-mastectomy-malignant-phyllodes-osteosarcoma-sln', { ...MALIGNANT, procedure: MASTECTOMY, laterality: 'Right', tumourSite: ['Central'], sitePosition: '', specimenDims: '220 x 180 x 90', weight: '1450', skinEllipse: '200 x 90',
    sizeMm: '120', tumourDims: '120 x 100 x 85', cutSurface: ['Fleshy', 'Lobulated', 'Leaf-like clefts', 'Haemorrhagic', 'Necrotic'], closestGrossMm: '8, posterior', otherMacro: 'Gritty, bone-hard areas are present within the tumour.',
    blockKeyText: '1-12 tumour including the posterior margin\n13 nipple\n14-17 anterior, superior, inferior and lateral margins\n18 medial margin\n19-20 background breast\n21 sentinel lymph nodes (2 nodes)',
    heterologous: ['Osteosarcoma'], margins: 'Anterior: >10\nPosterior: 8\nSuperior: >10\nInferior: >10\nMedial: >10\nLateral: >10', nodeSampling: 'Sentinel node biopsy only', nodesExamined: '2', nodesPositive: '0' }, { printPTNM: true }],
  ['03-wle-benign-phyllodes-anterior-margin-involved', { ...BENIGN, laterality: 'Right', tumourSite: ['Lower outer quadrant'], sitePosition: "8 o'clock", specimenDims: '45 x 40 x 30', weight: '30', sizeMm: '32', tumourDims: '32 x 30 x 25', closestGrossMm: '0, anterior',
    blockKeyText: '1-5 tumour with the anterior margin\n6-9 posterior, superior, inferior and lateral margins\n10 medial margin', margins: 'Anterior: involved\nPosterior: 6\nSuperior: >10\nInferior: >10\nMedial: >10\nLateral: 4' }, { printPTNM: true }]
];
const byName = Object.fromEntries(CASES.map(([n, p, o, c]) => [n, { patch: p, options: o || {}, caseFields: c || {} }]));

test('template metadata and registration', () => {
  assert.equal(schema.id, 'phyllodes');
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.system, 'Breast');
  assert.match(schema.source.url, /BREAST-Phyllodes\.html$/);
  assert.equal(schema.source.stagingProtocol, 'phyllodes');
  assert.ok(registry.phyllodes);
  assert.deepEqual(schema.fields.find((f) => f.id === 'histType').options, ['Phyllodes tumor, benign', 'Phyllodes tumor, borderline', 'Phyllodes tumor, malignant', 'No tumor']);
});

test('grade helpers: gradeOf, house spelling, WHO-suggested grade', () => {
  assert.equal(gradeOf({ histType: 'Phyllodes tumor, borderline' }), 'borderline');
  assert.equal(gradeOf({ histType: 'No tumor' }), '');
  assert.equal(histTypeName({ histType: 'Phyllodes tumor, borderline' }), 'Phyllodes tumour, borderline');
  assert.equal(suggestedGrade(BENIGN), 'benign');
  assert.equal(suggestedGrade(EX), 'borderline');
  assert.equal(suggestedGrade(MALIGNANT), 'malignant');
  assert.equal(suggestedGrade({ ...BENIGN, heterologous: ['Osteosarcoma'] }), 'malignant', 'a heterologous sarcoma is malignant regardless');
  assert.equal(suggestedGrade({ ...BENIGN, mitoticMode: 'Mitoses per square millimeter (mm2)', mitoticCount: '3' }), 'borderline', 'per-mm2 thresholds are half the per-10-hpf ones');
});

test('example case: WLE, borderline phyllodes 45 mm; no pTNM for a borderline tumour even with printPTNM', () => {
  const out = run({}, { printPTNM: true });
  const r = rows(out);
  assert.match(out.report, /^Breast, left, wide local excision\n/);
  assert.equal(r['Histologic type'], 'Phyllodes tumour, borderline');
  assert.equal(r['Stromal cellularity'], 'Moderate (some overlapping stromal nuclei)');
  assert.equal(r['Stromal overgrowth'], 'Absent');
  assert.equal(r['Mitotic rate'], '6 per 10 high power fields');
  assert.equal(r['Histologic tumour border'], 'Infiltrative (permeative), focal');
  assert.equal(r['Malignant heterologous elements'], 'Not identified');
  assert.equal(r['pTNM'], 'Not applicable (borderline phyllodes tumour; AJCC staging applies to malignant phyllodes tumour only)');
  assert.equal(flatDx(out), 'BREAST, left, wide local excision - BORDERLINE PHYLLODES TUMOUR, 45 mm; margins clear (closest 3 mm, anterior); see synoptic report');
  assert.ok(!/pT\d/.test(out.report));
  assert.ok(info(out).some((m) => /^Borderline phyllodes tumour within 10 mm of the anterior and posterior margins \(3 mm, 8 mm\)/.test(m)));
  assert.ok(!out.issues.some((i) => /^pNX/.test(i.message)), 'pNX is expected without nodes');
});

test('02 malignant phyllodes with osteosarcoma, mastectomy, 0/2 SLN -> pT3 pN0 and the re-excision comment', () => {
  const out = run(byName['02-mastectomy-malignant-phyllodes-osteosarcoma-sln'].patch, { printPTNM: true });
  const r = rows(out);
  assert.equal(r['Histologic type'], 'Phyllodes tumour, malignant');
  assert.equal(r['Malignant heterologous elements'], 'Osteosarcoma');
  assert.equal(r['pTNM'], 'pT3 pN0');
  assert.match(out.report, /Two lymph nodes are identified and entirely embedded\./);
  assert.equal(flatDx(out), 'BREAST, right, total mastectomy - MALIGNANT PHYLLODES TUMOUR with osteosarcoma, 120 mm; margins clear (closest 8 mm, posterior); see synoptic report - 0 of 2 sentinel lymph nodes involved - pT3 pN0 (AJCC 8th edition)');
  assert.match(out.report, /Malignant phyllodes tumours are usually excised with a clear margin of at least 10 mm; the 8 mm posterior margin is noted for the clinical team's consideration of re-excision\./);
  assert.equal(errs(out).length, 0, errs(out).join(' | '));
});

test('03 benign phyllodes at the anterior margin: involved-margin wording and warning', () => {
  const out = run(byName['03-wle-benign-phyllodes-anterior-margin-involved'].patch, { printPTNM: true });
  assert.equal(flatDx(out), 'BREAST, right, wide local excision - BENIGN PHYLLODES TUMOUR, 32 mm; anterior margin involved; other margins clear (closest 4 mm, lateral); see synoptic report');
  assert.ok(warns(out).some((m) => m === 'Tumour at a margin: re-excision is usually recommended for phyllodes tumours of any grade.'));
  assert.equal(rows(out)['Anterior margin'], 'Involved by tumour');
  assert.ok(!/at least 10 mm/.test(out.report), 'the malignant re-excision comment is not added to a benign tumour');
});

test('checks: WHO mismatch warn / heterologous error, nodal metastasis in a non-malignant tumour, other specify fields', () => {
  assert.ok(warns(run({ histType: 'Phyllodes tumor, benign' })).some((m) => /Histologic type is benign but the WHO elements entered suggest borderline/.test(m)));
  assert.ok(errs(run({ heterologous: ['Osteosarcoma'] })).some((m) => /malignant heterologous element makes the tumour malignant/.test(m)));
  assert.ok(warns(run({ nodeSampling: 'Sentinel node biopsy only', nodesExamined: '2', nodesPositive: '1', depositMm: '5' })).some((m) => /essentially confined to malignant phyllodes/.test(m)));
  assert.ok(errs(run({ nodeSampling: 'Sentinel node biopsy only', nodesExamined: '1', nodesPositive: '2' })).some((m) => /2 involved but only 1 examined/.test(m)));
  assert.ok(warns(run({ heterologous: ['Other (specify)'], heterologousDetail: '' })).some((m) => /Heterologous element "Other"/.test(m)));
  assert.ok(warns(run({ mitoticCount: '' })).some((m) => /Mitotic rate: enter the count/.test(m)));
  assert.ok(info(run({ epithelium: ['Ductal carcinoma in situ (specify)'], epitheliumDetail: 'low grade, 3 mm' })).some((m) => /In situ carcinoma within a phyllodes tumour/.test(m)));
  assert.equal(rows(run({ ...MALIGNANT, nodeSampling: 'Sentinel node biopsy only', nodesExamined: '2', nodesPositive: '1', depositMm: '5' }, { printPTNM: true }))['pTNM'], 'pT1 pN1', '45 mm is pT1 (5 cm or less)');
  assert.equal(rows(run({ ...MALIGNANT, sizeMm: '70' }, { printPTNM: true }))['pTNM'], 'pT2 pNX');
  assert.equal(rows(run({ ...MALIGNANT, sizeMm: '160' }, { printPTNM: true }))['pTNM'], 'pT4 pNX');
});

test('report options: macro off, header on, single part without letters, other part restores letters', () => {
  assert.ok(!run({}, { macro: false }).report.includes('The specimen consists of'));
  assert.match(run({}, { includeHeader: true }).report, /^SPECIMEN:\n/);
  assert.ok(!/\(A\)/.test(run({}).report));
  const multi = run({ otherParts: 'B) Breast, left, cavity shave, anterior - benign' });
  assert.match(multi.report, /^\(A\) Breast, left, wide local excision\n\(B\) Breast, left, cavity shave, anterior/);
  assert.match(multi.diagnosis, /^\(A\) BREAST, left, wide local excision\n/);
});

test('synoptic element order follows the QMH BREAST-Phyllodes page (analysis/qmh/phyllodes.txt)', () => {
  const QMH = ['Histologic type', 'Stromal cellularity', 'Stromal atypia', 'Stromal overgrowth', 'Mitotic rate', 'Histologic tumour border', 'Malignant heterologous elements', 'Anterior margin', 'Regional lymph nodes', 'pTNM'];
  const ours = Object.keys(rows(run(byName['02-mastectomy-malignant-phyllodes-osteosarcoma-sln'].patch, { printPTNM: true })));
  let cursor = -1;
  for (const label of QMH) {
    const idx = ours.indexOf(label);
    assert.ok(idx > cursor, `${label} out of QMH order (index ${idx} after ${cursor}); rows: ${ours.join(' | ')}`);
    cursor = idx;
  }
});

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, patch, opts = {}, caseFields = {}] of CASES) {
    const out = run(patch, opts, caseFields);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'phyllodes', patch, options: opts, caseFields, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
