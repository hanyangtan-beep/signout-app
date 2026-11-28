// PHI-free AI feedback telemetry log and live personal AI preference rules.
//
// 1. Implicit telemetry log (localStorage rolling buffer, max 500 events): records workflow runs,
//    accepts, applies, dismissals, undos, and explicit quality flags — strictly metadata only
//    (never accession numbers, patient details, or raw clinical prose).
// 2. Live AI preferences ("never-do-this" / house rules): personal one-line rules appended to
//    every Vertex AI system prompt so all AI workflows adapt immediately without a code deploy.

const RULES_KEY = 'signout.ai.rules.v1';
const LOG_KEY = 'signout.ai.log.v1';
const MAX_RULES = 40;
const MAX_RULE_LEN = 200;
const MAX_LOG_EVENTS = 500;

export const FLAG_REASONS = [
  { id: 'hallucinated', label: 'Hallucinated' },
  { id: 'wrong-option', label: 'Wrong option' },
  { id: 'noisy', label: 'Noisy nitpick' },
  { id: 'missed', label: 'Missed finding' }
];

const VALID_REASONS = new Set(FLAG_REASONS.map((r) => r.id));

/** Parse newline-separated personal AI rules into a deduplicated, length-capped list. */
export function parseAiRules(input) {
  const rawList = Array.isArray(input) ? input : String(input ?? '').split(/\r?\n/);
  const seen = new Set();
  const out = [];
  for (const line of rawList) {
    const clean = String(line ?? '')
      .replace(/^\s*[-*\u2022]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_RULE_LEN);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= MAX_RULES) break;
  }
  return out;
}

export function formatAiRules(rules = []) {
  return parseAiRules(rules).join('\n');
}

export function loadAiRules(storage = globalThis.localStorage) {
  try {
    const raw = JSON.parse(storage?.getItem(RULES_KEY) || '[]');
    return parseAiRules(Array.isArray(raw) ? raw : []);
  } catch {
    return [];
  }
}

export function saveAiRules(rulesOrText, storage = globalThis.localStorage) {
  const clean = parseAiRules(rulesOrText);
  try { storage?.setItem(RULES_KEY, JSON.stringify(clean)); } catch { /* private mode */ }
  return clean;
}

/** Append one new personal AI rule if non-empty and not already present. */
export function addAiRule(ruleText, storage = globalThis.localStorage) {
  const existing = loadAiRules(storage);
  const candidate = parseAiRules([ruleText])[0];
  if (!candidate) return { rules: existing, added: false };
  if (existing.some((r) => r.toLowerCase() === candidate.toLowerCase())) {
    return { rules: existing, added: false };
  }
  const rules = saveAiRules([...existing, candidate], storage);
  return { rules, added: true };
}

/** Merge local and Drive-synced AI rules without case-insensitive duplicates (remote rules first, local additions preserved). */
export function mergeAiRules(localRules = [], remoteRules = []) {
  return parseAiRules([...(Array.isArray(remoteRules) ? remoteRules : []), ...(Array.isArray(localRules) ? localRules : [])]);
}

/** Append the consultant's personal preference rules to any AI system prompt. */
export function appendRulesToSystem(system, rules = []) {
  const base = String(system ?? '');
  const list = parseAiRules(rules);
  if (!list.length) return base;
  return [
    base,
    '',
    'Consultant personal preferences (follow strictly unless contradicted by explicit clinical facts):',
    ...list.map((r) => `- ${r}`)
  ].join('\n');
}

// ---------- Implicit PHI-free AI Telemetry Log ----------

const safeToken = (s, max = 64) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);

export function loadAiLog(storage = globalThis.localStorage) {
  try {
    const raw = JSON.parse(storage?.getItem(LOG_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function clearAiLog(storage = globalThis.localStorage) {
  try { storage?.removeItem(LOG_KEY); } catch { /* private mode */ }
}

/**
 * Record one PHI-free AI interaction event (metadata only — never patient or report text).
 * `action`: 'run' | 'accepted' | 'applied' | 'dismissed' | 'undone' | 'flagged'
 */
export function recordAiEvent({
  workflow = '',
  action = '',
  templateId = '',
  model = '',
  seconds = 0,
  reason = '',
  tag = '',
  count = 0
} = {}, storage = globalThis.localStorage) {
  const wf = safeToken(workflow, 32).toLowerCase();
  const act = safeToken(action, 24).toLowerCase();
  if (!wf || !act) return null;

  const entry = {
    at: new Date().toISOString(),
    workflow: wf,
    action: act,
    ...(templateId ? { templateId: safeToken(templateId, 48) } : {}),
    ...(model ? { model: safeToken(model, 48) } : {}),
    ...(Number.isFinite(seconds) && seconds > 0 ? { seconds: Math.round(seconds * 10) / 10 } : {}),
    ...(reason && VALID_REASONS.has(reason) ? { reason } : {}),
    ...(tag ? { tag: safeToken(tag, 48) } : {}),
    ...(Number.isInteger(count) && count > 0 ? { count } : {})
  };

  const list = loadAiLog(storage);
  list.push(entry);
  const trimmed = list.length > MAX_LOG_EVENTS ? list.slice(list.length - MAX_LOG_EVENTS) : list;
  try { storage?.setItem(LOG_KEY, JSON.stringify(trimmed)); } catch { /* private mode */ }
  return entry;
}

/** Aggregate telemetry counts and latency by AI workflow for Settings / export. */
export function summariseAiLog(events = []) {
  const map = new Map();
  for (const e of events || []) {
    if (!e?.workflow || !e?.action) continue;
    let row = map.get(e.workflow);
    if (!row) {
      row = { workflow: e.workflow, runs: 0, accepted: 0, applied: 0, dismissed: 0, undone: 0, flagged: 0, totalSeconds: 0, timedRuns: 0 };
      map.set(e.workflow, row);
    }
    if (e.action === 'run') {
      row.runs++;
      if (Number.isFinite(e.seconds) && e.seconds > 0) { row.totalSeconds += e.seconds; row.timedRuns++; }
    } else if (e.action === 'accepted') row.accepted += e.count || 1;
    else if (e.action === 'applied') row.applied += e.count || 1;
    else if (e.action === 'dismissed') row.dismissed++;
    else if (e.action === 'undone') row.undone++;
    else if (e.action === 'flagged') row.flagged++;
  }
  const byWorkflow = [...map.values()].map((r) => ({
    workflow: r.workflow,
    runs: r.runs,
    accepted: r.accepted,
    applied: r.applied,
    dismissed: r.dismissed,
    undone: r.undone,
    flagged: r.flagged,
    avgSeconds: r.timedRuns ? Math.round((r.totalSeconds / r.timedRuns) * 10) / 10 : 0
  })).sort((a, b) => b.runs - a.runs || a.workflow.localeCompare(b.workflow));

  return { total: (events || []).length, byWorkflow };
}

/** Compact one-line summary for Settings › AI Feedback. */
export function formatAiLogSummary(events = []) {
  const s = summariseAiLog(events);
  if (!s.total) return 'No AI events logged yet on this browser.';
  const runs = s.byWorkflow.reduce((n, r) => n + r.runs, 0);
  const pos = s.byWorkflow.reduce((n, r) => n + r.accepted + r.applied, 0);
  const neg = s.byWorkflow.reduce((n, r) => n + r.dismissed + r.undone + r.flagged, 0);
  const parts = [`${runs} run${runs === 1 ? '' : 's'}`];
  if (pos) parts.push(`${pos} accepted/applied`);
  if (neg) parts.push(`${neg} dismissed/undone/flagged`);
  const top = s.byWorkflow.slice(0, 3).map((r) => `${r.workflow}:${r.runs}`).join(', ');
  return `${parts.join(' · ')}${top ? ` (${top})` : ''}.`;
}

/** Build a PHI-free JSON export payload of AI rules + telemetry summary + events. */
export function exportAiLogPayload(events = [], rules = []) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    rules: parseAiRules(rules),
    summary: summariseAiLog(events),
    events: Array.isArray(events) ? events : []
  };
}
