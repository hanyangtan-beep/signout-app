import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHEET_HEADER, normaliseAccession, phiWarnings, buildDocText, toSheetRow, fromSheetRow, docUrlFor
} from '../src/docformat.js';

const caseState = {
  schemaId: 'gastric_biopsy', schemaVersion: '1.0.0', caseTitle: '', options: {},
  parts: [{ label: 'A', values: { site: 'antrum' } }, { label: 'B', values: { site: 'body' } }],
  meta: { accession: 's25-01234', status: 'ready', clinical: 'Dyspepsia.', macro: '2 fragments', blockKey: 'A1, B1' }
};
const out = {
  specimens: '(A) Stomach, antrum, biopsy\n(B) Stomach, body, biopsy',
  microscopy: 'Sections show…',
  diagnosis: '(A) STOMACH, antrum, biopsy - CHRONIC GASTRITIS',
  report: 'full'
};

test('accession normalisation strips spaces, hyphens and case', () => {
  assert.equal(normaliseAccession(' s25-01234 '), 'S2501234');
  assert.equal(normaliseAccession('S25/01234'), 'S2501234');
  assert.equal(normaliseAccession(''), '');
  assert.equal(normaliseAccession(undefined), '');
});

test('PHI guard flags HKID, honorific+name, phone and DOB but not report text', () => {
  const w = phiWarnings({
    a: 'Patient A123456(7) seen', b: 'Mr Chan complains of pain', c: 'call 9123 4567', d: 'DOB 1989',
    ok: '(A) STOMACH, antrum, biopsy - CHRONIC GASTRITIS. Blocks A1-A3. 12 fragments up to 0.4 cm. S25-00123 S2500123 Dr Wong informed by phone.'
  });
  assert.equal(w.length, 4);
  assert.match(w[0], /HKID/);
  assert.match(w[1], /name/);
  assert.match(w[2], /phone/);
  assert.match(w[3], /date of birth/);
});

test('Doc text has fixed headings in order with the normalised accession first', () => {
  const text = buildDocText(caseState, out);
  const lines = text.split('\n');
  assert.equal(lines[0], 'S2501234');
  const heads = lines.filter((l) => /^[A-Z ]+:$/.test(l));
  assert.deepEqual(heads, ['CLINICAL HISTORY:', 'SPECIMEN:', 'MACROSCOPIC DESCRIPTION:', 'BLOCK KEY:', 'MICROSCOPIC EXAMINATION:', 'DIAGNOSIS:']);
  assert.ok(text.includes('CLINICAL HISTORY:\nDyspepsia.\n'));
  assert.ok(text.includes('DIAGNOSIS:\n(A) STOMACH, antrum, biopsy - CHRONIC GASTRITIS\n'));
  assert.match(lines.at(-1), /^Template: gastric_biopsy v1\.0\.0 · Status: ready · Saved \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/);
});

test('empty sections render as a dash so the layout is stable', () => {
  const text = buildDocText({ ...caseState, meta: { accession: 'S1' } }, { specimens: '', microscopy: '', diagnosis: '' });
  assert.ok(text.includes('CLINICAL HISTORY:\n-\n'));
  assert.ok(text.includes('DIAGNOSIS:\n-\n'));
  assert.ok(text.includes('Status: draft'));
});

test('Sheet row round-trips the case state', () => {
  const now = new Date('2026-09-09T12:00:00Z');
  const row = toSheetRow(caseState, 'doc123', docUrlFor('doc123'), now);
  assert.equal(row.length, SHEET_HEADER.length);
  assert.deepEqual(row.slice(0, 7), ['S2501234', '2026-09-09T12:00:00.000Z', 'ready', 'gastric_biopsy', '2', 'https://docs.google.com/document/d/doc123/edit', 'doc123']);
  const back = fromSheetRow(row);
  assert.equal(back.accession, 'S2501234');
  assert.equal(back.doc_id, 'doc123');
  assert.deepEqual(back.caseState, caseState);
});

test('fromSheetRow tolerates short rows and bad JSON', () => {
  assert.equal(fromSheetRow(['S1']).caseState, null);
  assert.equal(fromSheetRow(['S1', '', '', '', '', '', '', '{oops']).caseState, null);
  assert.equal(fromSheetRow(['S1']).status, '');
});
