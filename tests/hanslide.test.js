// The connection to Han Slide for proofreading (src/hanslide.js, docs/specs/proofreading.md),
// against a stubbed fetch: what is sent, what comes back and what each failure says.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE, PORT, HanSlideError, normaliseCode, loadSettings, saveSettings, status, proofread, describeStatus } from '../src/hanslide.js';

const CODE = 'ab12-cd34-ef56-gh78';

/** A fetch that records each call and answers with `status` and `body`. */
function stub(statusCode = 200, body = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { ok: statusCode >= 200 && statusCode < 300, status: statusCode, json: async () => body };
  };
  return { calls, fetchImpl };
}

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}

test('Han Slide is asked on this computer only', () => {
  assert.equal(PORT, 47321);
  assert.equal(BASE, 'http://127.0.0.1:47321');
});

test('the pairing code is four groups of four, capitals and digits', () => {
  assert.equal(normaliseCode(' ab12 cd34-ef56_gh78 '), 'AB12-CD34-EF56-GH78');
  assert.equal(normaliseCode(''), '');
  assert.equal(normaliseCode(null), '');
});

test('the setting is per browser and off by default', () => {
  const storage = memoryStorage();
  assert.deepEqual(loadSettings(storage), { on: false, code: '' });
  saveSettings({ on: true, code: CODE }, storage);
  assert.deepEqual(loadSettings(storage), { on: true, code: 'AB12-CD34-EF56-GH78' });
  assert.deepEqual(JSON.parse(storage.map.get('signout.proofread.v1')), { on: true, code: 'AB12-CD34-EF56-GH78' });
  storage.setItem('signout.proofread.v1', 'not json');
  assert.deepEqual(loadSettings(storage), { on: false, code: '' });
  assert.deepEqual(loadSettings({ getItem: () => { throw new Error('private mode'); } }), { on: false, code: '' });
});

test('without a pairing code nothing is sent', async () => {
  const { calls, fetchImpl } = stub();
  await assert.rejects(status({ code: '', fetchImpl }), (err) => err instanceof HanSlideError && err.kind === 'code');
  await assert.rejects(proofread({ system: 's', prompt: 'p', maxTokens: 10, code: '  ', fetchImpl }), (err) => err.kind === 'code');
  assert.equal(calls.length, 0);
});

test('status: a GET with the code as a bearer token, no cookies, no referrer', async () => {
  const { calls, fetchImpl } = stub(200, { app: 'Han Slide', version: '1.13.0', api: 1, model: 'PPLX 27B', ready: true, why: '', paired: true });
  const s = await status({ code: CODE, fetchImpl });
  assert.equal(s.ready, true);
  assert.equal(calls.length, 1);
  const { url, init } = calls[0];
  assert.equal(url, 'http://127.0.0.1:47321/v1/status');
  assert.equal(init.method, 'GET');
  assert.deepEqual(init.headers, { Authorization: 'Bearer AB12-CD34-EF56-GH78' });
  assert.equal(init.body, undefined);
  assert.equal(init.credentials, 'omit');
  assert.equal(init.referrerPolicy, 'no-referrer');
  assert.equal(init.mode, 'cors');
  assert.equal(describeStatus(s), 'Connected to Han Slide 1.13.0: PPLX 27B is ready.');
  assert.equal(describeStatus({ app: 'Han Slide', version: '1.13.0', model: 'PPLX 27B', ready: false, why: 'the model is not downloaded' }),
    'Connected to Han Slide 1.13.0, but PPLX 27B is not ready: the model is not downloaded.');
});

test('proofread: a POST of the system prompt, the prompt and the token cap only', async () => {
  const { calls, fetchImpl } = stub(200, { text: '{"edits":[],"flags":[]}', seconds: 12.5, outputTokens: 9, model: 'PPLX 27B', version: '1.13.0' });
  const answer = await proofread({ system: 'SYS', prompt: 'TASK: proofread\n[DX]\nNAEVUS.', maxTokens: 1400, code: CODE, fetchImpl });
  assert.equal(answer.text, '{"edits":[],"flags":[]}');
  const { url, init } = calls[0];
  assert.equal(url, 'http://127.0.0.1:47321/v1/proofread');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(init.body), { system: 'SYS', prompt: 'TASK: proofread\n[DX]\nNAEVUS.', maxTokens: 1400 });
});

test('an answer without the model text is a failure', async () => {
  const { fetchImpl } = stub(200, { seconds: 1 });
  await assert.rejects(proofread({ system: 's', prompt: 'p', code: CODE, fetchImpl }), (err) => err.kind === 'failed');
});

test('each refusal says what to do', async () => {
  for (const [code, body, kind, text] of [
    [401, { error: 'unpaired' }, 'code', /pairing code/],
    [403, {}, 'origin', /han-signout\.pplx\.app/],
    [409, { why: 'the model is loading' }, 'model', /PPLX 27B is not ready in Han Slide: the model is loading\./],
    [413, {}, 'size', /too long/],
    [429, {}, 'busy', /another question/],
    [504, {}, 'timeout', /5 minutes/],
    [500, { error: 'helper stopped' }, 'failed', /helper stopped \(500\)/]
  ]) {
    const { fetchImpl } = stub(code, body);
    await assert.rejects(proofread({ system: 's', prompt: 'p', code: CODE, fetchImpl }), (err) => err instanceof HanSlideError && err.kind === kind && err.status === code && text.test(err.message), `${code}`);
  }
});

test('Han Slide not answering, a time limit, and a stop', async () => {
  const offline = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(status({ code: CODE, fetchImpl: offline }), (err) => err.kind === 'offline' && /Open Han Slide/.test(err.message));
  const hang = (url, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  await assert.rejects(status({ code: CODE, fetchImpl: hang, timeout: 20 }), (err) => err.kind === 'timeout');
  const controller = new AbortController();
  const pending = proofread({ system: 's', prompt: 'p', code: CODE, fetchImpl: hang, signal: controller.signal, timeout: 5000 });
  controller.abort();
  await assert.rejects(pending, (err) => err.kind === 'cancelled');
});
