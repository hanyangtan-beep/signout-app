// Phase 4b: gallbladder (benign cholecystectomy) template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/gallbladder.js';
import { sizePhrase, wallPhrase } from '../generators/gallbladder.js';

const schema = JSON.parse(readFileSync(new URL('../schemas/gallbladder.json', import.meta.url), 'utf8'));
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  Object.assign(c.options, options);
  return c;
};

test('metadata: benign hepatobiliary resection with search aliases and complete defaults', () => {
  assert.equal(schema.id, 'gallbladder');
  assert.equal(schema.generator, 'gallbladder');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Hepatobiliary');
  assert.equal(schema.label, 'Gallbladder');
  assert.equal(schema.organ, 'GALLBLADDER');
  assert.equal(schema.rank, 23);
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  assert.ok(schema.aliases.includes('cholecystectomy'));
  assert.equal(schema.maxParts, 2);
  assert.equal(schema.defaultParts, 1);
  for (const f of schema.fields) assert.ok('default' in f, `${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is a field`);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  assert.deepEqual(macroFields, ['receivedState', 'dimensions', 'wallThickness', 'serosa', 'stones', 'stoneSize', 'mucosa', 'mucosaMass', 'cysticNode', 'blocks']);
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
});

test('helpers: size and wall phrases', () => {
  assert.equal(sizePhrase('8x3x2.5'), '8 x 3 x 2.5 cm');
  assert.equal(sizePhrase('8 X 3 × 2.5 cm'), '8 x 3 x 2.5 cm');
  assert.equal(sizePhrase(''), '');
  assert.equal(wallPhrase('0.3 cm'), '0.3 cm');
  assert.equal(wallPhrase('3mm'), '3 mm');
  assert.equal(wallPhrase('3'), '3 mm');
  assert.equal(wallPhrase('0.4'), '0.4 cm');
  assert.equal(wallPhrase(''), '');
});

test('example: chronic cholecystitis with cholesterolosis, stones not received', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Gallbladder, cholecystectomy');
  assert.equal(r.macro, 'Received in formalin is a gallbladder measuring 8 x 3 x 2.5 cm which has been opened prior to submission. The wall measures up to 0.3 cm in thickness. The serosa is smooth. The mucosa is velvety and bile-stained with yellow flecks (cholesterolosis). No stones are received. Representative sections in 3 blocks.');
  assert.equal(r.blockKey, '(1) Cystic duct margin. (2) Body. (3) Fundus.');
  assert.equal(r.microscopy, 'Sections of the gallbladder show thickening of the muscular wall, Rokitansky-Aschoff sinus formation as well as a transmural chronic inflammatory infiltrate of lymphocytes and some plasma cells. The findings are consistent with chronic cholecystitis. Aggregates of foamy histiocytes are present within the lamina propria of the mucosal folds, in keeping with cholesterolosis. There is no evidence of dysplasia or malignancy.');
  assert.equal(r.diagnosis, 'GALLBLADDER, cholecystectomy - CHRONIC CHOLECYSTITIS; cholesterolosis; no evidence of dysplasia or malignancy');
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('(A)'));
  assert.ok(!r.report.includes('undefined'));
});

test('default single part is the house chronic cholecystitis report', () => {
  const r = run(createCase(schema, 1));
  assert.equal(r.macro, 'Received in formalin is a gallbladder which has been opened prior to submission. The serosa is smooth. The mucosa is unremarkable. No stones are received. Representative sections in 3 blocks.');
  assert.equal(r.microscopy, 'Sections of the gallbladder show thickening of the muscular wall, Rokitansky-Aschoff sinus formation as well as a transmural chronic inflammatory infiltrate of lymphocytes and some plasma cells. The findings are consistent with chronic cholecystitis. There is no evidence of dysplasia or malignancy.');
  assert.equal(r.diagnosis, 'GALLBLADDER, cholecystectomy - CHRONIC CHOLECYSTITIS; no evidence of dysplasia or malignancy');
});

test('macro option off removes the macroscopic description and block key', () => {
  const r = run(one({}, { macro: false }));
  assert.equal(r.macro, '');
  assert.equal(r.blockKey, '');
  assert.ok(!r.report.includes('Received in formalin'));
  assert.ok(!r.report.includes('(1) Cystic duct margin'));
  assert.ok(r.report.startsWith('Gallbladder, cholecystectomy\n\nSections of the gallbladder'));
});

test('headers option labels the macro and block key blocks', () => {
  const r = run(one({}, { includeHeader: true }));
  assert.ok(r.report.includes('MACROSCOPIC DESCRIPTION:\nReceived in formalin'));
  assert.ok(r.report.includes('BLOCK KEY:\n(1) Cystic duct margin. (2) Body. (3) Fundus.'));
});

test('two-part case keeps (A)/(B) prefixes on every block', () => {
  const c = createCase(schema, 2);
  c.parts[1].values = { ...c.parts[1].values, cysticNode: 'Identified', cysticNodeResult: 'Reactive' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Gallbladder, cholecystectomy\n(B) Gallbladder, cholecystectomy');
  assert.ok(r.macro.startsWith('(A) Received in formalin'));
  assert.ok(r.macro.includes('\n\n(B) Received in formalin'));
  assert.ok(r.macro.includes('A cystic duct lymph node is identified.'));
  assert.equal(r.blockKey, '(A) (1) Cystic duct margin. (2) Body. (3) Fundus.\n(B) (1) Cystic duct margin. (2) Body. (3) Fundus. (4) Cystic duct lymph node.');
  assert.ok(r.microscopy.startsWith('(A) Sections of the gallbladder'));
  assert.ok(r.microscopy.includes('\n\n(B) Sections of the gallbladder'));
  assert.ok(r.microscopy.includes('The cystic duct lymph node shows reactive changes only.'));
  assert.equal(r.diagnosis.split('\n')[0], '(A) GALLBLADDER, cholecystectomy - CHRONIC CHOLECYSTITIS; no evidence of dysplasia or malignancy');
  assert.equal(r.diagnosis.split('\n')[1], '(B) GALLBLADDER, cholecystectomy - CHRONIC CHOLECYSTITIS; cystic duct lymph node reactive (0/1); no evidence of dysplasia or malignancy');
});

test('each cholecystitis option yields the right capitalised diagnosis', () => {
  const dx = (cholecystitis) => run(one({ cholecystitis })).diagnosis;
  assert.equal(dx('Chronic'), 'GALLBLADDER, cholecystectomy - CHRONIC CHOLECYSTITIS; no evidence of dysplasia or malignancy');
  assert.equal(dx('Acute-on-chronic'), 'GALLBLADDER, cholecystectomy - ACUTE AND CHRONIC CHOLECYSTITIS; no evidence of dysplasia or malignancy');
  assert.equal(dx('Acute'), 'GALLBLADDER, cholecystectomy - ACUTE CHOLECYSTITIS; no evidence of dysplasia or malignancy');
  assert.equal(dx('Gangrenous'), 'GALLBLADDER, cholecystectomy - ACUTE GANGRENOUS CHOLECYSTITIS; no evidence of dysplasia or malignancy');
  assert.equal(dx('Xanthogranulomatous'), 'GALLBLADDER, cholecystectomy - XANTHOGRANULOMATOUS CHOLECYSTITIS; no evidence of dysplasia or malignancy');
  assert.equal(dx('Follicular'), 'GALLBLADDER, cholecystectomy - CHRONIC FOLLICULAR CHOLECYSTITIS; no evidence of dysplasia or malignancy');
  assert.equal(dx('Eosinophilic'), 'GALLBLADDER, cholecystectomy - EOSINOPHILIC CHOLECYSTITIS; no evidence of dysplasia or malignancy');
  assert.equal(dx('None – unremarkable'), 'GALLBLADDER, cholecystectomy - NO SIGNIFICANT ABNORMALITY; no evidence of dysplasia or malignancy');
});

test('acute-on-chronic microscopy follows the house paragraph', () => {
  const r = run(one({ cholecystitis: 'Acute-on-chronic', stones: 'Present – multiple', stoneSize: '0.5' }));
  assert.equal(r.microscopy, 'Sections of the gallbladder wall show mucosal ulceration, necrosis and acute inflammatory infiltrates extending through the full thickness of the gallbladder wall. The background shows Rokitansky-Aschoff sinus formation as well as chronic inflammatory infiltrates and thickening of the muscular wall. Features are in keeping with acute and chronic cholecystitis. There is no evidence of dysplasia or malignancy.');
  assert.ok(r.macro.includes('Multiple stones measuring up to 0.5 cm are present.'));
  assert.equal(r.diagnosis, 'GALLBLADDER, cholecystectomy - ACUTE AND CHRONIC CHOLECYSTITIS; cholelithiasis; no evidence of dysplasia or malignancy');
});

test('unremarkable gallbladder without sinuses', () => {
  const r = run(one({ cholecystitis: 'None – unremarkable', rasinuses: 'Absent', stones: 'Absent' }));
  assert.equal(r.microscopy, 'Sections of the gallbladder show mucosa lined by a single layer of columnar epithelium with an underlying muscular wall of normal thickness. There is no significant inflammation. There is no evidence of dysplasia or malignancy.');
  assert.ok(r.macro.includes('No stones are identified.'));
  assert.ok(!r.diagnosis.includes('cholelithiasis'));
});

test('secondary findings: stones, adenomyomatous hyperplasia, metaplasia, inflamed margin', () => {
  const r = run(one({ stones: 'Present – single', stoneSize: '1.2', adenomyomatous: 'Present – fundus', intestinalMetaplasia: 'Present', pyloricMetaplasia: 'Present', cysticMargin: 'Inflamed', rasinuses: 'Absent' }));
  assert.ok(r.macro.includes('A single stone measuring 1.2 cm is present.'));
  assert.equal(r.microscopy, 'Sections of the gallbladder show thickening of the muscular wall as well as a transmural chronic inflammatory infiltrate of lymphocytes and some plasma cells. The findings are consistent with chronic cholecystitis. The fundus shows adenomyomatous hyperplasia, composed of deeply penetrating, irregularly cystically dilated glands accompanied by bundles of fibromuscular proliferation. The mucosa shows focal pyloric gland metaplasia and intestinal metaplasia. The cystic duct margin shows chronic inflammation. There is no evidence of dysplasia or malignancy.');
  assert.equal(r.diagnosis, 'GALLBLADDER, cholecystectomy - CHRONIC CHOLECYSTITIS; cholelithiasis; adenomyomatous hyperplasia; intestinal metaplasia; no evidence of dysplasia or malignancy');
  const r2 = run(one({ adenomyomatous: 'Present' }));
  assert.ok(r2.microscopy.includes('There is adenomyomatous hyperplasia, composed of deeply penetrating'));
});

test('macro variants: intact, serosa, mucosa options, blocks and cystic duct node', () => {
  const r = run(one({ receivedState: 'Intact', dimensions: '7x2.5x2', wallThickness: '4', serosa: 'Fibrinous exudate', mucosa: 'Mass – describe', mucosaMass: 'Polypoid mass 1.5 cm at the fundus', cysticNode: 'Identified', blocks: '5' }));
  assert.equal(r.macro, 'Received in formalin is an intact gallbladder measuring 7 x 2.5 x 2 cm which is opened in the laboratory. The wall measures up to 4 mm in thickness. The serosa is covered by fibrinous exudate. The mucosa shows a polypoid mass 1.5 cm at the fundus. No stones are received. A cystic duct lymph node is identified. Representative sections in 5 blocks.');
  assert.equal(r.blockKey, '(1) Cystic duct margin. (2) Body. (3) Fundus. (4) Cystic duct lymph node.');
  assert.ok(run(one({ serosa: 'Perforated' })).macro.includes('The serosa is congested and a perforation is identified.'));
  assert.ok(run(one({ mucosa: 'Flattened, fibrotic' })).macro.includes('The mucosa is flattened and fibrotic.'));
  assert.ok(run(one({ mucosa: 'Ulcerated', blocks: '1' })).macro.endsWith('Representative sections in 1 block.'));
});

test('blank size, wall and stone size fields produce no dangling text', () => {
  const r = run(one({ dimensions: '', wallThickness: '', stones: 'Present – single', stoneSize: '' }));
  assert.equal(r.macro, 'Received in formalin is a gallbladder which has been opened prior to submission. The serosa is smooth. The mucosa is unremarkable. A single stone is present. Representative sections in 3 blocks.');
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.report.includes('__'));
  assert.ok(!r.report.includes('measuring  '));
  assert.ok(!/\bcm\b/.test(r.macro));
});

test('neoplasia options give a short diagnosis line and the QMH cancer template comment', () => {
  const r = run(one({ neoplasia: 'Adenocarcinoma – see comment', cholecystitis: 'Chronic', stones: 'Present – multiple', cysticNodeResult: 'Metastatic' }));
  assert.equal(r.diagnosis, 'GALLBLADDER, cholecystectomy - ADENOCARCINOMA; background chronic cholecystitis; cholelithiasis; metastatic carcinoma in cystic duct lymph node (1/1); see comment');
  assert.ok(r.microscopy.includes('Infiltrating malignant glands are present within the gallbladder wall, in keeping with adenocarcinoma; see comment. The cystic duct margin is not involved. The cystic duct lymph node contains metastatic carcinoma.'));
  assert.ok(!r.microscopy.includes('no evidence of dysplasia'));
  assert.equal(r.comment, 'Dysplasia / neoplasia is identified in the gallbladder. This benign template does not stage or grade the lesion; the QMH gallbladder cancer template should be used for the final synoptic report.');

  const hg = run(one({ neoplasia: 'High grade dysplasia (BilIN-3)', cysticMargin: 'Involved by dysplasia' }));
  assert.equal(hg.diagnosis, 'GALLBLADDER, cholecystectomy - HIGH GRADE DYSPLASIA (BilIN-3); background chronic cholecystitis; cystic duct margin involved by dysplasia; see comment');
  assert.ok(hg.microscopy.includes('The cystic duct margin is involved by dysplasia.'));
  assert.equal(run(one({ neoplasia: 'Low grade dysplasia', cholecystitis: 'None – unremarkable' })).diagnosis, 'GALLBLADDER, cholecystectomy - LOW GRADE DYSPLASIA (BilIN-1/2); see comment');
  assert.ok(run(one({ neoplasia: 'Intracholecystic papillary neoplasm' })).diagnosis.startsWith('GALLBLADDER, cholecystectomy - INTRACHOLECYSTIC PAPILLARY NEOPLASM; background chronic cholecystitis'));

  const c = createCase(schema, 2);
  c.parts[1].values.neoplasia = 'Adenocarcinoma – see comment';
  assert.ok(run(c).comment.includes('in the gallbladder (part B).'));
});

test('additional notes are appended to the microscopy', () => {
  const r = run(one({ additionalNotes: 'Bile accumulation is seen within the glands.' }));
  assert.ok(r.microscopy.endsWith('There is no evidence of dysplasia or malignancy. Bile accumulation is seen within the glands.'));
});
