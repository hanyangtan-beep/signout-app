// CNS algorithmic diagnosis - trial surface.
//
// The app already has both halves of this: a guided intake that asks the funnel one question at a
// time (src/cnswizard.js), and a read-only pathway that shows where the case stands against the
// published order (src/cnspathway.js). They sit in different places and neither knows about the
// other. This trial puts them on one screen and turns the relationship round: the flowchart is the
// screen, and the questions open on the chart, on the node that is asking them.
//
// It is a trial. It is not wired into index.html, it writes nothing to Drive, and it imports the
// shipped modules unchanged - engine, wizard, pathway, generators - so it cannot drift from the app
// while the design is being argued about. The only new piece is ./nodefields.js, the map from a
// node on the chart to the fields behind it; that is the piece that would move into the pathway
// module on a merge.
//
// Nothing here is printed into a report. The node text belongs to the pathway module, which is
// panel-only copy; the diagnosis line at the foot is the app's own generator output, shown so the
// effect of an answer is visible immediately.
//
// Knowledge grounding for the node text lives in src/cnspathway.js and generators/cns_layers.js.
// Research behind the design, including why no published figure could be reused, is in
// analysis/cns-algorithm-research.md.

import { defaultValues, isVisible, toggleOption, optionsFor } from '../../src/engine.js';
import { pathway, pathwayChart, pathwaySupported } from '../../src/cnspathway.js';
import { wizardSteps, cautions } from '../../src/cnswizard.js';
import { integratedDiagnosis, proposedGrade, pathwayChecks, entity } from '../../generators/cns_layers.js';
import { nodeFields } from './nodefields.js';

// ---------- state ----------

const state = {
  schemaId: 'cns_tumour',
  schema: null,
  steps: [],
  values: {},
  open: null,      // the node key whose question is open
  touched: false,  // has the user answered anything yet
};

const SCHEMAS = {
  cns_tumour: '../../schemas/cns_tumour.json',
  cns_biopsy: '../../schemas/cns_biopsy.json',
};

// Starting points, so the chart can be seen doing something without twenty clicks first. Each is a
// plausible referral in-house, nothing more: they set the same fields the form would set.
const SCENARIOS = {
  cns_tumour: [
    { id: 'blank', label: 'Empty form', values: {} },
    {
      id: 'astro',
      label: 'Frontal glioma, 38 years',
      // `features` is cleared deliberately: the resection schema pre-ticks a common set, and a
      // starting point that arrives already carrying microvascular proliferation would hand the
      // case a grade nobody looked down a microscope for.
      values: { patientAge: 38, site: 'Frontal lobe', dxFamily: 'Adult-type diffuse gliomas', dxAdult: 'Astrocytoma, IDH-mutant', molStatus: 'Reported', idhBranch: 'IDH-mutant', idh1R132H: 'Positive', features: [] },
    },
    {
      id: 'gbm',
      label: 'Temporal glioma, 67 years',
      // This one keeps its features: microvascular proliferation and necrosis are what made it a
      // glioblastoma on the sections, and they are also what lets the update 11 age shortcut past
      // sequencing apply. A starting point that cleared them would be asking for a diagnosis on
      // findings nobody recorded.
      values: {
        patientAge: 67, site: 'Temporal lobe', dxFamily: 'Adult-type diffuse gliomas', dxAdult: 'Glioblastoma, IDH-wildtype',
        molStatus: 'Reported', idhBranch: 'IDH-wildtype', idh1R132H: 'Negative',
        features: ['Increased cellularity', 'Nuclear atypia', 'Mitoses', 'Microvascular proliferation', 'Necrosis with pseudopalisading'],
        mitoses: '9',
      },
    },
    {
      // A case that raises more than one check at once, which is what the foot has to cope with:
      // a hemizygous CDKN2A loss, which is not a grading criterion, and an unrecorded PDGFRA in a
      // tumour whose mitotic count has already reached grade 3.
      id: 'twochecks',
      label: 'Frontal glioma, mitoses at threshold',
      values: {
        patientAge: 44, site: 'Frontal lobe', dxFamily: 'Adult-type diffuse gliomas', dxAdult: 'Astrocytoma, IDH-mutant',
        molStatus: 'Reported', idhBranch: 'IDH-mutant', idh1R132H: 'Positive', atrx: 'Loss of nuclear expression',
        codeletion: 'Not detected', cdkn2a: 'Hemizygous loss detected',
        features: ['Increased cellularity', 'Nuclear atypia', 'Mitoses'], mitoses: '3',
      },
    },
    {
      id: 'pf',
      label: 'Posterior fossa ependymoma',
      values: { patientAge: 7, site: 'Cerebellum', dxFamily: 'Ependymal tumours', dxEpendymal: 'Posterior fossa ependymoma, group PFA', features: [] },
    },
  ],
  cns_biopsy: [
    { id: 'blank', label: 'Empty form', values: {} },
    {
      id: 'mening',
      label: 'Convexity meningioma',
      values: { site: 'Frontal lobe', finding: 'Meningioma', mgSubtype: 'Meningothelial', mgMitoses: 1 },
    },
    {
      id: 'wtbx',
      label: 'Thalamic glioma biopsy',
      values: { site: 'Thalamus', finding: 'Diffuse glioma', molStatus: 'Reported', idhBranch: 'IDH-wildtype' },
    },
  ],
};

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const kid of kids) if (kid) n.append(kid);
  return n;
};

// ---------- loading ----------

async function loadSchema(id) {
  const res = await fetch(SCHEMAS[id]);
  const schema = await res.json();
  state.schemaId = id;
  state.schema = schema;
  state.steps = wizardSteps(schema);
  state.values = defaultValues(schema);
  state.open = null;
  state.touched = false;
}

function applyScenario(id) {
  const sc = (SCENARIOS[state.schemaId] || []).find((s) => s.id === id);
  state.values = defaultValues(state.schema);
  if (sc) Object.assign(state.values, sc.values);
  state.open = null;
  state.touched = id !== 'blank';
  render();
}

// ---------- the chart ----------

const STATE_FILL = { satisfied: 'var(--pwc-satisfied)', outstanding: 'var(--pwc-outstanding)', na: 'var(--pwc-na)' };

/** Break a label into at most `lines` lines of roughly `chars` characters, on word boundaries. */
function wrap(text, chars, lines) {
  const words = String(text || '').split(/\s+/);
  const out = [];
  let line = '';
  for (const w of words) {
    if (!line) line = w;
    else if ((line + ' ' + w).length <= chars) line += ' ' + w;
    else { out.push(line); line = w; }
    if (out.length === lines) break;
  }
  if (line && out.length < lines) out.push(line);
  if (out.length === lines && words.join(' ').length > out.join(' ').length) {
    out[lines - 1] = out[lines - 1].replace(/.{1}$/, '\u2026');
  }
  return out;
}

const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) n.setAttribute(k, v);
  return n;
};

function boxNode(laid, { rx = 9, fontSize = 12, lines = 2, chars = 26 } = {}) {
  const { node, x, y, w, h, key } = laid;
  const g = svgEl('g', { class: `chart-node is-${node.state}${state.open === key ? ' is-open' : ''}`, 'data-key': key, tabindex: '0', role: 'button' });
  g.append(svgEl('rect', { x, y, width: w, height: h, rx, class: 'chart-box', fill: STATE_FILL[node.state] || STATE_FILL.na }));
  const rows = wrap(node.label, chars, lines);
  const top = y + h / 2 - ((rows.length - 1) * (fontSize + 2)) / 2 + fontSize / 3;
  rows.forEach((r, i) => {
    const t = svgEl('text', { x: x + w / 2, y: top + i * (fontSize + 2), 'text-anchor': 'middle', class: 'chart-label', 'font-size': fontSize });
    t.textContent = r;
    g.append(t);
  });
  const title = svgEl('title');
  title.textContent = `${node.label} \u2014 ${node.state}`;
  g.append(title);
  return g;
}

function rowNode(laid) {
  const { node, x, y, w, h, key } = laid;
  const g = svgEl('g', { class: `chart-row is-${node.state}${state.open === key ? ' is-open' : ''}`, 'data-key': key, tabindex: '0', role: 'button' });
  g.append(svgEl('rect', { x, y, width: w, height: h, rx: 5, class: 'chart-rowbox', fill: STATE_FILL[node.state] || STATE_FILL.na }));
  g.append(svgEl('circle', { cx: x + 10, cy: y + h / 2, r: 3.5, class: 'chart-dot' }));
  const t = svgEl('text', { x: x + 20, y: y + h / 2 + 3.5, class: 'chart-label', 'font-size': 11, 'text-anchor': 'start' });
  t.textContent = wrap(node.label, Math.floor((w - 28) / 5.9), 1)[0] || node.label;
  g.append(t);
  const title = svgEl('title');
  title.textContent = `${node.label} \u2014 ${node.state}`;
  g.append(title);
  return g;
}

function drawChart(chart) {
  const svg = svgEl('svg', {
    viewBox: `0 0 ${chart.width} ${chart.height}`,
    class: 'chart-svg',
    preserveAspectRatio: 'xMidYMin meet',
  });
  const defs = svgEl('defs');
  const marker = svgEl('marker', { id: 'cnsArrow', viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '5', markerHeight: '5', orient: 'auto-start-reverse' });
  const head = svgEl('path', { d: 'M2 1L8 5L2 9', fill: 'none', stroke: 'context-stroke', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  marker.append(head);
  defs.append(marker);
  svg.append(defs);

  for (const link of chart.links) {
    svg.append(svgEl('polyline', {
      points: link.points.map(([x, y]) => `${x},${y}`).join(' '),
      class: `chart-link is-${link.kind}`,
      'marker-end': link.kind === 'flow' ? 'url(#cnsArrow)' : null,
    }));
  }

  if (chart.funnel) {
    const f = chart.funnel;
    const label = svgEl('text', { x: f.nodes[0].x, y: f.nodes[0].y - 14, class: 'chart-stage-label', 'text-anchor': 'start' });
    label.textContent = f.label;
    svg.append(label);
    f.nodes.forEach((n) => svg.append(boxNode(n, { chars: 22, lines: 3, fontSize: 11.5 })));
  }

  if (chart.stub) {
    const s = chart.stub;
    svg.append(svgEl('rect', { x: s.x, y: s.y, width: s.w, height: s.h, rx: 8, class: 'chart-stub' }));
    const t = svgEl('text', { x: s.x + s.w / 2, y: s.y + s.h / 2 + 4, 'text-anchor': 'middle', class: 'chart-stub-label', 'font-size': 11 });
    t.textContent = s.label;
    svg.append(t);
  }

  if (chart.fork) {
    const f = chart.fork;
    svg.append(svgEl('rect', { x: f.x, y: f.y, width: f.w, height: f.h, rx: 26, class: `chart-fork is-${f.state}` }));
    const t = svgEl('text', { x: f.x + f.w / 2, y: f.y + f.h / 2 + 4.5, 'text-anchor': 'middle', class: 'chart-fork-label', 'font-size': 13 });
    t.textContent = f.label;
    svg.append(t);
  }

  for (const st of chart.stages) {
    svg.append(svgEl('rect', { x: st.x, y: st.y, width: st.w, height: st.h, rx: 12, class: `chart-stage is-${st.state}` }));
    const h = svgEl('text', { x: st.x + 12, y: st.y + 21, class: 'chart-stage-h', 'font-size': 12 });
    h.textContent = st.anyOf ? `${st.label}  \u00b7  any one` : st.label;
    svg.append(h);
    st.nodes.forEach((n) => svg.append(rowNode(n)));
  }

  svg.addEventListener('click', (ev) => {
    const g = ev.target.closest('[data-key]');
    if (!g) return;
    state.open = state.open === g.dataset.key ? null : g.dataset.key;
    render();
  });
  svg.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const g = ev.target.closest('[data-key]');
    if (!g) return;
    ev.preventDefault();
    state.open = state.open === g.dataset.key ? null : g.dataset.key;
    render();
  });
  return svg;
}

// ---------- the question, opened on the node ----------

function setValue(id, value) {
  state.values[id] = value;
  state.touched = true;
  render();
}

function fieldControl(field) {
  const v = state.values[field.id];
  const wrapDiv = el('div', { class: 'q-field' }, el('label', { class: 'q-label', text: field.label, for: `f_${field.id}` }));

  if (field.type === 'select') {
    const sel = el('select', { id: `f_${field.id}`, class: 'q-input', onchange: (e) => setValue(field.id, e.target.value) });
    for (const opt of optionsFor(field, state.values)) {
      sel.append(el('option', { value: opt, selected: opt === v ? 'selected' : null, text: opt || '\u2014' }));
    }
    if (!optionsFor(field, state.values).includes(v || '')) sel.prepend(el('option', { value: v || '', selected: 'selected', text: v || '\u2014' }));
    wrapDiv.append(sel);
  } else if (field.type === 'multiselect') {
    const box = el('div', { class: 'q-opts' });
    for (const opt of optionsFor(field, state.values)) {
      const on = Array.isArray(v) && v.includes(opt);
      box.append(el('button', {
        type: 'button',
        class: `q-opt${on ? ' is-on' : ''}`,
        text: opt,
        onclick: () => setValue(field.id, toggleOption(field, v, opt)),
      }));
    }
    wrapDiv.append(box);
  } else if (field.type === 'checkbox') {
    const cb = el('input', { type: 'checkbox', id: `f_${field.id}`, class: 'q-check', checked: v ? 'checked' : null, onchange: (e) => setValue(field.id, e.target.checked) });
    wrapDiv.append(cb);
  } else if (field.type === 'textarea') {
    wrapDiv.append(el('textarea', { id: `f_${field.id}`, class: 'q-input', rows: '3', oninput: (e) => setValue(field.id, e.target.value) , text: v || '' }));
  } else {
    wrapDiv.append(el('input', {
      id: `f_${field.id}`,
      class: 'q-input',
      type: field.type === 'number' ? 'number' : 'text',
      value: v === undefined || v === null ? '' : v,
      placeholder: field.placeholder || '',
      oninput: (e) => setValue(field.id, e.target.value),
    }));
  }
  return wrapDiv;
}

/** The wizard's own question for a field, where it has one. Teaching copy, panel-only. */
function stepFor(fields) {
  for (const f of fields) {
    const step = state.steps.find((s) => s.field === f.id);
    if (step) return step;
  }
  return null;
}

/** The node after `key` in chart order that is still outstanding, wrapping round. */
function nextOutstanding(all, key) {
  const i = all.findIndex((n) => n.key === key);
  const order = i < 0 ? all : [...all.slice(i + 1), ...all.slice(0, i)];
  return order.find((n) => n.node.state === 'outstanding') || null;
}

function questionCard(laid, scale, all) {
  const { node, key, x, w } = laid;
  const fields = nodeFields(key, state.values, state.schema).filter((f) => isVisible(f, state.values));
  const step = stepFor(fields);
  const caveats = step ? cautions(step, state.values) : [];

  const card = el('div', { class: `q-card is-${node.state}` });
  card.append(el('div', { class: 'q-head' },
    el('span', { class: `q-state is-${node.state}`, text: node.state === 'satisfied' ? 'recorded' : node.state === 'na' ? 'not applicable' : 'outstanding' }),
    el('strong', { class: 'q-title', text: step ? step.question : node.label })));
  card.append(el('p', { class: 'q-detail', text: node.detail }));
  if (node.note) card.append(el('p', { class: 'q-note', text: node.note }));
  if (step && step.why) card.append(el('p', { class: 'q-why', text: step.why }));
  for (const c of caveats) card.append(el('p', { class: 'q-caution', text: typeof c === 'string' ? c : (c.text || c.message || '') }));

  if (fields.length) fields.forEach((f) => card.append(fieldControl(f)));
  else card.append(el('p', { class: 'q-empty', text: 'Nothing to record here on this form: this node is a consequence of the answers above, not a question of its own.' }));

  if (node.state === 'outstanding' && node.test) card.append(el('p', { class: 'q-test', text: `Next: ${node.test}` }));

  // The chart is walkable: once a node is answered the next unanswered one is a button away, so the
  // case can be worked down the algorithm without hunting for what is still amber.
  const next = nextOutstanding(all, key);
  card.append(el('div', { class: 'q-foot' },
    node.source ? el('a', { class: 'q-src', href: node.source.url, target: '_blank', rel: 'noopener', text: node.source.label }) : el('span'),
    el('div', { class: 'q-acts' },
      el('button', { type: 'button', class: 'q-close', text: 'Close', onclick: () => { state.open = null; render(); } }),
      next
        ? el('button', { type: 'button', class: 'q-next', text: 'Next question', onclick: () => { state.open = next.key; render(); } })
        : el('span', { class: 'q-done', text: 'Nothing outstanding' }))));

  // Tied to the node that asks it: the card sits under the chart, aligned on the node's centre with
  // a caret pointing back up at it, rather than floating over the boxes the question is about.
  card.dataset.anchorX = String((x + w / 2) * scale);
  return card;
}

// ---------- the foot: what the answers have produced ----------

function footer(result, all) {
  const v = state.values;
  const e = entity(v);
  const checks = [];
  try {
    pathwayChecks(v, (m, field) => checks.push({ level: 'warn', message: m, field }), (level, message, field) => checks.push({ level, message, field }), e);
  } catch { /* the biopsy form carries a different finding field; a check that cannot run is not shown */ }

  // Every check a case raises is shown, not just the first, and each one leads back to the node that
  // owns the field it is about: a check nobody can act on from where it is written is not much use.
  const checkLine = (c) => {
    const owner = c.field ? all.find((n) => nodeFields(n.key, v, state.schema).some((f) => f.id === c.field)) : null;
    const text = `${c.message}`;
    if (!owner) return el('span', { class: `foot-check is-${c.level}`, text });
    return el('button', {
      type: 'button',
      class: `foot-check is-${c.level} is-linked`,
      text,
      onclick: () => { state.open = owner.key; render(); },
    });
  };

  const dx = state.schemaId === 'cns_tumour' ? integratedDiagnosis(v) : (v.finding || '');
  const grade = state.touched && state.schemaId === 'cns_tumour' ? proposedGrade(v) : null;

  return el('div', { class: 'foot' },
    el('div', { class: 'foot-cell' },
      el('span', { class: 'foot-k', text: 'Integrated diagnosis' }),
      el('span', { class: 'foot-v', text: state.touched ? dx : '\u2014' })),
    el('div', { class: 'foot-cell' },
      el('span', { class: 'foot-k', text: 'Grade from findings' }),
      el('span', { class: 'foot-v', text: grade ? `CNS WHO grade ${grade}` : '\u2014' })),
    el('div', { class: 'foot-cell' },
      el('span', { class: 'foot-k', text: 'Next test' }),
      el('span', { class: 'foot-v', text: result.nextTest || 'Nothing outstanding' })),
    el('div', { class: 'foot-cell' },
      el('span', { class: 'foot-k', text: checks.length > 1 ? `Checks \u00b7 ${checks.length}` : 'Checks' }),
      checks.length
        ? el('div', { class: 'foot-checks' }, ...checks.map(checkLine))
        : el('span', { class: 'foot-v', text: 'None raised' })));
}

// ---------- render ----------

function render() {
  const result = pathway(state.values);
  const chart = pathwayChart(result);
  const all = [...(chart.funnel ? chart.funnel.nodes : []), ...chart.stages.flatMap((s) => s.nodes)];

  // The chart drives the questions: with nothing open, the first outstanding node is the one asking.
  if (!state.open) {
    const next = all.find((n) => n.node.state === 'outstanding');
    if (next) state.open = next.key;
  }

  const frame = $('#chart');
  frame.replaceChildren();
  const svg = drawChart(chart);
  frame.append(svg);

  const open = all.find((n) => n.key === state.open);
  if (open) {
    const scale = svg.clientWidth / chart.width;
    const card = questionCard(open, scale, all);
    frame.append(card);
    const inner = frame.clientWidth - 2 * 16;
    const cw = card.offsetWidth;
    const anchor = Number(card.dataset.anchorX);
    const left = Math.max(0, Math.min(inner - cw, anchor - cw / 2));
    card.style.marginLeft = `${left}px`;
    card.style.setProperty('--caret-x', `${Math.max(14, Math.min(cw - 14, anchor - left))}px`);
  }

  $('#branch').textContent = result.title;
  $('#lede').textContent = result.lede;
  const done = all.filter((n) => n.node.state === 'satisfied').length;
  const out = all.filter((n) => n.node.state === 'outstanding').length;
  $('#progress').textContent = `${done} recorded, ${out} outstanding`;

  const foot = $('#foot');
  foot.replaceChildren(footer(result, all));
}

// ---------- boot ----------

async function boot() {
  const tmplSel = $('#tmpl');
  const scenSel = $('#scenario');

  const fillScenarios = () => {
    scenSel.replaceChildren();
    for (const s of SCENARIOS[state.schemaId]) scenSel.append(el('option', { value: s.id, text: s.label }));
  };

  tmplSel.addEventListener('change', async (e) => {
    await loadSchema(e.target.value);
    fillScenarios();
    applyScenario('blank');
  });
  scenSel.addEventListener('change', (e) => applyScenario(e.target.value));
  $('#reset').addEventListener('click', () => { scenSel.value = 'blank'; applyScenario('blank'); });
  window.addEventListener('resize', () => render());

  await loadSchema('cns_tumour');
  if (!pathwaySupported(state.schema)) {
    $('#chart').textContent = 'This template does not carry the layered fields the pathway needs.';
    return;
  }
  fillScenarios();
  scenSel.value = 'astro';
  applyScenario('astro');
}

boot();
