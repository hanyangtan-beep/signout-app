import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gateEnabled, gateState, isAllowedEmail, parseAllowList, formatAllowList, normaliseEmail, canonicalEmail, emailDigest, BUILT_IN_ALLOWED } from '../src/gate.js';
import { loadConfig, DEFAULTS } from '../src/config.js';

function withStorage(obj, fn) {
  globalThis.localStorage = { getItem: () => JSON.stringify(obj), setItem() {} };
  try { return fn(); } finally { delete globalThis.localStorage; }
}

test('the gate is off on localhost so browser QA can drive the app', () => {
  for (const h of ['localhost', '127.0.0.1', '::1', '[::1]', 'LOCALHOST', '']) {
    assert.equal(gateEnabled(h), false, h);
  }
});

test('the gate is on for the published host and anything else', () => {
  for (const h of ['han-signout.pplx.app', 'example.com', 'localhost.evil.com', '127.0.0.1.evil.com']) {
    assert.equal(gateEnabled(h), true, h);
  }
});

test('an empty allow-list admits any Google account', () => {
  assert.equal(isAllowedEmail('anyone@gmail.com', []), true);
  assert.equal(isAllowedEmail('anyone@gmail.com', undefined), true);
});

test('a populated allow-list admits only its members, ignoring case and spacing', () => {
  const list = ['Han@Example.com', '  other@example.com  '];
  assert.equal(isAllowedEmail('han@example.com', list), true);
  assert.equal(isAllowedEmail('  HAN@EXAMPLE.COM ', list), true);
  assert.equal(isAllowedEmail('stranger@example.com', list), false);
});

test('the allow-list splits on newlines, commas and semicolons and drops blanks', () => {
  assert.deepEqual(parseAllowList('a@x.com\n b@x.com,c@x.com ; \n\n'), ['a@x.com', 'b@x.com', 'c@x.com']);
  assert.deepEqual(parseAllowList(''), []);
  assert.deepEqual(parseAllowList(null), []);
});

test('formatting round-trips back into the settings textarea', () => {
  const list = ['a@x.com', 'b@x.com'];
  assert.deepEqual(parseAllowList(formatAllowList(list)), list);
  assert.equal(formatAllowList(undefined), '');
});

test('normaliseEmail folds case and trims', () => {
  assert.equal(normaliseEmail('  Han@Example.COM '), 'han@example.com');
  assert.equal(normaliseEmail(null), '');
});

test('a disabled gate always opens, whatever the account says', () => {
  assert.equal(gateState({ enabled: false, signedIn: false, email: '', allowed: ['han@example.com'] }), 'open');
});

test('no session means the sign-in screen', () => {
  assert.equal(gateState({ enabled: true, signedIn: false, email: '', allowed: [] }), 'signin');
});

test('a signed-in account on the list opens the workspace', () => {
  assert.equal(gateState({ enabled: true, signedIn: true, email: 'han@example.com', allowed: ['han@example.com'] }), 'open');
});

test('a signed-in account off the list is refused', () => {
  assert.equal(gateState({ enabled: true, signedIn: true, email: 'stranger@example.com', allowed: ['han@example.com'] }), 'refused');
});

test('an unresolved address is admitted rather than locking the owner out mid-fetch', () => {
  assert.equal(gateState({ enabled: true, signedIn: true, email: '', allowed: ['han@example.com'] }), 'open');
});

test('the Settings list still defaults to empty; the built-in list is what restricts the published build', () => {
  // Deliberate change 2026-09-30 (pulled by the user): a Settings list lives in one browser and
  // cannot restrict a stranger's machine, so the published build carries a built-in list instead.
  assert.deepEqual(DEFAULTS.allowedEmails, []);
  assert.equal(isAllowedEmail('someone@gmail.com', DEFAULTS.allowedEmails), true);
  assert.ok(BUILT_IN_ALLOWED.length > 0, 'the published build carries a built-in list');
});

test('a corrupted stored allow-list falls back to the permissive default', () => {
  // A truthy non-array would otherwise become a restriction no address could satisfy, locking the
  // owner out of their own app with no way back in except clearing storage.
  for (const bad of ['han@example.com', 42, { 0: 'han@example.com' }]) {
    assert.deepEqual(withStorage({ allowedEmails: bad }, loadConfig).allowedEmails, []);
  }
  assert.deepEqual(withStorage({ allowedEmails: ['han@example.com'] }, loadConfig).allowedEmails, ['han@example.com']);
});

// ---- built-in allow-list (pulled by the user 2026-09-30; docs/google-setup.md section 5) ----------

test('the built-in list holds unique SHA-256 digests only', () => {
  assert.equal(BUILT_IN_ALLOWED.length, 8);
  assert.equal(new Set(BUILT_IN_ALLOWED).size, BUILT_IN_ALLOWED.length);
  for (const d of BUILT_IN_ALLOWED) assert.match(d, /^[0-9a-f]{64}$/);
  assert.ok(Object.isFrozen(BUILT_IN_ALLOWED));
});

test('no address-shaped text ships in the gate, the config or the digest tool', () => {
  // The files are served to anyone who asks; the list must not be readable from them.
  for (const f of ['src/gate.js', 'src/config.js', 'tools/allow-hash.mjs']) {
    const text = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z0-9.-]+/i, f);
  }
});

test('canonicalEmail folds case and, for Gmail only, dots, +tags and googlemail.com', () => {
  assert.equal(canonicalEmail('  A.B.Cee+list@GoogleMail.com '), 'abcee@gmail.com');
  assert.equal(canonicalEmail('a.b.cee@gmail.com'), 'abcee@gmail.com');
  assert.equal(canonicalEmail('A.B@Example.org'), 'a.b@example.org', 'other domains keep their dots');
  assert.equal(canonicalEmail(''), '');
  assert.equal(canonicalEmail('not-an-address'), 'not-an-address');
});

test('emailDigest is the salted SHA-256 of the canonical address, the same for every spelling', async () => {
  const expected = createHash('sha256').update('signout-gate:v1:abcee@gmail.com').digest('hex');
  for (const spelling of ['abcee@gmail.com', 'A.B.Cee@gmail.com', ' abcee+x@googlemail.com ']) {
    assert.equal(await emailDigest(spelling), expected, spelling);
  }
  assert.notEqual(await emailDigest('abcef@gmail.com'), expected);
  assert.equal(await emailDigest(''), '');
  assert.equal(await emailDigest('abcee@gmail.com', null), '', 'no Web Crypto, no digest');
});

test('with a built-in list, a confirmed member opens and anybody else is refused', async () => {
  const builtIn = [await emailDigest('member@example.org')];
  const state = async (email) => gateState({ enabled: true, signedIn: true, email, allowed: [], builtIn, digest: await emailDigest(email) });
  assert.equal(await state('Member@Example.org'), 'open');
  assert.equal(await state('stranger@example.org'), 'refused');
});

test('with a built-in list, an address that could not be confirmed is not admitted', () => {
  const builtIn = ['0'.repeat(64)];
  assert.equal(gateState({ enabled: true, signedIn: true, email: '', allowed: [], builtIn, digest: '' }), 'unconfirmed');
  assert.equal(gateState({ enabled: true, signedIn: true, email: 'member@example.org', allowed: [], builtIn, digest: '' }), 'unconfirmed', 'no Web Crypto');
  assert.equal(gateState({ enabled: true, signedIn: false, email: '', allowed: [], builtIn }), 'signin');
  assert.equal(gateState({ enabled: false, signedIn: false, email: '', allowed: [], builtIn }), 'open', 'localhost stays open');
});

test('with a built-in list, the Settings list can neither widen nor replace it', async () => {
  const builtIn = [await emailDigest('member@example.org')];
  const email = 'stranger@example.org';
  assert.equal(gateState({ enabled: true, signedIn: true, email, allowed: [email], builtIn, digest: await emailDigest(email) }), 'refused');
});
