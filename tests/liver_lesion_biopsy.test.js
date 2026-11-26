// Liver biopsy (mass lesion). Card: docs/roadmap.md "Liver biopsy — neoplastic" (pulled by the user 2026-10-02);
// grounding docs/reference/liver_lesion_biopsy-morphology.md. Wording is deliberate; update the strings only on
// purpose. Fixtures: tests/fixtures/liver_lesion_biopsy/*.json (golden; --update only after a deliberate change).
// The routing lines below are house-style lines, not case text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { rowGroups } from '../src/picker.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { parseIhc, stainName } from '../generators/liver_lesion_biopsy.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.liver_lesion_biopsy;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const FIX = path.join(here, 'fixtures', 'liver_lesion_biopsy');
const UPDATE = process.argv.includes('--update');
const EXAMPLE = schema.example.parts[0].values;
const one = (values) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};
const run = (values) => generate(schema, t.generator, one(values));
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const issuesOf = (r) => r.issues.map((i) => [i.level, i.field, i.message]);
const SPEC = { specimenName: 'segment 7 mass', cores: 2, coreLength: 20 };

// ---------- metadata and menus ----------

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has liver_lesion_biopsy');
  assert.equal(schema.system, 'Hepatobiliary');
  assert.equal(schema.kind, 'biopsy');
  assert.equal(schema.label, 'Liver (mass)');
  assert.equal(schema.organ, 'LIVER');
  assert.ok(schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
  assert.equal(schema.style.british, true);
});

test('it sits with the medical biopsies, straight after the medical liver form', () => {
  const planned = JSON.parse(fs.readFileSync(path.join(root, 'templates', 'planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((p) => p.id === 'liver_lesion_biopsy'), 'not in planned.json');
  const group = rowGroups(manifest, planned, 'top').find((g) => g.items.some((i) => i.id === 'liver_lesion_biopsy'));
  assert.equal(group.system, 'Medical', 'Hepatobiliary biopsies fold into Medical');
  const ids = group.items.map((i) => i.id);
  assert.equal(ids.indexOf('liver_lesion_biopsy'), ids.indexOf('liver_biopsy') + 1);
  assert.ok(!group.items.find((i) => i.id === 'liver_lesion_biopsy').planned, 'a built template, not a pending one');
});

test('the example case renders every expected block', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, t.generator, c);
  for (const heading of [/SPECIMENS?:/, /MICROSCOPIC EXAMINATION:/, /DIAGNOSIS:/]) assert.match(r.report, heading);
});

test('the example: HCC on a hepatitis B cirrhosis, with the stains in one paragraph', () => {
  const r = run(EXAMPLE);
  assert.equal(r.specimens, 'Liver, segment 7 mass, biopsy');
  assert.equal(r.microscopy, 'Sections show two cores of liver measuring 22 mm in aggregate length. '
    + 'The cores are infiltrated by moderately differentiated hepatocellular carcinoma. The tumour cells are hepatocyte-like, with moderate nuclear atypia, '
    + 'and grow in thickened trabeculae and pseudoglandular structures. On immunohistochemistry, the tumour cells are positive for HepPar-1, arginase-1 and '
    + 'glypican-3, and negative for CK7 and CK19. CD34 shows diffuse sinusoidal staining. There is loss of the reticulin framework. '
    + 'The background liver shows chronic hepatitis B. There is cirrhosis (Ishak stage 6/6).');
  assert.equal(r.diagnosis, 'LIVER, segment 7 mass, biopsy - Moderately differentiated HEPATOCELLULAR CARCINOMA; background liver shows CHRONIC HEPATITIS B with CIRRHOSIS (Ishak stage 6/6)');
  assert.deepEqual(r.issues, []);
});

// ---------- specimen ----------

test('the site is written without "liver" or "biopsy"', () => {
  for (const [name, spec] of [['', 'Liver, biopsy'], ['segment 7 mass', 'Liver, segment 7 mass, biopsy'], ['S8 lesion', 'Liver, S8 lesion, biopsy']]) {
    const r = run({ ...EXAMPLE, specimenName: name });
    assert.equal(r.specimens, spec, name);
    assert.ok(r.diagnosis.startsWith(`${spec.replace(/^Liver/, 'LIVER')} - `), `${name}: ${r.diagnosis}`);
  }
});

// ---------- immunohistochemistry ----------

test('typed immunohistochemistry is read in the usual shorthand forms', () => {
  const read = (s) => parseIhc(s).results.map((x) => [x.name, x.result]);
  assert.deepEqual(read('HepPar-1+, arginase-1+, glypican-3+, CK7-, CK19-'), [['HepPar-1', 'pos'], ['arginase-1', 'pos'], ['glypican-3', 'pos'], ['CK7', 'neg'], ['CK19', 'neg']]);
  assert.deepEqual(read('positive for CK20, CDX2 and SATB2; negative for CK7'), [['CK20', 'pos'], ['CDX2', 'pos'], ['SATB2', 'pos'], ['CK7', 'neg']]);
  assert.deepEqual(read('CK7, CK19 negative'), [['CK7', 'neg'], ['CK19', 'neg']]);
  assert.deepEqual(read('glypican-3 focal, GPC3 focally positive, HSP70 weak'), [['glypican-3', 'focal'], ['HSP70', 'weak']]);
  assert.deepEqual(read('MLH1 retained, PMS2 lost'), [['MLH1', 'retained'], ['PMS2', 'lost']]);
  assert.deepEqual(parseIhc('CAMTA1+ (nuclear)').results, [{ name: 'CAMTA1', result: 'pos', note: '(nuclear)' }]);
  assert.equal(parseIhc('Ki-67 8%').ki67, 8);
  assert.deepEqual(parseIhc('patchy CK7').unparsed, ['patchy CK7'], 'an unreadable token is kept as typed');
  assert.equal(stainName('gpc3'), 'glypican-3');
});

test('an unreadable stain prints as typed and raises a Check', () => {
  const r = run({ ...SPEC, dx: 'Metastatic adenocarcinoma', ihc: 'CK20+, patchy CK7' });
  assert.match(r.microscopy, /positive for CK20\. Patchy CK7\./);
  assert.deepEqual(issuesOf(r).filter((i) => i[1] === 'ihc'), [['info', 'ihc', 'Immunohistochemistry printed as typed: patchy CK7.']]);
});

// ---------- diagnosis lines ----------

test('diagnosis lines follow the house forms for each entity', () => {
  const dx = (v) => run({ ...SPEC, ...v }).diagnosis.replace('LIVER, segment 7 mass, biopsy - ', '');
  assert.equal(dx({ dx: 'Metastatic adenocarcinoma', primarySite: 'Colorectal', ihc: 'CK20+, CDX2+' }), 'METASTATIC ADENOCARCINOMA, in keeping with colorectal primary');
  assert.equal(dx({ dx: 'Metastatic adenocarcinoma', primarySite: 'Colorectal', primaryBasis: 'Consistent with the known' }), 'METASTATIC ADENOCARCINOMA, consistent with the known colorectal primary');
  assert.equal(dx({ dx: 'Metastatic adenocarcinoma' }), 'METASTATIC ADENOCARCINOMA');
  assert.equal(dx({ dx: 'Metastatic neuroendocrine tumour', netGrade: 'Grade 2', ki67: 8, ihc: 'synaptophysin+, chromogranin+', primarySite: 'Small intestinal' }), 'METASTATIC WELL-DIFFERENTIATED NEUROENDOCRINE TUMOUR, grade 2, in keeping with small intestinal primary');
  assert.equal(dx({ dx: 'Intrahepatic cholangiocarcinoma', ccaType: 'Small duct type' }), 'INTRAHEPATIC CHOLANGIOCARCINOMA, small duct type');
  assert.equal(dx({ dx: 'Hepatocellular adenoma', hcaSubtype: 'Inflammatory', ihc: 'SAA+', gs: 'Patchy' }), 'HEPATOCELLULAR ADENOMA, inflammatory subtype');
  assert.equal(dx({ dx: 'Hepatocellular adenoma', hcaSubtype: 'Beta-catenin-activated, exon 3', gs: 'Diffuse strong' }), 'HEPATOCELLULAR ADENOMA, beta-catenin-activated subtype (exon 3)');
  assert.equal(dx({ dx: 'Fibrolamellar carcinoma', ihc: 'CK7+, CD68+' }), 'FIBROLAMELLAR CARCINOMA');
  assert.equal(dx({ dx: 'Hepatocellular carcinoma', qualifier: 'Suspicious for' }), 'Suspicious for HEPATOCELLULAR CARCINOMA');
  assert.equal(dx({ dx: 'Other (specify)', dxOther: 'Inflammatory pseudotumour' }), 'INFLAMMATORY PSEUDOTUMOUR');
});

test('"Suspicious for" prints only before a malignant diagnosis', () => {
  const r = run({ ...SPEC, dx: 'Focal nodular hyperplasia', qualifier: 'Suspicious for', gs: 'Map-like' });
  assert.equal(r.diagnosis, 'LIVER, segment 7 mass, biopsy - FOCAL NODULAR HYPERPLASIA');
  assert.deepEqual(issuesOf(r), [['info', 'qualifier', '"Suspicious for" applies to malignant diagnoses only, so it is not printed here.']]);
});

test('a suspicious HCC opens on the atypical focus, and the stains describe the atypical cells', () => {
  const r = run({ ...SPEC, dx: 'Hepatocellular carcinoma', qualifier: 'Suspicious for', hccGrade: 'Well differentiated', ihc: 'glypican-3 focal' });
  assert.match(r.microscopy, /The cores contain a limited focus of atypical cells, suspicious for hepatocellular carcinoma\. On immunohistochemistry, the atypical cells are focally positive for glypican-3\./);
});

// ---------- Checks ----------

test('Checks: neuroendocrine markers and the Ki-67 grade', () => {
  const r = run({ ...SPEC, dx: 'Metastatic neuroendocrine tumour', netGrade: 'Grade 1', ki67: 8, ihc: 'synaptophysin+, CD56+' });
  assert.deepEqual(issuesOf(r), [
    ['info', 'primarySite', 'Primary site not stated: the diagnosis line prints without one.'],
    ['warn', 'ihc', 'Neuroendocrine differentiation: WHO 6th edition asks for at least two neuroendocrine markers, preferably including synaptophysin, chromogranin or INSM1 (CD56 does not count).'],
    ['warn', 'netGrade', 'Ki-67 8% does not match grade 1 (WHO: grade 1 below 3%, grade 2 3-20%, grade 3 above 20%).']
  ]);
});

test('Checks: the stains each entity rests on', () => {
  const only = (v) => issuesOf(run({ ...SPEC, ...v }));
  assert.deepEqual(only({ dx: 'Epithelioid haemangioendothelioma', ihc: 'ERG+, CD31+' }), [['warn', 'ihc', 'EHE: CAMTA1 or TFE3 is not recorded; the diagnosis rests on morphology with both stains.']]);
  assert.deepEqual(only({ dx: 'Hepatocellular adenoma' }), [['warn', 'gs', 'Hepatocellular adenoma: glutamine synthetase is not recorded; beta-catenin activation is recognised only by glutamine synthetase or molecular testing.']]);
  assert.deepEqual(only({ dx: 'Hepatocellular carcinoma', hccGrade: 'Poorly differentiated', ihc: 'AE1/AE3+' }), [['warn', 'ihc', 'Poorly differentiated HCC: no hepatocellular marker (HepPar-1, arginase-1 or glypican-3) is recorded as positive.']]);
  assert.deepEqual(only({ dx: 'Metastatic adenocarcinoma', primarySite: 'Colorectal', ihc: 'CK7-' }), [['warn', 'ihc', 'Colorectal primary: none of CK20, CDX2 and SATB2 is recorded as positive.']]);
  assert.deepEqual(only({ dx: 'Hepatocellular adenoma', hcaSubtype: 'Beta-catenin-activated, exon 3', gs: 'Diffuse strong', betaCatenin: 'Nuclear staining' }), [['info', 'hcaSubtype', 'Exon 3 beta-catenin activation carries the increased risk of malignant transformation (RCPath G050).']]);
  assert.deepEqual(only({ dx: 'Focal nodular hyperplasia', gs: 'Diffuse strong' }), [['warn', 'gs', 'Glutamine synthetase "Diffuse strong" is not the map-like pattern of FNH.']]);
  assert.match(only({ dx: 'Intrahepatic cholangiocarcinoma' })[0][2], /cannot reliably separate .* conserve tissue for FGFR2 fusion testing \(RCPath G050\)\.$/);
  assert.deepEqual(only({ dx: 'Hepatocellular carcinoma', hccGrade: 'Well differentiated', ihc: 'glypican-3+', gs: 'Diffuse strong' }), [], 'two of the three markers support a well-differentiated HCC');
});

test('Checks: a biopsy without the lesion asks for levels and a comment', () => {
  const r = run({ ...SPEC, dx: 'Non-lesional liver only' });
  assert.deepEqual(issuesOf(r), [['info', 'dx', 'No viable lesional tissue: RCPath asks for deeper levels before reporting this, and for the report to say that further biopsy or investigation is needed (add it as a comment).']]);
});

// ---------- background liver ----------

test('the background-liver fields match the HCC resection form', () => {
  const hcc = registry.hcc.schema;
  const strip = (f) => { const { default: _d, showIf: _s, group: _g, ...rest } = f; return rest; };
  const bg = (s) => s.fields.filter((f) => f.id.startsWith('bg')).map(strip);
  assert.deepEqual(bg(schema).map((f) => f.id), ['bgFindings', 'bgStageSystem', 'bgStage', 'bgAetiology', 'bgAetiologyOther', 'bgSteatosisPct', 'bgOther']);
  assert.deepEqual(bg(schema), bg(hcc));
});

test('no background liver in the cores is said once, and its findings are not offered', () => {
  const r = run({ ...SPEC, dx: 'Metastatic adenocarcinoma', nonLesional: 'Not identified', bgFindings: ['Cirrhosis'] });
  assert.match(r.microscopy, /No non-lesional liver is present\.$/);
  assert.doesNotMatch(r.diagnosis, /background/i);
});

// ---------- galleries ----------

test('reference galleries sit on the diagnosis, grade, adenoma and stain fields, each image sourced and under 150 kB', () => {
  const withGallery = schema.fields.filter((f) => f.reference).map((f) => f.id);
  assert.deepEqual(withGallery, ['dx', 'hccGrade', 'hcaSubtype', 'reticulin']);
  const used = new Set();
  for (const f of schema.fields.filter((x) => x.reference)) {
    for (const g of f.reference.groups) {
      assert.ok(g.points.length, `${f.id} ${g.heading} has points`);
      for (const im of g.images || []) {
        used.add(path.basename(im.src));
        assert.match(im.license, /^(CC0|CC BY|Public domain|NIH|TCGA|Open access)/i, `${im.src} licence`);
        assert.match(im.url, /^https:\/\//, `${im.src} links its article`);
        assert.ok(im.credit && im.caption, `${im.src} is credited and captioned`);
        assert.ok(fs.statSync(path.join(root, im.src)).size <= 150 * 1024, `${im.src} is at most 150 kB`);
      }
    }
  }
  const files = fs.readdirSync(path.join(root, 'assets', 'reference', 'liver_lesion_biopsy'));
  assert.deepEqual(files.filter((f) => !used.has(f)), [], 'every gallery file is shown');
  assert.equal(used.size, 15);
});

// ---------- intake ----------

const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line, history = '') => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
};

test('intake: targeted liver lines open the mass form; a random biopsy stays medical', () => {
  for (const [line, history] of [['Liver, segment 7 mass, core biopsy', ''], ['Liver, ?HCC, core biopsy', ''], ['Liver, ?metastasis, biopsy', ''],
    ['Liver, segment 7 mass, biopsy', 'Carcinoma of colon, liver lesions'], ['Liver, segment 4 lesion, biopsy', '']]) {
    const r = route(line, history);
    assert.deepEqual([r.templateId, r.tier], ['liver_lesion_biopsy', 'confident'], `${line} [${history}]`);
  }
  assert.equal(route('Liver, random biopsy').templateId, 'liver_biopsy');
});

test('intake: the lesion fills the site; a query or a bare core leaves it blank', () => {
  assert.deepEqual(preset('Liver, segment 7 mass, biopsy'), { specimenName: 'segment 7 mass' });
  assert.deepEqual(preset('Liver, S8 lesion, biopsy'), { specimenName: 'S8 lesion' });
  assert.deepEqual(preset('Liver, ?HCC, core biopsy'), {});
  assert.deepEqual(preset('Liver, ?metastasis, biopsy'), {});
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-hcc-on-cirrhosis-example', EXAMPLE],
  ['02-metastatic-colorectal-adenocarcinoma', { specimenName: 'segment 4 lesion', cores: 2, coreLength: 18, dx: 'Metastatic adenocarcinoma', ihc: 'CK20+, CDX2+, SATB2+, CK7-', primarySite: 'Colorectal', primaryBasis: 'In keeping with' }],
  ['03-inflammatory-hepatocellular-adenoma', { specimenName: 'segment 5 mass', cores: 2, coreLength: 25, dx: 'Hepatocellular adenoma', hcaSubtype: 'Inflammatory', ihc: 'SAA+, CRP+', gs: 'Patchy', betaCatenin: 'Membranous only', cd34: 'Patchy sinusoidal', reticulin: 'Retained', bgFindings: ['Steatosis'], bgSteatosisPct: 10 }],
  ['04-focal-nodular-hyperplasia', { specimenName: 'segment 2 nodule', cores: 1, coreLength: 15, dx: 'Focal nodular hyperplasia', gs: 'Map-like', reticulin: 'Retained', bgFindings: ['None identified'] }],
  ['05-epithelioid-haemangioendothelioma', { specimenName: 'segment 8 lesion', cores: 2, coreLength: 20, dx: 'Epithelioid haemangioendothelioma', ihc: 'ERG+, CD31+, CD34+, CAMTA1+, AE1/AE3-', nonLesional: 'Scanty' }],
  ['06-metastatic-neuroendocrine-tumour-grade-2', { specimenName: 'segment 3 mass', cores: 3, coreLength: 30, dx: 'Metastatic neuroendocrine tumour', netGrade: 'Grade 2', ki67: 8, ihc: 'synaptophysin+, chromogranin+, INSM1+, CDX2+, TTF-1-', primarySite: 'Small intestinal' }],
  ['07-suspicious-for-hcc', { specimenName: '', cores: 1, coreLength: 12, dx: 'Hepatocellular carcinoma', qualifier: 'Suspicious for', hccGrade: 'Well differentiated', reticulin: 'Focally reduced', gs: 'Diffuse strong', ihc: 'glypican-3 focal', nonLesional: 'Not identified' }],
  ['08-non-lesional-liver-only', { specimenName: 'segment 6 nodule', cores: 1, coreLength: 10, dx: 'Non-lesional liver only', bgFindings: ['Steatosis'], bgSteatosisPct: 20 }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'liver_lesion_biopsy', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
