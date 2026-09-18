// Frozen macro parsing. The sentences below are written in the house frozen style — the same
// openers, block wording and measurement forms the five-year frozen file uses — so the extraction
// is tested against the shape of a real paste without holding any case text.
//
// Measured coverage over that file when this was built (1485 lettered parts):
// pieces 95.6 per cent, measurement 99.7, frozen blocks 99.1, tissue 100, handling 99.2; and on
// the parts where the wording states the answer outright, block count and piece count were correct
// in every one (1225 and 305 respectively).

import test from 'node:test';
import assert from 'node:assert/strict';
import { extractMacro, splitMacroParts } from '../src/macroparse.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('frozen_section');
const x = (text) => extractMacro(schema, text);

test('the ordinary one-piece frozen macro fills every intake field', () => {
  const out = x('Received in a fresh state is a piece of tan coloured tissue measuring 0.9 x 0.5 x 0.3 cm. '
    + 'All embedded in one frozen block, and subsequently converted to paraffin block.');
  assert.equal(out.pieces, '1');
  assert.equal(out.tissueDesc, 'tan coloured tissue');
  assert.equal(out.size, '0.9 x 0.5 x 0.3 cm');
  assert.equal(out.handling, 'All embedded');
  assert.equal(out.blocks, '1');
  assert.equal(out.converted, true);
});

test('piece count reads the receiving sentence, in figures or in words', () => {
  assert.equal(x('Received fresh are two pieces of fibrofatty tissue, each measuring 0.5 cm across.').pieces, '2');
  assert.equal(x('Received in a fresh state are three pieces of tan coloured tissue ranging from 1 to 3 mm across.').pieces, '3');
  assert.equal(x('Received in a fresh state are 5 cores of white coloured tissue ranging from 1.8 cm to 1.1 cm long.').pieces, '5');
  assert.equal(x('Received fresh is a strip of mucosa measuring 1 x 0.2 x 0.1 cm.').pieces, '1');
  assert.equal(x('Received is a wedge of lung tissue measuring 9 x 5 x 2.5 cm.').pieces, '1');
  // A designation line before the description does not hide the count.
  assert.equal(x("Specimen designated left parametrium, received fresh. It consists of a piece of tissue measuring 4 x 4 x 2 mm.").pieces, '1');
});

test('an uncounted specimen leaves the piece count alone', () => {
  assert.equal(x('Received in a fresh state are multiple small pieces of yellow-tan coloured tissue measuring 1.5 cm across in aggregate dimension.').pieces, undefined);
  assert.equal(x('Received fresh are several fragments of soft tissue.').pieces, undefined);
});

test('the block count is the frozen one, never the paraffin total', () => {
  assert.equal(x('All embedded in 2 frozen blocks, and subsequently converted to paraffin blocks.').blocks, '2');
  assert.equal(x('All embedded in one frozen block and subsequently converted to paraffin block.').blocks, '1');
  assert.equal(x('All embedded in 4 blocks for frozen section and subsequently converted to paraffin sections.').blocks, '4');
  assert.equal(x('2 representative blocks are taken for frozen section examination. 4 representative blocks in total.').blocks, '2');
  // A count given per piece is not a total, so nothing is filled in.
  assert.equal(x('One representative block is taken from each piece for frozen section, and subsequently converted to paraffin sections.').blocks, undefined);
});

test('measurement takes the dimensions given, the largest of a range, or the named axes', () => {
  assert.equal(x('Received fresh is a piece of tan coloured tissue measuring 1.2 x 0.5 x 0.3 cm.').size, '1.2 x 0.5 x 0.3 cm');
  assert.equal(x('The specimen, submitted fresh, consists of a piece of tissue measuring 0.6 cm across.').size, '0.6 cm');
  assert.equal(x('Received in a fresh state are multiple pieces of soft white material ranging from 0.6 cm to 0.2 cm across.').size, '0.6 cm');
  assert.equal(x('Received fresh is a piece of tissue measuring 4 x 4 x 2 mm.').size, '0.4 x 0.4 x 0.2 cm');
  assert.equal(x("Received fresh is a strip of mucosa with a stitch marking 3 o'clock. It measures 0.5 cm from 12 to 6 o'clock, "
    + "0.2 cm from 3 to 9 o'clock and 0.3 cm from superficial to deep.").size, '0.5 x 0.2 x 0.3 cm');
});

test('tissue and handling map onto the intake options', () => {
  assert.equal(x('Received fresh is a piece of fibroadipose tissue containing one lymph node. The lymph node is bisected.').tissueDesc, 'lymph node');
  assert.equal(x('Received fresh is a piece of fibrofatty tissue measuring 1 x 1 x 1 cm.').tissueDesc, 'fibrofatty tissue');
  assert.equal(x('Received fresh are three strips of mucosal tissue measuring 2.2 x 0.5 x 0.2 cm.').tissueDesc, 'mucosa');
  assert.equal(x('Received fresh is a piece of greyish tissue measuring 1 x 1 x 1 cm.').tissueDesc, 'greyish tissue');
  const other = x('Received in a fresh state are two pieces of cauterized tissue measuring 1.6 x 0.3 x 0.3 cm.');
  assert.equal(other.tissueDesc, 'other');
  assert.equal(other.tissueDescOther, 'cauterized tissue');
  // The free-text box is left alone when the select found a listed option.
  assert.equal(x('Received fresh is a piece of tan coloured tissue measuring 1 x 1 x 1 cm.').tissueDescOther, undefined);

  assert.equal(x('Serially sectioned and all embedded in 2 frozen blocks.').handling, 'Serially sectioned and all embedded');
  assert.equal(x('The piece is bisected and all embedded in 1 frozen block.').handling, 'Bisected and all embedded');
  assert.equal(x('One representative section is taken for frozen section.').handling, 'Representative section taken');
  assert.equal(x('All embedded in 1 frozen block.').handling, 'All embedded');
});

test('conversion to paraffin is read from the closing sentence', () => {
  assert.equal(x('All embedded in 1 frozen block, and subsequently converted to paraffin block.').converted, true);
  assert.equal(x('All embedded in 2 frozen blocks. Block 1 is converted to paraffin block, and block 2 is kept frozen.').converted, false);
  assert.equal(x('All embedded in 1 frozen block.').converted, undefined);
});

test('a lettered paste gives each part its own macro', () => {
  const paste = '(A) Received fresh is a piece of yellow coloured tissue measuring 0.6 x 0.2 x 0.2 cm. '
    + 'All embedded in 1 frozen block, and subsequently converted to paraffin block.\n\n'
    + '(B) Received fresh is a strip of mucosa measuring 1.1 x 0.3 x 0.2 cm. Serially sectioned and all embedded in 2 frozen blocks.';
  const { lettered, chunks } = splitMacroParts(paste);
  assert.equal(lettered, true);
  const a = x(chunks.A), b = x(chunks.B);
  assert.equal(a.size, '0.6 x 0.2 x 0.2 cm');
  assert.equal(a.blocks, '1');
  assert.equal(b.tissueDesc, 'mucosa');
  assert.equal(b.size, '1.1 x 0.3 x 0.2 cm');
  assert.equal(b.blocks, '2');
  assert.equal(b.handling, 'Serially sectioned and all embedded');
});
