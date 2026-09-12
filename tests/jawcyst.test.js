// Phase 4b item 18: dental / jaw cyst enucleation template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/jawcyst.js';
import { sizePhrase, regionPhrase, toothPhrase, siteWord } from '../generators/jawcyst.js';

const schema = JSON.parse(readFileSync(new URL('../schemas/jaw_cyst.json', import.meta.url), 'utf8'));
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  Object.assign(c.options, options);
  return c;
};

const RADICULAR_MICRO = 'Sections show a cyst lined by non-keratinised stratified squamous epithelium of variable thickness with arcading, supported by a fibrous wall containing a moderate chronic inflammatory infiltrate, cholesterol clefts and foamy macrophages. Rushton bodies are seen within the lining. The findings are those of a radicular cyst. There is no evidence of dysplasia or malignancy.';

test('metadata: benign head and neck resection with search aliases and complete defaults', () => {
  assert.equal(schema.id, 'jaw_cyst');
  assert.equal(schema.generator, 'jawcyst');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Head and neck');
  assert.equal(schema.name, 'Dental / jaw cyst');
  assert.equal(schema.label, 'Jaw cyst');
  assert.equal(schema.organ, 'MANDIBLE');
  assert.equal(schema.rank, 41);
  assert.equal(schema.shortName, 'Jaw · cyst enucleation');
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['dental cyst', 'jaw cyst', 'radicular cyst', 'periapical', 'dentigerous', 'odontogenic keratocyst', 'OKC', 'keratocyst', 'odontogenic', 'ameloblastoma', 'tooth', 'apicectomy', 'enucleation', 'periapical granuloma']) assert.ok(schema.aliases.includes(a), a);
  assert.equal(schema.maxParts, 3);
  assert.equal(schema.defaultParts, 1);
  assert.equal(schema.version, '2026.09');
  assert.deepEqual(Object.keys(schema).slice(0, 13), ['id', 'version', 'name', 'shortName', 'label', 'organ', 'system', 'kind', 'rank', 'aliases', 'match', 'macroExtract', 'specimenNoun']);
  for (const f of schema.fields) assert.ok('default' in f, `${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is a field`);
  for (const id of ids) assert.ok(id in schema.example.parts[0].values, `example sets ${id}`);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  assert.deepEqual(macroFields, ['fragments', 'aggregateSize', 'wallThickness', 'contents', 'toothIncluded', 'toothPart', 'blocks']);
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  assert.deepEqual(schema.fields.find((f) => f.id === 'site').options, ['Mandible', 'Maxilla']);
  assert.equal(schema.fields.find((f) => f.id === 'cystType').options.length, 10);
  assert.deepEqual(schema.fields.find((f) => f.id === 'satelliteCysts').showIf, { field: 'cystType', is: 'Odontogenic keratocyst' });
  assert.deepEqual(schema.fields.find((f) => f.id === 'buddingBasal').showIf, { field: 'cystType', is: 'Odontogenic keratocyst' });
  assert.equal(schema.fields.find((f) => f.id === 'tumourSubtype').showIf.field, 'cystType');
  assert.equal(schema.snippets.length, 3);
});

test('helpers: size, region, tooth and site phrases', () => {
  assert.equal(sizePhrase('1.5x1x0.3'), '1.5 x 1 x 0.3 cm');
  assert.equal(sizePhrase('2 X 1 × 0.5 cm'), '2 x 1 x 0.5 cm');
  assert.equal(sizePhrase(''), '');
  assert.equal(regionPhrase({ specimenName: 'left posterior mandible, 36 region' }), 'left posterior, 36 region');
  assert.equal(regionPhrase({ specimenName: 'left posterior' }), 'left posterior');
  assert.equal(regionPhrase({ specimenName: 'anterior maxilla.' }), 'anterior');
  assert.equal(regionPhrase({ specimenName: '' }), '');
  assert.equal(toothPhrase({ toothNumber: '36' }), '36 region');
  assert.equal(toothPhrase({ toothNumber: '11 region' }), '11 region');
  assert.equal(toothPhrase({ toothNumber: '' }), '');
  assert.equal(siteWord({ site: 'Maxilla' }), 'Maxilla');
  assert.equal(siteWord({ site: '' }), 'Mandible');
});

test('example: radicular cyst, left posterior mandible, enucleation with tooth root — house diagnosis line', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Mandible, left posterior, 36 region, enucleation');
  assert.equal(r.macro, 'Received in formalin are multiple fragments of cyst wall measuring 1.5 x 1 x 0.3 cm in aggregate, together with a tooth root. All soft tissue embedded in 1 block; the tooth is not processed.');
  assert.equal(r.blockKey, '(1) Cyst wall, all embedded. Tooth retained, not processed.');
  assert.equal(r.microscopy, RADICULAR_MICRO);
  assert.equal(r.diagnosis, 'MANDIBLE, left posterior, enucleation - RADICULAR CYST; no evidence of dysplasia or malignancy');
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('(A)'));
  assert.ok(!r.report.includes('undefined'));
});

test('macro and block key print with (1)…(2) numbering and disappear when options.macro is false', () => {
  const on = run(one({ blocks: '2', toothIncluded: false, fragments: '3', aggregateSize: '2 x 1.5 x 0.4', wallThickness: '0.2', contents: ['Clear / straw fluid', 'Cheesy keratin'] }));
  assert.equal(on.macro, 'Received in formalin are 3 fragments of cyst wall measuring 2 x 1.5 x 0.4 cm in aggregate. The cyst wall measures up to 0.2 cm in thickness. The cyst contains clear straw-coloured fluid and cheesy keratinous material. All embedded in 2 blocks.');
  assert.equal(on.blockKey, '(1-2) Cyst wall, all embedded.');
  const single = run(one({ fragments: '1', aggregateSize: '1.2 x 0.8 x 0.3', toothIncluded: true, toothPart: 'Apex', contents: ['Purulent'] }));
  assert.equal(single.macro, 'Received in formalin is a single fragment of cyst wall measuring 1.2 x 0.8 x 0.3 cm, together with a root apex. The cyst contains purulent material. All soft tissue embedded in 1 block; the tooth is not processed.');
  const off = run(one({}, { macro: false }));
  assert.equal(off.macro, '');
  assert.equal(off.blockKey, '');
  assert.ok(!off.report.includes('Received in formalin'));
  assert.ok(!off.report.includes('(1)'));
  assert.ok(off.report.startsWith('Mandible, enucleation\n\nSections show'));
});

test('headers option labels the macro and block key blocks', () => {
  const r = run(one({}, { includeHeader: true }));
  assert.ok(r.report.includes('MACROSCOPIC DESCRIPTION:\nReceived in formalin are multiple fragments of cyst wall'));
  assert.ok(r.report.includes('BLOCK KEY:\n(1) Cyst wall, all embedded.'));
});

test('two-part case keeps (A)/(B) prefixes on every block', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, specimenName: 'left posterior', toothNumber: '36' };
  c.parts[1].values = { ...c.parts[1].values, specimenName: 'anterior', site: 'Maxilla', procedure: 'Apicectomy', toothNumber: '11', cystType: 'Residual cyst', blocks: '2' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Mandible, left posterior, 36 region, enucleation\n(B) Maxilla, anterior, 11 region, apicectomy');
  assert.ok(r.macro.startsWith('(A) Received in formalin'));
  assert.ok(r.macro.includes('\n\n(B) Received in formalin'));
  assert.equal(r.blockKey, '(A) (1) Cyst wall, all embedded.\n(B) (1-2) Cyst wall, all embedded.');
  assert.ok(r.microscopy.startsWith('(A) Sections show'));
  assert.ok(r.microscopy.includes('\n\n(B) Sections show'));
  assert.equal(r.diagnosis, '(A) MANDIBLE, left posterior, enucleation - RADICULAR CYST; no evidence of dysplasia or malignancy\n(B) MAXILLA, anterior, apicectomy - RESIDUAL CYST; no evidence of dysplasia or malignancy');
  for (const block of [r.specimens, r.macro, r.blockKey, r.microscopy, r.diagnosis]) assert.ok(block.includes('(A)') && block.includes('(B)'));
});

test('each cyst type yields the right capitalised diagnosis', () => {
  const dx = (cystType, extra = {}) => run(one({ specimenName: 'left posterior', cystType, ...extra })).diagnosis;
  const H = 'MANDIBLE, left posterior, enucleation - ';
  const N = '; no evidence of dysplasia or malignancy';
  assert.equal(dx('Radicular (periapical) cyst'), `${H}RADICULAR CYST${N}`);
  assert.equal(dx('Residual cyst'), `${H}RESIDUAL CYST${N}`);
  assert.equal(dx('Dentigerous cyst'), `${H}DENTIGEROUS CYST${N}`);
  assert.equal(dx('Odontogenic keratocyst'), `${H}ODONTOGENIC KERATOCYST${N}`);
  assert.equal(dx('Odontogenic keratocyst', { satelliteCysts: true }), `${H}ODONTOGENIC KERATOCYST; satellite cysts present${N}`);
  assert.equal(dx('Lateral periodontal cyst'), `${H}LATERAL PERIODONTAL CYST${N}`);
  assert.equal(dx('Botryoid odontogenic cyst'), `${H}BOTRYOID ODONTOGENIC CYST${N}`);
  assert.equal(dx('Glandular odontogenic cyst'), `${H}GLANDULAR ODONTOGENIC CYST${N}`);
  assert.equal(dx('Nasopalatine duct cyst', { site: 'Maxilla', specimenName: 'anterior' }), `MAXILLA, anterior, enucleation - NASOPALATINE DUCT CYST${N}`);
  assert.equal(dx('Periapical granuloma (no lining)', { procedure: 'Apicectomy' }), 'MANDIBLE, left posterior, apicectomy - PERIAPICAL GRANULOMA; no epithelial lining identified; no evidence of malignancy');
  assert.equal(dx('Radicular (periapical) cyst', { inflammation: 'Severe', procedure: 'Extraction with cyst' }), `MANDIBLE, left posterior, extraction with cyst - RADICULAR CYST; heavily inflamed${N}`);
});

test('lining description follows the cyst type', () => {
  const micro = (cystType, extra = {}) => run(one({ cystType, ...extra })).microscopy;
  const clean = { inflammation: 'None', cholesterolClefts: false, rushtonBodies: false, foamyMacrophages: false };
  assert.equal(micro('Radicular (periapical) cyst', clean), 'Sections show a cyst lined by non-keratinised stratified squamous epithelium of variable thickness with arcading, supported by a fibrous wall. The findings are those of a radicular cyst. There is no evidence of dysplasia or malignancy.');
  assert.equal(micro('Dentigerous cyst', clean), 'Sections show a cyst lined by thin, regular non-keratinised epithelium two to four cells thick resembling reduced enamel epithelium, supported by a fibrous wall. The findings are those of a dentigerous cyst. There is no evidence of dysplasia or malignancy.');
  assert.equal(micro('Odontogenic keratocyst', { ...clean, satelliteCysts: true, buddingBasal: true }), 'Sections show a cyst lined by parakeratinised stratified squamous epithelium of uniform thickness, five to eight cells thick, with a corrugated surface and a palisaded, hyperchromatic basal layer, supported by a fibrous wall. Satellite (daughter) cysts are present within the wall. Budding of the basal layer into the wall is seen. The findings are those of an odontogenic keratocyst. There is no evidence of dysplasia or malignancy.');
  // OKC-only findings are ignored for other cyst types even if the hidden checkboxes remain ticked
  assert.ok(!micro('Radicular (periapical) cyst', { ...clean, satelliteCysts: true, buddingBasal: true }).includes('Satellite'));
  assert.ok(micro('Residual cyst', clean).includes('The findings are those of a residual (radicular) cyst.'));
  assert.ok(micro('Lateral periodontal cyst', clean).includes('one to three cells thick with focal plaque-like thickenings of clear cells, supported by a fibrous wall. The findings are those of a lateral periodontal cyst.'));
  assert.ok(micro('Botryoid odontogenic cyst', clean).includes('arranged as multiple cystic spaces, supported by a fibrous wall. The findings are those of a botryoid odontogenic cyst.'));
  assert.ok(micro('Glandular odontogenic cyst', clean).includes('eosinophilic cuboidal to columnar cells, intraepithelial microcysts, mucous cells and epithelial whorls, supported by a fibrous wall. The findings are those of a glandular odontogenic cyst.'));
  assert.ok(micro('Nasopalatine duct cyst', clean).includes('ciliated respiratory-type epithelium, supported by a fibrous wall. Neurovascular bundles are present within the wall. The findings are those of a nasopalatine duct cyst.'));
  assert.equal(micro('Periapical granuloma (no lining)', { ...clean, cholesterolClefts: true, foamyMacrophages: true }), 'Sections show inflamed granulation tissue and fibrous tissue containing a dense mixed chronic inflammatory infiltrate rich in plasma cells and lymphocytes, with cholesterol clefts and foamy macrophages. No epithelial lining is identified. The findings are those of a periapical granuloma. There is no evidence of malignancy.');
});

test('inflammation grade and wall findings are listed in one clause; Rushton bodies get their own sentence', () => {
  const m = (extra) => run(one({ inflammation: 'None', cholesterolClefts: false, rushtonBodies: false, foamyMacrophages: false, ...extra })).microscopy;
  assert.ok(m({ inflammation: 'Mild' }).includes('supported by a fibrous wall containing a mild chronic inflammatory infiltrate. The findings'));
  assert.ok(m({ inflammation: 'Severe', cholesterolClefts: true }).includes('containing a dense mixed inflammatory infiltrate and cholesterol clefts. The findings'));
  assert.ok(m({ foamyMacrophages: true }).includes('supported by a fibrous wall containing foamy macrophages. The findings'));
  assert.ok(m({ rushtonBodies: true }).includes('supported by a fibrous wall. Rushton bodies are seen within the lining. The findings'));
});

test('OKC and glandular odontogenic cyst auto-tick their recurrence comments', () => {
  const okc = run(one({ cystType: 'Odontogenic keratocyst' }));
  assert.equal(okc.comment, 'Odontogenic keratocysts have a recurrence risk and clinical and radiological follow-up is advised; if multiple, evaluation for Gorlin syndrome may be considered.');
  const goc = run(one({ cystType: 'Glandular odontogenic cyst' }));
  assert.ok(goc.comment.startsWith('Glandular odontogenic cysts have a significant recurrence rate'));
  assert.ok(goc.comment.includes('follow-up is advised.'));
  assert.equal(run(one({ cystType: 'Dentigerous cyst' })).comment, '');
});

test('odontogenic tumour options give a short diagnosis line and the QMH head and neck template comment', () => {
  const t = (tumourSubtype) => run(one({ specimenName: 'left posterior', cystType: 'Odontogenic tumour – see comment', tumourSubtype }));
  const uni = t('Unicystic ameloblastoma');
  assert.equal(uni.diagnosis, 'MANDIBLE, left posterior, enucleation - UNICYSTIC AMELOBLASTOMA; see comment');
  assert.ok(uni.microscopy.startsWith('Sections show a cyst lined by odontogenic epithelium with a palisaded columnar basal layer showing reverse nuclear polarity'));
  assert.ok(uni.microscopy.endsWith('The features are those of a unicystic ameloblastoma; see comment.'));
  assert.ok(!uni.microscopy.includes('no evidence of'));
  assert.equal(uni.comment, 'An odontogenic tumour is identified. This benign cyst template does not classify or stage the lesion; the QMH head and neck template should be used for the final report, and correlation with the radiological extent of the lesion is recommended.');
  assert.equal(t('Conventional ameloblastoma').diagnosis, 'MANDIBLE, left posterior, enucleation - AMELOBLASTOMA, CONVENTIONAL; see comment');
  assert.ok(t('Conventional ameloblastoma').microscopy.includes('The features are those of a conventional ameloblastoma; see comment.'));
  assert.equal(t('Odontoma').diagnosis, 'MANDIBLE, left posterior, enucleation - ODONTOMA; see comment');
  assert.ok(t('Odontoma').microscopy.includes('dentine, enamel matrix, cementum and pulpal tissue'));
  assert.equal(t('Other').diagnosis, 'MANDIBLE, left posterior, enucleation - ODONTOGENIC TUMOUR; see comment');
  assert.equal(t('Other').microscopy, 'Sections show an odontogenic tumour; see comment.');
  const c = createCase(schema, 2);
  c.parts[1].values.cystType = 'Odontogenic tumour – see comment';
  assert.ok(run(c).comment.includes('is identified (part B).'));
});

test('blank size, wall, tooth and region fields produce no dangling text', () => {
  const r = run(one({ specimenName: '', toothNumber: '', fragments: '', aggregateSize: '', wallThickness: '', contents: [], toothIncluded: false }));
  assert.equal(r.specimens, 'Mandible, enucleation');
  assert.equal(r.macro, 'Received in formalin are multiple fragments of cyst wall. All embedded in 1 block.');
  assert.equal(r.blockKey, '(1) Cyst wall, all embedded.');
  assert.equal(r.diagnosis, 'MANDIBLE, enucleation - RADICULAR CYST; no evidence of dysplasia or malignancy');
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.report.includes('__'));
  assert.ok(!r.report.includes('measuring  '));
  assert.ok(!/\bcm\b/.test(r.macro));
  const region = run(one({ specimenName: 'left posterior mandible, 36 region', toothNumber: '' }));
  assert.equal(region.specimens, 'Mandible, left posterior, 36 region, enucleation');
  assert.equal(region.diagnosis, 'MANDIBLE, left posterior, 36 region, enucleation - RADICULAR CYST; no evidence of dysplasia or malignancy');
  const wallOnly = run(one({ aggregateSize: '', wallThickness: '0.3', toothIncluded: true, toothPart: 'Whole tooth' }));
  assert.ok(wallOnly.macro.startsWith('Received in formalin are multiple fragments of cyst wall, together with a tooth. The cyst wall measures up to 0.3 cm in thickness.'));
});

test('additional notes are appended to the microscopy', () => {
  const r = run(one({ additionalNotes: 'Fragments of vital lamellar bone are included.' }));
  assert.ok(r.microscopy.endsWith('There is no evidence of dysplasia or malignancy. Fragments of vital lamellar bone are included.'));
});
