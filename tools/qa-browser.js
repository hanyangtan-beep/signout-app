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
