// Google OAuth 2.0 implicit (redirect) flow for a browser-only app. No secrets: the OAuth client
// is a public web client restricted by origin and redirect URI.
//
// Why redirect rather than the Google Identity Services pop-up: the pplx.app host sends
// Cross-Origin-Opener-Policy: same-origin, which cuts the link between the page and any pop-up it
// opens, so GIS reports "Popup window closed" every time. A full-page round trip to Google works
// regardless of that header. The case being edited is cached in sessionStorage before we leave and
// restored when Google sends us back; the interrupted action (save / open) is resumed automatically.

import { scopesFor } from './config.js';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const TOKEN_KEY = 'signout.token.v1';     // sessionStorage: { access_token, expires_at, email }
const PENDING_KEY = 'signout.pending.v1'; // sessionStorage: action name to resume after redirect

let token = readToken();
let activeAction = 'signin';

function readToken() {
  try { return JSON.parse(sessionStorage.getItem(TOKEN_KEY)) || null; } catch { return null; }
}
function writeToken(t) {
  token = t;
  try { t ? sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t)) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

export function isSignedIn() {
  return !!token && token.expires_at > Date.now() + 30_000;
}

export function currentUser() { return token?.email || null; }

/** Name the user-visible action in progress so a mid-flight re-auth can resume it. */
export function setActiveAction(name) { activeAction = name || 'signin'; }

/** Where Google sends the browser back: this page, without query or hash. */
export function redirectUri(loc = window.location) {
  return `${loc.origin}${loc.pathname}`;
}

/** Pure: build the authorisation URL. Exported for tests. */
export function buildAuthUrl(config, { redirect, action = 'signin', now = Date.now() } = {}) {
  const p = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirect,
    response_type: 'token',
    scope: scopesFor(config),
    include_granted_scopes: 'true',
    state: `${action}:${now.toString(36)}`
  });
  return `${AUTH_URL}?${p}`;
}

/** Pure: parse the fragment Google appends on return. Exported for tests. */
export function parseAuthHash(hash, now = Date.now()) {
  const h = (hash || '').replace(/^#/, '');
  if (!h) return null;
  const q = new URLSearchParams(h);
  if (!q.has('access_token') && !q.has('error')) return null;
  const action = (q.get('state') || '').split(':')[0] || 'signin';
  if (q.get('error')) return { error: q.get('error'), action };
  const ttl = Number(q.get('expires_in') || 3600);
  return {
    action,
    token: { access_token: q.get('access_token'), expires_at: now + (ttl - 60) * 1000, email: null }
  };
}

/**
 * Call once at boot. If Google just redirected back here, store the token, clean the URL and
 * return `{ action }` (or `{ error, action }`) so the caller can resume what the user was doing.
 */
export function consumeRedirect() {
  const parsed = parseAuthHash(window.location.hash);
  if (!parsed) return null;
  if (parsed.token) writeToken(parsed.token);
  try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
  try { history.replaceState(null, '', redirectUri()); } catch { /* ignore */ }
  return parsed;
}

function redirectToGoogle(config, action) {
  try { sessionStorage.setItem(PENDING_KEY, action); } catch { /* ignore */ }
  document.dispatchEvent(new CustomEvent('signout:redirect'));
  window.location.assign(buildAuthUrl(config, { redirect: redirectUri(), action }));
  return new Promise(() => {}); // never resolves; the page is leaving
}

/**
 * Obtain an access token. Non-interactive calls only succeed from the cached token; interactive
 * calls leave for Google and come back to this page.
 */
export async function getToken(config, { interactive = true, action } = {}) {
  if (isSignedIn()) return token.access_token;
  if (!config.clientId) throw new Error('No Google client id set. Open Settings and paste the OAuth client id.');
  if (!interactive) throw new Error('Not signed in');
  return redirectToGoogle(config, action || activeAction);
}

export async function fetchUserInfo(accessToken) {
  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
  if (r.ok && token) {
    const j = await r.json();
    writeToken({ ...token, email: j.email || null });
  }
  return currentUser();
}

export function signOut() {
  if (token?.access_token) {
    fetch(`${REVOKE_URL}?token=${encodeURIComponent(token.access_token)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).catch(() => {});
  }
  writeToken(null);
}

/** Authenticated fetch against googleapis; on 401 the token is dropped and the user is sent to re-auth. */
export async function gfetch(config, url, init = {}) {
  let accessToken = await getToken(config, { interactive: true });
  const run = async (t) => fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${t}` } });
  let res = await run(accessToken);
  if (res.status === 401) {
    writeToken(null);
    accessToken = await getToken(config, { interactive: true });
    res = await run(accessToken);
  }
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error?.message || ''; } catch { /* ignore */ }
    const err = new Error(`Google API ${res.status}${detail ? `: ${detail}` : ''}`);
    err.status = res.status;
    throw err;
  }
  return res;
}
