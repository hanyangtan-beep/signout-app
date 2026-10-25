// Faster saves (src/drive.js, docs/specs/speed.md, Phase 79): what a save, a re-save, the Open
// list and opening a case ask of Google, and in how many rounds. A round is a set of calls in
// flight together; the fake below answers each round at once and counts them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers';
import { saveCase, listCases, openCase } from '../src/drive.js';

const FOLDER = 'application/vnd.google-apps.folder';
let sheets = 0;
/** A config with its folder and a Sheet of its own (row numbers seen are remembered per Sheet). */
const configFor = () => ({ clientId: 'x', folderId: 'FOLD', sheetId: `SHEET${++sheets}`, sheetName: 'Sign-out cases' });

/**
 * A fake gfetch. `sheet.rows` is the Sheet below its header: [accession, updated, status, template,
 * parts, doc_url, doc_id, case_json]. Docs are created as DOC-NEW; `deletedDoc` answers 404.
 */
function google(sheet = {}) {
  const rows = sheet.rows || [];
  const log = [];
  let round = 0;
  let pending = null;
  const answer = (c) => {
    const u = decodeURIComponent(c.url);
    if (u.includes('values:batchGet')) return { valueRanges: [{ values: [rows.map((r) => r[0])] }, { values: [rows.map((r) => r[6] || '')] }] };
    if (c.method === 'GET' && u.includes('/drive/v3/files/FOLD')) return { id: 'FOLD', mimeType: FOLDER, trashed: false, capabilities: { canAddChildren: true } };
    if (c.method === 'POST' && u.includes('uploadType=multipart')) return { id: 'DOC-NEW' };
    if (c.method === 'PATCH') {
      const id = /\/files\/([^?]+)/.exec(u)[1];
      if (id === sheet.deletedDoc) throw Object.assign(new Error('File not found'), { status: 404 });
      return { id };
    }
    if (c.method === 'POST' && u.includes(':append')) return sheet.appendReply ?? { updates: { updatedRange: `Sheet1!A${rows.length + 2}:H${rows.length + 2}` } };
    if (c.method === 'PUT') return {};
    let m = /\/values\/A2:G\?/.exec(u);
    if (m) return { values: rows.map((r) => r.slice(0, 7)) };
    m = /\/values\/A(\d+):H(\d+)\?majorDimension=ROWS/.exec(u);
    if (m) return { values: rows[m[1] - 2] ? [rows[m[1] - 2]] : undefined };
    m = /\/values\/A(\d+)\?majorDimension=COLUMNS/.exec(u);
    if (m) return { values: rows[m[1] - 2] ? [[rows[m[1] - 2][0]]] : undefined };
    throw new Error(`unexpected call: ${c.method} ${u}`);
  };
  const api = (_config, url, init = {}) => {
    if (!pending) {
      round += 1;
      pending = new Promise((resolve) => setImmediate(() => { pending = null; resolve(); }));
    }
    const call = { round, url: decodeURIComponent(url), method: init.method || 'GET' };
    log.push(call);
    return pending.then(() => {
      const body = answer(call);
      return { ok: true, status: 200, json: async () => body };
    });
  };
  return { api, log, rounds: () => round, reset: () => { log.length = 0; round = 0; } };
}

const row = (acc, doc, cs = { schemaId: 'gastric_biopsy', parts: [{}], meta: { accession: acc } }) =>
  [acc, '2026-10-25T00:00:00.000Z', 'draft', 'Gastric biopsy', '1', `https://docs.google.com/document/d/${doc}/edit`, doc, JSON.stringify(cs)];
const caseOf = (accession, drive) => ({ schemaId: 'gastric_biopsy', parts: [{ templateId: 'gastric_biopsy' }], meta: { accession }, ...(drive ? { drive } : {}) });
const out = { specimens: 'Stomach', microscopy: 'Gastric mucosa.', diagnosis: 'Stomach, biopsy: no abnormality.' };
const kinds = (log) => log.map((c) => `${c.round} ${c.method} ${c.url.replace(/^https:\/\/[^/]+/, '').replace(/\?.*$/, '')}`);

test('a case new to the tab saves in three rounds: the row lookup with the folder check, the Doc, the row', async () => {
  const g = google({ rows: [row('S261', 'D1'), row('S262', 'D2')] });
  const cs = caseOf('S26-3');
  const drive = await saveCase(configFor(), cs, out, g.api);
  assert.equal(g.rounds(), 3);
  assert.equal(g.log.length, 4);
  const lookup = g.log.find((c) => c.url.includes('values:batchGet'));
  assert.equal(lookup.round, 1);
  assert.match(lookup.url, /ranges=A2:A&ranges=G2:G&majorDimension=COLUMNS/);
  assert.equal(g.log.find((c) => c.url.includes('/drive/v3/files/FOLD')).round, 1);
  assert.deepEqual(kinds(g.log).slice(2).map((k) => k.replace(/SHEET\d+/, 'S')), ['2 POST /upload/drive/v3/files', '3 POST /v4/spreadsheets/S/values/A1:H1:append']);
  assert.ok(!g.log.some((c) => /A2:H|:H\?|H2:H/.test(c.url)), 'read the case JSON column');
  assert.equal(drive.docId, 'DOC-NEW');
  assert.equal(cs.drive.docId, 'DOC-NEW');
});

test('a re-save writes the Doc while it checks the row, then the row: two rounds', async () => {
  const config = configFor();
  const sheet = { rows: [row('S261', 'D1'), row('S262', 'D2')] };
  const g = google(sheet);
  const cs = caseOf('S26-3');
  await saveCase(config, cs, out, g.api); // appended as row 4
  sheet.rows.push(row('S263', 'DOC-NEW'));
  g.reset();
  await saveCase(config, cs, out, g.api);
  assert.equal(g.rounds(), 2);
  assert.deepEqual(kinds(g.log).map((k) => k.replace(/SHEET\d+/, 'S')), [
    '1 PATCH /upload/drive/v3/files/DOC-NEW',
    '1 GET /v4/spreadsheets/S/values/A4',
    '2 PUT /v4/spreadsheets/S/values/A4:H4'
  ]);
});

test('a Sheet sorted by hand: the hinted row holds another case, so the write follows the accession', async () => {
  const config = configFor();
  const sheet = { rows: [row('S261', 'D1'), row('S263', 'D3')] };
  const g = google(sheet);
  await listCases(config, g.api); // S263 seen at row 3
  sheet.rows.reverse();          // sorted: S263 now at row 2
  g.reset();
  await saveCase(config, caseOf('S263', { docId: 'D3' }), out, g.api);
  const put = g.log.find((c) => c.method === 'PUT');
  assert.match(put.url, /values\/A2:H2\?/);
  assert.ok(g.log.some((c) => c.url.includes('values:batchGet')));
});

test('an accession already in the Sheet reuses its Doc rather than making a second one', async () => {
  const g = google({ rows: [row('S261', 'D1'), row('S262', 'D2')] });
  const cs = caseOf('s26-2');
  await saveCase(configFor(), cs, out, g.api);
  assert.ok(!g.log.some((c) => c.url.includes('uploadType=multipart')), 'made a new Doc');
  assert.ok(g.log.some((c) => c.method === 'PATCH' && c.url.includes('/files/D2')));
  assert.match(g.log.find((c) => c.method === 'PUT').url, /values\/A3:H3\?/);
  assert.equal(cs.drive.docId, 'D2');
  assert.equal(g.rounds(), 3);
});

test('a Doc deleted in Drive is made again, and the row records the new one', async () => {
  const sheet = { rows: [row('S261', 'D1')], deletedDoc: 'D1' };
  const g = google(sheet);
  const cs = caseOf('S261', { docId: 'D1' });
  await saveCase(configFor(), cs, out, g.api);
  assert.ok(g.log.some((c) => c.url.includes('uploadType=multipart')));
  assert.equal(cs.drive.docId, 'DOC-NEW');
  assert.equal(g.log.at(-1).method, 'PUT');
});

test('an append whose reply names no range leaves no hint: the next save looks the row up', async () => {
  const config = configFor();
  const sheet = { rows: [row('S261', 'D1')], appendReply: {} };
  const g = google(sheet);
  const cs = caseOf('S265');
  await saveCase(config, cs, out, g.api);
  sheet.rows.push(row('S265', 'DOC-NEW'));
  g.reset();
  await saveCase(config, cs, out, g.api);
  assert.equal(g.rounds(), 2);
  assert.ok(g.log.some((c) => c.round === 1 && c.url.includes('values:batchGet')));
  assert.match(g.log.find((c) => c.method === 'PUT').url, /values\/A3:H3\?/);
});

test('the Open list reads columns A to G without the case JSON; opening a case reads its one row', async () => {
  const config = configFor();
  const saved = caseOf('S262');
  const sheet = { rows: [row('S261', 'D1'), row('S262', 'D2', saved)] };
  const g = google(sheet);
  const rows = await listCases(config, g.api);
  assert.deepEqual(rows.map((r) => r.accession), ['S261', 'S262']);
  assert.equal(g.log.length, 1);
  assert.match(g.log[0].url, /values\/A2:G\?majorDimension=ROWS/);
  g.reset();
  const opened = await openCase(config, 'S26-2', g.api);
  assert.deepEqual(kinds(g.log).map((k) => k.replace(/SHEET\d+/, 'S')), ['1 GET /v4/spreadsheets/S/values/A3:H3']);
  assert.equal(opened.meta.accession, 'S262');
  assert.equal(opened.drive.docId, 'D2');
});

test('opening a case whose row has moved since the list finds it again', async () => {
  const config = configFor();
  const sheet = { rows: [row('S261', 'D1'), row('S262', 'D2', caseOf('S262'))] };
  const g = google(sheet);
  await listCases(config, g.api);
  sheet.rows.reverse();
  g.reset();
  const opened = await openCase(config, 'S262', g.api);
  assert.equal(opened.drive.docId, 'D2');
  assert.deepEqual(g.log.map((c) => c.url.includes('batchGet') ? 'lookup' : /values\/(A\d+:H\d+)/.exec(c.url)[1]), ['A3:H3', 'lookup', 'A2:H2']);
  await assert.rejects(openCase(config, 'S269', g.api), /No saved case for S269/);
});
