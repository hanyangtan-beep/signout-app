// Organ icons: manifest organ -> sprite symbol mapping, and the sprite itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ICON_IDS, ORGAN_ICON, iconIdFor, normaliseOrgan, iconCoverage } from '../src/organicons.js';

const manifest = JSON.parse(
  await readFile(new URL('../templates/manifest.json', import.meta.url), 'utf8')
).templates;
const sprite = await readFile(new URL('../assets/icons/organ-icons-sprite.svg', import.meta.url), 'utf8');

test('every mapped icon id exists as a symbol in the sprite', () => {
  for (const id of ICON_IDS) {
    assert.ok(sprite.includes(`id="organ-${id}"`), `sprite is missing organ-${id}`);
  }
  for (const id of new Set(Object.values(ORGAN_ICON))) {
    assert.ok(ICON_IDS.includes(id), `${id} is mapped but not a known icon id`);
  }
});

test('organ lookup ignores case and spacing', () => {
  assert.equal(normaliseOrgan('  THYROID   GLAND '), 'thyroid gland');
  assert.equal(iconIdFor('THYROID GLAND'), 'thyroid');
  assert.equal(iconIdFor('Thyroid'), 'thyroid');
  assert.equal(iconIdFor({ organ: 'COLON' }), 'colorectum');
  assert.equal(iconIdFor({ organ: 'Gallbladder' }), 'gallbladder');
});

test('templates with no icon fall back rather than throwing', () => {
  assert.equal(iconIdFor(null), null);
  assert.equal(iconIdFor({ organ: '' }), null);
  assert.equal(iconIdFor({ organ: 'MEDIASTINUM' }), null);
  assert.equal(iconIdFor({ organ: 'LUNG', planned: true }), 'lung');
  assert.equal(iconIdFor({ name: 'Laryngeal carcinoma resection' }), 'nasopharynx', 'planned rows read their name');
  assert.equal(iconIdFor({ name: 'Frozen section' }), null);
});

test('mapping resolves for every installed template without error', () => {
  for (const t of manifest) {
    const id = iconIdFor(t);
    assert.ok(id === null || ICON_IDS.includes(id), `${t.id} resolved to a bad icon id: ${id}`);
  }
  const { total, covered } = iconCoverage(manifest);
  assert.equal(total, manifest.length);
  // every template that names an organ must have a glyph; only the organ-less
  // generic free-text templates are allowed to fall back.
  const uncovered = manifest.filter((t) => t.organ && !iconIdFor(t)).map((t) => t.id);
  assert.deepEqual(uncovered, [], `templates with an organ but no icon: ${uncovered.join(', ')}`);
  assert.equal(covered, manifest.filter((t) => t.organ).length);
});

test('the mixed-case organ spellings in the manifest all resolve the same way', () => {
  const pairs = [['APPENDIX', 'Appendix'], ['GALLBLADDER', 'Gallbladder'], ['STOMACH', 'Stomach']];
  for (const [a, b] of pairs) assert.equal(iconIdFor(a), iconIdFor(b), `${a} vs ${b}`);
});
