// Phase 4b item 14: skin — small benign lesion (shave / punch / small excision / curettings). Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/skinlesion.js';
import { sizePhrase, mmPhrase, lesionPhrase, marginSentence, marginClause, flags, NAEVUS_BLAND } from '../generators/skinlesion.js';

const schema = JSON.parse(readFileSync(new URL('../schemas/skin_lesion.json', import.meta.url), 'utf8'));
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  Object.assign(c.options, options);
  return c;
};

const SK_PARA = 'Sections show an acanthotic epidermis with elongation of rete ridges and overlying papillomatosis forming a verrucous, exophytic configuration. The lesion is composed of broad sheets of basaloid keratinocytes with horn pseudocysts. The epidermis is composed of cytologically bland keratinocytes without significant nuclear atypia or dysplasia. The underlying dermis shows a mild superficial perivascular lymphocytic infiltrate. The features are those of a seborrhoeic keratosis.';
const NAEVUS_PARA = `Sections show a piece of skin with nests of naevus cells at the dermo-epidermal junction and within the dermis. ${NAEVUS_BLAND} The findings are those of a compound melanocytic naevus. The lesion is completely excised with a closest margin of 2 mm. There is no evidence of malignancy.`;

test('metadata: benign skin resection with search aliases and complete defaults', () => {
  assert.equal(schema.id, 'skin_lesion');
  assert.equal(schema.generator, 'skinlesion');
  assert.equal(schema.version, '2026.09');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Skin');
  assert.equal(schema.name, 'Skin — small benign lesion');
  assert.equal(schema.label, 'Skin lesion');
  assert.equal(schema.organ, 'SKIN');
  assert.equal(schema.rank, 37);
  assert.equal(schema.shortName, 'Skin · shave / punch / small excision');
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['skin tag', 'naevus', 'nevus', 'seborrhoeic keratosis', 'pyogenic granuloma', 'dermatofibroma', 'verruca', 'wart', 'molluscum', 'actinic keratosis', 'neurofibroma', 'haemangioma', 'keloid', 'xanthelasma', 'shave', 'punch', 'curettage']) assert.ok(schema.aliases.includes(a), a);
  assert.equal(schema.maxParts, 6);
  assert.equal(schema.defaultParts, 1);
  assert.deepEqual(schema.style, { british: true });
  assert.deepEqual(Object.keys(schema).slice(0, 10), ['id', 'version', 'name', 'shortName', 'label', 'organ', 'system', 'kind', 'rank', 'aliases']);
  for (const f of schema.fields) assert.ok('default' in f, `${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is a field`);
  for (const id of ids) assert.ok(id in schema.example.parts[0].values, `example has ${id}`);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  assert.deepEqual(macroFields, ['procedure', 'specimenSize', 'lesionDescription', 'lesionSize', 'deepInked', 'blocks']);
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  assert.equal(schema.fields.find((f) => f.id === 'lesionType').options.length, 14);
  assert.deepEqual(schema.fields.find((f) => f.id === 'deepInked').showIf, { field: 'procedure', is: 'Excision, ellipse' });
  assert.deepEqual(schema.fields.find((f) => f.id === 'closestMargin').showIf, { field: 'procedure', is: 'Excision, ellipse' });
  assert.deepEqual(schema.fields.find((f) => f.id === 'skSubtype').showIf, { field: 'lesionType', is: 'Seborrhoeic keratosis' });
  assert.deepEqual(schema.fields.find((f) => f.id === 'akGrade').options, ['KIN I', 'KIN II', 'KIN III']);
  assert.deepEqual(schema.fields.find((f) => f.id === 'naevusType').options, ['Intradermal', 'Compound', 'Junctional']);
  assert.equal(schema.fields.find((f) => f.id === 'marginStatus').options.length, 5);
  assert.equal(schema.snippets.length, 3);
});

test('helpers: sizes, mm, lesion phrase, margin sentence and clause', () => {
  assert.equal(sizePhrase('0.6x0.4x0.2'), '0.6 x 0.4 x 0.2 cm');
  assert.equal(sizePhrase('1.2 X 0.6'), '1.2 x 0.6 cm');
  assert.equal(sizePhrase('5 mm'), '5 mm');
  assert.equal(sizePhrase(''), '');
  assert.equal(mmPhrase('2'), '2 mm');
  assert.equal(mmPhrase('1.5'), '1.5 mm');
  assert.equal(mmPhrase(''), '');
  assert.equal(lesionPhrase({ lesionDescription: ['Papule'] }), 'a papule');
  assert.equal(lesionPhrase({ lesionDescription: ['Pigmented', 'Papule'] }), 'a pigmented papule');
  assert.equal(lesionPhrase({ lesionDescription: ['Polypoid', 'Ulcerated'] }), 'an ulcerated polypoid lesion');
  assert.equal(lesionPhrase({ lesionDescription: ['Verrucous'] }), 'a verrucous lesion');
  assert.equal(lesionPhrase({ lesionDescription: ['Nodule', 'Pigmented', 'Verrucous'] }), 'a pigmented verrucous nodule');
  assert.equal(lesionPhrase({ lesionDescription: [] }), 'a lesion');
  assert.equal(marginSentence({ marginStatus: 'Not applicable – shave' }), '');
  assert.equal(marginSentence({ marginStatus: 'Completely excised', procedure: 'Excision, ellipse', closestMargin: '2' }), 'The lesion is completely excised with a closest margin of 2 mm.');
  assert.equal(marginSentence({ marginStatus: 'Completely excised', procedure: 'Punch', closestMargin: '2' }), 'The lesion is completely excised.');
  assert.equal(marginSentence({ marginStatus: 'Lesion extends to the edge of the shave' }), 'The lesion extends to the edge of the shave.');
  assert.equal(marginSentence({ marginStatus: 'Involves deep margin' }), 'The lesion involves the deep margin.');
  assert.equal(marginClause({ marginStatus: 'Not applicable – shave' }), '');
  assert.equal(marginClause({ marginStatus: 'Completely excised', procedure: 'Excision, ellipse', closestMargin: '2' }), 'completely excised (closest margin 2 mm)');
  assert.equal(marginClause({ marginStatus: 'Completely excised', procedure: 'Excision, ellipse', closestMargin: '' }), 'completely excised');
  assert.equal(marginClause({ marginStatus: 'Lesion extends to the lateral margin' }), 'lesion extends to the lateral margin');
  assert.equal(marginClause({ marginStatus: 'Involves deep margin' }), 'lesion involves the deep margin');
});

test('example: compound naevus, back, excision, completely excised', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Skin, back, excision');
  assert.equal(r.macro, 'Received in formalin is an ellipse of skin measuring 1.2 x 0.6 x 0.4 cm bearing a pigmented papule measuring 0.5 cm. The deep surface is inked. All embedded in 2 blocks.');
  assert.equal(r.blockKey, '(1-2) Ellipse, cross-sections, all embedded.');
  assert.equal(r.microscopy, NAEVUS_PARA);
  assert.equal(r.diagnosis, 'SKIN, back, excision - COMPOUND MELANOCYTIC NAEVUS; no atypical features; completely excised (closest margin 2 mm)');
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('(A)'));
  assert.ok(!r.report.includes('undefined'));
});

test('house shave example: seborrhoeic keratosis extending to the edge of the shave', () => {
  const r = run(one({ specimenName: 'left forearm', procedure: 'Shave', specimenSize: '0.6 x 0.4 x 0.2', lesionDescription: ['Pigmented', 'Papule'], blocks: '1', lesionType: 'Seborrhoeic keratosis', marginStatus: 'Lesion extends to the edge of the shave' }));
  assert.equal(r.specimens, 'Skin, left forearm, shave');
  assert.equal(r.macro, 'Received in formalin is a shave of skin measuring 0.6 x 0.4 x 0.2 cm bearing a pigmented papule. All embedded in 1 block.');
  assert.equal(r.blockKey, '(1) Shave, all embedded.');
  assert.equal(r.microscopy, `${SK_PARA} The lesion extends to the edge of the shave. There is no evidence of dysplasia or malignancy.`);
  assert.equal(r.diagnosis, 'SKIN, left forearm, shave - SEBORRHOEIC KERATOSIS; lesion extends to the edge of the shave');
});

test('macro and block key per procedure; both disappear when options.macro is false', () => {
  assert.equal(run(one({ procedure: 'Punch', specimenSize: '0.4', lesionDescription: ['Nodule'], lesionSize: '0.3' })).macro, 'Received in formalin is a punch biopsy of skin measuring 0.4 cm bearing a nodule measuring 0.3 cm. All embedded in 1 block.');
  assert.equal(run(one({ procedure: 'Punch' })).blockKey, '(1) Punch, all embedded.');
  const cur = run(one({ procedure: 'Curettings', specimenSize: '0.8 x 0.5 x 0.2', blocks: '1' }));
  assert.equal(cur.macro, 'Received in formalin are multiple fragments of skin (curettings) measuring 0.8 x 0.5 x 0.2 cm in aggregate. All embedded in 1 block.');
  assert.equal(cur.blockKey, '(1) Curettings, all embedded.');
  assert.equal(cur.specimens, 'Skin, curettings');
  const ell = run(one({ procedure: 'Excision, ellipse', specimenSize: '1.5 x 0.8 x 0.5', lesionDescription: ['Papule'], deepInked: false, blocks: '3' }));
  assert.equal(ell.macro, 'Received in formalin is an ellipse of skin measuring 1.5 x 0.8 x 0.5 cm bearing a papule. All embedded in 3 blocks.');
  assert.equal(ell.blockKey, '(1-3) Ellipse, cross-sections, all embedded.');
  // deepInked only prints for an ellipse
  assert.ok(!run(one({ procedure: 'Shave', deepInked: true })).macro.includes('inked'));
  const off = run(one({ specimenName: 'left forearm' }, { macro: false }));
  assert.equal(off.macro, '');
  assert.equal(off.blockKey, '');
  assert.ok(!off.report.includes('Received in formalin'));
  assert.ok(!off.report.includes('all embedded'));
  assert.ok(off.report.startsWith('Skin, left forearm, shave\n\nSections show'));
});

test('headers option labels the macro and block key blocks', () => {
  const r = run(one({}, { includeHeader: true }));
  assert.ok(r.report.includes('MACROSCOPIC DESCRIPTION:\nReceived in formalin is a shave of skin'));
  assert.ok(r.report.includes('BLOCK KEY:\n(1) Shave, all embedded.'));
});

test('two-part case keeps (A)/(B) prefixes on every block', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, specimenName: 'left forearm', specimenSize: '0.6 x 0.4 x 0.2', lesionDescription: ['Pigmented', 'Papule'], marginStatus: 'Lesion extends to the edge of the shave' };
  c.parts[1].values = { ...c.parts[1].values, specimenName: 'back', procedure: 'Excision, ellipse', specimenSize: '1.2 x 0.6 x 0.4', lesionSize: '0.5', blocks: '2', lesionType: 'Melanocytic naevus', naevusType: 'Intradermal', marginStatus: 'Completely excised' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Skin, left forearm, shave\n(B) Skin, back, excision');
  assert.equal(r.macro, '(A) Received in formalin is a shave of skin measuring 0.6 x 0.4 x 0.2 cm bearing a pigmented papule. All embedded in 1 block.\n\n(B) Received in formalin is an ellipse of skin measuring 1.2 x 0.6 x 0.4 cm bearing a papule measuring 0.5 cm. The deep surface is inked. All embedded in 2 blocks.');
  assert.equal(r.blockKey, '(A) (1) Shave, all embedded.\n(B) (1-2) Ellipse, cross-sections, all embedded.');
  assert.ok(r.microscopy.startsWith('(A) Sections show an acanthotic epidermis'));
  assert.ok(r.microscopy.includes('\n\n(B) Sections show a piece of skin with nests and cords of naevus cells confined to the dermis, without a junctional component. The melanocytes mature with depth and there is no cytological atypia or mitotic activity. The findings are those of an intradermal melanocytic naevus. The lesion is completely excised. There is no evidence of malignancy.'));
  assert.equal(r.diagnosis, '(A) SKIN, left forearm, shave - SEBORRHOEIC KERATOSIS; lesion extends to the edge of the shave\n(B) SKIN, back, excision - INTRADERMAL MELANOCYTIC NAEVUS; no atypical features; completely excised');
  for (const block of [r.specimens, r.macro, r.blockKey, r.microscopy, r.diagnosis]) assert.ok(block.includes('(A)') && block.includes('(B)'));
});

test('each lesion type yields the right capitalised diagnosis', () => {
  const dx = (lesionType, extra = {}) => run(one({ specimenName: 'left forearm', lesionType, ...extra })).diagnosis;
  const P = 'SKIN, left forearm, shave - ';
  assert.equal(dx('Skin tag / fibroepithelial polyp'), `${P}SKIN TAG (FIBROEPITHELIAL POLYP)`);
  assert.equal(dx('Seborrhoeic keratosis'), `${P}SEBORRHOEIC KERATOSIS`);
  assert.equal(dx('Seborrhoeic keratosis', { skSubtype: 'Hyperkeratotic' }), `${P}SEBORRHOEIC KERATOSIS, hyperkeratotic type`);
  assert.equal(dx('Seborrhoeic keratosis', { skSubtype: 'Irritated' }), `${P}IRRITATED SEBORRHOEIC KERATOSIS`);
  assert.equal(dx('Seborrhoeic keratosis', { skSubtype: 'Clonal' }), `${P}SEBORRHOEIC KERATOSIS, clonal type`);
  assert.equal(dx('Seborrhoeic keratosis', { skSubtype: 'Reticulated' }), `${P}SEBORRHOEIC KERATOSIS, reticulated type`);
  assert.equal(dx('Pyogenic granuloma (lobular capillary haemangioma)'), `${P}PYOGENIC GRANULOMA (LOBULAR CAPILLARY HAEMANGIOMA)`);
  assert.equal(dx('Pyogenic granuloma (lobular capillary haemangioma)', { pgUlceration: 'Present' }), `${P}PYOGENIC GRANULOMA (LOBULAR CAPILLARY HAEMANGIOMA); ulcerated`);
  assert.equal(dx('Dermatofibroma'), `${P}DERMATOFIBROMA`);
  assert.equal(dx('Melanocytic naevus'), `${P}INTRADERMAL MELANOCYTIC NAEVUS; no atypical features`);
  assert.equal(dx('Melanocytic naevus', { naevusType: 'Compound' }), `${P}COMPOUND MELANOCYTIC NAEVUS; no atypical features`);
  assert.equal(dx('Melanocytic naevus', { naevusType: 'Junctional' }), `${P}JUNCTIONAL MELANOCYTIC NAEVUS; no atypical features`);
  assert.equal(dx('Melanocytic naevus', { naevusType: 'Compound', congenitalPattern: true }), `${P}COMPOUND MELANOCYTIC NAEVUS, congenital pattern; no atypical features`);
  assert.equal(dx('Melanocytic naevus', { naevusType: 'Compound', dysplasticFeatures: 'Mild' }), `${P}COMPOUND MELANOCYTIC NAEVUS; mild dysplastic features`);
  assert.equal(dx('Verruca vulgaris'), `${P}VERRUCA VULGARIS`);
  assert.equal(dx('Molluscum contagiosum'), `${P}MOLLUSCUM CONTAGIOSUM`);
  assert.equal(dx('Neurofibroma'), `${P}NEUROFIBROMA`);
  assert.equal(dx('Haemangioma'), `${P}HAEMANGIOMA`);
  assert.equal(dx('Keloid / hypertrophic scar'), `${P}KELOID / HYPERTROPHIC SCAR`);
  assert.equal(dx('Xanthelasma'), `${P}XANTHELASMA`);
  assert.equal(dx('Chondrodermatitis nodularis helicis'), `${P}CHONDRODERMATITIS NODULARIS HELICIS`);
  assert.equal(dx('Actinic keratosis'), `${P}ACTINIC KERATOSIS (KIN I)`);
  assert.equal(dx('Actinic keratosis', { akGrade: 'KIN III' }), `${P}ACTINIC KERATOSIS (KIN III)`);
  assert.equal(dx('Malignant / atypical – see comment'), `${P}MALIGNANT / ATYPICAL LESION; see comment`);
  // margin clauses append after the main entity; the naevus qualifier stays before the margin
  assert.equal(dx('Dermatofibroma', { procedure: 'Excision, ellipse', marginStatus: 'Completely excised', closestMargin: '1.5' }), 'SKIN, left forearm, excision - DERMATOFIBROMA; completely excised (closest margin 1.5 mm)');
  assert.equal(dx('Melanocytic naevus', { procedure: 'Punch', marginStatus: 'Lesion extends to the lateral margin' }), 'SKIN, left forearm, punch - INTRADERMAL MELANOCYTIC NAEVUS; no atypical features; lesion extends to the lateral margin');
  assert.equal(dx('Haemangioma', { procedure: 'Excision, ellipse', marginStatus: 'Involves deep margin' }), 'SKIN, left forearm, excision - HAEMANGIOMA; lesion involves the deep margin');
});

test('microscopy paragraphs are in the house voice and close with the right negative', () => {
  const micro = (lesionType, extra = {}) => run(one({ lesionType, ...extra })).microscopy;
  assert.equal(micro('Seborrhoeic keratosis'), `${SK_PARA} There is no evidence of dysplasia or malignancy.`);
  assert.ok(micro('Seborrhoeic keratosis', { skSubtype: 'Irritated' }).includes('Squamous eddies are present within the lesion. The epidermis is composed of cytologically bland keratinocytes without significant nuclear atypia or dysplasia. The underlying dermis shows a brisk lichenoid lymphocytic infiltrate. The features are those of an irritated seborrhoeic keratosis.'));
  assert.ok(micro('Seborrhoeic keratosis', { skSubtype: 'Hyperkeratotic' }).includes('church-spire-like projections'));
  assert.ok(micro('Seborrhoeic keratosis', { skSubtype: 'Clonal' }).includes('(clonal pattern)'));
  assert.ok(micro('Seborrhoeic keratosis', { skSubtype: 'Reticulated' }).includes('(reticulated pattern)'));
  assert.equal(micro('Skin tag / fibroepithelial polyp'), 'Sections show a polypoid piece of skin covered by mildly acanthotic epidermis with a loose fibrovascular dermal core containing mature adipose tissue. The findings are those of a skin tag (fibroepithelial polyp). There is no evidence of dysplasia or malignancy.');
  assert.equal(micro('Pyogenic granuloma (lobular capillary haemangioma)', { pgUlceration: 'Present' }), 'Sections show a polypoid lesion composed of lobules of capillary-sized vessels lined by bland endothelial cells in an oedematous stroma with a mixed inflammatory infiltrate, surrounded by an epidermal collarette. The surface is ulcerated and covered by fibrinopurulent exudate. The findings are those of a pyogenic granuloma (lobular capillary haemangioma). There is no evidence of malignancy.');
  assert.ok(!micro('Pyogenic granuloma (lobular capillary haemangioma)').includes('ulcerated'));
  assert.ok(micro('Dermatofibroma').includes('entrapment of collagen bundles at the periphery. The overlying epidermis is acanthotic with basal hyperpigmentation. The findings are those of a dermatofibroma. There is no evidence of malignancy.'));
  assert.ok(micro('Verruca vulgaris').includes('Koilocytes with coarse keratohyaline granules are present in the upper epidermis. The findings are those of a verruca vulgaris. There is no evidence of dysplasia or malignancy.'));
  assert.ok(micro('Molluscum contagiosum').includes('(molluscum bodies) in the upper layers. The findings are those of molluscum contagiosum. There is no evidence of dysplasia or malignancy.'));
  assert.ok(micro('Neurofibroma').includes('wavy nuclei, set in a loose collagenous and myxoid stroma containing scattered mast cells. There is no cytological atypia or mitotic activity. The findings are those of a neurofibroma. There is no evidence of malignancy.'));
  assert.ok(micro('Haemangioma').includes('dilated, thin-walled vascular channels lined by bland flattened endothelial cells and filled with blood. There is no endothelial atypia. The findings are those of a haemangioma. There is no evidence of malignancy.'));
  assert.ok(micro('Keloid / hypertrophic scar').includes('thick, glassy, hyalinised collagen bundles and fibroblasts beneath a flattened epidermis, with loss of adnexal structures. The findings are those of a keloid / hypertrophic scar. There is no evidence of malignancy.'));
  assert.ok(micro('Xanthelasma').includes('aggregates of foamy histiocytes within the superficial dermis, around vessels and adnexal structures. There is no cytological atypia. The findings are those of a xanthelasma. There is no evidence of malignancy.'));
  assert.ok(micro('Chondrodermatitis nodularis helicis').includes('fibrinoid degeneration of collagen and granulation tissue extending to the underlying auricular cartilage, which shows degenerative change. The findings are those of chondrodermatitis nodularis helicis. There is no evidence of malignancy.'));
  assert.equal(micro('Actinic keratosis', { akGrade: 'KIN II' }), 'Sections show a piece of skin with parakeratosis and atypical keratinocytes showing nuclear enlargement and hyperchromasia confined to the lower two-thirds of the epidermis, with sparing of the adnexal ostia. The dermis shows solar elastosis. The findings are those of an actinic keratosis (KIN II). There is no evidence of invasive malignancy.');
  assert.ok(micro('Actinic keratosis', { akGrade: 'KIN III' }).includes('confined to the full thickness of the epidermis'));
  for (const s of [micro('Seborrhoeic keratosis'), micro('Dermatofibroma'), micro('Verruca vulgaris')]) assert.ok(/^Sections show/.test(s));
  const all = schema.fields.find((f) => f.id === 'lesionType').options.map((t) => micro(t)).join(' ');
  assert.ok(!/tumor|color|center|hemorrhage|seborrheic|nevus|hemangioma/.test(all), 'British spelling throughout');
});

test('naevus microscopy: mandatory maturation sentence, junctional, congenital and dysplastic variants', () => {
  const micro = (extra) => run(one({ lesionType: 'Melanocytic naevus', ...extra })).microscopy;
  assert.equal(micro({ naevusType: 'Intradermal' }), `Sections show a piece of skin with nests and cords of naevus cells confined to the dermis, without a junctional component. ${NAEVUS_BLAND} The findings are those of an intradermal melanocytic naevus. There is no evidence of malignancy.`);
  assert.equal(micro({ naevusType: 'Junctional' }), `Sections show a piece of skin with nests of naevus cells confined to the dermo-epidermal junction. ${NAEVUS_BLAND} The findings are those of a junctional melanocytic naevus. There is no evidence of malignancy.`);
  assert.equal(micro({ naevusType: 'Compound', congenitalPattern: true }), `Sections show a piece of skin with nests of naevus cells at the dermo-epidermal junction and within the dermis. Naevus cells extend around adnexal structures and neurovascular bundles in the deeper dermis, in keeping with a congenital pattern. ${NAEVUS_BLAND} The findings are those of a compound melanocytic naevus with congenital pattern. There is no evidence of malignancy.`);
  const dys = micro({ naevusType: 'Compound', dysplasticFeatures: 'Mild' });
  assert.ok(dys.includes('There is mild architectural disorder and mild random cytological atypia of the melanocytes. The melanocytes mature with depth and there is no mitotic activity. The findings are those of a compound melanocytic naevus with mild dysplastic features. There is no evidence of malignancy.'));
  assert.ok(!dys.includes('no cytological atypia'));
  assert.equal(NAEVUS_BLAND, 'The melanocytes mature with depth and there is no cytological atypia or mitotic activity.');
});

test('snippets: actinic keratosis at margin, naevus with atypia, malignant / atypical referral', () => {
  const ak = run(one({ specimenName: 'nose', lesionType: 'Actinic keratosis', marginStatus: 'Lesion extends to the edge of the shave' }));
  assert.equal(ak.comment, 'Actinic keratosis extends to the margin. Clinical follow-up of the site is recommended.');
  assert.deepEqual(flags([{ values: { lesionType: 'Actinic keratosis', marginStatus: 'Involves deep margin' } }]), ['akMargin']);
  assert.deepEqual(flags([{ values: { lesionType: 'Actinic keratosis', marginStatus: 'Completely excised' } }]), []);
  assert.deepEqual(flags([{ values: { lesionType: 'Seborrhoeic keratosis', marginStatus: 'Involves deep margin' } }]), []);
  assert.equal(run(one({ lesionType: 'Actinic keratosis', procedure: 'Excision, ellipse', marginStatus: 'Completely excised', closestMargin: '1' })).comment, '');

  const naevus = run(one({ lesionType: 'Melanocytic naevus', naevusType: 'Compound', dysplasticFeatures: 'Mild', procedure: 'Punch', marginStatus: 'Lesion extends to the lateral margin' }));
  assert.equal(naevus.comment, 'The melanocytic naevus shows mild dysplastic features. Complete excision is advised for further evaluation.');
  assert.equal(run(one({ lesionType: 'Melanocytic naevus', dysplasticFeatures: 'None' })).comment, '');

  const mal = run(one({ specimenName: 'left cheek', lesionType: 'Malignant / atypical – see comment', marginStatus: 'Involves deep margin' }));
  assert.equal(mal.diagnosis, 'SKIN, left cheek, shave - MALIGNANT / ATYPICAL LESION; see comment');
  assert.equal(mal.microscopy, 'Sections show an atypical proliferation with features suspicious for malignancy; see comment.');
  assert.ok(!mal.microscopy.includes('no evidence'));
  assert.ok(!mal.microscopy.includes('deep margin'));
  assert.equal(mal.comment, 'An atypical or malignant lesion is identified. This benign template does not grade or stage the lesion; the QMH skin cancer template should be used for the final synoptic report.');
  const c = createCase(schema, 2);
  c.parts[1].values.lesionType = 'Malignant / atypical – see comment';
  assert.ok(run(c).comment.includes('is identified (part B).'));
  assert.equal(run(one({ lesionType: 'Seborrhoeic keratosis' })).comment, '');
});

test('blank size, margin and site fields produce no dangling text', () => {
  const r = run(one({ specimenName: '', specimenSize: '', lesionSize: '', lesionDescription: [], closestMargin: '' }));
  assert.equal(r.specimens, 'Skin, shave');
  assert.equal(r.macro, 'Received in formalin is a shave of skin bearing a lesion. All embedded in 1 block.');
  assert.equal(r.blockKey, '(1) Shave, all embedded.');
  assert.equal(r.diagnosis, 'SKIN, shave - SEBORRHOEIC KERATOSIS');
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.report.includes('__'));
  assert.ok(!r.report.includes('measuring  '));
  assert.ok(!/\bcm\b/.test(r.macro));
  const ell = run(one({ procedure: 'Excision, ellipse', marginStatus: 'Completely excised', closestMargin: '' }));
  assert.ok(ell.microscopy.includes('The lesion is completely excised. There is no evidence'));
  assert.ok(ell.diagnosis.endsWith('; completely excised'));
  assert.ok(!ell.report.includes('mm'));
  const cur = run(one({ procedure: 'Curettings', specimenSize: '' }));
  assert.equal(cur.macro, 'Received in formalin are multiple fragments of skin (curettings). All embedded in 1 block.');
  assert.equal(run(one({ blocks: '' })).blockKey, '(1) Shave, all embedded.');
});

test('additional notes are appended after the negative closer', () => {
  const r = run(one({ additionalNotes: 'Solar elastosis is present in the adjacent dermis.' }));
  assert.ok(r.microscopy.endsWith('There is no evidence of dysplasia or malignancy. Solar elastosis is present in the adjacent dermis.'));
});
