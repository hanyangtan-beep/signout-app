// Bone tumour resection synoptic (QMH MS-Bone, CAP Bone 4.2.0.0, WHO 5th edition 2020, AJCC 8th edition).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'bone_tumour');
const UPDATE = process.env.UPDATE_FIXTURES === '1';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.bone_tumour;
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

test('bone_tumour: registered under Soft tissue, labelled Bone tumour, placeholder retired', () => {
  assert.ok(t, 'registry has bone_tumour');
  assert.equal(t.schema.system, 'Soft tissue');
  assert.equal(t.schema.kind, 'cancer resection');
  assert.equal(t.schema.label, 'Bone tumour');
  assert.equal(t.schema.organ, 'BONE');
  assert.ok(!planned.planned.some((p) => p.id === 'bone_tumour'), 'placeholder removed from planned.json');
  assert.ok(manifest.some((m) => m.id === 'bone_tumour'), 'present in manifest.json');
});

test('bone_tumour: example renders post-neoadjuvant conventional osteosarcoma with ypT2 and 95% necrosis', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true, printPTNM: true };
  const r = run(c);
  assert.match(r.report, /SPECIMEN:/);
  assert.match(r.report, /MACROSCOPIC DESCRIPTION:/);
  assert.match(r.report, /MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:/);
  assert.match(r.report, /DIAGNOSIS:/);
  assert.match(r.synoptic, /- Histologic type: Conventional osteosarcoma \(osteoblastic subtype\)/);
  assert.match(r.synoptic, /- Treatment effect: Present \(5% viable tumour \(95% treatment-related necrosis\)/);
  assert.match(r.synoptic, /- pTNM: ypT2/);
  assert.doesNotMatch(r.synoptic, /pNX/, 'pN omitted when no lymph nodes examined');
  assert.match(r.diagnosis, /DISTAL RIGHT FEMUR, segmental \/ wide resection:/);
  assert.match(r.diagnosis, /- CONVENTIONAL OSTEOSARCOMA \(osteoblastic subtype\), grade 3, 95 mm/);
  assert.match(r.diagnosis, /- treatment effect present \(95% necrosis \/ 5% viable tumour\)/);
  assert.match(r.diagnosis, /- Margins clear \(closest 6 mm, medial soft tissue\)/);
  assert.match(r.diagnosis, /- ypT2 \(AJCC 8th edition\)\./);
  assert.doesNotMatch(r.report, /Stage group/, 'stage group stays in Checks only');
});

const PELVIS_CHONDRO = {
  ...EXAMPLE,
  procedure: 'Segmental / wide resection',
  siteGroup: 'Pelvis',
  site: 'right ilium and acetabulum',
  locationExtent: ['Medullary cavity', 'Cortical', 'Tumour extension into soft tissue'],
  tumourSizeMm: '115',
  tumourDims: '115 x 85 x 70',
  pelvisExtent: 'Spans 2 pelvic segments with extraosseous extension',
  specimenDims: '20 x 14 x 10',
  orientation: 'internal hemipelvectomy specimen',
  cutSurface: ['Lobulated blue-grey cartilaginous'],
  cortexStatus: 'Cortical destruction with soft tissue extension',
  macroMarginMm: '2',
  macroMarginSite: 'posterior sacral osteotomy margin',
  blocks: '14',
  blockKeyText: '1-10 Tumour\n11-12 Osteotomy margins\n13-14 Soft tissue margins',
  histType: 'Chondrosarcoma',
  osteosarcomaSubtype: '',
  histGrade: 'G2: Moderately differentiated, high grade',
  mitoticCount: '4',
  necrosis: 'Present',
  necrosisPct: '15',
  lvi: 'Not identified',
  pni: 'Not identified',
  ihcText: '',
  marginsText: 'Posterior osteotomy: 2 (block 11)\nAnterior pubis osteotomy: 18 (block 12)\nSoft tissue: 10 (block 13)',
  preresection: ['No known preresection therapy'],
  treatmentEffect: 'No known presurgical therapy',
  viablePct: '',
  treatmentFeatures: [],
  idh: 'IDH1 mutation detected'
};

test('bone_tumour: pelvic chondrosarcoma derives pT3b, prints IDH1 molecular findings and notes no pelvic stage group in Checks', () => {
  const r = run(one(PELVIS_CHONDRO));
  assert.match(r.synoptic, /- Histologic type: Chondrosarcoma/);
  assert.match(r.synoptic, /- pTNM: pT3b/);
  assert.match(r.molecular, /IDH1 mutation detected/);
  assert.ok(r.issues.some((x) => x.level === 'info' && /no prognostic stage groups.*pelvis/i.test(x.message)));
});

const SPINE_CHORDOMA = {
  ...EXAMPLE,
  procedure: 'Segmental / wide resection',
  siteGroup: 'Spine',
  site: 'S2-S4 sacrum',
  locationExtent: ['Medullary cavity', 'Cortical', 'Tumour extension into soft tissue'],
  tumourSizeMm: '72',
  tumourDims: '72 x 58 x 45',
  spineExtent: 'Extension into the spinal canal',
  specimenDims: '11 x 9 x 7',
  orientation: 'en bloc sacrectomy specimen',
  cutSurface: ['Gelatinous / myxoid', 'Haemorrhagic'],
  cortexStatus: 'Cortical destruction with soft tissue extension',
  macroMarginMm: '0',
  macroMarginSite: 'anterior epidural margin',
  blocks: '12',
  blockKeyText: '1-9 Tumour\n10 Proximal sacral osteotomy\n11-12 Anterior epidural margin',
  histType: 'Conventional chordoma',
  osteosarcomaSubtype: '',
  histGrade: 'Not applicable',
  mitoticCount: '2',
  necrosis: 'Not identified',
  necrosisPct: '',
  ihcText: 'Tumour cells are diffusely positive for brachyury, pan-cytokeratin (AE1/AE3) and S100.',
  marginsText: 'Anterior epidural: involved (block 11)\nProximal sacral osteotomy: 12 (block 10)',
  preresection: ['No known preresection therapy'],
  treatmentEffect: 'No known presurgical therapy',
  viablePct: '',
  treatmentFeatures: []
};

test('bone_tumour: sacral chordoma derives pT4a and reports involved margin in diagnosis', () => {
  const r = run(one(SPINE_CHORDOMA));
  assert.match(r.synoptic, /- pTNM: pT4a/);
  assert.match(r.diagnosis, /Surgical margin involved by tumour \(anterior epidural\)/);
  assert.match(r.diagnosis, /- pT4a \(AJCC 8th edition\)\./);
});

test('bone_tumour: giant cell tumour of bone omits pTNM and notes non-staged status in Checks', () => {
  const r = run(one({
    procedure: 'Intralesional resection',
    siteGroup: 'Appendicular skeleton, trunk, skull, and facial bones',
    site: 'proximal left tibia',
    tumourSizeMm: '48',
    histType: 'Giant cell tumour of bone',
    histGrade: 'Not applicable',
    preresection: ['No known preresection therapy'],
    treatmentEffect: 'No known presurgical therapy'
  }));
  assert.doesNotMatch(r.synoptic, /Pathological stage/);
  assert.doesNotMatch(r.diagnosis, /AJCC/);
  assert.ok(r.issues.some((x) => x.level === 'info' && /AJCC 8th edition pTNM does not apply/.test(x.message)));
});

test('bone_tumour: checks for grade consistency, osteosarcoma Huvos response and node counts', () => {
  const badGrade = checksOf({
    procedure: 'Segmental / wide resection',
    siteGroup: 'Appendicular skeleton, trunk, skull, and facial bones',
    tumourSizeMm: '90',
    histType: 'Conventional osteosarcoma',
    histGrade: 'G1: Well differentiated, low grade'
  });
  assert.ok(badGrade.some((x) => x.level === 'warn' && /high grade by definition/.test(x.message)));

  const goodResp = checksOf(EXAMPLE);
  assert.ok(goodResp.some((x) => x.level === 'info' && /95% necrosis \(good response/.test(x.message)));

  const nodeErr = checksOf({
    procedure: 'Segmental / wide resection',
    histType: 'Ewing sarcoma',
    tumourSizeMm: '60',
    nodesExamined: '2',
    nodesInvolved: '4'
  });
  assert.ok(nodeErr.some((x) => x.level === 'error' && /exceeds/.test(x.message)));
});

test('bone_tumour: intake routes primary bone tumour resections without colliding with bone_joint or soft_tissue_sarcoma', () => {
  assert.equal(route('(A) Distal right femur, segmental resection', 'Conventional osteosarcoma').templateId, 'bone_tumour');
  assert.equal(preset('(A) Distal right femur, segmental resection', 'Conventional osteosarcoma').siteGroup, 'Appendicular skeleton, trunk, skull, and facial bones');

  assert.equal(route('(A) Right ilium, hemipelvectomy', 'Chondrosarcoma').templateId, 'bone_tumour');
  assert.equal(preset('(A) Right ilium, hemipelvectomy', 'Chondrosarcoma').siteGroup, 'Pelvis');

  assert.equal(route('(A) Sacrum, en bloc sacrectomy', 'Chordoma').templateId, 'bone_tumour');
  assert.equal(preset('(A) Sacrum, en bloc sacrectomy', 'Chordoma').siteGroup, 'Spine');

  // Benign bone/joint stays on bone_joint; soft tissue sarcoma stays on soft_tissue_sarcoma
  assert.equal(route('(A) Left femoral head, total hip replacement', 'Osteoarthritis').templateId, 'bone_joint');
  assert.equal(route('(A) Right thigh mass, wide local excision', 'Dedifferentiated liposarcoma').templateId, 'soft_tissue_sarcoma');
});

// ---------- golden reports ----------

const CASES = [
  ['01-distal-femur-osteosarcoma-ypt2', 'distal right femur segmental resection for post-neoadjuvant conventional osteoblastic osteosarcoma, 95 mm, 95% necrosis, clear margins, ypT2 (example)', EXAMPLE],
  ['02-pelvis-chondrosarcoma-pt3b', 'right internal hemipelvectomy for grade 2 chondrosarcoma, 115 mm, 2 pelvic segments with extraosseous extension, IDH1 mutation, pT3b', PELVIS_CHONDRO],
  ['03-sacrum-chordoma-pt4a', 'en bloc sacrectomy for conventional chordoma, 72 mm, spinal canal extension, involved anterior epidural margin, pT4a', SPINE_CHORDOMA]
];

for (const [name, description, values] of CASES) {
  test(`golden: ${name}`, () => {
    const r = run(one(values, OPTIONS));
    const file = path.join(FIX, `${name}.json`);
    const current = { description, templateId: 'bone_tumour', options: OPTIONS, values: [values], report: r.report, checks: r.issues };
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
  histType: ['Bone tumour types (WHO 5th edition)', 8, 10],
  histGrade: ['Histologic grading of bone sarcomas (AJCC 8th / WHO 5th)', 3, 3],
  treatmentEffect: ['Neoadjuvant treatment effect in bone sarcomas (CAP 4.2.0.0 / Huvos)', 3, 0],
  siteGroup: ['AJCC 8th edition bone staging site tables', 3, 0],
  cortexStatus: ['Cortical destruction, marrow permeation and soft tissue extension', 3, 0]
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

test('bone_tumour galleries: five panels on select fields with open-licence bone photos and ExpertPath links', () => {
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
      assert.ok(im.src.startsWith('assets/reference/bone_tumour/'), `${im.src} folder`);
      assert.match(im.license, /^CC(0| BY| BY-SA)/, `${im.src} open licence`);
      assert.doesNotMatch(im.license, /\b(NC|ND)\b/, `${im.src} no NC/ND`);
      assert.match(im.url, /^https:\/\//, `${im.src} https source URL`);
      const buf = fs.readFileSync(path.join(root, im.src));
      const size = jpegSize(buf);
      assert.ok(buf.length <= 150 * 1024 && size && size.w <= 900 && size.h <= 900, `${im.src} is JPEG <= 900 px and <= 150 kB`);
    }
  }
  const folder = fs.readdirSync(path.join(root, 'assets/reference/bone_tumour')).map((n) => `assets/reference/bone_tumour/${n}`);
  assert.deepEqual(folder.filter((s) => !used.has(s)), [], 'every file in assets/reference/bone_tumour is used');
  assert.equal(folder.length, 10, '10 unique bone tumour reference photographs');
  const r = run(one(EXAMPLE, OPTIONS));
  for (const id of Object.keys(GALLERIES)) {
    const ref = t.schema.fields.find((x) => x.id === id).reference;
    for (const txt of [ref.intro, ...ref.groups.flatMap((g) => [...g.points, ...(g.images || []).map((im) => im.caption)])]) {
      assert.ok(!r.report.includes(txt), `"${txt.slice(0, 60)}" reached the printed report`);
    }
  }
});
