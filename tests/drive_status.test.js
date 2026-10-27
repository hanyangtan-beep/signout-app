// Status from the Open list (src/drive.js setCaseStatus, docs/specs/open-status.md, Phase 80): what
// changing a case's status asks of Google, in how many rounds, and what the Sheet and the Doc hold
// afterwards. A round is a set of calls in flight together; the fake below answers each round at
// once, keeps the Sheet and the Docs, and applies the writes it is sent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers';
import { setCaseStatus, listCases, openCase } from '../src/drive.js';
import { withDocStatus, statusOf, buildDocText } from '../src/docformat.js';

let sheets = 0;
/** A config with its folder and a Sheet of its own (row numbers seen are remembered per Sheet). */
const configFor = () => ({ clientId: 'x', folderId: 'FOLD', sheetId: `STATUS${++sheets}`, sheetName: 'Sign-out cases' });

const BOM = '\uFEFF';
/** A Doc as Drive exports it: a byte-order mark, then the text with Windows line ends. */
const exported = (text) => BOM + text.replace(/\n/g, '\r\n');
const docText = (acc, status = 'draft') => [
  acc, '', 'SPECIMEN:', 'Stomach', '', 'DIAGNOSIS:', 'Stomach, biopsy: no abnormality.', '',
  `Template: Gastric biopsy · Status: ${status} · Saved 2026-10-25 09:30 UTC`
].join('\n');

/**
 * A fake gfetch. `rows` is the Sheet below its header: [accession, updated, status, template,
 * parts, doc_url, doc_id, case_json]; `docs` maps a Doc id to its text, and a Doc not in it answers
 * 404. `fail` names calls to refuse with a 500 ('batchUpdate', 'upload').
 */
function google({ rows = [], docs = {}, fail = [] } = {}) {
  const log = [];
  let round = 0;
  let pending = null;
  const refuse = (status, message) => { throw Object.assign(new Error(`Google API ${status}: ${message}`), { status }); };
  const answer = (c) => {
    const u = c.url;
    if (u.includes('values:batchGet')) return { valueRanges: [{ values: [rows.map((r) => r[0])] }, { values: [rows.map((r) => r[6] || '')] }] };
    if (u.includes('values:batchUpdate')) {
      if (fail.includes('batchUpdate')) refuse(500, 'QA outage');
      const { valueInputOption, data } = JSON.parse(c.body);
      assert.equal(valueInputOption, 'RAW');
      for (const { range, values } of data) {
        const [, col, n] = /^([A-H])(\d+)$/.exec(range);
        rows[n - 2]['ABCDEFGH'.indexOf(col)] = values[0][0];
      }
      return { totalUpdatedCells: data.length };
    }
    let m = /\/drive\/v3\/files\/([^/?]+)\/export\?mimeType=text\/plain$/.exec(u);
    if (m) return m[1] in docs ? docs[m[1]] : refuse(404, 'File not found');
    m = /\/upload\/drive\/v3\/files\/([^/?]+)\?uploadType=media&fields=id$/.exec(u);
    if (m && c.method === 'PATCH') {
      if (fail.includes('upload')) refuse(500, 'QA outage');
      if (!(m[1] in docs)) refuse(404, 'File not found');
      docs[m[1]] = exported(c.body); // Drive re-imports the text; the next export reads it back
      return { id: m[1] };
    }
    m = /\/values\/A2:G\?majorDimension=ROWS$/.exec(u);
    if (m) return { values: rows.map((r) => r.slice(0, 7)) };
    m = /\/values\/A(\d+):H(\d+)\?majorDimension=ROWS$/.exec(u);
    if (m) return { values: rows[m[1] - 2] ? [rows[m[1] - 2]] : undefined };
    throw new Error(`unexpected call: ${c.method} ${u}`);
  };
  const api = (_config, url, init = {}) => {
    if (!pending) {
      round += 1;
      pending = new Promise((resolve) => setImmediate(() => { pending = null; resolve(); }));
    }
    const call = { round, url: decodeURIComponent(url), method: init.method || 'GET', body: init.body };
    log.push(call);
    return pending.then(() => {
      const body = answer(call);
      return { ok: true, status: 200, json: async () => body, text: async () => String(body) };
    });
  };
  return { api, log, rows, docs, rounds: () => round, reset: () => { log.length = 0; round = 0; } };
}

const caseOf = (acc, status = 'draft') => ({ schemaId: 'gastric_biopsy', parts: [{ templateId: 'gastric_biopsy' }], meta: { accession: acc, status, clinical: 'Dyspepsia.' }, drive: { docId: 'D?' } });
const row = (acc, doc, status = 'draft', cs = caseOf(acc, status)) =>
  [acc, '2026-10-25T09:30:00.000Z', status, 'Gastric biopsy', '1', `https://docs.google.com/document/d/${doc}/edit`, doc, JSON.stringify(cs)];
const kinds = (log) => log.map((c) => `${c.round} ${c.method} ${c.url.replace(/^https:\/\/[^/]+/, '').replace(/STATUS\d+/, 'S').replace(/\?.*$/, '')}`);
const savedStatus = (r) => JSON.parse(r[7]).meta.status;

test('statusOf keeps the three statuses, whatever their case and spacing, and nothing else', () => {
  assert.deepEqual(['draft', ' Ready', 'SIGNED ', 'signed'].map(statusOf), ['draft', 'ready', 'signed', 'signed']);
  assert.deepEqual(['', 'pending', 'sign', null, undefined].map(statusOf), ['', '', '', '', '']);
});

test('withDocStatus changes only the status word in the last status line', () => {
  const text = docText('S2601001');
  const got = withDocStatus(exported(text), 'signed');
  assert.equal(got.found, true);
  assert.equal(got.text, text.replace('Status: draft', 'Status: signed'), 'byte-order mark dropped, line ends as a save writes them');
  // A report line that happens to read like the status line is not the one changed.
  const twice = `${docText('S2601001')}\n\nTemplate: Gastric biopsy · Status: draft · Saved 2026-10-26 10:00 UTC`;
  const lines = withDocStatus(twice, 'ready').text.split('\n');
  assert.match(lines.at(-1), /Status: ready · Saved 2026-10-26/);
  assert.match(lines.at(-3), /Status: draft · Saved 2026-10-25/);
  // The line buildDocText writes is the line it finds.
  const built = buildDocText(caseOf('S2601002', 'ready'), { specimens: 'Stomach', microscopy: 'Gastric mucosa.', diagnosis: 'Stomach, biopsy: no abnormality.', source: true });
  assert.match(withDocStatus(built, 'signed').text.split('\n').at(-1), /^Template: .* · Status: signed · Saved \d{4}-\d\d-\d\d \d\d:\d\d UTC$/);
});

test('withDocStatus leaves a Doc alone when it already says so or has no status line', () => {
  assert.deepEqual(withDocStatus(docText('S2601001', 'ready'), 'ready'), { found: true, text: null });
  assert.deepEqual(withDocStatus('S2601001\n\nDIAGNOSIS:\nStomach, biopsy: no abnormality.', 'ready'), { found: false, text: null });
  assert.deepEqual(withDocStatus('', 'ready'), { found: false, text: null });
});

test('from the Open list: the row and the Doc are read together, the row is written in one call, then the Doc', async () => {
  const g = google({ rows: [row('S2601001', 'D1'), row('S2601002', 'D2')], docs: { D1: exported(docText('S2601001')), D2: exported(docText('S2601002')) } });
  const config = configFor();
  await listCases(config, g.api); // the rows are seen, as the Open list sees them
  g.reset();
  const before = g.rows.map((r) => [...r]);
  const got = await setCaseStatus(config, 'S2601002', 'signed', 'D2', g.api);
  assert.deepEqual(got, { status: 'signed', doc: 'updated' });
  assert.equal(g.rounds(), 3);
  assert.deepEqual(kinds(g.log), [
    '1 GET /v4/spreadsheets/S/values/A3:H3',
    '1 GET /drive/v3/files/D2/export',
    '2 POST /v4/spreadsheets/S/values:batchUpdate',
    '3 PATCH /upload/drive/v3/files/D2'
  ]);
  const { data } = JSON.parse(g.log[2].body);
  assert.deepEqual(data.map((d) => d.range), ['C3', 'H3']);
  assert.equal(g.rows[1][2], 'signed');
  assert.equal(savedStatus(g.rows[1]), 'signed');
  // Only the status changed in the saved case; the saved time and the other row stay as they were.
  assert.deepEqual({ ...JSON.parse(g.rows[1][7]), meta: { ...JSON.parse(g.rows[1][7]).meta, status: 'draft' } }, JSON.parse(before[1][7]));
  assert.equal(g.rows[1][1], before[1][1]);
  assert.deepEqual(g.rows[0], before[0]);
  assert.deepEqual(g.rows[1].slice(3, 7), before[1].slice(3, 7));
  // The Doc: its own text, with only the status word in its last line changed.
  assert.equal(g.log[3].body, docText('S2601002').replace('Status: draft', 'Status: signed'));
  // Opening the case afterwards: it opens as Signed.
  assert.equal((await openCase(config, 'S2601002', g.api)).meta.status, 'signed');
});

test('a row not seen this session is looked up first; the Doc is read meanwhile', async () => {
  const g = google({ rows: [row('S2601001', 'D1'), row('S2601002', 'D2')], docs: { D1: exported(docText('S2601001')) } });
  const got = await setCaseStatus(configFor(), 's26-01001', 'ready', 'D1', g.api);
  assert.deepEqual(got, { status: 'ready', doc: 'updated' });
  assert.deepEqual(kinds(g.log), [
    '1 GET /v4/spreadsheets/S/values:batchGet',
    '1 GET /drive/v3/files/D1/export',
    '2 GET /v4/spreadsheets/S/values/A2:H2',
    '3 POST /v4/spreadsheets/S/values:batchUpdate',
    '4 PATCH /upload/drive/v3/files/D1'
  ]);
  assert.equal(g.rows[0][2], 'ready');
});

test('a Sheet sorted by hand since the list: the write follows the accession', async () => {
  const g = google({ rows: [row('S2601001', 'D1'), row('S2601002', 'D2')], docs: { D1: exported(docText('S2601001')), D2: exported(docText('S2601002')) } });
  const config = configFor();
  await listCases(config, g.api); // S2601002 seen at row 3
  g.rows.reverse(); // sorted by hand: S2601002 is now row 2
  g.reset();
  await setCaseStatus(config, 'S2601002', 'ready', 'D2', g.api);
  const write = g.log.find((c) => c.url.includes('values:batchUpdate'));
  assert.deepEqual(JSON.parse(write.body).data.map((d) => d.range), ['C2', 'H2']);
  assert.deepEqual([g.rows[0][0], g.rows[0][2], g.rows[1][0], g.rows[1][2]], ['S2601002', 'ready', 'S2601001', 'draft']);
});

test('the Doc is written only once the row is: a refused row write leaves the Doc as it was', async () => {
  const doc = exported(docText('S2601001'));
  const g = google({ rows: [row('S2601001', 'D1')], docs: { D1: doc }, fail: ['batchUpdate'] });
  await assert.rejects(setCaseStatus(configFor(), 'S2601001', 'signed', 'D1', g.api), /Google API 500: QA outage/);
  assert.ok(!g.log.some((c) => c.method === 'PATCH'), 'the Doc was written after a failed row write');
  assert.equal(g.docs.D1, doc);
  assert.equal(g.rows[0][2], 'draft');
});

test('a Doc deleted, edited without its status line, already right or refused is left as it is; the row is still written', async () => {
  const cases = [
    { docs: {}, doc: 'failed' },                                                           // deleted in Drive (404)
    { docs: { D1: 'S2601001\r\n\r\nDIAGNOSIS:\r\nTyped by hand.' }, doc: 'no-line' },       // status line removed by hand
    { docs: { D1: exported(docText('S2601001', 'signed')) }, doc: 'current' },               // already says Signed
    { docs: { D1: exported(docText('S2601001')) }, doc: 'failed', fail: ['upload'] }          // the upload refused
  ];
  for (const c of cases) {
    const g = google({ rows: [row('S2601001', 'D1')], docs: { ...c.docs }, fail: c.fail || [] });
    const got = await setCaseStatus(configFor(), 'S2601001', 'signed', 'D1', g.api);
    assert.deepEqual(got, { status: 'signed', doc: c.doc }, JSON.stringify(c));
    assert.equal(g.rows[0][2], 'signed');
    assert.equal(g.log.filter((x) => x.method === 'PATCH').length, c.fail ? 1 : 0, JSON.stringify(c));
    if (!c.fail) assert.deepEqual(g.docs, c.docs);
  }
});

test('the row names the Doc: a list that showed another Doc has the row\'s one changed', async () => {
  const g = google({ rows: [row('S2601001', 'D-NEW')], docs: { 'D-OLD': exported(docText('S2601001')), 'D-NEW': exported(docText('S2601001')) } });
  const got = await setCaseStatus(configFor(), 'S2601001', 'ready', 'D-OLD', g.api);
  assert.deepEqual(got, { status: 'ready', doc: 'updated' });
  assert.deepEqual(g.log.filter((c) => c.method === 'PATCH').map((c) => c.url.match(/files\/([^?]+)/)[1]), ['D-NEW']);
  assert.match(g.docs['D-OLD'], /Status: draft/);
});

test('a row with no Doc or no saved case: the status column is still written', async () => {
  const bare = ['S2601001', '2026-10-25T09:30:00.000Z', 'draft', 'Gastric biopsy', '1', '', '', ''];
  const g = google({ rows: [bare] });
  assert.deepEqual(await setCaseStatus(configFor(), 'S2601001', 'ready', '', g.api), { status: 'ready', doc: 'none' });
  const write = g.log.find((c) => c.url.includes('values:batchUpdate'));
  assert.deepEqual(JSON.parse(write.body).data, [{ range: 'C2', values: [['ready']] }]);
  assert.equal(g.rows[0][7], '');
});

test('an unknown status or a case not in the Sheet is refused, and nothing is written', async () => {
  const g = google({ rows: [row('S2601001', 'D1')], docs: { D1: exported(docText('S2601001')) } });
  await assert.rejects(setCaseStatus(configFor(), 'S2601001', 'pending', 'D1', g.api), /Not a status: pending/);
  assert.equal(g.log.length, 0);
  await assert.rejects(setCaseStatus(configFor(), 'S2609999', 'ready', '', g.api), /No saved case for S2609999/);
  assert.ok(!g.log.some((c) => c.method !== 'GET'), 'a write was sent for a case not in the Sheet');
});

test('a case opens with the status in its Sheet column, typed by hand or not; a blank or unknown one keeps the saved case\'s', async () => {
  const rows = [
    row('S2601001', 'D1', 'Signed ', caseOf('S2601001', 'draft')), // typed into the Sheet by hand
    row('S2601002', 'D2', '', caseOf('S2601002', 'ready')),
    row('S2601003', 'D3', 'pending', caseOf('S2601003', 'ready'))
  ];
  const g = google({ rows });
  const config = configFor();
  assert.equal((await openCase(config, 'S2601001', g.api)).meta.status, 'signed');
  assert.equal((await openCase(config, 'S2601002', g.api)).meta.status, 'ready');
  assert.equal((await openCase(config, 'S2601003', g.api)).meta.status, 'ready');
  assert.equal((await openCase(config, 'S2601001', g.api)).meta.clinical, 'Dyspepsia.');
});
