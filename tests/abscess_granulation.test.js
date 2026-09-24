// Abscess, ulcer and granulation tissue template (benign batch 1). Card: docs/roadmap.md, pulled into Now
// 2026-09-24. Wording is deliberate; update the strings only on purpose.
// Fixtures: tests/fixtures/abscess_granulation/*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible, snippetsFor } from '../src/engine.js';
import { parseIntake, matchParts, presetValues, matchOption } from '../src/intake.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { stainSentences, closing, SURFACE_DX, NEM_IN_DX } from '../generators/abscess.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.abscess_granulation;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'abscess_granulation');
const UPDATE = process.argv.includes('--update');
const field = (id) => schema.fields.find((f) => f.id === id);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};
const run = (values) => generate(schema, t.generator, one(values));
const suggested = (values) => {
  const c = { ...one(values), parts: one(values).parts.map((p) => ({ ...p, templateId: schema.id })) };
  return snippetsFor({ [schema.id]: t }, c).filter((sn) => sn.suggested).map((sn) => sn.id);
};
const GRAN = 'Present – see comment';
const ORG = 'Identified – describe';

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has abscess_granulation');
  assert.equal(schema.system, 'Soft tissue');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.label, 'Abscess');
  assert.ok(schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
  assert.deepEqual(field('organ').options, ['SKIN', 'SOFT TISSUE', 'PERIANAL']);
  assert.deepEqual(field('diagnosis').options, [
    'Abscess wall', 'Granulation tissue', 'Ulcer', 'Stasis change', 'Sinus tract', 'Fistula tract',
    'Ruptured cyst with foreign-body reaction', 'Necrotic tissue or slough', 'Acute on chronic inflammation'
  ]);
});

test('the example case renders every expected block', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, t.generator, c);
  assert.match(r.report, /SPECIMENS?:/);
  assert.match(r.report, /MACROSCOPIC DESCRIPTION:/);
  assert.match(r.report, /MICROSCOPIC EXAMINATION:/);
  assert.match(r.report, /DIAGNOSIS:/);
  assert.equal(r.diagnosis, 'SKIN, left axilla abscess wall, excision - In keeping with ABSCESS WALL');
});

test('a multi-part case letters its specimens', () => {
  const r = generate(schema, t.generator, createCase(schema, 2));
  assert.match(r.specimens, /\(A\) Skin, excision/);
  assert.match(r.specimens, /\(B\) Skin, excision/);
});

test('each diagnosis prints its own line', () => {
  const lines = [
    [{ diagnosis: 'Abscess wall' }, 'In keeping with ABSCESS WALL'],
    [{ diagnosis: 'Granulation tissue' }, 'GRANULATION TISSUE; NO EVIDENCE OF MALIGNANCY'],
    [{ diagnosis: 'Ulcer' }, 'ULCER'],
    [{ diagnosis: 'Ulcer', ulcerPart: 'Edge' }, 'In keeping with ULCER EDGE'],
    [{ diagnosis: 'Ulcer', ulcerPart: 'Base' }, 'ULCER BASE'],
    [{ diagnosis: 'Stasis change' }, 'In keeping with STASIS DERMATITIS'],
    [{ diagnosis: 'Stasis change', stasisUlcer: 'Present' }, 'ULCER, in keeping with STASIS DERMATITIS'],
    [{ diagnosis: 'Sinus tract' }, 'In keeping with SINUS TRACT'],
    [{ diagnosis: 'Sinus tract', foreignMaterial: 'Hair shafts' }, 'PILONIDAL SINUS'],
    [{ diagnosis: 'Fistula tract' }, 'In keeping with FISTULA TRACT'],
    [{ diagnosis: 'Fistula tract', organ: 'PERIANAL' }, 'Consistent with FISTULA-IN-ANO'],
    [{ diagnosis: 'Ruptured cyst with foreign-body reaction' }, 'Consistent with ABSCESS WALL, suggestive of RUPTURED CYST'],
    [{ diagnosis: 'Necrotic tissue or slough' }, 'NECROTIC TISSUE; NO EVIDENCE OF MALIGNANCY'],
    [{ diagnosis: 'Acute on chronic inflammation' }, 'ACUTE ON CHRONIC INFLAMMATION; NO EVIDENCE OF MALIGNANCY']
  ];
  for (const [values, want] of lines) {
    const r = run({ site: 'right thigh', procedure: 'Excision', ...values });
    const head = values.organ === 'PERIANAL' ? 'PERIANAL' : 'SKIN';
    assert.equal(r.diagnosis, `${head}, right thigh, excision - ${want}`, JSON.stringify(values));
  }
});

test('each diagnosis opens on "Sections show" and closes on a house sentence', () => {
  for (const diagnosis of field('diagnosis').options) {
    const r = run({ diagnosis });
    assert.match(r.microscopy, /^Sections show /, diagnosis);
    const close = SURFACE_DX.includes(diagnosis) ? 'There is no evidence of dysplasia or malignancy.'
      : diagnosis === 'Ruptured cyst with foreign-body reaction' ? 'There is no evidence of malignancy.'
        : 'There is no evidence of granulomatous inflammation or malignancy.';
    assert.ok(r.microscopy.endsWith(close), `${diagnosis}: ${r.microscopy}`);
  }
  assert.deepEqual(NEM_IN_DX, ['Granulation tissue', 'Necrotic tissue or slough', 'Acute on chronic inflammation']);
});

test('the tissue named in the microscopy follows the organ head', () => {
  assert.match(run({ organ: 'SKIN' }).microscopy, /^Sections show skin and subcutaneous tissue with dense suppurative/);
  assert.match(run({ organ: 'SOFT TISSUE' }).microscopy, /^Sections show fibroadipose soft tissue with dense suppurative/);
  assert.match(run({ organ: 'PERIANAL' }).microscopy, /^Sections show perianal skin and subcutaneous tissue with dense suppurative/);
  assert.match(run({ organ: 'PERIANAL', diagnosis: 'Ulcer' }).microscopy, /^Sections show ulcerated perianal skin\./);
});

test('the ulcer and stasis narratives follow the sampled part and ulceration', () => {
  assert.equal(run({ diagnosis: 'Ulcer' }).microscopy,
    'Sections show ulcerated skin. The ulcer base is covered by fibrinopurulent exudate and necrotic debris overlying inflamed granulation tissue. The epidermis at the ulcer edge shows reactive changes. There is no evidence of dysplasia or malignancy.');
  assert.equal(run({ diagnosis: 'Ulcer', ulcerPart: 'Base' }).microscopy,
    'Sections show an ulcer base composed of fibrinopurulent exudate and necrotic debris overlying inflamed granulation tissue. No epithelium is identified. There is no evidence of dysplasia or malignancy.');
  const stasis = run({ diagnosis: 'Stasis change', stasisUlcer: 'Present' }).microscopy;
  assert.match(stasis, /Perivascular red cell extravasation and haemosiderin deposits are present, and the dermis is fibrotic\. The epidermis is ulcerated/);
  assert.match(stasis, /The features are in keeping with stasis dermatitis with ulceration\. There is no evidence of dysplasia or malignancy\.$/);
  assert.match(run({ diagnosis: 'Stasis change' }).microscopy, /The features are in keeping with stasis dermatitis\. There is no evidence/);
});

test('sub-fields show only for their diagnosis or finding', () => {
  const vis = (id, values) => isVisible(field(id), { ...schema.example.parts[0].values, ...values });
  assert.equal(vis('ulcerPart', { diagnosis: 'Ulcer' }), true);
  assert.equal(vis('ulcerPart', { diagnosis: 'Abscess wall' }), false);
  assert.equal(vis('stasisUlcer', { diagnosis: 'Stasis change' }), true);
  assert.equal(vis('stasisUlcer', { diagnosis: 'Ulcer' }), false);
  assert.equal(vis('granulomaType', { granulomas: GRAN }), true);
  assert.equal(vis('granulomaType', { granulomas: 'Absent' }), false);
  assert.equal(vis('organismText', { organisms: ORG }), true);
  assert.equal(vis('organismText', { organisms: 'Not identified' }), false);
});

test('granulomas add a sentence, a diagnosis clause, the comment and the stain checks', () => {
  const r = run({ diagnosis: 'Abscess wall', granulomas: GRAN });
  assert.match(r.microscopy, /Non-necrotising epithelioid granulomas are present\. The findings are in keeping with an abscess wall\. There is no evidence of malignancy\.$/);
  assert.equal(r.diagnosis, 'SKIN, excision - In keeping with ABSCESS WALL; non-necrotising granulomas present; see comment');
  assert.match(r.report, /The differential diagnosis includes Crohn's disease, mycobacterial infection including tuberculosis, and hidradenitis suppurativa\./);
  assert.deepEqual(r.issues.map((i) => i.field), ['stains', 'stains']);
  const nec = run({ granulomas: GRAN, granulomaType: 'Necrotising', stains: ['Ziehl-Neelsen', 'Grocott'] });
  assert.match(nec.microscopy, /Necrotising granulomas are present\. No acid-fast bacilli are identified on Ziehl-Neelsen stain\. No fungal organisms are identified on Grocott stain\./);
  assert.match(nec.diagnosis, /; necrotising granulomas present; see comment$/);
  assert.deepEqual(nec.issues, []);
  assert.deepEqual(suggested({ granulomas: GRAN }), ['abscess_granulomas']);
  assert.deepEqual(suggested({}), []);
  assert.deepEqual(suggested({ organisms: ORG }), ['abscess_microbiology']);
});

test('negative stains print one sentence per organism class', () => {
  assert.deepEqual(stainSentences(['Gram', 'Ziehl-Neelsen']), [
    'No acid-fast bacilli are identified on Ziehl-Neelsen stain.', 'No bacterial organisms are identified on Gram stain.'
  ]);
  assert.deepEqual(stainSentences(['Grocott', 'PASD']), ['No fungal organisms are identified on PASD and Grocott stains.']);
  assert.deepEqual(stainSentences([]), []);
});

test('organisms identified replace the negative stain sentences and ask for microbiology', () => {
  const r = run({ stains: ['Gram'], organisms: ORG, organismText: 'gram-positive cocci in clusters are seen on Gram stain' });
  assert.match(r.microscopy, /surrounded by granulation tissue and fibrosis\. Gram-positive cocci in clusters are seen on Gram stain\. The findings are in keeping/);
  assert.doesNotMatch(r.microscopy, /No bacterial organisms/);
  assert.match(r.diagnosis, /In keeping with ABSCESS WALL; organisms identified$/);
  assert.match(r.report, /Please correlate with microbiological findings\./);
  const blank = run({ organisms: ORG });
  assert.deepEqual(blank.issues.map((i) => i.field), ['organismText']);
});

test('foreign material adds the giant cell reaction to the microscopy and the line', () => {
  const r = run({ foreignMaterial: 'Suture material' });
  assert.match(r.microscopy, /Suture material is seen, surrounded by a foreign-body giant cell reaction\. The findings are in keeping with an abscess wall\. There is no evidence of malignancy\.$/);
  assert.match(r.diagnosis, /In keeping with ABSCESS WALL; foreign body giant cell reaction to suture material$/);
  assert.match(run({ foreignMaterial: 'Refractile foreign material' }).diagnosis, /; foreign body giant cell reaction$/);
  // The pilonidal sinus and the ruptured cyst already name the reaction.
  const pil = run({ diagnosis: 'Sinus tract', foreignMaterial: 'Hair shafts' });
  assert.match(pil.microscopy, /Hair shafts engulfed by foreign-body giant cells are seen in the wall of the sinus tract\. The findings are in keeping with a pilonidal sinus\./);
  assert.doesNotMatch(pil.diagnosis, /foreign body/);
  assert.doesNotMatch(run({ diagnosis: 'Ruptured cyst with foreign-body reaction', foreignMaterial: 'Hair shafts' }).diagnosis, /foreign body/);
});

test('closing sentence: the surface diagnoses keep dysplasia, a granulomatous finding drops granulomatous', () => {
  assert.equal(closing({ diagnosis: 'Ulcer', granulomas: GRAN }), 'There is no evidence of dysplasia or malignancy.');
  assert.equal(closing({ diagnosis: 'Granulation tissue' }), 'There is no evidence of granulomatous inflammation or malignancy.');
  assert.equal(closing({ diagnosis: 'Granulation tissue', foreignMaterial: 'Hair shafts' }), 'There is no evidence of malignancy.');
  assert.equal(closing({ diagnosis: 'Fistula tract', granulomas: GRAN }), 'There is no evidence of malignancy.');
});

test('macroscopy and block key follow the description and sampling', () => {
  const pieces = run({ site: 'right groin abscess', dimensions: '3x2x1' });
  assert.equal(pieces.macro, 'Received in formalin are irregular pieces of tan-brown soft tissue labelled right groin abscess, measuring 3 x 2 x 1 cm in aggregate. All embedded in 2 blocks.');
  assert.equal(pieces.blockKey, '(1-2) Tissue pieces, all embedded.');
  const ellipse = run({ description: 'Ellipse of skin with a sinus opening', dimensions: '5 x 2 x 1.5', blocks: '3', blockScheme: 'Representative sections' });
  assert.equal(ellipse.macro, 'Received in formalin is an ellipse of skin, measuring 5 x 2 x 1.5 cm, with a sinus opening on the surface. Representative sections in 3 blocks.');
  assert.equal(ellipse.blockKey, '(1-3) Skin ellipse with sinus opening, representative cross-sections.');
  const skin = run({ description: 'Piece of skin', blocks: '1' });
  assert.equal(skin.macro, 'Received in formalin is a piece of skin. All embedded in 1 block.');
  assert.equal(skin.blockKey, '(1) Skin, all embedded.');
  const c = one({});
  c.options = { ...c.options, macro: false };
  const off = generate(schema, t.generator, c);
  assert.equal(off.macro, '');
  assert.equal(off.blockKey, '');
});

test('specimen line: typed name wins, the procedure may be left unstated, perianal reads as an adjective', () => {
  assert.match(run({ specimenName: 'Left axilla abscess, excision.' }).specimens, /^Left axilla abscess, excision$/);
  assert.match(run({ site: 'Ulcer, left leg', procedure: '' }).specimens, /^Skin, ulcer, left leg$/);
  assert.equal(run({ site: 'Ulcer, left leg', procedure: '' }).diagnosis, 'SKIN, ulcer, left leg - In keeping with ABSCESS WALL');
  const peri = run({ organ: 'PERIANAL', site: 'Anal fistula', diagnosis: 'Fistula tract' });
  assert.match(peri.specimens, /^Anal fistula, excision$/);
  assert.equal(peri.diagnosis, 'PERIANAL, fistula, excision - Consistent with FISTULA-IN-ANO');
  assert.match(run({ organ: 'PERIANAL', site: 'abscess wall', procedure: 'Incision and drainage' }).specimens, /^Perianal abscess wall, incision and drainage$/);
  assert.match(run({ organ: 'SOFT TISSUE', site: 'left foot', procedure: 'Debridement' }).specimens, /^Soft tissue, left foot, debridement$/);
});

test('checks: perianal fistula under another head, pilonidal sinus without hair shafts', () => {
  assert.deepEqual(run({ organ: 'SKIN', site: 'perianal fistula', diagnosis: 'Fistula tract' }).issues.map((i) => i.field), ['organ']);
  assert.deepEqual(run({ site: 'natal cleft pilonidal sinus', diagnosis: 'Sinus tract' }).issues.map((i) => i.field), ['foreignMaterial']);
  assert.deepEqual(run({ site: 'natal cleft pilonidal sinus', diagnosis: 'Sinus tract', foreignMaterial: 'Hair shafts' }).issues, []);
});

// ---------- intake ----------

const route = (line) => matchParts(parseIntake(line), '', manifest)[0];
const preset = (line) => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, '', manifest)[0]);
};

test('intake: the card lines land on the abscess form first', () => {
  for (const line of ['Abscess wall', 'Pilonidal sinus', 'Ulcer, left leg', 'Pilonidal sinus, excision', 'Skin, left axilla abscess wall, excision', 'Perianal fistula, excision', 'Soft tissue, left foot, debridement']) {
    const m = route(line);
    assert.equal(m.templateId, 'abscess_granulation', line);
    assert.equal(m.tier, 'confident', line);
  }
});

test('intake: organ, site and procedure are pre-filled from the line', () => {
  assert.deepEqual(preset('Skin, left axilla abscess wall, excision'), { organ: 'SKIN', procedure: 'Excision', site: 'Left axilla abscess wall' });
  assert.deepEqual(preset('Perianal abscess wall, I&D'), { organ: 'PERIANAL', procedure: 'Incision and drainage', site: 'Perianal abscess wall' });
  assert.deepEqual(preset('Anal fistula, excision'), { organ: 'PERIANAL', procedure: 'Excision', site: 'Anal fistula' });
  assert.deepEqual(preset('Soft tissue, left foot, debrided'), { organ: 'SOFT TISSUE', procedure: 'Debridement', site: 'Left foot' });
  assert.deepEqual(preset('Skin, left leg ulcer, punch'), { organ: 'SKIN', procedure: 'Punch biopsy', site: 'Left leg ulcer' });
  // No procedure named: the line prints none rather than the form's default.
  assert.deepEqual(preset('Ulcer, left leg'), { procedure: '', site: 'Ulcer, left leg' });
});

test('intake: the procedure short forms expand only on a list that offers them', () => {
  assert.equal(matchOption(field('procedure').options, 'buttock abscess, I&D'), 'Incision and drainage');
  assert.equal(matchOption(field('procedure').options, 'incision'), 'Incision and drainage');
  assert.equal(matchOption(field('procedure').options, 'incision biopsy'), 'Biopsy');
  assert.equal(matchOption(['Excision', 'Biopsy'], 'I&D'), '');
  assert.equal(matchOption(['Anus', 'Rectum'], 'anal canal'), '');
});

test('intake: an organ, a named cyst or a node keeps its own template', () => {
  assert.equal(route('Mandible, fistula').templateId, 'jaw_cyst');
  assert.equal(route('Stomach, ulcer, biopsy').templateId, 'gastric_biopsy');
  assert.equal(route('Skin, back, infected sebaceous cyst, excision').templateId, 'skin_cyst');
  assert.equal(route('Lymph node, abscess, excision').templateId, 'lymph_node');
  assert.notEqual(route('Pilonidal sinus, excision').templateId, 'nasal_polyps');
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-axillary-abscess-wall', { site: 'left axilla abscess wall', procedure: 'Excision', diagnosis: 'Abscess wall', dimensions: '3 x 2 x 1', blocks: '2' }],
  ['02-pilonidal-sinus-hair-shafts', { site: 'natal cleft pilonidal sinus', procedure: 'Excision', diagnosis: 'Sinus tract', foreignMaterial: 'Hair shafts', description: 'Ellipse of skin with a sinus opening', dimensions: '5 x 2 x 1.5', blocks: '3', blockScheme: 'Representative sections' }],
  ['03-leg-ulcer-edge', { site: 'left leg ulcer', procedure: 'Punch biopsy', diagnosis: 'Ulcer', ulcerPart: 'Edge', description: 'Piece of skin', dimensions: '0.4 x 0.4 x 0.3', blocks: '1' }],
  ['04-perianal-fistula-granulomas', { organ: 'PERIANAL', site: 'fistula tract', procedure: 'Excision', diagnosis: 'Fistula tract', granulomas: GRAN, granulomaType: 'Non-necrotising', stains: ['Ziehl-Neelsen', 'PASD'], dimensions: '2.5 x 1 x 0.8', blocks: '2' }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'abscess_granulation', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
