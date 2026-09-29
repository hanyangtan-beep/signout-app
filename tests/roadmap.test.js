// Phase 46: the in-app Roadmap panel reads docs/roadmap.md (docs/specs/suggestions-and-roadmap.md).
// The parser is pinned on a small sample, and the live roadmap is read too, so a format change
// that would empty the panel fails here rather than on the published site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseRoadmap, summarise, splitHeading, splitItem, inline, longDate, DONE_IN_SUMMARY } from '../src/roadmap.js';

const SAMPLE = `# Sample — Roadmap

Rules paragraph.

State on 2026-09-29: 3 templates.

## Done

Newest first.

- 2026-09-29 — Second thing (pulled by the user): what shipped, with \`code\`.
- 2026-09-28 — First thing: detail.

## Now

### Current card — pulled by the user 2026-09-29   Size: S
Why:        because.
Change:     one line
            that wraps.
Depends on: nothing.

## Next

Build order note.

### Next card          Size: M; batch 4
Why:        later.

### Group note (user request 2026-09-24)
Measure:    counts.

## Later

- Plain idea (user request 2026-09-29): the detail.
- **Bold name** (moved to Later): the reason.
- An idea with no colon. It has a second sentence.
- Parent idea (each a card):
  - Child one (M): detail.
  - Child two (L): detail.

One line each.

### Later card   Size: L
Why:        deferred.

## Parked

- Not in the summary.
`;

test('card headings split into title and size', () => {
  assert.deepEqual(splitHeading('Kidney — non-neoplastic nephrectomy        Size: M; batch 4'), { title: 'Kidney — non-neoplastic nephrectomy', size: 'M; batch 4' });
  assert.deepEqual(splitHeading('Benign resections — group note (user request 2026-09-24)'), { title: 'Benign resections — group note (user request 2026-09-24)', size: '' });
});

test('items take their name from bold, a colon or the first sentence', () => {
  assert.deepEqual(splitItem('2026-09-27 — Sinonasal detail (pulled by the user): detail here.'), { date: '2026-09-27', head: 'Sinonasal detail (pulled by the user)', rest: 'detail here.', subs: [] });
  assert.equal(splitItem('**CNS trial** (moved to Later): why').head, 'CNS trial');
  assert.equal(splitItem('**CNS trial** (moved to Later): why').rest, '(moved to Later): why');
  assert.deepEqual(splitItem('Liver — neoplastic. 29 cases in the export: all resections.'), { date: '', head: 'Liver — neoplastic', rest: '29 cases in the export: all resections.', subs: [] });
  assert.deepEqual(splitItem('Snippet library editable as Markdown'), { date: '', head: 'Snippet library editable as Markdown', rest: '', subs: [] });
});

test('the sample parses into four sections with cards, rows, items and sub-items', () => {
  const p = parseRoadmap(SAMPLE);
  assert.equal(p.title, 'Sample — Roadmap');
  assert.equal(p.state, 'State on 2026-09-29: 3 templates.');
  assert.deepEqual(Object.keys(p.sections).sort(), ['done', 'later', 'next', 'now']);
  const now = p.sections.now.cards[0];
  assert.equal(now.title, 'Current card — pulled by the user 2026-09-29');
  assert.equal(now.size, 'S');
  assert.deepEqual(now.rows, [
    { key: 'Why', text: 'because.' },
    { key: 'Change', text: 'one line that wraps.' },
    { key: 'Depends on', text: 'nothing.' }
  ]);
  assert.deepEqual(p.sections.next.cards.map((c) => [c.title, c.size]), [['Next card', 'M; batch 4'], ['Group note (user request 2026-09-24)', '']]);
  assert.deepEqual(p.sections.next.notes, ['Build order note.']);
  const later = p.sections.later;
  assert.deepEqual(later.items.map((i) => i.head), ['Plain idea (user request 2026-09-29)', 'Bold name', 'An idea with no colon', 'Parent idea (each a card)']);
  assert.deepEqual(later.items[3].subs.map((s) => s.head), ['Child one (M)', 'Child two (L)']);
  assert.deepEqual(later.notes, ['One line each.']);
  assert.equal(later.cards[0].title, 'Later card');
  assert.deepEqual(p.sections.done.items.map((i) => i.date), ['2026-09-29', '2026-09-28']);
  assert.ok(!JSON.stringify(p).includes('Not in the summary'), 'Parked is not read');
});

test('the summary keeps Now, Next cards, Later and the newest Done lines', () => {
  const s = summarise(parseRoadmap(SAMPLE), { done: 1 });
  assert.deepEqual(Object.keys(s), ['title', 'state', 'now', 'next', 'later', 'done']);
  assert.equal(s.now.cards.length, 1);
  assert.equal(s.next.cards.length, 2);
  assert.equal(s.next.notes, undefined);
  assert.equal(s.later.items.length, 4);
  assert.deepEqual(s.done, { items: [parseRoadmap(SAMPLE).sections.done.items[0]], total: 2 });
});

test('the live roadmap fills every section of the panel', () => {
  const p = parseRoadmap(readFileSync(new URL('../docs/roadmap.md', import.meta.url), 'utf8'));
  const s = p.sections;
  assert.ok(s.now.cards.length + s.now.notes.length > 0, 'Now says something, even if only that it is empty');
  assert.ok(s.now.cards.length <= 3, 'Now holds at most three cards');
  assert.ok(s.next.cards.length > 0 && s.next.cards.every((c) => c.title && c.rows.length), 'every Next card has a title and rows');
  assert.ok(s.later.items.length > 0, 'Later has items');
  assert.ok(s.done.items.length >= DONE_IN_SUMMARY, 'Done has at least a summary’s worth of lines');
  const dates = s.done.items.map((i) => i.date);
  assert.ok(dates.every(Boolean), 'every Done line opens with its date');
  assert.deepEqual([...dates].sort().reverse(), dates, 'Done is newest first');
  assert.equal(summarise(p).done.items.length, DONE_IN_SUMMARY);
});

test('inline spans and dates render as the panel expects', () => {
  assert.deepEqual(inline('a `b` **c** d'), [{ t: 'text', v: 'a ' }, { t: 'code', v: 'b' }, { t: 'text', v: ' ' }, { t: 'strong', v: 'c' }, { t: 'text', v: ' d' }]);
  assert.deepEqual(inline('<b>not html</b>'), [{ t: 'text', v: '<b>not html</b>' }]);
  assert.equal(longDate('2026-09-29'), '29 September 2026');
  assert.equal(longDate('2026-01-05T10:00:00+08:00'), '5 January 2026');
  assert.equal(longDate('soon'), 'soon');
});
