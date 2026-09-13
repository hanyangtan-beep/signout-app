// Phase 4b item 17: liver (benign lesion / abscess) template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/liverbenign.js';
import { sizePhrase, marginPhrase, segmentPhrase, backgroundClause, flags } from '../generators/liverbenign.js';

const schema = JSON.parse(readFileSync(new URL('../schemas/liver_benign.json', import.meta.url), 'utf8'));
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  Object.assign(c.options, options);
  return c;
};
const BETA = 'β-catenin-activated – nuclear β-catenin, diffuse glutamine synthetase';

test('metadata: benign hepatobiliary resection with search aliases and complete defaults', () => {
  assert.equal(schema.id, 'liver_benign');
  assert.equal(schema.generator, 'liverbenign');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Hepatobiliary');
  assert.equal(schema.label, 'Liver lesion');
  assert.equal(schema.organ, 'LIVER');
  assert.equal(schema.rank, 40);
  assert.equal(schema.name, 'Liver — benign lesion / abscess');
  assert.equal(schema.shortName, 'Liver · wedge / partial hepatectomy');
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['haemangioma', 'hemangioma', 'FNH', 'hydatid', 'von Meyenburg', 'wedge']) assert.ok(schema.aliases.includes(a), a);
  assert.equal(schema.maxParts, 3);
  assert.equal(schema.defaultParts, 1);
  assert.equal(schema.version, '2026.09');
  assert.deepEqual(Object.keys(schema).slice(0, 11), ['id', 'version', 'name', 'shortName', 'label', 'organ', 'system', 'kind', 'layout', 'rank', 'aliases']);
  assert.deepEqual(schema.layout, { macroGroups: ['Macroscopy'], macroFields: ['specimenName'], pack: true });
  for (const f of schema.fields) assert.ok('default' in f, `${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is a field`);
  for (const id of ids) assert.ok(id in schema.example.parts[0].values, `example carries ${id}`);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  assert.deepEqual(macroFields, ['procedure', 'segment', 'dimensions', 'weight', 'capsule', 'lesionSize', 'lesionDescription', 'lesionOther', 'marginDistance', 'backgroundMacro', 'blocks']);
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  const lesion = schema.fields.find((f) => f.id === 'lesionType');
  assert.equal(lesion.options.length, 10);
  assert.equal(lesion.default, 'Cavernous haemangioma');
});

test('helpers: size, margin distance, segment and background clause', () => {
  assert.equal(sizePhrase('6x5x3'), '6 x 5 x 3 cm');
  assert.equal(sizePhrase('3.5'), '3.5 cm');
  assert.equal(sizePhrase('12 mm'), '12 mm');
  assert.equal(sizePhrase(''), '');
  assert.equal(marginPhrase('5'), '0.5 cm from');
  assert.equal(marginPhrase('12'), '1.2 cm from');
  assert.equal(marginPhrase('0'), 'reaching');
  assert.equal(marginPhrase(''), '');
  assert.equal(segmentPhrase({ segment: 'Segment VI.' }), 'segment VI');
  assert.equal(segmentPhrase({ segment: '' }), '');
  assert.equal(backgroundClause({ steatosis: 'None', fibrosis: 'None', inflammation: false }), '');
  assert.equal(backgroundClause({ steatosis: 'Moderate (33–66%)', fibrosis: 'Bridging', inflammation: true }), 'background liver with moderate steatosis, mild chronic inflammation and bridging fibrosis');
});

test('example: segment VI wedge, cavernous haemangioma with thrombosis and sclerosis, mild steatosis', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Liver, segment VI, wedge resection');
  assert.equal(r.macro, 'Received in formalin is a wedge of liver labelled segment VI measuring 6 x 5 x 3 cm and weighing 45 g. The capsule is intact. Sectioning shows a well-circumscribed spongy dark red lesion measuring 3.5 cm, 0.5 cm from the inked parenchymal margin. The background liver is unremarkable. Representative sections in 5 blocks.');
  assert.equal(r.blockKey, '(1-3) Lesion with closest parenchymal margin. (4) Lesion with capsule. (5) Background liver.');
  assert.equal(r.microscopy, 'Sections show a well-circumscribed lesion composed of dilated, thin-walled vascular channels lined by flattened endothelium and separated by fibrous septa, consistent with a cavernous haemangioma. Areas of thrombosis and sclerosis are seen. The lesion is completely excised. The background liver shows preserved architecture with mild macrovesicular steatosis and no significant fibrosis. There is no evidence of malignancy.');
  assert.equal(r.diagnosis, 'LIVER, segment VI, wedge resection - CAVERNOUS HAEMANGIOMA; completely excised; background liver with mild steatosis');
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('(A)'));
  assert.ok(!r.report.includes('undefined'));
});

test('default single part is the house cavernous haemangioma report without a background clause', () => {
  const r = run(createCase(schema, 1));
  assert.equal(r.specimens, 'Liver, wedge resection');
  assert.equal(r.macro, 'Received in formalin is a wedge of liver. The capsule is intact. Sectioning shows a well-circumscribed spongy dark red lesion. The background liver is unremarkable. Representative sections in 5 blocks.');
  assert.equal(r.microscopy, 'Sections show a well-circumscribed lesion composed of dilated, thin-walled vascular channels lined by flattened endothelium and separated by fibrous septa, consistent with a cavernous haemangioma. The lesion is completely excised. The background liver shows preserved architecture with no significant steatosis and no significant fibrosis. There is no evidence of malignancy.');
  assert.equal(r.diagnosis, 'LIVER, wedge resection - CAVERNOUS HAEMANGIOMA; completely excised');
  const seg = run(one({ segment: 'segment VI' }));
  assert.equal(seg.diagnosis, 'LIVER, segment VI, wedge resection - CAVERNOUS HAEMANGIOMA; completely excised');
});

test('macro option off removes the macroscopic description and block key', () => {
  const r = run(one({}, { macro: false }));
  assert.equal(r.macro, '');
  assert.equal(r.blockKey, '');
  assert.ok(!r.report.includes('Received in formalin'));
  assert.ok(!r.report.includes('Lesion with closest parenchymal margin'));
  assert.ok(r.report.startsWith('Liver, wedge resection\n\nSections show'));
});

test('headers option labels the macro and block key blocks', () => {
  const r = run(one({}, { includeHeader: true }));
  assert.ok(r.report.includes('MACROSCOPIC DESCRIPTION:\nReceived in formalin'));
  assert.ok(r.report.includes('BLOCK KEY:\n(1-3) Lesion with closest parenchymal margin. (4) Lesion with capsule. (5) Background liver.'));
});

test('two-part case keeps (A)/(B) prefixes on every block', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, segment: 'segment VI' };
  c.parts[1].values = { ...c.parts[1].values, segment: 'segment II', procedure: 'Enucleation', lesionType: 'Focal nodular hyperplasia', lesionDescription: 'Central scar', blocks: '3' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Liver, segment VI, wedge resection\n(B) Liver, segment II, enucleation');
  assert.ok(r.macro.startsWith('(A) Received in formalin is a wedge of liver labelled segment VI.'));
  assert.ok(r.macro.includes('\n\n(B) Received in formalin is an enucleated liver lesion labelled segment II. The capsule is intact. Sectioning shows a well-circumscribed tan lesion with a central stellate scar.'));
  assert.equal(r.blockKey, '(A) (1-3) Lesion with closest parenchymal margin. (4) Lesion with capsule. (5) Background liver.\n(B) (1) Lesion with closest parenchymal margin. (2) Lesion with capsule. (3) Background liver.');
  assert.ok(r.microscopy.startsWith('(A) Sections show a well-circumscribed lesion composed of dilated'));
  assert.ok(r.microscopy.includes('\n\n(B) Sections show a well-circumscribed, unencapsulated nodular lesion'));
  assert.equal(r.diagnosis.split('\n')[0], '(A) LIVER, segment VI, wedge resection - CAVERNOUS HAEMANGIOMA; completely excised');
  assert.equal(r.diagnosis.split('\n')[1], '(B) LIVER, segment II, enucleation - FOCAL NODULAR HYPERPLASIA; completely excised');
});

test('each lesion type yields the right capitalised diagnosis', () => {
  const dx = (lesionType, extra = {}) => run(one({ lesionType, segment: 'segment VI', ...extra })).diagnosis;
  const head = 'LIVER, segment VI, wedge resection - ';
  assert.equal(dx('Cavernous haemangioma'), `${head}CAVERNOUS HAEMANGIOMA; completely excised`);
  assert.equal(dx('Pyogenic abscess'), `${head}PYOGENIC ABSCESS; completely excised`);
  assert.equal(dx('Pyogenic abscess', { amoebic: true }), `${head}PYOGENIC ABSCESS; features suggestive of amoebic abscess; completely excised`);
  assert.equal(dx('Simple biliary cyst'), `${head}SIMPLE BILIARY CYST; completely excised`);
  assert.equal(dx('Ciliated foregut cyst'), `${head}CILIATED FOREGUT CYST; completely excised`);
  assert.equal(dx('Biliary hamartoma (von Meyenburg complex)'), `${head}BILIARY HAMARTOMA (VON MEYENBURG COMPLEX); completely excised`);
  assert.equal(dx('Focal nodular hyperplasia'), `${head}FOCAL NODULAR HYPERPLASIA; completely excised`);
  assert.equal(dx('Hepatocellular adenoma'), `${head}HEPATOCELLULAR ADENOMA, HNF1A-INACTIVATED; completely excised`);
  assert.equal(dx('Hepatocellular adenoma', { adenomaSubtype: 'Inflammatory – SAA / CRP positive' }), `${head}HEPATOCELLULAR ADENOMA, INFLAMMATORY TYPE; completely excised`);
  assert.equal(dx('Hepatocellular adenoma', { adenomaSubtype: BETA }), `${head}HEPATOCELLULAR ADENOMA, BETA-CATENIN-ACTIVATED; completely excised; see comment`);
  assert.equal(dx('Hepatocellular adenoma', { adenomaSubtype: 'Unclassified' }), `${head}HEPATOCELLULAR ADENOMA, UNCLASSIFIED; completely excised`);
  assert.equal(dx('Hydatid cyst'), `${head}HYDATID CYST; completely excised`);
  assert.equal(dx('Mucinous cystic neoplasm – see comment'), `${head}MUCINOUS CYSTIC NEOPLASM; completely excised; see comment`);
  assert.equal(dx('Malignant – see comment'), `${head}MALIGNANT NEOPLASM; completely excised; see comment`);
});

test('procedure options drive the specimen noun, specimen line and diagnosis head', () => {
  const r = run(one({ procedure: 'Partial hepatectomy', segment: 'segments VI and VII', dimensions: '12x9x6', weight: '320' }));
  assert.ok(r.macro.startsWith('Received in formalin is a partial hepatectomy specimen labelled segments VI and VII measuring 12 x 9 x 6 cm and weighing 320 g.'));
  assert.equal(r.specimens, 'Liver, segments VI and VII, partial hepatectomy');
  assert.ok(r.diagnosis.startsWith('LIVER, segments VI and VII, partial hepatectomy - '));
  assert.ok(run(one({ procedure: 'Segmentectomy' })).macro.startsWith('Received in formalin is a segment of liver.'));
  assert.ok(run(one({ procedure: 'Cyst deroofing', capsule: 'Not applicable', lesionDescription: 'Unilocular cyst with clear fluid', margin: 'Not assessable' })).macro.startsWith('Received in formalin is a deroofed portion of cyst wall from the liver. Sectioning shows a unilocular thin-walled cyst containing clear fluid.'));
  const typed = run(one({ specimenName: 'Liver lesion, segment IVb, wedge' }));
  assert.equal(typed.specimens, 'Liver lesion, segment IVb, wedge');
});

test('macro variants: capsule, lesion appearances, background and block counts', () => {
  const r = run(one({ capsule: 'Disrupted', lesionDescription: 'Cavity with purulent material', lesionSize: '4', marginDistance: '12', backgroundMacro: 'Steatotic', blocks: '4' }));
  assert.equal(r.macro, 'Received in formalin is a wedge of liver. The capsule is disrupted. Sectioning shows an irregular cavity containing purulent material measuring 4 cm, 1.2 cm from the inked parenchymal margin. The background liver is pale and steatotic. Representative sections in 4 blocks.');
  assert.equal(r.blockKey, '(1-2) Lesion with closest parenchymal margin. (3) Lesion with capsule. (4) Background liver.');
  assert.ok(run(one({ lesionDescription: 'Well-circumscribed tan', marginDistance: '0' })).macro.includes('Sectioning shows a well-circumscribed tan lesion, reaching the inked parenchymal margin.'));
  assert.ok(run(one({ lesionDescription: 'Other – describe', lesionOther: 'Multilocular cyst containing mucoid material.' })).macro.includes('Sectioning shows a multilocular cyst containing mucoid material.'));
  assert.ok(run(one({ backgroundMacro: 'Cirrhotic' })).macro.includes('The background liver is nodular and cirrhotic.'));
  const b2 = run(one({ blocks: '2' }));
  assert.equal(b2.blockKey, '(1) Lesion with closest parenchymal margin. (2) Background liver.');
  const b1 = run(one({ blocks: '1' }));
  assert.equal(b1.blockKey, '(1) Lesion with closest parenchymal margin.');
  assert.ok(b1.macro.endsWith('Representative sections in 1 block.'));
});

test('blank size, weight, lesion size and margin distance produce no dangling text', () => {
  const r = run(one({ dimensions: '', weight: '', lesionSize: '', marginDistance: '', segment: '' }));
  assert.equal(r.macro, 'Received in formalin is a wedge of liver. The capsule is intact. Sectioning shows a well-circumscribed spongy dark red lesion. The background liver is unremarkable. Representative sections in 5 blocks.');
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.report.includes('__'));
  assert.ok(!r.report.includes('measuring  '));
  assert.ok(!r.report.includes('labelled .'));
  assert.ok(!/\bcm\b/.test(r.macro));
  assert.ok(!/\bg\b/.test(r.macro));
});

test('haemangioma checkboxes: thrombosis alone, sclerosis alone, neither', () => {
  assert.ok(run(one({ haemThrombosis: true })).microscopy.includes('haemangioma. Areas of thrombosis are seen. The lesion'));
  assert.ok(run(one({ haemSclerosis: true })).microscopy.includes('haemangioma. Areas of sclerosis are seen. The lesion'));
  assert.ok(!run(one({})).microscopy.includes('Areas of'));
});

test('pyogenic abscess microscopy with organism stains and the amoebic pattern', () => {
  const r = run(one({ lesionType: 'Pyogenic abscess', lesionDescription: 'Cavity with purulent material' }));
  assert.equal(r.microscopy, 'Sections show a cavity containing necrotic debris and abundant neutrophils, surrounded by a wall of granulation tissue and fibrous tissue with a mixed inflammatory infiltrate, consistent with a pyogenic abscess. No organisms are identified on Gram, GMS or PAS stains. The lesion is completely excised. The background liver shows preserved architecture with no significant steatosis and no significant fibrosis. There is no evidence of malignancy.');
  assert.ok(run(one({ lesionType: 'Pyogenic abscess', abscessOrganisms: 'Bacteria on Gram' })).microscopy.includes('Gram stain demonstrates bacterial organisms within the necrotic debris; GMS and PAS stains are negative for fungal organisms.'));
  assert.ok(run(one({ lesionType: 'Pyogenic abscess', abscessOrganisms: 'Fungal organisms on GMS / PAS' })).microscopy.includes('GMS and PAS stains demonstrate fungal organisms within the necrotic debris.'));
  const np = run(one({ lesionType: 'Pyogenic abscess', abscessOrganisms: 'Stains not performed' }));
  assert.ok(!np.microscopy.includes('Gram'));
  const am = run(one({ lesionType: 'Pyogenic abscess', amoebic: true }));
  assert.ok(am.microscopy.includes('consistent with a pyogenic abscess. The necrotic debris contains trophozoites with ingested red blood cells and there is a relative paucity of neutrophils, raising the possibility of an amoebic abscess. No organisms are identified'));
});

test('cysts and hamartoma: simple biliary cyst, ciliated foregut cyst, von Meyenburg complex, hydatid', () => {
  assert.ok(run(one({ lesionType: 'Simple biliary cyst' })).microscopy.startsWith('Sections show a unilocular cyst lined by a single layer of bland cuboidal to flattened biliary-type epithelium with a thin fibrous wall, consistent with a simple biliary cyst. No ovarian-type stroma is identified. The lesion is completely excised.'));
  assert.ok(run(one({ lesionType: 'Ciliated foregut cyst' })).microscopy.startsWith('Sections show a cyst lined by ciliated pseudostratified columnar epithelium with an underlying layer of loose connective tissue, smooth muscle bundles and an outer fibrous capsule, consistent with a ciliated foregut cyst.'));
  assert.ok(run(one({ lesionType: 'Biliary hamartoma (von Meyenburg complex)' })).microscopy.startsWith('Sections show a small lesion composed of irregularly dilated bile duct-like structures lined by bland cuboidal biliary epithelium and embedded in dense fibrous stroma, consistent with a biliary hamartoma (von Meyenburg complex).'));
  const hy = run(one({ lesionType: 'Hydatid cyst' }));
  assert.ok(hy.microscopy.startsWith('Sections show a cyst with an acellular, laminated eosinophilic membrane and an inner germinal layer, surrounded by a fibrous pericyst with a chronic inflammatory infiltrate including eosinophils and palisading histiocytes. No protoscolices are identified in the sections examined. The features are consistent with a hydatid cyst (Echinococcus).'));
  assert.ok(run(one({ lesionType: 'Hydatid cyst', protoscolices: true })).microscopy.includes('histiocytes. Protoscolices with hooklets are identified. The features'));
});

test('focal nodular hyperplasia: central scar and map-like glutamine synthetase', () => {
  const r = run(one({ lesionType: 'Focal nodular hyperplasia', fnhGlutamineSynthetase: true }));
  assert.equal(r.microscopy, 'Sections show a well-circumscribed, unencapsulated nodular lesion composed of benign hepatocytes arranged in nodules separated by fibrous septa radiating from a central stellate scar, which contains thick-walled dystrophic arteries, a ductular reaction and a chronic inflammatory infiltrate. No portal tracts are present within the lesion. Glutamine synthetase immunostaining shows a map-like pattern. The features are consistent with focal nodular hyperplasia. The lesion is completely excised. The background liver shows preserved architecture with no significant steatosis and no significant fibrosis. There is no evidence of malignancy.');
  const ns = run(one({ lesionType: 'Focal nodular hyperplasia', fnhScar: false }));
  assert.ok(ns.microscopy.includes('fibrous septa containing thick-walled dystrophic arteries, a ductular reaction and a chronic inflammatory infiltrate. No central scar is seen in the sections examined. No portal tracts'));
  assert.ok(!ns.microscopy.includes('Glutamine synthetase'));
});

test('hepatocellular adenoma subtypes carry their IHC sentence; beta-catenin flags the malignant-potential comment', () => {
  const base = 'Sections show a well-circumscribed, unencapsulated proliferation of benign-appearing hepatocytes arranged in plates one to two cells thick, with unpaired arteries and an absence of portal tracts. No significant cytological atypia, pseudoglandular formation or loss of the reticulin framework is seen. ';
  const h = run(one({ lesionType: 'Hepatocellular adenoma' }));
  assert.ok(h.microscopy.startsWith(`${base}The lesional hepatocytes show diffuse steatosis and loss of LFABP expression on immunohistochemistry, in keeping with an HNF1A-inactivated hepatocellular adenoma. The lesion is completely excised.`));
  assert.equal(h.comment, '');
  const i = run(one({ lesionType: 'Hepatocellular adenoma', adenomaSubtype: 'Inflammatory – SAA / CRP positive' }));
  assert.ok(i.microscopy.includes('the lesional hepatocytes are positive for SAA and CRP on immunohistochemistry, in keeping with an inflammatory hepatocellular adenoma.'));
  const u = run(one({ lesionType: 'Hepatocellular adenoma', adenomaSubtype: 'Unclassified' }));
  assert.ok(u.microscopy.includes('Immunohistochemistry for LFABP, SAA, CRP, beta-catenin and glutamine synthetase shows no defining pattern, in keeping with an unclassified hepatocellular adenoma.'));
  const b = run(one({ lesionType: 'Hepatocellular adenoma', adenomaSubtype: BETA }));
  assert.ok(b.microscopy.includes('The lesional hepatocytes show nuclear beta-catenin expression and diffuse, strong glutamine synthetase staining on immunohistochemistry, in keeping with a beta-catenin-activated hepatocellular adenoma; see comment. The lesion is completely excised.'));
  assert.ok(b.microscopy.endsWith('There is no evidence of malignancy.'));
  assert.equal(b.comment, 'The hepatocellular adenoma shows beta-catenin activation. Beta-catenin-activated hepatocellular adenomas carry a risk of malignant transformation to hepatocellular carcinoma; complete excision with clear margins and clinical follow-up are advised.');
  assert.ok(!b.report.includes('β'));
  assert.deepEqual(flags([{ values: { lesionType: 'Hepatocellular adenoma', adenomaSubtype: BETA } }]), ['betaCateninAdenoma']);
  assert.deepEqual(flags([{ values: { lesionType: 'Cavernous haemangioma', adenomaSubtype: BETA } }]), []);
});

test('mucinous cystic neoplasm and malignant options give a short line and the QMH template comment', () => {
  const m = run(one({ lesionType: 'Mucinous cystic neoplasm – see comment' }));
  assert.ok(m.microscopy.startsWith('Sections show a multilocular cyst lined by mucinous columnar epithelium overlying a cellular ovarian-type stroma. The stromal cells are positive for ER, PR and inhibin on immunohistochemistry. The features are those of a mucinous cystic neoplasm; see comment. The lesion is completely excised.'));
  assert.ok(!m.microscopy.includes('no evidence of malignancy'));
  assert.equal(m.diagnosis, 'LIVER, wedge resection - MUCINOUS CYSTIC NEOPLASM; completely excised; see comment');
  assert.ok(m.comment.startsWith('A mucinous cystic neoplasm with ovarian-type stroma is identified in the liver. This benign template does not grade the epithelium or stage the lesion; the QMH liver / biliary cystic neoplasm template should be used'));
  assert.ok(!run(one({ lesionType: 'Mucinous cystic neoplasm – see comment', mcnIhc: false })).microscopy.includes('ER, PR'));

  const x = run(one({ lesionType: 'Malignant – see comment', margin: 'Lesion reaches the parenchymal margin' }));
  assert.ok(x.microscopy.startsWith('Sections show a malignant neoplasm within the liver parenchyma; see comment. The lesion reaches the parenchymal margin.'));
  assert.ok(!x.microscopy.includes('no evidence of malignancy'));
  assert.equal(x.diagnosis, 'LIVER, wedge resection - MALIGNANT NEOPLASM; lesion reaches the parenchymal margin; see comment');
  assert.equal(x.comment, 'A malignant neoplasm is identified in the liver. This benign template does not type, grade or stage the tumour; the QMH liver cancer template should be used for the final synoptic report.');

  const c = createCase(schema, 2);
  c.parts[1].values.lesionType = 'Malignant – see comment';
  assert.ok(run(c).comment.includes('in the liver (part B).'));
});

test('background liver: steatosis grade, fibrosis stage, inflammation and cirrhosis', () => {
  const r = run(one({ steatosis: 'Moderate (33–66%)', fibrosis: 'Bridging', inflammation: true }));
  assert.ok(r.microscopy.includes('The background liver shows preserved architecture with moderate macrovesicular steatosis, mild portal and lobular chronic inflammation and bridging fibrosis. There is no evidence of malignancy.'));
  assert.equal(r.diagnosis, 'LIVER, wedge resection - CAVERNOUS HAEMANGIOMA; completely excised; background liver with moderate steatosis, mild chronic inflammation and bridging fibrosis');
  const c = run(one({ steatosis: 'Severe (>66%)', fibrosis: 'Cirrhosis' }));
  assert.ok(c.microscopy.includes('The background liver shows an established cirrhosis with regenerative nodules surrounded by fibrous septa, with severe macrovesicular steatosis.'));
  assert.equal(c.diagnosis, 'LIVER, wedge resection - CAVERNOUS HAEMANGIOMA; completely excised; background liver with severe steatosis and cirrhosis');
  assert.ok(run(one({ fibrosis: 'Portal' })).diagnosis.endsWith('background liver with portal fibrosis'));
  assert.ok(run(one({ fibrosis: 'Periportal' })).microscopy.includes('with no significant steatosis and periportal fibrosis.'));
});

test('margin options and additional notes', () => {
  const inv = run(one({ margin: 'Lesion reaches the parenchymal margin' }));
  assert.ok(inv.microscopy.includes('The lesion reaches the parenchymal margin.'));
  assert.equal(inv.diagnosis, 'LIVER, wedge resection - CAVERNOUS HAEMANGIOMA; lesion reaches the parenchymal margin');
  const na = run(one({ margin: 'Not assessable' }));
  assert.ok(!na.microscopy.includes('excised'));
  assert.equal(na.diagnosis, 'LIVER, wedge resection - CAVERNOUS HAEMANGIOMA');
  const r = run(one({ additionalNotes: 'Foci of extramedullary haematopoiesis are noted.' }));
  assert.ok(r.microscopy.endsWith('There is no evidence of malignancy. Foci of extramedullary haematopoiesis are noted.'));
});
