// LIS clipboard bridge: the marker payload both directions share (src/lisbridge.js).
// The AHK script in tools/lis-bridge.ahk splits on the same markers, so the round-trip test
// below is the contract between the two ends.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  marker, buildPayload, payloadKeys, payloadLabel, parseHarvest,
  nextCaptureTarget, PAYLOAD_KEYS, CAPTURE_ORDER,
} from '../src/lisbridge.js';

test('marker is the uppercase key between angle runs', () => {
  assert.equal(marker('diagnosis'), '<<<DIAGNOSIS>>>');
  assert.equal(marker('blockKey'), '<<<BLOCKKEY>>>');
});

test('payload carries only the blocks that have text, in report order', () => {
  const out = {
    specimens: '(A) Antrum, biopsy.',
    macro: '',
    microscopy: 'Sections show gastric antral mucosa.',
    diagnosis: 'Stomach, antrum, biopsy:\n- Chronic gastritis.',
    comment: '   ',
  };
  const payload = buildPayload(out);
  assert.deepEqual(payloadKeys(out), ['specimens', 'microscopy', 'diagnosis']);
  assert.ok(!payload.includes('<<<MACRO>>>'), 'an empty block is skipped, not emitted empty');
  assert.ok(!payload.includes('<<<COMMENT>>>'), 'whitespace counts as empty');
  assert.ok(payload.indexOf('<<<SPECIMENS>>>') < payload.indexOf('<<<MICROSCOPY>>>'));
  assert.ok(payload.indexOf('<<<MICROSCOPY>>>') < payload.indexOf('<<<DIAGNOSIS>>>'));
});

test('payload keys can be narrowed and reordered by the caller', () => {
  const out = { specimens: 'A', microscopy: 'B', diagnosis: 'C' };
  const payload = buildPayload(out, ['diagnosis', 'microscopy']);
  assert.ok(payload.startsWith('<<<DIAGNOSIS>>>'));
  assert.ok(!payload.includes('<<<SPECIMENS>>>'));
});

test('an empty report gives an empty payload rather than bare markers', () => {
  assert.equal(buildPayload({}), '');
  assert.deepEqual(payloadKeys({}), []);
});

test('block labels read as sentences', () => {
  assert.equal(payloadLabel('diagnosis'), 'Diagnosis');
  assert.equal(payloadLabel('blockKey'), 'Block key');
  assert.equal(payloadLabel('microscopy'), 'Microscopic examination');
});

test('a marked harvest routes each block to its box', () => {
  const text = [
    '<<<SPECIMEN>>>',
    'Antrum',
    '',
    '<<<HISTORY>>>',
    'Epigastric pain. Rule out H. pylori.',
    '',
    '<<<MACRO>>>',
    'Received in formalin are three grey tissue fragments,',
    'the largest measuring 3 mm.',
  ].join('\n');
  const { fields, found, unknown, marked } = parseHarvest(text);
  assert.equal(marked, true);
  assert.deepEqual(unknown, []);
  assert.deepEqual(found, ['specimen', 'clinical', 'macro']);
  assert.equal(fields.specimen, 'Antrum');
  assert.equal(fields.clinical, 'Epigastric pain. Rule out H. pylori.');
  assert.ok(fields.macro.includes('largest measuring 3 mm'), 'a multi-line block keeps its line breaks');
  assert.equal(fields.macro.split('\n').length, 2);
});

test('spelling variants reach the same box', () => {
  for (const key of ['HISTORY', 'CLINICAL', 'Clinical History']) {
    const { fields } = parseHarvest(`<<<${key}>>>\nKnown carcinoma of breast.`);
    assert.equal(fields.clinical, 'Known carcinoma of breast.', `${key} should fill the history box`);
  }
  for (const key of ['MACRO', 'MACROSCOPIC', 'Gross']) {
    const { fields } = parseHarvest(`<<<${key}>>>\nA 12 mm nodule.`);
    assert.equal(fields.macro, 'A 12 mm nodule.', `${key} should fill the macroscopic box`);
  }
});

test('the clipboard may pad a marker line with spaces', () => {
  const { fields, marked } = parseHarvest('   <<< SPECIMEN >>>   \nAntrum');
  assert.equal(marked, true);
  assert.equal(fields.specimen, 'Antrum');
});

test('an unmarked paste is the ordinary Specimen paste it has always been', () => {
  const text = 'History\nFibroids\n\nSpecimen\n(A) Uterus, resection';
  const { fields, marked, found } = parseHarvest(text);
  assert.equal(marked, false);
  assert.deepEqual(found, []);
  assert.equal(fields.specimen, text, 'the whole paste goes to the box parseIntake already reads');
});

test('an unknown marker is reported, not silently dropped', () => {
  const { fields, unknown } = parseHarvest('<<<CYTOLOGY>>>\nSome text\n\n<<<SPECIMEN>>>\nAntrum');
  assert.deepEqual(unknown, ['CYTOLOGY']);
  assert.equal(fields.specimen, 'Antrum', 'the known markers still land');
});

test('an empty block under a marker leaves the box alone', () => {
  const { fields, found } = parseHarvest('<<<SPECIMEN>>>\nAntrum\n\n<<<HISTORY>>>\n\n<<<MACRO>>>\nA nodule.');
  assert.equal(found.includes('clinical'), false, 'a field the LIS had nothing in is not reported as captured');
  assert.equal(fields.clinical, undefined);
  assert.equal(fields.macro, 'A nodule.');
});

test('a repeated marker appends rather than overwrites', () => {
  const { fields } = parseHarvest('<<<SPECIMEN>>>\n(A) Antrum\n\n<<<SPECIMEN>>>\n(B) Body');
  assert.equal(fields.specimen, '(A) Antrum\n(B) Body');
});

test('capture fills the first empty box in read order', () => {
  assert.deepEqual(CAPTURE_ORDER, ['specimen', 'clinical', 'macro', 'blockKey']);
  assert.equal(nextCaptureTarget({}), 'specimen');
  assert.equal(nextCaptureTarget({ specimen: 'Antrum' }), 'clinical');
  assert.equal(nextCaptureTarget({ specimen: 'Antrum', clinical: 'Pain' }), 'macro');
  assert.equal(nextCaptureTarget({ specimen: 'A', clinical: 'B', macro: 'C' }), 'blockKey');
  assert.equal(nextCaptureTarget({ specimen: 'A', clinical: 'B', macro: 'C', blockKey: 'D' }), '');
  assert.equal(nextCaptureTarget({ specimen: '   \n ' }), 'specimen', 'whitespace is an empty box');
});

test('round trip: what the app emits is what a splitter reads back', () => {
  // The AHK script does this split on the LIS side. Keeping it here means a format change that
  // breaks the script breaks a test first.
  const out = {
    specimens: '(A) Antrum, biopsy.',
    microscopy: 'Sections show gastric antral mucosa with chronic inflammation.',
    diagnosis: 'Stomach, antrum, biopsy:\n- Chronic gastritis.\n- No evidence of malignancy.',
  };
  const payload = buildPayload(out);
  const blocks = {};
  let key = '';
  for (const line of payload.split('\n')) {
    const m = /^<<<([A-Z]+)>>>$/.exec(line.trim());
    if (m) { key = m[1]; blocks[key] = []; continue; }
    if (key) blocks[key].push(line);
  }
  assert.deepEqual(Object.keys(blocks), ['SPECIMENS', 'MICROSCOPY', 'DIAGNOSIS']);
  assert.equal(blocks.DIAGNOSIS.join('\n').trim(), out.diagnosis);
  assert.equal(blocks.SPECIMENS.join('\n').trim(), out.specimens);
});

test('every report block key survives a round trip through marker naming', () => {
  for (const key of PAYLOAD_KEYS) {
    const payload = buildPayload({ [key]: 'text' }, [key]);
    const { fields, unknown } = parseHarvest(payload);
    // Report keys are not all harvest keys; the ones that are must land in the right box.
    if (!unknown.length) assert.ok(Object.keys(fields).length === 1, `${key} routed to one box`);
  }
});
