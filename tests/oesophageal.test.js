// Phase 4: oesophageal biopsy template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { refluxPattern, eosCount, organPhrase, EOE_THRESHOLD } from '../generators/oesophageal.js';

const registry = await loadAll();
const oes = registry.oesophageal_biopsy;
const run = (c) => generate(oes.schema, oes.generator, c);
const example = () => ({ ...JSON.parse(JSON.stringify(oes.schema.example)), schemaId: oes.schema.id });
const one = (values) => {
  const c = createCase(oes.schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};

test('template is registered with three level defaults', () => {
  assert.ok(oes);
  const c = createCase(oes.schema, 3);
  assert.deepEqual(c.parts.map((p) => p.values.specimenName), ['Distal oesophagus', 'Mid oesophagus', 'Proximal oesophagus']);
});

test('helpers: reflux pattern, eosinophil count, organ phrase', () => {
  assert.equal(EOE_THRESHOLD, 15);
  assert.equal(refluxPattern({ mucosa: 'Squamous', basalHyperplasia: 'Present' }), true);
  assert.equal(refluxPattern({ mucosa: 'Squamous', eosPeak: '20' }), false, 'threshold eosinophilia is not reported as reflux');
  assert.equal(refluxPattern({ mucosa: 'Columnar', basalHyperplasia: 'Present' }), false);
  assert.equal(eosCount({ mucosa: 'Squamous', eosPeak: '12.4' }), 12);
  assert.equal(eosCount({ mucosa: 'Squamous', eosPeak: '' }), 0);
  const ctx = { schema: oes.schema };
  assert.equal(organPhrase({ label: 'A', values: { specimenName: 'Distal oesophagus, 38 cm' } }, ctx), 'OESOPHAGUS, distal, 38 cm, biopsy');
  assert.equal(organPhrase({ label: 'A', values: { specimenName: 'GOJ' } }, ctx), 'GASTRO-OESOPHAGEAL JUNCTION, biopsy');
  assert.equal(organPhrase({ label: 'A', values: { specimenName: '' } }, ctx), 'OESOPHAGUS, biopsy');
});

test('default single part: normal squamous mucosa, no letters', () => {
  const r = run(createCase(oes.schema, 1));
  assert.equal(r.microscopy, 'Sections show squamous mucosa. The squamous epithelium is of normal thickness and maturation with no significant intraepithelial eosinophilia. There is no evidence of dysplasia or malignancy.');
  assert.equal(r.diagnosis, 'OESOPHAGUS, distal, biopsy - SQUAMOUS MUCOSA WITH NO SIGNIFICANT HISTOLOGICAL ABNORMALITY; no evidence of dysplasia or malignancy');
  assert.ok(!r.report.includes('(A)'));
  assert.ok(!r.report.includes('SUMMARY'));
});

test('example: Barrett series with low grade dysplasia and a reflux level', () => {
  const r = run(example());
  const dx = r.diagnosis.split('\n');
  assert.equal(dx[0], "(A) OESOPHAGUS, distal, 38 cm, biopsy - REFLUX OESOPHAGITIS; BARRETT'S OESOPHAGUS (COLUMNAR MUCOSA WITH INTESTINAL METAPLASIA) WITH LOW GRADE DYSPLASIA");
  assert.equal(dx[1], "(B) OESOPHAGUS, mid, 34 cm, biopsy - BARRETT'S OESOPHAGUS (COLUMNAR MUCOSA WITH INTESTINAL METAPLASIA); no evidence of dysplasia or malignancy");
  assert.equal(dx[2], '(C) OESOPHAGUS, proximal, 30 cm, biopsy - REFLUX OESOPHAGITIS; no evidence of dysplasia or malignancy');
  assert.equal(dx[dx.length - 1], 'SUMMARY: Intestinal metaplasia in parts A and B; highest grade low grade dysplasia (part A).');
  assert.ok(r.microscopy.includes('(A) Sections show squamous and columnar mucosa. The squamous epithelium shows basal cell hyperplasia and papillary elongation, with scattered intraepithelial eosinophils (up to 3 per high power field). The columnar mucosa shows intestinal metaplasia with goblet cells. There is low grade dysplasia, with nuclear stratification and hyperchromasia extending to the surface epithelium.'));
  assert.ok(!r.microscopy.split('\n\n')[0].includes('no evidence of dysplasia'), 'dysplastic part does not carry the negative phrase');
  assert.ok(r.microscopy.includes('(C) Sections show squamous mucosa. The squamous epithelium shows basal cell hyperplasia, papillary elongation and intercellular oedema, with scattered intraepithelial eosinophils (up to 6 per high power field). Neutrophils are present within the epithelium.'));
});

test('eosinophilic oesophagitis pattern: count, microabscesses, Candida, two-level summary', () => {
  const c = createCase(oes.schema, 2);
  c.parts[0].values = { ...c.parts[0].values, basalHyperplasia: 'Present', eosPeak: '45', eosFeatures: 'Present', fibrosis: 'Present', candida: 'Present' };
  c.parts[1].values = { ...c.parts[1].values, eosPeak: '20' };
  const r = run(c);
  assert.ok(r.microscopy.includes('with up to 45 intraepithelial eosinophils per high power field, including eosinophil microabscesses and surface layering. The lamina propria shows fibrosis. Fungal hyphae and spores consistent with Candida are present within the superficial squamous debris.'));
  assert.ok(r.diagnosis.includes('(A) OESOPHAGUS, distal, biopsy - MARKED INTRAEPITHELIAL EOSINOPHILIA (peak 45 eosinophils/hpf), consistent with eosinophilic oesophagitis in the appropriate clinical context; Candida hyphae present; no evidence of dysplasia or malignancy'));
  assert.ok(r.diagnosis.endsWith('SUMMARY: Peak eosinophil count 45/hpf (part A); 15 or more eosinophils/hpf in 2 of 2 levels sampled, consistent with eosinophilic oesophagitis in the appropriate clinical context.'));
});

test('GOJ intestinal metaplasia is not called Barrett\'s; indefinite for dysplasia; erosion after columnar description', () => {
  const r = run(one({ specimenName: 'GOJ', mucosa: 'Columnar', columnarType: 'With intestinal metaplasia', endoscopy: 'GOJ / Z-line', activity: 'Erosion', glandularDysplasia: 'Indefinite', hpylori: 'Present' }));
  assert.equal(r.microscopy, "Sections show columnar mucosa showing intestinal metaplasia with goblet cells. Intestinal metaplasia at the gastro-oesophageal junction does not in itself establish Barrett's oesophagus. There is surface erosion with neutrophils and granulation tissue. There is nuclear enlargement and stratification in the setting of active inflammation, indefinite for dysplasia. Helicobacter-like organisms are identified.");
  assert.equal(r.diagnosis, 'GASTRO-OESOPHAGEAL JUNCTION, biopsy - COLUMNAR MUCOSA WITH INTESTINAL METAPLASIA, INDEFINITE FOR DYSPLASIA; Helicobacter-like organisms present');
});

test('endoscopic context not stated asks for correlation; cardiac mucosa without IM', () => {
  const r1 = run(one({ mucosa: 'Squamous and columnar', columnarType: 'With intestinal metaplasia', endoscopy: 'Not stated' }));
  assert.ok(r1.microscopy.includes("Correlation with the endoscopic extent of columnar mucosa is required to establish Barrett's oesophagus."));
  assert.equal(r1.diagnosis, 'OESOPHAGUS, distal, biopsy - COLUMNAR MUCOSA WITH INTESTINAL METAPLASIA; no evidence of dysplasia or malignancy');
  const r2 = run(one({ specimenName: 'Oesophagus 36 cm', mucosa: 'Squamous and columnar' }));
  assert.equal(r2.diagnosis, 'OESOPHAGUS, 36 cm, biopsy - COLUMNAR (CARDIAC-TYPE) MUCOSA WITHOUT INTESTINAL METAPLASIA; no evidence of dysplasia or malignancy');
});

test('glandular neoplasia grades', () => {
  const base = { mucosa: 'Squamous and columnar', columnarType: 'With intestinal metaplasia', endoscopy: "Barrett's segment" };
  assert.ok(run(one({ ...base, glandularDysplasia: 'High grade' })).diagnosis.endsWith("BARRETT'S OESOPHAGUS (COLUMNAR MUCOSA WITH INTESTINAL METAPLASIA) WITH HIGH GRADE DYSPLASIA"));
  assert.ok(run(one({ ...base, glandularDysplasia: 'Intramucosal adenocarcinoma' })).diagnosis.endsWith("INTRAMUCOSAL ADENOCARCINOMA arising in Barrett's oesophagus"));
  assert.ok(run(one({ ...base, endoscopy: 'GOJ / Z-line', glandularDysplasia: 'Invasive adenocarcinoma' })).diagnosis.endsWith('INVASIVE ADENOCARCINOMA with background intestinal metaplasia'));
  const c = createCase(oes.schema, 2);
  c.parts[0].values = { ...c.parts[0].values, ...base, glandularDysplasia: 'High grade' };
  c.parts[1].values = { ...c.parts[1].values, ...base };
  assert.ok(run(c).diagnosis.endsWith('SUMMARY: Intestinal metaplasia in parts A and B; highest grade high grade dysplasia (part A).'));
});

test('squamous neoplasia and superficial sampling', () => {
  assert.ok(run(one({ squamousNeoplasia: 'Low grade dysplasia' })).diagnosis.endsWith('OESOPHAGUS, distal, biopsy - LOW GRADE SQUAMOUS DYSPLASIA'));
  const r = run(one({ squamousNeoplasia: 'SCC (superficial sampling)', candida: 'Present' }));
  assert.equal(r.diagnosis, 'OESOPHAGUS, distal, biopsy - SQUAMOUS CELL CARCINOMA; invasion cannot be assessed in this superficial biopsy; Candida hyphae present');
  assert.ok(r.microscopy.includes('Malignant squamous cells are present; the biopsy is superficial and stromal invasion cannot be assessed.'));
  assert.ok(!r.microscopy.includes('no evidence of dysplasia'));
  const c = createCase(oes.schema, 2);
  c.parts[1].values = { ...c.parts[1].values, squamousNeoplasia: 'SCC (invasive)' };
  assert.ok(run(c).diagnosis.endsWith('SUMMARY: Invasive squamous cell carcinoma in part B.'));
});

test('Candida alone and lymphocytic pattern', () => {
  assert.ok(run(one({ candida: 'Present' })).diagnosis.endsWith('CANDIDA OESOPHAGITIS; no evidence of dysplasia or malignancy'));
  assert.ok(run(one({ lymphocytes: 'Increased' })).diagnosis.endsWith('LYMPHOCYTIC OESOPHAGITIS PATTERN; no evidence of dysplasia or malignancy'));
  assert.ok(run(one({ basalHyperplasia: 'Present', activity: 'Ulceration' })).diagnosis.endsWith('REFLUX OESOPHAGITIS, with ulceration; no evidence of dysplasia or malignancy'));
});

test('summary option off and a normal series produce no summary', () => {
  const c = createCase(oes.schema, 3);
  assert.ok(!run(c).diagnosis.includes('SUMMARY'));
  const ex = example();
  ex.options.summary = false;
  assert.ok(!run(ex).diagnosis.includes('SUMMARY'));
});
