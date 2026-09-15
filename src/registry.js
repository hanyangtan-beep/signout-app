// Template registry. Boots from the metadata-only manifest (templates/manifest.json, built by
// scripts/build-manifest.mjs) and lazy-loads each schema + generator with dynamic import() on
// first use, so the initial download does not grow as templates are added.
// Works in the browser (fetch + import) and in Node (fs + import).

const BUILD = ''; // tools/build.js stamps this with the build id for cache-busting

const isNode = typeof window === 'undefined';
let manifestPromise = null;
const templateCache = new Map(); // id -> Promise<{ schema, generator }>

function bust(url) {
  if (!BUILD || isNode) return url;
  const u = new URL(url);
  u.searchParams.set('v', BUILD);
  return u;
}

async function readJson(relPath, baseUrl) {
  if (isNode) {
    const { readFile } = await import('node:fs/promises');
    return JSON.parse(await readFile(new URL(`../${relPath}`, import.meta.url), 'utf8'));
  }
  const res = await fetch(bust(new URL(relPath, baseUrl || document.baseURI)));
  if (!res.ok) throw new Error(`Cannot load ${relPath}: ${res.status}`);
  return res.json();
}

/** The manifest's template list (cached after the first call). */
export function loadManifest(baseUrl) {
  if (!manifestPromise) {
    manifestPromise = readJson('templates/manifest.json', baseUrl).then((m) => m.templates)
      .catch((e) => { manifestPromise = null; throw e; });
  }
  return manifestPromise;
}

/** Templates still to build (templates/planned.json) — header placeholders only; never instantiated. */
export function loadPlanned(baseUrl) {
  return readJson('templates/planned.json', baseUrl).then((m) => m.planned || []).catch(() => []);
}

let sharedPromise = null;

/** schemas/_shared.json — canonical definitions for fields that many templates ask identically. */
function loadShared(baseUrl) {
  if (!sharedPromise) {
    sharedPromise = readJson('schemas/_shared.json', baseUrl).then((m) => m.fields || {})
      .catch((e) => { sharedPromise = null; throw e; });
  }
  return sharedPromise;
}

// Replace every { "$use": "<id>" } with the shared definition. Keys written alongside $use win,
// so a template can narrow the label without copying the whole field.
function expandShared(node, shared) {
  if (Array.isArray(node)) return node.map((n) => expandShared(n, shared));
  if (!node || typeof node !== 'object') return node;
  if (typeof node.$use === 'string') {
    const base = shared[node.$use];
    if (!base) throw new Error(`Unknown shared field "${node.$use}"`);
    const { $use: _ignored, ...overrides } = node;
    return { ...base, ...overrides };
  }
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = expandShared(v, shared);
  return out;
}

export async function loadSchema(id, baseUrl) {
  const [schema, shared] = await Promise.all([
    readJson(`schemas/${id}.json`, baseUrl),
    loadShared(baseUrl)
  ]);
  return expandShared(schema, shared);
}

export async function loadGenerator(name) {
  const url = new URL(`../generators/${name}.js`, import.meta.url);
  const mod = await import(isNode ? url.href : bust(url).href);
  return mod.default;
}

/** Schema + generator for one template id, loaded once and cached. */
export function loadTemplate(id, baseUrl) {
  if (!templateCache.has(id)) {
    const p = (async () => {
      const entries = await loadManifest(baseUrl);
      const entry = entries.find((t) => t.id === id);
      if (!entry) throw new Error(`Template ${id} is not installed`);
      const [schema, generator] = await Promise.all([loadSchema(id, baseUrl), loadGenerator(entry.generator)]);
      return { schema, generator };
    })();
    p.catch(() => templateCache.delete(id));
    templateCache.set(id, p);
  }
  return templateCache.get(id);
}

/** Every template, keyed by id (tests and fixture tooling; the app loads lazily). */
export async function loadAll(baseUrl) {
  const entries = await loadManifest(baseUrl);
  const list = await Promise.all(entries.map((t) => loadTemplate(t.id, baseUrl)));
  const out = {};
  for (const t of list) out[t.schema.id] = t;
  return out;
}

/** Template ids in manifest order (most-used small biopsies first). */
export async function templateIds(baseUrl) {
  return (await loadManifest(baseUrl)).map((t) => t.id);
}
