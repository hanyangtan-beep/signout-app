// Sign-in gate for the published app.
//
// What this does and does not do. It decides whether the workspace is rendered at all, so a
// visitor who reaches the published URL without a Google account sees a sign-in screen instead of
// a working reporting app. It is not a security boundary: the bundle is served as static files to
// whoever asks for it, and anyone with devtools can step over a check that runs in their own
// browser. The room it locks is deliberately empty — no patient data ships in the bundle, and the
// cases themselves live in Drive, where Google validates the token server-side rather than
// trusting this page. Treat the gate as "a stranger with the link cannot use the app", never as
// protection for patient data.
//
// The platform Share setting on the app asset is the real access control, because it is enforced
// by the host before any of this runs. As of 2026-09-16 setting it to "only people with access"
// did not actually refuse unauthenticated requests to the published URL (verified with an
// anonymous fetch: the whole app still downloaded), which is why this gate is worth having.

/** Hosts where the gate is off so browser QA and local development can drive the app. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1', '']);

/**
 * Is the gate active on this host? Keyed on the hostname alone — never on a query parameter or a
 * storage flag, both of which would travel to the published site and hand anyone a bypass.
 */
export function gateEnabled(hostname) {
  return !LOCAL_HOSTS.has(String(hostname || '').toLowerCase());
}

/** Fold case and surrounding space so a list entry matches however it was typed. */
export function normaliseEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

/** Parse the Settings textarea: one address per line or comma-separated, blanks dropped. */
export function parseAllowList(text) {
  return String(text ?? '')
    .split(/[\s,;]+/)
    .map(normaliseEmail)
    .filter(Boolean);
}

/** Render the stored list back into the Settings textarea. */
export function formatAllowList(list) {
  return (Array.isArray(list) ? list : []).join('\n');
}

/**
 * Is this address allowed in? An empty list means "any Google account", which is the default:
 * the gate's job out of the box is to require an account, not to pick which one.
 */
export function isAllowedEmail(email, allowed) {
  const list = (Array.isArray(allowed) ? allowed : []).map(normaliseEmail).filter(Boolean);
  if (!list.length) return true;
  return list.includes(normaliseEmail(email));
}

/**
 * The whole decision, pure so it can be tested without a DOM or a Google account.
 * Returns 'open' (render the workspace), 'signin' (not signed in yet) or 'refused'
 * (signed in as somebody who is not on the list).
 */
export function gateState({ enabled, signedIn, email, allowed }) {
  if (!enabled) return 'open';
  if (!signedIn) return 'signin';
  // An address that has not resolved yet is not grounds for refusal — userinfo may still be in
  // flight, and locking out the owner because a fetch was slow is worse than admitting them.
  if (!normaliseEmail(email)) return 'open';
  return isAllowedEmail(email, allowed) ? 'open' : 'refused';
}
