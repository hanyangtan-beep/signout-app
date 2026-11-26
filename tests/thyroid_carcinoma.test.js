// Thyroid carcinoma resection synoptic (QMH Endocrine-Thyroid, CAP Thyroid 4.4.0.0,
// WHO 5th edition 2022, AJCC 8th edition). Wording is deliberate; update strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { UPGRADE_TO as THYROID_UPGRADE } from '../generators/thyroid.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'thyroid_carcinoma');
const UPDATE = process.env.UPDATE_FIXTURES === '1';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.thyroid_carcinoma;
const EXAMPLE = t.schema.example.parts[0].values;
const OPTIONS = t.schema.example.options;

const run = (c) => generate(t.schema, t.generator, c);
const example = () => ({ ...JSON.parse(JSON.stringify(t.schema.example)), schemaId: t.schema.id });
const one = (values, options = {}) => {
  const c = createCase(t.schema, 1);
  c.options = { ...c.options, printPTNM: true, ...options };
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};
const checksOf = (values, options = {}) => t.generator.validate(one(values, options).parts[0], { schema: t.schema, options: { printPTNM: true, ...options } });
const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line, history = '') => {
  const parsed = parseIntake(line);
  return presetValues(t.schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
};

const planned = JSON.parse(fs.readFileSync(new URL('../templates/planned.json', import.meta.url), 'utf8'));

test('thyroid_carcinoma: registered with required metadata and placeholder retired', () => {
  assert.ok(t, 'registry has thyroid_carcinoma');
  assert.equal(t.schema.system, 'Endocrine');
  assert.equal(t.schema.kind, 'cancer resection');
  assert.equal(t.schema.label, 'Thyroid Ca');
  assert.equal(t.schema.organ, 'THYROID GLAND');
  assert.ok(!planned.planned.some((p) => p.id === 'thyroid_carcinoma'), 'placeholder removed from planned.json');
  assert.ok(manifest.some((m) => m.id === 'thyroid_carcinoma'), 'present in manifest.json');
});

test('thyroid_carcinoma: example renders all blocks with AJCC 8th pTNM', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true, printPTNM: true };
  const r = run(c);
  assert.match(r.report, /SPECIMEN:/);
  assert.match(r.report, /MACROSCOPIC DESCRIPTION:/);
  assert.match(r.report, /MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:/);
  assert.match(r.report, /DIAGNOSIS:/);
  assert.match(r.synoptic, /- Procedure: Total thyroidectomy/);
  assert.match(r.synoptic, /- Histologic type: Papillary carcinoma, classic subtype/);
  assert.match(r.synoptic, /- pTNM: pT1b pN0a/);
  assert.match(r.diagnosis, /THYROID, total thyroidectomy:/);
  assert.match(r.diagnosis, /- PAPILLARY CARCINOMA, classic subtype, 18 mm/);
  assert.match(r.diagnosis, /- Margins clear/);
  assert.match(r.diagnosis, /- 0 of 6 central compartment lymph nodes involved/);
  assert.match(r.diagnosis, /- pT1b pN0a \(AJCC 8th edition\)\./);
  assert.doesNotMatch(r.report, /Stage group/, 'stage group stays in Checks only');
});

const MTC_CASE = {
  ...EXAMPLE,
  procedure: 'Total thyroidectomy',
  tumourSite: ['Left lobe'],
  tumourSizeMm: '26',
  tumourDims: '26 x 20 x 18',
  histType: 'Medullary thyroid carcinoma',
  mitoticCount: 'Greater than or equal to 5 mitoses per 2 mm²',
  mitoticExact: '6',
  ki67: '8.5',
  mtcGrade: 'High grade',
  necrosis: 'Present',
  angioinvasion: 'Focal (< 4 vessels)',
  ete: 'Not identified',
  marginStatus: 'Uninvolved by carcinoma',
  marginSite: 'posterior surface',
  marginMm: '2',
  centralExamined: '5',
  centralInvolved: '2',
  centralSites: 'level VI',
  lateralExamined: '14',
  lateralInvolved: '3',
  lateralSites: 'left levels II–IV',
  ene: 'Present',
  largestDepositMm: '12',
  largestDepositSite: 'left level III',
  additionalPathologic: ['C-cell hyperplasia'],
  thyroiditisType: '',
  cCellDetail: 'neoplastic, bilateral',
  molecularOther: 'RET p.Met918Thr mutation detected'
};

test('thyroid_carcinoma: medullary carcinoma prints IMTCGS grade, Ki-67, lateral nodes pN1b and molecular findings', () => {
  const r = run(one(MTC_CASE));
  assert.match(r.synoptic, /- Medullary thyroid carcinoma grade \(IMTCGS\): High grade/);
  assert.match(r.synoptic, /- Ki-67 labelling index: 8\.5%/);
  assert.match(r.synoptic, /- pTNM: pT2 pN1b/);
  assert.match(r.molecular, /RET p\.Met918Thr mutation detected/);
  assert.match(r.diagnosis, /- MEDULLARY THYROID CARCINOMA, high grade, 26 mm/);
  assert.match(r.diagnosis, /2 of 5 central compartment and 3 of 14 lateral neck lymph nodes involved;\s+extranodal extension present/);
  assert.match(r.diagnosis, /- pT2 pN1b \(AJCC 8th edition\)\./);
});

const FTC_CASE = {
  ...EXAMPLE,
  procedure: 'Right lobectomy with isthmusectomy (hemithyroidectomy)',
  tumourSite: ['Right lobe'],
  tumourSizeMm: '35',
  tumourDims: '35 x 28 x 22',
  histType: 'Encapsulated angioinvasive follicular carcinoma',
  angioinvasion: 'Extensive (>= 4 vessels)',
  ete: 'Gross, invading only strap muscles',
  marginStatus: 'Involved by carcinoma',
  marginSite: 'anterior strap muscle interface',
  marginMm: '',
  centralExamined: '',
  centralInvolved: '',
  centralSites: '',
  additionalPathologic: ['None identified'],
  thyroiditisType: ''
};

test('thyroid_carcinoma: encapsulated angioinvasive follicular carcinoma with gross strap muscle ETE -> pT3b and no pN when no nodes examined', () => {
  const r = run(one(FTC_CASE));
  assert.match(r.synoptic, /- Angioinvasion: Extensive \(>= 4 vessels\)/);
  assert.match(r.synoptic, /- pTNM: pT3b/);
  assert.doesNotMatch(r.synoptic, /pNX/, 'pN omitted when no lymph nodes examined');
  assert.match(r.diagnosis, /- gross extrathyroidal extension into strap muscles/);
  assert.match(r.diagnosis, /- Surgical margin involved by carcinoma \(anterior strap muscle interface\)/);
  assert.match(r.diagnosis, /- pT3b \(AJCC 8th edition\)\./);
});

test('thyroid_carcinoma: low-risk neoplasm (NIFTP) omits pTNM', () => {
  const r = run(one({
    procedure: 'Left lobectomy',
    tumourSite: ['Left lobe'],
    tumourSizeMm: '22',
    histType: 'Non-invasive follicular thyroid neoplasm with papillary-like nuclear features (NIFTP)'
  }));
  assert.doesNotMatch(r.synoptic, /Pathological stage/);
  assert.doesNotMatch(r.diagnosis, /AJCC/);
});

test('thyroid_carcinoma: WHO 5th checks for DHGTC, MTC Ki-67/IMTCGS, angioinvasion consistency and node counts', () => {
  const dhgtc = checksOf({
    procedure: 'Total thyroidectomy',
    histType: 'Papillary carcinoma, tall cell subtype',
    tumourSizeMm: '24',
    mitoticCount: 'Greater than or equal to 5 mitoses per 2 mm²',
    necrosis: 'Present'
  });
  assert.ok(dhgtc.some((x) => x.level === 'warn' && /DHGTC/.test(x.message)));

  const mtcBad = checksOf({
    procedure: 'Total thyroidectomy',
    histType: 'Medullary thyroid carcinoma',
    tumourSizeMm: '20',
    mtcGrade: 'Low grade',
    necrosis: 'Present'
  });
  assert.ok(mtcBad.some((x) => x.level === 'warn' && /Ki-67 labelling index is required/.test(x.message)));
  assert.ok(mtcBad.some((x) => x.level === 'warn' && /IMTCGS grade is Low grade/.test(x.message)));

  const angioBad = checksOf({
    procedure: 'Right lobectomy',
    histType: 'Encapsulated angioinvasive follicular carcinoma',
    tumourSizeMm: '30',
    angioinvasion: 'Not identified'
  });
  assert.ok(angioBad.some((x) => x.level === 'warn' && /angioinvasion is recorded as Not identified/.test(x.message)));

  const nodeErr = checksOf({
    procedure: 'Total thyroidectomy',
    histType: 'Papillary carcinoma, classic subtype',
    tumourSizeMm: '15',
    centralExamined: '3',
    centralInvolved: '5'
  });
  assert.ok(nodeErr.some((x) => x.level === 'error' && /exceeds/.test(x.message)));
});

test('thyroid_carcinoma: intake routes malignant thyroid resections and keeps benign and FNA separate', () => {
  assert.equal(route('(A) Total thyroidectomy, papillary thyroid carcinoma').templateId, 'thyroid_carcinoma');
  assert.equal(preset('(A) Total thyroidectomy, papillary thyroid carcinoma').procedure, 'Total thyroidectomy');

  assert.equal(route('(A) Right hemithyroidectomy', 'History of PTC in right lobe').templateId, 'thyroid_carcinoma');
  assert.equal(preset('(A) Right hemithyroidectomy', 'History of PTC in right lobe').procedure, 'Right lobectomy with isthmusectomy (hemithyroidectomy)');

  assert.equal(route('(A) Thyroid, medullary thyroid carcinoma, total thyroidectomy').templateId, 'thyroid_carcinoma');
  assert.equal(route('(A) Right thyroid lobe, hemithyroidectomy', 'Multinodular goitre').templateId, 'thyroid_benign');
  assert.equal(route('(A) Thyroid, right lobe, FNA', 'Thyroid nodule').templateId, 'thyroid_fna');
});

test('thyroid_benign upgrades malignant parts to thyroid_carcinoma', () => {
  assert.equal(THYROID_UPGRADE.to, 'thyroid_carcinoma');
  assert.equal(THYROID_UPGRADE.when({ diagnosis: 'Nodular hyperplasia' }), false);
  assert.equal(THYROID_UPGRADE.when({ diagnosis: 'Papillary thyroid carcinoma - see comment' }), true);
  const mapped = THYROID_UPGRADE.map({
    specimenName: 'Right lobe and isthmus',
    procedure: 'Hemithyroidectomy',
    diagnosis: 'Papillary thyroid carcinoma - see comment',
    weight: '25',
    dimensions: '5 x 3 x 2',
    noduleSize: '1.8',
    blocks: '8',
    thyroiditis: 'Diffuse with germinal centres',
    parathyroid: 'Normal',
    cCell: 'Present'
  });
  assert.equal(mapped.procedure, 'Right lobectomy with isthmusectomy (hemithyroidectomy)');
  assert.deepEqual(mapped.tumourSite, ['Right lobe']);
  assert.equal(mapped.histType, 'Papillary carcinoma, classic subtype');
  assert.equal(mapped.tumourSizeMm, '18');
  assert.deepEqual(mapped.additionalPathologic, ['Thyroiditis', 'Parathyroid gland(s) present', 'C-cell hyperplasia']);
});

// ---------- golden reports ----------

const CASES = [
  ['01-total-thyroidectomy-ptc-classic-pt1b-pn0a', 'total thyroidectomy for classic papillary thyroid carcinoma, 18 mm, margins clear, 6 negative level VI lymph nodes, pT1b pN0a (example)', EXAMPLE],
  ['02-total-thyroidectomy-mtc-high-grade-pt2-pn1b', 'total thyroidectomy for high-grade medullary thyroid carcinoma (IMTCGS), 26 mm, Ki-67 8.5%, necrosis, central and lateral neck metastases with ENE, RET mutation, pT2 pN1b', MTC_CASE],
  ['03-hemithyroidectomy-ftc-angioinvasive-pt3b', 'right hemithyroidectomy for encapsulated angioinvasive follicular carcinoma, 35 mm, extensive angioinvasion, gross strap muscle extension, involved margin, no nodes, pT3b', FTC_CASE]
];

for (const [name, description, values] of CASES) {
  test(`golden: ${name}`, () => {
    const r = run(one(values, OPTIONS));
    const file = path.join(FIX, `${name}.json`);
    const current = { description, templateId: 'thyroid_carcinoma', options: OPTIONS, values: [values], report: r.report, checks: r.issues };
    if (UPDATE || !fs.existsSync(file)) {
      fs.mkdirSync(FIX, { recursive: true });
      fs.writeFileSync(file, `${JSON.stringify(current, null, 2)}\n`);
    }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(r.report, saved.report, `${file} changed; re-run with UPDATE_FIXTURES=1 only after deliberate wording change`);
    assert.deepEqual(r.issues, saved.checks, `${file} checks changed`);
    assert.doesNotMatch(r.report, /undefined|\[object|NaN/);
  });
}

// ---------- reference galleries ----------

const GALLERIES = {
  histType: ['Thyroid carcinoma types (WHO 5th edition)', 10, 13],
  capsule: ['Capsular invasion and post-FNA mimickers', 3, 2],
  angioinvasion: ['Angioinvasion vs lymphatic invasion (CAP 4.4.0.0)', 3, 1],
  mitoticCount: ['High-grade features: DHGTC, PDTC and IMTCGS', 3, 4],
  ete: ['Extrathyroidal extension (AJCC 8th edition)', 4, 0],
  ene: ['Regional lymph node compartments and extranodal extension (AJCC 8th edition)', 3, 1]
};

const jpegSize = (buf) => {
  for (let i = 2; i < buf.length - 8;) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
};

test('thyroid_carcinoma galleries: six panels on select fields with open-licence thyroid photos and ExpertPath links', () => {
  const root = path.join(here, '..');
  const used = new Set();
  for (const [id, [title, groups, photos]] of Object.entries(GALLERIES)) {
    const f = t.schema.fields.find((x) => x.id === id);
    assert.ok(f && (f.type === 'select' || f.type === 'multiselect'), `${id} is a select/multiselect field so the gallery button renders`);
    const ref = f.reference;
    assert.ok(ref, `${id} has a reference panel`);
    assert.equal(ref.title, title, `${id} panel title`);
    assert.equal(ref.groups.length, groups, `${id} group count`);
    const images = ref.groups.flatMap((g) => g.images || []);
    assert.equal(images.length, photos, `${id} photo count`);
    for (const g of ref.groups) {
      assert.ok(g.points?.length, `${id}: ${g.heading} has points`);
      for (const l of g.links || []) {
        assert.ok(l.label.startsWith('ExpertPath: ') && l.url.startsWith('https://app.expertpath.com/'), `${id}: ${l.label}`);
      }
    }
    if (ref.groups.some((g) => g.links?.length)) {
      assert.match(ref.note, /own ExpertPath login/, `${id} notes ExpertPath login requirement`);
    }
    for (const im of images) {
      used.add(im.src);
      assert.ok(im.src.startsWith('assets/reference/thyroid_carcinoma/'), `${im.src} folder`);
      assert.match(im.license, /^(CC0|CC BY|Public domain|NIH|TCGA|Open access)/i, `${im.src} open licence`);
      assert.match(im.url, /^https:\/\//, `${im.src} https source URL`);
      const buf = fs.readFileSync(path.join(root, im.src));
      const size = jpegSize(buf);
      assert.ok(buf.length <= 150 * 1024 && size && size.w <= 900 && size.h <= 900, `${im.src} is JPEG <= 900 px and <= 150 kB`);
    }
  }
  const folder = fs.readdirSync(path.join(root, 'assets/reference/thyroid_carcinoma')).map((n) => `assets/reference/thyroid_carcinoma/${n}`);
  assert.deepEqual(folder.filter((s) => !used.has(s)), [], 'every file in assets/reference/thyroid_carcinoma is used');
  assert.equal(folder.length, 19, '19 unique thyroid carcinoma reference photographs');
  const r = run(one(EXAMPLE, OPTIONS));
  for (const id of Object.keys(GALLERIES)) {
    const ref = t.schema.fields.find((x) => x.id === id).reference;
    for (const txt of [ref.intro, ...ref.groups.flatMap((g) => [...g.points, ...(g.images || []).map((im) => im.caption)])]) {
      assert.ok(!r.report.includes(txt), `"${txt.slice(0, 60)}" reached the printed report`);
    }
  }
});
