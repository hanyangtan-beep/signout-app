// Pure helpers for the service worker in src/sw.js (docs/specs/speed.md, Phase 79), kept apart so
// the tests can run them in Node. Nothing here touches a cache or the network.
//
// The release is described by sw-files.json, which tools/build-lib.js writes next to sw.js:
//   { release, files: { "<path>": "<sha-256, 12 hex>" }, core: ["<path>", ...], lazy: ["<prefix>", ...] }
// `core` is what the app needs to open (stored when the worker installs), `lazy` the folders that
// are stored only once viewed (the reference photographs); everything else is stored in the
// background after the first open.

/** The cache key of one version of a file: its path and content hash. */
export function keyOf(path, hash) {
  return `${path}?v=${hash}`;
}

/** A URL as a path inside the app's folder (`scope`), or null when it is outside it. */
export function relPath(url, scope) {
  const u = new URL(url);
  const s = new URL(scope);
  if (u.origin !== s.origin || !u.pathname.startsWith(s.pathname)) return null;
  try { return decodeURIComponent(u.pathname.slice(s.pathname.length)); } catch { return null; }
}

/** Is this path one of the folders stored only once viewed? */
export function isLazy(list, path) {
  return (list.lazy || []).some((prefix) => path.startsWith(prefix));
}

/**
 * Which stored copy answers a request, or null when the release does not ship it (another origin,
 * a page outside the app, a file not in the list). A request that names a version (?v=) is answered
 * with that version, which a tab still open on the previous release may ask for; one that names
 * none gets this release's copy. `current` says whether the answer is this release's copy, the only
 * one worth fetching and storing when it is missing.
 */
export function lookup(list, url, scope, mode = 'cors') {
  const rel = relPath(url, scope);
  if (rel === null) return null;
  let path = rel;
  if (mode === 'navigate') {
    if (rel !== '' && rel !== 'index.html') return null;
    path = 'index.html';
  }
  const hash = list.files?.[path];
  if (!hash) return null;
  const asked = mode === 'navigate' ? '' : (new URL(url).searchParams.get('v') || '');
  return { path, hash, key: keyOf(path, asked || hash), current: !asked || asked === hash };
}

/** Paths of `paths` whose current version is not among the stored cache keys (`stored`, path?v=hash). */
export function missing(list, paths, stored) {
  return paths.filter((p) => list.files?.[p] && !stored.has(keyOf(p, list.files[p])));
}

/** Everything stored in the background after the first open: all but the core and the lazy folders. */
export function warmPaths(list) {
  const core = new Set(list.core || []);
  return Object.keys(list.files || {}).filter((p) => !core.has(p) && !isLazy(list, p));
}

/**
 * Cache keys to keep after a release takes over: every file of this release and of the one
 * before it (a tab left open on it may still ask for its files), and the two file lists.
 */
export function keysToKeep(current, previous, listKey = (r) => keyOf('sw-files.json', r)) {
  const keep = new Set();
  for (const list of [current, previous]) {
    if (!list) continue;
    keep.add(listKey(list.release));
    for (const [path, hash] of Object.entries(list.files || {})) keep.add(keyOf(path, hash));
  }
  return keep;
}

/** Hex SHA-256 of a byte buffer, cut to the 12 characters the build names files with. */
export async function sha12(buffer, subtle = globalThis.crypto?.subtle) {
  const digest = new Uint8Array(await subtle.digest('SHA-256', buffer));
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}
