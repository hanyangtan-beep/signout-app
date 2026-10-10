// Colon and rectum carcinoma resection — first synoptic (hybrid) template (Phase 5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, generateCase, snippetsFor, createCase, BLOCK_ORDER, HEADERS } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { buildDocText } from '../src/docformat.js';
import { parseSynoptic } from '../src/synoptic.js';
import { readFileSync } from 'node:fs';

const reg = await loadAll();
const { schema, generator } = reg.colon_resection;
const exampleValues = schema.example.parts[0].values;
const run = (values = {}, options = {}, extraParts = []) => generate(schema, generator, {
  schemaId: 'colon_resection', caseTitle: '', options: { ...schema.example.options, ...options },
  parts: [{ label: 'A', values: { ...exampleValues, ...values } }, ...extraParts.map((v, i) => ({ label: 'BCD'[i], values: { ...exampleValues, ...v } }))]
});
const snippets = (values) => snippetsFor({ colon_resection: reg.colon_resection }, {
  schemaId: 'colon_resection', parts: [{ label: 'A', templateId: 'colon_resection', values: { ...exampleValues, ...values } }], snippets: {}
}).filter((s) => s.active).map((s) => s.id);
const issues = (values) => run(values).issues.map((i) => `${i.level}: ${i.message}`);
// Value of a synoptic element (wrapped lines rejoined); `flat` folds the multi-line diagnosis back to one "; "-separated line.
const row = (out, label) => parseSynoptic(out.synoptic).find((r) => r.label === label)?.value;
const flat = (d) => d.replace(/\n {2,}/g, ' ').split('\n- ').join('; ');

test('schema metadata and the QMH source are recorded', () => {
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.system, 'GI');
  assert.match(schema.source.url, /GI-Colon-and-rectum\.html$/);
  assert.equal(schema.source.stagingProtocol, 'colorectal');
  assert.ok(schema.aliases.includes('LAR') && schema.aliases.includes('APR'));
  const manifest = JSON.parse(readFileSync(new URL('../templates/manifest.json', import.meta.url), 'utf8'));
  assert.ok(manifest.templates.some((t) => t.id === 'colon_resection' && t.kind === 'cancer resection'));
});

test('engine exposes the synoptic block between microscopy and diagnosis', () => {
  // `molecular` (2026-10-08) prints only for biomarker templates; nothing here has the hook.
  assert.deepEqual(BLOCK_ORDER, ['specimens', 'macro', 'blockKey', 'intraop', 'microscopy', 'molecular', 'diagnosis', 'comment']);
  assert.ok(!run({}, { includeHeader: true }).report.includes('MOLECULAR FINDINGS'));
  assert.equal(HEADERS.synoptic, 'MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:');
  const r = run({}, { includeHeader: true }).report;
  assert.ok(!r.includes('MICROSCOPIC EXAMINATION:'), 'no separate narrative microscopy block');
  assert.ok(r.indexOf('BLOCK KEY:') < r.indexOf('MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:') && r.indexOf('SYNOPTIC REPORT:') < r.indexOf('DIAGNOSIS:'));
});

test('example case: specimen, macro, block key', () => {
  const out = run();
  assert.equal(out.specimens, 'Ascending colon, right hemicolectomy');
  assert.equal(out.macro, 'Received in formalin is a right hemicolectomy specimen comprising a segment of colon measuring 22 cm in length with attached terminal ileum 6 cm and appendix 5 cm. There is an ulcerated tumour in the ascending colon measuring 45 mm in greatest dimension (45 x 38 mm), 9 cm from the proximal margin and 10 cm from the distal margin. Macroscopic tumour perforation is not identified. Representative sections are taken; see block key.');
  assert.equal(out.blockKey, '(1) Proximal (ileal) margin. (2) Distal margin. (3-6) Tumour, deepest invasion. (7) Tumour with adjacent mucosa. (8) Appendix. (9-12) Lymph nodes. (13) Apical lymph node.');
  assert.equal(run({}, { macro: false }).macro, '');
  assert.equal(run({}, { macro: false }).blockKey, '');
  assert.equal(run({ specimenName: 'Colon, right hemicolectomy' }).specimens, 'Colon, right hemicolectomy');
});

test('example case: tumour histology paragraph replaces the narrative microscopy', () => {
  const out = run();
  assert.equal(out.microscopy, out.synoptic, 'the synoptic prints as the microscopy block');
  assert.equal(row(out, 'Tumour histology'), 'Sections show an invasive moderately differentiated adenocarcinoma arising in a tubulovillous adenoma, forming irregular glands with a desmoplastic stromal response and luminal dirty necrosis.');
  assert.ok(out.synoptic.includes('- Tumour histology:\n  Sections show an invasive moderately differentiated adenocarcinoma arising in a tubulovillous adenoma, forming irregular glands with a desmoplastic stromal response and luminal dirty necrosis.'));
  // Morphology picks drive the paragraph; free text is appended as its own sentence.
  assert.equal(row(run({ tumourMorphology: ['Extracellular mucin pools', 'Signet-ring cells'], morphologyOther: 'focal squamoid morules' }), 'Tumour histology'), 'Sections show an invasive moderately differentiated adenocarcinoma arising in a tubulovillous adenoma, forming pools of extracellular mucin and signet-ring cells. Focal squamoid morules.');
  assert.equal(row(run({ tumourMorphology: [], precursorPolyp: 'Not identified' }), 'Tumour histology'), 'Sections show an invasive moderately differentiated adenocarcinoma.');
});

test('example case: synoptic block mirrors the QMH colon elements in order with derived pTNM and stage', () => {
  const out = run();
  const lines = out.synoptic.split('\n');
  const rows = parseSynoptic(out.synoptic);
  // QMH order, with the single agreed exception: Tumour histology sits after Histologic grade.
  assert.deepEqual(rows.filter((r) => r.depth === 0).map((r) => r.label || r.value), [
    'Procedure', 'Tumour site', 'Tumour size', 'Macroscopic tumour perforation', 'Histologic type (WHO 2019)', 'Histologic grade', 'Tumour histology',
    'Multiple primary tumours', 'Tumour extension', 'Lymphatic and / or vascular invasion', 'Perineural invasion', 'Tumour budding (ITBCC 2016)',
    'Type of polyp in which invasive carcinoma arose', 'Tumour deposits', 'Treatment effect (modified Ryan scheme, 2005)', 'Proximal margin',
    'Distal margin', 'Radial or mesenteric margin', 'Regional lymph nodes', 'Distant metastasis', 'pTNM',
    'Diverticulosis', 'Mismatch repair immunohistochemistry'
  ]);
  assert.deepEqual([...new Set(rows.map((r) => r.section))], ['Specimen and tumour', 'Microscopic findings', 'Margins', 'Regional lymph nodes', 'Distant metastasis', 'Pathological stage (AJCC 8th edition)', 'Additional findings']);
  assert.ok(lines.includes('- pTNM: pT3 pN1b'));
  assert.ok(lines.includes('  - Stage group (if cM0): IIIB'));
  assert.ok(out.synoptic.includes('- Regional lymph nodes: 22 examined; 2 involved\n  - Apical lymph nodes: 1 examined; 0 involved\n  - Extranodal extension: Not identified\n  - Largest metastatic deposit: 6 mm'));
  assert.ok(out.synoptic.includes('- Tumour budding (ITBCC 2016): Low score (Bd1, 0-4 buds)\n  - Hotspot count: 3 buds in 1 field'));
  assert.ok(out.synoptic.includes('Additional findings\n- Diverticulosis\n- Mismatch repair immunohistochemistry: Retained (MLH1, PMS2, MSH2, MSH6)'));
  // Every line holds 80 columns except the tumour histology paragraph, which is prose on one line.
  // The tumour histology paragraph is prose on one line; every other line holds 80 columns.
  assert.equal(out.synoptic.split('\n').filter((l) => l.length > 80 && !/^ {2}(?!- )/.test(l)).length, 0);
  assert.ok(!run({}, { stageGroup: false }).synoptic.includes('Stage group'));
});

test('example case: diagnosis line', () => {
  assert.equal(run().diagnosis, [
    'ASCENDING COLON, right hemicolectomy',
    '- INVASIVE ADENOCARCINOMA, moderately differentiated (G2), invading through the',
    '  muscularis propria into the pericolic tissue',
    '- lymphovascular invasion present; 2 of 22 lymph nodes involved; margins clear',
    '- pT3 pN1b (AJCC 8th edition), stage IIIB (if cM0)',
    '- MMR proficient'
  ].join('\n'));
  assert.deepEqual(run().issues, []);
});

test('no narrative paragraph: the synoptic opens with its first section and the schema has no synopticOnly option', () => {
  const out = run();
  assert.equal(out.microscopy, out.synoptic);
  assert.match(out.synoptic, /^Specimen and tumour\n- Procedure: Right hemicolectomy\n/);
  assert.match(out.diagnosis, /^ASCENDING COLON/);
  assert.ok(!out.report.includes('Sections of the tumour'));
  assert.ok(!schema.options.some((o) => o.id === 'synopticOnly'));
  assert.ok(!('synopticOnly' in schema.example.options));
});

test('rectal tumour: rectal elements, circumferential margin wording and the CRM flag', () => {
  const v = { tumourSite: 'Rectum', procedure: 'Low anterior resection', rectalLocation: 'Entirely below', mesorectum: 'Complete', radialMarginMm: '1', specimenLength: '18' };
  const out = run(v);
  assert.equal(out.specimens, 'Rectum, low anterior resection');
  assert.match(out.macro, /^Received in formalin is a low anterior resection specimen comprising a segment of colon and rectum measuring 18 cm in length/);
  assert.match(out.macro, /The mesorectum is complete\./);
  assert.match(flat(out.diagnosis), /invading through the muscularis propria into the perirectal \/ mesorectal tissue; lymphovascular invasion present; 2 of 22 lymph nodes involved; margins clear;/);
  assert.ok(out.synoptic.includes('- Tumour location relative to anterior peritoneal reflection: Entirely below'));
  assert.ok(out.synoptic.includes('- Macroscopic intactness of mesorectum: Complete'));
  assert.ok(out.synoptic.includes('- Circumferential (radial) margin: Uninvolved by invasive carcinoma (1 mm)'));
  assert.ok(snippets(v).includes('colon_resection_crm_close'));
  assert.ok(issues(v).some((i) => /Circumferential margin clearance is 1 mm or less/.test(i)));
  assert.ok(!snippets({ tumourSite: 'Rectum', radialMarginMm: '3' }).includes('colon_resection_crm_close'));
});

test('pT1 with submucosal depth and extent; polyp origin; budding derived from count', () => {
  const out = run({ tumourExtension: 'Invades submucosa', submucosalDepth: 'Exact depth (mm)', submucosalDepthMm: '1.5', submucosalExtent: 'Upper third (sm1)', nodesPositive: '0', buddingCount: '12', buddingScore: 'Low score (Bd1, 0-4 buds)', ene: 'Not applicable', largestDepositMm: '' });
  assert.match(row(out, 'Tumour histology'), /^Sections show an invasive moderately differentiated adenocarcinoma arising in a tubulovillous adenoma, forming irregular glands/);
  assert.equal(row(out, 'Tumour budding (ITBCC 2016)'), 'High score (Bd3, 10 or more buds)');
  assert.equal(row(out, 'Hotspot count'), '12 buds in 1 field');
  assert.ok(out.synoptic.includes('- Depth of submucosal invasion (pT1): 1.5 mm'));
  assert.ok(out.synoptic.includes('- Extent of submucosal invasion (pT1): Upper third (sm1)'));
  assert.ok(out.synoptic.includes('- pTNM: pT1 pN0\n  - Stage group (if cM0): I'));
  assert.match(flat(out.diagnosis), /invading the submucosa; lymphovascular invasion present; no lymph node metastasis \(0\/22\); margins clear; pT1 pN0 \(AJCC 8th edition\), stage I \(if cM0\)/);
  assert.ok(out.issues.some((i) => /budding score does not match the count/.test(i.message)));
});

test('pT4b with adjacent structure, tumour deposits (N1c), liver metastasis (M1a)', () => {
  const out = run({ tumourExtension: 'Directly invades or adheres to adjacent structure(s)', adjacentStructure: 'urinary bladder wall', nodesPositive: '0', tumourDeposits: 'Present', tumourDepositsCount: '2', distantMetastasis: ['Liver'], metastasisDetail: 'segment 6 wedge', ene: 'Not applicable', largestDepositMm: '' });
  assert.equal(row(out, 'Tumour extension'), 'Directly invades or adheres to adjacent structure(s) (urinary bladder wall)');
  assert.ok(out.synoptic.includes('- Tumour deposits: Present (2)'));
  assert.ok(out.synoptic.includes('- Distant metastasis: Liver (segment 6 wedge)'));
  assert.ok(out.synoptic.includes('- pTNM: pT4b pN1c pM1a\n  - Stage group: IVA'));
  assert.match(flat(out.diagnosis), /directly invading the urinary bladder wall; lymphovascular invasion present; tumour deposits present; no lymph node metastasis \(0\/22\); margins clear; metastatic carcinoma in liver; pT4b pN1c pM1a \(AJCC 8th edition\), stage IVA; MMR proficient$/);
});

test('post-treatment cases carry the y prefix and the modified Ryan sentence; complete response wording', () => {
  const partial = run({ treatmentEffect: 'Partial response (score 2): residual cancer with evident tumour regression' });
  assert.equal(row(partial, 'Treatment effect (modified Ryan scheme, 2005)'), 'Partial response (score 2): residual cancer with evident tumour regression');
  assert.ok(partial.synoptic.includes('- pTNM: ypT3 ypN1b'));
  const cr = run({ treatmentEffect: 'Complete response (score 0): no viable cancer cells', tumourExtension: 'No evidence of primary tumour', nodesPositive: '0', ene: 'Not applicable', largestDepositMm: '', lvi: 'Not identified', mmr: 'Not performed', additionalFindings: [] });
  assert.equal(row(cr, 'Tumour histology'), 'Sections of the ascending colon show fibrosis and mucin pools consistent with treated tumour bed; no residual invasive carcinoma is identified.');
  assert.match(flat(cr.diagnosis), /; NO RESIDUAL CARCINOMA \(complete pathological response\); no lymph node metastasis \(0\/22\); margins clear; ypT0 ypN0 \(AJCC 8th edition\)$/);
});

test('involved margins are named in the Margins section and the diagnosis', () => {
  const out = run({ radialMargin: 'Involved by invasive carcinoma', distalMargin: 'Cannot be assessed' });
  assert.ok(out.synoptic.includes('Margins\n- Proximal margin: Uninvolved by invasive carcinoma (90 mm)\n- Distal margin: Cannot be assessed\n- Radial or mesenteric margin: Involved by invasive carcinoma'));
  assert.match(flat(out.diagnosis), /radial margin involved;/);
  assert.ok(!out.diagnosis.includes('margins clear'));
});

test('validation: required elements, node arithmetic, few nodes, override reason', () => {
  assert.ok(issues({ nodesExamined: '' }).includes('error: Number of regional lymph nodes examined is required (enter 0 if none found).'));
  assert.ok(issues({ nodesPositive: '30' }).includes('error: Involved lymph nodes exceed the number examined.'));
  assert.ok(issues({ apicalPositive: '1', apicalExamined: '0' }).includes('error: Apical nodes involved exceed the apical nodes examined.'));
  assert.ok(issues({ nodesExamined: '8', nodesPositive: '1', apicalExamined: '0' }).some((i) => /Only 8 lymph nodes examined/.test(i)));
  assert.ok(snippets({ nodesExamined: '8' }).includes('colon_resection_few_nodes'));
  assert.ok(!snippets({ nodesExamined: '8', treatmentEffect: 'Partial response (score 2): residual cancer with evident tumour regression' }).includes('colon_resection_few_nodes'));
  assert.ok(issues({ tumourExtension: '' }).includes('error: Tumour extension is required to assign pT.'));
  assert.ok(issues({ proximalMargin: '' }).includes('error: Proximal margin status is required.'));
  assert.ok(issues({ proximalMarginMm: '' }).includes('warn: Proximal margin: record the clearance in mm.'));
  assert.ok(issues({ tnmOverride: 'pT2 pN1a' }).includes('error: Give a reason for overriding the derived pTNM.'));
  assert.ok(issues({ tnmOverride: 'stage 3', tnmOverrideReason: 'x' }).some((i) => /could not be parsed/.test(i)));
  assert.deepEqual(issues({ tnmOverride: 'pT2 pN1a', tnmOverrideReason: 'deeper invasion on levels' }), []);
  assert.ok(issues({ mmr: 'Not performed' }).includes('warn: Mismatch repair immunohistochemistry not recorded (recommended for all colorectal carcinomas).'));
  assert.ok(issues({ tumourSite: 'Rectum' }).some((i) => /intactness of the mesorectum/.test(i)));
});

test('override prints the derived stage beside the pathologist stage and activates the comment', () => {
  const out = run({ tnmOverride: 'pT2 pN1a', tnmOverrideReason: 'deeper invasion on levels' });
  assert.equal(row(out, 'pTNM'), 'pT2 pN1a [pathologist override; derived T3/N1b - deeper invasion on levels]');
  assert.ok(out.synoptic.includes('  - Stage group (if cM0): IIIA'));
  // Every line holds 80 columns except the tumour histology paragraph, which is prose on one line.
  // The tumour histology paragraph is prose on one line; every other line holds 80 columns.
  assert.equal(out.synoptic.split('\n').filter((l) => l.length > 80 && !/^ {2}(?!- )/.test(l)).length, 0);
  assert.match(flat(out.diagnosis), /pT2 pN1a \(AJCC 8th edition\), stage IIIA \(if cM0\)/);
  assert.ok(snippets({ tnmOverride: 'pT2 pN1a' }).includes('colon_resection_override'));
});

test('MMR patterns: snippets, Additional findings element and diagnosis wording', () => {
  assert.ok(snippets({ mmr: 'Loss of MLH1 and PMS2' }).includes('colon_resection_mlh1_loss'));
  assert.ok(snippets({ mmr: 'Loss of MSH2 and MSH6' }).includes('colon_resection_lynch'));
  assert.ok(snippets({ mmr: 'Isolated loss of PMS2' }).includes('colon_resection_lynch'));
  assert.ok(snippets({ mmr: 'Pending' }).includes('colon_resection_mmr_pending'));
  assert.deepEqual(snippets({}), []);
  assert.match(run({ mmr: 'Loss of MLH1 and PMS2' }).diagnosis, /MMR deficient \(loss of MLH1 \/ PMS2\)$/);
  const pending = parseSynoptic(run({ mmr: 'Pending' }).synoptic).find((r) => r.label === 'Mismatch repair immunohistochemistry');
  assert.deepEqual([pending.section, pending.value], ['Additional findings', 'Pending']);
  assert.ok(!run({ mmr: 'Not performed' }).synoptic.includes('Mismatch repair'));
});

test('non-invasive lesions: high grade dysplasia and intramucosal carcinoma stage as pTis', () => {
  const hgd = run({ tumourExtension: 'No invasion (high grade dysplasia)', nodesPositive: '0', ene: 'Not applicable', largestDepositMm: '', lvi: 'Not identified', mmr: 'Not performed' });
  assert.equal(row(hgd, 'Tumour histology'), 'Sections of the ascending colon show high grade dysplasia within a tubulovillous adenoma; the lesion shows high grade dysplasia without invasion and there is no submucosal invasion.');
  assert.match(flat(hgd.diagnosis), /; HIGH GRADE DYSPLASIA, no invasive carcinoma; no lymph node metastasis \(0\/22\); margins clear; pTis pN0 \(AJCC 8th edition\), stage 0 \(if cM0\)$/);
  const imc = run({ tumourExtension: 'Invades lamina propria / muscularis mucosae (intramucosal carcinoma)', nodesPositive: '0', ene: 'Not applicable', largestDepositMm: '', mmr: 'Not performed' });
  assert.match(flat(imc.diagnosis), /INTRAMUCOSAL ADENOCARCINOMA, no submucosal invasion;.*pTis pN0/);
});

test('multi-part case: each part gets its own synoptic block with a labelled heading', () => {
  const out = run({}, {}, [{ tumourSite: 'Sigmoid colon', procedure: 'Sigmoid colectomy', tumourExtension: 'Invades muscularis propria', nodesExamined: '14', nodesPositive: '0', apicalExamined: '', apicalPositive: '', ene: 'Not applicable', largestDepositMm: '' }]);
  assert.match(out.specimens, /^\(A\) Ascending colon, right hemicolectomy\n\(B\) Sigmoid colon, sigmoid colectomy$/);
  assert.match(out.synoptic, /^\(A\) Ascending colon, right hemicolectomy\nSpecimen and tumour\n- Procedure: Right hemicolectomy/);
  assert.match(out.synoptic, /\n\n\(B\) Sigmoid colon, sigmoid colectomy\nSpecimen and tumour\n- Procedure: Sigmoid colectomy/);
  assert.match(out.synoptic, /\(B\)[\s\S]*- pTNM: pT2 pN0\n  - Stage group \(if cM0\): I/);
  assert.match(out.diagnosis, /^\(A\) ASCENDING COLON, right hemicolectomy\n- INVASIVE[\s\S]*\n\n\(B\) SIGMOID COLON, sigmoid colectomy\n- INVASIVE ADENOCARCINOMA/);
});

test('mixed case with a colonic polyp part prints one microscopy block: polyp paragraph then the resection synoptic', () => {
  const cs = {
    schemaId: 'colon_resection', caseTitle: '', options: { ...schema.example.options }, snippets: {}, comment: '',
    parts: [
      { label: 'A', templateId: 'colonic_polyp', values: { ...reg.colonic_polyp.schema.example.parts[0].values } },
      { label: 'B', templateId: 'colon_resection', values: { ...exampleValues } }
    ]
  };
  const out = generateCase({ colonic_polyp: reg.colonic_polyp, colon_resection: reg.colon_resection }, cs);
  assert.match(out.synoptic, /^\(B\) Ascending colon, right hemicolectomy\nSpecimen and tumour\n- Procedure/);
  assert.ok(!out.synoptic.includes('(A)'));
  // One block in case order: the polyp paragraph, then the resection synoptic under the combined heading.
  assert.match(out.microscopy, /^\(A\) /);
  assert.ok(out.microscopy.includes('\n\n(B) Ascending colon, right hemicolectomy\nSpecimen and tumour'));
  assert.ok(out.microscopy.indexOf('(A)') < out.microscopy.indexOf('(B)'));
  assert.equal(out.microscopyHeading, 'MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT');
  const doc = buildDocText({ ...cs, meta: { accession: 'S26-1' } }, out);
  assert.equal((doc.match(/MICROSCOPIC EXAMINATION/g) || []).length, 1, 'one microscopy section in the Doc');
  assert.ok(doc.includes('MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:\n(A) '));
  const full = generateCase({ colonic_polyp: reg.colonic_polyp, colon_resection: reg.colon_resection }, { ...cs, options: { ...cs.options, includeHeader: true } }).report;
  assert.equal((full.match(/MICROSCOPIC EXAMINATION/g) || []).length, 1, 'one heading in the full report');
  assert.equal(out.issues.length, 0);
});

test('Google Doc text carries the combined MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT section only when present', () => {
  const cs = { ...createCase(schema), meta: { accession: 'S26-1234', status: 'draft' }, parts: [{ label: 'A', values: { ...exampleValues } }] };
  const out = generateCase({ colon_resection: reg.colon_resection }, cs);
  const doc = buildDocText(cs, out);
  assert.ok(doc.includes('\nMICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:\nSpecimen and tumour\n- Procedure: Right hemicolectomy'));
  assert.ok(!doc.includes('\nMICROSCOPIC EXAMINATION:\n'), 'no empty narrative section for a synoptic-only case');
  assert.ok(doc.indexOf('SYNOPTIC REPORT:') > doc.indexOf('BLOCK KEY:') && doc.indexOf('SYNOPTIC REPORT:') < doc.indexOf('DIAGNOSIS:'));
  const gb = reg.gallbladder;
  const gbOut = generate(gb.schema, gb.generator, { schemaId: 'gallbladder', ...gb.schema.example });
  assert.ok(!buildDocText({ ...createCase(gb.schema), meta: {} }, gbOut).includes('SYNOPTIC REPORT'));
});

test('numeric showIf: extranodal extension only appears once a node is positive', async () => {
  const { isVisible } = await import('../src/engine.js');
  const ene = schema.fields.find((f) => f.id === 'ene');
  assert.equal(isVisible(ene, { nodesPositive: '0' }), false);
  assert.equal(isVisible(ene, { nodesPositive: '' }), false);
  assert.equal(isVisible(ene, { nodesPositive: '2' }), true);
});
