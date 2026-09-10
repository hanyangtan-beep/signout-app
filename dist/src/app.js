// Sign-out UI: renders any schema in the registry, keeps case state, previews the report live.

import { loadManifest, loadTemplate } from './registry.js?v=mtv0dhml';
import { biopsyRowLayout, resectionStrip, groupBySystem, selectorGroups, rankTemplates, labelOf, isBiopsy, pushRecent, togglePin, KIND_LABEL } from './picker.js?v=mtv0dhml';
import {
  createCase, createPart, relabel, isVisible, optionsFor, normalisePart, generateCase, templateIdOf, templatesInUse, snippetsFor, toggleOption, applyPreset
} from './engine.js?v=mtv0dhml';
import { loadCase, saveCase as cacheCase, clearCase, copyText } from './store.js?v=mtv0dhml';
import { loadConfig, saveConfig } from './config.js?v=mtv0dhml';
import { getToken, fetchUserInfo, isSignedIn, currentUser, signOut, consumeRedirect, setActiveAction } from './gauth.js?v=mtv0dhml';
import { saveCase as driveSave, listCases, openCase as driveOpen } from './drive.js?v=mtv0dhml';
import { normaliseAccession, phiWarnings } from './docformat.js?v=mtv0dhml';

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
  manifest: [],           // templates/manifest.json entries (metadata for every installed template)
  templates: {},          // id -> { schema, generator } — lazy-loaded on first use
  pins: [],               // template ids pinned to the Resections row
  recents: [],            // non-biopsy template ids, most recent first
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
  biopsyRow: $('#biopsy-row'),
  resectionRow: $('#resection-row'),
  resections: $('#btn-resections'),
  paletteBtn: $('#btn-palette'),
  dlgPalette: $('#dlg-palette'),
  paletteSearch: $('#palette-search'),
  paletteList: $('#palette-list'),
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

function activePart() { return state.caseState.parts[state.activePart]; }
const LETTERS_NEXT = (n) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[n] || '?';
/** Template entry for a part (each part may use a different template). */
function templateOf(part) { return state.templates[templateIdOf(state.caseState, part)]; }
function schemaOf(part) { return templateOf(part).schema; }
/** Schema of the active part: the one new parts inherit and the nav highlights. */
function schema() { return schemaOf(activePart()); }
/** Schemas of every template used by the case, in order of first appearance. */
function schemasInUse() { return templatesInUse(state.caseState).map((id) => state.templates[id].schema); }
/** Keep `schemaId` (the case default) equal to part A's template. */
function syncPrimary() {
  const cs = state.caseState;
  cs.parts.forEach((p) => { p.templateId = templateIdOf(cs, p); });
  cs.schemaId = cs.parts[0].templateId;
  cs.schemaVersion = state.templates[cs.schemaId].schema.version;
}

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
  syncPrimary();
  state.dirty = false;
  state.activePart = Math.min(activePart, caseState.parts.length - 1);
  render();
}

/** Manifest entry for a template id. */
function entryOf(id) { return state.manifest.find((t) => t.id === id); }

/** Load a template's schema + generator on first use (cached by the registry). */
async function ensureTemplate(id) {
  if (state.templates[id]) return state.templates[id];
  if (!entryOf(id)) throw new Error(`Template ${id} is not installed`);
  const t = await loadTemplate(id);
  state.templates[id] = t;
  return t;
}
async function ensureTemplates(ids) { return Promise.all([...new Set(ids)].map(ensureTemplate)); }

/** Remember non-biopsy templates for the Resections row (biopsies have their own fixed row). */
function noteUsed(id) {
  const t = entryOf(id);
  if (!t || isBiopsy(t)) return;
  state.recents = pushRecent(state.recents, id);
  persistPicker();
}

function loadPicker() {
  try {
    state.pins = JSON.parse(localStorage.getItem('signout.pins') || '[]');
    state.recents = JSON.parse(localStorage.getItem('signout.recents') || '[]');
  } catch { state.pins = []; state.recents = []; }
  const known = new Set(state.manifest.map((t) => t.id));
  state.pins = state.pins.filter((id) => known.has(id));
  state.recents = state.recents.filter((id) => known.has(id));
}
function persistPicker() {
  try {
    localStorage.setItem('signout.pins', JSON.stringify(state.pins));
    localStorage.setItem('signout.recents', JSON.stringify(state.recents));
  } catch { /* preview iframe */ }
}

async function newCase(schemaId) {
  const { schema: s } = await ensureTemplate(schemaId);
  noteUsed(schemaId);
  setCase(createCase(s), 0);
}

function loadExample() {
  const s = schema();
  if (!s.example) return toast('No example for this template');
  const ex = JSON.parse(JSON.stringify(s.example));
  const meta = state.caseState?.meta;
  const caseFields = {};
  for (const f of s.caseFields || []) if (ex[f.id] !== undefined) caseFields[f.id] = ex[f.id];
  setCase({ schemaId: s.id, schemaVersion: s.version, caseTitle: ex.caseTitle || '', ...caseFields, options: { ...ex.options }, parts: ex.parts, meta: { ...meta, accession: meta?.accession || '' } }, 0);
  toast('Example loaded');
}

/**
 * Header template buttons. On an untouched case they start a new case of that
 * template; once the case has been edited they switch the *active part* to that
 * template, so a case can mix parts (A gastric, B gastric, C polyp).
 */
async function switchTemplate(id) {
  if (!state.dirty && !state.caseState.meta?.accession && !state.caseState.drive?.savedAt) {
    if (id !== state.caseState.schemaId) await newCase(id);
    return;
  }
  await setPartTemplate(state.activePart, id);
}

/** Change one part's template; its values are reset to that template's defaults. */
async function setPartTemplate(i, id) {
  const parts = state.caseState.parts;
  if (templateIdOf(state.caseState, parts[i]) === id) return;
  const { schema: s } = await ensureTemplate(id);
  noteUsed(id);
  markDirty();
  const own = parts.filter((p, j) => j < i && templateIdOf(state.caseState, p) === id).length; // position within that template
  parts[i] = { ...createPart(s, own), label: parts[i].label, templateId: id };
  syncPrimary();
  render();
  toast(`Part ${parts[i].label}: ${s.name}`);
}

function maxPartsForCase() {
  return Math.max(...schemasInUse().map((s) => s.maxParts || 10));
}

function addPart() {
  markDirty();
  const s = schema();
  const parts = state.caseState.parts;
  if (parts.length >= maxPartsForCase()) return toast(`Maximum ${maxPartsForCase()} parts`);
  const own = parts.filter((p) => templateIdOf(state.caseState, p) === s.id).length;
  parts.push({ ...createPart(s, own), templateId: s.id });
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
  syncPrimary();
  state.activePart = Math.max(0, Math.min(state.activePart, parts.length - 1));
  render();
}

function resetPart(i) {
  markDirty();
  const part = state.caseState.parts[i];
  const id = templateIdOf(state.caseState, part);
  state.caseState.parts[i] = { ...createPart(schemaOf(part), i), label: part.label, templateId: id };
  render();
}

function copyFromPrevious(i) {
  if (i === 0) return;
  markDirty();
  const prev = state.caseState.parts[i - 1];
  const part = state.caseState.parts[i];
  part.templateId = templateIdOf(state.caseState, prev);
  part.values = JSON.parse(JSON.stringify(prev.values));
  syncPrimary();
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
  const inUse = schemasInUse();
  const label = inUse.length === 1 ? `${inUse[0].name} · v${inUse[0].version}` : `Mixed: ${inUse.map((s) => s.shortName || s.name).join(' + ')}`;
  nodes.statusTemplate.textContent = `${label} · ${state.caseState.parts.length} part${state.caseState.parts.length === 1 ? '' : 's'}`;
  cacheCase(state.caseState);
  renderMeta();
  renderSaveStatus();
}

function navButton(t, current) {
  return el('button', {
    type: 'button', 'aria-pressed': String(t.id === current), text: labelOf(t), 'data-template': t.id,
    title: state.dirty || state.caseState.meta?.accession ? `Use ${t.name} for part ${activePart().label}` : `New ${t.name} case`,
    onclick: () => switchTemplate(t.id).catch((e) => toast(e.message))
  });
}

function renderNav() {
  const current = schema().id;
  const { shown, overflow } = biopsyRowLayout(state.manifest);
  const biopsyButtons = shown.map((t) => navButton(t, current));
  if (overflow.length) {
    // the active template must stay one click away even when it falls in the overflow
    const active = overflow.find((t) => t.id === current);
    if (active) biopsyButtons.push(navButton(active, current));
    biopsyButtons.push(el('button', { type: 'button', class: 'more', text: `More (${overflow.length}) ▾`, onclick: () => openPalette({ only: 'biopsy' }) }));
  }
  nodes.biopsyRow.replaceChildren(...biopsyButtons);
  const strip = resectionStrip(state.manifest, state.pins, state.recents);
  nodes.resectionRow.replaceChildren(...(strip.length ? strip.map((t) => navButton(t, current))
    : [el('span', { class: 'empty', text: 'No resection templates yet' })]));
}

// ---------- template palette (Cmd/Ctrl-K, "/", Resections ▾) ----------
const palette = { mode: {}, items: [], index: 0 };

function paletteMatches(query) {
  const exclude = palette.mode.only === 'biopsy' ? ['benign resection', 'cancer resection', 'frozen'] : palette.mode.exclude || [];
  return rankTemplates(state.manifest, query, { exclude });
}

function openPalette(mode = {}) {
  palette.mode = mode;
  palette.index = 0;
  nodes.paletteSearch.value = '';
  nodes.paletteSearch.placeholder = mode.exclude?.includes('biopsy') ? 'Type a resection, organ or alias (e.g. LEEP, frozen, gallbladder)' : 'Type a template, organ or alias (e.g. LEEP, Marsh, pylori)';
  renderPalette();
  if (!nodes.dlgPalette.open) nodes.dlgPalette.showModal();
  nodes.paletteSearch.focus();
}

function choosePaletteItem(t) {
  nodes.dlgPalette.close();
  switchTemplate(t.id).catch((e) => toast(e.message));
}

function paletteRow(t, i, current) {
  const pinned = state.pins.includes(t.id);
  const pin = el('button', {
    type: 'button', class: 'pin', 'aria-pressed': String(pinned), text: pinned ? '★' : '☆',
    title: pinned ? 'Unpin from the Resections row' : 'Pin to the Resections row', 'aria-label': `${pinned ? 'Unpin' : 'Pin'} ${t.name}`,
    onclick: (e) => { e.stopPropagation(); e.preventDefault(); state.pins = togglePin(state.pins, t.id); persistPicker(); renderNav(); renderPalette(); }
  });
  const row = el('button', {
    type: 'button', class: 'palette-item', role: 'option', 'aria-selected': String(i === palette.index), 'data-template': t.id,
    onclick: () => choosePaletteItem(t), onmousemove: () => { if (palette.index !== i) { palette.index = i; markPaletteSelection(); } }
  },
  el('span', {}, el('span', { class: 'pi-name', text: t.shortName === labelOf(t) ? t.name : t.shortName }), el('span', { class: 'pi-sub', text: `${t.name}${t.id === current ? ' · current' : ''}${t.aliases?.length ? ' · ' + t.aliases.slice(0, 4).join(', ') : ''}` })),
  el('span', { class: 'pi-kind', text: KIND_LABEL[t.kind] || t.kind }),
  isBiopsy(t) ? el('span') : pin);
  return row;
}

function renderPalette() {
  const q = nodes.paletteSearch.value.trim();
  const current = schema().id;
  const children = [];
  if (q) {
    palette.items = paletteMatches(q);
    palette.items.forEach((t, i) => children.push(paletteRow(t, i, current)));
    if (!palette.items.length) children.push(el('div', { class: 'palette-empty', text: `No template matches "${q}"` }));
  } else {
    // grouped browse: system × kind
    const exclude = palette.mode.only === 'biopsy' ? ['benign resection', 'cancer resection', 'frozen'] : palette.mode.exclude || [];
    const groups = groupBySystem(state.manifest, { exclude });
    palette.items = [];
    for (const g of groups) {
      children.push(el('div', { class: 'palette-group', text: g.system }));
      for (const t of g.items) { children.push(paletteRow(t, palette.items.length, current)); palette.items.push(t); }
    }
    if (!palette.items.length) children.push(el('div', { class: 'palette-empty', text: 'No resection templates installed yet — Phase 4b adds them. Small biopsies are on the row above.' }));
  }
  palette.index = Math.min(palette.index, Math.max(0, palette.items.length - 1));
  nodes.paletteList.replaceChildren(...children);
  markPaletteSelection();
}

function markPaletteSelection() {
  nodes.paletteList.querySelectorAll('.palette-item').forEach((n, i) => n.setAttribute('aria-selected', String(i === palette.index)));
  const sel = nodes.paletteList.querySelectorAll('.palette-item')[palette.index];
  sel?.scrollIntoView({ block: 'nearest' });
}

function initPalette() {
  nodes.paletteBtn.addEventListener('click', () => openPalette());
  nodes.resections.addEventListener('click', () => openPalette({ exclude: ['biopsy'] }));
  nodes.paletteSearch.addEventListener('input', () => { palette.index = 0; renderPalette(); });
  nodes.paletteSearch.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); palette.index = Math.min(palette.index + 1, palette.items.length - 1); markPaletteSelection(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palette.index = Math.max(palette.index - 1, 0); markPaletteSelection(); }
    else if (e.key === 'Enter') { e.preventDefault(); const t = palette.items[palette.index]; if (t) choosePaletteItem(t); }
  });
  nodes.dlgPalette.addEventListener('click', (e) => { if (e.target === nodes.dlgPalette) nodes.dlgPalette.close(); });
}

function renderCaseFields() {
  const fields = [];
  for (const s of schemasInUse()) for (const f of s.caseFields || []) if (!fields.some((g) => g.id === f.id)) fields.push(f);
  const presets = (schema().presets || []).map((pr) => el('button', {
    type: 'button', class: 'btn ghost small', text: pr.label, title: pr.help || `Replace the parts with the ${pr.label} set`,
    onclick: () => applyCasePreset(pr)
  }));
  const presetRow = presets.length ? el('div', { class: 'field presets' }, el('div', { class: 'field-label', text: 'Presets' }), el('div', { class: 'preset-buttons' }, ...presets)) : null;
  nodes.caseFields.replaceChildren(...[presetRow].filter(Boolean), ...fields.map((f) => {
    const id = `case-${f.id}`;
    const input = el('input', {
      class: 'input', id, type: 'text', placeholder: f.placeholder || '', value: state.caseState[f.id] || '',
      oninput: (e) => { markDirty(); state.caseState[f.id] = e.target.value; renderReport(); cacheCase(state.caseState); }
    });
    return el('div', { class: 'field' }, el('label', { for: id, text: f.label }), input,
      f.help ? el('div', { class: 'field-help', text: f.help }) : null);
  }));
  nodes.caseFields.hidden = fields.length === 0 && !presetRow;
}

/** Replace the case's parts with a schema preset (e.g. Sydney five-site gastric mapping). */
function applyCasePreset(preset) {
  const s = schema();
  const fresh = applyPreset(s, preset);
  const cs = state.caseState;
  if (cs.parts.some((p) => p.templateId && p.templateId !== s.id)) {
    if (!confirm('This case mixes templates. Replace all parts with the preset?')) return;
  }
  markDirty();
  cs.parts = fresh.parts;
  if (fresh.caseTitle) cs.caseTitle = fresh.caseTitle;
  state.activePart = 0;
  render();
}

function renderTabs() {
  const parts = state.caseState.parts;
  nodes.tabs.replaceChildren(...parts.map((p, i) => el('button', {
    type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(i === state.activePart), text: p.label,
    title: schemaOf(p).name,
    onclick: () => { state.activePart = i; render(); }
  })));
  nodes.addPart.disabled = parts.length >= maxPartsForCase();
  nodes.addPart.title = `Add part ${LETTERS_NEXT(parts.length)} (${schema().name})`;
}

function labelFor(field, value) {
  if (field.optionLabels && value in field.optionLabels) return field.optionLabels[value];
  return value === '' ? '—' : value;
}

// Optional per-field visual reference (schema `field.reference`): a collapsible comparison panel of
// annotated photomicrographs with morphological criteria and licence credits. Open state is kept per
// field so it survives re-renders while the user works through the part.
const openReferences = new Set();
function referenceToggle(field, part) {
  const ref = field.reference;
  if (!ref) return null;
  const key = `${part.label}:${field.id}`;
  return el('button', {
    type: 'button', class: 'ref-toggle', 'aria-expanded': String(openReferences.has(key)),
    title: ref.title || 'Show reference images',
    onclick: () => { openReferences.has(key) ? openReferences.delete(key) : openReferences.add(key); render(); }
  }, el('span', { 'aria-hidden': 'true', text: '◧' }), document.createTextNode(openReferences.has(key) ? 'Hide photos' : 'Compare photos'));
}
function referencePanel(field, part) {
  const ref = field.reference;
  if (!ref || !openReferences.has(`${part.label}:${field.id}`)) return null;
  const panel = el('div', { class: 'ref-panel', role: 'region', 'aria-label': ref.title || field.label });
  if (ref.title) panel.append(el('div', { class: 'ref-title', text: ref.title }));
  if (ref.intro) panel.append(el('p', { class: 'ref-intro', text: ref.intro }));
  panel.append(el('div', { class: 'ref-groups', style: `--ref-cols:${(ref.groups || []).length || 1}` },
    ...(ref.groups || []).map((g) => el('section', { class: 'ref-group' },
      el('h4', { text: g.heading }),
      g.points?.length ? el('ul', { class: 'ref-points' }, ...g.points.map((t) => el('li', { text: t }))) : null,
      ...(g.images || []).map((im) => el('figure', { class: 'ref-figure' },
        el('img', { src: im.src, alt: im.caption || g.heading, loading: 'lazy', decoding: 'async' }),
        el('figcaption', {},
          im.caption ? el('span', { class: 'ref-caption', text: im.caption }) : null,
          im.credit ? el('span', { class: 'ref-credit' },
            im.url ? el('a', { href: im.url, target: '_blank', rel: 'noopener', text: im.credit }) : document.createTextNode(im.credit),
            im.license ? document.createTextNode(` · ${im.license}`) : null) : null)))))));
  if (ref.note) panel.append(el('p', { class: 'ref-note', text: ref.note }));
  return panel;
}

// Consecutive fields sharing a `group` render inside one collapsible fieldset
// (e.g. "Macroscopy" on the benign resection templates). Ungrouped fields stay flat.
function groupFields(fields, part, index) {
  const out = [];
  let current = null;
  for (const f of fields) {
    const node = renderField(f, part, index);
    if (!f.group) { current = null; out.push(node); continue; }
    if (!current || current.name !== f.group) {
      const key = `signout.group.${f.group}`;
      const details = el('details', { class: 'field-group', 'data-group': f.group },
        el('summary', { text: f.group }));
      details.open = localStorage.getItem(key) !== 'closed';
      details.addEventListener('toggle', () => localStorage.setItem(key, details.open ? 'open' : 'closed'));
      current = { name: f.group, node: details };
      out.push(details);
    }
    current.node.append(node);
  }
  return out;
}

function renderField(field, part, index) {
  const visible = isVisible(field, part.values);
  const id = `f-${part.label}-${field.id}`;
  const wrap = el('div', { class: `field${visible ? '' : ' hidden'}${field.reference ? ' has-ref' : ''}`, 'data-field': field.id });
  const value = part.values[field.id];

  if (field.type === 'text' || field.type === 'textarea' || field.type === 'number') {
    const input = el(field.type === 'textarea' ? 'textarea' : 'input', {
      class: 'input', id, placeholder: field.placeholder || '', rows: field.type === 'textarea' ? 2 : undefined,
      oninput: (e) => { markDirty(); part.values[field.id] = e.target.value; renderReport(); cacheCase(state.caseState); }
    });
    if (field.type === 'text') input.type = 'text';
    if (field.type === 'number') { input.type = 'number'; input.min = field.min ?? 0; input.step = field.step ?? 1; input.inputMode = 'decimal'; }
    if (field.suffix) input.dataset.suffix = field.suffix;
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
  if (field.type === 'multiselect') {
    const chosen = Array.isArray(value) ? value : [];
    const group = el('div', {
      class: 'chips multi', role: 'group', 'aria-label': field.label, tabindex: '0', 'data-field': field.id,
      onkeydown: (e) => {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= options.length) { e.preventDefault(); setValue(field.id, toggleOption(field, chosen, options[n - 1])); focusField(field.id); }
      }
    }, ...options.map((opt, i) => el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(chosen.includes(opt)), onclick: () => setValue(field.id, toggleOption(field, chosen, opt))
    }, el('span', { class: 'key', text: String(i + 1) }), document.createTextNode(labelFor(field, opt)))));
    wrap.append(el('div', { class: 'field-label', id: `${id}-label`, text: field.label },
      el('span', { class: 'field-hint', text: ' (tick all that apply)' })), group);
    if (field.help) wrap.append(el('div', { class: 'field-help', text: field.help }));
    return wrap;
  }
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
    wrap.append(el('div', { class: 'field-label', id: `${id}-label`, text: field.label }),
      field.reference ? el('div', { class: 'field-control' }, group, referenceToggle(field, part)) : group);
    const refPanel = referencePanel(field, part);
    if (refPanel) wrap.append(refPanel);
    return wrap;
  }

  const select = el('select', { class: 'input', id, onchange: (e) => setValue(field.id, e.target.value) },
    ...options.map((opt) => {
      const o = el('option', { value: opt, text: labelFor(field, opt) });
      if (opt === value) o.selected = true;
      return o;
    }));
  wrap.append(el('label', { for: id, text: field.label }),
    field.reference ? el('div', { class: 'field-control' }, select, referenceToggle(field, part)) : select);
  const refPanel = referencePanel(field, part);
  if (refPanel) wrap.append(refPanel);
  return wrap;
}

function focusField(fieldId) {
  requestAnimationFrame(() => {
    const g = nodes.panel.querySelector(`.chips[data-field="${fieldId}"]`);
    if (g) g.focus();
  });
}

function renderPanel() {
  const i = state.activePart;
  const part = state.caseState.parts[i];
  const s = schemaOf(part);
  const picker = el('select', {
    class: 'input part-template', 'aria-label': `Template for part ${part.label}`,
    onchange: (e) => setPartTemplate(i, e.target.value).catch((err) => { toast(err.message); render(); })
  }, ...selectorGroups(state.manifest).map((g) => el('optgroup', { label: g.label }, ...g.items.map((t) => {
    const o = el('option', { value: t.id, text: t.name });
    if (t.id === s.id) o.selected = true;
    return o;
  }))));
  const head = el('div', { class: 'part-head' },
    el('h3', { text: `Part ${part.label}` }),
    picker,
    el('div', { class: 'part-actions' },
      i > 0 ? el('button', { type: 'button', class: 'btn ghost small', text: 'Same as previous', onclick: () => copyFromPrevious(i) }) : null,
      el('button', { type: 'button', class: 'btn ghost small', text: 'Reset', onclick: () => resetPart(i) }),
      el('button', { type: 'button', class: 'btn ghost small danger', text: 'Remove', onclick: () => removePart(i) })
    ));
  nodes.panel.replaceChildren(head, ...groupFields(s.fields, part, i));
}

function renderOptions() {
  const opts = [];
  for (const s of schemasInUse()) for (const o of s.options || []) if (!opts.some((p) => p.id === o.id)) opts.push(o);
  const optionNodes = opts.map((o) => {
    const input = el('input', { type: 'checkbox', onchange: (e) => { markDirty(); state.caseState.options[o.id] = e.target.checked; renderReport(); cacheCase(state.caseState); } });
    input.checked = !!state.caseState.options[o.id];
    return el('label', {}, input, document.createTextNode(o.label));
  });
  const snippets = snippetsFor(state.templates, state.caseState);
  const snippetNodes = snippets.map((sn) => {
    const input = el('input', {
      type: 'checkbox',
      onchange: (e) => {
        markDirty();
        state.caseState.snippets = state.caseState.snippets || {};
        // Store an explicit choice only when it differs from the suggestion, so auto-suggestion keeps working.
        if (e.target.checked === sn.suggested) delete state.caseState.snippets[sn.id]; else state.caseState.snippets[sn.id] = e.target.checked;
        renderReport(); cacheCase(state.caseState);
      }
    });
    input.checked = sn.active;
    return el('label', { class: sn.suggested ? 'snippet suggested' : 'snippet', title: sn.text },
      input, document.createTextNode(sn.label), sn.suggested ? el('span', { class: 'tag', text: 'suggested' }) : null);
  });
  const comment = el('textarea', {
    class: 'input', id: 'case-comment', rows: '2', placeholder: 'Additional comment (appears after the diagnosis)',
    oninput: (e) => { markDirty(); state.caseState.comment = e.target.value; renderReport(); cacheCase(state.caseState); }
  });
  comment.value = state.caseState.comment || '';
  nodes.options.replaceChildren(
    optionNodes.length ? el('div', { class: 'option-row' }, ...optionNodes) : null,
    snippetNodes.length ? el('div', { class: 'snippet-group' }, el('div', { class: 'group-title', text: 'Comments' }), el('div', { class: 'option-row' }, ...snippetNodes)) : null,
    el('div', { class: 'field comment-field' }, el('label', { for: 'case-comment', text: 'Comment' }), comment)
  );
  nodes.options.hidden = false;
}

function highlightParts(text) {
  // Wrap "(A)" part labels for a subtle visual anchor in the mono preview.
  const frag = document.createDocumentFragment();
  const re = /\(([A-Z])\)/g;
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
  let out;
  try {
    out = generateCase(state.templates, state.caseState);
  } catch (err) {
    nodes.blocks.replaceChildren(el('div', { class: 'block' }, el('pre', { text: `Generator error: ${err.message}` })));
    return;
  }
  state.lastOut = out;
  const blocks = [
    ['Specimens', out.specimens],
    ['Macroscopic description', out.macro],
    ['Block key', out.blockKey],
    ['Intraoperative consultation', out.intraop],
    ['Microscopic examination', out.microscopy],
    ['Diagnosis', out.diagnosis],
    ['Comment', out.comment]
  ].filter(([title, text]) => text || ['Specimens', 'Microscopic examination', 'Diagnosis'].includes(title));
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

const CANONICAL = 'https://han-signout.pplx.app/';
const AUTH_ORIGINS = ['https://han-signout.pplx.app', 'http://localhost:3000', 'http://127.0.0.1:3000'];

async function ensureSignedIn(interactive = true, action = 'signin') {
  if (interactive && !AUTH_ORIGINS.includes(location.origin)) {
    // Google only accepts the registered address; previews and proxies are different origins.
    const go = window.confirm(`Google sign-in only works when the app is opened at ${CANONICAL}\n\nThis copy is running at ${location.origin}. Open the app at the correct address now? (Your current draft stays in this tab.)`);
    if (go) window.open(CANONICAL, '_blank', 'noopener');
    throw new Error(`Open the app at ${CANONICAL} to sign in`);
  }
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
        await ensureTemplates(templatesInUse(cs));
        nodes.dlgOpen.close();
        setCase(cs, 0);
        toast(`Opened ${r.accession}`);
      } catch (err) { toast(err.message); }
    }
  },
  el('div', {}, el('div', { class: 'acc', text: r.accession }), el('div', { class: 'sub', text: `${String(r.template).split('+').map((id) => entryOf(id)?.label || id).join(' + ')} · ${r.parts} part${r.parts === '1' ? '' : 's'}` })),
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
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable || e.target.closest?.('.chips, dialog');
    if (mod && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); if (nodes.dlgPalette.open) nodes.dlgPalette.close(); else openPalette(); return; }
    if (e.key === '/' && !mod && !e.altKey && !typing) { e.preventDefault(); openPalette(); return; }
    if (nodes.dlgPalette.open) return;
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
  state.manifest = await loadManifest();
  loadPicker();
  const saved = loadCase();
  initDrive();
  initPalette();
  const defaultId = biopsyRowLayout(state.manifest).shown[0]?.id || state.manifest[0].id; // most-used small biopsy
  if (saved && templatesInUse(saved).every((id) => entryOf(id))) {
    await ensureTemplates(templatesInUse(saved));
    setCase(saved, 0);
  } else await newCase(defaultId);
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
    clearCase(); newCase(state.caseState.schemaId).then(() => toast('New case'));
  });
  nodes.copyDx.addEventListener('click', () => doCopy(state.lastOut.diagnosis, 'Diagnosis'));
  nodes.copyReport.addEventListener('click', () => doCopy(state.lastOut.report, 'Full report'));
  initKeys();
}

boot().catch((err) => {
  nodes.blocks.replaceChildren(el('div', { class: 'block' }, el('pre', { text: `Failed to start: ${err.message}` })));
});
