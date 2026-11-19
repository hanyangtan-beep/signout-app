// The connection to Han Slide on this computer, for proofreading with PPLX 27B
// (docs/specs/proofreading.md). Han Slide listens on 127.0.0.1 only, answers only this site and
// only with the pairing code shown in its Settings › Proofreading. The report goes nowhere else.
//
// Off by default and set per browser: a computer where it is off (the PC) never contacts
// 127.0.0.1. Chrome asks once whether the site may reach this computer and the local network
// (https://developer.chrome.com/blog/local-network-access); the user allows it.

export const PORT = 47321;
export const BASE = `http://127.0.0.1:${PORT}`;
const KEY = 'signout.proofread.v1';
const STATUS_TIMEOUT_MS = 4000;
/** Han Slide gives the model up to 5 minutes; the page waits a little longer. */
const PROOFREAD_TIMEOUT_MS = 330000;

/** A failure, with `kind` for the page and a message saying what to do. */
export class HanSlideError extends Error {
  constructor(kind, message, status = 0) {
    super(message);
    this.name = 'HanSlideError';
    this.kind = kind;
    this.status = status;
  }
}

/** The pairing code as Han Slide shows it: four groups of four, capitals and digits. */
export function normaliseCode(code) {
  return String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32).replace(/(.{4})(?=.)/g, '$1-');
}

/** This browser's setting: { on, code }. */
export function loadSettings(storage = globalThis.localStorage) {
  try {
    const s = JSON.parse(storage?.getItem(KEY) || '{}');
    return { on: s.on === true, code: typeof s.code === 'string' ? normaliseCode(s.code) : '' };
  } catch {
    return { on: false, code: '' };
  }
}

export function saveSettings({ on, code }, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY, JSON.stringify({ on: !!on, code: normaliseCode(code) })); } catch { /* private mode */ }
}

const OFFLINE = 'Han Slide did not answer on this computer. Open Han Slide on this Mac and turn on Settings › Proofreading there; if Chrome asks whether this site may reach devices on this computer, allow it.';

/** The message for an HTTP error from Han Slide. */
function failure(status, body) {
  const why = typeof body?.why === 'string' && body.why ? body.why : '';
  const error = typeof body?.error === 'string' && body.error ? body.error : '';
  switch (status) {
    case 401: return new HanSlideError('code', 'Han Slide did not accept the pairing code. Copy it again from Han Slide’s Settings › Proofreading into Settings here.', status);
    case 403: return new HanSlideError('origin', 'Han Slide answers only https://han-signout.pplx.app.', status);
    case 409: return new HanSlideError('model', `PPLX 27B is not ready in Han Slide${why ? `: ${why}` : ''}.`, status);
    case 413: return new HanSlideError('size', 'The report is too long for Han Slide to proofread.', status);
    case 429: return new HanSlideError('busy', 'Han Slide is answering another question; try again in a minute.', status);
    case 504: return new HanSlideError('timeout', 'PPLX 27B did not answer within 5 minutes; try again with Proofread.', status);
    default: return new HanSlideError('failed', `Han Slide could not proofread${error ? `: ${error}` : ''} (${status}).`, status);
  }
}

/** One request to Han Slide, with a time limit; JSON in and out. */
async function call(path, { code, method = 'GET', body, timeout, fetchImpl = globalThis.fetch, signal } = {}) {
  const token = normaliseCode(code);
  if (!token) throw new HanSlideError('code', 'Paste the pairing code from Han Slide’s Settings › Proofreading into Settings here first.');
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
  const onAbort = () => controller.abort();
  signal?.addEventListener?.('abort', onAbort);
  let res;
  try {
    res = await fetchImpl(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal: controller.signal
    });
  } catch {
    if (timedOut) throw new HanSlideError('timeout', path === '/v1/status' ? 'Han Slide did not answer within 4 seconds. Is it open on this Mac?' : 'PPLX 27B did not answer in time; try again with Proofread.');
    if (signal?.aborted) throw new HanSlideError('cancelled', 'Proofreading was stopped.');
    throw new HanSlideError('offline', OFFLINE);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', onAbort);
  }
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) throw failure(res.status, data);
  if (!data || typeof data !== 'object') throw new HanSlideError('failed', 'Han Slide gave an answer this page could not read.');
  return data;
}

/** Han Slide's state: { app, version, api, model, ready, why }. */
export function status(options = {}) {
  return call('/v1/status', { ...options, timeout: options.timeout ?? STATUS_TIMEOUT_MS });
}

/** Ask PPLX 27B: { text, seconds, outputTokens, model, version }. */
export async function proofread({ system, prompt, maxTokens, ...options } = {}) {
  const data = await call('/v1/proofread', { ...options, method: 'POST', body: { system, prompt, maxTokens }, timeout: options.timeout ?? PROOFREAD_TIMEOUT_MS });
  if (typeof data.text !== 'string') throw new HanSlideError('failed', 'Han Slide answered without the model’s text.');
  return data;
}

/** A line for Settings from a status answer. */
export function describeStatus(s) {
  const name = `${s?.app || 'Han Slide'} ${s?.version || ''}`.trim();
  if (s?.ready) return `Connected to ${name}: ${s.model || 'PPLX 27B'} is ready.`;
  return `Connected to ${name}, but ${s?.model || 'PPLX 27B'} is not ready${s?.why ? `: ${s.why}` : ''}.`;
}
