// Transient cache only. sessionStorage is unavailable inside the in-thread preview iframe,
// so every call is guarded; the published site keeps the in-progress case across a refresh.

const KEY = 'signout.case.v1';
// Whose draft it is: the canonical address of the account signed in when it was cached, or ''
// when nobody was. Kept beside the draft so a tab locked by one person does not hand their case to
// the next person who signs in on it (security review 2026-09-30).
const OWNER_KEY = 'signout.case.owner.v1';
let owner = '';

/** Tag every later save with this account ('' when nobody is signed in). */
export function setDraftOwner(account) {
  owner = String(account || '');
}

/**
 * The cached draft, or null. A draft tagged with an account other than `account` is not handed
 * over: it is cleared from the tab and `dropped` is true, so the caller can say so without naming
 * anyone. An untagged draft (cached while nobody was signed in) opens for anybody, as before.
 */
export function loadDraft(account = '') {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return { caseState: null, dropped: false };
    const tag = window.sessionStorage.getItem(OWNER_KEY) || '';
    if (tag && tag !== String(account || '')) {
      clearCase();
      return { caseState: null, dropped: true };
    }
    return { caseState: JSON.parse(raw), dropped: false };
  } catch {
    return { caseState: null, dropped: false };
  }
}

export function loadCase(account = '') {
  return loadDraft(account).caseState;
}

export function saveCase(caseState) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(caseState));
    if (owner) window.sessionStorage.setItem(OWNER_KEY, owner);
    else window.sessionStorage.removeItem(OWNER_KEY);
    return true;
  } catch {
    return false;
  }
}

export function clearCase() {
  try {
    window.sessionStorage.removeItem(KEY);
    window.sessionStorage.removeItem(OWNER_KEY);
  } catch { /* ignore */ }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
}
