// Liver explant, the native liver removed at transplant — Phase 82 (29 October 2026), the second card of the liver
// transplant pair (docs/specs/liver-transplant-pair.md). The gross follows the RCPath liver dataset G050 and the
// UCLA total hepatectomy protocol; the background liver is the HCC form's (generators/liver_background.js); HCC is
// staged on the HCC synoptic linked under the same letter. Wording is deliberate; change the strings only on purpose.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTemplate, loadManifest } from '../src/registry.js';
import { defaultValues, generateCase, relabel, isVisible } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import * as gen from '../generators/liver_explant.js';
import * as hccGen from '../generators/hcc.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'liver_explant');
const UPDATE = process.env.UPDATE_FIXTURES === '1';
const ex = await loadTemplate('liver_explant');
const hcc = await loadTemplate('hcc');
const lb = await loadTemplate('liver_biopsy');
const { schema: benign } = await loadTemplate('liver_benign');
const { schema } = ex;
const manifest = await loadManifest();
const REG = { liver_explant: ex, hcc, liver_biopsy: lb };
const field = (id) => schema.fields.find((f) => f.id === id);
const hccField = (id) => hcc.schema.fields.find((f) => f.id === id);
const { HCC, TREATED } = gen;
const HGDN = 'High-grade dysplastic nodule';
const LGDN = 'Low-grade dysplastic nodule';
const LARGE = 'Present, large vessel invasion (major branch of hepatic vein or portal vein)';
const EXAMPLE = schema.example.parts[0].values;
const D = () => defaultValues(schema);
const part = (values = {}, label = 'A') => ({ label, values: { ...D(), ...values } });
const strip = (s) => s.replace(/^\(A\) /, '');
const macro = (p) => strip(gen.macro(p));
const micro = (p) => strip(gen.microscopy(p));
const dx = (p) => strip(gen.diagnosis(p));
const msgs = (p, ctx) => gen.validate(p, ctx).map((m) => `${m.level}:${m.field || ''}:${m.message}`).join(' | ');
const OPTS = { includeHeader: false, macro: true };
/** A case through the engine: each part opens on its form's defaults. */
const runCase = (parts, options = OPTS) => generateCase(REG, {
  caseTitle: '', options,
  parts: relabel(parts.map((p) => ({ ...p, values: { ...defaultValues(REG[p.templateId].schema), ...p.values } })))
});
const explant = (values) => ({ templateId: 'liver_explant', values });
/** The HCC synoptic as "Add HCC synoptic" opens it: its defaults, the explant's pre-fill, then what the pathologist adds. */
const linkedHcc = (exValues, patch = {}) => ({ templateId: 'hcc', linked: true, values: { ...gen.prefillPaired({ ...D(), ...exValues }), ...patch } });
const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line, history = '') => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
};
const issueText = (out) => out.issues.map((m) => `${m.level}:${m.field || ''}:${m.message}`).join(' | ');

// Case values shared by the tests and the golden fixtures.
const NO_NODULE = { noduleCount: 0, n1Seg: '', n1Mm: '', n1Desc: '', n1Histo: '' };
const F01 = { ...EXAMPLE, ...NO_NODULE, blockKeyText: '1-2 Hilar margins en face\n3 Portal vein thrombus\n4-7 Background liver\n8 Gallbladder\n9 Hilar lymph nodes' };
const F02 = {
  ...EXAMPLE, weightG: '1380', dims: '23 x 16 x 9', thrombus: [], thrombusDetail: '', gbDetail: '', nodesFound: '2', noduleCount: 2,
  n1Seg: '6', n1Mm: '20', n1Desc: 'necrotic, with a lipiodol-stained rim', n1Histo: TREATED,
  n2Seg: '8', n2Mm: '25', n2Desc: 'tan, bulging, partly necrotic', n2Histo: HCC, n2Nec: '40', n2Viable: '15',
  causeFeatures: [], blockKeyText: '1-2 Hilar margins en face\n3-4 Nodule 1\n5-8 Nodule 2\n9-12 Background liver\n13 Gallbladder\n14 Hilar lymph nodes'
};
const F02_HCC = { treatment: 'TACE' };
const F03 = {
  ...D(), weightG: '1240', dims: '21 x 15 x 9', background: 'Bile-stained', nodesFound: '4', sliceMm: '5',
  bgFindings: ['Cirrhosis', 'Other (specify)'], bgOther: 'Primary sclerosing cholangitis', bgStage: '6',
  causeFeatures: ['Periductal concentric fibrosis', 'Bile duct loss', 'Copper-associated protein'], incidental: ['Low-grade BilIN'],
  blockKeyText: '1 Hilar margins en face\n2-3 Hilar bile ducts\n4-9 Background liver\n10 Gallbladder\n11 Hilar lymph nodes'
};
const F04 = {
  ...D(), weightG: '820', dims: '19 x 13 x 6', background: 'Massive necrosis', gallbladder: 'Absent', nodesFound: '1', sliceMm: '5',
  bgFindings: ['None identified'], necrosisPct: '85', necrosisZone: 'Panacinar', necrosisFeatures: ['Parenchymal collapse', 'Ductular reaction'],
  blockKeyText: '1 Hilar margins en face\n2-8 Liver parenchyma, all segments\n9 Hilar lymph node'
};
const F05A = {
  ...D(), weightG: '1560', dims: '24 x 17 x 10', nodularity: 'Mixed', nodesFound: '2', sliceMm: '5', imagingMatch: 'All imaging lesions identified',
  bgFindings: ['Cirrhosis', 'Steatohepatitis'], bgSteatosisPct: '15', bgStage: '6', activity: 'Mild', causeFeatures: ['Mallory-Denk bodies'],
  cellChange: ['Large cell change'], gallbladderHisto: 'No significant abnormality',
  blockKeyText: '1 Hilar margins en face\n2-7 Background liver\n8 Gallbladder\n9 Hilar lymph nodes'
};
const F05B = {
  specimenName: 'donor, wedge', pattern: 'Donor (time zero)', dnTiming: 'Post-reperfusion', dnSample: 'Wedge', portalTracts: '14',
  dnLdfPct: '10', dnSdfPct: '20', dnIri: 'Mild', dnNecrosisPct: '0', portalInfl: 'Minimal', lobular: 'Absent', stageSystem: 'Ishak'
};

// ---------- the form ----------

test('metadata: a hepatobiliary benign resection listed after the benign liver form, packed, with complete defaults', () => {
  assert.equal(schema.id, 'liver_explant');
  assert.equal(schema.generator, 'liver_explant');
  assert.equal(schema.organ, 'LIVER');
  assert.equal(schema.system, 'Hepatobiliary');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.label, 'Liver explant');
  assert.equal(schema.specimenNoun, 'liver explant');
  assert.equal(schema.maxParts, 3);
  assert.equal(schema.rank, 41);
  assert.ok(schema.rank > benign.rank);
  assert.ok(schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
  assert.deepEqual(schema.layout, { pack: true, macroGroups: ['Macroscopy', 'Nodules'], macroFields: ['specimenName'] });
  const ids = schema.fields.map((f) => f.id);
  for (const p of schema.example.parts) for (const id of ids) assert.ok(id in p.values, `example part ${p.label} has ${id}`);
  assert.equal(manifest.find((t) => t.id === 'liver_explant')?.label, 'Liver explant');
});

test('options: the background liver is the HCC form\'s, less the dysplastic nodules, which the nodule table records', () => {
  assert.deepEqual(field('bgFindings').options, hccField('bgFindings').options.filter((o) => !/dysplastic nodule/.test(o)));
  assert.deepEqual(field('bgFindings').default, ['Cirrhosis']);
  for (const id of ['bgStageSystem', 'bgStage', 'bgAetiology', 'bgAetiologyOther', 'bgSteatosisPct', 'bgOther']) {
    assert.deepEqual(field(id).options, hccField(id).options, id);
    assert.deepEqual(field(id).showIf, hccField(id).showIf, id);
  }
  assert.equal(field('bgStageSystem').default, 'Ishak');
  const histo = ['', HCC, TREATED, HGDN, LGDN, 'Large regenerative nodule', 'Other'];
  for (let i = 1; i <= 5; i += 1) {
    for (const k of ['Seg', 'Mm', 'Desc', 'Histo', 'Nec', 'Viable', 'Other']) assert.ok(field(`n${i}${k}`), `n${i}${k}`);
    assert.deepEqual(field(`n${i}Histo`).options, histo, `n${i}Histo`);
  }
  assert.equal(field('noduleCount').max, 5);
  assert.deepEqual(field('tumour').options, ['', 'None', HCC, 'Other malignancy']);
  assert.deepEqual(field('background').options, ['Cirrhotic', 'Fibrotic', 'Bile-stained', 'Nutmeg', 'Massive necrosis', 'Normal']);
  assert.deepEqual(field('cellChange').options, ['Large cell change', 'Small cell change']);
  assert.deepEqual(field('necrosisPattern').options, ['Massive', 'Submassive']);
});

test('visibility: nodule rows by the count, necrosis and viable size for HCC, the necrosis group for an acute liver failure explant', () => {
  const v = (x) => ({ ...D(), ...x });
  assert.equal(isVisible(field('n1Seg'), v({})), false);
  assert.equal(isVisible(field('n1Seg'), v({ noduleCount: 1 })), true);
  assert.equal(isVisible(field('n2Seg'), v({ noduleCount: 1 })), false);
  assert.equal(isVisible(field('n2Seg'), v({ noduleCount: 2 })), true);
  assert.equal(isVisible(field('n1Nec'), v({ noduleCount: 1, n1Histo: HGDN })), false);
  assert.equal(isVisible(field('n1Viable'), v({ noduleCount: 1, n1Histo: HCC })), true);
  assert.equal(isVisible(field('n1Other'), v({ noduleCount: 1, n1Histo: 'Other' })), true);
  assert.equal(isVisible(field('moreNodules'), v({ noduleCount: 4 })), false);
  assert.equal(isVisible(field('moreNodules'), v({ noduleCount: 5 })), true);
  assert.equal(isVisible(field('nodularity'), v({ background: 'Fibrotic' })), false);
  assert.equal(isVisible(field('thrombusDetail'), v({})), false);
  assert.equal(isVisible(field('thrombusHisto'), v({ thrombus: ['Portal vein'] })), true);
  for (const id of ['necrosisPct', 'necrosisPattern', 'necrosisZone', 'necrosisFeatures']) {
    assert.equal(isVisible(field(id), v({})), false, id);
    assert.equal(isVisible(field(id), v({ background: 'Massive necrosis' })), true, id);
  }
  assert.equal(isVisible(field('nodesHisto'), v({ nodesFound: '0' })), false);
  assert.equal(isVisible(field('gallbladderHisto'), v({ gallbladder: 'Absent' })), false);
});

// ---------- specimen and macroscopy ----------

test('specimen and head: a native liver at total hepatectomy unless the name says otherwise', () => {
  assert.equal(gen.specimenName(part()), 'Native liver, total hepatectomy');
  assert.equal(gen.organPhrase(part()), 'LIVER, native, total hepatectomy');
  for (const [name, head] of [['Liver, explant', 'LIVER, explant'], ['Liver explant', 'LIVER, explant'], ['Explanted liver', 'LIVER, explanted'],
    ['Recipient liver, total hepatectomy', 'LIVER, recipient, total hepatectomy'], ['Whole liver', 'WHOLE LIVER']]) {
    assert.equal(gen.organPhrase(part({ specimenName: name })), head, name);
  }
});

test('segments: numbers, S numbers, Roman numerals and pairs read as segments; other text as typed', () => {
  for (const [s, w] of [['6', 'segment 6'], ['S6', 'segment 6'], ['VI', 'segment 6'], ['segment 4a', 'segment 4a'], ['5/6', 'segments 5 and 6'],
    ['S2, S3', 'segments 2 and 3'], ['seg 7 and 8', 'segments 7 and 8'], ['Caudate lobe', 'caudate lobe'], ['', '']]) {
    assert.equal(gen.segWords(s), w, s);
  }
});

test('macroscopy: the example explant in the order of the UCLA protocol', () => {
  assert.equal(macro(part(EXAMPLE)), 'Received fresh is a native liver weighing 1150 g and measuring 22 x 15 x 10 cm. The hilar margins (bile duct, portal vein and hepatic artery) are submitted en face. Thrombus is present in the portal vein, occluding the main trunk, adherent to the wall. The gallbladder is attached (8 cm, wall 2 mm, no stones). Three hilar lymph nodes are identified. The liver is serially sliced at 5 mm intervals. The parenchyma is diffusely micronodular. Nodule 1, in segment 6, measures 12 mm and is pale, bulging, distinct from the background nodules. All lesions described on imaging are identified. Representative sections are taken; see block key.');
});

test('macroscopy: fixation, adherent structures, vessels, gallbladder, nodes and each gross background', () => {
  const m = macro(part({ fixation: 'In formalin', weightG: '900', adherent: 'Diaphragm, 4 x 3 cm', hilum: 'Not submitted', thrombus: ['Portal vein', 'Hepatic veins'], gallbladder: 'Absent', nodesFound: '0' }));
  assert.match(m, /^Received in formalin is a native liver weighing 900 g\. The specimen includes adherent diaphragm, 4 x 3 cm\. Thrombus is present in the portal vein and hepatic veins\. The gallbladder is absent\. No hilar lymph node is identified\./);
  assert.doesNotMatch(m, /hilar margins/);
  assert.match(macro(part({ nodesFound: '1' })), /One hilar lymph node is identified\./);
  assert.match(macro(part({ dims: '20x14x9 cm' })), /measuring 20 x 14 x 9 cm\./);
  for (const [bg, s] of [['Fibrotic', 'The parenchyma is firm and fibrotic.'], ['Bile-stained', 'The parenchyma is bile-stained.'],
    ['Nutmeg', 'The parenchyma has a congested, nutmeg appearance.'], ['Massive necrosis', 'The parenchyma is soft and mottled, with extensive necrosis.'],
    ['Normal', 'The parenchyma is unremarkable.']]) {
    assert.ok(macro(part({ background: bg })).includes(s), bg);
  }
  assert.match(macro(part({ nodularity: 'Mixed' })), /The parenchyma is diffusely nodular, with micronodules and macronodules\./);
  assert.match(macro(part({ nodularity: '' })), /The parenchyma is diffusely nodular\./);
});

test('macroscopy: nodules numbered with segment and size, the rest summarised, imaging matched, then the sampling', () => {
  assert.match(macro(part()), /No mass or prominent nodule is seen\. Representative sections are taken\.$/);
  assert.match(macro(part({ noduleCount: 2, n1Seg: 'S7', n2Mm: '9' })), /Nodule 1 is in segment 7\. Nodule 2 measures 9 mm\./);
  const many = macro(part({ noduleCount: 5, moreNodules: true, otherNodules: 'eight further nodules, 5 to 10 mm, in both lobes' }));
  assert.match(many, /There are also eight further nodules, 5 to 10 mm, in both lobes\./);
  assert.doesNotMatch(many, /No mass/);
  assert.match(macro(part({ moreNodules: true, noduleCount: 5, otherNodules: 'There are many more, up to 8 mm' })), /There are many more, up to 8 mm\./);
  assert.match(macro(part({ imagingMatch: 'Not all imaging lesions identified', imagingDetail: 'segment 2 arterial-enhancing focus' })),
    /Not all lesions described on imaging are identified \(not found: segment 2 arterial-enhancing focus\)\./);
});

test('block key: numbers stand alone in a one-letter case and take the letter beside a second specimen', () => {
  const one = runCase([explant(F01)]);
  assert.match(one.report, /\n\(1-2\) Hilar margins en face\.\n\(3\) Portal vein thrombus\.\n/);
  const two = runCase([explant(F05A), { templateId: 'liver_biopsy', values: F05B }]);
  assert.match(two.report, /\n\(A1\) Hilar margins en face\.\n\(A2-7\) Background liver\.\n/);
});

// ---------- microscopy ----------

test('microscopy: the example explant, background first, then the nodules, vessels, nodes and gallbladder', () => {
  assert.equal(micro(part(EXAMPLE)), 'The liver shows established cirrhosis (Ishak stage 6/6) with mild interface and lobular activity. Ground-glass hepatocytes are present. Nodule 1 (segment 6, 12 mm) is a high-grade dysplastic nodule. The portal vein contains organising bland thrombus. Three hilar lymph nodes show reactive changes. The gallbladder shows chronic cholecystitis. There is no malignancy.');
});

test('microscopy: one sentence per nodule histology', () => {
  const m = micro(part({
    noduleCount: 5, n1Seg: '8', n1Mm: '30', n1Histo: HCC, n1Nec: '40', n1Viable: '18', n2Seg: '2', n2Mm: '14', n2Histo: HCC,
    n3Mm: '12', n3Histo: TREATED, n4Seg: '5', n4Mm: '10', n4Histo: LGDN, n5Mm: '15', n5Histo: 'Other', n5Other: 'Inflammatory pseudotumour'
  }));
  assert.match(m, /Nodule 1 \(segment 8, 30 mm\) is a hepatocellular carcinoma with about 40% necrosis; the viable tumour measures 18 mm\. /);
  assert.match(m, /Nodule 2 \(segment 2, 14 mm\) is a hepatocellular carcinoma\. /);
  assert.match(m, /Nodule 3 \(12 mm\) is completely necrotic, with no viable tumour, consistent with treated hepatocellular carcinoma\. /);
  assert.match(m, /Nodule 4 \(segment 5, 10 mm\) is a low-grade dysplastic nodule\. /);
  assert.match(m, /Nodule 5 \(15 mm\) is an inflammatory pseudotumour\./);
  assert.match(micro(part({ noduleCount: 1, n1Mm: '16', n1Histo: 'Large regenerative nodule' })), /Nodule 1 \(16 mm\) is a large regenerative nodule\./);
  assert.doesNotMatch(micro(part({ noduleCount: 1, n1Mm: '16' })), /Nodule 1/, 'no histology, no sentence');
});

test('microscopy: steatosis, iron, a typed finding, the features of the cause and liver cell change', () => {
  assert.match(micro(part({ bgFindings: ['Cirrhosis', 'Steatohepatitis'], bgSteatosisPct: '20' })), /^The liver shows established cirrhosis\. There is steatohepatitis, with macrovesicular steatosis involving about 20% of the parenchyma\./);
  assert.match(micro(part({ bgFindings: ['Cirrhosis', 'Steatosis'] })), /There is macrovesicular steatosis\./);
  assert.match(micro(part({ bgFindings: ['Cirrhosis', 'Iron overload'] })), /There is iron overload\./);
  assert.match(micro(part({ bgFindings: ['Cirrhosis', 'Steatosis', 'Other (specify)'], bgOther: 'Alpha-1 antitrypsin deficiency' })), /Alpha-1 antitrypsin deficiency is also present\./);
  assert.doesNotMatch(micro(part({ bgFindings: ['Cirrhosis', 'Other (specify)'], bgOther: 'Primary biliary cholangitis' })), /cholangitis/, 'a typed finding that heads the diagnosis is not repeated');
  assert.match(micro(part({ causeFeatures: ['Bile duct loss'] })), /Bile duct loss is present\./);
  assert.match(micro(part({ causeFeatures: ['PAS-D-positive globules'] })), /PAS-D-positive globules are present\./);
  assert.match(micro(part({ causeFeatures: ['Florid duct lesions', 'Copper-associated protein'] })), /Florid duct lesions and copper-associated protein are present\./);
  assert.match(micro(part({ cellChange: ['Small cell change'] })), /Small cell change is present\./);
  assert.match(micro(part({ cellChange: ['Large cell change', 'Small cell change'] })), /Large cell change and small cell change are present\./);
  assert.match(micro(part({ bgFindings: ['None identified'], background: 'Normal' })), /^There is no fibrosis\. The gallbladder/);
  assert.match(micro(part({ bgFindings: ['None identified'], activity: 'Mild' })), /^The liver shows mild interface and lobular activity\./);
});

test('microscopy: biliary lesions, thrombus, nodes, gallbladder, the necrosis of acute liver failure and the notes', () => {
  assert.match(micro(part({ incidental: ['High-grade BilIN', 'Von Meyenburg complex'] })), /There is high-grade biliary intraepithelial neoplasia and a von Meyenburg complex\./);
  assert.match(micro(part({ thrombus: ['Hepatic veins'], thrombusHisto: 'Bland' })), /The hepatic veins contain bland thrombus\./);
  assert.match(micro(part({ thrombus: ['Portal vein', 'Hepatic artery'], thrombusHisto: 'Organising bland' })), /The portal vein and hepatic artery contain organising bland thrombus\./);
  assert.match(micro(part({ nodesFound: '3', nodesHisto: 'Metastatic tumour', nodesPositive: '1' })), /Metastatic tumour is present in one of three hilar lymph nodes\./);
  assert.match(micro(part({ nodesFound: '2', nodesHisto: 'Other (describe)', nodesOther: 'Sinus histiocytosis' })), /Two hilar lymph nodes show sinus histiocytosis\./);
  assert.match(micro(part({ nodesFound: '1' })), /One hilar lymph node shows reactive changes\./);
  assert.match(micro(part({ gallbladderHisto: 'Other (describe)', gbOther: 'Cholesterolosis' })), /The gallbladder shows cholesterolosis\./);
  assert.match(micro(part({ gallbladderHisto: 'No significant abnormality' })), /The gallbladder shows no significant abnormality\./);
  assert.doesNotMatch(micro(part({ gallbladder: 'Absent' })), /gallbladder/);
  assert.match(micro(part({ background: 'Massive necrosis', bgFindings: ['None identified'], necrosisPct: '70', necrosisPattern: 'Submassive', necrosisZone: 'Zone 3', necrosisFeatures: ['Regenerative hepatocyte nodules'] })),
    /^There is submassive hepatic necrosis, involving about 70% of the parenchyma mainly in zone 3, with regenerative hepatocyte nodules\. There is no fibrosis\./);
  assert.match(micro(part({ additionalNotes: 'Explant reviewed with the pre-transplant imaging.' })), /There is no dysplasia or malignancy\. Explant reviewed with the pre-transplant imaging\.$/);
});

test('microscopy: the negative statement closes the paragraph and drops what it cannot say', () => {
  assert.match(micro(part()), /There is no dysplasia or malignancy\.$/);
  for (const v of [{ cellChange: ['Large cell change'] }, { incidental: ['Low-grade BilIN'] }, { noduleCount: 1, n1Mm: '10', n1Histo: LGDN }]) {
    assert.match(micro(part(v)), /There is no malignancy\.$/, JSON.stringify(v));
  }
  for (const v of [{ noduleCount: 1, n1Mm: '20', n1Histo: HCC }, { tumour: 'Other malignancy', tumourOther: 'Cholangiocarcinoma' },
    { thrombus: ['Portal vein'], thrombusHisto: 'Tumour thrombus' }, { nodesFound: '2', nodesHisto: 'Metastatic tumour', nodesPositive: '1' }]) {
    assert.doesNotMatch(micro(part(v)), /There is no (?:dysplasia or )?malignancy/, JSON.stringify(v));
  }
});

// ---------- diagnosis ----------

test('diagnosis: the liver disease, then the dysplastic nodules and biliary neoplasia; a plain line when nothing is found', () => {
  assert.equal(dx(part(EXAMPLE)), 'LIVER, native, total hepatectomy - CHRONIC HEPATITIS B with CIRRHOSIS (Ishak stage 6/6); HIGH-GRADE DYSPLASTIC NODULE');
  assert.equal(gen.diagnosis(part(F01)), '(A) LIVER, native, total hepatectomy - CHRONIC HEPATITIS B with CIRRHOSIS (Ishak stage 6/6)');
  assert.equal(dx(part({ noduleCount: 3, n1Histo: HGDN, n2Histo: HGDN, n3Histo: LGDN })), 'LIVER, native, total hepatectomy - CIRRHOSIS; HIGH-GRADE DYSPLASTIC NODULES (two); LOW-GRADE DYSPLASTIC NODULE');
  assert.equal(dx(part(F03)), 'LIVER, native, total hepatectomy - PRIMARY SCLEROSING CHOLANGITIS with CIRRHOSIS (Ishak stage 6/6); LOW-GRADE BILIARY INTRAEPITHELIAL NEOPLASIA');
  assert.equal(dx(part({ incidental: ['High-grade BilIN', 'Bile duct adenoma'] })), 'LIVER, native, total hepatectomy - CIRRHOSIS; HIGH-GRADE BILIARY INTRAEPITHELIAL NEOPLASIA');
  assert.equal(dx(part(F04)), 'LIVER, native, total hepatectomy - MASSIVE HEPATIC NECROSIS');
  assert.equal(dx(part({ ...F04, necrosisPattern: 'Submassive' })), 'LIVER, native, total hepatectomy - SUBMASSIVE HEPATIC NECROSIS');
  assert.equal(dx(part({ bgFindings: ['None identified'], background: 'Normal' })), 'LIVER, native, total hepatectomy - NO SIGNIFICANT HISTOLOGICAL ABNORMALITY');
});

test('diagnosis: a malignancy leads; HCC without its synoptic, a complete response, another malignancy as typed', () => {
  assert.equal(dx(part({ ...F01, noduleCount: 1, n1Mm: '20', n1Histo: HCC })), 'LIVER, native, total hepatectomy - HEPATOCELLULAR CARCINOMA; CHRONIC HEPATITIS B with CIRRHOSIS (Ishak stage 6/6)');
  assert.equal(dx(part({ noduleCount: 1, n1Mm: '18', n1Histo: TREATED })), 'LIVER, native, total hepatectomy - COMPLETELY NECROTIC NODULE, consistent with treated HEPATOCELLULAR CARCINOMA, no viable tumour; CIRRHOSIS');
  assert.equal(dx(part({ tumour: 'Other malignancy', tumourOther: 'Intrahepatic cholangiocarcinoma, 8 mm, segment 4' })), 'LIVER, native, total hepatectomy - INTRAHEPATIC CHOLANGIOCARCINOMA, 8 mm, segment 4; CIRRHOSIS');
  assert.equal(dx(part({ tumour: 'Other malignancy' })), 'LIVER, native, total hepatectomy - MALIGNANCY; CIRRHOSIS');
  assert.equal(dx(part({ tumour: HCC })), 'LIVER, native, total hepatectomy - HEPATOCELLULAR CARCINOMA; CIRRHOSIS', 'chosen from the line before any nodule is entered');
  assert.equal(dx(part({ tumour: 'None' })), 'LIVER, native, total hepatectomy - CIRRHOSIS');
});

// ---------- checks ----------

test('checks: the gross record, block key and nodule table', () => {
  const blank = msgs(part());
  assert.match(blank, /warn:weightG:Weight: record the explant weight\./);
  assert.match(blank, /warn:dims:Dimensions: give three dimensions\./);
  assert.equal(msgs(part(EXAMPLE)), '');
  assert.match(msgs(part({ ...EXAMPLE, sliceMm: '15' })), /warn:sliceMm:Slices of 15 mm: RCPath G050 asks for no more than 10 mm, and 5 mm is advised\./);
  assert.match(msgs(part({ ...EXAMPLE, blockKeyText: '1-2 Hilar margins\n3-4 Nodule 1' })), /warn:blockKeyText:Block key: no background liver block is named/);
  assert.doesNotMatch(msgs(part(F04)), /blockKeyText/, 'no nodule, no tumour to keep the background block away from');
  assert.match(msgs(part({ ...EXAMPLE, hilum: 'Not submitted' })), /info:hilum:Hilar margins not submitted: the UCLA protocol takes the bile duct and vascular margins en face before slicing\./);
  assert.match(msgs(part({ ...EXAMPLE, noduleCount: 5, moreNodules: true })), /warn:otherNodules:More than five nodules: give the number, size range and site of the rest\./);
  assert.match(msgs(part({ ...EXAMPLE, imagingMatch: 'Not all imaging lesions identified' })), /warn:imagingDetail:Not all imaging lesions identified: say which were not found\./);
  const rows = msgs(part({ ...EXAMPLE, noduleCount: 4, n2Histo: HGDN, n3Mm: '9', n3Histo: 'Other', n4Mm: '20', n4Histo: HCC, n4Viable: '25', n4Nec: '120' }));
  assert.match(rows, /warn:n2Mm:Nodule 2: record the size\./);
  assert.match(rows, /warn:n3Other:Nodule 3: specify the histology\./);
  assert.match(rows, /error:n4Viable:Nodule 4: the viable tumour is larger than the nodule\./);
  assert.match(rows, /error:n4Nec:Nodule 4: necrosis 120% is not a percentage\./);
  assert.match(msgs(part({ ...EXAMPLE, noduleCount: 2, n2Mm: '8' })), /warn:n2Histo:Nodule 2: choose the histology\./);
  assert.match(msgs(part({ ...EXAMPLE, n1Histo: HCC, n1Nec: '100' })), /info:n1Histo:Nodule 1: no viable tumour, so choose "Treated HCC, no viable tumour"\./);
});

test('checks: the background liver, an acute liver failure explant, malignancy and nodes', () => {
  assert.match(msgs(part({ ...EXAMPLE, bgFindings: [] })), /warn:bgFindings:Background liver: tick the findings, or "None identified"\./);
  assert.match(msgs(part({ ...EXAMPLE, bgStage: '4' })), /warn:bgStage:Cirrhosis is ticked but Ishak stage 4\/6 is not a cirrhotic stage\./, 'the HCC form\'s background checks');
  assert.match(msgs(part({ ...EXAMPLE, bgFindings: ['Chronic hepatitis (specify aetiology)'], bgStage: '' })), /info:bgFindings:The gross is cirrhotic but Cirrhosis is not ticked\./);
  assert.equal(msgs(part(F04)), '');
  assert.match(msgs(part({ ...F04, necrosisPct: '' })), /warn:necrosisPct:Massive necrosis: record the percentage of parenchyma involved\./);
  assert.match(msgs(part({ ...F04, bgFindings: ['Cirrhosis'], bgStage: '6' })), /info:bgFindings:Massive necrosis and Cirrhosis are both ticked: check the background liver\./);
  assert.match(msgs(part({ ...EXAMPLE, tumour: 'None', n1Histo: HCC })), /warn:tumour:A nodule is recorded as hepatocellular carcinoma but Malignancy is "None"\./);
  assert.match(msgs(part({ ...EXAMPLE, tumour: 'Other malignancy' })), /warn:tumourOther:Other malignancy: name it\./);
  assert.match(msgs(part({ ...EXAMPLE, nodesHisto: 'Metastatic tumour' })), /warn:nodesPositive:Metastatic tumour in the nodes: record how many are involved\./);
  assert.match(msgs(part({ ...EXAMPLE, nodesHisto: 'Metastatic tumour', nodesPositive: '4' })), /error:nodesPositive:Involved nodes exceed the number found\./);
});

test('checks: HCC asks for its synoptic, and Milan and UCSF are counted on viable tumour and on all nodules, never printed', () => {
  const alone = part({ ...EXAMPLE, noduleCount: 1, n1Mm: '62', n1Histo: HCC, thrombus: [], thrombusHisto: 'Bland' });
  const m = msgs(alone);
  assert.match(m, /warn:tumour:Hepatocellular carcinoma: "Add HCC synoptic" adds the HCC synoptic under the same letter, pre-filled from this form\./);
  assert.match(m, /info:noduleCount:Transplant criteria on the explant: counting viable tumour, outside Milan, within UCSF \(one nodule, largest 62 mm\); counting all nodules, outside Milan, within UCSF \(one nodule, largest 62 mm\)\. Vascular invasion: not yet recorded on the synoptic\./);
  const three = msgs(part({ ...EXAMPLE, noduleCount: 3, n1Mm: '40', n1Histo: HCC, n2Mm: '30', n2Histo: HCC, n3Mm: '20', n3Histo: HCC }));
  assert.match(three, /counting viable tumour, outside Milan, outside UCSF \(three nodules, largest 40 mm\)/);
  const out = runCase([explant(F02), linkedHcc(F02, F02_HCC)]);
  assert.equal(issueText(out), 'info:noduleCount:Transplant criteria on the explant: counting viable tumour, within Milan, within UCSF (one nodule, largest 15 mm); counting all nodules, within Milan, within UCSF (two nodules, largest 25 mm). Vascular invasion: not identified.');
  const complete = { ...F02, n2Histo: TREATED, n2Nec: '', n2Viable: '' };
  assert.match(issueText(runCase([explant(complete), linkedHcc(complete)])), /info:noduleCount:No viable tumour in any nodule: a complete response, as Exp Clin Transplant 2023 uses the term\./);
  assert.doesNotMatch(runCase([explant(F02), linkedHcc(F02, F02_HCC)]).report, /Milan|UCSF|complete response/i);
});

test('checks: a tumour thrombus in a hilar vessel asks for large vessel invasion on the synoptic', () => {
  const tt = { ...F02, thrombus: ['Portal vein'], thrombusHisto: 'Tumour thrombus' };
  assert.equal(linkedHcc(tt).values.vascularInvasion, LARGE, 'pre-filled as large vessel invasion');
  assert.doesNotMatch(issueText(runCase([explant(tt), linkedHcc(tt)])), /thrombusHisto/);
  const changed = issueText(runCase([explant(tt), linkedHcc(tt, { vascularInvasion: 'Present, small vessel invasion' })]));
  assert.match(changed, /warn:thrombusHisto:Tumour thrombus in a hilar vessel: the HCC synoptic's vascular invasion should be large vessel invasion\./);
  assert.match(changed, /outside Milan/);
});

// ---------- the linked HCC synoptic ----------

test('pairing: HCC on the explant offers the HCC synoptic, and the synoptic opens with what the explant recorded', () => {
  assert.deepEqual(gen.PAIR_TARGETS, ['hcc']);
  assert.equal(gen.PAIR_BUTTON.text, 'Add HCC synoptic');
  assert.equal(gen.pairedTemplate(part(F02)), 'hcc');
  assert.equal(gen.pairedTemplate(part({ tumour: HCC })), 'hcc');
  for (const v of [EXAMPLE, { tumour: 'Other malignancy' }, { ...F02, tumour: 'None' }]) assert.equal(gen.pairedTemplate(part(v)), '');
  assert.deepEqual(gen.prefillPaired(part(F02).values), {
    procedure: 'Total hepatectomy', specimenName: 'Native liver, total hepatectomy', specimenWeight: '1380', specimenDims: '230 x 160 x 90',
    segments: ['Segment 8'], tumourCount: 1, tumourSizeCm: '1.5', otherSizesCm: '', treatmentEffect: 'Incomplete necrosis (viable tumour present)',
    necrosisPct: '40', nodesExamined: 2, nodesInvolved: 0, bgFindings: ['Cirrhosis', 'Chronic hepatitis (specify aetiology)'], bgStageSystem: 'Ishak',
    bgStage: '6', bgAetiology: 'Hepatitis B', bgAetiologyOther: '', bgSteatosisPct: '', bgOther: ''
  });
  const complete = gen.prefillPaired(part({ ...F02, n2Histo: TREATED }).values);
  assert.equal(complete.treatmentEffect, 'Complete necrosis (no viable tumour)');
  assert.deepEqual(complete.segments, ['Segment 6', 'Segment 8']);
  assert.equal(complete.tumourCount, undefined);
  const two = gen.prefillPaired(part({ ...F02, n1Histo: HCC, n1Nec: '', n1Viable: '' }).values);
  assert.deepEqual([two.tumourCount, two.tumourSizeCm, two.otherSizesCm, two.necrosisPct], [2, '2', '1.5', undefined]);
  assert.deepEqual(gen.prefillPaired(part({ ...EXAMPLE, n1Histo: HGDN }).values).bgFindings, ['Cirrhosis', 'Chronic hepatitis (specify aetiology)', HGDN]);
  assert.equal(gen.prefillPaired(part({ ...F02, nodesHisto: 'Metastatic tumour', nodesPositive: '1' }).values).nodesInvolved, 1);
  for (const [k, v] of Object.entries(gen.prefillPaired(part(F02).values))) {
    const f = hccField(k);
    assert.ok(f, `the HCC form has ${k}`);
    if (f.options) for (const x of [].concat(v)) assert.ok(f.options.includes(x), `${k}: ${x}`);
  }
});

test('pairing: under the explant the synoptic prints no gross, block key, heading or parenchymal margin, and takes the explant\'s background', () => {
  const out = runCase([explant(F02), linkedHcc(F02, F02_HCC)]);
  assert.ok(!/^\([A-Z]\)/m.test(out.report), 'one letter in the case: letters dropped everywhere');
  assert.equal((out.report.match(/Received fresh/g) || []).length, 1, 'one gross, the explant\'s');
  assert.match(out.report, /\n\(1-2\) Hilar margins en face\.\n/);
  assert.match(out.report, /consistent with treated hepatocellular carcinoma\. Nodule 2 \(segment 8, 25 mm\) is a hepatocellular carcinoma with about 40% necrosis; the viable tumour measures 15 mm\./);
  assert.match(out.report, /\n\nSpecimen and tumour\n- Procedure: Total hepatectomy\n- Tumour site: Segment 8\n- Tumour focality: Solitary\n- Tumour size: 1\.5 cm/);
  assert.match(out.report, /\nMargins\n- Other margin\(s\): Not recorded\n/);
  assert.doesNotMatch(out.report, /Parenchymal margin|Additional findings|Native liver, total hepatectomy\nSpecimen and tumour/);
  assert.match(out.report, /tumour necrosis\s+40%, after TACE/);
  assert.match(out.diagnosis, /^LIVER, native, total hepatectomy\n- Moderately differentiated HEPATOCELLULAR CARCINOMA\n/);
  assert.match(out.diagnosis, /\n- CHRONIC HEPATITIS B with CIRRHOSIS \(Ishak stage 6\/6\)$/);
  assert.equal((out.diagnosis.match(/total hepatectomy/g) || []).length, 1, 'one head line for the pair');
  // The explant's background prints even when the synoptic's copy has drifted; the checks say so.
  const drift = runCase([explant(F02), linkedHcc(F02, { ...F02_HCC, bgStage: '5' })]);
  assert.equal(drift.diagnosis, out.diagnosis);
  assert.match(issueText(drift), /info:bgStage:Background liver: the explant's fields print under the explant; this synoptic's copy differs and is not printed\./);
  // Dysplastic nodules and biliary neoplasia from the explant follow the synoptic's clauses.
  const more = { ...F02, noduleCount: 3, n3Mm: '11', n3Histo: HGDN, incidental: ['Low-grade BilIN'] };
  assert.deepEqual(gen.hostedClauses(part(more)), ['CHRONIC HEPATITIS B with CIRRHOSIS (Ishak stage 6/6)', 'HIGH-GRADE DYSPLASTIC NODULE in the background liver', 'LOW-GRADE BILIARY INTRAEPITHELIAL NEOPLASIA']);
  assert.match(runCase([explant(more), linkedHcc(more)]).diagnosis, /\n- CHRONIC HEPATITIS B with CIRRHOSIS \(Ishak stage 6\/6\)\n- HIGH-GRADE DYSPLASTIC NODULE in the background liver\n- LOW-GRADE BILIARY INTRAEPITHELIAL NEOPLASIA$/);
});

test('pairing: a second letter restores the letters; the pair sits under one (A)', () => {
  const out = runCase([explant(F02), linkedHcc(F02, F02_HCC), { templateId: 'liver_biopsy', values: F05B }]);
  assert.match(out.report, /^\(A\) Native liver, total hepatectomy\n\(B\) Liver, donor, wedge biopsy\n/);
  assert.match(out.report, /\n\(A1-2\) Hilar margins en face\.\n/);
  assert.match(out.diagnosis, /^\(A\) LIVER, native, total hepatectomy\n- Moderately differentiated HEPATOCELLULAR CARCINOMA\n/);
  assert.match(out.diagnosis, /\n\n\(B\) LIVER, donor, wedge biopsy - /);
  assert.doesNotMatch(out.report, /\(A\) Native liver, total hepatectomy\nSpecimen and tumour/, 'no synoptic heading under the explant');
});

test('HCC form: a total hepatectomy has no parenchymal margin, whether or not an explant hosts it', () => {
  const v = { ...defaultValues(hcc.schema), procedure: 'Total hepatectomy', parenchymalMargin: 'Uninvolved by invasive carcinoma (specify distance)', parenchymalMarginMm: '' };
  assert.equal(isVisible(hccField('parenchymalMargin'), v), false);
  assert.equal(isVisible(hccField('parenchymalMarginMm'), v), false);
  assert.equal(isVisible(hccField('parenchymalMargin'), { ...v, procedure: 'Wedge resection' }), true);
  const p = { label: 'A', values: v };
  const syn = hccGen.synoptic(p, { case: { parts: [p] }, options: {} });
  assert.doesNotMatch(syn, /Parenchymal margin/);
  assert.match(syn, /- Other margin\(s\): Not recorded/);
  assert.doesNotMatch(hccGen.validate(p).map((i) => i.message).join(' | '), /Parenchymal margin/);
  assert.equal(hccGen.marginDx(v), '', 'no margin clause from the parenchymal margin');
  assert.equal(hccGen.marginDx({ ...v, procedure: 'Wedge resection' }), 'Margin clear');
  assert.equal(hccGen.hostOf(p), null, 'no host outside an explant');
  assert.notEqual(hccGen.macro(p, { case: { parts: [p] } }), '', 'an unhosted synoptic keeps its gross');
});

// ---------- routing ----------

test('routing: explant and total hepatectomy lines open this form; resections, wedges and biopsies keep theirs', () => {
  for (const [line, history] of [['Native liver, total hepatectomy', ''], ['Liver, explant', ''], ['Liver explant', 'PSC'], ['Explanted liver', ''],
    ['Liver, recipient hepatectomy', ''], ['Liver, total hepatectomy at transplant', ''], ['Liver, total hepatectomy', 'HCC'], ['Liver, explant, HCC', ''],
    ['Native liver at transplant, NASH cirrhosis', ''], ['Native liver, total hepatectomy', 'HBV cirrhosis with HCC']]) {
    const r = route(line, history);
    assert.deepEqual([r.templateId, r.tier], ['liver_explant', 'confident'], `${line} [${history}]`);
  }
  for (const [line, history, id] of [['Liver, right hepatectomy', 'HCC', 'hcc'], ['Liver, segment 6, resection', 'HCC', 'hcc'],
    ['Liver, segment 6, wedge resection', 'haemangioma', 'liver_benign'], ['Liver, random, biopsy', '', 'liver_biopsy'],
    ['Native liver, biopsy', 'cirrhosis', 'liver_biopsy'], ['Liver allograft, biopsy', '', 'liver_biopsy'], ['Liver, donor, wedge biopsy', '', 'liver_biopsy'],
    ['Liver, donor, time-zero biopsy', 'HBV cirrhosis with HCC', 'liver_biopsy'], ['Liver graft, post-reperfusion biopsy', 'HCC', 'liver_biopsy'],
    ['Liver, segment 6, mass, biopsy', 'liver donor', 'liver_lesion_biopsy']]) {
    assert.equal(route(line, history).templateId, id, `${line} [${history}]`);
  }
  // "Explant" alone names no organ: a breast implant, a heart, a kidney, a joint prosthesis or a mesh is explanted too,
  // so the form needs a liver word on the line and these keep the routes they had before Phase 82.
  for (const line of ['Explant', 'Breast implant capsule, explant', 'Heart, explant', 'Kidney, explant', 'Lung explant', 'Hip prosthesis, explant', 'Mesh, explant']) {
    assert.notEqual(route(line).templateId, 'liver_explant', line);
  }
});

test('fills: HCC on the line presets the malignancy; a query or the history does not', () => {
  assert.deepEqual(preset('Liver, explant, HCC'), { tumour: HCC });
  assert.deepEqual(preset('Native liver, total hepatectomy, hepatocellular carcinoma'), { tumour: HCC });
  assert.deepEqual(preset('Liver explant, ?HCC'), {});
  assert.deepEqual(preset('Native liver, total hepatectomy', 'HCC'), {});
  assert.deepEqual(preset('Liver, explant'), {});
});

// ---------- golden fixtures ----------

// Golden reports: written on first run, compared after; edit deliberately (UPDATE_FIXTURES=1 rewrites).
const CASES = [
  ['01-hbv-cirrhosis-bland-portal-vein-thrombus', 'HBV cirrhosis, Ishak 6, with an organising bland portal vein thrombus and three reactive hilar nodes; no nodule', [explant(F01)]],
  // pTNM printed, so the fixture shows the linked synoptic staged on the viable nodule alone (ypT1a).
  ['02-two-hcc-after-tace-linked-synoptic', 'HBV cirrhosis with two HCC after TACE, one completely necrotic and one 40% necrotic with 15 mm viable, and the linked HCC synoptic with pTNM printed', [explant(F02), linkedHcc(F02, F02_HCC)], { ...OPTS, printPTNM: true }],
  ['03-psc-cirrhosis-low-grade-bilin', 'primary sclerosing cholangitis with cirrhosis, the cause features and low-grade BilIN', [explant(F03)]],
  ['04-acute-liver-failure-massive-necrosis', 'acute liver failure: massive panacinar necrosis, no gallbladder, one reactive node', [explant(F04)]],
  ['05-explant-with-donor-wedge-biopsy', 'steatohepatitic cirrhosis explant as (A) and the donor liver\'s post-reperfusion wedge biopsy as (B)', [explant(F05A), { templateId: 'liver_biopsy', values: F05B }]]
];
for (const [name, description, parts, options = OPTS] of CASES) {
  test(`golden: ${name}`, () => {
    const r = runCase(parts, options);
    const file = path.join(FIX, `${name}.json`);
    const current = { description, templateIds: parts.map((p) => p.templateId), parts: parts.map((p) => ({ templateId: p.templateId, ...(p.linked ? { linked: true } : {}), values: p.values })), options, report: r.report, checks: r.issues };
    if (UPDATE || !fs.existsSync(file)) {
      fs.mkdirSync(FIX, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
    }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(r.report, saved.report, `${file} changed; re-run with UPDATE_FIXTURES=1 only after a deliberate wording change`);
    assert.deepEqual(r.issues, saved.checks, `${file} checks changed`);
    assert.doesNotMatch(r.report, /undefined|\[object|NaN| {3,}/);
  });
}
