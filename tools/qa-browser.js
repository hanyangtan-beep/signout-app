#!/usr/bin/env node
// Committed browser QA. Boots the real app in headless Chromium and walks the
// journeys that unit tests cannot reach: module loading, event wiring, dialogs,
// the specimen paste box, template switching, and the copy buttons.
//
//   npm run qa              run every check
//   npm run qa -- --keep    leave the static server up after the run
//   npm run qa -- --shots   write screenshots to analysis/qa/
//
// Until now this was done by hand in a throwaway REPL session, so nothing about
// it survived the session it ran in and no regression could be caught twice.
// Every check below is an assertion, not a screenshot to eyeball.
//
// Deliberately NOT a fixture check: report wording is covered byte-for-byte by
// tests/fixtures. This file only asserts that the app in a browser reaches the
// same machinery the unit tests drive directly.

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const KEEP = process.argv.includes('--keep');
const SHOTS = process.argv.includes('--shots');
const PORT = 8731;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function serve() {
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

// ---- tiny assertion harness ------------------------------------------------------
const results = [];
async function check(name, fn) {
  try {
    const note = await fn();
    results.push({ name, ok: true, note: note || '' });
    process.stdout.write(`  ok    ${name}${note ? ' — ' + note : ''}\n`);
  } catch (err) {
    results.push({ name, ok: false, note: String(err.message || err) });
    process.stdout.write(` FAIL   ${name}\n          ${String(err.message || err).split('\n')[0]}\n`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Example / New / saved cases live behind the Case dropdown in the header
// (the system-menus change), so they are 0x0 until the menu is open.
async function caseMenu(page, label) {
  if (await page.locator('#case-menu-list:not([hidden])').count()) await page.keyboard.press('Escape');
  await page.click('#btn-case-menu');
  await page.waitForSelector('#case-menu-list:not([hidden])', { timeout: 5000 });
  const item = page.locator('#case-menu-list .menu-item', { hasText: label }).first();
  await item.waitFor({ state: 'visible', timeout: 5000 });
  await item.click();
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------------
const server = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

process.stdout.write('\nbrowser QA\n----------\n');

await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });

const shot = async (name) => {
  if (!SHOTS) return;
  await mkdir(join(ROOT, 'analysis', 'qa'), { recursive: true });
  await page.screenshot({ path: join(ROOT, 'analysis', 'qa', `${name}.png`), fullPage: false });
};

await check('app boots with no module or runtime error', async () => {
  await page.waitForSelector('#part-panel', { timeout: 10000 });
  const fatal = consoleErrors.filter((t) => !/favicon|gapi|accounts\.google|net::ERR/i.test(t));
  assert(fatal.length === 0, 'console errors:\n' + fatal.slice(0, 5).join('\n'));
  await shot('01-boot');
  return 'no console errors';
});

await check('template palette opens and lists built templates', async () => {
  await page.click('#btn-palette');
  await page.waitForSelector('#dlg-palette[open]', { timeout: 5000 });
  const n = await page.locator('#palette-list [data-template]').count();
  assert(n >= 40, `palette listed ${n} templates, expected at least 40`);
  await shot('02-palette');
  return `${n} entries`;
});

await check('palette search narrows to a known template', async () => {
  await page.fill('#palette-search', 'gastric');
  await page.waitForTimeout(150);
  const labels = await page.locator('#palette-list [data-template]:visible').allTextContents();
  assert(labels.length > 0, 'search for "gastric" returned nothing');
  assert(
    labels.some((t) => /gastric/i.test(t)),
    'no gastric entry in: ' + labels.slice(0, 5).join(' | ')
  );
  return `${labels.length} matches`;
});

await check('choosing a template loads its fields', async () => {
  await page.locator('#palette-list [data-template="gastric_biopsy"]').first().click();
  await page.waitForTimeout(400);
  const open = await page.locator('#dlg-palette[open]').count();
  assert(open === 0, 'palette stayed open after a choice');
  const tpl = (await page.locator('#status-template').textContent()) || '';
  assert(/gastric/i.test(tpl), `status shows "${tpl.trim()}", expected the gastric template`);
  const fields = await page.locator('#part-panel [data-field]').count();
  assert(fields > 3, `only ${fields} fields rendered`);
  await shot('03-template');
  return `${fields} fields`;
});

await check('example case fills the form and produces a report', async () => {
  await caseMenu(page, 'Example');
  const report = (await page.locator('#report-blocks').innerText()).trim();
  assert(report.length > 120, `report was ${report.length} chars`);
  for (const heading of ['SPECIMENS', 'MICROSCOPIC EXAMINATION', 'DIAGNOSIS']) {
    assert(report.includes(heading), `report is missing the ${heading} block`);
  }
  await shot('04-example');
  return `${report.length} chars`;
});

await check('house wording rules hold in the rendered report', async () => {
  const report = await page.locator('#report-blocks').innerText();
  assert(report.trim().length > 120, 'no report rendered, so the wording checks would be vacuous');
  assert(!/\bno malignancy (is )?identified\b/i.test(report), 'used "no malignancy identified" instead of the house phrase');
  assert(!/\bcolor\b/i.test(report), 'American spelling "color" in the report');
  assert(!/\btumor\b/i.test(report), 'American spelling "tumor" in the report');
  assert(!/\bundefined\b/.test(report), '"undefined" leaked into the report');
  assert(!/\bNaN\b/.test(report), '"NaN" leaked into the report');
  assert(!/\[object Object\]/.test(report), '"[object Object]" leaked into the report');
  return 'spelling and placeholder checks clean';
});

await check('LIS specimen text previews, matches and builds lettered parts', async () => {
  await caseMenu(page, 'New case');
  const box = page.locator('#meta-specimen');
  await box.click();
  // typed, not filled — the intake preview listens for input events
  await box.type('(A) Stomach, antrum, biopsy, (B) Stomach, body, biopsy, (C) Oesophagus, biopsy', { delay: 4 });
  await page.waitForSelector('#intake-preview table tr', { timeout: 5000 });

  const rows = await page.locator('#intake-preview table tr').count();
  assert(rows === 3, `intake preview showed ${rows} rows, expected 3`);
  const confident = await page.locator('#intake-preview .tier-confident').count();
  assert(confident === 3, `${confident} of 3 parts matched confidently; a routine three-part GI case should match all three`);

  await page.click('#btn-build-parts');
  await page.waitForTimeout(600);
  const letters = (await page.locator('#part-tabs .tab-label').allTextContents()).join('');
  assert(letters === 'ABC', `part letters were "${letters}", expected ABC`);
  await shot('05-parts');
  return `3 rows, 3 confident, tabs ${letters}`;
});

await check('prose microscopy opens with the house phrase', async () => {
  await page.click('#btn-palette');
  await page.waitForSelector('#dlg-palette[open]');
  await page.fill('#palette-search', 'colon');
  await page.waitForTimeout(200);
  await page.locator('#palette-list [data-template="colonic_polyp"]').first().click();
  await page.waitForTimeout(400);
  await caseMenu(page, 'Example');
  const report = await page.locator('#report-blocks').innerText();
  assert(/Sections show/.test(report), 'prose microscopy does not open with "Sections show"');
  return 'colonic_polyp microscopy opens correctly';
});

await check('settings dialog opens and holds the Drive fields', async () => {
  await page.click('#btn-settings');
  await page.waitForSelector('#dlg-settings[open]', { timeout: 5000 });
  for (const id of ['#cfg-clientId', '#cfg-folderId', '#cfg-sheetName', '#cfg-scopeMode']) {
    assert((await page.locator(id).count()) === 1, `missing ${id}`);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  return 'four settings fields present';
});

await check('theme toggle flips the document theme', async () => {
  const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || document.documentElement.className);
  await page.click('#theme-toggle');
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || document.documentElement.className);
  assert(before !== after, `theme did not change (stayed "${before}")`);
  await page.click('#theme-toggle');
  return `${before} → ${after}`;
});

await check('copy buttons are wired and yield report text', async () => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.click('#btn-palette');
  await page.waitForSelector('#dlg-palette[open]');
  await page.locator('#palette-list [data-template="gastric_biopsy"]').first().click();
  await page.waitForTimeout(300);
  await caseMenu(page, 'Example');
  await page.click('#btn-copy-report');
  await page.waitForTimeout(300);
  const text = await page.evaluate(() => navigator.clipboard.readText());
  assert(text && text.trim().length > 100, `clipboard held ${text ? text.length : 0} chars`);
  assert(!/<[a-z]+[ >]/i.test(text), 'clipboard contains HTML markup; the LIS box takes plain text only');
  return `${text.trim().length} plain-text chars`;
});

// The sign-in gate is off on localhost so every check above can drive the app without a Google
// session. That bypass is the whole risk: if it ever widened, the published app would be open to
// anyone. So load the same files over an address the bypass does NOT cover (hostname '0.0.0.0'
// rather than 'localhost') and assert the gate actually closes there.
await check('the sign-in gate closes on a non-local host', async () => {
  const gated = await new Promise((resolve) => {
    const s = createServer(async (req, res) => {
      let p = decodeURIComponent((req.url || '/').split('?')[0]);
      if (p === '/') p = '/index.html';
      const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
      try {
        res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(await readFile(file));
      } catch { res.writeHead(404).end('not found'); }
    });
    s.listen(PORT + 1, '0.0.0.0', () => resolve(s));
  });
  const visitor = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await visitor.goto(`http://0.0.0.0:${PORT + 1}/index.html`, { waitUntil: 'networkidle' });
    assert(await visitor.locator('#gate').isVisible(), 'gate did not appear on a non-local host');
    assert(!(await visitor.locator('#report-blocks').isVisible().catch(() => false)), 'workspace rendered behind the gate');
    // Nothing patient-shaped should exist in the DOM of a page a stranger can load. The gate runs
    // before any case is built, so this is absence, not CSS hiding.
    const html = await visitor.content();
    assert(!/Sections show/.test(html), 'report prose reached the DOM before sign-in');
    return 'gate shown, workspace absent';
  } finally {
    await visitor.close();
    gated.close();
  }
});

// Guided intake: opens from the part header on a CNS template, asks one question with its field,
// leaves the ordinary form intact underneath, and closes without touching what it recorded.
await check('the guided intake opens, asks, and leaves the form intact', async () => {
  await caseMenu(page, 'New case');
  await page.click('#btn-palette');
  await page.waitForSelector('#dlg-palette[open]', { timeout: 5000 });
  await page.fill('#palette-search', 'glioma');
  await page.waitForTimeout(200);
  await page.locator('#palette-list [data-template="cns_tumour"]').first().click();
  await page.waitForTimeout(400);
  const before = await page.locator('#part-panel [data-field]').count();
  assert(before > 20, `only ${before} fields on the CNS form before the wizard`);
  const btn = page.locator('#part-panel .part-actions button', { hasText: 'Guided intake' });
  assert(await btn.count(), 'no guided intake button on the CNS template');
  await btn.first().click();
  await page.waitForSelector('#part-panel .wiz', { timeout: 5000 });
  const question = (await page.locator('#part-panel .wiz .wiz-q').innerText()).trim();
  assert(question.length > 10, `wizard question reads "${question}"`);
  assert((await page.locator('#part-panel .wiz .wiz-field').count()) === 1, 'the wizard did not render its field');
  const during = await page.locator('#part-panel [data-field]').count();
  assert(during === before + 1, `the form lost fields while the wizard was open (${before} -> ${during})`);
  await shot('guided-intake');
  await page.locator('#part-panel .part-actions button', { hasText: 'Close guided intake' }).first().click();
  await page.waitForTimeout(200);
  assert(!(await page.locator('#part-panel .wiz').count()), 'the wizard stayed open after Close');
  assert((await page.locator('#part-panel [data-field]').count()) === before, 'the form did not come back whole');
  return question.slice(0, 48);
});

// CNS pathway drawer: opens read-only beside the form, shows the branch with lit nodes and a named
// next test, sets nothing, and prints nothing.
await check('the CNS pathway drawer opens read-only and writes nothing', async () => {
  await caseMenu(page, 'New case');
  await page.click('#btn-palette');
  await page.waitForSelector('#dlg-palette[open]', { timeout: 5000 });
  await page.fill('#palette-search', 'glioma');
  await page.waitForTimeout(200);
  await page.locator('#palette-list [data-template="cns_tumour"]').first().click();
  await page.waitForTimeout(400);
  const fieldsBefore = await page.locator('#part-panel [data-field]').count();
  const reportBefore = await page.locator('#report-blocks').innerText();
  const btn = page.locator('#part-panel .part-actions button', { hasText: 'Pathway' });
  assert(await btn.count(), 'no pathway button on the CNS template');
  await btn.first().click();
  await page.waitForSelector('#part-panel .pw', { timeout: 5000 });
  const title = (await page.locator('#part-panel .pw .pw-head strong').innerText()).trim();
  assert(title.length > 3, `pathway title reads "${title}"`);
  assert((await page.locator('#part-panel .pw .pw-stage').count()) >= 2, 'the drawer showed fewer than two stages');
  assert((await page.locator('#part-panel .pw .pw-node').count()) >= 6, 'the drawer showed too few nodes');
  assert(await page.locator('#part-panel .pw .pw-next').count(), 'the drawer named no next test and said nothing about it');
  // Read-only: no field appeared or vanished, and the report did not move.
  assert((await page.locator('#part-panel [data-field]').count()) === fieldsBefore, 'the pathway drawer changed the form');
  assert((await page.locator('#report-blocks').innerText()) === reportBefore, 'the pathway drawer changed the report');
  await shot('cns-pathway');
  await page.locator('#part-panel .part-actions button', { hasText: 'Close pathway' }).first().click();
  await page.waitForTimeout(200);
  assert(!(await page.locator('#part-panel .pw').count()), 'the drawer stayed open after Close');
  return title.slice(0, 48);
});

await check('the gate stays out of the way on localhost', async () => {
  assert(await page.locator('#part-panel').isVisible(), 'workspace not visible on localhost');
  assert(!(await page.locator('#gate').isVisible()), 'gate appeared on localhost and would block QA');
  return 'bypass intact';
});

await check('no console error accumulated across the whole run', async () => {
  const fatal = consoleErrors.filter((t) => !/favicon|gapi|accounts\.google|net::ERR/i.test(t));
  assert(fatal.length === 0, `${fatal.length} console errors:\n` + fatal.slice(0, 5).join('\n'));
  return `${consoleErrors.length} ignored (network/Google SDK only)`;
});

// ---------------------------------------------------------------------------------
const failed = results.filter((r) => !r.ok);
process.stdout.write('----------\n');
process.stdout.write(`${results.length - failed.length}/${results.length} checks passed\n`);
if (SHOTS) process.stdout.write('screenshots in analysis/qa/\n');

if (!KEEP) {
  await browser.close();
  server.close();
}
process.stdout.write('\n');
process.exit(failed.length ? 1 : 0);
