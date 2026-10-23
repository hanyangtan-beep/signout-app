// Trailing negatives (user request, 2026-10-11; Phase 66). Spec: docs/specs/trailing-negatives.md.
// A named benign diagnosis stands alone; when there is nothing to name, the negative is the diagnosis;
// the microscopy keeps its single closing negative. Specific negatives stay: the invasion answer, borderline
// features, node status and the dysplasia status of columnar mucosa. Cervical condyloma prints as LSIL.
// Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';

const registry = await loadAll();
const render = (id, ...partValues) => {
  const t = registry[id];
  const c = createCase(t.schema, partValues.length || 1);
  partValues.forEach((values, i) => { c.parts[i].values = { ...c.parts[i].values, ...values }; });
  return generate(t.schema, t.generator, c);
};
const body = (id, values = {}) => render(id, values).diagnosis.replace(/^.*? - /, '');
const option = (id, field, re) => registry[id].schema.fields.find((f) => f.id === field).options.find((o) => re.test(o));
const TAIL = /;\s*(no evidence of (dysplasia or )?malignancy|NO EVIDENCE OF MALIGNANCY|no malignancy identified|cervix with no evidence)/;

const TEMPLATES = ['appendix', 'gallbladder', 'jaw_cyst', 'stoma', 'thyroid_benign', 'tonsils', 'nasal_polyps', 'duodenal_biopsy',
  'oesophageal_biopsy', 'uterus_benign', 'abscess_granulation', 'ovarian_cyst', 'skin_cyst', 'lung_biopsy', 'nasopharyngeal_biopsy',
  'breast_excision', 'soft_tissue_benign', 'bone_joint', 'cns_biopsy', 'liver_lesion_biopsy', 'turbt', 'salivary_benign',
  'testis_benign', 'cervical_biopsy'];

test('a named benign diagnosis stands alone', () => {
  const cases = [
    ['appendix', {}, 'ACUTE SUPPURATIVE APPENDICITIS'],
    ['gallbladder', {}, 'CHRONIC CHOLECYSTITIS'],
    ['jaw_cyst', {}, 'RADICULAR CYST'],
    ['jaw_cyst', { cystType: 'Periapical granuloma (no lining)' }, 'PERIAPICAL GRANULOMA; no epithelial lining identified'],
    ['stoma', {}, 'ILEOSTOMY with REACTIVE AND PROLAPSE-TYPE CHANGES'],
    ['thyroid_benign', { diagnosis: 'Follicular adenoma' }, 'FOLLICULAR ADENOMA'],
    ['tonsils', {}, 'REACTIVE FOLLICULAR LYMPHOID HYPERPLASIA'],
    ['nasal_polyps', {}, 'INFLAMMATORY (OEDEMATOUS) SINONASAL POLYPS'],
    ['oesophageal_biopsy', {}, 'SQUAMOUS MUCOSA with NO SIGNIFICANT HISTOLOGICAL ABNORMALITY'],
    // Phase 74 (23 October 2026), deliberate: the leiomyoma no longer opens Present, so it is recorded here.
    ['uterus_benign', { leiomyoma: 'Present' }, 'LEIOMYOMAS; proliferative endometrium'],
    ['uterus_benign', { leiomyoma: 'Present', cervix: 'Chronic cervicitis' }, 'LEIOMYOMAS; proliferative endometrium; chronic cervicitis'],
    ['uterus_benign', { leiomyoma: 'Present', cervix: 'LSIL' }, 'LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL), cervix; LEIOMYOMAS; proliferative endometrium'],
    ['uterus_benign', {}, 'PROLIFERATIVE ENDOMETRIUM'],
    ['abscess_granulation', { diagnosis: 'Granulation tissue' }, 'GRANULATION TISSUE'],
    ['ovarian_cyst', { cystType: 'Fibroma' }, 'FIBROMA'],
    ['lung_biopsy', {}, 'BRONCHIAL MUCOSA with NO SIGNIFICANT ABNORMALITY'],
    ['lung_biopsy', { granuloma: 'Non-necrotising granulomas' }, 'NON-NECROTISING GRANULOMATOUS INFLAMMATION'],
    ['nasopharyngeal_biopsy', {}, 'REACTIVE LYMPHOID HYPERPLASIA'],
    ['breast_excision', { result: 'Fat necrosis' }, 'FAT NECROSIS'],
    ['soft_tissue_benign', { diagnosis: 'Fat necrosis' }, 'FAT NECROSIS'],
    ['bone_joint', { diagnosis: 'Fracture' }, 'RECENT FRACTURE'],
    ['cns_biopsy', { finding: option('cns_biopsy', 'finding', /^Demyelinat/) }, 'DEMYELINATING LESION'],
    ['liver_lesion_biopsy', { dx: 'Abscess' }, 'ABSCESS'],
    ['turbt', { siteType: 'Tumour base, resection', cystitis: 'Follicular cystitis' }, 'FOLLICULAR CYSTITIS'],
    ['salivary_benign', { lesion: 'Chronic sialadenitis' }, 'CHRONIC SIALADENITIS'],
    ['testis_benign', { prepuceDx: 'Chronic inflammation' }, 'CHRONIC INFLAMMATION'],
    ['testis_benign', { specimen: 'Orchidectomy', orchidDx: 'Atrophy' }, 'TESTICULAR ATROPHY'],
    ['cervical_biopsy', { benign: 'Endocervical polyp' }, 'ENDOCERVICAL POLYP']
  ];
  for (const [id, values, want] of cases) assert.equal(body(id, values), want, `${id} ${JSON.stringify(values)}`);
});

test('with nothing to name, the negative is the diagnosis', () => {
  assert.equal(body('tonsils', { specimenName: option('tonsils', 'specimenName', /biopsy/i) }), 'NO EVIDENCE OF MALIGNANCY');
  assert.equal(body('turbt', { siteType: 'Random bladder biopsies', cystitis: 'None' }), 'NO EVIDENCE OF DYSPLASIA OR MALIGNANCY');
  assert.equal(body('testis_benign', { prepuceDx: 'No specific abnormality' }), 'NO EVIDENCE OF MALIGNANCY');
  assert.equal(body('breast_excision'), 'NO EVIDENCE OF MALIGNANCY');
  assert.equal(body('cervical_biopsy'), 'NO EVIDENCE OF SQUAMOUS INTRAEPITHELIAL LESION OR MALIGNANCY');
});

test('specific negatives stay', () => {
  assert.equal(body('lung_biopsy', { benign: 'Squamous metaplasia', squamousDysplasia: 'Low grade' }), 'SQUAMOUS METAPLASIA with LOW GRADE DYSPLASIA; no evidence of malignancy');
  const cis = option('lung_biopsy', 'squamousDysplasia', /situ|high/i);
  assert.equal(body('lung_biopsy', { benign: 'Squamous metaplasia', squamousDysplasia: cis }), 'SQUAMOUS CELL CARCINOMA IN SITU; no evidence of invasive malignancy');
  assert.equal(body('oesophageal_biopsy', { mucosa: 'Columnar' }), 'COLUMNAR (CARDIAC-TYPE) MUCOSA WITHOUT INTESTINAL METAPLASIA; no evidence of dysplasia or malignancy');
  assert.equal(body('ovarian_cyst', { cystType: 'Serous cystadenoma' }), 'SEROUS CYSTADENOMA; no evidence of borderline features or malignancy');
  assert.match(body('thyroid_benign', { diagnosis: option('thyroid_benign', 'diagnosis', /^Non-invasive/) }), /; no capsular or vascular invasion identified$/);
  assert.equal(body('cns_biopsy', { finding: option('cns_biopsy', 'finding', /^Gliosis/) }), 'REACTIVE GLIOSIS; no tumour identified');
  assert.equal(body('cervical_biopsy', { benign: 'Chronic cervicitis' }), 'CHRONIC CERVICITIS; no evidence of dysplasia or malignancy');
});

test('cervical condyloma prints as LSIL, with the high grade negative in the microscopy', () => {
  const r = render('cervical_biopsy', { benign: 'Condyloma acuminatum' });
  assert.equal(r.diagnosis.replace(/^.*? - /, ''), 'LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL / CONDYLOMA ACUMINATUM)');
  assert.ok(r.microscopy.trim().endsWith('There is no evidence of high grade squamous intraepithelial lesion or malignancy.'), r.microscopy);
  assert.equal(body('cervical_biopsy', { benign: 'Condyloma acuminatum', squamous: 'LSIL (CIN I)' }), 'LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL / CIN I AND CONDYLOMA ACUMINATUM)');
  assert.equal(body('cervical_biopsy', { benign: 'Condyloma acuminatum', squamous: 'HSIL (CIN III)' }),
    'HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (HSIL / CIN III); LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL / CONDYLOMA ACUMINATUM)');
  const summary = (...parts) => render('cervical_biopsy', ...parts).diagnosis.split('\n').find((l) => l.startsWith('SUMMARY'));
  assert.equal(summary({ benign: 'Condyloma acuminatum' }, {}), 'SUMMARY: Highest grade squamous lesion LSIL (condyloma acuminatum) in part A.');
  assert.equal(summary({ squamous: 'LSIL (CIN I)' }, { benign: 'Condyloma acuminatum' }), 'SUMMARY: Highest grade squamous lesion LSIL (CIN I and condyloma acuminatum) in parts A and B.');
  assert.equal(summary({ squamous: 'LSIL (CIN I)' }, {}), 'SUMMARY: Highest grade squamous lesion LSIL (CIN I) in part A.');
});

test('the microscopy keeps its closing negative sentence', () => {
  assert.ok(render('soft_tissue_benign', { diagnosis: 'Fat necrosis' }).microscopy.trim().endsWith('There is no evidence of malignancy.'));
  assert.ok(render('thyroid_benign').microscopy.includes('There is no evidence of malignancy.'));
});

test('no default diagnosis line ends a named entity with a generic negative', () => {
  for (const id of TEMPLATES) assert.ok(!TAIL.test(render(id).diagnosis), `${id}: ${render(id).diagnosis}`);
});
