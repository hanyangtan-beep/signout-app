// Phase 4b: stoma closure / revision template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/stoma.js';

const schema = JSON.parse(readFileSync(new URL('../schemas/stoma.json', import.meta.url), 'utf8'));
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  c.options = { ...c.options, ...options };
  return c;
};

const HOUSE_MICRO = 'Sections show small bowel with an ileostomy site covered by hyperkeratotic skin. The adjacent mucosa shows prolapse-type changes with fibromuscular obliteration of the lamina propria, crypt distortion and surface erosion. Granulation tissue with foreign body giant cell reaction to suture material is present in the wall. The resection margins are viable. There is no evidence of dysplasia or malignancy.';

test('example: loop ileostomy closure with prolapse change and suture granuloma reads like the house report', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Small bowel, loop ileostomy, closure');
  assert.equal(r.macro, 'Received in formalin is a segment of small bowel measuring 6 cm in length and up to 3 cm in diameter, with an attached ellipse of skin measuring 3 x 2 cm at the stoma site. The mucosa is congested and prolapsed at the stoma. Representative sections in 3 blocks.');
  assert.equal(r.blockKey, '(1) Stoma with skin. (2) Bowel wall. (3) Proximal and distal margins.');
  assert.equal(r.microscopy, HOUSE_MICRO);
  assert.equal(r.diagnosis, 'SMALL BOWEL, loop ileostomy, closure - ILEOSTOMY WITH REACTIVE AND PROLAPSE-TYPE CHANGES; no evidence of dysplasia or malignancy');
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('(A)'));
});

test('defaults give the roadmap default diagnosis line', () => {
  const r = run(createCase(schema, 1));
  assert.equal(r.diagnosis, 'SMALL BOWEL, ileostomy, closure - ILEOSTOMY WITH REACTIVE AND PROLAPSE-TYPE CHANGES; no evidence of dysplasia or malignancy');
  assert.equal(r.microscopy, HOUSE_MICRO);
  assert.equal(r.specimens, 'Small bowel, ileostomy, closure');
  const typed = run(one({ specimenName: 'Small bowel, ileostomy, Hartmann reversal' }));
  assert.equal(typed.specimens, 'Small bowel, ileostomy, Hartmann reversal');
});

test('macro and block key are numbered (1)…(3) and vanish when options.macro is false', () => {
  const on = run(example());
  assert.match(on.blockKey, /^\(1\) .* \(2\) .* \(3\) /);
  assert.ok(on.report.indexOf(on.macro) < on.report.indexOf(on.blockKey));
  assert.ok(on.report.indexOf(on.blockKey) < on.report.indexOf(on.microscopy));
  const ex = example();
  ex.options.macro = false;
  const off = run(ex);
  assert.equal(off.macro, '');
  assert.equal(off.blockKey, '');
  assert.ok(!off.report.includes('Received in formalin'));
  assert.ok(!off.report.includes('BLOCK KEY'));
});

test('macro options: serosa, suture material, hernia sac and no skin change the paragraph and block key', () => {
  const r = run(one({ length: '10', diameter: '4', skinIncluded: false, mucosaMacro: 'Ulcerated', serosaMacro: 'Fibrous adhesions', sutureMacro: true, herniaSacMacro: true, blocks: '4' }));
  assert.equal(r.macro, 'Received in formalin is a segment of small bowel measuring 10 cm in length and up to 4 cm in diameter. The mucosa is ulcerated at the stoma. The serosa shows fibrous adhesions. Suture material is present in the wall. A parastomal hernia sac of fibrous tissue is also received. Representative sections in 4 blocks.');
  assert.equal(r.blockKey, '(1) Stoma site. (2) Bowel wall. (3) Proximal and distal margins. (4) Parastomal hernia sac.');
  assert.ok(r.microscopy.startsWith('Sections show small bowel with an ileostomy site. '));
  assert.ok(r.diagnosis.includes('; parastomal hernia sac;'));
});

test('two-part case keeps (A)/(B) on every block; colostomy sits in the large bowel', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, length: '6', diameter: '3', skinSize: '3x2' };
  c.parts[1].values = { ...c.parts[1].values, stomaType: 'Colostomy, end', procedure: 'Reversal', peristomalSkin: 'Unremarkable', prolapseChange: false, sutureReaction: false };
  const r = run(c);
  assert.equal(r.specimens, '(A) Small bowel, ileostomy, closure\n(B) Large bowel, end colostomy, reversal');
  assert.match(r.macro, /^\(A\) Received in formalin is a segment of small bowel measuring 6 cm in length and up to 3 cm in diameter, with an attached ellipse of skin measuring 3 x 2 cm at the stoma site\.[\s\S]*\n\n\(B\) Received in formalin is a segment of large bowel, with an attached ellipse of skin at the stoma site\. /);
  assert.equal(r.blockKey, '(A) (1) Stoma with skin. (2) Bowel wall. (3) Proximal and distal margins.\n(B) (1) Stoma with skin. (2) Bowel wall. (3) Proximal and distal margins.');
  assert.match(r.microscopy, /^\(A\) Sections show small bowel with an ileostomy site[\s\S]*\n\n\(B\) Sections show large bowel with a colostomy site covered by unremarkable skin\. The adjacent mucosa is unremarkable\. The resection margins are viable\. There is no evidence of dysplasia or malignancy\.$/);
  assert.equal(r.diagnosis, '(A) SMALL BOWEL, ileostomy, closure - ILEOSTOMY WITH REACTIVE AND PROLAPSE-TYPE CHANGES; no evidence of dysplasia or malignancy\n(B) LARGE BOWEL, end colostomy, reversal - COLOSTOMY WITH NO SIGNIFICANT ABNORMALITY; no evidence of dysplasia or malignancy');
});

test('each main-result combination yields the right capitalised diagnosis', () => {
  const dx = (values) => run(one(values)).diagnosis;
  const quiet = { peristomalSkin: 'Unremarkable', prolapseChange: false, sutureReaction: false };
  assert.equal(dx({}), 'SMALL BOWEL, ileostomy, closure - ILEOSTOMY WITH REACTIVE AND PROLAPSE-TYPE CHANGES; no evidence of dysplasia or malignancy');
  assert.equal(dx({ sutureReaction: false, peristomalSkin: 'Unremarkable' }), 'SMALL BOWEL, ileostomy, closure - ILEOSTOMY WITH PROLAPSE-TYPE CHANGES; no evidence of dysplasia or malignancy');
  assert.equal(dx({ prolapseChange: false }), 'SMALL BOWEL, ileostomy, closure - ILEOSTOMY WITH REACTIVE CHANGES; no evidence of dysplasia or malignancy');
  assert.equal(dx({ ...quiet, stenosis: 'Stenosis with mural fibrosis' }), 'SMALL BOWEL, ileostomy, closure - ILEOSTOMY WITH REACTIVE CHANGES; stenosis; no evidence of dysplasia or malignancy');
  assert.equal(dx({ ...quiet, stomaType: 'Colostomy', procedure: 'Revision' }), 'LARGE BOWEL, colostomy, revision - COLOSTOMY WITH NO SIGNIFICANT ABNORMALITY; no evidence of dysplasia or malignancy');
  assert.equal(dx({ ...quiet, ischaemia: 'Transmural', marginsViable: false }), 'SMALL BOWEL, ileostomy, closure - ILEOSTOMY WITH TRANSMURAL ISCHAEMIC CHANGE; ischaemic change at the resection margins; no evidence of dysplasia or malignancy');
  assert.equal(dx({ ischaemia: 'Superficial' }), 'SMALL BOWEL, ileostomy, closure - ILEOSTOMY WITH REACTIVE AND PROLAPSE-TYPE CHANGES; superficial ischaemic change; no evidence of dysplasia or malignancy');
  assert.equal(dx({ ischaemia: 'Transmural' }), 'SMALL BOWEL, ileostomy, closure - ILEOSTOMY WITH REACTIVE AND PROLAPSE-TYPE CHANGES; TRANSMURAL ISCHAEMIC CHANGE; no evidence of dysplasia or malignancy');
  assert.equal(dx({ ...quiet, ibdActivity: 'Inactive chronic' }), 'SMALL BOWEL, ileostomy, closure - ILEOSTOMY WITH INACTIVE CHRONIC INFLAMMATORY BOWEL DISEASE; no evidence of dysplasia or malignancy; see comment');
  assert.equal(dx({ ibdActivity: 'Active', diverticula: true, herniaSac: true }), 'SMALL BOWEL, ileostomy, closure - ILEOSTOMY WITH REACTIVE AND PROLAPSE-TYPE CHANGES; parastomal hernia sac; active chronic inflammatory bowel disease at the stoma; diverticula; no evidence of dysplasia or malignancy; see comment');
});

test('secondary findings add microscopy sentences and the IBD comment', () => {
  const r = run(one({ ischaemia: 'Superficial', stenosis: 'Mural fibrosis', herniaSac: true, ibdActivity: 'Active', diverticula: true, peristomalSkin: 'Pseudoepitheliomatous hyperplasia' }));
  assert.equal(r.microscopy, 'Sections show small bowel with an ileostomy site covered by skin showing pseudoepitheliomatous hyperplasia. The adjacent mucosa shows prolapse-type changes with fibromuscular obliteration of the lamina propria, crypt distortion and surface erosion. There is superficial ischaemic change with withering of crypts and surface erosion. Granulation tissue with foreign body giant cell reaction to suture material is present in the wall. The wall shows fibrosis. The parastomal hernia sac consists of fibrous tissue with a mesothelial lining. The mucosa also shows crypt architectural distortion and basal plasmacytosis with cryptitis and crypt abscesses, in keeping with active chronic inflammatory bowel disease (see comment). Diverticula lined by mucosa extend through the muscularis propria. The resection margins are viable. There is no evidence of dysplasia or malignancy.');
  assert.ok(r.diagnosis.includes('; mural fibrosis;'));
  assert.equal(r.comment, 'Features of chronic inflammatory bowel disease are present at the stoma. Correlation with the clinical history and previous biopsies is recommended.');
  const ibdOnly = run(one({ prolapseChange: false, ibdActivity: 'Inactive chronic' }));
  assert.ok(ibdOnly.microscopy.includes('in the wall. The mucosa shows crypt architectural distortion and basal plasmacytosis without active inflammation'));
  assert.ok(!ibdOnly.microscopy.includes('also shows'));
  assert.ok(!ibdOnly.microscopy.includes('The adjacent mucosa is unremarkable.'));
  const ulc = run(one({ peristomalSkin: 'Ulcerated', additionalNotes: 'Scattered eosinophils are noted.' }));
  assert.ok(ulc.microscopy.startsWith('Sections show small bowel with an ileostomy site with ulceration of the peristomal skin. '));
  assert.ok(ulc.microscopy.endsWith('There is no evidence of dysplasia or malignancy. Scattered eosinophils are noted.'));
});

test('dysplasia / malignancy options give a short capitalised line and the QMH GI cancer template comment', () => {
  const d = run(one({ neoplasia: 'Dysplasia - see comment' }));
  assert.equal(d.diagnosis, 'SMALL BOWEL, ileostomy, closure - DYSPLASIA; ILEOSTOMY WITH REACTIVE AND PROLAPSE-TYPE CHANGES; see comment');
  assert.ok(d.microscopy.includes('Dysplasia is present in the mucosa (see comment). The resection margins are viable.'));
  assert.ok(!d.microscopy.includes('no evidence of dysplasia'));
  assert.ok(d.comment.includes('QMH GI cancer template'));
  assert.ok(!d.comment.includes('{parts}'));
  const m = run(one({ neoplasia: 'Malignancy - see comment', stomaType: 'Colostomy, end' }));
  assert.equal(m.diagnosis, 'LARGE BOWEL, end colostomy, closure - MALIGNANCY; COLOSTOMY WITH REACTIVE AND PROLAPSE-TYPE CHANGES; see comment');
  assert.ok(m.microscopy.includes('A malignant neoplasm is present (see comment).'));
  assert.equal((m.diagnosis.match(/see comment/g) || []).length, 1);
});

test('blank size fields produce no dangling text', () => {
  const r = run(one({ length: '', diameter: '', skinIncluded: true, skinSize: '', blocks: '1' }));
  assert.equal(r.macro, 'Received in formalin is a segment of small bowel, with an attached ellipse of skin at the stoma site. The mucosa is unremarkable. Representative sections in 1 block.');
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.report.includes('__'));
  assert.ok(!r.report.includes('measuring'));
  const d = run(one({ length: '', diameter: '2.5', skinIncluded: false, skinSize: '3 x 2' }));
  assert.ok(d.macro.startsWith('Received in formalin is a segment of small bowel measuring up to 2.5 cm in diameter. '));
  assert.ok(!d.macro.includes('skin'));
  assert.equal(gen.sizePhrase('3x2'), '3 x 2 cm');
  assert.equal(gen.sizePhrase('30 x 20 mm'), '30 x 20 mm');
  assert.equal(gen.sizePhrase(''), '');
});

test('metadata and example integrity', () => {
  assert.equal(schema.id, 'stoma');
  assert.equal(schema.generator, 'stoma');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'GI');
  assert.equal(schema.rank, 39);
  assert.equal(schema.label, 'Stoma');
  assert.equal(schema.organ, 'SMALL BOWEL');
  assert.equal(schema.name, 'Stoma closure / revision');
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  assert.ok(schema.aliases.includes('Hartmann reversal'));
  assert.equal(schema.maxParts, 3);
  assert.equal(schema.defaultParts, 1);
  assert.equal(schema.style.british, true);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const f of schema.fields) {
    assert.ok('default' in f, `field ${f.id} needs a default`);
    assert.ok(f.id && f.label && f.type, `field ${f.id} needs id, label and type`);
  }
  for (const p of schema.example.parts) {
    for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is not a field`);
    for (const id of ids) assert.ok(id in p.values, `example is missing field ${id}`);
  }
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  const idx = macroFields.map((id) => schema.fields.findIndex((f) => f.id === id));
  assert.equal(idx[idx.length - 1] - idx[0] + 1, idx.length, 'Macroscopy fields are consecutive');
  assert.equal(gen.default.macro, gen.macro);
  assert.equal(gen.default.blockKey, gen.blockKey);
  assert.equal(gen.default.specimenName, gen.specimenName);
});
