// generators/ovary_morphology.js — per-type microscopic sentence pins (WHO 5th ed female genital
// tumours via Pathology Outlines and the journal sources recorded in
// docs/reference/ovary-morphology-sources.md). British spelling. Sentence changes are deliberate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MORPHOLOGY, IMPLANT_MORPHOLOGY, typeMorphology, implantMorphology, STIC_SENTENCE } from '../generators/ovary_morphology.js';

test('serous sentences', () => {
  assert.ok(typeMorphology('Serous borderline tumour', '').includes('hierarchical branching'));
  assert.ok(typeMorphology('Serous borderline tumour, micropapillary / cribriform variant', '').includes('labyrinthine spaces'));
  assert.ok(typeMorphology('Serous borderline tumour with microinvasion', '').includes('hypereosinophilic cytoplasm'));
  assert.ok(typeMorphology('Microinvasive low-grade serous carcinoma', '').includes('inverted micropapillae'));
  assert.ok(typeMorphology('Low-grade serous carcinoma', '').includes('psammoma bodies are numerous'));
  assert.ok(typeMorphology('High-grade serous carcinoma', '').includes('slit-like spaces'));
});

test('mucinous sentences', () => {
  assert.ok(typeMorphology('Mucinous borderline tumour', '').includes('goblet cells'));
  assert.ok(typeMorphology('Mucinous borderline tumour with intraepithelial carcinoma', '').includes('confined to the epithelium'));
  assert.ok(typeMorphology('Mucinous borderline tumour with microinvasion', '').includes('less than 5 mm'));
  assert.ok(typeMorphology('Mucinous adenocarcinoma', '').includes('Luminal necrotic debris'));
});

test('endometrioid, seromucinous and clear cell sentences', () => {
  assert.ok(typeMorphology('Endometrioid borderline tumour', '').includes('Squamous morular metaplasia is present'));
  assert.ok(typeMorphology('Endometrioid carcinoma', '').includes('back-to-back endometrioid glands'));
  assert.ok(typeMorphology('Endometrioid carcinoma, seromucinous type', '').includes('fibro-oedematous papillae'));
  assert.ok(typeMorphology('Seromucinous borderline tumour', '').includes('neutrophils and eosinophils'));
  assert.ok(typeMorphology('Clear cell borderline tumour', '').includes('adenofibromatous'));
  assert.ok(typeMorphology('Clear cell carcinoma', '').includes('hobnail forms'));
});

test('Brenner and other carcinoma sentences', () => {
  assert.ok(typeMorphology('Borderline Brenner tumour', '').includes('longitudinally grooved nuclei'));
  assert.ok(typeMorphology('Malignant Brenner tumour', '').includes('desmoplastic response'));
  assert.ok(typeMorphology('Mesonephric-like adenocarcinoma', '').includes('dense eosinophilic intraluminal secretions'));
  assert.ok(typeMorphology('Small cell carcinoma, hypercalcaemic type', '').includes('follicle-like spaces'));
  assert.ok(typeMorphology('Dedifferentiated carcinoma', '').includes('abrupt, sharply demarcated transition'));
  assert.ok(typeMorphology('Undifferentiated carcinoma, NOS', '').includes('diffuse, patternless sheets'));
  assert.ok(typeMorphology('Carcinosarcoma (malignant mixed Mullerian tumour)', '').includes('intracytoplasmic hyaline globules'));
});

test('mesenchymal sentences', () => {
  assert.ok(typeMorphology('Endometrioid stromal sarcoma, low-grade', '').includes('whorling around abundant delicate arteriolar-type vessels'));
  assert.ok(typeMorphology('Endometrioid stromal sarcoma, high-grade', '').includes('arborising curvilinear vessels'));
  assert.ok(typeMorphology('Adenosarcoma', '').includes('Periglandular cuffs'));
  assert.ok(typeMorphology('Leiomyosarcoma', '').includes('coagulative tumour cell necrosis'));
  assert.ok(typeMorphology('Fibrosarcoma', '').includes('herringbone architecture'));
});

test('sex cord-stromal sentences, including the graded Sertoli-Leydig closure', () => {
  assert.ok(typeMorphology('Granulosa cell tumour, adult type', '').includes('Call-Exner bodies'));
  assert.ok(typeMorphology('Granulosa cell tumour, juvenile type', '').includes('without nuclear grooves'));
  assert.ok(typeMorphology('Steroid cell tumour, NOS', '').includes('Reinke crystals are not identified'));
  assert.ok(typeMorphology('Steroid cell tumour, malignant', '').includes('intratumoral haemorrhage'));
  assert.ok(typeMorphology('Other sex cord-stromal tumour (specify type)', '').includes('basement membrane-like material'));

  const g1 = typeMorphology('Sertoli-Leydig cell tumour', 'G1: Well differentiated');
  const g2 = typeMorphology('Sertoli-Leydig cell tumour', 'G2: Moderately differentiated');
  const g3 = typeMorphology('Sertoli-Leydig cell tumour', 'G3: Poorly differentiated');
  assert.ok(g1.includes('Reinke crystals'));
  assert.ok(g2.includes('alternating hypocellular and hypercellular areas'));
  assert.ok(g3.includes('sarcomatoid sheets'));
  assert.notEqual(g1, g2);
  assert.notEqual(g2, g3);
  // An unset or GX grade falls through to the moderately differentiated wording.
  assert.equal(typeMorphology('Sertoli-Leydig cell tumour', ''), g2);
  assert.equal(typeMorphology('Sertoli-Leydig cell tumour', 'GX: Cannot be assessed'), g2);
});

test('germ cell sentences', () => {
  assert.ok(typeMorphology('Immature teratoma', '').includes('primitive tubules, rosettes and pseudorosettes'));
  assert.ok(typeMorphology('Teratoma with malignant transformation (specify type)', '').includes('confluent somatic malignancy'));
  assert.ok(typeMorphology('Malignant struma ovarii (specify type)', '').includes('optically clear chromatin'));
  assert.ok(typeMorphology('Dysgerminoma', '').includes('squared-off contours'));
  assert.ok(typeMorphology('Yolk sac tumour', '').includes('Schiller-Duval bodies'));
  assert.ok(typeMorphology('Embryonal carcinoma', '').includes('syncytiotrophoblast-like cells'));
  assert.ok(typeMorphology('Gonadoblastoma', '').includes('mulberry-like concretions'));
  assert.ok(typeMorphology('Choriocarcinoma, non-gestational type', '').includes('around central blood channels'));
  assert.ok(typeMorphology('Mixed malignant germ cell tumour (specify types and percentages)', '').includes('abrupt interface'));
});

test('miscellaneous sentences', () => {
  assert.ok(typeMorphology('Gastrointestinal stromal tumour', '').includes('perinuclear vacuolisation'));
  assert.ok(typeMorphology('Solitary fibrous tumour, malignant', '').includes('staghorn vessels'));
  assert.ok(typeMorphology('Desmoplastic small round cell tumour', '').includes('peripheral palisading'));
});

test('STIC and peritoneal implant sentences', () => {
  assert.ok(STIC_SENTENCE.includes('epithelial fractures'));
  assert.ok(STIC_SENTENCE.includes('without stromal invasion'));
  assert.ok(implantMorphology('Present, non-invasive epithelial (specify site)').includes('without supporting stroma'));
  assert.ok(implantMorphology('Present, non-invasive desmoplastic (specify site)').includes('granulation tissue-like fibroblastic stroma'));
  assert.equal(implantMorphology('Not identified'), '');
  assert.equal(implantMorphology(''), '');
});

test('unknown and deliberately unmapped types return an empty string', () => {
  assert.equal(typeMorphology('Carcinoma, subtype cannot be determined', ''), '');
  assert.equal(typeMorphology('Other (specify)', ''), '');
  assert.equal(typeMorphology('Nonsense tumour', ''), '');
  assert.equal(typeMorphology('', ''), '');
  assert.equal(typeMorphology(undefined, undefined), '');
});

test('every MORPHOLOGY key is a histType option in the schema', () => {
  const schema = JSON.parse(fs.readFileSync(new URL('../schemas/ovary_ft_peritoneum.json', import.meta.url), 'utf8'));
  const options = schema.fields.find((f) => f.id === 'histType').options;
  for (const key of Object.keys(MORPHOLOGY)) {
    assert.ok(options.includes(key), `MORPHOLOGY key is not a schema option: ${key}`);
  }
  // Only these two options are deliberately left without morphology.
  const missing = options.filter((o) => !(o in MORPHOLOGY));
  assert.deepEqual(missing, ['Carcinoma, subtype cannot be determined', 'Other (specify)']);
});

test('every sentence is released-report prose, not textbook rule text', () => {
  const RULE = /\bWHO\b|by definition|at least \d+ ?%|requires? at least|is defined as|prognos|extremely rare|the page does not/i;
  const all = [
    ...Object.keys(MORPHOLOGY).flatMap((k) => {
      const e = MORPHOLOGY[k];
      return typeof e === 'function'
        ? ['G1: Well differentiated', 'G2: Moderately differentiated', 'G3: Poorly differentiated'].map((g) => [`${k} (${g})`, e(g)])
        : [[k, e]];
    }),
    ...Object.entries(IMPLANT_MORPHOLOGY),
    ['STIC_SENTENCE', STIC_SENTENCE],
  ];
  for (const [key, text] of all) {
    assert.ok(text.length > 80, `sentence too short for ${key}`);
    assert.ok(/\.$/.test(text), `sentence does not end in a full stop: ${key}`);
    assert.ok(!RULE.test(text), `rule language in the printed sentence for ${key}: ${text}`);
    assert.ok(!/\btumor\b|\bfibrous tissue color\b/i.test(text), `American spelling in ${key}`);
  }
});
