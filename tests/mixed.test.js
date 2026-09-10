// Phase 3: mixed-template cases (per-part templateId) assembled by generateCase.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, createPart, generate, generateCase, templatesInUse, templateLabel } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { toSheetRow, buildDocText, fromSheetRow } from '../src/docformat.js';

const registry = await loadAll();
const gastric = registry.gastric_biopsy;
const colonic = registry.colonic_polyp;
const prostate = registry.prostate_biopsy;

function ogdColonoscopy() {
  // A antrum, B body (gastric), C sigmoid polyp (colonic) — the roadmap's "done when" case.
  const c = createCase(gastric.schema, 2);
  c.parts.push({ ...createPart(colonic.schema, 0), label: 'C', templateId: 'colonic_polyp' });
  c.parts[0].values.specimenName = 'Antrum';
  c.parts[1].values.specimenName = 'Body';
  return c;
}

test('parts without templateId fall back to the case default', () => {
  const c = createCase(gastric.schema, 2);
  assert.deepEqual(templatesInUse(c), ['gastric_biopsy']);
  assert.equal(templateLabel(c), 'gastric_biopsy');
  assert.deepEqual(generateCase(registry, c), generate(gastric.schema, gastric.generator, c));
});

test('mixed OGD + colonoscopy case: three parts, two templates, one coherent report', () => {
  const c = ogdColonoscopy();
  assert.deepEqual(templatesInUse(c), ['gastric_biopsy', 'colonic_polyp']);
  assert.equal(templateLabel(c), 'gastric_biopsy+colonic_polyp');
  const out = generateCase(registry, c);

  // Specimen list falls back to one line per part (the gastric title rewrite is not used).
  assert.deepEqual(out.specimens.split('\n'), ['(A) Antrum', '(B) Body', '(C) Sigmoid polyp']);

  // Microscopy keeps case order and each part uses its own template.
  const micro = out.microscopy;
  assert.ok(micro.indexOf('(A)') < micro.indexOf('(B)') && micro.indexOf('(B)') < micro.indexOf('(C)'));
  assert.match(micro, /Helicobacter/); // gastric checklist
  assert.match(micro, /(?:polyp|adenoma|dysplasia)/i); // colonic text

  // Diagnosis lines in order, gastric then colonic wording.
  const dx = out.diagnosis.split('\n').filter(Boolean);
  assert.equal(dx.length, 3);
  assert.match(dx[0], /^\(A\) STOMACH, antrum, biopsy - /);
  assert.match(dx[1], /^\(B\) STOMACH, body, biopsy - /);
  assert.match(dx[2], /^\(C\) /);
  assert.doesNotMatch(dx[2], /STOMACH/);

  // Report has the three blocks in order, header on by default for these templates.
  assert.ok(out.report.includes(out.specimens) && out.report.includes(out.microscopy) && out.report.includes(out.diagnosis));
});

test('options merge across templates; a shared includeHeader is honoured once', () => {
  const c = ogdColonoscopy();
  c.options = { includeHeader: false };
  const out = generateCase(registry, c);
  assert.doesNotMatch(out.report, /^SPECIMEN:/m);
  c.options = { includeHeader: true };
  assert.match(generateCase(registry, c).report, /^SPECIMEN:/m);
});

test('per-template summary only covers that template\'s parts and style is applied per part', () => {
  // A gastric part plus two prostate cores: the prostate summary must count 2 cores, not 3 parts.
  const c = createCase(gastric.schema, 1);
  c.parts.push({ ...createPart(prostate.schema, 0), label: 'B', templateId: 'prostate_biopsy' });
  c.parts.push({ ...createPart(prostate.schema, 1), label: 'C', templateId: 'prostate_biopsy' });
  c.parts[1].values.coresTotal = 1;
  c.parts[2].values.coresTotal = 1;
  const out = generateCase(registry, c);
  assert.match(out.diagnosis, /SUMMARY: No evidence of malignancy in 2 cores\./);
  assert.match(out.diagnosis, /^\(A\) STOMACH/m);
  assert.match(out.diagnosis, /^\(B\) PROSTATE, Right base, needle core biopsy - NO EVIDENCE OF MALIGNANCY/mi);
});

test('single-part rule still applies to a one-part case built through generateCase', () => {
  const c = createCase(colonic.schema, 1);
  const out = generateCase(registry, c);
  assert.doesNotMatch(out.diagnosis, /\(A\)/);
});

test('missing template is reported by name', () => {
  const c = createCase(gastric.schema, 1);
  c.parts[0].templateId = 'pancreas_biopsy';
  assert.throws(() => generateCase(registry, c), /pancreas_biopsy is not installed/);
});

test('Sheet row and Doc footer record every template used', () => {
  const c = ogdColonoscopy();
  c.meta = { accession: 'S26-00001', status: 'draft' };
  const row = toSheetRow(c, 'doc1', 'https://docs.google.com/document/d/doc1/edit');
  assert.equal(row[3], 'gastric_biopsy+colonic_polyp');
  assert.equal(row[4], '3');
  const back = fromSheetRow(row);
  assert.deepEqual(templatesInUse(back.caseState), ['gastric_biopsy', 'colonic_polyp']);
  assert.equal(back.caseState.parts[2].templateId, 'colonic_polyp');
  const doc = buildDocText(c, generateCase(registry, c));
  assert.match(doc, /Template: gastric_biopsy\+colonic_polyp/);
});
