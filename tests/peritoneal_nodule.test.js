// Peritoneal nodule biopsy. Card: docs/roadmap.md "Peritoneal nodule biopsy" (pulled by the user 2026-10-07);
// grounding docs/reference/peritoneal_nodule-morphology.md. Wording is deliberate; update the strings only on purpose.
// Fixtures: tests/fixtures/peritoneal_nodule/*.json (golden; --update only after a deliberate change).
// The routing lines below are house-style lines, not case text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, snippetsFor } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { rowGroups, biopsyRow } from '../src/picker.js';
import { loadAll, loadManifest } from '../src/registry.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.peritoneal_nodule;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const FIX = path.join(here, 'fixtures', 'peritoneal_nodule');
const UPDATE = process.argv.includes('--update');
const one = (values, meta) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  if (meta) c.meta = meta;
  return c;
};
const many = (list, meta) => {
  const c = createCase(schema, list.length);
  list.forEach((v, i) => { c.parts[i].values = { ...c.parts[i].values, ...v }; });
  if (meta) c.meta = meta;
  return c;
};
const run = (values, meta) => generate(schema, t.generator, one(values, meta));
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const issuesOf = (r) => r.issues.map((i) => [i.level, i.field, i.message]);
const dxLine = (v) => run(v).diagnosis.replace(/^.*? - /, '');

// ---------- metadata and menus ----------

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has peritoneal_nodule');
  assert.equal(schema.system, 'GI');
  assert.equal(schema.kind, 'biopsy');
  assert.equal(schema.label, 'Peritoneum');
  assert.equal(schema.organ, 'PERITONEUM');
  assert.equal(schema.version, '2026.10');
  assert.ok(schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
  assert.equal(schema.style.british, true);
});

test('it closes the GI biopsy row, built rather than pending; the row is otherwise unchanged', () => {
  const planned = JSON.parse(fs.readFileSync(path.join(root, 'templates', 'planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((p) => p.id === 'peritoneal_nodule'), 'not in planned.json');
  const group = rowGroups(manifest, planned, 'top').find((g) => g.items.some((i) => i.id === 'peritoneal_nodule'));
  assert.equal(group.system, 'GI');
  assert.deepEqual(group.items.map((i) => i.id), ['gastric_biopsy', 'colonic_polyp', 'duodenal_biopsy', 'oesophageal_biopsy', 'ibd_biopsy', 'hirschsprung_biopsy', 'peritoneal_nodule']);
  assert.ok(!group.items.find((i) => i.id === 'peritoneal_nodule').planned, 'a built template, not a pending one');
  const row = biopsyRow(manifest).map((x) => x.id);
  assert.equal(row[row.length - 1], 'peritoneal_nodule', 'appended to the Small biopsy row');
});

// ---------- the example ----------

test('the example: high-grade serous carcinoma on an omental nodule, a negative gutter biopsy', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, t.generator, c);
  for (const heading of [/SPECIMENS?:/, /MICROSCOPIC EXAMINATION:/, /DIAGNOSIS:/]) assert.match(r.report, heading);
  assert.equal(r.specimens, '(A) Omentum, nodule, biopsy\n(B) Left paracolic gutter, biopsy');
  assert.equal(r.microscopy, '(A) Sections show fibroadipose tissue involved by high-grade serous carcinoma forming papillae, solid sheets and slit-like spaces, '
    + 'composed of cells with marked nuclear pleomorphism, prominent nucleoli and frequent mitoses, with psammoma bodies. On immunohistochemistry, the tumour '
    + 'cells are positive for WT1 and PAX8, and negative for calretinin and CK20. p53 shows aberrant (mutation-type) overexpression.\n\n'
    + '(B) Sections show fibroadipose tissue. There is no evidence of malignancy.');
  assert.equal(r.diagnosis, '(A) OMENTUM, nodule, biopsy - INVOLVED BY HIGH-GRADE SEROUS CARCINOMA, in keeping with tubo-ovarian primary\n'
    + '(B) LEFT PARACOLIC GUTTER, biopsy - NO EVIDENCE OF MALIGNANCY');
  assert.deepEqual(r.issues, []);
});

// ---------- specimen ----------

test('the specimen line: site, side, organ, lesion word, procedure and the SOFT TISSUE head', () => {
  const cases = [
    [{}, 'Peritoneum, biopsy', 'PERITONEUM, biopsy'],
    [{ site: 'Omentum', lesion: 'Nodule' }, 'Omentum, nodule, biopsy', 'OMENTUM, nodule, biopsy'],
    [{ site: 'Pouch of Douglas', procedure: 'Excision' }, 'Pouch of Douglas, excision', 'POUCH OF DOUGLAS, excision'],
    [{ site: 'Paracolic gutter', side: 'Right', lesion: 'Nodules' }, 'Right paracolic gutter, nodules, biopsy', 'RIGHT PARACOLIC GUTTER, nodules, biopsy'],
    [{ site: 'Diaphragm', side: 'Left', lesion: 'Plaque' }, 'Left diaphragm, plaque, biopsy', 'LEFT DIAPHRAGM, plaque, biopsy'],
    [{ site: 'Pelvic peritoneum', lesion: 'Deposits' }, 'Pelvic peritoneum, deposits, biopsy', 'PELVIC PERITONEUM, deposits, biopsy'],
    [{ site: 'Mesentery', organ: 'small bowel', procedure: 'Excision' }, 'Small bowel mesentery, excision', 'SMALL BOWEL MESENTERY, excision'],
    [{ site: 'Serosa of a named organ', organ: 'Uterine', lesion: 'Nodule' }, 'Uterine serosa, nodule, biopsy', 'UTERINE SEROSA, nodule, biopsy'],
    [{ site: 'Other (specify)', siteOther: 'Falciform ligament' }, 'Falciform ligament, biopsy', 'FALCIFORM LIGAMENT, biopsy'],
    [{ site: 'Paracolic gutter', side: 'Left', headStyle: 'Soft tissue', procedure: 'Excision' }, 'Soft tissue, left paracolic gutter, excision', 'SOFT TISSUE, left paracolic gutter, excision'],
    [{ site: 'Pouch of Douglas', headStyle: 'Soft tissue' }, 'Soft tissue, pouch of Douglas, biopsy', 'SOFT TISSUE, pouch of Douglas, biopsy']
  ];
  for (const [v, spec, head] of cases) {
    const r = run(v);
    assert.equal(r.specimens, spec, JSON.stringify(v));
    assert.equal(r.diagnosis, `${head} - NO EVIDENCE OF MALIGNANCY`, JSON.stringify(v));
  }
  // A side or an organ left over from another site is not printed.
  assert.equal(run({ site: 'Omentum', side: 'Left', organ: 'sigmoid colon' }).specimens, 'Omentum, biopsy');
});

test('a single part prints without its letter; several nodules print one line each', () => {
  const single = run({ site: 'Omentum' });
  for (const block of [single.specimens, single.microscopy, single.diagnosis]) assert.ok(!/\(A\)/.test(block), block);
  const r = generate(schema, t.generator, many([
    { site: 'Omentum', lesion: 'Nodule', dx: 'Metastatic carcinoma', primarySite: 'Colorectal', ihcPos: ['CK20', 'CDX2'] },
    { site: 'Pouch of Douglas', lesion: 'Nodule', dx: 'Endometriosis' },
    { site: 'Paracolic gutter', side: 'Right' }
  ]));
  assert.deepEqual(r.diagnosis.split('\n'), [
    '(A) OMENTUM, nodule, biopsy - METASTATIC ADENOCARCINOMA, in keeping with colorectal primary',
    '(B) POUCH OF DOUGLAS, nodule, biopsy - ENDOMETRIOSIS',
    '(C) RIGHT PARACOLIC GUTTER, biopsy - NO EVIDENCE OF MALIGNANCY'
  ]);
  assert.equal(r.microscopy.split('\n\n').length, 3, 'one paragraph per part');
});

// ---------- diagnosis lines ----------

test('diagnosis lines follow the house forms for each entity', () => {
  const lines = [
    [{}, 'NO EVIDENCE OF MALIGNANCY'],
    [{ dx: 'Reactive mesothelial hyperplasia' }, 'REACTIVE MESOTHELIAL HYPERPLASIA'],
    [{ dx: 'Reactive mesothelial hyperplasia', rmhPattern: 'Florid' }, 'FLORID REACTIVE MESOTHELIAL HYPERPLASIA'],
    [{ dx: 'Reactive mesothelial hyperplasia', rmhPattern: 'Papillary' }, 'REACTIVE MESOTHELIAL HYPERPLASIA, papillary pattern'],
    [{ dx: 'Peritoneal loose body' }, 'PERITONEAL LOOSE BODY'],
    [{ dx: 'Endometriosis' }, 'ENDOMETRIOSIS'],
    [{ dx: 'Endosalpingiosis' }, 'ENDOSALPINGIOSIS'],
    [{ dx: 'Fat necrosis' }, 'FAT NECROSIS'],
    [{ dx: 'Fibrous adhesion / fibrosis' }, 'FIBROUS ADHESION'],
    [{ dx: 'Fibrous adhesion / fibrosis', fibrosisTerm: 'Fibrosis' }, 'FIBROSIS'],
    [{ dx: 'Granulomatous inflammation' }, 'SUTURE GRANULOMA'],
    [{ dx: 'Granulomatous inflammation', granType: 'Foreign-body reaction' }, 'FOREIGN-BODY GIANT CELL REACTION'],
    [{ dx: 'Granulomatous inflammation', granType: 'Keratin granulomas' }, 'KERATIN GRANULOMAS'],
    [{ dx: 'Granulomatous inflammation', granType: 'Necrotising granulomas', specialStains: 'Negative' }, 'NECROTISING GRANULOMATOUS INFLAMMATION; see comment'],
    [{ dx: 'Granulomatous inflammation', granType: 'Necrotising granulomas', specialStains: 'Acid-fast bacilli present' }, 'NECROTISING GRANULOMATOUS INFLAMMATION; acid-fast bacilli identified; see comment'],
    [{ dx: 'Granulomatous inflammation', granType: 'Non-necrotising granulomas', specialStains: 'Fungal organisms present' }, 'NON-NECROTISING GRANULOMATOUS INFLAMMATION; fungal organisms identified'],
    [{ dx: 'Splenosis' }, 'SPLENOSIS'],
    [{ dx: 'Deciduosis' }, 'DECIDUOSIS'],
    [{ dx: 'Well-differentiated papillary mesothelial tumour' }, 'WELL-DIFFERENTIATED PAPILLARY MESOTHELIAL TUMOUR'],
    [{ dx: 'Mesothelioma' }, 'EPITHELIOID MESOTHELIOMA; see comment'],
    [{ dx: 'Mesothelioma', mesoType: 'Biphasic' }, 'BIPHASIC MESOTHELIOMA; see comment'],
    [{ dx: 'Mesothelioma', mesoType: 'Sarcomatoid' }, 'SARCOMATOID MESOTHELIOMA; see comment'],
    [{ dx: 'Mesothelioma', mesoType: 'Not otherwise specified' }, 'MESOTHELIOMA, not otherwise specified; see comment'],
    [{ dx: 'Other (specify)', dxOther: 'Leiomyomatosis peritonealis disseminata' }, 'LEIOMYOMATOSIS PERITONEALIS DISSEMINATA']
  ];
  for (const [v, line] of lines) assert.equal(dxLine(v), line, JSON.stringify(v));
});

test('metastatic carcinoma: the lead, the type and the primary-site clause', () => {
  const met = (v) => dxLine({ dx: 'Metastatic carcinoma', ...v });
  assert.equal(met({}), 'METASTATIC ADENOCARCINOMA');
  assert.equal(met({ primarySite: 'Colorectal' }), 'METASTATIC ADENOCARCINOMA, in keeping with colorectal primary');
  assert.equal(met({ primarySite: 'Breast', primaryBasis: 'Consistent with the known', carcinomaType: 'Carcinoma (type not determined)' }), 'METASTATIC CARCINOMA, consistent with the known breast primary');
  assert.equal(met({ primarySite: 'Müllerian', primaryBasis: 'Favour', carcinomaType: 'High-grade serous carcinoma' }), 'METASTATIC HIGH-GRADE SEROUS CARCINOMA, favour Mullerian primary');
  assert.equal(met({ lead: 'Involved by', carcinomaType: 'High-grade serous carcinoma', primarySite: 'Tubo-ovarian' }), 'INVOLVED BY HIGH-GRADE SEROUS CARCINOMA, in keeping with tubo-ovarian primary');
  assert.equal(met({ lead: 'Involved by', carcinomaType: 'Low-grade serous carcinoma' }), 'INVOLVED BY LOW-GRADE SEROUS CARCINOMA');
  assert.equal(met({ carcinomaType: 'Mucinous adenocarcinoma', primarySite: 'Appendiceal' }), 'METASTATIC MUCINOUS ADENOCARCINOMA, in keeping with appendiceal primary');
  assert.equal(met({ carcinomaType: 'Poorly cohesive (signet-ring cell) carcinoma', primarySite: 'Upper gastrointestinal' }), 'METASTATIC POORLY COHESIVE CARCINOMA, signet-ring cell type, in keeping with upper gastrointestinal primary');
  assert.equal(met({ carcinomaType: 'Squamous cell carcinoma', primarySite: 'Other (specify)', primaryOther: 'Cervical primary' }), 'METASTATIC SQUAMOUS CELL CARCINOMA, in keeping with cervical primary');
  assert.equal(met({ carcinomaType: 'Other (specify)', carcinomaOther: 'urothelial carcinoma', primarySite: 'Urothelial' }), 'METASTATIC UROTHELIAL CARCINOMA, in keeping with urothelial primary');
  assert.equal(met({ primarySite: 'Uncertain – see comment' }), 'METASTATIC ADENOCARCINOMA; see comment');
});

// ---------- microscopy ----------

test('microscopy: the benign entities, each closing on the negative after any stains', () => {
  const micro = (v) => run(v).microscopy;
  assert.equal(micro({}), 'Sections show fibroadipose tissue. There is no evidence of malignancy.');
  assert.equal(micro({ tissue: 'Adipose tissue', nemFindings: ['Mesothelial lining', 'Mild chronic inflammation', 'Fibrosis', 'Vascular congestion'] }),
    'Sections show adipose tissue lined by mesothelium, with mild chronic inflammation, fibrosis and vascular congestion. There is no evidence of malignancy.');
  assert.equal(micro({ dx: 'Reactive mesothelial hyperplasia', rmhPattern: 'Florid', ihcPos: ['calretinin', 'WT1', 'D2-40'], ihcNeg: ['BerEP4', 'MOC31'], bap1: 'Retained', mtap: 'Retained' }),
    'Sections show fibroadipose tissue with a florid surface proliferation of mesothelial cells forming sheets, nests and small tubules. The cells have uniform round to oval '
    + 'nuclei with small central nucleoli. The proliferation is confined to the surface, with no invasion of the underlying tissue. On immunohistochemistry, the mesothelial '
    + 'cells are positive for calretinin, WT1 and D2-40, and negative for BerEP4 and MOC31. BAP1 and MTAP expression is retained. There is no evidence of malignancy.');
  assert.equal(micro({ dx: 'Peritoneal loose body' }), 'Sections show a nodule composed of concentric layers of hyalinised, acellular fibrous tissue surrounding a central core of necrotic fat, '
    + 'with calcification. The features are consistent with an infarcted and detached appendix epiploica. There is no evidence of malignancy.');
  assert.equal(micro({ dx: 'Peritoneal loose body', lbFeatures: [] }), 'Sections show a nodule composed of concentric layers of hyalinised, acellular fibrous tissue. '
    + 'The features are consistent with an infarcted and detached appendix epiploica. There is no evidence of malignancy.');
  assert.equal(micro({ dx: 'Endometriosis' }), 'Sections show fibroadipose tissue containing endometrial-type glands and stroma, with haemosiderin-laden macrophages. There is no evidence of malignancy.');
  assert.equal(micro({ dx: 'Endometriosis', haemosiderin: false, tissue: 'Fibrous tissue' }), 'Sections show fibrous tissue containing endometrial-type glands and stroma. There is no evidence of malignancy.');
  assert.equal(micro({ dx: 'Endosalpingiosis', psammoma: true, ihcPos: ['PAX8', 'WT1'] }), 'Sections show fibroadipose tissue containing small glands lined by a single layer of bland ciliated '
    + 'tubal-type epithelium, with psammoma bodies. On immunohistochemistry, the glandular cells are positive for PAX8 and WT1. There is no evidence of malignancy.');
  assert.equal(micro({ dx: 'Fat necrosis', fnFeatures: ['Fibrosis', 'Calcification'] }), 'Sections show fibroadipose tissue with fat necrosis, composed of anucleate adipocytes surrounded by '
    + 'foamy macrophages and multinucleated giant cells, with fibrosis and calcification. There is no evidence of malignancy.');
  assert.equal(micro({ dx: 'Fibrous adhesion / fibrosis', fibFeatures: ['Chronic inflammation'] }), 'Sections show cellular fibrous connective tissue containing blood vessels, with chronic inflammation. '
    + 'There is no evidence of malignancy.');
  assert.equal(micro({ dx: 'Granulomatous inflammation' }), 'Sections show fibroadipose tissue with granulomatous inflammation composed of histiocytes and foreign-body-type multinucleated '
    + 'giant cells surrounding suture material. There is no evidence of malignancy.');
  assert.equal(micro({ dx: 'Granulomatous inflammation', granType: 'Keratin granulomas' }), 'Sections show fibroadipose tissue with granulomas composed of laminated anucleate keratin and ghost '
    + 'squamous cells, surrounded by histiocytes and foreign-body-type multinucleated giant cells. No viable tumour cells are seen.');
  assert.equal(micro({ dx: 'Granulomatous inflammation', granType: 'Necrotising granulomas', specialStains: 'Negative' }), 'Sections show fibroadipose tissue with granulomas composed of '
    + 'epithelioid histiocytes and multinucleated giant cells, with central necrosis. Ziehl-Neelsen and Grocott stains are negative for acid-fast bacilli and fungal organisms. '
    + 'There is no evidence of malignancy.');
  assert.equal(micro({ dx: 'Granulomatous inflammation', specialStains: 'Negative' }), 'Sections show fibroadipose tissue with granulomatous inflammation composed of histiocytes and '
    + 'foreign-body-type multinucleated giant cells surrounding suture material. There is no evidence of malignancy.', 'a hidden stain result is not printed');
  assert.equal(micro({ dx: 'Splenosis' }), 'Sections show a nodule of splenic tissue with red and white pulp. There is no evidence of malignancy.');
  assert.equal(micro({ dx: 'Deciduosis' }), 'Sections show fibroadipose tissue containing nodules of large polygonal decidual cells with abundant eosinophilic cytoplasm, bland nuclei and small '
    + 'nucleoli. There is no evidence of malignancy.');
});

test('microscopy: the mesothelial tumours and the carcinomas', () => {
  const micro = (v) => run(v).microscopy;
  assert.equal(micro({ dx: 'Well-differentiated papillary mesothelial tumour', ihcPos: ['calretinin', 'WT1'], bap1: 'Retained', mtap: 'Retained' }),
    'Sections show papillae with fibrovascular cores lined by a single layer of bland cuboidal mesothelial cells. There is no invasion of the underlying tissue. '
    + 'On immunohistochemistry, the lining cells are positive for calretinin and WT1. BAP1 and MTAP expression is retained.');
  assert.equal(micro({ dx: 'Mesothelioma', ihcPos: ['calretinin', 'WT1', 'D2-40'], ihcNeg: ['BerEP4', 'MOC31', 'claudin-4'], bap1: 'Lost', mtap: 'Retained' }),
    'Sections show fibroadipose tissue involved by epithelioid mesothelioma composed of tubules, papillae and solid sheets of atypical epithelioid cells. The tumour invades '
    + 'the underlying adipose tissue. On immunohistochemistry, the tumour cells are positive for calretinin, WT1 and D2-40, and negative for BerEP4, MOC31 and claudin-4. '
    + 'MTAP expression is retained. There is loss of BAP1 expression.');
  assert.equal(micro({ dx: 'Mesothelioma', mesoType: 'Sarcomatoid', mesoInvasion: 'Not seen in this sample' }), 'Sections show fibroadipose tissue involved by sarcomatoid mesothelioma composed of fascicles of atypical spindle cells.');
  assert.equal(micro({ dx: 'Mesothelioma', mesoType: 'Biphasic', mesoInvasion: 'Fibrous stroma' }), 'Sections show fibroadipose tissue involved by biphasic mesothelioma with epithelioid and sarcomatoid components. '
    + 'The tumour invades the underlying fibrous stroma.');
  const met = (v) => micro({ dx: 'Metastatic carcinoma', ...v });
  assert.equal(met({ primarySite: 'Colorectal', ihcPos: ['CK20', 'CDX2', 'SATB2'], ihcNeg: ['CK7'] }), 'Sections show fibroadipose tissue involved by adenocarcinoma forming cribriform glands of tall '
    + 'columnar cells, with luminal necrotic debris. On immunohistochemistry, the tumour cells are positive for CK20, CDX2 and SATB2, and negative for CK7.');
  assert.equal(met({}), 'Sections show fibroadipose tissue involved by adenocarcinoma forming irregular glands lined by pleomorphic columnar cells, set in a desmoplastic stroma.');
  assert.equal(met({ carcinomaType: 'Low-grade serous carcinoma', p53: 'Wild-type pattern' }), 'Sections show fibroadipose tissue involved by low-grade serous carcinoma forming small nests and '
    + 'micropapillae of cells with uniform nuclei. p53 shows a wild-type staining pattern.');
  assert.equal(met({ carcinomaType: 'Mucinous adenocarcinoma' }), 'Sections show fibroadipose tissue involved by mucinous adenocarcinoma, with strips and clusters of atypical columnar mucinous cells '
    + 'floating in pools of extracellular mucin.');
  assert.equal(met({ carcinomaType: 'Poorly cohesive (signet-ring cell) carcinoma' }), 'Sections show fibroadipose tissue involved by poorly cohesive carcinoma composed of single cells and small '
    + 'clusters, including signet-ring cells with intracytoplasmic mucin displacing the nucleus.');
  assert.equal(met({ carcinomaType: 'Squamous cell carcinoma' }), 'Sections show fibroadipose tissue involved by squamous cell carcinoma forming nests of atypical squamous cells with keratinisation.');
  assert.equal(met({ carcinomaType: 'Carcinoma (type not determined)' }), 'Sections show fibroadipose tissue involved by carcinoma composed of sheets and nests of atypical epithelioid cells.');
  assert.equal(met({ carcinomaType: 'Other (specify)', carcinomaOther: 'Urothelial carcinoma.' }), 'Sections show fibroadipose tissue involved by urothelial carcinoma.');
  assert.equal(met({ p53: 'Aberrant, cytoplasmic' }).split('. ').pop(), 'p53 shows aberrant (mutation-type) cytoplasmic staining.');
  assert.ok(!/p53/.test(micro({ dx: 'Endometriosis', p53: 'Aberrant, null' })), 'p53 prints only for a carcinoma');
  assert.equal(micro({ dx: 'Other (specify)', dxOther: 'Leiomyomatosis peritonealis disseminata.', additionalNotes: 'smooth muscle nodules are present' }),
    'Sections show fibroadipose tissue with leiomyomatosis peritonealis disseminata. Smooth muscle nodules are present.');
});

test('immunohistochemistry: ticked chips and typed stains join one sentence', () => {
  const micro = (v) => run({ dx: 'Metastatic carcinoma', primarySite: 'Breast', ...v }).microscopy.replace(/^Sections show [^.]*\. /, '');
  assert.equal(micro({ ihcPos: ['CK7', 'GATA3'], ihcNeg: ['CK20'], ihcOther: 'ER focal +, PR weak +, mammaglobin+, Ki-67 30%' }),
    'On immunohistochemistry, the tumour cells are positive for CK7, GATA3 and mammaglobin, focally positive for ER, weakly positive for PR, and negative for CK20. '
    + 'The Ki-67 proliferation index is approximately 30%.');
  assert.equal(micro({ ihcPos: ['GATA3'], ihcOther: 'GATA3-, ttf1-' }), 'On immunohistochemistry, the tumour cells are positive for GATA3, and negative for TTF-1.', 'a chip wins over the same stain typed');
  assert.equal(micro({ ihcPos: ['GATA3'], ihcOther: 'patchy CK7' }), 'On immunohistochemistry, the tumour cells are positive for GATA3. Patchy CK7.');
  const meso = run({ dx: 'Mesothelioma', ihcOther: 'd2-40+, claudin4-, BAP1 lost', ihcPos: ['calretinin'] }).microscopy;
  assert.match(meso, /positive for calretinin and D2-40, and negative for claudin-4\. There is loss of BAP1 expression\.$/);
  assert.ok(!/BAP1|MTAP/.test(run({ dx: 'Metastatic carcinoma', bap1: 'Lost', mtap: 'Lost' }).microscopy), 'the BAP1 and MTAP selects print only for a mesothelial diagnosis');
});

// ---------- checks ----------

test('checks: the form errors and the immunoprofile reviews', () => {
  const at = (v, field) => issuesOf(run(v)).filter((i) => i[1] === field);
  assert.deepEqual(at({ ihcPos: ['CK7'], ihcNeg: ['CK7'] }, 'ihcNeg'), [['error', 'ihcNeg', 'CK7 is ticked both positive and negative.']]);
  assert.deepEqual(at({ site: 'Other (specify)' }, 'siteOther'), [['error', 'siteOther', 'Type the site.']]);
  assert.deepEqual(at({ dx: 'Other (specify)' }, 'dxOther'), [['error', 'dxOther', 'Type the diagnosis.']]);
  assert.deepEqual(at({ site: 'Serosa of a named organ' }, 'organ'), [['warn', 'organ', 'Name the organ: the line otherwise reads SEROSA.']]);
  assert.deepEqual(at({ ihcOther: 'patchy CK7' }, 'ihcOther'), [['info', 'ihcOther', 'Other stains printed as typed: patchy CK7.']]);

  const met = (v, field) => at({ dx: 'Metastatic carcinoma', ...v }, field);
  assert.deepEqual(met({ primarySite: 'Colorectal', ihcPos: ['CK7'] }, 'ihcPos'), [
    ['warn', 'ihcPos', 'Colorectal primary: none of CK20, CDX2 or SATB2 is recorded as positive.'],
    ['info', 'ihcPos', 'CK7 is positive: colorectal and appendiceal carcinomas are usually CK7 negative.']]);
  assert.deepEqual(met({ primarySite: 'Colorectal', ihcPos: ['SATB2'] }, 'ihcPos'), []);
  assert.deepEqual(met({ primarySite: 'Colorectal', primaryBasis: 'Consistent with the known' }, 'ihcPos'), [], 'a known primary compared on morphology');
  assert.deepEqual(met({ primarySite: 'Breast' }, 'ihcPos'), [['warn', 'ihcPos', 'Breast primary: GATA3 is not recorded as positive.']]);
  assert.deepEqual(met({ primarySite: 'Lung', ihcPos: ['TTF-1'] }, 'ihcPos'), []);
  assert.deepEqual(met({ primarySite: 'Tubo-ovarian', ihcPos: ['WT1'], ihcNeg: ['PAX8'] }, 'ihcNeg'), [['warn', 'ihcNeg', 'PAX8 is negative: unusual for a Müllerian primary.']]);
  assert.deepEqual(met({ primarySite: 'Pancreatobiliary' }, 'primarySite'), [['info', 'primarySite', 'No immunoprofile separates an upper gastrointestinal from a pancreatobiliary primary: the primary rests on the clinical and imaging findings.']]);
  assert.deepEqual(met({}, 'primarySite'), [['info', 'primarySite', 'Primary site not stated: the diagnosis line prints without one.']]);
  assert.deepEqual(met({ carcinomaType: 'High-grade serous carcinoma', p53: 'Wild-type pattern', primarySite: 'Tubo-ovarian', ihcPos: ['PAX8'] }, 'p53'), [['warn', 'p53', 'Wild-type p53 is unusual for high-grade serous carcinoma.']]);
  assert.deepEqual(met({ carcinomaType: 'Low-grade serous carcinoma', p53: 'Aberrant, null', primarySite: 'Tubo-ovarian', ihcPos: ['PAX8'] }, 'p53'), [['warn', 'p53', 'Aberrant p53 is unusual for low-grade serous carcinoma.']]);
  assert.deepEqual(met({ ihcPos: ['calretinin', 'D2-40'], primarySite: 'Uncertain – see comment' }, 'dx'), [['info', 'dx', 'Calretinin with D2-40 or CK5/6 positive, and no epithelial marker positive: consider a mesothelial lesion.']]);
});

test('checks: the mesothelial work-up', () => {
  const issues = (v) => issuesOf(run(v));
  const full = { dx: 'Mesothelioma', ihcPos: ['calretinin', 'WT1'], ihcNeg: ['BerEP4', 'claudin-4'], bap1: 'Lost', mtap: 'Retained' };
  assert.deepEqual(issues(full), []);
  assert.deepEqual(issues({ dx: 'Mesothelioma' }), [
    ['warn', 'ihcPos', 'Mesothelioma: record at least two mesothelial markers (calretinin, WT1, D2-40, CK5/6) as positive.'],
    ['warn', 'ihcNeg', 'Mesothelioma: record at least two carcinoma markers (BerEP4, MOC31, claudin-4 or a site marker) as negative.'],
    ['warn', 'bap1', 'Mesothelioma: BAP1 and MTAP are not recorded.']]);
  assert.deepEqual(issues({ ...full, ihcOther: 'MOC31+' }), [['warn', 'ihcPos', 'MOC31 positive: this favours carcinoma over mesothelioma.']]);
  assert.deepEqual(issues({ ...full, ihcOther: 'PAX8 focal +' }), [['info', 'ihcPos', 'PAX8 is positive in a minority of peritoneal mesotheliomas; claudin-4 separates serous carcinoma better.']]);
  assert.deepEqual(issues({ ...full, bap1: 'Not performed', mtap: 'Not performed', ihcOther: 'BAP1 lost' }), [], 'a typed BAP1 result counts');
  assert.deepEqual(issues({ ...full, bap1: 'Retained', mesoInvasion: 'Not seen in this sample' }), [['warn', 'mesoInvasion', 'No invasion and no BAP1 or MTAP loss: this sample shows nothing that separates mesothelioma from a reactive proliferation.']]);
  assert.deepEqual(issues({ dx: 'Reactive mesothelial hyperplasia', bap1: 'Lost' }), [['warn', 'bap1', 'Loss of BAP1 is not seen in reactive mesothelium: consider mesothelioma.']]);
  assert.deepEqual(issues({ dx: 'Well-differentiated papillary mesothelial tumour', mtap: 'Lost' }), [['warn', 'mtap', 'Loss of MTAP is not seen in well-differentiated papillary mesothelial tumour: consider mesothelioma.']]);
  assert.deepEqual(issues({ dx: 'Reactive mesothelial hyperplasia', ihcPos: ['BerEP4'] }), [['warn', 'ihcPos', 'BerEP4 positive: this is unusual for mesothelial cells.']]);
  assert.deepEqual(issues({ dx: 'Endosalpingiosis', ihcPos: ['calretinin'] }), [['info', 'ihcPos', 'Endosalpingiosis is usually calretinin negative, and PAX8 and WT1 positive.']]);
  assert.deepEqual(issues({ dx: 'Deciduosis', ihcPos: ['AE1/AE3'] }), [['warn', 'ihcPos', 'Keratin positive: decidual cells are keratin negative.']]);
  assert.deepEqual(issues({ dx: 'Granulomatous inflammation', granType: 'Necrotising granulomas' }), [['warn', 'specialStains', 'Necrotising granulomas: record the Ziehl-Neelsen and Grocott stains, or mark them pending.']]);
  assert.deepEqual(issues({ dx: 'Granulomatous inflammation', granType: 'Necrotising granulomas', specialStains: 'Pending' }), []);
});

// ---------- comments ----------

const active = (c) => snippetsFor(registry, c).filter((s) => s.active).map((s) => [s.id, s.matchedParts]);

test('the sampling caveat ticks itself when the request names malignancy, for the benign parts only', () => {
  const parts = [{ site: 'Omentum', dx: 'Metastatic carcinoma', primarySite: 'Colorectal', ihcPos: ['CK20'] }, { site: 'Pouch of Douglas' }, { dx: 'Endometriosis' }];
  assert.deepEqual(active(many(parts, { clinical: 'Carcinoma of sigmoid colon. ?Peritoneal metastases.' })), [['peri_sampling', ['B', 'C']]]);
  assert.deepEqual(active(many(parts, { clinical: 'Endometriosis. Deposits in the pouch of Douglas.' })), [], 'no malignancy named, no caveat');
  assert.deepEqual(active(many(parts, { clinical: '', specimen: 'Peritoneal nodule ?ca' })), [['peri_sampling', ['B', 'C']]], 'the pasted specimen list counts');
  const r = generate(schema, t.generator, many(parts, { clinical: 'Ovarian cancer for cytoreduction' }));
  assert.equal(r.comment, 'No malignancy is identified in the sampled tissue (parts B and C), which may not be representative of the lesion; correlation with the operative and imaging findings is advised.');
  assert.equal(run({}, { clinical: 'Peritoneal carcinomatosis' }).comment, 'No malignancy is identified in the sampled tissue, which may not be representative of the lesion; correlation with the operative and imaging findings is advised.');
  assert.equal(run({}, { clinical: 'Peritoneal nodule at laparoscopy' }).comment, '');
});

test('the other comments tick themselves on their diagnoses', () => {
  const ids = (v) => active(one(v)).map(([id]) => id);
  assert.deepEqual(ids({ dx: 'Metastatic carcinoma', primarySite: 'Uncertain – see comment' }), ['peri_primary']);
  assert.deepEqual(ids({ stainsPending: true }), ['peri_stains_pending']);
  assert.deepEqual(ids({ dx: 'Granulomatous inflammation', granType: 'Necrotising granulomas', specialStains: 'Pending' }), ['peri_stains_pending', 'peri_granuloma']);
  assert.deepEqual(ids({ dx: 'Granulomatous inflammation', specialStains: 'Pending' }), [], 'the stain select is hidden for a suture granuloma');
  assert.deepEqual(ids({ dx: 'Reactive mesothelial hyperplasia' }), ['peri_reactive']);
  assert.deepEqual(ids({ dx: 'Mesothelioma' }), ['peri_mesothelioma']);
  assert.equal(run({ dx: 'Mesothelioma', ihcPos: ['calretinin', 'WT1'], ihcNeg: ['BerEP4', 'MOC31'], bap1: 'Lost' }).comment,
    'The features are those of mesothelioma. A full work-up is recommended, with correlation with the imaging and operative findings and review at the multidisciplinary team meeting.');
});

test('every comment is released-report prose', () => {
  for (const sn of schema.snippets) {
    assert.ok(!/\bWHO\b|by definition|\d+\s*%|\bmm\b/.test(sn.text), sn.id);
    assert.match(sn.text, /\.$/, `${sn.id} ends with a full stop`);
  }
});

// ---------- intake ----------

const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line, history = '') => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
};

test('intake: peritoneal, omental and serosal biopsies open the form', () => {
  for (const line of ['Peritoneal nodule, biopsy', 'Peritoneal nodule', 'Peritoneum, biopsy', 'Peritoneal biopsies', 'Omentum, biopsy', 'Omental nodule, excision',
    'Omentum, nodule, biopsy', 'Omental cake, biopsy', 'Pouch of Douglas, biopsy', 'Cul-de-sac nodule, biopsy', 'Left paracolic gutter, biopsy',
    'Right hemidiaphragm nodule, biopsy', 'Small bowel mesentery nodule, excision', 'Pelvic peritoneum, biopsy', 'Peritoneal loose body',
    'Soft tissue, mesentery, excision', 'Bladder peritoneum, biopsy', 'Uterine serosa nodule, biopsy', 'Sigmoid serosal nodule, excision',
    'Peritoneal deposits, biopsy', 'Endometriotic nodule, pouch of Douglas, excision', 'Transverse mesocolon, nodule, excision', 'Loose body']) {
    const r = route(line);
    assert.deepEqual([r.templateId, r.tier], ['peritoneal_nodule', 'confident'], line);
  }
});

test('intake: washings, resections, lymph nodes, hernia sacs and frozen sections go elsewhere', () => {
  for (const [line, id] of [['Peritoneal washing', 'effusion_cytology'], ['Ascitic fluid', 'effusion_cytology'], ['Peritoneal fluid', 'effusion_cytology'],
    ['Hernia sac', 'hernia_sac'], ['Sigmoid colon and mesentery, anterior resection', 'colon_resection'], ['Mesenteric lymph node, excision', 'lymph_node'],
    ['Peritoneal nodule, frozen section', 'frozen_section'], ['Omental lipoma, excision', 'soft_tissue_benign'], ['Abdominal wall nodule, excision', 'soft_tissue_benign'],
    // a joint or bone loose body is the bone and joint form's; a line naming a large-bowel segment keeps the colon form
    ['Elbow, loose body, excision', 'bone_joint'], ['Bone, loose body, excision', 'bone_joint'], ['Sigmoid colon, mesenteric nodule, excision', 'colon_resection']]) {
    assert.equal(route(line).templateId, id, line);
  }
  for (const line of ['Omentum', 'Infracolic omentum', 'Omentum, omentectomy', 'Retroperitoneal mass, biopsy', 'Mesenteric cyst, excision', 'Diaphragmatic pleura, biopsy']) {
    assert.notEqual(route(line).templateId, 'peritoneal_nodule', line);
  }
});

test('intake: the line fills the site, side, organ, lesion word, procedure and head', () => {
  const p = (line) => {
    const v = preset(line);
    delete v.side;
    const side = preset(line).side;
    return side ? { ...v, side } : v;
  };
  assert.deepEqual(p('Peritoneal nodule, biopsy'), { lesion: 'Nodule', procedure: 'Biopsy' });
  assert.deepEqual(p('Omentum, nodule, biopsy'), { site: 'Omentum', lesion: 'Nodule', procedure: 'Biopsy' });
  assert.deepEqual(p('Left paracolic gutter, biopsy'), { site: 'Paracolic gutter', lesion: '', procedure: 'Biopsy', side: 'Left' });
  assert.deepEqual(p('Right hemidiaphragm nodule, biopsy'), { site: 'Diaphragm', lesion: 'Nodule', procedure: 'Biopsy', side: 'Right' });
  assert.deepEqual(p('Small bowel mesentery nodule, excision'), { site: 'Mesentery', organ: 'small bowel', lesion: 'Nodule', procedure: 'Excision' });
  assert.deepEqual(p('Transverse mesocolon, nodule, excision'), { site: 'Mesentery', organ: 'transverse colon', lesion: 'Nodule', procedure: 'Excision' });
  assert.deepEqual(p('Sigmoid serosal nodule, excision'), { site: 'Serosa of a named organ', organ: 'sigmoid colon', lesion: 'Nodule', procedure: 'Excision' });
  assert.deepEqual(p('Bladder peritoneum, biopsy'), { site: 'Serosa of a named organ', organ: 'bladder', lesion: '', procedure: 'Biopsy' });
  assert.deepEqual(p('Pouch of Douglas nodules, biopsy'), { site: 'Pouch of Douglas', lesion: 'Nodules', procedure: 'Biopsy' });
  assert.deepEqual(p('Peritoneal deposits, biopsy'), { lesion: 'Deposits', procedure: 'Biopsy' });
  assert.deepEqual(p('Soft tissue, mesentery, excision'), { site: 'Mesentery', lesion: '', procedure: 'Excision', headStyle: 'Soft tissue' });
  assert.deepEqual(p('Peritoneal loose body'), { lesion: '', procedure: 'Excision', dx: 'Peritoneal loose body' }, 'a loose body is removed, not biopsied');
  assert.equal(p('Peritoneal loose body, biopsy').procedure, 'Biopsy', 'the line\'s own procedure word wins');
  // The filled form prints the line back in house form.
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...preset('Right paracolic gutter nodule, excision') };
  assert.equal(generate(schema, t.generator, c).diagnosis, 'RIGHT PARACOLIC GUTTER, nodule, excision - NO EVIDENCE OF MALIGNANCY');
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-reactive-mesothelial-hyperplasia', [{ site: 'Pouch of Douglas', lesion: 'Nodule', dx: 'Reactive mesothelial hyperplasia', rmhPattern: 'Papillary', ihcPos: ['calretinin', 'WT1', 'D2-40'], ihcNeg: ['BerEP4', 'claudin-4'], bap1: 'Retained', mtap: 'Retained' }]],
  ['02-peritoneal-loose-body', [{ site: 'Pelvic peritoneum', procedure: 'Excision', dx: 'Peritoneal loose body', lbFeatures: ['Central fat necrosis', 'Calcification'] }]],
  ['03-metastatic-colorectal-adenocarcinoma', [{ site: 'Omentum', lesion: 'Nodule', dx: 'Metastatic carcinoma', carcinomaType: 'Adenocarcinoma', primarySite: 'Colorectal', primaryBasis: 'In keeping with', ihcPos: ['CK20', 'CDX2', 'SATB2'], ihcNeg: ['CK7'] }]],
  ['04-multiple-nodules', [
    { site: 'Omentum', lesion: 'Nodule', dx: 'Metastatic carcinoma', lead: 'Involved by', carcinomaType: 'High-grade serous carcinoma', primarySite: 'Tubo-ovarian', ihcPos: ['PAX8', 'WT1'], ihcNeg: ['calretinin'], p53: 'Aberrant, overexpression' },
    { site: 'Paracolic gutter', side: 'Right', dx: 'Endosalpingiosis', psammoma: true },
    { site: 'Diaphragm', side: 'Right', lesion: 'Plaque', dx: 'Reactive mesothelial hyperplasia' },
    { site: 'Pouch of Douglas', nemFindings: ['Mesothelial lining', 'Fibrosis'] }
  ], { clinical: 'Pelvic mass, raised CA-125. ?Ovarian cancer.' }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, parts, meta] of CASES) {
    const out = generate(schema, t.generator, many(parts, meta));
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'peritoneal_nodule', values: parts.length === 1 ? parts[0] : parts, ...(meta ? { meta } : {}), report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
