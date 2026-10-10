// Liver biopsy (medical). Card: docs/roadmap.md "Liver biopsy (medical) — pattern-based template" (pulled by the
// user 2026-09-30); grounding docs/reference/liver_biopsy-morphology.md. Wording is deliberate; update the strings
// only on purpose. Fixtures: tests/fixtures/liver_biopsy/*.json (golden; --update only after a deliberate change).
// The routing lines below are house-style lines, not case text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible, applyLinkedDefaults, snippetsFor } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { rowGroups } from '../src/picker.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { siteOf, aih2022 } from '../generators/liver_biopsy.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.liver_biopsy;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const FIX = path.join(here, 'fixtures', 'liver_biopsy');
const UPDATE = process.argv.includes('--update');
const EXAMPLE = schema.example.parts[0].values;
const one = (values) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};
const run = (values) => generate(schema, t.generator, one(values));
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const visible = (values) => schema.fields.filter((f) => isVisible(f, { ...one({}).parts[0].values, ...values })).map((f) => f.id);
const checksOf = (r) => r.issues.map((i) => [i.level, i.field]);
const levelsFor = (r, field) => r.issues.filter((i) => i.field === field).map((i) => i.level);
const snippetIds = (values) => snippetsFor({ liver_biopsy: t }, one(values)).filter((s) => s.suggested).map((s) => s.id);
const SPEC = { specimenName: 'random', cores: '2', coreLength: '22', portalTracts: '14' };

// ---------- metadata and menus ----------

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has liver_biopsy');
  assert.equal(schema.system, 'Hepatobiliary');
  assert.equal(schema.kind, 'biopsy');
  assert.equal(schema.label, 'Liver (medical)');
  assert.equal(schema.organ, 'LIVER');
  assert.ok(schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
  assert.equal(schema.style.british, true);
});

test('it sits with the medical biopsies in the top row and is no longer a pending placeholder', () => {
  const planned = JSON.parse(fs.readFileSync(path.join(root, 'templates', 'planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((p) => p.id === 'liver_biopsy'), 'not in planned.json');
  const group = rowGroups(manifest, planned, 'top').find((g) => g.items.some((i) => i.id === 'liver_biopsy'));
  assert.equal(group.system, 'Medical', 'Hepatobiliary biopsies fold into Medical');
  assert.ok(!group.items.find((i) => i.id === 'liver_biopsy').planned, 'a built template, not a pending one');
});

test('the example case renders every expected block', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, t.generator, c);
  for (const heading of [/SPECIMENS?:/, /MICROSCOPIC EXAMINATION:/, /DIAGNOSIS:/, /COMMENT:/]) assert.match(r.report, heading);
});

test('the example: autoimmune hepatitis graded by the modified HAI without item D and staged by Ishak', () => {
  const r = run(EXAMPLE);
  assert.equal(r.specimens, 'Liver, random, biopsy');
  assert.equal(r.microscopy, 'Sections show two cores of liver measuring 22 mm in aggregate length, with 14 portal tracts. '
    + 'The portal tracts contain a moderate plasma cell-rich infiltrate with moderate interface hepatitis. There is mild lobular hepatitis. '
    + 'Plasma cell clusters, hepatocyte rosettes and emperipolesis are seen. Modified HAI components: interface hepatitis 3, confluent necrosis 0 and focal necrosis 2. '
    + 'Reticulin and Masson trichrome stains show fibrous expansion of most portal areas with occasional portal-to-portal bridging. '
    + 'Perls stain shows no stainable iron. D-PAS stain shows no diastase-resistant globules.');
  assert.equal(r.diagnosis, 'LIVER, random, biopsy - CHRONIC HEPATITIS with MODERATE ACTIVITY and BRIDGING FIBROSIS (modified HAI 5/14; Ishak stage 3/6), consistent with AUTOIMMUNE HEPATITIS');
  assert.equal(r.comment, 'Please correlate with clinical findings, serum IgG and autoantibody titres.');
  assert.deepEqual(r.issues, []);
});

// ---------- specimen and adequacy ----------

test('the site is written without "liver" or "biopsy"; procedure words and grafts read the house way', () => {
  const cases = [
    ['', 'Liver, biopsy', 'LIVER, biopsy'],
    ['random', 'Liver, random, biopsy', 'LIVER, random, biopsy'],
    ['Liver, random biopsy', 'Liver, random, biopsy', 'LIVER, random, biopsy'],
    ['Segment 6', 'Liver, segment 6, biopsy', 'LIVER, segment 6, biopsy'],
    ['S6', 'Liver, S6, biopsy', 'LIVER, S6, biopsy'],
    ['Needle core biopsy', 'Liver, biopsy', 'LIVER, biopsy'],
    ['Transjugular', 'Liver, transjugular biopsy', 'LIVER, transjugular biopsy'],
    ['allograft', 'Liver allograft, biopsy', 'LIVER ALLOGRAFT, biopsy'],
    ['transplant', 'Liver allograft, biopsy', 'LIVER ALLOGRAFT, biopsy']
  ];
  for (const [name, spec, dx] of cases) {
    const r = run({ ...EXAMPLE, specimenName: name });
    assert.equal(r.specimens, spec, name);
    assert.ok(r.diagnosis.startsWith(`${dx} - `), `${name}: ${r.diagnosis}`);
  }
  assert.equal(siteOf({ specimenName: 'Liver, right lobe, core biopsy.' }), 'right lobe');
});

test('the opening sentence counts the cores and portal tracts as recorded', () => {
  const open = (v) => run({ ...EXAMPLE, ...v }).microscopy.split('. ')[0] + '.';
  assert.equal(open({ cores: '1', coreLength: '15', portalTracts: '8' }), 'Sections show a core of liver measuring 15 mm in length, with 8 portal tracts.');
  assert.equal(open({ cores: '3', fragmented: true }), 'Sections show three fragmented cores of liver measuring 22 mm in aggregate length, with 14 portal tracts.');
  assert.equal(open({ cores: '', coreLength: '', portalTracts: '' }), 'Sections show cores of liver.');
  assert.equal(open({ portalTracts: '1' }), 'Sections show two cores of liver measuring 22 mm in aggregate length, with one portal tract.');
  assert.equal(open({ portalTracts: '0' }), 'Sections show two cores of liver measuring 22 mm in aggregate length, with no portal tracts.');
  assert.equal(open({ cores: '12' }), 'Sections show 12 cores of liver measuring 22 mm in aggregate length, with 14 portal tracts.');
});

test('adequacy: a chosen limitation prints; an automatic compromised length only raises a Check', () => {
  const auto = run({ ...EXAMPLE, coreLength: '15' });
  assert.doesNotMatch(auto.microscopy, /limits|too small/);
  assert.deepEqual(levelsFor(auto, 'adequacy'), ['info']);
  const chosen = run({ ...EXAMPLE, coreLength: '15', adequacy: 'Compromised' });
  assert.match(chosen.microscopy, / The size of the biopsy limits the assessment\.$/);
  assert.deepEqual(levelsFor(chosen, 'adequacy'), []);
  const small = run({ ...EXAMPLE, coreLength: '8' });
  assert.match(small.microscopy, / The biopsy is too small for a full assessment\.$/);
  const inadequate = run({ ...EXAMPLE, adequacy: 'Inadequate' });
  assert.match(inadequate.microscopy, / The biopsy is too small for a full assessment\.$/);
  assert.deepEqual(levelsFor(inadequate, 'adequacy'), ['warn'], 'Inadequate at 22 mm disagrees with the length');
  assert.deepEqual(levelsFor(run({ ...EXAMPLE, adequacy: 'Good', coreLength: '8' }), 'adequacy'), ['warn']);
  assert.deepEqual(levelsFor(run({ ...EXAMPLE, coreLength: '' }), 'coreLength'), ['info'], 'RCPath asks for the length');
  assert.deepEqual(levelsFor(run({ ...EXAMPLE, portalTracts: '10' }), 'portalTracts'), ['info'], '10 or fewer portal tracts');
  assert.deepEqual(levelsFor(run({ ...EXAMPLE, portalTracts: '11' }), 'portalTracts'), []);
});

test('free-text additional notes close the microscopy paragraph', () => {
  const r = run({ ...EXAMPLE, additionalNotes: 'a single portal tract contains a lymphoid follicle' });
  assert.match(r.microscopy, / A single portal tract contains a lymphoid follicle\.$/);
});

// ---------- hepatitic ----------

const HEP = { ...SPEC, pattern: 'Hepatitic', stageSystem: 'Ishak', stage: '2', stains: ['Reticulin'] };

test('hepatitic: the activity words follow the worse of interface and lobular activity when ungraded', () => {
  const dx = (v) => run({ ...HEP, hepDx: 'Chronic hepatitis C', ...v }).diagnosis.replace('LIVER, random, biopsy - ', '');
  assert.equal(dx({ interface: 'Absent', lobular: 'Absent' }), 'CHRONIC HEPATITIS C with MINIMAL ACTIVITY and PORTAL FIBROSIS (Ishak stage 2/6)');
  assert.equal(dx({ interface: 'Mild', lobular: 'Absent' }), 'CHRONIC HEPATITIS C with MILD ACTIVITY and PORTAL FIBROSIS (Ishak stage 2/6)');
  assert.equal(dx({ interface: 'Mild', lobular: 'Marked' }), 'CHRONIC HEPATITIS C with MARKED ACTIVITY and PORTAL FIBROSIS (Ishak stage 2/6)');
  assert.equal(dx({ interface: 'Moderate', stage: '0' }), 'CHRONIC HEPATITIS C with MODERATE ACTIVITY and NO FIBROSIS (Ishak stage 0/6)');
  assert.equal(dx({ interface: 'Moderate', stage: '6' }), 'CHRONIC HEPATITIS C with MODERATE ACTIVITY and CIRRHOSIS (Ishak stage 6/6)');
  assert.equal(dx({ interface: 'Moderate', stageSystem: '', stage: '', fibrosis: 'Periportal fibrosis' }), 'CHRONIC HEPATITIS C with MODERATE ACTIVITY and PERIPORTAL FIBROSIS');
});

test('hepatitic: the portal, lobular and feature sentences', () => {
  const m = (v) => run({ ...HEP, ...v }).microscopy;
  assert.match(m({ portalInfl: 'Marked', infiltrate: 'Mixed, with eosinophils', interface: 'Absent' }),
    / The portal tracts contain a marked mixed inflammatory infiltrate including eosinophils, without interface hepatitis\. There is no significant lobular inflammation\. /);
  assert.match(m({ hepFeatures: ['Emperipolesis'] }), / Emperipolesis is seen\. /);
  assert.match(m({ hepFeatures: ['Acidophil bodies', 'Eosinophils'] }), / Acidophil bodies and eosinophils are seen\. /);
  assert.match(m({ hepFeatures: ['Confluent necrosis', 'Bridging necrosis', 'Canalicular cholestasis'] }), / There is confluent and bridging necrosis and canalicular cholestasis\. /);
  assert.match(m({ hepFeatures: ['Steatosis'] }), / There is macrovesicular steatosis\. /);
});

test('hepatitic: METAVIR and Batts-Ludwig grades carry the activity and share one bracket with the stage', () => {
  const metavir = run({ ...HEP, hepDx: 'Chronic hepatitis B', gradeSystem: 'METAVIR', metavirPn: '1', metavirLn: '0', stageSystem: 'METAVIR', stage: '2' });
  assert.equal(metavir.diagnosis, 'LIVER, random, biopsy - CHRONIC HEPATITIS B with MILD ACTIVITY and PORTAL FIBROSIS with RARE SEPTA (METAVIR A1 F2)');
  assert.match(metavir.microscopy, / METAVIR components: piecemeal necrosis 1 and lobular necrosis 0\. Reticulin stain shows portal fibrosis with rare septa\./);
  const none = run({ ...HEP, hepDx: 'Chronic hepatitis B', gradeSystem: 'METAVIR', metavirPn: '0', metavirLn: '0', stageSystem: 'METAVIR', stage: '0' });
  assert.equal(none.diagnosis, 'LIVER, random, biopsy - CHRONIC HEPATITIS B without ACTIVITY or FIBROSIS (METAVIR A0 F0)');
  const noneFib = run({ ...HEP, hepDx: 'Chronic hepatitis B', gradeSystem: 'METAVIR', metavirPn: '0', metavirLn: '0', stageSystem: 'METAVIR', stage: '3' });
  assert.equal(noneFib.diagnosis, 'LIVER, random, biopsy - CHRONIC HEPATITIS B without ACTIVITY, with BRIDGING FIBROSIS (METAVIR A0 F3)');
  const override = run({ ...HEP, hepDx: 'Chronic hepatitis B', gradeSystem: 'METAVIR', metavirPn: '1', metavirLn: '0', metavirA: 'A2' });
  assert.match(override.diagnosis, /with MODERATE ACTIVITY and PORTAL FIBROSIS \(METAVIR A2; Ishak stage 2\/6\)$/);
  assert.deepEqual(levelsFor(override, 'metavirA'), ['warn']);
  const batts = run({ ...HEP, hepDx: 'Chronic hepatitis B', gradeSystem: 'Batts-Ludwig', battsGrade: '2', stageSystem: 'Batts-Ludwig', stage: '3' });
  assert.equal(batts.diagnosis, 'LIVER, random, biopsy - CHRONIC HEPATITIS B with MILD ACTIVITY and SEPTAL FIBROSIS (Batts-Ludwig grade 2/4, stage 3/4)');
  assert.deepEqual(levelsFor(run({ ...HEP, gradeSystem: 'Batts-Ludwig' }), 'battsGrade'), ['warn']);
});

test('hepatitic: the modified HAI prints only when every item is scored', () => {
  const full = run({ ...HEP, hepDx: 'Chronic hepatitis B', gradeSystem: 'Ishak modified HAI', ishakA: '2', ishakB: '1', ishakC: '2', ishakD: '3' });
  assert.match(full.microscopy, / Modified HAI components: interface hepatitis 2, confluent necrosis 1, focal necrosis 2 and portal inflammation 3\. /);
  assert.match(full.diagnosis, /\(modified HAI 8\/18; Ishak stage 2\/6\)$/);
  const partial = run({ ...HEP, hepDx: 'Chronic hepatitis B', gradeSystem: 'Ishak modified HAI', ishakA: '2', ishakB: '1' });
  assert.doesNotMatch(partial.microscopy, /Modified HAI/);
  assert.match(partial.diagnosis, /\(Ishak stage 2\/6\)$/);
  assert.deepEqual(levelsFor(partial, 'ishakA'), ['warn']);
  assert.deepEqual(levelsFor(run({ ...HEP, gradeSystem: 'Ishak modified HAI', ishakA: '5', ishakB: '0', ishakC: '0', ishakD: '0' }), 'ishakA'), ['error']);
});

test('hepatitic: acute hepatitis and drug-induced patterns name fibrosis only when there is some', () => {
  const dx = (v) => run({ ...HEP, stage: '', stageSystem: '', fibrosis: 'No fibrosis', ...v }).diagnosis.replace('LIVER, random, biopsy - ', '');
  assert.equal(dx({ hepDx: 'Acute hepatitis', lobular: 'Marked' }), 'ACUTE HEPATITIS');
  assert.equal(dx({ hepDx: 'Acute hepatitis', fibrosis: 'Portal fibrosis' }), 'ACUTE HEPATITIS with PORTAL FIBROSIS');
  assert.equal(dx({ hepDx: 'Drug-induced liver injury' }), 'ACUTE HEPATITIS, compatible with DRUG-INDUCED LIVER INJURY');
  assert.equal(dx({ hepDx: 'Drug-induced liver injury', diliPattern: 'Zonal necrosis' }), 'ZONAL NECROSIS, compatible with DRUG-INDUCED LIVER INJURY');
  assert.equal(dx({ hepDx: 'Drug-induced liver injury', diliPattern: 'Submassive necrosis' }), 'SUBMASSIVE NECROSIS, compatible with DRUG-INDUCED LIVER INJURY');
  assert.equal(dx({ hepDx: 'Drug-induced liver injury', diliPattern: 'Chronic hepatitis', interface: 'Mild' }),
    'CHRONIC HEPATITIS with MILD ACTIVITY and NO FIBROSIS, compatible with DRUG-INDUCED LIVER INJURY');
  assert.match(run({ ...HEP, hepDx: 'Drug-induced liver injury', diliPattern: 'Zonal necrosis' }).microscopy, / There is zonal necrosis\. /);
});

test('hepatitic: an unqualified chronic hepatitis raises the RCPath Check', () => {
  assert.deepEqual(levelsFor(run({ ...HEP, hepDx: 'Chronic hepatitis' }), 'hepDx'), ['info']);
  assert.deepEqual(levelsFor(run({ ...HEP, hepDx: 'Chronic hepatitis B' }), 'hepDx'), []);
});

// ---------- autoimmune hepatitis ----------

const AIH = { ...EXAMPLE };

test('AIH: likely and typical read "consistent with", possible and compatible "compatible with", unlikely and atypical drop the name', () => {
  const tail = (v) => run({ ...AIH, ...v }).diagnosis.split('), ')[1] || '';
  assert.equal(tail({ aihCategory: 'Likely AIH' }), 'consistent with AUTOIMMUNE HEPATITIS');
  assert.equal(tail({ aihCategory: 'Possible AIH' }), 'compatible with AUTOIMMUNE HEPATITIS');
  assert.equal(tail({ aihSystem: 'Simplified 2008', aihCategory: 'Typical', hepFeatures: ['Emperipolesis', 'Hepatocyte rosettes'] }), 'consistent with AUTOIMMUNE HEPATITIS');
  assert.equal(tail({ aihSystem: 'Simplified 2008', aihCategory: 'Compatible' }), 'compatible with AUTOIMMUNE HEPATITIS');
  for (const cat of ['Unlikely AIH', 'Atypical']) {
    const r = run({ ...AIH, aihCategory: cat, aihSystem: cat === 'Atypical' ? 'Simplified 2008' : 'IAIHG 2022' });
    assert.doesNotMatch(r.diagnosis, /AUTOIMMUNE/, cat);
    assert.ok(levelsFor(r, 'aihCategory').includes('warn'), cat);
  }
});

test('AIH: the IAIHG 2022 category is checked against the recorded features', () => {
  assert.equal(aih2022({ infiltrate: 'Plasma cell-rich', interface: 'Moderate', lobular: 'Mild' }), 'Likely AIH');
  assert.equal(aih2022({ infiltrate: 'Lymphocytic', interface: 'Mild', lobular: 'Moderate', stageSystem: 'Ishak', stage: '2' }), 'Likely AIH', 'lobular pattern with portal fibrosis');
  assert.equal(aih2022({ infiltrate: 'Lymphoplasmacytic', interface: 'Mild', lobular: 'Absent' }), 'Possible AIH');
  assert.equal(aih2022({ infiltrate: 'Plasma cell-rich', interface: 'Moderate', otherDisease: true }), 'Possible AIH');
  assert.equal(aih2022({ infiltrate: 'Lymphocytic', interface: 'Absent', lobular: 'Absent', otherDisease: true }), 'Unlikely AIH');
  assert.equal(aih2022({ infiltrate: 'Lymphocytic', interface: 'Mild', lobular: 'Absent' }), null);
  const weak = run({ ...AIH, infiltrate: 'Lymphocytic', interface: 'Mild', lobular: 'Mild' });
  assert.deepEqual(levelsFor(weak, 'aihCategory'), ['warn'], 'Likely AIH needs a lymphoplasmacytic infiltrate and more than mild activity');
  const met = run({ ...AIH, aihCategory: 'Possible AIH' });
  assert.deepEqual(levelsFor(met, 'aihCategory'), ['info'], 'the features meet likely AIH');
  const typical = run({ ...AIH, aihSystem: 'Simplified 2008', aihCategory: 'Typical', hepFeatures: ['Emperipolesis'] });
  assert.match(typical.issues.find((i) => i.field === 'aihCategory').message, /rosettes not recorded/);
});

test('AIH: item D is hidden and not summed; other hepatitic diagnoses score all four items', () => {
  assert.ok(!visible({ pattern: 'Hepatitic', hepDx: 'Autoimmune hepatitis', gradeSystem: 'Ishak modified HAI' }).includes('ishakD'));
  assert.ok(visible({ pattern: 'Hepatitic', hepDx: 'Chronic hepatitis B', gradeSystem: 'Ishak modified HAI' }).includes('ishakD'));
  assert.match(run({ ...AIH, ishakD: '4' }).diagnosis, /modified HAI 5\/14/);
});

// ---------- biliary ----------

const PBC = {
  ...SPEC, cores: '1', coreLength: '18', portalTracts: '11', pattern: 'Biliary', bilDx: 'Primary biliary cholangitis', portalInfl: 'Moderate',
  infiltrate: 'Lymphoplasmacytic', interface: 'Mild', lobular: 'Mild', bilFeatures: ['Florid duct lesion', 'Ductular reaction', 'Bile duct loss'],
  ductlessTracts: '3', nkFibrosis: '1', nkDuctLoss: '1', nkOrcein: '1', nkCA: '2', nkHA: '1', stains: ['Reticulin', 'Orcein', 'CK7'],
  stOrcein: 'Copper-associated protein in periportal hepatocytes', stCk7: 'Ductular reaction and periportal hepatocyte expression'
};

test('PBC: florid duct lesions give the destructive cholangitis head, staged by Nakanuma', () => {
  const r = run(PBC);
  assert.equal(r.diagnosis, 'LIVER, random, biopsy - CHRONIC NON-SUPPURATIVE DESTRUCTIVE CHOLANGITIS with PERIPORTAL FIBROSIS (Nakanuma stage 2, mild progression; CA2, HA1), consistent with PRIMARY BILIARY CHOLANGITIS');
  assert.equal(r.microscopy, 'Sections show a core of liver measuring 18 mm in length, with 11 portal tracts. '
    + 'The portal tracts contain a moderate lymphoplasmacytic infiltrate with mild interface hepatitis. There is mild lobular inflammation. '
    + 'There are florid duct lesions and a ductular reaction. Bile ducts are absent from 3 of 11 portal tracts. '
    + 'Nakanuma scores: fibrosis 1, bile duct loss 1 and orcein-positive granules 1. Reticulin stain shows periportal or incomplete septal fibrosis. '
    + 'Orcein stain shows copper-associated protein in periportal hepatocytes. CK7 highlights a ductular reaction and is expressed by periportal hepatocytes.');
  const plain = run({ ...PBC, bilFeatures: ['Ductular reaction'], nkOrcein: 'Not assessed', nkFibrosis: '2', nkDuctLoss: '2' });
  assert.equal(plain.diagnosis, 'LIVER, random, biopsy - CHRONIC BILIARY DISEASE with BRIDGING FIBROSIS (Nakanuma stage 3, moderate progression; CA2, HA1), compatible with PRIMARY BILIARY CHOLANGITIS');
  assert.match(plain.microscopy, / Nakanuma scores: fibrosis 2 and bile duct loss 2\. /);
});

test('PBC: the stage and fibrosis fields give way to the Nakanuma items; a chosen stage is checked against their sum', () => {
  const v = visible({ pattern: 'Biliary', bilDx: 'Primary biliary cholangitis' });
  for (const id of ['nkFibrosis', 'nkDuctLoss', 'nkOrcein', 'nkStage', 'nkCA', 'nkHA']) assert.ok(v.includes(id), id);
  for (const id of ['stage', 'stageSystem', 'fibrosis']) assert.ok(!v.includes(id), id);
  const chosen = run({ ...PBC, nkStage: '3' });
  assert.match(chosen.diagnosis, /\(Nakanuma stage 3, moderate progression; CA2, HA1\)/);
  assert.deepEqual(levelsFor(chosen, 'nkStage'), ['warn']);
  assert.deepEqual(levelsFor(run({ ...PBC, nkFibrosis: '', nkDuctLoss: '' }), 'nkFibrosis'), ['warn']);
  assert.deepEqual(levelsFor(run({ ...PBC, ductlessTracts: '12' }), 'ductlessTracts'), ['error']);
});

test('biliary: PSC, large-duct obstruction and cholestatic drug injury', () => {
  const BIL = { ...SPEC, pattern: 'Biliary', stageSystem: 'Ishak', stage: '', fibrosis: 'No fibrosis' };
  const dx = (v) => run({ ...BIL, ...v }).diagnosis.replace('LIVER, random, biopsy - ', '');
  assert.equal(dx({ bilDx: 'Primary sclerosing cholangitis', bilFeatures: ['Periductal concentric fibrosis'], stage: '3' }),
    'CHRONIC BILIARY DISEASE with BRIDGING FIBROSIS (Ishak stage 3/6), compatible with PRIMARY SCLEROSING CHOLANGITIS');
  assert.equal(dx({ bilDx: 'Large-duct obstruction', bilFeatures: ['Portal oedema', 'Ductular reaction', 'Canalicular cholestasis', 'Hepatocellular cholestasis'] }),
    'PORTAL OEDEMA, DUCTULAR REACTION AND CHOLESTASIS, compatible with LARGE-DUCT OBSTRUCTION');
  assert.equal(dx({ bilDx: 'Large-duct obstruction', bilFeatures: [] }), 'BILIARY-TYPE INJURY, compatible with LARGE-DUCT OBSTRUCTION');
  assert.equal(dx({ bilDx: 'Drug-induced liver injury', diliCholPattern: 'Chronic cholestasis', bilFeatures: ['Bile duct loss'], fibrosis: 'Portal fibrosis' }),
    'CHRONIC CHOLESTASIS with BILE DUCT LOSS and PORTAL FIBROSIS, compatible with DRUG-INDUCED LIVER INJURY');
  assert.equal(dx({ bilDx: 'Chronic biliary disease', bilFeatures: ['Periportal cholate stasis'] }), 'CHRONIC BILIARY DISEASE');
  assert.match(run({ ...BIL, bilDx: 'Chronic biliary disease', bilFeatures: ['Bile duct loss'] }).microscopy, / There is bile duct loss\. /);
  assert.match(run({ ...BIL, bilFeatures: ['Bile infarcts'] }).microscopy, / There are bile infarcts\. /);
  assert.match(run({ ...BIL, bilFeatures: ['Bile infarcts', 'Portal oedema'] }).microscopy, / There is portal oedema and bile infarcts\. /, 'the list keeps the form order');
});

// ---------- steatotic ----------

const MASH = {
  ...SPEC, specimenName: 'right lobe', coreLength: '24', portalTracts: '13', pattern: 'Steatotic', stageSystem: 'NASH CRN', stage: '2',
  steatContext: 'Metabolic dysfunction-associated', steatosisPct: '40', nasSteatosis: '2', nasLobular: '2', nasBallooning: '1',
  steatFeatures: ['Mallory-Denk bodies'], stains: ['Masson trichrome']
};

test('steatotic: MASH with the NAS and a NASH CRN stage', () => {
  const r = run(MASH);
  assert.equal(r.microscopy, 'Sections show two cores of liver measuring 24 mm in aggregate length, with 13 portal tracts. '
    + 'There is macrovesicular steatosis involving about 40% of the parenchyma. There are a few ballooned hepatocytes. There is moderate lobular inflammation. '
    + 'Mallory-Denk bodies are seen. NAS components: steatosis 2, lobular inflammation 2 and ballooning 1. '
    + 'Masson trichrome stain shows zone 3 perisinusoidal and portal or periportal fibrosis.');
  assert.equal(r.diagnosis, 'LIVER, right lobe, biopsy - STEATOHEPATITIS with PERISINUSOIDAL AND PERIPORTAL FIBROSIS (NAS 5/8; NASH CRN stage 2), in keeping with METABOLIC DYSFUNCTION-ASSOCIATED STEATOHEPATITIS (MASH)');
  assert.deepEqual(r.issues, []);
  const saf = run({ ...MASH, safReport: true, safLobular: '1' });
  assert.match(saf.diagnosis, /\(NAS 5\/8; NASH CRN stage 2; SAF S2 A2 F2\)/);
  assert.deepEqual(levelsFor(run({ ...MASH, safReport: true }), 'safLobular'), ['warn']);
});

test('steatotic: the cause prints only when the context is chosen, else the correlation comment is offered', () => {
  const dx = (v) => run({ ...MASH, ...v }).diagnosis.replace('LIVER, right lobe, biopsy - ', '');
  assert.equal(dx({ steatContext: 'Not stated' }), 'STEATOHEPATITIS with PERISINUSOIDAL AND PERIPORTAL FIBROSIS (NAS 5/8; NASH CRN stage 2)');
  assert.match(dx({ steatContext: 'Alcohol-related' }), /, in keeping with ALCOHOL-RELATED STEATOHEPATITIS$/);
  assert.match(dx({ steatContext: 'Metabolic dysfunction and alcohol-related' }), /\(MetALD\)$/);
  assert.match(dx({ steatContext: 'Drug-induced' }), /, compatible with DRUG-INDUCED LIVER INJURY$/);
  assert.equal(dx({ stage: '0' }), 'STEATOHEPATITIS without FIBROSIS (NAS 5/8; NASH CRN stage 0), in keeping with METABOLIC DYSFUNCTION-ASSOCIATED STEATOHEPATITIS (MASH)');
  assert.deepEqual(snippetIds({ ...MASH, steatContext: 'Not stated' }), ['liver_steatosis_correlation']);
});

test('steatotic: steatosis without steatohepatitis, graded from the percentage', () => {
  const r = run({ ...MASH, steatDx: 'Steatosis without steatohepatitis', steatosisPct: '70', nasSteatosis: '', nasLobular: '', nasBallooning: '', steatFeatures: [], stage: '0', stains: [] });
  assert.equal(r.diagnosis, 'LIVER, right lobe, biopsy - MARKED STEATOSIS without STEATOHEPATITIS (NASH CRN stage 0), in keeping with METABOLIC DYSFUNCTION-ASSOCIATED STEATOTIC LIVER DISEASE (MASLD)');
  assert.match(r.microscopy, / There is macrovesicular steatosis involving about 70% of the parenchyma\. There is no fibrosis\.$/);
  assert.equal(run({ ...MASH, steatosisPct: '0', nasSteatosis: '' }).microscopy.split('. ')[1], 'There is no steatosis');
  assert.match(run({ ...MASH, steatosisPct: '', nasSteatosis: '1' }).microscopy, / There is mild macrovesicular steatosis\. /);
});

test('steatotic: FLIP and the percentage are checked against the grades and the diagnosis', () => {
  assert.deepEqual(levelsFor(run({ ...MASH, steatosisPct: '20' }), 'nasSteatosis'), ['warn'], '20% is grade 1');
  assert.deepEqual(levelsFor(run({ ...MASH, steatDx: 'Steatosis without steatohepatitis' }), 'steatDx'), ['warn'], 'FLIP reads steatohepatitis');
  assert.deepEqual(levelsFor(run({ ...MASH, nasBallooning: '0' }), 'steatDx'), ['warn'], 'no ballooning is not steatohepatitis');
  assert.deepEqual(levelsFor(run({ ...MASH, nasSteatosis: '', nasLobular: '', nasBallooning: '' }), 'nasBallooning'), ['warn'], 'steatohepatitis with nothing scored');
  assert.deepEqual(levelsFor(run({ ...MASH, steatDx: 'Steatosis without steatohepatitis', nasSteatosis: '', nasLobular: '', nasBallooning: '' }), 'nasBallooning'), [], 'steatosis alone needs no ballooning');
  assert.deepEqual(levelsFor(run({ ...MASH, steatosisPct: '3', nasSteatosis: '0' }), 'nasSteatosis'), ['warn'], 'under 5% is not steatotic liver disease');
  assert.deepEqual(levelsFor(run({ ...MASH, nasBallooning: '' }), 'nasSteatosis'), ['warn'], 'a partial NAS');
  assert.doesNotMatch(run({ ...MASH, nasBallooning: '' }).diagnosis, /NAS \d/);
});

// ---------- transplant ----------

const TCMR = {
  ...SPEC, specimenName: 'allograft', cores: '1', coreLength: '21', portalTracts: '12', pattern: 'Transplant',
  txDx: 'Moderate acute T-cell-mediated rejection', raiPortal: '2', raiBileDuct: '2', raiVenous: '2', stageSystem: '', fibrosis: 'No fibrosis'
};

test('transplant: acute T-cell-mediated rejection with the rejection activity index', () => {
  const r = run(TCMR);
  assert.equal(r.specimens, 'Liver allograft, biopsy');
  assert.equal(r.diagnosis, 'LIVER ALLOGRAFT, biopsy - MODERATE ACUTE T-CELL-MEDIATED REJECTION (RAI 6/9)');
  assert.equal(r.microscopy, 'Sections show a core of liver measuring 21 mm in length, with 12 portal tracts. '
    + 'Most portal tracts are expanded by a mixed infiltrate of lymphocytes with occasional blasts, neutrophils and eosinophils. '
    + 'Most bile ducts are infiltrated by inflammatory cells, and more than an occasional duct shows degenerative change. '
    + 'Most portal and hepatic venules show subendothelial infiltration. '
    + 'Rejection activity index components: portal inflammation 2, bile duct inflammation 2 and venous endothelial inflammation 2. There is no fibrosis.');
  assert.deepEqual(r.issues, []);
});

test('transplant: other findings, fibrosis as its own clause, and the RAI Checks', () => {
  const r = run({ ...TCMR, txDx: 'No rejection', raiPortal: '1', raiBileDuct: '0', raiVenous: '0', txFeatures: ['Central perivenulitis', 'Preservation injury'], stageSystem: 'Ishak', stage: '2' });
  assert.equal(r.diagnosis, 'LIVER ALLOGRAFT, biopsy - NO EVIDENCE OF REJECTION (RAI 1/9); PORTAL FIBROSIS (Ishak stage 2/6)');
  assert.match(r.microscopy, / There is also central perivenulitis and features of preservation injury\. /);
  assert.deepEqual(levelsFor(run({ ...TCMR, raiVenous: '' }), 'raiPortal'), ['warn']);
  assert.deepEqual(levelsFor(run({ ...TCMR, raiPortal: '', raiBileDuct: '', raiVenous: '' }), 'raiPortal'), ['warn'], 'rejection without the RAI');
  assert.deepEqual(levelsFor(run({ ...TCMR, txDx: 'Indeterminate for rejection', raiPortal: '', raiBileDuct: '', raiVenous: '' }), 'raiPortal'), []);
});

// ---------- other patterns ----------

const OTHER = { ...SPEC, pattern: 'Other', stageSystem: '', fibrosis: 'No fibrosis' };

test('other: granulomas, venous outflow obstruction and a non-specific reactive hepatitis', () => {
  const g = run({ ...OTHER, otherDx: 'Granulomatous hepatitis', granulomaSite: 'Portal' });
  assert.match(g.microscopy, / There are non-necrotising epithelioid granulomas in the portal tracts\. There is no fibrosis\.$/);
  assert.equal(g.diagnosis, 'LIVER, random, biopsy - NON-NECROTISING GRANULOMATOUS INFLAMMATION');
  assert.equal(run({ ...OTHER, otherDx: 'Granulomatous hepatitis', granulomaType: 'Fibrin-ring', fibrosis: 'Portal fibrosis' }).diagnosis,
    'LIVER, random, biopsy - FIBRIN-RING GRANULOMAS; PORTAL FIBROSIS');
  const OUTFLOW = { ...OTHER, otherDx: 'Venous outflow obstruction', outflowFeatures: ['Zone 3 sinusoidal dilatation', 'Zone 3 hepatocyte atrophy', 'Perivenular haemorrhage'] };
  const o = run(OUTFLOW);
  assert.match(o.microscopy, / There is zone 3 sinusoidal dilatation, zone 3 hepatocyte atrophy and perivenular haemorrhage\. /);
  assert.equal(o.diagnosis, 'LIVER, random, biopsy - PERIVENULAR SINUSOIDAL DILATATION, HEPATOCYTE ATROPHY AND HAEMORRHAGE, compatible with VENOUS OUTFLOW OBSTRUCTION');
  assert.deepEqual(snippetIds(OUTFLOW), ['liver_outflow_imaging']);
  assert.match(run({ ...OTHER, otherDx: 'Venous outflow obstruction', outflowFeatures: ['Perivenular fibrosis'] }).microscopy, / There is perivenular fibrosis\. There is no portal fibrosis\.$/,
    'recorded perivenular fibrosis is not contradicted');
  assert.equal(run({ ...OTHER, otherDx: 'Venous outflow obstruction', outflowFeatures: [] }).diagnosis,
    'LIVER, random, biopsy - PERIVENULAR CONGESTION, compatible with VENOUS OUTFLOW OBSTRUCTION');
  const reactive = run({ ...OTHER, otherDx: 'Non-specific reactive hepatitis' });
  assert.match(reactive.microscopy, / There is mild portal and lobular inflammation, without interface hepatitis or significant hepatocyte injury\. /);
  assert.equal(reactive.diagnosis, 'LIVER, random, biopsy - NON-SPECIFIC REACTIVE HEPATITIS');
});

test('other: iron overload by site and grade, with the iron studies comment from grade 2', () => {
  const IRON = { ...OTHER, otherDx: 'Iron overload', stains: ['Perls'] };
  const H = { ...IRON, ironSite: 'Hepatocellular', ironGrade: '3', ironGradient: 'Periportal-to-centrilobular gradient' };
  const h = run(H);
  assert.match(h.microscopy, / Perls stain shows grade 3 hepatocellular iron with a periportal-to-centrilobular gradient\.$/);
  assert.equal(h.diagnosis, 'LIVER, random, biopsy - HEPATOCELLULAR SIDEROSIS (grade 3/4)');
  assert.deepEqual(snippetIds(H), ['liver_iron_studies']);
  const K = { ...IRON, ironSite: 'Kupffer cells and macrophages' };
  const k = run(K);
  assert.match(k.microscopy, / Perls stain shows iron in Kupffer cells and portal macrophages\.$/);
  assert.equal(k.diagnosis, 'LIVER, random, biopsy - MESENCHYMAL SIDEROSIS');
  assert.deepEqual(snippetIds(K), []);
  const mixed = run({ ...IRON, ironSite: 'Mixed', ironGrade: '2' });
  assert.equal(mixed.diagnosis, 'LIVER, random, biopsy - MIXED HEPATOCELLULAR AND MESENCHYMAL SIDEROSIS (grade 2/4)');
  assert.match(mixed.microscopy, / Perls stain shows grade 2 hepatocellular iron, with iron in Kupffer cells and portal macrophages\.$/);
  const none = run({ ...IRON, ironSite: 'None' });
  assert.equal(none.diagnosis, 'LIVER, random, biopsy - NO STAINABLE IRON');
  assert.deepEqual(levelsFor(none, 'ironSite'), ['warn']);
  const unstained = run({ ...IRON, stains: [], ironSite: 'Hepatocellular', ironGrade: '2' });
  assert.match(unstained.microscopy, / There is grade 2 hepatocellular iron\.$/);
  assert.deepEqual(levelsFor(unstained, 'stains'), ['info']);
});

test('hepatocellular iron of grade 2 or more adds a siderosis clause to the other patterns', () => {
  const r = run({ ...MASH, stains: ['Masson trichrome', 'Perls'], ironSite: 'Hepatocellular', ironGrade: '2' });
  assert.match(r.diagnosis, /\(MASH\); HEPATOCELLULAR SIDEROSIS \(grade 2\/4\)$/);
  assert.doesNotMatch(run({ ...MASH, stains: ['Perls'], ironSite: 'Hepatocellular', ironGrade: '1' }).diagnosis, /SIDEROSIS/);
  assert.doesNotMatch(run({ ...MASH, stains: [], ironSite: 'Hepatocellular', ironGrade: '3' }).diagnosis, /SIDEROSIS/, 'hidden iron fields do not print');
});

test('no significant abnormality, and a Check when fibrosis is recorded with it', () => {
  const NSA = { ...SPEC, pattern: 'No significant abnormality', stageSystem: '', fibrosis: 'No fibrosis' };
  const r = run(NSA);
  assert.match(r.microscopy, / The lobular architecture is preserved, and the portal tracts and hepatocytes show no significant abnormality\. There is no fibrosis\.$/);
  assert.equal(r.diagnosis, 'LIVER, random, biopsy - NO SIGNIFICANT HISTOLOGICAL ABNORMALITY');
  assert.deepEqual(r.issues, []);
  const fib = run({ ...NSA, fibrosis: 'Portal fibrosis' });
  assert.equal(fib.diagnosis, 'LIVER, random, biopsy - NO SIGNIFICANT HISTOLOGICAL ABNORMALITY; PORTAL FIBROSIS');
  assert.deepEqual(levelsFor(fib, 'pattern'), ['warn']);
});

// ---------- fibrosis and stains ----------

test('fibrosis: stage words print through the connective-tissue stains; a stage without a system is flagged', () => {
  const m = (v) => run({ ...HEP, hepDx: 'Chronic hepatitis B', ...v }).microscopy;
  assert.match(m({ stains: [] }), / There is fibrous expansion of most portal areas, with or without short fibrous septa\.$/);
  assert.match(m({ stains: ['Masson trichrome', 'Reticulin'] }), / Reticulin and Masson trichrome stains show fibrous expansion/);
  assert.match(m({ stageSystem: '', stage: '', fibrosis: 'Bridging fibrosis with nodules' }), / Reticulin stain shows bridging fibrosis with nodule formation\.$/);
  const orphan = run({ ...HEP, hepDx: 'Chronic hepatitis B', stageSystem: '', stage: '3' });
  assert.doesNotMatch(orphan.microscopy, /Reticulin stain shows/);
  assert.doesNotMatch(orphan.diagnosis, /FIBROSIS|stage/);
  assert.deepEqual(levelsFor(orphan, 'stage'), ['warn']);
  const coerced = run({ ...HEP, hepDx: 'Chronic hepatitis B', stageSystem: 'METAVIR', stage: '6' });
  assert.doesNotMatch(coerced.diagnosis, /F6/, 'the stage list follows the system, so a stage it lacks is cleared');
  assert.match(coerced.diagnosis, / and NO FIBROSIS$/);
});

test('stains print in a fixed order inside the one microscopy paragraph', () => {
  const r = run({
    ...HEP, hepDx: 'Chronic hepatitis B', stains: ['HBcAg', 'HBsAg', 'CK19', 'CK7', 'Rhodanine', 'Orcein', 'D-PAS', 'Perls', 'Reticulin'],
    stHbsag: 'Cytoplasmic and membranous staining', stHbcag: 'Nuclear staining', stCk19: 'Bile duct loss', stCk7: 'Periportal hepatocyte expression',
    stRhodanine: 'Copper in periportal hepatocytes', stOrcein: 'HBsAg in hepatocytes', stDpas: 'Diastase-resistant globules'
  });
  const tail = r.microscopy.slice(r.microscopy.indexOf('Reticulin stain'));
  assert.equal(tail, 'Reticulin stain shows fibrous expansion of most portal areas, with or without short fibrous septa. Perls stain shows no stainable iron. '
    + 'D-PAS stain shows diastase-resistant globules in hepatocytes. Orcein stain shows hepatitis B surface antigen in hepatocytes. '
    + 'Rhodanine stain shows copper in periportal hepatocytes. CK7 is expressed by periportal hepatocytes. CK19 shows bile duct loss. '
    + 'HBsAg immunostain shows cytoplasmic and membranous staining of hepatocytes. HBcAg immunostain shows nuclear staining of hepatocytes.');
  assert.ok(!r.microscopy.includes('\n'), 'one paragraph');
});

// ---------- the form ----------

test('the pattern picks the field groups', () => {
  const groups = (pattern) => [...new Set(schema.fields.filter((f) => visible({ pattern }).includes(f.id)).map((f) => f.group).filter(Boolean))];
  assert.deepEqual(groups('Hepatitic'), ['Specimen', 'Pattern', 'Inflammation', 'Hepatitis', 'Fibrosis', 'Stains']);
  assert.deepEqual(groups('Biliary'), ['Specimen', 'Pattern', 'Inflammation', 'Biliary', 'Fibrosis', 'Stains']);
  assert.deepEqual(groups('Steatotic'), ['Specimen', 'Pattern', 'Steatosis', 'Fibrosis', 'Stains']);
  assert.deepEqual(groups('Transplant'), ['Specimen', 'Pattern', 'Transplant', 'Fibrosis', 'Stains']);
  assert.deepEqual(groups('Other'), ['Specimen', 'Pattern', 'Other findings', 'Fibrosis', 'Stains']);
  assert.deepEqual(groups('No significant abnormality'), ['Specimen', 'Pattern', 'Fibrosis', 'Stains']);
  assert.ok(!visible({ pattern: 'Hepatitic', stage: '3' }).includes('fibrosis'), 'a stage replaces the descriptive fibrosis');
  assert.ok(!visible({}).includes('ironSite') && visible({ stains: ['Perls'] }).includes('ironSite'));
  assert.ok(visible({ stains: ['Perls'], ironSite: 'Hepatocellular' }).includes('ironGrade'));
});

test('the staging system follows the pattern until it is changed', () => {
  assert.equal(one({}).parts[0].values.stageSystem, 'Ishak', 'the hepatitic default');
  const move = (from, to, stageSystem) => {
    const part = { values: { ...one({}).parts[0].values, pattern: to, ...(stageSystem !== undefined ? { stageSystem } : {}) } };
    return applyLinkedDefaults(schema, part, 'pattern', from).values.stageSystem;
  };
  assert.equal(move('Hepatitic', 'Steatotic'), 'NASH CRN');
  assert.equal(move('Hepatitic', 'Transplant'), '');
  assert.equal(move('Hepatitic', 'Steatotic', 'METAVIR'), 'METAVIR', 'a chosen system stays');
});

test('a two-part case letters its specimens', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, ...EXAMPLE };
  c.parts[1].values = { ...c.parts[1].values, ...OTHER, specimenName: 'segment 6', otherDx: 'Non-specific reactive hepatitis' };
  const r = generate(schema, t.generator, c);
  assert.match(r.diagnosis, /^\(A\) LIVER, random, biopsy - CHRONIC HEPATITIS/);
  assert.match(r.diagnosis, /\n\(B\) LIVER, segment 6, biopsy - NON-SPECIFIC REACTIVE HEPATITIS$/);
  assert.match(r.microscopy, /^\(A\) Sections show two cores/);
});

test('correlation comments are offered for AIH, drug injury, sclerosing and obstructive biliary disease', () => {
  assert.deepEqual(snippetIds(EXAMPLE), ['liver_aih_correlation']);
  assert.deepEqual(snippetIds({ ...HEP, hepDx: 'Drug-induced liver injury' }), ['liver_dili_correlation']);
  assert.deepEqual(snippetIds({ ...SPEC, pattern: 'Biliary', bilDx: 'Drug-induced liver injury' }), ['liver_dili_correlation']);
  assert.deepEqual(snippetIds({ ...MASH, steatContext: 'Drug-induced' }), ['liver_dili_correlation']);
  assert.deepEqual(snippetIds({ ...SPEC, pattern: 'Biliary', bilDx: 'Primary sclerosing cholangitis' }), ['liver_biliary_imaging']);
  assert.deepEqual(snippetIds({ ...SPEC, pattern: 'Biliary', bilDx: 'Large-duct obstruction' }), ['liver_biliary_imaging']);
  assert.deepEqual(snippetIds(PBC), []);
  assert.deepEqual(snippetIds(TCMR), []);
  assert.equal(run(EXAMPLE).comment, schema.snippets.find((x) => x.id === 'liver_aih_correlation').text, 'a suggested comment prints');
  for (const s of schema.snippets) assert.doesNotMatch(s.text, /\{parts\}|see comment/i, s.id);
});

// ---------- galleries ----------

test('reference galleries sit on the adequacy, pattern and score fields, each image sourced and under 150 kB', () => {
  const withGallery = schema.fields.filter((f) => f.reference).map((f) => f.id);
  for (const id of ['adequacy', 'pattern', 'portalInfl', 'hepDx', 'ishakA', 'bilDx', 'nkFibrosis', 'steatDx', 'nasSteatosis', 'txDx', 'raiPortal', 'stage', 'ironSite']) {
    assert.ok(withGallery.includes(id), id);
  }
  const used = new Set();
  for (const f of schema.fields.filter((x) => x.reference)) {
    for (const g of f.reference.groups) {
      for (const im of g.images || []) {
        used.add(path.basename(im.src));
        assert.match(im.license, /^CC(0| BY| BY-SA)/, `${im.src} licence`);
        assert.ok(!/NC|ND/.test(im.license), `${im.src} is not NC/ND`);
        assert.ok(fs.statSync(path.join(root, im.src)).size <= 150 * 1024, `${im.src} is at most 150 kB`);
      }
    }
  }
  const files = fs.readdirSync(path.join(root, 'assets', 'reference', 'liver_biopsy'));
  assert.deepEqual(files.filter((f) => !used.has(f)), [], 'every gallery file is shown');
  assert.ok(used.size >= 48, `${used.size} images`);
});

test('each section heading of the form has its own gallery, and fibrosis staging shows every system with photos', () => {
  const ref = (id) => schema.fields.find((f) => f.id === id).reference;
  const headings = (id) => ref(id).groups.map((g) => g.heading);
  const photos = (id) => ref(id).groups.reduce((n, g) => n + (g.images || []).length, 0);
  assert.deepEqual(headings('portalInfl'), ['Portal inflammation', 'Interface hepatitis', 'Lobular inflammation', 'Infiltrate type']);
  assert.deepEqual(headings('hepDx'), ['Autoimmune hepatitis', 'Chronic hepatitis B and C', 'Drug-induced liver injury', 'Acute hepatitis', 'Necrosis patterns']);
  assert.deepEqual(headings('bilDx'), ['Primary biliary cholangitis', 'Primary sclerosing cholangitis', 'Large-duct obstruction', 'Cholestasis']);
  assert.deepEqual(headings('steatDx'), ['Steatosis grade', 'Droplet type', 'Ballooning and Mallory-Denk bodies', 'Zone 3 pattern and lobular inflammation']);
  assert.deepEqual(headings('txDx'), ['T-cell-mediated rejection', 'Central perivenulitis', 'Antibody-mediated rejection', 'Chronic rejection',
    'Preservation-reperfusion injury', 'Other causes']);
  assert.deepEqual(headings('stage'), ['Ishak (0-6)', 'METAVIR (F0-F4) and Batts-Ludwig (0-4)', 'NASH CRN (0-4)', 'Stains for fibrosis']);
  for (const [id, n] of [['portalInfl', 5], ['hepDx', 7], ['bilDx', 4], ['steatDx', 6], ['txDx', 6], ['stage', 7]]) assert.equal(photos(id), n, id);
  // each gallery sits on the first field under its heading, so it opens where that section of the form starts
  for (const [id, group] of [['portalInfl', 'Inflammation'], ['hepDx', 'Hepatitis'], ['bilDx', 'Biliary'], ['steatDx', 'Steatosis'], ['txDx', 'Transplant']]) {
    assert.equal(schema.fields.find((x) => x.group === group).id, id, group);
    for (const g of ref(id).groups) for (const im of g.images || []) assert.ok(im.caption && im.credit && /^https?:\/\//.test(im.url), im.src);
  }
});

// ---------- intake ----------

const route = (line, history = '', m = manifest) => matchParts(parseIntake(line), history, m)[0];
const withoutLiverBiopsy = manifest.filter ? manifest.filter((e) => e.id !== 'liver_biopsy') : manifest;
const preset = (line, history = '') => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
};

test('intake: medical liver lines route to the medical form', () => {
  const lines = [
    ['Liver, random biopsy', ''], ['Liver, random, biopsy', ''], ['Liver biopsy, deranged liver function', ''], ['Liver biopsy', 'deranged LFT'],
    ['Liver core biopsy', '? AIH'], ['Liver, segment 6, biopsy', 'HBV, fibrosis staging'], ['Liver allograft biopsy', ''], ['Liver, transplant, biopsy', ''],
    ['Transjugular liver biopsy', ''], ['Liver, TJLB', ''], ['Liver, background, biopsy', 'HCC'], ['Liver, non-lesional, biopsy', ''],
    ['Liver, right lobe, core biopsy', 'fatty liver']
  ];
  for (const [line, history] of lines) {
    const r = route(line, history);
    assert.deepEqual([r.templateId, r.tier], ['liver_biopsy', 'confident'], `${line} [${history}]`);
  }
});

test('intake: mass, lesion, nodule and abscess lines, and plain liver cores, keep the routes they had', () => {
  assert.ok(Array.isArray(manifest), 'the manifest is a list');
  const lines = [
    ['Liver core biopsy', ''], ['Liver', ''], ['Liver lesion, biopsy', ''], ['Liver mass, core biopsy', ''], ['Liver, segment 6, SOL, biopsy', ''],
    ['Liver nodule, biopsy', 'cirrhosis'], ['Liver abscess', ''], ['Liver, segment 6, biopsy', 'hepatitis B, liver mass'], ['Liver, segment 7, wedge resection', ''],
    ['Liver, background, resection', ''], ['Liver, segment 6, biopsy', ''], ['Hepatic flexure, biopsy', 'PSC']
  ];
  for (const [line, history] of lines) {
    const now = route(line, history);
    const before = route(line, history, withoutLiverBiopsy);
    assert.notEqual(now.templateId, 'liver_biopsy', `${line} [${history}]`);
    assert.deepEqual([now.templateId, now.tier], [before.templateId, before.tier], `${line} [${history}] keeps its route`);
  }
});

test('intake: a right or left lobe line offers the medical form first without claiming it', () => {
  const lobe = route('Liver, right lobe, biopsy');
  assert.deepEqual([lobe.templateId, lobe.tier], ['liver_biopsy', 'choose'], 'it opened the lung biopsy form confidently before');
  assert.equal(lobe.candidates[1].id, 'lung_biopsy');
  const bare = route('Liver, left lobe');
  assert.deepEqual([bare.templateId, bare.tier, bare.candidates[0].id], ['generic', 'choose', 'liver_biopsy']);
  assert.notEqual(route('Liver, right lobe, biopsy', 'liver mass').templateId, 'liver_biopsy', 'a mass in the history closes the gate');
  assert.deepEqual(preset('Liver, right lobe, biopsy'), { specimenName: 'right lobe' });
});

test('intake: the site fills from the line', () => {
  assert.deepEqual(preset('Liver, random biopsy'), { specimenName: 'random' });
  assert.deepEqual(preset('Liver, segment 6, biopsy', 'HBV'), { specimenName: 'segment 6' });
  assert.deepEqual(preset('Liver allograft biopsy'), { specimenName: 'allograft' });
  assert.deepEqual(preset('Transjugular liver biopsy'), { specimenName: 'transjugular' });
  assert.deepEqual(preset('Liver, TJLB'), { specimenName: 'transjugular' });
  assert.deepEqual(preset('Liver biopsy', 'deranged LFT'), {});
  assert.deepEqual(preset('Liver, needle biopsy', 'PBC'), {});
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-autoimmune-hepatitis-ishak-3-example', EXAMPLE],
  ['02-pbc-florid-duct-lesion-nakanuma-2', PBC],
  ['03-cholestatic-drug-induced-injury', { ...SPEC, pattern: 'Biliary', bilDx: 'Drug-induced liver injury', diliCholPattern: 'Cholestatic hepatitis', portalInfl: 'Mild', infiltrate: 'Mixed, with eosinophils', interface: 'Absent', lobular: 'Mild', bilFeatures: ['Canalicular cholestasis', 'Hepatocellular cholestasis', 'Ductular reaction'], stageSystem: '', fibrosis: 'No fibrosis', stains: ['Reticulin', 'Perls', 'CK7'], stCk7: 'Ductular reaction' }],
  ['04-mash-nas-5-crn-stage-2', MASH],
  ['05-acute-tcmr-rai-6', TCMR],
  ['06-chronic-hepatitis-b-metavir', { ...HEP, specimenName: 'transjugular', cores: '3', fragmented: true, coreLength: '12', portalTracts: '11', hepDx: 'Chronic hepatitis B', interface: 'Mild', lobular: 'Mild', gradeSystem: 'METAVIR', metavirPn: '1', metavirLn: '1', stageSystem: 'METAVIR', stage: '2', hepFeatures: ['Ground-glass hepatocytes'], stains: ['Reticulin', 'HBsAg', 'HBcAg'], stHbsag: 'Cytoplasmic staining' }],
  ['07-venous-outflow-obstruction', { ...OTHER, otherDx: 'Venous outflow obstruction', outflowFeatures: ['Zone 3 sinusoidal dilatation', 'Sinusoidal congestion', 'Zone 3 hepatocyte loss', 'Perivenular fibrosis'], stains: ['Reticulin'] }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'liver_biopsy', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
