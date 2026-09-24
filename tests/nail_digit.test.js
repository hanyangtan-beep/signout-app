// Nail and digit (benign batch 3). Card: docs/roadmap.md "Nail and digit"; house sentences from the 2021-2026
// benign-resection profile, and the lesion and bone sentences of the forms these specimens used to go to.
// Wording is deliberate; update the strings only on purpose.
// Fixtures: tests/fixtures/nail_digit/*.json (golden; --update only after a deliberate change).
// The routing lines below are house-style lines, not case text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { extractMacro } from '../src/macroparse.js';
import { rowGroups } from '../src/picker.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { CLIPPING, AVULSION, BED_BIOPSY, NAIL_UNIT, LESION, AMPUTATION, NO_FUNGUS, HAEMATOMA, MELANOCYTIC, DESCRIPTIVE, MARGIN_INVOLVED } from '../generators/nail_digit.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.nail_digit;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'nail_digit');
const UPDATE = process.argv.includes('--update');
const EXAMPLE = schema.example.parts[0].values;
const NEM = 'There is no evidence of malignancy.';
const make = (s, values) => {
  const c = createCase(s, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};
const runIn = (id, values) => generate(registry[id].schema, registry[id].generator, make(registry[id].schema, values));
const run = (values) => runIn('nail_digit', values);
const bare = (text) => text.replace(/^\([A-Z]\)\s*/, '');
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const visible = (values) => schema.fields.filter((f) => isVisible(f, { ...make(schema, {}).parts[0].values, ...values })).map((f) => f.id);
const checksOf = (r) => r.issues.map((i) => [i.level, i.field]);
const AMP = { specimen: AMPUTATION, organ: 'TOE', site: 'left 2nd toe', dimensions: '6 x 2.5 x 2', blocks: '3', blockScheme: 'Representative sections' };

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has nail_digit');
  assert.equal(schema.system, 'Skin');
  assert.equal(schema.kind, 'benign resection');
  assert.ok(schema.label && !/^(biopsy|polyp|specimen)$/i.test(schema.label), 'label is an organ word');
  assert.ok(schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
  assert.equal(schema.style.british, true);
});

test('it sits in the Resections row under Skin / soft tissue and is no longer a pending placeholder', () => {
  const planned = JSON.parse(fs.readFileSync(path.join(here, '..', 'templates', 'planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((p) => p.id === 'nail_digit'), 'not in planned.json');
  const group = rowGroups(manifest, planned, 'bottom').find((g) => g.items.some((i) => i.id === 'nail_digit'));
  assert.ok(group, 'in the Resections & frozen row');
  assert.deepEqual([group.system, group.label], ['Skin', 'Skin / soft tissue']);
  assert.ok(!group.items.find((i) => i.id === 'nail_digit').planned, 'a built template, not a pending one');
});

test('the example case renders every expected block', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, t.generator, c);
  for (const heading of [/SPECIMENS?:/, /MACROSCOPIC DESCRIPTION:/, /BLOCK KEY:/, /MICROSCOPIC EXAMINATION:/, /DIAGNOSIS:/]) assert.match(r.report, heading);
});

test('the example: a PAS-positive nail clipping', () => {
  const r = run(EXAMPLE);
  assert.equal(r.specimens, 'Nail, right hallux, clipping');
  assert.equal(r.macro, 'Received in formalin is a nail clipping labelled right hallux, measuring 1.2 x 0.4 x 0.1 cm. All embedded on edge in 1 block.');
  assert.equal(r.blockKey, '(1) Nail clipping, all embedded.');
  assert.equal(r.microscopy, 'Sections show nail plate. Fungal hyphae are identified within the nail plate on PAS stain. The features are those of onychomycosis.');
  assert.equal(r.diagnosis, 'NAIL, right hallux, clipping - ONYCHOMYCOSIS');
  assert.equal(r.comment, '');
  assert.deepEqual(r.issues, []);
});

test('nail-plate diagnoses: no fungus on two stains, a dry specimen, and a subungual haematoma', () => {
  const neg = run({ ...EXAMPLE, diagnosis: NO_FUNGUS, stain: 'PAS and GMS', fixative: 'Dry' });
  assert.equal(neg.macro, 'Received dry is a nail clipping labelled right hallux, measuring 1.2 x 0.4 x 0.1 cm. All embedded on edge in 1 block.');
  assert.equal(neg.microscopy, 'Sections show nail plate. No fungal organisms are identified on PAS and GMS stains.');
  assert.equal(neg.diagnosis, 'NAIL, right hallux, clipping - NO FUNGAL ORGANISMS IDENTIFIED');
  const blood = run({ ...EXAMPLE, specimen: AVULSION, diagnosis: HAEMATOMA, site: 'left great toenail' });
  assert.equal(blood.specimens, 'Nail, left great toe, avulsion', 'toenail prints as the toe');
  assert.equal(blood.macro, 'Received in formalin is a nail plate labelled left great toe, measuring 1.2 x 0.4 x 0.1 cm. Sectioned longitudinally and all embedded in 1 block.');
  assert.equal(blood.blockKey, '(1) Nail plate, all embedded.');
  assert.equal(blood.microscopy, 'Sections show nail plate with a layer of blood on its undersurface. No fungal organisms are identified on PAS stain. The features are those of a subungual haematoma.');
  assert.equal(blood.diagnosis, 'NAIL, left great toe, avulsion - SUBUNGUAL HAEMATOMA');
  assert.equal(run({ specimen: CLIPPING, site: 'right index fingernail' }).specimens, 'Nail, right index finger, clipping');
});

test('nail-unit biopsies and excisions: a melanocytic lesion takes its comment; the descriptive line prints the findings', () => {
  const mel = run({ specimen: BED_BIOPSY, site: 'right thumb nail matrix', procedure: 'Punch biopsy', diagnosis: MELANOCYTIC, dimensions: '0.3 x 0.3 x 0.3' });
  assert.equal(mel.specimens, 'Nail, right thumb nail matrix, punch biopsy');
  assert.equal(mel.macro, 'Received in formalin is a piece of nail unit tissue labelled right thumb nail matrix, measuring 0.3 x 0.3 x 0.3 cm. Sectioned longitudinally and all embedded in 1 block.');
  assert.equal(mel.blockKey, '(1) Nail unit, all embedded.');
  assert.equal(mel.microscopy, 'Sections show nail unit epithelium with a melanocytic proliferation; see comment.');
  assert.equal(mel.diagnosis, 'NAIL, right thumb nail matrix, punch biopsy - MELANOCYTIC LESION OF THE NAIL UNIT; see comment');
  assert.match(mel.comment, /^A melanocytic lesion of the nail unit is present\. /);
  const unit = run({ specimen: NAIL_UNIT, site: 'left index fingernail', diagnosis: DESCRIPTIVE, findingsText: 'nail unit tissue with chronic paronychia', dimensions: '1.5 x 1 x 0.6', blocks: '2' });
  assert.equal(unit.specimens, 'Nail, left index finger, excision');
  assert.equal(unit.macro, 'Received in formalin is a nail-unit excision specimen labelled left index finger, measuring 1.5 x 1 x 0.6 cm. Sectioned longitudinally and all embedded in 2 blocks.');
  assert.equal(unit.microscopy, `Sections show nail unit tissue with chronic paronychia. ${NEM}`);
  assert.equal(unit.diagnosis, 'NAIL, left index finger, excision - NO EVIDENCE OF MALIGNANCY');
});

test('lesion excisions under a digit head; an exostosis is decalcified', () => {
  const cyst = run({ specimen: LESION, organ: 'FINGER', site: 'right index finger', diagnosis: 'Digital mucous cyst', dimensions: '0.8 x 0.6 x 0.5' });
  assert.equal(cyst.specimens, 'Finger, right index finger, excision');
  assert.equal(cyst.macro, 'Received in formalin is a piece of tissue labelled right index finger, measuring 0.8 x 0.6 x 0.5 cm. All embedded in 1 block.');
  assert.equal(cyst.blockKey, '(1) Lesion, all embedded.');
  assert.equal(cyst.microscopy, `Sections show a focal collection of mucin in the dermis, with surrounding fibrous stroma and no epithelial lining. The features are those of a digital mucous (myxoid) cyst. ${NEM}`);
  assert.equal(cyst.diagnosis, 'FINGER, right index finger, excision - DIGITAL MUCOUS CYST');
  const exo = run({ specimen: LESION, organ: 'TOE', site: 'left hallux subungual', diagnosis: 'Subungual exostosis', procedure: 'Excision' });
  assert.equal(exo.macro, 'Received in formalin is a piece of tissue labelled left hallux subungual. All embedded in 1 block after decalcification.');
  assert.equal(exo.blockKey, '(1) Lesion, all embedded, decalcified.');
  assert.equal(exo.microscopy, `Sections show trabecular bone with a cap of fibrocartilaginous tissue. The features are those of a subungual exostosis. ${NEM}`);
  assert.equal(exo.diagnosis, 'TOE, left hallux subungual, excision - SUBUNGUAL EXOSTOSIS');
});

test('lesion sentences are the ones the soft tissue and skin excision forms print', () => {
  for (const [id, dx] of [['soft_tissue_benign', 'Glomus tumour'], ['soft_tissue_benign', 'Tenosynovial giant cell tumour, localised'], ['soft_tissue_benign', 'Gouty tophus'], ['skin_excision', 'Pyogenic granuloma']]) {
    const mine = bare(run({ specimen: LESION, organ: 'FINGER', diagnosis: dx }).microscopy);
    assert.ok(mine.endsWith(` ${NEM}`), dx);
    assert.ok(bare(runIn(id, { diagnosis: dx }).microscopy).includes(mine.slice(0, -(NEM.length + 1))), `${dx}: same sentences as ${id}`);
  }
});

test('amputation bone sentences are the bone form sentences, addressed to the bone', () => {
  for (const dx of ['Chronic osteomyelitis', 'Acute osteomyelitis', 'Osteonecrosis']) {
    const theirs = bare(runIn('bone_joint', { specimen: 'Bone', diagnosis: dx }).microscopy)
      .replace('Sections show fragments of necrotic bone', 'Sections of the bone show necrotic bone')
      .replace('Sections show', 'Sections of the bone show');
    const two = theirs.split(/(?<=\.)\s+/).slice(0, 2).join(' ');
    assert.ok(bare(run({ ...AMP, ampBone: dx }).microscopy).includes(two), dx);
  }
});

test('an amputation: gangrene with chronic osteomyelitis and a viable proximal bone margin', () => {
  const r = run(AMP);
  assert.equal(r.specimens, 'Toe, left 2nd toe, amputation');
  assert.equal(r.macro, 'Received in formalin is an amputated digit labelled left 2nd toe, measuring 6 x 2.5 x 2 cm. Representative sections of the soft tissue, the bone and the proximal bone margin in 3 blocks after decalcification.');
  assert.equal(r.blockKey, '(1-3) Digit, representative sections, decalcified.');
  assert.equal(r.microscopy, `Sections of the soft tissue show gangrenous necrosis with acute inflammation. Sections of the bone show necrotic bone with empty osteocyte lacunae, marrow fibrosis, a chronic inflammatory infiltrate of lymphocytes and plasma cells, and reactive new bone formation. The features are in keeping with chronic osteomyelitis. The proximal bone margin shows viable bone with no osteomyelitis. ${NEM}`);
  assert.equal(r.diagnosis, 'TOE, left 2nd toe, amputation - GANGRENE with CHRONIC OSTEOMYELITIS; proximal bone margin viable, no osteomyelitis');
  assert.deepEqual(r.issues, []);
});

test('amputation branches: osteomyelitis at the margin, no osteomyelitis, and a margin not submitted', () => {
  const at = run({ ...AMP, site: 'right hallux', ampSoft: 'Ulceration', ampBone: 'Acute osteomyelitis', boneMargin: MARGIN_INVOLVED });
  assert.match(at.microscopy, /^Sections of the skin and soft tissue show ulceration with acute and chronic inflammation and granulation tissue\. /);
  assert.match(at.microscopy, / The features are in keeping with acute osteomyelitis\. Osteomyelitis extends to the proximal bone margin\. There is no evidence of malignancy\.$/);
  assert.equal(at.diagnosis, 'TOE, right hallux, amputation - ULCERATION with ACUTE OSTEOMYELITIS; OSTEOMYELITIS AT THE PROXIMAL BONE MARGIN; see comment');
  assert.match(at.comment, /^Osteomyelitis extends to the proximal bone margin, /);
  const none = run({ ...AMP, ampSoft: 'No significant abnormality', ampBone: 'No osteomyelitis' });
  assert.equal(none.microscopy, `Sections of the skin and soft tissue show no significant abnormality. Sections of the bone show trabeculae of viable bone and fibrous marrow tissue. There is no osteomyelitis. ${NEM}`);
  assert.equal(none.diagnosis, 'TOE, left 2nd toe, amputation - NO OSTEOMYELITIS; NO EVIDENCE OF MALIGNANCY');
  const unsampled = run({ ...AMP, boneMargin: 'Not submitted' });
  assert.equal(unsampled.macro, 'Received in formalin is an amputated digit labelled left 2nd toe, measuring 6 x 2.5 x 2 cm. Representative sections of the soft tissue and the bone in 3 blocks after decalcification.');
  assert.ok(!unsampled.microscopy.includes('proximal bone margin'));
  assert.equal(unsampled.diagnosis, 'TOE, left 2nd toe, amputation - GANGRENE with CHRONIC OSTEOMYELITIS');
  assert.deepEqual(checksOf(unsampled), [['warn', 'boneMargin']]);
});

test('the Checks panel: an amputation under the NAIL head, and a diagnosis the specimen cannot show', () => {
  assert.deepEqual(checksOf(run({ specimen: AMPUTATION, organ: 'NAIL' })), [['warn', 'organ']]);
  assert.deepEqual(checksOf(run({ specimen: CLIPPING, diagnosis: 'Glomus tumour' })), [['warn', 'diagnosis']]);
  const plateDx = run({ specimen: LESION, organ: 'FINGER', diagnosis: 'Onychomycosis' });
  assert.equal(plateDx.microscopy, 'Sections show nail plate and nail bed epithelium. Fungal hyphae are identified within the nail plate on PAS stain. The features are those of onychomycosis.');
  assert.deepEqual(checksOf(plateDx), [['warn', 'diagnosis']]);
});

test('fields show for the specimen that needs them', () => {
  assert.ok(visible({ specimen: CLIPPING }).includes('fixative'));
  assert.ok(!visible({ specimen: CLIPPING }).includes('procedure'));
  assert.ok(!visible({ specimen: LESION }).includes('fixative'));
  for (const s of [AVULSION, BED_BIOPSY, NAIL_UNIT, LESION]) assert.ok(visible({ specimen: s }).includes('procedure'), s);
  assert.ok(visible({ specimen: CLIPPING, diagnosis: 'Onychomycosis' }).includes('stain'));
  assert.ok(!visible({ specimen: LESION, diagnosis: 'Glomus tumour' }).includes('stain'));
  for (const id of ['ampSoft', 'ampBone', 'boneMargin']) {
    assert.ok(visible({ specimen: AMPUTATION }).includes(id), id);
    assert.ok(!visible({ specimen: CLIPPING }).includes(id), id);
  }
  assert.ok(!visible({ specimen: AMPUTATION }).includes('diagnosis'));
});

test('a multi-part case letters its specimens', () => {
  const r = generate(schema, t.generator, createCase(schema, 2));
  assert.match(r.specimens, /\(A\)/);
  assert.match(r.specimens, /\(B\)/);
});

// ---------- intake ----------

const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line) => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, '', manifest)[0]);
};
const flow = (line) => run(preset(line));

test('intake: nail and digit lines land on this form, confidently, with the specimen, head and procedure', () => {
  const lines = ['Nail clipping, right hallux', 'Nail, right hallux', 'Right thumb, lesion, biopsy', 'Nail, right thumb pigmented band, biopsy', 'Left big toe, resection', 'Nail bed biopsy',
    'Nail, right 1st toe nail plate', 'Toe nail plate', 'Right great toenail, ingrowing, wedge excision', 'Toenail, avulsion', 'Left 2nd toe, ray amputation, gangrene', 'Left index finger, glomus tumour', 'Right middle finger, digital mucous cyst'];
  for (const line of lines) {
    const m = route(line);
    assert.deepEqual([m.templateId, m.tier], ['nail_digit', 'confident'], line);
  }
  assert.deepEqual(preset('Nail clipping, right hallux'), { specimen: CLIPPING, procedure: '', organ: 'NAIL', site: 'Right hallux' });
  assert.deepEqual(preset('Right great toenail, ingrowing, wedge excision'), { specimen: AVULSION, procedure: 'Wedge excision', organ: 'NAIL', site: 'Right great toenail' });
  assert.equal(preset('Left index finger, glomus tumour').diagnosis, 'Glomus tumour');
  assert.equal(preset('Nail bed biopsy').diagnosis, DESCRIPTIVE, 'tissue specimens default to the descriptive line, not onychomycosis');
  assert.equal(flow('Nail, right hallux').diagnosis, 'NAIL, right hallux, clipping - ONYCHOMYCOSIS');
  assert.equal(flow('Right thumb, lesion, biopsy').diagnosis, 'THUMB, right thumb lesion, biopsy - NO EVIDENCE OF MALIGNANCY');
  assert.equal(flow('Nail, right 1st toe nail plate').specimens, 'Nail, right 1st toe nail plate, avulsion');
  assert.equal(flow('Right great toenail, ingrowing, wedge excision').specimens, 'Nail, right great toe, wedge excision');
  assert.equal(flow('Left 2nd toe, ray amputation, gangrene').diagnosis, 'TOE, left 2nd toe, amputation - GANGRENE with CHRONIC OSTEOMYELITIS; proximal bone margin viable, no osteomyelitis');
});

test('intake: skin, ulcer and granulation lines of the hand and foot keep their routes', () => {
  assert.equal(route('Left thumb, granulation tissue').templateId, 'abscess_granulation');
  assert.equal(route('Left foot, ulcer').templateId, 'abscess_granulation');
  assert.notEqual(route('Right index finger, skin lesion').templateId, 'nail_digit');
});

test('pasted gross text fills the measurements, the blocks and the fixative', () => {
  assert.deepEqual(extractMacro(schema, 'Received in formalin is a nail clipping measuring 1.2 x 0.4 x 0.1 cm. All embedded on edge in 1 block.'),
    { dimensions: '1.2 x 0.4 x 0.1', blocks: '1', blockScheme: 'All embedded', fixative: 'In formalin' });
  assert.equal(extractMacro(schema, 'Received dry are nail clippings measuring 1 x 0.5 x 0.1 cm in aggregate. All embedded in 1 block.').fixative, 'Dry');
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-pas-positive-nail-clipping-example', EXAMPLE],
  ['02-digital-mucous-cyst', { specimen: LESION, organ: 'FINGER', site: 'right middle finger', procedure: 'Excision', diagnosis: 'Digital mucous cyst', dimensions: '0.8 x 0.6 x 0.5' }],
  ['03-subungual-exostosis', { specimen: LESION, organ: 'TOE', site: 'left hallux', procedure: 'Excision', diagnosis: 'Subungual exostosis', dimensions: '0.9 x 0.7 x 0.5' }],
  ['04-toe-amputation-chronic-osteomyelitis', AMP]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'nail_digit', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
