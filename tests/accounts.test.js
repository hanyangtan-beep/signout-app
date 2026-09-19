// Per-account Drive workspaces: every signed-in address resolves its own folder and Sheet, so two
// colleagues using the published app never write into each other's Drive.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountConfig, accountKey, rememberForAccount, loadConfig, DEFAULTS } from '../src/config.js';
import { ensureFolder, ensureSheet } from '../src/drive.js';

/** A localStorage stand-in that actually stores, so rememberForAccount round-trips. */
async function withStorage(initial, fn) {
  let raw = JSON.stringify(initial);
  globalThis.localStorage = { getItem: () => raw, setItem: (_k, v) => { raw = v; } };
  try { return await fn(() => JSON.parse(raw)); } finally { delete globalThis.localStorage; }
}

/** A fake gfetch. `routes` maps a url substring to the JSON the call returns. */
function fakeApi(routes, log = []) {
  return async (_config, url, init) => {
    log.push({ url, method: init?.method || 'GET', body: init?.body });
    for (const [needle, value] of routes) {
      if (url.includes(needle)) {
        if (value instanceof Error) throw value;
        return { json: async () => value };
      }
    }
    return { json: async () => ({}) };
  };
}

test('an address is folded the way the gate folds it', () => {
  assert.equal(accountKey('  Han.Tan@Gmail.com '), 'han.tan@gmail.com');
  assert.equal(accountKey(undefined), '');
});

test('each address reads its own folder and sheet ids', () => {
  const config = { ...DEFAULTS, accounts: { 'a@gmail.com': { folderId: 'FA', sheetId: 'SA' }, 'b@gmail.com': { folderId: 'FB', sheetId: 'SB' } } };
  assert.equal(accountConfig(config, 'A@gmail.com').folderId, 'FA');
  assert.equal(accountConfig(config, 'b@gmail.com').sheetId, 'SB');
  // Nobody signed in: the plain config, and no account key to write under.
  assert.equal(accountConfig(config, '').account, '');
  assert.equal(accountConfig(config, '').folderId, DEFAULTS.folderId);
});

test('a resolved id is remembered under that address alone', async () => {
  await withStorage({}, (read) => {
    const cfg = accountConfig(loadConfig(), 'b@gmail.com');
    rememberForAccount(cfg, { folderId: 'FB' });
    assert.equal(cfg.folderId, 'FB');                       // mirrored onto the live config
    assert.deepEqual(read().accounts, { 'b@gmail.com': { folderId: 'FB' } });
    assert.equal(read().folderId, DEFAULTS.folderId);       // the shared default is untouched
  });
});

test('a corrupted account store is ignored rather than spread over the defaults', async () => {
  await withStorage({ accounts: 'nonsense' }, () => assert.deepEqual(loadConfig().accounts, {}));
  await withStorage({ accounts: ['a'] }, () => assert.deepEqual(loadConfig().accounts, {}));
});

test('a folder this account can write to is kept', async () => {
  const api = fakeApi([['files/FOLDER', { id: 'FOLDER', mimeType: 'application/vnd.google-apps.folder', capabilities: { canAddChildren: true } }]]);
  const config = { ...DEFAULTS, folderId: 'FOLDER', account: 'a@gmail.com' };
  await withStorage({}, async () => assert.equal(await ensureFolder(config, api), 'FOLDER'));
});

test('an account that cannot see the configured folder gets its own', async () => {
  const log = [];
  const api = fakeApi([
    ['files/FOLDER', new Error('Google API 404: File not found')],  // another colleague's folder
    ['files?q=', { files: [] }],                                    // none of their own yet
    ['files?fields=id', { id: 'NEW' }]
  ], log);
  const config = { ...DEFAULTS, folderId: 'FOLDER', account: 'b@gmail.com' };
  await withStorage({}, async (read) => {
    assert.equal(await ensureFolder(config, api), 'NEW');
    assert.deepEqual(read().accounts, { 'b@gmail.com': { folderId: 'NEW', sheetId: '' } });
  });
  const created = JSON.parse(log.find((c) => c.method === 'POST').body);
  assert.equal(created.name, 'Pathology reports');
  assert.equal(created.mimeType, 'application/vnd.google-apps.folder');
});

test('a folder the account already made is reused, not made again', async () => {
  const log = [];
  const api = fakeApi([
    ['files/FOLDER', new Error('Google API 404: File not found')],
    ['files?q=', { files: [{ id: 'MINE', name: 'Pathology reports' }] }]
  ], log);
  const config = { ...DEFAULTS, folderId: 'FOLDER', account: 'b@gmail.com' };
  await withStorage({}, async () => assert.equal(await ensureFolder(config, api), 'MINE'));
  assert.equal(log.filter((c) => c.method === 'POST').length, 0);
});

test('a trashed folder is not written into', async () => {
  const api = fakeApi([
    ['files/FOLDER', { id: 'FOLDER', mimeType: 'application/vnd.google-apps.folder', trashed: true, capabilities: { canAddChildren: true } }],
    ['files?q=', { files: [{ id: 'MINE' }] }]
  ]);
  const config = { ...DEFAULTS, folderId: 'FOLDER', account: 'b@gmail.com' };
  await withStorage({}, async () => assert.equal(await ensureFolder(config, api), 'MINE'));
});

test('a read-only shared folder is not written into', async () => {
  const api = fakeApi([
    ['files/FOLDER', { id: 'FOLDER', mimeType: 'application/vnd.google-apps.folder', capabilities: { canAddChildren: false } }],
    ['files?q=', { files: [{ id: 'MINE' }] }]
  ]);
  const config = { ...DEFAULTS, folderId: 'FOLDER', account: 'b@gmail.com' };
  await withStorage({}, async () => assert.equal(await ensureFolder(config, api), 'MINE'));
});

test('the case sheet is looked for inside this account\'s folder', async () => {
  const log = [];
  const api = fakeApi([
    ['files/FOLDER', { id: 'FOLDER', mimeType: 'application/vnd.google-apps.folder', capabilities: { canAddChildren: true } }],
    ['files?q=', { files: [{ id: 'SHEET' }] }]
  ], log);
  const config = { ...DEFAULTS, folderId: 'FOLDER', account: 'a@gmail.com' };
  await withStorage({}, async (read) => {
    assert.equal(await ensureSheet(config, api), 'SHEET');
    assert.deepEqual(read().accounts, { 'a@gmail.com': { sheetId: 'SHEET' } });
  });
  const search = decodeURIComponent(log.find((c) => c.url.includes('files?q=')).url).replace(/\+/g, ' ');
  assert.match(search, /'FOLDER' in parents/);
  assert.match(search, /name='Sign-out cases'/);
});
