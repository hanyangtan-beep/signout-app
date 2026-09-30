// Breast core biopsy - papillary lesions. Card: docs/roadmap.md "Breast biopsy — papillary lesions" (pulled by the
// user 2026-09-30); grounding docs/reference/breast-papillary-lesions.md. Wording is deliberate; update the strings
// only on purpose. Fixtures: tests/fixtures/breast_biopsy/*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible, optionsFor, linkedDefault, normalisePart } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { bCode, papillaryCode, papInvasive, PAP } from '../generators/breast.js';

const registry = await loadAll();
const t = registry.breast_biopsy;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const FIX = path.join(here, 'fixtures', 'breast_biopsy');
const UPDATE = process.argv.includes('--update');
const field = (id) => schema.fields.find((f) => f.id === id);
const one = (values) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, laterality: 'Left', specimenName: "2 o'clock", category: 'Papillary', ...values };
  return c;
};
const run = (values) => generate(schema, t.generator, one(values));
const values = (v) => one(v).parts[0].values;
const visible = (v) => schema.fields.filter((f) => isVisible(f, values(v))).map((f) => f.id);
const checksOf = (r) => r.issues.map((i) => [i.level, i.field]);
const HEAD = "BREAST, left 2 o'clock, core biopsy - ";
const CORES = 'Sections show three cores of breast tissue';
const INVADED = { papLesion: PAP.EPC, papInvasion: 'Present', papInvSeen: ['Irregular infiltrative margin', 'Desmoplastic stroma'] };

// ---------- schema ----------

test('the Papillary lesion category sits before the lymph node, and its fields follow the invasive type', () => {
  const cat = field('category');
  assert.deepEqual(cat.options.slice(-2), ['Papillary', 'LN']);
  assert.equal(cat.optionLabels.Papillary, 'Papillary lesion');
  const ids = schema.fields.map((f) => f.id);
  const block = ['papLesion', 'papWithinCore', 'papUdh', 'papGrade', 'papMecCores', 'papMecEdge', 'papCk56', 'papEr', 'papNe',
    'papNeMarkers', 'papInvasion', 'papSuspect', 'papInvSeen', 'papInvType', 'papInvOther'];
  assert.deepEqual(ids.slice(ids.indexOf('invOther') + 1, ids.indexOf('invOther') + 1 + block.length), block);
  assert.equal(ids.indexOf('b3Advice'), ids.indexOf('lvi') + 1, 'the B3 recommendation follows the grading fields');
  assert.deepEqual(field('papLesion').options, Object.values(PAP));
  assert.equal(field('b3Lesion').optionLabels['Intraduct papilloma'], 'Intraductal papilloma');
  assert.ok(!schema.example.parts?.some?.((p) => p.values?.category === 'Papillary'), 'the example case is unchanged');
});

test('B code: the lesion decides, invasion decides for encapsulated and solid papillary carcinoma, an override wins', () => {
  const code = (v) => bCode({ values: { category: 'Papillary', ...v } });
  assert.equal(code({ papLesion: PAP.IP }), 'B3');
  assert.equal(code({ papLesion: PAP.IP, papWithinCore: true }), 'B2');
  assert.equal(code({ papLesion: PAP.SUG }), 'B3');
  assert.equal(code({ papLesion: PAP.ADH }), 'B3');
  assert.equal(code({ papLesion: PAP.ADH, papWithinCore: true }), 'B3', 'the B2 box counts only for a papilloma without atypia');
  assert.equal(code({ papLesion: PAP.DCIS_IN }), 'B5a');
  assert.equal(code({ papLesion: PAP.PDCIS }), 'B5a');
  for (const lesion of [PAP.EPC, PAP.SPC]) {
    assert.equal(code({ papLesion: lesion }), 'B5a');
    assert.equal(code({ papLesion: lesion, papInvasion: 'Not identified' }), 'B5a');
    assert.equal(code({ papLesion: lesion, papInvasion: 'Suspicious, not definite' }), 'B5a');
    assert.equal(code({ papLesion: lesion, papInvasion: 'Present' }), 'B5b');
    assert.equal(code({ papLesion: lesion, papInvasion: 'Not assessable' }), 'B5c');
  }
  assert.equal(code({ papLesion: PAP.IPC }), 'B5b');
  assert.equal(code({ papLesion: PAP.IPC, papInvasion: 'Not assessable' }), 'B5b', 'a hidden invasion pick is ignored');
  assert.equal(code({ papLesion: PAP.IP, papInvasion: 'Present' }), 'B3', 'a hidden invasion pick is ignored');
  assert.equal(code({ papLesion: PAP.EPC, bOverride: 'B5b' }), 'B5b');
  assert.equal(code({ papLesion: PAP.EPC, bOverride: 'Auto' }), 'B5a');
  assert.equal(papillaryCode({}), 'B3', 'the default lesion is an intraductal papilloma');
  assert.equal(papInvasive({ papLesion: PAP.SPC, papInvasion: 'Present' }), true);
  assert.equal(papInvasive({ papLesion: PAP.SPC, papInvasion: 'Suspicious, not definite' }), false);
});

test('visibility: each lesion shows its own fields, and the grading fields serve an invasive component', () => {
  const pap = ['papWithinCore', 'papUdh', 'papGrade', 'papMecCores', 'papMecEdge', 'papCk56', 'papEr', 'papNe', 'papNeMarkers',
    'papInvasion', 'papSuspect', 'papInvSeen', 'papInvType', 'papInvOther', 'tubules', 'nuclear', 'mitoses', 'invExtentMm', 'lvi', 'b3Advice'];
  const shown = (v) => visible(v).filter((id) => pap.includes(id));
  const stains = ['papMecCores', 'papMecEdge', 'papCk56', 'papEr'];
  assert.deepEqual(shown({ papLesion: PAP.IP }), ['papWithinCore', 'papUdh', ...stains, 'b3Advice']);
  assert.deepEqual(shown({ papLesion: PAP.IP, papWithinCore: true }), ['papWithinCore', 'papUdh', ...stains]);
  assert.deepEqual(shown({ papLesion: PAP.SUG }), [...stains, 'b3Advice']);
  assert.deepEqual(shown({ papLesion: PAP.ADH }), [...stains, 'b3Advice']);
  assert.deepEqual(shown({ papLesion: PAP.DCIS_IN }), ['papGrade', ...stains]);
  assert.deepEqual(shown({ papLesion: PAP.PDCIS }), ['papGrade', ...stains]);
  assert.deepEqual(shown({ papLesion: PAP.EPC }), ['papGrade', ...stains, 'papInvasion']);
  assert.deepEqual(shown({ papLesion: PAP.EPC, papInvasion: 'Suspicious, not definite' }), ['papGrade', ...stains, 'papInvasion', 'papSuspect']);
  assert.deepEqual(shown({ ...INVADED }), ['papGrade', ...stains, 'papInvasion', 'papInvSeen', 'papInvType', 'tubules', 'nuclear', 'mitoses', 'invExtentMm', 'lvi']);
  assert.ok(shown({ ...INVADED, papInvType: 'Other' }).includes('papInvOther'));
  assert.deepEqual(shown({ papLesion: PAP.EPC, papInvasion: 'Not assessable' }), ['papGrade', ...stains, 'papInvasion']);
  assert.deepEqual(shown({ papLesion: PAP.SPC }), ['papGrade', ...stains, 'papNe', 'papInvasion']);
  assert.ok(shown({ papLesion: PAP.SPC, papNe: 'Positive' }).includes('papNeMarkers'));
  assert.ok(shown({ papLesion: PAP.SPC, papNe: 'Negative' }).includes('papNeMarkers'));
  assert.deepEqual(shown({ papLesion: PAP.IPC }), ['tubules', 'nuclear', 'mitoses', 'invExtentMm', 'lvi']);
  // The other categories are untouched.
  const other = (v) => visible({ category: 'B3', ...v }).filter((id) => pap.includes(id) || id === 'papLesion');
  assert.deepEqual(other({}), ['b3Advice']);
  assert.deepEqual(visible({ category: 'B5b' }).filter((id) => pap.includes(id) || id === 'papLesion'), ['tubules', 'nuclear', 'mitoses', 'invExtentMm', 'lvi']);
  assert.ok(!visible({ category: 'B2' }).some((id) => id.startsWith('pap')));
});

test('options follow the lesion: no "atypical areas" without atypia, no solid papillary component for EPC', () => {
  const cores = field('papMecCores');
  assert.deepEqual(optionsFor(cores, { papLesion: PAP.IP }), ['Not stained', 'Present', 'Absent']);
  assert.deepEqual(optionsFor(cores, { papLesion: PAP.ADH }), ['Not stained', 'Present', 'Absent in the atypical areas', 'Absent']);
  assert.deepEqual(optionsFor(cores, { papLesion: PAP.DCIS_IN }), ['Not stained', 'Present', 'Absent in the atypical areas', 'Absent']);
  const type = field('papInvType');
  assert.deepEqual(optionsFor(type, { papLesion: PAP.EPC }), ['No special type', 'Mucinous', 'Lobular', 'Other']);
  assert.deepEqual(optionsFor(type, { papLesion: PAP.SPC }), ['No special type', 'Solid papillary', 'Mucinous', 'Lobular', 'Other']);
  assert.equal(linkedDefault(type, PAP.SPC), 'Solid papillary');
  assert.equal(linkedDefault(type, PAP.EPC), 'No special type');
  const part = { values: { ...values({ papLesion: PAP.EPC, papInvType: 'Solid papillary', papMecCores: 'Absent in the atypical areas' }) } };
  normalisePart(schema, part);
  assert.equal(part.values.papInvType, 'No special type');
  assert.equal(part.values.papMecCores, 'Not stained');
});

// ---------- wording ----------

test('intraductal papilloma: B3 with the recommendation, B2 when small and whole in the core', () => {
  const b3 = run({ papLesion: PAP.IP });
  assert.equal(b3.diagnosis, `${HEAD}INTRADUCTAL PAPILLOMA (B3)`);
  assert.equal(b3.microscopy, `${CORES} containing an intraductal papillary proliferation with fibrovascular cores lined by epithelial and myoepithelial cells. The epithelium shows no atypia. The features are consistent with intraductal papilloma. There is no evidence of in situ or invasive malignancy. Multidisciplinary discussion is recommended.`);
  const b2 = run({ papLesion: PAP.IP, papWithinCore: true, papMecCores: 'Present', papMecEdge: 'Present', papCk56: 'Mosaic', papEr: 'Heterogeneous' });
  assert.equal(b2.diagnosis, `${HEAD}INTRADUCTAL PAPILLOMA (B2)`);
  assert.equal(b2.microscopy, `${CORES} containing an intraductal papillary proliferation with fibrovascular cores lined by epithelial and myoepithelial cells. The epithelium shows no atypia. Immunostaining for p63 demonstrates myoepithelial cells along the fibrovascular cores and at the periphery of the lesion. The epithelial cells show a mosaic pattern of CK5/6 staining and are heterogeneously positive for ER. The features are consistent with intraductal papilloma. The papilloma is small and is seen whole within the core. There is no evidence of in situ or invasive malignancy.`);
  const udh = run({ papLesion: PAP.IP, papUdh: true, b3Advice: 'Excision' });
  assert.equal(udh.diagnosis, `${HEAD}INTRADUCTAL PAPILLOMA with USUAL DUCTAL HYPERPLASIA (B3)`);
  assert.ok(udh.microscopy.includes('The epithelium shows usual ductal hyperplasia without atypia.'));
  assert.ok(udh.microscopy.endsWith('Excision is recommended.'));
  assert.ok(!run({ papLesion: PAP.IP, b3Advice: 'None' }).microscopy.includes('recommended'));
});

test('suggestive fragments and papilloma with ADH', () => {
  const sug = run({ papLesion: PAP.SUG, papMecCores: 'Present' });
  assert.equal(sug.diagnosis, `${HEAD}PAPILLARY LESION, suggestive of INTRADUCTAL PAPILLOMA (B3)`);
  assert.equal(sug.microscopy, `${CORES} and detached fragments of a papillary lesion. The fragments consist of fibrovascular cores lined by epithelial and myoepithelial cells, and the epithelium shows no atypia. Immunostaining for p63 demonstrates myoepithelial cells along the fibrovascular cores. The features are suggestive of intraductal papilloma. There is no evidence of in situ or invasive malignancy. Multidisciplinary discussion is recommended.`);
  const adh = run({ papLesion: PAP.ADH, papMecCores: 'Absent in the atypical areas', papMecEdge: 'Present', papCk56: 'Negative', papEr: 'Diffuse, strong' });
  assert.equal(adh.diagnosis, `${HEAD}INTRADUCTAL PAPILLOMA with ATYPICAL DUCTAL HYPERPLASIA (B3)`);
  assert.ok(adh.microscopy.includes('The atypical proliferation is limited in extent and falls short of ductal carcinoma in situ. Immunostaining for p63 demonstrates myoepithelial cells along the fibrovascular cores and at the periphery of the lesion but none within the atypical areas. The atypical cells show loss of CK5/6 and are diffusely and strongly positive for ER. The features are those of an intraductal papilloma with atypical ductal hyperplasia. There is no evidence of invasive malignancy. Multidisciplinary discussion is recommended.'));
});

test('papilloma with DCIS and papillary DCIS: B5a, released ", low grade" on the line', () => {
  const inPap = run({ papLesion: PAP.DCIS_IN, papGrade: 'Intermediate', papMecCores: 'Absent in the atypical areas' });
  assert.equal(inPap.diagnosis, `${HEAD}INTRADUCTAL PAPILLOMA with DUCTAL CARCINOMA IN SITU, intermediate grade (B5a)`);
  assert.equal(inPap.microscopy, `${CORES} containing an intraductal papilloma with fibrovascular cores lined by epithelial and myoepithelial cells. Part of the papilloma is involved by intermediate nuclear grade ductal carcinoma in situ, composed of atypical epithelial cells with moderately enlarged, mildly pleomorphic nuclei. Immunostaining for p63 demonstrates myoepithelial cells along the fibrovascular cores but none within the atypical areas. There is no evidence of invasive carcinoma in the material examined.`);
  const pdcis = run({ papLesion: PAP.PDCIS, papMecCores: 'Absent', papMecEdge: 'Present' });
  assert.equal(pdcis.diagnosis, `${HEAD}PAPILLARY DUCTAL CARCINOMA IN SITU, low grade (B5a)`);
  assert.equal(pdcis.microscopy, `${CORES} containing ducts distended by a papillary proliferation, with delicate fibrovascular cores lined by a monotonous population of atypical epithelial cells with small, uniform nuclei. Immunostaining for p63 demonstrates myoepithelial cells around the involved ducts but none along the fibrovascular cores. The features are those of low nuclear grade papillary ductal carcinoma in situ. There is no evidence of invasive carcinoma in the material examined.`);
  assert.ok(!pdcis.microscopy.includes('recommended'), 'no B3 recommendation on a B5a lesion');
});

test('encapsulated papillary carcinoma: without invasion, suspicious, present and not assessable', () => {
  const none = run({ papLesion: PAP.EPC, papMecCores: 'Absent', papMecEdge: 'Absent', papCk56: 'Negative', papEr: 'Diffuse, strong' });
  assert.equal(none.diagnosis, `${HEAD}ENCAPSULATED PAPILLARY CARCINOMA without invasion (B5a)`);
  assert.equal(none.microscopy, `${CORES} containing a papillary carcinoma within a cystic space surrounded by a fibrous capsule. The delicate fibrovascular cores are lined by a monotonous population of atypical epithelial cells with small, uniform nuclei. Immunostaining for p63 shows no myoepithelial cells along the fibrovascular cores or at the periphery of the lesion. The tumour cells show loss of CK5/6 and are diffusely and strongly positive for ER. The features are those of encapsulated papillary carcinoma. There is no evidence of invasive carcinoma in the material examined.`);
  const sus = (papSuspect) => run({ papLesion: PAP.EPC, papInvasion: 'Suspicious, not definite', papSuspect });
  assert.equal(sus('Irregular nests at the edge').diagnosis, `${HEAD}ENCAPSULATED PAPILLARY CARCINOMA, invasion cannot be excluded (B5a)`);
  assert.ok(sus('Irregular nests at the edge').microscopy.endsWith('The features are those of encapsulated papillary carcinoma. Irregular nests of tumour cells are present at the edge of the lesion, but definite stromal invasion is not established. Invasion cannot be excluded.'));
  assert.ok(sus('Nests entrapped in the capsule or stroma').microscopy.endsWith('Nests of tumour cells are entrapped within the fibrous capsule, but definite stromal invasion is not established. Invasion cannot be excluded.'));
  assert.ok(sus('Not specified').microscopy.endsWith('Definite stromal invasion is not established, but invasion cannot be excluded.'));
  const inv = run({ ...INVADED, invExtentMm: '3' });
  assert.equal(inv.diagnosis, `${HEAD}ENCAPSULATED PAPILLARY CARCINOMA with INVASIVE CARCINOMA OF NO SPECIAL TYPE, provisional grade 2 (B5b)`);
  assert.ok(inv.microscopy.endsWith('The features are those of encapsulated papillary carcinoma. Invasive carcinoma of no special type is present beyond the fibrous capsule, with an irregular infiltrative margin and desmoplastic stroma. In the invasive component, tubule formation is inconspicuous. The invasive tumour cells show moderate nuclear pleomorphism with visible nucleoli. Mitoses are infrequent. Provisional Nottingham grade 2 (tubules 3, nuclear pleomorphism 2, mitoses 1; score 6/9). The invasive carcinoma measures 3 mm in maximum extent in the cores. Lymphovascular invasion is not identified.'));
  const other = run({ ...INVADED, papInvType: 'Other', papInvOther: 'invasive micropapillary carcinoma', tubules: '2', nuclear: '2', mitoses: '1', lvi: 'Present' });
  assert.equal(other.diagnosis, `${HEAD}ENCAPSULATED PAPILLARY CARCINOMA with INVASIVE MICROPAPILLARY CARCINOMA, provisional grade 1 (B5b)`);
  assert.ok(other.microscopy.includes('Invasive micropapillary carcinoma is present beyond the fibrous capsule'));
  assert.ok(other.microscopy.endsWith('Lymphovascular invasion is present.'));
  const b5c = run({ papLesion: PAP.EPC, papInvasion: 'Not assessable', papMecEdge: 'Edge not sampled' });
  assert.equal(b5c.diagnosis, `${HEAD}ENCAPSULATED PAPILLARY CARCINOMA, IN SITU VERSUS INVASIVE NOT ASSESSABLE (B5c)`);
  assert.equal(b5c.microscopy, 'Sections show three cores composed entirely of fragments of a papillary carcinoma, with delicate fibrovascular cores lined by a monotonous population of atypical epithelial cells with small, uniform nuclei. The features are in keeping with encapsulated papillary carcinoma. The distinction between in situ and invasive carcinoma cannot be made on this material, as the fragments include no surrounding stroma.');
  assert.ok(run({ papLesion: PAP.EPC, papMecEdge: 'Edge not sampled' }).microscopy.includes('The edge of the lesion is not represented in the cores.'));
});

test('solid papillary carcinoma: neuroendocrine markers, and an invasive solid papillary component named alone', () => {
  const insitu = run({ papLesion: PAP.SPC, papNe: 'Positive', papCk56: 'Negative', papEr: 'Diffuse, strong', papMecEdge: 'Absent' });
  assert.equal(insitu.diagnosis, `${HEAD}SOLID PAPILLARY CARCINOMA without invasion (B5a)`);
  assert.equal(insitu.microscopy, `${CORES} containing expansile solid nodules with smooth contours, composed of monotonous tumour cells with small, uniform nuclei arranged around delicate fibrovascular cores. Immunostaining for p63 shows no myoepithelial cells around the tumour nodules. The tumour cells show loss of CK5/6 and are diffusely and strongly positive for ER. They also express synaptophysin and chromogranin. The features are those of solid papillary carcinoma. There is no evidence of invasive carcinoma in the material examined.`);
  assert.ok(run({ papLesion: PAP.SPC, papNe: 'Positive', papNeMarkers: ['Synaptophysin', 'INSM1'] }).microscopy.includes('The tumour cells express synaptophysin and INSM1.'));
  assert.ok(run({ papLesion: PAP.SPC, papNe: 'Negative' }).microscopy.includes('The tumour cells do not express synaptophysin or chromogranin.'));
  assert.ok(!run({ papLesion: PAP.EPC, papNe: 'Positive' }).microscopy.includes('synaptophysin'), 'a hidden neuroendocrine pick is ignored');
  const inv = run({ papLesion: PAP.SPC, papInvasion: 'Present', papInvType: 'Solid papillary', papInvSeen: ['Desmoplastic stroma'] });
  assert.equal(inv.diagnosis, `${HEAD}INVASIVE SOLID PAPILLARY CARCINOMA, provisional grade 2 (B5b)`);
  assert.ok(inv.microscopy.includes('Invasive solid papillary carcinoma is present beyond the circumscribed nodules, with desmoplastic stroma.'));
  const muc = run({ papLesion: PAP.SPC, papInvasion: 'Present', papInvType: 'Mucinous', papInvSeen: ['Entrapped fat'] });
  assert.equal(muc.diagnosis, `${HEAD}SOLID PAPILLARY CARCINOMA with INVASIVE MUCINOUS CARCINOMA, provisional grade 2 (B5b)`);
  assert.equal(run({ papLesion: PAP.SPC, papInvasion: 'Not assessable' }).diagnosis, `${HEAD}SOLID PAPILLARY CARCINOMA, IN SITU VERSUS INVASIVE NOT ASSESSABLE (B5c)`);
});

test('invasive papillary carcinoma: B5b with the grading sentences', () => {
  const r = run({ papLesion: PAP.IPC, tubules: '2', nuclear: '2', mitoses: '2' });
  assert.equal(r.diagnosis, `${HEAD}INVASIVE PAPILLARY CARCINOMA, provisional grade 2 (B5b)`);
  assert.equal(r.microscopy, `${CORES} infiltrated by an invasive papillary carcinoma, composed of papillary structures with fibrovascular cores lined by tumour cells, without a myoepithelial layer. Tubule formation is seen in a moderate proportion of the tumour. The tumour cells show moderate nuclear pleomorphism with visible nucleoli. Mitoses are readily identified. Provisional Nottingham grade 2 (tubules 2, nuclear pleomorphism 2, mitoses 2; score 6/9). Lymphovascular invasion is not identified.`);
});

test('hidden papillary values never reach another category, and the printed text carries no rules', () => {
  const b5b = generate(schema, t.generator, (() => { const c = createCase(schema, 1); Object.assign(c.parts[0].values, { laterality: 'Left', category: 'B5b' }); return c; })());
  const leaked = generate(schema, t.generator, (() => {
    const c = createCase(schema, 1);
    Object.assign(c.parts[0].values, { laterality: 'Left', category: 'B5b', papLesion: PAP.SPC, papInvasion: 'Not assessable', papNe: 'Positive' });
    return c;
  })());
  assert.equal(leaked.report, b5b.report);
  for (const v of [{ papLesion: PAP.IP }, { papLesion: PAP.ADH }, { ...INVADED }, { papLesion: PAP.EPC, papInvasion: 'Not assessable' }, { papLesion: PAP.SPC, papInvasion: 'Suspicious, not definite' }]) {
    const text = run(v).report;
    assert.ok(!/RCPath|WHO|Rakha|G150|3 mm|B2 is|excision is advised/i.test(text), `no citations or rules in ${JSON.stringify(v)}`);
  }
});

// ---------- Checks ----------

test('Checks: warnings where the picks disagree, reminders of the rules', () => {
  assert.deepEqual(checksOf(run({ papLesion: PAP.EPC })), []);
  assert.deepEqual(checksOf(run({ papLesion: PAP.IP })), []);
  assert.deepEqual(checksOf(run({ papLesion: PAP.EPC, papInvasion: 'Present' })), [['warn', 'papInvSeen']]);
  assert.deepEqual(checksOf(run({ ...INVADED })), []);
  assert.deepEqual(checksOf(run({ papLesion: PAP.IP, papMecCores: 'Absent' })), [['warn', 'papMecCores']]);
  assert.deepEqual(checksOf(run({ papLesion: PAP.SUG, papMecCores: 'Absent' })), [['warn', 'papMecCores']]);
  assert.deepEqual(checksOf(run({ papLesion: PAP.PDCIS, papMecCores: 'Present' })), [['warn', 'papMecCores']]);
  assert.deepEqual(checksOf(run({ papLesion: PAP.PDCIS, papMecEdge: 'Absent' })), [['warn', 'papMecEdge']]);
  assert.deepEqual(checksOf(run({ papLesion: PAP.IP, papCk56: 'Negative' })), [['warn', 'papCk56']]);
  assert.deepEqual(checksOf(run({ papLesion: PAP.EPC, papGrade: 'High' })), [['warn', 'papGrade']]);
  assert.deepEqual(checksOf(run({ papLesion: PAP.EPC, bOverride: 'B5b' })), [['warn', 'bOverride']]);
  assert.deepEqual(checksOf(run({ papLesion: PAP.EPC, bOverride: 'B5a' })), [], 'an override that agrees is quiet');
  assert.deepEqual(checksOf(run({ papLesion: PAP.IP, papWithinCore: true })), [['info', 'papWithinCore']]);
  assert.deepEqual(checksOf(run({ papLesion: PAP.ADH })), [['info', 'papLesion']]);
  assert.deepEqual(checksOf(run({ papLesion: PAP.DCIS_IN })), [['info', 'papLesion']]);
  assert.deepEqual(checksOf(run({ papLesion: PAP.SPC, papInvasion: 'Not assessable' })), [['info', 'papInvasion']]);
  assert.deepEqual(checksOf(run({ papLesion: PAP.EPC, papInvasion: 'Not assessable', papMecEdge: 'Present' })), [['warn', 'papMecEdge'], ['info', 'papInvasion']]);
  assert.deepEqual(checksOf(run({ papLesion: PAP.IPC })), [['info', 'papLesion']]);
  assert.deepEqual(checksOf(run({ ...INVADED, biomarkers: 'Performed' })), [['info', 'biomarkers']]);
  assert.deepEqual(checksOf(run({ papLesion: PAP.EPC, laterality: '' })), [['warn', undefined]], 'the side check still leads');
  assert.ok(run({ papLesion: PAP.EPC, bOverride: 'B5b' }).issues[0].message.includes('(B5b) differs from the one this lesion gives (B5a)'));
});

// ---------- reference galleries ----------

test('reference galleries sit on the lesion and invasion fields, each image openly licensed and under 150 kB', () => {
  const used = new Set();
  for (const id of ['papLesion', 'papInvasion']) {
    const f = field(id);
    assert.ok(f.reference && f.reference.groups.length >= 4, `${id} has a gallery`);
    for (const g of f.reference.groups) {
      for (const im of g.images || []) {
        used.add(path.basename(im.src));
        assert.match(im.license, /^CC(0| BY| BY-SA)/, `${im.src} licence`);
        assert.ok(!/NC|ND/.test(im.license), `${im.src} is not NC/ND`);
        assert.ok(im.caption && im.credit && /^https:/.test(im.url), `${im.src} caption, credit and url`);
        assert.ok(fs.statSync(path.join(root, im.src)).size <= 150 * 1024, `${im.src} is at most 150 kB`);
      }
    }
  }
  const files = fs.readdirSync(path.join(root, 'assets', 'reference', 'breast_biopsy'));
  assert.deepEqual([...used].sort(), files.sort(), 'every image file is used, and every used image exists');
  assert.equal(field('papLesion').reference.groups.length, 6);
  assert.equal(field('papInvasion').reference.groups.length, 4);
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-papilloma-with-adh-b3', 'New (Phase 50): papilloma with ADH, p63 kept along the cores but lost in the atypical area, CK5/6 loss and diffuse ER.',
    { papLesion: PAP.ADH, papMecCores: 'Absent in the atypical areas', papMecEdge: 'Present', papCk56: 'Negative', papEr: 'Diffuse, strong' }],
  ['02-epc-without-invasion-b5a', 'New (Phase 50): encapsulated papillary carcinoma, no myoepithelial cells in or around it, without invasion.',
    { papLesion: PAP.EPC, papMecCores: 'Absent', papMecEdge: 'Absent', papCk56: 'Negative', papEr: 'Diffuse, strong' }],
  ['03-spc-invasive-solid-papillary-b5b', 'New (Phase 50): solid papillary carcinoma with neuroendocrine markers and an invasive solid papillary component.',
    { papLesion: PAP.SPC, papMecEdge: 'Absent', papEr: 'Diffuse, strong', papNe: 'Positive', papInvasion: 'Present', papInvType: 'Solid papillary',
      papInvSeen: ['Irregular infiltrative margin', 'Desmoplastic stroma'], tubules: '3', nuclear: '2', mitoses: '1', invExtentMm: '4' }],
  ['04-epc-not-assessable-b5c', 'New (Phase 50): encapsulated papillary carcinoma in stroma-free fragments, in situ versus invasive not assessable.',
    { papLesion: PAP.EPC, papInvasion: 'Not assessable', papMecEdge: 'Edge not sampled', papEr: 'Diffuse, strong' }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, description, v] of CASES) {
    const out = run(v);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'breast_biopsy', description, values: { laterality: 'Left', specimenName: "2 o'clock", category: 'Papillary', ...v }, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
