import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { spanFull, groupProgress } from '../src/formlayout.js';
import { isVisible } from '../src/engine.js';

const schemaDir = new URL('../schemas/', import.meta.url);
const schemas = readdirSync(schemaDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => [f, JSON.parse(readFileSync(new URL(f, schemaDir), 'utf8'))]);

test('textareas and chip sets take the full width of a packed row', () => {
  assert.equal(spanFull({ type: 'textarea' }), true);
  assert.equal(spanFull({ type: 'multiselect' }), true);
  assert.equal(spanFull({ type: 'text' }), false);
  assert.equal(spanFull({ type: 'number' }), false);
});

test('a long dropdown takes the full width, a short one shares the row', () => {
  assert.equal(spanFull({ type: 'select' }, 6), false);
  assert.equal(spanFull({ type: 'select' }, 40), true);
});

test('an explicit span on the schema field wins', () => {
  assert.equal(spanFull({ type: 'textarea', span: 'half' }), false);
  assert.equal(spanFull({ type: 'text', span: 'full' }), true);
});

test('group progress counts only the fields the current entries show', () => {
  const fields = [
    { id: 'a', type: 'text' },
    { id: 'b', type: 'text' },
    { id: 'hidden', type: 'text', showIf: { field: 'a', is: 'never' } }
  ];
  const p = groupProgress(fields, { a: 'yes' }, isVisible);
  assert.deepEqual(p, { shown: 2, filled: 1, complete: false });
  assert.equal(groupProgress(fields, { a: 'yes', b: 'also' }, isVisible).complete, true);
});

test('an empty string, an empty list and a missing value all count as unanswered', () => {
  const fields = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(groupProgress(fields, { a: '', b: [] }, isVisible).filled, 0);
  assert.equal(groupProgress(fields, { a: 'x', b: ['y'], c: false }, isVisible).filled, 3);
});

test('every template that splits its macroscopy also packs its form', () => {
  const split = schemas.filter(([, s]) => s.layout?.macroGroups).map(([f]) => f);
  const packed = schemas.filter(([, s]) => s.layout?.pack).map(([f]) => f);
  assert.deepEqual(packed.sort(), split.sort());
  assert.equal(packed.length, 58); // + 6 H&N cancer resections (nasopharyngeal, hypopharynx_oropharynx, larynx, sinonasal, salivary, mucosal_melanoma)
});

test('the small templates stay one field per row', () => {
  for (const [file, s] of schemas) {
    if (s.layout?.pack) continue;
    assert.equal(s.layout ?? null, null, `${file} carries a layout without pack`);
  }
});

test('every schema span override is a value the packed grid understands', () => {
  for (const [file, s] of schemas) {
    for (const f of s.fields || []) {
      if (f.span !== undefined) assert.ok(['full', 'half'].includes(f.span), `${file}: ${f.id} span=${f.span}`);
    }
  }
});

test('every ovary check that names a field names one the schema has', async () => {
  const schema = schemas.find(([f]) => f === 'ovary_ft_peritoneum.json')[1];
  const ids = new Set(schema.fields.map((f) => f.id));
  const src = readFileSync(new URL('../generators/ovary_ft_peritoneum.js', import.meta.url), 'utf8');
  const named = [...src.matchAll(/(?:err|warn|info)\([^\n]*?,\s*'([A-Za-z][A-Za-z0-9]*)'\)/g)].map((m) => m[1]);
  assert.ok(named.length >= 8, `expected the pilot checks to name fields, found ${named.length}`);
  for (const id of named) assert.ok(ids.has(id), `check refers to unknown field ${id}`);
});
