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
import { emailDigest } from '../src/gate.js';
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

// The polyp template is already loaded with its example case by the check above.
await check('the picker and the report agree on British spelling', async () => {
  const report = await page.locator('#report-blocks').innerText();
  assert(/CAECUM/.test(report), 'the report does not print CAECUM');
  assert(!/\bCECUM\b/.test(report), 'the report still prints CECUM');
  // The stored value stays "Cecum" so old saved cases still resolve; only the visible text changes.
  const site = page.locator('select').filter({ has: page.locator('option', { hasText: 'Caecum' }) }).first();
  assert((await site.count()) === 1, 'no Site dropdown offers a Caecum label');
  const values = await site.locator('option').evaluateAll((os) => os.map((o) => o.value));
  const labels = await site.locator('option').evaluateAll((os) => os.map((o) => o.textContent));
  assert(values.includes('Cecum'), `stored option value changed: ${values.slice(0, 3).join(', ')}`);
  assert(labels.includes('Caecum'), `label not respelled: ${labels.slice(0, 3).join(', ')}`);
  assert(!labels.includes('Cecum'), 'an American label is still shown');
  return 'picker shows Caecum, stored value stays Cecum';
});

await check('a skin frozen margin does not print the tongue phrase', async () => {
  await page.click('#btn-palette');
  await page.waitForSelector('#dlg-palette[open]');
  await page.fill('#palette-search', 'frozen');
  await page.waitForTimeout(200);
  await page.locator('#palette-list [data-template="frozen_section"]').first().click();
  await page.waitForTimeout(400);
  const pick = async (id, val) => {
    const sel = page.locator(`[data-field="${id}"] select, select[name="${id}"], #f-${id}`).first();
    if (await sel.count()) { await sel.selectOption(val); await page.waitForTimeout(150); }
  };
  await pick('scenario', 'Margin');
  await pick('mgOrgan', 'SKIN');
  await pick('tissueDesc', 'skin');
  await page.waitForTimeout(400);
  const report = await page.locator('#report-blocks').innerText();
  assert(/It shows skin\./.test(report), `skin margin microscopy wrong: ${report.slice(0, 300)}`);
  assert(!/squamous mucosa/i.test(report), 'the tongue phrase is still printed for a skin margin');
  // The macro and the microscopy must describe the same tissue.
  assert(/a piece of skin/.test(report), 'macro no longer says skin');
  return 'skin margin prints skin, macro and microscopy agree';
});

await check('a frozen lymph node part holding three nodes reads plural throughout; one of three positive', async () => {
  // The frozen template is still open from the check above. Phase 47: the node count sits at the top
  // of the Lymph node fields and drives the part (docs/specs/frozen-section-scenarios.md (f)).
  const pick = async (id, val) => {
    const sel = page.locator(`.field[data-field="${id}"] select`).first();
    if (await sel.count()) { await sel.selectOption(val); await page.waitForTimeout(150); }
  };
  await pick('scenario', 'Lymph node');
  await pick('tissueDesc', 'lymph node');
  const order = await page.evaluate(() => [...document.querySelectorAll('#part-panel .field[data-field]:not(.hidden)')].map((n) => n.dataset.field));
  assert(order.indexOf('lnExamined') !== -1 && order.indexOf('lnExamined') < order.indexOf('nodeResult'), `node count not ahead of the frozen result: ${order.join(', ')}`);
  // The CNS smear count and the breast presurgical-therapy chips belong to their own scenarios.
  const stray = await page.evaluate(() => ['cnsSmears', 'slnTreatment'].filter((id) => { const n = document.querySelector(`#part-panel [data-field="${id}"]`); return n && n.offsetParent !== null; }));
  assert(stray.length === 0, `fields from other scenarios are showing: ${stray.join(', ')}`);
  const count = page.locator('.field[data-field="lnExamined"] input').first();
  await count.fill('3');
  await count.press('Tab');
  await page.waitForTimeout(400);
  let report = await page.locator('#report-blocks').innerText();
  assert(/are three lymph nodes/.test(report), `gross not plural: ${report.slice(0, 300)}`);
  assert(/They show three lymph nodes with preserved architecture and reactive follicles\./.test(report), `microscopy not plural: ${report.slice(0, 500)}`);
  assert(/frozen section - NO EVIDENCE OF MALIGNANCY \(0\/3\)/.test(report), `diagnosis count wrong: ${report.slice(-300)}`);
  await page.locator('.chips[data-field="nodeResult"] .chip', { hasText: 'macrometastasis' }).first().click();
  await page.waitForTimeout(400);
  report = await page.locator('#report-blocks').innerText();
  assert(/Metastatic carcinoma present in 1 of 3 lymph nodes \(macrometastasis\)\./.test(report), `intraoperative positive wrong: ${report.slice(0, 500)}`);
  assert(/three lymph nodes, one of which is infiltrated by metastatic carcinoma\./.test(report), `paraffin positive wrong: ${report.slice(0, 600)}`);
  assert(/METASTATIC CARCINOMA \(macrometastasis\) \(1\/3\)/.test(report), `diagnosis positive wrong: ${report.slice(-300)}`);
  await shot('frozen-ln-three');
  return 'count first, gross/microscopy/diagnosis plural, 1 of 3 positive, no stray fields';
});

await check('settings dialog opens and holds the Drive fields', async () => {
  await page.click('#btn-settings');
  await page.waitForSelector('#dlg-settings[open]', { timeout: 5000 });
  for (const id of ['#cfg-clientId', '#cfg-folderId', '#cfg-sheetName', '#cfg-scopeMode']) {
    assert((await page.locator(id).count()) === 1, `missing ${id}`);
  }
  // The published build carries a built-in allow-list (2026-09-30), so the Settings list is fixed.
  const allow = page.locator('#cfg-allowedEmails');
  assert(await allow.isDisabled(), 'the allowed-accounts field is editable despite the built-in list');
  const hint = await allow.getAttribute('placeholder');
  assert(/^Fixed in this build: 4 Google accounts$/.test(hint || ''), `allow-list hint wrong: ${hint}`);
  assert((await allow.inputValue()) === '', 'the built-in list leaked into the Settings field');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  return 'four settings fields present; allow-list fixed (4 accounts)';
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

// The LIS runs over Citrix and has no controls to read or write, so the clipboard is the entire
// interface (docs/specs/lis-bridge.md). Both halves of that bridge are clipboard round trips, which
// is the kind of wiring unit tests cannot reach: the format is covered in tests/lisbridge.test.js,
// and what follows is that the buttons actually reach it in a real browser.
await check('Copy for LIS emits the marked payload the script splits', async () => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.click('#btn-copy-lis');
  await page.waitForTimeout(300);
  const text = String(await page.evaluate(() => navigator.clipboard.readText()));
  const marks = [...text.matchAll(/^<<<([A-Z]+)>>>$/gm)].map((m) => m[1]);
  assert(marks.length >= 3, `payload carried ${marks.length} markers: ${marks.join(', ')}`);
  assert(marks.includes('DIAGNOSIS'), 'no DIAGNOSIS marker in the payload');
  assert(new Set(marks).size === marks.length, `a marker repeated: ${marks.join(', ')}`);
  const dx = text.split('<<<DIAGNOSIS>>>')[1] || '';
  assert(dx.trim().length > 10, 'the DIAGNOSIS marker carried no text under it');
  return marks.join(' > ');
});

// Clearing the boxes directly rather than through New case: the menu item asks to discard unsaved
// changes, and Playwright dismisses dialogs, so the case would survive and the check would read the
// previous one's text.
const clearMeta = (p) => p.evaluate(() => {
  for (const id of ['#meta-specimen', '#meta-clinical', '#meta-macro', '#meta-blockKey']) {
    const el = document.querySelector(id);
    if (!el) continue;
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
});

await check('Capture from LIS routes a marked payload into the case boxes', async () => {
  await clearMeta(page);
  await page.waitForTimeout(300);
  const payload = '<<<SPECIMEN>>>\nAntrum\n\n<<<HISTORY>>>\nEpigastric pain. Rule out H. pylori.\n\n<<<MACRO>>>\nReceived in formalin are three grey fragments,\nthe largest measuring 3 mm.';
  await page.evaluate((t) => navigator.clipboard.writeText(t), payload);
  await page.click('#btn-lis-capture');
  await page.waitForTimeout(400);
  const got = await page.evaluate(() => ({
    specimen: document.querySelector('#meta-specimen').value,
    clinical: document.querySelector('#meta-clinical').value,
    macro: document.querySelector('#meta-macro').value,
    status: document.querySelector('#lis-status-capture').textContent,
  }));
  assert(got.specimen === 'Antrum', `specimen box held "${got.specimen}"`);
  assert(/H\. pylori/.test(got.clinical), `history box held "${got.clinical}"`);
  assert(/3 mm/.test(got.macro), 'the macro block did not arrive');
  assert(got.macro.split('\n').length === 2, 'the macro block lost its line break');
  assert(/Captured/.test(got.status), `status read "${got.status}"`);
  const strip = await page.locator('#intake-preview').isVisible();
  assert(strip, 'capturing a specimen did not re-run the intake strip');
  return got.status.trim();
});

// The bridge script's hotkeys are scoped to the LIS window and cannot reach this page, so without a
// shortcut here the return leg is the only step of the LIS round trip that needs the mouse.
await check('Cmd/Ctrl+Shift+V captures, and stays out of the way inside a text box', async () => {
  await clearMeta(page);
  await page.waitForTimeout(300);
  const payload = '<<<SPECIMEN>>>\n(A) DC polyp 1 and (B) DC polyp 2\n\n<<<HISTORY>>>\nScreening for colonic polyps';
  await page.evaluate((t) => navigator.clipboard.writeText(t), payload);
  // Focus outside any field: the shortcut fires.
  await page.evaluate(() => document.body.focus());
  await page.keyboard.press('Control+Shift+V');
  await page.waitForTimeout(400);
  const got = await page.evaluate(() => document.querySelector('#meta-specimen').value);
  assert(/DC polyp 1/.test(got), `the shortcut did not capture; specimen box held "${got}"`);

  // Focus inside a real textarea. There Ctrl+Shift+V is paste-without-formatting and belongs to the
  // browser, so the app must not take it: capturing a stray clipboard into the meta boxes instead of
  // pasting where the caret is would be a wrong-field surprise, which is the one thing this bridge
  // exists to avoid. (#meta-details is a <details> disclosure, not a field - the shortcut does fire
  // there, and an earlier version of this check failed because it focused that by mistake.)
  await clearMeta(page);
  await page.waitForTimeout(300);
  await page.evaluate(() => navigator.clipboard.writeText('<<<SPECIMEN>>>\nShould not arrive'));
  // The history box lives inside the collapsed disclosure, and a hidden textarea cannot take focus -
  // the first version of this check pressed the key with focus still on <body> and read the app's
  // correct behaviour as a failure. Open it, then assert focus actually moved before pressing.
  await page.evaluate(() => { document.querySelector('#meta-details').open = true; });
  await page.focus('#meta-clinical');
  const focused = await page.evaluate(() => document.activeElement?.id);
  assert(focused === 'meta-clinical', `focus was on "${focused}", so this proves nothing`);
  await page.keyboard.press('Control+Shift+V');
  await page.waitForTimeout(350);
  const after = await page.evaluate(() => document.querySelector('#meta-specimen').value);
  assert(!/Should not arrive/.test(after), 'the shortcut fired while typing in a field');
  return 'fires outside a field, ignored inside one';
});

await check('an unmarked copy fills the next empty box in order', async () => {
  await clearMeta(page);
  await page.waitForTimeout(300);
  await page.evaluate(() => navigator.clipboard.writeText('Gallbladder'));
  await page.click('#btn-lis-capture');
  await page.waitForTimeout(350);
  const first = await page.evaluate(() => document.querySelector('#meta-specimen').value);
  assert(first === 'Gallbladder', `first capture landed in "${first}"`);
  await page.evaluate(() => navigator.clipboard.writeText('Biliary colic.'));
  await page.click('#btn-lis-capture');
  await page.waitForTimeout(350);
  const second = await page.evaluate(() => ({
    specimen: document.querySelector('#meta-specimen').value,
    clinical: document.querySelector('#meta-clinical').value,
  }));
  assert(second.specimen === 'Gallbladder', 'the second capture overwrote the specimen box');
  assert(second.clinical === 'Biliary colic.', `second capture landed in "${second.clinical}"`);
  return 'specimen then clinical history, no overwrite';
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
    // A signed-in stranger stays out too. 127.0.0.2 is a secure context to Chrome (loopback, so Web
    // Crypto works) but is not one of the gate's local hosts. The token is planted before the page
    // loads and Google's lookups are answered here: Drive names a stranger, then fails outright.
    const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type' };
    const seen = [];
    for (const [who, about, want] of [['stranger@example.org', { user: { emailAddress: 'stranger@example.org' } }, 'refused'], ['', null, 'unconfirmed']]) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
      try {
        const stranger = await ctx.newPage();
        await stranger.addInitScript(() => {
          sessionStorage.setItem('signout.token.v1', JSON.stringify({ access_token: 'qa', expires_at: Date.now() + 3600e3, email: null }));
        });
        await stranger.route((url) => url.protocol === 'https:', (route) => {
          const req = route.request();
          if (new URL(req.url()).hostname !== 'www.googleapis.com') return route.fulfill({ status: 404, body: '' });
          if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
          return about && req.url().startsWith('https://www.googleapis.com/drive/v3/about')
            ? route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(about) })
            : route.fulfill({ status: 403, headers: CORS, body: '{}' });
        });
        await stranger.goto(`http://127.0.0.2:${PORT + 1}/index.html`, { waitUntil: 'load' });
        await stranger.waitForFunction(() => !document.querySelector('#gate').hidden, null, { timeout: 10000 });
        const mode = await stranger.evaluate(() => document.documentElement.dataset.gate);
        assert(mode === want, `gate mode ${mode}, expected ${want}`);
        assert(!(await stranger.locator('#report-blocks').isVisible().catch(() => false)), `workspace rendered (${want})`);
        assert(await stranger.locator('#gate-signout').isVisible(), `no way to sign out from the gate (${want})`);
        if (who) {
          const note = await stranger.locator('#gate-note').textContent();
          assert(note === `${who} is not on the allowed list for this app. Sign in with a different Google account.`, `refused note: ${note}`);
        }
        seen.push(want);
      } finally {
        await ctx.close();
      }
    }
    return `gate shown, workspace absent; signed-in stranger ${seen.join(', lookup failed ')}`;
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
  assert(await page.locator('#part-panel .pw .pw-next').count(), 'the drawer named no next test and said nothing about it');
  // Read-only: no field appeared or vanished, and the report did not move.
  assert((await page.locator('#part-panel [data-field]').count()) === fieldsBefore, 'the pathway drawer changed the form');
  assert((await page.locator('#report-blocks').innerText()) === reportBefore, 'the pathway drawer changed the report');
  // The list drawer: a stage heading per stage, criteria spelled out, nothing cryptic.
  const nodeCount = await page.locator('#part-panel .pw .pw-node').count();
  assert(nodeCount >= 6, `the drawer listed only ${nodeCount} criteria`);
  const drawerText = (await page.locator('#part-panel .pw').innerText()).trim();
  assert(!/undefined|NaN/.test(drawerText), 'the drawer printed undefined or NaN');
  await shot('cns-pathway');
  // The Map button opens the full-width flowchart overlay: the funnel chain, a fork, connectors, and
  // a detail panel that follows the box you click. It writes nothing either.
  await page.locator('#part-panel .pw .pw-headbtns button', { hasText: 'Map' }).first().click();
  await page.waitForSelector('#dlg-pathway[open]', { timeout: 5000 });
  const funnelBoxes = await page.locator('#dlg-pathway .pwc-node').count();
  assert(funnelBoxes >= 4, `the chart drew only ${funnelBoxes} funnel boxes`);
  assert(await page.locator('#dlg-pathway .pwc-fork').count() === 1, 'the chart drew no fork');
  const stageBoxes = await page.locator('#dlg-pathway .pwc-stage').count();
  assert(stageBoxes >= 1, 'the chart drew no branch stage boxes');
  assert(await page.locator('#dlg-pathway .pwc-link').count() >= stageBoxes, 'the chart drew no connectors');
  const chartText = (await page.locator('#dlg-pathway .pwc-body').innerText()).trim();
  assert(chartText.length > 40 && !/undefined|NaN/.test(chartText), `chart text reads "${chartText.slice(0, 60)}"`);
  assert(await page.locator('#dlg-pathway .pwc-panel').count() === 1, 'the overlay showed no detail panel');
  const panelFirst = (await page.locator('#dlg-pathway .pwc-panel').innerText()).trim();
  assert(panelFirst.length > 10, 'the overlay opened on an empty panel');
  // Nothing spills out of the drawing box.
  const spill = await page.evaluate(() => {
    const box = document.querySelector('#dlg-pathway .pwc').getBoundingClientRect();
    return [...document.querySelectorAll('#dlg-pathway .pwc-node, #dlg-pathway .pwc-stage, #dlg-pathway .pwc-fork, #dlg-pathway .pwc-stub')]
      .filter((n) => { const r = n.getBoundingClientRect(); return r.left < box.left - 1 || r.right > box.right + 1 || r.bottom > box.bottom + 1; }).length;
  });
  assert(spill === 0, `${spill} boxes fell outside the chart`);
  await shot('cns-pathway-chart');
  await page.locator('#dlg-pathway .pwc-srow .pwc-hit').first().click();
  await page.waitForTimeout(250);
  assert(await page.locator('#dlg-pathway .pwc-hit[aria-pressed="true"]').count() === 1, 'picking a box selected no single criterion');
  const panelAfter = (await page.locator('#dlg-pathway .pwc-panel').innerText()).trim();
  assert(panelAfter.length > 10 && panelAfter !== panelFirst, 'the panel did not follow the box that was clicked');
  await page.locator('#dlg-pathway .dialog-head button').first().click();
  await page.waitForTimeout(250);
  assert(!(await page.locator('#dlg-pathway[open]').count()), 'the chart overlay stayed open after Close');
  assert((await page.locator('#part-panel [data-field]').count()) === fieldsBefore, 'the flowchart changed the form');
  assert((await page.locator('#report-blocks').innerText()) === reportBefore, 'the flowchart changed the report');
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

// The tab's draft reopens only for the account that left it (security review 2026-09-30). A draft
// tagged with an account is not shown when that account is not the one signed in (here: nobody),
// and a new case starts; an untagged draft restores as before here, where the gate is off (on the
// signed-in site it is cleared too: tests/store_owner.test.js). Each run gets a fresh tab.
await check('a draft left by another account is not reopened', async () => {
  const cached = await page.evaluate(() => sessionStorage.getItem('signout.case.v1'));
  assert(cached, 'no cached draft on the main page to plant');
  const planted = JSON.parse(cached);
  planted.meta = { ...(planted.meta || {}), accession: 'S26-04242' };
  const notes = [];
  for (const [tag, reopen] of [['someone@example.org', false], ['', true]]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    try {
      const tab = await ctx.newPage();
      await tab.addInitScript(([d, t]) => {
        if (sessionStorage.getItem('qa.planted')) return; // plant once, not again on a reload
        sessionStorage.setItem('qa.planted', '1');
        sessionStorage.setItem('signout.case.v1', d);
        if (t) sessionStorage.setItem('signout.case.owner.v1', t);
      }, [JSON.stringify(planted), tag]);
      await tab.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
      await tab.waitForSelector('#part-panel', { state: 'visible', timeout: 10000 });
      const got = await tab.evaluate(() => ({
        accession: document.querySelector('#meta-accession').value,
        toast: document.querySelector('#toast').textContent,
        tag: sessionStorage.getItem('signout.case.owner.v1')
      }));
      if (reopen) {
        assert(got.accession === 'S26-04242', `untagged draft not restored (accession "${got.accession}")`);
        notes.push('untagged draft restored');
      } else {
        assert(got.accession !== 'S26-04242', 'another account\'s draft was reopened');
        assert(got.toast === 'New case: the draft left on this tab was not saved under this account', `toast: ${got.toast}`);
        assert(got.tag === null, `owner tag survived: ${got.tag}`);
        notes.push('tagged draft cleared, new case');
      }
    } finally {
      await ctx.close();
    }
  }
  return notes.join('; ');
});

// On the signed-in site Sign out is Lock, and the tab's draft follows its account (security review
// 2026-09-30). 127.0.0.2 keeps the gate on; in these browser contexts only, src/gate.js is served
// with a built-in list of two test addresses, so the shipped list is never touched or needed.
await check('sign out on the signed-in site locks, and the draft follows its account', async () => {
  const [A, B] = ['qa.member@example.org', 'qa.other@example.org'];
  const source = await readFile(join(ROOT, 'src', 'gate.js'), 'utf8');
  const start = source.indexOf('export const BUILT_IN_ALLOWED = Object.freeze([');
  const end = source.indexOf(']);', start);
  assert(start >= 0 && end > start, 'BUILT_IN_ALLOWED not found in src/gate.js');
  const digests = await Promise.all([A, B].map((a) => emailDigest(a)));
  const testGate = `${source.slice(0, start)}export const BUILT_IN_ALLOWED = Object.freeze([\n${digests.map((d) => `  '${d}',`).join('\n')}\n${source.slice(end)}`;
  const NEW_CASE = 'New case: the draft left on this tab was not saved under this account';
  const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type' };
  let who = A;
  const open = async (plant) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, serviceWorkers: 'block' });
    const tab = await ctx.newPage();
    await tab.route((url) => url.pathname.endsWith('/src/gate.js'), (route) => route.fulfill({ status: 200, contentType: MIME['.js'], body: testGate }));
    await tab.route((url) => url.protocol === 'https:', (route) => {
      const req = route.request();
      if (new URL(req.url()).hostname !== 'www.googleapis.com') return route.fulfill({ status: 404, body: '' });
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      return req.url().startsWith('https://www.googleapis.com/drive/v3/about')
        ? route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ user: { emailAddress: who } }) })
        : route.fulfill({ status: 403, headers: CORS, body: '{}' });
    });
    await tab.addInitScript((draft) => {
      if (sessionStorage.getItem('qa.planted')) return; // once, not again on a reload
      sessionStorage.setItem('qa.planted', '1');
      sessionStorage.setItem('signout.token.v1', JSON.stringify({ access_token: 'qa', expires_at: Date.now() + 3600e3, email: null }));
      if (draft) sessionStorage.setItem('signout.case.v1', draft);
    }, plant || '');
    await tab.goto(`http://127.0.0.2:${PORT}/index.html`, { waitUntil: 'load' });
    return { ctx, tab };
  };
  const settle = async (tab) => {
    await tab.waitForSelector('#part-panel', { state: 'visible', timeout: 15000 });
    await tab.waitForLoadState('networkidle').catch(() => {});
    await tab.waitForTimeout(800);
  };
  const read = (tab) => tab.evaluate(() => ({
    accession: document.querySelector('#meta-accession').value,
    toast: document.querySelector('#toast').textContent,
    gate: document.querySelector('#gate').hidden ? '' : document.documentElement.dataset.gate,
    cached: sessionStorage.getItem('signout.case.v1'),
    tag: sessionStorage.getItem('signout.case.owner.v1'),
    token: sessionStorage.getItem('signout.token.v1')
  }));
  const signOut = async (tab) => {
    await tab.click('#btn-settings');
    await tab.waitForSelector('#btn-signout', { state: 'visible' });
    await Promise.all([tab.waitForEvent('load'), tab.click('#btn-signout')]);
    await tab.waitForFunction(() => !document.querySelector('#gate').hidden, null, { timeout: 10000 });
  };
  const signIn = async (tab, account) => {
    who = account;
    await tab.evaluate(() => sessionStorage.setItem('signout.token.v1', JSON.stringify({ access_token: 'qa', expires_at: Date.now() + 3600e3, email: null })));
    await tab.reload({ waitUntil: 'load' });
    await settle(tab);
  };
  const { ctx, tab } = await open();
  let legacy = '';
  try {
    await settle(tab);
    assert((await read(tab)).gate === '', 'an allowed test account did not reach the workspace');
    await tab.fill('#meta-accession', 'S2604343');
    await tab.press('#meta-accession', 'Tab');
    await signOut(tab);
    let s = await read(tab);
    assert(s.gate === 'signin', `Sign out left gate "${s.gate}"`);
    assert(!(await tab.locator('#report-blocks').isVisible().catch(() => false)), 'the workspace stayed on screen after Sign out');
    assert(s.token === null, 'the token survived Sign out');
    assert(JSON.parse(s.cached || '{}').meta?.accession === 'S2604343' && s.tag === A, 'the draft was not kept for its account');
    await signIn(tab, A);
    s = await read(tab);
    assert(s.accession === 'S2604343', `the same account did not get its draft back ("${s.accession}")`);
    legacy = s.cached;
    await signOut(tab);
    await signIn(tab, B);
    s = await read(tab);
    assert(s.accession !== 'S2604343', 'another account was shown the draft');
    assert(s.toast === NEW_CASE, `toast: ${s.toast}`);
  } finally {
    await ctx.close();
  }
  // A draft with no tag, as the build before tags left it, is not opened for a signed-in account.
  const old = JSON.parse(legacy);
  old.meta = { ...old.meta, accession: 'S2604444' };
  const second = await open(JSON.stringify(old));
  try {
    await settle(second.tab);
    const s = await read(second.tab);
    assert(s.accession !== 'S2604444', 'an untagged draft was opened on the signed-in site');
    assert(s.toast === NEW_CASE, `toast: ${s.toast}`);
  } finally {
    await second.ctx.close();
  }
  return 'locked on Sign out; same account restored; other account and untagged draft cleared';
});

// ---- compact layout (phones) -----------------------------------------------------
// Runs last and at the end of the desktop journey, so a failure here is unambiguous: the desktop
// checks above have already passed at 1440px. docs/specs/iphone-layout.md
await check('the compact layout fits an iPhone and keeps its targets', async () => {
  const notes = [];
  for (const [w, h, label] of [[390, 844, 'iPhone 14'], [430, 932, 'Pro Max']]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(350);
    assert(await page.locator('#mviews').isVisible(), `${label}: the Case / Report tabs did not appear`);
    assert(await page.locator('#actionbar').isVisible(), `${label}: the bottom action bar did not appear`);
    assert(!(await page.locator('#system-row').isVisible()), `${label}: the system row still takes a band`);
    // Nothing scrolls sideways: the commonest phone-layout failure and the hardest to see.
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(over <= 1, `${label}: the page scrolls ${over}px sideways`);
    // Case tab shows the form and not the report; Report tab the reverse.
    assert(await page.locator('#case').isVisible(), `${label}: the form is hidden on the Case tab`);
    assert(!(await page.locator('#report-blocks').isVisible()), `${label}: the report shows on the Case tab`);
    await page.click('#mview-report');
    await page.waitForTimeout(200);
    assert(await page.locator('#report-blocks').isVisible(), `${label}: the report is hidden on the Report tab`);
    assert(!(await page.locator('#case').isVisible()), `${label}: the form shows on the Report tab`);
    assert(await page.locator('#mview-report[aria-selected="true"]').count() === 1, `${label}: the tab did not mark itself selected`);
    await page.click('#mview-case');
    await page.waitForTimeout(200);
    // Apple's minimum. Measured on what is actually on screen, not on the rule.
    // A checkbox is small by nature; what must reach 44px is the area a thumb can hit, which for a
    // checkbox is its enclosing label.
    const small = await page.evaluate(() => [...document.querySelectorAll('button, .chip, input, select, textarea')]
      .map((el) => (/^(checkbox|radio)$/.test(el.type) && el.closest('label')) || el)
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 44; })
      .map((el) => (el.id || el.className || el.tagName) + ' ' + Math.round(el.getBoundingClientRect().height))
      .slice(0, 6));
    assert(small.length === 0, `${label}: targets under 44px — ${small.join(', ')}`);
    // 16px inputs, or iOS Safari zooms on focus and leaves the page zoomed.
    const tiny = await page.evaluate(() => [...document.querySelectorAll('input, select, textarea')]
      .filter((el) => el.offsetParent !== null && parseFloat(window.getComputedStyle(el).fontSize) < 16).length);
    assert(tiny === 0, `${label}: ${tiny} inputs below 16px would zoom iOS`);
    notes.push(`${w}x${h} clean`);
  }
  // The bottom bar copies the diagnosis through the button that already owns the action.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.click('#m-copy-dx');
  await page.waitForTimeout(350);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert(copied && copied.trim().length > 10, `the bottom bar copied "${String(copied).slice(0, 30)}"`);
  await shot('compact-390');
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.waitForTimeout(300);
  assert(!(await page.locator('#mviews').isVisible()), 'the phone tabs leaked into the desktop layout');
  assert(!(await page.locator('#actionbar').isVisible()), 'the phone action bar leaked into the desktop layout');
  return notes.join(', ') + ', desktop unaffected';
});

// Standalone HER2 ISH: the first biomarker-kind template. It prints no macro and no microscopy, so
// the report is the result block alone — worth checking in the real UI, where an empty block could
// leave a stray heading or a gap behind.
await check('the standalone HER2 ISH report prints the block and no empty headings', async () => {
  await page.setViewportSize({ width: 1440, height: 950 });
  // Reload rather than "New case": by this point the run has built lettered parts, and the menu item
  // asks to discard unsaved work, which would leave part (B) behind and mask what this check reads.
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.click('#btn-palette');
  await page.waitForSelector('#dlg-palette[open]', { timeout: 5000 });
  await page.fill('#palette-search', 'HER2');
  await page.waitForTimeout(250);
  const hit = page.locator('#palette-list [data-template="breast_biomarkers"]');
  assert(await hit.count(), 'HER2 did not find the standalone ISH template in the palette');
  await hit.first().click();
  await page.waitForTimeout(400);
  const parts = await page.locator('#part-tabs .tab-label').count();
  assert(parts <= 1, `the case carried ${parts} parts into this check; the report would not be the ISH report alone`);

  // Three shapes to drive: a field with <= 6 options renders as chip buttons rather than a <select>
  // (src/app.js), so `site` is chips while `her2Dish` with its 12 options is a real select.
  const setField = async (id, value) => {
    const chip = page.locator(`.chips[data-field="${id}"] .chip`, { hasText: value }).first();
    if (await chip.count()) { await chip.click(); await page.waitForTimeout(120); return; }
    const el = page.locator(`[data-field="${id}"] select, [data-field="${id}"] input, [data-field="${id}"] textarea`).first();
    assert(await el.count(), `no ${id} field on the form`);
    if ((await el.evaluate((n) => n.tagName)) === 'SELECT') await el.selectOption({ label: value });
    else await el.fill(value);
    await page.waitForTimeout(120);
  };
  await setField('site', 'Breast');
  await setField('siteDetail', 'left mastectomy');
  await setField('her2Dish', 'Negative (not amplified, Group 5 result)');
  await setField('dishCells', '20');
  await setField('dishHer2', '1.35');
  await setField('dishCep17', '1.9');
  await setField('dishRatio', '0.71');
  await page.waitForTimeout(400);

  const text = await page.locator('#report-blocks').innerText();
  assert(/HER2 DISH : Negative \(not amplified, Group 5 result\)/.test(text), 'the ISH result did not reach the report');
  assert(/Average number of CEP17 signals \(red\) per cell : 1\.9/.test(text), 'the signal counts did not reach the report');
  assert(/Ventana INFORM HER2 Dual ISH DNA Probe Cocktail Assay/.test(text), 'the method sentence is missing');
  assert(!/strogen|rogesterone/i.test(text), 'an ER/PR line leaked into the ISH-only report');
  assert(!/randomized/.test(text), 'American spelling reached the report');
  // No macro and no microscopy: those blocks must be absent, not present and empty.
  for (const [label, re] of [['macroscopic', /MACROSCOPIC/i], ['microscopic', /MICROSCOPIC/i]]) {
    assert(!re.test(text), `the ${label} heading printed on a report that has no such block`);
  }

  // The Checks panel must catch a Group that contradicts the numbers.
  await setField('dishHer2', '6.4');
  await setField('dishRatio', '3.37');
  await page.waitForTimeout(400);
  // The Checks panel is a <details class="checks"> that collapses to a count, so read the list items.
  const checks = (await page.locator('details.checks .issue').allInnerTexts()).join(' | ');
  assert(/Group 1 result, not Group 5/.test(checks), `the group mismatch was not flagged (checks read: ${checks.slice(0, 120)})`);
  await shot('her2-ish-standalone');
  return 'block printed, no empty headings, group mismatch flagged';
});

// A pasted breast core in the house shorthand: "L11H" is the left side at 11 o'clock. Before 2026-09-24
// the side chip stayed on Right and the site printed as "L11H lesion".
await check('a pasted "L11H" breast core builds a left part at 11 o\'clock', async () => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const box = page.locator('#meta-specimen');
  await box.click();
  await box.type('breast, L11H lesion, biopsy', { delay: 4 });
  await page.waitForSelector('#intake-preview table tr', { timeout: 5000 });
  // The reload restores the previous check's case, so the button reads "Replace parts" and asks first.
  const accept = (d) => d.accept();
  page.on('dialog', accept);
  await page.click('#btn-build-parts');
  await page.waitForTimeout(600);
  page.off('dialog', accept);
  const pressed = await page.locator('.chips[data-field="laterality"] .chip[aria-pressed="true"]').allTextContents();
  assert(pressed.length === 1 && /Left/.test(pressed[0]), `side chips pressed: ${JSON.stringify(pressed)}`);
  const site = await page.locator('#f-A-specimenName').inputValue();
  assert(site === "11 o'clock", `the site field read "${site}"`);
  const report = await page.locator('#report-blocks').innerText();
  assert(report.includes("Left breast, 11 o'clock, core biopsy"), `specimen line wrong: ${report.slice(0, 200)}`);
  assert(report.includes("BREAST, left 11 o'clock, core biopsy - "), 'the diagnosis line does not carry the side and the clock');
  await page.locator('#f-A-specimenName').scrollIntoViewIfNeeded();
  await shot('breast-clock-intake');

  // No side in the request: neither chip is pressed, nothing guessed prints, and Checks asks for it.
  await box.fill('');
  await box.type('breast, 11H lesion, biopsy', { delay: 4 });
  await page.waitForSelector('#intake-preview table tr', { timeout: 5000 });
  page.on('dialog', accept);
  await page.click('#btn-build-parts');
  await page.waitForTimeout(600);
  page.off('dialog', accept);
  const none = await page.locator('.chips[data-field="laterality"] .chip[aria-pressed="true"]').count();
  assert(none === 0, `${none} side chip(s) pressed for a request that names no side`);
  const blank = await page.locator('#report-blocks').innerText();
  assert(blank.includes("Breast, 11 o'clock, core biopsy") && blank.includes("BREAST, 11 o'clock, core biopsy - "), `unstated side printed: ${blank.slice(0, 200)}`);
  assert(!/right/i.test(blank.split(/DIAGNOSIS/)[1] || ''), 'a side was guessed into the diagnosis');
  const checks = (await page.locator('details.checks .issue').allTextContents()).join(' | ');
  assert(/Right or Left/.test(checks), `Checks did not ask for the side (read: ${checks.slice(0, 120)})`);
  await shot('breast-clock-no-side');
  return "Left chip, site 11 o'clock, both lines agree; no side named leaves the chips blank and Checks asks";
});

// Pasted brain and lung parts take the site the request names. Before 2026-09-24 "Brain, left temporal
// tumour" printed the form's "right frontal lobe" and "Lung, RLL, wedge resection" printed "right upper
// lobe, lobectomy". A request naming no site leaves the field blank and Checks asks for it.
await check('pasted brain and lung parts print the site the request names, or none', async () => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const box = page.locator('#meta-specimen');
  const accept = (d) => d.accept();
  const build = async (text) => {
    await box.fill('');
    await box.type(text, { delay: 2 });
    await page.waitForSelector('#intake-preview table tr', { timeout: 5000 });
    page.on('dialog', accept);
    await page.click('#btn-build-parts');
    await page.waitForTimeout(700);
    page.off('dialog', accept);
  };
  await build('(A) Brain, left temporal tumour, biopsy\n(B) Brain, biopsy');
  const siteA = await page.locator('#f-A-site').inputValue();
  assert(siteA === 'Temporal lobe', `part A site read "${siteA}"`);
  const sideA = await page.locator('.chips[data-field="side"] .chip[aria-pressed="true"]').allTextContents();
  assert(sideA.length === 1 && /left/i.test(sideA[0]), `part A side chips pressed: ${JSON.stringify(sideA)}`);
  let report = await page.locator('#report-blocks').innerText();
  assert(report.includes('BRAIN, left temporal lobe, stereotactic biopsy'), `part A diagnosis line wrong: ${report.slice(0, 300)}`);
  assert(report.includes('BRAIN, stereotactic biopsy'), 'part B printed a site the request did not name');
  assert(!/frontal/i.test(report), 'the form default "frontal lobe" reached the report');
  await page.locator('#part-tabs .tab').nth(1).click();
  await page.waitForTimeout(300);
  const siteB = await page.locator('#f-B-site').inputValue();
  const shownB = (await page.locator('#f-B-site option:checked').textContent()).trim();
  assert(siteB === '' && shownB === '—', `part B site read "${siteB}" shown "${shownB}"`);
  const checks = (await page.locator('details.checks .issue').allTextContents()).join(' | ');
  assert(/Choose the site/.test(checks), `Checks did not ask for the site (read: ${checks.slice(0, 160)})`);
  await page.locator('#f-B-site').scrollIntoViewIfNeeded();
  await shot('cns-site-intake');

  await build('Lung, RLL, wedge resection');
  const lat = await page.locator('.chips[data-field="laterality"] .chip[aria-pressed="true"]').allTextContents();
  assert(lat.length === 1 && /Right/.test(lat[0]), `lung side chips pressed: ${JSON.stringify(lat)}`);
  const lobes = await page.locator('.chips[data-field="lobes"] .chip[aria-pressed="true"]').allTextContents();
  assert(lobes.length === 1 && /Lower lobe/.test(lobes[0]), `lobe chips pressed: ${JSON.stringify(lobes)}`);
  const proc = await page.locator('#f-A-procedure').inputValue();
  assert(proc === 'Wedge resection', `procedure read "${proc}"`);
  report = await page.locator('#report-blocks').innerText();
  assert(report.includes('LUNG, right lower lobe, wedge resection'), `lung diagnosis line wrong: ${report.slice(0, 300)}`);
  await page.locator('.chips[data-field="lobes"]').scrollIntoViewIfNeeded();
  await shot('lung-lobe-intake');
  return 'brain A temporal lobe + left, B blank site with Checks; lung right lower lobe, wedge resection';
});

// Frozen sentinel and ovary sides come from the request (2026-09-24): "Left SLN 1" used to print
// "LYMPH NODE, SLN 1" with the side dropped. A request with no side leaves the field blank and Checks
// asks. The same run checks the lower-case diagnosis connector on a duodenal adenoma.
await check('a pasted frozen sentinel node prints its side, or none with a Checks prompt; "with" is lower case', async () => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const box = page.locator('#meta-specimen');
  const accept = (d) => d.accept();
  // A frozen request line never says "frozen" (0 of the 1291 parts in the 2021-2026 FS export), so the
  // sentinel rows arrive on Lymph node excision and the pathologist picks Frozen section on each row.
  const build = async (text, pick = {}) => {
    await box.fill('');
    await box.type(text, { delay: 2 });
    await page.waitForSelector('#intake-preview table tr', { timeout: 5000 });
    for (const [label, id] of Object.entries(pick)) {
      await page.locator(`#intake-preview select[aria-label="Template for part ${label}"]`).selectOption(id);
      await page.waitForTimeout(200);
    }
    page.on('dialog', accept);
    await page.click('#btn-build-parts');
    await page.waitForTimeout(800);
    page.off('dialog', accept);
  };
  const setField = async (id, value) => {
    const chip = page.locator(`.chips[data-field="${id}"] .chip`, { hasText: value }).first();
    if (await chip.count()) { await chip.click(); await page.waitForTimeout(150); return; }
    const el = page.locator(`[data-field="${id}"] select`).first();
    assert(await el.count(), `no ${id} field on the form`);
    await el.selectOption({ label: value });
    await page.waitForTimeout(150);
  };
  await build('(A) Left SLN 1\n(B) Sentinel lymph node', { A: 'frozen_section', B: 'frozen_section' });
  let report = await page.locator('#report-blocks').innerText();
  assert(/\(A\) LYMPH NODE, left SLN 1, excision x frozen section/.test(report), `part A line wrong: ${report.slice(0, 300)}`);
  assert(/\(B\) LYMPH NODE, SLN \d+, excision x frozen section/.test(report), `part B line wrong or sided: ${report.slice(0, 400)}`);
  // Side renders as chips: "Not stated", "Right", "Left".
  const pressed = () => page.locator('.chips[data-field="slnSide"] .chip[aria-pressed="true"]').allTextContents();
  const sideA = await pressed();
  assert(sideA.length === 1 && /Left/.test(sideA[0]), `part A side chips pressed: ${JSON.stringify(sideA)}`);
  await page.locator('#part-tabs .tab').nth(1).click();
  await page.waitForTimeout(300);
  const sideB = await pressed();
  assert(!sideB.some((t) => /Right|Left/.test(t)), `part B side chips pressed: ${JSON.stringify(sideB)}`);
  const checks = (await page.locator('details.checks .issue').allInnerTexts()).join(' | ');
  assert(/Choose Right or Left: no side is set for the sentinel node/.test(checks), `Checks did not ask for the side (read: ${checks.slice(0, 200)})`);
  await page.locator('.chips[data-field="slnSide"]').scrollIntoViewIfNeeded();
  await shot('frozen-sln-side');

  await build('Duodenum, D2, biopsy');
  await setField('neoplasia', 'Adenoma, low grade dysplasia');
  await page.waitForTimeout(300);
  report = await page.locator('#report-blocks').innerText();
  assert(report.includes('TUBULAR ADENOMA with LOW GRADE DYSPLASIA'), `duodenal line wrong: ${report.slice(-300)}`);
  assert(!/\bWITH\b/.test(report), 'a capital WITH reached the report');
  await shot('duodenal-with');
  return 'A "left SLN 1", B no side with Checks prompt; duodenal "TUBULAR ADENOMA with LOW GRADE DYSPLASIA"';
});

// Benign batch 1 (2026-09-24): soft tissue, abscess / granulation tissue and bone / joint from a pasted
// request. Each builds the part from the LIS line, sets the fields a pathologist would, and reads the report.
const pasteAndBuild = async (text) => {
  const box = page.locator('#meta-specimen');
  const accept = (d) => d.accept();
  await box.fill('');
  await box.type(text, { delay: 2 });
  await page.waitForSelector('#intake-preview table tr', { timeout: 5000 });
  const routed = await page.locator('#intake-preview select[aria-label="Template for part A"]').inputValue();
  page.on('dialog', accept);
  await page.click('#btn-build-parts');
  await page.waitForTimeout(800);
  page.off('dialog', accept);
  return routed;
};
const pickField = async (id, value) => {
  // A chip reads "<key digit><label>"; match the label exactly so "Amplified" is not "Not amplified".
  const exact = new RegExp(`^\\s*\\d*\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
  const chip = page.locator(`.chips[data-field="${id}"] .chip`).filter({ hasText: exact }).first();
  if (await chip.count()) { await chip.click(); await page.waitForTimeout(200); return; }
  const el = page.locator(`[data-field="${id}"] select`).first();
  assert(await el.count(), `no ${id} field on the form`);
  await el.selectOption({ label: value });
  await page.waitForTimeout(200);
};
const reportText = () => page.locator('#report-blocks').innerText();
const checksText = async () => (await page.locator('details.checks .issue').allInnerTexts()).join(' | ');

await check('soft tissue: a pasted excision prints its own site and no guessed lipoma; MDM2 amplification reaches the comment', async () => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const routed = await pasteAndBuild('Soft tissue, right thigh, excision');
  assert(routed === 'soft_tissue_benign', `routed to ${routed}`);
  let report = await reportText();
  assert(report.includes('SOFT TISSUE, right thigh, excision - LIPOMA'), `diagnosis line wrong: ${report.slice(-300)}`);
  assert(!/thigh lipoma/i.test(report), 'the form default "lipoma" reached the site');
  await pickField('diagnosis', 'Atypical lipomatous tumour – see comment');
  await pickField('mdm2', 'Amplified');
  report = await reportText();
  assert(report.includes('SOFT TISSUE, right thigh, excision - ATYPICAL LIPOMATOUS TUMOUR'), `ALT line wrong: ${report.slice(-400)}`);
  assert(report.includes('The atypical lipomatous tumour shows MDM2 amplification.'), 'the MDM2 comment did not print');
  await page.locator('[data-field="mdm2"]').first().scrollIntoViewIfNeeded();
  await shot('soft-tissue-alt');
  return 'right thigh excision, no lipoma guess; ALT with MDM2 amplification and comment';
});

await check('abscess / granulation tissue: a pasted pilonidal sinus prints the house line and the hair-shaft sentence', async () => {
  const routed = await pasteAndBuild('Pilonidal sinus');
  assert(routed === 'abscess_granulation', `routed to ${routed}`);
  await pickField('diagnosis', 'Sinus tract');
  await pickField('foreignMaterial', 'Hair shafts');
  const report = await reportText();
  assert(report.includes('SKIN, pilonidal sinus - PILONIDAL SINUS'), `diagnosis line wrong: ${report.slice(-300)}`);
  assert(report.includes('Hair shafts engulfed by foreign-body giant cells are seen in the wall of the sinus tract.'), 'hair-shaft sentence missing');
  assert(report.includes('There is no evidence of dysplasia or malignancy.'), 'closing sentence missing');
  await page.locator('[data-field="foreignMaterial"]').first().scrollIntoViewIfNeeded();
  await shot('abscess-pilonidal');
  return 'pilonidal sinus line, hair shafts, house closing';
});

await check('bone / joint: revision synovium lists synovial diagnoses; a vertebral metastasis asks for its IHC until typed', async () => {
  let routed = await pasteAndBuild('Synovium, left hip, revision THR');
  assert(routed === 'bone_joint', `synovium routed to ${routed}`);
  const opts = await page.locator('[data-field="diagnosis"] select option').allTextContents();
  assert(opts.includes('Wear debris reaction') && !opts.includes('Osteoarthritis'), `synovium diagnosis list: ${opts.join(', ')}`);
  let report = await reportText();
  assert(report.includes('SYNOVIUM, left hip, revision arthroplasty - CHRONIC SYNOVITIS; NO EVIDENCE OF INFECTION'), `synovium line wrong: ${report.slice(-300)}`);
  await page.locator('[data-field="diagnosis"]').first().scrollIntoViewIfNeeded();
  await shot('bone-synovium-revision');

  routed = await pasteAndBuild('Bone, L3 vertebral biopsy');
  assert(routed === 'bone_joint', `vertebral biopsy routed to ${routed}`);
  await pickField('diagnosis', 'Metastatic carcinoma');
  let checks = await checksText();
  assert(/record the immunohistochemistry that supports it/.test(checks), `Checks did not ask for the IHC (read: ${checks.slice(0, 200)})`);
  await page.fill('#f-A-ihcPositive', 'CK7, TTF-1');
  await page.waitForTimeout(400);
  checks = await checksText();
  assert(!/record the immunohistochemistry/.test(checks), 'the IHC prompt stayed after the panel was typed');
  report = await reportText();
  assert(report.includes('BONE, L3 vertebral, biopsy - METASTATIC ADENOCARCINOMA; see comment'), `metastasis line wrong: ${report.slice(-300)}`);
  assert(report.includes('the tumour cells are positive for CK7 and TTF-1'), 'typed IHC did not reach the microscopy');
  await page.locator('#f-A-ihcPositive').scrollIntoViewIfNeeded();
  await shot('bone-vertebral-metastasis');
  return 'synovium list and line; L3 metastasis Checks prompt cleared by CK7, TTF-1';
});

// Benign batch 2 (2026-09-24): products of gestation on the endometrial form, and a standalone tube on the
// benign uterus form, each from a pasted request.
await check('products of gestation: a pasted tissue mass asks for the villi, then prints the house line', async () => {
  const routed = await pasteAndBuild('Tissue mass per vagina');
  assert(routed === 'endometrial_biopsy', `routed to ${routed}`);
  const type = await page.locator('[data-field="specimenType"] select').first().inputValue();
  assert(type === 'Tissue mass, per vaginam', `specimen type read "${type}"`);
  let checks = await checksText();
  assert(/Chorionic villi: record present or absent/.test(checks), `Checks did not ask for the villi (read: ${checks.slice(0, 200)})`);
  await pickField('villi', 'Present');
  let report = await reportText();
  assert(report.includes('TISSUE MASS, per vaginam - PRODUCTS OF GESTATION confirmed'), `diagnosis line wrong: ${report.slice(-300)}`);
  assert(/- Chorionic villi\s+- Present/.test(report) && report.includes('- Decidua: Present'), `checklist microscopy missing: ${report.slice(0, 400)}`);
  assert(!/CONCEPTION|conception/.test(report), 'the report says conception');
  await page.locator('[data-field="villi"]').first().scrollIntoViewIfNeeded();
  await shot('pog-villi-present');
  await pickField('villi', 'Absent');
  report = await reportText();
  assert(report.includes('TISSUE MASS, per vaginam - DECIDUA only'), `no-villi line wrong: ${report.slice(-300)}`);
  checks = await checksText();
  assert(/an ectopic pregnancy should be suspected/.test(checks), `Checks did not warn about an ectopic (read: ${checks.slice(0, 200)})`);
  await shot('pog-no-villi');
  return 'per vaginam type pre-filled; villi prompt; confirmed line; DECIDUA only with the ectopic warning';
});

// Cervical polyps and endometrial aspirates (user request, 2026-10-05).
await check('cervical polyp and endometrial aspirate: pasted lines open their forms with the house lines', async () => {
  const valueOf = async (id) => {
    const sel = page.locator(`[data-field="${id}"] select`);
    if (await sel.count()) return sel.first().inputValue();
    return (await page.locator(`.chips[data-field="${id}"] .chip[aria-pressed="true"]`).allTextContents()).join('|');
  };
  let routed = await pasteAndBuild('Cervical polyp');
  assert(routed === 'cervical_biopsy', `polyp routed to ${routed}`);
  const type = await valueOf('specimenType');
  assert(/Cervical polyp/.test(type), `specimen type read "${type}"`);
  assert(await page.locator('.field[data-field="polypType"]:visible').count() === 1, 'no polyp type field');
  assert(await page.locator('.field[data-field="tissue"]:visible').count() === 0, 'the biopsy tissue picker shows on a polyp');
  let report = await reportText();
  assert(report.includes('CERVIX, polypectomy - ENDOCERVICAL POLYP') && !report.includes('ENDOCERVICAL POLYP;'), `polyp line wrong: ${report.slice(-300)}`);
  assert(report.includes('lined by mucinous columnar epithelium and set in a fibrovascular stroma'), `polyp microscopy wrong: ${report.slice(0, 400)}`);
  await pickField('polypType', 'Decidual polyp');
  report = await reportText();
  assert(report.includes('CERVIX, polypectomy - DECIDUAL POLYP') && report.includes('decidualised cells'), `decidual polyp wrong: ${report.slice(-300)}`);
  await page.locator('[data-field="polypType"]').first().scrollIntoViewIfNeeded();
  await shot('cervical-decidual-polyp');

  routed = await pasteAndBuild('Endometrial aspirate');
  assert(routed === 'endometrial_biopsy', `aspirate routed to ${routed}`);
  const sample = await valueOf('specimenType');
  assert(/Endometrial aspirate/.test(sample), `sample type read "${sample}"`);
  report = await reportText();
  assert(report.includes('ENDOMETRIUM, aspirate - PROLIFERATIVE ENDOMETRIUM') && !report.includes('PROLIFERATIVE ENDOMETRIUM;'), `aspirate line wrong: ${report.slice(-300)}`);
  assert(!/curettings/i.test(report), 'curettings in an aspirate report');
  await shot('endometrial-aspirate');
  return 'polyp pre-filled; ENDOCERVICAL then DECIDUAL POLYP lines; aspirate line with no trailing negative';
});

// Colonic polyp descriptions and malignant polyp levels (user request, 2026-10-05).
await check('colonic polyp: serrated and high grade descriptions; Haggitt level on a pasted polypectomy', async () => {
  const visible = (id) => page.locator(`.field[data-field="${id}"]:visible`).count();
  const routed = await pasteAndBuild('Sigmoid colon, polypectomy');
  assert(routed === 'colonic_polyp', `routed to ${routed}`);
  await pickField('type', 'Sessile serrated lesion / adenoma');
  assert(await visible('sslFeatures') === 1, 'no SSL features field');
  let report = await reportText();
  assert(report.includes('architecturally distorted serrated crypts, which show basal dilatation and serration extending into the crypt bases'), `SSL microscopy wrong: ${report.slice(0, 400)}`);
  await pickField('type', 'Traditional serrated adenoma');
  assert(await visible('tsaFeatures') === 1 && await visible('sslFeatures') === 0, 'TSA / SSL feature fields wrong');
  report = await reportText();
  assert(report.includes('villiform architecture, slit-like serrations and ectopic crypt foci, lined by tall columnar cells'), `TSA microscopy wrong: ${report.slice(0, 400)}`);
  await pickField('type', 'Tubular adenoma');
  await pickField('dysplasia', 'High grade dysplasia');
  assert(await visible('hgdFeatures') === 1 && await visible('hgdFocal') === 1, 'no high grade fields');
  await page.check('#f-A-hgdFocal');
  await page.waitForTimeout(200);
  report = await reportText();
  assert(report.includes('TUBULAR ADENOMA with focal HIGH GRADE DYSPLASIA'), `focal diagnosis wrong: ${report.slice(-300)}`);
  assert(report.includes('There is focal high grade dysplasia, showing cribriform and back-to-back glands'), `focal microscopy wrong: ${report.slice(0, 400)}`);
  await page.locator('[data-field="hgdFeatures"]').first().scrollIntoViewIfNeeded();
  await shot('colonic-focal-hgd');
  await page.uncheck('#f-A-hgdFocal');
  await pickField('dysplasia', 'Invasive adenocarcinoma');
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { if (d.querySelector('[data-field="haggitt"]')) d.open = true; }));
  assert(await visible('haggitt') === 1 && await visible('kikuchi') === 1, 'levels hidden on a pasted polypectomy (specimen kind not filled?)');
  await pickField('haggitt', 'Level 2 (neck)');
  report = await reportText();
  assert(report.includes('Invasion extends into the submucosa at the neck of the polyp (Haggitt level 2).'), `Haggitt sentence missing: ${report.slice(0, 600)}`);
  assert(report.includes('submucosal invasion (Haggitt level 2)'), `Haggitt not in the diagnosis: ${report.slice(-300)}`);
  await page.locator('[data-field="haggitt"]').first().scrollIntoViewIfNeeded();
  await shot('colonic-haggitt');
  await pickField('caKind', 'Biopsy of mass');
  assert(await visible('haggitt') === 0 && await visible('invasionDepth') === 0, 'levels show on a biopsy of a mass');
  return 'SSL and TSA features printed; focal HGD line; Haggitt level 2 as the depth sentence and in the diagnosis; hidden on a biopsy';
});

await check('fallopian tube: a pasted salpingectomy and a paratubal cyst open the tube fields only', async () => {
  let routed = await pasteAndBuild('Left fallopian tube, salpingectomy');
  assert(routed === 'uterus_benign', `salpingectomy routed to ${routed}`);
  const name = await page.locator('[data-field="specimenName"] select').first().inputValue();
  assert(name === 'Left fallopian tube, salpingectomy', `specimen read "${name}"`);
  for (const id of ['leiomyomaSize', 'weight', 'endometriumThickness', 'ovarySize']) {
    assert(await page.locator(`.field[data-field="${id}"]:visible`).count() === 0, `${id} shows on a tube part`);
  }
  assert(await page.locator('.field[data-field="tubeFindings"]:visible').count() === 1, 'no tube findings field');
  await page.fill('#f-A-tubeSize', '5 x 0.6');
  await page.fill('#f-A-cystSize', '2');
  await pickField('tubeFindings', 'Paratubal cyst');
  await page.waitForTimeout(300);
  let report = await reportText();
  assert(report.includes('Received in formalin is a left fallopian tube measuring 5 cm in length and 0.6 cm in diameter. A thin-walled paratubal cyst measuring 2 cm is attached.'), `macro wrong: ${report.slice(0, 400)}`);
  assert(report.includes('(3) Paratubal cyst.'), 'no paratubal cyst block');
  assert(report.includes('Left FALLOPIAN TUBE, salpingectomy - PARATUBAL CYST'), `diagnosis line wrong: ${report.slice(-300)}`);
  assert(!/leiomyoma|endometri|cervix/i.test(report), 'uterus wording reached a tube report');
  await page.locator('[data-field="tubeFindings"]').first().scrollIntoViewIfNeeded();
  await shot('tube-salpingectomy');

  routed = await pasteAndBuild('FALLOPIAN TUBE, right paratubal cyst, excision');
  assert(routed === 'uterus_benign', `paratubal cyst routed to ${routed}`);
  const sideChip = await page.locator('.chips[data-field="paratubalSide"] .chip[aria-pressed="true"]').allTextContents();
  const sideSel = await page.locator('[data-field="paratubalSide"] select').count() ? await page.locator('[data-field="paratubalSide"] select').first().inputValue() : '';
  assert((sideChip.length === 1 && /Right/.test(sideChip[0])) || sideSel === 'Right', `side read ${JSON.stringify(sideChip)} / "${sideSel}"`);
  report = await reportText();
  assert(report.includes('Right paratubal cyst, excision'), `specimen line wrong: ${report.slice(0, 160)}`);
  assert(report.includes('FALLOPIAN TUBE, right paratubal cyst, excision - PARATUBAL CYST'), `paratubal line wrong: ${report.slice(-300)}`);
  await page.locator('[data-field="paratubalSide"]').first().scrollIntoViewIfNeeded();
  await shot('tube-paratubal-cyst');

  routed = await pasteAndBuild('Left ovary and fallopian tube');
  assert(routed !== 'uterus_benign', 'a line naming the ovary moved to the uterus form');
  return 'left salpingectomy with cyst, uterus fields hidden; right paratubal cyst sided; ovary line keeps its route';
});

// Benign batch 2 (2026-09-24): the ectopic form from a pasted request, sided and with its procedure read
// from the line; a salpingotomy swaps the tube fields for the fragments. A tube-only line keeps the tube form.
await check('ectopic: a pasted tubal ectopic opens its own form sided, and a salpingotomy shows the fragments only', async () => {
  const chosen = async (id) => {
    const chips = await page.locator(`.chips[data-field="${id}"] .chip[aria-pressed="true"]`).allTextContents();
    if (chips.length) return chips.map((c) => c.replace(/^\s*\d*\s*/, '').trim()).join(',');
    const sel = page.locator(`[data-field="${id}"] select`).first();
    return (await sel.count()) ? sel.inputValue() : '';
  };
  let routed = await pasteAndBuild('Left fallopian tube, ectopic pregnancy, salpingectomy');
  assert(routed === 'fallopian_tube_ectopic', `ectopic line routed to ${routed}`);
  let side = await chosen('side');
  let procedure = await chosen('procedure');
  assert(side === 'Left' && procedure === 'Salpingectomy', `side / procedure read "${side}" / "${procedure}"`);
  assert(await page.locator('.field[data-field="fragmentSize"]:visible').count() === 0, 'fragment size shows on a salpingectomy');
  await page.fill('#f-A-overallSize', '4 x 2 x 2');
  await page.fill('#f-A-tubeLength', '5');
  await page.fill('#f-A-lumenDiameter', '2');
  await pickField('serosa', 'Haemorrhage extends to the serosal surface');
  await pickField('villi', 'Present, degenerate');
  await page.waitForTimeout(300);
  let report = await reportText();
  assert(report.includes('Received in formalin is a distended segment of tubal tissue measuring 4 x 2 x 2 cm. A segment of left fallopian tube is identified measuring 5 cm long, and its lumen is distended, up to 2 cm across.'), `macro wrong: ${report.slice(0, 400)}`);
  assert(report.includes('The area of haemorrhage extends to the serosal surface. No foetal parts are grossly identified. 3 representative blocks.'), `serosa, foetal parts or blocks sentence missing: ${report.slice(0, 700)}`);
  assert(report.includes('(2)&(3) Haemorrhagic tubal tissue with distension.'), 'block key wrong');
  assert(report.includes('The sections show degenerate chorionic villi and haemorrhage within the lumen of the fallopian tube.'), 'microscopy wrong');
  assert(report.includes('Left FALLOPIAN TUBE, salpingectomy - ECTOPIC TUBAL PREGNANCY'), `diagnosis line wrong: ${report.slice(-300)}`);
  assert(!/fetal/i.test(report), 'the report says fetal');
  await page.locator('[data-field="villi"]').first().scrollIntoViewIfNeeded();
  await shot('ectopic-salpingectomy');
  await pickField('villi', 'Not identified');
  report = await reportText();
  assert(report.includes('NO CHORIONIC VILLI OR TROPHOBLAST IDENTIFIED; see comment') && report.includes('serial serum hCG levels is suggested.'), `no-villi line or comment missing: ${report.slice(-400)}`);
  const checks = await checksText();
  assert(/communicate the result to the clinical team promptly/.test(checks), `Checks did not flag the unconfirmed pregnancy (read: ${checks.slice(0, 200)})`);
  await shot('ectopic-no-villi');

  routed = await pasteAndBuild('Right tubal pregnancy, salpingotomy');
  assert(routed === 'fallopian_tube_ectopic', `salpingotomy routed to ${routed}`);
  side = await chosen('side');
  procedure = await chosen('procedure');
  assert(side === 'Right' && procedure === 'Salpingotomy', `salpingotomy side / procedure read "${side}" / "${procedure}"`);
  for (const id of ['overallSize', 'tubeLength', 'serosa', 'epithelium']) {
    assert(await page.locator(`.field[data-field="${id}"]:visible`).count() === 0, `${id} shows on a salpingotomy`);
  }
  assert(await page.locator('.field[data-field="fragmentSize"]:visible').count() === 1, 'no fragment size on a salpingotomy');
  report = await reportText();
  assert(report.includes('Right FALLOPIAN TUBE, salpingotomy - PRODUCTS OF GESTATION, consistent with ECTOPIC TUBAL PREGNANCY'), `salpingotomy line wrong: ${report.slice(-400)}`);
  assert(report.includes('Following salpingotomy, trophoblast may persist in the tube'), 'no persistent-trophoblast comment');
  await page.locator('[data-field="fragmentSize"]').first().scrollIntoViewIfNeeded();
  await shot('ectopic-salpingotomy');

  routed = await pasteAndBuild('Left fallopian tube, salpingectomy');
  assert(routed === 'uterus_benign', `a tube-only line moved to ${routed}`);
  return 'left salpingectomy sided, model wording; no-villi line, comment and Checks; right salpingotomy fragments only; tube-only line keeps the tube form';
});

// Benign batch 3 (2026-09-25): a pasted haemorrhoid, cholesteatoma, hernia sac and nail clipping each open
// their own form with the line read into it, and print the house diagnosis line.
await check('batch 3: pasted haemorrhoid, ear, hernia sac and nail lines open their own forms with the house lines', async () => {
  let routed = await pasteAndBuild('Haemorrhoid');
  assert(routed === 'haemorrhoid', `haemorrhoid routed to ${routed}`);
  await pickField('findings', 'Thrombosis');
  let report = await reportText();
  assert(report.includes('ANUS, haemorrhoid, excision - HAEMORRHOID'), `haemorrhoid line wrong: ${report.slice(-300)}`);
  assert(report.includes('There is no evidence of dysplasia or malignancy.'), 'the haemorrhoid closing sentence is missing');
  assert(!/HAEMORRHOIDS|hemorrhoid/.test(report), 'plural or American haemorrhoid in the report');
  await page.locator('[data-field="findings"]').first().scrollIntoViewIfNeeded();
  await shot('batch3-haemorrhoid');

  routed = await pasteAndBuild('Left ear, cholesteatoma');
  assert(routed === 'ear_cholesteatoma', `ear routed to ${routed}`);
  report = await reportText();
  assert(report.includes('EAR, left cholesteatoma, resection - CHOLESTEATOMA'), `ear line wrong: ${report.slice(-300)}`);
  await shot('batch3-ear');

  routed = await pasteAndBuild('Right inguinal hernia sac');
  assert(routed === 'hernia_sac', `hernia routed to ${routed}`);
  const type = await page.locator('[data-field="herniaType"] select').first().inputValue();
  assert(type === 'Inguinal', `hernia type read "${type}"`);
  report = await reportText();
  assert(report.includes('SOFT TISSUE, right inguinal hernia sac, excision - In keeping with HERNIA SAC'), `hernia line wrong: ${report.slice(-300)}`);
  assert(report.includes('There is no evidence of granulomatous inflammation or malignancy.'), 'the hernia closing sentence is missing');
  await shot('batch3-hernia');

  routed = await pasteAndBuild('Nail clipping, right hallux');
  assert(routed === 'nail_digit', `nail routed to ${routed}`);
  report = await reportText();
  assert(report.includes('NAIL, right hallux, clipping - ONYCHOMYCOSIS'), `nail line wrong: ${report.slice(-300)}`);
  await pickField('diagnosis', 'No fungal organisms');
  report = await reportText();
  assert(report.includes('NAIL, right hallux, clipping - NO FUNGAL ORGANISMS IDENTIFIED'), `negative nail line wrong: ${report.slice(-300)}`);
  await page.locator('[data-field="diagnosis"]').first().scrollIntoViewIfNeeded();
  await shot('batch3-nail');
  return 'thrombosed haemorrhoid, left cholesteatoma, right inguinal sac typed Inguinal, nail clipping positive then negative';
});

// Benign batch 3 (2026-09-25): the testis form shows only the fields of the specimen the line names.
await check('batch 3: foreskin, torsion and vasectomy lines open only their own testis fields', async () => {
  const shows = async (id) => (await page.locator(`.field[data-field="${id}"]:visible`).count()) > 0;
  let routed = await pasteAndBuild('Foreskin, circumcision');
  assert(routed === 'testis_benign', `foreskin routed to ${routed}`);
  assert(await shows('prepuceDx'), 'no prepuce diagnosis field on a circumcision');
  for (const id of ['orchidDx', 'mikuz', 'pattern', 'johnsen', 'cystType', 'crossSection']) assert(!(await shows(id)), `${id} shows on a circumcision`);
  await pickField('prepuceDx', 'Lichen sclerosus');
  let report = await reportText();
  assert(report.includes('FORESKIN, circumcision - Consistent with LICHEN SCLEROSUS (balanitis xerotica obliterans)'), `foreskin line wrong: ${report.slice(-300)}`);
  assert(report.includes('There is no evidence of penile intraepithelial neoplasia or malignancy.'), 'the prepuce closing sentence is missing');
  let checks = await checksText();
  assert(!/side/i.test(checks), `Checks asked a prepuce for a side (read: ${checks.slice(0, 200)})`);
  await page.locator('[data-field="prepuceDx"]').first().scrollIntoViewIfNeeded();
  await shot('batch3-foreskin');

  routed = await pasteAndBuild('Right testis, torsion, orchidectomy');
  assert(routed === 'testis_benign', `torsion routed to ${routed}`);
  assert(await shows('mikuz'), 'no Mikuz grade on a torsion');
  for (const id of ['prepuceDx', 'leydig', 'gcnis', 'spermatogenesis']) assert(!(await shows(id)), `${id} shows on a torsion`);
  report = await reportText();
  assert(report.includes('TESTIS, right, orchidectomy - In keeping with TORSION OF TESTIS, Mikuz grade 3'), `torsion line wrong: ${report.slice(-300)}`);
  assert(!/viable|reversible/.test(report), 'a viability clause reached the report');
  await page.locator('[data-field="mikuz"]').first().scrollIntoViewIfNeeded();
  await shot('batch3-torsion');

  routed = await pasteAndBuild('Bilateral vas deferens, vasectomy');
  assert(routed === 'testis_benign', `vasectomy routed to ${routed}`);
  checks = await checksText();
  assert(/Bilateral vasectomy: submit one block of each vas\./.test(checks), `Checks did not ask for a block per vas (read: ${checks.slice(0, 200)})`);
  await page.fill('#f-A-blocks', '2');
  await page.waitForTimeout(300);
  checks = await checksText();
  assert(!/one block of each vas/.test(checks), 'the block prompt stayed after two blocks');
  report = await reportText();
  assert(report.includes('VAS DEFERENS, bilateral, vasectomy - VAS DEFERENS, full cross-section of both segments'), `vasectomy line wrong: ${report.slice(-300)}`);
  await shot('batch3-vasectomy');
  return 'foreskin fields only with lichen sclerosus; torsion Mikuz 3, no viability clause; bilateral vasectomy block prompt clears at two';
});

// Liver pair (2026-09-30): a pasted random liver biopsy under a deranged LFT history opens the medical
// liver form; the pattern pick shows only its own fields, a field gallery opens its photos, and a line
// naming a mass is left to the other forms.
await check('medical liver: a pasted random biopsy opens Liver (medical); each pattern shows its own fields; the gallery opens', async () => {
  const shows = async (id) => (await page.locator(`.field[data-field="${id}"]:visible`).count()) > 0;
  let routed = await pasteAndBuild('History\nDeranged liver function\n\nSpecimen\n(A) Liver, random, biopsy');
  assert(routed === 'liver_biopsy', `random liver biopsy routed to ${routed}`);
  let report = await reportText();
  assert(report.includes('LIVER, random, biopsy - CHRONIC HEPATITIS with MINIMAL ACTIVITY and NO FIBROSIS'), `hepatitic line wrong: ${report.slice(-300)}`);
  assert(await shows('hepDx') && await shows('interface') && !(await shows('bilDx')) && !(await shows('nasSteatosis')), 'the hepatitic fields are not the ones showing');
  await pickField('pattern', 'Biliary');
  assert(await shows('bilDx') && await shows('bilFeatures') && !(await shows('hepDx')), 'the biliary fields are not the ones showing');
  report = await reportText();
  assert(report.includes('LIVER, random, biopsy - CHRONIC BILIARY DISEASE'), `biliary line wrong: ${report.slice(-300)}`);
  await pickField('pattern', 'Steatotic');
  assert(await shows('nasSteatosis') && await shows('nasBallooning') && !(await shows('bilDx')) && !(await shows('interface')), 'the steatotic fields are not the ones showing');
  await page.locator('.field[data-field="pattern"] .ref-toggle').first().click();
  await page.waitForSelector('.field[data-field="pattern"] .ref-panel img', { timeout: 5000 });
  const imgs = page.locator('.field[data-field="pattern"] .ref-panel img');
  const photos = await imgs.count();
  assert(photos === 4, `pattern gallery holds ${photos} photos`);
  for (let i = 0; i < photos; i++) await imgs.nth(i).scrollIntoViewIfNeeded();   // the photos load lazily
  await page.waitForFunction(() => [...document.querySelectorAll('.field[data-field="pattern"] .ref-panel img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 8000 });
  await page.locator('.field[data-field="pattern"] .ref-panel').first().scrollIntoViewIfNeeded();
  await shot('liver-pattern-gallery');
  await page.locator('.field[data-field="pattern"] .ref-panel img').first().click();
  await page.waitForSelector('#ref-lightbox[open]', { timeout: 3000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  assert(await page.locator('#ref-lightbox[open]').count() === 0, 'the lightbox did not close on Escape');
  await page.locator('.field[data-field="pattern"] .ref-toggle').first().click();
  routed = await pasteAndBuild('History\nDeranged liver function\n\nSpecimen\n(A) Liver, segment 6, mass, biopsy');
  assert(routed !== 'liver_biopsy', 'a liver mass line opened the medical liver form');
  return 'routed on the history; hepatitic, biliary and steatotic fields swap; pattern gallery 4 photos and the lightbox; a mass line stays out';
});

// Hirschsprung pair (2026-09-30): a pasted suction biopsy under a ?Hirschsprung history opens the rectal
// biopsy form with its level filled; the diagnosis line follows the ganglion-cell and calretinin picks, the
// full-thickness pick swaps the submucosa for the myenteric plexus, the calretinin gallery opens, and a plain
// rectal biopsy with no Hirschsprung word is left to the other forms.
await check('Hirschsprung biopsy: a pasted suction biopsy opens the form; the answer follows the picks; the calretinin gallery opens', async () => {
  const shows = async (id) => (await page.locator(`.field[data-field="${id}"]:visible`).count()) > 0;
  let routed = await pasteAndBuild('History\nDelayed passage of meconium, ? Hirschsprung disease\n\nSpecimen\n(A) Rectal suction biopsy, 2 cm from AV');
  assert(routed === 'hirschsprung_biopsy', `suction biopsy routed to ${routed}`);
  let report = await reportText();
  assert(report.includes('RECTUM, 2 cm from AV, suction rectal biopsy:') && report.includes('- GANGLION CELLS PRESENT.'), `present line wrong: ${report.slice(-300)}`);
  assert(await shows('submucosa') && !(await shows('myenteric')) && !(await shows('mastCells')), 'the suction biopsy fields are not the ones showing');
  await pickField('ganglion', 'Not identified');
  await pickField('calretinin', 'No positive nerve fibres');   // the chip shows the option label
  report = await reportText();
  assert(report.includes('- NO GANGLION CELLS IDENTIFIED, consistent with HIRSCHSPRUNG DISEASE.'), `aganglionic line wrong: ${report.slice(-300)}`);
  assert(await shows('mastCells'), 'the mast-cell box did not show with negative calretinin');
  await pickField('procedure', 'Full-thickness biopsy');
  assert(await shows('myenteric') && !(await shows('submucosa')), 'the full-thickness fields are not the ones showing');
  await pickField('procedure', 'Suction biopsy');
  await page.locator('.field[data-field="calretinin"] .ref-toggle').first().click();
  await page.waitForSelector('.field[data-field="calretinin"] .ref-panel img', { timeout: 5000 });
  const imgs = page.locator('.field[data-field="calretinin"] .ref-panel img');
  const photos = await imgs.count();
  assert(photos === 3, `calretinin gallery holds ${photos} photos`);
  for (let i = 0; i < photos; i++) await imgs.nth(i).scrollIntoViewIfNeeded();   // the photos load lazily
  await page.waitForFunction(() => [...document.querySelectorAll('.field[data-field="calretinin"] .ref-panel img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 8000 });
  await page.locator('.field[data-field="calretinin"] .ref-panel').first().scrollIntoViewIfNeeded();
  await shot('hirschsprung-calretinin-gallery');
  await page.locator('.field[data-field="calretinin"] .ref-toggle').first().click();
  routed = await pasteAndBuild('Rectal biopsy');
  assert(routed !== 'hirschsprung_biopsy', 'a plain rectal biopsy opened the Hirschsprung form');
  return 'routed on the line and history; present and aganglionic lines; mast-cell box; full-thickness fields swap; calretinin gallery 3 photos; a plain rectal biopsy stays out';
});

// Neoplastic liver pair (Phase 51): a pasted segment biopsy under a colon carcinoma history opens Liver (mass)
// with its site filled; the line follows the diagnosis, primary-site and basis picks; an EHE without CAMTA1 or
// TFE3 raises a Check; the hepatocellular pick swaps the fields; the diagnosis gallery opens with its photos.
await check('liver mass biopsy: a pasted lesion biopsy opens Liver (mass); the line follows the picks; the gallery opens', async () => {
  const shows = async (id) => (await page.locator(`.field[data-field="${id}"]:visible`).count()) > 0;
  const routed = await pasteAndBuild('History\nCarcinoma of colon, liver lesions\n\nSpecimen\n(A) Liver, segment 7 mass, biopsy');
  assert(routed === 'liver_lesion_biopsy', `liver mass biopsy routed to ${routed}`);
  let report = await reportText();
  assert(report.includes('LIVER, segment 7 mass, biopsy - METASTATIC ADENOCARCINOMA'), `default line wrong: ${report.slice(-300)}`);
  assert(await shows('primarySite') && !(await shows('hccGrade')), 'the metastasis fields are not the ones showing');
  await pickField('primarySite', 'Colorectal');
  report = await reportText();
  assert(report.includes('METASTATIC ADENOCARCINOMA, in keeping with colorectal primary'), `primary line wrong: ${report.slice(-300)}`);
  await pickField('primaryBasis', 'Consistent with the known');
  report = await reportText();
  assert(report.includes('METASTATIC ADENOCARCINOMA, consistent with the known colorectal primary'), `known-primary line wrong: ${report.slice(-300)}`);
  await pickField('dx', 'Epithelioid haemangioendothelioma');
  report = await reportText();
  assert(report.includes('LIVER, segment 7 mass, biopsy - EPITHELIOID HAEMANGIOENDOTHELIOMA'), `EHE line wrong: ${report.slice(-300)}`);
  assert(/CAMTA1 or TFE3 is not recorded/.test(await checksText()), 'Checks did not ask for CAMTA1 or TFE3');
  await pickField('dx', 'Hepatocellular carcinoma');
  assert(await shows('hccGrade') && await shows('reticulin') && !(await shows('primarySite')), 'the hepatocellular fields are not the ones showing');
  await page.locator('.field[data-field="dx"] .ref-toggle').first().click();
  await page.waitForSelector('.field[data-field="dx"] .ref-panel img', { timeout: 5000 });
  const imgs = page.locator('.field[data-field="dx"] .ref-panel img');
  const photos = await imgs.count();
  assert(photos === 6, `diagnosis gallery holds ${photos} photos`);
  for (let i = 0; i < photos; i++) await imgs.nth(i).scrollIntoViewIfNeeded();   // the photos load lazily
  await page.waitForFunction(() => [...document.querySelectorAll('.field[data-field="dx"] .ref-panel img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 8000 });
  await page.locator('.field[data-field="dx"] .ref-panel').first().scrollIntoViewIfNeeded();
  await shot('liver-mass-gallery');
  await page.locator('.field[data-field="dx"] .ref-toggle').first().click();
  return 'routed on the history with the site filled; metastatic, known-primary and EHE lines; CAMTA1/TFE3 Check; HCC fields swap; diagnosis gallery 6 photos';
});

// HCC resection (Phase 51): a pasted right hepatectomy under an HCC history opens the synoptic with the received
// name and a major hepatectomy; the missing size is a Check; size and vascular invasion give pT2 once the pTNM
// option is ticked; the subtype gallery opens with its photos.
await check('HCC resection: a pasted right hepatectomy opens the synoptic; size and vessels set pT2; the subtype gallery opens', async () => {
  const routed = await pasteAndBuild('History\nHepatitis B cirrhosis, HCC\n\nSpecimen\n(A) Right hepatectomy');
  assert(routed === 'hcc', `right hepatectomy routed to ${routed}`);
  let report = await reportText();
  assert(report.includes('LIVER, right hepatectomy') && report.includes('- Moderately differentiated HEPATOCELLULAR CARCINOMA'), `diagnosis head wrong: ${report.slice(-300)}`);
  assert(report.includes('Received in formalin is a partial hepatectomy specimen'), `macro wrong: ${report.slice(0, 300)}`);
  assert(/Size of the largest tumour is required/.test(await checksText()), 'Checks did not ask for the tumour size');
  await page.locator('.field[data-field="tumourSizeCm"] input').first().fill('4.5');
  await page.waitForTimeout(200);
  await pickField('vascularInvasion', 'Present, small vessel invasion');
  const box = page.locator('#case-options label', { hasText: 'Print the AJCC 8th edition pTNM block' }).locator('input[type="checkbox"]');
  assert(await box.count() === 1, 'no pTNM option on the case');
  await box.check();
  await page.waitForTimeout(300);
  report = await reportText();
  assert(report.includes('- pTNM: pT2 pNX') && report.includes('- Stage pT2 (pTNM, AJCC 8th edition)'), `pT2 not printed: ${report.slice(-500)}`);
  await box.uncheck();
  await page.waitForTimeout(200);
  await page.locator('.field[data-field="histType"] .ref-toggle').first().click();
  await page.waitForSelector('.field[data-field="histType"] .ref-panel img', { timeout: 5000 });
  const imgs = page.locator('.field[data-field="histType"] .ref-panel img');
  const photos = await imgs.count();
  assert(photos === 6, `subtype gallery holds ${photos} photos`);
  for (let i = 0; i < photos; i++) await imgs.nth(i).scrollIntoViewIfNeeded();   // the photos load lazily
  await page.waitForFunction(() => [...document.querySelectorAll('.field[data-field="histType"] .ref-panel img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 8000 });
  await page.locator('.field[data-field="histType"] .ref-panel').first().scrollIntoViewIfNeeded();
  await shot('hcc-subtype-gallery');
  await page.locator('.field[data-field="histType"] .ref-toggle').first().click();
  return 'routed on the history with the received name; size Check; pT2 with the pTNM option; subtype gallery 6 photos';
});

// Other pancreatectomies (Phase 52): a pasted distal pancreatectomy and splenectomy under a pancreatic history
// opens the pancreatic synoptic with the operation and the spleen filled and no head site; the margins are the
// operation's own; switching to a Whipple brings the head margins back.
await check('pancreatectomy: a pasted distal pancreatectomy fills the operation and the spleen; the margins follow the operation', async () => {
  const shows = async (id) => (await page.locator(`.field[data-field="${id}"]:visible`).count()) > 0;
  const routed = await pasteAndBuild('History\nCa tail of pancreas\n\nSpecimen\n(A) Pancreas and spleen, distal pancreatectomy and splenectomy');
  assert(routed === 'pancreas_carcinoma', `distal pancreatectomy routed to ${routed}`);
  let report = await reportText();
  assert(report.includes('PANCREAS AND SPLEEN, distal pancreatectomy and splenectomy'), `diagnosis head wrong: ${report.slice(-400)}`);
  assert(report.includes('- Procedure: Distal pancreatectomy with splenectomy'), `procedure row wrong: ${report.slice(0, 600)}`);
  assert(await shows('proxPancMargin') && await shows('spleenWeightG') && !(await shows('neckMargin')) && !(await shows('uncinateMargin')), 'the distal fields are not the ones showing');
  assert(/Tumour site is not recorded/.test(await checksText()), 'Checks did not ask for the tumour site');
  await pickField('tumourSite', 'Tail of pancreas');
  report = await reportText();
  assert(report.includes('- Tumour site: Tail of pancreas'), `site not printed: ${report.slice(0, 600)}`);
  await page.locator('.field[data-field="proxPancMargin"]').first().scrollIntoViewIfNeeded();
  await shot('pancreas-distal-margins');
  await pickField('procedure', 'Pancreaticoduodenectomy (Whipple resection)');
  assert(await shows('neckMargin') && await shows('uncinateMargin') && !(await shows('proxPancMargin')) && !(await shows('spleen')), 'the Whipple fields did not come back');
  return 'routed on the history with the operation and spleen filled; no head site and a Check; distal margins and spleen fields; a Whipple brings the head margins back';
});

// Breast papillary lesions (Phase 50): the category, the lesion and the invasion pick decide the line and the
// B code; invasion without a stromal feature raises a Check; solid papillary carcinoma takes its own invasive
// type by default; the lesion gallery opens with its photos.
await check('breast papillary lesion: the lesion and invasion decide the line; the lesion gallery opens', async () => {
  const shows = async (id) => (await page.locator(`.field[data-field="${id}"]:visible`).count()) > 0;
  const routed = await pasteAndBuild('breast, L2H lesion, biopsy');
  assert(routed === 'breast_biopsy', `breast core routed to ${routed}`);
  await pickField('category', 'Papillary lesion');
  let report = await reportText();
  assert(report.includes("BREAST, left 2 o'clock, core biopsy - INTRADUCTAL PAPILLOMA (B3)"), `papilloma line wrong: ${report.slice(-300)}`);
  await pickField('papLesion', 'Encapsulated papillary carcinoma');
  report = await reportText();
  assert(report.includes('ENCAPSULATED PAPILLARY CARCINOMA without invasion (B5a)'), `EPC line wrong: ${report.slice(-300)}`);
  assert(!(await shows('tubules')), 'the grading fields show without invasion');
  await pickField('papInvasion', 'Present (B5b)');
  report = await reportText();
  assert(report.includes('ENCAPSULATED PAPILLARY CARCINOMA with INVASIVE CARCINOMA OF NO SPECIAL TYPE, provisional grade 2 (B5b)'), `invasive EPC line wrong: ${report.slice(-300)}`);
  assert(await shows('tubules') && await shows('papInvSeen'), 'the invasive fields did not show');
  assert(/without a stromal feature/.test(await checksText()), 'Checks did not flag invasion without a stromal feature');
  await pickField('papLesion', 'Solid papillary carcinoma');
  report = await reportText();
  assert(report.includes('INVASIVE SOLID PAPILLARY CARCINOMA, provisional grade 2 (B5b)'), `invasive SPC line wrong: ${report.slice(-300)}`);
  await page.locator('.field[data-field="papLesion"] .ref-toggle').first().click();
  await page.waitForSelector('.field[data-field="papLesion"] .ref-panel img', { timeout: 5000 });
  const imgs = page.locator('.field[data-field="papLesion"] .ref-panel img');
  const photos = await imgs.count();
  assert(photos === 9, `lesion gallery holds ${photos} photos`);
  for (let i = 0; i < photos; i++) await imgs.nth(i).scrollIntoViewIfNeeded();   // the photos load lazily
  await page.waitForFunction(() => [...document.querySelectorAll('.field[data-field="papLesion"] .ref-panel img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 8000 });
  await page.locator('.field[data-field="papLesion"] .ref-panel').first().scrollIntoViewIfNeeded();
  await shot('breast-papillary-gallery');
  await page.locator('.field[data-field="papLesion"] .ref-toggle').first().click();
  return 'papilloma B3; EPC B5a; invasion B5b with the stromal-feature Check; SPC takes invasive solid papillary; lesion gallery 9 photos';
});

// Cervical cytology descriptions (Phase 55): a pasted LBC opens the cervical form; HSIL prints its cell
// description and follows the chips; the lists swap with the interpretation and the AGC origin; Checks flags
// HSIL with a negative HPV result; the category and organism galleries open with their photos.
await check('cervical cytology: each category prints its cell description; the lists follow the picks; both galleries open', async () => {
  const shows = async (id) => (await page.locator(`.field[data-field="${id}"]:visible`).count()) > 0;
  const routed = await pasteAndBuild('History\nCervical screening\n\nSpecimen\n(A) Cervix, LBC smear');
  assert(routed === 'cervical_cytology', `LBC routed to ${routed}`);
  assert(!(await shows('hsilFeatures')) && !(await shows('extent')), 'description fields show under NILM');
  await pickField('interpretation', 'High grade squamous intraepithelial lesion (HSIL)');
  let report = await reportText();
  assert(report.includes('Scattered small immature squamous cells, present singly and in syncytial aggregates, show a high nuclear-to-cytoplasmic ratio, hyperchromasia, irregular nuclear membranes and coarsely granular chromatin.'), `HSIL description wrong: ${report.slice(0, 600)}`);
  assert(await shows('hsilFeatures') && await shows('extent') && !(await shows('lsilFeatures')), 'the HSIL fields are not the ones showing');
  await pickField('hsilFeatures', 'Coarse chromatin');   // unticks the default
  await pickField('extent', 'Numerous');
  report = await reportText();
  assert(report.includes('Numerous small immature squamous cells, present singly and in syncytial aggregates, show a high nuclear-to-cytoplasmic ratio, hyperchromasia and irregular nuclear membranes.'), `edited HSIL description wrong: ${report.slice(0, 600)}`);
  await pickField('hpv', 'Negative for high-risk HPV');
  assert(/negative high-risk HPV/.test(await checksText()), 'Checks did not flag HSIL with a negative HPV result');
  await pickField('interpretation', 'Atypical glandular cells (AGC)');
  await pickField('glandularOrigin', 'Endometrial');
  report = await reportText();
  assert(report.includes('Atypical endometrial cells are present in small groups.') && report.includes('falls short of adenocarcinoma.'), `endometrial AGC wrong: ${report.slice(0, 700)}`);
  assert(await shows('agcEndometrialFeatures') && !(await shows('agcFeatures')) && !(await shows('extent')), 'the endometrial AGC list is not the one showing');
  const counts = [];
  for (const [id, want, name] of [['interpretation', 27, 'cervical-categories-gallery'], ['features', 14, 'cervical-organisms-gallery']]) {
    await page.locator(`.field[data-field="${id}"] .ref-toggle`).first().click();
    await page.waitForSelector(`.field[data-field="${id}"] .ref-panel img`, { timeout: 5000 });
    const imgs = page.locator(`.field[data-field="${id}"] .ref-panel img`);
    const photos = await imgs.count();
    assert(photos === want, `${id} gallery holds ${photos} photos`);
    for (let i = 0; i < photos; i++) await imgs.nth(i).scrollIntoViewIfNeeded();   // the photos load lazily
    await page.waitForFunction((f) => [...document.querySelectorAll(`.field[data-field="${f}"] .ref-panel img`)].every((i) => i.complete && i.naturalWidth > 0), id, { timeout: 10000 });
    await page.locator(`.field[data-field="${id}"] .ref-panel`).first().scrollIntoViewIfNeeded();
    await shot(name);
    await page.locator(`.field[data-field="${id}"] .ref-toggle`).first().click();
    counts.push(photos);
  }
  return `LBC routed; HSIL description follows the chips and extent; negative-HPV Check; endometrial AGC list and wording; galleries ${counts.join(' and ')} photos`;
});

// Case options after a pasted request (2026-09-24): the tickboxes show what the report prints. The case
// starts on the default small biopsy, whose options carry no macroscopy choice, as a fresh session does.
await check('case options: a pasted hysterectomy ticks the macroscopy box it prints, and the box drives it', async () => {
  await page.evaluate(() => localStorage.removeItem('signout.case.v1'));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const routed = await pasteAndBuild('Uterus and cervix, total hysterectomy');
  assert(routed === 'uterus_benign', `routed to ${routed}`);
  const box = page.locator('#case-options label', { hasText: 'Generate the macroscopic description and block key' }).locator('input[type="checkbox"]');
  assert(await box.count() === 1, 'no macroscopy option on the case');
  const MACRO = 'Received in formalin is a total hysterectomy specimen';
  let report = await reportText();
  assert(report.includes(MACRO), `the macroscopy did not print: ${report.slice(0, 200)}`);
  assert(await box.isChecked(), 'the macroscopy box shows unticked while the macroscopy prints');
  await box.uncheck();
  await page.waitForTimeout(300);
  report = await reportText();
  assert(!report.includes('Received in formalin') && !(await box.isChecked()), 'unticking left the macroscopy in the report');
  await box.check();
  await page.waitForTimeout(300);
  report = await reportText();
  assert(report.includes(MACRO) && await box.isChecked(), 'ticking did not restore the macroscopy');
  await box.scrollIntoViewIfNeeded();
  await shot('options-after-paste');
  return 'macroscopy ticked after Build parts; untick removes it, tick restores it';
});

// Phase 46 (docs/specs/suggestions-and-roadmap.md). From a source checkout the panel parses
// docs/roadmap.md itself; a build ships dist/roadmap.json instead.
await check('roadmap panel opens with Now, Next, Later and Recently done', async () => {
  await page.click('#btn-roadmap');
  await page.waitForSelector('#dlg-roadmap[open] .rm-sec', { timeout: 5000 });
  const heads = await page.$$eval('#dlg-roadmap .rm-sec > h3', (hs) => hs.map((h) => h.firstChild.textContent.trim()));
  assert(heads.join('|') === 'Now|Next|Later|Recently done', `sections were ${heads.join(', ')}`);
  const counts = await page.evaluate(() => ({
    cards: document.querySelectorAll('#dlg-roadmap .rm-card').length,
    done: document.querySelectorAll('#dlg-roadmap .rm-sec:last-child .rm-item').length
  }));
  assert(counts.cards > 0 && counts.done === 10, `cards ${counts.cards}, Done lines ${counts.done}`);
  await shot('roadmap');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  return `${counts.cards} cards, ${counts.done} Done lines`;
});

await check('suggest a change blocks patient details and opens a pre-filled form', async () => {
  // The form is never really opened: window.open is replaced so the URL can be read instead.
  await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });
  await page.locator('.part-actions button', { hasText: 'Suggest a change' }).first().click();
  await page.waitForSelector('#dlg-suggest[open] #sg-text', { timeout: 5000 });
  const about = await page.$eval('#sg-about', (sel) => sel.value);
  assert(about !== '', 'the part button did not preselect its template');
  await page.fill('#sg-text', 'Wording for A123456(7)');
  await page.click('#sg-open');
  const err = await page.$eval('#sg-error', (e) => (e.hidden ? '' : e.textContent));
  assert(/HKID/.test(err), `no HKID block: "${err}"`);
  assert((await page.evaluate(() => window.__opened.length)) === 0, 'the form opened despite the HKID');
  await page.fill('#sg-text', 'The diagnosis line should read differently.');
  await page.locator('#sg-where .chip', { hasText: 'Diagnosis' }).click();
  await shot('suggest');
  await page.click('#sg-open');
  const opened = await page.evaluate(() => window.__opened);
  assert(opened.length === 1, `window.open called ${opened.length} times`);
  const u = new URL(opened[0]);
  assert(u.hostname === 'docs.google.com' && u.searchParams.get('usp') === 'pp_url', `unexpected URL ${u.origin}${u.pathname}`);
  const answers = [...u.searchParams.entries()].filter(([k]) => k.startsWith('entry.')).map(([, v]) => v);
  assert(answers.some((v) => v.endsWith(`(${about})`)), 'template answer missing');
  assert(answers.includes('Diagnosis'), 'where answer missing');
  assert(!answers.some((v) => v.includes('A123456')), 'the blocked text reached the URL');
  assert((await page.locator('#dlg-suggest[open]').count()) === 0, 'dialog stayed open');
  await page.click('#btn-suggest');
  await page.waitForSelector('#dlg-suggest[open]', { timeout: 5000 });
  const fromHeader = await page.$eval('#sg-about', (sel) => sel.value);
  assert(fromHeader === '', `the header button preselected "${fromHeader}" instead of the whole app`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  return `${about}: ${answers.length} answers pre-filled; HKID blocked`;
});

await check('phone header keeps Roadmap on one row and leaves Suggest to the part', async () => {
  const size = page.viewportSize();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const box = await page.evaluate(() => {
    const vis = (n) => !!n && window.getComputedStyle(n).display !== 'none' && n.getBoundingClientRect().width > 0;
    const acts = document.querySelector('.topbar-actions');
    const shown = [...acts.children].filter(vis);
    return {
      roadmap: vis(document.querySelector('#btn-roadmap')),
      suggest: vis(document.querySelector('#btn-suggest')),
      rows: new Set(shown.map((n) => Math.round(n.getBoundingClientRect().top))).size,
      overflow: acts.scrollWidth > acts.clientWidth + 1 || document.documentElement.scrollWidth > window.innerWidth + 1
    };
  });
  await shot('phone-header');
  await page.setViewportSize(size);
  await page.waitForTimeout(300);
  assert(box.roadmap && !box.suggest, `roadmap shown ${box.roadmap}, suggest shown ${box.suggest}`);
  assert(box.rows === 1 && !box.overflow, `header actions on ${box.rows} rows, overflow ${box.overflow}`);
  return 'one row at 390px';
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
