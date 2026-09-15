// Phase 4b: aortic valve / aorta (cardiovascular) template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/cardiovascular.js';
import { sizePhrase, lengthPhrase, kindOf } from '../generators/cardiovascular.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('aortic_valve_aorta');
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  Object.assign(c.options, options);
  return c;
};
const AORTA = { specimenName: 'Ascending aorta, resection', aortaLength: '5', aortaDiameter: '3.5', aortaWall: '0.3', tearSize: '1.5' };

const VALVE_DX = 'AORTIC VALVE, replacement - CALCIFIC DEGENERATION, tricuspid morphology; no evidence of endocarditis';
const AORTA_DX = 'AORTA, ascending, resection - ACUTE DISSECTION WITH MODERATE MEDIAL DEGENERATION';
const VALVE_MICRO = 'Sections show valve cusps with nodular dystrophic calcification and fibrosis. There is no evidence of active inflammation, vegetation or organisms on Gram and GMS stains.';
const AORTA_MICRO = 'Sections show the aortic wall with an intimal tear and a dissection plane within the outer third of the media containing fresh haemorrhage and fibrin. The media shows moderate mucoid extracellular matrix accumulation and elastic fibre fragmentation, with mild loss of smooth muscle nuclei and no laminar medial collapse. Overall, moderate medial degeneration. Atherosclerosis is mild. There is no evidence of aortitis or malignancy.';

test('metadata: benign cardiovascular resection with search aliases and complete defaults', () => {
  assert.equal(schema.id, 'aortic_valve_aorta');
  assert.equal(schema.generator, 'cardiovascular');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Cardiovascular');
  assert.equal(schema.name, 'Aortic valve / aorta');
  assert.equal(schema.shortName, 'Heart · valve / aorta');
  assert.equal(schema.label, 'Aortic valve');
  assert.equal(schema.organ, 'AORTIC VALVE');
  assert.equal(schema.rank, 38);
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['aortic valve', 'dissection', 'endocarditis', 'bicuspid', 'aortitis']) assert.ok(schema.aliases.includes(a), a);
  assert.equal(schema.maxParts, 4);
  assert.equal(schema.defaultParts, 1);
  for (const f of schema.fields) assert.ok('default' in f, `${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is a field`);
  for (const id of ids) for (const p of schema.example.parts) assert.ok(id in p.values, `example part ${p.label} carries ${id}`);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.deepEqual(schema.fields[0].options, ['Aortic valve, replacement', 'Mitral valve, replacement', 'Prosthetic valve, explant', 'Ascending aorta, resection', 'Aortic root, resection']);
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  // Macroscopy fields are consecutive and sit directly after specimenName.
  const groupIdx = schema.fields.map((f, i) => (f.group === 'Macroscopy' ? i : -1)).filter((i) => i >= 0);
  assert.equal(groupIdx[0], 1);
  assert.equal(groupIdx[groupIdx.length - 1] - groupIdx[0] + 1, groupIdx.length);
  assert.deepEqual(schema.snippets.map((s) => s.id), ['endocarditis_blood_culture', 'aortitis_vasculitis', 'cardiovascular_cancer_template']);
});

test('helpers: size / length phrases and part kinds', () => {
  assert.equal(sizePhrase('2.5x1.5x0.5'), '2.5 x 1.5 x 0.5 cm');
  assert.equal(sizePhrase('2.5 X 1.5 × 0.5 cm'), '2.5 x 1.5 x 0.5 cm');
  assert.equal(sizePhrase(''), '');
  assert.equal(lengthPhrase('5'), '5 cm');
  assert.equal(lengthPhrase('3.5cm'), '3.5 cm');
  assert.equal(lengthPhrase('4 mm'), '4 mm');
  assert.equal(lengthPhrase(''), '');
  assert.equal(kindOf({ specimenName: 'Aortic valve, replacement' }), 'valve');
  assert.equal(kindOf({ specimenName: 'Mitral valve, replacement' }), 'valve');
  assert.equal(kindOf({ specimenName: 'Prosthetic valve, explant' }), 'prosthetic');
  assert.equal(kindOf({ specimenName: 'Ascending aorta, resection' }), 'aorta');
  assert.equal(kindOf({ specimenName: 'Aortic root, resection' }), 'aorta');
});

test('example: tricuspid calcific aortic valve (A) and ascending aorta with acute dissection (B)', () => {
  const r = run(example());
  assert.equal(r.specimens, '(A) Aortic valve, replacement\n(B) Ascending aorta, resection');
  assert.equal(r.macro, '(A) Received in formalin are three cusps of aortic valve measuring up to 2.5 x 1.5 x 0.5 cm, with nodular calcification on the aortic aspect. Decalcified and all embedded in 2 blocks.\n\n(B) Received in formalin is a segment of aorta measuring 5 cm in length and 3.5 cm in diameter, with a wall thickness of 0.3 cm. The intima shows an intimal tear measuring 1.5 cm with a false lumen. Representative sections in 4 blocks.');
  assert.equal(r.blockKey, '(A) (1-2) Valve cusps, decalcified, all embedded.\n(B) (1-4) Aortic wall including intimal tear, representative sections.');
  assert.equal(r.microscopy, `(A) ${VALVE_MICRO}\n\n(B) ${AORTA_MICRO}`);
  assert.equal(r.diagnosis, `(A) ${VALVE_DX}\n(B) ${AORTA_DX}`);
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('undefined'));
});

test('default single part is the house calcific aortic valve report without letters', () => {
  const r = run(createCase(schema, 1));
  assert.equal(r.specimens, 'Aortic valve, replacement');
  assert.equal(r.macro, 'Received in formalin are three cusps of aortic valve, with nodular calcification on the aortic aspect. Decalcified and all embedded in 2 blocks.');
  assert.equal(r.blockKey, '(1-2) Valve cusps, decalcified, all embedded.');
  assert.equal(r.microscopy, VALVE_MICRO);
  assert.equal(r.diagnosis, VALVE_DX);
  assert.ok(!r.report.includes('(A)'));
});

test('second part defaults to the ascending aorta via partDefaults', () => {
  const r = run(createCase(schema, 2));
  assert.equal(r.specimens, '(A) Aortic valve, replacement\n(B) Ascending aorta, resection');
  assert.equal(r.diagnosis.split('\n')[1], `(B) ${AORTA_DX}`);
});

test('macro option off removes the macroscopic description and block key', () => {
  const r = run(one({}, { macro: false }));
  assert.equal(r.macro, '');
  assert.equal(r.blockKey, '');
  assert.ok(!r.report.includes('Received in formalin'));
  assert.ok(!r.report.includes('(1-2)'));
  assert.ok(r.report.startsWith('Aortic valve, replacement\n\nSections show valve cusps'));
  const a = run(one(AORTA, { macro: false }));
  assert.equal(a.macro, '');
  assert.equal(a.blockKey, '');
});

test('headers option labels the macro and block key blocks', () => {
  const r = run(one({}, { includeHeader: true }));
  assert.ok(r.report.includes('MACROSCOPIC DESCRIPTION:\nReceived in formalin'));
  assert.ok(r.report.includes('BLOCK KEY:\n(1-2) Valve cusps, decalcified, all embedded.'));
});

test('two-part case keeps (A)/(B) prefixes on every block', () => {
  const c = createCase(schema, 2);
  c.parts[1].values = { ...c.parts[1].values, ...AORTA };
  const r = run(c);
  for (const block of [r.specimens, r.macro, r.blockKey, r.microscopy, r.diagnosis]) {
    assert.ok(block.startsWith('(A) '), block);
    assert.ok(/\n\n?\(B\) /.test(block), block);
  }
  assert.equal(r.diagnosis, `(A) ${VALVE_DX}\n(B) ${AORTA_DX}`);
});

test('valve: cusp morphology and secondary findings drive the diagnosis', () => {
  const dx = (values) => run(one(values)).diagnosis;
  assert.equal(dx({ cuspMorphology: 'Bicuspid' }), 'AORTIC VALVE, replacement - CALCIFIC DEGENERATION, bicuspid morphology; no evidence of endocarditis');
  assert.ok(run(one({ cuspMorphology: 'Bicuspid' })).microscopy.includes('The cusps are in keeping with a bicuspid aortic valve.'));
  assert.equal(dx({ cuspMorphology: 'Fragments, morphology cannot be assessed' }), 'AORTIC VALVE, replacement - CALCIFIC DEGENERATION, cusp morphology cannot be assessed on fragments; no evidence of endocarditis');
  assert.equal(dx({ calcific: 'None', myxoid: 'Present' }), 'AORTIC VALVE, replacement - MYXOID DEGENERATION, tricuspid morphology; no evidence of endocarditis');
  assert.equal(dx({ calcific: 'Severe', rheumatic: 'Present', commissuralFusion: 'Present' }), 'AORTIC VALVE, replacement - CALCIFIC DEGENERATION; CHRONIC RHEUMATIC-TYPE VALVE DISEASE, tricuspid morphology, commissural fusion; no evidence of endocarditis');
  assert.equal(dx({ calcific: 'None' }), 'AORTIC VALVE, replacement - NO SIGNIFICANT ABNORMALITY, tricuspid morphology; no evidence of endocarditis');
  assert.equal(dx({ specimenName: 'Mitral valve, replacement', calcific: 'None', myxoid: 'Present' }), 'MITRAL VALVE, replacement - MYXOID DEGENERATION; no evidence of endocarditis');
});

test('valve: calcific grades and secondary findings in the microscopy', () => {
  const r = run(one({ calcific: 'Severe', rheumatic: 'Present', commissuralFusion: 'Present', myxoid: 'Present', cuspMorphology: 'Fragments, morphology cannot be assessed' }));
  assert.equal(r.microscopy, 'Sections show valve cusps with extensive nodular dystrophic calcification and fibrosis. The valve is received in fragments and the cusp morphology cannot be assessed. There is myxoid degeneration with expansion of the spongiosa. Commissural fusion is present. There is diffuse fibrosis of the valve cusps with neovascularisation, in keeping with rheumatic-type valve disease. There is no evidence of active inflammation, vegetation or organisms on Gram and GMS stains.');
  assert.ok(run(one({ calcific: 'Mild' })).microscopy.startsWith('Sections show valve cusps with focal nodular dystrophic calcification and fibrosis.'));
  assert.ok(run(one({ calcific: 'None' })).microscopy.startsWith('Sections show valve cusps with fibrosis and no significant calcification.'));
  const m = run(one({ specimenName: 'Mitral valve, replacement', cuspCount: '2', valveSize: '3 x 2 x 0.3', valveMacro: 'Thickened, myxoid and redundant' }));
  assert.equal(m.macro, 'Received in formalin are two leaflets of mitral valve measuring up to 3 x 2 x 0.3 cm, which are thickened, myxoid and redundant. Decalcified and all embedded in 2 blocks.');
  assert.equal(m.blockKey, '(1-2) Valve leaflets, decalcified, all embedded.');
  assert.ok(m.microscopy.startsWith('Sections show valve leaflets with'));
});

test('endocarditis: vegetations give the infective diagnosis and the blood culture comment', () => {
  const r = run(one({ vegetations: true, organisms: 'Gram-positive cocci' }));
  assert.equal(r.diagnosis, 'AORTIC VALVE, replacement - ACTIVE INFECTIVE ENDOCARDITIS, Gram-positive cocci on Gram stain; background calcific degeneration; tricuspid morphology');
  assert.ok(r.microscopy.includes('Vegetations composed of fibrin, platelets and neutrophils are present on the cusp surface, with underlying acute inflammation and tissue destruction, in keeping with active endocarditis. Gram stain shows Gram-positive cocci within the vegetations; GMS stain shows no fungal organisms.'));
  assert.ok(!r.microscopy.includes('There is no evidence of active inflammation'));
  assert.equal(r.comment, 'Correlation with blood culture results is advised.');
  assert.equal(run(one({ vegetations: true, organisms: 'Fungal hyphae' })).diagnosis, 'AORTIC VALVE, replacement - ACTIVE INFECTIVE ENDOCARDITIS, fungal hyphae on GMS stain; background calcific degeneration; tricuspid morphology');
  assert.equal(run(one({ vegetations: true, organisms: 'Negative', calcific: 'None' })).diagnosis, 'AORTIC VALVE, replacement - ACTIVE ENDOCARDITIS, no organisms identified on Gram and GMS stains; tricuspid morphology');
  assert.equal(run(one({ vegetations: false })).comment, '');
});

test('prosthetic valve explant: findings multiselect, macro and block key', () => {
  const r = run(one({ specimenName: 'Prosthetic valve, explant', prosthesisType: 'Bioprosthetic valve, 23 mm', prosthesisDiameter: '2.5', valveBlocks: '3', prostheticFindings: ['Pannus', 'Cuspal degeneration'] }));
  assert.equal(r.specimens, 'Prosthetic valve, explant');
  assert.equal(r.macro, 'Received in formalin is an explanted prosthetic valve (bioprosthetic valve, 23 mm) measuring 2.5 cm in diameter. The cusps and sewing ring are decalcified and all embedded in 3 blocks.');
  assert.equal(r.blockKey, '(1-3) Prosthetic valve cusps and sewing ring, decalcified, all embedded.');
  assert.equal(r.microscopy, 'Sections show a prosthetic valve with pannus formation composed of fibrous tissue extending from the sewing ring over the cusps and cuspal degeneration with collagen disruption and calcification. There is no evidence of active inflammation, vegetation or organisms on Gram and GMS stains.');
  assert.equal(r.diagnosis, 'PROSTHETIC VALVE, explant - PANNUS FORMATION AND CUSPAL DEGENERATION; no evidence of endocarditis');
  const none = run(one({ specimenName: 'Prosthetic valve, explant', prostheticFindings: [], decalcified: false }));
  assert.equal(none.diagnosis, 'PROSTHETIC VALVE, explant - NO SIGNIFICANT ABNORMALITY; no evidence of endocarditis');
  assert.ok(none.microscopy.startsWith('Sections show prosthetic valve cusps and sewing ring without significant pannus, thrombus or cuspal degeneration.'));
  assert.ok(none.macro.endsWith('The cusps and sewing ring are all embedded in 2 blocks.'));
  assert.equal(none.blockKey, '(1-2) Prosthetic valve cusps and sewing ring, all embedded.');
  const ie = run(one({ specimenName: 'Prosthetic valve, explant', prostheticFindings: ['Thrombus'], vegetations: true, organisms: 'Gram-positive cocci' }));
  assert.equal(ie.diagnosis, 'PROSTHETIC VALVE, explant - ACTIVE INFECTIVE ENDOCARDITIS, Gram-positive cocci on Gram stain; background thrombus');
  assert.equal(ie.comment, 'Correlation with blood culture results is advised.');
});

test('aorta: each dissection option yields the right capitalised diagnosis', () => {
  const dx = (values) => run(one({ ...AORTA, ...values })).diagnosis;
  assert.equal(dx({ dissection: 'Acute' }), AORTA_DX);
  assert.equal(dx({ dissection: 'Subacute' }), 'AORTA, ascending, resection - SUBACUTE DISSECTION WITH MODERATE MEDIAL DEGENERATION');
  assert.equal(dx({ dissection: 'Chronic, healed' }), 'AORTA, ascending, resection - CHRONIC (HEALED) DISSECTION WITH MODERATE MEDIAL DEGENERATION');
  assert.equal(dx({ dissection: 'None', medialGrade: 'Severe' }), 'AORTA, ascending, resection - SEVERE MEDIAL DEGENERATION');
  assert.equal(dx({ dissection: 'None', medialGrade: 'Mild', atherosclerosis: 'Severe' }), 'AORTA, ascending, resection - MILD MEDIAL DEGENERATION; severe atherosclerosis');
  assert.equal(dx({ specimenName: 'Aortic root, resection' }), 'AORTIC ROOT, resection - ACUTE DISSECTION WITH MODERATE MEDIAL DEGENERATION');
});

test('aorta: dissection variants and SCVP medial degeneration grading in the microscopy', () => {
  assert.equal(run(one(AORTA)).microscopy, AORTA_MICRO);
  const sub = run(one({ ...AORTA, dissection: 'Subacute', intimalTear: 'Not identified', mecm: 'Severe', elastic: 'Moderate', smcLoss: 'Moderate', laminarCollapse: 'Present', medialGrade: 'Severe', atherosclerosis: 'None' }));
  assert.equal(sub.microscopy, 'Sections show the aortic wall with a dissection plane within the outer third of the media containing organising haemorrhage with granulation tissue and early fibrosis. No intimal tear is identified in the sections examined. The media shows severe mucoid extracellular matrix accumulation and moderate elastic fibre fragmentation, with moderate loss of smooth muscle nuclei and laminar medial collapse. Overall, severe medial degeneration. There is no significant atherosclerosis. There is no evidence of aortitis or malignancy.');
  const chronic = run(one({ ...AORTA, dissection: 'Chronic, healed' }));
  assert.ok(chronic.microscopy.includes('a dissection plane within the outer third of the media which is fibrosed, with neointima lining the false lumen.'));
  const haem = run(one({ ...AORTA, falseLumen: 'Outer-media haemorrhage only' }));
  assert.ok(haem.microscopy.startsWith('Sections show the aortic wall with an intimal tear and haemorrhage within the outer third of the media without a defined false lumen.'));
  const none = run(one({ ...AORTA, dissection: 'None', mecm: 'Mild', elastic: 'Mild', smcLoss: 'None', medialGrade: 'Mild', atherosclerosis: 'Moderate' }));
  assert.equal(none.microscopy, 'Sections show the aortic wall with an intact intima and no dissection. The media shows mild mucoid extracellular matrix accumulation and elastic fibre fragmentation, without loss of smooth muscle nuclei or laminar medial collapse. Overall, mild medial degeneration. Atherosclerosis is moderate. There is no evidence of aortitis or malignancy.');
});

test('aorta: aortitis options add the capitalised entity and the large vessel vasculitis comment', () => {
  const r = run(one({ ...AORTA, dissection: 'None', aortitis: 'Giant cell', intimaMacro: 'Atheromatous plaques' }));
  assert.equal(r.diagnosis, 'AORTA, ascending, resection - MODERATE MEDIAL DEGENERATION; GIANT CELL AORTITIS');
  assert.ok(r.microscopy.includes('There is a granulomatous inflammatory infiltrate within the media with multinucleated giant cells and laminar medial necrosis, in keeping with giant cell aortitis. There is no evidence of malignancy.'));
  assert.ok(!r.microscopy.includes('no evidence of aortitis'));
  assert.equal(r.comment, 'Clinical correlation for large vessel vasculitis is advised.');
  assert.ok(r.macro.includes('The intima shows atheromatous plaques.'));
  assert.equal(r.blockKey, '(1-4) Aortic wall, representative sections.');
  const dx = (aortitis) => run(one({ ...AORTA, aortitis })).diagnosis;
  assert.equal(dx('Lymphoplasmacytic'), `${AORTA_DX}; LYMPHOPLASMACYTIC AORTITIS`);
  assert.equal(dx('IgG4-pattern'), `${AORTA_DX}; LYMPHOPLASMACYTIC AORTITIS, IgG4-pattern`);
  assert.equal(dx('Infectious'), `${AORTA_DX}; INFECTIOUS AORTITIS`);
  assert.equal(run(one(AORTA)).comment, '');
});

test('aorta macro variants: aortic root, tear without false lumen, smooth intima, aneurysm, block counts', () => {
  const root = run(one({ ...AORTA, specimenName: 'Aortic root, resection', intimaMacro: 'Intimal tear', aortaBlocks: '6' }));
  assert.equal(root.macro, 'Received in formalin is a segment of aortic root measuring 5 cm in length and 3.5 cm in diameter, with a wall thickness of 0.3 cm. The intima shows an intimal tear measuring 1.5 cm. Representative sections in 6 blocks.');
  assert.equal(root.blockKey, '(1-6) Aortic wall including intimal tear, representative sections.');
  assert.ok(run(one({ ...AORTA, intimaMacro: 'Smooth' })).macro.includes('The intima is smooth.'));
  assert.ok(run(one({ ...AORTA, intimaMacro: 'Aneurysmal dilatation' })).macro.includes('The segment is aneurysmally dilated and the intima shows atheromatous plaques.'));
  assert.ok(run(one({ ...AORTA, aortaBlocks: '1' })).macro.endsWith('Representative sections in 1 block.'));
  assert.equal(run(one({ ...AORTA, aortaBlocks: '1' })).blockKey, '(1) Aortic wall including intimal tear, representative sections.');
});

test('valve macro variants: single cusp, fragments, no decalcification, block counts', () => {
  const single = run(one({ cuspCount: '1', valveSize: '2 x 1 x 0.3', valveMacro: 'Thickened and fibrotic', valveBlocks: '1', decalcified: false }));
  assert.equal(single.macro, 'Received in formalin is a cusp of aortic valve measuring 2 x 1 x 0.3 cm, which is thickened and fibrotic. All embedded in 1 block.');
  assert.equal(single.blockKey, '(1) Valve cusps, all embedded.');
  const frag = run(one({ cuspCount: '5', cuspMorphology: 'Fragments, morphology cannot be assessed', valveMacro: 'Nodular calcification', valveBlocks: '3' }));
  assert.equal(frag.macro, 'Received in formalin are five fragments of aortic valve, with nodular calcification. Decalcified and all embedded in 3 blocks.');
  assert.equal(frag.blockKey, '(1-3) Valve cusps, decalcified, all embedded.');
  assert.ok(run(one({ valveMacro: 'Unremarkable' })).macro.startsWith('Received in formalin are three cusps of aortic valve. Decalcified'));
});

test('blank size, length, wall and tear fields produce no dangling text', () => {
  const v = run(one({ valveSize: '' }));
  assert.equal(v.macro, 'Received in formalin are three cusps of aortic valve, with nodular calcification on the aortic aspect. Decalcified and all embedded in 2 blocks.');
  const a = run(one({ specimenName: 'Ascending aorta, resection' }));
  assert.equal(a.macro, 'Received in formalin is a segment of aorta. The intima shows an intimal tear with a false lumen. Representative sections in 4 blocks.');
  const d = run(one({ specimenName: 'Ascending aorta, resection', aortaDiameter: '3.5' }));
  assert.ok(d.macro.startsWith('Received in formalin is a segment of aorta measuring 3.5 cm in diameter.'));
  const p = run(one({ specimenName: 'Prosthetic valve, explant' }));
  assert.ok(p.macro.startsWith('Received in formalin is an explanted prosthetic valve.'));
  for (const r of [v, a, d, p]) {
    assert.ok(!r.report.includes('undefined'));
    assert.ok(!r.report.includes('__'));
    assert.ok(!r.report.includes('measuring  '));
    assert.ok(!r.report.includes(' .'));
  }
});

test('neoplasia option gives a short diagnosis line and the QMH cancer template comment', () => {
  const a = run(one({ ...AORTA, neoplasia: 'Malignant tumour – see comment' }));
  assert.equal(a.diagnosis, 'AORTA, ascending, resection - MALIGNANT TUMOUR; acute dissection with moderate medial degeneration; see comment');
  assert.ok(a.microscopy.includes('A malignant tumour is present within the aortic wall; see comment. There is no evidence of aortitis.'));
  assert.ok(!a.microscopy.includes('or malignancy'));
  assert.equal(a.comment, 'A malignant tumour is identified. This benign template does not classify or stage the tumour; the appropriate QMH cancer template should be used for the final synoptic report.');
  const v = run(one({ neoplasia: 'Malignant tumour – see comment' }));
  assert.equal(v.diagnosis, 'AORTIC VALVE, replacement - MALIGNANT TUMOUR; background calcific degeneration; tricuspid morphology; see comment');
  assert.ok(v.microscopy.includes('A malignant tumour is present within the valve; see comment.'));
  const c = createCase(schema, 2);
  c.parts[1].values.neoplasia = 'Malignant tumour – see comment';
  assert.ok(run(c).comment.includes('is identified (part B).'));
});

test('additional notes are appended to the microscopy', () => {
  const r = run(one({ additionalNotes: 'Focal ossification is present.' }));
  assert.ok(r.microscopy.endsWith('on Gram and GMS stains. Focal ossification is present.'));
  const a = run(one({ ...AORTA, additionalNotes: 'Elastic van Gieson stain confirms the elastic fibre loss.' }));
  assert.ok(a.microscopy.endsWith('There is no evidence of aortitis or malignancy. Elastic van Gieson stain confirms the elastic fibre loss.'));
});
