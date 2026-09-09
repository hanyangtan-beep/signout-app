import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthUrl, parseAuthHash } from '../src/gauth.js';

const config = { clientId: '123-abc.apps.googleusercontent.com', scopeMode: 'file' };

test('buildAuthUrl uses the implicit flow with the page as redirect target', () => {
  const u = new URL(buildAuthUrl(config, { redirect: 'https://han-signout.pplx.app/', action: 'save', now: 1000 }));
  assert.equal(u.origin + u.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(u.searchParams.get('response_type'), 'token');
  assert.equal(u.searchParams.get('client_id'), config.clientId);
  assert.equal(u.searchParams.get('redirect_uri'), 'https://han-signout.pplx.app/');
  assert.equal(u.searchParams.get('scope'), 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets');
  assert.match(u.searchParams.get('state'), /^save:/);
});

test('full scope mode requests the broader drive scope', () => {
  const u = new URL(buildAuthUrl({ ...config, scopeMode: 'full' }, { redirect: 'https://x/', now: 1 }));
  assert.match(u.searchParams.get('scope'), /auth\/drive /);
});

test('parseAuthHash extracts the token, expiry and resumed action', () => {
  const r = parseAuthHash('#state=save%3Aabc&access_token=ya29.tok&token_type=Bearer&expires_in=3599&scope=x', 1_000_000);
  assert.equal(r.action, 'save');
  assert.equal(r.token.access_token, 'ya29.tok');
  assert.equal(r.token.expires_at, 1_000_000 + (3599 - 60) * 1000);
  assert.equal(r.token.email, null);
});

test('parseAuthHash reports errors and ignores unrelated hashes', () => {
  assert.deepEqual(parseAuthHash('#error=access_denied&state=open%3A1'), { error: 'access_denied', action: 'open' });
  assert.equal(parseAuthHash(''), null);
  assert.equal(parseAuthHash('#part-2'), null);
});
