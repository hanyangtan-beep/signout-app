// Accepted proofreading changes back into the form (src/writeback.js, src/textdiff.js and the patch
// layer of src/engine.js; docs/specs/proofreading.md, Phase 87). Every report text here is made up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCase, applyPatches } from '../src/engine.js';
import { tokens, diffWords, applyHunks } from '../src/textdiff.js';
import { writeBack, blockText, carryPatch, carryPatches, carryText, patchFor, showValue } from '../src/writeback.js';
import { loadAll } from '../src/registry.js';

const schema = {
  id: 'toy', version: '1', name: 'Toy', shortName: 'Toy', label: 'Toy', organ: 'TOY', system: 'GI', kind: 'benign resection',
  rank: 99, aliases: [], specimenNoun: 'resection', maxParts: 3, defaultParts: 1, generator: 'toy', style: { british: true },
  caseFields: [], options: [],
  fields: [
    { id: 'side', label: 'Side', type: 'select', options: ['Left', 'Right'], default: 'Left' },
    { id: 'size', label: 'Size (cm)', type: 'number', default: 2 },
    { id: 'colour', label: 'Colour', type: 'text', default: 'tan' },
    { id: 'inflammation', label: 'Inflammation', type: 'select', options: ['none', 'mild', 'moderate', 'marked'], default: 'mild' },
    { id: 'ulcer', label: 'Ulcer', type: 'checkbox', default: false },
    { id: 'features', label: 'Features', type: 'multiselect', options: ['fibrosis', 'oedema', 'haemorrhage'], default: [] },
    { id: 'note', label: 'Note', type: 'textarea', default: '' }
  ],
  example: { parts: [{ label: 'A', values: {} }] }
};
const gen = {
  specimenName: (p) => `Toy, ${p.values.side.toLowerCase()}, resection`,
  macro: (p) => `(${p.label}) Received is a ${p.values.colour} toy measuring ${p.values.size} cm.`,
  microscopy: (p) => {
    const v = p.values;
    const s = [`(${p.label}) Sections show a benign toy with ${v.inflammation} chronic inflammation.`];
    if (v.ulcer) s.push('There is surface ulceration.');
    if (v.features?.length) s.push(`There is ${v.features.join(' and ')}.`);
    if (v.note) s.push(v.note);
    s.push('There is no evidence of malignancy.');
    return s.join(' ');
  },
  diagnosis: (p) => `(${p.label}) TOY, ${p.values.side.toLowerCase()}, resection - BENIGN TOY`
};
const templates = { toy: { schema, generator: gen } };
const values = (extra = {}) => ({ side: 'Left', size: 2, colour: 'tan', inflammation: 'mild', ulcer: false, features: [], note: '', ...extra });
const mk = (extra = {}, partValues = {}) => ({
  schemaId: 'toy', options: {}, comment: '', caseTitle: '',
  meta: { macro: '', blockKey: '' },
  parts: [{ label: 'A', values: values(partValues) }], ...extra
});
const text = (cs, key) => blockText(generateCase(templates, cs), key);

// ---------- word differences ----------

test('tokens cover the whole text and keep decimals and apostrophes whole', () => {
  const t = 'It measures 2.5 cm (the patient\'s), see  below.';
  assert.equal(tokens(t).join(''), t);
  assert.ok(tokens(t).includes('2.5') && tokens(t).includes('patient\'s'));
});

test('diffWords gives each change with its place, and applyHunks makes them', () => {
  const a = 'Sections show mild chronic inflammation. No malignancy.';
  const b = 'Sections show moderate chronic inflammation. No malignancy is seen.';
  const h = diffWords(a, b);
  assert.equal(h.length, 2);
  assert.equal(a.slice(h[0].from, h[0].to), 'mild');
  assert.equal(h[0].text, 'moderate');
  assert.equal(applyHunks(a, h), b);
  assert.equal(applyHunks(a, [h[1]]), 'Sections show mild chronic inflammation. No malignancy is seen.');
  assert.deepEqual(diffWords(a, a), []);
});

test('diffWords joins changes a word or fewer apart when asked', () => {
  const a = 'the large red toy';
  const b = 'the small red box';
  assert.equal(diffWords(a, b).length, 2);
  const [one] = diffWords(a, b, { join: 1 });
  assert.equal(a.slice(one.from, one.to), 'large red toy');
  assert.equal(one.text, 'small red box');
});

// ---------- the patch layer ----------

test('no patches: the report prints as before', () => {
  const a = generateCase(templates, mk());
  const b = generateCase(templates, mk({ patches: {} }));
  assert.equal(a.report, b.report);
  assert.deepEqual(a.patched, {});
});

test('a patch is made over the form\'s text; one whose text is gone is listed and left out', () => {
  const out = generateCase(templates, mk({ patches: { microscopy: [{ find: 'a benign toy', replace: 'an unremarkable toy' }, { find: 'absent words', replace: 'x' }] } }));
  assert.match(out.microscopy, /Sections show an unremarkable toy with mild/);
  assert.equal(out.patched.microscopy.applied, 1);
  assert.equal(out.patched.microscopy.missed.length, 1);
  assert.match(out.formText.microscopy, /a benign toy/);
  assert.equal(out.generated.microscopy, out.microscopy, 'the patched text is the block before any manual edit');
});

test('a manual edit still wins over patches', () => {
  const out = generateCase(templates, mk({ patches: { microscopy: [{ find: 'a benign toy', replace: 'an unremarkable toy' }] }, edits: { microscopy: 'Typed.' } }));
  assert.equal(out.microscopy, 'Typed.');
  assert.match(out.generated.microscopy, /unremarkable/);
});

test('applyPatches needs each find once', () => {
  assert.deepEqual(applyPatches('a b a', [{ find: 'a', replace: 'c' }]), { text: 'a b a', missed: [{ find: 'a', replace: 'c' }] });
  assert.equal(applyPatches('a b a', [{ find: 'b', replace: 'c' }]).text, 'a c a');
});

// ---------- writing back into the form ----------

test('a changed choice goes back into the form, and the other blocks it changes are named', () => {
  const cs = mk();
  const goal = text(cs, 'diagnosis').replace('left', 'right');
  const r = writeBack(templates, cs, 'diagnosis', goal);
  assert.ok(r);
  assert.deepEqual(r.changes.map((c) => [c.field, c.from, c.to]), [['side', 'Left', 'Right']]);
  assert.deepEqual(r.patches, []);
  assert.deepEqual(r.also, ['specimens']);
  assert.equal(r.caseState.parts[0].values.side, 'Right');
  assert.equal(cs.parts[0].values.side, 'Left', 'the case passed in is not changed');
  assert.equal(text(r.caseState, 'diagnosis'), goal);
});

test('a number, a typed word, a tick and a list option go back into the form', () => {
  const cs = mk();
  const macro = text(cs, 'macro');
  let r = writeBack(templates, cs, 'macro', macro.replace('2 cm', '2.5 cm'));
  assert.deepEqual(r.changes.map((c) => [c.field, c.to]), [['size', 2.5]]);
  assert.equal(typeof r.caseState.parts[0].values.size, 'number', 'a number stays a number');
  r = writeBack(templates, cs, 'macro', macro.replace('tan', 'grey-white'));
  assert.deepEqual(r.changes.map((c) => [c.field, c.to]), [['colour', 'grey-white']]);
  const micro = text(cs, 'microscopy');
  r = writeBack(templates, cs, 'microscopy', micro.replace('inflammation.', 'inflammation. There is surface ulceration.'));
  assert.deepEqual(r.changes.map((c) => [c.field, c.to]), [['ulcer', true]]);
  r = writeBack(templates, cs, 'microscopy', micro.replace('inflammation.', 'inflammation. There is oedema.'));
  assert.deepEqual(r.changes.map((c) => [c.field, c.to]), [['features', ['oedema']]]);
  r = writeBack(templates, cs, 'microscopy', micro.replace('mild', 'moderate'));
  assert.deepEqual(r.changes.map((c) => [c.field, c.from, c.to]), [['inflammation', 'mild', 'moderate']]);
});

test('typed text and the comment take the change where it was typed', () => {
  const cs = mk({ comment: 'Discussed with Dr A on the ward.' }, { note: 'Focal fibrosis is noted.' });
  let r = writeBack(templates, cs, 'microscopy', text(cs, 'microscopy').replace('Focal fibrosis is noted.', 'There is focal fibrosis.'));
  assert.equal(r.caseState.parts[0].values.note, 'There is focal fibrosis.');
  assert.deepEqual(r.patches, []);
  r = writeBack(templates, cs, 'comment', 'Discussed with Dr A at the meeting.');
  assert.equal(r.caseState.comment, 'Discussed with Dr A at the meeting.');
});

test('the template\'s own wording is kept as a patch over the form\'s text', () => {
  const cs = mk();
  const goal = text(cs, 'microscopy').replace('a benign toy', 'an unremarkable toy');
  const r = writeBack(templates, cs, 'microscopy', goal);
  assert.deepEqual(r.changes, []);
  assert.equal(r.patches.length, 1);
  assert.equal(text(r.caseState, 'microscopy'), goal);
  assert.equal(r.caseState.parts[0].values.inflammation, 'mild');
});

test('a rewrite with a form change and new wording: the form takes its part, the rest is patched', () => {
  const cs = mk();
  const goal = '(A) Sections show an unremarkable toy, with moderate chronic inflammation. There is no evidence of malignancy.';
  const r = writeBack(templates, cs, 'microscopy', goal);
  assert.ok(r);
  assert.deepEqual(r.changes.map((c) => [c.field, c.to]), [['inflammation', 'moderate']]);
  assert.ok(r.patches.length >= 1);
  assert.equal(text(r.caseState, 'microscopy'), goal);
});

test('a change the form could make in two parts goes to the part whose text it is', () => {
  const cs = mk();
  cs.parts.push({ label: 'B', values: values({ side: 'Right', inflammation: 'marked' }) });
  const dx = text(cs, 'diagnosis');
  const r = writeBack(templates, cs, 'diagnosis', dx.replace('(B) TOY, right', '(B) TOY, left'));
  assert.deepEqual(r.changes.map((c) => [c.part, c.field, c.to]), [[1, 'side', 'Left']]);
  assert.match(r.changes[0].label, /^\(B\) Side/);
});

test('patches kept earlier stay and the next change is made after them', () => {
  const cs = mk();
  const a = writeBack(templates, cs, 'microscopy', text(cs, 'microscopy').replace('a benign toy', 'an unremarkable toy'));
  const b = writeBack(templates, a.caseState, 'microscopy', text(a.caseState, 'microscopy').replace('There is no evidence', 'There is no histological evidence'));
  assert.equal(b.caseState.patches.microscopy.length, 2);
  assert.match(text(b.caseState, 'microscopy'), /an unremarkable toy .* no histological evidence/);
});

test('patchFor widens to whole words until the text is there once', () => {
  const t = 'There is mild oedema. There is mild fibrosis.';
  const p = patchFor(t, t.replace('mild fibrosis', 'marked fibrosis'));
  assert.equal(applyPatches(t, [p]).text, 'There is mild oedema. There is marked fibrosis.');
  assert.equal(t.split(p.find).length, 2, 'the find occurs once');
  assert.equal(patchFor(t, t), null);
});

test('showValue reads a value for a note', () => {
  assert.equal(showValue(''), '(blank)');
  assert.equal(showValue(true), 'ticked');
  assert.equal(showValue(['a', 'b']), 'a, b');
});

// ---------- carrying patches and rewrites over later form changes ----------

test('a patch is carried over a form change inside its text', () => {
  const before = 'Sections show a benign toy with mild chronic inflammation.';
  const after = 'Sections show a benign toy with moderate chronic inflammation.';
  const p = { find: 'a benign toy with mild chronic', replace: 'an unremarkable toy, with mild chronic' };
  assert.deepEqual(carryPatch(p, before, after), { find: 'a benign toy with moderate chronic', replace: 'an unremarkable toy, with moderate chronic' });
  assert.equal(carryPatch({ find: 'benign toy', replace: 'unremarkable toy' }, before, after), null, 'nothing changed inside: not carried');
  assert.deepEqual(carryPatch({ find: 'mild chronic', replace: 'moderate chronic' }, before, after), { drop: true }, 'the form now reads as the patch did');
  assert.equal(carryPatch({ find: 'with mild', replace: 'showing' }, before, after), null, 'the patch took out the words changed');
});

test('carryPatches keeps a case\'s patches with its form', () => {
  const work = mk({ patches: { microscopy: [{ find: 'a benign toy with mild chronic', replace: 'an unremarkable toy, with mild chronic' }] } });
  const prev = generateCase(templates, work);
  assert.match(prev.microscopy, /an unremarkable toy, with mild chronic inflammation/);
  work.parts[0].values.inflammation = 'marked';
  const out = generateCase(templates, work);
  assert.equal(out.patched.microscopy.missed.length, 1, 'the patch no longer fits');
  assert.equal(carryPatches(work, prev, out), true);
  const again = generateCase(templates, work);
  assert.equal(again.patched.microscopy.missed.length, 0);
  assert.match(again.microscopy, /an unremarkable toy, with marked chronic inflammation/);
});

test('a rewrite is carried over a form change where its words are there once', () => {
  const before = 'Sections show mild chronic inflammation. The toy measures 2 cm.';
  const after = 'Sections show moderate chronic inflammation. The toy measures 2 cm.';
  assert.equal(carryText(before, after, 'There is mild chronic inflammation; the toy is 2 cm.'), 'There is moderate chronic inflammation; the toy is 2 cm.');
  assert.equal(carryText(before, after, 'mild inflammation, mild oedema.'), null, 'twice: cannot be placed');
  assert.equal(carryText(before, after, 'The toy is 2 cm and inflamed.'), 'The toy is 2 cm and inflamed.', 'reworded there: left as it is');
});

// ---------- on the real templates ----------

test('on template examples, a changed measurement goes back into the form or is kept as a patch, never lost', async () => {
  const registry = await loadAll();
  let tried = 0; let intoForm = 0;
  for (const [id, t] of Object.entries(registry)) {
    const ex = t.schema.example;
    if (!ex) continue;
    const cs = { schemaId: id, options: {}, comment: ex.comment || '', caseTitle: ex.caseTitle || '', meta: { macro: '', blockKey: '' }, parts: JSON.parse(JSON.stringify(ex.parts)) };
    let out;
    try { out = generateCase(registry, cs); } catch { continue; }
    const macro = blockText(out, 'macro');
    const m = macro.match(/\b(\d+(?:\.\d+)?)\s*(mm|cm)\b/);
    if (!m) continue;
    const goal = macro.replace(m[0], `${Number(m[1]) + 1} ${m[2]}`);
    const r = writeBack(registry, cs, 'macro', goal);
    assert.ok(r, `${id}: written back`);
    assert.equal(blockText(generateCase(registry, r.caseState), 'macro'), r.text, `${id}: reads as written back`);
    if (!r.knockOn.length) assert.equal(r.text, goal, `${id}: reads as accepted`);
    tried++;
    if (r.changes.length && !r.patches.length) intoForm++;
  }
  assert.ok(tried >= 20, `examples tried: ${tried}`);
  assert.ok(intoForm / tried > 0.6, `into the form: ${intoForm} of ${tried}`);
});

const exampleCase = (registry, id, meta = {}) => {
  const ex = registry[id].schema.example;
  return { schemaId: id, options: {}, comment: ex.comment || '', caseTitle: ex.caseTitle || '', meta: { macro: '', blockKey: '', ...meta }, parts: JSON.parse(JSON.stringify(ex.parts)) };
};

test('a change the form ties to others is made with them, and they are named', async () => {
  const registry = await loadAll();
  const cs = exampleCase(registry, 'skin_excision');
  const dx = blockText(generateCase(registry, cs), 'diagnosis');
  assert.ok(dx.includes('closest margin 1.5 mm, superior)'), dx);
  const r = writeBack(registry, cs, 'diagnosis', dx.replace('closest margin 1.5 mm', 'closest margin 2.5 mm'));
  assert.deepEqual(r.changes.map((c) => [c.field, c.from, c.value]), [['marginSuperior', '1.5', '2.5']]);
  assert.deepEqual(r.knockOn, [{ old: '', text: ', inferior and deep' }], 'the inferior and deep margins are 2.5 mm too');
  assert.ok(r.text.includes('closest margin 2.5 mm, superior, inferior and deep)'), r.text);
  assert.deepEqual(r.patches, []);
});

test('boxes holding the same text change together where the template compares them', async () => {
  const registry = await loadAll();
  const cs = exampleCase(registry, 'gallbladder_carcinoma');
  const macro = blockText(generateCase(registry, cs), 'macro');
  const goal = macro.replace('specimen measuring 90 x 45 x 25 mm', 'specimen measuring 90 x 45 x 26 mm');
  assert.notEqual(goal, macro);
  const r = writeBack(registry, cs, 'macro', goal);
  assert.deepEqual(r.changes.map((c) => [c.field, c.value]), [['specimenDims', '90 x 45 x 26'], ['gallbladderDims', '90 x 45 x 26']]);
  assert.deepEqual(r.knockOn, []);
  assert.equal(r.text, goal, 'no sentence for the gallbladder alone');
});

test('a change in a pasted macroscopy goes into the pasted text', async () => {
  const registry = await loadAll();
  const pasted = 'Specimen received in formalin consists of an ellipse of skin measuring 30 x 12 x 6 mm. There is a nodule measuring 7 mm. All embedded in 4 blocks.';
  const cs = exampleCase(registry, 'skin_excision', { macro: pasted });
  const macro = blockText(generateCase(registry, cs), 'macro');
  assert.ok(macro.includes(pasted), macro);
  const r = writeBack(registry, cs, 'macro', macro.replace('nodule measuring 7 mm', 'nodule measuring 8 mm'));
  assert.deepEqual(r.changes.map((c) => [c.where, c.field]), [['meta', 'macro']]);
  assert.equal(r.caseState.meta.macro, pasted.replace('7 mm', '8 mm'));
  assert.deepEqual(r.patches, []);
});

test('a sentence a rewrite moves is kept as one patch, never put into a choice, and follows the form', async () => {
  const registry = await loadAll();
  const cs = exampleCase(registry, 'skin_excision');
  const macro = blockText(generateCase(registry, cs), 'macro');
  const was = "A suture marks 12 o'clock, taken as superior. The lesion is 2 mm from the closest skin edge. The deep surface is inked.";
  assert.ok(macro.includes(was), macro);
  const goal = macro.replace(was, "The lesion is 2 mm from the closest skin edge. The deep surface is inked, and a suture marks 12 o'clock, taken as superior.");
  const r = writeBack(registry, cs, 'macro', goal);
  assert.deepEqual(r.changes, [], 'the orientation is left as it is');
  assert.equal(r.patches.length, 1, 'one patch, made whole or not at all');
  assert.equal(r.text, goal);
  // A later change inside the moved text is carried into the patch.
  const work = r.caseState;
  const prev = generateCase(registry, work);
  work.parts[0].values.macroMargin = '3';
  const out = generateCase(registry, work);
  assert.equal(out.patched.macro.missed.length, 1, 'the patch no longer fits');
  assert.equal(carryPatches(work, prev, out), true);
  assert.ok(blockText(generateCase(registry, work), 'macro').includes("The lesion is 3 mm from the closest skin edge. The deep surface is inked, and a suture marks 12 o'clock, taken as superior."));
});

test('a patch takes a number whole, decimal part and all', () => {
  const t = 'closest margin 1.5 mm, superior';
  assert.deepEqual(patchFor(t, 'closest margin 2.5 mm, superior'), { find: '1.5', replace: '2.5' });
});
