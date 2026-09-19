// Glioma and ependymoma resection - generator, grade proposal, Layer 4 branching, golden fixtures.
// Fixtures: tests/fixtures/cns_tumour/*.json (golden; regenerate with --update only after a
// deliberate change, and record the reason in the fixture description and the commit message).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { entity, proposedGrade, grade, gradeValue, organPhrase, molecularBits, integratedDiagnosis } from '../generators/cns_tumour.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'cns_tumour');
const UPDATE = process.argv.includes('--update');
const registry = await loadAll();
const { schema, generator } = registry.cns_tumour;
const EX = schema.example.parts[0].values;
const defaults = (s) => Object.fromEntries(s.fields.filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));

function run(patch = {}, options = {}) {
  const values = { ...defaults(schema), ...EX, ...patch };
  const cs = { schemaId: 'cns_tumour', caseTitle: '', options: { ...schema.example.options, ...options }, parts: [{ label: 'A', values }] };
  return generate(schema, generator, cs);
}
const warns = (out) => out.issues.filter((i) => i.level === 'warn').map((i) => i.message);
const errs = (out) => out.issues.filter((i) => i.level === 'error').map((i) => i.message);
const infos = (out) => out.issues.filter((i) => i.level === 'info').map((i) => i.message);

// Clear the IDH-wildtype example panel when the case is not a glioblastoma.
const NOWT = { h3k27me3: 'Not performed', h3g34w: 'Not performed', h3seq: 'Not performed', braf: 'Not performed', chr710: 'Not performed', egfr: 'Not performed', tert: 'Not performed', tertDetail: '' };

const CASES = [
  ['01-glioblastoma-idh-wildtype', {}],
  ['02-astrocytoma-idh-mutant-cdkn2a', {
    ...NOWT, dxFamily: 'Adult-type diffuse gliomas', dxAdult: 'Astrocytoma, IDH-mutant',
    histClass: 'Anaplastic astrocytoma', specimenName: 'Brain, left temporal tumour', side: 'left', site: 'Temporal lobe',
    features: ['Increased cellularity', 'Nuclear atypia', 'Mitoses', 'Gemistocytic change'], mitoses: '5', ki67: '14',
    ihc: ['GFAP positive', 'OLIG2 positive'], idhBranch: 'IDH-mutant', idh1R132H: 'Positive', idhSeq: 'Mutation detected (specify)', idhSeqDetail: 'IDH1 p.R132H',
    atrx: 'Loss of nuclear expression', p53: 'Abnormal (mutated pattern)', codel: 'No deletion detected',
    cdkn2a: 'Homozygous deletion detected', grossDetails: 'The cut surface is firm and grey-white'
  }],
  ['03-oligodendroglioma-grade-2', {
    ...NOWT, dxAdult: 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted', histClass: 'Oligodendroglioma',
    features: ['Rounded nuclei with perinuclear haloes', 'Delicate branching capillary network', 'Microcalcification'],
    mitoses: '1', ki67: '4', ihc: ['GFAP positive', 'OLIG2 positive'],
    idhBranch: 'IDH-mutant', idh1R132H: 'Positive', atrx: 'Intact nuclear expression',
    p53: 'Normal (wild-type pattern)', codel: '1p/19q codeletion detected', cdkn2a: 'No homozygous deletion detected',
    tert: 'Mutation detected (specify)', tertDetail: 'C228T'
  }],
  ['04-posterior-fossa-ependymoma-pfa', {
    ...NOWT, dxFamily: 'Ependymal tumours', dxEpendymal: 'Posterior fossa ependymoma, group PFA',
    histClass: 'Ependymoma', site: 'Fourth ventricle', side: '', procedure: 'suboccipital craniectomy and excision',
    specimenName: 'Brain, fourth ventricular tumour', extent: 'Gross total resection', integrity: 'Single intact mass',
    features: ['True ependymal rosettes', 'Increased cellularity'], mitoses: '2', ki67: '8',
    ihc: ['GFAP positive', 'EMA positive with dot-like staining'], ihcOther: 'H3 K27 trimethylation shows loss of nuclear expression',
    idhBranch: 'Not applicable', idh1R132H: 'Not performed', molOthers: 'Methylation profiling assigns the tumour to the posterior fossa group A class',
    additionalFindings: ['Adjacent brain parenchyma with reactive gliosis']
  }],
  ['05-diffuse-midline-glioma', {
    dxFamily: 'Paediatric-type diffuse high-grade gliomas', dxPaedHigh: 'Diffuse midline glioma, H3 K27-altered',
    histClass: 'Not applicable', site: 'Thalamus', side: 'left', specimenName: 'Brain, left thalamic tumour',
    procedure: 'craniotomy and debulking', extent: 'Partial resection / debulking',
    features: ['Increased cellularity', 'Nuclear atypia', 'Mitoses', 'Microvascular proliferation'], mitoses: '6', ki67: '30',
    ihc: ['GFAP positive', 'OLIG2 positive'], idhBranch: 'IDH-wildtype', idh1R132H: 'Negative',
    h3k27me3: 'Loss of nuclear expression', h3seq: 'H3 K27M detected', h3g34w: 'Negative',
    braf: 'Not performed', chr710: 'Not performed', egfr: 'Not performed', tert: 'Not performed', tertDetail: ''
  }],
  ['06-pilocytic-astrocytoma', {
    ...NOWT, dxFamily: 'Circumscribed astrocytic gliomas', dxCircumscribed: 'Pilocytic astrocytoma',
    histClass: 'Pilocytic astrocytoma', site: 'Cerebellum', side: 'right', specimenName: 'Brain, right cerebellar tumour',
    procedure: 'suboccipital craniectomy and excision', extent: 'Gross total resection',
    features: ['Biphasic pattern with Rosenthal fibres', 'Eosinophilic granular bodies'], mitoses: '0', ki67: '2',
    ihc: ['GFAP positive', 'OLIG2 positive'], idhBranch: 'IDH-wildtype', idh1R132H: 'Negative',
    molOthers: 'A KIAA1549-BRAF fusion is detected'
  }],
  ['07-molecular-pending-treated', {
    ...NOWT, molStatus: 'Sent, result pending', idh1R132H: 'Not performed', grade: 'Pending',
    dxQualifier: 'Pending further studies', dxQualifierDetail: 'awaiting the molecular panel',
    treatmentEffect: 'Present', necroticPct: '60', ki67: '',
    features: ['Increased cellularity', 'Nuclear atypia', 'Necrosis without pseudopalisading'], mitoses: '2',
    additionalFindings: ['Previous surgical site changes', 'Radiation-induced vascular change']
  }]
];

for (const [name, patch, options] of CASES) {
  test(`cns_tumour fixture ${name}`, () => {
    const out = run(patch, options);
    const file = path.join(FIX, `${name}.json`);
    if (UPDATE || !fs.existsSync(file)) {
      fs.mkdirSync(FIX, { recursive: true });
      fs.writeFileSync(file, `${JSON.stringify({ description: name, report: out.report }, null, 2)}\n`);
    }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report);
  });
}

test('the entity comes from the family field, and free text fills the gaps', () => {
  const v = { ...defaults(schema), ...EX };
  assert.equal(entity(v), 'Glioblastoma, IDH-wildtype');
  assert.equal(entity({ ...v, dxFamily: 'Ependymal tumours', dxEpendymal: 'Subependymoma' }), 'Subependymoma');
  assert.equal(entity({ ...v, dxFamily: 'Other / not listed', dxOther: 'Gliomatosis cerebri pattern' }), 'Gliomatosis cerebri pattern');
  assert.equal(entity({ ...v, dxFamily: 'Pineal tumours', dxPineal: 'Other entity in this family (specify)', dxOther: 'Pineal cyst' }), 'Pineal cyst');
});

test('the grade proposal follows WHO CNS5', () => {
  const v = (p) => ({ ...defaults(schema), features: [], mitoses: '', grade: 'From the findings', ...p });
  assert.equal(proposedGrade(v({ dxAdult: 'Glioblastoma, IDH-wildtype' })), 4);
  assert.equal(proposedGrade(v({ dxAdult: 'Astrocytoma, IDH-mutant' })), 2);
  assert.equal(proposedGrade(v({ dxAdult: 'Astrocytoma, IDH-mutant', features: ['Mitoses'] })), 3);
  assert.equal(proposedGrade(v({ dxAdult: 'Astrocytoma, IDH-mutant', features: ['Microvascular proliferation'] })), 4);
  assert.equal(proposedGrade(v({ dxAdult: 'Astrocytoma, IDH-mutant', cdkn2a: 'Homozygous deletion detected' })), 4);
  assert.equal(proposedGrade(v({ dxAdult: 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted' })), 2);
  assert.equal(proposedGrade(v({ dxAdult: 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted', features: ['Necrosis without pseudopalisading'] })), 3);
  assert.equal(proposedGrade(v({ dxFamily: 'Ependymal tumours', dxEpendymal: 'Supratentorial ependymoma' })), 2);
  assert.equal(proposedGrade(v({ dxFamily: 'Ependymal tumours', dxEpendymal: 'Supratentorial ependymoma', mitoses: '7' })), 3);
  assert.equal(proposedGrade(v({ dxFamily: 'Ependymal tumours', dxEpendymal: 'Subependymoma' })), 1);
  assert.equal(proposedGrade(v({ dxFamily: 'Circumscribed astrocytic gliomas', dxCircumscribed: 'Pilocytic astrocytoma' })), 1);
  // Entities without a settled grade return nothing rather than a guess.
  assert.equal(proposedGrade(v({ dxFamily: 'Mesenchymal tumours involving the CNS', dxMesenchymal: 'Solitary fibrous tumour' })), null);
});

test('the chosen grade overrides the proposal and the disagreement is flagged', () => {
  const out = run({ grade: 'CNS WHO grade 3' });
  assert.equal(grade({ ...defaults(schema), ...EX, grade: 'CNS WHO grade 3' }), 3);
  assert.ok(warns(out).some((m) => /grade 3 is recorded but the entity and the recorded findings support grade 4/.test(m)));
});

test('an ungradeable entity asks for a grade rather than inventing one', () => {
  const out = run({ dxFamily: 'Mesenchymal tumours involving the CNS', dxMesenchymal: 'Solitary fibrous tumour', histClass: 'Not applicable' });
  assert.ok(errs(out).some((m) => /CNS WHO grade is required/.test(m)));
  assert.equal(gradeValue({ ...defaults(schema), ...EX, dxFamily: 'Mesenchymal tumours involving the CNS', dxMesenchymal: 'Solitary fibrous tumour' }), '');
});

test('Layer 4 branches: the IDH-mutant panel and the IDH-wildtype panel are different lists', () => {
  const base = { ...defaults(schema), ...EX };
  const wt = molecularBits(base).map((b) => b.label);
  assert.ok(wt.includes('Chromosome 7 / 10 (FISH)') && wt.includes('EGFR amplification'));
  assert.ok(!wt.includes('ATRX (immunohistochemistry)'));
  const mut = molecularBits({ ...base, idhBranch: 'IDH-mutant', atrx: 'Loss of nuclear expression', codel: 'No deletion detected', cdkn2a: 'Homozygous deletion detected' }).map((b) => b.label);
  assert.ok(mut.includes('ATRX (immunohistochemistry)') && mut.includes('1p/19q (FISH)') && mut.includes('CDKN2A / CDKN2B'));
  assert.ok(!mut.includes('EGFR amplification'));
});

test('an oligodendroglioma without codeletion warns', () => {
  const out = run({ ...NOWT, dxAdult: 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted', histClass: 'Oligodendroglioma', idhBranch: 'IDH-mutant', codel: 'No deletion detected' });
  assert.ok(warns(out).some((m) => /1p\/19q codeletion is not recorded/.test(m)));
});

test('IDH1 R132H positive contradicts an IDH-wildtype glioblastoma', () => {
  const out = run({ idh1R132H: 'Positive', idhBranch: 'IDH-wildtype' });
  assert.ok(warns(out).some((m) => /not compatible with glioblastoma, IDH-wildtype/.test(m)));
});

test('a stated gross total resection on a fragmented specimen is noted, not corrected', () => {
  const out = run({ extent: 'Gross total resection' });
  assert.ok(infos(out).some((m) => /received fragmented/.test(m)));
  assert.ok(out.report.includes('- Extent of resection as stated by the surgeon: Gross total resection'));
});

test('pending molecular studies reach the diagnosis line and the synoptic', () => {
  const out = run({ molStatus: 'Sent, result pending', grade: 'Pending' });
  assert.ok(out.diagnosis.includes('molecular studies pending'));
  assert.ok(out.report.includes('- Molecular studies: Requested, result pending'));
  assert.ok(out.report.includes('- CNS WHO grade: Pending'));
});

test('the organ line names the organ from the site', () => {
  const v = { ...defaults(schema), ...EX };
  assert.equal(organPhrase({ values: v }), 'BRAIN, right frontal lobe, craniotomy and excision');
  assert.equal(organPhrase({ values: { ...v, site: 'Spinal cord', side: '', procedure: 'laminectomy and excision' } }), 'SPINAL CORD, spinal cord, laminectomy and excision');
});

test('the integrated diagnosis carries the grade and any qualifier', () => {
  const v = { ...defaults(schema), ...EX };
  assert.equal(integratedDiagnosis(v), 'Glioblastoma, IDH-wildtype, CNS WHO grade 4');
  assert.match(integratedDiagnosis({ ...v, dxQualifier: 'NOS (not otherwise specified)' }), /, NOS$/);
  assert.match(integratedDiagnosis({ ...v, grade: 'Pending', dxQualifier: 'Pending further studies', dxQualifierDetail: 'awaiting the molecular panel' }), /pending further studies \(awaiting the molecular panel\)$/);
});

test('immunohistochemistry stays inside the microscopy paragraph', () => {
  const report = run().report;
  const para = report.split('Microscopic findings')[1].split('Integrated diagnosis')[0];
  assert.ok(/On immunohistochemistry/.test(para));
  assert.ok(!/^\s*- Immunohistochemistry:/m.test(report));
});

test('printed prose stays in the released-report register', () => {
  for (const [name, patch, options] of CASES) {
    const report = run(patch, options).report;
    for (const banned of [/WHO CNS5/, /by definition/, /\bcIMPACT\b/, /prognos/i, /5-year/, /literature/i, /criteri(a|on)/i, /\bCAP\b/]) {
      assert.ok(!banned.test(report), `${name}: ${banned} appears in the printed report`);
    }
  }
});
