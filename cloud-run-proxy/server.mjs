// Han Sign-out — Vertex AI Cloud Run proxy (us-central1).
//
// Security & clinical guardrails:
//   - Strict CORS: https://hanyangtan-beep.github.io only (plus localhost if ALLOW_LOCALHOST=true).
//   - Auth: verifies Google OAuth access token via userinfo, hashes canonical email with
//     `signout-gate:v1:`, and checks against the exact 7 BUILT_IN_ALLOWED digests from src/gate.js.
//   - PHI guard: blocks HKIDs, patient honorifics, HK phone numbers, DOB mentions, and accession
//     numbers with HTTP 400 before Vertex AI is ever called.
//   - Tiered routing + explicit thinking caps + automatic fallback on 403/429/503:
//       * intake / macro / extract -> gemini-3.5-flash-lite (LOW) -> gemini-3.8-flash (LOW)
//       * proofread (biopsy/benign) -> gemini-3.8-flash (LOW) -> gemini-4-hydrogen (MEDIUM)
//       * proofread (cancer resection / biomarker) or audit ->
//           gemini-4-neon (MEDIUM) -> gemini-3.8-flash (MEDIUM) -> gemini-4-hydrogen (MEDIUM)
//   - Zero prompt logging: stdout records only timing, model, token counts, and HTTP status.

import http from 'node:http';
import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';

const PORT = Number(process.env.PORT || 8080);
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'han-signout-app';
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || 'global';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://hanyangtan-beep.github.io';
const ALLOW_LOCALHOST = process.env.ALLOW_LOCALHOST === 'true';
const MAX_BODY_BYTES = 128 * 1024; // 128 KB ceiling

// Exact SHA-256 digests from src/gate.js (salted with "signout-gate:v1:").
export const BUILT_IN_ALLOWED = new Set(
  (process.env.ALLOWED_EMAIL_HASHES || [
    'f1affe86746a4d8e461fef5f1961910dd4f09e23b7cdb0c062036565708108e0',
    '4209ed95f6932b556ce4d6911b2d3d31723877b253ad50ac156096710e508fa7',
    '9f75c2117c0022709c3c07be3b1cfb546b2383f4cf91bd45d0babc5f6f75bf76',
    '01d0953041061cc52f50214eb3fd1c182db1c1def812bb96cfa5d29ea84af6a9',
    '648ff2ab33aa277eddbd5928f26539f77141e23fc6f2a02abda82bd108b7a093',
    'd1f9879157820c6ee00a67e40fabce322bb15e24452d92a7e88486e7c217b442',
    'b64c9f176b00a28bedd2c9e1cd34a913ee404e2921adb683e3539d60cb1a66ff'
  ].join(',')).split(',').map((s) => s.trim()).filter(Boolean)
);

const DIGEST_PREFIX = 'signout-gate:v1:';

// Mirrors src/gate.js canonicalEmail + emailDigest.
export function canonicalEmail(value) {
  const e = String(value ?? '').trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at < 1 || at === e.length - 1) return e;
  let local = e.slice(0, at);
  let domain = e.slice(at + 1);
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.split('+')[0].replace(/\./g, '');
  return `${local}@${domain}`;
}

export function emailDigest(value) {
  const canon = canonicalEmail(value);
  if (!canon) return '';
  return crypto.createHash('sha256').update(DIGEST_PREFIX + canon).digest('hex');
}

// Mirrors src/docformat.js phiWarnings + src/suggest.js accession check.
const HKID = /\b[A-Z]{1,2}\s?\d{6}\s?\([\dA]\)/i;
const HONORIFIC = /\b(Mr|Mrs|Ms|Miss|Mdm|Madam)\.?\s+[A-Z][a-z]+/;
const PHONE = /\b(\+?852[\s-]?)?[2-9]\d{3}[\s-]?\d{4}\b/;
const DOB = /\b(dob|date of birth|d\.o\.b)\b/i;
const ACCESSION = /\b[A-Z]{1,3}\s?\d{2}\s?[-/]\s?\d{4,6}\b/i;

export function checkPhi(text) {
  const s = String(text || '');
  const hits = [];
  if (HKID.test(s)) hits.push('looks like an HKID');
  if (HONORIFIC.test(s)) hits.push('looks like a patient name');
  if (PHONE.test(s)) hits.push('looks like a phone number');
  if (DOB.test(s)) hits.push('mentions a date of birth');
  if (ACCESSION.test(s)) hits.push('looks like an accession number');
  return hits;
}

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (origin === ALLOWED_ORIGIN) return true;
  if (ALLOW_LOCALHOST && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

/**
 * Ordered model fallback chain for each task + template kind.
 * Model IDs can be overridden via env vars without rebuilding the container.
 */
export function routeChain({ task = 'proofread', kind = '' } = {}) {
  const flashLite = process.env.MODEL_FLASH_LITE || 'gemini-3.5-flash-lite';
  const flash38 = process.env.MODEL_FLASH_38 || 'gemini-3.8-flash';
  const hydrogen = process.env.MODEL_HYDROGEN || 'gemini-4-hydrogen';
  const neon = process.env.MODEL_NEON || 'gemini-4-neon';

  const t = String(task).toLowerCase();
  const k = String(kind).toLowerCase();
  const isComplex = k.includes('cancer') || k.includes('biomarker') || t === 'audit';

  if (t === 'intake' || t === 'macro' || t === 'extract') {
    return [
      { model: flashLite, thinkingLevel: 'LOW', maxOutputTokens: 2048 },
      { model: flash38, thinkingLevel: 'LOW', maxOutputTokens: 4096 }
    ];
  }
  if (isComplex) {
    return [
      { model: neon, thinkingLevel: 'MEDIUM', maxOutputTokens: 8192 },
      { model: flash38, thinkingLevel: 'MEDIUM', maxOutputTokens: 8192 },
      { model: hydrogen, thinkingLevel: 'MEDIUM', maxOutputTokens: 8192 }
    ];
  }
  return [
    { model: flash38, thinkingLevel: 'LOW', maxOutputTokens: 4096 },
    { model: hydrogen, thinkingLevel: 'MEDIUM', maxOutputTokens: 8192 }
  ];
}

function isRetryableError(err) {
  const status = Number(err?.status || err?.code || 0);
  const msg = String(err?.message || err || '');
  return status === 403 || status === 429 || status === 500 || status === 503 || status === 504
    || /\b(403|429|500|503|504|PERMISSION_DENIED|RESOURCE_EXHAUSTED|UNAVAILABLE)\b/.test(msg);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Execute against Vertex AI with automatic fallback across the route chain. */
export async function callWithFallback(aiClient, { task, kind, system, prompt, responseSchema, maxOutputTokens, thinkingLevel }) {
  const chain = routeChain({ task, kind });
  const errors = [];

  for (let i = 0; i < chain.length; i++) {
    const step = chain[i];
    const level = thinkingLevel && ['LOW', 'MEDIUM', 'HIGH'].includes(thinkingLevel) ? thinkingLevel : step.thinkingLevel;
    const cap = Math.min(Number(maxOutputTokens) || step.maxOutputTokens, 12000);

    // Try up to 2 attempts on the primary model for transient 403/429 before stepping down.
    const attempts = i === 0 ? 2 : 1;
    for (let a = 0; a < attempts; a++) {
      const start = Date.now();
      try {
        const config = {
          maxOutputTokens: cap,
          thinkingConfig: { thinkingLevel: level }
        };
        if (system) config.systemInstruction = system;
        if (responseSchema) {
          config.responseMimeType = 'application/json';
          config.responseSchema = responseSchema;
        }
        const res = await aiClient.models.generateContent({
          model: step.model,
          contents: prompt,
          config
        });
        const ms = Date.now() - start;
        const u = res.usageMetadata || {};
        return {
          text: res.text || '',
          model: step.model,
          thinkingLevel: level,
          fallbackUsed: i > 0,
          seconds: Math.round((ms / 1000) * 10) / 10,
          usage: {
            promptTokens: u.promptTokenCount || 0,
            outputTokens: u.candidatesTokenCount || 0,
            thinkingTokens: u.thoughtsTokenCount || 0
          }
        };
      } catch (err) {
        errors.push(`${step.model}: ${err?.status || ''} ${String(err?.message || err).slice(0, 140)}`);
        if (!isRetryableError(err)) throw err;
        if (a + 1 < attempts) await sleep(400);
      }
    }
  }

  const finalErr = new Error(`All Vertex AI routes failed (${errors.join(' | ')})`);
  finalErr.status = 502;
  throw finalErr;
}

/** Verify Google OAuth access token and match SHA-256 digest against BUILT_IN_ALLOWED. */
export async function verifyGoogleToken(authHeader, fetchImpl = globalThis.fetch) {
  const m = /^Bearer\s+(\S+)$/i.exec(String(authHeader || '').trim());
  if (!m) return { ok: false, status: 401, error: 'Missing Bearer token.' };
  const headers = { Authorization: `Bearer ${m[1]}` };

  let email = '';
  let verified = true;
  let authed = false;

  // Browser tokens from src/gauth.js carry Drive + Sheets scopes (not userinfo.email),
  // so check Drive about first and fall back to oauth2/v3/userinfo for gcloud CLI tokens.
  const driveRes = await fetchImpl('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', { headers }).catch(() => null);
  if (driveRes?.ok) {
    authed = true;
    const data = await driveRes.json().catch(() => null);
    email = data?.user?.emailAddress || '';
  }

  if (!email) {
    const infoRes = await fetchImpl('https://www.googleapis.com/oauth2/v3/userinfo', { headers }).catch(() => null);
    if (infoRes?.ok) {
      authed = true;
      const info = await infoRes.json().catch(() => null);
      email = info?.email || '';
      if (info?.email_verified === false) verified = false;
    }
  }

  if (!authed) return { ok: false, status: 401, error: 'Invalid or expired Google token.' };
  if (!email || !verified) return { ok: false, status: 403, error: 'Unverified Google account.' };

  const digest = emailDigest(email);
  if (!BUILT_IN_ALLOWED.has(digest)) {
    return { ok: false, status: 403, error: 'Account is not on the Han Sign-out allow-list.' };
  }
  return { ok: true, digest };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (c) => {
      total += c.length;
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request payload too large.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data, origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  };
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
}

export function createServer({ aiClient, verifyToken = verifyGoogleToken } = {}) {
  const ai = aiClient || new GoogleGenAI({ vertexai: true, project: PROJECT_ID, location: VERTEX_LOCATION });

  return http.createServer(async (req, res) => {
    const origin = req.headers.origin || '';
    const url = new URL(req.url || '/', 'http://localhost');

    if (req.method === 'OPTIONS') {
      if (!isAllowedOrigin(origin)) return sendJson(res, 403, { error: 'Origin not allowed.' });
      res.writeHead(204, {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '3600',
        Vary: 'Origin'
      });
      res.end();
      return;
    }

    if (origin && !isAllowedOrigin(origin)) {
      return sendJson(res, 403, { error: 'Origin not allowed.' });
    }

    if (url.pathname === '/healthz' && req.method === 'GET') {
      return sendJson(res, 200, { ok: true }, origin);
    }

    const auth = await verifyToken(req.headers.authorization);
    if (!auth.ok) {
      return sendJson(res, auth.status, { error: auth.error }, origin);
    }

    if (url.pathname === '/v1/status' && req.method === 'GET') {
      return sendJson(res, 200, {
        app: 'signout-vertex-proxy',
        version: '1.0.0',
        ready: true,
        project: PROJECT_ID,
        location: VERTEX_LOCATION,
        routes: {
          extract: routeChain({ task: 'extract' }).map((r) => `${r.model}:${r.thinkingLevel}`),
          proofreadBiopsy: routeChain({ task: 'proofread', kind: 'biopsy' }).map((r) => `${r.model}:${r.thinkingLevel}`),
          proofreadCancer: routeChain({ task: 'proofread', kind: 'cancer resection' }).map((r) => `${r.model}:${r.thinkingLevel}`)
        }
      }, origin);
    }

    if (url.pathname === '/v1/ai' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
          return sendJson(res, 400, { error: 'Missing prompt.' }, origin);
        }
        const phiHits = checkPhi(`${body.prompt}\n${body.system || ''}`);
        if (phiHits.length) {
          return sendJson(res, 400, { error: `Blocked by PHI guard: ${phiHits.join(', ')}.` }, origin);
        }

        const out = await callWithFallback(ai, {
          task: body.task || 'proofread',
          kind: body.kind || '',
          system: typeof body.system === 'string' ? body.system : '',
          prompt: body.prompt,
          responseSchema: body.responseSchema || null,
          maxOutputTokens: body.maxOutputTokens,
          thinkingLevel: body.thinkingLevel
        });

        // Metadata-only audit log (never logs report text or user email).
        console.log(JSON.stringify({
          ts: new Date().toISOString(),
          task: body.task || 'proofread',
          kind: body.kind || '',
          model: out.model,
          thinkingLevel: out.thinkingLevel,
          fallbackUsed: out.fallbackUsed,
          seconds: out.seconds,
          usage: out.usage,
          status: 200
        }));

        return sendJson(res, 200, out, origin);
      } catch (err) {
        const status = Number(err?.status || 500);
        console.error(JSON.stringify({ ts: new Date().toISOString(), status, error: String(err?.message || err).slice(0, 200) }));
        return sendJson(res, status, { error: err?.message || 'Vertex AI request failed.' }, origin);
      }
    }

    return sendJson(res, 404, { error: 'Not found.' }, origin);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createServer();
  server.listen(PORT, () => {
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'listening', port: PORT, project: PROJECT_ID, location: VERTEX_LOCATION, origin: ALLOWED_ORIGIN }));
  });
}
