// Skin biopsy (inflammatory) — medical skin biopsies and graft-versus-host disease. Card: docs/roadmap.md
// "Inflammatory dermatoses — medical skin biopsy" (user request and pulled by the user 2026-10-11); grounding
// docs/reference/skin_inflammatory-morphology.md. Wording is deliberate; update the strings only on purpose.
// Fixtures: tests/fixtures/skin_inflammatory/*.json (golden; --update only after a deliberate change).
// The routing lines below are house-style lines, not case text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { rowGroups } from '../src/picker.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { PATTERN_LEVEL, DIF_DEFINES, lernerOf } from '../generators/skin_inflammatory.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.skin_inflammatory;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const FIX = path.join(here, 'fixtures', 'skin_inflammatory');
const UPDATE = process.argv.includes('--update');
const one = (values) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};
const run = (values) => generate(schema, t.generator, one(values));
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const field = (id) => schema.fields.find((f) => f.id === id);
const visible = (values) => schema.fields.filter((f) => isVisible(f, { ...one({}).parts[0].values, ...values })).map((f) => f.id);
const checksOf = (r) => r.issues.map((i) => [i.level, i.field]);
const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line, history = '') => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
};
const dx = (values) => run({ specimenName: 'left forearm', ...values }).diagnosis.replace(/^SKIN, left forearm, punch biopsy - /, '');
const OPENER = 'Sections show a piece of skin down to the subcutis.';
const CLOSE = 'Please correlate with clinical findings.';

// ---------- metadata and menus ----------

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has skin_inflammatory');
  assert.equal(schema.system, 'Skin');
  assert.equal(schema.kind, 'biopsy');
  assert.equal(schema.label, 'Dermatoses');
  assert.equal(schema.organ, 'SKIN');
  assert.equal(schema.shortName, 'Skin · inflammatory dermatoses, GVHD');
  assert.equal(schema.style.british, true);
});

test('it replaces the Dermatoses placeholder and is the Skin biopsy in the top row', () => {
  const planned = JSON.parse(fs.readFileSync(path.join(root, 'templates', 'planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((p) => p.id === 'inflammatory_dermatoses' || p.id === 'skin_inflammatory'), 'no placeholder left');
  const group = rowGroups(manifest, planned, 'top').find((g) => g.items.some((i) => i.id === 'skin_inflammatory'));
  assert.equal(group.system, 'Skin');
  assert.deepEqual(group.items.map((i) => i.label), ['Dermatoses']);
});

test('the example: a spongiotic dermatitis with eosinophils and a negative PASD stain', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, t.generator, c);
  for (const heading of [/SPECIMENS?:/, /MACROSCOPIC DESCRIPTION:/, /BLOCK KEY:/, /MICROSCOPIC EXAMINATION:/, /DIAGNOSIS:/]) assert.match(r.report, heading);
  assert.equal(r.specimens, 'Skin, left forearm, punch biopsy');
  assert.equal(r.macro, 'Received in formalin is a punch biopsy of skin measuring 0.4 x 0.4 x 0.3 cm. Bisected and all embedded in 1 block.');
  assert.equal(r.microscopy, `${OPENER} The epidermis shows moderate spongiosis with parakeratosis and exocytosis of lymphocytes. `
    + 'The dermis shows a mild superficial perivascular infiltrate of lymphocytes and eosinophils. No fungal organisms are identified on PASD stain. '
    + `The overall features are those of a spongiotic dermatitis with eosinophils. ${CLOSE}`);
  assert.equal(r.diagnosis, 'SKIN, left forearm, punch biopsy - SPONGIOTIC DERMATITIS with EOSINOPHILS (please see description)');
  assert.deepEqual(r.issues, []);
});

// ---------- specimen, macroscopy, block key ----------

test('the procedure names the specimen line, the received sentence and the block key', () => {
  const rows = [
    ['Punch biopsy', 'Skin, back, punch biopsy', 'Received in formalin is a punch biopsy of skin', '(1) Punch, bisected, all embedded.'],
    ['Shave biopsy', 'Skin, back, shave biopsy', 'Received in formalin is a shave of skin', '(1) Shave, bisected, all embedded.'],
    ['Incisional biopsy', 'Skin, back, incisional biopsy', 'Received in formalin is an incisional biopsy of skin', '(1) Incisional biopsy, bisected, all embedded.'],
    ['Excision', 'Skin, back, excision', 'Received in formalin is an ellipse of skin', '(1) Ellipse, bisected, all embedded.']
  ];
  for (const [procedure, line, received, key] of rows) {
    const r = run({ specimenName: 'back', procedure });
    assert.equal(r.specimens, line);
    assert.ok(r.macro.startsWith(`${received}. Bisected and all embedded in 1 block.`), r.macro);
    assert.equal(r.blockKey, key);
    assert.ok(r.diagnosis.startsWith(`SKIN, back, ${procedure.toLowerCase()} - `), r.diagnosis);
  }
  assert.equal(run({}).specimens, 'Skin, punch biopsy', 'no site');
  assert.equal(run({}).diagnosis, 'SKIN, punch biopsy - SPONGIOTIC DERMATITIS (please see description)');
  assert.equal(run({ specimenName: 'Left forearm.' }).specimens, 'Skin, left forearm, punch biopsy', 'first letter lowered, stop dropped');
  assert.equal(run({ specimenName: 'UK site' }).specimens, 'Skin, UK site, punch biopsy', 'an acronym keeps its capitals');
});

test('handling, blocks and the second biopsy for direct immunofluorescence', () => {
  assert.equal(run({ size: '0.6 x 0.4 x 0.3', handling: 'Serially sliced', blocks: '2' }).macro,
    'Received in formalin is a punch biopsy of skin measuring 0.6 x 0.4 x 0.3 cm. Serially sliced and all embedded in 2 blocks.');
  assert.equal(run({ handling: 'Serially sliced', blocks: '2' }).blockKey, '(1-2) Punch, serially sliced, all embedded.');
  assert.equal(run({ handling: 'Embedded whole' }).macro, 'Received in formalin is a punch biopsy of skin. All embedded in 1 block.');
  assert.equal(run({ handling: 'Embedded whole' }).blockKey, '(1) Punch, all embedded.');
  assert.equal(run({ difReceived: 'Received fresh', difSize: '0.3 x 0.3 x 0.3' }).macro,
    'Received in formalin is a punch biopsy of skin. Bisected and all embedded in 1 block. '
    + 'A second punch biopsy of skin measuring 0.3 x 0.3 x 0.3 cm is received fresh for direct immunofluorescence.');
  assert.match(run({ difReceived: "Received in Michel's medium" }).macro, / A second punch biopsy of skin is received in Michel's medium for direct immunofluorescence\.$/);
  assert.equal(generate(schema, t.generator, { ...one({}), options: { ...one({}).options, macro: false } }).macro, '');
  const two = createCase(schema, 2);
  two.parts[1].values = { ...two.parts[1].values, specimenName: 'right thigh' };
  const r = generate(schema, t.generator, two);
  assert.equal(r.specimens, '(A) Skin, punch biopsy\n(B) Skin, right thigh, punch biopsy');
  assert.match(r.blockKey, /^\(A\) \(1\) Punch, bisected, all embedded\.\n\(B\) \(1\) Punch, bisected, all embedded\.$/);
});

// ---------- diagnosis line ----------

test('a pattern prints as itself with the pointer; eosinophils name themselves after it', () => {
  assert.equal(dx({}), 'SPONGIOTIC DERMATITIS (please see description)');
  assert.equal(dx({ cells: ['Lymphocytes', 'Eosinophils'] }), 'SPONGIOTIC DERMATITIS with EOSINOPHILS (please see description)');
  assert.equal(dx({ featSpongiotic: ['Eosinophilic spongiosis'] }), 'SPONGIOTIC DERMATITIS with EOSINOPHILS (please see description)');
  assert.equal(dx({ pattern: 'Psoriasiform' }), 'PSORIASIFORM DERMATITIS (please see description)');
  assert.equal(dx({ pattern: 'Interface (vacuolar)', cells: ['Lymphocytes', 'Eosinophils'] }), 'INTERFACE DERMATITIS with EOSINOPHILS (please see description)');
  assert.equal(dx({ pattern: 'Interface (lichenoid)' }), 'LICHENOID DERMATITIS (please see description)');
  assert.equal(dx({ pattern: 'Sclerosing' }), 'DERMAL SCLEROSIS (please see description)');
  assert.equal(dx({ pattern: 'Neutrophilic dermatosis' }), 'NEUTROPHILIC DERMATOSIS (please see description)');
  assert.equal(dx({ pattern: 'Neutrophilic dermatosis', cells: ['Neutrophils', 'Eosinophils'] }), 'NEUTROPHILIC DERMATOSIS (please see description)', 'no eosinophil suffix outside the epidermal and perivascular patterns');
  assert.equal(dx({ pattern: 'No significant abnormality' }), 'NO SIGNIFICANT HISTOLOGICAL ABNORMALITY');
  assert.equal(dx({ seeDescription: false }), 'SPONGIOTIC DERMATITIS');
});

test('the perivascular phrase follows the infiltrate', () => {
  assert.equal(dx({ pattern: 'Perivascular' }), 'SUPERFICIAL PERIVASCULAR DERMATITIS (please see description)');
  assert.equal(dx({ pattern: 'Perivascular', infiltrate: 'Superficial and deep perivascular' }), 'SUPERFICIAL AND DEEP PERIVASCULAR DERMATITIS (please see description)');
  assert.equal(dx({ pattern: 'Perivascular', infiltrate: 'Superficial and deep perivascular and periadnexal' }), 'SUPERFICIAL AND DEEP PERIVASCULAR DERMATITIS (please see description)');
  assert.equal(dx({ pattern: 'Perivascular', infiltrate: 'Superficial perivascular and interstitial', featPerivascular: ['Interstitial eosinophils'] }),
    'SUPERFICIAL PERIVASCULAR AND INTERSTITIAL DERMATITIS with EOSINOPHILS (please see description)');
});

test('the vessel, blister, granuloma, panniculitis and follicle phrases follow their fields', () => {
  assert.equal(dx({ pattern: 'Vasculitis' }), 'LEUKOCYTOCLASTIC VASCULITIS (please see description)');
  assert.equal(dx({ pattern: 'Vasculitis', dx: 'Medium-vessel vasculitis' }), 'MEDIUM-VESSEL VASCULITIS (please see description)');
  assert.equal(dx({ pattern: 'Vasculitis', dx: 'Occlusive vasculopathy' }), 'OCCLUSIVE VASCULOPATHY (please see description)');
  assert.equal(dx({ pattern: 'Vasculitis', dx: 'Calciphylaxis' }), 'OCCLUSIVE VASCULOPATHY, in keeping with CALCIPHYLAXIS');
  assert.equal(dx({ pattern: 'Vasculitis', dx: 'Cutaneous polyarteritis nodosa' }), 'MEDIUM-VESSEL VASCULITIS, in keeping with CUTANEOUS POLYARTERITIS NODOSA');
  assert.equal(dx({ pattern: 'Vesiculobullous' }), 'SUBEPIDERMAL BLISTERING DERMATOSIS with EOSINOPHILS (please see description)');
  assert.equal(dx({ pattern: 'Vesiculobullous', blisterContent: 'Few inflammatory cells' }), 'CELL-POOR SUBEPIDERMAL BLISTERING DERMATOSIS (please see description)');
  assert.equal(dx({ pattern: 'Vesiculobullous', blisterContent: 'Neutrophils' }), 'SUBEPIDERMAL BLISTERING DERMATOSIS with NEUTROPHILS (please see description)');
  assert.equal(dx({ pattern: 'Vesiculobullous', blisterLevel: 'Suprabasal', featBullous: ['Acantholysis'], blisterContent: 'Eosinophils and neutrophils' }),
    'SUPRABASAL ACANTHOLYTIC BLISTERING DERMATOSIS with EOSINOPHILS AND NEUTROPHILS (please see description)');
  assert.equal(dx({ pattern: 'Vesiculobullous', blisterLevel: 'Subcorneal', blisterContent: 'Neutrophils' }), 'SUBCORNEAL BLISTERING DERMATOSIS with NEUTROPHILS (please see description)');
  const granulomas = { Sarcoidal: 'SARCOIDAL GRANULOMATOUS DERMATITIS', Palisading: 'PALISADING GRANULOMATOUS DERMATITIS', Interstitial: 'INTERSTITIAL GRANULOMATOUS DERMATITIS',
    Tuberculoid: 'GRANULOMATOUS DERMATITIS', Suppurative: 'SUPPURATIVE GRANULOMATOUS DERMATITIS', 'Foreign body': 'FOREIGN BODY GRANULOMATOUS REACTION' };
  for (const [granulomaType, phrase] of Object.entries(granulomas)) assert.equal(dx({ pattern: 'Granulomatous', granulomaType }), `${phrase} (please see description)`);
  assert.equal(dx({ pattern: 'Panniculitis' }), 'SEPTAL PANNICULITIS (please see description)');
  assert.equal(dx({ pattern: 'Panniculitis', compartment: 'Lobular', featPanniculitis: ['Vasculitis'] }), 'LOBULAR PANNICULITIS with VASCULITIS (please see description)');
  assert.equal(dx({ pattern: 'Panniculitis', compartment: 'Septal and lobular' }), 'MIXED SEPTAL AND LOBULAR PANNICULITIS (please see description)');
  assert.equal(dx({ pattern: 'Folliculitis' }), 'SUPPURATIVE FOLLICULITIS (please see description)');
  assert.equal(dx({ pattern: 'Folliculitis', featFollicular: ['Neutrophils in the follicle', 'Ruptured follicle'] }), 'SUPPURATIVE FOLLICULITIS with FOLLICULAR RUPTURE (please see description)');
  assert.equal(dx({ pattern: 'Folliculitis', featFollicular: ['Eosinophils in the follicular epithelium'] }), 'FOLLICULITIS (please see description)');
});

test('Auto: a disease the histology names prints alone; one that needs the clinical picture follows the pattern', () => {
  assert.equal(dx({ pattern: 'Interface (lichenoid)', dx: 'Lichen planus' }), 'LICHEN PLANUS');
  assert.equal(dx({ pattern: 'Psoriasiform', dx: 'Lichen simplex chronicus' }), 'LICHEN SIMPLEX CHRONICUS');
  assert.equal(dx({ pattern: 'Granulomatous', dx: 'Granuloma annulare', granulomaType: 'Palisading' }), 'GRANULOMA ANNULARE');
  assert.equal(dx({ pattern: 'Sclerosing', dx: 'Lichen sclerosus' }), 'LICHEN SCLEROSUS');
  assert.equal(dx({ pattern: 'Perivascular', dx: 'Pigmented purpuric dermatosis' }), 'PIGMENTED PURPURIC DERMATOSIS');
  assert.equal(dx({ pattern: 'Psoriasiform', dx: 'Psoriasis' }), 'PSORIASIFORM DERMATITIS, in keeping with PSORIASIS');
  assert.equal(dx({ pattern: 'Interface (vacuolar)', dx: 'Cutaneous lupus erythematosus' }), 'INTERFACE DERMATITIS, in keeping with CUTANEOUS LUPUS ERYTHEMATOSUS');
  assert.equal(dx({ pattern: 'Interface (lichenoid)', dx: 'Lichenoid drug eruption' }), 'LICHENOID DERMATITIS, in keeping with a LICHENOID DRUG ERUPTION');
  assert.equal(dx({ pattern: 'Perivascular', dx: 'Arthropod bite reaction', infiltrate: 'Superficial and deep perivascular', cells: ['Lymphocytes', 'Eosinophils'] }),
    'SUPERFICIAL AND DEEP PERIVASCULAR DERMATITIS with EOSINOPHILS, in keeping with an ARTHROPOD BITE REACTION');
  assert.equal(dx({ pattern: 'Panniculitis', dx: 'Erythema nodosum' }), 'SEPTAL PANNICULITIS, in keeping with ERYTHEMA NODOSUM');
  assert.equal(dx({ pattern: 'Sclerosing', dx: 'Morphoea' }), 'DERMAL SCLEROSIS, in keeping with MORPHOEA');
  assert.equal(dx({ pattern: 'Neutrophilic dermatosis', dx: 'Sweet syndrome' }), 'NEUTROPHILIC DERMATOSIS, in keeping with SWEET SYNDROME');
  assert.equal(dx({ pattern: 'Vasculitis', dx: 'IgA vasculitis' }), 'LEUKOCYTOCLASTIC VASCULITIS, in keeping with IgA VASCULITIS', 'IgA keeps its case');
});

test('an immunofluorescence-defined disease prints alone only with its own deposit', () => {
  const bp = { pattern: 'Vesiculobullous', dx: 'Bullous pemphigoid' };
  assert.equal(dx(bp), 'SUBEPIDERMAL BLISTERING DERMATOSIS with EOSINOPHILS, in keeping with BULLOUS PEMPHIGOID');
  assert.equal(dx({ ...bp, dif: 'Negative' }), 'SUBEPIDERMAL BLISTERING DERMATOSIS with EOSINOPHILS, in keeping with BULLOUS PEMPHIGOID');
  assert.equal(dx({ ...bp, dif: 'Positive' }), 'BULLOUS PEMPHIGOID', 'the default deposit is linear IgG and C3');
  assert.equal(dx({ ...bp, dif: 'Positive', difPattern: 'Linear IgA along the basement membrane zone' }), 'SUBEPIDERMAL BLISTERING DERMATOSIS with EOSINOPHILS, in keeping with BULLOUS PEMPHIGOID');
  assert.equal(dx({ pattern: 'Vesiculobullous', dx: 'Linear IgA disease', blisterContent: 'Neutrophils', dif: 'Positive', difPattern: 'Linear IgA along the basement membrane zone' }), 'LINEAR IgA DISEASE');
  assert.equal(dx({ pattern: 'Vesiculobullous', dx: 'Linear IgA disease', blisterContent: 'Neutrophils' }), 'SUBEPIDERMAL BLISTERING DERMATOSIS with NEUTROPHILS, in keeping with LINEAR IgA DISEASE');
  assert.equal(dx({ pattern: 'Vesiculobullous', dx: 'Pemphigus vulgaris', blisterLevel: 'Suprabasal', featBullous: ['Acantholysis'], dif: 'Positive', difPattern: 'Intercellular IgG and C3 in the epidermis' }), 'PEMPHIGUS VULGARIS');
  assert.equal(dx({ pattern: 'Vasculitis', dx: 'IgA vasculitis', dif: 'Positive', difPattern: 'Perivascular IgA and C3 in superficial dermal vessels' }), 'IgA VASCULITIS');
  for (const [disease, deposit] of Object.entries(DIF_DEFINES)) assert.ok(field('difPattern').options.includes(deposit), `${disease}: ${deposit} is an option`);
});

test('the certainty can be set by hand', () => {
  const lp = { pattern: 'Interface (lichenoid)', dx: 'Lichen planus' };
  assert.equal(dx({ ...lp, certainty: 'In keeping with' }), 'LICHENOID DERMATITIS, in keeping with LICHEN PLANUS');
  assert.equal(dx({ ...lp, certainty: 'Consistent with' }), 'LICHENOID DERMATITIS, consistent with LICHEN PLANUS');
  assert.equal(dx({ ...lp, certainty: 'Suggestive of' }), 'LICHENOID DERMATITIS, suggestive of LICHEN PLANUS');
  assert.equal(dx({ pattern: 'Psoriasiform', dx: 'Psoriasis', certainty: 'Diagnostic' }), 'PSORIASIS');
  assert.ok(visible({ pattern: 'Psoriasiform', dx: 'Psoriasis' }).includes('certainty'));
  assert.ok(!visible({ pattern: 'Psoriasiform', dx: 'Psoriasiform dermatitis' }).includes('certainty'), 'hidden on a pattern-level choice');
  assert.ok(!visible({ pattern: 'Vasculitis', dx: 'Occlusive vasculopathy' }).includes('certainty'));
});

test('a differential adds the pointer to a named disease', () => {
  assert.equal(dx({ pattern: 'Psoriasiform', dx: 'Psoriasis', differential: 'pityriasis rubra pilaris' }), 'PSORIASIFORM DERMATITIS, in keeping with PSORIASIS (please see description)');
  assert.equal(dx({ pattern: 'No significant abnormality', differential: 'urticaria' }), 'NO SIGNIFICANT HISTOLOGICAL ABNORMALITY');
});

test('every diagnosis on every list generates, named in the diagnosis line', () => {
  for (const [pattern, options] of Object.entries(field('dx').optionsByField.map)) {
    assert.equal(options[0] && PATTERN_LEVEL.has(options[0]), true, `${pattern}: the first entry is the pattern itself`);
    for (const d of options) {
      const line = dx({ pattern, dx: d });
      if (PATTERN_LEVEL.has(d)) assert.match(line, /\(please see description\)$/, `${pattern} / ${d}`);
      else assert.ok(line.includes(d.toUpperCase().replace('IGA', 'IgA')), `${pattern} / ${d}: ${line}`);
    }
  }
  const schemaLevel = Object.values(field('dx').optionsByField.map).map((o) => o[0]).concat(['Medium-vessel vasculitis', 'Occlusive vasculopathy']);
  assert.deepEqual([...PATTERN_LEVEL].sort(), [...new Set(schemaLevel)].sort(), 'the generator and the schema agree on the pattern-level choices');
});

test('a diagnosis left from another pattern falls back to the new pattern itself', () => {
  assert.equal(dx({ pattern: 'Psoriasiform', dx: 'Lichen planus' }), 'PSORIASIFORM DERMATITIS (please see description)');
});

// ---------- microscopy ----------

test('microscopy: epidermis, dermis and pattern sentences', () => {
  assert.equal(run({ pattern: 'Psoriasiform', dx: 'Psoriasis', featPsoriasiform: ['Confluent parakeratosis', 'Neutrophils in the parakeratotic scale', 'Loss of the granular layer', 'Suprapapillary thinning', 'Dilated tortuous papillary capillaries'], pasd: 'Negative' }).microscopy,
    `${OPENER} The epidermis shows regular psoriasiform hyperplasia with confluent parakeratosis, neutrophils in the parakeratotic scale, loss of the granular layer and thinning of the suprapapillary plates. `
    + 'The dermis shows a mild superficial perivascular infiltrate of lymphocytes, with dilated tortuous capillaries in the dermal papillae. No fungal organisms are identified on PASD stain. '
    + `The overall features are those of a psoriasiform dermatitis, in keeping with psoriasis. ${CLOSE}`);
  assert.equal(run({ pattern: 'Interface (lichenoid)', dx: 'Lichen planus', infiltrate: 'Band-like', density: 'Dense', featLichenoid: ['Compact orthokeratosis', 'Wedge-shaped hypergranulosis', 'Saw-tooth rete ridges', 'Civatte bodies', 'Pigment incontinence'] }).microscopy,
    `${OPENER} The epidermis shows compact orthokeratosis, wedge-shaped hypergranulosis, saw-tooth rete ridges and Civatte bodies. `
    + `The papillary dermis shows a dense band-like infiltrate of lymphocytes, with pigment incontinence. The overall features are those of lichen planus. ${CLOSE}`);
  assert.equal(run({ pattern: 'Interface (vacuolar)', depth: 'Reticular dermis' }).microscopy,
    `Sections show a piece of skin down to the reticular dermis. The epidermis shows basal vacuolar change. The dermis shows a mild superficial perivascular infiltrate of lymphocytes. The overall features are those of an interface dermatitis. ${CLOSE}`);
  assert.equal(run({ pattern: 'Perivascular', depth: 'Superficial dermis' }).microscopy,
    `Sections show a piece of skin down to the superficial dermis. The epidermis is unremarkable. The dermis shows a mild superficial perivascular infiltrate of lymphocytes. The overall features are those of a superficial perivascular dermatitis. ${CLOSE}`);
  assert.equal(run({ pattern: 'Vasculitis' }).microscopy,
    `${OPENER} Small vessels in the superficial dermis show fibrinoid necrosis and neutrophils within their walls, with leukocytoclasia and extravasated red cells. The overall features are those of a leukocytoclastic vasculitis. ${CLOSE}`);
  assert.equal(run({ pattern: 'Vasculitis', vessels: 'Medium-sized vessels at the dermal-subcutaneous junction', dx: 'Medium-vessel vasculitis', featVasculitis: ['Fibrinoid necrosis of vessel walls', 'Ulceration'] }).microscopy,
    `${OPENER} Medium-sized vessels at the dermal-subcutaneous junction show fibrinoid necrosis. The epidermis is ulcerated. The overall features are those of a medium-vessel vasculitis. ${CLOSE}`);
  assert.equal(run({ pattern: 'Vesiculobullous', blisterLevel: 'Intraepidermal', featBullous: ['Acantholysis', 'Tombstoning of basal keratinocytes'], blisterContent: 'Few inflammatory cells' }).microscopy,
    `${OPENER} There is an intraepidermal blister with acantholysis containing few inflammatory cells. Basal keratinocytes remain attached to the blister floor (tombstoning). `
    + `The dermis shows a mild superficial perivascular infiltrate of lymphocytes. The overall features are those of an intraepidermal acantholytic blistering dermatosis. ${CLOSE}`);
  assert.equal(run({ pattern: 'Granulomatous', dx: 'Granuloma annulare', granulomaType: 'Palisading', featGranulomatous: ['Increased central mucin'], mucin: 'Increased dermal mucin' }).microscopy,
    `${OPENER} The dermis contains histiocytes palisading around foci of altered collagen, with increased central mucin. Alcian blue stain shows increased dermal mucin. The overall features are those of granuloma annulare. ${CLOSE}`);
  assert.equal(run({ pattern: 'Granulomatous', dx: 'Sarcoidosis' }).microscopy,
    `${OPENER} The dermis contains well-formed non-necrotising epithelioid granulomas with few surrounding lymphocytes. The overall features are those of a sarcoidal granulomatous dermatitis, in keeping with sarcoidosis. ${CLOSE}`);
  assert.equal(run({ procedure: 'Incisional biopsy', pattern: 'Panniculitis', dx: 'Erythema nodosum', cells: ['Lymphocytes', 'Histiocytes', 'Neutrophils'], featPanniculitis: ['Septal thickening and fibrosis', 'Miescher radial granulomas'] }).microscopy,
    `${OPENER} The subcutis shows a septal panniculitis composed of lymphocytes, histiocytes and neutrophils, with septal thickening and fibrosis and Miescher radial granulomas. `
    + `The overall features are those of a septal panniculitis, in keeping with erythema nodosum. ${CLOSE}`);
  assert.equal(run({ pattern: 'Sclerosing', dx: 'Morphoea', depth: 'Reticular dermis', featSclerosing: ['Thickened hyalinised collagen bundles', 'Loss of periadnexal fat', 'Squared-off biopsy edges'], cells: ['Lymphocytes', 'Plasma cells'], infiltrate: 'Superficial and deep perivascular' }).microscopy,
    'Sections show a piece of skin down to the reticular dermis. The dermis shows thickened hyalinised collagen bundles and loss of periadnexal fat. The biopsy has squared-off edges. '
    + `There is a mild superficial and deep perivascular infiltrate of lymphocytes and plasma cells. The overall features are those of dermal sclerosis, in keeping with morphoea. ${CLOSE}`);
  assert.equal(run({ pattern: 'Folliculitis', dx: 'Pityrosporum folliculitis', featFollicular: ['Ruptured follicle', 'Yeasts in the follicle'], cells: ['Neutrophils', 'Lymphocytes'], pasd: 'Positive' }).microscopy,
    `${OPENER} A hair follicle shows rupture and yeasts within its lumen. There is a mild perifollicular infiltrate of neutrophils and lymphocytes. PASD stain shows yeasts within the follicle. `
    + `The overall features are those of Pityrosporum folliculitis. ${CLOSE}`);
  assert.equal(run({ pattern: 'Neutrophilic dermatosis', dx: 'Sweet syndrome', infiltrate: 'Diffuse', density: 'Dense', cells: ['Neutrophils'], featNeutrophilic: ['Marked papillary dermal oedema', 'Leukocytoclasia'] }).microscopy,
    `${OPENER} The dermis shows a dense diffuse infiltrate of neutrophils, with marked papillary dermal oedema and leukocytoclasia. The overall features are those of a neutrophilic dermatosis, in keeping with Sweet syndrome. ${CLOSE}`);
  assert.equal(run({ pattern: 'No significant abnormality' }).microscopy, `${OPENER} There is no significant histological abnormality. ${CLOSE}`);
});

test('every feature on every list prints', () => {
  const lists = { featSpongiotic: 'Spongiotic', featPsoriasiform: 'Psoriasiform', featVacuolar: 'Interface (vacuolar)', featLichenoid: 'Interface (lichenoid)',
    featPerivascular: 'Perivascular', featVasculitis: 'Vasculitis', featBullous: 'Vesiculobullous', featGranulomatous: 'Granulomatous',
    featPanniculitis: 'Panniculitis', featSclerosing: 'Sclerosing', featFollicular: 'Folliculitis', featNeutrophilic: 'Neutrophilic dermatosis',
    gvhdFeatures: 'Graft-versus-host disease' };
  for (const [id, pattern] of Object.entries(lists)) {
    const base = run({ pattern, [id]: [] });
    for (const opt of field(id).options) {
      const r = run({ pattern, [id]: [opt] });
      assert.ok(r.microscopy !== base.microscopy || r.diagnosis !== base.diagnosis, `${id} / ${opt} prints nothing`);
    }
  }
});

test('special stains and direct immunofluorescence', () => {
  const m = (values) => run(values).microscopy;
  assert.match(m({ pasd: 'Negative' }), / No fungal organisms are identified on PASD stain\. /);
  assert.match(m({ pasd: 'Positive', dx: 'Dermatophytosis' }), / PASD stain shows fungal hyphae in the stratum corneum\. /);
  assert.match(m({ mucin: 'No increase in dermal mucin' }), / Alcian blue stain shows no increase in dermal mucin\. /);
  assert.match(m({ organisms: ['Gram', 'Ziehl-Neelsen', 'Grocott'] }), / No organisms are identified on Gram, Ziehl-Neelsen and Grocott stains\. /);
  assert.match(m({ organisms: ['Fite'] }), / No organisms are identified on Fite stain\. /);
  assert.match(m({ otherStains: 'CD30 highlights scattered large cells.' }), / CD30 highlights scattered large cells\. /);
  assert.match(m({ dif: 'Negative' }), / Direct immunofluorescence studies for IgA, IgG, IgM, C3, C1q and fibrinogen are all negative\. /);
  assert.match(m({ dif: 'Reported separately' }), / Direct immunofluorescence is reported separately\. /);
  assert.match(m({ dif: 'Positive' }), / Direct immunofluorescence studies show linear deposition of IgG and C3 along the basement membrane zone; IgA, IgM, C1q and fibrinogen are negative\. /);
  assert.match(m({ dif: 'Positive', difPattern: 'Linear IgA along the basement membrane zone' }), /show linear deposition of IgA along the basement membrane zone; IgG, IgM, C3, C1q and fibrinogen are negative\. /);
  assert.match(m({ dif: 'Positive', difPattern: 'Granular IgA in the dermal papillae' }), /show granular deposition of IgA in the dermal papillae; IgG, IgM, C3, C1q and fibrinogen are negative\. /);
  assert.match(m({ dif: 'Positive', difPattern: 'Intercellular IgG and C3 in the epidermis' }), /show intercellular deposition of IgG and C3 in the epidermis; IgA, IgM, C1q and fibrinogen are negative\. /);
  assert.match(m({ dif: 'Positive', difPattern: 'Perivascular IgA and C3 in superficial dermal vessels' }), / Direct immunofluorescence studies show deposition of IgA and C3 in the walls of superficial dermal vessels\. /, 'companions not assumed');
  assert.match(m({ dif: 'Positive', difPattern: 'Granular IgG, IgM and C3 along the basement membrane zone' }), /show granular deposition of IgG, IgM and C3 along the basement membrane zone\. /);
  assert.match(m({ dif: 'Positive', difPattern: 'IgM-positive cytoid bodies' }), /show IgM-positive cytoid bodies in the papillary dermis\. /);
  assert.match(m({ dif: 'Positive', difPattern: 'Other', difOther: 'shaggy fibrinogen along the basement membrane zone.' }), / Direct immunofluorescence studies show shaggy fibrinogen along the basement membrane zone\. /);
  assert.doesNotMatch(m({ dif: 'Positive', difPattern: 'Other' }), /immunofluorescence/, 'nothing printed until the deposit is described');
  assert.doesNotMatch(m({}), /PASD|Alcian|immunofluorescence|organisms/, 'nothing printed for stains not performed');
});

test('the closing sentences: overall features, differential, no malignancy, correlation, notes', () => {
  const m = (values) => run(values).microscopy;
  assert.ok(m({ additionalNotes: 'Scattered melanophages are present.', differential: 'an id reaction and a drug reaction', noMalignancy: true })
    .endsWith(' Scattered melanophages are present. The overall features are those of a spongiotic dermatitis. The differential diagnosis includes an id reaction and a drug reaction. There is no evidence of malignancy. Please correlate with clinical findings.'));
  assert.ok(!m({ overall: false }).includes('overall features'));
  assert.ok(m({ correlate: false }).endsWith('The overall features are those of a spongiotic dermatitis.'));
  assert.ok(!m({}).includes('malignancy'), 'no trailing negative by default');
  assert.equal(field('noMalignancy').default, false);
});

// ---------- checks ----------

test('checks: stains, immunofluorescence, depth and the infiltrate', () => {
  assert.deepEqual(checksOf(run({})), [['info', 'pasd']], 'a spongiotic or psoriasiform pattern without PASD is a suggestion, not a warning');
  assert.deepEqual(checksOf(run({ pattern: 'Psoriasiform' })), [['info', 'pasd']]);
  assert.deepEqual(checksOf(run({ pattern: 'Interface (lichenoid)' })), [], 'no PASD suggestion for other patterns');
  assert.deepEqual(checksOf(run({ pasd: 'Negative' })), []);
  assert.deepEqual(checksOf(run({ dx: 'Dermatophytosis', pasd: 'Negative' })), [['warn', 'pasd']]);
  assert.deepEqual(checksOf(run({ dx: 'Dermatophytosis', pasd: 'Positive' })), []);
  assert.deepEqual(checksOf(run({ pattern: 'Vesiculobullous' })), [['info', 'dif']]);
  assert.deepEqual(checksOf(run({ pattern: 'Vesiculobullous', dx: 'Bullous pemphigoid', dif: 'Positive', difPattern: 'Granular IgA in the dermal papillae' })), [['warn', 'difPattern']]);
  assert.deepEqual(checksOf(run({ pattern: 'Vesiculobullous', dif: 'Positive', difPattern: 'Other' })), [['warn', 'difOther']]);
  assert.deepEqual(checksOf(run({ pattern: 'Panniculitis', depth: 'Reticular dermis' })), [['warn', 'depth']]);
  assert.deepEqual(checksOf(run({ pattern: 'Panniculitis' })), []);
  assert.deepEqual(checksOf(run({ pattern: 'Perivascular', infiltrate: 'Band-like' })), [['warn', 'infiltrate']]);
  assert.deepEqual(checksOf(run({ pattern: 'Folliculitis', dx: 'Pityrosporum folliculitis' })), [['info', 'featFollicular']]);
  assert.deepEqual(checksOf(run({ pattern: 'Folliculitis', dx: 'Demodex folliculitis', featFollicular: ['Demodex mites'] })), []);
});

// ---------- form ----------

test('the form shows each pattern its own fields', () => {
  const v = visible({ pattern: 'Spongiotic' });
  for (const id of ['spongiosis', 'featSpongiotic', 'infiltrate', 'density', 'cells', 'dx']) assert.ok(v.includes(id), id);
  for (const id of ['featPsoriasiform', 'vessels', 'blisterLevel', 'granulomaType', 'compartment', 'gvhdFeatures', 'lerner', 'nih']) assert.ok(!v.includes(id), id);
  const vb = visible({ pattern: 'Vesiculobullous' });
  for (const id of ['blisterLevel', 'blisterContent', 'featBullous']) assert.ok(vb.includes(id), id);
  const pn = visible({ pattern: 'Panniculitis' });
  assert.ok(pn.includes('compartment') && pn.includes('cells') && !pn.includes('infiltrate'));
  const nsa = visible({ pattern: 'No significant abnormality' });
  for (const id of ['dx', 'certainty', 'pasd', 'mucin', 'organisms', 'cells']) assert.ok(!nsa.includes(id), id);
  assert.ok(!visible({}).includes('difPattern'));
  assert.ok(visible({ dif: 'Positive' }).includes('difPattern'));
  assert.ok(visible({ dif: 'Positive', difPattern: 'Other' }).includes('difOther'));
  assert.ok(visible({ difReceived: 'Received fresh' }).includes('difSize'));
});

// ---------- intake ----------

test('routing: medical skin biopsies open this form; lesions stay on the excision forms', () => {
  const here = (line, history = '') => route(line, history).templateId;
  assert.equal(here('Skin, left forearm, punch biopsy'), 'skin_inflammatory', 'a bare punch: most are inflammatory');
  assert.equal(route('Skin, left forearm, punch biopsy').tier, 'confident');
  assert.equal(here('Skin, left forearm', 'itchy rash ?eczema'), 'skin_inflammatory', 'the LIS form without a procedure word');
  assert.equal(here('Skin, abdomen', 'post allo-HSCT day 30, maculopapular rash ?GVHD'), 'skin_inflammatory');
  assert.equal(here('Scalp, punch biopsy', 'alopecia'), 'skin_inflammatory');
  assert.equal(here('Skin, left shin, incisional biopsy', 'tender nodules ?erythema nodosum'), 'skin_inflammatory');
  assert.equal(here('Skin, thigh', 'blisters ?BP'), 'skin_inflammatory');
  assert.equal(here('Skin, back, shave', 'rash'), 'skin_inflammatory');
  assert.equal(here('Skin, back, punch biopsy', 'known melanoma on pembrolizumab, lichenoid rash'), 'skin_inflammatory', 'a rash word lets a tumour history through');
  assert.equal(here('Skin, back, shave', '?BCC'), 'skin_excision');
  assert.equal(here('Skin, back, punch biopsy', 'pigmented lesion'), 'skin_excision');
  assert.equal(here('Skin, back', '?BCC'), 'skin_excision');
  assert.equal(here('Skin, back', 'sebaceous cyst'), 'skin_cyst');
  assert.notEqual(here('Skin, nose, excision, BCC'), 'skin_inflammatory');
  assert.notEqual(here('Skin, back, excision biopsy'), 'skin_inflammatory');
  assert.notEqual(here('Skin, back, punch biopsy ?BCC'), 'skin_inflammatory');
});

test('presets: the site from either line form, the procedure, and graft-versus-host disease from the history', () => {
  assert.deepEqual(preset('Skin, left forearm', 'itchy rash ?eczema'), { specimenName: 'Left forearm' });
  assert.deepEqual(preset('Skin, abdomen, punch biopsy', 'post allo-HSCT day 30, rash ?GVHD'), { specimenName: 'Abdomen', procedure: 'Punch biopsy', pattern: 'Graft-versus-host disease' });
  assert.deepEqual(preset('Skin, back', 'bone marrow transplant 2023, new rash'), { specimenName: 'Back', pattern: 'Graft-versus-host disease' });
  assert.deepEqual(preset('Scalp, punch biopsy', 'alopecia'), { specimenName: 'Scalp', procedure: 'Punch biopsy' });
  assert.deepEqual(preset('Skin, thigh, punch biopsy x2 for H&E and DIF', 'blisters'), { specimenName: 'Thigh', procedure: 'Punch biopsy' });
  assert.deepEqual(preset('Skin, back, shave', 'rash'), { specimenName: 'Back', procedure: 'Shave biopsy' });
  assert.deepEqual(preset('Skin, left shin, incisional biopsy', '?EN'), { specimenName: 'Left shin', procedure: 'Incisional biopsy' });
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-spongiotic-eosinophils-pasd-negative', { specimenName: 'left forearm', size: '0.4 x 0.4 x 0.3', featSpongiotic: ['Parakeratosis', 'Spongiotic vesicles', 'Papillary dermal oedema'], cells: ['Lymphocytes', 'Eosinophils'], pasd: 'Negative' }],
  ['02-psoriasis', { specimenName: 'right elbow', pattern: 'Psoriasiform', dx: 'Psoriasis', featPsoriasiform: ['Confluent parakeratosis', 'Neutrophils in the parakeratotic scale', 'Loss of the granular layer', 'Suprapapillary thinning', 'Dilated tortuous papillary capillaries'], pasd: 'Negative' }],
  ['03-lichen-planus', { specimenName: 'left wrist', pattern: 'Interface (lichenoid)', dx: 'Lichen planus', infiltrate: 'Band-like', density: 'Dense', featLichenoid: ['Compact orthokeratosis', 'Wedge-shaped hypergranulosis', 'Saw-tooth rete ridges', 'Civatte bodies', 'Pigment incontinence'] }],
  ['04-leukocytoclastic-vasculitis', { specimenName: 'left shin', pattern: 'Vasculitis', featVasculitis: ['Fibrinoid necrosis of vessel walls', 'Neutrophils in vessel walls', 'Leukocytoclasia', 'Extravasated red cells', 'Eosinophils'] }],
  ['05-bullous-pemphigoid-dif', { specimenName: 'right thigh', pattern: 'Vesiculobullous', dx: 'Bullous pemphigoid', featBullous: ['Papillary dermal oedema'], cells: ['Lymphocytes', 'Eosinophils'], difReceived: "Received in Michel's medium", difSize: '0.3 x 0.3 x 0.3', dif: 'Positive' }],
  ['06-granuloma-annulare', { specimenName: 'dorsum of right hand', pattern: 'Granulomatous', dx: 'Granuloma annulare', granulomaType: 'Palisading', featGranulomatous: ['Increased central mucin'], mucin: 'Increased dermal mucin' }],
  ['07-erythema-nodosum', { specimenName: 'right shin', procedure: 'Incisional biopsy', size: '1.2 x 0.5 x 0.6', handling: 'Serially sliced', blocks: '2', pattern: 'Panniculitis', dx: 'Erythema nodosum', cells: ['Lymphocytes', 'Histiocytes', 'Neutrophils'], featPanniculitis: ['Septal thickening and fibrosis', 'Miescher radial granulomas', 'Multinucleated giant cells'] }],
  ['08-morphoea', { specimenName: 'back', depth: 'Reticular dermis', pattern: 'Sclerosing', dx: 'Morphoea', featSclerosing: ['Thickened hyalinised collagen bundles', 'Loss of periadnexal fat', 'Squared-off biopsy edges'], cells: ['Lymphocytes', 'Plasma cells'], infiltrate: 'Superficial and deep perivascular' }],
  ['09-acute-gvhd', { specimenName: 'abdomen', pattern: 'Graft-versus-host disease', gvhdFeatures: ['Basal vacuolar change', 'Apoptotic keratinocytes in the basal layer', 'Apoptotic keratinocytes in the lower spinous layer', 'Lymphocyte satellitosis', 'Apoptotic cells in the follicular epithelium'], density: 'Sparse' }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'skin_inflammatory', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});

// ---------- graft-versus-host disease ----------

const AGVHD = { pattern: 'Graft-versus-host disease', gvhdFeatures: ['Basal vacuolar change', 'Apoptotic keratinocytes in the basal layer', 'Apoptotic keratinocytes in the lower spinous layer', 'Lymphocyte satellitosis', 'Apoptotic cells in the follicular epithelium'], density: 'Sparse' };

test('GVHD: the NIH 2014 category is the qualifier; Likely GVHD carries the Lerner grade', () => {
  assert.deepEqual(field('nih').options, ['Likely GVHD', 'Possible GVHD', 'Not GVHD'], 'the NIH 2014 Table 2 wording');
  assert.equal(dx(AGVHD), 'INTERFACE DERMATITIS, likely ACUTE GRAFT-VERSUS-HOST DISEASE (Lerner grade II)');
  assert.equal(run(AGVHD).microscopy,
    `${OPENER} The epidermis shows basal vacuolar change, apoptotic keratinocytes in the basal and lower spinous layers and lymphocyte satellitosis. `
    + 'Apoptotic cells are also seen in the follicular epithelium. The dermis shows a sparse superficial perivascular infiltrate of lymphocytes. '
    + `The overall features are those of an interface dermatitis and likely represent acute graft-versus-host disease (Lerner grade II). ${CLOSE}`);
  assert.equal(dx({ ...AGVHD, gvhdFeatures: [...AGVHD.gvhdFeatures, 'Subepidermal clefts'] }), 'INTERFACE DERMATITIS, likely ACUTE GRAFT-VERSUS-HOST DISEASE (Lerner grade III)');
  assert.equal(dx({ ...AGVHD, lerner: 'Not graded' }), 'INTERFACE DERMATITIS, likely ACUTE GRAFT-VERSUS-HOST DISEASE');
  assert.equal(dx({ ...AGVHD, gvhdPhase: 'Acute and chronic' }), 'INTERFACE DERMATITIS, likely ACUTE AND CHRONIC GRAFT-VERSUS-HOST DISEASE (Lerner grade II)');
  assert.equal(dx({ ...AGVHD, nih: 'Possible GVHD' }), 'INTERFACE DERMATITIS, possible ACUTE GRAFT-VERSUS-HOST DISEASE (please see description)');
  assert.match(run({ ...AGVHD, nih: 'Possible GVHD', differential: 'a drug eruption' }).microscopy,
    / The overall features are those of an interface dermatitis and may represent acute graft-versus-host disease\. The differential diagnosis includes a drug eruption\. /);
  assert.equal(dx({ ...AGVHD, nih: 'Not GVHD', gvhdFeatures: [] }), 'NO EVIDENCE OF GRAFT-VERSUS-HOST DISEASE');
  assert.equal(run({ ...AGVHD, nih: 'Not GVHD', gvhdFeatures: [] }).microscopy,
    `${OPENER} The dermis shows a sparse superficial perivascular infiltrate of lymphocytes. There is no evidence of graft-versus-host disease. ${CLOSE}`);
  assert.equal(dx({ ...AGVHD, cells: ['Lymphocytes', 'Eosinophils'] }), 'INTERFACE DERMATITIS, likely ACUTE GRAFT-VERSUS-HOST DISEASE (Lerner grade II)', 'eosinophils do not change the line');
});

test('GVHD: chronic patterns are named, not Lerner-graded', () => {
  const lp = { pattern: 'Graft-versus-host disease', gvhdPhase: 'Chronic, lichen planus-like', gvhdFeatures: ['Lichen planus-like changes', 'Apoptotic keratinocytes in the basal layer', 'Perieccrine inflammation'], infiltrate: 'Band-like', cells: ['Lymphocytes', 'Plasma cells'] };
  assert.equal(dx(lp), 'LICHENOID DERMATITIS, likely CHRONIC GRAFT-VERSUS-HOST DISEASE (lichen planus-like)');
  assert.equal(run(lp).microscopy, `${OPENER} The epidermis shows orthohyperkeratosis, hypergranulosis, acanthosis and apoptotic keratinocytes in the basal layer. `
    + 'The papillary dermis shows a mild band-like infiltrate of lymphocytes and plasma cells, with lymphoplasmacytic inflammation around the eccrine coils. '
    + `The overall features are those of a lichenoid dermatitis and likely represent chronic graft-versus-host disease (lichen planus-like). ${CLOSE}`);
  assert.equal(dx({ pattern: 'Graft-versus-host disease', gvhdPhase: 'Chronic, morphoea-like', gvhdFeatures: ['Sclerosis of the reticular dermis'] }), 'DERMAL SCLEROSIS, likely CHRONIC GRAFT-VERSUS-HOST DISEASE (morphoea-like)');
  assert.equal(dx({ pattern: 'Graft-versus-host disease', gvhdPhase: 'Chronic, lichen sclerosus-like', gvhdFeatures: ['Homogenised papillary dermis'] }), 'DERMAL SCLEROSIS, likely CHRONIC GRAFT-VERSUS-HOST DISEASE (lichen sclerosus-like)');
  assert.equal(dx({ pattern: 'Graft-versus-host disease', gvhdPhase: 'Chronic, morphoea-like', nih: 'Possible GVHD' }), 'DERMAL SCLEROSIS, possible CHRONIC GRAFT-VERSUS-HOST DISEASE (please see description)');
  assert.ok(!visible({ pattern: 'Graft-versus-host disease', gvhdPhase: 'Chronic, morphoea-like' }).includes('lerner'));
  assert.ok(!visible({ pattern: 'Graft-versus-host disease', nih: 'Possible GVHD' }).includes('lerner'), 'graded with Likely GVHD only');
  assert.ok(visible({ pattern: 'Graft-versus-host disease' }).includes('lerner'));
  for (const id of ['dx', 'certainty']) assert.ok(!visible({ pattern: 'Graft-versus-host disease' }).includes(id), id);
});

test('GVHD checks: the minimal criterion, the differential of a possible GVHD, a grade set by hand', () => {
  assert.deepEqual(checksOf(run(AGVHD)), []);
  assert.deepEqual(checksOf(run({ ...AGVHD, gvhdFeatures: ['Basal vacuolar change'] })), [['warn', 'gvhdFeatures']]);
  assert.deepEqual(checksOf(run({ ...AGVHD, gvhdPhase: 'Chronic, morphoea-like', gvhdFeatures: ['Sclerosis of the reticular dermis'] })), [], 'chronic sclerotic GVHD has its own criteria');
  assert.deepEqual(checksOf(run({ ...AGVHD, nih: 'Possible GVHD' })), [['info', 'differential']]);
  assert.deepEqual(checksOf(run({ ...AGVHD, nih: 'Possible GVHD', differential: 'a drug eruption' })), []);
  assert.deepEqual(checksOf(run({ ...AGVHD, nih: 'Not GVHD', gvhdFeatures: [] })), []);
  assert.deepEqual(checksOf(run({ ...AGVHD, lerner: 'III' })), [['info', 'lerner']]);
  assert.deepEqual(checksOf(run({ ...AGVHD, lerner: 'II' })), []);
});

test('Lerner grade reads from the features unless set by hand', () => {
  assert.equal(lernerOf({ gvhdFeatures: ['Basal vacuolar change'], lerner: 'Not graded' }), '');
  assert.equal(lernerOf({ gvhdFeatures: [] }), '0');
  assert.equal(lernerOf({ gvhdFeatures: ['Basal vacuolar change'] }), 'I');
  assert.equal(lernerOf({ gvhdFeatures: ['Basal vacuolar change', 'Apoptotic keratinocytes in the basal layer'] }), 'II');
  assert.equal(lernerOf({ gvhdFeatures: ['Apoptotic cells in the follicular epithelium'] }), 'II');
  assert.equal(lernerOf({ gvhdFeatures: ['Basal vacuolar change', 'Subepidermal clefts'] }), 'III');
  assert.equal(lernerOf({ gvhdFeatures: ['Subepidermal clefts', 'Separation of the epidermis'] }), 'IV');
  assert.equal(lernerOf({ gvhdFeatures: ['Basal vacuolar change'], lerner: 'III' }), 'III');
});
