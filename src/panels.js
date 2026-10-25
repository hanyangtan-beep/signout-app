// The Roadmap panel and the Suggest a change dialog (docs/specs/suggestions-and-roadmap.md).
// Both are read-only with respect to the case: nothing here touches case state, Drive or the report.

import { parseRoadmap, summarise, inline, longDate } from './roadmap.js';
import { SYSTEM_WIDE, TYPES, WHERE, LIMITS, suggestionWarnings, prefillUrl, appDetails } from './suggest.js';
import { buildId, versioned } from './registry.js';

const el = (tag, attrs = {}, ...children) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v === true) n.setAttribute(k, '');
    else n.setAttribute(k, v);
  }
  // Deep flatten: rows are built as nested lists (a card's rows, each a dt and a dd).
  for (const c of children.flat(Infinity)) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
};

/** Text with `code` and **bold** spans, as nodes; everything goes in via textContent. */
const rich = (text) => inline(text).map((s) => (s.t === 'code' ? el('code', { text: s.v }) : s.t === 'strong' ? el('strong', { text: s.v }) : document.createTextNode(s.v)));

// ---------------------------------------------------------------------------------------------
// Roadmap

let roadmap = null; // the summary, fetched once per page load

async function loadRoadmap() {
  // A build ships the summary it made from docs/roadmap.md; a source checkout (browser QA, local
  // development) reads the markdown itself. Deciding on the build id avoids a 404 either way.
  if (buildId()) {
    const r = await fetch(new URL(versioned('roadmap.json'), document.baseURI));
    if (!r.ok) throw new Error(`roadmap.json: ${r.status}`);
    return r.json();
  }
  const r = await fetch(new URL('docs/roadmap.md', document.baseURI));
  if (!r.ok) throw new Error(`docs/roadmap.md: ${r.status}`);
  return { asOf: '', ...summarise(parseRoadmap(await r.text())) };
}

const HEAD_MAX = 150;

function cardNode(card, open = false) {
  return el('details', { class: 'rm-card', open },
    el('summary', {}, el('span', { class: 'rm-title' }, rich(card.title)), card.size ? el('span', { class: 'rm-size', text: card.size }) : null),
    el('dl', { class: 'rm-rows' }, card.rows.map((r) => [el('dt', { text: r.key }), el('dd', {}, rich(r.text))])));
}

function itemNode(item) {
  const long = item.head.length > HEAD_MAX;
  const head = long ? `${item.head.slice(0, HEAD_MAX).replace(/\s+\S*$/, '')}…` : item.head;
  const label = item.date ? [el('span', { class: 'rm-date', text: longDate(item.date) }), ' ', rich(head)] : rich(head);
  const body = [long ? el('p', {}, rich(item.head)) : null, item.rest ? el('p', {}, rich(item.rest)) : null,
    item.subs && item.subs.length ? el('ul', {}, item.subs.map((s) => el('li', {}, rich(s.rest ? `${s.head}: ${s.rest}` : s.head)))) : null].filter(Boolean);
  if (!body.length) return el('div', { class: 'rm-item plain' }, label);
  return el('details', { class: 'rm-item' }, el('summary', {}, label), ...body);
}

function section(title, count, ...kids) {
  return el('section', { class: 'rm-sec' }, el('h3', {}, title, count != null ? el('span', { class: 'rm-count', text: String(count) }) : null), ...kids);
}

export function roadmapNodes(data) {
  const later = data.later.items.length + data.later.cards.length;
  const more = data.done.total - data.done.items.length;
  return [
    section('Now', data.now.cards.length || null, data.now.notes.map((n) => el('p', { class: 'rm-note' }, rich(n))), data.now.cards.map((c) => cardNode(c, true))),
    section('Next', data.next.cards.length, data.next.cards.map((c) => cardNode(c))),
    section('Later', later, data.later.items.map(itemNode), data.later.cards.map((c) => cardNode(c))),
    section('Recently done', null, data.done.items.map(itemNode),
      more > 0 ? el('p', { class: 'field-note', text: `${more} earlier Done lines are in the full roadmap.` }) : null)
  ];
}

export async function openRoadmap() {
  const dlg = document.getElementById('dlg-roadmap');
  const body = dlg.querySelector('.rm-body');
  const asOf = dlg.querySelector('#roadmap-asof');
  if (!dlg.open) dlg.showModal();
  if (!roadmap) {
    body.replaceChildren(el('p', { class: 'field-note', text: 'Loading the roadmap…' }));
    try { roadmap = await loadRoadmap(); } catch (err) {
      body.replaceChildren(el('p', { class: 'field-note', text: `The roadmap could not be loaded (${err.message}).` }));
      return;
    }
  }
  asOf.replaceChildren(roadmap.asOf ? `As of ${longDate(roadmap.asOf)}. ` : 'Working copy. ', ...(roadmap.state ? rich(roadmap.state.replace(/^State on \d{4}-\d{2}-\d{2}: /, '')) : []));
  body.replaceChildren(...roadmapNodes(roadmap));
}

// ---------------------------------------------------------------------------------------------
// Suggest a change

/**
 * ctx: {
 *   groups:  [{ label, items: [{ id, name, version }] }]  — every built template, as the part picker lists them
 *   current: { id, name, version, choices } | null        — the part the dialog was opened from (or the active part)
 *   initial: template id to preselect, '' for system-wide
 *   email:   the signed-in Google account, if any
 *   layout:  'desktop' | 'phone'
 *   toast:   (message) => void
 * }
 */
export function openSuggest(ctx) {
  const dlg = document.getElementById('dlg-suggest');
  const body = dlg.querySelector('.sg-body');
  const byId = new Map(ctx.groups.flatMap((g) => g.items).map((t) => [t.id, t]));
  const current = ctx.current || null;

  const about = el('select', { class: 'input', id: 'sg-about' },
    el('option', { value: '', text: SYSTEM_WIDE }),
    ctx.groups.map((g) => el('optgroup', { label: g.label }, g.items.map((t) => el('option', { value: t.id, text: t.name })))));
  about.value = byId.has(ctx.initial) ? ctx.initial : '';

  const type = el('select', { class: 'input', id: 'sg-type' }, TYPES.map((t) => el('option', { value: t, text: t })));
  const where = el('div', { class: 'chips multi', id: 'sg-where', role: 'group', 'aria-labelledby': 'sg-where-label' },
    WHERE.map((w) => el('button', {
      type: 'button', class: 'chip', 'aria-pressed': 'false', text: w,
      onclick: (e) => e.currentTarget.setAttribute('aria-pressed', e.currentTarget.getAttribute('aria-pressed') === 'true' ? 'false' : 'true')
    })));
  const text = el('textarea', {
    class: 'input', id: 'sg-text', rows: '6', maxlength: String(LIMITS.suggestion),
    placeholder: 'What should change, or what is wrong? For an error, say what printed and what it should say.'
  });
  const attach = el('input', { type: 'checkbox', id: 'sg-attach' });
  const preview = el('pre', { class: 'sg-preview', id: 'sg-preview', text: current?.choices || '' });
  const attachRow = el('div', { class: 'field sg-attach' },
    el('label', { class: 'check' }, attach, ' Attach this part\u2019s form choices'),
    el('p', { class: 'field-note', text: 'Only the dropdowns and tick boxes changed from the template default. Never free text, numbers, the specimen line or the report.' }),
    el('details', {}, el('summary', { text: 'What will be attached' }), preview));
  const error = el('p', { class: 'sg-error', id: 'sg-error', role: 'alert', hidden: true });

  const syncAttach = () => {
    const on = !!(current && current.choices && about.value === current.id);
    attachRow.hidden = !on;
    if (!on) attach.checked = false;
  };
  about.addEventListener('change', syncAttach);
  syncAttach();

  const fail = (msg) => { error.textContent = msg; error.hidden = false; };
  text.addEventListener('input', () => { error.hidden = true; });

  const send = () => {
    const suggestion = text.value.trim();
    if (!suggestion) { fail('Write the suggestion first.'); text.focus(); return; }
    const warnings = suggestionWarnings(suggestion);
    if (warnings.length) { fail(`Remove patient details before sending: the text ${warnings.join('; ')}.`); text.focus(); return; }
    const t = byId.get(about.value) || null;
    const isCurrent = !!(t && current && t.id === current.id);
    const url = prefillUrl({
      template: t ? `${t.name} (${t.id})` : SYSTEM_WIDE,
      type: type.value,
      where: [...where.querySelectorAll('.chip[aria-pressed="true"]')].map((b) => b.textContent),
      suggestion,
      choices: attach.checked && isCurrent ? current.choices : '',
      by: ctx.email || '',
      app: appDetails({ build: buildId(), templateId: t ? t.id : '', version: isCurrent ? current.version : (t?.version || ''), layout: ctx.layout })
    });
    window.open(url, '_blank', 'noopener');
    dlg.close();
    if (ctx.toast) ctx.toast('Google Forms opened in a new tab. Press Submit there to send it.');
  };

  body.replaceChildren(
    el('div', { class: 'field' }, el('label', { for: 'sg-about', text: 'About' }), about),
    el('div', { class: 'field' }, el('label', { for: 'sg-type', text: 'Type' }), type),
    el('div', { class: 'field' }, el('label', { id: 'sg-where-label', text: 'Where (optional)' }), where),
    el('div', { class: 'field' }, el('label', { for: 'sg-text', text: 'Suggestion' }), text,
      el('p', { class: 'field-note', text: 'No patient details: no names, HKID, hospital or accession numbers, and no report text.' })),
    attachRow,
    error,
    el('div', { class: 'dialog-actions' },
      el('p', { class: 'field-note sg-foot', text: `Opens Google Forms in a new tab with this filled in${ctx.email ? `, including your account (${ctx.email})` : ''}; press Submit there. Only the app\u2019s owner sees responses.` }),
      el('button', { type: 'button', class: 'btn primary', id: 'sg-open', text: 'Open the form', onclick: send }))
  );
  if (!dlg.open) dlg.showModal();
  text.focus();
}
