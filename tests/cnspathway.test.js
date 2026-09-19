// The CNS pathway drawer: the right branch opens, the nodes light in order, and an outstanding node
// names the test that would settle it. No DOM here - the drawer in src/app.js only renders what
// these functions return, and it renders them read-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAll } from '../src/registry.js';
import { pathway, pathwaySupported } from '../src/cnspathway.js';

const registry = await loadAll();
const tumour = registry.cns_tumour.schema;
const biopsy = registry.cns_biopsy.schema;
const defaults = (s) => Object.fromEntries(s.fields.filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));

/**
 * A part as it stands before anything has been looked at. The schema ships the common glioblastoma
 * answers as defaults, which is right for the form and wrong for a test of the pathway, so the
 * findings and the molecular results are cleared and each case sets only what it means to say.
 */
const base = (extra = {}) => ({
  ...defaults(tumour),
  dxFamily: '',
  features: [],
  ihc: [],
  mitoses: '',
  molStatus: 'Sent, result pending',
  idhBranch: '',
  idh1R132H: 'Not performed',
  ...extra,
});

const flat = (p) => p.stages.flatMap((s) => s.nodes);
const find = (p, id) => flat(p).find((n) => n.id === id);
const stageIds = (p) => p.stages.map((s) => s.id);

const GLIOMA = { dxFamily: 'Adult-type diffuse gliomas' };

test('the CNS templates support the pathway and the others do not', () => {
  assert.ok(pathwaySupported(tumour));
  assert.ok(pathwaySupported(biopsy));
  assert.equal(pathwaySupported(registry.gastric_biopsy?.schema || { fields: [] }), false);
});

test('an empty case shows the funnel alone and no branch', () => {
  const p = pathway({});
  assert.equal(p.branch, 'none');
  assert.deepEqual(stageIds(p), ['funnel']);
  assert.equal(find(p, 'morphology').state, 'outstanding');
});

test('a glioma with no IDH result waits at the branch point', () => {
  const p = pathway(base({ ...GLIOMA, dxAdult: 'Astrocytoma, IDH-mutant', molStatus: 'Sent, result pending' }));
  assert.equal(p.branch, 'pending');
  assert.deepEqual(stageIds(p), ['funnel']);
  assert.equal(find(p, 'branch').state, 'outstanding');
});

test('the funnel lights in order as the case is entered step by step', () => {
  const v = base({});
  assert.equal(find(pathway(v), 'morphology').state, 'outstanding');

  Object.assign(v, GLIOMA, { patientAge: 61, site: 'Frontal lobe' });
  let p = pathway(v);
  assert.equal(find(p, 'context').state, 'satisfied');
  assert.equal(find(p, 'morphology').state, 'satisfied');
  assert.equal(find(p, 'r132h').state, 'outstanding');

  v.ihc = ['GFAP positive', 'OLIG2 positive'];
  assert.equal(find(pathway(v), 'ihc').state, 'satisfied');

  v.idh1R132H = 'Positive';
  p = pathway(v);
  assert.equal(find(p, 'r132h').state, 'satisfied');
  // A positive stain settles it: sequencing does not apply.
  assert.equal(find(p, 'seq').state, 'na');
  assert.equal(find(p, 'branch').state, 'outstanding');

  v.molStatus = 'Reported';
  v.idhBranch = 'IDH-mutant';
  assert.equal(find(pathway(v), 'branch').state, 'satisfied');
});

test('a negative R132H stain makes sequencing outstanding, and names it', () => {
  const p = pathway(base({ ...GLIOMA, patientAge: 44, site: 'Frontal lobe', ihc: ['GFAP positive'], idh1R132H: 'Negative' }));
  const seq = find(p, 'seq');
  assert.equal(seq.state, 'outstanding');
  assert.match(seq.note, /At 44/);
  // The next test named is the first outstanding node in funnel order, which here is the sequencing.
  assert.match(p.nextTest, /sequencing/i);
});

test('an IDH-mutant astrocytoma with no 1p/19q result shows that node outstanding and names the test', () => {
  const p = pathway(base({
    ...GLIOMA, patientAge: 38, site: 'Frontal lobe',
    dxAdult: 'Astrocytoma, IDH-mutant',
    idh1R132H: 'Positive', molStatus: 'Reported', idhBranch: 'IDH-mutant',
    atrx: 'Loss of nuclear expression',
  }));
  assert.equal(p.branch, 'A');
  assert.deepEqual(stageIds(p), ['funnel', 'a1', 'a2']);
  const codel = find(p, 'codel');
  assert.equal(codel.state, 'outstanding');
  assert.match(codel.test, /1p\/19q/);
  assert.equal(find(p, 'atrx').state, 'satisfied');
});

test('the astrocytoma grading ladder reads the update 12 criteria', () => {
  const v = base({
    ...GLIOMA, patientAge: 38, dxAdult: 'Astrocytoma, IDH-mutant',
    idh1R132H: 'Positive', molStatus: 'Reported', idhBranch: 'IDH-mutant',
    codel: 'No deletion detected', atrx: 'Loss of nuclear expression',
    mitoses: 1, features: ['Nuclear atypia'],
  });
  let p = pathway(v);
  assert.equal(find(p, 'g4').state, 'outstanding');
  assert.equal(find(p, 'g3').state, 'outstanding');
  assert.equal(find(p, 'ki67').state, 'na');

  v.mitoses = 5;
  assert.equal(find(pathway(v), 'g3').state, 'satisfied');

  // PDGFRA amplification is a grade 4 criterion in its own right.
  v.pdgfra = 'Amplified';
  p = pathway(v);
  assert.equal(find(p, 'g4').state, 'satisfied');
  assert.match(find(p, 'g4').note, /PDGFRA amplification is grade 4 on its own/);

  // Hemizygous loss is not a grading criterion.
  v.cdkn2a = 'Hemizygous loss detected';
  assert.match(find(pathway(v), 'cdkn2a').note, /Hemizygous loss is not a grading criterion/);
});

test('oligodendroglioma gets its own unchanged grading stage', () => {
  const p = pathway(base({
    ...GLIOMA, patientAge: 45, dxAdult: 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted',
    idh1R132H: 'Positive', molStatus: 'Reported', idhBranch: 'IDH-mutant',
    codel: '1p/19q codeletion detected',
  }));
  assert.equal(p.stages.find((s) => s.id === 'a2').label, 'A3 - Grading oligodendroglioma');
  assert.equal(find(p, 'oligograde').state, 'satisfied');
  assert.equal(find(p, 'g4'), undefined);
});

test('a fully entered glioblastoma shows branch B complete', () => {
  const p = pathway(base({
    ...GLIOMA, patientAge: 67, site: 'Temporal lobe',
    dxAdult: 'Glioblastoma, IDH-wildtype',
    ihc: ['GFAP positive', 'OLIG2 positive'],
    features: ['Microvascular proliferation', 'Necrosis with pseudopalisading'],
    mitoses: 12,
    idh1R132H: 'Negative', idhSeq: 'No mutation detected',
    molStatus: 'Reported', idhBranch: 'IDH-wildtype',
    tert: 'Mutation detected (specify)', egfr: 'Amplified',
    chr710: 'Combined gain of chromosome 7 and loss of chromosome 10',
    h3k27me3: 'Retained nuclear expression',
  }));
  assert.equal(p.branch, 'B');
  assert.deepEqual(stageIds(p), ['funnel', 'b1', 'b2']);
  assert.equal(p.nextTest, null, `unexpected outstanding node: ${flat(p).filter((n) => n.state === 'outstanding').map((n) => n.id).join(', ')}`);
  assert.equal(flat(p).some((n) => n.state === 'outstanding'), false);
  assert.equal(find(p, 'oneof').state, 'satisfied');
});

test('the three update 11 caveats fire only when they apply', () => {
  // TERT alone against low-grade histology.
  const tert = pathway(base({
    ...GLIOMA, patientAge: 62, dxAdult: 'Glioblastoma, IDH-wildtype',
    idh1R132H: 'Negative', idhSeq: 'No mutation detected',
    molStatus: 'Reported', idhBranch: 'IDH-wildtype',
    features: ['Nuclear atypia'], mitoses: 1,
    tert: 'Mutation detected (specify)',
  }));
  assert.equal(find(tert, 'tertsole').state, 'outstanding');
  assert.equal(find(tert, 'egfrsole').state, 'na');

  // EGFR alone under 40.
  const egfr = pathway(base({
    ...GLIOMA, patientAge: 32, dxAdult: 'Glioblastoma, IDH-wildtype',
    idh1R132H: 'Negative', idhSeq: 'No mutation detected',
    molStatus: 'Reported', idhBranch: 'IDH-wildtype',
    egfr: 'Amplified',
  }));
  assert.equal(find(egfr, 'egfrsole').state, 'outstanding');
  assert.match(find(egfr, 'egfrsole').detail, /the patient is 32/);

  // +7/-10 alone under 40.
  const c710 = pathway(base({
    ...GLIOMA, patientAge: 29, dxAdult: 'Glioblastoma, IDH-wildtype',
    idh1R132H: 'Negative', idhSeq: 'No mutation detected',
    molStatus: 'Reported', idhBranch: 'IDH-wildtype',
    chr710: 'Combined gain of chromosome 7 and loss of chromosome 10',
  }));
  assert.equal(find(c710, 'c710sole').state, 'outstanding');
  assert.equal(find(c710, 'differential').state, 'outstanding');
});

test('a midline glioma opens H3 K27 assessment at any age', () => {
  const v = base({
    ...GLIOMA, patientAge: 48, site: 'Thalamus',
    dxAdult: 'Glioblastoma, IDH-wildtype',
    idh1R132H: 'Negative', idhSeq: 'No mutation detected',
    molStatus: 'Reported', idhBranch: 'IDH-wildtype',
    features: ['Microvascular proliferation'],
  });
  let p = pathway(v);
  assert.equal(find(p, 'midline').state, 'outstanding');
  assert.match(find(p, 'midline').test, /K27me3/);

  v.h3k27me3 = 'Loss of nuclear expression';
  p = pathway(v);
  assert.equal(find(p, 'midline').state, 'satisfied');
  assert.equal(find(p, 'k27loss').state, 'outstanding');

  v.h3seq = 'H3 K27M detected';
  assert.equal(find(pathway(v), 'k27loss').state, 'satisfied');
});

test('a posterior fossa ependymoma runs the group question', () => {
  const v = base({
    dxFamily: 'Ependymal tumours', dxEpendymal: 'Posterior fossa ependymoma',
    site: 'Fourth ventricle', patientAge: 6,
  });
  let p = pathway(v);
  assert.equal(p.branch, 'ependymoma');
  assert.ok(stageIds(p).includes('ep'));
  assert.equal(find(p, 'site').state, 'satisfied');
  assert.equal(find(p, 'k27me3').state, 'outstanding');

  v.h3k27me3 = 'Retained nuclear expression';
  v.ezhip = 'Negative';
  p = pathway(v);
  assert.equal(find(p, 'nos').state, 'outstanding');
  assert.equal(find(p, 'meth').state, 'outstanding');
});

test('methylation reporting appears once a profile is run, and reads the score against the threshold', () => {
  const v = base({
    ...GLIOMA, patientAge: 30, dxAdult: 'Astrocytoma, IDH-mutant',
    molStatus: 'Reported', idhBranch: 'IDH-mutant',
    methylation: 'Reported', methClass: 'A_IDH_LG', methScore: 0.72, methThreshold: 0.9, methQc: 'Passed',
  });
  const p = pathway(v);
  assert.ok(stageIds(p).includes('meth'));
  const score = find(p, 'score');
  assert.equal(score.state, 'outstanding');
  assert.match(score.note, /cannot carry the class on its own/);
  assert.equal(find(p, 'qc').state, 'satisfied');
});

test('every node carries criterion text, and every outstanding node names a test', () => {
  const cases = [
    {},
    base({ ...GLIOMA, patientAge: 60, idh1R132H: 'Negative' }),
    base({ ...GLIOMA, dxAdult: 'Astrocytoma, IDH-mutant', molStatus: 'Reported', idhBranch: 'IDH-mutant' }),
    base({ ...GLIOMA, dxAdult: 'Glioblastoma, IDH-wildtype', molStatus: 'Reported', idhBranch: 'IDH-wildtype' }),
    base({ dxFamily: 'Ependymal tumours', site: 'Fourth ventricle' }),
  ];
  for (const v of cases) {
    const p = pathway(v);
    for (const n of flat(p)) {
      assert.ok(n.detail && n.detail.length > 4, `${n.id} has no criterion text`);
      assert.ok(['satisfied', 'outstanding', 'na'].includes(n.state), `${n.id} has state ${n.state}`);
      if (n.state === 'outstanding') assert.ok(n.test, `${n.id} is outstanding and names no test`);
    }
    if (p.nextTest) assert.equal(typeof p.nextTest, 'string');
  }
});

test('the pathway is read-only: it never mutates the values it is handed', () => {
  const v = base({
    ...GLIOMA, patientAge: 55, dxAdult: 'Astrocytoma, IDH-mutant',
    molStatus: 'Reported', idhBranch: 'IDH-mutant', mitoses: 4,
  });
  const before = JSON.stringify(v);
  pathway(v);
  assert.equal(JSON.stringify(v), before);
});

test('no node text reads like report prose: the register stays in the panel', () => {
  // The drawer is teaching copy and must never be mistaken for a printed line. Sources are links,
  // not sentences, and nothing here is fed to a generator.
  const p = pathway(base({
    ...GLIOMA, patientAge: 40, dxAdult: 'Glioblastoma, IDH-wildtype',
    molStatus: 'Reported', idhBranch: 'IDH-wildtype',
  }));
  for (const n of flat(p)) {
    assert.equal(/^Sections show/.test(n.detail), false, `${n.id} reads as microscopy prose`);
    if (n.source) assert.match(n.source.url, /^https:\/\//);
  }
});
