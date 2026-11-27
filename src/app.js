// Sign-out UI: renders any schema in the registry, keeps case state, previews the report live.

import { loadManifest, loadPlanned, loadTemplate } from './registry.js';
import { startOffline, offlineRunning, releaseReady, handOver } from './offline.js';
import { rowGroups, standalonePlanned, biopsyRow, groupBySystem, selectorGroups, rankTemplates, labelOf, isBiopsy, pushRecent, togglePin, rowOfKind, KIND_LABEL } from './picker.js';
import {
  createCase, createPart, relabel, isVisible, optionsFor, normalisePart, generateCase, caseOptions, templateIdOf, templatesInUse, snippetsFor, toggleOption, applyPreset,
  applyLinkedDefaults, applyDerived
} from './engine.js';
import { loadDraft, setDraftOwner, saveCase as cacheCase, clearCase, copyText } from './store.js';
import { loadConfig, saveConfig, accountConfig, rememberForAccount } from './config.js';
import { getToken, fetchUserInfo, isSignedIn, currentUser, signOut, consumeRedirect, setActiveAction, renewalDue, renewSignIn } from './gauth.js';
import { gateEnabled, gateState, parseAllowList, formatAllowList, BUILT_IN_ALLOWED, emailDigest, canonicalEmail } from './gate.js';
import { saveCase as driveSave, listCases, openCase as driveOpen, setCaseStatus } from './drive.js';
import { normaliseAccession, phiWarnings, STATUSES, statusOf } from './docformat.js';
import { buildPayload, payloadKeys, payloadLabel, parseHarvest, nextCaptureTarget } from './lisbridge.js';
import { parseIntake, matchParts, presetValues, deriveTitle, MAX_PARTS, GENERIC_ID } from './intake.js';
import { applyMacroToCase } from './macroparse.js';
import { britishise } from './style.js';
import { spanFull, groupProgress as progressOf } from './formlayout.js';
import { calculatorView, MIN_NUCLEI } from '../generators/dish_calculator.js';
import { organIcon, mountOrganSprite } from './organicons.js';
import { openRoadmap, openSuggest } from './panels.js';
import { choiceSummary } from './suggest.js';
import {
  SECTIONS as PROOF_SECTIONS, reportSections, ruleChecks, buildPrompt, parseReply, vetReply, newRecord, openItems, recordSummary, changedSince, applyEdit,
  fingerprint, sectionOf, KIND_LABEL as PROOF_KIND, MODEL_NAME, formTerms, factChange, rewriteChanges, checkTicked, tickedText
} from './proofread.js';
import { writeBack, carryPatches, carryText, blockText, showValue, patchFor } from './writeback.js';
import { loadSettings as loadProofSettings, saveSettings as saveProofSettings, status as hanSlideStatus, proofread as hanSlideProofread, describeStatus, normaliseCode } from './hanslide.js';
import { loadVertexSettings, saveVertexSettings, vertexStatus, vertexProofread, vertexExtract, vertexAudit, describeVertexStatus, VERTEX_PROOFREAD_SYSTEM_PROMPT } from './vertexai.js';
import { isAuditEligible, AUDIT_RESPONSE_SCHEMA, buildAuditPrompt, parseAuditReply, vetAuditFindings, applyAuditFieldPatch } from './aiaudit.js';
import { EXTRACT_RESPONSE_SCHEMA, buildExtractPrompt, parseExtractReply, vetExtractedFields, applyExtractedFields, CASE_EXTRACT_RESPONSE_SCHEMA, buildCaseExtractPrompt, parseCaseExtractReply, vetCaseExtractedFields, applyCaseExtractedFields, INTAKE_RESPONSE_SCHEMA, buildIntakePrompt, parseIntakeReply, vetIntakeParts } from './aiextract.js';

// The CNS-only code (guided intake, pathway drawer and family plates, about 180 kB) loads the
// first time a CNS form opens rather than at start-up (docs/specs/speed.md, Phase 79). ensureTemplate
// waits for it whenever a template asks the CNS questions, so a CNS part never renders without it;
// until then the three support checks answer no, which is the right answer for every other form.
let cns = null;
const CNS_FIELDS = new Set(['idhBranch', 'molStatus', 'dxFamily']);
const needsCns = (s) => (s?.fields || []).some((f) => CNS_FIELDS.has(f.id));
async function loadCns() {
  if (!cns) {
    const [wizard, pathways, plates] = await Promise.all([import('./cnswizard.js'), import('./cnspathway.js'), import('./cnsplates.js')]);
    cns = { ...wizard, ...pathways, ...plates };
  }
  return cns;
}
const wizardSupported = (s) => !!cns && cns.wizardSupported(s);
const pathwaySupported = (s) => !!cns && cns.pathwaySupported(s);
const plateSupported = (values) => !!cns && cns.plateSupported(values);
const wizardSteps = (...a) => cns.wizardSteps(...a);
const wizardProgress = (...a) => cns.wizardProgress(...a);
const visibleSteps = (...a) => cns.visibleSteps(...a);
const stepAnswered = (...a) => cns.stepAnswered(...a);
const atDefault = (...a) => cns.atDefault(...a);
const cautions = (...a) => cns.cautions(...a);
const pathway = (...a) => cns.pathway(...a);
const pathwayChart = (...a) => cns.pathwayChart(...a);
const plateFor = (...a) => cns.plateFor(...a);
const plateSelection = (...a) => cns.plateSelection(...a);
const plateChart = (...a) => cns.plateChart(...a);
const plateEntries = (...a) => cns.plateEntries(...a);

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
  lastOutCase: null,      // the case lastOut was generated for (proofreading changes follow its form changes)
  config: loadConfig(),
  dirty: false,           // edited since last Drive save
  saving: false,
  navMode: 'top',         // which side of the header mode switch is showing ('top' = biopsy)
  navModeFor: null,       // the template the mode was chosen against; a new template re-follows its own kind
  cases: [],              // last fetched Sheet rows for the Open dialog
  // Proofreading in progress (docs/specs/proofreading.md): `ticks` are the changes of each rewrite
  // ticked to accept (by suggestion key), `note` what the last accept put into the form.
  proof: { busy: false, error: '', caseState: null, startedAt: 0, copyAnyway: '', ticks: new Map(), note: null },
  audit: { busy: false, error: '', caseState: null, startedAt: 0, result: null, dismissed: new Set(), undo: null, note: '' }
};

const META_FIELDS = ['accession', 'status', 'specimen', 'clinical', 'macro', 'blockKey'];
function ensureMeta(caseState) {
  caseState.meta = { accession: '', status: 'draft', specimen: '', clinical: '', macro: '', blockKey: '', useLisMacro: false, useLisBlockKey: false, ...(caseState.meta || {}) };
  caseState.drive = caseState.drive || null;
  return caseState;
}

const nodes = {
  header: document.querySelector('header.topbar'),
  systemRow: $('#system-row'),
  modeTop: $('#mode-top'),
  modeBottom: $('#mode-bottom'),
  caseId: $('#case-id'),
  caseMenuBtn: $('#btn-case-menu'),
  caseMenuList: $('#case-menu-list'),
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
  saveNew: $('#btn-save-new'),
  google: $('#btn-google'),
  settings: $('#btn-settings'),
  roadmap: $('#btn-roadmap'),
  suggest: $('#btn-suggest'),
  dlgOpen: $('#dlg-open'),
  openSearch: $('#open-search'),
  openList: $('#open-list'),
  openNote: $('#open-note'),
  dlgSettings: $('#dlg-settings'),
  dlgPathway: $('#dlg-pathway'),
  dlgPlate: $('#dlg-plate'),
  settingsForm: $('#settings-form'),
  signout: $('#btn-signout'),
  meta: Object.fromEntries(META_FIELDS.map((k) => [k, $(`#meta-${k}`)])),
  copyLis: $('#btn-copy-lis'),
  lisCapture: $('#btn-lis-capture'),
  lisCaptureStatus: $('#lis-status-capture'),
  lisHint: $('#lis-hint'),
  lis: {
    macro: { toggle: $('#meta-useLisMacro'), ai: $('#btn-macro-ai'), aiUndo: $('#btn-macro-ai-undo'), generated: $('#btn-macro-generated'), clear: $('#btn-macro-clear'), status: $('#lis-status-macro') },
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

const phoneLayout = window.matchMedia('(max-width: 700px)');

/**
 * Suggest a change (docs/specs/suggestions-and-roadmap.md). From a part's actions the dialog opens on
 * that part's template; from the header it opens on the whole app, with the active part's template
 * one pick away. Either way it can attach that part's choice fields, never its free text.
 */
function suggest(i, fromPart) {
  const part = state.caseState.parts[i];
  const s = part ? schemaOf(part) : null;
  const current = s ? { id: s.id, name: s.name, version: s.version || '', choices: choiceSummary(s, part.values, i) } : null;
  openSuggest({
    groups: selectorGroups(state.manifest),
    current,
    initial: fromPart && current ? current.id : '',
    email: currentUser() || '',
    layout: phoneLayout.matches ? 'phone' : 'desktop',
    toast
  });
}
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
  state.proof.copyAnyway = '';
  syncPrimary();
  state.dirty = false;
  state.activePart = Math.min(activePart, caseState.parts.length - 1);
  render();
}

/** Manifest entry for a template id. */
function entryOf(id) { return state.manifest.find((t) => t.id === id); }

function iconForPart(part) {
  const id = templateIdOf(state.caseState, part);
  const entry = entryOf(id) || { name: state.templates[id]?.schema?.name || '' };
  return organIcon(entry, { label: entry.organ || entry.name || '' });
}

/** Load a template's schema + generator on first use (cached by the registry). */
async function ensureTemplate(id) {
  if (state.templates[id]) return state.templates[id];
  if (!entryOf(id)) throw new Error(`Template ${id} is not installed`);
  const t = await loadTemplate(id);
  if (needsCns(t.schema)) await loadCns();
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

/**
 * Change one part's template; its values are reset to that template's defaults, then pre-filled from
 * the part's specimen line when it has one (carriedRow), as Build parts fills them.
 */
async function setPartTemplate(i, id) {
  const parts = state.caseState.parts;
  if (templateIdOf(state.caseState, parts[i]) === id) return;
  const { schema: s } = await ensureTemplate(id);
  noteUsed(id);
  markDirty();
  const own = parts.filter((p, j) => j < i && templateIdOf(state.caseState, p) === id).length; // position within that template
  const keepLink = !!parts[i].linked && (Object.values(pairedTemplates()).includes(id) || (i > 0 && (hostGen(parts[i - 1])?.PAIR_TARGETS || []).includes(id)));
  const row = carriedRow(parts[i]);
  parts[i] = { ...createPart(s, own), label: parts[i].label, templateId: id, ...(keepLink ? { linked: true } : {}), ...(parts[i].lis ? { lis: parts[i].lis } : {}) };
  if (row) prefillFromLine(s, parts[i], row, own);
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
/**
 * The loaded generator of a part that hosts a linked synoptic of its own (Phase 82: a liver explant hosts the
 * HCC synoptic), else null. Such a generator exports `pairedTemplate(part)`, `PAIR_TARGETS`, `PAIR_BUTTON` and
 * `prefillPaired(values)`; the frozen section keeps its own pairing below.
 */
function hostGen(part) {
  const g = part ? state.templates[templateIdOf(state.caseState, part)]?.generator : null;
  return g && typeof g.pairedTemplate === 'function' ? g : null;
}
/** What a linked part is linked to, for the tab, the part header and the toast. */
function hostNoun(host) { return host && hostGen(host) ? `the ${schemaOf(host).specimenNoun || schemaOf(host).name}` : 'the frozen section'; }
/** Paired synoptic id for one frozen part: the generator's `pairTemplate` when it has one (the
 *  pancreatobiliary margin picks pancreas or ampulla from the origin), else the static map. A host
 *  part (hostGen) names its own. */
function pairIdFor(part) {
  const h = hostGen(part);
  if (h) return h.pairedTemplate(part) || '';
  const g = state.templates.frozen_section?.generator;
  if (typeof g?.pairTemplate === 'function') return g.pairTemplate(part.values) || '';
  return pairedTemplates()[part.values.scenario] || '';
}
/** True when the paired synoptic is a separate specimen with its own letter (breast SLN -> breast resection). */
function pairSeparate(scenario) { return !!(state.templates.frozen_section?.generator?.PAIR_SEPARATE || {})[scenario]; }

/** True when part i is a frozen part whose paraffin result is malignant and has a paired synoptic template. */
function canStage(i) {
  const parts = state.caseState.parts;
  const part = parts[i];
  if (part && hostGen(part)) return !part.linked && !!pairIdFor(part) && !parts[i + 1]?.linked;
  if (!part || templateIdOf(state.caseState, part) !== 'frozen_section') return false;
  const g = state.templates.frozen_section?.generator;
  if (!g || typeof g.stageable !== 'function' || !g.stageable(part)) return false;
  if (pairSeparate(part.values.scenario)) return !parts.some((p) => templateIdOf(state.caseState, p) === pairIdFor(part));
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
  const pairId = pairIdFor(part);
  if (!pairId) return toast('No synoptic template is paired with this frozen scenario');
  const separate = pairSeparate(part.values.scenario);
  if (separate) {
    const j = parts.findIndex((p) => templateIdOf(state.caseState, p) === pairId);
    if (j >= 0) { state.activePart = j; render(); return toast(`Part ${parts[j].label} is already the linked synoptic`); }
  } else if (parts[i + 1]?.linked) { state.activePart = i + 1; render(); return toast(`Part ${part.label} already has its synoptic`); }
  if (parts.length >= maxPartsForCase()) return toast(`Maximum ${maxPartsForCase()} parts`);
  const { schema: s, generator: g } = await ensureTemplate(pairId);
  noteUsed(pairId);
  markDirty();
  const own = parts.filter((p, j) => j <= i && templateIdOf(state.caseState, p) === pairId).length;
  const np = { ...createPart(s, own), templateId: pairId, ...(separate ? {} : { linked: true }) };
  const host = hostGen(part);
  if (host) Object.assign(np.values, (typeof host.prefillPaired === 'function' && host.prefillPaired(part.values)) || {});
  else if (typeof g.prefillFromFrozen === 'function') Object.assign(np.values, g.prefillFromFrozen(part.values) || {});
  if (separate) parts.push(np); else parts.splice(i + 1, 0, np);
  relabel(parts);
  syncPrimary();
  applyMacro();
  state.activePart = separate ? parts.length - 1 : i + 1;
  render();
  toast(separate ? `Part ${np.label}: ${s.name} added from part ${part.label}` : `Part ${np.label}: ${s.name} linked to ${hostNoun(part)}`);
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
  const { schema: s } = await ensureTemplate(up.to).catch((err) => { toast(err.message); return null; });
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
  const before = part.values[fieldId];
  part.values[fieldId] = value;
  applyLinkedDefaults(schema(), part, fieldId, before);
  applyDerived(templateOf(part).generator, part, fieldId);
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
    }, organIcon(t), el('span', { class: 'mi-text' }, el('span', { class: 'mi-name', text: t.name }), el('span', { class: 'mi-sub', text: 'pending build' })));
  }
  return el('button', {
    type: 'button', role: 'menuitem', class: 'menu-item', 'aria-current': String(t.id === current), 'data-template': t.id,
    title: state.dirty || state.caseState.meta?.accession ? `Use ${t.name} for part ${activePart().label}` : `New ${t.name} case`,
    onclick: () => { sysmenu.open = null; switchTemplate(t.id).catch((e) => toast(e.message)); }
  }, organIcon(t), el('span', { class: 'mi-text' }, el('span', { class: 'mi-name', text: t.name }), el('span', { class: 'mi-sub', text: KIND_LABEL[t.kind] || t.kind })));
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

/** The mode switch follows the open template, until the user picks the other side for that template. */
function syncNavMode(current) {
  if (state.navModeFor === current) return;
  state.navMode = rowOfKind(entryOf(current)?.kind) || state.navMode;
  state.navModeFor = current;
}

function renderNav() {
  const current = schema().id;
  syncNavMode(current);
  const row = state.navMode;
  nodes.modeTop.setAttribute('aria-pressed', String(row === 'top'));
  nodes.modeBottom.setAttribute('aria-pressed', String(row === 'bottom'));
  const groups = rowGroups(state.manifest, state.planned, row, { pins: state.pins });
  const children = groups.map((g) => systemButton(row, g, current));
  // standalone placeholders (Autopsy) ride with the biopsy side; a dot marks them as pending
  if (row === 'top') {
    for (const t of standalonePlanned(state.planned)) {
      children.push(el('button', {
        type: 'button', class: 'pending', 'data-planned': t.id, title: `${t.name} — not built yet (roadmap: ${t.roadmap || 'Later'}). Opens Generic free text.`,
        onclick: () => openPlaceholder(t).catch((e) => toast(e.message))
      }, el('span', { class: 'pending-dot', 'aria-hidden': 'true' }), el('span', { text: t.label || t.name })));
    }
  }
  nodes.systemRow.replaceChildren(...children);
}

function initModeSwitch() {
  for (const [row, btn] of [['top', nodes.modeTop], ['bottom', nodes.modeBottom]]) {
    btn.addEventListener('click', () => {
      closeSysmenu();
      state.navMode = row;
      state.navModeFor = schema().id;
      renderNav();
    });
  }
}

const STATUS_LABEL = { draft: 'Draft', ready: 'Ready', signed: 'Signed' };

/** Accession, status and Drive state, kept in the bar because the case panel scrolls away. */
function renderCaseId() {
  const meta = state.caseState?.meta || {};
  const acc = meta.accession?.trim();
  const status = STATUS_LABEL[meta.status] || 'Draft';
  const d = state.caseState?.drive;
  let saveText = 'Unsaved';
  let saveClass = 'unsaved';
  if (state.saving) { saveText = 'Saving…'; saveClass = 'saving'; }
  else if (d?.savedAt && !state.dirty) { saveText = `Saved ${relTime(d.savedAt)}`; saveClass = 'saved'; }
  else if (d?.savedAt) { saveText = `Edited ${relTime(d.savedAt)}`; saveClass = 'unsaved'; }
  nodes.caseId.replaceChildren(
    el('span', { class: 'ci-acc' + (acc ? '' : ' none'), text: acc || 'New case' }),
    el('span', { class: 'ci-status', 'data-status': meta.status || 'draft', text: status }),
    el('span', { class: `ci-save ${saveClass}` }, el('span', { class: 'dot', 'aria-hidden': 'true' }), el('span', { text: saveText }))
  );
  nodes.caseId.title = acc ? `${acc} · ${status} · ${saveText} — go to the accession field` : 'No accession yet — go to the accession field';
}

/** Example / New / Open collapse into this menu on narrower screens; the inline buttons stay the source of truth. */
function initCaseMenu() {
  const items = [['Example', () => nodes.example.click()], ['New case', () => nodes.newCase.click()],
    // Where Save & new would add a row to the bar (860 px and below) it is listed here instead.
    ['Save & new', () => nodes.saveNew.click(), 'narrow-only'], ['Open…', () => nodes.open.click()]];
  // Walking away from a shared reporting station mid-list: drop the token and return to the gate.
  if (gateEnabled(location.hostname)) items.push(['Lock', () => lockApp()]);
  nodes.caseMenuList.replaceChildren(...items.map(([label, run, only]) => el('button', {
    type: 'button', role: 'menuitem', class: only ? `menu-item ${only}` : 'menu-item', text: label,
    onclick: () => { closeCaseMenu(); run(); }
  })));
  nodes.caseMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !nodes.caseMenuList.hidden;
    open ? closeCaseMenu() : (nodes.caseMenuList.hidden = false, nodes.caseMenuBtn.setAttribute('aria-expanded', 'true'));
  });
  document.addEventListener('click', (e) => { if (!nodes.caseMenuList.hidden && !e.target.closest('.case-menu')) closeCaseMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCaseMenu(); });
}

function closeCaseMenu() {
  nodes.caseMenuList.hidden = true;
  nodes.caseMenuBtn.setAttribute('aria-expanded', 'false');
}

/** The sticky bar gains a shadow once the page scrolls, so it sits above the content instead of floating in it. */
function initHeaderElevation() {
  const onScroll = () => nodes.header?.classList.toggle('scrolled', window.scrollY > 4);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
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
  organIcon(t),
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
    const commit = (e) => { markDirty(); state.caseState[f.id] = e.target.value; renderReport(); cacheCase(state.caseState); };
    const input = f.type === 'select'
      ? el('select', { class: 'input', id, onchange: commit },
        ...(f.options || []).map((o) => el('option', { value: o, text: labelFor(f, o), selected: (state.caseState[f.id] || f.default || '') === o })))
      : el('input', {
        class: 'input', id, type: 'text', placeholder: f.placeholder || '', value: state.caseState[f.id] || '',
        oninput: commit
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
    type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(i === state.activePart),
    title: p.linked ? `${schemaOf(p).name} (linked to ${hostNoun(parts[i - 1])} under the same letter)` : schemaOf(p).name,
    onclick: () => { state.activePart = i; render(); }
  }, iconForPart(p), el('span', { class: 'tab-label', text: p.linked ? `${p.label} syn` : p.label }))));
  nodes.addPart.disabled = parts.length >= maxPartsForCase();
  nodes.addPart.title = `Add part ${LETTERS_NEXT(parts.length)} (${schema().name})`;
}

// Display only. The stored value keeps the schema's spelling (a saved case holds site "Cecum"), so
// the picker would otherwise read "Cecum" while the report printed CAECUM. Respelling on the way to
// the screen keeps the two consistent without renaming an option and orphaning saved cases.
function labelFor(field, value) {
  if (field.optionLabels && value in field.optionLabels) return field.optionLabels[value];
  if (value === '') return '—';
  return schema()?.style?.british ? britishise(value) : value;
}

// Optional per-field visual reference (schema `field.reference`): a collapsible comparison panel of
// annotated photomicrographs with morphological criteria and licence credits. Open state is kept per
// field so it survives re-renders while the user works through the part.
const openReferences = new Set();
function referenceToggle(field, part) {
  const ref = field.reference;
  if (!ref) return null;
  const key = `${part.label}:${field.id}`;
  // A panel without images (the gastric polyp and biomarker criteria) is labelled for what it holds.
  const photos = (ref.groups || []).some((g) => g.images?.length);
  const open = openReferences.has(key);
  return el('button', {
    type: 'button', class: 'ref-toggle', 'aria-expanded': String(open),
    title: ref.title || (photos ? 'Show reference images' : 'Show reference criteria'),
    onclick: () => { openReferences.has(key) ? openReferences.delete(key) : openReferences.add(key); render(); }
  }, el('span', { 'aria-hidden': 'true', text: '◧' }), document.createTextNode(photos ? (open ? 'Hide photos' : 'Compare photos') : (open ? 'Hide criteria' : 'Show criteria')));
}
function referencePanel(field, part) {
  const ref = field.reference;
  if (!ref || !openReferences.has(`${part.label}:${field.id}`)) return null;
  const panel = el('div', { class: 'ref-panel', role: 'region', 'aria-label': ref.title || field.label });
  if (ref.title) panel.append(el('div', { class: 'ref-title', text: ref.title }));
  if (ref.intro) panel.append(el('p', { class: 'ref-intro', text: ref.intro }));
  // `noteTop` is for a summary the reader needs before the criteria (the Gleason Grade Group key); `note` stays a footnote.
  if (ref.noteTop) panel.append(el('p', { class: 'ref-note ref-note-top', text: ref.noteTop }));
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
            im.license ? document.createTextNode(` · ${im.license}`) : null) : null))),
      // `links` lead to further pages outside the app (the vulval carcinoma ExpertPath topics, which open
      // with the reader's own subscription); the app shows their titles only, never their images.
      g.links?.length ? el('ul', { class: 'ref-links' }, ...g.links.map((l) => el('li', {},
        el('a', { href: l.url, target: '_blank', rel: 'noopener', text: l.label })))) : null))));
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
    if (!f.group) {
      // Ungrouped runs pack too - several resections (colon, the benign organ templates) have no groups
      // in the histology column at all, and one field per row is exactly what wastes the width there.
      if (!pack) { current = null; out.push(node); continue; }
      if (!current || current.name !== null) { current = { name: null, node: el('div', { class: 'field-grid loose' }) }; out.push(current.node); }
      current.node.append(node);
      continue;
    }
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
  if (field.type === 'dishCounter') return dishCounterField(field, part);
  const visible = isVisible(field, part.values);
  const id = `f-${part.label}-${field.id}`;
  const wrap = el('div', { class: `field${visible ? '' : ' hidden'}${field.reference ? ' has-ref' : ''}`, 'data-field': field.id });
  const value = part.values[field.id];

  if (field.type === 'text' || field.type === 'textarea' || field.type === 'number') {
    const input = el(field.type === 'textarea' ? 'textarea' : 'input', {
      class: 'input', id, placeholder: field.placeholder || '', rows: field.type === 'textarea' ? 2 : undefined,
      oninput: (e) => {
        markDirty();
        part.values[field.id] = e.target.value;
        // A derive hook may fill other fields from this one (the breast excision form reads the side and
        // margin from the specimen as received); they change in place, so the cursor stays in the box.
        const changed = applyDerived(templateOf(part).generator, part, field.id);
        if (changed.length) syncControls(part, changed);
        // Until 2026-10-23 a typed box changed what showed only through a derive hook, so fields keyed to a
        // typed value waited for the next redraw: the node fields on the colon, oral, skin SCC, ovary and vulva
        // forms, the benign thyroid nodule fields, and the pTNM override reason on the nine forms that show it
        // only once an override is typed. They now appear and go as the box is typed.
        if (changed.length || schemaOf(part).fields.some((f) => ruleReads(f.showIf, field.id))) syncVisibility(part);
        renderReport(); cacheCase(state.caseState);
      }
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

  // A blank value the list does not offer (a pasted request that named no site) shows as blank, not as
  // the first option, which the report is not printing.
  const blank = value === '' && !options.includes('') ? [el('option', { value: '', text: labelFor(field, '') })] : [];
  if (blank.length) blank[0].selected = true;
  const optionNode = (opt) => {
    const o = el('option', { value: opt, text: labelFor(field, opt) });
    if (opt === value) o.selected = true;
    return o;
  };
  // `optionGroups` ([{label, options}]) only groups the list for reading; the flat `options` stays the
  // list that is validated and printed, and any option no group names is listed after the groups.
  const grouped = Array.isArray(field.optionGroups) && field.optionGroups.length
    ? [
      ...field.optionGroups.map((g) => el('optgroup', { label: g.label }, ...g.options.filter((o) => options.includes(o)).map(optionNode))),
      ...options.filter((o) => !field.optionGroups.some((g) => g.options.includes(o))).map(optionNode)
    ]
    : null;
  const select = el('select', { class: 'input', id, onchange: (e) => setValue(field.id, e.target.value) },
    ...blank,
    ...(grouped || options.map(optionNode)));
  wrap.append(el('label', { for: id, text: field.label }),
    field.reference ? el('div', { class: 'field-control' }, select, referenceToggle(field, part)) : select);
  // Help prints under a grouped list only: the boundary between the groups is what it explains, and the
  // older selects keep their help as schema notes.
  if (grouped && field.help) wrap.append(el('div', { class: 'field-help', text: field.help }));
  const refPanel = referencePanel(field, part);
  if (refPanel) wrap.append(refPanel);
  return wrap;
}

// ---------- HER2 DISH calculator (field type `dishCounter`; generators/dish_calculator.js) ----------
//
// The QMH 20-nucleus grid: HER2 (black) and CEP17 (red) signals per nucleus, nuclei 1-10 in the first
// column and 11-20 in the second, so Tab or Enter runs 1 to 20 in order. Every keystroke stores the
// counts and hands them to the generator's derive hook, which fills the cells counted, both averages,
// the ratio and the result. The grid is never redrawn while typing, so focus stays in it; the controls
// the hook changed are updated in place. Add 10 nuclei extends the grid (the stored list keeps its
// length, blank rows included, so the grid comes back the same size).
function dishCounterField(field, part) {
  const stored = Array.isArray(part.values[field.id]) ? part.values[field.id] : [];
  const rows = Math.max(MIN_NUCLEI, Math.ceil(stored.length / 10) * 10);
  const cell = (k, w) => String((Array.isArray(stored[k]) ? stored[k][w] : '') ?? '');
  const id = `f-${part.label}-${field.id}`;
  const inputs = [];
  const summary = el('div', { class: 'dish-summary', 'aria-live': 'polite' });
  const bad = (input) => { const ok = /^\d{0,3}$/.test(input.value.trim()); input.classList.toggle('bad', !ok); input.setAttribute('aria-invalid', String(!ok)); };
  const read = () => Array.from({ length: rows }, (_, k) => [inputs[2 * k].value.trim(), inputs[2 * k + 1].value.trim()]);
  const clear = el('button', {
    type: 'button', class: 'btn ghost small danger', text: 'Clear counts',
    onclick: () => { if (confirm('Clear every count in the HER2 DISH calculator?')) setValue(field.id, []); }
  });
  const showClear = (list) => { clear.hidden = !list.some((r) => Array.isArray(r) && (String(r[0] ?? '').trim() || String(r[1] ?? '').trim())); };
  const onEdit = (e) => {
    bad(e.target);
    markDirty();
    part.values[field.id] = read();
    showClear(part.values[field.id]);
    syncControls(part, applyDerived(templateOf(part).generator, part, field.id));
    paintDishSummary(summary, part.values);
    renderReport();
    cacheCase(state.caseState);
  };
  const onKey = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const at = inputs.indexOf(e.target) + (e.shiftKey ? -1 : 1);
    if (inputs[at]) { inputs[at].focus(); inputs[at].select(); }
  };
  const columns = [];
  for (let start = 0; start < rows; start += 10) {
    const col = el('div', { class: 'dish-col', role: 'group', 'aria-label': `Nuclei ${start + 1} to ${start + 10}` },
      el('span', { class: 'dish-colhead', text: '#' }),
      el('span', { class: 'dish-colhead' }, el('i', { class: 'dish-dot her2', 'aria-hidden': 'true' }), 'HER2'),
      el('span', { class: 'dish-colhead' }, el('i', { class: 'dish-dot cep17', 'aria-hidden': 'true' }), 'CEP17'));
    for (let k = start; k < start + 10; k++) {
      col.append(el('span', { class: 'dish-n', text: String(k + 1) }));
      for (const [w, probe] of [[0, 'HER2'], [1, 'CEP17']]) {
        const input = el('input', {
          class: 'input dish-in', type: 'text', id: `${id}-${w ? 'c' : 'h'}${k + 1}`, inputmode: 'numeric', pattern: '[0-9]*',
          maxlength: '3', autocomplete: 'off', 'aria-label': `Nucleus ${k + 1}, ${probe} signals`, oninput: onEdit, onkeydown: onKey
        });
        input.value = cell(k, w);
        bad(input);
        inputs.push(input);
        col.append(input);
      }
    }
    columns.push(col);
  }
  showClear(stored);
  const actions = el('div', { class: 'dish-actions' },
    el('button', {
      type: 'button', class: 'btn ghost small', text: 'Add 10 nuclei', title: 'Extend the grid for a longer count or a second population',
      onclick: () => {
        markDirty();
        part.values[field.id] = [...read(), ...Array.from({ length: 10 }, () => ['', ''])];
        render();
        requestAnimationFrame(() => document.getElementById(`${id}-h${rows + 1}`)?.focus());
      }
    }),
    clear);
  paintDishSummary(summary, part.values);
  const wrap = el('div', { class: 'field dish-calc', 'data-field': field.id },
    el('div', { class: 'dish-head' }, el('div', { class: 'field-label', id: `${id}-label`, text: field.label }), actions));
  if (field.help) wrap.append(el('div', { class: 'field-help', text: field.help }));
  wrap.append(el('div', { class: 'dish-grid', role: 'group', 'aria-labelledby': `${id}-label` }, ...columns), summary);
  return wrap;
}

/** The line under the grid: the four numbers, then the group and the result they give. */
function paintDishSummary(node, values) {
  const v = calculatorView(values);
  const stat = (label, value) => el('span', { class: 'dish-stat' }, `${label} `, el('b', { text: value || '\u2013' }));
  const nucleiText = v.cells >= v.min ? String(v.cells) : `${v.cells} of ${v.min}`;
  const group = v.group ? el('span', { class: 'dish-group', text: `Group ${v.group}` }) : null;
  const say = {
    empty: () => [`Count at least ${v.min} nuclei; the cells counted, both averages, the ratio and the result below fill in as you go.`],
    'no-ratio': () => ['No CEP17 signal counted yet, so there is no ratio.'],
    counting: () => (v.group ? [group, ` so far (${v.rule}); ${v.min - v.cells} more to count.`] : [`${v.min - v.cells} more nuclei to count.`]),
    'needs-ihc': () => [group, ` (${v.rule}): choose the concurrent HER2 IHC score below to fill in the result.`],
    done: () => [group, ` (${v.rule}) \u2192 ${v.result}.`,
      ...(v.recount ? [el('span', { class: 'dish-recount', text: ` IHC 2+: recount at least ${v.min} nuclei, including the IHC 2+ area, by a second observer blinded to this count (ASCO/CAP).` })] : [])]
  }[v.state]();
  node.replaceChildren(
    el('div', { class: 'dish-stats' }, stat('Nuclei', nucleiText), stat('HER2 per cell', v.her2Text), stat('CEP17 per cell', v.cep17Text), stat('Ratio', v.ratioText)),
    el('div', { class: `dish-verdict ${v.state}` }, ...say));
}

/** A field's node in the form: the histology column, or the macroscopy column of a three-column layout. */
const fieldNode = (fid) => nodes.panel.querySelector(`.field[data-field="${CSS.escape(fid)}"]`) || nodes.macroPanel.querySelector(`.field[data-field="${CSS.escape(fid)}"]`);

/** True when a `showIf` rule, or a member of its `all` / `any`, reads field `fid`. */
const ruleReads = (rule, fid) => !!rule && (rule.field === fid || [...(rule.all || []), ...(rule.any || [])].some((r) => ruleReads(r, fid)));

/** Fields shown or hidden in place after a derive hook, or a typed box, changed the values their `showIf` reads. */
function syncVisibility(part) {
  const s = schemaOf(part);
  for (const node of [...nodes.panel.querySelectorAll('.field[data-field]'), ...nodes.macroPanel.querySelectorAll('.field[data-field]')]) {
    const f = s.fields.find((x) => x.id === node.dataset.field);
    if (f) node.classList.toggle('hidden', !isVisible(f, part.values));
  }
}

/** Controls whose values a derive hook rewrote, updated in place (a full redraw would take focus from the grid). */
function syncControls(part, ids) {
  for (const fid of ids) {
    const node = fieldNode(fid);
    if (!node) continue;
    const value = part.values[fid];
    const control = node.querySelector('input.input, textarea.input, select.input');
    if (control) { control.value = value ?? ''; continue; }
    const box = node.querySelector('input[type="checkbox"]');
    if (box) { box.checked = !!value; continue; }
    node.querySelectorAll('.chips .chip').forEach((chip) => {
      chip.setAttribute('aria-pressed', String(chip.lastChild?.textContent === labelFor(schemaOf(part).fields.find((f) => f.id === fid) || {}, value)));
    });
  }
}

function focusField(fieldId) {
  requestAnimationFrame(() => {
    const g = nodes.panel.querySelector(`.chips[data-field="${fieldId}"]`);
    if (g) g.focus();
  });
}

// ---------- guided intake (src/cnswizard.js) ----------
//
// An option beside the form, never instead of it. The card asks one question at a time in the order
// the diagnostic funnel runs, renders the ordinary field for that step, and explains why the step is
// there. Closing it leaves every answer on the form. Open state and skipped steps are per part and
// per session only - nothing about the wizard is saved with the case or printed.

const wizard = { open: {}, skipped: {} };

function wizardOpen(i) { return !!wizard.open[i]; }
function toggleWizard(i) { wizard.open[i] = !wizard.open[i]; if (!wizard.open[i]) wizard.skipped[i] = []; }

function wizardCard(s, part, i) {
  if (!wizardOpen(i)) return null;
  const steps = wizardSteps(s);
  const skipped = wizard.skipped[i] || (wizard.skipped[i] = []);
  const { answered, total, step } = wizardProgress(steps, part.values, skipped);
  const bar = el('div', { class: 'wiz-bar' }, el('div', { class: 'wiz-bar-fill', style: `width:${total ? Math.round((answered / total) * 100) : 0}%` }));
  const headRow = el('div', { class: 'wiz-head' },
    el('strong', { text: 'Guided intake' }),
    el('span', { class: 'wiz-count', text: `${answered} of ${total} answered` }));

  if (!step) {
    const remaining = visibleSteps(steps, part.values).filter((x) => !stepAnswered(x, part.values));
    return el('section', { class: 'wiz', 'aria-label': 'Guided intake' }, headRow, bar,
      el('p', { class: 'wiz-done', text: remaining.length
        ? `The funnel is walked as far as it goes; ${remaining.length} step${remaining.length === 1 ? ' was' : 's were'} skipped. Check the panel beside the report for anything the recorded findings raise.`
        : 'The funnel is walked. Check the panel beside the report for anything the recorded findings raise, then read the report through before signing out.' }),
      skipped.length ? el('button', { type: 'button', class: 'btn ghost small', text: 'Go back over the skipped steps', onclick: () => { wizard.skipped[i] = []; render(); } }) : null);
  }

  const field = (s.fields || []).find((f) => f.id === step.field);
  const body = field ? renderField(field, part, i) : el('p', { class: 'wiz-why', text: 'This step has no field on the current template.' });
  body.classList.add('wiz-field');
  const notes = cautions(step, part.values);
  const done = visibleSteps(steps, part.values).filter((x) => stepAnswered(x, part.values));

  return el('section', { class: 'wiz', 'aria-label': 'Guided intake' }, headRow, bar,
    el('h4', { class: 'wiz-q', text: step.question }),
    el('p', { class: 'wiz-why', text: step.why }),
    ...notes.map((n) => el('p', { class: 'wiz-caution', text: n })),
    body,
    el('div', { class: 'wiz-foot' },
      // A field sitting on the value the schema gave it is asked rather than assumed: the wizard
      // exists so that each step is looked at. Confirming the default clears the step without
      // touching the value.
      atDefault(step, part.values) ? el('button', {
        type: 'button', class: 'btn small', text: 'That is right - continue',
        title: 'Keep the value already in the field and move to the next question.',
        onclick: () => { skipped.push(step.id); render(); }
      }) : el('button', {
        type: 'button', class: 'btn ghost small', text: step.optional ? 'Not done - move on' : 'Skip this step',
        title: 'Leave the field as it stands and move to the next question. The form keeps the field either way.',
        onclick: () => { skipped.push(step.id); render(); }
      }),
      done.length ? el('button', {
        type: 'button', class: 'btn ghost small', text: 'Back',
        title: `Reopen ${done[done.length - 1].question}`,
        onclick: () => {
          const last = done[done.length - 1];
          const node = nodes.panel.querySelector(`.field[data-field="${CSS.escape(last.field)}"]:not(.wiz-field)`);
          focusFieldNode(node);
        }
      }) : null,
      el('span', { class: 'wiz-hint', text: 'The form below is live throughout; answer here or there.' })));
}

// ---------- CNS pathway drawer (src/cnspathway.js) ----------
//
// A read-only flowchart of the published order, lit by the values already on the form. It writes
// nothing: no field is set, no line is printed, no grade is proposed. The grade proposal and the
// warnings live in generators/cns_layers.js and appear beside the report as they always have.
//
// Criterion text and source links here are panel text, exempt from the printed register in the way
// the reference-gallery criteria are. Open state is per part and per session; nothing about the
// drawer is saved with the case.

const pathways = { open: {}, sel: {} };

function pathwayOpen(i) { return !!pathways.open[i]; }
function togglePathway(i) { pathways.open[i] = !pathways.open[i]; }

const PW_STATE = {
  satisfied: { icon: '\u25cf', label: 'satisfied' },
  outstanding: { icon: '\u25cb', label: 'outstanding' },
  na: { icon: '\u2014', label: 'not applicable' },
};

// The drawer beside the form is a list: stage headings in the published order, each criterion with
// its state, its caveat, the test that would settle it and its source. A 460px column cannot show a
// branch, so nothing here pretends to be a flowchart.
//
// The picture lives behind the Map button, in a full-width overlay - see pathwayChartDialog below.

function pathwayNode(n) {
  const mark = PW_STATE[n.state] || PW_STATE.na;
  return el('li', { class: `pw-node is-${n.state}` },
    el('span', { class: 'pw-dot', 'aria-hidden': 'true', text: mark.icon }),
    el('div', { class: 'pw-node-body' },
      el('div', { class: 'pw-node-head' },
        el('strong', { text: n.label }),
        el('span', { class: 'pw-state', text: mark.label })),
      el('p', { class: 'pw-detail', text: n.detail }),
      n.note ? el('p', { class: 'pw-note', text: n.note }) : null,
      n.state === 'outstanding' && n.test ? el('p', { class: 'pw-test', text: `Next: ${n.test}` }) : null,
      n.source ? el('a', { class: 'pw-src', href: n.source.url, target: '_blank', rel: 'noopener', text: n.source.label }) : null));
}

function pathwayCard(part, i) {
  if (!pathwayOpen(i)) return null;
  const p = pathway(part.values);
  return el('aside', { class: 'pw', 'aria-label': 'CNS pathway' },
    el('div', { class: 'pw-head' },
      el('div', {},
        el('strong', { text: p.title }),
        el('p', { class: 'pw-lede', text: p.lede })),
      el('div', { class: 'pw-headbtns' },
        el('button', { type: 'button', class: 'btn ghost small', text: 'Map', title: 'Draw the pathway as a flowchart', onclick: () => openPathwayChart(i) }),
        el('button', { type: 'button', class: 'btn ghost small', text: 'Close', onclick: () => { togglePathway(i); render(); } }))),
    p.nextTest
      ? el('p', { class: 'pw-next', text: `Next test: ${p.nextTest}` })
      : el('p', { class: 'pw-next is-clear', text: 'Nothing outstanding on the pathway.' }),
    ...p.stages.map((st) => el('section', { class: 'pw-stage' },
      el('h4', { class: 'pw-stage-h', text: st.label }),
      el('ul', { class: 'pw-nodes' }, ...st.nodes.map(pathwayNode)))),
    el('p', { class: 'pw-foot', text: 'Read-only. This panel sets no field and prints nothing.' }));
}

// ---------- the flowchart, in a full-width overlay ----------
//
// The geometry comes from pathwayChart() in src/cnspathway.js, which is pure and tested: a 1200-wide
// drawing box with the funnel as a left-to-right chain, the fork where the case leaves it, a greyed
// stub for the branch not taken, and the branch stages as boxes along a second rail. Here the boxes
// are positioned HTML so labels wrap, and only the connectors are SVG. Clicking a box shows that
// criterion in the panel at the foot, one at a time.
//
// Read-only like the drawer: no field is set, no line is printed.

const PWC_LEGEND = [
  ['satisfied', 'recorded'],
  ['outstanding', 'still outstanding'],
  ['na', 'does not apply here'],
];

function pwcBox(cls, geom, ...children) {
  return el('div', {
    class: cls,
    style: `left:${geom.x}px;top:${geom.y}px;width:${geom.w}px;height:${geom.h}px`,
  }, ...children);
}

function pwcLinks(chart) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'pwc-links');
  svg.style.color = 'var(--color-border-strong)';
  svg.setAttribute('viewBox', `0 0 ${chart.width} ${chart.height}`);
  svg.setAttribute('width', chart.width);
  svg.setAttribute('height', chart.height);
  svg.setAttribute('aria-hidden', 'true');
  // One arrowhead, shared: a flowchart without direction is just boxes.
  svg.insertAdjacentHTML('afterbegin', '<defs><marker id="pwc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 2L8 5L2 8z" fill="currentColor"/></marker></defs>');
  for (const link of chart.links) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', `pwc-link is-${link.kind}`);
    path.setAttribute('d', link.points.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join(' '));
    if (link.kind === 'flow') path.setAttribute('marker-end', 'url(#pwc-arrow)');
    svg.append(path);
  }
  return svg;
}

function pwcNodeButton(cls, entry, onpick) {
  const n = entry.node;
  return pwcBox(`${cls} is-${n.state}`, entry,
    el('button', {
      type: 'button', class: 'pwc-hit', 'data-key': entry.key,
      'aria-pressed': String(pathways.sel.key === entry.key),
      onclick: () => onpick(entry),
    },
      el('span', { class: 'pwc-dot', 'aria-hidden': 'true', text: (PW_STATE[n.state] || PW_STATE.na).icon }),
      el('span', { class: 'pwc-label', text: n.label })));
}

function pwcPanel(n) {
  if (!n) {
    return el('div', { class: 'pwc-panel is-empty', 'aria-live': 'polite' },
      el('p', { text: 'Click any box to read its criterion.' }));
  }
  const mark = PW_STATE[n.state] || PW_STATE.na;
  return el('div', { class: `pwc-panel is-${n.state}`, 'aria-live': 'polite' },
    el('div', { class: 'pwc-phead' },
      el('strong', { text: n.label }),
      el('span', { class: 'pw-state', text: mark.label })),
    el('p', { class: 'pw-detail', text: n.detail }),
    n.note ? el('p', { class: 'pw-note', text: n.note }) : null,
    n.state === 'outstanding' && n.test ? el('p', { class: 'pw-test', text: `Next: ${n.test}` }) : null,
    n.source ? el('a', { class: 'pw-src', href: n.source.url, target: '_blank', rel: 'noopener', text: n.source.label }) : null);
}

function pathwayChartView(p) {
  const chart = pathwayChart(p);
  const entries = [...(chart.funnel ? chart.funnel.nodes : []), ...chart.stages.flatMap((s) => s.nodes)];
  // The panel opens on whatever the case is waiting on, so the overlay answers that with no click.
  if (!entries.some((e) => e.key === pathways.sel.key)) {
    const firstOut = entries.find((e) => e.node.state === 'outstanding') || entries[0];
    pathways.sel.key = firstOut ? firstOut.key : null;
  }
  const selected = entries.find((e) => e.key === pathways.sel.key);

  const pick = (entry) => {
    pathways.sel.key = entry.key;
    const host = nodes.dlgPathway.querySelector('.pwc-body');
    host.replaceChildren(pathwayChartView(p));
  };

  const stage = chart.funnel;
  return el('div', { class: 'pwc-wrap' },
    el('p', { class: 'pwc-lede', text: 'Follow the arrows. The top row is the funnel every CNS case runs; at the fork the case leaves it - the dashed branch is the one it did not take - and the boxes on the lower rail are the stages that follow.' }),
    el('div', { class: 'pwc-scroll' },
      el('div', { class: 'pwc', style: `width:${chart.width}px;height:${chart.height}px` },
        pwcLinks(chart),
        stage ? el('span', { class: 'pwc-rail-label', style: `left:${chart.stages.length ? 28 : 28}px;top:${Math.max(0, stage.nodes[0].y - 26)}px`, text: stage.label }) : null,
        ...(stage ? stage.nodes.map((e) => pwcNodeButton('pwc-node', e, pick)) : []),
        chart.stub ? pwcBox('pwc-stub', chart.stub, el('span', { class: 'pwc-label', text: chart.stub.label })) : null,
        chart.fork ? pwcBox(`pwc-fork is-${chart.fork.state}`, chart.fork,
          el('span', { class: 'pwc-diamond', 'aria-hidden': 'true', text: '\u25c6' }),
          el('span', { class: 'pwc-label', text: chart.fork.label })) : null,
        ...chart.stages.flatMap((st) => [
          pwcBox(`pwc-stage is-${st.state}`, st,
            el('div', { class: 'pwc-shead' },
              el('span', { class: 'pwc-stitle', text: st.label }),
              st.anyOf ? el('span', { class: 'pwc-any', text: 'any one' }) : null)),
          ...st.nodes.map((e) => pwcNodeButton('pwc-srow', e, pick)),
        ]))),
    el('div', { class: 'pwc-legend' },
      ...PWC_LEGEND.map(([s, label]) => el('span', { class: `pwc-key is-${s}` },
        el('span', { class: 'pwc-dot', 'aria-hidden': 'true', text: PW_STATE[s].icon }),
        el('span', { text: label }))),
      el('span', { class: 'pwc-key' }, el('span', { text: 'a dashed line is the branch this case did not take' }))),
    pwcPanel(selected ? selected.node : null),
    el('p', { class: 'pw-foot', text: 'Read-only. This overlay sets no field and prints nothing.' }));
}

// ---------- family reference plate ----------
//
// The pathway covers four families of nineteen. For the rest this is the map: the diagnostic
// algorithm for the family the case has been assigned to, drawn from the criteria the app already
// encodes, with the real published figures linked rather than reproduced. See src/cnsplates.js for
// why it is drawn here and not pasted in.
//
// Unlike the pathway, a plate is reference rather than case state: it reads dxFamily to choose which
// plate to open and nothing else, so no box has a satisfied/outstanding state. The one case-aware
// touch is that the entity the form currently holds is marked. It says "selected on the form" and
// not "recorded", because these picklists carry a schema default that is present whether or not
// anyone chose it - see plateSelection() in src/cnsplates.js.

const plates = { selKey: null };

function plateEntityMark(entry, chosen) {
  return chosen && entry.node.label === chosen;
}

function plateChartView(plate, chosen) {
  const chart = plateChart(plate);
  const entries = plateEntries(chart);
  if (!entries.some((e) => e.key === plates.selKey)) {
    // Open on the entity the form holds, so the plate answers the case with no click.
    const here = entries.find((e) => plateEntityMark(e, chosen));
    plates.selKey = here ? here.key : entries[0].key;
  }
  const selected = entries.find((e) => e.key === plates.selKey);

  const pick = (entry) => {
    plates.selKey = entry.key;
    nodes.dlgPlate.querySelector('.plc-body').replaceChildren(plateChartView(plate, chosen));
  };

  const hit = (cls, entry, extra) => pwcBox(`${cls}${plateEntityMark(entry, chosen) ? ' is-here' : ''}`, entry,
    el('button', {
      type: 'button', class: 'pwc-hit', 'data-key': entry.key,
      'aria-pressed': String(plates.selKey === entry.key),
      onclick: () => pick(entry),
    },
      el('span', { class: 'plc-label', text: entry.node.label }),
      extra ? extra(entry.node) : null));

  return el('div', { class: 'pwc-wrap' },
    el('p', { class: 'pwc-lede', text: plate.lede }),
    el('div', { class: 'pwc-scroll' },
      el('div', { class: 'pwc plc', style: `width:${chart.width}px;height:${chart.height}px` },
        pwcLinks(chart),
        el('span', { class: 'pwc-rail-label', style: `left:28px;top:${Math.max(0, chart.gate.nodes[0].y - 26)}px`, text: chart.gate.label }),
        ...chart.gate.nodes.map((e) => hit('plc-gate', e, null)),
        el('div', {
          class: 'plc-fork',
          style: `left:${chart.fork.x}px;top:${chart.fork.y}px;width:${chart.fork.w}px;height:${chart.fork.h}px`,
        },
          el('span', { class: 'pwc-diamond', 'aria-hidden': 'true', text: '\u25c6' }),
          el('span', { class: 'pwc-label', text: chart.fork.label })),
        ...chart.rails.flatMap((r) => [
          el('div', { class: 'plc-rail', style: `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px` },
            el('div', { class: 'plc-rhead' },
              el('span', { class: 'plc-rtitle', text: r.label }),
              r.note ? el('span', { class: 'plc-rnote', text: r.note }) : null)),
          ...r.nodes.map((e) => hit('plc-entity', e, (n) => el('span', {},
            el('span', { class: 'plc-key', text: n.key_line }),
            el('span', { class: 'plc-grade', text: n.grade })))),
        ]))),
    el('div', { class: 'plc-disc' },
      el('h4', { text: 'What decides it' }),
      el('dl', {}, ...plate.discriminators.flatMap(([k, why]) => [
        el('dt', { text: k }),
        el('dd', { text: why }),
      ]))),
    platePanel(selected ? selected.node : null, chosen),
    el('div', { class: 'plc-figs' },
      el('h4', { text: 'The published figures' }),
      el('p', { class: 'plc-fignote', text: 'Drawn here from the criteria rather than copied, so it stays in step with the checks on the form. These open the real figures on the publisher\u2019s page.' }),
      el('ul', {}, ...plate.figures.map((f) => el('li', {},
        el('a', { href: f.url, target: '_blank', rel: 'noopener', text: f.label }),
        el('span', { class: 'plc-cite', text: f.cite }))))),
    el('p', { class: 'pw-foot' },
      el('span', { text: 'Read-only. This overlay sets no field and prints nothing. Sources: ' }),
      ...plate.sources.flatMap((s, k) => [
        k ? el('span', { text: ' \u00b7 ' }) : null,
        el('a', { class: 'pw-src', href: s.url, target: '_blank', rel: 'noopener', text: s.label }),
      ])));
}

function platePanel(n, chosen) {
  if (!n) return el('div', { class: 'pwc-panel is-empty' }, el('p', { text: 'Click any box to read its criteria.' }));
  const here = chosen && n.label === chosen;
  return el('div', { class: `pwc-panel${here ? ' is-here' : ''}`, 'aria-live': 'polite' },
    el('div', { class: 'pwc-phead' },
      el('strong', { text: n.label }),
      n.grade ? el('span', { class: 'plc-pgrade', text: n.grade }) : null,
      here ? el('span', { class: 'plc-phere', text: 'selected on the form' }) : null),
    el('p', { class: 'pw-detail', text: n.detail }),
    n.note ? el('p', { class: 'pw-note', text: n.note }) : null,
    n.source ? el('a', { class: 'pw-src', href: n.source.url, target: '_blank', rel: 'noopener', text: n.source.label }) : null);
}

function openPlate(i) {
  const part = state.caseState.parts[i];
  const plate = plateFor(part.values.dxFamily);
  if (!plate) return;
  const chosen = plateSelection(part.values);
  plates.selKey = null;
  nodes.dlgPlate.querySelector('#plate-title').textContent = plate.title;
  nodes.dlgPlate.querySelector('.plc-body').replaceChildren(plateChartView(plate, chosen));
  nodes.dlgPlate.showModal();
}

function openPathwayChart(i) {
  const part = state.caseState.parts[i];
  const p = pathway(part.values);
  nodes.dlgPathway.querySelector('#pathway-title').textContent = p.title;
  nodes.dlgPathway.querySelector('.pwc-body').replaceChildren(pathwayChartView(p));
  nodes.dlgPathway.showModal();
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
  const wiz = wizardSupported(s) ? wizardCard(s, part, i) : null;
  const pw = pathwaySupported(s) ? pathwayCard(part, i) : null;
  const head = el('div', { class: 'part-head' },
    el('h3', {}, iconForPart(part), el('span', { text: part.linked ? `Part ${part.label} (synoptic, linked to ${hostNoun(state.caseState.parts[i - 1])})` : `Part ${part.label}` })),
    picker,
    el('div', { class: 'part-actions' },
      canUpgrade(i) ? el('button', { type: 'button', class: 'btn small', text: 'Upgrade this part', title: 'Switch this part to the synoptic template for the ticked neoplasm, carrying over what the benign form already answered', onclick: () => upgradeThisPart(i).catch((err) => { toast(err.message); render(); }) }) : null,
      canStage(i) ? el('button', { type: 'button', class: 'btn small', text: hostGen(part)?.PAIR_BUTTON?.text || (pairSeparate(part.values.scenario) ? 'Add breast synoptic' : 'Stage this part'), title: hostGen(part)?.PAIR_BUTTON?.title || (pairSeparate(part.values.scenario) ? 'Add the breast carcinoma resection as the next part, with the sentinel node counts pre-filled' : 'Add the paired cancer synoptic under the same letter, pre-filled from the frozen section'), onclick: () => stageThisPart(i).catch((err) => { toast(err.message); render(); }) }) : null,
      i > 0 && !part.linked ? el('button', { type: 'button', class: 'btn ghost small', text: 'Same as previous', onclick: () => copyFromPrevious(i) }) : null,
      wizardSupported(s) ? el('button', {
        type: 'button', class: `btn small${wizardOpen(i) ? '' : ' ghost'}`,
        text: wizardOpen(i) ? 'Close guided intake' : 'Guided intake',
        title: wizardOpen(i)
          ? 'Close the guided intake. Everything it recorded stays on the form.'
          : 'Walk the diagnostic funnel one question at a time. It writes the ordinary fields, and the form below stays exactly where it is.',
        onclick: () => { toggleWizard(i); render(); }
      }) : null,
      plateSupported(part.values) ? el('button', {
        type: 'button', class: 'btn ghost small',
        text: 'Family plate',
        title: 'Open the diagnostic algorithm for this WHO family: the entry criteria, where it forks, the entities under each branch and the stains that separate them. It reads the form and changes nothing.',
        onclick: () => openPlate(i),
      }) : null,
      pathwaySupported(s) ? el('button', {
        type: 'button', class: `btn small${pathwayOpen(i) ? '' : ' ghost'}`,
        text: pathwayOpen(i) ? 'Close pathway' : 'Pathway',
        title: pathwayOpen(i)
          ? 'Close the pathway drawer.'
          : 'See the integrated-diagnosis pathway for this case: which criteria are satisfied, which are outstanding, and what the next test would be. It reads the form and changes nothing.',
        onclick: () => { togglePathway(i); render(); }
      }) : null,
      el('button', { type: 'button', class: 'btn ghost small', text: 'Suggest a change', title: 'Suggest a change or report an error in this template (opens a Google Form)', onclick: () => suggest(i, true) }),
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
      el('div', { class: 'part-head' }, el('h3', {}, iconForPart(part), el('span', { text: `Part ${part.label} \u00b7 specimen and macroscopy` }))),
      ...groupFields(split.macro, part, i, pack));
    nodes.panel.replaceChildren(head, ...[wiz, pw, pack ? sectionRail(split.histo, part) : null].filter(Boolean), ...groupFields(split.histo, part, i, pack));
  } else {
    nodes.macroPanel.hidden = true;
    nodes.macroPanel.replaceChildren();
    nodes.panel.replaceChildren(head, ...[wiz, pw, pack ? sectionRail(s.fields, part) : null].filter(Boolean), ...groupFields(s.fields, part, i, pack));
  }
}

// The sticky report sits under the (two-row, wrapping) header: publish its live height as --topbar-h.
const topbar = document.querySelector('header');
if (topbar) {
  const setTopbarH = () => document.documentElement.style.setProperty('--topbar-h', `${topbar.offsetHeight}px`);
  setTopbarH();
  if (typeof ResizeObserver === 'function') new ResizeObserver(setTopbarH).observe(topbar);
}

// Compact layout (phones): the form and the report are two tabs, and three actions sit in a bar at
// the bottom edge. Both elements exist at every width and are shown only by the 700px media query,
// so nothing here runs differently on a desktop. docs/specs/iphone-layout.md
function setCompactView(view) {
  document.body.dataset.mview = view === 'report' ? 'report' : 'case';
  for (const [name, btn] of [['case', $('#mview-case')], ['report', $('#mview-report')]]) {
    if (btn) btn.setAttribute('aria-selected', String(document.body.dataset.mview === name));
  }
}
setCompactView('case');
$('#mview-case')?.addEventListener('click', () => setCompactView('case'));
$('#mview-report')?.addEventListener('click', () => setCompactView('report'));
// Forward the tap to the button that already owns the action rather than re-implementing it: one
// copy path, one save state, and the clipboard write stays inside the user gesture iOS requires.
for (const [id, target] of [['#m-copy-dx', nodes.copyDx], ['#m-copy-report', nodes.copyReport], ['#m-save', nodes.save]]) {
  $(id)?.addEventListener('click', () => target?.click());
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
  // Tick what the report prints: template defaults under the case's own choices (engine caseOptions).
  const printed = caseOptions(state.templates, state.caseState);
  const optionNodes = opts.map((o) => {
    const input = el('input', { type: 'checkbox', onchange: (e) => { markDirty(); state.caseState.options[o.id] = e.target.checked; renderReport(); cacheCase(state.caseState); } });
    input.checked = !!printed[o.id];
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
  // replaceChildren stringifies null, so empty groups have to be filtered out rather than passed through.
  nodes.options.replaceChildren(...[
    optionNodes.length ? el('div', { class: 'option-row' }, ...optionNodes) : null,
    snippetNodes.length ? el('div', { class: 'snippet-group' }, el('div', { class: 'group-title', text: 'Comments' }), el('div', { class: 'option-row' }, ...snippetNodes)) : null,
    el('div', { class: 'field comment-field' }, el('label', { for: 'case-comment', text: 'Comment' }), comment)
  ].filter(Boolean));
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
    // After a form change, the changes accepted from proofreading follow it where their words allow:
    // those kept over the form's text, and the rewrites still open (docs/specs/proofreading.md).
    const prev = state.lastOutCase === state.caseState ? state.lastOut : null;
    if (prev && carryPatches(state.caseState, prev, out)) out = generateCase(state.templates, state.caseState);
    if (prev) carryRewrites(prev, out);
  } catch (err) {
    nodes.blocks.replaceChildren(el('div', { class: 'block' }, el('pre', { text: `Generator error: ${err.message}` })));
    return;
  }
  state.lastOut = out;
  state.lastOutCase = state.caseState;
  const tagFor = (key) => ({ lis: 'from LIS', merged: '+ typed text', edited: 'edited' }[out.source?.[key]] || '');
  const biomarkerOnly = () => schemasInUse().every((s) => s.kind === 'biomarker');
  const blocks = [
    ['specimens', 'Specimens', out.specimens],
    ['macro', 'Macroscopic description', out.macro],
    ['blockKey', 'Block key', out.blockKey],
    ['intraop', 'Intraoperative consultation', out.intraop],
    ['microscopy', out.microscopyHeading ? out.microscopyHeading.charAt(0) + out.microscopyHeading.slice(1).toLowerCase() : 'Microscopic examination', out.microscopy],
    ['molecular', 'Molecular findings', out.molecular],
    ['diagnosis', 'Diagnosis', out.diagnosis],
    ['comment', 'Comment', out.comment]
    // An empty specimens / microscopy / diagnosis block is kept as an editable box to type into. The
    // exception is a template that has no microscopy to write: a biomarker report is a result block
    // against a section already reported elsewhere, so an empty MICROSCOPIC EXAMINATION heading there
    // is a box nobody can fill rather than a prompt. Molecular findings is the other way round: kept
    // empty for a biomarker report, where the results go, and absent everywhere else.
  ].filter(([key, , text]) => text || out.edited?.[key]
    || (key === 'microscopy' ? !biomarkerOnly() : key === 'molecular' ? biomarkerOnly() : ['specimens', 'diagnosis'].includes(key)));
  const issues = [...(out.issues || []), ...patchIssues(out)];
  // Checks collapse to their one-line count so the report starts at the top of the column; an issue that
  // names a field is clickable and focuses it. The open state is remembered between cases.
  const checksBox = issues.length ? el('details', { class: `checks ${issues.some((i) => i.level === 'error') ? 'has-error' : issues.some((i) => i.level === 'warn') ? 'has-warn' : 'info-only'}` },
    el('summary', {},
      el('div', { class: 'checks-head' }, el('h3', { text: 'Checks' }), el('span', { class: 'muted', text: [`${issues.filter((i) => i.level === 'error').length} to fix`, `${issues.filter((i) => i.level === 'warn').length} to review`, issues.some((i) => i.level === 'info') ? `${issues.filter((i) => i.level === 'info').length} for reference` : ''].filter(Boolean).join(' \u00b7 ') }))),
    el('ul', {}, ...issues.map((i) => el('li', {
      class: `issue ${i.level}${i.field ? ' jump' : ''}`,
      title: i.field ? 'Go to the field this refers to' : undefined,
      onclick: i.field ? () => focusFieldNode(nodes.panel.querySelector(`.field[data-field="${CSS.escape(i.field)}"]`) || nodes.macroPanel.querySelector(`.field[data-field="${CSS.escape(i.field)}"]`)) : undefined,
      text: `${state.caseState.parts.length > 1 && i.part ? `(${i.part}) ` : ''}${i.message}`
    })))) : null;
  if (checksBox) {
    checksBox.open = localStorage.getItem('signout.checks') !== 'closed';
    checksBox.addEventListener('toggle', () => localStorage.setItem('signout.checks', checksBox.open ? 'open' : 'closed'));
  }
  const checks = [checksBox, renderProofBox(out), renderAuditBox(out)].filter(Boolean);
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
  // Changes accepted from proofreading that no form field gives, kept over the form's text.
  const patched = !out.edited?.[key] && state.caseState.patches?.[key]?.length ? out.patched?.[key] : null;
  if (patched) {
    const n = patched.applied + patched.missed.length;
    h3.append(' ', el('span', { class: 'tag tag-proof', text: 'proofread changes', title: `${n === 1 ? 'A change' : `${n} changes`} accepted from proofreading, kept over the text the form gives. The block still follows the form.` }));
  }
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
    else if (patched) actions.append(el('button', { type: 'button', class: 'btn ghost small', text: 'Revert', title: "Take out the proofreading changes kept over the form's text; the form stays as it is", onclick: () => revertPatches(key) }));
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

/** Take out a block's proofreading changes kept over the form's text; the form's values stay. */
function revertPatches(key) {
  const n = state.caseState.patches?.[key]?.length || 0;
  if (!n) return;
  const name = blockLabel(key);
  if (!window.confirm(`Take out ${n === 1 ? 'the proofreading change' : `the ${n} proofreading changes`} kept over the form's text in ${name}? What was put into the form stays.`)) return;
  delete state.caseState.patches[key];
  markDirty(); renderReport(); cacheCase(state.caseState);
  toast(`${name} follows the form's text again`);
}

const blockLabel = (key) => sectionOf(key)?.label || { blockKey: 'Block key' }[key] || key;
const clipNote = (s, n = 48) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 3)}...` : t; };

/** Checks for proofreading changes that no longer fit the form's text, and so are left out. */
function patchIssues(out) {
  return Object.entries(out.patched || {}).filter(([key, p]) => p.missed.length && !out.edited?.[key]).map(([key, p]) => {
    const n = p.missed.length;
    const shown = p.missed.slice(0, 2).map((m) => `"${clipNote(m.find, 36)}" \u2192 "${clipNote(m.replace, 36)}"`).join('; ');
    return { level: 'warn', message: `${blockLabel(key)}: ${n === 1 ? 'a proofreading change no longer fits' : `${n} proofreading changes no longer fit`} the text the form now gives and ${n === 1 ? 'is' : 'are'} left out (${shown}). Edit the block, or Revert to drop ${n === 1 ? 'it' : 'them'}.` };
  });
}

// ---------- proofreading (src/proofread.js, src/hanslide.js, docs/specs/proofreading.md) ----------
// The rule checks are worked out whenever the report is shown, on every computer. PPLX 27B is asked
// through Han Slide only where Settings › Proofreading is on (the Mac that drafts; never the PC).
// Its record goes with the case, so the PC shows what was proofread and what has changed since.

/** The suggestions for the report on screen: { sections, record, items }. */
function proofView(out = state.lastOut) {
  const sections = reportSections(out || {});
  const record = state.caseState?.proofread || null;
  return { sections, record, items: openItems(record, ruleChecks(sections), sections) };
}

const clock = (ms) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** The words of the case form's options, for telling a change of fact in a rewrite (memoised by template). */
let termsMemo = { key: '', terms: null };
function proofTerms() {
  const key = templatesInUse(state.caseState).join('+');
  if (termsMemo.key !== key) termsMemo = { key, terms: formTerms(schemasInUse()) };
  return termsMemo.terms;
}

/** A block's text as printed, as the proofreader read it. */
const printedText = (out, key) => String(out?.[key] ?? '').replace(/\s+$/, '');

/** A rewrite as tracked changes over the section's text now (memoised). */
const rewriteMemo = new Map();
function rewriteView(item, base) {
  const terms = proofTerms();
  const key = `${termsMemo.key}|${fingerprint(base)}|${fingerprint(item.text)}`;
  if (!rewriteMemo.has(key)) {
    if (rewriteMemo.size > 20) rewriteMemo.clear();
    rewriteMemo.set(key, rewriteChanges(base, item.text, terms));
  }
  return rewriteMemo.get(key);
}
/** The changes of a rewrite ticked to accept: at first each one but those that change a fact. */
function ticksFor(item, changes) {
  let t = state.proof.ticks.get(item.key);
  if (!t || t.length !== changes.length) { t = changes.map((c) => !c.flagged); state.proof.ticks.set(item.key, t); }
  return t;
}

/** A suggestion made in a block's text: the new text, or null where it no longer fits. */
function proofApply(item, text) {
  if (item.kind === 'rewrite') {
    if (!item.text || fingerprint(text) !== item.base) return null;
    const changes = rewriteView(item, text);
    const ticks = ticksFor(item, changes);
    if (!ticks.some(Boolean) || checkTicked(text, item.text, changes, ticks, proofTerms())) return null;
    return tickedText(text, changes, ticks);
  }
  if (item.kind === 'check') return item.suggestion === undefined ? null : applyEdit(text, { find: item.quote, replace: item.suggestion, all: item.all });
  return applyEdit(text, item);
}

/**
 * The rewrites still open, carried over a change of their section's text (a form change, an accepted
 * edit): each change made in the rewrite where its words are there once. One that cannot be is no
 * longer offered, as before.
 */
function carryRewrites(prev, out) {
  for (const item of state.caseState?.proofread?.items || []) {
    if (item.kind !== 'rewrite' || item.status !== 'open' || !item.text) continue;
    const before = printedText(prev, item.section); const after = printedText(out, item.section);
    if (before === after || fingerprint(before) !== item.base) continue;
    const t = carryText(before, after, item.text);
    if (t === null || t === after) continue;
    item.text = t;
    item.base = fingerprint(after);
    state.proof.ticks.delete(item.key);
  }
}

/** Which backend and display name the current case will use for AI proofreading. */
function proofTarget() {
  const vertex = loadVertexSettings();
  const kind = caseKindForAi();
  const useVertex = vertex.backend === 'vertex'
    || (vertex.backend === 'hybrid' && (kind === 'cancer resection' || kind === 'biomarker'));
  return useVertex
    ? { useVertex: true, kind, proxyUrl: vertex.proxyUrl, model: 'Gemini', via: 'Vertex AI' }
    : { useVertex: false, kind, proxyUrl: vertex.proxyUrl, model: MODEL_NAME, via: 'Han Slide on this computer' };
}

/** The Proofreading box under Checks, or null when there is nothing to show. */
function renderProofBox(out) {
  const on = loadProofSettings().on;
  const { sections, record, items } = proofView(out);
  const mine = state.proof.caseState === state.caseState;
  const busy = state.proof.busy && mine;
  const error = mine ? state.proof.error : '';
  const note = state.proof.note?.caseState === state.caseState ? state.proof.note : null;
  if (!on && !items.length && !record?.at && !error && !note) return null;
  const target = (busy && state.proof.target) || proofTarget();
  const rewrites = items.filter((i) => i.kind === 'rewrite');
  const flagged = items.filter((i) => i.kind === 'check' && i.suggestion !== undefined);
  const edits = items.filter((i) => i.kind !== 'check' && i.kind !== 'rewrite');
  const looks = items.length - edits.length - flagged.length - rewrites.length;
  const count = [edits.length ? `${edits.length} to accept` : '', flagged.length ? `${flagged.length} flagged` : '',
    rewrites.length ? `${rewrites.length} rewrite${rewrites.length === 1 ? '' : 's'}` : '', looks ? `${looks} to look at` : ''].filter(Boolean).join(' \u00b7 ');
  const summary = busy ? `${target.model} is reading the report\u2026` : error ? 'did not run' : count || (record?.at ? 'nothing open' : on ? 'not proofread yet' : 'nothing found');
  const box = el('details', { class: `checks proof ${error ? 'has-error' : items.length ? '' : 'info-only'}` },
    el('summary', {}, el('div', { class: 'checks-head' }, el('h3', { text: 'Proofreading' }), el('span', { class: 'muted', text: summary }))));
  const line = busy ? `Asked ${target.model} through ${target.via} at ${clock(state.proof.startedAt)}. You can keep working.`
    : record?.at ? recordSummary(record, sections)
      : on ? `Not proofread by ${target.model} yet: it runs when the case is marked Ready, or press Proofread.`
        : 'Rule checks only. Turn on Settings › Proofreading (Han Slide or Vertex AI) to proofread with AI.';
  box.append(el('p', { class: 'proof-line', text: line }));
  if (error) box.append(el('p', { class: 'proof-error', role: 'alert', text: error }));
  if (note) {
    box.append(el('div', { class: 'proof-note', role: 'status' }, ...note.lines.map((l) => el('p', { text: l })),
      el('button', { type: 'button', class: 'btn ghost small', text: 'OK', title: 'Hide this note', onclick: () => { state.proof.note = null; renderReport(); } })));
  }
  const modelTag = (record?.by ? String(record.by).split(' via ')[0] : '') || target.model;
  if (items.length) box.append(el('ul', { class: 'proof-list' }, ...items.map((i) => proofRow(i, out, modelTag))));
  const bar = el('div', { class: 'proof-bar' });
  if (edits.length > 1) bar.append(el('button', { type: 'button', class: 'btn ghost small', text: `Accept all ${edits.length}`, title: 'The spelling, grammar and house-style edits; flagged changes and rewrites are accepted one by one', onclick: () => acceptProof(edits) }));
  if (on) bar.append(el('button', { type: 'button', class: 'btn ghost small', text: busy ? 'Proofreading\u2026' : record?.at ? 'Proofread again' : 'Proofread', disabled: busy, onclick: () => runProofread() }));
  if (bar.childElementCount) box.append(bar);
  box.open = localStorage.getItem('signout.proof') !== 'closed';
  box.addEventListener('toggle', () => localStorage.setItem('signout.proof', box.open ? 'open' : 'closed'));
  return box;
}

/** One suggestion: what it is and where, the change or the text to look at, Accept and Dismiss. */
function proofRow(item, out, modelTag = MODEL_NAME) {
  const where = sectionOf(item.section)?.label || item.section;
  const flagged = item.kind === 'check' && item.suggestion !== undefined;
  const kind = flagged ? PROOF_KIND.flagged : PROOF_KIND[item.kind] || item.kind;
  const head = el('span', { class: 'proof-kind', text: `${kind} \u00b7 ${where}${item.source === 'model' ? ` \u00b7 ${modelTag.split(' ').join('\u00a0')}` : ''}` });
  if (item.kind === 'rewrite') return rewriteRow(item, head, printedText(out, item.section));
  const body = el('span', { class: 'proof-text' });
  const change = (find, replace) => {
    body.append(el('del', { text: find }), ' \u2192 ', replace ? el('ins', { text: replace }) : el('span', { class: 'muted', text: '(removed)' }));
    if (item.all) body.append(el('span', { class: 'muted', text: ' (each time)' }));
  };
  if (flagged) {
    change(item.quote, item.suggestion);
    body.append(` \u2014 ${item.why}`);
    const facts = factChange(item.quote, item.suggestion, proofTerms());
    if (facts) body.append(' ', el('span', { class: 'proof-fact', text: facts }));
  } else if (item.kind === 'check') {
    body.append(el('q', { text: item.quote }), ` ${item.why}`);
  } else {
    change(item.find, item.replace);
    if (item.why) body.append(` \u2014 ${item.why}`);
  }
  const actions = el('span', { class: 'proof-actions' });
  if (item.kind !== 'check') actions.append(el('button', { type: 'button', class: 'btn small', text: 'Accept', onclick: () => acceptProof([item]) }));
  else if (flagged && proofApply(item, printedText(out, item.section)) !== null) {
    actions.append(el('button', { type: 'button', class: 'btn small', text: 'Accept change', title: 'Make this change; it goes into the form where a field gives the text', onclick: () => acceptProof([item]) }));
  }
  actions.append(el('button', { type: 'button', class: 'btn ghost small', text: 'Dismiss', onclick: () => dismissProof(item) }));
  return el('li', { class: `proof-item ${flagged ? 'flag' : item.kind === 'check' ? 'look' : 'edit'}` }, head, body, actions);
}

/**
 * A rewrite as tracked changes over the section's text. Each change ticks or unticks on a click (or
 * Enter or Space); one that changes a fact is marked with what it changes and starts unticked. The
 * changes are inline spans acting as buttons, so they wrap with the text as it reads.
 */
function rewriteRow(item, head, base) {
  const changes = rewriteView(item, base);
  const ticks = ticksFor(item, changes);
  const terms = proofTerms();
  const warn = el('p', { class: 'proof-warn', role: 'status', hidden: true });
  const accept = el('button', { type: 'button', class: 'btn small', onclick: () => acceptProof([item]) });
  const update = () => {
    const k = ticks.filter(Boolean).length;
    accept.textContent = `Accept ticked (${k} of ${changes.length})`;
    const w = k ? checkTicked(base, item.text, changes, ticks, terms) : null;
    warn.textContent = w || '';
    warn.hidden = !w;
    accept.disabled = !k || !!w;
  };
  const view = el('div', { class: 'proof-rewrite' });
  let last = 0;
  changes.forEach((c, i) => {
    if (c.from > last) view.append(base.slice(last, c.from));
    const btn = el('span', { class: `chg${c.flagged ? ' flagged' : ''}${ticks[i] ? '' : ' off'}`, role: 'button', tabindex: '0', 'aria-pressed': String(ticks[i]),
      title: `${c.flagged ? `Changes a fact (${c.facts}). ` : ''}Click to ${ticks[i] ? 'untick' : 'tick'} this change` });
    if (c.old) btn.append(el('del', { text: c.old }));
    if (c.text) btn.append(el('ins', { text: c.text }));
    if (c.flagged) btn.append(el('span', { class: 'chg-fact', text: c.facts }));
    const toggle = () => {
      ticks[i] = !ticks[i];
      btn.classList.toggle('off', !ticks[i]);
      btn.setAttribute('aria-pressed', String(ticks[i]));
      btn.title = `${c.flagged ? `Changes a fact (${c.facts}). ` : ''}Click to ${ticks[i] ? 'untick' : 'tick'} this change`;
      update();
    };
    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    view.append(btn);
    last = c.to;
  });
  if (last < base.length) view.append(base.slice(last));
  update();
  const nFlagged = changes.filter((c) => c.flagged).length;
  const body = el('span', { class: 'proof-text' }, item.why ? `${item.why} ` : '',
    el('span', { class: 'muted', text: `${changes.length} change${changes.length === 1 ? '' : 's'}${nFlagged ? `; ${nFlagged} that change${nFlagged === 1 ? 's' : ''} a fact, left unticked` : ''}. Click a change to tick or untick it.` }));
  const actions = el('span', { class: 'proof-actions' }, accept,
    el('button', { type: 'button', class: 'btn ghost small', text: 'Dismiss', onclick: () => dismissProof(item) }));
  return el('li', { class: 'proof-item rewrite' }, head, body, view, warn, actions);
}

// What a field change put into the form, for the note.
const KEEP_KEYS = new Set(['proofread', 'edits', 'drive']);
function describeChange(c) {
  if (c.typed) {
    const p = patchFor(String(c.from ?? ''), String(c.value ?? ''));
    return p ? `${c.label}: "${clipNote(p.find) || '(blank)'}" \u2192 "${clipNote(p.replace) || '(blank)'}"` : '';
  }
  return `${c.label}: ${showValue(c.from)} \u2192 ${showValue(c.to)}`;
}
function noteFor(label, r) {
  const lines = [];
  const changes = r.changes.map(describeChange).filter(Boolean);
  if (changes.length) lines.push(`Into the form (${label}): ${changes.join('; ')}.`);
  if (r.knockOn.length) lines.push(`The form also changed ${label}: ${r.knockOn.map((k) => `${k.old ? `"${clipNote(k.old)}"` : '(new)'} \u2192 ${k.text ? `"${clipNote(k.text)}"` : '(removed)'}`).join('; ')}.`);
  if (r.also.length) lines.push(`The form change also altered: ${r.also.map(blockLabel).join(', ')}.`);
  if (r.patches.length) lines.push(`${label}: ${r.patches.length === 1 ? 'one change' : `${r.patches.length} changes`} no field gives, kept over the form's wording (Revert in the block takes ${r.patches.length === 1 ? 'it' : 'them'} out).`);
  return lines;
}

/**
 * Accept suggestions, block by block. Each block is made to read as accepted through the form where
 * it can be: a typed text, a number, a choice or a tick is changed as typing it would, so the report
 * keeps following the form (src/writeback.js). What no field gives is kept as a proofreading change
 * over the form's text. A block edited by hand stays an edit; a block that cannot be made to read so
 * becomes one. A block unchanged since it was proofread keeps counting as proofread.
 */
function acceptProof(items) {
  const cs = state.caseState;
  if (!state.lastOut || !cs) return;
  const record = cs.proofread;
  const lines = []; const done = []; const nowEdited = []; const hashes = [];
  let intoForm = false;
  const macroBefore = cs.meta?.macro;
  for (const key of PROOF_SECTIONS.map((s) => s.key).filter((k) => items.some((i) => i.section === k))) {
    const out = generateCase(state.templates, cs);
    const before = printedText(out, key);
    let next = before;
    const took = [];
    for (const item of items.filter((i) => i.section === key)) {
      const t = proofApply(item, next);
      if (t === null) continue;
      next = t;
      took.push(item);
    }
    if (!took.length) continue;
    done.push(...took);
    for (const item of took) {
      const own = item.source === 'model' ? record?.items?.find((i) => i.key === item.key) : null;
      if (!own) continue;
      own.status = 'accepted';
      if (own.kind === 'rewrite') { delete own.text; state.proof.ticks.delete(own.key); } // kept small: the case goes in one Sheet cell
    }
    if (next === before) continue;
    if (record?.hashes?.[key] && record.hashes[key] === fingerprint(before)) hashes.push(key);
    const label = blockLabel(key);
    cs.edits = cs.edits || {};
    if (out.edited?.[key]) {
      if (next.trim() === blockText(out, key).trim()) delete cs.edits[key]; else cs.edits[key] = next;
      continue;
    }
    const r = writeBack(state.templates, cs, key, next);
    if (r) {
      for (const k of Object.keys(r.caseState)) if (!KEEP_KEYS.has(k) && JSON.stringify(r.caseState[k]) !== JSON.stringify(cs[k])) cs[k] = r.caseState[k];
      if (r.changes.length) intoForm = true;
      lines.push(...noteFor(label, r));
    } else {
      cs.edits[key] = next;
      nowEdited.push(label);
      lines.push(`${label}: could not be put into the form, so it now prints as edited text (Revert goes back).`);
    }
  }
  if (!done.length) { renderReport(); toast('The text has changed since; nothing accepted'); return; }
  if (cs.meta?.macro !== macroBefore) applyMacro();
  state.proof.note = lines.length ? { caseState: cs, lines } : null;
  state.editing = null;
  markDirty();
  render();
  if (hashes.length) {
    const now = reportSections(state.lastOut);
    for (const key of hashes) record.hashes[key] = fingerprint(now.find((s) => s.key === key)?.text ?? '');
    renderReport();
  }
  cacheCase(cs);
  const what = done.length === 1 ? 'Accepted' : `Accepted ${done.length} changes`;
  toast(nowEdited.length ? `${what}. ${nowEdited.join(', ')} now print${nowEdited.length === 1 ? 's' : ''} as edited text (Revert goes back)` : intoForm ? `${what} into the form` : what);
}

/** Dismiss a suggestion: it stays dismissed when it is suggested again. */
function dismissProof(item) {
  const cs = state.caseState;
  const record = cs.proofread || (cs.proofread = { v: 2, dismissed: [] });
  const own = item.source === 'model' ? (record.items || []).find((i) => i.key === item.key) : null;
  if (own) {
    own.status = 'dismissed';
    if (own.kind === 'rewrite') { delete own.text; state.proof.ticks.delete(own.key); }
  } else record.dismissed = [...new Set([...(record.dismissed || []), item.key])];
  markDirty(); renderReport(); cacheCase(cs);
}

/** On Ready, and on Save while Ready: proofread when the report has not been, or has changed since. */
function proofreadIfChanged() {
  const cs = state.caseState;
  if (!cs || cs.meta?.status !== 'ready' || !loadProofSettings().on) return;
  if (cs.proofread?.at && !changedSince(cs.proofread, reportSections(state.lastOut || {})).length) return;
  runProofread({ auto: true });
}

/** Highest-complexity template kind in the current case, used to route Vertex AI tiers. */
function caseKindForAi() {
  const kinds = schemasInUse().map((s) => String(s?.kind || '').toLowerCase());
  if (kinds.some((k) => k.includes('cancer'))) return 'cancer resection';
  if (kinds.some((k) => k.includes('biomarker'))) return 'biomarker';
  return kinds[0] || 'biopsy';
}

/** Ask Han Slide or Vertex AI to proofread the report on screen; one question at a time. */
async function runProofread({ auto = false } = {}) {
  const settings = loadProofSettings();
  const cs = state.caseState;
  if (!settings.on || !cs || !state.lastOut) return;
  if (state.proof.busy) {
    if (!auto) toast(state.proof.caseState === cs ? 'Proofreading is already running' : 'Proofreading is still running on the previous case; try again in a minute');
    return;
  }
  const sections = reportSections(state.lastOut);
  if (!sections.length) { if (!auto) toast('Nothing in the report to proofread yet'); return; }
  const question = buildPrompt(sections, cs.meta?.clinical || '');
  const target = proofTarget();
  state.proof = { ...state.proof, busy: !question.error, error: question.error || '', caseState: cs, startedAt: Date.now(), note: null, target };
  renderReport();
  if (question.error) return;
  const { useVertex, kind, proxyUrl } = target;
  let record = null;
  let label = target.model;
  try {
    let answer;
    if (useVertex) {
      const token = await getToken(state.config, { interactive: false }).catch(() => '');
      if (!token) throw new Error('Sign in to Google first to use Vertex AI proofreading.');
      answer = await vertexProofread({ ...question, system: VERTEX_PROOFREAD_SYSTEM_PROMPT, kind, proxyUrl, token });
      label = answer.model || 'Vertex AI';
    } else {
      answer = await hanSlideProofread({ ...question, code: settings.code });
    }
    if (state.caseState === cs) {
      const parsed = parseReply(answer.text);
      if (!parsed.readable) throw new Error(`${label}'s answer could not be read; try Proofread again.`);
      const by = useVertex
        ? `${answer.model || 'Gemini'} via Vertex AI${answer.thinkingLevel ? ` (${answer.thinkingLevel})` : ''}`
        : `${answer.model || MODEL_NAME} via Han Slide${answer.version ? ` ${answer.version}` : ''}`;
      record = newRecord({ ...vetReply(parsed, sections), sections, by, seconds: answer.seconds, previous: cs.proofread });
      cs.proofread = record;
    }
  } catch (err) {
    if (state.caseState === cs) state.proof.error = err.message || 'Proofreading failed.';
  } finally {
    if (state.proof.caseState === cs) state.proof.busy = false;
  }
  if (state.caseState !== cs) return; // another case is open now; the answer was not for it
  renderReport();
  if (!record) { if (auto) toast('Proofreading did not run; see Proofreading'); return; }
  const open = openItems(record, [], reportSections(state.lastOut)).length;
  toast(open ? `${label}: ${open} suggestion${open === 1 ? '' : 's'} in Proofreading` : `${label} found nothing to change`);
  await keepProofRecord();
}

/**
 * The record goes with the case. A case saved to Drive and unchanged since is saved again quietly;
 * otherwise the case is marked as changed and the record goes with the next save.
 */
async function keepProofRecord() {
  cacheCase(state.caseState);
  const inDrive = !state.dirty && !!state.caseState.drive?.savedAt;
  if (inDrive && isSignedIn() && !state.saving && !saveWarnings().length && await doSave({ quiet: true })) return;
  markDirty();
}

/** Settings › Proofreading › Test: check the selected backend (Han Slide, Vertex AI, or both). */
async function testHanSlide() {
  const line = $('#cfg-proofStatus');
  if (!$('#cfg-proofOn').checked) { line.textContent = 'Tick the box first: this computer contacts the proofreader only when enabled.'; return; }
  const backend = $('#cfg-proofBackend')?.value || 'hanslide';
  const proxyUrl = $('#cfg-proofProxyUrl')?.value;
  if (backend === 'hanslide') {
    line.textContent = 'Asking Han Slide\u2026';
    try { line.textContent = describeStatus(await hanSlideStatus({ code: $('#cfg-proofCode').value })); } catch (err) { line.textContent = err.message; }
    return;
  }
  const testVertex = async () => {
    const token = await getToken(state.config, { interactive: false }).catch(() => '');
    if (!token) throw new Error('Sign in to Google first to test Vertex AI.');
    return describeVertexStatus(await vertexStatus({ proxyUrl, token }));
  };
  if (backend === 'vertex') {
    line.textContent = 'Asking Vertex AI proxy\u2026';
    try { line.textContent = await testVertex(); } catch (err) { line.textContent = err.message; }
    return;
  }
  line.textContent = 'Testing Han Slide and Vertex AI proxy\u2026';
  const [hs, vx] = await Promise.allSettled([
    hanSlideStatus({ code: $('#cfg-proofCode').value }).then(describeStatus),
    testVertex()
  ]);
  const fmt = (r) => (r.status === 'fulfilled' ? r.value : r.reason?.message || 'failed');
  line.textContent = `Han Slide: ${fmt(hs)} | Vertex AI: ${fmt(vx)}`;
}

// ---------- Cancer synoptic staging & clinical QA audit (src/aiaudit.js) ----------
const AUDIT_SEV = { critical: 'Critical', warn: 'Review', info: 'Note' };
const AUDIT_CAT = { staging: 'Staging', grading: 'Grading', margins: 'Margins', laterality: 'Laterality', 'cross-part': 'Cross-part', biomarkers: 'Biomarkers', history: 'History', omission: 'Omission' };

function renderAuditBox(out) {
  const eligible = isAuditEligible(schemasInUse());
  const mine = state.audit.caseState === state.caseState;
  const busy = state.audit.busy && mine;
  const error = mine ? state.audit.error : '';
  const result = mine ? state.audit.result : null;
  const note = mine ? state.audit.note : '';
  const undo = mine ? state.audit.undo : null;
  if (!eligible && !result && !busy && !error) return null;

  const open = (result?.findings || []).filter((f) => !state.audit.dismissed.has(f.key));
  const nCrit = open.filter((f) => f.severity === 'critical').length;
  const nWarn = open.filter((f) => f.severity === 'warn').length;
  const counts = [nCrit ? `${nCrit} critical` : '', nWarn ? `${nWarn} to review` : '', open.length - nCrit - nWarn > 0 ? `${open.length - nCrit - nWarn} note${open.length - nCrit - nWarn === 1 ? '' : 's'}` : ''].filter(Boolean).join(' \u00b7 ');
  const summary = busy ? 'Gemini 4 Neon is auditing\u2026' : error ? 'did not run' : result ? (counts || 'no issues found') : 'ready to audit';
  const cls = `checks proof ${error || nCrit ? 'has-error' : nWarn ? 'has-warn' : 'info-only'}`;
  const box = el('details', { class: cls },
    el('summary', {}, el('div', { class: 'checks-head' }, el('h3', { text: 'Staging audit' }), el('span', { class: 'muted', text: summary }))));
  const line = busy ? `Auditing staging, margins, and cross-part concordance via Vertex AI at ${clock(state.audit.startedAt)}. You can keep working.`
    : result ? `${result.summary} (${result.model || 'gemini-4-neon'}, ${result.seconds || 0}s)`
      : 'Checks staging/grading arithmetic, cross-part totals, margins, biomarkers, and clinical history — and can write fixes back into the form.';
  box.append(el('p', { class: 'proof-line', text: line }));
  if (error) box.append(el('p', { class: 'proof-error', role: 'alert', text: error }));
  if (note) {
    box.append(el('div', { class: 'proof-note', role: 'status' }, el('p', { text: note }),
      el('button', { type: 'button', class: 'btn ghost small', text: 'OK', onclick: () => { state.audit.note = ''; renderReport(); } })));
  }
  if (open.length) {
    box.append(el('ul', { class: 'proof-list' }, ...open.map((f) => auditRow(f, out))));
  }
  const bar = el('div', { class: 'proof-bar' });
  bar.append(el('button', { type: 'button', class: 'btn ghost small', text: busy ? 'Auditing\u2026' : result ? 'Audit again' : 'Run staging audit', disabled: busy, onclick: () => runStagingAudit() }));
  if (undo) bar.append(el('button', { type: 'button', class: 'btn ghost small', text: 'Undo last fix', onclick: () => undoAuditFix() }));
  box.append(bar);
  box.open = localStorage.getItem('signout.audit') !== 'closed';
  box.addEventListener('toggle', () => localStorage.setItem('signout.audit', box.open ? 'open' : 'closed'));
  return box;
}

function auditRow(f, out) {
  const sev = AUDIT_SEV[f.severity] || 'Review';
  const cat = AUDIT_CAT[f.category] || f.category;
  const head = el('span', { class: 'proof-kind', text: `${sev} \u00b7 ${cat}` });
  const body = el('span', { class: 'proof-text' }, el('strong', { text: f.title }), ` \u2014 ${f.detail}`);
  if (f.fieldPatch) {
    const fp = f.fieldPatch;
    const fmt = (v) => (Array.isArray(v) ? (v.length ? v.join(', ') : '(none)') : (v === '' || v === undefined ? '(blank)' : String(v)));
    body.append(' ', el('span', { class: 'muted', text: `[Part ${fp.partLabel} · ${fp.fieldLabel}: ` }), el('del', { text: fmt(fp.before) }), ' \u2192 ', el('ins', { text: fmt(fp.after) }), el('span', { class: 'muted', text: ']' }));
  } else if (f.textPatch) {
    const tp = f.textPatch;
    body.append(' ', el('span', { class: 'muted', text: `[${tp.sectionLabel}: ` }), el('del', { text: tp.find }), ' \u2192 ', el('ins', { text: tp.replace }), el('span', { class: 'muted', text: ']' }));
  }
  const actions = el('span', { class: 'proof-actions' });
  if (f.fieldPatch || (f.textPatch && applyEdit(printedText(out, f.textPatch.section), f.textPatch) !== null)) {
    actions.append(el('button', { type: 'button', class: 'btn small', text: 'Apply to form', title: 'Write this change back into the form and regenerate the report', onclick: () => applyAuditFix(f) }));
  }
  if (f.fieldPatch) {
    actions.append(el('button', { type: 'button', class: 'btn ghost small', text: 'Jump', title: `Focus ${f.fieldPatch.fieldLabel} on Part ${f.fieldPatch.partLabel}`, onclick: () => {
      state.activePart = f.fieldPatch.partIndex;
      render();
      focusFieldNode(fieldNode(f.fieldPatch.fieldId));
    } }));
  }
  actions.append(el('button', { type: 'button', class: 'btn ghost small', text: 'Dismiss', onclick: () => { state.audit.dismissed.add(f.key); renderReport(); } }));
  const itemCls = f.severity === 'critical' ? 'flag' : f.fieldPatch || f.textPatch ? 'edit' : 'look';
  return el('li', { class: `proof-item ${itemCls}` }, head, body, actions);
}

async function runStagingAudit() {
  const cs = state.caseState;
  if (!cs || !state.lastOut) return;
  if (state.audit.busy) return toast('Staging audit is already running');
  const sections = reportSections(state.lastOut);
  const req = buildAuditPrompt({ caseState: cs, parts: cs.parts, schemaFor: (p) => schemaOf(p), sections });
  if (req.error) return toast(req.error);
  const token = await getToken(state.config, { interactive: false }).catch(() => '');
  if (!token) {
    state.audit = { ...state.audit, caseState: cs, error: 'Sign in to Google first to run Staging audit.', busy: false };
    renderReport();
    return toast('Sign in to Google first to run Staging audit');
  }
  state.audit = { busy: true, error: '', caseState: cs, startedAt: Date.now(), result: null, dismissed: new Set(), undo: null, note: '' };
  renderReport();
  try {
    const ans = await vertexAudit({
      system: req.system,
      prompt: req.prompt,
      responseSchema: AUDIT_RESPONSE_SCHEMA,
      proxyUrl: loadVertexSettings().proxyUrl,
      token
    });
    if (state.caseState !== cs) return;
    const parsed = parseAuditReply(ans.text);
    if (!parsed.readable) throw new Error('Gemini returned an unreadable audit response; try again.');
    const vetted = vetAuditFindings(parsed, cs.parts, (p) => schemaOf(p), sections);
    state.audit.result = { ...vetted, model: ans.model || 'gemini-4-neon', seconds: ans.seconds || 0 };
    const n = vetted.findings.length;
    toast(n ? `Staging audit: ${n} item${n === 1 ? '' : 's'} to review` : 'Staging audit: no issues found');
  } catch (err) {
    if (state.caseState === cs) state.audit.error = err.message || 'Staging audit failed.';
  } finally {
    if (state.audit.caseState === cs) state.audit.busy = false;
  }
  if (state.caseState === cs) renderReport();
}

function applyAuditFix(f) {
  const cs = state.caseState;
  if (!cs || !state.lastOut) return;
  if (f.fieldPatch) {
    const fp = f.fieldPatch;
    const part = cs.parts[fp.partIndex];
    if (!part) return toast('Target part no longer exists');
    const snap = applyAuditFieldPatch(schemaOf(part), templateOf(part).generator, part, fp);
    state.audit.undo = { caseState: cs, partIndex: fp.partIndex, ...snap };
    state.audit.dismissed.add(f.key);
    state.audit.note = `Updated Part ${fp.partLabel} · ${fp.fieldLabel} in the form (Undo last fix reverts it).`;
    state.activePart = fp.partIndex;
    markDirty();
    render();
    toast(`Updated ${fp.fieldLabel} in Part ${fp.partLabel}`);
    return;
  }
  if (f.textPatch) {
    const tp = f.textPatch;
    const out = generateCase(state.templates, cs);
    const before = printedText(out, tp.section);
    const next = applyEdit(before, tp);
    if (next === null) return toast('The report text has changed since the audit; run Audit again');
    const snapCase = JSON.parse(JSON.stringify({ parts: cs.parts, meta: cs.meta, options: cs.options, snippets: cs.snippets, comment: cs.comment, patches: cs.patches, edits: cs.edits }));
    const r = out.edited?.[tp.section] ? null : writeBack(state.templates, cs, tp.section, next);
    if (r) {
      for (const k of Object.keys(r.caseState)) if (!KEEP_KEYS.has(k) && JSON.stringify(r.caseState[k]) !== JSON.stringify(cs[k])) cs[k] = r.caseState[k];
      state.audit.note = r.changes.length ? `Written back into the form (${tp.sectionLabel}).` : `Applied as a reversible patch on ${tp.sectionLabel}.`;
    } else {
      cs.edits = cs.edits || {};
      cs.edits[tp.section] = next;
      state.audit.note = `Applied to ${tp.sectionLabel} as edited text (Revert goes back).`;
    }
    state.audit.undo = { caseState: cs, kind: 'case', snapCase };
    state.audit.dismissed.add(f.key);
    markDirty();
    render();
    toast(`Applied fix to ${tp.sectionLabel}`);
  }
}

function undoAuditFix() {
  const u = state.audit.undo;
  const cs = state.caseState;
  if (!u || u.caseState !== cs) return;
  if (u.kind === 'field') {
    const part = cs.parts[u.partIndex];
    if (part && part.label === u.partLabel) {
      part.values = Object.fromEntries(u.previous.map(([k, v]) => [k, Array.isArray(v) ? [...v] : v]));
    }
  } else if (u.kind === 'case' && u.snapCase) {
    Object.assign(cs, u.snapCase);
  }
  state.audit.undo = null;
  state.audit.note = 'Reverted the last staging audit fix.';
  markDirty();
  render();
  toast('Reverted staging audit fix');
}

// ---------- LIS macro / block key override ----------
const LIS_KEYS = { macro: { toggle: 'useLisMacro', label: 'macro' }, blockKey: { toggle: 'useLisBlockKey', label: 'block key' } };

/** Explain, under each pasted-text box, which text is printing in the report. */
function renderLisStatus(out) {
  const meta = state.caseState.meta;
  const nParts = state.caseState?.parts?.length || 1;
  if (nodes.lis.macro.ai && !nodes.lis.macro.ai.disabled) {
    nodes.lis.macro.ai.textContent = nParts > 1 ? `Fill all ${nParts} parts with AI` : 'Fill with AI';
  }
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

let aiMacroUndo = null;

async function fillMacroWithAi() {
  const ui = nodes.lis.macro;
  const cs = state.caseState;
  if (!cs || !cs.parts?.length) return;
  const multi = cs.parts.length > 1;
  const part = activePart();
  const req = multi
    ? buildCaseExtractPrompt({
      parts: cs.parts,
      schemaFor: (p) => schemaOf(p),
      specimen: cs.meta?.specimen || '',
      clinical: cs.meta?.clinical || '',
      macro: cs.meta?.macro || ''
    })
    : buildExtractPrompt({
      schema: schemaOf(part),
      part,
      specimen: cs.meta?.specimen || '',
      clinical: cs.meta?.clinical || '',
      macro: cs.meta?.macro || ''
    });
  if (req.error) { ui.status.textContent = req.error; return toast(req.error); }
  const token = await getToken(state.config, { interactive: false }).catch(() => '');
  if (!token) {
    const msg = 'Sign in to Google first to use Fill with AI.';
    ui.status.textContent = msg;
    return toast(msg);
  }
  ui.ai.disabled = true;
  ui.ai.textContent = 'Extracting\u2026';
  ui.status.textContent = multi
    ? `Asking Gemini to extract specimen and macro fields across all ${cs.parts.length} parts\u2026`
    : 'Asking Gemini to extract specimen and macro fields\u2026';
  try {
    const ans = await vertexExtract({
      system: req.system,
      prompt: req.prompt,
      responseSchema: multi ? CASE_EXTRACT_RESPONSE_SCHEMA : EXTRACT_RESPONSE_SCHEMA,
      maxOutputTokens: multi ? 4096 : 2048,
      proxyUrl: loadVertexSettings().proxyUrl,
      token
    });
    if (state.caseState !== cs) return;
    if (multi) {
      const parsed = parseCaseExtractReply(ans.text);
      if (!parsed.readable) throw new Error('Gemini returned an unreadable multi-part extraction reply; try again.');
      const { byPart, totalApplied } = vetCaseExtractedFields(parsed, cs.parts, (p) => schemaOf(p));
      if (!totalApplied) {
        const msg = `Gemini (${ans.seconds || 0}s) found no new macro fields to fill across ${cs.parts.length} parts.`;
        ui.status.textContent = msg;
        return toast(msg);
      }
      const { snapshots } = applyCaseExtractedFields(cs.parts, (p) => schemaOf(p), (p) => templateOf(p).generator, byPart);
      aiMacroUndo = { caseState: cs, snapshots };
      if (ui.aiUndo) ui.aiUndo.hidden = false;
      markDirty();
      render();
      const perPart = byPart.map((e) => `(${e.label}) ${e.applied.length}`).join(', ');
      ui.status.textContent = `AI filled ${totalApplied} field${totalApplied === 1 ? '' : 's'} across ${byPart.length} part${byPart.length === 1 ? '' : 's'} (${ans.seconds || 0}s): ${perPart}.`;
      toast(`AI filled ${totalApplied} field${totalApplied === 1 ? '' : 's'} across ${byPart.length} part${byPart.length === 1 ? '' : 's'}`);
    } else {
      const s = schemaOf(part);
      const g = templateOf(part).generator;
      const parsed = parseExtractReply(ans.text);
      if (!parsed.readable) throw new Error('Gemini returned an unreadable extraction reply; try again.');
      const { applied } = vetExtractedFields(parsed, s, part);
      if (!applied.length) {
        const msg = `Gemini (${ans.seconds || 0}s) found no new macro fields to fill.`;
        ui.status.textContent = msg;
        return toast(msg);
      }
      const snap = applyExtractedFields(s, g, part, applied);
      aiMacroUndo = { caseState: cs, snapshots: [{ partIndex: state.activePart, ...snap }] };
      if (ui.aiUndo) ui.aiUndo.hidden = false;
      markDirty();
      render();
      const summary = applied.slice(0, 4).map((a) => `${a.label}: ${Array.isArray(a.after) ? a.after.join(', ') : a.after}`).join('; ');
      const more = applied.length > 4 ? ` (+${applied.length - 4} more)` : '';
      ui.status.textContent = `AI filled ${applied.length} field${applied.length === 1 ? '' : 's'} (${ans.seconds || 0}s): ${summary}${more}.`;
      toast(`AI filled ${applied.length} field${applied.length === 1 ? '' : 's'} in Part ${part.label}`);
    }
  } catch (err) {
    ui.status.textContent = err.message || 'AI extraction failed.';
    toast(err.message || 'AI extraction failed');
  } finally {
    ui.ai.disabled = false;
    const n = state.caseState?.parts?.length || 1;
    ui.ai.textContent = n > 1 ? `Fill all ${n} parts with AI` : 'Fill with AI';
  }
}

function undoMacroAi() {
  const u = aiMacroUndo;
  if (!u || u.caseState !== state.caseState || !u.snapshots?.length) return;
  let reverted = 0;
  for (const snap of u.snapshots) {
    const part = state.caseState.parts[snap.partIndex];
    if (!part || part.label !== snap.partLabel) continue;
    part.values = Object.fromEntries(snap.previous.map(([k, v]) => [k, Array.isArray(v) ? [...v] : v]));
    reverted++;
  }
  aiMacroUndo = null;
  if (nodes.lis.macro.aiUndo) nodes.lis.macro.aiUndo.hidden = true;
  markDirty();
  render();
  toast(reverted > 1 ? `Reverted AI fill across ${reverted} parts` : `Reverted AI fill on Part ${u.snapshots[0].partLabel}`);
}

function initLis() {
  nodes.lis.macro.ai?.addEventListener('click', () => fillMacroWithAi());
  nodes.lis.macro.aiUndo?.addEventListener('click', () => undoMacroAi());
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

// ---------- LIS clipboard bridge (src/lisbridge.js, docs/specs/lis-bridge.md) ----------
// The LIS runs over Citrix, so nothing can read or write its fields directly and the clipboard is
// the whole interface. Out: every block as one marked payload the AHK script walks into the fields.
// In: the clipboard read into the case, either as a marked payload from the script or, for a plain
// copy done by hand, into the next empty box.

/** Copy the report as the marked payload the LIS script splits. */
async function copyForLis() {
  const out = state.lastOut;
  const keys = payloadKeys(out || {});
  if (!keys.length) return toast('Nothing in the report to copy yet');
  // Open proofreading suggestions are asked about once: the same ones do not ask again.
  const { sections, record, items } = proofView(out);
  const open = items.map((i) => i.key).join(' ');
  if (items.length && state.proof.copyAnyway !== open) {
    if (!window.confirm(`${items.length} proofreading suggestion${items.length === 1 ? ' is' : 's are'} still open. Copy for LIS anyway?`)) return;
    state.proof.copyAnyway = open;
  }
  const ok = await copyText(buildPayload(out, keys));
  if (!ok) return toast('Copy failed');
  const changed = record?.at ? changedSince(record, sections).map((k) => sectionOf(k)?.label || k) : [];
  toast(`${keys.length} block${keys.length === 1 ? '' : 's'} on the clipboard: ${keys.map(payloadLabel).join(', ')}${changed.length ? `. Changed since proofreading: ${changed.join(', ')}` : ''}`);
}

/** Apply harvested text to the case meta and refresh whatever depends on it. */
function applyCapture(fields) {
  const cs = state.caseState;
  markDirty();
  for (const [key, text] of Object.entries(fields)) {
    cs.meta[key] = text;
    if (nodes.meta[key]) nodes.meta[key].value = text;
  }
  // A captured macro refills the macro fields the same way a typed one does; a captured specimen
  // re-runs the intake strip. Everything else only changes the report.
  if (fields.macro !== undefined) { applyMacro(); render(); } else { renderIntake(); renderReport(); }
  cacheCase(cs);
}

/** Read the clipboard into the case. Reports what landed, and what the paste looked like. */
async function captureFromLis() {
  let text = '';
  try {
    text = await navigator.clipboard.readText();
  } catch {
    // Reading needs permission the browser only grants on a gesture in a secure context; a denial is
    // not recoverable from here, so say what to do instead of failing mutely.
    return setCaptureStatus('The browser would not let the app read the clipboard. Paste into the boxes directly (Ctrl+V).', true);
  }
  if (!text.trim()) return setCaptureStatus('The clipboard is empty.', true);

  const { fields, found, unknown, marked } = parseHarvest(text);

  if (!marked) {
    // A plain copy out of one LIS field: no markers to route on, so it fills the next empty box.
    const target = nextCaptureTarget(state.caseState.meta);
    if (!target) return setCaptureStatus('Every box already has text. Clear one first, or paste into it directly.', true);
    applyCapture({ [target]: fields.specimen || text.trim() });
    return setCaptureStatus(`Captured into ${captureLabel(target)}. Copy the next field in the LIS and click again.`);
  }

  if (!found.length) return setCaptureStatus(`Nothing recognised in that payload${unknown.length ? ` (markers: ${unknown.join(', ')})` : ''}.`, true);
  applyCapture(fields);
  const note = unknown.length ? ` Ignored: ${unknown.join(', ')}.` : '';
  setCaptureStatus(`Captured ${found.map(captureLabel).join(', ')}.${note}`, !!unknown.length);
  warnOnCapture(fields);
}

const CAPTURE_LABELS = { specimen: 'Specimen', clinical: 'Clinical history', macro: 'Macroscopic', blockKey: 'Block key' };
function captureLabel(key) { return CAPTURE_LABELS[key] || key; }

function setCaptureStatus(msg, warn = false) {
  const node = nodes.lisCaptureStatus;
  if (!node) return;
  node.textContent = msg;
  node.classList.toggle('warn', !!warn);
  // The hint tells you the button exists; once it has been used the status is the more useful line,
  // and two lines of grey text under one button is one too many.
  if (nodes.lisHint) nodes.lisHint.hidden = !!msg;
}

/** Identifiers checked at capture, not only at save: this text came straight out of the LIS. */
function warnOnCapture(fields) {
  const warnings = phiWarnings(Object.fromEntries(Object.entries(fields).map(([k, v]) => [captureLabel(k), v])));
  if (warnings.length) toast(`Possible patient identifiers captured — ${warnings.join('; ')}`);
}


// ---------- specimen intake (LIS paste -> parts) ----------
// The Specimen box is parsed on every keystroke; the strip below it shows one row per part with
// the suggested template (dropdown: candidates first, then every template). Parts come from "(A)"
// markers when the paste has them and otherwise from the lines and spaceless commas the LIS writes,
// so a single specimen ("Antrum") is a part without needing a letter. "Build parts"
// replaces the case's parts, pre-fills what the LIS line tells us and derives the case title.
const intake = { key: '', raw: '', rows: [], picks: {}, userPicks: new Set(), built: false, aiBusy: false, aiNote: '' };   // picks: label -> template id in the strip; userPicks: labels the user changed; built: collapsed after Build

function intakeNodes() { return { box: nodes.meta.specimen, strip: $('#intake-preview') }; }

async function parseIntakeWithAi() {
  const meta = state.caseState?.meta || {};
  const raw = meta.specimen || '';
  const req = buildIntakePrompt({ raw, clinical: meta.clinical || '', manifest: state.manifest });
  if (req.error) return toast(req.error);
  const token = await getToken(state.config, { interactive: false }).catch(() => '');
  if (!token) {
    intake.aiNote = 'Sign in to Google first to parse specimen lists with AI.';
    renderIntake();
    return toast(intake.aiNote);
  }
  intake.aiBusy = true;
  intake.aiNote = 'Asking Gemini to split parts and match templates\u2026';
  renderIntake();
  try {
    const ans = await vertexExtract({
      system: req.system,
      prompt: req.prompt,
      responseSchema: INTAKE_RESPONSE_SCHEMA,
      proxyUrl: loadVertexSettings().proxyUrl,
      token
    });
    if ((state.caseState?.meta?.specimen || '') !== raw) return;
    const parsedReply = parseIntakeReply(ans.text);
    if (!parsedReply.readable) throw new Error('Gemini returned an unreadable specimen list; try again.');
    const { parsed, rows } = vetIntakeParts(parsedReply, state.manifest, meta.clinical || '');
    if (!rows.length) {
      intake.aiNote = `Gemini (${ans.seconds || 0}s) found no specimen parts.`;
      return toast(intake.aiNote);
    }
    intake.parsed = parsed;
    intake.rows = rows;
    intake.userPicks = new Set();
    intake.picks = Object.fromEntries(rows.map((r) => [r.label, r.templateId]));
    intake.built = false;
    intake.aiNote = `AI parsed ${rows.length} part${rows.length === 1 ? '' : 's'} (${ans.seconds || 0}s) — review and click Build parts.`;
    toast(`AI parsed ${rows.length} part${rows.length === 1 ? '' : 's'}`);
  } catch (err) {
    intake.aiNote = err.message || 'AI specimen parsing failed.';
    toast(intake.aiNote);
  } finally {
    intake.aiBusy = false;
    renderIntake();
  }
}

function renderIntake() {
  const { strip } = intakeNodes();
  if (!strip) return;
  const meta = state.caseState?.meta || {};
  const raw = meta.specimen || '';
  if (!raw.trim()) { strip.hidden = true; strip.replaceChildren(); intake.key = ''; intake.raw = ''; intake.rows = []; intake.picks = {}; intake.userPicks = new Set(); intake.built = false; intake.aiNote = ''; return; }
  const key = `${raw}\u0000${meta.clinical || ''}`;
  if (key !== intake.key) {
    const parsed = parseIntake(raw);
    const history = [parsed.history, meta.clinical || ''].filter(Boolean).join('\n');
    intake.parsed = parsed;
    intake.rows = matchParts(parsed, history, state.manifest);
    if (raw !== intake.raw) { intake.userPicks = new Set(); intake.built = false; intake.aiNote = ''; }   // a new list: forget manual picks and re-expand
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
      el('td', { class: 'text', text: r.text, title: r.aiReason ? `${r.raw} — ${r.aiReason}` : r.raw }),
      el('td', { class: 'pick' }, sel),
      el('td', { class: `tier tier-${r.tier}`, text: mark, title: r.aiReason || tip }));
  }));
  const hasParts = rows.length > 0;
  const replacing = partsTouched();
  const build = el('button', { type: 'button', class: 'btn primary small', id: 'btn-build-parts', text: replacing ? 'Replace parts' : 'Build parts', disabled: !hasParts || intake.aiBusy, onclick: () => buildPartsFromIntake().catch((e) => toast(e.message)) });
  const aiBtn = el('button', { type: 'button', class: 'btn ghost small', id: 'btn-intake-ai', text: intake.aiBusy ? 'Parsing\u2026' : 'Parse with AI', disabled: intake.aiBusy, title: 'Use Gemini (Vertex AI) to split messy multi-part lists and pick the best template for each part', onclick: () => parseIntakeWithAi() });
  const summary = intake.aiNote || (hasParts ? `${rows.length} part${rows.length === 1 ? '' : 's'} · ${rows.filter((r) => r.tier === 'confident').length} confident · ${rows.filter((r) => intake.picks[r.label] === GENERIC_ID).length} generic` : '');
  const warns = [...(parsed?.warnings || [])];
  const foot = el('div', { class: 'intake-foot' }, build, aiBtn, el('span', { class: 'muted', text: summary }),
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
    prefillFromLine(s, part, r, own);
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

/**
 * Fill a fresh part of template `s` from its intake row `r` (the parsed line, its route and the case's
 * side). The role a row was routed with holds only on that template; picked onto another it is matched
 * as a plain line.
 */
function prefillFromLine(s, part, r, own) {
  const match = s.id === r.templateId ? r : { ...r, templateId: s.id, role: null };
  const preset = presetValues(s, r, match);
  // A part built from a pasted list takes its site from the paste. Where the paste names no site,
  // drop the positional default (the prostate sextant map, the IBD site series) rather than let a
  // guessed site reach the diagnosis line; a value the pathologist typed is never touched here.
  const positional = (s.partDefaults || [])[own] || {};
  for (const rule of [].concat(s.match?.fill || [])) {
    if (preset[rule.field] === undefined && positional[rule.field] !== undefined && part.values[rule.field] === positional[rule.field]) part.values[rule.field] = '';
  }
  const before = { ...part.values };
  Object.assign(part.values, preset);
  for (const k of Object.keys(preset)) applyLinkedDefaults(s, part, k, before[k], preset);
  normalisePart(s, part);
}

/**
 * The specimen line a part carries into another template: the intake row it was built from, else its
 * pasted line or a Generic part's typed specimen, matched afresh. Switching "Breast, left superior
 * margin" from Generic to the breast excision form used to reset it to the form's right / superior
 * defaults (user, 2026-10-10).
 */
function carriedRow(part) {
  const typed = templateIdOf(state.caseState, part) === GENERIC_ID ? String(part.values?.specimenName || '').trim() : '';
  const line = part.lis || typed;
  if (!line) return null;
  const row = (intake.rows || []).find((r) => r.label === part.label && r.raw === line);
  if (row) return row;
  const parsed = parseIntake(line);
  if (parsed.parts.length !== 1) return null;
  return matchParts(parsed, state.caseState.meta?.clinical || '', state.manifest)[0] || null;
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
  nodes.save.replaceChildren(
    el('span', { class: 'save-dot', 'aria-hidden': 'true' }),
    el('span', { text: state.saving ? 'Saving…' : (d?.savedAt && !state.dirty ? 'Saved' : 'Save') })
  );
  nodes.save.disabled = state.saving;
  nodes.saveNew.disabled = state.saving;
  nodes.save.classList.toggle('primary', state.dirty && !!state.caseState?.meta?.accession);
  nodes.save.classList.toggle('is-dirty', state.dirty);
  nodes.save.classList.toggle('is-saved', !state.dirty && !!d?.savedAt);
  nodes.save.title = text;
  renderCaseId();
}

/**
 * Point the live config at the signed-in account's own Drive ids. Called whenever the address
 * becomes known or changes, so two colleagues sharing one machine never write into each other's
 * folder; with nobody signed in it is the plain config.
 */
function useAccount() {
  state.config = accountConfig(loadConfig(), currentUser());
  setDraftOwner(canonicalEmail(currentUser())); // the tab's draft belongs to whoever is signed in
  return state.config;
}

function renderAccount() {
  const email = currentUser();
  const signed = isSignedIn();
  // Account state is an avatar at the end of the bar, not a text button beside Save, so it does not
  // read as a case action.
  nodes.google.querySelector('.initial').textContent = signed && email ? email.trim()[0].toUpperCase() : '';
  nodes.google.classList.toggle('signed', signed);
  const label = email ? `Google: ${email}` : (signed ? 'Signed in to Google' : 'Sign in to Google');
  nodes.google.title = label;
  nodes.google.setAttribute('aria-label', label);
}

/**
 * Show the gate instead of the workspace. `mode` is 'signin' (no Google account yet), 'refused'
 * (signed in, but not on the allow-list) or 'unconfirmed' (a built-in list is set and the signed-in
 * address could not be looked up).
 */
function showGate(mode) {
  const gate = $('#gate');
  const who = currentUser();
  const signedIn = mode === 'refused' || mode === 'unconfirmed';
  document.documentElement.dataset.gate = mode;
  gate.hidden = false;
  $('#gate-title').textContent = mode === 'refused' ? 'No access' : 'Sign-out';
  $('#gate-note').textContent = mode === 'refused'
    ? `${who || 'That account'} is not on the allowed list for this app. Sign in with a different Google account${BUILT_IN_ALLOWED.length ? '' : ', or add the address in Settings'}.`
    : mode === 'unconfirmed'
      ? 'Signed in, but the account could not be confirmed. Check the connection and reload, or sign out and sign in again.'
      : 'Sign in with Google to open the reporting workspace.';
  $('#gate-signin').hidden = signedIn;
  $('#gate-signout').hidden = !signedIn;
  $('#gate-signin').addEventListener('click', async () => {
    if (!state.config.clientId) { openSettings(); return toast('Paste the Google OAuth client id first'); }
    try { await ensureSignedIn(true, 'signin'); } catch (err) { toast(err.message); }
  });
  $('#gate-signout').addEventListener('click', () => { signOut(); location.reload(); });
  $('#gate-settings').addEventListener('click', openSettings);
  nodes.settingsForm.addEventListener('submit', (e) => {
    if (e.submitter?.value !== 'save') return;
    if (applySettingsForm().clientIdChanged) signOut();
    location.reload(); // re-run the gate against the settings that were just saved
  });
  $('#gate-signin').focus();
}

/** Drop the Google token and come back to the gate. The cached draft stays, for this account only. */
function lockApp() {
  state.leaving = true;
  cacheCase(state.caseState);
  signOut();
  location.reload();
}

const CANONICAL = 'https://hanyangtan-beep.github.io/signout-app/';
const AUTH_ORIGINS = ['https://hanyangtan-beep.github.io', 'https://han-signout.pplx.app', 'http://localhost:3000', 'http://127.0.0.1:3000'];

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
  useAccount();
  renderAccount();
  return t;
}

/**
 * Save the case to Drive. Resolves true once it is there, false when it was not saved (no accession,
 * identifiers declined, sign-in or Drive failed). `action` names what a Google sign-in round trip
 * resumes on the way back (see boot); `quiet` leaves the toast to the caller.
 */
async function doSave({ action = 'save', quiet = false } = {}) {
  if (state.saving) return false;
  const meta = state.caseState.meta;
  if (!normaliseAccession(meta.accession)) { nodes.meta.accession.focus(); toast('Enter an accession number first'); return false; }
  const warnings = saveWarnings();
  if (warnings.length && !window.confirm(`Possible patient identifiers:\n\n${warnings.join('\n')}\n\nOnly accession numbers and report text should go to Drive. Save anyway?`)) return false;
  try {
    state.saving = true; renderSaveStatus();
    cacheCase(state.caseState); // survives the Google round trip if sign-in is needed
    await ensureSignedIn(true, action);
    await driveSave(state.config, state.caseState, state.lastOut);
    state.dirty = false;
    cacheCase(state.caseState);
    if (!quiet) {
      toast(`Saved ${normaliseAccession(meta.accession)} to Drive`);
      setTimeout(proofreadIfChanged, 0); // while Ready, a changed report is proofread again
    }
    return true;
  } catch (err) {
    toast(err.message || 'Save failed');
    return false;
  } finally {
    state.saving = false; renderSaveStatus();
  }
}

/** Possible patient identifiers in what a save sends to Drive. */
function saveWarnings() {
  const meta = state.caseState.meta;
  return phiWarnings({ Specimen: meta.specimen, 'Clinical history': meta.clinical, Macroscopic: meta.macro, 'Block key': meta.blockKey, Report: state.lastOut?.report });
}

// ---------- natural breaks (docs/specs/speed.md, Phase 79) ----------
// New case and Save & new leave nothing in progress, so they are when a waiting release takes over
// and when a sign-in near its end is renewed rather than in the middle of the next save. Either
// one reloads the page: the blank case comes back from the tab's draft, and the message the user
// would have seen is kept in the tab and shown after the reload.
const NOTE_KEY = 'signout.note.v1';
function leaveNote(text) { try { sessionStorage.setItem(NOTE_KEY, text); } catch { /* preview iframe */ } }
function takeNote() {
  try { const t = sessionStorage.getItem(NOTE_KEY) || ''; sessionStorage.removeItem(NOTE_KEY); return t; } catch { return ''; }
}

/** At a break: take over a waiting release, renew a sign-in with under 10 minutes left. True when the page is leaving. */
async function atBreak(note) {
  const renew = renewalDue() && AUTH_ORIGINS.includes(location.origin) && !!state.config.clientId;
  const release = releaseReady();
  if (!renew && !release) return false;
  leaveNote(note);
  cacheCase(state.caseState);
  if (release) await handOver();
  if (renew) renewSignIn(state.config); // Google sends the browser back to the blank case
  else window.location.reload();
  return true;
}

/** A blank case of the current template, as New and Save & new start it; the tab's draft is dropped. */
async function startNewCase(note) {
  clearCase();
  await newCase(state.caseState.schemaId);
  if (await atBreak(note)) return; // reloading, or away to Google; the note follows
  toast(note);
}

/**
 * Save & new (user request 2026-10-10): save the case to Drive, then start a new case as New does.
 * The new case starts only once the save has gone through, so a refused or failed save leaves the
 * case on screen; a case already in Drive and unchanged since is not written again.
 */
async function saveAndNew() {
  if (state.saving) return;
  const accession = normaliseAccession(state.caseState.meta?.accession);
  const inDrive = !state.dirty && !!state.caseState.drive?.savedAt;
  if (!inDrive && !(await doSave({ action: 'savenew', quiet: true }))) return;
  await startNewCase(inDrive ? `${accession} is already in Drive. New case started` : `Saved ${accession} to Drive. New case started`);
}

/**
 * A line under the Open list for what the list did. A toast would sit behind the dialog's shade,
 * and a modal dialog keeps the page under it from screen readers.
 */
function openNote(text, failed = false) {
  nodes.openNote.textContent = text;
  nodes.openNote.classList.toggle('failed', failed);
}

async function openFromList(r) {
  try {
    const cs = await driveOpen(state.config, r.accession);
    await ensureTemplates(templatesInUse(cs));
    nodes.dlgOpen.close();
    setCase(cs, 0);
    toast(`Opened ${r.accession}`);
  } catch (err) { openNote(err.message, true); }
}

/** A status changed from the list reaches the case on screen when it is that case; it stays as clean or as edited as it was. */
function followStatus(accession, status) {
  const meta = state.caseState?.meta;
  if (!meta || normaliseAccession(meta.accession) !== normaliseAccession(accession)) return;
  meta.status = status;
  nodes.meta.status.value = status;
  cacheCase(state.caseState);
  renderSaveStatus();
}

/**
 * The row's status menu (user request 2026-10-27, docs/specs/open-status.md): a choice is written to
 * the Sheet row and the Doc without opening the case, and the row keeps its place; a write that
 * fails puts the menu back. A status the app does not know shows as Draft, as the top bar shows it.
 */
function statusMenu(r) {
  const menu = el('select', { class: 'case-status', 'aria-label': `Status of ${r.accession}`, title: 'Change the status without opening the case' },
    ...STATUSES.map((s) => el('option', { value: s, text: STATUS_LABEL[s] })));
  const show = (s) => { menu.value = s; menu.dataset.status = s; };
  show(statusOf(r.status) || 'draft');
  menu.addEventListener('change', async () => {
    const next = menu.value;
    menu.dataset.status = next;
    menu.disabled = true;
    try {
      const { doc } = await setCaseStatus(state.config, r.accession, next, r.doc_id);
      r.status = next;
      followStatus(r.accession, next);
      openNote(`${r.accession} marked ${STATUS_LABEL[next]}${doc === 'failed' || doc === 'no-line' ? '; its Doc was not changed' : ''}`);
    } catch (err) {
      show(statusOf(r.status) || 'draft');
      openNote(`${r.accession} not changed: ${err.message}`, true);
    } finally {
      // Disabling the focused menu sends focus to the page; it comes back so the keyboard keeps its place.
      menu.disabled = false;
      if (document.activeElement === document.body && nodes.dlgOpen.open) menu.focus();
      // A search typed meanwhile drew the list again, from the case's status before this answer.
      if (!menu.isConnected && nodes.dlgOpen.open) renderCaseList(nodes.openSearch.value);
    }
  });
  return menu;
}

function renderCaseList(filter = '') {
  const f = normaliseAccession(filter);
  const rows = state.cases.filter((r) => !f || r.accession.includes(f))
    .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  if (!rows.length) return nodes.openList.replaceChildren(el('div', { class: 'empty', text: state.cases.length ? 'No matching cases' : 'No saved cases yet' }));
  // A click anywhere on the row opens the case, as when the row was one button, except on its status menu.
  nodes.openList.replaceChildren(...rows.slice(0, 200).map((r) => el('div', {
    class: 'case-row', role: 'listitem',
    onclick: (e) => { if (!e.target.closest('.case-status')) openFromList(r); }
  },
  el('button', { type: 'button', class: 'case-open', title: `Open ${r.accession}` },
    el('span', { class: 'acc', text: r.accession }),
    el('span', { class: 'sub', text: `${String(r.template).split('+').map((id) => entryOf(id)?.label || id).join(' + ')} · ${r.parts} part${r.parts === '1' ? '' : 's'}` })),
  statusMenu(r),
  el('span', { class: 'sub', text: relTime(r.updated) }))));
}

async function doOpen() {
  nodes.openList.replaceChildren(el('div', { class: 'empty', text: 'Loading…' }));
  nodes.openSearch.value = '';
  openNote('');
  nodes.dlgOpen.showModal();
  try {
    await ensureSignedIn(true, 'open');
    state.cases = await listCases(state.config);
    renderCaseList();
  } catch (err) {
    nodes.openList.replaceChildren(el('div', { class: 'empty', text: err.message }));
  }
}

/**
 * Read the Settings form back into the stored config. Shared by the workspace and the gate, which
 * has no `initDrive` to hang a submit handler on but must still be able to fix a wrong client id
 * or add an address to the allow-list.
 */
function applySettingsForm() {
  setDensity($('#cfg-density').value);
  const patch = {};
  for (const k of ['clientId', 'folderId', 'sheetName', 'scopeMode']) patch[k] = $(`#cfg-${k}`).value.trim();
  // A built-in list is fixed in the build, so the Settings field is read-only and saves nothing.
  if (!BUILT_IN_ALLOWED.length) patch.allowedEmails = parseAllowList($('#cfg-allowedEmails').value);
  // A different sheet name, client id or scope invalidates the cached Sheet; a different folder id
  // invalidates the folder this account had resolved as well, so it is probed again on next save.
  const resetSheet = patch.sheetName !== state.config.sheetName || patch.clientId !== state.config.clientId || patch.scopeMode !== state.config.scopeMode;
  const resetFolder = patch.folderId !== (state.config.folderId || '');
  if (resetSheet || resetFolder) patch.sheetId = '';
  const hadClientId = state.config.clientId;
  saveProofSettings({ on: $('#cfg-proofOn').checked, code: $('#cfg-proofCode').value }); // this browser only
  if ($('#cfg-proofBackend')) {
    saveVertexSettings({ backend: $('#cfg-proofBackend').value, proxyUrl: $('#cfg-proofProxyUrl')?.value });
  }
  saveConfig(patch);
  useAccount(); // the account's own folder and sheet ids survive a Settings save
  if (resetFolder) rememberForAccount(state.config, { folderId: patch.folderId, sheetId: '' });
  else if (resetSheet) rememberForAccount(state.config, { sheetId: '' });
  return { clientIdChanged: patch.clientId !== hadClientId };
}

function openSettings() {
  for (const k of ['clientId', 'folderId', 'sheetName', 'scopeMode']) $(`#cfg-${k}`).value = state.config[k] || '';
  const allow = $('#cfg-allowedEmails');
  allow.disabled = BUILT_IN_ALLOWED.length > 0;
  allow.value = allow.disabled ? '' : formatAllowList(state.config.allowedEmails);
  if (allow.disabled) allow.placeholder = `Fixed in this build: ${BUILT_IN_ALLOWED.length} Google account${BUILT_IN_ALLOWED.length === 1 ? '' : 's'}`;
  $('#cfg-density').value = document.documentElement.dataset.density || 'comfortable';
  const proof = loadProofSettings();
  $('#cfg-proofOn').checked = proof.on;
  $('#cfg-proofCode').value = proof.code;
  const vertex = loadVertexSettings();
  if ($('#cfg-proofBackend')) $('#cfg-proofBackend').value = vertex.backend;
  if ($('#cfg-proofProxyUrl')) $('#cfg-proofProxyUrl').value = vertex.proxyUrl;
  $('#cfg-proofStatus').textContent = '';
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
  nodes.meta.status.addEventListener('change', proofreadIfChanged); // after 'input' has stored it
  $('#btn-proof-test').addEventListener('click', testHanSlide);
  $('#cfg-proofCode').addEventListener('blur', (e) => { e.target.value = normaliseCode(e.target.value); });
  nodes.meta.accession.addEventListener('blur', (e) => {
    const n = normaliseAccession(e.target.value);
    if (n !== e.target.value) { e.target.value = n; state.caseState.meta.accession = n; cacheCase(state.caseState); }
  });
  nodes.save.addEventListener('click', () => doSave());
  nodes.saveNew.addEventListener('click', saveAndNew);
  nodes.open.addEventListener('click', doOpen);
  nodes.openSearch.addEventListener('input', (e) => renderCaseList(e.target.value));
  nodes.google.addEventListener('click', async () => {
    if (!state.config.clientId) { openSettings(); return toast('Paste the Google OAuth client id first'); }
    try { await ensureSignedIn(true, 'signin'); toast(`Signed in as ${currentUser() || 'Google user'}`); } catch (err) { toast(err.message); }
  });
  nodes.settings.addEventListener('click', openSettings);
  nodes.roadmap.addEventListener('click', () => openRoadmap());
  nodes.suggest.addEventListener('click', () => suggest(state.activePart, false));
  nodes.settingsForm.addEventListener('submit', (e) => {
    if (e.submitter?.value !== 'save') return;
    // A new client id invalidates the token issued by the old one, so the session has to go; on the
    // signed-in site that means the gate, as for Sign out.
    if (applySettingsForm().clientIdChanged) {
      if (gateEnabled(location.hostname)) return lockApp();
      signOut();
    }
    renderAccount(); renderSaveStatus(); renderReport();
    toast('Settings saved');
  });
  // On the signed-in site Sign out is Lock: the workspace goes behind the gate instead of staying on
  // screen signed out, and the tab's draft is kept for this account only (security review
  // 2026-09-30). Signing in again always leaves for Google and reloads, so the gate runs again.
  nodes.signout.addEventListener('click', () => {
    if (gateEnabled(location.hostname)) return lockApp();
    signOut(); renderAccount(); nodes.dlgSettings.close(); toast('Signed out');
  });
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
    // Ctrl+Shift+V pairs with the bridge script's Ctrl+Alt+H: harvest in the LIS, alt-tab, one key
    // here. The script's own hotkeys are scoped to the LIS window and cannot reach this page, so
    // without this the return leg is the only step in the round trip that needs the mouse. Not while
    // typing: in a text box Ctrl+Shift+V is paste-without-formatting, and capturing a stray clipboard
    // into the meta boxes instead of pasting it where the caret is would be a wrong-field surprise.
    else if (mod && e.shiftKey && !typing && (e.key === 'V' || e.key === 'v')) { e.preventDefault(); captureFromLis(); }
    else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); state.activePart = Math.min(state.activePart + 1, state.caseState.parts.length - 1); render(); }
    else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); state.activePart = Math.max(0, state.activePart - 1); render(); }
    else if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); jumpToUnset(1); }
    else if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); jumpToUnset(-1); }
  });
}

// ---------- boot ----------
/**
 * Start the offline copy (src/offline.js). When it already runs this tab its files are on the
 * computer and it starts at once, so a release that is waiting is taken at the first break. On a
 * first open it waits until the page has loaded, so it never competes with start-up for the network.
 */
function scheduleOffline() {
  const later = () => setTimeout(startOffline, 1000);
  if (offlineRunning()) startOffline();
  else if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
}

async function boot() {
  initTheme();
  initDensity();
  mountOrganSprite(); // organ glyphs; non-blocking, falls back to a neutral glyph
  const back = consumeRedirect(); // did Google just send us back here?
  // The gate runs before any case is built, so a refused visitor gets an empty page rather than a
  // hidden-but-present workspace. Off on localhost so `npm run qa` drives the app without a
  // Google session — keyed on hostname only, never a flag a visitor could set.
  // Resolve the signed-in address before anything is decided or restored: the gate needs it, and so
  // does the tab's draft, which reopens only for the account that left it.
  if (isSignedIn() && !currentUser()) {
    await getToken(state.config, { interactive: false }).then((t) => fetchUserInfo(t)).catch(() => null);
  }
  if (gateEnabled(location.hostname)) {
    useAccount(); // a returning session picks up its own folder and sheet before anything is loaded
    const email = currentUser();
    const decision = gateState({
      enabled: true, signedIn: isSignedIn(), email, allowed: state.config.allowedEmails,
      builtIn: BUILT_IN_ALLOWED, digest: BUILT_IN_ALLOWED.length && email ? await emailDigest(email) : ''
    });
    if (decision !== 'open') {
      if (back?.error) toast(back.error === 'access_denied' ? 'Google sign-in was cancelled' : `Google sign-in failed: ${back.error}`);
      showGate(decision);
      // The sign-in screen starts the offline copy too, so a computer has it from its first open:
      // it holds the app's own files, which this screen has just loaded, and nothing from Google.
      // After the screen is up, so the copy can never stand in its way.
      scheduleOffline();
      return;
    }
  }
  [state.manifest, state.planned] = await Promise.all([loadManifest(), loadPlanned()]); // both preloaded by index.html on a build
  loadPicker();
  // A draft left on this tab by another account (locked, then somebody else signed in) is cleared
  // rather than shown to them; on the signed-in site so is an untagged one, left by the build
  // before drafts carried their account.
  const account = canonicalEmail(currentUser());
  setDraftOwner(account);
  const { caseState: saved, dropped: droppedDraft } = loadDraft(account, { strict: gateEnabled(location.hostname) });
  initDrive();
  initPalette();
  initModeSwitch();
  initCaseMenu();
  initHeaderElevation();
  nodes.caseId.addEventListener('click', () => { nodes.meta.accession.focus(); nodes.meta.accession.select?.(); });
  const defaultId = biopsyRow(state.manifest)[0]?.id || state.manifest[0].id; // most-used small biopsy
  if (saved && templatesInUse(saved).every((id) => entryOf(id))) {
    await ensureTemplates(templatesInUse(saved));
    setCase(saved, 0);
  } else await newCase(defaultId);
  if (isSignedIn() && !currentUser()) fetchUserInfo(await getToken(state.config, { interactive: false })).then(() => { useAccount(); renderAccount(); }).catch(() => {});
  const note = takeNote(); // what New case or Save & new said before a release or a renewed sign-in reloaded the page
  if (back?.error) toast(back.error === 'access_denied' ? 'Google sign-in was cancelled' : `Google sign-in failed: ${back.error}`);
  // A resumed Save or Open belonged to the draft that was cleared, so it is not carried out.
  else if (droppedDraft) toast('New case: the draft left on this tab was not saved under this account');
  else if (back?.token) {
    if (back.action === 'save') { state.dirty = true; queueMicrotask(doSave); }
    else if (back.action === 'savenew') { state.dirty = true; queueMicrotask(saveAndNew); }
    else if (back.action === 'open') queueMicrotask(doOpen);
    else if (back.action === 'renew') toast(note || 'Google sign-in renewed');
    else toast('Signed in');
  } else if (note) toast(note);

  nodes.addPart.addEventListener('click', addPart);
  nodes.example.addEventListener('click', loadExample);
  nodes.newCase.addEventListener('click', () => {
    if (state.dirty && !window.confirm('Discard unsaved changes to this case?')) return;
    startNewCase('New case').catch((err) => toast(err.message));
  });
  nodes.copyDx.addEventListener('click', () => doCopy(state.lastOut.diagnosis, 'Diagnosis'));
  nodes.copyReport.addEventListener('click', () => doCopy(state.lastOut.report, 'Full report'));
  nodes.copyLis?.addEventListener('click', copyForLis);
  nodes.lisCapture?.addEventListener('click', captureFromLis);
  nodes.revertAll.addEventListener('click', revertAllEdits);
  initKeys();
  scheduleOffline();
}

boot().catch((err) => {
  nodes.blocks.replaceChildren(el('div', { class: 'block' }, el('pre', { text: `Failed to start: ${err.message}` })));
});
