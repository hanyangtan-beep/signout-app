import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseSpecimen, extractLaterality, organConcepts, checkSpecimenAlignment } from '../src/specimenalign.js';
import { parseIntake, matchParts, presetValues, sideOf } from '../src/intake.js';
import { generateCase, createPart } from '../src/engine.js';
import { loadManifest, loadTemplate } from '../src/registry.js';

const manifest = await loadManifest();

test('extractLaterality: handles full words, Lt/Rt, bare R/L beside organs, clock hours, lobes, and bilateral', () => {
  assert.equal(extractLaterality('right tube'), 'right');
  assert.equal(extractLaterality('R tube'), 'right');
  assert.equal(extractLaterality('Rt. fallopian tube, resection'), 'right');
  assert.equal(extractLaterality('L tube'), 'left');
  assert.equal(extractLaterality('Lt ovary, cystectomy'), 'left');
  assert.equal(extractLaterality('Right fallopian tube, salpingectomy'), 'right');
  assert.equal(extractLaterality('L11H breast lesion'), 'left');
  assert.equal(extractLaterality('Lung, RLL wedge'), 'right');
  assert.equal(extractLaterality('Uterus and bilateral adnexa, TAH-BSO'), 'bilateral');
  assert.equal(extractLaterality('post-RT changes'), '');
  assert.equal(extractLaterality('Uterus, resection'), '');
});

test('sideOf in intake.js recognises R/L/Rt/Lt beside common paired organs without false positives', () => {
  assert.equal(sideOf('R tube'), 'Right');
  assert.equal(sideOf('L tube'), 'Left');
  assert.equal(sideOf('Rt tube, resection'), 'Right');
  assert.equal(sideOf('Lt fallopian tube'), 'Left');
  assert.equal(sideOf('R ovary'), 'Right');
  assert.equal(sideOf('L breast, core biopsy'), 'Left');
  assert.equal(sideOf('R kidney, nephrectomy'), 'Right');
  assert.equal(sideOf('post-RT changes'), '');
  assert.equal(sideOf('LN, core biopsy'), '');
  assert.equal(sideOf('L 3 cores'), '');
});

test('organConcepts: maps house abbreviations and synonyms to canonical organs', () => {
  assert.deepEqual([...organConcepts('right tube')], ['fallopian_tube']);
  assert.deepEqual([...organConcepts('R tube')], ['fallopian_tube']);
  assert.deepEqual([...organConcepts('Right fallopian tube, salpingectomy')], ['fallopian_tube']);
  assert.deepEqual([...organConcepts('Uterus and cervix, total hysterectomy')].sort(), ['cervix', 'uterus']);
  assert.deepEqual([...organConcepts('Right tube and ovary')].sort(), ['fallopian_tube', 'ovary']);
  assert.equal(normaliseSpecimen('(A) Caecum, biopsy'), 'cecum, biopsy');
});

test('checkSpecimenAlignment: allows clinical equivalents like "right tube" / "R tube" <-> "Right fallopian tube"', () => {
  assert.deepEqual(checkSpecimenAlignment('right tube', 'Right fallopian tube, salpingectomy'), []);
  assert.deepEqual(checkSpecimenAlignment('R tube', 'Right fallopian tube, salpingectomy'), []);
  assert.deepEqual(checkSpecimenAlignment('R tube, resection', 'Right fallopian tube, salpingectomy'), []);
  assert.deepEqual(checkSpecimenAlignment('L tube', 'Left fallopian tube, salpingectomy'), []);
  assert.deepEqual(checkSpecimenAlignment('Uterus, resection', 'Uterus and cervix, total hysterectomy'), []);
  assert.deepEqual(checkSpecimenAlignment('Breast, L11H lesion, biopsy', "Left breast, 11 o'clock, core biopsy"), []);
});

test('checkSpecimenAlignment: catches laterality and organ mismatches', () => {
  const wrongSide = checkSpecimenAlignment('R tube', 'Left fallopian tube, salpingectomy');
  assert.equal(wrongSide.length, 1);
  assert.equal(wrongSide[0].level, 'error');
  assert.match(wrongSide[0].message, /laterality mismatch/i);

  const wrongOrgan = checkSpecimenAlignment('R tube', 'Uterus and cervix, total hysterectomy');
  assert.equal(wrongOrgan.length, 1);
  assert.equal(wrongOrgan[0].level, 'error');
  assert.match(wrongOrgan[0].message, /Specimen mismatch/i);

  const extraOrgan = checkSpecimenAlignment('R tube', 'Right tube and ovary');
  assert.equal(extraOrgan.length, 1);
  assert.equal(extraOrgan[0].level, 'warn');
  assert.match(extraOrgan[0].message, /Specimen alignment/i);
});

test('end-to-end: pasting "(A) R tube, (B) L tube, (C) Uterus, resection" populates matching specimens with zero alignment issues', async () => {
  const uterus = await loadTemplate('uterus_benign');
  const parsed = parseIntake('History\nFibroids\n\nSpecimen\n(A) R tube, resection, (B) left tube, resection and (C) Uterus, resection');
  const rows = matchParts(parsed, parsed.history, manifest);
  assert.deepEqual(rows.map((r) => r.templateId), ['uterus_benign', 'uterus_benign', 'uterus_benign']);

  const parts = rows.map((r, own) => {
    const part = { ...createPart(uterus.schema, own), label: r.label, templateId: 'uterus_benign', lis: r.raw };
    Object.assign(part.values, presetValues(uterus.schema, r, r));
    return part;
  });
  assert.equal(parts[0].values.specimenName, 'Right fallopian tube, salpingectomy');
  assert.equal(parts[1].values.specimenName, 'Left fallopian tube, salpingectomy');
  assert.equal(parts[2].values.specimenName, 'Uterus and cervix, total hysterectomy');

  const out = generateCase({ uterus_benign: uterus }, {
    schemaId: 'uterus_benign', caseTitle: '', options: { includeHeader: false }, meta: {}, parts
  });
  assert.deepEqual(out.issues.filter((i) => /Specimen/i.test(i.message)), []);

  // Now simulate a misaligned part (e.g. user accidentally flips Part A to Left fallopian tube):
  parts[0].values.specimenName = 'Left fallopian tube, salpingectomy';
  const bad = generateCase({ uterus_benign: uterus }, {
    schemaId: 'uterus_benign', caseTitle: '', options: { includeHeader: false }, meta: {}, parts
  });
  assert.ok(bad.issues.some((i) => i.part === 'A' && i.level === 'error' && /laterality mismatch/i.test(i.message)));
});
