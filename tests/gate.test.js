import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gateEnabled, gateState, isAllowedEmail, parseAllowList, formatAllowList, normaliseEmail } from '../src/gate.js';
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

test('the shipped default allows any account, so the gate only requires sign-in', () => {
  assert.deepEqual(DEFAULTS.allowedEmails, []);
  assert.equal(isAllowedEmail('someone@gmail.com', DEFAULTS.allowedEmails), true);
});

test('a corrupted stored allow-list falls back to the permissive default', () => {
  // A truthy non-array would otherwise become a restriction no address could satisfy, locking the
  // owner out of their own app with no way back in except clearing storage.
  for (const bad of ['han@example.com', 42, { 0: 'han@example.com' }]) {
    assert.deepEqual(withStorage({ allowedEmails: bad }, loadConfig).allowedEmails, []);
  }
  assert.deepEqual(withStorage({ allowedEmails: ['han@example.com'] }, loadConfig).allowedEmails, ['han@example.com']);
});
