// generators/breast_morphology.js — per-type microscopic sentence pins (WHO 5th ed breast tumours
// via Pathology Outlines and fetched reviews; sources and URLs are recorded in
// docs/reference/breast-morphology-sources.md). British spelling. Sentence changes are deliberate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MORPHOLOGY, NST_PATTERN_MORPHOLOGY, ILC_VARIANT_MORPHOLOGY, DCIS_CYTOLOGY,
  DCIS_PATTERN_MORPHOLOGY, DCIS_TYPE_MORPHOLOGY, PHYLLODES_MORPHOLOGY,
  typeMorphology, detailMorphology, detailReplacesType,
  dcisCytology, dcisPatternMorphology, dcisTypeMorphology, phyllodesMorphology
} from '../generators/breast_morphology.js';

const NST = 'Invasive carcinoma of no special type (ductal)';

test('NST morphology follows the Nottingham grade', () => {
  assert.ok(typeMorphology(NST, 'grade 1').includes('well-formed tubules and glands'));
  assert.ok(typeMorphology(NST, 'grade 2').includes('nests, cords and irregular glands'));
  assert.ok(typeMorphology(NST, 'grade 3').includes('solid nests, sheets and cords'));
  assert.ok(typeMorphology(NST, '').includes('moderately pleomorphic nuclei'));
});

test('lobular sentences', () => {
  assert.ok(typeMorphology('Invasive lobular carcinoma, classic', '').includes('single files and cords'));
  assert.ok(typeMorphology('Invasive lobular carcinoma, classic', '').includes('targetoid pattern'));
  assert.ok(typeMorphology('Invasive lobular carcinoma, variant pattern', '').includes('lack polarity'));
});

test('special-type sentences', () => {
  assert.ok(typeMorphology('Tubular carcinoma, pure or greater than 90%', '').includes('apical cytoplasmic snouts'));
  assert.ok(typeMorphology('Invasive cribriform carcinoma, pure or greater than 90%', '').includes('sieve-like cribriform spaces'));
  assert.ok(typeMorphology('Mucinous carcinoma, pure or greater than 90%', '').includes('pools of extracellular mucin'));
  assert.ok(typeMorphology('Invasive micropapillary carcinoma, pure or greater than 90%', '').includes('reverse polarity'));
  assert.ok(typeMorphology('Invasive apocrine carcinoma', '').includes('granular eosinophilic cytoplasm'));
  assert.ok(typeMorphology('Invasive solid papillary carcinoma', '').includes('jigsaw-like contours'));
  assert.ok(typeMorphology('Adenoid cystic carcinoma, classic', '').includes('basement membrane material'));
  assert.ok(typeMorphology('Secretory carcinoma', '').includes('intraluminal and intracytoplasmic secretions'));
});

test('metaplastic sentences', () => {
  assert.ok(typeMorphology('Metaplastic carcinoma, spindle cell', '').includes('fascicles and a storiform pattern'));
  assert.ok(typeMorphology('Metaplastic carcinoma, with heterologous differentiation / matrix production', '').includes('chondroid and osseous matrix'));
  assert.ok(typeMorphology('Metaplastic carcinoma, squamous cell', '').includes('variable keratinisation'));
  assert.ok(typeMorphology('Metaplastic carcinoma, favorable type, low-grade adenosquamous', '').includes('luminal keratin debris'));
  assert.ok(typeMorphology('Metaplastic carcinoma, favorable type, low-grade fibromatosis-like', '').includes('interlacing fascicles'));
});

test('types that deliberately carry no morphology', () => {
  for (const t of [
    'No residual invasive carcinoma',
    'Invasive carcinoma, type cannot be determined',
    'Other (specify)',
    'Mixed histologic types (specify types and percentages)',
    'Metaplastic carcinoma, mixed (specify types and percentages)',
    'Metaplastic carcinoma, other type (specify)'
  ]) assert.equal(typeMorphology(t, 'grade 2'), '');
  assert.equal(typeMorphology('Not a real type', ''), '');
});

test('NST pattern and ILC variant sentences resolve from the typed detail', () => {
  const nstPattern = 'Invasive carcinoma of no special type (ductal) with specific morphologic pattern';
  assert.ok(detailMorphology(nstPattern, 'pleomorphic').includes('multinucleated giant tumour cells'));
  assert.ok(detailMorphology(nstPattern, 'osteoclast-like stromal giant cells').includes('haemosiderin deposition'));
  assert.ok(detailMorphology(nstPattern, 'choriocarcinomatous').includes('syncytiotrophoblast-like giant cells'));
  assert.equal(detailMorphology(nstPattern, ''), '');
  assert.equal(detailMorphology(nstPattern, 'unlisted pattern'), '');

  const ilc = 'Invasive lobular carcinoma, variant pattern';
  assert.ok(detailMorphology(ilc, 'solid').includes('solid sheets and large nests'));
  assert.ok(detailMorphology(ilc, 'alveolar').includes('rounded clusters and aggregates'));
  assert.ok(detailMorphology(ilc, 'tubulolobular').includes('round to angulated tubules'));
  assert.ok(detailMorphology(ilc, 'signet ring').includes('signet ring forms'));
  assert.equal(detailMorphology('Secretory carcinoma', 'solid'), '');
});

test('the medullary pattern replaces the generic NST sentence', () => {
  const nstPattern = 'Invasive carcinoma of no special type (ductal) with specific morphologic pattern';
  assert.ok(detailMorphology(nstPattern, 'medullary').includes('circumscribed pushing border'));
  assert.ok(detailMorphology(nstPattern, 'neuroendocrine').includes('neuroendocrine differentiation'));
  assert.equal(detailReplacesType(nstPattern, 'medullary'), true);
  assert.equal(detailReplacesType(nstPattern, 'pleomorphic'), false);
  assert.equal(detailReplacesType('Invasive lobular carcinoma, variant pattern', 'medullary'), false);
});

test('DCIS nuclear-grade cytology', () => {
  assert.ok(dcisCytology('low').includes('monotonous and round'));
  assert.ok(dcisCytology('intermediate').includes('mild to moderate variation'));
  assert.ok(dcisCytology('high').includes('markedly pleomorphic'));
  assert.equal(dcisCytology(''), '');
  assert.equal(dcisCytology('cannot be determined'), '');
});

test('DCIS architectural patterns join into one sentence', () => {
  assert.equal(dcisPatternMorphology(['Cribriform']), 'The cribriform areas show rigid punched-out lumina bridged by trabecular bars and Roman arches, lined by evenly spaced polarised cells.');
  const two = dcisPatternMorphology(['Cribriform', 'Solid']);
  assert.ok(two.startsWith('The cribriform areas'));
  assert.ok(two.includes(', and the solid areas show ducts filled by sheets of cohesive, evenly spaced cells.'));
  const three = dcisPatternMorphology(['Cribriform', 'Solid', 'Micropapillary']);
  assert.ok(three.includes('; and the micropapillary areas'));
  assert.ok(dcisPatternMorphology(['Paget disease (DCIS involving nipple skin)']).includes('nipple epidermis'));
  assert.equal(dcisPatternMorphology(['Other (specify)']), '');
  assert.equal(dcisPatternMorphology([]), '');
});

test('in situ types other than DCIS proper', () => {
  assert.ok(dcisTypeMorphology('Paget disease').includes('abundant pale cytoplasm'));
  assert.ok(dcisTypeMorphology('Encapsulated papillary carcinoma in situ').includes('thick fibrous capsule'));
  assert.ok(dcisTypeMorphology('Solid papillary carcinoma in situ').includes('cellular palisading'));
  assert.equal(dcisTypeMorphology('Ductal carcinoma in situ (DCIS)'), '');
});

test('phyllodes sentences by grade', () => {
  assert.ok(phyllodesMorphology('Phyllodes tumor, benign').includes('Subepithelial stromal condensation'));
  assert.ok(phyllodesMorphology('Phyllodes tumor, borderline').includes('periductal stromal expansion'));
  assert.ok(phyllodesMorphology('Phyllodes tumor, malignant').includes('resembling a sarcoma'));
  assert.equal(phyllodesMorphology('No tumor'), '');
  assert.equal(phyllodesMorphology(''), '');
});

test('every sentence is released-report prose (register rule)', () => {
  const all = [
    ...Object.values(MORPHOLOGY).map((f) => f('grade 2')),
    ...Object.values(NST_PATTERN_MORPHOLOGY),
    ...Object.values(ILC_VARIANT_MORPHOLOGY),
    ...Object.values(DCIS_CYTOLOGY),
    ...Object.values(DCIS_TYPE_MORPHOLOGY),
    ...Object.values(PHYLLODES_MORPHOLOGY),
    ...Object.values(DCIS_PATTERN_MORPHOLOGY)
  ].filter(Boolean);
  for (const s of all) {
    assert.doesNotMatch(s, /WHO|by definition|per 10|hpf|mm2|%|prognos|survival|should be|recommend|consider/i, `register: ${s}`);
    assert.doesNotMatch(s, /fibrosarcoma|tumor\b|color|hemosiderin|fibrous capsule of the tumor/, `British spelling: ${s}`);
  }
  // Type map entries end as sentences; the pattern clauses are joined by the resolver.
  for (const s of all.filter((x) => !Object.values(DCIS_PATTERN_MORPHOLOGY).includes(x))) {
    assert.ok(/\.$/.test(s), `full stop: ${s}`);
    assert.ok(/^[A-Z]/.test(s), `capitalised: ${s}`);
  }
});
