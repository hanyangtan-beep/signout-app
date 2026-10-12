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

/**
 * The built-in allow-list (pulled by the user 2026-09-30, docs/google-setup.md §5). Each entry is
 * the SHA-256 digest of a canonical address, never the address itself, because this file is
 * served to anyone who asks for it. When the list is set it is the only list: the Settings field
 * cannot widen it on somebody else's machine, and an address that cannot be confirmed is not let
 * in. To add an account, run `node tools/allow-hash.mjs <address>`, paste the digest here and add
 * the account as a test user in the Google project.
 */
export const BUILT_IN_ALLOWED = Object.freeze([
  'f1affe86746a4d8e461fef5f1961910dd4f09e23b7cdb0c062036565708108e0',
  '4209ed95f6932b556ce4d6911b2d3d31723877b253ad50ac156096710e508fa7',
  '9f75c2117c0022709c3c07be3b1cfb546b2383f4cf91bd45d0babc5f6f75bf76',
  '01d0953041061cc52f50214eb3fd1c182db1c1def812bb96cfa5d29ea84af6a9',
  '56010ba9f1298acd33cd127f72f7614a7a100f140311b7922a9710a42256f961'
]);

/** Salt for the digests, so they cannot be looked up in a table of hashed addresses. */
const DIGEST_PREFIX = 'signout-gate:v1:';

/**
 * The address Google means, so a list entry matches however the account was typed: case and
 * spacing folded, and for Gmail the dots and any "+tag" in the local part dropped and
 * googlemail.com read as gmail.com (Gmail ignores both). Other domains keep their dots.
 */
export function canonicalEmail(value) {
  const e = normaliseEmail(value);
  const at = e.lastIndexOf('@');
  if (at < 1 || at === e.length - 1) return e;
  let local = e.slice(0, at);
  let domain = e.slice(at + 1);
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.split('+')[0].replace(/\./g, '');
  return `${local}@${domain}`;
}

/**
 * Hex SHA-256 of the salted canonical address, or '' when there is no address or no Web Crypto
 * (an insecure origin). The published site is https, where Web Crypto is always present.
 */
export async function emailDigest(value, subtle = globalThis.crypto?.subtle) {
  const canon = canonicalEmail(value);
  if (!canon || !subtle) return '';
  const buf = await subtle.digest('SHA-256', new TextEncoder().encode(DIGEST_PREFIX + canon));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
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
 * Returns 'open' (render the workspace), 'signin' (not signed in yet), 'refused' (signed in as
 * somebody who is not on the list) or 'unconfirmed' (a built-in list is set but the signed-in
 * address could not be confirmed). `digest` is `emailDigest(email)`, worked out by the caller.
 */
export function gateState({ enabled, signedIn, email, allowed, builtIn = [], digest = '' }) {
  if (!enabled) return 'open';
  if (!signedIn) return 'signin';
  if (builtIn.length) {
    // A fixed list admits a confirmed member only. The address is fetched before the gate decides,
    // so a missing one means the lookup failed, and that is not waved through.
    if (!normaliseEmail(email) || !digest) return 'unconfirmed';
    return builtIn.includes(digest) ? 'open' : 'refused';
  }
  // An address that has not resolved yet is not grounds for refusal — userinfo may still be in
  // flight, and locking out the owner because a fetch was slow is worse than admitting them.
  if (!normaliseEmail(email)) return 'open';
  return isAllowedEmail(email, allowed) ? 'open' : 'refused';
}
