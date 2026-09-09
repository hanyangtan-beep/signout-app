import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, DEFAULTS } from '../src/config.js';

function withStorage(obj, fn) {
  globalThis.localStorage = { getItem: () => JSON.stringify(obj), setItem() {} };
  try { return fn(); } finally { delete globalThis.localStorage; }
}

test('blank or malformed saved client ids fall back to the shipped default', () => {
  assert.equal(withStorage({ clientId: '' }, loadConfig).clientId, DEFAULTS.clientId);
  assert.equal(withStorage({ clientId: ' 834072849408-kerf... ' }, loadConfig).clientId, DEFAULTS.clientId);
  assert.equal(withStorage({ clientId: `  ${DEFAULTS.clientId}  ` }, loadConfig).clientId, DEFAULTS.clientId);
});

test('a well-formed override is kept', () => {
  const alt = '1-abc.apps.googleusercontent.com';
  assert.equal(withStorage({ clientId: alt }, loadConfig).clientId, alt);
});
