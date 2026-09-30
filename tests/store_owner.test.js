// The tab's cached draft reopens only for the account that left it (pulled by the user
// 2026-09-30, after the security review): a tab locked by one person does not hand their case to
// the next person who signs in on it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalEmail } from '../src/gate.js';

const store = new Map();
globalThis.window = {
  sessionStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  }
};
const { saveCase, loadCase, loadDraft, clearCase, setDraftOwner } = await import('../src/store.js');

const draft = { schemaId: 'gastric_biopsy', meta: { accession: 'S26-00001' }, parts: [] };
const A = canonicalEmail('Member.One@gmail.com');
const B = canonicalEmail('member.two@gmail.com');

function leaveDraftAs(account) {
  store.clear();
  setDraftOwner(account);
  assert.equal(saveCase(draft), true);
}

test('the same account gets its draft back, however the address is written', () => {
  leaveDraftAs(A);
  assert.deepEqual(loadDraft(canonicalEmail('memberone@GMAIL.com')), { caseState: draft, dropped: false });
  assert.deepEqual(loadCase(A), draft, 'still there after reading');
});

test('another account gets a clean case and the draft is gone from the tab', () => {
  leaveDraftAs(A);
  assert.deepEqual(loadDraft(B), { caseState: null, dropped: true });
  assert.equal(store.size, 0, 'draft and its owner tag both cleared');
  assert.equal(loadCase(A), null, 'not recoverable by switching back');
});

test('with nobody signed in, an account\'s draft is not shown', () => {
  leaveDraftAs(A);
  assert.deepEqual(loadDraft(''), { caseState: null, dropped: true });
  assert.equal(store.size, 0);
});

test('with the gate off, an untagged draft, cached while nobody was signed in, opens as before', () => {
  leaveDraftAs('');
  assert.equal(store.has('signout.case.owner.v1'), false);
  assert.deepEqual(loadDraft(B), { caseState: draft, dropped: false });
  assert.deepEqual(loadCase(), draft);
});

test('on the signed-in site, an untagged draft left by the earlier build is not handed to an account', () => {
  // Security review 2026-09-30: the build before the owner tag cached drafts without one, so on the
  // gated site an untagged draft has no known owner and is not handed to whoever signs in next.
  leaveDraftAs('');
  assert.deepEqual(loadDraft(B, { strict: true }), { caseState: null, dropped: true });
  assert.equal(store.size, 0, 'draft cleared from the tab');
  assert.equal(loadCase(A), null, 'not recoverable by another account either');
  leaveDraftAs(A);
  assert.deepEqual(loadDraft(A, { strict: true }), { caseState: draft, dropped: false }, 'a tagged draft still opens for its own account');
  // No account to compare (only possible with no sign-in list, where no draft carries a tag).
  leaveDraftAs('');
  assert.deepEqual(loadDraft('', { strict: true }), { caseState: draft, dropped: false });
});

test('a failed case write leaves no untagged draft and never passes a draft to another account', () => {
  // Security re-check 2026-09-30: the tag is written before the case, so storage running out part
  // way through cannot leave a case without a tag for the signed-in site to clear.
  const ss = globalThis.window.sessionStorage;
  const real = ss.setItem;
  const failCase = (k, v) => { if (k === 'signout.case.v1') throw new Error('QuotaExceededError'); return real(k, v); };
  leaveDraftAs(A);
  ss.setItem = failCase;
  try { assert.equal(saveCase({ ...draft, meta: { accession: 'S26-00002' } }), false); } finally { ss.setItem = real; }
  assert.deepEqual(loadDraft(A, { strict: true }), { caseState: draft, dropped: false }, 'the earlier draft stays under its own tag');
  leaveDraftAs(A);
  setDraftOwner(B);
  ss.setItem = failCase;
  try { assert.equal(saveCase(draft), false); } finally { ss.setItem = real; }
  assert.equal(store.has('signout.case.v1'), false, 'the earlier draft goes rather than change hands');
  assert.deepEqual(loadDraft(B, { strict: true }), { caseState: null, dropped: false });
});

test('a later save retags the draft for whoever is signed in now', () => {
  leaveDraftAs(A);
  setDraftOwner(B);
  saveCase(draft);
  assert.deepEqual(loadDraft(B).caseState, draft);
  assert.equal(loadDraft(A).dropped, true);
});

test('clearCase removes the draft and its tag; no draft reads as nothing dropped', () => {
  leaveDraftAs(A);
  clearCase();
  assert.equal(store.size, 0);
  assert.deepEqual(loadDraft(A), { caseState: null, dropped: false });
});
