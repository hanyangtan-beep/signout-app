// Pituitary neuroendocrine tumour (PitNET) resection - Phase 75 (23 October 2026).
// Its own form (Endocrine), in the QMH Endocrine-PitNET element order, replacing the Glioma form's
// PitNET entity, which printed the glioma microscopy and stains and asked for a CNS WHO grade.
// Sources: docs/reference/pitnet-sources.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTemplate, loadManifest } from '../src/registry.js';
import { createCase, defaultValues, generate, isVisible, applyLinkedDefaults } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import * as gen from '../generators/pituitary_net.js';
import cnsGen from '../generators/cns_tumour.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const FIX = path.join(here, 'fixtures', 'pituitary_net');
const UPDATE = process.env.UPDATE_FIXTURES === '1';
const { schema } = await loadTemplate('pituitary_net');
const manifest = await loadManifest();
const field = (id) => schema.fields.find((f) => f.id === id);
const EXAMPLE = schema.example.parts[0].values;
const runParts = (list) => {
  const c = createCase(schema, list.length);
  c.options = { ...c.options, includeHeader: false };
  list.forEach((v, i) => { c.parts[i].values = { ...c.parts[i].values, ...v }; });
  return generate(schema, gen, c);
};
const run = (values = {}) => runParts([{ ...EXAMPLE, ...values }]);
/** The example's values after the pathologist picks `type`, its linked fields still at their defaults. */
const LINKED = schema.fields.filter((f) => f.defaultByField).map((f) => f.id);
const ofType = (type, extra = {}) => {
  const d = defaultValues(schema);
  const p = { label: 'A', values: { ...EXAMPLE, ...Object.fromEntries(LINKED.map((id) => [id, d[id]])), ihcFocal: [] } };
  const before = p.values.tumourType;
  p.values.tumourType = type;
  applyLinkedDefaults(schema, p, 'tumourType', before);
  return { ...p.values, ...extra };
};
const para = (r) => (r.report.match(/- Tumour histology:\n {2}(.*)/) || [])[1] || '';
const messages = (r) => r.issues.map((i) => i.message).join(' | ');
const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line) => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, '', manifest)[0]);
};

// ---------- metadata and menus ----------

test('PitNET: Endocrine cancer resection, labelled PitNET, the QMH page saved, the placeholder gone', () => {
  assert.equal(schema.id, 'pituitary_net');
  assert.equal(schema.system, 'Endocrine');
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.label, 'PitNET');
  assert.equal(schema.organ, 'PITUITARY');
  assert.equal(manifest.find((t) => t.id === 'pituitary_net')?.label, 'PitNET');
  assert.equal(schema.source.url, 'https://awiloqmh.github.io/CancerReportingTemplate/Endocrine-PitNET.html');
  assert.ok(fs.existsSync(path.join(root, schema.source.savedPage)));
  assert.ok(fs.existsSync(path.join(root, 'docs/reference/qmh/pitnet.txt')));
  const planned = JSON.parse(fs.readFileSync(path.join(root, 'templates/planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((t) => t.id === 'pituitary_net' || t.qmh === 'Endocrine-PitNET'));
});

test('PitNET: the example sets every field, and every field has a group or is the specimen line', () => {
  const ids = schema.fields.map((f) => f.id);
  assert.deepEqual(Object.keys(EXAMPLE).sort(), [...ids].sort());
  for (const f of schema.fields) assert.ok(f.group || f.id === 'specimenName', f.id);
  assert.ok(!ids.some((id) => /grade/i.test(id)), 'no grade field');
});

// ---------- options ----------

test('PitNET: tumour types grouped by lineage, every option in one group', () => {
  const f = field('tumourType');
  assert.deepEqual(f.optionGroups.map((g) => g.label), ['TPIT lineage (corticotroph)', 'PIT1 lineage', 'SF1 lineage', 'No distinct cell lineage', 'Not classified']);
  assert.deepEqual(f.optionGroups.flatMap((g) => g.options), f.options);
  assert.deepEqual(f.optionGroups[0].options, gen.TPIT_TYPES);
  assert.deepEqual(f.optionGroups[1].options, gen.PIT1_TYPES);
  assert.deepEqual(f.optionGroups[2].options, gen.SF1_TYPES);
  assert.equal(f.default, 'Gonadotroph tumour');
});

test('PitNET: the three immunohistochemistry lists offer the same markers, the QMH panel among them', () => {
  const markers = field('ihcDiffuse').options;
  assert.deepEqual(field('ihcFocal').options, markers);
  assert.deepEqual(field('ihcNegative').options, markers);
  for (const m of ['Synaptophysin', 'Chromogranin', 'TPIT', 'PIT1', 'SF1', 'GATA3', 'ER-alpha', 'Alpha-subunit', 'ACTH', 'GH', 'PRL', 'Beta-TSH', 'Beta-FSH']) {
    assert.ok(markers.includes(m), m);
  }
  for (const id of ['p27', 'atrx', 'p53', 'keratin']) assert.equal(field(id).default, 'Not performed', id);
  assert.equal(field('keratinClone').default, 'CAM5.2');
});

test('PitNET: the lineage factor, cytoplasm and keratin pattern follow the tumour type', () => {
  const sg = ofType('Somatotroph tumour, sparsely granulated');
  assert.deepEqual(sg.ihcDiffuse, ['Synaptophysin', 'PIT1']);
  assert.deepEqual(sg.ihcNegative, ['TPIT', 'SF1']);
  assert.deepEqual(sg.features, ['Fibrous bodies']);
  assert.deepEqual(sg.keratinPattern, ['Fibrous bodies in more than 70% of tumour cells']);
  assert.equal(sg.cytoplasm, 'Chromophobic');
  const dg = ofType('Densely granulated corticotroph tumour');
  assert.deepEqual(dg.ihcDiffuse, ['Synaptophysin', 'TPIT']);
  assert.equal(dg.cytoplasm, 'Basophilic');
  assert.deepEqual(dg.keratinPattern, ['Diffuse dense cytoplasmic']);
  assert.equal(ofType('Crooke cell tumour').cytoplasm, 'Hyaline');
  assert.deepEqual(ofType('Crooke cell tumour').keratinPattern, ['Ring-like cytoplasmic']);
  assert.equal(ofType('Somatotroph tumour, densely granulated').cytoplasm, 'Eosinophilic');
  assert.equal(ofType('Acidophil stem cell tumour').cytoplasm, 'Oncocytic');
  const nc = ofType('Null cell tumour');
  assert.deepEqual(nc.ihcDiffuse, ['Synaptophysin']);
  assert.deepEqual(nc.ihcNegative, ['TPIT', 'PIT1', 'SF1']);
  assert.deepEqual(ofType('Unusual plurihormonal (multilineage) tumour').ihcNegative, []);
  // A list the pathologist has changed is left alone.
  const p = { label: 'A', values: { ...defaultValues(schema), ihcDiffuse: ['Synaptophysin', 'SF1', 'GATA3'] } };
  p.values.tumourType = 'Thyrotroph tumour';
  applyLinkedDefaults(schema, p, 'tumourType', 'Gonadotroph tumour');
  assert.deepEqual(p.values.ihcDiffuse, ['Synaptophysin', 'SF1', 'GATA3']);
});

test("PitNET: Crooke's change shows only for a corticotroph tumour with adenohypophysis; keratin detail only when positive", () => {
  const crooke = field('crooke');
  assert.equal(isVisible(crooke, ofType('Densely granulated corticotroph tumour')), true);
  assert.equal(isVisible(crooke, ofType('Densely granulated corticotroph tumour', { nonTumour: [] })), false);
  assert.equal(isVisible(crooke, ofType('Gonadotroph tumour')), false);
  assert.equal(isVisible(field('keratinPattern'), { ...EXAMPLE, keratin: 'Negative' }), false);
  assert.equal(isVisible(field('keratinPattern'), { ...EXAMPLE, keratin: 'Positive, focal' }), true);
  assert.equal(isVisible(field('keratinClone'), { ...EXAMPLE, keratin: 'Not performed' }), false);
});

// ---------- the tumour histology paragraph ----------

test('PitNET: one paragraph carries the morphology, reticulin and the immunohistochemistry', () => {
  assert.equal(para(run()),
    'Sections show a pituitary neuroendocrine tumour composed of monotonous cells arranged in diffuse sheets and perivascular pseudorosettes, ' +
    'with chromophobic cytoplasm and round to oval nuclei with finely granular chromatin. Reticulin shows loss of the normal acinar architecture. ' +
    'On immunohistochemistry, the tumour cells are diffusely positive for synaptophysin, SF1 and GATA3, focally positive for beta-FSH, and negative for TPIT and PIT1.');
});

test('PitNET: pleomorphism, features, PAS, keratin and p27 / ATRX / p53 in the same paragraph', () => {
  const p = para(run(ofType('Densely granulated corticotroph tumour', {
    atypia: 'Moderate', features: ['Necrosis', 'Calcification'], pas: 'Positive', keratin: 'Positive, diffuse',
    ihcDiffuse: ['Synaptophysin', 'TPIT', 'ACTH'], p27: 'Retained', atrx: 'Lost', p53: 'Wild-type', crooke: 'Present'
  })));
  assert.match(p, /composed of cells arranged in diffuse sheets and perivascular pseudorosettes, with basophilic cytoplasm and round to oval nuclei with finely granular chromatin and moderate nuclear pleomorphism\./);
  assert.match(p, / Necrosis and calcification are present\. /);
  assert.match(p, / The tumour cells are PAS positive\. /);
  assert.match(p, /diffusely positive for synaptophysin, TPIT and ACTH, and negative for PIT1 and SF1\./);
  assert.match(p, / Low-molecular-weight keratin \(CAM5\.2\) is diffusely positive, with a diffuse dense cytoplasmic pattern\./);
  assert.match(p, / Nuclear p27 expression is retained, ATRX expression is lost, and p53 shows a wild-type pattern\.$/);
  assert.doesNotMatch(p, /monotonous/);
  assert.match(para(run({ keratin: 'Negative', keratinClone: '' })), / Low-molecular-weight keratin is negative\.$/);
  assert.match(para(run({ p53: 'Abnormal' })), / Immunostaining for p53 shows an abnormal pattern\.$/);
  assert.match(para(run({ reticulin: 'Not performed', features: ['Fibrous bodies'] })), /chromatin\. Fibrous bodies are present\. On immunohistochemistry/);
});

test('PitNET: no glioma wording anywhere in the report', () => {
  const r = run();
  assert.doesNotMatch(r.report, /GFAP|OLIG2|IDH|microvascular|pseudopalisad|glioblastoma|CNS WHO grade/i);
});

// ---------- synoptic ----------

test('PitNET: the synoptic items, procedure to non-tumorous pituitary', () => {
  const r = run({ metastasis: 'Not identified' });
  assert.match(r.report, /Specimen and tumour\n- Procedure: Transsphenoidal pituitary tumour resection\n- Tumour integrity: Fragmented\n- Tumour number: Single pituitary neuroendocrine tumour\n- Tumour size: 24 mm in greatest dimension \(imaging\)\n/);
  assert.match(r.report, /- Tumour type and subtype: SF1-lineage pituitary neuroendocrine tumour,\n {2}gonadotroph tumour\n/);
  assert.match(r.report, /- Ki-67 labelling index: 2%\n- Mitotic count: 0 per 2 mm2\n- Histologically confirmed invasion: Not identified\n- Metastasis: Not identified\n- Non-tumorous pituitary: Adenohypophysis identified\n/);
  assert.match(r.report, /Additional findings\n- None identified/);
  assert.doesNotMatch(run().report, /- Metastasis:/, '"Not applicable" is not printed');
  assert.doesNotMatch(run({ tumourSize: '' }).report, /- Tumour size:/);
  assert.match(run({ sizeFrom: 'Cannot be determined' }).report, /- Tumour size: Cannot be determined/);
  assert.doesNotMatch(run({ ki67: '' }).report, /Ki-67 labelling index:/);
});

test('PitNET: tumour type lines by lineage', () => {
  const line = (t, extra = {}) => gen.typeLine({ tumourType: t, ...extra });
  assert.equal(line('Gonadotroph tumour'), 'SF1-lineage pituitary neuroendocrine tumour, gonadotroph tumour');
  assert.equal(line('Somatotroph tumour, sparsely granulated'), 'PIT1-lineage pituitary neuroendocrine tumour, somatotroph tumour, sparsely granulated');
  assert.equal(line('Crooke cell tumour'), 'TPIT-lineage pituitary neuroendocrine tumour, Crooke cell tumour');
  assert.equal(line('Null cell tumour'), 'Pituitary neuroendocrine tumour of no distinct cell lineage, null cell tumour');
  assert.equal(line('Unusual plurihormonal (multilineage) tumour', { typeDetail: 'PIT1 and SF1' }),
    'Pituitary neuroendocrine tumour of no distinct cell lineage, unusual plurihormonal (multilineage) tumour (PIT1 and SF1)');
  assert.equal(line('Pituitary neuroendocrine tumour, NOS'), 'Pituitary neuroendocrine tumour, NOS');
});

test("PitNET: Crooke's hyaline change prints under the non-tumorous pituitary for a corticotroph tumour", () => {
  const r = run(ofType('Sparsely granulated corticotroph tumour', { crooke: 'Not identified', nonTumour: ['Adenohypophysis', 'Neurohypophysis'] }));
  assert.match(r.report, /- Non-tumorous pituitary: Adenohypophysis and neurohypophysis identified\n {2}- Crooke's hyaline change of the non-tumorous corticotrophs: Not identified\n/);
  assert.doesNotMatch(run({ crooke: 'Present' }).report, /Crooke's/, 'not for a gonadotroph tumour');
  assert.match(run({ nonTumour: [] }).report, /- Non-tumorous pituitary: Not identified\n/);
});

test('PitNET: the QMH element order, with the documented departures', () => {
  // The order the QMH page prints its report in (updateDescription in the saved page).
  const html = fs.readFileSync(path.join(root, 'docs/reference/Endocrine-PitNET.html'), 'utf8');
  const fn = html.slice(html.indexOf('function updateDescription'));
  const qmh = [...fn.matchAll(/"(?:\\n)?"?\s*\+?\s*"?- ([A-Za-z0-9 -]+?):? ?"/g)].map((m) => m[1].trim());
  const want = ['Procedure', 'Tumor integrity', 'Tumor histology', 'Tumor Number', 'Tumor size', 'Tumor Types and Subtypes',
    'Ki67 index', 'Mitotic count', 'Histologically Confirmed Invasion', 'Histochemical stains', 'Immunohistochemical studies',
    'Metastasis', 'Non-tumorous Pituitary Gland Findings', 'Additional Pathologic Findings'];
  const seen = want.map((w) => qmh.indexOf(w));
  assert.ok(seen.every((i) => i >= 0), `QMH labels found: ${qmh.join(' / ')}`);
  assert.deepEqual([...seen].sort((a, b) => a - b), seen, 'the saved QMH page prints in this order');
  const ours = {
    Procedure: 'Procedure', 'Tumor integrity': 'Tumour integrity', 'Tumor Number': 'Tumour number', 'Tumor size': 'Tumour size',
    'Tumor Types and Subtypes': 'Tumour type and subtype', 'Ki67 index': 'Ki-67 labelling index', 'Mitotic count': 'Mitotic count',
    'Histologically Confirmed Invasion': 'Histologically confirmed invasion', Metastasis: 'Metastasis',
    'Non-tumorous Pituitary Gland Findings': 'Non-tumorous pituitary'
  };
  const r = run({ metastasis: 'Not identified' });
  const labels = r.report.split('\n').filter((l) => /^- [^:]+:/.test(l)).map((l) => l.slice(2, l.indexOf(':')));
  // Departure 1: the tumour histology paragraph follows the tumour type (QMH: after integrity).
  // Departure 2: the histochemical stains and the immunohistochemistry print inside it.
  const expected = want.filter((w) => ours[w]).map((w) => ours[w]);
  expected.splice(expected.indexOf('Tumour type and subtype') + 1, 0, 'Tumour histology');
  assert.deepEqual(labels, expected);
  assert.match(para(r), /Reticulin .* On immunohistochemistry/);
  assert.ok(r.report.indexOf('Additional findings') > r.report.indexOf('- Non-tumorous pituitary'));
});

// ---------- diagnosis ----------

test('PitNET: diagnosis head and clause by type', () => {
  const dx = (t, extra = {}) => gen.dxClause({ tumourType: t, ...extra });
  assert.equal(dx('Gonadotroph tumour'), 'GONADOTROPH PITUITARY NEUROENDOCRINE TUMOUR (PitNET), SF1-lineage');
  assert.equal(dx('Somatotroph tumour, densely granulated'), 'DENSELY GRANULATED SOMATOTROPH PITUITARY NEUROENDOCRINE TUMOUR (PitNET), PIT1-lineage');
  assert.equal(dx('Lactotroph tumour, sparsely granulated'), 'SPARSELY GRANULATED LACTOTROPH PITUITARY NEUROENDOCRINE TUMOUR (PitNET), PIT1-lineage');
  assert.equal(dx('Densely granulated corticotroph tumour'), 'DENSELY GRANULATED CORTICOTROPH PITUITARY NEUROENDOCRINE TUMOUR (PitNET), TPIT-lineage');
  assert.equal(dx('Crooke cell tumour'), 'CROOKE CELL PITUITARY NEUROENDOCRINE TUMOUR (PitNET), TPIT-lineage');
  assert.equal(dx('Immature PIT1-lineage tumour'), 'IMMATURE PIT1-LINEAGE PITUITARY NEUROENDOCRINE TUMOUR (PitNET)');
  assert.equal(dx('Mature PIT1-lineage plurihormonal tumour'), 'MATURE PLURIHORMONAL PIT1-LINEAGE PITUITARY NEUROENDOCRINE TUMOUR (PitNET)');
  assert.equal(dx('Null cell tumour'), 'NULL CELL PITUITARY NEUROENDOCRINE TUMOUR (PitNET)');
  assert.equal(dx('Unusual plurihormonal (multilineage) tumour', { typeDetail: 'PIT1 and SF1' }), 'PLURIHORMONAL (MULTILINEAGE) PITUITARY NEUROENDOCRINE TUMOUR (PitNET), PIT1 and SF1');
  assert.equal(dx('Pituitary neuroendocrine tumour, NOS'), 'PITUITARY NEUROENDOCRINE TUMOUR (PitNET), NOS');
  for (const t of field('tumourType').options) assert.match(dx(t, { typeDetail: 'x' }), /PITUITARY NEUROENDOCRINE TUMOUR \(PitNET\)/, t);
  assert.match(run().report, /PITUITARY, tumour, transsphenoidal excision\n- GONADOTROPH PITUITARY NEUROENDOCRINE TUMOUR \(PitNET\), SF1-lineage$/);
  assert.match(run({ procedure: 'Transcranial resection' }).report, /PITUITARY, tumour, transcranial excision\n/);
});

test('PitNET: invasion, metastasis and multiple tumours add diagnosis clauses', () => {
  const r = run({ invasion: 'Present', invasionSites: ['Bone', 'Dura'], metastasis: 'Liver', metastasisDetail: 'core biopsy', tumourNumber: 'Multiple', tumourCount: 2 });
  assert.match(r.report, /- Histologically confirmed invasion: Present \(bone and dura\)\n/);
  assert.match(r.report, /- Metastasis: Liver \(core biopsy\)\n/);
  assert.match(r.report, /SF1-lineage\n- multiple pituitary neuroendocrine tumours \(2\)\n- histologically confirmed invasion of bone and dura\n- liver metastasis \(core biopsy\)$/);
  assert.doesNotMatch(run({ metastasis: 'Not identified' }).report, /metastasis$/m);
});

test('PitNET: specimen line and macroscopy', () => {
  const r = run();
  assert.match(r.report, /^Pituitary tumour, transsphenoidal excision\n\nReceived in formalin are fragments of soft tumour tissue, measuring 18 x 12 x 4 mm in aggregate\. The specimen is entirely embedded; see block key\.\n\n\(1-2\) Tumour fragments\./);
  assert.match(run({ integrity: 'Intact', sampling: 'Representative sections' }).report, /Received in formalin is an intact piece of soft tumour tissue, measuring 18 x 12 x 4 mm\. Representative sections are taken; see block key\./);
  const two = runParts([EXAMPLE, { ...EXAMPLE, tumourType: 'Thyrotroph tumour' }]);
  assert.match(two.report, /\(A\) Pituitary tumour, transsphenoidal excision\n\(B\) Pituitary tumour, transsphenoidal excision/);
  assert.match(two.report, /\(B\) PITUITARY, tumour, transsphenoidal excision\n- THYROTROPH PITUITARY NEUROENDOCRINE TUMOUR \(PitNET\), PIT1-lineage/);
});

// ---------- checks ----------

test('PitNET: transcription factor checks', () => {
  assert.equal(messages(run()), '');
  assert.match(messages(run({ ihcDiffuse: ['Synaptophysin'], ihcNegative: ['TPIT', 'PIT1'] })), /SF1 is not recorded; TPIT, PIT1 and SF1 assign the lineage/);
  assert.match(messages(run({ ihcDiffuse: ['Synaptophysin'], ihcNegative: ['TPIT', 'PIT1', 'SF1'] })), /SF1 is recorded negative in a SF1-lineage tumour/);
  assert.match(messages(run({ ihcDiffuse: ['Synaptophysin', 'SF1', 'PIT1'], ihcNegative: ['TPIT'] })), /PIT1 is positive in a SF1-lineage tumour; consider a plurihormonal \(multilineage\) tumour/);
  assert.match(messages(run(ofType('Null cell tumour', { ihcDiffuse: ['Synaptophysin', 'SF1'], ihcNegative: ['TPIT', 'PIT1'], keratin: 'Negative' }))), /A null cell tumour is negative for TPIT, PIT1 and SF1; SF1 is recorded positive/);
  assert.match(messages(run(ofType('Unusual plurihormonal (multilineage) tumour', { typeDetail: 'x' }))), /fewer than two are recorded positive/);
  const dup = run({ ihcFocal: ['SF1'] }).issues.find((i) => /more than one immunohistochemistry list/.test(i.message));
  assert.equal(dup.level, 'error');
});

test("PitNET: keratin, Crooke's change, Ki-67, invasion and 'Other' checks", () => {
  assert.match(messages(run(ofType('Somatotroph tumour, densely granulated'))), /Low-molecular-weight keratin is not recorded/);
  assert.doesNotMatch(messages(run()), /keratin/, 'not asked for a gonadotroph tumour');
  assert.match(messages(run(ofType('Somatotroph tumour, sparsely granulated', { keratin: 'Positive, diffuse', keratinPattern: ['Perinuclear cytoplasmic'] }))), /the recorded pattern does not/);
  assert.match(messages(run(ofType('Somatotroph tumour, densely granulated', { keratin: 'Positive, diffuse', keratinPattern: ['Fibrous bodies in more than 70% of tumour cells'] }))), /indicate a sparsely granulated somatotroph tumour/);
  const cort = run(ofType('Densely granulated corticotroph tumour', { keratin: 'Positive, diffuse' }));
  assert.equal(cort.issues.find((i) => /Crooke/.test(i.message))?.field, 'crooke');
  assert.doesNotMatch(messages(run(ofType('Densely granulated corticotroph tumour', { keratin: 'Positive, diffuse', crooke: 'Present' }))), /Crooke/);
  assert.match(messages(run({ ki67: '' })), /Ki-67 labelling index is not recorded/);
  assert.equal(run({ ki67: 120 }).issues.find((i) => /exceeds 100%/.test(i.message))?.level, 'error');
  assert.match(messages(run({ invasion: 'Present' })), /name the invaded tissue/);
  assert.match(messages(run({ procedure: 'Other' })), /Procedure is "Other"/);
  assert.match(messages(run({ tumourType: 'Other (specify)' })), /Tumour type is "Other"/);
  assert.match(messages(run({ metastasis: 'Other (specify)' })), /Metastasis is "Other"/);
  assert.match(messages(run({ tumourNumber: 'Multiple', tumourCount: 2 })), /report each distinct tumour as a separate part/);
});

// ---------- intake ----------

test('PitNET intake: pituitary and sellar tumour lines open the PitNET form', () => {
  for (const line of ['A. Pituitary, Pituitary tumour', 'A. Pituitary adenoma, transsphenoidal excision', 'A. Pituitary macroadenoma, TSS',
    'A. Sellar tumour, endoscopic transsphenoidal resection', 'A. Others, pituitary tumour']) {
    assert.equal(route(line).templateId, 'pituitary_net', line);
  }
  assert.equal(preset('A. Pituitary tumour, transcranial excision').procedure, 'Transcranial resection');
  assert.equal(preset('A. Pituitary macroadenoma, TSS').procedure, 'Transsphenoidal resection');
});

test('PitNET intake: frozen sections, cysts, meningiomas and suprasellar lines keep their forms', () => {
  for (const line of ['A. Sella, cystic lesion', 'A. Pituitary tumour, frozen section', 'A. brain tumour, tuberculum sellae meningioma',
    "A. Sellar lesion, Rathke's cleft cyst", 'A. Suprasellar tumour, excision', 'A. Pituitary, hypophysitis']) {
    assert.notEqual(route(line).templateId, 'pituitary_net', line);
  }
  assert.equal(route('A. Suprasellar tumour').templateId, 'cns_biopsy');
});

// ---------- the Glioma form hands a PitNET over ----------

test('Glioma form: PitNET stays for saved cases, reads "use the PitNET form" and raises a check that points there', async () => {
  const { schema: cns } = await loadTemplate('cns_tumour');
  const f = cns.fields.find((x) => x.id === 'dxSellar');
  const PIT = 'Pituitary neuroendocrine tumour (PitNET)';
  assert.ok(f.options.includes(PIT));
  assert.equal(f.optionLabels[PIT], 'Pituitary neuroendocrine tumour (PitNET): use the PitNET form');
  const check = (entity) => {
    const c = createCase(cns, 1);
    c.parts[0].values = { ...c.parts[0].values, dxFamily: 'Tumours of the sellar region', dxSellar: entity };
    return generate(cns, cnsGen, c).issues.find((i) => /PitNET form/.test(i.message));
  };
  const w = check(PIT);
  assert.equal(w.level, 'warn');
  assert.equal(w.field, 'dxSellar');
  assert.equal(w.message, "A PitNET is reported on the PitNET form (Endocrine), with the lineage, the hormone panel, Ki-67 and invasion; change this part's form.");
  assert.equal(check('Adamantinomatous craniopharyngioma'), undefined);
});

// ---------- golden reports ----------

// Written on first run, compared after; edit deliberately (UPDATE_FIXTURES=1 rewrites).
const CASES = [
  ['01-gonadotroph-sf1', 'SF1-lineage gonadotroph tumour, transsphenoidal, the example', [EXAMPLE]],
  ['02-sg-somatotroph-bone-invasion', 'sparsely granulated somatotroph tumour with keratin fibrous bodies, invading bone and sinonasal mucosa', [ofType('Somatotroph tumour, sparsely granulated', {
    tumourSize: 32, ihcDiffuse: ['Synaptophysin', 'PIT1', 'GH'], ihcFocal: ['PRL'], keratin: 'Positive, diffuse', ki67: 4, mitoses: 1,
    invasion: 'Present', invasionSites: ['Bone', 'Sinonasal mucosa'], nonTumour: []
  })]],
  ['03-dg-corticotroph-crooke', "densely granulated corticotroph microadenoma with Crooke's hyaline change of the non-tumorous corticotrophs", [ofType('Densely granulated corticotroph tumour', {
    specimenDims: '6 x 4 x 2', tumourSize: 7, blockKeyText: '1 Tumour fragments', ihcDiffuse: ['Synaptophysin', 'TPIT', 'ACTH'], pas: 'Positive',
    keratin: 'Positive, diffuse', ki67: 1.5, nonTumour: ['Adenohypophysis'], crooke: 'Present'
  })]],
  ['04-null-cell-apoplexy', 'null cell tumour with apoplexy, keratin focal, p27, ATRX and p53 recorded', [ofType('Null cell tumour', {
    keratin: 'Positive, focal', p27: 'Retained', atrx: 'Retained', p53: 'Wild-type', ki67: 3,
    additional: ['Acute haemorrhagic necrosis (apoplexy)'], grossDetails: 'The fragments are tan and haemorrhagic'
  })]]
];
for (const [name, description, parts] of CASES) {
  test(`golden: ${name}`, () => {
    const r = runParts(parts);
    const file = path.join(FIX, `${name}.json`);
    const current = { description, templateId: 'pituitary_net', values: parts, report: r.report, checks: r.issues };
    if (UPDATE || !fs.existsSync(file)) {
      fs.mkdirSync(FIX, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
    }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(r.report, saved.report, `${file} changed; re-run with UPDATE_FIXTURES=1 only after a deliberate wording change`);
    assert.deepEqual(r.issues, saved.checks, `${file} checks changed`);
    assert.doesNotMatch(r.report, /undefined|\[object|NaN| {3,}/);
  });
}
