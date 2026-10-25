/* global self, caches, Response, __RELEASE__ */
// Service worker: keeps the app on this computer (docs/specs/speed.md, Phase 79). tools/build-lib.js
// bundles it into dist/sw.js with the release id in place of __RELEASE__; a source checkout never
// registers it (src/offline.js).
//
// It stores the files of the release in sw-files.json and nothing else: never a response from
// another origin (Google sign-in, Drive and Sheets go straight to Google), never case data or a
// token (those stay in the tab's sessionStorage and in Drive). Every file is stored under its path
// and content hash, and checked against that hash before it is stored, so a stale copy from the
// host's cache cannot slip in under a new name.
//
// A release: the browser compares this small file on each open and every hour (src/offline.js).
// When it differs, the new worker stores only the files whose hash changed (the others are already
// here under the same key) and waits; the open case keeps running on the old release until the
// next New case or Save & new, which hands over and reloads (or until the app is next opened with
// no other tab of it open). Recovery: open the app with ?nosw to remove the worker and its files.

import { keyOf, lookup, missing, warmPaths, keysToKeep, sha12 } from './swlogic.js';

const RELEASE = __RELEASE__;
const CACHE = 'signout-files';
const LIST = keyOf('sw-files.json', RELEASE);

const scope = () => self.registration.scope;
const abs = (rel) => new URL(rel, scope()).href;

let listPromise = null;
/** This release's file list, from the cache once installed. */
function fileList() {
  if (!listPromise) {
    listPromise = (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(abs(LIST));
      if (hit) return hit.json();
      const res = await fetch(abs(LIST), { cache: 'no-store' });
      if (!res.ok) throw new Error(`sw-files.json: ${res.status}`);
      const list = await res.clone().json();
      if (list.release !== RELEASE) throw new Error('sw-files.json belongs to another release');
      await cache.put(abs(LIST), res);
      return list;
    })();
    listPromise.catch(() => { listPromise = null; });
  }
  return listPromise;
}

let retiring = false; // ?nosw: from then on nothing is stored, and every request goes to the host

/** Fetch one file of this release and store it, if what arrived is the content the release names. */
async function store(cache, path, hash) {
  const url = abs(keyOf(path, hash));
  for (const mode of ['default', 'reload']) { // 'reload' once more if the browser's own cache held another copy
    const res = await fetch(url, { cache: mode });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    if (await sha12(await res.clone().arrayBuffer()) === hash) return retiring ? undefined : cache.put(url, res);
  }
  throw new Error(`${path}: the host sent content that is not this release's`);
}

/** Run `fn` over `items`, `width` at a time. */
async function pool(items, width, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(width, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift());
  }));
}

async function storedKeys(cache) {
  const scopeUrl = scope();
  return new Set((await cache.keys()).map((r) => r.url.slice(scopeUrl.length)));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const list = await fileList();
    const cache = await caches.open(CACHE);
    const need = missing(list, list.core, await storedKeys(cache));
    await pool(need, 6, (p) => store(cache, p, list.files[p]));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
    const cache = await caches.open(CACHE);
    const list = await fileList();
    // The release before this one is the newest other file list here (keys keep insertion order).
    const lists = (await cache.keys()).filter((r) => /\/sw-files\.json\?v=/.test(r.url) && r.url !== abs(LIST));
    const prevRes = lists.length ? await cache.match(lists[lists.length - 1]) : null;
    const previous = prevRes ? await prevRes.json().catch(() => null) : null;
    const keep = keysToKeep(list, previous);
    const scopeUrl = scope();
    for (const req of await cache.keys()) if (!keep.has(req.url.slice(scopeUrl.length))) await cache.delete(req);
    await self.clients.claim();
  })());
});

let warming = null;
/** Store the rest of the app and every template, a few at a time; failures wait for the next open. */
function warm() {
  if (!warming) {
    warming = (async () => {
      const list = await fileList();
      const cache = await caches.open(CACHE);
      const need = missing(list, warmPaths(list), await storedKeys(cache));
      await pool(need, 4, (p) => (retiring ? undefined : store(cache, p, list.files[p]).catch(() => {})));
    })().finally(() => { warming = null; });
  }
  return warming;
}

/** ?nosw: remove this worker and everything it stored. */
async function retire() {
  retiring = true;
  await self.registration.unregister();
  for (const name of await caches.keys()) await caches.delete(name);
}

self.addEventListener('message', (event) => {
  const type = event.data?.type;
  if (type === 'activate') self.skipWaiting();
  else if (type === 'warm') event.waitUntil(warm());
  else if (type === 'release') event.ports[0]?.postMessage({ release: RELEASE });
});

async function answer(request) {
  const list = await fileList();
  const hit = lookup(list, request.url, scope(), request.mode);
  if (!hit) return fetch(request);
  const cache = await caches.open(CACHE);
  const cached = await cache.match(abs(hit.key));
  if (cached) return cached;
  if (!hit.current) return fetch(request); // an older copy nobody stored: whatever the host has
  const url = abs(hit.key);
  const res = await fetch(url);
  if (res.ok) {
    const copy = res.clone();
    copy.arrayBuffer().then(async (buf) => { if (await sha12(buf) === hit.hash && !retiring) await cache.put(url, new Response(buf, { status: res.status, statusText: res.statusText, headers: res.headers })); }).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !request.url.startsWith(scope())) return; // Google, fonts: untouched
  if (url.searchParams.has('nosw')) event.waitUntil(retire());
  if (retiring) return; // straight to the network
  event.respondWith(answer(request).catch(() => fetch(request)));
});
