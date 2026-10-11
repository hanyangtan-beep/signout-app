// Testis, scrotum and foreskin — benign (benign batch 3). Card: docs/roadmap.md "Testis, scrotum and foreskin — benign";
// grounding in the generator header (RCPath G099, Mikuz, Johnsen). Wording is deliberate; update the strings only on purpose.
// Fixtures: tests/fixtures/testis_benign/*.json (golden; --update only after a deliberate change).
// The routing lines below are house-style lines, not case text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { extractMacro } from '../src/macroparse.js';
import { rowGroups } from '../src/picker.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { PREPUCE, ORCHIDECTOMY, BIOPSY, HYDROCELE, EPIDIDYMAL, VAS, GCNIS, NOT_FULL } from '../generators/testis_benign.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.testis_benign;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'testis_benign');
const UPDATE = process.argv.includes('--update');
const EXAMPLE = schema.example.parts[0].values;
const NEM = 'There is no evidence of malignancy.';
const PEIN = 'There is no evidence of penile intraepithelial neoplasia or malignancy.';
const NO_GCNIS = 'There is no evidence of germ cell neoplasia in situ or malignancy.';
const one = (values) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};
const run = (values) => generate(schema, t.generator, one(values));
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const visible = (values) => schema.fields.filter((f) => isVisible(f, { ...one({}).parts[0].values, ...values })).map((f) => f.id);
const checksOf = (r) => r.issues.map((i) => [i.level, i.field]);
const TORSION = { specimen: ORCHIDECTOMY, side: 'Left', orchidDx: 'Torsion', mikuz: '3', procedure: 'Orchidectomy', dimensions: '4 x 3 x 2.5', blocks: '3' };
const ARREST = { specimen: BIOPSY, side: 'Left', pattern: 'Maturation arrest', arrestStage: 'Primary spermatocyte', tubules: '25', johnsen: '4', procedure: 'Biopsy', dimensions: '0.3 x 0.2 x 0.2', blockScheme: 'All embedded' };
const VASECTOMY = { specimen: VAS, side: 'Bilateral', procedure: 'Vasectomy', dimensions: '1 x 0.2 x 0.2', blocks: '2' };

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has testis_benign');
  assert.equal(schema.system, 'GU');
  assert.equal(schema.kind, 'benign resection');
  assert.ok(schema.label && !/^(biopsy|polyp|specimen)$/i.test(schema.label), 'label is an organ word');
  assert.ok(schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
  assert.equal(schema.style.british, true);
});

test('it sits in the Resections row under GU and is no longer a pending placeholder', () => {
  const planned = JSON.parse(fs.readFileSync(path.join(here, '..', 'templates', 'planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((p) => p.id === 'testis_benign'), 'not in planned.json');
  const group = rowGroups(manifest, planned, 'bottom').find((g) => g.items.some((i) => i.id === 'testis_benign'));
  assert.ok(group, 'in the Resections & frozen row');
  assert.equal(group.system, 'GU');
  assert.ok(!group.items.find((i) => i.id === 'testis_benign').planned, 'a built template, not a pending one');
});

test('the example case renders every expected block', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, t.generator, c);
  for (const heading of [/SPECIMENS?:/, /MACROSCOPIC DESCRIPTION:/, /BLOCK KEY:/, /MICROSCOPIC EXAMINATION:/, /DIAGNOSIS:/]) assert.match(r.report, heading);
});

test('the example: a circumcision with lichen sclerosus', () => {
  const r = run(EXAMPLE);
  assert.equal(r.specimens, 'Prepuce, circumcision');
  assert.equal(r.macro, 'Received in formalin is a piece of foreskin, measuring 3 x 2 x 0.3 cm. Representative sections in 1 block.');
  assert.equal(r.blockKey, '(1) Foreskin, representative sections.');
  assert.equal(r.microscopy, `Sections of the prepuce show stratified squamous epithelium. The epithelium is atrophic, with hyperkeratosis and a band of homogenised, sclerotic collagen in the superficial dermis, beneath which there is a band-like lymphocytic infiltrate. Features are consistent with lichen sclerosus. ${PEIN}`);
  assert.equal(r.diagnosis, 'PREPUCE, circumcision - Consistent with LICHEN SCLEROSUS (balanitis xerotica obliterans)');
  assert.equal(r.comment, '');
  assert.deepEqual(r.issues, []);
});

test('prepuce branches: no abnormality, Zoon\'s balanitis, balanoposthitis, chronic inflammation, and a FORESKIN head', () => {
  const plain = run({});
  assert.equal(plain.macro, 'Received in formalin is a piece of foreskin. Representative sections in 1 block.');
  assert.equal(plain.microscopy, `Sections of the prepuce show stratified squamous epithelium. No specific pathological change is seen. ${PEIN}`);
  assert.equal(plain.diagnosis, 'PREPUCE, circumcision - NO EVIDENCE OF MALIGNANCY');
  assert.deepEqual(plain.issues, [], 'a prepuce has no side');
  const zoon = run({ ...EXAMPLE, prepuceDx: "Zoon's balanitis" });
  assert.equal(zoon.microscopy, `Sections of the prepuce show stratified squamous epithelium. The epithelium is thinned, and the superficial dermis contains a dense band-like infiltrate composed largely of plasma cells, with extravasated red cells and haemosiderin deposition. The features are those of Zoon's (plasma cell) balanitis. ${PEIN}`);
  assert.equal(zoon.diagnosis, "PREPUCE, circumcision - ZOON'S (PLASMA CELL) BALANITIS");
  const bp = run({ ...EXAMPLE, prepuceDx: 'Balanoposthitis' });
  assert.match(bp.microscopy, / There is non-specific acute and chronic inflammation of the epithelium and superficial dermis, with spongiosis\. The features are those of non-specific balanoposthitis\. /);
  assert.equal(bp.diagnosis, 'PREPUCE, circumcision - NON-SPECIFIC BALANOPOSTHITIS');
  assert.equal(run({ ...EXAMPLE, prepuceDx: 'Chronic inflammation' }).diagnosis, 'PREPUCE, circumcision - CHRONIC INFLAMMATION');
  const fore = run({ ...EXAMPLE, organ: 'FORESKIN', prepuceDx: 'No specific abnormality' });
  assert.equal(fore.specimens, 'Foreskin, circumcision');
  assert.equal(fore.diagnosis, 'FORESKIN, circumcision - NO EVIDENCE OF MALIGNANCY');
});

test('orchidectomy for torsion prints the Mikuz grade', () => {
  const r = run(TORSION);
  assert.equal(r.specimens, 'Testis, left, orchidectomy');
  assert.equal(r.macro, 'Received in formalin is a left testis, measuring 4 x 3 x 2.5 cm. Representative sections in 3 blocks.');
  assert.equal(r.blockKey, '(1-3) Testis, representative sections.');
  assert.equal(r.microscopy, `Sections show testis with complete haemorrhagic infarction; the germ cells in all the seminiferous tubules are necrotic. The features are those of testicular torsion, Mikuz grade 3. ${NEM}`);
  assert.equal(r.diagnosis, 'TESTIS, left, orchidectomy - In keeping with TORSION OF TESTIS, Mikuz grade 3');
  assert.deepEqual(r.issues, []);
  assert.equal(run({ ...TORSION, mikuz: '1' }).microscopy, `Sections show testis with interstitial oedema, vascular congestion and focal extravasation of red cells. There is sloughing of germ cells into the tubular lumina. The features are those of testicular torsion, Mikuz grade 1. ${NEM}`);
  assert.equal(run({ ...TORSION, mikuz: '2' }).microscopy, `Sections show testis with diffuse interstitial haemorrhage and necrosis of the germ cells in some of the seminiferous tubules. The features are those of testicular torsion, Mikuz grade 2. ${NEM}`);
  for (const r2 of [run(TORSION), run({ ...TORSION, mikuz: '1' })]) assert.ok(!/reversible|viable/.test(r2.microscopy), 'no prognostic clause in print');
  assert.ok(visible(TORSION).includes('mikuz'));
  for (const id of ['spermatogenesis', 'leydig', 'gcnis']) assert.ok(!visible(TORSION).includes(id), `${id} hidden in torsion`);
});

test('non-torsion orchidectomy: atrophy in the house sentence, Leydig cells and GCNIS', () => {
  const atrophy = run({ specimen: ORCHIDECTOMY, side: 'Right', orchidDx: 'Atrophy', spermatogenesis: 'Absent', procedure: 'Inguinal orchidectomy' });
  assert.equal(atrophy.specimens, 'Testis, right, inguinal orchidectomy');
  assert.equal(atrophy.microscopy, `Sections show testis with atrophic seminiferous tubules and interstitial fibrosis. The basement membrane is thickened. No spermatogonia, spermatocytes, spermatids and spermatozoa are noted. No Leydig cell hyperplasia is seen. ${NO_GCNIS}`);
  assert.equal(atrophy.diagnosis, 'TESTIS, right, inguinal orchidectomy - TESTICULAR ATROPHY');
  const normal = run({ specimen: ORCHIDECTOMY, side: 'Left', orchidDx: 'Unremarkable testis', leydig: 'Hyperplasia' });
  assert.equal(normal.microscopy, `Sections show testis with active spermatogenesis. Focally, there is hyperplasia of the Leydig cells. ${NO_GCNIS}`);
  assert.equal(normal.diagnosis, 'TESTIS, left, orchidectomy - NO EVIDENCE OF MALIGNANCY');
  const gcnis = run({ specimen: ORCHIDECTOMY, side: 'Left', orchidDx: 'Atrophy', gcnis: GCNIS });
  assert.match(gcnis.microscopy, / Germ cell neoplasia in situ is present; see comment\. There is no evidence of an invasive germ cell tumour\.$/);
  assert.equal(gcnis.diagnosis, 'TESTIS, left, orchidectomy - TESTICULAR ATROPHY; GERM CELL NEOPLASIA IN SITU; see comment');
  assert.match(gcnis.comment, /^Germ cell neoplasia in situ is identified\. /);
});

test('testicular biopsy: maturation arrest with the tubule count and Johnsen score', () => {
  const r = run(ARREST);
  assert.equal(r.specimens, 'Testis, left, biopsy');
  assert.equal(r.macro, 'Received in formalin are fragments of testicular tissue labelled left testis, measuring 0.3 x 0.2 x 0.2 cm in aggregate. All embedded in 1 block.');
  assert.equal(r.blockKey, '(1) Testicular tissue, all embedded.');
  assert.equal(r.microscopy, `Sections show testicular parenchyma with 25 seminiferous tubules. Spermatogenesis is arrested at the primary spermatocyte stage; no spermatids or spermatozoa are seen. The mean Johnsen score is 4. No Leydig cell hyperplasia is seen. ${NO_GCNIS}`);
  assert.equal(r.diagnosis, 'TESTIS, left, biopsy - MATURATION ARREST AT THE PRIMARY SPERMATOCYTE STAGE (mean Johnsen score 4)');
  assert.deepEqual(r.issues, []);
  const late = run({ ...ARREST, arrestStage: 'Early spermatid' });
  assert.match(late.microscopy, / Spermatogenesis is arrested at the early spermatid stage; no late spermatids or spermatozoa are seen\. /);
  assert.equal(late.diagnosis, 'TESTIS, left, biopsy - MATURATION ARREST AT THE EARLY SPERMATID STAGE (mean Johnsen score 4)');
  const sco = run({ ...ARREST, pattern: 'Sertoli cell-only', johnsen: '', gcnis: GCNIS });
  assert.match(sco.microscopy, / The seminiferous tubules are lined by Sertoli cells only; no germ cells are seen\. /);
  assert.equal(sco.diagnosis, 'TESTIS, left, biopsy - SERTOLI CELL-ONLY PATTERN; GERM CELL NEOPLASIA IN SITU; see comment');
  assert.ok(!visible({ ...ARREST, pattern: 'Hypospermatogenesis' }).includes('arrestStage'));
});

test('the Checks panel for a testicular biopsy: tubule count, sampling and the Johnsen range', () => {
  const r = run({ ...ARREST, tubules: '18', blockScheme: 'Representative sections', johnsen: '12' });
  assert.deepEqual(checksOf(r), [['warn', 'tubules'], ['warn', 'blockScheme'], ['warn', 'johnsen']]);
  assert.deepEqual(checksOf(run({ ...ARREST, side: 'Not stated' })), [['warn', 'side']]);
});

test('hydrocele and epididymal cysts are labelled with the side and the specimen', () => {
  const hyd = run({ specimen: HYDROCELE, side: 'Right', procedure: 'Hydrocelectomy', dimensions: '5 x 4 x 0.3' });
  assert.equal(hyd.specimens, 'Tunica vaginalis, right, hydrocelectomy');
  assert.equal(hyd.macro, 'Received in formalin is a piece of membranous tissue labelled right hydrocele sac, measuring 5 x 4 x 0.3 cm. Representative sections in 1 block.');
  assert.equal(hyd.microscopy, `Sections show a thickened fibrous wall lined by benign mesothelium. ${NEM}`);
  assert.equal(hyd.diagnosis, 'TUNICA VAGINALIS, right, hydrocelectomy - Consistent with HYDROCELE');
  const cyst = run({ specimen: EPIDIDYMAL, side: 'Right' });
  assert.equal(cyst.macro, 'Received in formalin is a thin-walled cyst labelled right epididymal cyst. Representative sections in 1 block.');
  assert.equal(cyst.microscopy, `Sections show a cyst with a fibromuscular wall, lined by bland cuboidal epithelium. ${NEM}`);
  assert.equal(cyst.diagnosis, 'EPIDIDYMIS, right, excision - EPIDIDYMAL CYST');
  const sperm = run({ specimen: EPIDIDYMAL, side: 'Left', cystType: 'Spermatocele', dimensions: '2 x 1.5 x 1' });
  assert.equal(sperm.macro, 'Received in formalin is a thin-walled cyst labelled left spermatocele, measuring 2 x 1.5 x 1 cm. Representative sections in 1 block.');
  assert.equal(sperm.microscopy, `Sections show a cyst with a fibromuscular wall, lined by a single layer of flattened epithelial cells. Spermatozoa are present in the cyst contents. ${NEM}`);
  assert.equal(sperm.diagnosis, 'EPIDIDYMIS, left, excision - SPERMATOCELE');
});

test('vasectomy: full cross-section, findings, and a vas not in full cross-section', () => {
  const both = run(VASECTOMY);
  assert.equal(both.specimens, 'Vas deferens, bilateral, vasectomy');
  assert.equal(both.macro, 'Received in formalin are two segments of vas deferens (left and right), measuring 1 x 0.2 x 0.2 cm in aggregate. Representative sections in 2 blocks.');
  assert.equal(both.blockKey, '(1-2) Vas deferens, representative sections.');
  assert.equal(both.microscopy, `Sections show two segments of vas deferens, each in full cross-section. ${NEM}`);
  assert.equal(both.diagnosis, 'VAS DEFERENS, bilateral, vasectomy - VAS DEFERENS, full cross-section of both segments');
  assert.deepEqual(both.issues, []);
  const left = run({ specimen: VAS, side: 'Left', vasFindings: ['Sperm granuloma', 'Vasitis nodosa'] });
  assert.equal(left.macro, 'Received in formalin is a left segment of vas deferens. Representative sections in 1 block.');
  assert.equal(left.microscopy, `Sections show a segment of vas deferens in full cross-section. A sperm granuloma is present. There is vasitis nodosa, with small ductular structures in the muscular wall. ${NEM}`);
  assert.equal(left.diagnosis, 'VAS DEFERENS, left, vasectomy - VAS DEFERENS, full cross-section; SPERM GRANULOMA; VASITIS NODOSA');
  const partial = run({ specimen: VAS, side: 'Right', crossSection: NOT_FULL });
  assert.equal(partial.microscopy, `Sections show fibromuscular tissue; a full cross-section of vas deferens is not identified. ${NEM}`);
  assert.equal(partial.diagnosis, 'VAS DEFERENS, right, vasectomy - FULL CROSS-SECTION OF VAS DEFERENS NOT IDENTIFIED; see comment');
  assert.match(partial.comment, /^A full cross-section of vas deferens is not identified\. /);
});

test('the Checks panel for a vasectomy and for a head that does not fit the specimen', () => {
  assert.deepEqual(checksOf(run({ ...VASECTOMY, blocks: '1' })), [['warn', 'blocks']]);
  assert.deepEqual(checksOf(run({ ...VASECTOMY, vasFindings: ['Sperm granuloma'] })), [['warn', 'side']]);
  assert.deepEqual(checksOf(run({ ...VASECTOMY, crossSection: NOT_FULL })), [['warn', 'side']]);
  assert.deepEqual(checksOf(run({ specimen: PREPUCE, organ: 'EPIDIDYMIS' })), [['warn', 'organ']]);
  assert.deepEqual(checksOf(run({ specimen: HYDROCELE, organ: 'TESTIS', side: 'Left' })), [], 'a hydrocele may open TESTIS');
});

test('a multi-part case letters its specimens', () => {
  const r = generate(schema, t.generator, createCase(schema, 2));
  assert.match(r.specimens, /\(A\)/);
  assert.match(r.specimens, /\(B\)/);
});

// ---------- intake ----------

const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line) => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, '', manifest)[0]);
};

test('intake: prepuce, testis, hydrocele, epididymal and vas lines land on this form with the specimen and head', () => {
  const lines = ['Prepuce', 'Foreskin, circumcision', 'Circumcision', 'Left testis, resection', 'Right testis, orchidectomy', 'Right testis, torsion, orchidectomy', 'Left testicular biopsy',
    'Right hydrocele sac', 'Left epididymal cyst', 'Left epididymis, excision', 'Right spermatocele', 'Bilateral vas deferens, vasectomy', 'Vas deferens, bilateral', 'Left vas deferens'];
  for (const line of lines) {
    const m = route(line);
    assert.deepEqual([m.templateId, m.tier], ['testis_benign', 'confident'], line);
  }
  assert.deepEqual(preset('Foreskin, circumcision'), { side: 'Not stated', specimen: PREPUCE, organ: 'FORESKIN', procedure: 'Circumcision' });
  assert.deepEqual(preset('Right testis, torsion, orchidectomy'), { side: 'Right', specimen: ORCHIDECTOMY, organ: 'TESTIS', procedure: 'Orchidectomy', orchidDx: 'Torsion' });
  assert.deepEqual(preset('Left testicular biopsy'), { side: 'Left', specimen: BIOPSY, organ: 'TESTIS', procedure: 'Biopsy' });
  assert.deepEqual(preset('Right hydrocele sac'), { side: 'Right', specimen: HYDROCELE, organ: 'TUNICA VAGINALIS', procedure: '' });
  assert.deepEqual(preset('Bilateral vas deferens, vasectomy'), { side: 'Bilateral', specimen: VAS, organ: 'VAS DEFERENS', procedure: 'Vasectomy' });
  assert.deepEqual(preset('Vas deferens, bilateral'), { side: 'Bilateral', specimen: VAS, organ: 'VAS DEFERENS', procedure: '' });
  assert.equal(run(preset('Vas deferens, bilateral')).specimens, 'Vas deferens, bilateral, vasectomy', 'a blank procedure prints the specimen default');
  assert.equal(run(preset('Left testis, resection')).diagnosis, 'TESTIS, left, resection - TESTICULAR ATROPHY');
});

test('intake: lesions, infections, appendages and cord lipomas stay off this form', () => {
  for (const line of ['Testicular appendage, scrotal exploration', 'Hydatid of Morgagni', 'Penis, circumcision glans margin', 'Left testicular lesion', 'Left orchitis, orchidectomy', 'Right epididymitis', 'Lipoma, right spermatic cord']) {
    assert.notEqual(route(line).templateId, 'testis_benign', line);
  }
  assert.equal(route('Scrotal abscess').templateId, 'abscess_granulation');
});

test('pasted gross text fills the measurements and the blocks', () => {
  assert.deepEqual(extractMacro(schema, 'Received in formalin is a piece of foreskin measuring 3 x 2 x 0.3 cm. Representative sections in 1 block.'),
    { dimensions: '3 x 2 x 0.3', blocks: '1', blockScheme: 'Representative sections' });
  assert.deepEqual(extractMacro(schema, 'Received in formalin are fragments of testicular tissue measuring 0.3 x 0.2 x 0.2 cm in aggregate. All embedded in 1 block.'),
    { dimensions: '0.3 x 0.2 x 0.2', blocks: '1', blockScheme: 'All embedded' });
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-circumcision-lichen-sclerosus-example', EXAMPLE],
  ['02-orchidectomy-torsion-mikuz-3', TORSION],
  ['03-testicular-biopsy-maturation-arrest', ARREST],
  ['04-bilateral-vasectomy', VASECTOMY]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'testis_benign', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
