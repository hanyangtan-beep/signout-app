// Phase 4b: prostate chips (TURP) template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/turp.js';
import { sizePhrase, weightPhrase, gradeGroup, gleasonText, stage, suggestedBlocks } from '../generators/turp.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('turp');
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  Object.assign(c.options, options);
  return c;
};
const CA = 'Present – incidental adenocarcinoma';
const DX = 'PROSTATE, chips, TURP - ';

test('metadata: benign GU resection with search aliases and complete defaults', () => {
  assert.equal(schema.id, 'turp');
  assert.equal(schema.generator, 'turp');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'GU');
  assert.equal(schema.name, 'Prostate chips (TURP)');
  assert.equal(schema.shortName, 'Prostate · TURP chips');
  assert.equal(schema.label, 'TURP');
  assert.equal(schema.organ, 'PROSTATE');
  assert.equal(schema.rank, 32);
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['TURP', 'BPH', 'HoLEP', 'pT1a', 'pT1b', 'prostatitis']) assert.ok(schema.aliases.includes(a), `alias ${a}`);
  assert.equal(schema.maxParts, 2);
  assert.equal(schema.defaultParts, 1);
  for (const f of schema.fields) assert.ok('default' in f, `${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is a field`);
  for (const id of ids) assert.ok(id in schema.example.parts[0].values, `example carries ${id}`);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  assert.deepEqual(macroFields, ['weight', 'dimensions', 'chipsDescription', 'sampling', 'blocks']);
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  for (const id of ['primary', 'secondary', 'pctInvolved', 'chipsInvolved', 'chipsTotal', 'pni', 'extent']) {
    const f = schema.fields.find((x) => x.id === id);
    assert.deepEqual(f.showIf, { field: 'carcinoma', is: CA }, `${id} shown only with carcinoma`);
  }
});

test('helpers: size, weight, Grade Group, stage and sampling rule', () => {
  assert.equal(sizePhrase('6x5x2'), '6 x 5 x 2 cm');
  assert.equal(sizePhrase('6 X 5 × 2 cm'), '6 x 5 x 2 cm');
  assert.equal(sizePhrase(''), '');
  assert.equal(weightPhrase('25'), '25 g');
  assert.equal(weightPhrase('12.5'), '12.5 g');
  assert.equal(weightPhrase('30g'), '30 g');
  assert.equal(weightPhrase(''), '');
  assert.equal(gradeGroup(3, 3), 1);
  assert.equal(gradeGroup(3, 4), 2);
  assert.equal(gradeGroup(4, 3), 3);
  assert.equal(gradeGroup(4, 4), 4);
  assert.equal(gradeGroup(4, 5), 5);
  assert.equal(gradeGroup('', 3), null);
  assert.equal(gleasonText('3', '4'), '3+4=7 (Grade Group 2)');
  assert.equal(stage('3'), 'pT1a');
  assert.equal(stage('5'), 'pT1a');
  assert.equal(stage('5.1'), 'pT1b');
  assert.equal(stage('20'), 'pT1b');
  assert.equal(stage(''), null);
  assert.equal(suggestedBlocks('10'), 8);
  assert.equal(suggestedBlocks('12'), 8);
  assert.equal(suggestedBlocks('25'), 11);
  assert.equal(suggestedBlocks('42'), 14);
  assert.equal(suggestedBlocks(''), 8);
});

test('example: 25 g TURP, BPH with chronic prostatitis, no carcinoma', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Prostate, chips, TURP');
  assert.equal(r.macro, 'Received in formalin are multiple chips of prostatic tissue weighing 25 g in aggregate and measuring 6 x 5 x 2 cm. All embedded in 8 blocks.');
  assert.equal(r.blockKey, '(1-8) Prostatic chips, all embedded.');
  assert.equal(r.microscopy, 'Sections show chips of prostatic tissue with glandular and stromal nodular hyperplasia. The glands are lined by a layer of epithelial cells and basal cells. Chronic inflammatory cells are present within the stroma. There is no evidence of high grade prostatic intraepithelial neoplasia or malignancy.');
  assert.equal(r.diagnosis, `${DX}BENIGN PROSTATIC HYPERPLASIA WITH CHRONIC PROSTATITIS; no evidence of malignancy`);
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('(A)'));
  assert.ok(!r.report.includes('undefined'));
});

test('default single part is the house benign TURP report', () => {
  const r = run(createCase(schema, 1));
  assert.equal(r.macro, 'Received in formalin are multiple chips of prostatic tissue. All embedded in 8 blocks.');
  assert.equal(r.blockKey, '(1-8) Prostatic chips, all embedded.');
  assert.equal(r.microscopy, 'Sections show chips of prostatic tissue with glandular and stromal nodular hyperplasia. The glands are lined by a layer of epithelial cells and basal cells. There is no evidence of high grade prostatic intraepithelial neoplasia or malignancy.');
  assert.equal(r.diagnosis, `${DX}BENIGN PROSTATIC HYPERPLASIA; no evidence of malignancy`);
});

test('macro option off removes the macroscopic description and block key', () => {
  const r = run(one({}, { macro: false }));
  assert.equal(r.macro, '');
  assert.equal(r.blockKey, '');
  assert.ok(!r.report.includes('Received in formalin'));
  assert.ok(!r.report.includes('Prostatic chips, all embedded'));
  assert.ok(r.report.startsWith('Prostate, chips, TURP\n\nSections show chips of prostatic tissue'));
});

test('headers option labels the macro and block key blocks', () => {
  const r = run(one({}, { includeHeader: true }));
  assert.ok(r.report.includes('MACROSCOPIC DESCRIPTION:\nReceived in formalin'));
  assert.ok(r.report.includes('BLOCK KEY:\n(1-8) Prostatic chips, all embedded.'));
});

test('two-part case keeps (A)/(B) prefixes on every block', () => {
  const c = createCase(schema, 2);
  c.parts[1].values = { ...c.parts[1].values, weight: '8', blocks: '4', infarction: 'Present with squamous metaplasia' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Prostate, chips, TURP\n(B) Prostate, chips, TURP');
  assert.ok(r.macro.startsWith('(A) Received in formalin'));
  assert.ok(r.macro.includes('\n\n(B) Received in formalin are multiple chips of prostatic tissue weighing 8 g in aggregate. All embedded in 4 blocks.'));
  assert.equal(r.blockKey, '(A) (1-8) Prostatic chips, all embedded.\n(B) (1-4) Prostatic chips, all embedded.');
  assert.ok(r.microscopy.startsWith('(A) Sections show chips'));
  assert.ok(r.microscopy.includes('\n\n(B) Sections show chips'));
  assert.ok(r.microscopy.includes('Areas of infarction with surrounding squamous metaplasia are present.'));
  assert.equal(r.diagnosis.split('\n')[0], `(A) ${DX}BENIGN PROSTATIC HYPERPLASIA; no evidence of malignancy`);
  assert.equal(r.diagnosis.split('\n')[1], `(B) ${DX}BENIGN PROSTATIC HYPERPLASIA; infarction; no evidence of malignancy`);
});

test('each inflammation option yields the right capitalised diagnosis', () => {
  const dx = (inflammation) => run(one({ inflammation })).diagnosis;
  assert.equal(dx('Absent'), `${DX}BENIGN PROSTATIC HYPERPLASIA; no evidence of malignancy`);
  assert.equal(dx('Chronic prostatitis'), `${DX}BENIGN PROSTATIC HYPERPLASIA WITH CHRONIC PROSTATITIS; no evidence of malignancy`);
  assert.equal(dx('Acute and chronic prostatitis'), `${DX}BENIGN PROSTATIC HYPERPLASIA WITH ACUTE AND CHRONIC PROSTATITIS; no evidence of malignancy`);
  assert.equal(dx('Granulomatous prostatitis – see comment'), `${DX}BENIGN PROSTATIC HYPERPLASIA WITH GRANULOMATOUS PROSTATITIS; see comment; no evidence of malignancy`);
  assert.equal(dx('Post-BCG granulomatous prostatitis'), `${DX}BENIGN PROSTATIC HYPERPLASIA WITH POST-BCG GRANULOMATOUS PROSTATITIS; no evidence of malignancy`);
});

test('hyperplasia pattern and inflammation sentences follow the house paragraph', () => {
  const r = run(one({ hyperplasia: 'Predominantly stromal', inflammation: 'Acute and chronic prostatitis' }));
  assert.equal(r.microscopy, 'Sections show chips of prostatic tissue with nodular hyperplasia which is predominantly stromal. The glands are lined by a layer of epithelial cells and basal cells. Acute and chronic inflammatory cells are present within the stroma and glandular lumina. There is no evidence of high grade prostatic intraepithelial neoplasia or malignancy.');
  assert.ok(run(one({ hyperplasia: 'Predominantly glandular' })).microscopy.startsWith('Sections show chips of prostatic tissue with nodular hyperplasia which is predominantly glandular.'));
  const g = run(one({ inflammation: 'Granulomatous prostatitis – see comment' }));
  assert.ok(g.microscopy.includes('There is a granulomatous inflammatory infiltrate of epithelioid histiocytes, multinucleated giant cells and lymphocytes centred on ruptured ducts and acini; see comment.'));
  assert.equal(g.comment, 'Granulomatous prostatitis is present. Ziehl-Neelsen and GMS stains show no organisms. The features are those of non-specific granulomatous prostatitis; correlation with any history of intravesical BCG therapy or prior instrumentation is suggested.');
  assert.ok(run(one({ inflammation: 'Post-BCG granulomatous prostatitis' })).microscopy.includes('in keeping with post-BCG granulomatous prostatitis.'));
});

test('secondary benign findings: infarction, basal cell hyperplasia, urothelial metaplasia, treatment effect, HGPIN', () => {
  const r = run(one({ infarction: 'Present with squamous metaplasia', basalCellHyperplasia: 'Present', urothelialMetaplasia: 'Present', hgpin: 'Present, focal' }));
  assert.equal(r.microscopy, 'Sections show chips of prostatic tissue with glandular and stromal nodular hyperplasia. The glands are lined by a layer of epithelial cells and basal cells. Areas of infarction with surrounding squamous metaplasia are present. Foci of basal cell hyperplasia and transitional (urothelial) metaplasia are seen. A focus of high grade prostatic intraepithelial neoplasia is present. There is no evidence of invasive malignancy.');
  assert.equal(r.diagnosis, `${DX}BENIGN PROSTATIC HYPERPLASIA; infarction; focal high grade prostatic intraepithelial neoplasia; no evidence of invasive malignancy`);
  const t = run(one({ treatmentEffect: 'Hormonal / 5-alpha reductase inhibitor effect' }));
  assert.ok(t.microscopy.includes('in keeping with hormonal therapy effect.'));
  assert.equal(t.diagnosis, `${DX}BENIGN PROSTATIC HYPERPLASIA; hormonal therapy effect; no evidence of malignancy`);
  assert.ok(run(one({ treatmentEffect: 'Radiotherapy effect' })).diagnosis.includes('; radiotherapy effect;'));
  assert.ok(run(one({ basalCellHyperplasia: 'Present' })).microscopy.includes('Foci of basal cell hyperplasia are seen.'));
});

test('incidental carcinoma: Gleason / Grade Group, % of tissue, chips and pT1a', () => {
  const r = run(one({ inflammation: 'Chronic prostatitis', carcinoma: CA, primary: '3', secondary: '3', pctInvolved: '3', chipsInvolved: '2', chipsTotal: '40' }));
  assert.equal(r.microscopy, 'Sections show chips of prostatic tissue with glandular and stromal nodular hyperplasia. The glands are lined by a layer of epithelial cells and basal cells. Chronic inflammatory cells are present within the stroma. Infiltrating acinar adenocarcinoma is seen, Gleason score 3+3=6 (Grade Group 1), involving approximately 3% of the tissue (2 of 40 chips). Perineural invasion is not identified. The tumour involves 5% or less of the resected tissue (pT1a).');
  assert.equal(r.diagnosis, `${DX}BENIGN PROSTATIC HYPERPLASIA WITH CHRONIC PROSTATITIS; INCIDENTAL ACINAR ADENOCARCINOMA, Gleason score 3+3=6 (Grade Group 1), involving 3% of chips (pT1a)`);
  assert.ok(!r.microscopy.includes('no evidence'));
  assert.ok(!r.diagnosis.includes('no evidence'));
  const plain = run(one({ carcinoma: CA, pctInvolved: '3' })).diagnosis;
  assert.equal(plain, `${DX}BENIGN PROSTATIC HYPERPLASIA; INCIDENTAL ACINAR ADENOCARCINOMA, Gleason score 3+3=6 (Grade Group 1), involving 3% of chips (pT1a)`);
});

test('incidental carcinoma above 5% is pT1b with perineural invasion and extent', () => {
  const r = run(one({ carcinoma: CA, primary: '4', secondary: '3', pctInvolved: '15', chipsInvolved: '9', chipsTotal: '30', pni: 'Present', extent: 'present in chips from both lobes', hgpin: 'Present, focal' }));
  assert.ok(r.microscopy.includes('A focus of high grade prostatic intraepithelial neoplasia is present. Infiltrating acinar adenocarcinoma is seen, Gleason score 4+3=7 (Grade Group 3), involving approximately 15% of the tissue (9 of 30 chips). The tumour is present in chips from both lobes. Perineural invasion is present. The tumour involves more than 5% of the resected tissue (pT1b).'));
  assert.equal(r.diagnosis, `${DX}BENIGN PROSTATIC HYPERPLASIA; INCIDENTAL ACINAR ADENOCARCINOMA, Gleason score 4+3=7 (Grade Group 3), involving 15% of chips (pT1b); perineural invasion present; focal high grade prostatic intraepithelial neoplasia`);
  assert.equal(stage('5'), 'pT1a');
  assert.ok(run(one({ carcinoma: CA, pctInvolved: '5' })).diagnosis.endsWith('involving 5% of chips (pT1a)'));
  assert.ok(run(one({ carcinoma: CA, pctInvolved: '6' })).diagnosis.endsWith('involving 6% of chips (pT1b)'));
});

test('carcinoma with blank percentage omits the stage and any dangling text', () => {
  const r = run(one({ carcinoma: CA, primary: '4', secondary: '4', chipsInvolved: '3', chipsTotal: '25' }));
  assert.ok(r.microscopy.includes('Infiltrating acinar adenocarcinoma is seen, Gleason score 4+4=8 (Grade Group 4), involving 3 of 25 chips. Perineural invasion is not identified.'));
  assert.ok(!r.microscopy.includes('pT1'));
  assert.equal(r.diagnosis, `${DX}BENIGN PROSTATIC HYPERPLASIA; INCIDENTAL ACINAR ADENOCARCINOMA, Gleason score 4+4=8 (Grade Group 4), involving 3 of 25 chips`);
  const bare = run(one({ carcinoma: CA }));
  assert.ok(bare.microscopy.includes('Infiltrating acinar adenocarcinoma is seen, Gleason score 3+3=6 (Grade Group 1). Perineural invasion is not identified.'));
  assert.equal(bare.diagnosis, `${DX}BENIGN PROSTATIC HYPERPLASIA; INCIDENTAL ACINAR ADENOCARCINOMA, Gleason score 3+3=6 (Grade Group 1)`);
  assert.ok(!bare.report.includes('undefined'));
});

test('macro variants: representative sampling, tissue description, HoLEP and enucleation', () => {
  const r = run(one({ weight: '42', dimensions: '9x7x3', chipsDescription: 'Multiple tan-grey chips of prostatic tissue', sampling: 'Representative', blocks: '14' }));
  assert.equal(r.macro, 'Received in formalin are multiple tan-grey chips of prostatic tissue weighing 42 g in aggregate and measuring 9 x 7 x 3 cm. Representative sections in 14 blocks.');
  assert.equal(r.blockKey, '(1-14) Prostatic chips, representative sections.');
  assert.ok(run(one({ blocks: '1' })).blockKey === '(1) Prostatic chips, all embedded.');
  const h = run(one({ specimenName: '', procedure: 'HoLEP', chipsDescription: 'Multiple morcellated fragments of prostatic tissue', weight: '60', blocks: '12' }));
  assert.equal(h.specimens, 'Prostate, chips, HoLEP');
  assert.equal(h.macro, 'Received in formalin are multiple morcellated fragments of prostatic tissue weighing 60 g in aggregate. All embedded in 12 blocks.');
  assert.equal(h.diagnosis, 'PROSTATE, chips, HoLEP - BENIGN PROSTATIC HYPERPLASIA; no evidence of malignancy');
  const e = run(one({ specimenName: '', procedure: 'Simple prostatectomy (enucleation)', chipsDescription: 'Enucleated nodular prostatic tissue', weight: '95', dimensions: '7 x 6 x 5', blocks: '10' }));
  assert.equal(e.specimens, 'Prostate, enucleation, simple prostatectomy');
  assert.equal(e.macro, 'Received in formalin is enucleated nodular prostatic tissue weighing 95 g and measuring 7 x 6 x 5 cm. All embedded in 10 blocks.');
  assert.equal(e.blockKey, '(1-10) Prostatic tissue, all embedded.');
  assert.ok(e.microscopy.startsWith('Sections show enucleated prostatic tissue with glandular and stromal nodular hyperplasia.'));
  assert.equal(e.diagnosis, 'PROSTATE, enucleation, simple prostatectomy - BENIGN PROSTATIC HYPERPLASIA; no evidence of malignancy');
});

test('blank weight and dimensions produce no dangling text', () => {
  const r = run(one({ weight: '', dimensions: '' }));
  assert.equal(r.macro, 'Received in formalin are multiple chips of prostatic tissue. All embedded in 8 blocks.');
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.report.includes('__'));
  assert.ok(!r.report.includes('weighing  '));
  assert.ok(!r.report.includes('measuring  '));
  assert.ok(!/\bcm\b|\bg\b/.test(r.macro));
  const w = run(one({ weight: '12', dimensions: '' }));
  assert.equal(w.macro, 'Received in formalin are multiple chips of prostatic tissue weighing 12 g in aggregate. All embedded in 8 blocks.');
  const d = run(one({ weight: '', dimensions: '4 x 3 x 1' }));
  assert.equal(d.macro, 'Received in formalin are multiple chips of prostatic tissue measuring 4 x 3 x 1 cm. All embedded in 8 blocks.');
});

test('typed specimen name is used in the SPECIMENS block', () => {
  const r = run(one({ specimenName: 'Prostate, chips, TURP (bladder neck)' }));
  assert.equal(r.specimens, 'Prostate, chips, TURP (bladder neck)');
});

test('additional notes are appended to the microscopy', () => {
  const r = run(one({ additionalNotes: 'Corpora amylacea are prominent.' }));
  assert.ok(r.microscopy.endsWith('There is no evidence of high grade prostatic intraepithelial neoplasia or malignancy. Corpora amylacea are prominent.'));
});
