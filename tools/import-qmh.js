#!/usr/bin/env node
// Draft-schema importer for the QMH Cancer Reporting Template pages
// (https://awiloqmh.github.io/CancerReportingTemplate/). Point it at a saved page:
//
//   node tools/import-qmh.js analysis/qmh/GI-Colon-and-rectum.html > analysis/qmh/colon.draft.json
//
// It reads every <select>/<input>/<textarea> (name Axx), the option values, the on-page
// label preceding each control, and the output label + order that the page's
// updateDescription() uses. The result is a DRAFT: field ids, house wording, showIf
// rules, staging hooks and the narrative generator are curated by hand into
// schemas/<id>.json — never ship the draft as-is.

import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('usage: node tools/import-qmh.js <saved QMH page.html>'); process.exit(1); }
const html = readFileSync(file, 'utf8');

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const text = (s) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = (tag, name) => { const m = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag); return m ? (m[2] ?? m[3] ?? m[4]) : null; };

// Controls in document order.
const controls = [];
const ctlRe = /<(select|input|textarea)\b[^>]*>/gi;
let m;
while ((m = ctlRe.exec(html))) {
  const tag = m[0];
  const name = attr(tag, 'name') || attr(tag, 'id');
  if (!name || !/^A\d+$/.test(name)) continue;
  const kind = m[1].toLowerCase();
  const before = html.slice(Math.max(0, m.index - 600), m.index);
  // Nearest "- Label:" or "Heading:" text preceding the control.
  const labelMatch = [...text(before).matchAll(/(?:^|\|| )-?\s*([^|]{3,120}?):\s*$/g)].pop() || [...text(before).matchAll(/-\s*([^-:|]{3,120}?):/g)].pop();
  const label = labelMatch ? labelMatch[1].trim() : '';
  const ctl = { name, kind, label };
  if (kind === 'select') {
    const end = html.indexOf('</select>', m.index);
    const body = html.slice(m.index, end);
    ctl.options = [...body.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)]
      .map((o) => ({ value: decode(attr(o[1], 'value') ?? text(o[2])), text: text(o[2]) }))
      .filter((o) => o.value !== '' || o.text !== '');
  } else if (kind === 'input') {
    ctl.type = (attr(tag, 'type') || 'text').toLowerCase();
    if (ctl.type === 'checkbox' || ctl.type === 'radio') ctl.value = decode(attr(tag, 'value') || '');
  }
  controls.push(ctl);
}

// Output order + labels from updateDescription(); commented-out blocks (/* */) are skipped.
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((s) => s[1]).join('\n');
const live = scripts.replace(/\/\*[\s\S]*?\*\//g, '');
const order = [];
const outRe = /Template \+=\s*((?:"[^"]*"|frm\.(A\d+)\.value|\s|\+|\\n)+);/g;
while ((m = outRe.exec(live))) {
  const ids = [...m[1].matchAll(/frm\.(A\d+)\.value/g)].map((x) => x[1]);
  const lit = [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]).join('').replace(/\\n/g, '').trim();
  const outLabel = lit.replace(/^[-\s]*/, '').replace(/:\s*$/, '').trim();
  for (const id of ids) if (!order.find((o) => o.name === id)) order.push({ name: id, outLabel: outLabel || null });
}
const byName = Object.fromEntries(controls.map((c) => [c.name, c]));
const commented = controls.filter((c) => !order.find((o) => o.name === c.name)).map((c) => c.name);

// Group checkbox runs sharing a heading into one multiselect.
const fields = [];
for (const o of order) {
  const c = byName[o.name];
  if (!c) continue;
  if (c.kind === 'input' && c.type === 'checkbox') {
    const last = fields[fields.length - 1];
    if (last && last.type === 'multiselect' && last.label === c.label) { last.options.push(c.value); last.sources.push(c.name); continue; }
    fields.push({ id: c.name, label: c.label, type: 'multiselect', options: [c.value], sources: [c.name], outLabel: o.outLabel });
    continue;
  }
  const f = { id: c.name, label: c.label, outLabel: o.outLabel, sources: [c.name] };
  if (c.kind === 'select') { f.type = 'select'; f.options = c.options.map((x) => x.value); }
  else if (c.kind === 'textarea') f.type = 'textarea';
  else f.type = /number|mm|size/i.test(c.label) ? 'number' : 'text';
  fields.push(f);
}

const version = (/([A-Z][A-Za-z ,&/-]{4,80}\s\d+(?:\.\d+)+\s*\([A-Za-z]{3}-\d{4}\))/.exec(text(html.slice(html.lastIndexOf('based on')))) || [])[1];
const source = { page: file.replace(/^.*\//, ''), url: `https://awiloqmh.github.io/CancerReportingTemplate/${file.replace(/^.*\//, '')}`, capProtocol: version ? text(version) : null };

console.log(JSON.stringify({ source, fields, notPrinted: commented, controls: controls.length }, null, 2));
