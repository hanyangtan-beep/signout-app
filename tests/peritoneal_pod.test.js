import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { loadAll } from '../src/registry.js';

const reg = await loadAll();
const manifest = Object.values(reg).map((r) => r.schema);
const periSchema = JSON.parse(fs.readFileSync(new URL('../schemas/peritoneal_nodule.json', import.meta.url), 'utf8'));

test('POD specimen intake routes confidently to peritoneal_nodule and prefills Pouch of Douglas', () => {
  for (const line of ['POD', 'POD biopsy', 'POD nodule, excision', 'P.O.D., biopsy']) {
    const parsed = parseIntake(line);
    const [m] = matchParts(parsed, '', manifest);
    assert.equal(m.templateId, 'peritoneal_nodule', `${line} -> peritoneal_nodule`);
    assert.equal(m.tier, 'confident', `${line} tier confident`);
    const vals = presetValues(periSchema, parsed.parts[0], m);
    assert.equal(vals.site, 'Pouch of Douglas', `${line} prefills Pouch of Douglas`);
  }
});

test('POD fluid and POD washing stay on cytology (not peritoneal_nodule)', () => {
  for (const line of ['POD fluid', 'POD washing', 'Pouch of Douglas fluid, cytology']) {
    const parsed = parseIntake(line);
    const [m] = matchParts(parsed, '', manifest);
    assert.notEqual(m.templateId, 'peritoneal_nodule', `${line} should not route to peritoneal_nodule`);
  }
});
