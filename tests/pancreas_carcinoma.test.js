// Pancreatic carcinoma, pancreaticoduodenectomy (synoptic, AJCC 8th) - generator, staging
// boundaries, checks, the frozen margin link and golden fixtures.
// Fixtures: tests/fixtures/whipple/pancreas-*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, generateCase, relabel } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { prefillFromFrozen } from '../generators/pancreas_carcinoma.js';
import { parseSynoptic } from '../src/synoptic.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'whipple');
const UPDATE = process.argv.includes('--update');
const registry = await loadAll();
const { schema, generator } = registry.pancreas_carcinoma;
const EX = schema.example.parts[0].values;
const defaults = (s) => Object.fromEntries(s.fields.filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));

function run(patch = {}, options = {}) {
  const values = { ...defaults(schema), ...EX, ...patch };
  const cs = { schemaId: 'pancreas_carcinoma', caseTitle: '', options: { ...schema.example.options, ...options }, parts: [{ label: 'A', templateId: 'pancreas_carcinoma', values }] };
  return generate(schema, generator, cs);
}
const rows = (out) => Object.fromEntries(parseSynoptic(out.synoptic).filter((r) => r.label).map((r) => [r.label, r.value]));
const flatDx = (out) => out.diagnosis.replace(/\s+/g, ' ');
const msgs = (out, level) => out.issues.filter((i) => i.level === level).map((i) => i.message);
const tnm = (out) => rows(out)['pTNM'];

// No nodes recorded unless a case says otherwise.
const NO_NODES = { nodesExamined: 16, nodesInvolved: 0, station8: '', station12: '', station13: '', station14: '', station17: '', ene: 'Not applicable', largestDepositMm: '', largestNodeSite: '' };

const CASES = [
  // Card accept: pT2 pN1 ductal adenocarcinoma with a 0.8 mm uncinate (SMA) margin reported R1.
  ['pancreas-01-pdac-pt2-pn1-sma-margin-r1', {}],
  // Card accept: post-neoadjuvant resection carrying a regression score and the y descriptor.
  ['pancreas-02-post-neoadjuvant-partial-response', {
    ...NO_NODES,
    treatmentEffect: 'Present, with residual cancer showing evident tumour regression but more than single cells or rare small groups of cancer cells (partial response, score 2)',
    tumourSizeCm: 1.4, tumourDims: '14 x 12 x 8', tumourExtension: ['Confined to pancreas'],
    surfaceInvolvement: 'Not identified', lvi: 'Not identified', pni: 'Not identified',
    uncinateMargin: 'Uninvolved by invasive carcinoma (specify distance)', uncinateMarginMm: 6,
    additionalFindings: ['Chronic pancreatitis'],
  }],
];
const byName = Object.fromEntries(CASES.map(([name, patch, opts]) => [name, { patch, options: opts || {} }]));

test('schema shape: ids, groups and the example', () => {
  assert.equal(schema.id, 'pancreas_carcinoma');
  assert.equal(schema.system, 'Hepatobiliary');
  const ids = new Set(schema.fields.map((f) => f.id));
  assert.equal(ids.size, schema.fields.length, 'no duplicate field ids');
  for (const k of Object.keys(EX)) assert.ok(ids.has(k), `example key ${k} is a field`);
  const groups = [...new Set(schema.fields.map((f) => f.group).filter(Boolean))];
  assert.deepEqual(groups, ['Specimen and tumour', 'Histology and immunohistochemistry', 'Margins', 'Lymph nodes and metastasis', 'Stage and other findings']);
});

test('specimens, macro and block key', () => {
  const c = run();
  assert.equal(c.specimens, 'Pancreas and duodenum, head of pancreas, pancreaticoduodenectomy (Whipple resection)');
  const m = c.macro.replace(/\s+/g, ' ');
  assert.ok(m.startsWith('Received in formalin is a pancreaticoduodenectomy (Whipple resection) specimen measuring 150 x 90 x 60 mm.'));
  assert.ok(m.includes('The pancreatic head measures 55 x 45 x 35 mm, the attached duodenum measures 160 mm in length and the common bile duct measures 35 mm in length.'));
  assert.ok(m.includes('The pancreatic duct is dilated to 6 mm upstream and the common bile duct is dilated to 14 mm.'));
  assert.equal(c.blockKey.replace(/\s+/g, ' '), '(1-4) Tumour with posterior surface. (5) Pancreatic neck margin, en face. (6) Bile duct margin, en face.');
});

test('synoptic: example case rows and one combined histology paragraph', () => {
  const c = run();
  const r = rows(c);
  assert.equal(r['Procedure'], 'Pancreaticoduodenectomy (Whipple resection)');
  assert.equal(r['Tumour size'], '3.2 cm (unifocal invasive carcinoma, greatest dimension)');
  assert.equal(r['Histologic type'], 'Ductal adenocarcinoma, NOS');
  assert.equal(r['Histologic grade'], 'G2, moderately differentiated');
  assert.equal(r['Pancreatic surface involvement'], 'Posterior surface involved');
  assert.equal(r['Uncinate (retroperitoneal / superior mesenteric artery) margin'], 'Uninvolved by invasive carcinoma, 0.8 mm');
  assert.equal(r['Regional lymph nodes'], '18 examined; 3 involved');
  assert.equal(r['pTNM'], 'pT2 pN1');
  assert.equal(r['Stage group (if cM0)'], 'IIB');
  const hist = r['Tumour histology'].replace(/\s+/g, ' ');
  assert.ok(hist.startsWith('The tumour is a moderately differentiated ductal adenocarcinoma, NOS,'));
  assert.ok(hist.includes('The tumour cells express CK7.'), 'IHC sits in the same paragraph');
  assert.ok(hist.includes('There is loss of nuclear SMAD4 (DPC4) expression.'));
  assert.ok(!/WHO|by definition|prognos/i.test(hist), 'no textbook register in printed prose');
});

test('diagnosis: example case clauses', () => {
  const c = run();
  const t = flatDx(c);
  assert.ok(t.startsWith('PANCREAS AND DUODENUM, head of pancreas, pancreaticoduodenectomy (Whipple resection)'));
  assert.ok(t.includes('DUCTAL ADENOCARCINOMA, NOS, moderately differentiated, 3.2 cm'));
  assert.ok(t.includes('uncinate margin 0.8 mm (margin positive at 1 mm or less)'));
  assert.ok(t.includes('3 of 18 regional lymph nodes involved'));
  assert.ok(t.includes('pT2 pN1 (AJCC 8th edition), stage IIB (if cM0)'));
});

test('staging boundaries: pT follows size alone, arteries only for T4', () => {
  const size = (cm) => tnm(run({ ...NO_NODES, tumourSizeCm: cm, tumourExtension: ['Confined to pancreas'] }));
  assert.equal(size(0.5), 'pT1a pN0');
  assert.equal(size(0.6), 'pT1b pN0');
  assert.equal(size(1), 'pT1b pN0');
  assert.equal(size(1.1), 'pT1c pN0');
  assert.equal(size(2), 'pT1c pN0');
  assert.equal(size(2.1), 'pT2 pN0');
  assert.equal(size(4), 'pT2 pN0');
  assert.equal(size(4.1), 'pT3 pN0');
  // Extrapancreatic extension does not raise pT in the eighth edition.
  assert.equal(tnm(run({ ...NO_NODES, tumourSizeCm: 1.5, tumourExtension: ['Peripancreatic soft tissue', 'Duodenal wall'] })), 'pT1c pN0');
  // Veins are not T4; the three named arteries are.
  assert.equal(tnm(run({ ...NO_NODES, tumourSizeCm: 1.5, tumourExtension: ['Superior mesenteric vein or portal vein'] })), 'pT1c pN0');
  for (const a of ['Coeliac axis', 'Superior mesenteric artery', 'Common hepatic artery']) {
    assert.equal(tnm(run({ ...NO_NODES, tumourSizeCm: 1.5, tumourExtension: [a] })), 'pT4 pN0', a);
  }
});

test('staging boundaries: pN1 is 1-3 nodes, pN2 is 4 or more, and the stage groups follow', () => {
  const nodes = (n) => run({ nodesExamined: 20, nodesInvolved: n, station8: '', station12: '', station13: n || '', station14: '', station17: '', largestDepositMm: n ? 6 : '', largestNodeSite: n ? 'station 13' : '' });
  assert.equal(tnm(nodes(0)), 'pT2 pN0');
  assert.equal(rows(nodes(0))['Stage group (if cM0)'], 'IB');
  assert.equal(tnm(nodes(3)), 'pT2 pN1');
  assert.equal(rows(nodes(3))['Stage group (if cM0)'], 'IIB');
  assert.equal(tnm(nodes(4)), 'pT2 pN2');
  assert.equal(rows(nodes(4))['Stage group (if cM0)'], 'III');
  // T4 is stage III whatever the nodes; M1 is IV.
  assert.equal(rows(run({ ...NO_NODES, tumourSizeCm: 1.5, tumourExtension: ['Superior mesenteric artery'] }))['Stage group (if cM0)'], 'III');
  const m1 = run({ ...NO_NODES, distantMets: ['Liver (specify)'], distantDetail: 'two deposits in segment 4' });
  assert.equal(tnm(m1), 'pT2 pN0 pM1');
  assert.equal(rows(m1)['Stage group (if cM0)'], undefined, 'no "if cM0" line once pM1 is recorded');
});

test('post-neoadjuvant resection carries the y descriptor and the regression score', () => {
  const c = run(byName['pancreas-02-post-neoadjuvant-partial-response'].patch);
  const r = rows(c);
  assert.equal(r['pTNM'], 'ypT1c ypN0');
  assert.ok(/partial response, score 2/.test(r['Treatment effect']));
  assert.ok(flatDx(c).includes('ypT1c ypN0 (AJCC 8th edition)'));
  const complete = run({ ...NO_NODES, treatmentEffect: 'Present, with no viable cancer cells (complete response, score 0)', tumourExtension: ['No evidence of primary tumour'] });
  assert.equal(rows(complete)['pTNM'], 'ypT0 ypN0');
  assert.ok(flatDx(complete).includes('NO RESIDUAL CARCINOMA'));
});

test('checks: node sufficiency, margin clearance, origin mismatch and required fields', () => {
  let m = msgs(run({ ...NO_NODES, nodesExamined: 8 }), 'warn');
  assert.ok(m.some((x) => /Fewer than 12 regional lymph nodes examined/.test(x)));
  m = msgs(run({ uncinateMargin: 'Uninvolved by invasive carcinoma (specify distance)', uncinateMarginMm: 0.8 }), 'warn');
  assert.ok(m.some((x) => /0\.8 mm from the carcinoma; at 1 mm or less this is reported as a positive margin \(R1\)/.test(x)));
  assert.ok(!msgs(run({ uncinateMarginMm: 4 }), 'warn').some((x) => /positive margin \(R1\)/.test(x)), 'a clear margin does not warn');
  // A tumour centred on the ampulla does not belong in this chapter.
  m = msgs(run({ origin: 'Ampullary (centred on the ampulla of Vater, including intra-ampullary and periampullary-duodenal)' }), 'warn').concat(msgs(run({ origin: 'Ampullary (centred on the ampulla of Vater, including intra-ampullary and periampullary-duodenal)' }), 'error'));
  assert.ok(m.some((x) => /ampulla/i.test(x)), 'origin mismatch is flagged');
  const e = msgs(run({ nodesExamined: '', nodesInvolved: '', tumourExtension: [] }), 'error').join(' | ');
  assert.ok(/lymph nodes examined/i.test(e));
  assert.ok(msgs(run({ tumourExtension: [] }), 'warn').some((x) => /Sites involved by direct extension are not recorded/.test(x)));
  assert.ok(msgs(run({ nodesExamined: 4, nodesInvolved: 6 }), 'error').some((x) => /Involved nodes exceed the number examined/.test(x)));
});

test('prefillFromFrozen: the frozen margin is carried into the paraffin synoptic', () => {
  const p = prefillFromFrozen({ scenario: 'Pancreatic / bile duct margin', pdSite: 'Pancreatic neck (transection)', pdOrigin: 'Pancreatic', pdResult: 'Carcinoma close to margin', pdDistanceMm: '0.7' });
  assert.equal(p.procedure, 'Pancreaticoduodenectomy (Whipple resection)');
  assert.match(p.origin, /^Pancreatic \(ductal adenocarcinoma/);
  assert.equal(p.neckMargin, 'Uninvolved by invasive carcinoma (specify distance)');
  assert.equal(p.neckMarginMm, '0.7');
  const inv = prefillFromFrozen({ scenario: 'Pancreatic / bile duct margin', pdSite: 'Bile duct', pdResult: 'Carcinoma present at margin' });
  assert.equal(inv.bileDuctMargin, 'Involved by invasive carcinoma');
  assert.equal(inv.bileDuctMarginMm, undefined);
  // The pancreatic duct margin is an ampulla-only field; it must not be written here.
  const skipped = prefillFromFrozen({ scenario: 'Pancreatic / bile duct margin', pdSite: 'Pancreatic duct', pdResult: 'Carcinoma present at margin' });
  assert.equal(skipped.pancDuctMargin, undefined);
  assert.equal(prefillFromFrozen({ scenario: 'Lymph node' }).procedure, undefined, 'other scenarios are ignored');
});

test('frozen neck margin and the paraffin synoptic as separate letters', () => {
  const fs_ = registry.frozen_section;
  const frozenValues = {
    ...defaults(fs_.schema), specimenName: 'Pancreatic neck margin', scenario: 'Pancreatic / bile duct margin',
    pdSite: 'Pancreatic neck (transection)', pdOrigin: 'Pancreatic', pdResult: 'Negative', pdDistanceMm: '9',
  };
  // The margin shaving is its own specimen, so the pair takes two letters (PAIR_SEPARATE), unlike
  // the lung and ovary pairs where the frozen and the resection are the same specimen.
  assert.equal(fs_.generator.PAIR_SEPARATE['Pancreatic / bile duct margin'], true);
  assert.equal(fs_.generator.pairTemplate(frozenValues), 'pancreas_carcinoma');
  const patch = prefillFromFrozen(frozenValues);
  const synValues = { ...defaults(schema), ...EX, ...patch, specimenName: '' };
  const cs = {
    caseTitle: '', options: { includeHeader: false, macro: true, printPTNM: true },
    parts: relabel([
      { templateId: 'frozen_section', values: frozenValues },
      { templateId: 'pancreas_carcinoma', values: synValues },
    ]),
  };
  assert.deepEqual(cs.parts.map((p) => p.label), ['A', 'B']);
  const out = generateCase({ frozen_section: fs_, pancreas_carcinoma: registry.pancreas_carcinoma }, cs);
  assert.match(out.report, /No carcinoma or dysplasia at the pancreatic neck margin\./);
  assert.match(out.diagnosis, /^\(A\) PANCREATIC NECK MARGIN, frozen section - NO EVIDENCE OF MALIGNANCY/m);
  assert.match(out.diagnosis, /\n\(B\) PANCREAS AND DUODENUM, head of pancreas/);
  assert.ok(/- Pancreatic neck \(transection\) margin: Uninvolved by invasive carcinoma, 9 mm/.test(out.report), 'the frozen clearance is carried across');
  const file = path.join(FIX, 'pancreas-03-frozen-neck-margin-pair.json');
  const current = { templateIds: ['frozen_section', 'pancreas_carcinoma'], frozenValues, patch, options: cs.options, report: out.report, checks: out.issues };
  fs.mkdirSync(FIX, { recursive: true });
  if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); return; }
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
  assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
});

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, patch, opts = {}] of CASES) {
    const out = run(patch, opts);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'pancreas_carcinoma', patch, options: opts, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
