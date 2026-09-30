// The signed-in address, which the built-in allow-list in src/gate.js depends on (pulled by the
// user 2026-09-30). The token carries Drive and Sheets scopes only, so Drive's about.get is asked
// first and userinfo is the fallback. Runs in its own file because gauth.js reads the token from
// sessionStorage when it loads.
import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map([['signout.token.v1', JSON.stringify({ access_token: 'tok', expires_at: Date.now() + 3600e3, email: null })]]);
globalThis.sessionStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};
const { fetchUserInfo, currentUser } = await import('../src/gauth.js');

/** Answer each URL prefix with a JSON body, or a failed response for `null`; log every call. */
function stubFetch(routes) {
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, auth: opts?.headers?.Authorization });
    const hit = routes.find(([prefix]) => url.startsWith(prefix));
    if (!hit || hit[1] === null) return { ok: false, json: async () => ({}) };
    return { ok: true, json: async () => hit[1] };
  };
  return calls;
}
const ABOUT = 'https://www.googleapis.com/drive/v3/about';
const USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';

test('with neither lookup answering, no address is recorded', async () => {
  stubFetch([[ABOUT, null], [USERINFO, { sub: '1' }]]);
  assert.equal(await fetchUserInfo('tok'), null);
  assert.equal(currentUser(), null);
});

test('userinfo is the fallback when Drive does not answer', async () => {
  const calls = stubFetch([[ABOUT, null], [USERINFO, { email: 'fallback@example.org' }]]);
  assert.equal(await fetchUserInfo('tok'), 'fallback@example.org');
  assert.deepEqual(calls.map((c) => c.url.split('?')[0]), [ABOUT, USERINFO]);
});

test('Drive about.get is asked first, with the bearer token, and is enough on its own', async () => {
  const calls = stubFetch([[ABOUT, { user: { emailAddress: 'member@example.org' } }], [USERINFO, { email: 'other@example.org' }]]);
  assert.equal(await fetchUserInfo('tok'), 'member@example.org');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\?fields=user\(emailAddress\)$/);
  assert.equal(calls[0].auth, 'Bearer tok');
  assert.equal(JSON.parse(store.get('signout.token.v1')).email, 'member@example.org', 'kept with the token');
});

test('a network failure is not an error for the caller', async () => {
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.equal(await fetchUserInfo('tok'), 'member@example.org', 'the address already known stands');
});
