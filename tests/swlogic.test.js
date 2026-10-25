// The offline copy's decisions (src/swlogic.js, docs/specs/speed.md, Phase 79): which stored
// file answers a request, what a release still has to fetch, what is kept when one takes over.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { keyOf, relPath, isLazy, lookup, missing, warmPaths, keysToKeep, sha12 } from '../src/swlogic.js';

const SCOPE = 'https://han-signout.pplx.app/';
const list = {
  release: 'r2',
  files: {
    'index.html': 'h-index',
    'src/app.js': 'h-app',
    'schemas/gastric_biopsy.json': 'h-gastric',
    'schemas/skin_cyst.json': 'h-cyst',
    'assets/reference/skin/a.webp': 'h-photo'
  },
  core: ['index.html', 'src/app.js', 'schemas/gastric_biopsy.json'],
  lazy: ['assets/reference/']
};

test('a file version is stored under its path and content hash', () => {
  assert.equal(keyOf('src/app.js', 'abc123'), 'src/app.js?v=abc123');
});

test('only URLs inside the app folder of this origin are the app\'s', () => {
  assert.equal(relPath('https://han-signout.pplx.app/src/app.js?v=1', SCOPE), 'src/app.js');
  assert.equal(relPath('https://han-signout.pplx.app/', SCOPE), '');
  assert.equal(relPath('https://han-signout.pplx.app/assets/reference/a%20b.webp', SCOPE), 'assets/reference/a b.webp');
  assert.equal(relPath('https://sheets.googleapis.com/v4/spreadsheets/x', SCOPE), null);
  assert.equal(relPath('https://han-signout.pplx.app/other/x.js', 'https://han-signout.pplx.app/app/'), null);
  assert.equal(isLazy(list, 'assets/reference/skin/a.webp'), true);
  assert.equal(isLazy(list, 'schemas/skin_cyst.json'), false);
});

test('opening the app is answered with this release\'s index.html; other pages are not the app\'s', () => {
  for (const url of [SCOPE, SCOPE + 'index.html', SCOPE + '?t=1#part-2']) {
    assert.deepEqual(lookup(list, url, SCOPE, 'navigate'), { path: 'index.html', hash: 'h-index', key: 'index.html?v=h-index', current: true });
  }
  assert.equal(lookup(list, SCOPE + 'docs/roadmap.md', SCOPE, 'navigate'), null);
});

test('a request naming a version gets that version; one naming none gets this release\'s', () => {
  assert.deepEqual(lookup(list, SCOPE + 'src/app.js?v=h-app', SCOPE), { path: 'src/app.js', hash: 'h-app', key: 'src/app.js?v=h-app', current: true });
  // A tab still on the previous release asks for its own copy, which is not this release's.
  assert.deepEqual(lookup(list, SCOPE + 'src/app.js?v=h-old', SCOPE), { path: 'src/app.js', hash: 'h-app', key: 'src/app.js?v=h-old', current: false });
  assert.equal(lookup(list, SCOPE + 'schemas/skin_cyst.json', SCOPE).key, 'schemas/skin_cyst.json?v=h-cyst');
});

test('files the release does not ship, and other origins, are left to the network', () => {
  assert.equal(lookup(list, SCOPE + 'schemas/not_a_template.json', SCOPE), null);
  assert.equal(lookup(list, 'https://www.googleapis.com/drive/v3/files', SCOPE), null);
  assert.equal(lookup(list, 'https://accounts.google.com/o/oauth2/v2/auth', SCOPE, 'navigate'), null);
});

test('a release fetches only the files whose hash changed', () => {
  const stored = new Set(['index.html?v=h-old-index', 'src/app.js?v=h-app', 'schemas/gastric_biopsy.json?v=h-gastric']);
  assert.deepEqual(missing(list, list.core, stored), ['index.html']);
  assert.deepEqual(missing(list, ['schemas/skin_cyst.json', 'schemas/gone.json'], stored), ['schemas/skin_cyst.json']);
});

test('the background warm-up takes everything but the install files and the photographs', () => {
  assert.deepEqual(warmPaths(list), ['schemas/skin_cyst.json']);
});

test('a release keeps its own files and the previous release\'s, nothing older', () => {
  const previous = { release: 'r1', files: { 'index.html': 'h-old-index', 'src/app.js': 'h-app' } };
  const keep = keysToKeep(list, previous);
  for (const k of ['sw-files.json?v=r2', 'sw-files.json?v=r1', 'index.html?v=h-index', 'index.html?v=h-old-index', 'src/app.js?v=h-app', 'assets/reference/skin/a.webp?v=h-photo']) {
    assert.ok(keep.has(k), k);
  }
  assert.equal(keep.has('index.html?v=h-older'), false);
  assert.equal(keysToKeep(list, null).has('sw-files.json?v=r1'), false);
});

test('the worker hashes bytes exactly as the build does', async () => {
  for (const text of ['', 'Sign-out', '{"a":1}\n', 'é'.repeat(1000)]) {
    const bytes = new TextEncoder().encode(text);
    assert.equal(await sha12(bytes), createHash('sha256').update(bytes).digest('hex').slice(0, 12));
  }
});
