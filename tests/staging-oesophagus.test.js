// src/staging/oesophagus.js — AJCC 8th oesophagus pTNM boundary tests against the Rice et al.
// 2017 tables: adenocarcinoma and squamous groups, the T3N0 squamous zone split, and the
// shared ypTNM table (identical for both histologies, no grade / zone).
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM, stageLine } from '../src/staging/index.js';

const base = {
  histType: 'Adenocarcinoma',
  grade: 'G2, moderately differentiated',
  tumourSite: 'Distal oesophagus (low thoracic oesophagus)',
  tumourExtension: 'Tumour invades muscularis propria',
  nodesExamined: '20', nodesInvolved: '0',
  treatmentEffect: 'No known presurgical therapy',
  distantMets: ['Not identified']
};

test('extension pick-list maps to pT categories', () => {
  assert.equal(deriveTNM({ ...base, tumourExtension: 'No evidence of primary tumour' }, 'oesophagus').T, 'T0');
  assert.equal(deriveTNM({ ...base, tumourExtension: 'High-grade dysplasia / carcinoma in situ' }, 'oesophagus').T, 'Tis');
  assert.equal(deriveTNM({ ...base, tumourExtension: 'Tumour invades lamina propria' }, 'oesophagus').T, 'T1a');
  assert.equal(deriveTNM({ ...base, tumourExtension: 'Tumour invades muscularis mucosae' }, 'oesophagus').T, 'T1a');
  assert.equal(deriveTNM({ ...base, tumourExtension: 'Tumour invades the submucosa' }, 'oesophagus').T, 'T1b');
  assert.equal(deriveTNM({ ...base, tumourExtension: 'Tumour invades muscularis propria' }, 'oesophagus').T, 'T2');
  assert.equal(deriveTNM({ ...base, tumourExtension: 'Tumour invades adventitia' }, 'oesophagus').T, 'T3');
  assert.equal(deriveTNM({ ...base, tumourExtension: 'Tumour invades the serosa (visceral peritoneum)' }, 'oesophagus').T, 'T4a');
  assert.equal(deriveTNM({ ...base, tumourExtension: 'Tumour directly invades adjacent structures (specify)', extensionDetail: 'pleura and pericardium' }, 'oesophagus').T, 'T4a');
  assert.equal(deriveTNM({ ...base, tumourExtension: 'Tumour directly invades adjacent structures (specify)', extensionDetail: 'thoracic aorta' }, 'oesophagus').T, 'T4b');
});

test('direct invasion without a named structure cannot choose between T4a and T4b', () => {
  const r = deriveTNM({ ...base, tumourExtension: 'Tumour directly invades adjacent structures (specify)', extensionDetail: '' }, 'oesophagus');
  assert.equal(r.T, 'TX');
  assert.match(r.notes.join(' '), /separate T4a from T4b/);
});

test('pN bins and NX precedences', () => {
  const n = (x, inv) => deriveTNM({ ...base, nodesExamined: String(x), nodesInvolved: String(inv) }, 'oesophagus');
  assert.equal(n(15, 0).N, 'N0');
  assert.equal(n(15, 2).N, 'N1');
  assert.equal(n(15, 3).N, 'N2');
  assert.equal(n(15, 6).N, 'N2');
  assert.equal(n(15, 7).N, 'N3');
  assert.equal(deriveTNM({ ...base, nodesExamined: '0', nodesInvolved: '' }, 'oesophagus').N, 'NX');
  assert.equal(deriveTNM({ ...base, nodesExamined: '12', nodesInvolved: '' }, 'oesophagus').N, 'NX');
});

test('adenocarcinoma pathological groups by grade at pT1-2 N0', () => {
  const g = (ext, grade) => deriveTNM({ ...base, tumourExtension: ext, grade }, 'oesophagus').stage;
  assert.equal(g('Tumour invades lamina propria', 'G1, well differentiated'), 'IA');
  assert.equal(g('Tumour invades lamina propria', 'GX, cannot be assessed'), 'IA');
  assert.equal(g('Tumour invades lamina propria', 'G2, moderately differentiated'), 'IB');
  assert.equal(g('Tumour invades lamina propria', 'G3, poorly differentiated / undifferentiated'), 'IC');
  assert.equal(g('Tumour invades the submucosa', 'G1, well differentiated'), 'IB');
  assert.equal(g('Tumour invades the submucosa', 'G3, poorly differentiated / undifferentiated'), 'IB');
  assert.equal(g('Tumour invades muscularis propria', 'G1, well differentiated'), 'IC');
  assert.equal(g('Tumour invades muscularis propria', 'G2, moderately differentiated'), 'IC');
  assert.equal(g('Tumour invades muscularis propria', 'G3, poorly differentiated / undifferentiated'), 'IIA');
  assert.equal(g('Tumour invades muscularis propria', 'GX, cannot be assessed'), 'IIA');
});

test('adenocarcinoma: node-positive and advanced groups', () => {
  const st = (ext, inv, over = {}) => deriveTNM({ ...base, tumourExtension: ext, nodesInvolved: String(inv), ...over }, 'oesophagus').stage;
  assert.equal(st('Tumour invades lamina propria', 2), 'IIB');
  assert.equal(st('Tumour invades adventitia', 0), 'IIB');
  assert.equal(st('Tumour invades the submucosa', 3), 'IIIA');
  assert.equal(st('Tumour invades muscularis propria', 1), 'IIIA');
  assert.equal(st('Tumour invades muscularis propria', 4), 'IIIB');
  assert.equal(st('Tumour invades adventitia', 2), 'IIIB');
  assert.equal(st('Tumour invades adventitia', 5), 'IIIB');
  assert.equal(st('Tumour invades the serosa (visceral peritoneum)', 1), 'IIIB');
  assert.equal(st('Tumour invades the serosa (visceral peritoneum)', 3), 'IVA');
  assert.equal(st('Tumour directly invades adjacent structures (specify)', 2, { extensionDetail: 'vertebral body' }), 'IVA');
  assert.equal(st('Tumour invades the submucosa', 8), 'IVA');
});

test('squamous pathological groups: grade at early stages and the T3 N0 zone split', () => {
  const s = (ext, grade, site = 'Mid oesophagus, middle thoracic oesophagus', inv = 0, over = {}) =>
    deriveTNM({ ...base, histType: 'Squamous cell carcinoma', tumourSite: site, tumourExtension: ext, grade, nodesInvolved: String(inv), ...over }, 'oesophagus').stage;
  assert.equal(s('Tumour invades lamina propria', 'G1, well differentiated'), 'IA');
  assert.equal(s('Tumour invades lamina propria', 'GX, cannot be assessed'), 'IA');
  assert.equal(s('Tumour invades lamina propria', 'G2, moderately differentiated'), 'IB');
  assert.equal(s('Tumour invades the submucosa', 'G1, well differentiated'), 'IB');
  assert.equal(s('Tumour invades muscularis propria', 'G1, well differentiated'), 'IB');
  assert.equal(s('Tumour invades muscularis propria', 'G2, moderately differentiated'), 'IIA');
  // pT3 N0 zone split: lower oesophagus any grade -> IIA; upper/mid G1 -> IIA; upper/mid G2-3 / unknown -> IIB.
  assert.equal(s('Tumour invades adventitia', 'G2, moderately differentiated', 'Distal oesophagus (low thoracic oesophagus)'), 'IIA');
  assert.equal(s('Tumour invades adventitia', 'G1, well differentiated', 'Mid oesophagus, middle thoracic oesophagus'), 'IIA');
  assert.equal(s('Tumour invades adventitia', 'G2, moderately differentiated', 'Cervical (proximal) oesophagus'), 'IIB');
  assert.equal(s('Tumour invades adventitia', 'GX, cannot be assessed', 'Mid oesophagus, middle thoracic oesophagus'), 'IIB');
  assert.equal(s('Tumour invades adventitia', 'G2, moderately differentiated', 'Mid oesophagus, not otherwise specified'), 'IIB');
  assert.equal(s('Tumour invades lamina propria', 'G1, well differentiated', 'Mid oesophagus, middle thoracic oesophagus', 1), 'IIB');
  assert.equal(s('Tumour invades muscularis propria', 'G2, moderately differentiated', 'Mid oesophagus, middle thoracic oesophagus', 2), 'IIIA');
  assert.equal(s('Tumour invades adventitia', 'G2, moderately differentiated', 'Mid oesophagus, middle thoracic oesophagus', 2), 'IIIB');
  assert.equal(s('Tumour directly invades adjacent structures (specify)', 'G1, well differentiated', 'Mid oesophagus, middle thoracic oesophagus', 1, { extensionDetail: 'azygos vein' }), 'IIIB');
});

test('ypTNM table: shared for both histologies, grade ignored', () => {
  const y = (ext, inv, histType = 'Adenocarcinoma') => deriveTNM({
    ...base, histType, tumourExtension: ext, nodesInvolved: String(inv),
    treatmentEffect: 'Present, with residual cancer showing evident tumour regression but more than single cells or rare small groups of cancer cells (partial response, score 2)'
  }, 'oesophagus');
  assert.equal(y('Tumour invades muscularis mucosae', 0).stage, 'I');
  assert.equal(y('Tumour invades muscularis mucosae', 0, 'Squamous cell carcinoma').stage, 'I');
  assert.equal(y('Tumour invades adventitia', 0).stage, 'II');
  assert.equal(y('Tumour invades muscularis propria', 1).stage, 'IIIA');
  assert.equal(y('Tumour invades adventitia', 2).stage, 'IIIB');
  assert.equal(y('Tumour invades the submucosa', 5).stage, 'IIIB');
  assert.equal(y('Tumour invades adventitia', 8).stage, 'IVA');
  assert.ok(y('Tumour invades adventitia', 0).tnm.startsWith('ypT3'));
  // Complete response after therapy
  const cr = deriveTNM({ ...base, tumourExtension: 'No evidence of primary tumour', nodesInvolved: '0', treatmentEffect: 'Present, with no viable cancer cells (complete response, score 0)' }, 'oesophagus');
  assert.equal(cr.tnm, 'ypT0 ypN0');
  assert.equal(cr.stage, 'I');
});

test('M1 overrides to IVB; stage line carries (if cM0) only without M1', () => {
  const r = deriveTNM({ ...base, distantMets: ['Liver'] }, 'oesophagus');
  assert.equal(r.stage, 'IVB');
  assert.equal(r.tnm, 'pT2 pN0 pM1');
  assert.equal(stageLine(r), 'Stage group: IVB');
  assert.equal(stageLine(deriveTNM(base, 'oesophagus')), 'Stage group (if cM0): IC');
});

test('override and descriptors round-trip', () => {
  const r = deriveTNM({ ...base, multiplePrimaries: true, tnmOverride: 'ypT1a pN0', tnmOverrideReason: 'treated elsewhere' }, 'oesophagus');
  assert.ok(r.overridden);
  assert.match(r.notes.join(' '), /treated elsewhere/);
});
