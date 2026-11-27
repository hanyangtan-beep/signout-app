// The connection to the Han Sign-out Vertex AI Cloud Run proxy (us-central1).
//
// Reuses the user's existing Google OAuth access token from src/gauth.js so no API keys ever ship
// in dist/. The proxy verifies the caller against src/gate.js's BUILT_IN_ALLOWED digests, blocks
// PHI server-side, and routes cancer resections to gemini-4-neon (with automatic fallback to
// gemini-3.8-flash and gemini-4-hydrogen) while routing biopsies and extraction to faster tiers.

export const DEFAULT_PROXY_URL = 'https://signout-vertex-proxy-834072849408.us-central1.run.app';
export const BACKENDS = ['hanslide', 'vertex', 'hybrid'];
const KEY = 'signout.vertex.v1';
const STATUS_TIMEOUT_MS = 10000;
const AI_TIMEOUT_MS = 90000;

/** Structured JSON schema matching src/proofread.js's expected reply shape. */
export const PROOFREAD_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    edits: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          section: { type: 'STRING', enum: ['SPECIMEN', 'MACRO', 'INTRAOP', 'MICRO', 'MOLECULAR', 'DX', 'COMMENT'] },
          find: { type: 'STRING' },
          replace: { type: 'STRING' },
          kind: { type: 'STRING', enum: ['spelling', 'grammar', 'house style'] },
          why: { type: 'STRING' }
        },
        required: ['section', 'find', 'replace', 'kind', 'why']
      }
    },
    flags: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          section: { type: 'STRING', enum: ['SPECIMEN', 'MACRO', 'INTRAOP', 'MICRO', 'MOLECULAR', 'DX', 'COMMENT'] },
          quote: { type: 'STRING' },
          replace: { type: 'STRING', nullable: true },
          why: { type: 'STRING' }
        },
        required: ['section', 'quote', 'why']
      }
    },
    rewrites: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          section: { type: 'STRING', enum: ['MACRO', 'INTRAOP', 'MICRO', 'COMMENT'] },
          text: { type: 'STRING' },
          why: { type: 'STRING' }
        },
        required: ['section', 'text', 'why']
      }
    }
  },
  required: ['edits', 'flags', 'rewrites']
};

export class VertexAIError extends Error {
  constructor(kind, message, status = 0) {
    super(message);
    this.name = 'VertexAIError';
    this.kind = kind;
    this.status = status;
  }
}

export function normaliseProxyUrl(url) {
  const s = String(url ?? '').trim().replace(/\/+$/, '');
  return /^https?:\/\/.+/.test(s) ? s : DEFAULT_PROXY_URL;
}

/** Per-browser AI backend settings: { backend: 'hanslide' | 'vertex' | 'hybrid', proxyUrl }. */
export function loadVertexSettings(storage = globalThis.localStorage) {
  try {
    const s = JSON.parse(storage?.getItem(KEY) || '{}');
    const backend = BACKENDS.includes(s.backend) ? s.backend : 'hanslide';
    return { backend, proxyUrl: normaliseProxyUrl(s.proxyUrl || DEFAULT_PROXY_URL) };
  } catch {
    return { backend: 'hanslide', proxyUrl: DEFAULT_PROXY_URL };
  }
}

export function saveVertexSettings({ backend, proxyUrl }, storage = globalThis.localStorage) {
  const clean = {
    backend: BACKENDS.includes(backend) ? backend : 'hanslide',
    proxyUrl: normaliseProxyUrl(proxyUrl)
  };
  try { storage?.setItem(KEY, JSON.stringify(clean)); } catch { /* private mode */ }
  return clean;
}

function failure(status, body) {
  const error = typeof body?.error === 'string' && body.error ? body.error : '';
  switch (status) {
    case 400: return new VertexAIError('phi', error || 'Request rejected by the Vertex AI proxy.', status);
    case 401: return new VertexAIError('auth', 'Sign in to Google first to use Vertex AI proofreading.', status);
    case 403: return new VertexAIError('forbidden', error || 'This account or site origin is not authorised for the Vertex AI proxy.', status);
    case 413: return new VertexAIError('size', 'The report is too long for the Vertex AI proxy.', status);
    case 429: return new VertexAIError('busy', 'Vertex AI rate limit reached; try again in a moment.', status);
    case 502: return new VertexAIError('failed', error || 'All Vertex AI routes failed; try again shortly.', status);
    default: return new VertexAIError('failed', `Vertex AI proxy error${error ? `: ${error}` : ''} (${status}).`, status);
  }
}

async function call(path, { proxyUrl = DEFAULT_PROXY_URL, token, method = 'GET', body, timeout, fetchImpl = globalThis.fetch, signal } = {}) {
  const tok = String(token || '').trim();
  if (!tok) throw new VertexAIError('auth', 'Sign in to Google first to use Vertex AI proofreading.');
  const base = normaliseProxyUrl(proxyUrl);
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
  const onAbort = () => controller.abort();
  signal?.addEventListener?.('abort', onAbort);
  let res;
  try {
    res = await fetchImpl(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${tok}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal: controller.signal
    });
  } catch {
    if (timedOut) throw new VertexAIError('timeout', 'Vertex AI proxy did not answer in time; try again.');
    if (signal?.aborted) throw new VertexAIError('cancelled', 'Proofreading was stopped.');
    throw new VertexAIError('offline', 'Could not reach the Vertex AI Cloud Run proxy. Check your connection and proxy URL.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', onAbort);
  }
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) throw failure(res.status, data);
  if (!data || typeof data !== 'object') throw new VertexAIError('failed', 'Vertex AI proxy returned an unreadable response.');
  return data;
}

/** Check proxy health, auth, and configured model routes. */
export function vertexStatus(options = {}) {
  return call('/v1/status', { ...options, timeout: options.timeout ?? STATUS_TIMEOUT_MS });
}

/** Run proofreading (or extraction/audit) through the Cloud Run Vertex AI proxy. */
export async function vertexProofread({
  system,
  prompt,
  kind = '',
  task = 'proofread',
  maxOutputTokens,
  thinkingLevel,
  responseSchema = PROOFREAD_RESPONSE_SCHEMA,
  ...options
} = {}) {
  const data = await call('/v1/ai', {
    ...options,
    method: 'POST',
    body: {
      task,
      kind,
      system,
      prompt,
      responseSchema,
      ...(maxOutputTokens ? { maxOutputTokens } : {}),
      ...(thinkingLevel ? { thinkingLevel } : {})
    },
    timeout: options.timeout ?? AI_TIMEOUT_MS
  });
  if (typeof data.text !== 'string') throw new VertexAIError('failed', 'Vertex AI proxy answered without model text.');
  return data;
}

export function describeVertexStatus(s) {
  const cancer = s?.routes?.proofreadCancer?.[0] || 'gemini-4-neon';
  const biopsy = s?.routes?.proofreadBiopsy?.[0] || 'gemini-3.8-flash';
  return `Connected to Vertex AI (${s?.project || 'han-signout-app'}): ready (${cancer} for cancer resections, ${biopsy} for biopsies).`;
}
