// Copies the static site into dist/ for deploy_website. No bundling; ES modules are served as-is.
import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
// The manifest is regenerated first so dist never ships a stale template list.
const { buildManifest } = await import('../scripts/build-manifest.mjs');
await mkdir(path.join(root, 'templates'), { recursive: true });
await writeFile(path.join(root, 'templates', 'manifest.json'), JSON.stringify(await buildManifest(), null, 2) + '\n');
for (const item of ['index.html', 'styles.css', 'favicon.svg', 'src', 'schemas', 'generators', 'snippets', 'assets', 'templates', 'manifest.webmanifest']) {
  try { await cp(path.join(root, item), path.join(dist, item), { recursive: true }); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
}

// Cache-busting: the host caches assets for hours, so stamp every module import, the CSS link and
// fetch()ed JSON with a build id. Browsers then treat each deploy as fresh URLs.
const build = Date.now().toString(36);
async function stamp(dir) {
  for (const name of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) { await stamp(p); continue; }
    if (!/\.(js|html)$/.test(name.name)) continue;
    let txt = await readFile(p, 'utf8');
    txt = txt.replace(/((?:from|import)\s*['"])(\.{1,2}\/[^'"?]+\.js)(['"])/g, `$1$2?v=${build}$3`);
    txt = txt.replace(/(src=['"]|href=['"])((?:src|schemas|styles)[^'"?]*\.(?:js|css))(['"])/g, `$1$2?v=${build}$3`);
    txt = txt.replace(/(['"`])((?:\.\.\/|\.\/)?schemas\/[^'"`?]+\.json)(['"`])/g, `$1$2?v=${build}$3`);
    txt = txt.replace(/const BUILD = '';/, `const BUILD = '${build}';`); // registry: lazy-loaded schemas, generators and the manifest
    await writeFile(p, txt);
  }
}
await stamp(dist);
console.log('dist/ ready (build ' + build + ')');
