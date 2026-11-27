import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteCase, listCases } from '../src/drive.js';

let sheets = 0;
const configFor = () => ({ clientId: 'x', folderId: 'FOLD', sheetId: `DEL${++sheets}`, sheetName: 'Sign-out cases' });

function google({ rows = [], docs = {}, fail = [] } = {}) {
  const log = [];
  const refuse = (status, message) => { throw Object.assign(new Error(`Google API ${status}: ${message}`), { status }); };
  const api = async (_config, url, init = {}) => {
    const u = decodeURIComponent(url);
    const method = init.method || 'GET';
    log.push({ method, url: u, body: init.body });

    if (u.includes('values:batchGet')) {
      return { ok: true, status: 200, json: async () => ({ valueRanges: [{ values: [rows.map((r) => r[0])] }, { values: [rows.map((r) => r[6] || '')] }] }) };
    }
    let m = /\/values\/A(\d+)\?majorDimension=COLUMNS$/.exec(u);
    if (m) {
      const r = rows[m[1] - 2];
      return { ok: true, status: 200, json: async () => ({ values: r ? [[r[0]]] : [] }) };
    }
    m = /\/values\/A2:G\?majorDimension=ROWS$/.exec(u);
    if (m) {
      return { ok: true, status: 200, json: async () => ({ values: rows.map((r) => r.slice(0, 7)) }) };
    }
    m = /\/values\/A(\d+):H(\d+):clear$/.exec(u);
    if (m && method === 'POST') {
      if (fail.includes('clear')) refuse(500, 'Sheet clear failed');
      rows[m[1] - 2] = ['', '', '', '', '', '', '', ''];
      return { ok: true, status: 200, json: async () => ({ clearedRange: `A${m[1]}:H${m[1]}` }) };
    }
    m = /\/drive\/v3\/files\/([^/?]+)\?fields=id,trashed$/.exec(u);
    if (m && method === 'PATCH') {
      if (fail.includes('trash')) refuse(500, 'Trash failed');
      if (!(m[1] in docs)) refuse(404, 'Not found');
      docs[m[1]].trashed = JSON.parse(init.body).trashed;
      return { ok: true, status: 200, json: async () => ({ id: m[1], trashed: true }) };
    }
    throw new Error(`unexpected call: ${method} ${u}`);
  };
  return { api, log, rows, docs };
}

const row = (acc, doc) => [acc, '2026-11-27T10:00:00.000Z', 'draft', 'gastric_biopsy', '1', `https://docs.google.com/document/d/${doc}/edit`, doc, '{}'];

test('deleteCase clears the Sheet row and moves the Google Doc to Drive Trash', async () => {
  const g = google({ rows: [row('S2601001', 'D1'), row('S2601002', 'D2')], docs: { D1: { trashed: false }, D2: { trashed: false } } });
  const config = configFor();
  await listCases(config, g.api);
  const res = await deleteCase(config, 'S2601001', 'D1', g.api);
  assert.deepEqual(res, { deleted: true, doc: 'trashed' });
  assert.equal(g.rows[0][0], '');
  assert.equal(g.rows[1][0], 'S2601002');
  assert.equal(g.docs.D1.trashed, true);
  assert.equal(g.docs.D2.trashed, false);
  const remaining = await listCases(config, g.api);
  assert.deepEqual(remaining.map((r) => r.accession), ['S2601002']);
});

test('deleteCase handles a missing Doc (404) cleanly after clearing the Sheet row', async () => {
  const g = google({ rows: [row('S2601001', 'D-GONE')], docs: {} });
  const res = await deleteCase(configFor(), 'S2601001', 'D-GONE', g.api);
  assert.deepEqual(res, { deleted: true, doc: 'missing' });
  assert.equal(g.rows[0][0], '');
});

test('deleteCase refuses an unknown accession without writing anything', async () => {
  const g = google({ rows: [row('S2601001', 'D1')], docs: { D1: { trashed: false } } });
  await assert.rejects(deleteCase(configFor(), 'S2699999', '', g.api), /No saved case for S2699999/);
  assert.ok(!g.log.some((c) => c.method !== 'GET'));
});
