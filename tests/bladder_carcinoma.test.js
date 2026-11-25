// Urinary bladder carcinoma cystectomy synoptic (QMH UG-Urinary Bladder, CAP 4.2.0.0, WHO 5th, AJCC 8th).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { EXT, METS } from '../src/staging/bladder.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'bladder_carcinoma');
const UPDATE = process.env.UPDATE_FIXTURES === '1';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.bladder_carcinoma;
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

test('bladder_carcinoma: registered under GU, labelled Bladder Ca, placeholder retired', () => {
  assert.ok(t, 'registry has bladder_carcinoma');
  assert.equal(t.schema.system, 'GU');
  assert.equal(t.schema.kind, 'cancer resection');
  assert.equal(t.schema.label, 'Bladder Ca');
  assert.equal(t.schema.organ, 'URINARY BLADDER');
  assert.ok(!planned.planned.some((p) => p.id === 'bladder_carcinoma'), 'placeholder removed from planned.json');
  assert.ok(manifest.some((m) => m.id === 'bladder_carcinoma'), 'present in manifest.json');
});

test('bladder_carcinoma: example renders high-grade invasive UC pT2b pN0 cystoprostatectomy', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true, printPTNM: true };
  const r = run(c);
  assert.match(r.report, /SPECIMEN:/);
  assert.match(r.report, /MACROSCOPIC DESCRIPTION:/);
  assert.match(r.report, /MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:/);
  assert.match(r.report, /DIAGNOSIS:/);
  assert.match(r.synoptic, /- Histologic type: Urothelial carcinoma, conventional \(invasive\)/);
  assert.match(r.synoptic, /- pTNM: pT2b pN0/);
  assert.match(r.diagnosis, /URINARY BLADDER, prostate and seminal vesicles, radical cystoprostatectomy:/);
  assert.match(r.diagnosis, /- UROTHELIAL CARCINOMA, high-grade, 42 mm/);
  assert.match(r.diagnosis, /- pT2b pN0 \(AJCC 8th edition\)\./);
});

const PT3A_MICROPAPILLARY_PN3 = {
  ...EXAMPLE,
  procedure: 'Radical cystectomy',
  site: ['Trigone', 'Left lateral wall'],
  sizeMm: '55',
  configuration: 'Solid / nodular',
  histType: 'Urothelial carcinoma, micropapillary',
  subtypePct: '40',
  grade: 'High-grade',
  cisStatus: 'Present, extensive / multifocal',
  lvi: 'Present',
  pni: 'Present',
  extension: EXT.t3a,
  prostateInvasion: 'Not applicable',
  marginStatus: 'Uninvolved by invasive carcinoma; CIS present at margin',
  leftUreterMargin: 'Involved by CIS',
  nodesExamined: '22',
  nodesInvolved: '3',
  commonIliacInvolved: '1',
  nodeSites: 'bilateral pelvic and left common iliac',
  ene: 'Present',
  largestDepositMm: '14',
  distantMets: [METS.na]
};

test('bladder_carcinoma: micropapillary UC with perivesical invasion and common iliac node -> pT3a pN3 (Stage IIIB)', () => {
  const r = run(one(PT3A_MICROPAPILLARY_PN3));
  assert.match(r.synoptic, /- Histologic type: Urothelial carcinoma, micropapillary \(40%\)/);
  assert.match(r.synoptic, /- pTNM: pT3a pN3/);
  assert.ok(r.issues.some((x) => x.level === 'info' && /Stage IIIB/.test(x.message)));
});

const YPT0_COMPLETE_RESPONSE = {
  ...EXAMPLE,
  postTherapy: true,
  noPrimary: true,
  sizeMm: '',
  cisStatus: 'Not identified',
  additionalFindings: ['Therapy-related changes (fibrosis / giant cell reaction)']
};

test('bladder_carcinoma: post-neoadjuvant complete pathological response -> ypT0 ypN0', () => {
  const r = run(one(YPT0_COMPLETE_RESPONSE));
  assert.match(r.synoptic, /- pTNM: ypT0 ypN0/);
  assert.match(r.diagnosis, /NO RESIDUAL CARCINOMA IDENTIFIED/);
});

test('bladder_carcinoma: prostatic urethra pT4a pitfall warning, margin consistency and node checks', () => {
  const pitfall = checksOf({ ...EXAMPLE, prostateInvasion: 'Prostatic urethra / ducts / acini only (NOT pT4a)', extension: EXT.t4a });
  assert.ok(pitfall.some((x) => x.level === 'warn' && /NOT pT4a/.test(x.message)));

  const badMargin = checksOf({ ...EXAMPLE, marginStatus: 'All margins uninvolved by invasive carcinoma and CIS', urethralMargin: 'Involved by CIS' });
  assert.ok(badMargin.some((x) => x.level === 'warn' && /individual margin is marked Involved/.test(x.message)));

  const badCi = checksOf({ ...EXAMPLE, nodesExamined: '10', nodesInvolved: '1', commonIliacInvolved: '2' });
  assert.ok(badCi.some((x) => x.level === 'error' && /Common iliac nodes involved/.test(x.message)));
});

test('bladder_carcinoma: intake routes cystectomies and keeps TURBT / biopsies separate', () => {
  assert.equal(route('(A) Urinary bladder, radical cystectomy', 'Muscle-invasive urothelial carcinoma').templateId, 'bladder_carcinoma');
  assert.equal(preset('(A) Urinary bladder and prostate, radical cystoprostatectomy', 'Urothelial carcinoma').procedure, 'Radical cystoprostatectomy');
  assert.notEqual(route('(A) Bladder tumour, TURBT', 'Haematuria')?.templateId, 'bladder_carcinoma');
});

// ---------- golden reports ----------

const CASES = [
  ['01-uc-hg-pt2b-pn0', 'radical cystoprostatectomy for 42 mm high-grade conventional invasive urothelial carcinoma invading deep muscularis propria with focal CIS, margins clear, 18 negative pelvic nodes, pT2b pN0 (example)', EXAMPLE],
  ['02-uc-micropapillary-pt3a-pn3', 'radical cystectomy for 55 mm micropapillary urothelial carcinoma (40%) with microscopic perivesical invasion, left ureteral CIS margin, 3/22 positive nodes including 1 common iliac with ENE, pT3a pN3', PT3A_MICROPAPILLARY_PN3],
  ['03-post-nac-ypt0-ypn0', 'radical cystoprostatectomy status post neoadjuvant chemotherapy with no residual carcinoma, 18 negative pelvic nodes, ypT0 ypN0', YPT0_COMPLETE_RESPONSE]
];

for (const [name, description, values] of CASES) {
  test(`golden: ${name}`, () => {
    const r = run(one(values, OPTIONS));
    const file = path.join(FIX, `${name}.json`);
    const current = { description, templateId: 'bladder_carcinoma', options: OPTIONS, values: [values], report: r.report, checks: r.issues };
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
  histType: ['Urothelial carcinoma subtypes & divergent differentiation (WHO 5th)', 6, 6],
  grade: ['WHO 5th grading of urothelial & non-urothelial bladder carcinomas', 2, 1],
  cisStatus: ['Urothelial carcinoma in situ (UCIS) vs benign / reactive urothelium', 2, 4],
  extension: ['Urinary bladder staging landmarks (pT1–pT4b)', 4, 0],
  marginStatus: ['Cystectomy surgical margins (ureteral, urethral, soft tissue)', 2, 0]
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

test('bladder_carcinoma galleries: five panels on select fields with open-licence bladder photos and ExpertPath links', () => {
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
      assert.ok(im.src.startsWith('assets/reference/bladder_carcinoma/'), `${im.src} folder`);
      assert.match(im.license, /^CC(0| BY| BY-SA)/, `${im.src} open licence`);
      assert.doesNotMatch(im.license, /\b(NC|ND)\b/, `${im.src} no NC/ND`);
      assert.match(im.url, /^https:\/\//, `${im.src} https source URL`);
      const buf = fs.readFileSync(path.join(root, im.src));
      const size = jpegSize(buf);
      assert.ok(buf.length <= 150 * 1024 && size && size.w <= 900 && size.h <= 900, `${im.src} is JPEG <= 900 px and <= 150 kB`);
    }
  }
  const folder = fs.readdirSync(path.join(root, 'assets/reference/bladder_carcinoma')).map((n) => `assets/reference/bladder_carcinoma/${n}`);
  assert.deepEqual(folder.filter((s) => !used.has(s)), [], 'every bladder_carcinoma photograph is used');
  assert.equal(folder.length, 10, '10 bladder_carcinoma photographs');
  const r = run(one(EXAMPLE, OPTIONS));
  for (const id of Object.keys(GALLERIES)) {
    const ref = t.schema.fields.find((x) => x.id === id).reference;
    for (const txt of [ref.intro, ...ref.groups.flatMap((g) => [...g.points, ...(g.images || []).map((im) => im.caption)])]) {
      assert.ok(!r.report.includes(txt), `"${txt.slice(0, 60)}" reached the printed report`);
    }
  }
});
