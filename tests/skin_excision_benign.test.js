// Phase 40: benign adnexal, neural, fibrous, vascular and fatty lesions on Skin excision (user 2026-09-25).
// Wording is deliberate; update the strings only on purpose. Sources for every paragraph are in
// docs/reference/skin-excision-benign-sources.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/skinexcision.js';
import { parseIntake, matchParts } from '../src/intake.js';
import { loadManifest } from '../src/registry.js';
import { rankTemplates } from '../src/picker.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('skin_excision');
const manifest = await loadManifest();
const run = (c) => generate(schema, gen, c);
const one = (values) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};
const field = schema.fields.find((f) => f.id === 'diagnosis');
const route = (line, history = '') => matchParts(parseIntake(`(A) ${line}`), history, manifest)[0];

// The 15 options to Phase 39, in their original order.
const ORIGINAL = [
  'Nodular basal cell carcinoma', 'Superficial BCC', 'Infiltrative BCC', 'Micronodular BCC', 'Keratoacanthoma',
  'Seborrhoeic keratosis', 'Intradermal naevus', 'Compound naevus', 'Dermatofibroma', 'Pyogenic granuloma',
  'Actinic keratosis', 'Squamous cell carcinoma in situ (Bowen disease)', 'Invasive SCC – see comment',
  'Melanoma – see comment', 'Benign, other'
];

// option -> [diagnosis line after the dash, closing sentences before the margin block]
const NO_MAL = 'There is no evidence of malignancy.';
const ADDED = {
  'Verruca vulgaris': ['VERRUCA VULGARIS', 'The findings are those of a verruca vulgaris. There is no evidence of dysplasia or malignancy.'],
  Pilomatrixoma: ['PILOMATRIXOMA', `The findings are those of a pilomatrixoma. ${NO_MAL}`],
  Trichoepithelioma: ['TRICHOEPITHELIOMA', `The findings are those of a trichoepithelioma. ${NO_MAL}`],
  Trichoblastoma: ['TRICHOBLASTOMA', `Cellular pleomorphism is minimal. The findings are those of a trichoblastoma. ${NO_MAL}`],
  Trichilemmoma: ['TRICHILEMMOMA', `The overlying epidermis is hyperkeratotic. The findings are those of a trichilemmoma. ${NO_MAL}`],
  Trichofolliculoma: ['TRICHOFOLLICULOMA', `The findings are those of a trichofolliculoma. ${NO_MAL}`],
  Poroma: ['POROMA', `The findings are those of a poroma. ${NO_MAL}`],
  Hidradenoma: ['HIDRADENOMA', `The findings are those of a hidradenoma. ${NO_MAL}`],
  Spiradenoma: ['SPIRADENOMA', `The findings are those of a spiradenoma. ${NO_MAL}`],
  Cylindroma: ['CYLINDROMA', `The findings are those of a cylindroma. ${NO_MAL}`],
  Syringoma: ['SYRINGOMA', `The findings are those of a syringoma. ${NO_MAL}`],
  'Syringocystadenoma papilliferum': ['SYRINGOCYSTADENOMA PAPILLIFERUM', `The papillary stroma contains plasma cells. The findings are those of a syringocystadenoma papilliferum. ${NO_MAL}`],
  'Mixed tumour (chondroid syringoma)': ['MIXED TUMOUR (CHONDROID SYRINGOMA)', `The findings are those of a mixed tumour (chondroid syringoma). ${NO_MAL}`],
  'Sebaceous hyperplasia': ['SEBACEOUS HYPERPLASIA', `The findings are those of sebaceous hyperplasia. ${NO_MAL}`],
  'Sebaceous adenoma': ['SEBACEOUS ADENOMA', `Mature sebocytes predominate. The findings are those of a sebaceous adenoma. ${NO_MAL}`],
  Sebaceoma: ['SEBACEOMA', `The basaloid cells predominate. There are no atypical mitoses and no necrosis. The findings are those of a sebaceoma. ${NO_MAL}`],
  'Naevus sebaceus': ['NAEVUS SEBACEUS', `The findings are those of a naevus sebaceus. ${NO_MAL}`],
  Neurofibroma: ['NEUROFIBROMA', `There is no cytological atypia or mitotic activity. The findings are those of a neurofibroma. ${NO_MAL}`],
  Schwannoma: ['SCHWANNOMA', `The findings are those of a schwannoma. ${NO_MAL}`],
  'Granular cell tumour': ['GRANULAR CELL TUMOUR', `The findings are those of a granular cell tumour. ${NO_MAL}`],
  'Fibroepithelial polyp': ['FIBROEPITHELIAL POLYP', 'The findings are those of a fibroepithelial polyp. There is no evidence of dysplasia or malignancy.'],
  Scar: ['SCAR', `The findings are those of a scar. ${NO_MAL}`],
  Keloid: ['KELOID', `The findings are those of a keloid. ${NO_MAL}`],
  Haemangioma: ['HAEMANGIOMA', `There is no endothelial atypia. The findings are those of a haemangioma. ${NO_MAL}`],
  Lipoma: ['LIPOMA', `No atypical stromal cells or lipoblasts are observed. The findings are those of a lipoma. ${NO_MAL}`],
  'Benign adnexal tumour, other': ['BENIGN ADNEXAL TUMOUR (see microscopic examination)', `Sections show a benign adnexal tumour; see additional description. ${NO_MAL}`]
};

test('Phase 40 lesions join the list; the original options keep their order and the default', () => {
  const opts = field.options;
  assert.equal(opts.length, ORIGINAL.length + Object.keys(ADDED).length);
  assert.equal(new Set(opts).size, opts.length, 'no duplicate options');
  assert.deepEqual(opts.filter((o) => ORIGINAL.includes(o)), ORIGINAL);
  for (const o of Object.keys(ADDED)) assert.ok(opts.includes(o), o);
  assert.deepEqual(opts.slice(-2), ['Benign adnexal tumour, other', 'Benign, other'], 'the two catch-alls close the list');
  assert.equal(field.default, 'Nodular basal cell carcinoma');
  assert.equal(field.type, 'select');
});

test('optgroups: every option in exactly one group, except the two catch-alls that follow them', () => {
  const groups = field.optionGroups;
  assert.deepEqual(groups.map((g) => g.label), [
    'Basal cell carcinoma', 'Keratinocytic', 'Melanocytic', 'Adnexal, follicular', 'Adnexal, sweat gland',
    'Adnexal, sebaceous', 'Neural', 'Fibrous, vascular and fatty'
  ]);
  const grouped = groups.flatMap((g) => g.options);
  assert.equal(new Set(grouped).size, grouped.length, 'no option in two groups');
  for (const o of grouped) assert.ok(field.options.includes(o), `group option ${o} is a real option`);
  assert.deepEqual(field.options.filter((o) => !grouped.includes(o)), ['Benign adnexal tumour, other', 'Benign, other']);
  assert.deepEqual(groups.find((g) => g.label === 'Neural').options, ['Neurofibroma', 'Schwannoma', 'Granular cell tumour']);
  assert.deepEqual(groups.find((g) => g.label === 'Adnexal, sebaceous').options, ['Sebaceous hyperplasia', 'Sebaceous adenoma', 'Sebaceoma', 'Naevus sebaceus']);
});

test('each added lesion prints its own diagnosis line with the margin clause', () => {
  const P = 'SKIN, left cheek nodule, excision - ';
  for (const [o, [main]] of Object.entries(ADDED)) {
    assert.equal(run(one({ specimenName: 'left cheek', diagnosis: o })).diagnosis, `${P}${main}; completely excised`, o);
  }
  const involved = run(one({ specimenName: 'left cheek', diagnosis: 'Neurofibroma', completeness: 'Involved – which', involvedMargins: ['Deep'] })).diagnosis;
  assert.equal(involved, `${P}NEUROFIBROMA; involved at the deep margin`);
});

test('each added lesion has its own paragraph, closing with the negative sentence before the margins', () => {
  for (const [o, [, closer]] of Object.entries(ADDED)) {
    const micro = run(one({ diagnosis: o })).microscopy;
    assert.ok(micro.endsWith(`${closer} Excision is complete.`), `${o}: ${micro}`);
    assert.ok(!micro.includes('benign skin lesion; see additional description'), `${o} has its own paragraph`);
    assert.ok(!/perineural/i.test(micro), `${o}: no perineural sentence on a benign lesion`);
  }
  assert.equal(run(one({ diagnosis: 'Pilomatrixoma' })).microscopy, 'Sections show skin with a well-circumscribed, lobulated dermal tumour composed of islands of basaloid cells that keratinise abruptly to anucleate shadow cells. There is a foreign body giant cell reaction to the keratin, with foci of calcification. The findings are those of a pilomatrixoma. There is no evidence of malignancy. Excision is complete.');
  assert.equal(run(one({ diagnosis: 'Neurofibroma' })).microscopy, 'Sections show skin with a poorly circumscribed dermal proliferation of bland spindle cells with wavy nuclei, set in a loose collagenous and myxoid stroma containing scattered mast cells. There is no cytological atypia or mitotic activity. The findings are those of a neurofibroma. There is no evidence of malignancy. Excision is complete.');
  assert.equal(run(one({ diagnosis: 'Poroma' })).microscopy, 'Sections show skin with a well-circumscribed tumour that replaces the epidermis and extends into the dermis in broad anastomosing bands of uniform small cuboidal cells with round basophilic nuclei and compact eosinophilic cytoplasm. The tumour cells are sharply demarcated from the adjacent keratinocytes, and scattered ducts lined by an eosinophilic cuticle are seen within a delicate fibrovascular stroma. The findings are those of a poroma. There is no evidence of malignancy. Excision is complete.');
  // ulceration still sits between the paragraph and the margins
  assert.ok(run(one({ diagnosis: 'Keloid', ulceration: 'Present' })).microscopy.endsWith(`The findings are those of a keloid. ${NO_MAL} The overlying epidermis is ulcerated. Excision is complete.`));
});

test('shared lesions read as they do on the Skin lesion (shave / punch) form', () => {
  const micro = (o) => run(one({ diagnosis: o })).microscopy;
  assert.ok(micro('Verruca vulgaris').includes('papillomatous epidermis showing hyperkeratosis, parakeratosis, acanthosis and inward bending of the elongated rete ridges. Koilocytes with coarse keratohyaline granules are present in the upper epidermis.'));
  assert.ok(micro('Haemangioma').includes('dilated, thin-walled vascular channels lined by bland flattened endothelial cells and filled with blood. There is no endothelial atypia.'));
  assert.ok(micro('Keloid').includes('thick, glassy, hyalinised collagen bundles and fibroblasts beneath a flattened epidermis, with loss of adnexal structures.'));
  assert.ok(micro('Fibroepithelial polyp').startsWith('Sections show a polypoid piece of skin covered by mildly acanthotic epidermis with a loose fibrovascular dermal core containing mature adipose tissue.'));
});

test('printed sentences keep British spelling and describe only what is seen', () => {
  const AMERICAN = /\b(tumors?|nevus|nevi|hemangioma|hyalinized|keratinizes?|keratinization|color|fetal|edema)\b/i;
  const REGISTER = /\bWHO\b|by definition|exclude|favou?r|recommend|should|prognos|suggest|probabl|cannot|consistent with/i;
  for (const o of Object.keys(ADDED)) {
    const r = run(one({ diagnosis: o }));
    for (const text of [r.microscopy, r.diagnosis]) {
      assert.ok(!AMERICAN.test(text), `${o}: ${text.match(AMERICAN)?.[0]}`);
      assert.ok(!REGISTER.test(text), `${o}: ${text.match(REGISTER)?.[0]}`);
    }
  }
});

test('intake: a lesion named in the history opens Skin excision; shaves, cysts and lipomas keep their homes', () => {
  for (const [line, history] of [
    ['Skin, back, excision', '?neurofibroma'],
    ['Skin, back, excision', 'multiple neurofibromas'],
    ['Skin, scalp, excision', 'pilomatrixoma'],
    ['Skin, cheek, excision', '?pilomatricoma'],
    ['Skin, face, excision', 'adnexal tumour'],
    ['Skin, nose, excision', 'sebaceous hyperplasia'],
    ['Skin, ear, excision', 'keloid'],
    ['Skin, finger, excision', 'verruca']
  ]) {
    const r = route(line, history);
    assert.equal(r.templateId, 'skin_excision', `${line} | ${history}`);
    assert.equal(r.tier, 'confident', `${line} | ${history}`);
  }
  assert.equal(route('Skin, back, shave', 'verruca').templateId, 'skin_lesion');
  assert.equal(route('Skin, back, excision', 'sebaceous cyst').templateId, 'skin_cyst');
  assert.equal(route('Lipoma, back, excision', 'lipoma').templateId, 'soft_tissue_benign');
  assert.equal(route('Skin, back, excision').tier, 'choose', 'the specimen line alone still offers the choice');
});

test('picker: lesion names find Skin excision; adnexal, lipoma and sebaceous keep their first result', () => {
  const first = (q) => rankTemplates(manifest, q)[0]?.id;
  for (const q of ['neurofibroma', 'pilomatrixoma', 'pilomatricoma', 'poroma', 'trichoblastoma', 'syringoma', 'naevus sebaceus', 'sebaceous adenoma', 'keloid', 'verruca', 'skin tag']) {
    assert.equal(first(q), 'skin_excision', q);
  }
  assert.equal(first('adnexal'), 'ovary_ft_peritoneum');
  assert.equal(first('lipoma'), 'soft_tissue_benign');
  assert.equal(first('sebaceous'), 'skin_cyst');
});
