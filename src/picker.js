// Template picker logic (pure; no DOM). Feeds the header rows, the Cmd-K palette and the
// per-part template selector. `manifest` is the array from templates/manifest.json.

export const SYSTEM_ORDER = ['GI', 'Hepatobiliary', 'GU', 'Renal', 'Gynae', 'Breast', 'Thoracic', 'Head and neck', 'CNS', 'Skin', 'Cardiovascular', 'Medical', 'Lymphoid', 'Soft tissue', 'Endocrine', 'Frozen', 'Cytology', 'General'];
/** Short header labels for the system buttons (default: the system name). */
export const SYSTEM_SHORT = { Hepatobiliary: 'HPB', 'Head and neck': 'H&N', Cardiovascular: 'Cardiac', General: 'Free text' };
/** Header rows: which template kinds each row holds (user 2026-09-12). */
export const ROWS = {
  top: { label: 'Small biopsy & cytology', kinds: ['biopsy', 'cytology'] },
  bottom: { label: 'Resections & frozen', kinds: ['benign resection', 'cancer resection', 'frozen', 'generic'] }
};
export const KIND_ORDER = ['biopsy', 'benign resection', 'cancer resection', 'frozen', 'cytology'];
export const KIND_LABEL = { biopsy: 'Small biopsy', 'benign resection': 'Benign resection', 'cancer resection': 'Cancer resection', frozen: 'Frozen section', cytology: 'Cytology', generic: 'Free text' };

const byRank = (a, b) => (a.rank ?? 100) - (b.rank ?? 100) || a.shortName.localeCompare(b.shortName);
const kindIdx = (k) => { const i = KIND_ORDER.indexOf(k); return i < 0 ? KIND_ORDER.length : i; };
const systemIdx = (s) => { const i = SYSTEM_ORDER.indexOf(s); return i < 0 ? SYSTEM_ORDER.length : i; };

/** Header label: the short organ word where unambiguous, else the shortName. */
export function labelOf(t) { return t.label || t.shortName || t.name; }

export function isBiopsy(t) { return t.kind === 'biopsy'; }

/** Fixed Small biopsy row: every `kind: biopsy` template in frequency (rank) order. */
export function biopsyRow(manifest) {
  return manifest.filter(isBiopsy).sort(byRank);
}

/** Prepend `id` to a recents list (most recent first), deduped and trimmed. */
export function pushRecent(recents, id, keep = 24) {
  return [id, ...recents.filter((x) => x !== id)].slice(0, keep);
}

export function togglePin(pins, id) {
  return pins.includes(id) ? pins.filter((x) => x !== id) : [...pins, id];
}

/**
 * Header row groups: `[{ system, label, items }]` for one row, systems in SYSTEM_ORDER (small systems merged per ROW_MERGE), each with the
 * built templates of the row's kinds (pinned first, then rank) followed by the planned placeholders
 * (`planned: true`, from templates/planned.json). Systems with nothing in this row are omitted.
 * The Autopsy placeholder (kind `autopsy`) belongs to neither row — it has its own header button.
 */
/** Per-row merges of small systems into one button (key = the group shown; order = first member's SYSTEM_ORDER slot). */
export const ROW_MERGE = {
  top: { Renal: 'Medical', Hepatobiliary: 'Medical', Cardiovascular: 'Medical' },
  bottom: { Cardiovascular: 'Thoracic', 'Soft tissue': 'Skin', Endocrine: 'Head and neck' }
};
const ROW_LABEL = {
  top: { Medical: 'Medical' },
  bottom: { Skin: 'Skin / soft tissue' }
};

export function rowGroups(manifest, planned = [], row = 'top', { pins = [] } = {}) {
  const kinds = ROWS[row]?.kinds || [];
  const merge = ROW_MERGE[row] || {};
  const groups = new Map();
  const add = (t) => {
    const key = merge[t.system] || t.system;
    if (!groups.has(key)) groups.set(key, { order: Infinity, built: [], planned: [] });
    const g = groups.get(key);
    g.order = Math.min(g.order, SYSTEM_ORDER.includes(key) ? systemIdx(key) : systemIdx(t.system));
    g[t.planned ? 'planned' : 'built'].push(t);
  };
  manifest.filter((t) => kinds.includes(t.kind)).forEach(add);
  planned.filter((t) => kinds.includes(t.kind)).forEach((t) => add({ ...t, planned: true }));
  const pinIdx = (t) => { const i = pins.indexOf(t.id); return i < 0 ? pins.length : i; };
  return [...groups.entries()]
    .sort(([a, ga], [b, gb]) => ga.order - gb.order || a.localeCompare(b))
    .map(([system, g]) => ({
      system,
      label: ROW_LABEL[row]?.[system] || SYSTEM_SHORT[system] || system,
      items: [...g.built.sort((a, b) => pinIdx(a) - pinIdx(b) || kindIdx(a.kind) - kindIdx(b.kind) || byRank(a, b)), ...g.planned]
    }));
}

/** Placeholders outside the rows (today: Autopsy). */
export function standalonePlanned(planned = []) {
  return planned.filter((t) => !ROWS.top.kinds.includes(t.kind) && !ROWS.bottom.kinds.includes(t.kind)).map((t) => ({ ...t, planned: true }));
}

/** Templates grouped by system for browsing: `[{ system, items }]`, items in kind then rank order. */
export function groupBySystem(manifest, { exclude = [] } = {}) {
  const groups = new Map();
  for (const t of manifest) {
    if (exclude.includes(t.kind)) continue;
    if (!groups.has(t.system)) groups.set(t.system, []);
    groups.get(t.system).push(t);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => systemIdx(a) - systemIdx(b) || a.localeCompare(b))
    .map(([system, items]) => ({ system, items: items.sort((a, b) => kindIdx(a.kind) - kindIdx(b.kind) || byRank(a, b)) }));
}

/** Part-card selector groups: a Small biopsy group first, then the other kinds by system. */
export function selectorGroups(manifest) {
  const biopsies = biopsyRow(manifest);
  const rest = groupBySystem(manifest, { exclude: ['biopsy'] });
  return [{ label: 'Small biopsy', items: biopsies }, ...rest.map((g) => ({ label: g.system, items: g.items }))];
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[·\-–_/().,]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Free-text words the palette matches on beside the explicit fields (name and system words). */
function keywords(t) {
  return [t.name, t.system, KIND_LABEL[t.kind] || t.kind].map(norm).join(' ');
}

/**
 * Score one template for one query token. Exact shortName / label > alias > organ > keyword.
 * Returns 0 when the token matches nothing.
 */
export function scoreToken(t, tok) {
  const label = norm(labelOf(t)); const short = norm(t.shortName);
  if (tok === label || tok === short) return 100;
  if (label.startsWith(tok) || short.startsWith(tok)) return 80;
  if (short.split(' ').some((w) => w.startsWith(tok))) return 70;
  const aliases = (t.aliases || []).map(norm);
  if (aliases.some((a) => a === tok)) return 65;
  if (aliases.some((a) => a.startsWith(tok) || a.split(' ').some((w) => w.startsWith(tok)))) return 55;
  if (aliases.some((a) => a.includes(tok))) return 45;
  const organ = norm(t.organ);
  if (organ && (organ === tok || organ.startsWith(tok))) return 40;
  if (organ && organ.includes(tok)) return 35;
  const kw = keywords(t);
  if (kw.split(' ').some((w) => w.startsWith(tok))) return 25;
  if (kw.includes(tok)) return 15;
  // subsequence match on the label as a last resort ("gstr" -> gastric)
  let i = 0; for (const ch of label) if (ch === tok[i]) i++;
  return i === tok.length && tok.length >= 3 ? 5 : 0;
}

/** Rank templates for a query. Every token must match; ties break by rank. */
export function rankTemplates(manifest, query, { exclude = [] } = {}) {
  const toks = norm(query).split(' ').filter(Boolean);
  const pool = manifest.filter((t) => !exclude.includes(t.kind));
  if (toks.length === 0) return pool.slice().sort(byRank);
  const scored = [];
  for (const t of pool) {
    let total = 0;
    for (const tok of toks) {
      const s = scoreToken(t, tok);
      if (!s) { total = 0; break; }
      total += s;
    }
    if (total) scored.push({ t, score: total });
  }
  return scored.sort((a, b) => b.score - a.score || byRank(a.t, b.t)).map((x) => x.t);
}
