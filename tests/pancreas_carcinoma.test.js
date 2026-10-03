// Pancreatic carcinoma resection (synoptic, AJCC 8th) - pancreatoduodenectomy and, since Phase 52,
// distal, total and central pancreatectomy and enucleation: generator, staging boundaries, checks,
// the frozen margin link and golden fixtures.
// Fixtures: tests/fixtures/whipple/pancreas-*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, generateCase, relabel, isVisible, applyLinkedDefaults } from '../src/engine.js';
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

const UNINV = 'Uninvolved by invasive carcinoma (specify distance)';
// The example is a Whipple; these blank its head-only entries for the other operations.
const NOT_PD = { duodenumLengthMm: '', bileDuctLengthMm: '', bileDuctDilatation: '', blockKeyText: '', station13: '', station17: '', largestDepositMm: '', largestNodeSite: '' };
const DISTAL = {
  ...NOT_PD, procedure: 'Distal pancreatectomy', spleen: 'Included (splenectomy)',
  tumourSite: ['Tail of pancreas'], tumourSizeCm: 3.5, tumourDims: '35 x 30 x 25',
  specimenDims: '180 x 90 x 50', pancreasDims: '110 x 40 x 30', spleenDims: '115 x 75 x 40', spleenWeightG: 160,
  blockKeyText: '1-4 Tumour with posterior surface\n5 Proximal pancreatic margin, en face\n6 Splenic hilum',
  tumourExtension: ['Peripancreatic soft tissue', 'Splenic vein or artery'], surfaceInvolvement: 'Not identified',
  proxPancMargin: UNINV, proxPancMarginMm: 12, posteriorMargin: UNINV, posteriorMarginMm: 0.5,
  nodesExamined: 14, nodesInvolved: 2, station10: 1, station11: 1, ene: 'Not identified', largestDepositMm: 4, largestNodeSite: 'station 11',
};

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
  // Phase 52: distal pancreatectomy with splenectomy, splenic stations and a 0.5 mm posterior surface (R1).
  ['pancreas-04-distal-pancreatectomy-splenectomy', DISTAL],
  // Spleen-preserving distal pancreatectomy: a named other margin and no 12-node warning.
  ['pancreas-05-spleen-preserving-distal-pancreatectomy', {
    ...NOT_PD, procedure: 'Distal pancreatectomy', spleen: 'Not included (spleen-preserving)',
    tumourSite: ['Body of pancreas'], tumourSizeCm: 1.8, tumourDims: '18 x 15 x 12', specimenDims: '', pancreasDims: '85 x 30 x 22',
    tumourExtension: ['Confined to pancreas'], surfaceInvolvement: 'Not identified', lvi: 'Not identified',
    proxPancMargin: UNINV, proxPancMarginMm: 15, posteriorMargin: UNINV, posteriorMarginMm: 3,
    otherMargin: UNINV, otherMarginName: 'Splenic vein transection margin', otherMarginMm: 20,
    nodesExamined: 7, nodesInvolved: 0, ene: 'Not applicable',
  }],
  // Total pancreatectomy with splenectomy and a portal vein segment: the head margins stay, the neck goes.
  ['pancreas-06-total-pancreatectomy-splenectomy', {
    procedure: 'Total pancreatectomy', spleen: 'Included (splenectomy)',
    tumourSite: ['Head of pancreas', 'Body of pancreas'], tumourSizeCm: 5.2, tumourDims: '52 x 40 x 30',
    specimenDims: '260 x 120 x 60', pancreasDims: '190 x 50 x 35', duodenumLengthMm: '150', bileDuctLengthMm: '30', spleenDims: '105 x 70 x 35', spleenWeightG: 140,
    blockKeyText: '1-6 Tumour with uncinate and posterior surfaces\n7 Bile duct margin, en face\n8 Portal vein segment',
    tumourExtension: ['Peripancreatic soft tissue', 'Superior mesenteric vein or portal vein'], surfaceInvolvement: 'Not identified',
    extendedResection: ['Superior mesenteric or portal vein segment'],
    uncinateMarginMm: 2, posteriorMargin: UNINV, posteriorMarginMm: 3, bileDuctMarginMm: 15,
    otherMargin: UNINV, otherMarginName: 'Portal vein segment margins', otherMarginMm: 6,
    nodesExamined: 31, nodesInvolved: 5, station8: 1, station11: 1, station13: 2, station17: 1, ene: 'Present', largestDepositMm: 9, largestNodeSite: 'station 13',
  }],
  // Central pancreatectomy: both pancreatic transection margins, the distal one involved.
  ['pancreas-07-central-pancreatectomy', {
    ...NOT_PD, procedure: 'Central pancreatectomy',
    tumourSite: ['Body of pancreas'], tumourSizeCm: 1.2, tumourDims: '12 x 10 x 9', specimenDims: '', pancreasDims: '45 x 30 x 22',
    tumourExtension: ['Confined to pancreas'], surfaceInvolvement: 'Not identified', lvi: 'Not identified', pni: 'Not identified',
    proxPancMargin: UNINV, proxPancMarginMm: 6, distPancMargin: 'Involved by invasive carcinoma',
    nodesExamined: 2, nodesInvolved: 0, ene: 'Not applicable',
  }],
  // Enucleation: the parenchymal margin only and no nodes.
  ['pancreas-08-enucleation', {
    ...NOT_PD, procedure: 'Excisional biopsy (enucleation)',
    tumourSite: ['Head of pancreas'], tumourSizeCm: 0.9, tumourDims: '9 x 8 x 7', specimenDims: '15 x 12 x 10', pancreasDims: '', pancDuctDilatation: '',
    tumourExtension: ['Confined to pancreas'], surfaceInvolvement: 'Not identified', lvi: 'Not identified', pni: 'Not identified',
    parenchymalMargin: UNINV, parenchymalMarginMm: 0.4,
    nodesExamined: 0, nodesInvolved: '', ene: 'Not applicable',
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

// ---------- Phase 52: the other pancreatectomies ----------

const at = (patch) => ({ ...defaults(schema), ...EX, ...patch });
const field = (id) => schema.fields.find((f) => f.id === id);

test('procedure list: the operations offered, and the retired partial options still read', () => {
  assert.deepEqual(field('procedure').options, [
    'Pancreaticoduodenectomy (Whipple resection)', 'Pylorus-preserving pancreaticoduodenectomy', 'Distal pancreatectomy',
    'Total pancreatectomy', 'Central pancreatectomy', 'Excisional biopsy (enucleation)', 'Other', 'Not specified']);
  assert.equal(schema.name, 'Pancreatic carcinoma resection');
  // A saved draft holding a retired CAP option reads as a distal pancreatectomy.
  const r = rows(run({ ...DISTAL, procedure: 'Partial pancreatectomy, pancreatic tail' }));
  assert.equal(r['Procedure'], 'Partial pancreatectomy, pancreatic tail');
  assert.ok('Proximal pancreatic parenchymal margin' in r && !('Pancreatic neck (transection) margin' in r));
});

test('other pancreatectomies: the specimen line, Procedure row and diagnosis head follow the operation', () => {
  const spec = (patch) => run(patch).specimens;
  assert.equal(spec(DISTAL), 'Pancreas and spleen, tail of pancreas, distal pancreatectomy and splenectomy');
  assert.equal(spec({ ...DISTAL, spleen: 'Not included (spleen-preserving)' }), 'Pancreas, tail of pancreas, spleen-preserving distal pancreatectomy');
  assert.equal(spec({ ...DISTAL, procedure: 'Total pancreatectomy', tumourSite: ['Body of pancreas'] }), 'Pancreas, duodenum and spleen, body of pancreas, total pancreatectomy and splenectomy');
  assert.equal(spec({ ...DISTAL, procedure: 'Central pancreatectomy', tumourSite: ['Body of pancreas'] }), 'Pancreas, body of pancreas, central pancreatectomy');
  assert.equal(spec({ ...DISTAL, procedure: 'Excisional biopsy (enucleation)', tumourSite: ['Body of pancreas'] }), 'Pancreas, body of pancreas, enucleation');
  assert.equal(rows(run(DISTAL))['Procedure'], 'Distal pancreatectomy with splenectomy');
  assert.equal(rows(run({ ...DISTAL, spleen: 'Not included (spleen-preserving)' }))['Procedure'], 'Distal pancreatectomy, spleen-preserving');
  // The organs are upper-cased whole even when they carry a comma.
  assert.ok(flatDx(run({ ...DISTAL, procedure: 'Total pancreatectomy', tumourSite: ['Body of pancreas'] })).startsWith('PANCREAS, DUODENUM AND SPLEEN, body of pancreas, total pancreatectomy and splenectomy'));
  // A body or tail carcinoma is not periampullary, so the Origin row goes.
  assert.equal(rows(run(DISTAL))['Origin'], undefined);
  assert.match(rows(run({ ...DISTAL, procedure: 'Total pancreatectomy', tumourSite: ['Head of pancreas'] }))['Origin'], /^Pancreatic/);
  assert.equal(rows(run({ ...DISTAL, procedure: 'Total pancreatectomy', tumourSite: ['Tail of pancreas'] }))['Origin'], undefined);
  assert.equal(rows(run(DISTAL))['Additionally resected organs or structures'], undefined);
  assert.equal(rows(run({ ...DISTAL, extendedResection: ['Left adrenal gland', 'Stomach'] }))['Additionally resected organs or structures'], 'Left adrenal gland and Stomach');
});

test('other pancreatectomies: the margins each operation carries', () => {
  const labels = (patch) => parseSynoptic(run(patch).synoptic).map((x) => x.label)
    .filter((l) => /margin|surface/i.test(l || '') && !['High-grade dysplasia at the margins', 'Pancreatic surface involvement'].includes(l));
  assert.deepEqual(labels(DISTAL), ['Proximal pancreatic parenchymal margin', 'Posterior surface']);
  assert.deepEqual(labels({ ...DISTAL, procedure: 'Total pancreatectomy' }), ['Bile duct margin', 'Uncinate (retroperitoneal / superior mesenteric artery) margin', 'Posterior surface', 'Proximal (gastric or duodenal) margin', 'Distal (duodenal or jejunal) margin']);
  assert.deepEqual(labels({ ...DISTAL, procedure: 'Central pancreatectomy', distPancMarginMm: 4 }), ['Proximal pancreatic parenchymal margin', 'Distal pancreatic parenchymal margin']);
  assert.deepEqual(labels({ ...DISTAL, procedure: 'Excisional biopsy (enucleation)', parenchymalMarginMm: 2 }), ['Pancreatic parenchymal margin']);
  // A named other margin prints under its own name, in the synoptic and the diagnosis.
  const named = run({ ...DISTAL, otherMargin: 'Involved by invasive carcinoma', otherMarginName: 'Splenic vein transection margin' });
  assert.equal(rows(named)['Splenic vein transection margin'], 'Involved by invasive carcinoma');
  assert.ok(flatDx(named).includes('splenic vein transection margin involved'));
  assert.ok(flatDx(run(DISTAL)).includes('posterior surface 0.5 mm (margin positive at 1 mm or less); proximal pancreatic margin clear (closest 12 mm)'));
});

test('other pancreatectomies: the macro names the organs, the inking and the slicing', () => {
  const m = (patch) => run(patch).macro.replace(/\s+/g, ' ');
  const d = m(DISTAL);
  assert.ok(d.startsWith('Received in formalin is a distal pancreatectomy and splenectomy specimen measuring 180 x 90 x 50 mm.'));
  assert.ok(d.includes('The pancreas measures 110 x 40 x 30 mm and the spleen measures 115 x 75 x 40 mm and weighs 160 g.'));
  assert.ok(d.includes('The pancreatic transection margin and the anterior and posterior surfaces are inked in different colours and the pancreas is serially sliced in the sagittal plane.'));
  assert.ok(d.includes('The splenic hilar and peripancreatic lymph nodes are dissected and submitted.'));
  assert.ok(!/duodenum|bile duct/.test(d), 'no head-only measurements');
  const t = m({ ...DISTAL, procedure: 'Total pancreatectomy', duodenumLengthMm: '150' });
  assert.ok(t.includes('the attached duodenum measures 150 mm in length'));
  assert.ok(t.includes('The pancreatic head is sliced axially and the body and tail are sliced in the sagittal plane.'));
  const e = m({ ...DISTAL, procedure: 'Excisional biopsy (enucleation)', nodesExamined: 0, nodesInvolved: '' });
  assert.ok(e.startsWith('Received in formalin is an enucleation specimen'));
  assert.ok(e.includes('The surface is inked and the specimen is serially sliced.'));
  assert.ok(!/lymph nodes/.test(e), 'no node sentence without nodes');
  assert.ok(m({ ...DISTAL, procedure: 'Central pancreatectomy', nodesExamined: 2, nodesInvolved: 0 }).includes('The peripancreatic lymph nodes are dissected and submitted.'));
  // The Whipple macro is untouched.
  assert.ok(m({}).includes('The pancreatic neck, bile duct, uncinate (superior mesenteric artery) and posterior surfaces are inked'));
});

test('other pancreatectomies: checks follow the operation', () => {
  const all = (patch) => run(patch).issues.map((i) => i.message);
  // AJCC's 12 nodes is a pancreatoduodenectomy figure; no minimum is set for a distal pancreatectomy.
  assert.ok(!all({ ...DISTAL, nodesExamined: 7, nodesInvolved: 0, station10: '', station11: '' }).some((x) => /Fewer than 12/.test(x)));
  assert.ok(all({ ...DISTAL, procedure: 'Total pancreatectomy', nodesExamined: 7, nodesInvolved: 0, station10: '', station11: '' }).some((x) => /Fewer than 12/.test(x)));
  // The required margins are the operation's own.
  assert.ok(msgs(run({ ...DISTAL, proxPancMargin: '' }), 'error').some((x) => /Proximal pancreatic parenchymal margin status is required/.test(x)));
  assert.ok(!msgs(run({ ...DISTAL, neckMargin: '', uncinateMargin: '' }), 'error').some((x) => /neck|Uncinate/.test(x)), 'head margins are not asked of a distal pancreatectomy');
  assert.ok(msgs(run({ ...DISTAL, procedure: 'Central pancreatectomy', distPancMargin: '' }), 'error').some((x) => /Distal pancreatic parenchymal margin status is required/.test(x)));
  assert.ok(msgs(run({ ...DISTAL, procedure: 'Excisional biopsy (enucleation)', parenchymalMargin: '' }), 'error').some((x) => /Pancreatic parenchymal margin status is required/.test(x)));
  assert.ok(msgs(run({ ...DISTAL, procedure: 'Total pancreatectomy', neckMargin: '' }), 'error').every((x) => !/neck/.test(x)), 'a total pancreatectomy has no neck margin');
  // The operation and the site, the spleen and the extension, have to agree.
  assert.ok(all({ ...DISTAL, tumourSite: ['Head of pancreas'] }).some((x) => /pancreatic head, which a distal pancreatectomy does not include/.test(x)));
  assert.ok(all({ ...DISTAL, spleen: 'Not included (spleen-preserving)', tumourExtension: ['Spleen'] }).some((x) => /spleen was preserved/.test(x)));
  assert.ok(all({ ...DISTAL, extendedResection: ['Other (specify)'] }).some((x) => /additionally resected structure needs specifying/.test(x)));
  assert.ok(all({ ...DISTAL, otherMargin: 'Involved by invasive carcinoma' }).some((x) => /Name the other margin/.test(x)));
  // The periampullary origin is not asked of a body or tail carcinoma.
  assert.ok(!all({ ...DISTAL, origin: 'Ampullary (centred on the ampulla of Vater, including intra-ampullary and periampullary-duodenal)' }).some((x) => /ampulla/i.test(x)));
  // Splenic and adrenal extension stays descriptive: pT follows size.
  assert.equal(tnm(run({ ...DISTAL, tumourSizeCm: 1.5, tumourExtension: ['Spleen', 'Adrenal gland'] })), 'pT1c pN1');
  assert.ok(all({ ...DISTAL, tumourSizeCm: 1.5, tumourExtension: ['Spleen'] }).some((x) => /eighth edition pT follows size alone/.test(x)));
});

test('other pancreatectomies: the form shows each operation its own fields', () => {
  const shown = (id, patch) => isVisible(field(id), at(patch));
  for (const id of ['neckMargin', 'bileDuctMargin', 'uncinateMargin', 'duodenumLengthMm', 'station12', 'station13', 'station14', 'station17', 'origin']) {
    assert.equal(shown(id, DISTAL), false, `${id} is hidden for a distal pancreatectomy`);
    assert.equal(shown(id, {}), true, `${id} shows for a Whipple`);
  }
  for (const id of ['spleen', 'spleenDims', 'spleenWeightG', 'proxPancMargin', 'proxPancMarginMm', 'posteriorMargin', 'station9', 'station10', 'station11']) {
    assert.equal(shown(id, DISTAL), true, `${id} shows for a distal pancreatectomy`);
  }
  for (const id of ['spleen', 'proxPancMargin', 'station9', 'station10', 'station11']) assert.equal(shown(id, {}), false, `${id} is hidden for a Whipple`);
  assert.equal(shown('spleenWeightG', { ...DISTAL, spleen: 'Not included (spleen-preserving)' }), false);
  assert.equal(shown('neckMargin', { procedure: 'Total pancreatectomy' }), false);
  assert.equal(shown('uncinateMargin', { procedure: 'Total pancreatectomy' }), true);
  assert.equal(shown('origin', { procedure: 'Total pancreatectomy', tumourSite: ['Tail of pancreas'] }), false);
  assert.equal(shown('origin', { procedure: 'Total pancreatectomy', tumourSite: ['Uncinate process'] }), true);
  assert.equal(shown('distPancMargin', { procedure: 'Central pancreatectomy' }), true);
  assert.equal(shown('posteriorMargin', { procedure: 'Central pancreatectomy' }), false);
  assert.equal(shown('parenchymalMargin', { procedure: 'Excisional biopsy (enucleation)' }), true);
  assert.equal(shown('neckMarginMm', DISTAL), false, 'a hidden margin hides its distance too');
  assert.equal(shown('otherMarginName', { otherMargin: 'Not applicable' }), false);
});

test('other pancreatectomies: the head default does not follow the operation', () => {
  const part = { values: defaults(schema) };
  assert.deepEqual(part.values.tumourSite, ['Head of pancreas']);
  const move = (to) => { const before = part.values.procedure; part.values.procedure = to; applyLinkedDefaults(schema, part, 'procedure', before); return part.values.tumourSite; };
  assert.deepEqual(move('Distal pancreatectomy'), []);
  assert.deepEqual(move('Central pancreatectomy'), ['Body of pancreas']);
  assert.deepEqual(move('Excisional biopsy (enucleation)'), []);
  assert.deepEqual(move('Total pancreatectomy'), ['Head of pancreas']);
  assert.deepEqual(move('Pancreaticoduodenectomy (Whipple resection)'), ['Head of pancreas']);
  // A site the pathologist picked stays when the operation changes.
  part.values.tumourSite = ['Tail of pancreas'];
  assert.deepEqual(move('Distal pancreatectomy'), ['Tail of pancreas']);
  // A blank site is a Check, not a guess.
  assert.ok(run({ ...DISTAL, tumourSite: [] }).issues.some((i) => i.message === 'Tumour site is not recorded.'));
  assert.ok(!run(DISTAL).issues.some((i) => i.message === 'Tumour site is not recorded.'));
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
