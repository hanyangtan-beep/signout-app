import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { generateCase, createPart } from '../src/engine.js';
import { extractLungStation, formatReconciliationForAudit } from '../src/reconcile.js';
import { buildAuditPrompt } from '../src/aiaudit.js';

import lymphNodeGen from '../generators/lymphnode.js';
import peritonealGen from '../generators/peritoneal_nodule.js';
import lungGen from '../generators/lung_carcinoma.js';
import breastGen from '../generators/breast_carcinoma.js';
import colonGen from '../generators/colon_resection.js';
import endometrialGen from '../generators/endometrial_carcinoma.js';
import ovaryGen from '../generators/ovary_ft_peritoneum.js';
import appendixGen from '../generators/appendix_carcinoma.js';
import gastricGen from '../generators/gastric_carcinoma.js';

const loadSchema = (name) => JSON.parse(readFileSync(resolve(`schemas/${name}.json`), 'utf8'));

const templates = {
  lymph_node: { schema: loadSchema('lymph_node'), generator: lymphNodeGen },
  peritoneal_nodule: { schema: loadSchema('peritoneal_nodule'), generator: peritonealGen },
  lung_carcinoma: { schema: loadSchema('lung_carcinoma'), generator: lungGen },
  breast_carcinoma: { schema: loadSchema('breast_carcinoma'), generator: breastGen },
  colon_resection: { schema: loadSchema('colon_resection'), generator: colonGen },
  endometrial_carcinoma: { schema: loadSchema('endometrial_carcinoma'), generator: endometrialGen },
  ovary_ft_peritoneum: { schema: loadSchema('ovary_ft_peritoneum'), generator: ovaryGen },
  appendix_carcinoma: { schema: loadSchema('appendix_carcinoma'), generator: appendixGen },
  gastric_carcinoma: { schema: loadSchema('gastric_carcinoma'), generator: gastricGen }
};

function makePart(templateId, label, overrides = {}) {
  const base = createPart(templates[templateId].schema, 0);
  return { ...base, label, templateId, values: { ...base.values, ...overrides } };
}

test('extractLungStation parses numeric and named IASLC stations', () => {
  assert.equal(extractLungStation('Station 4R lymph node'), '4R');
  assert.equal(extractLungStation('7 (subcarinal)'), '7');
  assert.equal(extractLungStation('Right station 11'), '11R');
  assert.equal(extractLungStation('Subcarinal lymph node'), 'subcarinal');
  assert.equal(extractLungStation('Lymph node, unspecified'), '');
});

test('lung_carcinoma + multiple lymph_node stations reconciles and syncs to consolidated pN2b', () => {
  const cs = {
    templateId: 'lung_carcinoma',
    options: { printPTNM: true },
    meta: {},
    parts: [
      makePart('lung_carcinoma', 'A', { laterality: 'Right', tumourSizeMm: '25', invasiveSizeMm: '25', nodeStations: '12R: 0/2' }),
      makePart('lymph_node', 'B', { specimenName: 'Station 4R', nodesTotal: '3', result: 'Metastatic carcinoma', positiveNodes: '1', largestDeposit: '6', extranodal: 'Present' }),
      makePart('lymph_node', 'C', { specimenName: 'Station 7', nodesTotal: '4', result: 'Metastatic carcinoma', positiveNodes: '2', largestDeposit: '9' }),
      makePart('lymph_node', 'D', { specimenName: 'Station 11R', nodesTotal: '2', result: 'Negative - reactive' })
    ]
  };

  const out1 = generateCase(templates, cs);
  assert.equal(out1.reconciliation.items.length, 1);
  const item = out1.reconciliation.items[0];
  assert.equal(item.status, 'needs-sync');
  assert.equal(item.totals.pNPreview, 'pN2b');
  assert.ok(item.patch);
  assert.equal(item.patch.fields.nodeStations, '12R: 0/2; 4R: 1/3 (ENE); 7: 2/4; 11R: 0/2');
  assert.equal(item.patch.fields.nodeEne, 'Present');
  assert.equal(item.patch.fields.nodeDepositMm, '9');

  // Apply patch and re-generate: status becomes synced and report prints pN2b
  Object.assign(cs.parts[0].values, item.patch.fields);
  const out2 = generateCase(templates, cs);
  assert.equal(out2.reconciliation.items[0].status, 'synced');
  assert.equal(out2.reconciliation.items[0].patch, null);
  assert.match(out2.synoptic, /pN2b/);
});

test('breast_carcinoma + separate SLN and axillary dissection lymph_node parts reconciles counts and sampling', () => {
  const cs = {
    templateId: 'breast_carcinoma',
    meta: {},
    parts: [
      makePart('breast_carcinoma', 'A', { nodeSampling: 'No nodes submitted' }),
      makePart('lymph_node', 'B', { specimenName: 'Right SLN1', procedure: 'Sentinel lymph node biopsy', criteria: 'Breast', nodesTotal: '2', result: 'Metastatic carcinoma', positiveNodes: '1', metCategory: 'Micrometastasis', largestDeposit: '1.5' }),
      makePart('lymph_node', 'C', { specimenName: 'Right axillary dissection', procedure: 'Dissection', criteria: 'Breast', nodesTotal: '12', result: 'Metastatic carcinoma', positiveNodes: '2', metCategory: 'Macrometastasis', largestDeposit: '8', extranodal: 'Present' })
    ]
  };

  const out1 = generateCase(templates, cs);
  const item = out1.reconciliation.items[0];
  assert.equal(item.status, 'needs-sync');
  assert.equal(item.patch.fields.nodeSampling, 'Sentinel node biopsy and axillary dissection');
  assert.equal(item.patch.fields.nodesExamined, '14');
  assert.equal(item.patch.fields.nodesSentinel, '2');
  assert.equal(item.patch.fields.nodesMacro, '2');
  assert.equal(item.patch.fields.nodesMicro, '1');
  assert.equal(item.patch.fields.nodesItc, '0');
  assert.equal(item.patch.fields.ene, 'Present');
  assert.equal(item.patch.fields.largestNodeMm, '8');

  Object.assign(cs.parts[0].values, item.patch.fields);
  const out2 = generateCase(templates, cs);
  assert.equal(out2.reconciliation.items[0].status, 'synced');
});

test('colon_resection + separate apical lymph_node adds apical count onto mesenteric nodes', () => {
  const cs = {
    templateId: 'colon_resection',
    meta: {},
    parts: [
      makePart('colon_resection', 'A', { nodesExamined: '14', nodesPositive: '1', apicalExamined: '', apicalPositive: '' }),
      makePart('lymph_node', 'B', { specimenName: 'Apical lymph node', nodesTotal: '2', result: 'Metastatic carcinoma', positiveNodes: '1' })
    ]
  };

  const out1 = generateCase(templates, cs);
  const item = out1.reconciliation.items[0];
  assert.equal(item.status, 'needs-sync');
  assert.equal(item.patch.fields.nodesExamined, '16');
  assert.equal(item.patch.fields.nodesPositive, '2');
  assert.equal(item.patch.fields.apicalExamined, '2');
  assert.equal(item.patch.fields.apicalPositive, '1');

  Object.assign(cs.parts[0].values, item.patch.fields);
  const out2 = generateCase(templates, cs);
  assert.equal(out2.reconciliation.items[0].status, 'synced');
});

test('endometrial_carcinoma + pelvic and para-aortic lymph_node parts routes into separate buckets', () => {
  const cs = {
    templateId: 'endometrial_carcinoma',
    meta: {},
    parts: [
      makePart('endometrial_carcinoma', 'A', { pelvicExamined: '0', paExamined: '0' }),
      makePart('lymph_node', 'B', { specimenName: 'Right pelvic sentinel node', procedure: 'Sentinel lymph node biopsy', nodesTotal: '2', result: 'Metastatic carcinoma', positiveNodes: '1', largestDeposit: '4' }),
      makePart('lymph_node', 'C', { specimenName: 'Left pelvic lymph nodes', nodesTotal: '5', result: 'Isolated tumour cells', positiveNodes: '1' }),
      makePart('lymph_node', 'D', { specimenName: 'Para-aortic lymph nodes', nodesTotal: '4', result: 'Negative - reactive' })
    ]
  };

  const out1 = generateCase(templates, cs);
  const item = out1.reconciliation.items[0];
  assert.equal(item.status, 'needs-sync');
  assert.equal(item.patch.fields.pelvicExamined, '7');
  assert.equal(item.patch.fields.pelvicMacro, '1');
  assert.equal(item.patch.fields.pelvicItc, '1');
  assert.equal(item.patch.fields.pelvicSentinel, true);
  assert.equal(item.patch.fields.pelvicLaterality, 'Bilateral');
  assert.equal(item.patch.fields.paExamined, '4');
  assert.equal(item.patch.fields.paMacro, '0');

  Object.assign(cs.parts[0].values, item.patch.fields);
  const out2 = generateCase(templates, cs);
  assert.equal(out2.reconciliation.items[0].status, 'synced');
});

test('generic cancer template (gastric_carcinoma) reconciles nodesExamined / nodesInvolved and feeds audit prompt', () => {
  const cs = {
    templateId: 'gastric_carcinoma',
    meta: {},
    parts: [
      makePart('gastric_carcinoma', 'A', { nodesExamined: '0', nodesInvolved: '0' }),
      makePart('lymph_node', 'B', { specimenName: 'Station 8a', nodesTotal: '5', result: 'Metastatic carcinoma', positiveNodes: '2' })
    ]
  };

  const out = generateCase(templates, cs);
  const item = out.reconciliation.items[0];
  assert.equal(item.status, 'needs-sync');
  assert.equal(item.patch.fields.nodesExamined, '5');
  assert.equal(item.patch.fields.nodesInvolved, '2');

  const summary = formatReconciliationForAudit(out.reconciliation);
  assert.match(summary, /\[needs-sync\]/);
  const req = buildAuditPrompt({
    caseState: cs,
    parts: cs.parts,
    schemaFor: (p) => templates[p.templateId].schema,
    sections: [{ tag: 'DX', text: out.diagnosis }],
    reconciliation: out.reconciliation
  });
  assert.match(req.prompt, /\[MULTI-PART RECONCILIATION \(DETERMINISTIC\)\]/);
  assert.match(req.prompt, /Part B/);
});

test('endometrial_carcinoma + peritoneal_nodule (pelvic + omental) reconciles pelvicPeritoneum and distantMets to pM1 / IVB', () => {
  const cs = {
    templateId: 'endometrial_carcinoma',
    options: { printPTNM: true },
    meta: {},
    parts: [
      makePart('endometrial_carcinoma', 'A', { pelvicPeritoneum: 'Not submitted', distantMets: ['Not identified'] }),
      makePart('peritoneal_nodule', 'B', { site: 'Pouch of Douglas', dx: 'Metastatic carcinoma', carcinomaType: 'Adenocarcinoma' }),
      makePart('peritoneal_nodule', 'C', { site: 'Omentum', dx: 'Metastatic carcinoma', carcinomaType: 'Adenocarcinoma' })
    ]
  };

  const out1 = generateCase(templates, cs);
  const item = out1.reconciliation.items.find((i) => i.kind === 'deposit');
  assert.ok(item);
  assert.equal(item.status, 'needs-sync');
  assert.equal(item.patch.fields.pelvicPeritoneum, 'Present');
  assert.deepEqual(item.patch.fields.distantMets, ['Omentum']);
  assert.match(item.patch.fields.distantDetail, /Part C \(Omentum\)/);

  Object.assign(cs.parts[0].values, item.patch.fields);
  const out2 = generateCase(templates, cs);
  assert.equal(out2.reconciliation.items.find((i) => i.kind === 'deposit').status, 'synced');
  assert.match(out2.synoptic, /pM1/);
});

test('ovary_ft_peritoneum + omental & diaphragmatic peritoneal_nodule updates otherInvolvement', () => {
  const cs = {
    templateId: 'ovary_ft_peritoneum',
    meta: {},
    parts: [
      makePart('ovary_ft_peritoneum', 'A', { otherInvolvement: ['Not identified'] }),
      makePart('peritoneal_nodule', 'B', { site: 'Omentum', dx: 'Metastatic carcinoma', carcinomaType: 'High-grade serous carcinoma' }),
      makePart('peritoneal_nodule', 'C', { site: 'Diaphragm', side: 'Right', dx: 'Metastatic carcinoma', carcinomaType: 'High-grade serous carcinoma' })
    ]
  };

  const out1 = generateCase(templates, cs);
  const item = out1.reconciliation.items.find((i) => i.kind === 'deposit');
  assert.equal(item.status, 'needs-sync');
  assert.deepEqual(item.patch.fields.otherInvolvement, ['Omentum', 'Diaphragm']);
  assert.match(item.patch.fields.extrapelvicSite, /Omentum, Right diaphragm/);

  Object.assign(cs.parts[0].values, item.patch.fields);
  const out2 = generateCase(templates, cs);
  assert.equal(out2.reconciliation.items.find((i) => i.kind === 'deposit').status, 'synced');
});

test('colon_resection + peritoneal_nodule reconciles Peritoneum into distantMetastasis (pM1c)', () => {
  const cs = {
    templateId: 'colon_resection',
    options: { printPTNM: true },
    meta: {},
    parts: [
      makePart('colon_resection', 'A', { distantMetastasis: ['Not applicable'] }),
      makePart('peritoneal_nodule', 'B', { site: 'Omentum', dx: 'Metastatic carcinoma', carcinomaType: 'Adenocarcinoma' })
    ]
  };

  const out1 = generateCase(templates, cs);
  const item = out1.reconciliation.items.find((i) => i.kind === 'deposit');
  assert.equal(item.status, 'needs-sync');
  assert.deepEqual(item.patch.fields.distantMetastasis, ['Peritoneum']);
  assert.match(item.patch.fields.metastasisDetail, /Part B \(Omentum\)/);

  Object.assign(cs.parts[0].values, item.patch.fields);
  const out2 = generateCase(templates, cs);
  assert.equal(out2.reconciliation.items.find((i) => i.kind === 'deposit').status, 'synced');
  assert.match(out2.synoptic, /pM1c/);
});

test('appendix_carcinoma + peritoneal_nodule reconciles intraperitoneal metastasis (pM1b)', () => {
  const cs = {
    templateId: 'appendix_carcinoma',
    meta: {},
    parts: [
      makePart('appendix_carcinoma', 'A', { distantMets: ['Not applicable'] }),
      makePart('peritoneal_nodule', 'B', { site: 'Parietal peritoneum', dx: 'Metastatic carcinoma', carcinomaType: 'Mucinous adenocarcinoma' })
    ]
  };

  const out1 = generateCase(templates, cs);
  const item = out1.reconciliation.items.find((i) => i.kind === 'deposit');
  assert.equal(item.status, 'needs-sync');
  assert.deepEqual(item.patch.fields.distantMets, ['Intraperitoneal metastasis only (including peritoneal mucinous deposits containing tumour cells) (specify)']);

  Object.assign(cs.parts[0].values, item.patch.fields);
  const out2 = generateCase(templates, cs);
  assert.equal(out2.reconciliation.items.find((i) => i.kind === 'deposit').status, 'synced');
});
