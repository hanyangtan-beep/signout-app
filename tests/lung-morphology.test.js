// generators/lung_morphology.js — per-type microscopic sentence pins (WHO 5th ed thoracic
// tumours via Pathology Outlines and Nicholson et al., JTO 2022; sources and URLs are recorded
// in docs/reference/lung-morphology-sources.md). British spelling. Sentence changes are deliberate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MORPHOLOGY, PATTERN_MORPHOLOGY, patternMorphology, typeMorphology, STAS_SENTENCE } from '../generators/lung_morphology.js';

test('adenocarcinoma precursor and variant sentences', () => {
  assert.ok(typeMorphology('Adenocarcinoma in situ (AIS), non-mucinous', '').includes('purely along intact alveolar walls'));
  assert.ok(typeMorphology('Minimally invasive adenocarcinoma, non-mucinous', '').includes('small invasive focus of angulated glands in desmoplastic stroma'));
  assert.ok(typeMorphology('Invasive mucinous adenocarcinoma', '').includes('goblet and tall columnar cells with abundant intracytoplasmic mucin'));
  assert.ok(typeMorphology('Colloid adenocarcinoma', '').includes('Pools of extracellular mucin distend and destroy the alveolar spaces'));
  assert.ok(typeMorphology('Enteric-type adenocarcinoma', '').includes('resembling colorectal adenocarcinoma'));
});

test('the pattern-graded adenocarcinoma type contributes no type sentence', () => {
  assert.equal(typeMorphology('Invasive adenocarcinoma (non-mucinous; predominant pattern from the percentages)', ''), '');
});

test('squamous and large cell sentences', () => {
  assert.ok(typeMorphology('Squamous cell carcinoma in situ (SCIS)', '').includes('basement membrane is intact'));
  assert.ok(typeMorphology('Invasive squamous cell carcinoma, non-keratinising', '').includes('keratinisation, keratin pearls and intercellular bridges are not identified'));
  assert.ok(typeMorphology('Invasive squamous cell carcinoma, basaloid', '').includes('peripheral palisading'));
  assert.ok(typeMorphology('Large cell carcinoma', '').includes('no glandular, squamous or neuroendocrine differentiation'));
  assert.ok(typeMorphology('Adenosquamous carcinoma', '').includes('the squamous component showing keratinisation and intercellular bridges'));
});

test('sarcomatoid and undifferentiated sentences', () => {
  assert.ok(typeMorphology('Pleomorphic carcinoma', '').includes('malignant spindle cells and bizarre neoplastic giant cells'));
  assert.ok(typeMorphology('Giant cell carcinoma', '').includes('emperipolesis'));
  assert.ok(typeMorphology('Carcinosarcoma', '').includes('frankly sarcomatous spindle cell component'));
  assert.ok(typeMorphology('Pulmonary blastoma', '').includes('squamoid morules'));
  assert.ok(typeMorphology('NUT carcinoma', '').includes('abrupt foci of keratinisation'));
  assert.ok(typeMorphology('Thoracic SMARCA4-deficient undifferentiated tumour', '').includes('rhabdoid cells'));
});

test('salivary-gland type sentences', () => {
  assert.ok(typeMorphology('Adenoid cystic carcinoma', '').includes('cribriform and tubular structures'));
  assert.ok(typeMorphology('Epithelial-myoepithelial carcinoma', '').includes('outer layer of clear myoepithelial cells'));
});

test('neuroendocrine sentences', () => {
  assert.ok(typeMorphology('Typical carcinoid / neuroendocrine tumour, grade 1', '').includes('salt-and-pepper chromatin'));
  assert.ok(typeMorphology('Atypical carcinoid / neuroendocrine tumour, grade 2', '').includes('greater nuclear pleomorphism than a typical carcinoid'));
  assert.ok(typeMorphology('Small cell carcinoma', '').includes('marked nuclear moulding'));
  assert.ok(typeMorphology('Large cell neuroendocrine carcinoma', '').includes('geographic necrosis and brisk mitotic activity'));
  assert.ok(typeMorphology('Combined small cell carcinoma (specify the non-small cell component)', '').includes('morphologically distinct non-small cell component'));
});

test('grade-aware sentences differ between low and high grade', () => {
  const types = ['Fetal adenocarcinoma', 'Mucoepidermoid carcinoma', 'Invasive squamous cell carcinoma, keratinising'];
  for (const t of types) {
    const low = typeMorphology(t, 'G1: Well differentiated');
    const high = typeMorphology(t, 'G3: Poorly differentiated');
    assert.ok(low && high, `${t} should produce a sentence at both grades`);
    assert.notEqual(low, high, `${t} should read differently at low and high grade`);
  }
});

test('pattern sentences and STAS', () => {
  assert.ok(patternMorphology('lepidic').includes('intact alveolar walls'));
  assert.ok(patternMorphology('acinar').includes('round to oval malignant glands'));
  assert.ok(patternMorphology('papillary').includes('fibrovascular cores'));
  assert.ok(patternMorphology('micropapillary').includes('without fibrovascular cores'));
  assert.ok(patternMorphology('solid').includes('sheets of tumour cells without gland formation'));
  assert.ok(patternMorphology('complex glandular').includes('fused and cribriform'));
  assert.equal(patternMorphology('sarcomatoid'), '');
  assert.equal(patternMorphology(''), '');
  assert.ok(STAS_SENTENCE.includes('beyond the edge of the main tumour'));
});

test('every sentence ends in a full stop and avoids textbook rule language', () => {
  const all = [...Object.keys(MORPHOLOGY).map((k) => MORPHOLOGY[k]('')), ...Object.values(PATTERN_MORPHOLOGY).map((s) => `${s}.`), STAS_SENTENCE];
  for (const s of all) {
    if (!s) continue;
    assert.ok(s.endsWith('.'), `sentence should end in a full stop: ${s}`);
    assert.ok(!/\bWHO\b|by definition|at least \d+ ?%|requires? at least|is defined as|prognos|extremely rare/i.test(s), `report prose should not cite rules: ${s}`);
  }
});

test('every morphology key is a schema histologic type option', () => {
  const schema = JSON.parse(fs.readFileSync(new URL('../schemas/lung_carcinoma.json', import.meta.url), 'utf8'));
  const field = (schema.fields || []).find((f) => f.id === 'histType');
  assert.ok(field, 'lung schema should have a histType field');
  const options = new Set(field.options || []);
  for (const key of Object.keys(MORPHOLOGY)) {
    assert.ok(options.has(key), `MORPHOLOGY key is not a schema option: ${key}`);
  }
});

test('unknown types contribute nothing', () => {
  assert.equal(typeMorphology('Carcinoma, type cannot be determined', ''), '');
  assert.equal(typeMorphology('', ''), '');
  assert.equal(typeMorphology(undefined, ''), '');
});
