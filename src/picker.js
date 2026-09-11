// Template picker logic (pure; no DOM). Feeds the header rows, the Cmd-K palette and the
// per-part template selector. `manifest` is the array from templates/manifest.json.

export const SYSTEM_ORDER = ['GI', 'Hepatobiliary', 'GU', 'Gynae', 'Breast', 'Thoracic', 'Head and neck', 'Skin', 'Cardiovascular', 'Lymphoid', 'Soft tissue', 'Endocrine', 'Frozen', 'Cytology'];
export const KIND_ORDER = ['biopsy', 'benign resection', 'cancer resection', 'frozen', 'cytology'];
export const KIND_LABEL = { biopsy: 'Small biopsy', 'benign resection': 'Benign resection', 'cancer resection': 'Cancer resection', frozen: 'Frozen section', cytology: 'Cytology' };
export const STRIP_CAP = 8;
export const BIOPSY_ROW_MAX = 12; // beyond this the row collapses to the top BIOPSY_ROW_COLLAPSED + "More"
export const BIOPSY_ROW_COLLAPSED = 8;

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

/** The row as shown: `{ shown, overflow }` — collapses to the top 8 when it outgrows one line. */
export function biopsyRowLayout(manifest, max = BIOPSY_ROW_MAX, collapsed = BIOPSY_ROW_COLLAPSED) {
  const row = biopsyRow(manifest);
  if (row.length <= max) return { shown: row, overflow: [] };
  return { shown: row.slice(0, collapsed), overflow: row.slice(collapsed) };
}

/**
 * Resections strip: pinned ids first (in pin order), then recents (most recent first), deduped,
 * biopsies excluded (they have their own row), capped. Any slots left are filled with the other
 * non-biopsy templates in rank order, so a small install shows everything.
 */
export function resectionStrip(manifest, pins = [], recents = [], cap = STRIP_CAP) {
  const byId = new Map(manifest.map((t) => [t.id, t]));
  const out = [];
  const seen = new Set();
  const push = (id) => {
    const t = byId.get(id);
    if (!t || isBiopsy(t) || seen.has(id) || out.length >= cap) return;
    seen.add(id); out.push(t);
  };
  pins.forEach(push);
  recents.forEach(push);
  manifest.filter((t) => !isBiopsy(t)).sort(byRank).forEach((t) => push(t.id));
  return out;
}

/** Prepend `id` to a recents list (most recent first), deduped and trimmed. */
export function pushRecent(recents, id, keep = 24) {
  return [id, ...recents.filter((x) => x !== id)].slice(0, keep);
}

export function togglePin(pins, id) {
  return pins.includes(id) ? pins.filter((x) => x !== id) : [...pins, id];
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
