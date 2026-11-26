// Radical prostatectomy synoptic (QMH UG-Prostate, CAP Prostate 4.3.0.0, WHO 5th edition 2022, AJCC 8th edition).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'prostate_radical');
const UPDATE = process.env.UPDATE_FIXTURES === '1';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.prostate_radical;
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

test('prostate_radical: registered under GU, labelled Prostatectomy, placeholder retired', () => {
  assert.ok(t, 'registry has prostate_radical');
  assert.equal(t.schema.system, 'GU');
  assert.equal(t.schema.kind, 'cancer resection');
  assert.equal(t.schema.label, 'Prostatectomy');
  assert.equal(t.schema.organ, 'PROSTATE');
  assert.ok(!planned.planned.some((p) => p.id === 'prostate_radical'), 'placeholder removed from planned.json');
  assert.ok(manifest.some((m) => m.id === 'prostate_radical'), 'present in manifest.json');
});

test('prostate_radical: example renders Grade Group 2 organ-confined pT2 pN0 radical prostatectomy', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true, printPTNM: true };
  const r = run(c);
  assert.match(r.report, /SPECIMEN:/);
  assert.match(r.report, /MACROSCOPIC DESCRIPTION:/);
  assert.match(r.report, /MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:/);
  assert.match(r.report, /DIAGNOSIS:/);
  assert.match(r.synoptic, /- Histologic grade: Grade Group 2 \(Gleason score 3 \+ 4 = 7\)/);
  assert.match(r.synoptic, /- Percentage of pattern 4: 25%/);
  assert.match(r.synoptic, /- pTNM: pT2 pN0/);
  assert.match(r.diagnosis, /PROSTATE AND SEMINAL VESICLES, radical prostatectomy:/);
  assert.match(r.diagnosis, /- ACINAR ADENOCARCINOMA, Grade Group 2 \(Gleason score 3 \+ 4 = 7\)/);
  assert.match(r.diagnosis, /- Surgical margins clear/);
  assert.match(r.diagnosis, /- pT2 pN0 \(AJCC 8th edition\)\./);
});

const PT3A_POS_MARGIN = {
  ...EXAMPLE,
  primary: '4',
  secondary: '3',
  tertiary: '5',
  pctPattern4: '65',
  pctPattern5: '3',
  idcp: 'Present, IDC not incorporated in grade',
  cribriform: 'Present',
  pctProstate: '30',
  dominantNoduleMm: '22',
  dominantNoduleDims: '22 x 16 x 14',
  dominantNoduleSite: 'right posterolateral peripheral zone',
  epe: 'Present, nonfocal',
  epeLocations: ['Right posterolateral (neurovascular bundle)', 'Right posterior'],
  bladderNeck: 'Not identified',
  svi: 'Not identified',
  lvi: 'Present',
  pni: 'Present',
  marginStatus: 'Involved by invasive carcinoma, non-limited (>= 3 mm)',
  marginLinearMm: '4.5',
  marginFocality: 'Unifocal',
  marginLocations: ['Right posterolateral (neurovascular bundle)'],
  marginEpe: 'Present',
  marginGleason: 'Pattern 4 or 5',
  nodesExamined: '14',
  nodesInvolved: '0'
};

test('prostate_radical: pT3a with minor tertiary pattern 5, cribriform, IDC-P and positive margin', () => {
  const r = run(one(PT3A_POS_MARGIN));
  assert.match(r.synoptic, /Grade Group 3 \(Gleason score 4 \+ 3 = 7\) with minor \(tertiary\) pattern 5/);
  assert.match(r.synoptic, /- Extraprostatic extension \(EPE\): Present, nonfocal/);
  assert.match(r.synoptic, /- Surgical margins: Involved by invasive carcinoma, non-limited \(>= 3 mm\)/);
  assert.match(r.synoptic, /- pTNM: pT3a pN0/);
  assert.match(r.diagnosis, /Surgical margin involved by carcinoma \(4\.5 mm, right posterolateral\s+\(neurovascular bundle\)\)/);
});

const PT3B_PN1 = {
  ...EXAMPLE,
  primary: '4',
  secondary: '5',
  tertiary: '',
  pctPattern4: '60',
  pctPattern5: '35',
  idcp: 'Present, IDC incorporated in grade',
  cribriform: 'Present',
  pctProstate: '45',
  dominantNoduleMm: '28',
  dominantNoduleDims: '28 x 22 x 18',
  dominantNoduleSite: 'left base and mid gland',
  epe: 'Present, nonfocal',
  epeLocations: ['Left posterior', 'Left bladder neck'],
  bladderNeck: 'Present',
  svi: 'Present, left',
  lvi: 'Present',
  pni: 'Present',
  marginStatus: 'Uninvolved by invasive carcinoma',
  nodesExamined: '16',
  nodesInvolved: '2',
  nodeSites: 'left obturator and left external iliac',
  ene: 'Present',
  largestDepositMm: '6',
  largestNodeMm: '14'
};

test('prostate_radical: Grade Group 5 with seminal vesicle invasion and nodal metastasis -> pT3b pN1 (Stage IVA in Checks)', () => {
  const r = run(one(PT3B_PN1));
  assert.match(r.synoptic, /- pTNM: pT3b pN1/);
  assert.match(r.diagnosis, /2 of 16 regional lymph nodes involved; extranodal extension present/);
  assert.ok(r.issues.some((x) => x.level === 'info' && /Stage IVA/.test(x.message)));
});

test('prostate_radical: Gleason arithmetic, margin-EPE consistency and node checks', () => {
  const badPct4 = checksOf({ ...EXAMPLE, primary: '3', secondary: '4', pctPattern4: '60' });
  assert.ok(badPct4.some((x) => x.level === 'warn' && /implies 4\+3=7/.test(x.message)));

  const badTert = checksOf({ ...EXAMPLE, primary: '4', secondary: '4', tertiary: '3' });
  assert.ok(badTert.some((x) => x.level === 'warn' && /higher than both/.test(x.message)));

  const badMarginEpe = checksOf({
    ...EXAMPLE,
    epe: 'Not identified',
    marginStatus: 'Involved by invasive carcinoma, limited (< 3 mm)',
    marginLocations: ['Right apical'],
    marginEpe: 'Present'
  });
  assert.ok(badMarginEpe.some((x) => x.level === 'warn' && /Extraprostatic extension is recorded as Not identified/.test(x.message)));

  const nodeErr = checksOf({ ...EXAMPLE, nodesExamined: '5', nodesInvolved: '7' });
  assert.ok(nodeErr.some((x) => x.level === 'error' && /exceeds/.test(x.message)));
});

test('prostate_radical: intake routes radical prostatectomies and keeps biopsies separate', () => {
  assert.equal(route('(A) Prostate and seminal vesicles, radical prostatectomy', 'Prostatic adenocarcinoma').templateId, 'prostate_radical');
  assert.equal(preset('(A) Prostate, robotic radical prostatectomy', 'Gleason 3+4').procedure, 'Radical prostatectomy');
  assert.equal(route('(A) Prostate, right base, TRUS core biopsy', 'Raised PSA').templateId, 'prostate_biopsy');
});

// ---------- golden reports ----------

const CASES = [
  ['01-rp-gg2-pt2-pn0', 'radical prostatectomy for conventional acinar adenocarcinoma Grade Group 2 (3+4=7), organ confined, margins clear, 10 negative pelvic nodes, pT2 pN0 (example)', EXAMPLE],
  ['02-rp-gg3-tertiary5-pt3a-pos-margin', 'radical prostatectomy for Grade Group 3 (4+3=7) with minor tertiary pattern 5, cribriform, IDC-P, nonfocal EPE, positive right posterolateral margin 4.5 mm, pT3a pN0', PT3A_POS_MARGIN],
  ['03-rp-gg5-svi-pt3b-pn1', 'radical prostatectomy for Grade Group 5 (4+5=9) with left seminal vesicle invasion, microscopic bladder neck invasion, 2/16 positive pelvic nodes with ENE, pT3b pN1', PT3B_PN1]
];

for (const [name, description, values] of CASES) {
  test(`golden: ${name}`, () => {
    const r = run(one(values, OPTIONS));
    const file = path.join(FIX, `${name}.json`);
    const current = { description, templateId: 'prostate_radical', options: OPTIONS, values: [values], report: r.report, checks: r.issues };
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
  histType: ['Prostate carcinoma types (WHO 5th edition)', 4, 3],
  primary: ['Gleason patterns 3, 4 and 5 (radical prostatectomy)', 4, 10],
  cribriform: ['Cribriform pattern 4 (ISUP / WHO 5th)', 3, 4],
  idcp: ['Intraductal carcinoma of the prostate (IDC-P)', 2, 4],
  epe: ['Extraprostatic extension (pT3a) and seminal vesicle invasion (pT3b)', 3, 3],
  marginStatus: ['Radical prostatectomy surgical margins (CAP 4.3.0.0)', 3, 0]
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

test('prostate_radical galleries: six panels on select fields with open-licence prostate photos and ExpertPath links', () => {
  const root = path.join(here, '..');
  const usedNew = new Set();
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
      if (im.src.startsWith('assets/reference/prostate_radical/')) usedNew.add(im.src);
      assert.ok(im.src.startsWith('assets/reference/prostate'), `${im.src} folder`);
      assert.match(im.license, /^(CC0|CC BY|Public domain|NIH|TCGA|Open access)/i, `${im.src} open licence`);
      assert.match(im.url, /^https:\/\//, `${im.src} https source URL`);
      const buf = fs.readFileSync(path.join(root, im.src));
      const size = jpegSize(buf);
      assert.ok(buf.length <= 150 * 1024 && size && size.w <= 900 && size.h <= 900, `${im.src} is JPEG <= 900 px and <= 150 kB`);
    }
  }
  const folder = fs.readdirSync(path.join(root, 'assets/reference/prostate_radical')).map((n) => `assets/reference/prostate_radical/${n}`);
  assert.deepEqual(folder.filter((s) => !usedNew.has(s)), [], 'every new prostate_radical photograph is used');
  assert.equal(folder.length, 3, '3 new prostate_radical photographs');
  const r = run(one(EXAMPLE, OPTIONS));
  for (const id of Object.keys(GALLERIES)) {
    const ref = t.schema.fields.find((x) => x.id === id).reference;
    for (const txt of [ref.intro, ...ref.groups.flatMap((g) => [...g.points, ...(g.images || []).map((im) => im.caption)])]) {
      assert.ok(!r.report.includes(txt), `"${txt.slice(0, 60)}" reached the printed report`);
    }
  }
});
