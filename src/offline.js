// The page's side of the offline copy (docs/specs/speed.md, Phase 79): registers sw.js on the built
// site, asks it to store the rest of the app in the background, checks for a release every hour
// and hands over to one at a natural break (New case, Save & new). A source checkout, the tests and
// `npm run qa` never register it: only a build stamps the release id this reads.

import { buildId } from './registry.js';

let registration = null;
let stale = false; // another tab handed over to a newer release; this one reloads at its next break

const idle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 5000 }) : setTimeout(fn, 1500));

/** Turned off in this browser with ?nosw (back on with ?sw; the start-up script in index.html sets it). */
function turnedOff() {
  try { return window.localStorage.getItem('signout.nosw') === '1'; } catch { return false; }
}

/** Is the offline copy wanted here? A built site on a secure origin, a browser with service workers, not turned off. */
export function offlineSupported(loc = window.location) {
  return !!buildId() && 'serviceWorker' in navigator && window.isSecureContext && !turnedOff() && !new URLSearchParams(loc.search).has('nosw');
}

/** Turned off: clear away anything a worker in another tab stored since. */
async function clearAway() {
  try {
    await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()));
    if (window.caches) await window.caches.delete('signout-files');
  } catch { /* nothing to clear */ }
}

/** Register the worker and warm the cache once it is in charge. Never throws; the app works without it. */
export async function startOffline() {
  if (buildId() && 'serviceWorker' in navigator && turnedOff()) return clearAway();
  if (!offlineSupported()) return;
  const sw = navigator.serviceWorker;
  const hadController = !!sw.controller;
  try {
    registration = await sw.register('sw.js', { updateViaCache: 'none' });
  } catch {
    // Offline, the check for a newer sw.js fails but the copy already here still runs the tab;
    // a sandboxed preview frame or private browsing has none and carries on from the network.
    registration = await sw.getRegistration().catch(() => null) || null;
    if (!registration) return;
  }
  sw.addEventListener('controllerchange', () => { if (hadController) stale = true; });
  const warm = () => idle(() => sw.controller?.postMessage({ type: 'warm' }));
  if (sw.controller) warm();
  else sw.addEventListener('controllerchange', warm, { once: true });
  setInterval(() => { registration?.update().catch(() => {}); }, 60 * 60 * 1000);
}

/** A newer release is ready for this tab: the next break should load it. */
export function releaseReady() {
  return stale || !!registration?.waiting;
}

/**
 * Put the waiting release in charge (of every tab of the app; the others reload at their own next
 * break). Resolves once it is, or after 3 seconds; the caller then reloads or leaves for Google.
 */
export async function handOver() {
  const waiting = registration?.waiting;
  if (!waiting) return;
  await new Promise((resolve) => {
    const done = setTimeout(resolve, 3000);
    navigator.serviceWorker.addEventListener('controllerchange', () => { clearTimeout(done); resolve(); }, { once: true });
    waiting.postMessage({ type: 'activate' });
  });
}
