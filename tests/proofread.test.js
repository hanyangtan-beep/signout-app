// Proofreading before sign-out (src/proofread.js, docs/specs/proofreading.md, Phases 86 and 87): the
// rule checks, the guard on PPLX 27B's edits, reading its answer, the question, the record kept with
// the case, flagged changes and whole-section rewrites. Every report text here is made up.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SECTIONS, MAX_EDITS, MAX_PROMPT_CHARS, MAX_TOKENS, MAX_REWRITES, REWRITE_SECTIONS, HOUSE_STYLE, SYSTEM_PROMPT, reportSections, fingerprint, occurrences,
  applyEdit, quoteFound, safeEdit, buildPrompt, parseReply, vetReply, editBetween, ruleChecks, sectionHashes, changedSince, newRecord, openItems,
  recordSummary, itemKey, layoutOf, formTerms, factTokens, describeFacts, factChange, rewriteChanges, checkTicked, tickedText
} from '../src/proofread.js';
import { loadAll } from '../src/registry.js';
import { generate } from '../src/engine.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const sec = (key, text) => ({ ...SECTIONS.find((s) => s.key === key), text });
const rulesFor = (key, text) => ruleChecks([sec(key, text)]);
const one = (items, why) => items.filter((i) => i.why.includes(why));

test('the sections read are the printed blocks in report order, without the block key', () => {
  const out = { comment: 'See note.', diagnosis: 'SKIN, left arm, excision:\n- SEBORRHOEIC KERATOSIS.\n\n', blockKey: 'A1 lesion', macro: '  ', specimens: '(A) Skin, left arm' };
  const s = reportSections(out);
  assert.deepEqual(s.map((x) => x.key), ['specimens', 'diagnosis', 'comment']);
  assert.equal(s[1].text, 'SKIN, left arm, excision:\n- SEBORRHOEIC KERATOSIS.', 'trailing space trimmed only');
  assert.deepEqual(s.map((x) => x.tag), ['SPECIMEN', 'DX', 'COMMENT']);
});

test('fingerprints are eight hex digits and follow the text', () => {
  assert.match(fingerprint('Sections show skin.'), /^[0-9a-f]{8}$/);
  assert.equal(fingerprint('a'), fingerprint('a'));
  assert.notEqual(fingerprint('a'), fingerprint('b'));
});

test('an edit applies only where its text occurs once, or to a whole word everywhere', () => {
  assert.equal(applyEdit('The tumuor is small.', { find: 'tumuor', replace: 'tumour' }), 'The tumour is small.');
  assert.equal(applyEdit('The tumuor is small.', { find: 'absent', replace: 'x' }), null);
  assert.equal(applyEdit('a b a', { find: 'a', replace: 'c' }), null, 'twice and not whole-word: refused');
  assert.equal(applyEdit('tumor, tumors and tumor.', { find: 'tumor', replace: 'tumour', all: true }), 'tumour, tumors and tumour.');
  assert.equal(occurrences('color colorectal color', 'color', true), 2);
  assert.ok(quoteFound('Margins   are CLEAR.', 'margins are clear.'));
});

test('the guard lets spelling, grammar and the house phrases through', () => {
  for (const [a, b] of [
    ['tumuor', 'tumour'], ['Sections shows', 'Sections show'], ['hemorrhage', 'haemorrhage'],
    ['No malignancy is seen', 'There is no evidence of malignancy'], ['ADENOMA WITH LOW GRADE DYSPLASIA', 'ADENOMA with LOW GRADE DYSPLASIA'],
    ['The the specimen', 'The specimen'], ['recieved in formalin', 'received in formalin']
  ]) assert.equal(safeEdit(a, b).safe, true, `${a} -> ${b}`);
});

test('the guard turns a change of meaning into a check', () => {
  for (const [a, b, reason] of [
    ['measures 12 mm', 'measures 15 mm', 'protected'], ['12 mm', '12 cm', 'protected'], ['left breast', 'right breast', 'protected'],
    ['no lymphovascular invasion', 'lymphovascular invasion', 'protected'], ['grade 2', 'grade 3', 'protected'], ['pT1b', 'pT1c', 'protected'],
    ['benign', 'malignant', 'protected'], ['ER positive (90%)', 'ER positive (80%)', 'protected'], ['margins are clear', 'margins are close', 'protected'],
    ['tubular adenoma', 'tubulovillous adenoma', 'wording'], ['carcinoma', 'adenoma', 'wording'], ['within 1 mm of', 'at 1 mm from', 'wording']
  ]) assert.deepEqual(safeEdit(a, b), { safe: false, reason }, `${a} -> ${b}`);
});

test('rule: British spelling, each word once for all its occurrences', () => {
  const items = rulesFor('microscopy', 'Sections show tumor cells. The tumor shows hemorrhage and edema.');
  assert.deepEqual(items.map((i) => [i.find, i.replace, i.all]), [['tumor', 'tumour', true], ['hemorrhage', 'haemorrhage', true], ['edema', 'oedema', true]]);
  assert.ok(items.every((i) => i.source === 'rule' && i.kind === 'spelling' && i.section === 'microscopy'));
});

test('rule: plain text for the LIS', () => {
  const [item] = rulesFor('macro', 'Specimen received in formalin measuring 5 × 4 mm.');
  assert.equal(item.why, 'Plain text for the LIS');
  assert.equal(applyEdit('Specimen received in formalin measuring 5 × 4 mm.', item), 'Specimen received in formalin measuring 5 x 4 mm.');
});

test('rule: a word typed twice, and "Sections shows" in the microscopy', () => {
  assert.deepEqual(rulesFor('macro', 'The the specimen is grey.').map((i) => [i.kind, i.find, i.replace]), [['typing', 'The the', 'The']]);
  assert.deepEqual(rulesFor('microscopy', 'Sections shows skin.').map((i) => [i.kind, i.find, i.replace]), [['grammar', 'Sections shows', 'Sections show']]);
  assert.equal(rulesFor('comment', 'Sections shows skin.').length, 0, 'house phrases are a microscopy rule');
  assert.equal(rulesFor('microscopy', 'No malignancy is identified.').length, 0, 'negatives are left to the model');
});

test('rule: a placeholder, Markdown or an unclosed bracket is a check', () => {
  for (const [text, why] of [
    ['Tumour size ___ mm.', 'blank'], ['Tumour size XX mm.', 'XX'], ['Margin TBC.', 'TBC'], ['Grade ?? on review.', 'Question marks'],
    ['Lymph nodes [ ].', 'Empty brackets'], ['Tumour size <size> mm.', 'template placeholder'], ['**Invasive carcinoma**', 'Markdown'], ['Grade 2 (of 3.', 'bracket']
  ]) {
    const items = one(rulesFor('microscopy', text), why);
    assert.equal(items.length, 1, text);
    assert.equal(items[0].kind, 'check');
    assert.ok(quoteFound(text, items[0].quote));
  }
});

test('rule: the house connectors on a typed diagnosis, one edit per run', () => {
  const dx = 'COLON, sigmoid, polypectomy:\n- TUBULAR ADENOMA WITH LOW GRADE DYSPLASIA, CONSISTENT WITH a sporadic adenoma.';
  const items = ruleChecks([sec('diagnosis', dx)]);
  assert.deepEqual(items.map((i) => [i.find, i.replace]), [['WITH LOW', 'with LOW'], ['CONSISTENT WITH', 'consistent with']]);
  let text = dx;
  for (const i of items) text = applyEdit(text, i);
  assert.equal(text, 'COLON, sigmoid, polypectomy:\n- TUBULAR ADENOMA with LOW GRADE DYSPLASIA, consistent with a sporadic adenoma.');
});

test('rule: the specimen on one side and the diagnosis on the other', () => {
  const items = ruleChecks([sec('specimens', '(A) Breast, right, wide local excision'), sec('diagnosis', 'BREAST, left, wide local excision:\n- FIBROADENOMA.')]);
  assert.deepEqual(items.map((i) => [i.kind, i.section, i.why]), [['check', 'diagnosis', 'The specimen says right, the diagnosis left']]);
  assert.equal(ruleChecks([sec('specimens', '(A) Breast, left'), sec('diagnosis', 'BREAST, left:\n- FIBROADENOMA.')]).length, 0);
});

test('editBetween gives the shortest unique span of whole words', () => {
  assert.deepEqual(editBetween('a cat and a cat sat', 'a cat and a dog sat'), { find: 'cat sat', replace: 'dog sat' });
  assert.equal(editBetween('same', 'same'), null);
});

// The generated reports are already in the house style, so the rules must find nothing in them.
test('the rule checks find nothing in any template example', async () => {
  const registry = await loadAll();
  const defaults = (s) => Object.fromEntries((s.fields || []).filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));
  let n = 0;
  const hits = [];
  for (const [id, { schema, generator }] of Object.entries(registry)) {
    const ex = schema.example;
    if (!ex?.parts?.length) continue;
    const cs = { schemaId: id, caseTitle: '', options: { ...(ex.options || {}) }, meta: ex.meta || {}, parts: ex.parts.map((p, i) => ({ label: p.label || String.fromCharCode(65 + i), values: { ...defaults(schema), ...p.values } })) };
    const out = generate(schema, generator, cs);
    n++;
    for (const i of ruleChecks(reportSections(out))) hits.push(`${id}/${i.section}: ${i.why}: ${i.find || i.quote}`);
  }
  assert.ok(n >= 80, `examples read: ${n}`);
  assert.deepEqual(hits, []);
});

test('the rule checks find nothing in the golden fixture reports', () => {
  const files = [];
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.json')) files.push(p); } };
  walk(path.join(here, 'fixtures'));
  const reports = [];
  const grab = (o) => { if (!o || typeof o !== 'object') return; if (typeof o.report === 'string') reports.push(o.report); for (const v of Object.values(o)) if (v && typeof v === 'object') grab(v); };
  for (const f of files) { try { grab(JSON.parse(fs.readFileSync(f, 'utf8'))); } catch { /* not a fixture */ } }
  assert.ok(reports.length >= 200, `reports read: ${reports.length}`);
  const hits = reports.flatMap((r) => ruleChecks([sec('microscopy', r)]).map((i) => `${i.why}: ${i.find || i.quote}`));
  assert.deepEqual(hits, []);
});

test('the question: task line, history as context, tagged sections, a size limit', () => {
  const sections = [sec('macro', 'Specimen received in formalin.'), sec('diagnosis', 'SKIN, excision:\n- NAEVUS.')];
  const q = buildPrompt(sections, 'Pigmented lesion.');
  assert.equal(q.prompt.split('\n')[0], 'TASK: proofread');
  assert.ok(q.prompt.includes('[HISTORY]\nPigmented lesion.\n\n[MACRO]\nSpecimen received in formalin.\n\n[DX]\nSKIN, excision:\n- NAEVUS.'));
  assert.equal(q.maxTokens, MAX_TOKENS);
  assert.equal(MAX_TOKENS, 2000, 'room for two rewrites; Han Slide allows up to 2000');
  assert.equal(q.system, SYSTEM_PROMPT);
  assert.ok(SYSTEM_PROMPT.includes('"rewrites":[{"section":"MICRO","text":"...","why":"..."}]'), 'the reply shape names the rewrites');
  assert.ok(SYSTEM_PROMPT.includes(`At most ${MAX_REWRITES} rewrites`));
  assert.ok(SYSTEM_PROMPT.includes('Change the sentence structure and flow, not just one word for a similar word.'));
  assert.ok(SYSTEM_PROMPT.length < 12000, "within Han Slide's limit for the system text");
  for (const rule of HOUSE_STYLE) assert.ok(SYSTEM_PROMPT.includes(rule));
  assert.ok(!buildPrompt(sections).prompt.includes('\n[HISTORY]\n'));
  const long = buildPrompt([sec('microscopy', 'x'.repeat(MAX_PROMPT_CHARS))]);
  assert.match(long.error, /too long/);
  assert.equal(long.prompt, undefined);
});

test('reading the answer: fenced, with a thinking block, cut off, untidy or unreadable', () => {
  const body = '{"edits":[{"section":"MICRO","find":"tumuor","replace":"tumour","kind":"spelling","why":"typing"}],"flags":[]}';
  assert.deepEqual(parseReply('```json\n' + body + '\n```'), { edits: [{ section: 'MICRO', find: 'tumuor', replace: 'tumour', kind: 'spelling', why: 'typing' }], flags: [], rewrites: [], whole: true, readable: true });
  assert.equal(parseReply('<think>{"edits":"no"}</think>' + body).whole, true);
  const cut = parseReply('{"edits":[{"section":"MICRO","find":"tumuor","replace":"tumour"},{"section":"DX","find":"Sec');
  assert.equal(cut.whole, false);
  assert.equal(cut.readable, true);
  assert.equal(cut.edits.length, 1);
  const untidy = parseReply('Here you are: {"edits":[{"find":"a","replace":"b",}], "flags":[{"quote":"q","why":"w"}]}');
  assert.equal(untidy.edits.length, 1);
  assert.equal(untidy.flags.length, 1);
  assert.equal(parseReply('I cannot help with that.').readable, false);
  assert.equal(parseReply('{"answer": 1}').readable, false);
  assert.equal(parseReply('{"edits":[],"flags":[]}').readable, true);
  assert.equal(parseReply('{"edits":[],"flags":[],"rewrites":[]}').readable, true);
  const rewritten = parseReply('{"edits":[],"flags":[],"rewrites":[{"section":"MICRO","text":"Sections show skin.","why":"flow"}]}');
  assert.deepEqual(rewritten.rewrites, [{ section: 'MICRO', text: 'Sections show skin.', why: 'flow' }]);
  const cutRewrite = parseReply('{"edits":[],"flags":[],"rewrites":[{"section":"MICRO","text":"Sections show skin.","why":"flow"},{"section":"COMMENT","text":"Cut');
  assert.equal(cutRewrite.whole, false);
  assert.deepEqual(cutRewrite.rewrites.map((r) => r.section), ['MICRO'], 'the whole rewrite kept, the cut one left out');
});

test('vetting the answer against the report', () => {
  const sections = [
    sec('macro', 'Specimen received in formalin. A tumor measuring 12 mm.'),
    sec('microscopy', 'Sections shows a tumuor.\nGrade 2.'),
    sec('diagnosis', 'BREAST, left, excision:\n- INVASIVE CARCINOMA, GRADE 2.')
  ];
  const { items, dropped } = vetReply({
    edits: [
      { section: 'MICRO', find: 'tumuor', replace: 'tumour', kind: 'Spelling', why: 'typing error' },
      { section: 'DX', find: 'tumor', replace: 'tumour', kind: 'spelling', why: 'British' }, // in the macro, moved there
      { section: 'MICRO', find: 'Grade 2', replace: 'Grade 3', kind: 'grammar', why: 'disagrees' }, // guarded: a check
      { section: 'MICRO', find: 'absent text', replace: 'x' }, // not there
      { section: 'MICRO', find: 'Sections shows a tumuor.\nGrade', replace: 'x' }, // over two lines
      { section: 'MICRO', find: 'same', replace: 'same' },
      { section: 'NOPE', find: 'nothing', replace: 'x' }
    ],
    flags: [{ section: 'DX', quote: 'invasive carcinoma, grade 2', why: 'The macro has no tumour size here' }, { section: 'DX', quote: 'not in the report', why: 'x' }, { section: 'DX', quote: 'GRADE 2' }]
  }, sections);
  assert.deepEqual(items.map((i) => [i.kind, i.section, i.find || i.quote]), [
    ['spelling', 'microscopy', 'tumuor'], ['spelling', 'macro', 'tumor'], ['check', 'microscopy', 'Grade 2'], ['check', 'diagnosis', 'invasive carcinoma, grade 2']
  ]);
  assert.equal(items[2].suggestion, 'Grade 3');
  assert.equal(items[2].guarded, 'protected');
  assert.ok(items.every((i) => i.source === 'model' && i.key === itemKey(i)));
  assert.deepEqual(dropped, { section: 1, notFound: 1, notUnique: 0, size: 1, same: 1, extra: 0, quote: 2, rewrite: 0, layout: 0 });
});

test('a flag with the corrected text: offered to accept by hand where its quote is there once', () => {
  const sections = [sec('macro', 'A tumour measuring 12 mm.'), sec('diagnosis', 'BREAST, left, excision:\n- INVASIVE CARCINOMA, 15 mm.')];
  const { items } = vetReply({ flags: [
    { section: 'DX', quote: '15 mm', replace: '12 mm', why: 'The macroscopy gives 12 mm' },
    { section: 'DX', quote: 'invasive carcinoma, 15', replace: 'INVASIVE CARCINOMA, 12', why: 'Not the text as printed' },
    { section: 'DX', quote: 'BREAST', replace: 'BREAST', why: 'No change' }
  ] }, sections);
  assert.deepEqual(items.map((i) => [i.kind, i.quote, i.suggestion, i.guarded]), [
    ['check', '15 mm', '12 mm', 'flag'], ['check', 'invasive carcinoma, 15', undefined, undefined], ['check', 'BREAST', undefined, undefined]
  ]);
  assert.equal(applyEdit(sections[1].text, { find: items[0].quote, replace: items[0].suggestion }), 'BREAST, left, excision:\n- INVASIVE CARCINOMA, 12 mm.');
  // An edit the guard turns back keeps its change, for every place a whole word is.
  const side = vetReply({ edits: [{ section: 'MICRO', find: 'left', replace: 'right', kind: 'spelling' }] }, [sec('microscopy', 'The left lobe; left margin.')]);
  assert.deepEqual(side.items.map((i) => [i.kind, i.quote, i.suggestion, i.guarded, i.all]), [['check', 'left', 'right', 'protected', true]]);
});

test('rewrites: prose sections only, one each, the size and the layout kept', () => {
  const micro = 'Sections show breast tissue with an invasive carcinoma. The tumour is grade 2. There is no evidence of lymphovascular invasion.';
  const rewrite = 'Sections show an invasive carcinoma of grade 2 in breast tissue. There is no evidence of lymphovascular invasion.';
  const sections = [sec('macro', '(A) Skin, 10 x 5 mm.\n(B) Skin, 8 mm.'), sec('microscopy', micro), sec('diagnosis', 'BREAST, left, excision:\n- INVASIVE CARCINOMA, GRADE 2.')];
  const { items, dropped } = vetReply({ rewrites: [
    { section: 'MICRO', text: micro, why: 'unchanged' },
    { section: 'MICRO', text: 'Carcinoma.', why: 'too short' },
    { section: 'MICRO', text: rewrite + '\n\n', why: 'Reads in one flow' },
    { section: 'MICRO', text: rewrite + ' Again.', why: 'a second for the same section' },
    { section: 'DX', text: 'BREAST, left, excision:\n- GRADE 2 INVASIVE CARCINOMA.', why: 'not prose' },
    { section: 'MACRO', text: '(A) Skin measuring 10 x 5 mm. (B) Skin, 8 mm.', why: 'joins the parts' },
    { section: 'COMMENT', text: 'No comment in this report.', why: 'no such section' }
  ] }, sections);
  assert.deepEqual(items, [{ kind: 'rewrite', section: 'microscopy', text: rewrite, base: fingerprint(micro), why: 'Reads in one flow', source: 'model', key: items[0].key }]);
  assert.equal(items[0].key, itemKey(items[0]));
  assert.deepEqual(dropped, { section: 0, notFound: 0, notUnique: 0, size: 1, same: 1, extra: 0, quote: 0, rewrite: 3, layout: 1 });
  assert.deepEqual(REWRITE_SECTIONS, ['macro', 'intraop', 'microscopy', 'comment']);
  assert.deepEqual(layoutOf('(A) Skin:\n- Margin: clear\n  - Distance: 2 mm\nCOMMENT:'), ['(A)', '- margin:', '- distance:', 'COMMENT:']);
});

test('a rewrite as tracked changes: a change of fact flagged, a fact moved within it not', () => {
  const base = 'Sections show a tumour measuring 12 mm. It is grade 2.';
  const text = 'Sections show a grade 2 tumour measuring 15 mm.';
  const changes = rewriteChanges(base, text);
  assert.deepEqual(changes.map((c) => [c.old, c.text, c.flagged, c.facts]), [['', 'grade 2 ', false, ''], ['12 mm. It is grade 2', '15 mm', true, 'changes 12 to 15']]);
  // Ticking one half of a moved fact would lose it, or print it twice.
  assert.equal(checkTicked(base, text, changes, [true, false]), 'Tick both changes that move 2, grade, or neither');
  assert.equal(checkTicked(base, text, changes, [false, true]), 'Tick both changes that move 2, grade, or neither');
  assert.equal(checkTicked(base, text, changes, [true, true]), null);
  assert.equal(tickedText(base, changes, [true, true]), text);
  assert.equal(tickedText(base, changes, [false, false]), base);
  assert.equal(rewriteChanges('Sections show a tumour. There is no necrosis.', 'Sections show a tumour, without necrosis.')[0].facts, 'changes no to without');
  assert.equal(describeFacts([], ['focal']), 'adds focal');
  assert.equal(factChange('INVASIVE CARCINOMA, 15 mm', 'INVASIVE CARCINOMA, 12 mm'), 'changes 15 to 12');
  assert.equal(factChange('tumuor', 'tumour'), '');
  assert.equal(describeFacts(['not', 'not'], []), 'takes out not');
});

test("the case form's options are facts too", () => {
  const terms = formTerms([{ fields: [{ options: ['Mild', 'Moderate', 'Not applicable'], optionLabels: { Mild: 'Mild inflammation' } }], caseFields: [{ options: ['Tumor'] }] }]);
  for (const t of ['mild', 'inflammation', 'moderate', 'tumour']) assert.ok(terms.has(t), t);
  assert.ok(!terms.has('applicable'));
  assert.deepEqual(factTokens('Mild chronic inflammation, 2 mm.', terms), ['2', 'inflammation', 'mild', 'mm']);
  const changes = rewriteChanges('There is mild inflammation.', 'There is moderate inflammation.', terms);
  assert.deepEqual(changes.map((c) => [c.flagged, c.facts]), [[true, 'changes mild to moderate']]);
  assert.equal(rewriteChanges('There is mild inflammation.', 'There is moderate inflammation.')[0].flagged, false, 'without the form, an ordinary word');
});

test('vetting caps the edits and refuses an ambiguous phrase', () => {
  const letters = 'abcdefghijklmnopqrst';
  const sections = [sec('microscopy', 'one two. one two. ' + [...letters].map((c) => `lesoin${c}`).join(' '))];
  const edits = [...letters].map((c) => ({ section: 'MICRO', find: `lesoin${c}`, replace: `lesion${c}`, kind: 'spelling' }));
  const { items, dropped } = vetReply({ edits: [{ section: 'MICRO', find: 'one two', replace: 'one too' }, ...edits] }, sections);
  assert.equal(items.length, MAX_EDITS);
  assert.equal(dropped.extra, 20 - MAX_EDITS);
  assert.equal(dropped.notUnique, 1);
});

test('the record: fingerprints, sections changed since and dismissals kept', () => {
  const sections = [sec('microscopy', 'Sections show a tumuor.'), sec('diagnosis', 'SKIN, excision:\n- NAEVUS.')];
  const { items, dropped } = vetReply({ edits: [{ section: 'MICRO', find: 'tumuor', replace: 'tumour', kind: 'spelling', why: 'typing' }], flags: [{ section: 'DX', quote: 'NAEVUS', why: 'Check the type' }] }, sections);
  const record = newRecord({ items, dropped, sections, by: 'PPLX 27B via Han Slide 1.13.0', seconds: 41.26, at: '2026-11-19T02:00:00.000Z' });
  assert.equal(record.v, 2);
  assert.equal(record.seconds, 41.3);
  assert.deepEqual(record.hashes, sectionHashes(sections));
  assert.deepEqual(record.items.map((i) => [i.id, i.status]), [['m1', 'open'], ['m2', 'open']]);
  assert.ok(!JSON.stringify(record.hashes).includes('tumuor'), 'fingerprints, not text');
  assert.deepEqual(changedSince(record, sections), []);
  const now = new Date('2026-11-19T03:00:00.000Z');
  assert.match(recordSummary(record, sections, now), /^Proofread at \d\d:\d\d by PPLX 27B via Han Slide 1\.13\.0; unchanged since\.$/);
  const edited = [sections[0], sec('diagnosis', 'SKIN, excision:\n- COMPOUND NAEVUS.')];
  assert.deepEqual(changedSince(record, edited), ['diagnosis']);
  assert.match(recordSummary(record, edited, now), /changed since: Diagnosis\.$/);
  assert.deepEqual(openItems(record, [], sections).map((i) => i.id), ['m1', 'm2']);
  record.items[1].status = 'dismissed';
  record.items[0].status = 'accepted';
  assert.deepEqual(openItems(record, [], sections), []);
  assert.match(recordSummary(record, sections, now), /\(1 accepted, 1 dismissed\)/);
  const again = newRecord({ items, dropped, sections, by: 'PPLX 27B', seconds: 30, previous: record });
  assert.deepEqual(again.items.map((i) => i.status), ['open', 'dismissed'], 'a dismissed suggestion stays dismissed');
});

test('open items: rule checks with the record, dismissed and stale ones left out', () => {
  const sections = [sec('microscopy', 'Sections shows a tumor.')];
  const rules = ruleChecks(sections);
  assert.equal(rules.length, 2);
  const record = { v: 1, at: '2026-11-19T02:00:00.000Z', hashes: sectionHashes(sections), dismissed: [rules[0].key], items: [
    { kind: 'grammar', section: 'microscopy', find: 'Sections shows', replace: 'Sections show', source: 'model', key: 'k1', id: 'm1', status: 'open' },
    { kind: 'spelling', section: 'microscopy', find: 'gone', replace: 'went', source: 'model', key: 'k2', id: 'm2', status: 'open' }
  ] };
  // The rule's "tumor" is dismissed, its "Sections shows" is the model's too and shown once, and
  // the model's "gone" is no longer in the text.
  assert.deepEqual(openItems(record, rules, sections).map((i) => `${i.source}:${i.find}`), ['model:Sections shows']);
});

test('open items: a rewrite only while its section reads as it was proofread', () => {
  const sections = [sec('microscopy', 'Sections shows a tumour.')];
  const rewrite = { kind: 'rewrite', section: 'microscopy', text: 'Sections show a tumour.', base: fingerprint('Sections shows a tumour.'), source: 'model', key: 'k3', id: 'm1', status: 'open' };
  const record = { v: 2, at: '2026-11-19T02:00:00.000Z', hashes: sectionHashes(sections), dismissed: [], items: [rewrite] };
  assert.deepEqual(openItems(record, [], sections).map((i) => i.id), ['m1']);
  assert.deepEqual(openItems(record, [], [sec('microscopy', 'Sections show a tumour.')]), [], 'the section has changed');
  delete rewrite.text;
  assert.deepEqual(openItems(record, [], sections), [], 'its text is no longer kept');
});
