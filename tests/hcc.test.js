// Hepatocellular carcinoma resection. Card: docs/roadmap.md "HCC — resection synoptic" (pulled by the user 2026-10-02);
// grounding docs/reference/hcc-morphology.md; element order docs/reference/qmh/hcc.txt. Wording is deliberate; update
// the strings only on purpose. Fixtures: tests/fixtures/hcc/*.json (golden; --update only after a deliberate change).
// The routing lines below are house-style lines, not case text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../src/engine.js';
import { parseSynoptic } from '../src/synoptic.js';
import { deriveTNM } from '../src/staging/index.js';
import { EXTENSION } from '../src/staging/hcc.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { loadAll, loadManifest } from '../src/registry.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.hcc;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const FIX = path.join(here, 'fixtures', 'hcc');
const UPDATE = process.argv.includes('--update');
const BASE = schema.example.parts[0].values;
const run = (over = {}, opts = {}) => generate(schema, t.generator, {
  case: schema.example.case,
  parts: [{ label: 'A', templateId: 'hcc', values: { ...BASE, ...over } }],
  options: { ...schema.example.options, ...opts }
});
const rows = (out) => Object.fromEntries(parseSynoptic(out.synoptic).filter((r) => r.label).map((r) => [r.label, r.value]));
const issuesOf = (r) => r.issues.map((i) => [i.level, i.field, i.message]);
const flat = (s) => s.replace(/\n {2}/g, ' ');
const tnm = (over) => deriveTNM({ ...BASE, ...over }, 'hcc');
const SMALL = 'Present, small vessel invasion';
const LARGE = 'Present, large vessel invasion (major branch of hepatic vein or portal vein)';
const N0 = { nodesExamined: 2, nodesInvolved: 0 };

// ---------- metadata and menus ----------

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has hcc');
  assert.equal(schema.system, 'Hepatobiliary');
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.label, 'HCC');
  assert.equal(schema.organ, 'LIVER');
  assert.equal(schema.shortName, 'Liver · HCC resection');
  assert.equal(schema.style.british, true);
  const planned = JSON.parse(fs.readFileSync(path.join(root, 'templates', 'planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((p) => p.id === 'hcc'), 'no longer a planned card');
  assert.ok(manifest.some((m) => m.id === 'hcc'), 'in the manifest');
});

test('the example: a solitary pT1b HCC on a hepatitis B cirrhosis', () => {
  const r = run();
  assert.equal(r.specimens, 'Liver, segment 6, resection', 'the house word for a partial hepatectomy on the specimen line');
  assert.equal(r.macro, 'Received in formalin is a partial hepatectomy specimen (segment 6) measuring 110 x 80 x 55 mm and weighing 210 g. '
    + 'There is a single tumour measuring 32 x 30 x 28 mm. The tumour is well circumscribed, tan-green and encapsulated, 8 mm from the parenchymal margin. '
    + 'Representative sections are taken; see block key.');
  assert.equal(r.blockKey, '(1-4) Tumour.\n(5) Tumour with nearest parenchymal margin.\n(6) Background liver.');
  assert.equal(r.diagnosis, 'LIVER, segment 6, resection\n- Moderately differentiated HEPATOCELLULAR CARCINOMA\n- Stage pT1b (pTNM, AJCC 8th edition)\n'
    + '- Margin clear\n- CHRONIC HEPATITIS B with CIRRHOSIS (Ishak stage 6/6)');
  const x = rows(r);
  assert.equal(x['Tumour size'], '3.2 cm (largest tumour, greatest dimension)');
  assert.equal(x['Parenchymal margin'], 'Uninvolved by invasive carcinoma, 8 mm');
  assert.equal(x['Regional lymph nodes'], undefined, 'no lymph node section without nodes (Phase 67)');
  assert.equal(x.pTNM, 'pT1b');
  assert.match(r.synoptic, /Additional findings\n- Cirrhosis \(Ishak stage 6\/6\)\n- Chronic hepatitis \(hepatitis B\)/);
  assert.deepEqual(r.issues, []);
});

test('macro option off removes the macro and block key; the heading option prints the LIS headers', () => {
  const off = run({}, { macro: false });
  assert.ok(!off.report.includes('Received in formalin'));
  assert.ok(!off.report.includes('(1-4)'));
  const hdr = run({}, { includeHeader: true });
  assert.match(hdr.report, /^SPECIMEN:\n/);
  assert.match(hdr.report, /MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:/);
  assert.match(hdr.report, /\nDIAGNOSIS:\n/);
});

// ---------- staging (AJCC 8th edition) ----------

test('pT: size, number and vascular invasion', () => {
  assert.equal(tnm({ tumourSizeCm: 2 }).T, 'T1a', '2 cm is T1a');
  assert.equal(tnm({ tumourSizeCm: 2.1 }).T, 'T1b');
  assert.equal(tnm({ tumourSizeCm: 2, vascularInvasion: SMALL }).T, 'T1a', 'vascular invasion does not change T1a');
  assert.equal(tnm({ tumourSizeCm: 4.5, vascularInvasion: SMALL }).T, 'T2');
  assert.equal(tnm({ tumourSizeCm: 4.5, vascularInvasion: 'Present (not otherwise specified)' }).T, 'T2');
  const unassessed = tnm({ tumourSizeCm: 4.5, vascularInvasion: 'Cannot be determined' });
  assert.equal(unassessed.T, 'T1');
  assert.deepEqual(unassessed.notes, ['Vascular invasion not assessed: a solitary tumour larger than 2 cm is pT1b only without it.', 'No regional lymph nodes submitted; pN not assigned.']);
  assert.equal(tnm({ tumourCount: 2, tumourSizeCm: 4 }).T, 'T2');
  assert.equal(tnm({ tumourCount: 2, tumourSizeCm: 5 }).T, 'T2', '5 cm is not larger than 5 cm');
  assert.equal(tnm({ tumourCount: 3, tumourSizeCm: 6.2 }).T, 'T3');
  assert.equal(tnm({ tumourCount: '' }).T, 'TX');
  assert.equal(tnm({ tumourSizeCm: '' }).T, 'TX');
});

test('pT: satellitosis counts as multiple tumours', () => {
  const r = tnm({ satellitosis: 'Present', tumourSizeCm: 6 });
  assert.equal(r.T, 'T3');
  assert.equal(r.notes[0], 'Multiple tumours, at least one larger than 5 cm (satellitosis counts as multiple tumours): pT3.');
  assert.equal(tnm({ satellitosis: 'Present', tumourSizeCm: 1.5 }).T, 'T2', 'a 1.5 cm tumour with satellites is not T1a');
});

test('pT4: major vessels, peritoneum and adjacent organs; the gallbladder does not count', () => {
  for (const ext of [EXTENSION.portal, EXTENSION.hepaticVein, EXTENSION.peritoneum, EXTENSION.diaphragm, EXTENSION.other]) {
    assert.equal(tnm({ tumourExtension: [ext], vascularInvasion: LARGE }).T, 'T4', ext);
  }
  assert.equal(tnm({ vascularInvasion: LARGE }).T, 'T4', 'large vessel invasion alone');
  assert.equal(tnm({ tumourExtension: [EXTENSION.gallbladder] }).T, 'T1b', 'gallbladder invasion leaves the size category');
  assert.equal(tnm({ tumourExtension: [EXTENSION.none] }).T, 'T0');
});

test('pN, pM, the y descriptor and the stage groups', () => {
  assert.equal(tnm({}).N, 'NX');
  assert.equal(tnm(N0).N, 'N0');
  assert.equal(tnm({ nodesExamined: 3, nodesInvolved: 1 }).N, 'N1');
  assert.equal(tnm({ distantMets: ['Non-regional lymph node(s) (specify)'], distantDetail: 'para-aortic' }).M, 'M1');
  assert.equal(tnm({ distantMets: ['Not identified'] }).M, 'M-');
  assert.deepEqual([['T1a', 1.5], ['T1b', 3.2]].map(([, s]) => tnm({ ...N0, tumourSizeCm: s }).stage), ['IA', 'IB']);
  assert.equal(tnm({ ...N0, tumourSizeCm: 4.5, vascularInvasion: SMALL }).stage, 'II');
  assert.equal(tnm({ ...N0, tumourCount: 3, tumourSizeCm: 6.2 }).stage, 'IIIA');
  assert.equal(tnm({ ...N0, tumourExtension: [EXTENSION.portal], vascularInvasion: LARGE }).stage, 'IIIB');
  assert.equal(tnm({ nodesExamined: 3, nodesInvolved: 1 }).stage, 'IVA');
  assert.equal(tnm({ ...N0, distantMets: ['Other (specify)'], distantDetail: 'lung' }).stage, 'IVB');
  assert.equal(tnm({}).stage, null, 'no stage group without pN');
  const treated = tnm({ treatmentEffect: 'Incomplete necrosis (viable tumour present)', necrosisPct: 60, treatment: 'TACE', tumourSizeCm: 1.8 });
  assert.equal(treated.tnm, 'ypT1a');
  const complete = tnm({ treatmentEffect: 'Complete necrosis (no viable tumour)', treatment: 'TACE' });
  assert.equal(complete.tnm, 'ypT0');
  assert.equal(tnm({ recurrent: true }).tnm, 'rpT1b');
});

// ---------- printed text ----------

test('diagnosis lines: subtype, multiplicity, fibrolamellar and the treated nodule', () => {
  const dx = (v) => flat(run(v).diagnosis).split('\n')[1];
  assert.equal(dx({ tumourCount: 3, tumourSizeCm: 6.2, tumourDims: '', otherSizesCm: '2.1, 1.4', histType: 'Hepatocellular carcinoma, macrotrabecular-massive' }),
    '- Moderately differentiated HEPATOCELLULAR CARCINOMA, macrotrabecular-massive subtype, multifocal (three tumours)');
  assert.equal(dx({ histType: 'Hepatocellular carcinoma, fibrolamellar', grade: 'Not applicable' }), '- FIBROLAMELLAR CARCINOMA');
  assert.equal(dx({ grade: 'G3: Poorly differentiated' }), '- Poorly differentiated HEPATOCELLULAR CARCINOMA');
  assert.equal(dx({ procedure: 'Wedge resection', segments: ['Segment 3'], tumourSizeCm: 2.4, treatmentEffect: 'Complete necrosis (no viable tumour)', treatment: 'TACE', grade: 'Not applicable' }),
    '- COMPLETELY NECROTIC NODULE after TACE, consistent with treated HEPATOCELLULAR CARCINOMA; no viable tumour');
  const partial = flat(run({ treatmentEffect: 'Incomplete necrosis (viable tumour present)', necrosisPct: 60, treatment: 'TACE', tumourSizeCm: 1.8 }).diagnosis);
  assert.match(partial, /\n- Treatment effect: incomplete necrosis \(60%\) after TACE\n- Stage ypT1a \(pTNM, AJCC 8th edition\)\n/);
});

test('node-positive and margin lines', () => {
  const r = run({ nodesExamined: 3, nodesInvolved: 1, ene: 'Not identified', parenchymalMargin: 'Involved by invasive carcinoma', parenchymalMarginMm: '' });
  assert.match(r.diagnosis, /\n- Stage pT1b pN1 \(pTNM, AJCC 8th edition\)\n- Margin involved\n- 1 of 3 regional lymph nodes involved\n/);
  assert.equal(rows(r)['Stage group (if cM0)'], 'IVA');
});

test('synoptic element order follows the QMH GI-HCC page (docs/reference/qmh/hcc.txt), house exceptions noted', () => {
  const QMH = ['Histologic type', 'Histologic grade', 'Tumour extension', 'Satellitosis', 'Vascular invasion', 'Perineural invasion', 'Treatment effect',
    'Parenchymal margin', 'Other margin(s)', 'Regional lymph nodes', 'Distant metastasis', 'pTNM'];
  const page = fs.readFileSync(path.join(root, 'docs', 'reference', 'qmh', 'hcc.txt'), 'utf8');
  for (const h of ['Histologic Type', 'Histologic Grade', 'Tumor Extension', 'Satellitosis', 'Vascular Invasion', 'Perineural Invasion', 'Treatment Effect']) {
    assert.ok(page.toLowerCase().includes(h.toLowerCase()), `${h} is on the saved QMH page`);
  }
  const ours = Object.keys(rows(run({ otherMargin: 'Uninvolved by invasive carcinoma (specify distance)', otherMarginDetail: 'hepatic vein', otherMarginMm: 12, ...N0 }, { printNodesMets: true })));
  let cursor = -1;
  for (const label of QMH) {
    const idx = ours.indexOf(label);
    assert.ok(idx > cursor, `${label} out of QMH order (index ${idx} after ${cursor}); rows: ${ours.join(' | ')}`);
    cursor = idx;
  }
  // House exceptions: the "Specimen and tumour" section (procedure, site, focality, size) above the microscopic
  // elements; Tumour histology directly after the grade (as in the lung, ovary and endometrium templates).
  assert.ok(ours.indexOf('Tumour size') < ours.indexOf('Histologic type'));
  assert.equal(ours.indexOf('Tumour histology'), ours.indexOf('Histologic grade') + 1);
});

// ---------- Checks ----------

test('Checks: vessels, satellites and the grade', () => {
  const only = (v) => issuesOf(run(v));
  assert.deepEqual(only({ tumourExtension: [EXTENSION.portal] }).filter((i) => i[0] === 'error'),
    [['error', 'vascularInvasion', 'A major portal or hepatic vein branch is ticked under Tumour extension, but vascular invasion is "Not identified".']]);
  assert.ok(only({ vascularInvasion: LARGE }).some((i) => i[0] === 'warn' && i[1] === 'tumourExtension' && /tick the portal vein or hepatic vein box/.test(i[2])));
  assert.ok(only({ tumourExtension: [EXTENSION.hepaticVein], vascularInvasion: LARGE }).some((i) => i[0] === 'info' && /right, middle or left hepatic vein/.test(i[2])));
  assert.ok(only({ satellitosis: 'Present' }).some((i) => i[1] === 'satellitosis' && i[2] === 'Satellitosis counts as multiple tumours for pT (AJCC 8th edition).'));
  assert.ok(only({ tumourSizeCm: 4.5, vascularInvasion: 'Cannot be determined' }).some((i) => i[0] === 'warn' && /decides pT1b or pT2/.test(i[2])));
  assert.ok(only({ treatmentEffect: 'Complete necrosis (no viable tumour)', treatment: 'TACE' }).some((i) => i[0] === 'warn' && i[1] === 'grade'));
  assert.ok(only({ histType: 'Hepatocellular carcinoma, fibrolamellar' }).some((i) => i[0] === 'info' && i[1] === 'grade' && /CAP gives no grading guidance/.test(i[2])));
  assert.ok(only({ treatmentEffect: 'Incomplete necrosis (viable tumour present)', treatment: 'TACE' }).some((i) => i[1] === 'necrosisPct'));
  assert.ok(only({ nodesExamined: 3, nodesInvolved: 1 }).some((i) => i[0] === 'info' && i[1] === 'ene'));
  assert.ok(only({ nodesExamined: 1, nodesInvolved: 2 }).some((i) => i[0] === 'error' && /exceed/.test(i[2])));
  assert.ok(only({ tumourCount: 3, tumourSizeCm: 4, otherSizesCm: '5.5' }).some((i) => i[0] === 'error' && /larger than the largest/.test(i[2])));
  assert.ok(only({ tumourSizeCm: 4.5 }).some((i) => i[0] === 'warn' && i[2] === 'Largest tumour 4.5 cm does not match its gross dimensions (32 x 30 x 28 mm).'));
  assert.ok(!only({ tumourSizeCm: 2.1, treatmentEffect: 'Incomplete necrosis (viable tumour present)', necrosisPct: 40, treatment: 'TACE' }).some((i) => /gross dimensions/.test(i[2])), 'a treated tumour stages its viable size');
});

// ---------- galleries ----------

test('reference galleries sit on the type, grade, satellite, vessel and treatment fields, each image sourced and under 150 kB', () => {
  const withGallery = schema.fields.filter((f) => f.reference).map((f) => f.id);
  assert.deepEqual(withGallery, ['histType', 'grade', 'satellitosis', 'vascularInvasion', 'treatmentEffect']);
  const used = new Set();
  for (const f of schema.fields.filter((x) => x.reference)) {
    for (const g of f.reference.groups) {
      assert.ok(g.points.length, `${f.id} ${g.heading} has points`);
      for (const im of g.images || []) {
        used.add(im.src);
        assert.match(im.license, /^CC(0| BY| BY-SA)/, `${im.src} licence`);
        assert.ok(!/NC|ND/.test(im.license), `${im.src} is not NC/ND`);
        assert.match(im.url, /^https:\/\//, `${im.src} links its article`);
        assert.ok(im.credit && im.caption, `${im.src} is credited and captioned`);
        assert.ok(fs.existsSync(path.join(root, im.src)), `${im.src} exists`);
        assert.ok(fs.statSync(path.join(root, im.src)).size <= 150 * 1024, `${im.src} is at most 150 kB`);
      }
    }
  }
  const own = fs.readdirSync(path.join(root, 'assets', 'reference', 'hcc')).map((f) => `assets/reference/hcc/${f}`);
  assert.deepEqual(own.filter((f) => !used.has(f)), [], 'every HCC gallery file is shown');
  assert.equal(own.length, 9);
  assert.ok([...used].filter((s) => s.startsWith('assets/reference/liver_lesion_biopsy/')).length === 3, 'G1 to G3 reuse the biopsy images');
});

// ---------- intake ----------

const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line, history = '') => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
};

test('intake: HCC resections open the synoptic; a wedge for ?metastasis stays benign', () => {
  for (const [line, history] of [['Liver, segment 6, resection, HCC', ''], ['Right hepatectomy, ?HCC', ''], ['Liver, segment 6, resection', 'HCC'],
    ['Segment 7, segmentectomy, hepatoma', ''], ['Liver, explant, HCC', '']]) {
    const r = route(line, history);
    assert.deepEqual([r.templateId, r.tier], ['hcc', 'confident'], `${line} [${history}]`);
  }
  assert.equal(route('Liver, wedge resection, ?metastasis').templateId, 'liver_benign');
  assert.equal(route('Liver, segment 6, wedge resection', 'Liver haemangioma').templateId, 'liver_benign');
});

test('intake: the segment and the procedure fill from the specimen line', () => {
  assert.deepEqual(preset('Liver, segment 6, resection, HCC'), { segments: ['Segment 6'] });
  assert.deepEqual(preset('Right hepatectomy, ?HCC'), { specimenName: 'Liver, right hepatectomy', procedure: 'Partial hepatectomy, major (3 segments or more)' });
  assert.deepEqual(preset('Left lateral sectionectomy', 'HCC'), { specimenName: 'Liver, left lateral sectionectomy', procedure: 'Partial hepatectomy, minor (less than 3 segments)' });
  assert.deepEqual(preset('Segment 7, segmentectomy, hepatoma'), { segments: ['Segment 7'], procedure: 'Partial hepatectomy, minor (less than 3 segments)' });
  assert.deepEqual(preset('Liver, explant, HCC'), { procedure: 'Total hepatectomy' });
  assert.deepEqual(preset('Liver, S6, wedge resection', 'HCC'), { procedure: 'Wedge resection' });
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-solitary-pt1b-example', {}],
  ['02-pt2-microvascular-invasion', { tumourSizeCm: 4.5, tumourDims: '45 x 40 x 38', vascularInvasion: SMALL, vascularDetail: 'largest nodule', grade: 'G3: Poorly differentiated' }],
  ['03-multiple-pt3-macrotrabecular', { tumourCount: 3, tumourSizeCm: 6.2, tumourDims: '', otherSizesCm: '2.1, 1.4', satellitosis: 'Present', vascularInvasion: SMALL, histType: 'Hepatocellular carcinoma, macrotrabecular-massive' }],
  ['04-pt4-portal-vein', { tumourSizeCm: 8, tumourDims: '80 x 70 x 65', grossDetails: 'the tumour is ill defined and reaches the parenchymal margin; tumour thrombus fills the right portal vein', tumourExtension: [EXTENSION.portal], vascularInvasion: LARGE, parenchymalMargin: 'Involved by invasive carcinoma', parenchymalMarginMm: '',
    nodesExamined: 2, nodesInvolved: 0, bgFindings: ['Steatohepatitis', 'Fibrosis (specify extent, providing name of the scheme and assessment scale used)'], bgStageSystem: 'NASH CRN', bgStage: '3', bgSteatosisPct: 30 }],
  ['05-complete-necrosis-after-tace', { procedure: 'Wedge resection', segments: ['Segment 3'], specimenDims: '60 x 40 x 30', specimenWeight: 35, tumourSizeCm: 2.4, tumourDims: '24 x 22 x 20', grossDetails: 'the nodule is well circumscribed, yellow and necrotic, 6 mm from the parenchymal margin', parenchymalMarginMm: 6, treatmentEffect: 'Complete necrosis (no viable tumour)', treatment: 'TACE', grade: 'Not applicable' }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, over] of CASES) {
    const out = run(over);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'hcc', values: over, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
