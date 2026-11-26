// Renal cell carcinoma nephrectomy synoptic (QMH UG-Kidney, CAP Kidney 4.3.0.0, WHO 5th, AJCC 8th).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { EXT, METS } from '../src/staging/kidney.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'kidney_carcinoma');
const UPDATE = process.env.UPDATE_FIXTURES === '1';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.kidney_carcinoma;
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

test('kidney_carcinoma: registered under GU, labelled Kidney Ca, placeholder retired', () => {
  assert.ok(t, 'registry has kidney_carcinoma');
  assert.equal(t.schema.system, 'GU');
  assert.equal(t.schema.kind, 'cancer resection');
  assert.equal(t.schema.label, 'Kidney Ca');
  assert.equal(t.schema.organ, 'KIDNEY');
  assert.ok(!planned.planned.some((p) => p.id === 'kidney_carcinoma'), 'placeholder removed from planned.json');
  assert.ok(manifest.some((m) => m.id === 'kidney_carcinoma'), 'present in manifest.json');
});

test('kidney_carcinoma: example renders clear cell RCC G2 pT1b pN0 radical nephrectomy', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true, printPTNM: true };
  const r = run(c);
  assert.match(r.report, /SPECIMEN:/);
  assert.match(r.report, /MACROSCOPIC DESCRIPTION:/);
  assert.match(r.report, /MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:/);
  assert.match(r.report, /DIAGNOSIS:/);
  assert.match(r.synoptic, /- Histologic type: Clear cell renal cell carcinoma/);
  assert.match(r.synoptic, /- pTNM: pT1b pN0/);
  assert.match(r.diagnosis, /RIGHT KIDNEY, radical nephrectomy:/);
  assert.match(r.diagnosis, /- CLEAR CELL RENAL CELL CARCINOMA, G2:/);
  assert.match(r.diagnosis, /- pT1b pN0 \(AJCC 8th edition\)\./);
});

const PARTIAL_CHROMOPHOBE = {
  ...EXAMPLE,
  procedure: 'Partial nephrectomy',
  laterality: 'Left',
  weight: '62',
  specimenDims: '5.5 x 4.5 x 4.0',
  site: ['Lower pole'],
  sizeMm: '32',
  allDimsMm: '32 x 28 x 24',
  grossAppearance: 'well-circumscribed mahogany-brown solid mass',
  adrenalGross: '',
  blocks: '8',
  blockKeyText: 'A1-A6: tumour with inked parenchymal margin\nA7-A8: adjacent renal cortex',
  histType: 'Chromophobe renal cell carcinoma',
  grade: 'Not applicable',
  ihcText: 'CD117 and CK7 diffuse strongly positive; CAIX negative',
  extension: [EXT.limited],
  marginStatus: 'All margins uninvolved by invasive carcinoma',
  closestMarginMm: '2',
  closestMarginSite: 'parenchymal margin',
  nodesExamined: '0',
  nodesInvolved: '0',
  nodeSites: ''
};

test('kidney_carcinoma: partial nephrectomy chromophobe RCC (Not applicable grade, pT1a, no nodes)', () => {
  const r = run(one(PARTIAL_CHROMOPHOBE));
  assert.match(r.synoptic, /- Histologic type: Chromophobe renal cell carcinoma/);
  assert.match(r.synoptic, /- Histologic grade \(WHO\/ISUP\): Not applicable/);
  assert.match(r.synoptic, /- pTNM: pT1a/);
  assert.doesNotMatch(r.synoptic, /pNX/);
  assert.match(r.diagnosis, /LEFT KIDNEY, partial nephrectomy:/);
  assert.match(r.diagnosis, /closest 2 mm, parenchymal margin/);
});

const PT3A_SARCOMATOID_PN1 = {
  ...EXAMPLE,
  laterality: 'Right',
  sizeMm: '84',
  allDimsMm: '84 x 68 x 55',
  site: ['Middle', 'Hilum / renal sinus'],
  histType: 'Clear cell renal cell carcinoma',
  grade: 'G4: Extreme nuclear pleomorphism, multinucleated giant cells, and/or rhabdoid and/or sarcomatoid differentiation',
  sarcomatoid: 'Present',
  sarcomatoidPct: '25',
  necrosis: 'Present',
  necrosisPct: '30',
  lvi: 'Present',
  extension: [EXT.sinus, EXT.renalVein],
  marginStatus: 'Involved by invasive carcinoma',
  involvedMargins: ['Renal vein margin'],
  nodesExamined: '7',
  nodesInvolved: '2',
  nodeSites: 'renal hilar and paracaval',
  ene: 'Present',
  largestDepositMm: '12',
  distantMets: [METS.na]
};

test('kidney_carcinoma: G4 sarcomatoid RCC invading renal sinus and vein -> pT3a pN1 (Stage III in Checks)', () => {
  const r = run(one(PT3A_SARCOMATOID_PN1));
  assert.match(r.synoptic, /- Sarcomatoid features: Present \(25%\)/);
  assert.match(r.synoptic, /- pTNM: pT3a pN1/);
  assert.match(r.diagnosis, /Surgical margin involved by carcinoma \(renal vein margin\)/);
  assert.ok(r.issues.some((x) => x.level === 'info' && /Stage III/.test(x.message)));
});

test('kidney_carcinoma: WHO/ISUP chromophobe warning, sarcomatoid G4 check, extension & node checks', () => {
  const chromoGraded = checksOf({ ...EXAMPLE, histType: 'Chromophobe renal cell carcinoma', grade: 'G2: Nucleoli conspicuous and eosinophilic at 400x, visible but not prominent at 100x' });
  assert.ok(chromoGraded.some((x) => x.level === 'warn' && /not graded by the WHO\/ISUP/.test(x.message)));

  const sarcNotG4 = checksOf({ ...EXAMPLE, sarcomatoid: 'Present', sarcomatoidPct: '10', grade: 'G3: Nucleoli conspicuous and eosinophilic at 100x' });
  assert.ok(sarcNotG4.some((x) => x.level === 'warn' && /automatically assigns WHO\/ISUP Grade 4/.test(x.message)));

  const nodeErr = checksOf({ ...EXAMPLE, nodesExamined: '3', nodesInvolved: '5' });
  assert.ok(nodeErr.some((x) => x.level === 'error' && /exceeds/.test(x.message)));
});

test('kidney_carcinoma: intake routes nephrectomies and keeps nephroureterectomy / biopsies separate', () => {
  assert.equal(route('(A) Right kidney, radical nephrectomy', 'Renal mass').templateId, 'kidney_carcinoma');
  assert.equal(preset('(A) Left kidney, partial nephrectomy', 'Renal mass').procedure, 'Partial nephrectomy');
  assert.equal(preset('(A) Left kidney, partial nephrectomy', 'Renal mass').laterality, 'Left');
  assert.notEqual(route('(A) Right kidney and ureter, radical nephroureterectomy', 'Renal pelvis urothelial carcinoma')?.templateId, 'kidney_carcinoma');
});

// ---------- golden reports ----------

const CASES = [
  ['01-ccrcc-g2-pt1b-pn0', 'right radical nephrectomy for 52 mm clear cell RCC G2 confined to kidney, margins clear, 4 negative hilar nodes, pT1b pN0 (example)', EXAMPLE],
  ['02-partial-chromophobe-pt1a', 'left partial nephrectomy for 32 mm chromophobe RCC (WHO/ISUP grade not applicable), parenchymal margin clear 2 mm, no nodes, pT1a', PARTIAL_CHROMOPHOBE],
  ['03-ccrcc-sarcomatoid-pt3a-pn1', 'right radical nephrectomy for 84 mm G4 sarcomatoid clear cell RCC invading renal sinus fat and renal vein, positive renal vein margin, 2/7 positive nodes with ENE, pT3a pN1', PT3A_SARCOMATOID_PN1]
];

for (const [name, description, values] of CASES) {
  test(`golden: ${name}`, () => {
    const r = run(one(values, OPTIONS));
    const file = path.join(FIX, `${name}.json`);
    const current = { description, templateId: 'kidney_carcinoma', options: OPTIONS, values: [values], report: r.report, checks: r.issues };
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
  histType: ['Renal cell tumour subtypes (WHO 5th edition)', 5, 6],
  grade: ['WHO/ISUP nucleolar grading (Grades 1–4)', 4, 2],
  sarcomatoid: ['Sarcomatoid and rhabdoid differentiation', 2, 0],
  extension: ['pT3a–pT4 anatomic landmarks (renal sinus, fat, vein, adrenal)', 3, 0],
  marginStatus: ['Nephrectomy surgical margins (partial vs radical)', 2, 0]
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

test('kidney_carcinoma galleries: five panels on select/multiselect fields with open-licence kidney photos and ExpertPath links', () => {
  const root = path.join(here, '..');
  const used = new Set();
  for (const [id, [title, groups, photos]] of Object.entries(GALLERIES)) {
    const f = t.schema.fields.find((x) => x.id === id);
    assert.ok(f && (f.type === 'select' || f.type === 'multiselect'), `${id} is a select/multiselect field`);
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
      assert.ok(im.src.startsWith('assets/reference/kidney_carcinoma/'), `${im.src} folder`);
      assert.match(im.license, /^(CC0|CC BY|Public domain|NIH|TCGA|Open access)/i, `${im.src} open licence`);
      assert.match(im.url, /^https:\/\//, `${im.src} https source URL`);
      const buf = fs.readFileSync(path.join(root, im.src));
      const size = jpegSize(buf);
      assert.ok(buf.length <= 150 * 1024 && size && size.w <= 900 && size.h <= 900, `${im.src} is JPEG <= 900 px and <= 150 kB`);
    }
  }
  const folder = fs.readdirSync(path.join(root, 'assets/reference/kidney_carcinoma')).map((n) => `assets/reference/kidney_carcinoma/${n}`);
  assert.deepEqual(folder.filter((s) => !used.has(s)), [], 'every kidney_carcinoma photograph is used');
  assert.equal(folder.length, 7, '7 kidney_carcinoma photographs');
  const r = run(one(EXAMPLE, OPTIONS));
  for (const id of Object.keys(GALLERIES)) {
    const ref = t.schema.fields.find((x) => x.id === id).reference;
    for (const txt of [ref.intro, ...ref.groups.flatMap((g) => [...g.points, ...(g.images || []).map((im) => im.caption)])]) {
      assert.ok(!r.report.includes(txt), `"${txt.slice(0, 60)}" reached the printed report`);
    }
  }
});
