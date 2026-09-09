// Google Identity Services token flow (browser only). No secrets: the OAuth client is a public
// web client restricted by origin. Tokens live in memory for the tab and are refreshed silently.

import { scopesFor } from './config.js';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

let tokenClient = null;
let token = null;          // { access_token, expires_at }
let scriptPromise = null;
let userEmail = null;

export function isSignedIn() {
  return !!token && token.expires_at > Date.now() + 30_000;
}

export function currentUser() { return userEmail; }

function loadGsi() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GSI_SRC; s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Google sign-in script'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Obtain an access token. `interactive=false` tries a silent refresh (prompt: '') first and
 * falls back to the consent pop-up only if that fails.
 */
export async function getToken(config, { interactive = true } = {}) {
  if (isSignedIn()) return token.access_token;
  if (!config.clientId) throw new Error('No Google client id set. Open Settings and paste the OAuth client id.');
  await loadGsi();
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: config.clientId,
      scope: scopesFor(config),
      callback: () => {}
    });
  }
  const request = (prompt) => new Promise((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp.error) return reject(new Error(resp.error_description || resp.error));
      token = { access_token: resp.access_token, expires_at: Date.now() + (Number(resp.expires_in) - 60) * 1000 };
      resolve(token.access_token);
    };
    tokenClient.error_callback = (err) => reject(new Error(err?.message || err?.type || 'Sign-in cancelled'));
    tokenClient.requestAccessToken({ prompt });
  });
  try {
    return await request(interactive ? undefined : '');
  } catch (err) {
    if (!interactive) return request(undefined);
    throw err;
  }
}

export async function fetchUserInfo(accessToken) {
  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
  if (r.ok) { const j = await r.json(); userEmail = j.email || null; }
  return userEmail;
}

export function signOut() {
  if (token && window.google?.accounts?.oauth2) {
    try { window.google.accounts.oauth2.revoke(token.access_token, () => {}); } catch { /* ignore */ }
  }
  token = null; userEmail = null;
}

/** Authenticated fetch against googleapis with one silent-refresh retry on 401. */
export async function gfetch(config, url, init = {}) {
  let accessToken = await getToken(config, { interactive: false });
  const run = async (t) => fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${t}` } });
  let res = await run(accessToken);
  if (res.status === 401) {
    token = null;
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
