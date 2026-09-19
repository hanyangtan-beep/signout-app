// The CNS pathway drawer: the right branch opens, the nodes light in order, and an outstanding node
// names the test that would settle it. No DOM here - the drawer in src/app.js only renders what
// these functions return, and it renders them read-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAll } from '../src/registry.js';
import { pathway, pathwaySupported, pathwayChart } from '../src/cnspathway.js';

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

test('with no ATRX and no 1p/19q result, ATRX is asked before 1p/19q and both are outstanding', () => {
  const p = pathway(base({
    ...GLIOMA, patientAge: 38, site: 'Frontal lobe',
    dxAdult: 'Astrocytoma, IDH-mutant',
    idh1R132H: 'Positive', molStatus: 'Reported', idhBranch: 'IDH-mutant',
  }));
  assert.equal(p.branch, 'A');
  assert.deepEqual(stageIds(p), ['funnel', 'a1', 'a2']);
  const a1 = p.stages.find((s) => s.id === 'a1').nodes.map((n) => n.id);
  assert.ok(a1.indexOf('atrx') < a1.indexOf('codel'), 'ATRX comes before 1p/19q');
  const codel = find(p, 'codel');
  assert.equal(codel.state, 'outstanding');
  assert.match(codel.test, /1p\/19q/);
  assert.equal(find(p, 'atrx').state, 'outstanding');
});

test('ATRX loss settles astrocytoma, so 1p/19q stops being asked for', () => {
  const p = pathway(base({
    ...GLIOMA, patientAge: 38, site: 'Frontal lobe',
    dxAdult: 'Astrocytoma, IDH-mutant',
    idh1R132H: 'Positive', molStatus: 'Reported', idhBranch: 'IDH-mutant',
    atrx: 'Loss of nuclear expression',
  }));
  const codel = find(p, 'codel');
  assert.equal(codel.state, 'na');
  assert.equal(codel.test, undefined);
  assert.match(codel.note, /without 1p\/19q testing/);
  assert.equal(find(p, 'atrx').state, 'satisfied');
  assert.doesNotMatch(p.nextTest || '', /1p\/19q/);
});

test('a named oligodendroglioma still wants 1p/19q whatever the stains show', () => {
  const p = pathway(base({
    ...GLIOMA, patientAge: 45, site: 'Frontal lobe',
    dxAdult: 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted',
    idh1R132H: 'Positive', molStatus: 'Reported', idhBranch: 'IDH-mutant',
    atrx: 'Loss of nuclear expression',
  }));
  assert.equal(find(p, 'codel').state, 'outstanding');
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

// ---------- the flowchart layout ----------
//
// pathwayChart() is the geometry for the full-width overlay: the funnel as a left-to-right chain, the
// fork where the case leaves it, a stub for the branch not taken, and the branch stages as boxes on a
// second rail. It is derived from pathway() alone and adds no knowledge of its own.

const WT = {
  ...GLIOMA, patientAge: 62, dxAdult: 'Glioblastoma, IDH-wildtype',
  molStatus: 'Reported', idhBranch: 'IDH-wildtype',
};

test('the chain carries one box per funnel node, in order and left to right', () => {
  const p = pathway(base(WT));
  const c = pathwayChart(p);
  const funnel = p.stages[0];
  assert.equal(c.funnel.id, 'funnel');
  assert.equal(c.funnel.nodes.length, funnel.nodes.length);
  assert.deepEqual(c.funnel.nodes.map((n) => n.node.label), funnel.nodes.map((n) => n.label));
  for (let k = 1; k < c.funnel.nodes.length; k += 1) {
    const prev = c.funnel.nodes[k - 1];
    const box = c.funnel.nodes[k];
    assert.equal(box.y, prev.y, 'the chain stays on one row');
    assert.ok(box.x >= prev.x + prev.w, 'boxes do not overlap');
  }
});

test('the branch stages sit on a lower rail, one box per stage, and do not overlap', () => {
  const p = pathway(base(WT));
  const c = pathwayChart(p);
  assert.deepEqual(c.stages.map((s) => s.id), p.stages.slice(1).map((s) => s.id));
  assert.deepEqual(c.stages.map((s) => s.label), p.stages.slice(1).map((s) => s.label));
  for (const s of c.stages) {
    assert.ok(s.y > c.funnel.nodes[0].y + c.funnel.nodes[0].h, 'below the funnel');
    assert.equal(s.nodes.length, p.stages.find((x) => x.id === s.id).nodes.length);
    for (const n of s.nodes) {
      assert.ok(n.x >= s.x && n.x + n.w <= s.x + s.w, 'a criterion row stays inside its box');
      assert.ok(n.y >= s.y && n.y + n.h <= s.y + s.h);
    }
  }
  for (let k = 1; k < c.stages.length; k += 1) {
    assert.ok(c.stages[k].x >= c.stages[k - 1].x + c.stages[k - 1].w, 'stage boxes do not overlap');
  }
});

test('everything drawn fits the box', () => {
  const p = pathway(base(WT));
  const c = pathwayChart(p);
  const boxes = [...c.funnel.nodes, ...c.stages, ...c.stages.flatMap((s) => s.nodes), c.fork, c.stub];
  for (const b of boxes) {
    assert.ok(b.x >= 0 && b.x + b.w <= c.width, `${b.w} wide at ${b.x} is inside ${c.width}`);
    assert.ok(b.y >= 0 && b.y + b.h <= c.height);
  }
});

test('the fork names the branch taken and the stub names the one that was not', () => {
  const c = pathwayChart(pathway(base(WT)));
  assert.equal(c.fork.label, 'IDH-wildtype', 'the fork names the branch, not the drawer title');
  assert.equal(c.fork.state, 'satisfied');
  assert.equal(c.stub.label, 'branch A, not this case');
  assert.equal(c.links.some((l) => l.kind === 'stub'), true, 'the stub is reached by a dashed line');
});

test('before the branch point there is a fork, no stub and no stage boxes', () => {
  const p = pathway(base({ ...GLIOMA, patientAge: 50 }));
  assert.equal(p.branch, 'pending');
  const c = pathwayChart(p);
  assert.equal(c.fork.label, 'Branch point');
  assert.equal(c.fork.state, 'outstanding');
  assert.equal(c.stub, null);
  assert.deepEqual(c.stages, []);
});

test('a case off the IDH funnel forks to its own branch with no stub', () => {
  const p = pathway(base({ dxFamily: 'Meningioma', mgSubtype: 'Meningothelial meningioma' }));
  const c = pathwayChart(p);
  assert.equal(c.fork.label, p.title, 'a non-glioma branch has no prefix to strip');
  assert.equal(c.stub, null);
});

test('the basic panel follows the family, so a meningioma is not asked for the glial markers', () => {
  const glial = find(pathway(base({ ...GLIOMA, patientAge: 44 })), 'ihc');
  assert.match(glial.detail, /GFAP, OLIG2/);
  assert.match(glial.test, /GFAP and OLIG2/);

  const mg = find(pathway(base({ dxFamily: 'Meningioma', mgSubtype: 'Meningothelial meningioma' })), 'ihc');
  assert.match(mg.detail, /EMA, SSTR2A/);
  assert.match(mg.test, /EMA and SSTR2A/);
  assert.doesNotMatch(`${mg.detail} ${mg.note} ${mg.test}`, /GFAP|OLIG2|IDH-mutant glioma/);

  const ep = find(pathway(base({ dxFamily: 'Ependymal tumours', dxEpendymal: 'Posterior fossa ependymoma, group PFA' })), 'ihc');
  assert.match(ep.detail, /GFAP, EMA/);
  assert.doesNotMatch(ep.note, /IDH-mutant glioma/);
});

test('the any-one tag marks the alternative-criteria stages and nothing else', () => {
  const gbm = pathwayChart(pathway(base(WT)));
  assert.equal(gbm.stages.find((s) => s.id === 'b1').anyOf, true);

  const astro = pathwayChart(pathway(base({
    ...GLIOMA, patientAge: 44, dxAdult: 'Astrocytoma, IDH-mutant',
    molStatus: 'Reported', idhBranch: 'IDH-mutant', mitoses: 4,
  })));
  assert.equal(astro.stages.find((s) => s.id === 'a2').anyOf, true, 'the grade 4 criteria are alternatives');
  assert.equal(astro.stages.find((s) => s.id === 'a1').anyOf, false);
});

test('a stage box is outstanding when any criterion in it is', () => {
  const p = pathway(base({
    ...GLIOMA, patientAge: 44, dxAdult: 'Astrocytoma, IDH-mutant',
    molStatus: 'Reported', idhBranch: 'IDH-mutant',
  }));
  const c = pathwayChart(p);
  for (const s of c.stages) {
    const st = p.stages.find((x) => x.id === s.id);
    const expected = st.nodes.some((n) => n.state === 'outstanding')
      ? 'outstanding'
      : (st.nodes.some((n) => n.state === 'satisfied') ? 'satisfied' : 'na');
    assert.equal(s.state, expected);
    assert.equal(s.counts.satisfied + s.counts.outstanding + s.counts.na, st.nodes.length);
  }
});

test('the chart invents nothing: every box carries a node from the pathway', () => {
  const p = pathway(base({ ...WT, patientAge: 32, egfr: 'Amplified' }));
  const c = pathwayChart(p);
  const known = new Set(p.stages.flatMap((s) => s.nodes.map((n) => `${s.id}:${n.id}`)));
  for (const e of [...c.funnel.nodes, ...c.stages.flatMap((s) => s.nodes)]) {
    assert.equal(known.has(e.key), true, `${e.key} comes from a stage node`);
    assert.equal(typeof e.node.label, 'string');
    assert.notEqual(e.node.label, '');
  }
});

test('the chart mutates nothing', () => {
  const v = base(WT);
  const p = pathway(v);
  const before = JSON.stringify([v, p]);
  pathwayChart(p);
  assert.equal(JSON.stringify([v, p]), before);
});

test('an empty pathway draws an empty chart rather than throwing', () => {
  const c = pathwayChart({ stages: [] });
  assert.equal(c.funnel, null);
  assert.equal(c.fork, null);
  assert.deepEqual(c.stages, []);
  assert.deepEqual(c.links, []);
});

test('an ependymoma leaves the funnel at IDH rather than being asked for it', () => {
  const p = pathway(base({
    dxFamily: 'Ependymal tumours', dxEpendymal: 'Posterior fossa ependymoma, group PFA',
    patientAge: 7, site: 'Cerebellum',
  }));
  assert.equal(p.branch, 'ependymoma');
  const funnel = p.stages.find((s) => s.id === 'funnel').nodes.map((n) => n.id);
  assert.deepEqual(funnel, ['context', 'morphology', 'ihc', 'idh']);
  const idh = find(p, 'idh');
  assert.equal(idh.state, 'na');
  assert.match(idh.detail, /site and the molecular group/);
  assert.doesNotMatch(p.nextTest || '', /IDH/);
});
