import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupDocUrl } from '../src/drive.js';
import { docUrlFor } from '../src/docformat.js';

function fakeApi(rows) {
  return async (_cfg, url) => {
    if (url.includes('/values:batchGet')) {
      return {
        json: async () => ({
          valueRanges: [
            { values: [rows.map((r) => r.acc)] },
            { values: [rows.map((r) => r.docId)] }
          ]
        })
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
}

test('lookupDocUrl returns the Google Doc URL when accession exists', async () => {
  const cfg = { sheetId: 'sheet-1', sheetName: 'Sign-out cases' };
  const api = fakeApi([
    { acc: 'S25-00100', docId: 'doc-100' },
    { acc: 'S25-00200', docId: 'doc-200' }
  ]);
  const url = await lookupDocUrl(cfg, 's25-00200', api);
  assert.equal(url, docUrlFor('doc-200'));
});

test('lookupDocUrl returns null when accession is missing or blank', async () => {
  const cfg = { sheetId: 'sheet-1', sheetName: 'Sign-out cases' };
  const api = fakeApi([{ acc: 'S25-00100', docId: 'doc-100' }]);
  assert.equal(await lookupDocUrl(cfg, 'S25-99999', api), null);
  assert.equal(await lookupDocUrl(cfg, '   ', api), null);
});
