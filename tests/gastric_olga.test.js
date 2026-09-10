import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, createCase, applyPreset, snippetsFor, isVisible } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { STAGE, olga, olgaText, compartmentOf, imQualifier, imStainText, flags } from '../generators/gastric.js';

const registry = await loadAll();
const { schema, generator } = registry.gastric_biopsy;

const part = (label, site, atrophy = 'Absent', imDegree = 'Absent', extra = {}) => ({
  label, values: { specimenName: '', biopsySite: site, siteType: 'Pyloric type', activity: 'Absent', chronic: 'Mild', follicles: 'Absent', atrophy, ulcer: 'Absent', imDegree, imType: '', imExtent: 'Unspecified', imStain: 'Not performed', dysplasia: 'Absent', hp: 'Absent', additionalNotes: '', ...extra }
});
const run = (parts, options = {}) => generate(schema, generator, { caseTitle: '', options, parts });

test('Rugge / Correa table has the 16 published cells', () => {
  assert.deepEqual(STAGE, [[0, 1, 2, 2], [1, 1, 2, 3], [2, 2, 3, 4], [3, 3, 4, 4]]);
});

test('compartments: antrum + incisura vs body + fundus; cardia and unspecified excluded', () => {
  assert.equal(compartmentOf({ biopsySite: 'Antrum, greater curvature' }), 'antrum');
  assert.equal(compartmentOf({ biopsySite: 'Incisura angularis' }), 'antrum');
  assert.equal(compartmentOf({ biopsySite: 'Body, lesser curvature' }), 'corpus');
  assert.equal(compartmentOf({ biopsySite: 'Fundus' }), 'corpus');
  assert.equal(compartmentOf({ biopsySite: 'Cardia' }), null);
  assert.equal(compartmentOf({ biopsySite: 'Unspecified' }), null);
  assert.equal(compartmentOf({}), null);
});

test('staging needs one antral and one corpus part; highest grade per compartment', () => {
  assert.equal(olga([part('A', 'Antrum, greater curvature', 'Moderate')]), null);
  assert.equal(olga([part('A', 'Antrum, greater curvature'), part('B', 'Cardia', 'Marked')]), null);
  const st = olga([
    part('A', 'Antrum, greater curvature', 'Mild', 'Mild'),
    part('B', 'Antrum, lesser curvature', 'Moderate', 'Absent'),
    part('C', 'Body, greater curvature', 'Absent', 'Marked')
  ]);
  assert.equal(st.antrum.atrophy, 2);
  assert.equal(st.corpus.atrophy, 0);
  assert.equal(st.olga, 2); // antrum 2, corpus 0 -> II
  assert.equal(st.olgim, 3); // antrum 1, corpus 3 -> III
  assert.equal(st.sites, 3);
  assert.equal(st.complete, false);
  assert.equal(olgaText(st), 'OLGA stage II; OLGIM stage III (incomplete mapping: 3 of 5 Sydney sites sampled).');
});

test('Sydney preset builds five mapped parts and a complete mapping prints without caveat', () => {
  const preset = schema.presets.find((p) => p.id === 'sydney5');
  const c = applyPreset(schema, preset);
  assert.equal(c.parts.length, 5);
  assert.deepEqual(c.parts.map((p) => p.label), ['A', 'B', 'C', 'D', 'E']);
  assert.equal(c.parts[2].values.biopsySite, 'Incisura angularis');
  assert.equal(c.parts[3].values.siteType, 'Body type');
  assert.match(c.caseTitle, /^\(A\) Antrum, greater curvature; .* and \(E\) Body, lesser curvature$/);
  c.parts[0].values.atrophy = 'Marked';
  c.parts[4].values.atrophy = 'Marked';
  c.parts[4].values.imDegree = 'Moderate';
  const out = generate(schema, generator, c);
  assert.match(out.diagnosis, /\n\nOLGA stage IV; OLGIM stage II\.$/); // antrum 0, corpus 2 -> II
  assert.match(out.diagnosis, /\(E\) STOMACH, body, lesser curvature, biopsy - CHRONIC GASTRITIS, inactive, Helicobacter-negative; moderate INTESTINAL METAPLASIA; marked ATROPHY/);
  assert.match(out.specimens, /^\(A\) Antrum, greater curvature; \(B\)/);
});

test('stage line is silent without mapped sites, with one compartment, or when the option is off', () => {
  const legacy = run([part('A', 'Unspecified', 'Marked', 'Marked', { specimenName: 'Antrum' }), part('B', 'Unspecified', 'Marked', 'Marked', { specimenName: 'Body' })]);
  assert.doesNotMatch(legacy.diagnosis, /OLGA/);
  const one = run([part('A', 'Antrum, greater curvature', 'Marked'), part('B', 'Antrum, lesser curvature', 'Marked')]);
  assert.doesNotMatch(one.diagnosis, /OLGA/);
  const off = run([part('A', 'Antrum, greater curvature', 'Marked'), part('B', 'Body, greater curvature', 'Marked')], { olga: false });
  assert.doesNotMatch(off.diagnosis, /OLGA/);
  const on = run([part('A', 'Antrum, greater curvature', 'Marked'), part('B', 'Body, greater curvature', 'Marked')]);
  assert.match(on.diagnosis, /OLGA stage IV; OLGIM stage 0 \(incomplete mapping: 2 of 5 Sydney sites sampled\)\.$/);
});

test('IM subtype and extent qualify the grade in microscopy and diagnosis; histochemistry adds a line', () => {
  const p = part('A', 'Unspecified', 'Absent', 'Moderate', { specimenName: 'Antrum', imType: 'Incomplete', imExtent: 'Multifocal', imStain: 'AB-PAS' });
  const out = run([p]);
  assert.match(out.microscopy, /- Intestinal metaplasia: Moderate \(incomplete, multifocal\)\n- Mucin histochemistry: AB-PAS shows acid mucin in goblet cells and in the intervening columnar cells, in keeping with incomplete \(type II\/III\) intestinal metaplasia\.\n- Dysplasia/);
  assert.match(out.diagnosis, /moderate INTESTINAL METAPLASIA \(incomplete, multifocal\)/);
  assert.equal(imQualifier({ imType: '', imExtent: 'Unspecified' }), '');
  assert.equal(imQualifier({ imType: 'Complete', imExtent: 'Unspecified' }), ' (complete)');
  assert.equal(imStainText({ imDegree: 'Mild', imStain: 'HID-AB', imType: 'Incomplete' }), 'HID-AB shows sulphomucin in the intervening columnar cells, in keeping with incomplete (type III) intestinal metaplasia.');
  assert.equal(imStainText({ imDegree: 'Absent', imStain: 'HID-AB', imType: '' }), '');
  const extent = schema.fields.find((f) => f.id === 'imExtent');
  assert.equal(isVisible(extent, { imDegree: 'Absent' }), false);
  assert.equal(isVisible(extent, { imDegree: 'Mild' }), true);
});

test('snippet flags: H. pylori, incomplete IM, high-stage surveillance', () => {
  const hpOnly = [part('A', 'Unspecified', 'Absent', 'Absent', { hp: 'High density' })];
  assert.deepEqual(flags(hpOnly), ['hpNoIm']);
  const hpIm = [part('A', 'Unspecified', 'Absent', 'Mild', { hp: 'Low density', imType: 'Incomplete' })];
  assert.deepEqual(flags(hpIm), ['hpWithIm', 'imIncompleteAlone']);
  const high = [part('A', 'Antrum, greater curvature', 'Marked', 'Marked', { imType: 'Incomplete' }), part('B', 'Body, greater curvature', 'Marked', 'Marked')];
  assert.deepEqual(flags(high), ['olgaHigh']);
  const extensive = [part('A', 'Unspecified', 'Absent', 'Marked', { imType: 'Incomplete', imExtent: 'Extensive' })];
  assert.deepEqual(flags(extensive), ['olgaHigh']);

  const cs = { schemaId: schema.id, caseTitle: '', options: {}, parts: high };
  const sn = snippetsFor({ [schema.id]: { schema, generator } }, cs);
  const surv = sn.find((x) => x.id === 'gastric_surveillance');
  assert.equal(surv.suggested, true);
  assert.equal(surv.active, true);
  assert.equal(sn.find((x) => x.id === 'gastric_im_incomplete').suggested, false);
  const out = generate(schema, generator, cs);
  assert.match(out.comment, /^Extensive \/ high-stage atrophic gastritis/);
  assert.match(out.diagnosis, /OLGA stage IV; OLGIM stage IV/);
});

test('legacy two-part case without mapping produces no comment or stage line', () => {
  const c = createCase(schema, 2);
  c.parts[0].values.specimenName = 'Antrum';
  c.parts[1].values.specimenName = 'Body';
  const out = generate(schema, generator, c);
  assert.equal(out.comment, '');
  assert.doesNotMatch(out.diagnosis, /OLGA/);
});
