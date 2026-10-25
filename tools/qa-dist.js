// Browser QA of the built site in dist/ (docs/specs/speed.md, Phase 79). `npm run release` runs it
// straight after the build. tools/qa-browser.js checks the app itself from the source tree; this
// checks what is deployed: the bundled code writes every template's report exactly as the source
// does, start-up needs few rounds of requests, the CNS code waits for a CNS form, and the offline
// copy works - stored on the first open, used on the next, updated file by file, handed over at
// New case, removed by ?nosw, started on the sign-in screen too - without storing anything from Google.
//
//   node tools/qa-dist.js            (after `npm run build`)
//   QA_ONLY=offline node tools/qa-dist.js   runs the checks whose name matches

import { createServer } from 'node:http';
import { readFile, writeFile, cp, rm, mkdtemp, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { finalise } from './build-lib.js';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const DIST = join(ROOT, 'dist');
const ONLY = process.env.QA_ONLY ? new RegExp(process.env.QA_ONLY) : null;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.md': 'text/markdown; charset=utf-8'
};

/**
 * A static server shaped like the host: index.html no-store, everything else cached for an hour
 * and served whatever its query string. `delay` holds every response back (a slow line); every
 * request path is logged.
 */
function serve(dir, port, { delay = 0 } = {}) {
  const log = [];
  const server = createServer(async (req, res) => {
    const url = req.url || '/';
    log.push(url);
    let p = decodeURIComponent(url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = join(dir, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    if (delay) await new Promise((r) => setTimeout(r, delay));
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': MIME[extname(file)] || 'application/octet-stream',
        'cache-control': p === '/index.html' ? 'no-store' : 'public, max-age=3600'
      });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(port, () => resolve({ server, log, setDelay: (ms) => { delay = ms; } })));
}

const results = [];
async function check(name, fn) {
  if (ONLY && !ONLY.test(name)) return;
  try {
    const note = await fn();
    results.push({ name, ok: true });
    process.stdout.write(`  ok    ${name}${note ? ' — ' + note : ''}\n`);
  } catch (err) {
    results.push({ name, ok: false });
    process.stdout.write(` FAIL   ${name}\n          ${String(err.message || err).split('\n').slice(0, 4).join('\n          ')}\n`);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

/** Poll an in-page async predicate (waitForFunction treats the promise itself as truthy). */
async function until(page, fn, arg, { timeout = 15000, every = 200 } = {}) {
  const end = Date.now() + timeout;
  for (;;) {
    const v = await page.evaluate(fn, arg).catch(() => false);
    if (v) return v;
    if (Date.now() > end) throw new Error(`timed out after ${timeout} ms waiting for ${String(fn).slice(0, 80)}`);
    await page.waitForTimeout(every);
  }
}
const hasWaiting = async () => !!(await navigator.serviceWorker.getRegistration())?.waiting;

const pathOf = (u) => decodeURIComponent(u.split('?')[0]).replace(/^\//, '');
const ready = (page, timeout = 15000) => page.waitForSelector('#report-blocks .block', { timeout });
const fatalErrors = (errors) => errors.filter((t) => !/fonts\.googleapis|fontshare|gstatic|favicon|net::ERR_(INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|CONNECTION)/i.test(t));

// Preload hints that go unused are wasted downloads: Chrome says so in a warning.
const PRELOAD_WASTE = /preloaded using link preload but not used|cross-world service worker resource mismatch/;

function watch(page) {
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
    else if (m.type() === 'warning' && PRELOAD_WASTE.test(m.text())) errors.push('preload unused: ' + m.text());
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('dialog', (d) => d.accept());
  return errors;
}

async function caseMenu(page, label) {
  if (await page.locator('#case-menu-list:not([hidden])').count()) await page.keyboard.press('Escape');
  await page.click('#btn-case-menu');
  await page.waitForSelector('#case-menu-list:not([hidden])', { timeout: 5000 });
  const item = page.locator('#case-menu-list .menu-item', { hasText: label }).first();
  await item.waitFor({ state: 'visible', timeout: 5000 });
  await item.click();
}

/** Open template `entry` on a fresh case and read the report, blank and with the template's example. */
async function reportsOf(page, entry) {
  await caseMenu(page, 'New case');
  await page.waitForFunction(() => !document.querySelector('#case-menu-list:not([hidden])'), null, { timeout: 5000 }).catch(() => {});
  const sel = page.locator('select.part-template').first();
  if (await sel.inputValue() !== entry.id) await sel.selectOption(entry.id);
  await page.waitForFunction((name) => (document.querySelector('#status-template')?.textContent || '').startsWith(name), entry.name, { timeout: 10000 });
  const blank = await page.locator('#report-blocks').innerText();
  await page.evaluate(() => { document.querySelector('#toast').textContent = ''; });
  await caseMenu(page, 'Example');
  await page.waitForFunction(() => /Example loaded|No example/.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 10000 });
  const example = await page.locator('#report-blocks').innerText();
  return { blank, example };
}

// ---------------------------------------------------------------------------------
try { await stat(join(DIST, 'sw-files.json')); } catch { console.error('dist/ is missing or from an old build: run `npm run build` first'); process.exit(1); }
const manifest = JSON.parse(await readFile(join(DIST, 'templates', 'manifest.json'), 'utf8')).templates;
const list = JSON.parse(await readFile(join(DIST, 'sw-files.json'), 'utf8'));
const source = await serve(ROOT, 8741);
const dist = await serve(DIST, 8742);
const browser = await chromium.launch();
process.stdout.write('\nbuilt-site QA\n-------------\n');

await check('the build writes every template\'s report exactly as the source does, blank and with its example', async () => {
  const open = async (port) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const errors = watch(page);
    await page.goto(`http://localhost:${port}/`);
    await ready(page);
    return { ctx, page, errors };
  };
  const [a, b] = await Promise.all([open(8741), open(8742)]);
  const differ = [];
  await Promise.all([a, b].map(async (side) => {
    side.out = {};
    for (const entry of manifest) side.out[entry.id] = await reportsOf(side.page, entry);
  }));
  for (const entry of manifest) {
    for (const k of ['blank', 'example']) if (a.out[entry.id][k] !== b.out[entry.id][k]) differ.push(`${entry.id} (${k})`);
  }
  const errs = [...fatalErrors(a.errors).map((e) => 'source: ' + e), ...fatalErrors(b.errors).map((e) => 'build: ' + e)];
  await a.ctx.close(); await b.ctx.close();
  assert(!differ.length, `reports differ: ${differ.slice(0, 8).join(', ')}`);
  assert(!errs.length, `console errors:\n${errs.slice(0, 5).join('\n')}`);
  return `${manifest.length} templates x 2 identical, no console errors`;
});

await check('start-up: the first report arrives in a few rounds of requests on a slow line', async () => {
  const DELAY = 150;
  dist.setDelay(DELAY);
  const times = [];
  let requests = 0;
  for (let i = 0; i < 3; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, serviceWorkers: 'block' });
    await ctx.route((url) => url.hostname !== 'localhost', (route) => route.abort()); // fonts: not this test
    const page = await ctx.newPage();
    const before = dist.log.length;
    const t0 = Date.now();
    await page.goto('http://localhost:8742/');
    await ready(page);
    times.push(Date.now() - t0);
    requests = dist.log.length - before;
    await ctx.close();
  }
  dist.setDelay(0);
  times.sort((x, y) => x - y);
  const median = times[1];
  const rounds = Math.round(median / DELAY);
  // The source's chain is about eight rounds deep (docs/specs/speed.md); the build should need at most five.
  assert(median <= DELAY * 5 + 400, `first report after ${median} ms (${rounds} rounds at ${DELAY} ms): ${times.join(', ')}`);
  return `median ${median} ms at ${DELAY} ms a request (about ${rounds} rounds), ${requests} requests by then`;
});

await check('the CNS code loads only when a CNS form opens, and the CNS tools then work', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = watch(page);
  const asked = [];
  page.on('request', (r) => asked.push(pathOf(new URL(r.url()).pathname)));
  await page.goto('http://localhost:8742/');
  await ready(page);
  await page.waitForTimeout(500);
  const early = asked.filter((p) => /^chunks\/cns/.test(p));
  assert(!early.length, `CNS chunks fetched at start-up: ${early.join(', ')}`);
  await page.locator('select.part-template').first().selectOption('cns_tumour');
  const btn = page.locator('#part-panel .part-actions button', { hasText: 'Guided intake' }).first();
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await btn.click();
  await page.waitForSelector('#part-panel .wiz .wiz-q', { timeout: 5000 });
  const late = asked.filter((p) => /^chunks\/cns/.test(p));
  assert(late.length >= 3, `CNS chunks after opening the form: ${late.join(', ') || 'none'}`);
  const fatal = fatalErrors(errors);
  await ctx.close();
  assert(!fatal.length, `console errors:\n${fatal.slice(0, 5).join('\n')}`);
  return `${late.length} CNS chunks, fetched with the form; the guided intake opens`;
});

// The offline copy runs on a copy of dist, so a release can be staged by editing one file.
const stageDir = await mkdtemp(join(tmpdir(), 'signout-stage-'));
await cp(DIST, stageDir, { recursive: true });
const stage = await serve(stageDir, 8743);
const stageCtx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const sp = await stageCtx.newPage();
const stageErrors = watch(sp);
const cacheKeys = () => sp.evaluate(async () => (await (await window.caches.open('signout-files')).keys()).map((r) => r.url));
const expectWarm = Object.keys(list.files).filter((p) => !list.lazy.some((l) => p.startsWith(l))).length + 1; // + the file list

await check('offline copy: the first open stores the app and every template, and nothing from Google', async () => {
  await sp.goto('http://localhost:8743/');
  await ready(sp);
  await sp.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 }); // synchronous: fine
  let keys = [];
  for (let i = 0; i < 120; i++) { keys = await cacheKeys(); if (keys.length >= expectWarm) break; await sp.waitForTimeout(250); }
  assert(keys.length >= expectWarm, `${keys.length} files stored, expected ${expectWarm}`);
  const foreign = keys.filter((k) => !k.startsWith('http://localhost:8743/'));
  assert(!foreign.length, `stored from elsewhere: ${foreign.slice(0, 3).join(', ')}`);
  const unlisted = keys.map((k) => new URL(k)).filter((u) => !list.files[pathOf(u.pathname)] && pathOf(u.pathname) !== 'sw-files.json');
  assert(!unlisted.length, `stored but not in the release: ${unlisted.slice(0, 3).join(', ')}`);
  const photos = keys.filter((k) => k.includes('/assets/reference/'));
  assert(!photos.length, `reference photographs stored before they were viewed: ${photos.length}`);
  return `${keys.length} files stored (app, ${Object.keys(list.files).filter((p) => p.startsWith('schemas/')).length} schemas, generators, chunks); photographs wait to be viewed`;
});

await check('offline copy: the next open loads from the computer, and works with the network off', async () => {
  const before = stage.log.length;
  await sp.reload();
  await ready(sp);
  await sp.waitForTimeout(300);
  const fetched = stage.log.slice(before).map(pathOf).filter((p) => p !== 'sw.js' && p !== 'favicon.svg');
  assert(!fetched.length, `fetched from the host on the second open: ${fetched.slice(0, 6).join(', ')}`);
  await stageCtx.setOffline(true);
  await sp.reload();
  await ready(sp);
  await sp.locator('select.part-template').first().selectOption('skin_excision');
  await sp.waitForFunction(() => /skin/i.test(document.querySelector('#status-template')?.textContent || ''), null, { timeout: 10000 });
  await stageCtx.setOffline(false);
  return 'nothing but the release check (sw.js) from the host; offline, the app opens and a new template loads';
});

let oldBuild = '';
let newBuild = '';
await check('offline copy: a release downloads only what changed, and waits for the next New case', async () => {
  oldBuild = await sp.evaluate(() => document.documentElement.dataset.build);
  await sp.locator('select.part-template').first().selectOption('gastric_biopsy');
  await sp.waitForFunction(() => /gastric/i.test(document.querySelector('#status-template')?.textContent || ''), null, { timeout: 10000 });
  // Stage a release: one schema's bytes change (its meaning does not), then the release files are rewritten.
  const changed = 'schemas/skin_cyst.json';
  await writeFile(join(stageDir, changed), (await readFile(join(stageDir, changed), 'utf8')) + '\n');
  newBuild = (await finalise(stageDir, { root: ROOT })).release;
  assert(newBuild !== oldBuild, 'the staged release has the same id');
  const before = stage.log.length;
  const states = await sp.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    const s = (x) => ({ active: !!x.active, waiting: !!x.waiting, installing: !!x.installing });
    const pre = s(r);
    await r.update();
    return { pre, post: s(r) };
  });
  await until(sp, hasWaiting, null, { timeout: 20000 });
  // The worker stores changed core files when it installs; a changed template follows with the
  // background warm-up once the release is in charge (checked after the hand-over).
  const fetched = [...new Set(stage.log.slice(before).map(pathOf))].sort();
  const expected = ['index.html', 'sw-files.json', 'sw.js'].sort();
  assert(JSON.stringify(fetched) === JSON.stringify(expected), `fetched ${fetched.join(', ')}; expected ${expected.join(', ')} (${JSON.stringify(states)})`);
  assert(await sp.evaluate(() => document.documentElement.dataset.build) === oldBuild, 'the open case moved to the new release by itself');
  return `fetched ${fetched.join(', ')}; the open case stays on ${oldBuild}`;
});

await check('offline copy: New case hands over to the new release, on the same template', async () => {
  assert(newBuild, 'no staged release');
  await caseMenu(sp, 'New case');
  await sp.waitForFunction((b) => document.documentElement.dataset.build === b, newBuild, { timeout: 15000 });
  await ready(sp);
  const status = await sp.locator('#status-template').innerText();
  assert(/gastric/i.test(status), `after the hand-over the case is ${status}`);
  await sp.waitForFunction(() => /New case/.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 5000 });
  // The changed template arrives with the background warm-up, alone.
  const changed = `http://localhost:8743/schemas/skin_cyst.json?v=${JSON.parse(await readFile(join(stageDir, 'sw-files.json'), 'utf8')).files['schemas/skin_cyst.json']}`;
  await until(sp, async (k) => !!(await (await window.caches.open('signout-files')).match(k)), changed, { timeout: 15000 });
  return `${oldBuild} → ${newBuild}; ${status.split(' · ')[0]}, "New case" shown after the reload; the changed schema stored after`;
});

await check('offline copy: ?nosw removes the worker and its files and keeps it off; ?sw turns it back on', async () => {
  const left = async () => sp.evaluate(async () => ({ regs: (await navigator.serviceWorker.getRegistrations()).length, caches: (await window.caches.keys()).length }));
  await sp.goto('http://localhost:8743/?nosw');
  await sp.waitForURL((u) => !u.searchParams.has('nosw'), { timeout: 10000 });
  await ready(sp);
  await sp.waitForTimeout(2500); // past the moment the app would register it
  const off = await left();
  assert(off.regs === 0 && off.caches === 0, `left behind: ${JSON.stringify(off)}`);
  await sp.reload();
  await ready(sp);
  await sp.waitForTimeout(2500);
  const still = await left();
  assert(still.regs === 0, `back after a reload: ${JSON.stringify(still)}`);
  await sp.goto('http://localhost:8743/?sw');
  await sp.waitForURL((u) => !u.searchParams.has('sw'), { timeout: 10000 });
  await ready(sp);
  await until(sp, async () => (await navigator.serviceWorker.getRegistrations()).length > 0, null, { timeout: 10000 });
  return 'no worker and no stored files, still none after a reload; ?sw registers it again';
});

// The sign-in gate is off on localhost itself (src/gate.js) but on for any other name. Chrome sends
// every *.localhost name to this machine and counts it as secure, so a service worker may run there.
await check('offline copy: the sign-in screen starts it too, with the gate on', async () => {
  const origin = 'http://signout.localhost:8742';
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  try {
    const page = await ctx.newPage();
    const errors = watch(page);
    const gate = () => page.waitForFunction(() => document.documentElement.dataset.gate === 'signin' && !document.querySelector('#gate').hidden, null, { timeout: 15000 })
      .catch(() => { throw new Error('the sign-in screen did not show'); });
    await page.goto(`${origin}/`);
    await gate();
    assert(!(await page.locator('#report-blocks .block').count()), 'a case was built behind the sign-in screen');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 })
      .catch(() => { throw new Error('no offline copy took charge of the sign-in screen within 15 s'); });
    const stored = () => page.evaluate(async () => (await (await window.caches.open('signout-files')).keys()).map((r) => r.url));
    let keys = [];
    for (let i = 0; i < 120; i++) { keys = await stored(); if (keys.length >= expectWarm) break; await page.waitForTimeout(250); }
    assert(keys.length >= expectWarm, `${keys.length} files stored at the sign-in screen, expected ${expectWarm}`);
    const foreign = keys.filter((k) => !k.startsWith(`${origin}/`));
    assert(!foreign.length, `stored from elsewhere: ${foreign.slice(0, 3).join(', ')}`);
    const before = dist.log.length;
    await page.reload();
    await gate();
    await page.waitForTimeout(300);
    const fetched = dist.log.slice(before).map(pathOf).filter((p) => p !== 'sw.js' && p !== 'favicon.svg');
    assert(!fetched.length, `fetched from the host on the second open: ${fetched.slice(0, 6).join(', ')}`);
    const fatal = fatalErrors(errors);
    assert(!fatal.length, `console errors:\n${fatal.slice(0, 5).join('\n')}`);
    return `${keys.length} files stored before anyone signed in; the next open of the sign-in screen came from the computer`;
  } finally {
    await ctx.close();
  }
});

// In a sandboxed frame (a deploy preview) merely reading navigator.serviceWorker or caches throws a
// SecurityError. The app has to start there without the copy: the workspace and the sign-in screen.
await check('offline copy: where reading it throws (a sandboxed frame), the workspace and the sign-in screen still start', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript(() => {
    const refuse = (name) => ({ configurable: true, get() { throw new window.DOMException(`Failed to read the '${name}' property: the context is sandboxed`, 'SecurityError'); } });
    Object.defineProperty(window.Navigator.prototype, 'serviceWorker', refuse('serviceWorker'));
    Object.defineProperty(window, 'caches', refuse('caches'));
  });
  try {
    const page = await ctx.newPage();
    const errors = watch(page);
    const failed = () => page.evaluate(() => /Failed to start/.test(document.body.innerText));
    await page.goto('http://localhost:8742/');
    await ready(page);
    await page.waitForTimeout(1500); // past the moment the copy would start
    assert(!(await failed()), 'the workspace shows "Failed to start"');
    await page.goto('http://signout.localhost:8742/');
    await page.waitForFunction(() => document.documentElement.dataset.gate === 'signin' && !document.querySelector('#gate').hidden, null, { timeout: 15000 })
      .catch(() => { throw new Error('the sign-in screen did not show'); });
    await page.waitForTimeout(1500);
    assert(!(await failed()), 'the sign-in screen shows "Failed to start"');
    const fatal = fatalErrors(errors);
    assert(!fatal.length, `console errors:\n${fatal.slice(0, 5).join('\n')}`);
    return 'both start, with no error and no copy';
  } finally {
    await ctx.close();
  }
});

await check('offline copy: no console errors across the offline checks', async () => {
  const fatal = fatalErrors(stageErrors);
  assert(!fatal.length, fatal.slice(0, 5).join('\n'));
  return 'none';
});

await stageCtx.close();
await browser.close();
for (const s of [source, dist, stage]) s.server.close();
await rm(stageDir, { recursive: true, force: true });

const failed = results.filter((r) => !r.ok);
process.stdout.write(`\n${results.length - failed.length}/${results.length} built-site checks passed\n`);
process.exit(failed.length ? 1 : 0);
