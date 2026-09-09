// Sign-out UI: renders any schema in the registry, keeps case state, previews the report live.

import { loadAll } from './registry.js';
import {
  createCase, createPart, relabel, isVisible, optionsFor, normalisePart, generate
} from './engine.js';
import { loadCase, saveCase, clearCase, copyText } from './store.js';

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
  caseState: null,        // { schemaId, caseTitle, options, parts }
  activePart: 0,
  lastDx: ''
};

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
  state.caseState = caseState;
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
  setCase({ schemaId: s.id, schemaVersion: s.version, caseTitle: ex.caseTitle || '', options: { ...ex.options }, parts: ex.parts }, 0);
  toast('Example loaded');
}

function switchTemplate(id) {
  if (id === state.caseState.schemaId) return;
  newCase(id);
}

function addPart() {
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
  parts.splice(i, 1);
  relabel(parts);
  state.activePart = Math.max(0, Math.min(state.activePart, parts.length - 1));
  render();
}

function resetPart(i) {
  const s = schema();
  state.caseState.parts[i] = createPart(s, i);
  render();
}

function copyFromPrevious(i) {
  if (i === 0) return;
  const prev = state.caseState.parts[i - 1];
  state.caseState.parts[i].values = { ...prev.values };
  render();
}

function setValue(fieldId, value) {
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
  const ok = saveCase(state.caseState);
  nodes.statusSave.textContent = ok ? 'Kept in this tab until closed. Drive storage arrives in Phase 2.' : 'Not saved in preview. Drive storage arrives in Phase 2.';
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
      oninput: (e) => { state.caseState[f.id] = e.target.value; renderReport(); saveCase(state.caseState); }
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
      oninput: (e) => { part.values[field.id] = e.target.value; renderReport(); saveCase(state.caseState); }
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
    const input = el('input', { type: 'checkbox', onchange: (e) => { state.caseState.options[o.id] = e.target.checked; renderReport(); saveCase(state.caseState); } });
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

// ---------- keyboard ----------
function initKeys() {
  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); doCopy(state.lastOut.diagnosis, 'Diagnosis'); }
    else if (mod && e.key === 'Enter') { e.preventDefault(); doCopy(state.lastOut.report, 'Full report'); }
    else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); state.activePart = Math.min(state.activePart + 1, state.caseState.parts.length - 1); render(); }
    else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); state.activePart = Math.max(0, state.activePart - 1); render(); }
  });
}

// ---------- boot ----------
async function boot() {
  initTheme();
  state.templates = await loadAll();
  const saved = loadCase();
  if (saved && state.templates[saved.schemaId]) setCase(saved, 0);
  else newCase(Object.keys(state.templates)[0]);

  nodes.addPart.addEventListener('click', addPart);
  nodes.example.addEventListener('click', loadExample);
  nodes.newCase.addEventListener('click', () => { clearCase(); newCase(state.caseState.schemaId); toast('New case'); });
  nodes.copyDx.addEventListener('click', () => doCopy(state.lastOut.diagnosis, 'Diagnosis'));
  nodes.copyReport.addEventListener('click', () => doCopy(state.lastOut.report, 'Full report'));
  initKeys();
}

boot().catch((err) => {
  nodes.blocks.replaceChildren(el('div', { class: 'block' }, el('pre', { text: `Failed to start: ${err.message}` })));
});
