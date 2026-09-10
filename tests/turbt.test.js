// Phase 4b: bladder TURBT / bladder biopsy template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/turbt.js';
import { sizePhrase, weightPhrase, fragmentPhrase, sitePhrase } from '../generators/turbt.js';

const schema = JSON.parse(readFileSync(new URL('../schemas/turbt.json', import.meta.url), 'utf8'));
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  Object.assign(c.options, options);
  return c;
};
const HG = 'High grade papillary urothelial carcinoma';
const LG = 'Low grade papillary urothelial carcinoma';
const TUMOUR = { siteType: 'Bladder tumour, TURBT', site: 'left lateral wall' };

test('metadata: benign GU resection with search aliases and complete defaults', () => {
  assert.equal(schema.id, 'turbt');
  assert.equal(schema.generator, 'turbt');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'GU');
  assert.equal(schema.label, 'TURBT');
  assert.equal(schema.organ, 'URINARY BLADDER');
  assert.equal(schema.rank, 33);
  assert.equal(schema.name, 'Bladder TURBT / biopsy');
  assert.equal(schema.shortName, 'Bladder · TURBT');
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['TURBT', 'PUNLMP', 'CIS', 'BCG', 'nephrogenic adenoma', 'random biopsies']) assert.ok(schema.aliases.includes(a), a);
  assert.equal(schema.maxParts, 6);
  assert.equal(schema.defaultParts, 1);
  for (const f of schema.fields) assert.ok('default' in f, `${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is a field`);
  for (const f of schema.fields) for (const p of schema.example.parts) assert.ok(f.id in p.values, `example part ${p.label} has ${f.id}`);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  assert.deepEqual(macroFields, ['fragments', 'appearance', 'aggregateSize', 'aggregateWeight', 'blocks']);
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  const variant = schema.fields.find((f) => f.id === 'variant');
  assert.equal(variant.type, 'multiselect');
  assert.deepEqual(variant.default, []);
});

test('helpers: size, weight, fragment and site phrases', () => {
  assert.equal(sizePhrase('3x2x0.5'), '3 x 2 x 0.5 cm');
  assert.equal(sizePhrase('3 X 2 × 0.5 cm'), '3 x 2 x 0.5 cm');
  assert.equal(sizePhrase(''), '');
  assert.equal(weightPhrase('4'), '4 g');
  assert.equal(weightPhrase('4.5g'), '4.5 g');
  assert.equal(weightPhrase(''), '');
  assert.deepEqual(fragmentPhrase('3'), { n: 3, text: 'three' });
  assert.deepEqual(fragmentPhrase('Multiple'), { n: null, text: 'multiple' });
  assert.deepEqual(fragmentPhrase(''), { n: null, text: '' });
  assert.deepEqual(sitePhrase({ siteType: 'Bladder tumour, TURBT', site: 'Left lateral wall' }), { organ: 'Urinary bladder', rest: 'left lateral wall tumour, TURBT' });
  assert.deepEqual(sitePhrase({ siteType: 'Prostatic urethra, biopsy', site: '' }), { organ: 'Prostatic urethra', rest: 'biopsy' });
  assert.deepEqual(sitePhrase({ specimenName: 'Urinary bladder, dome, TURBT' }), { organ: 'Urinary bladder', rest: 'dome, TURBT' });
});

test('example: two parts - pT1 high grade TURBT and benign random biopsies', () => {
  const r = run(example());
  assert.equal(r.specimens, '(A) Urinary bladder, left lateral wall tumour, TURBT\n(B) Urinary bladder, random biopsies');
  assert.equal(r.macro, '(A) Received in formalin are multiple tan friable tissue chips measuring 3 x 2 x 0.5 cm in aggregate and weighing 4 g. All embedded in 2 blocks.\n\n(B) Received in formalin are four tan-brown mucosal fragments measuring 0.5 x 0.4 x 0.2 cm in aggregate. All embedded in 1 block.');
  assert.equal(r.blockKey, '(A) (1-2) Bladder chips, all embedded.\n(B) (1) Bladder biopsies, all embedded.');
  assert.equal(r.microscopy.split('\n\n')[0], '(A) Sections show fragments of bladder wall with a papillary urothelial neoplasm composed of fibrovascular cores lined by urothelium showing marked architectural and cytological disorder, with loss of polarity, nuclear pleomorphism and frequent mitoses. Nests of tumour cells infiltrate the lamina propria. Muscularis propria is present and uninvolved. There is no lymphovascular invasion.');
  assert.equal(r.microscopy.split('\n\n')[1], '(B) Sections show fragments of bladder mucosa lined by unremarkable urothelium with underlying lamina propria and muscularis propria. There is no evidence of dysplasia or malignancy.');
  assert.equal(r.diagnosis, '(A) URINARY BLADDER, left lateral wall tumour, TURBT - HIGH GRADE PAPILLARY UROTHELIAL CARCINOMA WITH LAMINA PROPRIA INVASION (pT1); muscularis propria present and uninvolved\n(B) URINARY BLADDER, random biopsies - NO EVIDENCE OF DYSPLASIA OR MALIGNANCY');
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('undefined'));
});

test('default single part is the benign house report without part letters', () => {
  const r = run(createCase(schema, 1));
  assert.equal(r.specimens, 'Urinary bladder, tumour, TURBT');
  assert.equal(r.macro, 'Received in formalin are multiple tan friable tissue chips. All embedded in 1 block.');
  assert.equal(r.blockKey, '(1) Bladder chips, all embedded.');
  assert.equal(r.microscopy, 'Sections show fragments of bladder mucosa lined by unremarkable urothelium with underlying lamina propria and muscularis propria. There is no evidence of dysplasia or malignancy.');
  assert.equal(r.diagnosis, 'URINARY BLADDER, tumour, TURBT - NO EVIDENCE OF DYSPLASIA OR MALIGNANCY');
  assert.ok(!r.report.includes('(A)'));
});

test('macro: block numbering, single fragment, blank size / weight leave no dangling text', () => {
  const r = run(one({ fragments: '1', appearance: 'Tan-brown mucosal fragments', aggregateSize: '0.3 x 0.2 x 0.1', aggregateWeight: '', blocks: '1' }));
  assert.equal(r.macro, 'Received in formalin is a single tan-brown mucosal fragment measuring 0.3 x 0.2 x 0.1 cm. All embedded in 1 block.');
  const r2 = run(one({ fragments: '', aggregateSize: '', aggregateWeight: '', blocks: '3' }));
  assert.equal(r2.macro, 'Received in formalin are tan friable tissue chips. All embedded in 3 blocks.');
  assert.equal(r2.blockKey, '(1-3) Bladder chips, all embedded.');
  assert.ok(!r2.report.includes(' cm'));
  assert.ok(!r2.report.includes(' g.'));
  const r3 = run(one({ siteType: 'Prostatic urethra, biopsy', aggregateWeight: '0.5 g' }));
  assert.ok(r3.macro.includes('weighing 0.5 g.'));
  assert.equal(r3.blockKey, '(1) Prostatic urethral biopsies, all embedded.');
  assert.equal(r3.specimens, 'Prostatic urethra, biopsy');
  assert.ok(r3.diagnosis.startsWith('PROSTATIC URETHRA, biopsy - '));
});

test('macro option off removes the macroscopic description and block key', () => {
  const r = run(one({}, { macro: false }));
  assert.equal(r.macro, '');
  assert.equal(r.blockKey, '');
  assert.ok(!r.report.includes('Received in formalin'));
  assert.ok(!r.report.includes('all embedded'));
  assert.ok(r.report.startsWith('Urinary bladder, tumour, TURBT\n\nSections show'));
});

test('headers option labels the macro and block key blocks', () => {
  const r = run(one({}, { includeHeader: true }));
  assert.ok(r.report.includes('MACROSCOPIC DESCRIPTION:\nReceived in formalin'));
  assert.ok(r.report.includes('BLOCK KEY:\n(1) Bladder chips, all embedded.'));
});

test('two-part case keeps (A)/(B) prefixes on every block', () => {
  const c = createCase(schema, 2);
  c.parts[1].values = { ...c.parts[1].values, siteType: 'Bladder, cold-cup biopsy', site: 'trigone', muscularisPropria: 'Not represented' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Urinary bladder, tumour, TURBT\n(B) Urinary bladder, trigone, cold-cup biopsy');
  assert.ok(r.macro.startsWith('(A) Received in formalin'));
  assert.ok(r.macro.includes('\n\n(B) Received in formalin'));
  assert.equal(r.blockKey, '(A) (1) Bladder chips, all embedded.\n(B) (1) Bladder biopsies, all embedded.');
  assert.ok(r.microscopy.startsWith('(A) Sections show'));
  assert.ok(r.microscopy.includes('\n\n(B) Sections show fragments of bladder mucosa lined by unremarkable urothelium with underlying lamina propria. Muscularis propria is not represented in the sample. There is no evidence of dysplasia or malignancy.'));
  assert.equal(r.diagnosis.split('\n')[0], '(A) URINARY BLADDER, tumour, TURBT - NO EVIDENCE OF DYSPLASIA OR MALIGNANCY');
  assert.equal(r.diagnosis.split('\n')[1], '(B) URINARY BLADDER, trigone, cold-cup biopsy - NO EVIDENCE OF DYSPLASIA OR MALIGNANCY');
});

test('each neoplasm option yields the right capitalised diagnosis', () => {
  const dx = (values) => run(one({ ...TUMOUR, ...values })).diagnosis;
  const head = 'URINARY BLADDER, left lateral wall tumour, TURBT - ';
  assert.equal(dx({ neoplasm: 'None' }), `${head}NO EVIDENCE OF DYSPLASIA OR MALIGNANCY`);
  assert.equal(dx({ neoplasm: 'Urothelial papilloma' }), `${head}UROTHELIAL PAPILLOMA; muscularis propria present`);
  assert.equal(dx({ neoplasm: 'PUNLMP' }), `${head}PAPILLARY UROTHELIAL NEOPLASM OF LOW MALIGNANT POTENTIAL (PUNLMP); muscularis propria present`);
  assert.equal(dx({ neoplasm: LG }), `${head}LOW GRADE PAPILLARY UROTHELIAL CARCINOMA, NON-INVASIVE (pTa); muscularis propria present`);
  assert.equal(dx({ neoplasm: HG, invasion: 'Lamina propria invasion (pT1)' }), `${head}HIGH GRADE PAPILLARY UROTHELIAL CARCINOMA WITH LAMINA PROPRIA INVASION (pT1); muscularis propria present and uninvolved`);
  assert.equal(dx({ neoplasm: 'Urothelial carcinoma in situ' }), `${head}UROTHELIAL CARCINOMA IN SITU (pTis); muscularis propria present`);
  assert.equal(dx({ neoplasm: 'Invasive urothelial carcinoma, non-papillary' }), `${head}INVASIVE UROTHELIAL CARCINOMA, NON-PAPILLARY WITH LAMINA PROPRIA INVASION (pT1); muscularis propria present and uninvolved`);
  assert.equal(dx({ neoplasm: HG, invasion: 'Muscularis propria invasion (pT2 at least)' }), `${head}HIGH GRADE PAPILLARY UROTHELIAL CARCINOMA WITH INVASION OF MUSCULARIS PROPRIA (at least pT2); see comment`);
  assert.equal(dx({ neoplasm: HG, muscularisPropria: 'Not represented' }), `${head}HIGH GRADE PAPILLARY UROTHELIAL CARCINOMA, NON-INVASIVE (pTa); muscularis propria not represented`);
});

test('muscularis propria sentence is mandatory in every microscopy', () => {
  const micro = (values) => run(one({ ...TUMOUR, ...values })).microscopy;
  assert.ok(micro({}).includes('and muscularis propria.'));
  assert.ok(micro({ muscularisPropria: 'Not represented' }).includes('Muscularis propria is not represented in the sample.'));
  assert.ok(micro({ neoplasm: LG }).includes('There is no evidence of invasion of the lamina propria. Muscularis propria is present and uninvolved.'));
  assert.ok(micro({ neoplasm: LG, muscularisPropria: 'Not represented' }).includes('Muscularis propria is not represented in the sample.'));
  assert.ok(micro({ neoplasm: HG, invasion: 'Muscularis propria invasion (pT2 at least)' }).includes('Nests of tumour cells infiltrate the lamina propria and extend into the muscularis propria. Muscularis propria is present and is infiltrated by tumour.'));
});

test('muscularis propria invasion: either field triggers at least pT2 and the QMH cancer template comment', () => {
  const r = run(one({ ...TUMOUR, neoplasm: HG, muscularisPropria: 'Present and involved' }));
  assert.ok(r.diagnosis.includes('WITH INVASION OF MUSCULARIS PROPRIA (at least pT2); see comment'));
  const r2 = run(one({ ...TUMOUR, neoplasm: HG, invasion: 'Muscularis propria invasion (pT2 at least)' }));
  assert.equal(r2.comment, 'Invasion of the muscularis propria is identified in the TURBT material. The depth of invasion cannot be fully staged on transurethral resection specimens; the QMH bladder cancer template should be used for the cystectomy synoptic report.');
  assert.ok(r2.report.endsWith(r2.comment));
  assert.equal(run(one({ ...TUMOUR, neoplasm: HG })).comment, '');
});

test('associated CIS, variant histology and LVI print in microscopy and diagnosis', () => {
  const r = run(one({ ...TUMOUR, neoplasm: HG, invasion: 'Lamina propria invasion (pT1)', cis: 'Present', variant: ['Squamous', 'Glandular', 'Micropapillary'], lvi: 'Present' }));
  assert.ok(r.microscopy.includes('Nests of tumour cells infiltrate the lamina propria. The tumour shows squamous and glandular divergent differentiation and a micropapillary component. The adjacent flat urothelium shows urothelial carcinoma in situ. Muscularis propria is present and uninvolved. Lymphovascular invasion is present.'));
  assert.equal(r.diagnosis, 'URINARY BLADDER, left lateral wall tumour, TURBT - HIGH GRADE PAPILLARY UROTHELIAL CARCINOMA WITH LAMINA PROPRIA INVASION (pT1); with squamous and glandular divergent differentiation; micropapillary subtype; associated urothelial carcinoma in situ; lymphovascular invasion present; muscularis propria present and uninvolved');
  const r2 = run(one({ ...TUMOUR, neoplasm: HG, lvi: 'Indeterminate' }));
  assert.ok(r2.microscopy.includes('Lymphovascular invasion cannot be reliably assessed in this material.'));
  assert.ok(r2.diagnosis.includes('; lymphovascular invasion indeterminate;'));
});

test('carcinoma in situ alone has its own house paragraph', () => {
  const r = run(one({ siteType: 'Random bladder biopsies', neoplasm: 'Urothelial carcinoma in situ' }));
  assert.equal(r.microscopy, 'Sections show fragments of bladder mucosa in which the flat urothelium shows marked cytological atypia with nuclear enlargement, pleomorphism, hyperchromasia and loss of polarity extending through the full thickness of the epithelium, in keeping with urothelial carcinoma in situ. Muscularis propria is present and uninvolved. There is no lymphovascular invasion.');
  assert.equal(r.diagnosis, 'URINARY BLADDER, random biopsies - UROTHELIAL CARCINOMA IN SITU (pTis); muscularis propria present');
});

test('benign findings: cystitis patterns, squamous metaplasia, nephrogenic adenoma, reactive and denuded urothelium', () => {
  const dx = (values) => run(one({ siteType: 'Random bladder biopsies', ...values })).diagnosis;
  const head = 'URINARY BLADDER, random biopsies - ';
  assert.equal(dx({ cystitis: 'Cystitis cystica et glandularis' }), `${head}CYSTITIS CYSTICA ET GLANDULARIS; no evidence of dysplasia or malignancy`);
  assert.equal(dx({ cystitis: 'Follicular cystitis' }), `${head}FOLLICULAR CYSTITIS; no evidence of dysplasia or malignancy`);
  assert.equal(dx({ cystitis: 'Eosinophilic cystitis' }), `${head}EOSINOPHILIC CYSTITIS; no evidence of dysplasia or malignancy`);
  assert.equal(dx({ cystitis: 'BCG-related granulomatous cystitis' }), `${head}BCG-RELATED GRANULOMATOUS CYSTITIS; no evidence of dysplasia or malignancy`);
  assert.equal(dx({ cystitis: 'Radiation or chemotherapy change' }), `${head}RADIATION OR CHEMOTHERAPY CHANGE; no evidence of dysplasia or malignancy`);
  assert.equal(dx({ cystitis: 'Polypoid cystitis' }), `${head}POLYPOID CYSTITIS; no evidence of dysplasia or malignancy`);
  assert.equal(dx({ squamousMetaplasia: 'Present, keratinising', nephrogenicAdenoma: 'Present' }), `${head}KERATINISING SQUAMOUS METAPLASIA; nephrogenic adenoma; no evidence of dysplasia or malignancy`);
  assert.equal(dx({ urothelium: 'Reactive atypia', cystitis: 'Follicular cystitis' }), `${head}REACTIVE UROTHELIAL ATYPIA; follicular cystitis; no evidence of dysplasia or malignancy`);
  const r = run(one({ siteType: 'Random bladder biopsies', cystitis: 'Cystitis cystica et glandularis', squamousMetaplasia: 'Present, keratinising', nephrogenicAdenoma: 'Present' }));
  assert.equal(r.microscopy, 'Sections show fragments of bladder mucosa lined by unremarkable urothelium with underlying lamina propria and muscularis propria. The lamina propria contains von Brunn nests with cystic dilatation and glandular metaplasia, in keeping with cystitis cystica et glandularis. There is keratinising squamous metaplasia of the surface urothelium. There is a nephrogenic adenoma composed of small tubules lined by cuboidal cells with hobnail nuclei within the lamina propria. There is no evidence of dysplasia or malignancy.');
  const d = run(one({ siteType: 'Random bladder biopsies', urothelium: 'Denuded' }));
  assert.ok(d.microscopy.startsWith('Sections show fragments of bladder mucosa in which the urothelium is largely denuded'));
  assert.equal(d.diagnosis, `${head}NO EVIDENCE OF DYSPLASIA OR MALIGNANCY; urothelium largely denuded, see comment`);
  assert.ok(d.comment.startsWith('The urothelium is extensively denuded, which limits'));
});

test('typed specimen name overrides the site fields and additional notes are appended', () => {
  const r = run(one({ specimenName: 'Urinary bladder, dome, TURBT', site: 'ignored', additionalNotes: 'Scattered eosinophils are noted.' }));
  assert.equal(r.specimens, 'Urinary bladder, dome, TURBT');
  assert.ok(r.diagnosis.startsWith('URINARY BLADDER, dome, TURBT - '));
  assert.ok(r.microscopy.endsWith('There is no evidence of dysplasia or malignancy. Scattered eosinophils are noted.'));
});
