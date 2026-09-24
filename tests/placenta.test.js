// Phase 4b: placenta template (roadmap item 2). Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import { applyStyle } from '../src/style.js';
import gen, { pluralityPhrase, gestationPhrase, chorionicity, blockKey } from '../generators/placenta.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('placenta');
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  c.options = { ...c.options, ...options };
  return c;
};
// Expected strings are written in Amsterdam wording ("fetal"); the schema's British style layer
// may respell them (fetal -> foetal), so compare against the styled form of the expectation.
const house = (s) => applyStyle(s, schema.style);

test('example: singleton third-trimester placenta with no significant pathology', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Placenta, delivery');
  assert.equal(r.macro, 'The placenta weighs 480 g. Consists of a singleton placenta with a centrally inserted umbilical cord. The umbilical cord measures 45 cm long and 1.2 cm in diameter and contains three vessels. The membranes are complete, translucent and marginally inserted. The placental disc measures 18 x 16 x 2.5 cm. The cut surfaces are unremarkable. Representative sections in 4 blocks.');
  assert.equal(r.blockKey, '(1)&(2) Umbilical cord and roll of placental membranes. (3)&(4) Placental disc.');
  assert.equal(r.microscopy, 'Sections of the placenta show third-trimester chorionic villi with no inflammation. The umbilical cord contains two arteries and one vein with no features of funisitis. No chorioamnionitis is seen within the placental membranes. There is no evidence of villitis.');
  assert.equal(r.diagnosis, 'PLACENTA, singleton, third trimester - NO SIGNIFICANT PATHOLOGY');
  assert.ok(!r.report.includes('(A)'), 'single part drops the letter');
  assert.ok(!/undefined|NaN|__/.test(r.report));
});

test('default case (blank measurements) has no dangling text and the same negative diagnosis', () => {
  const r = run(createCase(schema, 1));
  assert.equal(r.macro, 'Consists of a singleton placenta with a centrally inserted umbilical cord. The umbilical cord contains three vessels. The membranes are complete, translucent and marginally inserted. The cut surfaces are unremarkable. Representative sections in 4 blocks.');
  assert.ok(!/weighs|measures|undefined|NaN|\bcm\b/.test(r.macro));
  assert.equal(r.diagnosis, 'PLACENTA, singleton, third trimester - NO SIGNIFICANT PATHOLOGY');
});

test('macro option off removes the macroscopic description and block key', () => {
  const c = example();
  c.options.macro = false;
  const r = run(c);
  assert.equal(r.macro, '');
  assert.equal(r.blockKey, '');
  assert.ok(!r.report.includes('Representative sections'));
  assert.ok(!r.report.includes('Placental disc.'));
  assert.ok(r.report.includes('PLACENTA, singleton, third trimester - NO SIGNIFICANT PATHOLOGY'));
});

test('section headers print the MACROSCOPIC DESCRIPTION and BLOCK KEY blocks in order', () => {
  const c = example();
  c.options.includeHeader = true;
  const r = run(c);
  const order = ['SPECIMEN', 'MACROSCOPIC DESCRIPTION:', 'BLOCK KEY:', 'MICROSCOPIC EXAMINATION', 'DIAGNOSIS'].map((h) => r.report.indexOf(h));
  assert.ok(order.every((i) => i >= 0), 'all headers present');
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test('block key follows the block count: extra blocks are placental disc, fewer blocks collapse', () => {
  const ctx = { options: { macro: true } };
  const key = (blocks) => blockKey({ label: 'A', values: { blocks } }, ctx);
  assert.equal(key('4'), '(A) (1)&(2) Umbilical cord and roll of placental membranes. (3)&(4) Placental disc.');
  assert.equal(key('6'), '(A) (1)&(2) Umbilical cord and roll of placental membranes. (3)-(6) Placental disc.');
  assert.equal(key('3'), '(A) (1)&(2) Umbilical cord and roll of placental membranes. (3) Placental disc.');
  assert.equal(key('2'), '(A) (1) Umbilical cord and roll of placental membranes. (2) Placental disc.');
  assert.equal(key('1'), '(A) (1) Umbilical cord, roll of placental membranes and placental disc.');
  assert.equal(key(''), '(A) (1)&(2) Umbilical cord and roll of placental membranes. (3)&(4) Placental disc.', 'blank block count falls back to 4');
  assert.equal(blockKey({ label: 'A', values: { blocks: '4' } }, { options: { macro: false } }), '');
});

test('macro: twin, eccentric velamentous variants, two-vessel cord, membranes and cut surface findings', () => {
  const r = run(one({
    weight: '350', plurality: 'Twin - monochorionic diamniotic', cordInsertion: 'Eccentric', cordLength: '30', cordDiameter: '', cordVessels: 'Two',
    cordFeatures: 'hypercoiled', membranes: 'Incomplete', membraneColour: 'Green-stained', membraneInsertion: 'Circumvallate',
    discSize: '15x14x2', cutSurface: 'Infarct(s)', cutSurfaceInfarctPercent: '10%', blocks: '5'
  }));
  assert.equal(r.specimens, 'Twin placenta, delivery');
  assert.equal(r.macro, 'The placenta weighs 350 g. Consists of a monochorionic diamniotic twin placenta with an eccentrically inserted umbilical cord. The umbilical cord measures 30 cm long and contains two vessels. The umbilical cord is hypercoiled. The membranes are incomplete, green-stained and circumvallate. The placental disc measures 15 x 14 x 2 cm. The cut surfaces show infarction involving approximately 10% of the disc. Representative sections in 5 blocks.');
  assert.equal(r.blockKey, '(1)&(2) Umbilical cord and roll of placental membranes. (3)-(5) Placental disc.');
  const r2 = run(one({ cordInsertion: 'Velamentous', cutSurface: 'Retroplacental haematoma', membraneInsertion: 'Circummarginate' }));
  assert.ok(r2.macro.includes('with a velamentously inserted umbilical cord.'));
  assert.ok(r2.macro.includes('The membranes are complete, translucent and circummarginate.'));
  assert.ok(r2.macro.includes('The cut surfaces show a retroplacental haematoma.'));
  const r3 = run(one({ cutSurface: 'Other - describe', cutSurfaceOther: 'A 2 cm pale firm area at the margin.' }));
  assert.ok(r3.macro.includes('The cut surfaces show a 2 cm pale firm area at the margin.'));
  const r4 = run(one({ cutSurface: 'Intervillous thrombi', cutSurfaceInfarctPercent: '10' }));
  assert.ok(r4.macro.includes('The cut surfaces show intervillous thrombi.'));
  assert.ok(!r4.macro.includes('10'), 'infarct percentage is ignored when infarcts are not selected');
});

test('chorioamnionitis with funisitis: house microscopy clauses and Amsterdam-staged diagnosis', () => {
  const r = run(one({ chorioamnionitis: 'Stage 2 - acute chorioamnionitis', fetalResponse: 'Stage 1 - umbilical phlebitis or chorionic vasculitis' }));
  assert.equal(r.microscopy, house('Sections of the placenta show third-trimester chorionic villi with no inflammation. The umbilical cord contains two arteries and one vein with mild neutrophilic infiltrates in the wall of the umbilical vein, consistent with funisitis (fetal stage 1). Mild neutrophilic infiltration is seen in the chorion and amnion, consistent with acute chorioamnionitis (maternal stage 2). There is no evidence of villitis.'));
  assert.equal(r.diagnosis, house('PLACENTA, singleton, third trimester - ACUTE CHORIOAMNIONITIS (maternal stage 2) with FUNISITIS (fetal stage 1)'));
});

test('each maternal and fetal stage yields the right capitalised diagnosis', () => {
  const dx = (values) => run(one(values)).diagnosis;
  assert.equal(dx({ chorioamnionitis: 'Stage 1 - acute subchorionitis' }), 'PLACENTA, singleton, third trimester - ACUTE SUBCHORIONITIS (maternal stage 1)');
  assert.equal(dx({ chorioamnionitis: 'Stage 2 - acute chorioamnionitis' }), 'PLACENTA, singleton, third trimester - ACUTE CHORIOAMNIONITIS (maternal stage 2)');
  assert.equal(dx({ chorioamnionitis: 'Stage 3 - necrotising' }), 'PLACENTA, singleton, third trimester - NECROTISING CHORIOAMNIONITIS (maternal stage 3)');
  assert.equal(dx({ fetalResponse: 'Stage 2 - umbilical arteritis' }), house('PLACENTA, singleton, third trimester - FUNISITIS (fetal stage 2)'));
  assert.equal(dx({ chorioamnionitis: 'Stage 3 - necrotising', fetalResponse: 'Stage 3 - necrotising funisitis' }), house('PLACENTA, singleton, third trimester - NECROTISING CHORIOAMNIONITIS (maternal stage 3) with NECROTISING FUNISITIS (fetal stage 3)'));
  const r = run(one({ chorioamnionitis: 'Stage 1 - acute subchorionitis', fetalResponse: 'Stage 3 - necrotising funisitis' }));
  assert.ok(r.microscopy.includes('Neutrophils are present in the subchorionic fibrin and chorionic trophoblast layer of the placental membranes, consistent with acute subchorionitis (maternal stage 1).'));
  assert.ok(r.microscopy.includes(house("extending into Wharton's jelly with concentric bands of necrotic debris, consistent with necrotising funisitis (fetal stage 3).")));
  assert.ok(!r.microscopy.includes('no features of funisitis'));
  assert.ok(!r.microscopy.includes('No chorioamnionitis'));
});

test('villitis, infarcts, retroplacental haematoma and MVM/FVM appear as lower-case clauses', () => {
  const r = run(one({
    chorioamnionitis: 'Stage 2 - acute chorioamnionitis', fetalResponse: 'Stage 1 - umbilical phlebitis or chorionic vasculitis',
    villitis: 'Chronic villitis of unknown aetiology - low grade', infarcts: 'Present - recent', infarctPercent: '5',
    retroplacentalHaematoma: 'Present', mvm: ['Distal villous hypoplasia', 'Increased syncytial knots'], fvm: ['Avascular villi'],
    intervillousThrombi: 'Present', meconium: 'Present - membranes'
  }));
  assert.equal(r.diagnosis, house('PLACENTA, singleton, third trimester - ACUTE CHORIOAMNIONITIS (maternal stage 2) with FUNISITIS (fetal stage 1); CHRONIC VILLITIS OF UNKNOWN AETIOLOGY, LOW GRADE; infarcts (5%); retroplacental haematoma; intervillous thrombi; features of maternal vascular malperfusion; features of fetal vascular malperfusion; meconium staining of the membranes'));
  assert.ok(r.microscopy.startsWith('Sections of the placenta show third-trimester chorionic villi.'), 'no "with no inflammation" when villitis is present');
  assert.ok(r.microscopy.includes('There is a patchy lymphohistiocytic infiltrate within the villous stroma, consistent with chronic villitis of unknown aetiology, low grade.'));
  assert.ok(r.microscopy.includes('Recent infarcts are present, involving approximately 5% of the parenchyma. A retroplacental haematoma is present. Intervillous thrombi are present.'));
  assert.ok(r.microscopy.includes('Features of maternal vascular malperfusion are present, including distal villous hypoplasia and increased syncytial knots.'));
  assert.ok(r.microscopy.includes(house('Features of fetal vascular malperfusion are present, including avascular villi.')));
  assert.ok(r.microscopy.includes('Meconium-laden macrophages are present within the membranes.'));
  assert.ok(!r.microscopy.includes('There is no evidence of villitis.'));
});

test('secondary findings alone: first clause is capitalised; "None" multiselect is silent', () => {
  const r = run(one({ infarcts: 'Present - remote', retroplacentalHaematoma: 'Present', mvm: ['None'], fvm: [] }));
  assert.equal(r.diagnosis, 'PLACENTA, singleton, third trimester - INFARCTS; retroplacental haematoma');
  assert.ok(r.microscopy.includes('Remote infarcts are present. A retroplacental haematoma is present.'));
  assert.ok(!r.microscopy.includes('malperfusion'));
  const r2 = run(one({ villousMaturation: 'Delayed - distal villous immaturity', cordVessels: 'Two', meconium: 'Present - membranes and cord', gestation: 'Second trimester', additionalNotes: 'Focal calcification is noted' }));
  assert.equal(r2.microscopy, 'Sections of the placenta show second-trimester chorionic villi with delayed villous maturation (distal villous immaturity) and no inflammation. The umbilical cord contains a single artery and one vein with no features of funisitis. No chorioamnionitis is seen within the placental membranes. There is no evidence of villitis. Meconium-laden macrophages are present within the membranes and umbilical cord. Focal calcification is noted.');
  assert.equal(r2.diagnosis, 'PLACENTA, singleton, second trimester - DELAYED VILLOUS MATURATION; meconium staining of the membranes and cord; two-vessel umbilical cord (single umbilical artery)');
  const r3 = run(one({ villousMaturation: 'Accelerated', mvm: ['Accelerated villous maturation', 'Decidual arteriopathy'] }));
  assert.equal(r3.diagnosis, 'PLACENTA, singleton, third trimester - FEATURES OF MATERNAL VASCULAR MALPERFUSION', 'accelerated maturation is subsumed by MVM');
  assert.ok(r3.microscopy.includes('chorionic villi with accelerated villous maturation and no inflammation.'));
});

test('two-part dichorionic twin case keeps (A)/(B) prefixes on every block', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, specimenName: 'Twin A placenta', plurality: 'Twin - dichorionic diamniotic', weight: '420', chorioamnionitis: 'Stage 2 - acute chorioamnionitis' };
  c.parts[1].values = { ...c.parts[1].values, specimenName: 'Twin B placenta', plurality: 'Twin - dichorionic diamniotic', weight: '390', blocks: '3' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Twin A placenta\n(B) Twin B placenta');
  const macros = r.macro.split('\n\n');
  assert.ok(macros[0].startsWith('(A) The placenta weighs 420 g. Consists of a dichorionic diamniotic twin placenta with a centrally inserted umbilical cord.'));
  assert.ok(macros[1].startsWith('(B) The placenta weighs 390 g. Consists of a dichorionic diamniotic twin placenta'));
  assert.equal(r.blockKey, '(A) (1)&(2) Umbilical cord and roll of placental membranes. (3)&(4) Placental disc.\n(B) (1)&(2) Umbilical cord and roll of placental membranes. (3) Placental disc.');
  assert.ok(r.microscopy.split('\n\n')[0].startsWith('(A) Sections of the placenta show'));
  assert.ok(r.microscopy.split('\n\n')[1].startsWith('(B) Sections of the placenta show'));
  assert.equal(r.diagnosis, '(A) PLACENTA, twin (dichorionic diamniotic), third trimester - ACUTE CHORIOAMNIONITIS (maternal stage 2)\n(B) PLACENTA, twin (dichorionic diamniotic), third trimester - NO SIGNIFICANT PATHOLOGY');
  assert.equal(schema.maxParts, 2);
  assert.equal(createCase(schema, 5).parts.length, 2, 'maxParts caps a twin case at two parts');
});

test('helpers: plurality, chorionicity and gestation phrases', () => {
  assert.equal(pluralityPhrase({ plurality: 'Singleton' }), 'singleton');
  assert.equal(pluralityPhrase({ plurality: 'Twin - monochorionic monoamniotic' }), 'twin (monochorionic monoamniotic)');
  assert.equal(chorionicity({ plurality: 'Twin - dichorionic diamniotic' }), 'dichorionic diamniotic');
  assert.equal(chorionicity({ plurality: 'Singleton' }), '');
  assert.equal(gestationPhrase({ gestation: 'First trimester' }), 'first trimester');
  assert.equal(gestationPhrase({}), 'third trimester');
});

test('metadata: benign resection in Gynae, aliases, defaults and example keys', () => {
  assert.equal(schema.id, 'placenta');
  assert.equal(schema.generator, 'placenta');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Gynae');
  assert.equal(schema.organ, 'PLACENTA');
  assert.equal(schema.label, 'Placenta');
  assert.equal(schema.rank, 22);
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['chorioamnionitis', 'funisitis', 'villitis', 'twin', 'MVM', 'FVM', 'retroplacental haematoma']) assert.ok(schema.aliases.includes(a), `alias ${a}`);
  assert.deepEqual(schema.options.map((o) => o.id), ['includeHeader', 'macro']);
  assert.equal(schema.style.british, true);
  const ids = schema.fields.map((f) => f.id);
  for (const f of schema.fields) {
    assert.ok('default' in f, `${f.id} has a default`);
    assert.ok(f.id && f.label && f.type, `${f.id} has id, label and type`);
    if (f.showIf) assert.ok(ids.includes(f.showIf.field), `${f.id} showIf refers to a known field`);
  }
  const grouped = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => ids.indexOf(f.id));
  assert.ok(grouped.length >= 10);
  assert.ok(grouped.every((i, k) => k === 0 || i === grouped[k - 1] + 1), 'Macroscopy fields are consecutive');
  assert.equal(ids[0], 'specimenName');
  assert.equal(ids[ids.length - 1], 'additionalNotes');
  for (const p of schema.example.parts) {
    for (const k of Object.keys(p.values)) assert.ok(ids.includes(k), `example key ${k} exists in fields`);
    for (const id of ids) assert.ok(id in p.values, `example has ${id}`);
  }
  assert.deepEqual(Object.keys(schema.example.options).sort(), ['includeHeader', 'macro']);
});
