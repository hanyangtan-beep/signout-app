// Golden-output tests. Every fixture under tests/fixtures/ must be reproduced
// byte-for-byte by the generator under test.
//
// Phase 0: generator under test = the extracted legacy functions.
// Phase 1: point GENERATORS at the new schema engine; the same fixtures must still pass.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const gastricLegacy = require('../legacy/gastric-legacy');
const colonicLegacy = require('../legacy/colonic-legacy');

// Swap these implementations in Phase 1. Signature must stay: (input) => expected-shaped object.
const GENERATORS = {
  gastric: (input) => gastricLegacy.generate(input),
  colonic: (input) => ({ report: colonicLegacy.buildReport(input) })
};

function loadFixtures(dir) {
  const full = path.join(__dirname, 'fixtures', dir);
  return fs.readdirSync(full).filter(f => f.endsWith('.json')).sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(full, f), 'utf8')));
}

for (const [template, generate] of Object.entries(GENERATORS)) {
  const fixtures = loadFixtures(template);
  test(`${template}: has fixtures`, () => { assert.ok(fixtures.length >= 5, `expected >=5 fixtures, found ${fixtures.length}`); });
  for (const fx of fixtures) {
    test(`${template}/${fx.name}`, () => {
      const actual = generate(fx.input);
      for (const key of Object.keys(fx.expected)) {
        assert.equal(actual[key], fx.expected[key], `${key} differs\n--- expected\n${fx.expected[key]}\n--- actual\n${actual[key]}`);
      }
    });
  }
}
