// Phase 4b: skin lesion excision with margins (BCC / keratoacanthoma / benign lesions). Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/skinexcision.js';
import { sizePhrase, mmPhrase, closestMargin, marginBlock, marginClause } from '../generators/skinexcision.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('skin_excision');
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  Object.assign(c.options, options);
  return c;
};
const MARGINS = { marginScheme: gen.SCHEME_ANATOMICAL, marginSuperior: '1.5', marginInferior: '2.5', marginLateral: '3.5', marginMedial: '6', marginDeep: '2.5' };
const MARGIN_LINES = '- Superior: 1.5 mm\n- Inferior: 2.5 mm\n- Lateral: 3.5 mm\n- Medial: 6 mm\n- Deep: 2.5 mm';
const BCC_PARA = 'Sections show a piece of hair bearing skin with epidermis and dermis. A basaloid tumour is seen arising from the epidermis and infiltrating into the dermis, forming solid nodules with peripheral palisading. The cells display oval basophilic nuclei, prominent nucleoli, pink cytoplasm and indistinct cytoplasmic borders. Areas of central keratinisation are seen within the tumour. Mitoses are occasionally seen. The findings are those of nodular basal cell carcinoma, keratotic variant.';

test('metadata: skin lesion excision with search aliases and complete defaults', () => {
  assert.equal(schema.id, 'skin_excision');
  assert.equal(schema.generator, 'skinexcision');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.kindLabel, 'Excision / biopsy');
  assert.equal(schema.system, 'Skin');
  assert.equal(schema.name, 'Skin lesion excision');
  assert.equal(schema.label, 'Skin excision');
  assert.equal(schema.organ, 'SKIN');
  assert.equal(schema.rank, 30);
  assert.equal(schema.shortName, 'Skin · excision, incision, shave, punch, curettings');
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['BCC', 'basal cell carcinoma', 'keratoacanthoma', 'seborrhoeic keratosis', 'naevus', 'nevus', 'dermatofibroma', 'pyogenic granuloma', 'actinic keratosis', 'SCC in situ', 'Bowen', 'margins', 'ellipse', 'orientation suture']) assert.ok(schema.aliases.includes(a), a);
  assert.equal(schema.maxParts, 6, 'Phase 43: six, as multiple shaves or curettings come in one case');
  assert.equal(schema.defaultParts, 1);
  for (const f of schema.fields) assert.ok('default' in f, `${f.id} has a default`);
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const p of schema.example.parts) for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is a field`);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  assert.deepEqual(macroFields, ['ellipseSize', 'lesionSize', 'lesionAppearance', 'orientation', 'orientationOther', 'macroMargin', 'inking', 'blocks', 'blockScheme']);
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  assert.equal(schema.fields.find((f) => f.id === 'blocks').default, '3');
  assert.equal(schema.fields.find((f) => f.id === 'blockScheme').default, 'Ellipse serially sliced and all embedded');
  // 15 to Phase 39; Phase 40 added 26 benign lesions (tests/skin_excision_benign.test.js); Phase 43 added
  // four from the retired Skin lesion form (tests/skin_excision_procedures.test.js); Phase 72 added naevus
  // lipomatosus cutaneous superficialis (tests/skin_excision_site.test.js).
  assert.equal(schema.fields.find((f) => f.id === 'diagnosis').options.length, 46);
  assert.equal(schema.fields.find((f) => f.id === 'involvedMargins').type, 'multiselect');
});

test('helpers: sizes, mm, closest margin, margin block and clause', () => {
  assert.equal(sizePhrase('2.5x1.2x0.6'), '2.5 x 1.2 x 0.6 cm');
  assert.equal(sizePhrase(''), '');
  assert.equal(mmPhrase('1.5'), '1.5 mm');
  assert.equal(mmPhrase('6'), '6 mm');
  assert.equal(mmPhrase('2mm'), '2 mm');
  assert.equal(mmPhrase(''), '');
  assert.deepEqual(closestMargin(MARGINS), { mm: 1.5, names: ['Superior'] });
  assert.deepEqual(closestMargin({ marginSuperior: '2', marginDeep: '2' }), { mm: 2, names: ['Superior', 'Deep'] });
  assert.equal(closestMargin({}), null);
  assert.equal(marginBlock({ ...MARGINS, completeness: 'Complete' }), `Excision is complete and the margins are as follows:\n${MARGIN_LINES}`);
  assert.equal(marginBlock({ completeness: 'Complete' }), 'Excision is complete.');
  assert.equal(marginClause({ ...MARGINS, completeness: 'Complete' }), 'completely excised (closest margin 1.5 mm, superior)');
  assert.equal(marginClause({ completeness: 'Involved – which', involvedMargins: ['Deep'] }), 'involved at the deep margin');
  assert.equal(marginClause({ completeness: 'Involved – which', involvedMargins: ['Deep', 'Lateral'] }), 'involved at the deep and lateral margins');
  assert.equal(marginClause({ completeness: 'Close < 1 mm', marginDeep: '0.5' }), 'excised but close (closest margin 0.5 mm, deep)');
});

test('example: nodular BCC, keratotic variant, left cheek, margins in the house form', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Skin, left cheek nodule, excision');
  assert.equal(r.macro, "Received in formalin is an ellipse of skin measuring 2.5 x 1.2 x 0.6 cm bearing a nodule measuring 0.8 cm. A suture marks 12 o'clock, taken as superior. The lesion is 2 mm from the closest skin edge. The deep surface is inked. The ellipse is serially sliced and all embedded in 4 blocks.");
  assert.equal(r.blockKey, '(1) Tip A. (2-3) Lesion, cross-sections. (4) Tip B.');
  assert.equal(r.microscopy, `${BCC_PARA} There is no perineural invasion. Excision is complete and the margins are as follows:\n${MARGIN_LINES}`);
  assert.equal(r.diagnosis, 'SKIN, left cheek nodule, excision - NODULAR BASAL CELL CARCINOMA, keratotic variant; completely excised (closest margin 1.5 mm, superior)');
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('(A)'));
  assert.ok(!r.report.includes('undefined'));
});

test('macro and block key numbering; both disappear when options.macro is false', () => {
  assert.equal(run(one({ blocks: '3' })).blockKey, '(1) Tip A. (2) Lesion, cross-sections. (3) Tip B.');
  assert.equal(run(one({ blocks: '5' })).blockKey, '(1) Tip A. (2-4) Lesion, cross-sections. (5) Tip B.');
  assert.equal(run(one({ blocks: '2' })).blockKey, '(1-2) Lesion, cross-sections.');
  const rep = run(one({ blocks: '2', blockScheme: 'Representative sections' }));
  assert.equal(rep.blockKey, '(1-2) Lesion, representative sections.');
  assert.ok(rep.macro.endsWith('Representative sections in 2 blocks.'));
  const off = run(one({}, { macro: false }));
  assert.equal(off.macro, '');
  assert.equal(off.blockKey, '');
  assert.ok(!off.report.includes('Received in formalin'));
  assert.ok(!off.report.includes('Tip A'));
  assert.ok(off.report.startsWith('Skin, nodule, excision\n\nSections show'));
});

test('headers option labels the macro and block key blocks', () => {
  const r = run(one({}, { includeHeader: true }));
  assert.ok(r.report.includes('MACROSCOPIC DESCRIPTION:\nReceived in formalin is an ellipse of skin'));
  assert.ok(r.report.includes('BLOCK KEY:\n(1) Tip A. (2) Lesion, cross-sections. (3) Tip B.'));
});

test('two-part case keeps (A)/(B) prefixes on every block', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, specimenName: 'left cheek', ...MARGINS, keratotic: true };
  c.parts[1].values = { ...c.parts[1].values, specimenName: 'right forearm', clinicalLabel: 'lesion', diagnosis: 'Seborrhoeic keratosis', lesionAppearance: 'Plaque', blocks: '2' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Skin, left cheek nodule, excision\n(B) Skin, right forearm lesion, excision');
  assert.ok(r.macro.startsWith('(A) Received in formalin'));
  assert.ok(r.macro.includes('\n\n(B) Received in formalin is an ellipse of skin bearing a plaque.'));
  assert.equal(r.blockKey, '(A) (1) Tip A. (2) Lesion, cross-sections. (3) Tip B.\n(B) (1-2) Lesion, cross-sections.');
  assert.ok(r.microscopy.startsWith('(A) Sections show a piece of hair bearing skin'));
  assert.ok(r.microscopy.includes('\n\n(B) Sections show an acanthotic epidermis'));
  assert.equal(r.diagnosis, '(A) SKIN, left cheek nodule, excision - NODULAR BASAL CELL CARCINOMA, keratotic variant; completely excised (closest margin 1.5 mm, superior)\n(B) SKIN, right forearm lesion, excision - SEBORRHOEIC KERATOSIS; completely excised');
  for (const block of [r.specimens, r.macro, r.blockKey, r.microscopy, r.diagnosis]) assert.ok(block.includes('(A)') && block.includes('(B)'));
});

test('each diagnosis option yields the right capitalised diagnosis', () => {
  const dx = (diagnosis, extra = {}) => run(one({ specimenName: 'left cheek', diagnosis, ...extra })).diagnosis;
  const P = 'SKIN, left cheek nodule, excision - ';
  assert.equal(dx('Nodular basal cell carcinoma'), `${P}NODULAR BASAL CELL CARCINOMA; completely excised`);
  assert.equal(dx('Nodular basal cell carcinoma', { keratotic: true }), `${P}NODULAR BASAL CELL CARCINOMA, keratotic variant; completely excised`);
  assert.equal(dx('Superficial BCC'), `${P}SUPERFICIAL BASAL CELL CARCINOMA; completely excised`);
  assert.equal(dx('Infiltrative BCC'), `${P}INFILTRATIVE BASAL CELL CARCINOMA; completely excised`);
  assert.equal(dx('Micronodular BCC'), `${P}MICRONODULAR BASAL CELL CARCINOMA; completely excised`);
  assert.equal(dx('Keratoacanthoma'), `${P}KERATOACANTHOMA; completely excised`);
  assert.equal(dx('Seborrhoeic keratosis'), `${P}SEBORRHOEIC KERATOSIS; completely excised`);
  assert.equal(dx('Intradermal naevus'), `${P}INTRADERMAL NAEVUS; completely excised`);
  assert.equal(dx('Compound naevus'), `${P}COMPOUND NAEVUS; completely excised`);
  assert.equal(dx('Dermatofibroma'), `${P}DERMATOFIBROMA; completely excised`);
  assert.equal(dx('Pyogenic granuloma'), `${P}PYOGENIC GRANULOMA (LOBULAR CAPILLARY HAEMANGIOMA); completely excised`);
  assert.equal(dx('Actinic keratosis'), `${P}ACTINIC KERATOSIS; completely excised`);
  assert.equal(dx('Squamous cell carcinoma in situ (Bowen disease)'), `${P}SQUAMOUS CELL CARCINOMA IN SITU (BOWEN DISEASE); completely excised`);
  assert.equal(dx('Invasive SCC – see comment'), `${P}INVASIVE SQUAMOUS CELL CARCINOMA; see comment`);
  assert.equal(dx('Melanoma – see comment'), `${P}MELANOMA; see comment`);
  assert.equal(dx('Skin lesion, other'), `${P}SKIN LESION (see microscopic examination); completely excised`);
  assert.equal(dx('Benign, other'), `${P}BENIGN SKIN LESION (see microscopic examination); completely excised`);
  // keratotic flag is ignored outside BCC
  assert.equal(dx('Keratoacanthoma', { keratotic: true }), `${P}KERATOACANTHOMA; completely excised`);
});

test('BCC paragraph is the §4.9 house wording; keratotic sentence only when flagged', () => {
  const k = run(one({ keratotic: true, ...MARGINS })).microscopy;
  assert.ok(k.startsWith(BCC_PARA));
  const plain = run(one({ keratotic: false })).microscopy;
  assert.ok(!plain.includes('central keratinisation'));
  assert.ok(plain.includes('The findings are those of nodular basal cell carcinoma. There is no perineural invasion. Excision is complete.'));
  assert.ok(run(one({ diagnosis: 'Superficial BCC' })).microscopy.includes('Multiple buds and nests of basaloid cells with peripheral palisading arise from the undersurface of the epidermis'));
  assert.ok(run(one({ diagnosis: 'Infiltrative BCC', keratotic: true })).microscopy.includes('irregular, angulated strands and cords of cells with peripheral palisading, set in a fibrous stroma. The cells display oval basophilic nuclei, prominent nucleoli, pink cytoplasm and indistinct cytoplasmic borders. Areas of central keratinisation are seen within the tumour. Mitoses are occasionally seen. The findings are those of infiltrative basal cell carcinoma, keratotic variant.'));
  assert.ok(run(one({ diagnosis: 'Micronodular BCC' })).microscopy.includes('multiple small rounded nests of uniform size with peripheral palisading'));
});

test('benign lesion paragraphs close with the negative sentence before the margins', () => {
  const sk = run(one({ diagnosis: 'Seborrhoeic keratosis', ...MARGINS })).microscopy;
  assert.equal(sk, `Sections show an acanthotic epidermis with elongation of rete ridges and overlying papillomatosis forming a verrucous, exophytic configuration. The epidermis is composed of cytologically bland keratinocytes without significant nuclear atypia or dysplasia. The underlying dermis shows a mild superficial perivascular lymphocytic infiltrate. The features are those of a benign squamoproliferative lesion, suggestive of seborrhoeic keratosis. There is no evidence of dysplasia or malignancy. Excision is complete and the margins are as follows:\n${MARGIN_LINES}`);
  assert.ok(!sk.includes('perineural'));
  const ka = run(one({ diagnosis: 'Keratoacanthoma', ...MARGINS })).microscopy;
  assert.ok(ka.endsWith(`Overall features are consistent with keratoacanthoma. Excision is complete and the margins are as follows:\n${MARGIN_LINES}`));
  assert.ok(run(one({ diagnosis: 'Intradermal naevus' })).microscopy.includes('There is no junctional component. No atypical features are seen. The findings are those of an intradermal naevus. There is no evidence of malignancy. Excision is complete.'));
  assert.ok(run(one({ diagnosis: 'Compound naevus' })).microscopy.includes('nests of bland naevus cells at the dermo-epidermal junction and within the dermis'));
  assert.ok(run(one({ diagnosis: 'Dermatofibroma' })).microscopy.includes('entrapment of collagen bundles at the periphery. The overlying epidermis is acanthotic with basal hyperpigmentation. The findings are those of a dermatofibroma.'));
  assert.ok(run(one({ diagnosis: 'Pyogenic granuloma', ulceration: 'Present' })).microscopy.includes('The findings are those of a pyogenic granuloma (lobular capillary haemangioma). There is no evidence of malignancy. The overlying epidermis is ulcerated. Excision is complete.'));
  assert.ok(run(one({ diagnosis: 'Actinic keratosis' })).microscopy.includes('sparing of the adnexal ostia. The dermis shows solar elastosis. The findings are those of an actinic keratosis. There is no evidence of invasive malignancy.'));
  assert.ok(run(one({ diagnosis: 'Squamous cell carcinoma in situ (Bowen disease)' })).microscopy.includes('The basement membrane is intact and there is no evidence of invasion. The findings are those of squamous cell carcinoma in situ (Bowen disease). There is no perineural invasion.'));
});

test('involved and close margins: house sentences and diagnosis clauses', () => {
  const inv = run(one({ specimenName: 'left cheek', keratotic: true, ...MARGINS, marginDeep: 'involved', completeness: 'Involved – which', involvedMargins: ['Deep'] }));
  assert.equal(inv.diagnosis, 'SKIN, left cheek nodule, excision - NODULAR BASAL CELL CARCINOMA, keratotic variant; involved at the deep margin');
  assert.ok(inv.microscopy.includes('Excision is incomplete; the lesion involves the deep margin. The margins are as follows:\n- Superior: 1.5 mm\n- Inferior: 2.5 mm\n- Lateral: 3.5 mm\n- Medial: 6 mm\n- Deep: involved'));
  const two = run(one({ marginScheme: gen.SCHEME_ANATOMICAL, completeness: 'Involved – which', involvedMargins: ['Lateral', 'Deep'] }));
  assert.ok(two.microscopy.endsWith('Excision is incomplete; the lesion involves the lateral and deep margins.'));
  assert.ok(two.diagnosis.endsWith('; involved at the lateral and deep margins'));
  const none = run(one({ completeness: 'Involved – which', involvedMargins: [] }));
  assert.ok(none.diagnosis.endsWith('; margin involved'));
  const close = run(one({ specimenName: 'nose', ...MARGINS, marginDeep: '0.5', completeness: 'Close < 1 mm' }));
  assert.ok(close.microscopy.includes('Excision is complete but close (< 1 mm) and the margins are as follows:\n- Superior: 1.5 mm'));
  assert.ok(close.microscopy.endsWith('- Deep: 0.5 mm'));
  assert.equal(close.diagnosis, 'SKIN, nose nodule, excision - NODULAR BASAL CELL CARCINOMA; excised but close (closest margin 0.5 mm, deep)');
  const tie = run(one({ marginScheme: gen.SCHEME_ANATOMICAL, marginSuperior: '2', marginDeep: '2' }));
  assert.ok(tie.diagnosis.endsWith('; completely excised (closest margin 2 mm, superior and deep)'));
});

test('perineural invasion and ulceration', () => {
  const r = run(one({ specimenName: 'left cheek', diagnosis: 'Infiltrative BCC', pni: 'Present', ulceration: 'Present', ...MARGINS }));
  assert.ok(r.microscopy.includes('The findings are those of infiltrative basal cell carcinoma. The overlying epidermis is ulcerated. Perineural invasion is present. Excision is complete and the margins are as follows:'));
  assert.equal(r.diagnosis, 'SKIN, left cheek nodule, excision - INFILTRATIVE BASAL CELL CARCINOMA; perineural invasion present; completely excised (closest margin 1.5 mm, superior)');
});

test('macro variants: appearance, orientation, inking and margins', () => {
  const r = run(one({ ellipseSize: '3x1.5', lesionSize: '1', lesionAppearance: 'Ulcerated nodule', orientation: 'Other – describe', orientationOther: 'Long suture lateral', macroMargin: '3mm', inking: 'Margins inked (see block key)', blocks: '4' }));
  assert.equal(r.macro, 'Received in formalin is an ellipse of skin measuring 3 x 1.5 cm bearing an ulcerated nodule measuring 1 cm. The specimen is orientated: long suture lateral. The lesion is 3 mm from the closest skin edge. The margins are inked (see block key). The ellipse is serially sliced and all embedded in 4 blocks.');
  assert.ok(run(one({ lesionAppearance: 'Pigmented lesion', inking: 'Not inked' })).macro.includes('bearing a pigmented lesion. The specimen is not orientated. The ellipse is serially sliced'));
  assert.ok(run(one({ lesionAppearance: 'Ulcer' })).macro.includes('bearing an ulcer.'));
  assert.ok(run(one({ orientation: 'Other – describe', orientationOther: '' })).macro.includes('bearing a nodule. The deep surface is inked.'));
});

test('blank size, margin and site fields produce no dangling text', () => {
  const r = run(one({ specimenName: '', clinicalLabel: '', ellipseSize: '', lesionSize: '', macroMargin: '' }));
  assert.equal(r.specimens, 'Skin, excision');
  assert.equal(r.macro, 'Received in formalin is an ellipse of skin bearing a nodule. The specimen is not orientated. The deep surface is inked. The ellipse is serially sliced and all embedded in 3 blocks.');
  assert.ok(r.microscopy.endsWith('There is no perineural invasion. Excision is complete.'));
  assert.equal(r.diagnosis, 'SKIN, excision - NODULAR BASAL CELL CARCINOMA; completely excised');
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.report.includes('__'));
  assert.ok(!r.report.includes('measuring  '));
  assert.ok(!/\bcm\b/.test(r.macro));
  assert.ok(!r.microscopy.includes('as follows'));
  const partial = run(one({ marginDeep: '2' })).microscopy;
  assert.ok(partial.endsWith('Excision is complete and the margins are as follows:\n- Deep: 2 mm'));
});

test('invasive SCC and melanoma give a short line and the QMH skin cancer template comment', () => {
  const scc = run(one({ specimenName: 'left cheek', diagnosis: 'Invasive SCC – see comment', ...MARGINS }));
  assert.equal(scc.diagnosis, 'SKIN, left cheek nodule, excision - INVASIVE SQUAMOUS CELL CARCINOMA; see comment');
  assert.equal(scc.microscopy, 'Sections show an invasive squamous cell carcinoma arising from the epidermis and infiltrating the dermis; see comment.');
  assert.ok(!scc.microscopy.includes('margins are as follows'));
  assert.equal(scc.comment, 'An invasive skin cancer is identified. This template does not stage the lesion; the QMH skin cancer template should be used for the final synoptic report.');
  const mel = run(one({ diagnosis: 'Melanoma – see comment' }));
  assert.equal(mel.diagnosis, 'SKIN, nodule, excision - MELANOMA; see comment');
  assert.ok(mel.microscopy.includes('features of melanoma; see comment.'));
  assert.ok(mel.comment.includes('QMH skin cancer template'));
  assert.equal(run(one({ diagnosis: 'Nodular basal cell carcinoma' })).comment, '');
  const c = createCase(schema, 2);
  c.parts[1].values.diagnosis = 'Melanoma – see comment';
  assert.ok(run(c).comment.includes('is identified (part B).'));
});

test('additional notes are appended before the margin block', () => {
  const r = run(one({ additionalNotes: 'Solar elastosis is present in the adjacent dermis.', marginDeep: '3' }));
  assert.ok(r.microscopy.endsWith('There is no perineural invasion. Solar elastosis is present in the adjacent dermis. Excision is complete and the margins are as follows:\n- Deep: 3 mm'));
});
