// Phase 46: the suggestions box (docs/specs/suggestions-and-roadmap.md). The pre-fill URL, the
// choice summary and the patient-detail check are the parts that could go wrong without anyone
// noticing, so each is pinned here; the dialog itself is covered by tools/qa-browser.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FORM, SYSTEM_WIDE, TYPES, WHERE, LIMITS, suggestionWarnings, choiceSummary, prefillUrl, appDetails, buildDate } from '../src/suggest.js';
import { defaultValues } from '../src/engine.js';
import { schemaSync } from './_schema.js';

const answer = (url, key) => new URL(url).searchParams.get(`entry.${FORM.entries[key]}`);

test('the pre-fill URL carries all seven answers on the published form', () => {
  const url = prefillUrl({
    template: 'Nasal polyps (nasal_polyps)', type: TYPES[0], where: ['Diagnosis', 'Microscopy'],
    suggestion: 'The line should read "A & B" + C.', choices: 'Lesion [lesion]: Antrochoanal polyp',
    by: 'someone@example.com', app: 'Build 2026-09-29 (abc) · nasal_polyps v2026.09 · desktop'
  });
  const u = new URL(url);
  assert.equal(u.origin + u.pathname, FORM.url);
  assert.equal(u.searchParams.get('usp'), 'pp_url');
  assert.equal(answer(url, 'template'), 'Nasal polyps (nasal_polyps)');
  assert.equal(answer(url, 'type'), 'Error in the output');
  assert.equal(answer(url, 'where'), 'Diagnosis, Microscopy');
  assert.equal(answer(url, 'suggestion'), 'The line should read "A & B" + C.');
  assert.equal(answer(url, 'choices'), 'Lesion [lesion]: Antrochoanal polyp');
  assert.equal(answer(url, 'by'), 'someone@example.com');
  assert.equal(answer(url, 'app'), 'Build 2026-09-29 (abc) · nasal_polyps v2026.09 · desktop');
  assert.ok(!u.search.includes('+'), 'spaces are %20 and a literal plus is %2B, so no "+" is left to misread');
});

test('the form has seven distinct entries and the dialog lists match the spec', () => {
  assert.equal(new Set(Object.values(FORM.entries)).size, 7);
  assert.match(FORM.url, /^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+\/viewform$/);
  assert.equal(SYSTEM_WIDE, 'The whole app (system-wide)');
  assert.deepEqual(TYPES, ['Error in the output', 'Wording change', 'Missing option or field', 'New template', 'Other']);
  assert.deepEqual(WHERE, ['Form fields', 'Macroscopy', 'Microscopy', 'Diagnosis', 'Comment', 'Intake', 'Layout or navigation']);
});

test('blank answers are left out and long answers are cut to their limit', () => {
  const url = prefillUrl({ template: SYSTEM_WIDE, type: 'Other', where: [], suggestion: 'x'.repeat(LIMITS.suggestion + 50), choices: '', by: '  ' });
  assert.equal(answer(url, 'where'), null);
  assert.equal(answer(url, 'choices'), null);
  assert.equal(answer(url, 'by'), null);
  assert.equal(answer(url, 'suggestion').length, LIMITS.suggestion);
});

test('patient-detail shapes are blocked', () => {
  for (const t of ['Patient A123456(7) had a polyp', 'see S25-01234 for the wording', 'HN12345678 printed twice',
    'Mrs Chan asked', 'DOB is on the form', 'ring 9123 4567', 'reference 12345678901', 'hs26-012345 again']) {
    assert.ok(suggestionWarnings(t).length > 0, t);
  }
});

test('ordinary suggestion wording passes', () => {
  for (const t of ['The inverted papilloma line should say INVERTED TYPE.', 'Add a Ki-67 30% option', 'pT3 N1 uses UICC 9th',
    'CD34 and ERG are negative in the example', 'template v2026.09 prints the comment twice', 'Dr Wong prefers "In keeping with"',
    'Block key A1-A3 should read A1 to A3']) {
    assert.deepEqual(suggestionWarnings(t), [], t);
  }
});

test('an untouched part attaches nothing', () => {
  const s = schemaSync('nasal_polyps');
  assert.equal(choiceSummary(s, defaultValues(s, 0), 0), '');
});

test('changed choice fields are attached; text, numbers and off-list values never are', () => {
  const s = schemaSync('nasal_polyps');
  const v = {
    ...defaultValues(s, 0),
    lesion: 'Antrochoanal polyp',
    allergicMucin: true,
    specimenName: 'Mrs Chan left nasal polyp',
    additionalNotes: 'S25-01234 free text',
    blocks: '7',
    fungus: 'Typed by hand, not an option'
  };
  const out = choiceSummary(s, v, 0);
  assert.match(out, /\[lesion\]: Antrochoanal polyp/);
  assert.match(out, /\[allergicMucin\]: yes/);
  for (const bad of ['Mrs Chan', 'S25-01234', '[blocks]', '[specimenName]', '[additionalNotes]', 'Typed by hand', '[fungus]']) {
    assert.ok(!out.includes(bad), bad);
  }
});

test('a hidden field is not attached until it shows', () => {
  const s = schemaSync('nasal_polyps');
  const hidden = { ...defaultValues(s, 0), dysplasia: 'High grade' };
  assert.ok(!choiceSummary(s, hidden, 0).includes('[dysplasia]'));
  const shown = { ...hidden, lesion: 'Sinonasal papilloma, inverted' };
  assert.match(choiceSummary(s, shown, 0), /\[dysplasia\]: High grade/);
});

test('multi-choice fields list only their own options', () => {
  const s = schemaSync('oral_biopsy');
  const v = { ...defaultValues(s, 0), features: ['Parakeratosis', 'Hyperkeratosis', 'Mr Lee'] };
  const line = choiceSummary(s, v, 0).split('\n').find((l) => l.includes('[features]'));
  assert.equal(line, 'Additional findings [features]: Parakeratosis, Hyperkeratosis');
});

test('app details name the build date, template and layout', () => {
  const build = Date.UTC(2026, 8, 29, 12).toString(36);
  assert.equal(buildDate(build), '2026-09-29');
  assert.equal(buildDate(''), '');
  assert.equal(appDetails({ build, templateId: 'nasal_polyps', version: '2026.09', layout: 'phone' }), `Build 2026-09-29 (${build}) · nasal_polyps v2026.09 · phone`);
  assert.equal(appDetails({ layout: 'desktop' }), 'Build: source checkout · desktop');
});
