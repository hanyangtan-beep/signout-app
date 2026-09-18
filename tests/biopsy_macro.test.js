// Biopsy macro parsing. The sentences below are written in the two house biopsy dialects — the
// narrative one ("Consists of a piece of fibrofatty tissue measuring …") and the terse one
// ("All embedded, 3 pieces, 1 x 3 mm to 1 x 4 mm. 1 cassette, tan, soft.") — so the extraction is
// tested against the shape of a real paste without holding any case text.
//
// Measured coverage over the five-year biopsy file when this was built: "cassette" is the only
// block word in 52 per cent of grosses, so the block count now reads it; node count and node size
// fill on the parts whose wording states them, and the handling choices fill on the rest.

import test from 'node:test';
import assert from 'node:assert/strict';
import { extractMacro } from '../src/macroparse.js';
import { schemaSync } from './_schema.js';

const node = schemaSync('lymph_node');
const skin = schemaSync('skin_excision');
const app = schemaSync('appendix');
const jaw = schemaSync('jaw_cyst');
const nasal = schemaSync('nasal_polyps');
const turp = schemaSync('turp');

test('the terse dialect counts cassettes as blocks', () => {
  const out = extractMacro(node, 'All embedded, 3 pieces, 1 x 3 mm to 1 x 4 mm. 1 cassette, tan, soft.');
  assert.equal(out.blocks, '1');
  assert.equal(extractMacro(app, 'All embedded in 4 cassettes.').blocks, '4');
  assert.equal(extractMacro(app, 'Bisected and all embedded in a single cassette.').blocks, '1');
});

test('the narrative dialect still counts blocks', () => {
  assert.equal(extractMacro(app, 'All embedded in 6 blocks.').blocks, '6');
  assert.equal(extractMacro(app, 'Four representative blocks are submitted.').blocks, '4');
});

test('nodes received are counted only when the gross states a number', () => {
  assert.equal(extractMacro(node, 'Consists of a piece of fibrofatty tissue and two lymph nodes. It measures 2 x 1 x 1 cm.').nodesReceived, '2');
  assert.equal(extractMacro(node, 'A lymph node measuring 1.2 x 0.7 x 0.5 cm. Bisected and all embedded in 1 block.').nodesReceived, '1');
  assert.equal(extractMacro(node, '3 lymph nodes are discerned within.').nodesReceived, '3');
  assert.equal(extractMacro(node, 'Several enlarged lymph nodes are palpated within. All embedded in 3 blocks.').nodesReceived, undefined);
});

test('the largest node measurement is the node, not the fat around it', () => {
  assert.equal(extractMacro(node, 'The lymph node measures 2 cm x 1 cm x 1 cm. Bisected and all embedded in 1 block.').largestNode, '2');
  assert.equal(extractMacro(node, 'A piece of fibrofatty tissue measures 3.5 x 1.8 x 1 cm. Two lymph nodes are discerned within. The larger of which measures 1.8 cm across.').largestNode, '1.8');
  assert.equal(extractMacro(node, 'Consists of a piece of fibrofatty tissue measuring 5 cm x 5 cm x 2 cm. All embedded in 5 blocks.').largestNode, undefined);
});

test('the handling sentence fills the block scheme', () => {
  assert.equal(extractMacro(app, 'The appendix measures 5 cm long and 0.7 cm in diameter. All embedded in 3 blocks.').blockHandling, 'All embedded');
  assert.equal(extractMacro(app, 'Representative sections are submitted in 3 blocks.').blockHandling, 'Representative sections');
  assert.equal(extractMacro(skin, 'Consists of an ellipse of skin measuring 1.1 x 0.5 x 0.6 cm. Serially sliced and all embedded in 3 blocks.').blockScheme,
    'Ellipse serially sliced and all embedded');
});

test('fragment counts read the receiving phrase', () => {
  assert.equal(extractMacro(jaw, 'Multiple pieces of bone measuring 2.5 cm across in aggregate. Decalcified and all embedded in 1 block.').fragments, 'multiple');
  assert.equal(extractMacro(jaw, 'Two fragments of cyst wall measuring 1.5 x 1 x 0.3 cm in aggregate.').fragments, '2');
  assert.equal(extractMacro(nasal, 'Multiple fragments of polypoid tissue measuring 3 cm across in aggregate. All embedded in 2 cassettes.').fragments, 'Multiple');
});

test('chips are measured in aggregate', () => {
  const out = extractMacro(turp, 'Prostate chips weighing 20 g. They measures 4 cm x 4 cm x 3 cm in aggregate. 6 blocks taken.');
  assert.equal(out.dimensions, '4 x 4 x 3');   // the generator adds the unit
  assert.equal(out.weight, '20');
  assert.equal(out.blocks, '6');
  assert.equal(extractMacro(turp, 'Prostate chips weighing 21 g. Partially embedded in 7 blocks.').dimensions, undefined);
});
