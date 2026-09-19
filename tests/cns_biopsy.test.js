// Brain and CNS biopsy + smear - generator, grading and golden fixtures.
// Fixtures: tests/fixtures/cns_biopsy/*.json (golden; regenerate with --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { meningiomaGrade, gliomaGrade, smearBlock, organPhrase, diagnosisText, validate } from '../generators/cns_biopsy.js';
import { isVisible } from '../src/engine.js';
import * as resection from '../generators/cns_tumour.js';
import { upperEntity, gradeClause } from '../generators/cns_layers.js';

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
const NOGLIOMA = {
  features: [], mitoses: '', ihc: [], ihcOther: '', histClass: '', grade: 'From the findings',
  molStatus: 'Not performed', idh1R132H: 'Not performed', tert: 'Not performed', tertDetail: ''
};

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
    finding: 'Astrocytoma, IDH-mutant', histClass: 'Diffuse astrocytoma',
    features: ['Increased cellularity', 'Nuclear atypia', 'Mitoses'], mitoses: '4',
    ihc: ['GFAP positive'], ihcOther: '',
    molStatus: 'Reported', idhBranch: 'IDH-mutant', idh1R132H: 'Positive',
    atrx: 'Loss of nuclear expression', p53: 'Abnormal (mutated pattern)',
    codel: 'No deletion detected', cdkn2a: 'Homozygous deletion detected',
    tert: 'Not performed', tertDetail: '', ki67: '12'
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
    finding: 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted', histClass: 'Oligodendroglioma',
    features: ['Rounded nuclei with perinuclear haloes', 'Delicate branching capillary network', 'Microcalcification'],
    mitoses: '0', ihc: ['GFAP positive', 'OLIG2 positive'], ihcOther: '',
    molStatus: 'Sent, result pending', grade: 'Pending', tert: 'Not performed', tertDetail: '', ki67: '4'
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
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgSubtype: 'Clear cell' })), 2);
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgMolecular: ['TERT promoter mutation detected'] })), 3);
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgMolecular: ['CDKN2A/B homozygous deletion detected'] })), 3);
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgAnaplasia: 'Present' })), 3);
  // cIMPACT-NOW update 8 withdrew the automatic grade 3 for rhabdoid and papillary morphology;
  // both now take the grade the criteria give.
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgSubtype: 'Rhabdoid' })), 1);
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgSubtype: 'Papillary' })), 1);
  assert.equal(meningiomaGrade(v({ mgMitoses: 25, mgSubtype: 'Papillary' })), 3);
  // Hemizygous CDKN2A/B loss, 1p alone and K27me3 loss do not grade; 1p with a partner does.
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgMolecular: ['CDKN2A/B hemizygous deletion detected'] })), 1);
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgMolecular: ['1p deletion detected'] })), 1);
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgMolecular: ['1p deletion detected', '22q deletion detected'] })), 2);
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgMolecular: ['1p deletion detected', 'NF2 pathogenic variant detected'] })), 2);
  assert.equal(meningiomaGrade(v({ mgMitoses: 1, mgIhc: ['H3 K27me3 loss of nuclear expression'] })), 1);
});

test('the meningioma diagnosis line names the subtype without doubling the grade word', () => {
  const dx = (p) => diagnosisText({ label: 'A', values: { ...defaults(schema), ...EX, finding: 'Meningioma', ...p } });
  assert.equal(dx({ mgSubtype: 'Clear cell' }), 'CLEAR CELL MENINGIOMA, CNS WHO grade 2');
  assert.equal(dx({ mgSubtype: 'Rhabdoid', mgMitoses: 25 }), 'RHABDOID MENINGIOMA, CNS WHO grade 3');
  assert.equal(dx({ mgSubtype: 'Meningothelial', mgMitoses: 6 }), 'ATYPICAL MENINGIOMA, CNS WHO grade 2');
  assert.equal(dx({ mgSubtype: 'Meningothelial', mgAnaplasia: 'Present' }), 'ANAPLASTIC MENINGIOMA, CNS WHO grade 3');
  assert.equal(dx({ mgSubtype: 'Transitional' }), 'MENINGIOMA, transitional type, CNS WHO grade 1');
});

test('the meningioma checks name the criterion and refuse the ones that do not grade', () => {
  const issues = (p) => validate({ label: 'A', values: { ...defaults(schema), ...EX, finding: 'Meningioma', ...p } });
  const msgs = (p, level) => issues(p).filter((i) => i.level === level).map((i) => i.message);
  assert.ok(msgs({ mgMitoses: 6 }, 'info').some((m) => /grade 2 on 6 mitoses/.test(m)));
  // Brain invasion standing alone: graded 2 per CNS5, with the update 8 proposal raised beside it.
  assert.ok(msgs({ mgBrain: 'Present' }, 'warn').some((m) => /cIMPACT-NOW update 8/.test(m)));
  // Choosing a grade name the findings do not support.
  assert.ok(msgs({ mgSubtype: 'Anaplastic' }, 'warn').some((m) => /support CNS WHO grade 1/.test(m)));
  assert.ok(msgs({ mgMolecular: ['CDKN2A/B hemizygous deletion detected'] }, 'info').some((m) => /Hemizygous CDKN2A\/B/.test(m)));
  assert.ok(msgs({ mgIhc: ['H3 K27me3 loss of nuclear expression'] }, 'info').some((m) => /prognostic/.test(m)));
  assert.ok(msgs({ mgSubtype: 'Papillary' }, 'info').some((m) => /no longer grades on its own/.test(m)));
});

test('glioma grading follows the current IDH-mutant grading rules', () => {
  const v = (p) => ({ features: [], molStatus: 'Reported', grade: 'From the findings', ...p });
  assert.equal(gliomaGrade(v({ finding: 'Glioblastoma, IDH-wildtype' })), 4);
  assert.equal(gliomaGrade(v({ finding: 'Diffuse midline glioma, H3 K27-altered' })), 4);
  assert.equal(gliomaGrade(v({ finding: 'Astrocytoma, IDH-mutant' })), 2);
  // Three or more mitoses per 2.4 mm2, or a higher-risk alteration, carries grade 3; the mitoses
  // chip on its own no longer does.
  assert.equal(gliomaGrade(v({ finding: 'Astrocytoma, IDH-mutant', features: ['Mitoses'] })), 2);
  assert.equal(gliomaGrade(v({ finding: 'Astrocytoma, IDH-mutant', mitoses: '4' })), 3);
  assert.equal(gliomaGrade(v({ finding: 'Astrocytoma, IDH-mutant', molHigher: ['EGFR amplification'] })), 3);
  assert.equal(gliomaGrade(v({ finding: 'Astrocytoma, IDH-mutant', pdgfra: 'Amplified' })), 4);
  assert.equal(gliomaGrade(v({ finding: 'Astrocytoma, IDH-mutant', features: ['Microvascular proliferation'] })), 4);
  assert.equal(gliomaGrade(v({ finding: 'Astrocytoma, IDH-mutant', cdkn2a: 'Homozygous deletion detected' })), 4);
  assert.equal(gliomaGrade(v({ finding: 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted' })), 2);
  assert.equal(gliomaGrade(v({ finding: 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted', features: ['Necrosis without pseudopalisading'] })), 3);
  assert.equal(gliomaGrade(v({ finding: 'Pilocytic astrocytoma' })), 1);
  // The explicit grade select overrides the derived grade.
  assert.equal(gliomaGrade(v({ finding: 'Astrocytoma, IDH-mutant', grade: 'CNS WHO grade 3' })), 3);
});

test('glioblastoma without a defining feature warns', () => {
  const out = run({ features: ['Increased cellularity', 'Nuclear atypia'], molStatus: 'Not performed', tert: 'Not performed' });
  assert.ok(warns(out).some((m) => /Glioblastoma, IDH-wildtype: record/.test(m)));
});

test('oligodendroglioma without codeletion warns', () => {
  const out = run({ finding: 'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted', molStatus: 'Reported', idhBranch: 'IDH-mutant', codel: 'No deletion detected' });
  assert.ok(warns(out).some((m) => /codeletion is not recorded/.test(m)));
});

test('two atypical meningioma features prompt molecular testing', () => {
  const out = run({ ...NOGLIOMA, finding: 'Meningioma', mgSubtype: 'Meningothelial', mgMitoses: '2', mgAtypical: ['High cellularity', 'Sheet-like growth'], mgBrain: 'Not identified', mgMolecular: [] });
  assert.ok(infos(out).some((m) => /grade 1 \/ grade 2 border/.test(m)));
  assert.ok(out.report.includes('TERT promoter sequencing'));
});

test('IDH1 R132H positive contradicts an IDH-wildtype glioblastoma', () => {
  const out = run({ idh1R132H: 'Positive' });
  assert.ok(warns(out).some((m) => /IDH1 R132H is positive; this is not compatible/.test(m)));
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

test('a glioblastoma reads alike on the biopsy and on the resection', () => {
  // The shared CNS diagnosis core: the same tumour, entered on a core and on a craniotomy, must
  // print the same Layer 1 wording and the same Layer 4 prose.
  const shared = {
    features: ['Increased cellularity', 'Nuclear atypia', 'Mitoses', 'Microvascular proliferation', 'Necrosis with pseudopalisading'],
    mitoses: '8', ihc: ['GFAP positive', 'OLIG2 positive'], ihcOther: '', grade: 'From the findings',
    molStatus: 'Reported', idhBranch: 'IDH-wildtype', idh1R132H: 'Negative',
    tert: 'Mutation detected (specify)', tertDetail: 'C228T', egfr: 'Not performed', chr710: 'Not performed'
  };
  const biopsy = { ...defaults(schema), ...EX, ...shared, finding: 'Glioblastoma, IDH-wildtype' };
  const res = { ...shared, dxFamily: 'Adult-type diffuse gliomas', dxAdult: 'Glioblastoma, IDH-wildtype' };
  assert.equal(diagnosisText({ label: 'A', values: biopsy }), upperEntity(resection.entity(res)) + ', ' + gradeClause(res));
  assert.equal(diagnosisText({ label: 'A', values: biopsy }), 'GLIOBLASTOMA, IDH-wildtype, CNS WHO grade 4');
  assert.equal(resection.integratedDiagnosis(res), 'Glioblastoma, IDH-wildtype, CNS WHO grade 4');
  assert.equal(resection.molecularClause(biopsy), resection.molecularClause(res));
});

test('a layer field needs both a glioma finding and its own branch', () => {
  const field = schema.fields.find((f) => f.id === 'atrx');
  assert.ok(Array.isArray(field.showIf.all));
  const base = { finding: 'Glioblastoma, IDH-wildtype', idhBranch: 'IDH-mutant' };
  assert.equal(isVisible(field, base), true);
  assert.equal(isVisible(field, { ...base, idhBranch: 'IDH-wildtype' }), false);
  assert.equal(isVisible(field, { ...base, finding: 'Meningioma' }), false);
});
