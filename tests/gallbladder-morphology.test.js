// generators/gallbladder_morphology.js — per-type microscopic sentence pins (WHO 2019
// digestive tumours via Pathology Outlines and the biliary-tree textbook synopsis; British
// spelling; the engine normalises ² to "2 mm2"). Sentence changes are deliberate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MORPHOLOGY, typeMorphology } from '../generators/gallbladder_morphology.js';

test('pancreatobiliary-type adenocarcinoma sentence', () => {
  assert.equal(typeMorphology('Adenocarcinoma', ''), MORPHOLOGY['Adenocarcinoma, biliary type'](''));
  assert.ok(typeMorphology('Adenocarcinoma, biliary type', '').includes('Irregularly shaped, angulated glands and small cell clusters are set in desmoplastic stroma'));
});

test('intestinal / mucinous / clear-cell subtype sentences', () => {
  assert.ok(typeMorphology('Adenocarcinoma, intestinal type', '').includes('resembling colorectal adenocarcinoma (intestinal type)'));
  assert.ok(typeMorphology('Mucinous adenocarcinoma', '').includes('more than half of the tumour'));
  assert.ok(typeMorphology('Clear cell adenocarcinoma', '').includes('resembling renal cell carcinoma'));
});

test('poorly cohesive, signet-ring and adenosquamous sentences', () => {
  assert.ok(typeMorphology('Poorly cohesive carcinoma', '').includes('more than half of the tumour'));
  assert.ok(typeMorphology('Signet-ring cell carcinoma', '').startsWith('More than half of the tumour'));
  assert.ok(typeMorphology('Adenosquamous carcinoma', '').includes('WHO prescribes no minimum proportion'));
});

test('preinvasive-associated carcinoma sentences (MCN / ICPN / ICTN)', () => {
  assert.ok(typeMorphology('Mucinous cystic neoplasm with an associated invasive carcinoma', '').includes('ovarian-type subepithelial stroma'));
  assert.ok(typeMorphology('Intracholecystic papillary neoplasm with associated invasive carcinoma', '').includes('biliary, intestinal, gastric or oncocytic differentiation'));
  assert.ok(typeMorphology('Intracholecystic tubular neoplasm with associated invasive carcinoma', '').includes('squamoid morules'));
});

test('squamous, undifferentiated and neuroendocrine sentences', () => {
  assert.ok(typeMorphology('Squamous cell carcinoma', '').includes('keratin pearls and intercellular bridges'));
  assert.ok(typeMorphology('Undifferentiated carcinoma, NOS', '').includes('diagnosis is reached after exhaustive exclusion'));
  assert.ok(typeMorphology('Large cell neuroendocrine carcinoma', '').includes('20 mitoses per 2 mm²'));
  assert.ok(typeMorphology('Small cell neuroendocrine carcinoma', '').includes('crush artefact'));
  assert.ok(typeMorphology('Mixed neuroendocrine-non-neuroendocrine tumour (Mixed adenoneuroendocrine carcinoma) (specify components)', '').includes('more than 30%'));
});

test('unknown types contribute nothing', () => {
  assert.equal(typeMorphology('Carcinoma, type cannot be determined', ''), '');
  assert.equal(typeMorphology('', ''), '');
});
