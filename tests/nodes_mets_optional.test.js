// Lymph nodes and Distant metastasis are optional synoptic elements (Phase 67, user request 2026-10-11).
// Spec: docs/specs/nodes-and-metastasis-optional.md. With no regional node examined the Lymph nodes section
// and pN are left out; a negative distant metastasis ("Not applicable", "Not identified") is left out; the
// case footer option `printNodesMets` prints both placeholder sections again. A node examined, nodal disease
// (tumour deposits), a recorded metastasis or "Cannot be determined" always prints.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { parseSynoptic } from '../src/synoptic.js';
import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';

const registry = await loadAll();
const STAGED = ['appendix_carcinoma', 'skin_scc', 'breast_dcis', 'gastric_carcinoma', 'ampulla_carcinoma', 'hcc', 'pancreas_carcinoma',
  'lung_carcinoma', 'breast_carcinoma', 'colon_resection', 'ovary_ft_peritoneum', 'gist_resection', 'gallbladder_carcinoma',
  'oesophageal_carcinoma', 'phyllodes', 'endometrial_carcinoma', 'oral_carcinoma'];
// Skin SCC and oral carcinoma already print nothing for a blank node count or "Not applicable".
const BLANK_PRINTS_NOTHING = ['skin_scc', 'oral_carcinoma'];
const NODE_HEADINGS = ['Lymph nodes', 'Regional lymph nodes'];

function render(id, values = {}, options = {}) {
  const { schema, generator } = registry[id];
  const c = createCase(schema, 1);
  Object.assign(c.parts[0].values, values);
  Object.assign(c.options, { printPTNM: true }, options);
  return generate(schema, generator, c);
}
const sections = (out) => new Set(parseSynoptic(out.synoptic).map((r) => r.section));
const rows = (out) => Object.fromEntries(parseSynoptic(out.synoptic).filter((r) => r.label).map((r) => [r.label, r.value]));
const hasNodes = (out) => NODE_HEADINGS.some((h) => sections(out).has(h));

test('every staging template offers the footer option, off by default, on schema version 2026.10', () => {
  for (const id of STAGED) {
    const { schema } = registry[id];
    const opt = schema.options.find((o) => o.id === 'printNodesMets');
    assert.ok(opt, `${id} has the option`);
    assert.equal(opt.type, 'checkbox');
    assert.equal(opt.default, false);
    assert.equal(opt.label, 'Print the lymph node and distant metastasis sections when none are recorded');
    assert.equal(schema.version, '2026.10', id);
    assert.equal(createCase(schema, 1).options.printNodesMets, false, `${id} new case starts unticked`);
  }
});

test('a new case prints neither section and no pN; the option prints both placeholder sections', () => {
  for (const id of STAGED) {
    const off = render(id);
    assert.ok(!hasNodes(off), `${id}: no lymph node section by default`);
    assert.ok(!sections(off).has('Distant metastasis'), `${id}: no distant metastasis section by default`);
    assert.ok(!/\bp?y?pN/.test(off.synoptic + off.diagnosis), `${id}: no pN without nodes`);
    if (BLANK_PRINTS_NOTHING.includes(id)) continue;
    const on = render(id, {}, { printNodesMets: true });
    assert.ok(hasNodes(on), `${id}: option prints the lymph node section`);
    assert.ok(sections(on).has('Distant metastasis'), `${id}: option prints the distant metastasis section`);
    assert.ok(!/\bp?y?pN/.test(on.synoptic), `${id}: the option does not print pNX`);
  }
});

test('nodes examined bring back the section and pN; an unrecorded involved count still prints pNX', () => {
  const hcc = render('hcc', { nodesExamined: 3, nodesInvolved: 0 });
  assert.equal(rows(hcc)['Regional lymph nodes'], '3 examined; 0 involved');
  assert.match(rows(hcc).pTNM, / pN0$/);
  const colon = render('colon_resection', { nodesExamined: '14', nodesPositive: '0' });
  assert.equal(rows(colon)['Regional lymph nodes'], '14 examined; 0 involved');
  assert.match(colon.diagnosis, /pN0 \(AJCC 8th edition\), stage/);
  const uncounted = render('colon_resection', { nodesExamined: '12', nodesPositive: '' });
  assert.ok(hasNodes(uncounted));
  assert.match(rows(uncounted).pTNM, / pNX$/, 'nodes examined without an involved count: pNX is a real gap');
  const deposits = render('colon_resection', { tumourDeposits: 'Present' });
  assert.ok(hasNodes(deposits), 'tumour deposits without nodes print the section');
  assert.match(rows(deposits).pTNM, / pN1c$/);
});

test('a recorded metastasis or "Cannot be determined" prints without the option; negatives need it', () => {
  const liver = render('colon_resection', { distantMetastasis: ['Liver'] });
  assert.equal(rows(liver)['Distant metastasis'], 'Liver');
  assert.match(rows(liver).pTNM, / pM1a$/);
  const cbd = render('gastric_carcinoma', { distantMets: ['Cannot be determined'] });
  assert.equal(rows(cbd)['Distant metastasis'], 'Cannot be determined');
  const negative = render('gastric_carcinoma', { distantMets: ['Not identified'] });
  assert.ok(!sections(negative).has('Distant metastasis'));
  assert.equal(rows(render('gastric_carcinoma', { distantMets: ['Not identified'] }, { printNodesMets: true }))['Distant metastasis'], 'Not identified');
});

test('deriveTNM: pN left out with no nodes, NX kept for the stage group; typed overrides still print', () => {
  const base = { tumourSite: 'Stomach', tumourSize: '4', mitoticCount: '2', mitoticStatus: 'Counted', nodesExamined: '0', distantMetastasis: ['Not applicable'] };
  const st = deriveTNM(base, 'gist');
  assert.equal(st.tnm, 'pT2'); assert.equal(st.N, 'NX'); assert.equal(st.noNodes, true); assert.equal(st.stage, 'IA');
  assert.equal(deriveTNM({ ...base, nodesExamined: '3', nodesPositive: '0' }, 'gist').tnm, 'pT2 pN0');
  assert.equal(deriveTNM({ ...base, nodesExamined: '3' }, 'gist').tnm, 'pT2 pNX');
  assert.equal(deriveTNM({ ...base, distantMetastasis: ['Liver'] }, 'gist').tnm, 'pT2 pM1');
  const typed = deriveTNM({ ...base, tnmOverride: 'pT2 pNX', tnmOverrideReason: 'test' }, 'gist');
  assert.equal(typed.overridden, true); assert.equal(typed.tnm, 'pT2 pNX');
});

test('showNodes / showMets: the option, nodal input, M1 and printed values', () => {
  const none = { noNodes: true, derived: { M: 'M-' } };
  assert.equal(showNodes(none, { options: {} }), false);
  assert.equal(showNodes(none, { options: { printNodesMets: true } }), true);
  assert.equal(showNodes({ noNodes: false, derived: { M: 'M-' } }, {}), true);
  for (const value of ['', 'Not applicable', 'Not identified', 'not identified ']) assert.equal(showMets(none, {}, value), false, value);
  for (const value of ['Cannot be determined', 'Lung', 'Omentum']) assert.equal(showMets(none, {}, value), true, value);
  assert.equal(showMets({ noNodes: true, derived: { M: 'M1a' } }, {}, 'Not identified'), true);
  assert.equal(showMets(none, { options: { printNodesMets: true } }, 'Not applicable'), true);
});
