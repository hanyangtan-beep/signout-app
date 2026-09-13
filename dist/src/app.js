// Sign-out UI: renders any schema in the registry, keeps case state, previews the report live.

import { loadManifest, loadPlanned, loadTemplate } from './registry.js?v=mtz3fp24';
import { rowGroups, standalonePlanned, biopsyRow, groupBySystem, selectorGroups, rankTemplates, labelOf, isBiopsy, pushRecent, togglePin, KIND_LABEL } from './picker.js?v=mtz3fp24';
import {
  createCase, createPart, relabel, isVisible, optionsFor, normalisePart, generateCase, templateIdOf, templatesInUse, snippetsFor, toggleOption, applyPreset
} from './engine.js?v=mtz3fp24';
import { loadCase, saveCase as cacheCase, clearCase, copyText } from './store.js?v=mtz3fp24';
import { loadConfig, saveConfig } from './config.js?v=mtz3fp24';
import { getToken, fetchUserInfo, isSignedIn, currentUser, signOut, consumeRedirect, setActiveAction } from './gauth.js?v=mtz3fp24';
import { saveCase as driveSave, listCases, openCase as driveOpen } from './drive.js?v=mtz3fp24';
import { normaliseAccession, phiWarnings } from './docformat.js?v=mtz3fp24';
import { parseIntake, matchParts, presetValues, deriveTitle, MAX_PARTS, GENERIC_ID } from './intake.js?v=mtz3fp24';
import { applyMacroToCase } from './macroparse.js?v=mtz3fp24';
import { spanFull, groupProgress as progressOf } from './formlayout.js?v=mtz3fp24';

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
  planned: [],            // templates/planned.json — placeholders for templates still to build
  templates: {},          // id -> { schema, generator } — lazy-loaded on first use
  pins: [],               // template ids pinned to the Resections row
  recents: [],            // non-biopsy template ids, most recent first
  caseState: null,        // { schemaId, caseTitle, options, parts, meta, drive }
  activePart: 0,
  editing: null,          // report block key currently open in the in-place editor
  lastOut: null,
  config: loadConfig(),
  dirty: false,           // edited since last Drive save
  saving: false,
  cases: []               // last fetched Sheet rows for the Open dialog
};

const META_FIELDS = ['accession', 'status', 'specimen', 'clinical', 'macro', 'blockKey'];
function ensureMeta(caseState) {
  caseState.meta = { accession: '', status: 'draft', specimen: '', clinical: '', macro: '', blockKey: '', useLisMacro: false, useLisBlockKey: false, ...(caseState.meta || {}) };
  caseState.drive = caseState.drive || null;
  return caseState;
}

const nodes = {
  topRow: $('#top-row'),
  bottomRow: $('#bottom-row'),
  autopsyRow: $('#autopsy-row'),
  resections: $('#btn-resections'),
  paletteBtn: $('#btn-palette'),
  dlgPalette: $('#dlg-palette'),
  paletteSearch: $('#palette-search'),
  paletteList: $('#palette-list'),
  caseFields: $('#case-fields'),
  tabs: $('#part-tabs'),
  addPart: $('#btn-add-part'),
  panel: $('#part-panel'),
  macroPanel: $('#macro-panel'),
  options: $('#case-options'),
  blocks: $('#report-blocks'),
  copyDx: $('#btn-copy-dx'),
  copyReport: $('#btn-copy-report'),
  revertAll: $('#btn-revert-edits'),
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
  lis: {
    macro: { toggle: $('#meta-useLisMacro'), generated: $('#btn-macro-generated'), clear: $('#btn-macro-clear'), status: $('#lis-status-macro') },
    blockKey: { toggle: $('#meta-useLisBlockKey'), generated: $('#btn-blockKey-generated'), clear: $('#btn-blockKey-clear'), status: $('#lis-status-blockKey') }
  },
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

// Form density is a display preference, so it lives in localStorage rather than in the Drive config.
function initDensity() {
  let saved = null;
  try { saved = localStorage.getItem('signout.density'); } catch { /* preview iframe */ }
  document.documentElement.dataset.density = saved === 'compact' ? 'compact' : 'comfortable';
}
function setDensity(value) {
  document.documentElement.dataset.density = value === 'compact' ? 'compact' : 'comfortable';
  try { localStorage.setItem('signout.density', document.documentElement.dataset.density); } catch { /* ignore */ }
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
  state.caseState.edits = state.caseState.edits || {};
  state.editing = null;
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
  const keepLink = !!parts[i].linked && Object.values(pairedTemplates()).includes(id);
  parts[i] = { ...createPart(s, own), label: parts[i].label, templateId: id, ...(keepLink ? { linked: true } : {}) };
  relabel(parts);
  syncPrimary();
  applyMacro();
  render();
  toast(`Part ${parts[i].label}: ${s.name}`);
}

function maxPartsForCase() {
  return Math.min(MAX_PARTS, Math.max(...schemasInUse().map((s) => s.maxParts || 10)));
}

function addPart() {
  markDirty();
  const s = schema();
  const parts = state.caseState.parts;
  if (parts.length >= maxPartsForCase()) return toast(`Maximum ${maxPartsForCase()} parts`);
  const own = parts.filter((p) => templateIdOf(state.caseState, p) === s.id).length;
  parts.push({ ...createPart(s, own), templateId: s.id });
  relabel(parts);
  applyMacro();
  state.activePart = parts.length - 1;
  render();
}

/** Pre-fill macro fields from the pasted Macroscopic text (card (e)); remembers how many fields it filled. */
function applyMacro() {
  const cs = state.caseState;
  try {
    state.macroFilled = applyMacroToCase(cs, (part) => state.templates[templateIdOf(cs, part)]?.schema);
  } catch (err) { console.error(err); state.macroFilled = 0; }
  return state.macroFilled;
}

/** Frozen scenario -> paired synoptic template id (from the frozen generator when it is loaded). */
function pairedTemplates() { return state.templates.frozen_section?.generator?.PAIRED_TEMPLATE || {}; }
/** True when the paired synoptic is a separate specimen with its own letter (breast SLN -> breast resection). */
function pairSeparate(scenario) { return !!(state.templates.frozen_section?.generator?.PAIR_SEPARATE || {})[scenario]; }

/** True when part i is a frozen part whose paraffin result is malignant and has a paired synoptic template. */
function canStage(i) {
  const parts = state.caseState.parts;
  const part = parts[i];
  if (!part || templateIdOf(state.caseState, part) !== 'frozen_section') return false;
  const g = state.templates.frozen_section?.generator;
  if (!g || typeof g.stageable !== 'function' || !g.stageable(part)) return false;
  if (pairSeparate(part.values.scenario)) return !parts.some((p) => templateIdOf(state.caseState, p) === pairedTemplates()[part.values.scenario]);
  return !parts[i + 1]?.linked;
}

/**
 * "Stage this part": add the paired synoptic template as a linked part directly after frozen part i.
 * The new part shares the frozen part's letter (engine `relabel`) and is pre-filled from the frozen
 * values through the synoptic generator's `prefillFromFrozen` (docs/specs/lung-pair.md, engine card).
 */
async function stageThisPart(i) {
  const parts = state.caseState.parts;
  const part = parts[i];
  const pairId = pairedTemplates()[part.values.scenario];
  if (!pairId) return toast('No synoptic template is paired with this frozen scenario');
  const separate = pairSeparate(part.values.scenario);
  if (separate) {
    const j = parts.findIndex((p) => templateIdOf(state.caseState, p) === pairId);
    if (j >= 0) { state.activePart = j; render(); return toast(`Part ${parts[j].label} is already the breast synoptic`); }
  } else if (parts[i + 1]?.linked) { state.activePart = i + 1; render(); return toast(`Part ${part.label} already has its synoptic`); }
  if (parts.length >= maxPartsForCase()) return toast(`Maximum ${maxPartsForCase()} parts`);
  const { schema: s, generator: g } = await ensureTemplate(pairId);
  noteUsed(pairId);
  markDirty();
  const own = parts.filter((p, j) => j <= i && templateIdOf(state.caseState, p) === pairId).length;
  const np = { ...createPart(s, own), templateId: pairId, ...(separate ? {} : { linked: true }) };
  if (typeof g.prefillFromFrozen === 'function') Object.assign(np.values, g.prefillFromFrozen(part.values) || {});
  if (separate) parts.push(np); else parts.splice(i + 1, 0, np);
  relabel(parts);
  syncPrimary();
  applyMacro();
  state.activePart = separate ? parts.length - 1 : i + 1;
  render();
  toast(separate ? `Part ${np.label}: ${s.name} added; sentinel node counts from part ${part.label}` : `Part ${np.label}: ${s.name} linked to the frozen section`);
}

/**
 * "Upgrade this part": a benign resection part whose generator exports `UPGRADE_TO` and owes
 * its `when(values)` tick (e.g. an appendicectomy with a ticked LAMN / adenocarcinoma) becomes
 * the paired synoptic template in place; `UPGRADE_TO.map(values)` seeds the synoptic fields.
 */
function canUpgrade(i) {
  const part = state.caseState.parts[i];
  if (!part || part.linked) return null;
  const id = templateIdOf(state.caseState, part);
  const g = state.templates[id]?.generator;
  const up = g?.UPGRADE_TO;
  return up && typeof up.when === 'function' && up.when(part.values || {}) ? { part, id, up, g } : null;
}

async function upgradeThisPart(i) {
  const hit = canUpgrade(i);
  if (!hit) return;
  const { part, up } = hit;
  const { schema: s, generator: g } = await ensureTemplate(up.to).catch((err) => { toast(err.message); return null; });
  if (!s) return;
  noteUsed(up.to);
  markDirty();
  const fresh = createPart(s, 0);
  const values = { ...fresh.values, ...(typeof up.map === 'function' ? up.map(part.values) || {} : {}) };
  state.caseState.parts[i] = { ...fresh, label: part.label, templateId: up.to, values };
  syncPrimary();
  render();
  toast(`Part ${part.label}: upgraded to ${s.shortName || s.name}`);
}

function removePart(i) {
  const parts = state.caseState.parts;
  if (parts.length === 1) return toast('A case needs at least one part');
  markDirty();
  if (parts[i + 1]?.linked && !parts[i].linked) parts[i + 1].linked = false; // the synoptic keeps its own letter
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
  renderIntake();
  renderSaveStatus();
}

// ---------- header rows: system buttons opening a compact menu (docs/specs/navigation.md) ----------
const sysmenu = { open: null }; // key of the open menu ("top:GI"), one at a time

function closeSysmenu() {
  if (!sysmenu.open) return;
  sysmenu.open = null;
  renderNav();
}

/** Placeholder click: load Generic free text carrying the intended template's name (user 2026-09-12). */
async function openPlaceholder(t) {
  await switchTemplate('generic');
  const part = activePart();
  if (part && templateIdOf(state.caseState, part) === 'generic') {
    part.values.specimenName = t.name;
    markDirty();
    render();
  }
  toast(`${t.name}: pending build — Generic free text loaded (roadmap: ${t.roadmap || 'Later'})`);
}

function menuItem(t, current) {
  if (t.planned) {
    return el('button', {
      type: 'button', role: 'menuitem', class: 'menu-item pending', 'data-planned': t.id,
      title: `Not built yet (roadmap: ${t.roadmap || 'Later'}). Opens Generic free text with this name.`,
      onclick: () => { sysmenu.open = null; openPlaceholder(t).catch((e) => toast(e.message)); }
    }, el('span', { class: 'mi-name', text: t.name }), el('span', { class: 'mi-sub', text: 'pending build' }));
  }
  return el('button', {
    type: 'button', role: 'menuitem', class: 'menu-item', 'aria-current': String(t.id === current), 'data-template': t.id,
    title: state.dirty || state.caseState.meta?.accession ? `Use ${t.name} for part ${activePart().label}` : `New ${t.name} case`,
    onclick: () => { sysmenu.open = null; switchTemplate(t.id).catch((e) => toast(e.message)); }
  }, el('span', { class: 'mi-name', text: t.name }), el('span', { class: 'mi-sub', text: KIND_LABEL[t.kind] || t.kind }));
}

function systemButton(row, g, current) {
  const key = `${row}:${g.system}`;
  const holdsCurrent = g.items.some((t) => !t.planned && t.id === current);
  const open = sysmenu.open === key;
  const wrap = el('div', { class: 'sys' + (open ? ' open' : '') });
  const btn = el('button', {
    type: 'button', 'aria-pressed': String(holdsCurrent), 'aria-expanded': String(open), 'aria-haspopup': 'menu', 'data-system': g.system,
    title: g.items.map((t) => t.planned ? `${t.name} (pending build)` : t.name).join('\n'),
    onclick: (e) => { e.stopPropagation(); sysmenu.open = open ? null : key; renderNav(); }
  }, el('span', { text: g.label }));
  wrap.append(btn);
  if (open) wrap.append(el('div', { class: 'sysmenu', role: 'menu', 'aria-label': `${g.system} templates` }, ...g.items.map((t) => menuItem(t, current))));
  return wrap;
}

function renderNav() {
  const current = schema().id;
  for (const [row, node] of [['top', nodes.topRow], ['bottom', nodes.bottomRow]]) {
    const groups = rowGroups(state.manifest, state.planned, row, { pins: state.pins });
    node.replaceChildren(...groups.map((g) => systemButton(row, g, current)));
  }
  // standalone placeholders (Autopsy): one button each, same pending behaviour
  nodes.autopsyRow.replaceChildren(...standalonePlanned(state.planned).map((t) => el('button', {
    type: 'button', class: 'pending', 'data-planned': t.id, title: `Not built yet (roadmap: ${t.roadmap || 'Later'}). Opens Generic free text.`,
    onclick: () => openPlaceholder(t).catch((e) => toast(e.message))
  }, el('span', { text: t.label || t.name }), el('span', { class: 'tag', text: 'pending build' }))));
}

document.addEventListener('click', (e) => { if (sysmenu.open && !e.target.closest('.sys')) closeSysmenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sysmenu.open) closeSysmenu(); });

// ---------- template palette (Cmd/Ctrl-K, "/", Resections ▾) ----------
const palette = { mode: {}, items: [], index: 0 };

function paletteMatches(query) {
  const exclude = palette.mode.only === 'biopsy' ? ['benign resection', 'cancer resection', 'frozen', 'cytology'] : palette.mode.exclude || [];
  return rankTemplates(state.manifest, query, { exclude });
}

function openPalette(mode = {}) {
  palette.mode = mode;
  palette.index = 0;
  nodes.paletteSearch.value = '';
  nodes.paletteSearch.placeholder = mode.exclude?.includes('biopsy') ? 'Type a resection, cytology or alias (e.g. LEEP, frozen, thyroid FNA)' : 'Type a template, organ or alias (e.g. LEEP, Marsh, pylori)';
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
    title: pinned ? 'Unpin (sorts by frequency again)' : 'Pin to the top of its system menu', 'aria-label': `${pinned ? 'Unpin' : 'Pin'} ${t.name}`,
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
    const exclude = palette.mode.only === 'biopsy' ? ['benign resection', 'cancer resection', 'frozen', 'cytology'] : palette.mode.exclude || [];
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
    type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(i === state.activePart), text: p.linked ? `${p.label} syn` : p.label,
    title: p.linked ? `${schemaOf(p).name} (linked to the frozen section under the same letter)` : schemaOf(p).name,
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
  panel.append(el('div', { class: 'ref-groups', style: `--ref-cols:${Math.min((ref.groups || []).length || 1, ref.columns || 3)}` },
    ...(ref.groups || []).map((g) => el('section', { class: 'ref-group' },
      el('h4', { text: g.heading }),
      g.points?.length ? el('ul', { class: 'ref-points' }, ...g.points.map((t) => el('li', { text: t }))) : null,
      ...(g.images || []).map((im) => el('figure', { class: 'ref-figure' },
        el('img', { src: im.src, alt: im.caption || g.heading, loading: 'lazy', decoding: 'async', tabindex: '0', role: 'button',
          title: 'Enlarge', onclick: () => openLightbox(im, g.heading),
          onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(im, g.heading); } } }),
        el('figcaption', {},
          im.caption ? el('span', { class: 'ref-caption', text: im.caption }) : null,
          im.credit ? el('span', { class: 'ref-credit' },
            im.url ? el('a', { href: im.url, target: '_blank', rel: 'noopener', text: im.credit }) : document.createTextNode(im.credit),
            im.license ? document.createTextNode(` · ${im.license}`) : null) : null)))))));
  if (ref.note) panel.append(el('p', { class: 'ref-note', text: ref.note }));
  return panel;
}

// Full-size view of a reference image; Esc, the close button or a click outside the figure dismisses it.
function openLightbox(im, heading) {
  let dlg = document.getElementById('ref-lightbox');
  if (!dlg) {
    dlg = el('dialog', { id: 'ref-lightbox', class: 'ref-lightbox', 'aria-label': 'Reference image' });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    document.body.append(dlg);
  }
  dlg.replaceChildren(
    el('button', { type: 'button', class: 'ref-lightbox-close', 'aria-label': 'Close', text: '\u00d7', onclick: () => dlg.close() }),
    el('figure', {},
      el('img', { src: im.src, alt: im.caption || heading }),
      el('figcaption', {},
        el('span', { class: 'ref-lightbox-heading', text: heading }),
        im.caption ? el('span', { class: 'ref-caption', text: im.caption }) : null,
        im.credit ? el('span', { class: 'ref-credit' },
          im.url ? el('a', { href: im.url, target: '_blank', rel: 'noopener', text: im.credit }) : document.createTextNode(im.credit),
          im.license ? document.createTextNode(` \u00b7 ${im.license}`) : null) : null)));
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
}

// Consecutive fields sharing a `group` render inside one collapsible fieldset
// (e.g. "Macroscopy" on the benign resection templates). Ungrouped fields stay flat.
// With `pack`, each group's fields go into an auto-fitting grid instead of a single column,
// the summary carries a filled/total count, and a group that is finished collapses itself
// (only until the user touches it - an explicit toggle is remembered and wins).
function groupFields(fields, part, index, pack = false) {
  const out = [];
  let current = null;
  for (const f of fields) {
    const node = renderField(f, part, index);
    if (pack) {
      const count = f.type === 'select' || f.type === 'multiselect' ? optionsFor(f, part.values).length : 0;
      if (spanFull(f, count)) node.classList.add('span-full');
    }
    if (!f.group) { current = null; out.push(node); continue; }
    if (!current || current.name !== f.group) {
      const key = `signout.group.${f.group}`;
      const stored = localStorage.getItem(key);
      const members = fields.filter((x) => x.group === f.group);
      const progress = progressOf(members, part.values, isVisible);
      const summary = el('summary', { text: f.group });
      if (pack && progress.shown) {
        summary.append(el('span', { class: 'group-count', text: progress.complete ? `\u2713 ${progress.shown}` : `${progress.filled}/${progress.shown}` }));
      }
      const details = el('details', { class: `field-group${pack && progress.complete ? ' complete' : ''}`, 'data-group': f.group }, summary);
      details.open = stored ? stored !== 'closed' : !(pack && progress.complete);
      details.addEventListener('toggle', () => localStorage.setItem(key, details.open ? 'open' : 'closed'));
      const body = pack ? el('div', { class: 'field-grid' }) : details;
      if (pack) details.append(body);
      current = { name: f.group, node: body };
      out.push(details);
    }
    current.node.append(node);
  }
  return out;
}

// The group index above a packed form: one pill per group, showing how many of its visible fields are
// still empty. Clicking opens that group and scrolls to it, which beats scrolling a 75-field column.
function sectionRail(fields, part) {
  const names = [];
  for (const f of fields) if (f.group && !names.includes(f.group)) names.push(f.group);
  if (names.length < 2) return null;
  const rail = el('nav', { class: 'section-rail', 'aria-label': 'Form sections' });
  for (const name of names) {
    const progress = progressOf(fields.filter((f) => f.group === name), part.values, isVisible);
    rail.append(el('button', {
      type: 'button', class: progress.complete ? 'complete' : '', title: `Go to ${name}`,
      onclick: () => {
        const details = nodes.panel.querySelector(`.field-group[data-group="${CSS.escape(name)}"]`);
        if (!details) return;
        details.open = true;
        localStorage.setItem(`signout.group.${name}`, 'open');
        details.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, document.createTextNode(name),
      el('span', { class: 'n', text: progress.complete ? '\u2713' : `${progress.shown - progress.filled}` })));
  }
  return rail;
}

// Alt+Down / Alt+Up move to the next or previous field that still has no value, skipping hidden ones.
// Sign-out then runs as: answer, jump, answer - without reaching for the mouse to find the next gap.
function jumpToUnset(direction) {
  const part = state.caseState?.parts?.[state.activePart];
  if (!part) return false;
  const fields = [...nodes.panel.querySelectorAll('.field[data-field]'), ...nodes.macroPanel.querySelectorAll('.field[data-field]')]
    .filter((n) => !n.classList.contains('hidden'));
  const empty = fields.filter((n) => {
    const v = part.values[n.dataset.field];
    return Array.isArray(v) ? !v.length : v === undefined || v === null || v === '';
  });
  if (!empty.length) { toast('Every visible field has a value'); return true; }
  // Move relative to where the cursor is, whether or not that field is itself empty; wrap round the ends.
  const active = document.activeElement?.closest?.('.field[data-field]');
  const from = active ? fields.indexOf(active) : -1;
  const at = (n) => fields.indexOf(n);
  const next = direction > 0
    ? (empty.find((n) => at(n) > from) || empty[0])
    : ([...empty].reverse().find((n) => at(n) < from) || empty[empty.length - 1]);
  focusFieldNode(next);
  return true;
}

function focusFieldNode(node) {
  if (!node) return;
  node.closest('details')?.setAttribute('open', '');
  node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const target = node.querySelector('input, textarea, select, .chips');
  target?.focus?.();
  node.classList.add('flash');
  setTimeout(() => node.classList.remove('flash'), 900);
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
      el('span', { class: 'field-hint', text: ' (tick all that apply)' })),
      field.reference ? el('div', { class: 'field-control' }, group, referenceToggle(field, part)) : group);
    if (field.help) wrap.append(el('div', { class: 'field-help', text: field.help }));
    const refPanel = referencePanel(field, part);
    if (refPanel) wrap.append(refPanel);
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
    el('h3', { text: part.linked ? `Part ${part.label} (synoptic, linked to the frozen section)` : `Part ${part.label}` }),
    picker,
    el('div', { class: 'part-actions' },
      canUpgrade(i) ? el('button', { type: 'button', class: 'btn small', text: 'Upgrade this part', title: 'Switch this part to the synoptic template for the ticked neoplasm, carrying over what the benign form already answered', onclick: () => upgradeThisPart(i).catch((err) => { toast(err.message); render(); }) }) : null,
      canStage(i) ? el('button', { type: 'button', class: 'btn small', text: pairSeparate(part.values.scenario) ? 'Add breast synoptic' : 'Stage this part', title: pairSeparate(part.values.scenario) ? 'Add the breast carcinoma resection as the next part, with the sentinel node counts pre-filled' : 'Add the paired cancer synoptic under the same letter, pre-filled from the frozen section', onclick: () => stageThisPart(i).catch((err) => { toast(err.message); render(); }) }) : null,
      i > 0 && !part.linked ? el('button', { type: 'button', class: 'btn ghost small', text: 'Same as previous', onclick: () => copyFromPrevious(i) }) : null,
      el('button', { type: 'button', class: 'btn ghost small', text: 'Reset', onclick: () => resetPart(i) }),
      el('button', { type: 'button', class: 'btn ghost small danger', text: 'Remove', onclick: () => removePart(i) })
    ));
  // Three-column layout: schemas that declare `layout.macroGroups` render those groups (and `layout.macroFields`)
  // in the case column under the LIS boxes, so macroscopy sits beside the report while histology fills the middle.
  const split = splitFields(s, part);
  // Packed forms are opt-in per template (`layout.pack`) and only once there is room for two cells;
  // below that the single-column layout is still the right one. docs/specs/layout-3col.md
  const pack = !!s.layout?.pack && packLayout.matches;
  nodes.panel.classList.toggle('pack', pack);
  nodes.macroPanel.classList.toggle('pack', pack);
  if (split) {
    nodes.macroPanel.hidden = false;
    nodes.macroPanel.replaceChildren(
      el('div', { class: 'part-head' }, el('h3', { text: `Part ${part.label} \u00b7 specimen and macroscopy` })),
      ...groupFields(split.macro, part, i, pack));
    nodes.panel.replaceChildren(head, ...[pack ? sectionRail(split.histo, part) : null].filter(Boolean), ...groupFields(split.histo, part, i, pack));
  } else {
    nodes.macroPanel.hidden = true;
    nodes.macroPanel.replaceChildren();
    nodes.panel.replaceChildren(head, ...[pack ? sectionRail(s.fields, part) : null].filter(Boolean), ...groupFields(s.fields, part, i, pack));
  }
}

// The sticky report sits under the (two-row, wrapping) header: publish its live height as --topbar-h.
const topbar = document.querySelector('header');
if (topbar) {
  const setTopbarH = () => document.documentElement.style.setProperty('--topbar-h', `${topbar.offsetHeight}px`);
  setTopbarH();
  if (typeof ResizeObserver === 'function') new ResizeObserver(setTopbarH).observe(topbar);
}

const wideLayout = window.matchMedia('(min-width: 1400px)');
wideLayout.addEventListener('change', () => { if (state.caseState) render(); });
// Two 320px cells plus the gap need roughly a 700px column, which the histology column reaches at
// about 1500px of viewport in three-column mode.
const packLayout = window.matchMedia('(min-width: 1500px)');
packLayout.addEventListener('change', () => { if (state.caseState) render(); });

function splitFields(s) {
  const lay = s.layout;
  if (!lay || !wideLayout.matches) return null;
  const groups = new Set(lay.macroGroups || []);
  const ids = new Set(lay.macroFields || []);
  const macro = s.fields.filter((f) => groups.has(f.group) || ids.has(f.id));
  if (!macro.length) return null;
  return { macro, histo: s.fields.filter((f) => !macro.includes(f)) };
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
  const tagFor = (key) => ({ lis: 'from LIS', merged: '+ typed text', edited: 'edited' }[out.source?.[key]] || '');
  const blocks = [
    ['specimens', 'Specimens', out.specimens],
    ['macro', 'Macroscopic description', out.macro],
    ['blockKey', 'Block key', out.blockKey],
    ['intraop', 'Intraoperative consultation', out.intraop],
    ['microscopy', out.microscopyHeading ? out.microscopyHeading.charAt(0) + out.microscopyHeading.slice(1).toLowerCase() : 'Microscopic examination', out.microscopy],
    ['diagnosis', 'Diagnosis', out.diagnosis],
    ['comment', 'Comment', out.comment]
  ].filter(([key, , text]) => text || out.edited?.[key] || ['specimens', 'microscopy', 'diagnosis'].includes(key));
  const issues = out.issues || [];
  // Checks collapse to their one-line count so the report starts at the top of the column; an issue that
  // names a field is clickable and focuses it. The open state is remembered between cases.
  const checksBox = issues.length ? el('details', { class: `checks ${issues.some((i) => i.level === 'error') ? 'has-error' : issues.some((i) => i.level === 'warn') ? 'has-warn' : 'info-only'}` },
    el('summary', {},
      el('div', { class: 'checks-head' }, el('h3', { text: 'Checks' }), el('span', { class: 'muted', text: [`${issues.filter((i) => i.level === 'error').length} to fix`, `${issues.filter((i) => i.level === 'warn').length} to review`, issues.some((i) => i.level === 'info') ? `${issues.filter((i) => i.level === 'info').length} for reference` : ''].filter(Boolean).join(' \u00b7 ') }))),
    el('ul', {}, ...issues.map((i) => el('li', {
      class: `issue ${i.level}${i.field ? ' jump' : ''}`,
      title: i.field ? 'Go to the field this refers to' : undefined,
      onclick: i.field ? () => focusFieldNode(nodes.panel.querySelector(`.field[data-field="${CSS.escape(i.field)}"]`) || nodes.macroPanel.querySelector(`.field[data-field="${CSS.escape(i.field)}"]`)) : undefined,
      text: `${state.caseState.parts.length > 1 ? `(${i.part}) ` : ''}${i.message}`
    })))) : null;
  if (checksBox) {
    checksBox.open = localStorage.getItem('signout.checks') !== 'closed';
    checksBox.addEventListener('toggle', () => localStorage.setItem('signout.checks', checksBox.open ? 'open' : 'closed'));
  }
  const checks = checksBox ? [checksBox] : [];
  nodes.blocks.replaceChildren(...checks, ...blocks.map(([key, name, text]) => renderBlock(key, name, text, tagFor(key), out)));
  const edits = Object.keys(state.caseState.edits || {}).length;
  nodes.revertAll.hidden = edits === 0;
  nodes.revertAll.textContent = `Revert ${edits === 1 ? 'edit' : `${edits} edits`}`;
  renderLisStatus(out);
}

/** One report block: heading with tags, Copy and Edit / Revert; the text or, while editing, a textarea. */
function renderBlock(key, name, text, tag, out) {
  const h3 = el('h3', { text: name });
  if (tag) h3.append(' ', el('span', { class: `tag ${tag === 'edited' ? 'tag-edited' : ''}`, text: tag }));
  const head = el('div', { class: 'block-head' }, h3);
  const body = el('div', { class: 'block-body' });
  const editing = state.editing === key;
  if (editing) {
    const ta = el('textarea', { class: 'input block-editor', 'aria-label': `Edit ${name.toLowerCase()}` });
    ta.value = text;
    const fit = () => { ta.style.height = 'auto'; ta.style.height = `${Math.max(72, ta.scrollHeight + 4)}px`; };
    ta.addEventListener('input', fit);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelEdit(); }
      else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); commitEdit(key, ta.value); }
    });
    body.append(ta, el('div', { class: 'block-editor-bar' },
      el('span', { class: 'muted', text: 'Edited text prints verbatim and no longer follows the fields. Cmd/Ctrl+Enter to finish, Esc to cancel.' }),
      el('button', { type: 'button', class: 'btn ghost small', text: 'Cancel', onclick: cancelEdit }),
      el('button', { type: 'button', class: 'btn primary small', text: 'Done', onclick: () => commitEdit(key, ta.value) })));
    queueMicrotask(() => { fit(); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); });
    head.append(el('span', { class: 'block-actions' }));
  } else {
    const pre = el('pre', {});
    pre.append(highlightParts(text));
    body.append(pre);
    const actions = el('span', { class: 'block-actions' });
    if (out.edited?.[key]) actions.append(el('button', { type: 'button', class: 'btn ghost small', text: 'Revert', title: 'Discard this edit and go back to the text generated from the fields', onclick: () => revertEdit(key) }));
    if (out.edited?.[key]) h3.title = 'Edited by hand — this block no longer follows the fields. Revert to regenerate it.';
    actions.append(
      el('button', { type: 'button', class: 'btn ghost small', text: 'Edit', onclick: () => startEdit(key) }),
      el('button', { type: 'button', class: 'btn ghost small', text: 'Copy', onclick: () => doCopy(text, name) }));
    head.append(actions);
  }
  return el('div', { class: `block ${editing ? 'editing' : ''} ${out.edited?.[key] ? 'edited' : ''}` }, head, body);
}

// ---------- manual edits to the final report ----------
function startEdit(key) { state.editing = key; renderReport(); }
function cancelEdit() { state.editing = null; renderReport(); }

/** Store the edited block; identical to the generated text means no edit. */
function commitEdit(key, value) {
  state.editing = null;
  const generated = (state.lastOut?.generated?.[key] || '').trim();
  const text = (value || '').replace(/\s+$/, '');
  if (text.trim() === generated) delete state.caseState.edits?.[key];
  else { state.caseState.edits = state.caseState.edits || {}; state.caseState.edits[key] = text; }
  markDirty(); renderReport(); cacheCase(state.caseState);
}

function revertEdit(key) {
  if (state.caseState.edits) delete state.caseState.edits[key];
  state.editing = null;
  markDirty(); renderReport(); cacheCase(state.caseState);
  toast('Reverted to the generated text');
}

function revertAllEdits() {
  const n = Object.keys(state.caseState.edits || {}).length;
  if (!n) return;
  if (!window.confirm(`Discard ${n === 1 ? 'the manual edit' : `all ${n} manual edits`} and return to the generated text?`)) return;
  state.caseState.edits = {};
  state.editing = null;
  markDirty(); renderReport(); cacheCase(state.caseState);
  toast('All edits reverted');
}

// ---------- LIS macro / block key override ----------
const LIS_KEYS = { macro: { toggle: 'useLisMacro', label: 'macro' }, blockKey: { toggle: 'useLisBlockKey', label: 'block key' } };

/** Explain, under each pasted-text box, which text is printing in the report. */
function renderLisStatus(out) {
  const meta = state.caseState.meta;
  for (const [key, { toggle, label }] of Object.entries(LIS_KEYS)) {
    const ui = nodes.lis[key];
    if (!ui.toggle) continue;
    if (ui.toggle.checked !== !!meta[toggle]) ui.toggle.checked = !!meta[toggle];
    const generated = generatedBlock(key);
    ui.generated.disabled = !generated;
    ui.clear.disabled = !(meta[key] || '').trim() && !meta[toggle];
    const src = out?.source?.[key];
    ui.status.textContent = {
      lis: `Pasted text prints instead of the generated ${label}.`,
      merged: `Generated ${label} prints, then the pasted text. Tick the box to replace it.`,
      typed: `No generated ${label} for this template; the pasted text prints.`,
      generated: meta[toggle] ? `Nothing pasted yet — the generated ${label} prints until you paste or Use generated.` : `Generated ${label} prints.`,
      none: ''
    }[src] || '';
    if (key === 'macro' && (meta.macro || '').trim() && state.macroFilled) ui.status.textContent += ` ${state.macroFilled} macro field${state.macroFilled === 1 ? '' : 's'} filled from the paste.`;
  }
}

/** The engine's own macro / block key for the current case, ignoring any pasted text. */
function generatedBlock(key) {
  try {
    const cs = { ...state.caseState, meta: { ...state.caseState.meta, [key]: '', [LIS_KEYS[key].toggle]: false } };
    return (generateCase(state.templates, cs)[key] || '').trim();
  } catch { return ''; }
}

function initLis() {
  for (const [key, { toggle, label }] of Object.entries(LIS_KEYS)) {
    const ui = nodes.lis[key];
    if (!ui.toggle) continue;
    ui.toggle.addEventListener('change', (e) => {
      markDirty(); state.caseState.meta[toggle] = e.target.checked; renderReport(); cacheCase(state.caseState);
    });
    ui.generated.addEventListener('click', () => {
      const text = generatedBlock(key);
      if (!text) return toast(`No generated ${label} for this case`);
      const current = (state.caseState.meta[key] || '').trim();
      if (current && current !== text && !window.confirm(`Replace the pasted ${label} with the generated text?`)) return;
      markDirty();
      state.caseState.meta[key] = text;
      state.caseState.meta[toggle] = true;
      nodes.meta[key].value = text;
      renderReport(); cacheCase(state.caseState);
      nodes.meta[key].focus();
      toast(`Generated ${label} copied — edit it freely; it no longer follows the fields`);
    });
    ui.clear.addEventListener('click', () => {
      markDirty();
      state.caseState.meta[key] = '';
      state.caseState.meta[toggle] = false;
      nodes.meta[key].value = '';
      if (key === 'macro') { applyMacro(); render(); } else renderReport();
      cacheCase(state.caseState);
    });
  }
}

async function doCopy(text, label) {
  const ok = await copyText(text);
  toast(ok ? `${label} copied` : 'Copy failed');
}


// ---------- specimen intake (LIS paste -> parts) ----------
// The Specimen box is parsed on every keystroke; the strip below it shows one row per lettered
// part with the suggested template (dropdown: candidates first, then every template). "Build parts"
// replaces the case's parts, pre-fills what the LIS line tells us and derives the case title.
const intake = { key: '', raw: '', rows: [], picks: {}, userPicks: new Set(), built: false };   // picks: label -> template id in the strip; userPicks: labels the user changed; built: collapsed after Build

function intakeNodes() { return { box: nodes.meta.specimen, strip: $('#intake-preview') }; }

function renderIntake() {
  const { strip } = intakeNodes();
  if (!strip) return;
  const meta = state.caseState?.meta || {};
  const raw = meta.specimen || '';
  if (!raw.trim()) { strip.hidden = true; strip.replaceChildren(); intake.key = ''; intake.raw = ''; intake.rows = []; intake.picks = {}; intake.userPicks = new Set(); intake.built = false; return; }
  const key = `${raw}\u0000${meta.clinical || ''}`;
  if (key !== intake.key) {
    const parsed = parseIntake(raw);
    const history = [parsed.history, meta.clinical || ''].filter(Boolean).join('\n');
    intake.parsed = parsed;
    intake.rows = matchParts(parsed, history, state.manifest);
    if (raw !== intake.raw) { intake.userPicks = new Set(); intake.built = false; }   // a new list: forget manual picks and re-expand
    intake.picks = Object.fromEntries(intake.rows.map((r) => [r.label, intake.userPicks.has(r.label) && entryOf(intake.picks[r.label]) ? intake.picks[r.label] : r.templateId]));
    intake.key = key;
    intake.raw = raw;
  }
  const { rows, parsed } = intake;
  if (intake.built) {
    strip.replaceChildren(el('div', { class: 'intake-foot built' },
      el('span', { class: 'muted', text: `${rows.length} part${rows.length === 1 ? '' : 's'} built from the specimen list` }),
      el('button', { type: 'button', class: 'btn ghost small', text: 'Show list', onclick: () => { intake.built = false; renderIntake(); } })));
    strip.hidden = false;
    return;
  }
  const TIER = { confident: ['✓', 'Confident match'], choose: ['?', 'Close call — check the template'], none: ['—', 'No matching template: generic free-text form'] };
  const allOpts = state.manifest.filter((t) => t.id !== GENERIC_ID).slice().sort((a, b) => a.name.localeCompare(b.name));
  const table = el('table', {}, ...rows.map((r) => {
    const cands = r.candidates.filter((c) => c.score >= 0).map((c) => entryOf(c.id)).filter(Boolean);
    const rest = allOpts.filter((t) => !cands.some((c) => c.id === t.id));
    const sel = el('select', { class: 'input', 'aria-label': `Template for part ${r.label}`, onchange: (e) => { intake.picks[r.label] = e.target.value; intake.userPicks.add(r.label); renderIntake(); } },
      el('option', { value: GENERIC_ID, text: 'Generic (free text)' }),
      ...(cands.length ? [el('optgroup', { label: 'Suggested' }, ...cands.map((t) => el('option', { value: t.id, text: t.name })))] : []),
      el('optgroup', { label: 'All templates' }, ...rest.map((t) => el('option', { value: t.id, text: t.name })))
    );
    sel.value = intake.picks[r.label] || GENERIC_ID;
    const [mark, tip] = TIER[r.tier] || TIER.none;
    return el('tr', {},
      el('td', { class: 'letter', text: `(${r.label})` }),
      el('td', { class: 'text', text: r.text, title: r.raw }),
      el('td', { class: 'pick' }, sel),
      el('td', { class: `tier tier-${r.tier}`, text: mark, title: tip }));
  }));
  const hasParts = rows.length > 0;
  const replacing = partsTouched();
  const build = el('button', { type: 'button', class: 'btn primary small', id: 'btn-build-parts', text: replacing ? 'Replace parts' : 'Build parts', disabled: !hasParts, onclick: () => buildPartsFromIntake().catch((e) => toast(e.message)) });
  const summary = hasParts ? `${rows.length} part${rows.length === 1 ? '' : 's'} · ${rows.filter((r) => r.tier === 'confident').length} confident · ${rows.filter((r) => intake.picks[r.label] === GENERIC_ID).length} generic` : '';
  const warns = [...(parsed?.warnings || [])];
  const foot = el('div', { class: 'intake-foot' }, build, el('span', { class: 'muted', text: summary }),
    ...warns.map((w) => el('span', { class: 'intake-warn', text: w })));
  strip.replaceChildren(...(hasParts ? [table] : []), foot);
  strip.hidden = false;
}

/** True when the case already has more than one part, or a part whose values differ from the template defaults. */
function partsTouched() {
  const cs = state.caseState;
  if (!cs?.parts?.length) return false;
  if (cs.parts.length > 1) return true;
  return cs.parts.some((p) => state.templates[templateIdOf(cs, p)] && JSON.stringify(p.values) !== JSON.stringify(createPart(schemaOf(p), 0).values));
}

async function buildPartsFromIntake() {
  const { rows, parsed } = intake;
  if (!rows.length) return;
  const cs = state.caseState;
  if (partsTouched() && !confirm(`Replace the current ${cs.parts.length} part${cs.parts.length === 1 ? '' : 's'} with ${rows.length} from the specimen list?`)) return;
  const ids = rows.map((r) => intake.picks[r.label] || GENERIC_ID);
  await ensureTemplates(ids);
  const counts = {};
  const parts = rows.map((r, i) => {
    const id = ids[i];
    const { schema: s } = state.templates[id];
    const own = counts[id] || 0; counts[id] = own + 1;
    const part = { ...createPart(s, own), label: r.label, templateId: id, lis: r.raw };
    const match = id === r.templateId ? r : { ...r, templateId: id, role: null };
    Object.assign(part.values, presetValues(s, r, match));
    normalisePart(s, part);
    return part;
  });
  cs.parts = parts;
  cs.caseTitle = deriveTitle(parsed.parts);
  applyMacro();
  for (const id of new Set(ids)) noteUsed(id);
  if (!(cs.meta.clinical || '').trim() && parsed.history) {
    cs.meta.clinical = parsed.history;
    const details = $('#meta-details'); if (details) details.open = true;
  }
  intake.built = true;
  markDirty();
  syncPrimary();
  state.activePart = 0;
  render();
  toast(`${parts.length} part${parts.length === 1 ? '' : 's'} built from the specimen list`);
}

function initIntake() {
  renderIntake();
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
  const warnings = phiWarnings({ Specimen: meta.specimen, 'Clinical history': meta.clinical, Macroscopic: meta.macro, 'Block key': meta.blockKey, Report: state.lastOut?.report });
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
  $('#cfg-density').value = document.documentElement.dataset.density || 'comfortable';
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
      if (k === 'macro') { applyMacro(); render(); }
      else if (k === 'blockKey') renderReport();
      if (k === 'specimen' || k === 'clinical') renderIntake();
    });
  }
  initLis();
  initIntake();
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
    setDensity($('#cfg-density').value);
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
    else if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); jumpToUnset(1); }
    else if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); jumpToUnset(-1); }
  });
}

// ---------- boot ----------
async function boot() {
  initTheme();
  initDensity();
  const back = consumeRedirect(); // did Google just send us back here?
  state.manifest = await loadManifest();
  state.planned = await loadPlanned();
  loadPicker();
  const saved = loadCase();
  initDrive();
  initPalette();
  const defaultId = biopsyRow(state.manifest)[0]?.id || state.manifest[0].id; // most-used small biopsy
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
  nodes.revertAll.addEventListener('click', revertAllEdits);
  initKeys();
}

boot().catch((err) => {
  nodes.blocks.replaceChildren(el('div', { class: 'block' }, el('pre', { text: `Failed to start: ${err.message}` })));
});
