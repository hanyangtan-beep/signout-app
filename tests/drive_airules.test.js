import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mergeAiRules } from '../src/aifeedback.js';
import { loadDriveAiRules, saveDriveAiRules } from '../src/drive.js';

function makeResponse(body, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    async json() { return body; },
    async text() { return typeof body === 'string' ? body : JSON.stringify(body); }
  };
}

test('mergeAiRules combines remote and local rules without case-insensitive duplicates', () => {
  const merged = mergeAiRules(
    ['Keep (AE) in block keys.', 'Do not flag telegraphic microscopy.'],
    ['keep (ae) in block keys.', 'Use British English spelling.']
  );
  assert.deepEqual(merged, [
    'keep (ae) in block keys.',
    'Use British English spelling.',
    'Do not flag telegraphic microscopy.'
  ]);
});

test('loadDriveAiRules returns found:false when ai-rules.json does not exist yet', async () => {
  const calls = [];
  const api = async (_cfg, url) => {
    calls.push(url);
    if (url.includes('/files/folder-1?')) return makeResponse({ id: 'folder-1', trashed: false, mimeType: 'application/vnd.google-apps.folder', capabilities: { canAddChildren: true } });
    if (url.includes("ai-rules.json")) return makeResponse({ files: [] });
    throw new Error(`Unexpected URL: ${url}`);
  };
  const res = await loadDriveAiRules({ folderId: 'folder-1' }, api);
  assert.equal(res.found, false);
  assert.deepEqual(res.rules, []);
  assert.equal(calls.length, 2);
});

test('saveDriveAiRules creates ai-rules.json on first save and patches in place on subsequent saves', async () => {
  let stored = null;
  let methodSeen = [];
  const api = async (_cfg, url, opts = {}) => {
    methodSeen.push(opts.method || 'GET');
    if (url.includes('/files/folder-1?')) return makeResponse({ id: 'folder-1', trashed: false, mimeType: 'application/vnd.google-apps.folder', capabilities: { canAddChildren: true } });
    if (url.includes('ai-rules.json')) return makeResponse({ files: stored ? [{ id: 'rules-file-1' }] : [] });
    if (url.includes('uploadType=multipart') && opts.method === 'POST') {
      const parts = String(opts.body).split('\r\n\r\n');
      const jsonPart = parts[parts.length - 1].split('\r\n--')[0];
      stored = JSON.parse(jsonPart);
      return makeResponse({ id: 'rules-file-1' });
    }
    if (url.includes('/files/rules-file-1?uploadType=media') && opts.method === 'PATCH') {
      stored = JSON.parse(opts.body);
      return makeResponse({ id: 'rules-file-1' });
    }
    if (url.includes('/files/rules-file-1?alt=media')) {
      return makeResponse(stored);
    }
    throw new Error(`Unexpected call: ${opts.method || 'GET'} ${url}`);
  };

  const first = await saveDriveAiRules({ folderId: 'folder-1' }, ['Keep (AE) in block keys.'], api);
  assert.equal(first.fileId, 'rules-file-1');
  assert.equal(first.count, 1);

  const loaded = await loadDriveAiRules({ folderId: 'folder-1' }, api);
  assert.equal(loaded.found, true);
  assert.deepEqual(loaded.rules, ['Keep (AE) in block keys.']);

  const second = await saveDriveAiRules({ folderId: 'folder-1' }, ['Keep (AE) in block keys.', 'Prefer (B) over Part B.'], api);
  assert.equal(second.fileId, 'rules-file-1');
  assert.equal(second.count, 2);
  assert.ok(methodSeen.includes('POST'));
  assert.ok(methodSeen.includes('PATCH'));
});
