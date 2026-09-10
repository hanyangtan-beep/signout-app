// Colon and rectum carcinoma resection — first synoptic (hybrid) template (Phase 5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, generateCase, snippetsFor, createCase, BLOCK_ORDER, HEADERS } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { buildDocText } from '../src/docformat.js';
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
  assert.deepEqual(BLOCK_ORDER, ['specimens', 'macro', 'blockKey', 'intraop', 'microscopy', 'synoptic', 'diagnosis', 'comment']);
  assert.equal(HEADERS.synoptic, 'SYNOPTIC REPORT:');
  const r = run({}, { includeHeader: true }).report;
  assert.ok(r.indexOf('MICROSCOPIC EXAMINATION:') < r.indexOf('SYNOPTIC REPORT:') && r.indexOf('SYNOPTIC REPORT:') < r.indexOf('DIAGNOSIS:'));
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

test('example case: narrative microscopy', () => {
  assert.equal(run().microscopy, 'Sections of the tumour in the ascending colon show an invasive moderately differentiated adenocarcinoma arising in a tubulovillous adenoma. The tumour invades through the muscularis propria into the pericolic tissue. Small vessel lymphovascular invasion is present. Perineural invasion is not identified. Tumour budding is low (Bd1), with 3 buds in the hotspot field. No tumour deposits are identified. The proximal, distal and radial margins are clear of carcinoma (radial margin clearance 15 mm). A total of 22 regional lymph nodes are identified including 1 apical node, 2 of which contain metastatic carcinoma (2/22), without extranodal extension; the largest metastatic deposit measures 6 mm. The background bowel shows diverticulosis. Immunohistochemistry shows retained nuclear expression of MLH1, PMS2, MSH2 and MSH6 in the tumour cells (mismatch repair proficient).');
});

test('example case: synoptic block mirrors the QMH colon elements in order with derived pTNM and stage', () => {
  const lines = run().synoptic.split('\n');
  const labels = lines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2).split(':')[0]);
  assert.deepEqual(labels, [
    'Procedure', 'Tumour site', 'Tumour size', 'Macroscopic tumour perforation', 'Histologic type (WHO 2019)', 'Histologic grade',
    'Multiple primary tumours', 'Tumour extension', 'Lymphatic and / or vascular invasion', 'Perineural invasion', 'Tumour budding (ITBCC 2016)',
    'Type of polyp in which invasive carcinoma arose', 'Tumour deposits', 'Treatment effect (modified Ryan scheme, 2005)', 'Proximal margin',
    'Distal margin', 'Radial or mesenteric margin', 'Regional lymph nodes', 'Distant metastasis', 'Pathological stage classification (AJCC 8th edition)',
    'Additional pathological findings', 'Mismatch repair immunohistochemistry'
  ]);
  assert.ok(lines.includes('- Pathological stage classification (AJCC 8th edition): pT3 pN1b'));
  assert.ok(lines.includes('  - Stage group (if cM0): IIIB'));
  assert.ok(lines.includes('- Regional lymph nodes: 22 examined (1 apical); 2 involved (0 apical); extranodal extension not identified; largest metastatic deposit 6 mm'));
  assert.ok(lines.includes('- Tumour budding (ITBCC 2016): Low score (Bd1, 0-4 buds); 3 buds in 1 hotspot field'));
  assert.ok(!run({}, { stageGroup: false }).synoptic.includes('Stage group'));
});

test('example case: diagnosis line', () => {
  assert.equal(run().diagnosis, 'ASCENDING COLON, right hemicolectomy - INVASIVE ADENOCARCINOMA, moderately differentiated (G2), invading through the muscularis propria into the pericolic tissue; lymphovascular invasion present; 2 of 22 lymph nodes involved; margins clear; pT3 pN1b (AJCC 8th edition), stage IIIB (if cM0); MMR proficient');
  assert.deepEqual(run().issues, []);
});

test('synoptic-only mode drops the narrative paragraph but keeps the synoptic and diagnosis', () => {
  const out = run({}, { synopticOnly: true });
  assert.equal(out.microscopy, '');
  assert.match(out.synoptic, /^- Procedure: Right hemicolectomy/);
  assert.match(out.diagnosis, /^ASCENDING COLON/);
  assert.ok(!out.report.includes('Sections of the tumour'));
});

test('rectal tumour: rectal elements, circumferential margin wording and the CRM flag', () => {
  const v = { tumourSite: 'Rectum', procedure: 'Low anterior resection', rectalLocation: 'Entirely below', mesorectum: 'Complete', radialMarginMm: '1', specimenLength: '18' };
  const out = run(v);
  assert.equal(out.specimens, 'Rectum, low anterior resection');
  assert.match(out.macro, /^Received in formalin is a low anterior resection specimen comprising a segment of colon and rectum measuring 18 cm in length/);
  assert.match(out.macro, /The mesorectum is complete\./);
  assert.match(out.microscopy, /into the perirectal \/ mesorectal tissue\./);
  assert.match(out.microscopy, /The proximal, distal and circumferential margins are clear of carcinoma \(circumferential margin clearance 1 mm\)\./);
  assert.ok(out.synoptic.includes('- Tumour location relative to anterior peritoneal reflection: Entirely below'));
  assert.ok(out.synoptic.includes('- Macroscopic intactness of mesorectum: Complete'));
  assert.ok(out.synoptic.includes('- Circumferential (radial) margin: Uninvolved by invasive carcinoma (1 mm)'));
  assert.ok(snippets(v).includes('colon_resection_crm_close'));
  assert.ok(issues(v).some((i) => /Circumferential margin clearance is 1 mm or less/.test(i)));
  assert.ok(!snippets({ tumourSite: 'Rectum', radialMarginMm: '3' }).includes('colon_resection_crm_close'));
});

test('pT1 with submucosal depth and extent; polyp origin; budding derived from count', () => {
  const out = run({ tumourExtension: 'Invades submucosa', submucosalDepth: 'Exact depth (mm)', submucosalDepthMm: '1.5', submucosalExtent: 'Upper third (sm1)', nodesPositive: '0', buddingCount: '12', buddingScore: 'Low score (Bd1, 0-4 buds)', ene: 'Not applicable', largestDepositMm: '' });
  assert.match(out.microscopy, /The tumour invades the submucosa to a depth of 1\.5 mm, into the upper third \(sm1\)\./);
  assert.match(out.microscopy, /Tumour budding is high \(Bd3\), with 12 buds in the hotspot field\./);
  assert.ok(out.synoptic.includes('- Depth of submucosal invasion (pT1): 1.5 mm'));
  assert.ok(out.synoptic.includes('- Extent of submucosal invasion (pT1): Upper third (sm1)'));
  assert.ok(out.synoptic.includes('- Pathological stage classification (AJCC 8th edition): pT1 pN0'));
  assert.ok(out.synoptic.includes('  - Stage group (if cM0): I'));
  assert.match(out.diagnosis, /invading the submucosa; lymphovascular invasion present; no lymph node metastasis \(0\/22\); margins clear; pT1 pN0 \(AJCC 8th edition\), stage I \(if cM0\)/);
  assert.ok(out.issues.some((i) => /budding score does not match the count/.test(i.message)));
});

test('pT4b with adjacent structure, tumour deposits (N1c), liver metastasis (M1a)', () => {
  const out = run({ tumourExtension: 'Directly invades or adheres to adjacent structure(s)', adjacentStructure: 'urinary bladder wall', nodesPositive: '0', tumourDeposits: 'Present', tumourDepositsCount: '2', distantMetastasis: ['Liver'], metastasisDetail: 'segment 6 wedge', ene: 'Not applicable', largestDepositMm: '' });
  assert.match(out.microscopy, /The tumour directly invades the urinary bladder wall\./);
  assert.match(out.microscopy, /2 tumour deposits are present in the pericolic fat\./);
  assert.match(out.microscopy, /Metastatic carcinoma is present in the liver \(segment 6 wedge\)\./);
  assert.ok(out.synoptic.includes('- Tumour extension: Directly invades or adheres to adjacent structure(s) (urinary bladder wall)'));
  assert.ok(out.synoptic.includes('- Tumour deposits: Present (2)'));
  assert.ok(out.synoptic.includes('- Distant metastasis: Liver (segment 6 wedge)'));
  assert.ok(out.synoptic.includes('- Pathological stage classification (AJCC 8th edition): pT4b pN1c pM1a'));
  assert.ok(out.synoptic.includes('  - Stage group: IVA'));
  assert.match(out.diagnosis, /tumour deposits present; no lymph node metastasis \(0\/22\); margins clear; metastatic carcinoma in liver; pT4b pN1c pM1a \(AJCC 8th edition\), stage IVA; MMR proficient$/);
});

test('post-treatment cases carry the y prefix and the modified Ryan sentence; complete response wording', () => {
  const partial = run({ treatmentEffect: 'Partial response (score 2): residual cancer with evident tumour regression' });
  assert.match(partial.microscopy, /Treatment effect is present with residual carcinoma showing evident regression \(partial response, modified Ryan score 2\)\./);
  assert.ok(partial.synoptic.includes('- Pathological stage classification (AJCC 8th edition): ypT3 ypN1b'));
  const cr = run({ treatmentEffect: 'Complete response (score 0): no viable cancer cells', tumourExtension: 'No evidence of primary tumour', nodesPositive: '0', ene: 'Not applicable', largestDepositMm: '', lvi: 'Not identified', mmr: 'Not performed', additionalFindings: [] });
  assert.match(cr.microscopy, /^Sections of the ascending colon show fibrosis and mucin pools consistent with treated tumour bed; no residual invasive carcinoma is identified\. There is a complete pathological response/);
  assert.match(cr.diagnosis, /- NO RESIDUAL CARCINOMA \(complete pathological response\); no lymph node metastasis \(0\/22\); margins clear; ypT0 ypN0 \(AJCC 8th edition\)$/);
});

test('involved margins are named in the narrative and the diagnosis', () => {
  const out = run({ radialMargin: 'Involved by invasive carcinoma', distalMargin: 'Cannot be assessed' });
  assert.match(out.microscopy, /The proximal margin is clear of carcinoma \(proximal margin clearance 90 mm\); the radial margin is involved by carcinoma; the distal margin cannot be assessed\./);
  assert.match(out.diagnosis, /radial margin involved;/);
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
  assert.ok(out.synoptic.includes('- Pathological stage classification (AJCC 8th edition): pT2 pN1a [pathologist override; derived T3/N1b - deeper invasion on levels]'));
  assert.ok(out.synoptic.includes('  - Stage group (if cM0): IIIA'));
  assert.match(out.diagnosis, /pT2 pN1a \(AJCC 8th edition\), stage IIIA \(if cM0\)/);
  assert.ok(snippets({ tnmOverride: 'pT2 pN1a' }).includes('colon_resection_override'));
});

test('MMR patterns: snippets, narrative and diagnosis wording', () => {
  assert.ok(snippets({ mmr: 'Loss of MLH1 and PMS2' }).includes('colon_resection_mlh1_loss'));
  assert.ok(snippets({ mmr: 'Loss of MSH2 and MSH6' }).includes('colon_resection_lynch'));
  assert.ok(snippets({ mmr: 'Isolated loss of PMS2' }).includes('colon_resection_lynch'));
  assert.ok(snippets({ mmr: 'Pending' }).includes('colon_resection_mmr_pending'));
  assert.deepEqual(snippets({}), []);
  assert.match(run({ mmr: 'Loss of MLH1 and PMS2' }).diagnosis, /MMR deficient \(loss of MLH1 \/ PMS2\)$/);
  assert.match(run({ mmr: 'Pending' }).microscopy, /Mismatch repair immunohistochemistry is pending\.$/);
  assert.ok(!run({ mmr: 'Not performed' }).synoptic.includes('Mismatch repair'));
});

test('non-invasive lesions: high grade dysplasia and intramucosal carcinoma stage as pTis', () => {
  const hgd = run({ tumourExtension: 'No invasion (high grade dysplasia)', nodesPositive: '0', ene: 'Not applicable', largestDepositMm: '', lvi: 'Not identified', mmr: 'Not performed' });
  assert.match(hgd.microscopy, /^Sections of the ascending colon show high grade dysplasia within a tubulovillous adenoma; the lesion shows high grade dysplasia without invasion and there is no submucosal invasion\./);
  assert.match(hgd.diagnosis, /- HIGH GRADE DYSPLASIA, no invasive carcinoma; no lymph node metastasis \(0\/22\); margins clear; pTis pN0 \(AJCC 8th edition\), stage 0 \(if cM0\)$/);
  const imc = run({ tumourExtension: 'Invades lamina propria / muscularis mucosae (intramucosal carcinoma)', nodesPositive: '0', ene: 'Not applicable', largestDepositMm: '', mmr: 'Not performed' });
  assert.match(imc.diagnosis, /INTRAMUCOSAL ADENOCARCINOMA, no submucosal invasion;.*pTis pN0/);
});

test('multi-part case: each part gets its own synoptic block with a labelled heading', () => {
  const out = run({}, {}, [{ tumourSite: 'Sigmoid colon', procedure: 'Sigmoid colectomy', tumourExtension: 'Invades muscularis propria', nodesExamined: '14', nodesPositive: '0', apicalExamined: '', apicalPositive: '', ene: 'Not applicable', largestDepositMm: '' }]);
  assert.match(out.specimens, /^\(A\) Ascending colon, right hemicolectomy\n\(B\) Sigmoid colon, sigmoid colectomy$/);
  assert.match(out.synoptic, /^\(A\) Ascending colon, right hemicolectomy\n- Procedure: Right hemicolectomy/);
  assert.match(out.synoptic, /\n\n\(B\) Sigmoid colon, sigmoid colectomy\n- Procedure: Sigmoid colectomy/);
  assert.match(out.synoptic, /\(B\)[\s\S]*pT2 pN0\n  - Stage group \(if cM0\): I/);
  assert.match(out.diagnosis, /^\(A\) ASCENDING COLON[\s\S]*\n\(B\) SIGMOID COLON, sigmoid colectomy - INVASIVE ADENOCARCINOMA/);
});

test('mixed case with a colonic polyp part keeps the synoptic block for the resection only', () => {
  const cs = {
    schemaId: 'colon_resection', caseTitle: '', options: { ...schema.example.options }, snippets: {}, comment: '',
    parts: [
      { label: 'A', templateId: 'colonic_polyp', values: { ...reg.colonic_polyp.schema.example.parts[0].values } },
      { label: 'B', templateId: 'colon_resection', values: { ...exampleValues } }
    ]
  };
  const out = generateCase({ colonic_polyp: reg.colonic_polyp, colon_resection: reg.colon_resection }, cs);
  assert.match(out.synoptic, /^\(B\) Ascending colon, right hemicolectomy\n- Procedure/);
  assert.ok(!out.synoptic.includes('(A)'));
  assert.equal(out.issues.length, 0);
});

test('Google Doc text carries a SYNOPTIC REPORT section only when present', () => {
  const cs = { ...createCase(schema), meta: { accession: 'S26-1234', status: 'draft' }, parts: [{ label: 'A', values: { ...exampleValues } }] };
  const out = generateCase({ colon_resection: reg.colon_resection }, cs);
  const doc = buildDocText(cs, out);
  assert.ok(doc.includes('\nSYNOPTIC REPORT:\n- Procedure: Right hemicolectomy'));
  assert.ok(doc.indexOf('SYNOPTIC REPORT:') > doc.indexOf('MICROSCOPIC EXAMINATION:') && doc.indexOf('SYNOPTIC REPORT:') < doc.indexOf('DIAGNOSIS:'));
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
