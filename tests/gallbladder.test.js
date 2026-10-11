// generators/gallbladder_carcinoma.js — wording-pinned tests for the gallbladder carcinoma
// resection synoptic template (QMH GI-Gallbladder page, AJCC 8th edition). Assertions are
// inline exact strings; any wording change is deliberate and edits this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generate } from '../src/engine.js';
const schema = schemaSync('gallbladder_carcinoma');
import * as gen from '../generators/gallbladder_carcinoma.js';
import { UPGRADE_TO } from '../generators/gallbladder.js';
import { schemaSync } from './_schema.js';

const run = (c) => generate(schema, gen, c);
const flat = (t) => t.replace(/\s+/g, ' ');
const part = (over = {}) => ({ label: 'A', templateId: 'gallbladder_carcinoma', values: { ...schema.example.parts[0].values, ...over } });
const runP = (over, options = schema.example.options) => generate(schema, gen, { case: schema.example.case, parts: [part(over)], options });

test('schema shape: metadata key order, layout and field census', () => {
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.system, 'Hepatobiliary');
  assert.equal(schema.defaultParts, 1);
  assert.equal(schema.version, '2026.10');
  assert.equal(schema.source.stagingProtocol, 'gallbladder');
  assert.deepEqual(Object.keys(schema).slice(0, 11), ['id', 'version', 'name', 'shortName', 'label', 'organ', 'system', 'kind', 'layout', 'rank', 'aliases']);
  assert.deepEqual(schema.layout, { macroGroups: ['Specimen and tumour'], macroFields: ['specimenName'], pack: true });
  assert.deepEqual(schema.fields.filter((f) => f.type === 'multiselect').map((f) => f.id), ['tumourSite', 'tumourExtension', 'distantMets', 'additionalFindings']);
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  assert.ok(schema.options.some((o) => o.id === 'printPTNM' && o.default === false));
  // WHO 2019 gallbladder histologic types in the QMH page order.
  const types = schema.fields.find((f) => f.id === 'histType').options;
  assert.equal(types.length, 18);
  assert.ok(types[14] === 'Small cell neuroendocrine carcinoma' && !/^ /.test(types[14]), 'no leading space on the small cell option');
  for (const t of ['Adenocarcinoma, biliary type', 'Adenocarcinoma, intestinal type', 'Mucinous adenocarcinoma', 'Clear cell adenocarcinoma', 'Poorly cohesive carcinoma', 'Signet-ring cell carcinoma', 'Mucinous cystic neoplasm with an associated invasive carcinoma', 'Intracholecystic papillary neoplasm with associated invasive carcinoma', 'Intracholecystic tubular neoplasm with associated invasive carcinoma', 'Squamous cell carcinoma', 'Undifferentiated carcinoma, NOS', 'Large cell neuroendocrine carcinoma', 'Mixed neuroendocrine-non-neuroendocrine tumour (Mixed adenoneuroendocrine carcinoma) (specify components)']) assert.ok(types.includes(t), t);
  const ext = schema.fields.find((f) => f.id === 'tumourExtension').options;
  assert.equal(ext.length, 17);
  assert.ok(ext.includes('Directly invades other adjacent organ(s) or structure(s): Main portal vein'));
  assert.ok(!ext.some((t) => /carcinoma in situ/i.test(t)));
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const k of Object.keys(schema.example.parts[0].values)) assert.ok(ids.has(k), `example key ${k} is a field`);
});

test('specimens, macro and block key', () => {
  const c = runP();
  assert.equal(c.specimens, 'Gallbladder, fundus, radical cholecystectomy (with liver resection and lymphadenectomy)');
  assert.equal(flat(c.macro), 'Received in formalin is a radical cholecystectomy (with liver resection and lymphadenectomy) specimen measuring 90 x 45 x 25 mm. A liver wedge measuring 50 x 40 x 30 mm is attached. There is a tumour in the fundus measuring 35 x 30 x 18 mm. The mucosa is otherwise granular and shows intestinal metaplasia grossly. Representative sections are taken; see block key.');
  assert.equal(flat(c.blockKey), '(1-4) Tumour with serosa and hepatic bed. (5) Cystic duct margin.');
});

test('synoptic: example case, hepatic-side pT2b pN0, stage IIB', () => {
  const c = runP();
  const t = flat(c.microscopy);
  assert.ok(t.includes('- Procedure: Radical cholecystectomy (with liver resection and lymphadenectomy)'));
  assert.ok(t.includes('- Tumour size: 3.5 cm (unifocal invasive carcinoma, greatest dimension)'));
  assert.ok(t.includes('The tumour is a moderately differentiated adenocarcinoma, biliary type, invading the perimuscular connective tissue on the hepatic side, without liver involvement.'));
  assert.ok(t.includes('desmoplastic stroma'));
  assert.ok(t.includes('- Radial margin: Uninvolved by invasive carcinoma, 2 mm'));
  assert.ok(t.includes('- Regional lymph nodes: 6 examined; 0 involved'));
  assert.ok(t.includes('Pathological stage (AJCC 8th edition)'));
  assert.ok(t.includes('- pTNM: pT2b pN0'));
  assert.ok(t.includes('- Stage group (if cM0): IIB'));
  assert.ok(t.includes('- Cholelithiasis'));
});

test('diagnosis: example case clauses', () => {
  const c = runP();
  assert.ok(c.diagnosis.startsWith('GALLBLADDER, fundus'));
  const t = flat(c.diagnosis);
  assert.ok(t.includes('ADENOCARCINOMA, biliary type, moderately differentiated, 3.5 cm, invading the perimuscular connective tissue on the hepatic side, without liver involvement'));
  assert.ok(t.includes('perineural invasion present; other margins clear (closest 2 mm); see synoptic report'));
  assert.ok(t.includes('0 of 6 regional lymph nodes involved'));
  assert.ok(t.includes('pT2b pN0 (AJCC 8th edition), stage IIB (if cM0)'));
});

test('T4 via main portal vein or hepatic artery', () => {
  const c = runP({ tumourExtension: ['Directly invades other adjacent organ(s) or structure(s): Main portal vein'], nodesExamined: 6, nodesInvolved: 1 });
  assert.ok(flat(c.microscopy).includes('- pTNM: pT4 pN1'));
  assert.ok(flat(c.diagnosis).includes('directly invading the main portal vein'));
});

test('adjacent-organ counts: one extrahepatic organ T3, two or more T4', () => {
  const organ = 'Directly invades other adjacent organ(s) or structure(s): ';
  const c2 = runP({ tumourExtension: [`${organ}Duodenum`, `${organ}Colon`] });
  assert.ok(flat(c2.microscopy).includes('- pTNM: pT4 pN0'));
  // Serosa perforation plus one extrahepatic organ still grades T3 (stage IIIA).
  const c3 = runP({ tumourExtension: ['Perforates serosa (visceral peritoneum)', `${organ}Duodenum`] });
  assert.ok(flat(c3.microscopy).includes('- pTNM: pT3 pN0'));
  assert.ok(flat(c3.microscopy).includes('- Stage group (if cM0): IIIA'));
});

test('treatment effect adds the y descriptor and complete response flags', () => {
  const c = runP({ treatmentEffect: 'Present, with no viable cancer cells (complete response, score 0)', tumourExtension: ['No evidence of primary tumour'], histType: 'Adenocarcinoma' });
  const t = flat(c.microscopy);
  assert.ok(t.includes('- pTNM: ypT0 ypN0'));
  assert.ok(gen.validate(part({ treatmentEffect: 'Present, with no viable cancer cells (complete response, score 0)' }), {}).length > 0);
  assert.ok(flat(c.diagnosis).includes('NO RESIDUAL CARCINOMA following therapy'));
});

test('checks: T2b radial margin, simple cholecystectomy beyond muscular layer, cystic duct involvement, node counts', () => {
  const T2B = 'Invades perimuscular connective tissue on the hepatic side without liver involvement';
  const SIMPLE = 'Simple cholecystectomy (laparoscopic or open)';
  // radial not assessed
  let iss = gen.validate(part({ tumourExtension: [T2B], radialMargin: 'Cannot be assessed' }), {});
  assert.ok(iss.some((i) => /Hepatic-side \(pT2b\) disease/.test(i.message)));
  // simple cholecystectomy + T2b -> completion warn
  iss = gen.validate(part({ tumourExtension: [T2B], procedure: SIMPLE }), {});
  assert.ok(iss.some((i) => /completion radical cholecystectomy/.test(i.message)));
  // cystic duct margin involved
  iss = gen.validate(part({ cysticDuctMargin: 'Involved by invasive carcinoma' }), {});
  assert.ok(iss.some((i) => /Cystic duct margin involved/.test(i.message)));
  // fewer than 6 nodes, node-positive without ENE
  iss = gen.validate(part({ nodesExamined: 2, nodesInvolved: 1, ene: 'Not applicable' }), {});
  assert.ok(iss.some((i) => /Fewer than 6 regional lymph nodes/.test(i.message)));
  assert.ok(iss.some((i) => /Extranodal extension is not recorded/.test(i.message)));
  // errors
  iss = gen.validate(part({ tumourExtension: [], nodesExamined: '', nodesInvolved: '' }), {});
  const msgs = iss.map((i) => i.message).join(' | ');
  assert.ok(/Tumour extension is required/.test(msgs));
  assert.ok(/Number of regional lymph nodes examined is required/.test(msgs));
  iss = gen.validate(part({ nodesExamined: 2, nodesInvolved: 3 }), {});
  assert.ok(iss.some((i) => /exceed the number examined/.test(i.message)));
});

test('typed histology notes suppress the derived sentences', () => {
  const c = runP({ histologyNotes: 'Custom sentence entered by the pathologist' });
  assert.ok(flat(c.microscopy).includes('Custom sentence entered by the pathologist.'));
  assert.ok(!flat(c.microscopy).includes('The tumour is a'));
});

test('typed specimen name wins; pTNM hidden without the printPTNM option', () => {
  const c = runP({ specimenName: 'Gallbladder, cholecystectomy' }, { ...schema.example.options, printPTNM: false });
  assert.ok(c.diagnosis.startsWith('GALLBLADDER, cholecystectomy'));
  assert.ok(!flat(c.microscopy).includes('pTNM:'));
  assert.ok(!flat(c.diagnosis).includes('AJCC 8th edition'));
});

test('override: typed pTNM wins, echo keeps the derived pair and the reason', () => {
  const c = runP({ tnmOverride: 'pT3 pN1', tnmOverrideReason: 'direct duodenal involvement seen in one block' });
  assert.ok(flat(c.microscopy).includes('- pTNM: pT3 pN1 [pathologist override; derived T2b/N0 - direct duodenal involvement seen in one block]'));
});

test('upgrade: benign cholecystectomy maps to the synoptic', () => {
  assert.ok(!UPGRADE_TO.when({ neoplasia: 'No dysplasia or malignancy' }));
  assert.ok(!UPGRADE_TO.when({ neoplasia: 'Low grade dysplasia' }));
  assert.ok(UPGRADE_TO.when({ neoplasia: 'Adenocarcinoma – see comment' }));
  assert.ok(UPGRADE_TO.when({ neoplasia: 'Intracholecystic papillary neoplasm' }));
  assert.equal(UPGRADE_TO.to, 'gallbladder_carcinoma');
  const m = UPGRADE_TO.map({
    specimenName: '',
    neoplasia: 'Adenocarcinoma – see comment',
    cysticMargin: 'Involved by dysplasia',
    cysticNodeResult: 'Metastatic',
    stones: 'Present – multiple',
    cholecystitis: 'Chronic',
    intestinalMetaplasia: 'Present'
  });
  assert.equal(m.histType, 'Adenocarcinoma, biliary type');
  assert.deepEqual(m.tumourSite, ['Not specified']);
  assert.equal(m.hgIEN, 'High-grade intraepithelial neoplasia present at the bile duct margin');
  assert.equal(m.nodesInvolved, 1);
  assert.deepEqual(m.additionalFindings.sort(), ['Cholelithiasis', 'Chronic cholecystitis', 'Intestinal metaplasia'].sort());
  const icpn = UPGRADE_TO.map({ neoplasia: 'Intracholecystic papillary neoplasm', stones: 'Absent', cholecystitis: 'None – unremarkable', intestinalMetaplasia: 'Absent' });
  assert.equal(icpn.histType, 'Intracholecystic papillary neoplasm with associated invasive carcinoma');
});
