// Transient cache only. sessionStorage is unavailable inside the in-thread preview iframe,
// so every call is guarded; the published site keeps the in-progress case across a refresh.

const KEY = 'signout.case.v1';

export function loadCase() {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCase(caseState) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(caseState));
    return true;
  } catch {
    return false;
  }
}

export function clearCase() {
  try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ }
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
