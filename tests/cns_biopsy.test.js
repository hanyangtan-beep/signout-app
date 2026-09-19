// Brain and CNS biopsy + smear - generator, grading and golden fixtures.
// Fixtures: tests/fixtures/cns_biopsy/*.json (golden; regenerate with --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { meningiomaGrade, gliomaGrade, smearBlock, organPhrase } from '../generators/cns_biopsy.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'cns_biopsy');
const UPDATE = process.argv.includes('--update');
const registry = await loadAll();
const { schema, generator } = registry.cns_biopsy;
const EX = schema.example.parts[0].values;
const defaults = (s) => Object.fromEntries(s.fields.filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));

function run(patch = {}, options = {}) {
  const values = { ...defaults(schema), ...EX, ...patch };
  const cs = { schemaId: 'cns_biopsy', caseTitle: '', options: { ...schema.example.options, ...options }, parts: [{ label: 'A', values }] };
  return generate(schema, generator, cs);
}
const warns = (out) => out.issues.filter((i) => i.level === 'warn').map((i) => i.message);
const infos = (out) => out.issues.filter((i) => i.level === 'info').map((i) => i.message);

// Clear the glioma block when the finding is not a glioma, so the example values do not leak in.
const NOGLIOMA = { glFeatures: [], glMitoses: '', glIhc: [], glMolecular: [], glMolecularStatus: 'Not performed', glGrade: 'From the findings' };

const CASES = [
  ['01-meningioma-grade1', {
    ...NOGLIOMA, specimenName: 'Dura, right sphenoidal ridge', site: 'Sphenoidal ridge', side: 'right',
    procedure: 'craniotomy and excision', prep: 'Paraffin sections only', pieces: '',
    finding: 'Meningioma', mgSubtype: 'Transitional', mgMitoses: '1', mgAtypical: [], mgBrain: 'Not identified',
    mgBone: 'Not applicable', mgIhc: ['EMA positive', 'SSTR2A positive', 'Progesterone receptor positive'], mgMolecular: [], ki67: '2'
  }],
  ['02-glioblastoma-idh-wildtype', {}],
  ['03-metastatic-adenocarcinoma', {
    ...NOGLIOMA, finding: 'Metastatic malignancy', metType: 'Adenocarcinoma', metPrimary: 'lung',
    metIhc: ['TTF-1 positive', 'CK7 positive', 'CK20 negative'], pieces: '2', ki67: ''
  }],
  ['04-atypical-meningioma-brain-invasion', {
    ...NOGLIOMA, finding: 'Meningioma', mgSubtype: 'Meningothelial', mgMitoses: '6',
    mgAtypical: ['High cellularity', 'Sheet-like growth', 'Prominent nucleoli'], mgBrain: 'Present',
    mgIhc: ['EMA positive', 'SSTR2A positive'], mgMolecular: [], ki67: '9', prep: 'Paraffin sections only', pieces: ''
  }],
  ['05-astrocytoma-idh-mutant-cdkn2a', {
    finding: 'Astrocytoma, IDH-mutant', glFeatures: ['Increased cellularity', 'Nuclear atypia', 'Mitoses'], glMitoses: '4',
    glIhc: ['GFAP positive', 'IDH1 R132H positive', 'ATRX lost', 'p53 overexpressed'],
    glMolecular: ['IDH1 or IDH2 mutation detected', '1p/19q retained', 'CDKN2A/B homozygous deletion detected'],
    glMolecularStatus: 'Reported', ki67: '12'
  }],
  ['06-smear-only-lymphoma', {
    ...NOGLIOMA, finding: 'Lymphoma', prep: 'Smear preparation only', smears: '3', pieces: '1',
    lyIhc: ['CD20 positive', 'CD3 negative', 'MUM1 positive'], lyFresh: false, lySteroid: true, ki67: '90'
  }],
  ['07-no-lesional-tissue', {
    ...NOGLIOMA, adequacy: 'No lesional tissue identified', finding: 'Gliosis, no tumour identified',
    prep: 'Smear and paraffin sections', smears: '2', pieces: '2', ki67: ''
  }],
  ['08-oligodendroglioma-pending', {
    finding: 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted',
    glFeatures: ['Rounded nuclei with perinuclear haloes', 'Delicate branching capillary network', 'Microcalcification'],
    glMitoses: '0', glIhc: ['GFAP positive', 'OLIG2 positive', 'IDH1 R132H positive', 'ATRX retained'],
    glMolecular: [], glMolecularStatus: 'Sent, result pending', ki67: '4'
  }]
];

for (const [name, patch, options] of CASES) {
  test(`cns_biopsy fixture ${name}`, () => {
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

test('meningioma grading follows WHO CNS5', () => {
  const v = (p) => ({ finding: 'Meningioma', mgSubtype: 'Meningothelial', mgAtypical: [], mgMolecular: [], ...p });
  assert.equal(meningiomaGrade(v({ mgMitoses: 2 })), 1);
  assert.equal(meningiomaGrade(v({ mgMitoses: 4 })), 2);
  assert.equal(meningiomaGrade(v({ mgMitoses: 20 })), 3);
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgAtypical: ['High cellularity', 'Sheet-like growth'] })), 1);
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgAtypical: ['High cellularity', 'Sheet-like growth', 'Prominent nucleoli'] })), 2);
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgBrain: 'Present' })), 2);
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgSubtype: 'Chordoid' })), 2);
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgSubtype: 'Rhabdoid' })), 3);
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgMolecular: ['TERT promoter mutation detected'] })), 3);
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgMolecular: ['CDKN2A/B homozygous deletion detected'] })), 3);
});

test('glioma grading follows WHO CNS5', () => {
  const v = (p) => ({ glFeatures: [], glMolecular: [], glMolecularStatus: 'Reported', glGrade: 'From the findings', ...p });
  assert.equal(gliomaGrade(v({ finding: 'Glioblastoma, IDH-wildtype' })), 4);
  assert.equal(gliomaGrade(v({ finding: 'Diffuse midline glioma, H3 K27-altered' })), 4);
  assert.equal(gliomaGrade(v({ finding: 'Astrocytoma, IDH-mutant' })), 2);
  assert.equal(gliomaGrade(v({ finding: 'Astrocytoma, IDH-mutant', glFeatures: ['Mitoses'] })), 3);
  assert.equal(gliomaGrade(v({ finding: 'Astrocytoma, IDH-mutant', glFeatures: ['Microvascular proliferation'] })), 4);
  assert.equal(gliomaGrade(v({ finding: 'Astrocytoma, IDH-mutant', glMolecular: ['CDKN2A/B homozygous deletion detected'] })), 4);
  assert.equal(gliomaGrade(v({ finding: 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted' })), 2);
  assert.equal(gliomaGrade(v({ finding: 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted', glFeatures: ['Necrosis without pseudopalisading'] })), 3);
  assert.equal(gliomaGrade(v({ finding: 'Pilocytic astrocytoma' })), 1);
  // The explicit grade select overrides the derived grade.
  assert.equal(gliomaGrade(v({ finding: 'Astrocytoma, IDH-mutant', glGrade: 'CNS WHO grade 3' })), 3);
});

test('glioblastoma without a defining feature warns', () => {
  const out = run({ glFeatures: ['Increased cellularity', 'Nuclear atypia'], glMolecular: [], glMolecularStatus: 'Not performed' });
  assert.ok(warns(out).some((m) => /Glioblastoma, IDH-wildtype: record/.test(m)));
});

test('oligodendroglioma without codeletion warns', () => {
  const out = run({ finding: 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted', glMolecular: ['IDH1 or IDH2 mutation detected'], glMolecularStatus: 'Reported' });
  assert.ok(warns(out).some((m) => /codeletion is not recorded/.test(m)));
});

test('two atypical meningioma features prompt molecular testing', () => {
  const out = run({ ...NOGLIOMA, finding: 'Meningioma', mgSubtype: 'Meningothelial', mgMitoses: '2', mgAtypical: ['High cellularity', 'Sheet-like growth'], mgBrain: 'Not identified', mgMolecular: [] });
  assert.ok(infos(out).some((m) => /grade 1 \/ grade 2 border/.test(m)));
  assert.ok(out.report.includes('TERT promoter sequencing'));
});

test('IDH1 R132H positive contradicts an IDH-wildtype glioblastoma', () => {
  const out = run({ glIhc: ['GFAP positive', 'IDH1 R132H positive'] });
  assert.ok(warns(out).some((m) => /IDH1 R132H positive with a diagnosis of glioblastoma/.test(m)));
});

test('the smear block is written only when smears were made', () => {
  const part = { label: 'A', values: { ...defaults(schema), ...EX } };
  assert.match(smearBlock(part), /^Two smear preparations are made from the tissue\./);
  assert.equal(smearBlock({ label: 'A', values: { ...part.values, prep: 'Paraffin sections only' } }), '');
  assert.match(smearBlock({ label: 'A', values: { ...part.values, smears: '1' } }), /^One smear preparation is made from the tissue\. It shows/);
});

test('the organ line names the organ from the site', () => {
  const v = { ...defaults(schema), ...EX };
  assert.equal(organPhrase({ values: v }), 'BRAIN, right frontal lobe, stereotactic biopsy');
  assert.equal(organPhrase({ values: { ...v, site: 'Sphenoidal ridge', side: 'left', procedure: 'craniotomy and excision' } }), 'DURA, left, craniotomy and excision');
  assert.equal(organPhrase({ values: { ...v, site: 'Sellar region', side: '', procedure: 'transsphenoidal excision' } }), 'PITUITARY, sellar region, transsphenoidal excision');
});

test('layered lines can be switched off', () => {
  const on = run({}, { layered: true });
  const off = run({}, { layered: false });
  assert.ok(on.diagnosis.includes('- CNS WHO grade 4'));
  assert.ok(!off.diagnosis.includes('- CNS WHO grade 4'));
  assert.ok(off.diagnosis.includes('GLIOBLASTOMA, IDH-wildtype, CNS WHO grade 4'));
});

test('printed prose stays in the released-report register', () => {
  for (const [name, patch, options] of CASES) {
    const report = run(patch, options).report;
    for (const banned of [/WHO CNS5/, /by definition/, /\bcIMPACT\b/, /prognos/i, /5-year/, /literature/i, /criteri(a|on)/i]) {
      assert.ok(!banned.test(report), `${name}: ${banned} appears in the printed report`);
    }
  }
});
