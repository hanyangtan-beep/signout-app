// Builds the static site in dist/ for deploy_website (docs/specs/speed.md, Phase 79).
//
//   1. The manifest is regenerated first, so dist never ships a stale template list.
//   2. The app and every generator are bundled and minified with esbuild
//      (https://esbuild.github.io/api/#splitting): code they share goes into content-named chunks,
//      so start-up is a handful of requests rather than a chain of two dozen modules. The CNS
//      modules, which app.js imports only when a CNS form opens, become chunks of their own.
//   3. Every file is named by its content: `?v=<first 12 hex of its SHA-256>`, so a release changes
//      the URL of the files that changed and of no others (chunks carry esbuild's hash in the name).
//   4. index.html gets the release id, a map of lazily loaded files to their hashes (read by
//      src/registry.js) and a small script that, when no offline copy is answering, preloads
//      everything start-up needs together with the template the tab will open (MDN:
//      developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload). With
//      the offline copy in charge the files are on the computer already, and Chrome would discard
//      the preloads anyway ("cross-world service worker resource mismatch") and fetch twice, the
//      reason Angular's build stopped emitting them with a service worker
//      (github.com/angular/angular-cli/commit/d396324b4eb3b16640526a64365d953642bc7ca1).
//   5. sw.js and sw-files.json keep the app on each computer (src/sw.js, src/swlogic.js).
//
// The source tree stays unbundled: the tests, `npm run qa` and local development load src/ as is.
// Steps 3-5 are `finalise()`, which tools/qa-dist.js re-runs on a copy of dist to stage a release.

import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as esbuild from 'esbuild';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const STATIC = ['styles.css', 'favicon.svg', 'schemas', 'snippets', 'assets', 'templates', 'manifest.webmanifest'];
const OWN = new Set(['index.html', 'sw.js', 'sw-files.json']); // written by finalise(), from everything else
const LAZY = ['assets/reference/']; // stored by the worker only once viewed
const TARGET = ['es2022'];

export const sha12 = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 12);

async function walk(dir, base = dir) {
  const out = [];
  for (const d of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) out.push(...await walk(p, base));
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out.sort();
}

/** Static imports of one bundled file, as dist paths (esbuild writes `from"../chunks/x.js"` and `import"./x.js"`). */
export function staticImports(rel, code) {
  const out = [];
  for (const m of code.matchAll(/(?:\bfrom|\bimport)\s*["'](\.{1,2}\/[^"']+\.js)["']/g)) {
    out.push(path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1])));
  }
  return out;
}

/** Every chunk a bundled entry loads before it runs: its static imports, theirs, and so on. */
export function closure(entry, importsOf) {
  const seen = new Set();
  const visit = (f) => { for (const d of importsOf(f) || []) if (!seen.has(d)) { seen.add(d); visit(d); } };
  visit(entry);
  return [...seen].sort();
}

/** The template a fresh tab opens: the first small biopsy (src/picker.js biopsyRow). */
async function defaultTemplate(root, manifest) {
  const { biopsyRow } = await import(path.join(root, 'src', 'picker.js'));
  return biopsyRow(manifest)[0]?.id || manifest[0]?.id;
}

/** Hash every file, write index.html, sw-files.json and sw.js. Returns what the release consists of. */
export async function finalise(outDir, { root = ROOT } = {}) {
  const files = {};
  const code = {};
  for (const rel of await walk(outDir)) {
    if (OWN.has(rel)) continue;
    const buf = await readFile(path.join(outDir, rel));
    files[rel] = sha12(buf);
    if (rel.endsWith('.js')) code[rel] = buf.toString('utf8');
  }
  const importsOf = (rel) => (code[rel] === undefined ? [] : staticImports(rel, code[rel]));
  const manifest = JSON.parse(await readFile(path.join(outDir, 'templates', 'manifest.json'), 'utf8')).templates;
  const open = await defaultTemplate(root, manifest);
  const appChunks = closure('src/app.js', importsOf);
  const appSet = new Set(appChunks);

  // Per template: its generator; per generator: the chunks it needs that the app has not already loaded.
  const templates = {};
  for (const t of manifest) templates[t.id] = t.generatorPath || `generators/${t.generator}.js`;
  const chunks = [];
  const deps = {};
  for (const gen of new Set(Object.values(templates))) {
    deps[gen] = closure(gen, importsOf).filter((c) => !appSet.has(c)).map((c) => {
      if (!chunks.includes(c)) chunks.push(c);
      return chunks.indexOf(c);
    });
  }
  const pageFiles = {}; // what the page itself versions: templates, schemas, generators, the roadmap summary
  for (const [rel, h] of Object.entries(files)) {
    if (/^(templates\/[^/]+\.json|schemas\/[^/]+\.json|generators\/[^/]+\.js|roadmap\.json)$/.test(rel)) pageFiles[rel] = h;
  }

  const release = sha12(JSON.stringify(Object.entries(files)));
  const v = (rel) => `${rel}?v=${files[rel]}`;
  const boot = {
    modules: [v('src/app.js'), ...appChunks],
    fetches: ['templates/manifest.json', 'templates/planned.json', 'schemas/_shared.json'].filter((rel) => files[rel]).map(v)
  };
  const data = { build: release, open, boot, files: pageFiles, templates, chunks, deps };
  const head = [
    `<script id="signout-files" type="application/json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`,
    `<script>${preloadScript()}</script>`
  ].map((l) => `  ${l}`).join('\n');

  let html = await readFile(path.join(root, 'index.html'), 'utf8');
  const swap = (from, to) => {
    if (html.split(from).length !== 2) throw new Error(`index.html: expected one ${from}`);
    html = html.replace(from, to);
  };
  swap('<html lang="en-GB">', `<html lang="en-GB" data-build="${release}">`);
  swap('<link rel="icon"', `${head.trimStart()}\n  <link rel="icon"`);
  swap('href="styles.css"', `href="${v('styles.css')}"`);
  swap('src="src/app.js"', `src="${v('src/app.js')}"`);
  await writeFile(path.join(outDir, 'index.html'), html);
  files['index.html'] = sha12(Buffer.from(html));

  // What the worker stores when it installs: enough to open the app on the template a fresh tab opens.
  const openGen = templates[open];
  const core = [...new Set([
    'index.html', 'src/app.js', ...appChunks, 'styles.css', 'favicon.svg', 'manifest.webmanifest',
    'templates/manifest.json', 'templates/planned.json', 'schemas/_shared.json', 'assets/icons/organ-icons-sprite.svg',
    `schemas/${open}.json`, openGen, ...closure(openGen, importsOf)
  ])].filter((rel) => files[rel]);
  const list = { release, files, core, lazy: LAZY };
  await writeFile(path.join(outDir, 'sw-files.json'), JSON.stringify(list) + '\n');
  await esbuild.build({
    absWorkingDir: root, entryPoints: ['src/sw.js'], outfile: path.join(outDir, 'sw.js'),
    bundle: true, format: 'iife', minify: true, target: TARGET, charset: 'utf8', logLevel: 'warning',
    define: { __RELEASE__: JSON.stringify(release) }
  });
  return { release, files, core, appChunks, open, data };
}

/**
 * The inline start-up script: classic, and ahead of every style sheet so nothing holds it up.
 *   ?nosw  removes the offline copy and keeps it off in this browser; ?sw turns it back on
 *          (docs/specs/speed.md). Either way the page then reloads without the parameter.
 *   Otherwise, unless the offline copy answers this tab, it preloads the app, its chunks, the
 *   template lists and the template this tab opens (its draft's, one per part, else the default).
 */
export function preloadScript() {
  return [
    '(function(){',
    'var q=new URLSearchParams(location.search),sw=navigator.serviceWorker;',
    'function clean(k){q.delete(k);var s=q.toString();location.replace(location.pathname+(s?"?"+s:"")+location.hash)}',
    'if(q.has("sw")){try{localStorage.removeItem("signout.nosw")}catch(e){}clean("sw");return}',
    'if(q.has("nosw")){try{localStorage.setItem("signout.nosw","1")}catch(e){}',
    'Promise.all([sw?sw.getRegistrations().then(function(r){return Promise.all(r.map(function(x){return x.unregister()}))}):0,',
    'window.caches?caches.keys().then(function(k){return Promise.all(k.map(function(n){return caches.delete(n)}))}):0]).catch(function(){}).then(function(){clean("nosw")});return}',
    'if(sw&&sw.controller)return;',
    'var d;try{d=JSON.parse(document.getElementById("signout-files").textContent)}catch(e){return}',
    'var seen={},head=document.head;function add(rel,href,fetchAs){if(seen[href])return;seen[href]=1;var l=document.createElement("link");l.rel=rel;l.href=href;if(fetchAs){l.as="fetch";l.crossOrigin="anonymous"}head.appendChild(l)}',
    'function v(p){return d.files[p]?p+"?v="+d.files[p]:p}',
    'd.boot.modules.forEach(function(m){add("modulepreload",m)});d.boot.fetches.forEach(function(f){add("preload",f,1)});',
    'var ids=[];try{var c=JSON.parse(sessionStorage.getItem("signout.case.v1"));(c.parts||[]).forEach(function(p){var id=p.templateId||c.schemaId;if(ids.indexOf(id)<0)ids.push(id)})}catch(e){}',
    'if(!ids.length)ids=[d.open];',
    'ids.slice(0,4).forEach(function(id){var g=d.templates[id];if(!g)return;add("preload",v("schemas/"+id+".json"),1);add("modulepreload",v(g));(d.deps[g]||[]).forEach(function(i){add("modulepreload",d.chunks[i])})})',
    '})();'
  ].join('');
}

/**
 * The whole build: copy, bundle, roadmap summary, finalise. `writeManifest: false` leaves the
 * source tree's templates/manifest.json alone (tests/build.test.js builds into a temporary folder).
 */
export async function buildSite({ root = ROOT, outDir = path.join(root, 'dist'), writeManifest = true } = {}) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const { buildManifest } = await import(path.join(root, 'scripts', 'build-manifest.mjs'));
  const manifest = await buildManifest();
  const manifestText = JSON.stringify(manifest, null, 2) + '\n';
  if (writeManifest) {
    await mkdir(path.join(root, 'templates'), { recursive: true });
    await writeFile(path.join(root, 'templates', 'manifest.json'), manifestText);
  }
  for (const item of STATIC) {
    try { await cp(path.join(root, item), path.join(outDir, item), { recursive: true }); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  await mkdir(path.join(outDir, 'templates'), { recursive: true });
  await writeFile(path.join(outDir, 'templates', 'manifest.json'), manifestText);

  const generators = [...new Set(manifest.templates.map((t) => t.generatorPath || `generators/${t.generator}.js`))].sort();
  await esbuild.build({
    absWorkingDir: root, entryPoints: ['src/app.js', ...generators], outdir: outDir, outbase: '.',
    bundle: true, splitting: true, format: 'esm', minify: true, target: TARGET, charset: 'utf8',
    entryNames: '[dir]/[name]', chunkNames: 'chunks/[name]-[hash]', external: ['node:*'], logLevel: 'warning'
  });

  // The in-app Roadmap panel reads a summary of docs/roadmap.md (docs/specs/suggestions-and-roadmap.md).
  // "As of" is the Hong Kong date of the roadmap's last commit, or today when the file has
  // uncommitted edits, so a deploy never claims an older date than the text it ships.
  const { parseRoadmap, summarise } = await import(path.join(root, 'src', 'roadmap.js'));
  let md = null;
  try { md = await readFile(path.join(root, 'docs', 'roadmap.md'), 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (md !== null) {
    const git = (...args) => { try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
    const edited = git('status', '--porcelain', '--', 'docs/roadmap.md') !== '';
    const committed = Number(git('log', '-1', '--format=%ct', '--', 'docs/roadmap.md'));
    const when = !edited && committed ? new Date(committed * 1000) : new Date();
    const asOf = when.toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' });
    await writeFile(path.join(outDir, 'roadmap.json'), JSON.stringify({ asOf, ...summarise(parseRoadmap(md)) }) + '\n');
  }
  return finalise(outDir, { root });
}
