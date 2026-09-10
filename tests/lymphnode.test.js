// Phase 4b: lymph node excision / sentinel node / dissection template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCase, generate } from '../src/engine.js';
import gen, { totalNodes, positiveNodes, countPhrase, word } from '../generators/lymphnode.js';

const schema = JSON.parse(readFileSync(new URL('../schemas/lymph_node.json', import.meta.url), 'utf8'));
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  Object.assign(c.options, options);
  return c;
};

test('metadata: benign resection in the Lymphoid system with searchable aliases and complete defaults', () => {
  assert.equal(schema.id, 'lymph_node');
  assert.equal(schema.generator, 'lymphnode');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Lymphoid');
  assert.equal(schema.organ, 'LYMPH NODE');
  assert.equal(schema.label, 'Lymph node');
  assert.equal(schema.rank, 21);
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['sentinel', 'SLN', 'MNF116', 'station', 'x/y']) assert.ok(schema.aliases.includes(a), a);
  assert.equal(schema.maxParts, 12);
  assert.equal(schema.defaultParts, 1);
  for (const f of schema.fields) assert.ok('default' in f, `field ${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} exists in fields`);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  assert.ok(schema.fields.filter((f) => f.group === 'Macroscopy').length >= 4);
});

test('helpers: totals, clamped positive count, number words', () => {
  assert.equal(totalNodes({ nodesReceived: '4' }), 4);
  assert.equal(totalNodes({ nodesReceived: '4', nodesTotal: '5' }), 5, 'microscopy count overrides the macro count');
  assert.equal(totalNodes({}), 1);
  assert.equal(positiveNodes({ result: 'Negative - reactive', positiveNodes: '3' }), 0);
  assert.equal(positiveNodes({ result: 'Metastatic carcinoma', positiveNodes: '5', nodesReceived: '3' }), 3);
  assert.equal(countPhrase({ result: 'Metastatic carcinoma', positiveNodes: '2', nodesReceived: '14' }), '(2/14)');
  assert.equal(word(1), 'one');
  assert.equal(word(9), 'nine');
  assert.equal(word(13), '13');
});

test('example: two-part sentinel node and axillary sampling case, all blocks lettered', () => {
  const r = run(example());
  const dx = r.diagnosis.split('\n');
  assert.equal(dx[0], '(A) LYMPH NODE, right SLN1, excision - NO EVIDENCE OF MALIGNANCY (0/1)');
  assert.equal(dx[1], '(B) LYMPH NODES, right axillary, sampling - NO EVIDENCE OF MALIGNANCY (0/3)');
  assert.equal(r.specimens, '(A) Lymph node, right SLN1, excision\n(B) Lymph nodes, right axillary, sampling');
  assert.equal(r.macro, '(A) Received in formalin is a piece of fibroadipose tissue measuring 2.5 x 1.5 x 1 cm containing one lymph node measuring 1.2 cm. All embedded in 1 block.\n\n(B) Received in formalin is a piece of fibroadipose tissue measuring 4 x 3 x 1.5 cm containing three lymph nodes, the largest 1.5 cm. All embedded in 2 blocks.');
  assert.equal(r.blockKey, '(A) (1) Lymph node, bisected.\n(B) (1) Lymph nodes 1-2. (2) Lymph node 3.');
  assert.equal(r.microscopy, '(A) Sections show fibroadipose tissue and one reactive lymph node. No suspicious cells are identified on immunostain for pancytokeratin MNF116. There is no evidence of malignancy.\n\n(B) Sections show fibroadipose tissue and three reactive lymph nodes. There is no evidence of malignancy.');
  for (const block of [r.specimens, r.macro, r.blockKey, r.microscopy, r.diagnosis]) {
    assert.ok(block.includes('(A)') && block.includes('(B)'), 'every block keeps its part letters');
  }
  assert.ok(!r.report.includes('undefined'));
});

test('single sentinel node: house diagnosis string, no part letters, numbered block key', () => {
  const r = run(one({ specimenName: 'right SLN2', tissueSize: '2 x 1.5 x 1', largestNode: '1.1' }));
  assert.equal(r.diagnosis, 'LYMPH NODE, right SLN2, excision - NO EVIDENCE OF MALIGNANCY (0/1)');
  assert.equal(r.specimens, 'Lymph node, right SLN2, excision');
  assert.equal(r.macro, 'Received in formalin is a piece of fibroadipose tissue measuring 2 x 1.5 x 1 cm containing one lymph node measuring 1.1 cm. All embedded in 1 block.');
  assert.equal(r.blockKey, '(1) Lymph node, bisected.');
  assert.equal(r.microscopy, 'Sections show fibroadipose tissue and one reactive lymph node. There is no evidence of malignancy.');
  assert.ok(!r.report.includes('(A)'));
});

test('macro option off removes the macroscopic description and block key', () => {
  const r = run(one({ specimenName: 'right SLN2' }, { macro: false }));
  assert.equal(r.macro, '');
  assert.equal(r.blockKey, '');
  assert.ok(!r.report.includes('Received in formalin'));
  assert.equal(r.diagnosis, 'LYMPH NODE, right SLN2, excision - NO EVIDENCE OF MALIGNANCY (0/1)');
});

test('plural node resection: LYMPH NODES, site as typed, (0/4), block key split across blocks', () => {
  const r = run(one({ specimenName: 'left external iliac lymph nodes', procedure: 'Resection', nodesReceived: '4', tissueSize: '5 x 3 x 2', largestNode: '1.8', blocks: '2' }));
  assert.equal(r.diagnosis, 'LYMPH NODES, left external iliac lymph nodes, resection - NO EVIDENCE OF MALIGNANCY (0/4)');
  assert.equal(r.macro, 'Received in formalin is a piece of fibroadipose tissue measuring 5 x 3 x 2 cm containing four lymph nodes, the largest 1.8 cm. All embedded in 2 blocks.');
  assert.equal(r.blockKey, '(1) Lymph nodes 1-2. (2) Lymph nodes 3-4.');
  assert.equal(r.microscopy, 'Sections show fibroadipose tissue and four reactive lymph nodes. There is no evidence of malignancy.');
});

test('digits from ten: 13 reactive nodes', () => {
  const r = run(one({ specimenName: 'right axillary', procedure: 'Dissection', nodesReceived: '13', blocks: '4' }));
  assert.equal(r.microscopy, 'Sections show fibroadipose tissue and 13 reactive lymph nodes. There is no evidence of malignancy.');
  assert.equal(r.diagnosis, 'LYMPH NODES, right axillary, dissection - NO EVIDENCE OF MALIGNANCY (0/13)');
  assert.equal(r.blockKey, '(1) Lymph nodes 1-4. (2) Lymph nodes 5-8. (3) Lymph nodes 9-12. (4) Lymph node 13.');
});

test('granulomatous inflammation: bare node macro, ZN/GMS sentence, house diagnosis', () => {
  const r = run(one({ specimenName: 'subcarinal', procedure: 'Resection', tissue: 'Lymph node(s) only', largestNode: '1.5', result: 'Granulomatous inflammation', specialStains: 'ZN and GMS negative' }));
  assert.equal(r.macro, 'Received in formalin is a lymph node measuring 1.5 cm, bisected and all embedded in 1 block.');
  assert.equal(r.microscopy, 'Sections show one lymph node containing non-necrotising epithelioid granulomas. Ziehl-Neelsen and Grocott stains are negative for acid-fast bacilli and fungal organisms. There is no evidence of malignancy.');
  assert.equal(r.diagnosis, 'LYMPH NODE, subcarinal, resection - GRANULOMATOUS INFLAMMATION; no evidence of malignancy (0/1)');
  const n = run(one({ result: 'Granulomatous inflammation', granulomaType: 'Necrotising' }));
  assert.ok(n.microscopy.includes('necrotising epithelioid granulomas with central necrosis'));
  assert.ok(!n.microscopy.includes('Ziehl-Neelsen'));
  assert.equal(n.diagnosis, 'LYMPH NODE, excision - GRANULOMATOUS INFLAMMATION, necrotising; no evidence of malignancy (0/1)');
});

test('metastatic carcinoma: automatic x/y, largest deposit, extranodal extension, IHC free text', () => {
  const r = run(one({ specimenName: 'right axillary', procedure: 'Dissection', nodesReceived: '14', blocks: '5', result: 'Metastatic carcinoma', positiveNodes: '2', largestDeposit: '8', ihc: ['GATA3'], ihcResult: 'The tumour cells are positive for GATA3, in keeping with a breast primary' }));
  assert.equal(r.diagnosis, 'LYMPH NODES, right axillary, dissection - METASTATIC CARCINOMA (2/14); largest deposit 8 mm; no extranodal extension');
  assert.equal(r.microscopy, 'Sections show fibroadipose tissue and 14 lymph nodes. Two of the lymph nodes are involved by metastatic carcinoma, the largest deposit measuring 8 mm. There is no extranodal extension. The tumour cells are positive for GATA3, in keeping with a breast primary. The remaining 12 lymph nodes are reactive.');
  assert.ok(!r.microscopy.includes('no evidence of malignancy'));
  const ene = run(one({ result: 'Metastatic carcinoma', nodesReceived: '3', positiveNodes: '3', extranodal: 'Present', tumourType: 'consistent with a colorectal primary', ihc: ['AE1/AE3', 'CK7'] }));
  assert.equal(ene.diagnosis, 'LYMPH NODES, excision - METASTATIC CARCINOMA (3/3); extranodal extension present; consistent with a colorectal primary');
  assert.ok(ene.microscopy.includes('All three lymph nodes are involved by metastatic carcinoma. Extranodal extension is present. The tumour cells are highlighted by immunostains for pancytokeratin AE1/AE3 and CK7.'));
  assert.ok(!ene.microscopy.includes('remaining'));
});

test('each main result option yields the right capitalised diagnosis', () => {
  const dx = (values) => run(one({ specimenName: 'level II', ...values })).diagnosis;
  assert.equal(dx({ result: 'Negative - reactive' }), 'LYMPH NODE, level II, excision - NO EVIDENCE OF MALIGNANCY (0/1)');
  assert.equal(dx({ result: 'Negative - unremarkable' }), 'LYMPH NODE, level II, excision - NO EVIDENCE OF MALIGNANCY (0/1)');
  assert.ok(run(one({ result: 'Negative - unremarkable' })).microscopy.startsWith('Sections show fibroadipose tissue and one lymph node with preserved architecture.'));
  assert.equal(dx({ result: 'Granulomatous inflammation' }), 'LYMPH NODE, level II, excision - GRANULOMATOUS INFLAMMATION; no evidence of malignancy (0/1)');
  assert.equal(dx({ result: 'Metastatic carcinoma' }), 'LYMPH NODE, level II, excision - METASTATIC CARCINOMA (1/1); no extranodal extension');
  assert.equal(dx({ result: 'Metastatic malignant melanoma', largestDeposit: '12', ihc: ['S100/SOX10/Melan-A'] }), 'LYMPH NODE, level II, excision - METASTATIC MALIGNANT MELANOMA (1/1); largest deposit 12 mm; no extranodal extension');
  assert.ok(run(one({ result: 'Metastatic malignant melanoma', ihc: ['S100/SOX10/Melan-A'] })).microscopy.includes('The tumour cells are highlighted by immunostain for S100, SOX10 and Melan-A.'));
  assert.equal(dx({ result: 'Other metastatic tumour', tumourType: 'Squamous cell carcinoma' }), 'LYMPH NODE, level II, excision - METASTATIC SQUAMOUS CELL CARCINOMA (1/1); no extranodal extension');
  assert.equal(dx({ result: 'Other metastatic tumour' }), 'LYMPH NODE, level II, excision - METASTATIC TUMOUR (1/1); no extranodal extension');
  assert.equal(dx({ result: 'Lymphoma - see comment' }), 'LYMPH NODE, level II, excision - LYMPHOMA; see comment');
});

test('lymphoma: microscopy defers to the comment and the work-up snippet is auto-suggested', () => {
  const r = run(one({ result: 'Lymphoma - see comment', tissue: 'Lymph node(s) only', largestNode: '3.5', blocks: '3' }));
  assert.equal(r.macro, 'Received in formalin is a lymph node measuring 3.5 cm, serially sliced and all embedded in 3 blocks.');
  assert.equal(r.blockKey, '(1) Lymph node, slice 1. (2) Lymph node, slice 2. (3) Lymph node, slice 3.');
  assert.equal(r.microscopy, 'Sections show one lymph node with effaced architecture replaced by an atypical lymphoid infiltrate. See comment.');
  assert.ok(r.comment.startsWith('The features are those of a lymphoproliferative disorder.'));
  assert.ok(!run(one({})).comment);
});

test('blank sizes and counts leave no dangling text; microscopy count overrides the macro count', () => {
  const r = run(one({ specimenName: 'station 7', nodesReceived: '', tissueSize: '', largestNode: '' }));
  assert.equal(r.macro, 'Received in formalin is a piece of fibroadipose tissue containing one lymph node. All embedded in 1 block.');
  assert.ok(!/undefined|__|measuring\s*\./.test(r.report));
  const bare = run(one({ tissue: 'Lymph node(s) only', nodesReceived: '2', largestNode: '' }));
  assert.equal(bare.macro, 'Received in formalin are two lymph nodes. All embedded in 1 block.');
  const micro = run(one({ nodesReceived: '3', nodesTotal: '5' }));
  assert.ok(micro.diagnosis.endsWith('(0/5)'));
  assert.ok(micro.microscopy.includes('five reactive lymph nodes'));
  const none = run(one({ nodesReceived: '0' }));
  assert.equal(none.microscopy, 'Sections show fibroadipose tissue with no lymph node identified. There is no evidence of malignancy.');
  assert.ok(none.diagnosis.endsWith('NO EVIDENCE OF MALIGNANCY (0/0)'));
});

test('block key override, mm/cm suffixes, IHC on a negative node with several stains, additional notes', () => {
  const r = run(one({ blockKeyText: '(1) Largest node, bisected. (2) Remaining nodes', nodesReceived: '5', blocks: '2', largestNode: '15 mm', ihc: ['MNF116', 'CK7'], additionalNotes: 'Focal sinus histiocytosis is noted' }));
  assert.equal(r.blockKey, '(1) Largest node, bisected. (2) Remaining nodes.');
  assert.ok(r.macro.includes('containing five lymph nodes, the largest 15 mm.'));
  assert.equal(r.microscopy, 'Sections show fibroadipose tissue and five reactive lymph nodes. No suspicious cells are identified on immunostains for pancytokeratin MNF116 and CK7. There is no evidence of malignancy. Focal sinus histiocytosis is noted.');
  const sln = run(one({ procedure: 'Sentinel lymph node biopsy', specimenName: 'Left SLN1' }));
  assert.equal(sln.diagnosis, 'LYMPH NODE, left SLN1, sentinel lymph node biopsy - NO EVIDENCE OF MALIGNANCY (0/1)');
});
