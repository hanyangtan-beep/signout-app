// Roadmap summary for the in-app Roadmap panel (docs/specs/suggestions-and-roadmap.md).
//
// Pure: reads docs/roadmap.md into its sections and cards. tools/build.js runs it at build time
// and ships the summary as dist/roadmap.json; a source checkout (no build id) fetches the markdown
// and parses it in the browser with the same functions, so the two views cannot disagree.
//
// The roadmap's own format (docs/roadmap-template.md) is what this reads: `## Now`, `## Next`,
// `## Later` and `## Done`; cards are `### Title   Size: …` followed by `Key:  text` rows; one-line
// items are `- …` bullets; Done bullets open with the ship date, `- YYYY-MM-DD — …`.

export const SECTIONS = ['now', 'next', 'later', 'done'];

/** Newest Done lines the summary keeps (the panel says how many more the full roadmap has). */
export const DONE_IN_SUMMARY = 10;

/** "Kidney — non-neoplastic nephrectomy        Size: M; batch 4" → { title, size }. */
export function splitHeading(text) {
  const t = String(text || '').trim();
  const m = /^(.*\S)\s+Size:\s*(.+)$/.exec(t);
  return m ? { title: m[1].trim(), size: m[2].trim() } : { title: t, size: '' };
}

/**
 * One bullet → { date, head, rest, subs }. A Done line's date comes off the front. The head is the
 * item's name as the roadmap writes it: a leading **bold** name, else the text before the first
 * ": " when that comes before the first sentence ends, else the first sentence; the rest is the
 * detail. `subs` collects indented bullets under it.
 */
export function splitItem(text) {
  let t = String(text || '').trim();
  let date = '';
  const d = /^(\d{4}-\d{2}-\d{2})\s+[—-]\s+/.exec(t);
  if (d) { date = d[1]; t = t.slice(d[0].length); }
  const item = (head, rest) => ({ date, head: head.trim(), rest: rest.trim(), subs: [] });
  const bold = /^\*\*([^*]+)\*\*[\s:.,;—-]*/.exec(t);
  if (bold) return item(bold[1], t.slice(bold[0].length));
  const colon = t.indexOf(': ');
  const stop = t.indexOf('. ');
  if (colon > 0 && colon <= 240 && (stop < 0 || colon < stop)) return item(t.slice(0, colon), t.slice(colon + 2));
  if (stop > 0 && stop <= 240) return item(t.slice(0, stop), t.slice(stop + 2));
  return item(t.replace(/:$/, ''), '');
}

const ROW = /^([A-Z][A-Za-z]*(?: [a-z]+)?):\s+(.*)$/;

/** The whole roadmap: { title, state, sections: { now, next, later, done } }, each { notes, items, cards }. */
export function parseRoadmap(md) {
  const out = { title: '', state: '', sections: {} };
  let sec = null;
  let card = null;
  for (const raw of String(md || '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    let m;
    if ((m = /^# (.+)$/.exec(line))) { out.title = m[1].trim(); continue; }
    if ((m = /^## (.+)$/.exec(line))) {
      const key = m[1].trim().toLowerCase();
      sec = SECTIONS.includes(key) ? (out.sections[key] = { notes: [], items: [], cards: [] }) : null;
      card = null;
      continue;
    }
    if (!sec) {
      if (!out.state && /^State on \d{4}-\d{2}-\d{2}/.test(line)) out.state = line.trim();
      continue;
    }
    if ((m = /^### (.+)$/.exec(line))) {
      card = { ...splitHeading(m[1]), rows: [] };
      sec.cards.push(card);
      continue;
    }
    if (line.trim() === '' || line.trim() === '---') continue;
    if (card) {
      // Cards end at the next heading; everything under one is a row of that card.
      if ((m = ROW.exec(line))) card.rows.push({ key: m[1], text: m[2].trim() });
      else if ((m = /^\s*- (.*)$/.exec(line))) card.rows.push({ key: '', text: m[1].trim() });
      else if (card.rows.length) card.rows[card.rows.length - 1].text += ' ' + line.trim();
      else card.rows.push({ key: '', text: line.trim() });
      continue;
    }
    if ((m = /^- (.*)$/.exec(line))) { sec.items.push(splitItem(m[1])); continue; }
    if ((m = /^\s+- (.*)$/.exec(line)) && sec.items.length) { sec.items[sec.items.length - 1].subs.push(splitItem(m[1])); continue; }
    sec.notes.push(line.trim());
  }
  for (const key of SECTIONS) if (!out.sections[key]) out.sections[key] = { notes: [], items: [], cards: [] };
  return out;
}

/**
 * The panel's summary: Now in full, Next cards, Later items and cards, and the newest Done lines.
 * Next's build-order notes and the Parked, Deployment and Risks sections stay in the full roadmap.
 */
export function summarise(parsed, { done = DONE_IN_SUMMARY } = {}) {
  const s = parsed.sections;
  return {
    title: parsed.title,
    state: parsed.state,
    now: { notes: s.now.notes, cards: s.now.cards },
    next: { cards: s.next.cards },
    later: { items: s.later.items, cards: s.later.cards },
    done: { items: s.done.items.slice(0, done), total: s.done.items.length }
  };
}

/** `code` and **bold** spans as [{ t: 'text' | 'code' | 'strong', v }]; the panel sets textContent only. */
export function inline(text) {
  const src = String(text || '');
  const out = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ t: 'text', v: src.slice(last, m.index) });
    out.push(m[1] !== undefined ? { t: 'code', v: m[1] } : { t: 'strong', v: m[2] });
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ t: 'text', v: src.slice(last) });
  return out;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-09-29" → "29 September 2026"; anything else unchanged. */
export function longDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(iso || '');
}
