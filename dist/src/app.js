// Sign-out UI: renders any schema in the registry, keeps case state, previews the report live.

import { loadAll } from './registry.js?v=mtu7szsw';
import {
  createCase, createPart, relabel, isVisible, optionsFor, normalisePart, generate
} from './engine.js?v=mtu7szsw';
import { loadCase, saveCase as cacheCase, clearCase, copyText } from './store.js?v=mtu7szsw';
import { loadConfig, saveConfig } from './config.js?v=mtu7szsw';
import { getToken, fetchUserInfo, isSignedIn, currentUser, signOut, consumeRedirect, setActiveAction } from './gauth.js?v=mtu7szsw';
import { saveCase as driveSave, listCases, openCase as driveOpen } from './drive.js?v=mtu7szsw';
import { normaliseAccession, phiWarnings } from './docformat.js?v=mtu7szsw';

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children) if (c !== null && c !== undefined) node.append(c);
  return node;
};

const state = {
  templates: {},          // id -> { schema, generator }
  caseState: null,        // { schemaId, caseTitle, options, parts, meta, drive }
  activePart: 0,
  lastOut: null,
  config: loadConfig(),
  dirty: false,           // edited since last Drive save
  saving: false,
  cases: []               // last fetched Sheet rows for the Open dialog
};

const META_FIELDS = ['accession', 'status', 'clinical', 'macro', 'blockKey'];
function ensureMeta(caseState) {
  caseState.meta = { accession: '', status: 'draft', clinical: '', macro: '', blockKey: '', ...(caseState.meta || {}) };
  caseState.drive = caseState.drive || null;
  return caseState;
}

const nodes = {
  nav: $('#template-nav'),
  caseFields: $('#case-fields'),
  tabs: $('#part-tabs'),
  addPart: $('#btn-add-part'),
  panel: $('#part-panel'),
  options: $('#case-options'),
  blocks: $('#report-blocks'),
  copyDx: $('#btn-copy-dx'),
  copyReport: $('#btn-copy-report'),
  example: $('#btn-example'),
  newCase: $('#btn-new'),
  theme: $('#theme-toggle'),
  open: $('#btn-open'),
  save: $('#btn-save'),
  google: $('#btn-google'),
  settings: $('#btn-settings'),
  dlgOpen: $('#dlg-open'),
  openSearch: $('#open-search'),
  openList: $('#open-list'),
  dlgSettings: $('#dlg-settings'),
  settingsForm: $('#settings-form'),
  signout: $('#btn-signout'),
  meta: Object.fromEntries(META_FIELDS.map((k) => [k, $(`#meta-${k}`)])),
  statusTemplate: $('#status-template'),
  statusSave: $('#status-save'),
  toast: $('#toast')
};

function current() { return state.templates[state.caseState.schemaId]; }
function schema() { return current().schema; }
function activePart() { return state.caseState.parts[state.activePart]; }

// ---------- theme ----------
function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('signout.theme'); } catch { /* preview iframe */ }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = saved || (prefersDark ? 'dark' : 'light');
  nodes.theme.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('signout.theme', next); } catch { /* ignore */ }
  });
}

// ---------- toast ----------
let toastTimer = null;
function toast(msg) {
  nodes.toast.textContent = msg;
  nodes.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => nodes.toast.classList.remove('show'), 1800);
}

// ---------- state changes ----------
function setCase(caseState, activePart = 0) {
  state.caseState = ensureMeta(caseState);
  state.dirty = false;
  state.activePart = Math.min(activePart, caseState.parts.length - 1);
  render();
}

function newCase(schemaId) {
  const s = state.templates[schemaId].schema;
  setCase(createCase(s, 1), 0);
}

function loadExample() {
  const s = schema();
  if (!s.example) return toast('No example for this template');
  const ex = JSON.parse(JSON.stringify(s.example));
  const meta = state.caseState?.meta;
  setCase({ schemaId: s.id, schemaVersion: s.version, caseTitle: ex.caseTitle || '', options: { ...ex.options }, parts: ex.parts, meta: { ...meta, accession: meta?.accession || '' } }, 0);
  toast('Example loaded');
}

function switchTemplate(id) {
  if (id === state.caseState.schemaId) return;
  newCase(id);
}

function addPart() {
  markDirty();
  const s = schema();
  const parts = state.caseState.parts;
  if (parts.length >= (s.maxParts || 10)) return toast(`Maximum ${s.maxParts} parts`);
  parts.push(createPart(s, parts.length));
  relabel(parts);
  state.activePart = parts.length - 1;
  render();
}

function removePart(i) {
  const parts = state.caseState.parts;
  if (parts.length === 1) return toast('A case needs at least one part');
  markDirty();
  parts.splice(i, 1);
  relabel(parts);
  state.activePart = Math.max(0, Math.min(state.activePart, parts.length - 1));
  render();
}

function resetPart(i) {
  markDirty();
  const s = schema();
  state.caseState.parts[i] = createPart(s, i);
  render();
}

function copyFromPrevious(i) {
  if (i === 0) return;
  markDirty();
  const prev = state.caseState.parts[i - 1];
  state.caseState.parts[i].values = { ...prev.values };
  render();
}

function markDirty() { if (!state.dirty) { state.dirty = true; renderSaveStatus(); } }

function setValue(fieldId, value) {
  markDirty();
  const part = activePart();
  part.values[fieldId] = value;
  normalisePart(schema(), part);
  render();
}

// ---------- rendering ----------
function render() {
  renderNav();
  renderCaseFields();
  renderTabs();
  renderPanel();
  renderOptions();
  renderReport();
  nodes.statusTemplate.textContent = `${schema().name} · v${schema().version} · ${state.caseState.parts.length} part${state.caseState.parts.length === 1 ? '' : 's'}`;
  cacheCase(state.caseState);
  renderMeta();
  renderSaveStatus();
}

function renderNav() {
  nodes.nav.replaceChildren(...Object.values(state.templates).map(({ schema: s }) =>
    el('button', {
      type: 'button', 'aria-pressed': String(s.id === state.caseState.schemaId), text: s.name,
      onclick: () => switchTemplate(s.id)
    })));
}

function renderCaseFields() {
  const fields = schema().caseFields || [];
  nodes.caseFields.replaceChildren(...fields.map((f) => {
    const id = `case-${f.id}`;
    const input = el('input', {
      class: 'input', id, type: 'text', placeholder: f.placeholder || '', value: state.caseState[f.id] || '',
      oninput: (e) => { markDirty(); state.caseState[f.id] = e.target.value; renderReport(); cacheCase(state.caseState); }
    });
    return el('div', { class: 'field' }, el('label', { for: id, text: f.label }), input,
      f.help ? el('div', { class: 'field-help', text: f.help }) : null);
  }));
  nodes.caseFields.hidden = fields.length === 0;
}

function renderTabs() {
  const parts = state.caseState.parts;
  nodes.tabs.replaceChildren(...parts.map((p, i) => el('button', {
    type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(i === state.activePart), text: p.label,
    onclick: () => { state.activePart = i; render(); }
  })));
  nodes.addPart.disabled = parts.length >= (schema().maxParts || 10);
}

function labelFor(field, value) {
  if (field.optionLabels && value in field.optionLabels) return field.optionLabels[value];
  return value === '' ? '—' : value;
}

function renderField(field, part, index) {
  const visible = isVisible(field, part.values);
  const id = `f-${part.label}-${field.id}`;
  const wrap = el('div', { class: `field${visible ? '' : ' hidden'}`, 'data-field': field.id });
  const value = part.values[field.id];

  if (field.type === 'text' || field.type === 'textarea') {
    const input = el(field.type === 'textarea' ? 'textarea' : 'input', {
      class: 'input', id, placeholder: field.placeholder || '', rows: field.type === 'textarea' ? 2 : undefined,
      oninput: (e) => { markDirty(); part.values[field.id] = e.target.value; renderReport(); cacheCase(state.caseState); }
    });
    if (field.type === 'text') input.type = 'text';
    input.value = value ?? '';
    wrap.append(el('label', { for: id, text: field.label }), input);
    return wrap;
  }

  if (field.type === 'checkbox') {
    const input = el('input', { type: 'checkbox', id, onchange: (e) => setValue(field.id, e.target.checked) });
    input.checked = !!value;
    wrap.append(el('label', { for: id, text: field.label }), el('div', {}, input));
    return wrap;
  }

  const options = optionsFor(field, part.values);
  if (options.length <= 6) {
    const group = el('div', {
      class: 'chips', role: 'radiogroup', 'aria-label': field.label, tabindex: '0', 'data-field': field.id,
      onkeydown: (e) => {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= options.length) { e.preventDefault(); setValue(field.id, options[n - 1]); focusField(field.id); }
      }
    }, ...options.map((opt, i) => el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(opt === value), onclick: () => setValue(field.id, opt)
    }, el('span', { class: 'key', text: String(i + 1) }), document.createTextNode(labelFor(field, opt)))));
    wrap.append(el('div', { class: 'field-label', id: `${id}-label`, text: field.label }), group);
    return wrap;
  }

  const select = el('select', { class: 'input', id, onchange: (e) => setValue(field.id, e.target.value) },
    ...options.map((opt) => {
      const o = el('option', { value: opt, text: labelFor(field, opt) });
      if (opt === value) o.selected = true;
      return o;
    }));
  wrap.append(el('label', { for: id, text: field.label }), select);
  return wrap;
}

function focusField(fieldId) {
  requestAnimationFrame(() => {
    const g = nodes.panel.querySelector(`.chips[data-field="${fieldId}"]`);
    if (g) g.focus();
  });
}

function renderPanel() {
  const s = schema();
  const i = state.activePart;
  const part = state.caseState.parts[i];
  const head = el('div', { class: 'part-head' },
    el('h3', { text: `Part ${part.label}` }),
    el('span', { class: 'part-sub', text: s.organ ? `${s.organ.toLowerCase()} ${s.specimenNoun || ''}`.trim() : '' }),
    el('div', { class: 'part-actions' },
      i > 0 ? el('button', { type: 'button', class: 'btn ghost small', text: 'Same as previous', onclick: () => copyFromPrevious(i) }) : null,
      el('button', { type: 'button', class: 'btn ghost small', text: 'Reset', onclick: () => resetPart(i) }),
      el('button', { type: 'button', class: 'btn ghost small danger', text: 'Remove', onclick: () => removePart(i) })
    ));
  const fields = s.fields.map((f) => renderField(f, part, i));
  nodes.panel.replaceChildren(head, ...fields);
}

function renderOptions() {
  const opts = schema().options || [];
  nodes.options.replaceChildren(...opts.map((o) => {
    const input = el('input', { type: 'checkbox', onchange: (e) => { markDirty(); state.caseState.options[o.id] = e.target.checked; renderReport(); cacheCase(state.caseState); } });
    input.checked = !!state.caseState.options[o.id];
    return el('label', {}, input, document.createTextNode(o.label));
  }));
  nodes.options.hidden = opts.length === 0;
}

function highlightParts(text) {
  // Wrap "(A)" part labels for a subtle visual anchor in the mono preview.
  const frag = document.createDocumentFragment();
  const re = /\(([A-J])\)/g;
  let last = 0; let m;
  while ((m = re.exec(text))) {
    if (m.index > last) frag.append(text.slice(last, m.index));
    frag.append(el('span', { class: 'part-label', text: m[0] }));
    last = m.index + m[0].length;
  }
  if (last < text.length) frag.append(text.slice(last));
  return frag;
}

function renderReport() {
  const { schema: s, generator } = current();
  let out;
  try {
    out = generate(s, generator, state.caseState);
  } catch (err) {
    nodes.blocks.replaceChildren(el('div', { class: 'block' }, el('pre', { text: `Generator error: ${err.message}` })));
    return;
  }
  state.lastOut = out;
  const blocks = [
    ['Specimens', out.specimens],
    ['Microscopic examination', out.microscopy],
    ['Diagnosis', out.diagnosis]
  ];
  nodes.blocks.replaceChildren(...blocks.map(([title, text]) => {
    const pre = el('pre', {});
    pre.append(highlightParts(text));
    return el('div', { class: 'block' },
      el('div', { class: 'block-head' }, el('h3', { text: title }),
        el('button', { type: 'button', class: 'btn ghost small', text: 'Copy', onclick: () => doCopy(text, title) })),
      pre);
  }));
}

async function doCopy(text, label) {
  const ok = await copyText(text);
  toast(ok ? `${label} copied` : 'Copy failed');
}


// ---------- case meta + Drive ----------
function renderMeta() {
  const meta = state.caseState.meta;
  for (const k of META_FIELDS) {
    const node = nodes.meta[k];
    if (node && node.value !== (meta[k] || '')) node.value = meta[k] || '';
  }
}

function relTime(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

function renderSaveStatus() {
  const d = state.caseState?.drive;
  let text;
  if (state.saving) text = 'Saving to Drive…';
  else if (d?.savedAt) text = `${state.dirty ? 'Edited since Drive save' : 'Saved to Drive'} · ${relTime(d.savedAt)}`;
  else text = state.config.clientId ? 'Not saved to Drive.' : 'Not saved to Drive. Add the Google client id in Settings to enable saving.';
  nodes.statusSave.replaceChildren(text);
  if (d?.docUrl) nodes.statusSave.append(' · ', el('a', { href: d.docUrl, target: '_blank', rel: 'noopener', text: 'Open Doc' }));
  nodes.save.textContent = state.saving ? 'Saving…' : 'Save';
  nodes.save.disabled = state.saving;
  nodes.save.classList.toggle('primary', state.dirty && !!state.caseState?.meta?.accession);
}

function renderAccount() {
  const email = currentUser();
  nodes.google.textContent = isSignedIn() && email ? email.split('@')[0] : (isSignedIn() ? 'Signed in' : 'Sign in');
  nodes.google.title = email ? `Google: ${email}` : 'Sign in to Google';
  nodes.google.classList.toggle('signed', isSignedIn());
}

async function ensureSignedIn(interactive = true, action = 'signin') {
  setActiveAction(action);
  const t = await getToken(state.config, { interactive, action });
  if (!currentUser()) await fetchUserInfo(t).catch(() => null);
  renderAccount();
  return t;
}

async function doSave() {
  if (state.saving) return;
  const meta = state.caseState.meta;
  if (!normaliseAccession(meta.accession)) { nodes.meta.accession.focus(); return toast('Enter an accession number first'); }
  const warnings = phiWarnings({ 'Clinical history': meta.clinical, Macroscopic: meta.macro, 'Block key': meta.blockKey, Report: state.lastOut?.report });
  if (warnings.length && !window.confirm(`Possible patient identifiers:\n\n${warnings.join('\n')}\n\nOnly accession numbers and report text should go to Drive. Save anyway?`)) return;
  try {
    state.saving = true; renderSaveStatus();
    cacheCase(state.caseState); // survives the Google round trip if sign-in is needed
    await ensureSignedIn(true, 'save');
    await driveSave(state.config, state.caseState, state.lastOut);
    state.dirty = false;
    cacheCase(state.caseState);
    toast(`Saved ${normaliseAccession(meta.accession)} to Drive`);
  } catch (err) {
    toast(err.message || 'Save failed');
  } finally {
    state.saving = false; renderSaveStatus();
  }
}

function renderCaseList(filter = '') {
  const f = normaliseAccession(filter);
  const rows = state.cases.filter((r) => !f || r.accession.includes(f))
    .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  if (!rows.length) return nodes.openList.replaceChildren(el('div', { class: 'empty', text: state.cases.length ? 'No matching cases' : 'No saved cases yet' }));
  nodes.openList.replaceChildren(...rows.slice(0, 200).map((r) => el('button', {
    type: 'button', class: 'case-row', role: 'listitem',
    onclick: async () => {
      try {
        const cs = await driveOpen(state.config, r.accession);
        if (!state.templates[cs.schemaId]) throw new Error(`Template ${cs.schemaId} is not installed`);
        nodes.dlgOpen.close();
        setCase(cs, 0);
        toast(`Opened ${r.accession}`);
      } catch (err) { toast(err.message); }
    }
  },
  el('div', {}, el('div', { class: 'acc', text: r.accession }), el('div', { class: 'sub', text: `${state.templates[r.template]?.schema.name || r.template} · ${r.parts} part${r.parts === '1' ? '' : 's'}` })),
  el('span', { class: `status ${r.status}`, text: r.status }),
  el('span', { class: 'sub', text: relTime(r.updated) }))));
}

async function doOpen() {
  nodes.openList.replaceChildren(el('div', { class: 'empty', text: 'Loading…' }));
  nodes.openSearch.value = '';
  nodes.dlgOpen.showModal();
  try {
    await ensureSignedIn(true, 'open');
    state.cases = await listCases(state.config);
    renderCaseList();
  } catch (err) {
    nodes.openList.replaceChildren(el('div', { class: 'empty', text: err.message }));
  }
}

function openSettings() {
  for (const k of ['clientId', 'folderId', 'sheetName', 'scopeMode']) $(`#cfg-${k}`).value = state.config[k] || '';
  nodes.signout.hidden = !isSignedIn();
  nodes.dlgSettings.showModal();
}

function initDrive() {
  for (const k of META_FIELDS) {
    nodes.meta[k].addEventListener('input', (e) => {
      markDirty();
      state.caseState.meta[k] = e.target.value;
      cacheCase(state.caseState);
      if (k === 'accession' || k === 'status') renderSaveStatus();
    });
  }
  nodes.meta.accession.addEventListener('blur', (e) => {
    const n = normaliseAccession(e.target.value);
    if (n !== e.target.value) { e.target.value = n; state.caseState.meta.accession = n; cacheCase(state.caseState); }
  });
  nodes.save.addEventListener('click', doSave);
  nodes.open.addEventListener('click', doOpen);
  nodes.openSearch.addEventListener('input', (e) => renderCaseList(e.target.value));
  nodes.google.addEventListener('click', async () => {
    if (!state.config.clientId) { openSettings(); return toast('Paste the Google OAuth client id first'); }
    try { await ensureSignedIn(true, 'signin'); toast(`Signed in as ${currentUser() || 'Google user'}`); } catch (err) { toast(err.message); }
  });
  nodes.settings.addEventListener('click', openSettings);
  nodes.settingsForm.addEventListener('submit', (e) => {
    if (e.submitter?.value !== 'save') return;
    const patch = {};
    for (const k of ['clientId', 'folderId', 'sheetName', 'scopeMode']) patch[k] = $(`#cfg-${k}`).value.trim();
    if (patch.sheetName !== state.config.sheetName || patch.clientId !== state.config.clientId || patch.scopeMode !== state.config.scopeMode) patch.sheetId = '';
    state.config = saveConfig(patch);
    if (patch.clientId !== undefined) signOut();
    renderAccount(); renderSaveStatus();
    toast('Settings saved');
  });
  nodes.signout.addEventListener('click', () => { signOut(); renderAccount(); nodes.dlgSettings.close(); toast('Signed out'); });
  window.addEventListener('beforeunload', (e) => { if (state.dirty && !state.leaving && state.caseState?.drive?.savedAt) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('signout:redirect', () => { state.leaving = true; cacheCase(state.caseState); });
  renderAccount();
}

// ---------- keyboard ----------
function initKeys() {
  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); doCopy(state.lastOut.diagnosis, 'Diagnosis'); }
    else if (mod && !e.shiftKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); doSave(); }
    else if (mod && e.key === 'Enter') { e.preventDefault(); doCopy(state.lastOut.report, 'Full report'); }
    else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); state.activePart = Math.min(state.activePart + 1, state.caseState.parts.length - 1); render(); }
    else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); state.activePart = Math.max(0, state.activePart - 1); render(); }
  });
}

// ---------- boot ----------
async function boot() {
  initTheme();
  const back = consumeRedirect(); // did Google just send us back here?
  state.templates = await loadAll();
  const saved = loadCase();
  initDrive();
  if (saved && state.templates[saved.schemaId]) setCase(saved, 0);
  else newCase(Object.keys(state.templates)[0]);
  if (isSignedIn() && !currentUser()) fetchUserInfo(await getToken(state.config, { interactive: false })).then(renderAccount).catch(() => {});
  if (back?.error) toast(back.error === 'access_denied' ? 'Google sign-in was cancelled' : `Google sign-in failed: ${back.error}`);
  else if (back?.token) {
    if (back.action === 'save') { state.dirty = true; queueMicrotask(doSave); }
    else if (back.action === 'open') queueMicrotask(doOpen);
    else toast('Signed in');
  }

  nodes.addPart.addEventListener('click', addPart);
  nodes.example.addEventListener('click', loadExample);
  nodes.newCase.addEventListener('click', () => {
    if (state.dirty && !window.confirm('Discard unsaved changes to this case?')) return;
    clearCase(); newCase(state.caseState.schemaId); toast('New case');
  });
  nodes.copyDx.addEventListener('click', () => doCopy(state.lastOut.diagnosis, 'Diagnosis'));
  nodes.copyReport.addEventListener('click', () => doCopy(state.lastOut.report, 'Full report'));
  initKeys();
}

boot().catch((err) => {
  nodes.blocks.replaceChildren(el('div', { class: 'block' }, el('pre', { text: `Failed to start: ${err.message}` })));
});
