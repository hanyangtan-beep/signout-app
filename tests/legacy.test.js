// Golden-output tests. Every fixture under tests/fixtures/ must be reproduced
// byte-for-byte by the schema engine. The fixtures were captured from the legacy
// HTML apps in Phase 0 and are the parity contract for all later refactors.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, LETTERS } from '../src/engine.js';
import { loadAll } from '../src/registry.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const registry = await loadAll();

// Adapters: legacy fixture input shape -> engine case shape.
const ADAPT = {
  gastric: (input) => ({
    schemaId: 'gastric_biopsy',
    caseTitle: input.caseTitle || '',
    options: {},
    parts: input.parts.map((p) => {
      const { label, ...values } = p;
      return { label, values };
    })
  }),
  colonic: (input) => ({
    schemaId: 'colonic_polyp',
    caseTitle: '',
    options: { includeHeader: !!input.includeHeader, uppercaseDx: !!input.uppercaseDx },
    parts: input.specimens.map((values, i) => ({ label: LETTERS[i], values: { ...values } }))
  })
};

function loadFixtures(dir) {
  const full = path.join(here, 'fixtures', dir);
  return fs.readdirSync(full).filter((f) => f.endsWith('.json')).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(full, f), 'utf8')));
}

for (const [name, adapt] of Object.entries(ADAPT)) {
  const fixtures = loadFixtures(name);
  test(`${name}: has fixtures`, () => { assert.ok(fixtures.length >= 5, `expected >=5 fixtures, found ${fixtures.length}`); });
  for (const fx of fixtures) {
    test(`${name}/${fx.name}`, () => {
      const caseState = adapt(fx.input);
      const { schema, generator } = registry[caseState.schemaId];
      const actual = generate(schema, generator, caseState);
      for (const key of Object.keys(fx.expected)) {
        assert.equal(actual[key], fx.expected[key], `${key} differs\n--- expected\n${fx.expected[key]}\n--- actual\n${actual[key]}`);
      }
    });
  }
}
