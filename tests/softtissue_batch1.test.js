// Soft tissue benign template upgrade (benign batch 1). Card: docs/roadmap.md, pulled into Now 2026-09-24.
// The 16 original diagnoses are covered by tests/softtissue.test.js and must print as before; this file
// covers the 20 added options and the MDM2, location, surrounding-tissue and margin-distance fields.
// Fixtures: tests/fixtures/soft_tissue_benign/*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible } from '../src/engine.js';
import { parseIntake, matchParts } from '../src/intake.js';
import { loadManifest } from '../src/registry.js';
import * as gen from '../generators/softtissue.js';
import { ORIGINAL, NEM_IN_DX, NO_MARGIN, sftRisk, flags } from '../generators/softtissue.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('soft_tissue_benign');
const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'soft_tissue_benign');
const UPDATE = process.argv.includes('--update');
const field = (id) => schema.fields.find((f) => f.id === id);
const run = (values) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return generate(schema, gen, c);
};

const ALT = 'Atypical lipomatous tumour – see comment';
const DESCRIPTIVE = 'Fibroadipose tissue – no evidence of malignancy';
const DFSP = 'Dermatofibrosarcoma protuberans – see comment';
const SFT = 'Solitary fibrous tumour';
const DESMOID = 'Desmoid-type fibromatosis';
const MET = 'Metastatic malignancy';
const ADDED = field('diagnosis').options.filter((o) => !ORIGINAL.includes(o));

test('the 16 original diagnoses keep their order; 20 are added around them', () => {
  const opts = field('diagnosis').options;
  assert.deepEqual(opts.filter((o) => ORIGINAL.includes(o)), ORIGINAL);
  assert.equal(ADDED.length, 20);
  assert.deepEqual(opts.slice(0, 14), ORIGINAL.slice(0, 14));
  assert.equal(opts[opts.length - 1], 'Lymphoma');
  for (const id of ['mdm2', 'metType', 'lymphomaType', 'ihcPositive', 'ihcNegative', 'favouredPrimary', 'tissueSeen',
    'sftAge', 'sftSize', 'sftMitoses', 'sftNecrosis', 'location', 'surrounding', 'marginDistance']) {
    assert.notEqual(field(id).group, 'Macroscopy', `${id} is a microscopy field`);
    assert.ok('default' in field(id), `${id} has a default`);
  }
});

test('every added option prints a capitalised line and a clean paragraph', () => {
  for (const dx of ADDED) {
    const r = run({ diagnosis: dx, ihcPositive: 'CK7', favouredPrimary: 'lung' });
    const main = r.diagnosis.split(' - ')[1].split(';')[0];
    assert.match(main, /^[A-Z][A-Z -]+(, (localised|diffuse) type|, consistent with [A-Z ]+ PRIMARY)?$/, dx);
    assert.ok(!r.report.includes('undefined'), dx);
    assert.ok(!r.report.includes('  '), dx);
    assert.ok(!r.microscopy.includes('No atypical stromal cells or lipoblasts'), `${dx} does not borrow the adipocytic sentence`);
    assert.ok(/\.$/.test(r.microscopy), dx);
  }
});

test('the adipocytic modifiers are hidden for the added options and a left-over value is ignored', () => {
  for (const id of ['fatNecrosis', 'atypicalCells', 'mitosesSentence', 'encapsulation']) {
    assert.equal(isVisible(field(id), { diagnosis: 'Angioleiomyoma' }), false, id);
    assert.equal(isVisible(field(id), { diagnosis: 'Lipoma' }), true, id);
  }
  const r = run({ diagnosis: 'Angioleiomyoma', fatNecrosis: 'Present', atypicalCells: 'Present – see comment', mitosesSentence: true, encapsulation: 'Unencapsulated, ill-defined' });
  assert.equal(r.diagnosis, 'SOFT TISSUE, lipoma, excision - ANGIOLEIOMYOMA; completely excised');
  assert.ok(!r.microscopy.includes('Fat necrosis is seen'));
  assert.ok(!r.microscopy.includes('lipoblasts'));
  assert.ok(!r.microscopy.includes('ill-defined'));
  assert.ok(r.microscopy.endsWith('There is no evidence of malignancy.'));
  assert.equal(r.comment, '');
});

test('reactive mimics state no evidence of malignancy on the line and make no excision statement', () => {
  for (const dx of NEM_IN_DX) {
    const r = run({ diagnosis: dx, margins: 'Complete', marginDistance: '4' });
    assert.ok(r.diagnosis.endsWith('; NO EVIDENCE OF MALIGNANCY'), dx);
    assert.ok(!r.diagnosis.includes('excised'), dx);
    assert.ok(!r.microscopy.includes('excised'), dx);
    assert.ok(r.microscopy.endsWith('There is no evidence of malignancy.'), dx);
  }
  assert.equal(run({ diagnosis: 'Scar' }).diagnosis, 'SOFT TISSUE, lipoma, excision - SCAR TISSUE; NO EVIDENCE OF MALIGNANCY');
  for (const dx of NO_MARGIN) {
    assert.equal(isVisible(field('margins'), { diagnosis: dx }), false, dx);
    assert.equal(isVisible(field('marginDistance'), { diagnosis: dx, margins: 'Complete' }), false, dx);
  }
  // Endometriosis, vascular malformation and gout tophus keep the excision statement.
  assert.equal(run({ diagnosis: 'Endometriosis' }).diagnosis, 'SOFT TISSUE, lipoma, excision - ENDOMETRIOSIS; completely excised');
});

test('descriptive line: tissue seen, or fibroadipose tissue when blank', () => {
  const blank = run({ diagnosis: DESCRIPTIVE, clinicalLabel: 'lump' });
  assert.equal(blank.diagnosis, 'SOFT TISSUE, lump, excision - NO EVIDENCE OF MALIGNANCY');
  assert.equal(blank.microscopy, 'Sections show fibroadipose tissue. There is no evidence of malignancy.');
  const typed = run({ diagnosis: DESCRIPTIVE, tissueSeen: 'Fibroadipose tissue and skeletal muscle.' });
  assert.equal(typed.microscopy, 'Sections show fibroadipose tissue and skeletal muscle. There is no evidence of malignancy.');
});

test('intermediate tumours: no negative closing sentence; STAT6 and beta-catenin lines yield to typed IHC', () => {
  for (const dx of [DESMOID, SFT, DFSP]) assert.ok(!run({ diagnosis: dx }).microscopy.includes('no evidence of malignancy'), dx);
  assert.ok(run({ diagnosis: SFT }).microscopy.includes('On immunohistochemistry, the tumour cells show diffuse nuclear STAT6 expression. The findings are in keeping with solitary fibrous tumour.'));
  const typed = run({ diagnosis: SFT, ihc: 'STAT6 positive; CD34 positive' });
  assert.ok(!typed.microscopy.includes('diffuse nuclear STAT6'));
  assert.ok(typed.microscopy.includes('Immunohistochemistry: STAT6 positive; CD34 positive.'));
  assert.ok(run({ diagnosis: DESMOID }).microscopy.includes('the tumour cells show nuclear beta-catenin expression.'));
  assert.ok(!run({ diagnosis: DESMOID, ihc: 'Beta-catenin nuclear positive' }).microscopy.includes('show nuclear beta-catenin'));
  const d = run({ diagnosis: DFSP });
  assert.equal(d.diagnosis, 'SOFT TISSUE, lipoma, excision - DERMATOFIBROSARCOMA PROTUBERANS; completely excised; see comment');
  assert.equal(d.comment, 'Dermatofibrosarcoma protuberans is identified. This benign template does not grade or stage the tumour; the QMH soft tissue sarcoma template should be used where a synoptic report is required.');
});

// Modified Demicco model (PMC11042756 Table 1; PMC10796168 Table 1; PubMed 28731041).
test('solitary fibrous tumour: modified Demicco points and bands', () => {
  const r = (age, size, mit, nec) => sftRisk({ sftAge: String(age), sftSize: String(size), sftMitoses: String(mit), sftNecrosis: nec });
  assert.deepEqual(r(54, 4.9, 0, 'Absent'), { score: 0, risk: 'low', missing: [] });
  assert.deepEqual(r(55, 5, 1, 'Less than 10%'), { score: 3, risk: 'low', missing: [] });
  assert.deepEqual(r(60, 12, 1, 'Absent'), { score: 4, risk: 'intermediate', missing: [] });
  assert.deepEqual(r(40, 14.9, 4, '10% or more'), { score: 5, risk: 'intermediate', missing: [] });
  assert.deepEqual(r(60, 10, 4, '10% or more'), { score: 6, risk: 'high', missing: [] });
  assert.deepEqual(r(70, 15, 9, '10% or more'), { score: 7, risk: 'high', missing: [] });
  // Size falls back to the largest specimen dimension; an explicit tumour size wins.
  assert.equal(sftRisk({ sftAge: '30', dimensions: '16 x 9 x 7', sftMitoses: '0', sftNecrosis: 'Absent' }).score, 3);
  assert.equal(sftRisk({ sftAge: '30', sftSize: '4', dimensions: '16 x 9 x 7', sftMitoses: '0', sftNecrosis: 'Absent' }).score, 0);
  assert.deepEqual(sftRisk({ dimensions: '' }).missing.map(([n]) => n), ['age', 'tumour size', 'mitotic count', 'necrosis']);
});

test('solitary fibrous tumour: comment and "see comment" only once all four inputs are in; Checks lists what is missing', () => {
  const full = run({ diagnosis: SFT, dimensions: '8 x 6 x 5', sftAge: '62', sftMitoses: '2', sftNecrosis: 'Absent' });
  assert.ok(full.diagnosis.endsWith('SOLITARY FIBROUS TUMOUR; completely excised; see comment'));
  assert.equal(full.comment, 'Solitary fibrous tumour, modified Demicco risk model (age, tumour size, mitotic count and necrosis): score 3 of 7, low risk of metastasis.');
  assert.ok(full.microscopy.includes('The mitotic count is 2 per 10 high-power fields. There is no tumour necrosis.'));
  assert.deepEqual(full.issues, []);
  const part = run({ diagnosis: SFT, dimensions: '8 x 6 x 5', sftMitoses: '0' });
  assert.ok(!part.diagnosis.includes('see comment'));
  assert.equal(part.comment, '');
  assert.ok(part.microscopy.includes('No mitotic figures are identified.'));
  assert.deepEqual(part.issues.map((i) => [i.level, i.message, i.field]), [['warn', 'Solitary fibrous tumour: the risk comment needs the age and necrosis.', 'sftAge']]);
  // Two parts: the comment names its part.
  const c = createCase(schema, 2);
  Object.assign(c.parts[1].values, { diagnosis: SFT, dimensions: '16', sftAge: '58', sftMitoses: '5', sftNecrosis: '10% or more' });
  const two = generate(schema, gen, c);
  assert.equal(two.comment, 'Solitary fibrous tumour (part B), modified Demicco risk model (age, tumour size, mitotic count and necrosis): score 7 of 7, high risk of metastasis.');
});

test('metastatic malignancy: house panel sentences, favoured primary and the diagnosis line', () => {
  const r = run({ diagnosis: MET, site: 'abdominal wall', clinicalLabel: 'nodule', ihcPositive: 'CK20, CDX2', ihcNegative: 'CK7', favouredPrimary: 'colorectal' });
  assert.equal(r.diagnosis, 'SOFT TISSUE, abdominal wall nodule, excision - METASTATIC ADENOCARCINOMA, consistent with COLORECTAL PRIMARY; completely excised');
  assert.ok(r.microscopy.includes('On immunohistochemistry, the tumour cells are positive for CK20 and CDX2. They are negative for CK7. The findings are consistent with metastatic adenocarcinoma of colorectal primary.'));
  assert.ok(!r.microscopy.includes('no evidence of malignancy'));
  assert.equal(run({ diagnosis: MET, favouredPrimary: 'Lung primary.' }).diagnosis.split(' - ')[1], 'METASTATIC ADENOCARCINOMA, consistent with LUNG PRIMARY; completely excised');
  assert.ok(run({ diagnosis: MET, metType: 'Squamous cell carcinoma', ihcNegative: 'p40' }).microscopy.includes('the tumour cells are negative for p40. The findings are in keeping with metastatic squamous cell carcinoma.'));
  // Melanoma never takes a primary, even one left behind from an earlier choice; AE1/AE3 stays whole.
  const mel = run({ diagnosis: MET, metType: 'Melanoma', favouredPrimary: 'lung', ihcPositive: 'SOX10 and Melan-A', ihcNegative: 'AE1/AE3' });
  assert.equal(mel.diagnosis.split(' - ')[1], 'METASTATIC MELANOMA; completely excised');
  assert.ok(mel.microscopy.includes('positive for SOX10 and Melan-A. They are negative for AE1/AE3. The findings are in keeping with metastatic melanoma.'));
  assert.equal(isVisible(field('favouredPrimary'), { diagnosis: MET, metType: 'Melanoma' }), false);
  assert.equal(isVisible(field('ihc'), { diagnosis: MET }), false);
  assert.deepEqual(run({ diagnosis: MET }).issues.map((i) => i.field), ['ihcPositive']);
});

test('lymphoma: typed type on the line, no excision statement', () => {
  const r = run({ diagnosis: 'Lymphoma', lymphomaType: 'Diffuse large B-cell lymphoma', ihcPositive: 'CD20; BCL6', ihcNegative: 'CD3', margins: 'Complete' });
  assert.equal(r.diagnosis, 'SOFT TISSUE, lipoma, excision - DIFFUSE LARGE B-CELL LYMPHOMA');
  assert.equal(r.microscopy, 'Sections show soft tissue diffusely infiltrated by sheets of atypical lymphoid cells. On immunohistochemistry, the atypical lymphoid cells are positive for CD20 and BCL6. They are negative for CD3. The findings are in keeping with diffuse large B-cell lymphoma.');
  assert.equal(run({ diagnosis: 'Lymphoma' }).diagnosis, 'SOFT TISSUE, lipoma, excision - LYMPHOMA');
});

test('MDM2: not tested leaves the output as it was; each result prints its own sentence and comment', () => {
  const base = { diagnosis: ALT, dimensions: '15 x 10 x 8', margins: 'Incomplete – reaches inked margin' };
  const nt = run(base);
  assert.equal(nt.microscopy, run({ ...base, mdm2: undefined }).microscopy);
  assert.ok(nt.microscopy.includes('thickened fibrous septa. The features raise the possibility of an atypical lipomatous tumour; see comment. The lesion reaches the inked margin.'));
  assert.ok(nt.comment.startsWith('An atypical or malignant mesenchymal tumour is identified.'));

  const amp = run({ ...base, mdm2: 'Amplified' });
  assert.ok(amp.microscopy.includes('septa. MDM2 amplification is detected by fluorescence in situ hybridisation (FISH). The findings are in keeping with an atypical lipomatous tumour; see comment.'));
  assert.equal(amp.comment, 'The atypical lipomatous tumour shows MDM2 amplification. This benign template does not grade or stage the lesion, and the QMH soft tissue sarcoma template should be used for the final synoptic report.');
  assert.ok(amp.diagnosis.endsWith('; see comment'));

  const pend = run({ ...base, mdm2: 'Pending' });
  assert.equal(pend.comment, 'MDM2 amplification testing (FISH) is pending; a supplementary report will follow.');
  assert.ok(pend.microscopy.includes('The features raise the possibility of an atypical lipomatous tumour; see comment.'));

  const neg = run({ ...base, mdm2: 'Not amplified' });
  assert.ok(neg.microscopy.includes('MDM2 amplification is not detected by fluorescence in situ hybridisation (FISH).'));
  assert.equal(neg.comment, '');
  assert.ok(!neg.diagnosis.includes('see comment'));
  assert.deepEqual(neg.issues.map((i) => i.field), ['mdm2']);

  // Lipoma: the not-amplified sentence precedes the conclusion; pending adds the comment; tested
  // tumours no longer get the "may be considered" suggestion.
  const lip = run({ dimensions: '12 x 8 x 5', mdm2: 'Not amplified' });
  assert.ok(lip.microscopy.includes('No atypical stromal cells or lipoblasts are observed. MDM2 amplification is not detected by fluorescence in situ hybridisation (FISH). The findings are in keeping with lipoma.'));
  assert.equal(lip.comment, '');
  assert.deepEqual(flags([{ values: { diagnosis: 'Lipoma', dimensions: '12', site: '', mdm2: 'Not amplified' } }]), []);
  assert.deepEqual(flags([{ values: { diagnosis: 'Lipoma', dimensions: '12', site: '', mdm2: 'Not tested' } }]), ['largeDeepAdipocytic']);
  const lp = run({ mdm2: 'Pending' });
  assert.equal(lp.diagnosis, 'SOFT TISSUE, lipoma, excision - LIPOMA; completely excised; see comment');
  assert.equal(lp.comment, 'MDM2 amplification testing (FISH) is pending; a supplementary report will follow.');
  assert.deepEqual(run({ mdm2: 'Amplified' }).issues.map((i) => i.field), ['mdm2']);

  // Hidden for non-adipocytic diagnoses; a sarcoma always reads as not tested, so its comment still fires.
  assert.equal(isVisible(field('mdm2'), { diagnosis: 'Schwannoma' }), false);
  assert.ok(run({ diagnosis: 'Sarcoma – see comment', mdm2: 'Amplified' }).comment.startsWith('An atypical or malignant mesenchymal tumour is identified.'));
});

test('location, surrounding tissue and distance to the nearest margin (G105 4.4)', () => {
  const plain = run({});
  assert.ok(plain.microscopy.includes('The findings are in keeping with lipoma. The lesion is completely excised. There is no evidence of malignancy.'));
  const all = run({ location: 'Intramuscular', surrounding: 'Unremarkable skeletal muscle.', marginDistance: '2.5' });
  assert.ok(all.microscopy.includes('The findings are in keeping with lipoma. The lesion is located within skeletal muscle and is completely excised, with the nearest margin clear by 2.5 mm. The surrounding tissue comprises unremarkable skeletal muscle. There is no evidence of malignancy.'));
  assert.equal(all.diagnosis, 'SOFT TISSUE, lipoma, excision - LIPOMA; completely excised');
  assert.ok(run({ location: 'Dermal', margins: 'Incomplete – reaches inked margin' }).microscopy.includes('The lesion is centred in the dermis and reaches the inked margin.'));
  assert.ok(run({ location: 'Subfascial', margins: 'Not assessable' }).microscopy.includes('The lesion is located deep to the fascia. There is no evidence'));
  assert.ok(run({ location: 'Subcutaneous', margins: 'Not assessable' }).microscopy.includes('The lesion is located in the subcutaneous tissue.'));
  // A distance only prints with complete excision; 0 mm is flagged.
  assert.ok(run({ margins: 'Incomplete – reaches inked margin', marginDistance: '2' }).microscopy.includes('The lesion reaches the inked margin. There is no evidence'));
  assert.equal(isVisible(field('marginDistance'), { diagnosis: 'Lipoma', margins: 'Not assessable' }), false);
  assert.deepEqual(run({ marginDistance: '0' }).issues.map((i) => i.field), ['margins']);
});

test('an atypical lipomatous tumour at a retroperitoneal, mediastinal or paratesticular site is sent to the sarcoma synoptic', () => {
  for (const site of ['retroperitoneum', 'anterior mediastinal', 'left paratesticular', 'right spermatic cord']) {
    const r = run({ diagnosis: ALT, site });
    assert.equal(r.issues.length, 1, site);
    assert.ok(r.issues[0].message.includes('well-differentiated liposarcoma'), site);
    assert.ok(r.issues[0].message.includes('QMH MS-Soft tissue sarcoma'), site);
  }
  assert.deepEqual(run({ diagnosis: ALT, site: 'left thigh' }).issues, []);
  assert.deepEqual(run({ diagnosis: 'Lipoma', site: 'retroperitoneum' }).issues, []);
});

test('the abdominal wall reaches the soft tissue template from the LIS line', async () => {
  const manifest = await loadManifest();
  const m = matchParts(parseIntake('Abdominal wall nodule, excision'), '', manifest);
  assert.equal(m[0].templateId, 'soft_tissue_benign');
});

const CASES = [
  ['01-fat-necrosis-buttock', { site: 'right buttock', clinicalLabel: 'mass', diagnosis: 'Fat necrosis', dimensions: '4 x 3 x 2', description: 'Ill-defined fibrofatty tissue', capsule: 'Not identified', location: 'Subcutaneous', blocks: '2' }],
  ['02-tgct-localised-knee', { site: 'right knee', clinicalLabel: 'mass', diagnosis: 'Tenosynovial giant cell tumour, localised', dimensions: '2.5 x 2 x 1.5', description: 'Well-circumscribed firm tan-white nodule', cutSurface: 'Variegated yellow-brown', blocks: '2', marginDistance: '1' }],
  ['03-alt-mdm2-amplified-2mm', { site: 'left thigh', clinicalLabel: 'intramuscular lipoma', diagnosis: ALT, mdm2: 'Amplified', dimensions: '14 x 9 x 6', weight: '320', location: 'Intramuscular', surrounding: 'skeletal muscle', marginDistance: '2', blocks: '6' }],
  ['04-metastatic-adenocarcinoma-abdominal-wall', { site: 'abdominal wall', clinicalLabel: 'nodule', diagnosis: MET, metType: 'Adenocarcinoma', ihcPositive: 'CK20, CDX2', ihcNegative: 'CK7', favouredPrimary: 'colorectal', dimensions: '2 x 1.5 x 1.2', description: 'Well-circumscribed firm tan-white nodule', cutSurface: 'Whorled tan-white', capsule: 'Not identified', location: 'Subcutaneous', marginDistance: '3', blocks: '3' }],
  ['05-solitary-fibrous-tumour-risk', { site: 'left thigh', clinicalLabel: 'mass', diagnosis: SFT, dimensions: '8 x 6 x 5', description: 'Well-circumscribed firm tan-white nodule', cutSurface: 'Whorled tan-white', sftAge: '62', sftMitoses: '2', sftNecrosis: 'Absent', location: 'Subfascial', blocks: '5' }],
  ['06-desmoid-abdominal-wall-margin', { site: 'abdominal wall', clinicalLabel: 'mass', diagnosis: DESMOID, dimensions: '5 x 4 x 3', description: 'Ill-defined fibrofatty tissue', cutSurface: 'Whorled tan-white', capsule: 'Not identified', location: 'Intramuscular', margins: 'Incomplete – reaches inked margin', blocks: '4' }],
  ['07-dfsp-back', { organ: 'SKIN AND SUBCUTIS', site: 'back', clinicalLabel: 'nodule', diagnosis: DFSP, dimensions: '4 x 3 x 2', description: 'Well-circumscribed firm tan-white nodule', cutSurface: 'Whorled tan-white', capsule: 'Not identified', location: 'Dermal', marginDistance: '5', blocks: '4' }],
  ['08-descriptive-no-malignancy', { site: 'left groin', clinicalLabel: 'lump', diagnosis: DESCRIPTIVE, tissueSeen: 'fibroadipose tissue and skeletal muscle', description: 'Ill-defined fibrofatty tissue', capsule: 'Not identified', blocks: '2' }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'soft_tissue_benign', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
