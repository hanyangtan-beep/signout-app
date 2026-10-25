// The built site (tools/build-lib.js, docs/specs/speed.md, Phase 79): bundled, every file named by
// its content, a release id that changes only with the files, the offline copy's file list, and a
// start-up script that preloads what the tab will open. Builds into a temporary folder; the source
// tree is left as it is.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { buildSite, finalise, staticImports, closure } from '../tools/build-lib.js';

let tmp;
let out;
let built;
let list;
let html;
const hashOf = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 12);
const pageData = (text) => JSON.parse(/<script id="signout-files" type="application\/json">(.*?)<\/script>/.exec(text)[1]);
const startScript = (text) => /<script>(\(function\(\)\{.*?\}\)\(\);)<\/script>/.exec(text)[1];

before(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), 'signout-build-'));
  out = path.join(tmp, 'dist');
  built = await buildSite({ outDir: out, writeManifest: false });
  list = JSON.parse(await readFile(path.join(out, 'sw-files.json'), 'utf8'));
  html = await readFile(path.join(out, 'index.html'), 'utf8');
});
after(async () => { await rm(tmp, { recursive: true, force: true }); });

test('index.html names the release and loads the app and styles by content hash', () => {
  assert.match(html, new RegExp(`<html lang="en-GB" data-build="${built.release}">`));
  assert.ok(html.includes(`src="src/app.js?v=${list.files['src/app.js']}"`));
  assert.ok(html.includes(`href="styles.css?v=${list.files['styles.css']}"`));
  assert.equal(pageData(html).build, built.release);
  assert.equal(list.release, built.release);
});

test('every file in the release list carries the hash of its bytes', async () => {
  const paths = Object.keys(list.files);
  assert.ok(paths.length > 500, `${paths.length} files`);
  for (const rel of paths) assert.equal(hashOf(await readFile(path.join(out, rel))), list.files[rel], rel);
  assert.ok(paths.includes('index.html') && !paths.includes('sw.js') && !paths.includes('sw-files.json'));
});

test('the page can version every template: its schema, generator and the chunks the generator needs', async () => {
  const data = pageData(html);
  const manifest = JSON.parse(await readFile(path.join(out, 'templates', 'manifest.json'), 'utf8')).templates;
  assert.ok(manifest.length >= 80);
  for (const t of manifest) {
    const gen = data.templates[t.id];
    assert.ok(gen && data.files[gen], `${t.id}: generator ${gen}`);
    assert.ok(data.files[`schemas/${t.id}.json`], `${t.id}: schema`);
    for (const i of data.deps[gen] || []) assert.ok(list.files[data.chunks[i]], `${t.id}: chunk ${data.chunks[i]}`);
  }
  assert.ok(data.files['templates/manifest.json'] && data.files['templates/planned.json']);
});

test('start-up loads the app and its own chunks; the CNS code is split off until a CNS form opens', () => {
  const data = pageData(html);
  const code = (rel) => readFile(path.join(out, rel), 'utf8');
  assert.deepEqual(data.boot.modules, [`src/app.js?v=${list.files['src/app.js']}`, ...built.appChunks]);
  const cns = Object.keys(list.files).filter((p) => /^chunks\/cns/.test(p));
  assert.ok(cns.length >= 3, `CNS chunks: ${cns.join(', ')}`);
  for (const c of cns) assert.ok(!built.appChunks.includes(c), `${c} loads at start-up`);
  return Promise.all(built.appChunks.map(async (c) => assert.ok((await code(c)).length > 0)));
});

test('the worker stores what opens the app on install, the photographs only once viewed', async () => {
  const data = pageData(html);
  for (const rel of ['index.html', 'src/app.js', ...built.appChunks, 'styles.css', 'templates/manifest.json', `schemas/${data.open}.json`, data.templates[data.open]]) {
    assert.ok(list.core.includes(rel), `core lacks ${rel}`);
  }
  assert.ok(!list.core.some((p) => p.startsWith('assets/reference/')));
  assert.deepEqual(list.lazy, ['assets/reference/']);
  assert.ok((await readFile(path.join(out, 'sw.js'), 'utf8')).includes(`"${built.release}"`));
});

test('the same files give the same release; one changed file changes its hash, index.html and the release', async () => {
  const again = await finalise(out);
  assert.equal(again.release, built.release);
  assert.equal(again.files['index.html'], list.files['index.html']);
  const rel = 'schemas/skin_cyst.json';
  await writeFile(path.join(out, rel), (await readFile(path.join(out, rel), 'utf8')) + '\n');
  const next = await finalise(out);
  assert.notEqual(next.release, built.release);
  const changed = Object.keys(next.files).filter((p) => next.files[p] !== list.files[p]).sort();
  assert.deepEqual(changed, ['index.html', rel]);
  html = await readFile(path.join(out, 'index.html'), 'utf8');
  list = JSON.parse(await readFile(path.join(out, 'sw-files.json'), 'utf8'));
  built = { ...built, release: next.release };
});

test('the start-up script preloads the app and the templates of the tab\'s draft, else the default', () => {
  const data = pageData(html);
  const run = (draft) => {
    const dom = new JSDOM(html.replace(/<script\b[^>]*src=[^>]*><\/script>/g, ''), { url: 'https://han-signout.pplx.app/', runScripts: 'outside-only' });
    if (draft) dom.window.sessionStorage.setItem('signout.case.v1', JSON.stringify(draft));
    dom.window.eval(startScript(html));
    return [...dom.window.document.querySelectorAll('link[rel="modulepreload"], link[rel="preload"]')].map((l) => l.getAttribute('href'));
  };
  const v = (rel) => `${rel}?v=${data.files[rel]}`;
  const fresh = run(null);
  for (const href of [...data.boot.modules, ...data.boot.fetches, v(`schemas/${data.open}.json`), v(data.templates[data.open])]) assert.ok(fresh.includes(href), href);
  const draft = run({ schemaId: 'cns_tumour', parts: [{ templateId: 'cns_tumour' }, { templateId: 'skin_excision' }] });
  for (const id of ['cns_tumour', 'skin_excision']) {
    assert.ok(draft.includes(v(`schemas/${id}.json`)) && draft.includes(v(data.templates[id])), id);
    for (const i of data.deps[data.templates[id]] || []) assert.ok(draft.includes(data.chunks[i]), `${id}: ${data.chunks[i]}`);
  }
  assert.ok(!draft.includes(v(`schemas/${data.open}.json`)) || data.open === 'skin_excision');
  assert.equal(new Set(draft).size, draft.length, 'a file preloaded twice');
});

test('chunk imports are read from the bundled code, and followed to the end', () => {
  assert.deepEqual(staticImports('generators/x.js', 'import{a as b}from"../chunks/c-1.js";import"./d.js";const e=import("../chunks/lazy.js")'), ['chunks/c-1.js', 'generators/d.js']);
  const graph = { a: ['b', 'c'], b: ['c'], c: ['d'], d: [] };
  assert.deepEqual(closure('a', (f) => graph[f]), ['b', 'c', 'd']);
});
