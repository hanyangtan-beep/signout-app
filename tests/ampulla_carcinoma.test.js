// Ampullary carcinoma, pancreaticoduodenectomy (synoptic, AJCC 8th) - generator, staging
// boundaries, checks, the frozen margin link and golden fixtures.
// Fixtures: tests/fixtures/whipple/ampulla-*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, generateCase, relabel } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { prefillFromFrozen } from '../generators/ampulla_carcinoma.js';
import { parseSynoptic } from '../src/synoptic.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'whipple');
const UPDATE = process.argv.includes('--update');
const registry = await loadAll();
const { schema, generator } = registry.ampulla_carcinoma;
const EX = schema.example.parts[0].values;
const defaults = (s) => Object.fromEntries(s.fields.filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));

function run(patch = {}, options = {}) {
  const values = { ...defaults(schema), ...EX, ...patch };
  const cs = { schemaId: 'ampulla_carcinoma', caseTitle: '', options: { ...schema.example.options, ...options }, parts: [{ label: 'A', templateId: 'ampulla_carcinoma', values }] };
  return generate(schema, generator, cs);
}
const rows = (out) => Object.fromEntries(parseSynoptic(out.synoptic).filter((r) => r.label).map((r) => [r.label, r.value]));
const flatDx = (out) => out.diagnosis.replace(/\s+/g, ' ');
const msgs = (out, level) => out.issues.filter((i) => i.level === level).map((i) => i.message);
const tnm = (out) => rows(out)['pTNM'];

const NO_NODES = { nodesExamined: 16, nodesInvolved: 0, station8: '', station12: '', station13: '', station14: '', station17: '', ene: 'Not applicable', largestDepositMm: '', largestNodeSite: '' };

const CASES = [
  // Card accept: pT1a intestinal-type ampullary carcinoma limited to the ampulla.
  ['ampulla-01-intestinal-pt1a', {
    ...NO_NODES,
    histType: 'Adenocarcinoma, intestinal-type',
    grade: 'G1, well differentiated',
    tumourSite: 'Intra-ampullary',
    tumourSizeCm: 0.9, tumourDims: '9 x 8 x 4',
    tumourExtension: ['Limited to the ampulla of Vater or sphincter of Oddi'], pancreasDepthCm: '',
    ihc: ['CK20 positive', 'CDX2 positive', 'MUC2 positive', 'CK7 negative'],
    lvi: 'Not identified', pni: 'Not identified',
    precursor: ['Ampullary adenoma (tubular, tubulovillous or villous)'],
    blockKeyText: '1-5 Ampulla, bisected along the probed ducts\n6 Pancreatic neck margin, en face\n7 Bile duct margin, en face',
    additionalFindings: ['Ampullary adenoma'],
  }],
  // Card accept: pT3b pancreatobiliary-type carcinoma with four positive nodes (pN2).
  ['ampulla-02-pancreatobiliary-pt3b-four-nodes', {
    histType: 'Adenocarcinoma, pancreaticobiliary-type',
    grade: 'G3, poorly differentiated',
    tumourSizeCm: 2.6, tumourDims: '26 x 22 x 15',
    tumourExtension: ['Invades the pancreas'], pancreasDepthCm: 0.9,
    lvi: 'Present', pni: 'Present',
    nodesExamined: 19, nodesInvolved: 4, station8: '', station12: 1, station13: 3, station14: '', station17: '',
    ene: 'Present', largestDepositMm: 11, largestNodeSite: 'station 13',
  }],
];
const byName = Object.fromEntries(CASES.map(([name, patch, opts]) => [name, { patch, options: opts || {} }]));

test('schema shape: ids, groups and the example', () => {
  assert.equal(schema.id, 'ampulla_carcinoma');
  assert.equal(schema.system, 'GI');
  const ids = new Set(schema.fields.map((f) => f.id));
  assert.equal(ids.size, schema.fields.length, 'no duplicate field ids');
  for (const k of Object.keys(EX)) assert.ok(ids.has(k), `example key ${k} is a field`);
  // The two ampulla-only margins do not exist on the pancreatic template.
  assert.ok(ids.has('pancDuctMargin') && ids.has('duodMucosalMargin'));
});

test('specimens, macro and block key', () => {
  const c = run();
  assert.equal(c.specimens, 'Ampulla of Vater, pancreas and duodenum, pancreaticoduodenectomy (Whipple resection)');
  const m = c.macro.replace(/\s+/g, ' ');
  assert.ok(m.includes('There is a firm, ill-defined pale tumour centred on the ampulla of Vater measuring 18 x 15 x 10 mm.'));
  assert.ok(m.includes('The ampulla is bisected along the probed common bile duct and pancreatic duct and embedded in full.'));
  assert.equal(c.blockKey.replace(/\s+/g, ' '), '(1-6) Ampulla, bisected along the probed ducts. (7) Pancreatic neck margin, en face. (8) Bile duct margin, en face.');
});

test('synoptic: example case rows and one combined histology paragraph', () => {
  const c = run();
  const r = rows(c);
  assert.equal(r['Tumour site'], 'Intra-ampullary');
  assert.equal(r['Histologic type'], 'Adenocarcinoma, pancreaticobiliary-type');
  assert.equal(r['Depth of pancreatic invasion'], '0.3 cm');
  assert.equal(r['Pancreatic duct margin'], 'Uninvolved by invasive carcinoma, 14 mm');
  assert.equal(r['Regional lymph nodes'], '16 examined; 2 involved');
  assert.equal(r['pTNM'], 'pT3a pN1');
  assert.equal(r['Stage group (if cM0)'], 'IIIA');
  const hist = r['Tumour histology'].replace(/\s+/g, ' ');
  assert.ok(hist.startsWith('The tumour is a moderately differentiated adenocarcinoma, pancreaticobiliary-type,'));
  assert.ok(hist.includes('The tumour cells express CK7 and MUC1 and are negative for CDX2.'), 'IHC sits in the same paragraph');
  assert.ok(!/WHO|by definition|prognos/i.test(hist), 'no textbook register in printed prose');
});

test('diagnosis: example case clauses', () => {
  const c = run();
  const t = flatDx(c);
  assert.ok(t.startsWith('AMPULLA OF VATER, pancreas and duodenum, pancreaticoduodenectomy (Whipple resection)'));
  assert.ok(t.includes('ADENOCARCINOMA, pancreaticobiliary-type, moderately differentiated, 1.8 cm'));
  assert.ok(t.includes('2 of 16 regional lymph nodes involved'));
  assert.ok(t.includes('pT3a pN1 (AJCC 8th edition), stage IIIA (if cM0)'));
});

test('staging boundaries: T follows depth, not size', () => {
  const ext = (list, depth = '') => tnm(run({ ...NO_NODES, tumourExtension: list, pancreasDepthCm: depth }));
  assert.equal(ext(['Carcinoma in situ / high-grade dysplasia, including intra-ampullary papillary-tubular neoplasm with high-grade dysplasia']), 'pTis pN0');
  assert.equal(ext(['Limited to the ampulla of Vater or sphincter of Oddi']), 'pT1a pN0');
  assert.equal(ext(['Invades beyond the sphincter of Oddi (perisphincteric invasion)']), 'pT1b pN0');
  assert.equal(ext(['Invades into the duodenal submucosa']), 'pT1b pN0');
  assert.equal(ext(['Invades into the muscularis propria of the duodenum']), 'pT2 pN0');
  // Pancreatic invasion splits at 0.5 cm.
  assert.equal(ext(['Invades the pancreas'], 0.5), 'pT3a pN0');
  assert.equal(ext(['Invades the pancreas'], 0.6), 'pT3b pN0');
  assert.equal(ext(['Extends into peripancreatic soft tissue, periduodenal tissue or duodenal serosa']), 'pT3b pN0');
  for (const a of ['Coeliac axis', 'Superior mesenteric artery', 'Common hepatic artery']) assert.equal(ext([a]), 'pT4 pN0', a);
  // A large tumour still limited to the ampulla stays pT1a: size does not drive T here.
  assert.equal(tnm(run({ ...NO_NODES, tumourSizeCm: 4.5, tumourExtension: ['Limited to the ampulla of Vater or sphincter of Oddi'], pancreasDepthCm: '' })), 'pT1a pN0');
});

test('staging boundaries: stage groups for pN0, pN1 and pN2', () => {
  const stage = (out) => rows(out)['Stage group (if cM0)'];
  const at = (ext, depth, involved) => run({
    ...NO_NODES, tumourExtension: ext, pancreasDepthCm: depth,
    nodesExamined: 18, nodesInvolved: involved, station13: involved || '', largestDepositMm: involved ? 6 : '', largestNodeSite: involved ? 'station 13' : '',
  });
  assert.equal(stage(at(['Limited to the ampulla of Vater or sphincter of Oddi'], '', 0)), 'IA');
  assert.equal(stage(at(['Invades beyond the sphincter of Oddi (perisphincteric invasion)'], '', 0)), 'IB');
  assert.equal(stage(at(['Invades into the muscularis propria of the duodenum'], '', 0)), 'IB');
  assert.equal(stage(at(['Invades the pancreas'], 0.3, 0)), 'IIA');
  assert.equal(stage(at(['Invades the pancreas'], 0.9, 0)), 'IIB');
  assert.equal(stage(at(['Invades the pancreas'], 0.3, 2)), 'IIIA');
  assert.equal(stage(at(['Invades the pancreas'], 0.3, 4)), 'IIIB');
  assert.equal(stage(at(['Coeliac axis'], '', 0)), 'IIIB');
  const m1 = run({ ...NO_NODES, distantMets: ['Liver (specify)'], distantDetail: 'one deposit in segment 6' });
  assert.equal(tnm(m1), 'pT3a pN0 pM1');
});

test('pT3b with four positive nodes reads pN2 and stage IIIB', () => {
  const c = run(byName['ampulla-02-pancreatobiliary-pt3b-four-nodes'].patch);
  const r = rows(c);
  assert.equal(r['pTNM'], 'pT3b pN2');
  assert.equal(r['Stage group (if cM0)'], 'IIIB');
  assert.equal(r['Regional lymph nodes'], '19 examined; 4 involved');
  assert.ok(flatDx(c).includes('4 of 19 regional lymph nodes involved'));
});

test('checks: node sufficiency, margin clearance, pancreatic depth and origin mismatch', () => {
  assert.ok(msgs(run({ ...NO_NODES, nodesExamined: 7 }), 'warn').some((x) => /Fewer than 12 regional lymph nodes examined/.test(x)));
  assert.ok(msgs(run({ bileDuctMargin: 'Uninvolved by invasive carcinoma (specify distance)', bileDuctMarginMm: 0.6 }), 'warn')
    .some((x) => /0\.6 mm from the carcinoma; at 1 mm or less this is reported as a positive margin \(R1\)/.test(x)));
  assert.ok(!msgs(run({ bileDuctMarginMm: 20 }), 'warn').some((x) => /positive margin \(R1\)/.test(x)));
  // Pancreatic invasion recorded without a depth cannot be split into pT3a / pT3b.
  const depth = msgs(run({ tumourExtension: ['Invades the pancreas'], pancreasDepthCm: '' }), 'warn')
    .concat(msgs(run({ tumourExtension: ['Invades the pancreas'], pancreasDepthCm: '' }), 'error'));
  assert.ok(depth.some((x) => /depth/i.test(x)), 'missing depth of pancreatic invasion is flagged');
  // A tumour centred in the pancreatic head belongs on the pancreatic template.
  const mismatch = msgs(run({ origin: 'Pancreatic (ductal adenocarcinoma centred in the pancreatic head or uncinate process)' }), 'error')
    .concat(msgs(run({ origin: 'Pancreatic (ductal adenocarcinoma centred in the pancreatic head or uncinate process)' }), 'warn'));
  assert.ok(mismatch.some((x) => /pancrea/i.test(x)));
  assert.ok(msgs(run({ nodesExamined: 3, nodesInvolved: 5 }), 'error').some((x) => /Involved nodes exceed the number examined/.test(x)));
});

test('prefillFromFrozen: ampulla-only margins are carried, and other scenarios ignored', () => {
  const p = prefillFromFrozen({ scenario: 'Pancreatic / bile duct margin', pdSite: 'Pancreatic duct', pdOrigin: 'Ampullary', pdResult: 'Carcinoma close to margin', pdDistanceMm: '1.2' });
  assert.match(p.origin, /^Ampullary \(centred on the ampulla/);
  assert.equal(p.procedure, 'Pancreaticoduodenectomy (Whipple resection)');
  assert.equal(p.pancDuctMargin, 'Uninvolved by invasive carcinoma (specify distance)');
  assert.equal(p.pancDuctMarginMm, '1.2');
  const hgd = prefillFromFrozen({ scenario: 'Pancreatic / bile duct margin', pdSite: 'Bile duct', pdOrigin: 'Ampullary', pdResult: 'High-grade dysplasia only' });
  assert.equal(hgd.hgDysplasia, 'Present at the bile duct margin');
  assert.deepEqual(prefillFromFrozen({ scenario: 'Nodule / mass' }), {});
});

test('frozen bile duct margin and the paraffin synoptic as separate letters', () => {
  const fs_ = registry.frozen_section;
  const frozenValues = {
    ...defaults(fs_.schema), specimenName: 'Bile duct margin', scenario: 'Pancreatic / bile duct margin',
    pdSite: 'Bile duct', pdOrigin: 'Ampullary', pdResult: 'Carcinoma present at margin',
  };
  assert.equal(fs_.generator.pairTemplate(frozenValues), 'ampulla_carcinoma');
  const patch = prefillFromFrozen(frozenValues);
  const synValues = { ...defaults(schema), ...EX, ...patch, specimenName: '' };
  const cs = {
    caseTitle: '', options: { includeHeader: false, macro: true, printPTNM: true },
    parts: relabel([
      { templateId: 'frozen_section', values: frozenValues },
      { templateId: 'ampulla_carcinoma', values: synValues },
    ]),
  };
  const out = generateCase({ frozen_section: fs_, ampulla_carcinoma: registry.ampulla_carcinoma }, cs);
  assert.match(out.report, /Carcinoma present at the bile duct margin\./);
  assert.match(out.report, /- Bile duct margin: Involved by invasive carcinoma/);
  assert.match(out.diagnosis, /^\(A\) BILE DUCT MARGIN, frozen section - /m);
  assert.match(out.diagnosis, /\n\(B\) AMPULLA OF VATER, pancreas and duodenum/);
  const file = path.join(FIX, 'ampulla-03-frozen-bile-duct-margin-pair.json');
  const current = { templateIds: ['frozen_section', 'ampulla_carcinoma'], frozenValues, patch, options: cs.options, report: out.report, checks: out.issues };
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
    const current = { templateId: 'ampulla_carcinoma', patch, options: opts, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
