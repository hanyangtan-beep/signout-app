// Guided intake: the funnel opens the right branch, asks the right questions in the right order,
// and raises the right cautions. No DOM here - the card in src/app.js only renders what these
// functions return.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAll } from '../src/registry.js';
import { wizardSteps, wizardSupported, visibleSteps, nextStep, wizardProgress, cautions, atDefault } from '../src/cnswizard.js';
import { pathwayChecks } from '../generators/cns_layers.js';

const registry = await loadAll();
const tumour = registry.cns_tumour.schema;
const biopsy = registry.cns_biopsy.schema;
const defaults = (s) => Object.fromEntries(s.fields.filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));

const base = (extra = {}) => ({ ...defaults(tumour), ...extra });
const steps = wizardSteps(tumour);
const idOf = (v, skipped = []) => nextStep(steps, v, skipped)?.id || null;

test('the two CNS templates support the guided intake and the others do not', () => {
  assert.ok(wizardSupported(tumour));
  assert.ok(wizardSupported(biopsy));
  assert.equal(wizardSupported(registry.gastric_biopsy?.schema || { fields: [] }), false);
});

test('every step names a field the schema actually carries', () => {
  for (const s of wizardSteps(tumour)) assert.ok(tumour.fields.some((f) => f.id === s.field), `${s.id} -> ${s.field}`);
  for (const s of wizardSteps(biopsy)) assert.ok(biopsy.fields.some((f) => f.id === s.field), `${s.id} -> ${s.field}`);
});

test('the funnel opens on age and morphology before any molecular question', () => {
  assert.equal(idOf(base()), 'age');
  assert.equal(idOf(base({ patientAge: 62 })), 'family');
  // A field still sitting on its schema default is asked rather than assumed, so the family step
  // only clears once the family has actually been chosen.
  assert.equal(idOf(base({ patientAge: 62, dxFamily: 'Adult-type diffuse gliomas' })), 'family');
  // The ependymal family has a working-entity question of its own now, in the same place the
  // adult-glioma family has one, so it comes before the site rather than the site coming first.
  assert.equal(idOf(base({ patientAge: 62, dxFamily: 'Ependymal tumours' })), 'epEntity');
  assert.equal(idOf(base({ patientAge: 62, dxFamily: 'Adult-type diffuse gliomas', dxAdult: 'Glioblastoma, IDH-wildtype' }), ['family']), 'site');
});

test('the IDH branch decides which panel is asked for', () => {
  const start = base({
    patientAge: 38, dxFamily: 'Adult-type diffuse gliomas', dxAdult: 'Astrocytoma, IDH-mutant',
    site: 'Frontal lobe', ihc: ['GFAP positive'], molStatus: 'Reported',
    idh1R132H: 'Positive', idhBranch: 'IDH-mutant', features: ['Nuclear atypia'],
  });
  const shown = visibleSteps(steps, start).map((s) => s.id);
  assert.ok(shown.includes('codel'));
  assert.ok(shown.includes('pdgfra'));
  assert.ok(!shown.includes('tert'), 'the wildtype panel stays shut on the mutant branch');

  const wt = { ...start, dxAdult: 'Glioblastoma, IDH-wildtype', idh1R132H: 'Negative', idhSeq: 'No mutation detected', idhBranch: 'IDH-wildtype' };
  const shownWt = visibleSteps(steps, wt).map((s) => s.id);
  assert.ok(shownWt.includes('tert') && shownWt.includes('egfr') && shownWt.includes('chr710'));
  assert.ok(!shownWt.includes('cdkn2a') && !shownWt.includes('pdgfra'));
});

test('sequencing is only asked for once the stain comes back negative', () => {
  const v = base({ patientAge: 45, dxFamily: 'Adult-type diffuse gliomas', dxAdult: 'Glioblastoma, IDH-wildtype', molStatus: 'Reported' });
  assert.ok(!visibleSteps(steps, { ...v, idh1R132H: 'Positive' }).some((s) => s.id === 'idhSeq'));
  assert.ok(visibleSteps(steps, { ...v, idh1R132H: 'Negative' }).some((s) => s.id === 'idhSeq'));
});

test('a skipped step is not asked again and the progress count reflects the branch', () => {
  const v = base({ patientAge: 70 });
  assert.equal(idOf(v, ['family']), 'entity');
  const p = wizardProgress(steps, v, []);
  assert.equal(p.answered, 1);
  assert.ok(p.total >= 2 && p.total < steps.length, 'only the applicable steps are counted');
});

test('a default value is offered for confirmation rather than assumed', () => {
  const family = steps.find((s) => s.id === 'family');
  assert.ok(atDefault(family, base()), 'the family field arrives on a default');
  assert.ok(!atDefault(family, base({ dxFamily: 'Ependymal tumours' })));
});

test('the cautions carry the age rules and the copy-number caveats', () => {
  const seq = steps.find((s) => s.id === 'idhSeq');
  assert.match(cautions(seq, base({ patientAge: 40 }))[0], /sequenced/);
  // Over 55 the shortcut past sequencing is conditional on classic glioblastoma histology being
  // recorded, not on the age alone: with nothing recorded the caution must not claim sufficiency.
  assert.match(cautions(seq, base({ patientAge: 70 }))[0], /needs classic glioblastoma histology/);
  const classic = base({
    patientAge: 70, dxFamily: 'Adult-type diffuse gliomas', dxAdult: 'Glioblastoma, IDH-wildtype',
    features: ['Nuclear atypia', 'Microvascular proliferation', 'Necrosis with pseudopalisading'],
  });
  assert.match(cautions(seq, classic)[0], /sufficient/);

  const egfr = steps.find((s) => s.id === 'egfr');
  assert.match(cautions(egfr, base({ patientAge: 32 }))[0], /defines glioblastoma on its own/);
  assert.equal(cautions(egfr, base({ patientAge: 65 })).length, 0);

  const cdkn2a = steps.find((s) => s.id === 'cdkn2a');
  assert.match(cautions(cdkn2a, base())[0], /Hemizygous loss is not a grading criterion/);
});

test('the wizard never writes a diagnosis - the same ground is covered by the panel checks', () => {
  const v = base({
    patientAge: 30, dxFamily: 'Adult-type diffuse gliomas', dxAdult: 'Glioblastoma, IDH-wildtype',
    molStatus: 'Reported', idhBranch: 'IDH-wildtype', idh1R132H: 'Negative', idhSeq: 'No mutation detected',
    egfr: 'Amplified', features: [],
  });
  const out = [];
  pathwayChecks(v, (m, f) => out.push({ level: 'warn', message: m, field: f }), (l, m, f) => out.push({ level: l, message: m, field: f }));
  assert.ok(out.some((c) => c.level === 'warn' && /under 40/.test(c.message)), 'the solitary EGFR caveat is a panel warning too');
  assert.ok(out.every((c) => c.level === 'warn' || c.level === 'info'), 'pathway checks never raise an error that blocks the report');
});

test('the guided intake asks ATRX before 1p/19q on the IDH-mutant branch', () => {
  const v = base({
    dxFamily: 'Adult-type diffuse gliomas', dxAdult: 'Astrocytoma, IDH-mutant',
    patientAge: 38, site: 'Frontal lobe', idh1R132H: 'Positive',
    molStatus: 'Reported', idhBranch: 'IDH-mutant',
  });
  const ids = visibleSteps(steps, v).map((s) => s.id);
  assert.ok(ids.indexOf('atrx') < ids.indexOf('codel'), `order was ${ids.join(' ')}`);
});

test('ATRX loss drops the 1p/19q question, and it comes back for an oligodendroglioma', () => {
  const v = base({
    dxFamily: 'Adult-type diffuse gliomas', dxAdult: 'Astrocytoma, IDH-mutant',
    patientAge: 38, site: 'Frontal lobe', idh1R132H: 'Positive',
    molStatus: 'Reported', idhBranch: 'IDH-mutant', atrx: 'Loss of nuclear expression',
  });
  assert.ok(!visibleSteps(steps, v).some((s) => s.id === 'codel'));
  const oligo = { ...v, dxAdult: 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted' };
  assert.ok(visibleSteps(steps, oligo).some((s) => s.id === 'codel'));
});

// The same family-leak class of fault as the ependymoma one: a circumscribed astrocytic glioma must
// not be pulled onto the IDH branch by whatever `dxAdult` and `idhBranch` happen to be holding.
test('a pilocytic astrocytoma is asked the MAPK questions and none of the IDH branch questions', () => {
  const v = base({
    dxFamily: 'Circumscribed astrocytic gliomas', dxCircumscribed: 'Pilocytic astrocytoma',
    patientAge: 9, site: 'Cerebellum', molStatus: 'Not performed',
  });
  const ids = visibleSteps(steps, v).map((s) => s.id);
  for (const id of ['idh1R132H', 'idhSeq', 'idhBranch', 'atrx', 'codel', 'tert', 'egfr', 'chr710', 'h3k27me3']) {
    assert.ok(!ids.includes(id), `${id} asked of a pilocytic astrocytoma: ${ids.join(' ')}`);
  }
  assert.deepEqual(ids, ['age', 'family', 'caEntity', 'site', 'basicIhc', 'molStatus', 'methylation', 'grade', 'histClass']);
});

test('the MAPK questions open once molecular results are recorded', () => {
  const v = base({
    dxFamily: 'Circumscribed astrocytic gliomas', dxCircumscribed: 'Pilocytic astrocytoma',
    patientAge: 9, site: 'Cerebellum', molStatus: 'Reported',
  });
  const ids = visibleSteps(steps, v).map((s) => s.id);
  assert.deepEqual(ids, ['age', 'family', 'caEntity', 'site', 'basicIhc', 'molStatus', 'brafFusion', 'braf', 'mapkOther', 'methylation', 'grade', 'histClass']);
  assert.ok(!ids.includes('cdkn2a'), `CDKN2A asked of a pilocytic astrocytoma: ${ids.join(' ')}`);
});

test('a pleomorphic xanthoastrocytoma adds CDKN2A/B to the MAPK questions', () => {
  const v = base({
    dxFamily: 'Circumscribed astrocytic gliomas', dxCircumscribed: 'Pleomorphic xanthoastrocytoma',
    patientAge: 24, site: 'Temporal lobe', molStatus: 'Reported',
  });
  const ids = visibleSteps(steps, v).map((s) => s.id);
  assert.ok(ids.includes('cdkn2a'), `CDKN2A missing: ${ids.join(' ')}`);
  assert.ok(ids.includes('braf'));
});

test('a circumscribed astrocytic glioma with no MAPK alteration recorded is noted, not passed', () => {
  const v = base({
    dxFamily: 'Circumscribed astrocytic gliomas', dxCircumscribed: 'Pilocytic astrocytoma',
    patientAge: 9, site: 'Cerebellum', molStatus: 'Reported',
  });
  const notes = [];
  pathwayChecks(v, (m) => notes.push(m), (_l, m) => notes.push(m));
  assert.ok(notes.some((m) => /No MAPK pathway alteration is recorded/.test(m)), notes.join(' | '));
  // And the glioblastoma-branch prompts must not fire on it.
  assert.ok(!notes.some((m) => /mismatch-repair|MLH1/i.test(m)), notes.join(' | '));
});

test('an ependymoma is asked K27me3 without ever reaching the IDH branch', () => {
  const v = base({
    dxFamily: 'Ependymal tumours', dxEpendymal: 'Posterior fossa ependymoma, group PFA',
    patientAge: 7, site: 'Cerebellum',
  });
  const ids = visibleSteps(steps, v).map((s) => s.id);
  assert.ok(!ids.includes('idh1R132H'), `IDH asked: ${ids.join(' ')}`);
  assert.ok(!ids.includes('idhBranch'));
  assert.ok(ids.includes('h3k27me3'), `K27me3 missing: ${ids.join(' ')}`);
  assert.ok(ids.includes('ezhip'));
});

test('an ependymoma is asked none of the glioblastoma molecular questions', () => {
  const v = base({
    dxFamily: 'Ependymal tumours', dxEpendymal: 'Posterior fossa ependymoma, group PFA',
    patientAge: 7, site: 'Cerebellum',
  });
  const ids = visibleSteps(steps, v).map((s) => s.id);
  // molStatus is now asked of this family: every Layer 4 ependymal field - ZFTA, YAP1, MYCN, the
  // surrogate panel, copy number - is gated on it, so leaving it out left them permanently hidden.
  // The IDH branch questions and the glioblastoma molecular set still cannot reach the family.
  for (const id of ['idh1R132H', 'idhSeq', 'idhBranch', 'tert', 'egfr', 'chr710']) {
    assert.ok(!ids.includes(id), `${id} asked of an ependymoma: ${ids.join(' ')}`);
  }
  assert.deepEqual(ids, ['age', 'family', 'epEntity', 'site', 'basicIhc', 'molStatus', 'h3k27me3', 'ezhip', 'epCnv', 'methylation', 'grade', 'histClass']);
});

test('the guided intake asks the molecular question of the compartment it is in', () => {
  const ep = (extra) => visibleSteps(steps, base({ dxFamily: 'Ependymal tumours', molStatus: 'Reported', ...extra })).map((s) => s.id);

  const st = ep({ dxEpendymal: 'Supratentorial ependymoma', site: 'Frontal lobe', patientAge: 30 });
  assert.ok(st.includes('zfta') && st.includes('yap1'), `supratentorial set: ${st.join(' ')}`);
  assert.ok(!st.includes('ezhip') && !st.includes('h3k27me3'), `posterior fossa question asked supratentorially: ${st.join(' ')}`);
  assert.ok(!st.includes('mycn'));

  const sp = ep({ dxEpendymal: 'Spinal ependymoma', site: 'Spinal cord', patientAge: 40 });
  assert.ok(sp.includes('mycn'), `MYCN missing: ${sp.join(' ')}`);
  assert.ok(!sp.includes('zfta') && !sp.includes('yap1') && !sp.includes('ezhip'));

  const pf = ep({ dxEpendymal: 'Posterior fossa ependymoma', site: 'Fourth ventricle', patientAge: 6 });
  assert.ok(pf.includes('h3k27me3') && pf.includes('ezhip'), `posterior fossa set: ${pf.join(' ')}`);
  assert.ok(!pf.includes('zfta') && !pf.includes('mycn'));

  // YAP1 is asked only once ZFTA has come back without a fusion, and drops away when one is found.
  const found = ep({ dxEpendymal: 'Supratentorial ependymoma', site: 'Frontal lobe', zfta: 'ZFTA::RELA fusion detected' });
  assert.ok(!found.includes('yap1'), 'YAP1 still asked after a ZFTA fusion was found');

  // The two morphologically defined types are not asked a compartment molecular question at all.
  const mpe = ep({ dxEpendymal: 'Myxopapillary ependymoma', site: 'Cauda equina' });
  for (const id of ['zfta', 'yap1', 'mycn', 'h3k27me3', 'ezhip', 'epCnv']) {
    assert.ok(!mpe.includes(id), `${id} asked of a myxopapillary ependymoma: ${mpe.join(' ')}`);
  }
});

test('the cautions on the compartment questions name what the answer does not settle', () => {
  const v = base({
    dxFamily: 'Ependymal tumours', dxEpendymal: 'Supratentorial ependymoma', site: 'Frontal lobe',
    molStatus: 'Reported',
  });
  const say = (id, values = v) => cautions(steps.find((s) => s.id === id), values).join(' ');
  assert.match(say('zfta'), /L1CAM and nuclear p65/);
  assert.match(say('zfta', { ...v, site: 'Cerebellum', dxEpendymal: 'Posterior fossa ependymoma' }), /reported NEC/);
  assert.match(say('yap1'), /L1CAM|p65/);
  assert.match(say('epIhc'), /L1CAM|surrogate/i);
  assert.match(say('mycn', { ...v, site: 'Spinal cord', dxEpendymal: 'Spinal ependymoma' }), /FISH|amplif/i);
});
