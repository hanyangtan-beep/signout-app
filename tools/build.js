// Copies the static site into dist/ for deploy_website. No bundling; ES modules are served as-is.
import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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

// The in-app Roadmap panel reads a summary of docs/roadmap.md (docs/specs/suggestions-and-roadmap.md).
// "As of" is the Hong Kong date of the roadmap's last commit, or today when the file has
// uncommitted edits, so a deploy never claims an older date than the text it ships.
{
  const { parseRoadmap, summarise } = await import('../src/roadmap.js');
  const file = path.join(root, 'docs', 'roadmap.md');
  let md = null;
  try { md = await readFile(file, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (md !== null) {
    const git = (...args) => { try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
    const edited = git('status', '--porcelain', '--', 'docs/roadmap.md') !== '';
    const committed = Number(git('log', '-1', '--format=%ct', '--', 'docs/roadmap.md'));
    const when = !edited && committed ? new Date(committed * 1000) : new Date();
    const asOf = when.toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' });
    await writeFile(path.join(dist, 'roadmap.json'), JSON.stringify({ asOf, ...summarise(parseRoadmap(md)) }) + '\n');
  }
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
