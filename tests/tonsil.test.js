// Phase 4b: tonsils / adenoids template (roadmap item 19). Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/tonsil.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('tonsils');
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  c.options = { ...c.options, ...options };
  return c;
};

const SCC = 'Squamous cell carcinoma - see comment (QMH head and neck template)';

test('example: bilateral tonsils with cryptitis and actinomyces reads like the house report', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Bilateral tonsils, tonsillectomy');
  assert.equal(r.macro, 'Received in formalin are two tonsils labelled left and right. The left tonsil measures 2.5 x 2 x 1.5 cm and weighs 4 g; the right tonsil measures 2.4 x 2 x 1.4 cm and weighs 4 g. The surfaces are cryptic and the cut surfaces are unremarkable. Representative sections in 2 blocks.');
  assert.equal(r.blockKey, '(1) Left tonsil. (2) Right tonsil.');
  assert.equal(r.microscopy, 'Sections of the tonsils show reactive lymphoid follicles with germinal centres. The surface is covered by benign squamous epithelium. The crypts contain keratinous debris and neutrophils, in keeping with cryptitis. A few colonies of actinomyces are noted on the surface. There is no evidence of dysplasia or malignancy.');
  assert.equal(r.diagnosis, 'TONSILS, bilateral, tonsillectomy - REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA with CHRONIC TONSILLITIS; actinomyces colonies present');
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('(A)'));
});

test('house §4.11 microscopy paragraph is reproduced verbatim without cryptitis', () => {
  const r = run(one({ actinomyces: 'Present' }));
  assert.equal(r.microscopy, 'Sections of the tonsils show reactive lymphoid follicles with germinal centres. The surface is covered by benign squamous epithelium. A few colonies of actinomyces are noted on the surface. There is no evidence of dysplasia or malignancy.');
  const none = run(one({ actinomyces: 'Absent' }));
  assert.ok(!none.microscopy.includes('actinomyces'), 'actinomyces sentence dropped when absent');
  assert.equal(none.diagnosis, 'TONSILS, bilateral, tonsillectomy - REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA');
});

test('macro and block key are numbered (1)…(2) and vanish when options.macro is false', () => {
  const on = run(example());
  assert.match(on.blockKey, /^\(1\) .* \(2\) /);
  assert.ok(on.report.indexOf(on.macro) < on.report.indexOf(on.blockKey));
  assert.ok(on.report.indexOf(on.blockKey) < on.report.indexOf(on.microscopy));
  const ex = example();
  ex.options.macro = false;
  const off = run(ex);
  assert.equal(off.macro, '');
  assert.equal(off.blockKey, '');
  assert.ok(!off.report.includes('Received in formalin'));
  assert.ok(!off.report.includes('BLOCK KEY'));
  // Extra blocks split between the two tonsils.
  assert.equal(run(one({ blocks: '4' })).blockKey, '(1-2) Left tonsil. (3-4) Right tonsil.');
});

test('two-part case keeps (A)/(B) on every block', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, specimenName: 'Left tonsil, tonsillectomy', leftSize: '2 x 1.5 x 1', leftWeight: '3', blocks: '1' };
  c.parts[1].values = { ...c.parts[1].values, specimenName: 'Right tonsil, tonsillectomy', rightSize: '2.2 x 1.5 x 1', rightWeight: '3.5', blocks: '1', fibrosis: 'Present' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Left tonsil, tonsillectomy\n(B) Right tonsil, tonsillectomy');
  assert.equal(r.macro, '(A) Received in formalin is a left tonsil measuring 2 x 1.5 x 1 cm and weighing 3 g. The surface is cryptic and the cut surface is unremarkable. Representative sections in 1 block.\n\n(B) Received in formalin is a right tonsil measuring 2.2 x 1.5 x 1 cm and weighing 3.5 g. The surface is cryptic and the cut surface is unremarkable. Representative sections in 1 block.');
  assert.equal(r.blockKey, '(A) (1) Left tonsil.\n(B) (1) Right tonsil.');
  assert.match(r.microscopy, /^\(A\) Sections of the tonsil show reactive lymphoid follicles[\s\S]*\n\n\(B\) Sections of the tonsil show reactive lymphoid follicles with germinal centres\. The surface is covered by benign squamous epithelium\. There is stromal fibrosis, in keeping with chronic tonsillitis\. There is no evidence of dysplasia or malignancy\.$/);
  assert.equal(r.diagnosis, '(A) LEFT TONSIL, tonsillectomy - REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA\n(B) RIGHT TONSIL, tonsillectomy - REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA with CHRONIC TONSILLITIS');
});

test('each specimen type and lymphoid result yields the right capitalised diagnosis', () => {
  const dx = (values) => run(one(values)).diagnosis;
  assert.equal(dx({}), 'TONSILS, bilateral, tonsillectomy - REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA');
  assert.equal(dx({ cryptitis: 'Present' }), 'TONSILS, bilateral, tonsillectomy - REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA with CHRONIC TONSILLITIS');
  assert.equal(dx({ fibrosis: 'Present', actinomyces: 'Present' }), 'TONSILS, bilateral, tonsillectomy - REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA with CHRONIC TONSILLITIS; actinomyces colonies present');
  assert.equal(dx({ lymphoidHyperplasia: 'Unremarkable lymphoid tissue' }), 'TONSILS, bilateral, tonsillectomy - UNREMARKABLE LYMPHOID TISSUE');
  assert.equal(dx({ lymphoidHyperplasia: 'Unremarkable lymphoid tissue', fibrosis: 'Present' }), 'TONSILS, bilateral, tonsillectomy - CHRONIC TONSILLITIS');
  assert.equal(dx({ specimenName: 'Left tonsil, tonsillectomy' }), 'LEFT TONSIL, tonsillectomy - REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA');
  assert.equal(dx({ specimenName: 'Right tonsil, tonsillectomy', epithelium: 'Ulcerated' }), 'RIGHT TONSIL, tonsillectomy - REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA; surface ulceration');
  assert.equal(dx({ specimenName: 'Adenoids, adenoidectomy', epithelium: 'Benign respiratory (adenoids)' }), 'ADENOIDS, adenoidectomy - REACTIVE LYMPHOID HYPERPLASIA');
  assert.equal(dx({ specimenName: 'Tonsil, biopsy', biopsySite: 'right tonsil' }), 'TONSIL, right tonsil, biopsy - NO EVIDENCE OF MALIGNANCY');
  assert.equal(dx({ specimenName: 'Tonsil, biopsy', biopsySite: '' }), 'TONSIL, biopsy - NO EVIDENCE OF MALIGNANCY');
});

test('adenoids and biopsy: specimen line, macro, block key and epithelium wording', () => {
  const a = run(one({ specimenName: 'Adenoids, adenoidectomy', aggregateSize: '2x1.5x0.5', aggregateWeight: '2', blocks: '1', epithelium: 'Benign respiratory (adenoids)' }));
  assert.equal(a.specimens, 'Adenoids, adenoidectomy');
  assert.equal(a.macro, 'Received in formalin are multiple fragments of adenoid tissue measuring 2 x 1.5 x 0.5 cm in aggregate and weighing 2 g. All embedded in 1 block.');
  assert.equal(a.blockKey, '(1) Adenoids, all embedded.');
  assert.equal(a.microscopy, 'Sections of the adenoids show reactive lymphoid follicles with germinal centres. The surface is covered by benign respiratory epithelium. There is no evidence of dysplasia or malignancy.');
  const b = run(one({ specimenName: 'Tonsil, biopsy', biopsySite: 'Right tonsil', aggregateSize: '0.5', blocks: '1' }));
  assert.equal(b.specimens, 'Tonsil, right tonsil, biopsy');
  assert.equal(b.macro, 'Received in formalin is a piece of tissue measuring 0.5 cm. All embedded in 1 block.');
  assert.equal(b.blockKey, '(1) Tonsil biopsy, all embedded.');
  assert.ok(b.microscopy.startsWith('Sections of the tonsil show reactive lymphoid follicles'));
});

test('asymmetric tonsil flag adds the lymphoma / p16 / EBER comment and withholds the negative closer', () => {
  const r = run(one({ surface: 'Asymmetric - larger side', largerSide: 'Right', atypicalInfiltrate: 'Present - see comment' }));
  assert.ok(r.macro.includes('The surfaces are asymmetric, the right being the larger and the cut surfaces are unremarkable.'));
  assert.ok(r.microscopy.endsWith('In addition, there is an atypical lymphoid infiltrate (see comment).'));
  assert.ok(!r.microscopy.includes('no evidence of dysplasia'));
  assert.equal(r.diagnosis, 'TONSILS, bilateral, tonsillectomy - REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA; ATYPICAL LYMPHOID INFILTRATE - SEE COMMENT');
  assert.equal(r.comment, 'In view of the clinical asymmetry, immunohistochemistry is recommended to exclude lymphoma; p16 and EBER may be considered.');
});

test('squamous cell carcinoma gives a short capitalised line and the QMH head and neck template comment', () => {
  const r = run(one({ specimenName: 'Left tonsil, tonsillectomy', neoplasia: SCC, cutSurface: 'Mass - describe', cutSurfaceMass: '1.5 cm firm white area' }));
  assert.equal(r.diagnosis, 'LEFT TONSIL, tonsillectomy - SQUAMOUS CELL CARCINOMA; reactive follicular lymphoid hyperplasia; see comment');
  assert.ok(r.macro.includes('On sectioning there is a mass: 1.5 cm firm white area.'));
  assert.ok(r.microscopy.endsWith('In addition, there is an invasive squamous cell carcinoma (see comment).'));
  assert.ok(!r.microscopy.includes('no evidence of dysplasia'));
  assert.ok(r.comment.includes('QMH head and neck cancer template'));
  assert.ok(!r.comment.includes('{parts}'));
});

test('blank size / weight fields produce no dangling text', () => {
  const r = run(one({ leftSize: '', leftWeight: '', rightSize: '', rightWeight: '', surface: 'Unremarkable', cutSurface: 'Fibrotic', blocks: '1' }));
  assert.equal(r.macro, 'Received in formalin are two tonsils labelled left and right. The surfaces are unremarkable and the cut surfaces are fibrotic. Representative sections in 1 block.');
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.report.includes('__'));
  assert.ok(!r.report.includes(' cm'));
  assert.ok(!/\d g\b/.test(r.report) && !r.report.includes('weighs'));
  const half = run(one({ leftSize: '2.5x2x1.5', leftWeight: '', rightSize: '', rightWeight: '3' }));
  assert.ok(half.macro.includes('The left tonsil measures 2.5 x 2 x 1.5 cm; the right tonsil weighs 3 g.'));
  const uni = run(one({ specimenName: 'Right tonsil, tonsillectomy', rightSize: '', rightWeight: '' }));
  assert.ok(uni.macro.startsWith('Received in formalin is a right tonsil. The surface is cryptic'));
  const ad = run(one({ specimenName: 'Adenoids, adenoidectomy', aggregateSize: '', aggregateWeight: '', blocks: '1' }));
  assert.equal(ad.macro, 'Received in formalin are multiple fragments of adenoid tissue. All embedded in 1 block.');
});

test('metadata and example integrity', () => {
  assert.equal(schema.id, 'tonsils');
  assert.equal(schema.generator, 'tonsil');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Head and neck');
  assert.equal(schema.rank, 34);
  assert.equal(schema.label, 'Tonsils');
  assert.equal(schema.organ, 'TONSILS');
  assert.equal(schema.name, 'Tonsils / adenoids');
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['tonsil', 'tonsillectomy', 'adenoids', 'adenoidectomy', 'adenotonsillectomy', 'actinomyces']) assert.ok(schema.aliases.includes(a), `alias ${a}`);
  assert.equal(schema.maxParts, 3);
  assert.equal(schema.defaultParts, 1);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const f of schema.fields) {
    assert.ok('default' in f, `field ${f.id} needs a default`);
    assert.ok(f.id && f.label && f.type, `field ${f.id} needs id, label and type`);
    if (f.type === 'select') assert.ok(f.options.includes(f.default), `default of ${f.id} is an option`);
  }
  for (const p of schema.example.parts) {
    for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is not a field`);
    for (const id of ids) assert.ok(id in p.values, `example lacks field ${id}`);
  }
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  const idx = macroFields.map((id) => schema.fields.findIndex((f) => f.id === id));
  assert.equal(idx[idx.length - 1] - idx[0] + 1, idx.length, 'Macroscopy fields are consecutive');
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  assert.equal(gen.default.macro, gen.macro);
  assert.equal(gen.default.blockKey, gen.blockKey);
  assert.equal(gen.default.specimenName, gen.specimenName);
});
